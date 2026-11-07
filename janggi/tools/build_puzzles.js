// node janggi/tools/build_puzzles.js mates1.txt [mates2.txt …]  → janggi/puzzles.json
// Input: positions harvested from engine self-play by `jg mates` (tools/native.c): "G k fen move ply" (unique mate in k)
// and "C k fen move ply" (unique mate in k by checks only). Every puzzle is re-verified with the WebAssembly solver the
// page uses, normalised to Cho to move, de-duplicated, played out (attacker: shortest mate, defender: longest resistance)
// and sorted into themes by length: mate1–3 (any moves) and ck3–5 (checks only). (Forked from xiangqi/tools/build_puzzles.js.)
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
const flipFen = f => {   // rotate 180 degrees and swap the colours: Han to move becomes Cho to move
  const [b, s] = f.split(' ');
  const rows = b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join(''));
  return rows.join('/') + ' ' + (s === 'b' ? 'w' : 'b');
};
(async () => {
  const W = await load(), E = W.E;
  const cand = [];
  for (const f of process.argv.slice(2)) {
    let game = 0, lastPly = 1e9, g = f + ':0';
    for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
      const a = ln.trim().split(/\s+/); if (a.length < 6) continue;
      const kind = a[0], k = +a[1], fen = a[2] + ' ' + a[3], ply = +a[5];
      if (ply < lastPly) g = f + ':' + (++game); lastPly = ply;
      cand.push({ kind, k, fen: a[3] === 'b' ? flipFen(fen) : fen, ply, g });
    }
  }
  const kept = [], seen = new Set(), lastOf = {};
  for (const c of cand) {
    const key = c.kind + c.fen.split(' ')[0]; if (seen.has(key)) continue;
    const l = lastOf[c.g + c.kind];
    if (l && c.ply - l.ply <= 2 * l.k) continue;
    seen.add(key); kept.push(c); lastOf[c.g + c.kind] = c;
  }
  const out = [];
  for (const c of kept) {
    const ck = c.kind === 'C', P0 = E.Pos.from(c.fen);
    if (P0.status() !== 0 || P0.side !== 0) continue;
    const L = E.puzzle(c.fen, [], c.k, false, ck); if (!L) continue;
    const win = L.filter(e => e.need > 0 && e.need <= c.k);
    if (win.length !== 1 || win[0].need !== c.k || L.some(e => e.need < 0)) continue;
    if (ck) { const g = E.puzzle(c.fen, [], c.k - 1, false, false); if (g && g.some(e => e.need > 0)) continue; }
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
    out.push({ s: c.fen, n: c.k, ck, a: line[0] });
  }
  for (const p of out) p.theme = p.ck ? (p.n <= 3 ? 'ck3' : p.n === 4 ? 'ck4' : 'ck5') : 'mate' + Math.min(3, p.n);
  const material = fen => { const p = E.Pos.from(fen); let n = 0; for (let s = 0; s < 90; s++) if (p.at(s)) n++; return n; };
  const DEF = [['mate1', 'Mate'], ['mate2', 'Mate'], ['mate3', 'Mate'], ['ck3', 'Check', 1], ['ck4', 'Check', 1], ['ck5', 'Check', 1]];
  const themes = [];
  for (const [id, grp, ck] of DEF) {
    let ps = out.filter(p => p.theme === id).sort((a, b) => a.n - b.n || material(a.s) - material(b.s));
    // keep a few back for the lessons (every 7th of the mate-in-1 / 2 themes)
    if (id === 'mate1' || id === 'mate2') { const keep = new Set(ps.filter((_, i) => i % 7 === 3).slice(0, 8)); fs.writeFileSync(path.join(__dirname, 'lesson_' + id + '.json'), JSON.stringify([...keep].map(p => ({ s: p.s, n: p.n, a: p.a })))); ps = ps.filter(p => !keep.has(p)); }
    ps = ps.slice(0, 60);
    if (!ps.length) continue;
    themes.push({ id, grp, ck: !!ck, puzzles: ps.map(p => Object.assign({ s: p.s, n: p.n, a: p.a }, p.ck ? { ck: 1 } : {})) });
  }
  const total = themes.reduce((a, T) => a + T.puzzles.length, 0);
  const daily = themes.filter(T => T.puzzles.length >= 10).map(T => T.id);
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, total, daily, themes }));
  console.log('candidates', cand.length, 'kept', kept.length, 'verified', out.length, 'total', total);
  for (const T of themes) console.log(' ', T.id, T.puzzles.length);
})();
