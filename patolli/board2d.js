/* =====================================================================
   patolli/board2d.js — パトリの2D盤・駒・豆（window.PatolliBoard2D、依存：engine.js の PatolliEngine）

   盤はエンジンの十字（＋）の格子を45度回して X 形に見せる。画像は使わず、すべて SVG で描く。
   SVG の座標：viewBox −500…500 の正方形。1マス＝u（腕の長さ a で決まる：X が枠いっぱいになる大きさ）。
     格子 (r,c) のマスの中心 = 格子座標 (gx,gy) = (c+.5−(a+1), r+.5−(a+1)) を45度回したもの
       X = (gx−gy)·u/√2,  Y = (gx+gy)·u/√2      （side 0 の出発マス＝中央のひし形の下、side 1＝上）
   X の4つのすき間（三角）を使う：下＝side 0 の待ち駒と上がった駒、上＝side 1、左＝豆を投げる場所、右＝宝（各自と場）。

   盤 BOARDS：petate（ござ＋黒いゴムの線・既定）/ hide（彩色した鹿革）/ stone（刻んだ石板）/ codex（絵文書の紙）/
              mosaic（トルコ石のモザイク）/ night（夜）
   駒 PIECES：pebble（赤と青の小石・既定）/ maize（赤と青のとうもろこしの粒）/ obsidian（黒曜石と貝）/
              jade（ひすいと赤い石）/ clay（素焼きと石墨）/ gold（金とトルコ石）
   API（ur/board2d.js に合わせた形）：
     mount(host, { design, pieces, trayLabel(k), speed }) → view
       view.render(state, { targets, hint, last, marks })   state＝エンジンの state（rule, pos, dir, gold, pool）
       view.on('cell'|'tray', fn)   cell: { r, c, side, piece }   tray: { side, kind:'start'|'goal' }
       view.animateMove(side, from, to, { capture, speed }) → Promise     view.animatePay(from, to, amt, { speed }) → Promise
       view.setDesign(design, pieces)   view.svg()   view.spot(name) → [x,y]（'dock' 等）
     mini(state, { design, pieces, marks, crop:'board'|'auto', trays }) → SVG 文字列（一覧・デザインのタイル用。対局と同じ絵）
     dice(host, { speed }) → { show(beans), roll(beans, { speed, onHit }) → Promise }     豆5個（印の面に白い点）
   印 marks：{ r, c, type:'glow'|'danger'|'safe'|'text'|'ring', text, color } / { type:'path', side, from, to } /
             { type:'arrow', from:{r,c}|{tray,side}, to:…, color }
   ===================================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const E = () => window.PatolliEngine;
  const BOARDS = ['petate', 'hide', 'stone', 'codex', 'mosaic', 'night'];
  const PIECES = ['pebble', 'maize', 'obsidian', 'jade', 'clay', 'gold'];
  const GREEN = '#3df59a', GREEN_EDGE = '#06331d';
  const VIEW = [-500, -500, 1000, 1000], HALF = 462, R2 = Math.SQRT2;
  let UID = 0;

  // 盤のデザイン：地（ござ等）の2色＋模様、マスの色、線、印（罰のマスの三角）、中央、腕の先、文字
  const BD = {
    petate: { bg: ['#d8bd7c', '#c29b55', '#a9803e'], weave: 'mat', cell: 'rgba(238,220,170,.34)', line: '#16110d', lw: .075, gloss: 'rgba(255,255,255,.16)', mark: '#16110d', centre: 'rgba(176,58,34,.30)', end: 'rgba(15,127,134,.20)', ink: '#2a1d10', rim: '#7d5a26' },
    hide:   { bg: ['#c99a62', '#b07f49', '#8d5f31'], weave: 'hide', cell: 'rgba(240,214,170,.30)', line: '#5a1d12', lw: .07, gloss: 'rgba(255,220,190,.12)', mark: '#8e2415', centre: 'rgba(30,24,20,.34)', end: 'rgba(142,36,21,.24)', ink: '#2c160c', rim: '#6c431f' },
    stone:  { bg: ['#9c9b94', '#84837c', '#66655f'], weave: 'stone', cell: 'rgba(210,210,200,.18)', line: '#3a3935', lw: .085, gloss: 'rgba(255,255,255,.34)', mark: '#3f3e3a', centre: 'rgba(60,60,56,.28)', end: 'rgba(240,240,230,.20)', ink: '#22221f', rim: '#4e4d48', incised: true },
    codex:  { bg: ['#efe5cd', '#e2d4b3', '#c9b78f'], weave: 'paper', cell: '#f6efdc', line: '#1c1712', lw: .06, gloss: 'rgba(255,255,255,0)', mark: '#b5351f', centre: '#e0b33e', end: '#2f8f95', ink: '#1c1712', rim: '#8f7a52', flat: true },
    mosaic: { bg: ['#14353a', '#0f2a2e', '#0a1c1f'], weave: 'tess', cell: 'rgba(52,176,172,.72)', line: '#082023', lw: .09, gloss: 'rgba(255,255,255,.22)', mark: '#0b1f22', centre: 'rgba(222,178,74,.86)', end: 'rgba(196,66,48,.82)', ink: '#e9fbf7', rim: '#d0a94a', tess: true },
    night:  { bg: ['#141a33', '#0e1226', '#080a18'], weave: 'night', cell: 'rgba(60,84,150,.20)', line: '#7fe6e0', lw: .05, gloss: 'rgba(255,255,255,0)', mark: '#e0794f', centre: 'rgba(224,121,79,.34)', end: 'rgba(127,230,224,.26)', ink: '#dff7f5', rim: '#3d4a80', glow: true },
  };
  // 駒：[side0, side1] それぞれ [明るい色, 基本の色, 暗い色]、形（pebble 丸い石 / kernel とうもろこしの粒 / disc 平たい円盤 / bead 玉）
  const PC = {
    pebble:   { shape: 'pebble', c: [['#f0806a', '#c8392b', '#7a1a12'], ['#7fb2ee', '#2f67c4', '#153574']] },
    maize:    { shape: 'kernel', c: [['#e88a78', '#b7392f', '#6e1812'], ['#8f9bd6', '#3f4b9a', '#1d2356']] },
    obsidian: { shape: 'pebble', c: [['#fff8ea', '#e6dcc4', '#a89c80'], ['#6a6e78', '#1d1f26', '#050608']] },
    jade:     { shape: 'bead',   c: [['#f29a7c', '#cf4a34', '#7d2114'], ['#a8e6c0', '#3fa878', '#17583a']] },
    clay:     { shape: 'disc',   c: [['#eeb489', '#c97a4a', '#834222'], ['#8b939c', '#4a525c', '#22282f']] },
    gold:     { shape: 'bead',   c: [['#fff0b0', '#e0b23c', '#8c6410'], ['#9ff0ea', '#1fa7a8', '#0b5a60']] },
  };
  const geo = rule => { const Rr = E().RULES[rule] || E().RULES.bell, a = Rr.arm, u = HALF * R2 / (a + 2); return { R: Rr, a, u, G: 2 * a + 2, apex: R2 * u }; };
  function cellXY(rule, r, c) { const g = geo(rule), gx = c + .5 - (g.a + 1), gy = r + .5 - (g.a + 1); return [(gx - gy) * g.u / R2, (gx + gy) * g.u / R2]; }
  // すき間（三角）に置くもの：待ち駒・上がった駒の場所、宝、豆
  const TD = 50, TP = 54, TX0 = 118;
  function traySlot(side, kind, k) {
    const sgn = side === 0 ? 1 : -1, cx = (kind === 'start' ? -TX0 : TX0) * sgn, col = k % 3, row = Math.floor(k / 3);
    return [cx + (col - 1) * TP * sgn, (422 - row * TP) * sgn];
  }
  const trayBox = (side, kind) => { const sgn = side === 0 ? 1 : -1, cx = (kind === 'start' ? -TX0 : TX0) * sgn; return { x: cx - 86, y: (side === 0 ? 422 - TP - 30 : -422 - 30), w: 172, h: TP + 60, cx, ly: 469 * sgn }; };
  const SPOT = { gold0: [404, 168], gold1: [404, -168], pool: [356, 0], dock: [-478, -125, 216, 250] };
  const spotOf = w => w === 'pool' ? SPOT.pool : SPOT['gold' + w];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = x => (Math.round(x * 10) / 10);

  /* ---------------- 模様と駒の定義（defs） ---------------- */
  function defs(p, design, pieces) {
    const D = BD[design] || BD.petate, P = PC[pieces] || PC.pebble;
    let s = `<radialGradient id="${p}vg" cx="50%" cy="46%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${D.glow ? .5 : .3}"/></radialGradient>`;
    const [b0, b1, b2] = D.bg;
    if (D.weave === 'mat') s += `<pattern id="${p}w" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="26" height="26" fill="${b1}"/><rect x=".6" y=".8" width="12" height="11.4" rx="1.6" fill="${b0}"/><rect x="13.6" y="13.8" width="12" height="11.4" rx="1.6" fill="${b0}"/><rect x="13.8" y=".6" width="11.4" height="12" rx="1.6" fill="#cfae69"/><rect x=".8" y="13.6" width="11.4" height="12" rx="1.6" fill="#cfae69"/><path d="M1 6.5h11M14 19.5h11" stroke="${b2}" stroke-opacity=".35" stroke-width=".8"/><path d="M19.5 1v11M6.5 14v11" stroke="${b2}" stroke-opacity=".4" stroke-width=".8"/></pattern>`;
    else if (D.weave === 'hide') s += `<pattern id="${p}w" width="180" height="180" patternUnits="userSpaceOnUse"><rect width="180" height="180" fill="${b1}"/><ellipse cx="40" cy="50" rx="70" ry="44" fill="${b0}" opacity=".5"/><ellipse cx="140" cy="130" rx="64" ry="50" fill="${b2}" opacity=".22"/><path d="M10 120c30-14 50 10 80-4s50 6 80-6M0 30c40 10 60-12 100-2s60 0 80 6" stroke="${b2}" stroke-opacity=".22" stroke-width="1.2" fill="none"/></pattern>`;
    else if (D.weave === 'stone') s += `<pattern id="${p}w" width="140" height="140" patternUnits="userSpaceOnUse"><rect width="140" height="140" fill="${b1}"/><circle cx="20" cy="30" r="26" fill="${b0}" opacity=".5"/><circle cx="100" cy="96" r="34" fill="${b2}" opacity=".3"/><g fill="#2b2a27" opacity=".28"><circle cx="12" cy="88" r="1.6"/><circle cx="64" cy="20" r="1.3"/><circle cx="90" cy="52" r="1.8"/><circle cx="124" cy="14" r="1.2"/><circle cx="44" cy="118" r="1.5"/><circle cx="118" cy="128" r="1.3"/><circle cx="70" cy="80" r="1"/></g><g fill="#fff" opacity=".2"><circle cx="34" cy="64" r="1.3"/><circle cx="108" cy="36" r="1.1"/><circle cx="82" cy="122" r="1.4"/></g></pattern>`;
    else if (D.weave === 'paper') s += `<pattern id="${p}w" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="${b0}"/><ellipse cx="50" cy="40" rx="80" ry="40" fill="${b1}" opacity=".45"/><path d="M0 20h160M0 71h160M0 118h160" stroke="${b2}" stroke-opacity=".16" stroke-width="1"/><path d="M12 0l6 160M88 0l-5 160M140 0l4 160" stroke="${b2}" stroke-opacity=".1" stroke-width="1.4"/></pattern>`;
    else if (D.weave === 'tess') s += `<pattern id="${p}w" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="${b2}"/><rect x="1.5" y="1.5" width="17" height="17" rx="2" fill="${b0}"/><rect x="21.5" y="1.5" width="17" height="17" rx="2" fill="${b1}"/><rect x="1.5" y="21.5" width="17" height="17" rx="2" fill="${b1}"/><rect x="21.5" y="21.5" width="17" height="17" rx="2" fill="#173f45"/></pattern>` +
      `<pattern id="${p}t" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="none"/><path d="M12 0v24M0 12h24" stroke="#06282b" stroke-opacity=".5" stroke-width="1.4"/><rect x="1" y="1" width="10" height="10" fill="#fff" opacity=".08"/><rect x="13" y="13" width="10" height="10" fill="#000" opacity=".08"/></pattern>`;
    else s += `<pattern id="${p}w" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="${b1}"/><circle cx="60" cy="50" r="90" fill="${b0}" opacity=".5"/><g fill="#e8f4ff"><circle cx="22" cy="30" r="1.1" opacity=".7"/><circle cx="150" cy="18" r=".9" opacity=".6"/><circle cx="96" cy="78" r="1.3" opacity=".5"/><circle cx="182" cy="120" r="1" opacity=".7"/><circle cx="40" cy="150" r=".9" opacity=".55"/><circle cx="128" cy="170" r="1.2" opacity=".6"/><circle cx="74" cy="118" r=".8" opacity=".5"/></g></pattern>`;
    if (D.glow) s += `<filter id="${p}gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    for (const sd of [0, 1]) { const c = P.c[sd]; s += `<radialGradient id="${p}pc${sd}" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`; }
    s += `<radialGradient id="${p}gem" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#c8fff6"/><stop offset=".5" stop-color="#27b4ae"/><stop offset="1" stop-color="#0a5f66"/></radialGradient>`;
    s += `<radialGradient id="${p}gg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe68a" stop-opacity=".95"/><stop offset=".7" stop-color="#ffc93a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient>`;
    return s;
  }
  /* ---------------- 盤（動かない部分） ---------------- */
  const boardCache = new Map();
  function boardSVG(p, rule, design, full) {
    const D = BD[design] || BD.petate, g = geo(rule), u = g.u, a = g.a, En = E(), Rr = g.R;
    let s = '';
    // 地（ござ・革・石…）。full＝枠いっぱいの正方形（対局画面）。ミニ盤でも同じ地を敷く
    s += `<rect x="-496" y="-496" width="992" height="992" rx="${D.weave === 'hide' ? 70 : 26}" fill="url(#${p}w)"/>`;
    if (D.weave === 'mat') s += `<rect x="-490" y="-490" width="980" height="980" rx="22" fill="none" stroke="${D.rim}" stroke-width="10" stroke-dasharray="7 5" opacity=".55"/>`;
    else s += `<rect x="-490" y="-490" width="980" height="980" rx="${D.weave === 'hide' ? 66 : 22}" fill="none" stroke="${D.rim}" stroke-width="6" opacity=".7"/>`;
    s += `<rect x="-496" y="-496" width="992" height="992" rx="26" fill="url(#${p}vg)"/>`;
    // 十字を45度回す。座標は格子（中心が原点、1マス＝u）
    const L = (a + 1) * u, rr = .82 * u;
    const plus = `M${-u} ${-u}V${-L + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}H${u - rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${-u}H${L - rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${u - rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}H${u}V${L - rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}H${-u + rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}V${u}H${-L + rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}V${-u + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}Z`;
    s += `<g transform="rotate(45)">`;
    if (D.incised || D.flat) s += `<path d="${plus}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="${u * .2}" transform="translate(${u * .04} ${u * .05})"/>`;
    s += `<path d="${plus}" fill="${D.cell}"/>`;
    if (D.tess) s += `<path d="${plus}" fill="url(#${p}t)"/>`;
    // 中央4マス、腕の先（もう一度）のマス、罰のマスの三角
    s += `<rect x="${-u}" y="${-u}" width="${2 * u}" height="${2 * u}" fill="${D.centre}"/>`;
    let ends = '', tri = '';
    for (let q = 0; q < Rr.N; q++) {
      const k = En.kindQ(Rr, q); if (k !== 'e' && k !== 'p') continue;
      const [r, c] = En.rcOfQ(Rr, q), x = (c - (a + 1)) * u, y = (r - (a + 1)) * u, cx = x + u / 2, cy = y + u / 2;
      if (k === 'e') ends += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(u * .3)}" fill="${D.end}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(u * .3)}" fill="none" stroke="${D.line}" stroke-opacity="${D.glow ? .8 : .55}" stroke-width="${f1(u * .035)}"/>`;
      else {
        const vert = c === a || c === a + 1 ? (r < a || r > a + 1) : false;   // 上下の腕＝外側は左右
        let pts;
        if (vert) { const out = c === a ? x : x + u, inn = c === a ? x + u : x; pts = [[out, y + u * .06], [out, y + u * .94], [inn - (c === a ? 1 : -1) * u * .1, cy]]; }
        else { const out = r === a ? y : y + u, inn = r === a ? y + u : y; pts = [[x + u * .06, out], [x + u * .94, out], [cx, inn - (r === a ? 1 : -1) * u * .1]]; }
        tri += `<path d="M${pts.map(q2 => f1(q2[0]) + ' ' + f1(q2[1])).join('L')}Z"/>`;
      }
    }
    s += ends + `<g fill="${D.mark}"${D.glow ? ` filter="url(#${p}gl)"` : ''}>${tri}</g>`;
    // 線（液状ゴムで描いた線）：外形、腕の中心線、マスの仕切り
    let ln = `M0 ${-L}V${L}M${-L} 0H${L}`;
    for (let i = 1; i <= a; i++) { const d = i * u; ln += `M${-u} ${-d}H${u}M${-u} ${d}H${u}M${-d} ${-u}V${u}M${d} ${-u}V${u}`; }
    const lw = D.lw * u;
    if (D.incised) s += `<g fill="none" stroke="${D.gloss}" stroke-width="${f1(lw * .7)}" transform="translate(${f1(lw * .45)} ${f1(lw * .5)})"><path d="${plus}"/><path d="${ln}"/></g>`;
    s += `<g fill="none" stroke="${D.line}" stroke-width="${f1(lw)}" stroke-linejoin="round" stroke-linecap="round"${D.glow ? ` filter="url(#${p}gl)"` : ''}><path d="${plus}" stroke-width="${f1(lw * 1.5)}"/><path d="${ln}"/></g>`;
    if (!D.incised && D.gloss !== 'rgba(255,255,255,0)') s += `<g fill="none" stroke="${D.gloss}" stroke-width="${f1(lw * .28)}" transform="translate(${f1(-lw * .22)} ${f1(-lw * .22)})"><path d="${plus}"/><path d="${ln}"/></g>`;
    s += `</g>`;
    return s;
  }
  const boardOf = (p, rule, design) => { const k = p + rule + design; if (!boardCache.has(k)) { if (boardCache.size > 60) boardCache.clear(); boardCache.set(k, boardSVG(p, rule, design)); } return boardCache.get(k); };

  /* ---------------- 駒 ---------------- */
  // 小石は1個ずつ少し形と向きが違う（seed＝駒の番号）
  function pieceSVG(p, pieces, side, x, y, d, seed, cls, attr) {
    const P = PC[pieces] || PC.pebble, c = P.c[side], k = (seed * 37 + side * 11) % 7, rot = (k - 3) * 9, w = d / 2;
    let body;
    if (P.shape === 'pebble') { const rx = w * (.98 + (k % 3) * .02), ry = w * (.86 + (k % 2) * .05); body = `<ellipse rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${p}pc${side})" stroke="${c[2]}" stroke-width="${f1(d * .03)}"/><ellipse cx="${f1(-w * .28)}" cy="${f1(-w * .34)}" rx="${f1(w * .32)}" ry="${f1(w * .17)}" fill="#fff" opacity=".42"/>`; }
    else if (P.shape === 'kernel') body = `<path d="M0 ${f1(-w)}C${f1(w * .95)} ${f1(-w)} ${f1(w * .9)} ${f1(w * .35)} ${f1(w * .45)} ${f1(w * .92)}Q0 ${f1(w * 1.1)} ${f1(-w * .45)} ${f1(w * .92)}C${f1(-w * .9)} ${f1(w * .35)} ${f1(-w * .95)} ${f1(-w)} 0 ${f1(-w)}Z" fill="url(#${p}pc${side})" stroke="${c[2]}" stroke-width="${f1(d * .03)}"/><path d="M${f1(-w * .28)} ${f1(w * .5)}Q0 ${f1(w * .1)} ${f1(w * .28)} ${f1(w * .5)}" fill="none" stroke="#fff2d8" stroke-opacity=".7" stroke-width="${f1(d * .05)}"/><ellipse cx="${f1(-w * .26)}" cy="${f1(-w * .42)}" rx="${f1(w * .26)}" ry="${f1(w * .15)}" fill="#fff" opacity=".4"/>`;
    else if (P.shape === 'disc') body = `<circle r="${f1(w * .96)}" fill="url(#${p}pc${side})" stroke="${c[2]}" stroke-width="${f1(d * .035)}"/><circle r="${f1(w * .62)}" fill="none" stroke="${c[2]}" stroke-opacity=".6" stroke-width="${f1(d * .03)}"/><circle r="${f1(w * .2)}" fill="${c[2]}" opacity=".55"/>`;
    else body = `<circle r="${f1(w * .94)}" fill="url(#${p}pc${side})" stroke="${c[2]}" stroke-width="${f1(d * .03)}"/><circle r="${f1(w * .2)}" fill="${c[2]}" opacity=".7"/><ellipse cx="${f1(-w * .3)}" cy="${f1(-w * .36)}" rx="${f1(w * .3)}" ry="${f1(w * .16)}" fill="#fff" opacity=".55"/>`;
    return `<g class="${cls || 'pt-pc'}" ${attr || ''} transform="translate(${f1(x)} ${f1(y)})"><ellipse cx="${f1(d * .05)}" cy="${f1(d * .12)}" rx="${f1(w)}" ry="${f1(w * .86)}" fill="#000" opacity=".3"/><g transform="rotate(${P.shape === 'disc' || P.shape === 'bead' ? 0 : rot})">${body}</g></g>`;
  }
  // 宝（トルコ石の玉）の小さな山
  function gemsSVG(p, x, y, n, sc) {
    const pos = [[0, 6], [-15, 12], [15, 12], [-8, -5], [8, -5], [0, -16]], k = Math.max(0, Math.min(6, n <= 0 ? 0 : n <= 2 ? n : n <= 5 ? 3 : n <= 9 ? 4 : n <= 14 ? 5 : 6));
    let s = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc || 1})">`;
    for (let i = 0; i < k; i++) s += `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="11" fill="url(#${p}gem)" stroke="#06383c" stroke-width="1.6"/><circle cx="${pos[i][0] - 3.4}" cy="${pos[i][1] - 3.6}" r="3" fill="#fff" opacity=".6"/>`;
    return s + `</g>`;
  }

  /* ---------------- 駒・すき間・印（動く部分） ---------------- */
  function posXY(state, side, i, slotGoal, slotStart) {
    const Rr = E().RULES[state.rule];
    if (i <= 0) return traySlot(side, 'start', slotStart || 0);
    if (i > Rr.L) return traySlot(side, 'goal', slotGoal || 0);
    const rc = E().coords(state.rule, side, i, state.dir ? state.dir[side] : 1);
    return cellXY(state.rule, rc[0], rc[1]);
  }
  const ptXY = (state, q) => !q ? null : q.tray ? traySlot(q.side, q.tray, q.slot || 0) : q.spot ? spotOf(q.spot) : cellXY(state.rule, q.r, q.c);
  /* ---------------- すき間の文字（待ち・上がり・宝・場）を、空いている幅に収める ----------------
     長い言語（ロシア語「Клад: Красные」、トルコ語、ポルトガル語など）は腕の先や盤のふちに重なるので、
     1行で少し縮めれば入るならそうし、足りなければ2行に分け、それでも足りなければ入るまで縮める。
     幅はページの書体で実際に測る（canvas）。Node（selftest）では測れないので何もしない */
  let fitCtx = null, fitFont = '';
  const fitCache = new Map();
  function fitBegin() {
    if (typeof document === 'undefined' || !document.body) { fitCtx = null; return; }
    try {
      if (!fitCtx) { fitCtx = document.createElement('canvas').getContext('2d'); if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => fitCache.clear()); }
      const ff = getComputedStyle(document.body).fontFamily || 'sans-serif';
      if (ff !== fitFont) { fitFont = ff; fitCache.clear(); }
    } catch (e) { fitCtx = null; }
  }
  // 太さ 700・大きさ 100 での幅（単位あたりに直して使う）
  function textW(str, size) {
    if (!fitCtx) return 0;
    let w = fitCache.get(str);
    if (w == null) { fitCtx.font = `700 100px ${fitFont}`; w = fitCtx.measureText(str).width * 1.04; if (fitCache.size > 400) fitCache.clear(); fitCache.set(str, w); }
    return w * size / 100;
  }
  // half(y0, y1)：その高さの帯で、中心 x から左右に使える幅の半分。
  // places：置き場所の候補 [{ y, dir }]（先頭がふだんの場所。dir は2行にするとき伸ばす向き：-1 上、+1 下、0 は2行にしない）。
  // ふだんの場所に1行で（9割までの縮小で）入ればそのまま。入らなければ、候補のうちいちばん大きい字で入るものを選ぶ
  function fitText(str, x, size, half, places, attrs) {
    str = String(str == null ? '' : str);
    const one = (t, yy, f) => `<text x="${f1(x)}" y="${f1(yy)}" font-size="${f1(f)}" ${attrs}>${esc(t)}</text>`;
    fitBegin();
    if (!fitCtx || !str) return one(str, places[0].y, size);
    const band = (yy, f) => Math.max(20, 2 * half(yy - f * .86, yy + f * .26));
    let best = null;
    const take = (k, bonus, draw) => { if (!best || k + bonus > best.score + .001) best = { score: k + bonus, draw }; };
    for (let n = 0; n < places.length; n++) {
      const { y, dir } = places[n], k1 = Math.min(1, band(y, size) / textW(str, size));
      if (n === 0 && k1 >= .9) return one(str, y, size * k1);
      take(k1, -n * .05, () => one(str, y, size * Math.max(.5, k1)));
      if (!dir) continue;
      // 2行：空白のうち、いちばん大きい字で入る所で分ける
      for (let i = str.indexOf(' '); i > 0; i = str.indexOf(' ', i + 1)) {
        const A = str.slice(0, i), B = str.slice(i + 1); if (!A.trim() || !B.trim()) continue;
        let k = 1, ya = y, yb = y;
        for (let it = 0; it < 3; it++) { const f = size * k, lh = f * 1.12; ya = dir < 0 ? y - lh : y; yb = dir < 0 ? y : y + lh; k = Math.min(1, k * Math.min(band(ya, f) / textW(A, f), band(yb, f) / textW(B, f))); }
        take(k, -n * .05 - .08, () => { const f = size * Math.max(.5, k), lh = f * 1.12; return one(A, dir < 0 ? y - lh : y, f) + one(B, dir < 0 ? y : y + lh, f); });
      }
    }
    return best.draw();
  }
  function liveSVG(p, state, o, opt) {
    opt = opt || {};
    const g = geo(state.rule), u = g.u, Rr = g.R, D = BD[o.design] || BD.petate, pd = u * .74, lab = o.trayLabel || (k => '');
    let s = '';
    // 直前の手
    if (opt.last) for (const q of [opt.last.from, opt.last.to]) { const xy = q && q.r != null ? cellXY(state.rule, q.r, q.c) : null; if (xy) s += `<rect x="${f1(-u * .46)}" y="${f1(-u * .46)}" width="${f1(u * .92)}" height="${f1(u * .92)}" rx="${f1(u * .1)}" transform="translate(${f1(xy[0])} ${f1(xy[1])}) rotate(45)" fill="#ffd54a" opacity="${q === opt.last.to ? .42 : .22}"/>`; }
    // 印（光るマス・危険・文字・道）
    const marks = opt.marks || [];
    for (const m of marks) {
      if (m.type === 'path') {
        const dir = state.dir ? state.dir[m.side] : 1, pts = [];
        for (let i = Math.max(1, m.from); i <= Math.min(Rr.L, m.to); i++) { const rc = E().coords(state.rule, m.side, i, dir); pts.push(cellXY(state.rule, rc[0], rc[1])); }
        if (pts.length > 1) {
          s += `<polyline points="${pts.map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="none" stroke="#3a2a00" stroke-opacity=".5" stroke-width="${f1(u * .2)}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts.map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="none" stroke="${m.color || '#ffe27a'}" stroke-width="${f1(u * .11)}" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${f1(u * .22)} ${f1(u * .2)}"><animate attributeName="stroke-dashoffset" from="${f1(u * .42)}" to="0" dur="0.7s" repeatCount="indefinite"/></polyline>`;
          const A = pts[pts.length - 2], B = pts[pts.length - 1], an = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
          s += `<path d="M${f1(u * .34)} 0L${f1(-u * .18)} ${f1(-u * .28)}V${f1(u * .28)}Z" transform="translate(${f1(B[0])} ${f1(B[1])}) rotate(${f1(an)})" fill="${m.color || '#ffe27a'}" stroke="#3a2a00" stroke-width="${f1(u * .04)}"/>`;
        }
        continue;
      }
      if (m.type === 'arrow') { s += arrowSVG(ptXY(state, m.from), ptXY(state, m.to), m.color || GREEN, u); continue; }
      if (m.r == null) continue;
      const [x, y] = cellXY(state.rule, m.r, m.c);
      if (m.type === 'glow') s += `<g transform="translate(${f1(x)} ${f1(y)})"><circle r="${f1(u * .78)}" fill="url(#${p}gg)"><animate attributeName="opacity" values=".55;1;.55" dur="1.5s" repeatCount="indefinite"/></circle><rect x="${f1(-u * .45)}" y="${f1(-u * .45)}" width="${f1(u * .9)}" height="${f1(u * .9)}" rx="${f1(u * .1)}" transform="rotate(45)" fill="${m.color || '#ffc928'}" fill-opacity=".72" stroke="#fff6c8" stroke-width="${f1(u * .06)}"/></g>`;
      else if (m.type === 'danger' || m.type === 'safe' || m.type === 'ring') { const col = m.color || (m.type === 'danger' ? '#ff4d3d' : m.type === 'safe' ? GREEN : '#ffe27a'); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(u * .47)}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="${f1(u * .15)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(u * .47)}" fill="none" stroke="${col}" stroke-width="${f1(u * .09)}"/>`; }
    }
    // 待ち駒・上がった駒（すき間）
    for (const sd of [0, 1]) {
      const wait = [], home = []; state.pos[sd].forEach((i, k) => { if (i <= 0) wait.push(k); else if (i > Rr.L) home.push(k); });
      for (const [kind, list] of [['start', wait], ['goal', home]]) {
        const b = trayBox(sd, kind);
        if (o.trays !== false) {
          s += `<g class="pt-trayb" data-side="${sd}" data-kind="${kind}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="18" fill="${D.ink}" fill-opacity=".1" stroke="${D.ink}" stroke-opacity=".28" stroke-width="2" stroke-dasharray="${kind === 'goal' ? '0' : '6 5'}"/>` +
            fitText(lab(kind) + ' ' + list.length, b.cx, 24, () => Math.min(TX0 - 6, 482 - Math.abs(b.cx)), [{ y: b.ly + 7, dir: 0 }], `text-anchor="middle" font-weight="700" fill="${D.ink}" fill-opacity=".86" style="paint-order:stroke" stroke="${D.bg[0]}" stroke-opacity=".5" stroke-width="3"`) + `</g>`;
          list.forEach((k, j) => { const [x, y] = traySlot(sd, kind, j); s += pieceSVG(p, o.pieces, sd, x, y, TD, k, 'pt-pc pt-off', `data-side="${sd}" data-pos="${kind === 'start' ? 0 : Rr.goal}" data-piece="${k}"`); });
        }
      }
    }
    // 宝：各自と場。名前はふだん数の外側（青は上、赤は下）。長くて入らない言語は、すき間の広い内側（数と場の間）に置き、要れば2行にする
    if (o.trays !== false && state.gold) {
      for (const [w, n, t] of [[1, state.gold[1], lab('gold1')], ['pool', state.pool, lab('pool')], [0, state.gold[0], lab('gold0')]]) {
        const [x, y] = spotOf(w), pool = w === 'pool';
        s += `<g class="pt-gold" data-w="${w}">` + (pool ? `<circle cx="${x}" cy="${y}" r="62" fill="${D.ink}" fill-opacity=".1" stroke="${D.ink}" stroke-opacity=".32" stroke-width="2" stroke-dasharray="5 5"/>` : '') +
          gemsSVG(p, x - (pool ? 0 : 34), y - (pool ? 16 : 0), n, pool ? 1 : .9) +
          `<text x="${x + (pool ? 0 : 22)}" y="${y + (pool ? 40 : 15)}" text-anchor="middle" font-size="${pool ? 40 : 44}" font-weight="800" fill="${D.ink}" style="paint-order:stroke" stroke="${D.bg[0]}" stroke-opacity=".6" stroke-width="4" font-family="'JetBrains Mono',ui-monospace,monospace">${n}</text>` +
          (t ? fitText(t, x + (pool ? 0 : -4), 23, (ya, yb) => { const cx = x + (pool ? 0 : -4); return Math.min(480 - cx, cx - (Math.max(Math.abs(ya), Math.abs(yb)) + R2 * u * 1.07 + 8)); }, pool ? [{ y: y - 44, dir: 0 }] : w === 0 ? [{ y: y + 52, dir: 0 }, { y: y - 32, dir: -1 }] : [{ y: y - 34, dir: 0 }, { y: y + 43, dir: 1 }], `text-anchor="middle" font-weight="700" fill="${D.ink}" fill-opacity=".86" style="paint-order:stroke" stroke="${D.bg[0]}" stroke-opacity=".5" stroke-width="3"`) : '') + `</g>`;
      }
    }
    // 盤上の駒
    for (const sd of [0, 1]) state.pos[sd].forEach((i, k) => {
      if (i < 1 || i > Rr.L || (opt.hide && opt.hide.side === sd && opt.hide.piece === k)) return;
      const [x, y] = posXY(state, sd, i);
      s += pieceSVG(p, o.pieces, sd, x, y, pd, k, 'pt-pc', `data-side="${sd}" data-pos="${i}" data-piece="${k}"`);
    });
    // 印（駒の上に出すもの）
    for (const m of marks) {
      if (m.r == null || !(m.type === 'text' || m.text)) continue;
      const [x, y] = cellXY(state.rule, m.r, m.c), badge = m.type !== 'text';
      if (badge) s += `<g transform="translate(${f1(x + u * .34)} ${f1(y - u * .4)})"><rect x="${f1(-u * .42)}" y="${f1(-u * .24)}" width="${f1(u * .84)}" height="${f1(u * .48)}" rx="${f1(u * .2)}" fill="${m.type === 'danger' ? '#c62a1c' : '#0b5a3a'}" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/><text y="${f1(u * .13)}" text-anchor="middle" font-size="${f1(u * .34)}" font-weight="800" fill="#fff">${esc(m.text)}</text></g>`;
      else s += `<text x="${f1(x)}" y="${f1(y + (m.size || u * .4) * .36)}" text-anchor="middle" font-size="${f1(m.size || u * .4)}" font-weight="800" fill="${m.color || '#fff6cf'}" style="paint-order:stroke" stroke="#1a1206" stroke-width="${f1(u * .09)}" stroke-linejoin="round">${esc(m.text)}</text>`;
    }
    // 動かせる先（明るい緑＋暗い縁）、候補の矢印
    for (const t of opt.targets || []) {
      const xy = t.tray ? traySlot(t.side, t.tray, t.slot || 0) : cellXY(state.rule, t.r, t.c);
      s += `<g class="pt-tg" transform="translate(${f1(xy[0])} ${f1(xy[1])})"><circle r="${f1(u * (t.capture ? .46 : .26))}" fill="${t.capture ? 'none' : GREEN}" fill-opacity=".92" stroke="${GREEN_EDGE}" stroke-width="${f1(u * (t.capture ? .17 : .07))}"/>${t.capture ? `<circle r="${f1(u * .46)}" fill="none" stroke="${GREEN}" stroke-width="${f1(u * .09)}"/>` : ''}</g>`;
    }
    if (opt.hint) s += arrowSVG(ptXY(state, opt.hint.from), ptXY(state, opt.hint.to), GREEN, u);
    return s;
  }
  function arrowSVG(A, B, col, u) {
    if (!A || !B) return '';
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy); if (len < 1) return '';
    const an = Math.atan2(dy, dx) * 180 / Math.PI, hd = u * .46, L = Math.max(0, len - hd * .9);
    const sh = `M0 ${f1(-u * .09)}H${f1(L)}V${f1(-u * .27)}L${f1(L + hd)} 0L${f1(L)} ${f1(u * .27)}V${f1(u * .09)}H0Z`;
    return `<g class="pt-arrow" transform="translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(an)})" pointer-events="none"><path d="${sh}" fill="${col}" stroke="${GREEN_EDGE}" stroke-width="${f1(u * .07)}" stroke-linejoin="round" opacity=".95"/></g>`;
  }

  /* ---------------- 対局用の盤 ---------------- */
  function mount(host, opts) {
    const o = Object.assign({ design: 'petate', pieces: 'pebble', speed: 1 }, opts || {});
    const p = 'pt' + (++UID) + '-', hs = { cell: [], tray: [] };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', VIEW.join(' ')); svg.setAttribute('class', 'pt-board'); svg.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation;user-select:none;-webkit-user-select:none';
    host.innerHTML = ''; host.appendChild(svg);
    let state = null, lastOpt = {}, built = '';
    const gDefs = document.createElementNS(NS, 'defs'), gBoard = document.createElementNS(NS, 'g'), gLive = document.createElementNS(NS, 'g'), gFx = document.createElementNS(NS, 'g');
    svg.append(gDefs, gBoard, gLive, gFx); gFx.setAttribute('pointer-events', 'none');
    function build(rule) {
      const k = rule + '|' + o.design + '|' + o.pieces; if (k === built) return; built = k;
      gDefs.innerHTML = defs(p, o.design, o.pieces); gBoard.innerHTML = boardOf(p, rule, o.design);
    }
    const view = {
      el: svg, svg: () => svg, orient: () => 's', key: () => 's', notch: () => false,
      render(st, opt) { state = st; lastOpt = opt || {}; build(st.rule); gLive.innerHTML = liveSVG(p, st, o, lastOpt); return view; },
      on(ev, fn) { (hs[ev] || (hs[ev] = [])).push(fn); return view; },
      setDesign(d, pc) { if (d) o.design = d; if (pc) o.pieces = pc; if (state) view.render(state, lastOpt); return view; },
      setOrient() { return view; },
      cellXY: (r, c) => cellXY(state ? state.rule : 'bell', r, c),
      spot: n => SPOT[n],
      // 駒を1マスずつ道なりに進める。from 0＝待ちから、to＝goal は上がりへ。capture＝取られた相手の駒が待ちへ戻る
      animateMove(side, from, to, info) {
        info = info || {};
        if (!state) return Promise.resolve();
        const st = state, Rr = E().RULES[st.rule], u = geo(st.rule).u, sp = info.speed || o.speed || 1;
        const piece = st.pos[side].indexOf(from); if (piece < 0) return Promise.resolve();
        const pts = [];
        const waitIdx = st.pos[side].filter((x, k) => x <= 0 && k < piece).length, homeN = st.pos[side].filter(x => x > Rr.L).length;
        pts.push(posXY(st, side, from, 0, waitIdx));
        if (from === 0 && !Rr.enterAny) { /* 出発マスへ置くだけ */ }
        for (let i = Math.max(1, from + 1); i <= Math.min(to, Rr.L); i++) pts.push(posXY(st, side, i));
        if (to > Rr.L) pts.push(traySlot(side, 'goal', homeN));
        // 取られる駒
        let capEl = null, capFrom = null, capTo = null;
        if (info.capture && to <= Rr.L) {
          const q = E().qOf(Rr, side, to, st.dir[side]), op = 1 - side, k = st.pos[op].findIndex(i => i >= 1 && i <= Rr.L && E().qOf(Rr, op, i, st.dir[op]) === q);
          if (k >= 0) { capEl = gLive.querySelector(`.pt-pc[data-side="${op}"][data-piece="${k}"]`); capFrom = posXY(st, op, st.pos[op][k]); capTo = traySlot(op, 'start', st.pos[op].filter(x => x <= 0).length); }
        }
        const own = gLive.querySelector(`.pt-pc[data-side="${side}"][data-piece="${piece}"]`); if (own) own.style.visibility = 'hidden';
        gLive.querySelectorAll('.pt-tg, .pt-arrow').forEach(el => el.remove());
        const tmp = document.createElementNS(NS, 'g'); tmp.innerHTML = pieceSVG(p, o.pieces, side, 0, 0, u * .74, piece); const mv = tmp.firstChild; gFx.appendChild(mv);
        const per = Math.max(55, (pts.length > 6 ? 95 : 130)) / sp, total = per * (pts.length - 1);
        return new Promise(res => {
          const t0 = performance.now();
          const step = now => {
            const t = Math.max(0, Math.min(1, (now - t0) / Math.max(1, total))), f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i;
            const A = pts[i], B = pts[i + 1] || A, hop = Math.sin(Math.PI * k) * u * .16;
            mv.setAttribute('transform', `translate(${f1(A[0] + (B[0] - A[0]) * k)} ${f1(A[1] + (B[1] - A[1]) * k - hop)}) scale(${(1 + hop / u * .5).toFixed(3)})`);
            if (t < 1 && svg.isConnected) { requestAnimationFrame(step); return; }
            if (!capEl) { mv.remove(); res(); return; }
            const c0 = performance.now(), cd = 380 / sp;
            const back = n2 => { const q = Math.max(0, Math.min(1, (n2 - c0) / cd)), e = q * q * (3 - 2 * q); capEl.setAttribute('transform', `translate(${f1(capFrom[0] + (capTo[0] - capFrom[0]) * e)} ${f1(capFrom[1] + (capTo[1] - capFrom[1]) * e - Math.sin(Math.PI * q) * u * .8)})`); if (q < 1 && svg.isConnected) requestAnimationFrame(back); else { mv.remove(); res(); } };
            requestAnimationFrame(back);
          };
          if (pts.length < 2) { mv.remove(); res(); } else requestAnimationFrame(step);
        });
      },
      // 宝の支払い：玉が from から to へ飛び、「+n」が浮かぶ（from/to＝0|1|'pool'）
      animatePay(from, to, amt, info) {
        const sp = (info && info.speed) || o.speed || 1, A = spotOf(from), B = spotOf(to); if (!A || !B) return Promise.resolve();
        const n = Math.min(5, Math.max(1, amt)), els = [];
        for (let i = 0; i < n; i++) { const t = document.createElementNS(NS, 'g'); t.innerHTML = `<g><circle r="15" fill="url(#${p}gem)" stroke="#06383c" stroke-width="2"/><circle cx="-4.5" cy="-5" r="4" fill="#fff" opacity=".65"/></g>`; const el = t.firstChild; el.setAttribute('transform', `translate(${A[0]} ${A[1]})`); gFx.appendChild(el); els.push(el); }
        const lbl = document.createElementNS(NS, 'g');
        lbl.innerHTML = `<text text-anchor="middle" font-size="46" font-weight="800" fill="#fff" style="paint-order:stroke" stroke="#0a4d52" stroke-width="7" stroke-linejoin="round">+${amt}</text>`;
        const dur = 620 / sp, gap = 90 / sp, t0 = performance.now(), end = dur + gap * (n - 1), tail = 520 / sp;
        return new Promise(res => {
          const step = now => {
            const el = now - t0;
            els.forEach((g, i) => { const q = Math.max(0, Math.min(1, (el - gap * i) / dur)), e = q * q * (3 - 2 * q); g.setAttribute('transform', `translate(${f1(A[0] + (B[0] - A[0]) * e)} ${f1(A[1] + (B[1] - A[1]) * e - Math.sin(Math.PI * q) * 70)}) scale(${(1 + Math.sin(Math.PI * q) * .5).toFixed(2)})`); g.style.opacity = q >= 1 ? 0 : 1; });
            if (el >= end) { if (!lbl.isConnected) gFx.appendChild(lbl); const q = Math.max(0, Math.min(1, (el - end) / tail)); lbl.setAttribute('transform', `translate(${B[0] + (B[0] > 380 ? -30 : 0)} ${f1(B[1] - 46 - q * 34)})`); lbl.style.opacity = String(1 - q * q); }
            if (el < end + tail && svg.isConnected) requestAnimationFrame(step); else { els.forEach(g => g.remove()); lbl.remove(); res(); }
          };
          requestAnimationFrame(step);
        });
      },
    };
    // タップの判定：画面の点 → SVG → 格子（45度戻す）。小さいマスでも押しやすいよう、座標から決める
    function locate(e) {
      const m = svg.getScreenCTM(); if (!m || !state) return null;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m.inverse());
      const g = geo(state.rule), gx = (q.x + q.y) / R2 / g.u, gy = (q.y - q.x) / R2 / g.u, c = Math.floor(gx + g.a + 1), r = Math.floor(gy + g.a + 1);
      const inArm = (r >= 0 && r < g.G && c >= 0 && c < g.G) && ((c >= g.a && c <= g.a + 1) || (r >= g.a && r <= g.a + 1));
      if (inArm) return { r, c };
      for (const sd of [0, 1]) for (const kind of ['start', 'goal']) { const b = trayBox(sd, kind); if (q.x >= b.x - 8 && q.x <= b.x + b.w + 8 && q.y >= b.y - 8 && q.y <= b.y + b.h + 34) return { tray: kind, side: sd }; }
      return { x: q.x, y: q.y };
    }
    svg.addEventListener('click', e => {
      const at = locate(e); if (!at) return;
      if (at.tray) { hs.tray.forEach(fn => fn({ side: at.side, kind: at.tray })); return; }
      if (at.r == null) return;
      const ev = { r: at.r, c: at.c, side: null, piece: null }, Rr = E().RULES[state.rule];
      for (const sd of [0, 1]) state.pos[sd].forEach((i, k) => { if (i >= 1 && i <= Rr.L) { const rc = E().coords(state.rule, sd, i, state.dir[sd]); if (rc[0] === at.r && rc[1] === at.c) { ev.side = sd; ev.piece = k; } } });
      hs.cell.forEach(fn => fn(ev));
    });
    return view;
  }

  /* ---------------- ミニ盤（一覧・デザインのタイル） ---------------- */
  function mini(state, opt) {
    opt = opt || {};
    const p = 'ptm' + (++UID) + '-', o = { design: opt.design || 'petate', pieces: opt.pieces || 'pebble', trays: opt.trays !== false && opt.crop !== 'auto', trayLabel: opt.trayLabel };
    const st = Object.assign({ dir: [1, 1], gold: null, pool: 0 }, state);
    let vb = VIEW.slice();
    if (opt.crop === 'auto') {   // 駒と印のまわりを切り出して大きく見せる（全体が要る局面は全体）
      const g = geo(st.rule), Rr = g.R, pts = [];
      for (const sd of [0, 1]) st.pos[sd].forEach(i => { if (i >= 1 && i <= Rr.L) pts.push(posXY(st, sd, i)); });
      for (const m of opt.cropMarks || opt.marks || []) if (m && m.r != null && m.type !== 'text') pts.push(cellXY(st.rule, m.r, m.c));
      if (pts.length) {
        let x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1])), y1 = Math.max(...pts.map(q => q[1]));
        const pad = g.u * 1.5, size = Math.max(x1 - x0, y1 - y0, g.u * 4.4) + pad * 2;
        if (size < 760) { const cx = Math.max(-500 + size / 2, Math.min(500 - size / 2, (x0 + x1) / 2)), cy = Math.max(-500 + size / 2, Math.min(500 - size / 2, (y0 + y1) / 2)); vb = [cx - size / 2, cy - size / 2, size, size]; }
        else o.trays = opt.trays !== false;
      } else o.trays = opt.trays !== false;
    }
    return `<svg xmlns="${NS}" viewBox="${vb.map(f1).join(' ')}" class="pt-mini" style="display:block;width:100%;height:auto"><defs>${defs(p, o.design, o.pieces)}</defs>${boardSVG(p, st.rule, o.design)}${liveSVG(p, st, o, { marks: opt.marks || [], hint: opt.hint, last: opt.last })}</svg>`;
  }

  /* ---------------- 豆（さいころ）：黒い豆5個。片面に白い点（印） ---------------- */
  function dice(host, opts) {
    const o = Object.assign({ speed: 1 }, opts || {});
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'pt-beans'); svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
    host.innerHTML = ''; host.appendChild(svg);
    let W = 216, H = 250, slots = [], cur = null, token = 0;
    function size() {
      const w = host.clientWidth || 216, h = host.clientHeight || 250; const k = 250 / Math.max(1, Math.max(w, h));
      W = Math.max(60, w * k); H = Math.max(40, h * k); svg.setAttribute('viewBox', `0 0 ${f1(W)} ${f1(H)}`);
      const wide = W > H * 1.5, s = wide ? Math.min(H * .8, W / 5.6) : Math.min(W, H) * .3;
      slots = wide ? [0, 1, 2, 3, 4].map(i => [W * (i + .5) / 5, H / 2, s]) : [[W * .28, H * .22, s], [W * .72, H * .22, s], [W * .5, H * .5, s], [W * .28, H * .78, s], [W * .72, H * .78, s]];
    }
    const bean = (v, sz, sq) => `<g transform="scale(1 ${sq == null ? 1 : sq.toFixed(3)})"><ellipse cx="${f1(sz * .04)}" cy="${f1(sz * .1)}" rx="${f1(sz * .5)}" ry="${f1(sz * .33)}" fill="#000" opacity=".3"/><path d="M${f1(-sz * .5)} 0C${f1(-sz * .5)} ${f1(-sz * .34)} ${f1(-sz * .2)} ${f1(-sz * .36)} 0 ${f1(-sz * .3)}C${f1(sz * .2)} ${f1(-sz * .36)} ${f1(sz * .5)} ${f1(-sz * .34)} ${f1(sz * .5)} 0C${f1(sz * .5)} ${f1(sz * .32)} ${f1(sz * .22)} ${f1(sz * .36)} 0 ${f1(sz * .34)}C${f1(-sz * .22)} ${f1(sz * .36)} ${f1(-sz * .5)} ${f1(sz * .32)} ${f1(-sz * .5)} 0Z" fill="${v ? '#221a14' : '#17120e'}" stroke="#000" stroke-width="${f1(sz * .03)}"/><ellipse cx="${f1(-sz * .16)}" cy="${f1(-sz * .15)}" rx="${f1(sz * .2)}" ry="${f1(sz * .07)}" fill="#fff" opacity=".2"/>${v ? `<circle r="${f1(sz * .13)}" fill="#fbf6e6" stroke="#8a7c5c" stroke-width="${f1(sz * .02)}"/>` : `<path d="M${f1(-sz * .2)} ${f1(sz * .02)}Q0 ${f1(sz * .1)} ${f1(sz * .2)} ${f1(sz * .02)}" fill="none" stroke="#3a2e22" stroke-width="${f1(sz * .035)}" stroke-linecap="round"/>`}</g>`;
    function draw(d, pose) {
      svg.innerHTML = d.map((v, i) => { const q = pose ? pose[i] : { x: slots[i][0], y: slots[i][1], a: ROT[i], f: v, sq: 1 }; return `<g transform="translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(q.a)})">${bean(q.f, slots[i][2], q.sq)}</g>`; }).join('');
    }
    let ROT = [-18, 24, 6, 32, -28];
    const api = {
      shown: false, count: 5, is3D: () => false, setStyle() {},
      show(d) { token++; size(); cur = (d || [0, 0, 0, 0, 0]).slice(0, 5); while (cur.length < 5) cur.push(0); draw(cur); api.shown = true; },
      roll(d, info) {
        info = info || {}; size();
        const fin = d.slice(0, 5), sp = info.speed || o.speed || 1, my = ++token, dur = 760 / sp;
        ROT = fin.map(() => Math.random() * 80 - 40);
        const from = info.side === 1 ? -1 : 1;   // どちら側から投げ込むか
        const st = fin.map((v, i) => ({ x0: W / 2 + (Math.random() - .5) * W * .3, y0: H / 2 + from * H * 1.15, d: Math.random() * 140 / sp, spin: (Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 360), flips: 3 + Math.floor(Math.random() * 3), hit: false }));
        return new Promise(res => {
          const t0 = performance.now();
          const step = now => {
            if (my !== token) { res(); return; }
            let done = true;
            const pose = fin.map((v, i) => {
              const s = st[i], q = Math.max(0, Math.min(1, (now - t0 - s.d) / dur)); if (q < 1) done = false;
              const e = 1 - Math.pow(1 - q, 3), ph = q * s.flips * Math.PI, sq = Math.max(.12, Math.abs(Math.cos(ph)));
              if (q >= .82 && !s.hit) { s.hit = true; if (info.onHit) try { info.onHit(i, .6 + Math.random() * .5); } catch (x) {} }
              const face = q >= 1 ? v : (Math.floor(ph / Math.PI + .5) + v + s.flips) % 2;
              return { x: s.x0 + (slots[i][0] - s.x0) * e, y: s.y0 + (slots[i][1] - s.y0) * e - Math.sin(Math.PI * Math.min(1, q * 1.15)) * H * .12 * (1 - q), a: ROT[i] + s.spin * (1 - e), f: face, sq: q >= 1 ? 1 : sq };
            });
            draw(fin, pose);
            if (!done && svg.isConnected) requestAnimationFrame(step); else { cur = fin; draw(fin); api.shown = true; res(); }
          };
          requestAnimationFrame(step);
        });
      },
    };
    return api;
  }

  // 駒2個の絵（デザインのタイル用）、1個の絵（対局者の欄・結果）
  function pieceIcon(pieces, side) {
    const p = 'pti' + (++UID) + '-';
    if (side == null) return `<svg xmlns="${NS}" viewBox="0 0 150 80" style="display:block;width:100%;height:auto"><defs>${defs(p, 'petate', pieces)}</defs>${pieceSVG(p, pieces, 0, 42, 38, 58, 1)}${pieceSVG(p, pieces, 1, 108, 38, 58, 2)}</svg>`;
    return `<svg xmlns="${NS}" viewBox="0 0 64 64" style="display:block;width:100%;height:100%"><defs>${defs(p, 'petate', pieces)}</defs>${pieceSVG(p, pieces, side, 32, 30, 54, 1)}</svg>`;
  }
  window.PatolliBoard2D = { pieceIcon, mount, mini, dice, BOARDS, PIECES, GREEN, VIEW, SPOT, cellXY, traySlot, geo, BD, PC };
})();
