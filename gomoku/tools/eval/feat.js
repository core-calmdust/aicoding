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
// ---- line-code features (finer): every empty cell x direction x colour, the raw 10-neighbour window code (mirror-canonical)
const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683];
const LCANON = new Int32Array(59049).fill(-1); let NL = 0;
for (let code = 0; code < 59049; code++) {
  if (LCANON[code] >= 0) continue;
  let x = code, r = 0; for (let k = 0; k < 10; k++) { r += (x % 3) * POW3[9 - k]; x = (x / 3) | 0; }
  LCANON[code] = LCANON[r] = NL++;
}
const LBASE = 0, LNT = 4, LBIAS = LNT * NL, LNF = LBIAS + 2;
// windows with no stone of either colour inside are skipped (code 0 = all empty, or only walls)
function onlyWalls(code) { let x = code; for (let k = 0; k < 10; k++) { const v = x % 3; x = (x / 3) | 0; if (v === 1) return false; } return true; }
const TRIV = new Uint8Array(59049); for (let c = 0; c < 59049; c++) TRIV[c] = onlyWalls(c) ? 1 : 0;
function lineFeatures(pos, out) {
  out = out || new Map(); out.clear();
  const me = pos.side;
  for (let m = 0; m < 225; m++) {
    const i = E.M2I[m]; if (pos.b[i] !== 0) continue;
    for (let c = 1; c <= 2; c++) {
      const t = (c === me ? 0 : 2) + (c - 1), code = pos.code[c];
      for (let d = 0; d < 4; d++) {
        const x = code[i * 4 + d]; if (TRIV[x]) continue;
        const f = t * NL + LCANON[x]; out.set(f, (out.get(f) || 0) + 1);
      }
    }
  }
  out.set(LBIAS + me - 1, 1);
  return out;
}
module.exports.lineFeatures = lineFeatures; module.exports.NL = NL; module.exports.LNF = LNF; module.exports.LCANON = LCANON; module.exports.TRIV = TRIV;
// combined: combo + pair + bias (0..NF-1), then line codes (NF ..)
function features2(pos, out) {
  out = features(pos, out);
  const me = pos.side;
  for (let m = 0; m < 225; m++) {
    const i = E.M2I[m]; if (pos.b[i] !== 0) continue;
    for (let c = 1; c <= 2; c++) {
      const t = (c === me ? 0 : 2) + (c - 1), code = pos.code[c];
      for (let d = 0; d < 4; d++) { const x = code[i * 4 + d]; if (TRIV[x]) continue; const f = NF + t * NL + LCANON[x]; out.set(f, (out.get(f) || 0) + 1); }
    }
  }
  return out;
}
module.exports.features2 = features2; module.exports.NF2 = NF + 4 * NL;
