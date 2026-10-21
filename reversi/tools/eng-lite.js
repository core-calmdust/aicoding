const D8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function flips(c, sq, s) {
  if (c[sq]) return [];
  const o = 3 - s, out = [], r0 = sq >> 3, c0 = sq & 7;
  for (const [dr, dc] of D8) {
    let r = r0 + dr, cc = c0 + dc; const tmp = [];
    while (r >= 0 && r < 8 && cc >= 0 && cc < 8 && c[r * 8 + cc] === o) { tmp.push(r * 8 + cc); r += dr; cc += dc; }
    if (tmp.length && r >= 0 && r < 8 && cc >= 0 && cc < 8 && c[r * 8 + cc] === s) out.push(...tmp);
  }
  return out;
}
function legal(c, s) { const m = []; for (let q = 0; q < 64; q++) if (!c[q] && flips(c, q, s).length) m.push(q); return m; }
function play(c, sq, s) { const d = c.slice(), f = flips(c, sq, s); f.forEach(q => d[q] = s); d[sq] = s; return d; }
function start() { const c = new Array(64).fill(0); c[27] = c[36] = 2; c[28] = c[35] = 1; return c; }
module.exports = { flips, legal, play, start };
