/* reversi/opcourse.js — the opening course (定石コース, 2026-11-11).
   Every named line of openings.json is a step of its own, in the order the lines branch (虎 → バーグ・タイガー → コンポス → …),
   grouped in chapters (the sets) under three tabs. A step's page (shared/luxintro.js) says what the opening is and what it aims
   at, which line it grows out of (「虎から 6.b5」) and which lines grow out of it; then:
     ・手順を見る — the line move by move (the page's startStudy): each move's value, rank, flips / openness and the book branches
       of that position, from opcourse-evals.json (tools/opcourse-evals.js: the engine on every position of every line)
     ・実戦練習 — up to 5 positions of the line, 3 moves each (shared/seqprac.js): the line's own move 20, a move into another
       named line 16, otherwise by the engine's value (up to 14); past the line's end the engine's best move is 20. The coach box
       rates each move and the review replays the line.
     ・通し稽古 — as before (the page's startDrill)
   Shares the page's globals (classic scripts): openData, lesson, positions, cur, t, LANG, rlSVG, lxAfter, flipsOf, … */
'use strict';
(function () {
const X = {
  ja: { 'tab.tiger': '虎', 'tab.tiger.d': '縦取りの代表「虎」から、コンポス・ローズビル・金魚などの奥まで', 'tab.rabbit': '兎・猫', 'tab.rabbit.d': '縦取りの3手目c5の「兎」、c4の「猫」。ローズ・燕の奥まで', 'tab.diag': '牛・闘牛', 'tab.diag.d': '斜め取りの「牛」「闘牛」と並び取りの「鼠」、牛の奥まで',
    'b.perp': '縦取り', 'b.diag': '斜め取り', 'b.para': '並び取り', from: '『{p}』から {m} と進んだ形です。', root: 'すべての定石の出発点になる形です。', next: 'この先の定石', seq: '手順',
    study: '手順を見る', studyD: '{n}手を1手ずつ再生。それぞれの手の評価と狙いを解説します', prac: '実戦練習', pracD: '手順の局面から3手ずつ打つ{n}問。1手ごとにコーチが評価します（75点以上で合格）', drillD: '初手から最後まで{c}を担当して手順を打ち切ります',
    pracStep: '実戦練習 {i}/{n}', prompt: '{c}の番です。『{name}』の手順どおりに3手打ちましょう。',
    ply: '{n}手目　{c} {m}', ev: '{c}から見た評価 {v}（打てる{k}手のうち{r}番目）', evBest: 'AIの評価でも最善の手です。', evGap: '最善の {b}（{vb}）より約{d}石損な手ですが、定石として打たれます。', named: 'ここで『{name}』の形になります。', branch: 'この局面から分かれる定石', start: '初期配置です。▶で黒の1手目から再生します。', nums: '盤の数字は次に打てる手の評価（手番側から見た最終石差の予想）、金の丸が定石の手です。', end: '手順はここまで。次の手からは自由に戦います。',
    okLine: '定石どおり、『{name}』の手です。', okOther: '『{other}』へ進む定石の手です。『{name}』の手は {a}。', off: '{m} は定石にない手です（評価 {v}）。『{name}』の手は {a}（評価 {va}）。', aiBest: '定石の先：AIの最善手です。', aiGap: '定石の先：AIの最善は {b}（{vb}）。{m} は約{d}石損（{v}）。', pass: '合格は75点以上です。' },
  en: { 'tab.tiger': 'Tiger', 'tab.tiger.d': 'The Tiger, the main perpendicular opening, and its depths: Comp\'Oth, Rose-bill, Goldfish…', 'tab.rabbit': 'Rabbit · Cat', 'tab.rabbit.d': 'The Rabbit (3.c5) and the Cat (3.c4) of the perpendicular opening, on to the Rose and the Swallow', 'tab.diag': 'Cow · Bull', 'tab.diag.d': 'The diagonal Cow and Bull, the parallel Mouse, and the Cow\'s depths',
    'b.perp': 'Perpendicular', 'b.diag': 'Diagonal', 'b.para': 'Parallel', from: 'Grown out of the {p}: {m}.', root: 'The starting point of the openings that follow.', next: 'Openings that grow out of it', seq: 'Moves',
    study: 'Watch the moves', studyD: 'Replay the {n} moves one by one, with each move\'s value and idea', prac: 'Practice', pracD: '{n} positions of the line, 3 moves each; the coach rates every move (75 pts to pass)', drillD: 'Play {c} from the first move to the last',
    pracStep: 'Practice {i}/{n}', prompt: '{c} to play. Play 3 moves of the {name}.',
    ply: 'Move {n}　{c} {m}', ev: 'Value for {c}: {v} (#{r} of {k} moves)', evBest: 'The engine\'s best move too.', evGap: 'About {d} discs below the best {b} ({vb}), but played as book.', named: 'This makes the {name}.', branch: 'Openings that branch from here', start: 'The starting position. ▶ replays from Black\'s first move.', nums: 'The numbers are the values of the next moves (expected final disc difference for the side to move); the gold ring is the book move.', end: 'The line ends here; play goes on freely.',
    okLine: 'Book move: the {name}.', okOther: 'A book move into the {other}. The {name} plays {a}.', off: '{m} is not a book move ({v}). The {name} plays {a} ({va}).', aiBest: 'Past the book: the engine\'s best move.', aiGap: 'Past the book: the engine prefers {b} ({vb}). {m} loses about {d} discs ({v}).', pass: '75 points to pass.' },
  zh: { 'tab.tiger': '虎', 'tab.tiger.d': '纵取的代表“虎”，以及康波斯、玫瑰喙、金鱼等深处的变化', 'tab.rabbit': '兔・猫', 'tab.rabbit.d': '纵取第3手c5的“兔”、c4的“猫”，直到玫瑰与燕的深处', 'tab.diag': '牛・斗牛', 'tab.diag.d': '斜取的“牛”“斗牛”、并取的“鼠”，以及牛的深处',
    'b.perp': '纵取', 'b.diag': '斜取', 'b.para': '并取', from: '由『{p}』走 {m} 而来。', root: '后面所有定式的出发点。', next: '由此延伸的定式', seq: '手顺',
    study: '观看手顺', studyD: '逐手播放{n}手，讲解每一手的评价与意图', prac: '实战练习', pracD: '从手顺局面各走3手，共{n}题。每一手由教练评价（75分合格）', drillD: '从第1手到最后由你执{c}走完手顺',
    pracStep: '实战练习 {i}/{n}', prompt: '轮到{c}。按『{name}』的手顺走3手。',
    ply: '第{n}手　{c} {m}', ev: '{c}方评价 {v}（可下{k}手中第{r}）', evBest: 'AI评价也是最佳着法。', evGap: '比最佳的 {b}（{vb}）约亏{d}子，但作为定式常被采用。', named: '至此形成『{name}』。', branch: '从此局面分出的定式', start: '初始局面。按▶从黑的第1手播放。', nums: '棋盘上的数字是下一手各点的评价（以行棋方看的最终子数差预测），金圈是定式着法。', end: '手顺到此为止，之后自由对局。',
    okLine: '符合定式，是『{name}』的着法。', okOther: '这是走向『{other}』的定式着法。『{name}』走 {a}。', off: '{m} 不是定式着法（评价 {v}）。『{name}』走 {a}（评价 {va}）。', aiBest: '定式之后：AI的最佳着法。', aiGap: '定式之后：AI最佳是 {b}（{vb}）。{m} 约亏{d}子（{v}）。', pass: '75分以上合格。' },
  'zh-TW': { 'tab.tiger': '虎', 'tab.tiger.d': '縱取的代表「虎」，以及康波斯、玫瑰喙、金魚等深處的變化', 'tab.rabbit': '兔・貓', 'tab.rabbit.d': '縱取第3手c5的「兔」、c4的「貓」，直到玫瑰與燕的深處', 'tab.diag': '牛・鬥牛', 'tab.diag.d': '斜取的「牛」「鬥牛」、並取的「鼠」，以及牛的深處',
    'b.perp': '縱取', 'b.diag': '斜取', 'b.para': '並取', from: '由『{p}』走 {m} 而來。', root: '後面所有定石的出發點。', next: '由此延伸的定石', seq: '手順',
    study: '觀看手順', studyD: '逐手播放{n}手，講解每一手的評價與意圖', prac: '實戰練習', pracD: '從手順局面各走3手，共{n}題。每一手由教練評價（75分合格）', drillD: '從第1手到最後由你執{c}走完手順',
    pracStep: '實戰練習 {i}/{n}', prompt: '輪到{c}。按『{name}』的手順走3手。',
    ply: '第{n}手　{c} {m}', ev: '{c}方評價 {v}（可下{k}手中第{r}）', evBest: 'AI評價也是最佳著法。', evGap: '比最佳的 {b}（{vb}）約虧{d}子，但作為定石常被採用。', named: '至此形成『{name}』。', branch: '從此局面分出的定石', start: '初始局面。按▶從黑的第1手播放。', nums: '棋盤上的數字是下一手各點的評價（以行棋方看的最終子數差預測），金圈是定石著法。', end: '手順到此為止，之後自由對局。',
    okLine: '符合定石，是『{name}』的著法。', okOther: '這是走向『{other}』的定石著法。『{name}』走 {a}。', off: '{m} 不是定石著法（評價 {v}）。『{name}』走 {a}（評價 {va}）。', aiBest: '定石之後：AI的最佳著法。', aiGap: '定石之後：AI最佳是 {b}（{vb}）。{m} 約虧{d}子（{v}）。', pass: '75分以上合格。' },
  ko: { 'tab.tiger': '호랑이', 'tab.tiger.d': '세로잡기의 대표 ‘호랑이’와 콤포스·로즈빌·금붕어 등 깊은 변화까지', 'tab.rabbit': '토끼・고양이', 'tab.rabbit.d': '세로잡기 3수째 c5의 ‘토끼’, c4의 ‘고양이’. 로즈·제비의 깊은 변화까지', 'tab.diag': '소・투우', 'tab.diag.d': '대각잡기의 ‘소’‘투우’와 나란히잡기의 ‘쥐’, 소의 깊은 변화까지',
    'b.perp': '세로잡기', 'b.diag': '대각잡기', 'b.para': '나란히잡기', from: '『{p}』에서 {m}로 나아간 형태입니다.', root: '뒤에 오는 모든 정석의 출발점입니다.', next: '여기서 이어지는 정석', seq: '수순',
    study: '수순 보기', studyD: '{n}수를 한 수씩 재생하며 각 수의 평가와 노림을 해설합니다', prac: '실전 연습', pracD: '수순의 국면에서 3수씩 두는 {n}문제. 한 수마다 코치가 평가합니다(75점 이상 합격)', drillD: '첫 수부터 끝까지 {c}을 맡아 수순을 둡니다',
    pracStep: '실전 연습 {i}/{n}', prompt: '{c} 차례입니다. 『{name}』의 수순대로 3수 두세요.',
    ply: '{n}수째　{c} {m}', ev: '{c} 기준 평가 {v}(둘 수 있는 {k}수 중 {r}번째)', evBest: 'AI 평가로도 최선의 수입니다.', evGap: '최선인 {b}({vb})보다 약 {d}돌 손해지만 정석으로 둡니다.', named: '여기서 『{name}』의 형태가 됩니다.', branch: '이 국면에서 갈라지는 정석', start: '초기 배치입니다. ▶로 흑의 첫 수부터 재생합니다.', nums: '판의 숫자는 다음에 둘 수 있는 수의 평가(둘 차례 쪽에서 본 최종 돌 차이 예상), 금색 원이 정석의 수입니다.', end: '수순은 여기까지. 이후는 자유롭게 싸웁니다.',
    okLine: '정석대로, 『{name}』의 수입니다.', okOther: '『{other}』로 가는 정석의 수입니다. 『{name}』의 수는 {a}.', off: '{m}는 정석에 없는 수입니다(평가 {v}). 『{name}』의 수는 {a}(평가 {va}).', aiBest: '정석 이후: AI의 최선수입니다.', aiGap: '정석 이후: AI의 최선은 {b}({vb}). {m}는 약 {d}돌 손해({v}).', pass: '75점 이상이면 합격입니다.' },
  es: { 'tab.tiger': 'Tigre', 'tab.tiger.d': 'El Tigre, la apertura perpendicular principal, y sus profundidades: Comp\'Oth, Rose-bill, Pez dorado…', 'tab.rabbit': 'Conejo · Gato', 'tab.rabbit.d': 'El Conejo (3.c5) y el Gato (3.c4) de la perpendicular, hasta la Rosa y la Golondrina', 'tab.diag': 'Vaca · Toro', 'tab.diag.d': 'La Vaca y el Toro diagonales, el Ratón paralelo y las profundidades de la Vaca',
    'b.perp': 'Perpendicular', 'b.diag': 'Diagonal', 'b.para': 'Paralela', from: 'Nace de la {p}: {m}.', root: 'El punto de partida de las aperturas que siguen.', next: 'Aperturas que nacen de aquí', seq: 'Jugadas',
    study: 'Ver las jugadas', studyD: 'Reproduce las {n} jugadas una a una, con el valor y la idea de cada una', prac: 'Práctica', pracD: '{n} posiciones de la línea, 3 jugadas cada una; el entrenador valora cada jugada (75 pts para aprobar)', drillD: 'Juega con {c} de la primera jugada a la última',
    pracStep: 'Práctica {i}/{n}', prompt: 'Juegan {c}. Haz 3 jugadas de la {name}.',
    ply: 'Jugada {n}　{c} {m}', ev: 'Valor para {c}: {v} (n.º {r} de {k} jugadas)', evBest: 'También la mejor según el motor.', evGap: 'Unas {d} fichas por debajo de la mejor, {b} ({vb}), pero se juega como teoría.', named: 'Así se forma la {name}.', branch: 'Aperturas que se separan aquí', start: 'La posición inicial. ▶ reproduce desde la primera jugada de las negras.', nums: 'Los números son los valores de las siguientes jugadas (diferencia final esperada para quien mueve); el círculo dorado es la jugada de teoría.', end: 'La línea termina aquí; luego se juega libremente.',
    okLine: 'Jugada de teoría: la {name}.', okOther: 'Jugada de teoría hacia la {other}. La {name} juega {a}.', off: '{m} no es de teoría ({v}). La {name} juega {a} ({va}).', aiBest: 'Fuera de la teoría: la mejor del motor.', aiGap: 'Fuera de la teoría: el motor prefiere {b} ({vb}). {m} pierde unas {d} fichas ({v}).', pass: 'Se aprueba con 75 puntos.' },
  fr: { 'tab.tiger': 'Tigre', 'tab.tiger.d': 'Le Tigre, la grande ouverture perpendiculaire, et ses profondeurs : Comp\'Oth, Rose-bill, Poisson rouge…', 'tab.rabbit': 'Lapin · Chat', 'tab.rabbit.d': 'Le Lapin (3.c5) et le Chat (3.c4) de la perpendiculaire, jusqu\'à la Rose et l\'Hirondelle', 'tab.diag': 'Vache · Taureau', 'tab.diag.d': 'La Vache et le Taureau diagonaux, la Souris parallèle et les profondeurs de la Vache',
    'b.perp': 'Perpendiculaire', 'b.diag': 'Diagonale', 'b.para': 'Parallèle', from: 'Issue de la {p} : {m}.', root: 'Le point de départ des ouvertures qui suivent.', next: 'Ouvertures qui en découlent', seq: 'Coups',
    study: 'Voir les coups', studyD: 'Rejoue les {n} coups un par un, avec la valeur et l\'idée de chacun', prac: 'Entraînement', pracD: '{n} positions de la ligne, 3 coups chacune ; le coach note chaque coup (75 pts pour réussir)', drillD: 'Jouez {c} du premier coup au dernier',
    pracStep: 'Entraînement {i}/{n}', prompt: 'Trait aux {c}. Jouez 3 coups de la {name}.',
    ply: 'Coup {n}　{c} {m}', ev: 'Valeur pour {c} : {v} ({r}e sur {k} coups)', evBest: 'Aussi le meilleur coup du moteur.', evGap: 'Environ {d} pions sous le meilleur, {b} ({vb}), mais joué comme théorie.', named: 'Voici la {name}.', branch: 'Ouvertures qui partent d\'ici', start: 'La position de départ. ▶ rejoue depuis le premier coup noir.', nums: 'Les nombres sont les valeurs des coups suivants (écart final attendu pour le trait) ; le cercle doré est le coup théorique.', end: 'La ligne s\'arrête ici ; la partie continue librement.',
    okLine: 'Coup théorique : la {name}.', okOther: 'Coup théorique vers la {other}. La {name} joue {a}.', off: '{m} n\'est pas théorique ({v}). La {name} joue {a} ({va}).', aiBest: 'Après la théorie : le meilleur coup du moteur.', aiGap: 'Après la théorie : le moteur préfère {b} ({vb}). {m} perd environ {d} pions ({v}).', pass: '75 points pour réussir.' },
  pt: { 'tab.tiger': 'Tigre', 'tab.tiger.d': 'O Tigre, a principal abertura perpendicular, e suas profundezas: Comp\'Oth, Rose-bill, Peixinho-dourado…', 'tab.rabbit': 'Coelho · Gato', 'tab.rabbit.d': 'O Coelho (3.c5) e o Gato (3.c4) da perpendicular, até a Rosa e a Andorinha', 'tab.diag': 'Vaca · Touro', 'tab.diag.d': 'A Vaca e o Touro diagonais, o Rato paralelo e as profundezas da Vaca',
    'b.perp': 'Perpendicular', 'b.diag': 'Diagonal', 'b.para': 'Paralela', from: 'Nasce da {p}: {m}.', root: 'O ponto de partida das aberturas seguintes.', next: 'Aberturas que nascem daqui', seq: 'Lances',
    study: 'Ver os lances', studyD: 'Reproduz os {n} lances um a um, com o valor e a ideia de cada um', prac: 'Prática', pracD: '{n} posições da linha, 3 lances cada; o treinador avalia cada lance (75 pts para passar)', drillD: 'Jogue de {c} do primeiro ao último lance',
    pracStep: 'Prática {i}/{n}', prompt: 'Vez das {c}. Faça 3 lances da {name}.',
    ply: 'Lance {n}　{c} {m}', ev: 'Valor para {c}: {v} ({r}º de {k} lances)', evBest: 'Também o melhor lance do motor.', evGap: 'Cerca de {d} peças abaixo do melhor, {b} ({vb}), mas jogado como teoria.', named: 'Assim se forma a {name}.', branch: 'Aberturas que se separam aqui', start: 'A posição inicial. ▶ reproduz desde o primeiro lance das pretas.', nums: 'Os números são os valores dos próximos lances (diferença final esperada para quem joga); o círculo dourado é o lance teórico.', end: 'A linha termina aqui; depois joga-se livremente.',
    okLine: 'Lance teórico: a {name}.', okOther: 'Lance teórico rumo à {other}. A {name} joga {a}.', off: '{m} não é teórico ({v}). A {name} joga {a} ({va}).', aiBest: 'Após a teoria: o melhor lance do motor.', aiGap: 'Após a teoria: o motor prefere {b} ({vb}). {m} perde cerca de {d} peças ({v}).', pass: '75 pontos para passar.' },
  de: { 'tab.tiger': 'Tiger', 'tab.tiger.d': 'Der Tiger, die wichtigste senkrechte Eröffnung, und seine Tiefen: Comp\'Oth, Rose-bill, Goldfisch…', 'tab.rabbit': 'Hase · Katze', 'tab.rabbit.d': 'Hase (3.c5) und Katze (3.c4) der senkrechten Eröffnung, bis zu Rose und Schwalbe', 'tab.diag': 'Kuh · Stier', 'tab.diag.d': 'Die diagonale Kuh und der Stier, die parallele Maus und die Tiefen der Kuh',
    'b.perp': 'Senkrechte Eröffnung', 'b.diag': 'Diagonale Eröffnung', 'b.para': 'Parallele Eröffnung', from: 'Entsteht aus: {p} – {m}.', root: 'Der Ausgangspunkt der folgenden Eröffnungen.', next: 'Eröffnungen, die daraus entstehen', seq: 'Züge',
    study: 'Züge ansehen', studyD: 'Die {n} Züge einzeln abspielen, mit Wert und Idee jedes Zuges', prac: 'Übung', pracD: '{n} Stellungen der Variante, je 3 Züge; der Coach bewertet jeden Zug (75 P. zum Bestehen)', drillD: 'Spiele {c} vom ersten bis zum letzten Zug',
    pracStep: 'Übung {i}/{n}', prompt: '{c} am Zug. Spiele 3 Züge: {name}.',
    ply: 'Zug {n}　{c} {m}', ev: 'Wert für {c}: {v} (Nr. {r} von {k} Zügen)', evBest: 'Auch der beste Zug der Engine.', evGap: 'Etwa {d} Steine unter dem besten, {b} ({vb}), aber als Theorie gespielt.', named: 'Damit entsteht: {name}.', branch: 'Eröffnungen, die hier abzweigen', start: 'Die Ausgangsstellung. ▶ spielt ab dem ersten Zug von Schwarz ab.', nums: 'Die Zahlen sind die Werte der nächsten Züge (erwartete Steindifferenz für die Seite am Zug); der goldene Ring ist der Theoriezug.', end: 'Die Variante endet hier; danach wird frei gespielt.',
    okLine: 'Theoriezug: {name}.', okOther: 'Ein Theoriezug in Richtung {other}. {name} spielt {a}.', off: '{m} ist kein Theoriezug ({v}). {name} spielt {a} ({va}).', aiBest: 'Nach der Theorie: der beste Zug der Engine.', aiGap: 'Nach der Theorie: die Engine bevorzugt {b} ({vb}). {m} verliert etwa {d} Steine ({v}).', pass: 'Bestanden ab 75 Punkten.' },
  hi: { 'tab.tiger': 'बाघ', 'tab.tiger.d': 'लंबवत ओपनिंग का मुख्य “बाघ” और उसकी गहराइयाँ: कॉम्पोस, रोज़-बिल, गोल्डफ़िश…', 'tab.rabbit': 'खरगोश · बिल्ली', 'tab.rabbit.d': 'लंबवत ओपनिंग की तीसरी चाल c5 “खरगोश” और c4 “बिल्ली”, रोज़ और स्वैलो तक', 'tab.diag': 'गाय · साँड', 'tab.diag.d': 'तिरछी ओपनिंग की “गाय” और “साँड”, समानांतर “चूहा” और गाय की गहराइयाँ',
    'b.perp': 'लंबवत ओपनिंग', 'b.diag': 'तिरछी ओपनिंग', 'b.para': 'समानांतर ओपनिंग', from: '“{p}” से {m} चलकर बना रूप।', root: 'आगे आने वाली सभी ओपनिंग का आरंभ बिंदु।', next: 'इससे निकलने वाली ओपनिंग', seq: 'चालें',
    study: 'चालें देखें', studyD: '{n} चालें एक-एक करके, हर चाल के मूल्यांकन और उद्देश्य के साथ', prac: 'अभ्यास', pracD: 'क्रम की {n} स्थितियों से 3-3 चालें; कोच हर चाल आँकता है (75 अंक पर पास)', drillD: 'पहली से आख़िरी चाल तक {c} से खेलें',
    pracStep: 'अभ्यास {i}/{n}', prompt: '{c} की बारी। “{name}” के क्रम से 3 चालें चलें।',
    ply: 'चाल {n}　{c} {m}', ev: '{c} के लिए मूल्यांकन {v} ({k} चालों में {r}वीं)', evBest: 'इंजन के अनुसार भी सबसे अच्छी चाल।', evGap: 'सबसे अच्छी {b} ({vb}) से लगभग {d} गोटी कम, पर ओपनिंग के रूप में खेली जाती है।', named: 'यहाँ “{name}” बनता है।', branch: 'यहाँ से निकलने वाली ओपनिंग', start: 'शुरुआती स्थिति। ▶ काले की पहली चाल से चलाता है।', nums: 'संख्याएँ अगली चालों का मूल्यांकन हैं (चाल वाले पक्ष के लिए अनुमानित अंतिम अंतर); सुनहरा घेरा ओपनिंग की चाल है।', end: 'क्रम यहाँ समाप्त; आगे खेल स्वतंत्र है।',
    okLine: 'ओपनिंग की चाल: “{name}”।', okOther: '“{other}” की ओर जाने वाली ओपनिंग चाल। “{name}” में {a}।', off: '{m} ओपनिंग की चाल नहीं ({v})। “{name}” में {a} ({va})।', aiBest: 'ओपनिंग के बाद: इंजन की सबसे अच्छी चाल।', aiGap: 'ओपनिंग के बाद: इंजन {b} ({vb}) पसंद करता है। {m} से लगभग {d} गोटी का नुक़सान ({v})।', pass: '75 अंक पर पास।' },
  ar: { 'tab.tiger': 'النمر', 'tab.tiger.d': '«النمر» أهم افتتاحات الأخذ العمودي، وأعماقه: كومبوس وروز-بِل والسمكة الذهبية…', 'tab.rabbit': 'الأرنب · القط', 'tab.rabbit.d': '«الأرنب» (3.c5) و«القط» (3.c4) في الأخذ العمودي، حتى الوردة والسنونو', 'tab.diag': 'البقرة · الثور', 'tab.diag.d': '«البقرة» و«الثور» القطريان و«الفأر» المتوازي، وأعماق البقرة',
    'b.perp': 'الأخذ العمودي', 'b.diag': 'الأخذ القطري', 'b.para': 'الأخذ المتوازي', from: 'نشأ من «{p}» بالنقلات {m}.', root: 'نقطة انطلاق الافتتاحات التالية.', next: 'افتتاحات تنشأ منه', seq: 'النقلات',
    study: 'شاهد النقلات', studyD: 'إعادة النقلات الـ{n} واحدة واحدة مع تقييم كل نقلة وفكرتها', prac: 'تدريب', pracD: '{n} أوضاع من الخط، 3 نقلات لكل منها؛ يقيّم المدرب كل نقلة (النجاح بـ75 نقطة)', drillD: 'العب بـ{c} من النقلة الأولى حتى الأخيرة',
    pracStep: 'تدريب {i}/{n}', prompt: 'دور {c}. العب 3 نقلات من «{name}».',
    ply: 'النقلة {n}　{c} {m}', ev: 'التقييم لـ{c}: {v} (رقم {r} من {k} نقلات)', evBest: 'وهي أيضًا أفضل نقلة عند المحرك.', evGap: 'أقل من الأفضل {b} ({vb}) بنحو {d} أحجار، لكنها تُلعب كافتتاح معروف.', named: 'هنا يتكوّن «{name}».', branch: 'افتتاحات تتفرع من هنا', start: 'الوضع الابتدائي. ▶ يعيد من أول نقلة للأسود.', nums: 'الأرقام تقييمات النقلات التالية (الفارق النهائي المتوقع لمن عليه الدور)؛ الدائرة الذهبية نقلة الافتتاح.', end: 'ينتهي الخط هنا، وبعده اللعب حر.',
    okLine: 'نقلة افتتاح: «{name}».', okOther: 'نقلة افتتاح نحو «{other}». في «{name}» تُلعب {a}.', off: '{m} ليست من الافتتاح ({v}). في «{name}» تُلعب {a} ({va}).', aiBest: 'بعد الافتتاح: أفضل نقلة للمحرك.', aiGap: 'بعد الافتتاح: يفضّل المحرك {b} ({vb}). {m} تخسر نحو {d} أحجار ({v}).', pass: 'النجاح بـ75 نقطة.' },
  ru: { 'tab.tiger': 'Тигр', 'tab.tiger.d': '«Тигр» — главный перпендикулярный дебют — и его глубины: Comp\'Oth, Роуз-билл, Золотая рыбка…', 'tab.rabbit': 'Кролик · Кот', 'tab.rabbit.d': '«Кролик» (3.c5) и «Кот» (3.c4) перпендикулярного дебюта, до Розы и Ласточки', 'tab.diag': 'Корова · Бык', 'tab.diag.d': 'Диагональные «Корова» и «Бык», параллельная «Мышь» и глубины Коровы',
    'b.perp': 'Перпендикулярный дебют', 'b.diag': 'Диагональный дебют', 'b.para': 'Параллельный дебют', from: 'Вырастает из «{p}»: {m}.', root: 'Отправная точка следующих дебютов.', next: 'Дебюты, которые из него вырастают', seq: 'Ходы',
    study: 'Смотреть ходы', studyD: '{n} ходов по одному — с оценкой и идеей каждого', prac: 'Практика', pracD: '{n} позиций линии по 3 хода; тренер оценивает каждый ход (75 очк. для зачёта)', drillD: 'Играйте за {c} с первого хода до последнего',
    pracStep: 'Практика {i}/{n}', prompt: 'Ход {c}. Сделайте 3 хода по «{name}».',
    ply: 'Ход {n}　{c} {m}', ev: 'Оценка для {c}: {v} ({r}-й из {k} ходов)', evBest: 'И лучший ход движка.', evGap: 'Примерно на {d} фишек хуже лучшего {b} ({vb}), но играется по теории.', named: 'Так получается «{name}».', branch: 'Дебюты, которые отсюда расходятся', start: 'Начальная позиция. ▶ — с первого хода чёрных.', nums: 'Числа — оценки следующих ходов (ожидаемая итоговая разница для стороны на ходу); золотое кольцо — ход по теории.', end: 'Линия заканчивается; дальше игра свободная.',
    okLine: 'Ход по теории: «{name}».', okOther: 'Ход по теории в сторону «{other}». В «{name}» — {a}.', off: '{m} — не теория ({v}). В «{name}» — {a} ({va}).', aiBest: 'После теории: лучший ход движка.', aiGap: 'После теории: движок предпочитает {b} ({vb}). {m} теряет около {d} фишек ({v}).', pass: 'Зачёт от 75 очков.' },
  id: { 'tab.tiger': 'Harimau', 'tab.tiger.d': 'Harimau, pembukaan tegak lurus utama, dan kedalamannya: Comp\'Oth, Rose-bill, Ikan Mas…', 'tab.rabbit': 'Kelinci · Kucing', 'tab.rabbit.d': 'Kelinci (3.c5) dan Kucing (3.c4) dari pembukaan tegak lurus, hingga Mawar dan Walet', 'tab.diag': 'Sapi · Banteng', 'tab.diag.d': 'Sapi dan Banteng diagonal, Tikus paralel, dan kedalaman Sapi',
    'b.perp': 'Pembukaan tegak lurus', 'b.diag': 'Pembukaan diagonal', 'b.para': 'Pembukaan paralel', from: 'Tumbuh dari {p}: {m}.', root: 'Titik awal pembukaan-pembukaan berikutnya.', next: 'Pembukaan yang tumbuh dari sini', seq: 'Langkah',
    study: 'Lihat langkahnya', studyD: 'Putar {n} langkah satu per satu, dengan nilai dan ide tiap langkah', prac: 'Latihan', pracD: '{n} posisi dari jalur ini, 3 langkah masing-masing; pelatih menilai tiap langkah (lulus 75 poin)', drillD: 'Mainkan {c} dari langkah pertama sampai terakhir',
    pracStep: 'Latihan {i}/{n}', prompt: 'Giliran {c}. Mainkan 3 langkah {name}.',
    ply: 'Langkah {n}　{c} {m}', ev: 'Nilai untuk {c}: {v} (ke-{r} dari {k} langkah)', evBest: 'Juga langkah terbaik mesin.', evGap: 'Sekitar {d} keping di bawah yang terbaik, {b} ({vb}), tetapi dimainkan sebagai teori.', named: 'Di sini terbentuk {name}.', branch: 'Pembukaan yang bercabang dari sini', start: 'Posisi awal. ▶ memutar dari langkah pertama Hitam.', nums: 'Angka adalah nilai langkah berikutnya (perkiraan selisih akhir bagi yang melangkah); lingkaran emas adalah langkah teori.', end: 'Jalur berakhir di sini; selanjutnya bermain bebas.',
    okLine: 'Langkah teori: {name}.', okOther: 'Langkah teori menuju {other}. {name} memainkan {a}.', off: '{m} bukan langkah teori ({v}). {name} memainkan {a} ({va}).', aiBest: 'Setelah teori: langkah terbaik mesin.', aiGap: 'Setelah teori: mesin memilih {b} ({vb}). {m} rugi sekitar {d} keping ({v}).', pass: 'Lulus dengan 75 poin.' },
  tr: { 'tab.tiger': 'Kaplan', 'tab.tiger.d': 'Dik açılışın başı Kaplan ve derinlikleri: Comp\'Oth, Rose-bill, Japon Balığı…', 'tab.rabbit': 'Tavşan · Kedi', 'tab.rabbit.d': 'Dik açılışta 3.c5 Tavşan ve 3.c4 Kedi; Gül ve Kırlangıç\'a kadar', 'tab.diag': 'İnek · Boğa', 'tab.diag.d': 'Çapraz İnek ve Boğa, paralel Fare ve İnek\'in derinlikleri',
    'b.perp': 'Dik açılış', 'b.diag': 'Çapraz açılış', 'b.para': 'Paralel açılış', from: '{p} açılışından {m} ile doğar.', root: 'Sonraki açılışların başlangıç noktası.', next: 'Buradan doğan açılışlar', seq: 'Hamleler',
    study: 'Hamleleri izle', studyD: '{n} hamleyi tek tek oynatır; her hamlenin değeri ve fikri', prac: 'Alıştırma', pracD: 'Hattın {n} konumundan 3\'er hamle; koç her hamleyi değerlendirir (geçmek için 75 puan)', drillD: 'İlk hamleden son hamleye {c} ile oyna',
    pracStep: 'Alıştırma {i}/{n}', prompt: 'Sıra {c} tarafında. {name} hattından 3 hamle oynayın.',
    ply: '{n}. hamle　{c} {m}', ev: '{c} için değer {v} ({k} hamlenin {r}. sırası)', evBest: 'Motora göre de en iyi hamle.', evGap: 'En iyisi {b} ({vb}) hamlesinden yaklaşık {d} taş kötü, ama teori olarak oynanır.', named: 'Burada {name} oluşur.', branch: 'Buradan ayrılan açılışlar', start: 'Başlangıç konumu. ▶ Siyahın ilk hamlesinden oynatır.', nums: 'Sayılar sonraki hamlelerin değeridir (sıradaki taraf için beklenen son fark); altın halka teori hamlesidir.', end: 'Hat burada biter; sonrası serbest oyundur.',
    okLine: 'Teori hamlesi: {name}.', okOther: '{other} hattına giden teori hamlesi. {name} hattında {a}.', off: '{m} teori hamlesi değil ({v}). {name} hattında {a} ({va}).', aiBest: 'Teoriden sonra: motorun en iyi hamlesi.', aiGap: 'Teoriden sonra: motor {b} ({vb}) hamlesini seçer. {m} yaklaşık {d} taş kaybettirir ({v}).', pass: 'Geçmek için 75 puan.' },
};
const tx = (k, v) => { let s = (X[LANG] || X.en)[k]; if (s == null) s = X.en[k]; if (s == null) return k; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
const BASE = [['f5d6', 'b.perp'], ['f5f6', 'b.diag'], ['f5f4', 'b.para']];
const TABS = [['tiger', ['op-tiger', 'op-tigervar', 'op-compos', 'op-rosebill'], 'f5d6c3d3c4'], ['rabbit', ['op-rabbit', 'op-roseswallow'], 'f5d6c5'], ['diag', ['op-cow', 'op-bull', 'op-cowdeep'], 'f5f6e6f4']];
const PT2 = o => (o && (o[LANG] || o.en || o.ja)) || '';
const splitM = s => String(s || '').match(/../g) || [];
let STEPS = null, EV = null, evP = null;
function steps() {
  if (STEPS || !openData || !openData.sets) return STEPS || [];
  STEPS = []; const byId = new Map(openData.sets.map((s, i) => [s.id, i])), used = new Set();
  const add = (tab, si) => { const set = openData.sets[si]; used.add(si); set.lines.forEach((ln, li) => STEPS.push({ tab, si, li, set, ln, chap: set.id })); };
  for (const [tab, ids] of TABS) for (const id of ids) if (byId.has(id)) add(tab, byId.get(id));
  openData.sets.forEach((s, si) => { if (!used.has(si) && s.kind === 'opening') add('tiger', si); });
  return STEPS;
}
const loadEv = () => evP || (evP = fetch('opcourse-evals.json?v=1').then(r => r.json()).then(d => (EV = d)).catch(() => (EV = {})));
// the named line a sequence grows out of: the longest other named line (or a base opening) that is a strict prefix
function parentOf(moves) {
  let best = null;
  for (const n of openData.names || []) if (n.m.length < moves.length && moves.startsWith(n.m) && (!best || n.m.length > best.m.length)) best = { m: n.m, name: PT2(n.n) };
  if (!best) for (const [m, k] of BASE) if (moves.startsWith(m) && moves.length > m.length) best = { m, name: tx(k) };
  return best;
}
const childrenOf = moves => (openData.names || []).filter(n => n.m.length > moves.length && n.m.startsWith(moves) && !(openData.names || []).some(o => o !== n && o.m.length > moves.length && o.m.length < n.m.length && n.m.startsWith(o.m)));
const nameAt = m => { const n = (openData.names || []).find(x => x.m === m); return n ? PT2(n.n) : ''; };
const seqHtml = (moves, from) => splitM(moves).map((m, i) => `<span class="oc-m${i * 2 >= from ? ' nw' : ''}"><i>${i + 1}</i>${m}</span>`).join('');
const tagged = txt => String(txt).split(/(?=【)|(?=\[[\p{L}\p{M}]{1,16}\])/u).map(x => x.trim()).filter(Boolean).map(p => { const m = p.match(/^(?:【([^】]+)】|\[([\p{L}\p{M}]{1,16})\])\s*(.*)$/su); return m ? `<p><span class="oc-tg">${m[1] || m[2]}</span>${m[3]}</p>` : `<p>${p}</p>`; }).join('');
const stepId = st => 'opl:' + st.ln.moves;
const evFmt = v => (v > 0 ? '+' : '') + (+v).toFixed(1);
// ---------------------------------------------------------------- the list: three tabs, chapters inside, a card per line
async function list(focus) {
  await loadOpenings(); loadEv();
  lessonSrc = 'open'; selTab('open'); STEPS = null; const S = steps();
  const F = focus != null ? S[focus] : null; if (F) { lxTab('opc', F.tab); lxTab('opc:' + F.tab, F.chap); }   // (back from a step: its tab and chapter)
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = '';
  const cats = TABS.map(([key, , mv]) => ({ key, mv, tab: tx('tab.' + key), name: tx('tab.' + key), desc: tx('tab.' + key + '.d'), items: [] }));
  let chap = null, no = 0;
  S.forEach((st, i) => {
    const c = cats.find(x => x.key === st.tab) || cats[0];
    if (st.chap !== chap) { chap = st.chap; no = 0; const x = LT(st.set); (c.chaps = c.chaps || []).push({ id: chap, title: x.title, short: x.short }); }
    const s = lxState(stepId(st)), p = lxAfter(st.ln.moves), board = rlSVG(p.cells, { marks: p.last >= 0 ? { [p.last]: 'new' } : {} });
    c.items.push({ chap, done: s.done, html: lxCard({ i, op: 1, board, no: 'STEP ' + (++no), st: s.st, title: PT2(st.ln.name), sub: PT2(st.ln.aim), desc: splitM(st.ln.moves).join(' '), p: s.pr ? s.pr.best / 100 : 0, done: s.done }) });
  });
  render(cats);
  showLessonView('list'); showOverlay('#lessonOverlay');
  if (F) { const el = $('#lessonList').querySelector(`[data-i="${focus}"]`); if (el) el.scrollIntoView({ block: 'center' }); }
}
function render(cats) {
  const kind = 'opc'; let curK = lxTab(kind);
  if (!cats.some(c => c.key === curK)) curK = (cats.find(c => c.items.some(x => !x.head && !x.done)) || cats[0]).key;
  const L = $('#lessonList'); L.classList.add('lx-on');
  const ic = c => { const p = lxAfter(c.mv); return rlSVG(p.cells, { crop: [2, 1, 4, 4], marks: { [p.last]: 'new' } }); };
  const c = cats.find(x => x.key === curK), its = c.items.filter(x => !x.head), n = its.filter(x => x.done).length, m = its.length;
  // the tab's chapters as a second row of categories (2026-11-11: 51 steps in one list were too many)
  const chaps = c.chaps || []; let ch = lxTab(kind + ':' + curK); if (!chaps.some(x => x.id === ch)) ch = (chaps.find(x => c.items.some(y => y.chap === x.id && !y.done)) || chaps[0] || {}).id;
  const cur = chaps.find(x => x.id === ch), inCh = c.items.filter(x => x.chap === ch);
  const sub = chaps.length > 1 ? `<div class="oc-sub" role="tablist">${chaps.map(x => { const z = c.items.filter(y => y.chap === x.id), k = z.filter(y => y.done).length; return `<button role="tab" data-occ="${x.id}" class="${x.id === ch ? 'sel' : ''}"><span class="nm">${x.title}</span><span class="ct${k === z.length && k ? ' ok' : ''}">${k}/${z.length}</span></button>`; }).join('')}</div>` : '';
  L.innerHTML = `<div class="lx"><div class="lx-tabs" role="tablist">${cats.map(x => { const z = x.items.filter(y => !y.head), k = z.filter(y => y.done).length; return `<button role="tab" data-oct="${x.key}" class="${x.key === curK ? 'sel' : ''}"><span class="ic">${ic(x)}</span><span class="nm">${x.tab}</span><span class="ct${k === z.length && k ? ' ok' : ''}">${k}/${z.length}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${ic(c)}</span><span class="tx"><b>${c.name}</b><small>${c.desc}</small></span><span class="pg"><small>${t('lx.prog', { n, m })}</small>${lxBar(m ? n / m : 0, true)}</span></div>` +
    sub + (cur ? `<div class="oc-ch"><b>${cur.title}</b><small>${cur.short}</small></div>` : '') +
    `<div class="lx-grid">${inCh.map(x => x.html).join('')}</div>${openData.credit ? `<p class="lx-credit">${PT2(openData.credit)}</p>` : ''}</div>`;
  L.querySelectorAll('[data-oct]').forEach(b => b.onclick = () => { lxTab(kind, b.dataset.oct); render(cats); L.scrollTop = 0; });
  L.querySelectorAll('[data-occ]').forEach(b => b.onclick = () => { lxTab(kind + ':' + curK, b.dataset.occ); render(cats); });
}
// ---------------------------------------------------------------- a step's page
function intro(i) {
  const S = steps(), st = S[i]; if (!st) return list();
  introIdx = i; const ln = st.ln, nm = PT2(ln.name), seq = splitM(ln.moves), par = parentOf(ln.moves);
  const chapNo = S.filter((x, k) => k <= i && x.chap === st.chap).length, x = LT(st.set);
  $('#btnLessonStart').classList.add('hidden');
  const p = lxAfter(ln.moves), fig = rlSVG(p.cells, { marks: p.last >= 0 ? { [p.last]: 'new' } : {} });
  const ip = opInfoParts(ln), probs = picks(ln.moves).length, s = lxState(stepId(st));
  const lead = [`<b>${PT2(ln.aim)}</b>`, `<div class="oc-seq">${seqHtml(ln.moves, par ? par.m.length : 0)}</div>`,
    `<span class="oc-from">${par ? tx('from', { p: par.name, m: splitM(ln.moves.slice(par.m.length)).map((m, k) => `${par.m.length / 2 + k + 1}.${m}`).join(' ') }) : tx('root')}</span>`];
  const kids = childrenOf(ln.moves);
  const kidsH = kids.length ? `<div class="oc-kids">${kids.map(n => { const j = S.findIndex(z => z.ln.moves === n.m); return `<button type="button" class="oc-kid"${j >= 0 ? ` data-ocgo="${j}"` : ''}><b>${PT2(n.n)}</b><small>${splitM(n.m.slice(ln.moves.length)).map((m, k) => `${ln.moves.length / 2 + k + 1}.${m}`).join(' ')}</small></button>`; }).join('')}</div>` : '';
  const go = () => {
    const U = (window.__lux && (__lux.ui[LANG] || __lux.ui.en)) || {}, H = k => LuxIntro.head(k, LANG);
    LuxIntro.opening({ step: `${x.title} · STEP ${chapNo}`, title: nm, fig, cap: (U.figO || '') + (s.pr ? ` · ${s.st.text}` : ''), lead,
      choices: [{ ic: '📖', b: tx('study'), small: tx('studyD', { n: seq.length }), attrs: 'data-ocs="1"' }, { ic: '✎', b: tx('prac'), small: tx('pracD', { n: probs }), attrs: 'data-ocp="1"' },
        { ic: '●', b: t('op.drillB'), small: tx('drillD', { c: t('black') }), attrs: 'data-ocd="1"' }, { ic: '○', b: t('op.drillW'), small: tx('drillD', { c: t('white') }), attrs: 'data-ocd="2"' }],
      secs: [ip.rest && { h: H('think'), html: tagged(ip.rest) }, ip.origin && { h: H('hist'), html: tagged(ip.origin) }, kidsH && { h: tx('next'), html: kidsH }].filter(Boolean) });
  };
  if (window.LuxIntro) { if (window.__lux) go(); else LuxIntro.load('lux.json?v=1').then(d => { window.__lux = d; if (introIdx === i) go(); }); }
  showLessonView('intro'); showOverlay('#lessonOverlay');
  $('#lessonOverlay .modal') && ($('#lessonOverlay .modal').scrollTop = 0);
}
$('#liBody').addEventListener('click', e => {
  if (lessonSrc !== 'open') return;
  const st = steps()[introIdx]; if (!st) return;
  const b = e.target.closest('[data-ocs],[data-ocp],[data-ocd],[data-ocgo]'); if (!b) return;
  e.stopPropagation();
  if (b.dataset.ocgo) { intro(+b.dataset.ocgo); return; }
  if (b.dataset.ocs) startStudy(st.si, st.li); else if (b.dataset.ocp) practice(introIdx); else startDrill(st.si, st.li, +b.dataset.ocd);
}, true);
const indexOf = (si, li) => steps().findIndex(z => z.si === si && z.li === li);
// ---------------------------------------------------------------- 手順を見る: each move's value, rank and the branches here
async function studyNote() {
  const L = lesson; if (!L || !L.study) return '';
  if (!EV) await loadEv();
  const seq = splitM(L.ln.moves), k = cur, pre = seq.slice(0, k).join('');
  let h = '';
  if (k === 0) h += `<p>${tx('start')}</p>`;
  else {
    const m = seq[k - 1], mover = positions[k].mover, before = seq.slice(0, k - 1).join(''), list = EV[before] || [];
    const me = list.find(x => x[0] === m), r = list.findIndex(x => x[0] === m) + 1, fa = moveFacts(positions[k - 1].cells, rlSq(m), mover);
    h += `<p class="oc-ply"><b>${tx('ply', { n: k, c: cname(mover), m })}</b></p>`;
    if (me) h += `<p>${tx('ev', { c: cname(mover), v: evFmt(me[1]), k: list.length, r })} ${r === 1 || me[1] >= list[0][1] - 0.05 ? tx('evBest') : tx('evGap', { b: list[0][0], vb: evFmt(list[0][1]), d: (list[0][1] - me[1]).toFixed(1) })}</p>`;
    if (fa) h += `<p class="oc-fact">${t('op.fact', { f: fa.flips, o: fa.open, m: fa.opp })}</p>`;
    const nn = nameAt(pre); if (nn) h += `<p class="oc-named">${tx('named', { name: `<b>${nn}</b>` })}</p>`;
  }
  if (k >= seq.length) h += `<p class="oc-dim">${tx('end')}</p>`;
  const kids = childrenOf(pre).filter(n => n.m.length > pre.length);
  const by = new Map(); for (const n of kids) { const mv = n.m.slice(pre.length, pre.length + 2); if (!by.has(mv)) by.set(mv, []); by.get(mv).push(PT2(n.n)); }
  if (by.size > 1 || (by.size === 1 && k < seq.length && ![...by.keys()].includes(seq[k]))) h += `<div class="oc-br"><small>${tx('branch')}</small>${[...by].map(([mv, ns]) => `<span class="${mv === seq[k] ? 'on' : ''}"><b>${mv}</b> ${ns.join('・')}</span>`).join('')}</div>`;
  return h;
}
function studyMarks() {
  const L = lesson; if (!L || !L.study || !EV) return;
  const seq = splitM(L.ln.moves), pre = seq.slice(0, cur).join(''), list = EV[pre];
  clearHints(); boardEl.querySelectorAll('.mark').forEach(e => e.remove());
  if (cur >= seq.length || !list) return;
  const best = list[0][1];
  for (const [m, v] of list) { const q = rlSq(m), d = document.createElement('div'); d.className = 'hint' + (v >= best - 0.05 ? ' best' : ''); d.textContent = evFmt(v); cellEls[q].appendChild(d); cellEls[q].classList.add('hinted'); }
  addMark(rlSq(seq[cur]), 'best');
}
async function studyFill() {
  const L = lesson; if (!L || !L.study) return;
  const h = await studyNote(); if (lesson !== L) return;
  const el = document.getElementById('ocNote'); if (el) el.innerHTML = h + `<p class="oc-dim">${tx('nums')}</p>`;
  studyMarks();
}
// ---------------------------------------------------------------- 実戦練習 (shared/seqprac.js)
// up to 5 start positions on the line: the last three of the player's turns and two earlier, spread from where it left its parent
function picks(moves) {
  const n = splitM(moves).length, par = parentOf(moves), d = par ? par.m.length / 2 : 1;
  const c = []; for (let k = Math.max(1, d - 4); k < n; k++) c.push(k);   // (each window — the player's moves k, k+2, k+4 — reaches the new part)
  if (c.length <= 5) return c;
  const out = new Set(); for (let j = 0; j < 5; j++) out.add(c[Math.round(j * (c.length - 1) / 4)]);
  return [...out].sort((a, b) => a - b);
}
function practice(i) {
  const st = steps()[i]; if (!st) return;
  busyToken++; cancelAI(); cancelAna();
  if (!lesson) savedGame = { positions, cur, reviewing };
  if (lesson && lesson.timer) clearInterval(lesson.timer);
  hideOverlay('#lessonOverlay'); hideOverlay('#resultOverlay');
  $('#lsNext').style.display = ''; $('#lsHint').textContent = t('ls.hint');
  lesson = { opc: true, idx: i, st, ln: st.ln, l: st.set, ks: picks(st.ln.moves), i: 0, results: [], answered: false };
  introIdx = i;
  document.body.classList.add('in-lesson');
  loadEv().then(() => { if (lesson && lesson.opc && lesson.idx === i) loadProb(); });
}
const seqOf = () => splitM(lesson.ln.moves);
function rebuild(ms, anim) {
  positions = [{ cells: initialCells(), toMove: BLACK, last: -1, mover: 0, evalB: null }];
  let a = null; for (const m of ms) { a = applyMove(rlSq(m)); if (!a) break; }
  cur = positions.length - 1; reviewing = false;
  clearMarks(); clearHints(); renderBoard(anim && a ? a : null); if (anim && a) playPlace(a.flips.length);
}
function loadProb() {
  const L = lesson, k = L.ks[L.i], seq = seqOf(), base = seq.slice(0, k);
  L.answered = false; L.base = base;
  $('#reviewBar').classList.remove('show'); $('#coach').classList.remove('show');
  rebuild(base, false);
  if (window.SeqPrac) SeqPrac.stop();
  const L0 = L, I0 = L.i;
  const full = line => base.concat(line), key = line => full(line).join('');
  const lineMove = line => { const f = full(line); for (let j = 0; j < f.length; j++) if (f[j] !== seq[j]) return null; return seq[f.length] || null; };
  const live = line => new Promise(res => { const ms = full(line); rebuildTmp(ms, (cells, toMove) => { if (!toMove) return res([]); analyze(cells, toMove, 900, (list, done) => { if (done) res((list || []).slice().sort((a, b) => b.score - a.score).map(x => [sqName(x.move), Math.round(x.score * 10) / 10])); }); }); });
  const evs = async line => EV[key(line)] || await live(line);
  SeqPrac.start({
    lang: () => LANG,
    book: () => null,
    best: line => lineMove(line),
    model: line => lineMove(line),
    analyze: async line => (await evs(line)).map(([u, v]) => ({ u, wr: 1 / (1 + Math.exp(-v / 6)) })),
    think: async line => { const l = await evs(line); return l[0] ? l[0][0] : null; },
    rate: async (line, u) => {
      const want = lineMove(line), l = await evs(line), mine = l.find(x => x[0] === u), top = l[0];
      const v = x => x ? evFmt(x[1]) : '—', nm = PT2(lesson && lesson.ln ? lesson.ln.name : L0.ln.name);
      if (want) {
        if (u === want) return { pts: 20, best: want, why: esc(tx('okLine', { name: nm })) };
        const other = nameAt(key(line) + u) || ((openData.names || []).find(n => n.m.startsWith(key(line) + u)) ? PT2((openData.names || []).find(n => n.m.startsWith(key(line) + u)).n) : '');
        if (other) return { pts: 16, best: want, why: esc(tx('okOther', { other, name: nm, a: want })) };
        const w = l.find(x => x[0] === want), d = top && mine ? Math.max(0, top[1] - mine[1]) : 4;
        return { pts: Math.max(0, Math.min(14, Math.round(14 - 2.5 * d))), best: want, why: esc(tx('off', { m: u, v: v(mine), name: nm, a: want, va: v(w) })) };
      }
      if (!top || !mine || mine[1] >= top[1] - 0.05) return { pts: 20, best: u, why: esc(tx('aiBest')) };
      const d = top[1] - mine[1];
      return { pts: Math.max(0, Math.min(18, Math.round(18 - 3 * d))), best: top[0], why: esc(tx('aiGap', { b: top[0], vb: evFmt(top[1]), m: u, d: d.toFixed(1), v: evFmt(mine[1]) })) };
    },
    name: (line, u) => `${full(line).length + 1}.${u}`,
    over: line => { let o = true; rebuildTmp(full(line), (c, tm) => { o = !tm; }); return o; },
    show: (line, anim) => { if (lesson !== L0 || L0.i !== I0) return; rebuild(full(line), anim); card(); },
    mark: u => { clearMarks(); addMark(rlSq(u), 'best'); },
    changed: () => { if (lesson !== L0 || L0.i !== I0) return; card(); },
    done: total => { if (lesson !== L0 || L0.i !== I0) return; L0.results[L0.i] = total; L0.answered = true; card(); try { if (total >= 16) sfxCorrect(); else playChime(false); } catch (e) {} },
  });
  card();
}
// the position after `ms` (not shown): f(cells, toMove)
function rebuildTmp(ms, f) {
  const c = initialCells(); let col = BLACK;
  for (const m of ms) { const q = rlSq(m); let fl = flipsOf(c, q, col); if (!fl.length) { col = 3 - col; fl = flipsOf(c, q, col); if (!fl.length) break; } c[q] = col; for (const x of fl) c[x] = col; col = 3 - col; }
  if (!legalMoves(c, col).length) col = legalMoves(c, 3 - col).length ? 3 - col : 0;
  f(c, col);
}
function card() {
  const L = lesson; if (!L || !L.opc) return;
  const n = L.ks.length, S = window.SeqPrac && SeqPrac.state();
  $('#lsStep').textContent = tx('pracStep', { i: L.i + 1, n }) + `  ·  ${t('ls.total', { n: L.results.reduce((a, b) => a + (b || 0), 0) })}`;
  $('#lsTitle').textContent = PT2(L.ln.name);
  $('#lsDots').innerHTML = L.ks.map((_, k) => `<i class="${L.results[k] != null ? (L.results[k] >= 16 ? 'ok' : L.results[k] >= 10 ? 'mid' : 'ng') : k === L.i ? 'cur' : ''}"></i>`).join('');
  const seq = seqOf(), at = L.base.length + (S ? S.line.length : 0);
  $('#lsPrompt').innerHTML = (S && !S.done ? tx('prompt', { c: `<b>${cname(positions[positions.length - 1].toMove || BLACK)}</b>`, name: PT2(L.ln.name) }) : '')
    + `<div class="oc-seq sm">${seq.map((m, j) => `<span class="oc-m${j < L.base.length ? ' pl' : j < at && S && S.line[j - L.base.length] === m ? ' ok' : ''}${j === at ? ' at' : ''}"><i>${j + 1}</i>${j < at || (S && S.done) ? m : '?'}</span>`).join('')}</div>`;
  $('#lsFb').innerHTML = window.SeqPrac ? SeqPrac.status() : '';
  $('#lsNext').textContent = t(L.i === n - 1 ? 'ls.result' : 'ls.next');
  $('#lsNext').disabled = !L.answered; $('#lsNext').style.opacity = L.answered ? 1 : .4;
}
function next() {
  const L = lesson; if (!L || !L.opc || !L.answered) return;
  if (L.i < L.ks.length - 1) { L.i++; loadProb(); return; }
  const sum = L.results.reduce((a, b) => a + (b || 0), 0), n = Math.round(sum * 100 / (20 * L.ks.length)), pass = n >= 75, id = stepId(L.st);
  const pr = progressOf(id); pr.best = Math.max(pr.best, n); pr.clear = pr.clear || pass; pr.v = 2; lessonProgress[id] = pr; saveLessonProgress();
  introIdx = L.idx;
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + L.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${tx('pass')}`);
  $('#btnLessonNextStep').style.display = introIdx + 1 < steps().length ? '' : 'none';
  if (L.results.every(x => x >= 16)) { sfxFanfare(0.05); confetti(); } else if (pass) playChime(true);
  if (window.SeqPrac) SeqPrac.stop();
  showLessonView('done'); showOverlay('#lessonOverlay');
}
function click(sq) {
  const L = lesson; if (!L || !L.opc || !window.SeqPrac) return;
  const S = SeqPrac.state(); if (!S || S.done || !S.waiting) return;
  const p = positions[positions.length - 1]; if (!p.toMove || !flipsOf(p.cells, sq, p.toMove).length) return;
  SeqPrac.move(sqName(sq));
}
const CSS = `#liBody .oc-seq{display:flex;flex-wrap:wrap;gap:4px 6px;margin:8px 0 4px}#liBody .oc-m,#lessonCard .oc-m{display:inline-flex;align-items:baseline;gap:2px;font:600 14px/1.5 "JetBrains Mono",ui-monospace,monospace;color:var(--dim,#9aa)}
.oc-m i{font-style:normal;font-size:.72em;opacity:.7}#liBody .oc-m.nw{color:var(--brass,#d8b56a)}#liBody .oc-from{display:block;font-size:13px;color:var(--dim,#9aa)}
#lessonCard .oc-seq.sm{display:flex;flex-wrap:wrap;gap:2px 6px;margin-top:6px}#lessonCard .oc-m{font-size:12.5px}#lessonCard .oc-m.pl{color:#d6dfda}#lessonCard .oc-m.ok{color:#6fd3a0}#lessonCard .oc-m.at{color:var(--brass,#d8b56a);text-decoration:underline}
#liBody .oc-tg{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.06em;color:#1a1408;background:var(--brass,#d8b56a);border-radius:5px;padding:0 7px;margin-inline-end:8px;vertical-align:1px}
#liBody .oc-kids{display:flex;flex-wrap:wrap;gap:8px}#liBody .oc-kid{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 12px;border-radius:10px;border:1px solid rgba(201,169,97,.35);background:rgba(201,169,97,.06);color:inherit;font:inherit;cursor:pointer;text-align:start}
#liBody .oc-kid:hover{border-color:var(--brass,#d8b56a)}#liBody .oc-kid b{font-size:14px}#liBody .oc-kid small{font:500 11.5px "JetBrains Mono",monospace;opacity:.75}
#lessonList .oc-sub{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}#lessonList .oc-sub button{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:99px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.18);color:var(--muted,#bbb);font:inherit;font-size:13px;cursor:pointer}#lessonList .oc-sub button.sel{border-color:var(--brass,#d8b56a);color:var(--brass,#d8b56a);background:rgba(201,169,97,.12)}#lessonList .oc-sub .ct{font:600 11px "JetBrains Mono",monospace;opacity:.75}#lessonList .oc-sub .ct.ok{color:#6fd3a0;opacity:1}
html.atlas-skin #lessonList .oc-sub button{background:#fff;border:2px solid #ead9b6;color:#4a5068;box-shadow:0 2px 0 #ead9b6}html.atlas-skin #lessonList .oc-sub button.sel{border-color:#ff8a7a;color:#d93c3c;background:#fff1ee}
#lessonList .oc-ch{grid-column:1/-1;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:14px 2px 2px;padding-bottom:6px;border-bottom:1px solid rgba(201,169,97,.25)}#lessonList .oc-ch:first-child{margin-top:0}#lessonList .oc-ch b{font-size:15px;color:var(--brass,#d8b56a)}#lessonList .oc-ch small{font-size:12px;color:var(--dim,#9aa)}
#ocNote p{margin:4px 0;font-size:14px;line-height:1.75}#ocNote .oc-ply{font-size:15px}#ocNote .oc-fact{font-size:12.5px;color:var(--dim,#9aa)}#ocNote .oc-named{color:var(--brass,#d8b56a)}#ocNote .oc-dim{font-size:12px;color:var(--dim,#9aa)}
#ocNote .oc-br{display:flex;flex-wrap:wrap;gap:4px 10px;margin:6px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.18)}#ocNote .oc-br small{flex-basis:100%;font-size:11.5px;color:var(--dim,#9aa)}#ocNote .oc-br span{font-size:13px}#ocNote .oc-br span.on b{color:var(--brass,#d8b56a)}
html.atlas-skin #ocNote .oc-br{background:#f6f1e4}html.atlas-skin #lessonList .oc-ch b,html.atlas-skin #ocNote .oc-named{color:#c47a12}`;
if (!document.getElementById('oc-css')) { const s = document.createElement('style'); s.id = 'oc-css'; s.textContent = CSS; document.head.appendChild(s); }
window.OC = { list, intro, practice, next, click, card, studyFill, indexOf, steps, picks, tx };
})();
