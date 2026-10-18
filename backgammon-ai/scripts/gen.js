// Generate training positions labelled by 1-ply search of a teacher net. usage: node gen.js teacher.json outprefix threads seconds [teacherKind]
// record: 52 bytes pos, 1 byte side-on-roll, 1 byte race flag, 5 x float32 target (on-roll perspective) = 74 bytes
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const REC = 74;
if (isMainThread) {
  const [teacher, out, T, secs] = [process.argv[2], process.argv[3], +process.argv[4] || 2, +process.argv[5] || 600];
  const kind = process.argv[6] || 'old';
  let tot = 0;
  for (let i = 0; i < T; i++) {
    const w = new Worker(__filename, { workerData: { teacher, file: `${out}_${i}.bin`, seed: Date.now() % 100000 + i * 7777, secs, kind } });
    w.on('message', m => { tot += m; });
  }
  const t0 = Date.now();
  const iv = setInterval(() => { console.log(new Date().toISOString().slice(11, 19), 'positions', tot, ((tot) / ((Date.now() - t0) / 1000)).toFixed(0) + '/s'); }, 60000);
  setTimeout(() => clearInterval(iv), secs * 1000 + 5000);
} else {
  const { teacher, file, seed, secs, kind } = workerData;
  const BG = require(kind === 'old' ? '/home/claude/aicoding/backgammon/bg.js' : __dirname + '/bgn.js');
  const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
  const j = JSON.parse(fs.readFileSync(teacher));
  if (kind === 'old') BG.setNet(new BG.Net(j.nh, new Float32Array(j.w))); else BG.setNets(j);
  let s0 = seed; const rnd = () => (s0 = (s0 * 48271) % 2147483647) / 2147483647;
  const t0 = Date.now(); const buf = Buffer.alloc(REC * 1000); let nb = 0;
  const fd = fs.openSync(file, 'a');
  const flush = () => { if (nb) { fs.writeSync(fd, buf, 0, nb * REC); parentPort.postMessage(nb); nb = 0; } };
  while (Date.now() - t0 < secs * 1000) {
    let p = BG.initial(), s = rnd() < 0.5 ? 0 : 1, first = true;
    const explore = rnd() < 0.5 ? 0.15 : 0.04;
    for (let ply = 0; ply < 400 && BG.winner(p) < 0; ply++) {
      let a = 1 + Math.floor(rnd() * 6), b = 1 + Math.floor(rnd() * 6);
      if (first) { while (a === b) b = 1 + Math.floor(rnd() * 6); first = false; }
      const pl = BG.analyzePlays(p, s, a, b, { ply: 0 });
      let pick = pl[0];
      if (pl.length > 1 && rnd() < explore) pick = pl[Math.floor(rnd() * Math.min(5, pl.length))];
      p = pick.pos; s = 1 - s;
      if (BG.winner(p) >= 0 || BG.isBearoffPos(p)) continue;
      const v = BG.flip(BG.eval1(p, s));     // value with s on roll
      const o = nb * REC;
      for (let i = 0; i < 52; i++) buf[o + i] = p[i] & 255;
      buf[o + 52] = s; buf[o + 53] = BG.contact(p) ? 0 : 1;
      for (let k = 0; k < 5; k++) buf.writeFloatLE(v[k], o + 54 + 4 * k);
      if (++nb === 1000) flush();
    }
  }
  flush(); fs.closeSync(fd);
}
