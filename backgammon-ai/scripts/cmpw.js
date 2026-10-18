// Head-to-head of two evaluators (old single-net format or new contact/race format), paired dice, cubeless money.
// usage: node cmp.js A.json B.json N threads mode   (mode: ply0 | ply1 | lvX (aiChoosePlay level X) ; "A:mode" overrides per side)
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs');
if (isMainThread) {
  const [A, B, N, T, mode] = [process.argv[2], process.argv[3], +process.argv[4] || 1000, +process.argv[5] || 2, process.argv[6] || 'ply0'];
  let done = 0, sum = 0, sq = 0, wins = 0, ms = [0, 0], mv = [0, 0], mx = [0, 0], fin = 0;
  // resumable: per-game results are appended to $RES; games already there are skipped
  const RES = process.env.RES, skip = [];
  if (RES && fs.existsSync(RES)) for (const ln of fs.readFileSync(RES, 'utf8').split('\n')) { if (!ln) continue; try { const r = JSON.parse(ln); skip.push(r.g); done++; sum += r.res; sq += r.res * r.res; if (r.res > 0) wins++; } catch (e) {} }
  if (done) console.log('resuming with', done, 'games already played');
  for (let i = 0; i < T; i++) {
    const w = new Worker(__filename, { workerData: { A, B, N, T, i, mode, skip } });
    w.on('message', m => { if (m.res !== undefined) { if (RES) fs.appendFileSync(RES, JSON.stringify({ g: m.g, res: m.res }) + '\n'); done++; sum += m.res; sq += m.res * m.res; if (m.res > 0) wins++; if (done % 20 === 0 && process.env.INTERIM) { const mean = sum / done, se = Math.sqrt(Math.max(0, sq / done - mean * mean) / done); console.log(`  interim ${done}: A ppg ${mean.toFixed(3)} ± ${(1.96 * se).toFixed(3)}`); } } if (m.t) for (const k of [0, 1]) { ms[k] += m.t.ms[k]; mv[k] += m.t.n[k]; mx[k] = Math.max(mx[k], m.t.mx[k]); } });
    w.on('exit', () => { if (++fin === T) {
      const mean = sum / done, se = Math.sqrt(Math.max(0, sq / done - mean * mean) / done);
      console.log(`${A} vs ${B} [${mode}] ${done} games: A wins ${(100 * wins / done).toFixed(1)}%, A ppg ${mean >= 0 ? '+' : ''}${mean.toFixed(3)} ± ${(1.96 * se).toFixed(3)} | ms/move A ${(ms[0] / mv[0]).toFixed(1)} (max ${mx[0].toFixed(0)}) B ${(ms[1] / mv[1]).toFixed(1)} (max ${mx[1].toFixed(0)})`);
    } });
  }
} else {
  const { A, B, N, T, i, mode, skip } = workerData; const SK = new Set(skip || []);
  const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin');
  const mk = f => {
    if (f.startsWith('wb')) { const path = __dirname + (f.startsWith('wbv1') ? '/bg_l10v1.js' : '/bgw.js'); delete require.cache[require.resolve(path)]; const BG = require(path); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length)); const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); BG.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)); const fn = f.split(':')[1]; if (fn) BG.setNets(JSON.parse(fs.readFileSync(fn))); return BG; }
    const j = JSON.parse(fs.readFileSync(f));
    const path = j.contact ? __dirname + '/bgn.js' : __dirname + '/bg_old.js';
    delete require.cache[require.resolve(path)];
    const BG = require(path); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
    if (j.contact) BG.setNets(j); else BG.setNet(new BG.Net(j.nh, new Float32Array(j.w)));
    return BG;
  };
  // each module instance holds its own NET; re-require to get separate instances even for the same file
  const E = [mk(A), mk(B)];
  const modes = mode.split(',');   // "ply0" or "lv10,lv8" (A,B)
  const mA = modes[0], mB = modes[1] || modes[0];
  const choose = (BG, md, p, s, d, tag) => {
    if (md === 'ply0') return BG.analyzePlays(p, s, d[0], d[1], { ply: 0 })[0];
    if (md === 'ply1') return BG.analyzePlays(p, s, d[0], d[1], { ply: 1, keep1: 6, margin1: 0.2 })[0];
    return BG.aiChoosePlay(p, s, d, +md.slice(2), tag);
  };
  const t = { ms: [0, 0], n: [0, 0], mx: [0, 0] };
  const now = () => Number(process.hrtime.bigint()) / 1e6;
  for (let g = i; g < N; g += T) { if (SK.has(g)) continue;
    const ds = new E[0].DiceStream((process.env.SEEDP || 'cmp') + (g >> 1), 0), aSide = g & 1;
    let p = E[0].initial(), s = -1, k = 0;
    while (E[0].winner(p) < 0 && k < 600) {
      const d = ds.get(k++); if (s < 0) s = d[0] > d[1] ? 0 : 1;
      const who = s === aSide ? 0 : 1, t0 = now();
      const pl = choose(E[who], who === 0 ? mA : mB, p, s, d, 'g' + g + ':' + k);
      const dt = now() - t0; t.ms[who] += dt; t.n[who]++; if (dt > t.mx[who]) t.mx[who] = dt;
      p = pl.pos; s = 1 - s;
    }
    const w = E[0].winner(p), pts = E[0].winKind(p, w) * (w === aSide ? 1 : -1);
    parentPort.postMessage({ res: pts, g });
  }
  parentPort.postMessage({ t });
}
