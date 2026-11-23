// DREADNOUGHTS — the 3D world: one evening ocean with two battle zones (our waters near the camera, theirs further out), the
// fleets (SeaShips from ../seabattle/ships3d.js), every mark painted into the water so it rides the waves, effects (shells,
// bombs, torpedoes, rockets, depth charges, splashes, fire, smoke, sinking), and a camera director that flies between zones.
// World.init(canvas) · World.setZone(z, opts) · World.show(pose) · World.fx(z, cell, hit, kind) · World.cellAt(z, e) …
(function () {
'use strict';
let T = null, V = null;
let N = 10, H = 5; const ZC = [new Float32Array([0, 7]), new Float32Array([0, -7])];   // zone centres (x, z): 0 = ours, 1 = theirs; N×N cells, H = N/2 (大艦隊: 14×14 — setSize)

// ---------- waves (JS for the ships, GLSL for the water) ----------
const WAVES = [[.82, .57, .055, 9.5, 1], [-.36, .93, .05, 5.7, 1.1], [.95, -.31, .042, 3.4, 1.2], [.2, .98, .035, 2.1, 1.35], [-.7, -.71, .02, 1.3, 1.5]];
function calmAt(x, z) { let c = 1; for (const zc of ZC) { const dx = Math.max(0, Math.abs(x - zc[0]) - H), dz = Math.max(0, Math.abs(z - zc[1]) - H); c = Math.min(c, .4 + .6 * Math.min(1, Math.hypot(dx, dz) / 4)); } return c; }
function waveAt(x, z, t) { let y = 0; for (const [dx, dz, st, L, sp] of WAVES) { const k = 2 * Math.PI / L, c = Math.sqrt(9.8 / k) * .16 * sp; y += st / k * Math.sin(k * (dx * x + dz * z - c * t)); } return y * calmAt(x, z); }
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
const GLSL_NOISE = `
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }`;
const GLSL_SKY = GLSL_NOISE + `
uniform vec3 uSun;
vec3 skyCol(vec3 d, float tm) {
  float h = d.y, sd = max(dot(d, uSun), 0.);
  vec3 zen = vec3(.03, .06, .13), mid = vec3(.16, .24, .38), hor = vec3(.95, .64, .38);
  vec3 c = mix(hor, mid, smoothstep(0., .22, h)); c = mix(c, zen, smoothstep(.2, .85, h));
  c += vec3(1., .5, .22) * pow(sd, 5.) * .6 * (1. - smoothstep(0., .5, h));
  c += vec3(1.6, 1.1, .7) * pow(sd, 90.) * 1.5 + vec3(20., 14., 8.) * smoothstep(.9994, .9997, sd);
  if (h > 0.) { vec2 uv = d.xz / (h + .12) * 1.3 + vec2(tm * .006, 0.); float cl = smoothstep(.48, .85, fbm(uv)) * smoothstep(0., .08, h) * (1. - smoothstep(.45, .95, h));
    vec3 cc = mix(vec3(.3, .28, .34), vec3(1.3, .82, .52), pow(sd, 3.) * .9 + .15); c = mix(c, cc, cl * .8); }
  c = mix(c, vec3(.04, .08, .12), smoothstep(0., -.25, h));
  return c;
}`;

// ---------- particles ----------
function makeParticles(additive, n) {
  const g = new T.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), sz = new Float32Array(n), rot = new Float32Array(n);
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 4)); g.setAttribute('size', new T.BufferAttribute(sz, 1)); g.setAttribute('rot', new T.BufferAttribute(rot, 1));
  const m = new T.ShaderMaterial({
    uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
    vertexShader: `attribute vec4 color; attribute float size; attribute float rot; varying vec4 vC; varying float vR; uniform float uScale;
      void main() { vC = color; vR = rot; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale / -mv.z; }`,
    fragmentShader: GLSL_NOISE + `varying vec4 vC; varying float vR;
      void main() { vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = mat2(c, -s, s, c) * p; float r = length(p) * 2.; if (r > 1.) discard;
        float n = vn(p * 5. + vR * 7.) * .55 + vn(p * 11. - vR * 3.) * .45; float a = smoothstep(1., ${additive ? '.0' : '.25'}, r) * (${additive ? '.75 + .5 * n' : '.45 + .75 * n'});
        gl_FragColor = vec4(vC.rgb, vC.a * a); }`,
  });
  const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 6 : 5;
  const P = { pts, n, pos, col, sz, rot, live: [], free: [], hi: 0 }; for (let i = n - 1; i >= 0; i--) P.free.push(i); g.setDrawRange(0, 0);
  return P;
}
function emit(P, o) { if (P.dirty) { P.free.sort((a, b) => b - a); P.dirty = 0; } const i = P.free.pop(); if (i == null) return; P.live.push(Object.assign({ i, t: 0, r: Math.random() * 6.28, sp: (Math.random() - .5) * (o.spin || 1) }, o)); }
function stepParticles(P, dt) {
  const L = P.live; for (let j = L.length - 1; j >= 0; j--) { const q = L[j]; q.t += dt; if (q.t >= q.life) { P.sz[q.i] = 0; P.col[q.i * 4 + 3] = 0; P.free.push(q.i); P.dirty = 1; L[j] = L[L.length - 1]; L.pop(); continue; }
    const u = q.t / q.life; q.v[1] -= (q.g || 0) * dt; const d = Math.pow(1 - (q.drag || 0), dt * 60); q.v[0] *= d; q.v[1] *= d; q.v[2] *= d;
    q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; if (q.floor != null && q.p[1] < q.floor) { q.p[1] = q.floor; q.v[1] = 0; }
    const k = q.i; P.pos[k * 3] = q.p[0]; P.pos[k * 3 + 1] = q.p[1]; P.pos[k * 3 + 2] = q.p[2];
    const e = q.ease ? Math.pow(u, q.ease) : u; P.sz[k] = q.size0 + (q.size1 - q.size0) * e; for (let c = 0; c < 4; c++) P.col[k * 4 + c] = q.c0[c] + (q.c1[c] - q.c0[c]) * u;
    if (q.fadeIn) P.col[k * 4 + 3] *= Math.min(1, q.t / q.fadeIn); P.rot[k] = q.r + q.sp * q.t; }
  let hi = 0; for (const q of L) if (q.i >= hi) hi = q.i + 1;
  const g = P.pts.geometry, hiAll = Math.max(hi, P.hi || 0); P.hi = hi; g.setDrawRange(0, hi);
  if (!hiAll) return;
  for (const [k, n] of [['position', 3], ['color', 4], ['size', 1], ['rot', 1]]) { const a = g.attributes[k]; a.clearUpdateRanges(); a.addUpdateRange(0, hiAll * n); a.needsUpdate = true; }
}

