/* まいにち数独 — cute vector backgrounds (procedural SVG, sized to the viewport) */
(function () {
'use strict';
const R = (seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; });
const f = n => Math.round(n * 10) / 10;

/* kawaii face: eyes, smile, blush */
function face(x, y, s, ink = '#4a3a3a', blush = '#ff9fb0') {
  return `<g><ellipse cx="${f(x - s * .42)}" cy="${f(y)}" rx="${f(s * .09)}" ry="${f(s * .12)}" fill="${ink}"/><ellipse cx="${f(x + s * .42)}" cy="${f(y)}" rx="${f(s * .09)}" ry="${f(s * .12)}" fill="${ink}"/>`
    + `<path d="M${f(x - s * .14)} ${f(y + s * .16)}q${f(s * .14)} ${f(s * .14)} ${f(s * .28)} 0" fill="none" stroke="${ink}" stroke-width="${f(Math.max(1.5, s * .06))}" stroke-linecap="round"/>`
    + `<ellipse cx="${f(x - s * .66)}" cy="${f(y + s * .2)}" rx="${f(s * .14)}" ry="${f(s * .08)}" fill="${blush}" opacity=".7"/><ellipse cx="${f(x + s * .66)}" cy="${f(y + s * .2)}" rx="${f(s * .14)}" ry="${f(s * .08)}" fill="${blush}" opacity=".7"/></g>`;
}
function cloud(x, y, s, fill = '#fff', op = .95, cls = 'drift') {
  return `<g class="${cls}" style="--d:${f(40 + (x % 7) * 6)}s"><g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" opacity="${op}" fill="${fill}"><ellipse cx="0" cy="0" rx="60" ry="26"/><circle cx="-24" cy="-14" r="24"/><circle cx="14" cy="-24" r="30"/><circle cx="40" cy="-6" r="20"/></g></g>`;
}
function hills(W, H, base, amp, color, seed, n = 3) {
  const r = R(seed); let d = `M0 ${H}L0 ${f(base)}`;
  const step = W / n;
  for (let i = 0; i < n; i++) {
    const x1 = i * step + step * .5, y1 = base - amp * (.6 + r() * .6), x2 = (i + 1) * step, y2 = base - amp * r() * .3;
    d += `Q${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}`;
  }
  return `<path d="${d}L${W} ${H}Z" fill="${color}"/>`;
}
function star(x, y, s, fill, cls = '') {
  const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * .45 : s; p.push(f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr)); }
  return `<path class="${cls}" style="--d:${f(2 + (x * 7 % 30) / 10)}s;--o:${f((y * 13 % 10) / 10)}s" d="M${p.join('L')}Z" fill="${fill}" stroke="${fill}" stroke-width="${f(s * .35)}" stroke-linejoin="round"/>`;
}
function sparkle(x, y, s, fill, cls = 'twinkle') {
  return `<path class="${cls}" style="--d:${f(1.6 + (x * 3 % 20) / 10)}s;--o:${f((x * 11 % 17) / 10)}s" d="M${f(x)} ${f(y - s)}Q${f(x + s * .15)} ${f(y - s * .15)} ${f(x + s)} ${f(y)}Q${f(x + s * .15)} ${f(y + s * .15)} ${f(x)} ${f(y + s)}Q${f(x - s * .15)} ${f(y + s * .15)} ${f(x - s)} ${f(y)}Q${f(x - s * .15)} ${f(y - s * .15)} ${f(x)} ${f(y - s)}Z" fill="${fill}"/>`;
}
let GID = 0, CUR = 'sk';
const sky = (id, stops) => (CUR = 'sk' + (++GID), `<defs><linearGradient id="${CUR}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`);
function tree(x, y, s, leaf, trunk = '#a8714f', withFace = false) {
  return `<g class="sway" style="--d:${f(4 + (x % 5))}s"><rect x="${f(x - s * .1)}" y="${f(y - s * .55)}" width="${f(s * .2)}" height="${f(s * .6)}" rx="${f(s * .06)}" fill="${trunk}"/><circle cx="${f(x)}" cy="${f(y - s * .85)}" r="${f(s * .5)}" fill="${leaf}"/><circle cx="${f(x - s * .32)}" cy="${f(y - s * .62)}" r="${f(s * .32)}" fill="${leaf}"/><circle cx="${f(x + s * .34)}" cy="${f(y - s * .64)}" r="${f(s * .3)}" fill="${leaf}"/><circle cx="${f(x - s * .14)}" cy="${f(y - s * 1.06)}" r="${f(s * .14)}" fill="#fff" opacity=".25"/>${withFace ? face(x, y - s * .75, s * .28) : ''}</g>`;
}
function bunny(x, y, s, c = '#fff') {
  return `<g class="hop" style="--d:${f(2.6 + (x % 3) * .4)}s"><ellipse cx="${f(x - s * .22)}" cy="${f(y - s * 1.15)}" rx="${f(s * .13)}" ry="${f(s * .42)}" fill="${c}"/><ellipse cx="${f(x + s * .22)}" cy="${f(y - s * 1.15)}" rx="${f(s * .13)}" ry="${f(s * .42)}" fill="${c}"/><ellipse cx="${f(x - s * .22)}" cy="${f(y - s * 1.1)}" rx="${f(s * .06)}" ry="${f(s * .28)}" fill="#ffc6d3"/><ellipse cx="${f(x + s * .22)}" cy="${f(y - s * 1.1)}" rx="${f(s * .06)}" ry="${f(s * .28)}" fill="#ffc6d3"/><ellipse cx="${f(x)}" cy="${f(y - s * .4)}" rx="${f(s * .62)}" ry="${f(s * .5)}" fill="${c}"/>${face(x, y - s * .45, s * .3)}</g>`;
}
function cat(x, y, s, c = '#f6b56b', flip = false) {
  const t = flip ? `translate(${f(2 * x)} 0) scale(-1 1)` : '';
  return `<g transform="${t}"><g class="tail" style="--d:3s;transform-origin:${f(x + s * .5)}px ${f(y - s * .2)}px"><path d="M${f(x + s * .5)} ${f(y - s * .2)}q${f(s * .6)} ${f(-s * .1)} ${f(s * .5)} ${f(-s * .7)}" fill="none" stroke="${c}" stroke-width="${f(s * .16)}" stroke-linecap="round"/></g><ellipse cx="${f(x)}" cy="${f(y - s * .35)}" rx="${f(s * .55)}" ry="${f(s * .38)}" fill="${c}"/><circle cx="${f(x - s * .32)}" cy="${f(y - s * .78)}" r="${f(s * .36)}" fill="${c}"/><path d="M${f(x - s * .62)} ${f(y - s * .95)}l${f(s * .06)} ${f(-s * .38)} ${f(s * .22)} ${f(s * .2)}Z M${f(x - s * .02)} ${f(y - s * .95)}l${f(-s * .06)} ${f(-s * .38)} ${f(-s * .22)} ${f(s * .2)}Z" fill="${c}"/>${face(x - s * .32, y - s * .78, s * .2)}</g>`;
}
function fish(x, y, s, c, cls = 'swim') {
  return `<g class="${cls}" style="--d:${f(9 + (x % 7))}s"><g transform="translate(${f(x)} ${f(y)})"><path d="M${f(s * .6)} 0l${f(s * .45)} ${f(-s * .35)}v${f(s * .7)}Z" fill="${c}"/><ellipse cx="0" cy="0" rx="${f(s * .7)}" ry="${f(s * .45)}" fill="${c}"/><circle cx="${f(-s * .35)}" cy="${f(-s * .08)}" r="${f(s * .09)}" fill="#3a3045"/><ellipse cx="${f(-s * .2)}" cy="${f(s * .14)}" rx="${f(s * .1)}" ry="${f(s * .05)}" fill="#ff9fb0" opacity=".8"/></g></g>`;
}
function flower(x, y, s, petal, center = '#ffd76a', stem = true) {
  let p = ''; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; p += `<circle cx="${f(x + Math.cos(a) * s * .42)}" cy="${f(y + Math.sin(a) * s * .42)}" r="${f(s * .32)}" fill="${petal}"/>`; }
  return `<g class="sway" style="--d:${f(3 + (x % 4))}s">${stem ? `<path d="M${f(x)} ${f(y)}V${f(y + s * 2.2)}" stroke="#6fbf73" stroke-width="${f(s * .12)}" stroke-linecap="round"/><ellipse cx="${f(x + s * .3)}" cy="${f(y + s * 1.3)}" rx="${f(s * .3)}" ry="${f(s * .13)}" fill="#7dcc7f" transform="rotate(-30 ${f(x + s * .3)} ${f(y + s * 1.3)})"/>` : ''}${p}<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * .26)}" fill="${center}"/></g>`;
}
function mushroom(x, y, s, cap = '#ff7b6b', dots = '#fff') {
  return `<g><rect x="${f(x - s * .25)}" y="${f(y - s * .7)}" width="${f(s * .5)}" height="${f(s * .7)}" rx="${f(s * .2)}" fill="#fff4e3"/><path d="M${f(x - s * .75)} ${f(y - s * .62)}Q${f(x - s * .7)} ${f(y - s * 1.45)} ${f(x)} ${f(y - s * 1.45)}Q${f(x + s * .7)} ${f(y - s * 1.45)} ${f(x + s * .75)} ${f(y - s * .62)}Z" fill="${cap}"/><circle cx="${f(x - s * .32)}" cy="${f(y - s * 1)}" r="${f(s * .12)}" fill="${dots}"/><circle cx="${f(x + s * .22)}" cy="${f(y - s * 1.18)}" r="${f(s * .15)}" fill="${dots}"/><circle cx="${f(x + s * .45)}" cy="${f(y - s * .82)}" r="${f(s * .09)}" fill="${dots}"/>${face(x, y - s * .38, s * .17)}</g>`;
}
function house(x, y, s, wall, roof, lit = false) {
  return `<g><rect x="${f(x - s * .5)}" y="${f(y - s * .8)}" width="${f(s)}" height="${f(s * .8)}" rx="${f(s * .06)}" fill="${wall}"/><path d="M${f(x - s * .65)} ${f(y - s * .78)}L${f(x)} ${f(y - s * 1.35)}L${f(x + s * .65)} ${f(y - s * .78)}Z" fill="${roof}" stroke="${roof}" stroke-width="${f(s * .08)}" stroke-linejoin="round"/><rect x="${f(x - s * .32)}" y="${f(y - s * .58)}" width="${f(s * .24)}" height="${f(s * .22)}" rx="${f(s * .04)}" fill="${lit ? '#ffe08a' : '#bfe6ff'}" class="${lit ? 'glow' : ''}"/><rect x="${f(x + s * .08)}" y="${f(y - s * .45)}" width="${f(s * .22)}" height="${f(s * .45)}" rx="${f(s * .1)}" fill="${roof}" opacity=".85"/></g>`;
}
function scatter(W, H, n, seed, fn, area = [0, 0, 1, 1]) {
  const r = R(seed); let s = '';
  for (let i = 0; i < n; i++) s += fn(W * (area[0] + r() * (area[2] - area[0])), H * (area[1] + r() * (area[3] - area[1])), r, i);
  return s;
}

