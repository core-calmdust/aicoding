// One thread of <game>/engine_mt.wasm (or another build: 3rd arg) in Node, as the page's lead on the shared memory: the
// nodes and move to depth D of each position of pos_<game>.txt — to check that the native copy (gen.py, sim.c "1") and the
// wasm search the same tree, and that a change leaves the one-thread search as it was.
//   node wasm1.js <repo> <game> [wasm file] [D]      (in the folder of dump.js's files)
const [W, G, WF, DA] = process.argv.slice(2), fs = require('fs');
const D = +DA || 9;
const POS = fs.readFileSync('pos_' + G + '.txt', 'utf8').trim().split('\n').map(l => l.slice(2).split(' ').map(Number));
(async () => {
  let sum = 0;
  for (let i = 0; i < POS.length; i++) {   // (a new instance for each position: fresh history, as sim.c)
  const mem = new WebAssembly.Memory({ initial: 1536, maximum: 16384, shared: true });
  const env = { memory: mem, now: () => Date.now(), progress: () => {}, aprogress: () => {} };
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(WF || (W + '/' + G + '/engine_mt.wasm')), { env });
  const X = instance.exports, SLOT = 8 << 20;
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + 2 * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
  const u8 = () => new Uint8Array(mem.buffer);
  if (G === 'xiangqi') {
    const b = fs.readFileSync('net_xiangqi.bin'), H = b.readInt32LE(4), IN = 1260; let o = 12;
    u8().set(b.subarray(o, o + IN * H * 2), X.xq_w1_ptr()); o += IN * H * 2;
    u8().set(b.subarray(o, o + H * 4), X.xq_b1_ptr()); o += H * 4;
    u8().set(b.subarray(o, o + H * 4), X.xq_w2_ptr()); o += H * 4;
    X.xq_set_b2(b.readInt32LE(o)); X.xq_nnue(1);
  }
  if (G === 'chess') {
    X.init(); X.new_game();
    const b = fs.readFileSync('net_chess.bin'); if (b.length > X.nn_cap()) throw new Error('net size');
    u8().set(b, X.nn_ptr()); if (!X.nn_load(b.length)) throw new Error('net format'); X.nn_enable(1);   // (king buckets or not)
  }
  if (G === 'shogi') {
    X.init();
    const w = fs.readFileSync('w_shogi.bin'); u8().set(w, X.weights_ptr());
    const b = fs.readFileSync('net_shogi.bin'), H = b.readInt32LE(4), NIN = b.readInt32LE(8); let o = 12;
    if (H !== X.nue_h()) throw new Error('net size');
    u8().set(b.subarray(o, o + NIN * H * 2), X.nue_w1_ptr()); o += NIN * H * 2;
    u8().set(b.subarray(o, o + H * 4), X.nue_b1_ptr()); o += H * 4;
    u8().set(b.subarray(o, o + H * 4), X.nue_w2_ptr()); o += H * 4;
    X.nue_set_b2(b.readInt32LE(o)); X.nue_enable(1); X.tt_clear();
  }
  if (G === 'tafl') {   // (2026-11-11) the Copenhagen net, as tools/mtsim/g_tafl.h
    const b = fs.readFileSync('net_tafl.bin'); u8().set(b, X.nn_buf()); if (!X.nn_load(b.length)) throw new Error('net'); X.nn_enable(1);
  }
    let line;
    if (G === 'tafl') {   // (move, value, depth, nodes)
      new Int32Array(mem.buffer, X.io_ptr(), 8192).set(POS[i]); if (!X.setup()) throw new Error('setup'); X.best(D, 0, 0);
      const io = new Int32Array(mem.buffer, X.io_ptr(), 4); const n = X.last_nodes(); sum += n; line = `m${io[0]} v${io[2]} d${io[3]} n${n}`;
    }
    if (G === 'xiangqi' || G === 'janggi') {
      new Int32Array(mem.buffer, X.io_ptr(), 8192).set(POS[i]); X.setup(); X.best(D, 0, 0);
      const io = new Int32Array(mem.buffer, X.io_ptr(), 4); const n = X.last_nodes(); sum += n; line = `m${io[0]} d${io[2]} n${n}`;
    }
    if (G === 'chess') {
      const str = String.fromCharCode(...POS[i]) + '\0'; u8().set(Buffer.from(str, 'latin1'), X.setup_ptr()); X.set_position();
      X.think(0, 0, D, 0); const r = new Int32Array(mem.buffer, X.res_ptr(), 4); const n = X.res_nodes(); sum += n; line = `m${r[0]} v${r[1]} d${r[2]} n${n}`;
    }
    if (G === 'shogi') {
      const p = POS[i]; new Int8Array(mem.buffer, X.setup_ptr(), 98).set(p.slice(0, 98)); X.set_position();
      for (const m of p.slice(98)) X.play_move(m);
      X.set_exclude(0); X.root_search(0, D, 0); const r = new Int32Array(mem.buffer, X.res_ptr(), 4 + 64); const n = r[2] >>> 0; sum += n;
      line = `m${r[0]} v${X.res_score()} d${r[1]} n${n} pv ${Array.from(r.subarray(4, 4 + Math.max(0, Math.min(r[3], 64)))).join(',')}`;   // (2026-11-11: the value and the line too)
    }
    console.log('pos', i + 1, line);
  }
  console.log('sum', sum);
})();