// ---------- text sprites ----------
const texCache = new Map();
function textTex(txt, o) {
  o = o || {}; const key = txt + '|' + JSON.stringify(o); if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  if (o.disc) { g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fillStyle = o.disc; g.fill(); g.lineWidth = 6; g.strokeStyle = o.ring || 'rgba(255,255,255,.9)'; g.stroke(); }
  g.font = `${o.weight || 600} ${o.px || 70}px ${o.font || "'Rajdhani','Cormorant Garamond',sans-serif"}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (o.shadow !== false) { g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; }
  g.fillStyle = o.color || '#e7cd8f'; g.fillText(txt, 64, 68);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}
function sprite(txt, size, o) { const m = new T.SpriteMaterial({ map: textTex(txt, o), transparent: true, depthWrite: false, depthTest: !(o && o.top) }); const s = new T.Sprite(m); s.scale.set(size, size, 1); s.renderOrder = 8; return s; }

// ---------- the world ----------
function cellXZ(z, cell) { return [ZC[z][0] - H + (cell % N) + .5, ZC[z][1] - H + (cell / N | 0) + .5]; }
function init(canvas, opts) {
  T = window.THREE; opts = opts || {};
  const mobile = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const R = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: mobile ? 'low-power' : 'high-performance' });
  const prMax = Math.min(devicePixelRatio || 1, mobile ? 1.3 : 1.75); R.setPixelRatio(prMax); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .1, 1500);
  const sunDir = new T.Vector3(-.42, .3, -.86).normalize(), uniSky = { uSun: { value: sunDir }, uTime: { value: 0 } };
  const skyMat = new T.ShaderMaterial({ uniforms: uniSky, side: T.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), uTime), 1.); }' });
  const sky = new T.Mesh(new T.SphereGeometry(700, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  const pm = new T.PMREMGenerator(R), envScene = new T.Scene(); envScene.add(new T.Mesh(new T.SphereGeometry(10, 48, 24), new T.ShaderMaterial({ uniforms: uniSky, side: T.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), 0.), 1.); }' })));
  const envTex = pm.fromScene(envScene, .01).texture; scene.environment = envTex; scene.environmentIntensity = .9;
  const sun = new T.DirectionalLight(0xffd2a0, 2.5); scene.add(sun, sun.target); sun.castShadow = !mobile; sun.shadow.mapSize.set(2048, 2048); R.shadowMap.enabled = !mobile;   // (phones: no shadow pass — the hulls' contact shade on the sea stays)
  const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 5; sc.far = 70; sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
  scene.add(new T.HemisphereLight(0xb4c8dc, 0x1a2a33, 1.05));
  const fill = new T.DirectionalLight(0x8fb2d6, .35); fill.position.set(6, 8, 14); scene.add(fill);
  const cells = [0, 1].map(newCells);
  const uni = { uTime: { value: 0 }, uCellsA: { value: cells[0].tx }, uCellsB: { value: cells[1].tx }, uAim: { value: new T.Vector4(-99, -99, 0, 0) }, uRip: { value: Array.from({ length: 10 }, () => new T.Vector4(0, 0, -99, 0)) },
    uSweep: { value: new T.Vector4(0, 0, -99, 0) }, uSweepBox: { value: new T.Vector4(0, 0, 0, 0) }, uFog: { value: new T.Vector2(0, 0) }, uZn: { value: new T.Vector2(H, H + 2) }, uGrid: { value: new T.Vector2(1, 1) }, uFocus: { value: 0 },
    uHulls: { value: Array.from({ length: 16 }, () => new T.Vector4(0, 0, 0, 0)) }, uNH: { value: 0 }, uCam: { value: cam.position },
    uNrm: { value: null }, uW: { value: WAVES.map(w => new T.Vector4(w[0], w[1], w[2], w[3])) }, uWs: { value: WAVES.map(w => w[4]) } };
  uni.uNrm.value = rippleNormals(); const water = makeWater(uni, mobile, { sunDir }); scene.add(water);
  // the coordinates (A–J, 1–10) round each zone: one flat textured plane per zone (one draw call, not twenty sprites)
  const labels = [0, 1].map(z => makeLabel(z, scene));
  const fire = makeParticles(true, mobile ? 1800 : 3600), smoke = makeParticles(false, mobile ? 2400 : 5000); scene.add(fire.pts, smoke.pts);
  const shipLayer = new T.Group(), markLayer = [new T.Group(), new T.Group()], deco = new T.Group(); scene.add(shipLayer, markLayer[0], markLayer[1], deco);
  const flash = new T.PointLight(0xffa860, 0, 7, 1.6); scene.add(flash);
  V = { R, scene, cam, canvas, sun, sunDir, water, uni, cells, fire, smoke, shipLayer, markLayer, deco, flash, labels, mobile, prMax, envTex,
    ships: [new Map(), new Map()], proto: new Map(), emitters: [[], []], floats: [[], []], sailing: [], rip: 0, t: 0, last: performance.now(), shake: 0, o: [null, null], kind: null,
    pose: null, anim: null, safe: opts.safe || (() => ({ x: 0, y: 0, w: innerWidth, h: innerHeight })) };
  addEventListener('resize', () => fit()); fit();
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel']) addEventListener(ev, () => { V.input = performance.now(); }, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { V.last = performance.now(); loop(); } });
  loop();
  return V;
}
function newCells() { const d = new Uint8Array(N * N * 4), tx = new T.DataTexture(d, N, N, T.RGBAFormat); tx.needsUpdate = true; tx.magFilter = tx.minFilter = T.NearestFilter; return { d, tx }; }
// the coordinates (A–, 1–) round a zone: one flat textured plane per zone (one draw call)
function makeLabel(z, scene) { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'), u = 1024 / (N + 2), col = z ? '#f0a58c' : '#e7cd8f';
  g.font = `600 ${Math.round(u * .55)}px 'Rajdhani','Cormorant Garamond',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8; g.fillStyle = col;
  for (let i = 0; i < N; i++) { g.fillText('ABCDEFGHIJKLMNOP'[i], (1 + i + .5) * u, .55 * u); g.fillText(String(i + 1), .5 * u, (1 + i + .5) * u); }
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
  const m = new T.Mesh(new T.PlaneGeometry(N + 2, N + 2), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(ZC[z][0], .25, ZC[z][1]); m.renderOrder = 8; scene.add(m); return m; }
// 大艦隊: the zones grow to 14×14 (and back) — cells, coordinates, zone centres, the camera's fits; the fleets are dropped (setZone redraws them)
function setSize(n) {
  if (!V || n === N) return; N = n; H = n / 2; ZC[0][1] = H + 2; ZC[1][1] = -(H + 2); V.uni.uZn.value.set(H, H + 2);
  for (const c of V.cells) c.tx.dispose(); V.cells = [0, 1].map(newCells); V.uni.uCellsA.value = V.cells[0].tx; V.uni.uCellsB.value = V.cells[1].tx;
  for (const L of V.labels) { V.scene.remove(L); L.material.map.dispose(); L.material.dispose(); L.geometry.dispose(); } V.labels = [0, 1].map(z => makeLabel(z, V.scene)); labelVis();
  for (let z = 0; z < 2; z++) { for (const s of V.ships[z].values()) V.shipLayer.remove(s.g); V.ships[z].clear(); V.o[z] = null; }
  V.poses = null; V.uv = { s: 1, x: 0, z: 0 };
}
function rippleNormals() {
  const n = 128, h = new Float32Array(n * n), d = new Uint8Array(n * n * 4), W = [];
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, f = 2 + Math.floor(Math.random() * 9); W.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), Math.random() * 6.283, 1 / Math.sqrt(f)]); }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0; for (const [fx, fy, ph, am] of W) v += am * Math.sin((fx * x + fy * y) / n * 6.283 + ph); h[y * n + x] = v; }
  let mx = 0; const sl = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const sx = h[y * n + (x + 1) % n] - h[y * n + (x + n - 1) % n], sy = h[((y + 1) % n) * n + x] - h[((y + n - 1) % n) * n + x]; sl.push(sx, sy); mx = Math.max(mx, Math.abs(sx), Math.abs(sy)); }
  for (let i = 0; i < n * n; i++) { d[i * 4] = 128 + sl[i * 2] / mx * 127; d[i * 4 + 1] = 128 + sl[i * 2 + 1] / mx * 127; d[i * 4 + 2] = 255; d[i * 4 + 3] = 255; }
  const t = new T.DataTexture(d, n, n, T.RGBAFormat); t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
