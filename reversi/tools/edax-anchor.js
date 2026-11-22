// Edax as an outside yardstick on the same axes as tools/train/frontier.js: Edax at fixed levels plays one of our levels
// (the search of engine.js on one thread, no book) from the same balanced openings, each opening twice with the sides
// swapped; the output is Edax's Elo against that level and the thinking time of both. With frontier.js's table for the same
// baseline this shows how far our settings are from Edax at equal time. Edax only runs here (GPL; nothing of it goes into
// the site). Guide: claude/reversi-mac-verification.md.
//   EDAX=~/edax-reversi/bin/mEdax-… node tools/edax-anchor.js --levels 12,15,18,21 [--base lv28|lv31|lv34|d,x,w,e] [--n 100]
//        [--openings tools/train/op10.bin] [--procs 8] [--out edax-anchor.jsonl] [--games games.jsonl]
//   --base 20,22,24,28 (depth, exact, win/loss, to-the-end) | lv28 | lv31 | lv34 (those levels' four numbers as of 2026-11-20) | L31 (the level as it is now)
//   [--weights w.bin.gz] (another evaluation, a v5 file of rvtrain; its name goes into the table)
//   [--t 1.1] (how hard Multi-ProbCut cuts; today 1.5)  [--variant nn_p200] (a test build under tools/variants/, tools/build-variants.sh)
//   … --bases "17,20,22,26;18,22,24,28" (several settings, one after another)      node tools/edax-anchor.js --table (all results so far)
// --games: every position of every game (the side to move as X, who moved) for tools/phase-loss.js — where in the game the discs are lost.
// (Edax is started once per move with -solve; its time is the search time it prints, ours the CPU time of think.)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), cp = require('child_process'), os = require('os');
const RV = path.join(__dirname, '..'), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (args.includes('--table')) {   // every result so far (edax-anchor.jsonl), one table per Edax level: our time, our Elo against Edax, and whether a faster setting is at least as strong
  const rows = fs.readFileSync(opt('out', 'edax-anchor.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)), last = new Map();
  for (const r of rows) last.set(r.level + '|' + r.base, r);
  for (const level of [...new Set(rows.map(r => r.level))].sort((a, b) => a - b)) {
    const rs = [...last.values()].filter(r => r.level === level).sort((a, b) => a.secOurs - b.secOurs); let best = -1e9;
    console.log(`\nEdax レベル${level}（1局 約${(rs.reduce((t, r) => t + r.secEdax, 0) / rs.length).toFixed(1)}秒）に対して`);
    console.log('| 自前の設定（深さ,読み切り,勝敗読み,終局まで） | 自前の時間（1局） | Edax 比 | 自前の Elo | 局数 | |');
    console.log('|---|---|---|---|---|---|');
    for (const r of rs) { const e = -r.elo, front = e > best; if (front) best = e;
      console.log(`| ${r.base} | ${r.secOurs.toFixed(2)}秒 | ×${(r.secOurs / r.secEdax).toFixed(2)} | ${e >= 0 ? '+' : ''}${e} ± ${r.eloErr} | ${2 * r.n} | ${front ? '◎ ここまでで最強' : '（もっと速い設定のほうが強い）'} |`); }
  }
  process.exit(0);
}
const EDAX = process.env.EDAX; if (!EDAX || !fs.existsSync(EDAX)) { console.error('set EDAX to the Edax executable (its data/eval.dat beside it)'); process.exit(1); }
const BASES = { lv28: [13, 20, 22, 26], lv31: [20, 22, 24, 28], lv34: [25, 23, 25, 30] };
if (opt('bases', '') && args[0] !== '--worker') {   // --bases "17,20,22,26;18,22,24,28": one run after another, same options otherwise
  const rest = args.filter((a, i) => a !== '--bases' && args[i - 1] !== '--bases' && a !== '--base' && args[i - 1] !== '--base');
  for (const b of opt('bases').split(';').map(x => x.trim()).filter(Boolean)) cp.execFileSync(process.execPath, [__filename, ...rest, '--base', b], { stdio: 'inherit' });
  process.exit(0);
}
const BNAME = opt('base', 'lv28'), bv = BASES[BNAME] || BNAME.split(',').map(Number);
const TV = opt('t', ''), VAR = opt('variant', ''), WFILE = opt('weights', ''), TAG = (TV ? ' t' + TV : '') + (VAR ? ' ' + VAR : '') + (WFILE ? ' ' + path.basename(WFILE).replace(/\.bin\.gz$/, '') : '');
const LVN = /^L(\d+)$/.test(BNAME) ? +BNAME.slice(1) : 0;   // --base L30: the site's level 30 as it is (engine.js LEVELS: mix, extra solves, its own t), without the book
const CFG = { depth: bv[0], exact: bv[1], wld: bv[2], end: bv[3], mpc: 1 };
const LEVELS = opt('levels', '12,15,18,21').split(',').map(Number), N = +opt('n', 100), PROCS = +opt('procs', Math.max(1, os.cpus().length - 2));
const OPEN = path.resolve(opt('openings', path.join(__dirname, 'train/op10.bin'))), OUT = opt('out', 'edax-anchor.jsonl'), GAMES = opt('games', '');
const M64 = (1n << 64n) - 1n;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function flips(s, P, O) { let f = 0n; const x0 = s & 7, y0 = s >> 3;
  for (const [dx, dy] of DIRS) { let x = x0 + dx, y = y0 + dy, t = 0n; while (x >= 0 && x < 8 && y >= 0 && y < 8 && (O >> BigInt(y * 8 + x)) & 1n) { t |= 1n << BigInt(y * 8 + x); x += dx; y += dy; }
    if (t && x >= 0 && x < 8 && y >= 0 && y < 8 && (P >> BigInt(y * 8 + x)) & 1n) f |= t; }
  return f; }
const moves = (P, O) => { const m = []; for (let s = 0; s < 64; s++) if (!(((P | O) >> BigInt(s)) & 1n) && flips(s, P, O)) m.push(s); return m; };
const pc = x => { let n = 0; for (; x; x &= x - 1n) n++; return n; };

if (args[0] === '--worker') {   // one process: its share of the openings for one level
  let dir = RV;
  if (VAR) {   // a test build: engine.js beside that engine.wasm in a directory of its own (engine.js loads the engine.wasm next to it)
    const w = path.join(__dirname, 'variants', `engine_${VAR}.wasm`); if (!fs.existsSync(w)) { console.error('no ' + w + ' (sh tools/build-variants.sh)'); process.exit(1); }
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-variant-')); fs.copyFileSync(path.join(RV, 'engine.js'), path.join(dir, 'engine.js')); fs.copyFileSync(w, path.join(dir, 'engine.wasm'));
  }
  const E = require(path.join(dir, 'engine.js')); if (TV) E.MPC.t = +TV;
  let b = zlib.gunzipSync(fs.readFileSync(WFILE ? path.resolve(WFILE) : path.join(RV, 'weights.bin.gz'))); b = new Uint8Array(b); E.setWeights(new Int16Array(b.buffer, 0, b.length >> 1), 30);   // (a v5 file says its own phases)
  const level = +args[1], k = +args[2], d = fs.readFileSync(OPEN), tmp = path.join(os.tmpdir(), `edax-anchor-${process.pid}.obf`);
  const edaxMove = (P, O) => {
    let s = ''; for (let q = 0; q < 64; q++) s += (P >> BigInt(q)) & 1n ? 'X' : (O >> BigInt(q)) & 1n ? 'O' : '-';
    fs.writeFileSync(tmp, s + ' X;\n');
    const o = cp.execFileSync(EDAX, ['-solve', tmp, '-l', String(level), '-n', '1', '-book-usage', 'off'], { cwd: path.dirname(EDAX), stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const m = o.match(/^\s*1\|\s*\S+\s+[+-]\d+\s+(\d+):(\d+)\.(\d+)\s+\d+\s+(?:\d+\s+)?([a-hA-H][1-8])/m); if (!m) throw new Error('edax: ' + o);
    return { move: (m[4].toLowerCase().charCodeAt(0) - 97) + 8 * (+m[4][1] - 1), sec: +m[1] * 60 + +m[2] + +('0.' + m[3]) };
  };
  const ourMove = (P, O) => { const c = []; for (let q = 0; q < 64; q++) c.push((P >> BigInt(q)) & 1n ? 1 : (O >> BigInt(q)) & 1n ? 2 : 0);
    const t0 = process.cpuUsage(), t = E.think(c, 1, LVN ? { level: LVN, noBook: true, variety: false } : { cfg: CFG, noBook: true, variety: false, time: 0 }), u = process.cpuUsage(t0); return { move: t.move, sec: (u.user + u.system) / 1e6 }; };
  const game = (P, O, edaxFirst) => {   // the disc difference for Edax
    let side = edaxFirst ? 0 : 1, passes = 0, tE = 0, tU = 0; const log = []; E.clearTT();
    while (passes < 2) {
      const ms = moves(P, O); if (!ms.length) { [P, O] = [O, P]; side ^= 1; passes++; continue; } passes = 0;
      let r; if (ms.length === 1) r = { move: ms[0], sec: 0 }; else if (side === 0) { r = edaxMove(P, O); tE += r.sec; } else { r = ourMove(P, O); tU += r.sec; }
      if (!ms.includes(r.move)) throw new Error('illegal move ' + r.move);
      if (GAMES) { let t = ''; for (let q = 0; q < 64; q++) t += (P >> BigInt(q)) & 1n ? 'X' : (O >> BigInt(q)) & 1n ? 'O' : '-'; log.push([t, side, ms.length]); }
      const f = flips(r.move, P, O), nP = P | f | (1n << BigInt(r.move)); [P, O] = [O & ~f & M64, nP]; side ^= 1;
    }
    const p = pc(P), o = pc(O), em = 64 - p - o; let df = p - o; df = df > 0 ? df + em : df < 0 ? df - em : 0;
    return { d: side === 0 ? df : -df, tE, tU, log };
  };
  for (let i = k; i < N && (i + 1) * 17 <= d.length; i += PROCS) {
    const P = d.readBigUInt64LE(i * 17), O = d.readBigUInt64LE(i * 17 + 8), a = game(P, O, true), c = game(P, O, false);
    if (GAMES) for (const g of [a, c]) fs.appendFileSync(GAMES, JSON.stringify({ level, base: BNAME + TAG, i, edaxFirst: g === a, d: g.d, pos: g.log }) + '\n');
    process.stdout.write(JSON.stringify({ i, d1: a.d, d2: c.d, tE: a.tE + c.tE, tU: a.tU + c.tU }) + '\n');
  }
  try { fs.unlinkSync(tmp); } catch (e) {}
} else (async () => {
  for (const level of LEVELS) {
    const rs = []; console.error(`Edax level ${level} against ${BNAME}${TAG} (${N} openings × 2 games, ${PROCS} processes)`);
    await Promise.all([...Array(PROCS).keys()].map(k => new Promise((res, rej) => {
      const c = cp.spawn(process.execPath, [__filename, '--worker', String(level), String(k), ...args], { stdio: ['ignore', 'pipe', 'inherit'] }); let buf = '';
      c.stdout.on('data', x => { buf += x; let j; while ((j = buf.indexOf('\n')) >= 0) { rs.push(JSON.parse(buf.slice(0, j))); buf = buf.slice(j + 1); process.stderr.write(`\r${rs.length} / ${N}  `); } });
      c.on('exit', code => code ? rej(new Error('worker ' + code)) : res());
    })));
    const n = rs.length; let sw = 0, sw2 = 0, sd = 0, tE = 0, tU = 0, ub = 0, uw = 0, dbl = 0, dwh = 0;   // ub / uw: our score with black / white (the openings have black to move)
    for (const r of rs) { ub += r.d2 < 0 ? 1 : r.d2 ? 0 : 0.5; uw += r.d1 < 0 ? 1 : r.d1 ? 0 : 0.5; dbl -= r.d2; dwh -= r.d1; const p = ((r.d1 > 0 ? 1 : r.d1 ? 0 : 0.5) + (r.d2 > 0 ? 1 : r.d2 ? 0 : 0.5)) / 2; sw += p; sw2 += p * p; sd += (r.d1 + r.d2) / 2; tE += r.tE; tU += r.tU; }
    const sc = sw / n, se = Math.sqrt((sw2 / n - sc * sc) / n), cl = Math.min(0.999, Math.max(0.001, sc)), elo = -400 * Math.log10(1 / cl - 1), dElo = se * 400 / (Math.LN10 * cl * (1 - cl));
    const out = { level, base: BNAME + TAG, n, oursBlack: +(100 * ub / n).toFixed(1), oursWhite: +(100 * uw / n).toFixed(1), oursBlackDiscs: +(dbl / n).toFixed(2), oursWhiteDiscs: +(dwh / n).toFixed(2), score: +(100 * sc).toFixed(1), elo: Math.round(elo), eloErr: Math.round(dElo), discs: +(sd / n).toFixed(2), secEdax: +(tE / (2 * n)).toFixed(3), secOurs: +(tU / (2 * n)).toFixed(3) };
    fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
    console.log(`\rEdax レベル${level} 対 ${BNAME}${TAG}: Edax の得点率 ${out.score}%  Elo ${elo >= 0 ? '+' : ''}${out.elo} ± ${out.eloErr}  平均石差 ${out.discs >= 0 ? '+' : ''}${out.discs}  考えた時間（1局）Edax ${out.secEdax} 秒 / 自前 ${out.secOurs} 秒（×${(out.secEdax / out.secOurs).toFixed(2)}）`);
    console.log(`    自前の得点率：黒番 ${out.oursBlack}%（平均 ${out.oursBlackDiscs >= 0 ? '+' : ''}${out.oursBlackDiscs} 石）／白番 ${out.oursWhite}%（平均 ${out.oursWhiteDiscs >= 0 ? '+' : ''}${out.oursWhiteDiscs} 石）`);
  }
})().catch(e => { console.error(e); process.exit(1); });
