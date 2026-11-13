/* =====================================================================
   Chess on the portal.
   · The board card (levels, sides, modes): level names / descriptions come from
     the game (chess/i18n_ai.js, engine LEVELS); ratings = the game's RT_LV.
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself, with the
     full game's rules and AI — ../chess/engine.js on the page (legal moves, mate,
     draws) and the same engine as a Worker (WebAssembly search + NNUE, levels 1..25,
     opening book), exactly as chess/app.js asks it ({ type:'think', moves, level }).
     Board and Staunton pieces: atlas/models/chess.js (set 'lux' or 'wood' as chosen
     in the game's 3D skin, localStorage 'atlas-chess-pc').
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../chess/', VER = '?v=20261111kb4';   // same file / version as chess/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.ChessEngine) return Promise.resolve(window.ChessEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.ChessEngine ? res(window.ChessEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { check: 'チェック！', mate: 'チェックメイト', stale: 'ステイルメイト', fifty: '50手ルール', rep: '同一局面3回', material: '駒不足', promo: '昇格する駒' },
    en: { check: 'Check!', mate: 'Checkmate', stale: 'Stalemate', fifty: '50-move rule', rep: 'Threefold repetition', material: 'Insufficient material', promo: 'Promote to' },
    zh: { check: '将军！', mate: '将杀', stale: '逼和', fifty: '50回合规则', rep: '三次重复局面', material: '子力不足', promo: '升变为' },
    ko: { check: '체크!', mate: '체크메이트', stale: '스테일메이트', fifty: '50수 규칙', rep: '3회 동형 반복', material: '기물 부족', promo: '승진할 기물' },
    es: { check: '¡Jaque!', mate: 'Jaque mate', stale: 'Ahogado', fifty: 'Regla de 50 jugadas', rep: 'Triple repetición', material: 'Material insuficiente', promo: 'Coronar en' },
    fr: { check: 'Échec !', mate: 'Échec et mat', stale: 'Pat', fifty: 'Règle des 50 coups', rep: 'Triple répétition', material: 'Matériel insuffisant', promo: 'Promouvoir en' },
    pt: { check: 'Xeque!', mate: 'Xeque-mate', stale: 'Afogamento', fifty: 'Regra dos 50 lances', rep: 'Tripla repetição', material: 'Material insuficiente', promo: 'Promover a' },
    de: { check: 'Schach!', mate: 'Schachmatt', stale: 'Patt', fifty: '50-Züge-Regel', rep: 'Dreifache Wiederholung', material: 'Ungenügendes Material', promo: 'Umwandeln in' },
    hi: { check: 'शह!', mate: 'शह-मात', stale: 'स्टेलमेट', fifty: '50 चाल नियम', rep: 'तीन बार दोहराव', material: 'अपर्याप्त मोहरे', promo: 'प्रमोट करें' },
    ar: { check: 'كش!', mate: 'كش مات', stale: 'جمود (تعادل)', fifty: 'قاعدة الخمسين نقلة', rep: 'تكرار ثلاثي', material: 'قطع غير كافية', promo: 'ترقية إلى' },
    ru: { check: 'Шах!', mate: 'Мат', stale: 'Пат', fifty: 'Правило 50 ходов', rep: 'Троекратное повторение', material: 'Недостаточно материала', promo: 'Превратить в' },
    'zh-TW': { check: '將軍！', mate: '將死', stale: '逼和', fifty: '50步規則', rep: '三次重複局面', material: '子力不足', promo: '升變為' },
    id: { check: 'Skak!', mate: 'Skakmat', stale: 'Remis pat', fifty: 'Aturan 50 langkah', rep: 'Pengulangan tiga kali', material: 'Materi tidak cukup', promo: 'Promosi jadi' },
    tr: { check: 'Şah!', mate: 'Şah mat', stale: 'Pat', fifty: '50 hamle kuralı', rep: 'Üç kez tekrar', material: 'Yetersiz materyal', promo: 'Terfi:' },
  };
  // two players on one device (ctx.mode 'pvp'): the colours' names, whose turn, who won
  const PV = {
    ja: { n: ['白', '黒'], turn: '{p}の番', win: '{p}の勝ち' }, en: { n: ['White', 'Black'], turn: '{p} to move', win: '{p} wins' },
    zh: { n: ['白方', '黑方'], turn: '轮到{p}', win: '{p}胜' }, ko: { n: ['백', '흑'], turn: '{p} 차례', win: '{p} 승리' },
    es: { n: ['Blancas', 'Negras'], turn: 'Juegan {p}', win: 'Ganan {p}' }, fr: { n: ['Blancs', 'Noirs'], turn: 'Trait aux {p}', win: 'Victoire des {p}' },
    pt: { n: ['Brancas', 'Pretas'], turn: 'Vez das {p}', win: 'Vitória das {p}' }, de: { n: ['Weiß', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { n: ['सफ़ेद', 'काला'], turn: '{p} की बारी', win: '{p} की जीत' }, ar: { n: ['الأبيض', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}' }, ru: { n: ['Белые', 'Чёрные'], turn: 'Ход: {p}', win: '{p} побеждают' }, 'zh-TW': { n: ['白方', '黑方'], turn: '輪到{p}', win: '{p}獲勝' }, id: { n: ['Putih', 'Hitam'], turn: 'Giliran {p}', win: '{p} menang' }, tr: { n: ['Beyaz', 'Siyah'], turn: 'Sıra: {p}', win: '{p} kazandı' },
  };
  const TYPES = ' PNBRQK', VAL = [0, 1, 3, 3, 5, 9, 0];
  const GLYPH = { w: { Q: '♕', R: '♖', B: '♗', N: '♘' }, b: { Q: '♛', R: '♜', B: '♝', N: '♞' } };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  // a soft wooden "tok" when a piece is set down (respects the portal's sound switch)
  let AC = null;
  function tok(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(260 * v, t); o.frequency.exponentialRampToValueAtTime(120 * v, t + .06);
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .09);
      o.connect(lp).connect(g).connect(AC.destination); o.start(t); o.stop(t + .1);
    } catch (e) {}
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.chpromo{position:fixed;z-index:90;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 8px 10px;border-radius:18px;background:rgba(255,253,247,.97);border:2px solid #fff;box-shadow:0 14px 30px -12px rgba(60,30,0,.55);transform:translate(-50%,0);animation:chpIn .18s ease-out}
@keyframes chpIn{from{transform:translate(-50%,0) scale(.85)}}
.chpromo .tl{font-weight:900;font-size:12px;color:#7a6a58}
.chpromo .rw{display:flex;gap:6px}
.chpromo button{width:58px;height:72px;border-radius:14px;border:2px solid #eadfcb;background:#fffaf0;cursor:pointer;padding:0;display:flex;align-items:flex-end;justify-content:center;font-size:40px;line-height:72px;color:#3a2e24;box-shadow:0 3px 0 #e2d4bb}
.chpromo button:hover{background:#fff1cf;border-color:#ffc24a}
.chpromo button img{width:100%;height:100%;object-fit:contain;pointer-events:none}
@media (max-width:560px){.chpromo button{width:52px;height:66px;font-size:36px;line-height:66px}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, CS = T3.chess, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    let set = 'lux'; try { set = localStorage.getItem('atlas-chess-pc') === 'wood' ? 'wood' : 'lux'; } catch (e) {}
    const board = T3.MODELS.chess(true); T3.show('chess', board);
    if (board.userData.setSet) board.userData.setSet(set);
    if (board.userData.setTone) board.userData.setTone('classic');
    const Y = board.userData.top;
    if (T3.fit) T3.fit({ w: CS.OW + .2, d: CS.OW + .7, y: Y + .35, pitch: 1.0 });   // the whole board, large, from the player's side
    const pvp = ctx.mode === 'pvp', PX = PV[ctx.lang] || PV.en;   // pvp: both colours are tapped in turn, White at the bottom, no AI
    // ctx.pz: a puzzle driven by atlas/puzzles.js — the position is ctx.pz.fen, the side to move plays (at the bottom), no AI:
    // after each of the player's moves ctx.pz.moved(uci, info) decides; replies come through api.pz.play (2026-11-10)
    const PZ = ctx.pz || null;
    let human = PZ ? (PZ.me === 0 || PZ.me === 1 ? PZ.me : PZ.fen.split(' ')[1] === 'b' ? 1 : 0) : pvp ? 0 : ctx.side === 2 ? 1 : 0, flip = human === 1;   // (a tactic: the opponent's move comes first — the player is the other side: PZ.me, 2026-11-13)   // engine colours: 0 = White, 1 = Black; the player's side is at the bottom
    const mover = () => pvp && pos ? pos.side : human, mcol = () => mover() ? 'b' : 'w';   // the side whose taps count now
    // 0x88 square ↔ screen cell (f: 0 = left column, r: 0 = top row)
    const scr = sq => { const f = sq & 7, r = sq >> 4; return flip ? [7 - f, r] : [f, 7 - r]; };
    const xz = sq => CS.cell(...scr(sq));
    const sqAt = (f, r) => flip ? (r << 4) | (7 - f) : ((7 - r) << 4) | f;

    let E = null, pos = null, hashes = [], legal = [], moves = [], startFen = null;
    let stopped = false, busy = true, over = false, thinking = false, sel = -1, worker = null, jid = 0, promoEl = null, imgs = null;
    let ply = 0, hintW = null, hintJ = 0, hintMv = 0;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side === human, ply }); };   // HUD pills: White (left) 0, Black 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks on the board (last move, check, selection, destinations) ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffcf3a, .42), check: basic(0xff2a2a, .62), sel: basic(0x2fd17a, .5), dot: basic(0x1f9e5a, .78), cap: basic(0x1f9e5a, .85), hint: basic(0xff7a1a, .95), hintT: basic(0xffb03a, .42) };
    const GEO = { tile: new TH.BoxGeometry(.96, .012, .96), dot: new TH.CylinderGeometry(.15, .15, .012, 28), ring: new TH.TorusGeometry(.4, .05, 8, 40) };
    GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, sq, y = .008) { if (T3.kick) T3.kick(150); const m = new TH.Mesh(geo, mat); const [x, z] = xz(sq); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); if (T3.kick) T3.kick(150); };   // every change of the 3D picture asks for frames (on-demand rendering)

    /* ---------- pieces ---------- */
    let pcs = {};   // 0x88 square → piece group
    function face(g, sq) {   // knights look at the opponent, a little outward
      if (g.userData.type !== 'N') { g.rotation.y = 0; return; }
      const f = scr(sq)[0], bottom = (g.userData.color === 'w') !== flip;
      g.rotation.y = bottom ? Math.PI / 2 + (f < 4 ? -.35 : .35) : -Math.PI / 2 + (f < 4 ? .35 : -.35);
    }
    function dress(g) { g.userData.refl = g.children.find(c => c.userData.reflection) || null; }
    function mk(tp, col, sq) {
      const g = CS.piece(tp, col, { reflect: true, set }); dress(g);
      const sh = T3.contact(.34, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      const [x, z] = xz(sq); g.position.set(x, Y, z); face(g, sq); board.add(g); return g;
    }
    // raise a piece h above the board: its mirror image goes down by as much, its contact shadow stays on the board and spreads
    function lift(g, h) {
      g.position.y = Y + h; g.userData.h0 = h;
      if (g.userData.refl) g.userData.refl.position.y = -2 * h;
      const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .45; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.2); }
    }
    const hOf = g => g.userData.h0 || 0;
    function land(g) { anim(170, k => { const s = 1 + Math.sin(k * Math.PI) * .07; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      let i = 0;
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) continue; const p = pos.b[sq]; if (!p) continue;
        const g = mk(TYPES[p & 7], p & 8 ? 'b' : 'w', sq); pcs[sq] = g;
        g.visible = false; const d = 60 + (i++) * 18; if (T3.kick) T3.kick(200);
        later(() => { g.visible = true; anim(260, k => lift(g, (1 - k) * (1 - k) * 1.5), () => { lift(g, 0); land(g); }); }, d);
      }
      return 60 + i * 18 + 300;
    }
    // lift — glide — set down. hop: a higher arc (knight, castling rook)
    function glide(g, to, hop, done) {
      const x0 = g.position.x, z0 = g.position.z, [x1, z1] = xz(to), d = Math.hypot(x1 - x0, z1 - z0);
      const h0 = hOf(g), H = hop ? .75 : .42, A = .2, B = .8, dur = (300 + d * 55) * (PZ ? .55 : 1);   // (puzzles: quick, 2026-11-10)
      anim(dur, k => {
        let h, e;
        if (k < A) { e = 0; h = h0 + (H - h0) * io(k / A); }
        else if (k < B) { e = io((k - A) / (B - A)); h = H + (hop ? Math.sin(e * Math.PI) * .7 : 0); }
        else { e = 1; const u = (k - B) / (1 - B); h = H * (1 - u * u); }
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, h);
      }, () => { lift(g, 0); tok(hop ? .9 : 1); land(g); if (done) done(); });
      return dur;
    }
    // a taken piece topples away (dx, dz: the way it falls) and fades out; keep: stays lying (a mated king)
    function topple(g, dx, dz, keep, done) {
      if (g.userData.refl) g.userData.refl.visible = false;
      const mats = [];
      if (!keep) g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      const sh = g.userData.sh, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
      const axis = new TH.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new TH.Quaternion(), x0 = g.position.x, z0 = g.position.z;
      const maxA = keep ? 1.45 : 1.25, dur = keep ? 900 : 560;
      anim(dur, k => {
        const e = keep ? (k < .75 ? Math.pow(k / .75, 2) : 1 + Math.sin((k - .75) / .25 * Math.PI) * -.06) : k * k;
        const a = maxA * Math.min(1, e);
        qt.setFromAxisAngle(axis, a); g.quaternion.copy(qt).multiply(q0);
        const slide = (keep ? .15 : .45) * Math.min(1, k * 1.4);
        g.position.x = x0 + ux * slide; g.position.z = z0 + uz * slide; g.position.y = Y + Math.sin(a) * .3;
        if (sh) sh.visible = a < .5;
        if (!keep) { const f = k < .45 ? 1 : 1 - (k - .45) / .55; mats.forEach(m => { m.opacity = Math.max(0, f); }); }
      }, () => {
        if (!keep) { board.remove(g); mats.forEach(m => m.dispose()); } else tok(.7);
        if (done) done();
      });
    }
    function promote(g, tp, sq, done) {   // spin up, change into the chosen piece, land
      let swapped = false;
      anim(620, k => {
        lift(g, Math.sin(k * Math.PI) * .9); g.rotation.y = k * Math.PI * 2;
        if (k >= .5 && !swapped) {
          swapped = true;
          const n = CS.piece(tp, g.userData.color, { reflect: true, set }), sh = g.userData.sh;
          g.children.slice().forEach(c => { if (c !== sh) g.remove(c); });
          n.children.slice().forEach(c => g.add(c)); g.userData.type = tp; dress(g); lift(g, hOf(g));
        }
      }, () => { lift(g, 0); face(g, sq); tok(1.15); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() {
      if (DR) { pos = drillPos(startFen); for (const m of moves) { pos.make(m); pos.side = 0; pos.ep = -1; } hashes = [pos.h1]; return; }   // (a drill: White moves on and on)
      const r = E.replay(startFen, moves); pos = r.pos; hashes = r.hashes;
    }
    function status() {
      if (DR) return { over: false, legal: drillLegal(pos, DR.safe) };
      const leg = pos.legal();
      if (!leg.length) return pos.inCheck() ? { over: true, winner: pos.side ^ 1, why: 'mate' } : { over: true, draw: true, why: 'stale' };
      if (pos.half >= 100) return { over: true, draw: true, why: 'fifty' };
      if (pos.insufficient()) return { over: true, draw: true, why: 'material' };
      let c = 0; for (const h of hashes) if (h === pos.h1) c++;
      if (c >= 3) return { over: true, draw: true, why: 'rep' };
      return { over: false, legal: leg };
    }
    function material(c) { let s = 0; for (let sq = 0; sq < 120; sq++) { if (sq & 0x88) continue; const p = pos.b[sq]; if (p && ((p & 8) ? 1 : 0) === c) s += VAL[p & 7]; } return s; }
    function hud(msg) {
      const d = pos ? material(0) - material(1) : 0;
      const side = c => { const adv = c ? -d : d; return `<span class="hs ${pos && pos.side === c && !over ? 'on' : ''}"><i class="dk ${c ? 'b' : 'w'}"></i>${pvp ? PX.n[c] : c === human ? L.you : L.ai}<b>${adv > 0 ? '+' + adv : ''}</b></span>`; };
      ctx.hud(`${side(0)}<span class="hm">${msg || ''}</span>${side(1)}`);
    }
    function showMarks() {
      clear(hl); hintMv = 0; hintJ++;
      if (moves.length) { const m = moves[moves.length - 1]; mark(hl, GEO.tile, MAT.last, m & 127); mark(hl, GEO.tile, MAT.last, (m >> 7) & 127); }
      if (!DR && pos.inCheck()) { const k = mark(hl, GEO.tile, MAT.check, pos.ksq[pos.side], .01); anim(420, e => { const s = 1 + Math.sin(e * Math.PI) * .12; k.scale.set(s, 1, s); }); }
      if (DR) drillMarks();
    }

    /* ---------- selection ---------- */
    function select(sq) {
      deselect();
      sel = sq; const g = pcs[sq];
      mark(mv, GEO.tile, MAT.sel, sq, .009);
      const seen = {};
      legal.forEach(m => {
        if ((m & 127) !== sq) return; const to = (m >> 7) & 127; if (seen[to]) return; seen[to] = 1;
        const cap = pos.b[to] || (m >> 17) & 2; mark(mv, cap ? GEO.ring : GEO.dot, cap ? MAT.cap : MAT.dot, to, cap ? .03 : .01);
      });
      if (g) { const h0 = hOf(g); anim(130, k => lift(g, h0 + (.28 - h0) * io(k))); }
      tok(1.4);
    }
    function deselect() {
      clear(mv);
      if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); }
      sel = -1; if (T3.kick) T3.kick(150);
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      const from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, side = pos.side;
      clear(mv); sel = -1;
      const g = pcs[from]; delete pcs[from];
      const vsq = fl & 2 ? to + (side ? 16 : -16) : pcs[to] ? to : -1;
      const victim = vsq >= 0 ? pcs[vsq] : null; if (victim) delete pcs[vsq];
      let rook = null, rto = -1;
      if (fl & 4) { const rf = to > from ? from + 3 : from - 4; rto = to > from ? from + 1 : from - 1; rook = pcs[rf]; delete pcs[rf]; pcs[rto] = rook; }
      pcs[to] = g;
      moves.push(m); refresh(); ply++; onTurn(); showMarks(); hud('');
      let pending = 1; const fin = () => { if (--pending === 0 && done) done(); };
      const [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(to);
      const dur = glide(g, to, g.userData.type === 'N', () => { if (pr) { pending++; promote(g, TYPES[pr], to, fin); } fin(); });
      if (victim) { pending++; later(() => topple(victim, x1 - x0, z1 - z0, false, fin), dur * .62); }
      if (rook) { pending++; later(() => glide(rook, rto, true, fin), 140); }
    }
    function commit(m) {
      busy = true; closePromo();
      play(m, () => { busy = false; if (PZ) pzAfter(); else next(); });
    }
    function next() {
      if (stopped) return;
      const st = status(); legal = st.legal || [];
      if (st.over) return end(st);
      onTurn();
      if (pvp || pos.side === human) {
        const tn = pvp ? PX.turn.replace('{p}', PX.n[pos.side]) : L.turn;
        hud(pos.inCheck() ? (pvp ? X.check + ' ' + tn : X.check) : tn);
        if (!imgs && legal.some(m => (m >> 14) & 7)) loadImgs();   // a promotion is possible: get the piece pictures ready
        return;
      }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const win = !pvp && !st.draw && st.winner === human, wt = pvp && !st.draw ? PX.win.replace('{p}', PX.n[st.winner]) : '';
      hud(st.draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      if (st.why === 'mate') {   // the mated king lies down
        const ks = pos.ksq[pos.side], k = pcs[ks], [x, z] = xz(ks), [ox, oz] = xz(pos.ksq[pos.side ^ 1]);
        if (k) later(() => topple(k, x - ox || .3, z - oz || .3, true), 380);
      }
      later(() => ctx.onEnd(pvp ? { win: false, draw: !!st.draw, level: ctx.level, score: X[st.why], pvp: true, winnerText: wt } : { win, draw: !!st.draw, level: ctx.level, score: X[st.why] }), st.why === 'mate' ? 900 : 300);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (!m) { try { m = E.think(startFen, mvs, ctx.level).move; } catch (e) { m = 0; } }   // the worker failed: same search on the page (JS)
        later(() => {
          if (id !== jid || over) return;
          thinking = false;
          if (!m) { next(); return; }
          busy = true; play(m, () => { busy = false; next(); });
        }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? 0 : r.move); };
      worker.onerror = () => { worker = null; reply(0); };
      worker.postMessage({ type: 'think', id, fen: startFen, moves: mvs, level: ctx.level });
    }

    /* ---------- promotion choice ---------- */
    function loadImgs() { if (!imgs && CS.images) imgs = CS.images(160, set).catch(() => null); return imgs; }
    function closePromo() { if (promoEl) { promoEl.remove(); promoEl = null; document.removeEventListener('pointerdown', outside, true); } }
    function outside(e) { if (promoEl && !promoEl.contains(e.target)) { closePromo(); deselect(); } }
    function askPromo(to, cands) {
      css(); closePromo(); const col = mcol();
      const [x, z] = xz(to), p = T3.project(x, z, Y), p2 = T3.project(x, z + 1, Y);
      const el = document.createElement('div'); el.className = 'chpromo';
      el.innerHTML = `<div class="tl">${X.promo}</div><div class="rw">${['Q', 'R', 'B', 'N'].map(k => `<button type="button" data-k="${k}">${GLYPH[col][k]}</button>`).join('')}</div>`;
      document.body.appendChild(el); promoEl = el;
      const w = el.offsetWidth, h = el.offsetHeight;
      const cx = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, p.x));
      let top = p2.y + 6; if (top + h > innerHeight - 8) top = Math.max(8, p.y - h - 30);
      el.style.left = cx + 'px'; el.style.top = top + 'px';
      Promise.resolve(loadImgs()).then(im => { if (!im || el !== promoEl) return; el.querySelectorAll('button').forEach(b => { const src = im[col + b.dataset.k]; if (src) b.innerHTML = `<img src="${src}" alt="${b.dataset.k}">`; }); });
      el.addEventListener('click', e => {
        e.stopPropagation();
        const b = e.target.closest('button'); if (!b) return;
        const m = cands.find(c => TYPES[(c >> 14) & 7] === b.dataset.k); if (m) commit(m);
      });
      setTimeout(() => { if (promoEl === el) document.addEventListener('pointerdown', outside, true); }, 0);
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const f = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      return f < 0 || f > 7 || r < 0 || r > 7 ? -1 : sqAt(f, r);
    }
    function onClick(e) {
      if (over || busy || !pos || pos.side !== mover() || promoEl || T3.wasDrag() || (PZ && !pzOn)) return;
      const q = cellOf(e); if (q < 0) { deselect(); return; }
      if (sel >= 0) {
        const cands = legal.filter(m => (m & 127) === sel && ((m >> 7) & 127) === q);
        if (cands.length > 1) { askPromo(q, cands); return; }
        if (cands.length) { commit(cands[0]); return; }
      }
      const p = pos.b[q];
      if (q === sel) { if (!DR) deselect(); return; }   // (a drill's piece is picked up for you: a tap on it keeps it)
      if (p && ((p & 8) ? 1 : 0) === mover() && legal.some(m => (m & 127) === q)) { select(q); return; }
      deselect();
    }
    ctx.el.addEventListener('click', onClick);
    const onResize = () => { if (promoEl) { closePromo(); deselect(); } };
    addEventListener('resize', onResize);

    function begin(fen) {
      timers.forEach(clearTimeout); timers.length = 0; closePromo(); clear(mv); clear(hl);
      startFen = fen || null; moves = []; over = false; busy = true; sel = -1; thinking = false; jid++;
      refresh(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; if (!pvp) worker = new Worker(BASE + 'engine.js' + VER); if (PZ && PZ.drill && !DR) DR = { stars: (PZ.drill.stars || []).slice(), safe: !!PZ.drill.safe, lock: !!PZ.drill.lock, sm: {} }; if (PZ) pzLoad(PZ.fen, PZ.sol, PZ.toMove, PZ.me, !!DR); else begin(null); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state, a set-up position)
    const dbg = {
      at: n => { const sq = (n.charCodeAt(0) - 97) + ((+n[1] - 1) << 4), [x, z] = xz(sq); return T3.project(x, z, Y); },
      state: () => ({ hint: hintMv ? E.sqName(hintMv & 127) + E.sqName((hintMv >> 7) & 127) : '', moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel, promo: !!promoEl, check: !!(pos && pos.inCheck()), pieces: Object.keys(pcs).length }),
      board: () => { const o = {}; Object.entries(pcs).forEach(([sq, g]) => { o[E.sqName(+sq)] = (g.userData.color === 'w' ? g.userData.type : g.userData.type.toLowerCase()); }); return o; },
      setup: fen => begin(fen),
    };
    window.Atlas3D.chess._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    let drawAsked = -99;
    const myTurn = () => !!pos && !over && !busy && !thinking && !promoEl && (pvp || pos.side === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (0 White, 1 Black) loses
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; closePromo(); clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      if (why === 'draw') {   // 合意の引き分け（ポータルの操作バーの［引き分け］）
        hud(L.draw); return later(() => ctx.onEnd(pvp ? { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed'), pvp: true, winnerText: '' } : { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed') }), 200);
      }
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = PX.win.replace('{p}', PX.n[loser ^ 1]); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: PX.n[loser], r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    function rebuild() {   // pieces exactly as the position says, without the drop-in
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      for (let sq = 0; sq < 120; sq++) { if (sq & 0x88) continue; const p = pos.b[sq]; if (p) pcs[sq] = mk(TYPES[p & 7], p & 8 ? 'b' : 'w', sq); }
      board.children.filter(g => g.userData && g.userData.type && (g.userData.color === 'w' || g.userData.color === 'b') && !Object.values(pcs).includes(g)).forEach(g => board.remove(g));   // a toppled king, a fading capture
      if (T3.kick) T3.kick(300);
    }
    /* ---------- puzzle mode (ctx.pz) ---------- */
    let pzOn = false;
    const uciOf = m => E.sqName(m & 127) + E.sqName((m >> 7) & 127) + (((m >> 14) & 7) ? ' pnbrqk'[(m >> 14) & 7] : '');
    function pzWait() { const st = status(); legal = st.legal || []; busy = false; pzOn = !(DR && DR.lock); showMarks(); if (DR && DR.lock) return;   // (a lesson's opening picture: for looking only) if (!imgs && legal.some(m => (m >> 14) & 7)) loadImgs();
      if (DR) { const mine = Object.keys(pcs).map(Number).filter(q => !(pos.b[q] & 8)); if (mine.length === 1 && legal.some(m => (m & 127) === mine[0])) select(mine[0]); } }   // (a drill with one piece: it is picked up at once, its squares shown)
    function pzAfter() {
      pzOn = false; const st = status(); legal = [];
      PZ.moved(uciOf(moves[moves.length - 1]), { mate: st.over && st.why === 'mate', over: st.over, why: st.why, check: pos.inCheck(), n: moves.length });
    }
    function pzLoad(fen, sol, toMove, me, drill) {   // a new puzzle: the player's side (me; else the side to move) is put at the bottom, the pieces drop in
      if (!drill && DR) { DR = null; clear(sg); clear(dg); }
      clear(an);
      if (me === 0 || me === 1) PZ.me = me; else delete PZ.me;
      if (!E) { PZ.fen = fen; return; }   // (the engine is still loading: it starts from PZ.fen)
      timers.forEach(clearTimeout); timers.length = 0; closePromo(); clear(mv); clear(hl);
      human = me === 0 || me === 1 ? me : fen.split(' ')[1] === 'b' ? 1 : 0; flip = human === 1;
      startFen = fen; moves = []; over = false; busy = true; sel = -1; thinking = false; jid++; pzOn = false;
      refresh(); const wait = setup();
      later(() => { showMarks(); pzWait(); if (PZ.ready) PZ.ready(); }, wait + 200);
    }
    /* ---------- drills (the beginner course: one side's pieces only, the black ones stand still, ★ to collect) ----------
       = chess/app.js drillPos / drillLegal: no kings needed; in a 'safe' stage the squares a black piece attacks are barred (red stripes) */
    let DR = null;   // { stars: ['a6', …], safe, sm: { sq: mesh } }
    const DSENT = 0x08;
    function drillPos(fen) {
      const p = E.Pos.fromFEN(fen);
      for (const c of [0, 1]) if (p.b[p.ksq[c]] !== (6 | (c ? 8 : 0))) p.ksq[c] = DSENT;
      const at = p.attacked.bind(p); p.attacked = (q, by) => q === DSENT ? false : at(q, by);
      return p;
    }
    function drillDanger(p, q) { const f = p.b[q]; p.b[q] = 0; const a = p.attacked(q, 1); p.b[q] = f; return a; }
    function drillLegal(p, safe) {
      const buf = new Int32Array(256), n = p.gen(buf, false), out = [];
      for (let i = 0; i < n; i++) if (p.make(buf[i])) { p.unmake(buf[i]); out.push(buf[i]); }
      if (!safe) return out;
      return out.filter(m => { const f = m & 127, pc = p.b[f]; p.b[f] = 0; const a = drillDanger(p, (m >> 7) & 127); p.b[f] = pc; return !a; });
    }
    const sqOf = n => (n.charCodeAt(0) - 97) + ((+n[1] - 1) << 4);
    const drillGot = () => new Set(moves.map(m => E.sqName((m >> 7) & 127)));
    const drillLeft = () => DR ? DR.stars.filter(q => !drillGot().has(q)) : [];
    const dg = new TH.Group(), sg = new TH.Group(); board.add(dg, sg);
    let STAR = null, STRIPE = null;
    function starGeo() {
      if (STAR) return STAR;
      const sh = new TH.Shape(), R1 = .3, R2 = .13;
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R2 : R1, x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      const g = new TH.ExtrudeGeometry(sh, { depth: .07, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 2 }); g.center();
      const m = new TH.MeshStandardMaterial({ color: 0xffc42e, emissive: 0xffa300, emissiveIntensity: .45, metalness: .35, roughness: .3 });
      return (STAR = { g, m });
    }
    function stripeMat() {
      if (STRIPE) return STRIPE;
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      g.fillStyle = 'rgba(230,40,40,.28)'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(220,20,20,.75)'; g.lineWidth = 7;
      for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); }
      const tx = new TH.CanvasTexture(c); tx.encoding = TH.sRGBEncoding;
      return (STRIPE = new TH.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false }));
    }
    function drillStars() {   // the ★ still to collect, floating and turning a little over their squares
      if (!DR) return; const S = starGeo(), left = new Set(drillLeft());
      Object.keys(DR.sm).forEach(q => { if (left.has(q)) return; const o = DR.sm[q]; delete DR.sm[q]; tok(1.6);
        anim(360, k => { o.scale.setScalar(1 + k * .8); o.position.y = Y + .45 + k * .5; o.material.opacity = 1 - k; }, () => sg.remove(o)); });
      left.forEach(q => { if (DR.sm[q]) return; const o = new TH.Mesh(S.g, S.m.clone()); o.material.transparent = true; const [x, z] = xz(sqOf(q)); o.position.set(x, Y + .45, z); o.rotation.x = -.35; o.userData.ph = Math.random() * 6; sg.add(o); DR.sm[q] = o; });
      if (!DR.spin) { DR.spin = true; const d = DR; (function s() { if (stopped || DR !== d) return; const t = performance.now() / 1000; sg.children.forEach(o => { o.rotation.y = Math.sin(t * 1.4 + o.userData.ph) * .5; }); if (T3.kick) T3.kick(60); requestAnimationFrame(s); })(); }
    }
    function drillMarks() {   // a 'safe' stage: the barred squares (attacked by Black) in red stripes
      clear(dg); drillStars(); if (!DR || !DR.safe) return; const M = stripeMat();
      for (let q = 0; q < 120; q++) { if (q & 0x88) continue; const pc = pos.b[q]; if ((!pc || !(pc & 8)) && drillDanger(pos, q)) { const t = new TH.Mesh(GEO.tile, M); const [x, z] = xz(q); t.position.set(x, Y + .007, z); t.renderOrder = 2; dg.add(t); } }
    }
    function drillLoad(o) {
      clear(sg); DR = { stars: (o.stars || []).slice(), safe: !!o.safe, lock: !!o.lock, sm: {} };
      pzLoad(o.fen.split(' ').length > 1 ? o.fen : o.fen + ' w - - 0 1', [], undefined, 0, true);
    }
    /* ---------- notes on the board (the lessons' warm-up, chess/app.js rampMarks): frames on squares and flat arrows ---------- */
    const an = new TH.Group(); board.add(an);
    const ANC = { ok: 0x2fd17a, hang: 0xff3b30, ng: 0xff3b30, '': 0xffb21a };
    const anMat = {}, am = c => anMat[c] || (anMat[c] = basic(ANC[c] != null ? ANC[c] : ANC[''], c === 'ok' || c === 'hang' ? .5 : .9));
    function annot(list) {
      clear(an); if (!list || !list.length) return;
      for (const o of list) {
        if (o.at) { const t = new TH.Mesh(GEO.tile, am(o.cls || 'ok')); const [x, z] = xz(sqOf(o.at)); t.position.set(x, Y + .012, z); t.renderOrder = 2; an.add(t); continue; }
        if (!o.arrow) continue;
        const [a, b] = o.arrow.map(q => xz(sqOf(q))), dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (!len) continue;
        const ang = Math.atan2(dx, dz), mat = am(o.cls || ''), head = .34, L = Math.max(.05, len - head - .18);
        const shaft = new TH.Mesh(new TH.BoxGeometry(.12, .01, L), mat); shaft.position.set(a[0] + Math.sin(ang) * (L / 2 + .1), Y + .05, a[1] + Math.cos(ang) * (L / 2 + .1)); shaft.rotation.y = ang;
        const tri = new TH.Shape(); tri.moveTo(-.2, 0); tri.lineTo(.2, 0); tri.lineTo(0, head); tri.lineTo(-.2, 0);
        const hg = new TH.ShapeGeometry(tri); hg.rotateX(-Math.PI / 2); hg.rotateY(Math.PI);   // (facing up, pointing along +z before the turn)
        const hm = new TH.Mesh(hg, mat); hm.position.set(a[0] + Math.sin(ang) * (L + .1), Y + .055, a[1] + Math.cos(ang) * (L + .1)); hm.rotation.y = ang;
        shaft.renderOrder = hm.renderOrder = 3; an.add(shaft, hm);
      }
    }
    const pz = {
      annot,   // [{ at: 'd5', cls: 'ok'|'hang' } | { arrow: ['d1', 'a4'], cls: ''|'ng' }] — null clears
      drill: drillLoad,   // a drill stage: { fen, stars, safe } — the player moves on until every ★ is taken (pz.left() → the ★ still to take)
      left: () => drillLeft().length,
      play: u => new Promise(res => { let m = 0; try { m = pos.fromUci(u); } catch (e) {} if (!m) return res(false); busy = true; pzOn = false; play(m, () => { if (!stopped) res(true); }); }),
      wait: pzWait,
      undo(n = 1) { timers.forEach(clearTimeout); timers.length = 0; deselect(); moves.splice(Math.max(0, moves.length - n)); refresh(); rebuild(); showMarks(); },
      mark(u) {   // the move to look at: rings on its two squares
        clear(hl); showMarks(); if (!u) return;
        let m = 0; try { m = pos.fromUci(u); } catch (e) {} if (!m) return;
        const a = mark(hl, GEO.ring, MAT.hint, m & 127, .035), b = mark(hl, GEO.ring, MAT.hint, (m >> 7) & 127, .035); mark(hl, GEO.tile, MAT.hintT, (m >> 7) & 127, .011);
        anim(560, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .16 * (1 - k); a.scale.set(s, s, s); b.scale.set(s, s, s); });
      },
      best: level => new Promise(res => {   // the engine's best move here (the defender's reply in a mate puzzle)
        const id = ++jid, w = worker || (worker = new Worker(BASE + 'engine.js' + VER));
        w.onmessage = e => { const r = e.data; if (r.id !== id || r.type !== 'result' || stopped) return; res(r.error || !r.move ? null : uciOf(r.move)); };
        w.onerror = () => { worker = null; res(null); };
        w.postMessage({ type: 'think', id, fen: startFen, moves: moves.slice(), level: level || 20 });
      }),
      load: pzLoad,
      moves: () => moves.map(uciOf),
    };
    const api = {
      human, pz,
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
            const m = r.error ? 0 : r.move; if (!m || !legal.includes(m)) return res(false);
            hintMv = m; const from = m & 127, to = (m >> 7) & 127;
            const a = mark(hl, GEO.ring, MAT.hint, from, .035), b = mark(hl, GEO.ring, MAT.hint, to, .035), g = mark(hl, GEO.tile, MAT.hintT, to, .011);
            anim(560, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .16 * (1 - k); a.scale.set(s, s, s); b.scale.set(s, s, s); });
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, fen: startFen, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
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
          hintW.postMessage({ type: 'think', id: j, fen: startFen, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
        });
      },
      draw() { if (pos && !over) finish(-1, 'draw'); },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side : human, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); closePromo();
        ctx.el.removeEventListener('click', onClick); removeEventListener('resize', onResize);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.chess._dbg === dbg) delete window.Atlas3D.chess._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {"ja":[["入門 1","入門 2","入門 3","初級 1","初級 2","初級 3","中級 1","中級 2","中級 3","上級 1","上級 2","上級 3","達人 1","達人 2","達人 3","名人 1","名人 2","名人 3","名人 4","最強"],["ときどき駒をただで取られる","ときどき駒をただで取られる","ときどき駒をただで取られる","ときどき駒をただで取られる","ときどき駒をただで取られる","2手読み","2手読み","2手読み","3手読み","3手読み","4手読み","4手読み","読み600局面","読み1,500局面","読み3,500局面","読み8,000局面","読み25,000局面","約0.5秒","約1.5秒","約4秒"]],"en":[["Novice 1","Novice 2","Novice 3","Beginner 1","Beginner 2","Beginner 3","Intermediate 1","Intermediate 2","Intermediate 3","Advanced 1","Advanced 2","Advanced 3","Expert 1","Expert 2","Expert 3","Master 1","Master 2","Master 3","Master 4","Strongest"],["drops pieces now and then","drops pieces now and then","drops pieces now and then","drops pieces now and then","drops pieces now and then","2-ply","2-ply","2-ply","3-ply","3-ply","4-ply","4-ply","600 positions","1,500 positions","3,500 positions","8,000 positions","25,000 positions","≈0.5 s","≈1.5 s","≈4 s"]],"zh":[["入门 1","入门 2","入门 3","初级 1","初级 2","初级 3","中级 1","中级 2","中级 3","高级 1","高级 2","高级 3","专家 1","专家 2","专家 3","大师 1","大师 2","大师 3","大师 4","最强"],["偶尔会白丢棋子","偶尔会白丢棋子","偶尔会白丢棋子","偶尔会白丢棋子","偶尔会白丢棋子","2层","2层","2层","3层","3层","4层","4层","搜索600局面","搜索1,500局面","搜索3,500局面","搜索8,000局面","搜索25,000局面","约0.5秒","约1.5秒","约4秒"]],"ko":[["입문 1","입문 2","입문 3","초급 1","초급 2","초급 3","중급 1","중급 2","중급 3","상급 1","상급 2","상급 3","달인 1","달인 2","달인 3","명인 1","명인 2","명인 3","명인 4","최강"],["가끔 말을 공짜로 내준다","가끔 말을 공짜로 내준다","가끔 말을 공짜로 내준다","가끔 말을 공짜로 내준다","가끔 말을 공짜로 내준다","2수","2수","2수","3수","3수","4수","4수","600 국면 탐색","1,500 국면 탐색","3,500 국면 탐색","8,000 국면 탐색","25,000 국면 탐색","약 0.5초","약 1.5초","약 4초"]],"es":[["Novato 1","Novato 2","Novato 3","Principiante 1","Principiante 2","Principiante 3","Intermedio 1","Intermedio 2","Intermedio 3","Avanzado 1","Avanzado 2","Avanzado 3","Experto 1","Experto 2","Experto 3","Maestro 1","Maestro 2","Maestro 3","Maestro 4","Máximo"],["a veces regala piezas","a veces regala piezas","a veces regala piezas","a veces regala piezas","a veces regala piezas","2 ply","2 ply","2 ply","3 ply","3 ply","4 ply","4 ply","600 posiciones","1500 posiciones","3500 posiciones","8000 posiciones","25.000 posiciones","≈0,5 s","≈1,5 s","≈4 s"]],"fr":[["Novice 1","Novice 2","Novice 3","Débutant 1","Débutant 2","Débutant 3","Intermédiaire 1","Intermédiaire 2","Intermédiaire 3","Avancé 1","Avancé 2","Avancé 3","Expert 1","Expert 2","Expert 3","Maître 1","Maître 2","Maître 3","Maître 4","Maximal"],["laisse parfois des pièces","laisse parfois des pièces","laisse parfois des pièces","laisse parfois des pièces","laisse parfois des pièces","2 demi-coups","2 demi-coups","2 demi-coups","3 demi-coups","3 demi-coups","4 demi-coups","4 demi-coups","600 positions","1 500 positions","3 500 positions","8 000 positions","25 000 positions","≈0,5 s","≈1,5 s","≈4 s"]],"pt":[["Novato 1","Novato 2","Novato 3","Iniciante 1","Iniciante 2","Iniciante 3","Intermediário 1","Intermediário 2","Intermediário 3","Avançado 1","Avançado 2","Avançado 3","Especialista 1","Especialista 2","Especialista 3","Mestre 1","Mestre 2","Mestre 3","Mestre 4","Máximo"],["às vezes entrega peças","às vezes entrega peças","às vezes entrega peças","às vezes entrega peças","às vezes entrega peças","2 meios-lances","2 meios-lances","2 meios-lances","3 meios-lances","3 meios-lances","4 meios-lances","4 meios-lances","600 posições","1.500 posições","3.500 posições","8.000 posições","25.000 posições","≈0,5 s","≈1,5 s","≈4 s"]],"de":[["Neuling 1","Neuling 2","Neuling 3","Anfänger 1","Anfänger 2","Anfänger 3","Mittel 1","Mittel 2","Mittel 3","Fortgeschritten 1","Fortgeschritten 2","Fortgeschritten 3","Experte 1","Experte 2","Experte 3","Meister 1","Meister 2","Meister 3","Meister 4","Maximal"],["stellt manchmal Figuren ein","stellt manchmal Figuren ein","stellt manchmal Figuren ein","stellt manchmal Figuren ein","stellt manchmal Figuren ein","2 Halbzüge","2 Halbzüge","2 Halbzüge","3 Halbzüge","3 Halbzüge","4 Halbzüge","4 Halbzüge","600 Stellungen","1.500 Stellungen","3.500 Stellungen","8.000 Stellungen","25.000 Stellungen","≈0,5 s","≈1,5 s","≈4 s"]],"hi":[["नौसिखिया 1","नौसिखिया 2","नौसिखिया 3","शुरुआती 1","शुरुआती 2","शुरुआती 3","मध्यम 1","मध्यम 2","मध्यम 3","उन्नत 1","उन्नत 2","उन्नत 3","विशेषज्ञ 1","विशेषज्ञ 2","विशेषज्ञ 3","उस्ताद 1","उस्ताद 2","उस्ताद 3","उस्ताद 4","सबसे मज़बूत"],["कभी-कभी मोहरे मुफ़्त दे देता है","कभी-कभी मोहरे मुफ़्त दे देता है","कभी-कभी मोहरे मुफ़्त दे देता है","कभी-कभी मोहरे मुफ़्त दे देता है","कभी-कभी मोहरे मुफ़्त दे देता है","2 अर्ध-चाल","2 अर्ध-चाल","2 अर्ध-चाल","3 अर्ध-चाल","3 अर्ध-चाल","4 अर्ध-चाल","4 अर्ध-चाल","600 स्थितियाँ","1,500 स्थितियाँ","3,500 स्थितियाँ","8,000 स्थितियाँ","25,000 स्थितियाँ","≈0.5 से","≈1.5 से","≈4 से"]],"ar":[["مبتدئ جدًا 1","مبتدئ جدًا 2","مبتدئ جدًا 3","مبتدئ 1","مبتدئ 2","مبتدئ 3","متوسط 1","متوسط 2","متوسط 3","متقدم 1","متقدم 2","متقدم 3","خبير 1","خبير 2","خبير 3","أستاذ 1","أستاذ 2","أستاذ 3","أستاذ 4","الأقوى"],["يخسر قطعًا أحيانًا","يخسر قطعًا أحيانًا","يخسر قطعًا أحيانًا","يخسر قطعًا أحيانًا","يخسر قطعًا أحيانًا","عمق 2","عمق 2","عمق 2","عمق 3","عمق 3","عمق 4","عمق 4","600 وضعية","1,500 وضعية","3,500 وضعية","8,000 وضعية","25,000 وضعية","≈0.5 ث","≈1.5 ث","≈4 ث"]], "ru": [['Новичок 1', 'Новичок 2', 'Новичок 3', 'Начальный 1', 'Начальный 2', 'Начальный 3', 'Средний 1', 'Средний 2', 'Средний 3', 'Продвинутый 1', 'Продвинутый 2', 'Продвинутый 3', 'Эксперт 1', 'Эксперт 2', 'Эксперт 3', 'Мастер 1', 'Мастер 2', 'Мастер 3', 'Мастер 4', 'Сильнейший'], ['иногда зевает фигуры', 'иногда зевает фигуры', 'иногда зевает фигуры', 'иногда зевает фигуры', 'иногда зевает фигуры', '2 полухода', '2 полухода', '2 полухода', '3 полухода', '3 полухода', '4 полухода', '4 полухода', '600 позиций', '1500 позиций', '3500 позиций', '8000 позиций', '25 000 позиций', '≈0,5 с', '≈1,5 с', '≈4 с']], "zh-TW": [['初學 1', '初學 2', '初學 3', '入門 1', '入門 2', '入門 3', '中級 1', '中級 2', '中級 3', '高級 1', '高級 2', '高級 3', '專家 1', '專家 2', '專家 3', '大師 1', '大師 2', '大師 3', '大師 4', '最強'], ['偶爾會送子', '偶爾會送子', '偶爾會送子', '偶爾會送子', '偶爾會送子', '2層', '2層', '2層', '3層', '3層', '4層', '4層', '600個局面', '1,500個局面', '3,500個局面', '8,000個局面', '25,000個局面', '約0.5秒', '約1.5秒', '約4秒']], "id": [['Pemula 1', 'Pemula 2', 'Pemula 3', 'Dasar 1', 'Dasar 2', 'Dasar 3', 'Menengah 1', 'Menengah 2', 'Menengah 3', 'Mahir 1', 'Mahir 2', 'Mahir 3', 'Ahli 1', 'Ahli 2', 'Ahli 3', 'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Terkuat'], ['kadang memberikan bidak', 'kadang memberikan bidak', 'kadang memberikan bidak', 'kadang memberikan bidak', 'kadang memberikan bidak', '2 lapis', '2 lapis', '2 lapis', '3 lapis', '3 lapis', '4 lapis', '4 lapis', '600 posisi', '1.500 posisi', '3.500 posisi', '8.000 posisi', '25.000 posisi', '≈0,5 dtk', '≈1,5 dtk', '≈4 dtk']], "tr": [['Acemi 1', 'Acemi 2', 'Acemi 3', 'Başlangıç 1', 'Başlangıç 2', 'Başlangıç 3', 'Orta 1', 'Orta 2', 'Orta 3', 'İleri 1', 'İleri 2', 'İleri 3', 'Uzman 1', 'Uzman 2', 'Uzman 3', 'Usta 1', 'Usta 2', 'Usta 3', 'Usta 4', 'En güçlü'], ['ara sıra taş kaptırır', 'ara sıra taş kaptırır', 'ara sıra taş kaptırır', 'ara sıra taş kaptırır', 'ara sıra taş kaptırır', '2 katman', '2 katman', '2 katman', '3 katman', '3 katman', '4 katman', '4 katman', '600 pozisyon', '1.500 pozisyon', '3.500 pozisyon', '8.000 pozisyon', '25.000 pozisyon', '≈0,5 sn', '≈1,5 sn', '≈4 sn']]};
  { // Lv.21–25 (2026-11-08, chess/engine.js LEVELS: time only): Lv.20 is renamed, the old top name moves to Lv.25; the descriptions of the
    // timed levels 18–25 (re-spaced the same day: about twice the time per step) are Lv.20's old one with their seconds
    const X = {"ja": ["伝説 1", "伝説 2", "伝説 3", "神域 1", "神域 2"], "en": ["Legend 1", "Legend 2", "Legend 3", "Mythic 1", "Mythic 2"], "zh": ["传说 1", "传说 2", "传说 3", "神域 1", "神域 2"], "zh-TW": ["傳說 1", "傳說 2", "傳說 3", "神域 1", "神域 2"], "ko": ["전설 1", "전설 2", "전설 3", "신화 1", "신화 2"], "es": ["Leyenda 1", "Leyenda 2", "Leyenda 3", "Mítico 1", "Mítico 2"], "fr": ["Légende 1", "Légende 2", "Légende 3", "Mythique 1", "Mythique 2"], "pt": ["Lenda 1", "Lenda 2", "Lenda 3", "Mítico 1", "Mítico 2"], "de": ["Legende 1", "Legende 2", "Legende 3", "Mythisch 1", "Mythisch 2"], "hi": ["किंवदंती 1", "किंवदंती 2", "किंवदंती 3", "मिथक 1", "मिथक 2"], "ar": ["أسطورة 1", "أسطورة 2", "أسطورة 3", "خرافي 1", "خرافي 2"], "ru": ["Легенда 1", "Легенда 2", "Легенда 3", "Миф 1", "Миф 2"], "tr": ["Efsane 1", "Efsane 2", "Efsane 3", "Mitik 1", "Mitik 2"], "id": ["Legenda 1", "Legenda 2", "Legenda 3", "Mitos 1", "Mitos 2"]}, SEC = [0.15, 0.3, 0.6, 1.25, 2.5, 5, 10, 20];
    for (const l in LVN) { const L = LVN[l], x = X[l] || X.en, top = L[0][19], d20 = L[1][19]; if (L[0].length !== 20) continue;
      L[0] = L[0].slice(0, 19).concat(x, [top]); L[1] = L[1].slice(0, 17).concat(SEC.map(n => d20.replace('4', n.toLocaleString(l === 'ar' || l === 'hi' ? 'en' : l)))); } }
  const RATING = [200, 350, 500, 650, 800, 1000, 1250, 1400, 1600, 1700, 1800, 1900, 2150, 2295, 2385, 2495, 2705, 2885, 2985, 3075, 3160, 3240, 3305, 3370, 3440];   // chess RT_LV (rated games)
  const W5 = (a, b, c, d, e, f, g) => [a, a, a, b, b, b, c, c, c, d, d, d, e, e, e, f, f, f, f, g, g, g, g, g, g];
  const WHO = {
    ja: W5('はじめての人に', '駒の動きを覚えた人に', '少し慣れてきた人に', '中級者に', '上級者に', '強豪向け', '最強レベル'),
    en: W5('for first-timers', 'once you know the moves', 'getting the hang of it', 'for club players', 'for strong players', 'for experts', 'the very strongest'),
  };
  function levelInfo(n, lang) {   // n = 1..25 (the game's level)
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], rating: RATING[n - 1], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.chess = { levels: 25, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
