// 雀華：スキルのエフェクト（ユーザー 2026-11-15：スキルを使うと、キャラの絵と文字のカットインのあとに、卓の上にスキルごとのエフェクトを出す）。
// Skill effects: after the cut-in (the character's picture and the words) each skill plays its own effect over the table —
// drawn on one 2D canvas laid over the table (additive light), about 1.3 s, aimed by where the user of the skill sits.
//   wareme 割れ目   : lightning splits the table from the far side to the user, three strikes, a glowing crack left behind
//   hanup  紅蓮の一翻: crimson flames sweep from the user's side toward the middle
//   guard  鉄壁     : a wall of steel-blue hexagons lights up in a wave before the user
//   shugi  祝儀     : gold coins rain down over the table
//   pot    総取り   : a golden whirl over the middle, drawn away to the user
//   doraplus ドラ増し: stars burst from the middle, a ring and turning rays
//   lure   引き寄せ : green streams are drawn in to the user's hand from all round
//   mind   読心     : an eye opens over the middle; its gaze runs out to the three others
//   peek   先読み   : a line of light scans the table away from the user, a sight turns over the middle
//   swap   すり替え : two crescents circle each other and change places
//   seal   封じ     : two chains cross the table and a seal (封) is stamped on them
// MJSkillFx.play(id, seat, tb, { lite }) → a promise, kept when the effect has made its point (it fades out after that).
(function (root) {
'use strict';
const PI = Math.PI, TAU = PI * 2;
let cv = null, g = null, raf = 0, cur = null;
const sprites = new Map();
// a soft dot of light in one colour (drawn once, then stamped: far cheaper than a gradient per particle)
function dot(col) {
  let s = sprites.get(col); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64; const c = s.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.18, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); sprites.set(col, s); return s;
}
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ss = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const stamp = (col, x, y, r, a) => { if (a <= 0 || r <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(dot(col), x - r, y - r, r * 2, r * 2); };
// a line of light: a wide soft pass, a narrower one, a white core
function glow(pts, w, col, a, core) {
  g.lineJoin = g.lineCap = 'round';
  for (const [k, al, c] of [[1, .16, col], [.42, .5, col], [.13, core == null ? 1 : core, '#ffffff']]) { g.globalAlpha = Math.min(1, a * al); g.strokeStyle = c; g.lineWidth = Math.max(1, w * k); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
}
// a jagged path from a to b (midpoint displacement)
function bolt(a, b, R, rough, depth) {
  let pts = [a, b];
  for (let d = 0; d < depth; d++) { const n = [pts[0]]; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], L = Math.hypot(q[0] - p[0], q[1] - p[1]), k = (R() - .5) * rough * L; n.push([(p[0] + q[0]) / 2 - (q[1] - p[1]) / L * k, (p[1] + q[1]) / 2 + (q[0] - p[0]) / L * k], q); } pts = n; }
  return pts;
}
const star4 = (x, y, r, rot, col, a) => { g.globalAlpha = Math.min(1, a); g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const an = rot + k * PI / 4, q = k % 2 ? r * .2 : r; g.lineTo(x + Math.cos(an) * q, y + Math.sin(an) * q); } g.closePath(); g.fill(); };

