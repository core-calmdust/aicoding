/* ProSet — the PRO mode of the new-game dialog (common rule 2026-11-08,「対局設定の Pro モード」in
   claude/game-conventions-addendum.md). Normally only the AI level is chosen; a small PRO button beside the level opens a
   panel of advanced settings for the AI (how long / deep it thinks, threads, opening book, variety, evaluation, resigning,
   game-specific ones). Every setting starts at "the level's default" (marked ●); only what differs from it is used, and it
   is never used in rated games (the game does not ask for it there; the button is hidden).

     <script src="../shared/proset.js?v=1t2svhxbf"></script>     (after the dialog markup)
     const PRO = ProSet.init({
       game: 'chess',                               // storage: localStorage 'aicoding-pro:<game>' (or cfg.store)
       field: '#fLevel',                            // the level field: the button and the panel go in it (default)
       lang: () => LANG,
       level: () => draft.level,                    // the level shown in the dialog now
       show: () => draft.mode === 'ai' || draft.mode === 'watch',   // AI games that are not rated
       defaults: lv => ({ limit: { k: 'nodes', v: 8000 }, book: true, var: 0, … }),   // the level's own values
       params: [ { key: 'limit', kinds: { time: [0.1, 60], depth: [1, 30], nodes: [1e3, 1e8] } },   // (+ klabel / kunit: { nodes: {…14} } e.g. playouts)
                 { key: 'threads' }, { key: 'book' }, { key: 'var' }, { key: 'eval' }, { key: 'resign' },
                 { key: 'exact', type: 'int', min: 0, max: 30, group: 'read', label: {…14}, help: {…14}, unit: {…14} } ],
       store: { get: () => obj, set: obj => … },   // optional (e.g. inside the synced settings)
       stone: true,                                 // optional: 打ち方 instead of 指し方 (stone games)
     });
     PRO.get(level)   → null (nothing changed, or PRO off) | the effective values { limit, book, … , changed: [keys] }
     PRO.active(level) / PRO.tag() (' · PRO' when active) / PRO.sync() (re-render the dialog part)
   Common keys (labels / help in 14 languages here): limit, threads, book, var (0 none / 1 small / 2 large), eval
   ('nnue' / 'hand'), resign (bool), clock (bool: time from the AI's own clock). Others: type 'bool' | 'int' | 'choice'
   with label / help / unit / opts [{ v, label }]. A param may have when: eff => bool (shown only then), e.g. threads only for
   a time limit. The dialog is edited as a draft: saved on 対局開始 (#btnStart), dropped on 閉じる. */
