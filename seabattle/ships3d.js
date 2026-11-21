// DREADNOUGHTS (海戦ゲーム) — 3D ship models. Every one of the 50 types is built from code: a lofted hull (stations from stern to
// bow, flare, sheer, raked stem, transom or cruiser stern, boot-topping below the waterline) and its own parts — turrets,
// funnels, masts, radars, flight decks, cranes, launchers… The parts are built as a small scene graph, then baked into one
// mesh per material, so a ship is a handful of draw calls.
// SeaShips.build(THREE, k, len) → THREE.Group lying along +x (bow at +x), waterline at y = 0, centred on the origin; 1 = one cell.
(function (root) {
'use strict';
let T = null, M = null;

// ---------- small helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = t => t * t * (3 - 2 * t);
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4; if (rep) { tx.wrapS = tx.wrapT = T.RepeatWrapping; }
  return tx;
}
// surface detail drawn in the shader from the model-space position (no UVs needed): hull plating seams, rust runs and waterline grime;
// panel lines and grime streaks on the superstructure; it survives clone() (tints, sunk / ghost variants)
const DETAIL_GLSL = `
  float dh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float dn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(dh(i), dh(i + vec2(1, 0)), f.x), mix(dh(i + vec2(0, 1)), dh(i + vec2(1, 1)), f.x), f.y); }
  float seam(float v, float w) { float d = min(fract(v), 1. - fract(v)); return 1. - smoothstep(0., w, d); }`;
function detail(mat, kind) {
  if (!mat || mat.userData.detail) return mat; mat.userData.detail = kind;
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    let f = '';
    if (kind === 'hull') f = `{ float y = vOP.y, x = vOP.x, row = floor(y * 36.);
        float pl = max(seam(y * 36., .05), seam(x * 9. + row * .5, .018) * step(.004, y));
        diffuseColor.rgb *= 1. - .085 * pl;
        float run = smoothstep(.7, .95, dn(vec2(x * 46. + vOP.z * 3., y * 2.2))) * smoothstep(.01, .06, y) * (.5 + .5 * dn(vec2(x * 3., 1.7)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.29, .17, .1) * (.6 + .5 * dn(vec2(x * 300., y * 40.))), run * .26);
        diffuseColor.rgb *= .74 + .26 * smoothstep(0., .045, y) + .05 * (dn(vec2(x * 7., y * 12.)) - .5); }`;
    else if (kind === 'sup') f = `{ float y = vOP.y, x = vOP.x + vOP.z;
        diffuseColor.rgb *= 1. - .07 * max(seam(x * 22., .03), seam(y * 30., .04));
        float st = smoothstep(.55, .95, dn(vec2(x * 70., y * 3.5)));
        diffuseColor.rgb *= 1. - .16 * st + .06 * (dn(vec2(x * 9., y * 9.)) - .5); }`;
    else if (kind === 'metal') f = `{ diffuseColor.rgb *= .92 + .16 * dn(vOP.xz * 60. + vOP.y * 30.); }`;
    if (!f) return;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;' + DETAIL_GLSL).replace('#include <color_fragment>', '#include <color_fragment>\n' + f);
  };
  mat.customProgramCacheKey = () => 'shipdetail-' + kind;
  const oc = mat.clone.bind(mat); mat.clone = () => { const c = oc(); c.userData.detail = null; return detail(c, kind); };
  return mat;
}
function materials() {
  if (M) return M;
  const S = (color, rough, metal, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {}));
  const wood = canvasTex(256, 256, (g, w, h) => {   // teak planks with dark seams
    g.fillStyle = '#9c7a52'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { const v = 0.88 + Math.random() * .24; g.fillStyle = `rgb(${156 * v | 0},${122 * v | 0},${82 * v | 0})`; g.fillRect(0, y, w, 7); g.fillStyle = 'rgba(40,26,14,.55)'; g.fillRect(0, y + 7, w, 1);
      for (let x = (y * 37) % 90; x < w; x += 90) g.fillRect(x, y, 1, 7); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(60,40,20,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, Math.random() * 30, 1); }
  }, true);
  const steel = canvasTex(128, 128, (g, w, h) => {   // non-slip steel deck, weathered
    g.fillStyle = '#5d6266'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) { const v = 70 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v + 4},${v + 8},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.strokeStyle = 'rgba(20,22,24,.35)'; g.lineWidth = 1; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, true);
  const flight = canvasTex(512, 64, (g, w, h) => {   // carrier flight deck: dark non-skid, white edge lines, dashed centre line, yellow landing marks
    g.fillStyle = '#3f4447'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { const v = 55 + Math.random() * 25 | 0; g.fillStyle = `rgba(${v},${v + 3},${v + 6},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
    g.fillStyle = '#e8e6df'; g.fillRect(0, 3, w, 1.4); g.fillRect(0, h - 4.4, w, 1.4);
    for (let x = 8; x < w - 8; x += 22) g.fillRect(x, h / 2 - 1, 12, 2);
    g.fillStyle = '#e0b43a'; for (let x = 40; x < w * .45; x += 34) g.fillRect(x, h / 2 + 8, 14, 1.5);
    g.font = 'bold 26px sans-serif'; g.fillStyle = 'rgba(235,235,228,.9)'; g.save(); g.translate(w - 60, h / 2); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.fillText('17', 0, 9); g.restore();
  });
  const dazzle = canvasTex(256, 64, (g, w, h) => {   // dazzle camouflage for the all-out ship
    const cs = ['#e9e9e4', '#1d2328', '#6f7d89', '#a9b4bd', '#2f3d4b'];
    g.fillStyle = cs[0]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = cs[1 + (i % 4)]; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + 40 + Math.random() * 60, y - 30 + Math.random() * 60); g.lineTo(x + 20 + Math.random() * 40, y + 40); g.closePath(); g.fill(); }
  }, true);
  M = {
    hull: S(0xffffff, .55, .28, { vertexColors: true }),
    deck: S(0xffffff, .88, .3, { map: steel }),
    wood: S(0xffffff, .78, 0, { map: wood }),
    flight: S(0xffffff, .82, .1, { map: flight }),
    sup: S(0xbfc4c7, .58, .22), sup2: S(0x8f979d, .6, .25), supW: S(0xeeeee8, .5, .1),
    dark: S(0x34393e, .42, .55), black: S(0x141516, .7, .2), gun: S(0x4a5056, .38, .6),
    win: S(0x15181b, .3, .2, { emissive: 0xffcf86, emissiveIntensity: .8 }),
    red: S(0xa8261f, .55, .1), green: S(0x2c7449, .55, .1), orange: S(0xe46a1f, .5, .05), yellow: S(0xd6ab35, .5, .1),
    navy: S(0x2b3d55, .55, .25), rust: S(0x7a4730, .75, .2), white: S(0xf0efe9, .5, .05), radome: S(0xf3f2ed, .32, .05),
    gold: S(0xc7a159, .3, .85), glass: S(0x203040, .08, .9, { emissive: 0x2a4f6a, emissiveIntensity: .25 }),
    hpad: S(0xffffff, .8, .1, { map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#4b5055'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ecebe4'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#ecebe4'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 68); g.strokeStyle = '#e0b43a'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.stroke(); }), transparent: false }),
    dazzle: S(0xffffff, .6, .15, { map: dazzle }), subhull: S(0x2c3236, .55, .35), mine: S(0x2a2d30, .5, .6), cargo: S(0xffffff, .7, .15, { vertexColors: true }),
    lampR: S(0x330000, .4, 0, { emissive: 0xff3326, emissiveIntensity: 2.2 }), lampG: S(0x003300, .4, 0, { emissive: 0x33ff6a, emissiveIntensity: 2.2 }), lampW: S(0x222222, .4, 0, { emissive: 0xfff2d0, emissiveIntensity: 2.4 }),
  };
  for (const k in M) { M[k].name = k; if (!/^(hull|cargo)$/.test(k)) M[k].vertexColors = true; }   // (the baked ambient occlusion rides in the vertex colours)
  detail(M.hull, 'hull'); for (const k of ['sup', 'sup2', 'supW', 'navy', 'white', 'red', 'green', 'rust', 'subhull', 'dazzle']) detail(M[k], 'sup'); for (const k of ['dark', 'gun', 'mine']) detail(M[k], 'metal');
  return M;
}

// ---------- the hull: stations from stern (t = 0) to bow (t = 1) ----------
// o: { fb freeboard, draft, flare, sheer (bow rise ×fb), sheerS (stern rise), entry (where the bow taper starts), rake (stem rake),
//      stern 'transom' | 'cruiser' | 'round', bulb, col (hull colour), boot (below the waterline), stripe (a band at the deck edge) }
function hullParts(L, B, o) {
  const N = 44, lv = [1, .78, .52, .26, .08, 0, -.25, -.55, -.85, -1], R = lv.length * 2 - 1;
  const fb = o.fb, dr = o.draft || fb * .8, entry = o.entry || .62, rake = o.rake != null ? o.rake : .08, st = o.stern || 'transom';
  const hc = new T.Color(o.col || '#8d949a'), bc = new T.Color(o.boot || '#5a1f1c'), sc = o.stripe ? new T.Color(o.stripe) : null, wl = new T.Color(o.wl || '#1a1b1c');
  const hb = t => {   // half breadth along the length (0..1)
    let b = 1;
    if (t < .14) b = st === 'transom' ? .74 + .26 * sm(t / .14) : st === 'round' ? .25 + .75 * Math.sqrt(sm(t / .14)) : .42 + .58 * Math.sqrt(sm(t / .14));
    if (t > entry) b *= Math.pow(Math.cos((t - entry) / (1 - entry) * Math.PI / 2), .78);
    return b * B / 2;
  };
  const deckH = t => fb * (1 + (o.sheer || .35) * Math.pow(Math.max(0, (t - .55) / .45), 2) + (o.sheerS || .08) * Math.pow(Math.max(0, (.2 - t) / .2), 2));
  const pos = [], col = [], idx = [], deckTop = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x0 = -L / 2 + t * L, b = hb(t), H = deckH(t), ring = [];
    for (let j = 0; j < lv.length; j++) {
      const n = lv[j], y = n >= 0 ? n * H : n * dr;
      let wf = n >= 0 ? 1 + (o.flare || .12) * n * clamp((t - .5) / .4, 0, 1) - (o.tumble || 0) * n : Math.sqrt(Math.max(0, 1 - Math.pow(-n, 2.3) * .94));
      if (o.bulb && t > .9 && n < 0 && n > -.9) wf += o.bulb * Math.sin(-n * Math.PI) * sm((t - .9) / .1) * (B / 2) / Math.max(.02, b);
      let x = x0;
      if (t > .82) x += rake * (y + dr) / (H + dr) * sm((t - .82) / .18);
      if (t < .06 && st !== 'transom') x -= .03 * (y + dr) / (H + dr) * sm(1 - t / .06);
      ring.push([x, y, b * wf]);
    }
    deckTop.push([ring[0][0], ring[0][1], ring[0][2]]);
    const pushV = (p, z) => { pos.push(p[0], p[1], z); const c = p[1] < -.003 ? bc : p[1] < .011 ? wl : sc && p[1] > H * .86 ? sc : hc, f = p[1] < 0 ? .9 + .1 * (1 + p[1] / dr) : 1; col.push(c.r * f, c.g * f, c.b * f); };
    for (let j = 0; j < lv.length; j++) pushV(ring[j], ring[j][2]);
    for (let j = lv.length - 2; j >= 0; j--) pushV(ring[j], -ring[j][2]);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < R - 1; j++) { const a = i * R + j, b2 = a + R; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
  const side = new T.BufferGeometry(); side.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); side.setAttribute('color', new T.Float32BufferAttribute(col, 3)); side.setIndex(idx); side.computeVertexNormals();
  // transom: a fan over the first ring
  const tp = [], tc = [], ti = []; let cx = 0, cy = 0; for (let j = 0; j < R; j++) { cx += pos[j * 3]; cy += pos[j * 3 + 1]; } cx /= R; cy /= R;
  tp.push(cx, cy, 0); tc.push(hc.r * .8, hc.g * .8, hc.b * .8); for (let j = 0; j < R; j++) { tp.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); const c = pos[j * 3 + 1] < 0 ? bc : hc; tc.push(c.r * .8, c.g * .8, c.b * .8); }
  for (let j = 1; j < R; j++) ti.push(0, j + 1, j);
  const tr = new T.BufferGeometry(); tr.setAttribute('position', new T.Float32BufferAttribute(tp, 3)); tr.setAttribute('color', new T.Float32BufferAttribute(tc, 3)); tr.setIndex(ti); tr.computeVertexNormals();
  // deck: a strip between the two deck edges
  const dp = [], du = [], di = [];
  deckTop.forEach((p, i) => { const inset = .985; dp.push(p[0], p[1] - .002, p[2] * inset, p[0], p[1] - .002, -p[2] * inset); du.push(p[0] / .5, p[2] / .5, p[0] / .5, -p[2] / .5); if (i) { const a = (i - 1) * 2; di.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const dk = new T.BufferGeometry(); dk.setAttribute('position', new T.Float32BufferAttribute(dp, 3)); dk.setAttribute('uv', new T.Float32BufferAttribute(du, 2)); dk.setIndex(di); dk.computeVertexNormals();
  // bulwark lip along the deck edge (gives the hull a crisp top line)
  // make every face look outwards (side: +z on the starboard half, deck: up, transom: aft)
  const flip = (g, test) => { const n = g.attributes.normal; let v = 0; for (let i = 0; i < n.count; i++) v += test(i, n); if (v < 0) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); } };
  flip(side, (i, n) => n.getZ(i) * Math.sign(side.attributes.position.getZ(i))); flip(dk, (i, n) => n.getY(i)); flip(tr, (i, n) => -n.getX(i));
  return { side, transom: tr, deck: dk, deckAt: x => deckH(clamp((x + L / 2) / L, 0, 1)), halfAt: x => { const t = clamp((x + L / 2) / L, 0, 1); return hb(t) * (1 + (o.flare || .12) * clamp((t - .5) / .4, 0, 1) - (o.tumble || 0)); } };
}

const BARRELS = new Map();
function barrel(s, bl) { const id = s.toFixed(3) + bl.toFixed(3); if (BARRELS.has(id)) return BARRELS.get(id).clone();
  const r0 = s * .072, r1 = s * .042, pts = [[0, -bl / 2], [r0, -bl / 2], [r0 * .96, -bl * .25], [r1 * 1.12, bl * .2], [r1, bl * .44], [r1 * 1.35, bl * .46], [r1 * 1.35, bl * .5], [r1 * .55, bl * .5], [r1 * .55, bl * .45]].map(([x, y]) => new T.Vector2(x, y));
  const g = new T.LatheGeometry(pts, 10); BARRELS.set(id, g); return g.clone(); }
// ---------- the builder: parts go into a scene graph, then everything is baked per material ----------
class Ship {
  constructor(L, B) { this.L = L; this.B = B; this.root = new T.Group(); this.deckAt = () => 0; this.halfAt = () => B / 2; this.extra = []; this.fx = { funnels: [], spin: [], lights: [] }; }
  mesh(mat, geo, x, y, z, rx, ry, rz, parent) { if (mat === 'sup' && this.supK) mat = this.supK; else if (mat === 'sup2' && this.sup2K) mat = this.sup2K; const m = new T.Mesh(geo, M[mat]); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); (parent || this.root).add(m); return m; }
  group(x, y, z, ry, parent) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); g.rotation.y = ry || 0; (parent || this.root).add(g); return g; }
  hull(o) {
    if (this.pal) o = Object.assign({}, o, this.pal);
    this.tint(o.col || '#8d949a', o.supCol);
    if (o.deckCol) { const k = 'deck_' + o.deckCol; if (!M[k]) { M[k] = M.deck.clone(); M[k].color = new T.Color(o.deckCol).multiplyScalar(1 / .115); M[k].name = k; } o.deck = k; }   // (deck colour ÷ the steel texture's own mean)
    const h = hullParts(this.L, this.B, o); this.deckAt = h.deckAt; this.halfAt = h.halfAt; this.ho = o;
    this.mesh('hull', h.side); this.mesh('hull', h.transom); this.mesh(o.deck || 'deck', h.deck);
    if (o.rail !== false && o.deck !== 'flight' && o.fb >= .06) this.edge();
    if (o.anchor !== false && this.L > 1.2) for (const q of [-1, 1]) { const x = this.L * .41, y = this.deckAt(x) * .8; this.mesh('black', new T.CylinderGeometry(.007, .007, .004, 10), x, y, q * (this.halfAt(x) * 1.02), Math.PI / 2, 0, 0); this.box('dark', x - .002, y - .018, q * (this.halfAt(x) * 1.02 + .001), .01, .018, .003); }
    return this;
  }
  tint(hex, sup) {
    const base = new T.Color(sup || hex), hsl = {}; base.getHSL(hsl);
    const mk = (k, l, src) => { const key = k + '_' + (sup || hex); if (!M[key]) { M[key] = src.clone(); M[key].color = new T.Color().setHSL(hsl.h, Math.min(hsl.s, .12), l); M[key].name = key; } return key; };
    this.supK = mk('sup', Math.min(.82, hsl.l + (sup ? 0 : .12)), M.sup); this.sup2K = mk('sup2', Math.max(.16, hsl.l - .04), M.sup2);
  }
  box(mat, x, y, z, w, h, d, p) { return this.mesh(mat, new T.BoxGeometry(w, h, d), x, y + h / 2, z, 0, 0, 0, p); }
  cyl(mat, x, y, z, r1, r2, h, seg, p) { return this.mesh(mat, new T.CylinderGeometry(r1, r2, h, seg || 14), x, y + h / 2, z, 0, 0, 0, p); }
  // a superstructure block on the deck at x (w long, d wide, h high); windows: rows of lit windows on the sides and front
  block(x, w, h, d, o) {
    o = o || {}; const y = o.y != null ? o.y : this.deckAt(x), mat = o.mat || 'sup', z = o.z || 0;
    (this.blocks || (this.blocks = [])).push({ x, w, h, d, y, z, top: y + h, slope: o.slope || 0, win: o.win !== false && h > .045 });
    const g = new T.BoxGeometry(w, h, d);
    if (o.slope) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getX(i) > 0) p.setX(i, p.getX(i) - o.slope * w); g.computeVertexNormals(); }
    this.mesh(mat, g, x, y + h / 2, z);
    if (o.roof !== false) { const rw = w * (o.slope ? 1 - o.slope : 1) + .012; this.box('sup2', x - (o.slope ? o.slope * w / 2 : 0), y + h, z, rw, .005, d + .012); }
    if (o.win !== false && h > .045) {
      const rows = Math.max(1, Math.floor(h / .07)), wl = w * .8;
      for (let r = 0; r < rows; r++) { const wy = y + h * (r + .62) / (rows + .2), ww = r === rows - 1 && o.slope ? wl * (1 - o.slope) : wl;
        for (const s of [-1, 1]) this.box('win', x - (r === rows - 1 && o.slope ? o.slope * w / 2 : 0), wy - .006, z + s * (d / 2 + .0015), ww, .007, .003);
        if (o.front !== false) this.box('win', x + w / 2 + .0015 - (r === rows - 1 && o.slope ? o.slope * w : 0), wy - .006, z, .003, .007, d * .75); }
    }
    return y + h;
  }
  // big gun turret: s = size, n barrels, dir +1 faces the bow, raise = superfiring height above the deck
  turret(x, s, n, dir, o) {
    o = o || {}; const y = (o.y != null ? o.y : this.deckAt(x)) + (o.raise || 0), g = this.group(x, y, o.z || 0, dir > 0 ? 0 : Math.PI);
    if (o.raise) this.mesh('sup2', new T.CylinderGeometry(s * .5, s * .58, o.raise + .01, 18), 0, -o.raise / 2, 0, 0, 0, 0, g);
    this.mesh('dark', new T.CylinderGeometry(s * .52, s * .56, s * .12, 18), 0, s * .06, 0, 0, 0, 0, g);
    const hg = new T.BoxGeometry(s * 1.25, s * .36, s * .9), p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { if (p.getX(i) > 0 && p.getY(i) > 0) p.setX(i, p.getX(i) - s * .3); if (p.getX(i) < 0) p.setZ(i, p.getZ(i) * .9); }
    hg.computeVertexNormals(); this.mesh(o.mat || 'sup', hg, -s * .1, s * .3, 0, 0, 0, 0, g);
    this.mesh('dark', new T.BoxGeometry(s * .5, s * .06, s * .5), -s * .3, s * .51, 0, 0, 0, 0, g);   // rangefinder roof
    if (o.rf) this.mesh('dark', new T.BoxGeometry(s * .14, s * .1, s * 1.25), -s * .45, s * .4, 0, 0, 0, 0, g);   // turret rangefinder ears
    const bl = o.len || s * 1.7, sp = n === 1 ? 0 : s * .62 / (n - 1);
    for (let i = 0; i < n; i++) { const z = n === 1 ? 0 : -s * .31 + i * sp, b = this.mesh('gun', barrel(s, bl), s * .38 + bl / 2, s * .3, z, 0, 0, -Math.PI / 2 + (o.elev || .04), g); this.mesh('black', new T.CylinderGeometry(s * .095, s * .1, s * .14, 10), s * .36, s * .3, z, 0, 0, -Math.PI / 2, g); }
    if (!o.raise) this.mesh('sup2', new T.CylinderGeometry(s * .6, s * .62, s * .05, 20), 0, -s * .01, 0, 0, 0, 0, g);   // (barbette ring)
    for (const q of [-1, 1]) this.mesh('dark', new T.BoxGeometry(s * .12, s * .07, s * .1), s * .1, s * .5, q * s * .28, 0, 0, 0, g);   // (sighting hoods)
    this.mesh(o.mat || 'sup', new T.BoxGeometry(s * .3, s * .04, s * .8), -s * .55, s * .2, 0, 0, 0, 0, g);   // (overhang at the back)
    return g;
  }
  // a single gun behind a shield (secondary / quick-firing / AA)
  mount(x, z, s, dir, o) {
    o = o || {}; const y = o.y != null ? o.y : this.deckAt(x), g = this.group(x, y, z, dir > 0 ? 0 : Math.PI);
    this.mesh('dark', new T.CylinderGeometry(s * .36, s * .4, s * .14, 12), 0, s * .07, 0, 0, 0, 0, g);
    const sh = new T.BoxGeometry(s * .7, s * .42, s * .62), p = sh.attributes.position; for (let i = 0; i < p.count; i++) if (p.getX(i) > 0 && p.getY(i) > 0) p.setX(i, p.getX(i) - s * .25); sh.computeVertexNormals();
    this.mesh(o.mat || 'sup', sh, -s * .05, s * .35, 0, 0, 0, 0, g);
    const n = o.n || 1; for (let i = 0; i < n; i++) this.mesh('gun', new T.CylinderGeometry(s * .035, s * .045, s * 1.05, 8), s * .7, s * .36, n === 1 ? 0 : (i - (n - 1) / 2) * s * .22, 0, 0, -Math.PI / 2 + (o.elev || .1), g);
    return g;
  }
  // light anti-aircraft gun: a ring and two thin barrels pointing up
  aa(x, z, s, o) { o = o || {}; const y = o.y != null ? o.y : this.deckAt(x), g = this.group(x, y, z, o.ry || 0); if (o.tub !== false) this.mesh('sup2', new T.LatheGeometry([[s * .72, 0], [s * .8, 0], [s * .8, s * .3], [s * .72, s * .3], [s * .72, 0]].map(([a, b]) => new T.Vector2(a, b)), 14), 0, 0, 0, 0, 0, 0, g); this.mesh('dark', new T.CylinderGeometry(s * .45, s * .5, s * .22, 10), 0, s * .11, 0, 0, 0, 0, g); for (const q of [-1, 1]) this.mesh('gun', new T.CylinderGeometry(s * .035, s * .035, s * 1.1, 6), s * .3, s * .5, q * s * .14, 0, 0, -Math.PI / 2 + .75, g); return g; }
  funnel(x, r, h, o) {
    o = o || {}; const y = o.y != null ? o.y : this.deckAt(x), g = this.group(x, y, o.z || 0);
    g.rotation.z = o.rake || 0;
    const f = this.mesh(o.mat || 'sup2', new T.CylinderGeometry(r * (o.top || .92), r, h, 18), 0, h / 2, 0, 0, 0, 0, g); f.scale.x = o.oval || 1.5;
    const c = this.mesh('black', new T.CylinderGeometry(r * .95, r * .95, h * .14, 18), 0, h * .94, 0, 0, 0, 0, g); c.scale.x = o.oval || 1.5;
    const rim = this.mesh('dark', new T.TorusGeometry(r * .93, r * .06, 6, 24), 0, h * 1.005, 0, Math.PI / 2, 0, 0, g); rim.scale.x = o.oval || 1.5;   // (the cap's lip)
    if (h > .06) for (const q of [-1, 1]) this.mesh('sup2', new T.CylinderGeometry(r * .07, r * .07, h * 1.06, 6), -r * (o.oval || 1.5) * .98, h * .53, q * r * .42, 0, 0, 0, g);   // (steam pipes aft)
    if (o.band) { const b = this.mesh(o.band, new T.CylinderGeometry(r * .99, r * .99, h * .1, 18), 0, h * .72, 0, 0, 0, 0, g); b.scale.x = o.oval || 1.5; }
    const top = new T.Vector3(0, h * 1.02, 0); g.updateMatrix(); top.applyMatrix4(g.matrix); this.fx.funnels.push({ x: top.x, y: top.y, z: top.z, r });
    return g;
  }
  // masts: 'pole' with a yard, 'tripod', 'lattice' (a tall truss), 'tower' (a thick modern mast); top: a radar on it
  mast(x, h, kind, o) {
    o = o || {}; const y = o.y != null ? o.y : this.deckAt(x), z = o.z || 0, g = this.group(x, y, z), r = o.r || .012;
    if (kind === 'tripod') { this.mesh('sup2', new T.CylinderGeometry(r, r * 1.3, h, 8), 0, h / 2, 0, 0, 0, 0, g); for (const [a, b] of [[-1, -1], [-1, 1]]) { const l = this.mesh('sup2', new T.CylinderGeometry(r * .8, r * .9, h * .9, 6), a * h * .11, h * .43, b * h * .11, b * .24, 0, -a * .24, g); } }
    else if (kind === 'lattice') { const w = o.w || .05; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.mesh('sup2', new T.CylinderGeometry(r * .45, r * .7, h, 5), a * w * .5, h / 2, b * w * .5, b * -.03, 0, a * .03, g); for (let k = 1; k < 6; k++) this.mesh('sup2', new T.BoxGeometry(w * (1.1 - k * .1), .004, w * (1.1 - k * .1)), 0, h * k / 6, 0, 0, 0, 0, g); }
    else if (kind === 'tower') { this.mesh(o.mat || 'sup', new T.CylinderGeometry(r * .9, r * 1.6, h, 6), 0, h / 2, 0, 0, 0, 0, g); }
    else this.mesh('sup2', new T.CylinderGeometry(r * .7, r, h, 8), 0, h / 2, 0, 0, 0, 0, g);
    if (o.yard !== false) this.mesh('sup2', new T.CylinderGeometry(r * .45, r * .45, h * .42, 6), 0, h * .8, 0, Math.PI / 2, 0, 0, g);
    (this.masts || (this.masts = [])).push({ x, y: y + h * .97, z, h });
    if (o.top) this.radar(0, y + h, o.top, Object.assign({ z, x }, o));
    this.mesh('lampW', new T.SphereGeometry(.007, 6, 6), 0, h + .006, 0, 0, 0, 0, g);
    return y + h;
  }
  // radars & antennas at (x, y): 'bed' rotating bed-spring, 'bar' rotating bar, 'dish', 'dome' radome, 'array' fixed panels, 'df' direction-finder loop, 'ecm' pods
  radar(x, y, kind, o) {
    o = o || {}; const z = o.z || 0, px = o.x != null ? o.x : x, s = o.rs || 1;
    if (kind === 'bed' || kind === 'bar') { const g = this.group(px, y, z); this.mesh('sup2', new T.CylinderGeometry(.008 * s, .01 * s, .03 * s, 8), 0, .015 * s, 0, 0, 0, 0, g); const sp = this.group(0, .03 * s, 0, 0, g); this.mesh(kind === 'bed' ? 'dark' : 'sup2', kind === 'bed' ? new T.BoxGeometry(.016 * s, .04 * s, .09 * s) : new T.BoxGeometry(.01 * s, .012 * s, .12 * s), 0, kind === 'bed' ? .02 * s : .006 * s, 0, 0, 0, 0, sp); this.fx.spin.push({ g: sp, w: kind === 'bed' ? 1.2 : 2.4 }); return; }
    if (kind === 'dish') { const g = this.group(px, y, z); this.mesh('sup2', new T.CylinderGeometry(.008 * s, .01 * s, .03 * s, 8), 0, .015 * s, 0, 0, 0, 0, g); this.mesh('radome', new T.SphereGeometry(.05 * s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), .01 * s, .06 * s, 0, 0, 0, -Math.PI / 2 - .5, g); return; }
    if (kind === 'dome') { this.mesh('radome', new T.SphereGeometry(.045 * s, 16, 12), px, y + .04 * s, z); this.cyl('sup2', px, y, z, .018 * s, .022 * s, .012 * s); return; }
    if (kind === 'df') { const g = this.group(px, y, z); this.mesh('sup2', new T.TorusGeometry(.035 * s, .005 * s, 6, 18), 0, .045 * s, 0, 0, 0, 0, g); this.mesh('sup2', new T.TorusGeometry(.035 * s, .005 * s, 6, 18), 0, .045 * s, 0, 0, Math.PI / 2, 0, g); this.fx.spin.push({ g, w: .5 }); return; }
    if (kind === 'ecm') { for (const q of [-1, 1]) this.mesh('radome', new T.CylinderGeometry(.018 * s, .018 * s, .05 * s, 10), px, y + .025 * s, z + q * .03 * s, Math.PI / 2, 0, 0); return; }
    if (kind === 'array') { const g = this.group(px, y, z); for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const m = this.mesh('dark', new T.BoxGeometry(.008 * s, .1 * s, .09 * s), Math.cos(a) * .045 * s, .05 * s, Math.sin(a) * .045 * s, 0, -a, 0, g); m.rotation.z = Math.cos(a) * .2; m.rotation.x = -Math.sin(a) * .2; } }
  }
  helipad(x) { const y = this.deckAt(x) + .002, r = Math.min(this.halfAt(x) * .8, .09); this.mesh('hpad', new T.CircleGeometry(r, 28), x, y, 0, -Math.PI / 2, 0, 0); }
  crane(x, z, h, boom, dir) { const y = this.deckAt(x), g = this.group(x, y, z, dir || 0); this.mesh('yellow', new T.CylinderGeometry(.014, .02, h, 8), 0, h / 2, 0, 0, 0, 0, g); this.mesh('yellow', new T.CylinderGeometry(.008, .01, boom, 6), boom * .42, h * .85, 0, 0, 0, -Math.PI / 2 + .55, g); this.mesh('dark', new T.BoxGeometry(.03, .025, .03), 0, h * .8, 0, 0, 0, 0, g); }
  boats(x0, x1, n, o) { o = o || {}; for (const q of [-1, 1]) for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (n === 1 ? .5 : i / (n - 1)), y = (o.y != null ? o.y : this.deckAt(x)) + .02, z = q * (this.halfAt(x) - .018); const b = this.mesh(o.mat || 'white', new T.CapsuleGeometry(.014, .06, 4, 8), x, y, z, 0, 0, Math.PI / 2); b.scale.z = .8; } }
  tubes(x, z, n, len, dir) { const y = this.deckAt(x), g = this.group(x, y + .012, z, dir || 0); this.mesh('dark', new T.CylinderGeometry(.03, .034, .02, 10), 0, 0, 0, 0, 0, 0, g); for (let i = 0; i < n; i++) this.mesh('gun', new T.CylinderGeometry(.009, .009, len, 8), 0, .022, (i - (n - 1) / 2) * .021, 0, 0, Math.PI / 2, g); }
  rockets(x, z, rows, cols, ang, dir) { const y = this.deckAt(x), g = this.group(x, y, z, dir || 0); this.mesh('dark', new T.CylinderGeometry(.03, .035, .03, 10), 0, .015, 0, 0, 0, 0, g); const b = this.group(0, .04, 0, 0, g); b.rotation.z = ang || .5; this.mesh('sup2', new T.BoxGeometry(.11, rows * .016 + .006, cols * .016 + .006), 0, 0, 0, 0, 0, 0, b); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.mesh('black', new T.CircleGeometry(.0058, 8), .0555, (r - (rows - 1) / 2) * .016, (c - (cols - 1) / 2) * .016, 0, Math.PI / 2, 0, b); }
  vls(x, z, rows, cols) { const y = this.deckAt(x) + .001; this.box('dark', x, y, z, rows * .028 + .01, .006, cols * .028 + .01); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.box('sup2', x + (r - (rows - 1) / 2) * .028, y + .006, z + (c - (cols - 1) / 2) * .028, .022, .002, .022); }
  plane(x, y, z, ry, s, mat) { const g = this.group(x, y, z, ry || 0); s = s || 1; const m = mat || 'sup2'; this.mesh(m, new T.CapsuleGeometry(.012 * s, .07 * s, 4, 8), 0, .012 * s, 0, 0, 0, Math.PI / 2, g); this.mesh(m, new T.BoxGeometry(.03 * s, .004 * s, .13 * s), .005 * s, .016 * s, 0, 0, 0, 0, g); this.mesh(m, new T.BoxGeometry(.02 * s, .003 * s, .05 * s), -.042 * s, .016 * s, 0, 0, 0, 0, g); this.mesh(m, new T.BoxGeometry(.016 * s, .024 * s, .003 * s), -.044 * s, .028 * s, 0, 0, 0, 0, g); this.mesh('dark', new T.CylinderGeometry(.013 * s, .013 * s, .004 * s, 10), .05 * s, .012 * s, 0, 0, 0, Math.PI / 2, g); return g; }
  float(x, y, z, s) { this.mesh('sup2', new T.CapsuleGeometry(.008 * s, .05 * s, 4, 6), x, y, z, 0, 0, Math.PI / 2); }
  // a stepped tower (pagoda / bridge tower): levels [w, d, h, mat], each with a platform lip; windows on the top 'bridge' levels
  tower(x, y, levels, o) {
    o = o || {}; const br = o.bridge || 1;
    levels.forEach(([w, d, h, mat], i) => { const last = i >= levels.length - br; this.mesh(mat || 'sup', new T.BoxGeometry(w, h, d), x, y + h / 2, 0); this.box('sup2', x + .004, y + h, 0, w + .02, .004, d + .022);
      if (last) for (const q of [-1, 1]) this.box('win', x, y + h * .55, q * (d / 2 + .0015), w * .82, .008, .003);
      if (last) this.box('win', x + w / 2 + .0015, y + h * .55, 0, .003, .008, d * .82); y += h + .004; });
    (this.blocks || (this.blocks = [])).push({ x, w: levels[levels.length - 1][0], h: .01, d: levels[levels.length - 1][1], y, z: 0, top: y, slope: 0, win: false });
    return y;
  }
  director(x, y, s, o) { o = o || {}; const g = this.group(x, y, o.z || 0, o.dir < 0 ? Math.PI : 0); s = s || 1; this.mesh('dark', new T.CylinderGeometry(.022 * s, .026 * s, .016 * s, 12), 0, .008 * s, 0, 0, 0, 0, g); this.mesh('sup', new T.BoxGeometry(.05 * s, .03 * s, .05 * s), 0, .03 * s, 0, 0, 0, 0, g); this.mesh('dark', new T.BoxGeometry(.016 * s, .012 * s, .13 * s), -.004 * s, .042 * s, 0, 0, 0, 0, g); for (const q of [-1, 1]) this.mesh('dark', new T.CylinderGeometry(.008 * s, .008 * s, .01 * s, 8), -.004 * s, .042 * s, q * .066 * s, Math.PI / 2, 0, 0, g); return y + .05 * s; }
  breakwater(x) { const y = this.deckAt(x), hw = this.halfAt(x) * .8; for (const q of [-1, 1]) { const m = this.mesh('sup2', new T.BoxGeometry(.005, .022, hw * 1.18), x - .02, y + .011, q * hw * .5); m.rotation.y = q * .55; } }
  catapult(x, z, ry, len) { const y = this.deckAt(x), g = this.group(x, y + .012, z, ry); this.mesh('dark', new T.CylinderGeometry(.02, .024, .012, 10), 0, -.006, 0, 0, 0, 0, g); this.mesh('sup2', new T.BoxGeometry(len, .008, .016), len * .3, .004, 0, 0, 0, 0, g); for (let i = 0; i < 5; i++) this.mesh('dark', new T.BoxGeometry(.003, .014, .016), len * (.3 - .45 + i * .22), .004, 0, 0, 0, 0, g); return g; }
  racks(x, n) { const y = this.deckAt(x); for (const q of [-1, 1]) { this.box('dark', x, y, q * (this.halfAt(x) - .025), .07, .006, .022); for (let i = 0; i < n; i++) this.mesh('black', new T.CylinderGeometry(.008, .008, .018, 8), x - .03 + i * .06 / Math.max(1, n - 1), y + .016, q * (this.halfAt(x) - .025), Math.PI / 2, 0, 0); } }
  searchlight(x, y, z) { const g = this.group(x, y, z); this.mesh('dark', new T.CylinderGeometry(.006, .008, .012, 8), 0, .006, 0, 0, 0, 0, g); this.mesh('sup2', new T.CylinderGeometry(.011, .011, .016, 12), .002, .02, 0, 0, 0, Math.PI / 2, g); this.mesh('glass', new T.CircleGeometry(.0095, 12), .0105, .02, 0, 0, Math.PI / 2, 0, g); }
  line(mat, a, b, r) { const d = new T.Vector3().subVectors(b, a), m = this.mesh(mat, new T.CylinderGeometry(r, r, d.length(), 3), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m; }
  // the finishing pass on every ship: stays from the masts, bridge wings, and the deck's small furniture (bollards, vents, hatches,
  // capstans and chain) set wherever the deck is still free
  finish(seed) {
    let a = seed >>> 0; const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const L = this.L, o = this.ho || {};
    // rigging: fore and back stays and a pair of shrouds per mast
    for (const m of this.masts || []) { if (m.h < .1) continue; const top = new T.Vector3(m.x, m.y, m.z);
      for (const dx of [L * .16, -L * .14]) { const x = clamp(m.x + dx, -L * .46, L * .44); this.line('dark', top, new T.Vector3(x, this.deckAt(x) + .004, 0), .0006); }
      for (const q of [-1, 1]) this.line('black', top.clone().setY(m.y - m.h * .25), new T.Vector3(m.x - .03, this.deckAt(m.x) + .004, q * (this.halfAt(m.x) - .01)), .0006); }
    // bridge wings on the forward-most tall windowed block
    const br = (this.blocks || []).filter(b => b.win && b.x > -L * .25 && Math.abs(b.z) < .01).sort((p, q) => q.top - p.top)[0];
    if (br && br.d < this.B * .9) { const wx = br.x + br.w / 2 - br.slope * br.w - .018, span = Math.min(this.B * .96, br.d + .1);
      this.box('sup', wx, br.top - .016, br.z, .028, .012, span); this.box('sup2', wx, br.top - .004, br.z, .032, .003, span + .006);
      for (const q of [-1, 1]) this.box('win', wx + .0145, br.top - .011, q * (br.d / 2 + (span - br.d) / 4), .002, .005, (span - br.d) / 2 - .006); }
    if (o.deck === 'flight' || o.fb < .05) return;
    // where the deck is taken: every part's footprint (in plan) that rises above the deck
    this.root.updateMatrixWorld(true); const taken = [], bb = new T.Box3();
    this.root.traverse(c => { if (!c.isMesh || /^(hull|deck|wood|flight|hpad)/.test(c.material.name)) return; bb.setFromObject(c); const x = (bb.min.x + bb.max.x) / 2; if (bb.max.y < this.deckAt(x) + .006) return; taken.push([bb.min.x - .012, bb.max.x + .012, bb.min.z - .012, bb.max.z + .012]); });
    const free = (x, z, r) => !taken.some(t => x + r > t[0] && x - r < t[1] && z + r > t[2] && z - r < t[3]) && Math.abs(z) + r < this.halfAt(x) - .006;
    const put = (x, z, r) => { taken.push([x - r, x + r, z - r, z + r]); };
    // capstans and the anchor chain on the forecastle
    for (const q of [-1, 1]) { const x = L * .37, z = q * this.halfAt(L * .37) * .38; if (!free(x, z, .016)) continue; const y = this.deckAt(x);
      this.cyl('dark', x, y, z, .011, .013, .012, 12); this.cyl('dark', x, y + .012, z, .007, .007, .006, 10); put(x, z, .016);
      const hx = L * .4, hz = q * (this.halfAt(hx) - .008); this.line('black', new T.Vector3(x + .01, y + .003, z), new T.Vector3(hx, this.deckAt(hx) + .003, hz), .0026); }
    // bollards in pairs along both edges, vents and hatches along the middle
    for (let x = -L * .44; x < L * .34; x += .07 + rnd() * .06) { const y = this.deckAt(x);
      for (const q of [-1, 1]) { const z = q * (this.halfAt(x) - .022); if (rnd() < .55 && free(x, z, .014)) { for (const d of [-.006, .006]) this.cyl('dark', x + d, y, z, .0035, .004, .011, 8); put(x, z, .012); } }
      const z = (rnd() - .5) * this.halfAt(x) * .9, k = rnd();
      if (k < .28 && free(x, z, .016)) { this.cyl('sup2', x, y, z, .005, .005, .018, 8); this.cyl('sup2', x, y + .018, z, .011, .006, .006, 10); put(x, z, .014); }
      else if (k < .55 && free(x, z, .022)) { this.box('sup2', x, y, z, .03, .005, .022); this.box('dark', x, y + .005, z, .024, .001, .016); put(x, z, .02); } }
  }
  // deck edge: stanchions, two rails and a toe board, following the sheer from stern to bow
  edge() {
    const L = this.L, n = Math.max(8, Math.round(L / .055)), x0 = -L * .47, x1 = L * .44;
    for (const q of [-1, 1]) { let px = null, py = 0, pz = 0;
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = this.deckAt(x), z = q * (this.halfAt(x) - .004);
        this.box('sup2', x, y, z, .0028, .026, .0028);
        if (px != null) { const dx = x - px, dz = z - pz, dy = y - py, len = Math.hypot(dx, dz, dy), a = Math.atan2(dz, dx), e = Math.atan2(dy, Math.hypot(dx, dz));
          for (const [hy, th, tw] of [[.026, .0024, .0024], [.014, .0016, .0016], [.004, .008, .0016]]) { const m = this.mesh('sup2', new T.BoxGeometry(len, th, tw), (x + px) / 2, (y + py) / 2 + hy, (z + pz) / 2); m.rotation.set(0, -a, e, 'YZX'); } }
        px = x; py = y; pz = z; } }
  }
  rail(x0, x1) { for (const q of [-1, 1]) { const n = Math.max(2, Math.round((x1 - x0) / .05)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; this.box('sup2', x, this.deckAt(x), q * (this.halfAt(x) - .006), .003, .022, .003); } } }
  lights() { const L = this.L; this.mesh('lampR', new T.SphereGeometry(.006, 6, 6), L * .05, this.deckAt(L * .05) + .09, -this.halfAt(0) * .9); this.mesh('lampG', new T.SphereGeometry(.006, 6, 6), L * .05, this.deckAt(L * .05) + .09, this.halfAt(0) * .9); }
  cross(x, y, z, s, face) {   // a red cross on a white field (hospital ship): face 'side' (on the hull side) or 'top' (on the deck)
    const g = this.group(x, y, z);
    if (face === 'top') { this.mesh('white', new T.BoxGeometry(s * 1.2, .002, s * 1.2), 0, 0, 0, 0, 0, 0, g); this.mesh('red', new T.BoxGeometry(s * .9, .003, s * .28), 0, .001, 0, 0, 0, 0, g); this.mesh('red', new T.BoxGeometry(s * .28, .003, s * .9), 0, .001, 0, 0, 0, 0, g); }
    else { const q = Math.sign(z) || 1; this.mesh('red', new T.BoxGeometry(s * .9, s * .28, .002), 0, 0, q * .001, 0, 0, 0, g); this.mesh('red', new T.BoxGeometry(s * .28, s * .9, .002), 0, 0, q * .001, 0, 0, 0, g); }
  }
  // ambient occlusion in the vertex colours: what stands on the deck is darker at its foot; under-hangs darker than tops
  occlude(g) {
    const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = y - this.deckAt(x), inside = Math.abs(z) < this.halfAt(x) + .03;
      let a = inside ? .42 + .58 * sm(clamp((h + .004) / .085, 0, 1)) : 1; a *= .86 + .14 * clamp(n.getY(i) * .5 + .5, 0, 1); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = a; }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
  }
  // bake: one mesh per material, all transforms applied
  bake() {
    const root = this.root; root.updateMatrixWorld(true);
    const buckets = new Map(), inv = new T.Matrix4().copy(root.matrixWorld).invert(), m = new T.Matrix4();
    const keep = new Set(this.fx.spin.map(s => s.g));
    const walk = (o, insideSpin) => { for (const c of o.children.slice()) { const spin = insideSpin || keep.has(c); if (c.isMesh && !spin) { m.multiplyMatrices(inv, c.matrixWorld); const g = c.geometry.clone().applyMatrix4(m); const k = c.material.name; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(g); o.remove(c); c.geometry.dispose(); } if (c.children.length) walk(c, spin); } };
    walk(root, false);
    const flat = /^(hull|cargo|deck|wood|flight|hpad|lamp|win|glass)/;
    for (const [k, list] of buckets) { const g = merge(list); list.forEach(x => x.dispose()); if (!flat.test(k)) this.occlude(g); else if (!g.attributes.color) white(g); const mesh = new T.Mesh(g, M[k]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.mat = k; root.add(mesh); }
    for (const sp of keep) sp.traverse(o => { if (o.isMesh && !o.geometry.attributes.color) white(o.geometry); });
    // drop the groups left empty
    const prune = o => { for (const c of o.children.slice()) { prune(c); if (!c.isMesh && !c.children.length && !keep.has(c)) o.remove(c); } }; prune(root);
    root.userData.fx = this.fx; root.userData.L = this.L; root.userData.B = this.B;
    return root;
  }
}
function white(g) { g.setAttribute('color', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); }
function merge(list) {
  let nv = 0, ni = 0; const hasCol = list.every(g => g.attributes.color);
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = hasCol ? new Float32Array(nv * 3) : null, I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color, cnt = p.count;
    P.set(p.array, ov * 3);
    N.set(n.array, ov * 3); if (u) U.set(u.array.length === cnt * 2 ? u.array : new Float32Array(cnt * 2), ov * 2);
    if (C) { if (c) C.set(c.array, ov * 3); else C.fill(1, ov * 3, (ov + cnt) * 3); }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) I[oi + i] = a[i] + ov; oi += a.length; } else { for (let i = 0; i < cnt; i++) I[oi + i] = ov + i; oi += cnt; }
    ov += cnt;
  }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); if (C) out.setAttribute('color', new T.BufferAttribute(C, 3)); out.setIndex(new T.BufferAttribute(I, 1));
  out.computeBoundingSphere(); return out;
}

// ---------- the 50 ships ----------
// Colours: haze grey (modern), battleship grey (WWII), dark (older), white (hospital), merchant hulls for the auxiliaries.
const HAZE = '#8e969c', BB = '#6f777e', DARKH = '#4c5359', MERCH = '#2f3c4c';
const K = {};
// warships of the big-gun era
K.battleship = s => { const L = s.L, B = s.B; s.hull({ fb: .11, flare: .16, sheer: .45, col: BB, deck: 'wood', rake: .1, bulb: .2 });
  s.breakwater(L * .375);
  s.turret(L * .29, .2, 3, 1, { rf: 1 }); s.turret(L * .175, .19, 3, 1, { raise: .075, rf: 1 }); s.turret(-L * .32, .2, 3, -1, { rf: 1 });
  // the citadel: a long armoured deckhouse, a conning tower, the stepped tower bridge with its director and radar
  const y0 = s.block(L * .0, L * .3, .07, B * .62, { slope: .05, win: false });
  s.cyl('dark', L * .115, y0, 0, .036, .04, .06, 16); s.cyl('sup2', L * .115, y0 + .06, 0, .04, .04, .006, 16);
  let y = s.tower(L * .065, y0, [[.15, B * .46, .05], [.12, B * .38, .045], [.1, B * .3, .045], [.085, B * .24, .04]], { bridge: 2 });
  y = s.director(L * .062, y, 1.15); s.mast(L * .055, .13, 'pole', { y: y - .005, top: 'bed', r: .009 });
  s.funnel(-L * .07, .072, .17, { y: y0, rake: .13, oval: 1.35 });
  const ya = s.block(-L * .19, L * .08, .055, B * .38); s.director(-L * .19, ya, .9, { dir: -1 }); s.mast(-L * .155, .2, 'tripod', { y: y0, top: 'bar', r: .011 });
  // secondary turrets, heavy AA in tubs, searchlights
  for (const q of [-1, 1]) { s.turret(L * .07, .095, 2, 1, { y: y0, z: q * B * .25 }); s.turret(-L * .045, .095, 2, 1, { y: y0, z: q * B * .27 }); s.turret(-L * .16, .095, 2, -1, { z: q * B * .3 });
    for (let i = 0; i < 4; i++) s.aa(-L * .11 + i * L * .07, q * B * .42, .028, { ry: q * .4 }); s.searchlight(-L * .07, y0 + .17, q * .05); }
  // the stern: catapult, a floatplane and its crane; boats amidships
  s.catapult(-L * .42, B * .12, .5, .16); s.plane(-L * .4, s.deckAt(-L * .4) + .026, B * .16, .5, 1.05); s.crane(-L * .46, -B * .14, .06, .14, Math.PI);
  s.boats(-L * .14, -L * .04, 2, { y: y0 }); s.lights(); };
K.dread = s => { const L = s.L; s.hull({ fb: .11, flare: .18, sheer: .5, col: BB, deck: 'wood', rake: .12, bulb: .25 });
  s.turret(L * .34, .21, 3, 1); s.turret(L * .23, .2, 3, 1, { raise: .08 }); s.turret(L * .12, .2, 3, 1, { raise: .15, rf: 1 }); s.turret(-L * .25, .21, 3, -1, { raise: .08 }); s.turret(-L * .36, .21, 3, -1);
  let y = s.block(-L * .01, L * .16, .1, s.B * .52, { slope: .1 }); y = s.block(0, L * .1, .1, s.B * .4, { y }); y = s.block(L * .01, L * .06, .09, s.B * .3, { y, slope: .15 }); s.block(L * .015, L * .035, .06, s.B * .2, { y, mat: 'sup2' });   // the pagoda tower
  s.mast(L * .01, .14, 'tower', { y: y + .06, top: 'bed', r: .018 }); s.funnel(-L * .1, .062, .19, { rake: .14 }); s.mast(-L * .17, .22, 'tripod', { top: 'bar' });
  for (const q of [-1, 1]) for (const x of [L * .05, -L * .04, -L * .14]) s.mount(x, q * s.B * .36, .07, x > 0 ? 1 : -1, { n: 2 }); for (const q of [-1, 1]) for (const x of [L * .08, -L * .2, -L * .07]) s.aa(x, q * s.B * .42, .034);
  s.plane(-L * .43, s.deckAt(-L * .43) + .002, 0, Math.PI, 1.1); s.boats(-L * .12, -L * .06, 2); s.lights(); };
K.bcruiser = s => { const L = s.L; s.hull({ fb: .09, flare: .14, sheer: .5, col: '#7a8389', deck: 'wood', rake: .14, entry: .55 });
  s.turret(L * .28, .18, 2, 1); s.turret(L * .17, .17, 2, 1, { raise: .065 }); s.turret(-L * .3, .18, 2, -1);
  let y = s.block(L * .05, L * .12, .09, s.B * .5, { slope: .15 }); y = s.block(L * .07, L * .06, .07, s.B * .34, { y, slope: .2 });
  s.mast(L * .07, .2, 'tripod', { y, top: 'bed' }); s.funnel(-L * .02, .045, .15, { rake: .12 }); s.funnel(-L * .12, .045, .15, { rake: .12 }); s.mast(-L * .2, .18, 'pole', {});
  for (const q of [-1, 1]) { s.mount(-L * .07, q * s.B * .36, .06, 1); s.aa(L * .01, q * s.B * .36, .03); } s.boats(-L * .1, -L * .03, 2); s.lights(); };
K.hcruiser = s => { const L = s.L; s.hull({ fb: .085, flare: .14, sheer: .5, col: BB, rake: .12 });
  s.turret(L * .3, .15, 3, 1); s.turret(L * .19, .145, 3, 1, { raise: .06 }); s.turret(-L * .32, .15, 3, -1);
  let y = s.block(L * .05, L * .13, .1, s.B * .52, { slope: .18 }); y = s.block(L * .07, L * .07, .07, s.B * .36, { y, slope: .2 });
  s.mast(L * .07, .2, 'tripod', { y, top: 'bed' }); s.funnel(-L * .06, .05, .14, { rake: .1 }); s.mast(-L * .17, .16, 'pole', { top: 'bar' });
  for (const q of [-1, 1]) { s.mount(-L * .14, q * s.B * .34, .055, -1, { n: 2 }); s.aa(-L * .02, q * s.B * .38, .03); s.aa(L * .12, q * s.B * .4, .03); }
  s.plane(-L * .23, s.deckAt(-L * .23) + .002, s.B * .18, 0, .9); s.crane(-L * .2, -s.B * .25, .1, .12, 2.5); s.boats(-L * .06, 0, 2); s.lights(); };
K.cruiser = s => { const L = s.L, B = s.B; s.hull({ fb: .085, flare: .14, sheer: .5, col: HAZE, rake: .12, entry: .58 });
  s.turret(L * .31, .13, 3, 1, { rf: 1 }); s.turret(L * .2, .125, 3, 1, { raise: .055 }); s.turret(-L * .22, .125, 3, -1, { raise: .05 }); s.turret(-L * .32, .13, 3, -1);
  const y0 = s.block(L * .07, L * .12, .06, B * .56, { slope: .12, win: false });
  let y = s.tower(L * .085, y0, [[.11, B * .44, .045], [.09, B * .34, .045]], { bridge: 1 }); y = s.director(L * .085, y, .9);
  s.mast(L * .06, .19, 'tripod', { y: y0, top: 'bed' });
  s.funnel(-L * .01, .044, .14, { rake: .14 }); s.funnel(-L * .1, .044, .14, { rake: .14 });
  s.catapult(-L * .055, 0, Math.PI / 2, .12); s.plane(-L * .055, s.deckAt(-L * .055) + .024, 0, Math.PI / 2, .9); s.crane(-L * .14, B * .3, .07, .12, -.6);
  const ya = s.block(-L * .135, L * .05, .05, B * .34, { win: false }); s.director(-L * .135, ya, .8, { dir: -1 });
  for (const q of [-1, 1]) { s.mount(L * .01, q * B * .36, .06, 1, { n: 2 }); s.mount(-L * .155, q * B * .36, .06, -1, { n: 2 }); s.tubes(-L * .06, q * B * .3, 4, .12, q * .9); s.aa(L * .1, q * B * .4, .026); s.aa(-L * .03, q * B * .42, .026); }
  s.boats(-L * .02, L * .02, 1, { y: s.deckAt(0) + .02 }); s.lights(); };
K.aa = s => { const L = s.L; s.hull({ fb: .08, flare: .14, sheer: .45, col: HAZE, rake: .1 });
  s.mount(L * .32, 0, .1, 1, { n: 2 }); s.mount(L * .22, 0, .1, 1, { n: 2, y: s.deckAt(L * .22) + .05 }); s.mount(L * .12, 0, .1, 1, { n: 2, y: s.deckAt(L * .12) + .1 });
  s.mount(-L * .32, 0, .1, -1, { n: 2 }); s.mount(-L * .22, 0, .1, -1, { n: 2, y: s.deckAt(-L * .22) + .05 });
  s.box('sup2', L * .22, s.deckAt(L * .22), 0, .1, .05, .1); s.box('sup2', L * .12, s.deckAt(L * .12), 0, .1, .1, .1); s.box('sup2', -L * .22, s.deckAt(-L * .22), 0, .1, .05, .1);
  let y = s.block(L * .02, L * .1, .12, s.B * .5, { slope: .2 }); s.mast(L * .02, .17, 'tripod', { y, top: 'bed' }); s.funnel(-L * .1, .045, .12, { rake: .08 });
  for (const q of [-1, 1]) for (const x of [L * .08, -L * .03, -L * .16, -L * .38]) s.aa(x, q * s.B * .36, .034); s.lights(); };
K.monitor = s => { const L = s.L; s.hull({ fb: .045, flare: .05, sheer: .2, col: DARKH, rake: .03, stern: 'round', entry: .7 });
  s.turret(L * .2, .3, 2, 1, { len: .5 }); let y = s.block(-L * .06, L * .14, .07, s.B * .4, { slope: .1 }); s.mast(-L * .04, .32, 'tripod', { y, top: 'bar' }); s.funnel(-L * .2, .05, .12, {});
  // anti-torpedo bulges
  for (const q of [-1, 1]) { const b = s.mesh('hull', new T.CapsuleGeometry(.04, L * .5, 4, 10), -L * .02, -.005, q * s.B * .45, 0, 0, Math.PI / 2); b.scale.z = .6; b.geometry.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(b.geometry.attributes.position.count * 3).fill(.3), 3)); }
  s.lights(); };
K.armored = s => { const L = s.L; s.hull({ fb: .09, flare: -.05, tumble: .12, sheer: .2, col: '#3b3f44', boot: '#2b1a17', rake: -.05, stern: 'round', stripe: '#a2382c' });
  s.turret(L * .3, .15, 2, 1, { mat: 'dark' }); s.turret(-L * .32, .15, 2, -1, { mat: 'dark' });
  s.block(0, L * .32, .06, s.B * .7, { mat: 'dark', win: false });   // armoured casemate
  for (const q of [-1, 1]) for (const x of [-L * .1, 0, L * .1]) s.mesh('gun', new T.CylinderGeometry(.01, .013, .08, 8), x, s.deckAt(x) + .035, q * s.B * .4, Math.PI / 2 * q, 0, 0);
  let y = s.block(L * .16, L * .07, .08, s.B * .3, { mat: 'sup2' }); s.funnel(L * .02, .045, .16, { mat: 'black', oval: 1 }); s.funnel(-L * .1, .045, .16, { mat: 'black', oval: 1 }); s.mast(L * .17, .24, 'pole', { y }); s.mast(-L * .22, .2, 'pole', {});
  s.lights(); };
K.flagship = s => { const L = s.L; s.hull({ fb: .1, flare: .16, sheer: .45, col: '#6c7680', deck: 'wood', rake: .12, stripe: '#c7a159' });
  s.turret(L * .3, .18, 2, 1); s.turret(L * .19, .17, 2, 1, { raise: .065 }); s.turret(-L * .32, .18, 2, -1);
  let y = s.block(L * .04, L * .16, .1, s.B * .55, { slope: .1 }); y = s.block(L * .06, L * .1, .09, s.B * .42, { y, slope: .12 }); y = s.block(L * .07, L * .06, .05, s.B * .3, { y, mat: 'gold' });   // the admiral's bridge
  s.mast(L * .07, .26, 'tripod', { y, top: 'bed' }); s.funnel(-L * .08, .05, .16, { rake: .1, band: 'gold' }); s.mast(-L * .2, .22, 'pole', {});
  // flags dressed overall: a line of small coloured flags from the masts to bow and stern
  const fl = ['red', 'yellow', 'navy', 'white', 'green'], yT = y + .2;
  for (let i = 0; i < 14; i++) { const t = i / 13, x = L * (.48 - t * .55), fy = yT - (yT - s.deckAt(x) - .02) * Math.pow(Math.abs(t - .3) / .7, 1.4) * 1; s.box(fl[i % 5], x, Math.max(fy, s.deckAt(x) + .03), 0, .014, .012, .002); }
  for (const q of [-1, 1]) { s.mount(-L * .04, q * s.B * .36, .06, 1, { n: 2 }); s.aa(-L * .16, q * s.B * .34, .03); } s.boats(-L * .14, -L * .05, 2); s.lights(); };
K.ringship = s => { const L = s.L; s.hull({ fb: .1, flare: .1, sheer: .35, col: '#5d666e', rake: .08, bulb: .2 });
  // a ring of six gun houses around a central tower, so it can fire every way at once
  const cx = 0, rr = s.B * .34; s.block(cx, s.B * .9, .04, s.B * .9, { mat: 'sup2', win: false });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.turret(cx + Math.cos(a) * rr * 1.35, .13, 2, 1, { z: Math.sin(a) * rr, y: s.deckAt(cx) + .04 }).rotation.y = -a; }
  let y = s.block(cx, .14, .12, .14, { y: s.deckAt(cx) + .04 }); s.mesh('sup', new T.CylinderGeometry(.06, .075, .1, 16), cx, y + .05, 0); s.mast(cx, .14, 'tower', { y: y + .1, top: 'array', r: .02 });
  s.turret(L * .36, .16, 3, 1); s.turret(-L * .36, .16, 3, -1); s.funnel(-L * .2, .045, .14, { rake: .1 }); s.funnel(L * .2, .04, .12, { rake: .1 }); s.lights(); };
K.allout = s => { const L = s.L; s.hull({ fb: .1, flare: .16, sheer: .45, col: '#e9e9e4', rake: .12 });
  // everything at once: big guns, rockets, torpedoes, AA everywhere — in dazzle camouflage
  s.turret(L * .3, .17, 3, 1, { mat: 'dazzle' }); s.turret(L * .19, .16, 2, 1, { raise: .065, mat: 'dazzle' }); s.turret(-L * .32, .17, 3, -1, { mat: 'dazzle' });
  let y = s.block(L * .04, L * .14, .1, s.B * .52, { mat: 'dazzle', slope: .12 }); y = s.block(L * .06, L * .08, .08, s.B * .38, { y, mat: 'dazzle' });
  s.mast(L * .06, .22, 'tripod', { y, top: 'bed' }); s.funnel(-L * .06, .05, .15, { rake: .1, mat: 'dazzle' }); s.rockets(-L * .18, 0, 4, 5, .6, Math.PI);
  for (const q of [-1, 1]) { s.tubes(-L * .1, q * s.B * .3, 4, .12, q * .9); for (const x of [L * .12, -L * .02, -L * .24]) s.aa(x, q * s.B * .38, .032); } s.lights(); };
K.bracket = s => { const L = s.L; s.hull({ fb: .085, flare: .14, sheer: .5, col: BB, rake: .1 });
  s.turret(L * .28, .15, 2, 1, { rf: 1 }); s.turret(-L * .28, .15, 2, -1, { rf: 1 });
  let y = s.block(L * .06, L * .14, .1, s.B * .5, { slope: .15 }); y = s.block(L * .07, L * .08, .08, s.B * .34, { y });
  // the huge stereo rangefinder that brackets the target
  s.mesh('dark', new T.CylinderGeometry(.018, .018, s.B * .95, 10), L * .07, y + .03, 0, Math.PI / 2, 0, 0); s.cyl('dark', L * .07, y, 0, .03, .035, .02);
  s.mast(L * .07, .2, 'tripod', { y: y + .05, top: 'bar' }); s.funnel(-L * .08, .045, .14, { rake: .1 });
  for (const q of [-1, 1]) s.mount(-L * .16, q * s.B * .32, .055, 1); s.lights(); };
K.rapidship = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: HAZE, rake: .1 });
  // a row of quick-firing guns down both sides
  for (const q of [-1, 1]) for (let i = 0; i < 5; i++) s.mount(L * (.3 - i * .15), q * s.B * .28, .065, q * 1 > 0 ? 1 : 1, { n: 1 });
  s.mount(L * .4, 0, .08, 1, { n: 2 }); s.mount(-L * .4, 0, .08, -1, { n: 2 });
  let y = s.block(L * .08, L * .12, .08, s.B * .3, { slope: .15 }); s.mast(L * .09, .18, 'pole', { y, top: 'bar' }); s.funnel(-L * .04, .04, .12, { rake: .1 }); s.lights(); };
K.gunboat = s => { const L = s.L; s.hull({ fb: .07, flare: .1, sheer: .4, col: '#e6e4dc', boot: '#3b2a1f', rake: .06, stern: 'round', stripe: '#7b4a33' });
  s.turret(L * .3, .13, 1, 1, { len: .2 }); s.mount(-L * .3, 0, .09, -1);
  let y = s.block(L * .06, L * .18, .07, s.B * .5, { mat: 'supW' }); s.block(L * .1, L * .07, .06, s.B * .3, { y, mat: 'wood' });
  s.funnel(-L * .06, .04, .2, { mat: 'yellow', oval: 1, rake: .05 }); s.mast(L * .2, .24, 'pole', {}); s.mast(-L * .2, .22, 'pole', {}); s.lights(); };
K.pursuer = s => { const L = s.L; s.hull({ fb: .085, flare: .22, sheer: .9, col: '#7f8a92', rake: .2, entry: .5 });
  s.turret(L * .28, .12, 2, 1); s.turret(-L * .3, .11, 2, -1);
  let y = s.block(L * .1, L * .12, .08, s.B * .48, { slope: .25 }); s.mast(L * .11, .18, 'pole', { y, top: 'bar' });
  s.funnel(-L * .02, .04, .1, { rake: .25 }); s.funnel(-L * .12, .04, .1, { rake: .25 });
  for (const q of [-1, 1]) s.tubes(-L * .2, q * s.B * .22, 3, .1, q * .9);
  // a white bow wave painted on — she always looks like she is at full speed
  s.lights(); };
// destroyers & small craft
K.destroyer = s => { const L = s.L, B = s.B; s.hull({ fb: .072, flare: .18, sheer: .6, col: HAZE, rake: .13, entry: .55 });
  s.mount(L * .33, 0, .075, 1); const yb = s.block(L * .19, L * .09, .04, B * .5, { win: false }); s.mount(L * .19, 0, .07, 1, { y: yb });
  let y = s.tower(L * .1, s.deckAt(L * .1), [[L * .12, B * .56, .045], [L * .08, B * .46, .04]], { bridge: 1 });
  y = s.director(L * .085, y, .75); s.mast(L * .05, .17, 'tripod', { y: s.deckAt(L * .05) + .045, top: 'bar', r: .008 });
  s.funnel(-L * .02, .033, .1, { rake: .14 }); s.funnel(-L * .12, .033, .1, { rake: .14 });
  s.tubes(-L * .07, 0, 4, .12, 0); s.tubes(-L * .2, 0, 4, .12, 0);
  const ya = s.block(-L * .29, L * .06, .035, B * .4, { win: false }); s.mount(-L * .29, 0, .07, -1, { y: ya }); s.mount(-L * .38, 0, .075, -1);
  for (const q of [-1, 1]) s.aa(-L * .155, q * B * .36, .024); s.searchlight(-L * .07, s.deckAt(0) + .05, 0);
  s.racks(-L * .44, 3); s.lights(); };
K.smoke = s => { K.destroyer(s); const L = s.L;
  // smoke generators at the stern
  for (const q of [-1, 1]) { s.cyl('black', -L * .4, s.deckAt(-L * .4), q * s.B * .22, .018, .018, .05); s.cyl('dark', -L * .4, s.deckAt(-L * .4) + .05, q * s.B * .22, .012, .02, .012); }
  s.fx.smoker = { x: -L * .42, y: s.deckAt(-L * .4) + .06 }; };
K.tboat = s => { const L = s.L; s.hull({ fb: .05, flare: .2, sheer: .5, col: '#57605a', rake: .12, entry: .45, stern: 'transom' });
  let y = s.block(L * .02, L * .18, .045, s.B * .45, { slope: .35 }); s.mesh('glass', new T.BoxGeometry(.03, .022, s.B * .4), L * .1, y - .005, 0, 0, 0, .5);
  for (const q of [-1, 1]) { const t = s.mesh('dark', new T.CylinderGeometry(.018, .018, L * .45, 10), L * .05, s.deckAt(0) + .02, q * s.B * .4, 0, 0, Math.PI / 2); }
  s.aa(-L * .3, 0, .035); s.mast(-L * .05, .08, 'pole', { y }); s.lights(); };
K.patrol = s => { const L = s.L; s.hull({ fb: .05, flare: .18, sheer: .5, col: '#d9dad6', boot: '#a3301f', rake: .1, entry: .5 });
  let y = s.block(L * .05, L * .2, .055, s.B * .5, { mat: 'supW', slope: .3 }); s.mast(L * .02, .1, 'pole', { y, top: 'bar' });
  s.mount(L * .32, 0, .055, 1); s.aa(-L * .3, 0, .035); s.box('red', L * .3, s.deckAt(L * .3) - .03, s.halfAt(L * .3) * .9, .12, .012, .02); s.box('red', L * .3, s.deckAt(L * .3) - .03, -s.halfAt(L * .3) * .9, .12, .012, .02); s.lights(); };
K.subchaser = s => { const L = s.L; s.hull({ fb: .055, flare: .16, sheer: .5, col: HAZE, rake: .1 });
  s.mount(L * .32, 0, .06, 1); let y = s.block(L * .1, L * .16, .06, s.B * .48, { slope: .25 }); s.mast(L * .08, .12, 'pole', { y, top: 'bar' }); s.funnel(-L * .04, .03, .07, {});
  // depth-charge racks and K-guns at the stern
  for (const q of [-1, 1]) { for (let i = 0; i < 4; i++) s.mesh('dark', new T.CylinderGeometry(.012, .012, .018, 10), -L * .36 - i * .022, s.deckAt(-L * .36) + .012, q * s.B * .26, Math.PI / 2, 0, 0); s.mesh('gun', new T.CylinderGeometry(.008, .01, .05, 8), -L * .2, s.deckAt(-L * .2) + .03, q * s.B * .3, q * .6, 0, 0); }
  s.lights(); };
K.sweeper = s => { const L = s.L; s.hull({ fb: .06, flare: .12, sheer: .45, col: '#71665a', boot: '#2d2320', rake: .06, deck: 'wood', stern: 'transom' });   // a wooden hull (no magnetic signature)
  s.mount(L * .3, 0, .055, 1); let y = s.block(L * .05, L * .2, .065, s.B * .5, { slope: .2 }); s.mast(L * .05, .16, 'pole', { y, top: 'bar' }); s.funnel(-L * .1, .03, .07, {});
  // sweep gear: a gallows at the stern, a big reel and the orange floats
  s.mesh('dark', new T.CylinderGeometry(.03, .03, s.B * .5, 14), -L * .3, s.deckAt(-L * .3) + .035, 0, Math.PI / 2, 0, 0); s.box('yellow', -L * .44, s.deckAt(-L * .44), 0, .012, .09, s.B * .7);
  for (const q of [-1, 1]) for (let i = 0; i < 2; i++) s.mesh('orange', new T.SphereGeometry(.02, 10, 8), -L * .38 + i * .05, s.deckAt(-L * .38) + .02, q * s.B * .28);
  s.lights(); };
K.mine = s => { const L = s.L; s.hull({ fb: .065, flare: .12, sheer: .4, col: HAZE, rake: .08 });
  s.mount(L * .32, 0, .06, 1); let y = s.block(L * .12, L * .18, .07, s.B * .5, { slope: .2 }); s.mast(L * .1, .15, 'pole', { y, top: 'bar' }); s.funnel(-L * .02, .035, .09, {});
  // mine rails running aft with mines on them
  for (const q of [-1, 1]) { s.box('dark', -L * .2, s.deckAt(-L * .2), q * s.B * .25, L * .5, .006, .01); for (let i = 0; i < 5; i++) { const x = -L * .05 - i * L * .085; s.mesh('mine', new T.SphereGeometry(.022, 10, 8), x, s.deckAt(x) + .028, q * s.B * .25); s.box('dark', x, s.deckAt(x), q * s.B * .25, .02, .008, .03); } }
  s.lights(); };
K.netlayer = s => { const L = s.L; s.hull({ fb: .07, flare: .1, sheer: .4, col: '#78807c', rake: .02, stern: 'round', entry: .7 });
  // the bow horns that pay out the anti-submarine net
  for (const q of [-1, 1]) { s.mesh('dark', new T.CylinderGeometry(.012, .016, .2, 8), L * .46, s.deckAt(L * .44) + .06, q * .05, q * .35, 0, -.9); }
  s.mesh('dark', new T.CylinderGeometry(.03, .03, s.B * .55, 14), L * .3, s.deckAt(L * .3) + .035, 0, Math.PI / 2, 0, 0);
  let y = s.block(-L * .08, L * .2, .08, s.B * .5); s.mast(-L * .05, .17, 'pole', { y, top: 'bar' }); s.funnel(-L * .22, .035, .1, {});
  for (let i = 0; i < 6; i++) s.float(L * (.12 - i * .03), s.deckAt(0) + .015, s.B * .3, 1); s.mount(-L * .38, 0, .06, -1); s.lights(); };
K.decoy = s => { const L = s.L;
  // a towed decoy raft: a low pontoon with radar reflectors, a mast with a flag and bright floats — it only has to look like a ship on the radar
  for (const q of [-1, 1]) { const p = s.mesh('orange', new T.CapsuleGeometry(s.B * .16, L * .75, 6, 12), 0, .01, q * s.B * .26, 0, 0, Math.PI / 2); }
  s.box('deck', 0, .03, 0, L * .72, .012, s.B * .7); s.box('sup2', 0, .042, 0, L * .2, .05, s.B * .3);
  for (const x of [-L * .25, L * .2]) { const g = s.group(x, .06, 0); s.mesh('radome', new T.OctahedronGeometry(.045), 0, .07, 0, 0, .4, 0, g); s.mesh('sup2', new T.CylinderGeometry(.005, .005, .08, 6), 0, .03, 0, 0, 0, 0, g); }
  s.mesh('sup2', new T.CylinderGeometry(.004, .005, .2, 6), 0, .14, 0); s.box('red', .03, .2, 0, .06, .035, .002); s.mesh('lampW', new T.SphereGeometry(.008, 6, 6), 0, .25, 0);
  s.deckAt = () => .04; };
K.sub = s => { const L = s.L, r = s.B * .4;
  // a long pressure hull mostly under water, the sail, the planes and the rudder
  const h = s.mesh('subhull', new T.CapsuleGeometry(r, L * .82, 8, 18), 0, -r * .62, 0, 0, 0, Math.PI / 2); h.scale.z = .9;
  const sail = new T.BoxGeometry(L * .13, .085, r * .7), p = sail.attributes.position; for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0) p.setX(i, p.getX(i) * .8 - .006); } sail.computeVertexNormals();
  s.mesh('subhull', sail, L * .12, r * .2 + .03, 0); s.mesh('subhull', new T.BoxGeometry(.02, .004, r * 2.6), L * .12, r * .2 + .04, 0);
  s.mesh('gun', new T.CylinderGeometry(.004, .004, .07, 6), L * .13, r * .2 + .11, .006); s.mesh('gun', new T.CylinderGeometry(.003, .003, .05, 6), L * .1, r * .2 + .1, -.006);
  s.mesh('black', new T.BoxGeometry(.05, .004, r * 2.4), -L * .42, -r * .2, 0); s.mesh('black', new T.BoxGeometry(.05, r * 2, .006), -L * .43, -r * .2, 0);
  s.box('deck', 0, r * .3, 0, L * .55, .004, r * .5); s.deckAt = x => r * .32; s.halfAt = () => r; s.mount(L * .3, 0, .05, 1, { y: r * .3 }); };
K.tender = s => { const L = s.L; s.hull({ fb: .075, flare: .12, sheer: .4, col: HAZE, rake: .1 });
  s.mount(L * .34, 0, .065, 1, { n: 2 }); let y = s.block(L * .16, L * .14, .09, s.B * .5, { slope: .15 }); s.mast(L * .17, .17, 'tripod', { y, top: 'bar' }); s.funnel(L * .02, .04, .12, { rake: .08 });
  // the hangar aft, the catapult and the seaplanes on deck
  s.block(-L * .08, L * .16, .06, s.B * .62, { win: false, mat: 'sup2' }); s.box('dark', -L * .3, s.deckAt(-L * .3) + .01, 0, L * .26, .012, .03);
  for (const [x, z] of [[-L * .22, s.B * .18], [-L * .36, -s.B * .18], [-L * .36, s.B * .2]]) { s.plane(x, s.deckAt(x) + .004, z, Math.PI, 1); s.float(x + .005, s.deckAt(x) + .004, z + .015, .6); s.float(x + .005, s.deckAt(x) + .004, z - .015, .6); }
  s.crane(-L * .14, s.B * .3, .14, .16, -.5); s.crane(-L * .14, -s.B * .3, .14, .16, .5); s.lights(); };
K.spotter = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: BB, rake: .1 });
  s.turret(L * .3, .12, 2, 1); let y = s.block(L * .12, L * .14, .09, s.B * .48, { slope: .15 }); s.mast(L * .13, .22, 'tripod', { y, top: 'bed' }); s.funnel(-L * .02, .04, .12, { rake: .08 });
  // an aircraft catapult amidships, aimed diagonally, with the spotter plane on it
  const cg = s.group(-L * .2, s.deckAt(-L * .2) + .03, 0, .7); s.mesh('dark', new T.BoxGeometry(.22, .01, .025), 0, 0, 0, 0, 0, 0, cg); s.cyl('dark', -L * .2, s.deckAt(-L * .2), 0, .02, .025, .03);
  s.plane(-L * .2, s.deckAt(-L * .2) + .038, 0, .7, 1.05, 'yellow'); s.crane(-L * .34, 0, .12, .14, Math.PI); s.lights(); };
K.carrier = s => { const L = s.L; s.hull({ fb: .09, flare: .25, sheer: .25, col: HAZE, rake: .14, bulb: .25, entry: .6 });
  // the flight deck overhangs the hull; the island on the starboard side, aircraft parked aft and forward
  const fd = s.L * 1.02, fw = s.B * 1.25, fy = s.deckAt(0) + .07;
  s.box('sup2', -L * .02, s.deckAt(0), 0, L * .8, fy - s.deckAt(0), s.B * .9);
  s.mesh('flight', new T.BoxGeometry(fd, .012, fw), 0, fy + .006, -s.B * .05);
  const ix = L * .08, iz = s.B * .45; let y = s.block(ix, L * .12, .1, s.B * .2, { y: fy + .012, z: iz }); y = s.block(ix + .02, L * .07, .06, s.B * .16, { y, z: iz, slope: .1 });
  s.funnel(ix - L * .06, .035, .07, { y: fy + .012 + .1, z: iz, oval: 1.3 }); s.mast(ix, .14, 'lattice', { y, z: iz, top: 'bed', w: .04 });
  for (let i = 0; i < 6; i++) s.plane(-L * .36 + (i % 3) * .1, fy + .012, -s.B * .25 + (i / 3 | 0) * .14, 0, 1.25, 'sup2');
  for (let i = 0; i < 3; i++) s.plane(L * .3 + i * .07, fy + .012, -s.B * .2 + (i % 2) * .1, Math.PI, 1.2, 'sup2');
  for (const q of [-1, 1]) for (const x of [-L * .4, -L * .15, L * .25]) s.aa(x, q * fw * .5 + q * .01, .03, { y: fy - .02 });
  s.deckAt = () => fy + .012; s.lights(); };
K.lcarrier = s => { const L = s.L; s.hull({ fb: .08, flare: .2, sheer: .25, col: '#848c92', rake: .1, entry: .62 });
  const fw = s.B * 1.15, fy = s.deckAt(0) + .055; s.box('sup2', 0, s.deckAt(0), 0, L * .78, fy - s.deckAt(0), s.B * .85);
  s.mesh('flight', new T.BoxGeometry(L * .9, .01, fw), -L * .03, fy + .005, 0);
  const iz = s.B * .42; let y = s.block(L * .12, L * .09, .08, s.B * .16, { y: fy + .01, z: iz }); s.mast(L * .12, .12, 'pole', { y, z: iz, top: 'bar' }); s.funnel(L * .04, .03, .05, { y: fy + .01, z: iz });
  for (let i = 0; i < 4; i++) s.plane(-L * .32 + (i % 2) * .1, fy + .01, -s.B * .18 + (i / 2 | 0) * .14, 0, 1.15, 'sup2');
  s.deckAt = () => fy + .01; s.lights(); };
// sensors & electronic warfare
K.radar = s => { const L = s.L; s.hull({ fb: .075, flare: .16, sheer: .55, col: HAZE, rake: .12 });
  s.mount(L * .33, 0, .075, 1, { n: 2 }); let y = s.block(L * .12, L * .16, .09, s.B * .5, { slope: .2 });
  s.mast(L * .12, .2, 'lattice', { y, top: 'bed', w: .05, rs: 1.4 }); s.funnel(-L * .02, .04, .11, { rake: .1 });
  s.mast(-L * .14, .22, 'lattice', { top: 'bed', w: .05, rs: 1.8 }); s.radar(-L * .3, s.deckAt(-L * .3), 'dish', { rs: 1.3 }); s.mount(-L * .38, 0, .07, -1, { n: 2 }); s.lights(); };
K.jammer = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: '#6e7880', rake: .1 });
  s.mount(L * .33, 0, .065, 1); let y = s.block(L * .1, L * .2, .1, s.B * .55, { slope: .15 });
  s.mast(L * .12, .2, 'tower', { y, top: 'array', r: .02 }); for (const x of [-L * .08, -L * .2]) { s.radar(x, s.deckAt(x), 'dome', { rs: 1.3 }); }
  for (const q of [-1, 1]) { s.radar(L * .06, y - .02, 'ecm', { z: q * s.B * .3 }); s.radar(-L * .32, s.deckAt(-L * .32), 'ecm', { z: q * s.B * .25 }); }
  s.mast(-L * .3, .16, 'pole', { top: 'df' }); s.funnel(L * .0, .035, .08, { rake: .08, y: y - .04 }); s.lights(); };
K.ecm = s => { const L = s.L; s.hull({ fb: .08, flare: .2, sheer: .5, col: '#7f8a92', rake: .12, tumble: .1 });   // a stealthy modern hull
  s.mount(L * .32, 0, .07, 1);
  // a pyramid superstructure with the four phased-array faces
  const g = new T.CylinderGeometry(s.B * .18, s.B * .34, .16, 4, 1); g.rotateY(Math.PI / 4); const m = s.mesh('sup', g, L * .08, s.deckAt(L * .08) + .08, 0); m.scale.x = 1.6;
  for (const q of [-1, 1]) { s.mesh('dark', new T.BoxGeometry(.06, .06, .004), L * .08, s.deckAt(L * .08) + .09, q * s.B * .27, -q * .3, 0, 0); s.mesh('dark', new T.BoxGeometry(.004, .06, .06), L * .08 + q * .12, s.deckAt(L * .08) + .09, 0, 0, 0, q * .3); }
  s.mast(L * .08, .14, 'tower', { y: s.deckAt(L * .08) + .16, top: 'dome', r: .014 }); s.vls(L * .26, 0, 2, 4); s.radar(-L * .2, s.deckAt(-L * .2) + .05, 'dome', { rs: 1.2 }); s.box('sup', -L * .2, s.deckAt(-L * .2), 0, L * .2, .05, s.B * .55);
  s.lights(); };
K.intel = s => { const L = s.L; s.hull({ fb: .07, flare: .1, sheer: .45, col: '#52606a', rake: .05, stern: 'cruiser' });   // a converted trawler bristling with antennas
  let y = s.block(L * .18, L * .18, .09, s.B * .55); s.mast(L * .2, .2, 'pole', { y, top: 'df' });
  for (const x of [L * .0, -L * .14]) s.radar(x, s.deckAt(x), 'dome', { rs: 1.2 }); s.box('sup2', -L * .3, s.deckAt(-L * .3), 0, L * .16, .06, s.B * .4);
  for (let i = 0; i < 5; i++) s.mesh('sup2', new T.CylinderGeometry(.003, .003, .16, 4), -L * .35 + i * .03, s.deckAt(-L * .3) + .14, (i % 2 ? 1 : -1) * .03);
  s.mast(-L * .1, .24, 'lattice', { top: 'array', w: .04 }); s.funnel(L * .04, .03, .08, {}); s.lights(); };
K.tracker = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .5, col: HAZE, rake: .1 });
  s.mount(L * .33, 0, .07, 1); let y = s.block(L * .12, L * .16, .09, s.B * .5, { slope: .18 });
  s.mast(L * .12, .22, 'tower', { y, top: 'df', r: .018 }); s.radar(L * .12, y + .1, 'ecm', {});
  s.mast(-L * .18, .26, 'lattice', { top: 'df', w: .045 }); s.radar(-L * .32, s.deckAt(-L * .32), 'df', { rs: 1.3 }); s.funnel(-L * .02, .036, .1, { rake: .1 }); s.lights(); };
K.echo = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: '#7e8890', rake: .1, bulb: .55 });   // the big bow sonar dome
  s.mount(L * .33, 0, .07, 1); let y = s.block(L * .12, L * .16, .09, s.B * .5, { slope: .18 }); s.mast(L * .12, .18, 'tower', { y, top: 'bar', r: .016 }); s.funnel(-L * .02, .04, .1, { rake: .08 });
  // the towed-array winch and its cable going over the stern
  s.mesh('dark', new T.CylinderGeometry(.04, .04, s.B * .45, 18), -L * .3, s.deckAt(-L * .3) + .045, 0, Math.PI / 2, 0, 0); s.mesh('dark', new T.CylinderGeometry(.004, .004, .2, 6), -L * .47, s.deckAt(-L * .45) - .02, 0, 0, 0, Math.PI / 2 - .35);
  s.box('sup', -L * .15, s.deckAt(-L * .15), 0, L * .14, .07, s.B * .45); s.lights(); };
K.hydro = s => { const L = s.L; s.hull({ fb: .07, flare: .12, sheer: .4, col: '#6b7a84', rake: .06 });
  let y = s.block(L * .14, L * .18, .085, s.B * .5); s.mast(L * .14, .16, 'pole', { y, top: 'bar' }); s.funnel(-L * .02, .035, .09, {});
  // hydrophone booms swung out on both sides
  for (const q of [-1, 1]) for (const x of [-L * .1, -L * .3]) { s.mesh('yellow', new T.CylinderGeometry(.006, .008, s.B * .8, 6), x, s.deckAt(x) + .03, q * s.B * .7, Math.PI / 2 - q * .2, 0, 0); s.mesh('dark', new T.CylinderGeometry(.006, .006, .07, 6), x, s.deckAt(x) - .02, q * s.B * 1.05, 0, 0, 0); }
  s.mesh('radome', new T.SphereGeometry(.03, 12, 10), -L * .2, s.deckAt(-L * .2) + .03, 0); s.lights(); };
K.crosser = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: HAZE, rake: .1 });
  s.mount(L * .34, 0, .07, 1); let y = s.block(L * .14, L * .16, .09, s.B * .5, { slope: .18 });
  // two masts carrying crossed antenna arms
  for (const [x, yy] of [[L * .14, y], [-L * .16, s.deckAt(-L * .16)]]) { s.mast(x, .2, 'tower', { y: yy, r: .014, yard: false }); s.mesh('sup2', new T.BoxGeometry(.006, .006, .2), x, yy + .17, 0); s.mesh('sup2', new T.BoxGeometry(.2, .006, .006), x, yy + .17, 0); s.radar(x, yy + .2, 'bar', {}); }
  s.funnel(L * .0, .038, .1, { rake: .08 }); s.mount(-L * .36, 0, .065, -1); s.lights(); };
K.flare = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: BB, rake: .1 });
  s.mount(L * .34, 0, .07, 1, { n: 2 }); let y = s.block(L * .12, L * .16, .09, s.B * .5, { slope: .18 }); s.mast(L * .12, .18, 'tripod', { y, top: 'bar' }); s.funnel(-L * .02, .04, .11, { rake: .1 });
  // star-shell mortars pointing up and big searchlights on platforms
  for (const q of [-1, 1]) for (let i = 0; i < 3; i++) s.mesh('gun', new T.CylinderGeometry(.012, .014, .07, 8), -L * .18 - i * .05, s.deckAt(-L * .2) + .04, q * s.B * .22, 0, 0, q * .2);
  for (const x of [L * .05, -L * .32]) { const yy = s.deckAt(x) + .07; s.cyl('sup2', x, s.deckAt(x), 0, .006, .008, .07); s.mesh('dark', new T.CylinderGeometry(.022, .022, .03, 14), x, yy + .02, 0, 0, 0, Math.PI / 2); s.mesh('lampW', new T.CircleGeometry(.018, 14), x + .016, yy + .02, 0, 0, Math.PI / 2, 0); }
  s.lights(); };
K.missile = s => { const L = s.L; s.hull({ fb: .08, flare: .22, sheer: .55, col: '#828d95', rake: .14, bulb: .3, tumble: .05 });
  s.mount(L * .34, 0, .07, 1, { mat: 'sup' }); s.vls(L * .2, 0, 3, 4);
  let y = s.block(L * .04, L * .18, .11, s.B * .55, { slope: .1 }); for (const q of [-1, 1]) s.mesh('dark', new T.BoxGeometry(.05, .05, .004), L * .1, y - .045, q * (s.B * .28 + .003), 0, 0, 0);
  s.mast(L * .04, .14, 'tower', { y, top: 'bar', r: .014 }); s.funnel(-L * .1, .045, .07, { oval: 1.8 });
  // angled canister launchers amidships
  for (const q of [-1, 1]) s.rockets(-L * .2, q * s.B * .16, 1, 4, .3, q > 0 ? .6 : -.6 + Math.PI);
  s.box('sup', -L * .33, s.deckAt(-L * .33), 0, L * .14, .07, s.B * .55); s.lights(); };
K.rocket = s => { const L = s.L; s.hull({ fb: .07, flare: .14, sheer: .4, col: '#6a756b', rake: .08 });
  s.rockets(L * .3, 0, 5, 6, .55, 0); s.rockets(-L * .32, 0, 5, 6, .55, Math.PI);
  let y = s.block(L * .08, L * .16, .08, s.B * .5, { slope: .15 }); s.mast(L * .08, .16, 'pole', { y, top: 'bar' }); s.funnel(-L * .06, .04, .1, { rake: .06 });
  for (const q of [-1, 1]) s.rockets(-L * .14, q * s.B * .25, 3, 4, .5, q * Math.PI / 2); s.lights(); };
K.dtorp = s => { const L = s.L; s.hull({ fb: .07, flare: .18, sheer: .6, col: HAZE, rake: .14, entry: .52 });
  s.mount(L * .32, 0, .075, 1); let y = s.block(L * .14, L * .14, .07, s.B * .48, { slope: .22 }); s.mast(L * .13, .16, 'pole', { y, top: 'bar' });
  s.funnel(L * .0, .036, .1, { rake: .12 }); s.funnel(-L * .1, .036, .1, { rake: .12 });
  // two big quintuple torpedo mounts on the centreline
  s.tubes(-L * .2, 0, 5, .15, .1); s.tubes(-L * .34, 0, 5, .15, -.1); s.lights(); };
K.suppressor = s => { const L = s.L; s.hull({ fb: .075, flare: .14, sheer: .45, col: '#6a737a', rake: .1 });
  s.turret(L * .3, .12, 2, 1); s.rockets(L * .18, 0, 4, 4, .5, 0);
  let y = s.block(L * .02, L * .16, .09, s.B * .5, { slope: .18 }); s.mast(L * .03, .18, 'tripod', { y, top: 'bed' }); s.funnel(-L * .12, .04, .11, { rake: .1 });
  s.turret(-L * .3, .12, 2, -1); for (const q of [-1, 1]) s.aa(-L * .2, q * s.B * .32, .032); s.lights(); };
K.cship = s => { const L = s.L; s.hull({ fb: .085, flare: .16, sheer: .5, col: '#8a949b', rake: .12, bulb: .25 });   // amphibious command ship: a long superstructure full of antennas
  s.mount(L * .38, 0, .06, 1); let y = s.block(L * .02, L * .5, .09, s.B * .6, { slope: .04 }); y = s.block(L * .1, L * .14, .06, s.B * .4, { y, slope: .2 });
  s.mast(L * .1, .16, 'tower', { y, top: 'bed', r: .016 }); for (const x of [-L * .05, -L * .18]) s.radar(x, s.deckAt(x) + .09, 'dome', { rs: 1.3 });
  s.mast(-L * .12, .18, 'lattice', { y: s.deckAt(-L * .12) + .09, top: 'array', w: .04 }); for (let i = 0; i < 4; i++) s.mesh('sup2', new T.CylinderGeometry(.003, .003, .14, 4), -L * .3 + i * .05, s.deckAt(0) + .16, (i % 2 ? 1 : -1) * s.B * .25);
  s.box('sup', -L * .4, s.deckAt(-L * .4), 0, .03, .002, .03); s.lights(); };
K.breakwater = s => { const L = s.L, B = s.B;   // a wide catamaran with a damping skirt between the hulls
  s.B = B * .42; for (const q of [-1, 1]) { const h = hullParts(L, B * .42, { fb: .07, flare: .1, sheer: .3, col: '#6d7b84', rake: .08 }); const g = s.group(0, 0, q * B * .36); s.mesh('hull', h.side, 0, 0, 0, 0, 0, 0, g); s.mesh('hull', h.transom, 0, 0, 0, 0, 0, 0, g); s.deckAt = h.deckAt; }
  s.B = B; s.halfAt = () => B / 2; s.box('deck', 0, s.deckAt(0) - .005, 0, L * .8, .012, B * .95);
  let y = s.block(L * .05, L * .26, .09, B * .6, { slope: .1 }); s.mast(L * .06, .16, 'tower', { y, top: 'bar', r: .015 });
  for (let i = 0; i < 7; i++) s.box('yellow', -L * .35 + i * L * .1, .0, 0, .02, s.deckAt(0) - .01, B * .45);   // the wave-breaking vanes
  s.lights(); };
K.raider = s => { const L = s.L; s.hull({ fb: .085, flare: .08, sheer: .35, col: '#3a2f2a', boot: '#6a2a22', rake: .06, stern: 'cruiser', entry: .7 });   // an auxiliary cruiser disguised as a tramp steamer
  for (const x of [L * .3, -L * .3]) { s.box('rust', x, s.deckAt(x), 0, L * .1, .015, s.B * .6); s.mesh('rust', new T.CylinderGeometry(.008, .01, .2, 6), x, s.deckAt(x) + .1, 0); s.mesh('rust', new T.CylinderGeometry(.005, .005, .18, 6), x - .03, s.deckAt(x) + .1, 0, 0, 0, .8); }
  let y = s.block(L * .02, L * .16, .07, s.B * .6, { mat: 'supW' }); s.block(L * .04, L * .08, .05, s.B * .45, { y, mat: 'supW' }); s.funnel(-L * .08, .045, .12, { mat: 'black', oval: 1, band: 'red' });
  // the hidden guns behind the hinged bulwark flaps (one is open)
  s.mesh('gun', new T.CylinderGeometry(.009, .012, .09, 8), L * .16, s.deckAt(L * .16) + .03, s.halfAt(L * .16) + .03, Math.PI / 2, 0, 0); s.box('rust', L * .16, s.deckAt(L * .16) - .02, s.halfAt(L * .16) + .012, .05, .006, .03);
  s.lights(); };
K.supply = s => { const L = s.L; s.hull({ fb: .085, flare: .08, sheer: .3, col: '#5e6970', rake: .08, stern: 'transom', entry: .72 });   // a replenishment oiler with kingposts
  let y = s.block(-L * .34, L * .18, .12, s.B * .7); s.block(-L * .34, L * .1, .06, s.B * .5, { y }); s.funnel(-L * .4, .05, .08, { y: y });
  for (const x of [L * .22, L * .02, -L * .16]) { s.mesh('sup2', new T.CylinderGeometry(.012, .015, .2, 8), x, s.deckAt(x) + .1, 0); s.box('sup2', x, s.deckAt(x) + .17, 0, .015, .015, s.B * .9); for (const q of [-1, 1]) s.mesh('dark', new T.CylinderGeometry(.003, .003, .2, 4), x, s.deckAt(x) + .1, q * s.B * .4, q * .35, 0, 0); }
  s.box('dark', -L * .05, s.deckAt(0), 0, L * .55, .02, s.B * .14);   // the fuel lines
  s.box('sup', L * .4, s.deckAt(L * .4), 0, .06, .05, s.B * .4); s.lights(); };
K.repair = s => { const L = s.L; s.hull({ fb: .085, flare: .1, sheer: .35, col: '#6b757c', rake: .06 });
  let y = s.block(L * .26, L * .2, .11, s.B * .62); s.mast(L * .26, .14, 'pole', { y, top: 'bar' });
  s.block(-L * .1, L * .32, .08, s.B * .66, { mat: 'sup2' });   // the workshops
  s.crane(-L * .02, s.B * .2, .2, .26, -.6); s.crane(-L * .24, -s.B * .2, .2, .26, 2.4); s.funnel(-L * .38, .045, .1, { y: s.deckAt(-L * .38) });
  s.mount(L * .42, 0, .055, 1); s.lights(); };
K.plating = s => { K.repair(s); const L = s.L;
  // armour plates stacked on deck ready to be fitted
  for (let i = 0; i < 4; i++) s.box('dark', L * .08, s.deckAt(L * .08) + .085 + i * .011, 0, .09, .009, s.B * .4); for (let i = 0; i < 3; i++) s.box('gun', -L * .3, s.deckAt(-L * .3) + .085 + i * .011, s.B * .15, .07, .009, .05); };
K.hospital = s => { const L = s.L; s.hull({ fb: .09, flare: .08, sheer: .3, col: '#efeee8', boot: '#3e6b55', rake: .1, stern: 'cruiser', stripe: '#3d8b5b' });
  let y = s.block(L * .04, L * .55, .09, s.B * .72, { mat: 'supW' }); y = s.block(L * .08, L * .32, .07, s.B * .56, { y, mat: 'supW' }); s.block(L * .14, L * .1, .05, s.B * .4, { y, mat: 'supW', slope: .2 });
  s.funnel(-L * .06, .05, .1, { y, mat: 'supW', band: 'red', oval: 1.3 }); s.mast(L * .2, .2, 'pole', { y }); s.mast(-L * .3, .2, 'pole', {});
  s.cross(L * .06, y + .001, 0, .1, 'top'); for (const q of [-1, 1]) s.cross(-L * .2, s.deckAt(-L * .2) - .035, q * (s.halfAt(-L * .2) + .002), .07, 'side');
  s.boats(-L * .2, L * .3, 3, { y: s.deckAt(0) + .08 }); s.lights(); };
K.transport = s => { const L = s.L; s.hull({ fb: .09, flare: .06, sheer: .3, col: MERCH, boot: '#8a2c23', rake: .1, stern: 'transom', entry: .74, bulb: .3, stripe: '#e8e6df' });
  let y = s.block(-L * .36, L * .14, .16, s.B * .78, { mat: 'supW' }); s.funnel(-L * .43, .04, .08, { y: y - .04, mat: 'navy', oval: 1.6 }); s.mast(-L * .35, .08, 'pole', { y, top: 'bar' });
  // stacks of containers in the colours of the lines
  const cc = ['#b7362b', '#2d5f8a', '#d0a134', '#3f7a52', '#7d7f82', '#c2622c', '#e6e3da'];
  for (let i = 0; i < 6; i++) for (let r = 0; r < 4; r++) for (let h = 0; h < 2 + ((i + r) % 2); h++) { const x = L * .34 - i * L * .1, z = (r - 1.5) * s.B * .2, b = s.mesh('cargo', new T.BoxGeometry(L * .088, .036, s.B * .18), x, s.deckAt(x) + .019 + h * .037, z); const c = new T.Color(cc[(i * 7 + r * 3 + h * 5) % cc.length]); const n = b.geometry.attributes.position.count; const arr = new Float32Array(n * 3); for (let v = 0; v < n; v++) { arr[v * 3] = c.r; arr[v * 3 + 1] = c.g; arr[v * 3 + 2] = c.b; } b.geometry.setAttribute('color', new T.BufferAttribute(arr, 3)); }
  s.lights(); };
K.ghost = s => K.destroyer(s);
const BEAM = { carrier: .5, lcarrier: .46, battleship: .46, dread: .5, bcruiser: .4, hcruiser: .4, cruiser: .36, aa: .38, monitor: .48, armored: .42, flagship: .44, ringship: .5, allout: .44,
  bracket: .38, rapidship: .36, gunboat: .34, pursuer: .32, destroyer: .26, smoke: .26, tboat: .26, patrol: .28, subchaser: .27, sweeper: .3, mine: .3, netlayer: .34, decoy: .42,
  sub: .26, tender: .38, spotter: .38, radar: .34, jammer: .38, ecm: .36, intel: .34, tracker: .34, echo: .35, hydro: .3, crosser: .34, flare: .36, missile: .34, rocket: .34,
  dtorp: .3, suppressor: .36, cship: .4, breakwater: .62, raider: .38, supply: .44, repair: .42, plating: .42, hospital: .42, transport: .46 };
const NAVY = '#33445a', LIGHT = '#a4acb2', GREEN = '#465a4b';
const PAL = {
  destroyer: { col: NAVY, deckCol: '#3f4a57' }, smoke: { col: NAVY, deckCol: '#3f4a57' }, dtorp: { col: '#3a4b5e', deckCol: '#6a4537' }, subchaser: { col: NAVY, deckCol: '#6a4537' }, pursuer: { col: '#56636e', deckCol: '#6a4537' },
  tboat: { col: GREEN, deckCol: '#55604f' }, patrol: { deckCol: '#d9d6cc' },
  cruiser: { col: LIGHT, deckCol: '#6a6f73' }, aa: { col: LIGHT, deckCol: '#6a4537' }, rapidship: { col: LIGHT, deckCol: '#6c7176' }, flare: { col: '#7c8790', deckCol: '#6a4537' }, spotter: { deckCol: '#6c7176' }, tender: { col: LIGHT, deckCol: '#5d6267' }, suppressor: { col: '#5f6a72', deckCol: '#3f4448' },
  missile: { deckCol: '#4a4f54' }, ecm: { deckCol: '#4a4f54' }, echo: { deckCol: '#4a4f54' }, cship: { deckCol: '#4a4f54' }, crosser: { deckCol: '#4f5559' }, tracker: { deckCol: '#4f5559' }, radar: { col: '#717c85', deckCol: '#4f5559' }, jammer: { deckCol: '#3d4347' }, intel: { deckCol: '#55504a' }, hydro: { deckCol: '#4f5559' },
  repair: { deckCol: '#6b3f33' }, plating: { col: '#5d6870', deckCol: '#6b3f33' }, supply: { deckCol: '#585d61' }, mine: { col: '#4d555c', deckCol: '#3b3f43' }, netlayer: { col: '#5f6d63', deckCol: '#4c5047' },
  hcruiser: { col: '#6c757c', deckCol: '#6a6f73' }, bracket: { col: '#68727a', deckCol: '#6a6f73' }, ringship: { deckCol: '#5b6066' },
};
const DECK_OF = { tender: 1, spotter: 1, missile: 1, ecm: 1, echo: 1, cship: 1, crosser: 1 };   // (those get a helipad aft)
const ALIAS = {};
function build(THREE, k, len, typeKey) {
  T = THREE; materials();
  const key = typeKey || k, L = len * .9, B = (BEAM[key] || .36) * (len <= 2 ? 1.05 : 1), s = new Ship(L, B);
  s.pal = PAL[key] || null; (K[key] || K[ALIAS[key]] || K.destroyer)(s);
  if ({ missile: 1, ecm: 1, cship: 1, crosser: 1, echo: 1 }[key]) s.helipad(-L * .4);
  let seed = 7; for (const ch of key) seed = seed * 31 + ch.charCodeAt(0); s.finish(seed + len);
  const g = s.bake(); g.userData.key = key; g.scale.y = 1.12; return g;   // (a touch taller than true scale: from the game's high camera, real proportions read as flat)
}
root.SeaShips = { build, materials: () => (materials(), M), keys: Object.keys(BEAM) };
})(typeof self !== 'undefined' ? self : this);
