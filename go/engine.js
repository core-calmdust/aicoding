/*
 * Go engine worker: WebAssembly engine (engine.c: KataGo-style features, a small distilled ResNet, PUCT search)
 * + strength levels, analysis, hints, territory / dead stones.
 * One worker runs everything; jobs are split into short slices so a newer job (or a cancel) takes over quickly.
 *
 * Nets: vibego nets distilled from KataGo (Sander Land, CC-BY-4.0; KataGo networks by David J Wu, MIT-style).
 *   light = b7c106nbt (fast; weak levels, phones), strong = b10c128nbt (dan levels, analysis).
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
'use strict';
importScripts('rules.js?v=1');
try { importScripts('tsumego.js?v=1'); } catch (e) {}
const R = self.GoRules, PASS = -1;

let simd = true;
try { simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { simd = false; }
const WASM = simd ? 'engine_simd.wasm?v=1' : 'engine.wasm?v=1';
const NETS = { light: 'net_light.bin.gz?v=1', strong: 'net_strong.bin.gz?v=1' };
const inst = {};          // name -> { E, mem }
const loading = {};
const netBytes = {};      // decompressed nets (kept to rebuild an instance after a trap)
// a wasm trap (e.g. out of bounds) leaves the instance's stack / state unusable: rebuild it on next use
function resetEngines() { for (const k in inst) delete inst[k]; for (const k in loading) delete loading[k]; }
let wasmBytes = null;

async function gunzip(buf) {
  const ds = new DecompressionStream('gzip');
  const s = new Blob([buf]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function getNet(name) {
  if (inst[name]) return inst[name];
  if (loading[name]) return loading[name];
  return (loading[name] = (async () => {
    if (!wasmBytes) wasmBytes = await (await fetch(WASM)).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(wasmBytes, {});
    const E = instance.exports;
    let raw = netBytes[name];
    if (!raw) { raw = new Uint8Array(await (await fetch(NETS[name])).arrayBuffer()); if (raw[0] === 0x1f && raw[1] === 0x8b) raw = await gunzip(raw); netBytes[name] = raw; }
    const p = E.galloc(raw.length);
    new Uint8Array(E.memory.buffer).set(raw, p);
    const r = E.net_load(p, raw.length);
    if (r < 0) throw new Error('net load ' + r);
    E.set_seed((Math.random() * 2 ** 31) | 0);
    inst[name] = { E, name };
    return inst[name];
  })());
}

// ---------------------------------------------------------------- position → engine
// job: { spec: {n, stones, turn}, moves: [i...], komi }
const ePos = (i, n) => i === PASS ? 361 : Math.floor(i / n) * 19 + (i % n);
const iPos = (p, n) => p === 361 ? PASS : Math.floor(p / 19) * n + (p % 19);
function setPos(I, job) {
  const E = I.E, n = job.spec.n;
  E.pos_reset(n, job.komi);
  const sp = R.Pos.from(job.spec);
  for (let i = 0; i < n * n; i++) if (sp.b[i]) E.pos_put(ePos(i, n), sp.b[i]);
  E.pos_tomove(sp.turn);
  for (const m of job.moves) if (!E.pos_play(ePos(m, n))) { /* superko-legal but engine thinks illegal: should not happen */ }
}
function rootEval(I, nsym) {
  const E = I.E, ptr = E.eval_root(nsym), f = new Float32Array(E.memory.buffer, ptr, 727);
  return { pol: f.slice(0, 362), val: f.slice(362, 365), score: f[365], own: f.slice(366, 727) };
}
function results(I, n, maxc) {
  const E = I.E, ptr = E.search_result(maxc || 362), f = new Float32Array(E.memory.buffer, ptr, 4 + 7 * 362);
  const k = f[0], out = [];
  for (let j = 0; j < k; j++) {
    const o = 4 + j * 7;
    out.push({ m: iPos(f[o], n), n: f[o + 1], p: f[o + 2], q: f[o + 3], wl: f[o + 4], sc: f[o + 5], lcb: f[o + 6] });
  }
  return { visits: f[1], wl: f[2], sc: f[3], list: out };
}

// ---------------------------------------------------------------- job control
let curJob = 0;
const yieldNow = () => new Promise(r => setTimeout(r, 0));
// run a search: visits / time limits; progress(res) every ~250 ms; returns null if superseded
async function search(I, job, o) {
  const E = I.E, my = job.id, n = job.spec.n;
  setPos(I, job);
  E.set_param(4, o.noise || 0);
  E.set_param(3, o.temp || 1);
  const nch = E.search_init(o.nodes || 400000);
  if (!nch) return null;
  const t0 = performance.now();
  let done = 1, lastP = t0;
  const maxV = o.visits || 100, maxT = o.time || 1e9;
  while (done < maxV) {
    const k = Math.min(o.slice || 4, maxV - done);
    const got = E.search_run(k);
    done += got;
    if (!got) break;
    const now = performance.now();
    if (now - t0 > maxT && done >= (o.minVisits || 1)) break;
    if (o.progress && now - lastP > 280) { lastP = now; o.progress(results(I, n, 24)); }
    await yieldNow();
    if (curJob !== my) return null;
  }
  return results(I, n, 362);
}