function makeWater(uni, mobile, V0) {
  const rings = mobile ? 100 : 140, segs = mobile ? 128 : 200, pos = [], idx = [];
  pos.push(0, 0, 0); for (let i = 1; i <= rings; i++) { const r = .1 * (Math.pow(1.056, i) - 1) / .056; for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(idx);
  // the sea's own light: the evening sky mirrored by Fresnel, the sun's glitter, a deep body colour lifted on the crests —
  // no physically based light loop (the sea is most of every frame, so it gets the cheapest shader that still looks right)
  const m = new T.ShaderMaterial({ uniforms: Object.assign({ uSunC: { value: new T.Color(0xffd2a0) }, uFlash: { value: new T.Vector4(0, 0, 0, 0) } }, uni, { uSun: { value: V0.sunDir } }),
    vertexShader: GLSL_WAVES + `
      uniform float uTime; varying vec3 vWp; varying float vH; varying vec3 vN;
      uniform vec2 uZn; float calm(vec2 p) { vec2 a = max(abs(p - vec2(0., uZn.y)) - uZn.x, 0.), b = max(abs(p - vec2(0., -uZn.y)) - uZn.x, 0.); return .4 + .6 * min(1., min(length(a), length(b)) / 4.); }
      void main() { vec3 tg = vec3(1., 0., 0.), bn = vec3(0., 0., 1.); vec3 gd = gerst(position.xz, uTime, tg, bn);
        float fall = 1. - smoothstep(80., 260., length(position.xz)), k = fall * calm(position.xz); gd *= k; vN = normalize(mix(vec3(0., 1., 0.), normalize(cross(bn, tg)), k));
        vec3 w = position + gd; vWp = w; vH = gd.y; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `
            uniform float uTime; uniform sampler2D uCellsA, uCellsB; uniform vec4 uAim; uniform vec4 uRip[10]; uniform vec4 uSweep; uniform vec4 uSweepBox; uniform vec2 uFog; uniform vec2 uGrid; uniform float uFocus; uniform vec3 uCam; uniform vec4 uHulls[16]; uniform int uNH; uniform sampler2D uNrm; uniform vec2 uZn;
      varying vec3 vWp; varying float vH;` + GLSL_NOISE + `
      float box(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
      vec3 gridEm = vec3(0.); float foamAdd = 0.; vec3 tintAdd = vec3(0.); float darkAdd = 0.;
      uniform vec3 uSun, uSunC; uniform vec4 uFlash; varying vec3 vN;
      vec3 skyLite(vec3 d) { float h = max(d.y, 0.), sd = max(dot(d, uSun), 0.);
        vec3 c = mix(vec3(.95, .64, .38), vec3(.16, .24, .38), smoothstep(0., .22, h)); c = mix(c, vec3(.03, .06, .13), smoothstep(.2, .85, h));
        return c + vec3(1., .5, .22) * pow(sd, 5.) * .6 * (1. - smoothstep(0., .5, h)) + vec3(1.6, 1.1, .7) * pow(sd, 90.) * 1.5; }
      void main() {
        vec4 diffuseColor = vec4(.03, .17, .22, 1.);
        
        vec2 p = vWp.xz; float dist = length(p - uCam.xz);
        float crest = smoothstep(.1, .2, vH + (vn(p * 3.1 + uTime * .2) - .5) * .06);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.05, .3, .33), smoothstep(-.1, .14, vH) * .55);
        float fo = crest * smoothstep(.45, .8, vn(p * vec2(9., 4.) - uTime * .3)) * .55;
        for (int i = 0; i < 10; i++) { vec4 r = uRip[i]; float age = uTime - r.z; if (age < 0. || age > 2.4) continue; float d = length(p - r.xy), rad = (1. - exp(-age * 1.6)) * .75 * r.w;
          fo += (1. - smoothstep(0., .05 + age * .03, abs(d - rad))) * pow(1. - age / 2.4, 2.) * .55 * r.w + (1. - smoothstep(0., .3 * r.w, d)) * max(0., 1. - age * 1.2) * .9; }
        for (int i = 0; i < 16; i++) { if (i >= uNH) break; vec4 hh = uHulls[i]; vec2 q = p - hh.xy; if (hh.z < 0.) q = vec2(-q.y, q.x); float hl = abs(hh.z), hb = abs(hh.w); bool mv = hh.w < 0.;
          if (abs(q.y) > hb + .5 || q.x > hl + .5 || q.x < -hl - (mv ? 14. : .5)) continue;   // (most of the sea is far from every hull: skip it cheaply)
          float t = clamp(q.x / hl, -1., 1.), w = hb * sqrt(max(0., 1. - pow(max(0., t - .35) / .65, 2.))) * (t < -.85 ? .8 : 1.); float d = length(vec2(max(abs(q.x) - hl, 0.), max(abs(q.y) - w, 0.)));
          darkAdd += (1. - smoothstep(0., .22, d)) * .3;
          { vec2 q2 = q - (hh.z < 0. ? vec2(-.26, .2) : vec2(.2, .26)); float d2 = length(vec2(max(abs(q2.x) - hl, 0.), max(abs(q2.y) - w * 1.1, 0.))); darkAdd += (1. - smoothstep(0., .12, d2)) * .3 * step(.0, d); }
          if (d < .09) fo += (1. - smoothstep(.0, .045 + .03 * vn(p * 18. + uTime), d)) * smoothstep(.0, .012, d) * (.3 + .3 * vn(p * 25. - uTime * 2.)) * (.6 + .4 * smoothstep(.2, 1., t));
          if (mv) { float bx = -q.x - hl; float spread = .05 + bx * .12; if (bx > 0. && abs(q.y) < spread) fo += (1. - smoothstep(0., spread, abs(q.y))) * exp(-bx * .35) * (.5 + .5 * vn(p * 14. - uTime * 3.)) * .9; } }
        for (int zz = 0; zz < 2; zz++) {
          vec2 zc = zz == 0 ? vec2(0., uZn.y) : vec2(0., -uZn.y); vec2 pl = p - zc; float ga = zz == 0 ? uGrid.x : uGrid.y; if (ga < .01 || max(abs(pl.x), abs(pl.y)) > uZn.x + .6) continue;
          vec3 gc = zz == 0 ? vec3(.85, .68, .4) : vec3(.95, .5, .38);
          bool inB = abs(pl.x) < uZn.x && abs(pl.y) < uZn.x;
          if (inB) {
            vec2 cp = pl + uZn.x; ivec2 ci = ivec2(floor(cp)); vec2 f = fract(cp) - .5; vec4 cd = zz == 0 ? texelFetch(uCellsA, ci, 0) : texelFetch(uCellsB, ci, 0);
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
          vec2 g = abs(fract(pl + .5) - .5), fw = fwidth(pl) * 1.1; float ln = 1. - min(smoothstep(0., fw.x * 1.5, g.x), smoothstep(0., fw.y * 1.5, g.y));
          float rim = abs(box(pl, vec2(uZn.x), .0)), inside = 1. - smoothstep(-.01, .01, box(pl, vec2(uZn.x), 0.));
          float corner = (1. - smoothstep(.0, .03, rim)) * step(4.2, max(abs(pl.x), abs(pl.y))) * step(min(abs(pl.x), abs(pl.y)), 5.04) * step(3.9, min(abs(pl.x), abs(pl.y)));   // (brighter corner brackets)
          float focus = zz == int(uFocus + .5) ? 1. : .55;
          gridEm += gc * ga * focus * (ln * inside * .2 + (1. - smoothstep(.012, .04, rim)) * .7 + corner * 1.4 + (1. - smoothstep(.04, .5, rim)) * .08 * inside);
          tintAdd += vec3(.02, .05, .06) * inside * ga;
          if (zz == 1 && uFog.y > 0.) { float m = smoothstep(.35, .85, vn(pl * .7 + vec2(uTime * .25, uTime * .1)) * .6 + vn(pl * 1.9 - uTime * .2) * .4); tintAdd += vec3(.3, .32, .34) * uFog.y * m * inside * .7; }
        }
        if (uAim.z > .5) { vec2 a = p - uAim.xy; float b = abs(box(a, vec2(.45), .12)); gridEm += vec3(1., .9, .6) * (1. - smoothstep(.015, .035, b)) * (1.5 + .5 * sin(uTime * 8.)); float cr = min(abs(a.x), abs(a.y)); gridEm += vec3(1., .9, .6) * (1. - smoothstep(0., .015, cr)) * step(.12, max(abs(a.x), abs(a.y))) * step(max(abs(a.x), abs(a.y)), .3) * 1.2; }
        if (uSweep.z > -50.) { float age = uTime - uSweep.z; if (age >= 0. && age < 1.4) { vec2 q = p - uSweepBox.xy; if (abs(q.x) < uSweepBox.z && abs(q.y) < uSweepBox.w) { float d = length(p - uSweep.xy), rr = age * uSweep.w; gridEm += vec3(.35, .9, 1.) * ((1. - smoothstep(0., .08, abs(d - rr))) * 1.6 + .25) * (1. - age / 1.4); } } }
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.85, .9, .9), clamp(fo, 0., 1.) * .85);
        diffuseColor.rgb = diffuseColor.rgb * (1. - darkAdd) + tintAdd;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.04, .08, .11), smoothstep(40., 220., dist) * .35);

        vec2 n1 = texture2D(uNrm, p * .23 + uTime * vec2(.021, .013)).xy * 2. - 1., n2 = texture2D(uNrm, p * .51 - uTime * vec2(.017, .026)).xy * 2. - 1.;
        vec3 n = normalize(vN + vec3(n1.x + n2.x * .6, 0., n1.y + n2.y * .6) * .2), v = normalize(uCam - vWp), r = reflect(-v, n); r.y = abs(r.y);
        float foam = clamp(fo, 0., 1.), nv = max(dot(n, v), 0.), fr = .02 + .98 * pow(1. - nv, 5.);
        float sunL = max(dot(n, uSun), 0.);
        vec3 lit = diffuseColor.rgb * (vec3(.36, .42, .5) * (.55 + .45 * n.y) + uSunC * sunL * .75) * mix(.55, 1.2, foam);
        vec3 col = mix(lit, skyLite(r) * .9, fr * (1. - foam * .9));
        col += uSunC * (pow(max(dot(r, uSun), 0.), 420.) * 22. + pow(max(dot(r, uSun), 0.), 40.) * .5) * (1. - foam);
        if (uFlash.w > 0.) { float d = length(vWp - uFlash.xyz); col += vec3(1., .55, .2) * uFlash.w * .06 / (1. + d * d * 2.); }
        col += gridEm;
        col = mix(col, vec3(.06, .09, .13), smoothstep(60., 300., length(p - uCam.xz)) * .55);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const w = new T.Mesh(g, m); w.receiveShadow = false; w.frustumCulled = false; return w;
}

