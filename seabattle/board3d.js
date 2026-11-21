// DREADNOUGHTS (海戦ゲーム) — the 3D sea. Same API as the SVG board (board.js): draw / cellAt / point / aim / fx / sweep, so the game
// code does not change; the SVG stays on top (invisible) and keeps receiving the pointer, this draws on a canvas under it.
// Sea: one ocean (Gerstner waves on a physically lit surface with the sky's reflection, the board's grid and every per-square mark
// painted into the water itself, so they ride the waves). Ships: SeaShips (ships3d.js). Fire, smoke, spray: a particle system.
(function () {
'use strict';
const S2 = window.SeaBoard, N = 10;
let T = null, V = null, loading = null, failed = false;

// ---------- loading ----------
function hasGL() { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; } }
function script(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function load() {
  if (loading) return loading;
  loading = (window.THREE ? Promise.resolve() : script('../atlas/vendor/three-r186.min.js?v=1')).then(() => window.SeaShips ? null : script('ships3d.js?v=' + (window.SEA3D_V || 1))).then(() => { T = window.THREE; });
  loading.catch(() => { failed = true; });
  return loading;
}

// ---------- waves (the same sum in JS for the ships and in the shader for the water) ----------
// each wave: direction (x, z), steepness, wavelength (in squares), speed factor
const WAVES = [[.82, .57, .055, 9.5, 1], [-.36, .93, .05, 5.7, 1.1], [.95, -.31, .042, 3.4, 1.2], [.2, .98, .035, 2.1, 1.35], [-.7, -.71, .02, 1.3, 1.5]];
function waveAt(x, z, t, out) {
  let px = 0, py = 0, pz = 0;
  for (const [dx, dz, st, L, sp] of WAVES) { const k = 2 * Math.PI / L, c = Math.sqrt(9.8 / k) * .16 * sp, a = st / k, f = k * (dx * x + dz * z - c * t); px += dx * a * Math.cos(f); py += a * Math.sin(f); pz += dz * a * Math.cos(f); }
  if (out) { out.x = px; out.y = py; out.z = pz; } return py;
}
const GLSL_WAVES = `
const int NW = ${WAVES.length};
uniform vec4 uW[NW]; uniform float uWs[NW];
vec3 gerst(vec2 p, float t, inout vec3 tg, inout vec3 bn) {
  vec3 d = vec3(0.);
  for (int i = 0; i < NW; i++) { vec4 w = uW[i]; float k = 6.2831853 / w.w, c = sqrt(9.8 / k) * .16 * uWs[i], a = w.z / k, f = k * (dot(w.xy, p) - c * t);
    d += vec3(w.x * a * cos(f), a * sin(f), w.y * a * cos(f));
    tg += vec3(-w.x * w.x * w.z * sin(f), w.x * w.z * cos(f), -w.x * w.y * w.z * sin(f));
    bn += vec3(-w.x * w.y * w.z * sin(f), w.y * w.z * cos(f), -w.y * w.y * w.z * sin(f)); }
  return d;
}`;

// ---------- the sky (shared by the visible dome and the reflections) ----------
const GLSL_SKY = `
uniform vec3 uSun;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
vec3 skyCol(vec3 d, float tm) {
  float h = d.y, sd = max(dot(d, uSun), 0.);
  vec3 zen = vec3(.035, .07, .14), mid = vec3(.16, .25, .38), hor = vec3(.92, .66, .4);
  vec3 c = mix(hor, mid, smoothstep(0., .22, h)); c = mix(c, zen, smoothstep(.2, .85, h));
  c += vec3(1., .55, .25) * pow(sd, 6.) * .55 * (1. - smoothstep(0., .5, h));
  c += vec3(1.6, 1.1, .7) * pow(sd, 90.) * 1.4 + vec3(18., 13., 8.) * smoothstep(.9994, .9997, sd);
  if (h > 0.) { vec2 uv = d.xz / (h + .12) * 1.3 + vec2(tm * .006, 0.); float cl = smoothstep(.5, .85, fbm(uv)) * smoothstep(0., .08, h) * (1. - smoothstep(.4, .9, h));
    vec3 cc = mix(vec3(.32, .3, .36), vec3(1.25, .82, .55), pow(sd, 3.) * .9 + .15); c = mix(c, cc, cl * .75); }
  c = mix(c, vec3(.05, .09, .13), smoothstep(0., -.25, h));
  return c;
}`;

// ---------- particles: one pool for fire/flash (additive) and one for smoke/spray (blended) ----------
function makeParticles(additive, n) {
  const g = new T.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), sz = new Float32Array(n), rot = new Float32Array(n);
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 4)); g.setAttribute('size', new T.BufferAttribute(sz, 1)); g.setAttribute('rot', new T.BufferAttribute(rot, 1));
  const m = new T.ShaderMaterial({
    uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
    vertexShader: `attribute vec4 color; attribute float size; attribute float rot; varying vec4 vC; varying float vR; uniform float uScale;
      void main() { vC = color; vR = rot; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale / -mv.z; }`,
    fragmentShader: `varying vec4 vC; varying float vR;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main() { vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = mat2(c, -s, s, c) * p; float r = length(p) * 2.; if (r > 1.) discard;
        float n = vn(p * 5. + vR * 7.) * .55 + vn(p * 11. - vR * 3.) * .45; float a = smoothstep(1., ${additive ? '.0' : '.25'}, r) * (${additive ? '.75 + .5 * n' : '.45 + .75 * n'});
        gl_FragColor = vec4(vC.rgb, vC.a * a); }`,
  });
  const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 6 : 5;
  const P = { pts, n, pos, col, sz, rot, live: [], free: [] }; for (let i = n - 1; i >= 0; i--) P.free.push(i);
  return P;
}
// spawn: { p: [x,y,z], v: [vx,vy,vz], life, size0, size1, c0: [r,g,b,a], c1, g (gravity), drag, spin }
function emit(P, o) { const i = P.free.pop(); if (i == null) return; P.live.push(Object.assign({ i, t: 0, r: Math.random() * 6.28, sp: (Math.random() - .5) * (o.spin || 1) }, o)); }
function stepParticles(P, dt) {
  const L = P.live; for (let j = L.length - 1; j >= 0; j--) { const q = L[j]; q.t += dt; if (q.t >= q.life) { P.sz[q.i] = 0; P.col[q.i * 4 + 3] = 0; P.free.push(q.i); L[j] = L[L.length - 1]; L.pop(); continue; }
    const u = q.t / q.life; q.v[1] -= (q.g || 0) * dt; const d = Math.pow(1 - (q.drag || 0), dt * 60); q.v[0] *= d; q.v[1] *= d; q.v[2] *= d;
    q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; if (q.floor != null && q.p[1] < q.floor) { q.p[1] = q.floor; q.v[1] = 0; }
    const k = q.i; P.pos[k * 3] = q.p[0]; P.pos[k * 3 + 1] = q.p[1]; P.pos[k * 3 + 2] = q.p[2];
    const e = q.ease ? Math.pow(u, q.ease) : u; P.sz[k] = q.size0 + (q.size1 - q.size0) * e; for (let c = 0; c < 4; c++) P.col[k * 4 + c] = q.c0[c] + (q.c1[c] - q.c0[c]) * u;
    if (q.fadeIn) P.col[k * 4 + 3] *= Math.min(1, q.t / q.fadeIn); P.rot[k] = q.r + q.sp * q.t; }
  const g = P.pts.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = g.attributes.rot.needsUpdate = true;
}

