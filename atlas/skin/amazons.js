/* =====================================================================
   Amazons — portal skin (amazons/?skin=atlas)
   The full page keeps every feature (AI in 23 levels, rated games, two players, lessons, puzzles, the daily puzzle,
   review / analysis, the coach…). This file:
     • draws the 3D board (atlas/models/amazons.js) with the 3D table, leaning back (tilt 26°); the camera is aligned to the DOM
       board, which stays on top (transparent, tilted the same way) for taps, destinations, arrows, hints and labels. The page's
       layout is never changed (the same positions as the 2D page, in 2D and in 3D): the 3D frame may go under the cards
     • the amazons are sculpted figures (statue / archer / bronze), chosen in a 「3D駒」 row under the 3D boards
       ('atlas-amazons-pc3'); the page's piece pictures (plates, players, record) follow the chosen figures
     • mirrors the page's moves: the amazon glides to its square (lifted a little), then a fire arrow flies from her in an arc
       — a flame at its head, sparks shed along the way — strikes with a flash and a burst of sparks; the square stays
       scorched with the arrow stuck in it, its edge glows and cools, a thin smoke rises for a few seconds
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.AmazonsEngine, A3 = T3 && T3.amazons;
  if (!THREE || !T3 || !A3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-amazons');
  const pc3 = () => A3.pcSet();
  const setPc3Attr = () => { de.dataset.pc3 = pc3(); };
  setPc3Attr();

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
/* the page's layout exactly as with the 2D board (html.atlas-2d in skin.css): the same height for the page under the portal bar */
html.atlas-amazons.hb-atlas{--ttop:0px;--vh:calc(100vh - 64px)}
html.atlas-amazons.hb-atlas,html.atlas-amazons.hb-atlas body{--hb-h:64px}
html.atlas-amazons.hb-atlas body{padding-top:64px}
@media not all and (pointer: coarse){
  html.atlas-amazons.hb-atlas.ol-dock{--vh:calc(100vh - 108px - 64px)}
  @supports (height:100dvh){html.atlas-amazons.hb-atlas.ol-dock{--vh:calc(100dvh - 108px - 64px)}}
  html.atlas-amazons.hb-atlas.ol-dock.ol-soon{--vh:calc(100vh - 46px - 64px)}
  @supports (height:100dvh){html.atlas-amazons.hb-atlas.ol-dock.ol-soon{--vh:calc(100dvh - 46px - 64px)}}
}
html.atlas-2d #board{transform:none!important;translate:none!important;scale:none!important}   /* (the 2D board: flat; the tilt is the 3D board's) */
html.atlas-amazons .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-amazons .frame::before,html.atlas-amazons .frame::after,html.atlas-amazons .board::after,html.atlas-amazons .board::before{display:none!important}
html.atlas-amazons .board{background:none!important;box-shadow:none!important}
html.atlas-amazons[data-pc3=statue]{--pcW:url(img/pc3-statue-w.webp)!important;--pcB:url(img/pc3-statue-b.webp)!important}
html.atlas-amazons[data-pc3=archer]{--pcW:url(img/pc3-archer-w.webp)!important;--pcB:url(img/pc3-archer-b.webp)!important}
html.atlas-amazons[data-pc3=bronze]{--pcW:url(img/pc3-bronze-w.webp)!important;--pcB:url(img/pc3-bronze-b.webp)!important}
html.atlas-amazons .lines{overflow:visible!important}
html.atlas-amazons .lines .num{fill:rgba(255,246,226,.85)!important;stroke:rgba(0,0,0,.55)!important;font-weight:700}
html.atlas-amazons .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important}
html.atlas-amazons .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,214,100,.95),0 0 18px rgba(255,200,80,.75)!important;border-radius:50%!important}
html.atlas-amazons .pieces .pc.mov:not(.sel){box-shadow:0 0 0 2.5px rgba(190,232,140,.85),0 0 12px rgba(190,232,140,.5)!important;border-radius:50%!important}
html.atlas-amazons .pieces .pc.dim{opacity:1!important}
html.atlas-amazons .pieces .arw:not(.hov){background:none!important;box-shadow:none!important}
html.atlas-amazons .pieces .arw:not(.hov)::before,html.atlas-amazons .pieces .arw:not(.hov)::after,html.atlas-amazons .pieces .arw:not(.hov) :is(svg,.ai){display:none!important}
html.atlas-amazons .pieces :is(.spark,.flare){display:none!important}
html.atlas-amazons .pieces .pc.hov{opacity:.5!important}
html.atlas-amazons .reserve .rsv-plate{background:rgba(20,16,12,.82)!important;box-shadow:0 0 0 1px rgba(226,182,96,.45),0 2px 6px rgba(0,0,0,.35)!important;color:#f0e2c4!important}
html.atlas-amazons #fPieces{display:none!important}
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f6f1e4;border:2px solid #e2cf9e}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#7a5a1c;margin:0 0 8px}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 button img{background:radial-gradient(80% 80% at 50% 40%,#5a6a5c,#26302a);padding:6%;box-sizing:border-box}
`;
  document.head.appendChild(st);
  // the portal skin's 3D rule that moves the page down inside .app (html.atlas-skin:not(.atlas-2d) .app{padding-top: … + 64px}) is
  // dropped on this page: the body takes the bar's 64px as with the 2D board, so every card keeps exactly the 2D page's place
  const dropRule = () => { let hit = false; for (const sh of document.styleSheets) { let R; try { R = sh.cssRules; } catch (e) { continue; } for (let i = R.length - 1; i >= 0; i--) if (R[i].selectorText === 'html.atlas-skin:not(.atlas-2d) .app') { sh.deleteRule(i); hit = true; } } return hit; };
  if (!dropRule()) { let n = 0; const t = setInterval(() => { if (dropRule() || ++n > 40) { clearInterval(t); dispatchEvent(new Event('resize')); } }, 100); }

  const skin = AtlasSkin.init({
    margin: .3,
    tilt: 26, persp: 2.6,   // leaning back a little: the sculpted amazons are seen from the front
    board: boardDom,
    // (no pc / outer: the page keeps exactly the 2D page's layout in 2D and in 3D — user rule 2026-11-10; the 3D board follows
    //  the DOM board and its frame may go under the cards around it)
    guide: '../images/atlas/amazons.webp', guideFallback: '../images/atlas/amazons.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.arw|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|spark|flare',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 23) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the tilt's lens: the leaning board is drawn a little lower and larger at the near side; the board (3D and the DOM
     board over it, together) is moved up by the same amount so it sits centred between the count plates (the page's layout itself
     is not touched) ---------- */
  const LIFT = .05, SC = .8;   // lift: of the board's height; SC: the leaning board is drawn smaller than the DOM board's place, so
  // its near edge (wider in perspective) and the frame round it stay inside the page's board area (the cards beside never cover it)
  function lift3d() {
    const holder = boardDom.parentElement;
    const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
    const host = document.getElementById('atlasGL');
    T3.align(() => {
      const b = box(), on = !de.classList.contains('atlas-2d'), s = on ? SC : 1, w = b.w * s, h = b.h * s, d = on ? h * LIFT : 0;
      boardDom.style.translate = d ? `0 ${-d}px` : ''; boardDom.style.scale = s !== 1 ? String(s) : '';
      return { x: b.x + (b.w - w) / 2 - (host ? host.offsetLeft : 0), y: b.y + (b.h - h) / 2 - d - (host ? host.offsetTop : 0), w, h, tilt: 26, persp: h * 2.6 };
    }, 10, U.top);
  }
  /* ---------- the board ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, Y = 0, built = '';
  const P3 = new Map();   // square → { g, k }
  let tok = 0;
  function build() {
    const look = T3.BOARDS && T3.BOARDS.amazons ? T3.BOARDS.amazons.get() : 'temple', key = look + pc3();
    if (key === built && root) return false;
    built = key; tok++;
    if (root) holder.remove(root);
    P3.clear();
    root = A3.board(look); U = root.userData; Y = U.top; holder.add(root);
    T3.show('amazons', holder, { still: true });
    skin.alignTo(10, U.top); lift3d();
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  build();
  const V = skin.view && skin.view({ key: 'atlas-amazons-view', cls: ['atlas-amazons'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: 「3D盤」 (boards) and 「3D駒」 (figures) under the 2D boards ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Figuren', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фигуры', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  const PN = {
    statue: { ja: '大理石の女戦士像', en: 'Marble warriors', zh: '大理石女战士像', 'zh-TW': '大理石女戰士像', ko: '대리석 여전사상', es: 'Guerreras de mármol', fr: 'Guerrières de marbre', pt: 'Guerreiras de mármore', de: 'Marmorkriegerinnen', ru: 'Мраморные воительницы', tr: 'Mermer savaşçılar', id: 'Prajurit marmer', hi: 'संगमरमर की योद्धा', ar: 'محاربات من الرخام' },
    archer: { ja: '象牙と黒檀の弓兵', en: 'Ivory & ebony archers', zh: '象牙与乌木弓手', 'zh-TW': '象牙與烏木弓手', ko: '상아와 흑단 궁수', es: 'Arqueras de marfil y ébano', fr: 'Archères ivoire et ébène', pt: 'Arqueiras de marfim e ébano', de: 'Bogenschützinnen aus Elfenbein & Ebenholz', ru: 'Лучницы из слоновой кости и эбена', tr: 'Fildişi ve abanoz okçular', id: 'Pemanah gading & eboni', hi: 'हाथीदाँत और आबनूस की धनुर्धर', ar: 'رامياتٌ من العاج والأبنوس' },
    bronze: { ja: 'ブロンズと鉄のクイーン', en: 'Bronze & iron queens', zh: '青铜与铁女王', 'zh-TW': '青銅與鐵女王', ko: '청동과 철의 여왕', es: 'Reinas de bronce y hierro', fr: 'Reines de bronze et de fer', pt: 'Rainhas de bronze e ferro', de: 'Königinnen aus Bronze & Eisen', ru: 'Королевы из бронзы и железа', tr: 'Bronz ve demir kraliçeler', id: 'Ratu perunggu & besi', hi: 'काँसे और लोहे की रानियाँ', ar: 'ملكاتٌ من البرونز والحديد' },
  };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja'));
  const is3 = () => !V || V.is3d();
  function setLook(k) {
    if (!T3.BOARDS || !T3.BOARDS.amazons) return;
    if (T3.setBoard) T3.setBoard('amazons', k); else T3.BOARDS.amazons.set(k);
    if (V && !V.is3d()) V.set(true);
    try { mirror(); } catch (e) {}
    paint3();
  }
  function setSet(k) {
    try { localStorage.setItem('atlas-amazons-pc3', k); } catch (e) {}
    setPc3Attr();
    if (V && !V.is3d()) V.set(true);
    try { mirror(); } catch (e) {}
    paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS && T3.BOARDS.amazons; if (!f3 || !B) return;
    const l = lng(), cur = B.get(), on = is3(), cs = pc3();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('amazons', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    if (!prow.children.length) A3.SETS.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.set = k;
      const im = document.createElement('img'); im.src = 'img/pc3-' + k + '-w.webp'; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setSet(k); prow.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = cs === k; bt.querySelector('span').textContent = (PN[k] || {})[l] || PN[k].en; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D';
    f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-amazons-look' || e.key === 'atlas-amazons-pc3') { setPc3Attr(); try { mirror(); } catch (x) {} paint3(); } });

  /* ---------- 3D amazons and arrows mirrored from the page ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  const later = (ms, f, my) => setTimeout(() => { if (my === undefined || my === tok) f(); }, ms);
  function mkAmazon(k, sq) {
    const g = A3.piece(k <= 2 ? 1 : 2, pc3());
    const sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function mkArrow(sq, seed) {
    const g = new THREE.Group(), s = A3.scorch(), a = A3.arrow();
    s.position.y = .003; g.add(s);
    a.rotation.y = (seed * 2.399) % (Math.PI * 2); g.add(a); g.userData.arrow = a;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); A3.ignite(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (!g) return; A3.douse(g); if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      if (o.k === 5) continue;
      const el = els.get(i), on = !!(el && el.classList.contains('sel')), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .22 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
  }
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    build();
    tok++;
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: k === 5 ? mkArrow(i, i) : mkAmazon(k, i), k }); continue; }
      if (!o.g) { o.g = mkArrow(i, i); continue; }   // (an arrow still in the air when the page re-synced)
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z;
      if (k !== 5) { g.scale.set(1, 1, 1); g.userData.moving = false; g.userData.up = false; lift(g, 0); }
    }
    applySel(); T3.kick(300);
  }
  function travel(m, before) {
    const f = E.mFrom(m), tq = E.mTo(m), a = E.mArrow(m), o = P3.get(f); if (!o) return false;
    const my = tok, g = o.g;
    const qd = typeof qDur === 'function' ? qDur(m) : 400, ad = typeof aDur === 'function' ? aDur(m) : 300, gap = typeof SHOOT_GAP === 'number' ? SHOOT_GAP : 70;
    P3.delete(f); P3.set(tq, o);
    g.userData.moving = true; g.userData.up = false;
    const [x0, z0] = xz(f), [x1, z1] = xz(tq), h0 = hOf(g);
    anim(qd, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * .18 + h0 * (1 - k)); },
      () => { g.userData.moving = false; lift(g, 0); anim(140, k => { const s = 1 + Math.sin(k * Math.PI) * .04; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }, my);
    // the arrow: it flies after the amazon has landed, then sticks (the stuck arrow and the scorch appear at the strike)
    const old = P3.get(a); if (old) { drop(old.g); P3.delete(a); }
    const slot = { g: null, k: 5 }; P3.set(a, slot);
    later(qd + gap, () => A3.fly(root, Y, xz(tq), xz(a), ad, (d, f, done) => anim(d, f, done, my)), my);
    later(qd + gap + ad - 10, () => { if (P3.get(a) !== slot) return; slot.g = mkArrow(a, a); const st = slot.g.userData.arrow; st.position.y = .22; anim(90, k => { st.position.y = .22 * (1 - k) - .03 * k; }, null, my); A3.strike(slot.g, (d, f, done) => anim(d, f, done)); T3.kick(600); }, my);
    return true;
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oAnim = window.animateMove;
  window.animateMove = function (m, before) {
    const ok = oAnim.apply(this, arguments);
    if (ok && !(typeof isPass === 'function' && isPass(m))) { try { if (build() || !animOk() || !travel(m, before)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  if (piecesDom) new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
  try { mirror(); } catch (e) {}

  window.__amSkin = { pieces: () => P3.size, look: () => built, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
