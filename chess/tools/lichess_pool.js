// Candidate pool for refresh_fun.js from the lichess puzzle database (CC0, https://database.lichess.org/#puzzles).
// usage: zstd -dc lichess_db_puzzle.csv.zst | node lichess_pool.js > pool.json
//   tactics: rating 780–2650, RD <= 80, >= 1500 plays, popularity >= 90, 1–3 own moves (line of 2/4/6 plies)
//   mate in N (1–4): RD <= 90, >= 400 plays, popularity >= 85; stored as the position after the opponent's move + answer
//   positions already in puzzles.json are left out. Output order = database order (deterministic).
'use strict';
const fs = require('fs'), path = require('path'), readline = require('readline');
const E = require('../engine.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice', 'deflection', 'attraction', 'hangingPiece', 'trappedPiece', 'backRankMate', 'smotheredMate', 'promotion', 'xRayAttack', 'intermezzo', 'quietMove', 'clearance', 'interference', 'capturingDefender', 'zugzwang', 'exposedKing', 'defensiveMove', 'endgame'];
const used = new Set();
const addUsed = p => used.add(p.fen.split(' ')[0]);
D.levels.forEach(L => L.puzzles.forEach(addUsed)); Object.values(D.old || {}).forEach(addUsed);
const pc = f => f.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
const tac = [], mate = { 1: [], 2: [], 3: [], 4: [] };
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', l => {
  const r = l.split(','); if (r.length < 8 || r[0] === 'PuzzleId') return;
  const [id, fen, mv, rt, rd, pop, nb, th] = r, ths = th.split(' '), line = mv.split(' ');
  const n = [1, 2, 3, 4].find(k => ths.includes('mateIn' + k));
  if (n) {
    if (+rd > 90 || +nb < 400 || +pop < 85 || line.length !== 2 * n) return;
    const q = E.Pos.fromFEN(fen), m = q.fromUci(line[0]); if (!m) return; q.make(m);
    const f = q.fen(); if (used.has(f.split(' ')[0])) return;
    mate[n].push({ id, fen: f, answer: line[1], r: +rt, pop: +pop, pc: pc(f), all: ths });
  }
  if (+rd > 80 || +nb < 1500 || +pop < 90 || ![2, 4, 6].includes(line.length) || +rt < 780 || +rt > 2650 || ths.includes('veryLong')) return;
  if (used.has(fen.split(' ')[0])) return;
  tac.push({ id, fen, line, r: +rt, pop: +pop, th: ths.filter(x => THEMES.includes(x)), all: ths });
});
rl.on('close', () => { process.stdout.write(JSON.stringify({ tac, mate })); console.error('tac', tac.length, Object.entries(mate).map(([k, v]) => k + ':' + v.length).join(' ')); });
