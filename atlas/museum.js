/* World Board Game Atlas — 博物館 (Museum tab, 2026-11-21): one tab that holds the "looking" rooms of the encyclopedia —
   地図 (where each game was born, atlas/worldmap.js), 系統樹 (where each game came from, atlas/museum/tree.js) and more rooms
   as they open (所蔵品, …). A row of room buttons under the title switches rooms; the last room is remembered
   (localStorage 'atlas-museum-room'), so the tab opens straight into it — the map is still one tap away.
   app.js calls AtlasMuseum.render(section, ctx) when the tab is shown or the language changes; ctx.room forces a room
   (the old #map link). Rooms that need code load it the first time they are opened (ROOMS[].src). */
(function () {
  'use strict';
  const V = 1;
  const UI = {
    ja: { title: '博物館', sub: 'ゲームの生まれた場所、たどってきた道、残された名品を見てまわろう。', map: '地図', mapS: 'どこで生まれた？', tree: '系統樹', treeS: 'どこから来た？', gallery: '所蔵品', galleryS: '名品を間近で', load: '展示室をひらいています…' },
    en: { title: 'Museum', sub: 'Walk through where each game was born, the roads it travelled and the treasures it left behind.', map: 'Map', mapS: 'Where was it born?', tree: 'Family tree', treeS: 'Where did it come from?', gallery: 'Collection', galleryS: 'Treasures up close', load: 'Opening the gallery…' },
    zh: { title: '博物馆', sub: '走访游戏诞生的地方、走过的道路，以及留下的珍品。', map: '地图', mapS: '诞生在哪里？', tree: '谱系树', treeS: '从哪里来？', gallery: '馆藏', galleryS: '近看珍品', load: '正在打开展厅…' },
    'zh-TW': { title: '博物館', sub: '走訪遊戲誕生的地方、走過的道路，以及留下的珍品。', map: '地圖', mapS: '誕生在哪裡？', tree: '系譜樹', treeS: '從哪裡來？', gallery: '館藏', galleryS: '近看珍品', load: '正在打開展廳…' },
    ko: { title: '박물관', sub: '게임이 태어난 곳, 걸어온 길, 남겨진 명품을 둘러보세요.', map: '지도', mapS: '어디서 태어났을까?', tree: '계통수', treeS: '어디서 왔을까?', gallery: '소장품', galleryS: '명품을 가까이서', load: '전시실을 여는 중…' },
    es: { title: 'Museo', sub: 'Recorre dónde nació cada juego, los caminos que siguió y los tesoros que dejó.', map: 'Mapa', mapS: '¿Dónde nació?', tree: 'Árbol', treeS: '¿De dónde viene?', gallery: 'Colección', galleryS: 'Tesoros de cerca', load: 'Abriendo la sala…' },
    fr: { title: 'Musée', sub: 'Découvrez où chaque jeu est né, les routes qu’il a suivies et les trésors qu’il a laissés.', map: 'Carte', mapS: 'Où est-il né ?', tree: 'Arbre', treeS: 'D’où vient-il ?', gallery: 'Collection', galleryS: 'Trésors de près', load: 'Ouverture de la salle…' },
    pt: { title: 'Museu', sub: 'Percorra onde cada jogo nasceu, os caminhos que seguiu e os tesouros que deixou.', map: 'Mapa', mapS: 'Onde nasceu?', tree: 'Árvore', treeS: 'De onde veio?', gallery: 'Acervo', galleryS: 'Tesouros de perto', load: 'Abrindo a sala…' },
    de: { title: 'Museum', sub: 'Entdecke, wo jedes Spiel entstand, welche Wege es nahm und welche Schätze es hinterließ.', map: 'Karte', mapS: 'Wo entstand es?', tree: 'Stammbaum', treeS: 'Woher kommt es?', gallery: 'Sammlung', galleryS: 'Schätze aus der Nähe', load: 'Saal wird geöffnet…' },
    ru: { title: 'Музей', sub: 'Где родилась каждая игра, какими дорогами шла и какие сокровища оставила.', map: 'Карта', mapS: 'Где родилась?', tree: 'Древо', treeS: 'Откуда пришла?', gallery: 'Коллекция', galleryS: 'Сокровища вблизи', load: 'Открываем зал…' },
    tr: { title: 'Müze', sub: 'Her oyunun doğduğu yeri, izlediği yolları ve geride bıraktığı hazineleri gez.', map: 'Harita', mapS: 'Nerede doğdu?', tree: 'Soy ağacı', treeS: 'Nereden geldi?', gallery: 'Koleksiyon', galleryS: 'Hazineler yakından', load: 'Salon açılıyor…' },
    id: { title: 'Museum', sub: 'Jelajahi tempat lahir setiap permainan, jalan yang ditempuhnya, dan harta yang ditinggalkannya.', map: 'Peta', mapS: 'Lahir di mana?', tree: 'Silsilah', treeS: 'Dari mana asalnya?', gallery: 'Koleksi', galleryS: 'Harta dari dekat', load: 'Membuka ruang pamer…' },
    hi: { title: 'संग्रहालय', sub: 'हर खेल कहाँ जन्मा, किन रास्तों से गुज़रा और कौन‑से ख़ज़ाने छोड़ गया — घूमकर देखें।', map: 'नक्शा', mapS: 'कहाँ जन्मा?', tree: 'वंश‑वृक्ष', treeS: 'कहाँ से आया?', gallery: 'संग्रह', galleryS: 'ख़ज़ाने पास से', load: 'कक्ष खुल रहा है…' },
    ar: { title: 'المتحف', sub: 'تجوّل بين مواطن ولادة كل لعبة، والطرق التي سلكتها، والكنوز التي خلّفتها.', map: 'الخريطة', mapS: 'أين وُلدت؟', tree: 'شجرة النسب', treeS: 'من أين جاءت؟', gallery: 'المقتنيات', galleryS: 'كنوز عن قرب', load: 'جارٍ فتح القاعة…' },
  };
  const ICON = {
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    tree: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8.4 6h2.1c1.6 0 2.5.8 2.5 2.4v1.2c0 1.6.9 2.4 2.5 2.4h.1M8.4 18h2.1c1.6 0 2.5-.8 2.5-2.4v-1.2c0-1.6.9-2.4 2.5-2.4"/>',
    gallery: '<path d="M3.5 9.5 12 4.5l8.5 5"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3.5 20h17"/>',
  };
  // the rooms, in order. src: scripts loaded the first time the room opens; ready(): the room's code is there
  const ROOMS = [
    { id: 'map', ready: () => !!window.AtlasMap, render: (el, c) => AtlasMap.render(el, c) },
    { id: 'tree', src: ['museum/tree.js?v=3'], ready: () => !!window.AtlasTree, render: (el, c) => AtlasTree.render(el, c) },
    { id: 'gallery', src: ['museum/gallery.js?v=52'], ready: () => !!window.AtlasGallery, render: (el, c) => AtlasGallery.render(el, c) },
  ];
  const KEY = 'atlas-museum-room';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  let host = null, ctx = null, lang = 'ja', room = null, el = {};
  const u = k => (UI[lang] || UI.en)[k] || UI.en[k];
  const saved = () => { try { const r = localStorage.getItem(KEY); return ROOMS.some(x => x.id === r) ? r : null; } catch (e) { return null; } };

  function bar() {
    el.rooms.innerHTML = ROOMS.map(r => `<button type="button" class="murm" data-r="${r.id}" role="tab" aria-selected="${r.id === room}"><span class="mui"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[r.id]}</svg></span><span class="mut"><b>${esc(u(r.id))}</b><small>${esc(u(r.id + 'S'))}</small></span></button>`).join('');
    el.rooms.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (b.dataset.r !== room) open(b.dataset.r, true); });
  }
  function open(id, user) {
    const R = ROOMS.find(r => r.id === id) || ROOMS[0];
    room = R.id; host.dataset.room = room;
    try { localStorage.setItem(KEY, room); } catch (e) {}
    el.rooms.querySelectorAll('[data-r]').forEach(b => b.setAttribute('aria-selected', b.dataset.r === room));
    // each room keeps its own box (the map keeps its view and its picked game when you come back to it)
    let box = el.stage.querySelector(`.muroom[data-r="${room}"]`);
    if (!box) { box = document.createElement('div'); box.className = 'muroom'; box.dataset.r = room; el.stage.appendChild(box); }
    el.stage.querySelectorAll('.muroom').forEach(b => b.classList.toggle('on', b === box));
    if (ctx.page) ctx.page(room);   // (ミッション: 地図を開く …)
    const go = () => { if (room === R.id) R.render(box, ctx); };
    if (R.ready()) go();
    else { box.innerHTML = `<p class="muload">${esc(u('load'))}</p>`; Promise.all((R.src || []).map(load)).then(go); }
    if (user && innerWidth < 820) { const t = el.rooms.getBoundingClientRect().top + scrollY - 70; if (scrollY > t) scrollTo({ top: Math.max(0, t), behavior: 'smooth' }); }
  }
  function render(sec, c) {
    ctx = c; lang = UI[c.lang] ? c.lang : 'en';
    if (host !== sec || !sec.querySelector('.murooms')) {
      host = sec;
      sec.innerHTML = `<div class="muhead"><h2 class="h" id="muTtl"></h2><p class="musub" id="muSub"></p></div>
        <div class="murooms" id="muRooms" role="tablist"></div><div class="mustage" id="muStage"></div>`;
      el = { rooms: sec.querySelector('#muRooms'), stage: sec.querySelector('#muStage') };
    }
    sec.querySelector('#muTtl').textContent = u('title'); sec.querySelector('#muSub').textContent = u('sub');
    const want = c.room || room || saved() || 'map';
    room = want; bar(); open(want, false);
  }
  window.AtlasMuseum = { render, room: () => room, ROOMS, V };
})();
