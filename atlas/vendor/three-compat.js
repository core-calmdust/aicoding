/* three.js r186 with the r128 code of this site (2026-11-13; the default since then — ?three=128 loads r128 instead): loaded right after vendor/three-r186.min.js (an IIFE build of
   three@0.186 exposing window.THREE, made with esbuild from the npm package). It brings back what r128 had, so the 3D code runs
   unchanged:
   - colour management off: hex colours are taken as they are and the code's own convertSRGBToLinear() does the conversion, as in r128
   - .encoding / outputEncoding / sRGBEncoding / LinearEncoding → colorSpace / outputColorSpace / SRGBColorSpace / LinearSRGBColorSpace
   - the lights' intensities: r128's non-physical lighting is r186's physical one × π for directional / hemisphere / ambient lights;
     point and spot lights take r128's decay (1), r128's fade with distance (the shader's getDistanceAttenuation) and the same × π */
(function () {
  const T = window.THREE; if (!T || T.__compat) return; T.__compat = 1;
  try { T.ColorManagement.enabled = false; } catch (e) {}
  // r128 code that patches 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );' in onBeforeCompile: in r186 that line sits in the
  // opaque_fragment chunk, so the library's shaders get it written out (the patches find it again)
  try { for (const k in T.ShaderLib) { const L = T.ShaderLib[k]; if (L && typeof L.fragmentShader === 'string' && L.fragmentShader.includes('#include <opaque_fragment>')) L.fragmentShader = L.fragmentShader.replace('#include <opaque_fragment>', T.ShaderChunk.opaque_fragment); } } catch (e) {}
  // (2026-11-13) the clearcoat's Fresnel dims the layer under it twice as much at a glossy ball's edge as r128 did (a black ring
  // round marbles, stones, discs): it takes half of that dimming, which gives the r128 look back
  try { for (const k in T.ShaderLib) { const L = T.ShaderLib[k]; if (L && typeof L.fragmentShader === 'string') L.fragmentShader = L.fragmentShader.replace('( 1.0 - material.clearcoat * Fcc )', '( 1.0 - material.clearcoat * Fcc * 0.5 )'); } } catch (e) {}
  const X = Object.assign({}, T);
  // r128's shared vUv is per map in r186 (vMapUv, vRoughnessMapUv …): onBeforeCompile code that reads vUv puts THREE.__uvDefs first
  X.__uvDefs = '#ifndef vUv\n#if defined( USE_MAP )\n#define vUv vMapUv\n#elif defined( USE_ROUGHNESSMAP )\n#define vUv vRoughnessMapUv\n#elif defined( USE_NORMALMAP )\n#define vUv vNormalMapUv\n#elif defined( USE_EMISSIVEMAP )\n#define vUv vEmissiveMapUv\n#elif defined( USE_BUMPMAP )\n#define vUv vBumpMapUv\n#endif\n#endif\n';   // (an ES module namespace object is frozen: work on a copy and publish it as THREE)
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
  // r128 (physicallyCorrectLights off): a point / spot light fades only inside its range, by (1 - d/D)^decay; with no range, not at all
  try { const C = T.ShaderChunk, k = 'lights_pars_begin', i = C[k].indexOf('float getDistanceAttenuation('), j = C[k].indexOf('float getSpotAttenuation(');
    if (i >= 0 && j > i) C[k] = C[k].slice(0, i) + 'float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n\tif ( cutoffDistance > 0.0 && decayExponent > 0.0 ) return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );\n\treturn 1.0;\n}\n' + C[k].slice(j); } catch (e) {}
  const wrap = (name, decay) => { const B = T[name]; if (!B) return;
    X[name] = class extends B { constructor(...a) { super(...a); this.intensity *= PI;
      if (decay && this.decay !== undefined) {
        // (2026-11-13, v15) r128's own fade with distance, exactly: the shader's getDistanceAttenuation is r128's legacy one again (below),
        // so decay is the real r128 value (default 1). Before, decay was forced to 0 and r186's range window stood in for the fade — but
        // that window stays near 1 until the very end of the range where r128 fell off steadily ((1 - d/D)^decay): lamps over a table
        // came out 1.5–2× too bright (the felt room, the sky lounge, the dining room at night — boards burnt out).
        this.decay = name === 'PointLight' ? (a[3] !== undefined ? a[3] : 1) : (a[5] !== undefined ? a[5] : 1);
      } } }; };
  ['DirectionalLight', 'HemisphereLight', 'AmbientLight'].forEach(n => wrap(n));
  ['PointLight', 'SpotLight'].forEach(n => wrap(n, true));
  window.THREE = X;
})();
