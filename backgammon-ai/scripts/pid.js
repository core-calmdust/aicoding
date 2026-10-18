// GnuBG position ID -> our Int8Array(52) with the player on roll as side 0
function decodePid(id) {
  const b = Buffer.from(id + '='.repeat((4 - id.length % 4) % 4), 'base64');
  let bit = 0; const get = () => (b[bit >> 3] >> (bit & 7)) & 1;
  const p = new Int8Array(52);
  for (const side of [1, 0]) {       // first the player not on roll (side 1), then the player on roll (side 0)
    const m = side * 26;
    for (let pt = 1; pt <= 25; pt++) { while (get()) { p[m + pt]++; bit++; } bit++; }
    let n = 0; for (let i = 1; i <= 25; i++) n += p[m + i]; p[m] = 15 - n;
  }
  return p;
}
module.exports = { decodePid };