// ---------- text sprites (labels, scan counts, ?/!) ----------
const texCache = new Map();
function textTex(txt, o) {
  o = o || {}; const key = txt + '|' + JSON.stringify(o); if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  if (o.disc) { g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fillStyle = o.disc; g.fill(); g.lineWidth = 6; g.strokeStyle = o.ring || 'rgba(255,255,255,.9)'; g.stroke(); }
  g.font = `${o.weight || 600} ${o.px || 72}px ${o.font || "'Cormorant Garamond','Shippori Mincho',serif"}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.shadow !== false) { g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; }
  g.fillStyle = o.color || '#e7cd8f'; g.fillText(txt, 64, 68);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}
function sprite(txt, size, o) { const m = new T.SpriteMaterial({ map: textTex(txt, o), transparent: true, depthWrite: false, depthTest: !(o && o.top) }); const s = new T.Sprite(m); s.scale.set(size, size, 1); s.renderOrder = 8; return s; }

// ---------- the scene ----------
function cellXZ(cell) { return [-5 + (cell % N) + .5, -5 + (cell / N | 0) + .5]; }
function init(svg) {
  const frame = svg.parentNode, canvas = document.createElement('canvas'); canvas.className = 'sb3d'; frame.insertBefore(canvas, svg); const vig = document.createElement('div'); vig.className = 'sb3d-vig'; frame.insertBefore(vig, svg); frame.classList.add('sb3d-on');
  const mobile = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const R = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const prMax = Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2); R.setPixelRatio(prMax); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(20, 1, .1, 1200);
  const sunDir = new T.Vector3(-.42, .34, -.84).normalize(), uniSky = { uSun: { value: sunDir }, uTime: { value: 0 } };
  // sky dome + an environment map made from the same sky for the reflections on the ships and the water
  const skyMat = new T.ShaderMaterial({ uniforms: uniSky, side: T.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), uTime), 1.); }' });
  const sky = new T.Mesh(new T.SphereGeometry(500, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  const pm = new T.PMREMGenerator(R), envScene = new T.Scene(); envScene.add(new T.Mesh(new T.SphereGeometry(10, 48, 24), new T.ShaderMaterial({ uniforms: uniSky, side: T.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), 0.), 1.); }' })));
  scene.environment = pm.fromScene(envScene, .01).texture; scene.environmentIntensity = .9;
  // light: a low evening sun behind the board, soft sky light
  const sun = new T.DirectionalLight(0xffd2a0, 2.5); sun.position.copy(sunDir).multiplyScalar(30); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 5; sc.far = 60; sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
  scene.add(new T.HemisphereLight(0xb4c8dc, 0x1a2a33, 1.05));
  const fill = new T.DirectionalLight(0x8fb2d6, .35); fill.position.set(6, 8, 10); scene.add(fill);
  // the cells' state as a 10×10 texture the water reads: R = shot state, G = heat, B = flags
  const cellData = new Uint8Array(N * N * 4), cellTex = new T.DataTexture(cellData, N, N, T.RGBAFormat); cellTex.needsUpdate = true; cellTex.magFilter = cellTex.minFilter = T.NearestFilter;
  const uni = { uTime: { value: 0 }, uCells: { value: cellTex }, uAim: { value: new T.Vector3(-99, -99, 0) }, uRip: { value: Array.from({ length: 8 }, () => new T.Vector4(0, 0, -99, 0)) }, uSweep: { value: new T.Vector4(0, 0, -99, 0) }, uSweepBox: { value: new T.Vector4(0, 0, 0, 0) }, uHulls: { value: Array.from({ length: 12 }, () => new T.Vector4(0, 0, 0, 0)) }, uNH: { value: 0 }, uFog: { value: 0 }, uOwn: { value: 0 }, uCam: { value: cam.position },
    uW: { value: WAVES.map(w => new T.Vector4(w[0], w[1], w[2], w[3])) }, uWs: { value: WAVES.map(w => w[4]) }, uSun: uniSky.uSun };
  const water = makeWater(uni, mobile); scene.add(water);
  // labels A–J along the far edge, 1–10 down the left
  const labels = new T.Group(); for (let i = 0; i < N; i++) { const a = sprite('ABCDEFGHIJ'[i], .6, { top: 1 }), b = sprite(String(i + 1), .6, { top: 1 }); a.position.set(-5 + i + .5, .25, -5.5); b.position.set(-5.55, .25, -5 + i + .5); labels.add(a, b); } scene.add(labels);
  const fire = makeParticles(true, mobile ? 1500 : 3000), smoke = makeParticles(false, mobile ? 2000 : 4000); scene.add(fire.pts, smoke.pts);
  const shipLayer = new T.Group(), markLayer = new T.Group(), fxLayer = new T.Group(); scene.add(shipLayer, markLayer, fxLayer);
  const flash = new T.PointLight(0xffa860, 0, 6, 1.6); scene.add(flash);
  V = { R, scene, cam, canvas, frame, svg, sun, water, uni, cellData, cellTex, fire, smoke, shipLayer, markLayer, fxLayer, flash, labels, mobile, prMax, ships: new Map(), proto: new Map(), emitters: [], floats: [], rip: 0, t: 0, last: performance.now(), size: 0, flashT: 0, shake: 0, o: null, aim: -1, intro: 1 };
  new ResizeObserver(() => fit()).observe(frame); fit();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { V.last = performance.now(); loop(); } });
  loop();
}
function makeWater(uni, mobile) {
  // a polar mesh: fine near the board, coarse towards the horizon
  const rings = mobile ? 90 : 130, segs = mobile ? 128 : 192, pos = [], idx = [];
  pos.push(0, 0, 0); for (let i = 1; i <= rings; i++) { const r = .09 * (Math.pow(1.058, i) - 1) / .058; for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(idx);
  const m = new T.MeshPhysicalMaterial({ color: 0x0b3a4a, roughness: .12, metalness: 0, clearcoat: .6, clearcoatRoughness: .08, envMapIntensity: 1.1, ior: 1.33, specularIntensity: 1 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GLSL_WAVES + '\nuniform float uTime; varying vec3 vWp; varying float vH;')
      .replace('#include <beginnormal_vertex>', `vec3 tg = vec3(1., 0., 0.), bn = vec3(0., 0., 1.); vec3 gd = gerst(position.xz, uTime, tg, bn);
        float fall = 1. - smoothstep(60., 180., length(position.xz)); vec2 bq = abs(position.xz) - 5.; float calm = mix(.4, 1., smoothstep(0., 4., length(max(bq, 0.)))); gd *= fall * calm; vec3 objectNormal = normalize(mix(vec3(0., 1., 0.), normalize(cross(bn, tg)), fall));
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3(1., 0., 0.);
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = position + gd; vWp = transformed; vH = gd.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uTime; uniform sampler2D uCells; uniform vec3 uAim; uniform vec4 uRip[8]; uniform vec4 uSweep; uniform vec4 uSweepBox; uniform float uFog; uniform float uOwn; uniform vec3 uCam; uniform vec4 uHulls[12]; uniform int uNH;
      varying vec3 vWp; varying float vH;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float box(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
      vec3 gridEm = vec3(0.); float foamAdd = 0.; vec3 tintAdd = vec3(0.); float darkAdd = 0.;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 p = vWp.xz; float dist = length(p - uCam.xz);
        // depth colour: deeper blue far out, a lighter jade in the troughs' light, foam on the crests
        float crest = smoothstep(.1, .2, vH + (vn(p * 3.1 + uTime * .2) - .5) * .06);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.05, .3, .33), smoothstep(-.1, .14, vH) * .55);
        float fo = crest * smoothstep(.45, .8, vn(p * vec2(9., 4.) - uTime * .3)) * .55;
        // ripples from impacts: rings of foam spreading out
        for (int i = 0; i < 8; i++) { vec4 r = uRip[i]; float age = uTime - r.z; if (age < 0. || age > 2.4) continue; float d = length(p - r.xy), rad = (1. - exp(-age * 1.6)) * .75 * r.w;
          fo += (1. - smoothstep(0., .05 + age * .03, abs(d - rad))) * pow(1. - age / 2.4, 2.) * .55 * r.w + (1. - smoothstep(0., .3 * r.w, d)) * max(0., 1. - age * 1.2) * .9; }
        // hulls: x, z, half length along the ship's axis (sign = axis: + along x, - along z), half beam
        for (int i = 0; i < 12; i++) { if (i >= uNH) break; vec4 hh = uHulls[i]; vec2 q = p - hh.xy; if (hh.z < 0.) q = vec2(-q.y, q.x); float hl = abs(hh.z), hb = hh.w;
          float t = clamp(q.x / hl, -1., 1.), w = hb * sqrt(max(0., 1. - pow(max(0., t - .35) / .65, 2.))) * (t < -.85 ? .8 : 1.); float d = length(vec2(max(abs(q.x) - hl, 0.), max(abs(q.y) - w, 0.)));
          darkAdd += (1. - smoothstep(0., .22, d)) * .3;
          { vec2 q2 = q + (hh.z < 0. ? vec2(-.26, .2) : vec2(.2, .26)) * -1.; float d2 = length(vec2(max(abs(q2.x) - hl, 0.), max(abs(q2.y) - w * 1.1, 0.))); darkAdd += (1. - smoothstep(0., .12, d2)) * .32 * step(.0, d); }   // the hull's shadow, cast away from the low sun
          fo += (1. - smoothstep(.0, .045 + .03 * vn(p * 18. + uTime), d)) * smoothstep(.0, .012, d) * (.3 + .3 * vn(p * 25. - uTime * 2.)) * (.6 + .4 * smoothstep(.2, 1., t)); }
        bool inB = abs(p.x) < 5. && abs(p.y) < 5.;
        if (inB) {
          vec2 cp = p + 5.; ivec2 ci = ivec2(floor(cp)); vec2 f = fract(cp) - .5; vec4 cd = texelFetch(uCells, ci, 0);
          int shot = int(cd.r * 255. + .5), flags = int(cd.b * 255. + .5); float heat = cd.g;
          if (heat > .01) tintAdd += vec3(1., .42, .16) * heat * .55 * (1. - smoothstep(.36, .5, max(abs(f.x), abs(f.y))));
          if ((flags & 1) != 0) { float b = box(f, vec2(.42), .1); tintAdd += vec3(1., .78, .38) * (.35 + .25 * sin(uTime * 6.)) * (1. - smoothstep(-.02, .02, b)); gridEm += vec3(1., .82, .45) * (1. - smoothstep(0., .03, abs(b))) * 1.2; }
          if ((flags & 8) != 0) { float b = box(f, vec2(.42), .12); tintAdd += vec3(.3, .85, 1.) * ((flags & 16) != 0 ? .32 + .12 * sin(uTime * 4.) : .18) * (1. - smoothstep(-.02, .02, b)); }
          if ((flags & 2) != 0) { float b = abs(box(f, vec2(.44), .12)); gridEm += vec3(1., .85, .5) * (1. - smoothstep(.012, .03, b)) * 1.4; }
          if ((flags & 4) != 0) { float r = length(f); gridEm += vec3(.4, 1., .7) * ((1. - smoothstep(.0, .03, abs(r - .3))) + (1. - smoothstep(0., .02, min(abs(f.x), abs(f.y)))) * step(.36, r) * step(r, .5)) * (1.2 + .5 * sin(uTime * 5.)); }
          if (shot == 1) { float r = length(f); fo += (1. - smoothstep(.0, .04, abs(r - .2))) * .55 + (1. - smoothstep(.0, .07, r)) * .7; }
          if (shot == 2) { float r = length(f + vec2(vn(p * 9.) - .5) * .12); darkAdd += (1. - smoothstep(.15, .44, r)) * .75; gridEm += vec3(1., .35, .08) * (1. - smoothstep(.05, .3, r)) * (.5 + .35 * vn(vec2(uTime * 3., p.x * 4.))); }
          if (shot == 3) { float r = length(f); gridEm += vec3(1., .6, .25) * (1. - smoothstep(.0, .04, abs(r - .26))) * 1.4; }
          if (shot == 4) { float r = length(f); tintAdd += vec3(.5) * (1. - smoothstep(.15, .45, r)) * .4; }
        }
        // the grid: thin gold lines on the water, a stronger rim around the board
        vec2 g = abs(fract(p + .5) - .5), fw = fwidth(p) * 1.1; float ln = 1. - min(smoothstep(0., fw.x * 1.5, g.x), smoothstep(0., fw.y * 1.5, g.y));
        float rim = abs(box(p, vec2(5.), .0)), inside = 1. - smoothstep(-.01, .01, box(p, vec2(5.), 0.));
        gridEm += vec3(.85, .68, .4) * (ln * inside * .2 + (1. - smoothstep(.012, .04, rim)) * .75 + (1. - smoothstep(.04, .5, rim)) * .08 * inside);
        tintAdd += vec3(.02, .05, .06) * inside;
        // the hover reticle
        if (uAim.z > .5) { vec2 a = p - uAim.xy; float b = abs(box(a, vec2(.45), .12)); gridEm += vec3(1., .9, .6) * (1. - smoothstep(.015, .035, b)) * (1.5 + .5 * sin(uTime * 8.)); float cr = min(abs(a.x), abs(a.y)); gridEm += vec3(1., .9, .6) * (1. - smoothstep(0., .015, cr)) * step(.12, max(abs(a.x), abs(a.y))) * step(max(abs(a.x), abs(a.y)), .3) * 1.2; }
        // sonar sweep: a ring running out over the scanned box
        if (uSweep.z > -50.) { float age = uTime - uSweep.z; if (age >= 0. && age < 1.4) { vec2 q = p - uSweepBox.xy; bool inS = abs(q.x) < uSweepBox.z && abs(q.y) < uSweepBox.w; if (inS) { float d = length(p - uSweep.xy), rr = age * uSweep.w; gridEm += vec3(.35, .9, 1.) * ((1. - smoothstep(0., .08, abs(d - rr))) * 1.6 + .25) * (1. - age / 1.4); } } }
        // smoke screen over the enemy sea: grey murk
        if (uFog > 0.) { float m = smoothstep(.35, .85, vn(p * .7 + vec2(uTime * .25, uTime * .1)) * .6 + vn(p * 1.9 - uTime * .2) * .4); tintAdd += vec3(.3, .32, .34) * uFog * m * inside * .7; }
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.85, .9, .9), clamp(fo, 0., 1.) * .85);
        diffuseColor.rgb = diffuseColor.rgb * (1. - darkAdd) + tintAdd;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.04, .08, .11), smoothstep(30., 160., dist) * .4);
      }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec2 p = vWp.xz; float e = .05; float n0 = vn(p * 6. + uTime * vec2(.5, .3)) + vn(p * 13. - uTime * vec2(.4, .6)) * .5;
        float nx = vn((p + vec2(e, 0.)) * 6. + uTime * vec2(.5, .3)) + vn((p + vec2(e, 0.)) * 13. - uTime * vec2(.4, .6)) * .5;
        float nz = vn((p + vec2(0., e)) * 6. + uTime * vec2(.5, .3)) + vn((p + vec2(0., e)) * 13. - uTime * vec2(.4, .6)) * .5;
        vec3 dn = vec3(-(nx - n0) / e, 0., -(nz - n0) / e) * .035; normal = normalize(normal + (viewMatrix * vec4(dn, 0.)).xyz); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gridEm;');
  };
  const w = new T.Mesh(g, m); w.receiveShadow = true; w.frustumCulled = false; return w;
}

