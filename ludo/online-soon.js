/* Ludo & Pachisi — online play is not open yet: the common online dock in its "coming soon" state (as every board game shows it
   while FIREBASE_CONFIG is null — Kōnane's online-ui.js, html.ol-soon): PC a 46px bar along the bottom (● オンライン · 準備中 · 詳しく),
   phones an オンライン tab in the bottom bar (shared/infotabs.js gives it its icon); 詳しく / the tab open a short note.
   The real lobby / rooms / rating replace this once a Firebase project for Ludo exists (claude/ludo-spec.md). */
(function () {
  'use strict';
  const T = {
    ja: ['オンライン', '準備中', '詳しく', 'オンライン対戦は準備中です。', '公開までもうしばらくお待ちください。AI戦・みんなで対戦・レート戦・レッスン・パズルはこのまま遊べます。', '閉じる'],
    en: ['Online', 'Coming soon', 'Details', 'Online play is being prepared.', 'It opens soon. Until then you can play the AI, play together on one device, rated games, lessons and puzzles.', 'Close'],
    zh: ['在线', '准备中', '详情', '在线对战正在准备中。', '即将开放，敬请期待。AI对战、多人同机对战、等级战、课程和谜题现在就能玩。', '关闭'],
    'zh-TW': ['線上', '即將推出', '詳細', '線上對戰準備中。', '即將開放，敬請期待。AI對戰、多人同機對戰、等級戰、課程和謎題現在就能玩。', '關閉'],
    ko: ['온라인', '준비 중', '자세히', '온라인 대전은 준비 중입니다.', '곧 공개됩니다. AI 대전·함께 대전·레이팅전·레슨·퍼즐은 지금 바로 즐길 수 있어요.', '닫기'],
    es: ['En línea', 'Próximamente', 'Detalles', 'El juego en línea se está preparando.', 'Llegará pronto. Mientras tanto puedes jugar contra la IA, en grupo en un dispositivo, partidas clasificatorias, lecciones y puzles.', 'Cerrar'],
    fr: ['En ligne', 'Bientôt', 'Détails', 'Le jeu en ligne est en préparation.', 'Il arrive bientôt. En attendant : l’IA, le jeu à plusieurs sur un appareil, les parties classées, les leçons et les puzzles.', 'Fermer'],
    pt: ['Online', 'Em breve', 'Detalhes', 'O jogo online está sendo preparado.', 'Chega em breve. Enquanto isso, jogue contra a IA, em grupo num aparelho, partidas ranqueadas, lições e quebra-cabeças.', 'Fechar'],
    de: ['Online', 'Demnächst', 'Details', 'Online-Spiel wird vorbereitet.', 'Es kommt bald. Bis dahin: gegen die KI, zusammen an einem Gerät, Wertungspartien, Lektionen und Rätsel.', 'Schließen'],
    ru: ['Онлайн', 'Скоро', 'Подробнее', 'Онлайн-игра готовится.', 'Скоро откроется. А пока можно играть с ИИ, вместе на одном устройстве, рейтинговые партии, уроки и задачи.', 'Закрыть'],
    tr: ['Çevrimiçi', 'Yakında', 'Ayrıntılar', 'Çevrimiçi oyun hazırlanıyor.', 'Yakında açılıyor. O zamana kadar yapay zekâya karşı, tek cihazda birlikte, dereceli oyunlar, dersler ve bulmacalar oynanabilir.', 'Kapat'],
    id: ['Online', 'Segera hadir', 'Detail', 'Permainan online sedang disiapkan.', 'Segera dibuka. Sementara itu, main lawan AI, bersama di satu perangkat, laga peringkat, pelajaran, dan teka-teki.', 'Tutup'],
    hi: ['ऑनलाइन', 'जल्द आ रहा है', 'विवरण', 'ऑनलाइन खेल की तैयारी चल रही है।', 'यह जल्द खुलेगा। तब तक AI से, एक डिवाइस पर साथ मिलकर, रेटेड खेल, पाठ और पहेलियाँ खेलें।', 'बंद करें'],
    ar: ['عبر الإنترنت', 'قريبًا', 'التفاصيل', 'اللعب عبر الإنترنت قيد التجهيز.', 'سيفتح قريبًا. حتى ذلك الحين العب ضد الذكاء الاصطناعي، أو معًا على جهاز واحد، ومباريات التصنيف، والدروس، والألغاز.', 'إغلاق'],
  };
  const L = () => T[document.documentElement.lang] || T[(document.documentElement.lang || '').slice(0, 2)] || T.en;
  document.documentElement.classList.add('ol-dock', 'ol-soon'); document.body.classList.add('ol-soon'); document.body.classList.remove('no-online');
  document.body.insertAdjacentHTML('beforeend', `
<div class="dock" id="dock"><div class="dock-bar" role="button" tabindex="0"><span class="dk-dot"></span><span class="dk-title"></span><span class="dk-stat"></span><span class="dk-sp"></span><button type="button" class="dk-btn dk-soon"></button></div></div>
<div class="overlay" id="olSoon"><div class="modal" style="width:min(420px,100%)"><h2 class="ols-h"></h2><p class="ols-1"></p><p class="ols-2"></p><div class="modal-actions"><button class="mbtn" id="olsClose"></button></div></div></div>`);
  const tab = document.createElement('button'); tab.dataset.t = 'online'; tab.type = 'button';
  const bar = document.getElementById('mtabs'); if (bar) bar.appendChild(tab);
  const ov = document.getElementById('olSoon');
  const paint = () => {
    const l = L(), q = s => document.querySelector(s);
    q('#dock .dk-title').textContent = l[0]; q('#dock .dk-stat').textContent = l[1]; q('#dock .dk-soon').textContent = l[2];
    tab.innerHTML = `<span>${l[0]}</span>`;
    q('#olSoon .ols-h').textContent = l[0]; q('#olSoon .ols-1').textContent = l[3]; q('#olSoon .ols-2').textContent = l[4]; q('#olsClose').textContent = l[5];
  };
  const open = () => { paint(); ov.classList.add('show'); };
  const close = () => ov.classList.remove('show');
  document.querySelector('#dock .dock-bar').addEventListener('click', open);
  document.querySelector('#dock .dock-bar').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  tab.addEventListener('click', e => { e.stopPropagation(); open(); });
  document.getElementById('olsClose').onclick = close;
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('show')) close(); });
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.LudoOnline = { open, available: false };
})();
