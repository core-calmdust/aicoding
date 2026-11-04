/* =====================================================================
   World Board Game Atlas — procedural textures off the main thread (portal only)
   The 3D table and the board models draw their wood / marble / paper textures pixel by pixel
   (seconds of work on a phone). On the portal those loops run here, in a small pool of Web Workers,
   so the page keeps animating and scrolling while the 3D boards are prepared in the background.
     AtlasTexGen.paint(canvas, lib, name, p, after, canvas2)
        lib = function (X) { return { name(d, W, H, p, d2, mk) { …fill RGBA d (and d2)… } } } — self-contained;
        mk(W, H) gives a 2D context to draw on (an OffscreenCanvas in the worker) for kernels that use canvas calls
        (it is sent to the worker as source; X = { makeNoise }). The canvas is returned at once (blank);
        it is filled when the worker answers, then after(ctx, W, H) draws any overlay on the main thread.
     AtlasTexGen.later(depCanvases, canvas, fn)   fn(ctx, W, H) once every dep canvas is filled (composites)
     AtlasTexGen.group(name, fn)   tag the work started inside fn (one board / the room)
     AtlasTexGen.idle(names)       → Promise, resolved when that work is done (prioritize(names) first)
     AtlasTexGen.gunzip(buf)       → Promise<ArrayBuffer>, inflated in a worker
   Without workers (or with ?notexgen) everything runs synchronously, exactly as before.
   The game pages don't load this file: their model code keeps its synchronous path.
   ===================================================================== */
