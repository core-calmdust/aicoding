// Feature extraction shared by training and checks.
// For every empty cell and both colours: the unordered combination of the four direction patterns (P0..P5 classes,
// 10 values) -> one of 715 combos (+1: a cell forbidden for black). Tables: role (mover / opponent) x colour (black / white).
'use strict';
const E = require('/home/claude/aicoding/gomoku/engine.js');
const NCOMB = 716, NT = 4, PAIR = NT * NCOMB, BIAS = PAIR + 200, NF = BIAS + 2;   // PAIR: (black class, white class) of a cell x side to move
const COMBO = new Int16Array(65536).fill(-1);
{
  const key = new Map(); let id = 0;
  for (let a = 0; a < 10; a++) for (let b = a; b < 10; b++) for (let c = b; c < 10; c++) for (let d = c; d < 10; d++) key.set([a, b, c, d].join(), id++);
  for (let pk = 0; pk < 65536; pk++) {
    const v = [pk & 15, (pk >> 4) & 15, (pk >> 8) & 15, (pk >> 12) & 15]; if (v.some(x => x > 9)) continue;
    v.sort((x, y) => x - y); COMBO[pk] = key.get(v.join());
  }
  if (id !== 715) throw new Error('combo count ' + id);
}
const M2I = E.M2I;
// returns Map featureId -> count for the side to move
function features(pos, out) {
  out = out || new Map(); out.clear();
  const me = pos.side;
  for (let m = 0; m < 225; m++) {
    const i = M2I[m]; if (pos.b[i] !== 0) continue;
    for (let c = 1; c <= 2; c++) {
      let cb;
      if (c === 1 && pos.renju && pos.fb[i] === 1) cb = 715; else cb = COMBO[pos.pat[c][i]];
      const t = (c === me ? 0 : 2) + (c - 1);
      const f = t * NCOMB + cb;
      out.set(f, (out.get(f) || 0) + 1);
    }
    const pf = PAIR + (me - 1) * 100 + pos.cls[1][i] * 10 + pos.cls[2][i];
    out.set(pf, (out.get(pf) || 0) + 1);
  }
  out.set(BIAS + me - 1, 1);
  return out;
}
module.exports = { E, NCOMB, NT, NF, BIAS, PAIR, COMBO, features };
