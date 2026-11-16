/* =====================================================================
   Patolli — the 3D toolkit shared by the portal's table play (atlas/games/patolli.js) and the rules course
   (atlas/rules/patolli.js), on the six boards and six sets of atlas/models/patolli.js (Table3D.patolli).
     PatolliKit.make(ctx.Table3D, opts) → kit      opts: { rule: 'bell' | 'popular', top, stage, sfx(k), speed(), labels(k) }
       kit.board / U / Y               the board group, its userData, the height of the mat
       kit.setRule(rule)               the other track (60 / 52 squares): the board is built again
       kit.sync(state[, shown])        pieces, stakes exactly as the engine state says (shown: { gold, pool } to draw instead)
       kit.move(side, from, to, opt)   → Promise: lift, hop square by square along the track, set down; a captured piece
                                         (popular rules, a centre square) flies back to its owner's waiting tray
       kit.roll(side, beans)           → Promise: the five beans thrown in from the roller's side, settling as rolled
       kit.restBeans(beans | null)     the beans at rest (null: no marks up); kit.beansBig(on, ms) the large place (opts.stage)
       kit.pay(from, to, amt)          → Promise: beads fly from one heap to another (0 | 1 | 'pool'); the heaps are not changed
       kit.gems(gold, pool)            the three heaps
       kit.labels(host, map)           the numbers of the heaps and the names of the trays (DOM, placed by projection)
       kit.marks.{ clear, cell, ring, dot, glow, tray, path, spot }
       kit.hit(event) → { r, c } | { tray: 'start' | 'goal', side } | null
       kit.projCell / projPiece / projSlot / projBean / projSpot → screen points (tests, the labels)
       kit.cancel()                    stops every running animation where it is (then sync())
       kit.stop()
   World units = the 2D page's SVG units / 100: x to the right, z towards the near player (side 0, red). The squares are the
   engine's grid (PatolliEngine.coords → [row, col]) turned 45°, through the board's own userData.cell.
   Rendering is on demand (Table3D.kick while anything moves).
   ===================================================================== */
