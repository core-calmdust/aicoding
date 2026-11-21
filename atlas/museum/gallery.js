/* World Board Game Atlas — 博物館の「所蔵品」 (collection room, 2026-11-21).
   Real treasures of game history, each rebuilt in 3D as faithfully as the polygon budget allows and shown in a dark
   gallery case: drag to turn it, wheel / pinch to come closer, numbered points pick out the details, a 10 cm bar gives the
   real size. Every piece names its museum, its number and the sources it was modelled from.
   Room: a grid of cards (images/atlas/ex/<id>.webp, made by atlas/tools/exhibits.html) → the viewer (a full-screen case).
   Some pieces are special exhibitions: they open when the player reaches a goal in a game (achievements of that game).
   Code: this file (room + viewer) · museum/ex/<id>.js builds each piece (AtlasEx[id].build(THREE, Table3D) → Group)
   Texts: museum/gallery-<lang>.js (MUSEUM_GAL_T[lang]): ui + one entry per piece.
   The viewer has its own small WebGL renderer, made on open and disposed on close; it draws only while something moves
   (a turn, a zoom, the slow turntable) and never while the window is in the background. */
(function () {
  'use strict';
  const V = 39;
  /* ---------- the pieces: id, the game it belongs to, its scale (cm per model unit), the camera's start, the details ----------
     lock: { game, ach } → open after that many achievements of the game. src: the files the piece needs (besides ex/<id>.js) */
  const EX = [
    { id: 'ur', game: 'ur', src: () => window.AtlasLazy ? AtlasLazy.need('ur') : 0, cm: 30.1 / 8.52, view: [-.45, .7, .92],
      spots: [[-3.5, .44, -1], [-.5, .44, 0], [1, .44, 0], [3.5, .44, -1], [-2.5, .22, 1.62]] },
    { id: 'senet', game: 'senet', cm: 1, view: [.62, .4, .9], spots: [[-11, 28.4, -3.5], [17, 28.4, 4], [-6, 23.6, 7.2], [28.5, 24.2, 0], [23.6, 3.6, 7.4], [-10, 1.5, 7.6], [-2, .9, 13.8]] },
    { id: 'shosoin', game: 'go', cm: 1, view: [.35, .58, .82], spots: [[0, 12.8, 0], [-15.5, 12.8, -15.5], [0, 10.4, 24.6], [27.4, 9.6, 18.0], [32.3, 10.2, 18.0], [-14, .8, 23.2]] },
    { id: 'sugoroku', game: 'backgammon', cm: 1, view: [.45, .55, .92],
      spots: [[0, 16.0, 12.6], [-12.4, 16.0, 12.8], [-24.2, 16.0, 0], [8, 14.8, 15.55], [-17, 7, 15.5], [5.7, 16.7, -1.3]] },
    { id: 'pyrgus', game: 'backgammon', cm: 1, view: [.55, .32, 1], spots: [[0, 18.6, 4.6], [4.6, 20.4, 0], [0, 12, 0], [0, 3.2, 4.6], [1.4, .9, 6.3]] },
    { id: 'ballinderry', game: 'tafl', cm: 1, view: [.2, .78, .95],
      spots: [[0, 1.05, 0], [-7.05, 1.05, -7.05], [-6, 2.55, -10.45], [-6, 2.55, 10.45], [-14.6, 1.6, 0], [13.6, 1.4, 0], [4, 1.05, 1.1]] },
    { id: 'lewis', game: 'chess', cm: 1, view: [.12, .4, .82],
      spots: [[-2.7, 5.3, -1.8], [2.25, 8.3, -2.9], [8.5, 9.9, -2.9], [-6.9, 4.3, .9], [-3.35, 7.3, 5.37], [4.4, 4.1, 4.0], [10.6, 2.5, -2.0]] },
    { id: 'charlemagne', game: 'chess', cm: 1, view: [.1, .42, .8],
      spots: [[0, 11.4, -3.4], [2.3, 6.0, -3.5], [-12.2, 9.4, -3.0], [11.9, 7.6, 8.7], [11.6, 8.4, -2.4], [-11.9, 8.6, 8.3], [0, 3.6, 8.8]] },
    { id: 'nishapur', game: 'chess', cm: 1, view: [.9, .55, .78],
      spots: [[3.1, 5.0, 22.9], [-3.1, 4.2, 22.8], [-9.3, 3.4, 21.2], [-15.5, 3.6, 21.0], [-21.7, 3.9, 21.7], [-3.1, 2.4, 15.5], [3.1, 5.0, -22.9]] },
    { id: 'ottoman', game: 'backgammon', cm: 1, flip: true, view: [0, .95, .82], lock: { game: 'backgammon', ach: 3 },
      spots: [[-21.5, 2.1, -15], [-14.1, 2.1, 0], [-27.6, 2.55, 12], [-8.2, 0, 2.7], [-2.7, 0, 8.1], [-24.9, 0, 0], [-24.9, 0, -24.8], [28.3, 1.0, 12]], side: [0, 0, 0, 1, 1, 1, 1, 1] },
    { id: 'kofukuji', game: 'shogi', cm: 1, view: [0, .95, .78], lock: { game: 'shogi', ach: 3 } },   // (spots: from the model's userData)
  ];
  const T = l => (window.MUSEUM_GAL_T && (MUSEUM_GAL_T[l] || MUSEUM_GAL_T.en)) || {};
  const ui = (l, k) => { const a = T(l).ui || {}, b = T('en').ui || {}; return a[k] != null ? a[k] : (b[k] != null ? b[k] : k); };
  const ex = (l, id) => Object.assign({}, (T('en').ex || {})[id] || {}, (T(l).ex || {})[id] || {});
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  const textsFor = l => Promise.all([...new Set(['ja', 'en', l])].map(x => (window.MUSEUM_GAL_T && MUSEUM_GAL_T[x]) ? 0 : load('museum/gallery-' + x + '.js?v=' + V)));
  const phone = () => innerWidth < 820;

  let ctx = null, lang = 'ja', host = null;
  const isOpen = e => { if (!e.lock) return true; try { return (ctx.achDone ? ctx.achDone(e.lock.game) : 0) >= e.lock.ach; } catch (x) { return false; } };

  /* ---------- the room: an intro and the cards ---------- */
  function render(sec, c) {
    ctx = c; lang = c.lang || 'ja'; host = sec;
    if (!sec.querySelector('.gxgrid')) sec.innerHTML = `<p class="gxsub"></p><div class="gxguide"></div><div class="gxgrid"></div>`;
    textsFor(lang).then(() => {
      if (host !== sec) return;
      sec.querySelector('.gxsub').textContent = ui(lang, 'sub');
      // the guide: ミュゼフク's four ranks, the ones earned in colour
      const R = ranks(seenList()), gd = sec.querySelector('.gxguide');
      gd.innerHTML = `<span class="gxav">${[0, 1, 2, 3].map(t => `<img src="../images/atlas/av/musowl-${t}.webp" alt="" class="${R.includes(t) ? 'on' : ''}">`).join('')}</span><span class="gxgt"><b>${esc(ui(lang, 'guideH'))}</b><small>${esc(ui(lang, 'guide'))}</small></span><i>${R.length}/4</i>`;
      sec.querySelector('.gxgrid').innerHTML = EX.map(e => {
        const t = ex(lang, e.id), g = ctx.games.find(x => x.id === e.game), op = isOpen(e);
        const cond = e.lock && !op ? ui(lang, 'lock').replace('{g}', g ? ctx.gname(g).replace(/\s*V\d+$/, '') : e.lock.game).replace('{n}', e.lock.ach) : '';
        return `<button type="button" class="card gxc${op ? '' : ' locked'}${e.lock ? ' sp' : ''}" data-id="${e.id}" style="--c:${g ? g.color : '#8a6a3a'}">
          <span class="gxpic"><img src="../images/atlas/ex/${e.id}.webp?v=${V}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">${op ? '' : `<span class="gxlock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span>`}${e.lock ? `<span class="gxsp">${esc(ui(lang, 'special'))}</span>` : ''}</span>
          <span class="gxtx"><b>${esc(t.name || e.id)}</b><small>${esc(t.date || '')} · ${esc(t.where || '')}</small><i>${esc(op ? (t.museum || '') : cond)}</i></span></button>`;
      }).join('');
      sec.querySelectorAll('.gxc').forEach(b => b.onclick = () => { const e = EX.find(x => x.id === b.dataset.id); if (isOpen(e)) open(e.id); else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } });
    });
  }

  /* ---------- the viewer ---------- */
  let V3 = null;   // { R, scene, cam, obj, … } while open
  function open(id) {
    const e = EX.find(x => x.id === id); if (!e || V3) return;
    const t = ex(lang, id), g = ctx.games.find(x => x.id === e.game), B0 = e.flip ? { flip: true } : null;
    const ov = document.createElement('div'); ov.className = 'exv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="exstage"><canvas></canvas><div class="exspots"></div>
        <div class="exscale" aria-hidden="true" dir="ltr"><i></i><span>10 cm</span></div>
        <p class="exhint">${esc(ui(lang, phone() ? 'hintT' : 'hint'))}</p>
        <div class="exbtns"><button type="button" class="exb" data-k="spin" aria-label="${esc(ui(lang, 'spin'))}" title="${esc(ui(lang, 'spin'))}"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg></button>${B0 && B0.flip ? `<button type="button" class="exb" data-k="flip" aria-label="${esc(ui(lang, 'flip'))}" title="${esc(ui(lang, 'flip'))}"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6"/><path d="M18 3v4h-4M6 21v-4h4"/></svg></button>` : ''}<button type="button" class="exb" data-k="reset" aria-label="${esc(ui(lang, 'reset'))}" title="${esc(ui(lang, 'reset'))}"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>
        <p class="exload">${esc(ui(lang, 'loading'))}</p></div>
      <aside class="exinfo"><button type="button" class="exclose" aria-label="${esc(ui(lang, 'close'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="exscroll"><small class="exkind">${esc(ui(lang, 'collection'))}${e.lock ? ` · ${esc(ui(lang, 'special'))}` : ''}</small><h2>${esc(t.name || id)}</h2>${t.alt ? `<p class="exalt">${esc(t.alt)}</p>` : ''}
        <dl class="exfacts">${[['date', t.date], ['where', t.found], ['museum', t.museum ? t.museum + (t.no ? `（${t.no}）` : '') : ''], ['mat', t.mat], ['size', t.size]].filter(r => r[1]).map(([k, v]) => `<dt>${esc(ui(lang, k))}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${(t.p || []).map(p => `<p class="exp">${esc(p)}</p>`).join('')}
        ${(t.spots || []).length ? `<h3>${esc(ui(lang, 'look'))}</h3><ol class="exlook">${t.spots.map((s, i) => `<li><button type="button" data-n="${i}"><u>${i + 1}</u><span><b>${esc(s[0])}</b>${esc(s[1])}</span></button></li>`).join('')}</ol>` : ''}
        ${t.model ? `<h3>${esc(ui(lang, 'aboutModel'))}</h3><p class="exp sm">${esc(t.model)}</p>` : ''}
        ${(t.src || []).length ? `<h3>${esc(ui(lang, 'sources'))}</h3><ul class="exsrc">${t.src.map(([n, u]) => `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>` : esc(n)}</li>`).join('')}</ul>` : ''}
        ${g ? `<div class="exacts"><button type="button" class="amplay" style="--c:${g.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>${esc(ui(lang, 'play').replace('{g}', ctx.gname(g).replace(/\s*V\d+$/, '')))}</button></div>` : ''}
        </div></aside>`;
    document.body.appendChild(ov); document.documentElement.classList.add('exv-open');
    requestAnimationFrame(() => ov.classList.add('on'));
    // the phone's back gesture / the browser's back button closes the case (a history entry while it is open)
    let hist = false; try { history.pushState(Object.assign({}, history.state, { exv: id }), ''); hist = true; } catch (x) {}
    const onPop = () => { hist = false; close(); };
    addEventListener('popstate', onPop);
    const close = () => { if (!V3 || V3.ov !== ov) return; removeEventListener('popstate', onPop); if (hist) { hist = false; try { history.back(); } catch (x) {} }
      teardown(); ov.classList.remove('on'); document.documentElement.classList.remove('exv-open'); setTimeout(() => ov.remove(), 260); };
    ov.querySelector('.exclose').onclick = close;
    const pb = ov.querySelector('.amplay'); if (pb) pb.onclick = () => { close(); setTimeout(() => ctx.open(g.id, null), 280); };
    V3 = { ov, e, close, spin: true };
    const onKey = ev => { if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
      // (2026-11-21) I: the 3D debug panel for the piece on show (the room's own panel — table3d.js — stays out of it: stopPropagation)
      if ((ev.key === 'i' || ev.key === 'I') && !ev.repeat && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !(ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]'))) { ev.stopPropagation(); dbgToggle(); } };
    document.addEventListener('keydown', onKey); V3.offKey = () => document.removeEventListener('keydown', onKey);
    ov.querySelectorAll('.exlook [data-n]').forEach(b => b.onclick = () => focusSpot(+b.dataset.n));
    ov.querySelector('[data-k="reset"]').onclick = () => { if (V3 && V3.home) { V3.spin = false; tween(V3.home); } };
    ov.querySelector('[data-k="spin"]').onclick = () => { if (!V3) return; V3.spin = !V3.spin; ov.querySelector('[data-k="spin"]').classList.toggle('on', V3.spin); go(); };
    ov.querySelector('[data-k="spin"]').classList.add('on');
    const fb = ov.querySelector('[data-k="flip"]'); if (fb) fb.onclick = () => { if (!V3 || !V3.flip) return; V3.flip.to = V3.flip.to ? 0 : 1; fb.classList.toggle('on', !!V3.flip.to); go(); };
    Promise.all([load('museum/ex/' + id + '.js?v=' + V), e.src ? e.src() : 0]).then(() => { const B = window.AtlasEx && AtlasEx[id]; return B && B.ready ? B.ready() : 0; }).then(() => { if (V3 && V3.ov === ov) build(e); });
  }

  // a soft gallery environment for reflections (a dark room with a bright ceiling panel and warm side washes), made once per renderer
  function envMap(R, TT) {
    const s = new TT.Scene(), pm = new TT.PMREMGenerator(R);
    const room = new TT.Mesh(new TT.BoxGeometry(20, 12, 20), new TT.MeshBasicMaterial({ color: 0x1a120c, side: TT.BackSide })); s.add(room);
    const panel = (w, h, c, x, y, z, rx, ry) => { const m = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: c, side: TT.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); s.add(m); };
    /* (the ceiling light: two narrow strips, not one big panel — a big bright panel mirrored in flat glossy boards as a white wash that hid the inlay) */ panel(1.6, 7, 0xd8cdb8, -3.2, 5.9, -1.5, Math.PI / 2); panel(1.6, 7, 0xb8ad9c, 3.4, 5.9, 2.5, Math.PI / 2); panel(8, 8, 0x3a3128, 0, 5.95, 0, Math.PI / 2); panel(6, 4, 0x7a5a3a, -9.9, 1, 0, 0, Math.PI / 2); panel(6, 4, 0x6a5040, 9.9, 1, 0, 0, -Math.PI / 2); panel(10, 3, 0x3a2a1e, 0, -1, -9.9);
    const rt = pm.fromScene(s, .04); pm.dispose(); s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt;
  }
  function build(e) {
    const TT = window.THREE, X = window.Table3D, ov = V3.ov, cv = ov.querySelector('canvas'), stage = ov.querySelector('.exstage');
    const B = window.AtlasEx && AtlasEx[e.id]; if (!TT || !B) { ov.querySelector('.exload').textContent = ui(lang, 'fail'); return; }
    const R = new TT.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, phone() ? 1.5 : 2));
    R.outputColorSpace = TT.SRGBColorSpace; R.toneMapping = TT.ACESFilmicToneMapping; R.toneMappingExposure = .85;   // (.98 blew out ivory and pale wood on phones)
    R.shadowMap.enabled = true; R.shadowMap.type = TT.PCFSoftShadowMap; R.shadowMap.autoUpdate = false;
    const scene = new TT.Scene(), env = envMap(R, TT); scene.environment = env.texture;
    let obj; try { obj = B.build(TT, X, kit); } catch (err) { console.warn('[gallery]', err); ov.querySelector('.exload').textContent = ui(lang, 'fail'); R.dispose(); return; }
    const aniso = R.capabilities.getMaxAnisotropy();
    obj.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      // every texture mip-mapped and filtered at the device's best anisotropy (fine inlay lines shimmered at a distance on phones)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) { const t = m[k]; if (t && t.isTexture) { t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = TT.LinearMipmapLinearFilter; } } }); });
    // sit it on a plinth: the plinth fits the piece's footprint with a margin
    const bb = new TT.Box3().setFromObject(obj), sz = bb.getSize(new TT.Vector3()), cen = bb.getCenter(new TT.Vector3());
    obj.position.x -= cen.x; obj.position.z -= cen.z; obj.position.y -= bb.min.y;
    const pw = sz.x * 1.16 + Math.max(sz.x, sz.z) * .08, pd = sz.z * 1.16 + Math.max(sz.x, sz.z) * .08, ph = Math.max(sz.x, sz.z) * .14;
    const plMat = new TT.MeshStandardMaterial({ color: new TT.Color('#1b1612').convertSRGBToLinear(), roughness: .9, metalness: 0 });
    const plTop = new TT.MeshStandardMaterial({ color: new TT.Color('#231d18').convertSRGBToLinear(), roughness: .95, metalness: 0 });
    const plinth = new TT.Mesh(new TT.BoxGeometry(pw, ph, pd), [plMat, plMat, plTop, plMat, plMat, plMat]); plinth.position.y = -ph / 2; plinth.receiveShadow = true;
    // a pivot at the piece's middle, so a two-sided piece (B.flip) can be turned over in the case
    const pivot = new TT.Group(); pivot.position.y = sz.y / 2; obj.position.y -= sz.y / 2; pivot.add(obj);
    scene.add(plinth, pivot);
    // light: a warm key spot from above and in front (the only shadow), a cool rim from behind, a soft fill
    const rf = Math.hypot(sz.x, sz.z) / 2, r = Math.max(rf, Math.hypot(rf, sz.y / 2) * .92) + .2;   // (tall pieces: the height counts too)
    scene.add(new TT.HemisphereLight(0xfff2e0, 0x2a1d14, .62)); scene.environmentIntensity = .5;   // (the room's reflections halved, the diffuse fill raised instead: seen at a low angle, glossy tops mirrored the walls and washed out)
    const key = new TT.SpotLight(0xfff0dc, 2.5, 0, .55, .6, 0); key.position.set(r * .2, r * 3.7, r * .5);   // (steep, ~82°: its glare on a flat board then falls outside the camera's range of pitch) key.target.position.set(0, 0, 0); key.castShadow = true;
    key.shadow.mapSize.set(phone() ? 1024 : 2048, phone() ? 1024 : 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.camera.near = r * .5; key.shadow.camera.far = r * 8; key.shadow.radius = 4;
    scene.add(key, key.target);
    // rim and fill come in almost level with the table: they edge and fill the sides but barely touch a flat top. (Higher up — 25° and 17° —
    // each one's mirror image flashed across the whole top of a glossy board as the camera passed: the "white-out" and the flicker.)
    const rim = new TT.DirectionalLight(0xcfe0ff, .6); rim.position.set(-r * 2, r * .08, -r * 2.5); scene.add(rim);
    const fill = new TT.DirectionalLight(0xffe2c4, .34); fill.position.set(-r * 2.5, r * .1, r * 2); scene.add(fill);
    const cam = new TT.PerspectiveCamera(30, 1, Math.max(.01, r * .08), r * 14);   // (a tight near/far: phones have little depth precision, and coplanar inlays shimmered)
    const tgt = new TT.Vector3(0, sz.y > rf ? sz.y * .46 : Math.min(sz.y * .45, r * .3), 0);
    // the start view: [yaw, pitch, distance factor]
    const [yaw0, pit0, df] = e.view || [-.5, .6, 1];
    const fitD = () => { const a = cam.aspect, vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * a); return r * 1.32 / Math.sin(Math.min(vf, hf) / 2); };
    Object.assign(V3, { R, scene, cam, obj, pivot, py: sz.y / 2, flip: B.flip ? { t: 0, to: 0 } : null, env, tgt, r, e, sph: { yaw: yaw0, pit: pit0, d: 0 }, vel: { yaw: 0, pit: 0 }, home: null, raf: 0, need: 2, last: 0, plinth, fitD, df });
    const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (!V3.sph.d) V3.sph.d = fitD() * df; V3.home = { yaw: yaw0, pit: pit0, d: fitD() * df }; go(); };
    V3.ro = new ResizeObserver(resize); V3.ro.observe(stage); resize();
    // spots: the numbered details (model coordinates; the piece was moved onto the plinth, so add its offset)
    V3.spots = (e.spots || obj.userData.spots || []).map(p => new TT.Vector3(p[0], p[1], p[2]));   // (model coordinates: placed through the piece's matrix each frame)
    const sl = ov.querySelector('.exspots'); sl.innerHTML = V3.spots.map((_, i) => `<button type="button" class="exspot" data-n="${i}">${i + 1}</button>`).join('');
    sl.querySelectorAll('.exspot').forEach(b => b.onclick = () => focusSpot(+b.dataset.n));
    bindInput(stage);
    R.shadowMap.needsUpdate = true;
    ov.querySelector('.exload').hidden = true;
    go();
    seen(e.id);
  }
  /* ---------- ミュゼフク (musowl): the museum's Atlamo, earned by looking round the collection ----------
     N one piece seen · R every regular piece · SR a special exhibit opened · SSR every piece, special ones included */
  const SEEN = 'atlas-museum-seen';
  const seenList = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]') || []; } catch (x) { return []; } };
  function ranks(L) {
    const reg = EX.filter(x => !x.lock), sp = EX.filter(x => x.lock), has = x => L.includes(x.id), r = [];
    if (L.length) r.push(0); if (reg.every(has)) r.push(1); if (sp.some(isOpen)) r.push(2); if (EX.every(has)) r.push(3); return r;
  }
  function seen(id) {
    let L = seenList();
    if (!L.includes(id)) { L.push(id); try { localStorage.setItem(SEEN, JSON.stringify(L)); } catch (x) {} }
    reward(L);
  }
  function reward(L) {
    if (!ctx.grant) return;
    const want = ranks(L);
    if (host && host.isConnected) render(host, ctx);   // (the guide strip in the room shows the new rank)
    const got = ctx.grant(want.map(t => 'av-musowl-' + t)); if (!got.length || !V3) return;
    const box = document.createElement('div'); box.className = 'exgift';
    box.innerHTML = got.map(g => `<div class="exg"><img src="${g.img}" alt=""><div><small>${esc(ui(lang, 'gift'))}</small><b>${esc(g.name)}</b></div></div>`).join('');
    // shown once the case has settled (the first frames upload the textures), then kept for a while
    const ov = V3.ov; setTimeout(() => { if (!ov.isConnected) return; ov.querySelector('.exstage').appendChild(box);
      requestAnimationFrame(() => requestAnimationFrame(() => { box.classList.add('on'); setTimeout(() => { box.classList.remove('on'); setTimeout(() => box.remove(), 400); }, 4600); })); }, 900);
  }
  function teardown() {
    if (!V3) return;
    cancelAnimationFrame(V3.raf); if (V3.ro) V3.ro.disconnect(); if (V3.offKey) V3.offKey(); if (V3.offIn) V3.offIn();
    if (V3.scene) V3.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { for (const k in x) { const v = x[k]; if (v && v.isTexture) v.dispose(); } x.dispose(); }); });
    if (DBG.el) DBG.el.hidden = true;
    if (V3.env) V3.env.dispose();
    if (V3.R) { V3.R.dispose(); try { V3.R.forceContextLoss(); } catch (x) {} }
    V3 = null;
  }

  /* ---------- I key: the debug panel (2026-11-21; the same look as the 3D table's, atlas/table3d.js) ---------- */
  const DBG = { on: (() => { try { return !!sessionStorage.getItem('t3d-debug'); } catch (x) { return false; } })(), el: null, fr: 0, t: 0, fps: 0, last: 0 };
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n);
  function dbgPaint() {
    if (!DBG.on) return;
    if (!DBG.el) { if (!document.querySelector('style[data-t3dbg]')) { const st = document.createElement('style'); st.dataset.t3dbg = '1'; st.textContent = '.t3dbg{position:fixed;left:10px;bottom:10px;z-index:2147483000;min-width:300px;max-width:min(440px,calc(100vw - 20px));padding:10px 12px;border-radius:10px;background:rgba(14,16,22,.82);color:#e8ecf4;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);box-shadow:0 4px 18px rgba(0,0,0,.3)}.t3dbg div{display:flex;gap:10px;justify-content:space-between}.t3dbg i{font-style:normal;color:#9aa6bc;white-space:nowrap}.t3dbg span{text-align:right}.t3dbg b{color:#fff}.t3dbg hr{border:0;border-top:1px solid rgba(255,255,255,.14);margin:5px 0}.t3dbg .t3dbg-h{font-weight:700;letter-spacing:.08em;color:#ffd27a;margin-bottom:4px}.t3dbg .t3dbg-h span{font-weight:400;color:#8a94a8;letter-spacing:0}'; document.head.appendChild(st); }
      DBG.el = document.createElement('div'); DBG.el.className = 't3dbg'; DBG.el.style.zIndex = '2147483600'; document.body.appendChild(DBG.el); }
    if (!V3 || !V3.R || !V3.scene) { DBG.el.hidden = true; return; }
    DBG.el.hidden = false;
    let tri = 0, mesh = 0, pts = 0, lights = 0, shadows = 0;
    V3.scene.traverse(o => { let v = true; for (let q = o; q; q = q.parent) if (!q.visible) { v = false; break; } if (!v) return;
      if (o.isLight) { lights++; if (o.castShadow) shadows++; }
      if ((o.isMesh || o.isPoints || o.isLine) && o.geometry) { const gm = o.geometry, n = gm.index ? gm.index.count : gm.attributes.position ? gm.attributes.position.count : 0, k = o.isInstancedMesh ? o.count : 1; if (o.isMesh) { tri += n / 3 * k; mesh++; } else pts += n * k; } });
    const R = V3.R, info = R.info, gl = R.getContext(), sz = R.getSize(new (window.THREE.Vector2)()), idle = performance.now() - DBG.last > 700, c = V3.cam, S = V3.sph || {};
    const gpu = (() => { try { const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)).slice(0, 48) : 'webgl' + (R.capabilities.isWebGL2 ? '2' : '1'); } catch (x) { return '-'; } })();
    const rows = [
      ['place', 'museum · 所蔵品'],
      ['piece', (V3.e && V3.e.id) || '-'],
      ['', ''],
      ['tris · piece', `<b${tri > 120000 ? ' style="color:#ff8a7a"' : ''}>${fmtN(Math.round(tri))}</b>` + (idle ? '  (停止中 · 描画なし)' : `  (drawn ${fmtN(info.render.triangles)})`)],
      ['meshes', String(mesh)],
      ['points / lines', fmtN(pts)],
      ['draw calls', String(idle ? 0 : info.render.calls)],
      ['lights', `${lights} (${shadows} with shadow)`],
      ['geom / tex', `${info.memory.geometries} / ${info.memory.textures}`],
      ['programs', String((info.programs || []).length)],
      ['', ''],
      ['fps', idle ? '0 (停止中)' : DBG.fps ? DBG.fps.toFixed(0) : '-'],
      ['canvas', `${Math.round(sz.x)}×${Math.round(sz.y)} @${R.getPixelRatio().toFixed(2)}x · exp ${R.toneMappingExposure.toFixed(2)}`],
      ['camera', c ? `fov ${c.fov.toFixed(1)} · dist ${(S.d || 0).toFixed(2)} · pitch ${(S.pit || 0).toFixed(2)} · yaw ${((S.yaw || 0) % 6.283).toFixed(2)}` : '-'],
      ['gpu', gpu],
    ];
    DBG.el.innerHTML = '<div class="t3dbg-h">3D DEBUG <span>I で閉じる</span></div>' + rows.map(([k, v]) => k ? `<div><i>${k}</i><span>${v}</span></div>` : '<hr>').join('');
  }
  function dbgTick(now) { DBG.fr++; DBG.last = now; if (now - DBG.t > 500) { DBG.fps = DBG.fr * 1000 / (now - DBG.t); DBG.fr = 0; DBG.t = now; dbgPaint(); } }
  function dbgToggle(on) {
    DBG.on = on === undefined ? !DBG.on : !!on; try { sessionStorage.setItem('t3d-debug', DBG.on ? '1' : ''); } catch (x) {}
    if (!DBG.on) { if (DBG.el) DBG.el.hidden = true; return; }
    DBG.t = performance.now(); DBG.fr = 0; dbgPaint(); if (V3) { V3.need = Math.max(V3.need || 0, 40); go(); }
  }
  setInterval(() => { if (DBG.on && V3 && V3.R) dbgPaint(); }, 1000);   // (drawing sleeps when nothing moves: keep the numbers fresh)

  /* ---------- drawing: only while something moves ---------- */
  const awake = () => !document.hidden && document.hasFocus();
  function go() { if (V3 && V3.R && !V3.raf) { V3.last = performance.now(); V3.raf = requestAnimationFrame(frame); } }
  function frame(now) {
    if (!V3 || !V3.R) return; V3.raf = 0;
    const dt = Math.min(.05, (now - V3.last) / 1000); V3.last = now;
    const S = V3.sph; let moving = false;
    if (V3.tw) { const k = Math.min(1, (now - V3.tw.t0) / V3.tw.ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; S.yaw = V3.tw.a.yaw + (V3.tw.b.yaw - V3.tw.a.yaw) * e; S.pit = V3.tw.a.pit + (V3.tw.b.pit - V3.tw.a.pit) * e; S.d = V3.tw.a.d + (V3.tw.b.d - V3.tw.a.d) * e; if (k >= 1) V3.tw = null; moving = true; }
    if (!V3.drag && (Math.abs(V3.vel.yaw) > 1e-4 || Math.abs(V3.vel.pit) > 1e-4)) { S.yaw += V3.vel.yaw; S.pit += V3.vel.pit; V3.vel.yaw *= .9; V3.vel.pit *= .9; moving = true; }
    if (V3.spin && !V3.drag && !V3.tw && awake()) { S.yaw += dt * .16; moving = true; }
    if (V3.flip && V3.flip.t !== V3.flip.to) {   // turning a two-sided piece over: lift, roll half a turn, set down
      const F = V3.flip; F.t = F.to > F.t ? Math.min(F.to, F.t + dt / .9) : Math.max(F.to, F.t - dt / .9);
      const k = F.t < .5 ? 2 * F.t * F.t : 1 - Math.pow(-2 * F.t + 2, 2) / 2;
      V3.pivot.rotation.z = Math.PI * k; V3.pivot.position.y = V3.py + Math.sin(Math.PI * F.t) * V3.r * .5; V3.R.shadowMap.needsUpdate = true; moving = true;
    }
    S.pit = Math.max(.08, Math.min(1.35, S.pit));
    const c = V3.cam, t = V3.tgt; c.position.set(t.x + S.d * Math.cos(S.pit) * Math.sin(S.yaw), t.y + S.d * Math.sin(S.pit), t.z + S.d * Math.cos(S.pit) * Math.cos(S.yaw)); c.lookAt(t);
    V3.R.render(V3.scene, c);
    if (DBG.on) dbgTick(now);
    place();
    if (moving || V3.need-- > 0) { if (awake()) go(); }
  }
  // the numbered spots and the 10 cm bar follow the camera
  function place() {
    const ov = V3.ov, st = ov.querySelector('.exstage'), w = st.clientWidth, h = st.clientHeight, c = V3.cam;
    const P = new (window.THREE.Vector3)();
    V3.obj.updateWorldMatrix(true, false);
    ov.querySelectorAll('.exspot').forEach((b, i) => { P.copy(V3.spots[i]).applyMatrix4(V3.obj.matrixWorld); const up = V3.flip && V3.flip.t > .5; b.hidden = !!V3.e.side && (V3.e.side[i] === 1) !== !!up; P.project(c); const vis = P.z < 1; b.style.transform = `translate(${((P.x + 1) / 2 * w).toFixed(1)}px,${((1 - P.y) / 2 * h).toFixed(1)}px)`; b.style.opacity = vis ? '' : '0'; });
    // 10 cm on screen at the target's depth
    if (!V3.e.cm) { ov.querySelector('.exscale').hidden = true; return; }
    const cm = V3.e.cm, u = 10 / cm, dist = c.position.distanceTo(V3.tgt), px = u / (2 * dist * Math.tan(c.fov * Math.PI / 360)) * h;
    const bar = ov.querySelector('.exscale'); bar.style.setProperty('--w', Math.max(12, Math.min(w * .4, px)).toFixed(1) + 'px'); bar.hidden = !(px > 10);
  }
  function tween(to, ms = 700) { if (!V3) return; V3.vel.yaw = V3.vel.pit = 0; V3.tw = { a: Object.assign({}, V3.sph), b: Object.assign({}, to), t0: performance.now(), ms }; const d = to.yaw - V3.sph.yaw; V3.tw.b.yaw = V3.sph.yaw + Math.atan2(Math.sin(d), Math.cos(d)); go(); }
  function focusSpot(i) {
    if (!V3 || !V3.spots || !V3.spots[i]) return;
    V3.spin = false; V3.ov.querySelector('[data-k="spin"]').classList.remove('on');
    V3.obj.updateWorldMatrix(true, false); const p = V3.spots[i].clone().applyMatrix4(V3.obj.matrixWorld), t = V3.tgt, yaw = Math.atan2(p.x - t.x, p.z - t.z + .001);
    tween({ yaw: Math.hypot(p.x, p.z) > V3.r * .25 ? yaw : V3.sph.yaw, pit: .72, d: V3.fitD() * .62 });
    V3.ov.querySelectorAll('.exlook li').forEach((li, k) => li.classList.toggle('on', k === i));
    V3.ov.querySelectorAll('.exspot').forEach((b, k) => b.classList.toggle('on', k === i));
    const li = V3.ov.querySelector(`.exlook li:nth-child(${i + 1})`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function bindInput(el) {
    const pts = new Map(); let pinch = 0, d0 = 0, tap = 0;
    const down = e => { if (e.target.closest('.exb,.exspot')) return; el.setPointerCapture && el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); V3.drag = true; V3.tw = null; V3.vel.yaw = V3.vel.pit = 0;
      if (V3.spin) { V3.spin = false; V3.ov.querySelector('[data-k="spin"]').classList.remove('on'); }
      if (pts.size === 2) { const a = [...pts.values()]; pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); d0 = V3.sph.d; }
      const now = performance.now(); if (pts.size === 1 && now - tap < 320 && V3.home) { tween(V3.home); } tap = now; go(); };
    const move = e => { if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const a = [...pts.values()], dd = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); V3.sph.d = clampD(d0 * pinch / Math.max(1, dd)); }
      else { const k = 5.5 / Math.max(300, el.clientWidth); V3.vel.yaw = -dx * k; V3.vel.pit = dy * k; V3.sph.yaw += V3.vel.yaw; V3.sph.pit += V3.vel.pit; }
      go(); };
    const up = e => { pts.delete(e.pointerId); if (!pts.size) { V3.drag = false; go(); } };
    const wheel = e => { e.preventDefault(); V3.tw = null; V3.sph.d = clampD(V3.sph.d * Math.exp(e.deltaY * .0012)); go(); };
    const vis = () => go();
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('wheel', wheel, { passive: false });
    addEventListener('focus', vis); document.addEventListener('visibilitychange', vis);
    V3.offIn = () => { removeEventListener('focus', vis); document.removeEventListener('visibilitychange', vis); };
  }
  const clampD = d => Math.max(V3.fitD() * .32, Math.min(V3.fitD() * 1.9, d));

  /* ---------- a small kit for the pieces' builders (museum/ex/*.js) ---------- */
  const kit = {
    // a canvas texture drawn by fn(g, w, h); srgb for colour maps, linear for roughness / bump
    tex(w, h, fn, o = {}) { const TT = window.THREE, c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new TT.CanvasTexture(c);
      t.colorSpace = o.data ? TT.NoColorSpace : TT.SRGBColorSpace; t.anisotropy = 8; if (o.rep) { t.wrapS = t.wrapT = TT.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]); } return t; },
    lin: c => new (window.THREE.Color)(c).convertSRGBToLinear(),
    mat(o) { const TT = window.THREE, p = Object.assign({}, o); if (typeof p.color === 'string') p.color = kit.lin(p.color); return new TT[p.clearcoat != null || p.sheen != null ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p); },
    /* A carved block from two height paintings (front and back) — for figures cut from one piece of ivory, wood or stone.
       o: { w, h (cm, the painting's size; the block stands on y = 0, centred on x), px (painting width in pixels, 320),
            mask(g)   paints the silhouette in white on black            } all painters draw in centimetres, x from the middle,
            thick(g)  optional: greys for the block's thickness (white = 1)  } y up from the base, on a canvas 2D context
            front(g), back(g)  paint the carving on mid-grey #808080: lighter stands out, darker is cut in (± o.relief cm)
            depth (cm, half the block's thickness), round (cm, how far in from the outline the surface curves away),
            relief (cm), nx (grid columns per side, 36), tex (a canvas: the material's colour), dirt [r,g,b] (what gathers in the cuts),
            dirtK (how much, 1), mat { roughness, … } }
       Returns a Group (front faces +z). The mesh carries the large forms; a bump map carries what the grid is too coarse for;
       the colour map darkens the cuts the way grime does. Triangles: about 4 · nx · nx · h / w, less outside the outline. */
    relief(o) {
      const TT = window.THREE, W = o.px || 320, H = Math.round(W * o.h / o.w), N = W * H, s = W / o.w;
      const paint = (fn, fill) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, W, H);
        if (fn) { g.save(); g.translate(W / 2, H); g.scale(s, -s); g.lineCap = g.lineJoin = 'round'; fn(g); g.restore(); }
        const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = d[i * 4] / 255; return a; };
      const blur = (a, r) => { r = Math.max(1, Math.round(r)); const k = 1 / (2 * r + 1); let src = a; const tmp = new Float32Array(N);
        for (let p = 0; p < 3; p++) { const out = new Float32Array(N);
          for (let y = 0; y < H; y++) { const row = y * W; let acc = 0; for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
            for (let x = 0; x < W; x++) { tmp[row + x] = acc * k; acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
          for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
            for (let y = 0; y < H; y++) { out[y * W + x] = acc * k; acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
          src = out; }
        return src; };
      const mask = paint(o.mask, '#000'), pil = blur(mask, (o.round || .5) * s / 2.2), thick = o.thick ? blur(paint(o.thick, '#fff'), (o.round || .5) * s / 2.2) : null;
      const depth = o.depth || 1, rel = o.relief || .3, nx = o.nx || 36, ny = Math.max(2, Math.round(nx * o.h / o.w)), dirt = o.dirt || [92, 62, 34], dk = o.dirtK == null ? 1 : o.dirtK;
      const texD = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); if (o.tex) g.drawImage(o.tex, 0, 0, W, H); else { g.fillStyle = '#d8c8a4'; g.fillRect(0, 0, W, H); } return g.getImageData(0, 0, W, H); })();
      const G = new TT.Group();
      const side = (fn, back) => {
        const det = fn ? blur(paint(fn, '#808080'), o.soft || 1) : null, Hh = new Float32Array(N);
        const M = i => { if (!back) return i; const x = i % W; return i - x + (W - 1 - x); };   // (the outline as seen from behind)
        for (let i = 0; i < N; i++) { const j = M(i), p = Math.sqrt(Math.max(0, Math.min(1, pil[j] * 2 - 1))); Hh[i] = p * (depth * (thick ? thick[j] : 1) + (det ? (det[i] - .502) * 2 * rel : 0)); }
        const lo = blur(Hh, Math.max(1, W / nx * .6)), c1 = blur(Hh, 2), c2 = blur(Hh, Math.max(3, W / 28));
        const col = new ImageData(W, H), bmp = new ImageData(W, H), cd = col.data, bd = bmp.data, td = texD.data;
        for (let i = 0; i < N; i++) { const j = M(i), q = i * 4;
          const edge = Math.max(0, Math.min(1, (pil[j] - .62) * 6)), cut = Math.max(0, Math.min(1, ((c1[i] - Hh[i]) * 9 + (c2[i] - Hh[i]) * 2.2) / rel)) * dk * edge, k = Math.min(.85, cut);
          cd[q] = td[q] + (dirt[0] - td[q]) * k; cd[q + 1] = td[q + 1] + (dirt[1] - td[q + 1]) * k; cd[q + 2] = td[q + 2] + (dirt[2] - td[q + 2]) * k;
          cd[q + 3] = 255;
          const b = Math.max(0, Math.min(255, 128 + (Hh[i] - lo[i]) / rel * 150)); bd[q] = bd[q + 1] = bd[q + 2] = b; bd[q + 3] = 255; }
        // colour bleeds a little past the outline, so the mip-maps do not pull black in at the edge
        const map = kit.tex(W, H, g => g.putImageData(col, 0, 0)), bump = kit.tex(W, H, g => g.putImageData(bmp, 0, 0), { data: true });
        const bil = (A, x, y, mir) => { x = Math.min(W - 1.001, Math.max(0, x)); y = Math.min(H - 1.001, Math.max(0, y)); if (mir) x = W - 1 - x; const x0 = Math.min(W - 2, x | 0), y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0;
          return (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + W] * (1 - fx) + A[i + W + 1] * fx) * fy; };
        // the grid; a vertex outside the outline is slid onto it (down the slope of the blurred mask), so the block ends in a clean edge at z = 0
        const pos = [], uv = [], idx = [], inside = [], cell = (W - 1) / nx;
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { let x = i / nx * (W - 1), y = (1 - j / ny) * (H - 1), mv = bil(pil, x, y, back); const was = mv >= .5;
          if (!was) { const x0 = x, y0 = y; for (let k = 0; k < 10 && mv < .497; k++) { const gx = (bil(pil, x + 1, y, back) - bil(pil, x - 1, y, back)) / 2, gy = (bil(pil, x, y + 1, back) - bil(pil, x, y - 1, back)) / 2, g2 = gx * gx + gy * gy; if (g2 < 1e-9) break;
              const st = Math.min(cell * .6, (.5 - mv) / Math.sqrt(g2)) / Math.sqrt(g2); x += gx * st; y += gy * st; mv = bil(pil, x, y, back); if (Math.hypot(x - x0, y - y0) > cell * 2.2) break; } }
          const ok = was || mv >= .49, u = x / (W - 1), v = 1 - y / (H - 1);
          pos.push((u - .5) * o.w, v * o.h, was ? Math.max(0, bil(Hh, x, y, false)) : -depth * .14); uv.push(u, v); inside.push(was ? 2 : ok ? 1 : 0); }   // (edge vertices dip past the mid-plane: the two halves overlap instead of leaving a crack)
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (inside[a] > 1 || inside[b] > 1 || inside[c] > 1 || inside[d] > 1) idx.push(a, b, d, a, d, c); }
        const geo = new TT.BufferGeometry(); geo.setAttribute('position', new TT.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new TT.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
        const m = new TT.Mesh(geo, kit.mat(Object.assign({ map, bumpMap: bump, bumpScale: o.bump == null ? 2.2 : o.bump, color: '#ffffff', roughness: .5 }, o.mat || {})));
        if (back) m.rotation.y = Math.PI; m.castShadow = m.receiveShadow = true; G.add(m); return m; };
      side(o.front, false); side(o.back, true);
      return G; },
    /* brushes for kit.relief's height paintings (centimetres; amt > 0 stands out, < 0 is cut in; 1 ≈ the full relief):
       path(g, pts, close) a smooth curve through pts · line: a soft ridge / groove · blob: a round swelling / hollow · area: a flat step */
    ink: (() => { const sh = (g, c, a) => { g.fillStyle = g.strokeStyle = `rgba(${c},${c},${c},${a})`; };
      const path = (g, pts, close) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); if (close) g.closePath(); };
      const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
      return { sh, path, poly,
        line(g, pts, w, amt) { sh(g, amt > 0 ? 255 : 0, Math.abs(amt) / 2.6); for (const k of [1, .62, .3]) { g.lineWidth = w * k; path(g, pts); g.stroke(); } },
        blob(g, x, y, rx, ry, amt, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry); const c = amt > 0 ? 255 : 0, a = Math.abs(amt), gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
          gr.addColorStop(0, `rgba(${c},${c},${c},${a})`); gr.addColorStop(.55, `rgba(${c},${c},${c},${a * .7})`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 6.29); g.fill(); g.restore(); },
        area(g, pts, amt, sharp) { sh(g, amt > 0 ? 255 : 0, Math.abs(amt)); if (sharp) poly(g, pts); else path(g, pts, true); g.fill(); } }; })(),
    // a value-noise field 0..1 (seeded): n(x, y)
    noise(seed) { const N = window.Table3D && Table3D.makeNoise ? Table3D.makeNoise(seed) : null; return N ? (x, y, o = 4) => N(x, y, o) : (x, y) => .5 + .25 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 - seed); },
    // fine grain lines for wood / ivory (pixel loop, fast enough for 512–1024²)
    grain(g, w, h, { a, b, seed = 1, sx = 1, sy = 24, warp = 2, pores = 0 }) {
      const n = kit.noise(seed), img = g.createImageData(w, h), d = img.data, A = hexRGB(a), B = hexRGB(b);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h, wv = n(u * 3, v * 3) * warp, s = .5 + .5 * Math.sin((v * sy + wv * 6 + n(u * sx * 2, v * 4) * 2) * Math.PI * 2);
        let k = Math.pow(s, 3) * .7 + n(u * 40, v * 6) * .3; if (pores && n(u * 300, v * 60, 1) > 1 - pores) k = 1;
        const i = (y * w + x) * 4; d[i] = A[0] + (B[0] - A[0]) * k; d[i + 1] = A[1] + (B[1] - A[1]) * k; d[i + 2] = A[2] + (B[2] - A[2]) * k; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    },
  };
  const hexRGB = h => { const v = parseInt(h.replace('#', ''), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };

  window.AtlasGallery = { render, open, EX, V, kit, _v: () => V3 };   // (_v: the open viewer, for the test tools)
  window.AtlasEx = window.AtlasEx || {};
})();