/* ---------- scenes ---------- */
const S = {};
S.daily = (W, H, v = 'e') => {
  const P = {
    e: { sky: [[0, '#bfe9ff'], [.6, '#fff1d9'], [1, '#ffe2ea']], sun: '#ffd25e', h: ['#c4ecb0', '#a6df96', '#86cf84'] },
    m: { sky: [[0, '#8fd0ff'], [.7, '#d5f0ff'], [1, '#fff6e0']], sun: '#ffc23d', h: ['#b5e3a1', '#93d18b', '#72c07a'] },
    h: { sky: [[0, '#2c2e6e'], [.55, '#6d58a8'], [1, '#f2a6b8']], sun: '#fff3c4', h: ['#4d5aa0', '#3e4a8c', '#313b73'] },
  }[v];
  const night = v === 'h';
  let s = sky('sk', P.sky) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  if (night) s += scatter(W, H, 40, 7, (x, y, r) => sparkle(x, y, 2 + r() * 4, '#fff8d6'), [0, 0, 1, .55]);
  const sx = W * .78, sy = H * .16, sr = Math.min(W, H) * .07;
  s += `<g class="bob" style="--d:6s"><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * 1.5)}" fill="${P.sun}" opacity="${night ? .12 : .25}"/>${night ? `<mask id="mk${GID}"><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="#fff"/><circle cx="${f(sx + sr * .55)}" cy="${f(sy - sr * .35)}" r="${f(sr * .82)}" fill="#000"/></mask><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${P.sun}" mask="url(#mk${GID})"/>${face(sx - sr * .45, sy + sr * .2, sr * .28, '#7a6a4a')}` : `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${P.sun}"/>${face(sx, sy, sr * .5)}`}</g>`;
  if (!night) s += cloud(W * .15, H * .12, Math.min(W, H) / 700) + cloud(W * .5, H * .22, Math.min(W, H) / 900) + cloud(W * .9, H * .32, Math.min(W, H) / 1000);
  s += hills(W, H, H * .78, H * .14, P.h[0], 11, 3) + hills(W, H, H * .86, H * .1, P.h[1], 23, 4) + hills(W, H, H * .94, H * .08, P.h[2], 37, 5);
  const u = Math.min(W, H) / 10;
  s += tree(W * .08, H * .9, u * 1.3, night ? '#5866b0' : '#7fcf7a') + tree(W * .93, H * .88, u * 1.1, night ? '#5866b0' : '#69c26f');
  if (!night) s += scatter(W, H, 14, 5, (x, y, r) => flower(x, y, u * (.14 + r() * .08), ['#ff9fb0', '#ffd76a', '#b9a4ff', '#fff'][(r() * 4) | 0], '#ffd76a', false), [0, .9, 1, .99]);
  s += bunny(W * .2, H * .97, u * .55) + (night ? '' : bunny(W * .82, H * .985, u * .42, '#fff7ea'));
  return s;
};
S.forest = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#c9f0ff'], [.7, '#f3ffe6'], [1, '#e2f7c9']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += `<g class="bob" style="--d:7s"><circle cx="${f(W * .16)}" cy="${f(H * .14)}" r="${f(u * .9)}" fill="#ffe27a"/>${face(W * .16, H * .14, u * .45)}</g>`;
  s += cloud(W * .55, H * .1, u / 70) + cloud(W * .88, H * .2, u / 90);
  s += hills(W, H, H * .7, H * .12, '#bfe8a6', 3, 3);
  s += scatter(W, H, 9, 9, (x, y, r) => tree(x, y, u * (1.1 + r() * .5), ['#8fd68a', '#74c779', '#a3dc8c'][(r() * 3) | 0]), [0, .66, 1, .74]);
  s += hills(W, H, H * .86, H * .08, '#9bd98d', 13, 4);
  s += tree(W * .06, H * .95, u * 2, '#5fbf6c', '#9a6648', true) + tree(W * .95, H * .96, u * 1.8, '#6bc673', '#9a6648');
  s += mushroom(W * .18, H * .97, u * .6) + mushroom(W * .86, H * .985, u * .45, '#ffb35c');
  s += bunny(W * .7, H * .96, u * .5);
  s += scatter(W, H, 18, 21, (x, y, r) => `<circle class="float" style="--d:${f(5 + r() * 5)}s" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 3)}" fill="#fffbd0" opacity=".9"/>`, [0, .35, 1, .85]);
  return s;
};
S.harbor = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#a9e2ff'], [.55, '#e8f8ff'], [.56, '#7cc8f2'], [1, '#4da7dd']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += cloud(W * .2, H * .12, u / 80) + cloud(W * .75, H * .08, u / 70);
  s += `<g class="bob" style="--d:5s"><g transform="translate(${f(W * .78)} ${f(H * .62)})"><path d="M${f(-u)} 0h${f(u * 2)}l${f(-u * .3)} ${f(u * .45)}h${f(-u * 1.4)}Z" fill="#ff8a7a"/><path d="M0 0V${f(-u * 1.3)}L${f(u * .8)} ${f(-u * .2)}Z" fill="#fff"/></g></g>`;
  s += `<g><rect x="${f(W * .08)}" y="${f(H * .32)}" width="${f(u * .7)}" height="${f(H * .25)}" fill="#fff"/><rect x="${f(W * .08)}" y="${f(H * .38)}" width="${f(u * .7)}" height="${f(H * .04)}" fill="#ff7b7b"/><rect x="${f(W * .08)}" y="${f(H * .47)}" width="${f(u * .7)}" height="${f(H * .04)}" fill="#ff7b7b"/><path d="M${f(W * .08 - u * .15)} ${f(H * .32)}h${f(u)}l${f(-u * .5)} ${f(-u * .6)}Z" fill="#ff7b7b"/><circle class="glow" cx="${f(W * .08 + u * .35)}" cy="${f(H * .32 - u * .15)}" r="${f(u * .14)}" fill="#ffe27a"/></g>`;
  s += scatter(W, H, 10, 4, (x, y, r) => `<path class="wave" style="--d:${f(3 + r() * 3)}s" d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .12)} ${f(u * .4)} 0t${f(u * .4)} 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`, [0, .58, 1, .76]);
  // town on the quay
  s += `<rect x="0" y="${f(H * .8)}" width="${W}" height="${f(H * .2)}" fill="#f2d6b0"/>`;
  const cols = [['#fff1e0', '#ff8f7a'], ['#e6f4ff', '#6aa9e8'], ['#fff6c9', '#f2a65a'], ['#ffe6ef', '#e37ba0'], ['#eaffea', '#5fb27a']];
  const n = Math.max(4, Math.round(W / (u * 1.6)));
  for (let i = 0; i < n; i++) { const [w, r] = cols[i % cols.length]; s += house(W * (i + .5) / n, H * .82, u * 1.2, w, r); }
  s += cat(W * .22, H * .96, u * .7) + cat(W * .62, H * .975, u * .6, '#8a8a99', true) + cat(W * .88, H * .965, u * .55, '#fff');
  s += scatter(W, H, 4, 8, (x, y) => `<g class="float" style="--d:7s"><path d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0" fill="none" stroke="#5b6b85" stroke-width="3" stroke-linecap="round"/></g>`, [.3, .05, .9, .3]);
  return s;
};
S.sweets = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#ffd9ec'], [.6, '#fff0f6'], [1, '#ffe6d2']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 26, 31, (x, y, r) => sparkle(x, y, 4 + r() * 6, ['#fff', '#ffc2dc', '#c9b6ff'][(r() * 3) | 0]), [0, 0, 1, .6]);
  s += cloud(W * .2, H * .15, u / 75, '#fff') + cloud(W * .8, H * .1, u / 85, '#fff');
  // cream hills
  s += hills(W, H, H * .78, H * .1, '#ffc6dc', 5, 4) + hills(W, H, H * .88, H * .07, '#fff3e3', 15, 5);
  const lolli = (x, y, sz, c1, c2) => `<g class="sway" style="--d:4s"><rect x="${f(x - sz * .05)}" y="${f(y - sz * 1.4)}" width="${f(sz * .1)}" height="${f(sz * 1.4)}" fill="#fff" stroke="#f5c6d6"/><circle cx="${f(x)}" cy="${f(y - sz * 1.6)}" r="${f(sz * .55)}" fill="${c1}"/><path d="M${f(x)} ${f(y - sz * 1.6)}m${f(-sz * .35)} 0a${f(sz * .35)} ${f(sz * .35)} 0 1 1 ${f(sz * .35)} ${f(sz * .35)}a${f(sz * .2)} ${f(sz * .2)} 0 1 1 ${f(-sz * .2)} ${f(-sz * .2)}" fill="none" stroke="${c2}" stroke-width="${f(sz * .12)}" stroke-linecap="round"/></g>`;
  s += lolli(W * .1, H * .86, u * 1.2, '#ff8fb6', '#fff') + lolli(W * .92, H * .84, u, '#9fd8ff', '#fff') + lolli(W * .32, H * .8, u * .7, '#ffd36b', '#fff');
  const cup = (x, y, sz) => `<g class="bob" style="--d:5s"><path d="M${f(x - sz * .55)} ${f(y - sz * .6)}L${f(x - sz * .4)} ${f(y)}H${f(x + sz * .4)}L${f(x + sz * .55)} ${f(y - sz * .6)}Z" fill="#ffb2c8"/><path d="M${f(x - sz * .65)} ${f(y - sz * .6)}Q${f(x - sz * .7)} ${f(y - sz * 1.2)} ${f(x)} ${f(y - sz * 1.35)}Q${f(x + sz * .7)} ${f(y - sz * 1.2)} ${f(x + sz * .65)} ${f(y - sz * .6)}Z" fill="#fff8f0"/><circle cx="${f(x)}" cy="${f(y - sz * 1.42)}" r="${f(sz * .16)}" fill="#ff5d7a"/>${face(x, y - sz * .9, sz * .22)}</g>`;
  s += cup(W * .72, H * .95, u * 1.1) + cup(W * .22, H * .97, u * .8);
  const donut = (x, y, sz, ic) => `<g class="float" style="--d:6s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(sz)}" fill="#e8b27a"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * .86)}" fill="${ic}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * .32)}" fill="#ffe8f1"/></g>`;
  s += donut(W * .5, H * .1, u * .45, '#ff9fc5') + donut(W * .07, H * .45, u * .35, '#a8e0ff') + donut(W * .94, H * .5, u * .4, '#c7b2ff');
  s += scatter(W, H, 30, 41, (x, y, r) => `<rect class="fall" style="--d:${f(8 + r() * 8)}s;--o:${f(-r() * 10)}s" x="${f(x)}" y="${f(y)}" width="${f(u * .08)}" height="${f(u * .22)}" rx="${f(u * .04)}" fill="${['#ff8fb6', '#9fd8ff', '#ffd36b', '#9fe6b4', '#c7b2ff'][(r() * 5) | 0]}" transform="rotate(${(r() * 180) | 0} ${f(x)} ${f(y)})"/>`, [0, -.1, 1, .7]);
  return s;
};
S.sea = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#8fe3f2'], [.5, '#4fb6dd'], [1, '#2a7fbf']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 6, 3, (x, y, r) => `<path d="M${f(x)} 0L${f(x + u * (1 + r()))} 0L${f(x + u * 2.6)} ${f(H * .7)}L${f(x + u * .6)} ${f(H * .7)}Z" fill="#fff" opacity=".08"/>`, [0, 0, 1, 0]);
  s += `<path d="M0 ${f(H * .9)}Q${f(W * .25)} ${f(H * .82)} ${f(W * .5)} ${f(H * .9)}T${W} ${f(H * .88)}V${H}H0Z" fill="#f6dfaa"/>`;
  const weed = (x, y, h, c) => `<path class="sway" style="--d:${f(3 + (x % 3))}s" d="M${f(x)} ${f(y)}q${f(-u * .3)} ${f(-h * .25)} 0 ${f(-h * .5)}t0 ${f(-h * .5)}" fill="none" stroke="${c}" stroke-width="${f(u * .18)}" stroke-linecap="round"/>`;
  s += scatter(W, H, 9, 19, (x, y, r) => weed(x, y, u * (1.4 + r() * 1.6), ['#6fd39b', '#4fbf86', '#8fe0a8'][(r() * 3) | 0]), [0, .88, 1, .95]);
  const coral = (x, y, sz, c) => `<g fill="none" stroke="${c}" stroke-width="${f(sz * .2)}" stroke-linecap="round"><path d="M${f(x)} ${f(y)}V${f(y - sz)}M${f(x)} ${f(y - sz * .5)}l${f(-sz * .4)} ${f(-sz * .4)}M${f(x)} ${f(y - sz * .7)}l${f(sz * .45)} ${f(-sz * .4)}"/></g>`;
  s += coral(W * .14, H * .96, u * 1.2, '#ff8fa3') + coral(W * .8, H * .95, u, '#ffb26b') + coral(W * .55, H * .98, u * .7, '#ff8fa3');
  s += `<g><path d="M${f(W * .34)} ${f(H * .97)}a${f(u * .5)} ${f(u * .5)} 0 0 1 ${f(u)} 0Z" fill="#ffd1dc"/>${face(W * .34 + u * .5, H * .955, u * .15)}</g>`;
  s += fish(W * .2, H * .3, u * .6, '#ffd36b') + fish(W * .78, H * .22, u * .5, '#ff9fb0') + fish(W * .6, H * .55, u * .45, '#b9a4ff') + fish(W * .1, H * .62, u * .4, '#9fe6ff');
  // whale
  s += `<g class="bob" style="--d:8s"><g transform="translate(${f(W * .86)} ${f(H * .7)})"><ellipse cx="0" cy="0" rx="${f(u * 1.2)}" ry="${f(u * .7)}" fill="#7aa7ff"/><path d="M${f(u * 1)} ${f(-u * .1)}l${f(u * .6)} ${f(-u * .5)}l${f(-u * .1)} ${f(u * .6)}l${f(u * .2)} ${f(u * .4)}Z" fill="#7aa7ff"/><ellipse cx="${f(-u * .2)}" cy="${f(u * .3)}" rx="${f(u * .8)}" ry="${f(u * .3)}" fill="#cfe0ff"/>${face(-u * .55, -u * .05, u * .3)}</g></g>`;
  s += scatter(W, H, 26, 29, (x, y, r) => `<circle class="rise" style="--d:${f(6 + r() * 8)}s;--o:${f(-r() * 12)}s" cx="${f(x)}" cy="${f(y)}" r="${f(3 + r() * 8)}" fill="none" stroke="#fff" stroke-width="2" opacity=".75"/>`, [0, .3, 1, 1]);
  return s;
};
S.garden = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#d7f1ff'], [.6, '#fff8ea'], [1, '#e9f9d9']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += `<g opacity=".55"><path d="M${f(-W * .1)} ${f(H * .75)}A${f(W * .6)} ${f(H * .6)} 0 0 1 ${f(W * 1.1)} ${f(H * .75)}" fill="none" stroke="#ffb3c6" stroke-width="${f(u * .25)}"/><path d="M${f(-W * .1)} ${f(H * .75)}A${f(W * .6)} ${f(H * .6)} 0 0 1 ${f(W * 1.1)} ${f(H * .75)}" fill="none" stroke="#ffe08a" stroke-width="${f(u * .25)}" transform="translate(0 ${f(u * .25)})"/><path d="M${f(-W * .1)} ${f(H * .75)}A${f(W * .6)} ${f(H * .6)} 0 0 1 ${f(W * 1.1)} ${f(H * .75)}" fill="none" stroke="#a8e6b5" stroke-width="${f(u * .25)}" transform="translate(0 ${f(u * .5)})"/><path d="M${f(-W * .1)} ${f(H * .75)}A${f(W * .6)} ${f(H * .6)} 0 0 1 ${f(W * 1.1)} ${f(H * .75)}" fill="none" stroke="#b3d4ff" stroke-width="${f(u * .25)}" transform="translate(0 ${f(u * .75)})"/></g>`;
  s += cloud(W * .1, H * .7, u / 60) + cloud(W * .9, H * .72, u / 60);
  s += hills(W, H, H * .8, H * .08, '#bfeaa0', 7, 3) + hills(W, H, H * .9, H * .06, '#9bdc84', 17, 4);
  s += scatter(W, H, Math.round(W / u * 2.2), 13, (x, y, r) => flower(x, y, u * (.2 + r() * .14), ['#ff8fb6', '#ffd36b', '#b9a4ff', '#ff9f7a', '#fff'][(r() * 5) | 0]), [0, .8, 1, .9]);
  const tulip = (x, y, sz, c) => `<g class="sway" style="--d:4s"><path d="M${f(x)} ${f(y)}V${f(y - sz * 1.6)}" stroke="#5fb36b" stroke-width="${f(sz * .14)}"/><path d="M${f(x - sz * .4)} ${f(y - sz * 2.1)}v${f(sz * .3)}q0 ${f(sz * .4)} ${f(sz * .4)} ${f(sz * .4)}q${f(sz * .4)} 0 ${f(sz * .4)} ${f(-sz * .4)}v${f(-sz * .3)}l${f(-sz * .2)} ${f(sz * .2)}l${f(-sz * .2)} ${f(-sz * .25)}l${f(-sz * .2)} ${f(sz * .25)}Z" fill="${c}"/></g>`;
  s += scatter(W, H, Math.round(W / u * 1.2), 23, (x, y, r) => tulip(x, y, u * (.4 + r() * .2), ['#ff6f91', '#ffb347', '#c38fff', '#ff8fb6'][(r() * 4) | 0]), [0, .94, 1, 1.02]);
  const fly = (x, y, sz, c) => `<g class="flutter" style="--d:${f(6 + (x % 5))}s"><g transform="translate(${f(x)} ${f(y)})"><ellipse cx="${f(-sz * .4)}" cy="${f(-sz * .2)}" rx="${f(sz * .45)}" ry="${f(sz * .35)}" fill="${c}"/><ellipse cx="${f(sz * .4)}" cy="${f(-sz * .2)}" rx="${f(sz * .45)}" ry="${f(sz * .35)}" fill="${c}"/><ellipse cx="${f(-sz * .3)}" cy="${f(sz * .25)}" rx="${f(sz * .3)}" ry="${f(sz * .25)}" fill="${c}"/><ellipse cx="${f(sz * .3)}" cy="${f(sz * .25)}" rx="${f(sz * .3)}" ry="${f(sz * .25)}" fill="${c}"/><rect x="${f(-sz * .06)}" y="${f(-sz * .4)}" width="${f(sz * .12)}" height="${f(sz * .8)}" rx="${f(sz * .06)}" fill="#5b4a4a"/></g></g>`;
  s += fly(W * .2, H * .3, u * .5, '#ffb3d1') + fly(W * .75, H * .18, u * .45, '#ffe08a') + fly(W * .5, H * .45, u * .35, '#b3d4ff');
  s += scatter(W, H, 16, 37, (x, y, r) => `<ellipse class="fall" style="--d:${f(10 + r() * 8)}s;--o:${f(-r() * 14)}s" cx="${f(x)}" cy="${f(y)}" rx="${f(u * .09)}" ry="${f(u * .06)}" fill="#ffc6d6"/>`, [0, -.1, 1, .6]);
  return s;
};
S.festival = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#2b2a6b'], [.55, '#7b4f9e'], [.85, '#ff9a8b'], [1, '#ffcf8a']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 30, 3, (x, y, r) => sparkle(x, y, 2 + r() * 3, '#fff6c9'), [0, 0, 1, .45]);
  const fw = (x, y, rad, c, d) => { let p = ''; for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; p += `<line x1="${f(x + Math.cos(a) * rad * .25)}" y1="${f(y + Math.sin(a) * rad * .25)}" x2="${f(x + Math.cos(a) * rad)}" y2="${f(y + Math.sin(a) * rad)}"/><circle cx="${f(x + Math.cos(a) * rad * 1.12)}" cy="${f(y + Math.sin(a) * rad * 1.12)}" r="${f(rad * .05)}" fill="${c}"/>`; } return `<g class="burst" style="--d:3.2s;--o:${d}s;transform-origin:${f(x)}px ${f(y)}px" stroke="${c}" stroke-width="${f(rad * .045)}" stroke-linecap="round">${p}</g>`; };
  s += fw(W * .2, H * .18, u * 1.3, '#ffd36b', 0) + fw(W * .78, H * .14, u * 1.1, '#ff8fb6', -1.1) + fw(W * .5, H * .3, u * .8, '#9fe6ff', -2.2);
  // string of lanterns
  const ly = H * .52; s += `<path d="M0 ${f(ly)}Q${f(W / 2)} ${f(ly + u * .8)} ${W} ${f(ly)}" fill="none" stroke="#3b2b4b" stroke-width="2"/>`;
  const n = Math.max(5, Math.round(W / (u * 1.3)));
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = W * t, y = ly + u * .8 * 4 * t * (1 - t) * .5 + u * .05; s += `<g class="sway" style="--d:${f(3 + i % 3)}s;transform-origin:${f(x)}px ${f(y)}px"><rect x="${f(x - u * .05)}" y="${f(y)}" width="${f(u * .1)}" height="${f(u * .1)}" fill="#3b2b4b"/><ellipse class="glow" cx="${f(x)}" cy="${f(y + u * .45)}" rx="${f(u * .3)}" ry="${f(u * .36)}" fill="${i % 2 ? '#ff6b6b' : '#ffe08a'}"/><path d="M${f(x - u * .28)} ${f(y + u * .45)}h${f(u * .56)}" stroke="#3b2b4b" stroke-opacity=".3" stroke-width="2"/></g>`; }
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#4b3266"/>`;
  // stalls
  const stall = (x, sz, c) => `<g><rect x="${f(x - sz * .7)}" y="${f(H * .86 - sz * .8)}" width="${f(sz * 1.4)}" height="${f(sz * .8)}" fill="#f6e3c4"/><path d="M${f(x - sz * .85)} ${f(H * .86 - sz * .8)}h${f(sz * 1.7)}l${f(-sz * .15)} ${f(-sz * .35)}h${f(-sz * 1.4)}Z" fill="${c}"/><rect x="${f(x - sz * .7)}" y="${f(H * .86 - sz * .8)}" width="${f(sz * 1.4)}" height="${f(sz * .12)}" fill="#fff" opacity=".5"/></g>`;
  s += stall(W * .12, u * 1.4, '#ff6b6b') + stall(W * .88, u * 1.3, '#5aa8ff');
  // goldfish bowl
  s += `<g><circle cx="${f(W * .5)}" cy="${f(H * .93)}" r="${f(u * .7)}" fill="#bfe8ff" opacity=".85"/>${fish(W * .5, H * .94, u * .35, '#ff7b5c', 'swim2')}</g>`;
  return s;
};
S.autumn = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#ffe2b8'], [.65, '#fff1dc'], [1, '#f6d1a3']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += `<g class="bob" style="--d:7s"><circle cx="${f(W * .82)}" cy="${f(H * .14)}" r="${f(u * .8)}" fill="#ffb35c"/>${face(W * .82, H * .14, u * .4)}</g>`;
  s += cloud(W * .25, H * .12, u / 85, '#fff7ec');
  s += hills(W, H, H * .72, H * .1, '#f2c48e', 4, 3);
  s += scatter(W, H, 9, 8, (x, y, r) => tree(x, y, u * (1.1 + r() * .5), ['#ff9f5c', '#ffcf5c', '#ff7b5c', '#e8a45c'][(r() * 4) | 0], '#8f5b3e'), [0, .7, 1, .78]);
  s += hills(W, H, H * .88, H * .06, '#e8b27a', 19, 4);
  // mushroom houses
  const mh = (x, sz, cap) => `<g>${mushroom(x, H * .96, sz, cap)}<rect x="${f(x - sz * .1)}" y="${f(H * .96 - sz * .3)}" width="${f(sz * .2)}" height="${f(sz * .3)}" rx="${f(sz * .1)}" fill="#c98a5c"/></g>`;
  s += mh(W * .14, u * 1.3, '#ff7b6b') + mh(W * .86, u * 1.1, '#ffb35c') + mushroom(W * .32, H * .985, u * .5, '#c38fff') + mushroom(W * .7, H * .99, u * .45, '#ff7b6b');
  // squirrel-ish acorns
  const acorn = (x, y, sz) => `<g class="bob" style="--d:4s"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(sz * .4)}" ry="${f(sz * .5)}" fill="#d08b4a"/><path d="M${f(x - sz * .5)} ${f(y - sz * .2)}q${f(sz * .5)} ${f(-sz * .6)} ${f(sz)} 0Z" fill="#8f5b3e"/><path d="M${f(x)} ${f(y - sz * .55)}v${f(-sz * .2)}" stroke="#8f5b3e" stroke-width="${f(sz * .1)}" stroke-linecap="round"/>${face(x, y + sz * .05, sz * .2)}</g>`;
  s += acorn(W * .45, H * .97, u * .45) + acorn(W * .55, H * .975, u * .35);
  const leaf = (x, y, sz, c, r) => `<path class="fall" style="--d:${f(9 + r() * 9)}s;--o:${f(-r() * 14)}s" d="M${f(x)} ${f(y)}q${f(sz)} ${f(-sz)} ${f(sz * 2)} 0q${f(-sz)} ${f(sz)} ${f(-sz * 2)} 0Z" fill="${c}"/>`;
  s += scatter(W, H, 26, 51, (x, y, r) => leaf(x, y, u * (.12 + r() * .1), ['#ff7b5c', '#ffb35c', '#ffd36b', '#e86c4a'][(r() * 4) | 0], r), [0, -.1, 1, .7]);
  return s;
};
S.snow = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#9fb8ff'], [.6, '#dfe8ff'], [1, '#f6f8ff']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += hills(W, H, H * .74, H * .1, '#eef3ff', 5, 3);
  const pine = (x, y, sz) => `<g><path d="M${f(x)} ${f(y - sz * 1.6)}l${f(sz * .5)} ${f(sz * .7)}h${f(-sz * .2)}l${f(sz * .4)} ${f(sz * .6)}h${f(-sz * 1.4)}l${f(sz * .4)} ${f(-sz * .6)}h${f(-sz * .2)}Z" fill="#6fae9a"/><path d="M${f(x)} ${f(y - sz * 1.6)}l${f(sz * .25)} ${f(sz * .35)}h${f(-sz * .5)}Z" fill="#fff"/><rect x="${f(x - sz * .08)}" y="${f(y - sz * .3)}" width="${f(sz * .16)}" height="${f(sz * .3)}" fill="#9a6648"/></g>`;
  s += scatter(W, H, 8, 7, (x, y, r) => pine(x, y, u * (.7 + r() * .5)), [0, .74, 1, .8]);
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#fff"/>`;
  const n = Math.max(3, Math.round(W / (u * 2.2)));
  for (let i = 0; i < n; i++) { const x = W * (i + .5) / n; s += house(x, H * .88, u * 1.3, ['#ffe1c4', '#e1ecff', '#ffe6ef'][i % 3], ['#e36f6f', '#6f8fe3', '#c96fe3'][i % 3], true) + `<path d="M${f(x - u * .9)} ${f(H * .88 - u * 1.02)}L${f(x)} ${f(H * .88 - u * 1.78)}L${f(x + u * .9)} ${f(H * .88 - u * 1.02)}" fill="none" stroke="#fff" stroke-width="${f(u * .14)}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  // snowman
  s += `<g><circle cx="${f(W * .2)}" cy="${f(H * .955)}" r="${f(u * .55)}" fill="#fff" stroke="#dde6ff" stroke-width="3"/><circle cx="${f(W * .2)}" cy="${f(H * .955 - u * .8)}" r="${f(u * .4)}" fill="#fff" stroke="#dde6ff" stroke-width="3"/>${face(W * .2, H * .955 - u * .82, u * .18)}<path d="M${f(W * .2 - u * .4)} ${f(H * .955 - u * .5)}h${f(u * .8)}" stroke="#ff6b6b" stroke-width="${f(u * .14)}" stroke-linecap="round"/><path d="M${f(W * .2 - u * .3)} ${f(H * .955 - u * 1.12)}h${f(u * .6)}l${f(-u * .1)} ${f(-u * .3)}h${f(-u * .4)}Z" fill="#5b6bb5"/></g>`;
  s += bunny(W * .8, H * .975, u * .45);
  s += scatter(W, H, 60, 61, (x, y, r) => `<circle class="snowf" style="--d:${f(8 + r() * 10)}s;--o:${f(-r() * 18)}s" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 4)}" fill="#fff" opacity=".9"/>`, [0, -.1, 1, .9]);
  return s;
};
S.stars = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#16184a'], [.6, '#3b2f7a'], [1, '#6a4fa0']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 90, 77, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r() * 1.8)}" fill="#fff"/>`, [0, 0, 1, .85]);
  s += scatter(W, H, 10, 79, (x, y, r) => star(x, y, u * (.12 + r() * .12), ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), [0, 0, 1, .7]);
  // milky way
  s += `<path d="M${f(-W * .1)} ${f(H * .7)}Q${f(W * .5)} ${f(H * .1)} ${f(W * 1.1)} ${f(H * .25)}" fill="none" stroke="#b9a4ff" stroke-opacity=".15" stroke-width="${f(u * 1.6)}" stroke-linecap="round"/>`;
  s += `<g class="bob" style="--d:8s"><circle cx="${f(W * .8)}" cy="${f(H * .16)}" r="${f(u * 1.2)}" fill="#fff3c4" opacity=".18"/><circle cx="${f(W * .8)}" cy="${f(H * .16)}" r="${f(u * .8)}" fill="#fff3c4"/><circle cx="${f(W * .8 - u * .3)}" cy="${f(H * .16 + u * .3)}" r="${f(u * .12)}" fill="#f2deb0"/><circle cx="${f(W * .8 + u * .35)}" cy="${f(H * .16 - u * .35)}" r="${f(u * .08)}" fill="#f2deb0"/>${face(W * .8, H * .16, u * .35, '#5a4a6a')}</g>`;
  s += `<g class="shoot"><path d="M${f(W * .1)} ${f(H * .1)}l${f(u * 1.8)} ${f(u * .6)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${star(W * .1 + u * 1.9, H * .1 + u * .63, u * .14, '#fff')}</g>`;
  s += hills(W, H, H * .88, H * .08, '#2a2160', 9, 3);
  s += `<g><path d="M${f(W * .2)} ${f(H * .88)}v${f(-u * 1.2)}" stroke="#4a3d8a" stroke-width="${f(u * .12)}"/><circle cx="${f(W * .2)}" cy="${f(H * .88 - u * 1.25)}" r="${f(u * .12)}" fill="#ffe27a" class="glow"/></g>`;
  s += cat(W * .74, H * .9, u * .6, '#3a2f5a') + `<circle cx="${f(W * .74 - u * .32 * .6 - u * .08)}" cy="${f(H * .9 - u * .78 * .6)}" r="${f(u * .03)}" fill="#ffe27a"/>`;
  return s;
};
S.castle = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#c9b6ff'], [.55, '#ffd6ef'], [1, '#fff0d6']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 30, 91, (x, y, r) => sparkle(x, y, 3 + r() * 6, ['#fff', '#fff3b0', '#ffd1e8'][(r() * 3) | 0]), [0, 0, 1, .7]);
  const rb = ['#ff9fb0', '#ffd36b', '#9fe6b4', '#9fd8ff', '#c7b2ff'];
  rb.forEach((c, i) => { s += `<path d="M${f(W * .05)} ${f(H * .8)}A${f(W * .45)} ${f(H * .55)} 0 0 1 ${f(W * .95)} ${f(H * .8)}" fill="none" stroke="${c}" stroke-width="${f(u * .2)}" opacity=".55" transform="translate(0 ${f(i * u * .2)})"/>`; });
  s += cloud(W * .15, H * .25, u / 60, '#fff') + cloud(W * .85, H * .3, u / 70, '#fff');
  const cx = W * .5, base = H * .9, cw = u * 3.2;
  const tower = (x, w, h, roof) => `<rect x="${f(x - w / 2)}" y="${f(base - h)}" width="${f(w)}" height="${f(h)}" fill="#fff4fb" stroke="#f0cfe3" stroke-width="2"/><path d="M${f(x - w * .65)} ${f(base - h)}L${f(x)} ${f(base - h - w * 1.3)}L${f(x + w * .65)} ${f(base - h)}Z" fill="${roof}"/><path d="M${f(x)} ${f(base - h - w * 1.3)}v${f(-w * .4)}l${f(w * .4)} ${f(w * .15)}l${f(-w * .4)} ${f(w * .15)}" fill="#ff8fb6" stroke="#c98fb0" stroke-width="1.5"/><rect x="${f(x - w * .12)}" y="${f(base - h * .75)}" width="${f(w * .24)}" height="${f(w * .32)}" rx="${f(w * .12)}" fill="#b9d8ff"/>`;
  s += `<g>${tower(cx - cw * .55, u * .8, u * 2.4, '#c38fff')}${tower(cx + cw * .55, u * .8, u * 2.4, '#c38fff')}<rect x="${f(cx - cw * .45)}" y="${f(base - u * 1.8)}" width="${f(cw * .9)}" height="${f(u * 1.8)}" fill="#fff4fb" stroke="#f0cfe3" stroke-width="2"/>${tower(cx, u * 1.1, u * 3.2, '#ff8fb6')}<path d="M${f(cx - u * .4)} ${f(base)}v${f(-u * .6)}a${f(u * .4)} ${f(u * .4)} 0 0 1 ${f(u * .8)} 0v${f(u * .6)}Z" fill="#c98fb0"/></g>`;
  s += hills(W, H, H * .92, H * .05, '#ffe0f0', 33, 4);
  s += `<g class="float" style="--d:6s">${star(W * .5, H * .1, u * .35, '#ffe27a')}${face(W * .5, H * .105, u * .15)}</g>`;
  s += bunny(W * .15, H * .985, u * .5) + cat(W * .86, H * .985, u * .55, '#fff');
  return s;
};

