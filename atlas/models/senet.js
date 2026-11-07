/* =====================================================================
   Senet on the 3D table — a game box after Tutankhamun's (Egyptian Museum, Cairo): an ebony casket with gilded edges,
   its top inlaid with the thirty squares of the 2D board (the very picture of senet/board2d.js: ivory squares with the
   hieroglyphs on 15 and 26–30), a drawer for the pieces at one end, standing on a stand with four lion legs on a sledge.
   The box follows the 2D design (settings.design): 'tut' ebony · 'faience' blue glaze · 'papyrus' painted wood · 'night' lacquer.
   Pieces: spools (side 0) and cones (side 1), turned on a lathe, in the four looks of the design tab.
   Throw sticks: four flat sticks, one face light (painted bands), the other dark.
   Registers into Table3D:
     Table3D.MODELS.senet(live)   board (+ a game in progress and the sticks unless live)
     Table3D.senet = { board(design), piece(side, look), stick(), stickUp(g, white, yaw), PR, PH, STK }
     userData: { top, pt(sq) → [x, z], design, setDesign(d) }
   Units: one square = 1.0; the board lies along x (squares 1–10 far row = −z … 21–30 near row = +z), centred on the origin.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const W = 10.8, D = 3.8, H = .46, PR = .34, PH = .62;
  const BOX = {
    tut: { body: '#1b110b', trim: '#d9b05a', trimM: .85, rough: .38, coat: .55 },
    faience: { body: '#155f80', trim: '#efe3b8', trimM: .2, rough: .22, coat: .8 },
    papyrus: { body: '#7a4a28', trim: '#c9372c', trimM: 0, rough: .7, coat: 0 },
    night: { body: '#0c1236', trim: '#e2c27a', trimM: .9, rough: .3, coat: .7 },
  };
  const DESIGNS = Object.keys(BOX);

  /* ---------- the top: the 2D board's own picture (senet/board2d.js boardSVG) ---------- */
  const tops = {};
  let b2p = null;
  function b2Ready() {   // senet/board2d.js draws the top: fetched once when this page hasn't got it yet
    if (b2p) return b2p;
    return (b2p = new Promise(res => {
      if (window.SenetBoard2D) return res();
      const sc = document.createElement('script'), base = /\/(atlas|senet)\//.test(location.pathname) ? '../senet/' : 'senet/';
      sc.src = base + 'board2d.js?v=3'; sc.onload = () => res(); sc.onerror = () => res(); document.head.appendChild(sc);
    }));
  }
  function topTex(design) {
    if (tops[design]) return tops[design];
    const TT = T(), c = document.createElement('canvas'), k = LO() ? 1.4 : 2.2;
    c.width = Math.round(1080 * k); c.height = Math.round(380 * k);
    const g = c.getContext('2d'); g.fillStyle = BOX[design].body; g.fillRect(0, 0, c.width, c.height);
    const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.anisotropy = 8;
    const draw = () => {
      const B2 = window.SenetBoard2D; if (!B2 || !B2.boardSVG) return;
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { g.drawImage(im, 0, 0, c.width, c.height); t.needsUpdate = true; if (X.kick) X.kick(300); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B2.boardSVG(design, 'h'));
    };
    if (window.SenetBoard2D) draw(); else b2Ready().then(draw);   // (the portal builds the board before the game's own scripts arrive)
    return (tops[design] = t);
  }

  /* ---------- the stand: four lion legs on a sledge ---------- */
  const geos = {};
  function legGeo() {
    if (geos.leg) return geos.leg;
    const TT = T(), pts = [];
    const prof = [[0, 0], [.2, 0], [.24, .05], [.2, .12], [.13, .2], [.11, .32], [.12, .45], [.1, .55], [.13, .6], [.13, .66], [0, .66]];
    for (const [r, y] of prof) pts.push(new TT.Vector2(r, y));
    const g = new TT.LatheGeometry(pts, LO() ? 12 : 20); if (X.share) X.share(g); return (geos.leg = g);
  }
  function stand(design) {
    const TT = T(), g = new TT.Group(), B = BOX[design];
    const wood = mat('st' + design, () => phys({ color: B.body, roughness: B.rough + .1, clearcoat: B.coat ? B.coat * .6 : undefined, clearcoatRoughness: .3 }));
    const gold = mat('tr' + design, () => phys({ color: B.trim, roughness: .3, metalness: B.trimM }));
    const LH = .66, top = -LH;
    // the rails under the box
    const rail = (w, d, x, z) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .12, d), wood); m.position.set(x, -.06, z); m.castShadow = m.receiveShadow = true; g.add(m); };
    rail(W - .6, .16, 0, -D / 2 + .32); rail(W - .6, .16, 0, D / 2 - .32); rail(.16, D - .64, -W / 2 + .4, 0); rail(.16, D - .64, W / 2 - .4, 0);
    // legs (gilded paws)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = new TT.Mesh(legGeo(), wood); l.position.set(sx * (W / 2 - .45), top - .02, sz * (D / 2 - .34)); l.castShadow = true; g.add(l);
      const paw = new TT.Mesh(new TT.SphereGeometry(.2, LO() ? 10 : 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold); paw.scale.set(1.15, .55, 1.4); paw.position.set(sx * (W / 2 - .45), top - .02, sz * (D / 2 - .34) + .05); g.add(paw);
      const band = new TT.Mesh(new TT.CylinderGeometry(.135, .135, .05, LO() ? 12 : 20), gold); band.position.set(sx * (W / 2 - .45), top + .58, sz * (D / 2 - .34)); g.add(band);
    }
    // the sledge runners
    for (const sz of [-1, 1]) {
      const r = new TT.Mesh(new TT.BoxGeometry(W - .2, .1, .3), wood); r.position.set(0, top - .07, sz * (D / 2 - .34)); r.castShadow = r.receiveShadow = true; g.add(r);
      for (const sx of [-1, 1]) { const tip = new TT.Mesh(new TT.CylinderGeometry(.15, .15, .3, LO() ? 10 : 16, 1, false, 0, Math.PI), wood); tip.rotation.x = Math.PI / 2; tip.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2; tip.position.set(sx * (W / 2 - .1), top - .07 + .0, sz * (D / 2 - .34)); g.add(tip); }
    }
    return g;
  }

  /* ---------- the box ---------- */
  function board(design) {
    design = DESIGNS.includes(design) ? design : 'tut';
    const TT = T(), g = new TT.Group(), B = BOX[design];
    const body = mat('bd' + design, () => phys({ color: B.body, roughness: B.rough, clearcoat: B.coat || undefined, clearcoatRoughness: .25, envMapIntensity: .9 }));
    const gold = mat('tr' + design, () => phys({ color: B.trim, roughness: .3, metalness: B.trimM }));
    const topM = mat('top' + design, () => phys({ map: topTex(design), color: '#e4ddd0', roughness: design === 'faience' ? .35 : design === 'papyrus' ? .8 : .6, clearcoat: design === 'papyrus' ? undefined : .12, clearcoatRoughness: .45, envMapIntensity: .5 }));   // (toned down: the white squares glared under the table lights)
    const box = new TT.Mesh(new TT.BoxGeometry(W, H, D), [body, body, topM, body, body, body]);
    box.position.y = H / 2; box.castShadow = box.receiveShadow = true; g.add(box);
    // gilded edges round the top and the foot of the box
    const edge = (w, d, x, z, y) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .045, d), gold); m.position.set(x, y, z); g.add(m); };
    for (const y of [H - .01, .02]) { edge(W + .03, .04, 0, -D / 2, y); edge(W + .03, .04, 0, D / 2, y); edge(.04, D + .03, -W / 2, 0, y); edge(.04, D + .03, W / 2, 0, y); }
    // the drawer at the +x end: its front with a gilded frame and a knob
    const dr = new TT.Mesh(new TT.BoxGeometry(.03, H * .56, D * .6), body); dr.position.set(W / 2 + .016, H * .48, 0); g.add(dr);
    const fr = (w, h, y, z) => { const m = new TT.Mesh(new TT.BoxGeometry(.035, h, w), gold); m.position.set(W / 2 + .03, y, z); g.add(m); };
    fr(D * .62, .025, H * .48 + H * .28, 0); fr(D * .62, .025, H * .48 - H * .28, 0); fr(.025, H * .56, H * .48, -D * .31); fr(.025, H * .56, H * .48, D * .31);
    const knob = new TT.Mesh(new TT.SphereGeometry(.07, 12, 10), gold); knob.position.set(W / 2 + .08, H * .48, 0); g.add(knob);
    const st = stand(design); st.position.y = 0; g.add(st);
    // the box stands on its stand: lift everything so the sledge rests on the table (y = 0)
    const LIFT = .66 + .12; g.children.forEach(ch => { ch.position.y += LIFT; });
    g.userData = { top: LIFT + H + .001, design, W, D, H, pt: sq => { const r = Math.floor((sq - 1) / 10), k = (sq - 1) % 10, c = r === 1 ? 9 - k : k; return [c - 4.5, r - 1]; }, piece: (side, look) => piece(side, look), PR, PH, lift: LIFT };
    return g;
  }

  /* ---------- the pieces: spools and cones ---------- */
  function spoolGeo() {
    if (geos.spool) return geos.spool;
    const TT = T(), pts = [], P = [[0, 0], [.33, 0], [.34, .03], [.33, .1], [.26, .14], [.18, .22], [.15, .31], [.18, .4], [.26, .48], [.33, .52], [.34, .58], [.32, .615], [0, .62]];
    for (const [r, y] of P) pts.push(new TT.Vector2(r, y));
    const g = new TT.LatheGeometry(pts, LO() ? 18 : 30); if (X.share) X.share(g); return (geos.spool = g);
  }
  function coneGeo() {
    if (geos.cone) return geos.cone;
    const TT = T(), pts = [], P = [[0, 0], [.32, 0], [.33, .04], [.29, .1], [.2, .3], [.12, .5], [.09, .58]];
    for (const [r, y] of P) pts.push(new TT.Vector2(r, y));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + .55 + i / 8 * (Math.PI - .55); pts.push(new TT.Vector2(Math.max(0, Math.cos(a) * .12), .66 + Math.sin(a) * .1)); }
    pts.push(new TT.Vector2(0, .76));
    const g = new TT.LatheGeometry(pts, LO() ? 18 : 30); if (X.share) X.share(g); return (geos.cone = g);
  }
  const PIECES = {
    tut: [{ color: '#efe2c3', roughness: .42, clearcoat: .3 }, { color: '#22150c', roughness: .3, clearcoat: .7 }],
    faience: [{ color: '#f4f2e6', roughness: .2, clearcoat: .9 }, { color: '#2a95c4', roughness: .18, clearcoat: .9 }],
    gold: [{ color: '#e9b94a', roughness: .28, metalness: .95 }, { color: '#2a46a8', roughness: .35, metalness: .05, clearcoat: .6 }],
    modern: [{ color: '#ead6b3', roughness: .5 }, { color: '#2a2c36', roughness: .25, clearcoat: .8 }],
  };
  function piece(side, look) {
    look = PIECES[look] ? look : 'tut';
    const TT = T(), g = new TT.Group();
    const m = mat('pc' + look + side, () => phys(Object.assign({ envMapIntensity: 1 }, PIECES[look][side])));
    const body = new TT.Mesh(side === 0 ? spoolGeo() : coneGeo(), m); body.castShadow = true; body.receiveShadow = true; g.add(body);
    if (look === 'faience' || look === 'gold') {   // a painted band
      const bm = mat('pb' + look + side, () => phys({ color: look === 'gold' ? (side ? '#e9b94a' : '#2a46a8') : (side ? '#0c2f45' : '#2a95c4'), roughness: .3, metalness: look === 'gold' && side ? .9 : 0 }));
      const band = new TT.Mesh(new TT.TorusGeometry(side ? .27 : .3, .018, 6, LO() ? 18 : 28), bm); band.rotation.x = Math.PI / 2; band.position.y = side ? .12 : .54; g.add(band);
    }
    g.userData = { side, h: side ? .76 : .62 };
    return g;
  }

  /* ---------- the throw sticks ---------- */
  const STK = { L: 1.05, Wd: .15, Th: .05 };
  function stickFace(white) {
    return mat('sf' + white, () => {
      // both faces are wood: the back bare, oiled acacia with its grain; the front painted white over the same grain, bands and a lozenge
      const grain = (c, w, h, base, line, alpha) => {
        c.fillStyle = base; c.fillRect(0, 0, w, h);
        let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < 26; i++) {
          const x0 = rnd() * w, amp = 2 + rnd() * 5, ph = rnd() * 6.28, fr = 2 + rnd() * 3;
          c.strokeStyle = line; c.globalAlpha = alpha * (.35 + rnd() * .65); c.lineWidth = .8 + rnd() * 1.8;
          c.beginPath(); for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y / h * fr * 6.28 + ph) * amp; y ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        }
        for (let i = 0; i < 3; i++) { const y = rnd() * h, x = rnd() * w; c.globalAlpha = alpha * .8; c.fillStyle = line; c.beginPath(); c.ellipse(x, y, 3 + rnd() * 3, 9 + rnd() * 8, 0, 0, 6.28); c.fill(); }   // a few knots
        c.globalAlpha = 1;
      };
      if (!white) {
        const t = X.canvasTex('snStickB2', 64, 384, (c, w, h) => grain(c, w, h, '#7a4a28', '#2e170a', .55));
        return phys({ map: t, color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .35 });
      }
      const t = X.canvasTex('snStickW2', 64, 384, (c, w, h) => {
        grain(c, w, h, '#fbf3df', '#b99a68', .28);
        c.strokeStyle = '#a3301c'; c.lineWidth = 6; [40, 62, h - 62, h - 40].forEach(y => { c.beginPath(); c.moveTo(6, y); c.lineTo(w - 6, y); c.stroke(); });
        c.fillStyle = 'rgba(47,91,208,.22)'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h * .32); c.lineTo(w - 12, h / 2); c.lineTo(w / 2, h * .68); c.lineTo(12, h / 2); c.closePath(); c.fill(); c.stroke();
      });
      return phys({ map: t, color: '#ffffff', roughness: .5, clearcoat: .2, clearcoatRoughness: .5 });
    });
  }
  // a throw stick: flat-ish but rounded across (both faces bulge a little, more on the painted one) and bowed a touch along its length
  let stickGeo = null;
  function stick() {
    const TT = T(), g = new TT.Group();
    const dark = stickFace(false), light = stickFace(true);
    if (!stickGeo) {
      stickGeo = new TT.BoxGeometry(STK.Wd, STK.Th, STK.L, 8, 1, 10);
      const P = stickGeo.attributes.position, hw = STK.Wd / 2, hl = STK.L / 2;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), u = x / hw, v = z / hl;
        const dome = (1 - u * u) * (y > 0 ? .028 : .012);   // rounded across
        const ends = 1 - .12 * v * v;                       // a little thinner toward the ends
        P.setY(i, (y > 0 ? y + dome : y - dome) * ends + .018 * (1 - v * v));   // bowed along the length
        P.setX(i, x * (1 - .06 * v * v));
      }
      stickGeo.computeVertexNormals();
    }
    const m = new TT.Mesh(stickGeo, [dark, dark, light, dark, dark, dark]);
    m.castShadow = true; m.receiveShadow = true; g.add(m); g.userData.body = m;
    return g;
  }
  // a stick resting with its light face up (white) or down, turned to yaw
  function stickUp(g, white, yaw) { g.rotation.set(0, yaw || 0, 0); g.userData.body.rotation.set(0, 0, white ? 0 : Math.PI); }

  X.MODELS.senet = function (live) {
    const d = (() => { try { return (JSON.parse(localStorage.getItem('aicoding-senet') || '{}').settings || {}).design; } catch (e) { return null; } })();
    const g = board(d), U = g.userData;
    if (live) return g;
    // a game in progress (Light = spools, Dark = cones) and the sticks beside the box
    const put = (sq, side) => { const p = piece(side, 'tut'), [x, z] = U.pt(sq); p.position.set(x, U.top, z); g.add(p); const sh = X.contact(PR * .95, .45); sh.position.set(x, U.top + .001, z); g.add(sh); };
    [[3, 0], [4, 0], [9, 0], [14, 0], [26, 0], [5, 1], [11, 1], [12, 1], [17, 1], [22, 1]].forEach(([s, sd]) => put(s, sd));
    [1, 0, 1, 1].forEach((w, i) => { const s = stick(); stickUp(s, !!w, .15 * (i - 1.5)); s.position.set(-3 + i * .35, STK.Th / 2, D / 2 + .9); g.add(s); });
    g.scale.setScalar(.93);   // (the showcase on the table: longest side ≈ 10.2, as the other long boards — ur, hex, mancala)
    return g;
  };
  X.senet = { board, piece, stick, stickUp, PR, PH, STK, W, D, H, DESIGNS };
})();
