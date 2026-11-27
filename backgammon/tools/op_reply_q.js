// (2026-11-26 第2期・担当B) backgammon/open: the opening rolls that the lessons オープニング①② also ask at the start position
// (⑤ of claude/lesson-quality.md: one start position per roll, so the same board and roll) are asked as the SECOND move instead:
// the opponent has opened with one of the 15 opening rolls, and you roll the item's dice. The item's book play (its line a) must stay
// the one best play there (rolled out, behind it by more than the tolerance and 2 standard errors), so the problem still teaches the
// item's opening play — now also as a reply.
//   node backgammon/tools/op_reply_q.js check r42:2      → roll out a stored reply line and compare with its stored values
//   node backgammon/tools/op_reply_q.js find o31 [--write] → for each opponent opening (book play), roll out the plays of the item's
//        roll; keep those where the book play is the unique right play; --write stores the best candidate as it.rq
// Rollouts as openings.json roR: N games, truncated after T plies (then the 0-ply net), both sides playing the 0-ply best play;
// common random dice for all the plays of one decision (seeded by the position), standard error from the games.
'use strict';
const fs = require('fs'), path = require('path');
const { BG } = require('./load.js');
{ // the C engine (engine.wasm), as the AI worker loads it — the same evaluators, ~50× faster than the JavaScript
  const zlib = require('zlib'), D = path.join(__dirname, '..'), bin = fs.readFileSync(path.join(D, 'wildbg.bin')), bo = zlib.gunzipSync(fs.readFileSync(path.join(D, 'bearoff.bin.gz')));
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(D, 'engine.wasm'))), { env: {} }).exports;
  if (!BG.setWasm(x, JSON.parse(fs.readFileSync(path.join(D, 'weights.json'), 'utf8')), JSON.parse(fs.readFileSync(path.join(D, 'wildbg.json'), 'utf8')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length), bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length))) throw new Error('engine.wasm did not load'); }
