// Runs go/engine.js (the browser Web Worker) inside node, so tools use exactly the page's AI code.
//   const W = await createWorker(); const r = await W.call({ type: 'think', spec, moves, komi, level });
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export async function createWorker() {
  const pending = new Map();
  const ctx = {
    console, WebAssembly, performance, setTimeout, clearTimeout, Blob, Response, DecompressionStream, Uint8Array, Float32Array,
    Math, JSON, Promise, Error, Map, Set, Array, Object, String, Number, isNaN, parseInt, parseFloat,
    fetch: async url => { const p = path.join(DIR, url.split('?')[0]); const b = fs.readFileSync(p); return { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; },
    postMessage: m => { const j = pending.get(m.id); if (!j) return; if (m.type === 'progress') return; pending.delete(m.id); j(m); },
  };
  ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.importScripts = (...urls) => { for (const u of urls) { const p = path.join(DIR, u.split('?')[0]); if (!fs.existsSync(p)) throw new Error('no ' + u); vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p }); } };
  vm.runInContext(fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8'), ctx, { filename: 'engine.js' });
  let id = 0;
  return {
    ctx,
    call(msg) { return new Promise(res => { const k = ++id; pending.set(k, res); ctx.onmessage({ data: Object.assign({}, msg, { id: k }) }); }); },
  };
}
