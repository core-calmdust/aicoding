// ラインズ・オブ・アクション — the board (SVG). LoaBoard.mount(el) puts two stacked SVGs into el: the static board (wood grain,
// inlay, labels — drawn once, its own layer) and the live layer (marks, pieces, counts). Colours come from CSS variables (.bd-*).
// Units: 100 × 100, the 8 × 8 field is 88 wide at (6, 6); one square = 11. Rank 1 is at the bottom.
(function () {
'use strict';
const NS = 'http://www.w3.org/2000/svg', O = 6, CS = 11, R = 4.55;
let uid = 0;
const cx = s => O + (s & 7) * CS + CS / 2, cy = s => O + (7 - (s >> 3)) * CS + CS / 2;
const f = v => (Math.round(v * 100) / 100);

function baseMarkup(id, labels) {
  let cells = '', grid = '', lbl = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) cells += `<rect x="${O + c * CS}" y="${O + (7 - r) * CS}" width="${CS}" height="${CS}" class="${(r + c) % 2 ? 'lo-cl' : 'lo-cd'}"/>`;
  for (let i = 1; i < 8; i++) grid += `M${O + i * CS} ${O}V${O + 88}M${O} ${O + i * CS}H${O + 88}`;
  if (labels) for (let i = 0; i < 8; i++) lbl += `<text x="${O + i * CS + CS / 2}" y="97.6" class="lo-lbl">${'abcdefgh'[i]}</text><text x="3" y="${O + (7 - i) * CS + CS / 2 + .95}" class="lo-lbl">${i + 1}</text>`;
  return `<defs>
    <linearGradient id="${id}w" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" class="lo-w1"/><stop offset=".55" class="lo-w2"/><stop offset="1" class="lo-w3"/></linearGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="lo-i1"/><stop offset=".5" class="lo-i2"/><stop offset="1" class="lo-i3"/></linearGradient>
    <radialGradient id="${id}v" cx=".32" cy=".24" r=".95"><stop offset="0" class="lo-v1"/><stop offset="1" class="lo-v2"/></radialGradient>
    <filter id="${id}ga" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".011 .46" numOctaves="4" seed="11" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.02" result="a"/><feFlood class="lo-gfa"/><feComposite operator="in" in2="a"/></filter>
    <filter id="${id}gc" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.25" result="a"/><feFlood class="lo-gfa"/><feComposite operator="in" in2="a"/></filter>
    <filter id="${id}gb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -.95" result="a"/><feFlood class="lo-gfb"/><feComposite operator="in" in2="a"/></filter>
    <clipPath id="${id}c"><rect width="100" height="100" rx="3.2"/></clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <rect width="100" height="100" fill="url(#${id}w)"/>
    <rect width="100" height="100" filter="url(#${id}gc)" class="lo-gc"/>
    <rect width="100" height="100" filter="url(#${id}ga)" class="lo-ga"/>
    <rect width="100" height="100" filter="url(#${id}gb)" class="lo-gb"/>
    ${cells}
    <rect x="${O}" y="${O}" width="88" height="88" class="lo-fieldsh"/>
    <path d="${grid}" class="lo-grid" stroke="url(#${id}i)"/>
    <rect x="${O}" y="${O}" width="88" height="88" class="lo-inlay" stroke="url(#${id}i)"/>
    <rect x="${O - 1.5}" y="${O - 1.5}" width="91" height="91" rx=".8" class="lo-inlay2" stroke="url(#${id}i)"/>
    <rect width="100" height="100" fill="url(#${id}v)"/>
    <rect x=".4" y=".4" width="99.2" height="99.2" rx="3" class="lo-edge"/>
    ${lbl}
  </g>`;
}
function pieceDefs(id) {
  const g = (k, a, b, c) => `<radialGradient id="${id}p${k}" cx=".36" cy=".3" r=".8"><stop offset="0" class="lo-${a}"/><stop offset=".55" class="lo-${b}"/><stop offset="1" class="lo-${c}"/></radialGradient><linearGradient id="${id}d${k}" x1=".2" y1=".1" x2=".8" y2=".95"><stop offset="0" class="lo-${k === 'b' ? b : c}"/><stop offset=".5" class="lo-${b}"/><stop offset="1" class="lo-${a}"/></linearGradient>`;
  return g('b', 'b1', 'b2', 'b3') + g('w', 'p1', 'p2', 'p3') +
    `<linearGradient id="${id}rim" x1=".15" y1=".1" x2=".85" y2=".9"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="${id}rim2" x1=".15" y1=".1" x2=".85" y2=".9"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>
    <radialGradient id="${id}sh"><stop offset=".55" stop-color="#000" stop-opacity=".5"/><stop offset=".8" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <marker id="${id}ah" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M1 1.2 L9 5 L1 8.8 L3 5 Z" class="lo-hint-h"/></marker>`;
}
function pieceInner(id, k) {      // k: 'b' | 'w', drawn around (0, 0)
  return `<ellipse cx=".55" cy="1.15" rx="5.25" ry="5.15" fill="url(#${id}sh)" class="sh"/><g class="in">` +
    `<circle r="${R}" fill="url(#${id}p${k})"/><circle r="${R - .14}" fill="none" class="lo-rim-${k}" stroke-width=".28"/><circle r="${R - .42}" fill="none" stroke="url(#${id}rim)" stroke-width=".5"/>` +
    `<circle r="3.05" fill="url(#${id}d${k})"/><circle r="3.05" fill="none" class="lo-groove-${k}" stroke-width=".2"/><circle r="2.86" fill="none" stroke="url(#${id}rim2)" stroke-width=".3"/>` +
    `<circle r="2.05" fill="none" class="lo-groove-${k}" stroke-width=".1" opacity=".6"/>` +
    `<circle r="1.05" fill="url(#${id}p${k})"/><circle r="1.05" fill="none" class="lo-groove-${k}" stroke-width=".14"/><ellipse cx="-.3" cy="-.36" rx=".42" ry=".26" fill="#fff" opacity="${k === 'b' ? .3 : .5}" transform="rotate(-32 -.3 -.36)"/>` +
    `<ellipse cx="-1.75" cy="-2.55" rx="2.1" ry=".85" fill="#fff" opacity=".2" transform="rotate(-32 -1.75 -2.55)"/></g>`;
}

function mount(el, opt) {
  opt = opt || {};
  const id = 'lo' + (++uid);
  const wrap = document.createElement('div'); wrap.className = 'lo-wrap';
  wrap.innerHTML = `<svg class="lo-bg" xmlns="${NS}" viewBox="0 0 100 100" aria-hidden="true">${baseMarkup(id, opt.labels !== false)}</svg>` +
    `<svg class="lo-top" xmlns="${NS}" viewBox="0 0 100 100"><defs>${pieceDefs(id)}</defs><g class="lo-marks"></g><g class="lo-pieces"></g><g class="lo-over"></g></svg>`;
  el.appendChild(wrap);
  const svg = wrap.querySelector('.lo-top'), gM = svg.querySelector('.lo-marks'), gP = svg.querySelector('.lo-pieces'), gO = svg.querySelector('.lo-over');
  const pcs = new Array(64).fill(null);      // square -> { el, k }
  const place = (p, s) => { p.el.style.transform = `translate(${f(cx(s))}px,${f(cy(s))}px)`; };
  function addPiece(s, k) { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'lo-pc ' + (k === 1 ? 'b' : 'w')); g.innerHTML = pieceInner(id, k === 1 ? 'b' : 'w'); const p = { el: g, k }; place(p, s); gP.appendChild(g); pcs[s] = p; return p; }
  function dropPiece(s, fade) { const p = pcs[s]; if (!p) return; pcs[s] = null; if (fade) { p.el.classList.add('out'); setTimeout(() => p.el.remove(), 420); } else p.el.remove(); }

  // o: { board, anim: {from, to} | null, last: {from, to} | null, sel, info (LoaEngine.lineInfo of sel), hint: {from, to}, glow: [squares], win: colour, dim: bool }
  function draw(o) {
    const b = o.board;
    if (o.anim && pcs[o.anim.from] && b[o.anim.to] === pcs[o.anim.from].k && !b[o.anim.from]) {
      const a = o.anim, p = pcs[a.from];
      if (pcs[a.to]) dropPiece(a.to, true);
      pcs[a.from] = null; pcs[a.to] = p; gP.appendChild(p.el); p.el.getBoundingClientRect(); place(p, a.to);
    }
    for (let s = 0; s < 64; s++) { const p = pcs[s]; if (p && p.k !== b[s]) dropPiece(s, false); if (b[s] && !pcs[s]) addPiece(s, b[s]); }
    for (let s = 0; s < 64; s++) if (pcs[s]) { pcs[s].el.classList.toggle('sel', o.sel === s); pcs[s].el.classList.toggle('won', !!o.win && pcs[s].k === o.win); }
    let m = '', t = '';
    if (o.last) m += `<circle cx="${cx(o.last.from)}" cy="${cy(o.last.from)}" r="1.5" class="lo-last-f"/><rect x="${cx(o.last.to) - 5}" y="${cy(o.last.to) - 5}" width="10" height="10" rx="1.6" class="lo-last"/>`;
    if (o.glow) for (const s of o.glow) m += `<rect x="${cx(s) - 5.1}" y="${cy(s) - 5.1}" width="10.2" height="10.2" rx="1.8" class="lo-glow"/>`;
    if (o.sel >= 0 && o.sel != null && o.info) {
      const s0 = o.sel, r0 = s0 >> 3, c0 = s0 & 7;
      m += `<rect x="${cx(s0) - 5.2}" y="${cy(s0) - 5.2}" width="10.4" height="10.4" rx="1.8" class="lo-selsq"/>`;
      for (let k = 0; k < 4; k++) {       // the four lines through the piece, each drawn from edge to edge, with a pip on every counted piece
        const dr = [1, 1, 0, -1][k], dc = [0, 1, 1, 1][k]; let r1 = r0, c1 = c0, r2 = r0, c2 = c0;
        while (r1 - dr >= 0 && r1 - dr < 8 && c1 - dc >= 0 && c1 - dc < 8) { r1 -= dr; c1 -= dc; }
        while (r2 + dr >= 0 && r2 + dr < 8 && c2 + dc >= 0 && c2 + dc < 8) { r2 += dr; c2 += dc; }
        const usable = o.info.some(x => x.k === k && x.ok);
        m += `<line x1="${cx(r1 * 8 + c1)}" y1="${cy(r1 * 8 + c1)}" x2="${cx(r2 * 8 + c2)}" y2="${cy(r2 * 8 + c2)}" class="lo-line${usable ? '' : ' off'}" data-k="${k}"/>`;
        for (let r = r1, c = c1; ; r += dr, c += dc) { const s = r * 8 + c; if (b[s]) t += `<circle cx="${cx(s)}" cy="${cy(s)}" r="${s === s0 ? 1.25 : 1}" class="lo-pip" data-k="${k}"/>`; if (r === r2 && c === c2) break; }
      }
      for (const x of o.info) {
        if (x.to < 0) continue; const X = cx(x.to), Y = cy(x.to);
        if (x.ok && !x.cap) t += `<g class="lo-tg" data-k="${x.k}"><circle cx="${X}" cy="${Y}" r="3.1"/><text x="${X}" y="${Y + 1.25}">${x.n}</text></g>`;
        else if (x.ok) t += `<g class="lo-tg cap" data-k="${x.k}"><circle cx="${X}" cy="${Y}" r="5.05" class="ring"/><circle cx="${X + 3.5}" cy="${Y - 3.5}" r="2.15"/><text x="${X + 3.5}" y="${Y - 2.42}">${x.n}</text></g>`;
        else if (x.why === 'jump') t += `<g class="lo-no" data-k="${x.k}"><circle cx="${X}" cy="${Y}" r="2.3"/><path d="M${X - 1.1} ${Y - 1.1}l2.2 2.2M${X + 1.1} ${Y - 1.1}l-2.2 2.2"/></g>`;
      }
    }
    if (o.hint) { const a = o.hint, x1 = cx(a.from), y1 = cy(a.from), x2 = cx(a.to), y2 = cy(a.to), L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      t += `<g class="lo-hint"><path d="M${f(x1 + ux * 2)} ${f(y1 + uy * 2)}L${f(x2 - ux * 3.2)} ${f(y2 - uy * 3.2)}" class="o"/><path d="M${f(x1 + ux * 2)} ${f(y1 + uy * 2)}L${f(x2 - ux * 3.2)} ${f(y2 - uy * 3.2)}" class="i" marker-end="url(#${id}ah)"/></g>`; }
    gM.innerHTML = m; gO.innerHTML = t;
    svg.removeAttribute('data-hot');
  }
  function cellAt(e) {
    const m = svg.getScreenCTM(); if (!m) return -1; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(m.inverse());
    const c = Math.floor((q.x - O) / CS), r = 7 - Math.floor((q.y - O) / CS); return c < 0 || c > 7 || r < 0 || r > 7 ? -1 : r * 8 + c;
  }
  const hot = k => { if (k == null || k < 0) svg.removeAttribute('data-hot'); else svg.setAttribute('data-hot', k); };
  return { el: wrap, svg, draw, cellAt, hot, clear() { for (let s = 0; s < 64; s++) dropPiece(s, false); } };
}

// a small still picture: the lower-left corner of the board with a few pieces (design tiles), or a whole tiny board (variant cards)
function thumb(cls) {
  const id = 'lo' + (++uid), pc = (s, k) => `<g transform="translate(${cx(s)} ${cy(s)})">${pieceInner(id, k)}</g>`;
  return `<svg class="lo-thumb ${cls || ''}" xmlns="${NS}" viewBox="3 50.5 48 32" preserveAspectRatio="xMidYMid slice">${baseMarkup(id, false)}<defs>${pieceDefs(id)}</defs>${pc(25, 'b')}${pc(18, 'w')}${pc(27, 'w')}${pc(10, 'b')}</svg>`;
}
function art(cells) {
  let h = '<svg class="lo-art" xmlns="' + NS + '" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="5" class="a-bd"/><path d="M8 8h48v48H8z" class="a-in"/>';
  for (let s = 0; s < 64; s++) if (cells[s]) h += `<circle cx="${8 + (s & 7) * 6 + 3}" cy="${8 + (7 - (s >> 3)) * 6 + 3}" r="2.45" class="${cells[s] === 1 ? 'a-b' : 'a-w'}"/>`;
  return h + '</svg>';
}
window.LoaBoard = { mount, thumb, art, cx, cy };
})();