/* wonder room (variant collection): checkered floor, floating toy blocks and balloons */
S.wonder = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = sky('sk', [[0, '#d9ccff'], [.6, '#ffe3f1'], [1, '#fff1d6']]) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
  s += scatter(W, H, 26, 17, (x, y, r) => sparkle(x, y, 3 + r() * 6, ['#fff', '#fff3b0', '#ffd1e8'][(r() * 3) | 0]), [0, 0, 1, .7]);
  // checkered floor in perspective
  const fy = H * .8; let fl = `<rect x="0" y="${f(fy)}" width="${W}" height="${f(H - fy)}" fill="#ffe7c7"/>`;
  const n = 14;
  for (let i = -n; i <= n; i += 2) fl += `<path d="M${f(W / 2 + i * W / n * .35)} ${f(fy)}L${f(W / 2 + (i + 1) * W / n * .35)} ${f(fy)}L${f(W / 2 + (i + 1) * W / n * 1.6)} ${H}L${f(W / 2 + i * W / n * 1.6)} ${H}Z" fill="#ffd2e2" opacity=".75"/>`;
  s += fl;
  const block = (x, y, sz, c, ch, d) => `<g class="bob" style="--d:${d}s"><g transform="translate(${f(x)} ${f(y)}) rotate(${(x * 7) % 20 - 10})"><rect x="${f(-sz / 2)}" y="${f(-sz / 2)}" width="${f(sz)}" height="${f(sz)}" rx="${f(sz * .18)}" fill="${c}"/><rect x="${f(-sz / 2)}" y="${f(-sz / 2)}" width="${f(sz)}" height="${f(sz * .3)}" rx="${f(sz * .18)}" fill="#fff" opacity=".35"/><text x="0" y="${f(sz * .2)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(sz * .6)}" fill="#fff">${ch}</text></g></g>`;
  s += block(W * .12, H * .3, u * 1.1, '#ff9fb8', 7, 5) + block(W * .86, H * .22, u * 1.2, '#8fc4ff', 3, 6) + block(W * .78, H * .62, u * .8, '#ffcd6b', 9, 4.5) + block(W * .2, H * .64, u * .9, '#9fe0b4', 5, 5.5) + block(W * .5, H * .12, u * .6, '#c7a8ff', 1, 7);
  const balloon = (x, y, c) => `<g class="float" style="--d:${f(5 + (x % 3))}s"><path d="M${f(x)} ${f(y + u * .55)}q${f(-u * .2)} ${f(u * .5)} 0 ${f(u * 1.1)}" stroke="#a99" fill="none" stroke-width="1.5"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(u * .42)}" ry="${f(u * .52)}" fill="${c}"/><ellipse cx="${f(x - u * .14)}" cy="${f(y - u * .2)}" rx="${f(u * .08)}" ry="${f(u * .14)}" fill="#fff" opacity=".6"/></g>`;
  s += balloon(W * .32, H * .2, '#ff8fb6') + balloon(W * .66, H * .38, '#ffd36b') + balloon(W * .93, H * .45, '#9fd8ff');
  s += bunny(W * .1, H * .97, u * .5) + cat(W * .9, H * .975, u * .55, '#c7a8ff', true);
  return s;
};

