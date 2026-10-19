/* =====================================================================
   Reversi on the 3D table (portal play).  Uses ../reversi/engine.js
   (same AI, weights and opening book as the full game).
   Adapter contract — every game in atlas/games/<id>.js registers:
     Atlas3D[id] = { levels: n, sides: true|false, start(ctx) → { stop() } }
   ctx = { el, Table3D, lang, t(key), hud(html), level, side, onEnd({win, draw, level}) }
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../reversi/';
  let weights = null, book = null;
  const ready = (async () => {
    try {
      let buf = await fetch(BASE + 'weights.bin.gz').then(r => r.arrayBuffer());
      const u8 = new Uint8Array(buf, 0, 2);
      if (u8[0] === 0x1f && u8[1] === 0x8b && 'DecompressionStream' in window) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      const meta = await fetch(BASE + 'weights.json').then(r => r.json()).catch(() => ({ nphase: 12 }));
      weights = { buffer: buf, nphase: meta.nphase };
    } catch (e) { weights = null; }
    book = await fetch(BASE + 'book.json').then(r => r.ok ? r.json() : null).catch(() => null);
  })();

  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  function flipsOf(cells, sq, color) {
    if (cells[sq]) return [];
    const opp = 3 - color, r0 = sq >> 3, c0 = sq & 7, out = [];
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc; const line = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === color) out.push(...line);
    }
    return out;
  }
  const legal = (cells, color) => { const m = []; for (let s = 0; s < 64; s++) if (!cells[s] && flipsOf(cells, s, color).length) m.push(s); return m; };
  const count = (cells, c) => cells.filter(x => x === c).length;

  function start(ctx) {
    const T3 = ctx.Table3D, THREE = window.THREE, t = ctx.t;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), pass: t('p.pass'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.reversi(true); T3.show('reversi', board);
    const S = board.userData.S, Y = board.userData.top;
    const W = T3.M({ color: 0xf6f3ea, roughness: .35 }), B = T3.M({ color: 0x0e0f12, roughness: .28 });
    const hintM = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .55 });
    const lastM = new THREE.MeshBasicMaterial({ color: 0xff5d5d });
    const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
    const discs = {}, hints = new THREE.Group(); board.add(hints);
    const lastDot = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 16), lastM); lastDot.visible = false; board.add(lastDot);
    const human = ctx.side === 2 ? 2 : 1, ai = 3 - human;
    let cells = Array(64).fill(0); cells[27] = cells[36] = 2; cells[28] = cells[35] = 1;
    let turn = 1, over = false, stopped = false, busy = false, worker = null;

    function makeDisc(sq, color) {
      const g = new THREE.Group();
      const top = T3.bevelDisc(.42, .1, W), bot = T3.bevelDisc(.42, .1, B);
      bot.position.y = 0; top.position.y = .1; g.add(bot, top);   // white side up by default
      const inner = new THREE.Group(); inner.add(g); g.position.y = -.1;
      const outer = new THREE.Group(); outer.add(inner);
      const [x, z] = pos(sq); outer.position.set(x, Y + .1, z);
      inner.rotation.x = color === 1 ? Math.PI : 0;
      board.add(outer); discs[sq] = { outer, inner, color };
      return discs[sq];
    }
    function anim(dur, f, done) { const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }
    function drop(sq, color) { const d = makeDisc(sq, color); anim(260, k => { d.outer.position.y = Y + .1 + (1 - k) * (1 - k) * 2.2; }); }
    function flip(sq, color, delay) {
      const d = discs[sq]; d.color = color;
      const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
      setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + .1 + Math.sin(k * Math.PI) * .7; }), delay);
    }
    for (let s = 0; s < 64; s++) if (cells[s]) makeDisc(s, cells[s]);

    function showHints() {
      while (hints.children.length) hints.remove(hints.children[0]);
      if (over || turn !== human) return;
      legal(cells, human).forEach(s => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 20), hintM); const [x, z] = pos(s); m.position.set(x, Y + .02, z); hints.add(m); });
    }
    function hud(msg) {
      const b = count(cells, 1), w = count(cells, 2);
      const side = c => `<span class="hs ${turn === c && !over ? 'on' : ''}"><i class="dk ${c === 1 ? 'b' : 'w'}"></i>${c === human ? L.you : L.ai}<b>${c === 1 ? b : w}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function apply(sq, color) {
      const fl = flipsOf(cells, sq, color);
      cells[sq] = color; fl.forEach(s => { cells[s] = color; });
      drop(sq, color);
      const [x, z] = pos(sq);
      fl.sort((a, b) => Math.hypot((a & 7) - (sq & 7), (a >> 3) - (sq >> 3)) - Math.hypot((b & 7) - (sq & 7), (b >> 3) - (sq >> 3))).forEach((s, i) => flip(s, color, 200 + i * 70));
      lastDot.position.set(x, Y + .32, z); lastDot.visible = false;
      setTimeout(() => { lastDot.visible = true; }, 300);
      return 300 + fl.length * 70 + 380;
    }
    function next() {
      if (stopped) return;
      const me = legal(cells, turn), opp = legal(cells, 3 - turn);
      if (!me.length && !opp.length) return end();
      if (!me.length) { hud(L.pass); turn = 3 - turn; return setTimeout(next, 900); }
      showHints();
      if (turn === human) { hud(L.turn); return; }
      hud(L.think); aiMove();
    }
    async function aiMove() {
      busy = true;
      await ready;
      if (stopped) return;
      if (!worker) {
        worker = new Worker(BASE + 'engine.js');
        if (weights) worker.postMessage({ type: 'weights', buffer: weights.buffer.slice(0), nphase: weights.nphase });
        if (book) worker.postMessage({ type: 'book', book });
      }
      const t0 = Date.now();
      worker.onmessage = e => {
        const m = e.data; if (m.type !== 'result' || stopped) return;
        setTimeout(() => {
          if (stopped) return;
          const wait = m.move >= 0 ? apply(m.move, ai) : 0;
          turn = human; busy = false; setTimeout(next, wait);
        }, Math.max(0, 450 - (Date.now() - t0)));
      };
      worker.postMessage({ type: 'think', id: 1, cells: cells.slice(), toMove: ai, opts: { level: ctx.level } });
    }
    function end() {
      over = true; showHints();
      const me = count(cells, human), op = count(cells, ai);
      hud(me > op ? L.win : me < op ? L.lose : L.draw);
      ctx.onEnd({ win: me > op, draw: me === op, level: ctx.level, score: me + ' - ' + op });
    }
    function onClick(e) {
      if (over || busy || turn !== human) return;
      const p = T3.pick(e, Y); if (!p) return;
      const c = Math.floor((p.x + S / 2) / (S / 8)), r = Math.floor((p.z + S / 2) / (S / 8));
      if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const sq = r * 8 + c;
      if (!flipsOf(cells, sq, human).length) return;
      busy = true; const wait = apply(sq, human); turn = ai;
      while (hints.children.length) hints.remove(hints.children[0]);
      setTimeout(() => { busy = false; next(); }, wait);
    }
    ctx.el.addEventListener('click', onClick);
    setTimeout(next, 600); hud('');
    return { stop() { stopped = true; ctx.el.removeEventListener('click', onClick); if (worker) worker.terminate(); } };
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.reversi = { levels: 10, sides: true, start };
})();
