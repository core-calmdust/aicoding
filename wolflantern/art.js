/* 狼影灯 — 影絵の人形と背景（すべてコードで描く SVG）
   人形：横顔・右向き。viewBox 0 0 120 250、足もとは y=236。体の黒い紙に、色のセロファンを貼った「窓」がある（トルコのカラギョズやワヤンの革人形のように）。
   背景：1600×900。遠景（薄く、ぼかす）→ 中景 → 近景（濃い）。中央は人形のために空ける。 */
(function (root) {
  'use strict';
  const INK = '#120c08';

  /* ---------- puppets ---------- */
  function head(look) {
    const n = look.nose || 'straight';
    const nose = n === 'hook' ? 'L75.5,38 C78,39 80.5,44 80.5,47 L76,47.6' : n === 'button' ? 'L75.2,40 C77.5,42 78.4,44.6 77.4,46.4 L75.6,47' : 'L75.4,39.5 L79.2,46.4 L75.8,47.4';
    // nape → back of the head → crown → forehead → nose → lips → chin → throat
    return `M52,59 C44.5,57 41.6,46 43.6,36.5 C45.6,26.5 53.5,21.6 61.8,22.4 C69.6,23.2 74.3,29 74.8,35.4 ${nose} L76,50 L74.6,51.4 L75.6,53.6 C75.2,56.4 72.4,58.6 68.4,58.8 C66.6,59.4 64.6,60.6 63.6,62 L63.8,69 L52.6,69 Z`;
  }
  const HAT = {
    none: '', bald: '',
    brim: '<path d="M37,28.6 C46,25.4 74,25.2 84,28.2 C80,30.4 44,31 37,28.6 Z"/><path d="M47,28 L48.2,13.4 C55,11.2 64,11.2 70.6,13.6 L71.6,27.6 Z"/><path d="M47.6,22 L71.2,22 L71.4,24.2 L47.4,24.2 Z" class="cel"/>',
    top: '<path d="M41.4,27.6 C50,25.2 70,25 79.6,27.6 L79,29.6 C68,28.4 52,28.4 41.6,29.8 Z"/><path d="M48.6,27 L47.2,3.6 C55,1.6 65,1.6 72.6,3.6 L71.2,27 Z"/><rect x="47.8" y="20.6" width="24.2" height="2.4" class="cel"/>',
    cap: '<path d="M43.2,33.4 C42.6,24.4 50.4,18.6 60.6,18.8 C70,19 75.6,24.6 75.6,30.4 L86.4,32.2 C84,34.6 74,34.6 70.6,33.4 Z"/>',
    flat: '<path d="M41.8,34 C40,24 50,17.4 61.6,17.6 C73.4,17.8 80.4,23.6 79.6,30.2 C74,32.8 52,33.6 41.8,34 Z"/>',
    kerchief: '<path d="M43,40 C40.4,28 48,20.4 60.2,20.4 C69.6,20.4 75.4,26.6 75.6,33 C66,30.6 54,31.6 46,36 C44.6,41.4 43.6,46 40.6,49.2 C38.6,45.4 41.4,42.8 43,40 Z"/><path d="M41.2,40.4 L34,47 L39.6,46.4 Z"/>',
    hood: '<path d="M68.4,60.6 C60,64 46,63.6 40.2,55 C33.8,45.6 36.4,26 46.8,19 C55.4,13.2 69.4,14.6 76,23.6 C79.6,28.6 79.4,34.6 77.6,37.2 C74.8,30.4 70.2,26.6 62.8,27.4 C53.6,28.4 49.6,36.4 51,45.6 C52.2,53 59,57.6 68.4,60.6 Z"/>',
    plume: '<path d="M40.6,29.4 C50,25.6 72,25.4 82.4,28.8 C78,31.6 46,31.8 40.6,29.4 Z"/><path d="M46.6,28.4 C46.4,22 50.6,16.4 59.4,16 C68.6,15.6 72.6,20.4 72.4,28 Z"/><path d="M50,17.6 C40,10 28,9.6 20,14.4 C30,13.2 40,16 46.4,22.6 Z" class="cel"/>',
    biretta: '<path d="M44.4,31.6 L45.2,19.6 C52,16.6 66,16.4 73.4,19.6 L74.6,31 C64,28.6 54,28.8 44.4,31.6 Z"/><path d="M53.6,17.8 L53.4,11.8 M64.4,17.6 L64.6,11.6" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="59" cy="13.4" r="3"/>',
    bun: '<circle cx="45.4" cy="25.6" r="7.4"/><path d="M43.4,38 C42.4,28 49.6,21.4 59.6,21.6 C68,21.8 73.6,26.4 74.6,31.2 C66,28 55,29.6 47.4,35.6 Z"/>',
    braid: '<path d="M43.6,39 C42,28 49,21.2 59.8,21.4 C68.6,21.6 74,26.6 74.8,31.6 C64,28.6 54,30.4 48,36.4 C47.4,40 46.2,44.4 44.6,47 Z"/><path d="M44.6,44 C40,52 38.6,62 40.6,72 C41.6,78 39.6,84 37,88 C41.6,86.4 44.6,80.6 44.4,74 C44.2,64 47,54 49,46 Z"/><path d="M38.6,86 L35.6,92.6 L40.8,90.2 Z" class="cel"/>',
    long: '<path d="M44,38 C41,26 49,20.6 60,20.8 C69.6,21 75.2,27 75,33 C66,29 55,30.6 49,36 C48.4,48 48,60 50.6,74 C44,72 38.6,66 38,56 C37.6,50 40.2,44 44,38 Z"/>',
    tri: '<path d="M38.6,27.4 C48,21.4 70,20.6 81.6,26.8 C76,28.8 70.4,26.6 60.2,26.6 C50,26.6 44,29.4 38.6,27.4 Z"/><path d="M46.6,27 C47.4,17 54,12.8 60.4,12.8 C67.6,12.8 72.8,17.6 73,26.8 Z"/>',
    bonnet: '<path d="M70,26 C66,18 56,15 48.4,18.6 C40.6,22.4 38.4,32 40.6,40.4 C42.4,47.4 46.4,51.4 50.4,53 C47.2,46 46.6,36.6 51.2,30.6 C56,24.6 64,24.4 70,26 Z"/><path d="M50,52 C52,56 54,60 51,66" stroke="currentColor" stroke-width="1.4" fill="none"/>',
    conductor: '<path d="M44.4,30.4 L45.8,19 C52,15.8 67,15.8 73.6,19.2 L74.2,29.4 C64,27.8 54,28 44.4,30.4 Z"/><path d="M72.6,29 L84.4,31 C82,33.4 74,33.2 70.4,32 Z"/><rect x="46.6" y="23.8" width="26.8" height="2.2" class="cel"/>',
    topknot: '<path d="M43.6,36 C42,26 49.4,20.8 60,21 C69.6,21.2 74.6,26 75,31.2 C66,28.6 54,29 47,34 Z"/><path d="M48,22 C46,16 50,12 56,13.6 C54,16 53.4,19 54.6,21.4 Z"/>',
    pony: '<path d="M43.6,39 C42,28 49,21.2 59.8,21.4 C68.6,21.6 74,26.6 74.8,31.6 C64,28.6 54,30.4 48,36.4 Z"/><path d="M46,30 C36,30 30,38 31,50 C32,58 30,64 27,68 C34,66 38,58 39,50 C40,42 43,36 48,34 Z"/>',
    sugegasa: '<path d="M30,31.6 L60.6,12.4 L91.4,31 C80,33.2 42,33.6 30,31.6 Z"/>',
  };
  const BEARD = {
    full: '<path d="M60,51 C61,56 63,62 66,66 C69.6,70 74.6,70.6 77.6,67.4 C76,64.6 75.4,60 75,55.6 C71,58.2 66.6,58 63.4,55 Z"/>',
    mustache: '<path d="M70.4,48.6 C73,47.4 77,47.2 79.6,49.2 C77.4,50.8 74.6,50.8 72.6,50 Z"/>',
    goatee: '<path d="M71.8,54.4 C74,55 76,56.6 76.4,60.6 C74,60.6 71.6,58.6 71.2,56 Z"/><path d="M71,48.8 C73.4,47.8 77,47.8 79,49.6 C77,50.6 74.2,50.6 72.6,50.2 Z"/>',
  };
  // bodies: from the neck (y≈62) down to the feet (y=236)
  const BODY = {
    coat: 'M50,64 C42,66 33,70 30.6,78 L27,150 L24.6,196 L44,198 L45,236 L56,236 L56.6,200 L63.6,200 L64.6,236 L76.4,236 L76,198 L95.6,195 L92.6,150 L89,80 C86.6,71 78,66 70,64 Z',
    thin: 'M52,64 C45,66 38.6,70 37,78 L34.6,150 L34,192 L46.6,194 L47.6,236 L57,236 L57.6,198 L63,198 L63.6,236 L73,236 L73.4,194 L86,192 L85,150 L83,80 C81.6,71 75.6,66 68,64 Z',
    cape: 'M50,64 C42,66 33,70 30.6,78 L27,150 L25,196 L44,198 L45,236 L56,236 L56.6,200 L63.6,200 L64.6,236 L76.4,236 L76,198 L95.6,195 L92.6,150 L89,80 C86.6,71 78,66 70,64 Z M48,66 C34,70 20,84 14,108 L10,152 C22,156 30,150 34,140 L40,100 Z',
    dress: 'M51,64 C44,66 38,70 36.6,78 L38.6,116 C34,140 24,180 14.6,234 C36,238 84,238 105.4,234 C96,180 86,140 81.6,116 L83.4,78 C82,71 76,66 69,64 Z',
    robe: 'M50,64 C41,66 33.6,70 31.6,80 L28.6,150 C26,186 22.6,214 20.6,236 L99.4,236 C97.4,214 94,186 91.4,150 L88.4,80 C86.4,70 79,66 70,64 Z',
    stout: 'M48,64 C38,66 28,72 25,82 C18,104 16,132 19.6,160 C22,182 30,196 42,200 L43,236 L55.4,236 L56.4,204 L64.6,204 L65.6,236 L78,236 L78.6,200 C92,196 101.6,180 103.6,156 C106,126 101,98 94,82 C90,72 80,66 72,64 Z',
    apron: 'M50,64 C42,66 34,70 31.6,78 L29,150 L27.6,200 L44,202 L45,236 L56,236 L56.6,204 L63.6,204 L64.6,236 L76.4,236 L76,202 L92.6,200 L91,150 L88.4,80 C86,71 78,66 70,64 Z',
    cloak: 'M49,63 C38,66 28,74 25,90 L20,150 C17,186 14,214 12.6,236 L42,236 L46,214 L52,214 L50.6,236 L73,236 L72,214 L80,214 L84,236 L107.4,236 C105,206 101,170 98,140 L94,88 C91,72 80,65 71,63 Z',
    child: 'M52,64 C45.6,66 40.6,70 39.4,78 L38,130 L36.4,168 L46.6,170 L47.4,236 L56.6,236 L57.2,174 L62.8,174 L63.4,236 L72.6,236 L73.4,170 L83.6,168 L82,130 L80.6,80 C79.4,71 74.4,66 68,64 Z',
    kimono: 'M50,64 C41,66 34,70 32,80 L30,150 C29,190 30,214 31,236 L89,236 C90,214 91,190 90,150 L88,80 C86,70 79,66 70,64 Z M58,66 L73,128 L66,128 Z',
    uniform: 'M50,64 C42,66 34,70 32,78 L30,150 L30,176 L44,178 L44.6,236 L56,236 L56.6,182 L63.6,182 L64.4,236 L76,236 L76.6,178 L90,176 L90,150 L88,80 C86,71 78,66 70,64 Z',
  };
  // the arm reaching forward, ending in a hand at about (94,126)
  const ARM = 'M80,74 C86,84 92,100 96,116 C97.6,121 97,126.6 93.4,128.4 C89.6,130.2 86.6,127.6 85.8,123 C83.4,110 79.6,98 74.6,88 Z';
  const PROP = {
    none: '',
    cane: '<path d="M93,125 L99,234 L101.4,234 L95.6,124 Z"/><path d="M90,124 C90,118 98,117 98.6,123 L96.6,124 C96,120.6 92.6,121 92.4,124.6 Z"/>',
    umbrella: '<path d="M93.6,118 L95,126 L99,204 L104,222 L105.8,222 L101.4,203 L97.4,124 L96.6,116 Z"/><path d="M95.4,114 C93.6,110 96.4,106 100,107.6" stroke="currentColor" stroke-width="2" fill="none"/>',
    hammer: '<path d="M92,124 L101,168 L104,167.4 L95.2,123 Z"/><rect x="95.4" y="164" width="16" height="10" rx="1" transform="rotate(-12 103 169)"/>',
    basket: '<path d="M86,128 C86,114 106,114 106,128" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M83,128 L109,128 L105,146 L87,146 Z"/><path d="M87,133 L105,133 M88,139 L104,139" stroke="var(--cel)" stroke-width="1.2" class="cel-s"/>',
    bag: '<path d="M84,138 L108,138 L110,158 L82,158 Z"/><path d="M89,138 C89,130 103,130 103,138" stroke="currentColor" stroke-width="2.4" fill="none"/><rect x="93.4" y="144" width="5" height="5" class="cel"/>',
    keys: '<circle cx="94" cy="136" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M92,140 L90,154 L93,154 L92.4,150 L94,150 L93.6,147 L94.6,141 Z M97,140 L100,151 L102.4,150 Z"/>',
    shovel: '<path d="M90,96 L95.4,96.6 L101.4,222 L98.4,222 Z"/><path d="M94,212 C92,222 94,232 100.4,236 C106,232 108,222 105,212 Z"/>',
    rifle: '<path d="M70,70 L76.4,66 L116,14 L118,15.6 L82,70 L86,80 L78,84 Z"/>',
    crook: '<path d="M92,124 L95.4,234 L98,234 L95,122 Z"/><path d="M93,124 L91,70 C91,58 104,56 106,66 C107,72 103,76 99,74" stroke="currentColor" stroke-width="2.6" fill="none"/>',
    book: '<path d="M80,104 L98,100 L100,124 L82,128 Z"/><path d="M83,107 L96,104 L97.4,121 L84.6,124 Z" class="cel"/>',
    pack: '<path d="M28,74 C20,74 14,80 14,90 L14,152 C14,158 18,162 24,162 L36,162 L36,74 Z"/><path d="M17,96 L33,96 M17,120 L33,120" stroke="var(--cel)" stroke-width="1.6" class="cel-s"/><path d="M14,70 L22,58 L28,60 L22,72 Z"/>',
    sack: '<path d="M34,70 C24,56 32,40 46,42 C58,44 64,56 58,70 C52,78 40,78 34,70 Z"/>',
    lantern: '<path d="M93,126 L93,134" stroke="currentColor" stroke-width="1.6"/><path d="M86,134 L100,134 L99,152 L87,152 Z"/><path d="M88.6,137 L97.4,137 L96.8,149 L89.2,149 Z" class="cel lamp"/><path d="M85,152 L101,152 L99,156 L87,156 Z"/>',
    pipe: '<path d="M75.4,52 L84,55.6 L84.6,51 L88.4,51 L88,57.6 L76,56 Z"/>',
    fan: '<path d="M93,126 L80,104 C88,98 100,98 108,104 Z"/><path d="M84,106 L93,124 L102,106" stroke="var(--cel)" stroke-width="1.1" fill="none" class="cel-s"/>',
    net: '<path d="M92,124 L96,232 L98.4,232 L94.6,122 Z"/><path d="M96,232 C88,212 104,196 112,210 C114,222 106,232 98,232 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M100,212 L108,226 M104,204 L100,228" stroke="currentColor" stroke-width="1"/>',
    ticket: '<path d="M86,118 L102,114 L104,124 L88,128 Z" class="cel"/>',
    cup: '<path d="M88,120 L100,120 L98.6,130 L89.4,130 Z"/><path d="M90,117 C91,113 93,113 92,109 M95,117 C96,113 98,113 97,109" stroke="currentColor" stroke-width=".8" fill="none" opacity=".5"/>',
    sword: '<path d="M90,128 L118,212 L120,211 L93.4,126 Z"/><path d="M86,124 L98,120 L98.6,123 L87,127 Z"/>',
  };
  const CUT = {
    none: '',
    star: '<path d="M60,96 L63,104 L71.6,104.4 L64.8,109.6 L67.2,118 L60,113 L52.8,118 L55.2,109.6 L48.4,104.4 L57,104 Z"/>',
    lace: '<circle cx="48" cy="150" r="3"/><circle cx="58" cy="152" r="3"/><circle cx="68" cy="150" r="3"/><circle cx="78" cy="148" r="2.6"/><circle cx="53" cy="160" r="2.2"/><circle cx="63" cy="161" r="2.2"/><circle cx="73" cy="159" r="2"/>',
    stripe: '<path d="M44,120 L76,100 L77.6,103 L45.6,123 Z"/><path d="M44,134 L80,112 L81.6,115 L45.6,137 Z"/><path d="M45,148 L82,126 L83.4,129 L46.4,151 Z"/>',
    flower: '<circle cx="60" cy="108" r="3.2"/><circle cx="60" cy="100.6" r="3.4"/><circle cx="67" cy="105.6" r="3.4"/><circle cx="64.4" cy="113.6" r="3.4"/><circle cx="55.6" cy="113.6" r="3.4"/><circle cx="53" cy="105.6" r="3.4"/>',
    wave: '<path d="M38,150 C44,144 50,156 56,150 C62,144 68,156 74,150 C80,144 84,152 88,148 L88,153 C84,157 80,149 74,155 C68,161 62,149 56,155 C50,161 44,149 38,155 Z"/>',
    diamond: '<path d="M60,96 L68,108 L60,120 L52,108 Z"/><path d="M60,126 L65,134 L60,142 L55,134 Z"/>',
    cross: '<path d="M57.6,94 L62.4,94 L62.4,102 L70,102 L70,106.6 L62.4,106.6 L62.4,124 L57.6,124 L57.6,106.6 L50,106.6 L50,102 L57.6,102 Z"/>',
    moon: '<path d="M64,98 C56,100 52,108 55,116 C58,123 66,125 72,121 C64,121 59,115 60,108 C60.6,103 62,100 64,98 Z"/>',
    wheel: '<circle cx="60" cy="110" r="9" fill="none" stroke-width="2.2" stroke="var(--cel)"/><path d="M60,101 L60,119 M51,110 L69,110 M53.6,103.6 L66.4,116.4 M66.4,103.6 L53.6,116.4" stroke="var(--cel)" stroke-width="1.4"/>',
  };

  // one puppet as an SVG string
  function puppet(look, color, opt) {
    opt = opt || {};
    const L = Object.assign({ body: 'coat', h: 1, hat: 'none', nose: 'straight', prop: 'none', cut: 'none' }, look);
    const sc = L.h, kid = L.body === 'child';
    const hs = kid ? 1.16 : 1;
    const ty = 236 - 236 * sc;
    const hd = `<g transform="translate(60 69) scale(${hs}) translate(-60 -69)"><path d="${head(L)}"/>${HAT[L.hat] || ''}${L.hair && HAT[L.hair] ? HAT[L.hair] : ''}${BEARD[L.beard] || ''}${L.glasses ? '<circle cx="68.6" cy="38.6" r="3.6" class="cel" stroke="currentColor" stroke-width="1.4"/><path d="M65,38.4 L50,36.6" stroke="currentColor" stroke-width="1.1"/>' : ''}</g>`;
    const body = `<path d="${BODY[L.body] || BODY.coat}"/>`;
    const arm = `<path d="${ARM}"/>`;
    const cut = CUT[L.cut] ? `<g class="cel">${CUT[L.cut]}</g>` : '';
    const prop = PROP[L.prop] || '';
    const back = L.prop === 'pack' || L.prop === 'sack' ? prop : '';
    const front = back ? '' : prop;
    const rod = opt.rod === false ? '' : `<path class="rod" d="M60,150 L60,${300 / sc}" />`;
    return `<svg class="pup" viewBox="0 0 120 250" style="--cel:${color}" aria-hidden="true"><g class="fig" transform="translate(0 ${ty.toFixed(1)}) scale(${sc})" fill="currentColor" color="${INK}">${rod}${back}${body}${cut}${hd}${arm}${front}</g></svg>`;
  }
  // a head only (for small icons in lists)
  function bust(look, color) {
    const L = Object.assign({ hat: 'none', nose: 'straight' }, look);
    return `<svg class="bust" viewBox="30 0 66 76" style="--cel:${color}" aria-hidden="true"><g fill="currentColor" color="${INK}"><path d="M28,76 C30,70 40,66 52,64 L63.6,64 C76,66 86,70 90,76 Z"/><path d="${head(L)}"/>${HAT[L.hat] || ''}${L.hair && HAT[L.hair] ? HAT[L.hair] : ''}${BEARD[L.beard] || ''}${L.glasses ? '<circle cx="68.6" cy="38.6" r="3.6" class="cel" stroke="currentColor" stroke-width="1.4"/>' : ''}</g></svg>`;
  }
  // the wolf: the shadow every puppet can become
  function wolf() {
    return `<svg class="wolfsil" viewBox="0 0 300 170" aria-hidden="true"><path fill="currentColor" d="M10,66 C30,58 52,62 66,72 C96,60 140,54 172,58 C190,50 206,42 216,40 L220,20 L228,35 L235,22 L239,40 C251,46 267,56 289,68 C281,74 269,77 257,78 C251,84 241,92 231,96 C223,104 215,110 209,116 L215,164 L203,164 L196,124 C186,124 178,120 170,118 C150,120 130,120 116,116 L120,140 C121,150 118,158 112,164 L100,164 C104,158 106,150 104,142 L96,124 C90,124 84,128 80,134 L74,164 L62,164 L68,130 C62,118 60,106 62,96 C48,90 30,86 10,80 C3,76 3,70 10,66 Z"/><path d="M262,70 L270,72 L262,73 Z" fill="var(--paper,#efe3c8)" opacity=".5"/><circle cx="242" cy="52" r="2.4" class="eye"/></svg>`;
  }
  /* ---------- backdrops ---------- */
  const R = s => { let x = s; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  function ridge(r, y0, amp, step, w) { let d = `M0,900 L0,${y0}`; for (let x = 0; x <= w; x += step) d += ` L${x},${(y0 - amp * (r() * .9 + .1) * (Math.sin(x / 260) * .5 + .7)).toFixed(0)}`; return d + ` L${w},900 Z`; }
  function pine(x, y, h) { const w = h * .36; let d = ''; for (let i = 0; i < 4; i++) { const t = y - h * (i / 4), ww = w * (1 - i / 5); d += `M${x - ww},${t} L${x},${t - h * .42} L${x + ww},${t} Z `; } return d + `M${x - 3},${y} L${x + 3},${y} L${x + 3},${y + h * .12} L${x - 3},${y + h * .12} Z`; }
  function house(x, y, w, h, roof) { return `M${x},${y} L${x},${y - h} L${x + w / 2},${y - h - roof} L${x + w},${y - h} L${x + w},${y} Z`; }
  function win(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="glow"/>`; }
  function bareTree(x, y, h, r) { let d = `M${x - 4},${y} L${x - 2},${y - h} L${x + 2},${y - h} L${x + 4},${y} Z`; for (let i = 0; i < 6; i++) { const yy = y - h * (.4 + r() * .55), dir = i % 2 ? 1 : -1, len = h * (.2 + r() * .3); d += ` M${x},${yy} L${x + dir * len},${yy - len * .7} L${x + dir * len + 2 * dir},${yy - len * .7 + 2} L${x + 2 * dir},${yy + 4} Z`; } return d; }

  const SCENES = {
    // 霧鐘村：雪の山村
    alps: {
      far(r) { return `<path d="M0,900 L0,430 L160,300 L260,360 L420,210 L560,330 L700,250 L860,380 L1000,240 L1140,320 L1300,180 L1460,330 L1600,280 L1600,900 Z"/><path d="M420,210 L470,260 L440,262 L410,240 L380,262 L360,252 Z M1300,180 L1350,230 L1320,236 L1290,210 L1260,236 Z" class="snow"/>`; },
      mid(r) { let d = ''; for (let i = 0; i < 26; i++) { const x = r() * 1600, h = 60 + r() * 90; d += pine(x, 640 + r() * 30, h); } return `<path d="${ridge(r, 650, 40, 80, 1600)}"/><path d="${d}"/>`; },
      tower() { return `<path d="M1080,760 L1080,420 L1100,400 L1100,250 L1150,190 L1200,250 L1200,400 L1220,420 L1220,760 Z M1150,150 L1153,190 L1147,190 Z M1144,140 L1156,140 L1156,146 L1144,146 Z"/><path d="M1126,270 C1126,250 1174,250 1174,270 L1174,330 L1126,330 Z" class="glow"/><path d="M1138,300 C1138,282 1162,282 1162,300 C1162,312 1138,312 1138,300 Z" /><path d="M1220,760 L1220,560 L1400,500 L1580,560 L1580,760 Z"/><path d="M1300,600 C1300,580 1330,580 1330,600 L1330,650 L1300,650 Z" class="glow"/><path d="M200,760 L200,700 C200,660 260,660 260,700 L260,760 Z M226,640 L234,640 L234,700 L226,700 Z M210,660 L250,660 L250,668 L210,668 Z"/>`; },
      inn() { return `<path d="${house(1040, 760, 420, 260, 120)}"/><path d="M1200,400 L1200,330 L1236,330 L1236,420 Z"/>${win(1080, 560, 50, 70)}${win(1170, 560, 50, 70)}${win(1260, 560, 50, 70)}${win(1360, 560, 50, 70)}${win(1110, 660, 60, 80)}<path d="M1010,520 L1030,520 L1030,610 L1010,610 Z M960,520 L1040,520 L1040,528 L960,528 Z M970,528 L1000,528 L1000,566 L970,566 Z"/><path d="${house(110, 760, 260, 180, 80)}"/>${win(160, 650, 40, 50)}${win(280, 650, 40, 50)}`; },
      forge() { return `<path d="M1000,760 L1000,520 L1300,450 L1600,520 L1600,760 Z"/><path d="M1380,470 L1380,300 L1440,300 L1440,500 Z"/><path d="M1060,760 L1060,600 C1060,560 1180,560 1180,600 L1180,760 Z" class="glow fire"/><path d="M180,760 L200,700 L330,700 L350,760 Z M210,700 L210,680 L320,680 L320,700 Z M250,640 L262,640 L262,680 L250,680 Z M230,630 L290,630 L290,642 L230,642 Z"/>`; },
      mill() { return `<path d="M960,760 L960,500 L1200,420 L1440,500 L1440,760 Z"/><g transform="translate(860 600)"><circle r="170" fill="none" stroke="currentColor" stroke-width="16"/><circle r="30"/>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M0,0 L${(Math.cos(a) * 170).toFixed(0)},${(Math.sin(a) * 170).toFixed(0)}" stroke="currentColor" stroke-width="9"/><rect x="${(Math.cos(a) * 160 - 18).toFixed(0)}" y="${(Math.sin(a) * 160 - 10).toFixed(0)}" width="36" height="20" transform="rotate(${i * 30} ${(Math.cos(a) * 160).toFixed(0)} ${(Math.sin(a) * 160).toFixed(0)})"/>`; }).join('')}</g><path d="M1000,500 L1004,560 L1008,500 Z M1040,488 L1045,570 L1050,488 Z M1090,472 L1093,520 L1096,472 Z" class="snow"/>${win(1260, 600, 60, 70)}`; },
      grave(r) { let d = ''; const xs = [180, 300, 420, 1060, 1180, 1300, 1430]; xs.forEach((x, i) => { const y = 760 - (i % 2) * 10, h = 70 + (i % 3) * 18; d += i % 3 === 1 ? `M${x - 6},${y} L${x - 6},${y - h} L${x + 6},${y - h} L${x + 6},${y} Z M${x - 26},${y - h + 20} L${x + 26},${y - h + 20} L${x + 26},${y - h + 32} L${x - 26},${y - h + 32} Z ` : `M${x - 26},${y} L${x - 26},${y - h + 26} C${x - 26},${y - h - 6} ${x + 26},${y - h - 6} ${x + 26},${y - h + 26} L${x + 26},${y} Z `; }); return `<path d="${d}"/><path d="${bareTree(1500, 760, 360, r)} ${bareTree(80, 760, 300, r)}"/>`; },
      ground() { return '<path d="M0,900 L0,756 C300,746 500,766 800,758 C1100,750 1300,764 1600,754 L1600,900 Z"/>'; },
    },
    // 北辰号：夜行列車（客車の中・外）
    train: {
      far(r) { return `<path d="${ridge(r, 470, 90, 60, 1600)}"/>`; },
      mid(r) { let d = ''; for (let i = 0; i < 14; i++) { const x = r() * 1600; d += `M${x},640 L${x + 6},520 L${x + 12},640 Z `; } return `<path d="M0,640 L1600,640 L1600,660 L0,660 Z"/><path d="${d}"/>`; },
      car(kind) {
        // the inside of a carriage: the window band, the luggage rack, the lamps
        let s = '<path d="M0,0 L1600,0 L1600,170 L0,170 Z M0,760 L1600,760 L1600,900 L0,900 Z"/>';
        s += '<path d="M0,170 L1600,170 L1600,190 L0,190 Z M0,300 L1600,300 L1600,314 L0,314 Z"/>';
        for (let x = 40; x < 1600; x += 260) s += `<path d="M${x},330 L${x + 200},330 L${x + 200},540 L${x},540 Z" class="pane"/><path d="M${x - 20},314 L${x + 220},314 L${x + 220},330 L${x - 20},330 Z M${x - 20},540 L${x + 220},540 L${x + 220},560 L${x - 20},560 Z M${x + 220},314 L${x + 240},314 L${x + 240},760 L${x + 220},760 Z"/>`;
        for (let x = 170; x < 1600; x += 520) s += `<path d="M${x},190 L${x + 20},190 L${x + 30},236 L${x - 10},236 Z"/><ellipse cx="${x + 10}" cy="244" rx="22" ry="10" class="glow"/>`;
        if (kind === 'dining') s += '<path d="M120,760 L120,640 L380,640 L380,652 L260,652 L260,760 L240,760 L240,652 L140,652 L140,760 Z M1220,760 L1220,640 L1480,640 L1480,652 L1360,652 L1360,760 L1340,760 L1340,652 L1240,652 L1240,760 Z"/><path d="M160,640 L170,600 L180,640 Z M1400,640 L1410,600 L1420,640 Z"/><path d="M196,628 C196,610 214,610 214,628 Z M1300,628 C1300,610 1318,610 1318,628 Z" class="glow"/>';
        if (kind === 'sleeper') s += '<path d="M60,760 L60,400 L420,400 L420,420 L80,420 L80,580 L420,580 L420,600 L80,600 L80,760 Z M1180,760 L1180,400 L1540,400 L1540,760 L1520,760 L1520,600 L1200,600 L1200,760 Z M1200,420 L1520,420 L1520,580 L1200,580 Z"/><path d="M1220,440 L1500,440 L1500,560 L1220,560 Z" class="glow"/>';
        if (kind === 'third') s += '<path d="M60,760 L60,560 L80,520 L360,520 L380,560 L380,760 Z M1240,760 L1240,560 L1260,520 L1540,520 L1560,560 L1560,760 Z"/><path d="M90,490 L350,490 L350,500 L90,500 Z M1270,490 L1530,490 L1530,500 L1270,500 Z"/>';
        if (kind === 'baggage') s += '<path d="M60,760 L60,560 L300,560 L300,760 Z M70,560 L70,470 L250,470 L250,560 Z M320,760 L320,640 L470,640 L470,760 Z M1200,760 L1200,520 L1540,520 L1540,760 Z M1230,520 L1260,470 L1500,470 L1520,520 Z"/><path d="M90,500 L230,500 M90,530 L230,530 M1240,600 L1500,600 M1240,680 L1500,680" stroke="var(--cel2)" stroke-width="3" class="cel-s"/>';
        return s;
      },
      dining() { return this.car('dining'); }, sleeper() { return this.car('sleeper'); }, third() { return this.car('third'); }, baggage() { return this.car('baggage'); },
      engine() { return `<path d="M940,760 L940,520 L1220,520 L1220,440 L1500,440 L1500,560 L1600,560 L1600,760 Z M1060,520 L1060,380 L1120,380 L1120,520 Z M1040,380 L1140,380 L1140,360 L1040,360 Z"/><circle cx="1040" cy="760" r="70" fill="none" stroke="currentColor" stroke-width="16"/><circle cx="1220" cy="760" r="70" fill="none" stroke="currentColor" stroke-width="16"/><circle cx="1400" cy="760" r="70" fill="none" stroke="currentColor" stroke-width="16"/><path d="M1040,760 L1400,760" stroke="currentColor" stroke-width="12"/>${win(1290, 470, 90, 60)}<path d="M920,600 L940,600 L940,640 L920,640 Z"/><ellipse cx="918" cy="620" rx="24" ry="24" class="glow"/><path d="M120,760 L120,560 L420,560 L420,760 Z" />${win(160, 600, 80, 60)}${win(300, 600, 80, 60)}`; },
      ground() { return '<path d="M0,900 L0,760 L1600,760 L1600,900 Z"/><path d="M0,800 L1600,800" stroke="currentColor" stroke-width="10"/>'; },
    },
    // ともしび島：灯台のある島
    island: {
      far(r) { return `<path d="M0,900 L0,600 C200,590 400,605 600,598 C800,590 1000,606 1200,596 C1400,588 1500,600 1600,594 L1600,900 Z"/><path d="M60,600 L200,520 L320,560 L420,600 Z M1260,596 L1360,500 L1480,540 L1580,594 Z"/>`; },
      mid(r) { let d = ''; for (let x = 0; x < 1600; x += 40) d += `M${x},${640 + Math.sin(x / 50) * 6} Q${x + 20},${630 + Math.sin(x / 40) * 8} ${x + 40},${640 + Math.sin((x + 40) / 50) * 6} `; return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/>`; },
      light() { return `<path d="M1020,760 L1020,620 C1060,560 1120,520 1200,500 L1320,500 L1340,760 Z"/><path d="M1180,500 L1196,180 L1284,180 L1300,500 Z"/><path d="M1176,180 L1304,180 L1304,166 L1176,166 Z M1196,166 L1196,110 L1284,110 L1284,166 Z M1190,110 L1240,70 L1290,110 Z"/><path d="M1206,118 L1274,118 L1274,160 L1206,160 Z" class="glow beam"/>${win(1226, 260, 28, 40)}${win(1226, 380, 28, 40)}`; },
      harbor() { return `<path d="M0,760 L0,640 L520,640 L520,660 L60,660 L60,760 Z"/>${[90, 220, 350].map(x => `<path d="M${x},640 L${x},560 M${x - 2},560 L${x + 2},560" stroke="currentColor" stroke-width="10"/>`).join('')}<path d="M1000,700 C1100,730 1300,730 1420,700 L1400,744 C1300,760 1120,760 1020,744 Z"/><path d="M1200,700 L1204,520 L1210,700 Z M1206,530 L1290,690 L1210,690 Z"/><path d="M1120,560 L1160,500 L1170,500 L1130,560 Z"/>`; },
      net() { return `<path d="M1000,760 L1000,520 L1260,440 L1520,520 L1520,760 Z"/>${win(1080, 600, 70, 70)}<path d="M120,760 L120,480 L136,480 L136,760 Z M480,760 L480,480 L496,480 L496,760 Z"/><path d="M128,486 C220,560 400,560 488,486" fill="none" stroke="currentColor" stroke-width="3"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${150 + i * 38},${520 + Math.sin(i / 2.6) * 26} L${150 + i * 38},${740}" stroke="currentColor" stroke-width="1.6" opacity=".7"/>`).join('')}<path d="M136,600 L480,600 M136,660 L480,660 M136,720 L480,720" stroke="currentColor" stroke-width="1.6" opacity=".7"/>`; },
      clinic() { return `<path d="${house(1020, 760, 400, 240, 90)}"/>${win(1070, 600, 60, 70)}${win(1180, 600, 60, 70)}${win(1290, 600, 60, 70)}<path d="M1200,430 L1240,430 L1240,470 L1200,470 Z" class="glow"/><path d="M1212,440 L1228,440 L1228,460 L1212,460 Z"/><path d="M120,760 L140,560 L190,560 L210,760 Z M100,560 L230,560 L220,540 L110,540 Z"/>`; },
      shrine() { return `<path d="M1040,760 L1040,560 L1080,560 L1080,760 Z M1320,760 L1320,560 L1360,560 L1360,760 Z M1000,540 C1100,520 1300,520 1400,540 L1410,520 C1300,500 1100,500 990,520 Z M1020,580 L1380,580 L1380,600 L1020,600 Z"/><path d="M1190,600 L1210,600 L1210,640 L1190,640 Z"/><path d="M150,760 L150,560 L130,560 L200,500 L270,560 L250,560 L250,760 Z"/><path d="M180,600 L220,600 L220,660 L180,660 Z" class="glow"/>`; },
      cliff() { return `<path d="M0,760 L0,420 C80,410 160,430 240,470 C320,510 360,560 380,620 L420,760 Z"/><path d="M1600,760 L1600,380 C1520,380 1460,420 1420,480 C1380,540 1360,620 1340,760 Z"/><path d="M1460,380 L1470,300 L1480,380 Z M1500,380 L1508,320 L1516,380 Z"/>`; },
      ground() { return '<path d="M0,900 L0,758 C300,752 600,762 900,756 C1200,750 1400,760 1600,754 L1600,900 Z"/>'; },
    },
  };
  // the whole backdrop of one place
  // the new cut-paper backdrops (scenes.js), used only once they have passed tools/scene-quality.js
  function h32(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function sceneHash(kind, loc) { const N = root.WLScenes && root.WLScenes[kind] && root.WLScenes[kind][loc]; if (!N) return null; return h32(String(N.far) + String(N.mid) + String(N.near) + (root.WLScenes.v || '')); }
  function sceneNew(kind, loc, seed) {
    const N = root.WLScenes && root.WLScenes[kind] && root.WLScenes[kind][loc]; if (!N) return '';
    const s = (seed || 7) * 7919 + 13;
    return `<svg class="scn" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g transform="translate(0 112)"><g class="far" fill="currentColor">${N.far(R(31))}</g>
      <g class="mid" fill="currentColor">${N.mid(R(57))}</g>
      <g class="near" fill="currentColor">${N.near(R(s))}</g></g></svg>`;
  }
  function scene(kind, loc, seed) {
    const pass = root.WL_SCENE_PASS || {};
    if (pass[kind + '/' + loc] && pass[kind + '/' + loc] === sceneHash(kind, loc)) return sceneNew(kind, loc, seed);
    const K = SCENES[kind]; if (!K) return '';
    const r = R((seed || 7) * 7919 + 13);
    const near = (K[loc] ? K[loc].call(K, r) : '') + K.ground.call(K, r);
    return `<svg class="scn" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g transform="translate(0 112)"><g class="far" fill="currentColor">${K.far.call(K, R(31))}</g>
      <g class="mid" fill="currentColor">${K.mid.call(K, R(57))}</g>
      <g class="near" fill="currentColor">${near}</g></g></svg>`;
  }

  root.WLArt = { puppet, bust, wolf, scene, sceneNew, sceneHash, INK };
})(typeof window !== 'undefined' ? window : globalThis);
