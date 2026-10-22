// 3D mahjong table (three.js r128). Draws rivers, opponents' hands, melds, the center console and riichi sticks.
// Seat 0 is the player (bottom); seats go counter-clockwise (1 right, 2 top, 3 left).
// Rendering is on demand: render() only when something changed or while tweens run.
(function (root) {
'use strict';
const W = 1, H = 1.36, D = 0.78;
const ROW = 6;
const PI = Math.PI;

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

class Table3D {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const mobile = matchMedia('(pointer: coarse)').matches;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);
    this.tweens = [];
    this.tiles = new Map();
    this.faceTex = new Map();
    this.dirty = true;
    this.build(mobile);
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------------------------------------------------------------- scene
  build(mobile) {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xf2f6ff, 0x1c2440, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(-6, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 4; sc.far = 50;
    key.shadow.bias = -0.0006; key.shadow.radius = 3;
    s.add(key);
    const rim = new THREE.DirectionalLight(0xd9c8ff, 0.25); rim.position.set(8, 10, -12); s.add(rim);

    // felt: navy cloth with the inner play square and corner lines (like a real automatic table)
    const U = 2048 / 21.2;                       // texture px per world unit
    const fc = document.createElement('canvas'); fc.width = fc.height = 2048;
    const g = fc.getContext('2d');
    const rg = g.createRadialGradient(1024, 1024, 120, 1024, 1024, 1500);
    rg.addColorStop(0, '#2f5aa0'); rg.addColorStop(.45, '#234887'); rg.addColorStop(1, '#13285a');
    g.fillStyle = rg; g.fillRect(0, 0, 2048, 2048);
    const img = g.getImageData(0, 0, 2048, 2048), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.2; }
    g.putImageData(img, 0, 0);
    g.translate(1024, 1024);
    const sq = 7.75 * U, inner = 2.55 * U;
    g.strokeStyle = 'rgba(160,200,255,.32)'; g.lineWidth = 5;
    g.strokeRect(-sq, -sq, sq * 2, sq * 2);
    g.strokeStyle = 'rgba(160,200,255,.14)'; g.lineWidth = 3;
    g.strokeRect(-sq - 14, -sq - 14, sq * 2 + 28, sq * 2 + 28);
    g.strokeStyle = 'rgba(160,200,255,.22)'; g.lineWidth = 4;
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(x * inner, y * inner); g.lineTo(x * sq, y * sq); g.stroke(); }
    // faint emblem rings under the console
    g.strokeStyle = 'rgba(160,200,255,.10)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 3.4 * U, 0, 7); g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const felt = new THREE.CanvasTexture(fc); felt.encoding = THREE.sRGBEncoding; felt.anisotropy = 8;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 21.2), new THREE.MeshStandardMaterial({ map: felt, roughness: .92, metalness: 0 }));
    table.rotation.x = -PI / 2; table.receiveShadow = true; s.add(table);
    // wooden rim (wood grain texture) with a dark inner lip
    const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 64;
    const wg = wc.getContext('2d');
    const wgr = wg.createLinearGradient(0, 0, 0, 64); wgr.addColorStop(0, '#7a4a2a'); wgr.addColorStop(.5, '#5c3219'); wgr.addColorStop(1, '#3d2010');
    wg.fillStyle = wgr; wg.fillRect(0, 0, 1024, 64);
    for (let i = 0; i < 90; i++) { wg.strokeStyle = `rgba(${Math.random() < .5 ? '30,12,4' : '150,96,60'},${.08 + Math.random() * .12})`; wg.lineWidth = 1 + Math.random() * 2; wg.beginPath(); const y = Math.random() * 64; wg.moveTo(0, y); wg.bezierCurveTo(300, y + (Math.random() - .5) * 12, 700, y + (Math.random() - .5) * 12, 1024, y); wg.stroke(); }
    const wood = new THREE.CanvasTexture(wc); wood.encoding = THREE.sRGBEncoding;
    const rimMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .38, metalness: .05 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: .6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: .35, metalness: .75 });
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(24.4, 1.1, 1.6), rimMat);
      b.position.set(Math.sin(a) * 11.4, 0.35, Math.cos(a) * 11.4); b.rotation.y = a; b.castShadow = b.receiveShadow = true; s.add(b);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.3, 0.16), lipMat);
      lip.position.set(Math.sin(a) * 10.62, 0.15, Math.cos(a) * 10.62); lip.rotation.y = a; s.add(lip);
    }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x0c0a14, roughness: 1 }));
    under.rotation.x = -PI / 2; under.position.y = -0.4; s.add(under);

    // console: chamfered gunmetal block with a screen texture on top
    this.conCanvas = document.createElement('canvas'); this.conCanvas.width = this.conCanvas.height = 1024;
    this.conTex = new THREE.CanvasTexture(this.conCanvas); this.conTex.encoding = THREE.sRGBEncoding; this.conTex.anisotropy = 8;
    const CH = 1.95, CC = 0.36;                  // half size, chamfer
    const shp = new THREE.Shape();
    shp.moveTo(-CH + CC, -CH); shp.lineTo(CH - CC, -CH); shp.lineTo(CH, -CH + CC); shp.lineTo(CH, CH - CC); shp.lineTo(CH - CC, CH);
    shp.lineTo(-CH + CC, CH); shp.lineTo(-CH, CH - CC); shp.lineTo(-CH, -CH + CC); shp.closePath();
    const cgeo = new THREE.ExtrudeGeometry(shp, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
    this.conTex.repeat.set(1 / (CH * 2), 1 / (CH * 2)); this.conTex.offset.set(.5, .5);
    const conTop = new THREE.MeshStandardMaterial({ map: this.conTex, roughness: .32, metalness: .35, emissive: 0xffffff, emissiveMap: this.conTex, emissiveIntensity: .28 });
    const conSide = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: .3, metalness: .7 });
    const con = new THREE.Mesh(cgeo, [conTop, conSide]);
    con.rotation.x = -PI / 2; con.position.y = 0.02; con.castShadow = true; con.receiveShadow = true; s.add(con);

    // riichi sticks
    const stc = document.createElement('canvas'); stc.width = 256; stc.height = 24;
    const sg = stc.getContext('2d'); sg.fillStyle = '#f7f3ea'; sg.fillRect(0, 0, 256, 24); sg.fillStyle = '#d42a2a'; sg.beginPath(); sg.arc(128, 12, 8, 0, 7); sg.fill();
    const stTex = new THREE.CanvasTexture(stc); stTex.encoding = THREE.sRGBEncoding;
    const stMat = new THREE.MeshStandardMaterial({ map: stTex, roughness: .4 });
    this.sticks = [0, 1, 2, 3].map(k => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.2), [stMat, stMat, stMat, stMat, stMat, stMat]);
      const p = this.local(k, 0, 1.55);
      m.position.set(p.x, 0.54, p.z); m.rotation.y = k * PI / 2; m.visible = false; m.castShadow = true; s.add(m);
      return m;
    });

    // shared tile geometry/materials
    this.geoFront = new THREE.BoxGeometry(W, H, 0.5);
    this.geoBack = new THREE.BoxGeometry(W, H, 0.28);
    this.matIvory = new THREE.MeshStandardMaterial({ color: 0xf6f0e0, roughness: .35, metalness: 0 });
    this.matBack = new THREE.MeshStandardMaterial({ color: 0x6b3fc4, roughness: .3, metalness: .05 });
    this.matHi = new THREE.MeshStandardMaterial({ color: 0xfff1b8, roughness: .35, emissive: 0x6a5208, emissiveIntensity: .45 });
    this.setInfo({ round: 0, kyoku: 0, honba: 0, kyotaku: 0, left: 70, scores: [25000, 25000, 25000, 25000], dealer: 0, turn: -1 });
  }

  faceMat(id) {
    const t = id >> 2, red = id === 16 || id === 52 || id === 88;
    const k = t + (red ? 'r' : '');
    let m = this.faceTex.get(k);
    if (!m) {
      const tex = new THREE.CanvasTexture(MJTiles.canvas(t, red));
      tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      m = { normal: new THREE.MeshStandardMaterial({ map: tex, roughness: .3 }), hi: new THREE.MeshStandardMaterial({ map: tex, roughness: .3, emissive: 0xffd36a, emissiveIntensity: .28 }), dim: new THREE.MeshStandardMaterial({ map: tex, roughness: .3, color: 0x9c9c9c }) };
      this.faceTex.set(k, m);
    }
    return m;
  }
  tile(id) {
    let g = this.tiles.get(id);
    if (g) return g;
    g = new THREE.Group();
    const fm = this.faceMat(id);
    const front = new THREE.Mesh(this.geoFront, [this.matIvory, this.matIvory, this.matIvory, this.matIvory, fm.normal, this.matIvory]);
    front.position.z = D / 2 - 0.25;
    const back = new THREE.Mesh(this.geoBack, this.matBack);
    back.position.z = -D / 2 + 0.14;
    front.castShadow = back.castShadow = true; front.receiveShadow = true;
    g.add(front, back);
    g.rotation.order = 'YXZ';
    g.userData = { id, front, fm };
    g.visible = false;
    this.scene.add(g);
    this.tiles.set(id, g);
    return g;
  }
  setTileLook(g, look) {
    const fm = g.userData.fm;
    g.userData.front.material[4] = look === 'hi' ? fm.hi : look === 'dim' ? fm.dim : fm.normal;
  }

  // local (lx right of seat, lz toward seat) -> world
  local(seat, lx, lz) {
    const a = seat * PI / 2;
    return { x: lx * Math.cos(a) + lz * Math.sin(a), z: -lx * Math.sin(a) + lz * Math.cos(a) };
  }
  place(g, seat, lx, lz, pose, anim) {
    // pose: 'flat' (face up), 'side' (face up, turned 90°), 'stand' (standing, face to owner), 'back' (face down)
    const p = this.local(seat, lx, lz);
    const yaw = seat * PI / 2;
    let rx = 0, rz = 0, y = H / 2;
    if (pose === 'flat') { rx = -PI / 2; y = D / 2; }
    else if (pose === 'side') { rx = -PI / 2; rz = PI / 2; y = D / 2; }
    else if (pose === 'back') { rx = PI / 2; y = D / 2; }
    const to = { x: p.x, y, z: p.z, rx, ry: yaw, rz };
    g.visible = true;
    if (anim) this.tween(g, to, anim.dur || 260, anim.from);
    else { g.position.set(to.x, to.y, to.z); g.rotation.set(rx, yaw, rz); g.userData.target = to; this.dirty = true; }
  }
  tween(g, to, dur, from) {
    const f = from || { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z };
    this.tweens = this.tweens.filter(t => t.g !== g);
    this.tweens.push({ g, from: f, to, t0: performance.now(), dur });
    g.userData.target = to;
    this.dirty = true;
  }

  // ---------------------------------------------------------------- layout
  hideAll() { for (const g of this.tiles.values()) { g.visible = false; this.setTileLook(g, 'normal'); } this.sticks.forEach(s => s.visible = false); this.tweens = []; this.dirty = true; }

  layoutRiver(seat, river, animLast, fromSeatHand) {
    let row = 0, col = 0, x = -2.5 * W;
    river.forEach((r, i) => {
      if (col === ROW && row < 2) { row++; col = 0; x = -2.5 * W; }
      const g = this.tile(r.id);
      const side = !!r.sideways;
      const w = side ? H : W;
      const lx = x + (w - W) / 2;
      const lz = 2.66 + row * (H + 0.02) + (side ? (H - W) / 2 * 0 : 0);
      const anim = (animLast && i === river.length - 1) ? { dur: 240, from: this.handOrigin(seat) } : null;
      this.place(g, seat, lx, lz, side ? 'side' : 'flat', anim);
      g.userData.taken = !!r.taken;
      g.visible = !r.taken;
      this.setTileLook(g, r.dim ? 'dim' : 'normal');
      x += w + 0.02; col++;
    });
  }
  handOrigin(seat) {
    const p = this.local(seat, 0, seat === 0 ? 10 : 8.4);
    return { x: p.x, y: 1.4, z: p.z, rx: -PI / 2, ry: seat * PI / 2, rz: 0 };
  }
  layoutHand(seat, ids, drawn, open) {
    // opponents: standing tiles; open = lay face up (end of hand)
    const n = ids.length + (drawn != null ? 1 : 0);
    let x = -6.6;
    const lz = 8.45;
    const all = drawn != null ? ids.concat([drawn]) : ids;
    all.forEach((id, i) => {
      const g = this.tile(id);
      if (drawn != null && i === all.length - 1) x += 0.3;
      this.place(g, seat, x + W / 2, open ? lz - 0.2 : lz, open ? 'flat' : 'stand');
      this.setTileLook(g, 'normal');
      x += W + 0.02;
    });
    void n;
  }
  layoutMelds(seat, melds) {
    let x = 9.7;                  // right edge (from the owner's view)
    const lz0 = 8.75;
    for (const m of melds) {
      // the called tile is turned sideways: from left player -> leftmost, across -> middle, right -> rightmost
      const rel = (m.from - seat + 4) % 4;   // 1 right(shimocha), 2 across, 3 left(kamicha)
      let order = m.tiles.slice();
      if (m.type === 'kakan') order = m.tiles.filter(t => t !== m.added);
      if (m.type !== 'ankan' && m.called != null) {
        order = order.filter(t => t !== m.called);
        const pos = rel === 3 ? 0 : rel === 2 ? 1 : order.length;
        order.splice(pos, 0, m.called);
      }
      const items = order.map((id, i) => ({ id, side: m.type !== 'ankan' && id === m.called, back: m.type === 'ankan' && (i === 0 || i === 3) }));
      // place right to left
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const w = it.side ? H : W;
        x -= w;
        const g = this.tile(it.id);
        const lz = it.side ? lz0 + (H - W) / 2 : lz0;
        this.place(g, seat, x + w / 2, lz, it.back ? 'back' : it.side ? 'side' : 'flat');
        this.setTileLook(g, 'normal');
        if (it.side && m.type === 'kakan' && m.added != null) {
          const g2 = this.tile(m.added);
          this.place(g2, seat, x + w / 2, lz - W - 0.02, 'side');
          this.setTileLook(g2, 'normal');
        }
        x -= 0.02;
      }
      x -= 0.22;
    }
  }
  setStick(seat, on) { this.sticks[seat].visible = !!on; this.dirty = true; }
  highlightType(t) {
    for (const g of this.tiles.values()) {
      if (!g.visible) continue;
      const tt = g.userData.id >> 2;
      this.setTileLook(g, t != null && tt === t ? 'hi' : 'normal');
    }
    this.dirty = true;
  }

  // ---------------------------------------------------------------- console
  setInfo(o) {
    this.info = Object.assign(this.info || {}, o);
    const I = this.info;
    const c = this.conCanvas, g = c.getContext('2d');
    const S = 1024, C = S / 2, k = S / 3.9;      // px per unit
    g.setTransform(1, 0, 0, 1, 0, 0);
    // metal plate
    const bg = g.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, '#3a3f4b'); bg.addColorStop(.5, '#22262f'); bg.addColorStop(1, '#30343f');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(255,255,255,${Math.random() * .025})`; g.lineWidth = 1; const y = Math.random() * S; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (Math.random() - .5) * 8); g.stroke(); }
    const WN = ['東', '南', '西', '北'];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(C, C); g.scale(.95, .95); g.translate(-C, -C);
    // sides: wind badge + score; the current turn glows orange along its edge
    for (let s = 0; s < 4; s++) {
      g.save(); g.translate(C, C); g.rotate(-s * PI / 2);
      const wind = (s - I.dealer + 4) % 4;
      const on = I.turn === s;
      if (on) {
        const lg = g.createLinearGradient(-300, 0, 300, 0);
        lg.addColorStop(0, 'rgba(255,150,40,0)'); lg.addColorStop(.5, 'rgba(255,170,60,1)'); lg.addColorStop(1, 'rgba(255,150,40,0)');
        g.fillStyle = lg; g.shadowColor = '#ff9a2e'; g.shadowBlur = 30; g.fillRect(-300, 452, 600, 14); g.shadowBlur = 0;
      }
      // wind badge
      g.fillStyle = wind === 0 ? '#c8283a' : '#151820';
      g.strokeStyle = wind === 0 ? '#ff8a96' : 'rgba(255,255,255,.25)'; g.lineWidth = 4;
      roundRect(g, -330, 300, 104, 104, 16); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '800 70px "Shippori Mincho B1", serif';
      g.fillText(WN[wind], -278, 356);
      // score (LCD-like)
      g.fillStyle = 'rgba(0,0,0,.35)'; roundRect(g, -190, 306, 380, 92, 14); g.fill();
      g.font = '700 74px "Orbitron", "Zen Kaku Gothic New", monospace';
      g.fillStyle = on ? '#ffcf73' : '#e8ecf4'; g.shadowColor = on ? '#ff9a2e' : 'rgba(180,210,255,.6)'; g.shadowBlur = 14;
      g.fillText(String(I.scores[s]), 0, 356);
      g.shadowBlur = 0;
      g.restore();
    }
    // center screen
    g.save(); g.translate(C, C);
    const sw = 220, sh = 170;
    g.fillStyle = '#0b1530'; g.strokeStyle = '#5a6a8a'; g.lineWidth = 6;
    roundRect(g, -sw, -sh, sw * 2, sh * 2, 26); g.fill(); g.stroke();
    const sg = g.createLinearGradient(0, -sh, 0, sh); sg.addColorStop(0, 'rgba(120,180,255,.18)'); sg.addColorStop(.5, 'rgba(120,180,255,0)');
    g.fillStyle = sg; roundRect(g, -sw, -sh, sw * 2, sh * 2, 26); g.fill();
    g.fillStyle = '#7fe0ff'; g.shadowColor = '#3ab8ff'; g.shadowBlur = 18;
    g.font = '800 92px "Shippori Mincho B1", serif';
    g.fillText(`${WN[I.round]}${I.kyoku + 1}局`, 0, -58);
    g.font = '700 78px "Orbitron", monospace';
    g.fillText(`余${String(I.left).padStart(2, '0')}`, 0, 58);
    g.shadowBlur = 0;
    g.font = '700 34px "Zen Kaku Gothic New", sans-serif'; g.fillStyle = '#9fb4d8';
    g.fillText(`${I.honba}本場  供託${I.kyotaku / 1000}`, 0, 132);
    g.restore();
    void k;
    this.conTex.needsUpdate = true;
    this.dirty = true;
  }

  // ---------------------------------------------------------------- camera / loop
  resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    const a = w / h;
    this.camera.aspect = a;
    // fit the table width: landscape tilts toward the player, portrait looks almost straight down
    const P = a >= 1.9 ? { fov: 30, elev: 49, fitX: 11.2, tz: 0.9 }
      : a >= 1.2 ? { fov: 34, elev: 51, fitX: 12.4, tz: 0.35 }
      : a >= 0.8 ? { fov: 42, elev: 66, fitX: 10.8, tz: 0.4 }
      : { fov: 46, elev: 78, fitX: 7.5, tz: -1.8 };
    const V = P.fov * PI / 180, hf = 2 * Math.atan(Math.tan(V / 2) * a);
    const d = P.fitX / Math.tan(hf / 2);
    const e = P.elev * PI / 180;
    this.camera.fov = P.fov;
    this.lookAt = new THREE.Vector3(0, 0, P.tz);
    this.camera.position.set(0, d * Math.sin(e), P.tz + d * Math.cos(e));
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.lookAt);
    this.dirty = true;
  }
  _loop(now) {
    requestAnimationFrame(this._loop);
    if (this.tweens.length) {
      this.tweens = this.tweens.filter(tw => {
        let k = Math.min(1, (now - tw.t0) / tw.dur);
        const e = 1 - Math.pow(1 - k, 3);
        const f = tw.from, t = tw.to, g = tw.g;
        const arc = Math.sin(k * PI) * 0.6;
        g.position.set(f.x + (t.x - f.x) * e, f.y + (t.y - f.y) * e + arc, f.z + (t.z - f.z) * e);
        g.rotation.set(f.rx + (t.rx - f.rx) * e, f.ry + (t.ry - f.ry) * e, f.rz + (t.rz - f.rz) * e);
        return k < 1;
      });
      this.dirty = true;
    }
    if (!this.dirty || document.hidden) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
  }
  // screen position of a seat's area (for placing HTML badges)
  project(seat, lx, lz) {
    const p = this.local(seat, lx, lz);
    const v = new THREE.Vector3(p.x, 0.5, p.z).project(this.camera);
    return { x: (v.x + 1) / 2 * this.host.clientWidth, y: (1 - v.y) / 2 * this.host.clientHeight };
  }
}
root.Table3D = Table3D;
})(window);
