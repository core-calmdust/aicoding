/* =====================================================================
   Shogi on the 3D table (portal play, "ちゃぶ台で遊ぶ").
   Uses the full game's engine (../shogi/engine.js: rules, NNUE / WebAssembly search,
   same LEVELS table, same opening book and weights) — the AI is exactly as strong
   per level as in shogi/. Board & pieces: atlas/models/shogi.js.
   Registers window.AtlasShogiPlay.start(ctx) → { stop() }; atlas/games/shogi.js wires it in.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../shogi/', EV = '?v=20261021v2';   // the full game's engine version (shogi/index.html)
  // the full game's AI steps (shogi/index.html LEVELS), index = level - 1
  const LEVELS = [{ depth: 2, noise: 95, greedy: 1 },
    { depth: 2, noise: 60, greedy: 1 }, { depth: 3, noise: 80 }, { depth: 3, noise: 55 }, { depth: 3, noise: 35 },
    { nodes: 8000, linear: 1 }, { nodes: 15000, linear: 1 }, { nodes: 27000, linear: 1 }, { nodes: 48000, linear: 1 },
    { nodes: 5000 }, { nodes: 10000 }, { nodes: 18000 }, { nodes: 35000 }, { nodes: 67000 }, { nodes: 130000 }, { nodes: 250000 }, { nodes: 470000 },
    { nodes: 900000, time: 12000 }, { nodes: 1700000, time: 15000 }];
  const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  const SC = .8;                                  // the legged board is life-size: a little smaller on the chabudai
  const HANDS = [6, 5, 7, 4, 3, 2, 1];            // 飛 角 金 銀 桂 香 歩 (stand order)
  const BASET = [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6];   // promoted → original

  const STR = {
    ja: { mate: 'まで{n}手で詰み', resign: 'まで{n}手で投了', sen: '千日手', perp: '連続王手の千日手', decl: '入玉宣言', max: '512手で引き分け', yes: '成る', no: '成らない', check: '王手！', ply: '{n}手目', book: '定跡' },
    en: { mate: 'Checkmate in {n} moves', resign: 'Resigned at move {n}', sen: 'Repetition (sennichite)', perp: 'Perpetual check', decl: 'Entering-king declaration', max: 'Draw at move 512', yes: 'Promote', no: 'Keep', check: 'Check!', ply: 'Move {n}', book: 'Book' },
    zh: { mate: '第{n}手将死', resign: '第{n}手认输', sen: '千日手', perp: '连续将军的千日手', decl: '入玉宣言', max: '512手和棋', yes: '升变', no: '不升变', check: '将军！', ply: '第{n}手', book: '定式' },
    ko: { mate: '{n}수 만에 외통', resign: '{n}수 만에 기권', sen: '천일수', perp: '연속 장군 천일수', decl: '입옥 선언', max: '512수 무승부', yes: '승격', no: '승격 안 함', check: '장군!', ply: '{n}수째', book: '정석' },
    es: { mate: 'Jaque mate en {n} jugadas', resign: 'Abandono en la jugada {n}', sen: 'Repetición (sennichite)', perp: 'Jaque perpetuo', decl: 'Declaración de rey entrado', max: 'Tablas en la jugada 512', yes: 'Promocionar', no: 'No', check: '¡Jaque!', ply: 'Jugada {n}', book: 'Libro' },
    fr: { mate: 'Mat en {n} coups', resign: 'Abandon au coup {n}', sen: 'Répétition (sennichite)', perp: 'Échec perpétuel', decl: 'Déclaration du roi entré', max: 'Nulle au coup 512', yes: 'Promouvoir', no: 'Garder', check: 'Échec !', ply: 'Coup {n}', book: 'Théorie' },
    pt: { mate: 'Xeque-mate em {n} lances', resign: 'Desistência no lance {n}', sen: 'Repetição (sennichite)', perp: 'Xeque perpétuo', decl: 'Declaração de rei infiltrado', max: 'Empate no lance 512', yes: 'Promover', no: 'Manter', check: 'Xeque!', ply: 'Lance {n}', book: 'Livro' },
    de: { mate: 'Matt nach {n} Zügen', resign: 'Aufgabe nach Zug {n}', sen: 'Wiederholung (Sennichite)', perp: 'Dauerschach', decl: 'Eingedrungener König', max: 'Remis nach Zug 512', yes: 'Befördern', no: 'Nicht', check: 'Schach!', ply: 'Zug {n}', book: 'Buch' },
    hi: { mate: '{n} चालों में मात', resign: 'चाल {n} पर हार मानी', sen: 'दोहराव (सेन्निचिते)', perp: 'लगातार शह', decl: 'राजा प्रवेश घोषणा', max: 'चाल 512 पर ड्रॉ', yes: 'प्रमोट', no: 'नहीं', check: 'शह!', ply: 'चाल {n}', book: 'ओपनिंग' },
    ar: { mate: 'كش مات في {n} نقلة', resign: 'استسلام عند النقلة {n}', sen: 'تكرار (سينّيتشيتي)', perp: 'كش دائم', decl: 'إعلان دخول الملك', max: 'تعادل عند النقلة 512', yes: 'رقِّ', no: 'أبقِ', check: 'كش!', ply: 'النقلة {n}', book: 'افتتاح' },
  };

  /* ---------- the full game's engine, weights and book (loaded once, on the first game) ---------- */
  let loading = null;
  function load() {
    if (loading) return loading;
    const eng = window.ShogiEngine ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'engine.js' + EV; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const wts = fetch(BASE + 'weights.bin.gz?v=20261018ol').then(r => r.ok ? r.arrayBuffer() : null).then(async buf => {
      if (!buf) return null; const u8 = new Uint8Array(buf, 0, 2);
      if (u8[0] === 0x1f && u8[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      return buf;
    }).catch(() => null);
    const book = fetch(BASE + 'book.json?v=20261018ol').then(r => r.ok ? r.json() : null).catch(() => null);
    return (loading = Promise.all([eng, wts, book]).then(([, w, b]) => ({ E: window.ShogiEngine, weights: w, book: b })));
  }

  /* ---------- the recorded piece sound of the full game (falls back to a synthesized knock) ---------- */
  let komaBuf = null, komaLoad = false;
  function audio() { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } }
  function sfxOn() { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } }
  function tok(vol = 1) {
    if (!sfxOn()) return; const C = audio(); if (!C || C.state !== 'running') return;
    if (!komaLoad) { komaLoad = true; fetch(BASE + 'sounds/koma.wav?v=1').then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => C.decodeAudioData(b, res, rej))).then(b => { komaBuf = b; }).catch(() => {}); }
    const t = C.currentTime, g = C.createGain(); g.connect(C.destination);
    if (komaBuf) { const s = C.createBufferSource(); s.buffer = komaBuf; g.gain.value = .9 * vol; s.connect(g); s.start(t); return; }
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(150, t + .07);
    g.gain.setValueAtTime(.3 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(g); o.start(t); o.stop(t + .12);
  }

  function injectCss() {
    if (document.getElementById('sgPlayCss')) return;
    const s = document.createElement('style'); s.id = 'sgPlayCss';
    s.textContent = `.sgpromo{position:fixed;z-index:1000;display:flex;gap:6px;padding:6px;border-radius:16px;background:rgba(255,253,247,.97);border:2px solid #fff;box-shadow:0 10px 26px -10px rgba(80,40,0,.55);transform:translate(-50%,calc(-100% - 18px));animation:sgpIn .22s cubic-bezier(.3,1.4,.5,1)}
.sgpromo button{font:900 16px/1 var(--round,system-ui,sans-serif);padding:12px 16px;border-radius:12px;border:0;cursor:pointer;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.18)}
.sgpromo .y{background:#d8321c;color:#fff}.sgpromo .n{background:#ece5d6;color:#3a3226}
@keyframes sgpIn{from{transform:translate(-50%,calc(-100% - 6px)) scale(.8)}}
.hud .sgk{font-style:normal;font-size:18px;line-height:1}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, SG = T3.shogi, t = ctx.t, S = STR[ctx.lang] || STR.en;
    const fmt = (s, n) => s.replace('{n}', n);
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    injectCss();
    const board = T3.MODELS.shogi(true); board.scale.setScalar(SC); T3.show('shogi', board);
    const Y = board.userData.top, KH = Y, CW = SG.CW, CH = SG.CH, FW = SG.FW, FH = SG.FH;
    const hc = ctx.side === 2 ? 1 : 0, ac = hc ^ 1;         // engine colours: 0 = sente (black), 1 = gote
    const lvIdx = Math.max(0, Math.min(LEVELS.length - 1, (ctx.level || 8) - 1)), LV = LEVELS[lvIdx];
    let E = null, P = null, moves = [], legal = [], sel = null, over = null, stopped = false, busy = true, worker = null, book = null, jobId = 0, popup = null, last = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); T3.kick(dur + 150); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    /* ---------- geometry: engine square ↔ screen cell (the player's side at the bottom) ---------- */
    const disp = sq => { const col = sq % 9, row = (sq / 9) | 0; return hc ? [8 - col, 8 - row] : [col, row]; };
    const sqAt = (c, r) => hc ? (8 - r) * 9 + (8 - c) : r * 9 + c;
    const cellXZ = sq => SG.cell(...disp(sq));

    /* ---------- piece stands: beside the board on wide screens, above / below it on tall ones ---------- */
    const wood = T3.M({ map: T3.wood('komadai', '#d9a764', '#a06c30', 256, 256, 1.6), roughness: .55, bumpScale: .002 });
    const stands = [SG.komadai(wood, KH), SG.komadai(wood, KH)]; stands.forEach(k => board.add(k));   // [0] = the player's, [1] = the AI's
    let tall = false, ST = [];
    const GRID_W = [[-.8, -1], [0, -1], [.8, -1], [-.8, 0], [0, 0], [.8, 0], [0, 1]];          // 3 × 3 on the upright plate
    const GRID_T = [[-1.17, -.55], [-.39, -.55], [.39, -.55], [1.17, -.55], [-.78, .55], [0, .55], [.78, .55]];   // 4 + 3 on the turned plate
    function layout() {
      const r = ctx.el.getBoundingClientRect();
      tall = r.width < r.height * .95;
      const BWd = FW + 1, BDd = FH + 1;
      ST = tall ? [{ x: BWd / 2 - 1.55, z: BDd / 2 + 1.6 }, { x: -(BWd / 2 - 1.55), z: -(BDd / 2 + 1.6) }]
        : [{ x: FW / 2 + 1.95, z: 3.9 }, { x: -FW / 2 - 1.95, z: -3.9 }];
      stands.forEach((k, i) => { k.position.set(ST[i].x, 0, ST[i].z); k.rotation.y = tall ? Math.PI / 2 : 0; });
      // the player's stand sits a little nearer the bottom: shift the scene so the HUD (top on PC, bottom on phones) stays clear
      board.position.z = tall ? -.55 : .25;
      if (T3.fit) T3.fit(tall ? { w: (FW + 1.5) * SC, d: (FH + 1 + 2 * 2.95 + 2.2) * SC, y: Y * SC, pitch: 1.53 } : { w: 16.4 * SC, d: 13.1 * SC, y: Y * SC, pitch: 1.53 });
      T3.kick(400);
    }
    const slotXZ = (who, t) => {   // who: 0 = player, 1 = AI
      const i = HANDS.indexOf(t), g = (tall ? GRID_T : GRID_W)[i], s = who ? -1 : 1;
      return [ST[who].x + g[0] * s, ST[who].z + g[1] * s];
    };

    /* ---------- pieces ---------- */
    let pcs = {}, hand = [[], []], strays = [], flying = new Set();                   // pcs[sq] = group; hand[who] = [{ t, g, badge }]
    const mk = code => { const c = code >> 4, ty = code & 15, g = SG.piece(ty, c !== hc, c === 1 && ty === 8); g.userData.c = c; g.userData.ty = ty; return g; };
    function swapType(g, ty) { const n = SG.piece(ty, false, g.userData.c === 1 && ty === 8), m = n.children[0]; g.remove(g.children[0]); g.add(m); g.userData.ty = ty; }
    const badgeTex = {};
    function badge(n) {
      const tex = badgeTex[n] || (badgeTex[n] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff4dc'; x.stroke();
        x.fillStyle = '#fff'; x.font = '900 72px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 68);
        const tx = new TH.CanvasTexture(c); tx.encoding = TH.sRGBEncoding; return tx; })());
      const sp = new TH.Sprite(new TH.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false })); sp.scale.set(.42, .42, 1); sp.renderOrder = 5; return sp;
    }
    function buildHands() {   // the stands always show P.hand exactly: one piece per kind + a count badge
      hand.forEach(list => list.forEach(h => { board.remove(h.g); if (h.badge) { board.remove(h.badge); h.badge.material.dispose(); } }));
      hand = [[], []]; strays.forEach(g => board.remove(g)); strays = [];
      for (const who of [0, 1]) {
        const c = who ? ac : hc;
        for (const ty of HANDS) {
          const n = P.hand[c * 8 + ty]; if (!n) continue;
          const g = mk((c ? 16 : 0) + ty), [x, z] = slotXZ(who, ty); g.scale.setScalar(.82); g.position.set(x, KH, z); board.add(g);
          let b = null; if (n > 1) { b = badge(n); const s = who ? -1 : 1; b.position.set(x + .3 * s, KH + .5, z + .3 * s); board.add(b); }
          hand[who].push({ t: ty, g, badge: b });
        }
      }
      T3.kick(200);
    }
    function buildBoard(fallIn) {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {}; let i = 0;
      for (let sq = 0; sq < 81; sq++) { const code = P.board[sq]; if (!code) continue;
        const g = mk(code), [x, z] = cellXZ(sq); g.position.set(x, Y, z); board.add(g); pcs[sq] = g;
        if (fallIn) { g.visible = false; const d = 80 + (i++) * 14; later(() => { g.visible = true; anim(260, k => { g.position.y = Y + (1 - k) * (1 - k) * 1.4; }, () => { if (i && d > 80 + 38 * 14) tok(.25); }); }, d); }
      }
    }
    // after every move: make sure the 3D board matches the engine's position (types, owners)
    function verify() {
      for (let sq = 0; sq < 81; sq++) { const code = P.board[sq], g = pcs[sq];
        if (!code) { if (g) { board.remove(g); delete pcs[sq]; } continue; }
        if (g && g.userData.c === code >> 4 && g.userData.ty === (code & 15)) continue;
        if (g) board.remove(g); const n = mk(code), [x, z] = cellXZ(sq); n.position.set(x, Y, z); board.add(n); pcs[sq] = n; }
      buildHands();
      const known = new Set(Object.values(pcs)); hand.forEach(l => l.forEach(h => known.add(h.g)));
      board.children.filter(g => g.userData.ty != null && !known.has(g)).forEach(g => board.remove(g));   // nothing left over from an animation
    }

    /* ---------- marks: selection, destinations, last move, check ---------- */
    const marks = new TH.Group(); board.add(marks);
    const tileGeo = new TH.BoxGeometry(CW * .92, .02, CH * .92), ringGeo = new TH.CylinderGeometry(.17, .17, .02, 24), padGeo = new TH.CylinderGeometry(.5, .5, .02, 28);
    const MAT = {};
    const mat = (color, op) => MAT[color + ':' + op] || (MAT[color + ':' + op] = new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
    const clearMarks = () => { while (marks.children.length) marks.remove(marks.children[0]); };
    function tileAt(sq, color, op, geo = tileGeo) { const m = new TH.Mesh(geo, mat(color, op)), [x, z] = cellXZ(sq); m.position.set(x, Y + .012, z); marks.add(m); return m; }
    function drawMarks() {
      clearMarks();
      if (last) { if (last.from >= 0) tileAt(last.from, 0xffb347, .28); tileAt(last.to, 0xff9a1f, .38); }
      if (!over && P.inCheck()) { const k = P.king[P.side]; if (k >= 0) tileAt(k, 0xff2a2a, .45); }
      if (sel) {
        if (sel.sq != null) tileAt(sel.sq, 0x2fd17a, .55);
        else { const h = hand[0].find(h => h.t === sel.hand); if (h) { const m = new TH.Mesh(padGeo, mat(0x2fd17a, .6)); m.position.set(h.g.position.x, KH + .012, h.g.position.z); marks.add(m); } }
        const seen = new Set();
        targets().forEach(m => { const to = E.mTo(m); if (seen.has(to)) return; seen.add(to);
          if (P.board[to]) tileAt(to, 0xd8321c, .5); else tileAt(to, 0xd8321c, .85, ringGeo); });
      }
      T3.kick(150);
    }
    const targets = () => !sel ? [] : legal.filter(m => sel.sq != null ? !E.isDrop(m) && E.mFrom(m) === sel.sq : E.isDrop(m) && E.mFrom(m) - 80 === sel.hand);
    function lift(g, up, y0) { if (!g) return; const a = g.position.y, b = y0 + (up ? .25 : 0); anim(160, k => { g.position.y = a + (b - a) * io(k); }); }
    function selPiece() { return !sel ? null : sel.sq != null ? pcs[sel.sq] : (hand[0].find(h => h.t === sel.hand) || {}).g; }
    function select(s) {
      const old = selPiece(); if (old) lift(old, false, sel.sq != null ? Y : KH);
      sel = s; const g = selPiece(); if (g) lift(g, true, s.sq != null ? Y : KH);
      closePopup(); drawMarks();
    }
    function deselect() { if (!sel) return; const old = selPiece(); if (old) lift(old, false, sel.sq != null ? Y : KH); sel = null; closePopup(); drawMarks(); }

    /* ---------- hud ---------- */
    function hud(msg) {
      const side = c => `<span class="hs ${P && P.side === c && !over ? 'on' : ''}"><i class="sgk">${c ? '☖' : '☗'}</i>${c === hc ? L.you : L.ai}</span>`;
      ctx.hud(`${side(0)}<span class="hm">${msg || ''}</span>${side(1)}`);
    }
    const plyTag = () => fmt(S.ply, moves.length + 1);

    /* ---------- playing a move (both sides): engine first, then the animation ---------- */
    function play(m, done) {
      const c = P.side, who = c === hc ? 0 : 1, from = E.mFrom(m), to = E.mTo(m), drop = E.isDrop(m), promo = E.mPromo(m);
      const victim = drop ? 0 : P.board[to];
      moves.push(P.toUsi(m)); P.doMove(m); P.histChk[P.hn - 1] = P.inCheck() ? 1 : 0; P.sp = 0;
      last = { from: drop ? -1 : from, to }; sel = null; clearMarks();
      const [x1, z1] = cellXZ(to);
      let g, y0;
      if (drop) {   // from the stand
        const h = hand[who].find(h => h.t === from - 80);
        g = h ? h.g : mk((c ? 16 : 0) + from - 80);
        if (h) { hand[who].splice(hand[who].indexOf(h), 1); if (h.badge) { board.remove(h.badge); } if (P.hand[c * 8 + h.t]) { const ng = mk((c ? 16 : 0) + h.t); ng.scale.setScalar(.82); ng.position.copy(h.g.position); ng.position.y = KH; board.add(ng); hand[who].push({ t: h.t, g: ng, badge: null }); } }
        else { const [sx, sz] = slotXZ(who, from - 80); g.position.set(sx, KH, sz); board.add(g); }
        y0 = g.position.y;
      } else { g = pcs[from]; delete pcs[from]; y0 = g.position.y; }
      const vg = victim ? pcs[to] : null; pcs[to] = g;
      const x0 = g.position.x, z0 = g.position.z, s0 = g.scale.x, d = Math.hypot(x1 - x0, z1 - z0), H = drop ? 1.6 : .9 + Math.min(.6, d * .06), dur = drop ? 520 : 380 + Math.min(240, d * 26);
      let capStarted = false;
      anim(dur, k => {
        const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        g.position.y = Y + (y0 - Y) * (1 - e) + Math.sin(k * Math.PI) * H; g.scale.setScalar(s0 + (1 - s0) * e);
        if (vg && !capStarted && k > .55) { capStarted = true; toStand(vg, who, c); }
      }, () => {
        g.position.set(x1, Y, z1); g.scale.setScalar(1); tok(victim ? 1 : .85); squash(g);
        if (vg && !capStarted) toStand(vg, who, c);
        const fin = () => { const w = () => flying.size ? later(w, 50) : (verify(), done && done()); later(w, 60); };
        if (promo) later(() => flip(g, g.userData.ty + 8, fin), 90); else fin();
      });
    }
    function squash(g) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .07; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function flip(g, ty, done) {   // promotion: lift, roll over, the red side lands face up
      let swapped = false;
      anim(560, k => { g.position.y = Y + Math.sin(k * Math.PI) * 1.0; g.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5 && !swapped) { swapped = true; swapType(g, ty); } },
        () => { g.rotation.z = 0; g.position.y = Y; tok(.8); squash(g); done && done(); });
    }
    function toStand(vg, who, c) {   // a captured piece flies to the capturer's stand, turning to face its new owner, back to its plain side
      const ty0 = vg.userData.ty, base = BASET[ty0], [x1, z1] = slotXZ(who, base), x0 = vg.position.x, z0 = vg.position.z;
      const r0 = vg.rotation.y, r1 = c === hc ? 0 : Math.PI; let swapped = base === ty0;
      const dr = ((r1 - r0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      vg.userData.c = c; flying.add(vg);
      anim(640, k => { const e = io(k); vg.position.x = x0 + (x1 - x0) * e; vg.position.z = z0 + (z1 - z0) * e; vg.position.y = Y + Math.sin(k * Math.PI) * 2.0; vg.rotation.y = r0 + dr * e; vg.scale.setScalar(1 - .18 * e);
        if (!swapped) { vg.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5) { swapped = true; swapType(vg, base); } } },
        () => { vg.rotation.z = 0; vg.position.y = KH; tok(.5); flying.delete(vg); strays.push(vg); });
    }

    /* ---------- game flow ---------- */
    function checkEnd() {   // same rules as the full game (shogi/index.html checkEnd)
      const n = moves.length;
      if (!P.legalMoves(false).length) return { winner: P.side ^ 1, reason: 'mate', ply: n };
      let reps = 0;
      for (let i = P.hn - 1; i >= 0; i -= 2) if (P.histL[i] === P.hl && P.histH[i] === P.hh) reps++;
      if (reps >= 4) {
        let first = -1;
        for (let i = P.hn - 1; i >= 0; i -= 2) if (P.histL[i] === P.hl && P.histH[i] === P.hh) first = i;
        let us = true, them = true;
        for (let j = first; j < P.hn; j += 2) if (!P.histChk[j]) us = false;
        for (let j = first + 1; j < P.hn; j += 2) if (!P.histChk[j]) them = false;
        return us ? { winner: P.side, reason: 'perp', ply: n } : them ? { winner: P.side ^ 1, reason: 'perp', ply: n } : { winner: -1, reason: 'sen', ply: n };
      }
      if (P.canDeclare()) return { winner: P.side, reason: 'decl', ply: n };
      if (n >= 512) return { winner: -1, reason: 'max', ply: n };
      return null;
    }
    function end(o) {
      over = o; busy = true; sel = null; closePopup(); drawMarks();
      const win = o.winner === hc, draw = o.winner < 0;
      const sc = o.reason === 'mate' ? fmt(S.mate, o.ply) : o.reason === 'resign' ? fmt(S.resign, o.ply) : S[o.reason];
      hud(`${draw ? L.draw : win ? L.win : L.lose} · ${sc}`);
      if (o.reason === 'mate') { const k = P.king[o.winner ^ 1], g = pcs[k]; if (g) { const r0 = g.rotation.y; anim(700, k2 => { g.rotation.y = r0 + Math.sin(k2 * Math.PI * 7) * .16 * (1 - k2); }, () => { g.rotation.y = r0; }); } }
      ctx.onEnd({ win, draw, level: ctx.level, score: sc });
    }
    function next() {
      if (stopped || over) return;
      const o = checkEnd(); if (o) return end(o);
      const chk = P.inCheck() ? S.check + ' ' : '';
      if (P.side === hc) { legal = P.legalMoves(true); busy = false; hud(`${plyTag()} · ${chk}${L.turn}`); drawMarks(); return; }
      busy = true; legal = []; hud(`${plyTag()} · ${chk}${L.think}`); drawMarks(); aiMove();
    }
    function bookMove() {
      if (!book || lvIdx < 2 || moves.length > 30) return null;
      const e = book[P.sfen().replace(/ \d+$/, '')]; if (!e) return null;
      const tot = e.reduce((a, b) => a + b[1], 0); let x = Math.random() * tot;
      for (const [u, c] of e) { x -= c; if (x <= 0) return u; }
      return e[0][0];
    }
    function aiMove() {
      const t0 = performance.now(), go = u => {
        if (stopped || over) return;
        const m = u ? P.fromUsi(u) : 0;
        if (!m || !P.legalMoves(true).includes(m)) { const lm = P.legalMoves(false); if (!lm.length) return end({ winner: hc, reason: 'mate', ply: moves.length }); return play(lm[Math.floor(Math.random() * lm.length)], next); }
        play(m, next);
      };
      const bm = bookMove();
      if (bm) return later(() => go(bm), 400);
      const id = ++jobId;
      worker.onmessage = e => {
        const r = e.data; if (r.id !== id || r.type !== 'result' || stopped) return;
        later(() => {
          if (!r.move) return end({ winner: hc, reason: 'mate', ply: moves.length });
          if (!LV.noise && r.score <= -E.MATE + 200) return end({ winner: hc, reason: 'resign', ply: moves.length });   // hopeless: the strong levels resign, as in the full game
          go(r.move);
        }, Math.max(0, 350 - (performance.now() - t0)));
      };
      worker.onerror = () => { if (stopped) return; worker.terminate(); worker = newWorker(); later(() => go(null), 50); };
      worker.postMessage({ type: 'think', id, sfen: START, moves: moves.slice(), opts: LV });
    }
    let weights = null;
    function newWorker() { const w = new Worker(BASE + 'engine.js' + EV); if (weights) w.postMessage({ type: 'weights', buffer: weights.slice(0) }); return w; }

    /* ---------- the player's input ---------- */
    function closePopup() { if (popup) { popup.remove(); popup = null; } }
    function toBoard(p) { return { x: (p.x - board.position.x) / SC, z: (p.z - board.position.z) / SC }; }
    function hit(e) {
      const p0 = T3.pick(e, Y * SC); if (!p0) return null;
      const p = toBoard(p0), c = Math.floor((p.x + FW / 2) / CW), r = Math.floor((p.z + FH / 2) / CH);
      if (c >= 0 && c < 9 && r >= 0 && r < 9) return { sq: sqAt(c, r) };
      for (const h of hand[0]) if (Math.abs(p.x - h.g.position.x) < .42 && Math.abs(p.z - h.g.position.z) < .5) return { hand: h.t };
      return null;
    }
    function tryMove(to) {
      const ms = targets().filter(m => E.mTo(m) === to); if (!ms.length) return false;
      const pro = ms.find(m => E.mPromo(m)), non = ms.find(m => !E.mPromo(m));
      if (pro && non) { askPromo(to, pro, non); return true; }
      commit(pro || non); return true;
    }
    function commit(m) { busy = true; closePopup(); play(m, next); }
    function askPromo(to, pro, non) {
      closePopup();
      const [x, z] = cellXZ(to), q = T3.project(x * SC + board.position.x, z * SC + board.position.z, (Y + .3) * SC);
      const el = document.createElement('div'); el.className = 'sgpromo';
      el.innerHTML = `<button type="button" class="y">${S.yes}</button><button type="button" class="n">${S.no}</button>`;
      el.style.left = Math.max(90, Math.min(innerWidth - 90, q.x)) + 'px'; el.style.top = Math.max(70, q.y) + 'px';
      el.querySelector('.y').onclick = ev => { ev.stopPropagation(); commit(pro); };
      el.querySelector('.n').onclick = ev => { ev.stopPropagation(); commit(non); };
      document.body.appendChild(el); popup = el;
      const tile = tileAt(to, 0x2f8bd1, .55); tile.userData.promo = 1; T3.kick(150);
    }
    function onClick(e) {
      if (busy || over || !P || P.side !== hc || T3.wasDrag()) return;
      if (popup) { deselect(); return; }
      const h = hit(e); if (!h) { deselect(); return; }
      if (h.sq != null && sel && tryMove(h.sq)) return;
      if (h.sq != null) { const code = P.board[h.sq];
        if (code && code >> 4 === hc) { if (sel && sel.sq === h.sq) return deselect(); if (legal.some(m => !E.isDrop(m) && E.mFrom(m) === h.sq)) return select({ sq: h.sq }); }
        return deselect(); }
      if (h.hand != null) { if (sel && sel.hand === h.hand) return deselect(); if (legal.some(m => E.isDrop(m) && E.mFrom(m) - 80 === h.hand)) return select({ hand: h.hand }); return deselect(); }
    }
    let lastTall = null;
    function onResize() { closePopup(); layout(); if (lastTall !== tall) { lastTall = tall; if (P) { buildHands(); drawMarks(); } } }
    ctx.el.addEventListener('click', onClick);
    addEventListener('resize', onResize);
    layout(); lastTall = tall;
    hud('…');

    load().then(r => {
      if (stopped) return;
      E = r.E; book = r.book; weights = r.weights;
      P = new E.Position(); P.setSfen(START);
      worker = newWorker();
      buildBoard(true); buildHands();
      hud(plyTag());
      later(next, 80 + 40 * 14 + 400);
    }).catch(() => { if (!stopped) hud('⚠'); });

    const api = {
      stop() {
        stopped = true; timers.forEach(clearTimeout); closePopup();
        ctx.el.removeEventListener('click', onClick); removeEventListener('resize', onResize);
        if (worker) worker.terminate(); worker = null;
        if (window.__shogiTable === dbg) delete window.__shogiTable;
      },
    };
    // test hooks (Playwright): screen positions of squares / the player's hand pieces, and the state
    const dbg = {
      xy(sq) { const [x, z] = cellXZ(sq); return T3.project(x * SC + board.position.x, z * SC + board.position.z, Y * SC); },
      handXY(ty) { const h = hand[0].find(h => h.t === ty); if (!h) return null; return T3.project(h.g.position.x * SC + board.position.x, h.g.position.z * SC + board.position.z, KH * SC); },
      sq: u => E.makeSq(+u[0], 'abcdefghi'.indexOf(u[1]) + 1),
      audit() {   // pieces on the board's plane that the engine does not know about (or the other way round)
        const out = []; board.children.forEach(g => { if (g.userData.ty == null || !g.visible) return; if (Object.values(pcs).includes(g) || hand.some(l => l.some(h => h.g === g)) || strays.includes(g) || flying.has(g)) return; out.push('orphan ' + g.userData.ty + '@' + g.position.x.toFixed(2) + ',' + g.position.z.toFixed(2)); });
        for (let sq = 0; sq < 81; sq++) { const code = P.board[sq], g = pcs[sq]; if (!!code !== !!g) out.push('mismatch ' + sq); else if (g && (g.userData.ty !== (code & 15) || g.userData.c !== code >> 4)) out.push('type ' + sq); }
        return out;
      },
      state: () => ({ moves: moves.slice(), side: P && P.side, hc, busy, over, sfen: P && P.sfen(), legal: legal.map(m => P.toUsi(m)), popup: !!popup, tall, hand: P && Array.from(P.hand) }),
    };
    window.__shogiTable = dbg;
    return api;
  }

  window.AtlasShogiPlay = { start };
})();