// ---------- the camera director ----------
// poses: 'z0' / 'z1' (a zone framed into the screen's free area), 'wide' (both zones from astern), 'title' (low over the water), 'result'
function fit() {
  if (!V) return; const w = innerWidth, h = innerHeight; V.R.setSize(w, h, false); V.cam.aspect = w / h; V.cam.updateProjectionMatrix();
  for (const P of [V.fire, V.smoke]) P.pts.material.uniforms.uScale.value = h / (2 * Math.tan(V.cam.fov * Math.PI / 360));
  V.poses = null; if (V.pose && !V.anim) { const p = pose(V.pose); applyPose(p); }
}
function poseFor(name) {
  const cam = V.cam, w = innerWidth, h = innerHeight, sf = V.safe();
  if (name === 'z0' || name === 'z1') {
    const z = name === 'z1' ? 1 : 0, zc = ZC[z], pitch = (w / h < .8 ? 62 : 58) * Math.PI / 180, fov = 24;
    // the free area (between the HUD panels) as a window into the full view: shift the principal point there and fit the zone inside it
    const sx = sf.x + sf.w / 2, sy = sf.y + sf.h / 2, ax = sf.w / w, ay = sf.h / h;
    const pts = [[-H - .9, -H - .9], [H + .55, -H - .9], [-H - .9, H + .55], [H + .55, H + .55]].map(([x, zz]) => new T.Vector3(zc[0] + x, 0, zc[1] + zz));
    const save = { fov: cam.fov }; cam.fov = fov; cam.clearViewOffset(); cam.updateProjectionMatrix();
    let tz = 0, best = 30;
    const place = (d, oz) => { cam.position.set(zc[0] - .18, Math.sin(pitch) * d, zc[1] + oz + Math.cos(pitch) * d); cam.lookAt(zc[0] - .18, 0, zc[1] + oz); cam.updateMatrixWorld(); };
    for (let it = 0; it < 4; it++) { let lo = 4, hi = 120; for (let k = 0; k < 32; k++) { const d = (lo + hi) / 2; place(d, tz); let m = 0; for (const p of pts) { const q = p.clone().project(cam); m = Math.max(m, Math.abs(q.x) / ax, Math.abs(q.y) / ay); } if (m > .96) lo = d; else hi = d; } best = hi; place(best, tz); const ys = pts.map(p => p.clone().project(cam).y); tz -= (Math.max(...ys) + Math.min(...ys)) / 2 / ay * 3; }
    place(best, tz); cam.fov = save.fov; cam.updateProjectionMatrix();
    return { p: cam.position.clone(), t: new T.Vector3(zc[0] - .18, 0, zc[1] + tz), fov, off: [w / 2 - sx, h / 2 - sy] };
  }
  if (name === 'wide') return { p: new T.Vector3(-9, 9.5, 24), t: new T.Vector3(0, 0, -2), fov: 34, off: [0, 0] };
  if (name === 'result') return { p: new T.Vector3(13, 3.2, 14), t: new T.Vector3(0, .5, 0), fov: 32, off: [0, 0] };
  /* title */ return { p: new T.Vector3(-7.5, 1.35, 20.5), t: new T.Vector3(4, .9, 2), fov: 36, off: [0, 0] };
}
function pose(name) { V.poses = V.poses || {}; if (!V.poses[name]) V.poses[name] = poseFor(name); return V.poses[name]; }
// (2026-11-23 the user) phones: pinch to zoom and slide to move the board — a user view on top of the zone's pose (V.uv: scale, pan x/z)
function uvLim(u) { const m = (H + .5) * (1 - 1 / u.s) + .6; u.x = Math.max(-m, Math.min(m, u.x)); u.z = Math.max(-m, Math.min(m, u.z)); }
function userView(P) { const u = V.uv; if (!u || (u.s === 1 && !u.x && !u.z) || !(V.pose === 'z0' || V.pose === 'z1')) return P;
  const t = P.t.clone().add(new T.Vector3(u.x, 0, u.z)), p = P.p.clone().sub(P.t).multiplyScalar(1 / u.s).add(t); return { p, t, fov: P.fov, off: P.off }; }
function zoomBy(f) { const u = V.uv || (V.uv = { s: 1, x: 0, z: 0 }); u.s = Math.max(1, Math.min(3.2, u.s * f)); uvLim(u); }
function panBy(dx, dy) { if (!V.cur) return; const u = V.uv || (V.uv = { s: 1, x: 0, z: 0 }), d = V.cur.p.distanceTo(V.cur.t) / u.s, k = 2 * d * Math.tan(V.cur.fov * Math.PI / 360) / innerHeight;
  const pitch = Math.asin(Math.min(1, (V.cur.p.y - V.cur.t.y) / Math.max(1e-3, V.cur.p.distanceTo(V.cur.t)))); u.x -= dx * k; u.z -= dy * k / Math.max(.5, Math.sin(pitch)); uvLim(u); }
