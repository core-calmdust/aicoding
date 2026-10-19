// Generate openings.json: the 26 renju opening patterns (珠型), a study line for each (strong AI vs itself, every move
// evaluated) and "next move" practice problems scored by the AI's root evaluation.
// node tools/gen-openings.js <work-dir> [out=openings.json]     (resumable: one line per finished opening in <work>/open.jsonl)
'use strict';
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const { sqName, sqOf, WINT } = E;
const WORK = process.argv[2] || '.', OUT = process.argv[3] || path.join(__dirname, '..', 'openings.json');
const PART = +process.argv[4] || 0, PARTS = +process.argv[5] || 1;
const CK = path.join(WORK, 'open.jsonl');
const name = (x, y) => 'abcdefghijklmno'[7 + x] + (8 + y);
// third move relative to the centre, white at (0,1) (direct) / (1,1) (indirect); evaluations under the old RIF rule
const D = [
  ['kansei', '寒星', 'かんせい', 'Kansei', 0, 2, 'bw'], ['keigetsu', '渓月', 'けいげつ', 'Keigetsu', 1, 2, 'bw'], ['sosei', '疎星', 'そせい', 'Sosei', 2, 2, 'ws'],
  ['kagetsu', '花月', 'かげつ', 'Kagetsu', 1, 1, 'bw'], ['zangetsu', '残月', 'ざんげつ', 'Zangetsu', 2, 1, 'ba'], ['ugetsu', '雨月', 'うげつ', 'Ugetsu', 1, 0, 'bw'],
  ['kinsei', '金星', 'きんせい', 'Kinsei', 2, 0, 'bw'], ['shogetsu', '松月', 'しょうげつ', 'Shogetsu', 0, -1, 'bs'], ['kyugetsu', '丘月', 'きゅうげつ', 'Kyugetsu', 1, -1, 'bs'],
  ['shingetsu', '新月', 'しんげつ', 'Shingetsu', 2, -1, 'ba'], ['zuisei', '瑞星', 'ずいせい', 'Zuisei', 0, -2, 'bs'], ['sangetsu', '山月', 'さんげつ', 'Sangetsu', 1, -2, 'ba'],
  ['yusei', '遊星', 'ゆうせい', 'Yusei', 2, -2, 'ww'],
];
const I = [
  ['chosei', '長星', 'ちょうせい', 'Chosei', 2, 2, 'ws'], ['kyogetsu', '峡月', 'きょうげつ', 'Kyogetsu', 2, 1, 'bw'], ['kosei', '恒星', 'こうせい', 'Kosei', 2, 0, 'bw'],
  ['suigetsu', '水月', 'すいげつ', 'Suigetsu', 2, -1, 'bw'], ['ryusei', '流星', 'りゅうせい', 'Ryusei', 2, -2, 'ws'], ['ungetsu', '雲月', 'うんげつ', 'Ungetsu', 1, 0, 'bw'],
  ['hogetsu', '浦月', 'ほげつ', 'Hogetsu', 1, -1, 'bw'], ['rangetsu', '嵐月', 'らんげつ', 'Rangetsu', 1, -2, 'bw'], ['gingetsu', '銀月', 'ぎんげつ', 'Gingetsu', 0, -1, 'ba'],
  ['myojo', '明星', 'みょうじょう', 'Myojo', 0, -2, 'bw'], ['shagetsu', '斜月', 'しゃげつ', 'Shagetsu', -1, -1, 'bs'], ['meigetsu', '名月', 'めいげつ', 'Meigetsu', -1, -2, 'ba'],
  ['suisei', '彗星', 'すいせい', 'Suisei', -2, -2, 'ww'],
];
const SETS = [...D.map((x, i) => ({ x, kind: 'direct', no: i + 1, w: [0, 1] })), ...I.map((x, i) => ({ x, kind: 'indirect', no: i + 1, w: [1, 1] }))];
let seed = 777; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const done = new Map(); try { for (const l of fs.readFileSync(CK, 'utf8').trim().split('\n')) if (l) { const o = JSON.parse(l); done.set(o.id, o); } } catch (e) {}
function stones(pos) { const b = [], w = []; for (let m = 0; m < 225; m++) { const c = pos.at(m); if (c === 1) b.push(sqName(m)); else if (c === 2) w.push(sqName(m)); } return { b: b.join(' '), w: w.join(' ') }; }
const best = list => list.reduce((a, e) => (e.v > a.v ? e : a), list[0]);
// a note for a study move: what it makes / what it answers
function noteOf(pos, m, prevBest) {
  const me = pos.side, i = E.M2I[m], k = pos.cls[me][i], ko = pos.cls[3 - me][i];
  if (k === E.C.F43 || k === E.C.F4) return 'op.n.fourthree';
  if (ko === E.C.FIVE) return 'op.n.block4';
  if (k === E.C.B4) return 'op.n.four';
  if (ko === E.C.F4 || ko === E.C.F3 || ko === E.C.F43) return 'op.n.block3';
  if (k === E.C.F3) return 'op.n.three';
  return '';
}
for (let si = PART; si < SETS.length; si += PARTS) {
  const S = SETS[si], [id, kanji, kana, nm, x, y, ev] = S.x;
  if (done.has(id)) continue;
  const t0 = Date.now();
  const line = [E.CENTER, sqOf(name(S.w[0], S.w[1])), sqOf(name(x, y))];
  // study line: level-9 style search with 1.5 s per move, 14 moves after the opening or until the game is settled
  const pos = E.replay('renju', line);
  const study = line.map(m => [sqName(m)]);
  const problems = [];
  let settled = 0;
  for (let ply = 3; ply < 22 && !pos.status().over; ply++) {
    const r = E.analyze('renju', pos.moves(), 1500);
    if (!r.list.length) break;
    const b = best(r.list), vBlack = pos.side === 1 ? b.v : -b.v;
    if (ply < 14 && Math.abs(b.v) < WINT) problems.push(Object.assign(stones(pos), { side: pos.side, last: sqName(pos.moves()[ply - 1]), sc: r.list.map(e => [sqName(e.m), e.v]), from: 'study' }));
    const note = noteOf(pos, b.m);
    pos.make(b.m);
    if (Math.abs(vBlack) > WINT && !settled) settled = 1;
    study.push(settled === 1 ? [sqName(b.m), vBlack, 'op.n.win'] : note ? [sqName(b.m), vBlack, note] : [sqName(b.m), vBlack]);
    if (settled === 1) { settled = 2; if (ply >= 9) break; }
    else if (settled) { if (ply >= 11) break; }
  }
  // practice positions from varied continuations (level 6-7 with noise, a couple of random early moves)
  for (let v = 0; v < 6; v++) {
    const p = E.replay('renju', line);
    const plies = 4 + Math.floor(rnd() * 8);
    while (p.ply < plies && !p.status().over) {
      let m;
      if (p.ply < 5 && rnd() < 0.5) { const near = p.legal().filter(q => Math.max(Math.abs(q % 15 - 7), Math.abs(Math.floor(q / 15) - 7)) <= 3); m = near[Math.floor(rnd() * near.length)]; }
      else m = E.think('renju', p.moves(), 6 + (rnd() < 0.5 ? 1 : 0), null, rnd).move;
      if (m < 0) break; p.make(m);
    }
    if (p.status().over) continue;
    const r = E.analyze('renju', p.moves(), 1500);
    if (r.list.length < 3) continue;
    const b = best(r.list); if (Math.abs(b.v) > WINT) continue;
    problems.push(Object.assign(stones(p), { side: p.side, last: sqName(p.moves()[p.ply - 1]), sc: r.list.map(e => [sqName(e.m), e.v]), from: 'var' }));
  }
  // keep positions where the choice matters (the best move is at least a bit better than the median)
  const good = problems.filter(P => { const vs = P.sc.map(e => e[1]).sort((a, b) => b - a); return vs.length >= 3 && vs[0] - vs[Math.floor(vs.length / 2)] >= 60; });
  const pool = (good.length >= 5 ? good : problems).slice(0, 10).map(P => { delete P.from; return P; });
  const o = { id, kind: S.kind, no: S.no, kanji, kana, name: nm, ev, line: line.map(sqName).join(' '), study, problems: pool };
  fs.appendFileSync(CK, JSON.stringify(o) + '\n'); done.set(id, o);
  console.log(id, 'study', study.length, 'problems', pool.length, '/', problems.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
if (SETS.every(S => done.has(S.x[0]))) {
  const sets = SETS.map(S => done.get(S.x[0]));
  fs.writeFileSync(OUT, JSON.stringify({ v: 1, sets }));
  console.log('wrote', OUT);
}
