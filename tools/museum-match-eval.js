// 博物館「名局選」の形勢（2026-11-27 ユーザー: 形勢評価が出るといい）: every position of every game is read by the site's own engine
// (chess/engine.js's JS search; shogi, xiangqi and go: their WebAssembly engines with the nets, as the pages' workers load them) and kept as the first side's chance of winning, 0–100
// (White / 先手 / Red / Black in go), in atlas/museum/match-eval.js — window.MATCH_EVAL = { <game id>: { e: 'chess-hce' | …, ms, w: [ply 0 … n] } }.
// Run: node tools/museum-match-eval.js [ms per position, default 600] [game ids…]   (games already there are kept; name ids to redo them)
// (go: GO_VISITS=<playouts per position, default 160> instead of the time; runs for different games may go side by side)
const fs = require('fs'), path = require('path'), zlib = require('zlib'), root = path.join(__dirname, '..');
const MS = +process.argv[2] || 600, ONLY = process.argv.slice(3);
const window = {}; global.window = window; global.addEventListener = () => {}; global.localStorage = { getItem: () => null, setItem() {} };
new Function('window', 'addEventListener', 'localStorage', fs.readFileSync(path.join(root, 'atlas/museum/match.js'), 'utf8'))(window, () => {}, global.localStorage);
const M = window.AtlasMatch, out = path.join(root, 'atlas/museum/match-eval.js');
const prev = (() => { const w = {}; try { new Function('window', fs.readFileSync(out, 'utf8'))(w); } catch (e) {} return w.MATCH_EVAL || {}; })();
const pct = x => Math.max(0, Math.min(100, Math.round(x * 100)));
// the engines' scores (from the side to move) → the first side's chance, the usual logistic fits (chess: lichess's; shogi: 600 units ≈ ×e)
const CH = require(path.join(root, 'chess/engine.js'));
const chessW = (cp, white) => { const v = white ? cp : -cp; if (Math.abs(v) > CH.MATET) return v > 0 ? 1 : 0; return 1 / (1 + Math.exp(-0.00368208 * v)); };
// shogi (2026-11-27): the page's WebAssembly search with its NNUE (engine_simd_s1280.wasm + nnue-s1280.bin.gz, search v6), loaded as
// the worker does (shogi/engine.js); the JS search cannot read that net. Scores from the side to move, sigmoid(v / 600) (MODEL_CARD.md).
const SH = require(path.join(root, 'shogi/engine.js'));
let shX = null;
function shogiWasm() {
  if (shX) return shX;
  const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(root, 'shogi/engine_simd_s1280.wasm'))), { env: { now: () => Date.now(), progress() {}, aprogress() {} } }).exports;
  X.init(); const W = SH.getWeights(); new Int16Array(X.memory.buffer, X.weights_ptr(), SH.NFEAT).set(W instanceof Int16Array ? W : Int16Array.from(W));
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(root, 'shogi/nnue-s1280.bin.gz'))), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let h = 0; h < 8; h++) if (dv.getInt32(4 * h, true) !== X.nue_hdr(h)) throw new Error('shogi: the net does not fit the build');
  const u = new Uint8Array(X.memory.buffer); let o = 32;
  for (let sg = 0; X.nue_seg_len(sg); sg++) { const k = X.nue_seg_len(sg); u.set(buf.subarray(o, o + k), X.nue_seg_ptr(sg)); o += k; }
  if (o !== buf.length || !X.nue_file_done()) throw new Error('shogi: the net did not load');
  X.nue_enable(1);
  for (const kv of '85=1,91=1,92=2,55=1,110=1,113=1,115=2,75=4,76=83,77=110,79=3,86=31,88=169,87=163,89=315,93=400,95=62,96=3,97=1087,98=3261,99=207,100=297,101=179,102=81,103=98,104=85,105=29,81=1935,9=6247,43=379,17=182,2=67,1=18,112=391,114=220,116=239'.split(',')) { const [k, x] = kv.split('='); X.set_param(+k, +x); }   // (engine.js SV6: search v6, tuned with the net)
  return (shX = X);
}
function shogiEval(usi, ms) {   // { v: score for the side to move, d: depth } after the moves usi (null: no legal move)
  const X = shogiWasm(), p = new SH.Position(); p.setStart();
  const b = new Int8Array(X.memory.buffer, X.setup_ptr(), 98); b.set(p.board, 0); b.set(p.hand, 81); b[97] = p.side; X.set_position();
  for (const m of usi) { const c = p.fromUsi(m); X.play_move(c); p.doMove(c); }
  X.tt_clear();
  const mv = X.root_search(ms, 0, 0), r = new Int32Array(X.memory.buffer, X.res_ptr(), 4);
  return mv ? { v: X.res_score(), d: r[1] } : null;
}
const shogiW = (v, sente) => { const s = sente ? v : -v; if (Math.abs(s) > SH.MATE - 1000) return s > 0 ? 1 : 0; return 1 / (1 + Math.exp(-s / 600)); };
// xiangqi: engine_simd.wasm + nnue.bin.gz, loaded as xiangqi/engine.js's worker does; the levels' deep search (best()). The NNUE's
// output is the logit of the expected score × 220 (engine.c XQ_K), from the side to move.
const XQ = require(path.join(root, 'xiangqi/engine.js'));
let xqX = null;
function xqWasm() {
  if (xqX) return xqX;
  const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(root, 'xiangqi/engine_simd.wasm'))), { env: { now: () => Date.now(), progress() {} } }).exports;
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(root, 'xiangqi/nnue.bin.gz'))), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), H = dv.getInt32(4, true), IN = 1260;
  if (dv.getUint32(0, true) !== 0x5845554E || dv.getInt32(8, true) !== IN || H !== X.xq_h()) throw new Error('xiangqi: the net does not fit the build');
  const a = buf.buffer; let o = buf.byteOffset + 12;
  new Int16Array(X.memory.buffer, X.xq_w1_ptr(), IN * H).set(new Int16Array(a.slice(o, o + IN * H * 2))); o += IN * H * 2;
  new Int32Array(X.memory.buffer, X.xq_b1_ptr(), H).set(new Int32Array(a.slice(o, o + H * 4))); o += H * 4;
  new Int16Array(X.memory.buffer, X.xq_w2_ptr(), 2 * H).set(new Int16Array(a.slice(o, o + H * 4))); o += H * 4;
  X.xq_set_b2(dv.getInt32(o - buf.byteOffset, true)); X.xq_nnue(1); X.new_game();
  return (xqX = X);
}
function xqEval(moves, ms) {
  const X = xqWasm(); new Int32Array(X.memory.buffer, X.io_ptr(), 8192).set(XQ.setupIO(null, moves, []));
  if (!X.setup()) return null;
  X.new_game(); X.best(99, ms, 0); const r = new Int32Array(X.memory.buffer, X.io_ptr(), 8);
  return r[0] < 0 ? null : { v: r[1], d: r[2] };
}
const xqW = (v, red) => { const s = red ? v : -v; if (Math.abs(s) > XQ.WINT) return s > 0 ? 1 : 0; return 1 / (1 + Math.exp(-s / 220)); };
// go: go/engine_simd.wasm's PUCT search with the strong net (net_strong.bin.gz, b10c128), GO_VISITS playouts (default 160), komi 0
// (the games are from before komi; the net takes the komi as an input). The root's win − loss, from the side to move.
const GO_V = +process.env.GO_VISITS || 160;
let goX = null;
function goEval(moves, n) {   // moves: SGF points ('qd'; '': pass) → Black's chance
  if (!goX) {
    const E = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(root, 'go/engine_simd.wasm'))), {}).exports;
    const raw = zlib.gunzipSync(fs.readFileSync(path.join(root, 'go/net_strong.bin.gz'))), p = E.galloc(raw.length);
    new Uint8Array(E.memory.buffer).set(raw, p); if (E.net_load(p, raw.length) < 0) throw new Error('go: the net did not load');
    E.set_seed(20261127); goX = E;
  }
  const E = goX; E.pos_reset(n, 0); E.pos_tomove(1);
  for (const m of moves) if (!E.pos_play(!m || m === 'tt' ? 361 : (m.charCodeAt(1) - 97) * 19 + (m.charCodeAt(0) - 97))) throw new Error('go: the engine refuses ' + m);
  E.set_param(4, 0); E.set_param(3, 1);
  if (!E.search_init(400000)) throw new Error('go: search_init');
  let done = 1; while (done < GO_V) { const g = E.search_run(Math.min(8, GO_V - done)); if (!g) break; done += g; }
  const f = new Float32Array(E.memory.buffer, E.search_result(1), 4), wl = E.pos_tomove_get() === 1 ? f[2] : -f[2];
  return (wl + 1) / 2;
}
const E = Object.assign({}, prev);
for (const G of M.GAMES) {
  if (E[G.id] && !ONLY.includes(G.id)) continue; if (ONLY.length && !ONLY.includes(G.id)) continue;
  const L = M.line(G), n = L.mv.length, w = [], t0 = Date.now();
  if (G.kind === 'chess') {
    const uci = L.recs.map(r => r.from + r.to + (/=([QRBN])/.exec(L.mv[L.recs.indexOf(r)]) || ['', ''])[1].toLowerCase());
    const ints = [], q = CH.Pos.fromFEN(CH.START); uci.forEach(u => { const m = q.fromUci(u); if (!m) throw new Error(G.id + ': the engine refuses ' + u); ints.push(m); q.make(m); });   // (the engine's own move codes)
    for (let i = 0; i <= n; i++) {
      const r = CH.analyze(CH.START, ints.slice(0, i), MS);
      if (!r.list.length) { const end = /#/.test(L.mv[i - 1] || '') ; w.push(end ? (i % 2 ? 100 : 0) : 50); continue; }   // (no move: mate or stalemate)
      w.push(pct(chessW(r.list[0].v, i % 2 === 0)));
    }
    E[G.id] = { e: 'chess-hce', ms: MS, w };
  } else if (G.kind === 'shogi') {
    const d = [];
    for (let i = 0; i <= n; i++) { const r = shogiEval(L.mv.slice(0, i), MS); d.push(r ? r.d : 99); w.push(r ? pct(shogiW(r.v, i % 2 === 0)) : (i % 2 ? 100 : 0)); }   // (no move: the side to move lost)
    if (n && d[n] < 4) w[n] = w[n - 1]; for (let i = n - 1; i >= 0; i--) if (d[i] < 4) w[i] = w[i + 1];   // (a single legal move: the search stops at once — the value after it; at the end, the one before)
    E[G.id] = { e: 'shogi-nnue', ms: MS, w };
  } else if (G.kind === 'xiangqi') {
    const ints = L.mv.map(u => XQ.mv(XQ.sqAt(9 - +u[1], u.charCodeAt(0) - 97), XQ.sqAt(9 - +u[3], u.charCodeAt(2) - 97))), d = [];
    for (let i = 0; i <= n; i++) { const r = xqEval(ints.slice(0, i), MS); d.push(r ? r.d : 99); w.push(r ? pct(xqW(r.v, i % 2 === 0)) : (i % 2 ? 100 : 0)); }
    if (n && d[n] < 4) w[n] = w[n - 1]; for (let i = n - 1; i >= 0; i--) if (d[i] < 4) w[i] = w[i + 1];
    E[G.id] = { e: 'xiangqi-nnue', ms: MS, w };
  } else if (G.kind === 'go') {
    const mv = L.mv.map(m => m === '-' ? '' : m);
    for (let i = 0; i <= n; i++) w.push(pct(goEval(mv.slice(0, i), G.size || 19)));
    E[G.id] = { e: 'go-net', v: GO_V, komi: 0, w };
  } else continue;
  console.log(G.id, n, 'moves', Math.round((Date.now() - t0) / 1000) + 's', w.filter((_, i) => i % 10 === 0).join(' '));
  { const now = (() => { const w = {}; try { new Function('window', fs.readFileSync(out, 'utf8'))(w); } catch (e) {} return w.MATCH_EVAL || {}; })(); for (const k in now) if (k !== G.id) E[k] = now[k]; }   // (several runs side by side: keep what the others wrote)
  fs.writeFileSync(out, `/* generated by tools/museum-match-eval.js — the first side's chance of winning after each move (0–100), read by the site's engines */\nwindow.MATCH_EVAL = ${JSON.stringify(E).replace(/\},"/g, '},\n"')};\n`);
}
console.log('done', Object.keys(E).length, 'games');
