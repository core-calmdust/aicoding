// (2026-11-15, claude/praline-spec.md §10 ②) engine-health.html: which core a game's one-thread engine worker really runs —
// the C engine (WebAssembly, SIMD or not) or the JavaScript search. shared/mtengine.js starts the page's workers through this
// file only on ?health=1 pages: it loads the engine (corestat.js?u=<engine url>&id=n) as if it were the worker itself (its
// location, relative fetch / importScripts), notes every WebAssembly module made and every failure, and tells the page on
// the BroadcastChannel 'corestat'. Nothing in the engine changes.
'use strict';
(() => {
  const real = new URL(self.location.href), ENG = new URL(real.searchParams.get('u'), real).href, id = +real.searchParams.get('id');
  try { Object.defineProperty(self, 'location', { value: new URL(ENG), configurable: true }); } catch (e) { /* relative URLs below still go to the engine's folder */ }
  const abs = u => (typeof u === 'string' || u instanceof URL) ? new URL(u, ENG).href : u;
  const base = u => String(u).replace(/^.*\//, '');
  const rec = { id, url: ENG.replace(/^.*?\/\/[^/]+/, ''), files: [], mods: [], errs: [] };
  const bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel('corestat') : null;
  const send = () => { try { if (bc) bc.postMessage(rec); } catch (e) { /* */ } };
  const err = (w, e) => { rec.errs.push(w + ': ' + String(e && e.message || e).slice(0, 140)); send(); };
  let last = '';   // the last .wasm (or embedded-wasm script) fetched: the name of a module made from bytes
  const of = self.fetch;
  if (of) self.fetch = function (u, o) {
    if (typeof u === 'string' || u instanceof URL) u = abs(u);
    const s = String(u && u.url || u);
    if (/\.wasm(\?|$)/.test(s)) { last = base(s); rec.files.push(last); send(); }
    return of.call(this, u, o);
  };
  const oi = self.importScripts;
  self.importScripts = function (...a) {
    a = a.map(abs);
    for (const s of a) if (/wasm/i.test(s)) { last = base(s); rec.files.push(last); }
    try { return oi.apply(self, a); } catch (e) { err('importScripts ' + a.map(base).join(','), e); throw e; }
  };
  const W = self.WebAssembly;
  if (W) {
    const shared = imp => { try { const m = imp && imp.env && imp.env.memory; return !!(m && typeof SharedArrayBuffer === 'function' && m.buffer instanceof SharedArrayBuffer); } catch (e) { return false; } };
    const note = (src, imp, m) => { let n = 0; try { n = OM.exports(m).length; } catch (e) { /* */ } rec.mods.push({ src: (src || '?').replace(/\?.*$/, ''), sh: shared(imp), ex: n }); send(); };
    // the name of a module: the .wasm response its bytes came from (several load at once), else the last one fetched
    const NB = new WeakMap(), NM = new WeakMap(), nameOf = b => { try { return NB.get(b) || NB.get(b && b.buffer) || last; } catch (e) { return last; } };
    if (self.Response) { const ab = Response.prototype.arrayBuffer; Response.prototype.arrayBuffer = function () { const u = this.url; return ab.call(this).then(b => { if (/\.wasm(\?|$)/.test(u)) NB.set(b, base(u)); return b; }); }; }
    const OM = W.Module;
    const NMo = function (b) { const m = new OM(b); NM.set(m, nameOf(b)); return m; };
    NMo.prototype = OM.prototype; Object.setPrototypeOf(NMo, OM); W.Module = NMo;
    const OI = W.Instance;
    const NI = function (m, imp) { const x = new OI(m, imp); note(NM.get(m) || last, imp, m); return x; };
    NI.prototype = OI.prototype; W.Instance = NI;
    const oInst = W.instantiate;
    W.instantiate = function (b, imp) {
      const src = b instanceof OM ? (NM.get(b) || last) : nameOf(b);
      return oInst.call(W, b, imp).then(r => { note(src, imp, r.module || b); return r; }, e => { err('instantiate ' + src, e); throw e; });
    };
    const oStr = W.instantiateStreaming;
    if (oStr) W.instantiateStreaming = function (resp, imp) {
      return Promise.resolve(resp).then(r => oStr.call(W, r, imp).then(x => { note(base(r.url || last), imp, x.module); return x; },
        e => { err('instantiateStreaming ' + base(r.url || last), e); throw e; }));
    };
  }
  self.addEventListener('error', e => err('error', e.message || e));
  send();
  try { oi.call(self, ENG); } catch (e) { err('engine', e); }
})();