// each effect: make(G, R, n) → state; draw(st, t, G) with t 0…1. G: { W, H, u (px of one tile's width at the middle), C, S, F, dir, side, O[] }
const FX = {
  wareme: {
    make(G, R) { const st = { strikes: [] }; for (let k = 0; k < 3; k++) { const main = bolt(G.F, G.S, R, .22, 6), br = [];
        for (let b = 0; b < 5; b++) { const i = 6 + Math.floor(R() * (main.length - 14)), p = main[i], an = Math.atan2(G.S[1] - G.F[1], G.S[0] - G.F[0]) + (R() < .5 ? 1 : -1) * (.5 + R() * .7), L = G.u * (2 + R() * 4); br.push(bolt(p, [p[0] + Math.cos(an) * L, p[1] + Math.sin(an) * L], R, .3, 4)); }
        st.strikes.push({ main, br }); }
      return st; },
    draw(st, t, G) { const T0 = [.0, .17, .36], LEN = [.13, .13, .5];
      for (let k = 0; k < 3; k++) { const q = (t - T0[k]) / LEN[k]; if (q < 0 || q > 1) continue; const a = k < 2 ? 1 - q * .5 : Math.pow(1 - q, 1.4), S = st.strikes[k];
        if (q < .25) { g.globalAlpha = .22 * (1 - q / .25); g.fillStyle = '#cfe6ff'; g.fillRect(0, 0, G.W, G.H); }
        glow(S.main, G.u * 1.5, '#5aa2ff', a); for (const b of S.br) glow(b, G.u * .7, '#7fb6ff', a * .8); }
      const c = ss(.3, .45, t) * (1 - ss(.75, 1, t)); if (c > 0) glow(st.strikes[2].main, G.u * .5, '#b06cff', c * .7, .5);   // the crack left glowing in the cloth
    } },
  hanup: {
    make(G, R, n) { const P = []; for (let i = 0; i < n * 260; i++) P.push({ s: R() * 2 - 1, d: R() * .55, v: .5 + R() * .9, w: R() * TAU, r: .28 + R() * .55, f: 2 + R() * 4 }); return { P }; },
    draw(st, t, G) { stamp('#ff3a1e', G.S[0], G.S[1], G.u * 7 * ss(0, .25, t), .4 * (1 - ss(.6, 1, t)));
      for (const p of st.P) { const q = (t - p.d) / .5; if (q <= 0 || q >= 1) continue; const b = [G.S[0] + G.side[0] * p.s * G.u * 6.5, G.S[1] + G.side[1] * p.s * G.u * 6.5], L = G.u * 8 * p.v * q;
        const x = b[0] + G.dir[0] * L + G.side[0] * Math.sin(p.w + q * p.f) * G.u * .5, y = b[1] + G.dir[1] * L + G.side[1] * Math.sin(p.w + q * p.f) * G.u * .5 - G.u * 1.2 * q * q;
        stamp(q < .25 ? '#ffe9a0' : q < .55 ? '#ff8a2a' : '#e0203a', x, y, G.u * p.r * (1.15 - q), (1 - q) * .7); } } },
  guard: {
    make(G) { const cells = [], s = G.u * .78, an = Math.atan2(G.side[1], G.side[0]); for (let i = -9; i <= 9; i++) for (let j = 0; j <= 4; j++) { const lx = (i + (j % 2) * .5) * s * 1.732, ly = j * s * 1.5; cells.push({ lx, ly, d: Math.hypot(lx, ly * 1.6) }); } return { cells, s, an }; },
    draw(st, t, G) { const B = [G.S[0] + G.dir[0] * G.u * 1.2, G.S[1] + G.dir[1] * G.u * 1.2], wave = t * G.u * 16, out = 1 - ss(.7, 1, t); g.lineJoin = 'round';
      for (const c of st.cells) { const k = Math.max(0, 1 - Math.abs(wave - c.d) / (G.u * 3.2)), a = (k * .9 + ss(c.d, c.d + G.u * 2, wave) * .22) * out; if (a < .02) continue;
        const x = B[0] + G.side[0] * c.lx - (G.u * .0) + 0 * c.ly, y = B[1] + G.side[1] * c.lx - c.ly * .9; g.globalAlpha = Math.min(1, a); g.strokeStyle = k > .5 ? '#ffffff' : '#6fb8ff'; g.lineWidth = Math.max(1, G.u * .07 * (1 + k)); g.fillStyle = '#3f8fe0';
        g.beginPath(); for (let v = 0; v < 6; v++) { const a2 = v * PI / 3 + PI / 6; g.lineTo(x + Math.cos(a2) * st.s * .94, y + Math.sin(a2) * st.s * .94 * .9); } g.closePath(); g.stroke(); if (k > .2) { g.globalAlpha = Math.min(1, a * .25); g.fill(); } }
      stamp('#5ab0ff', B[0], B[1] - G.u, G.u * 9 * ss(0, .3, t), .35 * out); } },
  shugi: {
    make(G, R, n) { const P = []; for (let i = 0; i < n * 70; i++) P.push({ x: (R() - .5) * G.u * 17, y0: -G.u * (2 + R() * 8), d: R() * .45, v: .8 + R() * .6, w: R() * TAU, f: 8 + R() * 10, r: .32 + R() * .26, land: (R() - .5) * G.u * 8 }); return { P }; },
    draw(st, t, G) { stamp('#ffd76a', G.C[0], G.C[1], G.u * 10 * ss(0, .3, t), .28 * (1 - ss(.7, 1, t)));
      for (const p of st.P) { const q = (t - p.d) / .5 * p.v; if (q <= 0) continue; const k = Math.min(1, q), x = G.C[0] + p.x, y = G.C[1] + p.y0 + (p.land - p.y0) * k * k, a = (q < 1 ? 1 : Math.max(0, 1 - (q - 1) * 4)); if (a <= 0) continue;
        const w = Math.abs(Math.cos(p.w + q * p.f)), r = G.u * p.r; g.globalAlpha = a; g.fillStyle = w > .6 ? '#ffe9a0' : '#e0a21c'; g.beginPath(); g.ellipse(x, y, r * (.18 + .82 * w), r, .3, 0, TAU); g.fill();
        g.globalAlpha = a * .8; g.strokeStyle = '#fff6cf'; g.lineWidth = Math.max(1, r * .14); g.beginPath(); g.ellipse(x, y, r * (.18 + .82 * w) * .62, r * .62, .3, 0, TAU); g.stroke();
        if (w > .96) stamp('#fff3c0', x, y, r * 1.5, a * .6); } } },
  pot: {
    make(G, R, n) { const P = []; for (let i = 0; i < n * 240; i++) P.push({ a: R() * TAU, r: .25 + R() * .75, v: .7 + R() * .8, s: .14 + R() * .3, d: R() * .2 }); return { P }; },
    draw(st, t, G) { const pull = ss(.52, .92, t);
      for (const p of st.P) { const q = Math.max(0, t - p.d), an = p.a + q * 9 * p.v, rr = G.u * 8 * p.r * (1 - ss(0, .7, q) * .82); let x = G.C[0] + Math.cos(an) * rr, y = G.C[1] + Math.sin(an) * rr * .5;
        x += (G.S[0] - x) * pull * pull; y += (G.S[1] - y) * pull * pull; stamp(p.s > .29 ? '#ffd76a' : '#ff9a3d', x, y, G.u * p.s * (1 - pull * .5), ss(0, .12, q) * (1 - ss(.9, 1, t))); }
      for (let k = 0; k < 3; k++) { g.globalAlpha = .5 * ss(0, .2, t) * (1 - pull); g.strokeStyle = '#ffc24a'; g.lineWidth = G.u * .12; g.beginPath(); g.ellipse(G.C[0], G.C[1], G.u * (2.2 + k * 1.9) * (1 - t * .5), G.u * (2.2 + k * 1.9) * .5 * (1 - t * .5), 0, t * 7 + k * 2.1, t * 7 + k * 2.1 + 2.4); g.stroke(); }
      stamp('#ffcf6a', G.S[0], G.S[1], G.u * 6 * pull, .7 * (1 - ss(.9, 1, t))); } },
  doraplus: {
    make(G, R, n) { const P = []; for (let i = 0; i < n * 46; i++) P.push({ a: R() * TAU, v: .35 + R() * .65, r: .25 + R() * .5, w: R() * TAU, c: R() < .5 ? '#ffd76a' : R() < .5 ? '#ff9fd0' : '#ffffff', d: R() * .25 }); return { P }; },
    draw(st, t, G) { const out = 1 - ss(.72, 1, t);
      for (let k = 0; k < 14; k++) { const an = k * TAU / 14 + t * 1.2, L = G.u * 13 * ss(0, .35, t); g.globalAlpha = .13 * out; g.fillStyle = k % 2 ? '#ffd76a' : '#ffb3da'; g.beginPath(); g.moveTo(G.C[0], G.C[1]); g.lineTo(G.C[0] + Math.cos(an - .05) * L, G.C[1] + Math.sin(an - .05) * L * .55); g.lineTo(G.C[0] + Math.cos(an + .05) * L, G.C[1] + Math.sin(an + .05) * L * .55); g.fill(); }
      for (let k = 0; k < 2; k++) { const q = ss(k * .14, k * .14 + .55, t); if (q <= 0 || q >= 1) continue; g.globalAlpha = (1 - q) * .9; g.strokeStyle = k ? '#ff9fd0' : '#ffe08a'; g.lineWidth = G.u * .22 * (1 - q); g.beginPath(); g.ellipse(G.C[0], G.C[1], G.u * 9 * q, G.u * 9 * q * .55, 0, 0, TAU); g.stroke(); }
      stamp('#ffe7a0', G.C[0], G.C[1], G.u * 5 * (1 - ss(.1, .6, t)) + G.u, .9 * out);
      for (const p of st.P) { const q = (t - p.d) / .7; if (q <= 0 || q >= 1) continue; const e = 1 - Math.pow(1 - q, 2.4), x = G.C[0] + Math.cos(p.a) * G.u * 9.5 * p.v * e, y = G.C[1] + Math.sin(p.a) * G.u * 9.5 * p.v * e * .55 - G.u * 1.5 * Math.sin(q * PI) * p.v;
        star4(x, y, G.u * p.r * (1 + .4 * Math.sin(p.w + q * 14)) * (1 - q * .5), p.w + q * 3, p.c, (1 - q) * 1.2); stamp(p.c, x, y, G.u * p.r * 1.6, (1 - q) * .5); } } },
  lure: {
    make(G, R, n) { const L = []; for (let i = 0; i < n * 26; i++) { const an = Math.atan2(G.dir[1], G.dir[0]) + (R() - .5) * 2.6, rr = G.u * (9 + R() * 7), a = [G.S[0] + Math.cos(an) * rr, G.S[1] + Math.sin(an) * rr * .7], m = mix(a, G.S, .5), k = (R() - .5) * G.u * 7; L.push({ a, c: [m[0] - Math.sin(an) * k, m[1] + Math.cos(an) * k], d: R() * .4, v: .8 + R() * .5, w: .12 + R() * .2 }); } return { L }; },
    draw(st, t, G) { const bz = (l, p) => { const q = 1 - p; return [q * q * l.a[0] + 2 * q * p * l.c[0] + p * p * G.S[0], q * q * l.a[1] + 2 * q * p * l.c[1] + p * p * G.S[1]]; };
      for (const l of st.L) { const h = (t - l.d) / .45 * l.v; if (h <= 0 || h >= 1.35) continue; const pts = []; for (let k = 0; k <= 10; k++) { const p = h - .35 + k * .035; if (p >= 0 && p <= 1) pts.push(bz(l, p * p * (3 - 2 * p))); }
        if (pts.length > 1) { glow(pts, G.u * l.w * 2.2, '#3dd68c', .9 * (1 - ss(1, 1.35, h))); const e = pts[pts.length - 1]; stamp('#b8ffd8', e[0], e[1], G.u * .7, .9 * (1 - ss(1, 1.35, h))); } }
      stamp('#3dd68c', G.S[0], G.S[1], G.u * (2 + 5 * ss(.3, .8, t)), .75 * ss(.2, .5, t) * (1 - ss(.8, 1, t))); } },
  mind: {
    draw(st, t, G) { const out = 1 - ss(.75, 1, t), op = ss(.02, .28, t) * (1 - ss(.82, 1, t) * .0), w = G.u * 5.2, h = G.u * 2.3 * op, x = G.C[0], y = G.C[1] - G.u * 1.2;
      stamp('#ff6fb5', x, y, G.u * 9 * op, .3 * out);
      if (h > 1) { g.save(); g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - h * 2, x + w, y); g.quadraticCurveTo(x, y + h * 2, x - w, y); g.closePath(); g.globalAlpha = .18 * out; g.fillStyle = '#ff9fd0'; g.fill(); g.clip();
        const ir = G.u * 1.9; stamp('#c84cff', x, y, ir * 2.2, out); g.globalAlpha = out; g.strokeStyle = '#ffd3ec'; g.lineWidth = G.u * .1; g.beginPath(); g.arc(x, y, ir, 0, TAU); g.stroke();
        for (let k = 0; k < 18; k++) { const an = k * TAU / 18 + t * 2; g.globalAlpha = .5 * out; g.beginPath(); g.moveTo(x + Math.cos(an) * ir * .45, y + Math.sin(an) * ir * .45); g.lineTo(x + Math.cos(an) * ir * .95, y + Math.sin(an) * ir * .95); g.stroke(); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = .9 * out; g.fillStyle = '#1a0420'; g.beginPath(); g.arc(x, y, ir * .42, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter'; stamp('#ffffff', x - ir * .3, y - ir * .3, ir * .35, out); g.restore();
        for (const sg of [-1, 1]) { const lid = []; for (let k = 0; k <= 16; k++) { const p = k / 16, q2 = 1 - p; lid.push([q2 * q2 * (x - w) + 2 * q2 * p * x + p * p * (x + w), y + sg * 2 * q2 * p * h * 2]); } glow(lid, G.u * .3, '#ff6fb5', out); } }
      for (const o of G.O) { const q = ss(.3, .7, t); if (q <= 0) continue; const e = mix([x, y], o, q); glow([[x, y], e], G.u * .22, '#ff8fc8', .6 * out, .6); stamp('#ffd3ec', e[0], e[1], G.u * .9, out);
        for (let k = 0; k < 2; k++) { const r = ss(.55 + k * .12, 1, t); if (r > 0 && r < 1) { g.globalAlpha = (1 - r) * .8; g.strokeStyle = '#ff9fd0'; g.lineWidth = G.u * .1; g.beginPath(); g.ellipse(o[0], o[1], G.u * 3.4 * r, G.u * 3.4 * r * .5, 0, 0, TAU); g.stroke(); } } } } },
  peek: {
    draw(st, t, G) { const out = 1 - ss(.78, 1, t), q = ss(.04, .7, t), far = G.u * 17, B = [G.S[0] + G.dir[0] * far * q, G.S[1] + G.dir[1] * far * q], hw = G.u * 11;
      for (let k = 0; k < 9; k++) { const b = [B[0] - G.dir[0] * G.u * k * .5, B[1] - G.dir[1] * G.u * k * .5]; g.globalAlpha = .1 * (1 - k / 9) * out; g.strokeStyle = '#7fd3ff'; g.lineWidth = G.u * .5; g.beginPath(); g.moveTo(b[0] - G.side[0] * hw, b[1] - G.side[1] * hw); g.lineTo(b[0] + G.side[0] * hw, b[1] + G.side[1] * hw); g.stroke(); }
      glow([[B[0] - G.side[0] * hw, B[1] - G.side[1] * hw], [B[0] + G.side[0] * hw, B[1] + G.side[1] * hw]], G.u * .5, '#7fd3ff', out);
      for (let k = -8; k <= 8; k++) { const p = [B[0] + G.side[0] * k * G.u * 1.3, B[1] + G.side[1] * k * G.u * 1.3]; g.globalAlpha = .7 * out; g.strokeStyle = '#d6f2ff'; g.lineWidth = Math.max(1, G.u * .06); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - G.dir[0] * G.u * (k % 4 ? .5 : 1), p[1] - G.dir[1] * G.u * (k % 4 ? .5 : 1)); g.stroke(); }
      const a = ss(.1, .3, t) * out, r = G.u * 3.2, x = G.C[0], y = G.C[1]; g.strokeStyle = '#bfeaff'; g.lineWidth = G.u * .1;
      for (const [rr, a0, a1] of [[1, t * 5, t * 5 + 1.6], [1, t * 5 + PI, t * 5 + PI + 1.6], [.62, -t * 7, -t * 7 + 4.4]]) { g.globalAlpha = a; g.beginPath(); g.ellipse(x, y, r * rr, r * rr * .55, 0, a0, a1); g.stroke(); }
      g.globalAlpha = a * .8; g.beginPath(); g.moveTo(x - r * 1.3, y); g.lineTo(x - r * .3, y); g.moveTo(x + r * .3, y); g.lineTo(x + r * 1.3, y); g.moveTo(x, y - r * .75); g.lineTo(x, y - r * .2); g.moveTo(x, y + r * .2); g.lineTo(x, y + r * .75); g.stroke(); stamp('#7fd3ff', x, y, r * 2.4, a * .35); } },
  swap: {
    draw(st, t, G) { const out = 1 - ss(.78, 1, t), q = ss(0, .8, t), an = q * q * (3 - 2 * q) * PI * 3, R = G.u * (5.2 - 1.6 * Math.sin(q * PI));
      for (let s = 0; s < 2; s++) for (let k = 0; k < 9; k++) { const a = an + s * PI - k * .11, x = G.C[0] + Math.cos(a) * R, y = G.C[1] + Math.sin(a) * R * .52, pts = [];
          for (let j = -6; j <= 6; j++) { const b = a + j * .1; pts.push([G.C[0] + Math.cos(b) * (R + G.u * .0), G.C[1] + Math.sin(b) * R * .52]); }
          if (k === 0) { glow(pts, G.u * .9, s ? '#9aa7ff' : '#7ff0e0', out); stamp(s ? '#c9d0ff' : '#c8fff5', x, y, G.u * 1.6, out); } else stamp(s ? '#9aa7ff' : '#7ff0e0', x, y, G.u * (1.1 - k * .1), out * (.5 - k * .05)); }
      const f = ss(.42, .5, t) * (1 - ss(.5, .7, t)); stamp('#ffffff', G.C[0], G.C[1], G.u * 7 * f, f * .8); } },
  seal: {
    draw(st, t, G) { const out = 1 - ss(.8, 1, t), L = G.u * 12;
      for (let s = 0; s < 2; s++) { const q = ss(s * .1, s * .1 + .34, t), d = [Math.cos(.5) * (s ? 1 : -1), Math.sin(.5) * .62], n = Math.floor(22 * q);
        for (let k = 0; k < n; k++) { const p = -1 + 2 * k / 21, x = G.C[0] + d[0] * L * p, y = G.C[1] + d[1] * L * p, an = Math.atan2(d[1], d[0]); g.globalAlpha = .95 * out; g.strokeStyle = k % 2 ? '#e7d6ff' : '#b07cff'; g.lineWidth = G.u * .18; g.beginPath(); g.ellipse(x, y, G.u * .62, G.u * (k % 2 ? .16 : .34), an, 0, TAU); g.stroke(); }
        if (q > 0) glow([[G.C[0] - d[0] * L, G.C[1] - d[1] * L], [G.C[0] + d[0] * L * (2 * q - 1), G.C[1] + d[1] * L * (2 * q - 1)]], G.u * 1.1, '#8a4cff', .35 * out, 0); }
      const q = ss(.34, .48, t); if (q > 0) { const sc = 2.2 - 1.2 * q, r = G.u * 2.9 * sc, x = G.C[0], y = G.C[1]; stamp('#b07cff', x, y, r * 2.4, .5 * q * out);
        g.globalAlpha = q * out; g.strokeStyle = '#f0e4ff'; g.lineWidth = G.u * .2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.lineWidth = G.u * .07; g.beginPath(); g.arc(x, y, r * .84, 0, TAU); g.stroke();
        g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(r * 1.15)}px "Shippori Mincho B1","Noto Serif JP",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('封', x, y + r * .04);
        const f = ss(.46, .5, t) * (1 - ss(.5, .66, t)); if (f > 0) { g.globalAlpha = f * .7; g.strokeStyle = '#ffffff'; g.lineWidth = G.u * .3 * (1 - f * .5); g.beginPath(); g.arc(x, y, r * (1 + ss(.46, .66, t) * 1.4), 0, TAU); g.stroke(); } } } },
};

