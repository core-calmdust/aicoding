/* =====================================================================
   Peg Solitaire on the portal's 3D table (2026-11-11, user: 3Dで遊べるように).
   · The board card: no AI, no sides — the board to play (英国式 / 欧州式 / 三角 / ダイヤ / ドイツ式) in the size row
     (adapter.sizes 1..5 = PegEngine.IDS; adapter.solo: the card shows no level and the end card no Lv.).
   · start(ctx) plays the free game of peg/ on the table: the board's classic start hole is empty, the goal is its ◎ hole
     (the classic goal, PegEngine.goalHole) — one marble left = success, on ◎ = perfect. Input as on the page: tap a marble,
     then the hole it jumps to (the holes it can reach glow). The jumped marble rolls off into the groove.
     The action bar: 待った (any number of jumps back) and ヒント (the page's solver, ../peg/engine.js as a Worker).
     Texts: the 2D page's own strings (../peg/i18n.js → window.PEG_I18N, loaded with this file by atlas/lazy.js).
     Board and marbles: atlas/models/peg.js (the board / marble designs chosen in the portal = the 2D page's settings).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const ENG = '../peg/engine.js?v=1';
  const loadEngine = () => window.PegEngine ? Promise.resolve(window.PegEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.PegEngine ? res(window.PegEngine) : rej(new Error('engine')); s.onerror = () => rej(new Error('engine')); document.head.appendChild(s); });
  const IDS = ['english', 'french', 'triangle', 'diamond', 'german'];
  const PT = (k, lang, v) => { const D = window.PEG_I18N && PEG_I18N[k]; let s = D ? D[lang] || D.en || '' : ''; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const BOARD_LBL = { ja: '盤', en: 'Board', zh: '棋盘', 'zh-TW': '棋盤', ko: '판', es: 'Tablero', fr: 'Plateau', pt: 'Tabuleiro', de: 'Brett', ru: 'Доска', tr: 'Tahta', id: 'Papan', hi: 'बोर्ड', ar: 'اللوحة' };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- little sounds (the portal's sound switch): a clack, a roll, a chime ---------- */
  const SFX = (() => {
    const on = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on() && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      lift: () => tone(620, 900, .06, .05, 'triangle'),
      clack: () => { tone(2400, 1800, .04, .08, 'triangle'); tone(1300, 900, .05, .05, 'sine', .01); },
      roll: () => { for (let k = 0; k < 6; k++) tone(900 - k * 60, 0, .03, .03, 'triangle', k * .05); },
      nope: () => tone(300, 220, .09, .05, 'triangle'),
    };
  })();
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.pgtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#5a3b8c;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, P3 = T3.peg, lang = ctx.lang, tx = (k, v) => PT(k, lang, v);
    const bid = IDS[(ctx.size || 1) - 1] || 'english';
    let E = null, B = null, board = null, U = null, TOP = .5;
    let a = null, a0 = null, goal = -1, hist = [], pcs = {}, taken = [], sel = -1, over = false, busy = true, stopped = false, ply = 0;
    let worker = null, jid = 0, toastEl = null, toastT = 0;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const count = () => a.reduce((s, v) => s + v, 0);

    /* ---------- marks: the ◎ goal, the chosen marble, the holes it can reach, the last jump, a hint ---------- */
    const hl = new TH.Group(), basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { sel: basic(0xffc94a, .95), goal: basic(0xf1c879, .85), dest: basic(0x3fe0c4, .9), last: basic(0xffc94a, .3), hint: basic(0xff7a1a, .95) };
    const GEO = { ring: new TH.TorusGeometry(.42, .035, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24), cup: new TH.CircleGeometry(.4, 36) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cup.rotateX(-Math.PI / 2);
    function mark(geo, mat, i, y) { const m = new TH.Mesh(geo, mat), [x, z] = U.pt(i); m.position.set(x, TOP + y, z); m.renderOrder = 2; hl.add(m); kick(); return m; }
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; hl.children.forEach(m => { if (m.userData.p) { any = true; const s = .88 + k * .24; m.scale.set(s, 1, s); } }); if (any) { kick(80); requestAnimationFrame(pulse); } else pulseOn = false; }
    const pulsing = m => { m.userData.p = true; if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulse); } return m; };
    function marks(hint) {
      while (hl.children.length) hl.remove(hl.children[0]);
      if (goal >= 0 && !over) mark(GEO.ring, MAT.goal, goal, .02);
      const last = hist[hist.length - 1]; if (last && sel < 0 && !hint) { mark(GEO.cup, MAT.last, last[2], .006); }
      if (sel >= 0) mark(GEO.ring, MAT.sel, sel, .02);
      if (sel >= 0) E.moves(B, a).filter(j => j[0] === sel).forEach(j => pulsing(mark(GEO.dot, MAT.dest, j[2], .03)));
      if (hint) { pulsing(mark(GEO.ring, MAT.hint, hint[0], .06)); pulsing(mark(GEO.dot, MAT.hint, hint[2], .03)); }
      kick(200);
    }

    /* ---------- the HUD and a toast ---------- */
    function hud(msg) {
      const n = a ? count() : 0;
      ctx.hud(`<span class="hs on"><b>${n}</b>${tx('st.unit')}</span><span class="hm">${msg == null ? (goal >= 0 ? tx('st.goal') : tx('st.any')) : msg}</span><span class="hs">${tx('st.moves', { n: hist.length })}</span>`);
    }
    function toast(msg, ms) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'pgtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, ms || 2400);
    }
    const turn = () => { if (ctx.onTurn) ctx.onTurn(over ? -1 : 0, { human: true, ply }); };

    /* ---------- marbles ---------- */
    function mkMarble(i) { const m = P3.marble(i), sh = T3.contact(P3.R * 1.05, .5); sh.position.y = .014; m.add(sh); m.userData.sh = sh; board.add(m); return m; }
    function lift(g, h) { g.position.y = TOP + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .014 - h; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function inGroove(v, k) { const sh = v.userData.sh; if (sh) { v.remove(sh); sh.material.dispose(); v.userData.sh = null; } const [gx, gy, gz] = U.groove(k); v.position.set(gx, gy - P3.R * .78, gz); v.scale.setScalar(.85); v.rotation.set(0, 0, 0); }
    // the whole position at once (the start, 待った): marbles keep their own colour by the hole they started in
    function rebuild(intro) {
      Object.values(pcs).forEach(drop); taken.forEach(drop); pcs = {}; taken = [];
      // replay the history on the starting marbles so every marble keeps its colour
      const who = {}; for (let i = 0; i < B.n; i++) if (a0[i]) who[i] = i;
      const gone = [];
      hist.forEach(([f, o, t]) => { who[t] = who[f]; delete who[f]; gone.push(who[o]); delete who[o]; });
      let n = 0; const tot = Object.keys(who).length, gap = Math.min(40, 1100 / Math.max(1, tot));
      for (const k in who) {
        const i = +k, g = mkMarble(who[i]), [x, z] = U.pt(i); g.position.set(x, TOP, z); pcs[i] = g;
        if (intro) { g.visible = false; const d = 60 + (n++) * gap; later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.4), () => { lift(g, 0); land(g); if (n < 12 || Math.random() < .3) SFX.clack(); }); }, d); }
      }
      gone.forEach((i0, k) => { const v = P3.marble(i0); board.add(v); inGroove(v, k); taken.push(v); });
      kick(300);
      return intro ? 60 + n * gap + 300 : 0;
    }

    /* ---------- a jump: the marble hops over in an arc, the one jumped over rolls off into the groove ---------- */
    function select(i) { deselect(); sel = i; const g = pcs[i]; if (g) anim(130, k => lift(g, .22 * io(k))); SFX.lift(); marks(); }
    function deselect() { if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = g.userData.h0 || 0; if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = -1; }
    function jump(j) {
      busy = true; jid++; const [f, o, t] = j, g = pcs[f], v = pcs[o]; sel = -1;
      delete pcs[f]; delete pcs[o]; pcs[t] = g; a = E.apply(a, j); hist.push(j); ply++;
      while (hl.children.length) hl.remove(hl.children[0]);
      const [x0, z0] = U.pt(f), [x1, z1] = U.pt(t), h0 = g.userData.h0 || 0;
      anim(420, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * .95 + h0 * (1 - k)); g.rotation.z = -q * Math.PI * 1.2 * Math.sign(x1 - x0 || 1); },
        () => { g.rotation.z = 0; lift(g, 0); land(g); SFX.clack(); });
      if (v) later(() => {
        const [vx, vz] = U.pt(o), [gx, gy, gz] = U.groove(taken.length); taken.push(v); SFX.roll();
        const sh = v.userData.sh; if (sh) { v.remove(sh); sh.material.dispose(); v.userData.sh = null; }
        anim(620, k => { const q = io(k); v.position.x = vx + (gx - vx) * q; v.position.z = vz + (gz - vz) * q; v.position.y = TOP + (gy - P3.R * .78 - TOP) * q + Math.sin(k * Math.PI) * .45; const s = 1 - .15 * q; v.scale.set(s, s, s); v.rotation.x = q * 6; });
      }, 260);
      hud(); later(after, 520);
    }
    function after() {
      busy = false;
      if (E.moves(B, a).length) { marks(); hud(); turn(); return; }
      // no jump left: the game is over
      over = true; marks(); turn();
      const left = count(), perfect = left === 1 && goal >= 0 && !!a[goal];
      const title = left === 1 ? (perfect ? tx('res.perfect') : tx('res.one')) : left === 2 ? tx('res.two') : left === 3 ? tx('res.three') : left <= 5 ? tx('res.five') : tx('res.many');
      const score = tx('res.left', { n: left }) + (left === 1 && !perfect && goal >= 0 ? ' · ' + tx('res.goalHint') : '');
      hud(left === 1 ? tx('st.done1') : tx('st.done', { n: left }));
      if (left === 1) Object.values(pcs).forEach(g => anim(700, k => lift(g, Math.sin(k * Math.PI) * .7)));
      later(() => ctx.onEnd({ win: left === 1, draw: false, solo: true, level: 0, title: (perfect ? '👑 ' : '') + title, score, opp: tx('bd.' + bid), key: bid, why: title + ' · ' + tx('res.left', { n: left }), left, perfect }), 700);
    }

    /* ---------- input: a marble, then the hole it lands in ---------- */
    function cellOf(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      let best = -1, bd = .5; for (let i = 0; i < B.n; i++) { const [x, z] = U.pt(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function onClick(e) {
      if (busy || over || !E || (T3.wasDrag && T3.wasDrag())) return;
      const i = cellOf(e); if (i < 0) { if (sel >= 0) { deselect(); marks(); } return; }
      if (a[i]) {
        if (sel === i) { deselect(); marks(); return; }
        if (!E.moves(B, a).some(j => j[0] === i)) { SFX.nope(); toast(tx('msg.stuck')); return; }
        select(i); return;
      }
      if (sel < 0) return;
      const j = E.moves(B, a).find(m => m[0] === sel && m[2] === i);
      if (!j) { SFX.nope(); deselect(); marks(); return; }
      jump(j);
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- the hint: the page's solver in a worker (the same file) ---------- */
    function solve() {
      return new Promise(res => {
        try { if (!worker) worker = new Worker(ENG); } catch (e) { worker = null; }
        if (!worker) { res(E.findPath(B, a, { target: goal, time: 3000 })); return; }
        const id = ++jid; const on = e => { if (e.data.id !== id) return; worker.removeEventListener('message', on); res(e.data); };
        worker.addEventListener('message', on); worker.postMessage({ id, board: bid, pegs: a, target: goal, time: 6000 });
      });
    }

    /* ---------- set up ---------- */
    function setup(e) {
      if (stopped) return; E = e; B = E.BOARDS[bid];
      board = P3.board(bid); U = board.userData; TOP = U.top; board.add(hl);
      T3.show('peg', board);
      const tall = innerHeight > innerWidth * 1.15;
      if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + 1.6, y: TOP + .3, pitch: 1.0 } : { w: U.W + .4, d: U.H + 1.0, y: TOP + .3, pitch: 1.0 });
      const s = E.startHole(bid); a0 = E.startPos(B, s); a = a0.slice(); goal = E.goalHole(bid);
      hud(); const ms = rebuild(true);
      later(() => { busy = false; marks(); turn(); }, ms);
    }
    // (the engine is normally loaded with this file: set up at once, so the camera framing comes before the portal's play())
    if (window.PegEngine) setup(window.PegEngine);
    else loadEngine().then(setup).catch(() => { hud('⚠ ' + tx('msg.loadfail')); });

    const api = {
      human: 0, noResign: true,
      canUndo: () => !busy && !!hist.length,
      undo() { if (!api.canUndo()) return; jid++; sel = -1; hist.pop(); ply++; over = false; a = a0.slice(); hist.forEach(j => { a = E.apply(a, j); }); rebuild(false); marks(); hud(); turn(); },
      canHint: () => !busy && !over && !!E,
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const n0 = hist.length; deselect();
        return solve().then(r => {
          if (stopped || over || hist.length !== n0) return true;
          if (r && r.ok && r.path && r.path.length) { marks(r.path[0]); return true; }
          toast(r && r.sure ? tx('msg.dead') : tx('msg.unknown'), 3600); return true;
        });
      },
      canDraw: () => false,
      canResign: () => false,
      resign() {},
      timeout() {},
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.__pgPlay === dbg) delete window.__pgPlay;
      },
    };
    const dbg = { state: () => ({ a, hist: hist.length, over, busy, sel, left: a ? count() : 0 }), at: i => { const [x, z] = U.pt(i); return T3.project ? T3.project(x, z, TOP) : null; }, moves: () => E.moves(B, a), board: () => B, play: j => jump(j) };
    window.__pgPlay = dbg; api._debug = dbg;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.peg = {
    levels: 0, solo: true, table: false, sizes: [1, 2, 3, 4, 5], size0: 1,
    sizeLabel: lang => BOARD_LBL[lang] || BOARD_LBL.en,
    sizeName: (z, lang) => PT('bd.' + IDS[z - 1], lang) || IDS[z - 1],
    start,
  };
})();