/* time of day: evening and night versions of every scene */
function timeLayer(name, W, H, tod, variant) {
  if (!tod || tod === 'day') return '';
  const alreadyNight = name === 'stars' || (name === 'daily' && variant === 'h');
  if (tod === 'eve') {
    if (alreadyNight) return '';
    const id = 'ev' + (++GID);
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".55" stop-color="#ffb37a"/><stop offset="1" stop-color="#c58bd8"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})" opacity=".42" style="mix-blend-mode:multiply"/><circle cx="${f(W * .82)}" cy="${f(H * .62)}" r="${f(Math.min(W, H) * .09)}" fill="#ffcf7a" opacity=".55"/>`;
  }
  if (alreadyNight) return '';
  const id = 'nt' + (++GID), u = Math.min(W, H) / 10;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141848"/><stop offset=".6" stop-color="#2c2a6b"/><stop offset="1" stop-color="#3b2f6e"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})" opacity=".78" style="mix-blend-mode:multiply"/><rect width="${W}" height="${H}" fill="#1a1d4f" opacity=".25"/>`;
  s += scatter(W, H, 70, 99, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.7 + r() * 1.6)}" fill="#fff"/>`, [0, 0, 1, .5]);
  const mx = W * .16, my = H * .13, mr = u * .75, mk = 'nm' + GID;
  s += `<g class="bob" style="--d:8s"><circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr * 1.7)}" fill="#fff6c9" opacity=".12"/><mask id="${mk}"><circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr)}" fill="#fff"/><circle cx="${f(mx + mr * .55)}" cy="${f(my - mr * .3)}" r="${f(mr * .85)}" fill="#000"/></mask><circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr)}" fill="#fff3c4" mask="url(#${mk})"/>${face(mx - mr * .4, my + mr * .2, mr * .26, '#7a6a4a')}</g>`;
  s += scatter(W, H, 16, 101, (x, y, r) => `<circle class="float" style="--d:${f(4 + r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 2.5)}" fill="#fff5a8" opacity=".9"><animate attributeName="opacity" values=".2;1;.2" dur="${f(2 + r() * 3)}s" repeatCount="indefinite"/></circle>`, [0, .6, 1, .95]);
  return s;
}

