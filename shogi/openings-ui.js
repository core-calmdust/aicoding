/*
 * Shogi openings list: category tabs (beginner / intermediate / advanced / surprise / trending / castles / handicap),
 * category files loaded on demand (openings-<cat>.json) and appended to OPEN.sets, last tab remembered.
 * Copyright 2026 core-calmdust
 */
(function () {
'use strict';
const CATS = ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'];
const FILES = { beg: 1, mid: 1, adv: 1, sp: 1, new: 1, castle: 1 };   // categories with an extra data file
const VER = '20261107l14';
const ICON = { beg: '初', mid: '中', adv: '上', sp: '奇', new: '新', castle: '囲', handi: '駒' };
const TXT = {
  ja: { 'k.furi': "振り飛車の囲い", 'k.ibi': "居飛車の囲い", 'k.aifuri': "相振りの囲い", 't.beg': '初級', 't.mid': '中級', 't.adv': '上級', 't.sp': '特殊', 't.new': '流行', 't.castle': '囲い', 't.handi': '駒落ち', studied: '解説済み', sente: "先手の戦法", gote: "後手の戦法", prog: '{n} / {m} 完了', beg: '初心者向け', mid: '中級者向け', adv: '上級者向け', sp: '特殊な戦法', new: '最近の流行', castle: '囲い', handi: '駒落ち',
    'd.beg': '狙いが明快で覚えやすい戦法。', 'd.mid': 'プロやソフトでも主流の戦型。', 'd.adv': '研究が必要な上級者向けの戦法。', 'd.sp': '奇襲・変わり種の戦法。', 'd.new': '近年プロで増えた形。', 'd.castle': '囲いの組み方を1手ずつ。',
    desc: '戦型ごとの解説と実戦練習。', studyOnly: '解説', loading: '読み込み中…', fail: '読み込めませんでした', endNo: 'ここまでが基本の手順です。', back: '解説へ戻る' },
  en: { 'k.furi': "Ranging Rook castle", 'k.ibi': "Static Rook castle", 'k.aifuri': "Double Ranging castle", 't.beg': 'Beginner', 't.mid': 'Standard', 't.adv': 'Advanced', 't.sp': 'Surprise', 't.new': 'Trending', 't.castle': 'Castles', 't.handi': 'Handicap', studied: 'Studied', sente: "Sente's opening", gote: "Gote's opening", prog: '{n} / {m} done', beg: 'Beginner', mid: 'Intermediate', adv: 'Advanced', sp: 'Surprise', new: 'Trending', castle: 'Castles', handi: 'Handicap',
    'd.beg': 'Start here: openings with a clear plan that are easy to remember.', 'd.mid': 'The backbone of opening theory — mainstream for pros and engines.', 'd.adv': 'Openings that need precise move orders and deep study.', 'd.sp': 'Surprise and offbeat openings. Knowing them also helps when someone plays them against you.', 'd.new': 'Setups that became popular among pros in recent years, often thanks to engine research.', 'd.castle': 'Build each king castle move by move. The opponent’s moves are just one example.',
    desc: 'Pick an opening to step through a typical line with notes, then practise positions from it (problems from move frequencies in strong Floodgate games).', studyOnly: 'Study', loading: 'Loading…', fail: 'Could not load', endNo: 'That is the basic line.', back: 'Back to overview' },
  zh: { 'k.furi': "振飞车的围", 'k.ibi': "居飞车的围", 'k.aifuri': "相振飞车的围", 't.beg': '入门', 't.mid': '中级', 't.adv': '高级', 't.sp': '奇袭', 't.new': '流行', 't.castle': '围', 't.handi': '让子', studied: '已学习', sente: "先手战法", gote: "后手战法", prog: '{n} / {m} 完成', beg: '入门', mid: '中级', adv: '高级', sp: '奇袭战法', new: '近期流行', castle: '围', handi: '让子棋',
    'd.beg': '从这里开始。目标明确、容易记住的战法。', 'd.mid': '学习定式骨架的战型，职业棋手和软件中的主流。', 'd.adv': '需要精确手顺和深入研究的高级战法。', 'd.sp': '奇袭和另类战法。了解它们，在对手使用时也能从容应对。', 'd.new': '受软件研究等影响，近年在职业棋手中增多的形。', 'd.castle': '一步一步确认守护玉将的“围”的组法。对方的着法只是一例。',
    desc: '选择战型，可以逐手观看代表性着法的讲解，并在该战型的局面中进行实战练习（根据Floodgate强者对局中的着法频率出题）。', studyOnly: '讲解', loading: '读取中…', fail: '读取失败', endNo: '以上是基本着法。', back: '返回讲解' },
  ko: { 'k.furi': "후리비샤의 성", 'k.ibi': "이비샤의 성", 'k.aifuri': "아이후리의 성", 't.beg': '초급', 't.mid': '중급', 't.adv': '고급', 't.sp': '특수', 't.new': '유행', 't.castle': '성', 't.handi': '접장기', studied: '해설 완료', sente: "선수 전법", gote: "후수 전법", prog: '{n} / {m} 완료', beg: '초급', mid: '중급', adv: '고급', sp: '특수 전법', new: '최근 유행', castle: '성(가코이)', handi: '접장기',
    'd.beg': '여기서 시작하세요. 목표가 분명하고 외우기 쉬운 전법입니다.', 'd.mid': '정석의 뼈대를 배우는, 프로와 소프트에서도 주류인 전형입니다.', 'd.adv': '세밀한 수순과 깊은 연구가 필요한 상급자용 전법입니다.', 'd.sp': '기습이나 색다른 전법. 알아 두면 상대가 썼을 때 대응에도 도움이 됩니다.', 'd.new': '소프트 연구의 영향 등으로 최근 프로 사이에서 늘어난 형태입니다.', 'd.castle': '왕을 지키는 ‘성’을 짓는 법을 한 수씩 확인합니다. 상대의 수는 한 예입니다.',
    desc: '전형을 고르면 대표 수순의 해설과, 그 전형 국면에서의 실전 연습(Floodgate 강자 대국에서 둔 수의 빈도로 출제)을 할 수 있습니다.', studyOnly: '해설', loading: '불러오는 중…', fail: '불러오지 못했습니다', endNo: '여기까지가 기본 수순입니다.', back: '해설로 돌아가기' },
  es: { 'k.furi': "Castillo de torre desplazada", 'k.ibi': "Castillo de torre estática", 'k.aifuri': "Castillo de doble torre desplazada", 't.beg': 'Inicial', 't.mid': 'Medio', 't.adv': 'Avanzado', 't.sp': 'Sorpresa', 't.new': 'Moda', 't.castle': 'Castillos', 't.handi': 'Hándicap', studied: 'Estudiada', sente: "Apertura de Sente", gote: "Apertura de Gote", prog: '{n} / {m} hechas', beg: 'Principiante', mid: 'Intermedio', adv: 'Avanzado', sp: 'Sorpresa', new: 'Tendencias', castle: 'Castillos', handi: 'Hándicap',
    'd.beg': 'Empieza aquí: aperturas con un plan claro y fáciles de recordar.', 'd.mid': 'La columna vertebral de la teoría: lo habitual entre profesionales y motores.', 'd.adv': 'Aperturas que exigen órdenes de jugadas precisos y estudio profundo.', 'd.sp': 'Aperturas sorpresa y poco comunes. Conocerlas también ayuda cuando te las juegan.', 'd.new': 'Esquemas que se han vuelto populares entre los profesionales en los últimos años, a menudo gracias a los motores.', 'd.castle': 'Construye cada castillo del rey jugada a jugada. Las jugadas del rival son solo un ejemplo.',
    desc: 'Elige una apertura para recorrer una línea típica con comentarios y luego practicar posiciones de ella (problemas según la frecuencia de jugadas en partidas fuertes de Floodgate).', studyOnly: 'Estudio', loading: 'Cargando…', fail: 'No se pudo cargar', endNo: 'Esta es la línea básica.', back: 'Volver a la explicación' },
  fr: { 'k.furi': "Château de tour mobile", 'k.ibi': "Château de tour statique", 'k.aifuri': "Château de double tour mobile", 't.beg': 'Débutant', 't.mid': 'Moyen', 't.adv': 'Avancé', 't.sp': 'Surprise', 't.new': 'Tendance', 't.castle': 'Châteaux', 't.handi': 'Handicap', studied: 'Étudiée', sente: "Ouverture de Sente", gote: "Ouverture de Gote", prog: '{n} / {m} faites', beg: 'Débutant', mid: 'Intermédiaire', adv: 'Avancé', sp: 'Surprises', new: 'Tendances', castle: 'Châteaux', handi: 'Handicap',
    'd.beg': 'Commencez ici : des ouvertures au plan clair, faciles à retenir.', 'd.mid': 'La colonne vertébrale de la théorie, courante chez les pros et les moteurs.', 'd.adv': 'Des ouvertures qui demandent des ordres de coups précis et une étude poussée.', 'd.sp': 'Ouvertures surprises et originales. Les connaître aide aussi quand on vous les joue.', 'd.new': 'Des dispositifs devenus populaires chez les pros ces dernières années, souvent grâce aux moteurs.', 'd.castle': 'Construisez chaque château du roi coup par coup. Les coups adverses ne sont qu’un exemple.',
    desc: 'Choisissez une ouverture pour suivre une ligne type commentée, puis vous entraîner sur ses positions (problèmes tirés de la fréquence des coups dans les fortes parties Floodgate).', studyOnly: 'Étude', loading: 'Chargement…', fail: 'Chargement impossible', endNo: 'Voilà la ligne de base.', back: 'Retour à la présentation' },
  pt: { 'k.furi': "Castelo de torre móvel", 'k.ibi': "Castelo de torre estática", 'k.aifuri': "Castelo de dupla torre móvel", 't.beg': 'Inicial', 't.mid': 'Médio', 't.adv': 'Avançado', 't.sp': 'Surpresa', 't.new': 'Moda', 't.castle': 'Castelos', 't.handi': 'Handicap', studied: 'Estudada', sente: "Abertura de Sente", gote: "Abertura de Gote", prog: '{n} / {m} feitas', beg: 'Iniciante', mid: 'Intermediário', adv: 'Avançado', sp: 'Surpresa', new: 'Tendências', castle: 'Castelos', handi: 'Handicap',
    'd.beg': 'Comece aqui: aberturas com um plano claro e fáceis de lembrar.', 'd.mid': 'A espinha dorsal da teoria — o padrão entre profissionais e engines.', 'd.adv': 'Aberturas que exigem ordens de lances precisas e estudo profundo.', 'd.sp': 'Aberturas surpresa e incomuns. Conhecê-las também ajuda quando alguém as joga contra você.', 'd.new': 'Esquemas que ficaram populares entre os profissionais nos últimos anos, muitas vezes graças às engines.', 'd.castle': 'Monte cada castelo do rei lance a lance. Os lances do adversário são apenas um exemplo.',
    desc: 'Escolha uma abertura para percorrer uma linha típica com comentários e depois praticar posições dela (problemas pela frequência dos lances em partidas fortes do Floodgate).', studyOnly: 'Estudo', loading: 'Carregando…', fail: 'Não foi possível carregar', endNo: 'Esta é a linha básica.', back: 'Voltar à explicação' },
  de: { 'k.furi': "Schwenkturm-Burg", 'k.ibi': "Standturm-Burg", 'k.aifuri': "Burg für doppelten Schwenkturm", 't.beg': 'Einstieg', 't.mid': 'Mittel', 't.adv': 'Profi', 't.sp': 'Exoten', 't.new': 'Trend', 't.castle': 'Burgen', 't.handi': 'Vorgabe', studied: 'Gelernt', sente: "Sente-Eröffnung", gote: "Gote-Eröffnung", prog: '{n} / {m} erledigt', beg: 'Einsteiger', mid: 'Mittelstufe', adv: 'Experten', sp: 'Überraschung', new: 'Aktuell', castle: 'Burgen', handi: 'Vorgabe',
    'd.beg': 'Hier anfangen: Eröffnungen mit klarem Plan, leicht zu merken.', 'd.mid': 'Das Rückgrat der Eröffnungstheorie – Standard bei Profis und Engines.', 'd.adv': 'Eröffnungen, die genaue Zugfolgen und tiefe Vorbereitung verlangen.', 'd.sp': 'Überraschungs- und Außenseitereröffnungen. Wer sie kennt, weiß auch, wie man ihnen begegnet.', 'd.new': 'Aufstellungen, die in den letzten Jahren bei Profis beliebt wurden – oft dank Engine-Analysen.', 'd.castle': 'Jede Königsburg Zug für Zug aufbauen. Die Züge des Gegners sind nur ein Beispiel.',
    desc: 'Wähle eine Eröffnung, spiele eine typische Variante mit Erklärungen durch und übe dann Stellungen daraus (Aufgaben nach Zughäufigkeiten in starken Floodgate-Partien).', studyOnly: 'Lernen', loading: 'Wird geladen…', fail: 'Konnte nicht geladen werden', endNo: 'Das ist die Grundvariante.', back: 'Zurück zur Übersicht' },
  hi: { 'k.furi': "घूमते हाथी का किला", 'k.ibi': "स्थिर हाथी का किला", 'k.aifuri': "दोहरे घूमते हाथी का किला", 't.beg': 'शुरुआती', 't.mid': 'मध्यम', 't.adv': 'उन्नत', 't.sp': 'अनोखी', 't.new': 'चलन', 't.castle': 'किले', 't.handi': 'हैंडीकैप', studied: 'पढ़ लिया', sente: "सेंते की ओपनिंग", gote: "गोते की ओपनिंग", prog: '{n} / {m} पूरे', beg: 'शुरुआती', mid: 'मध्यम', adv: 'उन्नत', sp: 'अनोखी चालें', new: 'नया चलन', castle: 'किले', handi: 'हैंडीकैप',
    'd.beg': 'यहाँ से शुरू करें: साफ़ योजना वाली, याद रखने में आसान ओपनिंग।', 'd.mid': 'ओपनिंग सिद्धांत की रीढ़ — पेशेवरों और इंजनों में आम।', 'd.adv': 'ऐसी ओपनिंग जिनमें सटीक चाल-क्रम और गहरी तैयारी चाहिए।', 'd.sp': 'चौंकाने वाली और अनोखी ओपनिंग। इन्हें जानना तब भी काम आता है जब कोई आपके ख़िलाफ़ खेले।', 'd.new': 'हाल के वर्षों में पेशेवरों में लोकप्रिय हुई व्यवस्थाएँ, अक्सर इंजन शोध की बदौलत।', 'd.castle': 'राजा का हर किला चाल-दर-चाल बनाएँ। विरोधी की चालें केवल एक उदाहरण हैं।',
    desc: 'कोई ओपनिंग चुनें, टिप्पणियों के साथ एक सामान्य लाइन देखें, फिर उसकी स्थितियों का अभ्यास करें (मज़बूत Floodgate गेम में चालों की आवृत्ति से सवाल)।', studyOnly: 'अध्ययन', loading: 'लोड हो रहा है…', fail: 'लोड नहीं हो सका', endNo: 'यही बुनियादी लाइन है।', back: 'विवरण पर लौटें' },
  ar: { 'k.furi': "قلعة الرخ المتنقل", 'k.ibi': "قلعة الرخ الثابت", 'k.aifuri': "قلعة الرخ المتنقل المزدوج", 't.beg': 'مبتدئ', 't.mid': 'متوسط', 't.adv': 'متقدم', 't.sp': 'مفاجآت', 't.new': 'رائج', 't.castle': 'القلاع', 't.handi': 'أفضلية', studied: 'تمت دراستها', sente: "افتتاح سينتي", gote: "افتتاح غوتي", prog: '{n} / {m} مكتملة', beg: 'للمبتدئين', mid: 'متوسط', adv: 'متقدم', sp: 'مفاجآت', new: 'الرائج', castle: 'القلاع', handi: 'الأفضلية',
    'd.beg': 'ابدأ من هنا: افتتاحات بخطة واضحة يسهل تذكّرها.', 'd.mid': 'العمود الفقري لنظرية الافتتاح، والشائع لدى المحترفين والمحركات.', 'd.adv': 'افتتاحات تتطلب ترتيب نقلات دقيقًا ودراسة عميقة.', 'd.sp': 'افتتاحات مفاجئة وغير مألوفة. معرفتها تفيد أيضًا عندما يلعبها خصمك.', 'd.new': 'ترتيبات انتشرت بين المحترفين في السنوات الأخيرة، غالبًا بفضل أبحاث المحركات.', 'd.castle': 'ابنِ كل قلعة للملك نقلة بنقلة. نقلات الخصم مجرد مثال.',
    desc: 'اختر افتتاحًا لتتابع خطًا نموذجيًا مع الشرح، ثم تدرّب على مواقفه (مسائل مبنية على تكرار النقلات في مباريات Floodgate القوية).', studyOnly: 'دراسة', loading: 'جارٍ التحميل…', fail: 'تعذّر التحميل', endNo: 'هذا هو الخط الأساسي.', back: 'العودة إلى الشرح' },
  ru: { 'k.furi': 'Крепость подвижной ладьи', 'k.ibi': 'Крепость статичной ладьи', 'k.aifuri': 'Крепость при двух подвижных ладьях', 't.beg': 'Начальный', 't.mid': 'Стандарт', 't.adv': 'Продвинутый', 't.sp': 'Сюрприз', 't.new': 'В тренде', 't.castle': 'Крепости', 't.handi': 'Фора', studied: 'Изучено', sente: 'Дебют сэнтэ', gote: 'Дебют готэ', prog: 'Пройдено {n} / {m}', beg: 'Начальный', mid: 'Средний', adv: 'Продвинутый', sp: 'Сюрприз', new: 'В тренде', castle: 'Крепости', handi: 'Фора', 'd.beg': 'Начните отсюда: дебюты с ясным планом, которые легко запомнить.', 'd.mid': 'Основа дебютной теории — мейнстрим у профессионалов и движков.', 'd.adv': 'Дебюты, требующие точного порядка ходов и глубокого изучения.', 'd.sp': 'Неожиданные и необычные дебюты. Знать их полезно и когда их играют против вас.', 'd.new': 'Схемы, ставшие популярными у профессионалов в последние годы, часто благодаря исследованиям движков.', 'd.castle': 'Стройте каждую крепость короля ход за ходом. Ходы соперника — лишь один пример.', desc: 'Выберите дебют, пройдите типичный вариант с комментариями, затем решайте позиции из него (задачи по частоте ходов в сильных партиях Floodgate).', studyOnly: 'Изучение', loading: 'Загрузка…', fail: 'Не удалось загрузить', endNo: 'Это основной вариант.', back: 'К обзору' },
  'zh-TW': { 'k.furi': '振飛車的圍', 'k.ibi': '居飛車的圍', 'k.aifuri': '相振飛車的圍', 't.beg': '入門', 't.mid': '標準', 't.adv': '進階', 't.sp': '奇襲', 't.new': '流行', 't.castle': '圍', 't.handi': '讓子', studied: '已學習', sente: '先手的開局', gote: '後手的開局', prog: '已完成 {n} / {m}', beg: '入門', mid: '中級', adv: '進階', sp: '奇襲', new: '流行', castle: '圍', handi: '讓子', 'd.beg': '從這裡開始：方針明確、容易記住的開局。', 'd.mid': '開局理論的骨幹——職業棋士與引擎的主流。', 'd.adv': '需要精確著法順序與深入研究的開局。', 'd.sp': '奇襲與非主流開局。了解它們，對手使出時也能應對。', 'd.new': '近年在職業棋士間流行的陣型，多半源自引擎研究。', 'd.castle': '一步一步組好每種圍。對手的著法只是其中一個例子。', desc: '選擇開局，附解說逐步觀看典型手順，再練習其中的局面（題目依Floodgate強者對局的著法頻率出題）。', studyOnly: '學習', loading: '載入中…', fail: '無法載入', endNo: '以上是基本手順。', back: '返回概覽' },
  id: { 'k.furi': 'Benteng Benteng Bergeser', 'k.ibi': 'Benteng Benteng Statis', 'k.aifuri': 'Benteng Dua Benteng Bergeser', 't.beg': 'Pemula', 't.mid': 'Standar', 't.adv': 'Mahir', 't.sp': 'Kejutan', 't.new': 'Tren', 't.castle': 'Benteng', 't.handi': 'Handikap', studied: 'Dipelajari', sente: 'Pembukaan Sente', gote: 'Pembukaan Gote', prog: '{n} / {m} selesai', beg: 'Pemula', mid: 'Menengah', adv: 'Mahir', sp: 'Kejutan', new: 'Tren', castle: 'Benteng', handi: 'Handikap', 'd.beg': 'Mulai di sini: pembukaan dengan rencana jelas yang mudah diingat.', 'd.mid': 'Tulang punggung teori pembukaan — arus utama bagi pro dan mesin.', 'd.adv': 'Pembukaan yang butuh urutan langkah tepat dan studi mendalam.', 'd.sp': 'Pembukaan kejutan dan tidak lazim. Mengetahuinya juga membantu saat dimainkan melawanmu.', 'd.new': 'Susunan yang populer di kalangan pro beberapa tahun terakhir, sering berkat riset mesin.', 'd.castle': 'Bangun setiap benteng raja langkah demi langkah. Langkah lawan hanya satu contoh.', desc: 'Pilih pembukaan untuk menelusuri variasi khas dengan catatan, lalu latih posisinya (soal dari frekuensi langkah di permainan kuat Floodgate).', studyOnly: 'Pelajari', loading: 'Memuat…', fail: 'Tidak bisa dimuat', endNo: 'Itulah variasi dasarnya.', back: 'Kembali ke ringkasan' },
  tr: { 'k.furi': 'Kayan Kale kalesi', 'k.ibi': 'Sabit Kale kalesi', 'k.aifuri': 'Çift Kayan Kale kalesi', 't.beg': 'Başlangıç', 't.mid': 'Standart', 't.adv': 'İleri', 't.sp': 'Sürpriz', 't.new': 'Popüler', 't.castle': 'Kaleler', 't.handi': 'Handikap', studied: 'Çalışıldı', sente: 'Sente\'nin açılışı', gote: 'Gote\'nin açılışı', prog: '{n} / {m} bitti', beg: 'Başlangıç', mid: 'Orta', adv: 'İleri', sp: 'Sürpriz', new: 'Popüler', castle: 'Kaleler', handi: 'Handikap', 'd.beg': 'Buradan başlayın: planı net, akılda kalması kolay açılışlar.', 'd.mid': 'Açılış teorisinin bel kemiği — profesyoneller ve motorlar için ana akım.', 'd.adv': 'Kesin hamle sırası ve derin çalışma gerektiren açılışlar.', 'd.sp': 'Sürpriz ve sıra dışı açılışlar. Bilmek, size karşı oynandığında da işe yarar.', 'd.new': 'Son yıllarda profesyoneller arasında, çoğu kez motor araştırmaları sayesinde popüler olan düzenler.', 'd.castle': 'Her şah kalesini hamle hamle kurun. Rakibin hamleleri yalnızca bir örnektir.', desc: 'Bir açılış seçip tipik bir varyantı notlarla izleyin, sonra konumlarını çalışın (güçlü Floodgate oyunlarındaki hamle sıklığından problemler).', studyOnly: 'Çalış', loading: 'Yükleniyor…', fail: 'Yüklenemedi', endNo: 'Temel varyant bu.', back: 'Özete dön' },
};
let H = null, cur = null, cache = {};
const KEY = 'shogi-kaya-optab', SKEY = 'shogi-kaya-opstudy-v1';
try { cur = localStorage.getItem(KEY); } catch (e) {}
if (!CATS.includes(cur)) cur = 'beg';
let studied = {};
try { studied = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) {}
const tx = k => { const l = H ? H.lang() : 'ja'; return (TXT[l] && TXT[l][k]) || TXT.en[k] || k; };
const catOf = g => g.cat || (g.handi ? 'handi' : 'mid');
// load one category's data file and append its sets to OPEN.sets (indices of earlier sets never change)
function ensure(cat) {
  if (!FILES[cat]) return Promise.resolve(true);
  if (cache[cat]) return cache[cat];
  return (cache[cat] = fetch(`openings-${cat}.json?v=${VER}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
    const O = H.open(); if (!O) return false;
    const have = new Set(O.sets.map(g => g.id));
    for (const g of d.sets || []) if (!have.has(g.id)) { g.cat = g.cat || cat; O.sets.push(g); }
    cache[cat].done = true;
    return true;
  }).catch(() => { delete cache[cat]; return false; }));
}
const ensureAll = () => Promise.all(CATS.map(ensure));
// index of a set id in OPEN.sets, loading the category files when needed
async function findId(id) {
  const O = H.open(); if (!O) return -1;
  let i = O.sets.findIndex(g => g.id === id); if (i >= 0) return i;
  await ensureAll();
  return H.open().sets.findIndex(g => g.id === id);
}
const BOOK = '<svg class="lx-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.2C6.6 3 4.4 2.6 1.8 2.9v9.4c2.6-.3 4.8.1 6.2 1.3 1.4-1.2 3.6-1.6 6.2-1.3V2.9C11.6 2.6 9.4 3 8 4.2zm0 0v9.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const hasPractice = g => !!(g.problems && g.problems.length >= 5);
const isDone = (id, prac) => { const pr = H.prog()[id]; return prac === false ? !!studied[id] : !!(pr && pr.pass); };
// final position of the study line (cached) for the card's mini board
const endSfen = {};
function finalSfen(g) {
  if (endSfen[g.id]) return endSfen[g.id];
  const st = g.study, E = window.ShogiEngine; if (!st || !E) return '';
  const p = new E.Position(); p.setSfen(st.start);
  try { for (const s of st.steps) { p.doMove(p.fromUsi(s[0])); p.sp = 0; } } catch (e) {}
  return (endSfen[g.id] = p.sfen());
}
// first moves of the study line in the page's notation (☗7六歩 ☖3四歩 … / ☗P-76 ☖P-34 …), cached per language
const lineTxt = {};
function lineOf(g) {
  const k = g.id + ':' + H.lang(); if (lineTxt[k] !== undefined) return lineTxt[k];
  const st = g.study, E = window.ShogiEngine; let out = '';
  if (st && E && typeof window.kifName === 'function') {
    try {
      const p = new E.Position(); p.setSfen(st.start); let prev = -1; const a = [];
      for (const s of st.steps.slice(0, 10)) { const m = p.fromUsi(s[0]); a.push((p.side ? '☖' : '☗') + window.kifName(p, m, prev)); prev = E.mTo(m); p.doMove(m); p.sp = 0; }
      out = a.join(' ') + (st.steps.length > 10 ? ' …' : '');
    } catch (e) { out = ''; }
  }
  return (lineTxt[k] = out);
}
function item(g, i) {
  const pr = H.prog()[g.id], L = H.L, t = H.t, prac = hasPractice(g), done = isDone(g.id, prac);
  const st = !prac ? (done ? { text: '✓ ' + tx('studied'), cls: 'ok' } : { text: BOOK + tx('studyOnly'), cls: 'so' })
    : pr ? (pr.pass ? { text: '✓ ' + t('ls.bestPts', { p: pr.best }), cls: 'ok' } : { text: t('ls.bestPts', { p: pr.best }) }) : { text: t('ls.new'), cls: 'new' };
  const sy = g.story || {}, cat = catOf(g);
  const board = window.ShogiLX ? ShogiLX.board(finalSfen(g), { marks: sy.marks, crop: ShogiLX.cropFor('open:' + g.id, g, cat === 'castle' ? 'castle' : 'diff'), from: cat === 'handi' ? null : g.study && g.study.start, both: cat === 'handi', side: g.side }) : '';
  const badge = g.kind ? `<span class="lx-side">${tx('k.' + g.kind)}</span>` : g.side ? `<span class="lx-side">${g.side === 'w' ? '☖' : '☗'} ${tx(g.side === 'w' ? 'gote' : 'sente')}</span>` : '';
  // light card: label · side · state / name / aim (one line) / the opening moves — the full story is on the choice dialog
  const ln = lineOf(g);
  return { done, html: ShogiLX.card({ attr: `data-o="${i}"`, cls: 'op', board, no: `<bdi>${L(g.label)}</bdi>`, badge, st, title: L(g.title), sub: L(g.short), moves: ln, p: prac ? (pr ? pr.best / 100 : 0) : done ? 1 : 0, done }) };
}
// render the openings list into #lessonList for the current tab (category files load on demand)
async function render() {
  const O = H.open(); if (!O || !window.ShogiLX) return;
  const idx = O.index || {};
  const cats = CATS.map(c => {
    const loaded = !FILES[c] || (cache[c] && cache[c].done);
    let items = null, n = 0, m = 0;
    if (loaded) items = O.sets.map((g, i) => [g, i]).filter(([g]) => catOf(g) === c).sort((a, b) => (a[0].ord ?? 100 + a[1]) - (b[0].ord ?? 100 + b[1])).map(([g, i]) => item(g, i));
    else { const ids = (idx[c] || []); m = ids.length; n = ids.filter(e => isDone(e[0], !!e[1])).length; }
    return { key: c, icon: ShogiLX.icon(ICON[c]), tab: tx('t.' + c), name: tx(c), desc: c === 'handi' ? H.t('op.handiNote') : tx('d.' + c), items, n, m };
  });
  const credit = cur !== 'castle' && O.credit ? `<p class="lx-credit">${H.L(O.credit)}</p>` : '';
  const go = () => ShogiLX.render('open', cats, { cur, foot: credit, wait: tx('loading'), prog: (n, m) => tx('prog').replace('{n}', n).replace('{m}', m), onTab: k => { cur = k; try { localStorage.setItem(KEY, cur); } catch (x) {} render(); } });
  go();
  if (FILES[cur] && !(cache[cur] && cache[cur].done)) {
    const c0 = cur, ok = await ensure(c0);
    if (c0 === cur && document.querySelector('#lessonList .lx-tabs') && !document.getElementById('lessonListView').classList.contains('hidden')) { if (ok) render(); else { const w = document.querySelector('#lessonList .lx-wait'); if (w) w.textContent = tx('fail'); } }
  }
}
function markStudied(id) { if (studied[id]) return; studied[id] = 1; try { localStorage.setItem(SKEY, JSON.stringify(studied)); } catch (e) {} }
window.ShogiOpenUI = {
  init(h) { H = h; },
  render, ensure, ensureAll, findId, hasPractice, tx, studied: markStudied,
  get cat() { return cur; },
  set cat(c) { if (CATS.includes(c)) { cur = c; try { localStorage.setItem(KEY, cur); } catch (x) {} } },
  catOf, CATS,
};
})();
