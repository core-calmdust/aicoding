// Supervised training of contact / race nets on labelled positions (Hogwild, worker_threads).
// usage: node trainsup.js out.json epochs threads nhC nhR lr0 [init.json] -- files...
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const BG = require(__dirname + '/bgn.js');
const REC = 74;
if (isMainThread) {
  const a = process.argv.slice(2); const sep = a.indexOf('--');
  const [out, EP, T, nhC, nhR, lr0, init] = [a[0], +a[1], +a[2], +a[3], +a[4], +a[5], sep > 6 ? a[6] : null];
  const files = a.slice(sep + 1);
  const bufs = files.map(f => fs.readFileSync(f)); let n = 0; for (const b of bufs) n += Math.floor(b.length / REC);
  const all = new SharedArrayBuffer(n * REC), u8 = new Uint8Array(all); let off = 0;
  for (const b of bufs) { const m = Math.floor(b.length / REC) * REC; u8.set(b.subarray(0, m), off); off += m; }
  const idxC = [], idxR = []; for (let i = 0; i < n; i++) (u8[i * REC + 53] ? idxR : idxC).push(i);
  console.log('positions', n, 'contact', idxC.length, 'race', idxR.length);
  const mk = (nh, w) => { const net = new BG.Net(nh); if (w) net.w.set(w); else { let s = 4242 + nh; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < net.w.length; i++) net.w[i] = (r() * 2 - 1) * 0.08; } return net; };
  // resume: if a state file exists next to `out`, continue from the saved weights and epoch
  const stateF = out + '.state.json'; let ep0 = 0;
  let ij = init ? JSON.parse(fs.readFileSync(init)) : null;
  if (fs.existsSync(stateF) && fs.existsSync(out)) { const st = JSON.parse(fs.readFileSync(stateF)); ep0 = st.epoch + 1; ij = JSON.parse(fs.readFileSync(out)); console.log('resuming after epoch', st.epoch); }
  const nets = { contact: mk(nhC, ij && ij.contact && ij.contact.nh === nhC ? ij.contact.w : null), race: mk(nhR, ij && ij.race && ij.race.nh === nhR ? ij.race.w : null) };
  const shared = {}; for (const k in nets) { const sab = new SharedArrayBuffer(nets[k].w.length * 4); new Float32Array(sab).set(nets[k].w); shared[k] = { sab, nh: nets[k].nh }; }
  const save = (f) => { const o = {}; for (const k in shared) o[k] = { nh: shared[k].nh, w: Array.from(new Float32Array(shared[k].sab), v => +v.toFixed(5)) }; fs.writeFileSync(f + '.tmp', JSON.stringify(o)); fs.renameSync(f + '.tmp', f); };
  // hold-out: last 2% of each index list
  const split = arr => { let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } const h = Math.floor(arr.length * 0.02); return [arr.slice(h), arr.slice(0, h)]; };
  const [trC, vaC] = split(idxC), [trR, vaR] = split(idxR);
  (async () => {
    for (let ep = ep0; ep < EP; ep++) {
      const lr = lr0 * Math.pow(+(process.env.DEC || 0.6), ep);
      const t0 = Date.now();
      const res = await Promise.all(Array.from({ length: T }, (_, i) => new Promise(ok => {
        const w = new Worker(__filename, { workerData: { all, shared, trC, trR, vaC, vaR, i, T, lr, ep, seed: ep * 100 + i } });
        w.on('message', ok);
      })));
      const vc = res[0].vc, vr = res[0].vr;
      console.log(`epoch ${ep} lr ${lr.toFixed(4)} ${((Date.now() - t0) / 1000).toFixed(0)}s  valid equity RMSE contact ${vc.toFixed(4)} race ${vr.toFixed(4)}`);
      save(out); fs.writeFileSync(stateF + '.tmp', JSON.stringify({ epoch: ep, valid: { contact: vc, race: vr }, time: new Date().toISOString() })); fs.renameSync(stateF + '.tmp', stateF);
    }
  })();
} else {
  const { all, shared, trC, trR, vaC, vaR, i, T, lr, seed } = workerData;
  const u8 = new Uint8Array(all), dv = new DataView(all);
  const nets = {}; for (const k in shared) nets[k] = new BG.Net(shared[k].nh, new Float32Array(shared[k].sab));
  const p = new Int8Array(52), tg = new Float32Array(5);
  const load = r => { const o = r * REC; for (let q = 0; q < 52; q++) p[q] = (u8[o + q] << 24) >> 24; for (let k = 0; k < 5; k++) tg[k] = dv.getFloat32(o + 54 + 4 * k, true); return u8[o + 52]; };
  function step(net, s, lr) {
    net.forward(p, s);
    const w = net.w, x = net.x, h = net.h, y = net.y, ni = net.ni, nh = net.nh, dh = net._dh || (net._dh = new Float32Array(nh));
    for (let j = 0; j < nh; j++) dh[j] = 0;
    for (let k = 0; k < 5; k++) {
      const d = tg[k] - y[k];   // cross-entropy gradient for sigmoid outputs
      const row = net.oW2 + k * nh;
      for (let j = 0; j < nh; j++) { dh[j] += d * w[row + j]; w[row + j] += lr * d * h[j]; }
      w[net.oB2 + k] += lr * d;
    }
    const nz = net._nz; let nn = 0; for (let q = 0; q < ni; q++) if (x[q] !== 0) nz[nn++] = q;
    for (let j = 0; j < nh; j++) {
      const g = dh[j] * h[j] * (1 - h[j]) * lr; if (g === 0) continue;
      const row = j * ni;
      for (let q = 0; q < nn; q++) { const ii = nz[q]; w[row + ii] += g * x[ii]; }
      w[net.oB1 + j] += g;
    }
  }
  let s0 = seed + 1; const rnd = () => (s0 = (s0 * 48271) % 2147483647) / 2147483647;
  // interleave contact and race samples in proportion, each worker takes its shard in random order
  const mine = [];
  for (let q = i; q < trC.length; q += T) mine.push(trC[q]);
  for (let q = i; q < trR.length; q += T) mine.push(-1 - trR[q]);
  for (let q = mine.length - 1; q > 0; q--) { const j = Math.floor(rnd() * (q + 1)); const t = mine[q]; mine[q] = mine[j]; mine[j] = t; }
  for (const r of mine) { if (r >= 0) { const s = load(r); step(nets.contact, s, lr); } else { const s = load(-1 - r); step(nets.race, s, lr); } }
  const rmse = (list, net) => { let se = 0; for (const r of list) { const s = load(r); const y = BG.sanitize(net.forward(p, s)); const d = BG.equity(y) - BG.equity(tg); se += d * d; } return Math.sqrt(se / Math.max(1, list.length)); };
  parentPort.postMessage(i === 0 ? { vc: rmse(vaC, nets.contact), vr: rmse(vaR, nets.race) } : {});
}
