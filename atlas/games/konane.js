/* =====================================================================
   Kōnane (8×8) on the portal.
   · The board card (levels, sides, modes): Lv.1 … Lv.20 with the game's descriptions
     (konane/i18n-kn*.js), ratings = the game's RT_LV (konane/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's
     rules and AI — ../konane/engine.js on the page (the two opening removals, orthogonal jumps,
     multiple jumps in one direction that may stop anywhere, the player who cannot jump loses)
     and the same file as a Worker (levels 1..20), asked as konane/app.js asks it.
     Input as on the page: in the opening tap the stone to lift off; then tap a stone and the
     square it lands on (any stop of its jump line).
     ctx.mode 'pvp': two players take turns on one device (Black first, at the bottom).
     Board and stones: atlas/models/konane.js (the quilt board or the stone papamū — the look chosen in the portal — with coral and basalt pebbles).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../konane/', VER = '?v=1';   // same file / version as konane/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.KonaneEngine) return Promise.resolve(window.KonaneEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.KonaneEngine ? res(window.KonaneEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { n: ['黒', '白'], turn: '{p}の番', win: '{p}の勝ち', rm1: '中央か四隅の自分の石を1つ取り除こう', rm2: '空いたマスの隣の自分の石を1つ取り除こう', rmNg: 'その石は取り除けません', stuck: 'その石はいま跳べません', own: '自分の石を選んでください', move: 'そこへは跳べません', why: '相手が跳べなくなった', jump: '{n}個続けて取った！', mob: '跳べる手' },
    en: { n: ['Black', 'White'], turn: '{p} to move', win: '{p} wins', rm1: 'Lift one of your stones from the centre or a corner', rm2: 'Lift one of your stones next to the hole', rmNg: 'That stone cannot be lifted', stuck: 'That stone cannot jump now', own: 'Pick one of your stones', move: 'It cannot land there', why: 'The opponent could not jump', jump: '{n} in a row!', mob: 'jumps' },
    zh: { n: ['黑方', '白方'], turn: '轮到{p}', win: '{p}胜', rm1: '从中央或四角取下一枚自己的子', rm2: '取下空格旁边的一枚自己的子', rmNg: '这枚子不能取下', stuck: '这枚子现在不能跳', own: '请选择自己的子', move: '不能跳到那里', why: '对方跳不了了', jump: '连吃{n}子！', mob: '可跳' },
    ko: { n: ['흑', '백'], turn: '{p} 차례', win: '{p} 승리', rm1: '가운데나 네 구석의 내 돌을 하나 빼자', rm2: '빈칸 옆의 내 돌을 하나 빼자', rmNg: '그 돌은 뺄 수 없습니다', stuck: '그 돌은 지금 뛸 수 없습니다', own: '내 돌을 고르세요', move: '그곳으로는 뛸 수 없습니다', why: '상대가 더 뛸 수 없었다', jump: '{n}개 연속으로 잡았다!', mob: '뛸 수' },
    es: { n: ['Negras', 'Blancas'], turn: 'Turno: {p}', win: 'Ganan {p}', rm1: 'Retira una piedra tuya del centro o de una esquina', rm2: 'Retira una piedra tuya junto al hueco', rmNg: 'Esa piedra no se puede retirar', stuck: 'Esa piedra no puede saltar ahora', own: 'Elige una de tus piedras', move: 'No puede caer ahí', why: 'El rival no pudo saltar', jump: '¡{n} seguidas!', mob: 'saltos' },
    fr: { n: ['Noirs', 'Blancs'], turn: 'Trait : {p}', win: 'Victoire des {p}', rm1: 'Retirez une de vos pierres au centre ou dans un coin', rm2: 'Retirez une de vos pierres à côté du trou', rmNg: 'Cette pierre ne peut pas être retirée', stuck: 'Cette pierre ne peut pas sauter', own: 'Choisissez une de vos pierres', move: 'Elle ne peut pas atterrir là', why: 'L’adversaire ne pouvait plus sauter', jump: '{n} d’affilée !', mob: 'sauts' },
    pt: { n: ['Pretas', 'Brancas'], turn: 'Vez: {p}', win: 'Vitória das {p}', rm1: 'Retire uma pedra sua do centro ou de um canto', rm2: 'Retire uma pedra sua ao lado do buraco', rmNg: 'Essa pedra não pode ser retirada', stuck: 'Essa pedra não pode saltar agora', own: 'Escolha uma de suas pedras', move: 'Ela não pode pousar aí', why: 'O rival não pôde saltar', jump: '{n} seguidas!', mob: 'saltos' },
    de: { n: ['Schwarz', 'Weiß'], turn: '{p} am Zug', win: '{p} gewinnt', rm1: 'Nimm einen eigenen Stein aus der Mitte oder einer Ecke ab', rm2: 'Nimm einen eigenen Stein neben dem Loch ab', rmNg: 'Dieser Stein darf nicht abgenommen werden', stuck: 'Dieser Stein kann gerade nicht springen', own: 'Wähle einen deiner Steine', move: 'Dort kann er nicht landen', why: 'Der Gegner konnte nicht springen', jump: '{n} in Folge!', mob: 'Sprünge' },
    hi: { n: ['काला', 'सफ़ेद'], turn: '{p} की बारी', win: '{p} की जीत', rm1: 'बीच या कोने से अपना एक पत्थर हटाओ', rm2: 'खाली खाने के बगल वाला अपना एक पत्थर हटाओ', rmNg: 'वह पत्थर नहीं हटा सकते', stuck: 'वह पत्थर अभी नहीं कूद सकता', own: 'अपना एक पत्थर चुनो', move: 'वहाँ नहीं उतर सकता', why: 'विरोधी कूद नहीं सका', jump: 'लगातार {n}!', mob: 'छलाँगें' },
    ar: { n: ['الأسود', 'الأبيض'], turn: 'دور {p}', win: 'فوز {p}', rm1: 'انزع أحد أحجارك من الوسط أو من زاوية', rm2: 'انزع أحد أحجارك المجاورة للحفرة', rmNg: 'لا يمكن نزع هذا الحجر', stuck: 'هذا الحجر لا يستطيع القفز الآن', own: 'اختر أحد أحجارك', move: 'لا يمكنه الهبوط هناك', why: 'لم يستطع الخصم القفز', jump: '{n} متتالية!', mob: 'قفزات' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): stone on stone ---------- */
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
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 900 * v, 420, .09, .07, 'triangle'); tone(a, t, 210 * v, 110, .1, .16); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1400, 1100, .06, .035, 'triangle'); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 620, 1240, .12, .05, 'triangle'); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1200, 0, .05, .03, 'triangle'); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.kntoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#0f8a7e;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 40% 35%,#5a5856,#1d1c1b 60%,#0b0b0b)', 'background:radial-gradient(circle at 40% 35%,#fff,#efe8da 60%,#c9bfae)'];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en, K3 = T3.konane;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const N = 8, board = K3.board(N); T3.show('konane', board);
    const U = board.userData, Y = U.top - U.sink;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: U.top + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: U.top + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;
    const flip = human === 2;
    const pname = c => X.n[c - 1];
    let E = null;
    const scr = i => { const [r, c] = E.RC[i]; return flip ? [N - 1 - c, N - 1 - r] : [c, r]; };
    const xz = i => U.pt(...scr(i));

    let pos = null, moves = [], legal = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0;
    const mover = () => pvp && pos ? pos.side + 1 : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side + 1 === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .34), lastF: basic(0xffc94a, .18), sel: basic(0xffc94a, .95), dest: basic(0x3fe0c4, .92), rm: basic(0xff9a4a, .95), hint: basic(0xff7a1a, .95) };
    const GEO = { cup: new TH.CircleGeometry(.42, 40), ring: new TH.TorusGeometry(.43, .03, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24) };
    GEO.cup.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, U.top + y - .02, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- stones ---------- */
    let pcs = {};
    function mk(col, i) { const g = U.piece(col), sh = T3.contact(K3.R * .9, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SND.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = []; for (let i = 0; i < N * N; i++) if (pos.owner(i)) order.push(i);
      order.sort((a, b) => scr(b)[1] - scr(a)[1] || scr(a)[0] - scr(b)[0]);
      for (const i of order) { const c = pos.owner(i), g = mk(c, i); pcs[i] = { g, c }; g.visible = false; const d = 60 + (n++) * 14; kick(200);
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); if (n % 2) SND.put(1.1); }); }, d); }
      return 60 + n * 14 + 300;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (let i = 0; i < N * N; i++) { const c = pos.owner(i); if (c) pcs[i] = { g: mk(c, i), c }; } kick(300); }
    const HOP = 260;
    function travel(g, path, done) {
      const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1, dur = legs * HOP, hopped = [];
      anim(dur, k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q = r - i, [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; SND.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * .6 + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { pos = E.replay(null, moves).pos; }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? (pos.opening ? pos.count(c) : pos.mobility(c)) : 0}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'kntoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2400);
    }
    function showMarks() {
      clear(hl); hintJ++;
      if (moves.length) { const m = moves[moves.length - 1]; if (E.isRemove(m)) mark(hl, GEO.cup, MAT.last, E.mFrom(m)); else { const before = E.replay(null, moves.slice(0, -1)).pos, p = E.path(before, m); mark(hl, GEO.cup, MAT.lastF, p[0]); mark(hl, GEO.cup, MAT.last, E.mTo(m)); } }
      if (pos && pos.opening && !over && (pvp || pos.side + 1 === human)) legal.forEach(m => pulse(mark(hl, GEO.ring, MAT.rm, E.mFrom(m), .05), 3));
    }

    /* ---------- selection ---------- */
    function drawSel() {
      clear(mv); if (!sel) return;
      mark(mv, GEO.ring, MAT.sel, sel.from, .05);
      new Set(sel.cands.map(E.mTo)).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .03));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.26 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }

    /* ---------- moves ---------- */
    function play(m, done) {
      const f = E.mFrom(m), to = E.mTo(m);
      clear(mv); sel = null;
      if (E.isRemove(m)) {
        const p = pcs[f]; delete pcs[f];
        moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud('');
        if (p) vanish(p.g, 0); later(done, 420); return;
      }
      const path = E.path(pos, m), caps = E.captured(pos, m);
      const p = pcs[f]; delete pcs[f];
      caps.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c.g, k * HOP + HOP * .45); } });
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud(caps.length > 1 ? X.jump.replace('{n}', caps.length) : '');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      travel(p.g, path, done);
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos);
      if (st.over) return end(st);
      legal = pos.moves();
      showMarks();
      onTurn();
      if (pvp || pos.side + 1 === human) { hud(pos.opening ? X[pos.ply === 0 ? 'rm1' : 'rm2'] : pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const win = !pvp && st.winner === human, wt = pvp ? X.win.replace('{p}', pname(st.winner)) : '';
      hud(pvp ? wt : win ? L.win : L.lose);
      later(() => ctx.onEnd(pvp ? { win: false, draw: false, level: ctx.level, score: X.why, pvp: true, winnerText: wt } : { win, draw: false, level: ctx.level, score: X.why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule: 's8' }); return w; }
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
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule: 's8' });
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
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { deselect(); return; }
      const me = pos.side + 1;
      if (pos.opening) {
        const m = legal.find(x => E.mFrom(x) === i);
        if (m != null) commit(m); else toast(pos.owner(i) === me ? X.rmNg : X[pos.ply === 0 ? 'rm1' : 'rm2']);
        return;
      }
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
      later(() => { busy = false; next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('s8'); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, U.top); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel: sel ? sel.from : null, pieces: Object.keys(pcs).length, mob: pos && [pos.mobility(1), pos.mobility(2)] }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m) })),
    };
    window.Atlas3D.konane._dbg = dbg;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side + 1 === human);
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
            (E.isRemove(m) ? [E.mFrom(m)] : E.path(pos, m)).map((s, k) => mark(hl, k ? GEO.dot : GEO.ring, MAT.hint, s, .06)).forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: 's8' });
        });
      },
      canDraw: () => false,   // Kōnane has no draws (someone always runs out of jumps first)
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.konane._dbg === dbg) delete window.Atlas3D.konane._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 (konane/i18n-kn*.js) ---------- */
  const LVD = {
    ja: ['入門：目の前の一手だけを見る', '初級〜中級：数手先まで数える', '上級：止めるか続けるかを見分ける', '最上級：終盤を深く読み切る'],
    en: ['Beginner: sees only the move in front of it', 'Novice to intermediate: counts a few moves ahead', 'Advanced: knows when to stop and when to go on', 'Expert: reads endgames deeply'],
    zh: ['入门：只看眼前一步', '初级～中级：能算几步', '高级：会判断停与续', '最高级：深算残局'],
    ko: ['입문: 눈앞의 한 수만 본다', '초급~중급: 몇 수 앞까지 센다', '상급: 멈출지 이어 갈지 구분한다', '최상급: 종반을 깊이 읽는다'],
    es: ['Principiante: solo ve la jugada inmediata', 'Novato–intermedio: cuenta unas jugadas', 'Avanzado: sabe cuándo parar y cuándo seguir', 'Experto: calcula los finales a fondo'],
    fr: ['Débutant : ne voit que le coup immédiat', 'Novice–intermédiaire : compte quelques coups', 'Avancé : sait quand s’arrêter et quand continuer', 'Expert : calcule les finales en profondeur'],
    pt: ['Iniciante: vê só o lance imediato', 'Novato–intermediário: conta alguns lances', 'Avançado: sabe quando parar e quando seguir', 'Especialista: calcula os finais a fundo'],
    de: ['Anfänger: sieht nur den nächsten Zug', 'Einsteiger–Mittel: zählt ein paar Züge voraus', 'Fortgeschritten: weiß, wann anhalten und wann weiter', 'Experte: rechnet Endspiele tief durch'],
    hi: ['शुरुआती: सिर्फ़ सामने की चाल देखता है', 'नौसिखिया–मध्यम: कुछ चालें आगे गिनता है', 'उन्नत: जानता है कब रुकना और कब बढ़ना', 'विशेषज्ञ: अंत को गहराई से पढ़ता है'],
    ar: ['مبتدئ: يرى النقلة القريبة فقط', 'مبتدئ–متوسط: يعدّ بضع نقلات', 'متقدم: يعرف متى يتوقف ومتى يتابع', 'خبير: يحسب النهايات بعمق'],
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];   // konane RT_LV (rated games)
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
  window.Atlas3D.konane = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };
})();
