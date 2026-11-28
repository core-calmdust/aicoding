/* 花札（こいこい）— the hands-on tutorial on the real table (hanafuda/tutorial.js)
   Same idea as poker / blackjack / guandan: a spotlight + bubble over the actual game screen, three chapters:
     1. the cards: months and the four kinds, where things are on the table (read, Next);
     2. one fixed month played for real: capture with the same month, the deck draw, the opponent's turn,
        a yaku appears (Flower Viewing) and the Stop / Koi-koi choice;
     3. the main yaku and points, the koi-koi doubling, coach and lessons.
   Action steps accept only the move asked for and go on by themselves after a correct move (with a small timer bar).
   Your saved game comes back afterwards. */
(function () {
'use strict';
const A = window.HFApp, HF = window.HF, C = window.HFCards, $ = s => document.querySelector(s);
const LAYOUT = { oya: 0, hands: [[9, 32, 0, 20, 41, 46, 26, 38], [4, 30, 24, 44, 14, 18, 42, 10]], field: [8, 33, 12, 17, 29, 22, 36, 5], draws: [13, 47, 3] };
const SCRIPT = [4];   // the opponent's play (its draw is automatic)
const card = id => `.hf[data-id="${id}"]`;
const STEPS = [
  { id: 'goal', ch: 1, center: true },
  { id: 'months', ch: 1, center: true, pics: [[0, 1, 2, 3], [8, 9, 10, 11]] },
  { id: 'kinds', ch: 1, center: true, pics: [[0, 4, 1, 2]], labels: true },
  { id: 'table', ch: 1, at: ['#myHand', '#field', '#deck', '#myCaps'] },
  { id: 'play1', ch: 2, act: 9, at: ['#myHand ' + card(9), '#field ' + card(8)], done: s => s.log.length >= 1 && s.log[0].card === 9 },
  { id: 'drew', ch: 2, at: ['#myCaps', '#deck'], when: s => s.log.length >= 2 },
  { id: 'opp', ch: 2, at: ['#oppCaps', '#field ' + card(47)], when: s => s.turn === 0 && s.phase === 'play' && s.log.length >= 4 },
  { id: 'play2', ch: 2, act: 32, at: ['#myHand ' + card(32), '#field ' + card(33)], done: s => s.log.some(e => e.card === 32) },
  { id: 'koi', ch: 2, top: true, when: s => s.phase === 'koi', done: s => s.phase === 'over', wait: true },
  { id: 'result', ch: 2, top: true, when: s => s.phase === 'over', wait: 'res' },
  { id: 'yaku', ch: 3, center: true, table: true },
  { id: 'double', ch: 3, center: true },
  { id: 'coach', ch: 3, at: ['#coachBox'] },
  { id: 'learn', ch: 3, at: ['#btnRules', '#btnLesson'] },
  { id: 'end', ch: 3, center: true, last: true },
];
const T = {
ja: { chap1: '札を知る', chap2: '1か月やってみる', chap3: '役と点', step: '{n} / {m}', next: '次へ', back: '前へ', quit: 'やめる', finish: '対局をはじめる', doIt: 'やってみましょう',
  'goal.t': 'こいこいとは', 'goal.b': '場の札と<b>同じ月</b>の札を合わせて取り、取り札で<b>役</b>を作るゲームです。先に役を作った方が、その月の点を取ります。',
  'months.t': '12か月×4枚', 'months.b': '48枚は12か月に分かれ、<b>同じ草花なら同じ月</b>です。上は松（1月）、下は桜（3月）の4枚。',
  'kinds.t': '札の種類', 'kinds.b': '<b>光</b>・<b>タネ</b>・<b>短冊</b>・<b>カス</b>の4種類。光は5枚だけの特別な札で、高い役になります。',
  'table.t': '卓の見かた', 'table.b': '下があなたの<b>手札</b>、中央が<b>場</b>、左が<b>山札</b>。取った札は手札の下に種類別に並びます。',
  'play1.t': '同じ月で取る', 'play1.b': '手札の<b>桜の短冊</b>と場の<b>桜に幕</b>は同じ3月。光っている手札を出して取りましょう。',
  'drew.t': '山札をめくる', 'drew.b': '出したあと、山札が1枚めくられます。<b>藤の短冊</b>が出て、場の藤と合わせて取れました。',
  'opp.t': '相手の番', 'opp.b': '相手は梅を出して場の梅の短冊を取りました。山札の<b>桐</b>は場に同じ月がないので、そのまま場に置かれます。',
  'play2.t': '役をねらう', 'play2.b': '手札の<b>菊に盃</b>で、場の菊の短冊を取りましょう。取り札の桜に幕と盃がそろいます。',
  'koi.t': '役ができた！', 'koi.b': '<b>花見で一杯</b>（5点）です。「勝負」なら5点で終わり、「こいこい」なら続けて点を伸ばせますが、相手に役を作られると相手の点が2倍に。今回は<b>勝負</b>を押しましょう。',
  'result.t': 'この月はあなたの勝ち', 'result.b': '5点を取りました。これを12か月（6・3か月も選べます）くり返し、合計点で勝負します。結果のボタンを押して先へ。',
  'yaku.t': '主な役と点', 'yaku.b': '光の役は、五光10・四光8・雨四光7・三光5。ほかの役は重ねて数えます。',
  'double.t': '点が2倍になるとき', 'double.b': '合計<b>7点以上</b>なら2倍。相手が<b>こいこい</b>したあとに自分が役を作ると、さらに2倍。役が近い相手の前でのこいこいは危険です。',
  'coach.t': 'コーチ', 'coach.b': 'あなたと相手の役の進み具合、危ない札、おすすめの手を表示します。右上のスイッチでオン・オフ。',
  'learn.t': 'ルールとレッスン', 'learn.b': 'ルール説明で札を動かして復習し、レッスンで札の見分け方・役・こいこいの判断を練習できます。',
  'end.t': 'これで遊べます！', 'end.b': 'まずは弱めのAIと対局してみましょう。',
  'offer.h': 'はじめての方へ', 'offer.p': '実際の卓で1か月を遊びながら覚えるチュートリアルがあります。', 'offer.go': 'チュートリアル', 'offer.no': 'あとで',
},
en: { chap1: 'The cards', chap2: 'Play one month', chap3: 'Yaku & points', step: '{n} / {m}', next: 'Next', back: 'Back', quit: 'Quit', finish: 'Start playing', doIt: 'Your move',
  'goal.t': 'What is Koi-Koi?', 'goal.b': 'Match field cards of the <b>same month</b> to capture them, and build <b>yaku</b> from your captures. The first to make a yaku scores the month.',
  'months.t': '12 months × 4 cards', 'months.b': 'The 48 cards form 12 months; <b>the same plant means the same month</b>. Top: pine (January). Bottom: cherry (March).',
  'kinds.t': 'Kinds of cards', 'kinds.b': 'There are <b>Brights</b>, <b>Animals</b>, <b>Ribbons</b> and <b>Chaff</b>. Only five cards are Brights; they make the big yaku.',
  'table.t': 'The table', 'table.b': 'Bottom: your <b>hand</b>. Middle: the <b>field</b>. Left: the <b>deck</b>. Your captures line up under your hand, by kind.',
  'play1.t': 'Capture with the same month', 'play1.b': 'Your <b>cherry ribbon</b> and the <b>cherry curtain</b> on the field are both March. Play the glowing card to take it.',
  'drew.t': 'The deck draw', 'drew.b': 'After you play, the top card of the deck is turned. A <b>wisteria ribbon</b> came up and took the wisteria on the field.',
  'opp.t': 'The opponent’s turn', 'opp.b': 'The opponent played plum and took the plum ribbon. Its draw, a <b>paulownia</b>, had no match, so it stays on the field.',
  'play2.t': 'Go for a yaku', 'play2.b': 'Play your <b>sake cup</b> to take the chrysanthemum ribbon. With the cherry curtain, that makes a yaku.',
  'koi.t': 'A yaku!', 'koi.b': '<b>Flower Viewing</b>, 5 points. “Stop” ends the month with 5. “Koi-koi” plays on for more, but if the opponent then makes a yaku, they score double. Press <b>Stop</b> this time.',
  'result.t': 'You win the month', 'result.b': 'You scored 5. Play 12 months (or 6 or 3) and compare totals. Press the button in the result box to go on.',
  'yaku.t': 'Main yaku and points', 'yaku.b': 'Brights: Five Lights 10, Four 8, Rainy Four 7, Three 5. The other yaku add up together.',
  'double.t': 'When points double', 'double.b': 'A total of <b>7 or more</b> is doubled. Making a yaku after the opponent called <b>koi-koi</b> doubles again. Calling koi-koi when the opponent is close to a yaku is risky.',
  'coach.t': 'The coach', 'coach.b': 'Shows your and the opponent’s yaku progress, dangerous cards and a suggested move. Switch it on or off at its top right.',
  'learn.t': 'Rules and lessons', 'learn.b': 'Review the rules by moving cards, and practise telling cards apart, yaku and koi-koi decisions in the lessons.',
  'end.t': 'You are ready!', 'end.b': 'Try a game against an easy AI first.',
  'offer.h': 'New to Koi-Koi?', 'offer.p': 'A tutorial lets you learn while playing one month on the real table.', 'offer.go': 'Tutorial', 'offer.no': 'Later',
},
};
const KEYS = Object.keys(T.ja);
const MORE = {
zh: ['认识牌', '实际玩一个月', '役与分数', '{n} / {m}', '下一步', '上一步', '退出', '开始对局', '请操作',
  'こいこい是什么', '把场上<b>同一个月</b>的牌配对收走，用收到的牌组成<b>役</b>。先成役的一方拿下这个月的分数。',
  '12个月×4张', '48张牌分为12个月，<b>花草相同就是同一个月</b>。上排是松（1月），下排是樱（3月）。',
  '牌的种类', '分为<b>光</b>、<b>种</b>、<b>短册</b>、<b>渣</b>四类。光只有5张，能组成高分的役。',
  '牌桌的看法', '下方是你的<b>手牌</b>，中间是<b>场</b>，左边是<b>牌堆</b>。收到的牌按种类排在手牌下方。',
  '同月收牌', '手里的<b>樱短册</b>和场上的<b>樱幕</b>都是3月。打出发光的手牌把它收走。',
  '翻牌堆', '出牌后会翻开牌堆一张。翻出<b>藤短册</b>，和场上的藤配对收走了。',
  '对手的回合', '对手打出梅，收走了场上的梅短册。翻出的<b>桐</b>场上没有同月牌，就留在场上。',
  '瞄准役', '用手里的<b>菊上杯</b>收走场上的菊短册。和樱幕凑在一起……',
  '成役了！', '<b>花见酒</b>，5分。按“决胜”以5分结束；喊“こいこい”可以继续加分，但若对手成役，对手得分翻倍。这次请按<b>决胜</b>。',
  '这个月你赢了', '你拿到5分。这样进行12个月（也可选6或3个月），比合计分数。点结果框里的按钮继续。',
  '主要的役与分数', '光的役：五光10、四光8、雨四光7、三光5。其他役可以叠加计算。',
  '分数翻倍的时候', '合计<b>7分以上</b>翻倍。对手喊了<b>こいこい</b>后你成役，再翻倍。对手快成役时喊こいこい很危险。',
  '教练', '显示双方役的进度、危险的牌和推荐着法。用右上角开关打开或关闭。',
  '规则与课程', '在规则说明里动手复习，在课程里练习认牌、役和こいこい的判断。',
  '可以开始玩了！', '先和较弱的AI下一局吧。', '第一次玩？', '在真正的牌桌上玩一个月，边玩边学的教程。', '教程', '以后再说'],
'zh-TW': ['認識牌', '實際玩一個月', '役與分數', '{n} / {m}', '下一步', '上一步', '退出', '開始對局', '請操作',
  'こいこい是什麼', '把場上<b>同一個月</b>的牌配對收走，用收到的牌組成<b>役</b>。先成役的一方拿下這個月的分數。',
  '12個月×4張', '48張牌分為12個月，<b>花草相同就是同一個月</b>。上排是松（1月），下排是櫻（3月）。',
  '牌的種類', '分為<b>光</b>、<b>種</b>、<b>短冊</b>、<b>渣</b>四類。光只有5張，能組成高分的役。',
  '牌桌的看法', '下方是你的<b>手牌</b>，中間是<b>場</b>，左邊是<b>牌堆</b>。收到的牌按種類排在手牌下方。',
  '同月收牌', '手裡的<b>櫻短冊</b>和場上的<b>櫻幕</b>都是3月。打出發光的手牌把它收走。',
  '翻牌堆', '出牌後會翻開牌堆一張。翻出<b>藤短冊</b>，和場上的藤配對收走了。',
  '對手的回合', '對手打出梅，收走了場上的梅短冊。翻出的<b>桐</b>場上沒有同月牌，就留在場上。',
  '瞄準役', '用手裡的<b>菊上杯</b>收走場上的菊短冊。和櫻幕湊在一起……',
  '成役了！', '<b>花見酒</b>，5分。按「決勝」以5分結束；喊「こいこい」可以繼續加分，但若對手成役，對手得分加倍。這次請按<b>決勝</b>。',
  '這個月你贏了', '你拿到5分。這樣進行12個月（也可選6或3個月），比合計分數。點結果框裡的按鈕繼續。',
  '主要的役與分數', '光的役：五光10、四光8、雨四光7、三光5。其他役可以疊加計算。',
  '分數加倍的時候', '合計<b>7分以上</b>加倍。對手喊了<b>こいこい</b>後你成役，再加倍。對手快成役時喊こいこい很危險。',
  '教練', '顯示雙方役的進度、危險的牌和推薦著法。用右上角開關開啟或關閉。',
  '規則與課程', '在規則說明裡動手複習，在課程裡練習認牌、役和こいこい的判斷。',
  '可以開始玩了！', '先和較弱的AI下一局吧。', '第一次玩？', '在真正的牌桌上玩一個月，邊玩邊學的教學。', '教學', '以後再說'],
ko: ['패 알기', '한 달 해 보기', '역과 점수', '{n} / {m}', '다음', '이전', '그만두기', '대국 시작', '해 보세요',
  '코이코이란', '바닥의 <b>같은 달</b> 패를 맞춰 가져오고, 가져온 패로 <b>역</b>을 만듭니다. 먼저 역을 만든 쪽이 그 달의 점수를 얻습니다.',
  '12개월×4장', '48장은 12개월로 나뉘고, <b>같은 꽃이면 같은 달</b>입니다. 위는 소나무(1월), 아래는 벚꽃(3월).',
  '패의 종류', '<b>광</b>·<b>열끗</b>·<b>띠</b>·<b>피</b> 네 종류. 광은 5장뿐인 특별한 패로 높은 역이 됩니다.',
  '테이블 보는 법', '아래가 내 <b>손패</b>, 가운데가 <b>바닥</b>, 왼쪽이 <b>더미</b>. 가져온 패는 손패 아래에 종류별로 놓입니다.',
  '같은 달로 가져오기', '손패의 <b>벚꽃 띠</b>와 바닥의 <b>벚꽃 장막</b>은 같은 3월. 빛나는 손패를 내서 가져오세요.',
  '더미 뒤집기', '패를 낸 뒤 더미에서 1장이 뒤집힙니다. <b>등나무 띠</b>가 나와 바닥의 등나무와 맞춰 가져왔습니다.',
  '상대 차례', '상대는 매화를 내서 바닥의 매화 띠를 가져갔습니다. 뒤집은 <b>오동</b>은 같은 달이 없어 바닥에 놓입니다.',
  '역을 노리기', '손패의 <b>국화 술잔</b>으로 바닥의 국화 띠를 가져오세요. 벚꽃 장막과 함께라면…',
  '역이 생겼다!', '<b>꽃구경 한잔</b>, 5점. "승부"면 5점으로 끝, "코이코이"면 계속해서 점수를 늘릴 수 있지만 상대가 역을 만들면 상대 점수가 2배. 이번엔 <b>승부</b>를 누르세요.',
  '이번 달은 당신의 승리', '5점을 얻었습니다. 이렇게 12개월(6·3개월도 선택 가능)을 반복해 합계 점수로 겨룹니다. 결과 창의 버튼을 눌러 계속.',
  '주요 역과 점수', '광 역: 오광10·사광8·비사광7·삼광5. 다른 역은 겹쳐서 셉니다.',
  '점수가 2배가 될 때', '합계 <b>7점 이상</b>이면 2배. 상대가 <b>코이코이</b>한 뒤 내가 역을 만들면 또 2배. 역이 가까운 상대 앞에서의 코이코이는 위험합니다.',
  '코치', '나와 상대의 역 진행, 위험한 패, 추천 수를 보여 줍니다. 오른쪽 위 스위치로 켜고 끕니다.',
  '규칙과 레슨', '규칙 설명에서 패를 움직이며 복습하고, 레슨에서 패 구별·역·코이코이 판단을 연습할 수 있습니다.',
  '이제 플레이할 수 있어요!', '먼저 약한 AI와 대국해 보세요.', '처음이신가요?', '실제 테이블에서 한 달을 플레이하며 배우는 튜토리얼이 있습니다.', '튜토리얼', '나중에'],
es: ['Las cartas', 'Juega un mes', 'Yaku y puntos', '{n} / {m}', 'Siguiente', 'Atrás', 'Salir', 'Empezar a jugar', 'Tu jugada',
  '¿Qué es Koi-Koi?', 'Empareja cartas del campo del <b>mismo mes</b> para capturarlas y forma <b>yaku</b> con ellas. Quien forma un yaku primero gana los puntos del mes.',
  '12 meses × 4 cartas', 'Las 48 cartas forman 12 meses; <b>misma planta, mismo mes</b>. Arriba: pino (enero). Abajo: cerezo (marzo).',
  'Tipos de cartas', 'Hay <b>Brillantes</b>, <b>Animales</b>, <b>Cintas</b> y <b>Paja</b>. Solo cinco son Brillantes y forman los grandes yaku.',
  'La mesa', 'Abajo, tu <b>mano</b>; en medio, el <b>campo</b>; a la izquierda, el <b>mazo</b>. Tus capturas se ordenan bajo tu mano, por tipo.',
  'Captura con el mismo mes', 'Tu <b>cinta de cerezo</b> y la <b>cortina de cerezo</b> del campo son de marzo. Juega la carta que brilla para llevártela.',
  'Robar del mazo', 'Después de jugar se gira la carta de arriba del mazo. Salió una <b>cinta de glicina</b> y capturó la glicina del campo.',
  'El turno del rival', 'El rival jugó ciruelo y se llevó la cinta de ciruelo. Su carta robada, una <b>paulonia</b>, no tenía pareja y queda en el campo.',
  'A por un yaku', 'Juega tu <b>copa de sake</b> para llevarte la cinta del crisantemo. Junto con la cortina de cerezo…',
  '¡Un yaku!', '<b>Ver flores</b>, 5 puntos. «Parar» termina el mes con 5. «Koi-koi» sigue para sumar más, pero si el rival forma un yaku, cobra el doble. Esta vez pulsa <b>Parar</b>.',
  'Ganas el mes', 'Has sumado 5. Se juegan 12 meses (o 6 o 3) y se comparan los totales. Pulsa el botón del resultado para seguir.',
  'Yaku principales', 'Brillantes: Cinco Luces 10, Cuatro 8, Cuatro con lluvia 7, Tres 5. Los demás yaku se suman entre sí.',
  'Cuándo se duplica', 'Un total de <b>7 o más</b> se duplica. Formar un yaku después del <b>koi-koi</b> del rival lo duplica otra vez. Decir koi-koi con el rival cerca de un yaku es arriesgado.',
  'El entrenador', 'Muestra el progreso de yaku de ambos, cartas peligrosas y una jugada sugerida. Se activa con el interruptor de arriba a la derecha.',
  'Reglas y lecciones', 'Repasa las reglas moviendo cartas y practica en las lecciones a distinguir cartas, los yaku y el koi-koi.',
  '¡Ya puedes jugar!', 'Prueba primero contra una IA fácil.', '¿Nuevo en Koi-Koi?', 'Un tutorial te enseña jugando un mes en la mesa real.', 'Tutorial', 'Luego'],
fr: ['Les cartes', 'Jouer un mois', 'Yaku et points', '{n} / {m}', 'Suivant', 'Retour', 'Quitter', 'Commencer à jouer', 'À vous',
  'Le Koi-Koi, c’est quoi ?', 'Associez les cartes du terrain du <b>même mois</b> pour les capturer, et formez des <b>yaku</b> avec vos prises. Le premier à former un yaku marque le mois.',
  '12 mois × 4 cartes', 'Les 48 cartes forment 12 mois ; <b>même plante, même mois</b>. En haut : le pin (janvier). En bas : le cerisier (mars).',
  'Sortes de cartes', 'Il y a <b>Lumières</b>, <b>Animaux</b>, <b>Rubans</b> et <b>Déchets</b>. Seules cinq cartes sont des Lumières ; elles font les grands yaku.',
  'La table', 'En bas, votre <b>main</b> ; au milieu, le <b>terrain</b> ; à gauche, la <b>pioche</b>. Vos prises se rangent sous votre main, par sorte.',
  'Capturer avec le même mois', 'Votre <b>ruban de cerisier</b> et le <b>rideau de cerisier</b> du terrain sont de mars. Jouez la carte qui brille pour le prendre.',
  'La pioche', 'Après avoir joué, la carte du dessus de la pioche est retournée. Un <b>ruban de glycine</b> est sorti et a pris la glycine du terrain.',
  'Le tour adverse', 'L’adversaire a joué un prunier et pris le ruban de prunier. Sa pioche, un <b>paulownia</b>, n’a pas de paire et reste sur le terrain.',
  'Viser un yaku', 'Jouez votre <b>coupe de saké</b> pour prendre le ruban du chrysanthème. Avec le rideau de cerisier…',
  'Un yaku !', '<b>Contempler les fleurs</b>, 5 points. « Arrêter » finit le mois avec 5. « Koi-koi » continue pour plus, mais si l’adversaire forme un yaku, il marque double. Cette fois, appuyez sur <b>Arrêter</b>.',
  'Vous gagnez le mois', 'Vous marquez 5. On joue 12 mois (ou 6 ou 3) et on compare les totaux. Appuyez sur le bouton du résultat pour continuer.',
  'Principaux yaku', 'Lumières : Cinq 10, Quatre 8, Quatre sous la pluie 7, Trois 5. Les autres yaku s’additionnent.',
  'Quand les points doublent', 'Un total de <b>7 ou plus</b> double. Former un yaku après le <b>koi-koi</b> adverse double encore. Dire koi-koi quand l’adversaire est proche d’un yaku est risqué.',
  'Le coach', 'Affiche la progression des yaku des deux joueurs, les cartes dangereuses et un coup conseillé. Interrupteur en haut à droite.',
  'Règles et leçons', 'Révisez les règles en déplaçant les cartes, et entraînez-vous dans les leçons : reconnaître les cartes, les yaku et le koi-koi.',
  'Vous pouvez jouer !', 'Essayez d’abord contre une IA facile.', 'Nouveau au Koi-Koi ?', 'Un tutoriel vous apprend en jouant un mois sur la vraie table.', 'Tutoriel', 'Plus tard'],
pt: ['As cartas', 'Jogue um mês', 'Yaku e pontos', '{n} / {m}', 'Próximo', 'Voltar', 'Sair', 'Começar a jogar', 'Sua vez',
  'O que é Koi-Koi?', 'Combine cartas do campo do <b>mesmo mês</b> para capturá-las e forme <b>yaku</b> com elas. Quem forma um yaku primeiro marca o mês.',
  '12 meses × 4 cartas', 'As 48 cartas formam 12 meses; <b>mesma planta, mesmo mês</b>. Em cima: pinheiro (janeiro). Embaixo: cerejeira (março).',
  'Tipos de cartas', 'Há <b>Brilhantes</b>, <b>Animais</b>, <b>Fitas</b> e <b>Palha</b>. Só cinco são Brilhantes e fazem os grandes yaku.',
  'A mesa', 'Embaixo, sua <b>mão</b>; no meio, o <b>campo</b>; à esquerda, o <b>monte</b>. Suas capturas ficam sob a mão, por tipo.',
  'Capture com o mesmo mês', 'Sua <b>fita de cerejeira</b> e a <b>cortina de cerejeira</b> do campo são de março. Jogue a carta que brilha para levá-la.',
  'Virar o monte', 'Depois de jogar, a carta de cima do monte é virada. Saiu uma <b>fita de glicínia</b> e capturou a glicínia do campo.',
  'A vez do rival', 'O rival jogou ameixeira e levou a fita de ameixeira. A carta virada, uma <b>paulównia</b>, não tinha par e fica no campo.',
  'Mire um yaku', 'Jogue sua <b>taça de saquê</b> para levar a fita do crisântemo. Junto com a cortina de cerejeira…',
  'Um yaku!', '<b>Ver as flores</b>, 5 pontos. «Parar» encerra o mês com 5. «Koi-koi» segue para mais, mas se o rival formar um yaku, ele pontua em dobro. Desta vez, aperte <b>Parar</b>.',
  'Você venceu o mês', 'Você marcou 5. Jogam-se 12 meses (ou 6 ou 3) e comparam-se os totais. Aperte o botão do resultado para seguir.',
  'Principais yaku', 'Brilhantes: Cinco Luzes 10, Quatro 8, Quatro com chuva 7, Três 5. Os outros yaku somam entre si.',
  'Quando dobra', 'Um total de <b>7 ou mais</b> dobra. Formar um yaku depois do <b>koi-koi</b> do rival dobra de novo. Dizer koi-koi com o rival perto de um yaku é arriscado.',
  'O treinador', 'Mostra o progresso de yaku dos dois, cartas perigosas e uma jogada sugerida. Liga e desliga no botão do canto superior direito.',
  'Regras e lições', 'Revise as regras movendo cartas e pratique nas lições: reconhecer cartas, yaku e o koi-koi.',
  'Você já pode jogar!', 'Experimente primeiro contra uma IA fácil.', 'Novo no Koi-Koi?', 'Um tutorial ensina jogando um mês na mesa real.', 'Tutorial', 'Depois'],
de: ['Die Karten', 'Einen Monat spielen', 'Yaku und Punkte', '{n} / {m}', 'Weiter', 'Zurück', 'Beenden', 'Spiel starten', 'Du bist dran',
  'Was ist Koi-Koi?', 'Nimm Feldkarten desselben <b>Monats</b> und bilde aus deinen Stichen <b>Yaku</b>. Wer zuerst ein Yaku bildet, punktet den Monat.',
  '12 Monate × 4 Karten', 'Die 48 Karten bilden 12 Monate; <b>gleiche Pflanze, gleicher Monat</b>. Oben: Kiefer (Januar). Unten: Kirsche (März).',
  'Kartenarten', 'Es gibt <b>Lichter</b>, <b>Tiere</b>, <b>Bänder</b> und <b>Spreu</b>. Nur fünf Karten sind Lichter; sie bilden die großen Yaku.',
  'Der Tisch', 'Unten deine <b>Hand</b>, in der Mitte das <b>Feld</b>, links der <b>Stapel</b>. Deine Stiche liegen unter der Hand, nach Art sortiert.',
  'Mit gleichem Monat nehmen', 'Dein <b>Kirschband</b> und der <b>Kirschvorhang</b> auf dem Feld sind beide März. Spiele die leuchtende Karte.',
  'Vom Stapel', 'Nach dem Ausspielen wird die oberste Stapelkarte aufgedeckt. Ein <b>Glyzinienband</b> kam und nahm die Glyzinie vom Feld.',
  'Zug des Gegners', 'Der Gegner spielte Pflaume und nahm das Pflaumenband. Seine gezogene <b>Paulownie</b> passte nicht und bleibt liegen.',
  'Auf ein Yaku zielen', 'Spiele deine <b>Sakeschale</b> und nimm das Chrysanthemenband. Zusammen mit dem Kirschvorhang…',
  'Ein Yaku!', '<b>Blütenschau</b>, 5 Punkte. „Aufhören“ beendet den Monat mit 5. „Koi-koi“ spielt weiter, doch bildet der Gegner ein Yaku, punktet er doppelt. Drücke diesmal <b>Aufhören</b>.',
  'Du gewinnst den Monat', 'Du hast 5 Punkte. Gespielt werden 12 Monate (oder 6 oder 3), dann zählt die Summe. Drücke den Knopf im Ergebnis.',
  'Wichtige Yaku', 'Lichter: Fünf 10, Vier 8, Vier mit Regen 7, Drei 5. Andere Yaku werden zusammengezählt.',
  'Wann Punkte doppelt zählen', 'Ab <b>7 Punkten</b> doppelt. Ein Yaku nach dem <b>Koi-koi</b> des Gegners verdoppelt nochmals. Koi-koi, wenn der Gegner nah an einem Yaku ist, ist riskant.',
  'Der Coach', 'Zeigt den Yaku-Fortschritt beider, gefährliche Karten und einen Zugvorschlag. Schalter oben rechts.',
  'Regeln und Lektionen', 'Wiederhole die Regeln mit echten Karten und übe in den Lektionen Karten, Yaku und Koi-koi.',
  'Jetzt kannst du spielen!', 'Probiere zuerst eine leichte KI.', 'Neu bei Koi-Koi?', 'Ein Tutorial lässt dich einen Monat am echten Tisch spielen.', 'Tutorial', 'Später'],
ru: ['Карты', 'Сыграть месяц', 'Яку и очки', '{n} / {m}', 'Далее', 'Назад', 'Выйти', 'Начать игру', 'Ваш ход',
  'Что такое кои-кои?', 'Собирайте карты поля <b>того же месяца</b> и составляйте из взятых карт <b>яку</b>. Кто первым соберёт яку, получает очки месяца.',
  '12 месяцев × 4 карты', '48 карт делятся на 12 месяцев; <b>одно растение — один месяц</b>. Вверху сосна (январь), внизу сакура (март).',
  'Виды карт', '<b>Светила</b>, <b>Животные</b>, <b>Ленты</b> и <b>Мусор</b>. Светил всего пять; они дают крупные яку.',
  'Стол', 'Внизу ваша <b>рука</b>, в центре <b>поле</b>, слева <b>колода</b>. Взятые карты лежат под рукой по видам.',
  'Взять картой того же месяца', 'Ваша <b>лента сакуры</b> и <b>занавес сакуры</b> на поле — март. Сыграйте светящуюся карту.',
  'Карта из колоды', 'После хода открывается верхняя карта колоды. Выпала <b>лента глицинии</b> и взяла глицинию с поля.',
  'Ход соперника', 'Соперник сыграл сливу и взял ленту сливы. Открытая им <b>павловния</b> без пары и остаётся на поле.',
  'Идём к яку', 'Сыграйте <b>чашу сакэ</b> и возьмите ленту хризантемы. Вместе с занавесом сакуры…',
  'Яку!', '<b>Любование цветами</b>, 5 очков. «Стоп» завершает месяц с 5. «Кои-кои» — играть дальше ради большего, но если соперник соберёт яку, он получит вдвое. Сейчас нажмите <b>Стоп</b>.',
  'Месяц за вами', 'Вы получили 5. Играют 12 месяцев (или 6, 3) и сравнивают сумму. Нажмите кнопку в окне результата.',
  'Главные яку', 'Светила: пять 10, четыре 8, четыре с дождём 7, три 5. Остальные яку складываются.',
  'Когда очки удваиваются', 'Сумма <b>7 и больше</b> удваивается. Яку после <b>кои-кои</b> соперника удваивает ещё раз. Говорить кои-кои, когда соперник близок к яку, рискованно.',
  'Тренер', 'Показывает прогресс яку обоих, опасные карты и рекомендуемый ход. Переключатель справа вверху.',
  'Правила и уроки', 'Повторите правила с настоящими картами и тренируйтесь в уроках: карты, яку и кои-кои.',
  'Можно играть!', 'Сначала сыграйте с лёгким ИИ.', 'Впервые в кои-кои?', 'Обучение: сыграйте месяц за настоящим столом.', 'Обучение', 'Позже'],
tr: ['Kartlar', 'Bir ay oyna', 'Yaku ve puan', '{n} / {m}', 'İleri', 'Geri', 'Çık', 'Oynamaya başla', 'Sıra sende',
  'Koi-Koi nedir?', 'Alandaki <b>aynı ay</b> kartlarını eşleyip al, aldıklarınla <b>yaku</b> yap. İlk yakuyu yapan ayın puanını alır.',
  '12 ay × 4 kart', '48 kart 12 aya ayrılır; <b>aynı bitki aynı ay</b>. Üstte çam (ocak), altta kiraz (mart).',
  'Kart türleri', '<b>Işık</b>, <b>Hayvan</b>, <b>Şerit</b> ve <b>Saman</b>. Sadece beş kart Işık; büyük yakuları yaparlar.',
  'Masa', 'Altta <b>elin</b>, ortada <b>alan</b>, solda <b>deste</b>. Aldıkların elinin altında türlerine göre dizilir.',
  'Aynı ayla al', 'Elindeki <b>kiraz şeridi</b> ve alandaki <b>kiraz perdesi</b> mart ayı. Parlayan kartı oyna.',
  'Desteden açma', 'Oynadıktan sonra destenin üst kartı açılır. <b>Mor salkım şeridi</b> çıktı ve alandaki mor salkımı aldı.',
  'Rakibin sırası', 'Rakip erik oynayıp erik şeridini aldı. Açtığı <b>pavlonya</b>nın eşi yok, alanda kalıyor.',
  'Yakuya git', 'Elindeki <b>sake kâsesi</b> ile krizantem şeridini al. Kiraz perdesiyle birlikte…',
  'Yaku!', '<b>Çiçek seyri</b>, 5 puan. “Dur” ayı 5 ile bitirir. “Koi-koi” daha fazlası için devam eder ama rakip yaku yaparsa iki kat alır. Bu sefer <b>Dur</b>’a bas.',
  'Ayı kazandın', '5 puan aldın. 12 ay (ya da 6, 3) oynanır, toplamlar karşılaştırılır. Devam için sonuç kutusundaki düğmeye bas.',
  'Başlıca yakular', 'Işıklar: Beş 10, Dört 8, Yağmurlu Dört 7, Üç 5. Diğer yakular toplanır.',
  'Puan ne zaman ikiye katlanır', 'Toplam <b>7 ve üzeri</b> ikiye katlanır. Rakibin <b>koi-koi</b>’sinden sonra yaku yaparsan bir kez daha. Rakip yakuya yakınken koi-koi riskli.',
  'Koç', 'İki tarafın yaku ilerlemesini, tehlikeli kartları ve önerilen hamleyi gösterir. Sağ üstteki düğmeyle aç/kapat.',
  'Kurallar ve dersler', 'Kuralları kart oynatarak tekrarla; derslerde kartları, yakuları ve koi-koi kararını çalış.',
  'Oynamaya hazırsın!', 'Önce kolay bir YZ ile dene.', 'Koi-Koi’de yeni misin?', 'Gerçek masada bir ay oynayarak öğreten bir rehber var.', 'Rehber', 'Sonra'],
id: ['Kartu', 'Main satu bulan', 'Yaku & poin', '{n} / {m}', 'Lanjut', 'Kembali', 'Keluar', 'Mulai bermain', 'Giliranmu',
  'Apa itu Koi-Koi?', 'Pasangkan kartu meja dari <b>bulan yang sama</b> untuk mengambilnya, lalu susun <b>yaku</b> dari ambilanmu. Yang pertama membuat yaku mendapat poin bulan itu.',
  '12 bulan × 4 kartu', '48 kartu terbagi 12 bulan; <b>tanaman sama berarti bulan sama</b>. Atas: pinus (Januari). Bawah: sakura (Maret).',
  'Jenis kartu', 'Ada <b>Cahaya</b>, <b>Hewan</b>, <b>Pita</b>, dan <b>Ampas</b>. Hanya lima kartu Cahaya; mereka membentuk yaku besar.',
  'Meja', 'Bawah: <b>tangan</b>mu. Tengah: <b>meja</b>. Kiri: <b>tumpukan</b>. Ambilanmu berbaris di bawah tangan, per jenis.',
  'Ambil dengan bulan sama', '<b>Pita sakura</b> di tanganmu dan <b>tirai sakura</b> di meja sama-sama Maret. Mainkan kartu yang menyala.',
  'Membuka tumpukan', 'Setelah bermain, kartu teratas tumpukan dibuka. Keluar <b>pita wisteria</b> dan mengambil wisteria di meja.',
  'Giliran lawan', 'Lawan memainkan plum dan mengambil pita plum. Kartu bukaannya, <b>paulownia</b>, tak ada pasangan dan tetap di meja.',
  'Incar yaku', 'Mainkan <b>cawan sake</b>mu untuk mengambil pita krisan. Bersama tirai sakura…',
  'Yaku!', '<b>Melihat bunga</b>, 5 poin. “Berhenti” menutup bulan dengan 5. “Koi-koi” lanjut untuk lebih, tapi jika lawan membuat yaku, poinnya dua kali lipat. Kali ini tekan <b>Berhenti</b>.',
  'Kamu menang bulan ini', 'Kamu dapat 5 poin. Main 12 bulan (atau 6, 3) lalu bandingkan total. Tekan tombol di kotak hasil untuk lanjut.',
  'Yaku utama', 'Cahaya: Lima 10, Empat 8, Empat Hujan 7, Tiga 5. Yaku lain dijumlahkan.',
  'Saat poin berlipat', 'Total <b>7 atau lebih</b> berlipat dua. Membuat yaku setelah <b>koi-koi</b> lawan berlipat lagi. Koi-koi saat lawan dekat yaku itu berisiko.',
  'Pelatih', 'Menampilkan kemajuan yaku kedua pihak, kartu berbahaya, dan langkah saran. Sakelar di kanan atas.',
  'Aturan dan pelajaran', 'Ulangi aturan dengan menggerakkan kartu, dan latih mengenali kartu, yaku, dan koi-koi di pelajaran.',
  'Kamu siap bermain!', 'Coba dulu melawan AI yang mudah.', 'Baru main Koi-Koi?', 'Tutorial mengajarimu sambil memainkan satu bulan di meja sungguhan.', 'Tutorial', 'Nanti'],
hi: ['पत्ते', 'एक महीना खेलें', 'याकु और अंक', '{n} / {m}', 'आगे', 'पीछे', 'छोड़ें', 'खेल शुरू करें', 'आपकी चाल',
  'कोई-कोई क्या है?', 'मेज़ के <b>उसी महीने</b> के पत्ते मिलाकर उठाइए और उनसे <b>याकु</b> बनाइए। जो पहले याकु बनाए, उस महीने के अंक उसके।',
  '12 महीने × 4 पत्ते', '48 पत्ते 12 महीनों में बँटे हैं; <b>एक जैसा पौधा यानी एक ही महीना</b>। ऊपर चीड़ (जनवरी), नीचे चेरी (मार्च)।',
  'पत्तों के प्रकार', '<b>प्रकाश</b>, <b>पशु</b>, <b>पट्टी</b> और <b>भूसा</b>। प्रकाश केवल पाँच हैं; वे बड़े याकु बनाते हैं।',
  'मेज़', 'नीचे आपका <b>हाथ</b>, बीच में <b>मेज़</b>, बाईं ओर <b>गड्डी</b>। उठाए पत्ते हाथ के नीचे प्रकार के अनुसार लगते हैं।',
  'उसी महीने से उठाएँ', 'आपकी <b>चेरी पट्टी</b> और मेज़ का <b>चेरी परदा</b> दोनों मार्च के हैं। चमकता पत्ता खेलिए।',
  'गड्डी पलटना', 'खेलने के बाद गड्डी का ऊपरी पत्ता पलटता है। <b>विस्टेरिया पट्टी</b> निकली और मेज़ की विस्टेरिया उठा ली।',
  'विरोधी की बारी', 'विरोधी ने आलूबुखारा खेलकर उसकी पट्टी उठाई। पलटा <b>पाउलोनिया</b> बेजोड़ था, मेज़ पर रहा।',
  'याकु की ओर', 'अपना <b>साके प्याला</b> खेलकर गुलदाउदी की पट्टी उठाइए। चेरी परदे के साथ…',
  'याकु बना!', '<b>फूल-दर्शन</b>, 5 अंक। “रुकें” से महीना 5 पर खत्म। “कोई-कोई” से और अंक के लिए आगे खेलते हैं, पर विरोधी याकु बना ले तो उसके अंक दोगुने। इस बार <b>रुकें</b> दबाइए।',
  'यह महीना आपका', 'आपको 5 अंक मिले। 12 महीने (या 6, 3) खेलकर कुल अंक मिलाए जाते हैं। आगे के लिए परिणाम का बटन दबाइए।',
  'मुख्य याकु', 'प्रकाश: पाँच 10, चार 8, बरसाती चार 7, तीन 5। बाकी याकु जुड़ते हैं।',
  'अंक कब दोगुने', 'कुल <b>7 या ज़्यादा</b> दोगुना। विरोधी के <b>कोई-कोई</b> के बाद याकु बनाने पर फिर दोगुना। विरोधी याकु के पास हो तो कोई-कोई जोखिम भरा है।',
  'कोच', 'दोनों की याकु प्रगति, खतरनाक पत्ते और सुझाई चाल दिखाता है। ऊपर दाईं ओर के स्विच से चालू/बंद।',
  'नियम और पाठ', 'पत्ते चलाकर नियम दोहराइए, और पाठों में पत्ते पहचानना, याकु और कोई-कोई का फ़ैसला अभ्यास कीजिए।',
  'अब आप खेल सकते हैं!', 'पहले आसान AI से खेलकर देखिए।', 'कोई-कोई में नए हैं?', 'असली मेज़ पर एक महीना खेलते हुए सीखने वाला ट्यूटोरियल।', 'ट्यूटोरियल', 'बाद में'],
ar: ['الأوراق', 'العب شهرًا', 'الياكو والنقاط', '{n} / {m}', 'التالي', 'السابق', 'إنهاء', 'ابدأ اللعب', 'دورك',
  'ما كوي-كوي؟', 'طابِق أوراق الطاولة من <b>الشهر نفسه</b> لتأخذها، وكوّن من مأخوذاتك <b>ياكو</b>. من يكوّن ياكو أولًا يأخذ نقاط الشهر.',
  '12 شهرًا × 4 أوراق', 'تنقسم الأوراق الـ48 إلى 12 شهرًا؛ <b>النبتة نفسها تعني الشهر نفسه</b>. في الأعلى الصنوبر (يناير)، وفي الأسفل الكرز (مارس).',
  'أنواع الأوراق', '<b>أنوار</b> و<b>حيوانات</b> و<b>أشرطة</b> و<b>قش</b>. خمس أوراق فقط أنوار، وتصنع الياكو الكبيرة.',
  'الطاولة', 'في الأسفل <b>يدك</b>، وفي الوسط <b>الطاولة</b>، وإلى اليسار <b>الكومة</b>. تُصفّ مأخوذاتك تحت يدك حسب النوع.',
  'خذ بالشهر نفسه', '<b>شريط الكرز</b> في يدك و<b>ستارة الكرز</b> على الطاولة كلاهما من مارس. العب الورقة المضيئة.',
  'قلب الكومة', 'بعد اللعب تُقلب الورقة العليا من الكومة. خرج <b>شريط الوستارية</b> وأخذ الوستارية من الطاولة.',
  'دور الخصم', 'لعب الخصم البرقوق وأخذ شريطه. ورقته المقلوبة <b>البولونيا</b> بلا نظير فبقيت على الطاولة.',
  'نحو ياكو', 'العب <b>كأس الساكي</b> لتأخذ شريط الأقحوان. مع ستارة الكرز…',
  'ياكو!', '<b>مشاهدة الأزهار</b>، 5 نقاط. «توقّف» ينهي الشهر بـ5. «كوي-كوي» يواصل لمزيد، لكن إن كوّن الخصم ياكو تتضاعف نقاطه. اضغط <b>توقّف</b> هذه المرة.',
  'فزت بالشهر', 'حصلت على 5. تُلعب 12 شهرًا (أو 6 أو 3) وتُقارن المجاميع. اضغط زر النتيجة للمتابعة.',
  'أهم الياكو', 'الأنوار: خمسة 10، أربعة 8، أربعة ممطرة 7، ثلاثة 5. وتُجمع بقية الياكو معًا.',
  'متى تتضاعف النقاط', 'مجموع <b>7 فأكثر</b> يتضاعف. تكوين ياكو بعد <b>كوي-كوي</b> الخصم يضاعف مرة أخرى. قول كوي-كوي والخصم قريب من ياكو مخاطرة.',
  'المدرّب', 'يعرض تقدم الياكو للطرفين والأوراق الخطرة وحركة مقترحة. المفتاح أعلى اليمين.',
  'القواعد والدروس', 'راجع القواعد بتحريك الأوراق، وتدرّب في الدروس على تمييز الأوراق والياكو وقرار كوي-كوي.',
  'أنت جاهز!', 'جرّب أولًا ضد ذكاء اصطناعي سهل.', 'جديد على كوي-كوي؟', 'شرح يعلّمك وأنت تلعب شهرًا على الطاولة الحقيقية.', 'الشرح', 'لاحقًا'],
};
for (const L in MORE) { if (MORE[L].length !== KEYS.length) console.warn('tut', L, MORE[L].length, KEYS.length); T[L] = {}; KEYS.forEach((k, i) => { T[L][k] = MORE[L][i]; }); }
const t = (k, v) => { const L = A.LANG(); let x = (T[L] && T[L][k]) || T.en[k] || k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y]); return x; };