// camera: frame the board (with its labels) in the square canvas, looking down at a steep angle
function fit() {
  if (!V) return; const r = V.frame.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  V.R.setSize(w, h, false); V.cam.aspect = w / h; V.cam.updateProjectionMatrix(); V.size = w;
  V.fx = fitPose(64); V.fz = null;
  for (const P of [V.fire, V.smoke]) P.pts.material.uniforms.uScale.value = h / (2 * Math.tan(V.cam.fov * Math.PI / 360));
  if (!V.anim) applyPose(V.fx);
}
function fitPose(pitchDeg) {
  const cam = V.cam, pitch = pitchDeg * Math.PI / 180, pts = [[-5.95, -5.95], [5.6, -5.95], [-5.95, 5.6], [5.6, 5.6]].map(([x, z]) => new T.Vector3(x, 0, z));
  let tz = .2, best = 30;
  for (let it = 0; it < 4; it++) {
    let lo = 4, hi = 80;
    for (let k = 0; k < 32; k++) { const d = (lo + hi) / 2; place(d, tz); let m = 0; for (const p of pts) { const q = p.clone().project(cam); m = Math.max(m, Math.abs(q.x), Math.abs(q.y)); } if (m > .965) lo = d; else hi = d; }
    best = hi; place(best, tz); const ys = pts.map(p => p.clone().project(cam).y); tz -= (Math.max(...ys) + Math.min(...ys)) / 2 * 3;
  }
  function place(d, z) { cam.position.set(-.18, Math.sin(pitch) * d, z + Math.cos(pitch) * d); cam.lookAt(-.18, 0, z); cam.updateMatrixWorld(); }
  place(best, tz); return { p: cam.position.clone(), t: new T.Vector3(-.18, 0, tz) };
}
function applyPose(P) { V.cam.position.copy(P.p); V.cam.lookAt(P.t); V.tgt = P.t.clone(); }

