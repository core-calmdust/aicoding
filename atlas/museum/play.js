/* 所蔵品で遊ぶ (2026-11-22): a game played on an exhibit, inside the museum's own viewer (atlas/museum/gallery.js) — the same dark
   room and plinth, the exhibit's own 3D model as the board. Only the game's rules and AI (the portal's table adapter,
   atlas/games/<game>.js, driven through a small stand-in for Table3D): no lessons, puzzles, ratings or records.
   AtlasMuseumPlay.start(id, { level, side, lang, t, hud, onEnd }) → { stop() }
   Pieces: where none survive with the exhibit they are an estimate, and the museum's text says so. */
(function () {
  'use strict';
  const BOARDS = {
    // the Ballinderry board (1 = 1 cm): Brandubh, pegs in its 7 × 7 holes (their places as on the photograph: hand-bored, not quite in
    // line). No pieces were found with it: plain turned pegs, brown for the attackers, pale for the defenders, the king taller.
    ballinderry: { game: 'tafl', size: 7, view: { yaw: 0, pit: 1.2, d: .8 },
      board(TH, obj, K) {
        const g = new TH.Group(), n = 7, cs = 2.65, S = cs * n, Y = 1.02, H = obj.userData.holes;
        const cell = (f, r) => { const h = H && H[r * 7 + f]; return h ? [h[0], h[1]] : [(f - 3) * cs, (r - 3) * cs]; };
        const MAT = { 1: K.mat({ color: '#8a5230', roughness: .45, clearcoat: .3, clearcoatRoughness: .4 }), 2: K.mat({ color: '#e4d6b4', roughness: .45, clearcoat: .25, clearcoatRoughness: .4 }) };
        const r0 = cs * .34, prof = (h, head) => new TH.LatheGeometry([[0, -.3], [r0 * .22, -.3], [r0 * .22, 0], [r0 * .95, 0], [r0, h * .1], [r0 * .7, h * .28], [r0 * .5, h * .55], [r0 * head, h * .72], [r0 * head * 1.05, h * .84], [r0 * head * .7, h * .96], [0, h]].map(([a, b]) => new TH.Vector2(Math.max(.001, a), b)), 20);
        const GEO = { 1: prof(r0 * 2.3, .62), 2: prof(r0 * 2.3, .62), 3: prof(r0 * 3.4, .8) };
        const piece = kd => { const p = new TH.Group(); p.userData.kind = kd; const o = new TH.Mesh(GEO[kd], MAT[kd === 1 ? 1 : 2]); o.castShadow = true; p.add(o); return p; };
        g.userData = { top: Y, S, n, cs, cell, piece, mats: MAT };
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
      contact(r, op) { const m = new TH.Mesh(dot, new TH.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: (op || .4) * .5, depthWrite: false })); m.scale.setScalar(r); m.userData.contact = true; return m; },
      pick(ev, y) { const r = cv.getBoundingClientRect(), rc = new TH.Raycaster(); rc.setFromCamera(new TH.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), V.cam);
        board.updateMatrixWorld(true); const ray = rc.ray.clone().applyMatrix4(new TH.Matrix4().copy(board.matrixWorld).invert()), p = new TH.Vector3();
        return ray.intersectPlane(new TH.Plane(new TH.Vector3(0, 1, 0), -(y || 0)), p) ? { x: p.x, z: p.z } : null; },
      project(x, z, y) { const r = cv.getBoundingClientRect(), p = board.localToWorld(new TH.Vector3(x, y || 0, z)).project(V.cam); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; } };
    // the room's light, turned down for a board looked at from above (the exhibit's own light glares on a flat top seen from there)
    const L0 = { key: V.key ? V.key.intensity : 0, env: V.scene.environmentIntensity, home: V.home, spin: V.spin };
    if (V.key) V.key.intensity = L0.key * .62; V.scene.environmentIntensity = L0.env * .55;
    V.spin = false; const sb = V.ov.querySelector('[data-k="spin"]'); if (sb) sb.classList.remove('on');
    const view = () => ({ yaw: def.view.yaw, pit: def.view.pit, d: V.fitD() * def.view.d }); V.home = view(); G.tween(view()); V.playing = true;
    const ses = ad.start({ el: stage, Table3D: T3, board, lang: o.lang, t: o.t, level: o.level, side: o.side, size: def.size, mode: 'ai', hud: o.hud || (() => {}), onTurn() {}, onEnd: res => { if (o.onEnd) o.onEnd(res); } });
    cur = { V, ses, board, L0, dot };
    return { stop };
  }
  function stop() {
    const c = cur; if (!c) return; cur = null;
    try { if (c.ses && c.ses.stop) c.ses.stop(); } catch (e) {}
    const V = c.V; if (!V || !V.scene) return;
    if (c.board.parent) c.board.parent.remove(c.board);
    if (V.key) V.key.intensity = c.L0.key; V.scene.environmentIntensity = c.L0.env; V.home = c.L0.home; V.playing = false;
    if (V.R) V.R.shadowMap.needsUpdate = true; if (window.AtlasGallery) AtlasGallery.go();
  }
  window.AtlasMuseumPlay = { start, stop, has: id => !!BOARDS[id], game: id => BOARDS[id] && BOARDS[id].game };
})();
