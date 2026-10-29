/* =====================================================================
   Xiangqi — portal skin (xiangqi/?skin=atlas)
   The full xiangqi page keeps every feature (AI, rated games, lessons, puzzles,
   openings, review / analysis, online play with the 2D version …). This file:
     • draws the antique lacquer board (atlas/models/xiangqi.js: vermilion field, gold
       lines, black lacquer frame with the gold key band, brass corners) with the 3D table.
       The camera is aligned to the DOM board (#board, 9 × 10 points), which stays on top
       (transparent) for clicks, the selection ring, move dots, hints and lesson marks
     • mirrors the page's pieces (pcEls) into the thick boxwood discs of the model:
       a move slides the disc over the board with a little lift (the horse and the
       elephant hop), a taken piece is lifted off and fades; the selected piece rises a hair
     • inside the frame the board is drawn a little smaller (frame-local --cell), so the
       3D frame, the file numbers and the captured pieces all fit the page's own layout
     • adds "3D" to the board and piece design rows of the new-game dialog (the game's own
       2D boards / piece sets stay selectable: a 2D board shows its 2D pieces)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.xiangqi || !T3.MODELS.xiangqi || !window.AtlasSkin || typeof window.syncPieces !== 'function') return;
  const boardDom = document.getElementById('board'), de = document.documentElement;
  if (!boardDom) return;
  de.classList.add('atlas-xiangqi');

  /* ---------- looks: 3D board (+ 3D or 2D pieces) or the game's own 2D board and pieces ---------- */
  const LK = 'atlas-xiangqi-look';
  let bd3 = true, pc3 = true;
  try { const v = localStorage.getItem(LK); if (v === '2d') bd3 = pc3 = false; else if (v === '3d2') pc3 = false; } catch (e) {}

  const root = T3.MODELS.xiangqi(true), U = root.userData, Y = U.top, u = U.u;
  const RD = 10 * u, OUT = U.D / RD;   // the field = the DOM board (9 × 10 cells); the whole board is OUT times its height

  // skin styles (after AtlasSkin's light-theme conversion, so they stay as written)
  const css = document.createElement('style');
  css.textContent = `
html.atlas-xiangqi .frame{--cell:min(calc(var(--fh) / 13.4), calc(var(--fw) / 10.4))!important;padding:calc((var(--fh) - var(--cell) * 10) / 2) calc((var(--fw) - var(--cell) * 9) / 2)!important;background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-xiangqi .frame::before,html.atlas-xiangqi .frame::after{display:none!important}
html.atlas-xiangqi .fnum{left:calc((var(--fw) - var(--cell) * 9) / 2)!important;width:calc(var(--cell) * 9)!important;height:calc(var(--cell) * .26)!important;color:rgba(70,38,12,.72)!important;font-size:calc(var(--cell) * .2)!important}
html.atlas-xiangqi .fnum.top{top:calc((var(--fh) - var(--cell) * 10) / 2 - var(--cell) * 1.12)!important}
html.atlas-xiangqi .fnum.bot{bottom:calc((var(--fh) - var(--cell) * 10) / 2 - var(--cell) * 1.12)!important}
html.atlas-xiangqi .reserve{left:calc((var(--fw) - var(--cell) * 9) / 2)!important;right:calc((var(--fw) - var(--cell) * 9) / 2)!important;height:calc(var(--cell) * .6)!important}
html.atlas-xiangqi .reserve.top{top:calc((var(--fh) - var(--cell) * 10) / 2 - var(--cell) * 1.76)!important}
html.atlas-xiangqi .reserve.bot{bottom:calc((var(--fh) - var(--cell) * 10) / 2 - var(--cell) * 1.76)!important}
html.atlas-xiangqi .reserve .rv{box-shadow:0 0 0 1px rgba(110,70,30,.6),0 2px 3px rgba(60,30,0,.35)!important;opacity:1!important}
html.atlas-xq3db .board{background:transparent!important;box-shadow:none!important}
html.atlas-xq3db .board::after,html.atlas-xq3db .lines{display:none!important}
html.atlas-xq3dp .pc:not(.hov){background:none!important;box-shadow:none!important}
html.atlas-xq3dp .pc:not(.hov) .ch,html.atlas-xq3dp .pc:not(.hov) .ic{display:none!important}
html.atlas-xq3dp .pc:not(.hov)::before{border-color:transparent!important}
html.atlas-xq3dp .pc.threat::before{border-color:rgba(255,70,50,.95)!important}
html.atlas-xq3dp .pc.sel{box-shadow:0 0 0 3px rgba(80,190,255,.95),0 0 18px rgba(80,190,255,.75)!important}
html.atlas-xq3dp .pc.incheck{box-shadow:0 0 0 3px rgba(255,60,40,.95),0 0 20px rgba(255,60,40,.85)!important}
html.atlas-xq3dp .pc.dim{filter:none!important;background:rgba(20,10,4,.42)!important}
html.atlas-xq3dp .hov{opacity:.55}
html.atlas-xiangqi .bdrow{grid-template-columns:repeat(6,minmax(0,1fr))!important}
html.atlas-xiangqi .bdrow.pcrow{grid-template-columns:repeat(5,minmax(0,1fr))!important}
html.atlas-xiangqi .bdrow button:disabled{opacity:.4;cursor:default}
html.atlas-xiangqi .side{align-self:start!important}
@media (max-width: 520px){html.atlas-xiangqi .bdrow{gap:3px!important}html.atlas-xiangqi .bdrow button{font-size:9.5px!important}}`;
  document.head.appendChild(css);

  const skin = AtlasSkin.init({
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-shogi.webp', guideFallback: '../images/atlas/xiangqi.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: '\\.pc|\\.ch|\\.ic|lines|fnum|reserve|\\.rv|sqfx|dest|\\.hov|\\.mark|fxsvg|hintlbl|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('xiangqi', root, { still: true });
  skin.alignTo(RD, Y);
  T3.kick(800);
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- 3D pieces mirrored from the page's piece elements ---------- */
  const group = new THREE.Group(); root.add(group);
  const map = new Map();   // DOM piece element → { g, code, i, f }
  const H = u * .27;       // disc height
  const isFlip = () => { try { return !!flip; } catch (e) { return false; } };
  const xz = i => { let r = Math.floor(i / 9), c = i % 9; if (isFlip()) { r = 9 - r; c = 8 - c; } return U.pt(c, r); };
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, delay) => { const go = () => { const t0 = performance.now(); (function s(now) { const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }; delay ? setTimeout(go, delay) : go(); };
  function make(code, i) {
    const g = new THREE.Group(), p = U.piece(code), sh = T3.contact(u * .44, .5);
    sh.position.y = .002; g.add(sh, p); g.userData.p = p; g.userData.sh = sh;
    const [x, z] = xz(i); g.position.set(x, Y, z); group.add(g); return g;
  }
  function drop(o) { group.remove(o.g); o.g.userData.sh.material.dispose(); }
  function slide(o, from, to, hop) {   // the disc is pushed over the board (lifted a little), the horse and the elephant hop
    const [x0, z0] = from, [x1, z1] = to, p = o.g.userData.p, sh = o.g.userData.sh, d = Math.hypot(x1 - x0, z1 - z0);
    const lift = hop ? Math.min(u * .9, d * .35 + u * .2) : Math.min(u * .32, d * .06 + u * .1), T = 320;
    o.anim = (o.anim || 0) + 1; o.sliding = true; const id = o.anim;
    anim(T, k => {
      if (o.anim !== id) return;
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // ease in-out
      o.g.position.x = x0 + (x1 - x0) * e; o.g.position.z = z0 + (z1 - z0) * e;
      const h = Math.sin(Math.PI * k) * lift; p.position.y = h + (o.up || 0);
      sh.scale.setScalar(1 + h / u * .8); sh.material.opacity = .5 * (1 - Math.min(.6, h / u));
    }, () => { if (o.anim !== id) return; o.sliding = false; o.g.position.set(x1, Y, z1); p.position.y = o.up || 0; sh.scale.setScalar(1); sh.material.opacity = .5; });
  }
  function vanish(o, delay) {   // a taken piece: lifted off the board, tipping a little, and fading away
    const p = o.g.userData.p, sh = o.g.userData.sh, ms = [];
    p.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; ms.push(m.material); } });
    anim(300, k => {
      p.position.y = u * .8 * k * k; p.rotation.z = .5 * k; p.rotation.x = -.3 * k;
      ms.forEach(m => { m.opacity = 1 - k; }); sh.material.opacity = .5 * (1 - k);
    }, () => { ms.forEach(m => m.dispose()); drop(o); }, delay);
  }
  let moving = false;
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    const live = new Set(), f = isFlip(), ok = animOk() && moving;
    for (const [i, el] of els) {
      live.add(el);
      const code = +el.dataset.k; let o = map.get(el);
      if (o && o.code !== code) { drop(o); o = null; }
      if (!o) { o = { g: make(code, i), code, i, f }; map.set(el, o); continue; }
      if (o.i !== i || o.f !== f) {
        const from = [o.g.position.x, o.g.position.z], to = xz(i);
        const tp = code & 7, hop = tp === 3 || tp === 4;   // E.ELEPHANT, E.HORSE
        if (ok && o.f === f) slide(o, from, to, hop); else { o.anim = (o.anim || 0) + 1; o.sliding = false; o.g.position.set(to[0], Y, to[1]); o.g.userData.p.position.y = o.up || 0; }
        o.i = i; o.f = f;
      }
    }
    for (const [el, o] of map) if (!live.has(el)) { map.delete(el); if (ok) vanish(o, 200); else drop(o); }
    marks();
    T3.kick(400);
  }
  // the selected piece rises a hair; pieces fade with the 2D ones (lesson "took" marks etc.)
  function marks() {
    for (const [el, o] of map) {
      const up = el.classList.contains('sel') ? u * .1 : 0;
      if (up !== (o.up || 0)) {
        const a = o.up || 0, p = o.g.userData.p; o.up = up;
        if (!o.sliding) anim(120, k => { if (!o.sliding) p.position.y = a + (up - a) * k; });
      }
      o.g.visible = el.style.opacity !== '0';
    }
    T3.kick(200);
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) { console.warn(e); } return r; };
  const oMove = window.animateMove;
  if (typeof oMove === 'function') window.animateMove = function () { const r = oMove.apply(this, arguments); moving = true; try { mirror(); } catch (e) { console.warn(e); } moving = false; return r; };
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); try { marks(); } catch (e) {} return r; }; }
  try { mirror(); } catch (e) {}

  /* ---------- the design rows: "3D" for the board and for the pieces + the game's own 2D designs ---------- */
  const LBL = {
    bd: { ja: '漆塗り3D', en: 'Lacquer 3D', zh: '漆盘3D', ko: '옻칠 3D', es: 'Laca 3D', fr: 'Laque 3D', pt: 'Laca 3D', de: 'Lack 3D', hi: 'लाख 3D', ar: 'ورنيش ثلاثي' },
    pc: { ja: '黄楊3D', en: 'Boxwood 3D', zh: '黄杨3D', ko: '회양목 3D', es: 'Boj 3D', fr: 'Buis 3D', pt: 'Buxo 3D', de: 'Buchs 3D', hi: 'बॉक्सवुड 3D', ar: 'بقس ثلاثي' },
  };
  const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
  const vbOf = row => { const s = row && row.querySelector('button svg'); return (s && s.getAttribute('viewBox')) || '0 0 9 6'; };
  function thumb(kind, vb) {
    const [x, y, w, h] = vb.split(/[ ,]+/).map(Number), s = Math.min(w, h);
    const fr = s * .09, cx = x + w / 2, cy = y + h / 2, st = (h - 2 * fr) / 4.6;
    let ln = '';
    for (let k = -2; k <= 2; k++) ln += `<path d="M${x + fr * 1.6} ${cy + k * st}H${x + w - fr * 1.6}"/>`;
    for (let k = -4; k <= 4; k++) { const xx = cx + k * st; if (xx > x + fr * 1.4 && xx < x + w - fr * 1.4) ln += `<path d="M${xx} ${y + fr * 1.6}V${y + h - fr * 1.6}"/>`; }
    const disc = (px, py, ch, red) => `<circle cx="${px}" cy="${py}" r="${st * .44}" fill="#ecd3a0" stroke="#9a7442" stroke-width="${st * .05}"/><circle cx="${px}" cy="${py}" r="${st * .34}" fill="none" stroke="${red ? '#b5221a' : '#1d1916'}" stroke-width="${st * .04}"/><text x="${px}" y="${py + st * .02}" font-size="${st * .48}" text-anchor="middle" dominant-baseline="central" fill="${red ? '#b5221a' : '#1d1916'}" font-family="Shippori Mincho B1,serif" font-weight="900">${ch}</text>`;
    const pcs = disc(cx - st, cy + st, '炮', true) + disc(cx + st, cy - st, '馬', false) + disc(cx, cy + 2 * st, '帥', true);
    if (kind === 'pc') return `<svg viewBox="${vb}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5a3b22"/><g stroke="rgba(255,230,180,.35)" stroke-width="${st * .04}">${ln}</g>${pcs}</svg>`;
    return `<svg viewBox="${vb}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#17120f"/><rect x="${x + fr * .35}" y="${y + fr * .35}" width="${w - fr * .7}" height="${h - fr * .7}" fill="none" stroke="#caa04e" stroke-width="${fr * .14}"/><rect x="${x + fr}" y="${y + fr}" width="${w - 2 * fr}" height="${h - 2 * fr}" fill="#c42c18"/><g stroke="#e2b955" stroke-width="${st * .05}">${ln}</g>${pcs}</svg>`;
  }
  function paintRows() {
    const r1 = document.getElementById('bdRow'), r2 = document.getElementById('pcRow');
    [[r1, 'bd'], [r2, 'pc']].forEach(([row, k]) => {
      if (!row) return;
      let b = row.querySelector('button[data-a3]');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.dataset.a3 = k; row.prepend(b); }
      const on = k === 'bd' ? bd3 : bd3 && pc3, L = LBL[k];
      b.innerHTML = thumb(k, vbOf(row)) + '<span></span>'; b.querySelector('span').textContent = L[lang()] || L.en;
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on);
      if (k === 'pc') b.disabled = !bd3;   // 3D pieces only on the 3D board (the DOM board would cover them)
      if (on) row.querySelectorAll('button:not([data-a3])').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    });
  }
  function look() {
    root.children[0].visible = bd3; group.visible = bd3 && pc3;
    de.classList.toggle('atlas-xq3db', bd3); de.classList.toggle('atlas-xq3dp', bd3 && pc3);
    try { localStorage.setItem(LK, !bd3 ? '2d' : pc3 ? '3d' : '3d2'); } catch (e) {}
    paintRows(); T3.kick(400);
  }
  const onRow = k => e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.a3) { e.stopImmediatePropagation(); if (k === 'bd') { if (!bd3) pc3 = true; bd3 = true; } else pc3 = true; look(); return; }   // the game's own 2D setting stays as it is
    if (k === 'bd') { bd3 = false; pc3 = false; } else pc3 = false;   // a 2D board brings its 2D pieces
    setTimeout(look, 0);
  };
  const r1 = document.getElementById('bdRow'), r2 = document.getElementById('pcRow');
  if (r1) r1.addEventListener('click', onRow('bd'), true);
  if (r2) r2.addEventListener('click', onRow('pc'), true);
  if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paintRows(); } catch (e) {} return r; }; }
  const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintRows, 30));
  look();

  // test hooks (Playwright)
  window.__xqSkin = { pieces: () => map.size, look: () => (bd3 ? (pc3 ? '3d' : '3d2') : '2d'), at: i => { const [x, z] = xz(i); return T3.project(x, z, Y + H); } };
})();
