/* =====================================================================
   Amazons (10×10) on the portal.
   · The board card (levels, sides, modes): Lv.1 … Lv.23 with the game's descriptions (amazons/i18n-am*.js), ratings = the
     game's RT_LV (amazons/app.js).
   · Table play (3Dで遊ぶ): start(ctx) plays on the 3D table itself with the full game's rules and AI — ../amazons/engine.js on
     the page and the same file as a Worker (the game's levels), asked as amazons/app.js asks it.
     Input as on the page, three taps: your amazon → the square it goes to → the square its arrow burns.
     ctx.mode 'pvp': two players take turns on one device (White first, at the bottom).
     Board and figures: atlas/models/amazons.js (the 3D board chosen in the portal, the 3D pieces 'atlas-amazons-pc3');
     the move: the amazon glides, the fire arrow flies in an arc and strikes, the square burns (Table3D.amazons.fly / strike).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../amazons/', VER = '?v=7';   // same file / version as amazons/app.js ENGINE_URL → shared cache
  let engP = null;
  function loadEngine() {
    if (window.AmazonsEngine) return Promise.resolve(window.AmazonsEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.AmazonsEngine ? res(window.AmazonsEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { n: ['白', '黒'], turn: '{p}の番', win: '{p}の勝ち', own: '自分のアマゾンを選んでください', stuck: 'そのアマゾンはいま動けません', go: '行き先を選ぼう', shoot: '矢を放つマスを選ぼう', why: '相手が動けなくなった', mob: '動ける' },
    en: { n: ['White', 'Black'], turn: '{p} to move', win: '{p} wins', own: 'Pick one of your amazons', stuck: 'That amazon cannot move now', go: 'Pick where she goes', shoot: 'Pick the square for her arrow', why: 'The opponent could not move', mob: 'moves' },
    zh: { n: ['白方', '黑方'], turn: '轮到{p}', win: '{p}胜', own: '请选择自己的亚马逊', stuck: '这个亚马逊现在不能动', go: '选择要去的格子', shoot: '选择射箭的格子', why: '对方无路可走', mob: '可走' },
    'zh-TW': { n: ['白方', '黑方'], turn: '輪到{p}', win: '{p}獲勝', own: '請選擇自己的亞馬遜', stuck: '這個亞馬遜現在不能動', go: '選擇要去的格子', shoot: '選擇射箭的格子', why: '對手無路可走', mob: '可走' },
    ko: { n: ['백', '흑'], turn: '{p} 차례', win: '{p} 승리', own: '내 아마존을 고르세요', stuck: '그 아마존은 지금 움직일 수 없습니다', go: '갈 칸을 고르자', shoot: '화살을 쏠 칸을 고르자', why: '상대가 움직일 수 없게 되었다', mob: '이동' },
    es: { n: ['Blancas', 'Negras'], turn: 'Turno: {p}', win: 'Ganan {p}', own: 'Elige una de tus amazonas', stuck: 'Esa amazona no puede moverse ahora', go: 'Elige a dónde va', shoot: 'Elige la casilla de su flecha', why: 'El rival no pudo moverse', mob: 'jugadas' },
    fr: { n: ['Blancs', 'Noirs'], turn: 'Trait : {p}', win: 'Victoire des {p}', own: 'Choisissez une de vos amazones', stuck: 'Cette amazone ne peut pas bouger', go: 'Choisissez où elle va', shoot: 'Choisissez la case de sa flèche', why: 'L’adversaire ne pouvait plus bouger', mob: 'coups' },
    pt: { n: ['Brancas', 'Pretas'], turn: 'Vez: {p}', win: 'Vitória das {p}', own: 'Escolha uma de suas amazonas', stuck: 'Essa amazona não pode se mover agora', go: 'Escolha para onde ela vai', shoot: 'Escolha a casa da flecha', why: 'O rival não pôde se mover', mob: 'lances' },
    de: { n: ['Weiß', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt', own: 'Wähle eine deiner Amazonen', stuck: 'Diese Amazone kann gerade nicht ziehen', go: 'Wähle ihr Zielfeld', shoot: 'Wähle das Feld für ihren Pfeil', why: 'Der Gegner konnte nicht mehr ziehen', mob: 'Züge' },
    ru: { n: ['Белые', 'Чёрные'], turn: 'Ход: {p}', win: '{p} побеждают', own: 'Выберите свою амазонку', stuck: 'Эта амазонка сейчас не может ходить', go: 'Выберите, куда она пойдёт', shoot: 'Выберите поле для стрелы', why: 'Соперник не смог сходить', mob: 'ходов' },
    tr: { n: ['Beyaz', 'Siyah'], turn: 'Sıra: {p}', win: '{p} kazandı', own: 'Amazonlarından birini seç', stuck: 'Bu amazon şu an hareket edemez', go: 'Gideceği kareyi seç', shoot: 'Okunun kareyi seç', why: 'Rakip hamle yapamadı', mob: 'hamle' },
    id: { n: ['Putih', 'Hitam'], turn: 'Giliran {p}', win: '{p} menang', own: 'Pilih salah satu amazonmu', stuck: 'Amazon itu tidak bisa bergerak sekarang', go: 'Pilih petak tujuannya', shoot: 'Pilih petak untuk panahnya', why: 'Lawan tidak bisa bergerak', mob: 'langkah' },
    hi: { n: ['सफ़ेद', 'काला'], turn: '{p} की बारी', win: '{p} की जीत', own: 'अपनी एक अमेज़न चुनो', stuck: 'वह अमेज़न अभी नहीं चल सकती', go: 'वह कहाँ जाए, चुनो', shoot: 'तीर का खाना चुनो', why: 'विरोधी चल नहीं सका', mob: 'चालें' },
    ar: { n: ['الأبيض', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}', own: 'اختر إحدى أمازوناتك', stuck: 'لا تستطيع هذه الأمازونة التحرك الآن', go: 'اختر وجهتها', shoot: 'اختر مربع سهمها', why: 'لم يستطع الخصم التحرك', mob: 'نقلات' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function noise(a, t0, dur, vol, f) { const n = a.createBuffer(1, Math.round(a.sampleRate * dur), a.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = a.createBufferSource(), b = a.createBiquadFilter(), g = a.createGain(); s.buffer = n; b.type = 'bandpass'; b.frequency.value = f; g.gain.value = vol; s.connect(b).connect(g).connect(a.destination); s.start(t0); }
  const SND = {
    lift() { const a = ac(); if (!a) return; tone(a, a.currentTime, 1200, 0, .05, .03, 'triangle'); },
    slide() { const a = ac(); if (!a) return; noise(a, a.currentTime, .22, .12, 900); },
    put() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 700, 360, .09, .06, 'triangle'); tone(a, t, 180, 90, .1, .14); },
    shoot() { const a = ac(); if (!a) return; const t = a.currentTime; noise(a, t, .16, .22, 1800); tone(a, t, 900, 520, .14, .035); },
    thunk() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 220, 90, .16, .3); noise(a, t, .3, .14, 600); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.amtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#7a5a1c;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = c => `background:url(${BASE}img/pc3-${(window.Table3D && Table3D.amazons ? Table3D.amazons.pcSet() : 'statue')}-${c === 1 ? 'w' : 'b'}.webp) center/contain no-repeat`;

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en, A3 = T3.amazons;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const N = 10, board = A3.board(); T3.show('amazons', board);
    const U = board.userData, Y = U.top;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: U.top + .4, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: U.top + .4, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;   // 1 White (moves first) / 2 Black
    const flip = human === 2;
    const pname = c => X.n[c - 1];
    let E = null;
    const scr = i => { const [r, c] = E.RC[i]; return flip ? [N - 1 - c, N - 1 - r] : [c, r]; };
    const xz = i => U.pt(...scr(i));

    let pos = null, moves = [], legal = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0;
    const mover = () => pvp && pos ? pos.turn : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.turn - 1, { human: pvp || pos.turn === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .34), lastF: basic(0xffc94a, .16), lastA: basic(0xff8a50, .9), sel: basic(0xffd25a, .95), dest: basic(0xc8f07a, .95), shot: basic(0xff8a60, .95), hint: basic(0xff7a1a, .95) };
    const GEO = { sq: new TH.PlaneGeometry(.94, .94), ring: new TH.TorusGeometry(.42, .03, 8, 44), frame: new TH.RingGeometry(.4, .47, 4, 1, Math.PI / 4), dot: new TH.CylinderGeometry(.13, .13, .012, 24), dia: new TH.CylinderGeometry(.15, .15, .012, 4) };
    GEO.sq.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2); GEO.frame.rotateX(-Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- amazons and arrows ---------- */
    let pcs = {};   // square → { g, c } (c 1 / 2 amazon, 5 arrow)
    function mkAmazon(c, i) { const g = U.piece(c), sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function mkArrow(i) { const g = new TH.Group(), s = A3.scorch(), a = A3.arrow(); s.position.y = .003; g.add(s); a.rotation.y = (i * 2.399) % (Math.PI * 2); g.add(a); g.userData.arrow = a; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .04; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0;
      for (let i = 0; i < N * N; i++) { const c = pos.owner(i); if (!c) continue; const g = mkAmazon(c, i); pcs[i] = { g, c }; g.visible = false; const d = 80 + (n++) * 90; kick(200);
        later(() => { g.visible = true; anim(300, q => lift(g, (1 - q) * (1 - q) * 1.4), () => { lift(g, 0); land(g); SND.put(); }); }, d); }
      return 80 + n * 90 + 360;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (let i = 0; i < N * N; i++) { const k = pos.at(i); if (k === 5) pcs[i] = { g: mkArrow(i), c: 5 }; else if (k) { const c = pos.owner(i); pcs[i] = { g: mkAmazon(c, i), c }; } } kick(300); }

    /* ---------- position ---------- */
    function refresh() { pos = E.replay(null, moves).pos; }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.turn === c && !over ? 'on' : ''}"><i class="dk" style="${DK(c)}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? pos.mobility(c) : 0}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'amtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2400);
    }
    function showMarks() {
      clear(hl); hintJ++;
      if (moves.length) { const m = moves[moves.length - 1]; mark(hl, GEO.sq, MAT.lastF, E.mFrom(m)); mark(hl, GEO.sq, MAT.last, E.mTo(m)); mark(hl, GEO.frame, MAT.lastA, E.mArrow(m), .012); }
    }

    /* ---------- selection: amazon → destination → arrow ---------- */
    function drawSel() {
      clear(mv); if (!sel) return;
      mark(mv, GEO.ring, MAT.sel, sel.to >= 0 ? sel.to : sel.from, .05);
      if (sel.to < 0) new Set(sel.cands.map(E.mTo)).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .03));
      else sel.cands.filter(m => E.mTo(m) === sel.to).forEach(m => mark(mv, GEO.dia, MAT.shot, E.mArrow(m), .03));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, to: -1, cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.24 - h0) * io(k))); }
      SND.lift(); hud(X.go);
    }
    function deselect() {
      clear(mv);
      if (sel) { const p = pcs[sel.from]; if (p) { const g = p.g, [x, z] = xz(sel.from), h0 = hOf(g); g.position.x = x; g.position.z = z; if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } }
      sel = null;
    }
    // the amazon steps to her destination first (the arrow is then picked from there); a tap on her again goes back
    function chooseTo(i) {
      sel.to = i; const p = pcs[sel.from];
      if (p) { const g = p.g, [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(i); SND.slide(); anim(220, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; }); }
      drawSel(); hud(X.shoot);
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      const f = E.mFrom(m), to = E.mTo(m), a = E.mArrow(m), stepped = !!(sel && sel.to === to && sel.from === f);
      clear(mv); sel = null;
      const p = pcs[f]; delete pcs[f];
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud('');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      const g = p.g, [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(to), h0 = hOf(g);
      const qd = stepped ? 160 : Math.min(520, 200 + 40 * Math.hypot(x1 - x0, z1 - z0));
      if (!stepped) SND.slide();
      anim(qd, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * (stepped ? 0 : .18) + h0 * (1 - k)); },
        () => { lift(g, 0); land(g); SND.put(); });
      const ad = Math.min(420, 150 + 32 * Math.hypot(xz(a)[0] - x1, xz(a)[1] - z1));
      later(() => { SND.shoot(); A3.fly(board, Y, [x1, z1], xz(a), ad, anim); }, qd + 70);
      later(() => {
        const ag = mkArrow(a); pcs[a] = { g: ag, c: 5 };
        const st = ag.userData.arrow; st.position.y = .22; anim(90, k => { st.position.y = .22 * (1 - k) - .03 * k; });
        A3.strike(ag, anim); SND.thunk(); kick(600);
      }, qd + 70 + ad - 10);
      later(done, qd + 70 + ad + 260);
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos);
      if (st.over) return end(st);
      legal = pos.moves();
      showMarks();
      onTurn();
      if (pvp || pos.turn === human) { hud(pvp ? X.turn.replace('{p}', pname(pos.turn)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const win = !pvp && st.winner === human, wt = pvp ? X.win.replace('{p}', pname(st.winner)) : '';
      hud(pvp ? wt : win ? L.win : L.lose);
      later(() => ctx.onEnd(pvp ? { win: false, draw: false, level: ctx.level, score: X.why, pvp: true, winnerText: wt } : { win, draw: false, level: ctx.level, score: X.why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0 }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, 0);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, U.top); if (!p) return -1;
      let c = Math.floor(p.x + N / 2), r = Math.floor(p.z + N / 2);
      if (c < 0 || c > N - 1 || r < 0 || r > N - 1) return -1;
      if (flip) { c = N - 1 - c; r = N - 1 - r; }
      return E.sqAt(r, c);
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.turn !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { deselect(); hud(''); return; }
      const me = pos.turn;
      if (sel && sel.to >= 0) {   // the arrow
        const m = sel.cands.find(x => E.mTo(x) === sel.to && E.mArrow(x) === i);
        if (m != null) { commit(m); return; }
        if (i === sel.to) { const f = sel.from, c = sel.cands; deselect(); select(f, c); return; }   // back: pick another square
        return;
      }
      if (pos.owner(i) === me) {
        if (sel && sel.from === i) { deselect(); hud(''); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { toast(X.stuck); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); return; }
      if (sel.cands.some(m => E.mTo(m) === i)) { chooseTo(i); return; }
      deselect(); hud('');
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, U.top); },
      state: () => ({ moves: moves.length, turn: pos && pos.turn, human, pvp, over, busy, thinking, sel: sel ? [sel.from, sel.to] : null, pieces: Object.keys(pcs).length }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m), arrow: E.mArrow(m) })),
    };
    window.Atlas3D.amazons._dbg = dbg;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.turn === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 2 ? 1 : 0)),
      undo() { if (!api.canUndo()) return; timers.forEach(clearTimeout); timers.length = 0; jid++; deselect(); moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++; busy = false; legal = pos.moves(); next(); },
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
            [mark(hl, GEO.ring, MAT.hint, E.mFrom(m), .06), mark(hl, GEO.dot, MAT.hint, E.mTo(m), .06), mark(hl, GEO.dia, MAT.hint, E.mArrow(m), .06)].forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(10, Math.min(14, ctx.level + 2)) });
        });
      },
      canDraw: () => false,   // Amazons has no draws (someone always runs out of moves first)
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.turn : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.amazons._dbg === dbg) delete window.Atlas3D.amazons._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.23 (amazons/i18n-am*.js) ---------- */
  const LVD = {"ja": ["入門：1手先の形だけを見る", "初級〜中級：陣地を数えて指す", "上級：数手先まで読み合う", "最上級：深く読んで閉じ込める"], "en": ["Beginner: sees only the next position", "Novice–intermediate: counts territory", "Advanced: reads a few moves ahead", "Expert: reads deep and boxes you in"], "zh": ["入门：只看下一步的形状", "初级～中级：计算领地再走", "高级：互相计算几步之后", "最强：深入计算，把你困住"], "zh-TW": ["入門：只看下一步的形狀", "初級～中級：算好領地再走", "高級：互相計算幾步之後", "最強：深入計算，把你困住"], "ko": ["입문: 바로 다음 모양만 봄", "초급~중급: 영역을 세며 둠", "상급: 몇 수 앞을 서로 읽음", "최상급: 깊이 읽어 가둠"], "es": ["Principiante: solo ve la próxima posición", "Novato–intermedio: cuenta el territorio", "Avanzado: calcula unas jugadas", "Experto: calcula hondo y te encierra"], "fr": ["Débutant : voit la position suivante", "Novice–intermédiaire : compte le territoire", "Avancé : calcule quelques coups", "Expert : calcule loin et vous enferme"], "pt": ["Iniciante: vê só a próxima posição", "Novato–intermediário: conta o território", "Avançado: calcula alguns lances", "Especialista: calcula fundo e te prende"], "de": ["Einsteiger: sieht nur die nächste Stellung", "Anfänger–Mittel: zählt das Gebiet", "Fortgeschritten: rechnet einige Züge", "Experte: rechnet tief und sperrt dich ein"], "ru": ["Новичок: видит только следующую позицию", "Начальный–средний: считает территорию", "Продвинутый: просчитывает несколько ходов", "Эксперт: считает глубоко и запирает"], "tr": ["Başlangıç: yalnız sonraki konumu görür", "Acemi–orta: bölgeyi sayar", "İleri: birkaç hamle hesaplar", "Uzman: derin hesaplar ve seni kapatır"], "id": ["Pemula: hanya melihat posisi berikutnya", "Dasar–menengah: menghitung wilayah", "Mahir: membaca beberapa langkah", "Ahli: membaca dalam dan mengurungmu"], "hi": ["शुरुआती: बस अगली स्थिति देखता है", "नौसिखिया–मध्यम: क्षेत्र गिनता है", "उन्नत: कुछ चालें आगे पढ़ता है", "विशेषज्ञ: गहराई से पढ़कर घेर लेता है"], "ar": ["مبتدئ: يرى الوضع التالي فقط", "مبتدئ–متوسط: يحسب المنطقة", "متقدم: يقرأ بضع نقلات للأمام", "خبير: يقرأ بعمق ويحاصرك"]};
  const RATING = [0, 350, 460, 570, 680, 790, 900, 1000, 1100, 1200, 1300, 1390, 1480, 1560, 1640, 1710, 1780, 1840, 1900, 2170, 2240, 2300, 2350, 2390];   // amazons RT_LV
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
    ru: W7('для первой игры', 'когда знаете правила', 'когда освоились', 'для сильных игроков', 'трудно даже экспертам', 'самый сильный'),
    'zh-TW': W7('給第一次玩的人', '懂規則之後', '漸漸上手時', '給高手', '連專家都覺得難', '最強'),
    id: W7('untuk pemula', 'setelah tahu aturannya', 'mulai terbiasa', 'untuk pemain kuat', 'sulit bahkan bagi ahli', 'yang terkuat'),
    tr: W7('ilk kez oynayanlar için', 'kuralları bilince', 'alışmaya başlayınca', 'güçlü oyuncular için', 'uzmanlar için bile zor', 'en güçlüsü'),
  };
  const LVD_TOP = { ja: '最強：全CPUコアで長時間、深く読む', en: 'Strongest: long, deep search on every CPU core', zh: '最强：用所有CPU核心长时间深入计算', 'zh-TW': '最強：用所有CPU核心長時間深入計算', ko: '최강: 모든 CPU 코어로 오래, 깊이 읽음', es: 'Máximo: búsqueda larga y profunda con todos los núcleos', fr: 'Ultime : calcul long et profond sur tous les cœurs', pt: 'Máximo: busca longa e profunda com todos os núcleos', de: 'Höchststufe: lange, tiefe Suche auf allen CPU-Kernen', ru: 'Сильнейший: долгий глубокий расчёт на всех ядрах', tr: 'En güçlü: tüm CPU çekirdekleriyle uzun, derin arama', id: 'Terkuat: pencarian panjang dan dalam dengan semua inti CPU', hi: 'सबसे मज़बूत: सभी CPU कोर पर लंबी, गहरी खोज', ar: 'الأقوى: بحث طويل وعميق بكل أنوية المعالج' };   // (Lv.21〜23, 2026-11-09)
  function levelInfo(n, lang) {
    const D = LVD[lang] || LVD.en, W = WHO[lang] || WHO.en;
    return { name: '', desc: n > 20 ? LVD_TOP[lang] || LVD_TOP.en : D[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[Math.min(n, 20) - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.amazons = { levels: 23, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };
})();
