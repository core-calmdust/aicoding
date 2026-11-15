// 海戦ゲーム — the sea board (SVG). SeaBoard.draw(svg, opts) rebuilds the static layer; SeaBoard.fx(...) plays shot effects on top.
// Units: 1 cell = 10, the sea is 100×100 at (O, O); the full board has a slim margin for the A–J / 1–10 labels.
(function () {
'use strict';
const O = 9, NS = 'http://www.w3.org/2000/svg';
let uid = 0;
const xy = cell => [O + (cell % 10) * 10, O + (cell / 10 | 0) * 10];

// one ship, drawn lying to the right from (0,0): L cells long, 10 high. kind = fleet index (0 carrier … 4 destroyer)
function shipShape(kind, L, id) {
  const w = L * 10, g = `url(#${id}h)`, d = `url(#${id}d)`;
  if (kind === 0) {       // carrier: a flat deck, the island to starboard, lifts and a dashed centre line
    return `<path d="M1.2 1.7 H${w - 5} L${w - 1} 3.3 V6.9 L${w - 4.2} 8.3 H1.2 Z" fill="${g}" class="sb-hull"/>` +
      `<path d="M2.4 2.6 H${w - 5.4} L${w - 2.2} 3.9 V6.5 L${w - 4.8} 7.4 H2.4 Z" fill="${d}" class="sb-deck"/>` +
      `<path d="M4 5.6 H${w - 5}" class="sb-run"/><path d="M5 7 L${w * .55} 3.2" class="sb-run a"/>` +
      `<rect x="${w * .2}" y="3.3" width="3.4" height="2.6" rx=".3" class="sb-lift"/><rect x="${w * .7}" y="4.4" width="3.4" height="2.6" rx=".3" class="sb-lift"/>` +
      `<rect x="${w * .5}" y="1.2" width="8.5" height="2.3" rx=".6" fill="${g}" class="sb-top"/><rect x="${w * .5 + 1.2}" y="1.65" width="3.2" height="1.4" rx=".3" class="sb-fun"/><circle cx="${w * .5 + 6.4}" cy="2.35" r=".55" class="sb-dot"/>`;
  }
  if (kind === 3) {       // submarine: a capsule, the sail, bow planes
    return `<path d="M${w * .62} 2.3 l1.4 -1.3 h1.6 v1.3 Z M${w * .62} 7.7 l1.4 1.3 h1.6 v-1.3 Z" class="sb-fin"/>` +
      `<path d="M4.4 2.1 H${w - 4.4} Q${w - .9} 2.4 ${w - .9} 5 Q${w - .9} 7.6 ${w - 4.4} 7.9 H4.4 Q.9 7.3 .9 5 Q.9 2.7 4.4 2.1 Z" fill="${g}" class="sb-hull"/>` +
      `<path d="M4.6 5 H${w - 3.4}" class="sb-seam"/>` +
      `<rect x="${w * .42}" y="3.3" width="6.4" height="3.4" rx="1.7" fill="${d}" class="sb-top"/><circle cx="${w * .42 + 2}" cy="5" r=".6" class="sb-dot"/><circle cx="${w * .42 + 4.2}" cy="5" r=".42" class="sb-dot"/>` +
      `<circle cx="5.4" cy="5" r=".7" class="sb-dot" opacity=".55"/><circle cx="${w - 4.6}" cy="5" r=".55" class="sb-dot" opacity=".55"/>`;
  }
  // battleship / cruiser / destroyer: a pointed bow, the deck plate, a two-tier bridge with funnel, gun turrets
  const turret = (x, dir, r) => `<path d="M${x} 5 h${dir * (r + 1.9)}" class="sb-gun"/><circle cx="${x}" cy="5" r="${r}" fill="${d}" class="sb-top"/>`;
  const bx = L === 2 ? 5.2 : w * .36, bw = L === 2 ? 5.2 : Math.max(6, w * .27), tr = L >= 4 ? 1.75 : 1.45;
  let h = `<path d="M3 1.9 H${w - 8} Q${w - 3} 2.6 ${w - .7} 5 Q${w - 3} 7.4 ${w - 8} 8.1 H3 Q1 8.1 1 5 Q1 1.9 3 1.9 Z" fill="${g}" class="sb-hull"/>` +
    `<path d="M3.4 2.9 H${w - 8.4} Q${w - 4.6} 3.5 ${w - 2.8} 5 Q${w - 4.6} 6.5 ${w - 8.4} 7.1 H3.4 Q2.1 7.1 2.1 5 Q2.1 2.9 3.4 2.9 Z" fill="${d}" class="sb-deck"/>` +
    `<rect x="${bx}" y="2.9" width="${bw}" height="4.2" rx=".9" fill="${g}" class="sb-top"/><rect x="${bx + 1}" y="3.6" width="${bw - 2.6}" height="2.8" rx=".7" fill="${d}" class="sb-top"/>` +
    `<rect x="${bx + 1.6}" y="4.2" width="${Math.max(1.6, bw * .32)}" height="1.6" rx=".6" class="sb-fun"/><circle cx="${bx + bw - 1.5}" cy="5" r=".5" class="sb-dot"/>`;
  h += turret(w - (L === 2 ? 7.6 : 9.4), 1, tr);
  if (L >= 3) h += turret(Math.max(4.2, bx - 3.4), -1, tr);
  if (L >= 4) h += turret(w - 14.6, 1, tr);
  return h;
}
function shipG(s, kind, cls, id) {
  const x = O + s.c * 10, y = O + s.r * 10;
  const tf = s.h ? `translate(${x} ${y})` : `translate(${x + 10} ${y}) rotate(90)`;
  return `<g class="sb-ship ${cls || ''}" data-ship="${kind}" transform="${tf}">${shipShape(kind, s.len, id)}</g>`;
}

// opts: { ships: [{r,c,len,h}] by fleet index, show: i => 'own' | 'sunk' | 'ghost' | 'bad' | 'pick' | '' (hidden),
//         shots: Uint8Array (0 / 1 miss / 2 hit), heat: Float64Array | null, best: cell, glow: [cells], last: cell, mini: bool, labels: bool }
function draw(svg, o) {
  if (!svg._sb) {
    svg._sb = 'sb' + (++uid);
    const id = svg._sb;
    svg.setAttribute('viewBox', o.mini ? `${O - 1} ${O - 1} 102 102` : '0 0 110 110');
    svg.classList.add('sb'); if (o.mini) svg.classList.add('sb-mini');
    svg.innerHTML = `<defs>
      <linearGradient id="${id}w" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" class="sb-w1"/><stop offset="1" class="sb-w2"/></linearGradient>
      <radialGradient id="${id}v" cx=".3" cy=".2" r=".95"><stop offset="0" class="sb-v1"/><stop offset="1" class="sb-v2"/></radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sb-h1"/><stop offset=".55" class="sb-h2"/><stop offset="1" class="sb-h3"/></linearGradient>
      <linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sb-d1"/><stop offset="1" class="sb-d2"/></linearGradient>
      <radialGradient id="${id}f"><stop offset="0" stop-color="#fff3d6"/><stop offset=".35" stop-color="#ffb070"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></radialGradient>
      <filter id="${id}s" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation=".7"/></filter>
    </defs><g class="sb-base"></g><g class="sb-fx"></g>`;
  }
  const id = svg._sb, base = svg.querySelector('.sb-base'); let h = '';
  h += `<rect x="${O}" y="${O}" width="100" height="100" rx="2.2" fill="url(#${id}w)" class="sb-sea"/><rect x="${O}" y="${O}" width="100" height="100" rx="2.2" fill="url(#${id}v)" class="sb-sheen"/>`;
  if (o.heat) { let mx = 0, mn = 1e9; for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; if (o.heat[i] > mx) mx = o.heat[i]; if (o.heat[i] < mn) mn = o.heat[i]; } mn *= .85; if (mx > mn) for (let i = 0; i < 100; i++) { if (o.shots && o.shots[i]) continue; const a = Math.pow(Math.max(0, (o.heat[i] - mn) / (mx - mn)), 1.6); if (a < .03) continue; const [x, y] = xy(i); h += `<rect x="${x + .5}" y="${y + .5}" width="9" height="9" rx="1.6" class="sb-heat" style="opacity:${(.03 + a * .7).toFixed(3)}"/>`; } }
  let lines = ''; for (let i = 1; i < 10; i++) lines += `M${O + i * 10} ${O}V${O + 100}M${O} ${O + i * 10}H${O + 100}`;
  h += `<path d="${lines}" class="sb-grid"/>`;
  if (!o.mini) for (let i = 0; i < 10; i++) h += `<text x="${O + i * 10 + 5}" y="${O - 2.6}" class="sb-lbl">${'ABCDEFGHIJ'[i]}</text><text x="${O - 4.4}" y="${O + i * 10 + 6.4}" class="sb-lbl">${i + 1}</text>`;
  if (o.ships) o.ships.forEach((s, i) => { const c = o.show ? o.show(i) : 'own', kind = s && s.t != null ? s.t : i; if (s && c) h += `<g class="sb-shadow" filter="url(#${id}s)" transform="translate(.7 1.2)">${shipG(s, kind, 'sh', id)}</g>` + shipG(s, kind, c, id); });
  if (o.glow) for (const c of o.glow) { const [x, y] = xy(c); h += `<rect x="${x + .8}" y="${y + .8}" width="8.4" height="8.4" rx="1.6" class="sb-glow"/>`; }
  if (o.shots) for (let i = 0; i < 100; i++) { const v = o.shots[i]; if (!v) continue; const [x, y] = xy(i), cx = x + 5, cy = y + 5;
    h += v === 2 ? `<circle cx="${cx}" cy="${cy}" r="4.3" fill="url(#${id}f)" class="sb-hitglow"/><circle cx="${cx}" cy="${cy}" r="1.9" class="sb-hit"/>` : `<circle cx="${cx}" cy="${cy}" r="1.25" class="sb-miss"/><circle cx="${cx}" cy="${cy}" r="2.9" class="sb-missring"/>`; }
  if (o.scans) o.scans.slice(-3).forEach((sc, n, arr) => { const r = sc.at / 10 | 0, c = sc.at % 10, r0 = Math.max(0, r - 1), c0 = Math.max(0, c - 1), r1 = Math.min(9, r + 1), c1 = Math.min(9, c + 1), x = O + c0 * 10, y = O + r0 * 10;
    h += `<g class="sb-scan${n === arr.length - 1 ? ' new' : ''}"><rect x="${x + .7}" y="${y + .7}" width="${(c1 - c0 + 1) * 10 - 1.4}" height="${(r1 - r0 + 1) * 10 - 1.4}" rx="2.4"/><circle cx="${x + 1.2}" cy="${y + 1.2}" r="3.3"/><text x="${x + 1.2}" y="${y + 2.5}">${sc.k}</text></g>`; });
  if (o.last != null && o.last >= 0) { const [x, y] = xy(o.last); h += `<rect x="${x + .6}" y="${y + .6}" width="8.8" height="8.8" rx="1.8" class="sb-last"/>`; }
  if (o.best != null && o.best >= 0) { const [x, y] = xy(o.best); h += `<g class="sb-best" transform="translate(${x + 5} ${y + 5})"><circle r="3.6"/><path d="M-5.2 0h2.6M2.6 0h2.6M0 -5.2v2.6M0 2.6v2.6"/></g>`; }
  h += `<rect x="${O}" y="${O}" width="100" height="100" rx="2.2" class="sb-rim"/><g class="sb-aim" style="display:none"><rect width="10" height="10" rx="1.8"/><path d="M5 1.6v2M5 6.4v2M1.6 5h2M6.4 5h2"/></g>`;
  base.innerHTML = h;
}
// cell under a pointer event (or -1)
function cellAt(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); if (!m) return -1;
  const q = p.matrixTransform(m.inverse()), c = Math.floor((q.x - O) / 10), r = Math.floor((q.y - O) / 10);
  return c >= 0 && c < 10 && r >= 0 && r < 10 ? r * 10 + c : -1;
}
function point(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: (q.x - O) / 10, y: (q.y - O) / 10 }; }
function aim(svg, cell) { const a = svg.querySelector('.sb-aim'); if (!a) return; if (cell < 0) { a.style.display = 'none'; return; } const [x, y] = xy(cell); a.style.display = ''; a.setAttribute('transform', `translate(${x} ${y})`); }
// shot effect: a reticle closes on the cell, then a splash (miss) or a blast (hit). Resolves when the marker should appear.
function fx(svg, cell, hit, fast) {
  const layer = svg.querySelector('.sb-fx'), [x, y] = xy(cell), cx = x + 5, cy = y + 5, id = svg._sb;
  const add = (html, life) => { const g = document.createElementNS(NS, 'g'); g.innerHTML = html; layer.appendChild(g); setTimeout(() => g.remove(), life); return g; };
  const t1 = fast ? 160 : 380;
  add(`<g class="sb-fx-lock" style="animation-duration:${t1}ms" transform="translate(${cx} ${cy})"><circle r="4.2"/><path d="M-7 0h3.4M3.6 0h3.4M0 -7v3.4M0 3.6v3.4"/></g>`, t1 + 40);
  return new Promise(res => setTimeout(() => {
    if (hit) add(`<circle cx="${cx}" cy="${cy}" r="5" fill="url(#${id}f)" class="sb-fx-blast"/><circle cx="${cx}" cy="${cy}" r="3" class="sb-fx-ring hit"/><g class="sb-fx-sparks" transform="translate(${cx} ${cy})">${[0, 51, 103, 154, 206, 257, 309].map(a => `<path d="M0 -2.4V-5.4" transform="rotate(${a})"/>`).join('')}</g>`, 900);
    else add(`<circle cx="${cx}" cy="${cy}" r="2" class="sb-fx-ring"/><circle cx="${cx}" cy="${cy}" r="2" class="sb-fx-ring d2"/><circle cx="${cx}" cy="${cy}" r="1.6" class="sb-fx-drop"/>`, 1000);
    res();
  }, t1));
}
// sonar: a ring sweeps over the 3×3 box
function sweep(svg, area) {
  const layer = svg.querySelector('.sb-fx'); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const c of area) { const [x, y] = xy(c); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 10); y1 = Math.max(y1, y + 10); }
  const g = document.createElementNS(NS, 'g'); g.innerHTML = `<rect x="${x0 + .7}" y="${y0 + .7}" width="${x1 - x0 - 1.4}" height="${y1 - y0 - 1.4}" rx="2.4" class="sb-fx-scan"/><circle cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" r="5" class="sb-fx-ring scan"/><circle cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" r="5" class="sb-fx-ring scan d2"/>`;
  layer.appendChild(g); setTimeout(() => g.remove(), 1100);
  return new Promise(res => setTimeout(res, 750));
}
window.SeaBoard = { draw, cellAt, point, aim, fx, sweep, xy, O };
})();