function resetView() { V && (V.uv = { s: 1, x: 0, z: 0 }); }
function applyPose(P) { P = userView(P); const c = V.cam; c.fov = P.fov; c.position.copy(P.p); c.lookAt(P.t); c.setViewOffset(innerWidth, innerHeight, P.off[0], P.off[1], innerWidth, innerHeight); c.updateProjectionMatrix(); V.tgt = P.t.clone(); }
// fly the camera to a pose: a smooth arc (rises in the middle when it crosses between the zones)
function show(name, dur) {
  if (!V) return Promise.resolve(); const to = pose(name), was = V.pose; if (V.pose !== name) resetView(); V.pose = name;
  if (!dur || !V.cur) { V.anim = null; V.cur = { p: to.p.clone(), t: to.t.clone(), fov: to.fov, off: to.off.slice() }; applyPose(V.cur); return Promise.resolve(); }
  const from = { p: V.cur.p.clone(), t: V.cur.t.clone(), fov: V.cur.fov, off: V.cur.off.slice() }, lift = Math.min(4, from.p.distanceTo(to.p) * .18);
  return new Promise(res => { V.anim = { from, to, t0: performance.now(), dur, lift, res, e: 0, fromTitle: was === 'title' }; });
}
function stepCamera(now) {
  const a = V.anim; if (a) {
    const u = Math.min(1, (now - a.t0) / a.dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; a.e = e;
    V.cur.p.lerpVectors(a.from.p, a.to.p, e); V.cur.p.y += Math.sin(Math.PI * e) * a.lift; V.cur.t.lerpVectors(a.from.t, a.to.t, e); V.cur.fov = a.from.fov + (a.to.fov - a.from.fov) * e; V.cur.off = [a.from.off[0] + (a.to.off[0] - a.from.off[0]) * e, a.from.off[1] + (a.to.off[1] - a.from.off[1]) * e];
    if (u >= 1) { V.anim = null; const r = a.res; setTimeout(r, 0); }
  } else if (V.pose && V.cur) { const P = pose(V.pose); V.cur.p.copy(P.p); V.cur.t.copy(P.t); V.cur.fov = P.fov; V.cur.off = P.off.slice(); }
  if (!V.cur) return;
  applyPose(V.cur);
  // the title's slow drift fades in with the flight to the title (and out when leaving it), so the end of a flight never jumps (2026-11-23 the user)
  const A = V.anim, sw = V.pose === 'title' ? (A ? A.e : 1) : A && A.fromTitle ? 1 - A.e : 0;
  if (sw > 0) { const s = Math.sin(V.t * .12) * sw, c = Math.cos(V.t * .09) * sw; V.cam.position.x += s * .9; V.cam.position.y += c * .12; V.cam.lookAt(V.tgt.x + s * .6, V.tgt.y, V.tgt.z); }
  if (V.shake > 0) { const s = V.shake * .08; V.cam.position.x += (Math.random() - .5) * s; V.cam.position.y += (Math.random() - .5) * s; }
  // the sun's shadow box follows whatever we look at
  V.sun.target.position.set(V.cur.t.x, 0, V.cur.t.z); V.sun.position.copy(V.sunDir).multiplyScalar(34).add(V.sun.target.position);
}

// ---------- the loop ----------
function loop() {
  if (!V || V.raf) return;
  const step = () => {
    V.raf = 0; if (document.hidden) return;
    if (V.paused) return;   // (an opaque sheet covers the whole sea: draw nothing until it closes)
    // frame pacing (battery): full rate only while something moves — a camera flight, a shot, a shake, a drag; otherwise
    // phones draw 30 fps (20 after a while without a touch), desktops 60 (30 when idle), and half that under a sheet
    const now = performance.now(), busy = V.anim || V.shake > 0 || now < (V.burst || 0) || now - (V.input || 0) < 1500;
    let fps = busy ? 60 : V.mobile ? (now - (V.input || 0) > 20000 ? 20 : 30) : (now - (V.input || 0) > 30000 ? 30 : 60);
    if (V.throttle) fps = Math.min(fps, 30); V.cap = fps;
    if (fps < 60 && now - (V.drawn || 0) < 1000 / fps - 4) { loop(); return; }
    V.drawn = now;
    const dt = Math.min(.05, (now - V.last) / 1000); V.last = now; V.t += dt; V.uni.uTime.value = V.t;
    V.shake = Math.max(0, V.shake - dt * 2.2);
    stepCamera(now);
    for (let z = 0; z < 2; z++) for (const s of V.ships[z].values()) rideShip(s, dt);
    for (const s of V.sailing) { s.x += s.v * dt; if (s.x > s.x1) s.x = s.x0; s.g.position.x = s.x; s.g.position.z = s.z; rideShip(s, dt); }
    for (let z = 0; z < 2; z++) { for (const f of V.floats[z]) { f.o.position.y = waveAt(f.x, f.z, V.t) * .85 + (f.dy || 0); if (f.bob) f.o.rotation.z = Math.sin(V.t * 1.7 + f.x) * .12; } for (const e of V.emitters[z]) { e.acc += dt; while (e.acc > e.every) { e.acc -= e.every; e.fn(); } } }
    stepParticles(V.fire, dt); stepParticles(V.smoke, dt);
    if (V.flash.intensity > 0) V.flash.intensity = Math.max(0, V.flash.intensity - dt * 60); V.water.material.uniforms.uFlash.value.set(V.flash.position.x, V.flash.position.y, V.flash.position.z, V.flash.intensity);
    updateHulls();
    if (V.onFrame) V.onFrame(dt);
    const r0 = performance.now(); V.R.render(V.scene, V.cam); V.cpu = (V.cpu || 0) * .9 + (performance.now() - r0) * .1; V.frameMs = (V.frameMs || 16) * .9 + dt * 1000 * .1;
    if (DBG.on) dbgTick(now);
    // keep the frame rate: every second, step the pixel ratio down when frames run long (under ~50 fps) and back up after a calm spell
    V.fc = (V.fc || 0) + 1; if (V.cap >= 60) { V.acc = (V.acc || 0) + dt; V.n = (V.n || 0) + 1; }
    if (V.acc > 1) { const ms = V.acc / V.n * 1000, pr = V.R.getPixelRatio(); V.acc = V.n = 0;
      if (ms > 20.5 && pr > .7 && !V.throttle) { V.R.setPixelRatio(Math.max(.7, pr - .15)); V.good = 0; fit(); }
      else if (ms < 17.8 && pr < V.prMax && ++V.good >= 4) { V.R.setPixelRatio(Math.min(V.prMax, pr + .1)); V.good = 0; fit(); } }
    loop();
  };
  V.raf = requestAnimationFrame(step);
}
function rideShip(s, dt) {
  const g = s.g, x = g.position.x, z = g.position.z, L = s.len * .45;
  const h0 = waveAt(x, z, V.t), hb = waveAt(x + s.ax * L, z + s.az * L, V.t), hs = waveAt(x - s.ax * L, z - s.az * L, V.t), hp = waveAt(x - s.az * .25, z + s.ax * .25, V.t), hq = waveAt(x + s.az * .25, z - s.ax * .25, V.t);
  const sink = s.sink || 0; g.position.y = h0 * .85 - sink * .16; g.rotation.set(0, 0, 0); g.rotateY(s.ry); g.rotateZ(Math.atan2(hb - hs, 2 * L) * .8 + sink * .16 * s.tiltD); g.rotateX(Math.atan2(hp - hq, .5) * .55 + sink * .28 * s.rollD);
  if (s.spin) for (const sp of s.spin) sp.g.rotation.y += sp.w * dt;
  if (s.smokeT != null && (s.smokeT -= dt) < 0) { s.smokeT = .1 + Math.random() * .08; for (const f of s.funnels) { const v = new T.Vector3(f.x, f.y, f.z); g.localToWorld(v); emit(V.smoke, { p: [v.x, v.y, v.z], v: [.05 + Math.random() * .04 - (s.v || 0) * .5, .18, .02], life: 2.6, size0: .08, size1: .42, c0: [.32, .31, .3, .2], c1: [.5, .5, .5, 0], drag: .01, g: -.02 }); } }
  if (s.v && (s.wakeT = (s.wakeT || 0) - dt) < 0) { s.wakeT = .05; const bx = x + L * 1.02; emit(V.smoke, { p: [bx, h0 * .85 + .03, z + (Math.random() - .5) * .12], v: [s.v * .6, .04, (Math.random() - .5) * .35], life: 1.2, size0: .1, size1: .32, c0: [.92, .96, .98, .55], c1: [.9, .95, .97, 0] }); }   // (the bow wave)
}
function updateHulls() {
  let n = 0; const H = V.uni.uHulls.value;
  const add = (s, moving) => { if (n >= 16 || s.look === 'ghost' || s.look === 'bad' || s.hidden) return; const B = (s.g.userData.B || .3) / 2 + .015, L = s.len * .45; H[n++].set(s.g.position.x, s.g.position.z, s.ax ? L : -L, (s.look === 'sunk' ? B * .6 : B) * (moving ? -1 : 1)); };
  for (let z = 0; z < 2; z++) for (const s of V.ships[z].values()) add(s, false);
  for (const s of V.sailing) add(s, true);
  V.uni.uNH.value = n;
}

// ---------- ships ----------
function proto(k, len, key) { const id = key + '|' + len; if (!V.proto.has(id)) V.proto.set(id, SeaShips.build(T, k, len, key)); return V.proto.get(id); }
const variants = new Map();
function variant(mat, kind) {
  const id = mat.uuid + kind; if (variants.has(id)) return variants.get(id);
  const m = mat.clone();
  if (kind === 'sunk') { m.color = m.color.clone().multiplyScalar(.28); m.roughness = 1; m.metalness = .1; if (m.emissive) m.emissiveIntensity = 0; }
  if (kind === 'ghost' || kind === 'bad') { m.transparent = true; m.opacity = kind === 'bad' ? .55 : .5; m.depthWrite = false; if (kind === 'bad') { m.emissive = new T.Color(0xff2a1a); m.emissiveIntensity = .7; } }
  if (kind === 'pick') { m.emissive = new T.Color(0xd8f0ff); m.emissiveIntensity = .55; }
  variants.set(id, m); return m;
}
function setLook(s, kind) { if (s.look === kind) return; s.look = kind; s.g.traverse(o => { if (!o.isMesh) return; const base = o.userData.base || (o.userData.base = o.material); o.material = kind === 'own' ? base : variant(base, kind); o.castShadow = kind === 'own' || kind === 'sunk' || kind === 'pick'; o.receiveShadow = true; }); }
function spawn(k, len) {
  const key = SeaEngine.TYPES[k] ? SeaEngine.TYPES[k].k : 'destroyer', p = proto(k, len, key), g = p.clone(), fx = p.userData.fx;
  const s = { g, len, funnels: fx.funnels, spin: [], sink: 0, tiltD: Math.random() < .5 ? -1 : 1, rollD: Math.random() < .5 ? -1 : 1, ax: 1, az: 0, ry: 0 };
  const pa = [], ca = []; p.traverse(o => pa.push(o)); g.traverse(o => ca.push(o)); pa.forEach((o, n) => { const q = fx.spin.find(x => x.g === o); if (q) s.spin.push({ g: ca[n], w: q.w * (.8 + Math.random() * .4) }); });
  if (fx.funnels.length) s.smokeT = Math.random();
  return s;
}
// o: { ships: [{r,c,len,h,t}], show: i => 'own' | 'sunk' | 'ghost' | 'bad' | 'pick' | '' , shots, scans, mines, heat, best, glow, last, fogged }
function setZone(z, o) {
  if (!V) return; V.o[z] = o;
  const want = new Map();
  (o.ships || []).forEach((sh, i) => { if (!sh) return; const show = o.show ? o.show(i) : 'own'; if (!show) return; const k = sh.t != null ? sh.t : i; want.set(i + ':' + k + ':' + sh.len, { sh, show, k }); });
  const M = V.ships[z];
  for (const [id, s] of M) if (!want.has(id)) { V.shipLayer.remove(s.g); M.delete(id); }
  for (const [id, w] of want) {
    let s = M.get(id); if (!s) { s = spawn(w.k, w.sh.len); V.shipLayer.add(s.g); M.set(id, s); }
    const sh = w.sh, len = sh.len, [x0, z0] = cellXZ(z, sh.r * N + sh.c);
    s.g.position.x = sh.h ? x0 - .5 + len / 2 : x0; s.g.position.z = sh.h ? z0 : z0 - .5 + len / 2; s.ry = sh.h ? 0 : Math.PI / 2; s.ax = sh.h ? 1 : 0; s.az = sh.h ? 0 : -1; s.len = len;
    const look = /bad/.test(w.show) ? 'bad' : /ghost/.test(w.show) ? 'ghost' : w.show === 'sunk' ? 'sunk' : w.show === 'pick' ? 'pick' : 'own';
    if (look === 'sunk' && s.look !== 'sunk') { if (s.look) { const s0 = performance.now(); const go = () => { s.sink = Math.min(1, (performance.now() - s0) / 1800); if (s.sink < 1) requestAnimationFrame(go); }; go(); } else s.sink = 1; }
    if (look !== 'sunk') s.sink = 0;
    setLook(s, look); if (look === 'sunk') s.smokeT = null; else if (s.funnels.length && s.smokeT == null) s.smokeT = Math.random();
  }
  marks(z, o);
}
function scanCells(sc) {
  if (sc.cells) return sc.cells; if (sc.list) return sc.list;
  if (sc.plus) { const r = sc.at / N | 0, c = sc.at % N, out = [sc.at]; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc); } return out; }
  const big = !!sc.big, r = big ? Math.max(2, Math.min(N - 3, sc.at / N | 0)) : sc.at / N | 0, c = big ? Math.max(2, Math.min(N - 3, sc.at % N)) : sc.at % N, e = big ? 2 : 1;
  const r0 = sc.row ? r : sc.col ? 0 : Math.max(0, r - e), c0 = sc.row ? 0 : sc.col ? c : Math.max(0, c - e), r1 = sc.row ? r : sc.col ? N - 1 : Math.min(N - 1, r + e), c1 = sc.row ? N - 1 : sc.col ? c : Math.min(N - 1, c + e);
  const out = []; for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) out.push(rr * N + cc); return out;
}
const SH = {};
function shared() { if (SH.ok) return SH; SH.ok = 1; SH.dark = new T.MeshStandardMaterial({ color: 0x1d1c1b, roughness: .9 }); SH.wood = new T.MeshStandardMaterial({ color: 0x4a3324, roughness: .9 }); SH.metal = new T.MeshStandardMaterial({ color: 0x2b2f33, roughness: .45, metalness: .7 }); SH.glint = new T.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }); return SH; }
function debris() { shared(); const g = new T.Group(); for (let i = 0; i < 5; i++) { const b = new T.Mesh(new T.BoxGeometry(.08 + Math.random() * .12, .02, .03 + Math.random() * .05), i % 2 ? SH.wood : SH.dark); b.position.set((Math.random() - .5) * .45, .01, (Math.random() - .5) * .45); b.rotation.y = Math.random() * 3; g.add(b); } return g; }
function glint() { shared(); const g = new T.Group(); const r = new T.Mesh(new T.TorusGeometry(.18, .012, 6, 28), SH.glint); r.rotation.x = Math.PI / 2; g.add(r); const p = new T.Mesh(new T.OctahedronGeometry(.07), SH.metal); p.position.y = .05; g.add(p); return g; }
function mine() { shared(); const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(.13, 16, 12), SH.metal); b.position.y = .05; b.castShadow = true; g.add(b); for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [.7, .7, 0], [-.7, .7, 0], [0, .7, .7], [0, .7, -.7]]) { const h = new T.Mesh(new T.CylinderGeometry(.012, .018, .07, 6), SH.metal); h.position.set(d[0] * .14, .05 + d[1] * .14, d[2] * .14); h.lookAt(d[0] * 2, .05 + d[1] * 2, d[2] * 2); h.rotateX(Math.PI / 2); g.add(h); } return g; }
function marks(z, o) {
  const D = V.cells[z].d; D.fill(0);
  const shipAt = new Int16Array(N * N).fill(-1); (o.ships || []).forEach((s, i) => { if (!s) return; const show = o.show ? o.show(i) : 'own'; if (!show) return; for (let k = 0; k < s.len; k++) shipAt[s.h ? s.r * N + s.c + k : (s.r + k) * N + s.c] = i; });
  if (o.shots) for (let i = 0; i < N * N; i++) { const v = o.shots[i]; if (v) D[i * 4] = v === 2 && shipAt[i] >= 0 ? 0 : v; }
  if (o.heat) { let mx = 0, mn = 1e9; for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; mx = Math.max(mx, o.heat[i]); mn = Math.min(mn, o.heat[i]); } mn *= .85; if (mx > mn) for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; D[i * 4 + 1] = Math.round(255 * Math.pow(Math.max(0, (o.heat[i] - mn) / (mx - mn)), 1.6)); } }
  if (o.glow) for (const c of o.glow) D[c * 4 + 2] |= 1;
  if (o.last != null && o.last >= 0) D[o.last * 4 + 2] |= 2;
  if (o.best != null && o.best >= 0) D[o.best * 4 + 2] |= 4;
  const scans = o.scans ? o.scans.filter(sc => !sc.one).slice(-3) : [];
  scans.forEach((sc, n) => { for (const c of scanCells(sc)) D[c * 4 + 2] |= 8 | (n === scans.length - 1 ? 16 : 0); });
  V.cells[z].tx.needsUpdate = true;
  V.uni.uFog.value.setComponent(z, o.fogged ? 1 : 0);
  const L = V.markLayer[z]; for (const c of L.children.slice()) L.remove(c);
  V.floats[z] = []; V.emitters[z] = [];
  const add = (obj, cell, dy, bob) => { const [x, zz] = cellXZ(z, cell); obj.position.set(x, 0, zz); L.add(obj); V.floats[z].push({ o: obj, x, z: zz, dy: dy || 0, bob }); return obj; };
  if (o.shots) for (let i = 0; i < N * N; i++) {
    const v = o.shots[i]; if (!v) continue; const [x, zz] = cellXZ(z, i);
    if (v === 2) { const own = shipAt[i] >= 0, sunk = own && o.show && o.show(shipAt[i]) === 'sunk'; if (!own) add(debris(), i, 0, true); const rate = sunk ? .16 : .045;
      V.emitters[z].push({ acc: Math.random() * rate, every: rate, fn: () => { const y = waveAt(x, zz, V.t) * .85 + (own ? (sunk ? .02 : .12) : .03); if (!sunk) emit(V.fire, { p: [x + (Math.random() - .5) * .25, y, zz + (Math.random() - .5) * .25], v: [(Math.random() - .5) * .05, .3 + Math.random() * .25, (Math.random() - .5) * .05], life: .55 + Math.random() * .3, size0: .22, size1: .05, c0: [1, .55, .18, .9], c1: [.9, .2, .05, 0] });
        emit(V.smoke, { p: [x + (Math.random() - .5) * .2, y + .15, zz + (Math.random() - .5) * .2], v: [.07 + Math.random() * .05, .35 + Math.random() * .2, .03], life: 2.8, size0: .2, size1: 1, c0: [.18, .17, .16, sunk ? .18 : .38], c1: [.38, .37, .37, 0], drag: .012, fadeIn: .3 }); } }); }
    if (v === 3) add(glint(), i, .04, false);
    if (v === 4) { add(sprite('?', .5, { disc: 'rgba(60,66,72,.85)', ring: 'rgba(220,225,230,.9)', color: '#f2f2ee', px: 76 }), i, .45); V.emitters[z].push({ acc: 0, every: .5, fn: () => emit(V.smoke, { p: [x + (Math.random() - .5) * .5, waveAt(x, zz, V.t) + .1, zz + (Math.random() - .5) * .5], v: [.04, .05, 0], life: 3, size0: .4, size1: .8, c0: [.6, .62, .64, .35], c1: [.6, .62, .64, 0], fadeIn: .5 }) }); }
  }
  if (o.scans) for (const sc of o.scans) { if (!sc.one || (o.shots && o.shots[sc.at])) continue; add(sprite(sc.k ? '!' : '×', .46, sc.k ? { disc: 'rgba(232,237,240,.92)', ring: '#ffffff', color: '#0b0f12', px: 80, shadow: false } : { color: '#cfe4ee', px: 90 }), sc.at, .4); }
  scans.forEach((sc, n) => { const cs = scanCells(sc), [x, zz] = cellXZ(z, cs[0]); const s = sprite(String(sc.k), .52, { disc: 'rgba(16,48,64,.9)', ring: n === scans.length - 1 ? '#7fe3ff' : 'rgba(127,227,255,.6)', color: '#e9fbff', px: 70 }); s.position.set(x - .5, .5, zz - .5); L.add(s); V.floats[z].push({ o: s, x: x - .5, z: zz - .5, dy: .5 }); });
  if (o.mines) for (const c of o.mines) add(mine(), c, .02, true);
}
// zone grids: 0..1 visibility of each zone's grid and labels (the title hides them)
function grids(a, b) { V.uni.uGrid.value.set(a, b); labelVis(); }
function focus(z) { V.uni.uFocus.value = z; V.focusZ = z; labelVis(); }
function labelVis() { const g = V.uni.uGrid.value; V.labels[0].visible = g.x > .5 && V.focusZ !== 1; V.labels[1].visible = g.y > .5 && V.focusZ !== 0; }