function ensure(host) {
  const par = host.parentNode || host;
  if (!cv || cv.parentNode !== par) { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); cv = document.createElement('canvas'); cv.className = 'skfx'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none'; par.appendChild(cv); g = cv.getContext('2d'); }
}
function stop() { cancelAnimationFrame(raf); raf = 0; cur = null; if (cv) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; } }
// tb: the Table3D (host: its element; project(seat, lx, lz): a place on the table → px in the host)
function play(id, seat, tb, opt) {
  const fx = FX[id]; if (!fx || !tb || !tb.host) return Promise.resolve();
  opt = opt || {}; stop(); ensure(tb.host); cv.style.display = '';
  const W = tb.host.clientWidth || 1, H = tb.host.clientHeight || 1, dpr = opt.lite ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const P = (s, x, z) => { const p = tb.project(s, x, z); return [p.x, p.y]; };
  const C = P(0, 0, 0), S = P(seat, 0, 7.4), F = P(seat, 0, -9.5), e = P(seat, 1, 7.4), c1 = P(0, .5, 0), c0 = P(0, -.5, 0);
  const dl = Math.hypot(C[0] - S[0], C[1] - S[1]) || 1, sl = Math.hypot(e[0] - S[0], e[1] - S[1]) || 1;
  const G = { W, H, u: Math.max(8, Math.hypot(c1[0] - c0[0], c1[1] - c0[1])), C, S, F, dir: [(C[0] - S[0]) / dl, (C[1] - S[1]) / dl], side: [(e[0] - S[0]) / sl, (e[1] - S[1]) / sl], O: [1, 2, 3].map(k => P((seat + k) % 4, 0, 7.4)) };
  const st = fx.make ? fx.make(G, rng(1 + Math.floor(Math.random() * 1e6)), opt.lite ? .45 : 1) : {}, dur = opt.dur || 1300, t0 = performance.now(), me = cur = {};
  return new Promise(res => { let told = false;
    const frame = now => { if (cur !== me) { if (!told) res(); return; }
      const t = Math.min(1, (now - t0) / dur);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
      fx.draw(st, t, G); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (!told && t >= .7) { told = true; res(); }
      if (t < 1) raf = requestAnimationFrame(frame); else stop(); };
    raf = requestAnimationFrame(frame); });
}
root.MJSkillFx = { play, stop, ids: Object.keys(FX) };
})(window);
