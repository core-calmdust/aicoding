// TD(0) self-play fine-tuning of the contact/race nets (new inputs). usage: node tdn.js init.json outprefix seconds alpha
const BG = require(__dirname + '/bgn.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
const [init, out, secs, alpha] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const J = JSON.parse(fs.readFileSync(init)); BG.setNets(J);
// grab the live nets via a probe: setNets created them; rebuild here to keep handles
const nets = { contact: new BG.Net(J.contact.nh, Float32Array.from(J.contact.w)), race: new BG.Net(J.race.nh, Float32Array.from(J.race.w)) };
BG.setNets({ contact: { nh: J.contact.nh, w: nets.contact.w }, race: { nh: J.race.nh, w: nets.race.w } });
// setNets copies with Float32Array.from -> share by re-pointing: evaluate with our nets through a custom evaluator instead
const evalPos = (p, s) => { const w = BG.winner(p); if (w >= 0 || BG.isBearoffPos(p)) return BG.evalPos(p, s); return BG.sanitize((BG.contact(p) ? nets.contact : nets.race).forward(p, s)); };
const evalAfter = (q, m) => BG.flip(evalPos(q, 1 - m));
const tg = new Float32Array(5), x0 = new Float32Array(BG.NIN), h0 = new Float32Array(256), y0 = new Float32Array(5);
function train(net, a) {
  const w = net.w, ni = net.ni, nh = net.nh, dh = new Float32Array(nh);
  for (let k = 0; k < 5; k++) { const d = (tg[k] - y0[k]); const row = net.oW2 + k * nh; for (let j = 0; j < nh; j++) { dh[j] += d * w[row + j]; w[row + j] += a * d * h0[j]; } w[net.oB2 + k] += a * d; }
  for (let j = 0; j < nh; j++) { const g = dh[j] * h0[j] * (1 - h0[j]) * a; if (!g) continue; const row = j * ni; for (let i = 0; i < ni; i++) if (x0[i] !== 0) w[row + i] += g * x0[i]; w[net.oB1 + j] += g; }
}
let s0 = 12345; const rnd = () => (s0 = (s0 * 48271) % 2147483647) / 2147483647;
const t0 = Date.now(); let games = 0, lastSave = Date.now();
const save = f => fs.writeFileSync(f, JSON.stringify({ contact: { nh: nets.contact.nh, w: Array.from(nets.contact.w, v => +v.toFixed(5)) }, race: { nh: nets.race.nh, w: Array.from(nets.race.w, v => +v.toFixed(5)) } }));
while (Date.now() - t0 < secs * 1000) {
  let p = BG.initial(), s = rnd() < 0.5 ? 0 : 1, first = true;
  for (let ply = 0; ply < 500; ply++) {
    const learn = !BG.isBearoffPos(p), net = BG.contact(p) ? nets.contact : nets.race;
    if (learn) { net.forward(p, s); x0.set(net.x); h0.set(net.h); y0.set(net.y); }
    let a = 1 + Math.floor(rnd() * 6), b = 1 + Math.floor(rnd() * 6);
    if (first) { while (a === b) b = 1 + Math.floor(rnd() * 6); first = false; }
    const pl = BG.genPlays(p, s, a, b); let best = pl[0], bv = null, be = -9;
    for (const q of pl) { const v = evalAfter(q.pos, s); const e = BG.equity(v); if (e > be) { be = e; best = q; bv = v; } }
    if (learn) { for (let k = 0; k < 5; k++) tg[k] = bv[k]; train(net, alpha); }
    p = best.pos; s = 1 - s;
    if (BG.winner(p) >= 0) break;
  }
  games++;
  if (Date.now() - lastSave > 300000) { save(`${out}_${games}.json`); save(`${out}.json`); lastSave = Date.now(); console.log(new Date().toISOString().slice(11, 19), 'games', games); }
}
save(`${out}.json`); console.log('done games', games);