// ---------- pointer ----------
function hitXZ(e) { const r = V.canvas.getBoundingClientRect(); const v = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); const rc = V._ray || (V._ray = new T.Raycaster()); rc.setFromCamera(v, V.cam); const d = rc.ray.direction, o = rc.ray.origin; if (Math.abs(d.y) < 1e-6) return null; const t = -o.y / d.y; return t > 0 ? { x: o.x + d.x * t, z: o.z + d.z * t } : null; }
function cellAt(z, e) { const p = hitXZ(e); if (!p) return -1; const c = Math.floor(p.x - ZC[z][0] + H), r = Math.floor(p.z - ZC[z][1] + H); return c >= 0 && c < N && r >= 0 && r < N ? r * N + c : -1; }
function pointIn(z, e) { const p = hitXZ(e) || { x: 0, z: 0 }; return { x: p.x - ZC[z][0] + H, y: p.z - ZC[z][1] + H }; }
function aim(z, cell) { if (cell < 0) { V.uni.uAim.value.set(-99, -99, 0, 0); return; } const [x, zz] = cellXZ(z, cell); V.uni.uAim.value.set(x, zz, 1, 0); }
function screenOf(z, cell) { const [x, zz] = cellXZ(z, cell), v = new T.Vector3(x, waveAt(x, zz, V.t) * .85, zz).project(V.cam), r = V.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }

