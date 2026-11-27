/* =====================================================================
   麻雀（riichi/、2026-11-27）— the portal's showcase: an automatic mahjong table in play, the table itself being the place
   (2026-11-28 ユーザー「3Dビューの時点ではまだ背景は大百科の方に」: the Atlas's places as for every game — the solo dark room is off;
   MODELS.riichi.solo only with window.RIICHI_SOLO, a debug switch).
     the quiet green felt of riichi/ (images/mahjong/tex/felt-green.webp) inside walnut rails; the centre console with its
     round display (東1局) and the four score windows; the four walls of blue-backed tiles, one of them broken open with the
     dora indicator turned up; each player's 13 tiles standing (the near hand faces the viewer, the others show their backs),
     the six discards of each river, and a riichi stick laid out at the right seat.
   Tile faces: the game's own painter (mahjong/tiles.js MJTiles.canvas), loaded with this file.
   The game itself is played on its own page (riichi/?go=…, from the card): the portal's 3D table only shows it.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, mesh, RB, canvasTex, wood } = X;
  const TW = .34, TH = .46, TD = .27;            // a tile: width, length (face height), thickness
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const ivory = () => mat('iv', () => M({ color: 0xf2eee3, roughness: .32 }));
  const blue = () => mat('bl', () => M({ color: 0x2a477a, roughness: .28 }));
  const faceMat = (t, red) => mat('f' + t + (red ? 'r' : ''), () => {
    const P = window.MJTiles;
    const tex = canvasTex('rcf' + t + (red ? 'r' : ''), 240, 320, c => {
      if (P) c.drawImage(P.canvas(t, red), 0, 0, 240, 320);
      else { c.fillStyle = '#fbf8ef'; c.fillRect(0, 0, 240, 320); }
    });
    return M({ map: tex, roughness: .3, bump: false });
  });
  // one tile: the ivory body and the blue back, as two rounded blocks; lying face up / face down, or standing (the face toward +z)
  const geoI = () => mat('gI', () => RB(TW, TD * .58, TH, .045, 2)), geoB = () => mat('gB', () => RB(TW, TD * .42, TH, .045, 2));
  const geoF = () => mat('gF', () => new (T().PlaneGeometry)(TW * .86, TH * .88));
  function tile(t, how, red) {   // how: 'up' · 'down' · 'stand' (face toward +z) · 'back' (standing, the back toward +z)
    const TT = T(), g = new TT.Group();
    const body = mesh(geoI(), ivory(), 0, -TD * .21, 0), back = mesh(geoB(), blue(), 0, TD * .29, 0); g.add(body, back);
    if (t != null) { const f = mesh(geoF(), faceMat(t, red), 0, -TD * .5 - .002, 0); f.rotation.x = Math.PI / 2; g.add(f); }   // the face: under the ivory (lying face down = the face on the cloth)
    if (how === 'up') g.rotation.x = Math.PI;
    else if (how === 'stand') g.rotation.x = -Math.PI / 2;
    else if (how === 'back') g.rotation.x = Math.PI / 2;
    const w = new TT.Group(); w.add(g); return w;
  }
  const P = s => { const out = [], m = s.match(/\d+[mpsz]/g) || []; for (const grp of m) { const k = grp.slice(-1), b = { m: 0, p: 9, s: 18, z: 27 }[k]; for (const d of grp.slice(0, -1)) out.push(k === 'z' ? b + +d - 1 : b + (+d === 0 ? 4 : +d - 1)); } return out; };

  X.MODELS.riichi = function () {
    const TT = T(), g = new TT.Group(), S = 9.6, H = .9;   // the table's playing square, its height above the floor
    // the cabinet and the walnut rails
    const body = mesh(RB(S + 1.4, H - .1, S + 1.4, .2, 3), M({ color: 0x241a14, roughness: .55 }), 0, (H - .1) / 2, 0); g.add(body);
    const wm = mat('wood', () => M({ map: wood('rcwood', '#7a4a2a', '#3a2010'), roughness: .28 }));
    for (let k = 0; k < 4; k++) { const r = mesh(RB(S + 1.4, .34, .7, .14, 3), wm, 0, H + .07, S / 2 + .35); const p = new TT.Group(); p.add(r); p.rotation.y = k * Math.PI / 2; g.add(p); }
    // the felt (the same cloth as riichi/'s table)
    const felt = canvasTex('rcfelt', 512, 512, c => {
      const gr = c.createRadialGradient(256, 256, 40, 256, 256, 380); gr.addColorStop(0, '#2e7656'); gr.addColorStop(1, '#174431'); c.fillStyle = gr; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},.035)`; c.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5); }
      c.strokeStyle = 'rgba(8,24,16,.5)'; c.lineWidth = 2.5; c.strokeRect(256 - 70, 256 - 70, 140, 140); c.strokeRect(256 - 145, 256 - 145, 290, 290);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { c.beginPath(); c.moveTo(256 + a * 70, 256 + b * 70); c.lineTo(256 + a * 145, 256 + b * 145); c.stroke(); });
    });
    const top = mesh(new TT.PlaneGeometry(S, S), M({ map: felt, roughness: .95, bump: false }), 0, H + .002, 0); top.rotation.x = -Math.PI / 2; top.receiveShadow = true; g.add(top);
    // the centre console: a dark block, the round display and four score windows
    const con = mesh(RB(2.2, .34, 2.2, .18, 3), M({ color: 0x1c1d22, roughness: .3, metalness: .2 }), 0, H + .17, 0); g.add(con);
    const disp = canvasTex('rcdisp', 256, 256, c => {
      c.fillStyle = '#0d1a2a'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.strokeStyle = '#6fa8d8'; c.lineWidth = 6; c.stroke();
      c.fillStyle = '#e9f3ff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 62px "Noto Serif JP", serif'; c.fillText('東1局', 128, 104); c.font = 'bold 40px "Noto Serif JP", serif'; c.fillText('余 52', 128, 170);
    });
    const dm = mesh(new TT.CircleGeometry(.62, 48), M({ map: disp, roughness: .2, emissive: 0x334455, bump: false }), 0, H + .345, 0); dm.rotation.x = -Math.PI / 2; g.add(dm);
    const sc = canvasTex('rcsc', 256, 64, c => { c.fillStyle = '#120808'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#ff5a3a'; c.font = 'bold 44px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('25000', 128, 34); });
    for (let k = 0; k < 4; k++) { const w = mesh(new TT.PlaneGeometry(.9, .22), M({ map: sc, emissive: 0x401010, roughness: .3, bump: false }), 0, H + .346, .82); w.rotation.x = -Math.PI / 2; const p = new TT.Group(); p.add(w); p.rotation.y = k * Math.PI / 2; g.add(p); }
    const Y = H + TD / 2 + .004;   // a lying tile's centre height
    // the four walls: 17 stacks of two, face down; the wall of the left seat is broken open with the dora indicator turned up
    for (let k = 0; k < 4; k++) {
      const p = new TT.Group(); p.rotation.y = k * Math.PI / 2; g.add(p);
      for (let i = 0; i < 17; i++) {
        if (k === 3 && i >= 13) continue;                          // (taken: the deal began here)
        const x = (i - 8) * TW, z = 2.95;
        for (let lv = 0; lv < 2; lv++) {
          const up = k === 3 && i === 10 && lv === 1;          // the dora indicator (五筒)
          const tl = tile(up ? 13 : null, up ? 'up' : 'down'); tl.position.set(x, Y + lv * TD, z); tl.rotation.y = Math.PI / 2 * 0; p.add(tl);
        }
      }
    }
    // the hands: the near one faces the viewer (a riichi-ready hand), the other three stand with their backs to us
    const mine = P('234m56p678s345s22z'), z0 = 4.35;
    mine.forEach((t, i) => { const tl = tile(t, 'stand', t === 4); tl.position.set((i - 6.5) * (TW + .01) - .2, H + TH / 2 + .002, z0); tl.rotation.y = 0; g.add(tl); });
    { const tl = tile(P('7s')[0], 'stand'); tl.position.set(6.5 * (TW + .01) - .2 + .42, H + TH / 2 + .002, z0); g.add(tl); }
    for (let k = 1; k < 4; k++) { const p = new TT.Group(); p.rotation.y = k * Math.PI / 2; g.add(p);
      for (let i = 0; i < 13; i++) { const tl = tile(null, 'back'); tl.position.set((i - 6) * (TW + .01), H + TH / 2 + .002, z0); tl.rotation.y = Math.PI; p.add(tl); } }
    // the rivers: six discards each, in front of each seat, face up (the right seat's riichi tile turned sideways)
    const R = [P('9m1p8s4z2m6z'), P('1s9p3z7m5z1m'), P('9s2p4z7p1z8m'), P('3z9m1s7z6p2s')];
    R.forEach((list, k) => { const p = new TT.Group(); p.rotation.y = k * Math.PI / 2; g.add(p);
      list.forEach((t, i) => { const side = k === 1 && i === 4, tl = tile(t, 'up'); tl.position.set(-1.0 + i * (TW + .015) + (side ? .07 : 0) + (i > 4 && k === 1 ? .14 : 0), Y - TD * .0, 1.6); if (side) tl.rotation.y = Math.PI / 2; p.add(tl); }); });
    // the riichi stick of the right seat
    { const p = new TT.Group(); p.rotation.y = Math.PI / 2; g.add(p);
      const st = mesh(RB(1.4, .05, .13, .025, 2), M({ color: 0xf4f1ea, roughness: .3 }), 0, H + .03, 1.15); p.add(st);
      const dot = mesh(new TT.CircleGeometry(.04, 20), M({ color: 0xd8283c, roughness: .3, bump: false }), 0, H + .056, 1.15); dot.rotation.x = -Math.PI / 2; p.add(dot); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = o !== top; o.receiveShadow = true; } });
    g.scale.setScalar(.9);
    return g;
  };
  X.MODELS.riichi.solo = !!window.RIICHI_SOLO;
  X.MODELS.riichi.soloBg = '#0b1410';
})();
