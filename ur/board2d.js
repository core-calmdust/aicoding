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
  IMG.hr = IMG.h; IMG.vr = IMG.v; VIEW.hr = VIEW.h; VIEW.vr = VIEW.v;
  // 'vn' / 'vrn' (phones held upright): no trays beside the board — the pieces off the board wait in the notch (the open
  // floor left / right of the bridge, columns 4–5) as two small stacks with a count: start (next to the entry), goal (next to the exit).
  // The view is the board alone (its centre is (0, 14), not (0, 4) as 'h' / 'v')
  IMG.vn = IMG.vrn = IMG.v; VIEW.vn = VIEW.vrn = [-186, -434, 372, 896];   // (the picture's visible board: x −176 … 182, y −426 … 456)
  // 'hn' / 'hrn' (phones held sideways, or a short phone): the same, the board lying across (the 'vn' picture turned: x ↔ y)
  IMG.hn = IMG.hrn = IMG.h; VIEW.hn = VIEW.hrn = [-434, -186, 896, 372];
  // 'vf…' (phones held upright, 2026-11-05): the board turned half round — the big block at the bottom, your lane (Light, row 2) on the
  // right: the picture board-*-vf (turned 180°) with rows 0 / 2 swapped in the cells (the outer rows carry the same motifs), i.e. a cell
  // (r, c) at ((r−1)·100, (3.5−c)·100). Keys: 'vf', 'vrf', 'vfn', 'vrfn'
  // On 'v…n' (2026-11-05) the pieces off the board are not in the notch but in two framed columns beside the board, one per player
  // (Dark left, Light right on 'vfn'): 手持ち (waiting, next to the entry) and ゴール (home, next to the exit), one piece under the other
  VIEW.vn = VIEW.vrn = [-290, -434, 580, 896];
  for (const k of ['vf', 'vrf']) { IMG[k] = IMG[k + 'n'] = IMG.v; VIEW[k] = VIEW.v; VIEW[k + 'n'] = VIEW.vn; }
  const PD = 76, TD = 54, ND = 58;   // piece diameter on the board / in the trays / in the notch stacks (user units)
  const exists = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 8 && (r === 1 || c < 4 || c > 5);
  const ROSETTES = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
  const isRos = (r, c) => ROSETTES.some(([a, b]) => a === r && b === c);
  let uid = 0;

  /* ---------- geometry ---------- */
  // o: 'h' | 'v', or 'hr' | 'vr' = rows 0 and 2 swapped (Dark's lane nearest you: below on 'h', right on 'v'). The two outer
  // rows carry the same motifs, so the board picture stays as it is (its light keeps coming from the top left)
  const RT = o => o.indexOf('r') > 0, OB = o => o[0], NT = o => o.indexOf('n') > 0, FL = o => o[0] === 'v' && o.indexOf('f') > 0;
  const SD = o => NT(o) && o[0] === 'v';   // the side columns (see VIEW.vn)
  const SX = 240, SW = 88, SLD = 56, SP = 52;   // column centre, width, piece diameter, pitch (user units)
  // a column box [x, y, w, h]: 'vfn' start y 16 … 432 (below the notch, by the entry square), goal y −432 … −16 (by the exit); 'vn' mirrored
  const sideBox = (o, side, kind) => { const sx = nside(o, side), up = (kind === 'goal') === FL(o); return [sx * SX - SW / 2, up ? -432 : 16, SW, 416]; };
  // the notch stacks (side 0 on the right of 'vn'): centre of the stack, and the shift of each piece above the one below
  const NX = 126, NY = { start: 84, goal: 150 };
  const nside = (o, side) => (RT(o) ? !side : side) ? -1 : 1;
  const cellXY = (o, r, c) => { if (RT(o)) r = 2 - r; return OB(o) === 'v' ? [(r - 1) * 100, (FL(o) ? 3.5 - c : c - 3.5) * 100] : [(c - 3.5) * 100, (r - 1) * 100]; };
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
    if (SD(o)) { const b = sideBox(o, side, kind), cx = b[0] + SW / 2; for (let i = 0; i < n; i++) out.push([cx, b[1] + 76 + i * SP]); return out; }   // (under the column's label)
    if (NT(o)) { const sx = nside(o, side), V = OB(o) === 'v', fy = FL(o) ? -1 : 1; for (let i = 0; i < n; i++) out.push(V ? [sx * (NX + i * 1.4), fy * NY[kind] - i * 3.4] : [NY[kind] + i * 1.4, sx * NX - i * 3.4]); return out; }
    for (let i = 0; i < n; i++) {
      // start: slot 0 is next to the entry square (col 3); goal: slot 0 next to the exit (col 6)
      const a = kind === 'start' ? -32 - i * 58 : 118 + i * 50;
      const b = (RT(o) ? !side : side) ? (OB(o) === 'v' ? -238 : -232) : (OB(o) === 'v' ? 238 : 244);
      out.push(OB(o) === 'v' ? [b, FL(o) ? -a : a] : [a, b]);
    }
    return out;
  }
  function trayBox(o, side, kind) {
    if (SD(o)) return sideBox(o, side, kind);
    if (NT(o)) { const sx = nside(o, side), x0 = sx > 0 ? 70 : -206, b = kind === 'start' ? [x0, 30, 136, 87] : [x0, 117, 136, 70]; if (FL(o)) b[1] = -b[1] - b[3]; return OB(o) === 'v' ? b : [b[1], b[0], b[3], b[2]]; }
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
  const boardHref = (design, o, small) => `${BASE}img/board-${BOARDS.includes(design) ? design : 'museum'}-${OB(o)}${FL(o) ? 'f' : ''}${small ? '-s' : ''}.webp`;
  const imgAttr = (o, R) => ({ x: R[0], y: R[1], width: R[2], height: R[3] });
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
        if (p <= 0) { const j = st.indexOf(k); res.push({ side, k, pos: p, where: 'start', xy: S[j], d: SD(o) ? SLD : NT(o) ? ND : TD }); }
        else if (p >= goal) { const j = gl.indexOf(k); res.push({ side, k, pos: p, where: 'goal', xy: G[j], d: SD(o) ? SLD : NT(o) ? ND : TD }); }
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
  // the notch stacks: how many pieces each holds (a small dark disc with the number, at the stack's lower outer side)
  function countsSVG(o, L, lab) {
    if (!NT(o)) return '';
    let s = '';
    if (SD(o)) {   // the side columns: a frame and its label with the count (手持ち 5 / ゴール 2)
      for (const side of [0, 1]) for (const kind of ['start', 'goal']) {
        const n = L.pieces.filter(q => q.side === side && q.where === kind).length, [x, y, w, h] = sideBox(o, side, kind), cx = x + w / 2;
        const t = (lab && lab(kind)) || (kind === 'goal' ? 'Home' : 'Start');
        // colours: 手持ち = gold on bitumen, ゴール = lapis lazuli (lightened for the night-blue page); a small label plate on top
        const G = kind === 'goal', fc = G ? '#6f8ff0' : '#d9b45a';
        s += `<rect class="ur-sb ur-sb-${kind}" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="none" stroke="${fc}" stroke-opacity=".7" stroke-width="2.5"/>` +
          `<rect class="ur-slb ur-slb-${kind}" x="${x + 7}" y="${y + 5}" width="${w - 14}" height="45" rx="11" fill="${G ? 'rgba(36,64,154,.42)' : 'rgba(60,40,12,.45)'}" stroke="${fc}" stroke-opacity=".6" stroke-width="1.5"/>` +
          `<text class="ur-sl ur-sl-${kind}" x="${cx}" y="${y + 22}" text-anchor="middle" font-size="16.5" font-weight="700" fill="${G ? '#c4d2ff' : '#f1d58c'}" font-family="'Zen Kaku Gothic New',system-ui,sans-serif">${t}</text>` +
          `<text class="ur-sn ur-sn-${kind}" x="${cx}" y="${y + 42}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff3cf" font-family="system-ui,sans-serif">${n}</text>`;
      }
      return s;
    }
    for (const side of [0, 1]) for (const kind of ['start', 'goal']) {
      const n = L.pieces.filter(q => q.side === side && q.where === kind).length; if (!n) continue;
      const sx = nside(o, side), a = sx * (NX + 40), b2 = (FL(o) ? -NY[kind] : NY[kind]) + 22, x = OB(o) === 'v' ? a : b2, y = OB(o) === 'v' ? b2 : a;
      s += `<g transform="translate(${x} ${y})"><circle r="17" fill="rgba(8,12,34,.86)" stroke="${kind === 'goal' ? '#6f8ff0' : '#d9b45a'}" stroke-width="2.5"/><text y="7.5" text-anchor="middle" font-size="21" font-weight="800" fill="#fff3cf" font-family="system-ui,sans-serif">${n}</text></g>`;
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
    let notch = !!opts.notch, flip = !!opts.flip;
    const okey = (b, r) => b + (r ? 'r' : '') + (b === 'v' && flip ? 'f' : '') + (notch ? 'n' : '');
    let o = okey(opts.orient === 'v' ? 'v' : 'h', opts.rot), design = BOARDS.includes(opts.design) ? opts.design : 'museum', pcs = piecesKey(opts.pieces);
    const interactive = opts.interactive !== false;
    const H = {}; const on = (ev, fn) => { (H[ev] = H[ev] || []).push(fn); return view; }, emit = (ev, a) => (H[ev] || []).forEach(f => f(a));
    let svg, gImg, gHit, gTray, gUnder, gPieces, gOver, gTg, state = null, ropt = {}, pieceEls = new Map(), busy = 0;
    function build() {
      host.innerHTML = '';
      const V = VIEW[o];
      host.insertAdjacentHTML('beforeend', `<svg xmlns="${NS}" class="ur-board ur-${o}" viewBox="${V.join(' ')}" style="display:block;width:100%;height:100%;user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent">${defs(p, design, pcs)}<g class="ur-img"></g><g class="ur-tray"></g><g class="ur-under"></g><g class="ur-hit"></g><g class="ur-pieces"></g><g class="ur-tgs"></g><g class="ur-over" pointer-events="none"></g></svg>`);
      svg = host.lastChild; [gImg, gTray, gUnder, gHit, gPieces, gTg, gOver] = ['img', 'tray', 'under', 'hit', 'pieces', 'tgs', 'over'].map(k => svg.querySelector('.ur-' + k));
      const R = IMG[o]; el('image', Object.assign({ href: boardHref(design, o), preserveAspectRatio: 'none' }, imgAttr(o, R)), gImg);
      // trays: a faint recess with an empty socket for each piece
      for (const side of [0, 1]) for (const kind of ['start', 'goal']) {
        const [x, y, w, h] = trayBox(o, side, kind), g = el('g', { class: `ur-trayb ur-${kind}`, 'data-side': side, 'data-kind': kind }, gTray);
        if (SD(o)) {   // a side column: a dark recess with an empty socket for each piece (the frame and the label: countsSVG)
          el('rect', { x, y, width: w, height: h, rx: 16, fill: 'rgba(0,0,0,.2)' }, g);
          for (const [cx, cy] of traySlots(o, side, kind)) el('circle', { cx, cy, r: SLD / 2 - 1, fill: 'rgba(0,0,0,.16)', stroke: 'rgba(255,255,255,.08)', 'stroke-width': 1.5 }, g);
        } else if (NT(o)) {   // the notch: an invisible tap area with one socket where the stack stands
          el('rect', { x, y, width: w, height: h, fill: 'transparent' }, g);
          const [cx, cy] = traySlots(o, side, kind, 1)[0]; el('circle', { cx, cy, r: ND / 2 + 1, fill: 'rgba(0,0,0,.22)', stroke: kind === 'goal' ? 'rgba(127,214,164,.28)' : 'rgba(217,180,90,.28)', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, g);
        } else {
          el('rect', { x, y, width: w, height: h, rx: h < w ? h / 2 : w / 2, fill: 'rgba(0,0,0,.16)', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.5 }, g);
          for (const [cx, cy] of traySlots(o, side, kind)) el('circle', { cx, cy, r: TD / 2 - 2, fill: 'rgba(0,0,0,.14)', stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1.5 }, g);
        }
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
      gOver.innerHTML = countsSVG(o, L, opts.trayLabel) + marksSVG(p, o, state, { marks: opt.marks, hint: opt.hint }, L);
      gTg.innerHTML = targetsSVG(o, opt.targets);
      return view;
    }
    function findEl(side, pos) {
      // the element of `side` at path index pos (0: the one next to the entry)
      let best = null;
      // (the notch stack: the top piece, the highest one; a side column: the last one, so the others stay where they are)
      for (const g of pieceEls.values()) { const q = g.__q; if (q.side !== side || q.pos !== pos) continue;
        if (!best || (pos <= 0 && q.xy && (SD(o) ? q.xy[1] > best.__q.xy[1] : NT(o) ? q.xy[1] < best.__q.xy[1] : dist(q.xy, traySlots(o, side, 'start')[0]) < dist(best.__q.xy, traySlots(o, side, 'start')[0])))) best = g; }
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
      gTg.innerHTML = ''; gOver.innerHTML = countsSVG(o, L, opts.trayLabel);
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
      setOrient(v, rot, nt) { if (nt !== undefined) notch = !!nt; v = okey(v === 'v' ? 'v' : 'h', rot === undefined ? RT(o) : rot); if (v !== o) { o = v; build(); } return view; },
      orient: () => OB(o), rotated: () => RT(o), key: () => o, notch: () => NT(o), design: () => ({ board: design, pieces: pcs }), svg: () => svg,
      destroy() { host.innerHTML = ''; },
    };
    build(); view.el = svg;
    return view;
  }

  /* ---------- static mini board (string) ---------- */
  function mini(state, opt = {}) {
    const p = 'urm' + (++uid) + '_', o = (opt.orient === 'v' ? 'v' : 'h') + (opt.rot ? 'r' : '') + (opt.orient === 'v' && opt.flip ? 'f' : ''), design = BOARDS.includes(opt.design) ? opt.design : 'museum', pcs = piecesKey(opt.pieces);
    let V = VIEW[o].slice();
    const cr = opt.crop;
    if (Array.isArray(cr) && cr.length === 4) V = cr;                       // [x, y, w, h] in user units
    else if (cr && cr.c0 != null) {                                          // { r0, c0, r1, c1, pad } in squares (board coords)
      const a = cellXY(o, cr.r0 ?? 0, cr.c0), b = cellXY(o, cr.r1 ?? 2, cr.c1 ?? 7), pad = cr.pad ?? 56;
      V = [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.abs(b[0] - a[0]) + 2 * pad, Math.abs(b[1] - a[1]) + 2 * pad];
    } else if (cr === 'board') V = IMG[o].slice();
    const R = IMG[o], small = opt.small !== false;
    let s = `<svg xmlns="${NS}" class="ur-mini" viewBox="${V.join(' ')}"${opt.width ? ` width="${opt.width}"` : ''}${opt.height ? ` height="${opt.height}"` : ''} style="display:block${opt.width ? '' : ';width:100%;height:auto'}">${defs(p, design, pcs)}`;
    { const A = imgAttr(o, R); s += `<image href="${boardHref(design, o, small)}" x="${A.x}" y="${A.y}" width="${A.width}" height="${A.height}"${A.transform ? ` transform="${A.transform}"` : ''} preserveAspectRatio="none"/>`; }
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

  /* ---------- dice: four tetrahedra (bone / shell colour, as in 3D) ----------
     When three.js can be had (loaded in the background after the page, never in the 3D skin) the dice are the 3D
     dice of atlas/models/ur-dice.js, thrown on a small transparent WebGL canvas over the dice place (rendered only
     while they move). Otherwise (no WebGL, offline, not loaded yet) the flat SVG dice below. */
  const BONE = { f: ['#efe5cd', '#d8c9a8', '#b3a27f'], e: '#6e5d40', m: ['#1c3196', '#9fbaff'], base: '#cdbd9b' };   // marks: deep lapis (as the 3D dice) with a thin shell rim and a faint glint; no glow
  const DSTYLE = { orig: BONE, ivory: BONE, wood: BONE, gold: BONE };
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let threeP = null;
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  function want3D(inSkin) {
    if (!inSkin && document.documentElement.classList.contains('atlas-skin')) return false;   // the 3D skin throws its own dice (but not off the board: inSkin)
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  function load3D() {
    if (threeP) return threeP;
    threeP = new Promise(res => {
      const go = () => {
        const t = window.THREE ? Promise.resolve() : /[?&]three=128\b/.test(location.search) ? loadScript(THREE_URL) : loadScript(new URL('../atlas/vendor/three-r186.min.js?v=1', location.href).href).then(() => loadScript(new URL('../atlas/vendor/three-compat.js?v=15', location.href).href));   // (r186 by default, 2026-11-13)
        t.then(() => window.UrDice3D ? null : loadScript(BASE + '../atlas/models/ur-dice.js?v=2')).then(() => res(!!(window.THREE && window.UrDice3D && THREE.WebGLRenderer))).catch(() => res(false));
      };
      const idle = () => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200));
      if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
    });
    return threeP;
  }
  const LIVE3D = [];   // WebGL contexts are scarce: drop the ones whose dice left the page
  function reap() { for (let i = LIVE3D.length - 1; i >= 0; i--) if (!LIVE3D[i].wrap.isConnected) { try { LIVE3D[i].dispose(); } catch (e) {} LIVE3D.splice(i, 1); } }

  function make3D(wrap, n, span, shift) {
    const TT = window.THREE, UD = window.UrDice3D, DS = .86, REST = UD.DR / 3 * DS;
    reap();
    const R = new TT.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    R.setClearColor(0, 0); R.outputEncoding = TT.sRGBEncoding; R.shadowMap.enabled = true; R.shadowMap.type = TT.PCFSoftShadowMap;
    const cv = R.domElement; cv.className = 'ur-dice3d';
    cv.style.cssText = 'position:absolute;pointer-events:none;z-index:2;display:block';
    wrap.appendChild(cv);
    const sc = new TT.Scene(), cam = new TT.PerspectiveCamera(26, 1, .1, 60);
    sc.add(new TT.HemisphereLight(0xfff7ea, 0x5a4c3c, .78));
    const key = new TT.DirectionalLight(0xffffff, .95); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0006; key.shadow.normalBias = .01; key.shadow.radius = 3; sc.add(key); sc.add(key.target);
    const fill = new TT.DirectionalLight(0xfff0d8, .22); sc.add(fill);
    const ground = new TT.Mesh(new TT.PlaneGeometry(1, 1), new TT.ShadowMaterial({ opacity: .42 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    // (formerly a glow over each marked tip that points up; now the dice simply show their lapis marks — the sprite stays hidden)
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g = gc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(90,140,255,0)'); gr.addColorStop(.22, 'rgba(90,140,255,.15)'); gr.addColorStop(.42, 'rgba(110,160,255,.75)'); gr.addColorStop(.62, 'rgba(90,140,255,.32)'); gr.addColorStop(1, 'rgba(70,120,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    const gtex = new TT.CanvasTexture(gc);
    const D = [];
    for (let i = 0; i < n; i++) {
      const g = new TT.Group(), d = UD.die(); d.scale.setScalar(DS); g.add(d); sc.add(g);
      const halo = new TT.Sprite(new TT.SpriteMaterial({ map: gtex, color: 0xffffff, transparent: true, opacity: 0, depthTest: false, blending: TT.AdditiveBlending })); halo.scale.set(.42, .42, 1); halo.renderOrder = 5; halo.visible = false;   // (no glow any more: the lapis marks themselves are read — 2026-11-05)
      D.push({ g, d, halo, x: 0, z: 0 });
    }
    // world units = board squares (the dice place is `span` squares long); x right, z down the screen; the line of
    // dice runs along the long side of the place (h: across, v: down). The canvas reaches beyond the place: the
    // dice are thrown in from over the board.
    let W = 0, H = 0, raf = 0, tall = false, Lx = span, Lz = .9;
    const M = 2.1;
    function fit() {
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (!w || !h) return false;
      tall = h > w * 1.2;
      const k = (tall ? h : w) / span; Lx = w / k; Lz = h / k;
      const Wc = Lx + 2 * M, Hc = Lz + 2 * M, pw = Math.round(Wc * k), ph = Math.round(Hc * k);
      if (pw !== W || ph !== H) {
        W = pw; H = ph;
        const pr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
        R.setPixelRatio(pr); R.setSize(W, H, false);
        Object.assign(cv.style, { width: W + 'px', height: H + 'px', left: (-M * k) + 'px', top: (-M * k) + 'px' });
        ground.scale.set(Wc + 2, Hc + 2, 1);
        // seen from nearly straight above (a little from the front), lit from the top left like the board picture
        const fov = 40, dist = (Hc / 2) / Math.tan(fov / 2 * Math.PI / 180), tilt = .12;   // a fairly wide lens: a die in the air grows, its shadow slides off
        cam.fov = fov; cam.aspect = Wc / Hc; cam.position.set(0, dist, dist * tilt); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
        cam.near = dist * .5; cam.far = dist * 1.6; cam.updateProjectionMatrix();
        key.position.set(-2.4, 8.4, -2.6); key.target.position.set(0, 0, 0);
        const sh = key.shadow.camera, e = Math.max(Wc, Hc) / 2 + .5; Object.assign(sh, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 20 }); sh.updateProjectionMatrix();
        fill.position.set(3, 4, 2);
      }
      return true;
    }
    const render = () => { if (fit()) R.render(sc, cam); };
    const places = () => { const L = tall ? Lz : Lx, Wd = tall ? Lx : Lz, sp = Math.min(.5, (L - .42) / n);   // (the outer dice stay inside the notch, clear of its frame)
      return D.map((_, i) => { const a = (i - (n - 1) / 2) * sp + (Math.random() - .5) * .07, b = (tall ? 0 : .05 + (shift || 0)) + (Math.random() - .5) * Math.min(shift ? .06 : .12, Wd * .2); return tall ? [b, a] : [a, b]; }); };
    function haloAt(o, on) {
      const v = new TT.Vector3(), w = new TT.Vector3();
      for (const t of [0, 1]) { const q = new TT.Vector3(...UD.TV[t]).multiplyScalar(DS).applyQuaternion(o.d.quaternion); if (!t || q.y > v.y) v.copy(q); }
      w.copy(v).add(o.g.position); o.halo.position.copy(w).add(new TT.Vector3(0, .02, 0)); o.halo.material.opacity = on;
    }
    function rest(dv, fresh) {
      const P = fresh || !D[0].placed ? places() : null;
      D.forEach((o, i) => {
        if (P) { o.x = P[i][0]; o.z = P[i][1]; o.yaw = Math.random() * Math.PI * 2; o.placed = true; o.q = null; }
        // the dice stay exactly where and how they came to rest (2026-11-05): only a die whose face must change is turned in place
        if (P || !o.q || o.up !== !!dv[i]) { UD.dieUp(o.d, !!dv[i], o.yaw); o.q = o.d.quaternion.clone(); o.up = !!dv[i]; } else o.d.quaternion.copy(o.q);
        o.g.position.set(o.x, REST, o.z); haloAt(o, 0);
      });
      render();
    }
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    function plan(dv, ms, fromBottom, fromRight) {
      stop(); fit();
      const P = places();
      const items = D.map((o, i) => {
        o.x = P[i][0]; o.z = P[i][1]; o.halo.material.opacity = 0;
        // thrown in from the player's side of the dice place (h: side 0 from below, side 1 from above; v: side 0 from the right)
        // (fromRight: a strip off the board, phones — the dice come in from its right end, along the strip)
        const sg = fromBottom ? 1 : -1, ld = fromRight ? [1, 0] : tall ? [sg, 0] : [0, sg];
        const dist = fromRight ? 1.3 + Math.random() * .5 : .8 + Math.random() * .3, sw = (Math.random() - .5) * (fromRight ? .2 : .45);
        const from = [o.x + ld[0] * dist + ld[1] * sw, o.z + ld[1] * dist + ld[0] * sw];
        return { g: o.g, d: o.d, from, to: [o.x, o.z], marked: !!dv[i], rest: REST };
      });
      return UD.throwPlan(items, { dur: ms, h0: .55 });
    }
    function roll(dv, ms, fromBottom, onHit, fromRight) {
      const TP = plan(dv, ms, fromBottom, fromRight);
      // the dice land / hop: tell the page (a soft click each)
      const hits = []; TP.plan.forEach((p, i) => { [.42, .66, .82].forEach((q, j) => hits.push({ t: p.delay + q * ms, i, s: [1, .55, .3][j] })); });
      hits.sort((a, b) => a.t - b.t);
      return new Promise(res => {
        const t0 = performance.now(); let hk = 0;
        const step = now => {
          const tms = now - t0;
          while (hk < hits.length && hits[hk].t <= tms) { if (onHit) try { onHit(hits[hk].i, hits[hk].s); } catch (e) {} hk++; }
          if (tms >= TP.total) {
            TP.end(); raf = 0; D.forEach((o, i) => { o.q = o.d.quaternion.clone(); o.up = !!dv[i]; o.g.position.set(o.x, REST, o.z); });   // keep the pose they landed in
            // one last frame, then the canvas stays still
            const f0 = performance.now();
            const fade = n2 => { const k = Math.min(1, (n2 - f0) / 200); D.forEach((o, i) => haloAt(o, dv[i] ? k : 0)); render(); if (k < 1) raf = requestAnimationFrame(fade); else { raf = 0; res(); } };
            raf = requestAnimationFrame(fade); return;
          }
          TP.frame(tms); render(); raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    }
    let ro = null; if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (!raf) render(); }); ro.observe(wrap); }
    const api = {
      wrap, rest, roll, render,
      // tests: a throw stepped by hand (no clock): .at(ms) poses the dice and renders
      stepper(dv, ms, fromBottom, fromRight) { const TP = plan(dv, ms, !!fromBottom, !!fromRight); return { total: TP.total, at(t) { if (t >= TP.total) { TP.end(); D.forEach((o, i) => haloAt(o, dv[i] ? 1 : 0)); } else { D.forEach(o => { o.halo.material.opacity = 0; }); TP.frame(t); } render(); } }; },
      dispose() { stop(); if (ro) ro.disconnect(); try { R.dispose(); R.forceContextLoss(); } catch (e) {} cv.remove(); },
    };
    LIVE3D.push(api);
    return api;
  }

  function dice(host, opts = {}) {
    const p = 'urd' + (++uid) + '_';
    let st = DSTYLE[opts.style] || BONE;
    const n = opts.count || 4, W = n * 110 + 10;
    host.innerHTML = `<div class="ur-dicew" style="position:relative;width:100%;height:100%"><svg xmlns="${NS}" class="ur-dice" viewBox="0 0 ${W} 120" style="display:block;width:100%;height:100%;overflow:visible">
<defs><radialGradient id="${p}s"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}gw"><stop offset=".3" stop-color="#fff6c8" stop-opacity=".95"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs></svg></div>`;
    const wrap = host.firstChild, svg = wrap.firstChild, D = [];
    const RT = 46;   // circumradius of the base triangle
    for (let i = 0; i < n; i++) {
      const g = el('g', {}, svg);
      const sh = el('ellipse', { rx: RT * .95, ry: RT * .8, cx: 5, cy: 10, fill: `url(#${p}s)` }, g);
      const body = el('g', {}, g);
      const faces = [0, 1, 2].map(() => el('path', { stroke: st.e, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, body));
      const tips = [0, 1, 2].map(() => el('circle', { r: 7.5, 'stroke-width': 1.5 }, body));
      const glow = el('circle', { r: 22, fill: `url(#${p}gw)` }, body);
      const top = el('g', {}, body); el('circle', { r: 15, stroke: '#f3ead4', 'stroke-width': 2.4 }, top); el('circle', { r: 3.4, opacity: .55 }, top);
      const apex = el('circle', { r: 3, fill: st.e }, body);
      D.push({ g, sh, body, faces, tips, glow, top, apex, up: 0, rot: (i * 47 + 13) % 120, x: 60 + i * 110, y: 60 });
    }
    function draw(d, up, rot, dx = 0, dy = 0, sc = 1, light = 0) {
      d.g.setAttribute('transform', `translate(${(d.x + dx).toFixed(1)} ${(d.y + dy).toFixed(1)})`);
      d.body.setAttribute('transform', `scale(${sc.toFixed(3)})`);
      const V = [0, 1, 2].map(k => { const a = (rot + k * 120 - 90) * Math.PI / 180; return [Math.cos(a) * RT, Math.sin(a) * RT]; });
      for (let k = 0; k < 3; k++) {
        const A = V[k], B = V[(k + 1) % 3];
        d.faces[k].setAttribute('d', `M0 0L${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}Z`);
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, lit = (-mx * .6 - my * .8) / (RT * .5);
        const idx = lit > .45 ? 0 : lit > -.45 ? 1 : 2;
        d.faces[k].setAttribute('fill', st.f[(idx + light) % 3]); d.faces[k].setAttribute('stroke', st.e);
      }
      const marked = up ? [0] : [0, 1];
      for (let k = 0; k < 3; k++) {
        const t = d.tips[k], m = marked.includes(k), q = V[k];
        t.setAttribute('cx', (q[0] * .86).toFixed(1)); t.setAttribute('cy', (q[1] * .86).toFixed(1));
        t.setAttribute('fill', m ? st.m[0] : 'none'); t.setAttribute('stroke', m ? st.e : 'none');
      }
      d.top.style.display = up ? '' : 'none'; d.glow.style.display = 'none'; d.apex.style.display = up ? 'none' : '';
      d.top.children[0].setAttribute('fill', st.m[0]); d.top.children[1].setAttribute('fill', st.m[1]);
      d.sh.setAttribute('cx', 5 + dy * -.1); d.sh.setAttribute('cy', 10 - dy * .2);
    }
    let cur = new Array(n).fill(0), d3 = null, busy = false;
    function show(dv) {
      cur = (dv || cur).slice(0, n);
      D.forEach((d, i) => { d.up = cur[i] ? 1 : 0; draw(d, d.up, d.rot); });
      if (d3 && !busy) d3.rest(cur, false);
    }
    // the 3D dice, when they can be had (the SVG stays as the fallback until then)
    if (opts.three !== false && want3D(opts.three === 'skin')) load3D().then(ok => {
      if (!ok || !wrap.isConnected || d3) return;
      try { d3 = make3D(wrap, n, opts.span || 1.96, opts.shift || 0); svg.style.visibility = 'hidden'; if (opts.onReady) try { opts.onReady(); } catch (e) {} d3.rest(cur, true); }
      catch (e) { console.error(e); d3 = null; svg.style.visibility = ''; }
    });
    async function roll(dv, o2 = {}) {
      dv = (dv || D.map(() => Math.random() < .5 ? 1 : 0)).slice(0, n);
      const sp = o2.speed || opts.speed || 1;
      if (d3) {
        busy = true; cur = dv.slice();
        const fromBottom = o2.side != null ? o2.side === 0 : (opts.side != null ? opts.side === 0 : true);
        try { await d3.roll(dv, (o2.ms || 820) / Math.max(.6, sp), fromBottom, o2.onHit || opts.onHit, !!(o2.fromRight || opts.fromRight)); } finally { busy = false; }
        D.forEach((d, i) => { d.up = dv[i] ? 1 : 0; draw(d, d.up, d.rot); });
        return dv.reduce((a, b) => a + b, 0);
      }
      const ms = (o2.ms || 900) / sp, seeds = D.map(() => [Math.random(), Math.random(), Math.random()]);
      const lastFlip = D.map(() => 0);
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
      await tween(160 / sp, t => D.forEach((d, i) => draw(d, dv[i] ? 1 : 0, d.rot, 0, 0, 1 + Math.sin(Math.PI * t) * .05)));
      show(dv); return dv.reduce((a, b) => a + b, 0);
    }
    show(cur);
    return { roll, show, el: svg, setStyle(s) { st = DSTYLE[s] || BONE; show(cur); }, is3D: () => !!d3, _3d: () => d3 };
  }

  window.UrBoard2D = { mount, mini, dice, BOARDS, PIECES, GREEN, cellXY, route, traySlots, VIEW, IMG };
})();
/* README
mount(el, { orient:'h'|'v', rot=false, notch=false, flip=false, design, pieces, interactive=true, speed=1 }) → view   (rot: rows 0 / 2 swapped — Dark's lane nearest;
  notch: the pieces off the board stand in the notch as two stacks with a count, the view is the board alone — VIEW.vn / VIEW.hn)
view.render(state, { sel, targets, last, hint, marks })
  sel      {r,c} | {side,piece} | {tray:'start',side}     selected piece (gold ring, lifted)
  targets  [{r,c, capture?} | {tray:'goal', side}]        candidate squares (#3df59a dot; ring if capture)
  last     {from:{r,c}|[r,c]|null, to:{r,c}|[r,c]}        last move (dashed / solid amber frame)
  hint     {from, to}                                     green arrow (from may be {tray:'start',side})
  marks    [{r,c,type:'danger'|'safe'|'ring'|'glow'|'dot'|'text', color, label, text}]
           {type:'path', side, from, to}  the route (path indices) as glowing arrows
           {type:'arrow', from, to, color}
view.cellRect(r,c) → DOMRect; view.offRect(side,'start'|'goal') → DOMRect
view.setDesign(design, pieces); view.setOrient('h'|'v', rot?, notch?); view.orient() → 'h'|'v'; view.rotated() → bool; view.key() → 'h'|'v'|'hn'|'vn'|'hr'|'vr'|'hrn'|'vrn' (VIEW / traySlots key)
view.on('cell', ({r,c,piece?,side?}) => …); view.on('piece', ({side,piece,pos,r,c,where}) => …); view.on('tray', ({side,kind,piece?}) => …)
view.animateMove(side, from, to, { capture, speed, ms }) → Promise   (path indices; then call render(newState))
UrBoard2D.dice(el, { style, speed, count=4, side, onHit, three=true|false|'skin', span=1.96 }) → { roll(dice?, { speed, ms, side, onHit }) → Promise<n>, show(dice), setStyle(s), is3D() }
  3D dice (three.js r128 + atlas/models/ur-dice.js, loaded in the background) when WebGL works, else SVG; side: thrown from that player's side; onHit(i, strength) at each landing / hop
UrBoard2D.mini(state, { design, pieces, orient, marks, targets, last, hint, sel, crop, trays, width, height, small }) → SVG string
  crop: [x,y,w,h] user units | {r0,c0,r1,c1,pad} squares | 'board'
*/