(function () {
  'use strict';
  const SRC = (() => { try { return new URL('texgen-worker.js?v=1', document.currentScript.src).href; } catch (e) { return 'texgen-worker.js?v=1'; } })();
  let OK = typeof Worker === 'function' && typeof ImageData === 'function' && !/[?&]notexgen\b/.test(location.search);
  const POOL = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const workers = [], queue = [], running = new Map();
  const pend = new WeakMap();   // canvas → Promise (filled)
  const G = new Map();          // group → Set<Promise>
  let cur = '', seq = 0, libSeq = 0;
  const libSrc = new WeakMap(), libLocal = new WeakMap();
  const X = () => window.Table3D;

  const mk2d = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
  function local(lib) { let L = libLocal.get(lib); if (!L) { L = lib(X()); libLocal.set(lib, L); } return L; }
  function runHere(job) {
    const { c, c2, name, p } = job, g = c.getContext('2d'), img = g.createImageData(c.width, c.height), img2 = c2 ? c2.getContext('2d').createImageData(c2.width, c2.height) : null;
    local(job.lib)[name](img.data, c.width, c.height, p, img2 && img2.data, mk2d);
    put(job, img, img2);
  }
  function put(job, img, img2) {
    const { c, c2, after } = job;
    const g = c.getContext('2d'); g.putImageData(img, 0, 0);
    if (img2) c2.getContext('2d').putImageData(img2, 0, 0);
    if (after) after(g, c.width, c.height);
    touched(c); if (c2) touched(c2);
  }
  function track(promise, ...cs) {
    cs.forEach(c => c && pend.set(c, promise));
    const set = G.get(cur) || (G.set(cur, new Set()), G.get(cur)); set.add(promise);
    promise.then(() => set.delete(promise), () => set.delete(promise));
    return promise;
  }

  /* ---------- the worker pool ---------- */
  function spawn() {
    let w; try { w = new Worker(SRC); } catch (e) { OK = false; return null; }
    w.busy = 0;
    w.onmessage = e => {
      const m = e.data, job = running.get(m.id); running.delete(m.id); w.busy = 0;
      if (job) {
        if (m.err || !m.d) { console.warn('[texgen] ' + job.name + ': ' + (m.err || 'no data') + ' — drawn on the main thread'); try { runHere(job); } catch (x) { console.warn(x); } }
        else { try { put(job, new ImageData(m.d, job.c.width, job.c.height), m.d2 ? new ImageData(m.d2, job.c2.width, job.c2.height) : null); } catch (x) { console.warn(x); } }
        job.done();
      }
      pump();
    };
    w.onerror = e => { e.preventDefault && e.preventDefault(); };
    const mk = X() && X().makeNoise; w.postMessage({ init: mk ? mk.toString() : '' });
    workers.push(w); return w;
  }
  function pump() {
    while (queue.length) {
      let w = workers.find(x => !x.busy);
      if (!w && workers.length < POOL) w = spawn();
      if (!w) { if (!OK) { while (queue.length) { const j = queue.shift(); try { runHere(j); } catch (x) { console.warn(x); } j.done(); } } return; }
      const job = queue.shift(); w.busy = 1; running.set(job.id, job);
      let src = libSrc.get(job.lib); if (!src) { src = job.lib.toString(); libSrc.set(job.lib, src); }
      w.postMessage({ id: job.id, src, name: job.name, p: job.p, W: job.c.width, H: job.c.height, W2: job.c2 ? job.c2.width : 0, H2: job.c2 ? job.c2.height : 0 });
    }
  }

  function paint(c, lib, name, p = {}, after = null, c2 = null) {
    const job = { id: ++seq, c, c2, lib, name, p, after, group: cur };
    if (!OK || !X() || !X().makeNoise) { runHere(job); return c; }
    track(new Promise(res => { job.done = res; }), c, c2);
    queue.push(job); pump();
    return c;
  }
  function later(deps, c, fn) {
    const ds = deps.filter(Boolean).map(ready);
    if (!ds.some(Boolean) || !OK) { fn(c.getContext('2d'), c.width, c.height); touched(c); return c; }
    track(Promise.all(ds).then(() => { try { fn(c.getContext('2d'), c.width, c.height); } catch (e) { console.warn(e); } touched(c); }), c);
    return c;
  }
  const ready = c => (c && pend.get(c)) || null;
  function group(name, fn) { const old = cur; cur = name; try { return fn(); } finally { cur = old; } }
  function prioritize(names) {
    const hit = queue.filter(j => names.includes(j.group)); if (!hit.length) return;
    const rest = queue.filter(j => !names.includes(j.group)); queue.length = 0; queue.push(...hit, ...rest);
  }
  function busy(names) { return names.some(n => G.get(n) && G.get(n).size); }
  const settle = () => idle([...G.keys()]);   // everything started so far
  function idle(names) {
    const all = []; names.forEach(n => { const s = G.get(n); if (s) s.forEach(p => all.push(p)); });
    return all.length ? Promise.all(all).then(() => idle(names)) : Promise.resolve();
  }

  /* ---------- textures already on the GPU (a board shown before its pictures were done): upload again ---------- */
  const dirty = new Set(); let raf = 0;
  function touched(c) { dirty.add(c); if (!raf) raf = requestAnimationFrame(flush); }
  function flush() {
    raf = 0; const T = X(), sc = T && T._scene && T._scene(); if (!sc) { dirty.clear(); return; }
    let hit = false;
    sc.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && dirty.has(t.image)) { t.needsUpdate = true; hit = true; } } });
    dirty.clear(); if (hit && T.kick) T.kick(200);
  }

  /* ---------- gzip in a worker (the AI weights) ---------- */
  function gunzip(buf) {
    if (!OK || typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no worker gunzip'));
    return new Promise((res, rej) => {
      let w; try { w = new Worker(SRC); } catch (e) { return rej(e); }
      w.onmessage = e => { w.terminate(); e.data && e.data.buf ? res(e.data.buf) : rej(new Error(e.data && e.data.err || 'gunzip')); };
      w.onerror = e => { w.terminate(); rej(e); };
      w.postMessage({ gz: buf }, [buf]);
    });
  }

  window.AtlasTexGen = { paint, later, ready, group, idle, settle, busy, prioritize, gunzip, get on() { return OK; } };
})();
