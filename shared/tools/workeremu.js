// A game's page worker (engine.js) run as a Web Worker inside a Node vm (2026-11-15): location / fetch / importScripts point
// at the engine's folder, so it loads its own wasm, networks and tables exactly as in the browser. Used by match.js (strength
// matches) and genbook.js (opening books; emuThread below). emuWorker(file) → ask(message) → the 'result' message (by id).
'use strict';
const vm = require('vm'), fs = require('fs'), { fileURLToPath, pathToFileURL } = require('url');
function emuWorker(file, search) {   // (search: the worker URL's query, e.g. '?book=1')
  const msgs = new Map(), listeners = []; let seq = 0;
  const ctx = { console, URL, Response, DecompressionStream, TextDecoder, TextEncoder, setTimeout, clearTimeout, setInterval, clearInterval, performance, Blob,
    atob: x => Buffer.from(x, 'base64').toString('binary'), btoa: x => Buffer.from(x, 'binary').toString('base64') };
  ctx.self = ctx; ctx.location = new URL(pathToFileURL(file).href + (search || ''));
  ctx.WebAssembly = Object.assign(Object.create(WebAssembly), { instantiateStreaming: undefined, compileStreaming: undefined });   // (the arrayBuffer path)
  const fp = u => fileURLToPath(new URL(String(u), ctx.location.href).href.replace(/[?#].*$/, ''));
  ctx.fetch = async u => { try { return new Response(fs.readFileSync(fp(u))); } catch (e) { return new Response(null, { status: 404 }); } };
  ctx.importScripts = (...us) => { for (const u of us) { const f = fp(u); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); } };
  ctx.postMessage = d => { const r = d && msgs.get(d.id); if (r && (d.type === 'result' || d.type === 'error' || d.error)) { msgs.delete(d.id); r(d); } };
  ctx.addEventListener = (t, f) => { if (t === 'message') listeners.push(f); };
  ctx.removeEventListener = (t, f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return m => new Promise(res => { const id = ++seq; msgs.set(id, res); const ev = { data: Object.assign({ id }, m) }; for (const f of listeners.slice()) f(ev); if (ctx.onmessage) ctx.onmessage(ev); });
}
// emuThread(file, search) → ask(message) (2026-11-20): the same worker on a thread of its own (worker_threads), so several of
// them analyse at once on several cores. emuWorker's analysis is synchronous: N of them in one thread run one after another.
// The tools end with process.exit (the threads keep the process alive).
function emuThread(file, search) {
  const { Worker } = require('worker_threads');
  const w = new Worker(__filename, { workerData: { emuFile: file, emuSearch: search } }), wait = new Map(); let seq = 0;
  w.on('message', d => { const r = wait.get(d.n); if (r) { wait.delete(d.n); r(d.r); } });
  w.on('error', e => { for (const r of wait.values()) r({ type: 'error', error: String(e && e.stack || e) }); wait.clear(); });
  return m => new Promise(res => { const n = ++seq; wait.set(n, res); w.postMessage({ n, m }); });
}
const wt = require('worker_threads');
if (!wt.isMainThread && wt.workerData && wt.workerData.emuFile) {
  const ask = emuWorker(wt.workerData.emuFile, wt.workerData.emuSearch);
  wt.parentPort.on('message', async ({ n, m }) => wt.parentPort.postMessage({ n, r: await ask(m) }));
}
module.exports = { emuWorker, emuThread };
