/* =====================================================================
   World Board Game Atlas — 3D capsule-toy machine (ガチャガチャ) for the gacha tab.
   Same plush toy look as icons3d.js (Icons3D.KIT soft(): matte marshmallow, wrap lighting).
     const g = Gacha3D.mount(containerEl, { sfx })     builds the machine (once)
     g.play(results, { info, onOpen, skip })            1 or 10 capsules → Promise (resolves when all are open)
     g.actions(html) → element                          buttons under the 1-pull prize
     g.reset()                                          back to idle (camera eases back, dome refilled)
   Render-on-demand: frames are drawn only while something moves, the stage is on screen and the tab is visible.
   Tap the stage to skip ahead.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.THREE || !window.Icons3D || !Icons3D.KIT) return;
  const T = THREE, K = Icons3D.KIT, soft = K.soft, rbox = K.rbox, puck = K.puck, mesh = K.mesh;
  const RC = [0xc9d0dc, 0x3ccf91, 0x36b4ff, 0xb46bff, 0xffc22e];          // capsule colour = rarity hint
  const RCSS = ['#9aa3b5', '#3ccf91', '#36b4ff', '#b46bff', '#ffb21e'];
  const PAST = [0xff8f8f, 0xffcf5a, 0x7fdcaa, 0x7cc6ff, 0xb9a0ff, 0xff9fd2, 0xffb36e, 0x8be3e0];
  const CR = .26, LIFT = .36, DR = 1.3, NB = 24;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
  const E = { out: k => 1 - Math.pow(1 - k, 3), io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, in: k => k * k,
    back: k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, lin: k => k };
  const ABORT = { abort: 1 };
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const noSh = o => { o.traverse(c => { c.castShadow = false; c.receiveShadow = false; }); return o; };

  /* ---------- shared capsule parts ---------- */
  const gTop = new T.SphereGeometry(CR, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const gBot = new T.SphereGeometry(CR, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const gSeam = new T.TorusGeometry(CR * 1.004, .021, 8, 40); gSeam.rotateX(Math.PI / 2);
  const gCap = new T.CircleGeometry(CR * .97, 32); gCap.rotateX(Math.PI / 2);   // inside of an opened half
  const matCache = {};
  const capM = hex => matCache[hex] || (matCache[hex] = soft(hex, { rough: .5, rim: .22, sheenK: .35, under: new T.Color(hex).offsetHSL(0, 0, -.08).getHex(), uk: .35 }));
  const topM = () => matCache.top || (matCache.top = soft(0xfffaf2, { rough: .42, rim: .25, under: 0xe4eaff, uk: .35, sheenK: .4 }));
  function capsule(hex, own) {
    const g = new T.Group(), bm = own ? soft(hex, { rough: .45, rim: .25, sheenK: .4 }) : capM(hex);
    const top = mesh(gTop, own ? soft(0xfffaf2, { rough: .42, rim: .25, under: 0xe4eaff, uk: .35, sheenK: .4 }) : topM());
    const bot = mesh(gBot, bm), seam = mesh(gSeam, bm);
    const ti = mesh(gCap, matCache.inner || (matCache.inner = soft(0xf4eee4, { rough: .9 }))); ti.rotation.x = Math.PI; top.add(ti);   // seen when it opens
    bot.add(seam); g.add(top, bot); g.userData = { top, bot, hex };
    return g;
  }

  /* ---------- the machine ---------- */
  function build() {
    const root = new T.Group(), up = new T.Group(); up.position.y = LIFT; root.add(up);
    const red = soft(0xff6b6b, { under: 0xff8fa8, uk: .45, sheenK: .3 }), cream = soft(0xfff3dc, { under: 0xffd8c8, uk: .35 });
    const gold = soft(0xffcc3a, { under: 0xff9a50, uk: .45, sheen: 0xfff2b0, sheenK: .6, rough: .6 }), ink = soft(0x3a3f58, { rough: .7, rim: .1 });
    const body = rbox(2.1, 1.82, 1.62, .42, red); up.add(body);
    const bb = new T.Box3().setFromObject(body), F = bb.max.z, HW = bb.max.x;
    const band = rbox(2.5, .26, 2.0, .5, cream); band.position.y = 1.72; up.add(band);
    const collar = puck(1.02, .3, cream, .5); collar.position.y = 1.96; up.add(collar);
    const FLOOR = 2.24, DC = V(0, FLOOR + .86, 0);          // dome interior floor / centre (local to `up`)
    // feet
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const f = K.blob(root, cream, [sx * (HW - .3), .2, sz * (F - .3)], [.26, .24, .26]); f.castShadow = true; });
    // white polka dots on the sides
    // kept inside the flat part of the side (the rounded corners start ~.4 from the front/back edges), slightly sunk into the surface
    [-1, 1].forEach(s => [[.22, .62], [-.2, 1.02], [.2, 1.32], [-.24, .5]].forEach(([z, y]) => { const d = K.blob(up, cream, [s * (HW - .035), y, z], [.045, .09, .09]); noSh(d); }));
    // dome (glass) + capsules inside
    const glassM = (back) => new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: back ? T.BackSide : T.FrontSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(mix(vec3(.86,.95,1.), vec3(1.), f), ${back ? '.03 + .12 * f' : '.05 + .55 * f'}); }`,
    });
    const dome = new T.Mesh(new T.SphereGeometry(DR, 48, 32, 0, Math.PI * 2, 0, Math.PI * .8), glassM(false)); dome.position.copy(DC); dome.renderOrder = 3; up.add(dome);
    const domeB = new T.Mesh(dome.geometry, glassM(true)); domeB.position.copy(DC); domeB.renderOrder = 1; up.add(domeB);
    const hlM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .62, depthWrite: false });
    const hl = new T.Mesh(new T.SphereGeometry(DR * 1.004, 16, 8, Math.PI * 1.62, Math.PI * .2, Math.PI * .2, Math.PI * .22), hlM); hl.position.copy(DC); hl.renderOrder = 4; up.add(hl);
    const hl2 = new T.Mesh(new T.SphereGeometry(DR * 1.004, 8, 6, Math.PI * .28, Math.PI * .07, Math.PI * .5, Math.PI * .1), hlM); hl2.position.copy(DC); hl2.renderOrder = 4; up.add(hl2);
    // lid: its base sits where the glass is .6 wide, so it hugs the dome (no gap); a soft ring hides the glass/collar joint
    const LR = .6, lid = puck(LR + .04, .3, red, .55); lid.position.y = DC.y + Math.sqrt(DR * DR - LR * LR) - .06; up.add(lid);
    const lidRing = mesh(new T.TorusGeometry(LR + .02, .05, 12, 48), cream); lidRing.rotation.x = Math.PI / 2; lidRing.position.y = lid.position.y + .03; up.add(lidRing);
    K.blob(up, cream, [0, lid.position.y + .38, 0], .16);
    const sy = 2.26 - DC.y, seam = mesh(new T.TorusGeometry(Math.sqrt(DR * DR - sy * sy), .07, 14, 64), cream); seam.rotation.x = Math.PI / 2; seam.position.y = 2.25; up.add(seam);
    // front: ATLAS plate, knob, coin slot, outlet hood
    // name plate: a smooth rounded slab built facing +z (no rotated rbox: its corner radius collapsed the shape), text decal glued to its flat face
    const PW = 1.34, PH = .44, PR = .2, PD = .07, PB = .035, ps = new T.Shape();
    { const x = PW / 2 - PB, y = PH / 2 - PB, r = PR - PB;
      ps.moveTo(-x + r, -y); ps.lineTo(x - r, -y); ps.absarc(x - r, -y + r, r, -Math.PI / 2, 0); ps.lineTo(x, y - r); ps.absarc(x - r, y - r, r, 0, Math.PI / 2);
      ps.lineTo(-x + r, y); ps.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI); ps.lineTo(-x, -y + r); ps.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5); }
    const pg0 = new T.ExtrudeGeometry(ps, { depth: PD, bevelEnabled: true, bevelThickness: PB, bevelSize: PB, bevelSegments: 6, curveSegments: 24 });
    pg0.computeVertexNormals();
    const PY = 1.46, PZ = F - .05;                       // back sunk into the body
    const plate = mesh(pg0, cream); plate.position.set(0, PY, PZ); up.add(plate);
    const pz = PZ + PD + PB;                             // its flat front face
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
    const drawPlate = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, 512, 128); g.font = '700 100px Fredoka, "Zen Maru Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(160,40,50,.22)'; g.fillText('ATLAS', 256, 72); g.fillStyle = '#e8484f'; g.fillText('ATLAS', 256, 68); tex.needsUpdate = true; };
    drawPlate(); try { document.fonts && document.fonts.load('700 100px Fredoka').then(() => { drawPlate(); api && api.kick && api.kick(60); }); } catch (e) {}
    const txtM = new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    const txt = new T.Mesh(new T.PlaneGeometry(PW - 2 * PR + .32, (PW - 2 * PR + .32) / 4), txtM); txt.position.set(0, PY, pz + .001); txt.renderOrder = 2; noSh(txt); up.add(txt);
    const knob = new T.Group(); knob.position.set(-.3, .92, F); up.add(knob);
    const kb = puck(.44, .1, cream, .5); kb.rotation.x = Math.PI / 2; knob.add(kb);
    const kd = puck(.36, .2, gold, .55); kd.rotation.x = Math.PI / 2; kd.position.z = .06; knob.add(kd);
    const kh = new T.Group(); knob.add(kh);
    K.blob(kh, cream, [0, 0, .32], [.4, .1, .1]); K.blob(kh, red, [.3, 0, .38], .07);
    const slot = new T.Group(); slot.position.set(.64, .92, F); up.add(slot);
    const sp = rbox(.34, .12, .5, .1, soft(0xdfe6f2, { under: 0xb8c4e0, uk: .4, rough: .45, rim: .2 })); sp.rotation.x = Math.PI / 2; sp.position.z = -.04; slot.add(sp);
    const sl = rbox(.06, .1, .28, .03, ink); sl.rotation.x = Math.PI / 2; sl.position.set(0, .05, .03); noSh(sl); slot.add(sl);
    const cl = K.blob(slot, gold, [0, -.17, .1], [.06, .06, .03]); noSh(cl);
    const hood = rbox(.6, .4, .66, .28, cream); hood.rotation.x = Math.PI / 2; hood.position.set(0, .28, F - .05); up.add(hood);
    const hz = new T.Box3().setFromObject(hood).max.z;
    const mouth = K.blob(up, ink, [0, .28, hz - .1], [.22, .2, .1]); noSh(mouth);
    // chute (half-pipe) and tray on the floor
    const A = V(0, LIFT + .2, hz - .04), B = V(0, .38, hz + .62);
    const L = A.distanceTo(B) + .1, pg = new T.CylinderGeometry(.31, .31, L, 24, 1, true, -Math.PI / 2, Math.PI); pg.rotateX(Math.PI / 2);
    const chuteM = soft(0xfff3dc, { under: 0xffd8c8, uk: .35 }); chuteM.side = T.DoubleSide;
    const chute = new T.Group(), cp = mesh(pg, chuteM); chute.add(cp);
    [-1, 1].forEach(sx => { const lip = mesh(new T.CylinderGeometry(.045, .045, L, 10), cream); lip.rotation.x = Math.PI / 2; lip.position.x = sx * .31; chute.add(lip); });
    chute.position.copy(A).add(B).multiplyScalar(.5); chute.position.y += .02; chute.rotation.x = Math.atan2(A.y - B.y, B.z - A.z); root.add(chute);
    [-1, 1].forEach(sx => { const leg = mesh(new T.CylinderGeometry(.04, .05, B.y, 10), cream); leg.position.set(sx * .26, B.y / 2 - .1, B.z - .12); root.add(leg); });
    const TZ = hz + 1.1, prof = [[0, .02], [.5, .02], [.6, .1], [.62, .3], [.58, .36], [.52, .32], [.48, .12], [0, .09]].map(([r, y]) => new T.Vector2(r, y));
    const tm = soft(0xff9f6b, { under: 0xff7f8f, uk: .4 }); tm.side = T.DoubleSide;
    const tray = mesh(new T.LatheGeometry(prof, 40), tm); tray.position.set(0, 0, TZ); root.add(tray);
    const P = { F, hz, A, B, TZ, REST: V(0, .09 + CR, TZ), MOUTH: V(0, LIFT + .28, hz - .12) };
    return { root, up, knob, kh, slot, DC, FLOOR, P };
  }

  /* ---------- mount ---------- */
  let api = null;
  function mount(el, opts = {}) {
    if (api) { if (api.el !== el) el.appendChild(api.R.domElement); return api; }
    const sfx = opts.sfx || {};
    const coarse = matchMedia('(pointer: coarse)').matches;
    const R = new T.WebGLRenderer({ antialias: true, alpha: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.shadowMap.autoUpdate = true;
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.08;
    el.appendChild(R.domElement); R.domElement.setAttribute('aria-hidden', 'true');
    const ui = document.createElement('div'); ui.className = 'g3ui';
    ui.innerHTML = '<div class="g3chips"></div><div class="g3prize"></div><div class="g3act"></div><div class="g3hint"></div>'; el.appendChild(ui);
    const $u = s => ui.querySelector(s);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .1, 100);
    scene.add(new T.HemisphereLight(0xfff6e8, 0x8a6a50, .78));
    // key light from high above (a soft spotlight feel): short, round contact shadows instead of a long one to the side
    const key = new T.DirectionalLight(0xffffff, 1.0); key.position.set(-1.6, 12, 3.2); key.castShadow = true;
    const sm = coarse ? 512 : 1024; key.shadow.mapSize.set(sm, sm); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4, near: 2, far: 20 }); key.shadow.bias = -.0008; key.shadow.radius = 6;
    scene.add(key);
    const fill = new T.DirectionalLight(0xffe8f0, .35); fill.position.set(4, 5, 9); scene.add(fill);
    const rim = new T.DirectionalLight(0xcfe6ff, .5); rim.position.set(7, 4, -7); scene.add(rim);
    const glow = new T.PointLight(0xffffff, 0, 3.2, 1.6); scene.add(glow);
    const M = build(); scene.add(M.root);
    /* the hero's stage: a soft round toy-shop pedestal (marshmallow top, gold piping, pastel studs) under a faint spotlight pool */
    const stage = new T.Group(); scene.add(stage);
    const SC = V(0, 0, 1.15), SR = 2.45;
    const ped = puck(SR, .5, soft(0xffc9b8, { under: 0xff9fb4, uk: .55, rough: .9 }), .4); ped.position.set(SC.x, -.5, SC.z); ped.scale.z = .92; ped.castShadow = false; stage.add(ped);
    const top = puck(SR - .12, .06, soft(0xffe7d2, { under: 0xffd2c0, uk: .3, rough: .95 }), .5); top.position.set(SC.x, -.04, SC.z); top.scale.z = .92; top.castShadow = false; stage.add(top);
    const pip = mesh(new T.TorusGeometry(SR - .02, .06, 12, 96), soft(0xffcf5a, { under: 0xff9a50, uk: .4, sheen: 0xfff2b0, sheenK: .6, rough: .6 })); pip.rotation.x = Math.PI / 2; pip.scale.y = .92; pip.position.set(SC.x, -.02, SC.z); pip.castShadow = false; stage.add(pip);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; const d = K.blob(stage, soft(PAST[i % PAST.length], { rough: .6 }), [SC.x + Math.cos(a) * (SR + .01), -.27, SC.z + Math.sin(a) * (SR + .01) * .92], [.08, .08, .08]); noSh(d); }
    const pool = new T.Mesh(new T.CircleGeometry(SR - .14, 64), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: .28, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.6, 'rgba(255,250,235,.5)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })() }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(SC.x, -.005, SC.z - .3); pool.scale.y = .92; stage.add(pool);
    const floor = new T.Mesh(new T.CircleGeometry(SR - .14, 64), new T.ShadowMaterial({ opacity: .16 })); floor.rotation.x = -Math.PI / 2; floor.position.set(SC.x, .002, SC.z); floor.scale.y = .92; floor.receiveShadow = true; scene.add(floor);
    // soft contact blot under the cabinet and the tray (reads as "standing on it" even where the shadow map is blurry)
    const blot = (w, d, z, o) => { const m = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: 0x8a5a40, transparent: true, opacity: o, depthWrite: false, map: pool.material.map })); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(0, .004, z); scene.add(m); };
    blot(1.55, 1.2, 0, .2); blot(.85, .75, M.P.TZ, .16);
    const P = M.P;

    /* dome capsules: tiny verlet sim (gravity, dome wall, floor, ball-ball) */
    const balls = [];
    for (let i = 0; i < NB; i++) {
      const g = capsule(PAST[i % PAST.length]); g.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const p = M.DC.clone().add(V((Math.random() - .5) * 1.4, (Math.random() - .1) * 1.0, (Math.random() - .5) * 1.4));
      g.position.copy(p); M.up.add(g); balls.push({ g, p, q: p.clone(), out: false });
    }
    let awake = 0;
    const tmp = V(0, 0, 0), ax = V(0, 0, 0), qq = new T.Quaternion();
    function phys(dt) {
      const gy = -9.8 * dt * dt, wall = DR - CR - .04, live = balls.filter(b => !b.out);
      live.forEach(b => { tmp.subVectors(b.p, b.q).multiplyScalar(.985); b.q.copy(b.p); b.p.add(tmp); b.p.y += gy; });
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
          const a = live[i].p, b = live[j].p; tmp.subVectors(a, b); const d = tmp.length(), m = CR * 2;
          if (d < m && d > 1e-5) { tmp.multiplyScalar((m - d) / d * .5); a.add(tmp); b.sub(tmp); }
        }
        live.forEach(b => {
          tmp.subVectors(b.p, M.DC); const d = tmp.length(); if (d > wall) b.p.copy(M.DC).addScaledVector(tmp, wall / d);
          if (b.p.y < M.FLOOR + CR) b.p.y = M.FLOOR + CR;
        });
      }
      let mx = 0;
      live.forEach(b => {
        tmp.subVectors(b.p, b.q); const h = Math.hypot(tmp.x, tmp.z); mx = Math.max(mx, tmp.length() / dt);
        if (h > 1e-6) { ax.set(tmp.z, 0, -tmp.x).normalize(); qq.setFromAxisAngle(ax, h / CR); b.g.quaternion.premultiply(qq); }
        b.g.position.copy(b.p);
      });
      awake = mx > .05 ? 40 : Math.max(0, awake - 1);
    }
    function stir(s = 1, dt = 1 / 120) {
      balls.forEach(b => { if (b.out) return; tmp.subVectors(b.p, M.DC);
        const v = V(-tmp.z, 0, tmp.x).normalize().multiplyScalar(s * (.7 + Math.random() * .6)); v.y = s * (.4 + Math.random() * .9);
        v.x += (Math.random() - .5) * s * .5; v.z += (Math.random() - .5) * s * .5; b.q.addScaledVector(v, -dt); });
      awake = 40; kick();
    }
    // settle once off-screen, then lift a little so the first view shows them settling in
    for (let i = 0; i < 500; i++) phys(1 / 120);
    balls.forEach(b => { b.p.y += .25 + Math.random() * .3; b.q.copy(b.p); }); awake = 40;

    /* tweens / sequence control */
    let spill = 0, tweens = [], skipping = false, seq = 0, playing = false, clock = 0;
    function tw(ms, fn, ease = E.lin) {
      if (skipping || ms <= 0 || (playing && !canRun())) { fn(1, 1); return Promise.resolve(); }
      return new Promise(res => { tweens.push({ d: ms, t: Math.min(spill, ms * .9), fn, ease, res }); kick(); });
    }
    const wait = ms => tw(ms, () => {});
    function flush() { const ts = tweens; tweens = []; ts.forEach(x => { x.fn(1, 1); x.res(); }); }
    function skip() { if (!playing || skipping) return; skipping = true; flush(); kick(); }
    const say = (name, ms = 0) => { if (!skipping && sfx[name]) try { sfx[name](ms); } catch (e) {} };

    /* particles */
    const parts = [];
    const pGeo = new T.SphereGeometry(.05, 10, 6), oct = new T.OctahedronGeometry(.08, 0);
    function burst(pos, hex, n, rainbow, small) {
      for (let i = 0; i < n; i++) {
        const col = rainbow ? new T.Color().setHSL(i / n, .9, .62) : new T.Color(i % 3 ? hex : 0xffffff);
        const m = new T.Mesh(i % 4 === 0 ? oct : pGeo, new T.MeshBasicMaterial({ color: col, transparent: true }));
        m.position.copy(pos); const v = V(Math.random() - .5, Math.random() * .9 + .3, Math.random() - .5).normalize().multiplyScalar(1.6 + Math.random() * 2.2);
        scene.add(m); parts.push({ m, v, life: 0, max: .7 + Math.random() * .5, g: -5, spin: Math.random() * 8 });
      }
      const fl = new T.Mesh(new T.SphereGeometry(.3, 24, 16), new T.MeshBasicMaterial({ color: rainbow ? 0xfff2c0 : hex, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
      fl.position.copy(pos); scene.add(fl); parts.push({ m: fl, flash: 1, life: 0, max: small ? .22 : .38, k: small ? .35 : 1 });
      const ring = new T.Mesh(new T.TorusGeometry(.4, .03, 8, 48), new T.MeshBasicMaterial({ color: rainbow ? 0xffd24a : hex, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      ring.position.copy(pos); ring.lookAt(cam.position); scene.add(ring); parts.push({ m: ring, flash: 2, life: 0, max: .55, k: small ? .45 : 1 });
      kick();
    }
    const sparks = [];
    function sparkle(cap, on, n = 6, hex = 0xffe680) {
      sparks.splice(0).forEach(s => scene.remove(s.m));
      if (!on) return;
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(oct, new T.MeshBasicMaterial({ color: hex, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); m.scale.set(.5, 1.5, .5);
        scene.add(m); sparks.push({ m, cap, a: i / n * Math.PI * 2, r: .45 + Math.random() * .15, h: Math.random() * .4 });
      }
    }
    function stepParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt; const k = p.life / p.max;
        if (k >= 1) { scene.remove(p.m); p.m.material.dispose(); if (p.flash) p.m.geometry.dispose(); parts.splice(i, 1); continue; }
        if (p.flash === 1) { p.m.scale.setScalar((.4 + k * 4) * p.k); p.m.material.opacity = .85 * (1 - k) * (p.k < 1 ? .5 : 1); }
        else if (p.flash === 2) { p.m.scale.setScalar((.5 + E.out(k) * 1.8) * p.k); p.m.material.opacity = 1 - k; }
        else { p.v.y += p.g * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.y += p.spin * dt; p.m.material.opacity = 1 - k * k; p.m.scale.setScalar(1 - k * .6); }
      }
      sparks.forEach((s, i) => { s.a += dt * 2.4; const c = s.cap.position; s.m.position.set(c.x + Math.cos(s.a) * s.r, c.y + .1 + s.h + Math.sin(clock * 3 + i) * .08, c.z + Math.sin(s.a) * s.r);
        s.m.rotation.y += dt * 4; const f = .6 + .4 * Math.sin(clock * 8 + i * 1.7); s.m.material.opacity = f; });
    }

    /* camera */
    const camP = V(0, 3, 12), camT = V(0, 2, 0);
    function view(name, i) {
      const a = Math.max(.3, W / Math.max(1, H)), vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * a), f = Math.min(vf, hf);
      let tgt, r, dir;
      if (name === 'tray') { tgt = P.REST.clone().add(V(0, .5, -.25)); r = 1.25; dir = V(.55, .45, 1); }
      else if (name === 'pile') { tgt = V(0, .55, P.TZ + .25); r = 2.7; dir = V(.22, .7, 1); }
      else if (name === 'cap') { tgt = i.clone().add(V(0, .3, 0)); r = .9; dir = V(.1, .55, 1); }
      else { tgt = V(0, 2.3, .95); r = 3.75; dir = V(.1, .28, 1); }   // idle: the whole machine + pedestal with a margin
      return { t: tgt, p: tgt.clone().addScaledVector(dir.normalize(), r / Math.sin(f)) };
    }
    let curView = 'idle';
    function camTo(name, ms, ease = E.io, i) {
      curView = name; const v = view(name, i), p0 = camP.clone(), t0 = camT.clone();
      return tw(ms, k => { camP.lerpVectors(p0, v.p, k); camT.lerpVectors(t0, v.t, k); }, ease);
    }

    /* render loop (on demand) */
    let W = 1, H = 1, raf = 0, last = 0, until = 0, vis = true, acc = 0;
    const canRun = () => vis && !document.hidden && W > 2 && H > 2;
    function kick(ms = 0) { until = Math.max(until, performance.now() + ms); if (!raf && canRun()) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    function size() {
      const r = el.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height); if (W < 2 || H < 2) return;
      R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
      if (!tweens.length) { const v = view(curView, curCap && curCap.position); camP.copy(v.p); camT.copy(v.t); }
      placeUI(); kick(60);
    }
    function loop(now) {
      raf = 0; const rdt = Math.min(.5, Math.max(0, (now - last) / 1000)), dt = Math.min(.05, rdt); last = now; clock += dt;
      if (awake) { acc += dt; let n = 0; while (acc > 1 / 120 && n++ < 5) { phys(1 / 120); acc -= 1 / 120; } if (n >= 5) acc = 0; }
      const ts = tweens.slice();
      spill = 0;   // a tween that ends mid-frame hands its leftover time to the one chained after it (keeps the timing on slow devices)
      ts.forEach(x => { x.t += rdt * 1000; const k = clamp(x.t / x.d); x.fn(x.ease(k), k); if (k >= 1) { spill = Math.max(spill, x.t - x.d); tweens.splice(tweens.indexOf(x), 1); x.res(); } });
      setTimeout(() => { spill = 0; }, 0);
      stepParts(Math.min(.1, rdt));
      if (urCap) { const h = (clock * .5) % 1, b = urCap.userData.bot.material; b.color.setHSL(h, .85, .6).convertSRGBToLinear(); }
      M.up.rotation.y = lerp(M.up.rotation.y, 0, .1);
      cam.position.copy(camP); cam.lookAt(camT);
      R.render(scene, cam);
      if (chipsLive) placeUI();
      if (canRun() && (tweens.length || awake || parts.length || sparks.length || urCap || performance.now() < until)) raf = requestAnimationFrame(loop);
    }
    try { new ResizeObserver(size).observe(el); } catch (e) { addEventListener('resize', size); }
    try { new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) { size(); kick(100); } else if (playing) flush(); }).observe(el); } catch (e) {}
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(100); else if (playing) flush(); });
    setInterval(() => { if (!playing && canRun() && !awake) stir(.35); }, 7000);   // idle: a gentle jiggle now and then
    el.addEventListener('pointerdown', e => { if (e.target.closest('button,a')) return; if (playing) skip(); else if (!curCap) { stir(.9); say('boing'); } });

    /* screen-space UI (prize card / chips follow the capsules) */
    let chips = [], chipsLive = false, prizeAt = null;
    const scr = v => { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
    function placeUI() {
      chips.forEach(c => { const s = scr(c.cap.position); c.el.style.left = s.x + 'px'; c.el.style.top = s.y + 'px'; });
      const pz = $u('.g3prize').firstElementChild; if (pz && prizeAt) { const s = scr(prizeAt); pz.style.left = s.x + 'px'; pz.style.top = Math.max(s.y, 10) + 'px'; }
    }

    /* ---------- pieces of the show ---------- */
    let curCap = null, urCap = null, caps = [];
    async function coin(A, n = 1) {
      for (let i = 0; i < n; i++) {
        const c = puck(.17, .055, soft(0xffc928, { sheen: 0xfff2b0, sheenK: .7, rough: .5, under: 0xff9a40, uk: .4 }), .5);
        const g = new T.Group(); g.add(c); c.rotation.z = Math.PI / 2; c.position.x = -.0275;
        const s = M.slot.getWorldPosition(V(0, 0, 0)); g.position.set(s.x, s.y + .7, s.z + .7); scene.add(g);
        const p0 = g.position.clone(), p1 = V(s.x, s.y, s.z + .3), p2 = V(s.x, s.y, s.z - .2);
        await A(tw(n > 1 ? 260 : 420, k => { g.position.lerpVectors(p0, p1, k); g.rotation.y = (1 - k) * Math.PI * 3; }, E.out));
        say('coin');
        await A(tw(n > 1 ? 110 : 200, k => { g.position.lerpVectors(p1, p2, k); }, E.in));
        scene.remove(g);
      }
    }
    async function turn(A, clicks, ms) {
      for (let i = 0; i < clicks; i++) {
        const r0 = M.kh.rotation.z; say('tok'); stir(1.3);
        await A(tw(ms, k => { M.kh.rotation.z = r0 - k * Math.PI * 2 / 3; M.up.rotation.z = Math.sin(k * Math.PI) * .012 * (i % 2 ? 1 : -1); }, E.back));
      }
      M.up.rotation.z = 0;
    }
    async function dropBall(A, ms) {   // one capsule in the dome sinks into the hole
      const live = balls.filter(b => !b.out); if (!live.length) return;
      const b = live.reduce((m, x) => (Math.hypot(x.p.x, x.p.z) + x.p.y * .6 < Math.hypot(m.p.x, m.p.z) + m.p.y * .6 ? x : m)); b.out = true;
      const p0 = b.p.clone(), p1 = V(0, M.FLOOR - .1, 0);
      await A(tw(ms, k => { b.g.position.lerpVectors(p0, p1, k); b.g.scale.setScalar(1 - k * .7); }, E.in));
      b.g.visible = false; stir(.6);
    }
    function addCap(rar) {
      const c = capsule(RC[rar], true); c.position.copy(P.MOUTH); c.scale.setScalar(.3); c.rotation.set(0, 0, .3); scene.add(c); caps.push(c);
      if (rar >= 2) c.userData.bot.material.emissive = new T.Color(RC[rar]).multiplyScalar(.04);
      return c;
    }
    // out of the hood, down the chute, bounce in the tray; `to` = optional hop to a lineup spot afterwards
    async function roll(A, c, fast, to) {
      const sp = fast ? .55 : 1, p0 = c.position.clone(), a = P.A.clone().add(V(0, CR - .3, .12)), b = P.B.clone().add(V(0, CR - .3 + .02, 0)), rest = P.REST.clone();
      await A(tw(160 * sp, k => { c.position.lerpVectors(p0, a, k); c.scale.setScalar(.3 + .7 * k); }, E.out));
      const rx0 = c.rotation.x;
      await A(tw(380 * sp, k => { c.position.lerpVectors(a, b, k); c.rotation.x = rx0 + a.distanceTo(c.position) / CR; }, E.in));
      const rx1 = c.rotation.x, d = b.distanceTo(rest);
      await A(tw(240 * sp, k => { c.position.lerpVectors(b, rest, k); c.position.y = lerp(b.y, rest.y, k) + Math.sin(k * Math.PI) * .12; c.rotation.x = rx1 + d * k / CR; }, E.lin));
      say('tok');
      const hops = fast ? [[.1, 170]] : [[.2, 280], [.08, 190], [.025, 120]];
      for (const [h, ms] of hops) {
        await A(tw(ms * sp, k => { c.position.y = rest.y + Math.sin(k * Math.PI) * h; c.position.z = rest.z + Math.sin(k * Math.PI) * h * .4; c.rotation.x += .02; }));
        say('tok');
      }
      c.position.copy(rest);
      if (to) {
        const r0 = c.position.clone();
        await A(tw(360, k => { c.position.lerpVectors(r0, to, k); c.position.y = lerp(r0.y, to.y, k) + Math.sin(k * Math.PI) * .7; c.rotation.x += .14; }, E.lin));
        say('tok');
        await A(tw(160, k => { c.position.y = to.y + Math.sin(k * Math.PI) * .07; }));
      }
    }
    async function wobble(A, c, rar, ms) {
      const bm = c.userData.bot.material, col = new T.Color(RC[rar]), gk = [.5, .9, 1.4, 2.6, 3.4][rar];
      glow.color.copy(col); glow.position.copy(c.position).add(V(0, .5, .5)); glow.intensity = 0;
      if (rar === 4) urCap = c;
      if (rar >= 3) sparkle(c, true, rar === 4 ? 9 : 6, rar === 4 ? 0xffe680 : 0xe2c4ff);
      const y0 = c.position.y, rx = c.rotation.x;
      await A(tw(ms, (k, raw) => {
        const s = raw * ms / 1000, amp = .07 + .3 * k, f = 13 + 9 * k;
        c.rotation.set(rx * (1 - k), 0, Math.sin(s * f) * amp);
        c.position.y = y0 + Math.max(0, Math.sin(s * f * .5)) * .05 * k * (rar >= 3 ? 2 : 1);
        glow.intensity = gk * k * k; bm.emissive.copy(col).multiplyScalar((rar >= 2 ? .3 : .08) * k);
      }, E.in));
    }
    async function open(A, c, rar, info, fast, quiet) {
      const { top, bot } = c.userData; c.rotation.set(0, 0, 0);
      if (!quiet) { say('pop'); if (rar >= 3) say('shimmer', 80); }
      burst(c.position.clone().add(V(0, .05, 0)), RC[rar], quiet ? (rar >= 3 ? 22 : 7) : fast ? (rar >= 3 ? 26 : 12) : (rar >= 3 ? 46 : 26), rar === 4, quiet);
      info && info.onOpen && info.onOpen();
      await A(tw(fast ? 260 : 460, k => {
        top.rotation.set(0, k * Math.PI * 1.5, -k * .9); top.position.set(-.3 * k, .55 * Math.sin(k * Math.PI * .8), .05 * k);
        bot.rotation.set(0, 0, k * .35); bot.position.set(.08 * k, -.02 * k, 0);
      }, E.out));
      glow.intensity *= .6;
    }
    async function vanish(A, c, ms) { const s0 = c.scale.x; await A(tw(ms, k => c.scale.setScalar(s0 * (1 - k)), E.in)); c.visible = false; }

    function clearStage() {
      caps.forEach(c => { scene.remove(c); c.traverse(o => { if (o.material && o.material !== topM() && !Object.values(matCache).includes(o.material)) o.material.dispose(); }); });
      caps = []; curCap = null; urCap = null; sparkle(null, false); glow.intensity = 0;
      chips = []; chipsLive = false; prizeAt = null; $u('.g3chips').innerHTML = ''; $u('.g3prize').innerHTML = ''; $u('.g3act').innerHTML = '';
    }
    function refill() {
      balls.forEach(b => { if (!b.out) return; b.out = false; b.g.visible = true; b.g.scale.setScalar(1);
        b.p.copy(M.DC).add(V((Math.random() - .5) * .5, DR - .45, (Math.random() - .5) * .5)); b.q.copy(b.p); });
      awake = 40;
    }
    function hint(s) { const h = $u('.g3hint'); h.textContent = s || ''; h.classList.toggle('on', !!s); }

    function prizeCard(r, inf, small) {
      const tag = r.dup ? `<span class="dp">${inf.tag}</span>` : `<span class="nw">${inf.tag}</span>`;
      return small
        ? `<div class="gxc r${r.rar}" style="--rc:${RCSS[r.rar]}"><span class="ga">${inf.art}</span><span class="rr">${inf.rar}</span>${r.dup ? '' : '<i class="nd"></i>'}</div>`
        : `<div class="gxp r${r.rar}" style="--rc:${RCSS[r.rar]}"><div class="gxr"></div><div class="ga">${inf.art}</div><div class="gxl"><span class="rr">${inf.rar}</span>${tag}</div><b class="gxn">${inf.name}</b></div>`;
    }

    async function playOne(A, r, o) {
      await coin(A, 1);
      await turn(A, 3, 300);
      await dropBall(A, 380);
      const c = addCap(r.rar); curCap = c;
      const cm = camTo('tray', 1500, E.io);
      await roll(A, c, false);
      await A(cm);
      await wobble(A, c, r.rar, [1100, 1300, 1500, 2000, 2400][r.rar]);
      await open(A, c, r.rar, { onOpen: () => o.onOpen && o.onOpen(r, 0) }, false);
      skipping = false;
      prizeAt = c.position.clone().add(V(0, .12, 0));
      $u('.g3prize').innerHTML = prizeCard(r, o.info(r)); placeUI();
      if (r.rar >= 3) say('fanfare', 120); else say('chime', 60);
      kick(400);
    }
    // 10-pull: all ten gush out of the chute at once, tumble and bump around the tray, then pop open together
    function gush(cs) {
      const tray = V(0, 0, P.TZ), dir = V().subVectors(P.B, P.A).normalize(), start = P.MOUTH, a = P.A.clone().add(V(0, CR - .3, .12)), b = P.B.clone().add(V(0, CR - .28, 0));
      const RIN = .48 - CR * .6, ROUT = .62 + CR * .8, RIMY = .36 + CR, BODYZ = P.F + .15;
      const st = cs.map((c, i) => ({ c, t0: i * .075 + Math.random() * .03, p: start.clone(), v: V(), live: false, done: false, spin: V((Math.random() - .5) * 14, (Math.random() - .5) * 6, (Math.random() - .5) * 14) }));
      let t = 0, lastTok = 0, nTok = 0;
      const tmp = V();
      function step(dt) {
        t += dt;
        st.forEach(s => {
          const c = s.c, k = (t - s.t0) / .3;
          if (k < 0) { c.visible = false; return; }
          c.visible = true;
          if (k < 1) {   // out of the hood and down the chute (accelerating), slightly fanned
            if (k < .25) { c.position.lerpVectors(start, a, k / .25); c.scale.setScalar(.3 + .7 * k / .25); }
            else { const q = (k - .25) / .75; c.position.lerpVectors(a, b, q * q); c.scale.setScalar(1); }
            c.rotation.x += dt * 18; return;
          }
          if (!s.live) { s.live = true; s.p.copy(b); s.v.copy(dir).multiplyScalar(2.6 + Math.random() * 1.2); s.v.y = 1.2 + Math.random() * 1.4; s.v.x = (Math.random() - .5) * 3.2; }
          s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt);
          const dx = s.p.x - tray.x, dz = s.p.z - tray.z, rr = Math.hypot(dx, dz);
          const fl = rr < RIN ? .09 + CR : CR;
          if (s.p.y < fl) { s.p.y = fl; if (s.v.y < -.6 && t - lastTok > .11 && nTok < 14) { say('clack'); lastTok = t; nTok++; } s.v.y = -s.v.y * .45; s.v.x *= .82; s.v.z *= .82; if (Math.abs(s.v.y) < .25) s.v.y = 0; }
          if (rr > RIN && rr < ROUT && s.p.y < RIMY) {   // the tray rim
            const out = rr > (RIN + ROUT) / 2, n = V(dx / rr, 0, dz / rr), d = out ? ROUT - rr : -(rr - RIN);
            if (s.p.y > RIMY - .12 && s.v.y <= 0) { s.p.y = RIMY; s.v.y = Math.abs(s.v.y) * .4; s.p.addScaledVector(n, d * .3); }
            else { s.p.addScaledVector(n, d); const vn = s.v.dot(n); if (vn * (out ? 1 : -1) < 0) s.v.addScaledVector(n, -1.6 * vn); }
          }
          if (s.p.z < BODYZ) { s.p.z = BODYZ; s.v.z = Math.abs(s.v.z) * .5; }
          const lim = 2.2; if (Math.abs(s.p.x) > lim) { s.p.x = Math.sign(s.p.x) * lim; s.v.x *= -.5; }
          if (s.p.z > P.TZ + 1.45) { s.p.z = P.TZ + 1.45; s.v.z *= -.5; }
        });
        const L = st.filter(s => s.live);
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {   // bump into each other
          const A_ = L[i], B_ = L[j]; tmp.subVectors(A_.p, B_.p); const d = tmp.length(), m = CR * 2.02;
          if (d < m && d > 1e-5) { tmp.multiplyScalar(1 / d); const push = (m - d) / 2; A_.p.addScaledVector(tmp, push); B_.p.addScaledVector(tmp, -push);
            const rv = tmp.dot(V().subVectors(A_.v, B_.v)); if (rv < 0) { A_.v.addScaledVector(tmp, -rv * .9); B_.v.addScaledVector(tmp, rv * .9); } }
        }
        L.forEach(s => { s.v.x *= (1 - 1.6 * dt); s.v.z *= (1 - 1.6 * dt); s.c.position.copy(s.p);
          const sp = Math.hypot(s.v.x, s.v.z); s.c.rotation.x += s.v.z / CR * dt; s.c.rotation.z -= s.v.x / CR * dt; if (sp > .05) s.c.rotation.y += s.spin.y * dt * .1; });
      }
      return { step, settle() { let n = 0; while (n++ < 900) step(1 / 120); } };
    }
    async function playTen(A, res, o) {
      await coin(A, 3);
      const cm = camTo('pile', 1500, E.io);
      await turn(A, 2, 220);
      for (let i = 0; i < 4; i++) dropBall(A, 260).catch(() => {});
      stir(2.2); say('whoosh');
      const cs = res.map(r => { const c = addCap(r.rar); c.visible = false; return c; });
      const G = gush(cs); let tl = 0;
      await A(tw(2600, (k, raw) => { if (raw >= 1) { G.settle(); return; } const tt = raw * 2.6, dt = Math.min(.05, tt - tl); tl = tt; let x = dt; while (x > 1e-4) { const h = Math.min(1 / 120, x); G.step(h); x -= h; } }));
      await A(cm);
      // a beat, a shared shiver (colours glow with their rarity), then everything pops at once
      await A(wait(250));
      const top = Math.max(...res.map(r => r.rar)), rx = cs.map(c => c.rotation.x);
      if (top >= 3) { glow.color.set(RC[top]); glow.position.set(0, 1.2, P.TZ + .6); }
      await A(tw(top >= 3 ? 1100 : 700, (k, raw) => {
        cs.forEach((c, i) => { const r = res[i].rar; c.rotation.x = rx[i] * (1 - k); c.rotation.y = 0; c.rotation.z = Math.sin(raw * 30 + i * 1.3) * (.05 + .25 * k);
          c.userData.bot.material.emissive = c.userData.bot.material.emissive || new T.Color(); c.userData.bot.material.emissive.set(RC[r]).multiplyScalar((r >= 2 ? .3 : .06) * k); });
        if (top >= 3) glow.intensity = (top === 4 ? 3 : 2) * k * k;
      }, E.in));
      say('pop'); if (top >= 3) say('shimmer', 90);
      cs.forEach((c, i) => open(A, c, res[i].rar, null, true, true).catch(() => {}));
      await A(wait(620));
      skipping = false;
    }

    async function play(res, o = {}) {
      reset(true);
      const my = ++seq; playing = true; skipping = false;
      const A = async p => { await p; if (my !== seq) throw ABORT; };
      hint(o.skip); kick();
      try {
        if (res.length === 1) await playOne(A, res[0], o); else await playTen(A, res, o);
      } catch (e) { if (e === ABORT) return false; throw e; }
      if (my !== seq) return false;
      playing = false; skipping = false; hint('');
      return true;
    }
    function reset(instant) {
      seq++; playing = false; skipping = false; tweens.forEach(x => x.res()); tweens = []; hint('');
      clearStage(); refill(); M.kh.rotation.z = 0; M.up.rotation.z = 0;
      if (instant) { curView = 'idle'; const v = view('idle'); camP.copy(v.p); camT.copy(v.t); }
      else { const v = view('idle'), p0 = camP.clone(), t0 = camT.clone(); curView = 'idle'; tweens.push({ d: 900, t: 0, ease: E.io, res() {}, fn: k => { camP.lerpVectors(p0, v.p, k); camT.lerpVectors(t0, v.t, k); } }); }
      kick(200);
    }
    function actions(html) { const a = $u('.g3act'); a.innerHTML = html; a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); return a; }

    api = { el, R, play, reset, actions, kick, skip, get playing() { return playing; } };
    size(); reset(true);
    return api;
  }

  window.Gacha3D = { mount };
})();
