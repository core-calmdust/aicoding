/* =====================================================================
   Nine Men's Morris — the live pieces on the 3D board (atlas/models/morris.js),
   shared by the table play (atlas/games/morris.js) and the full game's skin
   (atlas/skin/morris.js).
     Table3D.morrisSet(board, { sfx }) → set
       set.sync({ b, hand, caps }, anim)   b: 24 colours (0 / 1 gold / 2 platinum),
                                           hand[c]: pieces in hand, caps[c]: pieces colour c has taken
         every piece is one object that travels to its slot: from the felt channel onto a
         point (placing), point to point (a slide, or a high arc when flying), a taken piece
         flies into the taker's channel. Undo / a jump in the record simply sends every
         piece back to where it belongs.
       set.marks({ last: [from, to], sel, dests: [], rm: [], hint: [from, to] })
       set.mill(points)   a gold glow under the three pieces of a fresh mill
       set.pointAt(x, z)  board point under a local (outer) position, or -1
       set.xz(i)          [x, z] of point i in the outer group's space
   Channels: gold (first player) on the right, platinum on the left; the pieces in hand
   line up from the far end, the taken ones from the near end.
   Rendering is on demand (Table3D.kick); nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const PTS = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  const P = v => -3.4 + v * 6.8 / 6;          // lattice → board units (atlas/models/morris.js)
  const CHX = 4.8, CHY = .46, CHZ0 = 3.3, CHP = .86;   // channel centre x, felt height, end slot z, slot pitch (board units)
  let AC = null;
  function clack(kind) {   // a metal piece set down on marble / felt; a soft whoosh when flying (respects the portal's sound switch)
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, felt = kind === 'felt';
      const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .06 | 0, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, felt ? 3 : 7);
      n.buffer = b; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = felt ? 900 : 4200; bp.Q.value = felt ? .7 : 2.2;
      const g = AC.createGain(); g.gain.setValueAtTime(felt ? .25 : .42, t); g.gain.exponentialRampToValueAtTime(.001, t + .06); n.connect(bp).connect(g).connect(AC.destination); n.start(t);
      if (!felt) {   // the metal ring of the disc
        const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(kind === 'take' ? 520 : 1850, t);
        og.gain.setValueAtTime(.05, t); og.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .26);
      }
    } catch (e) {}
  }
  function chime() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); const t0 = AC.currentTime;
      [659.25, 880, 1174.66].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0 + i * .07); g.gain.exponentialRampToValueAtTime(.1, t0 + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + i * .07 + .5); o.connect(g).connect(AC.destination); o.start(t0 + i * .07); o.stop(t0 + i * .07 + .55); });
    } catch (e) {}
  }

  X.morrisSet = function (outer, opt = {}) {
    const TH = window.THREE, U = outer.userData, g = outer.children[0], SC = g.scale.x || 1;
    const TOP = U.top / SC + .03;           // a piece rests on the rosettes
    const sfx = !!opt.sfx;
    let stopped = false;
    const kick = ms => X.kick && X.kick(ms || 150);
    const anim = (dur, f, done, delay) => {
      const go = () => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
      if (delay) setTimeout(() => { if (!stopped) go(); }, delay); else go();
    };
    const layer = new TH.Group(), marks = new TH.Group(); g.add(layer, marks);

    /* ---------- pieces ---------- */
    const onBoard = new Map();                  // point → obj
    const hand = [null, [], []], caps = [null, [], []];
    function make(c) {
      const o = new TH.Group(), p = U.piece(c === 1 ? 'gold' : 'plat'), sh = X.contact(.4, .5); sh.position.y = .002;
      o.add(sh, p); layer.add(o); return { g: o, p, sh, c, at: null };
    }
    function drop(o) { layer.remove(o.g); o.sh.material.dispose(); }
    const chanX = c => (c === 1 ? 1 : -1) * CHX;
    function slotOf(kind, c, k) {   // → [x, y, z]
      if (kind === 'b') return [P(PTS[k][0]), TOP, P(PTS[k][1])];
      if (kind === 'h') return [chanX(c), CHY, -CHZ0 + k * CHP];
      return [chanX(c), CHY, CHZ0 - k * CHP];   // 'c': in the taker's channel, from the near end
    }
    // send o to [x, y, z]: a straight slide on the board, an arc otherwise; delay in ms
    function travel(o, to, how, delay) {
      const key = to.join(',');
      if (o.at === key) return 0;
      o.at = key;
      const g0 = o.g.position, from = [g0.x, g0.y, g0.z];
      if (!how || how === 'snap') { o.g.position.set(...to); o.p.position.y = 0; kick(200); return 0; }
      const dist = Math.hypot(to[0] - from[0], to[2] - from[2]);
      const slide = how === 'slide', fly = how === 'fly', take = how === 'take';
      const dur = slide ? 300 : take ? 520 : fly ? 520 : 440;
      const h = slide ? 0 : Math.min(2.6, .7 + dist * (fly ? .3 : .2));
      anim(dur, k => {
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        o.g.position.set(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e);
        o.p.position.y = slide ? Math.sin(k * Math.PI) * .05 : Math.sin(k * Math.PI) * h;
        o.p.rotation.x = slide ? 0 : Math.sin(k * Math.PI) * (take ? .9 : .25);
        o.sh.material.opacity = .5 * (1 - Math.sin(k * Math.PI) * (slide ? .1 : .7));
        if (k > .86 && !slide) { const q = (k - .86) / .14, s = Math.sin(q * Math.PI) * .07; o.p.scale.set(1 + s, 1 - s * 1.6, 1 + s); }
      }, () => { o.p.position.y = 0; o.p.rotation.x = 0; o.p.scale.set(1, 1, 1); o.sh.material.opacity = .5;
        if (sfx) clack(to[1] < TOP - .1 ? 'felt' : take ? 'take' : 'board'); }, delay);
      return dur + (delay || 0);
    }

    // state → pieces. Returns the ms until everything has landed.
    function sync(S, how) {
      const animate = how !== false, freed = [null, [], []], incoming = [];
      for (const [i, o] of onBoard) if (S.b[i] !== o.c) { onBoard.delete(i); freed[o.c].push(o); }
      for (let i = 0; i < 24; i++) if (S.b[i] && !onBoard.has(i)) incoming.push(i);
      const moves = [];   // [obj, kind]
      for (const i of incoming) {
        const c = S.b[i]; let o = null, kind = 'place';
        if (hand[c].length > S.hand[c]) o = hand[c].pop();
        else if (freed[c].length) { o = freed[c].shift(); kind = S.fly ? 'fly' : 'slide'; }
        else if (caps[3 - c].length > S.caps[3 - c]) o = caps[3 - c].pop();
        else { o = make(c); const s = slotOf('h', c, hand[c].length); o.g.position.set(...s); o.at = s.join(','); }
        onBoard.set(i, o); moves.push([o, slotOf('b', 0, i), kind]);
      }
      for (const c of [1, 2]) {
        for (const o of freed[c]) {   // pieces that left the board without a new point
          if (caps[3 - c].length < S.caps[3 - c]) { caps[3 - c].push(o); o._take = true; }
          else if (hand[c].length < S.hand[c]) hand[c].push(o);
          else { if (animate) { const oo = o; anim(260, k => { oo.p.position.y = k * .8; oo.p.scale.setScalar(1 - k); oo.sh.material.opacity = .5 * (1 - k); }, () => drop(oo)); } else drop(o); }
        }
        while (hand[c].length > S.hand[c]) drop(hand[c].pop());
        while (hand[c].length < S.hand[c]) { const o = make(c), s = slotOf('h', c, hand[c].length); o.g.position.set(...s); o.at = s.join(','); hand[c].push(o); }
        while (caps[c].length > S.caps[c]) drop(caps[c].pop());
        while (caps[c].length < S.caps[c]) { const o = make(3 - c), s = slotOf('c', c, caps[c].length); o.g.position.set(...s); o.at = s.join(','); caps[c].push(o); }
      }
      let wait = 0;
      const lead = moves.length ? 1 : 0;   // a removal follows the move that made the mill
      for (const [o, to, kind] of moves) wait = Math.max(wait, travel(o, to, animate ? kind : 'snap', 0));
      for (const c of [1, 2]) {
        hand[c].forEach((o, k) => { wait = Math.max(wait, travel(o, slotOf('h', c, k), animate ? 'place' : 'snap', 0)); });
        caps[c].forEach((o, k) => { const tk = o._take; o._take = false; wait = Math.max(wait, travel(o, slotOf('c', c, k), animate ? (tk ? 'take' : 'place') : 'snap', tk && lead ? wait + 120 : 0)); });
      }
      kick(300);
      return wait;
    }
    function lift(i, on) {   // the selected piece rises a little
      const o = onBoard.get(i); if (!o) return;
      const y0 = o.p.position.y, y1 = on ? .32 : 0;
      anim(140, k => { o.p.position.y = y0 + (y1 - y0) * k; o.sh.material.opacity = .5 - (on ? .2 : 0) * k; });
    }

    /* ---------- marks ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xff3b2b, .9), from: basic(0xff3b2b, .35), sel: basic(0xffd84a, .95), dest: basic(0xffe27a, .85), rm: basic(0xff4a3a, .9), mill: basic(0xffd24a, .85), hint: basic(0x4ad8ff, .9) };
    const GEO = { ring: new TH.TorusGeometry(.5, .035, 8, 40), dot: new TH.CylinderGeometry(.13, .13, .012, 20), big: new TH.TorusGeometry(.56, .06, 8, 44) };
    GEO.ring.rotateX(Math.PI / 2); GEO.big.rotateX(Math.PI / 2);
    let pulses = [], pulseOn = false;
    function put(geo, mat, i, y) { const m = new TH.Mesh(geo, mat), [x, , z] = slotOf('b', 0, i); m.position.set(x, (y == null ? TOP - .02 : y), z); m.renderOrder = 3; marks.add(m); return m; }
    function pulse() { if (stopped || !pulses.length) { pulseOn = false; return; } const s = 1 + Math.sin(performance.now() / 160) * .08; pulses.forEach(m => m.scale.setScalar(s)); kick(60); requestAnimationFrame(pulse); }
    let millMarks = [];
    function setMarks(o = {}) {
      for (const m of [...marks.children]) if (!millMarks.includes(m)) marks.remove(m);
      pulses = [];
      if (o.last) { const [f, t] = o.last; if (f >= 0) put(GEO.dot, MAT.from, f); if (t >= 0) put(GEO.ring, MAT.last, t, TOP + .005); }
      if (o.sel >= 0 && o.sel != null) put(GEO.big, MAT.sel, o.sel, TOP + .01);
      (o.dests || []).forEach(i => pulses.push(put(GEO.dot, MAT.dest, i, TOP - .015)));
      (o.rm || []).forEach(i => pulses.push(put(GEO.big, MAT.rm, i, TOP + .02)));
      if (o.hint) { const [f, t] = o.hint; if (f >= 0) put(GEO.big, MAT.hint, f, TOP + .02); if (t >= 0) pulses.push(put(GEO.big, MAT.hint, t, TOP + .02)); }
      if (pulses.length && !pulseOn) { pulseOn = true; pulse(); }
      kick(200);
    }
    function mill(pts, quiet) {
      millMarks.forEach(m => marks.remove(m)); millMarks = [];
      if (!pts || !pts.length) { kick(); return; }
      pts.forEach(i => { const m = put(GEO.big, MAT.mill, i, TOP + .01); m.scale.setScalar(.01); millMarks.push(m); });
      anim(320, k => millMarks.forEach(m => m.scale.setScalar(.01 + k * (1 + Math.sin(k * Math.PI) * .25))));
      if (sfx && !quiet) chime();
    }
    function pointAt(x, z) {   // outer-space coordinates → point (within ~0.45 lattice units)
      const bx = x / SC, bz = z / SC; let best = -1, bd = .5;
      for (let i = 0; i < 24; i++) { const d = Math.hypot(P(PTS[i][0]) - bx, P(PTS[i][1]) - bz); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    const xz = i => [P(PTS[i][0]) * SC, P(PTS[i][1]) * SC];
    function dispose() {
      stopped = true; g.remove(layer, marks);
      Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(m => m.dispose());
      layer.traverse(o => { if (o.userData && o.userData.contact && o.material) o.material.dispose(); });
    }
    return { sync, lift, marks: setMarks, mill, pointAt, xz, top: TOP * SC, dispose, count: () => onBoard.size, clack, chime,
      _dump: () => ({ board: [...onBoard].map(([i, o]) => [i, o.g.position.toArray().map(v => +v.toFixed(2)), +o.p.position.y.toFixed(2), o.g.parent === layer]), hand: [hand[1].length, hand[2].length], live: !!layer.parent, inScene: (() => { let x = g; while (x.parent) x = x.parent; return x.type; })() }) };
  };
  X.morrisSet.PTS = PTS;
})();