// ---------- effects ----------
const KIND = { bomb: 'air', strafe: 'air', torpedo: 'torp', rtorpedo: 'torp', dtorpedo: 'torp', rocket: 'rocket', guided: 'rocket', barrage: 'rocket', depth: 'depth' };
function kind(sk) { V.kind = sk ? KIND[sk] || null : null; }
function shipUnder(z, cell) { const o = V.o[z]; if (!o || !o.ships) return false; const r = cell / N | 0, c = cell % N; return o.ships.some((s, i) => s && (o.show ? o.show(i) : 'own') && (s.h ? s.r === r && c >= s.c && c < s.c + s.len : s.c === c && r >= s.r && r < s.r + s.len)); }
function ripple(x, z, strength) { V.uni.uRip.value[V.rip++ % 10].set(x, z, V.t, strength); }
// fire at zone z: shells come from the other zone's side (we fire from the near side at theirs, they fire from beyond at ours)
function fx(z, cell, hit, fast) {
  V.burst = performance.now() + 3000;
  if (V.kind === 'torp') return torpedo(z, cell, hit);
  if (V.kind === 'depth') return depthCharge(z, cell, hit);
  const [x, zz] = cellXZ(z, cell), dur = fast ? .5 : .9, air = V.kind === 'air', rk = V.kind === 'rocket';
  const src = ZC[1 - z], from = air ? new T.Vector3(x + (Math.random() - .5) * .6, 10, zz + (z ? 4 : -4)) : new T.Vector3(src[0] + (Math.random() - .5) * 6, .4, src[1] + (Math.random() - .5) * 4);
  const to = new T.Vector3(x, waveAt(x, zz, V.t) * .85 + (hit === true && shipUnder(z, cell) ? .12 : 0), zz), apex = air ? 0 : rk ? 1.2 : (fast ? 2.4 : 3.6);
  // muzzle flash at the firing ship's side
  if (!air) { emit(V.fire, { p: [from.x, from.y + .1, from.z], v: [0, .2, 0], life: .18, size0: 1, size1: .3, c0: [1, .85, .5, 1], c1: [1, .4, .1, 0] }); for (let i = 0; i < 6; i++) emit(V.smoke, { p: [from.x, from.y + .1, from.z], v: [(Math.random() - .5) * .6, .3 + Math.random() * .3, (Math.random() - .5) * .6], life: 1.6, size0: .2, size1: .7, c0: [.6, .58, .55, .45], c1: [.6, .58, .55, 0], drag: .05 }); }
  const t0 = performance.now();
  return new Promise(res => { const tick = () => {
    const u = Math.min(1, (performance.now() - t0) / (dur * 1000)), px = from.x + (to.x - from.x) * u, pz = from.z + (to.z - from.z) * u, py = from.y + (to.y - from.y) * u + 4 * apex * u * (1 - u);
    if (air) emit(V.smoke, { p: [px, py, pz], v: [0, 0, 0], life: .14, size0: .14, size1: .1, c0: [.15, .16, .17, .9], c1: [.15, .16, .17, 0] });
    else { emit(V.fire, { p: [px, py, pz], v: [0, 0, 0], life: rk ? .3 : .22, size0: rk ? .5 : .42, size1: .04, c0: [1, .9, .65, 1], c1: [1, .45, .12, 0] }); emit(V.fire, { p: [px, py, pz], v: [0, 0, 0], life: .05, size0: .7, size1: .5, c0: [1, .95, .8, .8], c1: [1, .7, .3, 0] }); }
    emit(V.smoke, { p: [px, py, pz], v: [0, .02, 0], life: rk ? 1.6 : .5, size0: rk ? .12 : .05, size1: rk ? .5 : .16, c0: [.8, .8, .8, rk ? .45 : .25], c1: [.8, .8, .8, 0] });
    if (u < 1) return requestAnimationFrame(tick); impact(to, hit); res(); }; tick(); });
}
function impact(p, hit) {
  V.burst = performance.now() + 3000;
  const x = p.x, z = p.z;
  if (hit === 'fog') { for (let i = 0; i < 14; i++) emit(V.smoke, { p: [x, p.y + .05, z], v: [(Math.random() - .5) * .8, .2 + Math.random() * .3, (Math.random() - .5) * .8], life: 1.6, size0: .3, size1: 1, c0: [.62, .64, .66, .55], c1: [.62, .64, .66, 0], drag: .05 }); ripple(x, z, .6); return; }
  if (hit) {
    V.flash.position.set(x, p.y + .6, z); V.flash.intensity = 24; V.shake = Math.max(V.shake, .5);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, sp = .4 + Math.random() * 1.1; emit(V.fire, { p: [x, p.y + .08, z], v: [Math.cos(a) * sp * .6, .5 + Math.random() * 1.3, Math.sin(a) * sp * .6], life: .4 + Math.random() * .3, size0: .3 + Math.random() * .2, size1: .06, c0: [1, .62, .26, .75], c1: [.8, .18, .04, 0], drag: .06, ease: .6 }); }
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28; emit(V.fire, { p: [x, p.y + .1, z], v: [Math.cos(a) * (1 + Math.random() * 2), 1.2 + Math.random() * 1.8, Math.sin(a) * (1 + Math.random() * 2)], life: .6 + Math.random() * .4, size0: .06, size1: .02, c0: [1, .9, .6, 1], c1: [1, .5, .1, 0], g: 5 }); }
    for (let i = 0; i < 16; i++) emit(V.smoke, { p: [x + (Math.random() - .5) * .3, p.y + .2, z + (Math.random() - .5) * .3], v: [(Math.random() - .5) * .5, .5 + Math.random() * .6, (Math.random() - .5) * .5], life: 2.4 + Math.random(), size0: .35, size1: 1.4, c0: [.24, .22, .21, .42], c1: [.42, .42, .42, 0], drag: .04, fadeIn: .15 });
    ripple(x, z, 1);
  } else {
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, r = Math.random() * .1, up = 1.6 + Math.random() * 2.2; emit(V.smoke, { p: [x + Math.cos(a) * r, p.y, z + Math.sin(a) * r], v: [Math.cos(a) * (.15 + Math.random() * .35), up, Math.sin(a) * (.15 + Math.random() * .35)], life: 1 + Math.random() * .5, size0: .12 + Math.random() * .12, size1: .3, c0: [.92, .96, .98, .85], c1: [.85, .92, .95, 0], g: 3.2, floor: p.y - .05 }); }
    for (let i = 0; i < 10; i++) emit(V.smoke, { p: [x, p.y + .1, z], v: [(Math.random() - .5) * .4, .3 + Math.random() * .3, (Math.random() - .5) * .4], life: 1.8, size0: .3, size1: .9, c0: [.9, .94, .96, .3], c1: [.9, .94, .96, 0], drag: .03 });
    ripple(x, z, .8);
  }
}
function torpedo(z, cell, hit) {
  const [x, zz] = cellXZ(z, cell), sx = ZC[z][0] + (z ? -H - 1.2 : H + 1.2), dur = .7, t0 = performance.now();
  return new Promise(res => { const tick = () => { const u = Math.min(1, (performance.now() - t0) / (dur * 1000)), px = sx + (x - sx) * u, py = waveAt(px, zz, V.t) * .85;
    for (let k = 0; k < 2; k++) emit(V.smoke, { p: [px + (Math.random() - .5) * .06, py + .01, zz + (Math.random() - .5) * .08], v: [0, .02, (Math.random() - .5) * .05], life: 1.8, size0: .09, size1: .3, c0: [.92, .96, .98, .7], c1: [.9, .95, .97, 0] });
    if (u < 1) return requestAnimationFrame(tick); impact({ x, y: py + (hit === true && shipUnder(z, cell) ? .1 : 0), z: zz }, hit); res(); }; tick(); });
}
function depthCharge(z, cell, hit) {
  const [x, zz] = cellXZ(z, cell); return new Promise(res => setTimeout(() => { const y = waveAt(x, zz, V.t) * .85;
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random() * .35; emit(V.smoke, { p: [x + Math.cos(a) * r, y, zz + Math.sin(a) * r], v: [Math.cos(a) * .4, .9 + Math.random() * 1.2, Math.sin(a) * .4], life: 1.2, size0: .25, size1: .5, c0: [.95, .97, .98, .8], c1: [.9, .95, .97, 0], g: 2.2, floor: y - .05 }); }
    ripple(x, zz, 1.2); if (hit === true) { V.flash.position.set(x, .3, zz); V.flash.intensity = 18; emit(V.fire, { p: [x, y + .1, zz], v: [0, .5, 0], life: .4, size0: .8, size1: .2, c0: [1, .7, .35, .8], c1: [.8, .3, .1, 0] }); }
    res(); }, 260)); }
function sweep(z, area) {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const c of area) { const [x, zz] = cellXZ(z, c); x0 = Math.min(x0, x - .5); z0 = Math.min(z0, zz - .5); x1 = Math.max(x1, x + .5); z1 = Math.max(z1, zz + .5); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rad = Math.hypot(x1 - x0, z1 - z0) / 2; V.uni.uSweepBox.value.set(cx, cz, (x1 - x0) / 2, (z1 - z0) / 2); V.uni.uSweep.value.set(cx, cz, V.t, rad / 1.1);
  return new Promise(res => setTimeout(res, 750));
}
function shake(n) { if (V) V.shake = Math.max(V.shake, n || .8); }
// a column of ships steaming across in the distance (title screen)
function sail(on) {
  for (const s of V.sailing) V.shipLayer.remove(s.g); V.sailing = []; if (!on) return;
  const line = [[15, 5], [1, 4], [30, 4], [0, 5], [2, 3], [4, 2]]; let x = 8;
  line.forEach(([k, len], i) => { const s = spawn(k, len); s.ax = 1; s.az = 0; s.ry = 0; s.v = .32; s.x0 = -24; s.x1 = 24; s.x = x; s.z = 2.2 + (i % 2) * .9; x -= len * .9 + 1.4; setLook(s, 'own'); V.shipLayer.add(s.g); V.sailing.push(s); });
}

