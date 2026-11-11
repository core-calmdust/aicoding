/* わからせ将棋オーバーキル！ — the strong AI (okengine.wasm + the shogi NNUE) as a Web Worker. claude/overkill-spec.md §6.
   { pos, lv, id } → { id, move, score, depth, nodes }. The move is always one of OverkillEngine.legal(pos) (the page's referee);
   if the wasm engine cannot load, the old JS search (engine.js) answers instead. Also loadable in node for the tests (OkBridge). */
(function (G) {
  'use strict';
  const STD_T = ['', 'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'OU', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY'];
  const SP_T = ['PAWN', 'KNIGHT', 'BISHOP', 'ROOK', 'QUEEN', 'AMAZON', 'CANNON', 'LION', 'ARCHER', 'MUSKET', 'MERC', 'BARRIER', 'BOMBER', 'ALCH', 'SAGE', 'CHRONO', 'KAGE', 'GENERAL'];
  const NAMES = STD_T.concat(SP_T), CODE = {}; NAMES.forEach((n, i) => { if (n) CODE[n] = i; });
  const HAND_T = ['', 'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI'];

  // the bridge between a JS position / move and the engine's buffers
  function Bridge(X, mem) {
    const setup = () => new Int32Array(mem.buffer, X.setup_ptr(), 81 * 3 + 18);
    function load(P) {
      const s = setup();
      for (let i = 0; i < 81; i++) { const p = P.b[i];
        s[i] = p ? CODE[p.t] | (p.s << 6) : 0; s[81 + i] = p ? (p.m ? 1 : 0) | (p.used ? 2 : 0) : 0; s[162 + i] = p ? p.rdy | 0 : 0; }
      for (let c = 0; c < 2; c++) for (let t = 0; t < 8; t++) s[243 + c * 8 + t] = t ? (P.hand[c][HAND_T[t]] | 0) : 0;
      s[259] = P.side; s[260] = P.ply | 0;
      X.set_position();
    }
    // engine move → the JS move shape (before matching it against the legal list)
    function toJS(P, m) {
      const to = m & 127, f = (m >> 7) & 127, x = (m >> 14) & 127, k = (m >> 21) & 7, pr = (m >> 24) & 1, t = (m >> 25) & 63;
      if (k === 0) return { f, to, pr, k: 'm' };
      if (k === 1) return { f: -1, to, t: HAND_T[t], pr: 0, k: 'd' };
      if (k === 2) return { f, to: f, x, pr: 0, k: P.b[f] && P.b[f].t === 'LION' ? 'igui' : 'shoot' };
      if (k === 3) return { f, to: f, x, pr: 0, k: 'fire' };
      if (k === 4) return { f, to: f, x, pr: 0, k: 'alch' };
      return { f, to, t: HAND_T[t], pr: 0, k: 'revive' };
    }
    const same = (a, b) => a.k === b.k && a.f === b.f && a.to === b.to && (a.pr | 0) === (b.pr | 0) && (a.x == null ? -1 : a.x) === (b.x == null ? -1 : b.x) && (a.t || '') === (b.t || '');
    function match(legal, P, m) { const j = toJS(P, m); return legal.find(l => same(l, j)) || null; }
    return { load, toJS, match, same, mem };
  }

  // Lv.1 … Lv.20: the low levels choose among scored root moves with noise; from Lv.9 a timed search
  function plan(lv) {
    lv = Math.max(1, Math.min(20, lv | 0));
    if (lv <= 4) return { ana: 1, noise: 520 - lv * 90 };
    if (lv <= 8) return { ana: 2, noise: 260 - (lv - 5) * 60 };
    if (lv <= 12) return { ms: 250 + (lv - 9) * 150, depth: lv - 6 };
    return { ms: [900, 1200, 1500, 1900, 2300, 2800, 3400, 4000][lv - 13], depth: 0 };
  }

  function think(X, br, E, P, lv) {
    const legal = E.legal(P); if (!legal.length) return null;
    if (legal.length === 1) return { move: legal[0], score: 0, depth: 0, nodes: 0 };
    br.load(P);
    const pl = plan(lv);
    if (pl.ana) {
      const n = X.analyze(pl.ana), ms = new Int32Array(br.mem.buffer, X.ana_moves(), n);
      const sc = new Float64Array(br.mem.buffer, X.ana_scores(), n);
      let best = null, bs = -Infinity;
      for (let i = 0; i < n; i++) { const v = sc[i] + (Math.random() + Math.random() + Math.random() - 1.5) * pl.noise; if (v > bs) { const j = br.match(legal, P, ms[i]); if (j) { bs = v; best = j; } } }
      return best ? { move: best, score: bs, depth: pl.ana, nodes: X.get_nodes() } : null;
    }
    const m = X.root_search(pl.ms, pl.depth);
    const r = new Int32Array(br.mem.buffer, X.res_ptr(), 4);
    const j = m ? br.match(legal, P, m) : null;
    return j ? { move: j, score: X.res_score(), depth: r[1], nodes: r[2] } : null;
  }

  // the net: shogi/nnue.bin.gz (magic, H, NIN, W1 i16, B1 i32, W2 i16[2H], B2 i32)
  function loadNet(X, mem, buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (dv.getUint32(0, true) !== 0x5145554E) return false;
    const H = dv.getInt32(4, true), NIN = dv.getInt32(8, true);
    if (H !== X.nue_h() || NIN !== 2534) return false;
    let o = 12; const u8 = new Uint8Array(mem.buffer);
    u8.set(buf.subarray(o, o + NIN * H * 2), X.nue_w1_ptr()); o += NIN * H * 2;
    u8.set(buf.subarray(o, o + H * 4), X.nue_b1_ptr()); o += H * 4;
    u8.set(buf.subarray(o, o + H * 4), X.nue_w2_ptr()); o += H * 4;
    X.nue_set_b2(dv.getInt32(o, true));
    X.nue_enable(1);
    return true;
  }

  G.OkBridge = { Bridge, plan, think, loadNet, CODE, NAMES };

  // ---- as a Web Worker
  if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof postMessage === 'function' && typeof importScripts === 'function') {
    const QS = (self.location.search || '');
    importScripts('engine.js' + QS);
    const E = self.OverkillEngine;
    let X = null, MEM = null, BR = null;
    const simdOK = (() => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; } })();
    async function fetchNet() {
      if (typeof DecompressionStream === 'undefined') return null;
      const res = await fetch(new URL('../shogi/nnue.bin.gz', self.location.href)); if (!res.ok) return null;
      let buf = new Uint8Array(await res.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      return buf;
    }
    const ready = (async () => {
      const r = await WebAssembly.instantiateStreaming(fetch(new URL((simdOK ? 'okengine_simd.wasm' : 'okengine.wasm') + QS, self.location.href)), { env: { now: () => performance.now() } });
      X = r.instance.exports; MEM = X.memory; X.init(); BR = Bridge(X, MEM);
      try { const net = await fetchNet(); if (net) loadNet(X, MEM, net); } catch (e) { /* material evaluation */ }
    })().catch(() => { X = null; });
    self.onmessage = async e => {
      const { pos, lv, id } = e.data;
      await ready;
      let r = null;
      try { if (X) r = think(X, BR, E, pos, lv); } catch (err) { r = null; }
      if (!r) r = E.search(pos, E.level(lv));   // fallback: the old JS search
      postMessage({ id, move: r && r.move, score: r && r.score, depth: r && r.depth, nodes: r && r.nodes });
    };
  }
})(typeof self !== 'undefined' ? self : this);