// ---------- the render loop ----------
function loop() {
  if (!V || V.raf) return;
  const step = () => {
    V.raf = 0; if (document.hidden || !V.frame.classList.contains('sb3d-on')) return;
    const now = performance.now(), dt = Math.min(.05, (now - V.last) / 1000); V.last = now; V.t += dt; V.uni.uTime.value = V.t;
    if (V.anim) { const a = V.anim, u = Math.min(1, (now - a.t0) / a.dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; V.cam.position.lerpVectors(a.p0, a.p1, e); const tg = a.t0v.clone().lerp(a.t1v, e); V.cam.lookAt(tg); if (u >= 1) { V.anim = null; applyPose(V.fx); } }
    else if (V.fx) { applyPose(V.fx); if (V.shake > 0) { V.shake = Math.max(0, V.shake - dt * 2.2); const s = V.shake * .09; V.cam.position.x += (Math.random() - .5) * s; V.cam.position.y += (Math.random() - .5) * s; } }
    // ships ride the waves
    const tmp = {};
    for (const s of V.ships.values()) { const g = s.g, x = g.position.x, z = g.position.z, L = s.len * .45; const h0 = waveAt(x, z, V.t), hb = waveAt(x + s.ax * L, z + s.az * L, V.t), hs = waveAt(x - s.ax * L, z - s.az * L, V.t), hp = waveAt(x - s.az * .25, z + s.ax * .25, V.t), hq = waveAt(x + s.az * .25, z - s.ax * .25, V.t);
      const sink = s.sink; g.position.y = h0 * .85 - sink * .16 - (s.sinkY || 0); g.rotation.set(0, 0, 0); g.rotateY(s.ry); g.rotateZ(Math.atan2(hb - hs, 2 * L) * .8 + sink * .16 * s.tiltD); g.rotateX(Math.atan2(hp - hq, .5) * .55 + sink * .28 * s.rollD);
      if (s.spin) for (const sp of s.spin) sp.g.rotation.y += sp.w * dt;
      if (s.smokeT != null && (s.smokeT -= dt) < 0) { s.smokeT = .09 + Math.random() * .08; for (const f of s.funnels) { const v = new T.Vector3(f.x, f.y, f.z); g.localToWorld(v); emit(V.smoke, { p: [v.x, v.y, v.z], v: [.05 + Math.random() * .04, .18, .02], life: 2.6, size0: .08, size1: .42, c0: [.32, .31, .3, .22], c1: [.5, .5, .5, 0], drag: .01, g: -.02 }); } } }
    for (const f of V.floats) { f.o.position.y = waveAt(f.x, f.z, V.t) * .85 + (f.dy || 0); if (f.bob) f.o.rotation.z = Math.sin(V.t * 1.7 + f.x) * .12; }
    // fires on burning squares
    for (const e of V.emitters) { e.acc += dt; while (e.acc > e.every) { e.acc -= e.every; e.fn(); } }
    stepParticles(V.fire, dt); stepParticles(V.smoke, dt);
    if (V.flash.intensity > 0) V.flash.intensity = Math.max(0, V.flash.intensity - dt * 60);
    V.R.render(V.scene, V.cam);
    // keep it smooth: if frames run slow for a while, draw at a lower resolution (and back up when there is room)
    V.ft = (V.ft || 16) * .95 + (performance.now() - now) * .05 + dt * 1000 * 0;
    V.fc = (V.fc || 0) + 1; V.slow = (V.slow || 0) * .97 + (dt > .034 ? 1 : 0) * .03;
    if (V.fc % 90 === 0) { const pr = V.R.getPixelRatio(); if (V.slow > .5 && pr > 1) { V.R.setPixelRatio(Math.max(1, pr - .25)); fit(); } else if (V.slow < .05 && pr < V.prMax) { V.R.setPixelRatio(Math.min(V.prMax, pr + .25)); fit(); } }
    loop();
  };
  V.raf = requestAnimationFrame(step);
}

// ---------- state → scene ----------
function proto(k, len, key) { const id = key + '|' + len; if (!V.proto.has(id)) V.proto.set(id, SeaShips.build(T, k, len, key)); return V.proto.get(id); }
const variants = new Map();
function variant(mat, kind) {
  const id = mat.uuid + kind; if (variants.has(id)) return variants.get(id);
  const m = mat.clone();
  if (kind === 'sunk') { m.color = m.color.clone().multiplyScalar(.28); m.roughness = 1; m.metalness = .1; if (m.emissive) m.emissiveIntensity = 0; }
  if (kind === 'ghost' || kind === 'bad') { m.transparent = true; m.opacity = kind === 'bad' ? .55 : .5; m.depthWrite = false; if (kind === 'bad') { m.emissive = new T.Color(0xff2a1a); m.emissiveIntensity = .7; } }
  variants.set(id, m); return m;
}
function setLook(s, kind) {
  if (s.look === kind) return; s.look = kind;
  s.g.traverse(o => { if (!o.isMesh) return; const base = o.userData.base || (o.userData.base = o.material); o.material = kind === 'own' ? base : variant(base, kind); o.castShadow = kind === 'own' || kind === 'sunk'; o.receiveShadow = true; });
}
const TYPES = () => window.SeaEngine.TYPES;
function syncShips(o) {
  const want = new Map();
  (o.ships || []).forEach((sh, i) => { if (!sh) return; const show = o.show ? o.show(i) : 'own'; if (!show) return; const k = sh.t != null ? sh.t : i, key = TYPES()[k] ? TYPES()[k].k : 'destroyer'; want.set(i + ':' + key, { sh, show, k, key }); });
  for (const [id, s] of V.ships) if (!want.has(id)) { V.shipLayer.remove(s.g); V.ships.delete(id); }
  for (const [id, w] of want) {
    let s = V.ships.get(id);
    if (!s) { const p = proto(w.k, w.sh.len, w.key), g = p.clone(); const fx = p.userData.fx; s = { g, len: w.sh.len, funnels: fx.funnels, spin: [], sink: 0, tiltD: Math.random() < .5 ? -1 : 1, rollD: Math.random() < .5 ? -1 : 1 };
      // the spinning radars inside the clone
      const ids = new Set(fx.spin.map(q => q.g.uuid)); const map = new Map(); p.traverse(o => { if (ids.has(o.uuid)) map.set(o.id, o); });
      const pa = [], ca = []; p.traverse(o => pa.push(o)); g.traverse(o => ca.push(o)); pa.forEach((o, n) => { const q = fx.spin.find(x => x.g === o); if (q) s.spin.push({ g: ca[n], w: q.w * (.8 + Math.random() * .4) }); });
      if (fx.funnels.length) s.smokeT = Math.random();
      V.shipLayer.add(g); V.ships.set(id, s); }
    const sh = w.sh, len = sh.len;
    const cx = sh.h ? -5 + sh.c + len / 2 : -5 + sh.c + .5, cz = sh.h ? -5 + sh.r + .5 : -5 + sh.r + len / 2;
    s.g.position.x = cx; s.g.position.z = cz; s.ry = sh.h ? 0 : Math.PI / 2; s.ax = sh.h ? 1 : 0; s.az = sh.h ? 0 : -1; s.len = len;
    const look = /bad/.test(w.show) ? 'bad' : /ghost/.test(w.show) ? 'ghost' : w.show === 'sunk' ? 'sunk' : 'own';
    if (look === 'sunk' && s.look !== 'sunk') { s.sink = s.look ? 0 : 1; s.sinkAnim = !!s.look; } if (look !== 'sunk') s.sink = 0;
    setLook(s, look); if (s.sinkAnim) { s.sinkAnim = false; const s0 = performance.now(); const go = () => { s.sink = Math.min(1, (performance.now() - s0) / 1800); if (s.sink < 1) requestAnimationFrame(go); }; go(); }
    if (look === 'sunk') s.smokeT = null; else if (s.funnels.length && s.smokeT == null) s.smokeT = Math.random();
  }
}
function scanCells(sc) {
  if (sc.list) return sc.list;
  if (sc.plus) { const r = sc.at / N | 0, c = sc.at % N, out = [sc.at]; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc); } return out; }
  const big = !!sc.big, r = big ? Math.max(2, Math.min(7, sc.at / 10 | 0)) : sc.at / 10 | 0, c = big ? Math.max(2, Math.min(7, sc.at % 10)) : sc.at % 10, e = big ? 2 : 1;
  const r0 = sc.row ? r : sc.col ? 0 : Math.max(0, r - e), c0 = sc.row ? 0 : sc.col ? c : Math.max(0, c - e), r1 = sc.row ? r : sc.col ? 9 : Math.min(9, r + e), c1 = sc.row ? 9 : sc.col ? c : Math.min(9, c + e);
  const out = []; for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) out.push(rr * N + cc); return out;
}
function syncMarks(o) {
  const D = V.cellData; D.fill(0);
  const shipAt = new Int16Array(N * N).fill(-1); (o.ships || []).forEach((s, i) => { if (!s) return; const show = o.show ? o.show(i) : 'own'; if (!show) return; for (let k = 0; k < s.len; k++) shipAt[s.h ? s.r * N + s.c + k : (s.r + k) * N + s.c] = i; });
  if (o.shots) for (let i = 0; i < N * N; i++) { const v = o.shots[i]; if (v) D[i * 4] = v === 2 && shipAt[i] >= 0 ? 0 : v; }   // (a hit on a ship we can see burns on the ship, not on the water)
  if (o.heat) { let mx = 0, mn = 1e9; for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; mx = Math.max(mx, o.heat[i]); mn = Math.min(mn, o.heat[i]); } mn *= .85; if (mx > mn) for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; D[i * 4 + 1] = Math.round(255 * Math.pow(Math.max(0, (o.heat[i] - mn) / (mx - mn)), 1.6)); } }
  if (o.glow) for (const c of o.glow) D[c * 4 + 2] |= 1;
  if (o.last != null && o.last >= 0) D[o.last * 4 + 2] |= 2;
  if (o.best != null && o.best >= 0) D[o.best * 4 + 2] |= 4;
  const scans = o.scans ? o.scans.filter(sc => !sc.one).slice(-3) : [];
  scans.forEach((sc, n) => { for (const c of scanCells(sc)) D[c * 4 + 2] |= 8 | (n === scans.length - 1 ? 16 : 0); });
  // the texture's rows run bottom-up in GL: row r of the board is texel row r (we read it with texelFetch at floor(z+5))
  V.cellTex.needsUpdate = true;
  V.uni.uFog.value = o.fogged ? 1 : 0;
  // 3D marks: fires, wreckage, mines, '?', flare readings, scan counts
  for (const c of V.markLayer.children.slice()) V.markLayer.remove(c);
  V.floats = []; V.emitters = V.emitters.filter(e => e.keep);
  const add = (obj, cell, dy, bob) => { const [x, z] = cellXZ(cell); obj.position.set(x, 0, z); V.markLayer.add(obj); V.floats.push({ o: obj, x, z, dy: dy || 0, bob }); return obj; };
  if (o.shots) for (let i = 0; i < N * N; i++) {
    const v = o.shots[i]; if (!v) continue; const [x, z] = cellXZ(i);
    if (v === 2) {
      const own = shipAt[i] >= 0, sunk = own && o.show && o.show(shipAt[i]) === 'sunk';
      if (!own) add(debris(i), i, .0, true);
      // flames and black smoke from the hit square (lazier on a sunk wreck)
      const rate = sunk ? .16 : .045;
      V.emitters.push({ acc: Math.random() * rate, every: rate, fn: () => { const y = waveAt(x, z, V.t) * .85 + (own ? (sunk ? .02 : .12) : .03); if (!sunk) emit(V.fire, { p: [x + (Math.random() - .5) * .25, y, z + (Math.random() - .5) * .25], v: [(Math.random() - .5) * .05, .3 + Math.random() * .25, (Math.random() - .5) * .05], life: .55 + Math.random() * .3, size0: .22, size1: .05, c0: [1, .55, .18, .9], c1: [.9, .2, .05, 0] });
        emit(V.smoke, { p: [x + (Math.random() - .5) * .2, y + .15, z + (Math.random() - .5) * .2], v: [.07 + Math.random() * .05, .35 + Math.random() * .2, .03], life: 2.8, size0: .2, size1: 1, c0: [.18, .17, .16, sunk ? .18 : .38], c1: [.38, .37, .37, 0], drag: .012, fadeIn: .3 }); } });
    }
    if (v === 3) { add(glint(), i, .04, false); }
    if (v === 4) { add(sprite('?', .5, { disc: 'rgba(60,66,72,.85)', ring: 'rgba(220,225,230,.9)', color: '#f2f2ee', px: 76 }), i, .45); V.emitters.push({ acc: 0, every: .5, fn: () => emit(V.smoke, { p: [x + (Math.random() - .5) * .5, waveAt(x, z, V.t) + .1, z + (Math.random() - .5) * .5], v: [.04, .05, 0], life: 3, size0: .4, size1: .8, c0: [.6, .62, .64, .35], c1: [.6, .62, .64, 0], fadeIn: .5 }) }); }
  }
  if (o.scans) for (const sc of o.scans) { if (!sc.one || (o.shots && o.shots[sc.at])) continue; add(sprite(sc.k ? '!' : '×', .46, sc.k ? { disc: 'rgba(216,180,106,.92)', ring: '#fff2cf', color: '#1b1408', px: 80, shadow: false } : { color: '#cfe4ee', px: 90 }), sc.at, .4); }
  scans.forEach((sc, n) => { const cs = scanCells(sc), c0 = cs[0], [x, z] = cellXZ(c0); const s = sprite(String(sc.k), .52, { disc: 'rgba(16,48,64,.9)', ring: n === scans.length - 1 ? '#7fe3ff' : 'rgba(127,227,255,.6)', color: '#e9fbff', px: 70, font: "'Fredoka','Cormorant Garamond',sans-serif" }); s.position.set(x - .5, .5, z - .5); V.markLayer.add(s); V.floats.push({ o: s, x: x - .5, z: z - .5, dy: .5 }); });
  if (o.mines) for (const c of o.mines) add(mine(), c, .02, true);
}
const SH = {};
function shared() {
  if (SH.ok) return SH; SH.ok = 1;
  SH.dark = new T.MeshStandardMaterial({ color: 0x1d1c1b, roughness: .9 }); SH.wood = new T.MeshStandardMaterial({ color: 0x4a3324, roughness: .9 }); SH.metal = new T.MeshStandardMaterial({ color: 0x2b2f33, roughness: .45, metalness: .7 });
  SH.oil = new T.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: .35, depthWrite: false });
  SH.glint = new T.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
  return SH;
}
function debris() { shared(); const g = new T.Group(); for (let i = 0; i < 5; i++) { const b = new T.Mesh(new T.BoxGeometry(.08 + Math.random() * .12, .02, .03 + Math.random() * .05), i % 2 ? SH.wood : SH.dark); b.position.set((Math.random() - .5) * .45, .01, (Math.random() - .5) * .45); b.rotation.y = Math.random() * 3; g.add(b); } return g; }
function glint() { shared(); const g = new T.Group(); const r = new T.Mesh(new T.TorusGeometry(.18, .012, 6, 28), SH.glint); r.rotation.x = Math.PI / 2; g.add(r); const p = new T.Mesh(new T.OctahedronGeometry(.07), SH.metal); p.position.y = .05; g.add(p); return g; }
function mine() { shared(); const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(.13, 16, 12), SH.metal); b.position.y = .05; b.castShadow = true; g.add(b); for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [.7, .7, 0], [-.7, .7, 0], [0, .7, .7], [0, .7, -.7]]) { const h = new T.Mesh(new T.CylinderGeometry(.012, .018, .07, 6), SH.metal); h.position.set(d[0] * .14, .05 + d[1] * .14, d[2] * .14); h.lookAt(d[0] * 2, .05 + d[1] * 2, d[2] * 2); h.rotateX(Math.PI / 2); g.add(h); } return g; }

