// Build a warm-start new-format net from the old single net: copy the old weights onto the shared inputs.
const BG = require(__dirname + '/bgn.js'), fs = require('fs');
const [oldf, out, nhC, nhR] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const o = JSON.parse(fs.readFileSync(oldf)), onh = o.nh, oni = 202, ow = o.w;
const oB1 = onh * oni, oW2 = oB1 + onh, oB2 = oW2 + 5 * onh;
function build(nh, contactFlag, seed) {
  const net = new BG.Net(nh), ni = net.ni, w = net.w;
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < w.length; i++) w[i] = (r() * 2 - 1) * 0.05;
  for (let k = 0; k < 5; k++) for (let j = 0; j < nh; j++) w[net.oW2 + k * nh + j] = 0;
  for (let j = 0; j < Math.min(nh, onh); j++) {
    for (let i = 0; i < ni; i++) w[j * ni + i] = 0;
    for (let i = 0; i < 196; i++) w[j * ni + i] = ow[j * oni + i];
    w[j * ni + 220] = ow[j * oni + 196]; w[j * ni + 221] = ow[j * oni + 197]; w[j * ni + 222] = ow[j * oni + 198];
    w[j * ni + 207] = ow[j * oni + 200]; w[j * ni + 219] = ow[j * oni + 201];
    w[net.oB1 + j] = ow[oB1 + j] + contactFlag * ow[j * oni + 199];
    for (let k = 0; k < 5; k++) w[net.oW2 + k * nh + j] = ow[oW2 + k * onh + j];
  }
  for (let k = 0; k < 5; k++) w[net.oB2 + k] = ow[oB2 + k];
  return { nh, w: Array.from(w, v => +v.toFixed(5)) };
}
fs.writeFileSync(out, JSON.stringify({ contact: build(nhC, 1, 11), race: build(nhR, 0, 22) }));
console.log('ok');
