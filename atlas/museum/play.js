/* 所蔵品で遊ぶ (2026-11-22): an exhibit's own 3D model as the playing board on the portal's table (ちゃぶ台).
   The museum page loads this file when the player presses 「この盤で遊ぶ」; the game's table adapter (atlas/games/<game>.js) then asks
   AtlasMuseumPlay.board(id) instead of Table3D.MODELS.<game>. The board has the same interface (userData: top, S, n, cs, cell, piece)
   plus userData.out — the whole board's width over the field's. Only the game's rules and AI: none of the full game's other features.
   Pieces: where none survive with the exhibit they are an estimate, and the museum's text says so. */
(function () {
  'use strict';
  const want = (new URLSearchParams(location.search).get('museum') || '').replace(/[^a-z]/g, '');
  const BOARDS = {
    // the Ballinderry board (1 = 1 cm, scaled so its 7 holes span the table board's field): pegs in its 7 × 7 holes. No pieces were found with it: plain turned pegs, dark for the
    // attackers, pale for the defenders, the king taller with a round head.
    ballinderry(TH, T3) {
      const n = 7, S = 8.6, cs = S / n, k = cs / 2.65, Y = .56;   // (the field and its height are Table3D.MODELS.tafl's own, so the skin's frame fits either board)
      const K = AtlasGallery.kit, g = new TH.Group(), m = AtlasEx.ballinderry.build(TH, T3, K); m.scale.setScalar(k); m.position.y = Y - .99 * k; g.add(m);
      m.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(mm => { if (mm && mm.color && !mm.userData.lit) { mm.userData.lit = 1; mm.color.multiplyScalar(1.7); } }); });   // (the table's light is dimmer than the exhibit's: the dark yew read as black)
      { const base = new TH.Mesh(new TH.BoxGeometry(23.9, .3, 23.9), K.mat({ color: '#2a1a10', roughness: .8 })); base.position.y = .2; m.add(base); }   // (hidden inside the board: one part as large as the whole board, which the skin's PC layout measures — the frame's four strips are too small to count)
      const H = m.userData.holes, cell = (f, r) => { const h = H && H[r * 7 + f]; return h ? [h[0] * k, h[1] * k] : [(f - 3) * cs, (r - 3) * cs]; };   // each peg in its own hole (hand-bored, not quite in line)
      const MAT = { 1: K.mat({ color: '#8a5230', roughness: .45, clearcoat: .3, clearcoatRoughness: .4 }), 2: K.mat({ color: '#e4d6b4', roughness: .45, clearcoat: .25, clearcoatRoughness: .4 }) };
      const r0 = cs * .34, prof = (h, head) => new TH.LatheGeometry([[0, -.12], [r0 * .22, -.12], [r0 * .22, 0], [r0 * .95, 0], [r0, h * .1], [r0 * .7, h * .28], [r0 * .5, h * .55], [r0 * head, h * .72], [r0 * head * 1.05, h * .84], [r0 * head * .7, h * .96], [0, h]].map(([a, b]) => new TH.Vector2(Math.max(.001, a), b)), 20);
      const GEO = { 1: prof(r0 * 2.3, .62), 2: prof(r0 * 2.3, .62), 3: prof(r0 * 3.4, .8) };
      const piece = kd => { const p = new TH.Group(); p.userData.kind = kd; const o = new TH.Mesh(GEO[kd], MAT[kd === 1 ? 1 : 2]); o.castShadow = true; p.add(o); return p; };
      g.userData = { top: Y, S, n, cs, cell, piece, mats: MAT, museum: 'ballinderry', out: 24 * k / S };
      return g;
    },
  };
  window.AtlasMuseumPlay = {
    id: BOARDS[want] ? want : '',
    out: id => ({ ballinderry: 24 / (7 * 2.65) })[id] || 0,   // the whole board's width over its field's
    ok: id => !!(BOARDS[id] && window.AtlasEx && AtlasEx[id] && window.AtlasGallery && AtlasGallery.kit),
    board(id, TH, T3) { try { return this.ok(id) ? BOARDS[id](TH || window.THREE, T3 || window.Table3D) : null; } catch (e) { console.warn('[museum play]', e); return null; } },
  };
})();