// ---------- public API (as board.js) ----------
function draw(svg, o) {
  if (svg.id !== 'bsvg' || o.mini || failed || !hasGL()) { if (!V || svg !== V.svg) return S2.draw(svg, o); }
  if (!V) { S2.draw(svg, o); pending = o; load().then(() => { if (!V) { try { init(svg); } catch (e) { console.error(e); failed = true; V = null; svg.parentNode.classList.remove('sb3d-on'); return; } } if (pending) apply(pending); pending = null; }).catch(() => {}); return; }
  S2.draw(svg, o);   // (the SVG keeps its geometry for the pointer maths; it is transparent while 3D is on)
  apply(o);
}
let pending = null;
function apply(o) {
  V.o = o; V.uni.uOwn.value = document.body.classList.contains('view-own') ? 1 : 0;
  syncShips(o); syncMarks(o);
  // the hull list for the water's contact shadow and foam
  let n = 0; for (const s of V.ships.values()) { if (n >= 12 || s.look === 'ghost' || s.look === 'bad') continue; const B = (s.g.userData.B || .3) / 2 + .015, L = s.len * .45; V.uni.uHulls.value[n++].set(s.g.position.x, s.g.position.z, s.ax ? L : -L, s.look === 'sunk' ? B * .6 : B); }
  V.uni.uNH.value = n;
}
// pointer → cell: cast the ray onto the sea plane
const ray = () => V._ray || (V._ray = new T.Raycaster());
function hitXZ(e) { const r = V.canvas.getBoundingClientRect(); const v = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); const rc = ray(); rc.setFromCamera(v, V.cam); const d = rc.ray.direction, o = rc.ray.origin; if (Math.abs(d.y) < 1e-6) return null; const t = -o.y / d.y; return t > 0 ? { x: o.x + d.x * t, z: o.z + d.z * t } : null; }
function on3d(svg) { return V && svg === V.svg && V.frame.classList.contains('sb3d-on'); }
function cellAt(svg, e) { if (!on3d(svg)) return S2.cellAt(svg, e); const p = hitXZ(e); if (!p) return -1; const c = Math.floor(p.x + 5), r = Math.floor(p.z + 5); return c >= 0 && c < N && r >= 0 && r < N ? r * N + c : -1; }
function point(svg, e) { if (!on3d(svg)) return S2.point(svg, e); const p = hitXZ(e) || { x: 0, z: 0 }; return { x: p.x + 5, y: p.z + 5 }; }
function aim(svg, cell) { if (!on3d(svg)) return S2.aim(svg, cell); if (cell < 0) { V.uni.uAim.value.set(-99, -99, 0); return; } const [x, z] = cellXZ(cell); V.uni.uAim.value.set(x, z, 1); }
// what is coming in: shells (guns), bombs (aircraft), torpedoes, rockets/missiles, depth charges — set by the game before a skill's shots
const KIND = { bomb: 'air', strafe: 'air', torpedo: 'torp', rtorpedo: 'torp', dtorpedo: 'torp', rocket: 'rocket', guided: 'rocket', barrage: 'rocket', depth: 'depth' };
let shotKind = null;
function kind(sk) { shotKind = sk ? KIND[sk] || null : null; }
// a shell flies in (from our side when we fire, from over the horizon when they do), then a splash or a blast
function fx(svg, cell, hit, fast) {
  if (!on3d(svg)) return S2.fx(svg, cell, hit, fast);
  if (shotKind === 'torp') return torpedo(cell, hit);
  if (shotKind === 'depth') return depthCharge(cell, hit);
  const [x, z] = cellXZ(cell), own = document.body.classList.contains('view-own'), dur = fast ? .42 : .78;
  const air = shotKind === 'air', rk = shotKind === 'rocket';
  const from = air ? new T.Vector3(x + (Math.random() - .5) * .6, 9, z + (own ? -3 : 3)) : own ? new T.Vector3(x * .3 + (Math.random() - .5) * 2, 3.2, -16) : new T.Vector3(x * .25 + (Math.random() - .5) * 2, 4.5, 14), to = new T.Vector3(x, waveAt(x, z, V.t) * .85 + (hit === true && shipUnder(cell) ? .12 : 0), z), apex = air ? 0 : rk ? .8 : Math.max(from.y, 2) + (fast ? 1.6 : 2.8);
  const t0 = performance.now();
  return new Promise(res => {
    const tick = () => {
      const u = Math.min(1, (performance.now() - t0) / (dur * 1000)), px = from.x + (to.x - from.x) * u, pz = from.z + (to.z - from.z) * u, py = from.y + (to.y - from.y) * u + 4 * apex * u * (1 - u) * .5;
      if (air) { emit(V.smoke, { p: [px, py, pz], v: [0, 0, 0], life: .12, size0: .12, size1: .1, c0: [.15, .16, .17, .9], c1: [.15, .16, .17, 0] }); }   // (a falling bomb: a dark streak)
      else { emit(V.fire, { p: [px, py, pz], v: [0, 0, 0], life: rk ? .3 : .22, size0: rk ? .5 : .42, size1: .04, c0: [1, .9, .65, 1], c1: [1, .45, .12, 0] }); emit(V.fire, { p: [px, py, pz], v: [0, 0, 0], life: .05, size0: .7, size1: .5, c0: [1, .95, .8, .8], c1: [1, .7, .3, 0] }); }
      emit(V.smoke, { p: [px, py, pz], v: [0, .02, 0], life: rk ? 1.6 : .5, size0: rk ? .12 : .05, size1: rk ? .5 : .16, c0: [.8, .8, .8, rk ? .45 : .25], c1: [.8, .8, .8, 0] });
      if (u < 1) return requestAnimationFrame(tick);
      impact(to, hit); res();
    };
    tick();
  });
}
function shipUnder(cell) { const o = V.o; if (!o || !o.ships) return false; const r = cell / N | 0, c = cell % N; return o.ships.some((s, i) => s && (o.show ? o.show(i) : 'own') && (s.h ? s.r === r && c >= s.c && c < s.c + s.len : s.c === c && r >= s.r && r < s.r + s.len)); }
function ripple(x, z, strength) { V.uni.uRip.value[V.rip++ % 8].set(x, z, V.t, strength); }
function impact(p, hit) {
  const x = p.x, z = p.z;
  if (hit === 'fog') { for (let i = 0; i < 14; i++) emit(V.smoke, { p: [x, p.y + .05, z], v: [(Math.random() - .5) * .8, .2 + Math.random() * .3, (Math.random() - .5) * .8], life: 1.6, size0: .3, size1: 1, c0: [.62, .64, .66, .55], c1: [.62, .64, .66, 0], drag: .05 }); ripple(x, z, .6); return; }
  if (hit) {
    V.flash.position.set(x, p.y + .6, z); V.flash.intensity = 22; V.shake = Math.max(V.shake, .5);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, sp = .4 + Math.random() * 1.1; emit(V.fire, { p: [x, p.y + .08, z], v: [Math.cos(a) * sp * .6, .5 + Math.random() * 1.3, Math.sin(a) * sp * .6], life: .4 + Math.random() * .3, size0: .3 + Math.random() * .2, size1: .06, c0: [1, .62, .26, .75], c1: [.8, .18, .04, 0], drag: .06, ease: .6 }); }
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28; emit(V.fire, { p: [x, p.y + .1, z], v: [Math.cos(a) * (1 + Math.random() * 2), 1.2 + Math.random() * 1.8, Math.sin(a) * (1 + Math.random() * 2)], life: .6 + Math.random() * .4, size0: .06, size1: .02, c0: [1, .9, .6, 1], c1: [1, .5, .1, 0], g: 5 }); }
    for (let i = 0; i < 16; i++) emit(V.smoke, { p: [x + (Math.random() - .5) * .3, p.y + .2, z + (Math.random() - .5) * .3], v: [(Math.random() - .5) * .5, .5 + Math.random() * .6, (Math.random() - .5) * .5], life: 2.4 + Math.random(), size0: .35, size1: 1.4, c0: [.24, .22, .21, .42], c1: [.42, .42, .42, 0], drag: .04, fadeIn: .15 });
    ripple(x, z, 1);
  } else {
    // the water column: a tall white plume, falling spray and a ring of foam
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, r = Math.random() * .1, up = 1.6 + Math.random() * 2.2; emit(V.smoke, { p: [x + Math.cos(a) * r, p.y, z + Math.sin(a) * r], v: [Math.cos(a) * (.15 + Math.random() * .35), up, Math.sin(a) * (.15 + Math.random() * .35)], life: 1 + Math.random() * .5, size0: .12 + Math.random() * .12, size1: .3, c0: [.92, .96, .98, .85], c1: [.85, .92, .95, 0], g: 3.2, floor: p.y - .05 }); }
    for (let i = 0; i < 10; i++) emit(V.smoke, { p: [x, p.y + .1, z], v: [(Math.random() - .5) * .4, .3 + Math.random() * .3, (Math.random() - .5) * .4], life: 1.8, size0: .3, size1: .9, c0: [.9, .94, .96, .3], c1: [.9, .94, .96, 0], drag: .03 });
    ripple(x, z, .8);
  }
}
// a torpedo: a white wake runs in from the edge of the board along the row (from the near side when we fire), then the blast
function torpedo(cell, hit) {
  const [x, z] = cellXZ(cell), own = document.body.classList.contains('view-own'), sx = own ? 6.2 : -6.2, dur = .65, t0 = performance.now();
  return new Promise(res => { const tick = () => { const u = Math.min(1, (performance.now() - t0) / (dur * 1000)), px = sx + (x - sx) * u, py = waveAt(px, z, V.t) * .85;
      for (let k = 0; k < 2; k++) emit(V.smoke, { p: [px + (Math.random() - .5) * .06, py + .01, z + (Math.random() - .5) * .08], v: [0, .02, (Math.random() - .5) * .05], life: 1.8, size0: .09, size1: .3, c0: [.92, .96, .98, .7], c1: [.9, .95, .97, 0] });
      if (u < 1) return requestAnimationFrame(tick); impact({ x, y: py + (hit === true && shipUnder(cell) ? .1 : 0), z }, hit); if (!hit) { V.flash.position.set(x, .4, z); } res(); }; tick(); });
}
// a depth charge: a dull boom and a dome of white water
function depthCharge(cell, hit) {
  const [x, z] = cellXZ(cell); return new Promise(res => setTimeout(() => { const y = waveAt(x, z, V.t) * .85;
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random() * .35; emit(V.smoke, { p: [x + Math.cos(a) * r, y, z + Math.sin(a) * r], v: [Math.cos(a) * .4, .9 + Math.random() * 1.2, Math.sin(a) * .4], life: 1.2, size0: .25, size1: .5, c0: [.95, .97, .98, .8], c1: [.9, .95, .97, 0], g: 2.2, floor: y - .05 }); }
    ripple(x, z, 1.2); if (hit === true) { V.flash.position.set(x, .3, z); V.flash.intensity = 18; emit(V.fire, { p: [x, y + .1, z], v: [0, .5, 0], life: .4, size0: .8, size1: .2, c0: [1, .7, .35, .8], c1: [.8, .3, .1, 0] }); }
    res(); }, 260)); }
