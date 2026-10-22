// 3D mahjong table (three.js r128). Draws rivers, opponents' hands, melds, the center console and riichi sticks.
// Seat 0 is the player (bottom); seats go counter-clockwise (1 right, 2 top, 3 left).
// Rendering is on demand: render() only when something changed or while tweens run.
(function (root) {
'use strict';
const W = 1, H = 1.36, D = 0.78;
const ROW = 6;
const PI = Math.PI;

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
    s.add(new THREE.HemisphereLight(0xfff4e6, 0x30264a, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(-6, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 4; sc.far = 50;
    key.shadow.bias = -0.0006; key.shadow.radius = 3;
    s.add(key);
    const rim = new THREE.DirectionalLight(0xd9c8ff, 0.25); rim.position.set(8, 10, -12); s.add(rim);

    // felt
    const fc = document.createElement('canvas'); fc.width = fc.height = 1024;
    const g = fc.getContext('2d');
    const rg = g.createRadialGradient(512, 512, 60, 512, 512, 760);
    rg.addColorStop(0, '#2d6b6a'); rg.addColorStop(.55, '#1e4f52'); rg.addColorStop(1, '#0f2d33');
    g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
    const img = g.getImageData(0, 0, 1024, 1024), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    // emblem rings
    g.strokeStyle = 'rgba(232,206,140,.13)'; g.lineWidth = 3;
    for (const rr of [300, 316]) { g.beginPath(); g.arc(512, 512, rr, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(232,206,140,.08)'; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.save(); g.translate(512, 512); g.rotate(k * PI / 2 + PI / 4); g.beginPath(); g.moveTo(330, 0); g.lineTo(470, 0); g.stroke(); g.restore(); }
    const felt = new THREE.CanvasTexture(fc); felt.encoding = THREE.sRGBEncoding; felt.anisotropy = 4;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 21.2), new THREE.MeshStandardMaterial({ map: felt, roughness: .95, metalness: 0 }));
    table.rotation.x = -PI / 2; table.receiveShadow = true; s.add(table);
    // rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x3a2318, roughness: .45, metalness: .2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: .35, metalness: .75 });
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.9, 1), rimMat);
      const a = k * PI / 2;
      b.position.set(Math.sin(a) * 11.1, 0.3, Math.cos(a) * 11.1); b.rotation.y = a; b.castShadow = b.receiveShadow = true; s.add(b);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.08, 0.12), goldMat);
      gl.position.set(Math.sin(a) * 10.62, 0.62, Math.cos(a) * 10.62); gl.rotation.y = a; s.add(gl);
    }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x150f24, roughness: 1 }));
    under.rotation.x = -PI / 2; under.position.y = -0.4; s.add(under);

    // console
    this.conCanvas = document.createElement('canvas'); this.conCanvas.width = this.conCanvas.height = 512;
    this.conTex = new THREE.CanvasTexture(this.conCanvas); this.conTex.encoding = THREE.sRGBEncoding; this.conTex.anisotropy = 4;
    const conSide = new THREE.MeshStandardMaterial({ color: 0x1b1530, roughness: .3, metalness: .5 });
    const con = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 4.5), [conSide, conSide, new THREE.MeshStandardMaterial({ map: this.conTex, roughness: .35, metalness: .1, emissive: 0xffffff, emissiveMap: this.conTex, emissiveIntensity: .35 }), conSide, conSide, conSide]);
    con.position.y = 0.25; con.castShadow = true; con.receiveShadow = true; s.add(con);
    const conRim = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.18, 4.7), goldMat); conRim.position.y = 0.06; s.add(conRim);

    // riichi sticks
    const stc = document.createElement('canvas'); stc.width = 256; stc.height = 24;
    const sg = stc.getContext('2d'); sg.fillStyle = '#f7f3ea'; sg.fillRect(0, 0, 256, 24); sg.fillStyle = '#d42a2a'; sg.beginPath(); sg.arc(128, 12, 8, 0, 7); sg.fill();
    const stTex = new THREE.CanvasTexture(stc); stTex.encoding = THREE.sRGBEncoding;
    const stMat = new THREE.MeshStandardMaterial({ map: stTex, roughness: .4 });
    this.sticks = [0, 1, 2, 3].map(k => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.24), [stMat, stMat, stMat, stMat, stMat, stMat]);
      const p = this.local(k, 0, 2.62);
      m.position.set(p.x, 0.06, p.z); m.rotation.y = k * PI / 2; m.visible = false; m.castShadow = true; s.add(m);
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
      const lz = 3.05 + row * (H + 0.02) + (side ? (H - W) / 2 * 0 : 0);
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
    g.clearRect(0, 0, 512, 512);
    const bg = g.createRadialGradient(256, 256, 30, 256, 256, 360);
    bg.addColorStop(0, '#2b2148'); bg.addColorStop(1, '#0d0a1a');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(232,206,140,.55)'; g.lineWidth = 3; g.strokeRect(10, 10, 492, 492);
    g.strokeStyle = 'rgba(232,206,140,.2)'; g.lineWidth = 1.5; g.strokeRect(22, 22, 468, 468);
    const WN = ['東', '南', '西', '北'];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // center
    g.fillStyle = '#f3e3b5';
    g.font = '800 64px "Shippori Mincho B1", serif';
    g.fillText(`${WN[I.round]}${['一', '二', '三', '四'][I.kyoku]}局`, 256, 214);
    g.font = '900 40px "Zen Kaku Gothic New", sans-serif';
    g.fillStyle = '#cfc4ff';
    g.fillText(`${I.left}`, 256, 272);
    g.font = '700 26px "Zen Kaku Gothic New", sans-serif';
    g.fillStyle = '#e8d9a8';
    g.fillText(`${I.honba}本  ${I.kyotaku / 1000}供`, 256, 314);
    // sides
    for (let s = 0; s < 4; s++) {
      g.save();
      g.translate(256, 256);
      g.rotate(-s * PI / 2);
      const wind = (s - I.dealer + 4) % 4;
      const on = I.turn === s;
      if (on) {
        const lg = g.createLinearGradient(-150, 0, 150, 0);
        lg.addColorStop(0, 'rgba(255,214,120,0)'); lg.addColorStop(.5, 'rgba(255,214,120,.95)'); lg.addColorStop(1, 'rgba(255,214,120,0)');
        g.fillStyle = lg; g.fillRect(-170, 222, 340, 8);
      }
      g.fillStyle = wind === 0 ? '#ff6b5e' : '#e8d9a8';
      g.font = '800 54px "Shippori Mincho B1", serif';
      g.fillText(WN[wind], -128, 182);
      g.fillStyle = on ? '#ffe39a' : '#f6f0ff';
      g.font = '900 54px "Zen Kaku Gothic New", sans-serif';
      g.fillText(String(I.scores[s]), 36, 184);
      g.restore();
    }
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
    const P = a >= 1.2 ? { fov: 38, elev: 60.5, fitX: 13.6, tz: 0.15 }
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
