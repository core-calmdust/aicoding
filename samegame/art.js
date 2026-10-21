/* さめが〜め POP! — pop-art graphics (Lichtenstein-style): block emblems, 100 characters, backgrounds, mascot.
   Everything is inline SVG so it scales crisply. */
(function () {
'use strict';
const K = '#000', W = '#fff';
const S = `stroke="${K}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${K}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
// block colors (index = game color)
const BC = ['#E4202A', '#1B4FCB', '#FFD400', '#19A35B', '#FF4FA0', '#7B3FD0'];
const BC_LT = ['#FF7A6E', '#6A93F2', '#FFF07A', '#6FDB9B', '#FF9ECB', '#B18AF0'];
// read the current skin's block colors (--c0..--c5) into BC / BC_LT (in place)
function syncPalette() {
  const cs = getComputedStyle(document.body);
  for (let i = 0; i < 6; i++) {
    const v = cs.getPropertyValue('--c' + i).trim(); if (!v) continue; BC[i] = v;
    const m = v.match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16), mix = c => Math.round(c + (255 - c) * .45); BC_LT[i] = '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c => mix(c).toString(16).padStart(2, '0')).join(''); }
  }
}
// white emblems drawn in a 24×24 box
const EMB = [
  '<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z"/>',            // star
  '<path d="M12 2.6c3.6 4.9 6.6 8.7 6.6 12.2a6.6 6.6 0 0 1-13.2 0C5.4 11.3 8.4 7.5 12 2.6z"/>',          // drop
  '<path d="M14.3 2 5 13.4h5.7L8.9 22 19 9.8h-5.8z"/>',                                                // bolt
  '<path d="M12 3.2 21.3 20H2.7z"/>',                                                                  // triangle
  '<path d="M12 20.6S3 15 3 8.9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 1.9c0 6.1-9 11.7-9 11.7z"/>',         // heart
  '<path d="M12 2.2 21 12l-9 9.8L3 12z"/>',                                                            // diamond
];
const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
${EMB.map((p, i) => `<symbol id="em${i}" viewBox="0 0 24 24"><g fill="${W}" stroke="${K}" stroke-width="2" stroke-linejoin="round">${p}</g></symbol>`).join('')}
<symbol id="emRock" viewBox="0 0 24 24"><path d="M4 15 7 7l6-3 6 4 2 8-5 5H8z" fill="#9a9a9a" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M8 11l3 2 4-3M10 17l3-2" fill="none" stroke="${K}" stroke-width="1.6"/></symbol>
<symbol id="emBomb" viewBox="0 0 24 24"><circle cx="11" cy="14" r="7" fill="${K}"/><circle cx="8.6" cy="11.6" r="2" fill="${W}"/><path d="M15 8.5l2-2.5" stroke="${K}" stroke-width="2.4"/><path d="M18 3.5l.6 1.8 1.9.1-1.5 1.1.6 1.8-1.6-1-1.6 1 .6-1.8-1.5-1.1 1.9-.1z" fill="#FFD400" stroke="${K}" stroke-width="1"/></symbol>
<symbol id="emPaint" viewBox="0 0 24 24"><path d="M5 9h12l-1.5 11h-9z" fill="${W}" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M5 9c0-2 3-3 6-3s6 1 6 3" fill="none" stroke="${K}" stroke-width="2"/><path d="M17 9c2.5 0 3 2 3 4.5 0 1.4-.7 2-1.3 2s-1.2-.6-1.2-2" fill="${W}" stroke="${K}" stroke-width="1.8"/></symbol>
<symbol id="emWild" viewBox="0 0 24 24"><path d="M3 17a9 9 0 0 1 18 0" fill="none" stroke="#E4202A" stroke-width="3"/><path d="M6 17a6 6 0 0 1 12 0" fill="none" stroke="#FFD400" stroke-width="3"/><path d="M9 17a3 3 0 0 1 6 0" fill="none" stroke="#1B4FCB" stroke-width="3"/></symbol>
<pattern id="bdK" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="${K}" opacity=".22"/></pattern>
<pattern id="bdW" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.3" fill="${W}" opacity=".5"/></pattern>
<pattern id="bdR" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="#E4202A" opacity=".55"/></pattern>
</defs></svg>`;

/* ---------------- characters ---------------- */
// 12 subjects × 8 variants = 96, + 4 UR specials (96..99)
const SUBJ = ['shark', 'hammer', 'octo', 'puffer', 'whale', 'penguin', 'crab', 'squid', 'robot', 'cat', 'girl', 'diver'];
// main color per subject per variant (variant 0 = default)
const PAL = {
  shark: ['#5B8FD8', '#7DA4B8', '#E4202A', '#19A35B', '#FF4FA0', '#7B3FD0', '#222', '#FFD400'],
  hammer: ['#8AA3B8', '#5B8FD8', '#FFD400', '#E4202A', '#19A35B', '#FF4FA0', '#7B3FD0', '#FFD400'],
  octo: ['#E4202A', '#FF4FA0', '#7B3FD0', '#1B4FCB', '#19A35B', '#FF8A00', '#222', '#FFD400'],
  puffer: ['#FFD400', '#FF8A00', '#5BD3E8', '#FF4FA0', '#19A35B', '#E4202A', '#7B3FD0', '#FFD400'],
  whale: ['#1B4FCB', '#5B8FD8', '#7B3FD0', '#19A35B', '#E4202A', '#FF4FA0', '#222', '#FFD400'],
  penguin: ['#1d1d2b', '#1B4FCB', '#7B3FD0', '#E4202A', '#19A35B', '#FF4FA0', '#5B8FD8', '#FFD400'],
  crab: ['#E4202A', '#FF8A00', '#1B4FCB', '#7B3FD0', '#19A35B', '#FF4FA0', '#222', '#FFD400'],
  squid: ['#F2F2F2', '#FF4FA0', '#5BD3E8', '#FFD400', '#19A35B', '#7B3FD0', '#E4202A', '#FFD400'],
  robot: ['#B8C4CC', '#E4202A', '#1B4FCB', '#19A35B', '#FF4FA0', '#7B3FD0', '#222', '#FFD400'],
  cat: ['#FF8A00', '#222', '#F2F2F2', '#7B3FD0', '#1B4FCB', '#FF4FA0', '#19A35B', '#FFD400'],
  girl: ['#FFD400', '#E4202A', '#222', '#1B4FCB', '#FF4FA0', '#7B3FD0', '#19A35B', '#FFD400'],
  diver: ['#C99A2E', '#1B4FCB', '#E4202A', '#19A35B', '#FF4FA0', '#7B3FD0', '#222', '#FFD400'],
};
const BGV = ['#FFD400', '#5BD3E8', '#FF4FA0', '#FFF3C4', '#19A35B', '#E4202A', '#1B4FCB', '#1B4FCB'];
const eye = (x, y, r = 5.5, look = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}" ${S2}/><circle cx="${x + look}" cy="${y}" r="${r * .48}" fill="${K}"/><circle cx="${x + look - r * .2}" cy="${y - r * .25}" r="${r * .16}" fill="${W}"/>`;
const dots = (d, fill) => `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#bdK)"/><path d="${d}" fill="none" ${S}/>`;

function body(sub, c) {
  switch (sub) {
    case 'shark': return `<path d="M15 60 3 45l4 16-4 15z" fill="${c}" ${S}/>` + dots('M13 60C22 37 62 30 88 51c5 4 4 13-3 17-25 14-62 11-72-8z', c) +
      `<path d="M45 39 55 15l10 25z" fill="${c}" ${S}/><path d="M32 70c20 7 40 4 53-2-6 8-27 13-48 9z" fill="${W}" ${S2}/>` + eye(72, 50, 5.5, 1) +
      `<path d="M60 63q13 8 27-2" fill="none" ${S}/><path d="M64 65l2.5 4 2.5-3.2 2.5 3.6 2.5-3.4 2.5 3.4 2.5-3.8 2.5 3" fill="${W}" ${S2}/><path d="M53 50v8M57 49v9" ${S2}/>`;
    case 'hammer': return dots('M30 50c0 30 10 42 20 42s20-12 20-42z', c) + `<path d="M8 38c0-6 4-9 10-9h64c6 0 10 3 10 9s-4 9-10 9H18c-6 0-10-3-10-9z" fill="${c}" ${S}/>` +
      eye(16, 38, 5, 0) + eye(84, 38, 5, 0) + `<path d="M41 60q9 7 18 0" fill="none" ${S}/><path d="M50 13 44 30h12z" fill="${c}" ${S}/>`;
    case 'octo': return `<g fill="${c}" ${S}><path d="M22 60c-6 14-14 18-18 16 8-2 10-10 9-16zM78 60c6 14 14 18 18 16-8-2-10-10-9-16z"/><path d="M33 64c-3 16-8 24-14 25 9 3 16-6 21-22zM67 64c3 16 8 24 14 25-9 3-16-6-21-22z"/><path d="M45 66c-2 14 0 24-5 28 9 0 11-12 11-26zM55 66c2 14 0 24 5 28-9 0-11-12-11-26z"/></g>` +
      dots('M50 10c22 0 32 17 32 34s-12 24-32 24-32-7-32-24 10-34 32-34z', c) + eye(39, 42, 7, 1) + eye(61, 42, 7, -1) + `<ellipse cx="50" cy="56" rx="5" ry="4" fill="${K}"/><circle cx="31" cy="24" r="4" fill="${W}" opacity=".6"/>`;
    case 'puffer': { let sp = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = 50 + Math.cos(a) * 31, y = 54 + Math.sin(a) * 31, x2 = 50 + Math.cos(a) * 42, y2 = 54 + Math.sin(a) * 42, p = 0.16; sp += `<path d="M${(50 + Math.cos(a - p) * 31).toFixed(1)} ${(54 + Math.sin(a - p) * 31).toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${(50 + Math.cos(a + p) * 31).toFixed(1)} ${(54 + Math.sin(a + p) * 31).toFixed(1)}" fill="${W}" ${S2}/>`; }
      return sp + dots('M50 22a32 32 0 1 1 0 64 32 32 0 1 1 0-64z', c) + `<path d="M28 62c10 18 34 18 44 0" fill="${W}" ${S2}/>` + eye(38, 48, 7, 1) + eye(62, 48, 7, -1) + `<ellipse cx="50" cy="64" rx="6" ry="5" fill="#E4202A" ${S2}/>`; }
    case 'whale': return `<path d="M50 20c-6-10-14-8-14-8M50 20c6-10 14-8 14-8M50 20V8" fill="none" stroke="#5BD3E8" stroke-width="4" stroke-linecap="round"/>` + `<path d="M84 56 98 42l-2 18 2 17z" fill="${c}" ${S}/>` +
      dots('M10 58c0-22 18-34 42-34 26 0 36 16 36 32 0 18-18 28-40 28S10 78 10 58z', c) + `<path d="M14 66c10 14 50 16 70 0-6 12-22 18-36 18S20 78 14 66z" fill="${W}" ${S2}/>` + eye(32, 52, 5, 1) + `<path d="M22 64q10 6 22 2" fill="none" ${S}/>`;
    case 'penguin': return `<path d="M36 88h-12l8-6zM64 88h12l-8-6z" fill="#FF8A00" ${S}/>` + dots('M50 12c20 0 28 20 28 44s-8 32-28 32-28-8-28-32 8-44 28-44z', c) +
      `<path d="M50 34c12 0 18 12 18 26s-6 22-18 22-18-8-18-22 6-26 18-26z" fill="${W}" ${S2}/><path d="M22 50c-8 6-10 16-8 22 6-4 10-10 10-16M78 50c8 6 10 16 8 22-6-4-10-10-10-16" fill="${c}" ${S}/>` +
      eye(42, 32, 5, 1) + eye(58, 32, 5, -1) + `<path d="M44 42h12l-6 8z" fill="#FF8A00" ${S2}/>`;
    case 'crab': return `<g fill="${c}" ${S}><path d="M18 46C4 42 4 22 16 18c-2 8 4 10 8 6 2 10-2 18-6 22zM82 46c14-4 14-24 2-28 2 8-4 10-8 6-2 10 2 18 6 22z"/><path d="M22 70l-12 10M26 76l-8 14M78 70l12 10M74 76l8 14" fill="none"/></g>` +
      dots('M14 62c0-16 16-26 36-26s36 10 36 26-16 22-36 22-36-6-36-22z', c) + `<path d="M40 38V26M60 38V26" ${S}/>` + eye(40, 22, 6, 1) + eye(60, 22, 6, -1) + `<path d="M40 64q10 8 20 0" fill="none" ${S}/>`;
    case 'squid': return `<g fill="${c}" ${S}><path d="M34 66c-4 10-6 20-12 26 8 0 14-10 18-24zM66 66c4 10 6 20 12 26-8 0-14-10-18-24zM45 68c-2 10-2 18-4 24 6-2 8-12 8-24zM55 68c2 10 2 18 4 24-6-2-8-12-8-24z"/></g>` +
      `<path d="M50 4 30 26h40z" fill="${c}" ${S}/>` + dots('M30 26h40c4 16 4 30 0 42H30c-4-12-4-26 0-42z', c) + eye(41, 48, 6, 1) + eye(59, 48, 6, -1) + `<path d="M45 60q5 4 10 0" fill="none" ${S2}/>`;
    case 'robot': return `<path d="M50 18V8" ${S}/><circle cx="50" cy="7" r="4" fill="#E4202A" ${S2}/>` + dots('M20 26c0-5 3-8 8-8h44c5 0 8 3 8 8v40c0 5-3 8-8 8H28c-5 0-8-3-8-8z', c) +
      `<rect x="10" y="38" width="10" height="16" rx="3" fill="${c}" ${S2}/><rect x="80" y="38" width="10" height="16" rx="3" fill="${c}" ${S2}/><rect x="28" y="32" width="18" height="14" rx="3" fill="#5BD3E8" ${S2}/><rect x="54" y="32" width="18" height="14" rx="3" fill="#5BD3E8" ${S2}/><circle cx="37" cy="39" r="3" fill="${K}"/><circle cx="63" cy="39" r="3" fill="${K}"/>` +
      `<rect x="32" y="54" width="36" height="10" rx="2" fill="${W}" ${S2}/><path d="M41 54v10M50 54v10M59 54v10" ${S2}/><path d="M30 74h40v14H30z" fill="${c}" ${S}/>`;
    case 'cat': return `<path d="M22 36 18 10l20 14zM78 36l4-26-20 14z" fill="${c}" ${S}/><path d="M24 30l-2-12 10 8zM76 30l2-12-10 8z" fill="#FF9ECB"/>` + dots('M50 20c24 0 34 16 34 34s-14 32-34 32-34-14-34-32 10-34 34-34z', c) +
      eye(38, 50, 6.5, 1) + eye(62, 50, 6.5, -1) + `<path d="M46 62h8l-4 4z" fill="#FF4FA0" ${S2}/><path d="M50 66q-4 6-9 3M50 66q4 6 9 3" fill="none" ${S2}/><path d="M28 62 8 58M28 67 9 70M72 62l20-4M72 67l19 3" ${S2}/>`;
    case 'girl': return `<path d="M18 50c-4-26 10-42 32-42s38 14 34 42c4 14 2 30-6 38-2-14-6-20-8-24H30c-2 4-6 10-8 24-8-8-8-24-4-38z" fill="${c}" ${S}/><path d="M26 30c6 6 14 4 22-6M52 24c8 10 16 12 24 8" fill="none" ${S2}/>` +
      dots('M30 40c0-8 8-14 20-14s20 6 20 14v14c0 14-10 24-20 24s-20-10-20-24z', '#FFD9B8') +
      `<path d="M34 44q6-4 12 0M54 44q6-4 12 0" fill="none" ${S2}/><path d="M36 50c2-3 8-3 10 0-2 3-8 3-10 0zM54 50c2-3 8-3 10 0-2 3-8 3-10 0z" fill="#1B4FCB" ${S2}/><path d="M35 48l-2-3M38 47l-1-3M65 48l2-3M62 47l1-3" ${S2}/>` +
      `<path d="M50 52l-3 10h5" fill="none" ${S2}/><path d="M42 68c4-3 12-3 16 0-4 4-12 4-16 0z" fill="#E4202A" ${S2}/><path d="M66 56c2 4 2 7 0 9-2-2-2-5 0-9z" fill="#BFE9FF" ${S2}/>`;
    case 'diver': return `<path d="M24 80c4-8 14-12 26-12s22 4 26 12v10H24z" fill="${c}" ${S}/>` + dots('M50 12a32 32 0 1 1 0 64 32 32 0 1 1 0-64z', c) +
      `<circle cx="50" cy="44" r="20" fill="#BFE9FF" ${S}/><circle cx="50" cy="44" r="20" fill="url(#bdW)"/>` + `<circle cx="22" cy="44" r="5" fill="${c}" ${S2}/><circle cx="78" cy="44" r="5" fill="${c}" ${S2}/>` +
      eye(43, 42, 4.5, 1) + eye(57, 42, 4.5, -1) + `<path d="M44 52q6 5 12 0" fill="none" ${S2}/><path d="M36 30a20 20 0 0 1 14-6" fill="none" stroke="${W}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return '';
}
function rays(fill, n = 16) {
  let p = ''; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = a + Math.PI / n; p += `M50 50L${(50 + Math.cos(a) * 80).toFixed(1)} ${(50 + Math.sin(a) * 80).toFixed(1)}L${(50 + Math.cos(b) * 80).toFixed(1)} ${(50 + Math.sin(b) * 80).toFixed(1)}z`; }
  return `<path d="${p}" fill="${fill}"/>`;
}
const RAR = id => id >= 96 ? 4 : [0, 0, 0, 1, 1, 2, 2, 3][id % 8]; // 0 N,1 R,2 SR,3 SSR,4 UR
const RNAME = ['N', 'R', 'SR', 'SSR', 'UR'];
const UR_SUB = ['shark', 'girl', 'robot', 'octo'];
function charSVG(id, opt = {}) {
  id = Math.max(0, Math.min(99, id | 0));
  let sub, v, c, bg, extra = '', r = RAR(id);
  if (id >= 96) { sub = UR_SUB[id - 96]; v = 7; c = '#FFC21A'; bg = '#E4202A'; }
  else { sub = SUBJ[(id / 8) | 0]; v = id % 8; c = PAL[sub][v]; bg = BGV[v]; }
  let back = `<rect width="100" height="100" fill="${bg}"/>`;
  if (r >= 2) back += rays(r >= 3 ? '#fff' : '#000', r >= 3 ? 18 : 14).replace('<path', `<path opacity="${r >= 3 ? .45 : .12}"`);
  back += `<rect width="100" height="100" fill="url(#${r === 4 ? 'bdW' : 'bdK'})" opacity=".8"/>`;
  // accessories by variant
  if (v === 4) extra += `<path d="M78 8l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="${W}" ${S2}/>`;
  if (v === 5) extra += `<g transform="translate(6 70) rotate(-12)"><rect width="34" height="16" rx="3" fill="${W}" ${S2}/><text x="17" y="12" text-anchor="middle" font-family="Bangers,Impact,sans-serif" font-size="12" fill="#E4202A">POP!</text></g>`;
  if (v === 6) extra += `<path d="M6 10l5 3-5 3M94 10l-5 3 5 3" fill="none" ${S2}/>`;
  if (r >= 3) extra += `<path d="M33 10l4-7 4 7 8 1-6 5 2 8-8-4-8 4 2-8-6-5z" fill="#FFD400" ${S2}/>`.replace('M33 10', 'M42 9');
  if (id >= 96) extra += `<g transform="translate(58 72) rotate(-10)"><path d="M0 8 6 0l4 6 7-6 2 8 9-3-4 8 8 3-9 3 4 8-9-3-2 8-7-6-4 6-6-8-8 2 3-8-6-4 7-3z" fill="#FFD400" ${S2}/><text x="14" y="20" text-anchor="middle" font-family="Bangers,Impact,sans-serif" font-size="9" fill="${K}">WOW</text></g>`;
  const sg = v === 3 && sub !== 'robot' && sub !== 'diver' && sub !== 'hammer' ? sunglasses(sub) : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="${opt.cls || 'chr'}">${back}<g>${body(sub, c)}</g>${sg}${extra}<rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="${K}" stroke-width="3"/></svg>`;
}
function sunglasses(sub) {
  const y = { shark: 50, octo: 42, puffer: 48, whale: 52, penguin: 32, crab: 22, squid: 48, cat: 50, girl: 50 }[sub] || 46;
  const xs = { shark: [72], whale: [32] }[sub] || [{ octo: 39, puffer: 38, penguin: 42, crab: 40, squid: 41, cat: 38, girl: 41 }[sub], { octo: 61, puffer: 62, penguin: 58, crab: 60, squid: 59, cat: 62, girl: 59 }[sub]];
  return `<g>${xs.map(x => `<rect x="${x - 8}" y="${y - 5}" width="16" height="10" rx="3" fill="${K}"/><path d="M${x - 5} ${y - 2}l4 0" stroke="${W}" stroke-width="1.6"/>`).join('')}${xs.length > 1 ? `<path d="M${xs[0] + 8} ${y - 2}H${xs[1] - 8}" stroke="${K}" stroke-width="2.4"/>` : ''}</g>`;
}

/* ---------------- backgrounds (home / game) ---------------- */
// each returns a CSS background value
const enc = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const BGS = [
  { id: 'dots', c: '#FFF3C4', css: () => `radial-gradient(circle, color-mix(in srgb, var(--red) 20%, transparent) 1.6px, transparent 1.9px) 0 0/12px 12px, var(--paper)` },
  { id: 'rays', c: '#FFD400', css: () => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${rays('#FFE45A', 24)}</svg>`) + ' center/cover, #FFD400' },
  { id: 'blue', c: '#5BD3E8', css: () => `radial-gradient(circle, rgba(27,79,203,.28) 2px, transparent 2.4px) 0 0/10px 10px, #8FE2F0` },
  { id: 'pink', c: '#FF9ECB', css: () => `radial-gradient(circle, rgba(255,255,255,.55) 2.4px, transparent 2.8px) 0 0/11px 11px, #FF7FBA` },
  { id: 'stripe', c: '#FFF3C4', css: () => `repeating-linear-gradient(-45deg, #FFF3C4 0 14px, #FFE07A 14px 28px)` },
  { id: 'city', c: '#1B4FCB', css: () => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice"><rect width="200" height="120" fill="#1B4FCB"/><g fill="#FFD400"><circle cx="160" cy="26" r="12" stroke="#000" stroke-width="2"/></g><path d="M0 120V70h18V50h14v20h10V40h22v80M64 120V58h16V30h20v28h12v62M112 120V64h22V46h18v18h14v56M166 120V74h34v46" fill="#0d2a73" stroke="#000" stroke-width="2"/><g fill="#FFD400">${[...Array(30)].map((_, i) => `<rect x="${8 + (i * 37) % 190}" y="${70 + (i * 13) % 44}" width="4" height="5"/>`).join('')}</g></svg>`) + ' bottom/cover, #1B4FCB' },
  { id: 'sea', c: '#5BD3E8', css: () => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" fill="#5BD3E8"/><path d="M0 20q15-10 30 0t30 0 30 0 30 0M0 44q15-10 30 0t30 0 30 0 30 0" fill="none" stroke="#1B4FCB" stroke-width="3"/><path d="M80 34l8-14 8 14z" fill="#7DA4B8" stroke="#000" stroke-width="2"/></svg>`) + ' 0 0/180px 90px' },
  { id: 'boom', c: '#E4202A', css: () => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${rays('#FF4A3D', 20)}</svg>`) + ' center/cover, #E4202A' },
];

/* ---------------- mascot & UI bits ---------------- */
const mascot = (mood = 'smile') => {
  const mouth = mood === 'wow' ? `<ellipse cx="74" cy="64" rx="7" ry="6" fill="${K}"/>` : `<path d="M60 63q13 8 27-2" fill="none" ${S}/><path d="M64 65l2.5 4 2.5-3.2 2.5 3.6 2.5-3.4 2.5 3.4 2.5-3.8 2.5 3" fill="${W}" ${S2}/>`;
  return `<svg viewBox="0 0 100 100" class="mascot"><path d="M15 60 3 45l4 16-4 15z" fill="#5B8FD8" ${S}/>${dots('M13 60C22 37 62 30 88 51c5 4 4 13-3 17-25 14-62 11-72-8z', '#5B8FD8')}<path d="M45 39 55 15l10 25z" fill="#5B8FD8" ${S}/><path d="M32 70c20 7 40 4 53-2-6 8-27 13-48 9z" fill="${W}" ${S2}/>${eye(72, 50, 6, 1)}${mouth}<path d="M53 50v8M57 49v9" ${S2}/></svg>`;
};
// comic burst behind a word
function burst(n = 12, r1 = 46, r2 = 32, fill = '#FFD400') {
  let p = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1 * (0.9 + ((i * 7) % 5) / 25); p += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (50 + Math.sin(a) * r * .8).toFixed(1); }
  return `<svg viewBox="0 0 100 100" class="burst" preserveAspectRatio="none"><path d="${p}z" style="fill:${fill};stroke:var(--ink,#000)" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
const ICON = {
  daily: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 12.5l1.1 2.2 2.4.3-1.7 1.6.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.6 2.4-.3z" fill="currentColor"/></svg>',
  stage: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8" fill="currentColor"/><rect x="3" y="13" width="8" height="8" fill="currentColor"/><rect x="13" y="13" width="8" height="8"/></svg>',
  action: '<svg viewBox="0 0 24 24"><path d="M14 2 5 13.5h6L9.5 22 19 10h-6z" fill="currentColor"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3M9 20h6M10 16h4v4h-4z"/></svg>',
  gacha: '<svg viewBox="0 0 24 24"><path d="M6 3h12l-1 8H7z"/><circle cx="12" cy="7" r="1.6" fill="currentColor"/><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M10 15h4M12 15v3"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h7v16H4zM13 4h7v16h-7z"/><path d="M6.5 8h2M15.5 8h2"/></svg>',
  rank: '<svg viewBox="0 0 24 24"><path d="M3 21V12h5v9M9.5 21V6h5v15M16 21v-6h5v6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.5M12 16.8v.2"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -5)"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="off" d="M16 9l6 6M22 9l-6 6"/></svg>',
  coin: '<svg viewBox="0 0 24 24" class="coin"><circle cx="12" cy="12" r="9" fill="#FFD400" stroke="#000" stroke-width="2.2"/><path d="M12 7v10M9.5 9.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M4 9h16l-1 12H5z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/></svg>',
};
// theme emblems (stage themes) — small block-ish pictograms
const THEME_ICON = {
  cl: `<svg viewBox="0 0 40 40"><rect x="4" y="20" width="16" height="16" fill="${BC[0]}" ${S2}/><rect x="20" y="20" width="16" height="16" fill="${BC[0]}" ${S2}/><rect x="20" y="4" width="16" height="16" fill="${BC[1]}" ${S2}/></svg>`,
  tr: `<svg viewBox="0 0 40 40"><rect x="2" y="14" width="12" height="12" fill="${BC[2]}" ${S2}/><rect x="14" y="14" width="12" height="12" fill="${BC[2]}" ${S2}/><rect x="26" y="14" width="12" height="12" fill="${BC[2]}" ${S2}/><text x="20" y="11" text-anchor="middle" font-family="Bangers,Impact" font-size="10">x3</text></svg>`,
  rk: `<svg viewBox="0 0 40 40"><use href="#emRock" x="4" y="4" width="32" height="32"/></svg>`,
  ic: `<svg viewBox="0 0 40 40"><rect x="6" y="6" width="28" height="28" fill="#BFE9FF" ${S2}/><path d="M10 14l8 6-4 8M24 10l2 10 6 4" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M10 14l8 6-4 8M24 10l2 10 6 4" fill="none" stroke="#5B8FD8" stroke-width="1"/></svg>`,
  bm: `<svg viewBox="0 0 40 40"><use href="#emBomb" x="2" y="2" width="36" height="36"/></svg>`,
  wd: `<svg viewBox="0 0 40 40"><use href="#emWild" x="2" y="4" width="36" height="36"/></svg>`,
  pt: `<svg viewBox="0 0 40 40"><use href="#emPaint" x="3" y="3" width="34" height="34"/></svg>`,
  mx: `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="15" height="15" fill="${BC[4]}" ${S2}/><rect x="21" y="21" width="15" height="15" fill="${BC[3]}" ${S2}/><use href="#emBomb" x="20" y="2" width="17" height="17"/><use href="#emRock" x="3" y="21" width="17" height="17"/></svg>`,
};
window.SameArt = { BC, BC_LT, syncPalette, SPRITE, charSVG, RAR, RNAME, BGS, mascot, burst, ICON, THEME_ICON, CHAR_N: 100, SUBJ };
})();
