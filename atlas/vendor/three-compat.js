/* three.js r186 with the r128 code of this site (2026-11-13, trial): loaded right after vendor/three-r186.min.js (an IIFE build of
   three@0.186 exposing window.THREE, made with esbuild from the npm package). It brings back what r128 had, so the 3D code runs
   unchanged:
   - colour management off: hex colours are taken as they are and the code's own convertSRGBToLinear() does the conversion, as in r128
   - .encoding / outputEncoding / sRGBEncoding / LinearEncoding → colorSpace / outputColorSpace / SRGBColorSpace / LinearSRGBColorSpace
   - the lights' intensities: r128's non-physical lighting is r186's physical one × π for directional / hemisphere / ambient lights;
     point and spot lights take r128's decay (1) and the same × π */
(function () {
  const T = window.THREE; if (!T || T.__compat) return; T.__compat = 1;
  try { T.ColorManagement.enabled = false; } catch (e) {}
  const X = Object.assign({}, T);   // (an ES module namespace object is frozen: work on a copy and publish it as THREE)
  X.sRGBEncoding = 3001; X.LinearEncoding = 3000;
  const cs = v => v === 3001 ? T.SRGBColorSpace : v === 3000 ? T.LinearSRGBColorSpace : v;
  const enc = c => c === T.SRGBColorSpace ? 3001 : 3000;
  Object.defineProperty(T.Texture.prototype, 'encoding', { configurable: true, get() { return enc(this.colorSpace); }, set(v) { this.colorSpace = cs(v); } });
  Object.defineProperty(T.WebGLRenderer.prototype, 'outputEncoding', { configurable: true, get() { return enc(this.outputColorSpace); }, set(v) { this.outputColorSpace = cs(v); } });
  // copyFramebufferToTexture(position, texture) became (texture, position) in r165 (an own method of each renderer: wrapped per instance)
  X.WebGLRenderer = class extends T.WebGLRenderer { constructor(...a) { super(...a); (window.__three186R = window.__three186R || []).push(this); { const sm = this.shadowMap; let ty = sm.type; Object.defineProperty(sm, 'type', { configurable: true, get: () => ty, set: v => { ty = v === T.PCFSoftShadowMap ? T.PCFShadowMap : v; } }); sm.type = ty; }   // (PCFSoftShadowMap is gone in r186: asked for it, the materials were built for it and sampled the depth-compare shadow map wrongly — no shadows; PCF instead, before anything compiles)
    const f = this.copyFramebufferToTexture.bind(this);
    // (a DataTexture made with no data — the 3D skin's depth-of-field copy — was allocated at the wrong size in r186 and the copy
    //  overflowed it: the blurred far background came out dark. Given a buffer of its own size first, it is allocated as it should be)
    const fix = t => { if (t && t.isDataTexture && t.image && !t.image.data && t.image.width && t.image.height) { t.image.data = new Uint8Array(t.image.width * t.image.height * 4); t.needsUpdate = true; } return t; };
    this.copyFramebufferToTexture = (p, t, l) => p && p.isVector2 && t && t.isTexture ? f(fix(t), p, l) : f(fix(p), t, l); } };
  // a texture whose image (a canvas) changed size: r128 re-allocated it; r186 keeps immutable storage (texStorage2D) and the upload
  // fails ("offset overflows texture dimensions" — a black texture). Dispose it first so it is made again at the new size.
  { const d = Object.getOwnPropertyDescriptor(T.Texture.prototype, 'needsUpdate');
    if (d && d.set) Object.defineProperty(T.Texture.prototype, 'needsUpdate', { configurable: true, get: d.get,
      set(v) { if (v === true) { const im = this.image, w = im && (im.width || im.videoWidth), h = im && (im.height || im.videoHeight);
        if (w && h && this.__wh && this.__wh !== w + 'x' + h) this.dispose(); if (w && h) this.__wh = w + 'x' + h; } d.set.call(this, v); } }); }
  const PI = Math.PI;
  const wrap = (name, decay) => { const B = T[name]; if (!B) return;
    X[name] = class extends B { constructor(...a) { super(...a); this.intensity *= PI; if (decay && this.decay !== undefined) this.decay = a[3] !== undefined && name === 'PointLight' ? a[3] : a[5] !== undefined && name === 'SpotLight' ? a[5] : 1; } }; };
  ['DirectionalLight', 'HemisphereLight', 'AmbientLight'].forEach(n => wrap(n));
  ['PointLight', 'SpotLight'].forEach(n => wrap(n, true));
  window.THREE = X;
})();
