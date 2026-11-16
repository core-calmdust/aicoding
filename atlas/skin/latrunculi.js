/* =====================================================================
   Ludus latrunculorum — portal skin (latrunculi/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, lessons, puzzles, the daily puzzle,
   review / analysis, the coach, the three rule sets…). This file:
     • draws the 3D board (atlas/models/latrunculi.js: six boards, six sets of counters — Table3D.BOARDS / PIECES.latrunculi,
       chosen in the design tab's 「3D盤」「3D駒」 rows, the same keys as the portal) with the 3D table; the camera is aligned to
       the DOM board, which stays on top (transparent) for taps, destinations, arrows, hints and labels; the count plates
       sit on the far / near bands of the slab
     • mirrors the page's counters (syncPieces / animateMove / the .inc class) into 3D: a counter set down drops in, a move
       slides, a leap hops over each friend, a taken counter rises and vanishes, a blocked counter is turned over where it
       stands (and back when it is rescued); the selected counter is lifted
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.LatrEngine, K3 = T3 && T3.latrunculi;
  if (!THREE || !T3 || !K3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-latr');

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-latr #fPieces{display:none!important}   /* 2Dの駒の欄は2D表示のときだけ（チェッカーと同じ。3Dの駒は共通部品が別の箱に出す） */
html.atlas-latr .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-latr .frame::before,html.atlas-latr .frame::after,html.atlas-latr .board::after,html.atlas-latr .board::before{display:none!important}
html.atlas-latr .board{background:none!important;box-shadow:none!important}
html.atlas-latr .lines :is(.grv,.grv-hl){stroke:transparent!important}
html.atlas-latr .lines{overflow:visible!important}
html.atlas-latr .lines .num{fill:rgba(255,236,200,.82)!important;font-weight:700}
html.atlas-latr .lines .num:not([text-anchor]){transform:translate(-.36px,0)}   /* ranks: out on the side band */
html.atlas-latr .lines .num[text-anchor]{transform:translate(0,.15px)}   /* files: just below the last row */
html.atlas-latr .frame > .reserve.bot{transform:translateY(calc(var(--cell) * .14))}html.atlas-latr .frame > .reserve.top{transform:translateY(calc(var(--cell) * -.08))}
html.atlas-latr .prompt{transform:translateY(calc(var(--cell) * .14))!important}
html.atlas-latr .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important;animation:none!important}
html.atlas-latr .pieces .pc:not(.hov)::before,html.atlas-latr .pieces .pc:not(.hov)::after,html.atlas-latr .pieces .pc:not(.hov) .orn{display:none!important}
html.atlas-latr .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,214,100,.95),0 0 18px rgba(255,200,80,.75)!important}
html.atlas-latr .pieces .pc.mov:not(.sel){box-shadow:0 0 0 2.5px rgba(255,224,160,.8),0 0 12px rgba(255,214,140,.45)!important}
html.atlas-latr .pieces .pc.inc:not(.sel):not(.rmable){box-shadow:0 0 0 2.5px rgba(255,96,72,.85)!important}
html.atlas-latr .pieces .pc.rmable:not(.sel){box-shadow:0 0 0 3px rgba(255,120,90,.95),0 0 16px rgba(255,110,80,.7)!important;animation:ltRm3 1.4s ease-in-out infinite!important}
@keyframes ltRm3{50%{box-shadow:0 0 0 5px rgba(255,120,90,.5),0 0 22px rgba(255,110,80,.45)}}
html.atlas-latr .pieces .pc.dim{opacity:1!important}
html.atlas-latr .pieces .hov{opacity:.45!important;box-shadow:none!important}
html.atlas-latr .pieces .hov::before,html.atlas-latr .pieces .hov::after,html.atlas-latr .pieces .hov .orn{display:none!important}
html.atlas-latr .pieces .hov.p1{background:radial-gradient(circle at 40% 35%,#5a6070,#1c2230 60%,#0b0d12)!important}
html.atlas-latr .pieces .hov.p2{background:radial-gradient(circle at 40% 35%,#fff,#eef0ea 60%,#c4cbc4)!important}
html.atlas-latr .reserve .rsv-plate{background:rgba(26,14,22,.84)!important;box-shadow:0 0 0 1px rgba(226,170,214,.45),0 2px 6px rgba(0,0,0,.35)!important;color:#f0d9e6!important}
html.atlas-latr .reserve .rsv-plate .rsv-l b,html.atlas-latr .reserve .rsv-plate .rsv-w:not(.hot) b{color:#fff2dc!important}
html.atlas-latr .reserve .rsv-plate .rsv-w:not(.hot){color:#f0d9e6!important;background:transparent!important}
/* a game with clocks (rated / online): the two players one above the other — side by side the clock chip left no room for the names */
html.atlas-skin.atlas-latr:not(.atlas-2d):not(.atlas-hex):not(.atlas-backgammon) body:not(#_) .card.players:not(:has(> .pl-info)):has(.clk:not(:empty)){grid-template-columns:minmax(0,1fr)!important;gap:6px!important}
html.atlas-skin.atlas-latr:not(.atlas-2d):not(.atlas-hex):not(.atlas-backgammon) body:not(#_) .card.players:has(.clk:not(:empty)) > .player :is(.name, .nm){display:block!important;-webkit-line-clamp:1!important;white-space:nowrap!important;text-overflow:ellipsis;font-size:13.5px!important}
html.atlas-skin.atlas-latr:not(.atlas-2d):not(.atlas-hex):not(.atlas-backgammon) body:not(#_) .card.players:has(.clk:not(:empty)) > .player .clk{font-size:14px!important}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    margin: .16,
    persp: 10,   // a long lens: the counters stay inside their squares under the DOM marks
    board: boardDom,
    pc: { vars: ['--cell'], extras: '.frame > .reserve' },
    outer: r => { const H = r.height * K3.H() / 8; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // slab edge to slab edge
    guide: '../images/atlas/latrunculi.webp', guideFallback: '../images/atlas/latrunculi.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|orn',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      { const q = new URLSearchParams(location.search), R = q.get('rule') || ['seneca', 'piso', 'quintana'][+q.get('size') - 1]; if (E.RULE_ORDER.includes(R) && draft.mode !== 'rated') draft.rule = R; }   // (the portal card's 種目: size 1 Schädler · 2 Piso · 3 Quintana)
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the board (rebuilt for another look) ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, Y = 0, built = '';
  const P3 = new Map();   // square → { g, k, inc }
  let tok = 0;            // a full re-sync cancels running animations
  const lookNow = () => T3.BOARDS && T3.BOARDS.latrunculi ? T3.BOARDS.latrunculi.get() : 'marble';
  const setNow = () => T3.PIECES && T3.PIECES.latrunculi ? T3.PIECES.latrunculi.get() : 'glass';
  function build() {
    const key = lookNow() + '|' + setNow();
    if (key === built && root) return false;
    built = key; tok++;
    if (root) holder.remove(root);
    for (const [, o] of P3) drop(o.g);
    P3.clear();
    root = K3.board(lookNow()); U = root.userData; Y = U.top; holder.add(root);
    T3.show('latrunculi', holder, { still: true });
    skin.alignTo(8, U.top);
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  const V = skin.view && skin.view({ key: 'atlas-latrunculi-view', cls: ['atlas-latr'] });   // (the 3D boards have their own rows under the 2D boards)
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- 3D counters mirrored from the page's counters ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const colOf = k => k <= 2 ? 1 : 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, sq) {
    const g = U.piece(colOf(k), setNow());
    const sh = T3.contact(K3.R * .9, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function land(g, my) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }
  // a counter leaving the board: up, a little turn, shrinking away
  function vanish(g, delay, my) {
    setTimeout(() => {
      if (my !== tok) { drop(g); return; }
      const x0 = g.position.x, z0 = g.position.z;
      anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g));
    }, delay);
  }
  // a counter turned over (blocked) or back: it hops as it turns
  function setInc(o, on, animate, my) {
    if (!!o.inc === !!on) return;
    o.inc = !!on; const g = o.g, a = on ? 0 : 1, b = on ? 1 : 0;
    if (!animate) { K3.turn(g, b); return; }
    anim(380, k => { K3.turn(g, a + (b - a) * io(k)); if (!g.userData.moving && !g.userData.up) lift(g, Math.sin(k * Math.PI) * .32); }, () => { K3.turn(g, b); if (!g.userData.moving && !g.userData.up) lift(g, 0); }, my);
  }
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      const el = els.get(i); if (!el) continue;
      setInc(o, el.classList.contains('inc'), animOk(), tok);
      const on = el.classList.contains('sel'), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .26 : 0;
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
      let o = P3.get(i);
      if (!o) { o = { g: mk(k, i), k, inc: false }; P3.set(i, o); }
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z; g.scale.set(1, 1, 1); g.rotation.z = 0; g.userData.moving = false; g.userData.up = false; lift(g, 0);
      const el = els.get(i); setInc(o, !!(el && el.classList.contains('inc')), false);
    }
    applySel(); T3.kick(300);
  }
  // a move as the page animates it (the same timing: the removal first, HOP per square / leap, taken counters leave at the end)
  const HOP = 260, LIFT = 380;
  function travel(m, before) {
    const my = tok, f = E.mFrom(m), to = E.mTo(m), rm = E.mRm(m);
    if (before.placing) {   // a counter set down: it drops onto its square
      const k = before.turn === 1 ? 1 : 3, o = { g: mk(k, to), k, inc: false }; P3.set(to, o);
      anim(260, q => { lift(o.g, (1 - io(q)) * .7); const s = .6 + .4 * io(q); o.g.scale.set(s, s, s); }, () => { o.g.scale.set(1, 1, 1); lift(o.g, 0); land(o.g, my); }, my);
      return true;
    }
    const d0 = rm >= 0 ? LIFT * .6 : 0;
    if (rm >= 0) { const c = P3.get(rm); if (c) { P3.delete(rm); vanish(c.g, 0, my); } }
    if (f === to) return true;
    const o = P3.get(f); if (!o) return false;
    const fx = E.effect(before, m), path = fx.path, g = o.g;
    P3.delete(f); P3.set(to, o);
    const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1, dur = legs * HOP;
    fx.takes.forEach((q, k) => { const c = P3.get(q); if (c) { P3.delete(q); vanish(c.g, d0 + dur + k * 90, my); } });
    g.userData.moving = true; g.userData.up = false;
    const hopH = fx.leap ? .62 : .16;   // a leap clears the friend it passes; a step / slide just skims the board
    setTimeout(() => {
      if (my !== tok) return;
      anim(dur, k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q = r - i, [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        lift(g, Math.max(0, Math.sin(q * Math.PI) * hopH + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { g.userData.moving = false; lift(g, 0); land(g, my); }, my);
    }, d0);
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
  build();
  try { mirror(); } catch (e) {}
  T3.kick(800);

  /* ---------- the new-game dialog's design tab: 「3D盤」「3D駒」 rows under the 2D boards (shared AtlasSkin.rows3d) ---------- */
  { const row = document.getElementById('bdRow'), h = row && (row.closest('.field') || row.parentNode), is3 = () => !V || V.is3d();
    const go3 = () => { if (V && !V.is3d()) V.set(true); try { mirror(); } catch (e) {} };
    const R3 = AtlasSkin.rows3d && h ? AtlasSkin.rows3d({ id: 'latrunculi', host: h, is3, clear: row, board: go3, piece: go3, p3: { ja: '3D駒', en: '3D pieces', zh: '3D棋子', 'zh-TW': '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Figuren', ru: '3D-фигуры', tr: '3D taşlar', id: 'Bidak 3D', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد' } }) : null;
    if (row && R3) row.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(() => R3.paint(), 0); } }, true);   // a 2D board: the 2D page
    if (R3 && typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { R3.paint(); } catch (e) {} return r; }; }
    addEventListener('storage', e => { if (e.key === 'atlas-latrunculi-look' || e.key === 'atlas-latrunculi-pc3') { try { mirror(); } catch (x) {} if (R3) R3.paint(); } });
  }

  // the portal bar: this game's name is long (ラトルンクロルム + the seven menu buttons), so the brand is squeezed and its small
  // English line under the title was cut at the right ("World Board Game Atl"): it steps down with the title
  { const bar = document.querySelector('.atlas-top'), sm = bar && bar.querySelector('.atlas-brand small'), sp = sm && sm.parentNode;
    if (sm) { const fit = () => { sm.style.fontSize = ''; sm.style.letterSpacing = ''; if (!sm.getClientRects().length) return; const cw = sp.clientWidth; if (cw > 0 && sm.scrollWidth > cw + .5) { sm.style.letterSpacing = '.02em'; if (sm.scrollWidth > cw + .5) sm.style.fontSize = Math.max(7, parseFloat(getComputedStyle(sm).fontSize) * cw / sm.scrollWidth * .98).toFixed(2) + 'px'; } };
      const later = () => setTimeout(fit, 80); later(); setTimeout(fit, 1500); addEventListener('resize', later); if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
      const sel = document.getElementById('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(fit, 200)); } }

  window.__ltSkin = { pieces: () => P3.size, turned: () => [...P3.values()].filter(o => o.inc).length, built: () => built, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
