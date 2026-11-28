/* 狼影灯 — 影絵芝居の道具箱：カメラの置き方・光・小道具・よく使うショットの型。
   ショットは { tr: つなぎ方, build(root, ctx): 舞台を組む, draw(S, t, ctx, f): t 秒目の画を描く → { fx, fy: 見どころ, snow, black, grain } } */
(function (root) {
  'use strict';
  const T = root.WLTheater; if (!T) return;
  const { W, H, E, clamp, lerp, seg, glide, noise1, flick, breath, World, makeSnow } = T;

  // where a puppet's head is (feet at x,y, height h): the head sits higher on tall people and lower on children
  const headY = (y, h, c) => { const lk = (c && c.look) || {}, sc = lk.h || 1, hc = lk.body === 'child' ? 39 : 43; return y - h * sc * (236 - hc) / 250; };   // the middle of the head (measured from art.js: the head spans about y 18..68 of the figure)
  // put world point (hx,hy) at frame point (FX,FY) with zoom z
  const aim = (w, hx, hy, FX, FY, z, r) => w.camera(hx - (FX - W / 2) / z, hy - (FY - H / 2) / z, z, r || 0);
  // frame point of a world point (cast layer)
  const at = (w, x, y) => w.toFrame(x, y, 1);
  const ch = (c, id) => c.st.chars.find(x => x.id === id);

  /* the lights */
  const L = {
    day(w, o) { o = o || {}; w.light({ lx: o.lx != null ? o.lx : .5, ly: o.ly != null ? o.ly : .3, lamp: o.lamp != null ? o.lamp : .75, ls: 1.2, dark: o.dark != null ? o.dark : .22, r: 90, edge: .8 }); },
    cold(w, o) { o = o || {}; w.light({ lx: o.lx != null ? o.lx : .5, ly: o.ly != null ? o.ly : .25, lamp: .35, ls: 1.4, dark: o.dark != null ? o.dark : .35, r: 95, tint: '22,21,24', edge: 1 }); },
    warm(w, t, o) { o = o || {}; const f = flick(t * (o.fs || 1), o.seed || 3); w.light({ lx: o.lx != null ? o.lx : .3, ly: o.ly != null ? o.ly : .4, lamp: (o.lamp || .95) * (.9 + .1 * f), ls: o.ls || .85, dark: o.dark != null ? o.dark : .7, r: o.r || 66 }); if (o.bloom !== false) w.bloom({ x: o.lx != null ? o.lx : .3, y: o.ly != null ? o.ly : .4, r: o.br || 1300, a: (o.ba || .4) * (.92 + .08 * f) }); },
    night(w, o) { o = o || {}; w.light({ lamp: o.lamp || .08, moon: 1, edge: 1, lx: o.lx != null ? o.lx : .75, ly: o.ly != null ? o.ly : .12, dark: o.dark != null ? o.dark : .55, r: 85, tint: '6,10,24' }); },
  };

  /* props drawn as cut paper (viewBox sizes in comments) */
  const PROP = {
    // quill and ink pot (400x400)
    quill: `<svg viewBox="0 0 400 400" width="100%" height="100%" style="overflow:visible"><path fill="currentColor" d="M150 330 q-10 -40 10 -60 h80 q20 20 10 60 z M160 262 h80 v-14 h-80z M188 248 q-4 -20 12 -24 q16 4 12 24z"/><path fill="currentColor" d="M232 236 C 250 160 300 70 360 18 C 352 70 330 120 300 160 C 318 150 330 150 338 146 C 318 180 290 200 262 210 L 236 244 Z"/><path fill="none" stroke="currentColor" stroke-width="3" d="M236 244 L 214 286"/></svg>`,
    // an iron key (400x160)
    key: `<svg viewBox="0 0 400 160" width="100%" height="100%" style="overflow:visible"><path fill="currentColor" fill-rule="evenodd" d="M70 80 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0z M96 80 a24 24 0 1 1 48 0 a24 24 0 1 1 -48 0z M166 70 h200 v20 h-24 v36 h-18 v-20 h-16 v28 h-18 v-44 h-124z"/></svg>`,
    // a pot on the hob (300x260)
    pot: `<svg viewBox="0 0 300 260" width="100%" height="100%" style="overflow:visible"><path fill="currentColor" d="M50 90 h200 q6 0 6 8 v10 q-10 90 -60 110 h-92 q-50 -20 -60 -110 v-10 q0 -8 6 -8z M30 100 h22 v14 h-22z M248 100 h22 v14 h-22z M110 70 h80 q10 0 10 10 v10 h-100 v-10 q0 -10 10 -10z M140 56 h20 v16 h-20z M20 230 h260 v14 h-260z"/></svg>`,
    // a bell (300x320), crack on the right
    bell: `<svg viewBox="0 0 300 320" width="100%" height="100%" style="overflow:visible"><path fill="currentColor" d="M138 10 h24 v26 h-24z M150 34 c-60 0 -84 50 -88 120 c-4 70 -24 100 -50 120 h276 c-26 -20 -46 -50 -50 -120 c-4 -70 -28 -120 -88 -120z M130 274 a20 20 0 0 0 40 0z"/><path fill="none" stroke="var(--paper)" stroke-width="3" opacity=".7" d="M206 120 l-10 30 l14 22 l-12 34 l8 20"/></svg>`,
  };
  // steam / breath puffs: a few soft blobs that rise and fade (in a layer)
  function puffs(w, layer, n, seed) { const out = []; for (let i = 0; i < n; i++) out.push({ sp: w.add(layer, null, { glow: [[0, 'rgba(240,245,255,.9)'], [.55, 'rgba(240,245,255,.4)'], [1, 'rgba(240,245,255,0)']], op: 0 }), k: i / n, s: seed + i }); return out; }
  function drawPuffs(P, t, x, y, o) {
    o = o || {}; const per = o.per || 3.2, size = o.size || 90, rise = o.rise || 220;
    for (const p of P) { const k = ((t / per + p.k) % 1), sz = size * (.6 + k * 1.4);
      Object.assign(p.sp, { w: sz, h: sz, x: x + noise1(t * .6 + p.s, p.s) * 30 + (o.drift || 0) * k - sz / 2, y: y - rise * k - sz / 2, op: Math.sin(k * Math.PI) * (o.a || .55) }); }
  }
  // sparks from a fire
  function sparks(w, layer, n) { const out = []; for (let i = 0; i < n; i++) { const s = 10 + (i % 3) * 8; out.push({ sp: w.add(layer, null, { glow: [[0, 'rgba(255,220,150,1)'], [.35, 'rgba(255,140,50,.9)'], [1, 'rgba(255,120,40,0)']], w: s, h: s, op: 0 }), k: (i * .618) % 1, s: i * 7.1 }); } return out; }
  function drawSparks(P, t, x, y, o) {
    o = o || {}; const per = o.per || 2.6, spread = o.spread || 160, rise = o.rise || 520;
    for (const p of P) { const k = ((t / per + p.k) % 1);
      Object.assign(p.sp, { x: x + noise1(t * 1.3 + p.s, p.s) * spread * k + Math.sin(p.s) * 30, y: y - rise * E.o2(k), op: (1 - k) * (k < .08 ? k / .08 : 1) }); }
  }

  /* interiors, cut from paper like the outdoor scenes: far = the back wall and windows, mid = hearth/posts/shelves, near = furniture */
  const svgL = (ww, h, body) => `<svg viewBox="0 0 ${ww} ${h}" width="${ww}" height="${h}" style="position:absolute;left:0;top:0;overflow:visible;color:var(--ink)">${body}</svg>`;
  const R = (x, y, w, h, a, extra) => `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="currentColor" opacity="${a}" ${extra || ''}/>`;
  const ROOM = {
    // the dining room of the inn: plank wall, two frosted windows with snow outside, the big hearth, beams, a hanging lamp, shelves; tables and benches in front
    inn: (ww, wh, gy) => {
      let far = R(0, 0, ww, gy, .22);
      for (let y = 40; y < gy; y += 46) far += R(0, y, ww, 3, .18);
      const win = x => { let d = `<rect x="${x}" y="${gy - 760}" width="300" height="400" fill="#c9d3e3" opacity=".85"/>`; for (let i = 0; i < 14; i++) d += `<circle cx="${x + 20 + (i * 97) % 270}" cy="${gy - 740 + (i * 61) % 380}" r="${3 + i % 3}" fill="#fffaf0" opacity=".9"/>`; d += R(x - 18, gy - 778, 336, 18, .85) + R(x - 18, gy - 360, 336, 22, .85) + R(x - 18, gy - 778, 18, 440, .85) + R(x + 300, gy - 778, 18, 440, .85) + R(x + 141, gy - 760, 16, 400, .85) + R(x, gy - 566, 300, 14, .85); return d; };
      for (let x = 260; x < ww - 300; x += 1100) far += win(x);
      for (let x = 0; x < ww; x += 520) far += R(x, 0, 24, gy, .45);
      far += R(0, 0, ww, 70, .7);
      let mid = '';
      // the hearth in the middle: a stone arch, the fire's mouth dark with a glow
      const hx = ww / 2 - 330;
      mid += `<path fill="currentColor" opacity=".88" d="M${hx} ${gy} V${gy - 520} H${hx + 660} V${gy} H${hx + 540} V${gy - 260} Q${hx + 330} ${gy - 400} ${hx + 120} ${gy - 260} V${gy} Z"/>`;
      mid += R(hx - 50, gy - 560, 760, 46, .92) + R(hx + 60, gy - 1000, 540, 440, .75);
      for (let i = 0; i < 9; i++) mid += R(hx + (i % 3) * 220 + (i % 2) * 40, gy - 500 + Math.floor(i / 3) * 80, 150, 8, .25, 'style="fill:var(--paper)"');
      mid += `<path d="M${hx + 170} ${gy} Q${hx + 230} ${gy - 120} ${hx + 280} ${gy - 60} Q${hx + 330} ${gy - 190} ${hx + 380} ${gy - 70} Q${hx + 440} ${gy - 140} ${hx + 490} ${gy} Z" fill="var(--lamp)" opacity=".95"/>`;
      // shelves with jugs and bottles at the sides; a hanging lamp
      const shelf = x => { let d = R(x, gy - 600, 380, 14, .9) + R(x, gy - 420, 380, 14, .9); for (let i = 0; i < 6; i++) { const bx = x + 20 + i * 60, tall = 50 + (i * 37) % 60; d += `<path fill="currentColor" opacity=".9" d="M${bx} ${gy - 600} v-${tall - 20} q0 -12 10 -16 v-10 h10 v10 q10 4 10 16 v${tall - 20} z"/>`; } return d; };
      mid += shelf(120) + shelf(ww - 520);
      mid += `<path fill="none" stroke="currentColor" stroke-width="5" opacity=".8" d="M${ww * .74} 0 V${gy - 820}"/><path fill="currentColor" opacity=".9" d="M${ww * .74 - 40} ${gy - 820} h80 l-14 90 h-52 z"/><circle cx="${ww * .74}" cy="${gy - 760}" r="18" fill="var(--lamp)"/>`;
      let near = '';
      const table = (x, w) => R(x, gy - 230, w, 26, .95) + R(x + 30, gy - 210, 24, 210, .95) + R(x + w - 54, gy - 210, 24, 210, .95);
      const stool = x => R(x, gy - 130, 90, 16, .95) + R(x + 10, gy - 120, 14, 120, .95) + R(x + 66, gy - 120, 14, 120, .95);
      for (let x = 140; x < ww - 400; x += 900) near += table(x, 460) + stool(x - 120) + stool(x + 500) + `<path fill="currentColor" d="M${x + 120} ${gy - 230} v-60 q0 -14 12 -14 h36 q12 0 12 14 v60 z"/><path fill="currentColor" d="M${x + 300} ${gy - 230} v-36 h40 v36 z"/>`;
      return { far: svgL(ww, gy, far), mid: svgL(ww, gy, mid), near: svgL(ww, gy, near), floor: 'stage' };
    },
    // the chapel: tall arched windows of grey light, a row of candles, pews, the altar
    chapel: (ww, wh, gy) => {
      let far = R(0, 0, ww, gy, .32);
      for (let y = 30; y < gy; y += 70) for (let x = (y / 70 % 2) * 60; x < ww; x += 120) far += R(x, y, 116, 66, .06, 'style="fill:var(--paper)"');
      const arch = x => `<path fill="#d3d8e0" opacity=".8" d="M${x} ${gy - 260} V${gy - 820} Q${x + 110} ${gy - 1000} ${x + 220} ${gy - 820} V${gy - 260} Z"/>` + R(x + 104, gy - 900, 12, 640, .8) + R(x, gy - 560, 220, 10, .8);
      for (let x = 320; x < ww - 300; x += 700) far += arch(x);
      let mid = '';
      mid += R(ww / 2 - 260, gy - 300, 520, 300, .9) + R(ww / 2 - 300, gy - 320, 600, 30, .95) + R(ww / 2 - 12, gy - 700, 24, 380, .95) + R(ww / 2 - 110, gy - 600, 220, 24, .95);
      for (let i = 0; i < 7; i++) { const x = ww / 2 - 420 + i * 140; mid += R(x, gy - 420, 14, 420, .9) + R(x - 16, gy - 430, 46, 12, .9) + `<path fill="var(--lamp)" d="M${x + 7} ${gy - 470} q12 18 0 34 q-12 -16 0 -34z"/>`; }
      let near = '';
      for (let x = 60; x < ww; x += 640) near += R(x, gy - 200, 520, 40, .96) + R(x, gy - 330, 30, 330, .96) + R(x + 490, gy - 330, 30, 330, .96) + R(x, gy - 330, 520, 24, .96);
      return { far: svgL(ww, gy, far), mid: svgL(ww, gy, mid), near: svgL(ww, gy, near), floor: 'scriptorium' };
    },
  };

  /* ---------- shot types ---------- */
  // a tall narrow screen (a phone held upright): people are framed a little looser, with more room above the head (the bar of buttons sits there)
  const narrow = () => { const e = document.getElementById('stage'); return !!e && e.clientWidth < e.clientHeight; };
  const K = { headY, aim, at, ch, L, PROP, puffs, drawPuffs, sparks, drawSparks, narrow };
  // a place: 'inn' (outside), 'inn/in' (the dining room), 'chapel/in'
  const place = (loc) => { const [l, inside] = String(loc || '').split('/'); return inside ? { loc: l, room: (ROOM[l === 'tower' ? 'chapel' : l] || null) } : { loc: l }; };
  K.place = place; K.ROOM = ROOM;

  // a person speaking, from the waist up: who, loc, side ('L' puts them on the left third, facing right), the background blurred
  // o: { loc, night, side, low (camera below eye line), push, lamp: {lx,ly}, others: [ids, blurred, behind], fg: id (a shoulder in the foreground), warm, cold, zoom }
  K.mcu = o => ({
    tr: o.tr || 'cut',
    build(c) {
      const id = o.who || c.shot.who, w = new World(Object.assign({ st: c.st, night: o.night }, place(o.loc), { ww: 2600, wh: 1500, gy: 1000, blurBg: o.blurBg != null ? o.blurBg : 11 }));
      w.puppet('s', id, { rod: false });
      (o.others || []).forEach((k, i) => w.puppet('o' + i, k));
      if (o.fg) w.puppet('fg', o.fg, { rod: false, layer: 'fg' });
      if (o.warm) w.box.classList.add('lit');
      return { w, id, c0: ch(c, id), sn: o.snow ? makeSnow(o.snow) : null };
    },
    draw(S, t, c, f) {
      const w = S.w, side = o.side || 'R', sg = side === 'L' ? -1 : 1, nr = narrow(), h = (o.h || 2400) * (nr ? .78 : 1);
      const px = 1300 + sg * 240, py = 1000 + h * .62;
      const hy = w.head('s', py, h);
      (o.others || []).forEach((k, i) => w.place('o' + i, { x: px - sg * (520 + i * 420), y: 1050, h: 900, blur: 9, op: .85, face: sg }, t));
      w.people.s.lift = f.talk * 5;
      w.place('s', { x: px, y: py, h, blur: .3, face: -sg, still: true, rot: noise1(t * .2, 4) * .4 }, t);
      if (o.fg) w.place('fg', { x: px - sg * 900, y: 1000 + 3200 * .7, h: 3200, blur: 20, face: sg, op: .97, still: true }, t);
      const k = glide(t, o.tau || 7), b = breath(t, 6, 9), z = lerp(o.z0 || 1, o.z1 || 1.08, k);
      const P0 = w.people.s, top = ((P0.hc || .3) - (P0.ht || .2)) * h * z;   // keep the top of the hat inside the picture
      const FX = W / 2 + sg * W * .17, FY = Math.max(o.FY || (o.low ? 380 : 330), top + (nr ? 190 : 70) - (o.low ? 120 * z : 0));
      aim(w, px + b.x, hy + b.y + (o.low ? 120 : 0), FX, FY, z, o.low ? sg * -.6 : 0);
      const lx = .5 + sg * (o.lampSide === 'back' ? .3 : -.12), ly = .3;
      if (o.night) L.night(w, { lx, ly: .1 }); else if (o.cold) L.cold(w, { lx }); else L.warm(w, t, { lx, ly, seed: 5, dark: o.dark || .72, r: 58 });
      if (S.sn) return { fx: FX, fy: FY + 80, snow: [S.sn] };
      return { fx: FX, fy: FY + 80 };
    },
  });
  // a very close face (eyes and brow fill the top of the frame)
  K.ecu = o => K.mcu(Object.assign({ h: 3300, z0: 1, z1: 1.05, tau: 9, blurBg: 18, FY: 470 }, o));


  // a wide view of a place, the camera travelling from one framing to another and settling
  // o: { loc, night, ww, gy, from: [x,y,z], to: [x,y,z], tau, light: 'day'|'cold'|'warm'|'night', snow, people: [{id,x,y?,h,face,blur,walk:[x0,x1,t0,t1]}], fx, fy, fg: svg html for a dark foreground shape }
  K.est = o => ({
    tr: o.tr || 'cut', trDur: o.trDur,
    build(c) {
      const w = new World(Object.assign({ st: c.st, night: o.night }, place(o.loc), { ww: o.ww || 2400, wh: o.wh || 1500, gy: o.gy || 1240, blurBg: o.blurBg }));
      (o.people || []).forEach((p, i) => { const id = typeof p.id === 'function' ? p.id(c) : p.id; if (id) w.puppet('p' + i, id); });
      if (o.fg) w.add('fg', o.fg.html, { x: o.fg.x, y: o.fg.y, w: o.fg.w, h: o.fg.h, blur: o.fg.blur || 6, ox: 0, oy: 0 });
      const S = { w, sn: o.snow === false ? null : [makeSnow(Object.assign({ n: 140, speed: .55, wind: 16, min: 2, max: 8, seed: 3 }, o.snow || {})), makeSnow({ n: 12, speed: 1.2, wind: 36, min: 14, max: 32, op: .4, seed: 9 })] };
      if (o.build) o.build(S, c);
      return S;
    },
    draw(S, t, c, f) {
      const w = S.w, k = clamp(glide(t, o.tau || 6, o.ease || 1.2), 0, 1), b = breath(t, 4, 3), a = o.from, z = o.to;
      w.camera(lerp(a[0], z[0], k) + b.x, lerp(a[1], z[1], k) + b.y, lerp(a[2], z[2], k), o.roll ? lerp(o.roll[0], o.roll[1], k) : 0);
      (o.people || []).forEach((p, i) => {
        if (!w.people['p' + i]) return;
        let x = p.x, walk = 0;
        if (p.walk) { const q = seg(t, p.walk[2], p.walk[3]); x = lerp(p.walk[0], p.walk[1], E.io(q)); walk = Math.min(1, q * 6, (1 - q) * 6); }
        w.place('p' + i, { x, y: p.y || (o.gy || 1240) + 20, h: p.h || 520, face: p.face, blur: p.blur || .4, op: p.op, walk, rot: p.rot, still: p.still }, t);
      });
      const lt = o.light || 'cold';
      if (lt === 'night') L.night(w, o.lamp); else if (lt === 'warm') L.warm(w, t, o.lamp); else if (lt === 'day') L.day(w, o.lamp); else L.cold(w, o.lamp);
      const r = o.draw ? o.draw(S, t, c, f, k) || {} : {};
      return Object.assign({ fx: o.fx || W / 2, fy: o.fy || 420, snow: S.sn }, r);
    },
  });

  // across a row of faces at a table: the camera trucks sideways, the focus passing from face to face
  // o: { loc, ids: ctx => [ids], dir: 1|-1, warm }
  K.crowd = o => ({
    tr: o.tr || 'cut',
    build(c) {
      const ids = (o.ids ? o.ids(c) : c.people).slice(0, o.max || 7);
      const w = new World(Object.assign({ st: c.st, night: o.night }, place(o.loc), { ww: 3400, wh: 1500, gy: 1000, blurBg: 14 }));
      ids.forEach((id, i) => w.puppet('c' + i, id, { rod: i % 2 === 1 }));
      w.box.classList.add('lit');
      return { w, ids };
    },
    draw(S, t, c, f) {
      const w = S.w, n = S.ids.length, dir = o.dir || 1;
      const k = glide(t, o.tau || 9, 1), camx = lerp(dir > 0 ? 900 : 2500, dir > 0 ? 2500 : 900, k);
      S.ids.forEach((id, i) => {
        const front = i % 2 === 1, x = 500 + i * (2400 / Math.max(1, n - 1));
        const h = front ? 2300 : 1500, y = front ? 1000 + h * .55 : 1000 + h * .42;
        const fx = (x - camx) * 1 + W / 2, dx = Math.abs(fx - W * (dir > 0 ? .58 : .42));
        w.place('c' + i, { x, y, h, blur: clamp(dx / 70 - 1.5, .3, front ? 16 : 9) + (front ? 0 : 1.5), op: front ? 1 : .86, face: x < camx ? 1 : -1 }, t);
      });
      w.camera(camx, 760, 1, 0);
      L.warm(w, t, { lx: .58, ly: .34, seed: 11, dark: o.dark || .66, r: 70, ba: .34 });
      return { fx: W * (dir > 0 ? .58 : .42), fy: 360 };
    },
  });

  // a thing seen close: props in the foreground over a blurred, lit place
  // o: { loc, items: [{ svg, x, y, w, h, blur, layer, rot }], from, to, tau, lamp, draw }
  K.insert = o => ({
    tr: o.tr || 'cut', trDur: o.trDur,
    build(c) {
      const w = new World(Object.assign({ st: c.st, night: o.night }, place(o.loc), { ww: 2400, wh: 1500, gy: 1100, blurBg: o.blurBg != null ? o.blurBg : 16 }));
      const it = (o.items || []).map(p => w.add(p.layer || 'cast', p.svg, { x: p.x, y: p.y, w: p.w, h: p.h, blur: p.blur || 0, rot: p.rot || 0, z: 5000 }));
      w.box.classList.add('lit');
      const S = { w, it };
      if (o.build) o.build(S, c);
      return S;
    },
    draw(S, t, c, f) {
      const w = S.w, k = clamp(glide(t, o.tau || 8, 1), 0, 1), b = breath(t, 3, 7), a = o.from, z = o.to;
      w.camera(lerp(a[0], z[0], k) + b.x, lerp(a[1], z[1], k) + b.y, lerp(a[2], z[2], k));
      if (o.cold) L.cold(w, o.lamp); else L.warm(w, t, Object.assign({ lx: .4, ly: .35, seed: 21, dark: .72 }, o.lamp || {}));
      const r = o.draw ? o.draw(S, t, c, f, k) || {} : {};
      return Object.assign({ fx: o.fx || W / 2, fy: o.fy || 420 }, r);
    },
  });

  // a person coming into the picture to be seen, one after another (the cast's first appearance)
  // four ways of seeing them, in turn: from the right, from the left, from below, against the light
  K.portrait = o => ({
    tr: 'cut',
    build(c) {
      const id = c.shot.who, i = Math.max(0, c.people.indexOf(id)), v = (o && o.order ? o.order : [0, 1, 2, 3])[i % 4];
      const w = new World(Object.assign({ st: c.st }, place((o && o.loc) || 'inn/in'), { ww: 2600, wh: 1500, gy: 1000, blurBg: v === 3 ? 20 : 13 }));
      // the ones already introduced stand behind, out of focus
      const before = c.people.slice(Math.max(0, i - 3), i);
      before.forEach((k, j) => w.puppet('b' + j, k));
      w.puppet('s', id, { rod: false });
      w.box.classList.add('lit');
      return { w, id, v, before, c0: ch(c, id) };
    },
    draw(S, t, c, f) {
      const w = S.w, v = S.v, sg = v === 1 ? -1 : 1, nr = narrow(), h = (v === 2 ? 2700 : 2300) * (S.c0 && S.c0.look && S.c0.look.body === 'child' ? 1.3 : 1) * (nr ? .78 : 1);
      const enter = E.o3(seg(t, 0, 1.1)), px0 = 1300 + sg * 260, px = px0 + sg * (1 - enter) * 520;
      const py = 1000 + h * (v === 2 ? .7 : .62), hy = w.head('s', py, h);
      S.before.forEach((k, j) => w.place('b' + j, { x: px0 - sg * (560 + j * 380), y: 1060, h: 950, blur: 8, op: .8, face: sg }, t));
      w.people.s.lift = f.talk * 5;
      // the walk fades out as they arrive (no switch from walking to standing: that was a visible jolt)
      const wk = 1 - E.s(seg(t, .55, 1.25));
      w.place('s', { x: px, y: py, h, blur: v === 3 ? .2 : .3, face: -sg, walk: wk, rot: noise1(t * .2, 3) * .4 }, t);
      const k = glide(t, 8, 1), b = breath(t, 5, 13);
      const z = lerp(1, v === 2 ? 1.04 : 1.07, k), P0 = w.people.s, top = ((P0.hc || .3) - (P0.ht || .2)) * h * z;
      const FX = W / 2 + sg * W * .16, FY = Math.max(v === 2 ? 400 : 330, top + (nr ? 190 : 70) - (v === 2 ? 130 * z : 0));
      aim(w, px0 + b.x, hy + b.y + (v === 2 ? 130 : 0), FX, FY, z, v === 2 ? -sg * .8 : 0);
      if (v === 3) { L.warm(w, t, { lx: .5 + sg * .17, ly: .24, seed: 31, dark: .8, r: 52, ba: .7, br: 1100 }); }
      else L.warm(w, t, { lx: .5 - sg * .1, ly: .3, seed: 17 + v, dark: .62 });
      return { fx: FX, fy: FY + 80 };
    },
  });

  root.WLTheaterKit = K;
})(typeof window !== 'undefined' ? window : globalThis);
