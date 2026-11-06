/* =====================================================================
   Ugolki (classic 3×3) on the portal.
   · The board card (levels, sides, modes): Lv.1 … Lv.20 with the game's descriptions
     (ugolki/i18n-ug*.js), ratings = the game's RT_LV (ugolki/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's
     rules and AI — ../ugolki/engine.js on the page (steps, jump chains over any piece, the
     race and its end rules: the last-move equaliser, the move-40 home rule, the move-80 count,
     threefold repetition) and the same file as a Worker (levels 1..20), asked as ugolki/app.js asks it.
     Input as on the page: tap a piece, then any square it can reach (a step or the end of a jump chain).
     ctx.mode 'pvp': two players take turns on one device (White first, at the bottom).
     Board and pieces: atlas/models/ugolki.js (Gzhel porcelain).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../ugolki/', VER = '?v=3';   // same file / version as ugolki/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.UgolkiEngine) return Promise.resolve(window.UgolkiEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.UgolkiEngine ? res(window.UgolkiEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { n: ['白', '黒'], turn: '{p}の番', win: '{p}の勝ち', stuck: 'その駒は動かせません', own: '自分の駒を選んでください', move: 'そこへは行けません', home: '先に全部を運び込んだ', both: '同じ手数で運び込んだ（引き分け）', stuck1: '40手目までに陣地を空けられなかった', stuck2: 'どちらも陣地を空けられなかった', count: '手数の上限：陣地の駒の数で決着', block: '動ける手がない：陣地の駒の数で決着', rep: '同じ局面が3回', jump: '連続ジャンプ！' },
    en: { n: ['White', 'Black'], turn: '{p} to move', win: '{p} wins', stuck: 'That piece cannot move', own: 'Pick one of your pieces', move: 'It cannot go there', home: 'All pieces home first', both: 'Both finished in the same number of moves (draw)', stuck1: 'Did not leave the home corner by move 40', stuck2: 'Neither side left its corner in time', count: 'Move limit: decided by the pieces home', block: 'No legal move: decided by the pieces home', rep: 'Threefold repetition', jump: 'Jump chain!' },
    zh: { n: ['白方', '黑方'], turn: '轮到{p}', win: '{p}胜', stuck: '这枚棋子不能走', own: '请选择自己的棋子', move: '不能走到那里', home: '先把所有棋子运进了对方角落', both: '同样步数完成（和棋）', stuck1: '第40手前没有离开自己的角落', stuck2: '双方都没有及时离开角落', count: '步数上限：按进入角落的棋子数决胜', block: '无棋可走：按进入角落的棋子数决胜', rep: '同一局面出现3次', jump: '连跳！' },
    ko: { n: ['백', '흑'], turn: '{p} 차례', win: '{p} 승리', stuck: '그 말은 움직일 수 없습니다', own: '자신의 말을 고르세요', move: '그곳으로는 갈 수 없습니다', home: '먼저 모두 옮겼다', both: '같은 수로 다 옮겼다(무승부)', stuck1: '40수까지 자기 진지를 비우지 못했다', stuck2: '둘 다 진지를 비우지 못했다', count: '수 제한: 진지의 말 수로 결정', block: '둘 수 없음: 진지의 말 수로 결정', rep: '같은 국면 3회', jump: '연속 점프!' },
    es: { n: ['Blancas', 'Negras'], turn: 'Turno: {p}', win: 'Ganan {p}', stuck: 'Esa pieza no puede moverse', own: 'Elige una de tus piezas', move: 'No puede ir ahí', home: 'Todas las piezas llegaron primero', both: 'Ambos terminaron en las mismas jugadas (tablas)', stuck1: 'No vació su esquina antes de la jugada 40', stuck2: 'Ningún bando vació su esquina a tiempo', count: 'Límite de jugadas: decide el número en la esquina', block: 'Sin jugadas: decide el número en la esquina', rep: 'Triple repetición', jump: '¡Saltos en cadena!' },
    fr: { n: ['Blancs', 'Noirs'], turn: 'Trait : {p}', win: 'Victoire des {p}', stuck: 'Cette pièce ne peut pas bouger', own: 'Choisissez une de vos pièces', move: 'Impossible d’aller là', home: 'Toutes les pièces rentrées en premier', both: 'Terminé au même nombre de coups (nulle)', stuck1: 'N’a pas quitté son coin avant le coup 40', stuck2: 'Aucun camp n’a quitté son coin à temps', count: 'Limite de coups : décidé par les pièces arrivées', block: 'Aucun coup : décidé par les pièces arrivées', rep: 'Triple répétition', jump: 'Sauts en chaîne !' },
    pt: { n: ['Brancas', 'Pretas'], turn: 'Vez: {p}', win: 'Vitória das {p}', stuck: 'Essa peça não pode se mover', own: 'Escolha uma das suas peças', move: 'Ela não pode ir para lá', home: 'Todas as peças chegaram primeiro', both: 'Terminaram no mesmo número de lances (empate)', stuck1: 'Não esvaziou o canto até o lance 40', stuck2: 'Nenhum lado esvaziou o canto a tempo', count: 'Limite de lances: decide o número no canto', block: 'Sem lances: decide o número no canto', rep: 'Tripla repetição', jump: 'Saltos em sequência!' },
    de: { n: ['Weiß', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt', stuck: 'Dieser Stein kann nicht ziehen', own: 'Wähle einen deiner Steine', move: 'Dorthin geht es nicht', home: 'Alle Steine zuerst im Ziel', both: 'Gleich viele Züge bis ins Ziel (Remis)', stuck1: 'Bis Zug 40 die eigene Ecke nicht geräumt', stuck2: 'Keine Seite hat ihre Ecke rechtzeitig geräumt', count: 'Zuglimit: Steine im Ziel entscheiden', block: 'Kein Zug: Steine im Ziel entscheiden', rep: 'Dreifache Wiederholung', jump: 'Sprungkette!' },
    hi: { n: ['सफ़ेद', 'काला'], turn: '{p} की बारी', win: '{p} की जीत', stuck: 'यह गोटी नहीं चल सकती', own: 'अपनी कोई गोटी चुनें', move: 'वहाँ नहीं जा सकते', home: 'सारी गोटियाँ पहले पहुँचीं', both: 'बराबर चालों में पहुँचे (ड्रॉ)', stuck1: '40वीं चाल तक अपना कोना खाली नहीं किया', stuck2: 'दोनों ने समय पर कोना खाली नहीं किया', count: 'चाल सीमा: कोने की गोटियों से फ़ैसला', block: 'कोई चाल नहीं: कोने की गोटियों से फ़ैसला', rep: 'तीन बार एक ही स्थिति', jump: 'लगातार छलांग!' },
    ar: { n: ['الأبيض', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}', stuck: 'هذه القطعة لا تستطيع الحركة', own: 'اختر إحدى قطعك', move: 'لا يمكن الذهاب إلى هناك', home: 'أوصل كل القطع أولًا', both: 'أنهى الطرفان بعدد النقلات نفسه (تعادل)', stuck1: 'لم يُخلِ زاويته قبل النقلة 40', stuck2: 'لم يُخلِ أي طرف زاويته في الوقت', count: 'حد النقلات: يحسم عدد القطع في الزاوية', block: 'لا نقلات: يحسم عدد القطع في الزاوية', rep: 'تكرار ثلاثي', jump: 'قفزات متتالية!' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): porcelain on porcelain ---------- */
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  const SND = {
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 2600 * v, 1900, .12, .05, 'triangle'); tone(a, t, 340 * v, 160, .08, .14); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 3100, 2500, .08, .035, 'triangle'); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1500, 0, .06, .03, 'triangle'); },
    home() { const a = ac(); if (!a) return; const t = a.currentTime; [1046.5, 1318.5, 1568].forEach((f, i) => tone(a, t + i * .07, f, 0, .45, .06, 'triangle')); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.ugtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#1d3f9a;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 40% 35%,#fff,#e2e8f5 60%,#b8c4de)', 'background:radial-gradient(circle at 40% 35%,#3a66cc,#1d3f9a 60%,#11275f)'];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.ugolki.board(); T3.show('ugolki', board);
    const U = board.userData, Y = U.top;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: Y + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: Y + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;
    const flip = human === 2;
    const pname = c => X.n[c - 1];
    let E = null;
    const scr = i => { const r = i >> 3, c = i & 7; return flip ? [7 - c, 7 - r] : [c, r]; };
    const xz = i => U.pt(...scr(i));

    let pos = null, hashes = [], moves = [], legal = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintMv = -1;
    const mover = () => pvp && pos ? pos.side + 1 : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side + 1 === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .32), lastF: basic(0xffc94a, .16), sel: basic(0xffc94a, .95), dest: basic(0x2fd17a, .92), trail: basic(0x2fd17a, .3), hint: basic(0xff7a1a, .95), house: basic(0xffd36b, .9) };
    const GEO = { sq: new TH.PlaneGeometry(.96, .96), ring: new TH.TorusGeometry(.46, .03, 8, 44), dot: new TH.CylinderGeometry(.14, .14, .012, 24) };
    GEO.sq.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- pieces ---------- */
    let pcs = {};
    function mk(col, i) { const g = U.piece(col), sh = T3.contact(T3.ugolki.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = []; for (let i = 0; i < 64; i++) if (pos.owner(i)) order.push(i);
      order.sort((a, b) => scr(b)[1] - scr(a)[1]);
      for (const i of order) { const c = pos.owner(i), g = mk(c, i); pcs[i] = { g, c }; g.visible = false; const d = 60 + (n++) * 30; kick(200);
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.3), () => { lift(g, 0); land(g); SND.put(1.1); }); }, d); }
      return 60 + n * 30 + 300;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (let i = 0; i < 64; i++) { const c = pos.owner(i); if (c) pcs[i] = { g: mk(c, i), c }; } kick(300); }
    function travel(g, path, jump, done) {
      const pts = path.map(xz), H = .3, h0 = hOf(g), legT = jump ? path.slice(1).map(() => 260) : [300], dur = legT.reduce((a, b) => a + b, 0), hopped = legT.map(() => false);
      anim(dur, k => {
        let r = k * dur, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
        const q = Math.min(1, r / legT[i]), e = jump ? q : io(q), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        if (jump && !hopped[i]) { hopped[i] = true; SND.hop(); }
        lift(g, Math.max(0, jump ? Math.sin(q * Math.PI) * .6 + (i === 0 ? h0 * (1 - q) : 0) : (h0 + (H - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1)));
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(null, moves); pos = r.pos; hashes = r.hashes; }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? pos.inTarget(c) : 0}/9</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'ugtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2400);
    }
    function showMarks() {
      clear(hl); hintMv = -1; hintJ++;
      if (moves.length) { const m = moves[moves.length - 1], before = E.replay(null, moves.slice(0, -1)).pos, p = E.path(before, m); mark(hl, GEO.sq, MAT.lastF, p[0]); mark(hl, GEO.sq, MAT.last, E.mTo(m)); }
    }

    /* ---------- selection ---------- */
    function drawSel() {
      clear(mv); if (!sel) return;
      mark(mv, GEO.ring, MAT.sel, sel.from, .03);
      new Set(sel.cands.map(E.mTo)).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .012));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.24 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }

    /* ---------- moves ---------- */
    function play(m, done) {
      const f = E.mFrom(m), to = E.mTo(m), path = E.path(pos, m), jump = E.isJump(pos, m), col = pos.side + 1, wasIn = E.target(col)[f];
      clear(mv); sel = null;
      const p = pcs[f]; delete pcs[f];
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud(jump && path.length > 2 ? X.jump : '');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      travel(p.g, path, jump, () => { if (E.target(col)[to] && !wasIn) { SND.home(); const r = mark(hl, GEO.ring, MAT.house, to, .03); pulse(r, 1); later(() => hl.remove(r), 1100); } done(); });
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos, hashes);
      if (st.over) return end(st);
      legal = pos.moves();
      if (!legal.length || legal[0] === E.PASS) { commit(E.PASS); return; }
      onTurn();
      if (pvp || pos.side + 1 === human) { hud(pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw || !st.winner, why = X[st.why === 'stuck' ? 'stuck1' : st.why] || '';
      const win = !pvp && !draw && st.winner === human, wt = pvp && !draw ? X.win.replace('{p}', pname(st.winner)) : '';
      hud(draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      later(() => ctx.onEnd(pvp ? { win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt } : { win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule: 'c33' }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule: 'c33' });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let c = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
      if (flip) { c = 7 - c; r = 7 - r; }
      return r * 8 + c;
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { deselect(); return; }
      const me = pos.side + 1;
      if (pos.owner(i) === me) {
        if (sel && sel.from === i) { deselect(); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { toast(X.stuck); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); return; }
      const m = sel.cands.find(x => E.mTo(x) === i);
      if (m != null) { commit(m); return; }
      if (!pos.owner(i)) toast(X.move);
      deselect();
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('c33'); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel: sel ? sel.from : null, pieces: Object.keys(pcs).length, w: pos && pos.inTarget(1), b: pos && pos.inTarget(2) }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m) })),
    };
    window.Atlas3D.ugolki._dbg = dbg;
    let drawAsked = -99;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side + 1 === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; if (ctx.onTurn) ctx.onTurn(-1);
      if (why === 'draw') {   // 合意の引き分け（ポータルの操作バーの［引き分け］）
        hud(L.draw); return later(() => ctx.onEnd(pvp ? { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed'), pvp: true, winnerText: '' } : { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed') }), 200);
      }
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 2 ? 1 : 0)),
      undo() { if (!api.canUndo()) return; timers.forEach(clearTimeout); timers.length = 0; jid++; deselect(); moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++; busy = false; legal = pos.moves(); showMarks(); next(); },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || !legal.includes(m)) return res(false);
            hintMv = m; E.path(pos, m).map((s, k) => mark(hl, k ? GEO.dot : GEO.ring, MAT.hint, s, .04)).forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: 'c33' });
        });
      },
      // 引き分け（ポータルの操作バー）：2人対局は合意で draw()。AI 対局は offerDraw() → 'yes' / 'no' / 'wait'
      // （AI は強めの探索で形勢を見て、自分が良くなければ同意。20手未満と、断ってから6手以内は受けない）
      canDraw: () => myTurn() && moves.length >= 2,
      offerDraw() {
        if (!myTurn()) return Promise.resolve('no');
        if (moves.length - drawAsked < 6) return Promise.resolve('wait');
        drawAsked = moves.length;
        if (moves.length < 20) return Promise.resolve('no');
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => { const r = e.data; if (r.type !== 'result' || r.id !== j) return; res(!stopped && !over && moves.length === mvs.length && typeof r.v === 'number' && -r.v <= 0 ? 'yes' : 'no'); };   // r.v: the side to move (you) — the AI's view is -v
          hintW.onerror = () => { hintW = null; res('no'); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: 'c33' });
        });
      },
      draw() { if (pos && !over) finish(-1, 'draw'); },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.ugolki._dbg === dbg) delete window.Atlas3D.ugolki._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 (ugolki/i18n-ug*.js) ---------- */
  const LVD = {
    ja: ['入門：ときどき遠回りをする', '初級〜中級：数手先の跳び道を読む', '上級：道作りと邪魔を読む', '最上級：深い読みでレースを計算'],
    en: ['Beginner: sometimes takes the long way', 'Novice to intermediate: reads jump roads a few moves ahead', 'Advanced: builds roads and blocks', 'Expert: deep search that counts the race'],
    zh: ['入门：有时会绕远路', '初级～中级：能看几步后的跳路', '高级：会搭路和挡路', '专家：深算整场赛跑'],
    ko: ['입문: 가끔 먼 길로 돌아감', '초급~중급: 몇 수 앞의 점프 길을 읽음', '상급: 길 만들기와 막기를 읽음', '전문가: 깊은 읽기로 레이스를 계산'],
    es: ['Principiante: a veces da rodeos', 'Inicial a intermedio: lee caminos de salto a pocas jugadas', 'Avanzado: construye y bloquea caminos', 'Experto: búsqueda profunda que cuenta la carrera'],
    fr: ['Débutant : fait parfois des détours', 'Novice à moyen : lit les routes de saut quelques coups à l’avance', 'Avancé : construit et bloque les routes', 'Expert : calcul profond de la course'],
    pt: ['Iniciante: às vezes dá voltas', 'Básico a intermediário: lê caminhos de salto alguns lances à frente', 'Avançado: constrói e bloqueia caminhos', 'Mestre: busca profunda que conta a corrida'],
    de: ['Einsteiger: macht manchmal Umwege', 'Anfänger bis Mittel: liest Sprungwege einige Züge voraus', 'Fortgeschritten: baut und sperrt Straßen', 'Meister: tiefe Suche, die das Rennen zählt'],
    hi: ['शुरुआती: कभी-कभी लंबा रास्ता लेता है', 'नौसिखिया से मध्यम: कुछ चाल आगे के छलांग-रास्ते पढ़ता है', 'उन्नत: रास्ता बनाता और रोकता है', 'विशेषज्ञ: गहरी गणना से दौड़ गिनता है'],
    ar: ['مبتدئ: يسلك أحيانًا طريقًا أطول', 'مبتدئ إلى متوسط: يقرأ طرق القفز بضع نقلات', 'متقدم: يبني الطرق ويسدّها', 'خبير: بحث عميق يحسب السباق'],
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];   // ugolki RT_LV (rated games)
  const W7 = (a, b, c, d, e, f) => [a, a, a, a, b, b, b, b, b, c, c, c, c, c, c, d, d, d, e, f];
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
  function levelInfo(n, lang) {
    const D = LVD[lang] || LVD.en, W = WHO[lang] || WHO.en;
    return { name: '', desc: D[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.ugolki = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };
})();