// legal by the page's rules (superko) as well as the engine's
function legalFor(job, m) {
  const rp = R.replay(job.spec, job.moves);
  return m === PASS || rp.pos.legal(m);
}

// ---------------------------------------------------------------- strength levels (1 = 15級 … 15 = 1級, 16 = 初段 … 20 = 五段)
// kyu levels: one net evaluation per move, a move drawn from the policy (temperature) with some looser picks;
// dan levels: search (visits) with the light / strong net.
const LEVELS = [null,
  { T: 1.7, slip: 0.30, top: 40 }, { T: 1.6, slip: 0.25, top: 36 }, { T: 1.5, slip: 0.21, top: 32 }, { T: 1.4, slip: 0.17, top: 28 },
  { T: 1.3, slip: 0.14, top: 24 }, { T: 1.2, slip: 0.11, top: 20 }, { T: 1.1, slip: 0.09, top: 18 }, { T: 1.0, slip: 0.07, top: 16 },
  { T: 0.9, slip: 0.055, top: 14 }, { T: 0.8, slip: 0.04, top: 12 }, { T: 0.7, slip: 0.03, top: 10 }, { T: 0.6, slip: 0.02, top: 8 },
  { T: 0.5, slip: 0.01, top: 6 }, { T: 0.4, slip: 0, top: 5 }, { T: 0.3, slip: 0, top: 4 },
  { net: 'light', visits: 6, time: 1500 }, { net: 'light', visits: 24, time: 2500 }, { net: 'strong', visits: 24, time: 3000 },
  { net: 'strong', visits: 80, time: 4500 }, { net: 'strong', visits: 240, time: 7000 },
];
function rng() { return Math.random(); }
// own single-point eye (all neighbours own colour): weak levels never fill it
function isOwnEye(pos, i, c) {
  const n = pos.n, nb = R.nbrs(n);
  for (let k = 0; k < 4; k++) { const r = nb[i * 4 + k]; if (r >= 0 && pos.b[r] !== c) return false; }
  const x = i % n, y = Math.floor(i / n); let bad = 0, edge = false;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) { edge = true; continue; } if (pos.b[yy * n + xx] === 3 - c) bad++; }
  return edge ? bad === 0 : bad <= 1;
}
async function policyMove(job, L) {
  const I = await getNet('light');
  setPos(I, job);
  const n = job.spec.n, ev = rootEval(I, 1), pos = R.replay(job.spec, job.moves).pos, me = pos.turn;
  const cand = [];
  for (let i = 0; i < n * n; i++) { const p = ev.pol[ePos(i, n)]; if (p > 0 && pos.b[i] === 0 && !isOwnEye(pos, i, me) && pos.legal(i)) cand.push({ m: i, p }); }
  cand.sort((a, b) => b.p - a.p);
  const passP = ev.pol[361];
  const lastPass = job.moves.length && job.moves[job.moves.length - 1] === PASS;
  // pass when the net wants to, or nothing sensible is left
  if (!cand.length || passP > 0.5 || (lastPass && (passP > 0.12 || cand[0].p < passP))) return { move: PASS, ev };
  const top = cand.slice(0, L.top);
  let pick;
  if (rng() < L.slip) {
    // a looser move: any of the candidates with a small weight floor (not completely random)
    const w = top.map(c => Math.pow(c.p, 0.35));
    pick = choose(top, w);
  } else {
    const w = top.map(c => Math.pow(c.p, 1 / L.T));
    pick = choose(top, w);
  }
  return { move: pick.m, ev };
}
function choose(arr, w) { let s = 0; for (const x of w) s += x; let r = rng() * s; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; }
function bestOf(res) {
  const L = res.list.filter(c => c.n > 0);
  if (!L.length) return null;
  const mx = Math.max(...L.map(c => c.n));
  // LCB among well-visited moves; never prefer a pass over a real move of the same value
  let best = null;
  for (const c of L) { if (c.n < 0.15 * mx) continue; const key = c.lcb - (c.m === PASS ? 0.02 : 0); if (!best || key > best.key) best = { c, key }; }
  return best ? best.c : L[0];
}

// ---------------------------------------------------------------- jobs
async function think(job) {
  const L = job.params || LEVELS[Math.max(1, Math.min(20, job.level | 0))];
  const n = job.spec.n;
  if (!L.net) {
    const r = await policyMove(job, L);
    const v = r.ev.val[0] - r.ev.val[1];
    return { move: r.move, wr: (v + 1) / 2, lead: r.ev.score };
  }
  const I = await getNet(L.net);
  // small boards are cheap to search deeply: more visits within the same time
  const boost = n <= 9 ? 2 : n <= 13 ? 1.4 : 1;
  const res = await search(I, job, { visits: Math.round(L.visits * boost), time: job.time || L.time, minVisits: Math.min(8, L.visits), slice: 4 });
  if (!res) return null;
  let b = bestOf(res);
  // the page enforces superko: skip a move it would refuse
  const ordered = [b].concat(res.list.filter(c => c !== b && c.n > 0));
  b = ordered.find(c => c && legalFor(job, c.m)) || { m: PASS };
  return { move: b.m, wr: (res.wl + 1) / 2, lead: res.sc, visits: res.visits };
}

