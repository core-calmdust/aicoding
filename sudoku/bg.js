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

/* ---------- more scenes (collection 2) ---------- */
const bgr = (W, H, stops) => sky('sk', stops) + `<rect width="${W}" height="${H}" fill="url(#${CUR})"/>`;
const lgr = (stops, x2 = 0, y2 = 1) => { const id = 'g' + (++GID); return [id, `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`]; };
const rgr = stops => { const id = 'g' + (++GID); return [id, `<defs><radialGradient id="${id}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient></defs>`]; };
const spin = (cx, cy, dur, dir = 1) => `<animateTransform attributeName="transform" type="rotate" from="0 ${f(cx)} ${f(cy)}" to="${dir * 360} ${f(cx)} ${f(cy)}" dur="${dur}s" repeatCount="indefinite"/>`;
const rock = (cx, cy, vals, dur) => `<animateTransform attributeName="transform" type="rotate" values="${vals.map(v => `${v} ${f(cx)} ${f(cy)}`).join(';')}" dur="${dur}s" repeatCount="indefinite"/>`;
function puffs(W, H, y, rad, col, seed, op = 1) {
  const r = R(seed); let p = '';
  for (let x = -rad * .4; x < W + rad; x += rad * (1.05 + r() * .5)) p += `<circle cx="${f(x)}" cy="${f(y + r() * rad * .35)}" r="${f(rad * (.75 + r() * .45))}"/>`;
  return `<g fill="${col}" opacity="${op}">${p}<rect x="0" y="${f(y)}" width="${W}" height="${f(H - y)}"/></g>`;
}
function sun(x, y, r, c = '#ffd25e', rays = true) {
  let p = ''; if (rays) for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; p += `<path d="M${f(x + Math.cos(a) * r * 1.22)} ${f(y + Math.sin(a) * r * 1.22)}L${f(x + Math.cos(a) * r * 1.5)} ${f(y + Math.sin(a) * r * 1.5)}"/>`; }
  return `<g class="bob" style="--d:7s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.7)}" fill="${c}" opacity=".18"/><g stroke="${c}" stroke-width="${f(r * .14)}" stroke-linecap="round">${p}</g><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}"/><circle cx="${f(x - r * .35)}" cy="${f(y - r * .4)}" r="${f(r * .22)}" fill="#fff" opacity=".35"/>${face(x, y + r * .05, r * .48)}</g>`;
}
function balloon(x, y, s, c, d = 6) {
  return `<g class="float" style="--d:${d}s"><path d="M${f(x)} ${f(y + s * .62)}q${f(-s * .25)} ${f(s * .5)} 0 ${f(s * 1.1)}" stroke="#b8a3a8" fill="none" stroke-width="1.5"/><path d="M${f(x - s * .08)} ${f(y + s * .66)}h${f(s * .16)}l${f(-s * .08)} ${f(-s * .1)}Z" fill="${c}"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * .5)}" ry="${f(s * .62)}" fill="${c}"/><ellipse cx="${f(x - s * .18)}" cy="${f(y - s * .24)}" rx="${f(s * .1)}" ry="${f(s * .17)}" fill="#fff" opacity=".6"/></g>`;
}
function sheep(x, y, s, flip = false, cls = 'bob') {
  const t = flip ? ` transform="translate(${f(2 * x)} 0) scale(-1 1)"` : '';
  const b = [[0, -.62, .36], [-.32, -.55, .28], [.33, -.56, .28], [-.17, -.86, .27], [.2, -.85, .26], [.02, -.42, .3], [.45, -.75, .2]].map(([dx, dy, rr]) => `<circle cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" r="${f(rr * s)}"/>`).join('');
  return `<g${t}><g class="${cls}" style="--d:${f(3 + (x % 4) * .5)}s"><g fill="#9a8aa6">${[-.3, -.1, .15, .35].map(dx => `<rect x="${f(x + dx * s - s * .05)}" y="${f(y - s * .32)}" width="${f(s * .1)}" height="${f(s * .32)}" rx="${f(s * .05)}"/>`).join('')}</g><g fill="#fff" stroke="#e9e1f4" stroke-width="${f(s * .03)}">${b}</g><ellipse cx="${f(x - s * .78)}" cy="${f(y - s * .78)}" rx="${f(s * .12)}" ry="${f(s * .06)}" fill="#ffc9c0" transform="rotate(-25 ${f(x - s * .78)} ${f(y - s * .78)})"/><ellipse cx="${f(x - s * .55)}" cy="${f(y - s * .66)}" rx="${f(s * .24)}" ry="${f(s * .21)}" fill="#ffeadf"/><circle cx="${f(x - s * .5)}" cy="${f(y - s * .88)}" r="${f(s * .12)}" fill="#fff"/>${face(x - s * .57, y - s * .66, s * .11)}</g></g>`;
}
function windmill(x, y, s) {
  let bl = ''; for (let i = 0; i < 4; i++) bl += `<g transform="rotate(${i * 90} ${f(x)} ${f(y - s * 1.5)})"><rect x="${f(x - s * .07)}" y="${f(y - s * 2.35)}" width="${f(s * .14)}" height="${f(s * .85)}" rx="${f(s * .07)}" fill="#fff"/><rect x="${f(x + s * .02)}" y="${f(y - s * 2.3)}" width="${f(s * .2)}" height="${f(s * .6)}" rx="${f(s * .05)}" fill="${i % 2 ? '#ffb3c6' : '#ffe08a'}"/></g>`;
  return `<g><path d="M${f(x - s * .36)} ${f(y)}L${f(x - s * .22)} ${f(y - s * 1.4)}H${f(x + s * .22)}L${f(x + s * .36)} ${f(y)}Z" fill="#fff6ee" stroke="#f0d9e4" stroke-width="2"/><path d="M${f(x - s * .3)} ${f(y - s * 1.36)}Q${f(x)} ${f(y - s * 1.9)} ${f(x + s * .3)} ${f(y - s * 1.36)}Z" fill="#ff9fb0"/><rect x="${f(x - s * .1)}" y="${f(y - s * .38)}" width="${f(s * .2)}" height="${f(s * .38)}" rx="${f(s * .1)}" fill="#c9a0d8"/><circle cx="${f(x)}" cy="${f(y - s * .85)}" r="${f(s * .09)}" fill="#bfe6ff"/><g>${spin(x, y - s * 1.5, 14)}${bl}<circle cx="${f(x)}" cy="${f(y - s * 1.5)}" r="${f(s * .1)}" fill="#c9a0d8"/></g></g>`;
}
function island(x, y, s, extra = '') {
  return `<g class="bob" style="--d:${f(6 + (x % 3))}s"><g fill="#fff"><circle cx="${f(x - s * .55)}" cy="${f(y + s * .2)}" r="${f(s * .4)}"/><circle cx="${f(x + s * .05)}" cy="${f(y + s * .32)}" r="${f(s * .5)}"/><circle cx="${f(x + s * .6)}" cy="${f(y + s * .18)}" r="${f(s * .38)}"/><ellipse cx="${f(x)}" cy="${f(y + s * .12)}" rx="${f(s * 1.05)}" ry="${f(s * .25)}"/></g><path d="M${f(x - s)} ${f(y)}Q${f(x)} ${f(y - s * .5)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y + s * .2)} ${f(x - s)} ${f(y)}Z" fill="#a8e29a"/>${extra}</g>`;
}
S.cloudranch = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#a6d8ff'], [.55, '#e3f3ff'], [1, '#ffe4f0']]);
  s += sun(W * .13, H * .12, u * .7);
  s += scatter(W, H, 14, 41, (x, y, r) => sparkle(x, y, 3 + r() * 5, '#fff'), [0, 0, 1, .55]);
  s += cloud(W * .55, H * .1, u / 85) + cloud(W * .35, H * .3, u / 110, '#fff', .8);
  s += island(W * .84, H * .2, u * 1.1, tree(W * .76, H * .19, u * .7, '#8fd68a') + sheep(W * .9, H * .19, u * .42, true, ''));
  s += island(W * .1, H * .44, u * .75, flower(W * .06, H * .43, u * .12, '#ff9fb0', '#ffd76a', false) + flower(W * .14, H * .425, u * .1, '#ffd76a', '#fff', false));
  s += cloud(W * .78, H * .5, u / 120, '#fff', .75) + cloud(W * .06, H * .62, u / 130, '#fff', .7);
  s += puffs(W, H, H * .77, u * .9, '#e6dcff', 3) + puffs(W, H, H * .83, u * .8, '#fbeef8', 7) + puffs(W, H, H * .93, u * .6, '#fff6fb', 19);
  // rainbow bridge
  const cx = W * .52, by = H * .9, hw = Math.min(W * .24, u * 3), hb = u * 1.5, bw = u * .17, rb = ['#ff9fb0', '#ffc98a', '#ffe98a', '#a8e6b5', '#9fd2ff', '#c7b2ff'];
  s += `<g fill="none" stroke-width="${f(bw + 1)}">${rb.map((c, i) => `<path d="M${f(cx - hw + i * bw)} ${f(by)}A${f(hw - i * bw)} ${f(hb - i * bw)} 0 0 1 ${f(cx + hw - i * bw)} ${f(by)}" stroke="${c}"/>`).join('')}</g>`;
  s += `<g fill="#fff"><circle cx="${f(cx - hw + bw * 3)}" cy="${f(by)}" r="${f(u * .55)}"/><circle cx="${f(cx - hw - u * .1)}" cy="${f(by + u * .1)}" r="${f(u * .4)}"/><circle cx="${f(cx + hw - bw * 3)}" cy="${f(by)}" r="${f(u * .55)}"/><circle cx="${f(cx + hw + u * .15)}" cy="${f(by + u * .1)}" r="${f(u * .4)}"/></g>`;
  s += sheep(cx + u * .2, by - hb - bw * .2, u * .5, false, 'hop');
  s += windmill(W * .1, H * .93, u * 1.05);
  // fence
  const fx = W * .74, fy = H * .955; let fe = '';
  for (let i = 0; i < 4; i++) fe += `<rect x="${f(fx + i * u * .45)}" y="${f(fy - u * .6)}" width="${f(u * .14)}" height="${f(u * .6)}" rx="${f(u * .07)}"/>`;
  s += `<g fill="#fff3e3" stroke="#ead2c0" stroke-width="1.5">${fe}<rect x="${f(fx - u * .15)}" y="${f(fy - u * .45)}" width="${f(u * 1.75)}" height="${f(u * .1)}" rx="${f(u * .05)}"/><rect x="${f(fx - u * .15)}" y="${f(fy - u * .25)}" width="${f(u * 1.75)}" height="${f(u * .1)}" rx="${f(u * .05)}"/></g>`;
  s += sheep(W * .3, H * .975, u * .75) + sheep(W * .86, H * .99, u * .62, true) + sheep(W * .66, H * .985, u * .45, true, 'hop');
  s += scatter(W, H, 12, 9, (x, y, r) => flower(x, y, u * (.1 + r() * .06), ['#ff9fb0', '#ffd76a', '#c7b2ff'][(r() * 3) | 0], '#fff', false), [0, .93, 1, .99]);
  return s;
};

function ferris(cx, cy, R0, base) {
  const n = 8, cols = ['#ff9fb0', '#ffd36b', '#9fd8ff', '#a8e6b5', '#c7b2ff', '#ffb38a', '#9fd8ff', '#ff8fb6'], g = R0 * .3;
  let sp = '', gd = '', li = '';
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n, px = cx + Math.cos(a) * R0, py = cy + Math.sin(a) * R0;
    sp += `M${f(cx)} ${f(cy)}L${f(px)} ${f(py)}`;
    li += `<circle cx="${f(cx + Math.cos(a + Math.PI / n) * R0)}" cy="${f(cy + Math.sin(a + Math.PI / n) * R0)}" r="${f(R0 * .035)}" fill="#fff6c9"/>`;
    gd += `<g>${spin(px, py, 48, -1)}<path d="M${f(px)} ${f(py)}v${f(g * .3)}" stroke="#b58fb8" stroke-width="2"/><path d="M${f(px - g * .45)} ${f(py + g * .3)}h${f(g * .9)}v${f(g * .45)}q0 ${f(g * .35)} ${f(-g * .45)} ${f(g * .35)}q${f(-g * .45)} 0 ${f(-g * .45)} ${f(-g * .35)}Z" fill="${cols[i]}"/><rect x="${f(px - g * .28)}" y="${f(py + g * .4)}" width="${f(g * .56)}" height="${f(g * .25)}" rx="${f(g * .08)}" fill="#fff" opacity=".7"/><path d="M${f(px - g * .5)} ${f(py + g * .3)}q${f(g * .5)} ${f(-g * .3)} ${f(g)} 0Z" fill="${cols[i]}"/></g>`;
  }
  return `<g><path d="M${f(cx - R0 * .62)} ${f(base)}L${f(cx)} ${f(cy)}L${f(cx + R0 * .62)} ${f(base)}" fill="none" stroke="#e9c6dc" stroke-width="${f(R0 * .07)}" stroke-linejoin="round"/><g>${spin(cx, cy, 48)}<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R0)}" fill="none" stroke="#f5b8d0" stroke-width="${f(R0 * .045)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R0 * .82)}" fill="none" stroke="#fff" stroke-width="${f(R0 * .02)}" opacity=".8"/><path d="${sp}" stroke="#f5c8dc" stroke-width="${f(R0 * .025)}"/>${li}${gd}</g><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R0 * .16)}" fill="#ffd36b"/>${face(cx, cy, R0 * .08)}</g>`;
}
function carousel(x, y, s) {
  const n = 8, cols = ['#ff8fb6', '#fff']; let roof = '', sc = '';
  for (let i = 0; i < n; i++) {
    const x1 = x - s * 1.1 + i * s * 2.2 / n, x2 = x1 + s * 2.2 / n;
    roof += `<path d="M${f(x)} ${f(y - s * 2.35)}L${f(x1)} ${f(y - s * 1.6)}H${f(x2)}Z" fill="${cols[i % 2]}"/>`;
    sc += `<circle cx="${f((x1 + x2) / 2)}" cy="${f(y - s * 1.6)}" r="${f(s * 2.2 / n / 2)}" fill="${cols[(i + 1) % 2]}"/>`;
  }
  const horse = (hx, c, d) => `<g class="bob" style="--d:${d}s"><path d="M${f(hx)} ${f(y - s * 1.55)}V${f(y - s * .2)}" stroke="#e6b94f" stroke-width="${f(s * .05)}"/><ellipse cx="${f(hx)}" cy="${f(y - s * .72)}" rx="${f(s * .3)}" ry="${f(s * .17)}" fill="${c}"/><path d="M${f(hx - s * .22)} ${f(y - s * .78)}l${f(-s * .1)} ${f(-s * .3)}q${f(-s * .02)} ${f(-s * .1)} ${f(-s * .15)} ${f(-s * .03)}l${f(-s * .05)} ${f(s * .1)}" fill="${c}" stroke="${c}" stroke-width="${f(s * .12)}" stroke-linejoin="round" stroke-linecap="round"/><path d="M${f(hx - s * .18)} ${f(y - s * .6)}l${f(-s * .08)} ${f(s * .22)}M${f(hx + s * .18)} ${f(y - s * .6)}l${f(s * .08)} ${f(s * .22)}" stroke="${c}" stroke-width="${f(s * .07)}" stroke-linecap="round"/><path d="M${f(hx + s * .28)} ${f(y - s * .78)}q${f(s * .15)} ${f(s * .05)} ${f(s * .12)} ${f(s * .25)}" stroke="#ffd36b" stroke-width="${f(s * .07)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(hx - s * .02)}" cy="${f(y - s * .86)}" rx="${f(s * .12)}" ry="${f(s * .05)}" fill="#ff8fb6"/></g>`;
  return `<g><rect x="${f(x - s)}" y="${f(y - s * 1.6)}" width="${f(s * 2)}" height="${f(s * 1.5)}" fill="#fff4fb" opacity=".7"/><path d="M${f(x - s * .95)} ${f(y - s * 1.55)}V${f(y - s * .15)}M${f(x + s * .95)} ${f(y - s * 1.55)}V${f(y - s * .15)}M${f(x)} ${f(y - s * 1.55)}V${f(y - s * .15)}" stroke="#e6b94f" stroke-width="${f(s * .08)}"/>${horse(x - s * .5, '#fff', 2.2)}${horse(x + s * .55, '#c7e6ff', 2.8)}<ellipse cx="${f(x)}" cy="${f(y - s * .12)}" rx="${f(s * 1.2)}" ry="${f(s * .18)}" fill="#c7a8ff"/><rect x="${f(x - s * 1.2)}" y="${f(y - s * .12)}" width="${f(s * 2.4)}" height="${f(s * .12)}" fill="#b496f0"/>${roof}${sc}<path d="M${f(x)} ${f(y - s * 2.35)}v${f(-s * .4)}l${f(s * .3)} ${f(s * .1)}l${f(-s * .3)} ${f(s * .1)}" fill="#ffd36b" stroke="#e6b94f" stroke-width="1.5"/><circle cx="${f(x)}" cy="${f(y - s * 2.36)}" r="${f(s * .08)}" fill="#ffd36b"/></g>`;
}
function bunting(W, y, sag, n, cols) {
  let s = `<path d="M0 ${f(y)}Q${f(W / 2)} ${f(y + sag * 2)} ${W} ${f(y)}" fill="none" stroke="#c9a0b8" stroke-width="2"/>`;
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = W * t, yy = y + sag * 4 * t * (1 - t), w = W / n * .36; s += `<path class="sway" style="--d:${f(2.5 + i % 3 * .6)}s" d="M${f(x - w)} ${f(yy)}H${f(x + w)}L${f(x)} ${f(yy + w * 1.5)}Z" fill="${cols[i % cols.length]}" stroke="${cols[i % cols.length]}" stroke-width="2" stroke-linejoin="round"/>`; }
  return s;
}
S.park = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#cbb8ff'], [.5, '#ffe0f0'], [1, '#fff0d8']]);
  s += scatter(W, H, 14, 13, (x, y, r) => sparkle(x, y, 3 + r() * 5, ['#fff', '#fff3b0'][(r() * 2) | 0]), [0, .08, 1, .55]);
  s += cloud(W * .62, H * .16, u / 90) + cloud(W * .9, H * .36, u / 120, '#fff', .8);
  s += bunting(W, H * .02, u * .5, Math.max(8, Math.round(W / (u * .9))), ['#ff8fb6', '#ffd36b', '#9fd8ff', '#a8e6b5', '#c7b2ff']);
  s += hills(W, H, H * .84, H * .05, '#ffd7e8', 21, 3);
  const R0 = Math.min(u * 2.3, W * .2);
  s += ferris(W * .2, H * .89 - R0 * 1.55, R0, H * .89);
  s += `<rect x="0" y="${f(H * .88)}" width="${W}" height="${f(H * .12)}" fill="#fff1df"/><rect x="0" y="${f(H * .88)}" width="${W}" height="${f(u * .1)}" fill="#ffd7b8"/>`;
  s += scatter(W, H, Math.round(W / u * 1.4), 17, (x, y, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(u * (.3 + r() * .2))}" height="${f(u * .12)}" rx="${f(u * .06)}" fill="#f6dcc4"/>`, [0, .9, 1, .99]);
  s += carousel(W * .8, H * .9, Math.min(u * .95, W * .1));
  // ticket booth / popcorn
  const px = W * .5, py = H * .955;
  s += `<g><rect x="${f(px - u * .4)}" y="${f(py - u * .9)}" width="${f(u * .8)}" height="${f(u * .9)}" rx="${f(u * .1)}" fill="#ff8f8f"/><rect x="${f(px - u * .3)}" y="${f(py - u * .75)}" width="${f(u * .6)}" height="${f(u * .35)}" rx="${f(u * .06)}" fill="#fff6e6"/><g fill="#fff7d6">${[-.18, 0, .18, -.09, .09].map((dx, i) => `<circle cx="${f(px + dx * u)}" cy="${f(py - u * (i < 3 ? 1 : 1.12))}" r="${f(u * .13)}"/>`).join('')}</g><circle cx="${f(px - u * .22)}" cy="${f(py - u * .05)}" r="${f(u * .1)}" fill="#8a7a99"/><circle cx="${f(px + u * .22)}" cy="${f(py - u * .05)}" r="${f(u * .1)}" fill="#8a7a99"/>${face(px, py - u * .58, u * .13)}</g>`;
  s += bunny(W * .36, H * .985, u * .5) + `<path d="M${f(W * .36 + u * .3)} ${f(H * .985 - u * .4)}L${f(W * .36 + u * .5)} ${f(H * .985 - u * 1.6)}" stroke="#b8a3a8" stroke-width="1.5"/>` + balloon(W * .36 + u * .5, H * .985 - u * 2, u * .45, '#9fd8ff', 4);
  s += cat(W * .64, H * .99, u * .5, '#fff', true);
  s += balloon(W * .42, H * .22, u * .55, '#ff8fb6', 6) + balloon(W * .7, H * .3, u * .45, '#ffd36b', 5) + balloon(W * .93, H * .14, u * .5, '#a8e6b5', 7) + balloon(W * .06, H * .3, u * .4, '#c7b2ff', 5.5);
  return s;
};

function penguin(x, y, s, flip = false, cls = 'bob', scarf = '') {
  const t = flip ? ` transform="translate(${f(2 * x)} 0) scale(-1 1)"` : '';
  return `<g${t}><g class="${cls}" style="--d:${f(2.4 + (x % 3) * .4)}s"><ellipse cx="${f(x - s * .18)}" cy="${f(y - s * .03)}" rx="${f(s * .16)}" ry="${f(s * .07)}" fill="#ffb35c"/><ellipse cx="${f(x + s * .18)}" cy="${f(y - s * .03)}" rx="${f(s * .16)}" ry="${f(s * .07)}" fill="#ffb35c"/><ellipse cx="${f(x - s * .4)}" cy="${f(y - s * .45)}" rx="${f(s * .12)}" ry="${f(s * .28)}" fill="#4b5c96" transform="rotate(20 ${f(x - s * .4)} ${f(y - s * .45)})"/><ellipse cx="${f(x + s * .4)}" cy="${f(y - s * .45)}" rx="${f(s * .12)}" ry="${f(s * .28)}" fill="#4b5c96" transform="rotate(-20 ${f(x + s * .4)} ${f(y - s * .45)})"/><ellipse cx="${f(x)}" cy="${f(y - s * .55)}" rx="${f(s * .42)}" ry="${f(s * .55)}" fill="#4b5c96"/><ellipse cx="${f(x)}" cy="${f(y - s * .45)}" rx="${f(s * .3)}" ry="${f(s * .4)}" fill="#fff"/><path d="M${f(x - s * .32)} ${f(y - s * .75)}Q${f(x - s * .3)} ${f(y - s * .98)} ${f(x)} ${f(y - s * .82)}Q${f(x + s * .3)} ${f(y - s * .98)} ${f(x + s * .32)} ${f(y - s * .75)}Q${f(x)} ${f(y - s * .5)} ${f(x - s * .32)} ${f(y - s * .75)}Z" fill="#fff"/>${face(x, y - s * .76, s * .13)}<path d="M${f(x - s * .06)} ${f(y - s * .7)}h${f(s * .12)}l${f(-s * .06)} ${f(s * .07)}Z" fill="#ffb35c"/>${scarf ? `<path d="M${f(x - s * .34)} ${f(y - s * .58)}q${f(s * .34)} ${f(s * .14)} ${f(s * .68)} 0v${f(s * .1)}q${f(-s * .34)} ${f(s * .14)} ${f(-s * .68)} 0Z" fill="${scarf}"/><rect x="${f(x + s * .12)}" y="${f(y - s * .5)}" width="${f(s * .12)}" height="${f(s * .25)}" rx="${f(s * .04)}" fill="${scarf}"/>` : ''}</g></g>`;
}
function berg(x, y, w, h, c1 = '#fff', c2 = '#cfe6ff') {
  return `<g><path d="M${f(x - w / 2)} ${f(y)}L${f(x - w * .3)} ${f(y - h * .7)}L${f(x - w * .1)} ${f(y - h)}L${f(x + w * .12)} ${f(y - h * .78)}L${f(x + w * .28)} ${f(y - h * .86)}L${f(x + w / 2)} ${f(y)}Z" fill="${c1}" stroke="${c1}" stroke-width="${f(w * .06)}" stroke-linejoin="round"/><path d="M${f(x - w * .1)} ${f(y - h)}L${f(x + w * .02)} ${f(y)}H${f(x + w / 2)}L${f(x + w * .28)} ${f(y - h * .86)}L${f(x + w * .12)} ${f(y - h * .78)}Z" fill="${c2}" opacity=".8"/></g>`;
}
S.iceberg = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#3f4f9a'], [.35, '#7a8fd6'], [.62, '#cfe4ff'], [.63, '#9fd2f2'], [1, '#6fb2e6']]);
  // aurora
  const [ag, ad] = lgr([[0, '#7ff0c0'], [.45, '#9ff0e0'], [.75, '#b9a4ff'], [1, '#ffa8d4']], 1, 0);
  s += ad + `<g opacity=".42"><path class="glow" d="M${f(-W * .05)} ${f(H * .18)}Q${f(W * .25)} ${f(H * .04)} ${f(W * .5)} ${f(H * .16)}T${f(W * 1.05)} ${f(H * .1)}" fill="none" stroke="url(#${ag})" stroke-width="${f(u * .9)}" stroke-linecap="round"/><path class="wave" style="--d:7s" d="M${f(-W * .05)} ${f(H * .28)}Q${f(W * .3)} ${f(H * .16)} ${f(W * .55)} ${f(H * .26)}T${f(W * 1.05)} ${f(H * .2)}" fill="none" stroke="url(#${ag})" stroke-width="${f(u * .45)}" stroke-linecap="round" opacity=".7"/></g>`;
  s += scatter(W, H, 40, 63, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.6 + r() * 1.2)}" fill="#fff" opacity=".6"/>`, [0, 0, 1, .45]);
  s += scatter(W, H, 12, 61, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r() * 1.6)}" fill="#fff"/>`, [0, 0, 1, .4]);
  // far icebergs on the horizon
  const hz = H * .62;
  s += berg(W * .12, hz, u * 2.6, u * 1.6) + berg(W * .52, hz, u * 1.6, u * .9) + berg(W * .86, hz, u * 3, u * 2.1) + `<rect x="0" y="${f(hz)}" width="${W}" height="${f(u * .08)}" fill="#fff" opacity=".5"/>`;
  s += scatter(W, H, 8, 4, (x, y, r) => `<path class="wave" style="--d:${f(3 + r() * 3)}s" d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .1)} ${f(u * .4)} 0t${f(u * .4)} 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`, [0, .65, 1, .78]);
  // floating berg with penguin
  s += `<g class="bob" style="--d:6s">${berg(W * .3, H * .78, u * 1.6, u * .8)}${penguin(W * .3, H * .78 - u * .55, u * .5, true, '')}</g>`;
  // ice floe ground
  s += `<path d="M0 ${f(H * .86)}Q${f(W * .2)} ${f(H * .83)} ${f(W * .45)} ${f(H * .855)}T${W} ${f(H * .84)}V${H}H0Z" fill="#fff"/><path d="M0 ${f(H * .9)}Q${f(W * .3)} ${f(H * .88)} ${f(W * .6)} ${f(H * .91)}T${W} ${f(H * .9)}V${H}H0Z" fill="#eaf4ff"/>`;
  s += `<ellipse cx="${f(W * .55)}" cy="${f(H * .955)}" rx="${f(u * 1.1)}" ry="${f(u * .2)}" fill="#bfe0ff"/><ellipse cx="${f(W * .55)}" cy="${f(H * .95)}" rx="${f(u * .8)}" ry="${f(u * .1)}" fill="#fff" opacity=".6"/>`;
  // igloo
  const ix = W * .12, iy = H * .9;
  s += `<g><path d="M${f(ix - u * .9)} ${f(iy)}A${f(u * .9)} ${f(u * .85)} 0 0 1 ${f(ix + u * .9)} ${f(iy)}Z" fill="#fff" stroke="#d6e6fa" stroke-width="2"/><path d="M${f(ix - u * .85)} ${f(iy - u * .3)}H${f(ix + u * .85)}M${f(ix - u * .65)} ${f(iy - u * .6)}H${f(ix + u * .65)}M${f(ix - u * .3)} ${f(iy)}V${f(iy - u * .3)}M${f(ix + u * .4)} ${f(iy - u * .3)}V${f(iy - u * .6)}" stroke="#d6e6fa" stroke-width="2"/><path d="M${f(ix + u * .2)} ${f(iy)}v${f(-u * .25)}a${f(u * .25)} ${f(u * .25)} 0 0 1 ${f(u * .5)} 0v${f(u * .25)}Z" fill="#8fb6e6"/></g>`;
  s += penguin(W * .36, H * .965, u, false, 'bob', '#ff8fb6') + penguin(W * .47, H * .98, u * .6, true, 'hop') + penguin(W * .78, H * .955, u * .9, true, 'bob', '#9fd8ff') + penguin(W * .9, H * .985, u * .55, false, 'hop');
  s += fish(W * .63, H * .99, u * .3, '#ffb3c6', '');
  s += scatter(W, H, 28, 71, (x, y, r) => `<circle class="snowf" style="--d:${f(9 + r() * 10)}s;--o:${f(-r() * 18)}s" cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 3)}" fill="#fff" opacity=".9"/>`, [0, -.1, 1, .85]);
  s += star(W * .9, H * .9, u * .12, '#fff', 'twinkle') + sparkle(W * .7, H * .5, u * .12, '#fff');
  return s;
};

function palm(x, y, s, flip = false) {
  const t = flip ? ` transform="translate(${f(2 * x)} 0) scale(-1 1)"` : '';
  const tx = x + s * .35, ty = y - s * 2;
  let lv = ''; [-150, -110, -60, -20, 20].forEach((a, i) => { lv += `<path d="M${f(tx)} ${f(ty)}q${f(s * .5)} ${f(-s * .45)} ${f(s * 1.05)} ${f(s * .1)}q${f(-s * .5)} ${f(-s * .15)} ${f(-s * 1.05)} ${f(-s * .1)}Z" fill="${i % 2 ? '#6fcf8a' : '#8fdc8f'}" transform="rotate(${a + 90} ${f(tx)} ${f(ty)})"/>`; });
  return `<g${t}><g class="sway" style="--d:${f(4 + (x % 3))}s"><path d="M${f(x)} ${f(y)}Q${f(x + s * .05)} ${f(y - s)} ${f(tx)} ${f(ty)}" fill="none" stroke="#d9a46a" stroke-width="${f(s * .2)}" stroke-linecap="round"/><path d="M${f(x)} ${f(y)}Q${f(x + s * .05)} ${f(y - s)} ${f(tx)} ${f(ty)}" fill="none" stroke="#c48a52" stroke-width="${f(s * .2)}" stroke-dasharray="${f(s * .04)} ${f(s * .18)}"/>${lv}<circle cx="${f(tx - s * .08)}" cy="${f(ty + s * .1)}" r="${f(s * .1)}" fill="#b07a4f"/><circle cx="${f(tx + s * .1)}" cy="${f(ty + s * .12)}" r="${f(s * .1)}" fill="#a06a42"/></g></g>`;
}
function camel(x, y, s, flip = false) {
  const t = flip ? ` transform="translate(${f(2 * x)} 0) scale(-1 1)"` : '', c = '#f2c48a';
  return `<g${t}><g class="bob" style="--d:3.4s"><g fill="${c}">${[-.42, -.22, .25, .45].map(dx => `<rect x="${f(x + dx * s - s * .06)}" y="${f(y - s * .55)}" width="${f(s * .12)}" height="${f(s * .55)}" rx="${f(s * .06)}"/>`).join('')}<ellipse cx="${f(x)}" cy="${f(y - s * .7)}" rx="${f(s * .62)}" ry="${f(s * .3)}"/><circle cx="${f(x - s * .18)}" cy="${f(y - s * .92)}" r="${f(s * .25)}"/><circle cx="${f(x + s * .22)}" cy="${f(y - s * .9)}" r="${f(s * .22)}"/></g><path d="M${f(x - s * .5)} ${f(y - s * .75)}Q${f(x - s * .78)} ${f(y - s * .9)} ${f(x - s * .78)} ${f(y - s * 1.2)}" stroke="${c}" stroke-width="${f(s * .2)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(x - s * .88)}" cy="${f(y - s * 1.28)}" rx="${f(s * .26)}" ry="${f(s * .18)}" fill="${c}"/><ellipse cx="${f(x - s * .78)}" cy="${f(y - s * 1.44)}" rx="${f(s * .05)}" ry="${f(s * .08)}" fill="#e0a86e"/>${face(x - s * .9, y - s * 1.3, s * .1)}<path d="M${f(x - s * .45)} ${f(y - s * .95)}q${f(s * .45)} ${f(s * .3)} ${f(s * .9)} 0v${f(s * .12)}q${f(-s * .45)} ${f(s * .3)} ${f(-s * .9)} 0Z" fill="#ff8fb6"/><path d="M${f(x - s * .45)} ${f(y - s * .85)}q${f(s * .45)} ${f(s * .3)} ${f(s * .9)} 0" stroke="#ffd36b" stroke-width="${f(s * .04)}" fill="none" stroke-dasharray="${f(s * .04)} ${f(s * .06)}"/><path d="M${f(x + s * .6)} ${f(y - s * .75)}q${f(s * .15)} ${f(s * .1)} ${f(s * .1)} ${f(s * .3)}" stroke="${c}" stroke-width="${f(s * .06)}" fill="none" stroke-linecap="round"/></g></g>`;
}
function cactus(x, y, s, c = '#8fd68f') {
  return `<g class="sway" style="--d:5s"><rect x="${f(x - s * .2)}" y="${f(y - s * 1.1)}" width="${f(s * .4)}" height="${f(s * 1.1)}" rx="${f(s * .2)}" fill="${c}"/><path d="M${f(x - s * .2)} ${f(y - s * .5)}h${f(-s * .2)}a${f(s * .1)} ${f(s * .1)} 0 0 1 ${f(-s * .1)} ${f(-s * .1)}v${f(-s * .25)}" fill="none" stroke="${c}" stroke-width="${f(s * .18)}" stroke-linecap="round"/><path d="M${f(x + s * .2)} ${f(y - s * .65)}h${f(s * .18)}a${f(s * .1)} ${f(s * .1)} 0 0 0 ${f(s * .1)} ${f(-s * .1)}v${f(-s * .2)}" fill="none" stroke="${c}" stroke-width="${f(s * .18)}" stroke-linecap="round"/>${face(x, y - s * .7, s * .12)}<circle cx="${f(x + s * .05)}" cy="${f(y - s * 1.12)}" r="${f(s * .1)}" fill="#ff8fb6"/></g>`;
}
S.desert = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#ffc9a8'], [.45, '#ffe6c4'], [1, '#fff3d6']]);
  s += sun(W * .8, H * .15, u * .9, '#ffc23d');
  s += cloud(W * .2, H * .12, u / 95, '#fff8ee') + cloud(W * .5, H * .28, u / 130, '#fff8ee', .8);
  s += scatter(W, H, 3, 19, (x, y) => `<g class="float" style="--d:7s"><path d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0" fill="none" stroke="#b58a6e" stroke-width="2.5" stroke-linecap="round"/></g>`, [.15, .05, .7, .3]);
  // far pyramids
  s += `<g opacity=".55"><path d="M${f(W * .58)} ${f(H * .7)}L${f(W * .58 + u * 1.2)} ${f(H * .7 - u * 1.3)}L${f(W * .58 + u * 2.4)} ${f(H * .7)}Z" fill="#f2c08e"/><path d="M${f(W * .58 + u * 1.2)} ${f(H * .7 - u * 1.3)}L${f(W * .58 + u * 2.4)} ${f(H * .7)}H${f(W * .58 + u * 1.5)}Z" fill="#e3a979"/></g>`;
  s += hills(W, H, H * .72, H * .08, '#ffd9a6', 5, 3) + hills(W, H, H * .82, H * .07, '#ffcb8f', 15, 3) + hills(W, H, H * .9, H * .05, '#ffe2b0', 29, 4);
  // oasis
  const ox = W * .5, oy = H * .925, [pg, pd] = lgr([[0, '#8fe0f0'], [1, '#4fb0dd']]);
  s += pd + `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(Math.min(W * .26, u * 3))}" ry="${f(u * .45)}" fill="#a8e29a"/><ellipse cx="${f(ox)}" cy="${f(oy + u * .02)}" rx="${f(Math.min(W * .22, u * 2.5))}" ry="${f(u * .32)}" fill="url(#${pg})"/>`;
  s += `<path class="wave" style="--d:3s" d="M${f(ox - u * .8)} ${f(oy)}q${f(u * .2)} ${f(-u * .08)} ${f(u * .4)} 0t${f(u * .4)} 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/><path class="wave" style="--d:4s" d="M${f(ox + u * .3)} ${f(oy + u * .12)}q${f(u * .2)} ${f(-u * .08)} ${f(u * .4)} 0" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`;
  s += `<g><circle cx="${f(ox + u * .9)}" cy="${f(oy - u * .05)}" r="${f(u * .16)}" fill="#ffb3c6"/><circle cx="${f(ox + u * .9)}" cy="${f(oy - u * .05)}" r="${f(u * .06)}" fill="#ffe08a"/><ellipse cx="${f(ox + u * .9)}" cy="${f(oy + u * .05)}" rx="${f(u * .26)}" ry="${f(u * .08)}" fill="#7dcc7f"/></g>`;
  const ps = Math.min(u * 1.1, W * .11);
  s += palm(ox - Math.min(W * .25, u * 2.9), oy, ps) + palm(ox + Math.min(W * .24, u * 2.8), oy - u * .1, ps * .9, true) + palm(ox - Math.min(W * .16, u * 1.9), oy - u * .3, ps * .7);
  s += camel(W * .14, H * .975, u * .95) + camel(W * .86, H * .985, u * .7, true);
  s += cactus(W * .32, H * .99, u * .55) + cactus(W * .7, H * .975, u * .42, '#9fe0a0');
  s += scatter(W, H, 10, 23, (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(u * (.06 + r() * .06))}" ry="${f(u * .04)}" fill="#e8b27a" opacity=".6"/>`, [0, .93, 1, 1]);
  s += sparkle(W * .58, H * .9, u * .1, '#fff') + sparkle(W * .42, H * .935, u * .07, '#fff');
  return s;
};

function blockhouse(x, y, s, wall, roof, ch, extra = 0) {
  let b = `<rect x="${f(x - s / 2)}" y="${f(y - s)}" width="${f(s)}" height="${f(s)}" rx="${f(s * .1)}" fill="${wall}"/><rect x="${f(x - s / 2)}" y="${f(y - s)}" width="${f(s)}" height="${f(s * .18)}" rx="${f(s * .1)}" fill="#fff" opacity=".35"/><text x="${f(x)}" y="${f(y - s * .3)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(s * .5)}" fill="#fff">${ch}</text>`;
  let top = y - s;
  if (extra) { b += `<rect x="${f(x - s * .4)}" y="${f(top - s * .8)}" width="${f(s * .8)}" height="${f(s * .8)}" rx="${f(s * .08)}" fill="${extra}"/><rect x="${f(x - s * .18)}" y="${f(top - s * .6)}" width="${f(s * .36)}" height="${f(s * .36)}" rx="${f(s * .18)}" fill="#bfe6ff"/>`; top -= s * .8; }
  return `<g>${b}<path d="M${f(x - s * .58)} ${f(top)}L${f(x)} ${f(top - s * .62)}L${f(x + s * .58)} ${f(top)}Z" fill="${roof}" stroke="${roof}" stroke-width="${f(s * .08)}" stroke-linejoin="round"/><circle cx="${f(x)}" cy="${f(top - s * .25)}" r="${f(s * .1)}" fill="#fff" opacity=".7"/></g>`;
}
function tinsoldier(x, y, s) {
  return `<g class="sway" style="--d:3.5s"><rect x="${f(x - s * .2)}" y="${f(y - s * .7)}" width="${f(s * .17)}" height="${f(s * .7)}" rx="${f(s * .05)}" fill="#5b7bd6"/><rect x="${f(x + s * .03)}" y="${f(y - s * .7)}" width="${f(s * .17)}" height="${f(s * .7)}" rx="${f(s * .05)}" fill="#5b7bd6"/><rect x="${f(x - s * .24)}" y="${f(y - s * .1)}" width="${f(s * .48)}" height="${f(s * .1)}" rx="${f(s * .05)}" fill="#4a3a5a"/><rect x="${f(x - s * .26)}" y="${f(y - s * 1.3)}" width="${f(s * .52)}" height="${f(s * .65)}" rx="${f(s * .12)}" fill="#ff6f7f"/><path d="M${f(x - s * .26)} ${f(y - s * 1.25)}L${f(x + s * .26)} ${f(y - s * .7)}M${f(x + s * .26)} ${f(y - s * 1.25)}L${f(x - s * .26)} ${f(y - s * .7)}" stroke="#fff" stroke-width="${f(s * .06)}"/><rect x="${f(x - s * .26)}" y="${f(y - s * .78)}" width="${f(s * .52)}" height="${f(s * .08)}" fill="#ffd36b"/><rect x="${f(x - s * .38)}" y="${f(y - s * 1.25)}" width="${f(s * .13)}" height="${f(s * .5)}" rx="${f(s * .06)}" fill="#ff6f7f"/><rect x="${f(x + s * .25)}" y="${f(y - s * 1.25)}" width="${f(s * .13)}" height="${f(s * .5)}" rx="${f(s * .06)}" fill="#ff6f7f"/><circle cx="${f(x)}" cy="${f(y - s * 1.5)}" r="${f(s * .23)}" fill="#ffe2cf"/>${face(x, y - s * 1.47, s * .1)}<rect x="${f(x - s * .22)}" y="${f(y - s * 2.08)}" width="${f(s * .44)}" height="${f(s * .45)}" rx="${f(s * .16)}" fill="#3e3a5a"/><rect x="${f(x - s * .24)}" y="${f(y - s * 1.68)}" width="${f(s * .48)}" height="${f(s * .06)}" rx="${f(s * .03)}" fill="#ffd36b"/><circle cx="${f(x)}" cy="${f(y - s * 2.1)}" r="${f(s * .07)}" fill="#ff6f7f"/></g>`;
}
function spintop(x, y, s, c1, c2, d) {
  return `<g><g>${rock(x, y, [-9, 9, -9], d)}<path d="M${f(x)} ${f(y)}L${f(x - s * .5)} ${f(y - s * .55)}Q${f(x)} ${f(y - s * .95)} ${f(x + s * .5)} ${f(y - s * .55)}Z" fill="${c1}" stroke="${c1}" stroke-width="${f(s * .08)}" stroke-linejoin="round"/><path d="M${f(x - s * .36)} ${f(y - s * .4)}Q${f(x)} ${f(y - s * .6)} ${f(x + s * .36)} ${f(y - s * .4)}L${f(x + s * .2)} ${f(y - s * .22)}Q${f(x)} ${f(y - s * .35)} ${f(x - s * .2)} ${f(y - s * .22)}Z" fill="${c2}"/><rect x="${f(x - s * .05)}" y="${f(y - s * 1)}" width="${f(s * .1)}" height="${f(s * .25)}" rx="${f(s * .05)}" fill="#c98a5c"/></g><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * .3)}" ry="${f(s * .06)}" fill="#000" opacity=".08"/></g>`;
}
S.toytown = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#bfe4ff'], [.6, '#fff4e3'], [1, '#ffe6d6']]);
  s += cloud(W * .15, H * .1, u / 80) + cloud(W * .7, H * .08, u / 90) + cloud(W * .95, H * .3, u / 110);
  // hot-air balloon toy
  const hx = W * .84, hy = H * .2;
  s += `<g class="float" style="--d:7s"><path d="M${f(hx - u * .5)} ${f(hy)}Q${f(hx - u * .55)} ${f(hy - u * 1.1)} ${f(hx)} ${f(hy - u * 1.1)}Q${f(hx + u * .55)} ${f(hy - u * 1.1)} ${f(hx + u * .5)} ${f(hy)}L${f(hx + u * .15)} ${f(hy + u * .35)}H${f(hx - u * .15)}Z" fill="#ff9fb0"/><path d="M${f(hx - u * .2)} ${f(hy + u * .2)}Q${f(hx - u * .25)} ${f(hy - u * .5)} ${f(hx)} ${f(hy - u * 1.1)}Q${f(hx + u * .25)} ${f(hy - u * .5)} ${f(hx + u * .2)} ${f(hy + u * .2)}Z" fill="#ffe08a"/>${face(hx, hy - u * .45, u * .14)}<rect x="${f(hx - u * .14)}" y="${f(hy + u * .45)}" width="${f(u * .28)}" height="${f(u * .2)}" rx="${f(u * .04)}" fill="#c98a5c"/><path d="M${f(hx - u * .13)} ${f(hy + u * .35)}v${f(u * .1)}M${f(hx + u * .13)} ${f(hy + u * .35)}v${f(u * .1)}" stroke="#a0806a" stroke-width="1.5"/></g>`;
  // paper plane, kite and floating blocks
  s += `<g class="flutter" style="--d:11s"><path d="M${f(W * .14)} ${f(H * .3)}l${f(u * 1.1)} ${f(-u * .4)}l${f(-u * .55)} ${f(u * .6)}l${f(-u * .1)} ${f(-u * .3)}Z" fill="#fff" stroke="#c9d6f2" stroke-width="1.5" stroke-linejoin="round"/><path d="M${f(W * .14 + u * .45)} ${f(H * .3 - u * .02)}l${f(u * .65)} ${f(-u * .38)}" stroke="#c9d6f2" stroke-width="1.5"/></g>`;
  const kx = W * .42, ky = H * .12;
  s += `<g class="sway" style="--d:3s"><path d="M${f(kx)} ${f(ky - u * .55)}L${f(kx + u * .4)} ${f(ky)}L${f(kx)} ${f(ky + u * .7)}L${f(kx - u * .4)} ${f(ky)}Z" fill="#ffb3d1"/><path d="M${f(kx)} ${f(ky - u * .55)}L${f(kx + u * .4)} ${f(ky)}H${f(kx - u * .4)}Z" fill="#ffe08a"/>${face(kx, ky + u * .12, u * .1)}<path d="M${f(kx)} ${f(ky + u * .7)}q${f(-u * .2)} ${f(u * .4)} ${f(u * .1)} ${f(u * .8)}t${f(u * .1)} ${f(u * .8)}" stroke="#c9a0b8" stroke-width="1.5" fill="none"/><path d="M${f(kx - u * .08)} ${f(ky + u * 1.1)}l${f(u * .16)} ${f(u * .06)}M${f(kx + u * .02)} ${f(ky + u * 1.5)}l${f(u * .16)} ${f(u * .06)}" stroke="#8fc4ff" stroke-width="${f(u * .07)}" stroke-linecap="round"/></g>`;
  s += scatter(W, H, 10, 45, (x, y, r) => sparkle(x, y, 3 + r() * 5, ['#fff', '#fff3b0'][(r() * 2) | 0]), [0, .05, 1, .6]);
  s += [[.08, .55, '#ffcd6b', '1'], [.94, .5, '#9fe0b4', '★'], [.62, .2, '#c7a8ff', '♪']].map(([x, y, c, ch], i) => `<g class="bob" style="--d:${5 + i}s"><g transform="rotate(${i * 12 - 10} ${f(W * x)} ${f(H * y)})"><rect x="${f(W * x - u * .35)}" y="${f(H * y - u * .35)}" width="${f(u * .7)}" height="${f(u * .7)}" rx="${f(u * .12)}" fill="${c}"/><rect x="${f(W * x - u * .35)}" y="${f(H * y - u * .35)}" width="${f(u * .7)}" height="${f(u * .2)}" rx="${f(u * .12)}" fill="#fff" opacity=".35"/><text x="${f(W * x)}" y="${f(H * y + u * .14)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(u * .4)}" fill="#fff">${ch}</text></g></g>`).join('');
  // stacking-ring toy hill and back blocks
  s += hills(W, H, H * .8, H * .06, '#c9ecb4', 9, 3);
  const n = Math.max(3, Math.round(W / (u * 2.4))), cols = [['#ff9fb8', '#8fc4ff', '#ffe08a'], ['#9fe0b4', '#ff8f8f', '#c7a8ff'], ['#ffcd6b', '#c7a8ff', '#9fd8ff'], ['#8fc4ff', '#ffb38a', '#ffb3d1']];
  for (let i = 0; i < n; i++) { const c = cols[i % 4]; s += blockhouse(W * (i + .5) / n + (i % 2 ? u * .2 : -u * .2), H * .84, u * (.95 + (i % 2) * .2), c[0], c[1], 'ABCDEFGH'[i], i % 2 ? 0 : c[2]); }
  s += `<rect x="0" y="${f(H * .84)}" width="${W}" height="${f(H * .16)}" fill="#ffe7c2"/><rect x="0" y="${f(H * .84)}" width="${W}" height="${f(u * .08)}" fill="#f2cf9a"/>`;
  s += scatter(W, H, Math.round(W / u * .9), 33, (x, y) => `<path d="M${f(x)} ${f(y)}h${f(u * .9)}" stroke="#f6d6a8" stroke-width="2" stroke-linecap="round"/>`, [0, .87, 1, .99]);
  // track
  const ty = H * .925;
  s += `<path d="M0 ${f(ty)}H${W}" stroke="#d9a77a" stroke-width="${f(u * .1)}" stroke-dasharray="${f(u * .08)} ${f(u * .22)}"/><path d="M0 ${f(ty - u * .05)}H${W}M0 ${f(ty + u * .05)}H${W}" stroke="#a7a3c4" stroke-width="2.5"/>`;
  // train
  const tx = W * .45, ts = u * .78, wh = (x0) => `<circle cx="${f(x0)}" cy="${f(ty - ts * .12)}" r="${f(ts * .17)}" fill="#5b4a6a"/><circle cx="${f(x0)}" cy="${f(ty - ts * .12)}" r="${f(ts * .06)}" fill="#ffd36b"/>`;
  const car = (x0, c, load) => `<rect x="${f(x0 - ts * .55)}" y="${f(ty - ts * .62)}" width="${f(ts * 1.1)}" height="${f(ts * .45)}" rx="${f(ts * .1)}" fill="${c}"/>${load}${wh(x0 - ts * .3)}${wh(x0 + ts * .3)}`;
  s += `<g class="swim" style="--d:12s"><rect x="${f(tx - ts * .7)}" y="${f(ty - ts * 1.25)}" width="${f(ts * .6)}" height="${f(ts * .7)}" rx="${f(ts * .1)}" fill="#ff8f8f"/><rect x="${f(tx - ts * .6)}" y="${f(ty - ts * 1.15)}" width="${f(ts * .4)}" height="${f(ts * .28)}" rx="${f(ts * .06)}" fill="#bfe6ff"/><path d="M${f(tx - ts * .8)} ${f(ty - ts * 1.25)}h${f(ts * .8)}v${f(-ts * .12)}h${f(-ts * .8)}Z" fill="#c7a8ff"/><rect x="${f(tx - ts * .1)}" y="${f(ty - ts * .85)}" width="${f(ts * .95)}" height="${f(ts * .6)}" rx="${f(ts * .3)}" fill="#8fc4ff"/><circle cx="${f(tx + ts * .85)}" cy="${f(ty - ts * .55)}" r="${f(ts * .3)}" fill="#ffe08a"/>${face(tx + ts * .85, ty - ts * .57, ts * .13)}<rect x="${f(tx + ts * .3)}" y="${f(ty - ts * 1.18)}" width="${f(ts * .2)}" height="${f(ts * .35)}" rx="${f(ts * .05)}" fill="#5b4a6a"/><rect x="${f(tx - ts * .8)}" y="${f(ty - ts * .3)}" width="${f(ts * 1.75)}" height="${f(ts * .14)}" rx="${f(ts * .07)}" fill="#5b4a6a"/>${wh(tx - ts * .45)}${wh(tx + ts * .05)}${wh(tx + ts * .5)}`
    + car(tx - ts * 1.6, '#9fe0b4', `<rect x="${f(tx - ts * 1.85)}" y="${f(ty - ts * .98)}" width="${f(ts * .36)}" height="${f(ts * .36)}" rx="${f(ts * .06)}" fill="#ffcd6b"/><rect x="${f(tx - ts * 1.45)}" y="${f(ty - ts * .92)}" width="${f(ts * .3)}" height="${f(ts * .3)}" rx="${f(ts * .06)}" fill="#ff9fb8"/>`)
    + car(tx - ts * 2.85, '#ffb3d1', `<circle cx="${f(tx - ts * 2.85)}" cy="${f(ty - ts * .85)}" r="${f(ts * .25)}" fill="#e8b27a"/><circle cx="${f(tx - ts * 3.05)}" cy="${f(ty - ts * 1.06)}" r="${f(ts * .09)}" fill="#e8b27a"/><circle cx="${f(tx - ts * 2.65)}" cy="${f(ty - ts * 1.06)}" r="${f(ts * .09)}" fill="#e8b27a"/>${face(tx - ts * 2.85, ty - ts * .87, ts * .1)}`)
    + `<rect x="${f(tx - ts * 2.3)}" y="${f(ty - ts * .4)}" width="${f(ts * .3)}" height="${f(ts * .06)}" fill="#5b4a6a"/><rect x="${f(tx - ts * 1.05)}" y="${f(ty - ts * .4)}" width="${f(ts * .3)}" height="${f(ts * .06)}" fill="#5b4a6a"/></g>`;
  s += [0, 1, 2].map(i => `<circle class="float" style="--d:${3 + i}s" cx="${f(tx + ts * (.4 + i * .25))}" cy="${f(ty - ts * (1.45 + i * .35))}" r="${f(ts * (.14 + i * .05))}" fill="#fff" opacity="${.9 - i * .2}"/>`).join('');
  s += tinsoldier(W * .08, H * .99, u * .62) + tinsoldier(W * .93, H * .985, u * .55);
  s += spintop(W * .2, H * .975, u * .7, '#c7a8ff', '#ffe08a', 1.2) + spintop(W * .78, H * .99, u * .6, '#ff9fb8', '#9fd8ff', 1.5);
  const rx = W * .63, ry = H * .985;
  s += `<g><rect x="${f(rx - u * .04)}" y="${f(ry - u * 1.15)}" width="${f(u * .08)}" height="${f(u)}" fill="#e8b27a"/>${['#ff8f8f', '#ffcd6b', '#9fe0b4', '#8fc4ff'].map((c, i) => `<ellipse cx="${f(rx)}" cy="${f(ry - u * (.1 + i * .22))}" rx="${f(u * (.42 - i * .07))}" ry="${f(u * .12)}" fill="${c}"/>`).join('')}<circle cx="${f(rx)}" cy="${f(ry - u * 1.08)}" r="${f(u * .12)}" fill="#c7a8ff"/></g>`;
  return s;
};

function shelf(x0, x1, y0, y1, seed) {
  const r = R(seed), rows = Math.max(3, Math.round((y1 - y0) / ((x1 - x0) * .5 + 38)));
  const rh = (y1 - y0) / rows, cols = ['#ff9fb0', '#ffd36b', '#9fd8ff', '#a8e6b5', '#c7b2ff', '#ffb38a', '#f6e3c4', '#8fb6e6'];
  let s = `<rect x="${f(x0)}" y="${f(y0 - 10)}" width="${f(x1 - x0)}" height="${f(y1 - y0 + 10)}" rx="6" fill="#9a6b5c"/><rect x="${f(x0 + 6)}" y="${f(y0)}" width="${f(x1 - x0 - 12)}" height="${f(y1 - y0)}" fill="#6e4a52"/>`;
  for (let j = 0; j < rows; j++) {
    const by = y0 + (j + 1) * rh; let x = x0 + 8;
    while (x < x1 - 14) {
      const w = Math.min(x1 - 8 - x, 10 + r() * 13), h = rh * (.55 + r() * .32), c = cols[(r() * cols.length) | 0];
      if (w < 6) break;
      if (r() < .12 && x + h < x1 - 8) { s += `<rect x="${f(x)}" y="${f(by - 6 - w)}" width="${f(h)}" height="${f(w)}" rx="2" fill="${c}"/>`; x += h + 2; continue; }
      s += `<rect x="${f(x)}" y="${f(by - 6 - h)}" width="${f(w)}" height="${f(h)}" rx="2" fill="${c}"/>`;
      if (r() < .4) s += `<path d="M${f(x)} ${f(by - 6 - h * .75)}h${f(w)}" stroke="#fff" stroke-opacity=".5" stroke-width="${f(h * .07)}"/>`;
      x += w + 1.5;
    }
    s += `<rect x="${f(x0)}" y="${f(by - 6)}" width="${f(x1 - x0)}" height="8" fill="#b07c66"/>`;
  }
  return s;
}
function owl(x, y, s, c = '#b99ad8') {
  return `<g class="bob" style="--d:4s"><path d="M${f(x - s * .42)} ${f(y - s * 1.05)}l${f(s * .06)} ${f(-s * .28)}l${f(s * .22)} ${f(s * .18)}ZM${f(x + s * .42)} ${f(y - s * 1.05)}l${f(-s * .06)} ${f(-s * .28)}l${f(-s * .22)} ${f(s * .18)}Z" fill="${c}"/><ellipse cx="${f(x)}" cy="${f(y - s * .55)}" rx="${f(s * .5)}" ry="${f(s * .58)}" fill="${c}"/><ellipse cx="${f(x)}" cy="${f(y - s * .38)}" rx="${f(s * .32)}" ry="${f(s * .34)}" fill="#f6e6ff"/><path d="M${f(x - s * .15)} ${f(y - s * .4)}q${f(s * .05)} ${f(s * .05)} ${f(s * .1)} 0M${f(x + s * .05)} ${f(y - s * .4)}q${f(s * .05)} ${f(s * .05)} ${f(s * .1)} 0M${f(x - s * .05)} ${f(y - s * .28)}q${f(s * .05)} ${f(s * .05)} ${f(s * .1)} 0" stroke="${c}" stroke-width="1.5" fill="none"/><circle cx="${f(x - s * .2)}" cy="${f(y - s * .78)}" r="${f(s * .19)}" fill="#fff"/><circle cx="${f(x + s * .2)}" cy="${f(y - s * .78)}" r="${f(s * .19)}" fill="#fff"/><circle cx="${f(x - s * .18)}" cy="${f(y - s * .76)}" r="${f(s * .09)}" fill="#4a3a3a"/><circle cx="${f(x + s * .18)}" cy="${f(y - s * .76)}" r="${f(s * .09)}" fill="#4a3a3a"/><circle cx="${f(x - s * .15)}" cy="${f(y - s * .8)}" r="${f(s * .03)}" fill="#fff"/><circle cx="${f(x + s * .21)}" cy="${f(y - s * .8)}" r="${f(s * .03)}" fill="#fff"/><path d="M${f(x - s * .06)} ${f(y - s * .64)}h${f(s * .12)}l${f(-s * .06)} ${f(s * .1)}Z" fill="#ffb35c"/><ellipse cx="${f(x - s * .36)}" cy="${f(y - s * .6)}" rx="${f(s * .08)}" ry="${f(s * .045)}" fill="#ff9fb0" opacity=".8"/><ellipse cx="${f(x + s * .36)}" cy="${f(y - s * .6)}" rx="${f(s * .08)}" ry="${f(s * .045)}" fill="#ff9fb0" opacity=".8"/><path d="M${f(x - s * .5)} ${f(y - s * .65)}q${f(-s * .1)} ${f(s * .3)} ${f(s * .08)} ${f(s * .5)}M${f(x + s * .5)} ${f(y - s * .65)}q${f(s * .1)} ${f(s * .3)} ${f(-s * .08)} ${f(s * .5)}" stroke="#9a7fc0" stroke-width="${f(s * .05)}" fill="none" stroke-linecap="round"/><path d="M${f(x - s * .15)} ${f(y)}v${f(-s * .06)}M${f(x + s * .15)} ${f(y)}v${f(-s * .06)}" stroke="#ffb35c" stroke-width="${f(s * .08)}" stroke-linecap="round"/></g>`;
}
function openbook(x, y, s, c, d) {
  return `<g class="flutter" style="--d:${d}s"><g transform="rotate(${(x % 20) - 10} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y)}Q${f(x - s * .5)} ${f(y - s * .25)} ${f(x - s)} ${f(y - s * .05)}V${f(y + s * .45)}Q${f(x - s * .5)} ${f(y + s * .25)} ${f(x)} ${f(y + s * .5)}Z" fill="${c}"/><path d="M${f(x)} ${f(y)}Q${f(x + s * .5)} ${f(y - s * .25)} ${f(x + s)} ${f(y - s * .05)}V${f(y + s * .45)}Q${f(x + s * .5)} ${f(y + s * .25)} ${f(x)} ${f(y + s * .5)}Z" fill="${c}"/><path d="M${f(x)} ${f(y - s * .05)}Q${f(x - s * .45)} ${f(y - s * .3)} ${f(x - s * .9)} ${f(y - s * .12)}V${f(y + s * .35)}Q${f(x - s * .45)} ${f(y + s * .15)} ${f(x)} ${f(y + s * .4)}ZM${f(x)} ${f(y - s * .05)}Q${f(x + s * .45)} ${f(y - s * .3)} ${f(x + s * .9)} ${f(y - s * .12)}V${f(y + s * .35)}Q${f(x + s * .45)} ${f(y + s * .15)} ${f(x)} ${f(y + s * .4)}Z" fill="#fffaf0"/><path d="M${f(x - s * .7)} ${f(y)}q${f(s * .25)} ${f(-s * .1)} ${f(s * .5)} 0M${f(x - s * .7)} ${f(y + s * .12)}q${f(s * .25)} ${f(-s * .1)} ${f(s * .5)} 0M${f(x + s * .2)} ${f(y)}q${f(s * .25)} ${f(-s * .1)} ${f(s * .5)} 0" stroke="#d9c9e0" stroke-width="1.5" fill="none"/></g></g>`;
}
function bookstack(x, y, s, seed) {
  const r = R(seed), cols = ['#ff9fb0', '#9fd8ff', '#ffd36b', '#a8e6b5', '#c7b2ff', '#ffb38a']; let b = '', yy = y;
  for (let i = 0; i < 4; i++) { const w = s * (1 - i * .08 - r() * .1), h = s * .2, dx = (r() - .5) * s * .15, c = cols[(r() * 6) | 0]; b += `<rect x="${f(x - w / 2 + dx)}" y="${f(yy - h)}" width="${f(w)}" height="${f(h)}" rx="${f(h * .25)}" fill="${c}"/><rect x="${f(x + w / 2 + dx - s * .1)}" y="${f(yy - h * .8)}" width="${f(s * .06)}" height="${f(h * .6)}" fill="#fff" opacity=".7"/>`; yy -= h; }
  return [b, yy];
}
S.library = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#6b5a9e'], [.45, '#b89ad0'], [1, '#f6d9c6']]);
  // wallpaper dots
  s += scatter(W, H, 30, 7, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 2)}" fill="#fff" opacity=".12"/>`, [0, 0, 1, .85]);
  // arched window
  const wx = W * .5, ww = Math.min(W * .16, u * 1.6), wy = H * .05, wh = Math.min(H * .22, u * 2.4);
  s += `<g><path d="M${f(wx - ww)} ${f(wy + wh)}V${f(wy + ww)}A${f(ww)} ${f(ww)} 0 0 1 ${f(wx + ww)} ${f(wy + ww)}V${f(wy + wh)}Z" fill="#2c2a6b" stroke="#c9a684" stroke-width="${f(u * .14)}"/><path d="M${f(wx)} ${f(wy)}V${f(wy + wh)}M${f(wx - ww)} ${f(wy + ww * 1.2)}H${f(wx + ww)}" stroke="#c9a684" stroke-width="${f(u * .07)}"/><circle cx="${f(wx + ww * .45)}" cy="${f(wy + ww * .6)}" r="${f(ww * .22)}" fill="#fff3c4"/><circle cx="${f(wx + ww * .55)}" cy="${f(wy + ww * .52)}" r="${f(ww * .2)}" fill="#2c2a6b"/>${star(wx - ww * .5, wy + ww * .7, ww * .08, '#fff6c9', 'twinkle')}${star(wx - ww * .3, wy + ww * 1.6, ww * .06, '#fff6c9', 'twinkle')}${star(wx + ww * .5, wy + ww * 1.8, ww * .07, '#fff6c9', 'twinkle')}<rect x="${f(wx - ww * 1.15)}" y="${f(wy + wh)}" width="${f(ww * 2.3)}" height="${f(u * .14)}" rx="${f(u * .07)}" fill="#c9a684"/></g>`;
  // shelves
  const sw = Math.max(W * .2, u * 1.8);
  s += shelf(-6, sw, H * .06, H * .86, 3) + shelf(W - sw, W + 6, H * .06, H * .86, 5);
  s += `<path d="M${f(sw - 4)} ${f(H * .86)}V${f(H * .06)}M${f(W - sw + 4)} ${f(H * .86)}V${f(H * .06)}" stroke="#6e4a52" stroke-width="2" opacity=".5"/>`;
  // hanging lamps
  const lamp = (x, len, d) => `<g class="sway" style="--d:${d}s;transform-origin:${f(x)}px 0px;transform-box:view-box"><path d="M${f(x)} 0V${f(len)}" stroke="#8a6a5a" stroke-width="2"/><circle class="glow" cx="${f(x)}" cy="${f(len + u * .35)}" r="${f(u * .55)}" fill="#ffe7a0" opacity=".35"/><path d="M${f(x - u * .3)} ${f(len + u * .3)}L${f(x - u * .14)} ${f(len)}H${f(x + u * .14)}L${f(x + u * .3)} ${f(len + u * .3)}Z" fill="#ff9fb0"/><circle cx="${f(x)}" cy="${f(len + u * .34)}" r="${f(u * .12)}" fill="#fff3b0"/></g>`;
  s += lamp(W * .32, H * .14, 5) + lamp(W * .68, H * .1, 6);
  // floating books & dust stars
  s += openbook(W * .3, H * .36, u * .6, '#9fd8ff', 8) + openbook(W * .72, H * .3, u * .55, '#ff9fb0', 9) + openbook(W * .64, H * .64, u * .45, '#a8e6b5', 7) + openbook(W * .36, H * .7, u * .4, '#ffd36b', 10);
  s += scatter(W, H, 18, 11, (x, y, r) => sparkle(x, y, 2.5 + r() * 4, ['#fff6c9', '#fff', '#ffe08a'][(r() * 3) | 0]), [.15, .15, .85, .85]);
  // floor
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#d9a07a"/>` + scatter(W, H, Math.round(W / u), 41, (x, y) => `<path d="M${f(x)} ${f(y)}h${f(u * 1.2)}" stroke="#c48a66" stroke-width="2" stroke-linecap="round"/>`, [0, .88, 1, .99]);
  s += `<ellipse cx="${f(W * .5)}" cy="${f(H * .945)}" rx="${f(Math.min(W * .34, u * 4))}" ry="${f(u * .5)}" fill="#f2a6c0"/><ellipse cx="${f(W * .5)}" cy="${f(H * .945)}" rx="${f(Math.min(W * .3, u * 3.5))}" ry="${f(u * .38)}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".7"/>`;
  // owl on a book stack
  const [bs, by] = bookstack(W * .42, H * .955, u * 1.1, 13);
  s += bs + owl(W * .42, by, u * .8);
  const [bs2] = bookstack(W * .12, H * .985, u * .9, 17); s += bs2;
  // reading lamp + globe
  const gx = W * .66, gy = H * .955;
  s += `<g><path d="M${f(gx - u * .3)} ${f(gy)}h${f(u * .6)}" stroke="#a0806a" stroke-width="${f(u * .1)}" stroke-linecap="round"/><path d="M${f(gx)} ${f(gy)}v${f(-u * .4)}" stroke="#a0806a" stroke-width="${f(u * .08)}"/><circle cx="${f(gx)}" cy="${f(gy - u * .85)}" r="${f(u * .45)}" fill="#9fd8ff"/><path d="M${f(gx - u * .2)} ${f(gy - u * 1.15)}q${f(u * .3)} ${f(u * .1)} ${f(u * .2)} ${f(u * .3)}t${f(u * .1)} ${f(u * .25)}q${f(-u * .3)} ${f(-u * .1)} ${f(-u * .4)} ${f(-u * .3)}Z M${f(gx + u * .15)} ${f(gy - u * .75)}q${f(u * .2)} 0 ${f(u * .2)} ${f(u * .15)}t${f(-u * .15)} ${f(u * .1)}Z" fill="#a8e6b5"/><path d="M${f(gx - u * .55)} ${f(gy - u * .85)}A${f(u * .55)} ${f(u * .55)} 0 0 0 ${f(gx + u * .3)} ${f(gy - u * .38)}" stroke="#e6b94f" stroke-width="${f(u * .07)}" fill="none"/>${face(gx + u * .05, gy - u * .85, u * .12)}</g>`;
  s += cat(W * .85, H * .99, u * .55, '#fff4e6', true);
  return s;
};

function hydrangea(x, y, rr, cols, seed, href) {
  const r = R(seed); let fl = '';
  for (let i = 0; i < 17; i++) { const a = i * 2.4, d = Math.sqrt((i + .5) / 17) * rr * .8, c = cols[(r() * cols.length) | 0]; fl += `<use href="#${href}" transform="translate(${f(x + Math.cos(a) * d)} ${f(y + Math.sin(a) * d * .9)}) scale(${f(rr * (.2 + r() * .05))})" fill="${c}"/>`; }
  return `<g class="sway" style="--d:${f(5 + (x % 3))}s"><ellipse cx="${f(x - rr * .7)}" cy="${f(y + rr * .75)}" rx="${f(rr * .6)}" ry="${f(rr * .3)}" fill="#6fbf8a" transform="rotate(-25 ${f(x - rr * .7)} ${f(y + rr * .75)})"/><ellipse cx="${f(x + rr * .7)}" cy="${f(y + rr * .75)}" rx="${f(rr * .6)}" ry="${f(rr * .3)}" fill="#5fb37f" transform="rotate(25 ${f(x + rr * .7)} ${f(y + rr * .75)})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * .95)}" fill="${cols[3]}"/>${fl}</g>`;
}
function umbrella(x, y, s, c, dot = '#fff', ang = 0) {
  let sc = ''; for (let i = 0; i < 4; i++) sc += `a${f(s * .25)} ${f(s * .18)} 0 0 0 ${f(-s * .5)} 0`;
  return `<g transform="rotate(${ang} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y - s * .95)}V${f(y - s * .1)}a${f(s * .1)} ${f(s * .1)} 0 0 1 ${f(-s * .2)} 0" stroke="#8a6a7a" stroke-width="${f(s * .06)}" fill="none" stroke-linecap="round"/><path d="M${f(x + s)} ${f(y - s * .95)}A${f(s)} ${f(s * .8)} 0 0 0 ${f(x - s)} ${f(y - s * .95)}Z" fill="${c}"/><path d="M${f(x + s)} ${f(y - s * .95)}${sc}" fill="${c}"/><circle cx="${f(x - s * .45)}" cy="${f(y - s * 1.25)}" r="${f(s * .1)}" fill="${dot}"/><circle cx="${f(x + s * .1)}" cy="${f(y - s * 1.5)}" r="${f(s * .1)}" fill="${dot}"/><circle cx="${f(x + s * .55)}" cy="${f(y - s * 1.2)}" r="${f(s * .1)}" fill="${dot}"/><circle cx="${f(x)}" cy="${f(y - s * 1.77)}" r="${f(s * .07)}" fill="#8a6a7a"/></g>`;
}
function frog(x, y, s, c = '#8fd68f') {
  return `<g class="hop" style="--d:3.2s"><ellipse cx="${f(x)}" cy="${f(y - s * .32)}" rx="${f(s * .55)}" ry="${f(s * .38)}" fill="${c}"/><circle cx="${f(x - s * .28)}" cy="${f(y - s * .68)}" r="${f(s * .18)}" fill="${c}"/><circle cx="${f(x + s * .28)}" cy="${f(y - s * .68)}" r="${f(s * .18)}" fill="${c}"/><circle cx="${f(x - s * .28)}" cy="${f(y - s * .7)}" r="${f(s * .08)}" fill="#4a3a3a"/><circle cx="${f(x + s * .28)}" cy="${f(y - s * .7)}" r="${f(s * .08)}" fill="#4a3a3a"/><path d="M${f(x - s * .15)} ${f(y - s * .38)}q${f(s * .15)} ${f(s * .12)} ${f(s * .3)} 0" stroke="#4a3a3a" stroke-width="${f(s * .05)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(x - s * .36)}" cy="${f(y - s * .36)}" rx="${f(s * .09)}" ry="${f(s * .05)}" fill="#ff9fb0"/><ellipse cx="${f(x + s * .36)}" cy="${f(y - s * .36)}" rx="${f(s * .09)}" ry="${f(s * .05)}" fill="#ff9fb0"/><ellipse cx="${f(x)}" cy="${f(y - s * .15)}" rx="${f(s * .3)}" ry="${f(s * .15)}" fill="#e6f8d9"/><ellipse cx="${f(x - s * .45)}" cy="${f(y - s * .04)}" rx="${f(s * .18)}" ry="${f(s * .07)}" fill="${c}"/><ellipse cx="${f(x + s * .45)}" cy="${f(y - s * .04)}" rx="${f(s * .18)}" ry="${f(s * .07)}" fill="${c}"/></g>`;
}
function snail(x, y, s) {
  return `<g class="swim2" style="animation-duration:6s"><path d="M${f(x - s * .7)} ${f(y)}H${f(x + s * .5)}Q${f(x + s * .7)} ${f(y)} ${f(x + s * .7)} ${f(y - s * .3)}V${f(y - s * .55)}" stroke="#fff0c9" stroke-width="${f(s * .28)}" stroke-linecap="round" fill="none"/><path d="M${f(x + s * .62)} ${f(y - s * .65)}l${f(-s * .08)} ${f(-s * .25)}M${f(x + s * .78)} ${f(y - s * .65)}l${f(s * .06)} ${f(-s * .25)}" stroke="#e6d39c" stroke-width="${f(s * .05)}" stroke-linecap="round"/><circle cx="${f(x + s * .52)}" cy="${f(y - s * .92)}" r="${f(s * .05)}" fill="#e6d39c"/><circle cx="${f(x + s * .86)}" cy="${f(y - s * .92)}" r="${f(s * .05)}" fill="#e6d39c"/><circle cx="${f(x - s * .05)}" cy="${f(y - s * .45)}" r="${f(s * .45)}" fill="#ffb3c6"/><path d="M${f(x - s * .05)} ${f(y - s * .45)}m${f(-s * .28)} 0a${f(s * .28)} ${f(s * .28)} 0 1 1 ${f(s * .28)} ${f(s * .28)}a${f(s * .16)} ${f(s * .16)} 0 1 1 ${f(-s * .16)} ${f(-s * .16)}" stroke="#ff8fb0" stroke-width="${f(s * .07)}" fill="none" stroke-linecap="round"/>${face(x + s * .7, y - s * .42, s * .1)}</g>`;
}
S.rain = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#a9b8e6'], [.5, '#dfe6fb'], [1, '#e9f3ff']]);
  const fid = 'fl' + (++GID);
  s += `<defs><g id="${fid}"><circle cx="0" cy="-.5" r=".48"/><circle cx=".5" cy="0" r=".48"/><circle cx="0" cy=".5" r=".48"/><circle cx="-.5" cy="0" r=".48"/><circle cx="0" cy="0" r=".18" fill="#fff" opacity=".8"/></g></defs>`;
  s += cloud(W * .2, H * .1, u / 70, '#f2f4ff') + cloud(W * .7, H * .07, u / 60, '#eef0fb') + cloud(W * .95, H * .22, u / 90, '#f6f7ff');
  s += `<g opacity=".4" fill="none" stroke-width="${f(u * .16)}">${['#ffb3c6', '#ffe08a', '#a8e6b5', '#b3d4ff'].map((c, i) => `<path d="M${f(W * .5 + i * u * .16)} ${f(H * .84)}A${f(W * .32 - i * u * .16)} ${f(H * .58 - i * u * .16)} 0 0 1 ${f(W * 1.14 - i * u * .16)} ${f(H * .84)}" stroke="${c}"/>`).join('')}</g>`;
  s += scatter(W, H, 26, 83, (x, y, r) => `<path d="M${f(x)} ${f(y)}l${f(-u * .06)} ${f(u * .3)}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="${f(.4 + r() * .4)}"/>`, [0, .12, 1, .75]);
  s += hills(W, H, H * .8, H * .06, '#c9e6c4', 7, 3) + hills(W, H, H * .88, H * .05, '#b0dcae', 17, 4);
  // puddle
  const px = W * .55, py = H * .955;
  s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(u * 1.3)}" ry="${f(u * .26)}" fill="#bcd6fa"/>` + [0, 1].map(i => `<ellipse cx="${f(px + (i ? u * .4 : -u * .35))}" cy="${f(py)}" rx="${f(u * .3)}" ry="${f(u * .08)}" fill="none" stroke="#fff" stroke-width="2"><animate attributeName="rx" values="${f(u * .05)};${f(u * .4)}" dur="2.4s" begin="${i * 1.2}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.4s" begin="${i * 1.2}s" repeatCount="indefinite"/></ellipse>`).join('');
  const pals = [['#9fb8ff', '#b9a4ff', '#c7d4ff', '#8fa8f0'], ['#ffb3d1', '#ff9fc0', '#ffd1e3', '#e8a8ff'], ['#c7a8ff', '#a8b8ff', '#e0c8ff', '#9fd8ff']];
  const hr = Math.min(u * .75, W * .08);
  const hy = [H * .86, H * .93, H * .88, H * .95, H * .87, H * .92];
  const hx = [.06, .2, .34, .76, .9, .98];
  hx.forEach((x, i) => { s += hydrangea(W * x, hy[i], hr * (i % 2 ? .85 : 1.05), pals[i % 3], 50 + i, fid); });
  s += umbrella(W * .84, H * .975, u * .75, '#ff9fb0', '#fff', 14) + bunny(W * .64, H * .985, u * .55) + umbrella(W * .64 + u * .12, H * .985 - u * .45, u * .6, '#9fd8ff', '#fff', -8);
  s += `<ellipse cx="${f(W * .44)}" cy="${f(H * .985)}" rx="${f(u * .6)}" ry="${f(u * .15)}" fill="#7dcc8f"/>` + frog(W * .44, H * .98, u * .65);
  s += `<path d="M${f(W * .43)} ${f(H * .98 - u * .75)}V${f(H * .98 - u * 1.3)}" stroke="#5fb37f" stroke-width="3"/><path d="M${f(W * .43 - u * .45)} ${f(H * .98 - u * 1.25)}Q${f(W * .43)} ${f(H * .98 - u * 1.75)} ${f(W * .43 + u * .45)} ${f(H * .98 - u * 1.25)}Q${f(W * .43)} ${f(H * .98 - u * 1.4)} ${f(W * .43 - u * .45)} ${f(H * .98 - u * 1.25)}Z" fill="#8fd68f"/>`;
  s += snail(W * .25, H * .99, u * .5);
  s += scatter(W, H, 36, 81, (x, y, r) => `<circle class="fall" style="--d:${f(4 + r() * 3)}s;--o:${f(-r() * 7)}s;transform-box:fill-box;transform-origin:center" cx="${f(x)}" cy="${f(y)}" r="${f(2.2 + r() * 2.4)}" fill="#7fa8f0" opacity=".7"/>`, [0, -.1, 1, .8]);
  return s;
};

function bigleaf(x, y, s, ang, c, c2) {
  return `<g class="sway" style="--d:${f(4 + (x % 3))}s"><g transform="rotate(${ang} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y)}Q${f(x - s * .55)} ${f(y - s * .6)} ${f(x)} ${f(y - s * 1.4)}Q${f(x + s * .55)} ${f(y - s * .6)} ${f(x)} ${f(y)}Z" fill="${c}"/><path d="M${f(x)} ${f(y)}V${f(y - s * 1.25)}M${f(x)} ${f(y - s * .4)}l${f(-s * .22)} ${f(-s * .2)}M${f(x)} ${f(y - s * .4)}l${f(s * .22)} ${f(-s * .2)}M${f(x)} ${f(y - s * .75)}l${f(-s * .18)} ${f(-s * .18)}M${f(x)} ${f(y - s * .75)}l${f(s * .18)} ${f(-s * .18)}" stroke="${c2}" stroke-width="${f(s * .04)}" stroke-linecap="round" fill="none"/></g></g>`;
}
function vine(x, len, u, seed) {
  const r = R(seed); let lv = '';
  for (let y = u * .6; y < len; y += u * .55) { const sd = r() < .5 ? -1 : 1; lv += `<ellipse cx="${f(x + sd * u * .16)}" cy="${f(y)}" rx="${f(u * .16)}" ry="${f(u * .08)}" fill="${r() < .5 ? '#6fcf8a' : '#8fdc8f'}" transform="rotate(${sd * 30} ${f(x + sd * u * .16)} ${f(y)})"/>`; }
  return `<g class="sway" style="--d:${f(5 + r() * 2)}s;transform-origin:${f(x)}px 0px;transform-box:view-box"><path d="M${f(x)} 0Q${f(x + u * .3)} ${f(len * .5)} ${f(x)} ${f(len)}" stroke="#5fae6f" stroke-width="${f(u * .07)}" fill="none" stroke-linecap="round"/>${lv}</g>`;
}
function parrot(x, y, s) {
  return `<g class="bob" style="--d:3s"><path d="M${f(x + s * .1)} ${f(y - s * .2)}l${f(s * .25)} ${f(s * .9)}l${f(s * .1)} ${f(-s * .05)}Z" fill="#5aa8ff"/><path d="M${f(x + s * .05)} ${f(y - s * .2)}l${f(s * .1)} ${f(s * .85)}l${f(s * .12)} ${f(-s * .1)}Z" fill="#ffd36b"/><ellipse cx="${f(x)}" cy="${f(y - s * .45)}" rx="${f(s * .3)}" ry="${f(s * .42)}" fill="#ff6f7f"/><ellipse cx="${f(x + s * .12)}" cy="${f(y - s * .38)}" rx="${f(s * .15)}" ry="${f(s * .3)}" fill="#5aa8ff" transform="rotate(-10 ${f(x + s * .12)} ${f(y - s * .38)})"/><ellipse cx="${f(x + s * .12)}" cy="${f(y - s * .3)}" rx="${f(s * .1)}" ry="${f(s * .18)}" fill="#a8e6b5" transform="rotate(-10 ${f(x + s * .12)} ${f(y - s * .3)})"/><circle cx="${f(x - s * .05)}" cy="${f(y - s * .85)}" r="${f(s * .25)}" fill="#ff6f7f"/><ellipse cx="${f(x - s * .12)}" cy="${f(y - s * .85)}" rx="${f(s * .12)}" ry="${f(s * .1)}" fill="#fff"/><circle cx="${f(x - s * .12)}" cy="${f(y - s * .86)}" r="${f(s * .05)}" fill="#4a3a3a"/><path d="M${f(x - s * .25)} ${f(y - s * .82)}q${f(-s * .22)} ${f(0)} ${f(-s * .18)} ${f(s * .22)}q${f(s * .1)} ${f(-s * .08)} ${f(s * .2)} ${f(-s * .05)}Z" fill="#ffd36b"/><ellipse cx="${f(x + s * .05)}" cy="${f(y - s * .75)}" rx="${f(s * .06)}" ry="${f(s * .035)}" fill="#ffb3c6"/><path d="M${f(x - s * .12)} ${f(y - s * .03)}v${f(s * .08)}M${f(x + s * .08)} ${f(y - s * .03)}v${f(s * .08)}" stroke="#8a6a5a" stroke-width="${f(s * .06)}" stroke-linecap="round"/></g>`;
}
function monkey(x, y, s, vineLen) {
  const c = '#c08a62', l = '#ffe2c4';
  return `<g class="sway" style="--d:3.6s;transform-origin:${f(x)}px 0px;transform-box:view-box"><path d="M${f(x)} 0V${f(y - s * 1.6)}" stroke="#5fae6f" stroke-width="${f(s * .08)}"/><path d="M${f(x)} ${f(y - s * 1.65)}q${f(-s * .1)} ${f(s * .35)} ${f(-s * .05)} ${f(s * .7)}" stroke="${c}" stroke-width="${f(s * .14)}" fill="none" stroke-linecap="round"/><path d="M${f(x + s * .1)} ${f(y - s * .45)}q${f(s * .6)} ${f(s * .1)} ${f(s * .45)} ${f(-s * .5)}q${f(-s * .05)} ${f(-s * .15)} ${f(-s * .15)} ${f(-s * .05)}" stroke="${c}" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(x - s * .05)}" cy="${f(y - s * .5)}" rx="${f(s * .3)}" ry="${f(s * .36)}" fill="${c}"/><ellipse cx="${f(x - s * .05)}" cy="${f(y - s * .45)}" rx="${f(s * .18)}" ry="${f(s * .24)}" fill="${l}"/><circle cx="${f(x - s * .42)}" cy="${f(y - s * 1)}" r="${f(s * .13)}" fill="${c}"/><circle cx="${f(x + s * .32)}" cy="${f(y - s * 1)}" r="${f(s * .13)}" fill="${c}"/><circle cx="${f(x - s * .42)}" cy="${f(y - s * 1)}" r="${f(s * .07)}" fill="#ffc6c6"/><circle cx="${f(x + s * .32)}" cy="${f(y - s * 1)}" r="${f(s * .07)}" fill="#ffc6c6"/><circle cx="${f(x - s * .05)}" cy="${f(y - s * 1)}" r="${f(s * .34)}" fill="${c}"/><path d="M${f(x - s * .3)} ${f(y - s * .95)}q0 ${f(-s * .22)} ${f(s * .14)} ${f(-s * .18)}q${f(.11 * s)} ${f(-s * .04)} ${f(s * .22)} 0q${f(s * .14)} ${f(-s * .04)} ${f(s * .14)} ${f(s * .18)}q${f(s * .04)} ${f(s * .28)} ${f(-s * .25)} ${f(s * .28)}q${f(-s * .29)} 0 ${f(-s * .25)} ${f(-s * .28)}Z" fill="${l}"/>${face(x - s * .05, y - s * .97, s * .14)}<path d="M${f(x - s * .3)} ${f(y - s * .2)}v${f(s * .15)}M${f(x + s * .2)} ${f(y - s * .2)}v${f(s * .15)}" stroke="${c}" stroke-width="${f(s * .12)}" stroke-linecap="round"/></g>`;
}
S.jungle = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#bff0e0'], [.5, '#e6fbd8'], [1, '#d4f2c0']]);
  s += `<g opacity=".25" fill="#fff">${[.2, .45, .7].map((t, i) => `<path d="M${f(W * t)} 0h${f(u * .8)}L${f(W * t + u * (2.6 + i * .4))} ${f(H * .85)}h${f(-u * 1.4)}Z"/>`).join('')}</g>`;
  s += hills(W, H, H * .66, H * .1, '#a6dca0', 3, 4) + scatter(W, H, 8, 5, (x, y, r) => tree(x, y, u * (1 + r() * .5), ['#8fd68a', '#74c779', '#a3dc8c'][(r() * 3) | 0], '#9a7a5a'), [0, .64, .7, .72]);
  // waterfall on the right
  const fx = W * .8, fw = Math.max(u * .9, W * .08), ft = H * .3, fb = H * .82, [wg, wd] = lgr([[0, '#bfefff'], [1, '#8fd8f2']]);
  s += wd + `<path d="M${f(fx - fw * 1.3)} ${f(fb)}L${f(fx - fw * .9)} ${f(ft - u * .2)}Q${f(fx)} ${f(ft - u * .7)} ${f(fx + fw * 1.4)} ${f(ft - u * .4)}L${W} ${f(ft - u * .5)}V${f(fb)}Z" fill="#b6a8c9"/><path d="M${f(fx - fw * .9)} ${f(ft - u * .2)}Q${f(fx)} ${f(ft - u * .7)} ${f(fx + fw * 1.4)} ${f(ft - u * .4)}L${W} ${f(ft - u * .5)}V${f(ft - u * .15)}H${f(fx - fw * .9)}Z" fill="#8fd68a"/>`;
  s += `<rect x="${f(fx - fw / 2)}" y="${f(ft - u * .3)}" width="${f(fw)}" height="${f(fb - ft + u * .3)}" rx="${f(fw * .2)}" fill="url(#${wg})"/>`;
  s += [-.3, 0, .3].map((dx, i) => `<path d="M${f(fx + dx * fw)} ${f(ft)}V${f(fb)}" stroke="#fff" stroke-width="${f(fw * .08)}" stroke-linecap="round" stroke-dasharray="${f(u * .5)} ${f(u * .7)}" opacity=".8"><animate attributeName="stroke-dashoffset" values="${f(u * 1.2)};0" dur="${f(.8 + i * .2)}s" repeatCount="indefinite"/></path>`).join('');
  // pool
  s += `<ellipse cx="${f(fx)}" cy="${f(fb + u * .1)}" rx="${f(fw * 2.4)}" ry="${f(u * .35)}" fill="#9fdcf2"/>` + [-.8, 0, .8].map((dx, i) => `<circle class="bob" style="--d:${1.5 + i * .4}s" cx="${f(fx + dx * fw)}" cy="${f(fb)}" r="${f(fw * .32)}" fill="#fff" opacity=".85"/>`).join('');
  // ground
  s += `<path d="M0 ${f(H * .84)}Q${f(W * .3)} ${f(H * .8)} ${f(W * .6)} ${f(H * .85)}T${W} ${f(H * .84)}V${H}H0Z" fill="#8fd08a"/><path d="M0 ${f(H * .91)}Q${f(W * .35)} ${f(H * .88)} ${f(W * .7)} ${f(H * .92)}T${W} ${f(H * .9)}V${H}H0Z" fill="#74c27a"/>`;
  // vines from the top
  s += vine(W * .06, H * .42, u, 3) + vine(W * .24, H * .26, u, 7) + vine(W * .62, H * .2, u, 9) + vine(W * .95, H * .3, u, 11);
  s += monkey(W * .38, H * .38, u * .95);
  s += `<path d="M${f(W * .02)} ${f(H * .2)}Q${f(W * .12)} ${f(H * .17)} ${f(W * .2)} ${f(H * .19)}" stroke="#9a7a5a" stroke-width="${f(u * .12)}" fill="none" stroke-linecap="round"/>` + parrot(W * .13, H * .185, u * .7);
  // leaves and flowers on the ground
  s += bigleaf(-u * .1, H * 1.02, u * 2.6, 40, '#5fbf6c', '#4aa85a') + bigleaf(W * .06, H * 1.02, u * 2.2, 12, '#7dd47a', '#5fbf6c') + bigleaf(W + u * .1, H * 1.02, u * 2.5, -42, '#5fbf6c', '#4aa85a') + bigleaf(W * .93, H * 1.02, u * 2, -12, '#7dd47a', '#5fbf6c') + bigleaf(W * .5, H * 1.03, u * 1.3, -20, '#6fcf7a', '#4aa85a');
  const hib = (x, y, sz, c) => { let p = ''; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; p += `<ellipse cx="${f(x + Math.cos(a) * sz * .45)}" cy="${f(y + Math.sin(a) * sz * .45)}" rx="${f(sz * .42)}" ry="${f(sz * .32)}" fill="${c}" transform="rotate(${f(a * 180 / Math.PI)} ${f(x + Math.cos(a) * sz * .45)} ${f(y + Math.sin(a) * sz * .45)})"/>`; } return `<g>${p}<circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * .18)}" fill="#ffe08a"/></g>`; };
  s += hib(W * .3, H * .93, u * .35, '#ff8fb6') + hib(W * .66, H * .95, u * .3, '#ffb35c') + hib(W * .2, H * .97, u * .25, '#ff6f91');
  s += frog(W * .4, H * .965, u * .5, '#9fe0a0') + `<g><ellipse cx="${f(W * .58)}" cy="${f(H * .955)}" rx="${f(u * .5)}" ry="${f(u * .3)}" fill="#b6a8c9"/><ellipse cx="${f(W * .58 - u * .1)}" cy="${f(H * .94)}" rx="${f(u * .2)}" ry="${f(u * .08)}" fill="#fff" opacity=".35"/></g>`;
  s += fly4(W * .5, H * .78, u * .3, '#ffb3d1') + fly4(W * .15, H * .7, u * .25, '#9fd8ff');
  return s;
};
function fly4(x, y, sz, c) {
  return `<g class="flutter" style="--d:${f(6 + (x % 5))}s"><ellipse cx="${f(x - sz * .4)}" cy="${f(y - sz * .2)}" rx="${f(sz * .45)}" ry="${f(sz * .35)}" fill="${c}"/><ellipse cx="${f(x + sz * .4)}" cy="${f(y - sz * .2)}" rx="${f(sz * .45)}" ry="${f(sz * .35)}" fill="${c}"/><ellipse cx="${f(x - sz * .3)}" cy="${f(y + sz * .25)}" rx="${f(sz * .3)}" ry="${f(sz * .25)}" fill="${c}"/><ellipse cx="${f(x + sz * .3)}" cy="${f(y + sz * .25)}" rx="${f(sz * .3)}" ry="${f(sz * .25)}" fill="${c}"/><rect x="${f(x - sz * .06)}" y="${f(y - sz * .4)}" width="${f(sz * .12)}" height="${f(sz * .8)}" rx="${f(sz * .06)}" fill="#5b4a4a"/></g>`;
}

function croissant(x, y, s, withFace = true) {
  return `<g><path d="M${f(x - s * .7)} ${f(y + s * .1)}Q${f(x - s * .75)} ${f(y - s * .45)} ${f(x)} ${f(y - s * .5)}Q${f(x + s * .75)} ${f(y - s * .45)} ${f(x + s * .7)} ${f(y + s * .1)}Q${f(x + s * .4)} ${f(y - s * .05)} ${f(x)} ${f(y - s * .02)}Q${f(x - s * .4)} ${f(y - s * .05)} ${f(x - s * .7)} ${f(y + s * .1)}Z" fill="#f2b56b"/><path d="M${f(x - s * .35)} ${f(y - s * .38)}q${f(s * .08)} ${f(s * .15)} ${f(0)} ${f(s * .35)}M${f(x + s * .35)} ${f(y - s * .38)}q${f(-s * .08)} ${f(s * .15)} 0 ${f(s * .35)}" stroke="#d9904a" stroke-width="${f(s * .05)}" fill="none" stroke-linecap="round"/><path d="M${f(x - s * .3)} ${f(y - s * .4)}q${f(s * .3)} ${f(-s * .1)} ${f(s * .6)} 0" stroke="#ffe0a8" stroke-width="${f(s * .06)}" fill="none" stroke-linecap="round"/>${withFace ? face(x, y - s * .25, s * .1) : ''}</g>`;
}
function melonpan(x, y, s, withFace = true) {
  return `<g><path d="M${f(x - s * .5)} ${f(y)}A${f(s * .5)} ${f(s * .45)} 0 0 1 ${f(x + s * .5)} ${f(y)}Z" fill="#ffd98a"/><path d="M${f(x - s * .3)} ${f(y - s * .35)}l${f(s * .5)} ${f(s * .35)}M${f(x)} ${f(y - s * .45)}l${f(s * .45)} ${f(s * .4)}M${f(x + s * .3)} ${f(y - s * .35)}l${f(-s * .5)} ${f(s * .35)}M${f(x)} ${f(y - s * .45)}l${f(-s * .45)} ${f(s * .4)}" stroke="#f2b56b" stroke-width="${f(s * .04)}"/>${withFace ? face(x, y - s * .18, s * .1) : ''}</g>`;
}
function shokupan(x, y, s) {
  return `<g><path d="M${f(x - s * .4)} ${f(y)}V${f(y - s * .55)}a${f(s * .2)} ${f(s * .2)} 0 0 1 ${f(s * .05)} ${f(-s * .38)}a${f(s * .2)} ${f(s * .2)} 0 0 1 ${f(s * .35)} 0a${f(s * .2)} ${f(s * .2)} 0 0 1 ${f(s * .35)} 0a${f(s * .2)} ${f(s * .2)} 0 0 1 ${f(s * .05)} ${f(s * .38)}V${f(y)}Z" fill="#e8a45c"/><path d="M${f(x - s * .32)} ${f(y - s * .05)}V${f(y - s * .55)}a${f(s * .15)} ${f(s * .15)} 0 0 1 ${f(s * .05)} ${f(-s * .3)}a${f(s * .15)} ${f(s * .15)} 0 0 1 ${f(s * .27)} 0a${f(s * .15)} ${f(s * .15)} 0 0 1 ${f(s * .27)} 0a${f(s * .15)} ${f(s * .15)} 0 0 1 ${f(s * .05)} ${f(s * .3)}V${f(y - s * .05)}Z" fill="#fff4dc"/>${face(x, y - s * .45, s * .1)}</g>`;
}
function awning(x, y, w, h, c1, c2) {
  const n = 6, sw = w / n; let s = '';
  for (let i = 0; i < n; i++) s += `<path d="M${f(x + i * sw)} ${f(y)}h${f(sw)}v${f(h)}a${f(sw / 2)} ${f(sw * .35)} 0 0 1 ${f(-sw)} 0Z" fill="${i % 2 ? c2 : c1}"/>`;
  return `<path d="M${f(x - 4)} ${f(y - h * .3)}h${f(w + 8)}l-4 ${f(h * .3)}h${f(-w)}Z" fill="${c1}" opacity=".85"/>${s}`;
}
S.bakery = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#ffd6e0'], [.5, '#fff1e2'], [1, '#ffe9cf']]);
  s += sun(W * .85, H * .12, u * .65, '#ffcd6b', false);
  s += cloud(W * .15, H * .14, u / 85, '#fff') + cloud(W * .55, H * .08, u / 100, '#fff');
  // floating breads in the sky
  s += `<g class="float" style="--d:6s">${croissant(W * .3, H * .28, u * .7)}</g><g class="float" style="--d:7s">${melonpan(W * .72, H * .33, u * .7)}</g><g class="float" style="--d:5.5s">${croissant(W * .07, H * .45, u * .45, false)}</g>`;
  s += scatter(W, H, 14, 23, (x, y, r) => sparkle(x, y, 3 + r() * 5, ['#fff', '#ffe08a'][(r() * 2) | 0]), [0, .05, 1, .6]);
  // distant roofs
  s += scatter(W, H, Math.round(W / u * .45), 27, (x, y, r) => house(x, H * .76, u * (.9 + r() * .5), '#ffe4d6', '#f5c2c8'), [-.05, 0, 1.05, 0]);
  s += `<rect x="0" y="${f(H * .75)}" width="${W}" height="${f(H * .03)}" fill="#ffe4d6"/>`;
  // shop row
  const n = Math.max(3, Math.round(W / (u * 2.9))), sw = W / n, base = H * .9, sh = u * 2.1;
  const pals = [['#fff6e6', '#ff8f9f', '#fff'], ['#ffeef4', '#8fc4ff', '#fff'], ['#f6fff0', '#ffb35c', '#fff6c9'], ['#fff3dc', '#c7a8ff', '#fff'], ['#eef8ff', '#ff8fb6', '#fff']];
  for (let i = 0; i < n; i++) {
    const x0 = i * sw + sw * .06, w = sw * .88, [wall, c1, c2] = pals[i % pals.length], top = base - sh - (i % 2) * u * .3;
    let shop = `<rect x="${f(x0)}" y="${f(top)}" width="${f(w)}" height="${f(base - top)}" rx="${f(u * .1)}" fill="${wall}" stroke="#f0d6c8" stroke-width="2"/><path d="M${f(x0 - 4)} ${f(top + 2)}L${f(x0 + w / 2)} ${f(top - u * .55)}L${f(x0 + w + 4)} ${f(top + 2)}Z" fill="${c1}" stroke="${c1}" stroke-width="6" stroke-linejoin="round"/>`;
    shop += `<rect x="${f(x0 + w * .65)}" y="${f(top - u * .55)}" width="${f(u * .2)}" height="${f(u * .45)}" fill="#d9a07a"/>`;
    shop += [0, 1].map(k => `<circle class="float" style="--d:${f(2.5 + k + i * .3)}s" cx="${f(x0 + w * .65 + u * .1 + k * u * .12)}" cy="${f(top - u * (.75 + k * .3))}" r="${f(u * (.12 + k * .05))}" fill="#fff" opacity="${.85 - k * .25}"/>`).join('');
    shop += `<rect x="${f(x0 + w * .15)}" y="${f(top + u * .15)}" width="${f(w * .7)}" height="${f(u * .32)}" rx="${f(u * .16)}" fill="${c1}"/>` + (i % 2 ? melonpan(x0 + w * .5, top + u * .42, u * .3, false) : croissant(x0 + w * .5, top + u * .38, u * .32, false));
    const ay = top + u * .62; shop += awning(x0 + w * .05, ay, w * .9, u * .28, c1, c2);
    const wy = ay + u * .48, wwid = w * .5, wh = base - wy - u * .1;
    shop += `<rect x="${f(x0 + w * .08)}" y="${f(wy)}" width="${f(wwid)}" height="${f(wh)}" rx="${f(u * .08)}" fill="#fff6dc" stroke="#e9c9a8" stroke-width="2"/><rect x="${f(x0 + w * .08)}" y="${f(wy + wh * .58)}" width="${f(wwid)}" height="3" fill="#e9c9a8"/>` + croissant(x0 + w * .08 + wwid * .3, wy + wh * .52, u * .26, false) + melonpan(x0 + w * .08 + wwid * .72, wy + wh * .55, u * .24, false) + `<rect x="${f(x0 + w * .08 + wwid * .15)}" y="${f(wy + wh * .82)}" width="${f(wwid * .7)}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#e8a45c"/>`;
    shop += `<rect x="${f(x0 + w * .65)}" y="${f(wy + u * .05)}" width="${f(w * .26)}" height="${f(base - wy - u * .05)}" rx="${f(w * .13)}" fill="${c1}" opacity=".85"/><circle cx="${f(x0 + w * .7)}" cy="${f(wy + (base - wy) * .6)}" r="${f(u * .04)}" fill="#fff"/>`;
    s += `<g>${shop}</g>`;
  }
  // street
  s += `<rect x="0" y="${f(base)}" width="${W}" height="${f(H - base)}" fill="#f6dcc4"/>` + scatter(W, H, Math.round(W / u * 1.4), 37, (x, y, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(u * (.3 + r() * .2))}" height="${f(u * .14)}" rx="${f(u * .07)}" fill="#ecc9aa"/>`, [0, .92, 1, .99]);
  // bread friends and a cart
  const cx = W * .5, cy = H * .985;
  s += `<g><rect x="${f(cx - u * .8)}" y="${f(cy - u * .7)}" width="${f(u * 1.6)}" height="${f(u * .45)}" rx="${f(u * .1)}" fill="#d9a07a"/><path d="M${f(cx - u * .8)} ${f(cy - u * .7)}h${f(u * 1.6)}" stroke="#ffb3c6" stroke-width="${f(u * .08)}"/><circle cx="${f(cx - u * .45)}" cy="${f(cy - u * .15)}" r="${f(u * .15)}" fill="#8a6a7a"/><circle cx="${f(cx + u * .45)}" cy="${f(cy - u * .15)}" r="${f(u * .15)}" fill="#8a6a7a"/><path d="M${f(cx + u * .8)} ${f(cy - u * .55)}l${f(u * .4)} ${f(-u * .3)}" stroke="#a0806a" stroke-width="${f(u * .07)}" stroke-linecap="round"/><rect x="${f(cx - u * .7)}" y="${f(cy - u * .95)}" width="${f(u * .6)}" height="${f(u * .16)}" rx="${f(u * .08)}" fill="#e8a45c" transform="rotate(-12 ${f(cx - u * .4)} ${f(cy - u * .87)})"/>${melonpan(cx + u * .35, cy - u * .7, u * .45, false)}</g>`;
  s += `<g class="hop" style="--d:2.8s">${croissant(W * .2, H * .985, u * .8)}</g><g class="hop" style="--d:3.3s">${shokupan(W * .78, H * .99, u * .8)}</g><g class="bob" style="--d:3s">${melonpan(W * .36, H * .99, u * .55)}</g>`;
  s += cat(W * .92, H * .995, u * .5, '#fff', true) + `<path d="M${f(W * .92 + u * .02)} ${f(H * .995 - u * .62)}h${f(-u * .3)}v${f(-u * .1)}a${f(u * .12)} ${f(u * .12)} 0 0 1 ${f(u * .05)} ${f(-u * .2)}a${f(u * .1)} ${f(u * .1)} 0 0 1 ${f(u * .2)} 0a${f(u * .12)} ${f(u * .12)} 0 0 1 ${f(u * .05)} ${f(u * .2)}Z" fill="#fff" stroke="#eee" stroke-width="1.5"/>`;
  return s;
};

function earth(x, y, r) {
  const mk = 'em' + (++GID);
  return `<g class="bob" style="--d:9s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.5)}" fill="#9fd8ff" opacity=".15"/><mask id="${mk}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff"/></mask><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#6fb8f2"/><g mask="url(#${mk})" fill="#9fe0a0"><path d="M${f(x - r * .9)} ${f(y - r * .4)}q${f(r * .4)} ${f(-r * .4)} ${f(r * .7)} ${f(-r * .1)}t${f(r * .1)} ${f(r * .5)}q${f(-r * .5)} ${f(r * .1)} ${f(-r * .8)} ${f(-r * .1)}Z"/><path d="M${f(x + r * .2)} ${f(y + r * .25)}q${f(r * .4)} ${f(-r * .3)} ${f(r * .8)} ${f(0)}v${f(r * .5)}q${f(-r * .5)} ${f(r * .1)} ${f(-r * .8)} ${f(-r * .5)}Z"/><path d="M${f(x - r * .3)} ${f(y + r * .7)}q${f(r * .3)} ${f(-r * .1)} ${f(r * .5)} ${f(r * .2)}v${f(r * .3)}h${f(-r * .6)}Z"/></g><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="#fff" stroke-width="${f(r * .05)}" opacity=".5"/><ellipse cx="${f(x - r * .3)}" cy="${f(y - r * .6)}" rx="${f(r * .5)}" ry="${f(r * .15)}" fill="#fff" opacity=".7"/>${face(x, y + r * .05, r * .32)}</g>`;
}
S.moon = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#121546'], [.55, '#2e2b72'], [1, '#5a4a9e']]);
  s += scatter(W, H, 36, 83, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r() * 1.6)}" fill="#fff"/>`, [0, 0, 1, .72]);
  s += scatter(W, H, 40, 85, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.6 + r() * 1)}" fill="#fff" opacity=".5"/>`, [0, 0, 1, .7]);
  s += scatter(W, H, 6, 87, (x, y, r) => star(x, y, u * (.1 + r() * .1), ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), [0, .05, 1, .6]);
  s += earth(W * .2, H * .16, u * .85);
  s += `<g class="float" style="--d:7s"><circle cx="${f(W * .82)}" cy="${f(H * .3)}" r="${f(u * .32)}" fill="#ffb3a0"/><ellipse cx="${f(W * .82)}" cy="${f(H * .3)}" rx="${f(u * .6)}" ry="${f(u * .14)}" fill="none" stroke="#ffe08a" stroke-width="${f(u * .07)}" transform="rotate(-15 ${f(W * .82)} ${f(H * .3)})"/></g>`;
  s += `<g class="shoot"><path d="M${f(W * .5)} ${f(H * .06)}l${f(u * 1.6)} ${f(u * .5)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${star(W * .5 + u * 1.7, H * .06 + u * .53, u * .12, '#fff')}</g>`;
  // moon ground
  const gy = H * .8, [mg, md] = lgr([[0, '#fff6d6'], [1, '#efdca6']]);
  s += md + `<path d="M${f(-W * .1)} ${f(gy + u * .4)}Q${f(W * .5)} ${f(gy - u * .9)} ${f(W * 1.1)} ${f(gy + u * .4)}V${H}H${f(-W * .1)}Z" fill="url(#${mg})"/><path d="M${f(-W * .1)} ${f(gy + u * .4)}Q${f(W * .5)} ${f(gy - u * .9)} ${f(W * 1.1)} ${f(gy + u * .4)}" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>`;
  const crater = (x, y, rx) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * .32)}" fill="#e3cf96"/><path d="M${f(x - rx)} ${f(y)}a${f(rx)} ${f(rx * .32)} 0 0 0 ${f(rx * 2)} 0" fill="none" stroke="#fffbe8" stroke-width="2"/>`;
  s += crater(W * .1, H * .86, u * .6) + crater(W * .32, H * .83, u * .35) + crater(W * .88, H * .88, u * .7) + crater(W * .66, H * .96, u * .45) + crater(W * .04, H * .97, u * .4);
  // mochi pounding
  const mx = W * .5, my = H * .955, us = u * 1.1;
  s += `<g><path d="M${f(mx - us * .55)} ${f(my - us * .7)}H${f(mx + us * .55)}L${f(mx + us * .45)} ${f(my)}H${f(mx - us * .45)}Z" fill="#c98a5c"/><path d="M${f(mx - us * .5)} ${f(my - us * .45)}H${f(mx + us * .5)}M${f(mx - us * .47)} ${f(my - us * .2)}H${f(mx + us * .47)}" stroke="#a8714f" stroke-width="${f(us * .06)}"/><ellipse cx="${f(mx)}" cy="${f(my - us * .7)}" rx="${f(us * .55)}" ry="${f(us * .12)}" fill="#a8714f"/><path d="M${f(mx - us * .4)} ${f(my - us * .72)}Q${f(mx - us * .35)} ${f(my - us * 1.05)} ${f(mx)} ${f(my - us * 1.05)}Q${f(mx + us * .35)} ${f(my - us * 1.05)} ${f(mx + us * .4)} ${f(my - us * .72)}Z" fill="#fff"/>${face(mx, my - us * .86, us * .1)}</g>`;
  const bL = mx - us * 1.25, bR = mx + us * 1.15, px = bL + u * .32, py = my - u * .6, hx = mx - us * .1, hy = my - us * 1.22, th = Math.atan2(hy - py, hx - px) * 180 / Math.PI;
  s += bunny(bL, my + u * .02, u * .75).replace('class="hop"', '') + `<g>${rock(px, py, [0, -48, -48, 0, 0], 1.6)}<path d="M${f(px)} ${f(py)}L${f(hx)} ${f(hy)}" stroke="#d9a46a" stroke-width="${f(u * .09)}" stroke-linecap="round"/><g transform="rotate(${f(th)} ${f(hx)} ${f(hy)})"><rect x="${f(hx - us * .16)}" y="${f(hy - us * .3)}" width="${f(us * .32)}" height="${f(us * .6)}" rx="${f(us * .1)}" fill="#c98a5c"/><rect x="${f(hx - us * .16)}" y="${f(hy - us * .3)}" width="${f(us * .1)}" height="${f(us * .6)}" rx="${f(us * .05)}" fill="#fff" opacity=".25"/></g><ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(u * .1)}" ry="${f(u * .08)}" fill="#fff"/></g>`;
  s += bunny(bR, my + u * .02, u * .66, '#fff7ea').replace('class="hop"', 'class="bob" style="--d:.8s"') + `<ellipse cx="${f(bR - u * .38)}" cy="${f(my - u * .38)}" rx="${f(u * .12)}" ry="${f(u * .09)}" fill="#fff7ea"/>`;
  // little rocket
  const rx = W * .3, ry = H * .9;
  s += `<g class="bob" style="--d:5s"><path d="M${f(rx - u * .3)} ${f(ry)}l${f(-u * .2)} ${f(u * .25)}h${f(u * .25)}ZM${f(rx + u * .3)} ${f(ry)}l${f(u * .2)} ${f(u * .25)}h${f(-u * .25)}Z" fill="#ff8fa3"/><path d="M${f(rx - u * .3)} ${f(ry + u * .1)}V${f(ry - u * .6)}Q${f(rx - u * .3)} ${f(ry - u * 1.2)} ${f(rx)} ${f(ry - u * 1.4)}Q${f(rx + u * .3)} ${f(ry - u * 1.2)} ${f(rx + u * .3)} ${f(ry - u * .6)}V${f(ry + u * .1)}Z" fill="#fff"/><path d="M${f(rx - u * .2)} ${f(ry - u * 1.15)}Q${f(rx)} ${f(ry - u * 1.45)} ${f(rx + u * .2)} ${f(ry - u * 1.15)}Z" fill="#ff8fa3"/><circle cx="${f(rx)}" cy="${f(ry - u * .7)}" r="${f(u * .17)}" fill="#9fd8ff" stroke="#c7b2ff" stroke-width="${f(u * .05)}"/>${face(rx, ry - u * .25, u * .1)}</g>`;
  // tsukimi dango + susuki
  const dx = W * .82, dy = H * .975;
  s += `<g><path d="M${f(dx - u * .5)} ${f(dy)}h${f(u)}l${f(-u * .1)} ${f(-u * .2)}h${f(-u * .8)}Z" fill="#c98a5c"/><g fill="#fff" stroke="#efe4d0" stroke-width="1.5">${[[-.24, .32], [0, .32], [.24, .32], [-.12, .55], [.12, .55], [0, .78]].map(([ox, oy]) => `<circle cx="${f(dx + ox * u)}" cy="${f(dy - oy * u)}" r="${f(u * .13)}"/>`).join('')}</g></g>`;
  const susuki = (x, y, h, ang) => `<g class="sway" style="--d:${f(4 + (x % 2))}s"><path d="M${f(x)} ${f(y)}q${f(ang * h * .2)} ${f(-h * .5)} ${f(ang * h * .35)} ${f(-h)}" stroke="#c9b878" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="${f(x + ang * h * .36)}" cy="${f(y - h)}" rx="${f(h * .06)}" ry="${f(h * .22)}" fill="#f2e3b0" transform="rotate(${ang * 20} ${f(x + ang * h * .36)} ${f(y - h)})"/></g>`;
  s += susuki(W * .12, H * .99, u * 1.6, .6) + susuki(W * .15, H * .99, u * 1.3, -.4) + susuki(W * .94, H * .99, u * 1.5, -.6) + susuki(W * .91, H * .995, u * 1.2, .3);
  s += bunny(W * .18, H * .985, u * .45) + bunny(W * .7, H * .99, u * .42, '#ffeef4');
  s += sparkle(mx + us * .6, my - us * 1.1, u * .1, '#fff6c9') + sparkle(mx - us * .7, my - us * 1.4, u * .08, '#fff6c9');
  return s;
};


/* ---------- companion scenes: the second half of each collection goes deeper into the same world ---------- */
const sil = (str, c) => str.replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, `$1="${c}"`);
const stil = str => str.replace(/ class="(hop|bob|float|sway)"( style="--d:[\d.]+s")?/, '');
const twk = (W, H, n, seed, area = [0, 0, 1, .7]) => scatter(W, H, n, seed, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r() * 1.6)}" fill="#fff"/>`, area);
const dust = (W, H, n, seed, area = [0, 0, 1, .7], c = '#fff', op = .5) => `<g fill="${c}" opacity="${op}">` + scatter(W, H, n, seed, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.6 + r() * 1.1)}"/>`, area) + '</g>';
const firefly = (x, y, rr, d, b) => `<circle class="float" style="--d:${f(d)}s" cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#fff7a8"><animate attributeName="opacity" values=".15;1;.15" dur="${f(b)}s" repeatCount="indefinite"/></circle>`;
const ripple = (x, y, rx, d, b = 0, c = '#fff') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * .28)}" fill="none" stroke="${c}" stroke-width="2"><animate attributeName="rx" values="${f(rx * .2)};${f(rx)}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="ry" values="${f(rx * .06)};${f(rx * .28)}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${d}s" begin="${b}s" repeatCount="indefinite"/></ellipse>`;
const wline = (x, y, w, c = '#fff', d = 4, op = .7, sw = 2.5) => `<path class="wave" style="--d:${f(d)}s" d="M${f(x)} ${f(y)}q${f(w / 4)} ${f(-w * .15)} ${f(w / 2)} 0t${f(w / 2)} 0" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>`;
const halo = (x, y, r, c = '#fff3c4', op = .5, cls = '') => { const id = 'h' + (++GID); return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${op}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle${cls ? ` class="${cls}"` : ''} cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${id})"/>`; };
const crescent = (x, y, r, c = '#fff3c4', ink = '#7a6a4a') => { const mk = 'cm' + (++GID); return `<g class="bob" style="--d:8s">${halo(x, y, r * 2, c, .35)}<mask id="${mk}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff"/><circle cx="${f(x + r * .55)}" cy="${f(y - r * .3)}" r="${f(r * .85)}" fill="#000"/></mask><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" mask="url(#${mk})"/>${face(x - r * .4, y + r * .2, r * .26, ink)}</g>`; };
const flame = (x, y, s, d = .9) => `<g transform="translate(${f(x)} ${f(y)})"><g><animateTransform attributeName="transform" type="scale" values="1 1;.9 1.12;1.05 .94;1 1" dur="${d}s" repeatCount="indefinite"/><circle cx="0" cy="${f(-s * .5)}" r="${f(s * 1.3)}" fill="#ffe08a" opacity=".22"/><path d="M0 ${f(-s * 1.4)}Q${f(s * .6)} ${f(-s * .5)} ${f(s * .4)} ${f(-s * .15)}Q0 ${f(s * .15)} ${f(-s * .4)} ${f(-s * .15)}Q${f(-s * .6)} ${f(-s * .5)} 0 ${f(-s * 1.4)}Z" fill="#ffb35c"/><path d="M0 ${f(-s * .9)}Q${f(s * .3)} ${f(-s * .4)} ${f(s * .2)} ${f(-s * .2)}Q0 ${f(-s * .05)} ${f(-s * .2)} ${f(-s * .2)}Q${f(-s * .3)} ${f(-s * .4)} 0 ${f(-s * .9)}Z" fill="#fff3b0"/></g></g>`;
function fwork(x, y, rad, c, d, n = 14) {
  let p = ''; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; p += `<line x1="${f(x + Math.cos(a) * rad * .25)}" y1="${f(y + Math.sin(a) * rad * .25)}" x2="${f(x + Math.cos(a) * rad)}" y2="${f(y + Math.sin(a) * rad)}"/><circle cx="${f(x + Math.cos(a) * rad * 1.12)}" cy="${f(y + Math.sin(a) * rad * 1.12)}" r="${f(rad * .05)}" fill="${c}"/>`; }
  return `<g class="burst" style="--d:3.4s;--o:${d}s;transform-origin:${f(x)}px ${f(y)}px" stroke="${c}" stroke-width="${f(rad * .045)}" stroke-linecap="round">${p}</g>`;
}
function pine2(x, y, sz, c = '#6fae9a', snow = true) {
  return `<g><path d="M${f(x)} ${f(y - sz * 1.6)}l${f(sz * .5)} ${f(sz * .7)}h${f(-sz * .2)}l${f(sz * .4)} ${f(sz * .6)}h${f(-sz * 1.4)}l${f(sz * .4)} ${f(-sz * .6)}h${f(-sz * .2)}Z" fill="${c}" stroke="${c}" stroke-width="${f(sz * .08)}" stroke-linejoin="round"/>${snow ? `<path d="M${f(x)} ${f(y - sz * 1.6)}l${f(sz * .25)} ${f(sz * .35)}h${f(-sz * .5)}Z M${f(x - sz * .3)} ${f(y - sz * .9)}h${f(sz * .6)}l${f(sz * .1)} ${f(sz * .1)}h${f(-sz * .8)}Z" fill="#fff"/>` : ''}<rect x="${f(x - sz * .08)}" y="${f(y - sz * .3)}" width="${f(sz * .16)}" height="${f(sz * .3)}" fill="#9a6648"/></g>`;
}
function hab(x, y, s, c1, c2, d, who = 'sheep') {
  const top = y - s * 1.15, ny = y + s * .2, bot = y + s * .55;
  const lens = w => `M${f(x - s * .22 * w)} ${f(ny)}C${f(x - s * .78 * w)} ${f(y - s * .05)} ${f(x - s * .88 * w)} ${f(top + s * .05)} ${f(x)} ${f(top)}C${f(x + s * .88 * w)} ${f(top + s * .05)} ${f(x + s * .78 * w)} ${f(y - s * .05)} ${f(x + s * .22 * w)} ${f(ny)}Z`;
  const pas = who === 'sheep' ? `<g fill="#fff"><circle cx="${f(x - s * .1)}" cy="${f(bot + s * .04)}" r="${f(s * .12)}"/><circle cx="${f(x + s * .1)}" cy="${f(bot + s * .04)}" r="${f(s * .12)}"/></g><ellipse cx="${f(x)}" cy="${f(bot + s * .13)}" rx="${f(s * .12)}" ry="${f(s * .1)}" fill="#ffeadf"/>${face(x, bot + s * .13, s * .07)}` : `<ellipse cx="${f(x - s * .07)}" cy="${f(bot - s * .1)}" rx="${f(s * .04)}" ry="${f(s * .14)}" fill="#fff"/><ellipse cx="${f(x + s * .07)}" cy="${f(bot - s * .1)}" rx="${f(s * .04)}" ry="${f(s * .14)}" fill="#fff"/><circle cx="${f(x)}" cy="${f(bot + s * .1)}" r="${f(s * .13)}" fill="#fff"/>${face(x, bot + s * .11, s * .07)}`;
  return `<g class="float" style="--d:${d}s"><path d="${lens(1)}" fill="${c1}"/><path d="${lens(.55)}" fill="${c2}"/><path d="${lens(.2)}" fill="${c1}"/><ellipse cx="${f(x - s * .38)}" cy="${f(y - s * .7)}" rx="${f(s * .08)}" ry="${f(s * .18)}" fill="#fff" opacity=".55" transform="rotate(20 ${f(x - s * .38)} ${f(y - s * .7)})"/>${face(x, y - s * .38, s * .2)}<rect x="${f(x - s * .24)}" y="${f(ny - s * .04)}" width="${f(s * .48)}" height="${f(s * .1)}" rx="${f(s * .04)}" fill="${c2}"/><path d="M${f(x - s * .22)} ${f(ny + s * .06)}L${f(x - s * .2)} ${f(bot + s * .2)}M${f(x + s * .22)} ${f(ny + s * .06)}L${f(x + s * .2)} ${f(bot + s * .2)}" stroke="#a0806a" stroke-width="1.5"/>${pas}<rect x="${f(x - s * .24)}" y="${f(bot + s * .2)}" width="${f(s * .48)}" height="${f(s * .3)}" rx="${f(s * .06)}" fill="#d9a07a"/><path d="M${f(x - s * .24)} ${f(bot + s * .3)}h${f(s * .48)}" stroke="#b07c5a" stroke-width="1.5"/></g>`;
}

S.forest2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#a3d9d0'], [.5, '#def5df'], [1, '#d2eec4']]);
  s += `<g opacity=".25" fill="#fff">${[.28, .52, .76].map((t, i) => `<path d="M${f(W * t)} 0h${f(u * .7)}L${f(W * t + u * (1.6 + i * .3))} ${f(H * .66)}h${f(-u * 1.1)}Z"/>`).join('')}</g>`;
  s += `<g class="bob" style="--d:8s"><circle cx="${f(W * .84)}" cy="${f(H * .12)}" r="${f(u * 1)}" fill="#fff6c9" opacity=".3"/><circle cx="${f(W * .84)}" cy="${f(H * .12)}" r="${f(u * .6)}" fill="#fff3b0"/>${face(W * .84, H * .12, u * .3)}</g>`;
  s += hills(W, H, H * .6, H * .1, '#a6d8b0', 5, 4);
  s += scatter(W, H, Math.max(8, Math.round(W / u)), 3, (x, y, r) => tree(x, y, u * (1.3 + r() * .6), ['#7cc495', '#6ab889', '#8fcf9f'][(r() * 3) | 0], '#8a6a5a'), [-.02, .62, 1.02, .67]);
  // lake
  const ly = H * .66, [lg, ld] = lgr([[0, '#a8e0e8'], [1, '#79bfdc']]);
  s += ld + `<path d="M0 ${f(ly)}Q${f(W * .5)} ${f(ly - u * .3)} ${W} ${f(ly)}V${H}H0Z" fill="url(#${lg})"/><path d="M0 ${f(ly)}Q${f(W * .5)} ${f(ly - u * .3)} ${W} ${f(ly)}" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>`;
  s += scatter(W, H, 7, 7, (x, y, r) => wline(x, y, u * (.6 + r() * .5), '#fff', 3 + r() * 3), [0, .7, 1, .86]);
  // lily pads
  const pad = (x, y, sz, fl) => `<g><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(sz)}" ry="${f(sz * .38)}" fill="#86d08f"/><path d="M${f(x)} ${f(y)}L${f(x + sz)} ${f(y - sz * .12)}L${f(x + sz * .9)} ${f(y + sz * .2)}Z" fill="#8fcde0"/>${fl ? flower(x - sz * .2, y - sz * .12, sz * .32, '#ffc2dc', '#ffe08a', false) : ''}</g>`;
  s += pad(W * .5, H * .76, u * .6, true) + pad(W * .9, H * .745, u * .45, false) + pad(W * .44, H * .86, u * .4, false);
  // left bank + pier
  s += `<path d="M0 ${f(H * .76)}Q${f(W * .12)} ${f(H * .75)} ${f(W * .2)} ${f(H * .82)}Q${f(W * .24)} ${f(H * .88)} ${f(W * .14)} ${f(H * .92)}L0 ${f(H * .93)}Z" fill="#9bd98d"/>`;
  const px0 = W * .14, px1 = W * .42, pdy = H * .835;
  s += `<g><g stroke="#a8714f" stroke-width="${f(u * .1)}" stroke-linecap="round">${[.2, .5, .8, 1].map(t => `<path d="M${f(px0 + (px1 - px0) * t)} ${f(pdy)}V${f(pdy + u * .55)}"/>`).join('')}</g><rect x="${f(px0)}" y="${f(pdy - u * .14)}" width="${f(px1 - px0)}" height="${f(u * .16)}" rx="${f(u * .05)}" fill="#d9a07a"/><path d="M${f(px0)} ${f(pdy - u * .06)}H${f(px1)}" stroke="#b07c5a" stroke-width="2" stroke-dasharray="${f(u * .4)} 3"/>`
    + `<path d="M${f(px1 - u * .1)} ${f(pdy - u * .1)}V${f(pdy - u * 1.2)}" stroke="#8a6a5a" stroke-width="${f(u * .07)}"/><path d="M${f(px1 - u * .1)} ${f(pdy - u * 1.2)}h${f(u * .3)}" stroke="#8a6a5a" stroke-width="${f(u * .05)}"/>${halo(px1 + u * .2, pdy - u * .95, u * .3 * 1.3, '#fff3b0', 0.8, 'glow')}<rect x="${f(px1 + u * .08)}" y="${f(pdy - u * 1.15)}" width="${f(u * .24)}" height="${f(u * .32)}" rx="${f(u * .08)}" fill="#ffe08a" stroke="#c98a5c" stroke-width="2"/></g>`;
  s += bunny(W * .28, pdy - u * .12, u * .5, '#fff7ea');
  // boat with rowing bunnies
  const bx = W * .66, by = H * .81, bs = u * 1.35;
  s += `<g class="bob" style="--d:4s">${stil(bunny(bx - bs * .35, by + bs * .02, bs * .48))}${stil(bunny(bx + bs * .32, by + bs * .02, bs * .44, '#ffeef4'))}<g>${rock(bx - bs * .05, by - bs * .1, [-14, 18, -14], 2.4)}<path d="M${f(bx - bs * .05)} ${f(by - bs * .2)}L${f(bx - bs * .9)} ${f(by + bs * .3)}" stroke="#c98a5c" stroke-width="${f(bs * .05)}" stroke-linecap="round"/><ellipse cx="${f(bx - bs * .95)}" cy="${f(by + bs * .33)}" rx="${f(bs * .14)}" ry="${f(bs * .06)}" fill="#c98a5c" transform="rotate(-30 ${f(bx - bs * .95)} ${f(by + bs * .33)})"/></g><path d="M${f(bx - bs * .9)} ${f(by - bs * .1)}H${f(bx + bs * .9)}Q${f(bx + bs * .75)} ${f(by + bs * .3)} ${f(bx + bs * .45)} ${f(by + bs * .3)}H${f(bx - bs * .5)}Q${f(bx - bs * .8)} ${f(by + bs * .3)} ${f(bx - bs * .9)} ${f(by - bs * .1)}Z" fill="#ff9f8a"/><path d="M${f(bx - bs * .85)} ${f(by)}H${f(bx + bs * .85)}" stroke="#fff" stroke-width="${f(bs * .05)}" opacity=".8"/></g>`;
  s += ripple(bx, by + bs * .35, bs * 1.2, 3) + ripple(W * .5, H * .77, u * .5, 3.4, 1.5);
  // near shore
  s += `<path d="M0 ${f(H * .95)}Q${f(W * .35)} ${f(H * .9)} ${f(W * .62)} ${f(H * .94)}T${W} ${f(H * .91)}V${H}H0Z" fill="#8fd08a"/>`;
  const cattail = (x, h, a) => `<g class="sway" style="--d:${f(3.5 + (x % 2))}s"><path d="M${f(x)} ${f(H)}q${f(a * h * .15)} ${f(-h * .5)} ${f(a * h * .2)} ${f(-h)}" stroke="#6fae6f" stroke-width="${f(u * .05)}" fill="none"/><rect x="${f(x + a * h * .2 - u * .06)}" y="${f(H - h - u * .1)}" width="${f(u * .12)}" height="${f(u * .35)}" rx="${f(u * .06)}" fill="#b07c5a"/></g>`;
  s += cattail(W * .82, u * 1.6, -.3) + cattail(W * .86, u * 1.9, .1) + cattail(W * .9, u * 1.4, .4);
  s += tree(W * .04, H * .99, u * 2.1, '#5fbf6c', '#9a6648', true) + tree(W * .97, H * 1.01, u * 1.9, '#6bc673', '#9a6648');
  s += mushroom(W * .2, H * .99, u * .5, '#ff9fc5') + mushroom(W * .25, H * .995, u * .32, '#ffb35c');
  s += scatter(W, H, 8, 15, (x, y, r) => flower(x, y, u * (.1 + r() * .06), ['#ff9fb0', '#fff', '#ffd76a'][(r() * 3) | 0], '#ffd76a', false), [.3, .94, .78, .99]);
  s += frog(W * .62, H * .985, u * .45, '#9fe0a0');
  s += scatter(W, H, 14, 21, (x, y, r) => firefly(x, y, 2 + r() * 2.5, 4 + r() * 4, 2 + r() * 3), [0, .3, 1, .9]);
  return s;
};

S.harbor2 = (W, H) => {
  const u = Math.min(W, H) / 10, hz = H * .56;
  let s = bgr(W, H, [[0, '#9fdcff'], [.55, '#eaf8ff'], [.56, '#8ad0f2'], [1, '#56aadc']]);
  s += sun(W * .12, H * .12, u * .6) + cloud(W * .42, H * .1, u / 85) + cloud(W * .7, H * .22, u / 110);
  s += `<path d="M0 ${f(hz)}Q${f(W * .12)} ${f(hz - u * .5)} ${f(W * .26)} ${f(hz)}Z" fill="#b8dcef"/>`;
  const sail = (x, y, sz, c, d) => `<g class="bob" style="--d:${d}s"><path d="M${f(x)} ${f(y - sz * .05)}V${f(y - sz * 1.4)}" stroke="#8a6a5a" stroke-width="${f(sz * .05)}"/><path d="M${f(x + sz * .05)} ${f(y - sz * 1.35)}Q${f(x + sz * .7)} ${f(y - sz * .7)} ${f(x + sz * .6)} ${f(y - sz * .2)}H${f(x + sz * .05)}Z" fill="#fff"/><path d="M${f(x - sz * .05)} ${f(y - sz * 1.1)}L${f(x - sz * .5)} ${f(y - sz * .25)}H${f(x - sz * .05)}Z" fill="${c}"/><path d="M${f(x)} ${f(y - sz * 1.4)}l${f(sz * .25)} ${f(sz * .08)}l${f(-sz * .25)} ${f(sz * .08)}" fill="${c}"/><path d="M${f(x - sz * .7)} ${f(y - sz * .15)}H${f(x + sz * .75)}L${f(x + sz * .5)} ${f(y + sz * .15)}H${f(x - sz * .5)}Z" fill="${c}"/>${face(x, y - sz * .02, sz * .1)}</g>`;
  s += sail(W * .16, H * .64, u * .8, '#ff8fa3', 4) + sail(W * .44, H * .6, u * .45, '#ffd36b', 5) + sail(W * .58, H * .7, u * .6, '#9fd8ff', 4.6);
  s += scatter(W, H, 8, 4, (x, y, r) => wline(x, y, u * .8, '#fff', 3 + r() * 3), [0, .6, .62, .82]);
  // cliff + lighthouse
  const cx0 = W * .64, ct = H * .6;
  s += `<path d="M${f(cx0 - u * .4)} ${H}Q${f(cx0 - u * .2)} ${f(H * .8)} ${f(cx0 + u * .2)} ${f(ct + u * .35)}Q${f(cx0 + u * .5)} ${f(ct)} ${f(cx0 + u * 1.2)} ${f(ct - u * .1)}L${W} ${f(ct - u * .3)}V${H}Z" fill="#e9cfae"/><path d="M${f(cx0 + u * .05)} ${f(H * .74)}Q${f(W * .8)} ${f(H * .72)} ${W} ${f(H * .76)}M${f(cx0 - u * .2)} ${f(H * .88)}Q${f(W * .8)} ${f(H * .85)} ${W} ${f(H * .9)}" stroke="#d9b896" stroke-width="${f(u * .07)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${f(cx0 + u * .1)} ${f(ct + u * .4)}Q${f(cx0 + u * .45)} ${f(ct - u * .05)} ${f(cx0 + u * 1.2)} ${f(ct - u * .15)}L${W} ${f(ct - u * .35)}V${f(ct + u * .15)}Q${f(W * .82)} ${f(ct + u * .3)} ${f(cx0 + u * .5)} ${f(ct + u * .45)}Z" fill="#9fdc8f"/>`;
  const zz = `M${f(cx0 + u * .2)} ${f(H + 5)}L${f(cx0 + u * 1.7)} ${f(H * .9)}L${f(cx0 + u * .7)} ${f(H * .8)}L${f(cx0 + u * 1.6)} ${f(ct + u * .45)}L${f(cx0 + u * 1.2)} ${f(ct + u * .1)}`;
  s += `<path d="${zz}" stroke="#fff3dc" stroke-width="${f(u * .26)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${zz}" stroke="#e9cfae" stroke-width="${f(u * .26)}" fill="none" stroke-dasharray="2 ${f(u * .18)}"/>`;
  const lx = Math.min(W * .86, W - u * 1.1), lb = ct - u * .15, lh = u * 2.9, w0 = u * .45, w1 = u * .3;
  const wAt = t => w0 + (w1 - w0) * t;
  let band = ''; for (const [a, b] of [[.18, .36], [.54, .72]]) band += `<path d="M${f(lx - wAt(a))} ${f(lb - lh * a)}L${f(lx - wAt(b))} ${f(lb - lh * b)}H${f(lx + wAt(b))}L${f(lx + wAt(a))} ${f(lb - lh * a)}Z" fill="#ff8f9f"/>`;
  const ly = lb - lh;
  s += `<g><path d="M${f(lx - w0)} ${f(lb)}L${f(lx - w1)} ${f(ly)}H${f(lx + w1)}L${f(lx + w0)} ${f(lb)}Z" fill="#fff" stroke="#f0dbe3" stroke-width="2"/>${band}${face(lx, lb - lh * .45, u * .16)}<rect x="${f(lx - u * .12)}" y="${f(lb - u * .5)}" width="${f(u * .24)}" height="${f(u * .5)}" rx="${f(u * .12)}" fill="#8fb6e6"/>`
    + `<rect x="${f(lx - w1 * 1.4)}" y="${f(ly - u * .08)}" width="${f(w1 * 2.8)}" height="${f(u * .12)}" rx="${f(u * .04)}" fill="#ff8f9f"/><rect x="${f(lx - w1 * .8)}" y="${f(ly - u * .5)}" width="${f(w1 * 1.6)}" height="${f(u * .42)}" rx="${f(u * .06)}" fill="#fff3b0" stroke="#c9a6b8" stroke-width="2"/><path d="M${f(lx - w1)} ${f(ly - u * .5)}Q${f(lx)} ${f(ly - u * .95)} ${f(lx + w1)} ${f(ly - u * .5)}Z" fill="#ff8f9f"/><circle cx="${f(lx)}" cy="${f(ly - u * .86)}" r="${f(u * .06)}" fill="#ff8f9f"/>`
    + `<path d="M${f(lx - w1 * .6)} ${f(ly - u * .3)}L${f(lx - u * 3.2)} ${f(ly - u * .9)}V${f(ly + u * .4)}Z" fill="#fff6c9" opacity="0"><animate attributeName="opacity" values="0;.55;0;0" dur="4s" repeatCount="indefinite"/></path><path d="M${f(lx + w1 * .6)} ${f(ly - u * .3)}L${f(lx + u * 3.2)} ${f(ly - u * .9)}V${f(ly + u * .4)}Z" fill="#fff6c9" opacity="0"><animate attributeName="opacity" values="0;0;.55;0" dur="4s" repeatCount="indefinite"/></path><circle class="glow" cx="${f(lx)}" cy="${f(ly - u * .29)}" r="${f(u * .14)}" fill="#ffd36b"/></g>`;
  s += scatter(W, H, 5, 12, (x, y, r) => flower(x, y, u * (.09 + r() * .05), ['#ff9fb0', '#fff', '#ffd76a'][(r() * 3) | 0], '#ffd76a', false), [.72, .56, .98, .6]);
  s += cat(cx0 + u * 1.25, H * .78, u * .38, '#fff', true);
  s += scatter(W, H, 3, 8, (x, y) => `<g class="float" style="--d:7s"><path d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0" fill="none" stroke="#5b6b85" stroke-width="3" stroke-linecap="round"/></g>`, [.25, .05, .7, .3]);
  // rocks + fishing cats
  s += `<g><ellipse cx="${f(W * .02)}" cy="${f(H * .98)}" rx="${f(W * .2)}" ry="${f(u * .9)}" fill="#c3b8d6"/><ellipse cx="${f(W * .3)}" cy="${f(H * 1.0)}" rx="${f(W * .18)}" ry="${f(u * .8)}" fill="#b6aacb"/><ellipse cx="${f(W * .5)}" cy="${f(H * 1.02)}" rx="${f(W * .12)}" ry="${f(u * .6)}" fill="#c9bfdc"/><ellipse cx="${f(W * .26)}" cy="${f(H * .93)}" rx="${f(u * .6)}" ry="${f(u * .12)}" fill="#fff" opacity=".35"/></g>`;
  const rod = (x, y, dir, d) => { const tx = x + dir * u * 1.1, ty = y - u * 1.2; return `<path d="M${f(x)} ${f(y)}L${f(tx)} ${f(ty)}" stroke="#a8714f" stroke-width="${f(u * .05)}" stroke-linecap="round"/><path d="M${f(tx)} ${f(ty)}Q${f(tx + dir * u * .2)} ${f(ty + u * .5)} ${f(tx + dir * u * .25)} ${f(H * .83)}" stroke="#4a5a7a" stroke-width="1.5" fill="none" opacity=".55"/><g class="bob" style="--d:${d}s"><circle cx="${f(tx + dir * u * .25)}" cy="${f(H * .83)}" r="${f(u * .08)}" fill="#ff6f7f"/><path d="M${f(tx + dir * u * .25 - u * .08)} ${f(H * .83)}h${f(u * .16)}" stroke="#fff" stroke-width="${f(u * .04)}"/></g>`; };
  s += rod(W * .12 + u * .2, H * .91 - u * .35, 1, 1.8) + cat(W * .12, H * .915, u * .68, '#f6b56b', true);
  s += rod(W * .36 - u * .2, H * .94 - u * .35, -1, 2.2) + cat(W * .36, H * .945, u * .6, '#8a8a99');
  const bkx = W * .23, bky = H * .965;
  s += `<g><path d="M${f(bkx - u * .3)} ${f(bky - u * .4)}h${f(u * .6)}l${f(-u * .07)} ${f(u * .4)}h${f(-u * .46)}Z" fill="#9fd8ff"/><ellipse cx="${f(bkx)}" cy="${f(bky - u * .4)}" rx="${f(u * .3)}" ry="${f(u * .07)}" fill="#7fbfe6"/>${fish(bkx - u * .02, bky - u * .48, u * .25, '#ffd36b', '')}<path d="M${f(bkx - u * .3)} ${f(bky - u * .4)}q${f(u * .3)} ${f(-u * .45)} ${f(u * .6)} 0" stroke="#8a8a99" stroke-width="2" fill="none"/></g>`;
  s += `<g class="bob" style="--d:2.4s">${fish(W * .5, H * .76, u * .32, '#ffb3c6', '')}</g>` + ripple(W * .5, H * .79, u * .4, 2.6);
  return s;
};

S.sweets2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#e9cfff'], [.55, '#ffe2f2'], [1, '#fff0e2']]);
  s += scatter(W, H, 18, 33, (x, y, r) => sparkle(x, y, 4 + r() * 5, ['#fff', '#ffc2dc', '#fff3b0'][(r() * 3) | 0]), [0, 0, 1, .55]);
  s += cloud(W * .14, H * .12, u / 80, '#fff') + cloud(W * .86, H * .2, u / 95, '#fff');
  s += hills(W, H, H * .7, H * .1, '#ffd2e6', 9, 3);
  // cake mountain
  s += hills(W, H, H * .86, H * .05, '#fff3e3', 15, 4);
  const cx = W * .5, cb = H * .86, cw = Math.min(W * .64, u * 6.2), th = u * 1.05;
  const tier = (w, y, sp, ic, i) => { let dr = ''; const n = Math.max(4, Math.round(w / (u * .45))); for (let k = 0; k < n; k++) { const x = cx - w / 2 + (k + .5) * w / n; dr += `<path d="M${f(x - w / n * .4)} ${f(y - th + u * .05)}v${f(u * (.12 + (k % 3) * .08))}a${f(w / n * .4)} ${f(w / n * .4)} 0 0 0 ${f(w / n * .8)} 0v${f(-u * (.12 + (k % 3) * .08))}Z" fill="${ic}"/>`; } return `<rect x="${f(cx - w / 2)}" y="${f(y - th)}" width="${f(w)}" height="${f(th)}" rx="${f(u * .14)}" fill="${sp}"/><rect x="${f(cx - w / 2)}" y="${f(y - th * .42)}" width="${f(w)}" height="${f(u * .12)}" fill="#fff" opacity=".75"/><rect x="${f(cx - w / 2)}" y="${f(y - th * .42 + u * .12)}" width="${f(w)}" height="${f(u * .06)}" fill="#ff9fc5" opacity=".6"/><rect x="${f(cx - w / 2)}" y="${f(y - th)}" width="${f(w)}" height="${f(u * .16)}" rx="${f(u * .08)}" fill="${ic}"/>${dr}`; };
  s += `<g>${tier(cw, cb, '#ffe0b8', '#ff9fc5', 0)}${tier(cw * .72, cb - th, '#f6c9a0', '#a8e6cf', 1)}${tier(cw * .46, cb - th * 2, '#ffe0b8', '#b07a5a', 2)}${face(cx, cb - th * .62, u * .26)}`;
  s += `<path d="M${f(cx - u * .25)} ${f(cb - th * 3 + u * .05)}q${f(u * .25)} ${f(-u * .65)} ${f(u * .5)} 0Z" fill="#ff6f8f"/><path d="M${f(cx - u * .15)} ${f(cb - th * 3 - u * .3)}l${f(u * .15)} ${f(-u * .15)}l${f(u * .15)} ${f(u * .15)}" stroke="#7dcc7f" stroke-width="${f(u * .07)}" fill="none" stroke-linecap="round"/>`;
  s += [-.32, .32].map(k => `<rect x="${f(cx + k * cw * .46 - u * .06)}" y="${f(cb - th * 3 - u * .5)}" width="${f(u * .12)}" height="${f(u * .5)}" rx="${f(u * .04)}" fill="#9fd8ff"/>${flame(cx + k * cw * .46, cb - th * 3 - u * .52, u * .12, .8 + k)}`).join('') + '</g>';
  // chocolate river
  s += `<path d="M${f(cx - u * .5)} ${f(cb + u * .1)}C${f(W * .25)} ${f(H * .87)} ${f(W * .62)} ${f(H * .92)} ${f(W * .3)} ${H}L${f(W * .58)} ${H}C${f(W * .82)} ${f(H * .92)} ${f(W * .42)} ${f(H * .87)} ${f(cx + u * .5)} ${f(cb + u * .1)}Z" fill="#a8684a"/><path d="M${f(cx - u * .2)} ${f(cb + u * .2)}C${f(W * .34)} ${f(H * .87)} ${f(W * .62)} ${f(H * .93)} ${f(W * .42)} ${H}" stroke="#c98a66" stroke-width="${f(u * .08)}" fill="none" stroke-dasharray="${f(u * .5)} ${f(u * .4)}"><animate attributeName="stroke-dashoffset" values="${f(u * .9)};0" dur="2s" repeatCount="indefinite"/></path>`;
  s += `<g><ellipse cx="${f(W * .44)}" cy="${f(H * .9)}" rx="${f(u * .32)}" ry="${f(u * .12)}" fill="#f2c48e"/><ellipse cx="${f(W * .52)}" cy="${f(H * .95)}" rx="${f(u * .35)}" ry="${f(u * .13)}" fill="#f2c48e"/>${[.44, .52].map((k, i) => `<g fill="#d99a5c">${[-.15, 0, .15].map(dx => `<circle cx="${f(W * k + dx * u)}" cy="${f(H * (.9 + i * .05))}" r="${f(u * .025)}"/>`).join('')}</g>`).join('')}</g>`;
  const cane = (x, y, h, flip) => `<g transform="${flip ? `translate(${f(2 * x)} 0) scale(-1 1)` : ''}"><path d="M${f(x)} ${f(y)}V${f(y - h)}a${f(h * .18)} ${f(h * .18)} 0 0 1 ${f(h * .36)} 0" stroke="#fff" stroke-width="${f(u * .2)}" fill="none" stroke-linecap="round"/><path d="M${f(x)} ${f(y)}V${f(y - h)}a${f(h * .18)} ${f(h * .18)} 0 0 1 ${f(h * .36)} 0" stroke="#ff6f8f" stroke-width="${f(u * .2)}" fill="none" stroke-dasharray="${f(u * .14)} ${f(u * .14)}"/></g>`;
  s += cane(W * .06, H * .96, u * 1.6, false) + cane(W * .95, H * .95, u * 1.4, true);
  const gum = (x, y, sz, c) => `<g class="bob" style="--d:${f(3 + (x % 3))}s"><path d="M${f(x - sz * .5)} ${f(y)}Q${f(x - sz * .55)} ${f(y - sz * .9)} ${f(x)} ${f(y - sz * .9)}Q${f(x + sz * .55)} ${f(y - sz * .9)} ${f(x + sz * .5)} ${f(y)}Z" fill="${c}"/><g fill="#fff" opacity=".8"><circle cx="${f(x - sz * .2)}" cy="${f(y - sz * .65)}" r="${f(sz * .04)}"/><circle cx="${f(x + sz * .15)}" cy="${f(y - sz * .72)}" r="${f(sz * .04)}"/><circle cx="${f(x + sz * .28)}" cy="${f(y - sz * .5)}" r="${f(sz * .04)}"/></g>${face(x, y - sz * .38, sz * .16)}</g>`;
  s += gum(W * .18, H * .97, u * .7, '#9fd8ff') + gum(W * .26, H * .99, u * .5, '#ffd36b') + gum(W * .74, H * .985, u * .6, '#c7b2ff');
  const mac = (x, y, sz, c) => `<g><ellipse cx="${f(x)}" cy="${f(y - sz * .2)}" rx="${f(sz * .5)}" ry="${f(sz * .2)}" fill="${c}"/><rect x="${f(x - sz * .42)}" y="${f(y - sz * .32)}" width="${f(sz * .84)}" height="${f(sz * .12)}" fill="#fff8f0"/><ellipse cx="${f(x)}" cy="${f(y - sz * .45)}" rx="${f(sz * .5)}" ry="${f(sz * .2)}" fill="${c}"/></g>`;
  s += `<g class="hop" style="--d:3s">${mac(W * .84, H * .99, u * .8, '#ffb3d1')}${mac(W * .84, H * .99 - u * .32, u * .7, '#a8e6cf')}${mac(W * .84, H * .99 - u * .62, u * .6, '#ffe08a')}${face(W * .84, H * .99 - u * .8, u * .1)}</g>`;
  s += tree(W * .9, H * .86, u * 1.1, '#ffc6dc', '#fff') + tree(W * .1, H * .85, u * .9, '#c9f0ff', '#fff');
  s += scatter(W, H, 22, 43, (x, y, r) => `<rect class="fall" style="--d:${f(8 + r() * 8)}s;--o:${f(-r() * 10)}s" x="${f(x)}" y="${f(y)}" width="${f(u * .08)}" height="${f(u * .22)}" rx="${f(u * .04)}" fill="${['#ff8fb6', '#9fd8ff', '#ffd36b', '#9fe6b4', '#c7b2ff'][(r() * 5) | 0]}" transform="rotate(${(r() * 180) | 0} ${f(x)} ${f(y)})"/>`, [0, -.1, 1, .7]);
  return s;
};

function jelly(x, y, s, c, d) {
  let t = ''; for (let i = 0; i < 4; i++) { const tx = x - s * .45 + i * s * .3; t += `<path d="M${f(tx)} ${f(y)}q${f(s * .12)} ${f(s * .3)} 0 ${f(s * .6)}t0 ${f(s * .6)}" stroke="${c}" stroke-width="${f(s * .07)}" fill="none" stroke-linecap="round" opacity=".8"/>`; }
  return `<g class="float" style="--d:${d}s"><circle cx="${f(x)}" cy="${f(y - s * .2)}" r="${f(s * 1.1)}" fill="${c}" opacity=".14"/>${t}<path d="M${f(x - s * .65)} ${f(y)}Q${f(x - s * .7)} ${f(y - s * .85)} ${f(x)} ${f(y - s * .85)}Q${f(x + s * .7)} ${f(y - s * .85)} ${f(x + s * .65)} ${f(y)}q${f(-s * .16)} ${f(s * .12)} ${f(-s * .32)} 0t${f(-s * .33)} 0t${f(-s * .33)} 0t${f(-s * .32)} 0Z" fill="${c}"/><ellipse cx="${f(x - s * .25)}" cy="${f(y - s * .55)}" rx="${f(s * .14)}" ry="${f(s * .08)}" fill="#fff" opacity=".6"/>${face(x, y - s * .3, s * .2)}</g>`;
}
function coral2(x, y, sz, c) {
  return `<g fill="none" stroke="${c}" stroke-width="${f(sz * .2)}" stroke-linecap="round"><path d="M${f(x)} ${f(y)}V${f(y - sz)}M${f(x)} ${f(y - sz * .5)}l${f(-sz * .4)} ${f(-sz * .4)}V${f(y - sz * 1.1)}M${f(x)} ${f(y - sz * .7)}l${f(sz * .45)} ${f(-sz * .4)}"/></g><circle cx="${f(x)}" cy="${f(y - sz)}" r="${f(sz * .12)}" fill="#fff" opacity=".5"/>`;
}
S.sea2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#3f84c4'], [.45, '#2a5aa2'], [1, '#1d3a7e']]);
  const rg = 'ry' + (++GID);
  s += `<defs><linearGradient id="${rg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  s += scatter(W, H, 5, 5, (x, y, r) => `<path d="M${f(x)} 0L${f(x + u * (1 + r()))} 0L${f(x + u * 3.2)} ${H}L${f(x + u * .9)} ${H}Z" fill="url(#${rg})"/>`, [0, 0, 1, 0]);
  s += dust(W, H, 40, 3, [0, 0, 1, .85], '#cfe6ff', .45) + scatter(W, H, 14, 9, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 2)}" fill="#a8fff0"/>`, [0, .05, 1, .8]);
  s += jelly(W * .14, H * .26, u * .8, '#ffb3e6', 6) + jelly(W * .86, H * .4, u * .65, '#c7b2ff', 7) + jelly(W * .64, H * .12, u * .45, '#9fe6ff', 5.5);
  const gf = (x, y, sz, c, d) => `<g class="swim" style="--d:${d}s"><g opacity=".18"><circle class="glow" cx="${f(x)}" cy="${f(y)}" r="${f(sz * 1.2)}" fill="${c}"/></g>${fish(x, y, sz, c, '')}</g>`;
  s += gf(W * .3, H * .5, u * .5, '#ffe08a', 10) + gf(W * .78, H * .64, u * .45, '#ff9fd0', 12) + gf(W * .1, H * .64, u * .38, '#a8fff0', 9) + gf(W * .5, H * .3, u * .36, '#ffcf9f', 11);
  // anglerfish
  const ax = W * .9, ay = H * .2, as = u * .55;
  s += `<g class="bob" style="--d:5s"><path d="M${f(ax - as * .2)} ${f(ay - as * .6)}Q${f(ax - as * .5)} ${f(ay - as * 1.3)} ${f(ax - as * 1.05)} ${f(ay - as * .9)}" stroke="#8fa0d8" stroke-width="${f(as * .07)}" fill="none"/>${halo(ax - as * 1.05, ay - as * .85, as * .4 * 1.3, '#fff3a8', 0.75, 'glow')}<circle cx="${f(ax - as * 1.05)}" cy="${f(ay - as * .85)}" r="${f(as * .14)}" fill="#fff3a8"/><path d="M${f(ax + as * .6)} ${f(ay)}l${f(as * .5)} ${f(-as * .35)}v${f(as * .7)}Z" fill="#7f8fd0"/><ellipse cx="${f(ax)}" cy="${f(ay)}" rx="${f(as * .7)}" ry="${f(as * .6)}" fill="#7f8fd0"/><path d="M${f(ax - as * .65)} ${f(ay + as * .15)}q${f(as * .3)} ${f(as * .2)} ${f(as * .6)} 0" stroke="#fff" stroke-width="${f(as * .06)}" fill="none" stroke-dasharray="${f(as * .06)} ${f(as * .06)}"/>${face(ax - as * .2, ay - as * .1, as * .24)}</g>`;
  // seafloor
  s += `<path d="M0 ${f(H * .8)}Q${f(W * .3)} ${f(H * .76)} ${f(W * .55)} ${f(H * .81)}T${W} ${f(H * .79)}V${H}H0Z" fill="#8a86c8"/><path d="M0 ${f(H * .9)}Q${f(W * .4)} ${f(H * .86)} ${f(W * .7)} ${f(H * .9)}T${W} ${f(H * .89)}V${H}H0Z" fill="#a49ad8"/>`;
  s += scatter(W, H, 7, 19, (x, y, r) => `<path class="sway" style="--d:${f(3 + r() * 2)}s" d="M${f(x)} ${f(y)}q${f(-u * .3)} ${f(-u * .5)} 0 ${f(-u)}t0 ${f(-u * (.6 + r() * .6))}" fill="none" stroke="${['#5fd3b0', '#7fe0c0', '#4fbfa0'][(r() * 3) | 0]}" stroke-width="${f(u * .16)}" stroke-linecap="round"/>`, [0, .82, 1, .9]);
  s += coral2(W * .08, H * .97, u * 1.1, '#ff9fc8') + coral2(W * .24, H * .95, u * .7, '#ffb38a') + coral2(W * .78, H * .96, u * 1, '#c7a8ff') + coral2(W * .93, H * .98, u * .7, '#ff9fc8');
  s += `<g><path d="M${f(W * .66)} ${f(H * .98)}a${f(u * .45)} ${f(u * .4)} 0 0 1 ${f(u * .9)} 0Z" fill="#7fe0d0"/><path d="M${f(W * .66 + u * .15)} ${f(H * .96)}q${f(u * .3)} ${f(-u * .3)} ${f(u * .6)} 0M${f(W * .66 + u * .25)} ${f(H * .93)}q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0" stroke="#5fc3b3" stroke-width="2" fill="none"/></g>`;
  // treasure chest
  const tx = W * .44, ty = H * .955, ts = u * 1.35;
  s += `<g>${halo(tx, ty - ts * .6, ts * .9 * 1.3, '#ffe08a', 0.55, 'glow')}<path d="M${f(tx - ts * .55)} ${f(ty - ts * .55)}L${f(tx - ts * .48)} ${f(ty - ts * 1.1)}Q${f(tx)} ${f(ty - ts * 1.35)} ${f(tx + ts * .48)} ${f(ty - ts * 1.1)}L${f(tx + ts * .55)} ${f(ty - ts * .55)}Z" fill="#b07a52"/><path d="M${f(tx - ts * .42)} ${f(ty - ts * .6)}L${f(tx - ts * .38)} ${f(ty - ts * 1.02)}Q${f(tx)} ${f(ty - ts * 1.22)} ${f(tx + ts * .38)} ${f(ty - ts * 1.02)}L${f(tx + ts * .42)} ${f(ty - ts * .6)}Z" fill="#7a4f3a"/>`
    + `<g fill="#ffd36b" stroke="#e6a93a" stroke-width="1.5">${[[-.25, .62], [0, .66], [.25, .62], [-.12, .74], [.12, .74], [0, .82]].map(([dx, dy]) => `<circle cx="${f(tx + dx * ts)}" cy="${f(ty - dy * ts)}" r="${f(ts * .12)}"/>`).join('')}</g>`
    + `<rect x="${f(tx - ts * .6)}" y="${f(ty - ts * .6)}" width="${f(ts * 1.2)}" height="${f(ts * .6)}" rx="${f(ts * .08)}" fill="#c98a5c"/><path d="M${f(tx - ts * .3)} ${f(ty - ts * .6)}V${f(ty)}M${f(tx + ts * .3)} ${f(ty - ts * .6)}V${f(ty)}" stroke="#ffd36b" stroke-width="${f(ts * .08)}"/><rect x="${f(tx - ts * .1)}" y="${f(ty - ts * .5)}" width="${f(ts * .2)}" height="${f(ts * .22)}" rx="${f(ts * .04)}" fill="#ffd36b"/>${face(tx, ty - ts * .18, ts * .1)}`
    + `<g fill="#ffd36b" stroke="#e6a93a" stroke-width="1.5"><ellipse cx="${f(tx + ts * .8)}" cy="${f(ty + ts * .02)}" rx="${f(ts * .12)}" ry="${f(ts * .05)}"/><ellipse cx="${f(tx + ts * .95)}" cy="${f(ty + ts * .04)}" rx="${f(ts * .12)}" ry="${f(ts * .05)}"/><ellipse cx="${f(tx - ts * .8)}" cy="${f(ty + ts * .03)}" rx="${f(ts * .12)}" ry="${f(ts * .05)}"/></g><path d="M${f(tx - ts * .55)} ${f(ty - ts * .62)}q${f(-ts * .25)} ${f(ts * .3)} ${f(-ts * .2)} ${f(ts * .55)}" stroke="#fff" stroke-width="${f(ts * .07)}" fill="none" stroke-dasharray="1 ${f(ts * .09)}" stroke-linecap="round"/></g>`;
  s += sparkle(tx - ts * .2, ty - ts * 1.25, u * .14, '#fff6c9') + sparkle(tx + ts * .45, ty - ts * 1, u * .1, '#fff6c9');
  s += `<g>${[[-.5, .3, '#ff9fc8'], [0, .45, '#ffb3d6'], [.5, .32, '#ff9fc8']].map(([dx, r0, c]) => `<circle cx="${f(W * .3 + dx * u)}" cy="${f(H * .99)}" r="${f(u * r0)}" fill="${c}"/>`).join('')}${face(W * .3, H * .965, u * .14)}</g>`;
  const starfish = (x, y, sz, c) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? sz * .42 : sz; p.push(f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr)); } return `<g><path d="M${p.join('L')}Z" fill="${c}" stroke="${c}" stroke-width="${f(sz * .3)}" stroke-linejoin="round"/>${face(x, y + sz * .05, sz * .2)}</g>`; };
  s += starfish(W * .58, H * .975, u * .32, '#ffb38a') + starfish(W * .16, H * .99, u * .26, '#ff9fc8');
  s += scatter(W, H, 14, 29, (x, y, r) => `<circle class="rise" style="--d:${f(6 + r() * 8)}s;--o:${f(-r() * 12)}s" cx="${f(x)}" cy="${f(y)}" r="${f(3 + r() * 7)}" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`, [0, .4, 1, 1]);
  return s;
};

function pot(x, y, s, c = '#f2a07a', plant = '') {
  return `<g>${plant}<path d="M${f(x - s * .42)} ${f(y - s * .7)}H${f(x + s * .42)}L${f(x + s * .32)} ${f(y)}H${f(x - s * .32)}Z" fill="${c}"/><rect x="${f(x - s * .5)}" y="${f(y - s * .82)}" width="${f(s)}" height="${f(s * .2)}" rx="${f(s * .06)}" fill="${c}"/><rect x="${f(x - s * .5)}" y="${f(y - s * .82)}" width="${f(s)}" height="${f(s * .07)}" rx="${f(s * .03)}" fill="#fff" opacity=".3"/>${face(x, y - s * .36, s * .14)}</g>`;
}
S.garden2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#cdeeff'], [.55, '#f2fff2'], [1, '#e2f5d6']]);
  s += sun(W * .84, H * .1, u * .55, '#ffd25e', false) + cloud(W * .2, H * .12, u / 90) + cloud(W * .6, H * .06, u / 110);
  // glasshouse frame
  const cx = W / 2, cy = H * .36, rx = W * .47, ry = H * .32, fy = H * .84, fw = u * .1;
  const top = x => cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
  s += `<path d="M${f(cx - rx)} ${f(fy)}V${f(cy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(cy)}V${f(fy)}Z" fill="#fff" opacity=".22"/>`;
  let fr = `<path d="M${f(cx - rx)} ${f(fy)}V${f(cy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(cy)}V${f(fy)}"/><path d="M${f(cx - rx * .62)} ${f(fy)}V${f(cy)}A${f(rx * .62)} ${f(ry * .62)} 0 0 1 ${f(cx + rx * .62)} ${f(cy)}V${f(fy)}" opacity=".7"/><path d="M${f(cx - rx)} ${f(cy)}H${f(cx + rx)}M${f(cx - rx)} ${f(H * .6)}H${f(cx + rx)}" opacity=".7"/>`;
  const nc = Math.max(6, Math.round(W / (u * 1.4)));
  for (let i = 1; i < nc; i++) { const x = cx - rx + i * rx * 2 / nc; fr += `<path d="M${f(x)} ${f(fy)}V${f(top(x))}" opacity=".6"/>`; }
  s += `<g fill="none" stroke="#b2e0cc" stroke-width="${f(fw * 1.6)}" stroke-linecap="round">${fr}</g>`;
  s += [[.2, .28], [.7, .2], [.38, .5]].map(([a, b]) => `<path d="M${f(W * a)} ${f(H * b)}l${f(u * .5)} ${f(-u * .5)}M${f(W * a + u * .2)} ${f(H * b + u * .1)}l${f(u * .3)} ${f(-u * .3)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join('');
  // hanging baskets
  const hang = (x, len, c, d) => { let tr = ''; for (let k = -1; k <= 1; k++) tr += `<path d="M${f(x + k * u * .25)} ${f(len + u * .2)}q${f(k * u * .15)} ${f(u * .4)} ${f(k * u * .05)} ${f(u * .8)}" stroke="#6fbf73" stroke-width="${f(u * .06)}" fill="none"/><ellipse cx="${f(x + k * u * .27)}" cy="${f(len + u * .7)}" rx="${f(u * .1)}" ry="${f(u * .06)}" fill="#7dcc7f"/>`; return `<g class="sway" style="--d:${d}s;transform-origin:${f(x)}px ${f(top(x))}px;transform-box:view-box"><path d="M${f(x)} ${f(top(x))}V${f(len)}M${f(x)} ${f(len)}l${f(-u * .35)} ${f(u * .2)}M${f(x)} ${f(len)}l${f(u * .35)} ${f(u * .2)}" stroke="#c9a684" stroke-width="2"/>${tr}<path d="M${f(x - u * .4)} ${f(len + u * .2)}h${f(u * .8)}q0 ${f(u * .35)} ${f(-u * .4)} ${f(u * .35)}q${f(-u * .4)} 0 ${f(-u * .4)} ${f(-u * .35)}Z" fill="#d9a07a"/>${flower(x - u * .15, len + u * .15, u * .14, c, '#fff', false)}${flower(x + u * .18, len + u * .12, u * .12, '#fff', c, false)}</g>`; };
  s += hang(W * .2, H * .26, '#ff8fb6', 4.5) + hang(W * .8, H * .24, '#c7a8ff', 5.2);
  // lush back bed
  s += `<rect x="0" y="${f(H * .74)}" width="${W}" height="${f(fy - H * .74)}" fill="#c9ecb4"/>` + bigleaf(W * .08, H * .84, u * 1.9, -8, '#6fcf7a', '#4aa85a') + bigleaf(W * .14, H * .84, u * 1.5, 22, '#8fdc8f', '#5fbf6c') + bigleaf(W * .9, H * .84, u * 2, 10, '#6fcf7a', '#4aa85a') + bigleaf(W * .84, H * .84, u * 1.4, -24, '#8fdc8f', '#5fbf6c');
  s += scatter(W, H, Math.round(W / u * .7), 29, (x, y, r) => stil(flower(x, y, u * (.15 + r() * .08), ['#ff8fb6', '#ffd36b', '#c7a8ff', '#ff9f7a', '#fff'][(r() * 5) | 0], '#ffd76a', true)), [.02, .72, .98, .77]);
  // floor + benches
  s += `<rect x="0" y="${f(fy)}" width="${W}" height="${f(H - fy)}" fill="#e9f3dc"/>` + checker(0, H * .9, W, H * .1, Math.max(8, Math.round(W / (u * .7)))).replace(/#43385a/g, '#d4e9c4').replace(/fill="#fff"/, 'fill="#f6fbef"');
  s += `<rect x="0" y="${f(fy)}" width="${W}" height="${f(u * .08)}" fill="#cfe2bd"/>`;
  const bench = (x0, x1, y) => `<rect x="${f(x0)}" y="${f(y)}" width="${f(x1 - x0)}" height="${f(u * .14)}" rx="${f(u * .05)}" fill="#d9a07a"/><path d="M${f(x0 + u * .2)} ${f(y)}v${f(u * .9)}M${f(x1 - u * .2)} ${f(y)}v${f(u * .9)}" stroke="#b07c5a" stroke-width="${f(u * .1)}"/>`;
  const by = H * .86;
  s += bench(W * .02, W * .36, by) + bench(W * .64, W * .98, by);
  const cac = (x, y, sz) => `<rect x="${f(x - sz * .18)}" y="${f(y - sz * 1.4)}" width="${f(sz * .36)}" height="${f(sz * .8)}" rx="${f(sz * .18)}" fill="#8fd68f"/><circle cx="${f(x)}" cy="${f(y - sz * 1.42)}" r="${f(sz * .1)}" fill="#ff8fb6"/>`;
  const tul = (x, y, sz, c) => `<path d="M${f(x)} ${f(y - sz * .7)}V${f(y - sz * 1.4)}" stroke="#5fb36b" stroke-width="${f(sz * .08)}"/><path d="M${f(x - sz * .25)} ${f(y - sz * 1.7)}v${f(sz * .2)}q0 ${f(sz * .25)} ${f(sz * .25)} ${f(sz * .25)}q${f(sz * .25)} 0 ${f(sz * .25)} ${f(-sz * .25)}v${f(-sz * .2)}l${f(-sz * .12)} ${f(sz * .12)}l${f(-sz * .13)} ${f(-sz * .15)}l${f(-sz * .12)} ${f(sz * .15)}Z" fill="${c}"/>`;
  const fern = (x, y, sz) => [-40, -15, 15, 40].map(a => `<ellipse cx="${f(x)}" cy="${f(y - sz * 1.15)}" rx="${f(sz * .14)}" ry="${f(sz * .45)}" fill="#7dcc7f" transform="rotate(${a} ${f(x)} ${f(y - sz * .75)})"/>`).join('');
  const ps = Math.min(u * .85, W * .08);
  s += pot(W * .08, by, ps, '#f2a07a', tul(W * .08, by, ps, '#ff6f91') + tul(W * .08 + ps * .3, by + ps * .1, ps * .9, '#ffb347')) + pot(W * .19, by, ps * .8, '#9fd8ff', cac(W * .19, by, ps * .8)) + pot(W * .3, by, ps * .9, '#ffb3c6', fern(W * .3, by, ps * .9));
  s += pot(W * .7, by, ps * .85, '#c7b2ff', fern(W * .7, by, ps * .85)) + pot(W * .81, by, ps, '#f2a07a', `<g>${flower(W * .81 - ps * .2, by - ps * 1.15, ps * .2, '#ff8fb6', '#ffd76a', false)}${flower(W * .81 + ps * .22, by - ps * 1.05, ps * .18, '#ffd36b', '#fff', false)}${flower(W * .81, by - ps * 1.4, ps * .2, '#fff', '#ffd76a', false)}</g>`) + pot(W * .92, by, ps * .75, '#a8e6b5', cac(W * .92, by, ps * .75));
  s += bigleaf(-u * .2, H * 1.02, u * 2.2, 35, '#6fcf7a', '#4aa85a') + bigleaf(W + u * .2, H * 1.02, u * 2.1, -35, '#7dd47a', '#5fbf6c');
  // watering can + friends on the floor
  const wx = W * .6, wy = H * .975;
  s += `<g class="bob" style="--d:3.4s"><path d="M${f(wx - u * .4)} ${f(wy)}V${f(wy - u * .6)}Q${f(wx)} ${f(wy - u * .75)} ${f(wx + u * .4)} ${f(wy - u * .6)}V${f(wy)}Z" fill="#9fd8ff"/><path d="M${f(wx + u * .4)} ${f(wy - u * .25)}L${f(wx + u * .85)} ${f(wy - u * .75)}" stroke="#9fd8ff" stroke-width="${f(u * .1)}" stroke-linecap="round"/><ellipse cx="${f(wx + u * .9)}" cy="${f(wy - u * .8)}" rx="${f(u * .1)}" ry="${f(u * .14)}" fill="#7fc0f0" transform="rotate(40 ${f(wx + u * .9)} ${f(wy - u * .8)})"/><path d="M${f(wx - u * .4)} ${f(wy - u * .5)}q${f(-u * .3)} ${f(u * .2)} 0 ${f(u * .4)}" stroke="#7fc0f0" stroke-width="${f(u * .07)}" fill="none"/>${face(wx, wy - u * .32, u * .13)}</g>`;
  s += bunny(W * .4, H * .985, u * .5) + `<g class="bob" style="--d:5s">${snail(W * .5, H * .99, u * .36)}</g>`;
  s += fly4(W * .26, H * .5, u * .42, '#ffb3d1') + fly4(W * .76, H * .44, u * .36, '#ffe08a') + fly4(W * .6, H * .66, u * .3, '#b3d4ff') + fly4(W * .12, H * .62, u * .3, '#c7a8ff');
  s += scatter(W, H, 10, 37, (x, y, r) => `<ellipse class="fall" style="--d:${f(10 + r() * 8)}s;--o:${f(-r() * 14)}s" cx="${f(x)}" cy="${f(y)}" rx="${f(u * .09)}" ry="${f(u * .06)}" fill="#ffc6d6"/>`, [0, -.1, 1, .6]);
  return s;
};

S.festival2 = (W, H) => {
  const u = Math.min(W, H) / 10, rv = H * .7;
  let s = bgr(W, H, [[0, '#15174e'], [.45, '#2f2a74'], [.7, '#5a4290'], [.71, '#2c3478'], [1, '#3b3f8e']]);
  s += dust(W, H, 24, 5, [0, 0, 1, .55], '#fff', .55) + twk(W, H, 10, 7, [0, 0, 1, .5]);
  const F = [[.2, .18, 1.2, '#ffd36b', 0], [.8, .14, 1.1, '#ff8fb6', -1.2], [.52, .3, .8, '#9fe6ff', -2.3], [.36, .1, .6, '#c7b2ff', -.6], [.68, .36, .55, '#a8e6b5', -1.8]];
  s += F.map(([x, y, r0, c, d]) => fwork(W * x, H * y, u * r0, c, d, r0 > .7 ? 16 : 12)).join('');
  // far town on the opposite bank
  const r = R(21); let x = -u * .3, tw = '';
  while (x < W + u) { const w = u * (.7 + r() * .8), h = u * (.5 + r() * .9); tw += `<rect x="${f(x)}" y="${f(rv - h)}" width="${f(w)}" height="${f(h)}" fill="#2a2462"/><path d="M${f(x - u * .08)} ${f(rv - h)}L${f(x + w / 2)} ${f(rv - h - u * .3)}L${f(x + w + u * .08)} ${f(rv - h)}Z" fill="#231e56"/>`; for (let k = 0; k < 2; k++) if (r() < .7) tw += `<rect x="${f(x + w * (.2 + k * .4))}" y="${f(rv - h * .7)}" width="${f(u * .14)}" height="${f(u * .16)}" rx="2" fill="#ffe08a" opacity=".8"/>`; x += w + u * .05; }
  s += tw;
  const pg = W * .6, pgb = rv;
  s += `<g fill="#231e56">${[0, 1, 2].map(k => `<rect x="${f(pg - u * (.35 - k * .06))}" y="${f(pgb - u * (1 + k * .5))}" width="${f(u * (.7 - k * .12))}" height="${f(u * .5)}"/><path d="M${f(pg - u * (.6 - k * .1))} ${f(pgb - u * (1 + k * .5))}Q${f(pg)} ${f(pgb - u * (1.2 + k * .5))} ${f(pg + u * (.6 - k * .1))} ${f(pgb - u * (1 + k * .5))}Z"/>`).join('')}<path d="M${f(pg)} ${f(pgb - u * 2.2)}V${f(pgb - u * 2.6)}" stroke="#231e56" stroke-width="3"/></g>`;
  // river + reflections
  s += `<rect x="0" y="${f(rv)}" width="${W}" height="${f(u * .06)}" fill="#fff" opacity=".25"/>` + F.slice(0, 3).map(([fx, , , c], i) => `<g opacity=".45">${wline(W * fx - u * .4, rv + u * (.3 + i * .15), u * .8, c, 3 + i)}${wline(W * fx - u * .25, rv + u * (.6 + i * .15), u * .5, c, 4 + i)}</g>`).join('');
  // taiko bridge
  const bx0 = W * .02, bx1 = Math.min(W * .34, bx0 + u * 3.6), bm = (bx0 + bx1) / 2, bt = rv + u * .2, bp = bt - u * .8;
  s += `<g><path d="M${f(bx0)} ${f(bt + u * .3)}Q${f(bm)} ${f(bp - u * .1)} ${f(bx1)} ${f(bt + u * .3)}" stroke="#ff6b6b" stroke-width="${f(u * .2)}" fill="none"/><path d="M${f(bx0)} ${f(bt)}Q${f(bm)} ${f(bp - u * .5)} ${f(bx1)} ${f(bt)}" stroke="#ff8f8f" stroke-width="${f(u * .07)}" fill="none"/>${[.12, .3, .5, .7, .88].map(t => { const xx = bx0 + (bx1 - bx0) * t, yy = (1 - t) * (1 - t) * (bt + u * .3) + 2 * t * (1 - t) * (bp - u * .1) + t * t * (bt + u * .3); return `<path d="M${f(xx)} ${f(yy)}v${f(-u * .38)}" stroke="#ff8f8f" stroke-width="${f(u * .06)}"/>`; }).join('')}<circle class="glow" cx="${f(bm)}" cy="${f(bp - u * .55)}" r="${f(u * .14)}" fill="#ffe08a"/></g>`;
  // floating lanterns
  const [hg, hd] = rgr([[0, '#ffd36b', .55], [1, '#ffd36b', 0]]);
  s += hd;
  const toro = (x, y, sz, d) => `<g class="swim" style="--d:${d}s"><ellipse cx="${f(x)}" cy="${f(y + sz * .5)}" rx="${f(sz * .45)}" ry="${f(sz * .8)}" fill="url(#${hg})"/><circle class="glow" cx="${f(x)}" cy="${f(y - sz * .2)}" r="${f(sz * 1.1)}" fill="url(#${hg})"/><rect x="${f(x - sz * .4)}" y="${f(y - sz * .55)}" width="${f(sz * .8)}" height="${f(sz * .6)}" rx="${f(sz * .08)}" fill="#fff0b8"/><path d="M${f(x - sz * .5)} ${f(y - sz * .55)}h${f(sz)}l${f(-sz * .12)} ${f(-sz * .16)}h${f(-sz * .76)}Z" fill="#ff7b7b"/><rect x="${f(x - sz * .5)}" y="${f(y + sz * .05)}" width="${f(sz)}" height="${f(sz * .12)}" rx="${f(sz * .04)}" fill="#c98a5c"/>${face(x, y - sz * .27, sz * .14)}</g>`;
  s += toro(W * .42, H * .765, u * .62, 11) + toro(W * .72, H * .79, u * .7, 13) + toro(W * .9, H * .745, u * .52, 10) + toro(W * .56, H * .84, u * .76, 12) + toro(W * .26, H * .84, u * .66, 14) + toro(W * .08, H * .785, u * .5, 9);
  s += scatter(W, H, 5, 17, (x, y, r) => `<g class="float" style="--d:${f(5 + r() * 3)}s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(u * .35)}" fill="url(#${hg})"/><path d="M${f(x - u * .12)} ${f(y - u * .14)}h${f(u * .24)}l${f(u * .04)} ${f(u * .28)}h${f(-u * .32)}Z" fill="#ffe8a8"/></g>`, [.05, .4, .95, .62]);
  // near bank with stalls
  const gb = H * .875;
  s += `<path d="M0 ${f(gb)}Q${f(W * .5)} ${f(gb - u * .2)} ${W} ${f(gb)}V${H}H0Z" fill="#4b3266"/><path d="M0 ${f(gb)}Q${f(W * .5)} ${f(gb - u * .2)} ${W} ${f(gb)}" stroke="#7a5a9a" stroke-width="3" fill="none"/>`;
  const stall = (x, sz, c) => `<g><rect x="${f(x - sz * .7)}" y="${f(H - sz * .95)}" width="${f(sz * 1.4)}" height="${f(sz)}" fill="#f6e3c4"/><rect x="${f(x - sz * .6)}" y="${f(H - sz * .8)}" width="${f(sz * 1.2)}" height="${f(sz * .3)}" fill="#fff3b0" class="glow"/><path d="M${f(x - sz * .85)} ${f(H - sz * .95)}h${f(sz * 1.7)}l${f(-sz * .15)} ${f(-sz * .35)}h${f(-sz * 1.4)}Z" fill="${c}"/><path d="M${f(x - sz * .85)} ${f(H - sz * .95)}h${f(sz * 1.7)}" stroke="#fff" stroke-width="${f(sz * .06)}" stroke-dasharray="${f(sz * .15)} ${f(sz * .15)}"/><circle cx="${f(x - sz * .5)}" cy="${f(H - sz * .45)}" r="${f(sz * .1)}" fill="#ff6b6b"/><circle cx="${f(x - sz * .22)}" cy="${f(H - sz * .45)}" r="${f(sz * .1)}" fill="#ffe08a"/></g>`;
  s += stall(W * .1, u * 1.3, '#ff6b6b') + stall(W * .9, u * 1.2, '#5aa8ff');
  const ly = H * .905, n2 = Math.max(4, Math.round(W / (u * 1.4))); let lg = '';
  for (let i = 0; i < n2; i++) { const t = (i + .5) / n2, x = W * (.22 + .56 * t), y = ly + u * .3 * 4 * t * (1 - t); lg += `<ellipse cx="${f(x)}" cy="${f(y + u * .2)}" rx="${f(u * .17)}" ry="${f(u * .2)}" fill="${i % 2 ? '#ff8f8f' : '#ffe08a'}"/>`; }
  s += `<path d="M${f(W * .2)} ${f(ly)}Q${f(W * .5)} ${f(ly + u * .6)} ${f(W * .8)} ${f(ly)}" stroke="#2c2048" stroke-width="2" fill="none"/><g class="glow">${lg}</g>`;
  s += cat(W * .38, H * .995, u * .6, '#fff') + bunny(W * .6, H * .995, u * .55, '#fff7ea');
  s += `<g class="sway" style="--d:3s"><path d="M${f(W * .6 + u * .35)} ${f(H * .995 - u * .35)}v${f(-u * .3)}" stroke="#ff8fb6" stroke-width="2"/><path d="M${f(W * .6 + u * .2)} ${f(H * .995 - u * .65)}q${f(u * .15)} ${f(-u * .2)} ${f(u * .3)} 0q${f(u * .1)} ${f(u * .5)} ${f(-u * .15)} ${f(u * .5)}q${f(-u * .25)} 0 ${f(-u * .15)} ${f(-u * .5)}Z" fill="#cfe9ff" opacity=".85"/>${fish(W * .6 + u * .35, H * .995 - u * .42, u * .14, '#ff7b5c', '')}</g>`;
  return s;
};

function mhouse(x, y, s, cap) {
  return `<g><rect x="${f(x - s * .32)}" y="${f(y - s * .85)}" width="${f(s * .64)}" height="${f(s * .85)}" rx="${f(s * .18)}" fill="#fff4e3"/><path d="M${f(x - s * .12)} ${f(y)}v${f(-s * .3)}a${f(s * .12)} ${f(s * .12)} 0 0 1 ${f(s * .24)} 0v${f(s * .3)}Z" fill="#c98a5c"/><circle class="glow" cx="${f(x + s * .02)}" cy="${f(y - s * .58)}" r="${f(s * .1)}" fill="#ffe08a" stroke="#d9b08a" stroke-width="2"/>`
    + `<rect x="${f(x + s * .35)}" y="${f(y - s * 1.6)}" width="${f(s * .14)}" height="${f(s * .3)}" fill="#a8714f"/>${[0, 1].map(k => `<circle class="float" style="--d:${f(2.5 + k)}s" cx="${f(x + s * (.44 + k * .1))}" cy="${f(y - s * (1.75 + k * .2))}" r="${f(s * (.07 + k * .03))}" fill="#fff" opacity="${.85 - k * .25}"/>`).join('')}`
    + `<path d="M${f(x - s * .85)} ${f(y - s * .75)}Q${f(x - s * .8)} ${f(y - s * 1.65)} ${f(x)} ${f(y - s * 1.65)}Q${f(x + s * .8)} ${f(y - s * 1.65)} ${f(x + s * .85)} ${f(y - s * .75)}Q${f(x)} ${f(y - s * .6)} ${f(x - s * .85)} ${f(y - s * .75)}Z" fill="${cap}"/><circle cx="${f(x - s * .4)}" cy="${f(y - s * 1.1)}" r="${f(s * .13)}" fill="#fff"/><circle cx="${f(x + s * .2)}" cy="${f(y - s * 1.35)}" r="${f(s * .16)}" fill="#fff"/><circle cx="${f(x + s * .52)}" cy="${f(y - s * .98)}" r="${f(s * .1)}" fill="#fff"/></g>`;
}
function pumpkin(x, y, s, c = '#ffa04a') {
  return `<g><path d="M${f(x)} ${f(y - s * .7)}q${f(s * .05)} ${f(-s * .2)} ${f(s * .18)} ${f(-s * .25)}" stroke="#7a9a4a" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(x - s * .3)}" cy="${f(y - s * .35)}" rx="${f(s * .3)}" ry="${f(s * .35)}" fill="${c}"/><ellipse cx="${f(x + s * .3)}" cy="${f(y - s * .35)}" rx="${f(s * .3)}" ry="${f(s * .35)}" fill="${c}"/><ellipse cx="${f(x)}" cy="${f(y - s * .37)}" rx="${f(s * .32)}" ry="${f(s * .38)}" fill="${c}" stroke="#e8863a" stroke-width="${f(s * .03)}"/><ellipse cx="${f(x + s * .2)}" cy="${f(y - s * .72)}" rx="${f(s * .14)}" ry="${f(s * .06)}" fill="#8fd68a"/>${face(x, y - s * .35, s * .14)}</g>`;
}
function squirrel(x, y, s, flip = false) {
  const t = flip ? ` transform="translate(${f(2 * x)} 0) scale(-1 1)"` : '', c = '#d9905a';
  return `<g${t}><g class="hop" style="--d:${f(2.8 + (x % 2) * .5)}s"><path d="M${f(x + s * .25)} ${f(y - s * .2)}Q${f(x + s * 1.05)} ${f(y - s * .3)} ${f(x + s * .85)} ${f(y - s * 1.05)}Q${f(x + s * .65)} ${f(y - s * 1.45)} ${f(x + s * .35)} ${f(y - s * 1.15)}Q${f(x + s * .7)} ${f(y - s * .8)} ${f(x + s * .2)} ${f(y - s * .45)}Z" fill="${c}"/><path d="M${f(x + s * .5)} ${f(y - s * .4)}Q${f(x + s * .85)} ${f(y - s * .6)} ${f(x + s * .72)} ${f(y - s * 1.02)}" stroke="#f2c08e" stroke-width="${f(s * .08)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(x)}" cy="${f(y - s * .32)}" rx="${f(s * .32)}" ry="${f(s * .32)}" fill="${c}"/><ellipse cx="${f(x - s * .05)}" cy="${f(y - s * .28)}" rx="${f(s * .17)}" ry="${f(s * .22)}" fill="#fff0dc"/><circle cx="${f(x - s * .08)}" cy="${f(y - s * .78)}" r="${f(s * .27)}" fill="${c}"/><path d="M${f(x - s * .26)} ${f(y - s * .98)}l${f(-s * .02)} ${f(-s * .2)}l${f(s * .14)} ${f(s * .1)}ZM${f(x + s * .08)} ${f(y - s * .98)}l${f(s * .04)} ${f(-s * .2)}l${f(-s * .14)} ${f(s * .1)}Z" fill="${c}"/>${face(x - s * .08, y - s * .76, s * .15)}<ellipse cx="${f(x - s * .12)}" cy="${f(y - s * .38)}" rx="${f(s * .12)}" ry="${f(s * .14)}" fill="#c98a5c"/><path d="M${f(x - s * .24)} ${f(y - s * .46)}q${f(s * .12)} ${f(-s * .1)} ${f(s * .24)} 0Z" fill="#8f5b3e"/></g></g>`;
}
S.autumn2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#ffc9a8'], [.55, '#ffe8d2'], [1, '#f6d6aa']]);
  s += sun(W * .16, H * .13, u * .6, '#ffb35c') + cloud(W * .62, H * .1, u / 90, '#fff7ec') + cloud(W * .9, H * .26, u / 120, '#fff7ec', .85);
  s += hills(W, H, H * .68, H * .08, '#f6c79a', 6, 3);
  s += scatter(W, H, Math.max(6, Math.round(W / (u * 1.3))), 11, (x, y, r) => tree(x, y, u * (.9 + r() * .4), ['#ff9f5c', '#ffcf5c', '#ff7b5c', '#e8a45c'][(r() * 4) | 0], '#8f5b3e'), [0, .66, 1, .7]);
  s += hills(W, H, H * .8, H * .06, '#efbb84', 12, 3) + hills(W, H, H * .9, H * .05, '#e8ab72', 22, 4);
  // winding path into the village
  s += `<path d="M${f(W * .34)} ${H}C${f(W * .4)} ${f(H * .9)} ${f(W * .64)} ${f(H * .84)} ${f(W * .52)} ${f(H * .74)}L${f(W * .55)} ${f(H * .74)}C${f(W * .7)} ${f(H * .83)} ${f(W * .56)} ${f(H * .9)} ${f(W * .68)} ${H}Z" fill="#fbe6c2"/>` + [[.5, .97], [.55, .9], [.58, .83], [.545, .77]].map(([a, b], i) => `<ellipse cx="${f(W * a)}" cy="${f(H * b)}" rx="${f(u * (.3 - i * .05))}" ry="${f(u * (.1 - i * .015))}" fill="#f0d0a0"/>`).join('');
  s += mhouse(W * .36, H * .74, u * .6, '#ff9f7a') + mhouse(W * .7, H * .73, u * .55, '#c38fff');
  s += mhouse(W * .15, H * .9, u * 1.35, '#ff7b6b') + mhouse(W * .86, H * .88, u * 1.2, '#ffb35c');
  // fence
  const fx = W * .2, fy = H * .955; let fe = '';
  for (let i = 0; i < 4; i++) fe += `<rect x="${f(fx + i * u * .4)}" y="${f(fy - u * .5)}" width="${f(u * .12)}" height="${f(u * .5)}" rx="${f(u * .06)}"/>`;
  s += `<g fill="#c98a5c">${fe}<rect x="${f(fx - u * .1)}" y="${f(fy - u * .38)}" width="${f(u * 1.5)}" height="${f(u * .08)}" rx="${f(u * .04)}"/></g>`;
  s += pumpkin(W * .43, H * .985, u * 1.05) + pumpkin(W * .31, H * .995, u * .7, '#ffbf5c') + pumpkin(W * .7, H * .99, u * .8, '#ff9f4a') + pumpkin(W * .63, H * .86, u * .42, '#ffbf5c');
  s += squirrel(W * .55, H * .995, u * .95) + squirrel(W * .94, H * .995, u * .75, true);
  const bk = W * .81, bky = H * .975;
  s += `<g><path d="M${f(bk - u * .45)} ${f(bky - u * .4)}h${f(u * .9)}l${f(-u * .1)} ${f(u * .4)}h${f(-u * .7)}Z" fill="#d9a46a"/><path d="M${f(bk - u * .4)} ${f(bky - u * .4)}q${f(u * .4)} ${f(-u * .6)} ${f(u * .8)} 0" stroke="#b07c5a" stroke-width="${f(u * .06)}" fill="none"/>${[[-.22, '#ff6f6f'], [0, '#ff8f6b'], [.22, '#ffd36b']].map(([dx, c]) => `<circle cx="${f(bk + dx * u)}" cy="${f(bky - u * .45)}" r="${f(u * .14)}" fill="${c}"/>`).join('')}<path d="M${f(bk - u * .45)} ${f(bky - u * .22)}h${f(u * .9)}" stroke="#b07c5a" stroke-width="2"/></g>`;
  const leaf = (x, y, sz, c, r) => `<path class="fall" style="--d:${f(9 + r() * 9)}s;--o:${f(-r() * 14)}s" d="M${f(x)} ${f(y)}q${f(sz)} ${f(-sz)} ${f(sz * 2)} 0q${f(-sz)} ${f(sz)} ${f(-sz * 2)} 0Z" fill="${c}"/>`;
  s += scatter(W, H, 22, 53, (x, y, r) => leaf(x, y, u * (.12 + r() * .1), ['#ff7b5c', '#ffb35c', '#ffd36b', '#e86c4a'][(r() * 4) | 0], r), [0, -.1, 1, .7]);
  return s;
};

S.snow2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#8fb2f6'], [.55, '#dbe6ff'], [1, '#f4f7ff']]);
  s += cloud(W * .2, H * .1, u / 85, '#fff') + cloud(W * .72, H * .14, u / 100, '#fff', .9);
  const mtn = (x, b, w, h, c) => `<path d="M${f(x - w)} ${f(b)}L${f(x - w * .12)} ${f(b - h)}Q${f(x)} ${f(b - h * 1.06)} ${f(x + w * .12)} ${f(b - h)}L${f(x + w)} ${f(b)}Z" fill="${c}" stroke="${c}" stroke-width="${f(u * .2)}" stroke-linejoin="round"/><path d="M${f(x - w * .12)} ${f(b - h)}Q${f(x)} ${f(b - h * 1.06)} ${f(x + w * .12)} ${f(b - h)}L${f(x + w * .36)} ${f(b - h * .66)}l${f(-w * .1)} ${f(h * .06)}l${f(-w * .12)} ${f(-h * .08)}l${f(-w * .12)} ${f(h * .08)}l${f(-w * .12)} ${f(-h * .06)}L${f(x - w * .36)} ${f(b - h * .66)}Z" fill="#fff"/>`;
  s += mtn(W * .2, H * .68, u * 2.4, u * 2.6, '#a9b8ec') + mtn(W * .78, H * .68, u * 2.8, u * 3.2, '#9aaae6') + mtn(W * .5, H * .7, u * 2, u * 1.9, '#b8c4f0');
  s += hills(W, H, H * .7, H * .05, '#eef3ff', 5, 3);
  s += scatter(W, H, 7, 9, (x, y, r) => pine2(x, y, u * (.45 + r() * .3), '#7fb8a6'), [0, .7, 1, .74]);
  // sledding hill
  const p0 = [W * -.02, H * .7], p1 = [W * .3, H * .7], p2 = [W * .45, H * .88], p3 = [W * .8, H * .9];
  const hp = `M${f(p0[0])} ${f(p0[1])}C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(p3[0])} ${f(p3[1])}`;
  s += `<path d="${hp}L${W} ${f(H * .9)}V${H}H0V${f(p0[1])}Z" fill="#fff"/><path d="${hp}" fill="none" stroke="#e8efff" stroke-width="${f(u * .5)}" transform="translate(0 ${f(u * .3)})"/><path d="${hp}" fill="none" stroke="#d3def8" stroke-width="2" stroke-dasharray="${f(u * .3)} ${f(u * .15)}" transform="translate(0 ${f(u * .12)})"/><path d="${hp}" fill="none" stroke="#dde6ff" stroke-width="3"/><path d="M0 ${f(H * .95)}Q${f(W * .3)} ${f(H * .93)} ${f(W * .6)} ${f(H * .96)}T${W} ${f(H * .95)}" fill="none" stroke="#eef3ff" stroke-width="${f(u * .2)}"/>`;
  s += pine2(W * .06, H * .71, u * .7) + pine2(W * .14, H * .715, u * .5);
  const sl = u * .75;
  s += `<g><animateMotion path="M${f(W * .04)} ${f(H * .7)}C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(p3[0])} ${f(p3[1])}" dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;.75;1" calcMode="spline" keySplines=".5 0 .7 1;0 0 1 1"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.08;.7;.78;1" dur="7s" repeatCount="indefinite"/><g transform="translate(0 ${f(-sl * .08)})"><path d="M${f(-sl * .8)} 0H${f(sl * .7)}q${f(sl * .3)} 0 ${f(sl * .3)} ${f(-sl * .3)}" stroke="#c98a5c" stroke-width="${f(sl * .08)}" fill="none" stroke-linecap="round"/><rect x="${f(-sl * .75)}" y="${f(-sl * .3)}" width="${f(sl * 1.4)}" height="${f(sl * .18)}" rx="${f(sl * .06)}" fill="#ff6b6b"/>${stil(bunny(0, -sl * .25, sl * .7))}<path d="M${f(-sl * .3)} ${f(-sl * .55)}h${f(sl * .6)}" stroke="#9fd8ff" stroke-width="${f(sl * .12)}" stroke-linecap="round"/></g></g>`;
  // cabin
  const cx = Math.min(W * .84, W - u * 1.2), cy = H * .92, cs = u * 1.5;
  s += `<g><rect x="${f(cx - cs * .55)}" y="${f(cy - cs * .75)}" width="${f(cs * 1.1)}" height="${f(cs * .75)}" rx="${f(cs * .05)}" fill="#c98a5c"/>${[.15, .3, .45, .6].map(k => `<path d="M${f(cx - cs * .55)} ${f(cy - cs * k)}h${f(cs * 1.1)}" stroke="#a8714f" stroke-width="2"/>`).join('')}<rect x="${f(cx + cs * .22)}" y="${f(cy - cs * 1.35)}" width="${f(cs * .16)}" height="${f(cs * .4)}" fill="#a0806a"/>${[0, 1, 2].map(k => `<circle class="float" style="--d:${f(2.5 + k * .7)}s" cx="${f(cx + cs * (.3 + k * .08))}" cy="${f(cy - cs * (1.5 + k * .2))}" r="${f(cs * (.07 + k * .03))}" fill="#fff" opacity="${.9 - k * .2}"/>`).join('')}<path d="M${f(cx - cs * .72)} ${f(cy - cs * .7)}L${f(cx)} ${f(cy - cs * 1.25)}L${f(cx + cs * .72)} ${f(cy - cs * .7)}Z" fill="#8f5b4e" stroke="#fff" stroke-width="${f(cs * .1)}" stroke-linejoin="round"/><rect x="${f(cx - cs * .38)}" y="${f(cy - cs * .55)}" width="${f(cs * .3)}" height="${f(cs * .26)}" rx="${f(cs * .04)}" fill="#ffe08a" class="glow"/><rect x="${f(cx + cs * .08)}" y="${f(cy - cs * .45)}" width="${f(cs * .26)}" height="${f(cs * .45)}" rx="${f(cs * .1)}" fill="#8f5b4e"/><circle cx="${f(cx + cs * .21)}" cy="${f(cy - cs * .34)}" r="${f(cs * .07)}" fill="none" stroke="#7dcc7f" stroke-width="${f(cs * .04)}"/>${face(cx - cs * .23, cy - cs * .17, cs * .08)}</g>`;
  // snowmen family
  const sm = (x, y, sz, sc, hat) => `<g><circle cx="${f(x)}" cy="${f(y - sz * .55)}" r="${f(sz * .55)}" fill="#fff" stroke="#dde6ff" stroke-width="3"/><circle cx="${f(x)}" cy="${f(y - sz * 1.35)}" r="${f(sz * .4)}" fill="#fff" stroke="#dde6ff" stroke-width="3"/>${face(x, y - sz * 1.37, sz * .18)}<path d="M${f(x - sz * .02)} ${f(y - sz * 1.3)}l${f(-sz * .22)} ${f(sz * .05)}l${f(sz * .22)} ${f(sz * .05)}Z" fill="#ffb35c"/><path d="M${f(x - sz * .38)} ${f(y - sz * 1.03)}h${f(sz * .76)}" stroke="${sc}" stroke-width="${f(sz * .14)}" stroke-linecap="round"/><rect x="${f(x + sz * .1)}" y="${f(y - sz * 1.03)}" width="${f(sz * .14)}" height="${f(sz * .35)}" rx="${f(sz * .05)}" fill="${sc}"/>${hat}<path d="M${f(x - sz * .5)} ${f(y - sz * .7)}l${f(-sz * .4)} ${f(-sz * .3)}M${f(x + sz * .5)} ${f(y - sz * .7)}l${f(sz * .4)} ${f(-sz * .3)}" stroke="#a8714f" stroke-width="${f(sz * .06)}" stroke-linecap="round"/></g>`;
  const smx = W * .56, smy = H * .99, su = u * .95;
  s += sm(smx, smy, su, '#ff6b6b', `<path d="M${f(smx - su * .32)} ${f(smy - su * 1.66)}h${f(su * .64)}l${f(-su * .08)} ${f(-su * .3)}h${f(-su * .48)}Z" fill="#5b6bb5"/>`) + sm(smx + su * .95, smy, su * .6, '#9fd8ff', `<path d="M${f(smx + su * .95 - su * .2)} ${f(smy - su * 1.04)}q${f(su * .2)} ${f(-su * .35)} ${f(su * .4)} 0Z" fill="#ff8fb6"/><circle cx="${f(smx + su * .95)}" cy="${f(smy - su * 1.2)}" r="${f(su * .06)}" fill="#fff"/>`);
  s += pine2(W * .03, H * 1.0, u * .9) + cat(W * .3, H * .99, u * .6, '#f6b56b') + `<path d="M${f(W * .3 - u * .42)} ${f(H * .99 - u * .48)}q${f(u * .24)} ${f(u * .1)} ${f(u * .48)} 0" stroke="#ff8fb6" stroke-width="${f(u * .1)}" fill="none" stroke-linecap="round"/>` + bunny(W * .16, H * .985, u * .55, '#ffe4ee');
  s += scatter(W, H, 30, 63, (x, y, r) => `<circle class="snowf" style="--d:${f(8 + r() * 10)}s;--o:${f(-r() * 18)}s" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 3.5)}" fill="#fff" opacity=".9"/>`, [0, -.1, 1, .9]);
  return s;
};

S.stars2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#101245'], [.55, '#2c2876'], [1, '#56439a']]);
  s += dust(W, H, 60, 11, [0, 0, 1, .8], '#fff', .55) + twk(W, H, 26, 13, [0, 0, 1, .75]);
  s += `<path d="M${f(-W * .1)} ${f(H * .2)}Q${f(W * .5)} ${f(H * .55)} ${f(W * 1.1)} ${f(H * .1)}" fill="none" stroke="#b9a4ff" stroke-opacity=".14" stroke-width="${f(u * 1.6)}" stroke-linecap="round"/>`;
  const con = (ox, oy, sc, pts, links, col) => { const P = pts.map(([a, b]) => [ox + a * sc, oy + b * sc]); return `<g stroke="#cdd6ff" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55" fill="none">${links.map(([i, j]) => `<path d="M${f(P[i][0])} ${f(P[i][1])}L${f(P[j][0])} ${f(P[j][1])}"/>`).join('')}</g>${P.map(([x, y], i) => star(x, y, u * (i % 3 ? .07 : .1), col, 'twinkle')).join('')}`; };
  s += con(W * .56, H * .05, u * .7, [[0, .2], [1, 0], [2, .3], [3, .25], [3.6, 1], [4.8, 1.1], [4.9, .3]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]], '#ffe27a');
  s += con(W * .05, H * .36, u * .65, [[0, 0], [.8, .9], [1.6, .2], [2.4, 1], [3.1, .1]], [[0, 1], [1, 2], [2, 3], [3, 4]], '#ffd1e8');
  s += con(W * .76, H * .46, u * .6, [[0, 0], [1, -.6], [2, 0], [1.6, 1.1], [.4, 1.1]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], '#c6e6ff');
  s += crescent(W * .16, H * .13, u * .7);
  s += `<g class="shoot"><path d="M${f(W * .34)} ${f(H * .08)}l${f(u * 1.8)} ${f(u * .6)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${star(W * .34 + u * 1.9, H * .08 + u * .63, u * .14, '#fff')}</g>`;
  // hills + observatory
  s += `<path d="M0 ${f(H * .84)}Q${f(W * .3)} ${f(H * .76)} ${f(W * .6)} ${f(H * .8)}T${W} ${f(H * .74)}V${H}H0Z" fill="#2a2160"/><path d="M0 ${f(H * .93)}Q${f(W * .4)} ${f(H * .87)} ${f(W * .75)} ${f(H * .92)}T${W} ${f(H * .9)}V${H}H0Z" fill="#3d3180"/>`;
  const ox = Math.min(W * .82, W - u * 1.4), oy = H * .775, os = u * 1.6;
  s += `<g><rect x="${f(ox - os * .55)}" y="${f(oy - os * .7)}" width="${f(os * 1.1)}" height="${f(os * .72)}" rx="${f(os * .06)}" fill="#e6dcff"/><path d="M${f(ox - os * .6)} ${f(oy - os * .68)}A${f(os * .6)} ${f(os * .6)} 0 0 1 ${f(ox + os * .6)} ${f(oy - os * .68)}Z" fill="#f6f2ff"/><g>${rock(ox, oy - os * .68, [-8, 8, -8], 9)}<path d="M${f(ox - os * .1)} ${f(oy - os * .7)}L${f(ox + os * .45)} ${f(oy - os * 1.55)}L${f(ox + os * .62)} ${f(oy - os * 1.42)}L${f(ox + os * .12)} ${f(oy - os * .62)}Z" fill="#9f8fd8"/><circle cx="${f(ox + os * .54)}" cy="${f(oy - os * 1.49)}" r="${f(os * .1)}" fill="#c6e6ff"/></g><path d="M${f(ox - os * .1)} ${f(oy - os * 1.26)}L${f(ox + os * .1)} ${f(oy - os * 1.26)}L${f(ox + os * .1)} ${f(oy - os * .7)}L${f(ox - os * .1)} ${f(oy - os * .7)}Z" fill="#3a3070" opacity=".5"/>${face(ox, oy - os * .38, os * .14)}<rect x="${f(ox - os * .14)}" y="${f(oy - os * .25)}" width="${f(os * .28)}" height="${f(os * .25)}" rx="${f(os * .1)}" fill="#9f8fd8"/><rect class="glow" x="${f(ox + os * .28)}" y="${f(oy - os * .52)}" width="${f(os * .16)}" height="${f(os * .16)}" rx="${f(os * .04)}" fill="#ffe08a"/></g>`;
  // telescope + bunny
  const tx = W * .2, ty = H * .93, tsz = u * .9;
  s += `<g><path d="M${f(tx)} ${f(ty - tsz * .7)}L${f(tx - tsz * .4)} ${f(ty)}M${f(tx)} ${f(ty - tsz * .7)}L${f(tx + tsz * .35)} ${f(ty)}M${f(tx)} ${f(ty - tsz * .7)}V${f(ty)}" stroke="#c9a684" stroke-width="${f(tsz * .06)}" stroke-linecap="round"/><g transform="rotate(-32 ${f(tx)} ${f(ty - tsz * .75)})"><rect x="${f(tx - tsz * .5)}" y="${f(ty - tsz * .87)}" width="${f(tsz * 1.2)}" height="${f(tsz * .22)}" rx="${f(tsz * .08)}" fill="#ff9fb0"/><rect x="${f(tx + tsz * .62)}" y="${f(ty - tsz * .91)}" width="${f(tsz * .16)}" height="${f(tsz * .3)}" rx="${f(tsz * .05)}" fill="#ffd36b"/><rect x="${f(tx - tsz * .62)}" y="${f(ty - tsz * .83)}" width="${f(tsz * .14)}" height="${f(tsz * .14)}" rx="${f(tsz * .03)}" fill="#c7b2ff"/></g></g>` + bunny(tx - tsz * .9, ty + u * .02, u * .55);
  // picnic blanket + cat with cocoa
  const px = W * .55, py = H * .97;
  s += `<g><path d="M${f(px - u * 1.1)} ${f(py)}L${f(px - u * .8)} ${f(py - u * .4)}H${f(px + u * .8)}L${f(px + u * 1.1)} ${f(py)}Z" fill="#ff9fc5"/><path d="M${f(px - u * .95)} ${f(py - u * .2)}H${f(px + u * .95)}M${f(px - u * .3)} ${f(py - u * .4)}L${f(px - u * .4)} ${f(py)}M${f(px + u * .3)} ${f(py - u * .4)}L${f(px + u * .4)} ${f(py)}" stroke="#fff" stroke-width="${f(u * .05)}" opacity=".6"/></g>` + cat(px - u * .2, py - u * .15, u * .55, '#fff4e6') + `<g><rect x="${f(px + u * .4)}" y="${f(py - u * .48)}" width="${f(u * .22)}" height="${f(u * .24)}" rx="${f(u * .05)}" fill="#9fd8ff"/><path d="M${f(px + u * .45)} ${f(py - u * .55)}q${f(u * .05)} ${f(-u * .1)} 0 ${f(-u * .2)}M${f(px + u * .55)} ${f(py - u * .55)}q${f(u * .05)} ${f(-u * .1)} 0 ${f(-u * .2)}" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g>`;
  s += scatter(W, H, 9, 41, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(u * .05)}" fill="${['#ffe08a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0]}" class="glow"/>`, [0, .9, 1, .99]);
  return s;
};

S.castle2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#c3aeff'], [.5, '#ffd9f0'], [1, '#fff2dc']]);
  s += scatter(W, H, 16, 93, (x, y, r) => sparkle(x, y, 3 + r() * 5, ['#fff', '#fff3b0', '#ffd1e8'][(r() * 3) | 0]), [0, 0, 1, .6]);
  s += cloud(W * .12, H * .14, u / 75, '#fff') + cloud(W * .88, H * .1, u / 85, '#fff');
  // far castle behind the garden
  // rainbow from the fountain mist
  const fx = W * .5, fb = H * .95, R0 = Math.min(W * .42, u * 4.6);
  s += `<g opacity=".5" fill="none" stroke-width="${f(u * .2)}">${['#ff9fb0', '#ffd36b', '#9fe6b4', '#9fd8ff', '#c7b2ff'].map((c, i) => `<path d="M${f(fx - R0 + i * u * .2)} ${f(H * .86)}A${f(R0 - i * u * .2)} ${f(R0 * .85 - i * u * .2)} 0 0 1 ${f(fx + R0 - i * u * .2)} ${f(H * .86)}" stroke="${c}"/>`).join('')}</g>`;
  const kx = W * .76, kb = H * .79, k = u * 1.25, kt = (x, w, h, c) => `<rect x="${f(x - w / 2)}" y="${f(kb - h)}" width="${f(w)}" height="${f(h)}" fill="#fff4fb" stroke="#f0cfe3" stroke-width="2"/><path d="M${f(x - w * .65)} ${f(kb - h)}L${f(x)} ${f(kb - h - w * 1.3)}L${f(x + w * .65)} ${f(kb - h)}Z" fill="${c}"/><path d="M${f(x)} ${f(kb - h - w * 1.3)}v${f(-w * .4)}l${f(w * .4)} ${f(w * .15)}l${f(-w * .4)} ${f(w * .15)}" fill="#ff8fb6"/><rect x="${f(x - w * .12)}" y="${f(kb - h * .78)}" width="${f(w * .24)}" height="${f(w * .32)}" rx="${f(w * .12)}" fill="#b9d8ff"/>`;
  s += `<g opacity=".92">${kt(kx - k * .8, k * .45, k * 1.6, '#c38fff')}${kt(kx + k * .8, k * .45, k * 1.6, '#c38fff')}<rect x="${f(kx - k * .8)}" y="${f(kb - k * 1.1)}" width="${f(k * 1.6)}" height="${f(k * 1.1)}" fill="#fff4fb" stroke="#f0cfe3" stroke-width="2"/>${kt(kx, k * .6, k * 2.2, '#ff8fb6')}</g>`;
  s += `<g class="float" style="--d:6s">${star(W * .3, H * .12, u * .3, '#ffe27a')}${face(W * .3, H * .125, u * .13)}</g>`;
  // hedges + rose arches
  s += `<rect x="0" y="${f(H * .8)}" width="${W}" height="${f(H * .2)}" fill="#bfe8a6"/>`;
  const hedge = (x0, x1, y, h) => { let p = ''; for (let x = x0; x < x1; x += h * .8) p += `<circle cx="${f(x + h * .4)}" cy="${f(y - h * .55)}" r="${f(h * .5)}"/>`; return `<g fill="#7fcf86">${p}<rect x="${f(x0)}" y="${f(y - h * .6)}" width="${f(x1 - x0)}" height="${f(h * .6)}" rx="${f(h * .1)}"/></g>`; };
  s += hedge(-u * .2, W * .36, H * .82, u * .7) + hedge(W * .64, W + u * .2, H * .82, u * .7);
  const arch = (x, y, w, h) => `<g><path d="M${f(x - w / 2)} ${f(y)}V${f(y - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w / 2)} ${f(y - h + w / 2)}V${f(y)}" fill="none" stroke="#6fbf73" stroke-width="${f(u * .14)}"/>${[0, .2, .4, .6, .8, 1].map((t, i) => { const a = Math.PI * (1 - t), xx = x + Math.cos(a) * w / 2, yy = y - h + w / 2 - Math.sin(a) * w / 2; return `<circle cx="${f(xx)}" cy="${f(yy)}" r="${f(u * .12)}" fill="${i % 2 ? '#ff8fb6' : '#fff'}"/>`; }).join('')}<circle cx="${f(x - w / 2)}" cy="${f(y - h * .4)}" r="${f(u * .1)}" fill="#ff8fb6"/><circle cx="${f(x + w / 2)}" cy="${f(y - h * .55)}" r="${f(u * .1)}" fill="#ff8fb6"/></g>`;
  s += arch(W * .12, H * .93, u * 1.4, u * 2.2) + arch(W * .88, H * .93, u * 1.4, u * 2.2);
  const topi = (x, y, sz) => `<g class="sway" style="--d:5s"><path d="M${f(x)} ${f(y - sz * .3)}V${f(y - sz)}" stroke="#a8714f" stroke-width="${f(sz * .1)}"/><circle cx="${f(x)}" cy="${f(y - sz * 1.2)}" r="${f(sz * .4)}" fill="#6fbf73"/><circle cx="${f(x - sz * .12)}" cy="${f(y - sz * 1.32)}" r="${f(sz * .1)}" fill="#fff" opacity=".3"/><path d="M${f(x - sz * .3)} ${f(y - sz * .35)}h${f(sz * .6)}l${f(-sz * .08)} ${f(sz * .35)}h${f(-sz * .44)}Z" fill="#ffb3c6"/></g>`;
  s += topi(W * .3, H * .9, u * .8) + topi(W * .7, H * .9, u * .8);
  // path + fountain
  s += `<path d="M${f(fx - u * .9)} ${f(H * .82)}H${f(fx + u * .9)}L${f(fx + u * 2.2)} ${H}H${f(fx - u * 2.2)}Z" fill="#fff0e6"/>`;
  const fs = u * 1.3;
  s += `<g><ellipse cx="${f(fx)}" cy="${f(fb - fs * .3)}" rx="${f(fs * 1.25)}" ry="${f(fs * .3)}" fill="#9fd8ff"/><path d="M${f(fx - fs * 1.25)} ${f(fb - fs * .3)}V${f(fb - fs * .05)}Q${f(fx)} ${f(fb + fs * .25)} ${f(fx + fs * 1.25)} ${f(fb - fs * .05)}V${f(fb - fs * .3)}Q${f(fx)} ${f(fb)} ${f(fx - fs * 1.25)} ${f(fb - fs * .3)}Z" fill="#fff" stroke="#ead6f0" stroke-width="2"/>${face(fx, fb - fs * .06, fs * .12)}<rect x="${f(fx - fs * .1)}" y="${f(fb - fs * 1.1)}" width="${f(fs * .2)}" height="${f(fs * .8)}" fill="#f4e8f8"/><path d="M${f(fx - fs * .55)} ${f(fb - fs * 1.1)}Q${f(fx)} ${f(fb - fs * .8)} ${f(fx + fs * .55)} ${f(fb - fs * 1.1)}Z" fill="#f4e8f8"/><rect x="${f(fx - fs * .05)}" y="${f(fb - fs * 1.5)}" width="${f(fs * .1)}" height="${f(fs * .4)}" fill="#f4e8f8"/><circle cx="${f(fx)}" cy="${f(fb - fs * 1.55)}" r="${f(fs * .1)}" fill="#ffd36b"/>`
    + [-1, 1].map(d => `<path d="M${f(fx)} ${f(fb - fs * 1.6)}Q${f(fx + d * fs * .5)} ${f(fb - fs * 2.1)} ${f(fx + d * fs * .5)} ${f(fb - fs * 1.15)}" stroke="#8fd0ff" stroke-width="${f(fs * .07)}" fill="none" stroke-linecap="round" stroke-dasharray="${f(fs * .14)} ${f(fs * .1)}"><animate attributeName="stroke-dashoffset" values="${f(fs * .48)};0" dur="1s" repeatCount="indefinite"/></path><path d="M${f(fx + d * fs * .5)} ${f(fb - fs * 1.08)}Q${f(fx + d * fs * 1)} ${f(fb - fs * 1.2)} ${f(fx + d * fs * 1)} ${f(fb - fs * .4)}" stroke="#8fd0ff" stroke-width="${f(fs * .06)}" fill="none" stroke-linecap="round" stroke-dasharray="${f(fs * .12)} ${f(fs * .1)}"><animate attributeName="stroke-dashoffset" values="${f(fs * .44)};0" dur="1.1s" repeatCount="indefinite"/></path>`).join('') + `</g>`;
  s += sparkle(fx - fs * .9, fb - fs * 1.6, u * .12, '#fff') + sparkle(fx + fs * 1, fb - fs * 1.4, u * .1, '#fff');
  s += bunny(W * .3, H * .995, u * .5) + cat(W * .7, H * .995, u * .55, '#fff', true);
  s += scatter(W, H, 12, 7, (x, y, r) => flower(x, y, u * (.1 + r() * .05), ['#ff8fb6', '#fff', '#ffd36b', '#c7b2ff'][(r() * 4) | 0], '#ffd76a', false), [0, .84, 1, .99].map((v, i) => i === 0 ? 0 : v));
  s += fly4(W * .22, H * .55, u * .3, '#ffb3d1') + fly4(W * .78, H * .5, u * .26, '#c7b2ff');
  s += scatter(W, H, 10, 39, (x, y, r) => `<ellipse class="fall" style="--d:${f(10 + r() * 8)}s;--o:${f(-r() * 14)}s" cx="${f(x)}" cy="${f(y)}" rx="${f(u * .09)}" ry="${f(u * .06)}" fill="#ffc6d6"/>`, [0, -.1, 1, .6]);
  return s;
};

S.cloudranch2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#8fcbff'], [.5, '#dcf0ff'], [1, '#ffe3ef']]);
  s += sun(W * .86, H * .1, u * .6) + scatter(W, H, 12, 43, (x, y, r) => sparkle(x, y, 3 + r() * 4, '#fff'), [0, 0, 1, .55]);
  s += cloud(W * .45, H * .08, u / 100) + cloud(W * .2, H * .45, u / 130, '#fff', .75);
  s += island(W * .38, H * .2, u * .7, sheep(W * .38, H * .19, u * .38, false, ''));
  s += island(W * .9, H * .42, u * .6, tree(W * .88, H * .41, u * .5, '#8fd68a') + flower(W * .94, H * .405, u * .08, '#ff9fb0', '#ffd76a', false));
  s += hab(W * .14, H * .28, u * 1.2, '#ff9fb0', '#fff', 7) + hab(W * .66, H * .2, u * .95, '#9fd8ff', '#fff6c9', 8, 'bunny') + hab(W * .9, H * .62, u * .6, '#c7b2ff', '#fff', 6) + hab(W * .07, H * .6, u * .5, '#ffd36b', '#ff9fb0', 6.5);
  s += scatter(W, H, 3, 19, (x, y) => `<g class="float" style="--d:7s"><path d="M${f(x)} ${f(y)}q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0q${f(u * .2)} ${f(-u * .2)} ${f(u * .4)} 0" fill="none" stroke="#8a8fb5" stroke-width="2.5" stroke-linecap="round"/></g>`, [.2, .3, .8, .45]);
  // sea of clouds
  s += puffs(W, H, H * .74, u * 1, '#ece4ff', 5) + puffs(W, H, H * .82, u * .85, '#f8eefb', 9) + puffs(W, H, H * .91, u * .7, '#fdf6ff', 17);
  s += `<g><ellipse cx="${f(W * .84)}" cy="${f(H * .91)}" rx="${f(u * 1.1)}" ry="${f(u * .2)}" fill="#a8e29a"/></g>`;
  s += windmill(W * .84, H * .9, u * .8);
  // sleepy sheep on the clouds
  s += sheep(W * .2, H * .955, u * .8) + sheep(W * .42, H * .975, u * .65, true, '') + sheep(W * .62, H * .965, u * .7, false, 'hop');
  s += [0, 1, 2].map(k => `<text class="float" style="--d:${3 + k}s" x="${f(W * .42 - u * (.1 - k * .22))}" y="${f(H * .975 - u * (.85 + k * .25))}" font-family="Fredoka,Arial" font-weight="700" font-size="${f(u * (.18 + k * .06))}" fill="#9a8ac0">z</text>`).join('');
  s += `<g><rect x="${f(W * .04)}" y="${f(H * .9)}" width="${f(u * .1)}" height="${f(u * .7)}" fill="#d9a07a"/><rect x="${f(W * .04 - u * .25)}" y="${f(H * .88)}" width="${f(u * .6)}" height="${f(u * .35)}" rx="${f(u * .1)}" fill="#ff9fb0"/><rect x="${f(W * .04 - u * .18)}" y="${f(H * .88 + u * .1)}" width="${f(u * .2)}" height="${f(u * .06)}" fill="#fff"/></g>`;
  return s;
};

S.park2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#17184e'], [.55, '#3a2c7a'], [1, '#68489a']]);
  s += dust(W, H, 40, 21, [0, 0, 1, .7], '#fff', .5) + twk(W, H, 16, 23, [0, 0, 1, .6]);
  s += crescent(W * .86, H * .12, u * .6);
  // light strings
  const lights = (y, sag, n, cols, b) => { let p = `<path d="M0 ${f(y)}Q${f(W / 2)} ${f(y + sag * 2)} ${W} ${f(y)}" fill="none" stroke="#8a7ab8" stroke-width="2"/>`, g = ''; for (let i = 0; i < n; i++) { const t = (i + .5) / n; g += `<circle cx="${f(W * t)}" cy="${f(y + sag * 4 * t * (1 - t) + u * .08)}" r="${f(u * .1)}" fill="${cols[i % cols.length]}"/>`; } return p + `<g>${g}<animate attributeName="opacity" values="1;.45;1" dur="2s" begin="${b}s" repeatCount="indefinite"/></g>`; };
  const nb = Math.max(10, Math.round(W / (u * .7)));
  s += lights(H * .04, u * .6, nb, ['#ffe08a', '#ff8fb6', '#9fe6ff'], 0) + lights(H * .1, u * .5, nb - 1, ['#a8e6b5', '#ffd36b', '#c7b2ff'], -1);
  // far ferris wheel silhouette with lights
  const R0 = u * 1.6, fcx = W * .5, fcy = H * .74 - R0;
  let fl = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; fl += `<circle cx="${f(fcx + Math.cos(a) * R0)}" cy="${f(fcy + Math.sin(a) * R0)}" r="${f(u * .06)}" fill="${['#ffe08a', '#ff8fb6', '#9fe6ff'][i % 3]}"/><path d="M${f(fcx)} ${f(fcy)}L${f(fcx + Math.cos(a) * R0)} ${f(fcy + Math.sin(a) * R0)}" stroke="#5a4a9a" stroke-width="1.5"/>`; }
  s += `<g opacity=".8"><path d="M${f(fcx - R0 * .6)} ${f(H * .74)}L${f(fcx)} ${f(fcy)}L${f(fcx + R0 * .6)} ${f(H * .74)}" stroke="#5a4a9a" stroke-width="${f(u * .08)}" fill="none"/><g>${spin(fcx, fcy, 60)}<circle cx="${f(fcx)}" cy="${f(fcy)}" r="${f(R0)}" fill="none" stroke="#6a5aae" stroke-width="${f(u * .06)}"/>${fl}</g></g>`;
  s += `<path d="M0 ${f(H * .78)}Q${f(W * .5)} ${f(H * .72)} ${W} ${f(H * .78)}V${H}H0Z" fill="#3b2c72"/>`;
  // plaza
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#4f3c86"/><rect x="0" y="${f(H * .86)}" width="${W}" height="${f(u * .08)}" fill="#7a62b0"/>` + scatter(W, H, Math.round(W / u * 1.2), 27, (x, y, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(u * (.3 + r() * .2))}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#5c4896"/>`, [0, .89, 1, .99]);
  // carousel lit up
  const cs = Math.min(u * 1.05, W * .11), cx = W * .8, cy = H * .9;
  s += halo(cx, cy - cs * 1.2, cs * 2.2, '#ffd36b', .45, 'glow') + carousel(cx, cy, cs);
  let bl = ''; for (let i = 0; i <= 8; i++) bl += `<circle cx="${f(cx - cs * 1.1 + i * cs * 2.2 / 8)}" cy="${f(cy - cs * 1.6)}" r="${f(cs * .06)}" fill="#fff6c9"/>`;
  s += `<g class="glow">${bl}</g>`;
  // teacups
  const ts = Math.min(u * .85, W * .085), tx = Math.max(W * .24, ts * 3.3), ty = H * .935;
  s += `<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${f(ts * 3.2)}" ry="${f(ts * .55)}" fill="#c7a8ff"/><ellipse cx="${f(tx)}" cy="${f(ty - ts * .08)}" rx="${f(ts * 3)}" ry="${f(ts * .45)}" fill="#e2d2ff"/>`;
  const cup = (x, y, sz, c, who, d) => `<g class="bob" style="--d:${d}s">${who}<path d="M${f(x - sz * .6)} ${f(y - sz * .55)}H${f(x + sz * .6)}Q${f(x + sz * .6)} ${f(y)} ${f(x)} ${f(y)}Q${f(x - sz * .6)} ${f(y)} ${f(x - sz * .6)} ${f(y - sz * .55)}Z" fill="${c}"/><path d="M${f(x + sz * .55)} ${f(y - sz * .45)}q${f(sz * .35)} ${f(0)} ${f(sz * .2)} ${f(sz * .3)}" stroke="${c}" stroke-width="${f(sz * .1)}" fill="none"/><ellipse cx="${f(x)}" cy="${f(y - sz * .55)}" rx="${f(sz * .6)}" ry="${f(sz * .12)}" fill="#fff" opacity=".6"/><circle cx="${f(x - sz * .25)}" cy="${f(y - sz * .3)}" r="${f(sz * .07)}" fill="#fff"/><circle cx="${f(x + sz * .2)}" cy="${f(y - sz * .25)}" r="${f(sz * .07)}" fill="#fff"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(sz * .5)}" ry="${f(sz * .08)}" fill="#fff" opacity=".7"/></g>`;
  const head = (x, y, sz, b) => b ? `<ellipse cx="${f(x - sz * .12)}" cy="${f(y - sz * .95)}" rx="${f(sz * .07)}" ry="${f(sz * .25)}" fill="#fff"/><ellipse cx="${f(x + sz * .12)}" cy="${f(y - sz * .95)}" rx="${f(sz * .07)}" ry="${f(sz * .25)}" fill="#fff"/><circle cx="${f(x)}" cy="${f(y - sz * .62)}" r="${f(sz * .25)}" fill="#fff"/>${face(x, y - sz * .62, sz * .13)}` : `<circle cx="${f(x)}" cy="${f(y - sz * .62)}" r="${f(sz * .25)}" fill="#f6b56b"/><path d="M${f(x - sz * .24)} ${f(y - sz * .72)}l${f(sz * .04)} ${f(-sz * .25)}l${f(sz * .14)} ${f(sz * .12)}ZM${f(x + sz * .24)} ${f(y - sz * .72)}l${f(-sz * .04)} ${f(-sz * .25)}l${f(-sz * .14)} ${f(sz * .12)}Z" fill="#f6b56b"/>${face(x, y - sz * .62, sz * .13)}`;
  s += cup(tx - ts * 1.9, ty, ts * 1.1, '#ff9fb0', head(tx - ts * 1.9, ty, ts * 1.1, true), 1.6) + cup(tx + ts * 1.9, ty + ts * .05, ts, '#9fd8ff', head(tx + ts * 1.9, ty + ts * .05, ts, false), 1.9);
  s += `<g><path d="M${f(tx - ts * .6)} ${f(ty - ts * .2)}Q${f(tx - ts * .7)} ${f(ty - ts * 1.3)} ${f(tx)} ${f(ty - ts * 1.3)}Q${f(tx + ts * .7)} ${f(ty - ts * 1.3)} ${f(tx + ts * .6)} ${f(ty - ts * .2)}Z" fill="#ffd36b"/><path d="M${f(tx + ts * .6)} ${f(ty - ts * .7)}q${f(ts * .5)} ${f(-ts * .1)} ${f(ts * .55)} ${f(-ts * .5)}" stroke="#ffd36b" stroke-width="${f(ts * .14)}" fill="none" stroke-linecap="round"/><path d="M${f(tx - ts * .6)} ${f(ty - ts * .9)}q${f(-ts * .45)} ${f(0)} ${f(-ts * .35)} ${f(ts * .5)}" stroke="#ffd36b" stroke-width="${f(ts * .12)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(tx)}" cy="${f(ty - ts * 1.3)}" rx="${f(ts * .35)}" ry="${f(ts * .1)}" fill="#ffb35c"/><circle cx="${f(tx)}" cy="${f(ty - ts * 1.45)}" r="${f(ts * .1)}" fill="#ffb35c"/>${face(tx, ty - ts * .75, ts * .2)}</g>`;
  // lamp posts + glowing balloons
  const post = x => `<g><path d="M${f(x)} ${f(H * .995)}V${f(H * .995 - u * 1.4)}" stroke="#8a7ab8" stroke-width="${f(u * .07)}"/>${halo(x, H * .995 - u * 1.5, u * .6, '#fff3b0', .6)}<circle cx="${f(x)}" cy="${f(H * .995 - u * 1.5)}" r="${f(u * .14)}" fill="#fff3b0"/></g>`;
  s += post(W * .52) + post(W * .97);
  s += balloon(W * .1, H * .38, u * .5, '#ff8fb6', 6) + balloon(W * .9, H * .44, u * .45, '#9fe6ff', 5) + balloon(W * .3, H * .22, u * .4, '#ffd36b', 7);
  s += bunny(W * .6, H * .99, u * .5, '#fff7ea') + `<path d="M${f(W * .6 + u * .3)} ${f(H * .99 - u * .4)}L${f(W * .6 + u * .45)} ${f(H * .99 - u * 1.5)}" stroke="#b8a3a8" stroke-width="1.5"/>` + balloon(W * .6 + u * .45, H * .99 - u * 1.9, u * .4, '#c7b2ff', 4);
  return s;
};

S.iceberg2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#0e1848'], [.45, '#22307a'], [.7, '#4658a6'], [1, '#7d96d8']]);
  s += dust(W, H, 50, 31, [0, 0, 1, .65], '#fff', .55) + twk(W, H, 18, 33, [0, 0, 1, .6]);
  // aurora curtains
  const grad = (c1, c2) => { const id = 'au' + (++GID); s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".45" stop-color="${c1}" stop-opacity=".75"/><stop offset=".75" stop-color="${c2}" stop-opacity=".45"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient></defs>`; return id; };
  const smooth = P => { let d = `M${f(P[0][0])} ${f(P[0][1])}`; for (let i = 1; i < P.length - 1; i++) d += `Q${f(P[i][0])} ${f(P[i][1])} ${f((P[i][0] + P[i + 1][0]) / 2)} ${f((P[i][1] + P[i + 1][1]) / 2)}`; return d + `L${f(P[P.length - 1][0])} ${f(P[P.length - 1][1])}`; };
  const curtain = (y0, h, amp, ph, b, op, id) => { const T = [], B = []; for (let i = 0; i <= 7; i++) { const x = -W * .1 + i * W * 1.2 / 7, y = y0 + Math.sin(i * 1.3 + ph) * amp; T.push([x, y]); B.push([x, y + h + Math.cos(i * 1.1 + ph) * amp * .5]); } return `<path class="wave" style="--d:${8 + b}s" d="${smooth(T)}L${f(B[7][0])} ${f(B[7][1])}${smooth(B.reverse()).replace(/^M/, 'L')}Z" fill="url(#${id})" opacity="${op}"><animate attributeName="opacity" values="${op};${f(op * .5)};${op}" dur="${5 + b}s" repeatCount="indefinite"/></path>`; };
  const g1 = grad('#b9ffe6', '#7ff0c0'), g2 = grad('#ffc2e6', '#c7b2ff');
  s += curtain(H * .04, H * .2, u * .6, 0, 0, .95, g1) + curtain(H * .15, H * .16, u * .45, 2, 2, .7, g2);
  s += crescent(W * .88, H * .1, u * .45);
  // horizon bergs
  const hz = H * .7;
  s += berg(W * .14, hz, u * 2.2, u * 1.2, '#cfdcff', '#a9bbef') + berg(W * .5, hz, u * 1.4, u * .7, '#cfdcff', '#a9bbef') + berg(W * .86, hz, u * 2.4, u * 1.5, '#cfdcff', '#a9bbef');
  // ice field + slide slope
  s += `<rect x="0" y="${f(hz - u * .5)}" width="${W}" height="${f(u * .5)}" fill="#8fa8e0" opacity=".35"/><path d="M0 ${f(hz)}H${W}V${H}H0Z" fill="#dfe8ff"/><path d="M${f(W * .3)} ${f(H * .9)}C${f(W * .55)} ${f(H * .88)} ${f(W * .7)} ${f(H * .74)} ${W} ${f(H * .72)}V${H}H${f(W * .3)}Z" fill="#f4f8ff"/><path d="M${f(W * .3)} ${f(H * .9)}C${f(W * .55)} ${f(H * .88)} ${f(W * .7)} ${f(H * .74)} ${W} ${f(H * .72)}" fill="none" stroke="#c3d4f6" stroke-width="3"/>`;
  s += `<path d="M0 ${f(H * .92)}Q${f(W * .3)} ${f(H * .9)} ${f(W * .6)} ${f(H * .93)}T${W} ${f(H * .92)}V${H}H0Z" fill="#fff"/>`;
  const ps = u * .55;
  s += `<g><animateMotion path="M${f(W * .98)} ${f(H * .72)}C${f(W * .7)} ${f(H * .74)} ${f(W * .55)} ${f(H * .88)} ${f(W * .3)} ${f(H * .9)}" dur="6s" repeatCount="indefinite" rotate="auto-reverse" keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="spline" keySplines=".5 0 .7 1;0 0 1 1"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.08;.66;.74;1" dur="6s" repeatCount="indefinite"/><g transform="translate(0 ${f(-ps * .05)})"><rect x="${f(-ps * .6)}" y="${f(-ps * .2)}" width="${f(ps * 1.2)}" height="${f(ps * .16)}" rx="${f(ps * .06)}" fill="#ff8fb6"/><path d="M${f(-ps * .7)} 0h${f(ps * 1.3)}" stroke="#c98a5c" stroke-width="${f(ps * .06)}" stroke-linecap="round"/>${penguin(0, -ps * .15, ps, false, '', '#ffe08a')}</g></g>`;
  // glowing igloo
  const ix = W * .16, iy = H * .9, is = u * 1.1;
  s += `<g>${halo(ix + is * .35, iy - is * .2, is * .8 * 1.3, '#ffd36b', 0.5, 'glow')}<path d="M${f(ix - is)} ${f(iy)}A${f(is)} ${f(is * .9)} 0 0 1 ${f(ix + is)} ${f(iy)}Z" fill="#fff" stroke="#d6e2fa" stroke-width="2"/><path d="M${f(ix - is * .95)} ${f(iy - is * .3)}H${f(ix + is * .95)}M${f(ix - is * .72)} ${f(iy - is * .62)}H${f(ix + is * .72)}M${f(ix - is * .35)} ${f(iy)}V${f(iy - is * .3)}M${f(ix - is * .1)} ${f(iy - is * .3)}V${f(iy - is * .62)}M${f(ix + is * .55)} ${f(iy - is * .3)}V${f(iy - is * .62)}" stroke="#d6e2fa" stroke-width="2"/><path d="M${f(ix + is * .1)} ${f(iy)}v${f(-is * .3)}a${f(is * .25)} ${f(is * .25)} 0 0 1 ${f(is * .5)} 0v${f(is * .3)}Z" fill="#ffd36b" class="glow"/>${face(ix - is * .35, iy - is * .45, is * .12)}<path d="M${f(ix + is * .1)} ${f(iy)}h${f(is * .5)}l${f(is * .2)} ${f(is * .08)}h${f(-is * .9)}Z" fill="#ffe08a" opacity=".5"/></g>`;
  s += penguin(W * .4, H * .975, u * 1.05, false, 'bob', '#ff8fb6') + penguin(W * .51, H * .985, u * .62, true, 'hop') + penguin(W * .9, H * .98, u * .95, true, 'bob', '#9fd8ff');
  const lx = W * .3, lyy = H * .965;
  s += `<g><rect x="${f(lx - u * .3)}" y="${f(lyy - u * .4)}" width="${f(u * .6)}" height="${f(u * .4)}" rx="${f(u * .06)}" fill="#eaf2ff" stroke="#c9d8f6" stroke-width="2"/>${halo(lx, lyy - u * .7, u * .6, '#ffd36b', .55, 'glow')}<rect x="${f(lx - u * .13)}" y="${f(lyy - u * .85)}" width="${f(u * .26)}" height="${f(u * .36)}" rx="${f(u * .06)}" fill="#ffe08a" stroke="#c98a5c" stroke-width="2"/><path d="M${f(lx - u * .08)} ${f(lyy - u * .85)}q${f(u * .08)} ${f(-u * .15)} ${f(u * .16)} 0" stroke="#c98a5c" stroke-width="2" fill="none"/></g>`;
  s += `<ellipse cx="${f(W * .68)}" cy="${f(H * .965)}" rx="${f(u * .5)}" ry="${f(u * .12)}" fill="#3f5aa8"/>` + ripple(W * .68, H * .965, u * .45, 2.8, 0, '#9fd8ff') + `<g class="bob" style="--d:2s">${fish(W * .68, H * .945, u * .2, '#ffb3c6', '')}</g>`;
  s += scatter(W, H, 18, 73, (x, y, r) => `<circle class="snowf" style="--d:${f(10 + r() * 10)}s;--o:${f(-r() * 18)}s" cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 2.5)}" fill="#fff" opacity=".85"/>`, [0, -.1, 1, .85]);
  s += sparkle(W * .58, H * .93, u * .1, '#fff') + sparkle(W * .26, H * .96, u * .08, '#fff');
  return s;
};

S.desert2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#191650'], [.45, '#3a2f7e'], [.72, '#8a5aa0'], [1, '#d898a8']]);
  s += dust(W, H, 60, 51, [0, 0, 1, .6], '#fff', .6) + twk(W, H, 20, 53, [0, 0, 1, .55]) + scatter(W, H, 6, 55, (x, y, r) => star(x, y, u * (.08 + r() * .08), ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), [0, .02, 1, .45]);
  const mx = W * .78, my = H * .17, mr = u * .85;
  s += `<g class="bob" style="--d:9s">${halo(mx, my, mr * 2.2, '#fff3c4', .4)}<circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr)}" fill="#fff3c4"/><circle cx="${f(mx - mr * .4)}" cy="${f(my + mr * .35)}" r="${f(mr * .14)}" fill="#f2deb0"/><circle cx="${f(mx + mr * .45)}" cy="${f(my - mr * .4)}" r="${f(mr * .1)}" fill="#f2deb0"/>${face(mx, my, mr * .4, '#6a5a7a')}</g>`;
  s += `<g class="shoot"><path d="M${f(W * .12)} ${f(H * .08)}l${f(u * 1.6)} ${f(u * .5)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${star(W * .12 + u * 1.7, H * .08 + u * .53, u * .12, '#fff')}</g>`;
  // pyramids
  const pyr = (x, b, w, h) => `<path d="M${f(x - w)} ${f(b)}L${f(x)} ${f(b - h)}L${f(x + w)} ${f(b)}Z" fill="#b48fcf"/><path d="M${f(x)} ${f(b - h)}L${f(x + w)} ${f(b)}H${f(x + w * .25)}Z" fill="#8a6ab4"/><path d="M${f(x - w * .5)} ${f(b - h * .5)}L${f(x + w * .1)} ${f(b - h * .5)}M${f(x - w * .75)} ${f(b - h * .25)}L${f(x + w * .2)} ${f(b - h * .25)}" stroke="#a07fc0" stroke-width="2"/>`;
  const pb = H * .72;
  s += pyr(W * .12, pb, u * 1.1, u * 1.2) + pyr(W * .44, pb, u * 1.3, u * 1.5) + pyr(W * .27, pb + u * .05, u * 1.9, u * 2.3) + sparkle(W * .27, pb - u * 2.35, u * .14, '#fff6c9');
  // dunes + caravan
  s += hills(W, H, H * .74, H * .05, '#5c4a94', 7, 3);
  const cv = W * .6, cvy = H * .735; let car = '';
  for (let i = 0; i < 4; i++) car += sil(camel(cv + i * u * .75, cvy - (i % 2) * u * .03, u * .32, true), '#2e2560') + `<circle class="glow" cx="${f(cv + i * u * .75 + u * .25)}" cy="${f(cvy - u * .42)}" r="${f(u * .035)}" fill="#ffd36b"/>`;
  s += car;
  s += hills(W, H, H * .84, H * .06, '#7a62ac', 17, 3) + hills(W, H, H * .93, H * .05, '#9a80c2', 29, 4);
  // camp: tent, fire, friends
  const tx = Math.min(W * .82, W - u * 1.1), ty = H * .93, ts = u * 1.3;
  s += `<g><path d="M${f(tx - ts * .8)} ${f(ty)}L${f(tx)} ${f(ty - ts)}L${f(tx + ts * .8)} ${f(ty)}Z" fill="#ffd6e6"/><path d="M${f(tx - ts * .4)} ${f(ty - ts * .5)}L${f(tx)} ${f(ty - ts)}L${f(tx - ts * .12)} ${f(ty - ts * .5)}ZM${f(tx + ts * .4)} ${f(ty - ts * .5)}L${f(tx)} ${f(ty - ts)}L${f(tx + ts * .12)} ${f(ty - ts * .5)}Z" fill="#ff9fb8" opacity=".7"/><path d="M${f(tx - ts * .3)} ${f(ty)}L${f(tx)} ${f(ty - ts * .62)}L${f(tx + ts * .3)} ${f(ty)}Z" fill="#ffd36b" class="glow"/><path d="M${f(tx)} ${f(ty - ts)}v${f(-ts * .25)}l${f(ts * .22)} ${f(ts * .08)}l${f(-ts * .22)} ${f(ts * .08)}" fill="#ff8fb6" stroke="#c98fb0" stroke-width="1.5"/></g>`;
  const fx = W * .56, fy = H * .97;
  s += `<g>${halo(fx, fy - u * .3, u * .9 * 1.3, '#ffb35c', 0.5, 'glow')}<path d="M${f(fx - u * .55)} ${f(fy)}l${f(u * 1.1)} ${f(-u * .2)}M${f(fx + u * .55)} ${f(fy)}l${f(-u * 1.1)} ${f(-u * .2)}" stroke="#a8714f" stroke-width="${f(u * .16)}" stroke-linecap="round"/>${flame(fx, fy - u * .12, u * .45, .7)}</g>`;
  s += scatter(W, H, 5, 61, (x, y, r) => `<circle class="rise" style="--d:${f(4 + r() * 3)}s;--o:${f(-r() * 5)}s" cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 1.5)}" fill="#ffd36b"/>`, [.53, .9, .59, .95]);
  s += camel(W * .18, H * .985, u * .85) + cactus(W * .36, H * .99, u * .5, '#9fe0a0') + cat(W * .66, H * .99, u * .48, '#f6d09a', true);
  return s;
};

function robot(x, y, s) {
  return `<g class="bob" style="--d:2.6s"><path d="M${f(x)} ${f(y - s * 1.6)}V${f(y - s * 1.85)}" stroke="#a7a3c4" stroke-width="${f(s * .05)}"/><circle class="glow" cx="${f(x)}" cy="${f(y - s * 1.9)}" r="${f(s * .08)}" fill="#ff6f7f"/><rect x="${f(x - s * .38)}" y="${f(y - s * 1.6)}" width="${f(s * .76)}" height="${f(s * .55)}" rx="${f(s * .14)}" fill="#c7d4f0"/><rect x="${f(x - s * .3)}" y="${f(y - s * 1.52)}" width="${f(s * .6)}" height="${f(s * .38)}" rx="${f(s * .1)}" fill="#5b6bb5"/>${face(x, y - s * 1.35, s * .14, '#bfefff', '#ff9fd0')}<circle cx="${f(x - s * .42)}" cy="${f(y - s * 1.32)}" r="${f(s * .06)}" fill="#ffd36b"/><circle cx="${f(x + s * .42)}" cy="${f(y - s * 1.32)}" r="${f(s * .06)}" fill="#ffd36b"/><rect x="${f(x - s * .32)}" y="${f(y - s * 1)}" width="${f(s * .64)}" height="${f(s * .6)}" rx="${f(s * .1)}" fill="#9fb4e6"/><circle cx="${f(x - s * .1)}" cy="${f(y - s * .78)}" r="${f(s * .06)}" fill="#ff8fb6"/><circle cx="${f(x + s * .1)}" cy="${f(y - s * .78)}" r="${f(s * .06)}" fill="#9fe6b4"/><rect x="${f(x - s * .15)}" y="${f(y - s * .6)}" width="${f(s * .3)}" height="${f(s * .08)}" rx="${f(s * .04)}" fill="#fff" opacity=".7"/><path d="M${f(x - s * .32)} ${f(y - s * .85)}q${f(-s * .3)} ${f(s * .05)} ${f(-s * .3)} ${f(s * .35)}M${f(x + s * .32)} ${f(y - s * .85)}q${f(s * .3)} ${f(-s * .1)} ${f(s * .32)} ${f(-s * .4)}" stroke="#9fb4e6" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><rect x="${f(x - s * .25)}" y="${f(y - s * .4)}" width="${f(s * .16)}" height="${f(s * .4)}" rx="${f(s * .06)}" fill="#a7a3c4"/><rect x="${f(x + s * .09)}" y="${f(y - s * .4)}" width="${f(s * .16)}" height="${f(s * .4)}" rx="${f(s * .06)}" fill="#a7a3c4"/></g>`;
}
function rockinghorse(x, y, s) {
  const c = '#fff', m = '#ff9fb0';
  return `<g>${rock(x, y, [-7, 7, -7], 2.4)}<path d="M${f(x - s)} ${f(y - s * .2)}Q${f(x)} ${f(y + s * .15)} ${f(x + s)} ${f(y - s * .2)}" stroke="#d9a07a" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><path d="M${f(x - s * .45)} ${f(y - s * .1)}L${f(x - s * .35)} ${f(y - s * .6)}M${f(x + s * .45)} ${f(y - s * .1)}L${f(x + s * .35)} ${f(y - s * .6)}" stroke="#d9a07a" stroke-width="${f(s * .08)}"/><ellipse cx="${f(x)}" cy="${f(y - s * .7)}" rx="${f(s * .5)}" ry="${f(s * .22)}" fill="${c}" stroke="#eadff0" stroke-width="2"/><path d="M${f(x - s * .35)} ${f(y - s * .8)}L${f(x - s * .5)} ${f(y - s * 1.2)}" stroke="${c}" stroke-width="${f(s * .22)}" stroke-linecap="round"/><ellipse cx="${f(x - s * .62)}" cy="${f(y - s * 1.22)}" rx="${f(s * .24)}" ry="${f(s * .16)}" fill="${c}" stroke="#eadff0" stroke-width="2"/><path d="M${f(x - s * .45)} ${f(y - s * 1.35)}l${f(s * .02)} ${f(-s * .16)}l${f(s * .1)} ${f(s * .12)}Z" fill="${c}"/><path d="M${f(x - s * .38)} ${f(y - s * 1.3)}q${f(s * .2)} ${f(s * .2)} ${f(s * .15)} ${f(s * .5)}" stroke="${m}" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><path d="M${f(x + s * .48)} ${f(y - s * .75)}q${f(s * .25)} ${f(s * .05)} ${f(s * .2)} ${f(s * .35)}" stroke="${m}" stroke-width="${f(s * .1)}" fill="none" stroke-linecap="round"/><rect x="${f(x - s * .15)}" y="${f(y - s * .95)}" width="${f(s * .3)}" height="${f(s * .12)}" rx="${f(s * .05)}" fill="#9fd8ff"/>${face(x - s * .66, y - s * 1.22, s * .08)}</g>`;
}
S.toytown2 = (W, H) => {
  const u = Math.min(W, H) / 10, fy = H * .78;
  let s = bgr(W, H, [[0, '#ffe9f3'], [1, '#fff4e6']]);
  let st = ''; for (let x = 0; x < W; x += u * 1.2) st += `<rect x="${f(x)}" y="0" width="${f(u * .6)}" height="${f(fy)}" fill="#ffd9ea" opacity=".32"/>`;
  s += st + scatter(W, H, 14, 5, (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(u * .06)}" fill="#fff" opacity=".8"/>`, [0, .05, 1, .7]);
  s += bunting(W, H * .01, u * .45, Math.max(8, Math.round(W / (u * .9))), ['#ff8fb6', '#ffd36b', '#9fd8ff', '#a8e6b5', '#c7b2ff']);
  // window
  const wx = W * .16, wy = H * .14, ws = Math.min(u * 1.1, W * .12);
  s += `<g><rect x="${f(wx - ws)}" y="${f(wy)}" width="${f(ws * 2)}" height="${f(ws * 1.8)}" rx="${f(ws * .2)}" fill="#bfe6ff" stroke="#fff" stroke-width="${f(u * .12)}"/>${cloud(wx, wy + ws * .6, ws / 140, '#fff', 1, '')}<path d="M${f(wx)} ${f(wy)}V${f(wy + ws * 1.8)}M${f(wx - ws)} ${f(wy + ws * .9)}H${f(wx + ws)}" stroke="#fff" stroke-width="${f(u * .07)}"/><path d="M${f(wx - ws * 1.2)} ${f(wy - u * .1)}h${f(ws * .7)}q${f(-ws * .2)} ${f(ws * 1.2)} ${f(-ws * .1)} ${f(ws * 2)}h${f(-ws * .6)}Z M${f(wx + ws * 1.2)} ${f(wy - u * .1)}h${f(-ws * .7)}q${f(ws * .2)} ${f(ws * 1.2)} ${f(ws * .1)} ${f(ws * 2)}h${f(ws * .6)}Z" fill="#ffb3c6"/></g>`;
  // wall shelf with toys
  const sx0 = W * .68, sy = H * .32;
  s += `<rect x="${f(sx0)}" y="${f(sy)}" width="${f(W - sx0 + 4)}" height="${f(u * .14)}" rx="${f(u * .05)}" fill="#d9a07a"/>` + [['#ff9fb8', 'A'], ['#8fc4ff', 'B'], ['#ffe08a', 'C']].map(([c, ch], i) => `<g><rect x="${f(sx0 + u * (.2 + i * .6))}" y="${f(sy - u * .5)}" width="${f(u * .5)}" height="${f(u * .5)}" rx="${f(u * .08)}" fill="${c}"/><text x="${f(sx0 + u * (.45 + i * .6))}" y="${f(sy - u * .1)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(u * .36)}" fill="#fff">${ch}</text></g>`).join('') + `<g><circle cx="${f(sx0 + u * 2.3)}" cy="${f(sy - u * .45)}" r="${f(u * .32)}" fill="#c8956a"/><circle cx="${f(sx0 + u * 2.06)}" cy="${f(sy - u * .74)}" r="${f(u * .12)}" fill="#c8956a"/><circle cx="${f(sx0 + u * 2.54)}" cy="${f(sy - u * .74)}" r="${f(u * .12)}" fill="#c8956a"/><ellipse cx="${f(sx0 + u * 2.3)}" cy="${f(sy - u * .38)}" rx="${f(u * .14)}" ry="${f(u * .1)}" fill="#f6dcc0"/>${face(sx0 + u * 2.3, sy - u * .5, u * .12)}</g>`;
  s += `<g class="flutter" style="--d:11s"><path d="M${f(W * .44)} ${f(H * .2)}l${f(u * 1)} ${f(-u * .36)}l${f(-u * .5)} ${f(u * .55)}l${f(-u * .1)} ${f(-u * .28)}Z" fill="#fff" stroke="#c9d6f2" stroke-width="1.5" stroke-linejoin="round"/></g>`;
  s += balloon(W * .9, H * .5, u * .45, '#ff8fb6', 6) + balloon(W * .06, H * .48, u * .4, '#9fe6b4', 5.5);
  s += scatter(W, H, 8, 45, (x, y, r) => sparkle(x, y, 3 + r() * 4, ['#fff', '#fff3b0'][(r() * 2) | 0]), [0, .1, 1, .6]);
  // floor + rug + track
  s += `<rect x="0" y="${f(fy)}" width="${W}" height="${f(H - fy)}" fill="#f2cf9f"/><rect x="0" y="${f(fy)}" width="${W}" height="${f(u * .1)}" fill="#e2b885"/>` + scatter(W, H, Math.round(W / u * .9), 35, (x, y) => `<path d="M${f(x)} ${f(y)}h${f(u * 1.1)}" stroke="#e6bd8a" stroke-width="2" stroke-linecap="round"/>`, [0, .8, 1, .99]);
  const ox = W * .5, oy = H * .9, orx = Math.min(W * .3, u * 3.2), ory = u * .62;
  s += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(orx + u * .7)}" ry="${f(ory + u * .3)}" fill="#c7e6ff"/><ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(orx + u * .55)}" ry="${f(ory + u * .2)}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".8"/>`;
  s += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(orx)}" ry="${f(ory)}" fill="none" stroke="#d9a77a" stroke-width="${f(u * .14)}" stroke-dasharray="${f(u * .06)} ${f(u * .16)}"/><ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(orx - u * .06)}" ry="${f(ory - u * .04)}" fill="none" stroke="#a7a3c4" stroke-width="2"/><ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(orx + u * .06)}" ry="${f(ory + u * .04)}" fill="none" stroke="#a7a3c4" stroke-width="2"/>`;
  // blocks pyramid in the middle of the loop
  const bs = u * .5; let bp = '';
  [[-1, 0, '#ff9fb8', '1'], [0, 0, '#8fc4ff', '2'], [1, 0, '#9fe0b4', '3'], [-.5, 1, '#ffcd6b', '4'], [.5, 1, '#c7a8ff', '5'], [0, 2, '#ff8f8f', '★']].forEach(([cxk, row, c, ch]) => { const bx = ox + cxk * bs * 1.05, by = oy + u * .1 - row * bs; bp += `<rect x="${f(bx - bs / 2)}" y="${f(by - bs)}" width="${f(bs)}" height="${f(bs)}" rx="${f(bs * .15)}" fill="${c}"/><text x="${f(bx)}" y="${f(by - bs * .28)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(bs * .55)}" fill="#fff">${ch}</text>`; });
  s += `<g>${bp}</g>`;
  // train running round the loop
  const ts = u * .62, loop = `M${f(ox + orx)} ${f(oy)}A${f(orx)} ${f(ory)} 0 1 0 ${f(ox - orx)} ${f(oy)}A${f(orx)} ${f(ory)} 0 1 0 ${f(ox + orx)} ${f(oy)}`;
  const eng = `<rect x="${f(-ts * .5)}" y="${f(-ts * 1.1)}" width="${f(ts * .5)}" height="${f(ts * .6)}" rx="${f(ts * .08)}" fill="#ff8f8f"/><rect x="${f(-ts * .42)}" y="${f(-ts * 1.02)}" width="${f(ts * .34)}" height="${f(ts * .24)}" rx="${f(ts * .05)}" fill="#bfe6ff"/><rect x="0" y="${f(-ts * .78)}" width="${f(ts * .7)}" height="${f(ts * .5)}" rx="${f(ts * .24)}" fill="#8fc4ff"/><rect x="${f(ts * .38)}" y="${f(-ts * 1.05)}" width="${f(ts * .16)}" height="${f(ts * .3)}" rx="${f(ts * .04)}" fill="#5b4a6a"/><circle cx="${f(ts * .7)}" cy="${f(-ts * .52)}" r="${f(ts * .24)}" fill="#ffe08a"/>${face(ts * .7, -ts * .54, ts * .11)}<circle cx="${f(-ts * .25)}" cy="${f(-ts * .2)}" r="${f(ts * .16)}" fill="#5b4a6a"/><circle cx="${f(ts * .35)}" cy="${f(-ts * .2)}" r="${f(ts * .16)}" fill="#5b4a6a"/>`;
  const wag = c => `<rect x="${f(-ts * .45)}" y="${f(-ts * .7)}" width="${f(ts * .9)}" height="${f(ts * .45)}" rx="${f(ts * .1)}" fill="${c}"/><circle cx="${f(-ts * .22)}" cy="${f(-ts * .2)}" r="${f(ts * .14)}" fill="#5b4a6a"/><circle cx="${f(ts * .22)}" cy="${f(-ts * .2)}" r="${f(ts * .14)}" fill="#5b4a6a"/>`;
  s += [[wag('#ffb3d1') + stil(bunny(0, -ts * .65, ts * .5)), 0], [wag('#9fe0b4'), -.55], [eng, -1.1]].map(([g, b]) => `<g><animateMotion path="${loop}" dur="11s" begin="${b}s" repeatCount="indefinite"/>${g}</g>`).join('');
  // toy box, robot, rocking horse
  const bx = W * .1, by = H * .97, bw = Math.min(u * 1.7, W * .17);
  s += `<g><circle cx="${f(bx - bw * .1)}" cy="${f(by - bw * .78)}" r="${f(bw * .2)}" fill="#ffcd6b"/><path d="M${f(bx - bw * .1)} ${f(by - bw * .98)}v${f(bw * .4)}M${f(bx - bw * .3)} ${f(by - bw * .78)}h${f(bw * .4)}" stroke="#ff8f8f" stroke-width="${f(bw * .05)}"/>${star(bx + bw * .25, by - bw * .8, bw * .14, '#ff8fb6')}<path d="M${f(bx - bw * .55)} ${f(by - bw * .65)}L${f(bx - bw * .7)} ${f(by - bw * 1.2)}L${f(bx + bw * .4)} ${f(by - bw * 1.25)}L${f(bx + bw * .5)} ${f(by - bw * .65)}Z" fill="#ff9fb8" opacity=".9"/><rect x="${f(bx - bw * .5)}" y="${f(by - bw * .7)}" width="${f(bw)}" height="${f(bw * .7)}" rx="${f(bw * .08)}" fill="#ffb3d1"/>${[[-.25, .5], [.2, .25], [.3, .55], [-.3, .2]].map(([a, b]) => `<circle cx="${f(bx + a * bw)}" cy="${f(by - b * bw)}" r="${f(bw * .05)}" fill="#fff"/>`).join('')}${face(bx, by - bw * .38, bw * .1)}</g>`;
  s += spintop(W * .22, H * .99, u * .65, '#c7a8ff', '#ffe08a', 1.3);
  s += rockinghorse(W * .82, H * .985, u * .85) + robot(W * .94, H * .995, u * .95);
  return s;
};

S.library2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#5b4a92'], [.5, '#a389cc'], [1, '#f2d2c4']]);
  s += scatter(W, H, 26, 9, (x, y, r) => `<path d="M${f(x)} ${f(y - 3)}l2 3l-2 3l-2-3Z" fill="#fff" opacity=".14"/>`, [0, 0, 1, .82]);
  // tall window with night sky
  const wx = W * .5, ww = Math.min(W * .17, u * 1.7), wt = H * .04, wb = H * .66, [ng, nd] = lgr([[0, '#1c1c5a'], [1, '#4a3f8e']]);
  s += nd + `<g><path d="M${f(wx - ww)} ${f(wb)}V${f(wt + ww)}A${f(ww)} ${f(ww)} 0 0 1 ${f(wx + ww)} ${f(wt + ww)}V${f(wb)}Z" fill="url(#${ng})" stroke="#c9a684" stroke-width="${f(u * .16)}"/>`;
  s += scatter(W, H, 10, 15, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1 + r() * 1.4)}" fill="#fff" class="twinkle" style="--d:${f(2 + r() * 2)}s"/>`, [(wx - ww * .85) / W, (wt + ww * .4) / H, (wx + ww * .85) / W, (wb - u * .2) / H]);
  s += `<circle cx="${f(wx + ww * .4)}" cy="${f(wt + ww * .75)}" r="${f(ww * .3)}" fill="#fff3c4"/>${face(wx + ww * .4, wt + ww * .78, ww * .12, '#7a6a4a')}<path d="M${f(wx)} ${f(wt)}V${f(wb)}M${f(wx - ww)} ${f(wt + ww * 1.3)}H${f(wx + ww)}M${f(wx - ww)} ${f((wt + ww * 1.3 + wb) / 2)}H${f(wx + ww)}" stroke="#c9a684" stroke-width="${f(u * .07)}"/><rect x="${f(wx - ww * 1.2)}" y="${f(wb)}" width="${f(ww * 2.4)}" height="${f(u * .16)}" rx="${f(u * .08)}" fill="#c9a684"/></g>`;
  const cur = d => `<path d="M${f(wx + d * ww * 1.5)} ${f(wt - u * .1)}H${f(wx + d * ww * .82)}Q${f(wx + d * ww * .7)} ${f(H * .3)} ${f(wx + d * ww * 1.12)} ${f(H * .42)}Q${f(wx + d * ww * .85)} ${f(H * .55)} ${f(wx + d * ww * 1)} ${f(wb + u * .1)}H${f(wx + d * ww * 1.5)}Z" fill="#ff9fb0"/><path d="M${f(wx + d * ww * 1.32)} ${f(wt)}V${f(wb)}" stroke="#ffb8c6" stroke-width="${f(u * .08)}"/><circle cx="${f(wx + d * ww * 1.12)}" cy="${f(H * .42)}" r="${f(u * .1)}" fill="#ffd36b"/>`;
  s += cur(-1) + cur(1) + `<path d="M${f(wx - ww * 1.55)} ${f(wt - u * .1)}H${f(wx + ww * 1.55)}" stroke="#c9a684" stroke-width="${f(u * .12)}" stroke-linecap="round"/>`;
  // slim shelves at the edges
  const sw = Math.max(W * .12, u * 1.1);
  s += shelf(-6, sw, H * .14, H * .86, 7) + shelf(W - sw, W + 6, H * .14, H * .86, 9);
  // floating candles
  const cand = (x, y, sz, d) => `<g class="float" style="--d:${d}s"><rect x="${f(x - sz * .14)}" y="${f(y)}" width="${f(sz * .28)}" height="${f(sz * .9)}" rx="${f(sz * .06)}" fill="#fff6ea"/><path d="M${f(x - sz * .14)} ${f(y + sz * .12)}q${f(sz * .08)} ${f(sz * .2)} ${f(sz * .1)} 0" stroke="#f2e0cc" stroke-width="2" fill="none"/>${flame(x, y - sz * .02, sz * .2, .8 + (x % 3) * .2)}</g>`;
  s += cand(W * .22, H * .14, u * .95, 6) + cand(W * .3, H * .32, u * .75, 7) + cand(W * .78, H * .12, u * .9, 6.5) + cand(W * .7, H * .32, u * .7, 7.5);
  // floating letters
  const L = ['A', 'あ', '?', 'b', 'の', '♪', 'C', '★'], cols = ['#ffd36b', '#ff9fb0', '#9fd8ff', '#a8e6b5', '#fff', '#c7b2ff'];
  s += scatter(W, H, 8, 19, (x, y, r, i) => `<text class="${i % 2 ? 'float' : 'flutter'}" style="--d:${f(6 + r() * 4)}s" x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(u * (.5 + r() * .25))}" fill="${cols[(r() * 6) | 0]}" transform="rotate(${((r() - .5) * 30) | 0} ${f(x)} ${f(y)})">${L[i]}</text>`, [.16, .4, .84, .74]);
  s += scatter(W, H, 12, 23, (x, y, r) => sparkle(x, y, 2.5 + r() * 3.5, ['#fff6c9', '#fff'][(r() * 2) | 0]), [.15, .1, .85, .8]);
  // floor + rug
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#cf9674"/>` + scatter(W, H, Math.round(W / u), 43, (x, y) => `<path d="M${f(x)} ${f(y)}h${f(u * 1.2)}" stroke="#b9805e" stroke-width="2" stroke-linecap="round"/>`, [0, .88, 1, .99]);
  s += `<rect x="${f(W * .5 - Math.min(W * .3, u * 3.4))}" y="${f(H * .9)}" width="${f(Math.min(W * .6, u * 6.8))}" height="${f(u * .7)}" rx="${f(u * .2)}" fill="#a8c8f0"/><rect x="${f(W * .5 - Math.min(W * .3, u * 3.4) + u * .12)}" y="${f(H * .9 + u * .1)}" width="${f(Math.min(W * .6, u * 6.8) - u * .24)}" height="${f(u * .5)}" rx="${f(u * .14)}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".8"/>`;
  // desk with open book, candle, quill
  const dx = W * .36, dy = H * .9, dw = Math.min(u * 2.8, W * .3);
  s += `<g><rect x="${f(dx - dw / 2)}" y="${f(dy - u * .14)}" width="${f(dw)}" height="${f(u * .16)}" rx="${f(u * .05)}" fill="#9a6b5c"/><path d="M${f(dx - dw * .42)} ${f(dy)}V${f(dy + u * .9)}M${f(dx + dw * .42)} ${f(dy)}V${f(dy + u * .9)}" stroke="#7e5448" stroke-width="${f(u * .12)}" stroke-linecap="round"/>${openbook(dx - dw * .12, dy - u * .5, u * .65, '#c7b2ff', 0).replace('class="flutter"', '')}<rect x="${f(dx + dw * .3)}" y="${f(dy - u * .5)}" width="${f(u * .14)}" height="${f(u * .36)}" rx="${f(u * .03)}" fill="#fff6ea"/><ellipse cx="${f(dx + dw * .3 + u * .07)}" cy="${f(dy - u * .14)}" rx="${f(u * .18)}" ry="${f(u * .05)}" fill="#ffd36b"/>${flame(dx + dw * .3 + u * .07, dy - u * .52, u * .1, .9)}<path d="M${f(dx + dw * .12)} ${f(dy - u * .14)}q${f(u * .05)} ${f(-u * .4)} ${f(u * .3)} ${f(-u * .6)}q${f(-u * .05)} ${f(u * .35)} ${f(-u * .3)} ${f(u * .6)}Z" fill="#fff" stroke="#e0d0ec" stroke-width="1.5"/></g>`;
  // globe
  const gx = W * .64, gy = H * .96;
  s += `<g><path d="M${f(gx - u * .3)} ${f(gy)}h${f(u * .6)}" stroke="#a0806a" stroke-width="${f(u * .1)}" stroke-linecap="round"/><path d="M${f(gx)} ${f(gy)}v${f(-u * .4)}" stroke="#a0806a" stroke-width="${f(u * .08)}"/><g>${rock(gx, gy - u * .85, [-6, 6, -6], 6)}<circle cx="${f(gx)}" cy="${f(gy - u * .85)}" r="${f(u * .42)}" fill="#ffc6a8"/><path d="M${f(gx - u * .25)} ${f(gy - u * 1.1)}q${f(u * .3)} ${f(u * .1)} ${f(u * .2)} ${f(u * .3)}t${f(u * .1)} ${f(u * .2)}q${f(-u * .3)} ${f(-u * .05)} ${f(-u * .35)} ${f(-u * .3)}Z" fill="#a8e6b5"/>${face(gx + u * .08, gy - u * .82, u * .11)}</g><path d="M${f(gx - u * .52)} ${f(gy - u * .85)}A${f(u * .52)} ${f(u * .52)} 0 0 0 ${f(gx + u * .3)} ${f(gy - u * .4)}" stroke="#e6b94f" stroke-width="${f(u * .07)}" fill="none"/></g>`;
  // owl on books, armchair cat
  const [bs, by] = bookstack(W * .17, H * .99, u * 1, 21);
  s += bs + owl(W * .17, by, u * .75, '#c7a8e8');
  const ax = W * .86, ay = H * .99;
  s += `<g><rect x="${f(ax - u * .75)}" y="${f(ay - u * 1.25)}" width="${f(u * 1.5)}" height="${f(u * .9)}" rx="${f(u * .35)}" fill="#ff9fb0"/><rect x="${f(ax - u * .9)}" y="${f(ay - u * .75)}" width="${f(u * 1.8)}" height="${f(u * .55)}" rx="${f(u * .2)}" fill="#ffb3c6"/><rect x="${f(ax - u * 1)}" y="${f(ay - u * .9)}" width="${f(u * .32)}" height="${f(u * .7)}" rx="${f(u * .16)}" fill="#ff9fb0"/><rect x="${f(ax + u * .68)}" y="${f(ay - u * .9)}" width="${f(u * .32)}" height="${f(u * .7)}" rx="${f(u * .16)}" fill="#ff9fb0"/><path d="M${f(ax - u * .7)} ${f(ay - u * .2)}v${f(u * .2)}M${f(ax + u * .7)} ${f(ay - u * .2)}v${f(u * .2)}" stroke="#a0806a" stroke-width="${f(u * .1)}" stroke-linecap="round"/></g>` + cat(ax + u * .05, ay - u * .68, u * .5, '#fff4e6', true);
  return s;
};

S.rain2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#a3d8ff'], [.55, '#eef8ff'], [1, '#fff4e4']]);
  const fid = 'fl' + (++GID);
  s += `<defs><g id="${fid}"><circle cx="0" cy="-.5" r=".48"/><circle cx=".5" cy="0" r=".48"/><circle cx="0" cy=".5" r=".48"/><circle cx="-.5" cy="0" r=".48"/><circle cx="0" cy="0" r=".18" fill="#fff" opacity=".8"/></g></defs>`;
  const rcx = W * .5, rb = H * .8, rr = Math.min(W * .48, H * .62), bw = u * .2, rc = ['#ff9fb0', '#ffc98a', '#ffe98a', '#a8e6b5', '#9fd2ff', '#c7b2ff'];
  s += `<g opacity=".62" fill="none" stroke-width="${f(bw + 1)}">${rc.map((c, i) => `<path d="M${f(rcx - rr + i * bw)} ${f(rb)}A${f(rr - i * bw)} ${f(rr - i * bw)} 0 0 1 ${f(rcx + rr - i * bw)} ${f(rb)}" stroke="${c}"/>`).join('')}</g>`;
  s += sun(W * .84, H * .12, u * .6) + cloud(W * .78, H * .2, u / 75, '#fff') + cloud(W * .14, H * .1, u / 65, '#f6f8ff') + cloud(W * .4, H * .06, u / 110, '#fff', .85);
  s += scatter(W, H, 14, 87, (x, y, r) => sparkle(x, y, 2.5 + r() * 4, '#fff'), [0, .15, 1, .7]);
  s += hills(W, H, H * .8, H * .05, '#c9ebc4', 9, 3);
  // pond
  const py = H * .8, pid = 'pc' + (++GID), pond = `M${f(-u * .5)} ${f(py + u * .2)}Q${f(W * .5)} ${f(py - u * .5)} ${f(W + u * .5)} ${f(py + u * .2)}V${f(H * .95)}Q${f(W * .5)} ${f(H * .9)} ${f(-u * .5)} ${f(H * .95)}Z`, [pg, pd] = lgr([[0, '#c6e8ff'], [1, '#9fd0f2']]);
  s += pd + `<defs><clipPath id="${pid}"><path d="${pond}"/></clipPath></defs><path d="${pond}" fill="url(#${pg})"/><g clip-path="url(#${pid})" opacity=".25" fill="none" stroke-width="${f(bw + 1)}">${rc.map((c, i) => `<path d="M${f(rcx - rr + i * bw)} ${f(py + u * .05)}A${f(rr - i * bw)} ${f(rr * .35 - i * bw * .35)} 0 0 0 ${f(rcx + rr - i * bw)} ${f(py + u * .05)}" stroke="${c}"/>`).join('')}</g>`;
  s += ripple(W * .3, H * .86, u * .5, 3) + ripple(W * .66, H * .84, u * .45, 3.4, 1.6);
  const pad = (x, y, sz) => `<g><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(sz)}" ry="${f(sz * .36)}" fill="#86d08f"/><path d="M${f(x)} ${f(y)}L${f(x + sz)} ${f(y - sz * .1)}L${f(x + sz * .9)} ${f(y + sz * .2)}Z" fill="#b2dcf6"/></g>`;
  s += pad(W * .42, H * .87, u * .7) + frog(W * .42, H * .87, u * .55) + pad(W * .78, H * .855, u * .55) + frog(W * .77, H * .855, u * .42, '#a8e6a0') + pad(W * .58, H * .9, u * .4);
  s += `<g>${[[-.2, '#ffc6dc'], [.2, '#ffc6dc'], [0, '#ff9fc5']].map(([dx, c]) => `<ellipse cx="${f(W * .6 + dx * u * .5)}" cy="${f(H * .88)}" rx="${f(u * .1)}" ry="${f(u * .24)}" fill="${c}" transform="rotate(${dx * 120} ${f(W * .6)} ${f(H * .9)})"/>`).join('')}</g>`;
  // banks + hydrangeas
  s += `<path d="M0 ${f(H * .94)}Q${f(W * .5)} ${f(H * .9)} ${W} ${f(H * .94)}V${H}H0Z" fill="#a8dca0"/>`;
  const pals = [['#9fb8ff', '#b9a4ff', '#c7d4ff', '#8fa8f0'], ['#ffb3d1', '#ff9fc0', '#ffd1e3', '#e8a8ff'], ['#c7a8ff', '#a8b8ff', '#e0c8ff', '#9fd8ff']], hr = Math.min(u * .7, W * .075);
  s += hydrangea(W * .05, H * .85, hr * 1.1, pals[0], 61, fid) + hydrangea(W * .15, H * .92, hr * .9, pals[1], 62, fid) + hydrangea(W * .87, H * .9, hr, pals[2], 63, fid) + hydrangea(W * .97, H * .84, hr * 1.1, pals[1], 64, fid);
  // puddles on the path
  s += [[.3, .975, 1], [.7, .985, .8]].map(([a, b, k]) => `<ellipse cx="${f(W * a)}" cy="${f(H * b)}" rx="${f(u * .7 * k)}" ry="${f(u * .14 * k)}" fill="#bfe0ff"/><path d="M${f(W * a - u * .4 * k)} ${f(H * b)}q${f(u * .4 * k)} ${f(-u * .2 * k)} ${f(u * .8 * k)} 0" stroke="#ffd1e3" stroke-width="${f(u * .04)}" fill="none" opacity=".8"/>`).join('');
  s += bunny(W * .5, H * .99, u * .55) + `<path d="M${f(W * .5 - u * .42)} ${f(H * .99 - u * .82)}Q${f(W * .5)} ${f(H * .99 - u * 1.3)} ${f(W * .5 + u * .42)} ${f(H * .99 - u * .82)}Z" fill="#ffe08a"/>`;
  s += `<g transform="rotate(-18 ${f(W * .22)} ${f(H * .99)})"><path d="M${f(W * .22)} ${f(H * .99)}V${f(H * .99 - u * 1.2)}" stroke="#8a6a7a" stroke-width="${f(u * .05)}"/><path d="M${f(W * .22)} ${f(H * .99 - u * 1.25)}l${f(u * .14)} ${f(u * .8)}h${f(-u * .28)}Z" fill="#9fd8ff"/><path d="M${f(W * .22)} ${f(H * .99)}a${f(u * .1)} ${f(u * .1)} 0 0 1 ${f(-u * .2)} 0" stroke="#8a6a7a" stroke-width="${f(u * .05)}" fill="none"/></g>`;
  s += `<g class="bob" style="--d:5s">${snail(W * .9, H * .99, u * .4)}</g>` + fly4(W * .3, H * .6, u * .36, '#ffb3d1') + fly4(W * .72, H * .66, u * .32, '#ffe08a');
  s += [[.05, .79], [.97, .78]].map(([a, b], i) => `<circle cx="${f(W * a)}" cy="${f(H * b)}" r="${f(u * .06)}" fill="#9fc4ff"><animate attributeName="cy" values="${f(H * b)};${f(H * b + u * 1)}" dur="${2 + i * .6}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="${2 + i * .6}s" repeatCount="indefinite"/></circle>`).join('');
  return s;
};

function toucan(x, y, s) {
  return `<g class="bob" style="--d:3.2s"><path d="M${f(x + s * .1)} ${f(y - s * .15)}l${f(s * .2)} ${f(s * .75)}h${f(s * .2)}Z" fill="#3e3a5a"/><ellipse cx="${f(x)}" cy="${f(y - s * .55)}" rx="${f(s * .32)}" ry="${f(s * .48)}" fill="#3e3a5a"/><ellipse cx="${f(x - s * .1)}" cy="${f(y - s * .7)}" rx="${f(s * .18)}" ry="${f(s * .22)}" fill="#fff6e6"/><path d="M${f(x - s * .1)} ${f(y - s * .45)}q${f(s * .1)} ${f(s * .12)} ${f(s * .2)} 0" stroke="#ff6f7f" stroke-width="${f(s * .08)}" fill="none" stroke-linecap="round"/><path d="M${f(x - s * .25)} ${f(y - s * .95)}Q${f(x - s * 1.05)} ${f(y - s * 1.05)} ${f(x - s * .95)} ${f(y - s * .8)}Q${f(x - s * .7)} ${f(y - s * .72)} ${f(x - s * .22)} ${f(y - s * .78)}Z" fill="#ffb35c"/><path d="M${f(x - s * .9)} ${f(y - s * .98)}Q${f(x - s * 1.05)} ${f(y - s * .9)} ${f(x - s * .95)} ${f(y - s * .8)}l${f(s * .1)} ${f(-s * .08)}Z" fill="#ff6f7f"/><path d="M${f(x - s * .25)} ${f(y - s * .87)}q${f(-s * .3)} ${f(-s * .02)} ${f(-s * .6)} ${f(s * .02)}" stroke="#ffd36b" stroke-width="${f(s * .04)}" fill="none"/><circle cx="${f(x - s * .05)}" cy="${f(y - s * .9)}" r="${f(s * .1)}" fill="#7fd8ff"/><circle cx="${f(x - s * .05)}" cy="${f(y - s * .9)}" r="${f(s * .05)}" fill="#3a3045"/><circle cx="${f(x - s * .03)}" cy="${f(y - s * .92)}" r="${f(s * .018)}" fill="#fff"/><ellipse cx="${f(x + s * .05)}" cy="${f(y - s * .78)}" rx="${f(s * .06)}" ry="${f(s * .035)}" fill="#ff9fb0"/><path d="M${f(x - s * .1)} ${f(y - s * .05)}v${f(s * .08)}M${f(x + s * .08)} ${f(y - s * .05)}v${f(s * .08)}" stroke="#7fd8ff" stroke-width="${f(s * .06)}" stroke-linecap="round"/></g>`;
}
S.jungle2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#c6f2dc'], [.5, '#e9fbdc'], [1, '#d0efbe']]);
  s += `<g opacity=".25" fill="#fff">${[.35, .6, .82].map((t, i) => `<path d="M${f(W * t)} 0h${f(u * .7)}L${f(W * t + u * (2.2 + i * .4))} ${f(H * .85)}h${f(-u * 1.3)}Z"/>`).join('')}</g>`;
  s += hills(W, H, H * .64, H * .1, '#a6dca8', 13, 4) + scatter(W, H, 7, 15, (x, y, r) => tree(x, y, u * (1 + r() * .5), ['#8fd68a', '#74c779', '#a3dc8c'][(r() * 3) | 0], '#9a7a5a'), [.3, .62, 1, .7]);
  // temple ruins
  const tx = W * .62, tb = H * .85, tw = Math.min(W * .54, u * 5.4), tiers = 4, th = u * .72;
  let tp = '';
  for (let i = 0; i < tiers; i++) { const w = tw * (1 - i * .2), y = tb - i * th; tp += `<rect x="${f(tx - w / 2)}" y="${f(y - th)}" width="${f(w)}" height="${f(th)}" rx="${f(u * .06)}" fill="${i % 2 ? '#cfc4e4' : '#c3b8dc'}"/><path d="M${f(tx - w / 2)} ${f(y - th)}h${f(w)}" stroke="#ddd4f0" stroke-width="3"/>${[.2, .75].map(k => `<ellipse cx="${f(tx - w / 2 + w * k)}" cy="${f(y - th * .1)}" rx="${f(u * .25)}" ry="${f(u * .07)}" fill="#8fd08a" opacity=".85"/>`).join('')}`; }
  const sy = tb - tiers * th, sw0 = tw * .2;
  tp += `<path d="M${f(tx - tw * .1)} ${f(tb)}L${f(tx - tw * .06)} ${f(sy)}H${f(tx + tw * .06)}L${f(tx + tw * .1)} ${f(tb)}Z" fill="#ddd4f0"/>` + Array.from({ length: 7 }, (_, k) => `<path d="M${f(tx - tw * (.1 - k * .006))} ${f(tb - k * (tb - sy) / 7)}h${f(tw * (.2 - k * .012))}" stroke="#b6aacb" stroke-width="2"/>`).join('');
  tp += `<rect x="${f(tx - sw0 * .8)}" y="${f(sy - u * .95)}" width="${f(sw0 * 1.6)}" height="${f(u * .95)}" rx="${f(u * .08)}" fill="#cfc4e4"/><path d="M${f(tx - sw0)} ${f(sy - u * .95)}h${f(sw0 * 2)}l${f(-sw0 * .3)} ${f(-u * .35)}h${f(-sw0 * 1.4)}Z" fill="#b6aacb"/><path d="M${f(tx - u * .22)} ${f(sy)}v${f(-u * .35)}a${f(u * .22)} ${f(u * .22)} 0 0 1 ${f(u * .44)} 0v${f(u * .35)}Z" fill="#6a5a8a"/>${halo(tx, sy - u * .25, u * .5, '#ffe08a', .7, 'glow')}<circle cx="${f(tx)}" cy="${f(sy - u * .2)}" r="${f(u * .1)}" fill="#ffd36b"/>${face(tx, sy - u * .65, u * .16)}`;
  s += `<g>${tp}</g>`;
  s += [[-.42, .8], [-.18, 1.1], [.3, .9], [.4, .6]].map(([k, l], i) => { const vx = tx + k * tw, vy = tb - (tiers - (i % 2 ? 2 : 1)) * th - th; return `<path d="M${f(vx)} ${f(vy)}q${f(u * .2)} ${f(u * l * .5)} 0 ${f(u * l)}" stroke="#5fae6f" stroke-width="${f(u * .06)}" fill="none"/><ellipse cx="${f(vx + u * .1)}" cy="${f(vy + u * l * .5)}" rx="${f(u * .12)}" ry="${f(u * .06)}" fill="#6fcf8a"/><ellipse cx="${f(vx)}" cy="${f(vy + u * l)}" rx="${f(u * .1)}" ry="${f(u * .05)}" fill="#8fdc8f"/>`; }).join('');
  // waterfall on the left cliff
  const fx = W * .13, fw = Math.max(u * .7, W * .06), ft = H * .5, fb = H * .85, [wg, wd] = lgr([[0, '#bfefff'], [1, '#8fd8f2']]);
  s += wd + `<path d="M0 ${f(fb)}V${f(ft - u * .5)}L${f(fx - fw * .4)} ${f(ft - u * .7)}Q${f(fx + fw)} ${f(ft - u * .9)} ${f(fx + fw * 1.6)} ${f(ft - u * .2)}L${f(fx + fw * 1.8)} ${f(fb)}Z" fill="#b6a8c9"/><path d="M0 ${f(ft - u * .5)}L${f(fx - fw * .4)} ${f(ft - u * .7)}Q${f(fx + fw)} ${f(ft - u * .9)} ${f(fx + fw * 1.6)} ${f(ft - u * .2)}V${f(ft)}H0Z" fill="#8fd68a"/>`;
  s += `<rect x="${f(fx - fw / 2)}" y="${f(ft - u * .4)}" width="${f(fw)}" height="${f(fb - ft + u * .4)}" rx="${f(fw * .2)}" fill="url(#${wg})"/>` + [-.28, .05, .3].map((dx, i) => `<path d="M${f(fx + dx * fw)} ${f(ft)}V${f(fb)}" stroke="#fff" stroke-width="${f(fw * .08)}" stroke-linecap="round" stroke-dasharray="${f(u * .5)} ${f(u * .7)}" opacity=".8"><animate attributeName="stroke-dashoffset" values="${f(u * 1.2)};0" dur="${f(.8 + i * .2)}s" repeatCount="indefinite"/></path>`).join('');
  // ground + pool
  s += `<path d="M0 ${f(H * .84)}Q${f(W * .3)} ${f(H * .81)} ${f(W * .6)} ${f(H * .85)}T${W} ${f(H * .84)}V${H}H0Z" fill="#8fd08a"/>`;
  s += `<ellipse cx="${f(fx + fw * .3)}" cy="${f(H * .9)}" rx="${f(fw * 2.6)}" ry="${f(u * .45)}" fill="#9fdcf2"/>` + [-.8, .2, 1.1].map((dx, i) => `<circle class="bob" style="--d:${1.5 + i * .4}s" cx="${f(fx + dx * fw)}" cy="${f(fb + u * .05)}" r="${f(fw * .3)}" fill="#fff" opacity=".85"/>`).join('') + ripple(fx + fw * .4, H * .91, u * .7, 2.6);
  s += `<path d="M0 ${f(H * .95)}Q${f(W * .4)} ${f(H * .92)} ${f(W * .75)} ${f(H * .955)}T${W} ${f(H * .94)}V${H}H0Z" fill="#74c27a"/>`;
  s += [[.36, .97, .38], [.48, .955, .32], [.58, .975, .36]].map(([a, b, r0]) => `<ellipse cx="${f(W * a)}" cy="${f(H * b)}" rx="${f(u * r0)}" ry="${f(u * r0 * .4)}" fill="#cfc4e4"/>`).join('');
  // stone friend + frog
  const ix = W * .8, iy = H * .985;
  s += `<g><path d="M${f(ix - u * .45)} ${f(iy)}V${f(iy - u * .9)}Q${f(ix - u * .45)} ${f(iy - u * 1.3)} ${f(ix)} ${f(iy - u * 1.3)}Q${f(ix + u * .45)} ${f(iy - u * 1.3)} ${f(ix + u * .45)} ${f(iy - u * .9)}V${f(iy)}Z" fill="#c3b8dc"/><path d="M${f(ix - u * .45)} ${f(iy - u * 1)}Q${f(ix)} ${f(iy - u * 1.45)} ${f(ix + u * .45)} ${f(iy - u * 1)}" stroke="#8fd08a" stroke-width="${f(u * .14)}" fill="none" stroke-linecap="round"/>${face(ix, iy - u * .7, u * .26)}<path d="M${f(ix - u * .45)} ${f(iy - u * .3)}h${f(u * .9)}" stroke="#b6aacb" stroke-width="2"/></g>`;
  const pil = (x, h) => `<g><rect x="${f(x - u * .22)}" y="${f(H * .9 - h)}" width="${f(u * .44)}" height="${f(h)}" fill="#cfc4e4"/><path d="M${f(x - u * .22)} ${f(H * .9 - h)}l${f(u * .15)} ${f(-u * .15)}l${f(u * .12)} ${f(u * .1)}l${f(u * .17)} ${f(-u * .08)}V${f(H * .9 - h)}Z" fill="#cfc4e4"/><rect x="${f(x - u * .3)}" y="${f(H * .9 - u * .15)}" width="${f(u * .6)}" height="${f(u * .15)}" fill="#b6aacb"/><path d="M${f(x - u * .22)} ${f(H * .9 - h * .8)}q${f(u * .3)} ${f(h * .3)} ${f(u * .44)} ${f(h * .2)}" stroke="#6fbf73" stroke-width="${f(u * .06)}" fill="none"/></g>`;
  s += pil(W * .3, u * 1.1) + pil(W * .38, u * .7) + frog(W * .48, H * .945, u * .5, '#9fe0a0') + sparkle(tx + u * .5, sy - u * 1.2, u * .14, '#fff6c9') + sparkle(tx - u * .7, sy - u * .4, u * .1, '#fff6c9');
  s += vine(W * .4, H * .24, u, 5) + vine(W * .54, H * .16, u, 8);
  s += `<path d="M${W} ${f(H * .24)}Q${f(W * .88)} ${f(H * .22)} ${f(W * .78)} ${f(H * .25)}" stroke="#9a7a5a" stroke-width="${f(u * .12)}" fill="none" stroke-linecap="round"/><ellipse cx="${f(W * .8)}" cy="${f(H * .23)}" rx="${f(u * .2)}" ry="${f(u * .08)}" fill="#6fcf8a"/>` + toucan(W * .88, H * .23, u * .9);
  s += bigleaf(-u * .1, H * 1.02, u * 2.2, 38, '#5fbf6c', '#4aa85a') + bigleaf(W + u * .1, H * 1.02, u * 2.4, -40, '#5fbf6c', '#4aa85a') + bigleaf(W * .94, H * 1.02, u * 1.8, -12, '#7dd47a', '#5fbf6c') + bigleaf(W * .28, H * 1.03, u * 1.2, 22, '#6fcf7a', '#4aa85a');
  const hib = (x, y, sz, c) => { let p = ''; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; p += `<ellipse cx="${f(x + Math.cos(a) * sz * .45)}" cy="${f(y + Math.sin(a) * sz * .45)}" rx="${f(sz * .42)}" ry="${f(sz * .32)}" fill="${c}" transform="rotate(${f(a * 180 / Math.PI)} ${f(x + Math.cos(a) * sz * .45)} ${f(y + Math.sin(a) * sz * .45)})"/>`; } return `<g>${p}<circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * .18)}" fill="#ffe08a"/></g>`; };
  s += hib(W * .66, H * .95, u * .3, '#ff8fb6') + hib(W * .72, H * .985, u * .24, '#ffb35c');
  s += fly4(W * .5, H * .7, u * .28, '#ffb3d1') + fly4(W * .3, H * .5, u * .24, '#9fd8ff');
  return s;
};

S.bakery2 = (W, H) => {
  const u = Math.min(W, H) / 10, ct = H * .855;
  let s = bgr(W, H, [[0, '#ffe2dc'], [1, '#fff3e4']]);
  // tiled backsplash
  let tl = ''; const tz = u * .5;
  for (let y = H * .56; y < ct; y += tz) tl += `<path d="M0 ${f(y)}H${W}" />`;
  for (let x = 0; x < W; x += tz) tl += `<path d="M${f(x)} ${f(H * .56)}V${f(ct)}"/>`;
  s += `<rect x="0" y="${f(H * .56)}" width="${W}" height="${f(ct - H * .56)}" fill="#ffd9e0"/><g stroke="#fff" stroke-width="2" opacity=".8">${tl}</g>`;
  // window
  const wx = W * .8, wy = H * .08, ws = Math.min(u * 1, W * .1);
  s += `<g><rect x="${f(wx - ws)}" y="${f(wy)}" width="${f(ws * 2)}" height="${f(ws * 1.7)}" rx="${f(ws * .9)}" fill="#bfe6ff" stroke="#fff" stroke-width="${f(u * .12)}"/>${cloud(wx - ws * .2, wy + ws * .9, ws / 160, '#fff', 1, '')}<path d="M${f(wx)} ${f(wy)}V${f(wy + ws * 1.7)}M${f(wx - ws)} ${f(wy + ws * .95)}H${f(wx + ws)}" stroke="#fff" stroke-width="${f(u * .07)}"/>${pot(wx, wy + ws * 1.85, ws * .5, '#ffb3c6', `<g>${flower(wx - ws * .12, wy + ws * 1.2, ws * .14, '#ff8fb6', '#ffd76a', false)}${flower(wx + ws * .14, wy + ws * 1.28, ws * .12, '#ffd36b', '#fff', false)}</g>`)}<rect x="${f(wx - ws * 1.2)}" y="${f(wy + ws * 1.85)}" width="${f(ws * 2.4)}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#e9c9a8"/></g>`;
  // hanging utensils
  const rx0 = W * .6, rx1 = W * .95, ry = H * .42;
  s += `<path d="M${f(rx0)} ${f(ry)}H${f(rx1)}" stroke="#c9a684" stroke-width="${f(u * .08)}" stroke-linecap="round"/>`;
  const ut = [(x) => `<path d="M${f(x)} ${f(ry)}v${f(u * .5)}" stroke="#c9a684" stroke-width="${f(u * .06)}"/><path d="M${f(x)} ${f(ry + u * .5)}q${f(-u * .25)} ${f(u * .35)} 0 ${f(u * .6)}q${f(u * .25)} ${f(-u * .25)} 0 ${f(-u * .6)}" stroke="#a7a3c4" stroke-width="2" fill="#eef"/><path d="M${f(x)} ${f(ry + u * .5)}v${f(u * .6)}" stroke="#a7a3c4" stroke-width="2"/>`, (x) => `<path d="M${f(x)} ${f(ry)}v${f(u * .7)}" stroke="#d9a07a" stroke-width="${f(u * .07)}"/><ellipse cx="${f(x)}" cy="${f(ry + u * .85)}" rx="${f(u * .14)}" ry="${f(u * .2)}" fill="#d9a07a"/>`, (x) => `<path d="M${f(x)} ${f(ry)}v${f(u * .55)}" stroke="#a7a3c4" stroke-width="${f(u * .05)}"/><circle cx="${f(x)}" cy="${f(ry + u * .72)}" r="${f(u * .2)}" fill="#ff9fb0"/><path d="M${f(x - u * .2)} ${f(ry + u * .72)}h${f(u * .4)}" stroke="#fff" stroke-width="2" opacity=".6"/>`];
  s += [0, 1, 2, 0].map((k, i) => `<g class="sway" style="--d:${3 + i * .5}s;transform-origin:${f(rx0 + u * .4 + i * (rx1 - rx0 - u * .8) / 3)}px ${f(ry)}px;transform-box:view-box">${ut[k](rx0 + u * .4 + i * (rx1 - rx0 - u * .8) / 3)}</g>`).join('');
  // brick oven
  const ox = W * .2, ow = Math.min(W * .19, u * 1.9), ob = ct, otop = ob - ow * 1.45;
  let br = ''; for (let y = otop + ow * .3; y < ob; y += u * .28) br += `<path d="M${f(ox - ow)} ${f(y)}H${f(ox + ow)}"/>`;
  const ocid = 'oc' + (++GID), [fg, fd] = rgr([[0, '#ffe08a'], [.6, '#ff9f5c'], [1, '#c0584a']]);
  s += fd + `<defs><clipPath id="${ocid}"><path d="M${f(ox - ow)} ${f(ob)}V${f(otop + ow)}A${f(ow)} ${f(ow)} 0 0 1 ${f(ox + ow)} ${f(otop + ow)}V${f(ob)}Z"/></clipPath></defs>`;
  s += `<g><rect x="${f(ox + ow * .3)}" y="0" width="${f(ow * .4)}" height="${f(otop + ow * .3)}" fill="#e8957a"/><path d="M${f(ox - ow)} ${f(ob)}V${f(otop + ow)}A${f(ow)} ${f(ow)} 0 0 1 ${f(ox + ow)} ${f(otop + ow)}V${f(ob)}Z" fill="#f2a58a"/><g clip-path="url(#${ocid})" stroke="#e08a70" stroke-width="2">${br}</g><path d="M${f(ox - ow * .55)} ${f(ob)}V${f(ob - ow * .45)}A${f(ow * .55)} ${f(ow * .5)} 0 0 1 ${f(ox + ow * .55)} ${f(ob - ow * .45)}V${f(ob)}Z" fill="url(#${fg})" class="glow"/>${flame(ox - ow * .25, ob - u * .05, u * .22, .7)}${flame(ox + ow * .22, ob - u * .05, u * .18, .9)}${shokupan(ox, ob - u * .1, u * .55)}<path d="M${f(ox - ow * .7)} ${f(ob - ow * .48)}A${f(ow * .7)} ${f(ow * .65)} 0 0 1 ${f(ox + ow * .7)} ${f(ob - ow * .48)}" stroke="#c9705a" stroke-width="${f(u * .12)}" fill="none"/>${face(ox, otop + ow * .55, u * .2)}</g>`;
  s += [0, 1, 2].map(k => `<circle class="float" style="--d:${f(2.6 + k * .6)}s" cx="${f(ox + ow * .5 + k * u * .1)}" cy="${f(H * .03 + k * u * .3)}" r="${f(u * (.14 + k * .03))}" fill="#fff" opacity=".7"/>`).join('');
  // shelf with jars
  const sx0 = W * .42, sx1 = W * .62, sy = H * .3;
  s += `<rect x="${f(sx0)}" y="${f(sy)}" width="${f(sx1 - sx0)}" height="${f(u * .12)}" rx="${f(u * .05)}" fill="#d9a07a"/>` + [['#fff6e6', '#ff9fb0'], ['#ffe08a', '#9fd8ff'], ['#fff', '#a8e6b5']].map(([c, l], i) => { const jx = sx0 + (i + .5) * (sx1 - sx0) / 3, jw = u * .26; return `<rect x="${f(jx - jw)}" y="${f(sy - u * .62)}" width="${f(jw * 2)}" height="${f(u * .62)}" rx="${f(u * .1)}" fill="${c}" stroke="#e9c9a8" stroke-width="2"/><rect x="${f(jx - jw * 1.05)}" y="${f(sy - u * .72)}" width="${f(jw * 2.1)}" height="${f(u * .14)}" rx="${f(u * .05)}" fill="${l}"/><rect x="${f(jx - jw * .6)}" y="${f(sy - u * .42)}" width="${f(jw * 1.2)}" height="${f(u * .2)}" rx="${f(u * .04)}" fill="${l}" opacity=".7"/>`; }).join('');
  // counter
  s += `<rect x="0" y="${f(ct)}" width="${W}" height="${f(H - ct)}" fill="#d9a07a"/><rect x="0" y="${f(ct)}" width="${W}" height="${f(u * .18)}" fill="#f2cfa6"/>` + Array.from({ length: Math.max(3, Math.round(W / (u * 2.2))) }, (_, i, A) => { const n = Math.max(3, Math.round(W / (u * 2.2))), x = W * (i + .5) / n, w = W / n * .8; return `<rect x="${f(x - w / 2)}" y="${f(ct + u * .35)}" width="${f(w)}" height="${f(H - ct - u * .5)}" rx="${f(u * .1)}" fill="none" stroke="#c48a66" stroke-width="2"/><rect x="${f(x - u * .25)}" y="${f(ct + u * .55)}" width="${f(u * .5)}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#fff2dc"/>`; }).join('');
  // on the counter: dough, rolling pin, flour sacks, cooling rack
  const x0 = ox + ow + u * .1, cx = x0 + u * .45, cy = ct + u * .02, dx = cx + u * 1.25, rw = Math.min(u * 1, W * .11), rk = dx + u * .75 + rw, px = rk + rw + u * 1.2;
  s += `<g transform="translate(${f(dx)} ${f(ct + u * .02)})"><g><animateTransform attributeName="transform" type="scale" values="1 1;1.06 1.12;1 1" dur="3s" repeatCount="indefinite"/><path d="M${f(-u * .6)} 0Q${f(-u * .65)} ${f(-u * .75)} 0 ${f(-u * .75)}Q${f(u * .65)} ${f(-u * .75)} ${f(u * .6)} 0Z" fill="#fff4dc"/><ellipse cx="${f(-u * .2)}" cy="${f(-u * .55)}" rx="${f(u * .12)}" ry="${f(u * .06)}" fill="#fff" opacity=".8"/>${face(0, -u * .32, u * .17)}</g></g>`;
  if (px + u * 1.1 < W - u * 2.4) s += `<g class="swim2" style="animation-duration:3s"><rect x="${f(px - u * .7)}" y="${f(ct - u * .24)}" width="${f(u * 1.4)}" height="${f(u * .24)}" rx="${f(u * .12)}" fill="#f2c08e"/><rect x="${f(px - u * 1)}" y="${f(ct - u * .17)}" width="${f(u * .32)}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#c98a5c"/><rect x="${f(px + u * .68)}" y="${f(ct - u * .17)}" width="${f(u * .32)}" height="${f(u * .1)}" rx="${f(u * .05)}" fill="#c98a5c"/></g><ellipse cx="${f(px)}" cy="${f(ct + u * .02)}" rx="${f(u * .9)}" ry="${f(u * .06)}" fill="#fff" opacity=".6"/>`;
  const sack = (x, sz, c) => `<g><path d="M${f(x - sz * .45)} ${f(ct)}Q${f(x - sz * .55)} ${f(ct - sz * .7)} ${f(x - sz * .25)} ${f(ct - sz * .95)}L${f(x - sz * .3)} ${f(ct - sz * 1.15)}H${f(x + sz * .3)}L${f(x + sz * .25)} ${f(ct - sz * .95)}Q${f(x + sz * .55)} ${f(ct - sz * .7)} ${f(x + sz * .45)} ${f(ct)}Z" fill="#fff6e6" stroke="#e9d6c0" stroke-width="2"/><path d="M${f(x - sz * .28)} ${f(ct - sz * .95)}h${f(sz * .56)}" stroke="${c}" stroke-width="${f(sz * .07)}" stroke-linecap="round"/><path d="M${f(x)} ${f(ct - sz * .2)}V${f(ct - sz * .65)}M${f(x)} ${f(ct - sz * .35)}l${f(-sz * .12)} ${f(-sz * .1)}M${f(x)} ${f(ct - sz * .35)}l${f(sz * .12)} ${f(-sz * .1)}M${f(x)} ${f(ct - sz * .5)}l${f(-sz * .12)} ${f(-sz * .1)}M${f(x)} ${f(ct - sz * .5)}l${f(sz * .12)} ${f(-sz * .1)}" stroke="#e8b27a" stroke-width="${f(sz * .05)}" stroke-linecap="round"/>${face(x, ct - sz * .72, sz * .09)}</g>`;
  s += sack(W - u * 1.75, u * 1.25, '#ff9fb0') + sack(W - u * .6, u * .95, '#9fd8ff');
  s += `<g><path d="M${f(rk - rw)} ${f(ct - u * .14)}H${f(rk + rw)}M${f(rk - rw * .9)} ${f(ct - u * .14)}v${f(u * .14)}M${f(rk + rw * .9)} ${f(ct - u * .14)}v${f(u * .14)}" stroke="#a7a3c4" stroke-width="${f(u * .06)}" stroke-linecap="round"/></g><g class="hop" style="--d:3s">${croissant(rk - rw * .5, ct - u * .16, u * .6)}</g><g class="bob" style="--d:3.4s">${melonpan(rk + rw * .45, ct - u * .16, u * .55)}</g>`;
  s += cat(cx, cy, u * .6, '#fff', true) + `<g><rect x="${f(cx + u * .32 * .6 - u * .17)}" y="${f(cy - u * .6 * 1.25)}" width="${f(u * .34)}" height="${f(u * .14)}" rx="${f(u * .04)}" fill="#fff" stroke="#e6dff0" stroke-width="1.5"/><circle cx="${f(cx + u * .19 - u * .08)}" cy="${f(cy - u * .87)}" r="${f(u * .12)}" fill="#fff" stroke="#e6dff0" stroke-width="1.5"/><circle cx="${f(cx + u * .19 + u * .08)}" cy="${f(cy - u * .87)}" r="${f(u * .12)}" fill="#fff" stroke="#e6dff0" stroke-width="1.5"/><circle cx="${f(cx + u * .19)}" cy="${f(cy - u * .95)}" r="${f(u * .13)}" fill="#fff" stroke="#e6dff0" stroke-width="1.5"/></g>`;
  s += scatter(W, H, 12, 51, (x, y, r) => `<circle class="float" style="--d:${f(4 + r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 2.5)}" fill="#fff" opacity=".8"/>`, [.28, .45, .75, .8]) + scatter(W, H, 6, 53, (x, y, r) => sparkle(x, y, 3 + r() * 4, '#fff'), [.3, .1, .7, .5]);
  return s;
};

S.moon2 = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#0d0f40'], [.55, '#25236a'], [1, '#3d3388']]);
  s += dust(W, H, 60, 91, [0, 0, 1, .8], '#fff', .55) + twk(W, H, 24, 93, [0, 0, 1, .75]) + scatter(W, H, 6, 95, (x, y, r) => star(x, y, u * (.08 + r() * .08), ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), [0, .05, 1, .6]);
  // big ringed planet
  const px = W * .84, py = H * .2, pr = u * 1;
  s += `<g class="bob" style="--d:10s">${halo(px, py, pr * 1.9, '#ffc2a8', .35)}<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(pr * 1.8)}" ry="${f(pr * .38)}" fill="none" stroke="#ffe08a" stroke-width="${f(pr * .14)}" transform="rotate(-14 ${f(px)} ${f(py)})" opacity=".85"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="#ffc2a8"/><path d="M${f(px - pr * .95)} ${f(py - pr * .2)}Q${f(px)} ${f(py - pr * .05)} ${f(px + pr * .95)} ${f(py - pr * .3)}M${f(px - pr * .85)} ${f(py + pr * .45)}Q${f(px)} ${f(py + pr * .6)} ${f(px + pr * .9)} ${f(py + pr * .35)}" stroke="#ffab8f" stroke-width="${f(pr * .12)}" fill="none" stroke-linecap="round"/>${face(px, py + pr * .08, pr * .32)}<path d="M${f(px - pr * 1.8)} ${f(py)}A${f(pr * 1.8)} ${f(pr * .38)} 0 0 0 ${f(px + pr * 1.8)} ${f(py)}" stroke="#ffe08a" stroke-width="${f(pr * .14)}" fill="none" transform="rotate(-14 ${f(px)} ${f(py)})" opacity=".9"/></g>`;
  s += earth(W * .5, H * .1, u * .4);
  // bunny space station
  const sx = W * .2, sy = H * .25, sr = u * .9;
  let win = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; win += `<circle cx="${f(sx + Math.cos(a) * sr)}" cy="${f(sy + Math.sin(a) * sr)}" r="${f(sr * .08)}" fill="#fff3b0"/>`; }
  s += `<g class="float" style="--d:8s"><rect x="${f(sx - sr * 2.1)}" y="${f(sy - sr * .2)}" width="${f(sr * .7)}" height="${f(sr * .4)}" rx="${f(sr * .04)}" fill="#8fb6e6" stroke="#cfe0ff" stroke-width="1.5"/><rect x="${f(sx + sr * 1.4)}" y="${f(sy - sr * .2)}" width="${f(sr * .7)}" height="${f(sr * .4)}" rx="${f(sr * .04)}" fill="#8fb6e6" stroke="#cfe0ff" stroke-width="1.5"/><path d="M${f(sx - sr * 1.4)} ${f(sy)}H${f(sx + sr * 1.4)}" stroke="#cfc6ea" stroke-width="${f(sr * .06)}"/><g>${spin(sx, sy, 40)}<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="none" stroke="#efe8ff" stroke-width="${f(sr * .26)}"/><path d="M${f(sx - sr)} ${f(sy)}H${f(sx + sr)}M${f(sx)} ${f(sy - sr)}V${f(sy + sr)}" stroke="#cfc6ea" stroke-width="${f(sr * .05)}"/>${win}</g><ellipse cx="${f(sx - sr * .14)}" cy="${f(sy - sr * .45)}" rx="${f(sr * .08)}" ry="${f(sr * .25)}" fill="#fff"/><ellipse cx="${f(sx + sr * .14)}" cy="${f(sy - sr * .45)}" rx="${f(sr * .08)}" ry="${f(sr * .25)}" fill="#fff"/><ellipse cx="${f(sx - sr * .14)}" cy="${f(sy - sr * .43)}" rx="${f(sr * .035)}" ry="${f(sr * .16)}" fill="#ffc6d3"/><ellipse cx="${f(sx + sr * .14)}" cy="${f(sy - sr * .43)}" rx="${f(sr * .035)}" ry="${f(sr * .16)}" fill="#ffc6d3"/><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr * .3)}" fill="#fff"/>${face(sx, sy, sr * .13)}<circle class="glow" cx="${f(sx + sr * 2.1)}" cy="${f(sy - sr * .25)}" r="${f(sr * .05)}" fill="#ff8fb6"/></g>`;
  s += `<g class="shoot"><path d="M${f(W * .55)} ${f(H * .3)}l${f(u * 1.6)} ${f(u * .5)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${star(W * .55 + u * 1.7, H * .3 + u * .53, u * .12, '#fff')}</g>`;
  // ring ground (we stand on a planet's ring)
  const rcx = W * .5, rcy = H * 1.9, rrx = Math.max(W * .95, H * .9), rry = H * 1.1, rc = ['#f6d8ff', '#ffe6c8', '#e2d4ff', '#ffe0ee', '#d4e4ff'];
  s += rc.map((c, i) => `<ellipse cx="${f(rcx)}" cy="${f(rcy)}" rx="${f(rrx - i * u * .1)}" ry="${f(rry - i * H * .028)}" fill="${c}"/>`).join('') + `<ellipse cx="${f(rcx)}" cy="${f(rcy)}" rx="${f(rrx)}" ry="${f(rry)}" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  s += scatter(W, H, 9, 97, (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(u * (.08 + r() * .1))}" ry="${f(u * .05)}" fill="#fff" opacity=".6"/>`, [0, .86, 1, .99]);
  // launch pad + bunny rocket
  const lx = W * .74, lb = H * .93, rh = Math.min(u * 2.6, H * .3), rw = u * .75;
  s += `<g><rect x="${f(lx - u * 1.1)}" y="${f(lb - u * .14)}" width="${f(u * 2.2)}" height="${f(u * .22)}" rx="${f(u * .08)}" fill="#b9a8e6"/><g stroke="#ff9fb0" stroke-width="${f(u * .06)}" fill="none"><path d="M${f(lx + rw * 1.1)} ${f(lb - u * .14)}V${f(lb - rh * .9)}M${f(lx + rw * 1.5)} ${f(lb - u * .14)}V${f(lb - rh * .9)}"/>${[.2, .4, .6, .8].map(k => `<path d="M${f(lx + rw * 1.1)} ${f(lb - rh * k)}L${f(lx + rw * 1.5)} ${f(lb - rh * (k + .1))}"/>`).join('')}<path d="M${f(lx + rw * 1.1)} ${f(lb - rh * .6)}H${f(lx + rw * .5)}"/></g>`;
  s += `<g class="bob" style="--d:2.4s"><path d="M${f(lx - rw / 2)} ${f(lb - rh * .1)}l${f(-rw * .4)} ${f(rh * .12)}V${f(lb - rh * .3)}l${f(rw * .4)} ${f(-rh * .1)}ZM${f(lx + rw / 2)} ${f(lb - rh * .1)}l${f(rw * .4)} ${f(rh * .12)}V${f(lb - rh * .3)}l${f(-rw * .4)} ${f(-rh * .1)}Z" fill="#9fd8ff"/><ellipse cx="${f(lx - rw * .2)}" cy="${f(lb - rh * 1.05)}" rx="${f(rw * .12)}" ry="${f(rw * .4)}" fill="#fff" transform="rotate(-12 ${f(lx - rw * .2)} ${f(lb - rh * 1.05)})"/><ellipse cx="${f(lx + rw * .2)}" cy="${f(lb - rh * 1.05)}" rx="${f(rw * .12)}" ry="${f(rw * .4)}" fill="#fff" transform="rotate(12 ${f(lx + rw * .2)} ${f(lb - rh * 1.05)})"/><ellipse cx="${f(lx - rw * .2)}" cy="${f(lb - rh * 1.04)}" rx="${f(rw * .05)}" ry="${f(rw * .26)}" fill="#ffc6d3" transform="rotate(-12 ${f(lx - rw * .2)} ${f(lb - rh * 1.04)})"/><ellipse cx="${f(lx + rw * .2)}" cy="${f(lb - rh * 1.04)}" rx="${f(rw * .05)}" ry="${f(rw * .26)}" fill="#ffc6d3" transform="rotate(12 ${f(lx + rw * .2)} ${f(lb - rh * 1.04)})"/><path d="M${f(lx - rw / 2)} ${f(lb - u * .14)}V${f(lb - rh * .65)}Q${f(lx - rw / 2)} ${f(lb - rh * .92)} ${f(lx)} ${f(lb - rh * .98)}Q${f(lx + rw / 2)} ${f(lb - rh * .92)} ${f(lx + rw / 2)} ${f(lb - rh * .65)}V${f(lb - u * .14)}Z" fill="#fff" stroke="#e6dcf0" stroke-width="2"/><rect x="${f(lx - rw / 2)}" y="${f(lb - rh * .32)}" width="${f(rw)}" height="${f(rh * .06)}" fill="#ff9fb0"/><circle cx="${f(lx)}" cy="${f(lb - rh * .58)}" r="${f(rw * .26)}" fill="#9fe0ff" stroke="#c9b6f0" stroke-width="${f(u * .06)}"/>${face(lx, lb - rh * .56, rw * .14)}</g>`;
  s += [0, 1, 2, 3].map(k => `<circle class="float" style="--d:${f(2 + k * .5)}s" cx="${f(lx + (k - 1.5) * u * .4)}" cy="${f(lb - u * .05 - (k % 2) * u * .08)}" r="${f(u * (.22 + (k % 2) * .08))}" fill="#fff" opacity=".85"/>`).join('') + '</g>';
  // astronaut bunnies + carrot flag
  const astro = (x, y, sz, c) => bunny(x, y, sz, c) + `<circle cx="${f(x)}" cy="${f(y - sz * .6)}" r="${f(sz * .66)}" fill="#c6e6ff" fill-opacity=".25" stroke="#bfe0ff" stroke-width="${f(sz * .07)}"/><path d="M${f(x - sz * .35)} ${f(y - sz * .9)}q${f(sz * .15)} ${f(-sz * .12)} ${f(sz * .3)} ${f(-sz * .1)}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
  s += astro(W * .18, H * .96, u * .75) + astro(W * .45, H * .985, u * .62, '#fff4f8');
  s += `<g><path d="M${f(W * .32)} ${f(H * .97)}V${f(H * .97 - u * 1.2)}" stroke="#e6dcf0" stroke-width="${f(u * .05)}"/><path d="M${f(W * .32)} ${f(H * .97 - u * 1.2)}h${f(u * .6)}v${f(u * .4)}h${f(-u * .6)}Z" fill="#ff9fb0" class="sway" style="--d:2.4s"/><path d="M${f(W * .32 + u * .15)} ${f(H * .97 - u * 1)}l${f(u * .3)} ${f(-u * .04)}l${f(-u * .1)} ${f(u * .12)}Z" fill="#ffb35c"/></g>`;
  s += `<g class="float" style="--d:6s"><rect x="${f(W * .06 - u * .16)}" y="${f(H * .56 - u * .1)}" width="${f(u * .32)}" height="${f(u * .2)}" rx="${f(u * .04)}" fill="#e6dcf0"/><rect x="${f(W * .06 - u * .55)}" y="${f(H * .56 - u * .08)}" width="${f(u * .36)}" height="${f(u * .16)}" fill="#8fb6e6"/><rect x="${f(W * .06 + u * .19)}" y="${f(H * .56 - u * .08)}" width="${f(u * .36)}" height="${f(u * .16)}" fill="#8fb6e6"/></g>`;
  return s;
};
/* ---------- end companion scenes ---------- */

/* ---------- すぴーど数独 scenes (speedway is the default, the rest are achievement rewards) ---------- */
const ringPath = (cx, cy, rx, ry, rx2, ry2) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0ZM${f(cx - rx2)} ${f(cy)}a${f(rx2)} ${f(ry2)} 0 1 0 ${f(rx2 * 2)} 0a${f(rx2)} ${f(ry2)} 0 1 0 ${f(-rx2 * 2)} 0Z`;
const speedlines = (x, y, u, n = 3, col = '#fff') => { let p = ''; for (let i = 0; i < n; i++) p += `<path d="M${f(x - u * (.4 + i * .12))} ${f(y - u * (.15 + i * .18))}h${f(-u * (.5 + (i % 2) * .3))}" stroke="${col}" stroke-width="${f(u * .06)}" stroke-linecap="round" opacity=".85"/>`; return `<g class="wave" style="--d:1.2s">${p}</g>`; };
function checker(x, y, w, h, n, c1 = '#43385a', c2 = '#fff') { let p = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c2}"/>`; const cw = w / n, rows = Math.max(1, Math.round(h / cw)); for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) if ((r + c) % 2) p += `<rect x="${f(x + c * cw)}" y="${f(y + r * (h / rows))}" width="${f(cw)}" height="${f(h / rows)}" fill="${c1}"/>`; return p; }
S.speedway = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#8fd3ff'], [.5, '#dff3ff'], [1, '#fff3dc']]);
  s += sun(W * .86, H * .12, u * .72);
  s += cloud(W * .14, H * .1, u / 78) + cloud(W * .48, H * .2, u / 100) + cloud(W * .68, H * .06, u / 120, '#fff', .85);
  s += hills(W, H, H * .55, H * .1, '#c4ecb0', 5, 3) + hills(W, H, H * .6, H * .06, '#a6df96', 17, 4);
  s += scatter(W, H, 7, 3, (x, y, r) => tree(x, y, u * (.7 + r() * .4), ['#7fcf7a', '#69c26f', '#a3dc8c'][(r() * 3) | 0]), [0, .56, 1, .6]);
  s += bunting(W, H * .26, H * .05, Math.max(8, Math.round(W / (u * 1.2))), ['#ff8fb6', '#ffd36b', '#8fc4ff', '#a8e6b5', '#c7b2ff', '#ffb38a']);
  const cx = W * .5, cy = H * .92, rx = Math.max(W * .62, u * 6), ry = H * .26, tw = u * 1.5;
  s += `<rect x="0" y="${f(H * .62)}" width="${W}" height="${f(H * .38)}" fill="#a6df96"/>`;
  s += `<path d="${ringPath(cx, cy, rx, ry, rx - tw, ry - tw * .62)}" fill="#ff9a6b" fill-rule="evenodd"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - tw)}" ry="${f(ry - tw * .62)}" fill="#b5e6a5"/>`;
  for (const k of [.33, .66]) s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - tw * k)}" ry="${f(ry - tw * .62 * k)}" fill="none" stroke="#fff" stroke-width="${f(u * .05)}" opacity=".85"/>`;
  // finish line + gate
  const fx = cx - rx * .62, top = cy - ry * .78;
  s += `<g><clipPath id="fc${GID}"><path d="${ringPath(cx, cy, rx, ry, rx - tw, ry - tw * .62)}" clip-rule="evenodd"/></clipPath><g clip-path="url(#fc${GID})">${checker(fx - u * .18, top - u * 1.2, u * .36, u * 2.8, 2)}</g></g>`;
  s += `<g><rect x="${f(fx - u * 1.1)}" y="${f(top - u * 1.9)}" width="${f(u * .14)}" height="${f(u * 2.2)}" rx="${f(u * .05)}" fill="#fff" stroke="#e3c8d6"/><rect x="${f(fx + u * .96)}" y="${f(top - u * 1.6)}" width="${f(u * .14)}" height="${f(u * 2.3)}" rx="${f(u * .05)}" fill="#fff" stroke="#e3c8d6"/><g class="sway" style="--d:3s">${checker(fx - u * 1.05, top - u * 1.95, u * 2.1, u * .5, 8)}<rect x="${f(fx - u * 1.05)}" y="${f(top - u * 1.95)}" width="${f(u * 2.1)}" height="${f(u * .5)}" fill="none" stroke="#43385a" stroke-width="2"/></g></g>`;
  // runners
  s += speedlines(W * .62, H * .86, u) + bunny(W * .64, H * .88, u * .55);
  s += speedlines(W * .4, H * .93, u * .8) + cat(W * .42, H * .95, u * .6, '#f6b56b');
  s += speedlines(W * .84, H * .8, u * .7) + bunny(W * .85, H * .815, u * .42, '#fff7ea');
  s += tree(W * .05, H * .7, u * 1.4, '#7fcf7a') + tree(W * .96, H * .66, u * 1.2, '#69c26f');
  s += scatter(W, H, 10, 7, (x, y, r) => flower(x, y, u * (.12 + r() * .06), ['#ff9fb0', '#ffd76a', '#b9a4ff', '#fff'][(r() * 4) | 0], '#ffd76a', false), [0, .64, 1, .7]);
  return s;
};
S.clocktown = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#ffd7c2'], [.55, '#fff0dc'], [1, '#ffe6ee']]);
  s += cloud(W * .18, H * .12, u / 80, '#fff', .9) + cloud(W * .8, H * .18, u / 95, '#fff', .85);
  s += scatter(W, H, 6, 11, (x, y) => `<g class="float" style="--d:6s"><path d="M${f(x)} ${f(y)}q${f(u * .18)} ${f(-u * .18)} ${f(u * .36)} 0q${f(u * .18)} ${f(-u * .18)} ${f(u * .36)} 0" fill="none" stroke="#7a6a8a" stroke-width="2.5" stroke-linecap="round"/></g>`, [.05, .05, .95, .3]);
  // clock tower
  const tx = W * .5, tb = H * .8, tw = u * 1.6, th = H * .5, cr = tw * .38, cy = tb - th * .72;
  s += `<path d="M${f(tx - tw / 2)} ${f(tb)}V${f(tb - th)}H${f(tx + tw / 2)}V${f(tb)}Z" fill="#fff4e6" stroke="#e8cdb5" stroke-width="2"/>`;
  s += `<path d="M${f(tx - tw * .62)} ${f(tb - th)}L${f(tx)} ${f(tb - th - tw * .9)}L${f(tx + tw * .62)} ${f(tb - th)}Z" fill="#ff8f7a"/><circle cx="${f(tx)}" cy="${f(tb - th - tw * .92)}" r="${f(u * .1)}" fill="#ffd36b"/>`;
  for (let k = 0; k < 3; k++) s += `<rect x="${f(tx - u * .14)}" y="${f(tb - th * (.42 - k * .13))}" width="${f(u * .28)}" height="${f(u * .36)}" rx="${f(u * .14)}" fill="#ffd9a8"/>`;
  s += `<circle cx="${f(tx)}" cy="${f(cy)}" r="${f(cr * 1.18)}" fill="#ffcf6b"/><circle cx="${f(tx)}" cy="${f(cy)}" r="${f(cr)}" fill="#fff"/>`;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; s += `<circle cx="${f(tx + Math.cos(a) * cr * .8)}" cy="${f(cy + Math.sin(a) * cr * .8)}" r="${f(cr * (k % 3 ? .04 : .07))}" fill="#7a6a8a"/>`; }
  s += `<g><path d="M${f(tx)} ${f(cy)}V${f(cy - cr * .5)}" stroke="#43385a" stroke-width="${f(cr * .08)}" stroke-linecap="round"/>${spin(tx, cy, 60)}</g><g><path d="M${f(tx)} ${f(cy)}V${f(cy - cr * .74)}" stroke="#ff7a3d" stroke-width="${f(cr * .05)}" stroke-linecap="round"/>${spin(tx, cy, 8)}</g><circle cx="${f(tx)}" cy="${f(cy)}" r="${f(cr * .08)}" fill="#43385a"/>`;
  // houses
  const cols = [['#fff1e0', '#ff8f7a'], ['#e6f4ff', '#6aa9e8'], ['#fff6c9', '#f2a65a'], ['#ffe6ef', '#e37ba0'], ['#eaffea', '#5fb27a']];
  const n = Math.max(6, Math.round(W / (u * 1.4)));
  for (let i = 0; i < n; i++) { const x = W * (i + .5) / n; if (Math.abs(x - tx) < tw * .9) continue; const [w, r] = cols[i % cols.length]; s += house(x, H * (.83 + (i % 2) * .02), u * (1 + (i % 3) * .15), w, r, i % 2 === 0); }
  s += `<rect x="0" y="${f(H * .86)}" width="${W}" height="${f(H * .14)}" fill="#f3dcc0"/>`;
  s += scatter(W, H, 14, 5, (x, y, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(u * .5)}" height="${f(u * .18)}" rx="${f(u * .06)}" fill="#e8c9a6" opacity=".7"/>`, [0, .88, 1, .98]);
  s += bunting(W, H * .44, H * .04, Math.max(8, Math.round(W / (u * 1.1))), ['#ff8fb6', '#ffd36b', '#8fc4ff', '#a8e6b5']);
  s += cat(W * .18, H * .96, u * .6, '#8a8a99') + bunny(W * .8, H * .97, u * .5) + speedlines(W * .78, H * .955, u * .6, 3, '#e8c9a6');
  s += balloon(W * .1, H * .36, u * .5, '#ff8fb6', 7) + balloon(W * .9, H * .32, u * .45, '#8fc4ff', 6);
  return s;
};
S.skyrail = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#b5c8ff'], [.5, '#e9e6ff'], [1, '#ffe2f0']]);
  s += scatter(W, H, 18, 9, (x, y, r) => sparkle(x, y, 3 + r() * 5, '#fff'), [0, 0, 1, .5]);
  // rainbow
  const rcx = W * .25, rcy = H * .62, rr = Math.min(W, H) * .42;
  ['#ff9fb0', '#ffc98a', '#ffe98a', '#a8e6b5', '#9fd2ff', '#c7b2ff'].forEach((c, k) => { const r0 = rr - k * u * .2; s += `<path d="M${f(rcx - r0)} ${f(rcy)}A${f(r0)} ${f(r0)} 0 0 1 ${f(rcx + r0)} ${f(rcy)}" fill="none" stroke="${c}" stroke-width="${f(u * .21)}" opacity=".8"/>`; });
  s += cloud(W * .1, H * .62, u / 60) + cloud(W * .42, H * .62, u / 70);
  // coaster rail with supports and a loop
  const y0 = H * .58, A = H * .18;
  let d = `M${f(-u)} ${f(y0)}`; const pts = [];
  for (let x = -u; x <= W + u; x += u * .5) { const y = y0 - Math.sin(x / W * Math.PI * 2.2) * A - (x > W * .55 && x < W * .75 ? Math.sin((x - W * .55) / (W * .2) * Math.PI) * A * .6 : 0); pts.push([x, y]); d += `L${f(x)} ${f(y)}`; }
  s += pts.filter((_, i) => i % 2 === 0).map(([x, y]) => `<path d="M${f(x)} ${f(y)}V${f(H * .86)}" stroke="#d8c8f0" stroke-width="${f(u * .07)}"/>`).join('');
  s += `<path d="${d}" fill="none" stroke="#ff7a9a" stroke-width="${f(u * .16)}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${f(u * .05)}" stroke-dasharray="${f(u * .12)} ${f(u * .18)}"/>`;
  const car = (c, face) => `<g><rect x="${f(-u * .42)}" y="${f(-u * .5)}" width="${f(u * .84)}" height="${f(u * .42)}" rx="${f(u * .12)}" fill="${c}"/><circle cx="${f(-u * .2)}" cy="${f(-u * .58)}" r="${f(u * .2)}" fill="${face}"/><circle cx="${f(u * .2)}" cy="${f(-u * .58)}" r="${f(u * .2)}" fill="#fff7ea"/><circle cx="${f(-u * .26)}" cy="${f(-u * .6)}" r="${f(u * .03)}" fill="#43385a"/><circle cx="${f(-u * .14)}" cy="${f(-u * .6)}" r="${f(u * .03)}" fill="#43385a"/><circle cx="${f(u * .14)}" cy="${f(-u * .6)}" r="${f(u * .03)}" fill="#43385a"/><circle cx="${f(u * .26)}" cy="${f(-u * .6)}" r="${f(u * .03)}" fill="#43385a"/></g>`;
  s += [0, 1.1, 2.2].map((b, k) => `<g>${car(['#ffd36b', '#8fc4ff', '#a8e6b5'][k], ['#ffb3c6', '#f6b56b', '#fff'][k])}<animateMotion dur="11s" begin="-${b}s" repeatCount="indefinite" rotate="auto" path="${d}"/></g>`).join('');
  s += puffs(W, H, H * .84, u * .9, '#fff', 3, .95) + puffs(W, H, H * .92, u * .7, '#f6eefe', 11);
  s += balloon(W * .88, H * .2, u * .55, '#ff8fb6', 6) + balloon(W * .94, H * .28, u * .45, '#ffd36b', 7) + balloon(W * .06, H * .18, u * .45, '#c7b2ff', 8);
  return s;
};
S.rocketbase = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#4b3f9e'], [.45, '#9b7fd8'], [1, '#ffc6d8']]);
  s += scatter(W, H, 40, 23, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 3)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.8 + r() * 1.6)}" fill="#fff"/>`, [0, 0, 1, .55]);
  s += `<g class="bob" style="--d:9s"><circle cx="${f(W * .82)}" cy="${f(H * .18)}" r="${f(u * .8)}" fill="#ffb3c6"/><ellipse cx="${f(W * .82)}" cy="${f(H * .18)}" rx="${f(u * 1.3)}" ry="${f(u * .28)}" fill="none" stroke="#ffe08a" stroke-width="${f(u * .1)}" transform="rotate(-18 ${f(W * .82)} ${f(H * .18)})"/>${face(W * .82, H * .19, u * .35)}</g>`;
  s += `<circle cx="${f(W * .14)}" cy="${f(H * .14)}" r="${f(u * .45)}" fill="#9fe0ff"/><circle cx="${f(W * .14 - u * .12)}" cy="${f(H * .14 - u * .1)}" r="${f(u * .1)}" fill="#fff" opacity=".6"/>`;
  s += hills(W, H, H * .76, H * .05, '#7a63c0', 9, 3);
  s += `<rect x="0" y="${f(H * .8)}" width="${W}" height="${f(H * .2)}" fill="#e8d8ff"/><rect x="0" y="${f(H * .8)}" width="${W}" height="${f(u * .12)}" fill="#cbb6f0"/>`;
  // launch tower
  const tx = W * .44, tb = H * .82, th = H * .48;
  s += `<g stroke="#ff8f6b" stroke-width="${f(u * .07)}" fill="none"><path d="M${f(tx)} ${f(tb)}V${f(tb - th)}M${f(tx + u * .6)} ${f(tb)}V${f(tb - th)}"/>`;
  for (let k = 0; k < 7; k++) { const y = tb - th * k / 7; s += `<path d="M${f(tx)} ${f(y)}L${f(tx + u * .6)} ${f(y - th / 7)}M${f(tx + u * .6)} ${f(y)}L${f(tx)} ${f(y - th / 7)}"/>`; }
  s += `<path d="M${f(tx + u * .6)} ${f(tb - th * .7)}h${f(u * .6)}"/></g>`;
  // rocket
  const rx = W * .58, rb = H * .8, rw = u * .9, rh = H * .36;
  s += `<g class="bob" style="--d:2.6s"><path d="M${f(rx - rw / 2)} ${f(rb - rh * .1)}l${f(-rw * .45)} ${f(rh * .12)}V${f(rb - rh * .28)}l${f(rw * .45)} ${f(-rh * .1)}ZM${f(rx + rw / 2)} ${f(rb - rh * .1)}l${f(rw * .45)} ${f(rh * .12)}V${f(rb - rh * .28)}l${f(-rw * .45)} ${f(-rh * .1)}Z" fill="#ff6b8a"/><path d="M${f(rx - rw / 2)} ${f(rb)}V${f(rb - rh * .7)}Q${f(rx - rw / 2)} ${f(rb - rh)} ${f(rx)} ${f(rb - rh * 1.08)}Q${f(rx + rw / 2)} ${f(rb - rh)} ${f(rx + rw / 2)} ${f(rb - rh * .7)}V${f(rb)}Z" fill="#fff" stroke="#e6dcf0" stroke-width="2"/><path d="M${f(rx - rw * .42)} ${f(rb - rh * .88)}Q${f(rx)} ${f(rb - rh * 1.12)} ${f(rx + rw * .42)} ${f(rb - rh * .88)}Z" fill="#ff6b8a"/><rect x="${f(rx - rw / 2)}" y="${f(rb - rh * .32)}" width="${f(rw)}" height="${f(rh * .07)}" fill="#ffd36b"/><circle cx="${f(rx)}" cy="${f(rb - rh * .6)}" r="${f(rw * .28)}" fill="#9fe0ff" stroke="#c9b6f0" stroke-width="${f(u * .07)}"/>${face(rx, rb - rh * .58, rw * .15)}</g>`;
  s += [0, 1, 2, 3, 4].map(k => `<circle class="float" style="--d:${f(2 + k * .4)}s" cx="${f(rx + (k - 2) * u * .38)}" cy="${f(rb + u * .1 - (k % 2) * u * .1)}" r="${f(u * (.3 + (k % 3) * .08))}" fill="#fff" opacity=".9"/>`).join('');
  s += bunny(W * .2, H * .97, u * .55) + cat(W * .82, H * .97, u * .55, '#fff');
  s += `<g><rect x="${f(W * .12)}" y="${f(H * .84)}" width="${f(u * .12)}" height="${f(u * .7)}" fill="#fff"/><path d="M${f(W * .12 + u * .12)} ${f(H * .84)}h${f(u * .6)}l${f(-u * .15)} ${f(u * .18)}l${f(u * .15)} ${f(u * .18)}h${f(-u * .6)}Z" fill="#ff8fb6" class="sway" style="--d:2s"/></g>`;
  return s;
};
S.neoncity = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#110c3a'], [.6, '#2a1d6b'], [1, '#4a2a7a']]);
  s += scatter(W, H, 50, 3, (x, y, r) => `<circle class="twinkle" style="--d:${f(2 + r() * 3)}s;--o:${f(-r() * 4)}s" cx="${f(x)}" cy="${f(y)}" r="${f(.6 + r() * 1.3)}" fill="#fff"/>`, [0, 0, 1, .45]);
  const mx = W * .82, my = H * .13, mr = u * .6;
  s += `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr * 1.8)}" fill="#fff3c4" opacity=".1"/><circle cx="${f(mx)}" cy="${f(my)}" r="${f(mr)}" fill="#fff3c4"/>${face(mx - mr * .1, my + mr * .1, mr * .35, '#7a6a4a')}`;
  const r = R(31); let x = -u * .5;
  const neon = ['#ff5ad1', '#4ff0ff', '#ffe74a', '#7dff8a', '#b38bff'];
  while (x < W + u) {
    const w = u * (.9 + r() * 1.2), h = H * (.22 + r() * .36), y = H * .82 - h, col = ['#2c2470', '#352a85', '#251e5e'][(r() * 3) | 0];
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h + H * .2)}" fill="${col}"/>`;
    for (let wy = y + u * .25; wy < H * .8; wy += u * .32) for (let wx = x + u * .18; wx < x + w - u * .2; wx += u * .3) if (r() < .55) s += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(u * .14)}" height="${f(u * .16)}" rx="${f(u * .03)}" fill="${r() < .2 ? '#ffd9f2' : '#ffe9a8'}" opacity="${f(.5 + r() * .5)}"/>`;
    if (r() < .55 && w > u * 1.2) { const c = neon[(r() * 5) | 0], d = 1 + ((r() * 4) | 0), sx = x + w / 2, sy = y + u * .6; s += `<g class="glow"><rect x="${f(sx - u * .42)}" y="${f(sy - u * .42)}" width="${f(u * .84)}" height="${f(u * .84)}" rx="${f(u * .2)}" fill="#1a1450" stroke="${c}" stroke-width="${f(u * .07)}"/><rect x="${f(sx - u * .42)}" y="${f(sy - u * .42)}" width="${f(u * .84)}" height="${f(u * .84)}" rx="${f(u * .2)}" fill="none" stroke="${c}" stroke-width="${f(u * .2)}" opacity=".25"/><text x="${f(sx)}" y="${f(sy)}" dy=".36em" text-anchor="middle" font-family="Fredoka,Arial" font-weight="700" font-size="${f(u * .6)}" fill="${c}">${d}</text></g>`; }
    x += w + u * .08;
  }
  s += `<rect x="0" y="${f(H * .82)}" width="${W}" height="${f(H * .18)}" fill="#1b1548"/>`;
  for (const [y, c, dur] of [[.87, '#ff5ad1', 1.6], [.92, '#4ff0ff', 1.2], [.97, '#ffe74a', 2]]) s += `<path d="M0 ${f(H * y)}H${W}" stroke="${c}" stroke-width="${f(u * .07)}" stroke-dasharray="${f(u * 1.4)} ${f(u * 2.2)}" stroke-linecap="round" opacity=".85"><animate attributeName="stroke-dashoffset" from="0" to="${f(-u * 3.6)}" dur="${dur}s" repeatCount="indefinite"/></path>`;
  s += cat(W * .14, H * .84, u * .55, '#fff') + bunny(W * .9, H * .845, u * .45);
  return s;
};
S.rainbowrun = (W, H) => {
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#ffd9f0'], [.5, '#fff3e0'], [1, '#e2f4ff']]);
  s += scatter(W, H, 24, 61, (x, y, r) => sparkle(x, y, 3 + r() * 6, ['#fff', '#ffe9a0', '#ffc9e6'][(r() * 3) | 0]), [0, 0, 1, .7]);
  const cx = W * .5, cy = H * 1.02, R0 = Math.min(W * .52, H * .8), bw = u * .55;
  ['#ff8fa8', '#ffb07a', '#ffe36b', '#8fe0a0', '#7fc8ff', '#b79bff'].forEach((c, k) => { const r0 = R0 - k * bw; s += `<path d="M${f(cx - r0)} ${f(cy)}A${f(r0)} ${f(r0)} 0 0 1 ${f(cx + r0)} ${f(cy)}" fill="none" stroke="${c}" stroke-width="${f(bw + 1)}"/>`; });
  s += `<path d="M${f(cx - R0 - bw / 2)} ${f(cy)}A${f(R0 + bw / 2)} ${f(R0 + bw / 2)} 0 0 1 ${f(cx + R0 + bw / 2)} ${f(cy)}" fill="none" stroke="#fff" stroke-width="${f(u * .06)}" opacity=".8"/>`;
  // runners on the rainbow
  const on = (a, sz, fn) => { const x = cx + Math.cos(a) * (R0 + bw * .2), y = cy - Math.sin(a) * (R0 + bw * .2); return fn(x, y, sz); };
  s += on(2.2, u * .6, (x, y, z) => speedlines(x - z * .2, y, z) + bunny(x, y, z));
  s += on(1.55, u * .6, (x, y, z) => speedlines(x - z * .2, y, z) + cat(x, y, z, '#ffd09a'));
  s += on(.95, u * .55, (x, y, z) => speedlines(x - z * .2, y, z) + bunny(x, y, z, '#ffeef4'));
  s += cloud(W * .06, H * .86, u / 55) + cloud(W * .94, H * .86, u / 55) + puffs(W, H, H * .92, u * .7, '#fff', 13, .95);
  s += scatter(W, H, 6, 71, (x, y, r) => `<path class="float" style="--d:${f(5 + r() * 3)}s" d="M${f(x)} ${f(y + u * .2)}c${f(-u * .3)} ${f(-u * .2)} ${f(-u * .3)} ${f(-u * .5)} 0 ${f(-u * .4)}c${f(u * .3)} ${f(-u * .1)} ${f(u * .3)} ${f(u * .2)} 0 ${f(u * .4)}z" fill="${['#ff8fb6', '#ffb3d0', '#ff9fb0'][(r() * 3) | 0]}"/>`, [.05, .1, .95, .5]);
  return s;
};
S.cloudtrack = (W, H) => {   // 中級＋ reward: a race track up in the clouds
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#8ec5ff'], [.55, '#d9ecff'], [1, '#ffe6f4']]);
  s += sun(W * .14, H * .12, u * .6, '#ffe07a');
  s += scatter(W, H, 16, 41, (x, y, r) => sparkle(x, y, 3 + r() * 4, '#fff'), [0, 0, 1, .4]);
  const rcx = W * .78, rcy = H * .5, rr = Math.min(W, H) * .3;
  ['#ff9fb0', '#ffc98a', '#ffe98a', '#a8e6b5', '#9fd2ff', '#c7b2ff'].forEach((c, k) => { const r0 = rr - k * u * .16; s += `<path d="M${f(rcx - r0)} ${f(rcy)}A${f(r0)} ${f(r0)} 0 0 1 ${f(rcx + r0)} ${f(rcy)}" fill="none" stroke="${c}" stroke-width="${f(u * .17)}" opacity=".7"/>`; });
  s += cloud(W * .2, H * .3, u / 70, '#fff', .95) + cloud(W * .55, H * .2, u / 90, '#fff', .9) + cloud(W * .9, H * .5, u / 75, '#fff', .95);
  s += puffs(W, H, H * .66, u * 1.1, '#fff', 5, .95) + puffs(W, H, H * .74, u * .9, '#f4f0ff', 9);
  // the track: a fluffy cloud ring with a pastel lane
  const cx = W * .5, cy = H * .9, rx = Math.max(W * .6, u * 6), ry = H * .22, tw = u * 1.3;
  s += `<rect x="0" y="${f(H * .72)}" width="${W}" height="${f(H * .28)}" fill="#fff"/>`;
  s += `<path d="${ringPath(cx, cy, rx, ry, rx - tw, ry - tw * .62)}" fill="#ffb3cf" fill-rule="evenodd"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - tw)}" ry="${f(ry - tw * .62)}" fill="#f2f6ff"/>`;
  for (const k of [.33, .66]) s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - tw * k)}" ry="${f(ry - tw * .62 * k)}" fill="none" stroke="#fff" stroke-width="${f(u * .05)}" stroke-dasharray="${f(u * .3)} ${f(u * .25)}"/>`;
  s += scatter(W, H, 9, 13, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(u * (.35 + r() * .3))}" fill="#fff"/>`, [0, .7, 1, .76]);
  // floating islands with little flags
  const isle = (x, y, z, c) => `<g class="bob" style="--d:${f(5 + z)}s"><path d="M${f(x - u * z)} ${f(y)}h${f(u * z * 2)}l${f(-u * z * .4)} ${f(u * z * .7)}h${f(-u * z * 1.2)}Z" fill="#c9a37a"/><path d="M${f(x - u * z)} ${f(y)}h${f(u * z * 2)}" stroke="#8fd36b" stroke-width="${f(u * .18 * z)}" stroke-linecap="round"/><path d="M${f(x)} ${f(y)}V${f(y - u * .9 * z)}" stroke="#fff" stroke-width="${f(u * .05)}"/><path d="M${f(x)} ${f(y - u * .9 * z)}h${f(u * .45 * z)}l${f(-u * .1 * z)} ${f(u * .15 * z)}l${f(u * .1 * z)} ${f(u * .15 * z)}h${f(-u * .45 * z)}Z" fill="${c}" class="sway" style="--d:2.4s"/></g>`;
  s += isle(W * .12, H * .5, .7, '#ff8fb6') + isle(W * .42, H * .44, .55, '#8fc4ff');
  s += speedlines(W * .62, H * .87, u) + bunny(W * .64, H * .89, u * .55);
  s += speedlines(W * .36, H * .95, u * .8) + cat(W * .38, H * .97, u * .58, '#c7b2ff');
  s += balloon(W * .9, H * .22, u * .5, '#ffd36b', 7) + balloon(W * .06, H * .62, u * .45, '#8fe0a0', 6);
  return s;
};
S.beachrun = (W, H) => {   // チャレンジ reward: a seaside circuit
  const u = Math.min(W, H) / 10;
  let s = bgr(W, H, [[0, '#7fd4ff'], [.45, '#cdefff'], [1, '#fff3d6']]);
  s += sun(W * .84, H * .12, u * .7);
  s += cloud(W * .2, H * .1, u / 85) + cloud(W * .55, H * .16, u / 110, '#fff', .85);
  // sea with waves and boats
  const sy = H * .42;
  s += `<rect x="0" y="${f(sy)}" width="${W}" height="${f(H * .26)}" fill="#4fbfe8"/><rect x="0" y="${f(sy)}" width="${W}" height="${f(u * .14)}" fill="#8fdcf5"/>`;
  for (let k = 0; k < 3; k++) { const y = sy + u * (.6 + k * .7); let d = `M${f(-u)} ${f(y)}`; for (let x = -u; x < W + u; x += u * .8) d += `q${f(u * .2)} ${f(-u * .16)} ${f(u * .4)} 0t${f(u * .4)} 0`; s += `<path class="wave" style="--d:${f(3 + k)}s" d="${d}" fill="none" stroke="#fff" stroke-width="${f(u * .05)}" opacity="${f(.7 - k * .15)}"/>`; }
  const boat = (x, y, z, c) => `<g class="bob" style="--d:${f(2.6 + z)}s"><path d="M${f(x - u * z)} ${f(y)}h${f(u * z * 2)}l${f(-u * z * .35)} ${f(u * z * .5)}h${f(-u * z * 1.3)}Z" fill="${c}"/><path d="M${f(x)} ${f(y)}V${f(y - u * z * 1.3)}" stroke="#8a6a4a" stroke-width="${f(u * .05)}"/><path d="M${f(x + u * .05)} ${f(y - u * z * 1.25)}l${f(u * z * .8)} ${f(u * z * 1.05)}h${f(-u * z * .8)}Z" fill="#fff"/></g>`;
  s += boat(W * .22, sy + u * .9, .55, '#ff8f7a') + boat(W * .66, sy + u * .6, .42, '#8fc4ff');
  s += `<g class="bob" style="--d:5s"><circle cx="${f(W * .46)}" cy="${f(sy + u * 1.5)}" r="${f(u * .28)}" fill="#ff8fb6" stroke="#fff" stroke-width="${f(u * .1)}"/></g>`;
  // sand + track
  s += `<path d="M0 ${f(H * .66)}Q${f(W * .5)} ${f(H * .6)} ${W} ${f(H * .66)}V${H}H0Z" fill="#ffe2a8"/>`;
  const ty = H * .86, tw = u * 1.1;
  s += `<path d="M${f(-u)} ${f(ty)}Q${f(W * .5)} ${f(ty - H * .1)} ${f(W + u)} ${f(ty)}" fill="none" stroke="#ff9a6b" stroke-width="${f(tw)}"/><path d="M${f(-u)} ${f(ty)}Q${f(W * .5)} ${f(ty - H * .1)} ${f(W + u)} ${f(ty)}" fill="none" stroke="#fff" stroke-width="${f(u * .05)}" stroke-dasharray="${f(u * .35)} ${f(u * .25)}"/>`;
  // palms and a parasol
  const palm = (x, y, z) => `<g><path d="M${f(x)} ${f(y)}Q${f(x + u * .3 * z)} ${f(y - u * 1.4 * z)} ${f(x + u * .1 * z)} ${f(y - u * 2.6 * z)}" stroke="#b07a4a" stroke-width="${f(u * .18 * z)}" fill="none" stroke-linecap="round"/><g class="sway" style="--d:3.4s">${[-2.4, -1.6, -.8, 0, .8].map(a => `<path d="M${f(x + u * .1 * z)} ${f(y - u * 2.6 * z)}q${f(Math.cos(a - 1.57) * u * .6 * z)} ${f(-u * .5 * z)} ${f(Math.sin(a) * u * 1.2 * z)} ${f(u * .5 * z + Math.abs(a) * u * .2 * z)}" stroke="#5fb27a" stroke-width="${f(u * .22 * z)}" fill="none" stroke-linecap="round"/>`).join('')}</g></g>`;
  s += palm(W * .06, H * .8, 1) + palm(W * .93, H * .78, .85);
  const px = W * .76, py = H * .74;
  s += `<path d="M${f(px)} ${f(py)}V${f(py - u * 1.1)}" stroke="#fff" stroke-width="${f(u * .06)}"/><path d="M${f(px - u * .8)} ${f(py - u * 1)}Q${f(px)} ${f(py - u * 1.7)} ${f(px + u * .8)} ${f(py - u * 1)}Z" fill="#ff8fb6"/><path d="M${f(px - u * .27)} ${f(py - u * 1.05)}Q${f(px)} ${f(py - u * 1.7)} ${f(px + u * .27)} ${f(py - u * 1.05)}Z" fill="#fff"/>`;
  s += scatter(W, H, 8, 17, (x, y, r) => `<path d="M${f(x)} ${f(y)}l${f(u * .12)} ${f(-u * .2)}l${f(u * .12)} ${f(u * .2)}z" fill="${['#ffb3c6', '#fff', '#ffd36b'][(r() * 3) | 0]}" opacity=".9"/>`, [.1, .68, .9, .76]);
  s += speedlines(W * .58, H * .82, u) + bunny(W * .6, H * .84, u * .55);
  s += speedlines(W * .3, H * .85, u * .8) + cat(W * .32, H * .87, u * .58, '#f6b56b');
  return s;
};

/* time of day: evening and night versions of every scene */
const NIGHT = ['stars', 'moon', 'neoncity', 'stars2', 'moon2', 'festival2', 'park2', 'iceberg2', 'desert2', 'sea2'];
function timeLayer(name, W, H, tod, variant) {
  if (!tod || tod === 'day') return '';
  const alreadyNight = NIGHT.includes(name) || (name === 'daily' && variant === 'h');
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
  cloudranch: [(x, y, s) => sheep(x, y, s * .55, x % 2 > 1, ''), (x, y, s) => cloud(x, y - s * .4, s / 120, '#fff', .95, ''), (x, y, s) => windmill(x, y, s * .45), (x, y, s, r) => flower(x, y - s * .15, s * .16, ['#ff9fb0', '#ffd76a', '#c7b2ff'][(r() * 3) | 0], '#fff', false)],
  park: [(x, y, s, r) => balloon(x, y - s * 1.2, s * .4, ['#ff8fb6', '#ffd36b', '#9fd8ff', '#a8e6b5'][(r() * 4) | 0]), (x, y, s) => carousel(x, y, s * .4), (x, y, s, r) => `<g><path d="M${f(x)} ${f(y)}V${f(y - s)}" stroke="#c9a0b8" stroke-width="2"/><path d="M${f(x)} ${f(y - s)}l${f(s * .45)} ${f(s * .15)}l${f(-s * .45)} ${f(s * .15)}Z" fill="${['#ff8fb6', '#ffd36b', '#9fd8ff'][(r() * 3) | 0]}"/></g>`],
  iceberg: [(x, y, s, r) => penguin(x, y, s * .55, r() < .5, '', r() < .5 ? '#ff8fb6' : ''), (x, y, s) => berg(x, y, s * 1.1, s * .7), (x, y, s) => sparkle(x, y - s * .5, s * .15, '#fff', '')],
  desert: [(x, y, s) => palm(x, y, s * .5), (x, y, s) => cactus(x, y, s * .4), (x, y, s) => camel(x, y, s * .5)],
  toytown: [(x, y, s, r) => blockhouse(x, y, s * .45, ['#ff9fb8', '#8fc4ff', '#9fe0b4', '#ffcd6b'][(r() * 4) | 0], ['#8fc4ff', '#ff8f8f', '#c7a8ff'][(r() * 3) | 0], 'ABC'[(r() * 3) | 0]), (x, y, s) => tinsoldier(x, y, s * .4), (x, y, s, r) => spintop(x, y, s * .45, ['#c7a8ff', '#ff9fb8'][(r() * 2) | 0], '#ffe08a', 1.4)],
  library: [(x, y, s, r) => bookstack(x, y, s * .6, (r() * 1000) | 0)[0], (x, y, s) => owl(x, y, s * .5), (x, y, s, r) => openbook(x, y - s * .6, s * .5, ['#9fd8ff', '#ff9fb0', '#a8e6b5'][(r() * 3) | 0], 0)],
  rain: [(x, y, s, r) => umbrella(x, y, s * .4, ['#ff9fb0', '#9fd8ff', '#c7a8ff'][(r() * 3) | 0], '#fff', (r() - .5) * 30), (x, y, s) => frog(x, y, s * .45), (x, y, s) => snail(x, y, s * .4), (x, y, s) => `<path d="M${f(x)} ${f(y - s * .9)}q${f(s * .2)} ${f(s * .25)} ${f(s * .2)} ${f(s * .38)}a${f(s * .2)} ${f(s * .2)} 0 0 1 ${f(-s * .4)} 0q0 ${f(-s * .13)} ${f(s * .2)} ${f(-s * .38)}Z" fill="#9fc4ff"/>`],
  jungle: [(x, y, s, r) => bigleaf(x, y, s * .9, (r() - .5) * 50, '#6fcf7a', '#4aa85a'), (x, y, s) => parrot(x, y, s * .45), (x, y, s) => fly4(x, y - s * .6, s * .25, '#ffb3d1')],
  bakery: [(x, y, s) => croissant(x, y - s * .05, s * .5), (x, y, s) => melonpan(x, y, s * .45), (x, y, s) => shokupan(x, y, s * .5)],
  moon: [(x, y, s) => `<ellipse cx="${f(x)}" cy="${f(y - s * .1)}" rx="${f(s * .35)}" ry="${f(s * .1)}" fill="#e3cf96"/><path d="M${f(x - s * .35)} ${f(y - s * .1)}a${f(s * .35)} ${f(s * .1)} 0 0 0 ${f(s * .7)} 0" fill="none" stroke="#fffbe8" stroke-width="2"/>`, (x, y, s) => bunny(x, y, s * .4), (x, y, s, r) => star(x, y - s * .5, s * .15, ['#ffe27a', '#ffd1e8', '#c6e6ff'][(r() * 3) | 0], 'twinkle'), (x, y, s) => `<g fill="#fff" stroke="#efe4d0" stroke-width="1.5"><circle cx="${f(x - s * .12)}" cy="${f(y - s * .12)}" r="${f(s * .11)}"/><circle cx="${f(x + s * .12)}" cy="${f(y - s * .12)}" r="${f(s * .11)}"/><circle cx="${f(x)}" cy="${f(y - s * .3)}" r="${f(s * .11)}"/></g>`],
};
function deco(theme, x, y, s, r) { const L = DECO[theme] || DECO[String(theme).replace(/2$/, '')] || DECO.forest; return L[(r() * L.length) | 0](x, y, s, r); }

const THEMES = ['forest', 'harbor', 'sweets', 'sea', 'garden', 'festival', 'autumn', 'snow', 'stars', 'castle', 'cloudranch', 'park', 'iceberg', 'desert', 'toytown', 'library', 'rain', 'jungle', 'bakery', 'moon'];
function svg(name, W, H, variant, tod) {
  const fn = S[name] || S.daily;
  if (name === 'daily' && tod === 'night') variant = 'h';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${fn(W, H, variant)}${timeLayer(name, W, H, tod, variant)}</svg>`;
}
window.SudokuBG = { THEMES, svg, deco, rng: R };
})();