// ---------- ship portraits (for the cards and the fleet panels) and a live preview ----------
let PR = null; const portraits = new Map();
function portraitKit() {
  if (PR) return PR; const c = document.createElement('canvas'); c.width = 384; c.height = 192;
  const R = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(384, 192, false); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.5; R.setClearColor(0, 0);
  const sc = new T.Scene(), pm = new T.PMREMGenerator(R), env = new T.Scene(); env.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ uniforms: { uSun: { value: V ? V.sunDir : new T.Vector3(-.4, .3, -.8).normalize() }, uTime: { value: 0 } }, side: T.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), 0.), 1.); }' })));
  sc.environment = pm.fromScene(env, .01).texture; const l = new T.DirectionalLight(0xffe2c0, 3); l.position.set(-3, 4, 3); sc.add(l); const l2 = new T.DirectionalLight(0x9fc4ff, 1.2); l2.position.set(4, 2, -3); sc.add(l2); sc.add(new T.HemisphereLight(0xd8e4f0, 0x334455, 1.4));
  const cam = new T.PerspectiveCamera(22, 2, .05, 50);
  PR = { R, sc, cam, c }; return PR;
}
function portraitIf(k, len) { return portraits.get(k + '|' + len) || null; }
function portrait(k, len) {
  const id = k + '|' + len; if (portraits.has(id)) return portraits.get(id);
  T = T || window.THREE; const P = portraitKit(), key = SeaEngine.TYPES[k].k, g = SeaShips.build(T, k, len, key);
  P.sc.add(g); const L = len * .9, d = L * 1.12 + .55; P.cam.position.set(-d * .62, d * .42, d * .62); P.cam.lookAt(0, .08, 0); P.R.render(P.sc, P.cam);
  const url = P.c.toDataURL('image/png'); P.sc.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); portraits.set(id, url); return url;
}
// a slowly turning 3D view of one ship in a canvas of its own (the draft's showcase)
function preview(canvas) {
  T = T || window.THREE;
  const R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.35; R.setClearColor(0, 0);
  const sc = new T.Scene(), pm = new T.PMREMGenerator(R), env = new T.Scene(); env.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ uniforms: { uSun: { value: new T.Vector3(-.4, .3, -.8).normalize() }, uTime: { value: 0 } }, side: T.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLSL_SKY + 'uniform float uTime; varying vec3 vD; void main(){ gl_FragColor = vec4(skyCol(normalize(vD), 0.), 1.); }' })));
  sc.environment = pm.fromScene(env, .01).texture; const l = new T.DirectionalLight(0xffe2c0, 2.6); l.position.set(-3, 4, 3); sc.add(l); sc.add(new T.HemisphereLight(0xc8d8e8, 0x223040, .9));
  const disc = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshBasicMaterial({ color: 0x0c2430, transparent: true, opacity: .55 })); disc.rotation.x = -Math.PI / 2; disc.position.y = -.005; sc.add(disc);
  const ring = new T.Mesh(new T.RingGeometry(.985, 1, 96), new T.MeshBasicMaterial({ color: 0xe8edf0, transparent: true, opacity: .45 })); ring.rotation.x = -Math.PI / 2; sc.add(ring);
  const cam = new T.PerspectiveCamera(26, 1, .05, 50); let cur = null, ang = .6, raf = 0, L = 3;
  const size = () => { const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const frame = () => { raf = requestAnimationFrame(frame); if (!canvas.isConnected || !canvas.offsetParent) return; ang += .0045; const d = L * 1.3 + 1.7; cam.position.set(Math.cos(ang) * d, d * .38, Math.sin(ang) * d); cam.lookAt(0, .1, 0); if (cur) cur.position.y = Math.sin(performance.now() / 900) * .012; R.render(sc, cam); };
  return { set(k, len) { size(); if (cur) { sc.remove(cur); cur = null; } if (k == null) return; cur = SeaShips.build(T, k, len, SeaEngine.TYPES[k].k); L = len * .9; disc.scale.setScalar(L * .62 + .15); ring.scale.setScalar(L * .62 + .15); sc.add(cur); }, start() { size(); if (!raf) frame(); }, stop() { cancelAnimationFrame(raf); raf = 0; } };
}


// ---------- I: the 3D DEBUG panel (the same look as the other 3D titles: triangles, meshes, draw calls, lights, fps, canvas, camera, GPU) ----------
const DBG = { on: (() => { try { return !!sessionStorage.getItem('t3d-debug'); } catch (x) { return false; } })(), el: null, fr: 0, t: 0, fps: 0, lo: 1e9, hi: 0, last: 0 };
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
function dbgPaint() {
  if (!DBG.on || !V) return;
  if (!DBG.el) { if (!document.querySelector('style[data-t3dbg]')) { const st = document.createElement('style'); st.dataset.t3dbg = '1'; st.textContent = '.t3dbg{position:fixed;left:10px;bottom:10px;z-index:2147483000;min-width:300px;max-width:min(440px,calc(100vw - 20px));padding:10px 12px;border-radius:10px;background:rgba(14,16,22,.86);color:#e8ecf4;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.3)}.t3dbg div{display:flex;gap:10px;justify-content:space-between}.t3dbg i{font-style:normal;color:#9aa6bc;white-space:nowrap}.t3dbg span{text-align:right}.t3dbg b{color:#fff}.t3dbg hr{border:0;border-top:1px solid rgba(255,255,255,.14);margin:5px 0}.t3dbg .t3dbg-h{font-weight:700;letter-spacing:.08em;color:#ffd27a;margin-bottom:4px}.t3dbg .t3dbg-h span{font-weight:400;color:#8a94a8;letter-spacing:0}'; document.head.appendChild(st); }
    DBG.el = document.createElement('div'); DBG.el.className = 't3dbg'; DBG.el.style.zIndex = '2147483600'; document.body.appendChild(DBG.el); }
  DBG.el.hidden = false;
  let tri = 0, mesh = 0, pts = 0, lights = 0, shadows = 0, casters = 0;
  V.scene.traverse(o => { for (let q = o; q; q = q.parent) if (!q.visible) return;
    if (o.isLight) { lights++; if (o.castShadow) shadows++; }
    if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.geometry) { const gm = o.geometry, n = gm.index ? gm.index.count : gm.attributes.position ? gm.attributes.position.count : 0; if (o.isMesh) { tri += n / 3; mesh++; if (o.castShadow) casters++; } else if (o.isSprite) { tri += 2; mesh++; } else pts += n; } });
  const R = V.R, info = R.info, gl = R.getContext(), sz = R.getSize(new T.Vector2()), c = V.cam;
  const gpu = (() => { try { const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)).slice(0, 48) : 'webgl' + (R.capabilities.isWebGL2 ? '2' : '1'); } catch (x) { return '-'; } })();
  let ships = 0; for (let z = 0; z < 2; z++) ships += V.ships[z].size; ships += V.sailing.length;
  const live = V.fire.live.length + V.smoke.live.length, sm = V.sun.shadow.mapSize.x;
  const rows = [
    ['place', 'DREADNOUGHTS · ' + (V.pose || '-')],
    ['', ''],
    ['tris · scene', `<b${tri > 400000 ? ' style="color:#ff8a7a"' : ''}>${fmtN(tri)}</b>  (drawn ${fmtN(info.render.triangles)})`],
    ['meshes', `${mesh} (${casters} cast shadow)`],
    ['ships', String(ships)],
    ['particles', `${live} live / ${V.fire.n + V.smoke.n}`],
    ['draw calls', String(info.render.calls)],
    ['lights', `${lights} (${shadows} with shadow · ${sm}px)`],
    ['geom / tex', `${info.memory.geometries} / ${info.memory.textures}`],
    ['programs', String((info.programs || []).length)],
    ['', ''],
    ['fps', `<b>${DBG.fps ? DBG.fps.toFixed(0) : '-'}</b>  (min ${DBG.lo < 1e8 ? DBG.lo.toFixed(0) : '-'} · ${(V.frameMs || 0).toFixed(1)} ms)`],
    ['render (cpu)', (V.cpu || 0).toFixed(2) + ' ms'],
    ['canvas', `${Math.round(sz.x)}×${Math.round(sz.y)} @${R.getPixelRatio().toFixed(2)}x (max ${V.prMax.toFixed(2)}) · exp ${R.toneMappingExposure.toFixed(2)}`],
    ['camera', c ? `fov ${c.fov.toFixed(1)} · pos ${c.position.x.toFixed(1)}, ${c.position.y.toFixed(1)}, ${c.position.z.toFixed(1)}` : '-'],
    ['frame cap', `${V.cap || 60} fps${V.throttle ? ' (sheet)' : ''}${V.mobile ? ' · mobile' : ''}`],
    ['gpu', gpu],
  ];
  DBG.el.innerHTML = '<div class="t3dbg-h">3D DEBUG <span>I で閉じる</span></div>' + rows.map(([k, v]) => k ? `<div><i>${k}</i><span>${v}</span></div>` : '<hr>').join('');
}
function dbgTick(now) { DBG.fr++; if (now - DBG.t > 500) { const f = DBG.fr * 1000 / (now - DBG.t); DBG.fps = f; DBG.lo = Math.min(DBG.lo, f); DBG.fr = 0; DBG.t = now; if (++DBG.n % 10 === 0) DBG.lo = f; dbgPaint(); } }
function dbgToggle(on) { DBG.on = on === undefined ? !DBG.on : !!on; try { sessionStorage.setItem('t3d-debug', DBG.on ? '1' : ''); } catch (x) {} if (!DBG.on) { if (DBG.el) DBG.el.hidden = true; return; } DBG.t = performance.now(); DBG.fr = 0; DBG.n = 0; DBG.lo = 1e9; dbgPaint(); }
addEventListener('keydown', e => { if ((e.key === 'i' || e.key === 'I') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) dbgToggle(); });

window.World = { setSize, size: () => N, pause: on => { if (!V || V.paused === !!on) return; V.paused = !!on; if (!on) { V.last = performance.now(); loop(); } }, camPos: () => (V ? V.cam.position.toArray() : null), zoomBy: f => V && zoomBy(f), panBy: (x, y) => V && panBy(x, y), resetView, viewScale: () => (V && V.uv ? V.uv.s : 1), dbg: dbgToggle, throttle: on => { if (V) V.throttle = !!on; }, init, setZone, grids, focus, show, pose, fx, kind, sweep, shake, sail, cellAt, pointIn, aim, screenOf, portrait, portraitIf, preview, waveAt, ZC, _v: () => V, fit, refit: () => { if (V) { V.poses = null; } } };
})();
