/* =====================================================================
   senet/board2d.js — セネトの2D盤・駒・投げ棒（window.SenetBoard2D、依存なし）
   盤は3×10。道は逆S字（1〜10 上段 左→右、11〜20 中段 右→左、21〜30 下段 左→右）。
   SVG の単位：1マス＝100。
     h（横）：マス (r,c) の中心 ((c−4.5)·100, (r−1)·100)。盤の上下に帯：上＝黒（side 1）、下＝白（side 0）。帯の右に上がった駒。
     v（縦）：マス (r,c) の中心 ((1−r)·100, (c−4.5)·100)（h を時計回りに90°回した形、1 が右上）。盤の左右に列：左＝黒、右＝白。
   盤の絵は SVG をその場で組み立て、Blob の画像として1回だけ描く（フィルターの質感はキャッシュされる）。
   盤：'tut'（ツタンカーメンの黒檀と象牙・既定）| 'faience'（アメンホテプ3世の青いファイアンス）| 'papyrus'（墓の壁画）| 'night'（ナイル夜空・モダン）
   駒：'tut'（象牙の糸巻き×黒檀の円錐）| 'faience'（白×青のファイアンス）| 'gold'（金×ラピス）| 'modern'（シャンパン×オブシディアン）
   API は ur/board2d.js と同じ形（mount / render / animateMove / cellRect / offRect / cellXY / mini / dice）。
   ===================================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const BOARDS = ['tut', 'faience', 'papyrus', 'night'], PIECES = ['tut', 'faience', 'gold', 'modern'];
  const GREEN = '#3df59a', GREEN_EDGE = '#06331d';
  const IMG = { h: [-540, -190, 1080, 380], v: [-190, -540, 380, 1080] };
  const VIEW = { h: [-552, -292, 1104, 584], v: [-292, -552, 584, 1104] };
  const PD = 84, TD = 62;   // 盤上の駒／置き場の駒の大きさ
  const GOAL = 31;
  let uid = 0;
  const OB = o => (o && o[0] === 'v') ? 'v' : 'h';
  const cellXY = (o, r, c) => OB(o) === 'v' ? [(1 - r) * 100, (c - 4.5) * 100] : [(c - 4.5) * 100, (r - 1) * 100];   // (v = the h board turned a quarter clockwise: row 0 on the right)
  const sqRC = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return [r, r === 1 ? 9 - k : k]; };
  const sqXY = (o, i) => cellXY(o, ...sqRC(i));
  const exists = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 10;
  // 上がった駒の置き場：h＝帯の右側に横一列（白は下、黒は上）、v＝列の下側に縦一列（白は右、黒は左）
  function traySlots(o, side, kind, n = 7) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = 520 - 34 - i * 68, b = side ? -246 : 246;
      out.push(OB(o) === 'v' ? [b, a] : [a, b]);
    }
    return out;
  }
  function trayBox(o, side) {
    const s = traySlots(o, side, 'goal'), xs = s.map(p => p[0]), ys = s.map(p => p[1]), m = TD / 2 + 8;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    return [x0, y0, x1 - x0, y1 - y0];
  }
  // 投げ棒の置き場（帯の左側）
  function stickBox(o, side) { const b = [-530, side ? -290 : 202, 470, 88]; return OB(o) === 'v' ? [b[1], b[0], b[3], b[2]] : b; }
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const tween = (ms, f) => new Promise(res => { const t0 = performance.now(); const step = now => { const t = Math.min(1, (now - t0) / Math.max(1, ms)); f(t); t < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  const rc = v => v == null ? null : Array.isArray(v) ? { r: v[0], c: v[1] } : (v.sq != null ? (() => { const [r, c] = sqRC(v.sq); return Object.assign({ r, c }, v); })() : v);

  /* ================================================================ board art */
  const PAL = {
    tut: { frame: '#140c07', frame2: '#2b1a10', gild: '#d7ae55', sq: '#f1e4c4', sq2: '#d6bf8e', line: '#1a0f08', ink: '#2a170c', num: 'rgba(60,35,15,.38)', glyph: '#2c180c', accent: '#8a2d1c' },
    faience: { frame: '#0c3a52', frame2: '#12577a', gild: '#e8d9a6', sq: '#5cc3d6', sq2: '#2690b4', line: '#0b1f33', ink: '#0b1c2c', num: 'rgba(5,20,40,.42)', glyph: '#0a1a2a', accent: '#e8d9a6' },
    papyrus: { frame: '#cdb487', frame2: '#b9955e', gild: '#a8442c', sq: '#ecdcb4', sq2: '#d9c18e', line: '#4a2c18', ink: '#2a1d14', num: 'rgba(80,45,15,.4)', glyph: '#2c4a8a', accent: '#3d7a6e' },
    night: { frame: '#0a1030', frame2: '#141c4a', gild: '#e2c27a', sq: '#18225a', sq2: '#111a48', line: '#e2c27a', ink: '#e2c27a', num: 'rgba(226,194,122,.45)', glyph: '#f0d58e', accent: '#3fb6c8' },
  };
  // ヒエログリフ風の印（1マス＝100の中、中心原点、上向き）
  function glyph(kind, col, design) {
    const sw = design === 'night' ? 3.2 : 0, f = design === 'night' ? 'none' : col, st = design === 'night' ? col : 'none';
    const P = (d, extra = '') => `<path d="${d}" fill="${f}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
    switch (kind) {
      case 'rebirth':   // アンク
        return `<g>${P('M0 -6 C-15 -8 -17 -34 0 -36 C17 -34 15 -8 0 -6 Z M0 -12 C8 -14 9 -29 0 -30 C-9 -29 -8 -14 0 -12 Z', 'fill-rule="evenodd"')}${P('M-19 -6 H19 V1 H4 V32 H-4 V1 H-19 Z')}</g>`;
      case 'beauty': {  // ネフェル（美しい）×3
        const one = x => `<g transform="translate(${x} 0)">${P('M-7 -2 C-11 8 -9 22 0 24 C9 22 11 8 7 -2 Z')}${P('M-2 -2 V-28 H2 V-2 Z M-7 -20 H7 V-16 H-7 Z')}</g>`;
        return one(-22) + one(0) + one(22);
      }
      case 'water': {   // 水（ジグザグ3本）
        const z = y => { let d = `M-30 ${y}`; for (let i = 0; i < 8; i++) d += ` L${-30 + (i + .5) * 7.5} ${y + (i % 2 ? 5 : -5)}`; return d + ` L30 ${y}`; };
        return [-14, 0, 14].map(y => `<path d="${z(y)}" fill="none" stroke="${col}" stroke-width="${design === 'night' ? 3.4 : 4.4}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
      }
      case 'three': return [-16, 0, 16].map(x => P(`M${x - 3.5} -22 H${x + 3.5} V22 H${x - 3.5} Z`)).join('');
      case 'two': return [-9, 9].map(x => P(`M${x - 3.5} -22 H${x + 3.5} V22 H${x - 3.5} Z`)).join('');
      case 'horus':     // ウジャトの目
        return `<g>${P('M-28 -2 C-16 -16 16 -16 28 -2 C16 8 -16 8 -28 -2 Z')}<circle cx="0" cy="-3" r="${design === 'night' ? 6 : 7}" fill="${design === 'night' ? col : (design === 'tut' ? '#ecdcb6' : '#fff8e6')}"/>${P('M-26 -14 C-10 -24 12 -24 28 -13 L27 -10 C12 -19 -10 -20 -25 -11 Z')}${P('M-4 6 L-6 24 L-1 24 L1 7 Z')}${P('M4 6 C10 14 16 22 24 20 C26 26 14 28 8 18 Z')}</g>`;
    }
    return '';
  }
  function boardSVG(design, o) {
    const p = PAL[design] || PAL.tut, V = OB(o) === 'v', R = IMG[V ? 'v' : 'h'];
    const id = 'bd';
    let defs = '', body = '';
    // 質感（フィルター）
    if (design === 'tut') defs += `<filter id="${id}w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${V ? '.11 .0035' : '.0035 .11'}" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 .30  0 0 0 0 .19  0 0 0 0 .11  0 0 0 .7 -.28"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="${id}i" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${V ? '.22 .012' : '.012 .22'}" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 .52  0 0 0 0 .40  0 0 0 0 .24  0 0 0 .42 -.12"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    if (design === 'faience') defs += `<filter id="${id}w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="4" seed="11"/><feColorMatrix values="0 0 0 0 .05  0 0 0 0 .25  0 0 0 0 .32  0 0 0 .7 -.22"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="${id}i" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="3" seed="5"/><feColorMatrix values="0 0 0 0 .85  0 0 0 0 .97  0 0 0 0 1  0 0 0 .55 -.22"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    if (design === 'papyrus') defs += `<filter id="${id}w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="4" seed="2"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .14  0 0 0 0 .05  0 0 0 .8 -.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="${id}i" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008 .32" numOctaves="2" seed="9" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".32 .008" numOctaves="2" seed="4" result="b"/><feBlend in="a" in2="b" mode="multiply"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .14  0 0 0 .7 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    if (design === 'night') defs += `<filter id="${id}w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .7  0 0 0 9 -8.4"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="${id}i" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .4  0 0 0 0 .9  0 0 0 .35 -.05"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    // the squares lit as slightly domed tiles (blurred alpha → diffuse + specular light): soft bevels, no drawn highlight lines
    if (design !== 'night') defs += `<filter id="${id}lt" x="-2%" y="-5%" width="104%" height="110%"><feGaussianBlur in="SourceAlpha" stdDeviation="${design === 'faience' ? 5 : 3.4}" result="b"/>`
      + `<feDiffuseLighting in="b" surfaceScale="${design === 'faience' ? 6 : 4}" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="${design === 'papyrus' ? 62 : 52}"/></feDiffuseLighting>`
      + `<feSpecularLighting in="b" surfaceScale="${design === 'faience' ? 6 : 4}" specularConstant="${design === 'faience' ? .9 : design === 'tut' ? .45 : .12}" specularExponent="${design === 'faience' ? 26 : 16}" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="${design === 'papyrus' ? 62 : 52}"/></feSpecularLighting>`
      + `<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1=".85" k2=".2" result="m"/><feComposite in="m" in2="s2" operator="arithmetic" k2="1" k3="1"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
    if (design === 'faience') defs += `<filter id="${id}cr" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".07" numOctaves="1" seed="21"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 .8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"/></feComponentTransfer><feColorMatrix values="0 0 0 0 .02  0 0 0 0 .2  0 0 0 0 .3  0 0 0 .32 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    if (design === 'papyrus') defs += `<filter id="${id}rg" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="13" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`
      + `<filter id="${id}pl" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="4" seed="6" result="t"/><feColorMatrix in="t" values="0 0 0 0 .86  0 0 0 0 .78  0 0 0 0 .62  0 0 0 -14 4.75" result="flake"/><feComposite in="flake" in2="SourceGraphic" operator="in"/></filter>`
      + `<filter id="${id}ck" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".012 .02" numOctaves="3" seed="31"/><feComponentTransfer><feFuncA type="table" tableValues="0 .7 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"/></feComponentTransfer><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .16  0 0 0 0 .08  0 0 0 .38 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    defs += `<linearGradient id="${id}sh" x1="0" y1="0" x2="${V ? 1 : 0}" y2="${V ? 0 : 1}"><stop offset="0" stop-color="#fff" stop-opacity="${design === 'faience' ? .28 : .12}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
<radialGradient id="${id}sq" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${p.sq}"/><stop offset="1" stop-color="${p.sq2}"/></radialGradient>`;
    // 枠
    const [fx, fy, fw, fh] = R;
    const rad = design === 'night' ? 26 : design === 'papyrus' ? 10 : 16;
    body += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="${p.frame}"/>`;
    body += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="${p.frame2}" filter="url(#${id}w)"/>`;
    if (design === 'tut') {   // 金の細い縁取り（金属の光り方）と、黒檀の艶（ぼかした光の帯）
      defs += `<linearGradient id="${id}au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".22" stop-color="#f6dc8a"/><stop offset=".4" stop-color="#b98a2e"/><stop offset=".6" stop-color="#fff0b8"/><stop offset=".8" stop-color="#a87a26"/><stop offset="1" stop-color="#e9c66c"/></linearGradient><filter id="${id}gl" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`;
      body += `<ellipse cx="${fx + fw * .32}" cy="${fy + fh * (V ? .5 : .12)}" rx="${V ? fw * .12 : fw * .34}" ry="${V ? fh * .4 : fh * .06}" fill="#fff3d6" opacity=".10" filter="url(#${id}gl)"/>`;
      body += `<rect x="${fx + 10}" y="${fy + 10}" width="${fw - 20}" height="${fh - 20}" rx="10" fill="none" stroke="url(#${id}au)" stroke-width="3.4"/><rect x="${fx + 17}" y="${fy + 17}" width="${fw - 34}" height="${fh - 34}" rx="7" fill="none" stroke="url(#${id}au)" stroke-opacity=".6" stroke-width="1.4"/>`;
    } else if (design === 'faience') {
      defs += `<filter id="${id}gl" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>`;
      body += `<rect x="${fx + 9}" y="${fy + 9}" width="${fw - 18}" height="${fh - 18}" rx="11" fill="none" stroke="#071827" stroke-width="5"/>`;
      body += `<ellipse cx="${fx + fw * .3}" cy="${fy + fh * (V ? .5 : .1)}" rx="${V ? fw * .1 : fw * .3}" ry="${V ? fh * .38 : fh * .05}" fill="#e8fbff" opacity=".22" filter="url(#${id}gl)"/>`;
      // 縁の文様帯（ロータスの点）
      const n = V ? 30 : 30, L = V ? fh : fw;
      for (let i = 0; i < n; i++) { const t = (i + .5) / n * (L - 40) + 20; const pts = V ? [[fx + 22, fy + t], [fx + fw - 22, fy + t]] : [[fx + t, fy + 22], [fx + t, fy + fh - 22]]; for (const [x, y] of pts) body += `<circle cx="${x}" cy="${y}" r="3.2" fill="${p.gild}" opacity=".75"/>`; }
    } else if (design === 'papyrus') {
      // 墓の壁画：漆喰の壁に描いた盤（ネフェルタリ墓の壁画のように）。ベンガラの赤・エジプシャンブルー・黄土の帯（手描きの揺れ）、
      // 漆喰のむら、剥落、細いひび
      body += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="#e3d2ad"/><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="#b7955c" filter="url(#${id}w)" opacity=".7"/>`;
      let band = `<rect x="${fx + 9}" y="${fy + 9}" width="${fw - 18}" height="${fh - 18}" rx="4" fill="none" stroke="#2c4a8a" stroke-opacity=".85" stroke-width="7"/><rect x="${fx + 19}" y="${fy + 19}" width="${fw - 38}" height="${fh - 38}" rx="3" fill="none" stroke="#a8442c" stroke-opacity=".85" stroke-width="6"/><rect x="${fx + 27}" y="${fy + 27}" width="${fw - 54}" height="${fh - 54}" rx="2" fill="none" stroke="#c9952e" stroke-opacity=".8" stroke-width="3"/>`;
      const n = 34, L = V ? fh : fw;
      for (let i = 0; i < n; i++) { const t = (i + .5) / n * (L - 50) + 25; const c = ['#a8442c', '#3d7a6e', '#2c4a8a'][i % 3]; const pts = V ? [[fx + 14, fy + t], [fx + fw - 14, fy + t]] : [[fx + t, fy + 14], [fx + t, fy + fh - 14]]; for (const [x, y] of pts) band += V ? `<rect x="${x - 2.5}" y="${y - 5}" width="5" height="10" fill="${c}" opacity=".8"/>` : `<rect x="${x - 5}" y="${y - 2.5}" width="10" height="5" fill="${c}" opacity=".8"/>`; }
      body += `<g filter="url(#${id}rg)">${band}</g>`;
        } else if (design === 'night') {
      body += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="#fff" filter="url(#${id}w)" opacity=".9"/>`;   // 星
      body += `<rect x="${fx + 12}" y="${fy + 12}" width="${fw - 24}" height="${fh - 24}" rx="18" fill="none" stroke="${p.gild}" stroke-width="2.2"/><rect x="${fx + 20}" y="${fy + 20}" width="${fw - 40}" height="${fh - 40}" rx="13" fill="none" stroke="${p.gild}" stroke-opacity=".4" stroke-width="1"/>`;
    }
    // マス
    const gap = design === 'night' ? 6 : 5;
    let tiles = '', marks = '', nums = '';
    const rnd = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // the same "random" tone per square every time
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
      const [x, y] = cellXY(o, r, c), sq = r * 10 + (r === 1 ? 9 - c : c) + 1;
      const x0 = x - 50 + gap, y0 = y - 50 + gap, w = 100 - 2 * gap;
      if (design === 'night') {
        const sp = sq === 15 || sq >= 26;
        tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="9" fill="url(#${id}sq)" stroke="${p.line}" stroke-opacity="${sp ? .95 : .55}" stroke-width="${sp ? 2.4 : 1.4}"/>`;
        tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="9" fill="#fff" filter="url(#${id}i)"/>`;
      } else {
        const rr = design === 'papyrus' ? 2 : design === 'faience' ? 7 : 4, k = rnd(sq);
        tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${rr}" fill="url(#${id}sq)"/>`;
        // each tile its own tone (aged ivory, uneven glaze, hand-mixed paint)
        tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${rr}" fill="${k < .5 ? '#7a5426' : '#fffaf0'}" opacity="${(design === 'faience' ? .10 : .07) * Math.abs(k - .5) * 2 + .015}"/>`;
        tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${rr}" fill="#fff" filter="url(#${id}i)"/>`;
        if (design === 'faience') tiles += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${rr}" fill="#fff" filter="url(#${id}cr)"/>`;
        marks += `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${rr}" fill="none" stroke="${p.line}" stroke-opacity="${design === 'papyrus' ? .8 : .55}" stroke-width="${design === 'papyrus' ? 2.6 : 1.6}"/>`;
      }
      const g = { 15: 'rebirth', 26: 'beauty', 27: 'water', 28: 'three', 29: 'two', 30: 'horus' }[sq];
      if (g) {
        if (design === 'papyrus') { const ac = { rebirth: '#a8442c', beauty: '#3d7a6e', water: '#2c4a8a', three: '#a8442c', two: '#3d7a6e', horus: '#a8442c' }[g]; marks += `<rect x="${x0 + 4}" y="${y0 + 4}" width="${w - 8}" height="${w - 8}" rx="2" fill="none" stroke="${ac}" stroke-width="2.6" opacity=".7"/>`; }
        const gc = g === 'water' && design === 'papyrus' ? '#2c4a8a' : g === 'water' && design === 'tut' ? '#1f3a6a' : g === 'rebirth' && design === 'papyrus' ? '#a8442c' : p.glyph;
        marks += `<g transform="translate(${x} ${y + 2})" opacity="${design === 'tut' ? .9 : design === 'papyrus' ? .88 : .95}">${glyph(g, gc, design)}</g>`;
      }
      // マス番号（目立たない）
      nums += `<text x="${x0 + 7}" y="${y0 + 17}" font-size="13" font-weight="700" fill="${p.num}" font-family="system-ui,sans-serif">${sq}</text>`;
    }
    if (design === 'night') body += tiles + marks;
    else if (design === 'papyrus') {   // the board itself stays a clean painted board; only its surround is the tomb wall (worn, cracked)
      const [ix, iy] = cellXY(o, 0, 0), [jx, jy] = cellXY(o, 2, 9), qx = Math.min(ix, jx) - 62, qy = Math.min(iy, jy) - 62, qw = Math.abs(jx - ix) + 124, qh = Math.abs(jy - iy) + 124;
      // the board: a painted wooden panel set into the wall (its own shadow on the plaster, a thin ochre edge)
      body += `<rect x="${qx + 3}" y="${qy + 5}" width="${qw}" height="${qh}" rx="6" fill="#3a2412" opacity=".35" filter="url(#${id}sf)"/><rect x="${qx}" y="${qy}" width="${qw}" height="${qh}" rx="6" fill="#6e4122"/><rect x="${qx}" y="${qy}" width="${qw}" height="${qh}" rx="6" fill="#8b5530" filter="url(#${id}wd)"/><rect x="${qx + 2}" y="${qy + 2}" width="${qw - 4}" height="${qh - 4}" rx="5" fill="none" stroke="#c9952e" stroke-width="2.5" opacity=".8"/>`;
      defs += `<filter id="${id}sf" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="6"/></filter><filter id="${id}wd" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${V ? '.12 .006' : '.006 .12'}" numOctaves="4" seed="5"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .16  0 0 0 0 .07  0 0 0 .8 -.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
      body += `<g filter="url(#${id}lt)">${tiles}</g>${marks}`;
      defs += `<mask id="${id}fr"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#fff"/><rect x="${qx}" y="${qy}" width="${qw}" height="${qh}" rx="6" fill="#000"/></mask>`;
      body += `<g mask="url(#${id}fr)"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="#fff" filter="url(#${id}pl)" opacity=".7"/><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="#fff" filter="url(#${id}ck)"/></g>`;
    } else body += `<g filter="url(#${id}lt)">${tiles}</g>${marks}`;
    body += nums;
    if (design !== 'papyrus') body += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${rad}" fill="url(#${id}sh)"/>`;
    return `<svg xmlns="${NS}" viewBox="${R.join(' ')}" width="${R[2]}" height="${R[3]}"><defs>${defs}</defs>${body}</svg>`;
  }
  const artCache = new Map();
  function boardHref(design, o) {
    const k = (BOARDS.includes(design) ? design : 'tut') + OB(o);
    if (!artCache.has(k)) {
      const s = boardSVG(k.slice(0, -1), OB(o));
      let u; try { u = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); } catch (e) { u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }
      artCache.set(k, u);
    }
    return artCache.get(k);
  }

  /* ================================================================ pieces */
  // 糸巻き（白側）と円錐（黒側）を少し斜め上から見た形。viewBox 0 0 100 100、足もとは (50, 82)
  const PSTY = {   // [highlight, body, shade, edge] per side; mat: how the surface takes the light
    tut: [['#fff9e8', '#efe0bb', '#b8955f', '#5c4224'], ['#6b4a30', '#3a2516', '#170d06', '#000']],
    faience: [['#ffffff', '#eef1e8', '#a9b4a8', '#4f5c54'], ['#8fe0f2', '#2f9fd0', '#0d5684', '#04223a']],
    gold: [['#fff7cf', '#efc552', '#a8761c', '#4d3005'], ['#6f8cf0', '#2c48b8', '#14236c', '#050b2c']],
    modern: [['#fffaf0', '#ead7b4', '#b79a6c', '#5b4527'], ['#5b5f6e', '#2c2f3a', '#14151c', '#000']],
  };
  const PMAT = { tut: ['ivory', 'ebony'], faience: ['glaze', 'glaze'], gold: ['metal', 'glaze'], modern: ['matte', 'matte'] };
  // spool (Light) and cone (Dark) seen a little from above. viewBox 0 0 100 100, standing at (50, 82). Shaded as turned, rounded
  // solids: a cylindrical light across (key light upper left, a rim light on the right), darker toward the foot, a soft specular
  // streak (blurred, not a hard shape) and the material's own surface (ivory grain, ebony grain, glaze pooling, metal bands)
  // the pieces and sticks are pictures of the 3D models (senet/sprites.js, made by senet/tools/make_sprites.py): real turned
  // ivory, ebony, glaze and gold; the vector drawings below are only the fallback when sprites.js is not loaded
  const SPR = k => (window.SENET_SPRITES || {})[k];
  function pieceSVG(p, side, pcs) {
    pcs = PSTY[pcs] ? pcs : 'tut';
    if (SPR(pcs + side)) return `<image href="${SPR(pcs + side)}" x="0" y="0" width="100" height="100"/>`;
    const [hi, mid, lo, edge] = PSTY[pcs][side], mat = PMAT[pcs][side], g = `${p}g${side}`, k = `${p}k${side}`, v = `${p}v${side}`, f = `${p}f${side}`, t = `${p}t${side}`, n = `${p}n${side}`;
    const metal = mat === 'metal', glaze = mat === 'glaze', matte = mat === 'matte';
    const across = metal
      ? `<stop offset="0" stop-color="${edge}"/><stop offset=".12" stop-color="${lo}"/><stop offset=".26" stop-color="${hi}"/><stop offset=".34" stop-color="#fffbe6"/><stop offset=".42" stop-color="${mid}"/><stop offset=".62" stop-color="${lo}"/><stop offset=".8" stop-color="${mid}"/><stop offset=".93" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>`
      : `<stop offset="0" stop-color="${lo}"/><stop offset=".1" stop-color="${mid}"/><stop offset=".3" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset=".82" stop-color="${lo}"/><stop offset=".94" stop-color="${mid}" stop-opacity="${matte ? 1 : .9}"/><stop offset="1" stop-color="${lo}"/>`;
    const D = `<linearGradient id="${g}" x1="0" x2="1">${across}</linearGradient>`
      + `<linearGradient id="${v}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${matte ? .05 : .12}"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>`
      + `<radialGradient id="${t}" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="${metal ? '#fffbe6' : hi}"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`
      + `<filter id="${f}" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="${glaze || metal ? 1.1 : 1.8}"/></filter>`
      + `<filter id="${n}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${mat === 'ebony' ? '.9 .06' : mat === 'ivory' ? '.6 .08' : '.35'}" numOctaves="3" seed="${side ? 5 : 9}"/><feColorMatrix values="0 0 0 0 ${mat === 'ebony' ? .55 : mat === 'ivory' ? .45 : .1}  0 0 0 0 ${mat === 'ebony' ? .35 : mat === 'ivory' ? .32 : .2}  0 0 0 0 ${mat === 'ebony' ? .2 : mat === 'ivory' ? .16 : .3}  0 0 0 ${matte || metal ? 0 : mat === 'ebony' ? .7 : mat === 'ivory' ? .32 : .22} ${mat === 'ebony' ? -.3 : -.22}"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
    const ln = matte ? 'none' : edge;
    const tex = d => (matte || metal) ? '' : `<path d="${d}" fill="#fff" filter="url(#${n})"/>`;
    if (side === 0) {   // 糸巻き（スプール）：上下の円盤と、くびれた胴
      const body = 'M28 70 C28 76.5 72 76.5 72 70 L72 62 C66 58 60 52 60 44 C60 38 66 32 72 28 L72 21 C72 15 28 15 28 21 L28 28 C34 32 40 38 40 44 C40 52 34 58 28 62 Z';
      return `<defs>${D}</defs><g>`
        + `<path d="${body}" fill="url(#${g})" stroke="${ln}" stroke-opacity=".45" stroke-width="1.2"/>${tex(body)}<path d="${body}" fill="url(#${v})"/>`
        + `<path d="M28 62 C34 58 40 52 40 44 C40 38 34 32 28 28 L72 28 C66 32 60 38 60 44 C60 52 66 58 72 62 Z" fill="#000" opacity=".10"/>`   // the waist in the discs' shade
        + `<path d="M28.5 62.5 C40 66 60 66 71.5 62.5" fill="none" stroke="${hi}" stroke-opacity="${matte ? .35 : .7}" stroke-width="1.4"/>`   // the lower disc's lit rim
        + `<ellipse cx="50" cy="21" rx="22" ry="6.4" fill="url(#${t})" stroke="${ln}" stroke-opacity=".35" stroke-width="1"/>`
        + `<ellipse cx="50" cy="21.4" rx="15" ry="3.6" fill="#000" opacity="${matte ? .05 : .09}"/>`
        + (pcs === 'faience' ? `<ellipse cx="50" cy="21" rx="11" ry="2.8" fill="#2a95c4" opacity=".7"/><path d="M29 66 C40 69.5 60 69.5 71 66" fill="none" stroke="#2a95c4" stroke-width="3" opacity=".6"/>` : '')
        + (pcs === 'gold' ? `<ellipse cx="50" cy="21" rx="8.5" ry="2.3" fill="#26409e" opacity=".85"/><path d="M29 66 C40 69.5 60 69.5 71 66" fill="none" stroke="#7a5a10" stroke-width="1.2" opacity=".6"/>` : '')
        + (pcs === 'tut' ? `<path d="M29.5 66.5 C40 70 60 70 70.5 66.5" fill="none" stroke="#9c7a48" stroke-width="1" opacity=".6"/><path d="M29.5 25 C40 28.4 60 28.4 70.5 25" fill="none" stroke="#9c7a48" stroke-width="1" opacity=".5"/>` : '')
        + (matte ? '' : `<path d="M35 23 C36 32 40 38 41 44 C40 52 36 58 35 66" fill="none" stroke="#fff" stroke-width="${metal ? 3 : 3.6}" stroke-linecap="round" opacity="${metal ? .85 : glaze ? .75 : .45}" filter="url(#${f})"/>`)
        + (matte ? '' : `<ellipse cx="42" cy="19.6" rx="7" ry="1.8" fill="#fff" opacity="${glaze || metal ? .75 : .4}" filter="url(#${f})"/>`)
        + `</g>`;
    }
    // 円錐（頭が丸い）
    const body = 'M26 72 C26 79 74 79 74 72 L58.5 19 C56 11 44 11 41.5 19 Z';
    return `<defs>${D}</defs><g>`
      + `<path d="${body}" fill="url(#${g})" stroke="${ln}" stroke-opacity=".5" stroke-width="1.2"/>${tex(body)}<path d="${body}" fill="url(#${v})"/>`
      + `<path d="M26.5 72.5 C30 77.5 70 77.5 73.5 72.5" fill="none" stroke="${hi}" stroke-opacity="${matte ? .25 : .5}" stroke-width="1.3"/>`
      + `<circle cx="50" cy="15" r="8.5" fill="url(#${t})" stroke="${ln}" stroke-opacity=".4" stroke-width="1"/>`
      + (pcs === 'faience' ? '<path d="M33.5 56 C42 58.5 58 58.5 66.5 56" fill="none" stroke="#06263d" stroke-width="2.4" opacity=".55"/><path d="M38.5 39 C45 40.6 55 40.6 61.5 39" fill="none" stroke="#06263d" stroke-width="2" opacity=".45"/>' : '')
      + (pcs === 'gold' ? '<path d="M32 62 C42 64.5 58 64.5 68 62" fill="none" stroke="#f1c95a" stroke-width="2.4" opacity=".9"/>' : '')
      + (matte ? '' : `<path d="M43.5 22 L35 68" fill="none" stroke="#fff" stroke-width="${glaze ? 3.4 : 3}" stroke-linecap="round" opacity="${glaze ? .6 : mat === 'ebony' ? .32 : .5}" filter="url(#${f})"/>`)
      + `<ellipse cx="46.8" cy="12.2" rx="3.4" ry="2.3" fill="#fff" opacity="${matte ? .22 : glaze ? .8 : .5}" filter="url(#${f})"/>`
      + `</g>`;
  }
  function defs(p, pcs) {
    return `<defs><symbol id="${p}p0" viewBox="0 0 100 100" overflow="visible">${pieceSVG(p, 0, pcs)}</symbol><symbol id="${p}p1" viewBox="0 0 100 100" overflow="visible">${pieceSVG(p, 1, pcs)}</symbol>
<radialGradient id="${p}sh"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".6" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}dg"><stop offset=".55" stop-color="#ff3b30" stop-opacity="0"/><stop offset=".78" stop-color="#ff3b30" stop-opacity=".6"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
<marker id="${p}ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${GREEN}" stroke="${GREEN_EDGE}" stroke-width="1.2"/></marker>
<marker id="${p}ap" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffe27a" stroke="#3a2a00" stroke-width="1"/></marker></defs>`;
  }
  const piecesKey = k => PIECES.includes(k) ? k : 'tut';

  /* ================================================================ layout */
  function layout(state, o) {
    const res = [];
    for (const side of [0, 1]) {
      const ps = state.pos[side], gl = [];
      ps.forEach((p, k) => { if (p >= GOAL) gl.push(k); });
      const G = traySlots(o, side, 'goal', ps.length);
      ps.forEach((p, k) => {
        if (p >= GOAL) res.push({ side, k, pos: p, where: 'goal', xy: G[gl.indexOf(k)], d: TD });
        else { const [r, c] = sqRC(p); res.push({ side, k, pos: p, where: 'board', r, c, xy: cellXY(o, r, c), d: PD }); }
      });
    }
    return { pieces: res, goal: GOAL };
  }
  // 駒の絵：足もとがマスの中心より少し下（立っている感じ）
  const PY = .08;

  /* ================================================================ marks */
  function marksSVG(p, o, state, opt) {
    let s = '';
    const at = v => { v = rc(v); if (!v) return null; if (v.tray) return traySlots(o, v.side || 0, 'goal', 7)[v.slot || 0]; return exists(v.r, v.c) ? cellXY(o, v.r, v.c) : null; };
    const pl = 88;
    if (opt.last) {
      const f = at(opt.last.from), t = at(opt.last.to);
      if (f) s += `<rect x="${f[0] - pl / 2 + 3}" y="${f[1] - pl / 2 + 3}" width="${pl - 6}" height="${pl - 6}" rx="7" fill="rgba(255,214,90,.12)" stroke="#ffd65a" stroke-width="3" stroke-dasharray="9 7" opacity=".9"/>`;
      if (t) s += `<rect x="${t[0] - pl / 2 + 1}" y="${t[1] - pl / 2 + 1}" width="${pl - 2}" height="${pl - 2}" rx="7" fill="none" stroke="#1d1300" stroke-width="7" opacity=".55"/><rect x="${t[0] - pl / 2 + 1}" y="${t[1] - pl / 2 + 1}" width="${pl - 2}" height="${pl - 2}" rx="7" fill="none" stroke="#ffd65a" stroke-width="3.5"/>`;
    }
    for (const m of opt.marks || []) {
      const type = m.type || 'ring';
      if (type === 'path') {   // 道を光る矢印で（マス番号 from → to）
        const a = Math.max(1, m.from || 1), b = Math.min(30, m.to || 30), pts = [];
        for (let i = a; i <= b; i++) pts.push(sqXY(o, i));
        const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join('');
        s += `<path d="${d}" fill="none" stroke="#2a1b00" stroke-width="15" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><path d="${d}" fill="none" stroke="${m.color || '#ffe27a'}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#${p}ap)" stroke-dasharray="${m.dash || 'none'}"/>`;
        continue;
      }
      if (type === 'arrow') {
        const f = at(m.from), t = at(m.to); if (!f || !t) continue;
        const dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy) || 1, sh = 30, x1 = f[0] + dx / L * sh * .6, y1 = f[1] + dy / L * sh * .6, x2 = t[0] - dx / L * sh, y2 = t[1] - dy / L * sh;
        const c = m.color || GREEN, bend = m.bend || 0;
        if (bend) { const mx = (x1 + x2) / 2 - dy / L * bend, my = (y1 + y2) / 2 + dx / L * bend; s += `<path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${GREEN_EDGE}" stroke-width="17" stroke-linecap="round" opacity=".7"/><path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" marker-end="url(#${p}ah)"/>`; }
        else s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN_EDGE}" stroke-width="17" stroke-linecap="round" opacity=".7"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="9" stroke-linecap="round" marker-end="url(#${p}ah)"/>`;
        continue;
      }
      const q = at(m); if (!q) continue;
      if (type === 'danger') s += `<circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 12}" fill="url(#${p}dg)"/><circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 3}" fill="none" stroke="#ff3b30" stroke-width="4" stroke-dasharray="10 6"/>` +
        `<g transform="translate(${q[0] + 30} ${q[1] - 30})"><circle r="13" fill="#ff3b30" stroke="#3a0000" stroke-width="3"/><path d="M0 -7V2" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cy="7" r="2.4" fill="#fff"/></g>` + (m.text ? `<text x="${q[0]}" y="${q[1] + PD / 2 + 6}" text-anchor="middle" font-size="19" font-weight="700" fill="#fff" stroke="#3a0000" stroke-width="4" paint-order="stroke" font-family="system-ui,sans-serif">${m.text}</text>` : '');
      else if (type === 'safe') s += `<g transform="translate(${q[0] + 30} ${q[1] - 30})"><path d="M0 -14L12 -9V0C12 7 6 12 0 15C-6 12 -12 7 -12 0V-9Z" fill="#4da3ff" stroke="#00204a" stroke-width="3"/><path d="M-5 0L-1 4L6 -4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;
      else if (type === 'glow') s += `<rect x="${q[0] - 46}" y="${q[1] - 46}" width="92" height="92" rx="9" fill="${m.color || '#ffe27a'}" fill-opacity=".22" stroke="${m.color || '#ffe27a'}" stroke-width="4"/>`;
      else if (type === 'dot') s += `<circle cx="${q[0]}" cy="${q[1]}" r="${m.size || 14}" fill="${m.color || GREEN}" stroke="${GREEN_EDGE}" stroke-width="4"/>`;
      else if (type === 'text') s += `<text x="${q[0]}" y="${q[1] + 10}" text-anchor="middle" font-size="${m.size || 30}" font-weight="800" fill="${m.color || '#fff'}" stroke="#000" stroke-opacity=".75" stroke-width="6" paint-order="stroke" font-family="system-ui,sans-serif">${m.text}</text>`;
      else s += `<circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 4}" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="9"/><circle cx="${q[0]}" cy="${q[1]}" r="${PD / 2 + 4}" fill="none" stroke="${m.color || GREEN}" stroke-width="5"/>`;
      if (m.label != null && type !== 'text') s += `<text x="${q[0]}" y="${q[1] + 11}" text-anchor="middle" font-size="30" font-weight="800" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" font-family="system-ui,sans-serif">${m.label}</text>`;
    }
    if (opt.hint) {
      const f = at(opt.hint.from), t = at(opt.hint.to);
      if (f && t) { const dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy) || 1, x1 = f[0] + dx / L * 18, y1 = f[1] + dy / L * 18, x2 = t[0] - dx / L * 30, y2 = t[1] - dy / L * 30;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN_EDGE}" stroke-width="18" stroke-linecap="round" opacity=".8"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" marker-end="url(#${p}ah)"/>`; }
    }
    return s;
  }
  function targetsSVG(o, targets) {
    let s = '';
    for (let t of targets || []) {
      t = rc(t); let q;
      if (t.tray) q = traySlots(o, t.side || 0, 'goal', 7)[t.slot || 0];
      else if (exists(t.r, t.c)) q = cellXY(o, t.r, t.c); else continue;
      s += `<g class="sn-tg" transform="translate(${q[0]} ${q[1]})" pointer-events="none">` +
        (t.capture ? `<circle r="${PD / 2 + 2}" fill="none" stroke="${GREEN_EDGE}" stroke-width="10" opacity=".8"/><circle r="${PD / 2 + 2}" fill="none" stroke="${GREEN}" stroke-width="5"/><path d="M-12 -4h24M12 -4l-7-6M12 4h-24M-12 4l7 6" stroke="${GREEN}" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(0 ${-PD / 2 - 16})"/>`
          : t.water ? `<circle r="21" fill="#4da3ff" stroke="#00204a" stroke-width="5"/><path d="M-10 0q5 -6 10 0t10 0" stroke="#fff" stroke-width="3" fill="none"/>`
          : `<circle r="19" fill="${GREEN}" stroke="${GREEN_EDGE}" stroke-width="5"/><circle r="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>`) + '</g>';
    }
    return s;
  }
  function counts(o, L, lab) {
    let s = '';
    for (const side of [0, 1]) {
      const n = L.pieces.filter(q => q.side === side && q.where === 'goal').length, [x, y, w, h] = trayBox(o, side);
      const t = (lab && lab('goal')) || 'Off';
      const V = OB(o) === 'v', tx = V ? x + w / 2 : x - 14, ty = V ? y - 14 : y + h / 2 + 7;
      s += `<text x="${tx}" y="${ty}" text-anchor="${V ? 'middle' : 'end'}" font-size="23" font-weight="700" fill="#f1d58c" opacity=".9" letter-spacing=".04em" font-family="'Shippori Mincho B1','Cormorant Garamond','Noto Serif JP',serif">${t} ${n}</text>`;
    }
    return s;
  }

  /* ================================================================ mount */
  function mount(host, opts = {}) {
    const p = 'sn' + (++uid) + '_';
    let o = OB(opts.orient), design = BOARDS.includes(opts.design) ? opts.design : 'tut', pcs = piecesKey(opts.pieces);
    const interactive = opts.interactive !== false; let trays = opts.trays !== false;
    const H = {}; const on = (ev, fn) => { (H[ev] = H[ev] || []).push(fn); return view; }, emit = (ev, a) => (H[ev] || []).forEach(f => f(a));
    let svg, gImg, gHit, gTray, gUnder, gPieces, gOver, gTg, state = null, ropt = {}, pieceEls = new Map(), busy = 0;
    function vbox() { return trays ? VIEW[o].slice() : IMG[o].map((v, i) => i < 2 ? v - 8 : v + 16); }
    function build() {
      host.innerHTML = '';
      const V = vbox();
      host.insertAdjacentHTML('beforeend', `<svg xmlns="${NS}" class="sn-board sn-${o}" viewBox="${V.join(' ')}" style="display:block;width:100%;height:100%;user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent">${defs(p, pcs)}<g class="sn-img"></g><g class="sn-tray"></g><g class="sn-under"></g><g class="sn-hit"></g><g class="sn-pieces"></g><g class="sn-tgs"></g><g class="sn-over" pointer-events="none"></g></svg>`);
      svg = host.lastChild; [gImg, gTray, gUnder, gHit, gPieces, gTg, gOver] = ['img', 'tray', 'under', 'hit', 'pieces', 'tgs', 'over'].map(k => svg.querySelector('.sn-' + k));
      const R = IMG[o]; el('image', { href: boardHref(design, o), x: R[0], y: R[1], width: R[2], height: R[3], preserveAspectRatio: 'none' }, gImg);
      if (trays) for (const side of [0, 1]) {
        const [x, y, w, h] = trayBox(o, side), g = el('g', { class: 'sn-trayb', 'data-side': side, 'data-kind': 'goal' }, gTray);
        el('rect', { x, y, width: w, height: h, rx: Math.min(w, h) / 2, fill: 'rgba(0,0,0,.18)', stroke: 'rgba(255,230,170,.16)', 'stroke-width': 1.5 }, g);
        for (const [cx, cy] of traySlots(o, side, 'goal')) el('circle', { cx, cy, r: TD / 2 - 4, fill: 'rgba(0,0,0,.16)', stroke: 'rgba(0,0,0,.2)', 'stroke-width': 1.5 }, g);
        if (interactive) { g.style.cursor = 'pointer'; g.addEventListener('click', e => { e.stopPropagation(); emit('tray', { side, kind: 'goal' }); }); }
      }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
        const [x, y] = cellXY(o, r, c), h = el('rect', { x: x - 50, y: y - 50, width: 100, height: 100, fill: 'transparent', 'data-r': r, 'data-c': c, 'data-sq': r * 10 + (r === 1 ? 9 - c : c) + 1, class: 'sn-cell' }, gHit);
        if (interactive) { h.style.cursor = 'pointer'; h.addEventListener('click', () => emit('cell', { r, c, sq: +h.dataset.sq })); }
      }
      pieceEls = new Map(); if (state) render(state, ropt);
    }
    function pieceEl(side) {
      const g = el('g', { class: 'sn-pc sn-pc' + side });
      el('ellipse', { class: 'sh', rx: PD * .42, ry: PD * .16, cx: 3, cy: PD * .3, fill: `url(#${p}sh)` }, g);
      el('ellipse', { class: 'sel', rx: PD / 2 + 4, ry: PD * .2 + 4, cy: PD * .3, fill: 'none', stroke: '#ffd65a', 'stroke-width': 6, opacity: 0 }, g);
      el('use', { href: `#${p}p${side}`, x: -PD * .55, y: -PD * .55 - PD * PY * 2, width: PD * 1.1, height: PD * 1.1 }, g);
      if (interactive) g.style.cursor = 'pointer';
      return g;
    }
    function place(g, x, y, s, lift = 0) {
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - lift * 22).toFixed(1)}) scale(${(s * (1 + lift * .1)).toFixed(3)})`);
      const sh = g.firstChild; sh.setAttribute('cy', PD * .3 + lift * 22); sh.setAttribute('opacity', 1 - lift * .4);
    }
    function render(st, opt = {}) {
      state = { rule: st.rule || 'std', pos: [st.pos[0].slice(), st.pos[1].slice()], turn: st.turn, winner: st.winner }; ropt = opt;
      if (busy) return view;
      const L = layout(state, o), seen = new Set(), sel = opt.sel ? rc(opt.sel) : null;
      for (const q of L.pieces) {
        if (!trays && q.where !== 'board') continue;
        const key = q.side * 100 + q.k; seen.add(key);
        let g = pieceEls.get(key);
        if (!g) { g = pieceEl(q.side); gPieces.appendChild(g); pieceEls.set(key, g);
          if (interactive) g.addEventListener('click', e => { e.stopPropagation(); const d = g.__q; emit('piece', { side: d.side, piece: d.k, pos: d.pos, r: d.r, c: d.c, where: d.where });
            if (d.where === 'board') emit('cell', { r: d.r, c: d.c, sq: d.pos, piece: d.k, side: d.side }); else emit('tray', { side: d.side, kind: d.where, piece: d.k }); }); }
        g.__q = q; g.__xy = q.xy; g.__s = q.d / PD;
        const isSel = sel && ((sel.side != null && sel.piece != null && sel.side === q.side && sel.piece === q.k) || (sel.r != null && q.where === 'board' && sel.r === q.r && sel.c === q.c));
        place(g, q.xy[0], q.xy[1], q.d / PD, isSel ? .6 : 0);
        g.children[1].setAttribute('opacity', isSel ? 1 : 0);
      }
      for (const [k, g] of pieceEls) if (!seen.has(k)) { g.remove(); pieceEls.delete(k); }
      // 手前（下の行）ほど上に重ねる
      [...pieceEls.values()].sort((a, b) => (a.__xy[1] - b.__xy[1]) || (a.children[1].getAttribute('opacity') - b.children[1].getAttribute('opacity'))).forEach(g => gPieces.appendChild(g));
      gUnder.innerHTML = marksSVG(p, o, state, { last: opt.last });
      gOver.innerHTML = (trays ? counts(o, L, opts.trayLabel) : '') + marksSVG(p, o, state, { marks: opt.marks, hint: opt.hint });
      gTg.innerHTML = targetsSVG(o, opt.targets);
      return view;
    }
    const findEl = (side, pos) => { for (const g of pieceEls.values()) { const q = g.__q; if (q.side === side && q.pos === pos) return g; } return null; };
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    // 駒の移動：道に沿ってすべらせる。info.capture：相手の駒を元のマスへ（入れ替え）、info.dest：水の家から戻るマス
    async function animateMove(side, from, to, info = {}) {
      if (!state) return;
      const g = findEl(side, from); if (!g) return;
      busy++;
      const sp = info.speed || opts.speed || 1;
      const pts = [g.__xy.slice()];
      for (let i = from + 1; i <= Math.min(30, to); i++) pts.push(sqXY(o, i));
      let victim = null;
      if (info.capture && to <= 30) victim = findEl(1 - side, to);
      const k = g.__q.k, final = info.dest != null ? info.dest : to;
      state.pos[side][k] = final;
      if (victim) state.pos[1 - side][victim.__q.k] = from;
      const L = layout(state, o), dq = L.pieces.find(q => q.side === side && q.k === k);
      if (to >= GOAL) pts.push(dq.xy);
      const s0 = g.__s, s1 = dq.d / PD;
      gPieces.appendChild(g); g.children[1].setAttribute('opacity', 0);
      gTg.innerHTML = ''; gOver.innerHTML = trays ? counts(o, L, opts.trayLabel) : '';
      await tween(110 / sp, t => place(g, pts[0][0], pts[0][1], s0, easeOut(t)));
      const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1], pts[i]); seg.push(d); tot += d; }
      const ms = (info.ms || (240 + 85 * Math.max(1, pts.length - 1))) / sp;
      let vp = null;
      const flyVictim = () => { const v0 = victim.__xy.slice(), v1 = pts[0]; gPieces.appendChild(victim); gPieces.appendChild(g);
        return tween(460 / sp, t => { const e = ease(t); place(victim, v0[0] + (v1[0] - v0[0]) * e, v0[1] + (v1[1] - v0[1]) * e - Math.sin(Math.PI * t) * 40, 1, Math.sin(Math.PI * t) * .8); }); };
      await tween(ms, t => {
        const e = ease(t); let d = e * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const f = seg[i] ? d / seg[i] : 1, A = pts[i], B = pts[i + 1] || A;
        place(g, A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, s0 + (s1 - s0) * e, 1);
        if (victim && !vp && t > .55) vp = flyVictim();
      });
      if (victim && !vp) vp = flyVictim();
      const end = pts[pts.length - 1];
      await tween(130 / sp, t => place(g, end[0], end[1], s1, 1 - easeOut(t)));
      if (vp) await vp;
      // 水の家：沈んで、再生の家（15）から浮かび上がる
      if (info.dest != null && info.dest !== to && to <= 30) {
        await tween(360 / sp, t => { place(g, end[0], end[1] + t * 8, s1 * (1 - t * .7), 0); g.setAttribute('opacity', 1 - t); });
        const b = sqXY(o, final);
        await tween(380 / sp, t => { place(g, b[0], b[1] - (1 - t) * 10, s1 * (.6 + t * .4), 0); g.setAttribute('opacity', t); });
        g.setAttribute('opacity', 1);
      }
      busy--;
      render(state, Object.assign({}, ropt, { targets: [], sel: null, hint: null }));
    }
    const view = {
      el: null, render, on, animateMove,
      cellRect(r, c) { const h = gHit.querySelector(`[data-r="${r}"][data-c="${c}"]`); return h ? h.getBoundingClientRect() : null; },
      sqRect(i) { const [r, c] = sqRC(i); return view.cellRect(r, c); },
      offRect(side) { const g = gTray.querySelector(`[data-side="${side}"]`); return g ? g.getBoundingClientRect() : null; },
      stickRect(side) { const b = stickBox(o, side), m = svg.getScreenCTM(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = b[0]; pt.y = b[1]; const a = pt.matrixTransform(m); pt.x = b[0] + b[2]; pt.y = b[1] + b[3]; const z = pt.matrixTransform(m); return { left: a.x, top: a.y, width: z.x - a.x, height: z.y - a.y }; },
      cellXY: (r, c) => cellXY(o, r, c), sqXY: i => sqXY(o, i),
      toClient(x, y) { const m = svg.getScreenCTM(), pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(m); return { x: q.x, y: q.y }; },
      setDesign(d, pc) { if (d && BOARDS.includes(d)) design = d; if (pc) pcs = piecesKey(pc); build(); return view; },
      setOrient(v) { v = OB(v); if (v !== o) { o = v; build(); } return view; },
      // the bear-off trays above / below the board can be left out (phones held sideways: the counts are in the players' cards)
      setTrays(b) { b = !!b; if (b !== trays) { trays = b; build(); } return view; }, trays: () => trays, vbox,
      orient: () => o, rotated: () => false, key: () => o + (trays ? '' : 'n'), notch: () => false, design: () => ({ board: design, pieces: pcs }), svg: () => svg,
      destroy() { host.innerHTML = ''; },
    };
    build(); view.el = svg;
    return view;
  }

  /* ================================================================ mini (string) */
  function mini(state, opt = {}) {
    const p = 'snm' + (++uid) + '_', o = OB(opt.orient), design = BOARDS.includes(opt.design) ? opt.design : 'tut', pcs = piecesKey(opt.pieces);
    let V = VIEW[o].slice();
    const cr = opt.crop;
    if (Array.isArray(cr) && cr.length === 4) V = cr;
    else if (cr && cr.c0 != null) { const a = cellXY(o, cr.r0 ?? 0, cr.c0), b = cellXY(o, cr.r1 ?? 2, cr.c1 ?? 9), pad = cr.pad ?? 56; V = [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.abs(b[0] - a[0]) + 2 * pad, Math.abs(b[1] - a[1]) + 2 * pad]; }
    else if (cr === 'board' || opt.trays === false) V = IMG[o].slice();
    const R = IMG[o];
    let s = `<svg xmlns="${NS}" class="sn-mini" viewBox="${V.join(' ')}"${opt.width ? ` width="${opt.width}"` : ''}${opt.height ? ` height="${opt.height}"` : ''} style="display:block${opt.width ? '' : ';width:100%;height:auto'}">${defs(p, pcs)}`;
    s += `<image href="${boardHref(design, o)}" x="${R[0]}" y="${R[1]}" width="${R[2]}" height="${R[3]}" preserveAspectRatio="none"/>`;
    s += marksSVG(p, o, state, { last: opt.last });
    if (state && state.pos) {
      const L = layout(state, o);
      for (const q of L.pieces.sort((a, b) => a.xy[1] - b.xy[1])) {
        if (opt.trays === false && q.where !== 'board') continue;
        const d = q.d * 1.1;
        s += `<ellipse cx="${q.xy[0] + 3}" cy="${q.xy[1] + q.d * .3}" rx="${q.d * .42}" ry="${q.d * .16}" fill="url(#${p}sh)"/>`;
        s += `<use href="#${p}p${q.side}" x="${q.xy[0] - d / 2}" y="${q.xy[1] - d / 2 - q.d * PY * 2}" width="${d}" height="${d}"/>`;
      }
    }
    s += targetsSVG(o, opt.targets) + marksSVG(p, o, state, { marks: opt.marks, hint: opt.hint });
    return s + '</svg>';
  }
  // 駒1つの絵（デザインのタイル用）
  function pieceIcon(side, pcs, size = 44) { const p = 'sni' + (++uid) + '_'; return `<svg xmlns="${NS}" viewBox="0 0 100 100" width="${size}" height="${size}">${pieceSVG(p, side, piecesKey(pcs))}</svg>`; }

  /* ================================================================ 投げ棒（4本）
     平たい棒：片面が白（明るい面、彩色の線）、裏が黒っぽい木。白い面の本数が出目（0本＝5）。
     dice(host, {style}) → { roll(d, {speed, side, onHit}) → Promise, show(d), setStyle(s), is3D() → false } */
  const STK = {
    tut: { w: '#fffaf0', w2: '#e9d6a6', w3: '#c8ab70', b: '#7a4a26', b2: '#3e2312', line: '#a3301c', blue: '#2f5bd0' },
    faience: { w: '#ffffff', w2: '#e4e6da', w3: '#b9bfae', b: '#2a8fc4', b2: '#0f4f78', line: '#1c6fa0', blue: '#1c6fa0' },
    gold: { w: '#fff6d2', w2: '#f0d27a', w3: '#c79a34', b: '#3b5bd0', b2: '#16277a', line: '#2a46b0', blue: '#2a46b0' },
    modern: { w: '#fffaf0', w2: '#ecd8b2', w3: '#c3a476', b: '#5a5d6c', b2: '#22242e', line: '#b9986a', blue: '#7d8aa8' },
  };
  // a flat stick, slightly rounded across (lit from the upper left): the white face painted with bands and a lozenge, the back plain wood
  function stickSVG(up, sty, id) {
    if (SPR('stick1')) return `<image href="${SPR(up ? 'stick1' : 'stick0')}" x="-17" y="-76" width="34" height="152" preserveAspectRatio="none"/>`;   // (the 3D stick: same for every piece set)
    const c = STK[sty] || STK.tut, R = 'x="-12" y="-62" width="24" height="124" rx="11"';
    if (up) return `<rect ${R} fill="url(#${id}w)" stroke="${c.w3}" stroke-width="1.6"/><rect ${R} fill="url(#${id}v)"/>`
      + `<path d="M-8 -46h16M-8 -39h16M-8 46h16M-8 39h16" stroke="${c.line}" stroke-width="3" stroke-linecap="round" opacity=".85"/><path d="M0 -28 L7 0 L0 28 L-7 0 Z" fill="${c.blue}" fill-opacity=".18" stroke="${c.line}" stroke-width="2.2" opacity=".85"/>`
      + `<rect x="-9" y="-58" width="5" height="116" rx="2.5" fill="#fff" opacity=".55" filter="url(#${id}bl)"/>`;
    return `<rect ${R} fill="url(#${id}b)" stroke="#1a0d05" stroke-opacity=".55" stroke-width="1.6"/><rect ${R} fill="url(#${id}g)" opacity=".9"/><rect ${R} fill="url(#${id}v)"/>`
      + `<rect x="-9" y="-58" width="4" height="116" rx="2" fill="#ffe7c2" opacity=".28" filter="url(#${id}bl)"/>`;
  }
  function dice(host, opts = {}) {
    let sty = piecesKey(opts.style), cur = [0, 0, 0, 0], busy = false;
    const id = 'snd' + (++uid) + '_';
    host.innerHTML = '';
    const svg = el('svg', { viewBox: '-162 -46 324 92', class: 'sn-sticks', style: 'display:block;width:100%;height:100%;overflow:visible' }, host);
    const mkDefs = () => { const c = STK[sty] || STK.tut; return `<defs><linearGradient id="${id}w" x1="0" x2="1"><stop offset="0" stop-color="${c.w2}"/><stop offset=".3" stop-color="${c.w}"/><stop offset=".62" stop-color="${c.w}"/><stop offset="1" stop-color="${c.w3}"/></linearGradient>`
      + `<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${c.b2}"/><stop offset=".32" stop-color="${c.b}"/><stop offset=".6" stop-color="${c.b}"/><stop offset="1" stop-color="${c.b2}"/></linearGradient>`
      + `<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`
      + `<pattern id="${id}g" width="24" height="124" patternUnits="userSpaceOnUse" x="-12" y="-62"><path d="M3 0 C6 30 1 62 5 124 M9 0 C12 40 7 80 11 124 M15 0 C13 36 18 70 15 124 M20 0 C22 44 18 90 21 124" fill="none" stroke="#1e0f05" stroke-opacity=".35" stroke-width="1.1"/><path d="M6 0 C9 50 4 90 8 124 M17 0 C15 52 20 96 18 124" fill="none" stroke="#f3c890" stroke-opacity=".18" stroke-width="1"/></pattern>`
      + `<filter id="${id}bl" x="-1" y="-.2" width="3" height="1.4"><feGaussianBlur stdDeviation="1.6"/></filter>`
      + `<radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`; };
    // the sticks lie across the strip, two by two (the strip is long and low: lying down they are drawn much larger)
    const X = [-78, 78, -80, 76], Y0 = [-21, -23, 21, 22], A0 = [92, 87, 89, 94];
    const rest = X.map((x, i) => ({ x, y: Y0[i], a: A0[i] }));
    function draw(d, poses) {
      let s = mkDefs();
      d.forEach((u, i) => { const q = poses ? poses[i] : rest[i]; s += `<g transform="translate(${q.x.toFixed(1)} ${(q.y + 8).toFixed(1)}) rotate(${q.a.toFixed(1)})" opacity="${q.sh == null ? 1 : q.sh}"><ellipse rx="20" ry="68" fill="url(#${id}s)"/></g>`; });
      d.forEach((u, i) => { const q = poses ? poses[i] : rest[i]; const sx = q.flip == null ? 1 : q.flip; s += `<g transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${q.a.toFixed(1)}) scale(${Math.max(.08, Math.abs(sx)).toFixed(3)} ${(q.k || 1).toFixed(3)})">${stickSVG(sx >= 0 ? u : 1 - u, sty, id)}</g>`; });
      svg.innerHTML = s;
    }
    function show(d) { cur = d.slice(); rest.forEach((q, i) => { q.a = A0[i] + (Math.random() - .5) * 6; }); draw(cur); }
    async function roll(d, o2 = {}) {
      busy = true; const sp = o2.speed || 1, ms = 760 / sp, from = o2.side ? -1 : 1;
      const st = X.map((x, i) => ({ x0: x + (Math.random() - .5) * 60, y0: from * (120 + Math.random() * 40), spin: (Math.random() < .5 ? -1 : 1) * (200 + Math.random() * 300), flips: 3 + (Math.random() * 3 | 0), delay: i * 40 + Math.random() * 30, end: A0[i] + (Math.random() - .5) * 8 }));
      let hit = [0, 0, 0, 0];
      await tween(ms + 160, t => {
        const T = t * (ms + 160);
        const poses = st.map((q, i) => {
          const u = Math.max(0, Math.min(1, (T - q.delay) / ms)), e = easeOut(u);
          if (u > .62 && !hit[i]) { hit[i] = 1; if (o2.onHit) try { o2.onHit(i, 1); } catch (e) {} }
          const bounce = u > .62 ? Math.abs(Math.sin((u - .62) / .38 * Math.PI * 2)) * (1 - u) * 18 : 0;
          const ph = (1 - e) * q.flips * Math.PI;   // 裏返り
          return { x: q.x0 + (X[i] - q.x0) * e, y: Y0[i] + q.y0 * (1 - e) - bounce, a: q.end + (1 - e) * q.spin, flip: Math.cos(ph), k: 1 + (1 - e) * .25, sh: .4 + .6 * e };
        });
        draw(d, poses);
      });
      st.forEach((q, i) => { rest[i].a = q.end; }); cur = d.slice(); draw(cur); busy = false;
    }
    show(cur);
    return { roll, show, setStyle(s) { sty = piecesKey(s); draw(cur); }, is3D: () => false, get busy() { return busy; } };
  }

  window.SenetBoard2D = { mount, mini, dice, pieceIcon, pieceSVG, boardSVG, boardHref, BOARDS, PIECES, IMG, VIEW, cellXY, sqXY, sqRC, traySlots, stickBox, layout, GREEN, PD, TD };
})();
