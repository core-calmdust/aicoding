/* =====================================================================
   The Royal Game of Ur — the 3D toolkit shared by the portal's table play
   (atlas/games/ur.js) and the rules tour (atlas/rules/ur.js), on the
   British Museum board (atlas/models/ur.js).
     UrKit.make(ctx.Table3D, opts) → kit
       kit.board / U / Y              the board group, its userData, the playing surface height
       kit.sync(state)                pieces exactly as the engine state says (placed, no animation)
       kit.move(side, from, to, cap)  → Promise: lift, hop square by square along the route, set down; a hit piece goes home
       kit.roll(side, dice)           → Promise: four tetrahedra thrown in beside the side's block, settling as rolled
       kit.restDice(side, dice|null)  dice at rest (null: plain tips up)
       kit.lift(side, k, on)          the selected piece lifted / set down
       kit.marks.{ clear(), cell(r,c,color,op), ring(r,c,color), tray(side, kind, color), arrow(pts) }
       kit.hit(event) → { r, c } | { tray: 'start'|'goal', side } | null   (a tap on the table → square / tray)
       kit.project(r, c) → screen point (tests, the tour's pointer)
       kit.stop()
   Board coordinates: the model's own (horizontal; row 0 = Dark's lane far, row 2 = Light's lane near).
   On a phone held upright the camera is rolled so the long side runs up the screen: big block at the bottom, Light's lane on the right.
   Rendering is on demand (Table3D.kick while anything moves).
   ===================================================================== */