// candidate list for hints / evaluation: [{m, lead, wr, n, p}] from the mover's view (lead = points ahead)
async function analyze(job, post) {
  const want = job.net || 'strong';
  const I = await getNet(want);
  const n = job.spec.n;
  const fmt = res => ({
    lead: res.sc, wr: (res.wl + 1) / 2, visits: res.visits,
    list: res.list.filter(c => c.n > 0).map(c => ({ m: c.m, lead: c.sc, wr: (c.wl + 1) / 2, n: c.n, p: c.p })),
  });
  const res = await search(I, job, { visits: job.visits || 60, time: job.time || 2000, slice: 3, progress: r => post({ type: 'progress', id: job.id, ...fmt(r) }) });
  if (!res) return null;
  const out = fmt(res);
  if (job.own) { setPos(I, job); out.own = ownOf(I, job, job.own); }
  return out;
}
// ownership (black's view, -1..1) averaged over symmetries
function ownOf(I, job, nsym) {
  const n = job.spec.n, ev = rootEval(I, nsym || 4);
  const pos = R.replay(job.spec, job.moves).pos, sign = pos.turn === R.BLACK ? 1 : -1;
  const own = new Array(n * n);
  for (let i = 0; i < n * n; i++) own[i] = Math.round(ev.own[ePos(i, n)] * sign * 1000) / 1000;
  return { own, lead: ev.score * sign, wr: sign > 0 ? (ev.val[0] - ev.val[1] + 1) / 2 : (ev.val[1] - ev.val[0] + 1) / 2 };
}
// dead stones at the end of a game: groups whose points mostly belong to the other side
async function territory(job) {
  const I = await getNet(job.net || 'strong');
  setPos(I, job);
  const o = ownOf(I, job, 8), pos = R.replay(job.spec, job.moves).pos, n = pos.n;
  const dead = [], seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (!pos.b[i] || seen[i]) continue;
    const g = pos.group(i); let s = 0;
    for (const q of g.stones) { seen[q] = 1; s += o.own[q]; }
    s /= g.stones.length;
    const c = pos.b[i];
    if ((c === R.BLACK && s < -0.35) || (c === R.WHITE && s > 0.35)) dead.push(...g.stones);
  }
  return { dead, own: o.own, lead: o.lead };
}
// raw policy (for teaching / quick hints): [{m, p}] sorted
async function policy(job) {
  const I = await getNet(job.net || 'light');
  setPos(I, job);
  const ev = rootEval(I, job.sym || 1), n = job.spec.n, out = [];
  for (let i = 0; i < n * n; i++) { const p = ev.pol[ePos(i, n)]; if (p > 0.001) out.push({ m: i, p }); }
  if (ev.pol[361] > 0.001) out.push({ m: PASS, p: ev.pol[361] });
  out.sort((a, b) => b.p - a.p);
  const sign = R.replay(job.spec, job.moves).pos.turn === R.BLACK ? 1 : -1;
  return { list: out, lead: ev.score, wr: (ev.val[0] - ev.val[1] + 1) / 2, sign };
}

// 詰碁: solver in tsumego.js (list of {m, need} for the side to move) / goal check
function tsumegoJob(job) {
  const T = self.GoTsumego; if (!T) return { list: [], reached: false };
  if (job.reached) { const pos = R.replay(job.P.s, job.moves).pos; return { reached: !!T.reached(job.P, pos) }; }
  return { list: T.solve(job.P, job.moves, job.left, job.defend) || [] };
}
const queue = [];
let running = false;
async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    curJob = job.id;
    let out = null;
    try {
      if (job.type === 'init') { await getNet(job.net || 'light'); out = { ok: true, simd }; }
      else if (job.type === 'think') out = await think(job);
      else if (job.type === 'analyze') out = await analyze(job, m => postMessage(m));
      else if (job.type === 'territory') out = await territory(job);
      else if (job.type === 'policy') out = await policy(job);
      else if (job.type === 'tsumego') out = tsumegoJob(job);
      if (out === null && curJob !== job.id) out = { superseded: true };
      postMessage(Object.assign({ type: 'done', id: job.id }, out || { error: 'none' }));
    } catch (e) {
      if (e instanceof WebAssembly.RuntimeError) resetEngines();
      postMessage({ type: 'done', id: job.id, error: String(e && e.message || e) });
    }
  }
  running = false;
}
onmessage = e => {
  const m = e.data;
  if (m.type === 'cancel') { curJob = -1; for (const j of queue.splice(0)) postMessage({ type: 'done', id: j.id, superseded: true }); return; }
  if (m.preempt) { curJob = -1; for (const j of queue.splice(0)) postMessage({ type: 'done', id: j.id, superseded: true }); }
  queue.push(m);
  pump();
};
