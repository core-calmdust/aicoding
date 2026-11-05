/* =====================================================================
   Fanorona (Fanoron-Tsivy, 9×5) on the portal.
   · The board card (levels, sides, modes): level names = the game's 15 kyu … 5 dan
     (fanorona/i18n.js), ratings = the game's RT_LV (fanorona/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full
     game's rules and AI — ../fanorona/engine.js on the page (legal steps, approach /
     withdrawal, compulsory capture, optional capture chains, threefold repetition and
     80 quiet plies) and the same file as a Worker (WebAssembly search, endgame database,
     learned evaluation, opening book; levels 1..20), asked as fanorona/app.js asks it.
     Input as on the page: tap a ball, then where it goes; when approach and withdrawal both
     capture, tap a ball of the line to take; after a capture tap the next landing point to go
     on capturing, or the ball itself (anywhere else) to end the turn.
     ctx.mode 'pvp': two players take turns on one device (White first, at the bottom).
     Board and balls: atlas/models/fanorona.js (carved acacia, matte wooden balls; captured
     balls hop into the capturer's groove).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../fanorona/', VER = '?v=fb4';   // same file / version as fanorona/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.FanoronaEngine) return Promise.resolve(window.FanoronaEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.FanoronaEngine ? res(window.FanoronaEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (fanorona/i18n.js): colours, compulsory capture, approach / withdrawal, game-end reasons
  const TX = {
    ja: { n: ['先手（白）', '後手（黒）'], turn: '{p}の番', win: '{p}の勝ち', must: '取れる駒があるときは、必ず取らなければなりません（光っている駒）', stuck: 'その駒は動かせません', move: 'そこへは動けません', choose: '接近と離脱の両方で取れます。取る列の駒を押してください', own: '自分の駒を選んでください', more: '続けて取れます。次の点を押すか、駒を押して終わります', none: '駒をすべて取った', block: '動ける駒がない', rep: '同じ局面が3回', quiet: '80手取りなしで引き分け', chain: '連続取り！' },
    en: { n: ['White', 'Black'], turn: '{p} to move', win: '{p} wins', must: 'When a capture is possible you must capture (the glowing pieces)', stuck: 'That piece cannot move', move: 'It cannot move there', choose: 'Both approach and withdrawal capture: tap a piece of the line to take', own: 'Pick one of your pieces', more: 'You can capture again: tap the next point, or the piece to stop', none: 'All pieces captured', block: 'No piece can move', rep: 'Threefold repetition', quiet: 'Draw: 80 moves without a capture', chain: 'Capture chain!' },
    zh: { n: ['白方', '黑方'], turn: '轮到{p}', win: '{p}胜', must: '有子可吃时必须吃子（发光的棋子）', stuck: '这枚棋子不能移动', move: '不能走到那里', choose: '接近和撤离都能吃子。请点击要吃的那一列中的棋子', own: '请选择自己的棋子', more: '还能继续吃：点击下一个点，或点击棋子结束', none: '吃光了全部棋子', block: '没有可走的棋子', rep: '同一局面出现3次', quiet: '连续80手无吃子，和棋', chain: '连吃！' },
    ko: { n: ['백', '흑'], turn: '{p} 차례', win: '{p} 승리', must: '잡을 수 있는 말이 있으면 반드시 잡아야 합니다 (빛나는 말)', stuck: '그 말은 움직일 수 없습니다', move: '그곳으로는 움직일 수 없습니다', choose: '접근과 이탈 둘 다로 잡을 수 있습니다. 잡을 줄의 말을 누르세요', own: '자신의 말을 고르세요', more: '계속 잡을 수 있습니다: 다음 점을 누르거나 말을 눌러 끝내세요', none: '말을 모두 잡았다', block: '움직일 수 있는 말이 없다', rep: '같은 국면 3회', quiet: '80수 동안 잡기 없음: 무승부', chain: '연속 잡기!' },
    es: { n: ['Blancas', 'Negras'], turn: 'Turno: {p}', win: 'Ganan {p}', must: 'Si puedes capturar, debes hacerlo (las piezas que brillan)', stuck: 'Esa pieza no puede moverse', move: 'No puede ir ahí', choose: 'Capturan tanto la aproximación como la retirada: toca una pieza de la línea que quieres capturar', own: 'Elige una de tus piezas', more: 'Puedes seguir capturando: toca el siguiente punto, o la pieza para parar', none: 'Todas las piezas capturadas', block: 'Ninguna pieza puede moverse', rep: 'Triple repetición', quiet: 'Tablas: 80 jugadas sin captura', chain: '¡Captura en cadena!' },
    fr: { n: ['Blancs', 'Noirs'], turn: 'Trait : {p}', win: 'Victoire des {p}', must: 'Quand une prise est possible, elle est obligatoire (pions qui brillent)', stuck: 'Cette pièce ne peut pas bouger', move: 'Impossible d’aller là', choose: 'L’approche et le retrait prennent tous deux : touchez un pion de la ligne à prendre', own: 'Choisissez une de vos pièces', more: 'Vous pouvez reprendre : touchez le point suivant, ou la pièce pour arrêter', none: 'Toutes les pièces prises', block: 'Aucune pièce ne peut bouger', rep: 'Triple répétition', quiet: 'Nulle : 80 coups sans prise', chain: 'Prises en chaîne !' },
    pt: { n: ['Brancas', 'Pretas'], turn: 'Vez: {p}', win: 'Vitória das {p}', must: 'Quando há captura possível, é preciso capturar (as peças que brilham)', stuck: 'Essa peça não pode se mover', move: 'Ela não pode ir para lá', choose: 'Aproximação e retirada capturam: toque numa peça da linha que quer capturar', own: 'Escolha uma das suas peças', more: 'Pode capturar de novo: toque o próximo ponto, ou a peça para parar', none: 'Todas as peças capturadas', block: 'Nenhuma peça pode se mover', rep: 'Tripla repetição', quiet: 'Empate: 80 lances sem captura', chain: 'Captura em cadeia!' },
    de: { n: ['Weiß', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt', must: 'Ist ein Schlag möglich, musst du schlagen (die leuchtenden Steine)', stuck: 'Dieser Stein kann nicht ziehen', move: 'Dorthin geht es nicht', choose: 'Annäherung und Rückzug schlagen beide: tippe auf einen Stein der Reihe, die du schlagen willst', own: 'Wähle einen deiner Steine', more: 'Du kannst weiterschlagen: tippe den nächsten Punkt an oder den Stein, um aufzuhören', none: 'Alle Steine geschlagen', block: 'Kein Stein kann ziehen', rep: 'Dreifache Wiederholung', quiet: 'Remis: 80 Züge ohne Schlag', chain: 'Schlagkette!' },
    hi: { n: ['सफ़ेद', 'काला'], turn: '{p} की बारी', win: '{p} की जीत', must: 'जब पकड़ना संभव हो, तो पकड़ना अनिवार्य है (चमकते मोहरे)', stuck: 'यह गोटी चल नहीं सकती', move: 'वहाँ नहीं जा सकते', choose: 'पास जाकर और पीछे हटकर दोनों से पकड़ सकते हैं: जिस पंक्ति को पकड़ना है उसका मोहरा टैप करें', own: 'अपनी कोई गोटी चुनें', more: 'फिर से पकड़ सकते हैं: अगला बिंदु छुएँ, या रुकने के लिए गोटी छुएँ', none: 'सारी गोटियाँ पकड़ ली गईं', block: 'कोई गोटी नहीं चल सकती', rep: 'तीन बार एक ही स्थिति', quiet: 'ड्रॉ: 80 चालें बिना पकड़', chain: 'लगातार पकड़!' },
    ar: { n: ['الأبيض', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}', must: 'عندما يكون الأسر ممكنًا فالأسر إلزامي (القطع المتوهجة)', stuck: 'هذه القطعة لا تستطيع الحركة', move: 'لا يمكن الانتقال إلى هناك', choose: 'الاقتراب والانسحاب كلاهما يأسر: انقر قطعة من الصف الذي تريد أسره', own: 'اختر إحدى قطعك', more: 'يمكنك الأسر مجددًا: انقر النقطة التالية، أو القطعة للتوقف', none: 'أُسرت كل القطع', block: 'لا توجد قطعة تستطيع الحركة', rep: 'تكرار ثلاثي', quiet: 'تعادل: 80 نقلة دون أسر', chain: 'أسر متتابع!' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): wood on wood ---------- */
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
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 260 * v, 120, .1, .2); noise(a, t, .035, .45, 2200 * v, 1.3); },
    roll() { const a = ac(); if (!a) return; const t = a.currentTime; noise(a, t, .22, .12, 700, .6); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 900, 420, .07, .07); noise(a, t, .04, .25, 2600, 1.4); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1100, 0, .05, .03, 'triangle'); },
  };

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.fntoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:fnT .2s ease-out;pointer-events:none}
@keyframes fnT{from{transform:translate(-50%,8px);opacity:0}}`;
    document.head.appendChild(s);
  }
  const GAMES = { fanorona: { id: 'fanorona', rule: 'sivy', model: 'fanorona', nc: 9, pcs: 22 }, alquerque: { id: 'alquerque', rule: 'alq', model: 'alquerque', nc: 5, pcs: 12 } };
  const DKA = ['background:radial-gradient(circle at 38% 32%,#fff0b8,#d9ad4a 55%,#8a6420)', 'background:radial-gradient(circle at 38% 32%,#4a78e0,#1d3f9a 60%,#0d2470)'];
  const DK = ['background:radial-gradient(circle at 38% 32%,#f6e2bf,#d6ab73 55%,#9c7240)', 'background:radial-gradient(circle at 38% 32%,#6a4a36,#2e1d14 60%,#140b06)'];

  // G: the game — Fanorona (9×5, carved acacia, wooden balls) or Alquerque (5×5 on the same engine, the Damascene inlaid board)
  function start(ctx, G0) {
    const GG = G0 || GAMES.fanorona, NCg = GG.nc, NPg = 45;   // (the engine numbers the points r * 9 + c on every board)
    const T3 = ctx.Table3D, TH = window.THREE, F3 = T3[GG.model], t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = F3.board(GG.rule); T3.show(GG.id, board);
    const U = board.userData, Y = U.top, GS = .66;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: Y + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: Y + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;   // 1 White (moves first, pale balls), 2 Black (ebony)
    const flip = human === 2;                                           // the player's colour at the bottom (pvp: White)
    const pname = c => X.n[c - 1];
    let E = null;
    // point (r * 9 + c) ↔ board: display column left → right, display row far → near
    const scr = i => { const r = (i / 9) | 0, c = i % 9; return flip ? [NCg - 1 - c, r] : [c, 4 - r]; };
    const xz = i => U.pt(...scr(i));
    const bottomCol = flip ? 2 : 1;

    let pos = null, hashes = [], moves = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintMv = null;
    const mover = () => pvp && pos ? pos.turn : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.turn - 1, { human: pvp || pos.turn === human, ply }); };   // HUD pills: White (left) 0, Black 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks on the board: last move, selection, destinations, captures to choose, forced captures, hint ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffcf6a, .85), lastF: basic(0xffcf6a, .45), sel: basic(0xfff0c0, .95), dest: basic(0x3ee08a, .92), cap: basic(0xff8a2a, .95), trail: basic(0xfff0c0, .5), must: basic(0xffc24a, .95), hint: basic(0xff7a1a, .95), took: basic(0xff4a3a, .75), ka: basic(0xff8a2a, .95), kw: basic(0x5aa8ff, .95) };
    const GEO = { ring: new TH.TorusGeometry(.42, .03, 8, 44), small: new TH.TorusGeometry(.2, .025, 6, 32), dot: new TH.CylinderGeometry(.13, .13, .012, 24), x: new TH.BoxGeometry(.32, .012, .055) };
    GEO.ring.rotateX(Math.PI / 2); GEO.small.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .02) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- balls and grooves ---------- */
    let pcs = {};                  // point → { g, k }
    const G = [[], []];            // grooves: 0 far, 1 near
    function mk(k, i, scale = 1) {
      const g = U.piece(k, scale), r = g.userData.r;
      const sh = T3.contact(r * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      if (i != null) { const [x, z] = xz(i); g.position.set(x, U.rest, z); }
      board.add(g); return g;
    }
    function lift(g, h, base, surf) {
      const b = base ?? U.rest, s0 = surf ?? (U.top + .002);
      g.position.y = b + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = s0 - g.position.y; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); }
    }
    const hOf = g => g.userData.h0 || 0;
    const _ax = new TH.Vector3(), _q = new TH.Quaternion();
    function roll(g, dx, dz) { if (g.userData.noRoll) return; const d = Math.hypot(dx, dz); if (d < 1e-5) return; _ax.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_ax, d / g.userData.r); g.userData.ball.quaternion.premultiply(_q); }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function bump(g) { const r = g.userData.r; anim(150, k => { g.userData.ball.scale.setScalar(r * (1 + Math.sin(k * Math.PI) * .04)); }, () => g.userData.ball.scale.setScalar(r)); }
    const slot = (side, i) => { const [x, z] = U.groove.at(side, i, GG.pcs); return [x, U.groove.y(GS), z]; };
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; G.forEach(L => { L.forEach(drop); L.length = 0; });
      let n = 0;
      const order = []; for (let i = 0; i < NPg; i++) if (pos.at(i)) order.push(i);
      order.sort((a, b) => scr(b)[1] - scr(a)[1]);   // the near rows first
      for (const i of order) {
        const k = pos.at(i), g = mk(k, i); pcs[i] = { g, k };
        g.visible = false; const d = 60 + (n++) * 18; kick(200);
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.3), () => { lift(g, 0); bump(g); SND.put(1.1); }); }, d);
      }
      return 60 + n * 18 + 300;
    }
    function rebuild() {   // balls exactly as the position says (after 待った), without the drop-in
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; G.forEach(L => { L.forEach(drop); L.length = 0; });
      for (let i = 0; i < NPg; i++) { const k = pos.at(i); if (k) pcs[i] = { g: mk(k, i), k }; }
      // the grooves: the balls each side has taken, next to the capturer
      for (const side of [0, 1]) {
        const capturer = side ? bottomCol : 3 - bottomCol, lost = 3 - capturer, n = Math.max(0, GG.pcs - pos.count(lost));
        for (let j = 0; j < n; j++) { const g = mk(lost, null, GS), [x, y, z] = slot(side, j); g.position.set(x, y, z); lift(g, 0, y, y - g.userData.r + .002); G[side].push(g); }
      }
      kick(300);
    }
    // one step: the ball rolls along the line; then its captures pop out one after the other and hop into the groove
    function step3(stp, done) {
      const o = pcs[stp.from]; if (!o) { done && done(); return 0; }
      delete pcs[stp.from]; pcs[stp.to] = o;
      const g = o.g, side = o.k === bottomCol ? 1 : 0, [x0, z0] = xz(stp.from), [x1, z1] = xz(stp.to), dur = stp.cap.length ? 300 : 280;
      const vict = stp.cap.map(c => { const v = pcs[c]; delete pcs[c]; return v ? v.g : null; }).filter(Boolean);
      const slots = vict.map(v => { G[side].push(v); return G[side].length - 1; });
      const h0 = hOf(g); let px = x0, pz = z0; SND.roll();
      anim(dur, k => {
        const e = io(k), x = x0 + (x1 - x0) * e, z = z0 + (z1 - z0) * e;
        roll(g, x - px, z - pz); px = x; pz = z; g.position.x = x; g.position.z = z;
        lift(g, h0 * (1 - Math.min(1, k * 3)) + Math.sin(k * Math.PI) * .035);
      }, () => { lift(g, 0); bump(g); SND.put(); });
      vict.forEach((vg, k) => later(() => {
        const sx = vg.position.x, sy = vg.position.y, sz = vg.position.z, [tx, ty, tz] = slot(side, slots[k]), r0 = vg.userData.r, r1 = F3.R * GS, H = .9 + Math.min(1.2, Math.abs(tz - sz) * .12);
        let qx = sx, qz = sz; if (k < 4) SND.take();
        anim(520 + Math.min(240, Math.hypot(tx - sx, tz - sz) * 28), q => {
          const e = io(q), x = sx + (tx - sx) * e, z = sz + (tz - sz) * e, y = sy + (ty - sy) * e + Math.sin(q * Math.PI) * H;
          roll(vg, (x - qx) * .5, (z - qz) * .5); qx = x; qz = z; vg.position.set(x, y, z);
          const r = r0 + (r1 - r0) * e; vg.userData.ball.scale.setScalar(r); vg.userData.r = r;
          if (vg.userData.sh) { vg.userData.sh.material.opacity = .5 * Math.max(0, 1 - Math.sin(q * Math.PI) * 1.2); vg.userData.sh.position.y = (U.top + .002 + (ty - r - U.top) * e) - y; }
        }, () => { vg.userData.r = r1; lift(vg, 0, ty, ty - r1 + .002); bump(vg); SND.put(1.6); });
      }, dur - 60 + k * 55));
      const total = dur + (vict.length ? 520 + 240 + vict.length * 55 : 0);
      if (done) later(done, dur + 40);
      return total;
    }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(null, moves); pos = r.pos; hashes = r.hashes; }
    function status() { return E.judge(pos, hashes); }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.turn === c && !over ? 'on' : ''}"><i class="dk" style="${(GG.id === 'alquerque' ? DKA : DK)[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? pos.count(c) : 22}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'fntoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }
    let mustMarks = [];
    function showMarks() {
      clear(hl); hintMv = null; hintJ++; mustMarks = [];
      if (moves.length) {
        const m = moves[moves.length - 1], before = E.replay(null, moves.slice(0, -1)).pos, p = E.path(before, m);
        mark(hl, GEO.small, MAT.lastF, p[0], .01); mark(hl, GEO.ring, MAT.last, p[p.length - 1], .01);
        for (let j = 1; j < p.length - 1; j++) mark(hl, GEO.dot, MAT.lastF, p[j], .01);
        E.capsOf(before, m).flat().forEach(i => [1, -1].forEach(sg => { const b = mark(hl, GEO.x, MAT.took, i, .01); b.rotation.y = sg * Math.PI / 4; }));
      }
      showMust();
    }
    function showMust() {   // compulsory capture: a ring round every ball that can (must) capture, on a human's turn
      mustMarks.forEach(m => hl.remove(m)); mustMarks = [];
      if (over || !pos || sel || !(pvp || pos.turn === human) || thinking || busy) return;
      if (!pos.hasCaps()) return;
      new Set(pos.capSteps(null).map(x => x.from)).forEach(f => { const r = mark(hl, GEO.ring, MAT.must, f, .03); mustMarks.push(r); pulse(r, 2); });
    }

    /* ---------- selection: a ball, its destinations; the approach / withdrawal choice; going on capturing ---------- */
    const selCur = () => sel ? (sel.st ? sel.st.cur : sel.from) : -1;
    function drawSel() {
      clear(mv); if (!sel) return;
      mark(mv, GEO.ring, MAT.sel, selCur(), .03);
      if (sel.st) for (const v of sel.st.visited) if (v !== selCur()) mark(mv, GEO.dot, MAT.trail, v, .01);
      if (sel.choose) {
        mark(mv, GEO.dot, MAT.dest, sel.choose[0].to, .02);
        for (const x of sel.choose) for (const v of x.cap) mark(mv, GEO.ring, x.kind === 'A' ? MAT.ka : MAT.kw, v, .04);
        return;
      }
      const L = sel.st ? pos.capSteps(sel.st) : pos.firstSteps().filter(x => x.from === sel.from), seen = new Set();
      for (const x of L) if (!seen.has(x.to)) { seen.add(x.to); mark(mv, GEO.dot, x.kind ? MAT.cap : MAT.dest, x.to, .02); }
    }
    function liftSel(on) {
      const p = pcs[selCur()]; if (!p) return; const g = p.g, h0 = hOf(g), h1 = on ? .22 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
    function select(i) { deselect(); sel = { from: i, st: null, steps: [], choose: null }; showMust(); drawSel(); liftSel(true); SND.lift(); }
    function deselect() { if (sel && !sel.st) liftSel(false); clear(mv); sel = null; showMust(); }
    const stepsName = (from, steps) => E.pname(from) + steps.map(x => '-' + E.pname(x.to) + x.kind).join('');
    function canon(m) { const Lm = pos.moves(); if (Lm.includes(m)) return m; for (const x of Lm) if (E.same(pos, x, m)) return x; return m; }
    function doStep(stp) {
      if (!stp.kind) { const m = E.pname(stp.from) + '-' + E.pname(stp.to); sel = null; clear(mv); commit(m, false); return; }   // paika
      sel.choose = null; busy = true; clear(mv);
      step3(stp, () => {
        busy = false;
        sel.st = E.Pos.after(pos, sel.st, stp); sel.steps.push(stp);
        if (!pos.capSteps(sel.st).length) { finishChain(); return; }
        drawSel(); toast(X.more);
      });
    }
    function finishChain() {
      if (!sel || !sel.st) return;
      const m = canon(stepsName(sel.from, sel.steps)); sel = null; clear(mv); commit(m, true);
    }

    /* ---------- moves ---------- */
    function play(m, pre, done) {
      const S = pos.steps(m);
      moves.push(m); refresh(); ply++; onTurn();
      if (pre || !S) { showMarks(); hud(''); if (!S) rebuild(); later(done, pre ? 120 : 200); return; }
      // the steps one after the other (a capture chain: each step waits for the previous one)
      let k = 0; const caps = S.some(s => s.cap.length);
      if (caps && S.length > 1) hud(X.chain);
      const nx = () => { if (stopped) return; if (k >= S.length) { showMarks(); later(done, caps ? 380 : 60); return; } const s = S[k++]; step3(s, () => later(nx, s.cap.length ? 160 : 0)); };
      nx();
    }
    function commit(m, pre) { busy = true; play(m, pre, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = status();
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
      if (!draw) {   // the loser's remaining balls darken a little
        Object.values(pcs).forEach(p => { if (p.k !== st.winner) p.g.userData.ball.traverse(b => { if (b.isMesh) { b.material = b.material.clone(); b.material.color.multiplyScalar(.6); } }); });
        kick(300);
      }
      later(() => ctx.onEnd(pvp ? { win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt } : { win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule: GG.rule }); return w; }
    function aiMove() {
      thinking = true; hud(L.think); showMust();
      if (!worker) worker = newWorker();
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null) { try { m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = null; } }   // the worker failed: a small search on the page (JS)
        later(() => {
          if (id !== jid || over) return;
          thinking = false;
          if (m == null || !pos.steps(m)) { const Lm = pos.moves(); if (!Lm.length) { next(); return; } m = Lm[0]; }
          commit(m, false);
        }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule: GG.rule });
    }

    /* ---------- input ---------- */
    function pointOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const hc = (NCg - 1) / 2, dc = Math.round(p.x + hc), dr = Math.round(p.z + 2);
      if (dc < 0 || dc > NCg - 1 || dr < 0 || dr > 4 || Math.hypot(p.x + hc - dc, p.z + 2 - dr) > .5) return -1;
      const c = flip ? NCg - 1 - dc : dc, r = flip ? dr : 4 - dr;
      return r * 9 + c;
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.turn !== mover() || T3.wasDrag()) return;
      const i = pointOf(e), me = pos.turn;
      if (sel && sel.choose) {
        const pick = sel.choose.find(x => x.cap.includes(i));
        if (pick) { doStep(pick); return; }
        if (!sel.st && i >= 0 && pos.at(i) === me && i !== sel.from) { select(i); return; }
        toast(X.choose); return;
      }
      if (sel && sel.st) {   // going on capturing (optional): the next landing point, anything else ends the turn
        const opts = i < 0 ? [] : pos.capSteps(sel.st).filter(x => x.to === i);
        if (!opts.length) { finishChain(); return; }
        if (opts.length === 1) doStep(opts[0]); else { sel.choose = opts; drawSel(); toast(X.choose); }
        return;
      }
      if (i < 0) { deselect(); return; }
      if (pos.at(i) === me) {
        if (sel && sel.from === i) { deselect(); return; }
        if (!pos.firstSteps().some(x => x.from === i)) { const mj = pos.hasCaps(); toast(mj ? X.must : X.stuck); if (mj) mustMarks.forEach(r => pulse(r, 2)); return; }
        select(i); return;
      }
      if (!sel) { if (pos.at(i)) toast(X.own); else if (pos.hasCaps()) { toast(X.must); mustMarks.forEach(r => pulse(r, 1)); } return; }
      const opts = pos.firstSteps().filter(x => x.from === sel.from && x.to === i);
      if (!opts.length) { if (pos.at(i)) { deselect(); return; } toast(pos.hasCaps() ? X.must : X.move); return; }
      if (opts.length === 1) doStep(opts[0]); else { sel.choose = opts; drawSel(); toast(X.choose); }
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule(GG.rule); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); },
      state: () => ({ hint: hintMv, moves: moves.slice(), turn: pos && pos.turn, human, pvp, over, busy, thinking, sel: sel ? { from: sel.from, cur: selCur(), choose: !!sel.choose } : null, w: pos && pos.count(1), b: pos && pos.count(2), pieces: Object.keys(pcs).length, grooves: G.map(x => x.length) }),
      legal: () => pos ? pos.moves() : [],
    };
    window.Atlas3D[GG.id]._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!pos && !over && !busy && !thinking && !(sel && sel.st) && (pvp || pos.turn === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (1 White, 2 Black) loses
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
        busy = false; showMarks(); next();
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
            const m = r.error ? null : r.move; if (m == null || !pos.steps(m)) return res(false);
            hintMv = m;
            const p = E.path(pos, m), rs = p.map((s, k) => mark(hl, k ? GEO.dot : GEO.ring, MAT.hint, s, .05));
            rs.forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: GG.rule });
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
        if (window.Atlas3D[GG.id]._dbg === dbg) delete window.Atlas3D[GG.id]._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {
    ja: { kyu: '{n}級', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入門：ときどき駒をただで渡してしまう', '初級〜中級：数手先まで読む', '上級：取り合いを深く読む', '有段：深読みで取り返しまで読み切る'] },
    en: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Beginner: sometimes gives pieces away', 'Novice to intermediate: reads a few moves ahead', 'Advanced: reads capture exchanges deeply', 'Dan: deep reading, sees the recaptures through'] },
    zh: { kyu: '{n}级', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入门：偶尔会白白送子', '初级～中级：能看几步', '高级：深入计算吃子交换', '段位：深度计算，连反吃都算到底'] },
    ko: { kyu: '{n}급', dan: ['초단', '2단', '3단', '4단', '5단'], lvd: ['입문: 가끔 말을 공짜로 내준다', '초급~중급: 몇 수 앞까지 읽는다', '상급: 잡고 잡히는 교환을 깊이 읽는다', '유단자: 깊이 읽어 되잡기까지 끝까지 본다'] },
    es: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Principiante: a veces regala piezas', 'Novato a intermedio: calcula unas pocas jugadas', 'Avanzado: calcula a fondo los intercambios de capturas', 'Dan: cálculo profundo, ve las recapturas hasta el final'] },
    fr: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Débutant : donne parfois des pions', 'Novice à intermédiaire : calcule quelques coups à l\'avance', 'Avancé : calcule loin les échanges de prises', 'Dan : calcul profond, voit les reprises jusqu\'au bout'] },
    pt: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Iniciante: às vezes entrega peças de graça', 'Novato a intermediário: calcula alguns lances à frente', 'Avançado: calcula a fundo as trocas de capturas', 'Dan: cálculo profundo, enxerga as recapturas até o fim'] },
    de: { kyu: '{n} Kyu', dan: ['1 Dan', '2 Dan', '3 Dan', '4 Dan', '5 Dan'], lvd: ['Einsteiger: verschenkt manchmal Steine', 'Anfänger bis Mittelstufe: rechnet ein paar Züge voraus', 'Fortgeschritten: rechnet Schlagabtausche tief durch', 'Dan: rechnet tief, sieht die Rückschläge bis zum Ende'] },
    hi: { kyu: '{n} क्यू', dan: ['1 डैन', '2 डैन', '3 डैन', '4 डैन', '5 डैन'], lvd: ['शुरुआती: कभी-कभी मोहरे मुफ़्त में दे देता है', 'नौसिखिया से मध्यम: कुछ चालें आगे तक सोचता है', 'उन्नत: पकड़ने की अदला-बदली को गहराई से पढ़ता है', 'डैन: गहराई से पढ़कर जवाबी पकड़ तक पूरा देख लेता है'] },
    ar: { kyu: '{n} كيو', dan: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'], lvd: ['مبتدئ: يفرّط أحيانًا في القطع دون مقابل', 'مبتدئ إلى متوسط: يحسب بضع نقلات مسبقًا', 'متقدم: يحسب تبادلات الأسر بعمق', 'دان: حساب عميق يرى الأسر المضاد حتى النهاية'] },
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];   // fanorona RT_LV (rated games)
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
  window.Atlas3D.fanorona = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start: ctx => start(ctx, GAMES.fanorona) };
  window.Atlas3D.alquerque = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start: ctx => start(ctx, GAMES.alquerque) };   // table: start() plays on the chabudai itself
})();