/* small theme decorations for the collection map */
const DECO = {
  forest: [(x, y, s, r) => tree(x, y, s * 1.4, ['#8fd68a', '#74c779', '#a3dc8c'][(r() * 3) | 0]), (x, y, s) => mushroom(x, y, s * .6), (x, y, s, r) => flower(x, y, s * .22, ['#ff9fb0', '#ffd76a', '#fff'][(r() * 3) | 0], '#ffd76a', false), (x, y, s) => bunny(x, y, s * .45)],
  harbor: [(x, y, s, r) => house(x, y, s * 1.1, ['#fff1e0', '#e6f4ff', '#fff6c9'][(r() * 3) | 0], ['#ff8f7a', '#6aa9e8', '#f2a65a'][(r() * 3) | 0]), (x, y, s, r) => cat(x, y, s * .6, ['#f6b56b', '#8a8a99', '#fff'][(r() * 3) | 0], r() < .5), (x, y, s) => `<path d="M${f(x - s * .4)} ${f(y)}q${f(s * .2)} ${f(-s * .12)} ${f(s * .4)} 0t${f(s * .4)} 0" stroke="#7cc8f2" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  sweets: [(x, y, s, r) => `<g><rect x="${f(x - s * .04)}" y="${f(y - s)}" width="${f(s * .08)}" height="${f(s)}" fill="#fff" stroke="#f5c6d6"/><circle cx="${f(x)}" cy="${f(y - s * 1.1)}" r="${f(s * .32)}" fill="${['#ff8fb6', '#9fd8ff', '#ffd36b'][(r() * 3) | 0]}"/><path d="M${f(x - s * .18)} ${f(y - s * 1.1)}a${f(s * .18)} ${f(s * .18)} 0 1 1 ${f(s * .18)} ${f(s * .18)}" stroke="#fff" stroke-width="${f(s * .07)}" fill="none"/></g>`, (x, y, s, r) => `<g><circle cx="${f(x)}" cy="${f(y - s * .3)}" r="${f(s * .32)}" fill="#e8b27a"/><circle cx="${f(x)}" cy="${f(y - s * .3)}" r="${f(s * .27)}" fill="${['#ff9fc5', '#a8e0ff', '#c7b2ff'][(r() * 3) | 0]}"/><circle cx="${f(x)}" cy="${f(y - s * .3)}" r="${f(s * .1)}" fill="#fff4f8"/></g>`, (x, y, s, r) => sparkle(x, y - s * .5, s * .15, '#fff', '')],
  sea: [(x, y, s, r) => fish(x, y - s * .4, s * .5, ['#ffd36b', '#ff9fb0', '#b9a4ff', '#9fe6ff'][(r() * 4) | 0], ''), (x, y, s) => `<path d="M${f(x)} ${f(y)}q${f(-s * .2)} ${f(-s * .4)} 0 ${f(-s * .8)}t0 ${f(-s * .7)}" stroke="#6fd39b" stroke-width="${f(s * .12)}" fill="none" stroke-linecap="round"/>`, (x, y, s) => `<g fill="none" stroke="#ff8fa3" stroke-width="${f(s * .1)}" stroke-linecap="round"><path d="M${f(x)} ${f(y)}V${f(y - s * .7)}M${f(x)} ${f(y - s * .35)}l${f(-s * .25)} ${f(-s * .25)}M${f(x)} ${f(y - s * .5)}l${f(s * .28)} ${f(-s * .25)}"/></g>`, (x, y, s) => `<circle cx="${f(x)}" cy="${f(y - s * .5)}" r="${f(s * .12)}" fill="none" stroke="#fff" stroke-width="2"/>`],
  garden: [(x, y, s, r) => flower(x, y - s * .6, s * .3, ['#ff8fb6', '#ffd36b', '#b9a4ff', '#ff9f7a'][(r() * 4) | 0]), (x, y, s, r) => flower(x, y - s * .2, s * .2, ['#fff', '#ffb3c6'][(r() * 2) | 0], '#ffd76a', false), (x, y, s) => bunny(x, y, s * .45)],
  festival: [(x, y, s, r) => `<g><ellipse cx="${f(x)}" cy="${f(y - s * .5)}" rx="${f(s * .25)}" ry="${f(s * .3)}" fill="${r() < .5 ? '#ff6b6b' : '#ffe08a'}"/><rect x="${f(x - s * .04)}" y="${f(y - s * .85)}" width="${f(s * .08)}" height="${f(s * .08)}" fill="#3b2b4b"/></g>`, (x, y, s) => fish(x, y - s * .3, s * .3, '#ff7b5c', ''), (x, y, s) => star(x, y - s * .5, s * .15, '#ffd36b')],
  autumn: [(x, y, s, r) => tree(x, y, s * 1.3, ['#ff9f5c', '#ffcf5c', '#ff7b5c'][(r() * 3) | 0], '#8f5b3e'), (x, y, s, r) => mushroom(x, y, s * .55, ['#ff7b6b', '#ffb35c', '#c38fff'][(r() * 3) | 0]), (x, y, s) => `<path d="M${f(x)} ${f(y - s * .3)}q${f(s * .2)} ${f(-s * .2)} ${f(s * .4)} 0q${f(-s * .2)} ${f(s * .2)} ${f(-s * .4)} 0Z" fill="#ff7b5c"/>`],
  snow: [(x, y, s) => `<g><path d="M${f(x)} ${f(y - s * 1.2)}l${f(s * .4)} ${f(s * .55)}h${f(-s * .15)}l${f(s * .3)} ${f(s * .45)}h${f(-s * 1.1)}l${f(s * .3)} ${f(-s * .45)}h${f(-s * .15)}Z" fill="#6fae9a"/><path d="M${f(x)} ${f(y - s * 1.2)}l${f(s * .2)} ${f(s * .28)}h${f(-s * .4)}Z" fill="#fff"/></g>`, (x, y, s) => `<g><circle cx="${f(x)}" cy="${f(y - s * .3)}" r="${f(s * .3)}" fill="#fff" stroke="#dde6ff" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y - s * .75)}" r="${f(s * .22)}" fill="#fff" stroke="#dde6ff" stroke-width="2"/>${face(x, y - s * .76, s * .1)}</g>`, (x, y, s, r) => house(x, y, s * .9, '#ffe1c4', '#e36f6f', true)],
  stars: [(x, y, s, r) => star(x, y - s * .5, s * (.15 + r() * .12), ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), (x, y, s) => sparkle(x, y - s * .4, s * .2, '#fff'), (x, y, s) => `<circle cx="${f(x)}" cy="${f(y - s * .4)}" r="${f(s * .18)}" fill="#c7a8ff"/><ellipse cx="${f(x)}" cy="${f(y - s * .4)}" rx="${f(s * .32)}" ry="${f(s * .08)}" fill="none" stroke="#ffd36b" stroke-width="2"/>`],
  castle: [(x, y, s, r) => star(x, y - s * .5, s * .16, '#ffe27a'), (x, y, s, r) => `<g><rect x="${f(x - s * .2)}" y="${f(y - s * .8)}" width="${f(s * .4)}" height="${f(s * .8)}" fill="#fff4fb" stroke="#f0cfe3"/><path d="M${f(x - s * .3)} ${f(y - s * .8)}L${f(x)} ${f(y - s * 1.3)}L${f(x + s * .3)} ${f(y - s * .8)}Z" fill="${r() < .5 ? '#c38fff' : '#ff8fb6'}"/></g>`, (x, y, s) => cloud(x, y - s * .4, s / 120, '#fff', .9, '')],
};
function deco(theme, x, y, s, r) { const L = DECO[theme] || DECO.forest; return L[(r() * L.length) | 0](x, y, s, r); }

const THEMES = ['forest', 'harbor', 'sweets', 'sea', 'garden', 'festival', 'autumn', 'snow', 'stars', 'castle'];
function svg(name, W, H, variant, tod) {
  const fn = S[name] || S.daily;
  if (name === 'daily' && tod === 'night') variant = 'h';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${fn(W, H, variant)}${timeLayer(name, W, H, tod, variant)}</svg>`;
}
window.SudokuBG = { THEMES, svg, deco, rng: R };
})();
