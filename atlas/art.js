/* =====================================================================
   World Board Game Atlas — collectible items (avatar icons, backgrounds,
   frames) drawn as inline SVG. Everything is generated from small tables,
   so adding an item = adding one line to a list below.
     AtlasArt.items          [{ id, kind:'icon'|'bg'|'frame', rar:0..4, name:{ja,en,zh,ko,es,fr,pt,de,hi,ar} }]
     AtlasArt.byId(id)
     AtlasArt.svg(id)        SVG markup for the item alone
     AtlasArt.avatar({icon,bg,frame}, size)  composed avatar
     AtlasArt.bgCss(id)      CSS background for a profile card
   Rarity: 0 N · 1 R · 2 SR · 3 SSR · 4 UR
   ===================================================================== */
(function () {
  'use strict';
  const RAR = ['N', 'R', 'SR', 'SSR', 'UR'];

  /* ---------- palettes ---------- */
  const COL = {
    coral: ['#ff6b6b', '#e04848'], sky: ['#4cc3ff', '#2196e0'], sun: ['#ffd23f', '#f0a500'],
    mint: ['#4fd8a0', '#22aa74'], grape: ['#a17cff', '#7552e0'], peach: ['#ffb38a', '#f28455'],
    pink: ['#ff8fc7', '#e85a9f'], snow: ['#ffffff', '#cfd8e6'], cocoa: ['#b98663', '#8a5a3b'],
    ink: ['#4a5068', '#2b3044'], lime: ['#b7e94a', '#84b81d'], gold: ['#ffd76a', '#d79a1c'],
  };

  /* ---------- critters (head + ears + face) ---------- */
  // each draws on a 100×100 canvas centred at 50,54. c = [main, shade]
  const face = (o = {}) => {
    const ey = o.ey ?? 56, ex = o.ex ?? 13, k = o.eye || '#2b2a33';
    let s = '';
    if (o.sleepy) s += `<path d="M${50 - ex - 5} ${ey}q5 4 10 0M${50 + ex - 5} ${ey}q5 4 10 0" stroke="${k}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    else s += `<ellipse cx="${50 - ex}" cy="${ey}" rx="4.6" ry="5.6" fill="${k}"/><ellipse cx="${50 + ex}" cy="${ey}" rx="4.6" ry="5.6" fill="${k}"/><circle cx="${51.6 - ex}" cy="${ey - 2}" r="1.6" fill="#fff"/><circle cx="${51.6 + ex}" cy="${ey - 2}" r="1.6" fill="#fff"/>`;
    if (!o.noBlush) s += `<ellipse cx="${50 - ex - 7}" cy="${ey + 9}" rx="5" ry="3" fill="#ff7fa0" opacity=".45"/><ellipse cx="${50 + ex + 7}" cy="${ey + 9}" rx="5" ry="3" fill="#ff7fa0" opacity=".45"/>`;
    if (o.beak) s += `<path d="M44 ${ey + 7}h12l-6 7z" fill="#ffad33" stroke="#e08a12" stroke-width="1.2" stroke-linejoin="round"/>`;
    else if (o.mouth !== false) s += `<path d="M44.5 ${ey + 8}q2.75 3.2 5.5 0q2.75 3.2 5.5 0" stroke="${k}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    return s;
  };
  const head = (c, extra = '') => `<circle cx="50" cy="56" r="31" fill="${c[0]}"/><path d="M22 64a31 31 0 0 0 56 0a34 22 0 0 1-56 0z" fill="${c[1]}" opacity=".35"/>${extra}`;
  const CRIT = {
    cat: c => `<path d="M24 40L27 14L46 30Z" fill="${c[0]}"/><path d="M76 40L73 14L54 30Z" fill="${c[0]}"/><path d="M29 33L30 21L39 29Z" fill="#ffb3c8"/><path d="M71 33L70 21L61 29Z" fill="#ffb3c8"/>` + head(c) + face() + `<path d="M17 60h10M17 66l10-2M83 60H73M83 66l-10-2" stroke="${c[1]}" stroke-width="1.8" stroke-linecap="round"/>`,
    bear: c => `<circle cx="27" cy="31" r="11" fill="${c[0]}"/><circle cx="73" cy="31" r="11" fill="${c[0]}"/><circle cx="27" cy="31" r="5.5" fill="${c[1]}"/><circle cx="73" cy="31" r="5.5" fill="${c[1]}"/>` + head(c, `<ellipse cx="50" cy="67" rx="13" ry="10" fill="#fff" opacity=".7"/>`) + face({ ey: 54 }),
    bunny: c => `<rect x="30" y="2" width="13" height="40" rx="6.5" fill="${c[0]}" transform="rotate(-8 36 40)"/><rect x="57" y="2" width="13" height="40" rx="6.5" fill="${c[0]}" transform="rotate(8 64 40)"/><rect x="33.5" y="8" width="6" height="28" rx="3" fill="#ffb3c8" transform="rotate(-8 36 40)"/><rect x="60.5" y="8" width="6" height="28" rx="3" fill="#ffb3c8" transform="rotate(8 64 40)"/>` + head(c) + face(),
    frog: c => `<circle cx="31" cy="31" r="12" fill="${c[0]}"/><circle cx="69" cy="31" r="12" fill="${c[0]}"/><circle cx="31" cy="30" r="7" fill="#fff"/><circle cx="69" cy="30" r="7" fill="#fff"/><circle cx="31" cy="31" r="4" fill="#2b2a33"/><circle cx="69" cy="31" r="4" fill="#2b2a33"/>` + `<ellipse cx="50" cy="60" rx="33" ry="27" fill="${c[0]}"/><path d="M33 62q17 14 34 0" stroke="#2b2a33" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="29" cy="66" rx="5" ry="3" fill="#ff7fa0" opacity=".45"/><ellipse cx="71" cy="66" rx="5" ry="3" fill="#ff7fa0" opacity=".45"/>`,
    penguin: c => head(c, `<path d="M50 34c-14 0-22 10-22 22c0 13 10 23 22 23s22-10 22-23c0-12-8-22-22-22z" fill="#fff"/>`) + face({ beak: true, ex: 11 }),
    owl: c => `<path d="M22 36L24 16L40 30Z" fill="${c[1]}"/><path d="M78 36L76 16L60 30Z" fill="${c[1]}"/>` + head(c, `<circle cx="37" cy="54" r="12" fill="#fff"/><circle cx="63" cy="54" r="12" fill="#fff"/><ellipse cx="50" cy="76" rx="16" ry="8" fill="#fff" opacity=".45"/>`) + face({ ey: 54, beak: true, noBlush: true }),
    fox: c => `<path d="M20 44L22 10L46 30Z" fill="${c[0]}"/><path d="M80 44L78 10L54 30Z" fill="${c[0]}"/><path d="M26 35L27 19L38 29Z" fill="#fff"/><path d="M74 35L73 19L62 29Z" fill="#fff"/>` + head(c, `<path d="M19 58c8 4 18 8 31 22c13-14 23-18 31-22c0 18-14 29-31 29S19 76 19 58z" fill="#fff"/><circle cx="50" cy="69" r="3.4" fill="#2b2a33"/>`) + face({ mouth: false }),
    panda: c => `<circle cx="26" cy="31" r="11" fill="#2b2a33"/><circle cx="74" cy="31" r="11" fill="#2b2a33"/><circle cx="50" cy="56" r="31" fill="#fff"/><ellipse cx="36" cy="56" rx="9" ry="11" fill="#2b2a33" transform="rotate(20 36 56)"/><ellipse cx="64" cy="56" rx="9" ry="11" fill="#2b2a33" transform="rotate(-20 64 56)"/><circle cx="37" cy="55" r="3.6" fill="#fff"/><circle cx="63" cy="55" r="3.6" fill="#fff"/><ellipse cx="50" cy="66" rx="4" ry="3" fill="#2b2a33"/><path d="M45 71q5 4 10 0" stroke="#2b2a33" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="68" rx="5" ry="3" fill="${c[0]}" opacity=".6"/><ellipse cx="72" cy="68" rx="5" ry="3" fill="${c[0]}" opacity=".6"/>`,
    chick: c => `<path d="M50 26q-4-12 4-16q-2 8 4 10q-8 0-8 6z" fill="${c[1]}"/>` + head(c) + face({ beak: true }),
    robot: c => `<path d="M50 24V12" stroke="${c[1]}" stroke-width="3"/><circle cx="50" cy="10" r="5" fill="#ff6b6b"/><rect x="18" y="26" width="64" height="60" rx="18" fill="${c[0]}"/><rect x="26" y="40" width="48" height="28" rx="11" fill="#2b3044"/><circle cx="39" cy="54" r="5" fill="#7ff5ff"/><circle cx="61" cy="54" r="5" fill="#7ff5ff"/><path d="M42 76h16" stroke="${c[1]}" stroke-width="3" stroke-linecap="round"/><rect x="10" y="46" width="8" height="18" rx="4" fill="${c[1]}"/><rect x="82" y="46" width="8" height="18" rx="4" fill="${c[1]}"/>`,
    ghost: c => `<path d="M20 58a30 30 0 0 1 60 0v30l-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6z" fill="${c[0]}"/>` + face({ ey: 54 }),
    slime: c => `<path d="M50 18c6 10 34 30 34 50c0 13-15 20-34 20s-34-7-34-20c0-20 28-40 34-50z" fill="${c[0]}"/><path d="M38 40q-8 8-10 18" stroke="#fff" stroke-width="4" opacity=".6" fill="none" stroke-linecap="round"/>` + face({ ey: 62 }),
    octo: c => `<g fill="${c[0]}"><rect x="20" y="62" width="10" height="28" rx="5"/><rect x="34" y="66" width="10" height="26" rx="5"/><rect x="56" y="66" width="10" height="26" rx="5"/><rect x="70" y="62" width="10" height="28" rx="5"/></g><ellipse cx="50" cy="48" rx="32" ry="30" fill="${c[0]}"/><circle cx="66" cy="32" r="4" fill="#fff" opacity=".5"/>` + face({ ey: 52 }),
    dragon: c => `<path d="M30 30L22 8L42 26Z" fill="${c[1]}"/><path d="M70 30L78 8L58 26Z" fill="${c[1]}"/><path d="M38 26l4-10l4 10M54 26l4-10l4 10" fill="${c[1]}"/>` + head(c, `<ellipse cx="50" cy="70" rx="16" ry="11" fill="#fff" opacity=".55"/><circle cx="45" cy="68" r="1.8" fill="#2b2a33"/><circle cx="55" cy="68" r="1.8" fill="#2b2a33"/>`) + face({ ey: 52, mouth: false }),
  };
  const CRIT_NAME = {
    cat: ['ねこ', 'Cat'], bear: ['くま', 'Bear'], bunny: ['うさぎ', 'Bunny'], frog: ['かえる', 'Frog'], penguin: ['ペンギン', 'Penguin'],
    owl: ['ふくろう', 'Owl'], fox: ['きつね', 'Fox'], panda: ['パンダ', 'Panda'], chick: ['ひよこ', 'Chick'], robot: ['ロボ', 'Robo'],
    ghost: ['おばけ', 'Ghost'], slime: ['スライム', 'Slime'], octo: ['たこ', 'Octopus'], dragon: ['ドラゴン', 'Dragon'],
  };

  /* ---------- accessories (board-game themed) ---------- */
  const ACC = {
    none: () => '',
    leaf: () => `<path d="M50 24q-2-12 8-16q2 10-8 16z" fill="#4fd8a0" stroke="#22aa74" stroke-width="1.5"/>`,
    bow: () => `<path d="M50 28l-14-8v16zM50 28l14-8v16z" fill="#ff5f8f"/><circle cx="50" cy="28" r="4.5" fill="#e0407a"/>`,
    glasses: () => `<g fill="none" stroke="#2b2a33" stroke-width="2.6"><circle cx="37" cy="56" r="9"/><circle cx="63" cy="56" r="9"/><path d="M46 56h8"/></g>`,
    disc: () => `<g transform="translate(64 14)"><ellipse cx="12" cy="13" rx="12" ry="5" fill="#111"/><ellipse cx="12" cy="10" rx="12" ry="5" fill="#fafafa" stroke="#bbb"/></g>`,
    stone: () => `<g transform="translate(66 12)"><circle cx="10" cy="10" r="10" fill="#222"/><circle cx="7" cy="7" r="3" fill="#fff" opacity=".35"/></g>`,
    die: () => `<g transform="translate(64 8) rotate(12 12 12)"><rect width="24" height="24" rx="6" fill="#fff" stroke="#c9cfdc" stroke-width="2"/><circle cx="7" cy="7" r="2.4" fill="#e04848"/><circle cx="12" cy="12" r="2.4" fill="#e04848"/><circle cx="17" cy="17" r="2.4" fill="#e04848"/></g>`,
    shogi: () => `<g transform="translate(36 2)"><path d="M14 0l11 5l3 23H0L3 5z" fill="#f6e2b0" stroke="#c79c57" stroke-width="1.6"/><text x="14" y="21" font-size="13" font-weight="900" text-anchor="middle" fill="#2b1c0c" font-family="serif">王</text></g>`,
    knight: () => `<g transform="translate(66 4)" fill="#2b3044"><path d="M4 26h20v-4H6c0-5 4-7 6-10l4 2l3-3l-4-8l-6 3C5 9 4 16 4 22z"/><circle cx="12" cy="9" r="1.4" fill="#fff"/></g>`,
    crown: () => `<path d="M30 30l4-18l9 10l7-14l7 14l9-10l4 18z" fill="#ffd23f" stroke="#e09a00" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="22" r="2.6" fill="#ff5f8f"/>`,
    halo: () => `<ellipse cx="50" cy="16" rx="20" ry="6" fill="none" stroke="#ffe27a" stroke-width="4"/>`,
    star: () => `<path d="M78 8l3 7l7 1l-5 5l1 7l-6-3l-6 3l1-7l-5-5l7-1z" fill="#ffd23f" stroke="#f0a500" stroke-width="1.2"/>`,
    medal: () => `<g transform="translate(38 78)"><path d="M6 0l6 8l6-8" fill="#ff6b6b"/><circle cx="12" cy="13" r="8" fill="#ffd23f" stroke="#e09a00" stroke-width="1.6"/></g>`,
  };
  const ACC_NAME = {
    none: ['', ''], leaf: ['はっぱ', 'Leaf'], bow: ['リボン', 'Ribbon'], glasses: ['めがね', 'Glasses'], disc: ['オセロ石', 'Disc'], stone: ['碁石', 'Go stone'],
    die: ['サイコロ', 'Dice'], shogi: ['王将', 'King piece'], knight: ['ナイト', 'Knight'], crown: ['王冠', 'Crown'], halo: ['天使の輪', 'Halo'], star: ['ほし', 'Star'], medal: ['メダル', 'Medal'],
  };

  /* ---------- backgrounds (patterns) ---------- */
  const pat = (id, w, body) => `<pattern id="${id}" width="${w}" height="${w}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  const BG = {
    plain: (a, b) => ({ p: '', fill: a }),
    dots: (a, b, u) => ({ p: pat(u, 20, `<rect width="20" height="20" fill="${a}"/><circle cx="10" cy="10" r="3.2" fill="${b}"/>`), fill: `url(#${u})` }),
    stripe: (a, b, u) => ({ p: pat(u, 20, `<rect width="20" height="20" fill="${a}"/><path d="M-5 5l10-10M0 20L20 0M15 25l10-10" stroke="${b}" stroke-width="5"/>`), fill: `url(#${u})` }),
    checker: (a, b, u) => ({ p: pat(u, 24, `<rect width="24" height="24" fill="${a}"/><rect width="12" height="12" fill="${b}"/><rect x="12" y="12" width="12" height="12" fill="${b}"/>`), fill: `url(#${u})` }),
    goban: (a, b, u) => ({ p: pat(u, 16, `<rect width="16" height="16" fill="${a}"/><path d="M8 0v16M0 8h16" stroke="${b}" stroke-width="1.2"/>`), fill: `url(#${u})` }),
    wave: (a, b, u) => ({ p: pat(u, 28, `<rect width="28" height="28" fill="${a}"/><path d="M0 14q7-8 14 0t14 0" stroke="${b}" stroke-width="3" fill="none"/>`), fill: `url(#${u})` }),
    star: (a, b, u) => ({ p: pat(u, 30, `<rect width="30" height="30" fill="${a}"/><path d="M15 6l2.4 5.6l6 .6l-4.6 4l1.4 6l-5.2-3.2l-5.2 3.2l1.4-6l-4.6-4l6-.6z" fill="${b}"/>`), fill: `url(#${u})` }),
    heart: (a, b, u) => ({ p: pat(u, 26, `<rect width="26" height="26" fill="${a}"/><path d="M13 19s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.4a3.6 3.6 0 0 1 7 1.4c0 4.6-7 9-7 9z" fill="${b}"/>`), fill: `url(#${u})` }),
    hex: (a, b, u) => ({ p: pat(u, 24, `<rect width="24" height="24" fill="${a}"/><path d="M12 2l9 5v10l-9 5l-9-5V7z" fill="none" stroke="${b}" stroke-width="2"/>`), fill: `url(#${u})` }),
    pip: (a, b, u) => ({ p: pat(u, 30, `<rect width="30" height="30" fill="${a}"/><path d="M3 0l6 14l6-14M15 30l6-14l6 14" fill="${b}"/>`), fill: `url(#${u})` }),
    sakura: (a, b, u) => ({ p: pat(u, 34, `<rect width="34" height="34" fill="${a}"/><g fill="${b}" transform="translate(17 17)">${[0, 72, 144, 216, 288].map(r => `<ellipse cx="0" cy="-5" rx="3.2" ry="5" transform="rotate(${r})"/>`).join('')}<circle r="2" fill="#fff"/></g>`), fill: `url(#${u})` }),
    sky: (a, b, u) => ({ p: `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`, fill: `url(#${u})` }),
  };
  const BG_NAME = {
    plain: ['むじ', 'Plain'], dots: ['ドット', 'Dots'], stripe: ['ストライプ', 'Stripes'], checker: ['チェッカー', 'Checker'], goban: ['碁盤', 'Go board'], wave: ['なみ', 'Waves'],
    star: ['ほしぞら', 'Stars'], heart: ['ハート', 'Hearts'], hex: ['ヘックス', 'Hex'], pip: ['バックギャモン', 'Points'], sakura: ['さくら', 'Sakura'], sky: ['グラデーション', 'Gradient'],
  };
  const BGCOL = {
    cream: ['#fff6df', '#ffe7a8', 'クリーム', 'Cream'], mint: ['#e3fbef', '#a8ecc9', 'ミント', 'Mint'], sky: ['#e2f4ff', '#a9dcff', 'そら', 'Sky'],
    rose: ['#ffe6ef', '#ffb5cf', 'ローズ', 'Rose'], lilac: ['#efe8ff', '#cdb8ff', 'ライラック', 'Lilac'], night: ['#26304f', '#43517f', 'よる', 'Night'],
    sunset: ['#ffd27a', '#ff7f9e', 'ゆうやけ', 'Sunset'], wood: ['#f2d49b', '#d9ae67', 'もくめ', 'Wood'], gold: ['#fff1b8', '#ffc93d', 'ゴールド', 'Gold'],
  };

  /* ---------- frames ---------- */
  const FRAME = {
    none: { r: 0, n: ['なし', 'None'], d: () => '' },
    white: { r: 0, n: ['しろ', 'White'], d: () => ring('#fff', 7) },
    coral: { r: 0, n: ['コーラル', 'Coral'], d: () => ring('#ff6b6b', 7) },
    sky: { r: 0, n: ['スカイ', 'Sky'], d: () => ring('#4cc3ff', 7) },
    mint: { r: 1, n: ['ミント', 'Mint'], d: () => ring('#4fd8a0', 7) + ring('#fff', 2, 44) },
    candy: { r: 1, n: ['キャンディ', 'Candy'], d: () => `<circle cx="50" cy="50" r="46.5" fill="none" stroke="#fff" stroke-width="7"/><circle cx="50" cy="50" r="46.5" fill="none" stroke="#ff8fc7" stroke-width="7" stroke-dasharray="9 9"/>` },
    board: { r: 2, n: ['チェッカー', 'Checker'], d: () => `<circle cx="50" cy="50" r="46.5" fill="none" stroke="#2b3044" stroke-width="7"/><circle cx="50" cy="50" r="46.5" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="7.3 7.3"/>` },
    rainbow: { r: 2, n: ['にじ', 'Rainbow'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".3" stop-color="#ffd23f"/><stop offset=".6" stop-color="#4fd8a0"/><stop offset="1" stop-color="#a17cff"/></linearGradient></defs><circle cx="50" cy="50" r="46.5" fill="none" stroke="url(#${u})" stroke-width="7"/>` },
    laurel: { r: 3, n: ['月桂冠', 'Laurel'], d: () => ring('#4fd8a0', 5) + Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `<ellipse cx="${50 + 46 * Math.cos(a)}" cy="${50 + 46 * Math.sin(a)}" rx="3.2" ry="6.5" fill="#22aa74" transform="rotate(${a * 180 / Math.PI + 30} ${50 + 46 * Math.cos(a)} ${50 + 46 * Math.sin(a)})"/>`; }).join('') },
    gold: { r: 3, n: ['ゴールド', 'Gold'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#ffc93d"/><stop offset="1" stop-color="#d48a00"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="none" stroke="url(#${u})" stroke-width="8"/>` + [0, 90, 180, 270].map(r => `<circle cx="50" cy="4" r="3.6" fill="#fff" transform="rotate(${r} 50 50)"/>`).join('') },
    atlas: { r: 4, n: ['アトラス', 'Atlas'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4cc3ff"/><stop offset=".5" stop-color="#a17cff"/><stop offset="1" stop-color="#ff8fc7"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="none" stroke="url(#${u})" stroke-width="8"/>` + Array.from({ length: 8 }, (_, i) => `<path d="M50 0l2.6 5.4l5.4 2.6l-5.4 2.6L50 16l-2.6-5.4L42 8l5.4-2.6z" fill="#fff" transform="rotate(${i * 45} 50 50)"/>`).join('') },
  };
  function ring(col, w, r = 46.5) { return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="${w}"/>`; }

  /* ---------- catalog ---------- */
  // icons: [critter, colour, accessory, rarity]
  const ICONS = [];
  const ic = (cr, co, ac, r) => ICONS.push({ cr, co, ac, r });
  // N — plain critters in friendly colours
  [['cat', 'peach'], ['cat', 'snow'], ['bear', 'cocoa'], ['bunny', 'snow'], ['frog', 'mint'], ['penguin', 'ink'], ['owl', 'cocoa'], ['fox', 'peach'],
   ['panda', 'pink'], ['chick', 'sun'], ['robot', 'sky'], ['ghost', 'snow'], ['slime', 'sky'], ['octo', 'coral'], ['dragon', 'mint'],
   ['cat', 'ink'], ['bear', 'sun'], ['bunny', 'pink'], ['frog', 'lime'], ['slime', 'mint'], ['octo', 'grape'], ['robot', 'snow'], ['chick', 'peach'], ['ghost', 'sky']]
    .forEach(([a, b]) => ic(a, b, 'none', 0));
  // R — with a simple accessory
  [['cat', 'sun', 'bow'], ['bear', 'snow', 'leaf'], ['bunny', 'sky', 'bow'], ['frog', 'mint', 'leaf'], ['penguin', 'sky', 'glasses'], ['owl', 'grape', 'glasses'],
   ['fox', 'coral', 'leaf'], ['panda', 'mint', 'bow'], ['chick', 'sun', 'leaf'], ['robot', 'coral', 'glasses'], ['ghost', 'grape', 'bow'], ['slime', 'pink', 'leaf'],
   ['octo', 'sky', 'glasses'], ['dragon', 'sky', 'leaf'], ['cat', 'grape', 'glasses'], ['bear', 'pink', 'bow'], ['bunny', 'cocoa', 'leaf'], ['slime', 'sun', 'bow']]
    .forEach(([a, b, c]) => ic(a, b, c, 1));
  // SR — board-game pieces
  [['cat', 'snow', 'disc'], ['bear', 'cocoa', 'shogi'], ['bunny', 'snow', 'stone'], ['frog', 'mint', 'die'], ['penguin', 'ink', 'knight'], ['owl', 'cocoa', 'knight'],
   ['fox', 'peach', 'shogi'], ['panda', 'snow', 'stone'], ['chick', 'sun', 'disc'], ['robot', 'sky', 'die'], ['ghost', 'snow', 'disc'], ['slime', 'grape', 'die'],
   ['octo', 'coral', 'stone'], ['dragon', 'coral', 'knight'], ['cat', 'ink', 'shogi'], ['bunny', 'pink', 'die']]
    .forEach(([a, b, c]) => ic(a, b, c, 2));
  // SSR — stars and medals
  [['cat', 'pink', 'star'], ['bear', 'sun', 'medal'], ['bunny', 'grape', 'star'], ['penguin', 'sky', 'medal'], ['owl', 'snow', 'star'], ['fox', 'sun', 'medal'],
   ['dragon', 'grape', 'star'], ['robot', 'gold', 'medal'], ['slime', 'coral', 'star'], ['panda', 'sky', 'medal']]
    .forEach(([a, b, c]) => ic(a, b, c, 3));
  // UR — royalty
  [['cat', 'gold', 'crown'], ['dragon', 'gold', 'crown'], ['ghost', 'snow', 'halo'], ['owl', 'gold', 'crown'], ['bunny', 'snow', 'halo'], ['slime', 'gold', 'crown']]
    .forEach(([a, b, c]) => ic(a, b, c, 4));

  const BGS = []; // [pattern, colour, rarity]
  const bg = (p, c, r) => BGS.push({ p, c, r });
  [['plain', 'cream'], ['plain', 'mint'], ['plain', 'sky'], ['plain', 'rose'], ['plain', 'lilac'], ['dots', 'cream'], ['dots', 'sky'], ['stripe', 'mint'], ['stripe', 'rose']].forEach(([p, c]) => bg(p, c, 0));
  [['checker', 'cream'], ['checker', 'lilac'], ['goban', 'wood'], ['wave', 'sky'], ['wave', 'mint'], ['heart', 'rose'], ['hex', 'lilac'], ['dots', 'night']].forEach(([p, c]) => bg(p, c, 1));
  [['pip', 'wood'], ['star', 'night'], ['sakura', 'rose'], ['hex', 'night'], ['checker', 'night'], ['star', 'lilac']].forEach(([p, c]) => bg(p, c, 2));
  [['sky', 'sunset'], ['sakura', 'night'], ['star', 'sunset'], ['goban', 'gold']].forEach(([p, c]) => bg(p, c, 3));
  [['sky', 'night'], ['star', 'gold']].forEach(([p, c]) => bg(p, c, 4));

  const items = [];
  ICONS.forEach((o, i) => {
    const cn = CRIT_NAME[o.cr], an = ACC_NAME[o.ac];
    items.push({ id: 'i' + String(i + 1).padStart(3, '0'), kind: 'icon', rar: o.r, d: o,
      name: { ja: (an[0] ? an[0] + 'の' : '') + cn[0], en: (an[1] ? an[1] + ' ' : '') + cn[1] } });
  });
  BGS.forEach((o, i) => {
    const pn = BG_NAME[o.p], c = BGCOL[o.c];
    items.push({ id: 'b' + String(i + 1).padStart(3, '0'), kind: 'bg', rar: o.r, d: o, name: { ja: c[2] + 'の' + pn[0], en: c[3] + ' ' + pn[1] } });
  });
  Object.keys(FRAME).forEach(k => items.push({ id: 'f-' + k, kind: 'frame', rar: FRAME[k].r, d: { k }, name: { ja: FRAME[k].n[0], en: FRAME[k].n[1] } }));
  /* ---------- item names in the other 8 languages (ja / en are built above) ---------- */
  // per language: critters, accessories, bg patterns, bg colours, frames (same key order as the tables above), and how they combine
  const CRK = Object.keys(CRIT_NAME), ACK = Object.keys(ACC_NAME).slice(1), BPK = Object.keys(BG_NAME), BCK = Object.keys(BGCOL), FRK = Object.keys(FRAME);
  const NAMES = {
    zh: { cr: '小猫|小熊|兔兔|青蛙|企鹅|猫头鹰|狐狸|熊猫|小鸡|机器人|幽灵|史莱姆|章鱼|小龙', ac: '叶子|蝴蝶结|眼镜|黑白棋子|围棋子|骰子|王将|骑士|王冠|光环|星星|奖牌',
      bp: '纯色|圆点|条纹|格子|棋盘格|波浪|星空|爱心|六边形|双陆棋|樱花|渐变', bc: '奶油|薄荷|天空|玫瑰|丁香|夜晚|晚霞|木纹|金色', fr: '无|白色|珊瑚|天空|薄荷|糖果|棋盘|彩虹|月桂冠|金色|阿特拉斯',
      icon: (c, a) => a + c, bg: (p, c) => c + p },
    ko: { cr: '고양이|곰|토끼|개구리|펭귄|부엉이|여우|판다|병아리|로봇|유령|슬라임|문어|드래곤', ac: '나뭇잎|리본|안경|리버시 돌|바둑돌|주사위|왕장|나이트|왕관|천사 링|별|메달',
      bp: '무지|도트|스트라이프|체크|바둑판|물결|별하늘|하트|헥스|백개먼|벚꽃|그라데이션', bc: '크림|민트|하늘|로즈|라일락|밤|노을|나뭇결|골드', fr: '없음|화이트|코랄|스카이|민트|캔디|체크|무지개|월계관|골드|아틀라스',
      icon: (c, a) => a + ' ' + c, bg: (p, c) => c + ' ' + p },
    es: { cr: 'Gato|Oso|Conejito|Rana|Pingüino|Búho|Zorro|Panda|Pollito|Robot|Fantasma|Slime|Pulpo|Dragón', ac: 'con hoja|con lazo|con gafas|con ficha|con piedra de go|con dado|con rey de shogi|con caballo|con corona|con aureola|con estrella|con medalla',
      bp: 'Liso|Lunares|Rayas|Cuadros|Tablero de go|Olas|Estrellas|Corazones|Hexágonos|Backgammon|Sakura|Degradado', bc: 'crema|menta|cielo|rosa|lila|noche|atardecer|madera|oro', fr: 'Ninguno|Blanco|Coral|Cielo|Menta|Caramelo|Cuadros|Arcoíris|Laurel|Oro|Atlas',
      icon: (c, a) => c + ' ' + a, bg: (p, c) => p + ' color ' + c },
    fr: { cr: 'Chat|Ours|Lapin|Grenouille|Pingouin|Hibou|Renard|Panda|Poussin|Robot|Fantôme|Slime|Pieuvre|Dragon', ac: 'à la feuille|au nœud|à lunettes|au pion|à la pierre de go|au dé|au roi de shogi|au cavalier|à la couronne|à l’auréole|à l’étoile|à la médaille',
      bp: 'Uni|Pois|Rayures|Damier|Goban|Vagues|Étoiles|Cœurs|Hexagones|Backgammon|Sakura|Dégradé', bc: 'crème|menthe|ciel|rose|lilas|nuit|couchant|bois|or', fr: 'Aucun|Blanc|Corail|Ciel|Menthe|Bonbon|Damier|Arc-en-ciel|Laurier|Or|Atlas',
      icon: (c, a) => c + ' ' + a, bg: (p, c) => p + ' ' + c },
    pt: { cr: 'Gato|Urso|Coelhinho|Sapo|Pinguim|Coruja|Raposa|Panda|Pintinho|Robô|Fantasma|Slime|Polvo|Dragão', ac: 'com folha|com laço|com óculos|com peça|com pedra de go|com dado|com rei de shogi|com cavalo|com coroa|com auréola|com estrela|com medalha',
      bp: 'Liso|Bolinhas|Listras|Xadrez|Goban|Ondas|Estrelas|Corações|Hexágonos|Gamão|Sakura|Degradê', bc: 'creme|menta|céu|rosa|lilás|noite|pôr do sol|madeira|ouro', fr: 'Nenhuma|Branca|Coral|Céu|Menta|Doce|Xadrez|Arco-íris|Louros|Ouro|Atlas',
      icon: (c, a) => c + ' ' + a, bg: (p, c) => p + ' cor de ' + c },
    de: { cr: 'Katze|Bär|Häschen|Frosch|Pinguin|Eule|Fuchs|Panda|Küken|Roboter|Gespenst|Schleimi|Krake|Drache', ac: 'mit Blatt|mit Schleife|mit Brille|mit Spielstein|mit Go-Stein|mit Würfel|mit Shogi-König|mit Springer|mit Krone|mit Heiligenschein|mit Stern|mit Medaille',
      bp: 'Uni|Punkte|Streifen|Karo|Goban|Wellen|Sterne|Herzen|Waben|Backgammon|Sakura|Verlauf', bc: 'Creme|Minz|Himmel|Rosé|Flieder|Nacht|Abendrot|Holz|Gold', fr: 'Keiner|Weiß|Koralle|Himmel|Minze|Bonbon|Karo|Regenbogen|Lorbeer|Gold|Atlas',
      icon: (c, a) => c + ' ' + a, bg: (p, c) => c + '-' + p },
    hi: { cr: 'बिल्ली|भालू|खरगोश|मेंढक|पेंगुइन|उल्लू|लोमड़ी|पांडा|चूज़ा|रोबोट|भूत|स्लाइम|ऑक्टोपस|ड्रैगन', ac: 'पत्ती|रिबन|चश्मे|गोटी|गो-पत्थर|पासे|शोगी राजा|घोड़े|मुकुट|प्रभामंडल|सितारे|मेडल',
      bp: 'सादा|बिंदियाँ|धारियाँ|चेकर|गो बोर्ड|लहरें|तारे|दिल|षट्कोण|बैकगैमन|साकुरा|ग्रेडिएंट', bc: 'क्रीम|मिंट|आसमानी|गुलाबी|बकाइनी|रात|शाम|लकड़ी|सुनहरा', fr: 'कोई नहीं|सफ़ेद|कोरल|आसमानी|पुदीना|कैंडी|चेकर|इंद्रधनुष|लॉरेल|सुनहरा|एटलस',
      icon: (c, a, k) => a + (k === 'cat' || k === 'fox' ? ' वाली ' : ' वाला ') + c, bg: (p, c) => p + ' (' + c + ')' },
    ar: { cr: 'قطة|دب|أرنب|ضفدع|بطريق|بومة|ثعلب|باندا|كتكوت|روبوت|شبح|سلايم|أخطبوط|تنين', ac: 'الورقة|الشريطة|النظارة|القطعة|حجر الغو|النرد|ملك الشوغي|الحصان|التاج|الهالة|النجمة|الميدالية',
      bp: 'سادة|نقاط|خطوط|مربعات|رقعة غو|أمواج|نجوم|قلوب|سداسيات|طاولة الزهر|ساكورا|تدرّج', bc: 'الكريم|النعناع|السماء|الورد|الليلك|الليل|الغروب|الخشب|الذهب', fr: 'بلا|أبيض|مرجاني|سماوي|نعناعي|حلوى|مربعات|قوس قزح|إكليل غار|ذهبي|أطلس',
      icon: (c, a) => c + ' ب' + a, bg: (p, c) => p + ' بلون ' + c },
  };
  Object.keys(NAMES).forEach(l => {
    const N = NAMES[l], tab = (keys, s) => Object.fromEntries(s.split('|').map((v, i) => [keys[i], v]));
    const cr = tab(CRK, N.cr), ac = tab(ACK, N.ac), bp = tab(BPK, N.bp), bc = tab(BCK, N.bc), fr = tab(FRK, N.fr);
    items.forEach(it => {
      const d = it.d;
      it.name[l] = it.kind === 'icon' ? (d.ac === 'none' ? cr[d.cr] : N.icon(cr[d.cr], ac[d.ac], d.cr))
        : it.kind === 'bg' ? N.bg(bp[d.p], bc[d.c]) : fr[d.k];
    });
  });
  const map = Object.fromEntries(items.map(it => [it.id, it]));

  // starter set everyone owns
  const STARTER = ['i001', 'i004', 'i010', 'b001', 'b003', 'f-none', 'f-white'];

  /* ---------- renderers ---------- */
  let uid = 0;
  const U = p => p + (++uid).toString(36);
  function critterSvg(it) {
    const o = it.d, c = COL[o.co] || COL.snow;
    let body = CRIT[o.cr](c);
    if (o.co === 'gold') body = body.replace(/<circle cx="50" cy="56" r="31"/, '<circle cx="50" cy="56" r="31" stroke="#fff3b0" stroke-width="2"');
    return body + ACC[o.ac]();
  }
  function bgFill(it) {
    const c = BGCOL[it.d.c], u = U('p');
    return BG[it.d.p](c[0], c[1], u);
  }
  function svg(id, size = 96) {
    const it = map[id]; if (!it) return '';
    const vb = `viewBox="0 0 100 100" width="${size}" height="${size}"`;
    if (it.kind === 'icon') return `<svg ${vb} aria-hidden="true">${critterSvg(it)}</svg>`;
    if (it.kind === 'bg') { const f = bgFill(it); return `<svg ${vb} aria-hidden="true"><defs>${f.p}</defs><rect width="100" height="100" rx="18" fill="${f.fill}"/></svg>`; }
    const fu = U('f');
    return `<svg ${vb} aria-hidden="true"><circle cx="50" cy="50" r="40" fill="#eef2f8"/>${FRAME[it.d.k].d(fu)}</svg>`;
  }
  function avatar(a = {}, size = 72) {
    const ic = map[a.icon] || map.i001, b = map[a.bg] || map.b001, fr = map[a.frame] || map['f-none'];
    const f = bgFill(b), cid = U('c'), fu = U('f');
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="av-svg" aria-hidden="true"><defs>${f.p}<clipPath id="${cid}"><circle cx="50" cy="50" r="46"/></clipPath></defs>
<g clip-path="url(#${cid})"><rect width="100" height="100" fill="${f.fill}"/><g transform="translate(9 12) scale(.82)">${critterSvg(ic)}</g></g>${fr.d.k === 'none' ? '<circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/>' : FRAME[fr.d.k].d(fu)}</svg>`;
  }
  function bgDataUri(id) {
    const it = map[id] || map.b001; const f = bgFill(it);
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs>${f.p.replace(/patternUnits/, 'patternUnits')}</defs><rect width="120" height="120" fill="${f.fill}"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  }
  function isDark(id) { const it = map[id]; return !!it && it.kind === 'bg' && it.d.c === 'night'; }

  window.AtlasArt = { RAR, items, byId: id => map[id], STARTER, svg, avatar, bgDataUri, isDark };
})();