function sweep(svg, area) {
  if (!on3d(svg)) return S2.sweep(svg, area);
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const c of area) { const [x, z] = cellXZ(c); x0 = Math.min(x0, x - .5); z0 = Math.min(z0, z - .5); x1 = Math.max(x1, x + .5); z1 = Math.max(z1, z + .5); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rad = Math.hypot(x1 - x0, z1 - z0) / 2;
  V.uni.uSweepBox.value.set(cx, cz, (x1 - x0) / 2, (z1 - z0) / 2); V.uni.uSweep.value.set(cx, cz, V.t, rad / 1.1);
  return new Promise(res => setTimeout(res, 750));
}
// a camera sweep in from the horizon (at the start of a battle)
function intro() {
  if (!V || !V.fx) return; const P = V.fx, start = P.p.clone().add(new T.Vector3(-3, -P.p.y + 1.6, 9)), tStart = new T.Vector3(P.t.x, .6, P.t.z - 22);
  V.anim = { t0: performance.now(), dur: 2600, p0: start, p1: P.p.clone(), t0v: tStart, t1v: P.t.clone() };
}
// screen position (CSS px, page) of a square's centre — for tests and the tour
function screenOf(cell) { if (!V) return null; const [x, z] = cellXZ(cell), v = new T.Vector3(x, waveAt(x, z, V.t) * .85, z).project(V.cam), r = V.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
function shake(n) { if (V) V.shake = Math.max(V.shake, n || .8); }
function active() { return !!(V && V.frame.classList.contains('sb3d-on')); }
function enable(on) { if (!V) return; V.frame.classList.toggle('sb3d-on', on); if (on) { V.last = performance.now(); loop(); } }

window.SeaBoard3D = { _v: () => V, screenOf, kind, draw, cellAt, point, aim, fx, sweep, xy: S2.xy, O: S2.O, shipSvg: S2.shipSvg, intro, shake, active, enable, hasGL, load };
})();
