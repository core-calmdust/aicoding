// Compose longer 四追い (VCF) problems from shorter ones by "un-playing" a forcing pair: remove one attacker stone f
// and one defender stone b such that, without them, f makes a four whose only blocking point is b. The new position
// is accepted only if the solver confirms: the shortest win is exactly T+2 (no shorter win, threes included), the
// first move is unique, and the VCF is unique.
// node tools/extend-vcf.js <in.jsonl> <out.jsonl> [maxPerBase=2] [part] [parts]
'use strict';
const E = require('../engine.js');
const fs = require('fs');
const [IN, OUT] = [process.argv[2], process.argv[3]];
const MAXB = +process.argv[4] || 2, PART = +process.argv[5] || 0, PARTS = +process.argv[6] || 1;
const { I2M, M2I, sqName, sqOf } = E;
const src = fs.readFileSync(IN, 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(p => p.cat === 'vcf' || (p.cat === 'forbid' && p.src === 'vcf'));
function solver(fo, limit) { const S = new E.Solver(); S.foursOnly = !!fo; S.limit = limit; return S; }
function freshSolve(pos, maxT, fo, limit) { const S = solver(fo, limit); const t = S.winIn(pos, maxT); return { t, over: S.nodes > S.limit }; }
function build(b, w, side) { return E.setup('renju', { b: b.map(sqOf), w: w.map(sqOf), side }); }
function pv(pos, T) {
  const line = []; let left = T; const S = solver(true, 4e6);
  for (let guard = 0; guard < 40 && left >= 1; guard++) {
    const al = S.attackList(pos, left).filter(e => e.need > 0).sort((a, b) => a.need - b.need);
    if (!al.length) return null;
    const a = al[0]; pos.make(I2M[a.i]); line.push(I2M[a.i]);
    if (a.need === 1) break;
    left -= 2;
    const dl = S.defendList(pos, left); if (!dl.length) break;
    let best = null; for (const e of dl) { const v = e.need === 0 ? 999 : e.need; if (!best || v > best.v) best = { i: e.i, v }; }
    if (best.v === 999) return null;
    pos.make(I2M[best.i]); line.push(I2M[best.i]);
  }
  for (let k = 0; k < line.length; k++) pos.unmake();
  return line;
}
const out = fs.openSync(OUT, 'a');
let made = 0;
for (let si = PART; si < src.length; si += PARTS) {
  const P = src[si];
  const A = P.side === 1 ? P.b.split(' ') : P.w.split(' '), D = P.side === 1 ? P.w.split(' ') : P.b.split(' ');
  if (!P.b || !P.w) continue;
  let got = 0;
  // shuffle attacker stones so different bases give different extensions
  const order = A.map(x => x).sort(() => Math.random() - 0.5);
  for (const f of order) {
    if (got >= MAXB) break;
    const A2 = A.filter(x => x !== f);
    for (const bq of D) {
      const D2 = D.filter(x => x !== bq);
      const B = P.side === 1 ? A2 : D2, W = P.side === 1 ? D2 : A2;
      const pos = build(B, W, P.side);
      if (pos.status().over) continue;
      const me = pos.side, op = 3 - me;
      if (pos.cnt[me][E.C.FIVE] || pos.cnt[op][E.C.FIVE]) continue;
      const fi = M2I[sqOf(f)];
      if (!pos.isLegal(sqOf(f))) continue;
      pos.make(sqOf(f));
      const fv = []; for (let m = 0; m < 225; m++) { const i = M2I[m]; if (pos.b[i] === 0 && pos.cls[me][i] === E.C.FIVE) fv.push(m); }
      pos.unmake();
      if (fv.length !== 1 || sqName(fv[0]) !== bq) continue;
      const T = P.T + 2;
      const r1 = freshSolve(pos, T, true, 2500000); if (r1.over || r1.t !== T) continue;
      const r2 = freshSolve(pos, T - 2, false, 2500000); if (r2.over || r2.t) continue;
      const SV = solver(true, 3000000), lv = SV.attackList(pos, T).filter(e => e.need > 0 && e.need <= T);
      if (SV.nodes > SV.limit || lv.length !== 1) continue;
      const SU = solver(false, 5000000), al = SU.attackList(pos, T).filter(e => e.need > 0 && e.need <= T);
      if (SU.nodes > SU.limit || al.length !== 1 || al[0].i !== lv[0].i) continue;
      const ans = I2M[lv[0].i];
      const line = pv(pos, T); if (!line || line[0] !== ans) continue;
      const rec = { g: P.g, k: P.k, side: me, cat: P.cat, T, a: sqName(ans), pv: line.map(sqName).join(' '), b: B.join(' '), w: W.join(' '), last: '', n: B.length + W.length, src: 'ext', base: P.T };
      fs.writeSync(out, JSON.stringify(rec) + '\n'); made++; got++;
      break;
    }
  }
  if ((si - PART) / PARTS % 10 === 0) console.log('base', si, '/', src.length, 'made', made);
}
console.log('done', made);