const OPF = path.join(__dirname, '../openings.json'), OP = JSON.parse(fs.readFileSync(OPF, 'utf8'));
const START = '0000005030000500000000002000000050300005000000000020';
const dec = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const enc = p => Array.from(p, x => x.toString(16)).join('');
const applyM = (p, s, m) => { const q = p.slice(); for (let i = 0; i + 1 < m.length; i += 2) BG.apply(q, s, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65); return q; };
const code = (p0, s, pl) => pl.moves.map(c => String.fromCharCode(65 + BG.mvFrom(c), 65 + BG.mvTo(c))).join('');
function rng(seed) { let a = seed >>> 0 || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return (a >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function best0(p, s, a, b) { let bp = null, be = -1e9; for (const pl of BG.genPlays(p, s, a, b)) { const e = BG.equity(BG.evalAfter(pl.pos, s)); if (e > be) { be = e; bp = pl; } } return bp; }
// one game from q (side 1 to move), T plies, the equity for side 0
function game(q, T, R) {
  let p = q.slice(), s = 1;
  for (let k = 0; k < T; k++) {
    const a = 1 + Math.floor(R() * 6), b = 1 + Math.floor(R() * 6), pl = best0(p, s, a, b);
    if (pl) p = pl.pos;
    const w = BG.winner(p); if (w >= 0) { const n = BG.winKind(p, w); return w === 0 ? n : -n; }
    s = 1 - s;
  }
  return s === 1 ? BG.equity(BG.evalAfter(p, 0)) : BG.equity(BG.evalPos(p, 0));
}
const SEED = +((process.argv.find(a => a.startsWith('--seed=')) || '').slice(7) || 0);
let SEED2 = 0;
function rollout(q, N, T, seed) { seed += SEED + SEED2; let sm = 0, s2 = 0; for (let i = 0; i < N; i++) { const R = rng(seed + i * 7919); const e = game(q, T, R); sm += e; s2 += e * e; } const m = sm / N; return { e: m, se: Math.sqrt(Math.max(0, s2 / N - m * m) / N) }; }
// the plays of a decision: every legal play with its 2-ply value; the top ones (within 0.12 at 2-ply, at least 5) rolled out
function decide(p0, d, N, T, quiet) {
  const legal = BG.genPlays(p0, 0, d[0], d[1]).map(pl => ({ m: code(p0, 0, pl), pos: pl.pos, e2: BG.equity(BG.evalPly(pl.pos, 1, 2)) })).sort((x, y) => y.e2 - x.e2);
  const top = legal.filter((x, i) => i < 4 || legal[0].e2 - x.e2 <= 0.06).slice(0, 5), seed = hash(enc(p0) + d.join(''));
  top.forEach(x => { Object.assign(x, (r => ({ ro: r.e, se: r.se }))(rollout(x.pos, N, T, seed))); if (!quiet) process.stderr.write('.'); });
  return legal;
}
const row = x => [x.m, +x.e2.toFixed(4), 2, x.ro != null ? +x.ro.toFixed(4) : null, x.ro != null ? +x.se.toFixed(4) : null];
const [cmd, arg] = process.argv.slice(2), write = process.argv.includes('--write');
const roR = Object.assign({}, OP.roR || { N: 1296, T: 8 });
const NARG = +((process.argv.find(a => a.startsWith('--n=')) || '').slice(4) || 0);   // (o21・o41: the candidates are close, so more games: --n=2592 halves the variance; the N used is stored as it.rq.N)
if (NARG) roR.N = NARG;
if (cmd === 'check') {
  const [id, li] = arg.split(':'), it = OP.items[id], ln = it.lines[+li], seq = ln.seq;
  let p = dec(START); seq.slice(0, -1).forEach(st => { p = applyM(p, 1, st.m); });
  const R = decide(p, seq[seq.length - 1].d, roR.N, roR.T);
  console.log('\nstored:', JSON.stringify((ln.plays || []).filter(y => y[3] != null).map(y => [y[0], y[3]])));
  console.log('mine:  ', JSON.stringify(R.filter(y => y.ro != null).map(y => [y.m, +y.ro.toFixed(4), +y.se.toFixed(4)])));
} else if (cmd === 'find') {
  const it = OP.items[arg], book = it.lines[0].m, books = new Set(it.lines.map(l => l.m)), tol = OP.tol, out = [];
  // the opponent's opening: every non-double opening roll's book play (line a of each open item)
  const opens = Object.values(OP.items).filter(x => x.kind === 'open').flatMap(x => (process.argv.includes('--alt') ? x.lines : x.lines.slice(0, 1)).map(l => ({ d: x.d, m: l.m })));   // (--alt: the opponent's other book plays of its opening too = o41, where no line-a opening leaves 41 with one right play)
  // positions already asked (⑤): every reply line and every lesson play problem — checked again by tools/lesson-verify-bgopen.js
  const used = new Set(); Object.values(OP.items).filter(x => x.kind !== 'open').forEach(x => x.lines.forEach(l => { if (l.seq.length === 2 && l.seq[0].r === 0) used.add(l.seq[0].m + ':' + l.seq[0].d.join('') + '>' + l.seq[1].d.join('')); }));
  // 2-ply first (cheap): roll out only where the book play is the 2-ply best, the widest margins first; stop at the first that passes
  const skip = (process.argv.find(a => a.startsWith('--skip=')) || '').slice(7).split(',');   // (opponent openings whose position is a lesson problem)
  const pre = opens.filter(o => !skip.includes(o.d.join('')) && !skip.includes(o.d.join('') + ':' + o.m) && !used.has(o.m + ':' + o.d.join('') + '>' + it.d.join(''))).map(o => { const p = applyM(dec(START), 1, o.m);
    const L = BG.genPlays(p, 0, it.d[0], it.d[1]).map(pl => ({ m: code(p, 0, pl), e2: BG.equity(BG.evalPly(pl.pos, 1, 2)) })).sort((x, y) => y.e2 - x.e2);
    const L2 = L.filter(y => !books.has(y.m)); return { o, p, g2: books.has(L[0].m) ? L[0].e2 - L2[0].e2 : -1 }; }).filter(x => x.g2 > 0.02).sort((x, y) => y.g2 - x.g2);
  console.log('2-ply:', pre.map(x => x.o.d.join('') + ' ' + x.g2.toFixed(3)).join(', '));
  for (const { o, p } of pre) {
    const R = decide(p, it.d, roR.N, roR.T, true), ro = R.filter(y => y.ro != null).sort((x, y) => y.ro - x.ro);
    const b = ro[0], ok = ro.filter(y => b.ro - y.ro <= tol + 1e-9 || b.ro - y.ro < 2 * Math.hypot(b.se, y.se));
    const gap = ro[1] ? b.ro - ro[1].ro : 9, sd = ro[1] ? 2 * Math.hypot(b.se, ro[1].se) : 0;
    const b2 = Math.max(...R.map(y => y.e2)), near2 = R.filter(y => y.ro == null && b2 - y.e2 <= tol);
    const good = (process.argv.includes('--a') ? b.m === book : books.has(b.m)) && ok.every(y => books.has(y.m)) && !near2.length && ok.length * 3 <= R.length;   // (several right plays: all of them the item's book plays — 「同じくらい良い手は全部正解」)
    console.log(`${o.d.join('')} ${o.m}: best ${b.m} ${b.ro.toFixed(4)}  2nd ${ro[1] && ro[1].m} gap ${gap.toFixed(4)} (2se ${sd.toFixed(4)}) right ${ok.length}${good ? '  ← OK' : ''}`);
    if (good) {   // the right plays must stay the same when the rollouts are run again with other dice (追84: a read that wavers is not used)
      const rs = new Set(ok.map(y => y.m)); let same = true;
      if (gap < 2 * Math.max(tol, sd) || ok.length > 1) { const S0 = SEED; SEED2 = 99991; const R2 = decide(p, it.d, roR.N, roR.T, true); SEED2 = 0; const r2 = R2.filter(y => y.ro != null).sort((x, y) => y.ro - x.ro), b2 = r2[0];
        const ok2 = r2.filter(y => b2.ro - y.ro <= tol + 1e-9 || b2.ro - y.ro < 2 * Math.hypot(b2.se, y.se)).map(y => y.m); same = ok2.length === rs.size && ok2.every(m => rs.has(m)); console.log(`   again: right ${ok2.join(',')} ${same ? 'SAME' : 'DIFFERENT'}`); }
      if (same) { out.push({ o, R, gap, margin: Math.min(gap - tol, gap - sd) }); break; } }
  }
  out.sort((x, y) => y.margin - x.margin);
  console.log(JSON.stringify(out.map(x => [x.o.d.join(''), x.o.m, +x.gap.toFixed(4)])));
  if (out.length) {
    const c = out[0]; it.rq = { N: roR.N, seq: [{ r: 0, d: c.o.d, m: c.o.m }, { r: 1, d: it.d, m: c.R.filter(y => y.ro != null).sort((x, y) => y.ro - x.ro)[0].m }], plays: c.R.filter(y => y.ro != null || c.R.indexOf(y) < 12).map(row) };
    console.log('RQ ' + JSON.stringify(it.rq)); if (!write) return;
    const F = JSON.parse(fs.readFileSync(OPF, 'utf8')); F.items[arg].rq = it.rq; fs.writeFileSync(OPF, JSON.stringify(F)); console.log('wrote', arg, 'rq', JSON.stringify(it.rq.seq));
  }
}
if (cmd === 'recheck') {   // the stored it.rq rolled out again with other dice (--seed=…): the right plays and the closest wrong play must stay as stored
  const it = OP.items[arg], tol = OP.tol; if (it.rq.N && !NARG) roR.N = it.rq.N; let p = dec(START); p = applyM(p, 1, it.rq.seq[0].m);
  const R = decide(p, it.d, roR.N, roR.T, true), ro = R.filter(y => y.ro != null).sort((x, y) => y.ro - x.ro), b = ro[0];
  const ok = ro.filter(y => b.ro - y.ro <= tol + 1e-9 || b.ro - y.ro < 2 * Math.hypot(b.se, y.se)).map(y => y.m).sort();
  const st = it.rq.plays.filter(y => y[3] != null).sort((x, y) => y[3] - x[3]), sb = st[0];
  const sok = st.filter(y => sb[3] - y[3] <= tol + 1e-9 || sb[3] - y[3] < 2 * Math.hypot(sb[4], y[4])).map(y => y[0]).sort();
  const same = ok.join() === sok.join();
  console.log(`${arg}: stored right ${sok} · again ${ok} (best ${b.m} ${b.ro.toFixed(4)}, 2nd ${ro[1].m} ${ro[1].ro.toFixed(4)}) ${same ? 'SAME' : 'DIFFERENT'}`);
}
if (cmd === 'merge') {   // store the RQ lines printed by find (files given after merge) as it.rq
  const F = JSON.parse(fs.readFileSync(OPF, 'utf8'));
  for (const f of process.argv.slice(3).filter(a => !a.startsWith('--'))) { const l = fs.readFileSync(f, 'utf8').split('\n').find(x => x.startsWith('RQ ')); if (!l) continue; const id = path.basename(f).replace(/\.txt$/, ''); F.items[id].rq = JSON.parse(l.slice(3)); console.log('rq', id, JSON.stringify(F.items[id].rq.seq)); }
  fs.writeFileSync(OPF, JSON.stringify(F));
}
