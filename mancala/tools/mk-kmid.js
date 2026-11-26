// (2026-11-26 第2期 担当A) the kalah middle-game lessons (and the opening lessons k_open / k_open6, 4 and 6 seeds) k_combo / k_tempo / k_hoard / k_starve / k_count:
// candidate boards from games of the engine against a noisy player, each kept only when it passes the strict checks of
// tools/lesson-verify.js mancala (① ② ③ ④ ⑤ ⑥) — the words (⑦ ⑧) are checked afterwards by the verifier itself.
//   node mancala/tools/mk-kmid.js <lesson> [games] [seed]   → JSON candidates on stdout (one per line)
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '../..');
const E = require(path.join(ROOT, 'mancala/engine.js'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'mancala/engine_simd.wasm'))), { env: { now: () => performance.now() } }); E.setWasm(x.exports);
const R = 'kalah', id = process.argv[2], NG = +(process.argv[3] || 300), OPEN = /^k_open/.test(id), SEEDS = id === 'k_open6' ? 6 : 4;   // (k_open / k_open6: the opening lessons, 2026-11-26)
let rs = +(process.argv[4] || 7) >>> 0 || 7; const rnd = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const tr = (b, s, k) => E.trace(Int8Array.from(b), s, k, R), lg = (b, s) => E.legal(Int8Array.from(b), s, R);
const an = (b, D) => { E.ttClear(); const r = E.analyze(b, 0, R, 1e9, D); r.V = r.list.slice().sort((p, q) => q.v - p.v); return r; };
const onBoard = b => b.reduce((s, v, i) => i % 7 === 6 ? s : s + v, 0);
const toOpp = (b, k) => tr(b, 0, k).events.filter(e => e.t === 'drop' && e.at >= 7 && e.at <= 12).length;
const turnCap = (b, k) => { let best = 0; const T = tr(b, 0, k); if (T.cap) return T.cap; if (!T.extra || T.over) return 0;
  for (const q of lg(T.board, 0)) best = Math.max(best, turnCap(Array.from(T.board), q)); return best; };
// ④ the lesson's own move (also in tools/lesson-verify.js mcTopic)
const V = require(path.join(ROOT, 'tools/lesson-verify.js'));
const topic = V._mc.topic;
// positions: the engine (depth 4) against itself with 35% random moves, side 0 to move (run with timeout: the candidates print as found)
const seen = new Set(), out = [];
for (let g = 0; g < NG; g++) {
  let b = Array.from(E.initial(SEEDS)), s = 0, ply = 0;
  while (ply < (OPEN ? 16 : 80)) { const L = lg(b, s); if (!L.length) break;
    if (s === 0 && ply >= (OPEN ? 1 : 6)) { const key = b.join(','); if (!seen.has(key)) { seen.add(key); out.push(b.slice()); } }
    let k; if (rnd() < 0.35) k = L[Math.floor(rnd() * L.length)]; else { E.ttClear(); const r = E.analyze(b, s, R, 1e9, 4); k = r.list.slice().sort((p, q) => q.v - p.v)[0].m; }
    const T = tr(b, s, k); b = Array.from(T.board); if (T.over) break; s = T.next; ply++; }
}
let n = 0;
for (const b of out) {
  const L0 = lg(b, 0); if (L0.length < 3) continue;
  if (!OPEN && (id === 'k_count' ? onBoard(b) > 22 : onBoard(b) <= 22)) continue;
  const q = an(b, 10), V0 = q.V; if (V0.length < 2 || V0[0].v - V0[1].v < 2.5) continue;
  const A = V0[0].m; if (topic(id, b, A, E, R)) continue;
  const s18 = an(b, id === 'k_count' ? 90 : 18), s16 = id === 'k_count' ? s18 : an(b, 16);
  if (id === 'k_count' && !s18.exact) continue;
  let ok = true; for (const r of [s18, s16]) { if (r.V[0].m !== A || r.V[0].v - r.V[1].v < 2.2) ok = false; } if (!ok) continue;
  const sc = Array(6).fill(null); s18.list.forEach(z => { sc[z.m] = s18.exact ? Math.round(z.v) : Math.round(z.v * 10) / 10; });
  const g = E.turnMaxFirst(Int8Array.from(b), 0, R), gm = Math.max(...g.filter(z => z !== null));
  const d = s18.V.filter(z => z.m !== A && z.v >= s18.V[0].v - 6).length + (g[A] === gm ? 0 : 1);
  const P = { b, sc, best: A }; if (s18.exact) P.exact = true;
  console.log(JSON.stringify({ P, d, gap: +(s18.V[0].v - s18.V[1].v).toFixed(1), legal: L0.length })); n++;
}
console.error(`${id}: ${out.length} positions, ${n} candidates`);