(function () {
  'use strict';
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  function make(T3, opts = {}) {
    const TH = window.THREE, E = new Proxy({}, { get: (_, k) => window.UrEngine[k] });   // (the engine may load after the board)
    const board = T3.MODELS.ur(true), U = board.userData, Y = U.top;
    const rule = opts.rule || 'finkel';
    T3.show('ur', board); if (T3.play) T3.play(true);   // the play camera (the rules tour needs it; table play sets it too)
    // framing: the whole board with the trays, from the player's side; an upright phone: the board turned, the camera rolled
    const tall = innerHeight > innerWidth * 1.15;
    const ROT = 0;   // (an upright phone: the camera is rolled instead — the long board runs up the screen)
    // upright phone (2026-11-05, as the 2D game's 'vf' board): the board turned half round — the big block at the bottom, your lane
    // (Light) on the right. The camera is rolled the other way (roll: -1, screen up = world +x), which keeps Light's lane on the
    // right by itself, so the rows stay as they are
    const FL = false, rowOf = r => FL ? 2 - r : r, sideOf = s => FL ? 1 - s : s;
    const W = U.W + 1.6, D = U.D + 2.4;   // the trays and dice beside the long sides
    // opts.top (the rules tour): straight down, one view for every page; opts.stage: room for the large dice beside the small block (PC)
    const PT = opts.top ? 1.5703 : 0;
    // (fit's w / d are the extents across / up the screen: rolled, the board's length runs up it — as mancala's upright view)
    if (T3.fit) T3.fit(tall ? { w: U.D + 1.5, d: U.W + 1.1, y: Y, pitch: PT || 1.5, roll: -1 } : { w: opts.stage ? U.W + 3.2 : U.W + .5, d: U.D + 1.9, y: Y, pitch: PT || 1.2 });   // (PC: the board about as large as the other tours' boards; trays and dice just inside the view)
    let stopped = false;
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const spd = () => Math.max(.4, opts.speed ? opts.speed() : 1);

    /* ---------- where things stand ---------- */
    const route = side => E.pathOf(rule, side);
    const goalN = () => E.RULES[rule].goal;
    const cellXZ = (r, c) => U.pt(rowOf(r), c);
    // slots off the board (k = 0..6): start beside the big block, goal stacked in the notch beside the bridge
    function slot(side, kind, k) { if (kind === 'start') { const [x, z] = U.start(sideOf(side), k); return [x, 0, z]; } const g = U.goal(sideOf(side), k); return [g[0], g[1], g[2]]; }

    /* ---------- pieces ---------- */
    const P = [[], []];   // P[side][k] = { g, pos, h }
    let design = opts.design || 'orig';
    function mkPiece(side) {
      const g = new TH.Group(), p = U.piece(side, design); g.add(p);
      const sh = T3.contact(U.PR * .95, .5); sh.position.y = .002; g.add(sh);
      g.userData = { p, sh }; board.add(g); return g;
    }
    function setH(o, h) { o.h = h; o.g.userData.p.position.y = h; const sh = o.g.userData.sh, s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2); }
    function where(state, side, k) {   // [x, y, z] of piece k of `side` in `state`
      const ps = state.pos[side], p = ps[k], goal = goalN();
      if (p <= 0) { const j = ps.slice(0, k).filter(q => q <= 0).length; return slot(side, 'start', j); }
      if (p >= goal) { const j = ps.slice(0, k).filter(q => q >= goal).length; return slot(side, 'goal', j); }
      const [r, c] = route(side)[p - 1], [x, z] = cellXZ(r, c); return [x, Y, z];
    }
    let last = null;
    function sync(state) {
      last = { rule: state.rule, pos: [state.pos[0].slice(), state.pos[1].slice()] };
      for (const side of [0, 1]) {
        const n = state.pos[side].length;
        while (P[side].length > n) { const o = P[side].pop(); board.remove(o.g); }
        while (P[side].length < n) P[side].push({ g: mkPiece(side), pos: 0, h: 0 });
        P[side].forEach((o, k) => { const [x, y, z] = where(state, side, k); o.g.position.set(x, y, z); o.g.rotation.set(0, (k * 1.7 + side) % 6.28, 0); o.pos = state.pos[side][k]; setH(o, 0); });
      }
      T3.kick(300);
    }
    function setDesign(d) {
      if (!d || d === design) return; design = d;
      for (const side of [0, 1]) P[side].forEach(o => { o.g.remove(o.g.userData.p); const p = U.piece(side, design); o.g.add(p); o.g.userData.p = p; });
      T3.kick(200);
    }
    function lift(side, k, on) {
      const o = P[side][k]; if (!o) return; const h0 = o.h, h1 = on ? .24 : 0;
      if (Math.abs(h0 - h1) < .001) return;
      anim(on ? 140 : 110, q => setH(o, h0 + (h1 - h0) * io(q)));
    }
    // a move: lift, hop square by square along the route (each square a small dip), set down; the hit piece flies home
    async function move(side, from, to, opt = {}) {
      if (!last) return;
      const k = last.pos[side].findIndex(p => p === from); if (k < 0) return;
      const o = P[side][k], R = route(side), goal = goalN(), sp = spd(), fast = opt.fast;
      const pts = [o.g.position.clone()];
      for (let i = Math.max(1, from + 1); i <= Math.min(to, goal - 1); i++) { const [r, c] = R[i - 1], [x, z] = cellXZ(r, c); pts.push(new TH.Vector3(x, Y, z)); }
      if (to >= goal) { const j = last.pos[side].filter(p => p >= goal).length, s = slot(side, 'goal', j); pts.push(new TH.Vector3(s[0], s[1], s[2])); }
      // the rival piece on the square reached
      let vic = null;
      if (opt.capture && to < goal) {
        const [r, c] = R[to - 1], op = 1 - side, Ro = route(op);
        const vk = last.pos[op].findIndex(p => p > 0 && p < goal && Ro[p - 1][0] === r && Ro[p - 1][1] === c);
        if (vk >= 0) vic = { o: P[op][vk], side: op, k: vk };
      }
      const H = .34, h0 = o.h;
      if (opt.onLift) opt.onLift();
      await anim(140 / sp, q => setH(o, h0 + (H - h0) * io(q)));
      const leg = (fast ? 110 : 170) / sp;
      for (let i = 0; i < pts.length - 1 && !stopped; i++) {
        const a = pts[i], b = pts[i + 1];
        await anim(leg, q => { const e = io(q); o.g.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, a.z + (b.z - a.z) * e); setH(o, H + Math.sin(q * Math.PI) * .07); });
        if (opt.onStep) opt.onStep(i + 1, pts.length - 1);
      }
      let vp = null;
      if (vic && vic.o) {   // knocked off: up, over and down into its start tray
        const ns = { pos: [last.pos[0].slice(), last.pos[1].slice()] }; ns.pos[side][k] = to; ns.pos[vic.side][vic.k] = 0;
        const [tx, ty, tz] = where(ns, vic.side, vic.k), vo = vic.o, s0 = vo.g.position.clone();
        if (opt.onHit) opt.onHit();
        vp = anim(560 / sp, q => { const e = io(q); vo.g.position.set(s0.x + (tx - s0.x) * e, s0.y + (ty - s0.y) * e, s0.z + (tz - s0.z) * e); setH(vo, Math.sin(q * Math.PI) * 1.0); vo.g.rotation.z = Math.sin(q * Math.PI) * 1.2; })
          .then(() => { vo.g.rotation.z = 0; setH(vo, 0); vo.pos = 0; });
        last.pos[vic.side][vic.k] = 0;
      }
      await anim(140 / sp, q => setH(o, H * (1 - io(q))));
      o.pos = to; last.pos[side][k] = to;
      if (opt.onLand) opt.onLand();
      await anim(110 / sp, q => { const s = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.p.scale.set(s, 1 / s, s); });
      o.g.userData.p.scale.set(1, 1, 1);
      if (vp) await vp;
    }

    /* ---------- dice: four tetrahedra beside the roller's small block ---------- */
    /* opts.stage (the rules tour): the dice are rolled large where they can be counted — on a phone over the middle of the board
       (then they step aside, small, to the free corner beside the small block), on a PC beside the small block (they stay there) */
    const BS = Math.max(2.1, Math.min(3, 2.1 * Math.pow(844 / Math.max(560, innerHeight), 1.6)));   // the large dice: about 60–80 px on a phone (a short screen shows the board smaller)
    const STG = !opts.stage ? null : tall
      ? { big: { s: BS, y: Y, at: i => [.62 + (i < 2 ? .33 : -.33) * BS, (i % 2 ? .34 : -.34) * BS] }, small: { s: .9, y: 0, at: i => [2.2 + (i >> 1) * .62, -(U.D / 2 + .3 + (i & 1) * .62)] } }
      : { big: { s: 1.25, y: 0, at: i => [U.W / 2 + 1.0 + (i & 1) * .78, (i >> 1) ? .45 : -.45] } };
    if (STG && !STG.small) STG.small = STG.big;
    let ST = STG ? STG.small : null, DS = ST ? ST.s : .8;
    // tilt: the large dice lean their top towards the top of the screen, as if seen from the player's side (straight down, an
    // up-pointing tip sits in the middle of the die and reads no differently from the marked tips at its foot)
    let TL = ST && ST.tilt || 0;
    const TAX = tall ? new TH.Vector3(0, 0, 1) : new TH.Vector3(1, 0, 0);   // screen-horizontal (phone upright: screen up = +x; PC: screen up = −z)
    const BASE = () => ST ? ST.y : 0, REST = () => BASE() + U.dieRest * DS + U.dieR * DS * .55 * Math.sin(TL), DICE = [];
    /* a settled roll: only the tip that points up keeps its inlay (each die has two marked tips; seen from above, the marked tip
       lying at the foot showed its blue as well, and the dice could not be counted). Marked up: the lapis in the middle of the die;
       plain up: no blue at all. While the dice tumble they are whole again. (Per-die copies of the shared geometry, cached.) */
    const VARG = {}, BODY_U = .0625;
    function variant(base, hide) {
      const key = base.uuid + hide.join(''); if (VARG[key]) return VARG[key];
      const g = base.clone(), pos = g.attributes.position, uv = g.attributes.uv, TV = U.dieVerts;
      for (let t = 0; t < pos.count; t += 3) {
        if (uv.getX(t) < .6) continue;   // (the inlay columns of the swatch strip: shell .6875, lapis .9375)
        const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3, cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3, cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
        let j = 0, bd = 1e9; TV.forEach((v, k) => { const d = (v[0] - cx) ** 2 + (v[1] - cy) ** 2 + (v[2] - cz) ** 2; if (d < bd) { bd = d; j = k; } });
        if (hide.includes(j)) for (let q = 0; q < 3; q++) uv.setXY(t + q, BODY_U, .5);
      }
      uv.needsUpdate = true; return (VARG[key] = g);
    }
    function faces(d) {   // d = the roll (null: the whole dice)
      DICE.forEach((g, i) => { const m = g.userData.d.children[0]; if (!m || !m.geometry) return; const b = m.userData.g0 || (m.userData.g0 = m.geometry);
        m.geometry = !d || i >= d.length ? b : variant(b, d[i] ? [1] : [0, 1]); });
      T3.kick(120);
    }
    const setTilt = g => g.userData.t.quaternion.setFromAxisAngle(TAX, -TL);
    function ensureDice(n) {
      while (DICE.length < n) {
        const g = new TH.Group(), t = new TH.Group(), d = U.die(); t.add(d); g.add(t); g.userData = { d, t, sh: null, s: 0, dot: null };
        board.add(g); DICE.push(g);
      }
      DICE.forEach((g, i) => {
        g.visible = i < n; setTilt(g);
        if (g.userData.s !== DS) { g.userData.s = DS; g.userData.d.scale.setScalar(DS); if (g.userData.sh) g.remove(g.userData.sh); const sh = T3.contact(U.dieR * DS * 1.05, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; }
      });
    }
    function places(side, n) {
      const out = [];
      for (let i = 0; i < n; i++) { if (ST) { out.push(ST.at(i)); continue; } const [x, z] = U.diceAt(sideOf(side), i); out.push([x + (i % 2) * .04, z + (i % 2 ? .1 : -.06)]); }
      return out;
    }
    // diceBig(on, ms): the stage's large place / the small one, the dice gliding over (as they lie)
    function diceBig(on, ms = 420) {
      if (!STG) return Promise.resolve(); const to = on ? STG.big : STG.small; if (to === ST) return Promise.resolve();
      const from = DICE.filter(g => g.visible).map(g => [g.position.x, g.position.y, g.position.z]), s0 = DS, t0 = TL, t1 = to.tilt || 0; ST = to;
      const Pl = places(0, from.length);
      if (!ms) { DS = to.s; TL = t1; ensureDice(from.length); DICE.forEach((g, i) => { if (i < from.length) { g.position.set(Pl[i][0], REST(), Pl[i][1]); g.userData.sh.position.y = .002 - REST(); } }); T3.kick(200); return Promise.resolve(); }
      return anim(ms, q => {
        const e = io(q); DS = s0 + (to.s - s0) * e; TL = t0 + (t1 - t0) * e;
        DICE.forEach((g, i) => { if (i >= from.length) return; g.userData.d.scale.setScalar(DS); setTilt(g); const y1 = REST(); g.position.set(from[i][0] + (Pl[i][0] - from[i][0]) * e, from[i][1] + (y1 - from[i][1]) * e + Math.sin(q * Math.PI) * .5, from[i][2] + (Pl[i][1] - from[i][2]) * e); if (g.userData.sh) g.userData.sh.visible = q > .95; });
      }).then(() => { DS = to.s; TL = t1; ensureDice(from.length); DICE.forEach((g, i) => { if (i < from.length) { g.position.set(Pl[i][0], REST(), Pl[i][1]); g.userData.sh.position.y = .002 - REST(); g.userData.sh.visible = true; } }); T3.kick(200); });
    }
    function restDice(side, d, n = 4) {
      n = d ? d.length : n; ensureDice(n); faces(d);
      const Pl = places(side, n);
      for (let i = 0; i < n; i++) { const g = DICE[i]; U.dieUp(g.userData.d, !!(d && d[i]), i * 1.9 + side * .7 + .3); g.position.set(Pl[i][0], REST(), Pl[i][1]); g.userData.sh.position.y = .002 - REST(); g.userData.sh.scale.set(1, 1, 1); g.userData.sh.material.opacity = .45; }
      T3.kick(200);
    }
    async function roll(side, d) {   // the throw of the 3D skin (UrDice3D.throwPlan): in from outside the board on the roller's side
      const n = d.length; ensureDice(n); faces(null);
      const Pl = places(side, n), sg = sideOf(side) === 0 ? 1 : -1;
      const items = DICE.slice(0, n).map((g, i) => ({ g, d: g.userData.d, sh: g.userData.sh, marked: !!d[i], rest: REST(), h0: 1.4 * Math.max(1, DS),
        from: [Pl[i][0] + (Math.random() - .5) * 1.4, Pl[i][1] + sg * (1.7 + Math.random() * .6)], to: [Pl[i][0], Pl[i][1]] }));
      const TP = window.UrDice3D.throwPlan(items, { dur: 980 / spd() });
      if (opts.sfx) opts.sfx('roll');
      await anim(TP.total / 1, k => TP.frame(k * TP.total));
      TP.end(); faces(d);
      if (opts.sfx) opts.sfx('dieStop');
      T3.kick(200);
    }
    // marks on the board (cells, rings, trays, the frame round the dice)
    const marksG = new TH.Group(); board.add(marksG);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const GEO = { sq: new TH.PlaneGeometry(U.P * 1.02, U.P * 1.02), ring: new TH.TorusGeometry(U.PR * 1.18, .035, 8, 44), dot: new TH.CircleGeometry(.12, 24), slot: new TH.CircleGeometry(U.PR * 1.1, 32) };
    GEO.sq.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2); GEO.dot.rotateX(-Math.PI / 2); GEO.slot.rotateX(-Math.PI / 2);
    const MATC = {};
    const mat = (c, op) => MATC[c + ':' + op] || (MATC[c + ':' + op] = basic(c, op));
    const marks = {
      clear() { while (marksG.children.length) marksG.remove(marksG.children[0]); T3.kick(120); },
      cell(r, c, color = 0x3df59a, op = .4, y = .006) { const m = new TH.Mesh(GEO.sq, mat(color, op)), [x, z] = cellXZ(r, c); m.position.set(x, Y + y, z); m.renderOrder = 2; marksG.add(m); T3.kick(120); return m; },
      ring(r, c, color = 0x3df59a, h = .02) { const m = new TH.Mesh(GEO.ring, mat(color, .95)), [x, z] = cellXZ(r, c); m.position.set(x, Y + h, z); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      dot(r, c, color = 0x3df59a) { const m = new TH.Mesh(GEO.dot, mat(color, .95)), [x, z] = cellXZ(r, c); m.position.set(x, Y + .012, z); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      tray(side, kind, color = 0x3df59a, k = 0) { const [x, y, z] = slot(side, kind, k), m = new TH.Mesh(GEO.slot, mat(color, .5)); m.position.set(x, y + .004, z); m.renderOrder = 2; marksG.add(m); T3.kick(120); return m; },
      ringAt(x, y, z, color = 0x3df59a) { const m = new TH.Mesh(GEO.ring, mat(color, .95)); m.position.set(x, y + .02, z); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      // the dice are not ringed or lit (the user's call, 2026-11-05: the blue tips that come up are what you count). frame(): a quiet
      // rounded frame round the dice, for a task that asks you to tap them
      frame(color = 0xffffff, op = .85) {
        const vis = DICE.filter(g => g.visible); if (!vis.length) return;
        const r = U.dieR * DS * 1.25, b = BASE() + .008, xs = vis.map(g => g.position.x), zs = vis.map(g => g.position.z);
        const x0 = Math.min(...xs) - r, x1 = Math.max(...xs) + r, z0 = Math.min(...zs) - r, z1 = Math.max(...zs) + r, wd = .045 * Math.max(1, DS / 1.2), m = mat(color, op);
        const bar = (cx, cz, w, d) => { const q = new TH.Mesh(new TH.PlaneGeometry(w, d), m); q.rotation.x = -Math.PI / 2; q.position.set(cx, b, cz); q.renderOrder = 3; marksG.add(q); };
        bar((x0 + x1) / 2, z0, x1 - x0, wd); bar((x0 + x1) / 2, z1, x1 - x0, wd); bar(x0, (z0 + z1) / 2, wd, z1 - z0 + wd); bar(x1, (z0 + z1) / 2, wd, z1 - z0 + wd);
        T3.kick(120);
      },
      // the route of `side` from path index a to b: a chain of dots
      path(side, a, b, color = 0xffe27a) { const R = route(side); for (let i = Math.max(1, a); i <= Math.min(b, R.length); i++) { const m = marks.dot(R[i - 1][0], R[i - 1][1], color); m.scale.setScalar(i === b ? 1.6 : 1); } },
      group: marksG,
    };
    // pulse every mark gently while marks are shown (on demand: only while there are marks)
    let pulseOn = false;
    function pulse() {
      if (stopped || !marksG.children.length) { pulseOn = false; return; }
      const k = .5 + .5 * Math.sin(performance.now() / 260);
      marksG.children.forEach(m => { if (m.geometry === GEO.ring || m.userData.pulse) m.scale.setScalar(.92 + k * .14); });
      T3.kick(60); requestAnimationFrame(pulse);
    }
    const _add = marksG.add.bind(marksG);
    marksG.add = (...a) => { const r = _add(...a); if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulse); } return r; };

    /* ---------- taps ---------- */
    function hit(ev) {
      const p = T3.pick(ev, Y); if (!p) return null;
      const c0 = Math.cos(-ROT), s0 = Math.sin(-ROT), x = p.x * c0 + p.z * s0, z = -p.x * s0 + p.z * c0;   // undo the board's turn
      const c = Math.round(x / U.U + 3.5), r0 = Math.round(z / U.U + 1), r = rowOf(r0);
      if (Math.abs(x / U.U + 3.5 - c) < .5 && Math.abs(z / U.U + 1 - r0) < .5 && r0 >= 0 && r0 <= 2 && c >= 0 && c <= 7 && U.exists(r0, c)) return { r, c };
      // the trays: nearest slot within reach
      let best = null, bd = .55;
      for (const side of [0, 1]) for (const kind of ['start', 'goal']) for (let k = 0; k < 7; k++) { const s = slot(side, kind, k), d = Math.hypot(s[0] - x, s[2] - z); if (d < bd) { bd = d; best = { tray: kind, side }; } }
      return best;
    }
    function project(x, y, z) {   // board-local → screen (Table3D.project takes the shown group's local frame: the board's parent)
      const v = new TH.Vector3(x, y, z); board.updateMatrix(); v.applyMatrix4(board.matrix);
      return T3.project(v.x, v.z, v.y);
    }
    const projCell = (r, c) => { const [x, z] = cellXZ(r, c); return project(x, Y, z); };
    const projPiece = (side, k) => { const o = P[side][k]; return o ? project(o.g.position.x, o.g.position.y, o.g.position.z) : null; };
    const projSlot = (side, kind, k = 0) => { const s = slot(side, kind, k); return project(s[0], s[1], s[2]); };
    const projDie = i => { const g = DICE[i]; return g && g.visible ? project(g.position.x, g.position.y, g.position.z) : null; };

    return {
      board, U, Y, tall, sync, move, roll, restDice, diceBig, lift, setDesign, marks, hit, project, projCell, projPiece, projSlot, projDie, sleep, anim,
      pieces: P, dice: DICE, route, cellXZ,
      stop() { stopped = true; },
    };
  }
  window.UrKit = { make };
})();
