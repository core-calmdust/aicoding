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

/* time of day: evening and night versions of every scene */
function timeLayer(name, W, H, tod, variant) {
  if (!tod || tod === 'day') return '';
  const alreadyNight = name === 'stars' || name === 'moon' || (name === 'daily' && variant === 'h');
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
function deco(theme, x, y, s, r) { const L = DECO[theme] || DECO.forest; return L[(r() * L.length) | 0](x, y, s, r); }

const THEMES = ['forest', 'harbor', 'sweets', 'sea', 'garden', 'festival', 'autumn', 'snow', 'stars', 'castle', 'cloudranch', 'park', 'iceberg', 'desert', 'toytown', 'library', 'rain', 'jungle', 'bakery', 'moon'];
function svg(name, W, H, variant, tod) {
  const fn = S[name] || S.daily;
  if (name === 'daily' && tod === 'night') variant = 'h';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${fn(W, H, variant)}${timeLayer(name, W, H, tod, variant)}</svg>`;
}
window.SudokuBG = { THEMES, svg, deco, rng: R };
})();
