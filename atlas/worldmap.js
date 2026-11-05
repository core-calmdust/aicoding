/* World Board Game Atlas — ボドゲ地図 (Atlas map tab): every game pinned where it was born on a world dot map.
   Drag / wheel / pinch to move around, region chips fly the view, tapping a pin draws that game's journey
   (the same route as its ヒストリア origin chapter) and opens its card with a ▶ button into the board view.
   Data: mapdata.js (generated from historia/s + historia/<lang>, see tools note at the top of that file),
   land: historia/map.js (coarse, first paint) → historia/map-fine.js (sharper dots once loaded).
   app.js calls AtlasMap.render(section, ctx) whenever the tab is shown or the language changes. */
(function () {
  'use strict';
  const V = 1;
  const UI = {
    ja: { hist: 'ヒストリア', title: '地図', sub: '世界のどこで生まれたゲーム？ ピンをタップすると、そのゲームの旅をたどれます。', all: 'すべて', asia: 'アジア', europe: 'ヨーロッパ', mea: '中東・アフリカ', americas: 'アメリカ', play: '遊ぶ', born: '発祥', era: '年代', route: 'ゲームの旅', hint: 'ドラッグで移動・ホイール／ピンチで拡大', pick: 'ピンを選ぶと、ここにゲームの物語が出ます', reset: '全体を表示', n: '{n}タイトル', load: '地図をひらいています…' },
    en: { hist: 'Historia', title: 'Atlas', sub: 'Where in the world was each game born? Tap a pin to follow its journey.', all: 'All', asia: 'Asia', europe: 'Europe', mea: 'Middle East & Africa', americas: 'Americas', play: 'Play', born: 'Born in', era: 'Era', route: 'Its journey', hint: 'Drag to move · wheel / pinch to zoom', pick: 'Pick a pin to read the story of that game', reset: 'Whole world', n: '{n} games', load: 'Unfolding the map…' },
    zh: { hist: '历史', title: '地图', sub: '每款游戏诞生在世界的哪里？点击图钉，追寻它的旅程。', all: '全部', asia: '亚洲', europe: '欧洲', mea: '中东・非洲', americas: '美洲', play: '开始', born: '发源地', era: '年代', route: '游戏之旅', hint: '拖动移动・滚轮／双指缩放', pick: '选择图钉，这里会显示游戏的故事', reset: '显示全图', n: '{n}款', load: '正在展开地图…' },
    ko: { hist: '히스토리아', title: '지도', sub: '각 게임은 세계 어디에서 태어났을까요? 핀을 누르면 그 게임의 여정을 따라갈 수 있어요.', all: '전체', asia: '아시아', europe: '유럽', mea: '중동・아프리카', americas: '아메리카', play: '플레이', born: '발상지', era: '연대', route: '게임의 여정', hint: '드래그로 이동・휠／핀치로 확대', pick: '핀을 고르면 여기에 게임 이야기가 나와요', reset: '전체 보기', n: '{n}개', load: '지도를 펼치는 중…' },
    es: { hist: 'Historia', title: 'Atlas', sub: '¿En qué parte del mundo nació cada juego? Toca un pin para seguir su viaje.', all: 'Todo', asia: 'Asia', europe: 'Europa', mea: 'Oriente Medio y África', americas: 'América', play: 'Jugar', born: 'Origen', era: 'Época', route: 'Su viaje', hint: 'Arrastra para mover · rueda / pellizca para ampliar', pick: 'Elige un pin para leer la historia del juego', reset: 'Todo el mundo', n: '{n} juegos', load: 'Desplegando el mapa…' },
    fr: { hist: 'Historia', title: 'Atlas', sub: 'Où chaque jeu est-il né ? Touchez une épingle pour suivre son voyage.', all: 'Tout', asia: 'Asie', europe: 'Europe', mea: 'Moyen-Orient et Afrique', americas: 'Amériques', play: 'Jouer', born: 'Origine', era: 'Époque', route: 'Son voyage', hint: 'Glisser pour déplacer · molette / pincer pour zoomer', pick: 'Choisissez une épingle pour lire l’histoire du jeu', reset: 'Monde entier', n: '{n} jeux', load: 'Dépliage de la carte…' },
    pt: { hist: 'Historia', title: 'Atlas', sub: 'Onde nasceu cada jogo? Toque num pino para seguir a viagem dele.', all: 'Todos', asia: 'Ásia', europe: 'Europa', mea: 'Oriente Médio e África', americas: 'Américas', play: 'Jogar', born: 'Origem', era: 'Época', route: 'A viagem', hint: 'Arraste para mover · roda / pinça para ampliar', pick: 'Escolha um pino para ler a história do jogo', reset: 'Mundo todo', n: '{n} jogos', load: 'Abrindo o mapa…' },
    de: { hist: 'Historia', title: 'Atlas', sub: 'Wo auf der Welt ist jedes Spiel entstanden? Tippe auf eine Nadel und folge seiner Reise.', all: 'Alle', asia: 'Asien', europe: 'Europa', mea: 'Nahost & Afrika', americas: 'Amerika', play: 'Spielen', born: 'Herkunft', era: 'Zeit', route: 'Seine Reise', hint: 'Ziehen zum Bewegen · Rad / Pinch zum Zoomen', pick: 'Wähle eine Nadel, um die Geschichte des Spiels zu lesen', reset: 'Ganze Welt', n: '{n} Spiele', load: 'Karte wird entfaltet…' },
    hi: { hist: 'हिस्टोरिया', title: 'एटलस', sub: 'हर खेल दुनिया में कहाँ जन्मा? पिन पर टैप करके उसकी यात्रा देखें।', all: 'सभी', asia: 'एशिया', europe: 'यूरोप', mea: 'मध्य पूर्व व अफ़्रीका', americas: 'अमेरिका', play: 'खेलें', born: 'जन्मस्थान', era: 'काल', route: 'खेल की यात्रा', hint: 'खींचकर घुमाएँ · व्हील / पिंच से ज़ूम', pick: 'पिन चुनें, यहाँ खेल की कहानी दिखेगी', reset: 'पूरी दुनिया', n: '{n} खेल', load: 'नक्शा खुल रहा है…' },
    ar: { hist: 'هيستوريا', title: 'الأطلس', sub: 'أين وُلدت كل لعبة في العالم؟ المس دبوسًا لتتبع رحلتها.', all: 'الكل', asia: 'آسيا', europe: 'أوروبا', mea: 'الشرق الأوسط وأفريقيا', americas: 'الأمريكتان', play: 'العب', born: 'المنشأ', era: 'الحقبة', route: 'رحلتها', hint: 'اسحب للتحريك · العجلة / القرص للتكبير', pick: 'اختر دبوسًا لتقرأ قصة اللعبة', reset: 'العالم كله', n: '{n} ألعاب', load: 'جارٍ فتح الخريطة…' },
  };
  const REG = ['all', 'asia', 'europe', 'mea', 'americas'];
  const W0 = 360, H0 = 128.5;   // map units: 1 = 1° of longitude, equirectangular 72.5°N…56°S
  const LAT0 = 72.5;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  let dataP = null, fineP = null;
  const ensure = () => dataP || (dataP = Promise.all([window.ATLAS_MAP_DATA ? 0 : load('mapdata.js?v=' + V), window.HISTORIA_MAP ? 0 : load('historia/map.js?v=6')]));
  const masks = {};
  function mask(M, key) {
    if (!M) return null; if (masks[key]) return masks[key];
    const rows = M.rows.split('|'), nc = Math.round(360 / M.step), g = new Uint8Array(nc * rows.length);
    rows.forEach((row, y) => { let x = 0; row.split('.').forEach((v, i) => { const n = parseInt(v, 36); if (i & 1) g.fill(1, y * nc + x, y * nc + x + n); x += n; }); });
    return masks[key] = { g, nc, nr: rows.length, step: M.step, lat0: M.lat0 };
  }
  const regionOf = ([lon, lat]) => lon < -30 ? 'americas' : lon >= 60 ? 'asia' : lat >= 36 ? 'europe' : 'mea';
  const toU = ([lon, lat]) => [lon + 180, LAT0 - lat];

  // module state survives re-renders (language change, coming back to the tab)
  let ctx = null, lang = 'ja', host = null, el = {}, view = null, sel = null, reg = 'all', anim = 0, ro = null, raf = 0;
  const u = k => (UI[lang] || UI.en)[k] || UI.en[k];
  const D = id => window.ATLAS_MAP_DATA && window.ATLAS_MAP_DATA[id];
  const games = () => ctx.games.filter(g => D(g.id));
  const home = g => { const d = D(g.id); return d.p[d.h]; };
  const hasH = id => !!(window.Historia && Historia.has && Historia.has(id));
  const pick = (o, l) => o ? (o[l] != null ? o[l] : o.en) : '';

  /* ---------- view: centre (map units) + zoom (px per unit), clamped so the map always covers the box ---------- */
  function box() { return { w: el.map.clientWidth || 1, h: el.map.clientHeight || 1 }; }
  const zMin = () => box().w / W0;   // the whole world fits the width (the box is a little taller than the map: sea above and below)
  const zMax = () => zMin() * 9;
  function clamp(v) {
    const b = box(), z = Math.max(zMin(), Math.min(zMax(), v.z)), hw = b.w / 2 / z, hh = b.h / 2 / z;
    return { x: hw * 2 >= W0 ? W0 / 2 : Math.max(hw, Math.min(W0 - hw, v.x)), y: hh * 2 >= H0 ? H0 / 2 - 12 : Math.max(hh, Math.min(H0 - hh, v.y)), z };
  }
  const sx = (v, x) => (x - v.x) * v.z + box().w / 2, sy = (v, y) => (y - v.y) * v.z + box().h / 2;
  // the view that frames a set of points with a margin (pins near the edge still fit with their icon)
  function fit(pts, pad = 1.6) {
    const b = box(); if (!pts.length) return clamp({ x: W0 / 2, y: H0 / 2 - 8, z: 0 });
    const U = pts.map(toU), x0 = Math.min(...U.map(p => p[0])), x1 = Math.max(...U.map(p => p[0])), y0 = Math.min(...U.map(p => p[1])), y1 = Math.max(...U.map(p => p[1]));
    const w = Math.max(26, (x1 - x0) * pad + 14), h = Math.max(16, (y1 - y0) * pad + 12);
    return clamp({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: Math.min(b.w / w, b.h / h) });
  }
  function fly(to, ms = 650) {
    cancelAnimationFrame(anim); const from = { ...view }, t0 = performance.now();
    // zoom travels in log space so a big zoom-in doesn't rush at the start
    const step = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      view = clamp({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e) });
      draw(); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };

  /* ---------- drawing ---------- */
  function draw() {
    if (!host || !host.isConnected || !el.map) return;
    const b = box(), v = view, dpr = Math.min(2, window.devicePixelRatio || 1), cv = el.cv;
    if (cv.width !== Math.round(b.w * dpr) || cv.height !== Math.round(b.h * dpr)) { cv.width = Math.round(b.w * dpr); cv.height = Math.round(b.h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, b.w, b.h);
    const M = mask(window.HISTORIA_MAP_FINE, 'f') || mask(window.HISTORIA_MAP, 'c');
    if (M) {
      // dots stay the same size on screen; zooming in shows more of them (sharper coastlines with the fine mask)
      const P = b.w < 520 ? 7 : 8, r = P * .32;
      const x0 = v.x - b.w / 2 / v.z, y0 = v.y - b.h / 2 / v.z, ox = ((-x0 * v.z) % P + P) % P, oy = ((-y0 * v.z) % P + P) % P;
      g.fillStyle = '#e3cf9f'; g.beginPath();
      for (let y = oy + P / 2; y < b.h; y += P) {
        const lat = LAT0 - (y0 + y / v.z), row = Math.floor((M.lat0 - lat) / M.step); if (row < 0 || row >= M.nr) continue;
        for (let x = ox + P / 2; x < b.w; x += P) { const col = Math.floor((x0 + x / v.z) / M.step); if (col >= 0 && col < M.nc && M.g[row * M.nc + col]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); } }
      }
      g.fill();
    }
    placePins();
  }
  // pins: one per game at its home, pushed apart in screen space when they crowd (a short leader line keeps the true spot)
  function placePins() {
    const v = view, b = box(), list = games(), S = b.w < 520 ? 38 : 46;
    const A = list.map(g => { const [x, y] = toU(home(g)); return { g, ax: sx(v, x), ay: sy(v, y) }; });
    A.forEach(p => { p.x = p.ax; p.y = p.ay - S * .62; });
    for (let it = 0; it < 40; it++) {
      for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
        const p = A[i], q = A[j]; let dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); const need = S * .94;
        if (d >= need) continue; if (d < .01) { dx = (i % 2 ? 1 : -1) * .7; dy = .7; d = 1; }
        const k = (need - d) / 2 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k;
      }
      A.forEach(p => { p.x += (p.ax - p.x) * .04; p.y += (p.ay - S * .62 - p.y) * .04; });
    }
    let lines = '';
    A.forEach(p => {
      const e = el.pins.querySelector(`[data-g="${p.g.id}"]`); if (!e) return;
      const out = p.x < -S || p.x > b.w + S || p.y < -S || p.y > b.h + S;
      e.style.transform = `translate(${(p.x - S / 2).toFixed(1)}px,${(p.y - S / 2).toFixed(1)}px)`; e.style.visibility = out ? 'hidden' : '';
      const dim = reg !== 'all' && regionOf(home(p.g)) !== reg;
      e.classList.toggle('dim', dim && sel !== p.g.id); e.classList.toggle('on', sel === p.g.id);
      if (!out) lines += `<line x1="${p.ax.toFixed(1)}" y1="${p.ay.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${(p.y + S * .42).toFixed(1)}" class="${dim ? 'dim' : ''}"/><circle cx="${p.ax.toFixed(1)}" cy="${p.ay.toFixed(1)}" r="3" class="${dim ? 'dim' : ''}" style="--c:${p.g.color}"/>`;
    });
    el.svg.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`);
    el.svg.innerHTML = routeSvg() + `<g class="lead">${lines}</g>`;
  }
  // the selected game's journey: arcs between the stops, numbered dots and their names
  function routeSvg() {
    const d = sel && D(sel); if (!d) return '';
    const g = ctx.games.find(x => x.id === sel), v = view, P = d.p.map(p => { const [x, y] = toU(p); return [sx(v, x), sy(v, y)]; });
    const pins = pick(d.pn, lang) || [];
    const arcs = (d.r && d.r.length ? d.r : P.slice(1).map((_, i) => [i, i + 1])).map(([a, b]) => {
      const A = P[a], B = P[b]; if (!A || !B) return '';
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, k = .22 * L;
      return `<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}Q${(mx - dy / L * k).toFixed(1)} ${(my + dx / L * k - .1 * L).toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}"/>`;
    }).join('');
    const dots = P.map((p, i) => i === d.h ? '' : `<g class="stop"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5.5"/><text x="${(p[0] + 9).toFixed(1)}" y="${(p[1] + 4).toFixed(1)}">${esc(pins[i] || '')}</text></g>`).join('');
    return `<g class="route" style="--c:${g ? g.color : '#c48a4a'}">${arcs}${dots}</g>`;
  }

  /* ---------- the side card ---------- */
  function info() {
    const g = sel && ctx.games.find(x => x.id === sel), d = g && D(g.id);
    if (!g || !d) { el.info.innerHTML = `<div class="amempty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg><p>${esc(u('pick'))}</p></div>`; return; }
    const pins = pick(d.pn, lang) || [], order = d.p.map((_, i) => i);
    el.info.innerHTML = `<div class="amtop" style="--c:${g.color}"><span class="amart">${ctx.art(g)}</span><div><small class="round">${esc(ctx.no(g))}</small><b>${esc(ctx.gname(g))}</b></div></div>
      <div class="amfacts"><span><i>${esc(u('born'))}</i>${esc(pins[d.h] || '')}</span><span><i>${esc(u('era'))}</i>${esc(pick(d.era, lang))}</span></div>
      <div class="amstory"><h3>${esc(pick(d.t, lang))}</h3><p class="amd">${esc(pick(d.d, lang))}</p></div>
      ${pins.length > 1 ? `<div class="amjour"><i>${esc(u('route'))}</i><div>${order.map(i => `<span class="${i === d.h ? 'h' : ''}">${esc(pins[i] || '')}</span>`).join('<em>›</em>')}</div></div>` : ''}
      <div class="amacts"><button type="button" class="btn amplay" style="--c:${g.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>${esc(u('play'))}</button>
      ${hasH(g.id) ? `<button type="button" class="amhist" style="--c:${g.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z"/></svg>${esc(u('hist'))}</button>` : ''}</div>`;
    el.info.querySelector('.amplay').onclick = () => ctx.open(g.id, el.info.querySelector('.amart img'));
    const hb = el.info.querySelector('.amhist'); if (hb) hb.onclick = () => window.Historia.open(g.id);   // (opens the board view first, then the history over it)
  }
  function select(id, flyTo = true) {
    sel = id; info(); renderList();
    if (id && flyTo) { const d = D(id); fly(fit(d.p, 1.35)); } else redraw();
    if (id && innerWidth < 820) { const r = el.info.getBoundingClientRect(); if (r.top > innerHeight - 140) el.info.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  function setReg(k) {
    reg = k; if (sel && k !== 'all' && regionOf(home(ctx.games.find(g => g.id === sel))) !== k) { sel = null; info(); }
    renderChips(); renderList();
    const pts = games().filter(g => k === 'all' || regionOf(home(g)) === k).map(home);
    fly(k === 'all' ? fit([], 0) : fit(pts, 1.25));
  }

  /* ---------- chips + list ---------- */
  function renderChips() {
    const n = k => games().filter(g => k === 'all' || regionOf(home(g)) === k).length;
    el.chips.innerHTML = REG.map(k => `<button type="button" class="chip cat" data-r="${k}" aria-pressed="${reg === k}">${esc(u(k))}<em>${n(k)}</em></button>`).join('');
    el.chips.querySelectorAll('[data-r]').forEach(b => b.onclick = () => setReg(b.dataset.r));
  }
  function renderList() {
    const list = games().filter(g => reg === 'all' || regionOf(home(g)) === reg)
      .sort((a, b) => home(a)[0] - home(b)[0]);   // west → east, like reading the map
    el.list.innerHTML = list.map(g => { const d = D(g.id), pins = pick(d.pn, lang) || [];
      return `<button type="button" class="amrow${sel === g.id ? ' on' : ''}" data-g="${g.id}" style="--c:${g.color}"><span class="amart">${ctx.art(g)}</span><span class="tx"><b>${esc(ctx.gname(g))}</b><small>${esc(pins[d.h] || '')} · ${esc(pick(d.era, lang))}</small></span></button>`; }).join('');
    el.list.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { select(b.dataset.g); if (innerWidth < 820) el.map.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }

  /* ---------- input: drag, wheel, pinch, double-tap; a short tap on a pin selects it ---------- */
  function bind() {
    const m = el.map, pts = new Map(); let st = null, moved = 0;
    const at = e => { const r = m.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const zoomAt = (px, py, k, v0 = view) => { const b = box(), nz = Math.max(zMin(), Math.min(zMax(), v0.z * k)), mx = v0.x + (px - b.w / 2) / v0.z, my = v0.y + (py - b.h / 2) / v0.z;
      return clamp({ x: mx - (px - b.w / 2) / nz, y: my - (py - b.h / 2) / nz, z: nz }); };
    m.addEventListener('pointerdown', e => {
      if (e.target.closest('.amzoom')) return;
      cancelAnimationFrame(anim); pts.set(e.pointerId, at(e)); moved = 0;
      const a = [...pts.values()]; st = { v: { ...view }, a: a.map(p => p.slice()), d: a.length > 1 ? Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0 };
      m.classList.add('grab');
    });
    m.addEventListener('pointermove', e => {
      if (!st || !pts.has(e.pointerId)) return; pts.set(e.pointerId, at(e));
      const a = [...pts.values()];
      if (a.length > 1 && st.a.length > 1) {
        const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), c0 = [(st.a[0][0] + st.a[1][0]) / 2, (st.a[0][1] + st.a[1][1]) / 2], c = [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2];
        const v = zoomAt(c0[0], c0[1], d / (st.d || 1), st.v); view = clamp({ x: v.x - (c[0] - c0[0]) / v.z, y: v.y - (c[1] - c0[1]) / v.z, z: v.z }); moved = 99;
      } else {
        const dx = a[0][0] - st.a[0][0], dy = a[0][1] - st.a[0][1]; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved > 4) { m.setPointerCapture && m.setPointerCapture(e.pointerId); view = clamp({ x: st.v.x - dx / st.v.z, y: st.v.y - dy / st.v.z, z: st.v.z }); }
      }
      redraw();
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); m.classList.remove('grab');
      if (moved <= 4 && !pts.size) { const p = e.target.closest && e.target.closest('.ampin'); if (p) select(p.dataset.g === sel ? null : p.dataset.g, p.dataset.g !== sel); }
      if (!pts.size) st = null; else { const a = [...pts.values()]; st = { v: { ...view }, a, d: 0 }; }
    };
    m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
    m.addEventListener('wheel', e => { e.preventDefault(); cancelAnimationFrame(anim); const [x, y] = at(e); view = zoomAt(x, y, Math.exp(-e.deltaY * .0016)); redraw(); }, { passive: false });
    m.addEventListener('dblclick', e => { if (e.target.closest('.ampin,.amzoom')) return; const [x, y] = at(e); fly(zoomAt(x, y, 2), 380); });
    // keyboard: pins are buttons (Enter selects); arrows pan, +/- zoom when the map has focus
    m.addEventListener('keydown', e => {
      const k = e.key, b = box(), st2 = 60 / view.z;
      if (k === 'Enter' && e.target.closest('.ampin')) { const id = e.target.closest('.ampin').dataset.g; select(id === sel ? null : id, id !== sel); e.preventDefault(); return; }
      const mv = { ArrowLeft: [-st2, 0], ArrowRight: [st2, 0], ArrowUp: [0, -st2], ArrowDown: [0, st2] }[k];
      if (mv) { view = clamp({ ...view, x: view.x + mv[0], y: view.y + mv[1] }); redraw(); e.preventDefault(); }
      else if (k === '+' || k === '=') { fly(zoomAt(b.w / 2, b.h / 2, 1.6), 260); e.preventDefault(); }
      else if (k === '-') { fly(zoomAt(b.w / 2, b.h / 2, 1 / 1.6), 260); e.preventDefault(); }
    });
    el.zoom.querySelector('[data-z="in"]').onclick = () => { const b = box(); fly(zoomAt(b.w / 2, b.h / 2, 1.7), 320); };
    el.zoom.querySelector('[data-z="out"]').onclick = () => { const b = box(); fly(zoomAt(b.w / 2, b.h / 2, 1 / 1.7), 320); };
    el.zoom.querySelector('[data-z="all"]').onclick = () => { sel = null; info(); renderList(); reg = 'all'; renderChips(); renderList(); fly(fit([], 0)); };
  }

  /* ---------- entry ---------- */
  function render(sec, c) {
    ctx = c; lang = UI[c.lang] ? c.lang : 'en';
    if (host !== sec || !sec.querySelector('.ammap')) {
      host = sec;
      sec.innerHTML = `<div class="amhead"><h2 class="h" id="amTtl"></h2><p class="amsub" id="amSub"></p></div>
        <div class="chips cats amreg" id="amReg"></div>
        <div class="amwrap"><div class="card ammap" id="amMap" dir="ltr" tabindex="0"><canvas></canvas><svg class="amsvg" aria-hidden="true"></svg><div class="ampins"></div>
          <div class="amzoom"><button type="button" data-z="in" aria-label="+">+</button><button type="button" data-z="out" aria-label="−">−</button><button type="button" data-z="all"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/></svg></button></div>
          <p class="amhint" id="amHint"></p><p class="amload" id="amLoad"></p></div>
          <aside class="card aminfo" id="amInfo" aria-live="polite"></aside></div>
        <div class="amlist" id="amList"></div>`;
      el = { map: sec.querySelector('#amMap'), cv: sec.querySelector('#amMap canvas'), svg: sec.querySelector('.amsvg'), pins: sec.querySelector('.ampins'), zoom: sec.querySelector('.amzoom'),
        info: sec.querySelector('#amInfo'), chips: sec.querySelector('#amReg'), list: sec.querySelector('#amList') };
      bind();
      if (ro) ro.disconnect(); ro = new ResizeObserver(() => { if (view) { view = clamp(view); draw(); } }); ro.observe(el.map);
    }
    sec.querySelector('#amTtl').textContent = u('title'); sec.querySelector('#amSub').textContent = u('sub');
    sec.querySelector('#amHint').textContent = u('hint'); sec.querySelector('[data-z="all"]').setAttribute('aria-label', u('reset')); sec.querySelector('[data-z="all"]').title = u('reset');
    const ld = sec.querySelector('#amLoad'); ld.textContent = u('load'); ld.hidden = !!window.ATLAS_MAP_DATA;
    ensure().then(() => {
      if (!host || !host.isConnected) return; ld.hidden = true;
      el.pins.innerHTML = games().map(g => `<button type="button" class="ampin" data-g="${g.id}" style="--c:${g.color}" aria-label="${esc(ctx.gname(g))}" title="${esc(ctx.gname(g))}">${ctx.art(g)}</button>`).join('');
      if (!view) { view = fit([], 0); }
      view = clamp(view); renderChips(); renderList(); info(); draw();
      if (!fineP) fineP = load('historia/map-fine.js?v=6').then(redraw);
    });
  }
  window.AtlasMap = { render, regionOf };
})();
