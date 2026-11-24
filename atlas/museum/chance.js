/* World Board Game Atlas — 博物館の「偶然の道具」 (the room of chance, 2026-11-24).
   The ancestors of the die, thrown on a tray: sheep's knucklebones, Egyptian throwing sticks, Ur's four-cornered dice, the cube,
   India's long dice and the six sticks of liubo. Each throw lands in 3D; throw them ten or a hundred times and the bars show which
   results come up often and which rarely, beside what the numbers say they should (exact, from every way the pieces can fall).
   Texts: museum/chance-i18n.js (MUSEUM_CHANCE_T[lang]). Facts and their sources: claude/museum-spec.md (偶然の道具).
   The Ur dice are the game's own (atlas/models/ur-dice.js); the other pieces are made here.
   AtlasChance.render(box, ctx) — the museum (atlas/museum.js) calls it when the room opens or the language changes.
   ctx.open(gameId) opens a game; ctx.goEx(exhibitId) opens a piece in the collection room. */
(function () {
  'use strict';
  const V = 1;
  /* ---------- the tools ----------
     faces: what each piece can show; p: the chance of each (null = all equal); score(vals) → the throw's number (for the bars);
     bins: the bars; hist 'face': the bars count every piece's face (the knucklebone: its uneven sides are the point) */
  const TOOLS = [
    { id: 'talus', kind: 'talus', n: 4, faces: [1, 3, 4, 6], p: [.1, .4, .4, .1], hist: 'face', bins: [1, 3, 4, 6], links: [{ ex: 'senet' }], approx: true,
      score: v => v.reduce((a, b) => a + b, 0) },
    { id: 'sticks', kind: 'senet', n: 4, faces: [1, 0], bins: [1, 2, 3, 4, 5], links: [{ g: 'senet' }, { ex: 'senet' }],
      score: v => v.reduce((a, b) => a + b, 0) || 5 },
    { id: 'tetra', kind: 'tetra', n: 4, faces: [1, 0], bins: [0, 1, 2, 3, 4], links: [{ g: 'ur' }, { ex: 'ur' }],
      score: v => v.reduce((a, b) => a + b, 0) },
    { id: 'cube', kind: 'cube', n: 2, faces: [1, 2, 3, 4, 5, 6], bins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }, { ex: 'goose' }],
      score: v => v[0] + v[1] },
    { id: 'long', kind: 'long', n: 3, faces: [1, 2, 5, 6], bins: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], links: [{ g: 'ludo' }],
      score: v => v[0] + v[1] + v[2] },
    { id: 'liubo', kind: 'liubo', n: 6, faces: [1, 0], bins: [1, 2, 3, 4, 5, 6], links: [{ ex: 'liubo' }],
      score: v => v.reduce((a, b) => a + b, 0) || 6 },
    // (2026-11-24) pachisi's cowries: six shells, counted by the mouths turned up — none 25, one 10, otherwise the number. A real
    // cowrie does not fall mouth-up exactly half the time; the room counts it as half (approx).
    { id: 'cowrie', kind: 'cowrie', n: 6, faces: [1, 0], bins: [2, 3, 4, 5, 6, 10, 25], links: [{ g: 'ludo' }], approx: true,
      score: v => { const c = v.reduce((a, b) => a + b, 0); return c === 0 ? 25 : c === 1 ? 10 : c; } },
    // (2026-11-24) Korea's yut: four half-round sticks, counted by the flat faces up — 1 do, 2 gae, 3 geol, 4 yut, none mo (5).
    // The same arithmetic as the Egyptian sticks, met on the other side of Asia; real sticks fall flat-up a little more than half (approx).
    { id: 'yut', kind: 'yut', n: 4, faces: [1, 0], bins: [1, 2, 3, 4, 5], links: [{ g: 'senet' }], approx: true,
      score: v => v.reduce((a, b) => a + b, 0) || 5 },
  ];
  const ICON = {
    talus: '<path d="M6.5 8.5c0-2.4 2-3.5 4-3 1.2.3 1.8 1 3 1s1.8-.9 3.2-.6c1.8.4 2.8 2.1 2.3 4-.3 1.2-1.3 1.8-1.3 3s1 1.9 1 3.3c0 2-1.9 3.4-4 2.8-1.2-.3-1.7-1.1-3.1-1.1s-2 .9-3.4.7c-1.9-.3-3-2.1-2.5-4 .3-1.1 1.3-1.7 1.3-2.9S6.5 9.8 6.5 8.5z"/><path d="M11 10.5c.8.9 2.2.9 3 0"/>',
    senet: '<rect x="3.5" y="5" width="17" height="3" rx="1.5"/><rect x="3.5" y="10.5" width="17" height="3" rx="1.5" fill="currentColor"/><rect x="3.5" y="16" width="17" height="3" rx="1.5"/>',
    tetra: '<path d="M12 3.5 20.5 19H3.5z"/><path d="M12 3.5 10 19M12 3.5l4 9.5"/><circle cx="12" cy="5.2" r="1.3" fill="currentColor"/>',
    cube: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/>',
    long: '<rect x="2.5" y="8.5" width="19" height="7" rx="2"/><circle cx="7" cy="12" r="1.6"/><circle cx="7" cy="12" r=".4" fill="currentColor"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="12" r=".4" fill="currentColor"/><circle cx="17" cy="12" r="1.6"/><circle cx="17" cy="12" r=".4" fill="currentColor"/>',
    cowrie: '<path d="M12 3.5c4.6 0 7.5 3.8 7.5 8.5S16.6 20.5 12 20.5 4.5 16.7 4.5 12 7.4 3.5 12 3.5z"/><path d="M12 6.5c-.9 2-1 9 0 11" stroke-width="1.6"/><path d="M10.6 9h1M10.5 12h1M10.6 15h1M12.4 9h1M12.5 12h1M12.4 15h1" stroke-width="1"/>',
    liubo: '<path d="M3 6.5h18M3 10.5h18M3 14.5h18M3 18.5h18"/><path d="M5 5.5v2M5 9.5v2M5 13.5v2M5 17.5v2" stroke-width="1.2"/>',
    yut: '<path d="M3.5 6.5h17c0 2-1.6 3.5-3.5 3.5H7c-1.9 0-3.5-1.5-3.5-3.5z"/><path d="M3.5 14h17c0 2-1.6 3.5-3.5 3.5H7c-1.9 0-3.5-1.5-3.5-3.5z" fill="currentColor"/><path d="M8.5 3.5l2 2M10.5 3.5l-2 2M13.5 3.5l2 2M15.5 3.5l-2 2" stroke-width="1.2"/>',
  };
  const TK = { talus: 'talus', sticks: 'senet', tetra: 'tetra', cube: 'cube', long: 'long', liubo: 'liubo', cowrie: 'cowrie', yut: 'yut' };

  /* ---------- the exact chances: every way the pieces can fall ---------- */
  function expected(T) {
    const pr = T.p || T.faces.map(() => 1 / T.faces.length), out = {};
    T.bins.forEach(b => out[b] = 0);
    if (T.hist === 'face') { T.faces.forEach((f, i) => out[f] = pr[i]); return out; }
    const rec = (k, vals, p) => { if (k === T.n) { const s = T.score(vals); out[s] = (out[s] || 0) + p; return; } T.faces.forEach((f, i) => rec(k + 1, vals.concat(f), p * pr[i])); };
    rec(0, [], 1); return out;
  }
  const pick = T => { const pr = T.p; if (!pr) return T.faces[Math.random() * T.faces.length | 0]; let r = Math.random(); for (let i = 0; i < pr.length; i++) { r -= pr[i]; if (r < 0) return T.faces[i]; } return T.faces[T.faces.length - 1]; };
  const roll = T => { const v = []; for (let i = 0; i < T.n; i++) v.push(pick(T)); return v; };
  const venus = v => new Set(v).size === 4, dog = v => v.every(x => x === 1);

  /* ---------- sound: bone and wood on felt ---------- */
  const SND = (() => { let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const click = (a, t, v, f) => { const n = a.createBufferSource(), d = .045, b = a.createBuffer(1, a.sampleRate * d | 0, a.sampleRate), x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3); n.buffer = b;
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.6; const g = a.createGain(); g.gain.value = v; n.connect(bp).connect(g).connect(a.destination); n.start(t); };
    return { land(times, f) { const a = ac(); if (!a) return; const t0 = a.currentTime + .01; times.forEach(([dt, v]) => click(a, t0 + dt, v, f * (.85 + Math.random() * .3))); },
      shake() { const a = ac(); if (!a) return; const t0 = a.currentTime + .01; for (let i = 0; i < 6; i++) click(a, t0 + i * .035 + Math.random() * .02, .12, 2600); } };
  })();

  /* ---------- the 3D tray ---------- */
  let TH = null, R = null, scene = null, cam = null, tray = null, root = null, env = null, key = null;
  let st = null;            // the stage element
  let raf = 0, until = 0, anim = null;
  const view = { yaw: 0, pit: .98, d: 30, r: 8, ty: 0 };
  const pieces = [];        // the pieces on the tray now: { g, kind, v, x, z, yaw }
  const geoCache = {}, matCache = {}, texCache = {};

  const io3 = k => 1 - Math.pow(1 - k, 3);
  function canvasTex(key, w, h, draw, srgb) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new TH.CanvasTexture(c); if (srgb !== false) t.colorSpace = TH.SRGBColorSpace; t.anisotropy = 8; return texCache[key] = t;
  }
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  // bone / ivory: a warm ground with soft blotches and fine pores
  const boneTex = (key, base, a, b) => canvasTex(key, 256, 256, (q, w, h) => { sd = 11; q.fillStyle = base; q.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70, g = q.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, (i % 2 ? a : b) + '55'); g.addColorStop(1, (i % 2 ? a : b) + '00'); q.fillStyle = g; q.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 900; i++) { q.fillStyle = `rgba(70,50,30,${.05 + rnd() * .16})`; q.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1); } });
  function mat(key, o) { return matCache[key] || (matCache[key] = new TH.MeshPhysicalMaterial(o)); }
  const BONE = () => mat('bone', { map: boneTex('bone', '#e4d6ba', '#b89a6a', '#f6eedc'), color: 0xd8cbb2, roughness: .55, clearcoat: .25, clearcoatRoughness: .55 });

  // the rounded box: a box of many faces, each corner pulled onto a sphere of radius r (the six face groups — and their UVs — are kept)
  function roundedBox(hx, hy, hz, r, seg) {
    const g = new TH.BoxGeometry(2 * hx, 2 * hy, 2 * hz, seg, seg, seg), P = g.attributes.position, v = new TH.Vector3(), i3 = new TH.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
      i3.set(Math.max(-hx + r, Math.min(hx - r, v.x)), Math.max(-hy + r, Math.min(hy - r, v.y)), Math.max(-hz + r, Math.min(hz - r, v.z)));
      const d = v.clone().sub(i3); if (d.lengthSq() > 1e-9) { d.setLength(r); v.copy(i3).add(d); } P.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }
  // pips: drilled dots (the cube) or ring-and-dot (the long dice), dark in the hollows
  const pipTex = (key, n, w, h, ring) => canvasTex(key, w, h, (q, W, H) => {
    const base = boneTex('bone', '#e4d6ba', '#b89a6a', '#f6eedc').image; q.drawImage(base, 0, 0, W, H);
    if (!n) return;
    const L = ring ? [...Array(n)].map((_, i) => [(i + .5) / n, .5]) : { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.73, .22], [.27, .5], [.73, .5], [.27, .78], [.73, .78]] }[n];
    const s = ring ? Math.min(H * .2, W / n * .3) : W * .085;
    L.forEach(([x, y]) => { const cx = x * W, cy = y * H;
      if (ring) { q.lineWidth = s * .28; q.strokeStyle = '#3a2614'; q.beginPath(); q.arc(cx, cy, s, 0, 7); q.stroke(); q.fillStyle = '#2a1a0c'; q.beginPath(); q.arc(cx, cy, s * .28, 0, 7); q.fill(); return; }
      const g = q.createRadialGradient(cx - s * .25, cy - s * .25, s * .1, cx, cy, s); g.addColorStop(0, '#120a04'); g.addColorStop(.75, '#2a180a'); g.addColorStop(1, '#6a5030'); q.fillStyle = g; q.beginPath(); q.arc(cx, cy, s, 0, 7); q.fill(); });
  });
  const bumpOf = (key, n, w, h, ring) => canvasTex(key + 'b', w, h, (q, W, H) => { q.fillStyle = '#fff'; q.fillRect(0, 0, W, H); if (!n) return;
    const L = ring ? [...Array(n)].map((_, i) => [(i + .5) / n, .5]) : { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.73, .22], [.27, .5], [.73, .5], [.27, .78], [.73, .78]] }[n];
    const s = ring ? Math.min(H * .2, W / n * .3) : W * .085; q.fillStyle = '#000'; q.strokeStyle = '#000';
    L.forEach(([x, y]) => { if (ring) { q.lineWidth = s * .28; q.beginPath(); q.arc(x * W, y * H, s, 0, 7); q.stroke(); q.beginPath(); q.arc(x * W, y * H, s * .28, 0, 7); q.fill(); } else { q.beginPath(); q.arc(x * W, y * H, s, 0, 7); q.fill(); } }); }, false);

  /* the pieces. Each make() returns a Group whose child [0] is the body; up[v] = the quaternion that turns face v up; rest[v] = the height
     of the group's origin when it lies so (from its own vertices) */
  const Q = (ax, a) => new TH.Quaternion().setFromAxisAngle(ax === 'x' ? new TH.Vector3(1, 0, 0) : ax === 'z' ? new TH.Vector3(0, 0, 1) : new TH.Vector3(0, 1, 0), a);
  function restOf(g, q) {
    let m = Infinity; const v = new TH.Vector3(), M = new TH.Matrix4();
    g.updateMatrixWorld(true); const inv = new TH.Matrix4().copy(g.matrixWorld).invert();
    g.traverse(o => { if (!o.isMesh) return; M.multiplyMatrices(inv, o.matrixWorld); const P = o.geometry.attributes.position;
      for (let i = 0; i < P.count; i += 1) { v.fromBufferAttribute(P, i).applyMatrix4(M).applyQuaternion(q); if (v.y < m) m = v.y; } });
    return -m;
  }
  // the knucklebone: a rounded block, its broad sides one hollow (3, underneath) and one swelling (4), its narrow sides one flat (1) and one
  // notched (6), the ends rounded so it cannot stand on them; a little twist and lopsidedness so it reads as bone, not a cast
  function talusGeo() {
    if (geoCache.talus) return geoCache.talus;
    const g = new TH.SphereGeometry(1, 72, 48), P = g.attributes.position, v = new TH.Vector3();
    const pw = (a, e) => Math.sign(a) * Math.pow(Math.abs(a), e);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
      let x = pw(v.x, .8) * 1.42, y = pw(v.y, .5) * .74, z = pw(v.z, .55) * .96;
      const ex = Math.exp;
      if (y > 0) y += .16 * ex(-((x + .15) * (x + .15) / .9 + z * z / .45)) + .07 * ex(-((x - .7) * (x - .7) / .12 + (z - .3) * (z - .3) / .1));   // 4: the swelling side
      else y += .34 * ex(-((x - .1) * (x - .1) / .32 + z * z / .22)) * Math.min(1, -y / .4);   // 3: the hollow
      if (z > .6) { const t = z - .6; z = .6 + t / (1 + 3.6 * t); }   // 1: the flat narrow side (pressed in smoothly: a hard clamp left a crease)
      if (z < 0) z += .3 * ex(-(x * x) / .16) * Math.min(1, -z / .5) * (1 - .4 * Math.abs(y));   // 6: the notch across the middle
      if (x > .85) x -= .24 * ex(-(z * z) / .09) * Math.min(1, (x - .85) / .4);   // the pulley-grooves at both ends
      if (x < -.95) x += .16 * ex(-((z - .15) * (z - .15)) / .07) * Math.min(1, (-x - .95) / .35);
      z *= 1 - .07 * ex(-(x * x) / .35);   // a slight waist
      const tw = .14 * x, c = Math.cos(tw), s = Math.sin(tw), yy = y * c - z * s, zz = y * s + z * c;   // the twist
      P.setXYZ(i, x * (1 + .04 * Math.sin(3 * yy + 1)), yy, zz);
    }
    g.computeVertexNormals(); return geoCache.talus = g;
  }
  // a split stick: the round back dark (Egypt: ebony / liubo: red lacquer), the flat face pale (ivory / the bamboo's cut)
  function stickGeo(L, w, h) {
    const k = L + 'x' + w; if (geoCache['st' + k]) return geoCache['st' + k];
    const sh = new TH.Shape(); sh.moveTo(-w / 2, 0); for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; sh.lineTo(Math.cos(a) * w / 2, Math.sin(a) * h); } sh.lineTo(-w / 2, 0);
    const back = new TH.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 16 });
    back.translate(0, 0, -L / 2); back.rotateY(Math.PI / 2);   // along x, flat face at y = 0 facing up
    const face = new TH.PlaneGeometry(L - .02, w - .03); face.rotateX(-Math.PI / 2); face.translate(0, .006, 0);
    return geoCache['st' + k] = { back, face };
  }
  // a money cowrie: a glossy dome on a flat underside; the underside carries the mouth, a long slit with teeth on both lips
  function cowrieGeo() {
    if (geoCache.cow) return geoCache.cow;
    const g = new TH.SphereGeometry(1, 64, 40), P = g.attributes.position, v = new TH.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
      let x = v.x * 1.25, y = v.y, z = v.z * .9;
      if (y < -.12) y = -.12 - (y + .12) * .12;   // the flat base, a little rounded
      y *= y > 0 ? .78 * (1 - .06 * Math.cos(x * 2.4)) : 1;   // the dome, a touch humped
      z *= 1 - .08 * x * x;   // narrower at the ends
      P.setXYZ(i, x, y, z); }
    g.computeVertexNormals();
    const base = new TH.Shape(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; base.lineTo(Math.cos(a) * 1.12, Math.sin(a) * .74 * (1 - .06 * Math.cos(a) * Math.cos(a))); }
    const face = new TH.ShapeGeometry(base, 48); face.rotateX(Math.PI / 2); face.translate(0, -.128, 0);   // facing down
    const uv = face.attributes.uv, fp = face.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (fp.getX(i) + 1.15) / 2.3, (fp.getZ(i) + .8) / 1.6);
    return geoCache.cow = { dome: g, face };
  }
  function makePiece(kind) {
    const g = new TH.Group(), body = new TH.Group(); g.add(body);
    const mesh = (geo, m) => { const o = new TH.Mesh(geo, m); o.castShadow = o.receiveShadow = true; body.add(o); return o; };
    let up = {}, scale = 1;
    if (kind === 'talus') { mesh(talusGeo(), BONE()); body.scale.set(.95 + Math.random() * .1, .95 + Math.random() * .1, .95 + Math.random() * .1); up = { 4: Q('x', 0), 3: Q('x', Math.PI), 1: Q('x', -Math.PI / 2), 6: Q('x', Math.PI / 2) }; }
    if (kind === 'senet' || kind === 'liubo') {
      const L = kind === 'senet' ? 11 : 14, w = kind === 'senet' ? 1.5 : 1.15, h = kind === 'senet' ? .5 : .42, G = stickGeo(L, w, h);
      const backM = kind === 'senet' ? mat('ebony', { color: 0x080504, roughness: .32, clearcoat: .55, clearcoatRoughness: .3 }) : mat('lacq', { color: 0x3a0b06, roughness: .4, clearcoat: .45, clearcoatRoughness: .4 });
      const faceM = kind === 'senet'
        ? mat('ivoryface', { map: canvasTex('ivf', 512, 64, (q, W, H) => { q.drawImage(boneTex('bone', '#e4d6ba', '#b89a6a', '#f6eedc').image, 0, 0, W, H); q.fillStyle = '#1c120c'; q.fillRect(0, 0, W * .06, H); q.fillRect(W * .94, 0, W * .06, H); q.fillStyle = 'rgba(28,18,12,.85)'; [.1, .13, .87, .9].forEach(x => q.fillRect(W * x, 0, 3, H)); }), color: 0xffffff, roughness: .5, clearcoat: .3 })
        : mat('bamboo', { map: canvasTex('bam', 512, 64, (q, W, H) => { q.fillStyle = '#d9c491'; q.fillRect(0, 0, W, H); sd = 5; for (let i = 0; i < 60; i++) { q.fillStyle = `rgba(150,110,50,${.08 + rnd() * .15})`; q.fillRect(0, rnd() * H, W, 1 + rnd()); } q.fillStyle = 'rgba(120,80,30,.55)'; [.33, .7].forEach(x => q.fillRect(W * x, 0, 4, H)); }), color: 0xffffff, roughness: .62 });
      mesh(G.back, backM); mesh(G.face, faceM);
      up = { 1: Q('x', 0), 0: Q('x', Math.PI) };
    }
    if (kind === 'yut') {
      // a split round stick of birch: the bark-side back rounded and warm, the cut face pale with the old X-marks burned in
      const G = stickGeo(12, 1.9, .82);
      const back = mat('yutB', { map: canvasTex('yutb', 512, 64, (q, W, H) => { sd = 31; q.fillStyle = '#b07a44'; q.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { q.fillStyle = `rgba(${rnd() < .5 ? '90,52,24' : '210,160,105'},${.1 + rnd() * .18})`; q.fillRect(0, rnd() * H, W, 1 + rnd() * 1.5); } }), color: 0xffffff, roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      const face = mat('yutF', { map: canvasTex('yutf', 512, 96, (q, W, H) => { sd = 33; q.fillStyle = '#ecd9b4'; q.fillRect(0, 0, W, H); for (let i = 0; i < 50; i++) { q.fillStyle = `rgba(170,120,70,${.06 + rnd() * .12})`; q.fillRect(0, rnd() * H, W, 1 + rnd()); }
        q.strokeStyle = '#3a2412'; q.lineWidth = 7; q.lineCap = 'round'; [.3, .5, .7].forEach(x => { const c = W * x, r = H * .26; q.beginPath(); q.moveTo(c - r, H / 2 - r); q.lineTo(c + r, H / 2 + r); q.moveTo(c + r, H / 2 - r); q.lineTo(c - r, H / 2 + r); q.stroke(); }); }), color: 0xffffff, roughness: .6 });
      mesh(G.back, back); mesh(G.face, face);
      up = { 1: Q('x', 0), 0: Q('x', Math.PI) };
    }
    if (kind === 'cowrie') {
      const G = cowrieGeo();
      const shell = mat('cowrie', { map: canvasTex('cowt', 256, 256, (q, W, H) => { sd = 21; const gr = q.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4ead2'); gr.addColorStop(.5, '#ecdcb4'); gr.addColorStop(1, '#f6eed8'); q.fillStyle = gr; q.fillRect(0, 0, W, H);
        for (let i = 0; i < 70; i++) { q.fillStyle = `rgba(${rnd() < .5 ? '200,170,110' : '250,245,232'},${.12 + rnd() * .2})`; q.beginPath(); q.arc(rnd() * W, rnd() * H, 2 + rnd() * 9, 0, 7); q.fill(); } }), color: 0xffffff, roughness: .18, clearcoat: 1, clearcoatRoughness: .08 });
      const under = mat('cowrieU', { map: canvasTex('cowu', 512, 256, (q, W, H) => { q.fillStyle = '#efe4c8'; q.fillRect(0, 0, W, H);
        const g2 = q.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .5); g2.addColorStop(0, 'rgba(225,205,160,.0)'); g2.addColorStop(1, 'rgba(205,180,130,.5)'); q.fillStyle = g2; q.fillRect(0, 0, W, H);
        q.fillStyle = '#3a2a1a'; q.beginPath(); q.moveTo(W * .1, H * .5); q.bezierCurveTo(W * .35, H * .43, W * .65, H * .43, W * .9, H * .52); q.bezierCurveTo(W * .65, H * .56, W * .35, H * .56, W * .1, H * .5); q.fill();
        q.strokeStyle = '#d9c79e'; q.lineWidth = 5; q.lineCap = 'round';
        for (let i = 0; i < 13; i++) { const x = W * (.18 + i * .052); q.beginPath(); q.moveTo(x, H * .41); q.lineTo(x + 2, H * .47); q.stroke(); q.beginPath(); q.moveTo(x + 6, H * .59); q.lineTo(x + 4, H * .53); q.stroke(); } }), color: 0xffffff, roughness: .35, clearcoat: .6, clearcoatRoughness: .2 });
      mesh(G.dome, shell); mesh(G.face, under); body.scale.setScalar(1.15);
      up = { 0: Q('x', 0), 1: Q('x', Math.PI) };   // 1: the mouth up
    }
    if (kind === 'tetra') {
      const D = window.UrDice3D; const d = D.die({ look: 'bone' }); scale = 1.45 / D.DR; d.scale.setScalar(scale); d.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); body.add(d);
      const tf = new TH.Object3D(); [1, 0].forEach(m => { D.dieUp(tf, !!m, 0); up[m] = tf.quaternion.clone(); });
    }
    if (kind === 'cube') {
      const geo = geoCache.cube || (geoCache.cube = roundedBox(.8, .8, .8, .2, 10));
      // BoxGeometry's faces: +x −x +y −y +z −z → 3 4 1 6 2 5 (opposite faces make seven)
      const vals = [3, 4, 1, 6, 2, 5];
      const ms = vals.map(n => mat('cube' + n, { map: pipTex('cp' + n, n, 256, 256), bumpMap: bumpOf('cp' + n, n, 256, 256), bumpScale: 1.4, color: 0xffffff, roughness: .45, clearcoat: .35, clearcoatRoughness: .45 }));
      mesh(geo, ms); up = { 1: Q('x', 0), 6: Q('x', Math.PI), 2: Q('x', -Math.PI / 2), 5: Q('x', Math.PI / 2), 3: Q('z', Math.PI / 2), 4: Q('z', -Math.PI / 2) };
    }
    if (kind === 'long') {
      const geo = geoCache.long || (geoCache.long = roundedBox(2.5, .56, .56, .16, 10));
      const vals = [0, 0, 1, 6, 2, 5];   // the ends unmarked; +y 1, −y 6, +z 2, −z 5
      const ms = vals.map((n, i) => mat('long' + i, { map: pipTex('lp' + n + (i < 2 ? 'e' : ''), n, 512, 128, true), bumpMap: bumpOf('lp' + n, n, 512, 128, true), bumpScale: 1.2, color: 0xffffff, roughness: .45, clearcoat: .35, clearcoatRoughness: .45 }));
      mesh(geo, ms); up = { 1: Q('x', 0), 6: Q('x', Math.PI), 2: Q('x', -Math.PI / 2), 5: Q('x', Math.PI / 2) };
    }
    const rest = {}; for (const k in up) rest[k] = restOf(g, up[k]);
    g.userData = { kind, up, rest };
    return g;
  }

  function envMap() {
    const s = new TH.Scene(), pm = new TH.PMREMGenerator(R);
    s.add(new TH.Mesh(new TH.BoxGeometry(20, 12, 20), new TH.MeshBasicMaterial({ color: 0x1a120c, side: TH.BackSide })));
    const panel = (w, h, c, x, y, z, rx, ry) => { const m = new TH.Mesh(new TH.PlaneGeometry(w, h), new TH.MeshBasicMaterial({ color: c, side: TH.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); s.add(m); };
    panel(1.6, 7, 0xd8cdb8, -3.2, 5.9, -1.5, Math.PI / 2); panel(1.6, 7, 0xb8ad9c, 3.4, 5.9, 2.5, Math.PI / 2); panel(6, 4, 0x7a5a3a, 0, 2, -9.9); panel(6, 4, 0x5a4636, 9.9, 2, 0, 0, Math.PI / 2);
    const rt = pm.fromScene(s, .04); pm.dispose(); s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); return rt;
  }
  // the tray: a walnut frame round a deep green felt
  function makeTray() {
    const g = new TH.Group(), W = 40, D = 28, F = 2.2, Hh = 1.8;
    const felt = canvasTex('felt', 512, 512, (q, w, h) => { sd = 3; q.fillStyle = '#21443d'; q.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { q.strokeStyle = `rgba(${rnd() < .5 ? '10,30,26' : '70,110,96'},${.08 + rnd() * .16})`; q.lineWidth = .6; const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, l = 2 + rnd() * 5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); } });
    felt.wrapS = felt.wrapT = TH.RepeatWrapping; felt.repeat.set(3, 2.1);
    const base = new TH.Mesh(new TH.PlaneGeometry(W - 2 * F, D - 2 * F), new TH.MeshStandardMaterial({ map: felt, color: 0xffffff, roughness: .96 })); base.rotation.x = -Math.PI / 2; base.receiveShadow = true; g.add(base);
    const wood = canvasTex('walnut', 1024, 128, (q, w, h) => { sd = 9; const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a2f1d'); gr.addColorStop(1, '#3a2416'); q.fillStyle = gr; q.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) { q.strokeStyle = `rgba(${rnd() < .5 ? '20,10,4' : '120,80,48'},${.08 + rnd() * .2})`; q.lineWidth = .6 + rnd() * 1.6; const y = rnd() * h, a = rnd() * 3; q.beginPath(); q.moveTo(0, y); for (let x = 0; x <= w; x += 32) q.lineTo(x, y + Math.sin(x / 90 + a) * 3 + Math.sin(x / 23 + a * 2) * 1); q.stroke(); } });
    wood.wrapS = wood.wrapT = TH.RepeatWrapping;
    const wm = new TH.MeshPhysicalMaterial({ map: wood, color: 0xffffff, roughness: .4, clearcoat: .5, clearcoatRoughness: .35 });
    const bar = (w, d, x, z, rot) => { const m = new TH.Mesh(roundedBox(w / 2, Hh / 2, d / 2, .3, 4), wm); m.position.set(x, Hh / 2 - .25, z); if (rot) m.rotation.y = rot; m.castShadow = m.receiveShadow = true; g.add(m); };
    bar(W, F, 0, -(D - F) / 2); bar(W, F, 0, (D - F) / 2); bar(D - 2 * F + .02, F, -(W - F) / 2, 0, Math.PI / 2); bar(D - 2 * F + .02, F, (W - F) / 2, 0, Math.PI / 2);
    const under = new TH.Mesh(new TH.BoxGeometry(W, .6, D), wm); under.position.y = -.31; under.receiveShadow = true; g.add(under);
    const floor = new TH.Mesh(new TH.PlaneGeometry(400, 400), new TH.ShadowMaterial({ opacity: .35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.62; floor.receiveShadow = true; g.add(floor);
    return g;
  }
  function init3D(cv) {
    TH = window.THREE;
    R = new TH.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 820 ? 1.75 : 2));
    R.outputColorSpace = TH.SRGBColorSpace; R.toneMapping = TH.ACESFilmicToneMapping; R.toneMappingExposure = .9;
    R.shadowMap.enabled = true; R.shadowMap.type = TH.PCFSoftShadowMap;
    scene = new TH.Scene(); env = envMap(); scene.environment = env.texture; scene.environmentIntensity = .55;
    scene.add(new TH.HemisphereLight(0xfff2e0, 0x1a1410, .42));
    key = new TH.SpotLight(0xfff0dc, 1.7, 0, .62, .55, 0); key.position.set(16, 34, 14); key.target.position.set(0, 0, 0); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 3; key.shadow.camera.near = 10; key.shadow.camera.far = 80;
    scene.add(key, key.target);
    const rim = new TH.DirectionalLight(0xcfe0ff, .5); rim.position.set(-20, 6, -24); scene.add(rim);
    tray = makeTray(); scene.add(tray); root = new TH.Group(); scene.add(root);
    cam = new TH.PerspectiveCamera(30, 1, .5, 400);
  }
  function place() {
    const S = view; cam.position.set(S.d * Math.cos(S.pit) * Math.sin(S.yaw), S.ty + S.d * Math.sin(S.pit), S.d * Math.cos(S.pit) * Math.cos(S.yaw)); cam.lookAt(0, S.ty, 0);
  }
  function fit() {
    const w = st.clientWidth, h = st.clientHeight; if (!w || !h) return false;
    R.setSize(w, h, false); cam.aspect = w / h;
    const vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    view.d = view.r / Math.sin(Math.min(vf, hf) / 2) * 1.02; cam.near = view.d * .2; cam.far = view.d * 4; cam.updateProjectionMatrix(); return true;
  }
  function frame() {
    raf = 0; const now = performance.now();
    if (anim && anim(now) === false) anim = null;
    place(); R.render(scene, cam); badges();
    if (anim || now < until) raf = requestAnimationFrame(frame);
  }
  const kick = ms => { until = Math.max(until, performance.now() + (ms || 120)); if (!raf) raf = requestAnimationFrame(frame); };

  /* ---------- the layout of a tool's pieces on the tray, and its framing ---------- */
  function slots(T) {
    const k = T.kind, n = T.n, out = [];
    if (k === 'senet' || k === 'liubo' || k === 'long') { const gap = k === 'long' ? 2.3 : k === 'senet' ? 2.6 : 2.1; for (let i = 0; i < n; i++) out.push([((i % 2) - .5) * (k === 'long' ? 1.4 : 1.8), (i - (n - 1) / 2) * gap]); return { s: out, r: k === 'long' ? 5.6 : k === 'senet' ? 8 : 9.6, yawJ: .12 }; }
    if (k === 'yut') { for (let i = 0; i < n; i++) out.push([((i % 2) - .5) * 1.6, (i - (n - 1) / 2) * 3]); return { s: out, r: 8.6, yawJ: .12 }; }
    if (k === 'cowrie') { for (let i = 0; i < n; i++) out.push([((i % 3) - 1) * 3.2 + (i > 2 ? .9 : 0), (i > 2 ? 1.5 : -1.5)]); return { s: out, r: 6.2, yawJ: Math.PI }; }
    const gap = k === 'cube' ? 3.6 : k === 'tetra' ? 3.8 : 3.9;
    for (let i = 0; i < n; i++) out.push([(i - (n - 1) / 2) * gap, (i % 2 ? .7 : -.7) * (k === 'cube' ? .4 : 1)]);
    return { s: out, r: k === 'cube' ? 4.4 : k === 'talus' ? 6.8 : 7, yawJ: Math.PI };
  }
  function setTool(T) {
    pieces.forEach(p => root.remove(p.g)); pieces.length = 0;
    const L = slots(T); view.r = L.r; view.yaw = 0; view.pit = .98;
    for (let i = 0; i < T.n; i++) { const g = makePiece(T.kind); root.add(g); pieces.push({ g, kind: T.kind, v: null, x: L.s[i][0], z: L.s[i][1], yaw: 0 }); }
    // at rest before the first throw: each showing its first face, neatly in its place
    lay(T, pieces.map((_, i) => T.faces[(i * 3 + 1) % T.faces.length]));
    fit(); kick(200);
  }
  function lay(T, vals) {
    const L = slots(T);
    pieces.forEach((p, i) => { p.v = vals[i]; const U = p.g.userData; p.yaw = (Math.random() - .5) * 2 * Math.min(L.yawJ, .3);
      p.g.quaternion.copy(Q('y', p.yaw)).multiply(U.up[p.v]); p.g.position.set(p.x, U.rest[p.v], p.z); });
  }
  // a throw: each piece comes in from the near side, falls, bounces twice and settles on its face (the face was drawn first)
  function throwAnim(T, vals, done) {
    const L = slots(T), t0 = performance.now(), dur = 1250;
    const plan = pieces.map((p, i) => { const U = p.g.userData, v = vals[i], yaw = (Math.random() - .5) * 2 * L.yawJ, x = L.s[i][0] + (Math.random() - .5) * .8, z = L.s[i][1] + (Math.random() - .5) * .6;
      const qF = Q('y', yaw).multiply(U.up[v]), ax = new TH.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
      return { p, v, x, z, yaw, qF, ax, w: (3 + Math.random() * 2.5) * Math.PI, rest: U.rest[v], sx: x + (Math.random() - .5) * 6, sz: z + 15 + Math.random() * 5, h0: 7 + Math.random() * 3, dl: i * 55 + Math.random() * 40 }; });
    hideBadges(); SND.shake();
    SND.land(plan.flatMap(q => [[(q.dl + .42 * dur) / 1000, .5], [(q.dl + .66 * dur) / 1000, .22], [(q.dl + .8 * dur) / 1000, .1]]), T.kind === 'senet' || T.kind === 'liubo' || T.kind === 'yut' ? 1500 : 2600);
    const qa = new TH.Quaternion();
    anim = now => { let busy = false;
      plan.forEach(q => { const t = Math.max(0, (now - t0 - q.dl) / dur); if (t < 1) busy = true; const k = Math.min(1, t), g = q.p.g;
        const e = io3(Math.min(1, k / .8)); g.position.x = q.sx + (q.x - q.sx) * e; g.position.z = q.sz + (q.z - q.sz) * e;
        let y; if (k < .42) { const a = k / .42; y = q.rest + q.h0 * (1 - a * a); } else if (k < .66) y = q.rest + 1.5 * Math.sin(Math.PI * (k - .42) / .24); else if (k < .8) y = q.rest + .4 * Math.sin(Math.PI * (k - .66) / .14); else y = q.rest;
        g.position.y = y;
        const s = Math.pow(1 - Math.min(1, k / .86), 2); qa.setFromAxisAngle(q.ax, q.w * s); g.quaternion.copy(q.qF).multiply(qa); });
      if (!busy) { plan.forEach(q => { q.p.v = q.v; q.p.yaw = q.yaw; q.p.g.position.set(q.x, q.rest, q.z); q.p.g.quaternion.copy(q.qF); }); if (done) done(); return false; }
      return true; };
    kick(dur + 600);
  }

  /* ---------- the badges over the pieces after a throw ---------- */
  let bEl = null, bOn = false, bVals = null;
  function hideBadges() { bOn = false; if (bEl) bEl.classList.remove('on'); }
  function showBadges(T, vals) { bVals = vals.map(v => T.kind === 'talus' || T.kind === 'cube' || T.kind === 'long' ? { t: String(v), on: true } : { t: v ? '+1' : '0', on: !!v });
    bEl.innerHTML = bVals.map(b => `<span class="chb${b.on ? '' : ' off'}">${b.t}</span>`).join(''); bOn = true; badges(); requestAnimationFrame(() => bEl && bEl.classList.add('on')); }
  function badges() {
    if (!bOn || !bEl) return; const v = new TH.Vector3(), W = st.clientWidth, H = st.clientHeight, els = bEl.children;
    pieces.forEach((p, i) => { const e = els[i]; if (!e) return; const ox = { senet: 6.4, liubo: 7.9, long: 3.3, yut: 6.9 }[p.kind]; if (ox) v.set(p.x + ox, .4, p.z); else v.set(p.x, p.g.userData.rest[p.v] * 2 + .9, p.z); v.project(cam); e.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H).toFixed(1)}px)`; });
  }

  /* ---------- the room ---------- */
  let host = null, ctx = null, lang = 'ja', tool = null, busy = false, el = {};
  const data = {};   // per tool: { n, c: {bin: count}, venus, dog }
  const tx = () => (window.MUSEUM_CHANCE_T || {})[lang] || (window.MUSEUM_CHANCE_T || {}).en || {};
  const u = k => { const a = tx(), b = (window.MUSEUM_CHANCE_T || {}).en || {}; return (a.ui && a.ui[k]) || (b.ui && b.ui[k]) || k; };
  const tt = id => tx()[id] || ((window.MUSEUM_CHANCE_T || {}).en || {})[id] || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
  const pct = x => { const p = x * 100; return (p >= 10 || p === 0 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)) + '%'; };
  const D = id => data[id] || (data[id] = { n: 0, c: {}, venus: 0, dog: 0 });

  function result(T, vals) {
    const s = T.score(vals), x = tt(T.id);
    if (T.kind === 'talus') return fmt(u('sum'), { n: s }) + (venus(vals) ? ' — ' + u('venus') : dog(vals) ? ' — ' + u('dog') : '');
    if (T.kind === 'cube' || T.kind === 'long') return vals.join(' + ') + ' = ' + s;
    const c = vals.reduce((a, b) => a + b, 0);
    return fmt(x.res || '{c} → {n}', { c, n: s, w: x.names ? x.names[s - 1] : '' });
  }
  function count(T, vals) {
    const d = D(T.id); d.n++;
    if (T.hist === 'face') vals.forEach(v => d.c[v] = (d.c[v] || 0) + 1); else { const s = T.score(vals); d.c[s] = (d.c[s] || 0) + 1; }
    if (T.kind === 'talus') { if (venus(vals)) d.venus++; if (dog(vals)) d.dog++; }
  }
  function hist(T) {
    const d = D(T.id), E = expected(T), tot = T.hist === 'face' ? d.n * T.n : d.n, B = T.bins;
    const obs = B.map(b => tot ? (d.c[b] || 0) / tot : 0), ex = B.map(b => E[b] || 0);
    const top = Math.max(...ex, ...obs) * 1.12 || 1, W = 320, H = 150, pad = 4, bw = (W - pad * 2) / B.length;
    let s = `<svg class="chsvg" viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="${esc(u('obs'))}">`;
    for (let i = 1; i <= 3; i++) s += `<line x1="0" x2="${W}" y1="${(H - H * i / 4).toFixed(1)}" y2="${(H - H * i / 4).toFixed(1)}" class="chgl"/>`;
    B.forEach((b, i) => { const x = pad + i * bw, ho = H * obs[i] / top, he = H * ex[i] / top;
      s += `<rect class="chob" x="${(x + bw * .14).toFixed(1)}" y="${(H - ho).toFixed(1)}" width="${(bw * .72).toFixed(1)}" height="${Math.max(0, ho).toFixed(1)}" rx="${Math.min(4, bw * .12).toFixed(1)}"><title>${b}: ${pct(obs[i])} / ${pct(ex[i])}</title></rect>`;
      s += `<line class="chex" x1="${(x + bw * .08).toFixed(1)}" x2="${(x + bw * .92).toFixed(1)}" y1="${(H - he).toFixed(1)}" y2="${(H - he).toFixed(1)}"/>`;
      s += `<text class="chbl" x="${(x + bw / 2).toFixed(1)}" y="${H + 15}">${b}</text>`; });
    s += `<line x1="0" x2="${W}" y1="${H}" y2="${H}" class="chax"/></svg>`;
    el.hist.innerHTML = s;
    el.n.textContent = d.n ? fmt(u('count'), { n: d.n.toLocaleString() }) : u('none');
    let extra = '';
    if (T.kind === 'talus') { const pv = E && 24 * .1 * .4 * .4 * .1; extra = fmt(u('venusN'), { n: d.venus, e: pct(pv) }); }
    el.extra.textContent = extra; el.extra.hidden = !extra;
    el.exLab.textContent = T.approx ? u('approx') : u('exp');
  }
  const MK = (r, ids, n) => { try { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark(r, ids, n); } catch (e) {} };   // (館内スタンプ帳)
  function doThrow(times) {
    if (busy || !tool) return; const T = tool; MK('chance', T.id, TOOLS.length);
    let last = null; for (let i = 0; i < times; i++) { last = roll(T); count(T, last); }
    busy = true; el.res.textContent = ''; el.res.classList.remove('on');
    if (times > 1) hist(T);
    throwAnim(T, last, () => { busy = false; showBadges(T, last); el.res.textContent = result(T, last); el.res.classList.add('on'); if (times === 1) hist(T); });
  }
  function texts() {
    const T = tool, x = tt(T.id);
    el.tools.querySelectorAll('[data-t]').forEach(b => { const y = tt(b.dataset.t); b.querySelector('b').textContent = y.name || b.dataset.t; b.querySelector('small').textContent = y.short || ''; b.setAttribute('aria-selected', b.dataset.t === T.id); });
    { const on = el.tools.querySelector('[aria-selected=true]'); if (on && el.tools.scrollWidth > el.tools.clientWidth) el.tools.scrollTo({ left: on.offsetLeft - (el.tools.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' }); }   // (a phone's chip row: the chosen tool stays in sight)
    el.lead.textContent = u('lead');
    el.name.textContent = x.name || T.id; el.sub.textContent = x.sub || '';
    el.body.innerHTML = (x.p || []).map(p => `<p>${esc(p)}</p>`).join('');
    el.fact.innerHTML = x.fact ? `<b>${esc(u('fact'))}</b>${esc(x.fact)}` : ''; el.fact.hidden = !x.fact;
    el.note.textContent = x.note || ''; el.note.hidden = !x.note;
    const games = ctx.games || [];
    const links = T.links.map(L => { if (L.g) { const g = games.find(q => q.id === L.g); return g ? `<button type="button" class="chlk" data-g="${L.g}"><i>${esc(u('game'))}</i>${esc(ctx.gname ? ctx.gname(g) : L.g)}</button>` : ''; }
      const mu = (window.ATLAS_MU || {})[L.ex], nm = (mu && mu.n && (mu.n[lang] || mu.n.en)) || (tx().ex || {})[L.ex] || (((window.MUSEUM_CHANCE_T || {}).en || {}).ex || {})[L.ex]; return `<button type="button" class="chlk ex" data-ex="${L.ex}"><i>${esc(u('exhibit'))}</i>${esc(nm || L.ex)}</button>`; }).join('');
    el.links.innerHTML = links ? `<h4>${esc(u('links'))}</h4><div>${links}</div>` : '';
    el.links.querySelectorAll('[data-g]').forEach(b => b.onclick = () => ctx.open && ctx.open(b.dataset.g));
    el.links.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => ctx.goEx && ctx.goEx(b.dataset.ex));
    el.btns.querySelector('[data-a="1"]').textContent = u('throw'); el.btns.querySelector('[data-a="10"]').textContent = u('x10'); el.btns.querySelector('[data-a="100"]').textContent = u('x100'); el.btns.querySelector('[data-a="0"]').textContent = u('reset');
    el.hint.textContent = u('tap'); el.obsLab.textContent = u('obs');
    hist(T);
  }
  function choose(id) {
    const T = TOOLS.find(t => t.id === id) || TOOLS[0]; if (tool === T) return; tool = T; busy = false; anim = null;
    try { localStorage.setItem('atlas-chance-tool', T.id); } catch (e) {}
    hideBadges(); el.res.textContent = ''; el.res.classList.remove('on');
    const go = () => { setTool(T); texts(); };
    if (T.kind === 'tetra' && !window.UrDice3D) load('models/ur-dice.js?v=2').then(go); else go();
  }
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));

  function build(box) {
    box.innerHTML = `<div class="chx">
      <p class="chlead"></p>
      <div class="chtools" role="tablist" style="--n:${TOOLS.length > 7 ? Math.ceil(TOOLS.length / 2) : TOOLS.length}">${TOOLS.map(T => `<button type="button" class="cht" data-t="${T.id}" role="tab"><span class="chi"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[TK[T.id]]}</svg></span><span class="chtt"><b></b><small></small></span></button>`).join('')}</div>
      <div class="chmain">
        <div class="chl">
          <div class="chstage"><canvas></canvas><div class="chbadges" aria-hidden="true"></div><div class="chres" aria-live="polite"></div><p class="chhint"></p></div>
          <div class="chbtns"><button type="button" class="btn chgo" data-a="1"></button><button type="button" class="btn ghost" data-a="10"></button><button type="button" class="btn ghost" data-a="100"></button><button type="button" class="btn ghost chrs" data-a="0"></button></div>
        </div>
        <div class="chr">
          <section class="chchart"><div class="chhist"></div><div class="chleg"><span><i class="o"></i><em class="chobl"></em></span><span><i class="e"></i><em class="chexl"></em></span></div><p class="chn"></p><p class="chextra"></p></section>
          <section class="chtext"><h3 class="chname"></h3><p class="chsub"></p><div class="chbody"></div><p class="chfact"></p><p class="chnote"></p><div class="chlinks"></div></section>
        </div>
      </div></div>`;
    const q = s => box.querySelector(s);
    el = { tools: q('.chtools'), lead: q('.chlead'), stage: q('.chstage'), cv: q('canvas'), res: q('.chres'), hint: q('.chhint'), btns: q('.chbtns'), name: q('.chname'), sub: q('.chsub'), body: q('.chbody'), fact: q('.chfact'), note: q('.chnote'), links: q('.chlinks'), hist: q('.chhist'), n: q('.chn'), extra: q('.chextra'), obsLab: q('.chobl'), exLab: q('.chexl') };
    st = el.stage; bEl = q('.chbadges');
    el.tools.querySelectorAll('[data-t]').forEach(b => b.onclick = () => choose(b.dataset.t));
    el.btns.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = +b.dataset.a; if (a) doThrow(a); else if (tool) { data[tool.id] = null; hist(tool); el.res.textContent = ''; el.res.classList.remove('on'); hideBadges(); } });
    // the tray: a tap throws, a drag turns it a little
    let dn = null;
    st.addEventListener('pointerdown', e => { dn = { x: e.clientX, y: e.clientY, yaw: view.yaw, pit: view.pit, m: 0 }; st.setPointerCapture(e.pointerId); });
    st.addEventListener('pointermove', e => { if (!dn) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y; dn.m = Math.max(dn.m, Math.hypot(dx, dy));
      if (dn.m > 6) { view.yaw = Math.max(-.7, Math.min(.7, dn.yaw - dx * .005)); view.pit = Math.max(.55, Math.min(1.45, dn.pit + dy * .004)); kick(60); } });
    const up = () => { if (!dn) return; const tap = dn.m <= 6; dn = null; if (tap) doThrow(1); };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', () => { dn = null; });
    init3D(el.cv);
    new ResizeObserver(() => { if (fit()) kick(60); }).observe(st);
  }

  function render(box, c) {
    ctx = c; lang = (window.MUSEUM_CHANCE_T || {})[c.lang] ? c.lang : 'en'; MK('chance', null, TOOLS.length);
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('chance', TOOLS.map(T => ({ id: T.id, img: null, t: tt(T.id).name || T.id })));
    if (host !== box || !box.querySelector('.chx')) { host = box; tool = null; build(box); }
    let id = null; try { id = localStorage.getItem('atlas-chance-tool'); } catch (e) {}
    if (!tool) choose(TOOLS.some(t => t.id === id) ? id : TOOLS[0].id); else texts();
    if (fit()) kick(100);
  }
  window.AtlasChance = { render, TOOLS, expected, V, _debug: { data, pieces, view, throwNow: n => doThrow(n || 1), tool: () => tool, busy: () => busy, fit: () => { fit(); kick(200); }, choose: id => choose(id) } };
})();
