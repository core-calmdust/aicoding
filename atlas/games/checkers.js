/* =====================================================================
   Checkers (English draughts) on the portal.
   · The board card (levels, sides, modes): level names = the game's 15 kyu … 5 dan
     (checkers/i18n.js), ratings = the game's RT_LV (checkers/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full
     game's rules and AI — ../checkers/engine.js on the page (legal moves, forced
     captures, multi-jumps, kinging, repetition / 40-move draws) and the same file as a
     Worker (WebAssembly search + learned evaluation + endgame databases, levels 1..20),
     asked exactly as checkers/app.js asks it ({ type:'think', start, moves, level }).
     ctx.mode 'pvp': two players take turns on one device (Black first, at the bottom).
     Board and pieces: atlas/models/checkers.js (lacquer board in a black lacquer frame, gold and
     silver turned-metal checkers; Black = gold, White = silver).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../checkers/', VER = '?v=rb1';   // same file / version as checkers/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.CheckersEngine) return Promise.resolve(window.CheckersEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.CheckersEngine ? res(window.CheckersEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (checkers/i18n.js): colours, forced capture, game-end reasons
  const TX = {
    ja: { n: ['黒', '白'], turn: '{p}の番', win: '{p}の勝ち', must: '取れる駒があるときは、必ず取らなければなりません（光っている駒）', stuck: 'その駒は動けません', path: 'どのルートで取るか、途中のマスから順にタップしてください', none: '駒をすべて取った', block: '動ける駒がない', rep: '同じ局面が3回', forty: '40手ルールで引き分け', king: 'キング！', jump: '連続取り！' },
    en: { n: ['Black', 'White'], turn: '{p} to move', win: '{p} wins', must: 'When you can capture you must capture (the glowing pieces)', stuck: 'That piece cannot move', path: 'Tap the landing squares one by one to choose the jump route', none: 'All pieces captured', block: 'No piece can move', rep: 'Threefold repetition', forty: 'Draw by the 40-move rule', king: 'King!', jump: 'Multi-jump!' },
    zh: { n: ['黑', '白'], turn: '轮到{p}', win: '{p}胜', must: '能吃子时必须吃子（发光的棋子）', stuck: '这枚棋子不能走', path: '请依次点击落点，选择连跳路线', none: '吃光了全部棋子', block: '没有可走的棋子', rep: '同一局面出现3次', forty: '40回合规则和棋', king: '升王！', jump: '连跳！' },
    ko: { n: ['흑', '백'], turn: '{p} 차례', win: '{p} 승리', must: '잡을 수 있을 때는 반드시 잡아야 합니다(빛나는 말)', stuck: '그 말은 움직일 수 없습니다', path: '착지할 칸을 차례로 눌러 잡는 경로를 고르세요', none: '말을 모두 잡았다', block: '움직일 수 있는 말이 없다', rep: '같은 국면 3회', forty: '40수 규칙으로 무승부', king: '킹!', jump: '연속 잡기!' },
    es: { n: ['Negras', 'Blancas'], turn: 'Turno: {p}', win: 'Ganan {p}', must: 'Si puedes capturar, debes hacerlo (las piezas que brillan)', stuck: 'Esa pieza no puede moverse', path: 'Toca las casillas de aterrizaje una a una para elegir la ruta', none: 'Todas las piezas capturadas', block: 'Ninguna pieza puede moverse', rep: 'Triple repetición', forty: 'Tablas por la regla de 40 jugadas', king: '¡Dama!', jump: '¡Salto múltiple!' },
    fr: { n: ['Noirs', 'Blancs'], turn: 'Trait : {p}', win: 'Victoire des {p}', must: 'Quand on peut prendre, on doit prendre (pièces en surbrillance)', stuck: 'Cette pièce ne peut pas bouger', path: 'Touchez les cases d’arrivée une à une pour choisir la rafle', none: 'Toutes les pièces prises', block: 'Aucune pièce ne peut bouger', rep: 'Triple répétition', forty: 'Nulle par la règle des 40 coups', king: 'Dame !', jump: 'Rafle !' },
    pt: { n: ['Pretas', 'Brancas'], turn: 'Vez: {p}', win: 'Vitória das {p}', must: 'Quando é possível capturar, a captura é obrigatória (as peças que brilham)', stuck: 'Essa peça não pode se mover', path: 'Toque as casas de pouso uma a uma para escolher a rota', none: 'Todas as peças capturadas', block: 'Nenhuma peça pode se mover', rep: 'Tripla repetição', forty: 'Empate pela regra dos 40 lances', king: 'Dama!', jump: 'Captura múltipla!' },
    de: { n: ['Schwarz', 'Weiß'], turn: '{p} am Zug', win: '{p} gewinnt', must: 'Wer schlagen kann, muss schlagen (die leuchtenden Steine)', stuck: 'Dieser Stein kann nicht ziehen', path: 'Tippe die Landefelder nacheinander an, um den Schlagweg zu wählen', none: 'Alle Steine geschlagen', block: 'Kein Stein kann ziehen', rep: 'Dreifache Wiederholung', forty: 'Remis nach der 40-Züge-Regel', king: 'Dame!', jump: 'Mehrfachschlag!' },
    hi: { n: ['काला', 'सफ़ेद'], turn: '{p} की बारी', win: '{p} की जीत', must: 'जब मार सकते हैं तो मारना ही होगा (चमकती गोटियाँ)', stuck: 'यह गोटी नहीं चल सकती', path: 'कूदने का रास्ता चुनने के लिए उतरने वाले खाने एक-एक करके छुएँ', none: 'सारी गोटियाँ पकड़ ली गईं', block: 'कोई गोटी नहीं चल सकती', rep: 'तीन बार एक ही स्थिति', forty: '40 चाल नियम से ड्रॉ', king: 'किंग!', jump: 'लगातार कूद!' },
    ar: { n: ['الأسود', 'الأبيض'], turn: 'دور {p}', win: 'فوز {p}', must: 'عندما يمكنك الأسر يجب أن تأسر (القطع المضيئة)', stuck: 'هذه القطعة لا تستطيع الحركة', path: 'المس مربعات الهبوط واحدًا تلو الآخر لاختيار مسار القفز', none: 'أُسرت كل القطع', block: 'لا توجد قطعة تستطيع الحركة', rep: 'تكرار ثلاثي', forty: 'تعادل بقاعدة الأربعين نقلة', king: 'ملك!', jump: 'قفز متعدد!' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): metal on lacquer ---------- */
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function noise(a, t0, dur, vol, freq, q) {
    const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
    n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q || 1.4;
    const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0);
  }
  const SND = {
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 320 * v, 140, .1, .2); noise(a, t, .04, .5, 3600 * v, 1.6); tone(a, t, 2400 * v, 0, .09, .025, 'triangle'); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 460, 200, .09, .16); noise(a, t, .03, .35, 3000, 1.4); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1800, 1500, .25, .05, 'triangle'); tone(a, t, 210, 80, .18, .2); noise(a, t, .06, .25, 900, .8); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1500, 0, .06, .03, 'triangle'); },
    crown() { const a = ac(); if (!a) return; const t = a.currentTime; [659.25, 880, 1318.5].forEach((f, i) => tone(a, t + i * .07, f, 0, .5, .09, 'triangle')); },
  };

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.cktoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:ckT .2s ease-out;pointer-events:none}
@keyframes ckT{from{transform:translate(-50%,8px);opacity:0}}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 35% 30%,#fff1c2,#e8b64e 45%,#8a6418);box-shadow:inset 0 0 0 1px rgba(110,80,20,.4)', 'background:radial-gradient(circle at 35% 30%,#fff,#d6d9de 45%,#7c8189);box-shadow:inset 0 0 0 1px rgba(80,86,96,.4)'];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.checkers(true); T3.show('checkers', board);
    const U = board.userData, Y = U.top, W = U.S * U.outer;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: W + .7, d: W + .9, y: Y + .2, pitch: 1.0 } : { w: W + .3, d: W + .6, y: Y + .2, pitch: 1.0 });   // the whole board, large, from the player's side
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;   // colours: 1 Black (moves first, gold), 2 White (silver)
    const flip = human === 1;                                           // the player's colour at the bottom (pvp: Black)
    const pname = c => X.n[c - 1];
    let E = null;
    // square (0..31) ↔ board: x = column left → right, y = row far → near
    const scr = i => { const [r, c] = E.RC[i]; return flip ? [7 - c, 7 - r] : [c, r]; };
    const xz = i => U.pt(...scr(i));
    const colOf = k => k <= 2 ? 1 : 2, isKing = k => k === 2 || k === 4;

    let pos = null, hashes = [], legal = [], moves = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintMv = -1;
    const mover = () => pvp && pos ? pos.turn : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.turn - 1, { human: pvp || pos.turn === human, ply }); };   // HUD pills: Black (left) 0, White 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks on the field: last move, selection, destinations, forced captures, hint ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .3), lastF: basic(0xffc94a, .14), sel: basic(0x3ee08a, .95), dest: basic(0x3ee08a, .9), mid: basic(0x3ee08a, .55), trail: basic(0x3ee08a, .18), must: basic(0xffb020, .95), hint: basic(0xff7a1a, .95), took: basic(0xff4a3a, .7) };
    const GEO = { sq: new TH.PlaneGeometry(.98, .98), ring: new TH.TorusGeometry(.46, .035, 8, 44), dot: new TH.CylinderGeometry(.15, .15, .012, 24), small: new TH.CylinderGeometry(.09, .09, .012, 20), x: new TH.BoxGeometry(.34, .012, .06) };
    GEO.sq.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, sq, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(sq); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- pieces ---------- */
    let pcs = {};   // square → { g, k }
    function mk(kind, sq) {
      const g = U.piece(colOf(kind) === 1 ? 'g' : 'w', isKing(kind), { reflect: true });
      const sh = T3.contact(.36, .55); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      g.userData.rf = g.children.find(o => o.userData && o.userData.reflection) || null;
      const [x, z] = xz(sq); g.position.set(x, Y, z); board.add(g); return g;
    }
    function lift(g, h) {   // the piece h above the field: its shadow stays on the field, its mirror image goes down
      g.position.y = Y + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .55 / (1 + h * 1.4); }
      if (g.userData.rf) g.userData.rf.position.y = -2 * h;
    }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(170, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let i = 0;
      const order = []; for (let sq = 0; sq < 32; sq++) if (pos.at(sq)) order.push(sq);
      order.sort((a, b) => scr(b)[1] - scr(a)[1]);   // the near rows first
      for (const sq of order) {
        const k = pos.at(sq), g = mk(k, sq); pcs[sq] = { g, k };
        g.visible = false; const d = 60 + (i++) * 22; kick(200);
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.4), () => { lift(g, 0); land(g); SND.put(1.1); }); }, d);
      }
      return 60 + i * 22 + 300;
    }
    function rebuild() {   // pieces exactly as the position says (after 待った), without the drop-in
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      board.children.filter(o => o.userData && o.userData.col && o.userData.dying).forEach(drop);
      for (let sq = 0; sq < 32; sq++) { const k = pos.at(sq); if (k) pcs[sq] = { g: mk(k, sq), k }; }
      kick(300);
    }
    // a captured piece pops up, tips away and fades out
    function knockOff(g, dx, dz) {
      g.userData.dying = true;
      const mats = [];
      g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      if (g.userData.rf) g.userData.rf.visible = false;
      const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, x0 = g.position.x, z0 = g.position.z;
      const axis = new TH.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new TH.Quaternion(), sh = g.userData.sh;
      SND.take();
      anim(560, k => {
        qt.setFromAxisAngle(axis, 2.4 * k); g.quaternion.copy(qt).multiply(q0);
        g.position.x = x0 + ux * .5 * k; g.position.z = z0 + uz * .5 * k; g.position.y = Y + Math.sin(k * Math.PI) * .8;
        const f = k < .4 ? 1 : 1 - (k - .4) / .6; mats.forEach(m => { m.opacity = Math.max(0, f); }); if (sh) sh.material.opacity = .55 * Math.max(0, 1 - k * 2);
      }, () => { drop(g); mats.forEach(m => m.dispose()); });
    }
    // kinging: a second checker and the crown come down onto the man
    function crown(sq, col) {
      const p = pcs[sq]; if (!p) return;
      const old = p.g, g = mk(col === 1 ? 2 : 4, sq); p.g = g; p.k = col === 1 ? 2 : 4;
      const tops = g.children.filter(o => o.isMesh && !o.userData.contact).slice(1);   // the upper checker and the crown
      tops.forEach(o => { o.userData.y0 = o.position.y; o.position.y += 1.6; });
      drop(old);
      anim(420, k => { const e = k < .7 ? (k / .7) * (k / .7) : 1, b = k < .7 ? 0 : Math.sin((k - .7) / .3 * Math.PI) * .12; tops.forEach(o => { o.position.y = o.userData.y0 + 1.6 * (1 - e) + b; }); },
        () => { tops.forEach(o => { o.position.y = o.userData.y0; }); land(g); SND.crown(); });
    }
    // lift — glide — set down; a capture hops over each jumped piece, which is knocked off as the piece passes
    function travel(g, path, cap, vict, done) {
      const pts = path.map(xz), H = .32, A = 110, D = 140;
      const legs = []; for (let i = 1; i < pts.length; i++) legs.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const legT = cap ? legs.map(() => 330) : legs.map(d => 200 + d * 90), mid = legT.reduce((a, b) => a + b, 0), dur = A + mid + D;
      const h0 = hOf(g), victims = [];
      if (cap) for (let i = 1; i < path.length; i++) { const [ra, ca] = E.RC[path[i - 1]], [rb, cb] = E.RC[path[i]], v = E.sqAt((ra + rb) / 2, (ca + cb) / 2); victims.push(v); }
      const hit = victims.map(() => false), hopped = victims.map(() => false);
      anim(dur, k => {
        const tm = k * dur;
        if (tm < A) { lift(g, h0 + (H - h0) * io(tm / A)); return; }
        if (tm >= A + mid) { const [x, z] = pts[pts.length - 1]; g.position.x = x; g.position.z = z; const q = (tm - A - mid) / D; lift(g, H * (1 - q * q)); return; }
        let r = tm - A, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
        const e = io(Math.min(1, r / legT[i])), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        lift(g, H + (cap ? Math.sin(e * Math.PI) * .55 : 0));
        if (cap) {
          if (!hopped[i] && e > .05) { hopped[i] = true; SND.hop(); }
          if (!hit[i] && e > .5) { hit[i] = true; const vg = vict[victims[i]]; if (vg && !vg.userData.dying) knockOff(vg, x1 - x0, z1 - z0); }
        }
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
      return dur;
    }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(null, moves); pos = r.pos; hashes = r.hashes; }
    function status() { const st = E.judge(pos, hashes); if (!st.over) st.legal = pos.moves(); return st; }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.turn === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? pos.count(c) : 12}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'cktoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }
    let mustMarks = [];
    function showMarks() {
      clear(hl); hintMv = -1; hintJ++; mustMarks = [];
      if (moves.length) {
        const m = moves[moves.length - 1], before = E.replay(null, moves.slice(0, -1)).pos, p = E.path(before, m);
        mark(hl, GEO.sq, MAT.lastF, p[0]); mark(hl, GEO.sq, MAT.last, E.mTo(m));
        E.bitsOf(E.mCap(m)).forEach(i => { [1, -1].forEach(sg => { const b = mark(hl, GEO.x, MAT.took, i, .01); b.rotation.y = sg * Math.PI / 4; }); });
      }
      showMust();
    }
    function showMust() {   // forced capture: a ring round every piece that can (must) jump, when it is a human's turn
      mustMarks.forEach(m => hl.remove(m)); mustMarks = [];
      if (over || !pos || sel || !(pvp || pos.turn === human) || thinking) return;
      const caps = legal.filter(m => E.mCap(m));
      if (!caps.length) return;
      new Set(caps.map(E.mFrom)).forEach(f => { const r = mark(hl, GEO.ring, MAT.must, f, .02); mustMarks.push(r); pulse(r, 2); });
    }

    /* ---------- selection (multi-jumps can be tapped hop by hop) ---------- */
    function pathsOf() { return sel.cands.map(m => ({ m, p: E.path(pos, m) })); }
    function drawSel() {
      clear(mv);
      const k = sel.trail.length;
      mark(mv, GEO.ring, MAT.sel, sel.from, .02);
      for (let j = 1; j < k; j++) mark(mv, GEO.sq, MAT.trail, sel.trail[j], .004);
      const next = new Set(), fin = new Set();
      for (const { p } of pathsOf()) if (p.length > k) { next.add(p[k]); if (p.length === k + 1) fin.add(p[k]); }
      next.forEach(i => mark(mv, fin.has(i) ? GEO.dot : GEO.small, fin.has(i) ? MAT.dest : MAT.mid, i, .01));
    }
    function select(sq, cands) {
      deselect();
      sel = { from: sq, trail: [sq], cands }; showMust(); drawSel();
      const p = pcs[sq]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.28 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() {
      clear(mv);
      if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); }
      sel = null; showMust();
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      const from = E.mFrom(m), to = E.mTo(m), cap = E.mCap(m), path = E.path(pos, m), promo = pos.promotes(m), col = pos.turn;
      clear(mv); sel = null;
      const p = pcs[from]; delete pcs[from];
      const vict = {}; E.bitsOf(cap).forEach(i => { if (pcs[i]) { vict[i] = pcs[i].g; delete pcs[i]; } });   // they stay on the board until the mover passes over them
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud(cap && path.length > 2 ? X.jump : '');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      travel(p.g, path, cap, vict, () => {
        Object.values(vict).forEach(g => { if (g.parent && !g.userData.dying) knockOff(g, 0, 1); });
        if (promo) { crown(to, col); later(done, 460); } else done();
      });
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = status(); legal = st.legal || [];
      if (st.over) return end(st);
      onTurn(); showMust();
      if (pvp || pos.turn === human) { hud(pvp ? X.turn.replace('{p}', pname(pos.turn)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); showMust(); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw || !st.winner, why = X[st.why] || '';
      const win = !pvp && !draw && st.winner === human, wt = pvp && !draw ? X.win.replace('{p}', pname(st.winner)) : '';
      hud(draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      if (!draw) {   // the loser's remaining pieces sink a little
        Object.values(pcs).forEach(p => { if (colOf(p.k) !== st.winner) { const g = p.g; g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(.55); } }); } });
        kick(300);
      }
      later(() => ctx.onEnd(pvp ? { win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt } : { win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0 }); return w; }
    function aiMove() {
      thinking = true; hud(L.think); showMust();
      if (!worker) worker = newWorker();
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }   // the worker failed: a small search on the page (JS)
        later(() => {
          if (id !== jid || over) return;
          thinking = false;
          if (m == null || m < 0 || !legal.includes(m)) { next(); return; }
          commit(m);
        }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let c = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
      if (flip) { c = 7 - c; r = 7 - r; }
      return E.sqAt(r, c);
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.turn !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { deselect(); return; }
      const me = pos.turn, k0 = pos.at(i), own = k0 && colOf(k0) === me;
      if (own && (!sel || sel.trail.length === 1 || i === sel.from)) {
        if (sel && sel.from === i) { deselect(); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { const mj = legal.length && E.mCap(legal[0]); toast(mj ? X.must : X.stuck); if (mj) mustMarks.forEach(r => pulse(r, 2)); return; }
        select(i, c); return;
      }
      if (!sel) { if (legal.length && E.mCap(legal[0])) mustMarks.forEach(r => pulse(r, 1)); return; }
      const k = sel.trail.length, paths = pathsOf().filter(x => sel.trail.every((s, j) => x.p[j] === s));
      const nx = paths.filter(x => x.p[k] === i);
      if (nx.length) {
        const fin = nx.filter(x => x.p.length === k + 1);
        if (fin.length && fin.length === nx.length) { commit(fin[0].m); return; }
        sel.trail.push(i); sel.cands = nx.map(x => x.m); SND.hop(); drawSel(); return;   // continue the jump hop by hop
      }
      const ends = paths.filter(x => E.mTo(x.m) === i);
      if (ends.length === 1) { commit(ends[0].m); return; }
      if (ends.length > 1) { toast(X.path); return; }
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
    loadEngine().then(e => { if (stopped) return; E = e; if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: sq => { const [x, z] = xz(sq); return T3.project(x, z, Y); },
      state: () => ({ hint: hintMv, moves: moves.length, turn: pos && pos.turn, human, pvp, over, busy, thinking, sel: sel ? sel.trail.slice() : null, b: pos && pos.count(1), w: pos && pos.count(2), pieces: Object.keys(pcs).length, meshes: board.children.filter(o => o.userData && o.userData.col).length }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m), cap: E.mCap(m), path: E.path(pos, m) })),
    };
    window.Atlas3D.checkers._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.turn === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (1 Black, 2 White) loses
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; showMust(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 2 ? 1 : 0)),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++; deselect();
        moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++;
        busy = false; legal = pos.moves(); showMarks(); next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || m < 0 || !legal.includes(m)) return res(false);
            hintMv = m;
            const p = E.path(pos, m), rs = p.map((s, i) => mark(hl, i ? GEO.dot : GEO.ring, MAT.hint, s, .03));
            rs.forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
        });
      },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.turn : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.checkers._dbg === dbg) delete window.Atlas3D.checkers._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {
    ja: { kyu: '{n}級', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入門：ときどき駒をただで渡してしまう', '初級〜中級：数手先まで読む', '上級：連続取りのショットを読み切る', '有段：深読み・終盤データベース'] },
    en: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Novice: sometimes gives pieces away', 'Beginner to club: reads a few moves ahead', 'Advanced: sees multi-jump shots', 'Expert: deep search with endgame databases'] },
    zh: { kyu: '{n}级', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入门：偶尔会白送棋子', '初级～中级：能算几步', '高级：能算清连跳的弃子战术', '有段：深度计算・残局数据库'] },
    ko: { kyu: '{n}급', dan: ['초단', '2단', '3단', '4단', '5단'], lvd: ['입문: 가끔 말을 공짜로 내준다', '초급~중급: 몇 수 앞까지 읽는다', '상급: 연속 잡기 샷을 읽어 낸다', '유단자: 깊은 수읽기・엔드게임 데이터베이스'] },
    es: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Novato: a veces regala piezas', 'Principiante a aficionado: calcula unas jugadas por delante', 'Avanzado: ve los golpes con saltos múltiples', 'Experto: búsqueda profunda con bases de datos de finales'] },
    fr: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Novice : donne parfois des pièces', 'Débutant à club : calcule quelques coups à l\'avance', 'Avancé : voit les coups à rafle', 'Expert : calcul profond avec bases de finales'] },
    pt: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Novato: às vezes entrega peças', 'Iniciante a intermediário: calcula alguns lances à frente', 'Avançado: enxerga golpes com captura múltipla', 'Especialista: busca profunda com bases de dados de finais'] },
    de: { kyu: '{n} Kyu', dan: ['1 Dan', '2 Dan', '3 Dan', '4 Dan', '5 Dan'], lvd: ['Neuling: verschenkt manchmal Steine', 'Anfänger bis Vereinsspieler: rechnet ein paar Züge voraus', 'Fortgeschritten: sieht Schlagkombinationen mit Mehrfachschlag', 'Experte: tiefe Suche mit Endspieldatenbanken'] },
    hi: { kyu: '{n} क्यू', dan: ['1 डैन', '2 डैन', '3 डैन', '4 डैन', '5 डैन'], lvd: ['नौसिखिया: कभी-कभी गोटियाँ मुफ़्त दे देता है', 'शुरुआती से क्लब स्तर: कुछ चालें आगे सोचता है', 'उन्नत: लगातार कूद वाले शॉट देख लेता है', 'विशेषज्ञ: एंडगेम डेटाबेस के साथ गहरी खोज'] },
    ar: { kyu: '{n} كيو', dan: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'], lvd: ['مبتدئ تمامًا: يفرّط أحيانًا في قطعه', 'من مبتدئ إلى مستوى النادي: يقرأ بضع نقلات مسبقًا', 'متقدم: يرى ضربات القفز المتعدد', 'خبير: بحث عميق مع قواعد بيانات النهايات'] },
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];   // checkers RT_LV (rated games)
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
  function levelInfo(n, lang) {   // n = 1..20 (the game's level: 15 kyu … 5 dan)
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    const name = n <= 15 ? L.kyu.replace('{n}', 16 - n) : L.dan[n - 16];
    return { name, desc: L.lvd[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.checkers = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
