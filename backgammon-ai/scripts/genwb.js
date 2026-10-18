// Positions from fast-net self-play (with exploration), labelled by wildbg 0-ply. Same 74-byte record as before.
// usage: node genwb.js fastnet.json outprefix threads seconds
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs'); const REC = 74;
if (isMainThread) {
  const [net, out, T, secs] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
  let tot = 0;
  for (let i = 0; i < T; i++) new Worker(__filename, { workerData: { net, file: `${out}_${i}.bin`, seed: (Date.now() % 100000) + i * 7919, secs } }).on('message', m => tot += m);
  const iv = setInterval(() => console.log(new Date().toISOString().slice(11, 19), 'positions', tot), 60000);
  setTimeout(() => clearInterval(iv), secs * 1000 + 3000);
} else {
  const { net, file, seed, secs } = workerData;
  const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin');
  const F = require(__dirname + '/bgn.js'); F.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length)); F.setNets(JSON.parse(fs.readFileSync(net)));
  const W = require(__dirname + '/bgw.js'); W.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
  const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); W.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length));
  let s0 = seed; const rnd = () => (s0 = (s0 * 48271) % 2147483647) / 2147483647;
  const fd = fs.openSync(file, 'a'), buf = Buffer.alloc(REC * 2000); let nb = 0;
  const flush = () => { if (nb) { fs.writeSync(fd, buf, 0, nb * REC); parentPort.postMessage(nb); nb = 0; } };
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    let p = F.initial(), s = rnd() < 0.5 ? 0 : 1, first = true;
    const explore = rnd() < 0.5 ? 0.2 : 0.05;
    for (let ply = 0; ply < 400 && F.winner(p) < 0; ply++) {
      let a = 1 + Math.floor(rnd() * 6), b = 1 + Math.floor(rnd() * 6);
      if (first) { while (a === b) b = 1 + Math.floor(rnd() * 6); first = false; }
      const pl = F.analyzePlays(p, s, a, b, { ply: 0 });
      let pick = pl[0]; if (pl.length > 1 && rnd() < explore) pick = pl[Math.floor(rnd() * Math.min(6, pl.length))];
      p = pick.pos; s = 1 - s;
      if (F.winner(p) >= 0 || F.isBearoffPos(p)) continue;
      const v = W.wbEval(p, s), o = nb * REC;
      for (let i = 0; i < 52; i++) buf[o + i] = p[i] & 255;
      buf[o + 52] = s; buf[o + 53] = F.contact(p) ? 0 : 1;
      for (let k = 0; k < 5; k++) buf.writeFloatLE(v[k], o + 54 + 4 * k);
      if (++nb === 2000) flush();
    }
  }
  flush(); fs.closeSync(fd);
}