(function () {
'use strict';
if (window.ProSet) return;
const T = {
  title: { ja: '高度な対局設定（PRO）', en: 'Advanced AI settings (PRO)', zh: '高级对局设置（PRO）', 'zh-TW': '進階對局設定（PRO）', ko: '고급 대국 설정(PRO)', es: 'Ajustes avanzados de la IA (PRO)', fr: 'Réglages avancés de l’IA (PRO)', pt: 'Configurações avançadas da IA (PRO)', de: 'Erweiterte KI-Einstellungen (PRO)', ru: 'Расширенные настройки ИИ (PRO)', tr: 'Gelişmiş yapay zekâ ayarları (PRO)', id: 'Pengaturan AI lanjutan (PRO)', hi: 'उन्नत AI सेटिंग (PRO)', ar: 'إعدادات متقدمة للذكاء الاصطناعي (PRO)' },
  intro: { ja: '● がこのレベルの既定です。変えた項目だけが使われます（レート戦では使いません）。',
    en: '● marks the level’s default. Only what you change is used (never in rated games).',
    zh: '● 为该级别的默认值。只使用你更改的项目（等级分对局中不使用）。',
    'zh-TW': '● 為該級別的預設值。只使用你變更的項目（積分對局中不使用）。',
    ko: '● 표시가 이 레벨의 기본값입니다. 바꾼 항목만 적용됩니다(레이팅전에서는 쓰지 않음).',
    es: '● marca el valor del nivel. Solo se usa lo que cambies (nunca en partidas puntuadas).',
    fr: '● indique la valeur du niveau. Seul ce que vous changez est utilisé (jamais en partie classée).',
    pt: '● marca o padrão do nível. Só o que você mudar é usado (nunca em partidas ranqueadas).',
    de: '● ist der Standard der Stufe. Nur Geändertes gilt (nie in Wertungspartien).',
    ru: '● — значение уровня. Действует только то, что вы измените (не в рейтинговых партиях).',
    tr: '● seviyenin varsayılanıdır. Yalnızca değiştirdikleriniz kullanılır (puanlı oyunlarda asla).',
    id: '● adalah bawaan level. Hanya yang Anda ubah yang dipakai (tidak di permainan berperingkat).',
    hi: '● इस स्तर का डिफ़ॉल्ट है। केवल बदली गई चीज़ें लागू होती हैं (रेटेड खेल में कभी नहीं)।',
    ar: '● هو الافتراضي للمستوى. لا يُستخدم إلا ما تغيّره (وليس في المباريات المصنّفة أبدًا).' },
  'g.read': { ja: '読み', en: 'Search', zh: '计算', 'zh-TW': '計算', ko: '수읽기', es: 'Cálculo', fr: 'Calcul', pt: 'Cálculo', de: 'Rechnen', ru: 'Расчёт', tr: 'Hesap', id: 'Perhitungan', hi: 'गणना', ar: 'الحساب' },
  'g.play': { ja: '指し方', en: 'Play style', zh: '下法', 'zh-TW': '下法', ko: '두는 방식', es: 'Estilo', fr: 'Style de jeu', pt: 'Estilo', de: 'Spielweise', ru: 'Стиль игры', tr: 'Oyun tarzı', id: 'Gaya main', hi: 'खेल शैली', ar: 'أسلوب اللعب' },
  'g.play.stone': { ja: '打ち方' },
  'g.misc': { ja: 'その他', en: 'Other', zh: '其他', 'zh-TW': '其他', ko: '기타', es: 'Otros', fr: 'Autres', pt: 'Outros', de: 'Sonstiges', ru: 'Прочее', tr: 'Diğer', id: 'Lainnya', hi: 'अन्य', ar: 'أخرى' },
  limit: { ja: '思考の制限', en: 'Thinking limit', zh: '思考限制', 'zh-TW': '思考限制', ko: '생각 제한', es: 'Límite de cálculo', fr: 'Limite de réflexion', pt: 'Limite de cálculo', de: 'Bedenkgrenze', ru: 'Предел расчёта', tr: 'Düşünme sınırı', id: 'Batas berpikir', hi: 'सोचने की सीमा', ar: 'حدّ التفكير' },
  'limit.h': { ja: '1手ごとに、時間・読みの深さ・調べる局面数のどれで考えるのをやめるか。',
    en: 'When the AI stops thinking on each move: after a time, a search depth or a number of positions.',
    zh: '每步在何时停止思考：按时间、搜索深度或局面数。', 'zh-TW': '每步在何時停止思考：按時間、搜尋深度或局面數。',
    ko: '한 수마다 시간·수읽기 깊이·조사할 국면 수 중 무엇으로 생각을 멈출지.',
    es: 'Cuándo deja de pensar la IA en cada jugada: tras un tiempo, una profundidad o un número de posiciones.',
    fr: 'Quand l’IA cesse de réfléchir à chaque coup : après un temps, une profondeur ou un nombre de positions.',
    pt: 'Quando a IA para de pensar em cada lance: após um tempo, uma profundidade ou um número de posições.',
    de: 'Wann die KI pro Zug aufhört zu rechnen: nach Zeit, Suchtiefe oder Anzahl Stellungen.',
    ru: 'Когда ИИ прекращает думать над ходом: по времени, глубине или числу позиций.',
    tr: 'Yapay zekânın her hamlede ne zaman durduğu: süre, derinlik ya da pozisyon sayısı.',
    id: 'Kapan AI berhenti berpikir tiap langkah: setelah waktu, kedalaman, atau jumlah posisi.',
    hi: 'हर चाल पर AI कब सोचना बंद करे: समय, गहराई या जाँची गई स्थितियों की संख्या से।',
    ar: 'متى يتوقف الذكاء عن التفكير في كل نقلة: بعد وقت أو عمق أو عدد من المواقف.' },
  'k.time': { ja: '時間', en: 'Time', zh: '时间', 'zh-TW': '時間', ko: '시간', es: 'Tiempo', fr: 'Temps', pt: 'Tempo', de: 'Zeit', ru: 'Время', tr: 'Süre', id: 'Waktu', hi: 'समय', ar: 'الوقت' },
  'k.depth': { ja: '深さ', en: 'Depth', zh: '深度', 'zh-TW': '深度', ko: '깊이', es: 'Profundidad', fr: 'Profondeur', pt: 'Profundidade', de: 'Tiefe', ru: 'Глубина', tr: 'Derinlik', id: 'Kedalaman', hi: 'गहराई', ar: 'العمق' },
  'k.nodes': { ja: '局面数', en: 'Nodes', zh: '局面数', 'zh-TW': '局面數', ko: '국면 수', es: 'Nodos', fr: 'Nœuds', pt: 'Nós', de: 'Knoten', ru: 'Узлы', tr: 'Düğüm', id: 'Node', hi: 'नोड', ar: 'العُقد' },
  'u.s': { ja: '秒', en: 's', zh: '秒', 'zh-TW': '秒', ko: '초', es: 's', fr: 's', pt: 's', de: 's', ru: 'с', tr: 'sn', id: 'dtk', hi: 'से.', ar: 'ث' },
  'u.ply': { ja: '手', en: 'ply', zh: '步', 'zh-TW': '步', ko: '수', es: 'ply', fr: 'ply', pt: 'ply', de: 'Ply', ru: 'пл.', tr: 'ply', id: 'ply', hi: 'प्लाई', ar: 'نقلة' },
  'u.nodes': { ja: '局面', en: 'nodes', zh: '局面', 'zh-TW': '局面', ko: '국면', es: 'nodos', fr: 'nœuds', pt: 'nós', de: 'Knoten', ru: 'узл.', tr: 'düğüm', id: 'node', hi: 'नोड', ar: 'عقدة' },
  threads: { ja: 'スレッド数', en: 'Threads', zh: '线程数', 'zh-TW': '執行緒數', ko: '스레드 수', es: 'Hilos', fr: 'Threads', pt: 'Threads', de: 'Threads', ru: 'Потоки', tr: 'İş parçacığı', id: 'Thread', hi: 'थ्रेड', ar: 'المسارات' },
  'threads.need': { ja: '思考の制限が「時間」で、手のばらつきが「なし」のときに使われます（今の設定では1スレッド）。', en: 'Used when the thinking limit is Time and variety is None (one thread with the current settings).',
    zh: '思考限制为“时间”且着法变化为“无”时使用（当前设置下为单线程）。', 'zh-TW': '思考限制為「時間」且著法變化為「無」時使用（目前設定為單執行緒）。', ko: '생각 제한이 "시간"이고 수의 변화가 "없음"일 때 사용됩니다(현재 설정은 1스레드).',
    es: 'Se usa con límite por Tiempo y variedad Ninguna (un hilo con la configuración actual).', fr: 'Utilisé avec une limite en Temps et la variété sur Aucune (un seul thread avec les réglages actuels).',
    pt: 'Usado com limite por Tempo e variedade Nenhuma (um thread com a configuração atual).', de: 'Wird genutzt bei Zeitgrenze „Zeit" und Abwechslung „Keine" (mit den aktuellen Einstellungen ein Thread).',
    ru: 'Работает при ограничении «Время» и разнообразии «Нет» (сейчас — один поток).', tr: 'Düşünme sınırı Süre ve çeşitlilik Yok iken kullanılır (şu anki ayarlarla tek iş parçacığı).',
    id: 'Dipakai bila batas berpikir Waktu dan variasi Tidak ada (satu thread dengan pengaturan sekarang).', hi: 'सोचने की सीमा "समय" और विविधता "कोई नहीं" होने पर उपयोग होता है (अभी की सेटिंग में एक थ्रेड)।',
    ar: 'يُستخدم عندما يكون حد التفكير «الوقت» والتنويع «بلا» (مسار واحد بالإعدادات الحالية).' },
  'threads.mt': { ja: 'オプション（歯車）の「マルチスレッド」をオンにすると選べます。', en: 'Turn on "Multi-thread" in Options (gear) to choose this.',
    zh: '在选项（齿轮）中开启“多线程”后可选。', 'zh-TW': '在選項（齒輪）中開啟「多執行緒」後可選。', ko: '옵션(톱니바퀴)에서 "멀티스레드"를 켜면 선택할 수 있습니다.',
    es: 'Activa «Multihilo» en Opciones (engranaje) para elegirlo.', fr: 'Activez « Multithread » dans les Options (roue dentée) pour le choisir.', pt: 'Ative “Multithread” nas Opções (engrenagem) para escolher.',
    de: 'Schalte „Multithreading" in den Optionen (Zahnrad) ein, um dies zu wählen.', ru: 'Включите «Многопоточность» в Опциях (шестерёнка), чтобы выбрать.', tr: 'Seçmek için Seçenekler\'de (dişli) "Çoklu iş parçacığı"nı açın.',
    id: 'Aktifkan "Multi-thread" di Opsi (roda gigi) untuk memilih.', hi: 'चुनने के लिए विकल्प (गियर) में "मल्टी-थ्रेड" चालू करें।', ar: 'شغّل «متعدد المسارات» في الخيارات (الترس) لاختيار ذلك.' },
  book: { ja: '定跡', en: 'Opening book', zh: '开局库', 'zh-TW': '開局庫', ko: '오프닝 북', es: 'Libro de aperturas', fr: 'Livre d’ouvertures', pt: 'Livro de aberturas', de: 'Eröffnungsbuch', ru: 'Дебютная книга', tr: 'Açılış kitabı', id: 'Buku pembukaan', hi: 'ओपनिंग बुक', ar: 'كتاب الافتتاحيات' },
  'book.h': { ja: '序盤に登録された手順を使うか。オフにすると1手目から自分で読みます。',
    en: 'Play the stored opening lines? Off: the AI thinks for itself from the first move.',
    zh: '开局是否使用收录的着法。关闭后AI从第一步起自己计算。', 'zh-TW': '開局是否使用收錄的著法。關閉後AI從第一步起自己計算。',
    ko: '초반에 등록된 수순을 쓸지. 끄면 첫 수부터 스스로 읽습니다.',
    es: '¿Usar las líneas de apertura guardadas? No: la IA piensa sola desde la primera jugada.',
    fr: 'Jouer les lignes d’ouverture enregistrées ? Non : l’IA réfléchit seule dès le premier coup.',
    pt: 'Usar as linhas de abertura salvas? Não: a IA pensa sozinha desde o primeiro lance.',
    de: 'Gespeicherte Eröffnungszüge spielen? Aus: Die KI rechnet ab dem ersten Zug selbst.',
    ru: 'Играть дебютные варианты из книги? Выкл.: ИИ думает сам с первого хода.',
    tr: 'Kayıtlı açılış dizileri oynansın mı? Kapalı: yapay zekâ ilk hamleden kendi düşünür.',
    id: 'Pakai urutan pembukaan tersimpan? Nonaktif: AI berpikir sendiri sejak langkah pertama.',
    hi: 'सहेजी गई ओपनिंग चालें खेले? बंद: AI पहली चाल से खुद सोचेगा।',
    ar: 'هل يلعب خطوط الافتتاح المحفوظة؟ إيقاف: يفكّر الذكاء بنفسه من النقلة الأولى.' },
  var: { ja: '手のばらつき', en: 'Move variety', zh: '着法变化', 'zh-TW': '著法變化', ko: '수의 다양성', es: 'Variedad de jugadas', fr: 'Variété des coups', pt: 'Variedade de lances', de: 'Zugvielfalt', ru: 'Разнообразие ходов', tr: 'Hamle çeşitliliği', id: 'Variasi langkah', hi: 'चालों में विविधता', ar: 'تنوّع النقلات' },
  'var.h': { ja: 'ほぼ同じくらいの手から毎回少し違う手を選ぶ度合い。大きいほど弱く、人間らしくなります。',
    en: 'How much the AI varies among similar moves. More = weaker and more human-like.',
    zh: '在相近的着法中每次稍作变化的程度。越大越弱、越像人类。', 'zh-TW': '在相近的著法中每次稍作變化的程度。越大越弱、越像人類。',
    ko: '비슷한 수 중에서 매번 조금씩 다른 수를 고르는 정도. 클수록 약하고 사람다워집니다.',
    es: 'Cuánto varía la IA entre jugadas parecidas. Más = más débil y más humana.',
    fr: 'À quel point l’IA varie entre des coups proches. Plus = plus faible et plus humaine.',
    pt: 'Quanto a IA varia entre lances parecidos. Mais = mais fraca e mais humana.',
    de: 'Wie sehr die KI zwischen ähnlichen Zügen variiert. Mehr = schwächer und menschlicher.',
    ru: 'Насколько ИИ разнообразит выбор между близкими ходами. Больше — слабее и человечнее.',
    tr: 'Yapay zekânın benzer hamleler arasında ne kadar değişiklik yaptığı. Fazlası = daha zayıf, daha insansı.',
    id: 'Seberapa AI memvariasikan langkah yang mirip. Lebih = lebih lemah dan lebih manusiawi.',
    hi: 'मिलती-जुलती चालों में AI कितना बदलाव करे। ज़्यादा = कमज़ोर और ज़्यादा इंसानी।',
    ar: 'مدى تنويع الذكاء بين النقلات المتقاربة. أكثر = أضعف وأقرب للبشر.' },
  'var.0': { ja: 'なし', en: 'None', zh: '无', 'zh-TW': '無', ko: '없음', es: 'Nada', fr: 'Aucune', pt: 'Nenhuma', de: 'Keine', ru: 'Нет', tr: 'Yok', id: 'Tidak', hi: 'नहीं', ar: 'لا' },
  'var.1': { ja: '小', en: 'Small', zh: '小', 'zh-TW': '小', ko: '작게', es: 'Poca', fr: 'Faible', pt: 'Pouca', de: 'Wenig', ru: 'Мало', tr: 'Az', id: 'Sedikit', hi: 'कम', ar: 'قليل' },
  'var.2': { ja: '大', en: 'Large', zh: '大', 'zh-TW': '大', ko: '크게', es: 'Mucha', fr: 'Forte', pt: 'Muita', de: 'Viel', ru: 'Много', tr: 'Çok', id: 'Banyak', hi: 'ज़्यादा', ar: 'كثير' },
  eval: { ja: '評価関数', en: 'Evaluation', zh: '评估函数', 'zh-TW': '評估函數', ko: '평가 함수', es: 'Evaluación', fr: 'Évaluation', pt: 'Avaliação', de: 'Bewertung', ru: 'Оценка', tr: 'Değerlendirme', id: 'Evaluasi', hi: 'मूल्यांकन', ar: 'دالة التقييم' },
  'eval.h': { ja: '局面の良し悪しを測る方法。NNUE は学習した強い評価、手作りは昔ながらの計算式。',
    en: 'How positions are judged: NNUE = the trained network (stronger), hand-made = a classic formula.',
    zh: '判断局面优劣的方法。NNUE 为训练得到的强评估，手工为传统公式。', 'zh-TW': '判斷局面優劣的方法。NNUE 為訓練得到的強評估，手工為傳統公式。',
    ko: '국면의 좋고 나쁨을 재는 방법. NNUE는 학습한 강한 평가, 수제는 전통적인 계산식.',
    es: 'Cómo se juzgan las posiciones: NNUE = la red entrenada (más fuerte), clásica = una fórmula tradicional.',
    fr: 'Comment les positions sont jugées : NNUE = le réseau entraîné (plus fort), classique = une formule traditionnelle.',
    pt: 'Como as posições são julgadas: NNUE = a rede treinada (mais forte), clássica = uma fórmula tradicional.',
    de: 'Wie Stellungen bewertet werden: NNUE = das trainierte Netz (stärker), klassisch = eine herkömmliche Formel.',
    ru: 'Как оцениваются позиции: NNUE — обученная сеть (сильнее), ручная — классическая формула.',
    tr: 'Pozisyonların nasıl değerlendirildiği: NNUE = eğitilmiş ağ (daha güçlü), klasik = geleneksel formül.',
    id: 'Cara menilai posisi: NNUE = jaringan terlatih (lebih kuat), klasik = rumus tradisional.',
    hi: 'स्थिति कैसे आँकी जाए: NNUE = प्रशिक्षित नेटवर्क (मज़बूत), पारंपरिक = पुराना सूत्र।',
    ar: 'كيف تُقيَّم المواقف: NNUE = الشبكة المدرَّبة (أقوى)، والتقليدي = معادلة كلاسيكية.' },
  'eval.nnue': { ja: 'NNUE' },
  'eval.hand': { ja: '手作り', en: 'Hand-made', zh: '手工', 'zh-TW': '手工', ko: '수제', es: 'Clásica', fr: 'Classique', pt: 'Clássica', de: 'Klassisch', ru: 'Ручная', tr: 'Klasik', id: 'Klasik', hi: 'पारंपरिक', ar: 'تقليدي' },
  resign: { ja: 'AIの投了', en: 'AI resigns', zh: 'AI认输', 'zh-TW': 'AI認輸', ko: 'AI 기권', es: 'La IA abandona', fr: 'L’IA abandonne', pt: 'A IA desiste', de: 'KI gibt auf', ru: 'ИИ сдаётся', tr: 'YZ terk eder', id: 'AI menyerah', hi: 'AI हार माने', ar: 'استسلام الذكاء' },
  'resign.h': { ja: '負けが決まった局面でAIが投了するか。オフにすると最後まで指します。',
    en: 'Does the AI resign once the game is clearly lost? Off: it plays to the end.',
    zh: '必败局面时AI是否认输。关闭后会下到最后。', 'zh-TW': '必敗局面時AI是否認輸。關閉後會下到最後。',
    ko: '진 것이 확실한 국면에서 AI가 기권할지. 끄면 끝까지 둡니다.',
    es: '¿Abandona la IA cuando la partida está claramente perdida? No: juega hasta el final.',
    fr: 'L’IA abandonne-t-elle quand la partie est clairement perdue ? Non : elle joue jusqu’au bout.',
    pt: 'A IA desiste quando a partida está claramente perdida? Não: joga até o fim.',
    de: 'Gibt die KI in klar verlorener Stellung auf? Aus: Sie spielt bis zum Ende.',
    ru: 'Сдаётся ли ИИ в явно проигранной позиции? Выкл.: играет до конца.',
    tr: 'Oyun açıkça kaybedilmişken yapay zekâ terk etsin mi? Kapalı: sonuna kadar oynar.',
    id: 'Apakah AI menyerah saat jelas kalah? Nonaktif: bermain sampai akhir.',
    hi: 'साफ़ हार वाली स्थिति में AI हार माने? बंद: अंत तक खेलेगा।',
    ar: 'هل يستسلم الذكاء عندما تكون الخسارة مؤكدة؟ إيقاف: يلعب حتى النهاية.' },
  clock: { ja: '持ち時間に合わせる', en: 'Follow its clock', zh: '按用时分配', 'zh-TW': '按用時分配', ko: '남은 시간에 맞추기', es: 'Según su reloj', fr: 'Selon sa pendule', pt: 'Conforme o relógio', de: 'Nach eigener Uhr', ru: 'По своим часам', tr: 'Saatine göre', id: 'Sesuai jam', hi: 'अपनी घड़ी के अनुसार', ar: 'حسب ساعته' },
  'clock.h': { ja: '対局時計があるとき、AIが自分の残り時間から1手の時間を決めます（思考の制限より優先）。',
    en: 'With a game clock, the AI budgets each move from its own remaining time (overrides the thinking limit).',
    zh: '有对局时钟时，AI根据自己的剩余时间分配每步用时（优先于思考限制）。', 'zh-TW': '有對局時鐘時，AI根據自己的剩餘時間分配每步用時（優先於思考限制）。',
    ko: '대국 시계가 있을 때 AI가 자신의 남은 시간으로 한 수의 시간을 정합니다(생각 제한보다 우선).',
    es: 'Con reloj, la IA reparte su tiempo restante entre las jugadas (prevalece sobre el límite).',
    fr: 'Avec une pendule, l’IA répartit son temps restant entre ses coups (prioritaire sur la limite).',
    pt: 'Com relógio, a IA divide o tempo restante entre os lances (tem prioridade sobre o limite).',
    de: 'Mit Schachuhr teilt die KI ihre Restzeit auf die Züge auf (vor der Bedenkgrenze).',
    ru: 'При часах ИИ распределяет своё оставшееся время по ходам (важнее предела расчёта).',
    tr: 'Saat varken yapay zekâ kalan süresini hamlelere böler (düşünme sınırından önce gelir).',
    id: 'Dengan jam, AI membagi sisa waktunya per langkah (mengalahkan batas berpikir).',
    hi: 'घड़ी होने पर AI अपने बचे समय से हर चाल का समय तय करे (सोचने की सीमा से ऊपर)।',
    ar: 'مع وجود ساعة، يوزّع الذكاء وقته المتبقي على نقلاته (يتقدّم على حدّ التفكير).' },
  on: { ja: 'オン', en: 'On', zh: '开', 'zh-TW': '開', ko: '켬', es: 'Sí', fr: 'Oui', pt: 'Sim', de: 'An', ru: 'Вкл.', tr: 'Açık', id: 'Aktif', hi: 'चालू', ar: 'تشغيل' },
  off: { ja: 'オフ', en: 'Off', zh: '关', 'zh-TW': '關', ko: '끔', es: 'No', fr: 'Non', pt: 'Não', de: 'Aus', ru: 'Выкл.', tr: 'Kapalı', id: 'Nonaktif', hi: 'बंद', ar: 'إيقاف' },
  reset: { ja: 'レベルの既定に戻す', en: 'Reset to level defaults', zh: '恢复该级别默认', 'zh-TW': '恢復該級別預設', ko: '레벨 기본값으로', es: 'Volver a los valores del nivel', fr: 'Revenir aux valeurs du niveau', pt: 'Voltar ao padrão do nível', de: 'Auf Stufen-Standard', ru: 'Вернуть значения уровня', tr: 'Seviye varsayılanına dön', id: 'Kembali ke bawaan level', hi: 'स्तर के डिफ़ॉल्ट पर लौटें', ar: 'العودة إلى إعدادات المستوى' },
  def: { ja: '既定', en: 'default', zh: '默认', 'zh-TW': '預設', ko: '기본', es: 'predeterminado', fr: 'par défaut', pt: 'padrão', de: 'Standard', ru: 'по умолчанию', tr: 'varsayılan', id: 'bawaan', hi: 'डिफ़ॉल्ट', ar: 'افتراضي' },
};
const COMMON = { limit: 'read', threads: 'read', clock: 'read', book: 'play', var: 'play', eval: 'play', resign: 'misc' };
const CSS = `
.pro-has{position:relative}
.pro-has > label:first-child{padding-inline-end:70px}
.pro-btn{position:absolute;top:-4px;inset-inline-end:0;z-index:2;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:999px;border:1px solid color-mix(in srgb, var(--ngl-a,var(--accent,#d8b56a)) 55%, transparent);
  background:var(--panel,#1c1712);color:var(--ngl-a,var(--accent,#d8b56a));font:inherit;font-size:11px;font-weight:700;letter-spacing:.14em;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pro-btn:hover{border-color:var(--ngl-hi,var(--accent,#d8b56a))}
.pro-btn svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
.pro-btn[aria-expanded=true] svg{transform:rotate(180deg)}
.pro-btn.on{background:var(--ngl-hi,var(--accent,#d8b56a));border-color:var(--ngl-hi,var(--accent,#d8b56a));color:#1a140c}
.pro-btn.hidden,.pro-panel.hidden{display:none!important}
.pro-panel{margin-top:12px;padding:12px 12px 10px;border-radius:12px;border:1px solid color-mix(in srgb, var(--ngl-a,var(--accent,#d8b56a)) 35%, var(--line,#3a2f24));background:rgba(0,0,0,.22);font-size:13px;line-height:1.45;text-align:start}
.pro-intro{margin:0 0 8px;font-size:11.5px;color:var(--muted,#aaa);line-height:1.5}
.pro-g{margin:10px 0 0}
.pro-g:first-of-type{margin-top:4px}
.pro-gh{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.2em;color:var(--ngl-a,var(--accent,#d8b56a));margin:0 0 6px}
.pro-gh::after{content:'';flex:1;height:1px;background:linear-gradient(90deg, color-mix(in srgb, var(--ngl-a,var(--accent,#d8b56a)) 35%, transparent), transparent)}
[dir=rtl] .pro-gh::after{background:linear-gradient(270deg, color-mix(in srgb, var(--ngl-a,var(--accent,#d8b56a)) 35%, transparent), transparent)}
.pro-row{padding:6px 0 8px;border-top:1px solid rgba(255,255,255,.05)}
.pro-gh + .pro-row{border-top:0;padding-top:0}
.pro-row.hidden{display:none}
.pro-lab{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin:0 0 2px}
.pro-lab b{font-size:13px;font-weight:600;color:var(--text,#eee)}
.pro-row.ch .pro-lab b{color:var(--ngl-hi,var(--accent,#d8b56a))}
.pro-help{display:block;margin:0 0 6px;font-size:11.5px;color:var(--muted,#aaa);line-height:1.45}
.pro-seg{display:flex;gap:3px;padding:3px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid var(--line,rgba(255,255,255,.12))}
.pro-seg button{position:relative;flex:1 1 0;min-width:0;padding:6px 4px;border:0;border-radius:7px;background:none;color:var(--muted,#aaa);font:inherit;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pro-seg button:hover{color:var(--text,#eee)}
.pro-seg button.sel{color:var(--text,#eee);background:linear-gradient(180deg, color-mix(in srgb, var(--ngl-hi,var(--accent,#d8b56a)) 22%, var(--panel2,#211b15)), var(--panel2,#211b15));box-shadow:0 0 0 1px color-mix(in srgb, var(--ngl-hi,var(--accent,#d8b56a)) 60%, transparent)}
.pro-seg button.def::after{content:'●';margin-inline-start:3px;font-size:7px;vertical-align:2px;color:var(--ngl-a,var(--accent,#d8b56a))}
.pro-num{display:flex;align-items:center;gap:8px;margin-top:6px}
.pro-num input[type=range]{flex:1 1 auto;min-width:0;margin:0;height:26px;accent-color:var(--ngl-hi,var(--accent,#d8b56a));touch-action:pan-y}
.pro-num input[type=number]{flex:none;width:88px;box-sizing:border-box;padding:4px 6px;border-radius:7px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.3);color:var(--text,#eee);font:inherit;font-size:13px;text-align:end;-moz-appearance:textfield}
.pro-num input[type=number]::-webkit-inner-spin-button,.pro-num input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.pro-num .pro-u{flex:none;min-width:2.4em;font-size:12px;color:var(--muted,#aaa)}
.pro-dim{opacity:.4;pointer-events:none}.pro-note{color:var(--ngl-a,var(--accent,#d8b56a))!important}
.pro-num .pro-dv{flex:none;font-size:11px;color:var(--ngl-a,var(--accent,#d8b56a));cursor:pointer;white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-size:11px}
.pro-foot{display:flex;justify-content:flex-end;margin-top:8px}
.pro-reset{padding:6px 12px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.14));background:none;color:var(--muted,#aaa);font:inherit;font-size:12px;cursor:pointer}
.pro-reset:not(:disabled):hover{color:var(--text,#eee);border-color:var(--ngl-a,var(--accent,#d8b56a))}
.pro-reset:disabled{opacity:.4;cursor:default}
html.atlas-skin .pro-btn{background:#fffaf0;color:#b8812f;border-color:#e3c48a}
html.atlas-skin .pro-btn.on{background:#e0a33a;border-color:#e0a33a;color:#fff}
html.atlas-skin .pro-panel{background:#fffdf7;border-color:#ecdab4}
html.atlas-skin .pro-lab b{color:#2b3044}
html.atlas-skin .pro-row{border-top-color:#f1e6cf}
html.atlas-skin .pro-seg{background:#f2e7cf;border-color:#ead9b6}
html.atlas-skin .pro-seg button{color:#6b6f80}
html.atlas-skin .pro-seg button.sel{background:#fff;color:#2b3044;box-shadow:0 2px 0 #e3cfa4}   /* as the dialog's other tabs (nglux .seg) */
html.atlas-skin .pro-num input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:26px}
html.atlas-skin .pro-num input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:99px;background:#efe3c8;border:0}
html.atlas-skin .pro-num input[type=range]::-moz-range-track{height:8px;border-radius:99px;background:#efe3c8;border:0}
html.atlas-skin .pro-num input[type=range]::-moz-range-progress{height:8px;border-radius:99px;background:#e0a33a}
html.atlas-skin .pro-num input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-7px;border-radius:50%;background:#e0a33a;border:3px solid #fff;box-shadow:0 2px 0 #c98a24}
html.atlas-skin .pro-num input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#e0a33a;border:3px solid #fff;box-shadow:0 2px 0 #c98a24}   /* flat (2026-11-10) */
html.atlas-skin .pro-num input[type=number]{background:#fff;color:#2b3044;border-color:#e6d6b2}
html.atlas-skin .pro-row.ch .pro-lab b{color:#c0811c}
`;
const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
function pick(d, l) { if (!d) return ''; if (typeof d === 'string') return d; return d[l] != null ? d[l] : d.en != null ? d.en : d.ja != null ? d.ja : ''; }
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cssDone = false;
function addCss() { if (cssDone) return; cssDone = true; const st = document.createElement('style'); st.id = 'proSetCss'; st.textContent = CSS; document.head.appendChild(st); }
// threads available on this page now (shared/mtengine.js, or shared/mtsplit.js for the plain-JavaScript engines): 1 = none
const mtLib = () => window.MTEngine || window.MTSplit;
function maxThreads() { const M = mtLib(); return M && M.on && M.on() ? 1 + (M.maxHelpers ? M.maxHelpers() : M.helpers()) : 1; }   // (every core the browser reports — no fixed cap, the user's own choice)
// the default of a timed level's thread count (2026-11-09): every core up to the performance cores (shared/mtengine.js
// perfThreads: the Mac's efficiency cores made the Lazy SMP searches no faster or slower) — more can still be chosen up to maxThreads()
function defThreads() { const mx = maxThreads(), M = window.MTEngine; return M && M.perfThreads ? Math.max(1, Math.min(mx, M.perfThreads())) : mx; }

function init(cfg) {
  const key = 'aicoding-pro:' + cfg.game;
  const store = cfg.store || { get: () => { try { return JSON.parse(LS.get(key) || 'null'); } catch (e) { return null; } }, set: v => LS.set(key, JSON.stringify(v)) };
  const lang = () => { let l = (cfg.lang && cfg.lang()) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (/^zh/i.test(l)) l = 'zh'; return LANGS.includes(l) ? l : String(l).slice(0, 2); };
  const tx = k => pick(T[k], lang());
  const params = cfg.params.map(p => Object.assign({ group: COMMON[p.key] || 'misc', type: p.key === 'limit' ? 'limit' : p.key === 'threads' ? 'threads' : p.key === 'var' ? 'choice' : p.key === 'eval' ? 'choice' : 'bool' }, p));
  const prm = k => params.find(p => p.key === k);
  const load = () => { try { return sanitize((store.get() || {}).v || {}); } catch (e) { return {}; } };   // (read each time: the game may load / sync its settings later)
  let saved = load(), draft = null, open = LS.get(key + ':open') === '1';
  function sanitize(v) { const o = {}; for (const p of params) if (v[p.key] !== undefined && v[p.key] !== null) o[p.key] = v[p.key]; return o; }
  const defs = lv => { try { return cfg.defaults(lv) || {}; } catch (e) { console.warn('[proset]', e); return {}; } };
  const optsOf = p => p.opts || (p.key === 'var' ? [0, 1, 2].map(v => ({ v, label: T['var.' + v] })) : p.key === 'eval' ? [{ v: 'nnue', label: T['eval.nnue'] }, { v: 'hand', label: T['eval.hand'] }] : null);
  // the effective values for a level (values = saved or the dialog's draft): the level's defaults with the changes on top
  function effOf(lv, values) {
    const d = defs(lv), eff = Object.assign({}, d), changed = [];
    for (const p of params.filter(q => !q.when).concat(params.filter(q => q.when))) {   // (conditional ones last: their condition sees the other changes, e.g. threads needs variety off)
      const v = values[p.key]; if (v === undefined) continue;
      if (p.key === 'threads' && maxThreads() < 2) continue;   // (no threads here: the level's own way)
      if (p.when && !p.when(Object.assign({}, eff, { [p.key]: v }))) continue;
      if (!same(v, d[p.key])) { eff[p.key] = v; changed.push(p.key); }
    }
    for (const p of params) if (p.when && changed.includes(p.key) && !p.when(eff)) { eff[p.key] = d[p.key]; changed.splice(changed.indexOf(p.key), 1); }
    eff.changed = changed;
    return eff;
  }
  const api = {
    get(lv) { saved = load(); const e = effOf(lv, saved); return e.changed.length ? e : null; },
    active(lv) { return !!api.get(lv == null ? cfg.level() : lv); },
    tag(lv) { return api.active(lv) ? ' · PRO' : ''; },
    values: () => Object.assign({}, saved = load()),
    reset() { saved = {}; store.set({ v: saved }); if (draft) draft = {}; render(); },
    sync: () => render(),
    T, tx,
  };
  // ---------------------------------------------------------------- the dialog part
  let field = null, btn = null, panel = null, ov = null;
  function mount() {
    addCss();
    field = typeof cfg.field === 'string' || !cfg.field ? document.querySelector(cfg.field || '#fLevel') : cfg.field;
    ov = document.getElementById('newOverlay');
    if (!field) return;
    field.classList.add('pro-has');
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pro-btn'; btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span>PRO</span>' + CHEV;
    field.appendChild(btn);
    panel = document.createElement('div'); panel.className = 'pro-panel hidden';
    field.appendChild(panel);
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open = !open; LS.set(key + ':open', open ? '1' : '0'); render(); });
    // the draft: taken when the dialog opens, saved on 対局開始, dropped otherwise
    if (ov) {
      let was = ov.classList.contains('show');
      if (was) draft = Object.assign({}, saved);
      new MutationObserver(() => { const s = ov.classList.contains('show'); if (s && !was) { saved = load(); draft = Object.assign({}, saved); render(); } if (!s && was) draft = null; was = s; }).observe(ov, { attributes: true, attributeFilter: ['class'] });
      ov.addEventListener('click', e => { if (e.target.closest && e.target.closest('#btnStart')) api.commit(); }, true);
      // the game's own controls (level slider, mode buttons): re-render after they have done their part
      let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; render(); }); };
      ov.addEventListener('input', e => { if (!panel.contains(e.target)) later(); });
      ov.addEventListener('click', e => { if (!panel.contains(e.target)) later(); });
    }
    { const M = mtLib(); if (M && M.onChange) M.onChange(() => render()); }
    render();
  }
  api.commit = () => { if (draft) { saved = sanitize(draft); store.set({ v: saved }); } };
  const values = () => draft || saved;
  function setVal(k, v) {
    const vals = draft || (draft = Object.assign({}, saved));
    const d = defs(cfg.level())[k];
    if (v === undefined || same(v, d)) delete vals[k]; else vals[k] = v;
    render();
  }
  // number <-> slider position (log scale for wide ranges)
  function scale(min, max, step) {
    const lg = min > 0 && max / min > 50;
    const round = v => { if (step >= 1) return Math.round(v / step) * step; const k = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.max(min, Math.round(v / k) * k); };
    const nice = v => { if (!lg) return Math.round(v / step) * step; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e, n = f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 3 : f < 4.5 ? 4 : f < 6 ? 5 : f < 8.5 ? 7 : 10; return Math.max(min, Math.min(max, +(n * e).toPrecision(3))); };
    return {
      toX: v => lg ? Math.round(1000 * Math.log(v / min) / Math.log(max / min)) : Math.round(1000 * (v - min) / (max - min)),
      toV: x => lg ? nice(min * Math.pow(max / min, x / 1000)) : round(min + (max - min) * x / 1000),
    };
  }
  const nf = v => { const l = lang(); try { return (+v).toLocaleString(l === 'ar' || l === 'hi' ? 'en' : l, { maximumFractionDigits: 2 }); } catch (e) { return String(v); } };
  function kindRange(p, k) { const r = p.kinds[k]; return { min: r[0], max: r[1], step: r[2] || (k === 'time' ? 0.1 : 1) }; }
  const UNIT = { time: 'u.s', depth: 'u.ply', nodes: 'u.nodes' };
  function numRow(id, val, def, min, max, step, unit, onSet) {
    const sc = scale(min, max, step);
    return { html: `<div class="pro-num" data-n="${id}"><input type="range" min="0" max="1000" step="1" value="${sc.toX(Math.max(min, Math.min(max, val)))}" aria-label="${esc(unit)}"><input type="number" min="${min}" max="${max}" step="${step}" value="${val}"><span class="pro-u">${esc(unit)}</span></div>`,
      bind: el => {
        const r = el.querySelector('[type=range]'), n = el.querySelector('[type=number]');
        r.oninput = () => { n.value = sc.toV(+r.value); };
        r.onchange = () => onSet(sc.toV(+r.value));
        n.onchange = () => { let v = +n.value; if (!isFinite(v)) v = def; v = Math.max(min, Math.min(max, step >= 1 ? Math.round(v) : v)); onSet(v); };
      } };
  }
  function render() {
    if (!btn) return;
    const shown = !cfg.show || cfg.show();
    const lv = cfg.level(), vals = values(), d = defs(lv), eff = effOf(lv, vals), l = lang();
    btn.classList.toggle('hidden', !shown);
    field.classList.toggle('pro-has', shown);
    btn.classList.toggle('on', eff.changed.length > 0);
    btn.title = tx('title'); btn.setAttribute('aria-label', tx('title'));
    btn.setAttribute('aria-expanded', String(open && shown));
    panel.classList.toggle('hidden', !(open && shown));
    if (!(open && shown)) return;
    const focus = document.activeElement && panel.contains(document.activeElement) ? document.activeElement.closest('[data-k]') : null, fk = focus && focus.dataset.k;
    const binds = [];
    const segHtml = (k, list, cur, def) => `<div class="pro-seg" role="group">${list.map(o => `<button type="button" data-k="${k}" data-v="${esc(JSON.stringify(o.v))}" class="${same(o.v, cur) ? 'sel' : ''} ${same(o.v, def) ? 'def' : ''}"${same(o.v, def) ? ` title="${esc(tx('def'))}"` : ''}>${esc(pick(o.label, l))}</button>`).join('')}</div>`;
    const groups = { read: [], play: [], misc: [] };
    const mtCan = () => { const M = mtLib(); return !!(M && M.maxHelpers && M.maxHelpers() > 0); };
    for (const p of params) {
      const thrOff = p.key === 'threads' && maxThreads() < 2;   // threads not running on this page: shown greyed with how to turn them on
      if (thrOff && !mtCan()) continue;
      if (p.hidden && p.hidden()) continue;
      const condOff = p.key === 'threads' && p.when && !p.when(eff);
      const show = p.key === 'threads' ? true : (!p.when || p.when(eff));
      const ch = eff.changed.includes(p.key);
      const lab = p.label ? pick(p.label, l) : tx(p.key), help = p.help ? pick(p.help, l) : T[p.key + '.h'] ? tx(p.key + '.h') : '';
      let ctl = '';
      if (p.type === 'limit') {
        const kinds = Object.keys(p.kinds), cur = eff.limit || d.limit || { k: kinds[0], v: kindRange(p, kinds[0]).min };
        ctl = segHtml('limit.k', kinds.map(k => ({ v: k, label: (p.klabel && p.klabel[k]) || T['k.' + k] })), cur.k, d.limit && d.limit.k);
        const R = kindRange(p, cur.k), val = cur.v != null ? cur.v : (d.limit && d.limit.k === cur.k ? d.limit.v : R.min);
        const row = numRow('limit', val, val, R.min, R.max, R.step, (p.kunit && p.kunit[cur.k] && pick(p.kunit[cur.k], l)) || tx(UNIT[cur.k]), v => setVal('limit', { k: cur.k, v }));
        ctl += row.html; binds.push(['limit', row.bind]);
      } else if (p.type === 'threads' && thrOff) {
        ctl = `<small class="pro-help pro-note">${esc(tx('threads.mt'))}</small>`;
      } else if (p.type === 'threads') {   // a slider 1 … every core the browser reports (e.g. 10 = only the performance cores of a 10+4 chip)
        const mx = maxThreads(), cur = Math.min(mx, eff.threads != null ? eff.threads : d.threads != null ? d.threads : 1), dv = d.threads != null ? Math.min(d.threads, mx) : 1;
        const row = numRow('threads', cur, dv, 1, mx, 1, '/ ' + mx, v => setVal('threads', v));
        ctl = row.html.replace('</div>', `<button type="button" class="pro-dv" data-k="threads" data-v="${dv}" title="${esc(tx('def'))}">● ${dv}</button></div>`); binds.push(['threads', row.bind]);
        if (condOff) ctl = `<div class="pro-dim">${ctl}</div><small class="pro-help pro-note">${esc(tx('threads.need'))}</small>`;   // (greyed: the current limit / variety do not use threads)
      } else if (p.type === 'bool') {
        ctl = segHtml(p.key, [{ v: true, label: T.on }, { v: false, label: T.off }], !!eff[p.key], !!d[p.key]);
      } else if (p.type === 'choice') {
        ctl = segHtml(p.key, optsOf(p), eff[p.key], d[p.key]);
      } else if (p.type === 'int') {
        const val = eff[p.key] != null ? eff[p.key] : p.min;
        const row = numRow(p.key, val, d[p.key], p.min, p.max, p.step || 1, pick(p.unit, l), v => setVal(p.key, v));
        ctl = row.html; binds.push([p.key, row.bind]);
        if (d[p.key] != null) ctl = ctl.replace('</div>', `<button type="button" class="pro-dv" data-k="${p.key}" data-v="${esc(JSON.stringify(d[p.key]))}" title="${esc(tx('def'))}">● ${nf(d[p.key])}</button></div>`);
      }
      groups[p.group].push(`<div class="pro-row${show ? '' : ' hidden'}${ch ? ' ch' : ''}" data-k="${p.key}"><div class="pro-lab"><b>${esc(lab)}</b></div>${help ? `<small class="pro-help">${esc(help)}</small>` : ''}${ctl}</div>`);
    }
    const gname = { read: tx('g.read'), play: cfg.stone && T['g.play.stone'][l] ? T['g.play.stone'][l] : tx('g.play'), misc: tx('g.misc') };
    panel.innerHTML = `<p class="pro-intro">${esc(tx('intro'))}</p>` + ['read', 'play', 'misc'].filter(g => groups[g].length).map(g => `<div class="pro-g"><div class="pro-gh">${esc(gname[g])}</div>${groups[g].join('')}</div>`).join('') +
      `<div class="pro-foot"><button type="button" class="pro-reset"${Object.keys(vals).length ? '' : ' disabled'}>${esc(tx('reset'))}</button></div>`;
    for (const [k, bind] of binds) { const el = panel.querySelector(`.pro-num[data-n="${k}"]`); if (el) bind(el); }
    panel.querySelectorAll('.pro-seg button, .pro-dv').forEach(b => b.onclick = () => {
      const k = b.dataset.k, v = JSON.parse(b.dataset.v);
      if (k === 'limit.k') { const p = prm('limit'), dl = d.limit; const cur = eff.limit; if (cur && cur.k === v) return; const R = kindRange(p, v); setVal('limit', dl && dl.k === v ? dl : { k: v, v: v === 'time' ? Math.max(R.min, Math.min(R.max, 2)) : v === 'depth' ? Math.max(R.min, Math.min(R.max, 8)) : Math.max(R.min, Math.min(R.max, 100000)) }); }
      else setVal(k, v);
    });
    panel.querySelector('.pro-reset').onclick = () => { if (draft) draft = {}; else { saved = {}; store.set({ v: saved }); } render(); };
    if (fk) { const el = panel.querySelector(`[data-k="${fk}"] input[type=number]`) || panel.querySelector(`[data-k="${fk}"] button.sel`); if (el && el.focus) try { el.focus({ preventScroll: true }); } catch (e) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  // the level slider / buttons of the dialog: the panel follows the chosen level at once (its defaults, e.g. the thinking limit)
  let lastLv = null;
  const follow = () => { if (!btn) return; const lv = cfg.level(); if (lv !== lastLv) { lastLv = lv; render(); } };
  let ft = 0;
  ['input', 'change', 'click'].forEach(t => document.addEventListener(t, e => { if (panel && panel.contains(e.target)) return; setTimeout(follow, 0); clearTimeout(ft); ft = setTimeout(() => { lastLv = null; follow(); }, 150); }, true));   // (again a moment later: the page may update its level after this event)
  return api;
}
// The common 20-step ladder of the board games (checkers, xiangqi, janggi, ugolki, agon, fanorona, kōnane):
// weak steps { d, noise, blunder, look, hand } score the root moves at depth d and add noise; strong steps { s: 1, d, nk
// (thousands of nodes), ms, book } search for the best move. ladder(LEVELS, o) gives the PRO defaults / params and turns the
// effective values into such a step (engine.js think(): L = the page's cfg or LEVELS[level]); the engine's strong search
// takes L.dx (or L.d) as its maximum depth. o: { dmax, nmax, tmax, book: true (a real opening book: show it), bookFrom (its first level) }.
function ladder(LEVELS, o) {
  o = o || {};
  const noisy = [], n = LEVELS.length;
  for (let i = 1; i < n; i++) if (LEVELS[i] && !LEVELS[i].s && LEVELS[i].noise) noisy.push(i);
  const nz = k => { const i = noisy[Math.max(0, Math.min(noisy.length - 1, k))]; return i ? LEVELS[i].noise : 30; };
  const small = nz(noisy.length - 1), large = nz(Math.floor(noisy.length / 2));   // (the mildest noise / the middle of the weak steps)
  const L0 = lv => LEVELS[lv] || LEVELS[Math.min(n - 1, 10)] || {};
  return {
    defaults: lv => { const L = L0(lv);
      return { limit: !L.s ? { k: 'depth', v: Math.max(1, Math.round(L.d || 1)) } : L.nk ? { k: 'nodes', v: Math.round(L.nk * 1000) } : L.ms ? { k: 'time', v: L.ms / 1000 } : { k: 'depth', v: Math.min(o.dmax || 30, L.d || 8) },
        book: o.bookFrom ? lv >= o.bookFrom : !!L.book, var: L.s ? 0 : L.blunder ? 2 : 1 }; },
    params: [{ key: 'limit', kinds: { time: [0.1, o.tmax || 30], depth: [1, o.dmax || 20], nodes: [1000, o.nmax || 5e7] } }].concat(o.book ? [{ key: 'book' }] : [], [{ key: 'var', when: e => e.limit.k === 'depth' }]),
    cfg(e, lv) {
      const L = L0(lv), lim = e.limit, chL = e.changed.includes('limit'), chV = e.changed.includes('var');
      if (e.var && lim.k === 'depth') {   // the weak steps' way: root values at a depth, with noise
        const c = { d: chL ? lim.v : L.s ? Math.min(lim.v, 6) : L.d };
        if (!chV && !L.s) { c.noise = L.noise; ['blunder', 'look', 'hand'].forEach(k => { if (L[k]) c[k] = L[k]; }); }
        else c.noise = e.var === 1 ? small : large;
        return c;
      }
      const c = { s: 1, d: 99, ms: 600000 };
      if (o.book ? e.book : L.book && lim.k === 'time') c.book = 1;   // (the ladder's own "book" = opening variety, timed: only with a time limit)
      if (lim.k === 'depth') c.d = c.dx = lim.v; else if (lim.k === 'nodes') c.nk = lim.v / 1000; else c.ms = Math.round(lim.v * 1000);
      return c;
    },
  };
}
window.ProSet = { init, T, maxThreads, defThreads, ladder };
})();
