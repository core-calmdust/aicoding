/* =====================================================================
   Ludo — house rules (2026-11-09): the settings popup and its store, shared by the 2D game (ludo/) and the 3D table
   (atlas/games/ludo.js). The rules themselves live in ludo/engine.js (HOUSE, HOUSE_OPTS, houseOf); every rule combines.
   ★ marks the default. Switches: quick, safe. Pull-downs: start, block, attack, six, goal; advanced (all off by default):
   dbl, dd, back. Stored in aicoding-ludo-house. Ludo only — Pachisi keeps its traditional rules.
   LudoHouse.get() → the house object for newGame({ house }) · LudoHouse.open({ lang, onClose }) · LudoHouse.summary(lang)
   · LudoHouse.changed() → how many rules differ from the defaults
   ===================================================================== */
(function () {
  'use strict';
  const KEY = 'aicoding-ludo-house';
  const DEF = { quick: true, safe: true, start: 'classic', block: 'noland', attack: 'home', six: 'three', goal: 'exact', dbl: 'none', dd: 'none', back: 'none' };
  const OPTS = { start: ['classic', 'one6', 'five6', 'free'], block: ['noland', 'wall', 'none'], attack: ['home', 'back5', 'back10'], six: ['three', 'two', 'none'], goal: ['exact', 'bounce', 'any'], dbl: ['none', 'std', 'split'], dd: ['none', 'split', 'free', '666'], back: ['none', 'always', 'attack', 'one'] };
  const BASIC = ['quick', 'safe', 'start', 'block', 'attack', 'six', 'goal'], ADV = ['dbl', 'dd', 'back'];
  // per language: [ui], items { key: [name, short note] }, options { key: [labels in OPTS order] }
  const T = {
    ja: { ui: ['ハウスルール', '★がふだんのルール。どれも組み合わせて使えます。', '基本', '上級ルール（ふだんはすべてオフ）', 'すべて★に戻す', '決定', 'ハウスルールはルドーだけ。パチーシは伝統ルールで遊びます。', 'オン', 'オフ', '変更 {n}'],
      it: { quick: ['クイック', '最初から1個がスタートに。盤に駒がなければどの目でも出せる'], safe: ['安心地帯', '★と各色のスタートマスでは取られない'], start: ['スタート', '駒を出せる目（もう1回振れるのは6だけ）'], block: ['ブロック', '同じ色の駒が2個以上重なったマス'], attack: ['アタック', '取られた駒の行き先'], six: ['6のサイコロ', '6でもう1回。続けて出すと…'], goal: ['ゴール条件', 'ゴールに入る目'], dbl: ['ダブル', '重なった2個を1つの塊で動かす。1個では取れず、ダブル同士なら両方戻る'], dd: ['ダブルダイス', 'サイコロ2個。6のゾロ目でもう1ターン（666以外）'], back: ['バックステップ', '反時計回りにも進める'] },
      op: { start: ['クラシック（6で出す）', 'ワンシックス（1か6）', 'ファイブシックス（5か6）', '制限なし（どの目でも）'], block: ['着地不可（ほかの駒は止まれない）', '通行止め（通り抜けも不可）', 'なし'], attack: ['クラシック（スタートへ戻る）', '五歩後退', '十歩後退'], six: ['3回連続で無効', '2回連続で無効', 'なし（もう1回なし）'], goal: ['ピッタリ', 'バック（余りは戻る）', 'なんでも（余ってもOK）'], dbl: ['なし', 'ダブル・スタンダード', 'ダブル・スプリット（1個だけ先へも可）'], dd: ['なし', 'スプリット（別々の駒に1つずつ）', 'フリーダム（1つずつでも合計でも）', '666（6のゾロ目は6を3つ自由に）'], back: ['なし', 'バックステップ（いつでも）', 'コマを取れるときだけ', 'バックワン（1の目だけ）'] } },
    en: { ui: ['House rules', '★ is the usual rule. Every rule can be combined.', 'Basics', 'Advanced (all off as usual)', 'Back to ★', 'Done', 'House rules are for Ludo. Pachisi is played by its traditional rules.', 'On', 'Off', '{n} changed'],
      it: { quick: ['Quick start', 'One piece starts on the start square; with none out, any number brings one out'], safe: ['Safe squares', 'Nobody is captured on the stars and start squares'], start: ['Coming out', 'The numbers that bring a piece out (only a 6 throws again)'], block: ['Blocks', 'Two or more pieces of one colour on a square'], attack: ['Capture', 'Where a captured piece goes'], six: ['Rolling a 6', 'A 6 throws again. In a row…'], goal: ['Reaching home', 'The number needed to get home'], dbl: ['Doubles', 'Two stacked pieces move as one; one piece can’t take them, a double sends a double home'], dd: ['Two dice', 'Two dice; a double six gives another turn (not with 666)'], back: ['Back steps', 'Pieces may also move anticlockwise'] },
      op: { start: ['Classic (a 6)', 'One-six (1 or 6)', 'Five-six (5 or 6)', 'Any number'], block: ['No landing on it', 'A wall (no passing either)', 'None'], attack: ['Classic (back to start)', 'Back 5 squares', 'Back 10 squares'], six: ['Three in a row lose the turn', 'Two in a row lose the turn', 'None (no extra throw)'], goal: ['Exact', 'Bounce back', 'Anything (overshoot is fine)'], dbl: ['None', 'Standard double', 'Split double (one may go alone)'], dd: ['None', 'Split (one die per piece)', 'Freedom (each die or the sum)', '666 (double six = three free sixes)'], back: ['None', 'Always', 'Only to capture a piece', 'Back one (on a 1 only)'] } },
    zh: { ui: ['房规', '★为通常规则，所有规则都可以叠加。', '基本', '高级规则（通常全部关闭）', '全部恢复★', '确定', '房规只用于鲁多。帕奇西按传统规则进行。', '开', '关', '已改 {n}'],
      it: { quick: ['快速开局', '开局一枚棋子在起点；场上无棋子时任意点数可出棋'], safe: ['安全区', '★格与各色起点不会被吃'], start: ['出棋', '可以出棋的点数（只有6能再掷）'], block: ['堵塞', '同色两枚以上叠在一格'], attack: ['吃子', '被吃棋子的去处'], six: ['掷出6', '6可再掷一次。连续掷出…'], goal: ['到家条件', '进家所需点数'], dbl: ['双子', '叠起的两枚作为一体移动；单枚吃不掉，双子遇双子则双方都回家'], dd: ['双骰', '两颗骰子；双6再得一回合（666除外）'], back: ['后退', '也可逆时针移动'] },
      op: { start: ['经典（6）', '1或6', '5或6', '任意点数'], block: ['不可停留', '路障（也不能通过）', '无'], attack: ['经典（回起点）', '后退5格', '后退10格'], six: ['连续3次作废', '连续2次作废', '无（不再掷）'], goal: ['恰好', '反弹', '随意（超出也可）'], dbl: ['无', '标准双子', '可拆双子（可单独前进）'], dd: ['无', '分开（每颗骰子一枚棋子）', '自由（单用或相加）', '666（双6＝三个自由的6）'], back: ['无', '随时后退', '仅在能吃子时', '后退一（仅点数1）'] } },
    'zh-TW': { ui: ['房規', '★為通常規則，所有規則都可以疊加。', '基本', '進階規則（通常全部關閉）', '全部恢復★', '確定', '房規只用於魯多。帕奇西依傳統規則進行。', '開', '關', '已改 {n}'],
      it: { quick: ['快速開局', '開局一枚棋子在起點；場上無棋子時任意點數可出棋'], safe: ['安全區', '★格與各色起點不會被吃'], start: ['出棋', '可以出棋的點數（只有6能再擲）'], block: ['堵塞', '同色兩枚以上疊在一格'], attack: ['吃子', '被吃棋子的去處'], six: ['擲出6', '6可再擲一次。連續擲出…'], goal: ['到家條件', '進家所需點數'], dbl: ['雙子', '疊起的兩枚作為一體移動；單枚吃不掉，雙子遇雙子則雙方都回家'], dd: ['雙骰', '兩顆骰子；雙6再得一回合（666除外）'], back: ['後退', '也可逆時針移動'] },
      op: { start: ['經典（6）', '1或6', '5或6', '任意點數'], block: ['不可停留', '路障（也不能通過）', '無'], attack: ['經典（回起點）', '後退5格', '後退10格'], six: ['連續3次作廢', '連續2次作廢', '無（不再擲）'], goal: ['剛好', '反彈', '隨意（超出也可）'], dbl: ['無', '標準雙子', '可拆雙子（可單獨前進）'], dd: ['無', '分開（每顆骰子一枚棋子）', '自由（單用或相加）', '666（雙6＝三個自由的6）'], back: ['無', '隨時後退', '僅在能吃子時', '後退一（僅點數1）'] } },
    ko: { ui: ['하우스 룰', '★가 기본 규칙. 모두 조합해서 쓸 수 있어요.', '기본', '상급 규칙(기본은 모두 끔)', '모두 ★로', '확인', '하우스 룰은 루도 전용. 파치시는 전통 규칙으로 합니다.', '켬', '끔', '변경 {n}'],
      it: { quick: ['퀵 스타트', '처음부터 1개가 출발 칸에. 판에 말이 없으면 아무 눈으로나 꺼냄'], safe: ['안전지대', '★과 각 색의 출발 칸에선 잡히지 않음'], start: ['출발', '말을 꺼낼 수 있는 눈(한 번 더는 6만)'], block: ['블록', '같은 색 2개 이상이 겹친 칸'], attack: ['어택', '잡힌 말이 가는 곳'], six: ['6의 주사위', '6이면 한 번 더. 연속으로 나오면…'], goal: ['골인 조건', '골에 들어가는 눈'], dbl: ['더블', '겹친 2개를 한 덩어리로 이동. 1개로는 못 잡고, 더블끼리는 둘 다 돌아감'], dd: ['더블 다이스', '주사위 2개. 6 더블이면 한 턴 더 (666 제외)'], back: ['백스텝', '반시계 방향으로도 이동'] },
      op: { start: ['클래식(6)', '1 또는 6', '5 또는 6', '제한 없음(아무 눈)'], block: ['착지 불가', '통행금지(통과도 불가)', '없음'], attack: ['클래식(출발로)', '5칸 후퇴', '10칸 후퇴'], six: ['3연속이면 무효', '2연속이면 무효', '없음(한 번 더 없음)'], goal: ['딱 맞게', '백(남은 만큼 돌아감)', '아무거나(넘쳐도 OK)'], dbl: ['없음', '더블 스탠다드', '더블 스플릿(1개만 먼저도 가능)'], dd: ['없음', '스플릿(말마다 하나씩)', '프리덤(따로 또는 합계)', '666(6 더블=자유로운 6 세 개)'], back: ['없음', '백스텝(언제나)', '말을 잡을 수 있을 때만', '백원(1일 때만)'] } },
    es: { ui: ['Reglas de la casa', '★ es la regla habitual. Todas se pueden combinar.', 'Básicas', 'Avanzadas (todas apagadas de normal)', 'Volver a ★', 'Listo', 'Las reglas de la casa son para el Ludo. El Pachisi se juega con sus reglas tradicionales.', 'Sí', 'No', '{n} cambiadas'],
      it: { quick: ['Inicio rápido', 'Una ficha empieza en la salida; sin fichas fuera, cualquier número saca una'], safe: ['Casillas seguras', 'Nadie es capturado en estrellas y salidas'], start: ['Salir', 'Los números que sacan una ficha (solo el 6 repite)'], block: ['Bloqueos', 'Dos o más fichas de un color en una casilla'], attack: ['Captura', 'A dónde va la ficha capturada'], six: ['Sacar un 6', 'Un 6 repite tirada. Seguidos…'], goal: ['Llegar a casa', 'El número para entrar'], dbl: ['Dobles', 'Dos fichas apiladas van juntas; una sola no las captura, un doble devuelve a otro doble'], dd: ['Dos dados', 'Dos dados; un doble seis da otro turno (salvo 666)'], back: ['Retroceder', 'También se mueve en sentido antihorario'] },
      op: { start: ['Clásica (6)', 'Uno-seis (1 o 6)', 'Cinco-seis (5 o 6)', 'Cualquier número'], block: ['No se puede caer', 'Muro (tampoco pasar)', 'Ninguno'], attack: ['Clásica (a la salida)', 'Atrás 5', 'Atrás 10'], six: ['Tres seguidos pierden', 'Dos seguidos pierden', 'Ninguna (sin repetir)'], goal: ['Exacto', 'Rebote', 'Cualquiera (pasarse vale)'], dbl: ['Ninguno', 'Doble estándar', 'Doble divisible (una puede ir sola)'], dd: ['Ninguno', 'Dividido (un dado por ficha)', 'Libre (cada dado o la suma)', '666 (doble seis = tres seises libres)'], back: ['Ninguno', 'Siempre', 'Solo si captura una ficha', 'Atrás uno (solo con 1)'] } },
    fr: { ui: ['Règles maison', '★ = la règle habituelle. Toutes se combinent.', 'De base', 'Avancées (toutes désactivées d’habitude)', 'Revenir aux ★', 'OK', 'Les règles maison sont pour le Ludo. Le Pachisi se joue selon ses règles traditionnelles.', 'Oui', 'Non', '{n} modifiée(s)'],
      it: { quick: ['Départ rapide', 'Un pion part de la case départ ; sans pion sorti, tout chiffre en fait sortir un'], safe: ['Cases sûres', 'Personne n’est pris sur les étoiles et les départs'], start: ['Sortir', 'Les chiffres qui font sortir un pion (seul le 6 fait rejouer)'], block: ['Blocages', 'Deux pions ou plus d’une couleur sur une case'], attack: ['Prise', 'Où va le pion pris'], six: ['Faire 6', 'Un 6 fait rejouer. D’affilée…'], goal: ['Arrivée', 'Le chiffre pour rentrer'], dbl: ['Doubles', 'Deux pions empilés avancent ensemble ; un seul ne les prend pas, un double renvoie un double'], dd: ['Deux dés', 'Deux dés ; un double six donne un autre tour (sauf 666)'], back: ['Reculer', 'On peut aussi avancer dans l’autre sens'] },
      op: { start: ['Classique (6)', 'Un-six (1 ou 6)', 'Cinq-six (5 ou 6)', 'Tout chiffre'], block: ['Pas d’arrêt dessus', 'Mur (pas de passage)', 'Aucun'], attack: ['Classique (au départ)', 'Recule de 5', 'Recule de 10'], six: ['Trois d’affilée : perdu', 'Deux d’affilée : perdu', 'Aucune (pas de relance)'], goal: ['Exact', 'Rebond', 'Libre (dépasser compte)'], dbl: ['Aucun', 'Double standard', 'Double séparable (un peut partir seul)'], dd: ['Aucun', 'Séparés (un dé par pion)', 'Liberté (chaque dé ou la somme)', '666 (double six = trois six libres)'], back: ['Aucun', 'Toujours', 'Seulement pour prendre un pion', 'Recul d’un (sur 1)'] } },
    pt: { ui: ['Regras da casa', '★ é a regra usual. Todas podem ser combinadas.', 'Básicas', 'Avançadas (todas desligadas por padrão)', 'Voltar ao ★', 'Pronto', 'As regras da casa são do Ludo. O Pachisi segue as regras tradicionais.', 'Sim', 'Não', '{n} alteradas'],
      it: { quick: ['Início rápido', 'Uma peça começa na saída; sem peças fora, qualquer número tira uma'], safe: ['Casas seguras', 'Ninguém é capturado nas estrelas e saídas'], start: ['Sair', 'Os números que tiram uma peça (só o 6 joga de novo)'], block: ['Bloqueios', 'Duas ou mais peças de uma cor numa casa'], attack: ['Captura', 'Para onde vai a peça capturada'], six: ['Tirar 6', 'Um 6 joga de novo. Seguidos…'], goal: ['Chegada', 'O número para entrar em casa'], dbl: ['Duplas', 'Duas peças empilhadas andam juntas; uma só não captura, dupla captura dupla'], dd: ['Dois dados', 'Dois dados; um duplo seis dá outro turno (exceto 666)'], back: ['Voltar', 'Também anda no sentido anti-horário'] },
      op: { start: ['Clássica (6)', 'Um-seis (1 ou 6)', 'Cinco-seis (5 ou 6)', 'Qualquer número'], block: ['Não pode parar', 'Muro (nem passar)', 'Nenhum'], attack: ['Clássica (à saída)', 'Volta 5', 'Volta 10'], six: ['Três seguidos perdem', 'Dois seguidos perdem', 'Nenhuma (sem repetir)'], goal: ['Exato', 'Rebater', 'Qualquer (passar vale)'], dbl: ['Nenhuma', 'Dupla padrão', 'Dupla separável (uma pode ir só)'], dd: ['Nenhum', 'Separado (um dado por peça)', 'Livre (cada dado ou a soma)', '666 (duplo seis = três seis livres)'], back: ['Nenhum', 'Sempre', 'Só quando captura uma peça', 'Volta um (só com 1)'] } },
    de: { ui: ['Hausregeln', '★ ist die übliche Regel. Alles lässt sich kombinieren.', 'Grundregeln', 'Fortgeschritten (normal alle aus)', 'Alles auf ★', 'Fertig', 'Hausregeln gelten für Ludo. Pachisi wird nach seinen traditionellen Regeln gespielt.', 'An', 'Aus', '{n} geändert'],
      it: { quick: ['Schnellstart', 'Eine Figur steht schon am Start; ohne Figur draußen bringt jede Zahl eine heraus'], safe: ['Sichere Felder', 'Auf Sternen und Startfeldern wird niemand geschlagen'], start: ['Herauskommen', 'Die Zahlen, die eine Figur herausbringen (nur die 6 darf nochmal)'], block: ['Blockaden', 'Zwei oder mehr Figuren einer Farbe auf einem Feld'], attack: ['Schlagen', 'Wohin die geschlagene Figur geht'], six: ['Eine 6', 'Eine 6 würfelt nochmal. Mehrmals hintereinander…'], goal: ['Ins Ziel', 'Die Zahl, um ins Ziel zu kommen'], dbl: ['Doppel', 'Zwei gestapelte Figuren ziehen zusammen; eine allein schlägt sie nicht, ein Doppel schlägt ein Doppel'], dd: ['Zwei Würfel', 'Zwei Würfel; ein Sechserpasch gibt noch einen Zug (außer 666)'], back: ['Rückwärts', 'Figuren dürfen auch gegen den Uhrzeigersinn ziehen'] },
      op: { start: ['Klassisch (6)', 'Eins-Sechs (1 oder 6)', 'Fünf-Sechs (5 oder 6)', 'Jede Zahl'], block: ['Kein Halten darauf', 'Mauer (auch kein Vorbeiziehen)', 'Keine'], attack: ['Klassisch (zum Start)', '5 zurück', '10 zurück'], six: ['Dreimal hintereinander verfällt', 'Zweimal hintereinander verfällt', 'Keine (kein Nachwurf)'], goal: ['Genau', 'Zurückprallen', 'Beliebig (Überschuss ok)'], dbl: ['Kein', 'Standard-Doppel', 'Teilbares Doppel (eine darf allein)'], dd: ['Kein', 'Getrennt (ein Würfel pro Figur)', 'Frei (einzeln oder Summe)', '666 (Sechserpasch = drei freie Sechsen)'], back: ['Kein', 'Immer', 'Nur zum Schlagen', 'Rück-Eins (nur mit 1)'] } },
    ru: { ui: ['Домашние правила', '★ — обычное правило. Всё можно сочетать.', 'Основные', 'Продвинутые (обычно все выключены)', 'Всё на ★', 'Готово', 'Домашние правила — только для лудо. Пачиси играется по традиционным правилам.', 'Вкл', 'Выкл', 'Изменено: {n}'],
      it: { quick: ['Быстрый старт', 'Одна фишка уже на старте; если на поле нет фишек, вывести можно любым числом'], safe: ['Безопасные клетки', 'На звёздах и стартах никого не бьют'], start: ['Выход', 'Числа, выводящие фишку (повтор только на 6)'], block: ['Блоки', 'Две и больше фишек одного цвета на клетке'], attack: ['Взятие', 'Куда уходит побитая фишка'], six: ['Шестёрка', '6 даёт ещё бросок. Подряд…'], goal: ['Вход домой', 'Число для входа'], dbl: ['Дубли', 'Две фишки стопкой ходят вместе; одна их не бьёт, дубль бьёт дубль'], dd: ['Два кубика', 'Два кубика; дубль шестёрок даёт ещё ход (кроме 666)'], back: ['Назад', 'Можно ходить и против часовой'] },
      op: { start: ['Классика (6)', '1 или 6', '5 или 6', 'Любое число'], block: ['Нельзя встать', 'Стена (и пройти нельзя)', 'Нет'], attack: ['Классика (на старт)', 'Назад на 5', 'Назад на 10'], six: ['Три подряд — сгорает', 'Две подряд — сгорает', 'Нет (без повтора)'], goal: ['Точно', 'Отскок', 'Любое (перебор можно)'], dbl: ['Нет', 'Обычный дубль', 'Делимый дубль (одна может уйти)'], dd: ['Нет', 'Раздельно (кубик на фишку)', 'Свободно (по одному или сумма)', '666 (дубль шестёрок = три свободные шестёрки)'], back: ['Нет', 'Всегда', 'Только чтобы срубить фишку', 'Назад на один (только с 1)'] } },
    tr: { ui: ['Ev kuralları', '★ olağan kuraldır. Hepsi birleştirilebilir.', 'Temel', 'İleri (normalde hepsi kapalı)', 'Hepsini ★ yap', 'Tamam', 'Ev kuralları Ludo içindir. Pachisi geleneksel kurallarıyla oynanır.', 'Açık', 'Kapalı', '{n} değişti'],
      it: { quick: ['Hızlı başlangıç', 'Bir taş başlangıçta durur; dışarıda taş yoksa her sayı bir taş çıkarır'], safe: ['Güvenli kareler', 'Yıldız ve başlangıç karelerinde kimse alınmaz'], start: ['Çıkış', 'Taş çıkaran sayılar (yalnız 6 tekrar attırır)'], block: ['Bloklar', 'Bir karede aynı renkten iki ya da daha fazla taş'], attack: ['Alma', 'Alınan taşın gittiği yer'], six: ['6 atmak', '6 tekrar attırır. Art arda…'], goal: ['Eve giriş', 'Eve girmek için gereken sayı'], dbl: ['Çiftler', 'Üst üste iki taş birlikte gider; tek taş alamaz, çift çifti eve yollar'], dd: ['İki zar', 'İki zar; çift 6 bir tur daha verir (666 hariç)'], back: ['Geri adım', 'Saat yönünün tersine de gidilebilir'] },
      op: { start: ['Klasik (6)', '1 ya da 6', '5 ya da 6', 'Her sayı'], block: ['Üstüne durulmaz', 'Duvar (geçilmez de)', 'Yok'], attack: ['Klasik (başa)', '5 geri', '10 geri'], six: ['Üst üste üç: yanar', 'Üst üste iki: yanar', 'Yok (tekrar yok)'], goal: ['Tam', 'Geri sek', 'Serbest (fazlası olur)'], dbl: ['Yok', 'Standart çift', 'Bölünebilir çift (biri tek gidebilir)'], dd: ['Yok', 'Ayrı (taş başına bir zar)', 'Serbest (tek tek ya da toplam)', '666 (çift 6 = üç serbest 6)'], back: ['Yok', 'Her zaman', 'Yalnızca taş alırken', 'Geri bir (yalnız 1 ile)'] } },
    id: { ui: ['Aturan rumah', '★ adalah aturan biasa. Semua bisa digabung.', 'Dasar', 'Lanjutan (biasanya semua mati)', 'Kembali ke ★', 'Selesai', 'Aturan rumah hanya untuk Ludo. Pachisi dimainkan dengan aturan tradisionalnya.', 'Nyala', 'Mati', '{n} diubah'],
      it: { quick: ['Mulai cepat', 'Satu bidak mulai di kotak start; jika tak ada bidak di luar, angka apa pun mengeluarkan satu'], safe: ['Kotak aman', 'Tak ada yang ditangkap di bintang dan kotak start'], start: ['Keluar', 'Angka yang mengeluarkan bidak (hanya 6 lempar lagi)'], block: ['Blokade', 'Dua bidak atau lebih satu warna di satu kotak'], attack: ['Tangkap', 'Ke mana bidak yang ditangkap'], six: ['Dapat 6', '6 lempar lagi. Berturut-turut…'], goal: ['Masuk rumah', 'Angka untuk masuk'], dbl: ['Ganda', 'Dua bidak bertumpuk jalan bersama; satu bidak tak bisa menangkap, ganda memulangkan ganda'], dd: ['Dua dadu', 'Dua dadu; kembar 6 dapat giliran lagi (kecuali 666)'], back: ['Mundur', 'Boleh juga jalan berlawanan arah jarum jam'] },
      op: { start: ['Klasik (6)', '1 atau 6', '5 atau 6', 'Angka apa pun'], block: ['Tak boleh berhenti', 'Tembok (tak bisa lewat juga)', 'Tidak ada'], attack: ['Klasik (ke start)', 'Mundur 5', 'Mundur 10'], six: ['Tiga kali beruntun hangus', 'Dua kali beruntun hangus', 'Tidak ada (tanpa lempar lagi)'], goal: ['Pas', 'Memantul', 'Bebas (lebih boleh)'], dbl: ['Tidak ada', 'Ganda standar', 'Ganda pisah (satu boleh jalan sendiri)'], dd: ['Tidak ada', 'Pisah (satu dadu per bidak)', 'Bebas (satuan atau jumlah)', '666 (kembar 6 = tiga 6 bebas)'], back: ['Tidak ada', 'Selalu', 'Hanya saat bisa menangkap bidak', 'Mundur satu (hanya angka 1)'] } },
    hi: { ui: ['घर के नियम', '★ सामान्य नियम है। सभी नियम साथ में चल सकते हैं।', 'मूल', 'उन्नत (आमतौर पर सब बंद)', 'सब ★ पर', 'ठीक', 'घर के नियम सिर्फ़ लूडो के लिए। पचीसी पारंपरिक नियमों से खेली जाती है।', 'चालू', 'बंद', '{n} बदले'],
      it: { quick: ['जल्दी शुरुआत', 'एक गोटी शुरू से स्टार्ट पर; बाहर कोई गोटी न हो तो किसी भी अंक से निकाल सकते हैं'], safe: ['सुरक्षित खाने', 'तारों और स्टार्ट खानों पर कोई नहीं कटता'], start: ['निकलना', 'गोटी निकालने वाले अंक (दोबारा सिर्फ़ 6 पर)'], block: ['ब्लॉक', 'एक खाने पर एक रंग की दो या ज़्यादा गोटियाँ'], attack: ['काटना', 'कटी गोटी कहाँ जाती है'], six: ['6 आना', '6 पर फिर से फेंको। लगातार…'], goal: ['घर पहुँचना', 'घर के लिए ज़रूरी अंक'], dbl: ['डबल', 'दो गोटियाँ साथ चलती हैं; अकेली गोटी इन्हें नहीं काट सकती, डबल डबल को घर भेजता है'], dd: ['दो पासे', 'दो पासे; दो छक्कों पर एक और बारी (666 को छोड़कर)'], back: ['पीछे कदम', 'उल्टी दिशा में भी चल सकते हैं'] },
      op: { start: ['क्लासिक (6)', '1 या 6', '5 या 6', 'कोई भी अंक'], block: ['उस पर नहीं रुक सकते', 'दीवार (पार भी नहीं)', 'कोई नहीं'], attack: ['क्लासिक (स्टार्ट पर)', '5 पीछे', '10 पीछे'], six: ['लगातार तीन रद्द', 'लगातार दो रद्द', 'कोई नहीं (दोबारा नहीं)'], goal: ['ठीक-ठीक', 'उछलकर वापस', 'कुछ भी (ज़्यादा भी चलेगा)'], dbl: ['कोई नहीं', 'मानक डबल', 'अलग होने वाला डबल (एक अकेले जा सकती है)'], dd: ['कोई नहीं', 'अलग (हर गोटी पर एक पासा)', 'आज़ाद (अलग या जोड़)', '666 (दो छक्के = तीन आज़ाद छक्के)'], back: ['कोई नहीं', 'हमेशा', 'सिर्फ़ गोटी काटते समय', 'पीछे एक (सिर्फ़ 1 पर)'] } },
    ar: { ui: ['قواعد المنزل', '★ هي القاعدة المعتادة. يمكن الجمع بين كل القواعد.', 'الأساسية', 'متقدمة (مطفأة كلها عادةً)', 'الرجوع إلى ★', 'تم', 'قواعد المنزل للودو فقط. تُلعب باتشيسي بقواعدها التقليدية.', 'تشغيل', 'إيقاف', 'تغيّر {n}'],
      it: { quick: ['بداية سريعة', 'قطعة تبدأ على خانة البداية؛ وإن لم تكن لك قطعة خارجة فأي رقم يُخرج واحدة'], safe: ['خانات آمنة', 'لا يُؤسر أحد على النجوم وخانات البداية'], start: ['الخروج', 'الأرقام التي تُخرج قطعة (الرمية الإضافية مع 6 فقط)'], block: ['الحواجز', 'قطعتان أو أكثر من لون واحد على خانة'], attack: ['الأسر', 'أين تذهب القطعة المأسورة'], six: ['رمي 6', 'الـ6 تمنح رمية أخرى. على التوالي…'], goal: ['الوصول', 'الرقم اللازم للدخول'], dbl: ['الثنائيات', 'قطعتان متراكبتان تتحركان معًا؛ لا تأسرهما قطعة واحدة، والثنائي يعيد الثنائي'], dd: ['نردان', 'نردان؛ ستتان معًا تمنحان دورًا آخر (عدا 666)'], back: ['الرجوع', 'يمكن التحرك عكس عقارب الساعة أيضًا'] },
      op: { start: ['كلاسيكي (6)', '1 أو 6', '5 أو 6', 'أي رقم'], block: ['لا وقوف عليها', 'جدار (ولا عبور)', 'لا شيء'], attack: ['كلاسيكي (إلى البداية)', 'رجوع 5', 'رجوع 10'], six: ['ثلاث متتالية تُلغى', 'اثنتان متتاليتان تُلغى', 'لا شيء (بلا رمية إضافية)'], goal: ['بالضبط', 'ارتداد', 'أي شيء (التجاوز مقبول)'], dbl: ['لا شيء', 'ثنائي عادي', 'ثنائي قابل للفصل (تذهب واحدة وحدها)'], dd: ['لا شيء', 'منفصل (نرد لكل قطعة)', 'حر (كل نرد أو المجموع)', '666 (ستتان = ثلاث ستات حرة)'], back: ['لا شيء', 'دائمًا', 'فقط عند أكل قطعة', 'رجوع واحد (مع 1 فقط)'] } },
  };
  const Lof = lang => T[lang] || T[(lang || '').slice(0, 2)] || T.en;
  function get() { let h = {}; try { h = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {} const o = Object.assign({}, DEF, h);
    for (const k in OPTS) if (!OPTS[k].includes(o[k])) o[k] = DEF[k]; o.quick = !!o.quick; o.safe = !!o.safe; return o; }
  function set(h) { try { localStorage.setItem(KEY, JSON.stringify(h)); } catch (e) {} }
  const changed = (h = get()) => Object.keys(DEF).filter(k => h[k] !== DEF[k]).length;
  function summary(lang, h = get()) { const L = Lof(lang), n = changed(h); return n ? L.ui[9].replace('{n}', n) : '★'; }

  // colours as variables: the 2D game's night theme by default, the portal's cream cards with theme 'atlas' (2026-11-09)
  const CSS = `
.lhr-ov{--bg:linear-gradient(180deg,#2a2346,#1a1530);--fg:#f1ecff;--sub:#a99fca;--head:#ffd98a;--edge:rgba(255,214,140,.28);--rule:rgba(255,255,255,.08);--ctl:rgba(0,0,0,.25);--ctlb:rgba(255,255,255,.18);--acc:#ffcf6a;--accbg:rgba(255,207,106,.1);--ls:#2c2550;--hov:rgba(255,255,255,.07);--sel:rgba(255,207,106,.16);--selfg:#ffd98a;--swoff:rgba(255,255,255,.16);--sw:linear-gradient(135deg,#ffcf6a,#f0a238);--ok:linear-gradient(180deg,#ffd27a,#e8a23a);--okfg:#2a1600;--hfont:'Shippori Mincho B1','Cormorant Garamond',serif;
  position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,6,16,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .2s}
.lhr-ov.lhr-atlas{--bg:#fffdf7;--fg:#2b3044;--sub:#6a7088;--head:#2b3044;--edge:#efe3c8;--rule:#f1e7d2;--ctl:#fff;--ctlb:#efe3c8;--acc:#ff5d5d;--accbg:#fff1ee;--ls:#fff;--hov:#fff6e2;--sel:#fff1ee;--selfg:#d93c3c;--swoff:#e4dccb;--sw:linear-gradient(135deg,#ff7a6a,#ff5d5d);--ok:linear-gradient(180deg,#ff6f6f,#ff5d5d);--okfg:#fff;--hfont:'RocknRoll One','M PLUS Rounded 1c',sans-serif;background:rgba(43,48,68,.42)}
.lhr-ov.on{opacity:1}
.lhr{width:min(640px,100%);max-height:min(860px,calc(100dvh - 32px));display:flex;flex-direction:column;border-radius:20px;background:var(--bg);color:var(--fg);border:1px solid var(--edge);box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:inherit;overflow:hidden;transform:translateY(8px) scale(.98);transition:transform .22s}
.lhr-atlas .lhr{border:3px solid var(--edge);border-radius:26px;box-shadow:0 6px 0 var(--edge),0 24px 60px rgba(43,48,68,.3)}
.lhr-ov.on .lhr{transform:none}
.lhr-hd{padding:20px 24px 10px}
.lhr-hd h2{margin:0;font:700 21px/1.3 var(--hfont);letter-spacing:.06em;color:var(--head)}
.lhr-atlas .lhr-hd h2{font-weight:400;letter-spacing:.02em}
.lhr-hd p{margin:6px 0 0;font-size:13px;line-height:1.6;color:var(--sub)}
.lhr-bd{overflow-y:auto;padding:4px 24px 12px;overscroll-behavior:contain}
.lhr-sec{margin:14px 0 6px;font-size:12px;letter-spacing:.14em;color:var(--head);font-weight:700}
.lhr-atlas .lhr-sec{color:var(--acc)}
.lhr-row{display:grid;grid-template-columns:minmax(0,1fr) min(260px,60%);align-items:center;gap:4px 14px;padding:11px 0;border-top:1px solid var(--rule)}
.lhr-row .nm{grid-row:1;grid-column:1;font-weight:700;font-size:15px}
.lhr-row .ct{grid-row:1;grid-column:2;justify-self:end;display:flex;justify-content:flex-end;width:100%;min-width:0}
.lhr-row .ds{grid-row:2;grid-column:1 / -1;font-size:12px;line-height:1.55;color:var(--sub)}
.lhr-sw{position:relative;width:52px;height:30px;border-radius:99px;border:0;background:var(--swoff);cursor:pointer;transition:background .2s;padding:0;display:block}
.lhr-sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transition:transform .2s}
.lhr-sw.on{background:var(--sw)}.lhr-sw.on::after{transform:translateX(22px)}
.lhr-dd{position:relative;width:100%;min-width:0}
.lhr-db{width:100%;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;border:1px solid var(--ctlb);background:var(--ctl);color:inherit;font:inherit;font-size:13.5px;cursor:pointer;text-align:start}
.lhr-atlas .lhr-db{border-width:2px;font-weight:700}
.lhr-db span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lhr-db svg{width:14px;height:14px;flex:none;stroke:currentColor;fill:none;stroke-width:2.2;opacity:.7;transition:transform .2s}
.lhr-dd.open .lhr-db{border-color:var(--acc)}.lhr-dd.open .lhr-db svg{transform:rotate(180deg)}
.lhr-dd.chg .lhr-db{border-color:var(--acc);background:var(--accbg)}
.lhr-ls{position:fixed;z-index:9001;padding:6px;border-radius:14px;background:var(--ls);border:1px solid var(--ctlb);box-shadow:0 16px 40px rgba(0,0,0,.35);display:none;overflow-y:auto}
.lhr-dd.open .lhr-ls{display:block}
.lhr-ls button{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:0;border-radius:9px;background:none;color:inherit;font:inherit;font-size:13.5px;text-align:start;cursor:pointer}
.lhr-ls button:hover{background:var(--hov)}.lhr-ls button.sel{background:var(--sel);color:var(--selfg);font-weight:700}
.lhr-st,.lhr-s{color:#ffc61a;text-shadow:0 0 1px rgba(90,60,0,.45)}.lhr-st{width:1em;flex:none}   /* every ★ the same yellow (2026-11-09) */
.lhr-row .nm{display:flex;align-items:center;gap:9px;white-space:nowrap;min-width:0}
.lhr-ic{--ic:#5cc8ff;width:30px;height:30px;flex:none;border-radius:9px;display:grid;place-items:center;color:var(--ic);background:color-mix(in srgb,var(--ic) 14%,transparent);border:1px solid color-mix(in srgb,var(--ic) 40%,transparent)}
.lhr-ic.adv{--ic:#ff6b5e}   /* basic rules blue, advanced red (2026-11-09) */
.lhr-atlas .lhr-ic{--ic:#1f97d0}.lhr-atlas .lhr-ic.adv{--ic:#e5463c}
.lhr-ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lhr-ic svg .f{fill:currentColor;stroke:none}
.lhr-row .ds{padding-inline-start:39px}
@media (max-width:560px){.lhr-row{grid-template-columns:minmax(0,1fr) min(260px,52%)!important}.lhr-row .nm{font-size:14.5px;gap:8px}.lhr-ic{width:27px;height:27px;border-radius:8px}.lhr-ic svg{width:16px;height:16px}.lhr-row .ds{padding-inline-start:35px}}
.lhr-note{margin:14px 0 4px;font-size:12px;color:var(--sub);line-height:1.6}
.lhr-ft{display:flex;gap:10px;justify-content:flex-end;padding:14px 24px 18px;border-top:1px solid var(--rule)}
.lhr-ft button{height:44px;padding:0 20px;border-radius:12px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.lhr-atlas .lhr-ft button{border-radius:99px;height:48px}
.lhr-rs{border:1px solid var(--ctlb);background:var(--ctl);color:inherit;margin-inline-end:auto}
.lhr-atlas .lhr-rs{border-width:2px}
.lhr-ok{border:0;background:var(--ok);color:var(--okfg);min-width:120px}
.lhr-atlas .lhr-ok{box-shadow:0 4px 0 #d93c3c}
@media (max-width:560px){.lhr{border-radius:18px}.lhr-hd,.lhr-bd,.lhr-ft{padding-left:16px;padding-right:16px}}`;
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  // one small line icon per rule (2026-11-09: easier on the eye than a page of text)
  const IC = {
    quick: '<path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z"/>',
    safe: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    start: '<path d="M5.5 21V3.5"/><path d="M5.5 4h11l-2.5 4 2.5 4h-11"/>',
    block: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 12h18M9 5v7M15 12v7"/>',
    attack: '<path d="M4 4l10 10M14 14l2.5-1 1 1-1 2.5L20 20M20 4L10 14M10 14l-2.5-1-1 1 1 2.5L4 20"/>',
    six: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle class="f" cx="9" cy="8.5" r="1.3"/><circle class="f" cx="15" cy="8.5" r="1.3"/><circle class="f" cx="9" cy="12" r="1.3"/><circle class="f" cx="15" cy="12" r="1.3"/><circle class="f" cx="9" cy="15.5" r="1.3"/><circle class="f" cx="15" cy="15.5" r="1.3"/>',
    goal: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle class="f" cx="12" cy="12" r="1.6"/>',
    dbl: '<circle cx="9" cy="14" r="5"/><circle cx="15" cy="10" r="5"/>',
    dd: '<rect x="3" y="8" width="11" height="11" rx="2.5"/><path d="M10 5.5l1-.3a2.5 2.5 0 0 1 3 1.7l2.3 7.5"/><rect x="11" y="3" width="10" height="10" rx="2.5" transform="rotate(15 16 8)"/><circle class="f" cx="8.5" cy="13.5" r="1.3"/>',
    back: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  };
  const icon = k => `<span class="lhr-ic${ADV.includes(k) ? ' adv' : ''}" aria-hidden="true"><svg viewBox="0 0 24 24">${IC[k] || ''}</svg></span>`;
  const star = x => esc(x).replace(/★/g, '<span class="lhr-s">★</span>');   // every ★ in the texts in the same yellow
  function open(o = {}) {
    const lang = o.lang || document.documentElement.lang || 'en', L = Lof(lang);
    if (!document.getElementById('lhrCss')) { const st = document.createElement('style'); st.id = 'lhrCss'; st.textContent = CSS; document.head.appendChild(st); }
    let h = get();
    const ov = document.createElement('div'); ov.className = 'lhr-ov' + (o.theme === 'atlas' ? ' lhr-atlas' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    const row = k => {
      const [nm, ds] = L.it[k];
      if (k === 'quick' || k === 'safe') return `<div class="lhr-row"><div class="nm">${icon(k)}<span>${esc(nm)} <span class="lhr-s">★</span></span></div><div class="ds">${star(ds)}</div><div class="ct"><button type="button" class="lhr-sw${h[k] ? ' on' : ''}" data-k="${k}" role="switch" aria-checked="${h[k]}" aria-label="${esc(nm)}"></button></div></div>`;
      const labs = L.op[k], cur = OPTS[k].indexOf(h[k]);
      return `<div class="lhr-row"><div class="nm">${icon(k)}<span>${esc(nm)}</span></div><div class="ds">${star(ds)}</div><div class="ct"><div class="lhr-dd${h[k] !== DEF[k] ? ' chg' : ''}" data-k="${k}"><button type="button" class="lhr-db" aria-haspopup="listbox"><span>${OPTS[k][cur] === DEF[k] ? '<span class="lhr-s">★</span> ' : ''}${star(labs[cur])}</span>${CHEV}</button>` +
        `<div class="lhr-ls" role="listbox">${OPTS[k].map((v, i) => `<button type="button" role="option" data-v="${v}" class="${v === h[k] ? 'sel' : ''}" aria-selected="${v === h[k]}"><span class="lhr-st">${v === DEF[k] ? '★' : ''}</span>${star(labs[i])}</button>`).join('')}</div></div></div></div>`;
    };
    const paint = () => {
      const bd0 = ov.querySelector('.lhr-bd'), top = bd0 ? bd0.scrollTop : 0;   // (a change keeps the place in the list)
      ov.innerHTML = `<div class="lhr"><div class="lhr-hd"><h2>${esc(L.ui[0])}</h2><p>${L.ui[1].split(/(?<=[。．！？!?.])\s*/).filter(Boolean).map(star).join('<br>')}</p></div><div class="lhr-bd">` +
        `<div class="lhr-sec">${esc(L.ui[2])}</div>${BASIC.map(row).join('')}<div class="lhr-sec">${esc(L.ui[3])}</div>${ADV.map(row).join('')}<p class="lhr-note">${esc(L.ui[6])}</p></div>` +
        `<div class="lhr-ft"><button type="button" class="lhr-rs">${star(L.ui[4])}</button><button type="button" class="lhr-ok">${esc(L.ui[5])}</button></div></div>`;
      const bd = ov.querySelector('.lhr-bd'); bd.scrollTop = top; bd.addEventListener('scroll', shut, { passive: true });
    };
    const shut = () => ov.querySelectorAll('.lhr-dd.open').forEach(x => x.classList.remove('open'));
    // the list opens below the button, or above it when there is more room there (a pull-down near the bottom of the screen)
    function place(dd) {
      const b = dd.querySelector('.lhr-db').getBoundingClientRect(), ls = dd.querySelector('.lhr-ls'), vw = innerWidth;
      const box = ov.querySelector('.lhr-bd').getBoundingClientRect();   // the list stays inside the scrolling part (not over the buttons below)
      ls.style.maxHeight = ''; ls.style.top = ls.style.bottom = ''; ls.style.left = '0px'; ls.style.width = 'max-content'; ls.style.minWidth = b.width + 'px'; ls.style.maxWidth = (vw - 24) + 'px';
      const w = ls.getBoundingClientRect().width;
      ls.style.left = Math.max(12, Math.min(vw - 12 - w, b.right - w)) + 'px';
      const h = ls.scrollHeight, below = box.bottom - b.bottom - 6, above = b.top - Math.max(box.top, 8) - 6;
      if (h + 6 <= below || below >= above) { ls.style.top = (b.bottom + 6) + 'px'; ls.style.maxHeight = (below - 6) + 'px'; }
      else { ls.style.bottom = (innerHeight - b.top + 6) + 'px'; ls.style.maxHeight = (above - 6) + 'px'; }
    }
    paint(); document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
    const close = () => { set(h); ov.classList.remove('on'); setTimeout(() => ov.remove(), 220); removeEventListener('keydown', key, true); if (o.onClose) o.onClose(h); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); const dd = ov.querySelector('.lhr-dd.open'); if (dd) dd.classList.remove('open'); else close(); } };
    addEventListener('keydown', key, true);
    ov.addEventListener('click', e => {
      if (e.target === ov) { close(); return; }
      const sw = e.target.closest('.lhr-sw'); if (sw) { h[sw.dataset.k] = !h[sw.dataset.k]; paint(); return; }
      const opt = e.target.closest('.lhr-ls button'); if (opt) { const dd = opt.closest('.lhr-dd'); h[dd.dataset.k] = opt.dataset.v; paint(); return; }
      const db = e.target.closest('.lhr-db'); if (db) { const dd = db.parentNode, was = dd.classList.contains('open'); ov.querySelectorAll('.lhr-dd.open').forEach(x => x.classList.remove('open')); if (!was) { dd.classList.add('open'); place(dd); } return; }
      if (e.target.closest('.lhr-rs')) { h = Object.assign({}, DEF); paint(); return; }
      if (e.target.closest('.lhr-ok')) { close(); return; }
      ov.querySelectorAll('.lhr-dd.open').forEach(x => x.classList.remove('open'));
    });
  }
  window.LudoHouse = { DEF, OPTS, get, set, open, changed, summary, T };
})();
