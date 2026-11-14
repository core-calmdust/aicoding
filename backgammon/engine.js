// Backgammon V2 — AI / analysis worker
importScripts('bg.js?v=20261115p', 'explain.js?v=20261021op');
let ready = null;
async function init() {
  let j = null, man = null, bin = null, bo = null;
  try {
    j = await fetch('weights.json').then(r => r.json());
    if (j.contact && BG.setNets) BG.setNets(j);          // contact + race nets (GNUbg-style inputs)
    else BG.setNet(new BG.Net(j.nh, new Float32Array(j.w)));
  } catch (e) { console.warn('net weights unavailable', e); }
  try {   // strong evaluator: wildbg contact/race networks (MIT OR Apache-2.0, see THIRD_PARTY_LICENSES.txt)
    if (BG.loadWildbg) {
      [man, bin] = await Promise.all([fetch('wildbg.json').then(r => r.json()), fetch('wildbg.bin').then(r => r.arrayBuffer())]);
      BG.loadWildbg(man, bin);
    }
  } catch (e) { console.warn('wildbg networks unavailable', e); }
  try {
    const res = await fetch('bearoff.bin.gz');
    let buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf, 0, 2);
    if (u8[0] === 0x1f && u8[1] === 0x8b) {
      const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      buf = await new Response(ds).arrayBuffer();
    }
    BG.loadBearoff(buf); bo = buf;
  } catch (e) { console.warn('bear-off database unavailable', e); }
  // (2026-11-11) the C engine (engine.c): the same evaluators and search ~6-10x faster; engine_simd.wasm (wasm SIMD) where the
  // browser has SIMD, else engine.wasm (the same numbers). Without it (or ?nowasm) the JavaScript of bg.js does everything.
  try {
    if (typeof WebAssembly === 'object' && BG.setWasm && j && bin && !/[?&]nowasm\b/.test(self.location.search || '')) {
      let simd = true;
      try { simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { simd = false; }
      const url = (simd ? 'engine_simd.wasm' : 'engine.wasm') + '?v=1';
      const r = WebAssembly.instantiateStreaming ? await WebAssembly.instantiateStreaming(fetch(url), { env: {} }) : await WebAssembly.instantiate(await fetch(url).then(x => x.arrayBuffer()), { env: {} });
      if (!BG.setWasm(r.instance.exports, j, man, bin, bo)) console.warn('C engine: data mismatch, using JavaScript');
      else core = simd ? 'wasm-simd' : 'wasm';
    }
  } catch (e) { console.warn('C engine unavailable', e); }
}
let core = 'js';
ready = init();

const choosePlay = BG.aiChoosePlay, cubeFor = BG.aiCube, now = () => performance.now();
function preRoll(pos, side, depth) { return BG.evalRoll(pos, side, depth); }

onmessage = async e => {
  const m = e.data;
  await ready;
  const pos = m.pos ? Int8Array.from(m.pos) : null;
  let out = { id: m.id };
  try {
    if (m.type === 'move') {
      const t0 = now();
      const pl = choosePlay(pos, m.side, m.dice, m.level, m.tag, m.pre, m.cfg);   // (cfg: PRO mode)
      out.moves = pl.moves; out.ms = now() - t0;
    } else if (m.type === 'cube') {          // should side (on roll) double?
      const c = cubeFor(m.level, pos, m.side, m.ctx);
      out.double = c.double;
    } else if (m.type === 'take') {          // m.side = the doubler (on roll); answer for the taker
      const c = cubeFor(m.level, pos, m.side, m.ctx);
      out.take = c.take;
    } else if (m.type === 'analyze') {       // candidate plays with equities
      const pl = BG.analyzePlays(pos, m.side, m.dice[0], m.dice[1], { ply: m.ply === undefined ? 1 : m.ply, keep1: m.keep || 8, margin1: 0.3, keep2: 3, margin2: 0.05, deadline: m.pre ? 0 : now() + (m.time || 1500), pre: m.pre });
      out.list = pl.slice(0, m.max || 12).map(x => ({ moves: x.moves, e: x.e, v: x.v, ply: x.ply, key: BG.key(x.pos) }));
      if (m.played) {   // make sure the played move is valued at the same depth as the best
        const k = m.played, x = pl.find(y => BG.key(y.pos) === k);
        if (x) {
          const top = pl[0].ply;
          if (x.ply < top) { x.v = (m.pre && m.pre[k + ':' + top]) || BG.evalPly ? BG.evalPly(x.pos, 1 - m.side, top) : top >= 2 ? BG.eval2(x.pos, 1 - m.side) : BG.eval1(x.pos, 1 - m.side); x.e = BG.equity(x.v); x.ply = top; }
          out.played = { moves: x.moves, e: x.e, v: x.v, ply: x.ply, key: k };
          // commentary: why the best play beats the played one (features + templated reasons, see explain.js)
          if (m.explain && self.BGX) {
            try {
              out.sit = BGX.situation(pos, m.side);
              if (BGX && pl[0] !== x && pl[0].e - x.e >= (m.explainMin || 0.02)) out.x = BGX.compare(pos, m.side, pl[0], x).r;
            } catch (e) {}
          }
        }
      }
      out.n = pl.length;
    } else if (m.type === 'plays0') {       // the threads (mt.js): every play valued at 0-ply, best first
      const pl = BG.analyzePlays(pos, m.side, m.dice[0], m.dice[1], { ply: 0 });
      out.list = pl.map(x => ({ pos: Array.from(x.pos), key: BG.key(x.pos), e: x.e, ply: 0 }));
    } else if (m.type === 'ply') {          // the threads: one candidate (the position after it, o = the opponent on roll) at a depth
      out.v = BG.evalPly(pos, m.o, m.ply);
    } else if (m.type === 'plyr') {         // the threads: one opponent roll (m.i) of a candidate's 1・2-ply value (BG.plySum adds them)
      if (BG.plyWhole(pos)) out.whole = BG.evalPly(pos, m.o, m.ply); else out.v = BG.plyRoll(pos, m.o, m.ply, m.i);
    } else if (m.type === 'ping') {
      out.core = core;
    } else if (m.type === 'eval') {          // pre-roll evaluation of a position (side on roll)
      const v = preRoll(pos, m.side, m.depth || 0);
      out.v = v;
      if (m.ctx) out.cube = BG.cubeDecision(v, m.ctx);
    } else if (m.type === 'evalMany') {      // static pre-roll evaluations for the graph
      out.list = m.items.map(it => BG.evalPos(Int8Array.from(it.pos), it.side));
    } else if (m.type === 'cubeinfo') {      // cube analysis for hints / review
      const v = preRoll(pos, m.side, m.depth === undefined ? 1 : m.depth);
      out.v = v; out.cube = BG.cubeDecision(v, m.ctx);
    }
  } catch (err) { out.error = String(err && err.stack || err); }
  postMessage(out);
};
