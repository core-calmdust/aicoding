/* =====================================================================
   Patolli — portal skin (patolli/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, lessons, puzzles, review, the coach, both
   rule sets …). This file:
     • draws the 3D board (atlas/models/patolli.js: six boards, six sets of pieces — the ids are the 2D page's own designs,
       settings.design / settings.pieces, so one choice serves both views) on the 3D table; the camera is aligned to the DOM
       board (#frame), which stays on top (transparent) for taps, the green destinations, arrows, the last-move marks, the
       labels and numbers of the trays and stakes, and the flying beads of a payment
     • mirrors the page's state (PatolliSkin3D.sync): the pieces on the track (both sides, both directions — the squares
       come from the engine's coords), the waiting and finished pieces in their trays, the stakes as heaps of turquoise
       beads (their real number), the five beans
     • a move hops square by square along the track (round the arm ends and through the centre); a captured piece is
       knocked back to its owner's waiting tray; a finished piece goes to its tray
     • the beans are thrown in from the side of the player to move, tumble and settle with the rolled faces up
     • the design tab: 「3D盤」「3D駒」 rows (AtlasSkin.rows3d) under the 2D boards; a 2D board there shows the plain 2D board
       in the portal's frame
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin). The rules tour draws its own small 2D boards.
   World units = the page's SVG units / 100 (the frame is 10 × 10). Rendering is on demand (Table3D.kick).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.PatolliEngine, K3 = T3 && T3.patolli, App = window.PatolliApp;
  if (!THREE || !T3 || !K3 || !E || !window.AtlasSkin || !App) return;
  const de = document.documentElement, frameEl = document.getElementById('frame');
  if (!frameEl) return;
  de.classList.add('atlas-patolli');

  /* ---------- page: the DOM board's pictures become invisible (taps, marks, labels and numbers stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-patolli #board svg.pt-board{filter:none!important}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(1){opacity:0!important}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) .pt-pc{opacity:0!important}
html.atlas-patolli #board svg.pt-board .pt-trayb rect, html.atlas-patolli #board svg.pt-board .pt-gold > circle, html.atlas-patolli #board svg.pt-board .pt-gold > g{opacity:0!important}
html.atlas-patolli .frame > .dice-dock .dice-host{opacity:0!important}
/* the marks that the 2D page paints over a whole square would cover the 3D piece standing on it: frames instead
   (the last move: a yellow frame; a lesson's glowing square: a soft halo and a frame) */
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) > rect[fill="#ffd54a"]{fill:none!important;stroke:#ffd54a;stroke-width:7px;stroke-linejoin:round}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) > rect[fill="#ffd54a"][opacity=".42"]{opacity:.95!important}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) > rect[fill="#ffd54a"][opacity=".22"]{opacity:.55!important}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) > g > circle[fill^="url("]{fill-opacity:.38!important}
html.atlas-patolli #board svg.pt-board > g:nth-of-type(2) > g > rect[fill-opacity=".72"]{fill-opacity:.1!important;stroke-width:6px!important}
html.atlas-patolli .fx-glow{display:none!important}
/* PC: the two players one above the other (each row: piece, name, pieces home, stake — too much for half the column) */
html.atlas-skin.atlas-patolli:not(.atlas-2d):not(.atlas-hex):not(.atlas-backgammon) body:not(#_) .card.players:not(:has(> .pl-info)){grid-template-columns:minmax(0,1fr)!important;gap:6px!important}
html.atlas-skin.atlas-patolli:not(.atlas-2d) body:not(#_) .card.players > .player > div:not(.status){flex:1 1 auto;min-width:0}
html.atlas-skin.atlas-patolli:not(.atlas-2d) body:not(#_) .card.players > .player .name{font-size:14px!important;-webkit-line-clamp:1!important}
html.atlas-patolli #poolInfo{color:#5a6078!important}
html.atlas-patolli #poolInfo b{color:#2b3044!important}
/* phones / narrow: the menu buttons are round chips (skin.css): labels on one line; the players' cards in the cream portal look */
@media not all and (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){
  html.atlas-patolli .controls{gap:5px!important}
  html.atlas-patolli .controls .btn{padding:7px 1px!important;min-width:0}
  html.atlas-patolli .controls .btn span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:9.5px!important;letter-spacing:-.04em}
  html.atlas-patolli .board-area > .player{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:16px!important;box-shadow:0 10px 24px -16px rgba(80,40,0,.55)!important}
  html.atlas-patolli .board-area > .player.active{border-color:#ffc928!important}
  html.atlas-patolli .board-area > .player .sub{color:#6a7088!important}
  html.atlas-patolli .board-area > .player .sub b{color:#2b3044!important}
  html.atlas-patolli .board-area > .player .home small{color:#7a7f94!important}
  html.atlas-patolli #stText small{color:#6a7088!important}
}
`;
  document.head.appendChild(st);
  // PC: the page lays out its header-bar layout under html.hb-on; with the portal bar as the header it gets html.hb-atlas
  // instead (shared/headerbar.js), so the page's hb-on rules are copied for hb-atlas (64px portal bar) — as atlas/skin/ur.js
  (function hbAtlas() {
    const css = ['html.atlas-skin.hb-atlas,html.atlas-skin.hb-atlas body{--hb-h:64px}', 'html.atlas-skin.hb-atlas body{padding-top:64px}'];
    const conv = sel => sel.replace(/\b(html|body)\.hb-on\b/g, '$1.hb-atlas');
    const walk = (rules, wrap) => { for (const r of rules) {
      if (r.cssRules && r.conditionText !== undefined) { walk(r.cssRules, t => wrap((r.type === 4 ? '@media ' : '@supports ') + r.conditionText + '{' + t + '}')); continue; }
      if (r.selectorText && /\b(html|body)\.hb-on\b/.test(r.selectorText)) css.push(wrap(conv(r.selectorText) + '{' + r.style.cssText + '}'));
    } };
    for (const sh of document.styleSheets) { const n = sh.ownerNode; if (sh.href || (n && n.id === 'hbCss')) continue; let R; try { R = sh.cssRules; } catch (e) { continue; } walk(R, t => t); }
    css.push('@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-skin.hb-atlas .app{padding-top:28px!important}}');
    const s2 = document.createElement('style'); s2.textContent = css.join('\n'); document.head.appendChild(s2);
  })();

  const skin = AtlasSkin.init({
    margin: .1,
    persp: 4,   // a longer lens than the default: the pieces stay over their squares under the DOM marks
    board: frameEl,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-dice.webp', guideFallback: '../images/atlas/patolli.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'pt-|dice|roll-pill|fx-|frame|board-wrap|board-tip',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side === 2 ? '1' : '0';
      if (lv >= 1 && lv <= 20) draft.level = lv;
      { const q = new URLSearchParams(location.search), R = q.get('rule') || ['bell', 'popular'][+q.get('size') - 1]; if (E.RULES[R] && draft.mode !== 'rated') draft.rule = R; }   // (the portal card's 種目)
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the board (rebuilt for another look or the other rule set) ---------- */
  const holder = new THREE.Group(), inner = new THREE.Group(); holder.add(inner);
  let root = null, U = null, Y = 0, built = '', shownOnce = false;
  let tok = 0;            // a rebuild / a new position cancels running animations
  const cfg = () => { let s = null; try { s = settings; } catch (e) {} return s || {}; };
  const lookNow = () => K3.LOOKS.includes(cfg().design) ? cfg().design : 'petate';
  const setNow = () => K3.SETS.includes(cfg().pieces) ? cfg().pieces : 'pebble';
  // the registry reads this page's own settings (the portal reads the saved ones)
  if (T3.BOARDS && T3.BOARDS.patolli) { T3.BOARDS.patolli.get = lookNow; T3.BOARDS.patolli.set = k => { try { setDesign(k, setNow()); } catch (e) {} }; }
  if (T3.PIECES && T3.PIECES.patolli) { T3.PIECES.patolli.get = setNow; T3.PIECES.patolli.set = k => { try { setDesign(lookNow(), k); } catch (e) {} }; }
  const V = skin.view && skin.view({ key: 'atlas-patolli-view', cls: ['atlas-patolli'], on: is3 => { if (is3) setTimeout(() => { try { App.render(); } catch (e) {} }, 0); } });
  const is3 = () => !V || V.is3d();
  function build(rule) {
    rule = E.RULES[rule] ? rule : 'bell';
    const key = lookNow() + '|' + rule;
    if (key === built && root) return false;
    built = key; tok++; moving = null; rolling = false;
    if (root) inner.remove(root);
    root = K3.board(lookNow(), rule); U = root.userData; Y = U.top; inner.add(root);
    if (!shownOnce) { shownOnce = true; T3.show('patolli', holder, { still: true }); }
    skin.alignTo(10, Y);
    for (const b of BEANS) b.g.position.y = Y;
    for (const k in HEAPS) HEAPS[k].g.position.y = Y;
    beanSide = -2;   // (the beans are laid out again on the new top)
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  { let last = ''; const app = document.querySelector('.app') || document.body;   // the header bar / info row can move the board without resizing it
    const chk = () => { const r = frameEl.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width) + ',' + Math.round(r.height); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (window.ResizeObserver) { new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); new ResizeObserver(() => requestAnimationFrame(chk)).observe(frameEl); }
    setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- helpers ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const spd = () => { try { return typeof SPD === 'function' ? SPD() : 1; } catch (e) { return 1; } };
  const anim = (dur, f, my) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return res(); const k = Math.min(1, Math.max(0, (n - t0) / Math.max(1, dur))); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const RL = s => E.RULES[s.rule] || E.RULES.bell;
  const dirOf = (s, side) => s.dir ? s.dir[side] : 1;
  // where the piece at position i of a side stands: a square of the track (the engine's grid → the board's x, z)
  const sqXZ = (s, side, i) => { const rc = E.coords(s.rule, side, i, dirOf(s, side)); return U.cell(rc[0], rc[1]); };

  /* ---------- pieces ---------- */
  const P3 = new Map();   // side * 100 + k → { g, side, k, set, h }
  function mk(side, k) {
    const g = new THREE.Group(), p = K3.piece(side, setNow(), k); g.add(p);
    const sh = T3.contact(K3.PR * .98, .5); sh.position.y = .003; g.add(sh); g.userData.sh = sh; g.userData.pc = p;
    inner.add(g); return { g, side, k, set: setNow(), h: 0 };
  }
  function drop(o) { inner.remove(o.g); o.g.userData.sh.material.dispose(); }
  function lift(o, h) {
    o.h = h; o.g.userData.pc.position.y = h;
    const sh = o.g.userData.sh, s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2);
  }
  // where each piece of a state stands: key → { x, z, pos, side, k }
  function layout(s) {
    const R = RL(s), out = new Map();
    for (const side of [0, 1]) {
      let w = 0, h = 0;
      s.pos[side].forEach((p, k) => {
        let xz;
        if (p <= 0) xz = U.tray(side, 'start', w++);
        else if (p > R.L) xz = U.tray(side, 'goal', h++);
        else xz = sqXZ(s, side, p);
        out.set(side * 100 + k, { x: xz[0], z: xz[1], pos: p, side, k });
      });
    }
    return out;
  }
  let moving = null, lastState = null;
  // the piece to lift: the one whose move the page previews (the mouse over it / over its destination)
  function selected(s) {
    let hm = null; try { hm = typeof hoverMove !== 'undefined' ? hoverMove : null; } catch (e) {}
    if (hm && s && s.pos[s.turn]) { const k = s.pos[s.turn].indexOf(hm.from); if (k >= 0) return s.turn * 100 + k; }
    return -1;
  }
  function mirror(s) {
    if (!s || !s.pos) return;
    lastState = s;
    const L = layout(s), sel = selected(s), dz = setNow();
    for (const [key, o] of P3) if (!L.has(key) || o.set !== dz) { drop(o); P3.delete(key); }
    for (const [key, q] of L) {
      let o = P3.get(key);
      if (!o) { o = mk(q.side, q.k); P3.set(key, o); }
      if (moving && moving.has(key)) continue;
      o.g.position.set(q.x, Y, q.z); o.g.rotation.z = 0; o.g.userData.pc.scale.set(1, 1, 1);
      const want = key === sel ? .2 : 0;
      if (Math.abs(o.h - want) > .001 && animOk()) { const h0 = o.h; anim(want ? 130 : 110, k => lift(o, h0 + (want - h0) * io(k))); } else lift(o, want);
    }
    T3.kick(300);
  }

  /* ---------- a move: lift, hop along the track square by square, set down; a captured piece goes back to its tray ---------- */
  async function travel(side, from, to, info) {
    const s = lastState || App.state(); if (!s) return;
    const R = RL(s), k = s.pos[side].indexOf(from); if (k < 0) return;
    const o = P3.get(side * 100 + k); if (!o) return;
    const my = ++tok, sp = Math.max(.5, (info && info.speed) || spd());
    // the waypoints: where it stands (a tray slot or a square), each square on the way, the square / the goal tray reached
    const pts = [[o.g.position.x, o.g.position.z]];
    for (let i = Math.max(1, from + 1); i <= Math.min(to, R.L); i++) pts.push(sqXZ(s, side, i));
    if (to > R.L) pts.push(U.tray(side, 'goal', s.pos[side].filter(p => p > R.L).length));
    // the piece captured: the opponent's piece on the square reached
    let vic = null;
    if (info && info.capture && to <= R.L) {
      const q = E.qOf(R, side, to, dirOf(s, side)), op = 1 - side, vk = s.pos[op].findIndex(p => p >= 1 && p <= R.L && E.qOf(R, op, p, dirOf(s, op)) === q);
      if (vk >= 0 && P3.get(op * 100 + vk)) vic = { o: P3.get(op * 100 + vk), side: op, k: vk };
    }
    moving = new Set([side * 100 + k]); if (vic) moving.add(vic.side * 100 + vic.k);
    const legs = pts.length - 1; if (legs < 1) return;
    const H = .22, up = 120 / sp, legT = (legs > 6 ? 105 : 140) / sp, down = 110 / sp, h0 = o.h;
    await anim(up, q => lift(o, h0 + (H - h0) * io(q)), my);
    for (let i = 0; i < legs && my === tok; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], far = Math.hypot(x1 - x0, z1 - z0) > U.u * 1.6;   // (from / to a tray: one long, higher arc)
      await anim(far ? legT * 2.2 : legT, q => { const e = far ? io(q) : q; o.g.position.x = x0 + (x1 - x0) * e; o.g.position.z = z0 + (z1 - z0) * e; lift(o, H + Math.sin(q * Math.PI) * (far ? .5 : .13)); }, my);
    }
    if (my !== tok) return;
    let vp = null;
    if (vic) {
      const ns = { rule: s.rule, dir: s.dir, pos: [s.pos[0].slice(), s.pos[1].slice()] }; ns.pos[side][k] = to; ns.pos[vic.side][vic.k] = 0;
      const tq = layout(ns).get(vic.side * 100 + vic.k), vo = vic.o, sx = vo.g.position.x, sz = vo.g.position.z;
      vp = anim(560 / sp, q => { const e = io(q); vo.g.position.x = sx + (tq.x - sx) * e; vo.g.position.z = sz + (tq.z - sz) * e; lift(vo, Math.sin(q * Math.PI) * .9); vo.g.rotation.z = Math.sin(q * Math.PI) * .9; }, my).then(() => { vo.g.rotation.z = 0; if (my === tok) lift(vo, 0); });
    }
    await anim(down, q => lift(o, H * (1 - io(q))), my);
    if (my !== tok) return;
    await anim(110 / sp, q => { const s2 = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.pc.scale.set(s2, 1 / s2, s2); }, my);
    o.g.userData.pc.scale.set(1, 1, 1);
    if (vp) await vp;
  }

  /* ---------- the stakes: heaps of turquoise beads (each player's and the pool) ---------- */
  const HEAPS = {};
  function heapOf(name) {
    if (HEAPS[name]) return HEAPS[name];
    const g = new THREE.Group(); inner.add(g); return (HEAPS[name] = { g, n: -1, ms: [] });
  }
  function syncGems(s) {
    if (!s || !s.gold) return;
    for (const [name, n] of [['gold0', s.gold[0]], ['gold1', s.gold[1]], ['pool', s.pool]]) {
      const hp = heapOf(name), xz = U.spot(name); hp.g.position.set(xz[0], Y, xz[1]);
      if (hp.n === n) continue; hp.n = n;
      const P = K3.heap(n);
      while (hp.ms.length < P.length) { const m = K3.gem(); hp.g.add(m); hp.ms.push(m); }
      hp.ms.forEach((m, i) => { m.visible = i < P.length; if (i < P.length) m.position.set(P[i][0], P[i][1], P[i][2]); });
    }
  }

  /* ---------- the beans: five, at rest in the gap on the left; thrown in from the side of the player to move ---------- */
  const BEANS = [];
  let rolling = false, beanSide = -2, shownFaces = '';
  function ensureBeans() {
    while (BEANS.length < 5) {
      const g = new THREE.Group(), d = K3.bean(); g.add(d);
      const sh = T3.contact(K3.BEAN[0] * .95, .45); sh.position.y = .003; sh.scale.z = .7; g.add(sh);
      inner.add(g); BEANS.push({ g, d, sh, rest: d.userData.rest, yaw: BEANS.length * 1.9 + .4 });
    }
  }
  function restBeans(d) {
    ensureBeans();
    BEANS.forEach((b, i) => {
      const xz = U.beanAt(i); b.g.position.set(xz[0], Y, xz[1]); b.d.position.set(0, b.rest, 0);
      K3.beanUp(b.d, !!(d && d[i]), b.yaw); b.sh.scale.set(1, 1, .7); b.sh.material.opacity = .45;
    });
    shownFaces = d ? d.join('') : '00000'; beanSide = 0; T3.kick(200);
  }
  async function roll(d) {
    const s = App.state() || lastState, side = s ? s.turn : 0;
    ensureBeans(); rolling = true; const my = ++tok;
    beansShown();
    const dur = (animOk() ? 900 : 0) / Math.max(.6, spd());
    if (dur < 50) { restBeans(d); rolling = false; return; }
    const sgn = side === 0 ? 1 : -1;
    const items = BEANS.map((b, i) => {
      const xz = U.beanAt(i); b.yaw = Math.random() * Math.PI * 2; b.g.position.y = Y;
      return { g: b.g, d: b.d, sh: b.sh, from: [xz[0] - .5 - Math.random() * .9, xz[1] + sgn * (2 + Math.random() * .8)], to: xz, marked: !!d[i], rest: b.rest, yaw: b.yaw };
    });
    const TP = K3.throwPlan(items, { dur, onHit: (i, k) => { try { if (typeof snd2 === 'function') snd2('dieHit', k); } catch (e) {} } });
    await anim(TP.total, k => TP.frame(k * TP.total), my);
    if (my === tok) TP.end();
    BEANS.forEach(b => { b.sh.scale.set(1, 1, .7); });
    shownFaces = d.join(''); beanSide = 0; rolling = false; beansShown(); T3.kick(200);
    await sleep(110 / Math.max(.6, spd()));
  }
  // while the page shows its 「投げる」 button in the gap (the dock has .can), the beans are put away, as on the 2D page
  const dock = document.getElementById('diceDock');
  function beansShown() {
    const on = !dock || !dock.classList.contains('can') || rolling;
    if (BEANS.length && BEANS[0].g.visible !== on) { BEANS.forEach(b => { b.g.visible = on; }); T3.kick(200); }
  }
  if (dock) new MutationObserver(beansShown).observe(dock, { attributes: true, attributeFilter: ['class'] });
  // at rest: the faces of the page's current roll; with no roll the beans stay as they fell (all unmarked before the first throw)
  function syncBeans() {
    beansShown();
    if (rolling) return;
    const r = App.roll(), d = r && r.d && r.d.length === 5 ? r.d : null;
    if (beanSide < 0) { restBeans(d || (shownFaces ? shownFaces.split('').map(Number) : null)); return; }
    if (d && d.join('') !== shownFaces) restBeans(d);
  }

  /* ---------- the hooks the page calls (patolli/app.js "3D skin hooks") ---------- */
  window.PatolliSkin3D = {
    is3d: is3,
    sync(s, view, shown) {
      if (!s || !is3()) return;
      const ch = build(s.rule);
      try { mirror(s); } catch (e) { console.error(e); }
      try { syncGems(shown || s); syncBeans(); } catch (e) { console.error(e); }
      if (ch) T3.kick(600);
    },
    // false: not handled here (the 2D view) → the page animates its own 2D board
    async animateMove(side, from, to, info) {
      if (!is3()) return false;
      if (!animOk() || !root) return true;
      try { await travel(side, from, to, info || {}); } finally { moving = null; }
      return true;
    },
    async animateRoll(d) {
      if (!is3()) return false;
      if (!root) return true;
      await roll((d || []).slice(0, 5));
      return true;
    },
  };
  build((App.state() || {}).rule);
  try { App.render(); } catch (e) { try { window.PatolliSkin3D.sync(App.state()); } catch (x) {} }
  T3.kick(800);

  /* ---------- the new-game dialog's design tab: 「3D盤」「3D駒」 rows under the 2D boards (shared AtlasSkin.rows3d) ---------- */
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pions 3D', pt: 'Peças 3D', de: '3D-Steine', hi: '3D गोटियाँ', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фишки', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  { const row = document.getElementById('bdRow'), h = row && (row.closest('.field') || row.parentNode);
    const repaint = () => { try { if (typeof designPickers === 'function' && document.querySelector('#newOverlay.show')) designPickers(); } catch (e) {} };
    const go3 = () => { if (V && !V.is3d()) V.set(true); try { App.render(); } catch (e) {} };
    // (the registry's set → the page's setDesign: saved, the 2D art and the 3D board follow; the dialog's draft keeps the same choice)
    const R3 = AtlasSkin.rows3d && h ? AtlasSkin.rows3d({ id: 'patolli', host: h, is3, clear: row, p3: P3L,
      board: k => { try { draft.design = k; } catch (e) {} repaint(); go3(); },
      piece: k => { try { draft.pieces = k; } catch (e) {} repaint(); go3(); } }) : null;
    { const r3 = document.querySelector('#f3D .bdrow:not(.pc3)'); if (r3) r3.classList.add('dsg'); }   // (the page's own grid of design tiles: 3 across on a phone, 6 on a PC)
    if (row && R3) row.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(() => R3.paint(), 0); } }, true);   // a 2D board: the 2D page
    if (R3 && typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { R3.paint(); } catch (e) {} return r; }; }
  }

  // test hooks (Playwright)
  const scr = (x, z, y) => { const v = new THREE.Vector3(x, y == null ? Y : y, z); return T3.project(v.x, v.z, v.y); };
  window.__ptSkin = {
    built: () => built, set: () => setNow(), pieces: () => P3.size, is3d: is3,
    piece: (side, k) => { const o = P3.get(side * 100 + k); return o ? Object.assign(scr(o.g.position.x, o.g.position.z), { h: o.h, wx: o.g.position.x, wz: o.g.position.z }) : null; },
    cell: (r, c) => { const p = U.cell(r, c); return scr(p[0], p[1]); },
    svg: (x, y) => scr(x / 100, y / 100),
    beans: () => BEANS.map(b => K3.beanIsUp(b.d)), beanAt: i => scr(BEANS[i].g.position.x, BEANS[i].g.position.z),
    gems: () => ['gold0', 'gold1', 'pool'].map(n => HEAPS[n] ? HEAPS[n].ms.filter(m => m.visible).length : 0),
    busy: () => !!moving || rolling,
  };
})();
