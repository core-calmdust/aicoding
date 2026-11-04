/* Worker side of atlas/texgen.js: runs the pixel loops of the procedural textures (and inflates gzip data).
   Each kernel library arrives as source text (a self-contained function (X) → { name(d, W, H, p, d2) }),
   compiled once per worker; X.makeNoise is the same value-noise as Table3D.makeNoise (sent at start). */
'use strict';
let X = { makeNoise: null };
const libs = new Map();
// a 2D context for kernels that draw with canvas calls (throws where OffscreenCanvas is missing → the page draws it itself)
const mk = (W, H) => new OffscreenCanvas(W, H).getContext('2d', { willReadFrequently: true });
self.onmessage = async e => {
  const m = e.data;
  if ('init' in m) { try { X = { makeNoise: m.init ? new Function('return (' + m.init + ')')() : null }; } catch (err) {} return; }
  if (m.gz) {
    try { const buf = await new Response(new Blob([m.gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); self.postMessage({ buf }, [buf]); }
    catch (err) { self.postMessage({ err: String(err) }); }
    return;
  }
  try {
    let L = libs.get(m.src);
    if (!L) { L = new Function('return (' + m.src + ')')()(X); libs.set(m.src, L); }
    const d = new Uint8ClampedArray(m.W * m.H * 4), d2 = m.W2 ? new Uint8ClampedArray(m.W2 * m.H2 * 4) : null;
    L[m.name](d, m.W, m.H, m.p || {}, d2, mk);
    self.postMessage({ id: m.id, d, d2 }, d2 ? [d.buffer, d2.buffer] : [d.buffer]);
  } catch (err) { self.postMessage({ id: m.id, err: String(err && err.message || err) }); }
};
