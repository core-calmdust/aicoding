/* World Board Game Atlas — ヒストリア (Historia): an animated encyclopedia of each game, opened from the board view.
   The live 3D board stays on stage (above the page on phones, beside it on wide screens), the game's guide character
   narrates each chapter in a speech bubble, and the chapters animate in like a motion-graphics explainer.
   Content is lazy-loaded per game: historia/s/<id>.json (language-neutral visuals: map pins, board diagrams)
   and historia/<lang>/<id>.json (text). The world dot map (historia/map.js) loads on the first open.
   app.js calls Historia.sync(game, lang) when a board opens, and defers its stage framing to Historia.fit() while open. */
(function () {
  'use strict';
  const V = 6;                       // data version (bump when historia/*.json change)
  const BGM_SRC = 'historia/bgm.mp3', BGM_VOL = .28;
  const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
  const UI = {
    ja: { btn: 'ヒストリア', sub: 'このゲームの歴史', close: '閉じる', prev: '前へ', next: '次へ', load: '頁をひらいています…', fail: '読み込めませんでした', bgm: 'BGM', back: '盤にもどる', again: 'はじめから', tap: 'タップでめくる', src: '年代には諸説あります' },
    en: { btn: 'Historia', sub: 'The story of this game', close: 'Close', prev: 'Previous', next: 'Next', load: 'Opening the pages…', fail: 'Could not load', bgm: 'Music', back: 'Back to the board', again: 'From the start', tap: 'Tap to flip', src: 'Some dates are disputed' },
    zh: { btn: '历史', sub: '这款游戏的故事', close: '关闭', prev: '上一页', next: '下一页', load: '正在翻开书页…', fail: '无法加载', bgm: '音乐', back: '回到棋盘', again: '从头开始', tap: '点击翻面', src: '部分年代存在争议' },
    ko: { btn: '히스토리아', sub: '이 게임의 역사', close: '닫기', prev: '이전', next: '다음', load: '페이지를 펼치는 중…', fail: '불러오지 못했습니다', bgm: '음악', back: '판으로 돌아가기', again: '처음부터', tap: '탭해서 뒤집기', src: '연대에는 여러 설이 있습니다' },
    es: { btn: 'Historia', sub: 'La historia de este juego', close: 'Cerrar', prev: 'Anterior', next: 'Siguiente', load: 'Abriendo las páginas…', fail: 'No se pudo cargar', bgm: 'Música', back: 'Volver al tablero', again: 'Desde el inicio', tap: 'Toca para girar', src: 'Algunas fechas son discutidas' },
    fr: { btn: 'Historia', sub: "L'histoire de ce jeu", close: 'Fermer', prev: 'Précédent', next: 'Suivant', load: 'Ouverture des pages…', fail: 'Chargement impossible', bgm: 'Musique', back: 'Retour au plateau', again: 'Depuis le début', tap: 'Touchez pour retourner', src: 'Certaines dates sont discutées' },
    pt: { btn: 'Historia', sub: 'A história deste jogo', close: 'Fechar', prev: 'Anterior', next: 'Próximo', load: 'Abrindo as páginas…', fail: 'Não foi possível carregar', bgm: 'Música', back: 'Voltar ao tabuleiro', again: 'Do início', tap: 'Toque para virar', src: 'Algumas datas são discutidas' },
    de: { btn: 'Historia', sub: 'Die Geschichte des Spiels', close: 'Schließen', prev: 'Zurück', next: 'Weiter', load: 'Seiten werden aufgeschlagen…', fail: 'Konnte nicht geladen werden', bgm: 'Musik', back: 'Zurück zum Brett', again: 'Von vorn', tap: 'Zum Umdrehen tippen', src: 'Manche Daten sind umstritten' },
    hi: { btn: 'हिस्टोरिया', sub: 'इस खेल की कहानी', close: 'बंद करें', prev: 'पिछला', next: 'अगला', load: 'पन्ने खुल रहे हैं…', fail: 'लोड नहीं हो सका', bgm: 'संगीत', back: 'बोर्ड पर लौटें', again: 'शुरू से', tap: 'पलटने के लिए टैप करें', src: 'कुछ तिथियों पर मतभेद है' },
    ar: { btn: 'هيستوريا', sub: 'حكاية هذه اللعبة', close: 'إغلاق', prev: 'السابق', next: 'التالي', load: 'جارٍ فتح الصفحات…', fail: 'تعذّر التحميل', bgm: 'الموسيقى', back: 'العودة إلى اللوحة', again: 'من البداية', tap: 'المس للقلب', src: 'بعض التواريخ مختلف عليها' },
  };
  // the guide who narrates each game: the game's own Atlas Mon where it has one, else a plush avatar that suits it
  const GUIDE = { shogi: 'm-shogi', chess: 'm-knight', reversi: 'm-disc', sudoku: 'm-tile', speedsudoku: 'av/tile-2', samegame: 'av/hippo-0', jailbreak: 'av/mole-0',
    poker: 'av/joker-0', baccarat: 'av/joker-1', blackjack: 'av/joker-2', solitaire: 'av/ghost-0', checkers: 'm-crab', ugolki: 'av/daruma-0', agon: 'av/teddy-0', fanorona: 'av/monkey-0',
    alquerque: 'av/camel-0', xiangqi: 'av/ryuou-0', tafl: 'av/seal-0', go: 'av/goke-0', gomoku: 'm-stone', dots: 'm-dot', connect4: 'm-plop', mancala: 'm-gem',
    backgammon: 'm-dice', morris: 'm-owl', hex: 'av/bee-0', ur: 'av/goat-0' };
  const guideSrc = id => '../images/atlas/' + (GUIDE[id] || 'm-tile') + '.webp';
  const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z"/><path d="M7 8h2M15 8h2M7 11h2M15 11h2"/></svg>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);
  const phone = () => innerWidth < 820;
  let lang = 'ja', game = null, ctx = null, root = null, on = false, data = null, idx = 0, busy = 0, tok = 0;
  const u = k => (UI[lang] || UI.en)[k] || UI.en[k];
  const rtl = () => lang === 'ar';
  // light game colours (poker's silver…) are deepened so white text on them stays readable
  function deep(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    const n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255], L = (c[0] * .299 + c[1] * .587 + c[2] * .114) / 255;
    if (L < .62) return hex;
    const k = Math.min(.45, (L - .5) * 1.4);
    return '#' + c.map(v => Math.round(v * (1 - k) + 60 * k).toString(16).padStart(2, '0')).join('');
  }

  /* ---------- entry button (in the board view, top-left of the 3D scene) ---------- */
  // the games that have a history (historia/s/<id>.json); a newer game without one shows no ヒストリア button
  const IDS = new Set('agon alquerque baccarat backgammon blackjack checkers chess connect4 dots fanorona go gomoku hex jailbreak mancala morris poker reversi samegame shogi solitaire speedsudoku sudoku tafl ugolki ur xiangqi'.split(' ')), has = id => IDS.has(id);
  function sync(g, l, c) {
    game = g; lang = LANGS.includes(l) ? l : 'en'; if (c) ctx = c;
    const b = $('bvHist'); if (!b) return;
    const ok = has(g.id); b.style.display = ok ? '' : 'none'; if (!ok) { const t = document.querySelector('#bvi .L .tags .hstag'); if (t) t.remove(); return; }
    b.innerHTML = `<span class="hb-ic">${BOOK}</span><span class="hb-tx"><b>${esc(u('btn'))}</b><small>${esc(u('sub'))}</small></span>`;
    b.setAttribute('aria-label', u('btn') + ' — ' + u('sub'));
    b.style.setProperty('--gc', g.color || '#c48a4a');
    b.onclick = () => open();   // (the board on the table is this game: Historia frames it)
    // PC: the entry sits in the board card, leading the feature-tag row (the top-left pill is hidden there in CSS)
    const tags = document.querySelector('#bvi .L .tags');
    if (tags && matchMedia(PC_Q).matches && !tags.querySelector('.hstag')) {
      const t = document.createElement('button'); t.type = 'button'; t.className = 'hstag';
      t.style.setProperty('--gc', g.color || '#c48a4a');
      t.innerHTML = `<span class="hb-ic">${BOOK}</span><b>${esc(u('btn'))}</b><small>${esc(u('sub'))}</small><i class="hs-arw" aria-hidden="true"></i>`;
      t.setAttribute('aria-label', u('btn') + ' — ' + u('sub'));
      t.onclick = () => open();
      tags.prepend(t);
    }
  }
  const PC_Q = '(hover: hover) and (pointer: fine) and (min-width: 820px)';

  /* ---------- loading ---------- */
  const cache = {};
  function getJSON(url) { if (!cache[url]) cache[url] = fetch(url + '?v=' + V).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { delete cache[url]; throw e; }); return cache[url]; }
  function loadText(id) { return getJSON(`historia/${lang}/${id}.json`).catch(() => getJSON(`historia/en/${id}.json`)).catch(() => getJSON(`historia/ja/${id}.json`)); }
  let mapP = null;
  function loadMap() { if (window.HISTORIA_MAP) return Promise.resolve(); if (!mapP) mapP = new Promise(res => { const s = document.createElement('script'); s.src = 'historia/map.js?v=' + V; s.onload = res; s.onerror = res; document.head.appendChild(s); }); return mapP; }
  /* ---------- BGM (lazy; the portal's sound switch + our own mute) ---------- */
  let bgm = null, bgmFade = 0;
  const muted = () => { try { return localStorage.getItem('atlas-hist-bgm') === '0'; } catch (e) { return false; } };
  const soundOn = () => !(window.Atlas && Atlas.sfxOn && !Atlas.sfxOn());
  function fadeTo(v, ms, done) {
    if (!bgm) return; cancelAnimationFrame(bgmFade);
    const a = bgm, v0 = a.volume, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / ms); try { a.volume = Math.max(0, Math.min(1, v0 + (v - v0) * k)); } catch (e) {} if (k < 1) bgmFade = requestAnimationFrame(step); else if (done) done(); };
    bgmFade = requestAnimationFrame(step);
  }
  function bgmStart() {
    if (!soundOn() || muted()) return;
    try {
      if (!bgm) { bgm = new Audio(); bgm.loop = true; bgm.preload = 'auto'; bgm.volume = 0; bgm.addEventListener('error', () => { bgm = null; }); bgm.src = BGM_SRC; }
      bgm.volume = Math.min(bgm.volume, BGM_VOL);
      const p = bgm.play(); if (p && p.catch) p.catch(() => {});
      fadeTo(BGM_VOL, 1500);
    } catch (e) { bgm = null; }
  }
  function bgmStop(ms = 1000) { if (!bgm) return; const a = bgm; fadeTo(0, ms, () => { try { a.pause(); } catch (e) {} }); }
  function paintMute() { const b = root && root.querySelector('.hs-mute'); if (!b) return; const off = muted() || !soundOn(); b.classList.toggle('off', off); b.setAttribute('aria-pressed', off ? 'false' : 'true'); b.title = u('bgm'); }

  /* ---------- open / close ---------- */
  function build() {
    root = document.createElement('div'); root.className = 'hs'; root.id = 'hist'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.innerHTML = `<div class="hs-stage"><div class="hs-hero" aria-hidden="true"><img alt=""></div><div class="hs-guide"><img alt="" decoding="async"><div class="hs-bub" aria-live="polite"><span></span><i class="ghost" aria-hidden="true"></i></div></div></div>
      <div class="hs-top"><button type="button" class="hs-mute" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V6l11-2v11"/><circle cx="6.5" cy="17" r="2.5"/><circle cx="17.5" cy="15" r="2.5"/><path class="sl" d="M3 3l18 18"/></svg></button><button type="button" class="hs-x"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <section class="hs-panel"><header class="hs-hd"><span class="hs-gi"></span><span class="hs-gn"></span><span class="hs-no"></span></header><div class="hs-pages"></div>
      <nav class="hs-nav"><button type="button" class="hs-pv"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg></button><div class="hs-dots"></div><button type="button" class="hs-nx"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></nav></section>`;
    document.body.appendChild(root);
    root.querySelector('.hs-x').onclick = close;
    root.querySelector('.hs-pv').onclick = () => go(idx - 1);
    root.querySelector('.hs-nx').onclick = () => go(idx + 1);
    root.querySelector('.hs-dots').onclick = e => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); };
    root.querySelector('.hs-mute').onclick = () => { const m = !muted(); try { localStorage.setItem('atlas-hist-bgm', m ? '0' : '1'); } catch (e) {} if (m) bgmStop(400); else bgmStart(); paintMute(); };
    root.querySelector('.hs-guide').onclick = () => { const g = root.querySelector('.hs-guide'); g.classList.remove('hop'); void g.offsetWidth; g.classList.add('hop'); };
    // swipe between chapters (horizontal flicks; vertical drags still scroll the page)
    let s0 = null; const pn = root.querySelector('.hs-panel');
    root.addEventListener('pointerdown', e => { if (e.target.closest('button,a')) return; s0 = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    root.addEventListener('pointerup', e => { if (!s0 || e.pointerId !== s0.id) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y, dt = performance.now() - s0.t; s0 = null;
      if (dt < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.6) go(idx + ((dx < 0) !== rtl() ? 1 : -1)); });
    root.addEventListener('pointercancel', () => { s0 = null; });
    pn.addEventListener('click', e => { const f = e.target.closest('.hs-flip'); if (f) f.classList.toggle('on'); const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'back') close(); else go(0); } });
  }
  // open() from the board view's button, or open('ugolki') from anywhere (the game list): when that game is not the board
  // on the table, Historia runs "solo" over its own backdrop with the game's icon on stage (no 3D needed)
  const artOf = g => ctx && ctx.art ? ctx.art(g) : '../images/atlas/' + g.id + '.webp';
  const nameOf = g => ctx && ctx.name && game === g ? ctx.name(g) : (g.name && (g.name[lang] || g.name.en)) || g.id;
  let solo = false, bodyOv = '', fromList = false, swapT = 0;
  function open(id) {
    if (on) { if (typeof id !== 'string' || (game && game.id === id)) return; close(true); }
    if (typeof id === 'string') {
      const G = window.Atlas && Atlas.GAMES && Atlas.GAMES.find(x => x.id === id); if (!G || !has(id)) return;
      const bv = $('bv'), onBoard = bv && bv.classList.contains('on') && !bv.classList.contains('playing') && game && game.id === id;
      if (!onBoard) { let l = lang; try { l = localStorage.getItem('aicoding-lang') || (navigator.language || 'ja').slice(0, 2); } catch (e) {} lang = LANGS.includes(l) ? l : 'en'; game = G; }
      solo = !onBoard; fromList = false;
      // a game with a 3D board: open its board view first (the same path as tapping it), then Historia over it
      if (!onBoard && window.AtlasBoard && window.Table3D && Table3D.MODELS && Table3D.MODELS[id]) {
        try { AtlasBoard.open(id); } catch (e) {}
        if (game && game.id === id && $('bv') && $('bv').classList.contains('on') && Table3D.ok && Table3D.ok()) { solo = false; fromList = true; }
        else if ($('bv') && $('bv').classList.contains('on')) { fromList = true; }
      }
    } else { solo = false; fromList = false; }
    if (!game) return;
    if (!root) build();
    const g = game, my = ++tok; on = true; data = null; idx = 0;
    root.classList.toggle('solo', solo);
    if (solo) { bodyOv = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    root.dir = rtl() ? 'rtl' : 'ltr'; root.lang = lang;
    root.style.setProperty('--gc', deep(g.color || '#c48a4a'));
    // games without a 3D board on the table (cards, puzzles): their icon floats over the empty table instead
    has3D = !solo && !!(window.Table3D && Table3D.MODELS && Table3D.MODELS[g.id] && (!Table3D.ok || Table3D.ok()));
    root.classList.toggle('no3d', !has3D);
    root.querySelector('.hs-hero img').src = !has3D ? artOf(g) : '';
    root.querySelector('.hs-x').setAttribute('aria-label', u('close')); root.querySelector('.hs-pv').setAttribute('aria-label', u('prev')); root.querySelector('.hs-nx').setAttribute('aria-label', u('next'));
    root.querySelector('.hs-mute').setAttribute('aria-label', u('bgm'));
    root.querySelector('.hs-gi').innerHTML = `<img src="${esc(artOf(g))}" alt="">`;
    root.querySelector('.hs-gn').textContent = nameOf(g);
    root.querySelector('.hs-no').textContent = '';
    root.querySelector('.hs-guide img').src = guideSrc(g.id);
    root.querySelector('.hs-dots').innerHTML = '';
    root.querySelector('.hs-pages').innerHTML = `<div class="hs-load"><i></i><i></i><i></i><span>${esc(u('load'))}</span></div>`;
    say('');
    root.classList.remove('out'); root.classList.add('on');
    setTimeout(() => { if (on) document.documentElement.classList.add('hs-open'); }, 600);   // (once the overlay covers it: the page underneath stops painting)
    if (!solo) { const bv = $('bv'); if (bv) bv.classList.add('hist'); shift(); requestAnimationFrame(() => { fit(); }); gallery(true, g); }
    if (fromList && has3D) loading3d(g.id);
    paintMute(); bgmStart();
    Promise.all([getJSON(`historia/s/${g.id}.json`), loadText(g.id), loadMap()]).then(([s, t]) => {
      if (my !== tok || !on) return;
      data = { s, t, ch: chapters(s, t) };
      root.querySelector('.hs-dots').innerHTML = data.ch.map((c, i) => `<button type="button" data-i="${i}" aria-label="${i + 1}"><i></i></button>`).join('');
      root.querySelector('.hs-pages').innerHTML = '';
      go(0, true);
    }).catch(() => { if (my !== tok) return; root.querySelector('.hs-pages').innerHTML = `<div class="hs-load err"><span>${esc(u('fail'))}</span></div>`; });
  }
  function close(swap) {
    if (!on) return; on = false; tok++;
    if (window.Table3D && Table3D.quiet) Table3D.quiet(false);
    root.classList.remove('on'); if (!swap) root.classList.add('out');
    document.documentElement.classList.remove('hs-open');
    bgmStop(swap ? 200 : 1000);
    clearTimers();
    if (solo) { document.body.style.overflow = bodyOv; if (fromList && window.AtlasBoard) { fromList = false; setTimeout(() => AtlasBoard.close(), 0); } }
    else if (fromList) {   // opened from the game list: the whole board view (museum and all) fades straight back to the list —
      // the room is never shown; it is put back silently once the board view is gone, ready for the next board
      fromList = false; const bv = $('bv'); clearTimeout(swapT);
      if (bv) { bv.style.transition = 'opacity .32s ease'; bv.style.opacity = '0'; }
      setTimeout(() => {
        if (on) { if (bv) { bv.style.opacity = ''; bv.style.transition = ''; } return; }
        if (window.AtlasBoard) AtlasBoard.close();
        if (bv) bv.classList.remove('hist', 'hsdim');
        if (window.Table3D && Table3D.setShift) Table3D.setShift(0);
        cam(false); gallery(false, null, true);
        requestAnimationFrame(() => { if (bv) { bv.style.opacity = ''; bv.style.transition = ''; } });
      }, 340);
    }
    else {
      gallery(false);
      const bv = $('bv'); if (bv) bv.classList.remove('hist');
      if (window.Table3D && Table3D.setShift) Table3D.setShift(0);
      cam(false);
      if (ctx && ctx.fit) ctx.fit(); else if (window.Table3D && Table3D.setInset) Table3D.setInset(0);
      const b = $('bvHist'); if (b && !swap) try { b.focus({ preventScroll: true }); } catch (e) {}
    }
    setTimeout(() => { if (!on && root) { root.classList.remove('out'); root.querySelector('.hs-pages').innerHTML = ''; } }, 420);
  }
  // the 3D room becomes a museum gallery while Historia is open (Table3D.museum), swapped behind a quick fade through dark
  function gallery(onG, g, instant) {
    if (!window.Table3D || !Table3D.museum || (Table3D.ok && !Table3D.ok())) return;
    const bv = $('bv'); clearTimeout(swapT);
    const t = { title: g ? nameOf(g) : '', sub: g ? (g.name && g.name.en && lang !== 'en' ? g.name.en.toUpperCase() : 'WORLD BOARD GAME ATLAS') : '' };
    if (instant || !bv) { Table3D.museum(onG, t); if (bv) bv.classList.remove('hsdim'); return; }
    bv.classList.add('hsdim');
    swapT = setTimeout(() => { try { Table3D.museum(onG, t); } catch (e) {} requestAnimationFrame(() => bv.classList.remove('hsdim')); }, 260);
  }
  // opened from the game list: a shimmer on the stage while the board's textures are generated
  function loading3d(id) {
    const st = root.querySelector('.hs-stage'); st.classList.add('ld3d');
    const done = () => st.classList.remove('ld3d');
    const TG = window.AtlasTexGen; let p = null;
    try { p = TG && TG.idle ? TG.idle([id]) : null; } catch (e) {}
    Promise.race([p || new Promise(r => setTimeout(r, 1200)), new Promise(r => setTimeout(r, 5000))]).then(() => setTimeout(done, 450));
  }
  // the board's framing while open: phones frame it in the stage above the page; wide screens keep it full height (the canvas is shifted right in CSS)
  // the stage's final geometry for the layout the chapter is going to (phones): measured with transitions off, then the layout
  // goes back and animates there as usual — so the camera can head for its final framing from the first frame
  function finalRects(rd, top) {
    const st = root.querySelector('.hs-stage'), g = root.querySelector('.hs-guide'), was = [root.classList.contains('read'), root.classList.contains('top')];
    root.classList.add('snap'); root.classList.toggle('read', rd); root.classList.toggle('top', top);
    const r = st.getBoundingClientRect(), gt = g ? g.getBoundingClientRect().top : r.bottom;
    root.classList.toggle('read', was[0]); root.classList.toggle('top', was[1]); void root.offsetHeight; root.classList.remove('snap'); void root.offsetHeight;
    root.classList.toggle('read', rd); root.classList.toggle('top', top);
    return { r, gt };
  }
  function fit(pre) {
    if (!on || solo || !root || !window.Table3D || !Table3D.setInset) return;
    if (phone()) {
      const st = root.querySelector('.hs-stage'), g = root.querySelector('.hs-guide'), r = pre ? pre.r : st.getBoundingClientRect(), gt = pre ? pre.gt : g ? g.getBoundingClientRect().top : r.bottom;
      // the top-down board view: the guide and its bubble sit in a strip at the bottom of the stage, and the board is framed above it
      const keep = camTop && g ? Math.max(0, Math.min(r.height * .4, r.bottom - gt + 4)) : 0;
      Table3D.setInset(Math.max(0, innerHeight - r.bottom + keep));
    }
    else Table3D.setInset(0);
  }
  // wide screens: the canvas slides away from the page so the board sits in the free part of the screen
  function shift() {   // (a shift lens in Table3D: the canvas stays put and fills the screen, the picture moves into the free part)
    if (!window.Table3D || !Table3D.setShift) return;
    const pn = root && root.querySelector('.hs-panel'); if (phone() || !pn) { Table3D.setShift(0); return; }
    const L = pn.offsetLeft, R = L + pn.offsetWidth; Table3D.setShift(rtl() ? -(innerWidth - L) / 2 : R / 2);   // (layout box: the panel's slide-in transform is ignored)
  }
  addEventListener('resize', () => { if (on) { shift(); fit(); } });
  // the 3D camera per chapter: the showcase turntable, or straight down onto the board for the board chapter
  let camTop = false, has3D = true;
  // the camera move: the final layout (stage size, the guide's strip) is settled first and the framing computed from it, so the
  // camera goes in one move straight to where it ends — nothing is re-fitted after it lands
  function cam(top, rd) {
    if (!has3D) top = false;
    const lay = root && rd !== undefined && phone() ? finalRects(rd, !!top) : null;
    if (!lay && root && rd !== undefined) root.classList.toggle('read', rd);
    if (!window.Table3D || !Table3D.play || (Table3D.ok && !Table3D.ok()) || solo) { if (root) root.classList.toggle('top', !!top); return; }
    if (top === camTop) { if (lay) fit(lay); return; }
    camTop = top;
    if (root) root.classList.toggle('top', !!top);
    fit(lay);
    try { Table3D.play(!!top, { glide: 800, ortho: true }); } catch (e) {}
  }

  /* ---------- keyboard ---------- */
  addEventListener('keydown', e => {
    if (!on) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'PageDown' || k === 'PageUp' || k === ' ') {
      e.preventDefault(); e.stopImmediatePropagation();
      const f = k === 'PageDown' || k === ' ' || (k === 'ArrowRight') !== rtl() && k.startsWith('Arrow');
      go(idx + (f ? 1 : -1)); return;
    }
    if (k === 'Home') { e.preventDefault(); e.stopImmediatePropagation(); go(0); }
    if (k === 'End' && data) { e.preventDefault(); e.stopImmediatePropagation(); go(data.ch.length - 1); }
  }, true);

  /* ---------- the guide's speech bubble (typed in) ---------- */
  let sayT = 0;
  function say(s) {
    const b = root.querySelector('.hs-bub'), sp = b.querySelector('span'), gh = b.querySelector('.ghost'); clearInterval(sayT);
    gh.textContent = s || '';   // (an invisible copy of the whole line: the bubble takes its final size at once while the text types in)
    if (!s) { b.classList.remove('on'); sp.textContent = ''; return; }
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    const g = root.querySelector('.hs-guide'); g.classList.remove('hop'); void g.offsetWidth; g.classList.add('hop');
    // scripts that join letters (Arabic, Devanagari) fade in whole; others are typed
    if (lang === 'ar' || lang === 'hi') { sp.textContent = s; sp.classList.remove('typing'); return; }
    const chars = [...s]; let n = 0; sp.textContent = ''; sp.classList.add('typing');
    sayT = setInterval(() => { n += lang === 'ja' || lang === 'zh' || lang === 'ko' ? 1 : 2; sp.textContent = chars.slice(0, n).join(''); if (n >= chars.length) { clearInterval(sayT); sp.classList.remove('typing'); } }, 34);
  }

  /* ---------- chapters ---------- */
  function chapters(s, t) {
    const L = [Object.assign({ k: 'hook' }, t.hook)];
    (t.ch || []).forEach(c => L.push(c));
    return L;
  }
  const timers = [];
  let pageAC = null;
  function later(f, ms) { timers.push(setTimeout(f, ms)); }
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }
  function go(i, first) {
    if (!data) return;
    const n = data.ch.length; i = Math.max(0, Math.min(n - 1, i));
    if (i === idx && !first) return;
    const dir = first ? 1 : i > idx ? 1 : -1; idx = i; clearTimers();
    if (pageAC) pageAC.abort(); pageAC = new AbortController();   // (the outgoing page's window listeners go with it)
    const P = root.querySelector('.hs-pages'), old = P.querySelector('.hs-pg:not(.leave)');
    if (old) { old.classList.add('leave', dir > 0 ? 'l' : 'r'); setTimeout(() => old.remove(), 420); }
    const c = data.ch[i], pg = document.createElement('article'); pg.className = 'hs-pg k-' + c.k + (dir > 0 ? ' fr' : ' fl');
    pg.innerHTML = page(c, i);
    P.appendChild(pg); P.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { pg.classList.add('in'); run(pg, c); }));
    root.querySelectorAll('.hs-dots button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
    root.querySelector('.hs-no').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    root.querySelector('.hs-pv').disabled = i === 0; root.querySelector('.hs-nx').disabled = i === n - 1;
    later(() => say(c.say || ''), 380);
    // the bubble takes the size of its coming line now (an invisible copy), so the layout below is already the final one
    { const gh = root.querySelector('.hs-bub .ghost'); if (gh) gh.textContent = c.say || ''; }
    // phones: the reading chapters give the page more of the screen (the 3D stage shrinks), the visual ones give it back
    const rd = !['hook', 'board', 'end'].includes(c.k);
    cam(c.k === 'board', rd);
    if (window.Table3D && Table3D.quiet) Table3D.quiet(phone() && (rd || c.k === 'board') && !solo);   // (the top-down board view is still too: drawn when it moves)
  }
  // splits a title into letters (or words, for joined scripts) that rise in one after another
  function kin(s, d0 = 0) {
    const joined = lang === 'ar' || lang === 'hi';
    const parts = joined ? String(s).split(/(\s+)/) : [...String(s)];
    return parts.map((p, i) => /^\s+$/.test(p) ? p : `<span class="ki" style="--d:${d0 + i * (joined ? 70 : 28)}ms">${esc(p)}</span>`).join('');
  }
  const st = (i, base = 0, gap = 90) => `style="--d:${base + i * gap}ms"`;
  function page(c, i) {
    const head = `<div class="hs-kick"><span>${String(i + 1).padStart(2, '0')}</span><i></i></div><h2 class="hs-h">${kin(c.t || '')}</h2>`;
    const P = (c.p || []).map((x, j) => `<p class="rv" ${st(j, 380)}>${esc(x)}</p>`).join('');
    switch (c.k) {
      case 'hook': return `<div class="hk-art rv" ${st(0, 0)}><img src="${esc(artOf(game))}" alt=""></div><h2 class="hs-h hk-h">${kin(c.title || nameOf(game), 100)}</h2>
        <div class="hk-num rv" ${st(0, 420)}>${c.pre ? `<span class="pre">${esc(c.pre)}</span>` : ''}<b class="cnt" data-n="${esc(c.n)}">0</b>${c.unit ? `<span class="unit">${esc(c.unit)}</span>` : ''}</div>
        <p class="hk-line rv" ${st(0, 700)}>${esc(c.line || '')}</p>${(c.p || []).map((x, j) => `<p class="rv" ${st(j, 900)}>${esc(x)}</p>`).join('')}${hkFacts()}`;
      case 'origin': { const S = c.st && data.s.map && data.s.map.st ? c.st : null;
        return head + `<figure class="hs-map rv${S ? ' steps' : ''}" ${st(0, 200)}>${mapSvg(data.s.map, c.pins || [], !!S)}</figure>` + (S ? `<ol class="hs-st">${S.map((x, j) => `<li class="rv" data-i="${j}" ${st(j, 500, 110)}><button type="button"><b>${esc(x[0])}</b><small>${esc(x[1])}</small><span>${esc(x[2])}</span></button></li>`).join('')}</ol>` : P); }
      case 'tl': return head + `<ol class="hs-tl">${(c.tl || []).map((x, j) => `<li class="rv" ${st(j, 350, 170)}><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join('')}</ol><p class="hs-note rv" ${st(0, 400 + (c.tl || []).length * 170)}>${esc(u('src'))}</p>`;
      case 'board': return head + `<figure class="hs-dg rv" ${st(0, 200)}>${diag(data.s.board, 1)}${c.cap ? `<figcaption>${esc(c.cap)}</figcaption>` : ''}</figure>` + P;
      case 'vars': return head + P + `<div class="hs-cards">${(c.cards || []).map((x0, j) => { let x = x0; const a = (x.length > 3 ? data.s.vars2 || [] : data.s.vars || [])[j], x4 = x.length > 3 ? [x[0], x[1] + (x[2] ? ' · ' + x[2] : ''), x[3]] : x; x = x4; return `<div class="hs-card rv" ${st(j, 420, 130)}><div class="art">${a && a.t ? diag(a, 0) : `<span class="emb">${esc(a && a.e || '')}</span>`}</div><div class="tx"><b>${esc(x[0])}</b>${x[1] ? `<small>${esc(x[1])}</small>` : ''}<span>${esc(x[2] || '')}</span></div></div>`; }).join('')}</div>`;
      case 'legend': if (c.items) return head + P + `<div class="hs-lgs">${c.items.map((x, j) => `<div class="hs-lg rv" ${st(j, 300, 110)}><b class="yr">${esc(x[0])}</b><div class="tx"><b>${esc(x[1])}</b><span>${esc(x[2])}</span></div>${x[3] ? `<div class="v"><b class="cnt" data-n="${esc(x[3])}">0</b><small>${esc(x[4] || '')}</small></div>` : ''}</div>`).join('')}</div>`;
        return head + `<div class="hs-stats">${(c.stats || []).map((x, j) => `<div class="hs-stat rv" ${st(j, 300, 140)}><div class="v"><b class="cnt" data-n="${esc(x[0])}">0</b><span>${esc(x[1] || '')}</span></div><small>${esc(x[2] || '')}</small></div>`).join('')}</div>` + P +
        `<div class="hs-cards ls">${(c.cards || []).map((x, j) => `<div class="hs-card nb rv" ${st(j, 600, 140)}><div class="tx"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div></div>`).join('')}</div>`;
      case 'trivia': return head + P + `<div class="hs-flips">${(c.cards || []).map((x, j) => `<button type="button" class="hs-flip rv" ${st(j, 350, 140)}><span class="f"><i>?</i><b>${esc(x[0])}</b><small>${esc(u('tap'))}</small></span><span class="b"><b>${esc(x[1])}</b></span></button>`).join('')}</div>`;
      case 'end': return `<div class="hs-end"><img class="rv" ${st(0, 0)} src="${guideSrc(game.id)}" alt=""><h2 class="hs-h">${kin(c.t || '')}</h2>${P}<div class="hs-acts rv" ${st(0, 700)}><button type="button" class="hs-btn pri" data-act="back">${esc(u('back'))}</button><button type="button" class="hs-btn" data-act="again">${esc(u('again'))}</button></div></div>`;
      default: return head + P;
    }
  }
  // tall PC windows: three key dates from the timeline under the hook (first, middle, last)
  function hkFacts() {
    const tc = data && data.ch.find(c => c.k === 'tl'), T = tc && tc.tl || []; if (T.length < 3) return '';
    const pick = [T[0], T[Math.floor((T.length - 1) / 2)], T[T.length - 1]];
    return `<div class="hk-facts">${pick.map((x, j) => `<div class="rv" style="--d:${1100 + j * 140}ms"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>`;
  }
  // per-page motion once it is on screen: count-ups, map routes, the timeline's line, pieces landing
  function run(pg, c) {
    pg.querySelectorAll('.cnt').forEach((el, j) => later(() => countUp(el), 450 + j * 160));
    const zm = pg.querySelector('.zm'); if (zm) { const mp = zm.closest('.hs-map'); paintDots(mp); zmSet(mp); later(() => zmSet(mp, zm.dataset.z), 350); addEventListener('resize', () => zmSet(mp), { signal: pageAC.signal }); }
    if (c.k === 'origin' && pg.querySelector('.hs-st')) stepper(pg);
    if (pg.querySelector('.hs-dg svg')) { fitDg(pg); later(() => fitDg(pg), 600); }
    if (c.k === 'trivia') pg.querySelectorAll('.hs-flip').forEach((el, j) => later(() => el.classList.add('peek'), 1400 + j * 200));
  }
  // a page with a board diagram: on a short window the diagram gives up height so the text never ends up under the nav bar
  function fitDg(pg) {
    const sv = pg.querySelector('.hs-dg svg'); if (!sv || !pg.isConnected) return;
    sv.style.maxWidth = '';
    const over = pg.scrollHeight - pg.clientHeight; if (over <= 1) return;
    const w = sv.getBoundingClientRect().width, h = sv.getBoundingClientRect().height; if (!h) return;
    sv.style.maxWidth = Math.max(200, Math.floor(w * (h - over - 4) / h)) + 'px';
  }
  addEventListener('resize', () => { const pg = root && root.querySelector('.hs-pg.in'); if (on && pg && pg.querySelector('.hs-dg svg')) fitDg(pg); });
  // origin chapter: the stages step through one by one (or on tap) — each lights its pin and draws the route that leads there
  function stepper(pg) {
    const L = [...pg.querySelectorAll('.hs-st li')], map = pg.querySelector('.hs-map'), pins = data.s.map.st || [], R = data.s.map.route || [];
    const P = [...map.querySelectorAll('[data-p]')], RT = [...map.querySelectorAll('.rt')];
    let k = -1, auto = true, hold = 0;
    // the map stays pinned at the top of the page (sticky, capped at ~40% of the page height); the list scrolls under it,
    // and each stage is brought up just below the map with a bit of the previous card still showing
    // the map's height: ~1/3 of the page on phones (~40% on PC), cropped around the pins rather than squashed; it is pinned only
    // when at least two or three stage cards still fit under it — otherwise it simply scrolls away with the page
    const sv = map.querySelector('svg');
    const cap = () => {
      if (!pg.isConnected) return;
      const H = pg.clientHeight, nat = map.clientWidth / 1.6, card = (L[0] && L[0].offsetHeight) || 70;
      // short pages (small phones, browser bars): the map gets slimmer (down to ~72 px, still cropped around the pins) rather than
      // scrolling away — it only stops being pinned when even that would leave less than ~2 cards of text
      const h = Math.round(Math.max(72, Math.min(nat, H * (phone() ? .33 : .4), H - card * 2.1)));
      map.classList.toggle('stick', H - h >= card * 1.6);
      sv.style.height = h + 'px'; sv.setAttribute('preserveAspectRatio', h < nat - 1 ? 'xMidYMid slice' : 'xMidYMid meet');
      zmSet(map);
    };
    cap(); later(cap, 520); addEventListener('resize', () => { cap(); if (k >= 0) follow(k); }, { signal: pageAC.signal });
    const y0 = map.offsetTop, stuck = () => map.classList.toggle('stuck', map.classList.contains('stick') && pg.scrollTop > y0 - 2);   // (y0: where the map sits before any scrolling)
    let sq = 0; pg.addEventListener('scroll', () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; stuck(); }); }, { passive: true });
    // the reader scrolling by hand pauses the automatic scrolling for a few seconds (it never fights them)
    const mine = () => { hold = performance.now() + 4000; };
    ['wheel', 'touchmove'].forEach(e => pg.addEventListener(e, mine, { passive: true }));
    pg.addEventListener('keydown', e => { if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) mine(); });
    const bring = (n, force) => {
      if (!force && performance.now() < hold) return;
      const li = L[n]; if (!li || pg.scrollHeight <= pg.clientHeight + 2) return;
      const prev = L[n - 1], peek = prev ? Math.min(prev.offsetHeight * .45, 44) : 0;
      const top = Math.max(0, li.offsetTop - (map.classList.contains('stick') ? map.offsetHeight : 0) - 12 - peek);
      if (Math.abs(top - pg.scrollTop) > 2) pg.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    const set = (n, force) => { k = n; L.forEach((li, j) => { li.classList.toggle('on', j === n); li.classList.toggle('past', j < n); });
      const seen = new Set(pins.slice(0, n + 1)), cur = pins[n];
      P.forEach(p => { const i = +p.dataset.p; p.classList.toggle('hot', i === cur); p.classList.toggle('seen', seen.has(i));
        if (i === cur) { p.classList.remove('ping'); void p.getBoundingClientRect(); p.classList.add('ping'); } });   // a ring pulses out of the stage's pin
      map.querySelectorAll('[data-l]').forEach(l => l.classList.toggle('seen', seen.has(+l.dataset.l)));
      RT.forEach((r, j) => { const [a, b] = R[j] || []; r.classList.toggle('on', seen.has(a) && seen.has(b)); });
      bring(n, force); follow(n); };
    // the map follows the stages: when it is cropped (phones, short pages) it pans/zooms so the active pin — and the previous
    // one, when both fit — sit in the visible part; uncropped, the whole route stays in view. A drag or pinch on the map wins
    // until the next stage.
    const zm = map.querySelector('.zm'), zb = (zm.dataset.z.match(/-?[\d.]+/g) || [0, 0, 1]).map(Number);   // [tx, ty, z] of the route framing
    const PM = []; P.forEach(p => { const m = (p.parentNode.getAttribute('transform') || '').match(/-?[\d.]+/g); if (m) PM[+p.dataset.p] = [+m[0], +m[1]]; });
    let view = null;
    const vis = () => {   // the part of the 360×225 viewBox that is on screen
      const W = sv.clientWidth, H = sv.clientHeight; if (!W || !H) return { x: 0, y: 0, w: 360, h: 225, crop: false };
      const sl = sv.getAttribute('preserveAspectRatio') === 'xMidYMid slice', sc = sl ? Math.max(W / 360, H / 225) : Math.min(W / 360, H / 225);
      const w = Math.min(360, W / sc), h = Math.min(225, H / sc); return { x: (360 - w) / 2, y: (225 - h) / 2, w, h, crop: sl };
    };
    const apply = (v, ms) => { view = v; zmSet(map, `translate(${v[0].toFixed(2)}px,${v[1].toFixed(2)}px) scale(${v[2].toFixed(4)})`, `transform ${ms}ms cubic-bezier(.4,0,.2,1)`); };
    const follow = n => {
      const V = vis(), z0 = zb[2]; if (!V.crop) { apply([zb[0], zb[1], z0], 600); return; }
      const ids = [pins[n], pins[n - 1]].filter(i => PM[i]);
      if (!ids.length) return;
      const fitIn = list => { const xs = list.map(i => PM[i][0]), ys = list.map(i => PM[i][1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const z = Math.min(V.w * .5 / Math.max(1, x1 - x0), V.h * .55 / Math.max(1, y1 - y0));   /* room left for the labels beside the pins */ return { z, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
      let f = fitIn(ids); if (ids.length > 1 && f.z < z0 * .6) f = fitIn(ids.slice(0, 1));   // too far apart: just the active pin
      const z = Math.max(z0 * .6, Math.min(z0 * 1.35, f.z));
      apply([V.x + V.w / 2 - f.cx * z, V.y + V.h / 2 - f.cy * z, z], 520);
    };
    // drag / pinch on the map (horizontal drags only: vertical swipes still scroll the page)
    { const pts = new Map(); let st = null;
      map.addEventListener('pointerdown', e => { if (!view) return; pts.set(e.pointerId, [e.clientX, e.clientY]); const a = [...pts.values()];
        st = { v: view.slice(), a: a.map(x => x.slice()), d: a.length > 1 ? Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0 }; });
      map.addEventListener('pointermove', e => { if (!st || !pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
        const a = [...pts.values()], k2 = 360 / Math.max(1, sv.clientWidth) * (vis().w / 360);
        if (a.length > 1 && st.d) { const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), r = Math.max(.5, Math.min(2.5, d / st.d)), z = st.v[2] * r;
          const V = vis(), cx = V.x + V.w / 2, cy = V.y + V.h / 2; apply([cx - (cx - st.v[0]) * r, cy - (cy - st.v[1]) * r, z], 0); }
        else { const dx = (a[0][0] - st.a[0][0]) * k2, dy = (a[0][1] - st.a[0][1]) * k2; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) apply([st.v[0] + dx, st.v[1] + dy, st.v[2]], 0); } });
      const up = e => { pts.delete(e.pointerId); if (!pts.size) st = null; else { const a = [...pts.values()]; st = { v: view.slice(), a, d: 0 }; } };
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => map.addEventListener(t, up)); }
    const tick = () => { if (!auto || !on || !pg.isConnected) return; if (k < L.length - 1) { set(k + 1); later(tick, 2300); } };
    later(tick, 1500);
    L.forEach((li, j) => li.querySelector('button').onclick = () => { auto = false; set(j, true); });
  }
  function fmt(v) { try { return Math.round(v).toLocaleString(lang === 'ar' ? 'en' : lang); } catch (e) { return String(Math.round(v)); } }
  function countUp(el) {
    const raw = String(el.dataset.n || '');
    const m = raw.match(/^10\^(\d+)$/);   // 10^120: the exponent counts up
    if (m) { const N = +m[1]; el.innerHTML = '10<sup>0</sup>'; const sup = el.querySelector('sup'); tween(1300, k => { sup.textContent = fmt(N * k); }); return; }
    const N = parseFloat(raw.replace(/,/g, '')); if (!isFinite(N)) { el.textContent = raw; return; }
    const dec = (raw.split('.')[1] || '').length, yr = /^\d{4}$/.test(raw);   // 4-digit numbers (years) are not grouped
    tween(1300, k => { el.textContent = dec ? (N * k).toFixed(dec) : yr ? String(Math.round(N * k)) : fmt(N * k); });
  }
  function tween(ms, f) { const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4); f(k >= 1 ? 1 : e); if (k < 1 && on) requestAnimationFrame(step); }; requestAnimationFrame(step); }

  /* ---------- world map (dots) with pins and routes ---------- */
  let mctx = null;
  function textW(str, fs) {   // label width in the page font (falls back to a per-character estimate)
    try { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = `900 ${fs}px 'Zen Maru Gothic','Noto Sans Devanagari','Noto Sans Arabic',sans-serif`; const w = mctx.measureText(str).width; if (w > 0) return w; } catch (e) {}
    return [...str].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? fs : fs * .6), 0);
  }
    // the dot map as a bitmap: thousands of dots in an SVG path made every pan, zoom and pin pulse repaint the whole map. They are
  // painted once into a <canvas> under the SVG (sharp at the zoom it is shown at, with room for the stage-follow panning); the
  // canvas copies the map group's transform, so it moves with the pins and routes as one picture
  let dotsP = null;
  function dotsPath2D(M) {
    if (dotsP) return dotsP; dotsP = new Path2D(); const s = M.step, r = s * .31;
    M.rows.split('|').forEach((row, y) => { const cy = y * s + s / 2; let x = 0;
      row.split('.').forEach((v, i) => { const n = parseInt(v, 36); if (i & 1) for (let q = 0; q < n; q++) { const cx = (x + q) * s + s / 2; dotsP.moveTo(cx + r, cy); dotsP.arc(cx, cy, r, 0, 6.2832); } x += n; }); });
    return dotsP;
  }
  function dotsCanvas(ox, oy, w, h, z) {
    const M = window.HISTORIA_MAP; if (!M) return '';
    const H0 = M.rows.split('|').length * M.step;
    const x0 = Math.max(0, ox - w * .6), y0 = Math.max(0, oy - h * .6), x1 = Math.min(360, ox + w * 1.6), y1 = Math.min(H0, oy + h * 1.6);
    const css = Math.min(innerWidth, 760) / 360, dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const k = Math.min(z * 1.15 * css * dpr, 2048 / (x1 - x0), 2048 / (y1 - y0));
    return `<canvas class="dots" aria-hidden="true" data-r="${[x0, y0, x1 - x0, y1 - y0, k].map(v => v.toFixed(3)).join()}"></canvas>`;
  }
  function paintDots(map) {
    const cv = map.querySelector('canvas.dots'); if (!cv || cv.dataset.done || !window.HISTORIA_MAP) return; cv.dataset.done = '1';
    const [x0, y0, w, h, k] = cv.dataset.r.split(',').map(Number);
    cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const g = cv.getContext('2d'); g.fillStyle = 'rgba(201,180,138,.9)'; g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); g.fill(dotsPath2D(window.HISTORIA_MAP));
  }
  // the map group's transform (translate(tx,ty) scale(z) in viewBox units) → the canvas's CSS transform, through the viewBox fit
  function zmSet(map, tr, tn) {
    const zm = map.querySelector('.zm'), cv = map.querySelector('canvas.dots'), sv = map.querySelector('svg');
    if (tr != null) { if (tn != null) zm.style.transition = tn; zm.style.transform = tr; }
    if (!cv) return;
    const v = ((zm.style.transform || 'translate(0px,0px) scale(1)').match(/-?[\d.]+/g) || [0, 0, 1]).map(Number), [tx, ty, z] = [v[0] || 0, v[1] || 0, v[2] || 1];
    const rs = sv.getBoundingClientRect(), rm = map.getBoundingClientRect(), W = rs.width, H = rs.height, sl = (sv.getAttribute('preserveAspectRatio') || '').includes('slice');
    if (!W || !H) return;
    const sc = sl ? Math.max(W / 360, H / 225) : Math.min(W / 360, H / 225), oX = (W - 360 * sc) / 2 + rs.left - rm.left, oY = (H - 225 * sc) / 2 + rs.top - rm.top;
    const [x0, y0] = cv.dataset.r.split(',').map(Number);
    cv.style.transition = tn != null ? tn : (zm.style.transition || '');
    cv.style.transform = `translate(${(oX + sc * (tx + z * x0)).toFixed(2)}px,${(oY + sc * (ty + z * y0)).toFixed(2)}px) scale(${(sc * z).toFixed(4)})`;
  }
  function mapSvg(m, labels, steps) {
    if (!m || !m.pts) return '';
    const M = window.HISTORIA_MAP || { step: 1.25, lat0: 72.5 }, lat0 = M.lat0;
    const P = m.pts.map(([lon, lat]) => [lon + 180, lat0 - lat]);
    // zoom to the pins (with a margin), keeping the frame 16:10
    let x0 = Math.min(...P.map(p => p[0])), x1 = Math.max(...P.map(p => p[0])), y0 = Math.min(...P.map(p => p[1])), y1 = Math.max(...P.map(p => p[1]));
    const W0 = 360, H0 = 128.5;   // full map 180°W–180°E × 72.5°N–56°S
    let w = Math.max(48, (x1 - x0) * 1.5 + 16), h = Math.max(30, (y1 - y0) * 1.5 + 14); if (w / h > 1.6) h = w / 1.6; else w = h * 1.6;
    w = Math.min(w, W0); h = w / 1.6;   // the frame stays 16:10, even when it is taller than the map itself
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; cx = Math.max(w / 2, Math.min(W0 - w / 2, cx));
    if (h >= H0) cy = (cy + H0 / 2) / 2;   // taller than the map: lean towards the pins instead of leaving them at the edge
    else cy = Math.max(h / 2, Math.min(H0 - h / 2, cy));
    cy = Math.max(y1 + 16 - h / 2, Math.min(y0 - 16 + h / 2, cy));   // keep room for labels above/below the outermost pins
    const z = W0 / w;   // scale applied to the map group
    const tx = -(cx - w / 2) * z, ty = -(cy - h / 2) * z;
    const r = 2.4 / z, fs = 10.5 / z;
    const routes = (m.route || []).map(([a, b], j) => {
      const A = P[a], B = P[b], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      const k = .22 * L, qx = mx - dy / L * k, qy = my + dx / L * k - .1 * L;
      return `<path class="rt" pathLength="1" style="--d:${900 + j * 520}ms;stroke-width:${(1.5 / z).toFixed(3)}" d="M${A[0].toFixed(2)} ${A[1].toFixed(2)}Q${qx.toFixed(2)} ${qy.toFixed(2)} ${B[0].toFixed(2)} ${B[1].toFixed(2)}" marker-end="url(#hsArr)"/>`;
    }).join('');
    const order = m.order || P.map((_, i) => i);
    // label placement, worked out in the zoomed frame (360 × 225 units, what is finally on screen):
    // every label tries spots around its pin (sides, above/below, diagonals, then farther out with a leader line)
    // and takes the one that overlaps nothing — other labels, pins, the arcs, the frame edge
    const ox = cx - w / 2, oy = cy - h / 2, FW = W0, FH = W0 / 1.6, Z = q => [(q[0] - ox) * z, (q[1] - oy) * z];
    const PZ = P.map(Z), RZ = 2.4, FS = 10.5, PADX = 3.2, BH = FS * 1.32;
    const arcs = []; (m.route || []).forEach(([a, b]) => { const A = P[a], B = P[b], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, k = .22 * L, Q = [mx - dy / L * k, my + dx / L * k - .1 * L];
      for (let t = 0; t <= 1.0001; t += 1 / 28) { const u = 1 - t; arcs.push(Z([u * u * A[0] + 2 * u * t * Q[0] + t * t * B[0], u * u * A[1] + 2 * u * t * Q[1] + t * t * B[1]])); } });
    const tw = s => textW(s, FS) + PADX * 2;
    const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const placed = [], L = [];
    const prio = P.map((_, i) => i).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    prio.forEach(i => {
      const lb = labels[i]; if (!lb) return;
      const [px, py] = PZ[i], bw = tw(lb), g = RZ + 2.5;
      let best = null;
      [0, 1, 2].forEach(ring => {
        const e = ring * 13;   // farther rings need a leader line
        [[g + e, -BH / 2], [-g - e - bw, -BH / 2], [-bw / 2, -g - e - BH], [-bw / 2, g + e], [g * .7 + e * .7, -g * .7 - e * .7 - BH], [g * .7 + e * .7, g * .7 + e * .7], [-g * .7 - e * .7 - bw, -g * .7 - e * .7 - BH], [-g * .7 - e * .7 - bw, g * .7 + e * .7]].forEach(([dx, dy], k) => {
          const b = { x: px + dx, y: py + dy, w: bw, h: BH };
          let sc = ring * 40 + k * 1.5;
          placed.forEach(o => { sc += ov(b, o) * 30; });
          PZ.forEach(([qx, qy]) => { sc += ov(b, { x: qx - RZ * 2.2, y: qy - RZ * 2.2, w: RZ * 4.4, h: RZ * 4.4 }) * 25;   /* a pin grows 1.7× while its stage is on */ });
          const inside = ov(b, { x: 2, y: 2, w: FW - 4, h: FH - 4 }); sc += (b.w * b.h - inside) * 40;
          arcs.forEach(([ax, ay]) => { if (ax > b.x - 1 && ax < b.x + b.w + 1 && ay > b.y - 1 && ay < b.y + b.h + 1) sc += 12; });
          if (!best || sc < best.sc) best = { sc, b, ring };
        });
      });
      placed.push(best.b); L[i] = best;
    });
    const U = v => (v / z).toFixed(3);   // zoomed units → map units (inside the scaled group)
    const pins = P.map((p, i) => { const o = order.indexOf(i), d = 700 + Math.max(0, o) * 520;
      return `<g transform="translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})"><g class="pin" data-p="${i}" style="--d:${steps ? 600 : d}ms"><circle class="pl" r="${(r * 2.6).toFixed(3)}"/><circle class="pd" r="${r.toFixed(3)}"/></g></g>`; }).join('');
    const lbls = P.map((p, i) => { const B = L[i]; if (!B) return ''; const o = order.indexOf(i), d = 820 + Math.max(0, o) * 520, b = B.b;
      const x = b.x / z + ox, y = b.y / z + oy;
      let lead = '';
      if (B.ring) { const [px, py] = PZ[i], qx = Math.max(b.x, Math.min(b.x + b.w, px)), qy = Math.max(b.y, Math.min(b.y + b.h, py)); lead = `<path class="ld" d="M${(px / z + ox).toFixed(2)} ${(py / z + oy).toFixed(2)}L${(qx / z + ox).toFixed(2)} ${(qy / z + oy).toFixed(2)}" style="stroke-width:${U(1)}"/>`; }
      return `<g class="lbg" data-l="${i}" style="--d:${d}ms">${lead}<g class="lb"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${U(b.w)}" height="${U(b.h)}" rx="${U(BH / 2)}" style="stroke-width:${U(.8)}"/><text x="${(x + b.w / z / 2).toFixed(2)}" y="${(y + b.h / z / 2 + FS * .36 / z).toFixed(2)}" font-size="${U(FS)}" text-anchor="middle">${esc(labels[i])}</text></g></g>`; }).join('');
    return dotsCanvas(ox, oy, w, h, z) + `<svg viewBox="0 0 ${W0} ${(W0 / 1.6).toFixed(1)}" dir="ltr" aria-hidden="true"><defs><marker id="hsArr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 9 5 0 9z" fill="var(--gc)"/></marker></defs>
      <g class="zm" data-z="translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${z.toFixed(3)})">${routes}${pins}${lbls}</g></svg>`;
  }

  /* ---------- board diagrams (SVG, drawn from a small spec; pieces drop in one after another) ---------- */
  const COL = { b: ['#2b2b30', '#55555c'], w: ['#fbf7ee', '#cfc6b2'], r: ['#d8423a', '#9e2a24'], y: ['#f5c23c', '#c48d13'], u: ['#3a78d8', '#23519e'], g: ['#3caf6e', '#237a4a'], p: ['#8d6bff', '#5d40c4'], o: ['#f08a2c', '#b8611a'], k: ['#d9b07a', '#a87b45'] };
  function piece(x, y, c, gl, R, shape, d) {
    const [f, s] = COL[c] || COL.b, sty = `style="--d:${d}ms"`;
    const W_ = (inner, rot = '') => `<g transform="translate(${x} ${y})${rot}"><g class="pc" ${sty}>${inner}</g></g>`;
    if (shape === 'sh') return W_(`<path d="M0 ${-R * .95} ${R * .72} ${-R * .6} ${R * .85} ${R * .9} ${-R * .85} ${R * .9} ${-R * .72} ${-R * .6}z" fill="#f2d79b" stroke="#a57a3a" stroke-width="${R * .08}"/>${gl ? `<text y="${R * .32}" font-size="${R * .9}" text-anchor="middle" fill="#2b2b30">${esc(gl)}</text>` : ''}`, c === 'r' ? ' rotate(180)' : '');
    if (shape === 'ch') return W_(`<text y="${R * .55}" font-size="${R * 1.75}" text-anchor="middle" fill="${c === 'w' ? '#fbf7ee' : '#2b2b30'}" stroke="${c === 'w' ? '#2b2b30' : '#fbf7ee'}" stroke-width="${R * .07}" paint-order="stroke" style="font-family:'Segoe UI Symbol','DejaVu Sans','Noto Sans Symbols2',serif">${esc(gl)}&#xFE0E;</text>`);
    if (shape === 'xq') return W_(`<circle r="${R * .92}" fill="#f6e6c2" stroke="${f}" stroke-width="${R * .12}"/><circle r="${R * .7}" fill="none" stroke="${f}" stroke-width="${R * .05}"/>${gl ? `<text y="${R * .34}" font-size="${R * .9}" text-anchor="middle" fill="${f}">${esc(gl)}</text>` : ''}`);
    if (shape === 'tile') return W_(`<rect x="${-R * .9}" y="${-R * .9}" width="${R * 1.8}" height="${R * 1.8}" rx="${R * .25}" fill="${c === 'w' ? '#fffdf7' : f}" stroke="${c === 'w' ? '#d8c9a6' : s}" stroke-width="${R * .08}"/>${gl ? `<text y="${R * .4}" font-size="${R * 1.05}" text-anchor="middle" fill="${c === 'w' ? '#2b3044' : '#fff'}" font-weight="700">${esc(gl)}</text>` : ''}`);
    if (shape === 'sq') return W_(`<rect x="${-R}" y="${-R}" width="${R * 2}" height="${R * 2}" rx="${R * .35}" fill="${f}" stroke="${s}" stroke-width="${R * .1}"/><circle cx="${-R * .35}" cy="${-R * .35}" r="${R * .22}" fill="#fff" opacity=".45"/>`);
    return W_(`<circle r="${R}" fill="${f}" stroke="${s}" stroke-width="${R * .12}"/><circle cx="${-R * .3}" cy="${-R * .32}" r="${R * .3}" fill="#fff" opacity="${c === 'w' ? .7 : .22}"/>${gl ? `<text y="${R * .36}" font-size="${R * .95}" text-anchor="middle" fill="${c === 'w' || c === 'y' ? '#2b2b30' : '#fff'}" font-weight="700">${esc(gl)}</text>` : ''}`);
  }
  const pcs = a => (a || []).map(p => typeof p === 'string' ? p.split(',') : p).map(([x, y, c, g]) => [+x, +y, c || 'b', g]);
  const ln = (x1, y1, x2, y2, cls = 'gl', d = 0) => `<path class="${cls}" pathLength="1" style="--d:${d}ms" d="M${x1} ${y1}L${x2} ${y2}"/>`;
  function diag(s, bigOne) {
    if (!s || !s.t) return '';
    const T = s.t, PD = 26, out = [];
    let W, H, body = '', dd = 260, step = Math.max(16, Math.min(70, 1500 / Math.max(1, (s.pcs || []).length)));
    const wood = s.bg || '#e9c98f', line = s.ln || '#6b4a24';
    if (T === 'grid') {
      const n = s.w, m = s.h, cell = 30, pt = s.at !== 'cell', cols = pt ? n - 1 : n, rows = pt ? m - 1 : m;
      W = cols * cell + PD * 2; H = rows * cell + PD * 2;
      const X = i => PD + i * cell + (pt ? 0 : cell / 2), Y = j => PD + j * cell + (pt ? 0 : cell / 2);
      const mask = new Set((s.mask || []).map(a => a.join(',')));
      out.push(`<rect class="bd" x="${PD - 14}" y="${PD - 14}" width="${cols * cell + 28}" height="${rows * cell + 28}" rx="10" fill="${wood}"/>`);
      if (!pt) {
        for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (mask.has(i + ',' + j)) continue; const dark = s.check && (i + j) % 2 === 1;
          out.push(`<rect class="cl" style="--d:${(i + j) * 18}ms" x="${PD + i * cell}" y="${PD + j * cell}" width="${cell}" height="${cell}" fill="${dark ? (s.dark || '#8a5a32') : (s.light || 'rgba(255,255,255,.18)')}" stroke="${line}" stroke-width="${s.check ? 0 : 1.1}"/>`); }
        (s.marks || []).forEach(([i, j]) => out.push(`<rect class="cl" x="${PD + i * cell + 3}" y="${PD + j * cell + 3}" width="${cell - 6}" height="${cell - 6}" rx="4" fill="none" stroke="${line}" stroke-width="1.6" stroke-dasharray="3 2"/>`));
        (s.ros || []).forEach(([i, j]) => out.push(`<g class="cl" transform="translate(${X(i)} ${Y(j)})">${[0, 45, 90, 135].map(a => `<ellipse rx="11" ry="3.6" transform="rotate(${a})" fill="#d8423a" opacity=".75"/>`).join('')}<circle r="3" fill="#f5c23c"/></g>`));
        if (s.box) { const [bw, bh] = s.box; for (let i = 0; i <= n; i += bw) out.push(ln(PD + i * cell, PD, PD + i * cell, PD + m * cell, 'gl th')); for (let j = 0; j <= m; j += bh) out.push(ln(PD, PD + j * cell, PD + n * cell, PD + j * cell, 'gl th')); }
      } else {
        for (let i = 0; i < n; i++) out.push(s.river ? ln(X(i), Y(0), X(i), Y(i === 0 || i === n - 1 ? m - 1 : 4), 'gl', i * 30) + (i === 0 || i === n - 1 ? '' : ln(X(i), Y(5), X(i), Y(m - 1), 'gl', i * 30)) : ln(X(i), Y(0), X(i), Y(m - 1), 'gl', i * 30));
        for (let j = 0; j < m; j++) out.push(ln(X(0), Y(j), X(n - 1), Y(j), 'gl', j * 30));
        if (s.diag === 'alq') { for (let j = 0; j < m - 1; j++) for (let i = 0; i < n - 1; i++) if ((i + j) % 2 === 0) out.push(ln(X(i), Y(j), X(i + 1), Y(j + 1), 'gl', 300)); else out.push(ln(X(i + 1), Y(j), X(i), Y(j + 1), 'gl', 300)); }
        if (s.palace) [[3, 0], [3, 7]].forEach(([i, j]) => { out.push(ln(X(i), Y(j), X(i + 2), Y(j + 2), 'gl', 400)); out.push(ln(X(i + 2), Y(j), X(i), Y(j + 2), 'gl', 400)); });
        (s.stars || []).forEach(([i, j]) => out.push(`<circle class="cl" cx="${X(i)}" cy="${Y(j)}" r="3" fill="${line}"/>`));
        (s.marks || []).forEach(([i, j]) => out.push(`<rect class="cl" x="${X(i) - 10}" y="${Y(j) - 10}" width="20" height="20" rx="3" fill="none" stroke="${line}" stroke-width="1.6"/>`));
      }
      const R = pt ? cell * .4 : cell * .38;
      pcs(s.pcs).forEach(([i, j, c, g], k) => { body += piece(X(i), Y(j), c, g, R, s.ps, dd + k * step); });
      (s.arrows || []).forEach(([a, b, c2, d2], k) => { body += `<path class="ar" pathLength="1" style="--d:${dd + (s.pcs || []).length * step + 200 + k * 300}ms" d="M${X(a)} ${Y(b)}L${X(c2)} ${Y(d2)}" marker-end="url(#hsArr2)"/>`; });
    } else if (T === 'morris') {
      const S = 36; W = H = 6 * S + PD * 2;
      const pos = (r, k) => { const o = r * S, L = 6 * S - 2 * o, P0 = PD + o; const C = [[0, 0], [.5, 0], [1, 0], [1, .5], [1, 1], [.5, 1], [0, 1], [0, .5]][k]; return [P0 + C[0] * L, P0 + C[1] * L]; };
      out.push(`<rect class="bd" x="${PD - 16}" y="${PD - 16}" width="${6 * S + 32}" height="${6 * S + 32}" rx="10" fill="${wood}"/>`);
      const rings = s.rings || 3;
      for (let r = 0; r < rings; r++) { const o = r * S, L = 6 * S - 2 * o; out.push(`<rect class="gl" pathLength="1" style="--d:${r * 120}ms" x="${PD + o}" y="${PD + o}" width="${L}" height="${L}" fill="none"/>`); }
      if (rings > 1) [1, 3, 5, 7].forEach(k => { const a = pos(0, k), b = pos(rings - 1, k); out.push(ln(a[0], a[1], b[0], b[1], 'gl', 400)); });
      if (s.diag) [0, 2, 4, 6].forEach(k => { const a = pos(0, k), b = pos(rings - 1, k); out.push(ln(a[0], a[1], b[0], b[1], 'gl', 450)); });
      for (let r = 0; r < rings; r++) for (let k = 0; k < 8; k++) { const p = pos(r, k); out.push(`<circle class="cl" cx="${p[0]}" cy="${p[1]}" r="4" fill="${line}"/>`); }
      pcs(s.pcs).forEach(([r, k, c], j) => { const p = pos(r, k); body += piece(p[0], p[1], c, null, 12, null, dd + j * step); });
    } else if (T === 'hex') {
      const n = s.n || 5, a = 13, dx = a * Math.sqrt(3), dy = a * 1.5;
      const C = (i, j) => [PD + 10 + i * dx + j * dx / 2, PD + 10 + j * dy];
      W = C(n - 1, n - 1)[0] + PD + 10; H = C(0, n - 1)[1] + PD + 10;
      const hx = (x, y, f, d) => `<path class="cl" style="--d:${d}ms" d="${[0, 1, 2, 3, 4, 5].map(k => { const t = Math.PI / 3 * k + Math.PI / 6; return (k ? 'L' : 'M') + (x + a * Math.cos(t)).toFixed(1) + ' ' + (y + a * Math.sin(t)).toFixed(1); }).join('')}z" fill="${f}" stroke="${line}" stroke-width="1.1"/>`;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const [x, y] = C(i, j); out.push(hx(x, y, wood, (i + j) * 20)); }
      const e1 = C(0, 0), e2 = C(n - 1, 0), e3 = C(n - 1, n - 1), e4 = C(0, n - 1);
      out.push(`<path class="gl" pathLength="1" style="--d:200ms;stroke:#d8423a;stroke-width:4" d="M${e1[0]} ${e1[1] - a * 1.2}L${e2[0]} ${e2[1] - a * 1.2}"/><path class="gl" pathLength="1" style="--d:200ms;stroke:#d8423a;stroke-width:4" d="M${e4[0]} ${e4[1] + a * 1.2}L${e3[0]} ${e3[1] + a * 1.2}"/>`);
      out.push(`<path class="gl" pathLength="1" style="--d:300ms;stroke:#3a78d8;stroke-width:4" d="M${e1[0] - a * 1.1} ${e1[1]}L${e4[0] - a * 1.1} ${e4[1]}"/><path class="gl" pathLength="1" style="--d:300ms;stroke:#3a78d8;stroke-width:4" d="M${e2[0] + a * 1.1} ${e2[1]}L${e3[0] + a * 1.1} ${e3[1]}"/>`);
      pcs(s.pcs).forEach(([i, j, c], k) => { const [x, y] = C(i, j); body += piece(x, y, c, null, a * .62, null, dd + k * step); });
    } else if (T === 'agon') {
      const n = s.n || 5, a = 13, sq3 = Math.sqrt(3), cx = PD + 12 + a * sq3 * n + a, cy = PD + 12 + a * 1.5 * n + a;
      const C = (q, r) => [cx + a * sq3 * (q + r / 2), cy + a * 1.5 * r];
      W = cx * 2; H = cy * 2;
      const RO = a * (sq3 * n + 1.35);
      out.push(`<path class="bd" d="${[0, 1, 2, 3, 4, 5].map(k => { const t = Math.PI / 3 * k; return (k ? 'L' : 'M') + (cx + RO * Math.cos(t)).toFixed(1) + ' ' + (cy + RO * Math.sin(t)).toFixed(1); }).join('')}z" fill="${wood}" stroke="${line}" stroke-width="2"/>`);
      for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) {
        const g = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); if (g > n) continue;
        const [x, y] = C(q, r), f = g === 0 ? (s.th || '#1e3a2c') : (g % 2 ? (s.ra || '#6c1a1c') : (s.rb || '#e7dcc0'));
        out.push(`<path class="cl" style="--d:${(n - g) * 70}ms" d="${[0, 1, 2, 3, 4, 5].map(k => { const t = Math.PI / 3 * k + Math.PI / 6; return (k ? 'L' : 'M') + (x + a * Math.cos(t)).toFixed(1) + ' ' + (y + a * Math.sin(t)).toFixed(1); }).join('')}z" fill="${f}" stroke="${line}" stroke-width="1"/>`);
      }
      pcs(s.pcs).forEach(([q, r, c, g], k) => { const [x, y] = C(q, r); body += piece(x, y, c, g ? '♛' : null, a * .66, null, dd + k * step); });
      (s.arrows || []).forEach(([q1, r1, q2, r2], k) => { const [x1, y1] = C(q1, r1), [x2, y2] = C(q2, r2); body += `<path class="ar" pathLength="1" style="--d:${dd + (s.pcs || []).length * step + 200 + k * 300}ms" d="M${x1} ${y1 + a * .7}L${x2} ${y2 - a * .2}" marker-end="url(#hsArr2)"/>`; });
    } else if (T === 'mancala') {
      const n = s.pits || 6, rows = s.rows || 2, P = 34, st0 = s.stores === false ? 0 : 1;
      W = (n + st0 * 2) * P + PD * 2; H = rows * P + PD * 2 + 6;
      out.push(`<rect class="bd" x="${PD - 8}" y="${PD - 8}" width="${(n + st0 * 2) * P + 16}" height="${rows * P + 22}" rx="${P * .6}" fill="${wood}"/>`);
      const seeds = s.seeds || [];
      for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
        const x = PD + (i + st0 + .5) * P, y = PD + 3 + (r + .5) * P, d = (r * n + i) * 40;
        out.push(`<circle class="cl" style="--d:${d}ms" cx="${x}" cy="${y}" r="${P * .4}" fill="rgba(80,45,15,.28)" stroke="${line}" stroke-width="1"/>`);
        const cnt = seeds[r * n + i] != null ? seeds[r * n + i] : (s.each || 4);
        for (let q = 0; q < cnt; q++) { const t = q * 2.4, rr = q ? 3 + 2.2 * Math.sqrt(q) : 0; body += `<circle class="pc sd" style="--d:${dd + (r * n + i) * 40 + q * 30}ms" cx="${(x + Math.cos(t) * Math.min(rr, 9)).toFixed(1)}" cy="${(y + Math.sin(t) * Math.min(rr, 9)).toFixed(1)}" r="3.6" fill="${['#e9eef2', '#9cd0e8', '#e6b35a', '#c9e6b0'][q % 4]}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>`; }
      }
      if (st0) [PD + P * .5, PD + (n + 1.5) * P].forEach(x => out.push(`<rect class="cl" x="${x - P * .38}" y="${PD + 6}" width="${P * .76}" height="${rows * P - 6}" rx="${P * .38}" fill="rgba(80,45,15,.28)" stroke="${line}" stroke-width="1"/>`));
    } else if (T === 'bg') {
      const P = 20, w2 = 6 * P; W = 12 * P + 16 + PD * 2; H = 200 + PD;
      out.push(`<rect class="bd" x="${PD - 10}" y="${PD - 10}" width="${12 * P + 36}" height="${H - PD + 4}" rx="8" fill="#6b3f22"/><rect x="${PD}" y="${PD}" width="${w2}" height="${H - PD * 2 + 4}" fill="#e9d2a6"/><rect x="${PD + w2 + 16}" y="${PD}" width="${w2}" height="${H - PD * 2 + 4}" fill="#e9d2a6"/>`);
      const H2 = H - PD + 4;
      const px = k => { const i = k < 12 ? 11 - k : k - 12; return PD + (i >= 6 ? 16 : 0) + i * P + P / 2; };   // point k (0-23): 0-11 bottom right→left, 12-23 top left→right
      for (let k = 0; k < 24; k++) { const x = px(k), top = k >= 12, y0 = top ? PD : H2, y1 = top ? PD + 78 : H2 - 78; out.push(`<path class="cl" style="--d:${k * 18}ms" d="M${x - P / 2} ${y0}L${x} ${y1}L${x + P / 2} ${y0}z" fill="${k % 2 ? '#a3402c' : '#2f3f55'}"/>`); }
      let j = 0; (s.pcs || []).forEach(([k, n, c]) => { for (let q = 0; q < n; q++) { const top = k >= 12, y = top ? PD + 9 + q * 16 : H2 - 9 - q * 16; body += piece(px(k), y, c, null, 8, null, dd + (j++) * 45); } });
    } else if (T === 'cards') {
      const cs = s.cs || [], n = cs.length, cw = 46, chh = 66; W = Math.max(200, n * 34 + 70); H = 130;
      cs.forEach((cd, k) => { const red = /[♥♦]/.test(cd), rk = cd.slice(0, -1), su = cd.slice(-1), ang = s.fan === false ? 0 : (k - (n - 1) / 2) * 9, x = W / 2 + (k - (n - 1) / 2) * 32, y = 70 + Math.abs(k - (n - 1) / 2) * 3;
        body += `<g transform="translate(${x} ${y}) rotate(${ang})"><g class="pc cd" style="--d:${dd + k * 160}ms"><rect x="${-cw / 2}" y="${-chh / 2}" width="${cw}" height="${chh}" rx="5" fill="#fffdf7" stroke="#cbbf9e" stroke-width="1"/><text x="${-cw / 2 + 5}" y="${-chh / 2 + 15}" font-size="13" font-weight="700" fill="${red ? '#d03a32' : '#2b2b30'}">${esc(rk)}</text><text y="12" font-size="26" text-anchor="middle" fill="${red ? '#d03a32' : '#2b2b30'}">${esc(su)}</text></g></g>`; });
    } else if (T === 'dots') {
      const n = s.w || 4, m = s.h || 4, S = 34; W = (n - 1) * S + PD * 2; H = (m - 1) * S + PD * 2;
      const X = i => PD + i * S, Y = j => PD + j * S;
      out.push(`<rect class="bd" x="${PD - 14}" y="${PD - 14}" width="${(n - 1) * S + 28}" height="${(m - 1) * S + 28}" rx="10" fill="#fffdf7" stroke="#e8dcc0"/>`);
      (s.boxes || []).forEach(([i, j, c], k) => out.push(`<rect class="pc" style="--d:${dd + 600 + k * 200}ms" x="${X(i) + 3}" y="${Y(j) + 3}" width="${S - 6}" height="${S - 6}" rx="4" fill="${(COL[c] || COL.r)[0]}" opacity=".55"/>`));
      (s.lines || []).forEach(([a, b, c2, d2, c], k) => out.push(`<path class="ar dl" pathLength="1" style="--d:${dd + k * 110}ms;stroke:${(COL[c] || COL.u)[0]}" d="M${X(a)} ${Y(b)}L${X(c2)} ${Y(d2)}"/>`));
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) out.push(`<circle cx="${X(i)}" cy="${Y(j)}" r="3.6" fill="#2b3044"/>`);
    } else if (T === 'c4') {
      const n = s.w || 7, m = s.h || 6, S = 30; W = n * S + PD * 2; H = m * S + PD * 2;
      body += `<rect x="${PD - 6}" y="${PD - 6}" width="${n * S + 12}" height="${m * S + 12}" rx="10" fill="#2f6fd8"/>`;
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) body += `<circle cx="${PD + i * S + S / 2}" cy="${PD + j * S + S / 2}" r="${S * .38}" fill="#fffaf0"/>`;
      pcs(s.pcs).forEach(([i, j, c], k) => { body += `<g class="pc c4" style="--d:${dd + k * 140}ms"><circle cx="${PD + i * S + S / 2}" cy="${PD + j * S + S / 2}" r="${S * .38}" fill="${(COL[c] || COL.r)[0]}" stroke="${(COL[c] || COL.r)[1]}" stroke-width="2"/></g>`; });
    }
    return `<svg class="dg${bigOne ? ' big' : ''}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" dir="ltr" aria-hidden="true" style="--ln:${line}"><defs><marker id="hsArr2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 1 9 5 0 9z" fill="#d8423a"/></marker></defs>${out.join('')}${body}</svg>`;
  }

  window.Historia = { sync, open, has, close: () => close(), go, fit, get on() { return on; }, _diag: diag };
})();
