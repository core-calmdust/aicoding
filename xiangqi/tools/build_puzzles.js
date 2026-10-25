// node tools/build_puzzles.js mates1.txt [mates2.txt …]  → puzzles.json
// Input: positions harvested from engine self-play by `xq mates` (tools/native.c): "G k fen move ply" (unique mate in k)
// and "C k fen move ply" (unique mate in k by checks only). Every puzzle is re-verified here with the WebAssembly solver
// the page uses, normalised to Red to move, de-duplicated, played out (attacker: shortest mate, defender: longest
// resistance) and sorted into themes by the final mating pattern or by length.
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
const flipFen = f => {   // rotate 180 degrees and swap the colours: Black to move becomes Red to move
  const [b, s] = f.split(' ');
  const rows = b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join(''));
  return rows.join('/') + ' ' + (s === 'b' ? 'w' : 'b');
};
(async () => {
  const W = await load(), E = W.E;
  const files = process.argv.slice(2);
  const cand = [];
  for (const f of files) {
    let game = 0, lastPly = 1e9, g = f + ':0';
    for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
      const a = ln.trim().split(/\s+/); if (a.length < 6) continue;
      const kind = a[0], k = +a[1], fen = a[2] + ' ' + a[3], ply = +a[5];
      if (ply < lastPly) g = f + ':' + (++game); lastPly = ply;
      cand.push({ kind, k, fen: a[3] === 'b' ? flipFen(fen) : fen, ply, g });
    }
  }
  // one puzzle per mating line: drop positions that continue an already kept line of the same game
  const kept = [], seen = new Set(), lastOf = {};
  for (const c of cand) {
    const key = c.kind + c.fen.split(' ')[0]; if (seen.has(key)) continue;
    const l = lastOf[c.g + c.kind];
    if (l && c.ply - l.ply <= 2 * l.k) continue;
    seen.add(key); kept.push(c); lastOf[c.g + c.kind] = c;
  }
  // PZ_SHARD=i/n PZ_PART=file: verify only every n-th candidate and write the part; PZ_PARTS=a,b,…: merge verified parts
  const shard = process.env.PZ_SHARD ? process.env.PZ_SHARD.split('/').map(Number) : null;
  const out = [];
  if (process.env.PZ_PARTS) for (const f of process.env.PZ_PARTS.split(',')) out.push(...JSON.parse(fs.readFileSync(f, 'utf8')));
  else for (const [ci, c] of kept.entries()) {
    if (shard && ci % shard[1] !== shard[0]) continue;
    const ck = c.kind === 'C', P0 = E.Pos.from(c.fen);
    if (P0.status() !== 0 || P0.turn !== 1) continue;
    // verify: the solver finds exactly one first move that mates within k, and no shorter mate
    const L = E.puzzle(c.fen, [], c.k, false, ck); if (!L) continue;
    const win = L.filter(e => e.need > 0 && e.need <= c.k);
    if (win.length !== 1 || win[0].need !== c.k || L.some(e => e.need < 0)) continue;
    if (ck) { const g = E.puzzle(c.fen, [], c.k - 1, false, false); if (g && g.some(e => e.need > 0)) continue; }   // checks-only only when no quicker free mate
    // main line
    const line = []; let ok = true;
    for (let step = 0; step < 2 * c.k; step++) {
      const pos = E.replay(c.fen, line).pos; if (pos.status() !== 0) break;
      if (step % 2 === 0) {
        const A = E.puzzle(c.fen, line, c.k - step / 2, false, ck).filter(e => e.need > 0).sort((a, b) => a.need - b.need);
        if (!A.length) { ok = false; break; } line.push(A[0].m);
      } else {
        const D = E.puzzle(c.fen, line, c.k - (step - 1) / 2, true, ck);
        if (!D || !D.length) { ok = false; break; }
        let best = null; for (const e of D) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!best || v > best.v) best = { m: e.m, v }; }
        if (best.v >= 50) { ok = false; break; } line.push(best.m);
      }
    }
    const end = E.replay(c.fen, line).pos;
    if (!ok || end.status() !== -1) continue;
    out.push({ s: c.fen, n: c.k, ck, a: line[0], line, pat: pattern(E, end) });
  }
  if (shard) { fs.writeFileSync(process.env.PZ_PART, JSON.stringify(out)); console.log('part', shard.join('/'), out.length); return; }
  // themes
  const by = id => out.filter(p => p.theme === id);
  for (const p of out) {
    if (p.ck) p.theme = p.n <= 3 ? 'ck3' : p.n === 4 ? 'ck4' : 'ck5';
    else if (p.pat) p.theme = p.pat; else p.theme = 'mate' + p.n;
  }
  // a pattern theme needs enough puzzles; otherwise its puzzles go back to the mate-in-n themes
  for (const id of ['hc', 'dc', 'mg', 'wc', 'face', 'rr']) if (by(id).length < 6) for (const p of by(id)) p.theme = 'mate' + p.n;
  const DEF = [['mate1', 'Mate'], ['mate2', 'Mate'], ['mate3', 'Mate'], ['ck3', 'Check', 1], ['ck4', 'Check', 1], ['ck5', 'Check', 1],
    ['hc', 'Pattern'], ['dc', 'Pattern'], ['mg', 'Pattern'], ['wc', 'Pattern'], ['face', 'Pattern'], ['rr', 'Pattern']];
  const themes = [];
  for (const [id, grp, ck] of DEF) {
    let ps = by(id).sort((a, b) => a.n - b.n || material(E, a.s) - material(E, b.s));
    // keep a few back for the lessons (tools/gen_lessons.js uses the puzzles not in the collection)
    if (['mate1', 'mate2', 'hc', 'dc', 'face'].includes(id)) { const keep = new Set(ps.filter((_, i) => i % 7 === 3).slice(0, 6)); ps = ps.filter(p => !keep.has(p)); }
    ps = ps.slice(0, 60);
    for (const p of ps) p.used = 1;
    if (!ps.length) continue;
    themes.push({ id, grp, ck: !!ck, puzzles: ps.map(p => Object.assign({ s: p.s, n: p.n, a: p.a }, p.ck ? { ck: 1 } : {})) });
  }
  const total = themes.reduce((a, T) => a + T.puzzles.length, 0);
  const daily = themes.filter(T => T.puzzles.length >= 10).map(T => T.id);
  if (process.env.PZ_ALL) fs.writeFileSync(process.env.PZ_ALL, JSON.stringify(out.map(p => ({ s: p.s, n: p.n, ck: p.ck, a: p.a, pat: p.pat, used: p.used || 0 }))));
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, total, daily, themes }));
  console.log('candidates', cand.length, 'kept', kept.length, 'verified', out.length, 'total', total);
  for (const T of themes) console.log(' ', T.id, T.puzzles.length);
})();
function material(E, fen) { const p = E.Pos.from(fen); let n = 0; for (let s = 0; s < 90; s++) if (p.at(s)) n++; return n; }
// the mating pattern of the final position (Black is mated; Red delivered it)
function pattern(E, pos) {
  const at = s => pos.at(s), T = p => p & 7, isRed = p => p && p < 8;
  let bk = -1, rk = -1; for (let s = 0; s < 90; s++) { if (at(s) === 9) bk = s; if (at(s) === 1) rk = s; }
  if (bk < 0) return null;
  const rows = s => Math.floor(s / 9), cols = s => s % 9;
  // checkers: red pieces giving check (find by testing each red piece's attack on the black king)
  const checkers = [];
  for (let s = 0; s < 90; s++) if (isRed(at(s)) && T(at(s)) !== 1) {
    if (attacksKing(E, pos, s, bk)) checkers.push(s);
  }
  if (!checkers.length) return null;
  const c = checkers[0], t = T(at(c));
  const between = (a, b) => { const r = []; if (rows(a) === rows(b)) { const st = cols(a) < cols(b) ? 1 : -1; for (let x = a + st; x !== b; x += st) if (at(x)) r.push(x); } else if (cols(a) === cols(b)) { const st = a < b ? 9 : -9; for (let x = a + st; x !== b; x += st) if (at(x)) r.push(x); } return r; };
  if (checkers.length === 1 && t === E.CANNON) {
    const sc = between(c, bk);
    if (sc.length === 1 && at(sc[0]) === E.HORSE) return 'hc';
    if (sc.length === 1 && at(sc[0]) === E.CANNON) return 'dc';
    // smothered palace: the king's side squares in the palace are blocked by its own advisors
    const side = [bk - 1, bk + 1].filter(x => rows(x) === rows(bk) && cols(x) >= 3 && cols(x) <= 5);
    if (side.length === 2 && side.every(x => at(x) === 10)) return 'mg';
  }
  if (checkers.length === 1 && t === E.HORSE) return 'wc';
  // facing generals: the red general takes away a square the black king could otherwise use
  if (rk >= 0) {
    for (const x of [bk - 1, bk + 1, bk - 9, bk + 9]) {
      if (x < 0 || x >= 90 || cols(x) < 3 || cols(x) > 5 || rows(x) > 2) continue;
      if (Math.abs(cols(x) - cols(bk)) + Math.abs(rows(x) - rows(bk)) !== 1) continue;
      if (at(x) && !isRed(at(x))) continue;
      if (cols(x) === cols(rk) && between(x, rk).filter(y => y !== bk).length === 0) {
        // that square is attacked by nothing else red (only the facing rule forbids it)
        if (onlyFacing(E, pos, bk, x, rk)) return 'face';
      }
    }
  }
  // two rooks: one checks, the other covers the king's row or file next to it
  if (t === E.ROOK && checkers.length === 1) for (let s = 0; s < 90; s++) if (at(s) === E.ROOK && s !== c && (rows(s) <= 2 || Math.abs(cols(s) - cols(bk)) === 1) && (rows(s) === rows(bk) + 1 || rows(s) === rows(bk) - 1 || rows(s) === rows(bk) || Math.abs(cols(s) - cols(bk)) === 1)) return 'rr';
  return null;
}
// does the red piece on s attack the square k (a pseudo-legal capture there)
function attacksKing(E, pos, s, k) { return pos.pseudo(0, true, s).some(m => E.mTo(m) === k); }
// would the black king be safe on x if the red general stood elsewhere (so only the facing rule forbids x)?
function onlyFacing(E, pos, bk, x, rk) {
  const q = pos.clone(), b = q.b;
  if (b[x]) return false;
  b[bk] = 0; b[x] = 9; q.k[1] = x;
  if (!q.attacked(1)) return false;
  const alt = [rk - 1, rk + 1].find(y => y % 9 >= 3 && y % 9 <= 5 && Math.floor(y / 9) === Math.floor(rk / 9) && !b[y]);
  if (alt == null) return false;
  b[rk] = 0; b[alt] = 1; q.k[0] = alt;
  return !q.attacked(1);
}
