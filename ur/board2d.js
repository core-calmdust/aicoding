/* =====================================================================
   ur/board2d.js — the 2D board, pieces and dice of the Royal Game of Ur
   window.UrBoard2D (no dependencies; uses window.UrEngine.coords when present)

   The board / piece images are baked offline (ur/tools/paint2d.js + bake2d.py → ur/img/*.webp):
   lit inlay, engraving, lapis grain, bitumen sheen. This file lays them out in one SVG and
   adds the live layers (hit areas, pieces, marks, animation).

   SVG user units: one square = 100.  h: cell (r,c) at ((c−3.5)·100, (r−1)·100)
                                       v: cell (r,c) at ((r−1)·100, (c−3.5)·100)  (row 0 left, row 2 right, big block on top)
   Designs:  board  'museum' (default) | 'restored' | 'wood' | 'clay'
             pieces 'orig' (default)   | 'ivory'    | 'wood' | 'gold'
   API: see README at the bottom of this file (and ur/SPEC.md 4.2).
   ===================================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : 'ur/'; })();
  const BOARDS = ['museum', 'restored', 'wood', 'clay'], PIECES = ['orig', 'ivory', 'wood', 'gold'];
  const GREEN = '#3df59a', GREEN_EDGE = '#06331d';
  const IMG = { h: [-452, -202, 904, 426], v: [-202, -452, 404, 926] };
  const VIEW = { h: [-462, -272, 924, 552], v: [-272, -462, 544, 932] };
  const PD = 76, TD = 54;   // piece diameter on the board / in the trays (user units)
  const exists = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 8 && (r === 1 || c < 4 || c > 5);
  const ROSETTES = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
  const isRos = (r, c) => ROSETTES.some(([a, b]) => a === r && b === c);
  let uid = 0;

  /* ---------- geometry ---------- */
  const cellXY = (o, r, c) => o === 'v' ? [(r - 1) * 100, (c - 3.5) * 100] : [(c - 3.5) * 100, (r - 1) * 100];
  // built-in routes (used when UrEngine is not loaded)
  function route(rule, side) {
    const E = window.UrEngine;
    if (E && E.pathOf) return E.pathOf(rule || 'finkel', side);
    const L = side ? 0 : 2, a = [];
    for (let i = 1; i <= 4; i++) a.push([L, 4 - i]);
    if (rule === 'masters' || rule === 'blitz') { for (let i = 5; i <= 11; i++) a.push([1, i - 5]); a.push([2 - L, 6], [2 - L, 7], [1, 7], [L, 7], [L, 6]); }
    else { for (let i = 5; i <= 12; i++) a.push([1, i - 5]); a.push([L, 7], [L, 6]); }
    return a;
  }
  // tray slots: side 1 (dark, row 0) above / left, side 0 (light, row 2) below / right
  function traySlots(o, side, kind, n = 7) {
    const out = [];
    for (let i = 0; i < n; i++) {
      // start: slot 0 is next to the entry square (col 3); goal: slot 0 next to the exit (col 6)
      const a = kind === 'start' ? -32 - i * 58 : 118 + i * 50;
      const b = side ? (o === 'v' ? -238 : -232) : (o === 'v' ? 238 : 244);
      out.push(o === 'v' ? [b, a] : [a, b]);
    }
    return out;
  }
  function trayBox(o, side, kind) {
    const s = traySlots(o, side, kind), xs = s.map(p => p[0]), ys = s.map(p => p[1]), m = TD / 2 + 8;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    return [x0, y0, x1 - x0, y1 - y0];
  }
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const tween = (ms, f) => new Promise(res => { const t0 = performance.now(); const step = now => { const t = Math.min(1, (now - t0) / Math.max(1, ms)); f(t); t < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  const rc = v => v == null ? null : Array.isArray(v) ? { r: v[0], c: v[1] } : v;

  /* ---------- shared <defs> (string; once per svg, ids prefixed) ---------- */
  function defs(p, design, pieces, small) {
    const sp = `${BASE}img/pieces-${pieces}.webp`;
    return `<defs>
<symbol id="${p}p0" viewBox="0 0 160 160"><image href="${sp}" width="320" height="160"/></symbol>
<symbol id="${p}p1" viewBox="0 0 160 160"><image href="${sp}" x="-160" width="320" height="160"/></symbol>
<radialGradient id="${p}sh"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".6" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}gl"><stop offset=".55" stop-color="${GREEN}" stop-opacity=".0"/><stop offset=".75" stop-color="${GREEN}" stop-opacity=".55"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}dg"><stop offset=".55" stop-color="#ff3b30" stop-opacity="0"/><stop offset=".78" stop-color="#ff3b30" stop-opacity=".6"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
<marker id="${p}ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${GREEN}" stroke="${GREEN_EDGE}" stroke-width="1.2"/></marker>
<marker id="${p}ap" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffe27a" stroke="#3a2a00" stroke-width="1"/></marker>
</defs>`;
  }
  const boardHref = (design, o, small) => `${BASE}img/board-${BOARDS.includes(design) ? design : 'museum'}-${o}${small ? '-s' : ''}.webp`;
  const piecesKey = k => PIECES.includes(k) ? k : 'orig';

  /* ---------- piece positions for a state ---------- */
  function layout(state, o) {
    const rule = state.rule || 'finkel', n = state.pos[0].length, goal = (window.UrEngine && UrEngine.RULES && UrEngine.RULES[rule] ? UrEngine.RULES[rule].goal : 15);
    const res = [];
    for (const side of [0, 1]) {
      const R = route(rule, side), ps = state.pos[side];
      const st = [], gl = [];
      ps.forEach((p, k) => (p <= 0 ? st : p >= goal ? gl : null)?.push(k));
      const S = traySlots(o, side, 'start', n), G = traySlots(o, side, 'goal', n);
      ps.forEach((p, k) => {
        if (p <= 0) { const j = st.indexOf(k); res.push({ side, k, pos: p, where: 'start', xy: S[j], d: TD }); }
        else if (p >= goal) { const j = gl.indexOf(k); res.push({ side, k, pos: p, where: 'goal', xy: G[j], d: TD }); }
        else { const [r, c] = R[p - 1]; res.push({ side, k, pos: p, where: 'board', r, c, xy: cellXY(o, r, c), d: PD }); }
      });
    }
    return { pieces: res, goal, rule };
  }

  /* ---------- marks (shared by mount and mini) → svg string ---------- */
  function marksSVG(p, o, state, opt, lay) {
    let s = '';
    const at = (v) => { v = rc(v); if (!v) return null; if (v.tray) { const S = traySlots(o, v.side || 0, v.tray, 7); const j = v.slot || 0; return S[j]; } return exists(v.r, v.c) ? cellXY(o, v.r, v.c) : null; };
    const pl = 84;
    // last move: the square left (dashed) and the square reached (solid amber frame)
    if (opt.last) {
      const f = at(opt.last.from), t = at(opt.last.to);
      if (f) s += `<rect x="${f[0] - pl / 2 + 3}" y="${f[1] - pl / 2 + 3}" width="${pl - 6}" height="${pl - 6}" rx="6" fill="rgba(255,214,90,.12)" stroke="#ffd65a" stroke-width="3" stroke-dasharray="9 7" opacity=".9"/>`;
      if (t) s += `<rect x="${t[0] - pl / 2 + 1}" y="${t[1] - pl / 2 + 1}" width="${pl - 2}" height="${pl - 2}" rx="6" fill="none" stroke="#1d1300" stroke-width="7" opacity=".55"/><rect x="${t[0] - pl / 2 + 1}" y="${t[1] - pl / 2 + 1}" width="${pl - 2}" height="${pl - 2}" rx="6" fill="none" stroke="#ffd65a" stroke-width="3.5"/>`;
    }
    for (const m of opt.marks || []) {
      const type = m.type || 'ring';
      if (type === 'path') {   // the route of one side, glowing arrows from → to (path indices)
        const R = route(state && state.rule || m.rule || 'finkel', m.side || 0), a = Math.max(1, m.from || 1), b = Math.min(R.length, m.to || R.length);
        const pts = []; for (let i = a; i <= b; i++) pts.push(cellXY(o, ...R[i - 1]));
        if (m.from === 0) pts.unshift(traySlots(o, m.side || 0, 'start')[0]);
        const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join('');
        s += `<path d="${d}" fill="none" stroke="#2a1b00" stroke-width="15" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><path d="${d}" fill="none" stroke="${m.color || '#ffe27a'}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#${p}ap)" stroke-dasharray="${m.dash || 'none'}"/>`;
        pts.forEach((q, i) => { if (i && i < pts.length - 1) s += `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="${m.color || '#ffe27a'}" stroke="#2a1b00" stroke-width="2"/>`; });
        continue;
      }
      if (type === 'arrow') {
        const f = at(m.from), t = at(m.to); if (!f || !t) continue;
        const dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy) || 1, sh = 30, x1 = f[0] + dx / L * sh * .6, y1 = f[1] + dy / L * sh * .6, x2 = t[0] - dx / L * sh, y2 = t[1] - dy / L * sh;
        const c = m.color || GREEN;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN_EDGE}" stroke-width="17" stroke-linecap="round" opacity=".7"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="9" stroke-linecap="round" marker-end="url(#${p}ah)"/>`;
        continue;
      }
      const q = at(m); if (!q) continue;
      if (type === 'danger') s += `<circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 12}" fill="url(#${p}dg)"/><circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 3}" fill="none" stroke="#ff3b30" stroke-width="4" stroke-dasharray="10 6"/>` +
        `<g transform="translate(${q[0] + 28} ${q[1] - 28})"><circle r="13" fill="#ff3b30" stroke="#3a0000" stroke-width="3"/><path d="M0 -7V2" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cy="7" r="2.4" fill="#fff"/></g>` + (m.text ? `<text x="${q[0]}" y="${q[1] + PD / 2 + 4}" text-anchor="middle" font-size="18" font-weight="700" fill="#fff" stroke="#3a0000" stroke-width="4" paint-order="stroke" font-family="system-ui,sans-serif">${m.text}</text>` : '');
      else if (type === 'safe') s += `<g transform="translate(${q[0] + 28} ${q[1] - 28})"><path d="M0 -14L12 -9V0C12 7 6 12 0 15C-6 12 -12 7 -12 0V-9Z" fill="#4da3ff" stroke="#00204a" stroke-width="3"/><path d="M-5 0L-1 4L6 -4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;
      else if (type === 'glow') s += `<rect x="${q[0] - 44}" y="${q[1] - 44}" width="88" height="88" rx="8" fill="${m.color || '#ffe27a'}" fill-opacity=".22" stroke="${m.color || '#ffe27a'}" stroke-width="4"/>`;
      else if (type === 'dot') s += `<circle cx="${q[0]}" cy="${q[1]}" r="${m.size || 14}" fill="${m.color || GREEN}" stroke="${GREEN_EDGE}" stroke-width="4"/>`;
      else if (type === 'text') s += `<text x="${q[0]}" y="${q[1] + 10}" text-anchor="middle" font-size="${m.size || 30}" font-weight="800" fill="${m.color || '#fff'}" stroke="#000" stroke-opacity=".75" stroke-width="6" paint-order="stroke" font-family="system-ui,sans-serif">${m.text}</text>`;
      else s += `<circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 4}" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="9"/><circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 4}" fill="none" stroke="${m.color || GREEN}" stroke-width="5"/>`;
      if (m.label != null && type !== 'text') s += `<text x="${q[0]}" y="${q[1] + 11}" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" font-family="system-ui,sans-serif">${m.label}</text>`;
    }
    // hint: a green arrow from → to
    if (opt.hint) {
      const f = at(opt.hint.from), t = at(opt.hint.to);
      if (f && t) { const dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy) || 1, x1 = f[0] + dx / L * 18, y1 = f[1] + dy / L * 18, x2 = t[0] - dx / L * 30, y2 = t[1] - dy / L * 30;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN_EDGE}" stroke-width="18" stroke-linecap="round" opacity=".8"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" marker-end="url(#${p}ah)"/>`; }
    }
    return s;
  }
  function targetsSVG(o, targets) {
    let s = '';
    for (let t of targets || []) {
      t = rc(t); let q;
      if (t.tray) q = traySlots(o, t.side || 0, t.tray, 7)[t.slot || 0];
      else if (exists(t.r, t.c)) q = cellXY(o, t.r, t.c); else continue;
      const cap = t.capture;
      s += `<g class="ur-tg" transform="translate(${q[0]} ${q[1]})" pointer-events="none">` +
        (cap ? `<circle r="${PD / 2 + 2}" fill="none" stroke="${GREEN_EDGE}" stroke-width="10" opacity=".8"/><circle r="${PD / 2 + 2}" fill="none" stroke="${GREEN}" stroke-width="5"/>`
          : `<circle r="19" fill="${GREEN}" stroke="${GREEN_EDGE}" stroke-width="5"/><circle r="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>`) + '</g>';
    }
    return s;
  }

  /* ---------- mount ---------- */
  function mount(host, opts = {}) {
    const p = 'ur' + (++uid) + '_';
    let o = opts.orient === 'v' ? 'v' : 'h', design = BOARDS.includes(opts.design) ? opts.design : 'museum', pcs = piecesKey(opts.pieces);
    const interactive = opts.interactive !== false;
    const H = {}; const on = (ev, fn) => { (H[ev] = H[ev] || []).push(fn); return view; }, emit = (ev, a) => (H[ev] || []).forEach(f => f(a));
    let svg, gImg, gHit, gTray, gUnder, gPieces, gOver, gTg, state = null, ropt = {}, pieceEls = new Map(), busy = 0;
    function build() {
      host.innerHTML = '';
      const V = VIEW[o];
      host.insertAdjacentHTML('beforeend', `<svg xmlns="${NS}" class="ur-board ur-${o}" viewBox="${V.join(' ')}" style="display:block;width:100%;height:100%;user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent">${defs(p, design, pcs)}<g class="ur-img"></g><g class="ur-tray"></g><g class="ur-under"></g><g class="ur-hit"></g><g class="ur-pieces"></g><g class="ur-tgs"></g><g class="ur-over" pointer-events="none"></g></svg>`);
      svg = host.lastChild; [gImg, gTray, gUnder, gHit, gPieces, gTg, gOver] = ['img', 'tray', 'under', 'hit', 'pieces', 'tgs', 'over'].map(k => svg.querySelector('.ur-' + k));
      const R = IMG[o]; el('image', { href: boardHref(design, o), x: R[0], y: R[1], width: R[2], height: R[3], preserveAspectRatio: 'none' }, gImg);
      // trays: a faint recess with an empty socket for each piece
      for (const side of [0, 1]) for (const kind of ['start', 'goal']) {
        const [x, y, w, h] = trayBox(o, side, kind), g = el('g', { class: `ur-trayb ur-${kind}`, 'data-side': side, 'data-kind': kind }, gTray);
        el('rect', { x, y, width: w, height: h, rx: h < w ? h / 2 : w / 2, fill: 'rgba(0,0,0,.16)', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.5 }, g);
        for (const [cx, cy] of traySlots(o, side, kind)) el('circle', { cx, cy, r: TD / 2 - 2, fill: 'rgba(0,0,0,.14)', stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1.5 }, g);
        if (kind === 'goal') { const s0 = traySlots(o, side, kind), [ex, ey] = s0[s0.length - 1]; }
        if (interactive) { g.style.cursor = 'pointer'; g.addEventListener('click', e => { e.stopPropagation(); emit('tray', { side, kind }); }); }
      }
      // hit areas for the squares
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (exists(r, c)) {
        const [x, y] = cellXY(o, r, c), h = el('rect', { x: x - 50, y: y - 50, width: 100, height: 100, fill: 'transparent', 'data-r': r, 'data-c': c, class: 'ur-cell' }, gHit);
        if (interactive) { h.style.cursor = 'pointer'; h.addEventListener('click', () => emit('cell', { r, c })); }
      }
      pieceEls = new Map(); if (state) render(state, ropt);
    }
    function pieceEl(side) {
      const g = el('g', { class: 'ur-pc ur-pc' + side });
      el('circle', { class: 'sh', r: PD * .56, cx: 3, cy: 6, fill: `url(#${p}sh)` }, g);
      el('circle', { class: 'sel', r: PD / 2 + 6, fill: 'none', stroke: '#ffd65a', 'stroke-width': 6, opacity: 0 }, g);
      el('use', { href: `#${p}p${side}`, x: -PD * .5556, y: -PD * .5556, width: PD * 1.111, height: PD * 1.111 }, g);
      if (interactive) g.style.cursor = 'pointer';
      return g;
    }
    function place(g, x, y, s, lift = 0) {
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * (1 + lift * .16)).toFixed(3)})`);
      const sh = g.firstChild; sh.setAttribute('cx', 3 + lift * 9); sh.setAttribute('cy', 6 + lift * 16); sh.setAttribute('opacity', 1 - lift * .35);
    }
    function render(st, opt = {}) {
      state = { rule: st.rule || 'finkel', pos: [st.pos[0].slice(), st.pos[1].slice()], turn: st.turn, winner: st.winner }; ropt = opt;
      if (busy) return;
      const L = layout(state, o), seen = new Set();
      const sel = opt.sel ? rc(opt.sel) : null;
      for (const q of L.pieces) {
        const key = q.side * 100 + q.k; seen.add(key);
        let g = pieceEls.get(key);
        if (!g) { g = pieceEl(q.side); gPieces.appendChild(g); pieceEls.set(key, g);
          if (interactive) g.addEventListener('click', e => { e.stopPropagation(); const d = g.__q; emit('piece', { side: d.side, piece: d.k, pos: d.pos, r: d.r, c: d.c, where: d.where });
            if (d.where === 'board') emit('cell', { r: d.r, c: d.c, piece: d.k, side: d.side }); else emit('tray', { side: d.side, kind: d.where, piece: d.k }); }); }
        g.__q = q; g.__xy = q.xy; g.__s = q.d / PD;
        const isSel = sel && ((sel.side != null && sel.piece != null && sel.side === q.side && sel.piece === q.k) || (sel.r != null && q.where === 'board' && sel.r === q.r && sel.c === q.c) || (sel.tray && sel.tray === q.where && sel.side === q.side && q === L.pieces.find(z => z.side === q.side && z.where === sel.tray)));
        place(g, q.xy[0], q.xy[1], q.d / PD, isSel ? .6 : 0);
        g.children[1].setAttribute('opacity', isSel ? 1 : 0);
      }
      for (const [k, g] of pieceEls) if (!seen.has(k)) { g.remove(); pieceEls.delete(k); }
      // board pieces above tray pieces, the selected one on top
      [...pieceEls.values()].sort((a, b) => (a.__q.where === 'board') - (b.__q.where === 'board') || (a.children[1].getAttribute('opacity') - b.children[1].getAttribute('opacity'))).forEach(g => gPieces.appendChild(g));
      gUnder.innerHTML = marksSVG(p, o, state, { last: opt.last }, L);
      gOver.innerHTML = marksSVG(p, o, state, { marks: opt.marks, hint: opt.hint }, L);
      gTg.innerHTML = targetsSVG(o, opt.targets);
      return view;
    }
    function findEl(side, pos) {
      // the element of `side` at path index pos (0: the one next to the entry)
      let best = null;
      for (const g of pieceEls.values()) { const q = g.__q; if (q.side !== side || q.pos !== pos) continue; if (!best || (pos <= 0 && q.xy && dist(q.xy, traySlots(o, side, 'start')[0]) < dist(best.__q.xy, traySlots(o, side, 'start')[0]))) best = g; }
      return best;
    }
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    async function animateMove(side, from, to, info = {}) {
      if (!state) return;
      const g = findEl(side, from); if (!g) { return; }
      busy++;
      const sp = info.speed || opts.speed || 1, rule = state.rule, R = route(rule, side), goal = layout(state, o).goal;
      // waypoints along the route
      const pts = [g.__xy.slice()];
      const a = Math.max(1, from + 1), b = Math.min(R.length, to);
      for (let i = a; i <= b; i++) pts.push(cellXY(o, ...R[i - 1]));
      // capture: the piece standing on the destination
      let victim = null;
      if (to >= 1 && to < goal) { const [r, c] = R[to - 1]; for (const v of pieceEls.values()) { const q = v.__q; if (q.side !== side && q.where === 'board' && q.r === r && q.c === c) victim = v; } }
      // the state after the move
      const k = g.__q.k; state.pos[side][k] = to;
      if (victim) state.pos[1 - side][victim.__q.k] = 0;
      const L = layout(state, o), dest = L.pieces.find(q => q.side === side && q.k === k);
      if (to >= goal) pts.push(dest.xy);
      const s0 = g.__s, s1 = dest.d / PD;
      gPieces.appendChild(g); g.children[1].setAttribute('opacity', 0);
      gTg.innerHTML = ''; gOver.innerHTML = '';
      // lift
      await tween(110 / sp, t => place(g, pts[0][0], pts[0][1], s0, easeOut(t)));
      // slide (constant speed along the polyline, eased overall)
      const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1], pts[i]); seg.push(d); tot += d; }
      const ms = (info.ms || (240 + 95 * Math.max(1, pts.length - 1))) / sp;
      let vDone = !victim;
      const flyVictim = () => { if (vDone) return; vDone = true; const vq = L.pieces.find(q => q.side === victim.__q.side && q.k === victim.__q.k), v0 = victim.__xy.slice(), v1 = vq.xy, vs = vq.d / PD;
        gPieces.appendChild(victim); gPieces.appendChild(g);
        return tween(520 / sp, t => { const e = ease(t), x = v0[0] + (v1[0] - v0[0]) * e, y = v0[1] + (v1[1] - v0[1]) * e - Math.sin(Math.PI * t) * 90; place(victim, x, y, 1 + (vs - 1) * e, Math.sin(Math.PI * t)); victim.setAttribute('transform', victim.getAttribute('transform') + ` rotate(${(t * 360 * (side ? -1 : 1)).toFixed(0)})`); }); };
      let vp = null;
      await tween(ms, t => {
        const e = ease(t); let d = e * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const f = seg[i] ? d / seg[i] : 1, A = pts[i], B = pts[i + 1] || A;
        place(g, A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, s0 + (s1 - s0) * e, 1);
        if (victim && !vp && t > .8) vp = flyVictim();
      });
      if (victim && !vp) vp = flyVictim();
      // put down
      const end = pts[pts.length - 1];
      await tween(130 / sp, t => place(g, end[0], end[1], s1, 1 - easeOut(t)));
      if (vp) await vp;
      busy--;
      render(state, Object.assign({}, ropt, { targets: [], sel: null, hint: null }));
    }
    const view = {
      el: null, render, on, animateMove,
      cellRect(r, c) { const h = gHit.querySelector(`[data-r="${r}"][data-c="${c}"]`); return h ? h.getBoundingClientRect() : null; },
      offRect(side, kind = 'start') { const g = gTray.querySelector(`[data-side="${side}"][data-kind="${kind}"]`); return g ? g.getBoundingClientRect() : null; },
      cellXY: (r, c) => cellXY(o, r, c),            // in SVG user units
      toClient(x, y) { const m = svg.getScreenCTM(), pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(m); return { x: q.x, y: q.y }; },
      setDesign(d, pc) { if (d && BOARDS.includes(d)) design = d; if (pc) pcs = piecesKey(pc); build(); return view; },
      setOrient(v) { v = v === 'v' ? 'v' : 'h'; if (v !== o) { o = v; build(); } return view; },
      orient: () => o, design: () => ({ board: design, pieces: pcs }), svg: () => svg,
      destroy() { host.innerHTML = ''; },
    };
    build(); view.el = svg;
    return view;
  }

  /* ---------- static mini board (string) ---------- */
  function mini(state, opt = {}) {
    const p = 'urm' + (++uid) + '_', o = opt.orient === 'v' ? 'v' : 'h', design = BOARDS.includes(opt.design) ? opt.design : 'museum', pcs = piecesKey(opt.pieces);
    let V = VIEW[o].slice();
    const cr = opt.crop;
    if (Array.isArray(cr) && cr.length === 4) V = cr;                       // [x, y, w, h] in user units
    else if (cr && cr.c0 != null) {                                          // { r0, c0, r1, c1, pad } in squares (board coords)
      const a = cellXY(o, cr.r0 ?? 0, cr.c0), b = cellXY(o, cr.r1 ?? 2, cr.c1 ?? 7), pad = cr.pad ?? 56;
      V = [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.abs(b[0] - a[0]) + 2 * pad, Math.abs(b[1] - a[1]) + 2 * pad];
    } else if (cr === 'board') V = IMG[o].slice();
    const R = IMG[o], small = opt.small !== false;
    let s = `<svg xmlns="${NS}" class="ur-mini" viewBox="${V.join(' ')}"${opt.width ? ` width="${opt.width}"` : ''}${opt.height ? ` height="${opt.height}"` : ''} style="display:block${opt.width ? '' : ';width:100%;height:auto'}">${defs(p, design, pcs)}`;
    s += `<image href="${boardHref(design, o, small)}" x="${R[0]}" y="${R[1]}" width="${R[2]}" height="${R[3]}" preserveAspectRatio="none"/>`;
    if (opt.trays !== false) for (const side of [0, 1]) for (const kind of ['start', 'goal']) {
      const [x, y, w, h] = trayBox(o, side, kind); s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="rgba(0,0,0,.16)" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>`;
      for (const [cx, cy] of traySlots(o, side, kind)) s += `<circle cx="${cx}" cy="${cy}" r="${TD / 2 - 2}" fill="rgba(0,0,0,.14)"/>`;
    }
    s += marksSVG(p, o, state, { last: opt.last }, null);
    if (state && state.pos) {
      const L = layout(state, o), sel = opt.sel ? rc(opt.sel) : null;
      for (const q of L.pieces) {
        if (opt.trays === false && q.where !== 'board') continue;
        const d = q.d * 1.111, isSel = sel && q.where === 'board' && sel.r === q.r && sel.c === q.c;
        s += `<circle cx="${q.xy[0] + 3}" cy="${q.xy[1] + 6}" r="${q.d * .56}" fill="url(#${p}sh)"/>`;
        if (isSel) s += `<circle cx="${q.xy[0]}" cy="${q.xy[1]}" r="${q.d / 2 + 6}" fill="none" stroke="#ffd65a" stroke-width="6"/>`;
        s += `<use href="#${p}p${q.side}" x="${q.xy[0] - d / 2}" y="${q.xy[1] - d / 2}" width="${d}" height="${d}"/>`;
      }
    }
    s += targetsSVG(o, opt.targets) + marksSVG(p, o, state, { marks: opt.marks, hint: opt.hint }, null);
    return s + '</svg>';
  }

  /* ---------- dice: four tetrahedra seen from above ---------- */
  const DSTYLE = {   // faces [lit, mid, dark], edge, tip mark [ring, centre]
    orig:  { f: ['#8d8378', '#6c635a', '#4a433d'], e: '#2b2622', m: ['#f4ead4', '#1f3a9a'], base: '#5a524a' },
    ivory: { f: ['#f6efdf', '#ddd2bb', '#b7aa90'], e: '#6b5d44', m: ['#1d1713', '#f6efdf'], base: '#cfc3a9' },
    wood:  { f: ['#e9c99a', '#c99d68', '#9a6f42'], e: '#5a3a1c', m: ['#4a2a12', '#f2dfbe'], base: '#b88a58' },
    gold:  { f: ['#ffe39a', '#e0ae48', '#a87a22'], e: '#5a3d06', m: ['#1f3a9a', '#fff3cf'], base: '#c79738' },
  };
  function dice(host, opts = {}) {
    const p = 'urd' + (++uid) + '_';
    let st = DSTYLE[opts.style] || DSTYLE[{ museum: 'orig', restored: 'orig', clay: 'wood' }[opts.style]] || DSTYLE.orig;
    const n = opts.count || 4, W = n * 110 + 10;
    host.innerHTML = `<svg xmlns="${NS}" class="ur-dice" viewBox="0 0 ${W} 120" style="display:block;width:100%;height:100%;overflow:visible">
<defs><radialGradient id="${p}s"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}gw"><stop offset=".3" stop-color="#fff6c8" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs></svg>`;
    const svg = host.firstChild, D = [];
    const RT = 46;   // circumradius of the base triangle
    for (let i = 0; i < n; i++) {
      const g = el('g', {}, svg);
      const sh = el('ellipse', { rx: RT * .95, ry: RT * .8, cx: 5, cy: 10, fill: `url(#${p}s)` }, g);
      const body = el('g', {}, g);
      const faces = [0, 1, 2].map(() => el('path', { stroke: st.e, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, body));
      const tips = [0, 1, 2].map(() => el('circle', { r: 6.5, 'stroke-width': 1.5 }, body));
      const glow = el('circle', { r: 20, fill: `url(#${p}gw)` }, body);
      const top = el('g', {}, body); el('circle', { r: 11, stroke: '#000', 'stroke-opacity': .5, 'stroke-width': 2 }, top); el('circle', { r: 4.6 }, top);
      const apex = el('circle', { r: 3, fill: st.e }, body);
      D.push({ g, sh, body, faces, tips, glow, top, apex, up: 0, rot: (i * 47 + 13) % 120, x: 60 + i * 110, y: 60 });
    }
    function draw(d, up, rot, dx = 0, dy = 0, sc = 1, light = 0) {
      d.g.setAttribute('transform', `translate(${(d.x + dx).toFixed(1)} ${(d.y + dy).toFixed(1)})`);
      d.body.setAttribute('transform', `scale(${sc.toFixed(3)})`);
      const V = [0, 1, 2].map(k => { const a = (rot + k * 120 - 90) * Math.PI / 180; return [Math.cos(a) * RT, Math.sin(a) * RT]; });
      const ap = [0, 0];
      for (let k = 0; k < 3; k++) {
        const A = V[k], B = V[(k + 1) % 3];
        d.faces[k].setAttribute('d', `M${ap[0]} ${ap[1]}L${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}Z`);
        // light from the top left: the face whose outward direction points up-left is brightest
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, lit = (-mx * .6 - my * .8) / (RT * .5);
        const idx = lit > .45 ? 0 : lit > -.45 ? 1 : 2;
        d.faces[k].setAttribute('fill', st.f[(idx + light) % 3]);
      }
      // the base corners: with the marked tip on top one corner is marked, else two
      const marked = up ? [0] : [0, 1];
      for (let k = 0; k < 3; k++) {
        const t = d.tips[k], m = marked.includes(k); const q = V[k];
        t.setAttribute('cx', (q[0] * .86).toFixed(1)); t.setAttribute('cy', (q[1] * .86).toFixed(1));
        t.setAttribute('fill', m ? st.m[0] : 'none'); t.setAttribute('stroke', m ? st.e : 'none');
      }
      d.top.style.display = up ? '' : 'none'; d.glow.style.display = up ? '' : 'none'; d.apex.style.display = up ? 'none' : '';
      d.top.children[0].setAttribute('fill', st.m[0]); d.top.children[1].setAttribute('fill', st.m[1]);
      d.sh.setAttribute('cx', 5 + dy * -.1); d.sh.setAttribute('cy', 10 - dy * .2);
    }
    let cur = new Array(n).fill(0);
    function show(dv) { cur = (dv || cur).slice(0, n); D.forEach((d, i) => { d.up = cur[i] ? 1 : 0; draw(d, d.up, d.rot); }); }
    async function roll(dv, o2 = {}) {
      dv = dv || D.map(() => Math.random() < .5 ? 1 : 0);
      const ms = (o2.ms || 900) / (o2.speed || opts.speed || 1), seeds = D.map(() => [Math.random(), Math.random(), Math.random()]);
      let lastFlip = D.map(() => 0);
      await tween(ms, t => {
        D.forEach((d, i) => {
          const [a, b, c] = seeds[i], k = Math.pow(1 - t, 1.6), ph = t * (9 + a * 5);
          const dx = Math.sin(ph * 2.3 + a * 9) * 22 * k, dy = -Math.abs(Math.sin(ph * 1.7 + b * 7)) * 36 * k;
          if (t < .82 && t - lastFlip[i] > .06 + c * .05) { lastFlip[i] = t; d.up = Math.random() < .5 ? 1 : 0; }
          if (t >= .82) d.up = dv[i] ? 1 : 0;
          d.rot = (d.rot + 31 * k * (b + .4)) % 360;
          draw(d, d.up, d.rot, dx, dy, 1 + .14 * Math.abs(Math.sin(ph * 1.7 + b * 7)) * k, (t < .82 ? Math.floor(ph) % 3 : 0));
        });
      });
      // settle: a little bounce
      await tween(160 / (o2.speed || opts.speed || 1), t => D.forEach((d, i) => draw(d, dv[i] ? 1 : 0, d.rot, 0, 0, 1 + Math.sin(Math.PI * t) * .05)));
      show(dv); return dv.reduce((a, b) => a + b, 0);
    }
    show(cur);
    return { roll, show, el: svg, setStyle(s) { st = DSTYLE[s] || DSTYLE.orig; show(cur); } };
  }

  window.UrBoard2D = { mount, mini, dice, BOARDS, PIECES, GREEN, cellXY, route, traySlots, VIEW, IMG };
})();
/* README
mount(el, { orient:'h'|'v', design, pieces, interactive=true, speed=1 }) → view
view.render(state, { sel, targets, last, hint, marks })
  sel      {r,c} | {side,piece} | {tray:'start',side}     selected piece (gold ring, lifted)
  targets  [{r,c, capture?} | {tray:'goal', side}]        candidate squares (#3df59a dot; ring if capture)
  last     {from:{r,c}|[r,c]|null, to:{r,c}|[r,c]}        last move (dashed / solid amber frame)
  hint     {from, to}                                     green arrow (from may be {tray:'start',side})
  marks    [{r,c,type:'danger'|'safe'|'ring'|'glow'|'dot'|'text', color, label, text}]
           {type:'path', side, from, to}  the route (path indices) as glowing arrows
           {type:'arrow', from, to, color}
view.cellRect(r,c) → DOMRect; view.offRect(side,'start'|'goal') → DOMRect
view.setDesign(design, pieces); view.setOrient('h'|'v')
view.on('cell', ({r,c,piece?,side?}) => …); view.on('piece', ({side,piece,pos,r,c,where}) => …); view.on('tray', ({side,kind,piece?}) => …)
view.animateMove(side, from, to, { capture, speed, ms }) → Promise   (path indices; then call render(newState))
UrBoard2D.dice(el, { style, speed, count=4 }) → { roll(dice?) → Promise<n>, show(dice), setStyle(s) }
UrBoard2D.mini(state, { design, pieces, orient, marks, targets, last, hint, sel, crop, trays, width, height, small }) → SVG string
  crop: [x,y,w,h] user units | {r0,c0,r1,c1,pad} squares | 'board'
*/
