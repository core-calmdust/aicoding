/* atlas/skins-fx.js — the moving parts of the SSR / UR skins (2026-11-20 ユーザー：UR・SSRは画面全体で意味を感じる動きに).
   Loaded by atlas/skins.js only while such a skin is worn. Every scene has its own motion (clouds drift, the train runs,
   the gondola glides, fish swim, balloons rise, leaves fall, the night fair's wheel turns and fireworks go up …).
   Layout: a "stage" div in the picture's own grid (1920×1200; the portrait picture is 1920×3000 with the scene at
   y 1800), scaled and placed exactly like the CSS background (cover · the skin's focus across · bottom edge), so a
   piece put at grid x/y sits on the right spot of the picture on any window; a "screen" div for what fills the window
   (falling snow, petals, twinkles). Only transform / opacity (and a few offset-path / stroke) animate. */
(function () {
  'use strict';
  const rnd = seed => { seed = (Math.imul(seed + 1, 2654435761) >>> 0) % 2147483646 + 1; const f = () => (seed = (seed * 16807) % 2147483647) / 2147483647; f(); f(); return f; };   // (mixed + warmed up: neighbouring seeds no longer start alike)
  const f1 = v => (+v).toFixed(1);

  /* ---------------- pieces (flat SVG, same style as the pictures) ---------------- */
  const CLOUD = (c = '#ffffff', sh = '#e3edf6') => { const L = [[-55, 2, 30], [-20, -20, 42], [25, -12, 38], [58, 4, 28]];
    const sh_ = dy => L.map(([x, y, r]) => `<circle cx="${x}" cy="${y + dy}" r="${r}"/>`).join('') + `<rect x="-82" y="${-2 + dy}" width="168" height="30" rx="15"/>`;
    return `<svg viewBox="-90 -64 180 104"><g fill="${sh}">${sh_(6)}</g><g fill="${c}">${sh_(0)}</g></svg>`; };
  const BIRD = c => `<svg viewBox="-30 -16 60 32"><g class="fl"><path d="M-28 -2 Q-14 -15 0 1 Q14 -15 28 -2 Q14 -6 0 5 Q-14 -6 -28 -2 Z" fill="${c}"/></g></svg>`;
  const GULL = () => `<svg viewBox="-40 -18 80 36"><g class="fl"><path d="M-38 -4 Q-22 -16 -4 0 L0 4 L4 0 Q22 -16 38 -4 Q22 -8 4 6 L0 8 L-4 6 Q-22 -8 -38 -4 Z" fill="#ffffff"/><path d="M-38 -4 Q-34 -7 -30 -6 L-32 -3 Z M38 -4 Q34 -7 30 -6 L32 -3 Z" fill="#9aa6b8"/></g></svg>`;
  const SAIL = (h = '#f8f6f0', s1 = '#ffffff', s2 = '#f2c8b8') => `<svg viewBox="-50 -110 100 140"><path d="M-40 0 L40 0 L28 24 L-28 24 Z" fill="${h}"/><path d="M0 0 L0 -100 L-40 -8 Z" fill="${s1}"/><path d="M4 -88 L4 -8 L36 -8 Z" fill="${s2}"/><rect x="-1" y="-104" width="4" height="106" fill="#c9a77e"/></svg>`;
  const BALLOON = (c1, c2) => `<svg viewBox="-92 -72 184 244"><path d="M-90 0 C-90 -70 90 -70 90 0 C90 50 40 80 26 110 L-26 110 C-40 80 -90 50 -90 0 Z" fill="${c1}"/><path d="M-30 -52 C-30 -10 -16 70 -10 110 L10 110 C16 70 30 -10 30 -52 C20 -60 -20 -60 -30 -52 Z" fill="${c2}"/><path d="M-24 110 L-20 140 M24 110 L20 140" stroke="#b08a6a" stroke-width="3"/><rect x="-24" y="138" width="48" height="30" rx="5" fill="#c9a07a"/></svg>`;
  const TOYBALLOON = c => `<svg viewBox="-34 -40 68 220"><path d="M0 44 C6 80 -6 120 4 170" fill="none" stroke="#c9b9da" stroke-width="2"/><ellipse cx="0" cy="0" rx="30" ry="36" fill="${c}"/><path d="M-5 34 L5 34 L0 44 Z" fill="${c}"/><ellipse cx="-10" cy="-12" rx="7" ry="10" fill="#ffffff" opacity=".45"/></svg>`;
  const FISH = c => `<svg viewBox="-64 -40 144 80"><path d="M-60 0 C-40 -36 20 -36 40 0 C20 36 -40 36 -60 0 Z" fill="${c}"/><path d="M36 0 L76 -30 L68 0 L76 30 Z" fill="${c}" class="tl"/><circle cx="-34" cy="-6" r="6" fill="#ffffff"/><circle cx="-34" cy="-6" r="3" fill="#4a5a6a"/><path d="M-12 -24 C-4 -8 -4 8 -12 24" fill="none" stroke="#ffffff" stroke-width="5" opacity=".6"/></svg>`;
  const MANTA = () => `<svg viewBox="-120 -60 240 210"><g class="mf"><path d="M0 -46 C20 -40 40 -20 110 -6 C70 8 36 20 14 40 L0 46 L-14 40 C-36 20 -70 8 -110 -6 C-40 -20 -20 -40 0 -46 Z" fill="#b9c9de"/><circle cx="-12" cy="-26" r="3.5" fill="#5a6a7a"/><circle cx="12" cy="-26" r="3.5" fill="#5a6a7a"/></g><path d="M0 44 C4 80 14 110 28 140" fill="none" stroke="#b9c9de" stroke-width="5" stroke-linecap="round"/></svg>`;
  const BUBBLE = () => `<svg viewBox="-12 -12 24 24"><circle r="9" fill="none" stroke="#ffffff" stroke-width="2.6" opacity=".75"/><circle cx="-3" cy="-3" r="2.4" fill="#ffffff" opacity=".7"/></svg>`;
  const BUTTERFLY = (c, c2) => `<svg viewBox="-30 -26 60 52"><g class="fw"><path d="M0 0 C-10 -24 -30 -26 -28 -8 C-26 4 -12 6 0 0 Z M0 0 C-12 6 -24 18 -14 24 C-6 26 -2 14 0 0 Z" fill="${c}"/></g><g class="fw2"><path d="M0 0 C10 -24 30 -26 28 -8 C26 4 12 6 0 0 Z M0 0 C12 6 24 18 14 24 C6 26 2 14 0 0 Z" fill="${c2 || c}"/></g><rect x="-2" y="-12" width="4" height="26" rx="2" fill="#7a6a6a"/></svg>`;
  const SWAN = () => `<svg viewBox="-60 -70 120 100"><path d="M-46 10 C-46 -12 -10 -18 20 -8 C34 -4 46 4 50 12 C30 24 -30 26 -46 10 Z" fill="#ffffff"/><path d="M20 -8 C16 -30 20 -52 32 -58 C42 -62 50 -56 50 -48 L60 -46 L50 -42 C40 -44 34 -40 32 -30 C30 -20 34 -10 38 -4 Z" fill="#ffffff"/><path d="M50 -48 L60 -46 L50 -42 Z" fill="#f6b37a"/><circle cx="44" cy="-50" r="2.4" fill="#4a5060"/><path d="M-30 8 C-10 -4 14 -2 30 6" fill="none" stroke="#e3ecf4" stroke-width="5" stroke-linecap="round"/></svg>`;
  const GONDOLA = () => `<svg viewBox="740 1010 410 130"><path d="M760 1110 C840 1130 1040 1130 1120 1106 C1110 1098 1090 1100 1080 1104 C1000 1118 880 1118 790 1100 C780 1096 768 1098 760 1110 Z" fill="#5f6a86"/><path d="M1112 1106 C1124 1094 1130 1080 1132 1068 L1138 1068 C1136 1084 1130 1098 1118 1110 Z" fill="#5f6a86"/><rect x="930" y="1074" width="60" height="22" rx="6" fill="#e9b3a4"/><g class="oar"><path d="M840 1104 L870 1020 L876 1022 L848 1106 Z" fill="#c9a77e"/></g><circle cx="860" cy="1048" r="13" fill="#f6dfc8"/><rect x="845" y="1060" width="30" height="40" rx="8" fill="#f2f0ea"/><path d="M845 1068 L875 1068 L875 1074 L845 1074 Z" fill="#9fbde0"/><rect x="846" y="1034" width="28" height="7" rx="3" fill="#e9c47a"/></svg>`;
  const BATEAU = () => `<svg viewBox="-110 -40 220 60"><path d="M-100 0 L100 0 L86 18 L-90 18 Z" fill="#fbf6ee"/><rect x="-70" y="-26" width="130" height="26" rx="8" fill="#e9eef6"/><rect x="-60" y="-20" width="110" height="10" rx="4" fill="#c9dcef"/><path d="M-100 0 L100 0 L98 6 L-98 6 Z" fill="#c9b9da"/></svg>`;
  const TRAIN = () => { const car = (x, c) => `<rect x="${x}" y="760" width="180" height="90" rx="12" fill="${c}"/><rect x="${x - 4}" y="746" width="188" height="18" rx="9" fill="#fbf6ec"/>` + [0, 1, 2].map(i => `<rect x="${x + 18 + i * 52}" y="778" width="36" height="30" rx="6" fill="#fbfaf6"/>`).join('') + `<g class="wh"><circle cx="${x + 40}" cy="852" r="16" fill="#8a95ab"/><circle cx="${x + 140}" cy="852" r="16" fill="#8a95ab"/></g>`;
    const X = 620; return `<svg viewBox="600 700 800 172">${car(850, '#bcd6ec')}${car(1040, '#f6dca0')}${car(1230, '#cfe3c6')}<rect x="${X}" y="720" width="70" height="130" rx="10" fill="#f2b8a8"/><rect x="${X + 66}" y="770" width="150" height="80" rx="38" fill="#f2b8a8"/><rect x="${X + 170}" y="720" width="26" height="54" rx="6" fill="#e9a596"/><rect x="${X + 162}" y="710" width="42" height="16" rx="6" fill="#e9a596"/><rect x="${X + 12}" y="740" width="46" height="36" rx="6" fill="#fbfaf6"/><rect x="${X - 6}" y="706" width="82" height="18" rx="8" fill="#e9a596"/><g class="wh"><circle cx="${X + 30}" cy="846" r="26" fill="#8a95ab"/><circle cx="${X + 110}" cy="852" r="18" fill="#8a95ab"/><circle cx="${X + 170}" cy="852" r="18" fill="#8a95ab"/></g></svg>`; };
  const CAMEL = () => `<svg viewBox="1496 970 176 94"><path d="M1500 1010 C1520 980 1560 980 1570 1000 C1580 970 1610 975 1615 995 L1640 990 C1652 975 1668 980 1664 996 L1650 1004 L1652 1060 L1640 1060 L1636 1020 L1580 1022 L1576 1060 L1564 1060 L1562 1022 L1530 1024 L1526 1060 L1514 1060 L1512 1024 Z" fill="#d9b48a"/></svg>`;
  const PENGUIN = () => `<svg viewBox="-50 -86 100 124"><path d="M0 -80 C26 -80 36 -50 36 -20 C36 10 26 30 0 30 C-26 30 -36 10 -36 -20 C-36 -50 -26 -80 0 -80 Z" fill="#5f6a86"/><path d="M0 -50 C18 -50 24 -26 24 -6 C24 16 14 26 0 26 C-14 26 -24 16 -24 -6 C-24 -26 -18 -50 0 -50 Z" fill="#fbfcfd"/><path d="M-14 -62 C-14 -72 14 -72 14 -62 C14 -52 -14 -52 -14 -62 Z" fill="#fbfcfd" opacity=".9"/><circle cx="-7" cy="-62" r="3" fill="#3a4258"/><circle cx="7" cy="-62" r="3" fill="#3a4258"/><path d="M-6 -54 L6 -54 L0 -46 Z" fill="#f6c27e"/><path d="M-36 -24 C-48 -6 -46 10 -40 16 C-36 0 -34 -12 -30 -20 Z M36 -24 C48 -6 46 10 40 16 C36 0 34 -12 30 -20 Z" fill="#5f6a86"/><path d="M-16 28 L-4 28 L-6 34 L-20 34 Z M4 28 L16 28 L20 34 L6 34 Z" fill="#f6c27e"/><circle cx="-14" cy="-44" r="4" fill="#f6c2c8" opacity=".7"/><circle cx="14" cy="-44" r="4" fill="#f6c2c8" opacity=".7"/></svg>`;
  const TAIL = () => `<svg viewBox="-60 -70 120 110"><path d="M0 40 C-4 10 -6 -10 0 -20 C-20 -40 -50 -46 -58 -60 C-30 -58 -10 -50 0 -36 C10 -50 30 -58 58 -60 C50 -46 20 -40 0 -20 C6 -10 4 10 0 40 Z" fill="#7d8fae"/></svg>`;
  const LEAF = c => `<svg viewBox="-20 -20 40 40"><path d="M0 18 L0 6 M0 -18 L4 -8 L14 -12 L10 -2 L18 4 L8 6 L10 14 L2 8 L0 18 L-2 8 L-10 14 L-8 6 L-18 4 L-10 -2 L-14 -12 L-4 -8 Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  const PETAL = c => `<svg viewBox="-12 -16 24 32"><path d="M0 14 C-12 4 -11 -10 -4 -15 C-2 -12 2 -12 4 -15 C11 -10 12 4 0 14 Z" fill="${c}"/></svg>`;
  const DOT = c => `<svg viewBox="-10 -10 20 20"><circle r="9" fill="${c}"/></svg>`;
  const gid = c => c.replace(/[^0-9a-z]/gi, '');
  const TW = c => `<svg viewBox="-10 -10 20 20"><defs><radialGradient id="t${gid(c)}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".25" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><linearGradient id="th${gid(c)}"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient><linearGradient id="tv${gid(c)}" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><circle r="10" fill="url(#t${gid(c)})"/><rect x="-10" y="-.55" width="20" height="1.1" fill="url(#th${gid(c)})"/><rect x="-.55" y="-10" width="1.1" height="20" fill="url(#tv${gid(c)})"/><circle r="1.6" fill="#ffffff"/></svg>`;
  const SOFT = c => `<svg viewBox="-10 -10 20 20"><defs><radialGradient id="s${gid(c)}"><stop offset="0" stop-color="${c}"/><stop offset=".35" stop-color="${c}" stop-opacity=".6"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle r="10" fill="url(#s${gid(c)})"/></svg>`;
  const GLOW = c => `<svg viewBox="-50 -50 100 100"><defs><radialGradient id="g${gid(c)}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset=".35" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle r="50" fill="url(#g${gid(c)})"/></svg>`;
  const FLAG = c => `<svg viewBox="-30 0 60 66"><path d="M-30 0 L30 0 L30 54 L20 64 L10 54 L0 64 L-10 54 L-20 64 L-30 54 Z" fill="${c}"/><circle cx="0" cy="24" r="9" fill="#fbf6ee"/><path d="M-20 12 l6 6 l-6 6 l-6 -6 Z M20 12 l6 6 l-6 6 l-6 -6 Z" fill="#fbf6ee"/></svg>`;
  const JELLY = (c, c2) => { const k = gid(c); return `<svg viewBox="-60 -60 120 220"><defs><radialGradient id="j${k}"><stop offset="0" stop-color="${c}" stop-opacity=".6"/><stop offset=".5" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><radialGradient id="jb${k}" cx=".5" cy=".75" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".45" stop-color="${c}" stop-opacity=".75"/><stop offset="1" stop-color="${c}" stop-opacity=".35"/></radialGradient><linearGradient id="jt${k}" x2="0" y2="1"><stop offset="0" stop-color="${c2}" stop-opacity=".75"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient></defs><circle cx="0" cy="0" r="60" fill="url(#j${k})"/><g class="tn">${[-20, -8, 4, 16].map(x => `<path d="M${x} 10 C${x - 8} 50 ${x + 10} 90 ${x - 4} 150" fill="none" stroke="url(#jt${k})" stroke-width="3.5" stroke-linecap="round"/>`).join('')}</g><g class="bl"><path d="M-38 10 C-38 -30 38 -30 38 10 C26 18 14 6 0 14 C-14 6 -26 18 -38 10 Z" fill="url(#jb${k})"/></g></svg>`; };
  const LANTERN = () => `<svg viewBox="-40 -40 80 104"><defs><radialGradient id="lg"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".7"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient><linearGradient id="lb" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".75" stop-color="#ffb46a"/><stop offset="1" stop-color="#ff8f4a"/></linearGradient></defs><circle cy="14" r="40" fill="url(#lg)"/><path d="M-15 -12 C-15 -17 15 -17 15 -12 L19 36 C19 40 -19 40 -19 36 Z" fill="url(#lb)"/><ellipse cy="34" rx="9" ry="4" fill="#fff2c8"/></svg>`;
  const NTRAIN = () => `<svg viewBox="-230 -40 460 70"><g fill="#2b2460">${[-200, -100, 0, 100].map(x => `<rect x="${x}" y="-20" width="92" height="40" rx="10"/>`).join('')}<path d="M110 -20 L160 -20 C190 -20 200 0 200 20 L110 20 Z"/><rect x="150" y="-36" width="16" height="18" rx="3"/></g><g fill="#ffe9a6">${[-200, -100, 0, 100].map(x => [0, 1, 2].map(i => `<rect x="${x + 10 + i * 27}" y="-12" width="18" height="14" rx="3"/>`).join('')).join('')}<circle cx="196" cy="6" r="6"/></g></svg>`;
  const SHIP = () => `<svg viewBox="-60 -80 120 100"><path d="M-46 0 L46 0 L34 18 L-34 18 Z" fill="#9b6e3a"/><path d="M-4 0 L-4 -70 L-36 -6 Z" fill="#f4e8cf"/><path d="M4 -76 L4 -6 L40 -6 Z" fill="#f4e8cf"/><rect x="-2" y="-78" width="4" height="80" fill="#8a6a3c"/><path d="M2 -78 L18 -72 L2 -66 Z" fill="#d98c6a"/></svg>`;
  const PIN = () => `<svg viewBox="-20 -44 40 48"><path d="M0 2 C-4 -10 -16 -18 -16 -28 A16 16 0 0 1 16 -28 C16 -18 4 -10 0 2 Z" fill="#d9745e"/><circle cx="0" cy="-28" r="6" fill="#fbf2e2"/></svg>`;
  const FW = c => `<svg viewBox="-60 -60 120 120">${Array.from({ length: 18 }, (_, k) => { const t = k * Math.PI / 9; return `<line x1="${f1(16 * Math.cos(t))}" y1="${f1(16 * Math.sin(t))}" x2="${f1(48 * Math.cos(t))}" y2="${f1(48 * Math.sin(t))}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${f1(54 * Math.cos(t))}" cy="${f1(54 * Math.sin(t))}" r="3.2" fill="${c}"/>`; }).join('')}<circle r="6" fill="${c}"/></svg>`;

  /* ---------------- builders: a piece in the grid / on the screen ---------------- */
  // p(svg, x, y, w, h, cls, vars, inner) — x / y the piece's centre in the grid; vars → CSS custom properties
  const st = v => Object.entries(v || {}).map(([k, x]) => `--${k}:${typeof x === 'number' ? (/^(d|dl)$/.test(k) ? x + 's' : x + 'px') : x}`).join(';');
  const p = (svg, x, y, w, h, cls = '', v = {}, ic = '') => `<i class="pc ${cls}" style="left:${f1(x - w / 2)}px;top:${f1(y - h / 2)}px;width:${f1(w)}px;height:${f1(h)}px;${st(v)}">${ic ? `<b class="${ic}">${svg}</b>` : svg}</i>`;
  const sc = (svg, l, t, w, cls = '', v = {}, ic = '') => `<i class="sp ${cls}" style="left:${f1(l)}%;top:${f1(t)}%;width:${f1(w)}px;height:${f1(w)}px;${st(v)}">${ic ? `<b class="${ic}">${svg}</b>` : svg}</i>`;
  // drifting clouds across the sky: n clouds in a y band; tall: also in the portrait picture's extra sky
  function clouds(T, seed, n, y0, y1, c, sh, speed = 1) {
    const r = rnd(seed); let h = ''; const band = T ? [y0 - 1800, y1] : [y0, y1], N = T ? Math.round(n * 2.4) : n;
    for (let i = 0; i < N; i++) { const y = band[0] + r() * (band[1] - band[0]), s = .55 + r() * .75, d = (120 + r() * 80) / speed / (.6 + s * .5);
      h += p(CLOUD(c, sh), 0, y, 180 * s, 104 * s, 'a-drift', { x0: -260, x1: 2180, d: +d.toFixed(1), dl: +(-r() * d).toFixed(1) }); }
    return h;
  }
  function birds(seed, n, y, c = '#7d8aa0', dur = 34, delay = 0, s = 1, dir = 1) {
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const dx = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 26, dy = Math.ceil(i / 2) * 18;
      h += p(BIRD(c), 0, y + dy + r() * 6, 36 * s, 20 * s, 'a-drift', { x0: dir > 0 ? -200 - Math.abs(dx) : 2120 + Math.abs(dx), x1: dir > 0 ? 2120 + Math.abs(dx) : -200 - Math.abs(dx), d: dur, dl: delay - Math.abs(dx) / 80 }, 'a-fly'); }
    return h;
  }
  function falling(n, shape, cols, seed, size = [12, 22], dur = [14, 26], sway = 60) {
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]), d = dur[0] + r() * (dur[1] - dur[0]);
      h += sc(shape(cols[i % cols.length]), r() * 100, -8, s, 'a-fall', { sw: Math.round((r() - .5) * 2 * sway), rt: `${Math.round((r() < .5 ? -1 : 1) * (200 + r() * 300))}deg`, d: +d.toFixed(1), dl: +(-r() * d).toFixed(1) }, 'a-sway'); }
    return h;
  }
  function twinkles(n, cols, seed, t0 = 0, t1 = 100, size = [8, 18], dur = [2.4, 5]) {
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]), d = dur[0] + r() * (dur[1] - dur[0]);
      h += sc(TW(cols[i % cols.length]), r() * 100, t0 + r() * (t1 - t0), s, 'a-tw', { d: +d.toFixed(2), dl: +(-r() * 8).toFixed(2) }); }
    return h;
  }
  function gtwinkles(n, cols, seed, x0, y0, x1, y1, size = [10, 22], dur = [2.4, 5]) {   // twinkles in a grid box
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]), d = dur[0] + r() * (dur[1] - dur[0]);
      h += p(TW(cols[i % cols.length]), x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s, s, 'a-tw', { d: +d.toFixed(2), dl: +(-r() * 8).toFixed(2) }); }
    return h;
  }
  const shooting = (n, seed, cyc = 9) => { const r = rnd(seed); let h = ''; for (let i = 0; i < n; i++) h += `<i class="sp a-shoot" style="left:${f1(25 + r() * 70)}%;top:${f1(r() * 40)}%;--d:${f1(cyc + r() * 4)}s;--dl:${f1(i * cyc / n + r())}s"></i>`; return h; };
  const motes = (n, c, seed, x0, y0, x1, y1) => { const r = rnd(seed); let h = ''; for (let i = 0; i < n; i++) h += p(SOFT(c), x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 12 + r() * 14, 12 + r() * 14, 'a-mote', { d: +(10 + r() * 12).toFixed(1), dl: +(-r() * 20).toFixed(1) }); return h; };
  const ripples = (seed, n, x0, y0, x1, y1, c, w = [60, 160]) => { const r = rnd(seed); let h = ''; for (let i = 0; i < n; i++) { const ww = w[0] + r() * (w[1] - w[0]);
      h += `<i class="pc a-rip" style="left:${f1(x0 + r() * (x1 - x0))}px;top:${f1(y0 + r() * (y1 - y0))}px;width:${f1(ww)}px;height:6px;border-radius:3px;background:linear-gradient(90deg,transparent,${c},transparent);--d:${f1(5 + r() * 5)}s;--dl:${f1(-r() * 10)}s"></i>`; } return h; };
  const glints = (seed, n, x0, y0, x1, y1, c = '#ffffff') => gtwinkles(n, [c], seed, x0, y0, x1, y1, [10, 20], [2, 4]);

  /* ---------------- the scenes ---------------- */
  const S = {
    // ---- SSR ----
    s25: T => clouds(T, 25, 9, 80, 820, '#ffffff', '#dcebf6', 1.2) + birds(251, 5, 300, '#6f87a6', 40, -6) + birds(252, 3, 520, '#6f87a6', 52, -30, .8),
    s26: T => p(GLOW('#ffe6b0'), 1180, 760, 520, 520, 'a-pulse', { d: 6 }) + clouds(T, 26, 6, 120, 600, '#fbe2e6', '#efc6d2', .7) + birds(261, 7, 560, '#9a6a7e', 46, -10) + birds(262, 3, 420, '#9a6a7e', 60, -38, .8),
    s27: T => clouds(T, 27, 7, 80, 560, '#ffffff', '#dcebf6') + p(SAIL(), 0, 620, 70, 98, 'a-drift', { x0: -100, x1: 2020, d: 140, dl: -40 }, 'a-bob')
      + `<i class="pc a-wave" style="left:-40px;top:930px;width:2000px;height:40px"><svg viewBox="0 0 2000 40" preserveAspectRatio="none"><path d="M0 20 C200 0 400 40 600 20 C800 0 1000 40 1200 20 C1400 0 1600 40 1800 20 C1900 10 1950 18 2000 20 L2000 40 L0 40 Z" fill="#ffffff" opacity=".8"/></svg></i>`
      + glints(271, 22, 0, 660, 1920, 900, '#ffffff') + [[400, 300, 30], [700, 380, 38], [1500, 260, 34]].map(([x, y, d], i) => p(GULL(), 0, y, 56, 26, 'a-drift', { x0: -100, x1: 2020, d, dl: -i * 11 }, 'a-glide')).join(''),
    s28: T => clouds(T, 28, 5, 80, 500, '#ffffff', '#dde8f3', .6) + falling(46, DOT, ['#ffffff'], 28, [5, 11], [12, 24], 90) + [0, 1, 2, 3, 4].map(i => p(CLOUD('#f4f6f9', '#e3e9f1'), 1521, 834, 40, 24, 'a-smoke', { d: 7, dl: -i * 1.4 })).join(''),
    s29: T => clouds(T, 29, 6, 80, 600, '#ffffff', '#e2eef4') + [['#fbc6d4', '#f6a8bd', 700, 760], ['#ffe08a', '#f6cf62', 400, 900], ['#d4c8f6', '#bfb0ee', 1300, 820], ['#bfe3f7', '#a3d2f0', 1600, 960], ['#ffcfae', '#f6b48a', 1000, 1000]].map(([c, c2, x, y], i) =>
      `<i class="pc a-path" style="left:0;top:0;width:44px;height:38px;offset-path:path('M${x} ${y} c120 -80 260 40 140 120 c-120 80 -300 -20 -200 -140 c80 -90 220 -40 60 20 z');--d:${16 + i * 3}s;--dl:${-i * 4}s"><b class="a-flut">${BUTTERFLY(c, c2)}</b></i>`).join(''),
    s30: T => p(GLOW('#fff1c8'), 520, 420, 360, 360, 'a-pulse', { d: 7 }) + [0, 1, 2].map(i => p(CAMEL(), 0, 828 - i * 4, 176, 94, 'a-drift', { x0: -220 - i * 190, x1: 2140 - i * 190, d: 120, dl: -30 }, 'a-walk')).join('')
      + Array.from({ length: 10 }, (_, i) => `<i class="pc a-wisp" style="left:${(i * 197) % 1900}px;top:${880 + (i * 53) % 260}px;width:${160 + (i * 37) % 120}px;height:3px;--d:${4 + i % 4}s;--dl:${-i * .7}s"></i>`).join(''),
    s31: T => clouds(T, 31, 6, 80, 420, '#ffffff', '#dfeaf2', .6) + p(SWAN(), 0, 890, 96, 80, 'a-drift', { x0: -100, x1: 2020, d: 160, dl: -60 }, 'a-bob') + p(SWAN(), 0, 950, 72, 60, 'a-drift', { x0: 2020, x1: -100, d: 190, dl: -20 }, 'a-bob flip')
      + ripples(311, 16, 0, 790, 1920, 1060, 'rgba(255,255,255,.55)') + `<i class="pc a-mist" style="left:-200px;top:740px;width:2400px;height:60px"></i>` + birds(312, 5, 280, '#7d8aa0', 44, -8),
    s33: T => twinkles(T ? 70 : 46, ['#fff6dc', '#dff0ff'], 33, 0, 75, [6, 14]) + shooting(4, 33, 10) + p(GLOW('#fdf0c8'), 1460, 300, 420, 420, 'a-pulse', { d: 8 }) + motes(14, '#fff1a6', 331, 140, 860, 1100, 1060),
    s79: T => clouds(T, 79, 7, 80, 640, '#ffffff', '#ecdfee') + birds(791, 5, 420, '#9a8fb2', 40, -12) + p(BATEAU(), 0, 1072, 180, 50, 'a-drift', { x0: 2050, x1: -150, d: 70, dl: -20 }) + ripples(792, 10, 0, 1050, 1920, 1180, 'rgba(255,255,255,.7)'),
    s80: T => clouds(T, 80, 6, 80, 520, '#ffffff', '#e3edf6') + p(GONDOLA(), 0, 1075, 410, 130, 'a-drift', { x0: 2100, x1: -260, d: 64, dl: -26 }, 'a-bob') + ripples(801, 14, 0, 1000, 1920, 1190, 'rgba(255,255,255,.6)') + birds(802, 4, 360, '#8a96aa', 36, -5),
    s81: T => clouds(T, 81, 6, 80, 500, '#ffffff', '#dcebf6') + p(SAIL('#f8f6f0', '#ffffff', '#a9c8e6'), 0, 860, 80, 112, 'a-drift', { x0: 2020, x1: 760, d: 90, dl: -30 }, 'a-bob') + glints(811, 26, 820, 780, 1920, 1180)
      + [[500, 360, 32], [900, 300, 40]].map(([x, y, d], i) => p(GULL(), 0, y, 56, 26, 'a-drift', { x0: 2020, x1: -100, d, dl: -i * 14 }, 'a-glide')).join(''),
    s82: T => clouds(T, 82, 5, 80, 440, '#ffffff', '#f1e2d8', .6) + falling(26, LEAF, ['#f0a58a', '#f5c27e', '#eb9a8e', '#e98a74'], 82, [18, 30], [16, 28], 120),
    s83: T => clouds(T, 83, 6, 80, 460, '#ffffff', '#e3edf6') + p(SAIL('#f2b8a8', '#fbfaf6', '#fbfaf6'), 360, 970, 140, 196, '', {}, 'a-bob') + p(SAIL('#bcd6ec', '#fbfaf6', '#fbfaf6'), 1320, 970, 140, 196, '', {}, 'a-bob b2')
      + [[300, 240], [1100, 300], [1600, 220]].map(([x, y], i) => `<i class="pc a-path" style="left:0;top:0;width:56px;height:26px;offset-path:path('M${x} ${y} c200 -60 300 60 120 120 c-160 50 -320 -60 -120 -120 z');--d:${18 + i * 4}s;--dl:${-i * 5}s"><b class="a-glide">${GULL()}</b></i>`).join('') + ripples(831, 12, 0, 940, 1920, 1190, 'rgba(255,255,255,.6)'),
    s84: T => p(GLOW('#fde6b0'), 1480, 300, 400, 400, 'a-pulse', { d: 7 }) + [0, 1, 2].map(i => p(CAMEL(), 0, 1020 - i * 6, 176, 94, 'a-drift', { x0: 2100 + i * 200, x1: -260 + i * 200, d: 150, dl: -50 }, 'a-walk flip')).join('') + birds(841, 5, 440, '#b08a6a', 46, -14) + ripples(842, 8, 0, 990, 760, 1180, 'rgba(255,255,255,.6)'),
    s85: T => clouds(T, 85, 6, 80, 480, '#ffffff', '#e3edf6') + p(WHEEL_D(), 1560, 640, 640, 640, '', {}, 'a-spin s60')
      + ['#f6b8c2', '#a9c8e6', '#f6d79a', '#a9d3bb', '#d9c8ef'].map((c, i) => p(TOYBALLOON(c), 820 + (i % 3) * 40, 650, 54, 176, 'a-rise', { rx: (i % 2 ? 140 : -100), ry: -1100, d: 16, dl: -i * 3.2 })).join('')
      + Array.from({ length: 18 }, (_, i) => { const x = 580 + i * 34, y = 770 + 20 * Math.sin(i / 17 * Math.PI * 1.6); return `<i class="pc a-flag" style="left:${x}px;top:${f1(y)}px;width:22px;height:26px;--dl:${-(i % 5) * .3}s"><svg viewBox="0 0 22 26"><path d="M0 0 L22 0 L11 26 Z" fill="${['#f6b8c2', '#f6d79a', '#a9d3bb', '#a9c8e6'][i % 4]}"/></svg></i>`; }).join(''),
    s86: T => p(GLOW('#ffffff'), 300, 200, 700, 700, 'a-pulse', { d: 9 }) + [['#f6c49a', 1, 300, 1.3, 44], ['#f6b8c2', -1, 260, 1.1, 54], ['#f6d79a', -1, 560, .9, 40], ['#a9c8e6', 1, 640, .8, 60], ['#f6c49a', -1, 720, .7, 36], ['#f6b8c2', 1, 820, .7, 50]].map(([c, dir, y, s, d], i) =>
        p(FISH(c), 0, y, 144 * s, 80 * s, 'a-drift', { x0: dir < 0 ? -200 : 2120, x1: dir < 0 ? 2120 : -200, d, dl: -i * 9 }, 'a-swim' + (dir < 0 ? ' flip' : ''))).join('')
      + p(MANTA(), 0, 470, 260, 228, 'a-drift', { x0: 2200, x1: -300, d: 70, dl: -10 }, 'a-glide')
      + Array.from({ length: 22 }, (_, k) => { const r = rnd(860 + k); return p(FISH('#a9c8e6'), 0, 520 + r() * 120 + Math.sin(k) * 30, 46, 26, 'a-drift', { x0: 2050 + (k % 7) * 30, x1: -250 + (k % 7) * 30, d: 48, dl: -18 - (k / 22) * 2 }, 'a-swim'); }).join('')
      + Array.from({ length: 16 }, (_, k) => { const r = rnd(870 + k); return p(BUBBLE(), r() * 1920, 1000, 14 + r() * 14, 14 + r() * 14, 'a-rise', { rx: 30, ry: -1000, d: 8 + r() * 8, dl: -r() * 16 }); }).join(''),
    s87: T => `<i class="pc" style="left:0;top:0;width:1920px;height:1200px;clip-path:path('M790 960 L790 390 C790 280 870 222 960 222 C1050 222 1130 280 1130 390 L1130 960 Z')">${[[330, 1], [470, .7], [600, .9], [380, .6]].map(([y, s], i) => p(CLOUD('#ffffff', '#e3edf6'), 0, y, 180 * s, 104 * s, 'a-drift', { x0: 660, x1: 1260, d: 40 + i * 9, dl: -i * 13 })).join('')}${birds(871, 3, 520, '#8a96aa', 14, -4, .8)}</i>`
      + `<i class="pc a-beam" style="left:700px;top:330px;width:560px;height:870px"></i>` + Array.from({ length: 40 }, (_, k) => { const r = rnd(872 + k); return p(SOFT('#fff6d8'), 760 + r() * 440, 420 + r() * 700, 10 + r() * 14, 10 + r() * 14, 'a-mote', { d: +(8 + r() * 10).toFixed(1), dl: +(-r() * 18).toFixed(1) }); }).join('') + gtwinkles(10, ['#fffbe8'], 873, 780, 420, 1180, 1100, [10, 18]),
    s88: T => clouds(T, 88, 6, 80, 560, '#ffffff', '#dcebf6') + `<i class="pc a-drift" style="left:0;top:0;width:800px;height:172px;--x0:-900px;--x1:2100px;--d:36s;--dl:-8s;margin-top:700px"><b class="a-chug">${TRAIN()}</b>${[0, 1, 2, 3].map(i => `<i class="pc a-puff" style="left:${183}px;top:${-20}px;width:${70}px;height:${40}px;--d:3.2s;--dl:${-i * .8}s">${CLOUD('#ffffff', '#e8eef4')}</i>`).join('')}</i>`
      + ripples(881, 10, 0, 1130, 1920, 1190, 'rgba(255,255,255,.7)'),
    s96: T => p(GLOW('#fde2a8'), 980, 560, 520, 520, 'a-pulse', { d: 7 }) + birds(961, 9, 380, '#a07a5a', 46, -6) + birds(962, 5, 520, '#a07a5a', 56, -30, .8, -1),
    s97: T => clouds(T, 97, 5, 80, 480, '#ffffff', '#dde8f3', .6) + falling(24, DOT, ['#ffffff'], 97, [4, 8], [16, 26], 60)
      + [[300, 868, 1.2, 1], [420, 880, 1, -1], [360, 890, .6, 1], [1100, 950, .9, 1], [1700, 1030, 1.1, -1], [1610, 1040, .55, 1]].map(([x, y, s, f], i) => p(PENGUIN(), x, y - 26 * s, 100 * s, 124 * s, '', {}, 'a-waddle' + (f < 0 ? ' flip' : '') + ` w${i % 3}`)).join('')
      + p(TAIL(), 900, 840, 120, 110, 'a-tail', { d: 14 }) + ripples(971, 12, 0, 780, 1920, 1180, 'rgba(255,255,255,.6)'),
    s98: T => p(GLOW('#fde3cf'), 960, 900, 900, 600, 'a-pulse', { d: 8 })
      + [[1500, 380, 1, '#f6b8c2', '#fde3e8'], [1180, 300, .7, '#f6d79a', '#fff0c8'], [1740, 560, .6, '#a9c8e6', '#e1eefa'], [980, 500, .5, '#c9b9ec', '#ebe4fb'], [1340, 610, .42, '#a9d3bb', '#e2f2e8'], [220, 440, .55, '#f6c49a', '#fde6d4'], [420, 320, .38, '#f6b8c2', '#fde3e8'], [660, 560, .32, '#a9c8e6', '#e1eefa']].concat(T ? [[400, -600, .6, '#f6d79a', '#fff0c8'], [1300, -1100, .5, '#a9d3bb', '#e2f2e8'], [900, -300, .45, '#f6b8c2', '#fde3e8']] : [])
        .map(([x, y, s, c1, c2], i) => p(BALLOON(c1, c2), x, y, 184 * s, 244 * s, 'a-float', { fy: -60 - i * 6, fx: (i % 2 ? 40 : -30), d: 14 + i * 2, dl: -i * 3 })).join(''),
    s99: T => clouds(T, 99, 4, 300, 600, '#ffffff', '#e3edf6') + [[40, 40], [150, 50]].map(([y0, amp], row) => Array.from({ length: 22 }, (_, i) => { const t = i / 21, x = t * 1920, y = y0 + amp * 4 * ((t * 2) % 1) * (1 - (t * 2) % 1);
        return `<i class="pc a-flag" style="left:${f1(x - 30)}px;top:${f1(y)}px;width:60px;height:66px;--dl:${-((i + row * 3) % 7) * .35}s">${FLAG(['#f6b8c2', '#a9d3bb', '#f6d79a', '#a9c8e6', '#d9c8ef', '#f6c49a'][(i + row) % 6])}</i>`; }).join('')).join('')
      + falling(18, PETAL, ['#f6b8c2', '#f6d79a', '#a9d3bb', '#a9c8e6'], 99, [10, 16], [12, 20], 80),
    // ---- UR ----
    s35: T => p(ROSE(), 1517, 912, 230, 230, '', {}, 'a-rose') + `<i class="pc" style="left:0;top:0;width:1920px;height:1200px"><svg viewBox="0 0 1920 1200"><path class="a-route" d="${ROUTE}" fill="none" stroke="#b5532e" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round" opacity=".75"/></svg></i>`
      + `<i class="pc a-sail" style="left:0;top:0;width:90px;height:76px;offset-path:path('${ROUTE}')">${SHIP()}</i>` + PINS.map(([lo, la], i) => p(PIN(), 96 + (lo + 180) * 4.8, 144 + (72.5 - la) * 4.8 - 20, 30, 36, 'a-pin', { d: 30, dl: -30 + i * 30 / PINS.length * .9 })).join('')
      + `<i class="pc a-cloudsh" style="left:-600px;top:0;width:900px;height:1200px"></i>` + motes(14, '#fff6dc', 351, 0, 0, 1920, 1200),
    s36: T => ['#5fe0b6', '#7fb8ff', '#c79bff', '#5fe0b6', '#9ff0d0', '#ff9fd6', '#7fffc8'].map((c, i) => { const r = rnd(360 + i); let rays = '';
        for (let k = 0; k < 16; k++) { const x = r() * 100, w = 1.5 + r() * 5, h = 55 + r() * 45; rays += `<i style="left:${f1(x)}%;width:${f1(w)}%;height:${f1(h)}%;top:${f1(30 - h * .3)}%;--o:${f1(.35 + r() * .55)};--d:${f1(.9 + r() * 2.2)}s;--dl:${f1(-r() * 8)}s"></i>`; }
        return `<i class="sp a-curtain" style="--c:${c};top:${[6, 0, -4, 14, 10, 2, 18][i]}%;left:${[-10, 20, -30, 30, 0, -20, 40][i]}%;width:${[90, 80, 70, 70, 120, 80, 70][i]}%;--d:${[7, 9, 11, 8, 13, 10, 6.5][i]}s;--dl:${-i * 2.3}s">${rays}</i>`; }).join('')
      + twinkles(T ? 80 : 50, ['#fff6dc', '#dff4ff'], 36, 0, 70, [6, 14]) + shooting(7, 36, 6),
    s37: T => `<i class="sp a-sky"><svg viewBox="-1000 -1000 2000 2000">${[300, 520, 740, 960].map((r, i) => `<circle r="${r}" fill="none" stroke="#e6c77a" stroke-width="2" stroke-dasharray="${3 + i * 3} ${14 + i * 8}" opacity=".35"/>`).join('')}${Array.from({ length: 90 }, (_, k) => { const r = rnd(370 + k), a = r() * 6.283, d = 80 + r() * 940; return `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="${f1(1 + r() * 2.4)}" fill="#fff3cf" opacity="${f1(.4 + r() * .6)}"/>`; }).join('')}</svg></i>`
      + `<i class="pc" style="left:0;top:0;width:1920px;height:1200px"><svg viewBox="0 0 1920 1200">${CONS.map((c, i) => `<g class="a-con" style="--dl:${(i * 3.2).toFixed(1)}s"><path d="M${c.map(q => q.join(' ')).join(' L')}" fill="none" stroke="#ffe7a8" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" />${c.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="7" fill="#fff6dc"/>`).join('')}</g>`).join('')}</svg></i>`
      + twinkles(40, ['#fff3cf', '#ffe7a8'], 37, 0, 100, [8, 16]) + shooting(3, 37, 11) + `<i class="sp a-comet"></i>`,
    s38: T => twinkles(T ? 90 : 60, ['#fff6e6', '#e6dcff'], 38, 0, 80, [6, 14]) + shooting(4, 38, 9)
      + `<i class="pc a-rail" style="left:0;top:0;width:520px;height:80px;offset-path:path('${RAIL}')">${NTRAIN()}</i>` + Array.from({ length: 16 }, (_, i) => `<i class="pc a-rail a-trail" style="left:0;top:0;width:${18 - i * .6}px;height:${18 - i * .6}px;offset-path:path('${RAIL}');--lag:${(i + 1) * .35}s">${TW(i % 2 ? '#ffe9a6' : '#e6dcff')}</i>`).join('')
      + `<i class="pc" style="left:0;top:0;width:1920px;height:1200px"><svg viewBox="0 0 1920 1200"><path d="${RAIL}" fill="none" stroke="#e6dcff" stroke-width="2" stroke-dasharray="1 16" stroke-linecap="round" opacity=".5"/></svg></i>` + p(GLOW('#fdf0c8'), 300, 200, 300, 300, 'a-pulse', { d: 7 }),
    s39: T => ['#f7a8c8', '#a9e4ff', '#d0b4ff', '#ffe0a8', '#a9e4ff', '#f7a8c8', '#d0b4ff', '#a9e4ff', '#ffe0a8', '#f7a8c8', '#a9e4ff', '#d0b4ff', '#a9e4ff', '#f7a8c8'].map((c, i) => { const r = rnd(390 + i), s = 1 + r() * 1.1;
        return p(JELLY(c, c), 120 + r() * 1680, 1000 + r() * 200, 120 * s, 220 * s, 'a-jelly', { rx: Math.round((r() - .5) * 240), ry: -1700, d: +(30 + r() * 14).toFixed(1), dl: +(-(i / 14) * 40 - r() * 3).toFixed(1) }, 'a-pulsej'); }).join('')
      + Array.from({ length: 40 }, (_, k) => { const r = rnd(395 + k); return p(SOFT(['#bfe8ff', '#ffffff', '#f7c8e0'][k % 3]), r() * 1920, 1100, 10 + r() * 12, 10 + r() * 12, 'a-rise', { rx: Math.round((r() - .5) * 120), ry: -1300, d: +(14 + r() * 14).toFixed(1), dl: +(-r() * 28).toFixed(1) }); }).join('')
      + [180, 620, 1080, 1560].map((x, i) => `<i class="pc a-ray" style="left:${x}px;top:-100px;width:220px;height:1300px;--d:${10 + i * 2}s;--dl:${-i * 2.5}s"></i>`).join(''),
    s40: T => {   // 天灯まつり: lanterns float up from the town across the whole sky, the lake's lights shimmer, stars twinkle
      const r = rnd(40); let h = twinkles(T ? 70 : 40, ['#fff6e6', '#ffe2c0'], 40, 0, 60, [6, 14]);
      for (let i = 0; i < (T ? 46 : 30); i++) { const s = .35 + r() * r() * 1.3, d = 26 + (1.6 - s) * 14 + r() * 8;
        h += p(LANTERN(), 160 + r() * 1600, 990, 46 * s, 64 * s, 'a-lant', { rx: Math.round((r() - .3) * 420), ry: -(T ? 2900 : 1150) - r() * 200, d: +d.toFixed(1), dl: +(-(i / (T ? 46 : 30)) * d - r() * 4).toFixed(1) }, 'a-sway2'); }
      return h + ripples(401, 26, 0, 980, 1920, 1190, 'rgba(255,200,140,.55)', [40, 140]) + `<i class="pc a-pulse" style="left:200px;top:820px;width:1600px;height:180px;background:radial-gradient(50% 50% at 50% 60%,rgba(255,170,120,.35),transparent 70%);--d:7s"></i>`; },
    s89: T => {   // 雲海の夜明け: the sea of clouds flows, mist slides past the peaks, the sun's rays turn, birds cross
      const r = rnd(89); let h = `<i class="pc a-sunray" style="left:580px;top:220px;width:1200px;height:1200px"></i>` + p(GLOW('#fff1c8'), 1180, 820, 640, 640, 'a-pulse', { d: 6 });
      for (let i = 0; i < 16; i++) { const y = 820 + r() * 330, w = 500 + r() * 700, hh = 120 + r() * 120, d = 60 + r() * 60;
        h += `<i class="pc a-drift" style="left:0;top:${f1(y - hh / 2)}px;width:${f1(w)}px;height:${f1(hh)}px;background:radial-gradient(50% 50% at 50% 50%,rgba(255,${240 + Math.round(r() * 15)},${232 + Math.round(r() * 20)},.9),rgba(255,240,240,0) 70%);--x0:-${f1(w)}px;--x1:1920px;--d:${f1(d)}s;--dl:${f1(-r() * d)}s"></i>`; }
      for (let i = 0; i < 5; i++) h += `<i class="pc a-drift" style="left:0;top:${f1(560 + i * 70)}px;width:600px;height:90px;background:radial-gradient(50% 50% at 50% 50%,rgba(255,236,240,.55),transparent 70%);--x0:2000px;--x1:-700px;--d:${50 + i * 12}s;--dl:${-i * 17}s"></i>`;
      return h + birds(891, 7, 520, '#5a4f80', 44, -8) + birds(892, 4, 400, '#5a4f80', 60, -34, .7) + gtwinkles(18, ['#fff6dc', '#ffe0c0'], 893, 300, 830, 1700, 960, [10, 20]) + (T ? twinkles(30, ['#fff6e6'], 89, 0, 40, [5, 10]) : ''); },
    s90: T => {   // 夜光の海: blue-glowing waves wash up the cove, the lighthouse beam sweeps, sparks along the shore, shooting stars
      let h = `<i class="pc a-beamL" style="left:214px;top:698px;width:1700px;height:120px"></i>` + p(GLOW('#ffe9b0'), 214, 698, 140, 140, 'a-pulse', { d: 3 });
      for (let i = 0; i < 4; i++) h += `<i class="pc a-wash" style="left:${520 + i * 40}px;top:${930 + i * 24}px;width:1500px;height:${150 - i * 10}px;--d:${7 + i * .8}s;--dl:${-i * 1.9}s"><svg viewBox="0 0 1500 150" preserveAspectRatio="none"><defs><linearGradient id="wv${i}" x2="0" y2="1"><stop offset="0" stop-color="#7ff0ff" stop-opacity=".0"/><stop offset=".35" stop-color="#7ff0ff" stop-opacity=".75"/><stop offset=".6" stop-color="#3ab6ff" stop-opacity=".25"/><stop offset="1" stop-color="#3ab6ff" stop-opacity="0"/></linearGradient></defs><path d="M0 150 C200 70 500 40 800 50 C1100 60 1300 30 1500 10 L1500 150 Z" fill="url(#wv${i})"/></svg></i>`;
      const r = rnd(90); for (let k = 0; k < 50; k++) { const t = r(), x = 600 + t * 1320, y = 1180 - t * 150 - r() * 60; h += p(SOFT(['#8ff2ff', '#c8f8ff', '#5fd0ff'][k % 3]), x, y, 10 + r() * 16, 10 + r() * 16, 'a-tw', { d: +(1.6 + r() * 2.4).toFixed(2), dl: +(-r() * 6).toFixed(2) }); }
      return h + gtwinkles(30, ['#9fe8ff'], 901, 300, 760, 1920, 960, [8, 16]) + twinkles(T ? 70 : 40, ['#eef4ff', '#cfe0ff'], 90, 0, 55, [6, 14]) + shooting(5, 90, 8); },
    s93: T => p(WHEEL(), 1540, 600, 680, 680) + ['#ffc6d4', '#ffe9a6', '#c9e6ff', '#d9c8ff', '#b8f0d8', '#ffc6d4'].map((c, i) => { const x = [700, 1000, 1240, 860, 1120, 560][i], y = [240, 160, 300, 380, 120, 320][i];
        return `<i class="pc a-shell" style="left:${x - 3}px;top:${y}px;width:6px;height:${960 - y}px;--d:7.5s;--dl:${i * 1.25}s"></i>` + p(FW(c), x, y, 220, 220, 'a-boom', { d: 7.5, dl: i * 1.25 }) + p(FW(c), x, y, 120, 120, 'a-boom b2', { d: 7.5, dl: i * 1.25 }); }).join('')
      + twinkles(30, ['#fff6dc'], 93, 0, 50, [5, 10]),
    s94: T => falling(22, PETAL, ['#f6dff2', '#dff1ff', '#e2fff4', '#fff4d6'], 94, [16, 28], [16, 30], 140) + gtwinkles(26, ['#f3d993', '#fff6dc'], 941, 0, 0, 1920, 1200, [10, 22]) + p(GLOW('#fdf0c8'), 1500, 260, 520, 520, 'a-pulse', { d: 8 })
      + ripples(942, 14, 0, 1060, 1920, 1190, 'rgba(243,217,147,.7)', [80, 200]),
  };
  // the night fair's and the amusement park's wheels
  const WHEEL = () => { const R = 300; let g = `<circle r="${R}" fill="none" stroke="#5a5f92" stroke-width="8"/><circle r="${R - 46}" fill="none" stroke="#4d5288" stroke-width="3"/>`;
    for (let k = 0; k < 16; k++) { const t = k * Math.PI / 8; g += `<line x1="0" y1="0" x2="${(R * Math.cos(t)).toFixed(0)}" y2="${(R * Math.sin(t)).toFixed(0)}" stroke="#5a5f92" stroke-width="4"/>`; }
    let b = ''; const cols = ['#ffe9a6', '#ffc6d4', '#c9e6ff'];
    for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24, x = (R * Math.cos(t)).toFixed(0), y = (R * Math.sin(t)).toFixed(0);
      b += `<g class="fx-bulb" style="animation-delay:${(-(k % 8) * .18).toFixed(2)}s"><circle cx="${x}" cy="${y}" r="20" fill="${cols[k % 3]}" opacity=".22"/><circle cx="${x}" cy="${y}" r="7" fill="${cols[k % 3]}"/></g>`; }
    let c = ''; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + .2, x = (R * Math.cos(t)).toFixed(0), y = (R * Math.sin(t)).toFixed(0);
      c += `<g transform="translate(${x} ${y})"><g class="fx-cab"><path d="M-24 6 L24 6 L20 42 L-20 42 Z" fill="#6a6fa6"/><path d="M-28 8 C-28 -12 28 -12 28 8 Z" fill="#7a5f9a"/><rect x="-13" y="14" width="26" height="14" rx="3" fill="#ffe9a6"/></g></g>`; }
    return `<svg viewBox="-340 -340 680 680"><g class="fx-turn">${g}${b}${c}<circle r="26" fill="#6a6fa6"/></g></svg>`; };
  const WHEEL_D = () => { const R = 280, cols = ['#f6b8c2', '#f6d79a', '#a9d3bb', '#a9c8e6']; let g = `<circle r="${R}" fill="none" stroke="#d9cfe6" stroke-width="10"/><circle r="${R - 40}" fill="none" stroke="#e6def0" stroke-width="5"/>`;
    for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6; g += `<line x1="0" y1="0" x2="${(R * Math.cos(t)).toFixed(0)}" y2="${(R * Math.sin(t)).toFixed(0)}" stroke="#e6def0" stroke-width="5"/>`; }
    let c = ''; for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6, x = (R * Math.cos(t)).toFixed(0), y = (R * Math.sin(t)).toFixed(0);
      c += `<g transform="translate(${x} ${y})"><g class="fx-cab"><path d="M-26 4 L26 4 L22 44 L-22 44 Z" fill="${cols[k % 4]}"/><path d="M-30 6 C-30 -14 30 -14 30 6 Z" fill="${cols[(k + 1) % 4]}"/><rect x="-14" y="12" width="28" height="16" rx="4" fill="#ffffff"/></g></g>`; }
    return `<svg viewBox="-320 -320 640 640"><g class="fx-turn s45">${g}${c}<circle r="26" fill="#c9b9da"/></g></svg>`; };
  const ROSE = () => { let pth = ''; for (let j = 0; j < 8; j++) { const a = -Math.PI / 2 + j * Math.PI / 4, L = j % 2 ? 60 : 100;
      for (const [h, c] of [[1, '#e2c08c'], [-1, '#a8794a']]) pth += `<path d="M${f1(L * Math.cos(a))} ${f1(L * Math.sin(a))} L${f1(14 * Math.cos(a + h * .32))} ${f1(14 * Math.sin(a + h * .32))} L0 0 Z" fill="${c}"/>`; }
    return `<svg viewBox="-110 -110 220 220">${pth}<circle r="9" fill="#a8794a"/><circle r="4" fill="#efe0c0"/></svg>`; };
  // the old map: a voyage from Lisbon round Africa to Japan (grid = 96 + (lon+180)·4.8, 144 + (72.5−lat)·4.8)
  const G = (lo, la) => `${f1(96 + (lo + 180) * 4.8)} ${f1(144 + (72.5 - la) * 4.8)}`;
  const ROUTE = `M${G(-12, 38)} C${G(-26, 22)} ${G(-28, 2)} ${G(-12, -14)} C${G(0, -30)} ${G(14, -42)} ${G(24, -38)} C${G(40, -34)} ${G(54, -18)} ${G(62, -2)} C${G(70, 8)} ${G(84, 4)} ${G(92, 4)} C${G(102, 2)} ${G(112, 10)} ${G(122, 22)} C${G(130, 30)} ${G(138, 34)} ${G(146, 38)}`;
  // the birthplaces of games in the Atlas, lighting up one after another
  const PINS = [[139.7, 35.7], [116.4, 39.9], [127, 37.5], [77.6, 27.2], [31.2, 30], [44.4, 31], [47.5, -18.9], [-155.5, 19.6], [23.7, 38], [4.9, 52.4], [51.4, 35.7], [-99.1, 19.4], [-43.2, -22.9], [37.6, 55.8], [12.5, 41.9], [10.7, 59.9], [-80.5, 43.4], [-0.1, 51.5]];
  const CONS = [[[141, 137], [133, 27], [170, 134], [306, 128]], [[338, 476], [327, 586], [446, 605], [361, 580], [353, 704], [224, 605]], [[908, 510], [841, 481], [919, 399], [921, 471], [1008, 543], [1086, 474]], [[1443, 538], [1350, 570], [1386, 722], [1286, 759], [1337, 911], [1232, 898]], [[348, 883], [464, 823], [351, 851], [409, 910], [469, 976]], [[755, 895], [843, 976], [744, 958], [733, 888], [816, 830], [729, 848]], [[1446, 835], [1451, 672], [1421, 523], [1483, 443], [1389, 457]], [[1497, 139], [1436, 107], [1494, 180], [1563, 135], [1572, 40]]];
  const RAIL = 'M-300 980 C200 900 420 700 760 640 C1100 580 1300 700 1560 560 C1760 450 1880 300 2240 160';

  /* ---------------- styles (injected once) ---------------- */
  const CSS = `
#skfx .stage{position:absolute;left:0;top:0;width:1920px;transform-origin:0 0}#skfx .st-in{position:absolute;left:0;width:1920px;height:1200px}
#skfx .pc,#skfx .sp{position:absolute;display:block}#skfx .pc>b,#skfx .sp>b{display:block;width:100%;height:100%}#skfx svg{display:block;width:100%;height:100%;overflow:visible}
#skfx .flip>svg,#skfx b.flip>svg{transform:scaleX(-1)}
.a-drift{animation:aDrift var(--d) linear var(--dl,0s) infinite;will-change:transform}@keyframes aDrift{from{transform:translateX(var(--x0))}to{transform:translateX(var(--x1))}}
.a-fly .fl{transform-origin:50% 50%;animation:aFlap .55s ease-in-out infinite alternate}@keyframes aFlap{to{transform:scaleY(-.35)}}
.mf{transform-origin:50% 0;animation:aMf 3s ease-in-out infinite alternate}@keyframes aMf{to{transform:scaleX(.8) scaleY(1.1)}}
.a-glide{animation:aGlide 4s ease-in-out infinite alternate}.a-glide .fl{transform-origin:50% 60%;animation:aFlap 1.6s ease-in-out infinite alternate}@keyframes aGlide{from{transform:translateY(-16px) rotate(-4deg)}to{transform:translateY(16px) rotate(4deg)}}
.a-bob{animation:aBob 3.6s ease-in-out infinite alternate}.a-bob.b2{animation-duration:4.4s;animation-delay:-1.3s}@keyframes aBob{from{transform:translateY(-5px) rotate(-2deg)}to{transform:translateY(5px) rotate(2deg)}}
.a-walk{animation:aWalk .9s ease-in-out infinite alternate}@keyframes aWalk{from{transform:translateY(0) rotate(-1.2deg)}to{transform:translateY(-4px) rotate(1.2deg)}}
.a-swim{animation:aSwim 1.4s ease-in-out infinite alternate}@keyframes aSwim{from{transform:translateY(-6px) rotate(-3deg)}to{transform:translateY(6px) rotate(3deg)}}
.a-waddle{transform-origin:50% 100%;animation:aWad 1.1s ease-in-out infinite alternate}.a-waddle.w1{animation-duration:.9s;animation-delay:-.4s}.a-waddle.w2{animation-duration:1.3s;animation-delay:-.7s}@keyframes aWad{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
.a-pulse{animation:aPulse var(--d) ease-in-out var(--dl,0s) infinite alternate}@keyframes aPulse{from{transform:scale(.88);opacity:.55}to{transform:scale(1.08);opacity:1}}
.a-fall{top:-60px;animation:aFall var(--d) linear var(--dl) infinite;will-change:transform}.a-fall>b{animation:aSwayR 3.5s ease-in-out infinite alternate}
@keyframes aFall{to{transform:translate3d(var(--sw),calc(100vh + 120px),0)}}@keyframes aSwayR{from{transform:translateX(-16px) rotate(0)}to{transform:translateX(16px) rotate(var(--rt))}}
.a-tw{opacity:0;animation:aTw var(--d) ease-in-out var(--dl) infinite}@keyframes aTw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}45%{opacity:1;transform:scale(1) rotate(45deg)}60%{opacity:.85;transform:scale(.85) rotate(60deg)}}
.a-shoot{width:220px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff8e6);opacity:0;transform:rotate(-24deg);animation:aShoot var(--d) ease-in var(--dl) infinite}
@keyframes aShoot{0%,84%{opacity:0;transform:rotate(-24deg) translateX(0)}86%{opacity:1}96%{opacity:0;transform:rotate(-24deg) translateX(-420px)}100%{opacity:0}}
.a-mote{opacity:0;animation:aMote var(--d) ease-in-out var(--dl) infinite}@keyframes aMote{0%,100%{opacity:0;transform:translate(0,0)}30%{opacity:.85}50%{transform:translate(30px,-50px)}70%{opacity:.6}}
.a-rip{opacity:0;animation:aRip var(--d) ease-in-out var(--dl) infinite}@keyframes aRip{0%,100%{opacity:0;transform:translateX(-30px) scaleX(.6)}50%{opacity:1;transform:translateX(30px) scaleX(1)}}
.a-wave{animation:aWave 6s ease-in-out infinite}@keyframes aWave{0%,100%{transform:translateY(0) scaleY(1);opacity:.9}50%{transform:translateY(22px) scaleY(.7);opacity:.5}}
.a-smoke{opacity:0;animation:aSmoke var(--d) ease-out var(--dl) infinite}@keyframes aSmoke{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.9}100%{opacity:0;transform:translate(60px,-220px) scale(2.2)}}
.a-path{offset-rotate:0deg;animation:aPath var(--d) linear var(--dl) infinite}@keyframes aPath{from{offset-distance:0%}to{offset-distance:100%}}
.a-flut{animation:aFlutY .35s ease-in-out infinite alternate}.a-flut .fw{transform-origin:50% 50%;animation:aFw .18s ease-in-out infinite alternate}.a-flut .fw2{transform-origin:50% 50%;animation:aFw2 .18s ease-in-out infinite alternate}
@keyframes aFlutY{to{transform:translateY(-6px)}}@keyframes aFw{to{transform:scaleX(.25) translateX(-6px)}}@keyframes aFw2{to{transform:scaleX(.25) translateX(6px)}}
.a-wisp{background:linear-gradient(90deg,transparent,rgba(255,244,225,.9),transparent);border-radius:3px;opacity:0;animation:aWisp var(--d) ease-in-out var(--dl) infinite}@keyframes aWisp{0%,100%{opacity:0;transform:translateX(-80px)}50%{opacity:.9;transform:translateX(80px)}}
.a-mist{background:radial-gradient(50% 50% at 50% 50%,rgba(255,255,255,.7),transparent 70%);animation:aMist 30s ease-in-out infinite alternate}@keyframes aMist{from{transform:translateX(-200px)}to{transform:translateX(200px)}}
.a-spin.s60 svg .fx-turn,.fx-wheel .fx-turn{transform-origin:0 0;animation:aSpin 60s linear infinite}.fx-turn{transform-origin:0 0;animation:aSpin 60s linear infinite}.fx-turn.s45{animation-duration:45s}
.fx-turn .fx-cab{transform-box:fill-box;transform-origin:50% 0;animation:aSpin 60s linear infinite reverse}.fx-turn.s45 .fx-cab{animation-duration:45s}
.fx-bulb{animation:aBulb 1.4s steps(1) infinite}@keyframes aBulb{50%{opacity:.3}}@keyframes aSpin{to{transform:rotate(360deg)}}
.a-rise{animation:aRise var(--d) ease-in var(--dl) infinite;will-change:transform,opacity}@keyframes aRise{0%{opacity:0;transform:translate(0,0)}8%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(var(--rx),var(--ry))}}
.a-flag{transform-origin:50% 0;animation:aFlag 1.6s ease-in-out var(--dl,0s) infinite alternate}@keyframes aFlag{from{transform:rotate(-7deg) skewX(4deg)}to{transform:rotate(7deg) skewX(-4deg)}}
.a-beam{background:linear-gradient(90deg,transparent,rgba(255,248,222,.6) 30%,rgba(255,248,222,.6) 70%,transparent);-webkit-mask:linear-gradient(180deg,#000,transparent 95%);mask:linear-gradient(180deg,#000,transparent 95%);transform-origin:50% 0;animation:aBeam 9s ease-in-out infinite alternate}@keyframes aBeam{from{opacity:.4;transform:skewX(-8deg)}to{opacity:.9;transform:skewX(8deg)}}
.a-chug{animation:aChug .45s ease-in-out infinite alternate}@keyframes aChug{to{transform:translateY(-3px)}}.a-chug .wh{transform-box:fill-box}
.a-puff{opacity:0;animation:aPuff var(--d) ease-out var(--dl) infinite}@keyframes aPuff{0%{opacity:0;transform:translate(0,0) scale(.4)}12%{opacity:1}100%{opacity:0;transform:translate(-160px,-200px) scale(2.4)}}
.a-tail{opacity:0;transform-origin:50% 100%;animation:aTail var(--d) ease-in-out infinite}@keyframes aTail{0%,60%,100%{opacity:0;transform:translateY(60px)}70%,86%{opacity:1;transform:translateY(0) rotate(-6deg)}78%{transform:translateY(-6px) rotate(6deg)}}
.a-float{animation:aFloat var(--d) ease-in-out var(--dl) infinite alternate}@keyframes aFloat{from{transform:translate(0,0)}to{transform:translate(var(--fx),var(--fy))}}
.a-rose{animation:aRose 16s ease-in-out infinite alternate}@keyframes aRose{0%{transform:rotate(-14deg)}40%{transform:rotate(9deg)}70%{transform:rotate(-4deg)}100%{transform:rotate(22deg)}}
.a-route{stroke-dasharray:2 14;animation:aRoute 30s linear infinite}@keyframes aRoute{0%{opacity:0}4%{opacity:.75}92%{opacity:.75}100%{opacity:0}}
.a-sail{offset-rotate:0deg;animation:aPath 30s linear infinite,aSailF 30s linear infinite}@keyframes aSailF{0%,100%{opacity:0}3%,95%{opacity:1}}
.a-pin{opacity:0;transform-origin:50% 100%;animation:aPin var(--d) ease-out var(--dl) infinite}@keyframes aPin{0%{opacity:0;transform:translateY(-30px) scale(.4)}4%{opacity:1;transform:translateY(0) scale(1.15)}6%{transform:scale(1)}80%{opacity:1}90%,100%{opacity:0}}
.a-cloudsh{background:radial-gradient(40% 30% at 50% 40%,rgba(120,90,50,.12),transparent 70%);animation:aDrift 50s linear infinite;--x0:0px;--x1:3200px}
.a-curtain{height:60%;background:radial-gradient(60% 40% at 50% 55%,var(--c),transparent 75%);-webkit-mask:radial-gradient(55% 50% at 50% 55%,#000 25%,transparent 75%);mask:radial-gradient(55% 50% at 50% 55%,#000 25%,transparent 75%);opacity:.45;mix-blend-mode:screen;animation:aCurt var(--d) ease-in-out var(--dl) infinite alternate;will-change:transform}
#skfx .a-curtain>i{position:absolute;background:radial-gradient(50% 50% at 50% 50%,var(--c),transparent);opacity:var(--o);animation:aRayS var(--d) ease-in-out var(--dl) infinite alternate}@keyframes aRayS{from{opacity:calc(var(--o) * .15);transform:scaleY(.8)}to{opacity:var(--o);transform:scaleY(1.15)}}
@keyframes aCurt{0%{transform:translateX(-22%) skewX(-24deg) scaleY(.75);opacity:.2}30%{transform:translateX(-4%) skewX(14deg) scaleY(1.3);opacity:.75}55%{transform:translateX(10%) skewX(-10deg) scaleY(.95);opacity:.4}80%{transform:translateX(18%) skewX(20deg) scaleY(1.2);opacity:.8}100%{transform:translateX(24%) skewX(-6deg) scaleY(.85);opacity:.3}}
.a-sky{left:50%;top:100%;width:300vmax;height:300vmax;margin:-150vmax 0 0 -150vmax;animation:aSpin 260s linear infinite}
.a-con path{animation:aCon 26s ease-in-out var(--dl) infinite}.a-con circle{opacity:.0;animation:aConS 26s ease-in-out var(--dl) infinite}
@keyframes aCon{0%{stroke-dashoffset:100;opacity:0}3%{opacity:1}12%{stroke-dashoffset:0}60%{stroke-dashoffset:0;opacity:1}70%,100%{opacity:0;stroke-dashoffset:0}}
@keyframes aConS{0%{opacity:0;transform:scale(.4)}12%{opacity:1}60%{opacity:1}70%,100%{opacity:0}}#skfx .a-con circle{transform-box:fill-box;transform-origin:50% 50%}
.a-comet{left:110%;top:4%;width:300px;height:3px;border-radius:3px;background:linear-gradient(90deg,#fff6dc,rgba(255,231,168,0));animation:aComet 22s linear infinite}@keyframes aComet{0%,70%{transform:translate(0,0) rotate(18deg);opacity:0}72%{opacity:1}100%{transform:translate(-160vw,52vh) rotate(18deg);opacity:0}}
.a-rail{offset-rotate:auto;animation:aPath 18s linear infinite}.a-trail{animation:aPath 18s linear calc(var(--lag) * -1 + 0s) infinite,aTrailF 1.2s ease-in-out infinite alternate;animation-delay:calc(var(--lag) * -1),0s}@keyframes aTrailF{from{opacity:.3}to{opacity:1}}
.a-jelly{animation:aJel var(--d) linear var(--dl) infinite;will-change:transform}.a-pulsej .bl{transform-box:fill-box;transform-origin:50% 100%;animation:aBell 2.4s ease-in-out infinite}.a-pulsej .tn{animation:aTn 2.4s ease-in-out infinite}
@keyframes aJel{0%{opacity:0;transform:translate(0,0)}6%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translate(var(--rx),var(--ry))}}@keyframes aBell{0%,100%{transform:scale(1,1)}40%{transform:scale(.82,1.14)}}@keyframes aTn{0%,100%{transform:skewX(4deg)}50%{transform:skewX(-6deg)}}
.a-ray{background:linear-gradient(90deg,transparent,rgba(255,255,255,.16) 40%,rgba(255,255,255,.16) 60%,transparent);-webkit-mask:linear-gradient(180deg,#000,transparent 90%);mask:linear-gradient(180deg,#000,transparent 90%);transform-origin:50% 0;animation:aRay var(--d) ease-in-out var(--dl) infinite alternate}@keyframes aRay{from{transform:rotate(-6deg);opacity:.5}to{transform:rotate(6deg);opacity:1}}
.a-shell{background:linear-gradient(0deg,transparent,rgba(255,240,200,.85));transform-origin:50% 100%;opacity:0;animation:aShell var(--d) ease-out var(--dl) infinite}@keyframes aShell{0%{opacity:0;transform:scaleY(0)}2%{opacity:1}12%{opacity:1;transform:scaleY(1)}16%,100%{opacity:0;transform:scaleY(1)}}
.a-boom{opacity:0;transform:scale(.2);animation:aBoom var(--d) ease-out var(--dl) infinite}.a-boom.b2{animation-name:aBoom2}@keyframes aBoom{0%,13%{opacity:0;transform:scale(.2)}15%{opacity:1}30%{opacity:.9;transform:scale(1)}42%,100%{opacity:0;transform:scale(1.1) translateY(30px)}}
@keyframes aBoom2{0%,15%{opacity:0;transform:scale(.2) rotate(10deg)}18%{opacity:1}32%{opacity:.8;transform:scale(1) rotate(10deg)}44%,100%{opacity:0;transform:scale(1.05) rotate(10deg) translateY(36px)}}
.a-lant{animation:aJel var(--d) linear var(--dl) infinite;will-change:transform}.a-sway2{animation:aSw2 5s ease-in-out infinite alternate}@keyframes aSw2{from{transform:translateX(-10px) rotate(-4deg)}to{transform:translateX(10px) rotate(4deg)}}
.a-sunray{border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,240,200,.0) 0deg,rgba(255,240,200,.22) 6deg,rgba(255,240,200,0) 14deg,rgba(255,240,200,0) 24deg);-webkit-mask:radial-gradient(circle,#000 8%,transparent 62%);mask:radial-gradient(circle,#000 8%,transparent 62%);animation:aSpin 120s linear infinite}
.a-beamL{transform-origin:0 50%;margin-top:-60px;background:linear-gradient(90deg,rgba(255,240,190,.75),rgba(255,240,190,.15) 60%,transparent);clip-path:polygon(0 46%,100% 0,100% 100%,0 54%);-webkit-mask:linear-gradient(90deg,#000 40%,transparent);mask:linear-gradient(90deg,#000 40%,transparent);animation:aBeamL 12s ease-in-out infinite}
@keyframes aBeamL{0%{transform:scaleX(.15) rotate(-2deg);opacity:.2}25%{transform:scaleX(1) rotate(2deg);opacity:1}50%{transform:scaleX(.15) rotate(6deg);opacity:.2}75%{transform:scaleX(.6) rotate(-6deg);opacity:.6}100%{transform:scaleX(.15) rotate(-2deg);opacity:.2}}
.a-wash{transform-origin:100% 100%;opacity:0;animation:aWash var(--d) ease-in-out var(--dl) infinite}@keyframes aWash{0%{opacity:0;transform:translate(160px,60px) scaleY(.6)}35%{opacity:1}55%{opacity:.9;transform:translate(0,0) scaleY(1)}100%{opacity:0;transform:translate(60px,30px) scaleY(.8)}}
html:has(#bv.on,#hist.on,#ov.on) #skfx *{animation-play-state:paused!important}`;
  if (!document.getElementById('skfxcss')) { const s = document.createElement('style'); s.id = 'skfxcss'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------------- mount / place ---------------- */
  let el = null, cur = null;
  function place() {
    if (!el || !cur) return;
    const w = innerWidth, h = el.getBoundingClientRect().height || innerHeight, T = cur.tall && matchMedia('(max-aspect-ratio: 6/5)').matches;
    if (T !== cur.T) { cur.T = T; build(); }
    const ih = T ? 3000 : 1200, k = Math.max(w / 1920, h / ih), ox = (w - 1920 * k) * cur.px / 100, oy = (h - ih * k) * (T ? (cur.pyp ?? 100) / 100 : cur.mid ? .5 : (cur.py ?? 82) / 100);
    const stg = el.querySelector('.stage'); if (stg) { stg.style.height = ih + 'px'; stg.style.transform = `translate(${f1(ox)}px,${f1(oy)}px) scale(${k.toFixed(5)})`; stg.querySelector('.st-in').style.top = (T ? cur.toff ?? 1800 : 0) + 'px'; }
  }
  function build() {
    const f = S[cur.id]; if (!f) return;
    const html = f(cur.T), stage = [], screen = [];
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    [...tmp.children].forEach(c => (c.classList.contains('sp') ? screen : stage).push(c.outerHTML));
    el.innerHTML = (cur.x ? '<i class="fx-x"></i>' : '') + `<div class="stage"><div class="st-in">${stage.join('')}</div></div>` + screen.join('');
  }
  window.AtlasSkinFX = {
    has: id => !!S[id],
    mount(host, o) { el = host; cur = Object.assign({ T: null }, o); place(); if (cur.T === null) { cur.T = false; build(); place(); } },
    unmount() { el = null; cur = null; },
    place,
  };
  addEventListener('resize', () => { clearTimeout(place.t); place.t = setTimeout(place, 120); });
})();