(function () {
  'use strict';
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  function make(T3, opts = {}) {
    const TH = window.THREE, K3 = T3.patolli, E = new Proxy({}, { get: (_, k) => window.PatolliEngine[k] });   // (the engine may load after the board)
    const holder = new TH.Group();
    let rule = opts.rule === 'popular' ? 'popular' : 'bell', board = null, U = null, Y = 0, stopped = false;
    const tall = innerHeight > innerWidth * 1.15;
    // framing: the whole mat (the trays, the beans and the stakes lie in the gaps of the X); the course looks straight down
    const fit0 = opts.top ? { w: 10.3, d: 10.3, y: 0, pitch: 1.5703 } : tall ? { w: 10.5, d: 11.4, up: .95, y: 0, pitch: 1.5 } : { w: 11, d: 10.9, y: 0, pitch: 1.32 };
    let ep = 0;   // cancel(): every running animation stops where it is (the rules course turning a page mid-move); the caller then sync()s
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(), e0 = ep; (function s(n) { if (stopped || e0 !== ep) return res(); const k = Math.min(1, Math.max(0, (n - t0) / Math.max(1, dur))); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const spd = () => Math.max(.4, opts.speed ? opts.speed() : 1);
    const RL = () => E.RULES[rule];

    /* ---------- the board ---------- */
    const P = [[], []];        // P[side][k] = { g, pos, h }
    const marksG = new TH.Group(), beansG = new TH.Group(), heapsG = new TH.Group();
    holder.add(marksG); holder.add(beansG); holder.add(heapsG);
    function build() {
      if (board) holder.remove(board);
      board = K3.board(undefined, rule); U = board.userData; Y = U.top; holder.add(board);
      marksG.position.y = 0; fit0.y = Y;
    }
    build();
    T3.show('patolli', holder); if (T3.play) T3.play(true);
    if (T3.fit) T3.fit(fit0);
    let last = null;
    function setRule(r) {
      r = r === 'popular' ? 'popular' : 'bell'; if (r === rule) return;
      rule = r; build(); marks.clear(); GEO = null;
      for (const side of [0, 1]) { P[side].forEach(o => holder.remove(o.g)); P[side].length = 0; }
      for (const k in HEAPS) { HEAPS[k].n = -1; }
      BEANS.forEach(b => { b.g.position.y = Y; });
      last = null; T3.kick(400);
    }

    /* ---------- where things stand ---------- */
    const dirOf = side => last && last.dir ? last.dir[side] : 1;
    const cellXZ = (r, c) => U.cell(r, c);
    const sqXZ = (side, i, dir) => { const q = E.coords(rule, side, i, dir || dirOf(side)); return U.cell(q[0], q[1]); };
    const slot = (side, kind, k) => { const p = U.tray(side, kind, k); return [p[0], Y, p[1]]; };
    function where(state, side, k) {
      const ps = state.pos[side], p = ps[k], L = RL().L;
      if (p <= 0) { const j = ps.slice(0, k).filter(q => q <= 0).length; return slot(side, 'start', j); }
      if (p > L) { const j = ps.slice(0, k).filter(q => q > L).length; return slot(side, 'goal', j); }
      const xz = sqXZ(side, p, state.dir ? state.dir[side] : 1); return [xz[0], Y, xz[1]];
    }

    /* ---------- pieces ---------- */
    function mkPiece(side, k) {
      const g = new TH.Group(), p = K3.piece(side, undefined, k); g.add(p);
      const sh = T3.contact(K3.PR * .98, .5); sh.position.y = .003; g.add(sh);
      g.userData = { p, sh }; holder.add(g); return g;
    }
    function setH(o, h) { o.h = h; o.g.userData.p.position.y = h; const sh = o.g.userData.sh, s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2); }
    function sync(state, shown) {
      last = { rule: state.rule, pos: [state.pos[0].slice(), state.pos[1].slice()], dir: state.dir ? state.dir.slice() : [1, 1] };
      for (const side of [0, 1]) {
        const n = state.pos[side].length;
        while (P[side].length > n) { const o = P[side].pop(); holder.remove(o.g); }
        while (P[side].length < n) P[side].push({ g: mkPiece(side, P[side].length), pos: 0, h: 0 });
        P[side].forEach((o, k) => { const [x, y, z] = where(state, side, k); o.g.position.set(x, y, z); o.g.rotation.set(0, 0, 0); o.g.userData.p.scale.set(1, 1, 1); o.pos = state.pos[side][k]; setH(o, 0); });
      }
      const s = shown || state; if (s.gold) gems(s.gold, s.pool);
      T3.kick(300);
    }
    // another set of pieces chosen while the board is up (Table3D.PIECES.patolli, the board view's 駒 row)
    function setSet() {
      for (const side of [0, 1]) P[side].forEach((o, k) => { o.g.remove(o.g.userData.p); const p = K3.piece(side, undefined, k); p.position.y = o.h; o.g.add(p); o.g.userData.p = p; });
      T3.kick(200);
    }
    function lift(side, k, on) {
      const o = P[side][k]; if (!o) return; const h0 = o.h, h1 = on ? .22 : 0;
      if (Math.abs(h0 - h1) < .001) return;
      anim(on ? 140 : 110, q => setH(o, h0 + (h1 - h0) * io(q)));
    }
    async function move(side, from, to, opt = {}) {
      if (!last) return; const e0 = ep, off = () => stopped || e0 !== ep;
      const k = last.pos[side].findIndex(p => p === from); if (k < 0) return;
      const o = P[side][k], L = RL().L, sp = spd();
      const pts = [o.g.position.clone()];
      for (let i = Math.max(1, from + 1); i <= Math.min(to, L); i++) { const xz = sqXZ(side, i); pts.push(new TH.Vector3(xz[0], Y, xz[1])); }
      if (to > L) { const j = last.pos[side].filter(p => p > L).length, s = slot(side, 'goal', j); pts.push(new TH.Vector3(s[0], s[1], s[2])); }
      let vic = null;
      if (opt.capture && to <= L) {
        const op = 1 - side, q = E.qOf(RL(), side, to, dirOf(side));
        const vk = last.pos[op].findIndex(p => p >= 1 && p <= L && E.qOf(RL(), op, p, dirOf(op)) === q);
        if (vk >= 0) vic = { o: P[op][vk], side: op, k: vk };
      }
      const H = .34, h0 = o.h;
      await anim(140 / sp, q => setH(o, h0 + (H - h0) * io(q))); if (off()) return;
      const n = pts.length - 1, leg = (n > 6 ? 105 : n > 3 ? 135 : 170) / sp;
      for (let i = 0; i < n && !off(); i++) {
        const a = pts[i], b = pts[i + 1], far = a.distanceTo(b) > U.u * 1.6;   // (from / to a tray: a longer arc)
        await anim(far ? leg * 2.2 : leg, q => { const e = io(q); o.g.position.set(a.x + (b.x - a.x) * e, Y, a.z + (b.z - a.z) * e); setH(o, H + Math.sin(q * Math.PI) * (far ? .5 : .07)); });
        if (off()) return; if (opt.onStep) opt.onStep(i + 1, n);
      }
      let vp = null;
      if (vic && vic.o) {   // captured: up, over and down into its owner's waiting tray
        const ns = { pos: [last.pos[0].slice(), last.pos[1].slice()], dir: last.dir }; ns.pos[side][k] = to; ns.pos[vic.side][vic.k] = 0;
        const [tx, , tz] = where(ns, vic.side, vic.k), vo = vic.o, s0 = vo.g.position.clone();
        if (opt.onHit) opt.onHit();
        vp = anim(560 / sp, q => { const e = io(q); vo.g.position.set(s0.x + (tx - s0.x) * e, Y, s0.z + (tz - s0.z) * e); setH(vo, Math.sin(q * Math.PI) * 1.0); })
          .then(() => { if (!off()) { setH(vo, 0); vo.pos = 0; } });
        last.pos[vic.side][vic.k] = 0;
      }
      await anim(140 / sp, q => setH(o, H * (1 - io(q)))); if (off()) return;
      o.pos = to; last.pos[side][k] = to;
      if (opt.onLand) opt.onLand();
      await anim(110 / sp, q => { const s = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.p.scale.set(s, 1 / s, s); }); if (off()) return;
      o.g.userData.p.scale.set(1, 1, 1);
      if (vp) await vp;
    }

    /* ---------- the beans: five, at rest in the gap on the left ---------- */
    /* opts.stage (the rules course): the beans are thrown large over the middle of the mat, where their marks can be counted,
       then step aside to their own gap */
    const BEANS = [];
    const BIG = tall ? 2.3 : 1.7;
    let big = false;
    const beanAt = (i, isBig) => isBig ? [(i - 2) * .78 * BIG, 0] : U.beanAt(i);
    function ensureBeans() {
      while (BEANS.length < 5) {
        const g = new TH.Group(), d = K3.bean(); g.add(d);
        const sh = T3.contact(K3.BEAN[0] * .95, .45); sh.position.y = .003; sh.scale.z = .7; g.add(sh);
        g.position.y = Y; beansG.add(g); BEANS.push({ g, d, sh, rest: d.userData.rest, yaw: BEANS.length * 1.9 + .4, up: 0 });
      }
    }
    function restBeans(d) {
      ensureBeans();
      BEANS.forEach((b, i) => {
        const xz = beanAt(i, big); b.g.position.set(xz[0], Y + (big ? .05 : 0), xz[1]); b.g.scale.setScalar(big ? BIG : 1); b.d.position.set(0, b.rest, 0);
        b.up = d && d[i] ? 1 : 0; K3.beanUp(b.d, !!b.up, b.yaw); b.sh.scale.set(1, 1, .7); b.sh.material.opacity = .45; b.g.visible = true;
      });
      T3.kick(200);
    }
    function beansBig(on, ms = 420) {
      if (!opts.stage || on === big) return Promise.resolve();
      ensureBeans(); const from = BEANS.map(b => [b.g.position.x, b.g.position.z, b.g.scale.x]); big = on;
      const to = BEANS.map((b, i) => beanAt(i, on)), s1 = on ? BIG : 1, y1 = Y + (on ? .05 : 0);
      const set = e => BEANS.forEach((b, i) => { b.g.position.set(from[i][0] + (to[i][0] - from[i][0]) * e, y1 + Math.sin(e * Math.PI) * .4, from[i][1] + (to[i][1] - from[i][1]) * e); b.g.scale.setScalar(from[i][2] + (s1 - from[i][2]) * e); });
      if (!ms) { set(1); T3.kick(200); return Promise.resolve(); }
      const e0 = ep; return anim(ms, q => set(io(q))).then(() => { if (e0 === ep) { set(1); T3.kick(200); } });
    }
    async function roll(side, d) {
      ensureBeans();
      const sgn = side === 0 ? 1 : -1;
      const items = BEANS.map((b, i) => {
        const xz = beanAt(i, big); b.yaw = Math.random() * Math.PI * 2; b.g.position.y = Y + (big ? .05 : 0); b.g.scale.setScalar(big ? BIG : 1); b.g.visible = true; b.up = d[i] ? 1 : 0;
        return { g: b.g, d: b.d, sh: b.sh, from: big ? [xz[0] + (Math.random() - .5) * 1.6, xz[1] + sgn * (3.2 + Math.random() * .8)] : [xz[0] - .5 - Math.random() * .9, xz[1] + sgn * (2 + Math.random() * .8)], to: xz, marked: !!d[i], rest: b.rest, yaw: b.yaw };
      });
      const TP = K3.throwPlan(items, { dur: 900 / spd(), onHit: () => { if (opts.sfx) opts.sfx('beanHit'); } });
      if (opts.sfx) opts.sfx('roll');
      const e0 = ep; await anim(TP.total, k => TP.frame(k * TP.total)); if (e0 !== ep) return;
      TP.end(); BEANS.forEach(b => { b.sh.scale.set(1, 1, .7); });
      T3.kick(200);
    }

    /* ---------- the stakes: heaps of turquoise beads (each player's and the pool) ---------- */
    const HEAPS = {};
    function heapOf(name) { if (HEAPS[name]) return HEAPS[name]; const g = new TH.Group(); heapsG.add(g); return (HEAPS[name] = { g, n: -1, ms: [] }); }
    const spotName = w => w === 'pool' ? 'pool' : 'gold' + w;
    function gems(gold, pool) {
      for (const [name, n] of [['gold0', gold[0]], ['gold1', gold[1]], ['pool', pool]]) {
        const hp = heapOf(name), xz = U.spot(name); hp.g.position.set(xz[0], Y, xz[1]);
        if (hp.n === n) continue; hp.n = n;
        const Q = K3.heap(n);
        while (hp.ms.length < Q.length) { const m = K3.gem(); hp.g.add(m); hp.ms.push(m); }
        hp.ms.forEach((m, i) => { m.visible = i < Q.length; if (i < Q.length) m.position.set(Q[i][0], Q[i][1], Q[i][2]); });
      }
      T3.kick(200);
    }
    // a payment: up to six beads fly in an arc from one heap to the other (the heaps themselves are set by gems())
    async function pay(from, to, amt) {
      const a = U.spot(spotName(from)), b = U.spot(spotName(to)), n = Math.max(1, Math.min(6, amt | 0)), fly = [];
      for (let i = 0; i < n; i++) { const m = K3.gem(); m.scale.setScalar(1.35); m.visible = false; holder.add(m); fly.push(m); }
      const D = 520 / spd(), gap = 70 / spd();
      await anim(D + gap * (n - 1), q => {
        const t = q * (D + gap * (n - 1));
        fly.forEach((m, i) => { const k = Math.min(1, Math.max(0, (t - i * gap) / D)), e = io(k); m.visible = k > 0 && k < 1; m.position.set(a[0] + (b[0] - a[0]) * e, Y + .12 + Math.sin(k * Math.PI) * 1.1, a[1] + (b[1] - a[1]) * e); });
      });
      fly.forEach(m => holder.remove(m)); T3.kick(200);
    }

    /* ---------- marks ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    let GEO = null;
    const geo = () => {
      if (GEO) return GEO; const u = U.u;
      GEO = { sq: new TH.PlaneGeometry(u * .94, u * .94), ring: new TH.TorusGeometry(K3.PR * 1.22, .034, 8, 44), dot: new TH.CircleGeometry(.075, 20), slot: new TH.CircleGeometry(K3.PR * 1.25, 32), spot: new TH.RingGeometry(.52, .6, 40) };
      GEO.sq.rotateX(-Math.PI / 2); GEO.sq.rotateY(Math.PI / 4); GEO.ring.rotateX(Math.PI / 2); GEO.dot.rotateX(-Math.PI / 2); GEO.slot.rotateX(-Math.PI / 2); GEO.spot.rotateX(-Math.PI / 2);
      return GEO;
    };
    const MATC = {}, mat = (c, op) => MATC[c + ':' + op] || (MATC[c + ':' + op] = basic(c, op));
    const marks = {
      clear() { while (marksG.children.length) { const m = marksG.children[0]; if (m.userData.pulseOp) m.material.dispose(); marksG.remove(m); } T3.kick(120); },
      cell(r, c, color = 0x3df59a, op = .4) { const m = new TH.Mesh(geo().sq, mat(color, op)), xz = cellXZ(r, c); m.position.set(xz[0], Y + .006, xz[1]); m.renderOrder = 2; marksG.add(m); T3.kick(120); return m; },
      ring(r, c, color = 0x3df59a) { const m = new TH.Mesh(geo().ring, mat(color, .95)), xz = cellXZ(r, c); m.position.set(xz[0], Y + .02, xz[1]); m.renderOrder = 3; m.userData.pulse = 1; marksG.add(m); T3.kick(120); return m; },
      dot(r, c, color = 0xffe27a, s = 1) { const m = new TH.Mesh(geo().dot, mat(color, .95)), xz = cellXZ(r, c); m.position.set(xz[0], Y + .012, xz[1]); m.scale.setScalar(s); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      glow(r, c, color = 0xffd65a, op = .55) { const xz = cellXZ(r, c), m = new TH.Mesh(geo().sq, basic(color, op)); m.position.set(xz[0], Y + .007, xz[1]); m.renderOrder = 2; m.userData.pulseOp = op; marksG.add(m); T3.kick(120); return m; },
      tray(side, kind, color = 0x3df59a, k = 0) { const s = slot(side, kind, Math.max(0, k)), m = new TH.Mesh(geo().slot, mat(color, .5)); m.position.set(s[0], Y + .005, s[2]); m.renderOrder = 2; m.userData.pulse = 1; marksG.add(m); T3.kick(120); return m; },
      // the track of `side` from index a to b: a chain of dots (the last one larger)
      path(side, a, b, color = 0xffe27a, dir) { const L = RL().L; for (let i = Math.max(1, a); i <= Math.min(b, L); i++) { const q = E.coords(rule, side, i, dir || dirOf(side)); marks.dot(q[0], q[1], color, i === b ? 1.7 : 1); } },
      spot(name, color = 0xffffff) { const xz = name === 'dock' && big ? [0, 0] : U.spot(name), m = new TH.Mesh(geo().spot, mat(color, .9)); m.position.set(xz[0], Y + .01, xz[1]); if (name === 'dock') m.scale.set(big ? 3.4 : 1.55, 1, big ? 1.6 : 1.9); m.renderOrder = 3; m.userData.pulse = 1; marksG.add(m); T3.kick(120); return m; },
      group: marksG,
    };
    let pulseOn = false;
    function pulse() {
      if (stopped || !marksG.children.length) { pulseOn = false; return; }
      const k = .5 + .5 * Math.sin(performance.now() / 260);
      marksG.children.forEach(m => { if (m.userData.pulse && m.geometry !== (GEO && GEO.spot)) m.scale.setScalar(.92 + k * .14); if (m.userData.pulseOp) m.material.opacity = m.userData.pulseOp * (.35 + .65 * k); });
      T3.kick(60); requestAnimationFrame(pulse);
    }
    const _add = marksG.add.bind(marksG);
    marksG.add = (...a) => { const r = _add(...a); if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulse); } return r; };

    /* ---------- taps ---------- */
    function hit(ev) {
      const p = T3.pick(ev, Y); if (!p) return null;
      const a = RL().arm, u = U.u * Math.SQRT2, gx = (p.x + p.z) / u, gy = (p.z - p.x) / u;
      const c = Math.floor(gx + a + 1), r = Math.floor(gy + a + 1), n = 2 * a + 2;
      if (r >= 0 && c >= 0 && r < n && c < n && (r === a || r === a + 1 || c === a || c === a + 1)) return { r, c };
      let best = null, bd = .62;
      for (const side of [0, 1]) for (const kind of ['start', 'goal']) for (let k = 0; k < 6; k++) { const s = slot(side, kind, k), d = Math.hypot(s[0] - p.x, s[2] - p.z); if (d < bd) { bd = d; best = { tray: kind, side }; } }
      if (best) return best;
      const dk = big ? [0, 0] : U.spot('dock'); if (Math.abs(p.x - dk[0]) < (big ? 2.4 : 1.1) && Math.abs(p.z - dk[1]) < 1.25) return { dock: true };
      return null;
    }
    function project(x, y, z) { const v = new TH.Vector3(x, y, z); holder.updateMatrix(); v.applyMatrix4(holder.matrix); return T3.project(v.x, v.z, v.y); }
    const projCell = (r, c) => { const xz = cellXZ(r, c); return project(xz[0], Y, xz[1]); };
    const projPiece = (side, k) => { const o = P[side][k]; return o ? project(o.g.position.x, o.g.position.y, o.g.position.z) : null; };
    const projSlot = (side, kind, k = 0) => { const s = slot(side, kind, k); return project(s[0], s[1], s[2]); };
    const projBean = i => { const b = BEANS[i]; return b && b.g.visible ? project(b.g.position.x, b.g.position.y, b.g.position.z) : null; };
    const projSpot = name => { const xz = U.spot(name); return project(xz[0], Y, xz[1]); };
    const projXZ = (x, z) => project(x, Y, z);

    /* ---------- the words on the mat (DOM, placed by projection): the numbers of the three heaps, the names of the trays ---------- */
    // labels(host, { gold0: [caption, n], gold1: [caption, n], pool: [caption, n, 'r' = on one line], start0: [caption], goal0: …, start1: …, goal1: … })
    const LB = {}; let lbT = 0, lbCss = null, onPlace = null;
    function labels(host, map) {
      if (stopped) return;
      if (!lbCss) {
        lbCss = document.createElement('style');
        lbCss.textContent = '.ptl{position:absolute;left:0;top:0;z-index:1;pointer-events:none;display:flex;flex-direction:column;align-items:center;direction:ltr;gap:1px;font:800 11px/1.15 var(--font,system-ui),sans-serif;color:#fff8e4;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.75);white-space:nowrap;text-align:center}'
          + '.ptl b{font:900 19px/1 var(--round,inherit);font-variant-numeric:tabular-nums}.ptl.t{font-size:10px;opacity:.92}.ptl.up b{animation:ptlU .5s ease-out}@keyframes ptlU{30%{transform:scale(1.5);color:#ffe27a}}'
          + '@media (max-width:560px){.ptl{font-size:9.5px}.ptl b{font-size:15px}.ptl.t{font-size:8.5px}}'
          + '.ptl.r{flex-direction:row;align-items:baseline;gap:4px}'   // (.r: caption and number on one line — the pool on a small board)
          + '.ptl.c span{display:none}.ptl.c b{font-size:13px}.ptl.t.c{visibility:hidden}';   // (.c: a small board — the numbers alone)
        document.head.appendChild(lbCss); lbT = setInterval(place, 160);
      }
      const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      for (const k in map) {
        let e = LB[k]; const v = map[k], num = v.length > 1;
        if (!e) { e = LB[k] = document.createElement('div'); e.className = 'ptl' + (num ? '' : ' t'); (host || document.body).appendChild(e); }
        const h = num ? `<span>${esc(v[0]).replace(/\n/g, '<br>')}</span><b>${v[1]}</b>` : esc(v[0]);   // (\n: a second line — the round above the pool's name)
        if (num && e.dataset.n != null && e.dataset.n !== String(v[1])) { e.classList.remove('up'); void e.offsetWidth; e.classList.add('up'); }
        if (num) e.dataset.n = v[1];
        e.classList.toggle('r', v[2] === 'r');
        if (e.dataset.h !== h) { e.dataset.h = h; e.innerHTML = h; }
      }
      place();
    }
    function place() {
      if (stopped) return;
      // mode: 'up' = the label ends at the point, 'down' = it starts there, 'left' = it ends left of the point (centred on its height)
      const put = (e, p, mode) => { if (!e) return; if (!p || !isFinite(p.x)) { e.style.display = 'none'; return; } e.style.display = ''; const w = e.offsetWidth, h = e.offsetHeight;
        const x = mode === 'left' ? p.x - w : p.x - w / 2, y = mode === 'up' ? p.y - h : mode === 'left' ? p.y - h / 2 : p.y;
        e.style.transform = `translate(${Math.round(Math.max(2, Math.min(innerWidth - w - 2, x)))}px, ${Math.round(y)}px)`; };
      const o0 = projXZ(0, 0), o1 = projXZ(1, 0), small = !!(o0 && o1) && Math.hypot(o1.x - o0.x, o1.y - o0.y) < 30;   // (px per square of the mat's own units)
      for (const k in LB) LB[k].classList.toggle('c', small);
      const g0 = U.spot('gold0'), g1 = U.spot('gold1'), pl = U.spot('pool');
      // the stakes lie in the right gap of the X: your number above your heap, the rival's below its heap, the pool's to the left of it
      put(LB.gold0, projXZ(g0[0], g0[1] - .4), 'up'); put(LB.gold1, projXZ(g1[0], g1[1] + .36), 'down'); put(LB.pool, projXZ(pl[0] - .42, pl[1]), 'left');
      for (const s of [0, 1]) for (const kd of ['start', 'goal']) { const a = U.tray(s, kd, 1), b = U.tray(s, kd, 4); put(LB[kd + s], projXZ(a[0], s === 0 ? Math.min(a[1], b[1]) - .36 : Math.max(a[1], b[1]) + .36), s === 0 ? 'up' : 'down'); }
      if (onPlace) try { onPlace(); } catch (e) {}
    }

    return {
      get board() { return board; }, get U() { return U; }, get Y() { return Y; }, get rule() { return rule; }, tall, fit0, holder,
      cancel: () => { ep++; T3.kick(200); }, setRule, sync, setSet, move, lift, roll, restBeans, beansBig, isBig: () => big, pay, gems, marks, hit, project, projCell, projPiece, projSlot, projBean, projSpot, projXZ,
      pieces: P, beans: BEANS, heaps: HEAPS, cellXZ, sleep, anim,
      beansUp: () => BEANS.map(b => K3.beanIsUp(b.d)),
      labels, place, onPlace(f) { onPlace = f; },
      stop() { stopped = true; clearInterval(lbT); if (lbCss) lbCss.remove(); for (const k in LB) LB[k].remove(); },
    };
  }
  window.PatolliKit = { make };
})();