let idx = -1, layer = null, box = null, rings = null, autoT = 0, running = false;
const cur = () => STEPS[idx];
function el(s) { return document.querySelector(s); }
function pics(st) {
  if (!st.pics && !st.table) return '';
  if (st.table) {
    const rows = [['goko', '10'], ['shiko', '8'], ['ameshiko', '7'], ['sanko', '5'], ['inoshikacho', '5'], ['akatan', '5'], ['aotan', '5'], ['hanami', '5'], ['tsukimi', '5'], ['tane', '1+'], ['tan', '1+'], ['kasu', '1+']];
    return `<div class="tu-yaku">${rows.map(([k, p]) => `<span>${A.esc(A.t('y.' + k))}</span><b>${p}</b>`).join('')}</div>`;
  }
  return st.pics.map(row => `<div class="tu-pics">${row.map(id => `<figure>${C.face(id)}${st.labels ? `<figcaption>${A.esc(A.t('k.' + HF.CARDS[id].type))}</figcaption>` : ''}</figure>`).join('')}</div>`).join('');
}
function draw() {
  const st = cur(); if (!st || !box) return;
  const tot = STEPS.length, s = A.state() && A.state().s;
  const waiting = st.act != null || st.wait;
  const btns = st.last ? `<button type="button" class="mbtn go" id="tuEnd">${A.esc(t('finish'))}</button>`
    : waiting ? `<span class="tu-do">👉 ${A.esc(t('doIt'))}</span>` : `<button type="button" class="mbtn go" id="tuNext">${A.esc(t('next'))}</button>`;
  box.innerHTML = `<div class="tu-top"><em>${A.esc(t('chap' + st.ch))} · ${A.esc(t('step', { n: idx + 1, m: tot }))}</em><button type="button" class="tu-x" id="tuQuit">${A.esc(t('quit'))}</button></div>
    <b class="tu-h">${A.esc(t(st.id + '.t'))}</b><p>${t(st.id + '.b')}</p>${pics(st)}<div class="tu-meter"><i></i></div><div class="tu-btns">${idx > 0 && st.ch !== 2 ? `<button type="button" class="mbtn" id="tuBack">${A.esc(t('back'))}</button>` : ''}${btns}</div>`;
  place();
}
function place() {
  const st = cur(); if (!st || !layer) return;
  const targets = (st.at || []).map(el).filter(Boolean);
  // glow on the cards asked for
  document.querySelectorAll('.hf.tu-want').forEach(e => e.classList.remove('tu-want'));
  if (st.act != null) (st.at || []).forEach(sel => { const e = el(sel); if (e && e.classList.contains('hf')) e.classList.add('tu-want'); });
  rings.innerHTML = targets.map(e => { const r = e.getBoundingClientRect(); return `<div class="tu-ring" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>`; }).join('');
  const mask = layer.querySelector('.tu-mask path'), W = innerWidth, H = innerHeight;
  let d = `M0 0H${W}V${H}H0Z`;
  targets.forEach(e => { const r = e.getBoundingClientRect(); d += `M${r.left - 6} ${r.top - 6}h${r.width + 12}v${r.height + 12}h${-r.width - 12}Z`; });
  mask.setAttribute('d', st.center || st.top ? `M0 0H${W}V${H}H0Z` : d);
  layer.classList.toggle('pass', st.act != null || !!st.wait);     // the table can be touched on action steps
  layer.classList.toggle('dim0', !!st.wait);                         // dialogs on top: no dark mask
  box.className = 'tu-box modal' + (st.center ? ' center' : '');
  const bw = box.offsetWidth, bh = box.offsetHeight;
  let x = (W - bw) / 2, y = (H - bh) / 2;
  if (st.top) y = 12;
  else if (!st.center && targets.length) {
    const rs = targets.map(e => e.getBoundingClientRect());
    const top = Math.min(...rs.map(r => r.top)), bot = Math.max(...rs.map(r => r.bottom));
    const left = Math.min(...rs.map(r => r.left)), right = Math.max(...rs.map(r => r.right));
    x = Math.min(Math.max(12, (left + right) / 2 - bw / 2), W - bw - 12);
    y = bot + 16 + bh < H - 8 ? bot + 16 : top - bh - 16 > 8 ? top - bh - 16 : 12;
    if (y === 12 && right + bw + 24 < W) { x = right + 18; y = Math.max(12, Math.min(H - bh - 12, top)); }
  }
  y = Math.max(8, Math.min(y, H - bh - 8)); x = Math.max(8, Math.min(x, W - bw - 8));
  box.style.left = x + 'px'; box.style.top = y + 'px';
}
function go(i) {
  clearTimeout(autoT);
  idx = i; const st = cur();
  if (!st) return stop(true);
  // the table moves on by itself between action steps; wait until this step's moment has come
  if (st.when && !st.when(A.state().s)) { box.innerHTML = ''; layer.classList.add('pass', 'dim0'); rings.innerHTML = ''; layer.querySelector('.tu-mask path').setAttribute('d', ''); return; }
  layer.classList.remove('dim0');
  draw();
}
function ok() {
  A.sfx('ok');
  const m = box && box.querySelector('.tu-meter'); if (m) m.classList.add('run');
  const b = box && box.querySelector('.tu-do'); if (b) b.textContent = '✓';
  autoT = setTimeout(() => go(idx + 1), 1600);
}
function onRender() {
  if (!running) return;
  const st = cur(); if (!st) return;
  const s = A.state() && A.state().s; if (!s) return;
  if (!box.innerHTML && st.when && st.when(s)) { draw(); return; }
  if (st.done && st.done(s) && !st._ok) { st._ok = true; ok(); return; }
  requestAnimationFrame(place);
}
function start() {
  if (!layer) {
    layer = document.createElement('div'); layer.className = 'tu-layer';
    layer.innerHTML = '<svg class="tu-mask"><path fill-rule="evenodd"/></svg><div class="tu-rings"></div><div class="tu-box modal"></div>';
    document.body.appendChild(layer);
    box = layer.querySelector('.tu-box'); rings = layer.querySelector('.tu-rings');
    layer.addEventListener('click', e => {
      if (e.target.closest('#tuNext')) go(idx + 1);
      else if (e.target.closest('#tuBack')) { let j = idx - 1; while (j > 0 && STEPS[j].ch === 2) j--; go(j); }
      else if (e.target.closest('#tuQuit')) stop(false);
      else if (e.target.closest('#tuEnd')) stop(true);
    });
    addEventListener('resize', () => running && place());
    addEventListener('keydown', e => { if (!running) return; const st = cur(); if (e.key === 'ArrowRight' && st && st.act == null && !st.wait && !st.last) go(idx + 1); });
  }
  STEPS.forEach(s => { delete s._ok; });
  running = true; layer.classList.add('show');
  A.closeOv('#rulesOverlay'); A.closeOv('#newOverlay'); A.closeOv('#lessonOverlay');
  A.tutStart(LAYOUT, SCRIPT);
  go(0);
}
function stop(done) {
  running = false; clearTimeout(autoT);
  if (layer) { layer.classList.remove('show'); box.innerHTML = ''; rings.innerHTML = ''; }
  document.querySelectorAll('.hf.tu-want').forEach(e => e.classList.remove('tu-want'));
  try { localStorage.setItem('aicoding-hanafuda-tut', done ? 'done' : 'seen'); if (done) localStorage.setItem('aicoding-hanafuda-rules-seen', '1'); } catch (e) {}
  A.tutEnd();
}
window.HFTut = {
  start, onRender,
  hold() { if (!running) return false; const st = cur(); const s = A.state() && A.state().s; return !(st && st.when && s && !st.when(s)); },
  allow(id) { const st = cur(); return running && st && st.act === id; },
  next() { const st = cur(); if (st && st.wait === 'res') go(idx + 1); },
  running: () => running,
  offer() {
    let seen = null; try { seen = localStorage.getItem('aicoding-hanafuda-tut'); } catch (e) {}
    if (seen) return;
    const ov = document.createElement('div'); ov.className = 'overlay on'; ov.id = 'tuOffer';
    ov.innerHTML = `<div class="modal small tu-offer"><div class="to-art">${C.face(8)}${C.face(32)}</div><h2>${A.esc(t('offer.h'))}</h2><p>${A.esc(t('offer.p'))}</p><div class="modal-actions half"><button type="button" class="mbtn" data-a="no">${A.esc(t('offer.no'))}</button><button type="button" class="mbtn go" data-a="go">${A.esc(t('offer.go'))}</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; ov.remove(); try { localStorage.setItem('aicoding-hanafuda-tut', 'seen'); } catch (er) {} if (b.dataset.a === 'go') start(); });
  },
};
})();
