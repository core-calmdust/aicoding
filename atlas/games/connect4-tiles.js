/* =====================================================================
   Connect Four — the live tiles in the 3D tile tower (atlas/models/connect4.js),
   shared by the table play (atlas/games/connect4.js) and the full game's skin
   (atlas/skin/connect4.js).
     Table3D.c4Set(stand, { sfx }) → set
       set.sync(grid, fresh, anim)   grid[c] = colours bottom → top (1 gold, 2 pearl);
                                     fresh = 'c,r' of the tile just played: it drops in from
                                     above the open rail tops and falls between the rails with a
                                     couple of little bounces. Tiles that are gone (undo, a jump
                                     in the record) lift out upwards.
       set.win(cells)               the four (or more) tiles step forward and a gold bar lights up
       set.marks({ last, hint, ghost: { c, p } })
       set.colAt(clientX, clientY)  the column under the pointer (screen space), or -1
       set.cellXY(c, r)             [x, y] of a cell in the stand's space
   The stand's group may be stretched vertically (the skin matches square DOM cells):
   tiles are counter-scaled so they stay square.
   Rendering is on demand (Table3D.kick); nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  let AC = null;
  function knock(row, soft) {   // a walnut tile landing on the one below (lower = deeper)
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, v = soft ? .35 : 1;
      const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .07 | 0, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
      n.buffer = b; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + row * 160; bp.Q.value = 1.3;
      const g = AC.createGain(); g.gain.setValueAtTime(.42 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); n.connect(bp).connect(g).connect(AC.destination); n.start(t);
      const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(240 + row * 22, t); o.frequency.exponentialRampToValueAtTime(110, t + .09);
      og.gain.setValueAtTime(.24 * v, t); og.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .13);
    } catch (e) {}
  }
  function fanfare() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); const t0 = AC.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0 + i * .09); g.gain.exponentialRampToValueAtTime(.1, t0 + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + i * .09 + .6); o.connect(g).connect(AC.destination); o.start(t0 + i * .09); o.stop(t0 + i * .09 + .65); });
    } catch (e) {}
  }

  X.c4Set = function (outer, opt = {}) {
    const TH = window.THREE, U = outer.userData, g = outer.children[0];
    const S0 = g.scale.x || 1;                       // the model's own scale
    const ky = () => g.scale.y / S0;                 // the skin's vertical stretch (1 on the table)
    const colX = c => U.cell(c, 0)[0] / S0, rowY = r => U.cell(0, 0)[1] / S0 + r * ((U.cell(0, 1)[1] - U.cell(0, 0)[1]) / S0);
    const PY = rowY(1) - rowY(0), TOPY = rowY(5) + PY * .5 + .3;   // the rail tops (open: the tiles go in from above)
    const SPAWN = TOPY + .62;                        // a new tile starts just above them
    const sfx = !!opt.sfx;
    let stopped = false;
    const kick = ms => X.kick && X.kick(ms || 150);
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const layer = new TH.Group(), marks = new TH.Group(); g.add(layer, marks);
    const tiles = new Map();   // 'c,r' → { o, c: colour }
    function make(col, c, r) {
      const o = U.tile(col === 1 ? 'gold' : 'pearl'); o.scale.y = 1 / ky(); o.position.set(colX(c), rowY(r), 0); layer.add(o); return o;
    }
    function dropIn(o, c, r) {   // falls from above the rail tops to its row: gravity, then two little bounces
      const y1 = rowY(r), y0 = SPAWN, d = y0 - y1, b1 = Math.min(PY * .26, d * .16), b2 = b1 * .32;
      const dur = 300 + 360 * Math.sqrt(d / (SPAWN - rowY(0)));
      o.position.y = y0;
      let hit1 = false, hit2 = false;
      anim(dur, k => {
        let y;
        if (k < .62) { const q = k / .62; y = y0 - d * q * q; }
        else if (k < .78) { const q = (k - .62) / .16; y = y1 + b1 * Math.sin(q * Math.PI); if (!hit1) { hit1 = true; if (sfx) knock(r); } }
        else if (k < .9) { y = y1; }
        else { const q = (k - .9) / .1; y = y1 + b2 * Math.sin(q * Math.PI); if (!hit2) { hit2 = true; if (sfx) knock(r, true); } }
        o.position.y = y;
        o.rotation.z = k < .62 ? Math.sin(k * 30) * .015 : 0;   // a hair of wobble between the rails
      }, () => { o.position.y = y1; o.rotation.z = 0; });
      return dur;
    }
    function liftOut(o) { const y0 = o.position.y; anim(240, k => { o.position.y = y0 + k * k * 2.2; o.scale.set(1 - k * .3, (1 - k * .3) / ky(), 1 - k * .3); }, () => layer.remove(o)); }
    // grid → tiles. Returns the ms until the fresh tile has landed.
    function sync(grid, fresh, animate) {
      const want = new Map();
      for (let c = 0; c < 7; c++) (grid[c] || []).forEach((p, r) => want.set(c + ',' + r, p));
      for (const [k, t] of tiles) if (want.get(k) !== t.c) { if (animate !== false) liftOut(t.o); else layer.remove(t.o); tiles.delete(k); }
      let wait = 0;
      for (const [k, p] of want) {
        if (tiles.has(k)) continue;
        const [c, r] = k.split(',').map(Number), o = make(p, c, r);
        tiles.set(k, { o, c: p });
        if (k === fresh && animate !== false) wait = dropIn(o, c, r);
      }
      for (const t of tiles.values()) t.o.scale.y = 1 / ky();
      kick(300);
      return wait;
    }

    /* ---------- marks ---------- */
    const basic = (color, op, add) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false, blending: add ? TH.AdditiveBlending : TH.NormalBlending });
    const MAT = { last: basic(0xff3b2b, .95), hint: basic(0x4ad8ff, .28, true), hintA: basic(0x4ad8ff, .95), win: basic(0xffd24a, .95), glow: basic(0xffc94a, .5, true) };
    const FZ = .13 + .012;   // just in front of a tile's face
    const GEO = { dot: new TH.CircleGeometry(.07, 20), col: new TH.PlaneGeometry(.9, 1), arrow: new TH.ConeGeometry(.16, .3, 18), bar: new TH.BoxGeometry(1, .07, .02), ring: new TH.RingGeometry(.52, .6, 4, 1, Math.PI / 4) };
    GEO.arrow.rotateX(Math.PI);   // pointing down
    let ghost = null, winLine = [], pulses = [], pulseOn = false;
    function pulse() { if (stopped || !pulses.length) { pulseOn = false; return; } const s = Math.sin(performance.now() / 170); pulses.forEach(m => { if (m.userData.bob) m.position.y = m.userData.y + s * .08; else m.material.opacity = m.userData.op * (.75 + .25 * s); }); kick(60); requestAnimationFrame(pulse); }
    function clearMarks() { for (const m of [...marks.children]) if (!winLine.includes(m)) marks.remove(m); pulses = []; if (ghost) { layer.remove(ghost); ghost = null; } }
    function setMarks(o = {}) {
      clearMarks();
      if (o.last) { const [c, r] = o.last, m = new TH.Mesh(GEO.dot, MAT.last); m.position.set(colX(c), rowY(r), FZ + .002); m.scale.y = 1 / ky(); m.renderOrder = 4; marks.add(m); }
      if (o.hint != null && o.hint >= 0) {
        const c = o.hint, h = TOPY - rowY(0) + PY * .5, p = new TH.Mesh(GEO.col, MAT.hint); p.scale.y = h; p.position.set(colX(c), rowY(0) - PY * .5 + h / 2, FZ + .01); p.renderOrder = 3; marks.add(p);
        const a = new TH.Mesh(GEO.arrow, MAT.hintA); a.position.set(colX(c), SPAWN + .15, 0); a.userData = { bob: true, y: SPAWN + .15 }; a.scale.y = 1 / ky(); marks.add(a); pulses.push(a);
      }
      if (o.ghost && o.ghost.c >= 0) { ghost = U.tile(o.ghost.p === 1 ? 'gold' : 'pearl'); ghost.scale.y = 1 / ky(); ghost.position.set(colX(o.ghost.c), SPAWN, 0); layer.add(ghost); }
      if (pulses.length && !pulseOn) { pulseOn = true; pulse(); }
      kick(200);
    }
    function win(cells) {
      winLine.forEach(m => marks.remove(m)); winLine = [];
      if (!cells || !cells.length) { kick(); return; }
      cells.forEach(([c, r], i) => {
        const t = tiles.get(c + ',' + r); if (!t) return;
        setTimeout(() => { if (stopped) return; anim(360, k => { t.o.position.z = Math.sin(Math.min(1, k * 1.4) * Math.PI / 2) * .16; }); if (sfx) knock(3 + i, true); }, i * 110);
        const ring = new TH.Mesh(GEO.ring, MAT.win); ring.position.set(colX(c), rowY(r), FZ + .17); ring.scale.set(1, 1 / ky(), 1); ring.renderOrder = 4; marks.add(ring); winLine.push(ring);
      });
      const a = cells[0], b = cells[cells.length - 1], ax = colX(a[0]), ay = rowY(a[1]), bx = colX(b[0]), by = rowY(b[1]);
      const len = Math.hypot(bx - ax, (by - ay) * ky()), bar = new TH.Mesh(GEO.bar, MAT.glow);
      bar.position.set((ax + bx) / 2, (ay + by) / 2, FZ + .2); bar.rotation.z = Math.atan2((by - ay) * ky(), bx - ax); bar.scale.set(.01, 1, 1); bar.renderOrder = 5;
      const cnt = new TH.Group(); cnt.scale.y = 1 / ky(); cnt.position.copy(bar.position); bar.position.set(0, 0, 0); cnt.add(bar); marks.add(cnt); winLine.push(cnt);
      setTimeout(() => { if (stopped) return; anim(420, k => bar.scale.x = .01 + (len + .5) * (1 - Math.pow(1 - k, 3))); if (sfx) fanfare(); }, cells.length * 110);
    }
    function colAt(cx, cy) {   // nearest column centre on screen (half a pitch either way), within the tower's height
      if (!X.project) return -1;
      const ym = (rowY(0) + rowY(5)) / 2 * g.scale.y, x0 = X.project(colX(0) * S0, 0, ym), x6 = X.project(colX(6) * S0, 0, ym);
      const top = X.project(0, 0, (TOPY + .9) * g.scale.y), bot = X.project(0, 0, 0);
      if (cy < top.y - 30 || cy > bot.y + 30) return -1;
      const pitch = (x6.x - x0.x) / 6, c = Math.round((cx - x0.x) / pitch);
      return c >= 0 && c < 7 && Math.abs(cx - (x0.x + c * pitch)) < pitch * .62 ? c : -1;
    }
    const cellXY = (c, r) => [colX(c) * S0, rowY(r) * g.scale.y];
    function dispose() { stopped = true; g.remove(layer, marks); Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(m => m.dispose()); }
    return { sync, win, marks: setMarks, colAt, cellXY, dispose, count: () => tiles.size, knock, fanfare, rowY, colX, TOPY, SPAWN };
  };
})();
