/* だつごく！スライド — course story: one illustrated scene + a short story per prison floor (shown when a floor is opened before any stage is cleared)
   JBStory.scene(f, inmateSvg) → SVG string (320×180) · texts: 'sy.<f>' in JB_I18N (10 languages), 'sy.go' / 'sy.btn' */
(function () {
  'use strict';
  const INK = '#2a2622';
  const st = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
  const R = (x, y, w, h, f, o = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${o}/>`;
  const bars = (x0, x1, y0, y1, n, col = '#5d6575') => Array.from({ length: n }, (_, i) => { const x = x0 + (x1 - x0) * i / (n - 1); return `<rect x="${x - 3}" y="${y0}" width="6" height="${y1 - y0}" rx="2" fill="${col}" ${st(1.6)}/>`; }).join('');
  const room = (wall, floor, line = 'rgba(0,0,0,.08)') => R(0, 0, 320, 180, wall) + `<path d="M0 36h320M0 72h320" stroke="${line}" stroke-width="2"/>` + R(0, 128, 320, 52, floor) + `<path d="M0 128h320" stroke="${INK}" stroke-width="2.4"/><path d="M40 128l-30 52M120 128l-14 52M200 128l14 52M280 128l30 52" stroke="rgba(0,0,0,.08)" stroke-width="2"/>`;
  const win = (x, y, w, h, sky = '#9fd3f0') => R(x, y, w, h, sky, st()) + bars(x + 6, x + w - 6, y, y + h, Math.max(3, Math.round(w / 12)), '#4a5160');
  const lamp = (x, c = '#ffe9a8') => `<path d="M${x} 0v14" stroke="${INK}" stroke-width="2"/><path d="M${x - 12} 24q12 -14 24 0z" fill="#5d6575" ${st(2)}/><ellipse cx="${x}" cy="26" rx="7" ry="3" fill="${c}"/>`;
  const crate = (x, y, s = 30, c = '#b07a48') => R(x, y, s, s, c, st()) + `<path d="M${x} ${y}l${s} ${s}M${x + s} ${y}l${-s} ${s}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
  const shelf = (x, y, w, h, c = '#8a5a36') => { let s = R(x, y, w, h, c, st()); const cols = ['#d64541', '#3d8fd1', '#e0a800', '#6f8b5e', '#8c7aa0', '#f26b1d']; for (let r = 0; r < 3; r++) { const yy = y + 6 + r * (h - 8) / 3; let xx = x + 5; for (let k = 0; xx < x + w - 8; k++) { const bw = 5 + (k * 7 + r * 3) % 5; s += R(xx, yy, bw, (h - 8) / 3 - 4, cols[(k + r * 2) % cols.length], st(1)); xx += bw + 1; } s += `<path d="M${x} ${yy + (h - 8) / 3 - 2}h${w}" stroke="${INK}" stroke-width="2"/>`; } return s; };
  // comic-style prison guard: peaked cap + badge, mirrored aviators, square jaw, navy uniform, baton
  const guard = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M14 40l8-16" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M14 40l8-16" stroke="#3a3f4a" stroke-width="2.6" stroke-linecap="round"/><path d="M-16 40q0-22 16-22t16 22z" fill="#243a5e" ${st()}/><path d="M6 19q10 4 10 21h-8z" fill="#16243d"/><path d="M-4 18l4 6 4-6z" fill="#bcd3ea" ${st(1.4)}/><path d="M-11 27l3-2 3 2-1 4h-4z" fill="#ffcd3c" ${st(1.2)}/><path d="M-10 0v8q0 9 10 9t10-9v-8z" fill="#e8b48c" ${st()}/><path d="M3 0h7v8q0 9-7 9z" fill="#c98d63"/><path d="M-4 12h8" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M-10 2h9q0 5-4.5 5t-4.5-5zM1 2h9q0 5-4.5 5t-4.5-5z" fill="#f26b1d" ${st(1.6)}/><path d="M-8 3.5l3-1M3 3.5l3-1" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><path d="M-13 -3q-1-12 13-13q14 1 13 13z" fill="#2b4572" ${st(2)}/><path d="M-14 -3q14-3 28 0l-1 3q-13-3-26 0z" fill="#14161c" ${st(1.6)}/><path d="M-2 -13h4v4q-2 2-4 0z" fill="#ffcd3c" ${st(1.2)}/></g>`;
  const SC = [
    // 0 holding cells: bars in front, a bench, a small window
    () => room('#c9c2b3', '#9a9080') + win(214, 24, 52, 40) + R(30, 104, 110, 10, '#7a6a5a', st()) + R(38, 114, 8, 14, '#5a4a3a') + R(124, 114, 8, 14, '#5a4a3a') + lamp(160) + `<path d="M0 6h320" stroke="#4a5160" stroke-width="8"/>` + bars(8, 312, 6, 180, 15, '#4a5160') + R(0, 150, 320, 6, '#4a5160'),
    // 1 shared cells: bunk beds and lockers
    () => room('#d6cdb8', '#a39478') + (() => { let s = ''; [20, 120].forEach(x => { s += R(x, 40, 84, 88, 'none', st()) + R(x + 4, 56, 76, 12, '#e8e1cf', st(2)) + R(x + 4, 100, 76, 12, '#e8e1cf', st(2)) + `<path d="M${x} 40v88M${x + 84} 40v88" stroke="${INK}" stroke-width="5"/>` + R(x + 8, 50, 20, 8, '#fff', st(1.5)) + R(x + 8, 94, 20, 8, '#fff', st(1.5)); }); for (let i = 0; i < 4; i++) s += R(222 + i * 23, 46, 22, 82, ['#7a8fa6', '#6f8b5e', '#7a8fa6', '#8c7aa0'][i], st()) + `<path d="M${230 + i * 23} 56h6M${230 + i * 23} 60h6" stroke="${INK}" stroke-width="1.6"/>`; return s; })(),
    // 2 laundry: washing machines, steam, a pile of sheets
    () => room('#cfe3ea', '#8fb3bf') + (() => { let s = ''; for (let i = 0; i < 4; i++) { const x = 14 + i * 58; s += R(x, 64, 52, 64, '#f4f4f0', st()) + `<circle cx="${x + 26}" cy="100" r="17" fill="#9fd3f0" ${st()}/><circle cx="${x + 26}" cy="100" r="10" fill="#fff" opacity=".6"/>` + R(x + 6, 70, 18, 5, '#5d6575'); } for (let i = 0; i < 5; i++) s += `<path d="M${30 + i * 50} 56q-8-10 0-18t0-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`; s += `<path d="M252 128q-6-34 26-34q30 0 30 34z" fill="#fff" ${st()}/><path d="M262 108q14-8 34 0" fill="none" stroke="#c9d0da" stroke-width="3"/>`; return s; })(),
    // 3 workshop: crates, a workbench and the old blueprint
    () => room('#d8c2a3', '#9c7a56') + R(196, 22, 92, 62, '#3d6fa6', st()) + `<path d="M204 34h40M204 46h60M204 58h30M266 34v40M222 46v26" stroke="#cfe6ff" stroke-width="2"/><circle cx="272" cy="64" r="6" fill="none" stroke="#ffcd3c" stroke-width="2.4"/>` + crate(14, 98) + crate(44, 98) + crate(29, 68) + crate(74, 98, 30, '#a86a3a') + R(118, 92, 90, 8, '#7a4a2a', st()) + R(124, 100, 7, 28, '#5a3a22') + R(194, 100, 7, 28, '#5a3a22') + `<path d="M140 86l20-10 6 6-20 10z" fill="#8d96a8" ${st(1.6)}/>` + lamp(150),
    // 4 mess hall: long tables, trays, pillars, the kitchen door
    () => room('#e7d4b0', '#b59a6a') + R(36, 30, 18, 98, '#c9b28a', st()) + R(266, 30, 18, 98, '#c9b28a', st()) + R(130, 50, 60, 78, '#6b5a4e', st()) + R(136, 56, 48, 22, '#9fd3f0', st(2)) + `<circle cx="178" cy="96" r="3" fill="#ffcd3c"/>` + `<path d="M150 38q4-8 0-14M162 38q4-8 0-14" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>` + (() => { let s = ''; [[10, 110], [200, 110]].forEach(([x, y]) => { s += R(x, y, 110, 10, '#a0784f', st()) + R(x + 8, y + 10, 6, 8, '#5a3a22') + R(x + 96, y + 10, 6, 8, '#5a3a22'); for (let k = 0; k < 3; k++) s += R(x + 12 + k * 32, y - 6, 24, 6, '#c9d0da', st(1.5)) + `<circle cx="${x + 20 + k * 32}" cy="${y - 7}" r="4" fill="#e0a800"/>`; }); return s; })(),
    // 5 library: bookshelves; one stands ajar on a dark secret passage
    () => room('#c8b8a0', '#8a6a4a') + shelf(10, 26, 92, 102) + R(116, 26, 92, 102, '#1e1b18', st()) + `<path d="M126 128l20-50h32l20 50z" fill="#2c2620"/><path d="M162 30v20" stroke="#ffcd3c" stroke-width="2" opacity=".6"/>` + `<g transform="translate(206 26) skewY(-8)">${shelf(0, 0, 40, 102)}</g>` + shelf(250, 26, 62, 102) + lamp(160, '#ffd88a'),
    // 6 infirmary: a bed, a medicine cabinet, the window to the yard
    () => room('#e4f1ee', '#a9c9c2') + win(28, 26, 70, 46, '#bfe7c0') + R(120, 92, 120, 14, '#fff', st()) + R(120, 80, 26, 14, '#fff', st(2)) + R(126, 106, 6, 22, '#8d96a8') + R(228, 106, 6, 22, '#8d96a8') + R(150, 86, 80, 8, '#9fd3f0', st(1.6)) + R(256, 30, 52, 98, '#f4f4f0', st()) + `<path d="M256 62h52M256 94h52" stroke="${INK}" stroke-width="2"/>` + [0, 1, 2, 3].map(i => R(262 + i * 11, 44, 8, 16, ['#d64541', '#3d8fd1', '#e0a800', '#6f8b5e'][i], st(1.2)) + R(262 + i * 11, 76, 8, 16, ['#8c7aa0', '#f26b1d', '#3d8fd1', '#d64541'][i], st(1.2))).join('') + `<path d="M48 104h12M54 98v12" stroke="#d64541" stroke-width="5"/>`,
    // 7 exercise yard: open sky, the high wall, steel posts, a guard
    () => R(0, 0, 320, 180, '#9fd3f0') + `<circle cx="262" cy="30" r="14" fill="#ffe27a"/><path d="M30 30q10-8 20 0q10-6 16 2h-36z" fill="#fff"/>` + R(0, 70, 320, 58, '#b5a28a', st()) + `<path d="M0 82h320M0 98h320M0 114h320" stroke="rgba(0,0,0,.1)" stroke-width="2"/>` + Array.from({ length: 16 }, (_, i) => `<path d="M${i * 21} 70l6-10 6 10" fill="none" stroke="#5d6575" stroke-width="2"/>`).join('') + R(0, 128, 320, 52, '#c9b98a') + `<path d="M0 128h320" stroke="${INK}" stroke-width="2.4"/>` + [60, 150, 240].map(x => R(x, 46, 8, 82, '#5d6575', st(1.6))).join('') + guard(196, 92, 1.1),
    // 8 visiting room: the glass partition, phones, a friend on the other side
    () => room('#d9d0e4', '#a397b5') + R(0, 22, 320, 92, '#cfe6ff', st()) + `<path d="M20 30l40 70M90 30l30 52" stroke="#fff" stroke-width="5" opacity=".6"/>` + `<g transform="translate(232 44)"><path d="M-26 70q0-32 26-32t26 32z" fill="#3d8fd1" ${st()}/><circle cx="0" cy="24" r="16" fill="#e8c9a0" ${st()}/><path d="M-16 18q16-20 32 0" fill="#5a3a22" ${st(2)}/><path d="M10 22q6 4 6 14l-4 2z" fill="#c9a07a"/><circle cx="-6" cy="24" r="2.2" fill="${INK}"/><circle cx="6" cy="24" r="2.2" fill="${INK}"/><path d="M-11 18l8 2M11 17l-8 2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-6 31q6 4 12 -1" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M18 30q12 -6 10 -22" fill="none" ${st(3)}/></g>` + R(0, 110, 320, 18, '#8a7aa0', st()) + R(150, 116, 20, 8, '#2a2622') + `<path d="M268 34h28v16h-28z" fill="#fff" ${st(1.6)}/><text x="282" y="46" font-size="10" font-weight="900" text-anchor="middle" fill="${INK}">0:00</text>`,
    // 9 watch tower: night, the tower, a sweeping searchlight
    () => R(0, 0, 320, 180, '#1d2a44') + Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 67) % 320}" cy="${(i * 29) % 90}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity=".8"/>`).join('') + `<circle cx="44" cy="30" r="12" fill="#ffe9a8"/><circle cx="50" cy="26" r="11" fill="#1d2a44"/>` + `<path d="M228 40L40 180h120z" fill="rgba(255,240,170,.28)"/>` + R(206, 52, 44, 128, '#5d6575', st()) + `<path d="M196 52h64l-8-18h-48z" fill="#4a5160" ${st()}/><path d="M222 34l6-16 6 16" fill="#ffcd3c" ${st(1.6)}/>` + R(214, 60, 28, 14, '#ffe27a', st(1.6)) + R(0, 140, 320, 40, '#2c3a55') + `<path d="M0 140h320" stroke="#11182a" stroke-width="2.4"/>` + Array.from({ length: 16 }, (_, i) => `<path d="M${i * 21} 140l6-10 6 10" fill="none" stroke="#8d96a8" stroke-width="2"/>`).join(''),
    // 10 underground waterway: a dark arched tunnel, water, faint moonlight at the end
    () => R(0, 0, 320, 180, '#2a2f36') + `<path d="M40 180V80q120-90 240 0v100z" fill="#3a4048" ${st()}/><path d="M100 180V100q60-50 120 0v80z" fill="#1c2026"/><ellipse cx="160" cy="112" rx="22" ry="26" fill="#cfe6ff" opacity=".55"/><circle cx="160" cy="104" r="7" fill="#fff"/>` + `<path d="M40 136h240v44H40z" fill="#2d4f6a"/>` + [0, 1, 2, 3].map(i => `<path d="M${60 + i * 50} ${146 + (i % 2) * 12}q10-5 20 0t20 0" fill="none" stroke="#9fd3f0" stroke-width="2.4" opacity=".7"/>`).join('') + Array.from({ length: 6 }, (_, i) => `<path d="M${40 + i * 8} ${70 + i * 12}h18M${262 - i * 8} ${70 + i * 12}h18" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`).join(''),
    // 11 solitary block: a corridor of heavy doors, red alarm lights, the last door glowing
    () => R(0, 0, 320, 180, '#3a3f4a') + `<path d="M0 0l110 60h100L320 0z" fill="#2c3038"/><path d="M0 180l110-60h100l110 60z" fill="#4a505c"/>` + R(110, 60, 100, 60, '#23262d', st()) + R(140, 66, 40, 54, '#ffcd3c', st()) + `<rect x="146" y="72" width="28" height="42" fill="#fff3c4"/><circle cx="174" cy="94" r="2.4" fill="${INK}"/>` + [[16, 30, 64, 120], [256, 30, 64, 120]].map(([x, y, w, h]) => R(x, y, w - 20, h - 10, '#5d6575', st()) + R(x + 10, y + 16, w - 40, 12, '#23262d') + `<circle cx="${x + w - 30}" cy="${y + 60}" r="3" fill="${INK}"/>`).join('') + `<circle cx="110" cy="40" r="7" fill="#ff4d4d"/><circle cx="210" cy="40" r="7" fill="#ff4d4d"/><circle cx="110" cy="40" r="16" fill="#ff4d4d" opacity=".25"/><circle cx="210" cy="40" r="16" fill="#ff4d4d" opacity=".25"/>`,
  ];
  // the player's inmate at the front (the icon they chose)
  function scene(f, inm) {
    const body = (SC[f] || SC[0])();
    const me = inm ? inm.replace('<svg viewBox="0 0 100 100"', '<svg x="18" y="96" width="84" height="84" viewBox="0 0 100 100"') : '';
    return `<svg viewBox="0 0 320 180" class="syimg" role="img" aria-hidden="true"><defs><clipPath id="syc"><rect width="320" height="180" rx="10"/></clipPath></defs><g clip-path="url(#syc)">${body}<rect y="150" width="320" height="30" fill="url(#syf)"/><rect width="320" height="180" fill="url(#syh)"/>${me}</g><rect x="1.5" y="1.5" width="317" height="177" rx="9" fill="none" stroke="${INK}" stroke-width="3"/><defs><linearGradient id="syf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient><pattern id="syd" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.2" fill="#000"/></pattern><radialGradient id="sym" cx="1" cy="0" r="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="syk"><rect width="320" height="180" fill="url(#sym)"/></mask><pattern id="syh" width="320" height="180" patternUnits="userSpaceOnUse"><rect width="320" height="180" fill="url(#syd)" mask="url(#syk)" opacity=".16"/></pattern></defs></svg>`;
  }

  const TX = {
    ja: { 'sy.go': '脱獄開始！', 'sy.btn': 'ストーリー', 'sy.tag': 'STORY',
      'sy.0': '身に覚えのない罪で捕まってしまったキミ。でも、ここで終わるつもりはない。まずは留置場の鉄格子の向こうへ——脱獄計画のはじまりだ！',
      'sy.1': '大部屋の仲間がこっそり耳打ちしてくれた。「上の洗濯場に、外へ続く抜け道があるらしいぜ」。ロッカーと二段ベッドをかき分けて進もう。',
      'sy.2': 'ゴウンゴウンと回る洗濯機。湯気にまぎれれば看守の目もごまかせる。シーツの山の向こうに、次の扉が見えた。',
      'sy.3': '木箱だらけの作業場で、キミは古い設計図を見つけた。そこには「監獄の外へ続く地下水路」の印が……。',
      'sy.4': 'お昼どきの食堂は大にぎわい。おいしいにおいとざわめきにまぎれて、柱のかげを伝い、厨房の裏口を目指そう。',
      'sy.5': 'しんと静かな図書室。ある本を引くと、本棚がゆっくり動きだした……うわさの隠し通路だ！',
      'sy.6': '仮病を使って医務室にもぐりこんだ。薬品棚の奥の窓から、運動場が見える。',
      'sy.7': '久しぶりの外の空気。でも塀は高く、鉄柱のあいだを看守が見回っている。あわてず、すき間を探そう。',
      'sy.8': '面会に来た相棒が、ガラス越しに合図を送ってきた。「監視塔の交代は夜の0時」——決行は今夜だ。',
      'sy.9': 'サーチライトが夜空を切りさく。見張りの真下をすり抜けられるか。ここからが本当の難関だ。',
      'sy.10': '設計図のとおり、監視塔の地下には水路が続いていた。暗くて冷たい迷路の先に、かすかな月明かりが見える。',
      'sy.11': '最後の関門、最高警備の独房棟。ここを抜ければ自由はすぐそこ。最後の扉を開けて、脱獄を成功させろ！' },
    en: { 'sy.go': 'Start the escape!', 'sy.btn': 'Story', 'sy.tag': 'STORY',
      'sy.0': 'Locked up for something you never did — but this is not where your story ends. First stop: the other side of these holding-cell bars. The escape plan begins!',
      'sy.1': 'Your cellmates whisper a tip: “They say the laundry upstairs has a way out.” Push through the lockers and bunks.',
      'sy.2': 'The machines rumble and the steam hides you from the guards. Beyond the pile of sheets, the next door is in sight.',
      'sy.3': 'In the crate-filled workshop you find an old blueprint, with a mark for an underground waterway that leads outside…',
      'sy.4': 'Lunchtime, and the mess hall is packed. Slip from pillar to pillar through the noise and head for the kitchen’s back door.',
      'sy.5': 'The library is silent. You pull one book — and a whole shelf slowly swings aside. The rumoured secret passage!',
      'sy.6': 'Faking a stomach ache gets you into the infirmary. Behind the medicine cabinet, a window looks out on the yard.',
      'sy.7': 'Fresh air at last. But the wall is high and a guard patrols between the steel posts. Stay calm and find the gap.',
      'sy.8': 'Your partner on the other side of the glass gives a signal: “The tower guards change at midnight.” It’s tonight.',
      'sy.9': 'Searchlights slice the night sky. Can you slip right under the watchtower? This is where it gets really hard.',
      'sy.10': 'Just as the blueprint said, a waterway runs beneath the tower. At the end of the cold, dark maze: a glimmer of moonlight.',
      'sy.11': 'The last barrier: the maximum-security solitary block. Get through and freedom is yours. Open the final door!' },
    zh: { 'sy.go': '开始越狱！', 'sy.btn': '故事', 'sy.tag': 'STORY',
      'sy.0': '你因莫须有的罪名被抓了进来，但故事不会就此结束。第一步：先越过拘留室的铁栏——越狱计划开始了！',
      'sy.1': '大牢房的狱友悄悄告诉你：“听说楼上的洗衣房有条通往外面的路。”拨开储物柜和双层床前进吧。',
      'sy.2': '洗衣机轰隆隆地转着，蒸汽能帮你躲过看守的视线。床单堆的那头，看到了下一扇门。',
      'sy.3': '在堆满木箱的工场里，你发现了一张旧设计图，上面标着“通往监狱外的地下水道”……',
      'sy.4': '午饭时间的食堂热闹非凡。借着饭香和喧闹，沿着柱子的阴影，朝厨房后门前进。',
      'sy.5': '安静的图书室。抽出一本书，书架竟缓缓移开……原来是传说中的密道！',
      'sy.6': '你装病混进了医务室。药柜后面的窗户能看到操场。',
      'sy.7': '久违的新鲜空气。可是围墙很高，看守在铁柱之间巡逻。别慌，找到空隙。',
      'sy.8': '来探视的搭档隔着玻璃打了个暗号：“瞭望塔午夜12点换班。”——就在今晚行动。',
      'sy.9': '探照灯划破夜空。你能从看守的眼皮底下溜过去吗？真正的难关从这里开始。',
      'sy.10': '正如设计图所示，瞭望塔下面有一条水道。在又黑又冷的迷宫尽头，透着一丝月光。',
      'sy.11': '最后一关：最高警戒的单人牢房区。穿过这里，自由就在眼前。打开最后一扇门，越狱成功吧！' },
    ko: { 'sy.go': '탈옥 시작!', 'sy.btn': '스토리', 'sy.tag': 'STORY',
      'sy.0': '억울한 누명으로 붙잡힌 당신. 하지만 여기서 끝낼 생각은 없다. 먼저 유치장 쇠창살 너머로——탈옥 계획의 시작이다!',
      'sy.1': '큰 방의 동료가 몰래 귀띔해 준다. "위층 세탁실에 밖으로 통하는 길이 있대." 사물함과 이층 침대를 헤치고 나아가자.',
      'sy.2': '웅웅 돌아가는 세탁기. 수증기에 섞이면 간수의 눈도 속일 수 있다. 시트 더미 너머로 다음 문이 보인다.',
      'sy.3': '나무 상자투성이 작업장에서 낡은 설계도를 발견했다. 거기엔 "감옥 밖으로 이어지는 지하 수로" 표시가……',
      'sy.4': '점심시간의 식당은 북적북적. 맛있는 냄새와 소란에 섞여 기둥 그늘을 따라 주방 뒷문으로 향하자.',
      'sy.5': '고요한 도서실. 책 한 권을 당기자 책장이 천천히 움직인다……소문의 비밀 통로다!',
      'sy.6': '꾀병으로 의무실에 숨어들었다. 약품장 뒤 창문으로 운동장이 보인다.',
      'sy.7': '오랜만의 바깥 공기. 하지만 담은 높고, 쇠기둥 사이를 간수가 순찰한다. 서두르지 말고 틈을 찾자.',
      'sy.8': '면회 온 파트너가 유리 너머로 신호를 보낸다. "감시탑 교대는 밤 0시." ——결행은 오늘 밤이다.',
      'sy.9': '서치라이트가 밤하늘을 가른다. 감시탑 바로 아래를 빠져나갈 수 있을까. 진짜 난관은 지금부터다.',
      'sy.10': '설계도대로 감시탑 지하에는 수로가 이어져 있었다. 어둡고 차가운 미로 끝에 희미한 달빛이 보인다.',
      'sy.11': '마지막 관문, 최고 경비 독방동. 여기만 지나면 자유는 코앞이다. 마지막 문을 열고 탈옥에 성공하라!' },
    es: { 'sy.go': '¡Empieza la fuga!', 'sy.btn': 'Historia', 'sy.tag': 'HISTORIA',
      'sy.0': 'Te encerraron por algo que no hiciste, pero tu historia no termina aquí. Primer paso: cruzar los barrotes de esta celda. ¡Empieza el plan de fuga!',
      'sy.1': 'Tus compañeros te susurran: «Dicen que en la lavandería de arriba hay una salida». Abre paso entre taquillas y literas.',
      'sy.2': 'Las lavadoras retumban y el vapor te oculta de los guardias. Tras el montón de sábanas ya se ve la siguiente puerta.',
      'sy.3': 'En el taller lleno de cajas encuentras un plano antiguo con una marca: un canal subterráneo que lleva al exterior…',
      'sy.4': 'Hora de comer y el comedor está a rebosar. Entre el ruido, ve de columna en columna hacia la puerta trasera de la cocina.',
      'sy.5': 'La biblioteca está en silencio. Tiras de un libro… y una estantería se aparta despacio. ¡El pasadizo secreto del que todos hablaban!',
      'sy.6': 'Con un falso dolor de tripa entras en la enfermería. Tras el armario de medicinas, una ventana da al patio.',
      'sy.7': 'Por fin aire libre. Pero el muro es alto y un guardia patrulla entre los postes. Calma: busca el hueco.',
      'sy.8': 'Tu compinche, al otro lado del cristal, hace una señal: «El relevo de la torre es a medianoche». Es esta noche.',
      'sy.9': 'Los reflectores cortan el cielo nocturno. ¿Podrás pasar justo bajo la torre? Aquí empieza lo difícil de verdad.',
      'sy.10': 'Tal como decía el plano, bajo la torre corre un canal. Al final del laberinto frío y oscuro, un destello de luna.',
      'sy.11': 'La última barrera: el bloque de aislamiento de máxima seguridad. Crúzalo y serás libre. ¡Abre la última puerta!' },
    fr: { 'sy.go': 'Lancer l’évasion !', 'sy.btn': 'Histoire', 'sy.tag': 'HISTOIRE',
      'sy.0': 'Enfermé pour un crime que tu n’as pas commis… mais ton histoire ne s’arrête pas là. Première étape : passer de l’autre côté de ces barreaux. Le plan d’évasion commence !',
      'sy.1': 'Tes codétenus te soufflent un tuyau : « Il paraît que la buanderie du dessus a une sortie. » Fraie-toi un chemin entre casiers et lits superposés.',
      'sy.2': 'Les machines grondent et la vapeur te cache des gardiens. Derrière la pile de draps, la porte suivante est en vue.',
      'sy.3': 'Dans l’atelier encombré de caisses, tu trouves un vieux plan, avec une marque : un canal souterrain qui mène dehors…',
      'sy.4': 'C’est l’heure du déjeuner et le réfectoire est bondé. Profite du bruit, file de pilier en pilier vers la porte de service des cuisines.',
      'sy.5': 'Silence à la bibliothèque. Tu tires un livre… et une étagère pivote lentement. Le passage secret dont tout le monde parlait !',
      'sy.6': 'Un faux mal de ventre t’ouvre la porte de l’infirmerie. Derrière l’armoire à pharmacie, une fenêtre donne sur la cour.',
      'sy.7': 'Enfin de l’air frais. Mais le mur est haut et un gardien patrouille entre les poteaux. Garde ton calme et trouve la faille.',
      'sy.8': 'Derrière la vitre, ton complice fait un signe : « Relève des gardes de la tour à minuit. » C’est pour ce soir.',
      'sy.9': 'Les projecteurs fendent la nuit. Pourras-tu passer juste sous le mirador ? C’est là que ça devient vraiment dur.',
      'sy.10': 'Comme l’indiquait le plan, un canal court sous la tour. Au bout du labyrinthe froid et sombre : une lueur de lune.',
      'sy.11': 'Dernier obstacle : le quartier d’isolement de haute sécurité. Traverse-le et la liberté est à toi. Ouvre la dernière porte !' },
    pt: { 'sy.go': 'Começar a fuga!', 'sy.btn': 'História', 'sy.tag': 'HISTÓRIA',
      'sy.0': 'Preso por algo que você não fez — mas a sua história não acaba aqui. Primeiro passo: passar para o outro lado destas grades. O plano de fuga começa!',
      'sy.1': 'Seus colegas de cela cochicham: “Dizem que a lavanderia lá de cima tem uma saída.” Abra caminho entre armários e beliches.',
      'sy.2': 'As máquinas roncam e o vapor esconde você dos guardas. Depois da pilha de lençóis, a próxima porta já aparece.',
      'sy.3': 'Na oficina cheia de caixotes você encontra uma planta antiga, com uma marca: um canal subterrâneo que leva para fora…',
      'sy.4': 'Hora do almoço, e o refeitório está lotado. No meio do barulho, vá de pilar em pilar até a porta dos fundos da cozinha.',
      'sy.5': 'A biblioteca está em silêncio. Você puxa um livro… e uma estante se afasta devagar. A passagem secreta de que todos falavam!',
      'sy.6': 'Uma falsa dor de barriga leva você à enfermaria. Atrás do armário de remédios, uma janela dá para o pátio.',
      'sy.7': 'Ar livre, enfim. Mas o muro é alto e um guarda patrulha entre os postes. Calma: procure a brecha.',
      'sy.8': 'Do outro lado do vidro, seu parceiro faz um sinal: “A troca de guarda da torre é à meia-noite.” É hoje.',
      'sy.9': 'Os holofotes cortam o céu da noite. Dá para passar bem embaixo da torre? É aqui que fica difícil de verdade.',
      'sy.10': 'Como dizia a planta, um canal corre sob a torre. No fim do labirinto frio e escuro: um brilho de lua.',
      'sy.11': 'A última barreira: o bloco de solitárias de segurança máxima. Passe por ele e a liberdade é sua. Abra a última porta!' },
    de: { 'sy.go': 'Ausbruch starten!', 'sy.btn': 'Geschichte', 'sy.tag': 'STORY',
      'sy.0': 'Eingesperrt für etwas, das du nie getan hast – doch hier endet deine Geschichte nicht. Erster Schritt: raus hinter diese Gitter. Der Fluchtplan beginnt!',
      'sy.1': 'Deine Mithäftlinge flüstern dir zu: „Angeblich gibt es in der Wäscherei oben einen Weg nach draußen.“ Kämpf dich durch Spinde und Stockbetten.',
      'sy.2': 'Die Maschinen dröhnen, und der Dampf verbirgt dich vor den Wärtern. Hinter dem Wäscheberg ist schon die nächste Tür zu sehen.',
      'sy.3': 'In der Werkstatt voller Kisten findest du einen alten Bauplan – mit einer Markierung: ein unterirdischer Kanal nach draußen …',
      'sy.4': 'Mittagszeit, der Speisesaal ist voll. Schleich im Lärm von Säule zu Säule zur Hintertür der Küche.',
      'sy.5': 'In der Bibliothek ist es still. Du ziehst an einem Buch – und ein ganzes Regal schwingt langsam zur Seite. Der geheime Gang!',
      'sy.6': 'Mit gespieltem Bauchweh kommst du auf die Krankenstation. Hinter dem Medizinschrank blickt ein Fenster auf den Hof.',
      'sy.7': 'Endlich frische Luft. Doch die Mauer ist hoch, und zwischen den Stahlpfosten patrouilliert ein Wärter. Ruhig bleiben, Lücke finden.',
      'sy.8': 'Hinter der Glasscheibe gibt dein Komplize ein Zeichen: „Wachwechsel am Turm um Mitternacht.“ Es ist heute Nacht.',
      'sy.9': 'Suchscheinwerfer zerschneiden den Nachthimmel. Schaffst du es direkt unter dem Wachturm hindurch? Jetzt wird es richtig schwer.',
      'sy.10': 'Wie auf dem Plan verläuft unter dem Turm ein Kanal. Am Ende des kalten, dunklen Labyrinths: ein Schimmer Mondlicht.',
      'sy.11': 'Die letzte Hürde: der Hochsicherheitstrakt mit den Einzelzellen. Komm hier durch, und du bist frei. Öffne die letzte Tür!' },
    hi: { 'sy.go': 'भागना शुरू!', 'sy.btn': 'कहानी', 'sy.tag': 'कहानी',
      'sy.0': 'ऐसे जुर्म में बंद हो गए जो तुमने किया ही नहीं — पर तुम्हारी कहानी यहाँ ख़त्म नहीं होती। पहला क़दम: हवालात की इन सलाख़ों के पार। भागने की योजना शुरू!',
      'sy.1': 'साथी क़ैदी धीरे से बताते हैं: "सुना है ऊपर के धोबीघर से बाहर का रास्ता है।" लॉकरों और दो-मंज़िला बिस्तरों के बीच से रास्ता बनाओ।',
      'sy.2': 'मशीनें घड़घड़ाती हैं और भाप तुम्हें पहरेदारों से छिपा लेती है। चादरों के ढेर के पार अगला दरवाज़ा दिख रहा है।',
      'sy.3': 'बक्सों से भरी कार्यशाला में तुम्हें एक पुराना नक़्शा मिलता है — उस पर निशान है: बाहर तक जाने वाली ज़मीन के नीचे की नहर…',
      'sy.4': 'दोपहर के खाने का वक़्त, भोजनालय खचाखच भरा है। शोर में खंभे-दर-खंभे छिपते हुए रसोई के पिछले दरवाज़े तक पहुँचो।',
      'sy.5': 'पुस्तकालय में सन्नाटा है। तुम एक किताब खींचते हो — और पूरी अलमारी धीरे से खिसक जाती है। वही गुप्त रास्ता!',
      'sy.6': 'पेट-दर्द का बहाना बनाकर तुम दवाख़ाने में पहुँच गए। दवाइयों की अलमारी के पीछे की खिड़की से मैदान दिखता है।',
      'sy.7': 'आख़िरकार खुली हवा। पर दीवार ऊँची है और लोहे के खंभों के बीच पहरेदार गश्त लगा रहा है। घबराओ मत, जगह ढूँढो।',
      'sy.8': 'काँच के उस पार तुम्हारा साथी इशारा करता है: "मीनार के पहरेदार आधी रात को बदलते हैं।" आज ही की रात।',
      'sy.9': 'सर्चलाइटें रात के आसमान को चीरती हैं। क्या तुम मीनार के ठीक नीचे से निकल पाओगे? असली मुश्किल यहीं से शुरू होती है।',
      'sy.10': 'नक़्शे के मुताबिक़ मीनार के नीचे एक नहर बहती है। ठंडी, अँधेरी भूलभुलैया के आख़िर में चाँद की हल्की रोशनी।',
      'sy.11': 'आख़िरी बाधा: सबसे कड़ी सुरक्षा वाला एकांत-कोठरी खंड। इसे पार करो और आज़ादी तुम्हारी। आख़िरी दरवाज़ा खोलो!' },
    ar: { 'sy.go': 'ابدأ الهروب!', 'sy.btn': 'القصة', 'sy.tag': 'القصة',
      'sy.0': 'سُجنت بتهمة لم ترتكبها، لكن قصتك لن تنتهي هنا. الخطوة الأولى: الوصول إلى ما وراء قضبان غرفة الاحتجاز. خطة الهروب تبدأ الآن!',
      'sy.1': 'يهمس لك رفاق الزنزانة: «يقولون إن في المغسلة بالطابق العلوي طريقًا إلى الخارج». شُقّ طريقك بين الخزائن والأسرّة.',
      'sy.2': 'الغسالات تهدر والبخار يخفيك عن الحراس. خلف كومة الملاءات يظهر الباب التالي.',
      'sy.3': 'في الورشة المليئة بالصناديق تجد مخططًا قديمًا عليه علامة: قناة تحت الأرض تؤدي إلى الخارج…',
      'sy.4': 'وقت الغداء والمطعم مزدحم. وسط الضجيج تنقّل من عمود إلى عمود نحو الباب الخلفي للمطبخ.',
      'sy.5': 'المكتبة صامتة. تسحب كتابًا… فيتحرك رفّ كامل ببطء. إنه الممر السري الذي يتحدث عنه الجميع!',
      'sy.6': 'بادّعاء ألم في البطن تدخل العيادة. خلف خزانة الأدوية نافذة تطل على الساحة.',
      'sy.7': 'هواء طلق أخيرًا. لكن السور عالٍ وحارس يتجول بين الأعمدة الحديدية. اهدأ وابحث عن الثغرة.',
      'sy.8': 'خلف الزجاج يرسل لك شريكك إشارة: «تبديل حراس البرج عند منتصف الليل». الليلة هي الموعد.',
      'sy.9': 'الكشافات تشق سماء الليل. هل تستطيع المرور تحت برج المراقبة مباشرة؟ من هنا تبدأ الصعوبة الحقيقية.',
      'sy.10': 'كما في المخطط، تمتد قناة تحت البرج. وفي نهاية المتاهة الباردة المظلمة بصيص من ضوء القمر.',
      'sy.11': 'الحاجز الأخير: جناح الحبس الانفرادي شديد الحراسة. اعبره وتصبح حرًا. افتح الباب الأخير!' },
  };
  const I = window.JB_I18N = window.JB_I18N || {};
  for (const l in TX) I[l] = Object.assign(I[l] || {}, TX[l]);
  window.JBStory = { scene };
})();
