/* 所蔵品で遊ぶ (2026-11-22): a game played on an exhibit, inside the museum's own viewer (atlas/museum/gallery.js) — the same dark
   room and plinth, the exhibit's own 3D model as the board. Only the game's rules and AI (the portal's table adapter,
   atlas/games/<game>.js, driven through a small stand-in for Table3D): no lessons, puzzles, ratings or records.
   AtlasMuseumPlay.start(id, { level, side, lang, t, hud, onEnd }) → { stop() }
   Pieces: where none survive with the exhibit they are an estimate, and the museum's text says so. */
(function () {
  'use strict';
  const BOARDS = {
    // the Ballinderry board (1 = 1 cm): Brandubh, pegs in its 7 × 7 holes (their places as on the photograph: hand-bored, not quite in line).
    ballinderry: { game: 'tafl', size: 7, view: { yaw: 0, pit: 1.2, d: .8 },
      board(TH, obj, K) {
        const g = new TH.Group(), n = 7, cs = 2.65, S = cs * n, Y = 1.02, H = obj.userData.holes;
        const cell = (f, r) => { const h = H && H[r * 7 + f]; return h ? [h[0], h[1]] : [(f - 3) * cs, (r - 3) * cs]; };
        // the pieces, to go with a worn thousand-year-old board: small squat pegs with a domed head, hand-cut and matt — dark bog-stained
        // wood for the attackers, yellowed bone for the defenders; the king a little larger with a knob. (An estimate: none were found.)
        const tex = (a, b, seed) => K.tex(256, 256, (c, w, h) => { K.grain(c, w, h, { a, b, seed, sx: .6, sy: 5, warp: .5, pores: .01 }); c.fillStyle = 'rgba(20,10,4,.25)'; for (let q = 0; q < 26; q++) { c.beginPath(); c.ellipse((q * 97) % w, (q * 53) % h, 3 + q % 5, 2 + q % 3, q, 0, 6.29); c.fill(); } });
        const MAT = { 1: K.mat({ map: tex('#4a3020', '#22140c', 71), color: '#ffffff', roughness: .78 }), 2: K.mat({ map: tex('#cdb98c', '#9c8458', 72), color: '#ffffff', roughness: .7 }) };
        const r0 = cs * .23, prof = (h, king) => new TH.LatheGeometry((king ? [[0, -.35], [.16, -.35], [.2, 0], [r0 * .62, .02], [r0 * .7, h * .2], [r0 * 1.02, h * .42], [r0 * 1.05, h * .58], [r0 * .8, h * .74], [r0 * .34, h * .8], [r0 * .42, h * .9], [r0 * .28, h * .98], [0, h]] : [[0, -.35], [.16, -.35], [.2, 0], [r0 * .6, .02], [r0 * .66, h * .28], [r0 * .98, h * .52], [r0, h * .7], [r0 * .72, h * .9], [r0 * .3, h * .99], [0, h]]).map(([a, b]) => new TH.Vector2(Math.max(.001, a), b)), 18);
        const GEO = { 1: prof(1.25, false), 2: prof(1.25, false), 3: prof(1.9, true) };
        const piece = kd => { const p = new TH.Group(); p.userData.kind = kd; const o = new TH.Mesh(GEO[kd], MAT[kd === 1 ? 1 : 2]); o.castShadow = true; o.rotation.y = (p.id * 2.4) % 6.28; if (kd === 3) o.scale.set(1.22, 1, 1.22); p.add(o); return p; };
        g.userData = { top: Y, S, n, cs, cell, piece, mats: MAT };
        return g; } },
    // Tutankhamun's Senet box (1 = 1 cm): the standard game (5 pieces each) on its own ivory field — the reels and cones laid out on it in the
    // museum are the pieces (they came from the same tomb), the casting sticks two pairs like the ones kept with it (flat ivory face up = it counts),
    // thrown on the plinth in front; a piece borne off goes home into the open drawer. Kit coordinates (atlas/games/senet-kit.js): 1 = one square.
    senet: { game: 'senet', size: 1, view: { yaw: .18, pit: 1.05, d: .74 }, noContact: true,
      board(TH, obj) {
        const P = obj.userData.play, u = P.pitch, g = new TH.Group(); g.scale.setScalar(u);
        const sc = (geo, x, y, z) => { const q = geo.clone(); q.scale(x / u, y / u, z / u); return q; };
        const GEO = { 0: sc(P.reelG, .82, .82, .82), 1: sc(P.coneG, .75, .9, .75) };
        let nCone = 0;
        const piece = side => { const p = new TH.Group(), m = new TH.Mesh(GEO[side], side ? (nCone++ % 5 === 1 || nCone % 5 === 4 ? P.faience : P.ivory) : P.reelM);
          m.castShadow = m.receiveShadow = true; m.rotation.y = Math.random() * 6.28; p.add(m); p.userData = { side, h: side ? .61 : .31 }; return p; };
        // a casting stick: the museum's rod, its rounded back ebony with incised bands, the flat face ivory (light face up = rotation 0)
        const flat = (src, f) => { const q = src.clone(), A = q.attributes.position; for (let i = 0; i < A.count; i++) A.setY(i, f(A.getY(i))); q.computeVertexNormals(); q.translate(0, .135, 0); q.scale(1 / u, 1 / u, 1 / u); return q; };
        const domeG = flat(P.stickG, y => Math.min(y, -.06)), faceG = flat(P.stickG, y => y >= 0 ? .07 : -.06), TH0 = .41 / u;
        const stick = () => { const s = new TH.Group(), body = new TH.Group(); [[domeG, P.stM], [faceG, P.ivory]].forEach(([q, m]) => { const o = new TH.Mesh(q, m); o.castShadow = o.receiveShadow = true; body.add(o); }); s.add(body); s.userData.body = body; return s; };
        const stickUp = (s, white, yaw) => { s.rotation.set(0, yaw || 0, 0); s.userData.body.rotation.set(0, 0, white ? 0 : Math.PI); };
        const D = P.drawer, SX = -12, SZ = 10.8, SG = 1.6;
        g.userData = { top: P.top / u, W: 10, D: 3, H: 0, pt: sq => { const r = Math.floor((sq - 1) / 10), k = (sq - 1) % 10, c = r === 1 ? 9 - k : k; return [c - 4.5, r - 1]; },
          S3: { piece, stick, stickUp, PR: .82 / u, PH: 1.4 / u, STK: { L: 17.4 / u, Wd: 1.24 / u, Th: TH0 } },
          kit: { sk: 1, oneSet: true, trayY: D.y / u, yaw: i => ((i * 53) % 11 - 5) * .006,
            slot: (side, k) => [(D.x1 - .9 - k * 1.55) / u, D.y / u, (side ? -2.15 : 2.15) / u],   // borne off: into the drawer, Light (reels) on the near side
            stickAt: (side, i) => [SX / u, (SZ + i * SG) / u],
            frame: () => [(SX - 9.6) / u, (SX + 9.6) / u, (SZ - 1.1) / u, (SZ + 3 * SG + 1.1) / u], frameW: .16 / u } };
        return g; } },
    // 木画紫檀棊局 (1 = 1 cm): go on its 19 lines. The stones after the Shōsōin's own (北倉25): ivory dyed indigo (紺牙撥鏤碁子, 120 kept; 1.6–1.7 across,
    // 0.6–0.7 thick) and dyed red with lac (紅牙撥鏤碁子, 132; 1.5–1.7, 0.7–0.8), a bird with a flowering spray in its beak cut through the dye on both
    // faces, a little green / yellow / red put in (the Shōsōin's photographs). Indigo plays first (black), red second (white). Whether they were one set is not recorded.
    shosoin: { game: 'go', size: 19, view: { yaw: 0, pit: 1.28, d: .74 }, noContact: true, light: { key: .7, env: .2 },
      board(TH, obj, K) {
        const P = obj.userData.play, c = P.cell, n = P.n, g = new TH.Group();
        // the face: the ground, a soft darker rim, the bird cut through to the cream ivory (both stones fly to the left with a spray in the beak)
        const face = col => K.tex(512, 512, (q, w) => {
          const red = col === 2, G0 = red ? '#9b1b2e' : '#34345a', IV = '#e6d4a6';
          q.fillStyle = G0; q.fillRect(0, 0, w, w);
          const gr = q.createRadialGradient(w * .46, w * .44, w * .05, w / 2, w / 2, w * .5); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); q.fillStyle = gr; q.fillRect(0, 0, w, w);
          q.save(); q.translate(w / 2, w / 2); q.scale(w * .43, w * .43); q.lineCap = q.lineJoin = 'round';
          const tint = (c2, f) => { q.beginPath(); f(); q.fillStyle = c2; q.fill(); };
          const line = (lw, f) => { q.beginPath(); f(); q.strokeStyle = IV; q.lineWidth = lw; q.stroke(); };
          const leaf = (x, y, a, L, fill) => { q.save(); q.translate(x, y); q.rotate(a); const f = () => { q.moveTo(0, 0); q.quadraticCurveTo(L * .5, -L * .32, L, 0); q.quadraticCurveTo(L * .5, L * .32, 0, 0); };
            if (fill) tint(fill, f); line(.026, f); line(.016, () => { q.moveTo(L * .1, 0); q.lineTo(L * .8, 0); }); q.restore(); };
          // body tint (yellow on the hoopoe, red on the duck), then the outlines
          tint(red ? 'rgba(214,170,60,.8)' : 'rgba(196,74,70,.85)', () => { q.moveTo(-.3, -.05); q.quadraticCurveTo(0, -.2, .32, -.02); q.quadraticCurveTo(.05, .14, -.3, -.05); });
          line(.032, () => { q.moveTo(-.38, -.02); q.quadraticCurveTo(-.05, -.22, .34, -.04); q.quadraticCurveTo(.05, .18, -.3, .06); });   // the body
          line(.03, () => { q.arc(-.44, -.1, .12, 0, 6.29); });   // the head
          q.beginPath(); q.arc(-.47, -.12, .025, 0, 6.29); q.fillStyle = IV; q.fill();   // the eye
          line(.024, () => { q.moveTo(-.55, -.11); q.quadraticCurveTo(-.7, -.12, red ? -.86 : -.72, red ? -.2 : -.12); });   // the bill (long and curved on the hoopoe)
          if (red) for (let k = 0; k < 5; k++) line(.026, () => { const a = -2.4 + k * .28; q.moveTo(-.44 + Math.cos(a) * .12, -.1 + Math.sin(a) * .12); q.lineTo(-.44 + Math.cos(a) * .3, -.12 + Math.sin(a) * .3); });   // the crest
          // the wings: one raised behind, one lowered in front, ribbed with feathers
          const wing = (x0, y0, x1, y1, x2, y2, fill) => { const f = () => { q.moveTo(x0, y0); q.quadraticCurveTo((x0 + x1) / 2 - .1, (y0 + y1) / 2, x1, y1); q.lineTo(x2, y2); q.quadraticCurveTo((x0 + x2) / 2, (y0 + y2) / 2 + .05, x0 + .2, y0); };
            if (fill) tint(fill, f); line(.03, f); for (let k = 1; k < 6; k++) { const t = k / 6; line(.016, () => { q.moveTo(x0 + (x1 - x0) * t * .3 + .05, y0 + (y1 - y0) * t * .3); q.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); }); } };
          wing(-.02, -.1, .3, -.82, .5, -.62, red ? null : 'rgba(214,180,70,.7)'); wing(-.12, .06, -.08, .84, .28, .7, null);
          line(.03, () => { q.moveTo(.3, -.06); q.lineTo(.82, -.16); q.moveTo(.3, .0); q.lineTo(.84, .1); q.moveTo(.82, -.16); q.quadraticCurveTo(.9, -.03, .84, .1); });   // the tail
          for (let k = 0; k < 3; k++) line(.016, () => { q.moveTo(.4, -.04 + k * .03); q.lineTo(.8, -.1 + k * .09); });
          // the spray in the beak and the scattered leaves / buds
          const bx = red ? -.86 : -.72, by = red ? -.2 : -.12;
          line(.026, () => { q.moveTo(bx, by); q.quadraticCurveTo(bx - .05, by - .3, bx + .18, by - .55); });
          leaf(bx + .18, by - .55, -.5, .26, red ? 'rgba(140,180,130,.85)' : 'rgba(200,70,70,.9)'); leaf(bx - .02, by - .28, 2.6, .2, null); leaf(bx, by + .05, 1.9, .3, red ? null : 'rgba(200,70,70,.9)');
          leaf(.32, .5, .2, .26, red ? 'rgba(140,180,130,.85)' : null); leaf(.55, .38, -.6, .22, red ? null : 'rgba(200,70,70,.9)'); leaf(.05, .72, .4, .2, null);
          q.restore();
        });
        const MAT = { 1: K.mat({ map: face(1), color: '#ffffff', roughness: .78 }), 2: K.mat({ map: face(2), color: '#ffffff', roughness: .76 }) };   // (matt: the photographs)
        // a thick disc, both faces domed, the edge a little rounded (the photographs); planar UVs so the bird lies on the top
        const geo = (d, t) => { const r = d / 2, q = new TH.LatheGeometry([[0, 0], [r * .62, t * .03], [r * .9, t * .12], [r, t * .3], [r, t * .62], [r * .92, t * .8], [r * .7, t * .94], [r * .38, t * .99], [0, t]].map(([a, b]) => new TH.Vector2(Math.max(.001, a), b)), 40);
          const A = q.attributes.position, U = q.attributes.uv; for (let i = 0; i < A.count; i++) U.setXY(i, .5 + A.getX(i) / (d * 1.04), .5 - A.getZ(i) / (d * 1.04)); return q; };
        const GEO = { 1: geo(1.65, .65), 2: geo(1.6, .75) };
        const stone = (col, cc, seed) => { const m = new TH.Mesh(GEO[col], MAT[col]); m.castShadow = m.receiveShadow = true; m.rotation.y = ((seed || 0) * 2.399) % 6.283 * .35 - 1; m.userData.stone = col; return m; };
        const tb = window.Table3D && Table3D.goban;
        const NAMES = { ja: ['紺', '紅'], en: ['Indigo', 'Crimson'], zh: ['蓝', '红'], 'zh-TW': ['藍', '紅'], ko: ['남색', '붉은색'], es: ['Añil', 'Carmesí'], fr: ['Indigo', 'Carmin'], pt: ['Anil', 'Carmim'], de: ['Indigo', 'Karmin'], ru: ['Синие', 'Красные'], tr: ['Lacivert', 'Kırmızı'], id: ['Nila', 'Merah'], hi: ['नील', 'लाल'], ar: ['النيلي', 'القرمزي'] };
        g.userData = { n, cell: c, W: P.cell * (n + 1), S: c * (n + 1), top: P.top + .002, pt: (i, j) => [(i - (n - 1) / 2) * c, (j - (n - 1) / 2) * c],
          GB: { stone, stoneMat: col => MAT[col], SH: .7 / (2 * .47 * c), tapMark: cc => tb ? tb.tapMark(cc) : new TH.Group() },
          names: l => { const a = NAMES[l] || NAMES.en; return { p1: a[0], p2: a[1] }; },
          dot: ['background:radial-gradient(circle at 35% 30%,#6a6a96,#34345a 60%,#1e1e38)', 'background:radial-gradient(circle at 35% 30%,#e0607a,#9b1b2e 60%,#5e0d1a)'] };
        return g; } },
  };
  let cur = null;
  function start(id, o) {
    const def = BOARDS[id], G = window.AtlasGallery, V = G && G._v && G._v(), TH = window.THREE, ad = window.Atlas3D && Atlas3D[def && def.game];
    if (!def || !V || !V.obj || !TH || !ad) return null;
    stop();
    const board = def.board(TH, V.obj, G.kit), stage = V.ov.querySelector('.exstage'), cv = stage.querySelector('canvas');
    const dot = new TH.CircleGeometry(1, 24); dot.rotateX(-Math.PI / 2);
    const T3 = { MODELS: (window.Table3D && Table3D.MODELS) || {},
      show(_, b) { V.obj.add(b); this.kick(); },
      fit() {}, kick() { if (V.R) V.R.shadowMap.needsUpdate = true; G.go(); },
      wasDrag: () => performance.now() - (V.dragEnd || 0) < 250,
      contact(r, op) { const m = new TH.Mesh(dot, new TH.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: (op || .4) * .5, depthWrite: false })); m.scale.setScalar(r); m.userData.contact = true; if (def.noContact) m.visible = false; return m; },   // (noContact: the room's own shadows are enough)
      pick(ev, y) { const r = cv.getBoundingClientRect(), rc = new TH.Raycaster(); rc.setFromCamera(new TH.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), V.cam);
        board.updateMatrixWorld(true); const ray = rc.ray.clone().applyMatrix4(new TH.Matrix4().copy(board.matrixWorld).invert()), p = new TH.Vector3();
        return ray.intersectPlane(new TH.Plane(new TH.Vector3(0, 1, 0), -(y || 0)), p) ? { x: p.x, z: p.z } : null; },
      project(x, z, y) {   /* (x, y, z in the board's parent's space — the table's world: senet-kit passes points through board.matrix first; the Ballinderry board sits at the parent's origin unscaled) */ const r = cv.getBoundingClientRect(), p = (board.parent || board).localToWorld(new TH.Vector3(x, y || 0, z)).project(V.cam); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; } };
    // the room's light, turned down for a board looked at from above (the exhibit's own light glares on a flat top seen from there)
    const L0 = { key: V.key ? V.key.intensity : 0, env: V.scene.environmentIntensity, home: V.home, spin: V.spin };
    const LT = def.light || {}; if (V.key) V.key.intensity = L0.key * (LT.key || .62); V.scene.environmentIntensity = L0.env * (LT.env || .55);   // (light: a board's own amounts — a wide glossy face mirrors the room's light as a pale wash)
    V.spin = false; const sb = V.ov.querySelector('[data-k="spin"]'); if (sb) sb.classList.remove('on');
    const view = () => ({ yaw: def.view.yaw, pit: def.view.pit, d: V.fitD() * def.view.d }); V.home = view(); G.tween(view()); V.playing = true;
    const hid = ((V.obj.userData.play && V.obj.userData.play.hide) || []).filter(m => m.visible); hid.forEach(m => { m.visible = false; });   // the pieces and sticks laid out for show: put away during a game
    const ses = ad.start({ el: stage, Table3D: T3, board, lang: o.lang, t: o.t, level: o.level, side: o.side, size: def.size, mode: 'ai', hud: o.hud || (() => {}), onTurn() {}, onEnd: res => { if (o.onEnd) o.onEnd(res); } });
    cur = { V, ses, board, L0, dot, hid };
    return { stop };
  }
  function stop() {
    const c = cur; if (!c) return; cur = null;
    try { if (c.ses && c.ses.stop) c.ses.stop(); } catch (e) {}
    const V = c.V; if (!V || !V.scene) return;
    if (c.board.parent) c.board.parent.remove(c.board);
    (c.hid || []).forEach(m => { m.visible = true; });
    if (V.key) V.key.intensity = c.L0.key; V.scene.environmentIntensity = c.L0.env; V.home = c.L0.home; V.playing = false;
    if (V.R) V.R.shadowMap.needsUpdate = true; if (window.AtlasGallery) AtlasGallery.go();
  }
  window.AtlasMuseumPlay = { start, stop, has: id => !!BOARDS[id], game: id => BOARDS[id] && BOARDS[id].game };
})();
