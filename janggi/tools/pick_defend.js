// node janggi/tools/pick_defend.js cand1.json[,cand2…]  (2026-11-24 担当D) the facts of each 「守る」 candidate (gen_defend.js), for
// choosing the five problems of t_defend: the piece in danger and its attackers, the defender, the kind of defence (guard = the moved
// piece takes back; line = it stands between; leg = it blocks a 馬 / 象's leg; screen = it leaves a 包's screen), the defender's
// moves (追34: 4 or more), the traps (d: moves of the piece in danger out of the attackers' reach that still lose + other moves that
// also guard the piece but still lose), and the nearest board among the lessons and puzzles (⑤: more than 4 points).
'use strict';
const fs = require('fs'), path = require('path');
const V = require('../../tools/lesson-verify-janggi.js'), E = V.engine(), F = require('./esc_facts.js')(E);
const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, NM = t => ['', '将', '士', '象', '馬', '車', '包', '卒'][t];
const ROOT = path.join(__dirname, '..', '..');
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/puzzles.json'), 'utf8'));
const pool = []; LS.steps.forEach(s => { if (s.id !== 't_defend') s.problems.forEach((P, j) => pool.push([s.id + ' q' + (j + 1), V.brd(P.s)])); (s.reserve || []).forEach(P => pool.push([s.id + ' reserve', V.brd(P.s)])); });
PZ.themes.forEach(t => t.puzzles.forEach((P, j) => pool.push([t.id + ' ' + (j + 1), V.brd(P.s)])));
const rc = s => [(s / 9) | 0, s % 9];
function sub(p, A, H, att) {
  const q = p.clone().play(A); if (q.moves().some(x => !E.isPass(x) && mTo(x) === H)) return 'guard';
  for (const a of att) { const t = T(p.at(a)), [r1, c1] = rc(a), [r2, c2] = rc(H), between = s => { const [r, c] = rc(s); return (r1 === r2 && r === r1 && (c - c1) * (c - c2) < 0) || (c1 === c2 && c === c1 && (r - r1) * (r - r2) < 0); };
    if ((t === 5 || t === 6) && between(mTo(A))) return 'line';
    if (t === 6 && between(mFrom(A))) return 'screen';
    if (t === 4 || t === 3) { const dr = r2 - r1, dc = c2 - c1, leg1 = Math.abs(dr) > Math.abs(dc) ? [r1 + Math.sign(dr), c1] : [r1, c1 + Math.sign(dc)];
      const legs = [leg1]; if (t === 3) { const [lr, lc] = leg1; legs.push([lr + Math.sign(dr), lc + Math.sign(dc)]); }
      if (legs.some(([r, c]) => r * 9 + c === mTo(A))) return 'leg'; } }
  return 'other';
}
const out = [];
for (const f of process.argv[2].split(',')) for (const c of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const p = E.Pos.from(c.s), all = p.moves(), H = c.H, z = F.flip(p), att = z.moves().filter(m => !E.isPass(m) && mTo(m) === H).map(mFrom);
  const lose = q => F.mate1(q) || F.danger(q).length > 0;
  const esc = all.filter(u => mFrom(u) === H && !p.clone().play(u).moves().some(x => !E.isPass(x) && mTo(x) === mTo(u) && att.includes(mFrom(x))) && lose(p.clone().play(u)));
  const fake = all.filter(u => u !== c.best && mFrom(u) !== H && !(p.at(mTo(u))) && (() => { const q = F.flip(p.clone().play(u)); return q.moves().some(y => !E.isPass(y) && mFrom(y) === mTo(u) && mTo(y) === H); })() && lose(p.clone().play(u)));
  const mt = T(p.at(mFrom(c.best))), mv = all.filter(m => mFrom(m) === mFrom(c.best)).length;
  const B = V.brd(c.s); let near = 99, who = ''; for (const [w, b] of pool) { const e = V.dist(B, b); if (e < near) { near = e; who = w; } }
  out.push({ s: c.s, best: c.best, H: NM(T(p.at(H))), att: att.map(a => NM(T(p.at(a)))).join(''), mt: NM(mt), mv, kind: sub(p, c.best, H, att), esc: esc.length, fake: fake.length, d: esc.length + fake.length, caps: all.filter(u => p.at(mTo(u))).length, gap: c.gap, near, who, name: E.name(p, c.best) });
}
out.forEach((o, i) => console.log(i, o.name, 'H', o.H, 'by', o.att, 'mover', o.mt, o.mv, o.kind, 'd', o.d, `(esc ${o.esc} fake ${o.fake}) caps ${o.caps} gap ${o.gap} near ${o.near} ${o.who}`));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out));
