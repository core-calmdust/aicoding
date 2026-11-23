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
    ja: { title: '博物館', sub: 'ゲームの生まれた場所、たどってきた道、残された名品を見てまわろう。', map: '地図', mapS: 'どこで生まれた？', tree: '系統樹', treeS: 'どこから来た？', gallery: '所蔵品', galleryS: '名品を間近で', load: '展示室をひらいています…' , chance: '偶然の道具', chanceS: 'さいころの祖先' , paint: '描かれたゲーム', paintS: '絵の中の遊び' , read: '読み物', readS: 'ゲームの謎と物語', passGot: "{room}のスタンプ！", passAll: "スタンプ帳が完成！", passR: "1室ごとに ¢200、6つそろうと さらに ¢1000", mapP: '地図', treeP: '系統樹', galleryP: '所蔵品', paintP: '絵画', readP: '読み物', chanceP: '偶然', pass: 'スタンプ帳', passT: '館内スタンプ帳', passS: '展示室をまわって、6つのスタンプを集めよう。', passGo: '見に行く', t_map: '地図を開く', t_tree: '系統樹を開く', t_gallery: '所蔵品をすべて見る', t_paint: '絵をすべて開く', t_read: '物語のクイズに全問正解', t_chance: '道具をすべて振る', passNo: 'まだ', passX: '閉じる' },
    en: { title: 'Museum', sub: 'Walk through where each game was born, the roads it travelled and the treasures it left behind.', map: 'Map', mapS: 'Where was it born?', tree: 'Family tree', treeS: 'Where did it come from?', gallery: 'Collection', galleryS: 'Treasures up close', load: 'Opening the gallery…' , chance: 'Chance', chanceS: 'Ancestors of the die' , paint: 'In art', paintS: 'Games in pictures' , read: 'Stories', readS: 'Mysteries of play', passGot: "{room} stamped!", passAll: "Stamp book complete!", passR: "¢200 for each room, and ¢1,000 more for all six", mapP: 'Map', treeP: 'Tree', galleryP: 'Collection', paintP: 'Art', readP: 'Stories', chanceP: 'Chance', pass: 'Stamps', passT: 'Museum stamp book', passS: 'Visit the rooms and collect all six stamps.', passGo: 'Go', t_map: 'Open the map', t_tree: 'Open the family tree', t_gallery: 'See every piece in the collection', t_paint: 'Open every painting', t_read: 'Ace every story quiz', t_chance: 'Throw every tool', passNo: 'Not yet', passX: 'Close' },
    zh: { title: '博物馆', sub: '走访游戏诞生的地方、走过的道路，以及留下的珍品。', map: '地图', mapS: '诞生在哪里？', tree: '谱系树', treeS: '从哪里来？', gallery: '馆藏', galleryS: '近看珍品', load: '正在打开展厅…' , chance: '掷具', chanceS: '骰子的祖先' , paint: '画中游戏', paintS: '画里的游戏' , read: '读物', readS: '游戏的谜与故事', passGot: "{room}的印章到手！", passAll: "印章册集齐了！", passR: "每个展厅 ¢200，集齐6个再得 ¢1000", mapP: '地图', treeP: '谱系', galleryP: '馆藏', paintP: '绘画', readP: '读物', chanceP: '掷具', pass: '印章册', passT: '馆内印章册', passS: '走遍各展厅，集齐6枚印章吧。', passGo: '去看看', t_map: '打开地图', t_tree: '打开谱系树', t_gallery: '看遍所有馆藏', t_paint: '打开所有画作', t_read: '答对所有故事的测验', t_chance: '把每种掷具都掷一次', passNo: '尚未', passX: '关闭' },
    'zh-TW': { title: '博物館', sub: '走訪遊戲誕生的地方、走過的道路，以及留下的珍品。', map: '地圖', mapS: '誕生在哪裡？', tree: '系譜樹', treeS: '從哪裡來？', gallery: '館藏', galleryS: '近看珍品', load: '正在打開展廳…' , chance: '擲具', chanceS: '骰子的祖先' , paint: '畫中遊戲', paintS: '畫裡的遊戲' , read: '讀物', readS: '遊戲的謎與故事', passGot: "{room}的印章到手！", passAll: "印章冊集齊了！", passR: "每個展廳 ¢200，集齊6個再得 ¢1000", mapP: '地圖', treeP: '系譜', galleryP: '館藏', paintP: '繪畫', readP: '讀物', chanceP: '擲具', pass: '印章冊', passT: '館內印章冊', passS: '走遍各展廳，集齊6枚印章吧。', passGo: '去看看', t_map: '打開地圖', t_tree: '打開系譜樹', t_gallery: '看遍所有館藏', t_paint: '打開所有畫作', t_read: '答對所有故事的測驗', t_chance: '把每種擲具都擲一次', passNo: '尚未', passX: '關閉' },
    ko: { title: '박물관', sub: '게임이 태어난 곳, 걸어온 길, 남겨진 명품을 둘러보세요.', map: '지도', mapS: '어디서 태어났을까?', tree: '계통수', treeS: '어디서 왔을까?', gallery: '소장품', galleryS: '명품을 가까이서', load: '전시실을 여는 중…' , chance: '우연의 도구', chanceS: '주사위의 조상' , paint: '그림 속 게임', paintS: '그림 속의 놀이' , read: '읽을거리', readS: '게임의 수수께끼', passGot: "{room} 스탬프 획득!", passAll: "스탬프북 완성!", passR: "전시실마다 ¢200, 6개를 모두 모으면 ¢1000 추가", mapP: '지도', treeP: '계통수', galleryP: '소장품', paintP: '그림', readP: '이야기', chanceP: '우연', pass: '스탬프북', passT: '관내 스탬프북', passS: '전시실을 돌며 스탬프 6개를 모아 보세요.', passGo: '보러 가기', t_map: '지도 열기', t_tree: '계통수 열기', t_gallery: '소장품 모두 보기', t_paint: '그림 모두 열기', t_read: '이야기 퀴즈 모두 정답', t_chance: '도구 모두 던지기', passNo: '아직', passX: '닫기' },
    es: { title: 'Museo', sub: 'Recorre dónde nació cada juego, los caminos que siguió y los tesoros que dejó.', map: 'Mapa', mapS: '¿Dónde nació?', tree: 'Árbol', treeS: '¿De dónde viene?', gallery: 'Colección', galleryS: 'Tesoros de cerca', load: 'Abriendo la sala…' , chance: 'Azar', chanceS: 'Antepasados del dado' , paint: 'En el arte', paintS: 'Juegos en imágenes' , read: 'Historias', readS: 'Misterios del juego', passGot: "¡Sello de {room}!", passAll: "¡Libro de sellos completo!", passR: "¢200 por cada sala y ¢1.000 más por las seis", mapP: 'Mapa', treeP: 'Árbol', galleryP: 'Colección', paintP: 'Arte', readP: 'Historias', chanceP: 'Azar', pass: 'Sellos', passT: 'Libro de sellos del museo', passS: 'Recorre las salas y reúne los seis sellos.', passGo: 'Ir', t_map: 'Abrir el mapa', t_tree: 'Abrir el árbol', t_gallery: 'Ver todas las piezas de la colección', t_paint: 'Abrir todas las pinturas', t_read: 'Acertar todos los cuestionarios', t_chance: 'Lanzar todos los instrumentos', passNo: 'Aún no', passX: 'Cerrar' },
    fr: { title: 'Musée', sub: 'Découvrez où chaque jeu est né, les routes qu’il a suivies et les trésors qu’il a laissés.', map: 'Carte', mapS: 'Où est-il né ?', tree: 'Arbre', treeS: 'D’où vient-il ?', gallery: 'Collection', galleryS: 'Trésors de près', load: 'Ouverture de la salle…' , chance: 'Hasard', chanceS: 'Ancêtres du dé' , paint: 'Dans l’art', paintS: 'Les jeux en images' , read: 'Histoires', readS: 'Énigmes du jeu', passGot: "Tampon {room} !", passAll: "Carnet de tampons complet !", passR: "¢200 par salle, et ¢1 000 de plus pour les six", mapP: 'Carte', treeP: 'Arbre', galleryP: 'Collection', paintP: 'Art', readP: 'Histoires', chanceP: 'Hasard', pass: 'Tampons', passT: 'Carnet de tampons du musée', passS: 'Parcourez les salles et réunissez les six tampons.', passGo: 'Y aller', t_map: 'Ouvrir la carte', t_tree: 'Ouvrir l’arbre', t_gallery: 'Voir toutes les pièces de la collection', t_paint: 'Ouvrir toutes les œuvres', t_read: 'Réussir tous les quiz des histoires', t_chance: 'Lancer chaque instrument', passNo: 'Pas encore', passX: 'Fermer' },
    pt: { title: 'Museu', sub: 'Percorra onde cada jogo nasceu, os caminhos que seguiu e os tesouros que deixou.', map: 'Mapa', mapS: 'Onde nasceu?', tree: 'Árvore', treeS: 'De onde veio?', gallery: 'Acervo', galleryS: 'Tesouros de perto', load: 'Abrindo a sala…' , chance: 'Acaso', chanceS: 'Ancestrais do dado' , paint: 'Na arte', paintS: 'Jogos em imagens' , read: 'Histórias', readS: 'Mistérios do jogo', passGot: "Carimbo de {room}!", passAll: "Livro de carimbos completo!", passR: "¢200 por sala e mais ¢1.000 pelas seis", mapP: 'Mapa', treeP: 'Árvore', galleryP: 'Acervo', paintP: 'Arte', readP: 'Histórias', chanceP: 'Acaso', pass: 'Carimbos', passT: 'Livro de carimbos do museu', passS: 'Percorra as salas e junte os seis carimbos.', passGo: 'Ir', t_map: 'Abrir o mapa', t_tree: 'Abrir a árvore', t_gallery: 'Ver todas as peças do acervo', t_paint: 'Abrir todas as obras', t_read: 'Acertar todos os quizzes', t_chance: 'Lançar todos os instrumentos', passNo: 'Ainda não', passX: 'Fechar' },
    de: { title: 'Museum', sub: 'Entdecke, wo jedes Spiel entstand, welche Wege es nahm und welche Schätze es hinterließ.', map: 'Karte', mapS: 'Wo entstand es?', tree: 'Stammbaum', treeS: 'Woher kommt es?', gallery: 'Sammlung', galleryS: 'Schätze aus der Nähe', load: 'Saal wird geöffnet…' , chance: 'Zufall', chanceS: 'Ahnen des Würfels' , paint: 'In der Kunst', paintS: 'Spiele im Bild' , read: 'Geschichten', readS: 'Rätsel des Spiels', passGot: "Stempel: {room}!", passAll: "Stempelheft komplett!", passR: "¢200 pro Saal und ¢1.000 extra für alle sechs", mapP: 'Karte', treeP: 'Baum', galleryP: 'Sammlung', paintP: 'Kunst', readP: 'Texte', chanceP: 'Zufall', pass: 'Stempel', passT: 'Stempelheft des Museums', passS: 'Geh durch die Säle und sammle alle sechs Stempel.', passGo: 'Hin', t_map: 'Karte öffnen', t_tree: 'Stammbaum öffnen', t_gallery: 'Alle Stücke der Sammlung ansehen', t_paint: 'Alle Kunstwerke öffnen', t_read: 'Alle Quiz fehlerfrei lösen', t_chance: 'Jedes Wurfgerät werfen', passNo: 'Noch nicht', passX: 'Schließen' },
    ru: { title: 'Музей', sub: 'Где родилась каждая игра, какими дорогами шла и какие сокровища оставила.', map: 'Карта', mapS: 'Где родилась?', tree: 'Древо', treeS: 'Откуда пришла?', gallery: 'Коллекция', galleryS: 'Сокровища вблизи', load: 'Открываем зал…' , chance: 'Случай', chanceS: 'Предки кубика' , paint: 'В искусстве', paintS: 'Игры на картинах' , read: 'Истории', readS: 'Загадки игр', passGot: "Штамп «{room}»!", passAll: "Книжка штампов собрана!", passR: "¢200 за каждый зал и ещё ¢1000 за все шесть", mapP: 'Карта', treeP: 'Древо', galleryP: 'Фонды', paintP: 'Картины', readP: 'Истории', chanceP: 'Случай', pass: 'Штампы', passT: 'Книжка штампов музея', passS: 'Обойдите залы и соберите все шесть штампов.', passGo: 'Перейти', t_map: 'Открыть карту', t_tree: 'Открыть древо', t_gallery: 'Посмотреть все экспонаты коллекции', t_paint: 'Открыть все картины', t_read: 'Пройти все викторины без ошибок', t_chance: 'Бросить каждый инструмент', passNo: 'Пока нет', passX: 'Закрыть' },
    tr: { title: 'Müze', sub: 'Her oyunun doğduğu yeri, izlediği yolları ve geride bıraktığı hazineleri gez.', map: 'Harita', mapS: 'Nerede doğdu?', tree: 'Soy ağacı', treeS: 'Nereden geldi?', gallery: 'Koleksiyon', galleryS: 'Hazineler yakından', load: 'Salon açılıyor…' , chance: 'Şans', chanceS: 'Zarın ataları' , paint: 'Sanatta', paintS: 'Resimlerde oyunlar' , read: 'Hikâyeler', readS: 'Oyunların sırları', passGot: "{room} damgası!", passAll: "Damga defteri tamam!", passR: "Her salon için ¢200, altısı için ayrıca ¢1000", mapP: 'Harita', treeP: 'Ağaç', galleryP: 'Koleksiyon', paintP: 'Sanat', readP: 'Hikâyeler', chanceP: 'Şans', pass: 'Damgalar', passT: 'Müze damga defteri', passS: 'Salonları gezin ve altı damganın hepsini toplayın.', passGo: 'Git', t_map: 'Haritayı aç', t_tree: 'Soy ağacını aç', t_gallery: 'Koleksiyondaki her eseri gör', t_paint: 'Her resmi aç', t_read: 'Tüm hikâye testlerini hatasız geç', t_chance: 'Her aracı at', passNo: 'Henüz değil', passX: 'Kapat' },
    id: { title: 'Museum', sub: 'Jelajahi tempat lahir setiap permainan, jalan yang ditempuhnya, dan harta yang ditinggalkannya.', map: 'Peta', mapS: 'Lahir di mana?', tree: 'Silsilah', treeS: 'Dari mana asalnya?', gallery: 'Koleksi', galleryS: 'Harta dari dekat', load: 'Membuka ruang pamer…' , chance: 'Peluang', chanceS: 'Leluhur dadu' , paint: 'Dalam seni', paintS: 'Permainan dalam gambar' , read: 'Kisah', readS: 'Misteri permainan', passGot: "Stempel {room}!", passAll: "Buku stempel lengkap!", passR: "¢200 untuk tiap ruang, dan ¢1.000 lagi untuk keenamnya", mapP: 'Peta', treeP: 'Silsilah', galleryP: 'Koleksi', paintP: 'Lukisan', readP: 'Kisah', chanceP: 'Peluang', pass: 'Stempel', passT: 'Buku stempel museum', passS: 'Jelajahi ruang-ruang dan kumpulkan keenam stempel.', passGo: 'Kunjungi', t_map: 'Buka peta', t_tree: 'Buka silsilah', t_gallery: 'Lihat semua koleksi', t_paint: 'Buka semua lukisan', t_read: 'Jawab benar semua kuis kisah', t_chance: 'Lempar setiap alat', passNo: 'Belum', passX: 'Tutup' },
    hi: { title: 'संग्रहालय', sub: 'हर खेल कहाँ जन्मा, किन रास्तों से गुज़रा और कौन‑से ख़ज़ाने छोड़ गया — घूमकर देखें।', map: 'नक्शा', mapS: 'कहाँ जन्मा?', tree: 'वंश‑वृक्ष', treeS: 'कहाँ से आया?', gallery: 'संग्रह', galleryS: 'ख़ज़ाने पास से', load: 'कक्ष खुल रहा है…' , chance: 'संयोग', chanceS: 'पासे के पुरखे' , paint: 'कला में', paintS: 'चित्रों में खेल' , read: 'कहानियाँ', readS: 'खेलों के रहस्य', passGot: "{room} की मुहर!", passAll: "मुहर‑पुस्तिका पूरी!", passR: "हर कक्ष के लिए ¢200, और छहों पर ¢1000 अतिरिक्त", mapP: 'नक्शा', treeP: 'वृक्ष', galleryP: 'संग्रह', paintP: 'चित्र', readP: 'कहानियाँ', chanceP: 'संयोग', pass: 'मुहरें', passT: 'संग्रहालय की मुहर‑पुस्तिका', passS: 'कक्षों में घूमें और सभी छह मुहरें जुटाएँ।', passGo: 'जाएँ', t_map: 'नक्शा खोलें', t_tree: 'वंश‑वृक्ष खोलें', t_gallery: 'संग्रह की हर वस्तु देखें', t_paint: 'हर चित्र खोलें', t_read: 'हर कहानी की प्रश्नोत्तरी सही करें', t_chance: 'हर पासा‑साधन फेंकें', passNo: 'अभी नहीं', passX: 'बंद करें' },
    ar: { title: 'المتحف', sub: 'تجوّل بين مواطن ولادة كل لعبة، والطرق التي سلكتها، والكنوز التي خلّفتها.', map: 'الخريطة', mapS: 'أين وُلدت؟', tree: 'شجرة النسب', treeS: 'من أين جاءت؟', gallery: 'المقتنيات', galleryS: 'كنوز عن قرب', load: 'جارٍ فتح القاعة…' , chance: 'الحظ', chanceS: 'أسلاف النرد' , paint: 'في الفن', paintS: 'الألعاب في الصور' , read: 'حكايات', readS: 'أسرار الألعاب', passGot: "ختم {room}!", passAll: "اكتمل دفتر الأختام!", passR: "¢200 لكل قاعة، و¢1000 إضافية عند جمع الستة", mapP: 'الخريطة', treeP: 'الشجرة', galleryP: 'المقتنيات', paintP: 'الفن', readP: 'حكايات', chanceP: 'الحظ', pass: 'الأختام', passT: 'دفتر أختام المتحف', passS: 'تجوّل في القاعات واجمع الأختام الستة.', passGo: 'اذهب', t_map: 'افتح الخريطة', t_tree: 'افتح شجرة النسب', t_gallery: 'شاهد كل قطع المقتنيات', t_paint: 'افتح كل اللوحات', t_read: 'أجب عن كل اختبارات الحكايات بلا خطأ', t_chance: 'ارمِ كل أداة', passNo: 'ليس بعد', passX: 'إغلاق' },
  };
  const ICON = {
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    tree: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8.4 6h2.1c1.6 0 2.5.8 2.5 2.4v1.2c0 1.6.9 2.4 2.5 2.4h.1M8.4 18h2.1c1.6 0 2.5-.8 2.5-2.4v-1.2c0-1.6.9-2.4 2.5-2.4"/>',
    gallery: '<path d="M3.5 9.5 12 4.5l8.5 5"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3.5 20h17"/>',
    paint: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="5.5" y="6.5" width="13" height="11" rx="1"/><path d="M6.5 16l3.6-4 2.6 2.6 2.1-2.1 2.7 3.5"/><circle cx="9.2" cy="9.5" r="1.2" fill="currentColor"/>',
    read: '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5z"/><path d="M12 6.5v13M6.5 8.5c1.4-.1 2.8.1 3.8.6M6.5 11.5c1.4-.1 2.8.1 3.8.6M13.7 9.1c1-.5 2.4-.7 3.8-.6"/>',
    chance: '<rect x="3.5" y="9" width="11" height="11" rx="2.5"/><circle cx="6.8" cy="12.3" r="1.1" fill="currentColor"/><circle cx="11.2" cy="16.7" r="1.1" fill="currentColor"/><path d="M13.5 4.5c2.6-1 5.4.4 6.2 3 .5 1.6-.1 3.3-1.4 4.3M14.5 9.5c.6-.8 1.7-1.1 2.6-.6"/>',
  };
  // the rooms, in order. src: scripts loaded the first time the room opens; ready(): the room's code is there
  const ROOMS = [
    { id: 'map', ready: () => !!window.AtlasMap, render: (el, c) => AtlasMap.render(el, c) },
    { id: 'tree', src: ['museum/tree.js?v=3'], ready: () => !!window.AtlasTree, render: (el, c) => AtlasTree.render(el, c) },
    { id: 'gallery', src: ['museum/gallery.js?v=146'], ready: () => !!window.AtlasGallery, render: (el, c) => AtlasGallery.render(el, c) },
    { id: 'paint', src: ['museum/paint-i18n.js?v=2', 'museum/paint.js?v=5'], ready: () => !!(window.AtlasPaint && window.MUSEUM_PAINT_T), render: (el, c) => AtlasPaint.render(el, c) },
    { id: 'read', src: ['museum/read-i18n.js?v=4', 'museum/read.js?v=5'], ready: () => !!(window.AtlasRead && window.MUSEUM_READ_T), render: (el, c) => AtlasRead.render(el, c) },
    { id: 'chance', src: ['museum/chance-i18n.js?v=2', 'museum/chance.js?v=3'], ready: () => !!(window.AtlasChance && window.MUSEUM_CHANCE_T), render: (el, c) => AtlasChance.render(el, c) },
  ];
  const KEY = 'atlas-museum-room';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  let host = null, ctx = null, lang = 'ja', room = null, el = {};
  const u = k => (UI[lang] || UI.en)[k] || UI.en[k];
  const saved = () => { try { const r = localStorage.getItem(KEY); return ROOMS.some(x => x.id === r) ? r : null; } catch (e) { return null; } };

  function bar() {
    el.rooms.style.setProperty('--n', ROOMS.length); el.rooms.style.setProperty('--h', ROOMS.length <= 4 ? ROOMS.length : Math.ceil(ROOMS.length / 2));
    // (a phone: one strip of all the rooms, icon over a short name — like the games' own menus, 2026-11-24 ユーザー)
    el.rooms.innerHTML = ROOMS.map(r => `<button type="button" class="murm" data-r="${r.id}" role="tab" aria-selected="${r.id === room}"><span class="mui"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[r.id]}</svg></span><span class="mut"><b>${esc(u(r.id))}</b><small>${esc(u(r.id + 'S'))}</small></span><span class="mup">${esc(u(r.id + 'P') !== r.id + 'P' ? u(r.id + 'P') : u(r.id))}</span></button>`).join('');
    el.rooms.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (b.dataset.r !== room) open(b.dataset.r, true); });
    fitBar();
  }
  // the short names shrink (to 8.5px at the least) until each fits its button
  function fitBar() {
    if (!el || !el.rooms) return;
    requestAnimationFrame(() => el.rooms.querySelectorAll('.mup').forEach(s => { s.style.fontSize = ''; if (!s.offsetWidth) return; let f = parseFloat(getComputedStyle(s).fontSize); while (s.scrollWidth > s.clientWidth + 0.5 && f > 8.5) { f -= 0.5; s.style.fontSize = f + 'px'; } }));
  }
  addEventListener('resize', () => fitBar());
  try { document.fonts && document.fonts.ready.then(() => fitBar()); } catch (e) {}
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
    if (room === 'map' || room === 'tree') mark(room, room, 1);
    const go = () => { if (room === R.id) R.render(box, rctx()); };
    if (R.ready()) go();
    else { box.innerHTML = `<p class="muload">${esc(u('load'))}</p>`; Promise.all((R.src || []).map(load)).then(go); }
    if (user && innerWidth < 820) { const t = el.rooms.getBoundingClientRect().top + scrollY - 70; if (scrollY > t) scrollTo({ top: Math.max(0, t), behavior: 'smooth' }); }
  }
  // 館内スタンプ帳 (2026-11-24): each room reports what the visitor has done there — mark(room, ids, total): ids seen/done (a list or one),
  // total the room's count; map and tree count as done once opened. 'atlas-museum-prog' = { room: { ids: [...], n: total } }. A room is
  // stamped when every one of its n is done. The book: the button by the title → a panel of the six rooms with their progress.
  const PK = 'atlas-museum-prog';
  const prog = () => { try { return JSON.parse(localStorage.getItem(PK) || '{}') || {}; } catch (e) { return {}; } };
  function mark(r, ids, n) {
    const P = prog(), e = P[r] || (P[r] = { ids: [], n: 0 }); let ch = false;
    [].concat(ids == null ? [] : ids).forEach(id => { if (!e.ids.includes(id)) { e.ids.push(id); ch = true; } });
    if (n && e.n !== n) { e.n = n; ch = true; }
    if (ch) { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (x) {} pay(); passBtn(); if (el.pass && el.pass.classList.contains('on')) passPanel(); }
  }
  // the reward (2026-11-24 ユーザー: コインで): ¢200 the first time a room is stamped, ¢1000 more when all six are; paid once
  // ('atlas-museum-prog'._paid: the rooms paid for, ._all: the book). ctx.coins adds to the wallet (W.bonus) with the coin sound.
  const ROOM_COINS = 200, BOOK_COINS = 1000;
  function pay() {
    if (!ctx || !ctx.coins) return;
    const P = prog(), paid = P._paid || (P._paid = []), nw = ROOMS.filter(r => stamped(r.id) && !paid.includes(r.id)); let all = false;
    nw.forEach(r => paid.push(r.id));
    if (!P._all && ROOMS.every(r => paid.includes(r.id))) { P._all = 1; all = true; }
    if (!nw.length && !all) return;
    try { localStorage.setItem(PK, JSON.stringify(P)); } catch (x) {}
    const n = nw.length * ROOM_COINS + (all ? BOOK_COINS : 0);
    try { ctx.coins(n); } catch (x) {}
    toast(all ? u('passAll') : u('passGot').replace('{room}', nw.map(r => u(r.id)).join('・')), n);
  }
  function toast(msg, n) {
    const t = document.createElement('div'); t.className = 'mutoast'; t.setAttribute('role', 'status');
    t.innerHTML = `<img src="../images/atlas/av/musowl-0.webp" alt=""><b>${esc(msg)}</b><span dir="ltr"><i>¢</i>+${n.toLocaleString()}</span>`;
    document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 2600);
  }
  const pstate = r => { const e = prog()[r]; if (!e || !e.n) return { d: 0, n: 0 }; return { d: Math.min(e.ids.length, e.n), n: e.n }; };
  const stamped = r => { const p = pstate(r); return p.n > 0 && p.d >= p.n; };
  function passBtn() { if (!el.pbtn) return; const k = ROOMS.filter(r => stamped(r.id)).length; el.pbtn.innerHTML = `<img src="../images/atlas/av/musowl-${k >= ROOMS.length ? 3 : k >= 4 ? 2 : k >= 2 ? 1 : 0}.webp" alt=""><b>${esc(u('pass'))}</b><i>${k} / ${ROOMS.length}</i>`; }
  function passPanel() {
    const box = el.pass;
    box.innerHTML = `<div class="mupass-h"><b>${esc(u('passT'))}</b><small>${esc(u('passS'))}</small><small class="mupass-rw">${esc(u('passR'))}</small><button type="button" class="mupass-x" aria-label="${esc(u('passX'))}">×</button></div>
      <div class="mupass-l">${ROOMS.map(r => { const p = pstate(r.id), ok = stamped(r.id), one = r.id === 'map' || r.id === 'tree';
        return `<div class="mupass-r${ok ? ' ok' : ''}"><span class="mupass-s"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[r.id]}</svg>${ok ? '<i>✓</i>' : ''}</span>
          <span class="mupass-t"><b>${esc(u(r.id))}</b><small>${esc(u('t_' + r.id))}</small>${one ? '' : `<span class="mupass-bar"><span style="width:${p.n ? Math.round(p.d / p.n * 100) : 0}%"></span></span>`}</span>
          <em dir="ltr">${one ? (ok ? '✓' : esc(u('passNo'))) : p.n ? `${p.d} / ${p.n}` : esc(u('passNo'))}</em>
          <button type="button" class="btn ghost sm" data-go="${r.id}">${esc(u('passGo'))}</button></div>`; }).join('')}</div>`;
    box.querySelector('.mupass-x').onclick = () => passToggle(false);
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { passToggle(false); open(b.dataset.go, true); });
  }
  function passToggle(on) { const o = on == null ? !el.pass.classList.contains('on') : on; if (o) passPanel(); el.pass.classList.toggle('on', o); el.pbtn.setAttribute('aria-expanded', o); }
  // what a room is given: the portal's ctx, and goEx(id) — open a piece of the collection (from another room's link)
  function goEx(id) { open('gallery', true); let n = 0; const t = () => { if (window.AtlasGallery && host.querySelector('.muroom[data-r="gallery"] .gxgrid .gxc')) AtlasGallery.open(id); else if (++n < 100) setTimeout(t, 100); }; t(); }
  const rctx = () => Object.assign({}, ctx, { goEx, goRoom: r => open(r, true) });
  function render(sec, c) {
    ctx = c; lang = UI[c.lang] ? c.lang : 'en';
    if (host !== sec || !sec.querySelector('.murooms')) {
      host = sec;
      sec.innerHTML = `<div class="muhead"><h2 class="h" id="muTtl"></h2><p class="musub" id="muSub"></p><button type="button" class="mupbtn" id="muPass" aria-expanded="false"></button></div>
        <div class="mupass" id="muPassP"></div><div class="murooms" id="muRooms" role="tablist"></div><div class="mustage" id="muStage"></div>`;
      el = { rooms: sec.querySelector('#muRooms'), stage: sec.querySelector('#muStage'), pass: sec.querySelector('#muPassP'), pbtn: sec.querySelector('#muPass') };
      el.pbtn.onclick = () => passToggle();
    }
    sec.querySelector('#muTtl').textContent = u('title'); sec.querySelector('#muSub').textContent = u('sub');
    const want = c.room || room || saved() || 'map';
    room = want; bar(); passBtn(); if (el.pass.classList.contains('on')) passPanel(); open(want, false);
  }
  window.AtlasMuseum = { render, room: () => room, ROOMS, V, goEx, go: r => open(r, true), mark, prog };
})();
