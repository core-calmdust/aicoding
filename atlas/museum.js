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
    ja: { title: '博物館', sub: 'ゲームの生まれた場所、たどってきた道、残された名品を見てまわろう。', map: '地図', mapS: 'どこで生まれた？', tree: '系統樹', treeS: 'どこから来た？', gallery: '所蔵品', galleryS: '名品を間近で', load: '展示室をひらいています…' , chance: '偶然の道具', chanceS: 'さいころの祖先' , paint: '描かれたゲーム', paintS: '絵の中の遊び' , read: '読み物', readS: 'ゲームの謎と物語', passGot: "{room}のスタンプ！", passAll: "スタンプカードが完成！", passR: "スタンプ1つごとに ¢10〜50、部屋をそろえると ボーナス、6部屋そろうと さらに ¢1000", passDone: "{room}がそろった！", passRw: "1つ ¢{a}・そろうと +¢{b}", passRw1: "開くと ¢{b}", mapP: '地図', treeP: '系統樹', galleryP: '所蔵品', paintP: '絵画', readP: '読み物', chanceP: '偶然', pass: 'スタンプカード', passT: 'スタンプカード', passS: '展示室をまわって、6つのスタンプを集めよう。', passGo: '見に行く', t_map: '地図を開く', t_tree: '系統樹を開く', t_gallery: '所蔵品をすべて見る', t_paint: '絵をすべて開く', t_read: '物語のクイズに全問正解', t_chance: '道具をすべて振る', passNo: 'まだ', passX: '閉じる' },
    en: { title: 'Museum', sub: 'Walk through where each game was born, the roads it travelled and the treasures it left behind.', map: 'Map', mapS: 'Where was it born?', tree: 'Family tree', treeS: 'Where did it come from?', gallery: 'Collection', galleryS: 'Treasures up close', load: 'Opening the gallery…' , chance: 'Chance', chanceS: 'Ancestors of the die' , paint: 'In art', paintS: 'Games in pictures' , read: 'Stories', readS: 'Mysteries of play', passGot: "{room} stamped!", passAll: "Stamp card complete!", passR: "¢10–50 for each stamp, a bonus for each full room, and ¢1,000 more for all six", passDone: "{room} complete!", passRw: "¢{a} each · +¢{b} when complete", passRw1: "¢{b} for opening it", mapP: 'Map', treeP: 'Tree', galleryP: 'Collection', paintP: 'Art', readP: 'Stories', chanceP: 'Chance', pass: 'Stamp card', passT: 'Stamp card', passS: 'Visit the rooms and collect all six stamps.', passGo: 'Go', t_map: 'Open the map', t_tree: 'Open the family tree', t_gallery: 'See every piece in the collection', t_paint: 'Open every painting', t_read: 'Ace every story quiz', t_chance: 'Throw every tool', passNo: 'Not yet', passX: 'Close' },
    zh: { title: '博物馆', sub: '走访游戏诞生的地方、走过的道路，以及留下的珍品。', map: '地图', mapS: '诞生在哪里？', tree: '谱系树', treeS: '从哪里来？', gallery: '馆藏', galleryS: '近看珍品', load: '正在打开展厅…' , chance: '掷具', chanceS: '骰子的祖先' , paint: '画中游戏', paintS: '画里的游戏' , read: '读物', readS: '游戏的谜与故事', passGot: "{room}的印章到手！", passAll: "印章卡集齐了！", passR: "每个印章 ¢10–50，集齐一个展厅有奖励，6个展厅集齐再得 ¢1000", passDone: "{room} 集齐了！", passRw: "每个 ¢{a} · 集齐 +¢{b}", passRw1: "打开得 ¢{b}", mapP: '地图', treeP: '谱系', galleryP: '馆藏', paintP: '绘画', readP: '读物', chanceP: '掷具', pass: '印章卡', passT: '印章卡', passS: '走遍各展厅，集齐6枚印章吧。', passGo: '去看看', t_map: '打开地图', t_tree: '打开谱系树', t_gallery: '看遍所有馆藏', t_paint: '打开所有画作', t_read: '答对所有故事的测验', t_chance: '把每种掷具都掷一次', passNo: '尚未', passX: '关闭' },
    'zh-TW': { title: '博物館', sub: '走訪遊戲誕生的地方、走過的道路，以及留下的珍品。', map: '地圖', mapS: '誕生在哪裡？', tree: '系譜樹', treeS: '從哪裡來？', gallery: '館藏', galleryS: '近看珍品', load: '正在打開展廳…' , chance: '擲具', chanceS: '骰子的祖先' , paint: '畫中遊戲', paintS: '畫裡的遊戲' , read: '讀物', readS: '遊戲的謎與故事', passGot: "{room}的印章到手！", passAll: "印章卡集齊了！", passR: "每個印章 ¢10–50，集齊一個展廳有獎勵，6個展廳集齊再得 ¢1000", passDone: "{room} 集齊了！", passRw: "每個 ¢{a} · 集齊 +¢{b}", passRw1: "打開得 ¢{b}", mapP: '地圖', treeP: '系譜', galleryP: '館藏', paintP: '繪畫', readP: '讀物', chanceP: '擲具', pass: '印章卡', passT: '印章卡', passS: '走遍各展廳，集齊6枚印章吧。', passGo: '去看看', t_map: '打開地圖', t_tree: '打開系譜樹', t_gallery: '看遍所有館藏', t_paint: '打開所有畫作', t_read: '答對所有故事的測驗', t_chance: '把每種擲具都擲一次', passNo: '尚未', passX: '關閉' },
    ko: { title: '박물관', sub: '게임이 태어난 곳, 걸어온 길, 남겨진 명품을 둘러보세요.', map: '지도', mapS: '어디서 태어났을까?', tree: '계통수', treeS: '어디서 왔을까?', gallery: '소장품', galleryS: '명품을 가까이서', load: '전시실을 여는 중…' , chance: '우연의 도구', chanceS: '주사위의 조상' , paint: '그림 속 게임', paintS: '그림 속의 놀이' , read: '읽을거리', readS: '게임의 수수께끼', passGot: "{room} 스탬프 획득!", passAll: "스탬프 카드 완성!", passR: "스탬프 하나마다 ¢10~50, 전시실을 다 모으면 보너스, 6개 전시실을 다 모으면 ¢1000 더", passDone: "{room} 완성!", passRw: "하나에 ¢{a} · 다 모으면 +¢{b}", passRw1: "열면 ¢{b}", mapP: '지도', treeP: '계통수', galleryP: '소장품', paintP: '그림', readP: '이야기', chanceP: '우연', pass: '스탬프 카드', passT: '스탬프 카드', passS: '전시실을 돌며 스탬프 6개를 모아 보세요.', passGo: '보러 가기', t_map: '지도 열기', t_tree: '계통수 열기', t_gallery: '소장품 모두 보기', t_paint: '그림 모두 열기', t_read: '이야기 퀴즈 모두 정답', t_chance: '도구 모두 던지기', passNo: '아직', passX: '닫기' },
    es: { title: 'Museo', sub: 'Recorre dónde nació cada juego, los caminos que siguió y los tesoros que dejó.', map: 'Mapa', mapS: '¿Dónde nació?', tree: 'Árbol', treeS: '¿De dónde viene?', gallery: 'Colección', galleryS: 'Tesoros de cerca', load: 'Abriendo la sala…' , chance: 'Azar', chanceS: 'Antepasados del dado' , paint: 'En el arte', paintS: 'Juegos en imágenes' , read: 'Historias', readS: 'Misterios del juego', passGot: "¡Sello de {room}!", passAll: "¡Tarjeta de sellos completa!", passR: "¢10–50 por sello, un premio por cada sala completa y ¢1.000 más por las seis", passDone: "¡{room} completa!", passRw: "¢{a} cada uno · +¢{b} al completar", passRw1: "¢{b} al abrirla", mapP: 'Mapa', treeP: 'Árbol', galleryP: 'Colección', paintP: 'Arte', readP: 'Historias', chanceP: 'Azar', pass: 'Tarjeta de sellos', passT: 'Tarjeta de sellos', passS: 'Recorre las salas y reúne los seis sellos.', passGo: 'Ir', t_map: 'Abrir el mapa', t_tree: 'Abrir el árbol', t_gallery: 'Ver todas las piezas de la colección', t_paint: 'Abrir todas las pinturas', t_read: 'Acertar todos los cuestionarios', t_chance: 'Lanzar todos los instrumentos', passNo: 'Aún no', passX: 'Cerrar' },
    fr: { title: 'Musée', sub: 'Découvrez où chaque jeu est né, les routes qu’il a suivies et les trésors qu’il a laissés.', map: 'Carte', mapS: 'Où est-il né ?', tree: 'Arbre', treeS: 'D’où vient-il ?', gallery: 'Collection', galleryS: 'Trésors de près', load: 'Ouverture de la salle…' , chance: 'Hasard', chanceS: 'Ancêtres du dé' , paint: 'Dans l’art', paintS: 'Les jeux en images' , read: 'Histoires', readS: 'Énigmes du jeu', passGot: "Tampon {room} !", passAll: "Carte de tampons complète !", passR: "¢10–50 par tampon, un bonus par salle complète, et ¢1 000 de plus pour les six", passDone: "{room} : complet !", passRw: "¢{a} chacun · +¢{b} une fois complet", passRw1: "¢{b} en l’ouvrant", mapP: 'Carte', treeP: 'Arbre', galleryP: 'Collection', paintP: 'Art', readP: 'Histoires', chanceP: 'Hasard', pass: 'Carte de tampons', passT: 'Carte de tampons', passS: 'Parcourez les salles et réunissez les six tampons.', passGo: 'Y aller', t_map: 'Ouvrir la carte', t_tree: 'Ouvrir l’arbre', t_gallery: 'Voir toutes les pièces de la collection', t_paint: 'Ouvrir toutes les œuvres', t_read: 'Réussir tous les quiz des histoires', t_chance: 'Lancer chaque instrument', passNo: 'Pas encore', passX: 'Fermer' },
    pt: { title: 'Museu', sub: 'Percorra onde cada jogo nasceu, os caminhos que seguiu e os tesouros que deixou.', map: 'Mapa', mapS: 'Onde nasceu?', tree: 'Árvore', treeS: 'De onde veio?', gallery: 'Acervo', galleryS: 'Tesouros de perto', load: 'Abrindo a sala…' , chance: 'Acaso', chanceS: 'Ancestrais do dado' , paint: 'Na arte', paintS: 'Jogos em imagens' , read: 'Histórias', readS: 'Mistérios do jogo', passGot: "Carimbo de {room}!", passAll: "Cartão de carimbos completo!", passR: "¢10–50 por carimbo, um bônus por sala completa e ¢1.000 a mais pelas seis", passDone: "{room} completa!", passRw: "¢{a} cada · +¢{b} ao completar", passRw1: "¢{b} ao abrir", mapP: 'Mapa', treeP: 'Árvore', galleryP: 'Acervo', paintP: 'Arte', readP: 'Histórias', chanceP: 'Acaso', pass: 'Cartão de carimbos', passT: 'Cartão de carimbos', passS: 'Percorra as salas e junte os seis carimbos.', passGo: 'Ir', t_map: 'Abrir o mapa', t_tree: 'Abrir a árvore', t_gallery: 'Ver todas as peças do acervo', t_paint: 'Abrir todas as obras', t_read: 'Acertar todos os quizzes', t_chance: 'Lançar todos os instrumentos', passNo: 'Ainda não', passX: 'Fechar' },
    de: { title: 'Museum', sub: 'Entdecke, wo jedes Spiel entstand, welche Wege es nahm und welche Schätze es hinterließ.', map: 'Karte', mapS: 'Wo entstand es?', tree: 'Stammbaum', treeS: 'Woher kommt es?', gallery: 'Sammlung', galleryS: 'Schätze aus der Nähe', load: 'Saal wird geöffnet…' , chance: 'Zufall', chanceS: 'Ahnen des Würfels' , paint: 'In der Kunst', paintS: 'Spiele im Bild' , read: 'Geschichten', readS: 'Rätsel des Spiels', passGot: "Stempel: {room}!", passAll: "Stempelkarte komplett!", passR: "¢10–50 pro Stempel, ein Bonus für jeden vollen Raum und ¢1.000 extra für alle sechs", passDone: "{room} vollständig!", passRw: "¢{a} je Stempel · +¢{b} wenn vollständig", passRw1: "¢{b} fürs Öffnen", mapP: 'Karte', treeP: 'Baum', galleryP: 'Sammlung', paintP: 'Kunst', readP: 'Texte', chanceP: 'Zufall', pass: 'Stempelkarte', passT: 'Stempelkarte', passS: 'Geh durch die Säle und sammle alle sechs Stempel.', passGo: 'Hin', t_map: 'Karte öffnen', t_tree: 'Stammbaum öffnen', t_gallery: 'Alle Stücke der Sammlung ansehen', t_paint: 'Alle Kunstwerke öffnen', t_read: 'Alle Quiz fehlerfrei lösen', t_chance: 'Jedes Wurfgerät werfen', passNo: 'Noch nicht', passX: 'Schließen' },
    ru: { title: 'Музей', sub: 'Где родилась каждая игра, какими дорогами шла и какие сокровища оставила.', map: 'Карта', mapS: 'Где родилась?', tree: 'Древо', treeS: 'Откуда пришла?', gallery: 'Коллекция', galleryS: 'Сокровища вблизи', load: 'Открываем зал…' , chance: 'Случай', chanceS: 'Предки кубика' , paint: 'В искусстве', paintS: 'Игры на картинах' , read: 'Истории', readS: 'Загадки игр', passGot: "Штамп «{room}»!", passAll: "Карточка штампов собрана!", passR: "¢10–50 за каждый штамп, бонус за каждый собранный зал и ещё ¢1000 за все шесть", passDone: "{room}: собрано!", passRw: "¢{a} за каждый · +¢{b} за весь зал", passRw1: "¢{b} за открытие", mapP: 'Карта', treeP: 'Древо', galleryP: 'Фонды', paintP: 'Картины', readP: 'Истории', chanceP: 'Случай', pass: 'Карточка штампов', passT: 'Карточка штампов', passS: 'Обойдите залы и соберите все шесть штампов.', passGo: 'Перейти', t_map: 'Открыть карту', t_tree: 'Открыть древо', t_gallery: 'Посмотреть все экспонаты коллекции', t_paint: 'Открыть все картины', t_read: 'Пройти все викторины без ошибок', t_chance: 'Бросить каждый инструмент', passNo: 'Пока нет', passX: 'Закрыть' },
    tr: { title: 'Müze', sub: 'Her oyunun doğduğu yeri, izlediği yolları ve geride bıraktığı hazineleri gez.', map: 'Harita', mapS: 'Nerede doğdu?', tree: 'Soy ağacı', treeS: 'Nereden geldi?', gallery: 'Koleksiyon', galleryS: 'Hazineler yakından', load: 'Salon açılıyor…' , chance: 'Şans', chanceS: 'Zarın ataları' , paint: 'Sanatta', paintS: 'Resimlerde oyunlar' , read: 'Hikâyeler', readS: 'Oyunların sırları', passGot: "{room} damgası!", passAll: "Damga kartı tamam!", passR: "Her damga için ¢10–50, tamamlanan her oda için bonus, altısı için ¢1.000 daha", passDone: "{room} tamam!", passRw: "Her biri ¢{a} · tamamlanınca +¢{b}", passRw1: "Açınca ¢{b}", mapP: 'Harita', treeP: 'Ağaç', galleryP: 'Koleksiyon', paintP: 'Sanat', readP: 'Hikâyeler', chanceP: 'Şans', pass: 'Damga kartı', passT: 'Damga kartı', passS: 'Salonları gezin ve altı damganın hepsini toplayın.', passGo: 'Git', t_map: 'Haritayı aç', t_tree: 'Soy ağacını aç', t_gallery: 'Koleksiyondaki her eseri gör', t_paint: 'Her resmi aç', t_read: 'Tüm hikâye testlerini hatasız geç', t_chance: 'Her aracı at', passNo: 'Henüz değil', passX: 'Kapat' },
    id: { title: 'Museum', sub: 'Jelajahi tempat lahir setiap permainan, jalan yang ditempuhnya, dan harta yang ditinggalkannya.', map: 'Peta', mapS: 'Lahir di mana?', tree: 'Silsilah', treeS: 'Dari mana asalnya?', gallery: 'Koleksi', galleryS: 'Harta dari dekat', load: 'Membuka ruang pamer…' , chance: 'Peluang', chanceS: 'Leluhur dadu' , paint: 'Dalam seni', paintS: 'Permainan dalam gambar' , read: 'Kisah', readS: 'Misteri permainan', passGot: "Stempel {room}!", passAll: "Kartu stempel lengkap!", passR: "¢10–50 per stempel, bonus tiap ruang lengkap, dan ¢1.000 lagi untuk keenamnya", passDone: "{room} lengkap!", passRw: "¢{a} per buah · +¢{b} bila lengkap", passRw1: "¢{b} saat dibuka", mapP: 'Peta', treeP: 'Silsilah', galleryP: 'Koleksi', paintP: 'Lukisan', readP: 'Kisah', chanceP: 'Peluang', pass: 'Kartu stempel', passT: 'Kartu stempel', passS: 'Jelajahi ruang-ruang dan kumpulkan keenam stempel.', passGo: 'Kunjungi', t_map: 'Buka peta', t_tree: 'Buka silsilah', t_gallery: 'Lihat semua koleksi', t_paint: 'Buka semua lukisan', t_read: 'Jawab benar semua kuis kisah', t_chance: 'Lempar setiap alat', passNo: 'Belum', passX: 'Tutup' },
    hi: { title: 'संग्रहालय', sub: 'हर खेल कहाँ जन्मा, किन रास्तों से गुज़रा और कौन‑से ख़ज़ाने छोड़ गया — घूमकर देखें।', map: 'नक्शा', mapS: 'कहाँ जन्मा?', tree: 'वंश‑वृक्ष', treeS: 'कहाँ से आया?', gallery: 'संग्रह', galleryS: 'ख़ज़ाने पास से', load: 'कक्ष खुल रहा है…' , chance: 'संयोग', chanceS: 'पासे के पुरखे' , paint: 'कला में', paintS: 'चित्रों में खेल' , read: 'कहानियाँ', readS: 'खेलों के रहस्य', passGot: "{room} की मुहर!", passAll: "मुहर कार्ड पूरा!", passR: "हर मुहर पर ¢10–50, हर पूरे कक्ष पर बोनस, और छहों पूरे होने पर ¢1000 और", passDone: "{room} पूरा!", passRw: "हर एक ¢{a} · पूरा होने पर +¢{b}", passRw1: "खोलने पर ¢{b}", mapP: 'नक्शा', treeP: 'वृक्ष', galleryP: 'संग्रह', paintP: 'चित्र', readP: 'कहानियाँ', chanceP: 'संयोग', pass: 'मुहर कार्ड', passT: 'मुहर कार्ड', passS: 'कक्षों में घूमें और सभी छह मुहरें जुटाएँ।', passGo: 'जाएँ', t_map: 'नक्शा खोलें', t_tree: 'वंश‑वृक्ष खोलें', t_gallery: 'संग्रह की हर वस्तु देखें', t_paint: 'हर चित्र खोलें', t_read: 'हर कहानी की प्रश्नोत्तरी सही करें', t_chance: 'हर पासा‑साधन फेंकें', passNo: 'अभी नहीं', passX: 'बंद करें' },
    ar: { title: 'المتحف', sub: 'تجوّل بين مواطن ولادة كل لعبة، والطرق التي سلكتها، والكنوز التي خلّفتها.', map: 'الخريطة', mapS: 'أين وُلدت؟', tree: 'شجرة النسب', treeS: 'من أين جاءت؟', gallery: 'المقتنيات', galleryS: 'كنوز عن قرب', load: 'جارٍ فتح القاعة…' , chance: 'الحظ', chanceS: 'أسلاف النرد' , paint: 'في الفن', paintS: 'الألعاب في الصور' , read: 'حكايات', readS: 'أسرار الألعاب', passGot: "ختم {room}!", passAll: "اكتملت بطاقة الأختام!", passR: "¢10–50 لكل ختم، ومكافأة لكل قاعة مكتملة، و¢1000 إضافية للقاعات الست", passDone: "اكتملت {room}!", passRw: "¢{a} لكل ختم · +¢{b} عند الاكتمال", passRw1: "¢{b} عند الفتح", mapP: 'الخريطة', treeP: 'الشجرة', galleryP: 'المقتنيات', paintP: 'الفن', readP: 'حكايات', chanceP: 'الحظ', pass: 'بطاقة الأختام', passT: 'بطاقة الأختام', passS: 'تجوّل في القاعات واجمع الأختام الستة.', passGo: 'اذهب', t_map: 'افتح الخريطة', t_tree: 'افتح شجرة النسب', t_gallery: 'شاهد كل قطع المقتنيات', t_paint: 'افتح كل اللوحات', t_read: 'أجب عن كل اختبارات الحكايات بلا خطأ', t_chance: 'ارمِ كل أداة', passNo: 'ليس بعد', passX: 'إغلاق' },
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
    { id: 'tree', src: ['museum/tree.js?v=7'], ready: () => !!window.AtlasTree, render: (el, c) => AtlasTree.render(el, c) },
    { id: 'gallery', src: ['museum/gallery.js?v=151'], ready: () => !!window.AtlasGallery, render: (el, c) => AtlasGallery.render(el, c) },
    { id: 'paint', src: () => ['museum/paint-i18n/en.js?v=' + PAINT_I18N_V, ...(rl() !== 'en' ? [`museum/paint-i18n/${rl()}.js?v=${PAINT_I18N_V}`] : []), 'museum/paint.js?v=55'], ready: () => !!(window.AtlasPaint && window.MUSEUM_PAINT_T && MUSEUM_PAINT_T.en && MUSEUM_PAINT_T[rl()]), render: (el, c) => AtlasPaint.render(el, c) },   // (per language, like the stories)
    // (2026-11-24 audit pageKB) the stories' text in one file per language (museum/read-i18n/<lang>.js, made by tools/museum-read-split.js from
    // museum/read-i18n.js): English (the fallback for anything missing) and the page's language, not all fourteen (1.5 MB)
    // (2026-11-24 audit textKB) one file only: tools/museum-read-split.js fills each language's file with English for anything it lacks
    // (2026-11-24 audit textKB, per screen) that file is now the shelf's index only; each story's text is museum/read-i18n/<lang>/<id>.js, which
    // read.js loads when the story opens (with ?v=READ_I18N_V, read as AtlasMuseum.readV)
    { id: 'read', src: () => [`museum/read-i18n/${rl()}.js?v=${READ_I18N_V}`, 'museum/read.js?v=79'], ready: () => !!(window.AtlasRead && window.MUSEUM_READ_T && MUSEUM_READ_T[rl()]), render: (el, c) => AtlasRead.render(el, c) },
    { id: 'chance', src: () => ['museum/chance-i18n/en.js?v=' + CHANCE_I18N_V, ...(rl() !== 'en' ? [`museum/chance-i18n/${rl()}.js?v=${CHANCE_I18N_V}`] : []), 'museum/chance.js?v=7'], ready: () => !!(window.AtlasChance && window.MUSEUM_CHANCE_T && MUSEUM_CHANCE_T.en && MUSEUM_CHANCE_T[rl()]), render: (el, c) => AtlasChance.render(el, c) },   // (per language)
  ];
  const READ_I18N_V = 40, PAINT_I18N_V = 44, CHANCE_I18N_V = 1, READ_LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'], rl = () => { const l = (ctx && ctx.lang) || lang; return READ_LANGS.includes(l) ? l : 'en'; };
  const KEY = 'atlas-museum-room';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  let host = null, ctx = null, lang = 'ja', room = null, el = {};
  const u = k => (UI[lang] || UI.en)[k] || UI.en[k];
  const saved = () => { try { const r = localStorage.getItem(KEY); return ROOMS.some(x => x.id === r) ? r : null; } catch (e) { return null; } };

  // (2026-11-24 rubric A1) a tab list the keyboard can walk: one tab in the Tab order (the chosen one), ← → Home End move between them,
  // Enter / Space chooses (the buttons do that themselves). RTL turns the arrows round.
  function tabKeys(list) {
    if (!list || list._tk) return; list._tk = true;
    list.addEventListener('keydown', e => {
      const t = [...list.querySelectorAll('[role=tab]')].filter(b => b.offsetParent), i = t.indexOf(document.activeElement); if (i < 0) return;
      const rtl = getComputedStyle(list).direction === 'rtl', k = e.key; let j = -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + (rtl && k === 'ArrowRight' ? -1 : 1) + t.length) % t.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i + (rtl && k === 'ArrowLeft' ? 1 : -1) + t.length) % t.length;
      else if (k === 'Home') j = 0; else if (k === 'End') j = t.length - 1;
      if (j < 0) return; e.preventDefault(); t[j].focus();
    });
  }
  function rove(list) { if (!list) return; list.querySelectorAll('[role=tab]').forEach(b => b.tabIndex = b.getAttribute('aria-selected') === 'true' ? 0 : -1); }
  function bar() {
    el.rooms.style.setProperty('--n', ROOMS.length); el.rooms.style.setProperty('--h', ROOMS.length <= 4 ? ROOMS.length : Math.ceil(ROOMS.length / 2));
    // (a phone: one strip of all the rooms, icon over a short name — like the games' own menus, 2026-11-24 ユーザー)
    el.rooms.innerHTML = ROOMS.map(r => `<button type="button" class="murm" data-r="${r.id}" role="tab" aria-selected="${r.id === room}"><span class="mui"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[r.id]}</svg></span><span class="mut"><b>${esc(u(r.id))}</b><small>${esc(u(r.id + 'S'))}</small></span><span class="mup">${esc(u(r.id + 'P') !== r.id + 'P' ? u(r.id + 'P') : u(r.id))}</span></button>`).join('');
    el.rooms.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (b.dataset.r !== room) open(b.dataset.r, true); });
    tabKeys(el.rooms); rove(el.rooms);
    fitBar();
  }
  // the short names shrink (to 8.5px at the least) until each fits its button
  function fitBar() {
    if (!el || !el.rooms) return;
    requestAnimationFrame(() => el.rooms.querySelectorAll('.mup').forEach(s => { s.style.fontSize = ''; if (!s.offsetWidth) return; let f = parseFloat(getComputedStyle(s).fontSize); while (s.scrollWidth > s.clientWidth + 0.5 && f > 8.5) { f -= 0.5; s.style.fontSize = f + 'px'; } }));
  }
  addEventListener('resize', () => fitBar());
  try { document.fonts && document.fonts.ready.then(() => fitBar()); } catch (e) {}
  // (2026-11-24 user: the browser's back walks back) a room the user opens, and a story, is a history entry { pg: 'museum', mu: { room, story } };
  // app.js hands a popped entry back to restore().
  function hist(mu, replace) { try { const st = { pg: 'museum', mu }; if (replace) history.replaceState(st, '', '#museum'); else history.pushState(st, '', '#museum'); dispatchEvent(new Event('atlas-hist')); } catch (e) {} }
  function restore(mu) {
    if (!mu || !host) return; const cs = window.AtlasRead && AtlasRead.current ? AtlasRead.current() : null;
    if (mu.room !== room) open(mu.room, false);
    if (mu.room !== 'read') return; if (cs === (mu.story || null) && mu.room === room) return;
    let n = 0; const t = () => { if (window.AtlasRead && host.querySelector('.muroom[data-r="read"] .rdc, .muroom[data-r="read"] .rda')) { mu.story ? AtlasRead.show(mu.story) : AtlasRead.showShelf(); } else if (++n < 100) setTimeout(t, 100); }; t();
  }
  function open(id, user, replace) {
    const R = ROOMS.find(r => r.id === id) || ROOMS[0];
    if (user && !replace && R.id !== room) hist({ room: R.id });   // (replace: a room passed through on the way to / back from a viewer — the history is left as it is)
    room = R.id; host.dataset.room = room;
    try { localStorage.setItem(KEY, room); } catch (e) {}
    el.rooms.querySelectorAll('[data-r]').forEach(b => b.setAttribute('aria-selected', b.dataset.r === room)); rove(el.rooms);
    // each room keeps its own box (the map keeps its view and its picked game when you come back to it)
    let box = el.stage.querySelector(`.muroom[data-r="${room}"]`);
    if (!box) { box = document.createElement('div'); box.className = 'muroom'; box.dataset.r = room; el.stage.appendChild(box); }
    el.stage.querySelectorAll('.muroom').forEach(b => b.classList.toggle('on', b === box));
    if (ctx.page) ctx.page(room);   // (ミッション: 地図を開く …)
    if (room === 'map' || room === 'tree') mark(room, room, 1);
    const go = () => { if (room === R.id) R.render(box, rctx()); };
    if (R.ready()) go();
    else { box.innerHTML = `<p class="muload">${esc(u('load'))}</p>`; const L = typeof R.src === 'function' ? R.src() : (R.src || []); L.reduce((q, x) => q.then(() => load(x)), Promise.resolve()).then(go); }   // (in order: the text before the room's code)
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
  // (2026-11-24 ユーザー: 物語のスタンプはスタンプカードに — もっとたくさん押す仕組みに) each room hands over its list of items once it
  // has loaded — catalog(room, [{ id, img, t }]) — kept in 'atlas-museum-cat' so the card can show every item's own stamp next time too
  const CK = 'atlas-museum-cat';
  const cats = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { return {}; } };
  function catalog(r, items) {
    const C = cats(), v = JSON.stringify(items); if (JSON.stringify(C[r]) === v) return;
    C[r] = items; try { localStorage.setItem(CK, JSON.stringify(C)); } catch (e) {}
    if (el.pass && el.pass.classList.contains('on')) passPanel();
  }
  // (2026-11-24 ユーザー: 地図や系統樹とのつながり) the game a story is about → the story (keep in step with read.js STORIES' first link)
  const READ_OF = { ur: 'ur', senet: 'senet', latrunculi: 'latrunculi', foxgeese: 'foxgeese', patolli: 'patolli', backgammon: 'backgammon', go: 'go', shogi: 'shogi',
    chess: 'queen', tafl: 'tafl', ludo: 'pachisi', checkers: 'draughts', reversi: 'reversi', mancala: 'mancala', morris: 'morris', xiangqi: 'xiangqi', hex: 'hex',
    amazons: 'amazons', konane: 'konane', peg: 'peg', fanorona: 'fanorona', janggi: 'janggi', gomoku: 'gomoku', carrom: 'carrom', crokinole: 'crokinole', ugolki: 'ugolki', agon: 'agon', connect4: 'dots', dots: 'dots', hitblow: 'hitblow', botao: 'botao', hockey: 'hockey', solitaire: 'solitaire', sudoku: 'sudoku', shanghai: 'shanghai', samegame: 'samegame' };
  const readOf = g => READ_OF[g] || null;
  const rname = r => ((UI[lang] || UI.en)[r]) || UI.en[r] || r;
  // another room's game, picked there: the map or the tree opens with the game chosen (its card shows)
  function pickIn(r, g) {
    open(r, true); const P = { map: () => window.AtlasMap && AtlasMap.pick && AtlasMap.pick(g), tree: () => window.AtlasTree && AtlasTree.pick && AtlasTree.pick(g) }[r];
    if (!P) return; let n = 0; const t = () => { if (!P() && ++n < 60) setTimeout(t, 100); }; setTimeout(t, 120);
  }
  // a stamp opens its own item: the room, then the story / work / piece / tool
  function openItem(r, id) {
    open(r, true); if (r === 'chance') { try { localStorage.setItem('atlas-chance-tool', id); } catch (e) {} }
    const W = { read: () => window.AtlasRead && host.querySelector('.muroom[data-r="read"] .rdc') && (AtlasRead.open(id), 1), paint: () => window.AtlasPaint && host.querySelector('.muroom[data-r="paint"] .ptc') && (AtlasPaint.open(id), 1),
      gallery: () => window.AtlasGallery && host.querySelector('.muroom[data-r="gallery"] .gxc') && (AtlasGallery.open(id), 1), chance: () => window.AtlasChance && AtlasChance._debug && (AtlasChance._debug.choose(id), 1) }[r];
    if (!W) return; let n = 0; const t = () => { if (!W() && ++n < 100) setTimeout(t, 100); }; t();
  }
  // the reward (2026-11-24 ユーザー: コインで): ¢200 the first time a room is stamped, ¢1000 more when all six are; paid once
  // ('atlas-museum-prog'._paid: the rooms paid for, ._all: the book). ctx.coins adds to the wallet (W.bonus) with the coin sound.
  // (2026-11-24 ユーザー: 報酬が不均衡 — opening the map paid as much as 21 stories' quizzes) the coins follow the work: each stamp pays its
  // room's item rate, a full room adds its bonus, all six rooms the book's ¢1000. Paid once: _pi = the items paid per room, _paid = the
  // rooms whose bonus is paid, _all = the book. (_v 2: rooms already paid under the old ¢200 a room keep their items as paid.)
  const REW = { map: { i: 0, b: 20 }, tree: { i: 0, b: 20 }, gallery: { i: 30, b: 100 }, paint: { i: 20, b: 100 }, read: { i: 50, b: 300 }, chance: { i: 10, b: 100 } }, BOOK_COINS = 1000;
  function pay() {
    if (!ctx || !ctx.coins) return;
    const P = prog(), paid = P._paid || (P._paid = []), pi = P._pi || (P._pi = {});
    if (P._v !== 2) { ROOMS.forEach(r => { pi[r.id] = paid.includes(r.id) ? ((P[r.id] || {}).ids || []).slice() : (pi[r.id] || []); }); P._v = 2; }
    let n = 0; const got = [], full = [];
    ROOMS.forEach(r => { const R = REW[r.id] || { i: 0, b: 0 }, ids = (P[r.id] || {}).ids || [], have = pi[r.id] || (pi[r.id] = []);
      ids.forEach(id => { if (!have.includes(id)) { have.push(id); if (R.i) { n += R.i; got.push([r.id, id]); } } });
      if (stamped(r.id) && !paid.includes(r.id)) { paid.push(r.id); n += R.b; full.push(r.id); } });
    let all = false; if (!P._all && ROOMS.every(r => paid.includes(r.id))) { P._all = 1; all = true; n += BOOK_COINS; }
    try { localStorage.setItem(PK, JSON.stringify(P)); } catch (x) {}
    if (!n) return;
    try { ctx.coins(n); } catch (x) {}
    const name = ([r, id]) => { const it = (cats()[r] || []).find(x => x.id === id); return it ? it.t : u(r); };
    toast(all ? u('passAll') : full.length ? u('passDone').replace('{room}', full.map(r => u(r)).join('・')) : u('passGot').replace('{room}', got.length === 1 ? name(got[0]) : u(got[0][0])), n);
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
  function stampRow(r) {
    const C = cats()[r]; if (!C || !C.length) return '';
    const done = (prog()[r] || {}).ids || [];
    return `<div class="mupass-st">${C.map((it, i) => { const on = done.includes(it.id);
      return `<button type="button" class="mupass-s1${on ? ' on' : ''}" data-r="${r}" data-it="${esc(it.id)}" title="${esc(it.t)}" aria-label="${esc((i + 1) + '. ' + it.t + (on ? ' ✓' : ''))}">${on && it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy">` : ''}<i>${on && !it.img ? '✓' : i + 1}</i></button>`; }).join('')}</div>`;
  }
  function passPanel() {
    const box = el.pass;
    box.innerHTML = `<div class="mupass-h"><b>${esc(u('passT'))}</b><small>${esc(u('passS'))}</small><small class="mupass-rw">${esc(u('passR'))}</small><button type="button" class="mupass-x" aria-label="${esc(u('passX'))}">×</button></div>
      <div class="mupass-l">${ROOMS.map(r => { const p = pstate(r.id), ok = stamped(r.id), one = r.id === 'map' || r.id === 'tree';
        return `<div class="mupass-r${ok ? ' ok' : ''}"><span class="mupass-s"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[r.id]}</svg>${ok ? '<i>✓</i>' : ''}</span>
          <span class="mupass-t"><b>${esc(u(r.id))}</b><small>${esc(u('t_' + r.id))}</small><small class="mupass-rwd">${esc((REW[r.id] && REW[r.id].i ? u('passRw').replace('{a}', REW[r.id].i) : u('passRw1')).replace('{b}', REW[r.id] ? REW[r.id].b : 0))}</small>${one ? '' : `<span class="mupass-bar"><span style="width:${p.n ? Math.round(p.d / p.n * 100) : 0}%"></span></span>`}</span>
          <em dir="ltr">${one ? (ok ? '✓' : esc(u('passNo'))) : p.n ? `${p.d} / ${p.n}` : esc(u('passNo'))}</em>
          <button type="button" class="btn ghost sm" data-go="${r.id}">${esc(u('passGo'))}</button>${stampRow(r.id)}</div>`; }).join('')}</div>`;
    box.querySelector('.mupass-x').onclick = () => passToggle(false);
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { passToggle(false); open(b.dataset.go, true); });
    box.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { passToggle(false); openItem(b.dataset.r, b.dataset.it); });
  }
  function passToggle(on) { const o = on == null ? !el.pass.classList.contains('on') : on; if (o) passPanel(); el.pass.classList.toggle('on', o); el.pbtn.setAttribute('aria-expanded', o); }
  // what a room is given: the portal's ctx, and goEx(id) — open a piece of the collection (from another room's link)
  // (2026-11-24 audit backLost) a case opened from another room (the tree's node, a story's link) closes back into that room and its button
  function goEx(id) { const from = room, btn = document.activeElement, y = scrollY; open('gallery', true, true); let n = 0;
    const key = btn && btn.tagName === 'BUTTON' ? `.muroom[data-r="${from}"] button${btn.classList[0] ? '.' + btn.classList[0] : ''}${Object.keys(btn.dataset).map(k => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${btn.dataset[k]}"]`).join('')}` : '';
    const back = () => { open(from, true, true); setTimeout(() => { scrollTo(0, y); const b = btn && btn.isConnected && btn.offsetParent ? btn : key && host.querySelector(key); if (b) b.focus({ preventScroll: true }); }, 150); };
    const t = () => { if (window.AtlasGallery && host.querySelector('.muroom[data-r="gallery"] .gxgrid .gxc')) { if (from !== 'gallery' && !AtlasGallery.onClose) AtlasGallery.onClose = back; AtlasGallery.open(id); } else if (++n < 100) setTimeout(t, 100); }; t(); }
  const rctx = () => Object.assign({}, ctx, { goEx, goRoom: (r, o) => open(r, true, !!(o && o.replace)), hist });
  function render(sec, c) {
    ctx = c; lang = UI[c.lang] ? c.lang : 'en';
    if (host !== sec || !sec.querySelector('.murooms')) {
      host = sec;
      // (2026-11-24) the whole museum on one sheet of paper: the skin shows round it, never behind its text
      sec.innerHTML = `<div class="muwrap"><div class="muhead"><div class="mutt"><h2 class="h" id="muTtl"></h2><p class="musub" id="muSub"></p></div><button type="button" class="mupbtn" id="muPass" aria-expanded="false"></button></div>
        <div class="mupass" id="muPassP"></div><div class="murooms" id="muRooms" role="tablist"></div><div class="mustage" id="muStage" role="tabpanel"></div></div>`;
      el = { rooms: sec.querySelector('#muRooms'), stage: sec.querySelector('#muStage'), pass: sec.querySelector('#muPassP'), pbtn: sec.querySelector('#muPass') };
      el.pbtn.onclick = () => passToggle();
    }
    sec.querySelector('#muTtl').textContent = u('title'); sec.querySelector('#muSub').textContent = u('sub');
    const want = c.room || room || saved() || 'map';
    room = want; bar(); passBtn(); if (el.pass.classList.contains('on')) passPanel(); open(want, false);
    if (!(history.state && history.state.mu)) hist({ room: want }, true);
  }

  /* ---------- (2026-11-24) the page-turner and search for a room's grid of cards: when the cards run past a page, a bar
     above the grid (search · ‹ 1 / 2 ›) and arrows under it; a swipe sideways turns the page too. Cards are hidden, not
     removed, so the rooms' own links (goEx …) still find them. key: the room's state (page, query) kept while the page lives;
     o.rows: { pc, phone } rows a page holds — the columns are the grid's own */
  const PGT = {
    ja: ['さがす', '前のページ', '次のページ', '見つかりませんでした', '検索をクリア'], en: ['Search', 'Previous page', 'Next page', 'Nothing found', 'Clear search'],
    zh: ['搜索', '上一页', '下一页', '没有找到', '清除搜索'], 'zh-TW': ['搜尋', '上一頁', '下一頁', '沒有找到', '清除搜尋'], ko: ['검색', '이전 페이지', '다음 페이지', '찾지 못했습니다', '검색 지우기'],
    es: ['Buscar', 'Página anterior', 'Página siguiente', 'No se encontró nada', 'Borrar búsqueda'], fr: ['Rechercher', 'Page précédente', 'Page suivante', 'Aucun résultat', 'Effacer la recherche'],
    pt: ['Buscar', 'Página anterior', 'Próxima página', 'Nada encontrado', 'Limpar busca'], de: ['Suchen', 'Vorherige Seite', 'Nächste Seite', 'Nichts gefunden', 'Suche löschen'],
    ru: ['Поиск', 'Предыдущая страница', 'Следующая страница', 'Ничего не найдено', 'Очистить поиск'], tr: ['Ara', 'Önceki sayfa', 'Sonraki sayfa', 'Bir şey bulunamadı', 'Aramayı temizle'],
    id: ['Cari', 'Halaman sebelumnya', 'Halaman berikutnya', 'Tidak ditemukan', 'Hapus pencarian'], hi: ['खोजें', 'पिछला पेज', 'अगला पेज', 'कुछ नहीं मिला', 'खोज साफ़ करें'],
    ar: ['بحث', 'الصفحة السابقة', 'الصفحة التالية', 'لم يُعثر على شيء', 'مسح البحث'],
  };
  const PG = {};
  const PGN = { ja: '{n}ページ目（全{m}ページ）', en: 'Page {n} of {m}', zh: '第{n}页，共{m}页', 'zh-TW': '第{n}頁，共{m}頁', ko: '{m}페이지 중 {n}페이지', es: 'Página {n} de {m}', fr: 'Page {n} sur {m}', pt: 'Página {n} de {m}', de: 'Seite {n} von {m}', ru: 'Страница {n} из {m}', tr: 'Sayfa {n} / {m}', id: 'Halaman {n} dari {m}', hi: '{m} में से पेज {n}', ar: 'الصفحة {n} من {m}' };
  const fmtP = (t, n, m) => (PGN[lang] || PGN.en).replace('{n}', n).replace('{m}', m);
  const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)).replace(/[\s·・,，、。.()（）「」『』'’"“”-]+/g, '');
  const ARW = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d ? 'M9.5 5.5 16 12l-6.5 6.5' : 'M14.5 5.5 8 12l6.5 6.5'}"/></svg>`;
  function pager(grid, key, o) {
    if (!grid) return; o = o || {}; const t = PGT[lang] || PGT.en, st = PG[key] || (PG[key] = { p: 0, q: '' });
    const cards = [...grid.children].filter(c => !c.classList.contains('mupg-none'));
    cards.forEach(c => { c.dataset.pq = norm(c.textContent + ' ' + (c.dataset.q || '')); });
    let top = grid.previousElementSibling, bot = grid.nextElementSibling;
    if (!top || !top.classList.contains('mupg')) {
      top = document.createElement('div'); top.className = 'mupg';
      top.innerHTML = `<label class="mupg-s"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg><input type="search" enterkeyhint="search" autocomplete="off"><button type="button" class="mupg-x">×</button></label>
        <div class="mupg-n"><button type="button" class="mupg-a" data-d="-1">${ARW(0)}</button><span class="mupg-i" dir="ltr"></span><span class="mupg-ns"></span><button type="button" class="mupg-a" data-d="1">${ARW(1)}</button></div>`;
      grid.parentNode.insertBefore(top, grid);
      bot = document.createElement('div'); bot.className = 'mupg mupg-b';
      bot.innerHTML = `<div class="mupg-n"><button type="button" class="mupg-a" data-d="-1">${ARW(0)}</button><span class="mupg-i" dir="ltr"></span><span class="mupg-ns"></span><button type="button" class="mupg-a" data-d="1">${ARW(1)}</button></div>`;
      grid.parentNode.insertBefore(bot, grid.nextSibling);
    }
    // (2026-11-24 ユーザー: 検索ボックスと地域ソートを一列に) a room's own filter chips sit in the same bar, after the search box
    const ex = top.querySelector('.mupg-ex'); if (ex && ex !== o.extra) ex.remove();
    if (o.extra && o.extra.parentNode !== top) { o.extra.classList.add('mupg-ex'); top.insertBefore(o.extra, top.querySelector('.mupg-n')); }
    const inp = top.querySelector('input'), none = grid.querySelector('.mupg-none') || grid.appendChild(Object.assign(document.createElement('p'), { className: 'mupg-none' }));
    inp.placeholder = t[0]; inp.setAttribute('aria-label', t[0]); inp.value = st.q; none.textContent = t[3];
    top.querySelector('.mupg-x').setAttribute('aria-label', t[4]);
    [top, bot].forEach(b => b.querySelectorAll('.mupg-a').forEach(a => a.setAttribute('aria-label', t[+a.dataset.d > 0 ? 2 : 1])));
    const per = () => { const ph = innerWidth <= 819, cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length); return cols * ((ph ? o.rows && o.rows.phone : o.rows && o.rows.pc) || (ph ? 4 : 2)); };
    const draw = () => {
      const q = norm(st.q), hit = cards.filter(c => !q || c.dataset.pq.includes(q)), n = per(), pages = Math.max(1, Math.ceil(hit.length / n));
      st.p = Math.min(Math.max(0, st.p), pages - 1);
      cards.forEach(c => c.classList.add('mupg-off')); hit.slice(st.p * n, st.p * n + n).forEach(c => c.classList.remove('mupg-off'));
      none.classList.toggle('on', !hit.length);
      const many = cards.length > n;   // the whole bar only once the cards outgrow a page
      top.classList.toggle('on', many || !!o.extra); top.querySelector('.mupg-x').hidden = !st.q;
      [top, bot].forEach(b => { b.querySelector('.mupg-i').textContent = `${st.p + 1} / ${pages}`; b.querySelector('.mupg-n').classList.toggle('one', pages < 2);
        b.querySelectorAll('.mupg-a').forEach(a => { a.disabled = +a.dataset.d < 0 ? st.p <= 0 : st.p >= pages - 1; }); });
      bot.classList.toggle('on', many && pages > 1);
      // PC: ‹ 1 2 3 4 › — jump straight to a page (2026-11-24 ユーザー; the phone keeps the short “2 / 5”)
      const pc = innerWidth > 819 && pages > 1;
      top.classList.toggle('pc', innerWidth > 819);   // (PC: the numbers only below — ユーザー: 下にだけあればOK)
      [bot].forEach(bar => { const ns = bar.querySelector('.mupg-ns'); bar.classList.toggle('nums', pc);
      if (pc) {
        const list = []; for (let k = 0; k < pages; k++) if (pages <= 7 || k === 0 || k === pages - 1 || Math.abs(k - st.p) <= 1 || (st.p <= 2 && k <= 4) || (st.p >= pages - 3 && k >= pages - 5)) list.push(k);
        let html = '', prev = -1;
        list.forEach(k => { if (k - prev > 1) html += '<span class="mupg-gap" aria-hidden="true">…</span>'; html += `<button type="button" class="mupg-p" data-p="${k}"${k === st.p ? ' aria-current="page"' : ''} aria-label="${esc(fmtP(t, k + 1, pages))}">${k + 1}</button>`; prev = k; });
        ns.innerHTML = html; ns.setAttribute('dir', 'ltr');
        ns.querySelectorAll('.mupg-p').forEach(b => b.onclick = () => go(+b.dataset.p - st.p, bar === bot));
      } else ns.innerHTML = ''; });
    };
    const go = (d, scroll) => { const was = st.p; st.p += d; draw(); if (st.p !== was && scroll) { const r = top.getBoundingClientRect(); if (r.top < 70 || r.top > innerHeight * .6) scrollTo({ top: scrollY + r.top - 80, behavior: 'smooth' }); } };
    [top, bot].forEach(b => b.querySelectorAll('.mupg-a').forEach(a => a.onclick = () => go(+a.dataset.d, b === bot)));
    inp.oninput = () => { st.q = inp.value; st.p = 0; draw(); };
    top.querySelector('.mupg-x').onclick = () => { st.q = ''; inp.value = ''; st.p = 0; draw(); inp.focus(); };
    // a sideways swipe on the grid turns the page (an upright drag stays a scroll)
    let sx = 0, sy = 0, on = false;
    grid.ontouchstart = e => { if (e.touches.length !== 1) return; on = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    grid.ontouchend = e => { if (!on) return; on = false; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 45 && top.classList.contains('on')) { const rtl = getComputedStyle(grid).direction === 'rtl'; go((dx < 0) !== rtl ? 1 : -1, true); } };
    if (!grid._pgR) { grid._pgR = true; let tm = 0; addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { if (grid.isConnected) draw(); }, 150); }); }
    draw();
  }
  // (2026-11-24 audit trapEsc) the painting and case viewers are modal: Tab and Shift+Tab go round their own controls, not out into the page behind
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return; const d = [...document.querySelectorAll('.ptv.on,.exv.on')].pop(); if (!d) return;
    const f = [...d.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => { const r = x.getBoundingClientRect(), s = getComputedStyle(x); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; });
    if (!f.length) return; const i = f.indexOf(document.activeElement);
    if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1)].focus(); }
  }, true);
  window.AtlasMuseum = { restore, render, room: () => room, ROOMS, V, readV: READ_I18N_V, goEx, go: r => open(r, true), mark, prog, pager, catalog, tabKeys, rove, readOf, rname, openItem, pickIn };
})();
