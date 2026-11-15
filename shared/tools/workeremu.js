// A game's page worker (engine.js) run as a Web Worker inside a Node vm (2026-11-15): location / fetch / importScripts point
// at the engine's folder, so it loads its own wasm, networks and tables exactly as in the browser. Used by match.js (strength
// matches) and genbook.js (opening books). emuWorker(file) → ask(message) → the 'result' message (by id).
'use strict';
const vm = require('vm'), fs = require('fs'), { fileURLToPath, pathToFileURL } = require('url');
function emuWorker(file) {
  const msgs = new Map(), listeners = []; let seq = 0;
  const ctx = { console, URL, Response, DecompressionStream, TextDecoder, TextEncoder, setTimeout, clearTimeout, setInterval, clearInterval, performance, Blob,
    atob: x => Buffer.from(x, 'base64').toString('binary'), btoa: x => Buffer.from(x, 'binary').toString('base64') };
  ctx.self = ctx; ctx.location = new URL(pathToFileURL(file).href);
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
module.exports = { emuWorker };
