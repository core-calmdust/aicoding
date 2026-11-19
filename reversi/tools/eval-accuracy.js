// How accurate the evaluation is in the opening and the midgame, against other programs on the same positions: the value of
// a shallow full-width search (depth 2, 4, 6, 8) of ours, Edax and Egaroucid, compared with deep searches of Edax and of
// Egaroucid as the reference (mean absolute difference, discs). To be fair each side is read against the OTHER program's
// reference. Edax and Egaroucid only run here (GPL; nothing of them goes into the site). Guide: claude/reversi-mac-verification.md.
//   EDAX=~/edax-reversi/bin/mEdax-… EGAROUCID_DIR=~/Egaroucid/bin node tools/eval-accuracy.js --positions tools/train/pairs.bin
//        [--empties 44,36,30] [--n 120] [--ref-level 24] [--threads 10] [--weights weights.bin.gz --phases 30]
// --positions: records of 17 bytes (P, O as 64-bit little endian, 1 byte) — pairs.bin, op10.bin, …; the positions with the
// given numbers of empty squares are taken evenly from the file. --weights: an evaluation file to test instead of the site's.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), cp = require('child_process'), os = require('os');
const RV = path.join(__dirname, '..'), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const EDAX = process.env.EDAX, EGA = process.env.EGAROUCID_DIR;
if (!EDAX || !EGA || !opt('positions')) { console.error('EDAX=… EGAROUCID_DIR=… node tools/eval-accuracy.js --positions file.bin [--empties 44,36,30] [--n 120] [--ref-level 24] [--threads 10]'); process.exit(1); }
const EXE = fs.existsSync(path.join(EGA, 'Egaroucid_for_Console.out')) ? './Egaroucid_for_Console.out' : './Egaroucid_for_Console.exe';
const EMP = opt('empties', '44,36,30').split(',').map(Number), N = +opt('n', 120), REF = opt('ref-level', '24'), TH = opt('threads', String(Math.max(1, os.cpus().length - 2)));
const DEPTHS = [2, 4, 6, 8];
const E = require(path.join(RV, 'engine.js'));
{ let b = zlib.gunzipSync(fs.readFileSync(path.resolve(opt('weights', path.join(RV, 'weights.bin.gz'))))); b = new Uint8Array(b); E.setWeights(new Int16Array(b.buffer, 0, b.length >> 1), +opt('phases', 30)); }
const pcb = x => { let n = 0; for (; x; x &= x - 1n) n++; return n; };
const str = (P, O) => { let s = ''; for (let q = 0; q < 64; q++) s += (P >> BigInt(q)) & 1n ? 'X' : (O >> BigInt(q)) & 1n ? 'O' : '-'; return s; };
const cells = (P, O) => { const c = []; for (let q = 0; q < 64; q++) c.push((P >> BigInt(q)) & 1n ? 1 : (O >> BigInt(q)) & 1n ? 2 : 0); return c; };
const edax = (file, level, th) => { const o = cp.execFileSync(EDAX, ['-solve', file, '-l', String(level), '-n', String(th), '-book-usage', 'off'], { cwd: path.dirname(EDAX), maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(), v = [];
  for (const l of o.split('\n')) { const m = l.match(/^\s*\d+\|\s*\S+\s+([+-]\d+)\s/); if (m) v.push(+m[1]); } return v; };
const ega = (file, level, th) => { const o = cp.execFileSync(EXE, ['-solve', file, '-l', String(level), '-nobook', '-t', String(th)], { cwd: EGA, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  return o.split('\n').filter(l => l.startsWith('|') && !l.includes('Level')).map(l => +l.split('|')[4]); };
const mae = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length;
const d = fs.readFileSync(path.resolve(opt('positions'))), total = Math.floor(d.length / 17), tmp = path.join(os.tmpdir(), `rv-evalacc-${process.pid}`);
for (const e of EMP) {
  const pos = [], seen = new Set(), all = [];
  for (let i = 0; i < total; i++) { const P = d.readBigUInt64LE(i * 17), O = d.readBigUInt64LE(i * 17 + 8); if (64 - pcb(P | O) === e) all.push([P, O]); if (all.length >= 200 * N) break; }
  for (let k = 0; k < all.length && pos.length < N; k += Math.max(1, Math.floor(all.length / (N * 2)))) { const [P, O] = all[k], s = str(P, O); if (!seen.has(s) && E.legalList(Number(P & 0xFFFFFFFFn), Number(P >> 32n), Number(O & 0xFFFFFFFFn), Number(O >> 32n)).length) { seen.add(s); pos.push([P, O, s]); } }
  if (pos.length < 20) { console.log(`空き${e}: 局面が足りません（${pos.length}）`); continue; }
  fs.writeFileSync(tmp + '.obf', pos.map(p => p[2] + ' X;\n').join('')); fs.writeFileSync(tmp + '.txt', pos.map(p => p[2] + ' X\n').join(''));
  console.error(`空き${e}: ${pos.length} 局面。正解役（レベル${REF}）を計算中…`);
  const Te = edax(tmp + '.obf', REF, TH), Tg = ega(tmp + '.txt', REF, TH);
  if (Te.length !== pos.length || Tg.length !== pos.length) throw new Error(`reference: ${Te.length} / ${Tg.length} of ${pos.length}`);
  console.log(`\n空き${e}マス（${pos.length} 局面）：正解役どうしの差 ${mae(Te, Tg).toFixed(2)} 石（Edax 対 Egaroucid、レベル${REF}）`);
  console.log('| 深さ | 自前（Edax が正解役） | Egaroucid（Edax が正解役） | 自前（Egaroucid が正解役） | Edax（Egaroucid が正解役） |');
  console.log('|---|---|---|---|---|');
  for (const dep of DEPTHS) {
    const o = pos.map(([P, O]) => { E.clearTT(); return E.think(cells(P, O), 1, { cfg: { depth: dep, exact: 0, wld: 0, end: 0, mpc: 0 }, noBook: true, variety: false, time: 0 }).score; });
    const ve = edax(tmp + '.obf', dep, 1), vg = ega(tmp + '.txt', dep, 1);
    console.log(`| ${dep} | ${mae(o, Te).toFixed(2)} | ${vg.length === pos.length ? mae(vg, Te).toFixed(2) : '-'} | ${mae(o, Tg).toFixed(2)} | ${ve.length === pos.length ? mae(ve, Tg).toFixed(2) : '-'} |`);
  }
}
for (const x of ['.obf', '.txt']) try { fs.unlinkSync(tmp + x); } catch (err) {}
