// Where in the game the discs are lost: every move of the games of tools/edax-anchor.js --games (ours against Edax) is judged
// by a third program (Egaroucid for Console at a level well above both players): the loss of a move = the value of the
// position before it − the value after it, for the side that moved; the last move is judged against the final result.
// The output is the mean loss per move and the sum per game of each side, by the number of empty squares — the big levers
// (opening / midgame / before the exact solve / the solved end) as numbers. Egaroucid only runs here (GPL; nothing of it
// goes into the site). Guide: claude/reversi-mac-verification.md.
//   EGAROUCID_DIR=~/Egaroucid/bin node tools/phase-loss.js games.jsonl [--level 21] [--threads 10] [--bands 50,44,36,28,22,16]
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const EGA = process.env.EGAROUCID_DIR, EXE = EGA && path.join(EGA, 'Egaroucid_for_Console.out');
if (!EGA || !fs.existsSync(EXE) || !args[0]) { console.error('EGAROUCID_DIR=… node tools/phase-loss.js games.jsonl [--level 21] [--threads 10]'); process.exit(1); }
const LEVEL = opt('level', '21'), TH = opt('threads', String(Math.max(1, os.cpus().length - 2))), BANDS = opt('bands', '50,44,36,28,22,16').split(',').map(Number);
const games = fs.readFileSync(args[0], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const uniq = new Map(); for (const g of games) for (const p of g.pos) if (!uniq.has(p[0])) uniq.set(p[0], 0);
const keys = [...uniq.keys()], tmp = path.join(os.tmpdir(), `rv-phaseloss-${process.pid}.txt`);
console.error(`${games.length} games, ${keys.length} positions; Egaroucid level ${LEVEL}…`);
for (let a = 0; a < keys.length; a += 2000) {   // in parts (progress, and a part can fail alone)
  const part = keys.slice(a, a + 2000); fs.writeFileSync(tmp, part.map(k => k + ' X\n').join(''));
  const o = cp.execFileSync(EXE, ['-solve', tmp, '-l', LEVEL, '-nobook', '-t', TH], { cwd: EGA, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const v = o.split('\n').filter(l => l.startsWith('|') && !l.includes('Level')).map(l => +l.split('|')[4]);
  if (v.length !== part.length) throw new Error(`egaroucid: ${v.length} of ${part.length}`);
  part.forEach((k, i) => uniq.set(k, v[i])); process.stderr.write(`\r${Math.min(keys.length, a + 2000)} / ${keys.length}  `);
}
try { fs.unlinkSync(tmp); } catch (e) {}
const band = e => { let b = 0; while (b < BANDS.length && e <= BANDS[b]) b++; return b; };   // 0: above the first bound … BANDS.length: at or below the last
const NB = BANDS.length + 1, name = b => b === 0 ? `${BANDS[0] + 1}〜` : b === BANDS.length ? `〜${BANDS[b - 1]}` : `${BANDS[b] + 1}〜${BANDS[b - 1]}`;
const byLevel = new Map();
for (const g of games) {
  const key = `Edax レベル${g.level} 対 ${g.base}`; if (!byLevel.has(key)) byLevel.set(key, { n: 0, S: [0, 1].map(() => Array.from({ length: NB }, () => ({ n: 0, loss: 0, big: 0 }))) });
  const T = byLevel.get(key); T.n++;
  g.pos.forEach((p, k) => {
    const e = p[0].split('-').length - 1, v = uniq.get(p[0]), nx = g.pos[k + 1];
    const after = nx ? (nx[1] === p[1] ? uniq.get(nx[0]) : -uniq.get(nx[0])) : (p[1] === 0 ? g.d : -g.d);   // for the side that moved
    if (p[2] < 2) return;   // a forced move loses nothing
    const c = T.S[p[1]][band(e)]; c.n++; c.loss += v - after; if (v - after >= 4) c.big++;
  });
}
for (const [key, T] of byLevel) {
  console.log(`\n${key}（${T.n} 局、採点役 Egaroucid レベル${LEVEL}）`);
  console.log('| 空きマス | 自前：1手の損 | 自前：1局の損 | Edax：1手の損 | Edax：1局の損 | 差（自前−Edax、1局） | 4石以上の損の手 自前 / Edax |');
  console.log('|---|---|---|---|---|---|---|');
  let su = 0, se = 0;
  for (let b = 0; b < NB; b++) { const u = T.S[1][b], x = T.S[0][b]; if (!u.n && !x.n) continue; const gu = u.loss / T.n, ge = x.loss / T.n; su += gu; se += ge;
    console.log(`| ${name(b)} | ${(u.loss / Math.max(1, u.n)).toFixed(2)} | ${gu.toFixed(2)} | ${(x.loss / Math.max(1, x.n)).toFixed(2)} | ${ge.toFixed(2)} | ${gu - ge >= 0 ? '+' : ''}${(gu - ge).toFixed(2)} | ${(100 * u.big / Math.max(1, u.n)).toFixed(1)}% / ${(100 * x.big / Math.max(1, x.n)).toFixed(1)}% |`); }
  console.log(`| 合計 | | ${su.toFixed(2)} | | ${se.toFixed(2)} | ${su - se >= 0 ? '+' : ''}${(su - se).toFixed(2)} | |`);
}
console.log('\n（損＝その手を打つ前の値 − 打ったあとの値。採点役の値のくせは両者に同じだけ入るので、「差」の列で読む。合計の差は平均石差とほぼ同じになる）');
