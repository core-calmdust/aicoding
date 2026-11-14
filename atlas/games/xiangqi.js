/* =====================================================================
   Xiangqi on the portal.
   · The board card (levels, sides, modes): level names = the game's 15 kyu … 5 dan,
     ratings = the game's RT_LV (xiangqi/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself, with the
     full game's rules and AI — ../xiangqi/engine.js on the page (legal moves, mate,
     stalemate, repetition rules) and the same engine as a Worker (WebAssembly search,
     levels 1..20), exactly as xiangqi/app.js asks it ({ type:'think', moves, level }).
     Board and pieces: Table3D.MODELS.xiangqi (atlas/table3d.js: userData.pt / piece).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../xiangqi/', VER = '?v=20261114w-zf1';   // same file / version as xiangqi/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.XiangqiEngine) return Promise.resolve(window.XiangqiEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.XiangqiEngine ? res(window.XiangqiEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { check: '王手！', mate: '詰み', stale: '困斃（指す手なし）', pcheck: '長将（王手の連続）で負け', pchase: '長捉（追い続け）で負け', rep: '同一局面3回', sixty: '60手ルール', material: '攻め駒なし' },
    en: { check: 'Check!', mate: 'Checkmate', stale: 'No legal move (stalemate loses)', pcheck: 'Perpetual check loses', pchase: 'Perpetual chase loses', rep: 'Threefold repetition', sixty: '60-move rule', material: 'No attacking pieces' },
    zh: { check: '将军！', mate: '将死', stale: '困毙', pcheck: '长将判负', pchase: '长捉判负', rep: '三次重复', sixty: '自然限着', material: '双方无进攻子力' },
    ko: { check: '장군!', mate: '외통', stale: '둘 수가 없음(패배)', pcheck: '연속 장군으로 패배', pchase: '연속 추격으로 패배', rep: '3회 동형', sixty: '60수 규칙', material: '공격 기물 없음' },
    es: { check: '¡Jaque!', mate: 'Jaque mate', stale: 'Sin jugadas (el ahogado pierde)', pcheck: 'El jaque perpetuo pierde', pchase: 'La persecución perpetua pierde', rep: 'Triple repetición', sixty: 'Regla de 60 jugadas', material: 'Sin piezas de ataque' },
    fr: { check: 'Échec !', mate: 'Échec et mat', stale: 'Aucun coup (le pat perd)', pcheck: 'L’échec perpétuel perd', pchase: 'La chasse perpétuelle perd', rep: 'Triple répétition', sixty: 'Règle des 60 coups', material: 'Plus de pièces d’attaque' },
    pt: { check: 'Xeque!', mate: 'Xeque-mate', stale: 'Sem lances (afogamento perde)', pcheck: 'Xeque perpétuo perde', pchase: 'Perseguição perpétua perde', rep: 'Tripla repetição', sixty: 'Regra dos 60 lances', material: 'Sem peças de ataque' },
    de: { check: 'Schach!', mate: 'Schachmatt', stale: 'Kein Zug (Patt verliert)', pcheck: 'Dauerschach verliert', pchase: 'Dauerjagd verliert', rep: 'Dreifache Wiederholung', sixty: '60-Züge-Regel', material: 'Keine Angriffssteine' },
    hi: { check: 'शह!', mate: 'शह-मात', stale: 'कोई चाल नहीं (हार)', pcheck: 'लगातार शह से हार', pchase: 'लगातार पीछा करने से हार', rep: 'तीन बार दोहराव', sixty: '60 चाल नियम', material: 'हमलावर मोहरे नहीं' },
    ar: { check: 'كش!', mate: 'كش مات', stale: 'لا نقلات (خسارة)', pcheck: 'تكرار الكش يخسر', pchase: 'المطاردة المستمرة تخسر', rep: 'تكرار ثلاثي', sixty: 'قاعدة الستين نقلة', material: 'لا قطع هجومية' },
    ru: { check: 'Шах!', mate: 'Мат', stale: 'Нет ходов (пат — поражение)', pcheck: 'Вечный шах — поражение', pchase: 'Вечное преследование — поражение', rep: 'Троекратное повторение', sixty: 'Правило 60 ходов', material: 'Нет атакующих фигур' },
    'zh-TW': { check: '將軍！', mate: '將死', stale: '無棋可走（困斃判負）', pcheck: '長將判負', pchase: '長捉判負', rep: '三次重複局面', sixty: '60回合規則', material: '雙方無進攻子力' },
    id: { check: 'Skak!', mate: 'Skakmat', stale: 'Tidak ada langkah sah (pat berarti kalah)', pcheck: 'Skak abadi berarti kalah', pchase: 'Kejar abadi berarti kalah', rep: 'Pengulangan tiga kali', sixty: 'Aturan 60 langkah', material: 'Tidak ada bidak penyerang' },
    tr: { check: 'Şah!', mate: 'Şah mat', stale: 'Yasal hamle yok (pat kaybettirir)', pcheck: 'Sürekli şah kaybettirir', pchase: 'Sürekli kovalama kaybettirir', rep: 'Üç kez tekrar', sixty: '60 hamle kuralı', material: 'Saldıran taş yok' },
  };
  // two players on one device (ctx.mode 'pvp'): the colours' names, whose turn, who won
  const PV = {
    ja: { n: ['赤', '黒'], turn: '{p}の番', win: '{p}の勝ち' }, en: { n: ['Red', 'Black'], turn: '{p} to move', win: '{p} wins' },
    zh: { n: ['红方', '黑方'], turn: '轮到{p}', win: '{p}胜' }, ko: { n: ['홍', '흑'], turn: '{p} 차례', win: '{p} 승리' },
    es: { n: ['Rojo', 'Negro'], turn: 'Juega {p}', win: 'Gana {p}' }, fr: { n: ['Rouge', 'Noir'], turn: 'Trait à {p}', win: 'Victoire de {p}' },
    pt: { n: ['Vermelho', 'Preto'], turn: 'Vez do {p}', win: 'Vitória do {p}' }, de: { n: ['Rot', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { n: ['लाल', 'काला'], turn: '{p} की बारी', win: '{p} की जीत' }, ar: { n: ['الأحمر', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}' }, ru: { n: ['Красные', 'Чёрные'], turn: 'Ход: {p}', win: '{p} побеждают' }, 'zh-TW': { n: ['紅方', '黑方'], turn: '輪到{p}', win: '{p}獲勝' }, id: { n: ['Merah', 'Hitam'], turn: 'Giliran {p}', win: '{p} menang' }, tr: { n: ['Kırmızı', 'Siyah'], turn: 'Sıra: {p}', win: '{p} kazandı' },
  };
  const VAL = [0, 0, 2, 2, 4, 9, 4.5, 1];
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  // a wooden "tok" when a disc is set down (respects the portal's sound switch)
  let AC = null;
  function tok(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(300 * v, t); o.frequency.exponentialRampToValueAtTime(130 * v, t + .06);
      lp.type = 'lowpass'; lp.frequency.value = 2000;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .1);
      o.connect(lp).connect(g).connect(AC.destination); o.start(t); o.stop(t + .11);
    } catch (e) {}
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.xiangqi(true); T3.show('xiangqi', board);
    const U = board.userData, Y = U.top, u = U.u;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.D + .8, y: Y + .2, pitch: 1.0 } : { w: U.W + .2, d: U.D + .5, y: Y + .2, pitch: 1.0 });   // the whole board, large, from the player's side
    const pvp = ctx.mode === 'pvp', PX = PV[ctx.lang] || PV.en;   // pvp: both colours are tapped in turn, Red at the bottom, no AI
    const PZ = ctx.pz || null;   // a puzzle / lesson position driven by atlas/puzzles.js · lessons3d.js (no AI: ctx.pz.moved decides; me 1 Red / 2 Black)
    let human = PZ ? (PZ.me === 2 ? 1 : 0) : pvp ? 0 : ctx.side === 2 ? 1 : 0, flip = human === 1;   // engine colours: 0 = Red, 1 = Black; the player's side is at the bottom
    let startSpec = PZ ? PZ.spec || null : null;   // a puzzle / lesson start position (FEN; null = the usual start)
    const mover = () => pvp && pos ? pos.side : human;
    // point ↔ screen: i = file left → right, j = rank far → near
    const scr = sq => { const r = Math.floor(sq / 9), c = sq % 9; return flip ? [8 - c, 9 - r] : [c, r]; };
    const xz = sq => U.pt(...scr(sq));
    const sqAt = (i, j) => flip ? (9 - j) * 9 + (8 - i) : j * 9 + i;

    let E = null, pos = null, hashes = [], legal = [], moves = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = -1, worker = null, jid = 0;
    let ply = 0, hintW = null, hintJ = 0, hintMv = -1;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side === human, ply }); };   // HUD pills: Red (left) 0, Black 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks on the board (last move, check, selection, destinations, hint) ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0x2f8cff, .85), lastF: basic(0x2f8cff, .55), check: basic(0xff2a2a, .6), sel: basic(0x2fd17a, .9), dot: basic(0x1f9e5a, .85), cap: basic(0xe0402a, .9), hint: basic(0xff7a1a, .95) };
    const GEO = { ring: new TH.TorusGeometry(u * .47, u * .035, 8, 44), small: new TH.TorusGeometry(u * .16, u * .03, 8, 28), dot: new TH.CylinderGeometry(u * .13, u * .13, .012, 24), glow: new TH.CircleGeometry(u * .55, 36) };
    GEO.ring.rotateX(Math.PI / 2); GEO.small.rotateX(Math.PI / 2); GEO.glow.rotateX(-Math.PI / 2);
    function mark(group, geo, mat, sq, y = .01) { if (T3.kick) T3.kick(150); const m = new TH.Mesh(geo, mat); const [x, z] = xz(sq); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); if (T3.kick) T3.kick(150); };

    /* ---------- pieces ---------- */
    let pcs = {};   // point → piece group
    function mk(code, sq) {
      const g = U.piece(code); const sh = T3.contact(u * .44, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      const [x, z] = xz(sq); g.position.set(x, Y, z); if (flip) g.children[1].rotation.z = Math.PI; board.add(g); return g;
    }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .45; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.2); } }
    const hOf = g => g.userData.h0 || 0;
    function land(g) { anim(170, k => { const s = 1 + Math.sin(k * Math.PI) * .06; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      let i = 0;
      for (let sq = 0; sq < 90; sq++) {
        const p = pos.at(sq); if (!p) continue;
        const g = mk(p, sq); pcs[sq] = g;
        g.visible = false; const d = 60 + (i++) * 16; if (T3.kick) T3.kick(200);
        later(() => { g.visible = true; anim(260, k => lift(g, (1 - k) * (1 - k) * 1.4), () => { lift(g, 0); land(g); }); }, d);
      }
      return 60 + i * 16 + 300;
    }
    // lift — glide — set down (horses and elephants hop a little higher)
    function glide(g, to, hop, done) {
      const x0 = g.position.x, z0 = g.position.z, [x1, z1] = xz(to), d = Math.hypot(x1 - x0, z1 - z0);
      const h0 = hOf(g), H = hop ? .6 : .32, A = .2, B = .8, dur = 300 + d * 50;
      anim(dur, k => {
        let h, e;
        if (k < A) { e = 0; h = h0 + (H - h0) * io(k / A); }
        else if (k < B) { e = io((k - A) / (B - A)); h = H + (hop ? Math.sin(e * Math.PI) * .5 : 0); }
        else { e = 1; const q = (k - B) / (1 - B); h = H * (1 - q * q); }
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, h);
      }, () => { lift(g, 0); tok(hop ? .9 : 1); land(g); if (done) done(); });
      return dur;
    }
    // a taken piece flips up off the board and fades away; keep: the mated general tips over and stays
    function knockOff(g, dx, dz, keep, done) {
      const mats = [];
      if (!keep) g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, x0 = g.position.x, z0 = g.position.z;
      const axis = new TH.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new TH.Quaternion();
      if (g.userData.sh) g.userData.sh.visible = false;
      anim(keep ? 700 : 560, k => {
        const a = (keep ? 1.2 : 2.6) * Math.min(1, keep ? k * k : k);
        qt.setFromAxisAngle(axis, a); g.quaternion.copy(qt).multiply(q0);
        const sl = keep ? .1 * k : .7 * k; g.position.x = x0 + ux * sl; g.position.z = z0 + uz * sl;
        g.position.y = Y + (keep ? Math.sin(a) * u * .3 : Math.sin(k * Math.PI) * .9);
        if (!keep) { const f = k < .45 ? 1 : 1 - (k - .45) / .55; mats.forEach(m => { m.opacity = Math.max(0, f); }); }
      }, () => { if (!keep) { board.remove(g); mats.forEach(m => m.dispose()); } else tok(.7); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(startSpec, moves); pos = r.pos; hashes = r.hashes; }
    function status() { const st = E.judge(pos, hashes, startSpec, moves); if (!st.over) st.legal = pos.moves(); return st; }
    function material(c) { let s = 0; for (let sq = 0; sq < 90; sq++) { const p = pos.at(sq); if (p && (p >> 3) === c) s += VAL[p & 7]; } return s; }
    function hud(msg) {
      const d = pos ? Math.round(material(0) - material(1)) : 0;
      const side = c => { const adv = c ? -d : d; return `<span class="hs ${pos && pos.side === c && !over ? 'on' : ''}"><i class="dk ${c ? 'b' : 'w'}" style="${c ? 'background:#211b17' : 'background:#c8261d'}"></i>${pvp ? PX.n[c] : c === human ? L.you : L.ai}<b>${adv > 0 ? '+' + adv : ''}</b></span>`; };
      ctx.hud(`${side(0)}<span class="hm">${msg || ''}</span>${side(1)}`);
    }
    function showMarks() {
      clear(hl); hintMv = -1; hintJ++;
      if (moves.length) { const m = moves[moves.length - 1]; mark(hl, GEO.small, MAT.lastF, E.mFrom(m), .01); mark(hl, GEO.ring, MAT.last, E.mTo(m), .012); }
      if (pos.inCheck() && pos.k[pos.side] >= 0) { const k = mark(hl, GEO.glow, MAT.check, pos.k[pos.side], .006); anim(420, e => { const s = 1 + Math.sin(e * Math.PI) * .15; k.scale.set(s, 1, s); }); }
    }

    /* ---------- selection ---------- */
    function select(sq) {
      deselect();
      sel = sq; const g = pcs[sq];
      mark(mv, GEO.ring, MAT.sel, sq, .014);
      legal.forEach(m => { if (E.mFrom(m) !== sq) return; const to = E.mTo(m); if (pos.at(to)) mark(mv, GEO.ring, MAT.cap, to, U.piece ? .26 : .03); else mark(mv, GEO.dot, MAT.dot, to, .01); });
      if (g) { const h0 = hOf(g); anim(130, k => lift(g, h0 + (.25 - h0) * io(k))); }
      tok(1.4);
    }
    function deselect() {
      clear(mv);
      if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); }
      sel = -1; if (T3.kick) T3.kick(150);
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      const from = E.mFrom(m), to = E.mTo(m);
      clear(mv); sel = -1;
      const g = pcs[from]; delete pcs[from];
      const victim = pcs[to] || null; if (victim) delete pcs[to];
      pcs[to] = g;
      const hop = g && (g.userData.type === 'H' || g.userData.type === 'E');
      moves.push(m); refresh(); ply++; onTurn(); showMarks(); hud('');
      let pending = 1; const fin = () => { if (--pending === 0 && done) done(); };
      const [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(to);
      const dur = glide(g, to, hop, fin);
      if (victim) { pending++; later(() => knockOff(victim, x1 - x0, z1 - z0, false, fin), dur * .6); }
      if (pos.inCheck()) later(() => hud(X.check), dur);
    }
    function commit(m) {
      if (PZ) { const before = pos.clone(); pzOn = false; busy = true; play(m, () => { busy = false; pzAfter(before); }); return; }   // (a puzzle / lesson: the caller judges the move)
      busy = true; play(m, () => { busy = false; next(); });
    }
    function next() {
      if (stopped) return;
      const st = status(); legal = st.legal || [];
      if (st.over) return end(st);
      onTurn();
      if (pvp || pos.side === human) {
        const tn = pvp ? PX.turn.replace('{p}', PX.n[pos.side]) : L.turn;
        hud(pos.inCheck() ? X.check + ' ' + tn : tn);
        return;
      }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const wi = st.winner ? st.winner - 1 : -1;   // 0 Red, 1 Black
      const win = !pvp && !st.draw && wi === human, wt = pvp && !st.draw ? PX.win.replace('{p}', PX.n[wi]) : '';
      hud(st.draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      if (st.why === 'mate' || st.why === 'stale') {   // the beaten general tips over
        const ks = pos.k[pos.side], k = pcs[ks], ok = pos.k[pos.side ^ 1];
        if (k && ok >= 0) { const [x, z] = xz(ks), [ox, oz] = xz(ok); later(() => knockOff(k, x - ox || .3, z - oz || .3, true), 380); }
      }
      later(() => ctx.onEnd(pvp ? { win: false, draw: !!st.draw, level: ctx.level, score: X[st.why] || '', pvp: true, winnerText: wt } : { win, draw: !!st.draw, level: ctx.level, score: X[st.why] || '' }), st.why === 'mate' ? 900 : 300);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(startSpec, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }   // the worker failed: a small search on the page (JS)
        later(() => {
          if (id !== jid || over) return;
          thinking = false;
          if (m == null || m < 0 || !legal.includes(m)) { next(); return; }
          busy = true; play(m, () => { busy = false; next(); });
        }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: startSpec, moves: mvs, level: ctx.level });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const i = Math.round(p.x / u + 4), j = Math.round(p.z / u + 4.5);
      if (i < 0 || i > 8 || j < 0 || j > 9) return -1;
      const [cx, cz] = U.pt(i, j); if (Math.hypot(p.x - cx, p.z - cz) > u * .52) return -1;
      return sqAt(i, j);
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side !== mover() || T3.wasDrag() || (PZ && !pzOn)) return;
      const q = cellOf(e); if (q < 0) { deselect(); return; }
      if (sel >= 0) { const m = legal.find(x => E.mFrom(x) === sel && E.mTo(x) === q); if (m !== undefined) { commit(m); return; } }
      const p = pos.at(q);
      if (q === sel) { deselect(); return; }
      if (p && (p >> 3) === mover() && legal.some(m => E.mFrom(m) === q)) { select(q); return; }
      deselect();
    }
    ctx.el.addEventListener('click', onClick);
    // the board view's 駒 row (Table3D.PIECES) during a game: the pieces on the board are made again in the new set at once
    const onPcs = e => { if (!stopped && pos && e.detail && e.detail.id === 'xiangqi') rebuild(); };
    addEventListener('atlas-pieces', onPcs);

    /* ---------- puzzle / lesson mode (ctx.pz, 2026-11-14, as atlas/games/checkers.js): a position from the puzzles / lessons, no AI; the
       caller judges each move (ctx.pz.moved(m, info)) and plays the replies (api.pz.play). The solver and the evaluation come from the
       game's worker, asked as xiangqi/app.js asks them ({ type: 'puzzle' | 'analyze' | 'think', start, moves }). Marks: points (glows,
       gold rings) and arrows — the 3D board has no coordinates, so the guide names moves by their marks. ---------- */
    let pzOn = false, pzW = null, pzJ = 0;
    const pzMk = new TH.Group(); board.add(pzMk);
    const PZC = { ok: 0x2fd17a, ng: 0xff3b30, hl: 0xffb21a, ring: 0xffc928 }, pzMat = {};
    const pm = (c, op) => pzMat[c + op] || (pzMat[c + op] = basic(PZC[c] != null ? PZC[c] : PZC.hl, op));
    const pzGeo = { disc: new TH.CircleGeometry(u * .46, 32) }; pzGeo.disc.rotateX(-Math.PI / 2);
    function pzState() { const st = E.judge(pos, hashes, startSpec, moves); return { over: !!st.over, winner: st.winner || 0, draw: !!st.draw, why: st.why || '', turn: pos.side + 1, check: pos.inCheck(), n: moves.length }; }
    function pzAfter(before) { const m = moves[moves.length - 1]; showMarks(); if (PZ.moved) PZ.moved(m, Object.assign({ before }, pzState())); }
    function pzWait() { busy = false; legal = pos ? pos.moves() : []; pzOn = !PZ.lock; showMarks(); }
    function pzClear() { pzMk.children.slice().forEach(o => { if (o.userData.own) o.geometry.dispose(); pzMk.remove(o); }); if (T3.kick) T3.kick(150); }
    function pzLoad(spec, me, o) {
      PZ.spec = spec || null; PZ.me = me === 2 ? 2 : 1; PZ.lock = !!(o && o.lock);
      if (!E) return;   // (the engine is still loading: it starts from PZ)
      timers.forEach(clearTimeout); timers.length = 0; jid++; pzJ++; pzOn = false; clear(mv); clear(hl); pzClear(); sel = -1;
      const wasFlip = flip; startSpec = PZ.spec; human = PZ.me - 1; flip = human === 1;
      moves = []; over = false; busy = true; thinking = false; refresh(); legal = [];
      if (wasFlip !== flip) Object.values(pcs).forEach(g => board.remove(g));
      const wait = setup();
      later(() => { showMarks(); pzWait(); if (PZ.ready) PZ.ready(); }, wait + 200);
    }
    function pzArrow(from, to, c) {   // a flat arrow from a piece to its destination
      const mat = pm(c, .9), [ax, az] = xz(from), [bx, bz] = xz(to), dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (!len) return;
      const ang = Math.atan2(dx, dz), head = u * .42, st = u * .2, L = Math.max(.05, len - head - st - u * .1);
      const g = new TH.BoxGeometry(u * .17, .01, L), sh = new TH.Mesh(g, mat); sh.userData.own = true;
      sh.position.set(ax + Math.sin(ang) * (st + L / 2), Y + .06, az + Math.cos(ang) * (st + L / 2)); sh.rotation.y = ang; sh.renderOrder = 3; pzMk.add(sh);
      const tri = new TH.Shape(); tri.moveTo(-u * .26, 0); tri.lineTo(u * .26, 0); tri.lineTo(0, head); tri.lineTo(-u * .26, 0);
      const hg = new TH.ShapeGeometry(tri); hg.rotateX(-Math.PI / 2); hg.rotateY(Math.PI);
      const hm = new TH.Mesh(hg, mat); hm.userData.own = true; hm.position.set(ax + Math.sin(ang) * (st + L), Y + .065, az + Math.cos(ang) * (st + L)); hm.rotation.y = ang; hm.renderOrder = 3; pzMk.add(hm);
    }
    // marks: null clears · a move number = its arrow (gold) · a list of [point, 'ok'|'ng'|'hl'|'ring'] and { m: move, cls } / [{ m }, cls]
    function pzMark(list) {
      pzClear(); showMarks(); if (list == null || !pos) return;
      const L = typeof list === 'number' ? [{ m: list, cls: 'ring' }] : list;
      for (let e of L) {
        if (Array.isArray(e) && e[0] && typeof e[0] === 'object') e = Object.assign({}, e[0], { cls: e[1] });
        if (Array.isArray(e)) {
          const [q, c] = e; if (!(q >= 0 && q < 90)) continue;
          if (c === 'ring') { const r = new TH.Mesh(GEO.ring, pm('ring', .95)), [x, z] = xz(q); r.position.set(x, Y + .04, z); r.renderOrder = 3; pzMk.add(r); anim(1040, k => { const s = 1 + Math.sin(k * Math.PI * 4) * .12 * (1 - k); r.scale.set(s, 1, s); }); continue; }
          const t = new TH.Mesh(pzGeo.disc, pm(c, c === 'hl' ? .55 : .5)), [x, z] = xz(q); t.position.set(x, Y + .008, z); t.renderOrder = 2; pzMk.add(t); continue;
        }
        if (e && e.m != null && e.m >= 0) pzArrow(E.mFrom(e.m), E.mTo(e.m), e.cls === 'ng' ? 'ng' : e.cls === 'ok' ? 'ok' : 'ring');
      }
      if (T3.kick) T3.kick(400);
    }
    const pzReq = msg => new Promise(res => {
      if (!pzW) pzW = new Worker(BASE + 'engine.js' + VER);
      const id = ++pzJ; pzW.onmessage = e => { const r = e.data; if (r.id !== id || r.type !== 'result') return; res(stopped ? null : r); };
      pzW.onerror = () => { pzW = null; res(null); };
      pzW.postMessage(Object.assign({ start: startSpec, moves: moves.slice(), id }, msg));
    });
    const pzApi = {
      load: (spec, me, o) => pzLoad(spec, me, o),
      wait: pzWait,
      play: m => new Promise(res => { if (!pos || !pos.moves().includes(m)) return res(false); pzOn = false; busy = true; clear(mv); sel = -1; play(m, () => { busy = false; showMarks(); res(true); }); }),
      undo(n = 1) { timers.forEach(clearTimeout); timers.length = 0; deselect(); moves.splice(Math.max(0, moves.length - n)); refresh(); rebuild(); pzClear(); over = false; showMarks(); },
      moves: () => moves.slice(),
      state: () => pos ? pzState() : {},
      mark: pzMark,
      pos: () => pos ? pos.clone() : null,
      engine: () => E,
      // the engine's mate solver: [{ m, need }] for the side to move (need: own moves to mate, 0 = none); checks: a checks-only puzzle
      puzzle: (n, defend, checks, mvs) => pzReq(Object.assign({ type: 'puzzle', n, defend: !!defend, checks: !!checks }, mvs ? { moves: mvs } : {})).then(r => (r && r.list) || null),
      analyze: time => pzReq({ type: 'analyze', time: time || 500 }).then(r => (r && r.list) || []),
      think: level => pzReq({ type: 'think', level: level || 17 }).then(r => r && !r.error && r.move >= 0 ? r.move : null),
    };

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = -1; thinking = false; jid++;
      refresh(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; if (PZ) { pzLoad(PZ.spec, PZ.me, { lock: PZ.lock }); return; } if (!pvp) worker = new Worker(BASE + 'engine.js' + VER); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: sq => { const [x, z] = xz(sq); return T3.project(x, z, Y); },
      state: () => ({ hint: hintMv, moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel, check: !!(pos && pos.inCheck()), pieces: Object.keys(pcs).length }),
      legal: () => legal.slice(),
    };
    window.Atlas3D.xiangqi._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    let drawAsked = -99;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (0 Red, 1 Black) loses
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      if (why === 'draw') {   // 合意の引き分け（ポータルの操作バーの［引き分け］）
        hud(L.draw); return later(() => ctx.onEnd(pvp ? { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed'), pvp: true, winnerText: '' } : { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed') }), 200);
      }
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = PX.win.replace('{p}', PX.n[loser ^ 1]); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: PX.n[loser], r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    function rebuild() {   // pieces exactly as the position says, without the drop-in
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      for (let sq = 0; sq < 90; sq++) { const p = pos.at(sq); if (p) pcs[sq] = mk(p, sq); }
      board.children.filter(g => g.userData && g.userData.code && !Object.values(pcs).includes(g)).forEach(g => board.remove(g));   // a tipped general, a fading capture
      if (T3.kick) T3.kick(300);
    }
    const api = {
      human, pz: PZ ? pzApi : null,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 1 ? 1 : 0)),
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
          if (!hintW) hintW = new Worker(BASE + 'engine.js' + VER);
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || m < 0 || !legal.includes(m)) return res(false);
            hintMv = m;
            const a = mark(hl, GEO.ring, MAT.hint, E.mFrom(m), .03), b = mark(hl, GEO.ring, MAT.hint, E.mTo(m), .03);
            anim(560, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .16 * (1 - k); a.scale.set(s, s, s); b.scale.set(s, s, s); });
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: startSpec, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
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
          if (!hintW) hintW = new Worker(BASE + 'engine.js' + VER);
          hintW.onmessage = e => { const r = e.data; if (r.type !== 'result' || r.id !== j) return; res(!stopped && !over && moves.length === mvs.length && typeof r.v === 'number' && -r.v <= 0 ? 'yes' : 'no'); };   // r.v: the side to move (you) — the AI's view is -v
          hintW.onerror = () => { hintW = null; res('no'); };
          hintW.postMessage({ type: 'think', id: j, start: startSpec, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
        });
      },
      draw() { if (pos && !over) finish(-1, 'draw'); },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side : human, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout);
        ctx.el.removeEventListener('click', onClick); removeEventListener('atlas-pieces', onPcs);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null; if (pzW) pzW.terminate(); pzW = null;
        pzClear(); Object.values(pzMat).forEach(m => m.dispose()); pzGeo.disc.dispose();
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.xiangqi._dbg === dbg) delete window.Atlas3D.xiangqi._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {
    ja: { kyu: '{n}級', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入門：ときどき駒をただで渡す', '初級〜中級：数手先まで読む', '上級：取り合いと詰みを読み切る', '最上級：深い読み（強豪エンジンから学習した評価）'] },
    en: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Beginner: drops a piece now and then', 'Novice: reads a few moves ahead', 'Advanced: works out exchanges and mates', 'Expert: deep search (NNUE learned from a top engine)'] },
    zh: { kyu: '{n}级', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入门：偶尔会白丢棋子', '初级～中级：能看几步', '高级：算清兑子与杀棋', '专家：深度计算（向顶级引擎学习的评估）'] },
    ko: { kyu: '{n}급', dan: ['초단', '2단', '3단', '4단', '5단'], lvd: ['입문: 가끔 기물을 공짜로 내줌', '초급~중급: 몇 수 앞을 읽음', '상급: 교환과 외통을 읽음', '전문가: 깊은 탐색(최강 엔진에게서 학습한 평가)'] },
    es: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Inicial: a veces regala piezas', 'Principiante: calcula unas jugadas', 'Avanzado: resuelve cambios y mates', 'Experto: búsqueda profunda'] },
    fr: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Débutant : laisse parfois une pièce', 'Novice : calcule quelques coups', 'Avancé : calcule échanges et mats', 'Expert : recherche profonde'] },
    pt: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Iniciante: às vezes entrega peças', 'Novato: calcula alguns lances', 'Avançado: calcula trocas e mates', 'Especialista: busca profunda'] },
    de: { kyu: '{n}. Kyu', dan: ['1. Dan', '2. Dan', '3. Dan', '4. Dan', '5. Dan'], lvd: ['Einsteiger: stellt manchmal Steine ein', 'Anfänger: rechnet ein paar Züge', 'Fortgeschritten: rechnet Abtausch und Matt', 'Experte: tiefe Suche'] },
    hi: { kyu: '{n} क्यू', dan: ['1 दान', '2 दान', '3 दान', '4 दान', '5 दान'], lvd: ['शुरुआती: कभी-कभी मोहरा दे देता है', 'नौसिखिया: कुछ चालें आगे देखता है', 'उन्नत: अदला-बदली और मात गिनता है', 'विशेषज्ञ: गहरी खोज'] },
    ar: { kyu: '{n} كيو', dan: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'], lvd: ['مبتدئ: يخسر قطعة أحيانًا', 'مبتدئ: يحسب بضع نقلات', 'متقدم: يحسب التبادلات والكش مات', 'خبير: بحث عميق'] },
    ru: { kyu: '{n} кю', dan: ['1 дан', '2 дан', '3 дан', '4 дан', '5 дан'], lvd: ['Начальный: иногда зевает фигуры', 'Новичок: считает на несколько ходов', 'Продвинутый: просчитывает размены и маты', 'Эксперт: глубокий поиск (NNUE, обученный у сильного движка)'] },
    'zh-TW': { kyu: '{n}級', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入門：偶爾會送子', '初級：能看幾步', '高級：能算出兌子與殺法', '最高級：深入搜尋（向頂尖引擎學習的NNUE）'] },
    id: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Pemula: kadang memberikan bidak', 'Dasar: membaca beberapa langkah ke depan', 'Mahir: menghitung pertukaran dan skakmat', 'Ahli: pencarian mendalam (NNUE belajar dari mesin teratas)'] },
    tr: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Başlangıç: ara sıra taş kaptırır', 'Acemi: birkaç hamle ileriyi okur', 'İleri: değişimleri ve matları hesaplar', 'Uzman: derin arama (en iyi motordan öğrenen NNUE)'] },
  };
  const RATING = [0, 450, 535, 680, 795, 920, 1095, 1245, 1395, 1510, 1730, 1825, 1880, 1977, 2087, 2212, 2302, 2337, 2362, 2537, 2602];   // xiangqi RT_LV (rated games)
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
  function levelInfo(n, lang) {   // n = 1..20 (the game's level: 15 kyu … 5 dan)
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    const name = 'Lv.' + n;
    return { name, desc: L.lvd[n <= 4 ? 0 : n <= 10 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.xiangqi = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
