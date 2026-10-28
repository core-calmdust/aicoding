// Calibration anchor: an AI level (the page's own worker code) against GNU Go 3.8 (or any GTP engine) over GTP.
//   node tools/vs-gnugo.mjs <level> [games=10] [size=19] [gnugoLevel=10]
//   GTP_CMD="katago gtp -model human.bin.gz -human-model human.bin.gz -config human.cfg -override-config humanSLProfile=rank_5k,maxVisits=1" \
//     node tools/vs-gnugo.mjs <level> …   (another GTP engine instead of GNU Go, e.g. KataGo's human-like model at a given rank)
// Chinese scoring, komi 7.5. Clear games are adjudicated by the light net's score estimate (|lead| > 25 twice, after move 120 on 19x19).
import { spawn } from 'child_process';
import { createWorker } from './workerhost.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('../rules.js');
const [lv0, g0, n0, gl0] = process.argv.slice(2);
const level = +lv0, games = +(g0 || 10), n = +(n0 || 19), gl = +(gl0 || 10), komi = 7.5;
const COLS = 'ABCDEFGHJKLMNOPQRST';
const toV = m => m < 0 ? 'pass' : COLS[m % n] + (n - Math.floor(m / n));
const fromV = v => { v = v.trim().toUpperCase(); if (v === 'PASS') return -1; if (v === 'RESIGN') return -2; return (n - +v.slice(1)) * n + COLS.indexOf(v[0]); };

function gtp() {
  const argv = process.env.GTP_CMD ? process.env.GTP_CMD.split(/\s+/) : ['/usr/games/gnugo', '--mode', 'gtp', '--level', String(gl), '--chinese-rules'];
  const p = spawn(argv[0], argv.slice(1), { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '', waiters = [];
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const r = buf.slice(0, i); buf = buf.slice(i + 2); const w = waiters.shift(); w && w(r); } });
  const cmd = c => new Promise(res => { waiters.push(r => res(r.replace(/^[=?]\s*/, ''))); p.stdin.write(c + '\n'); });
  return { cmd, kill: () => p.kill() };
}

const W = await createWorker();
await W.call({ type: 'init', net: 'light' });
let won = 0, tot = 0;
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const G = gtp();
  await G.cmd('boardsize ' + n); await G.cmd('clear_board'); await G.cmd('komi ' + komi);
  const aiBlack = g % 2 === 0, moves = [];
  let pos = R.Pos.from({ n }), passes = 0, winner = 0, why = '', adj = 0;
  for (let k = 0; k < n * n * 2 && !winner; k++) {
    const aiTurn = (pos.turn === 1) === aiBlack;
    let m;
    if (aiTurn) {
      const r = await W.call({ type: 'think', spec: { n }, moves, komi, level });
      m = r.move === undefined ? -1 : r.move;
      await G.cmd(`play ${pos.turn === 1 ? 'b' : 'w'} ${toV(m)}`);
    } else {
      m = fromV(await G.cmd(`genmove ${pos.turn === 1 ? 'b' : 'w'}`));
      if (m === -2) { winner = aiBlack ? 1 : 2; why = 'gnugo resigns'; break; }
    }
    const nx = pos.tryPlay(m); if (!nx) { console.error('illegal', toV(m)); m = -1; pos = pos.tryPlay(-1).pos; } else pos = nx.pos;
    moves.push(m);
    passes = m === -1 ? passes + 1 : 0;
    if (passes >= 2) break;
    if (k > n * n * 0.33 && k % 6 === 0) {
      const p = await W.call({ type: 'policy', spec: { n }, moves, komi, net: 'light' });
      const lead = p.lead * (pos.turn === 1 ? 1 : -1);
      if (Math.abs(lead) > (n >= 19 ? 25 : n >= 13 ? 15 : 9)) { if (++adj >= 2) { winner = lead > 0 ? 1 : 2; why = 'adj ' + lead.toFixed(0); } } else adj = 0;
    }
  }
  if (!winner) {
    const tr = await W.call({ type: 'territory', spec: { n }, moves, komi, net: 'strong' });
    const sc = R.score(pos, tr.dead, 'cn', komi);
    winner = sc.diff > 0 ? 1 : 2; why = 'score ' + sc.diff;
  }
  G.kill();
  const aiWon = (winner === 1) === aiBlack;
  if (aiWon) won++; tot++;
  process.stderr.write(`L${level} game ${g + 1}: AI ${aiBlack ? 'B' : 'W'} ${moves.length} moves, ${aiWon ? 'AI' : 'GNU Go'} wins (${why})\n`);
}
const p = (won + 0.5) / (tot + 1), elo = -400 * Math.log10(1 / p - 1);
console.log(JSON.stringify({ level, opp: process.env.GTP_CMD || 'gnugo ' + gl, n, games: tot, won, elo_vs_gnugo: Math.round(elo), sec: Math.round((Date.now() - t0) / 1000) }));
