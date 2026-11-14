// Warm-up pages ("準備 i/n", addendum「レッスンの段階化」) before three lesson steps of nine men's morris (lessons.json): the same
// form as Alquerque / Fanorona (alquerque/tools/lesson_ramps.js). Positions in the placing phase; moves by their page names
// (index.html mvName: "f2", "d1-d2", "g4×a7"). tools/gen_ramps.js works out the right answers with the rules (block = the
// opponent has no "one more for a mill" point after it, fork = two of your own such points, remove = a mill whose removal leaves
// the opponent no such point) and checks every move named in the texts. Texts in the 14 page languages.
'use strict';
const { UI, L14 } = require('../../alquerque/tools/lesson_ramps.js');
const P = o => Object.fromEntries(Object.entries(o).map(([l, v]) => [l, '<p>' + v.split('\n').join('</p><p>') + '</p>']));
const ex = (b, h, seq, marks, t, body) => ({ k: 'explain', s: { b, h, side: 1, quiet: 0 }, seq, marks, t, body: P(body) });
const tr = (b, h, rule, look, g, h2, y) => ({ k: 'try', s: { b, h, side: 1, quiet: 0 }, rule, look, g, h: h2, y });
const RAMPS = {
  block: [
    ex('100012000000001000220000', [6, 6], [['f2', 'ok']], [['b2', 'ng'], ['d2', 'ng']],
      L14('あと1つの点をふさぐ', 'Block the last point', '堵住最后一个点', '堵住最後一個點', '마지막 한 점을 막기', 'Tapa el último punto', 'Bouchez le dernier point', 'Feche o último ponto', 'Den letzten Punkt besetzen', 'Закройте последнюю точку', 'Son noktayı kapat', 'Tutup titik terakhir', 'आख़िरी बिंदु रोकें', 'اسدّ النقطة الأخيرة'),
      L14('相手の駒が b2 と d2 に並び、f2 が空いています。次に f2 に置かれると<b>ミル</b>になり、駒を1つ取られます。\n自分にミルがないときは、まず<b>その点（f2）に置いてふさぐ</b>のが基本です。',
        'The opponent has b2 and d2 in a row with f2 empty. A piece on f2 next turn makes a <b>mill</b> and takes one of yours.\nWhen you have no mill of your own, first <b>block that point (f2)</b>.',
        '对方在 b2 和 d2 连成一排，f2 空着。下一手放到 f2 就成<b>三连</b>，会吃掉你一个子。\n自己没有三连可成时，先<b>放在那个点（f2）堵住</b>。',
        '對方在 b2 和 d2 連成一排，f2 空著。下一手放到 f2 就成<b>三連</b>，會吃掉你一個子。\n自己沒有三連可成時，先<b>放在那個點（f2）堵住</b>。',
        '상대 말이 b2와 d2에 나란히 있고 f2가 비어 있습니다. 다음에 f2에 놓이면 <b>밀</b>이 되어 내 말 하나를 잃습니다.\n내가 밀을 만들 수 없을 때는 먼저 <b>그 점(f2)에 놓아 막는</b> 것이 기본입니다.',
        'El rival tiene b2 y d2 en línea con f2 vacío. Una pieza en f2 hace <b>molino</b> y te quita una.\nSi no tienes molino propio, primero <b>tapa ese punto (f2)</b>.',
        'L’adversaire a b2 et d2 alignés, f2 est vide. Un pion en f2 au prochain coup forme un <b>moulin</b> et vous prend un pion.\nSi vous n’avez pas de moulin à faire, <b>bouchez d’abord ce point (f2)</b>.',
        'O rival tem b2 e d2 em linha com f2 vazio. Uma peça em f2 forma <b>moinho</b> e tira uma das suas.\nSem moinho próprio, primeiro <b>feche esse ponto (f2)</b>.',
        'Der Gegner hat b2 und d2 in einer Reihe, f2 ist frei. Ein Stein auf f2 bildet eine <b>Mühle</b> und nimmt dir einen Stein.\nHast du selbst keine Mühle, <b>besetze zuerst diesen Punkt (f2)</b>.',
        'У соперника b2 и d2 в ряд, f2 свободна. Фишка на f2 следующим ходом даст <b>мельницу</b> и заберёт вашу фишку.\nЕсли своей мельницы нет, сначала <b>закройте эту точку (f2)</b>.',
        'Rakibin b2 ve d2 taşları yan yana, f2 boş. Sıradaki hamlede f2’ye taş gelirse <b>değirmen</b> olur ve bir taşını alır.\nKendi değirmenin yoksa önce <b>o noktayı (f2) kapat</b>.',
        'Lawan punya b2 dan d2 sebaris dengan f2 kosong. Bidak di f2 langkah berikutnya membentuk <b>kincir</b> dan mengambil satu bidakmu.\nJika kamu tak bisa membuat kincir, <b>tutup dulu titik itu (f2)</b>.',
        'विरोधी के b2 और d2 एक पंक्ति में हैं और f2 खाली है। अगली चाल में f2 पर मोहरा आया तो <b>मिल</b> बनेगी और आपका एक मोहरा जाएगा।\nजब आपकी अपनी मिल न बने, तो पहले <b>उस बिंदु (f2) को रोकें</b>।',
        'لدى الخصم b2 وd2 في صف واحد وf2 فارغة. قطعة في f2 في النقلة التالية تصنع <b>طاحونة</b> وتأخذ إحدى قطعك.\nإن لم تكن لديك طاحونة، <b>اسدّ تلك النقطة (f2) أولًا</b>.')),
    tr('000010022201100010002000', [5, 5], 'block', ['d5', 'e5'],
      L14('相手のミルを止めよう。', 'Stop the opponent’s mill.', '阻止对方成三连。', '阻止對方成三連。', '상대의 밀을 막자.', 'Detén el molino del rival.', 'Empêchez le moulin adverse.', 'Impeça o moinho do rival.', 'Verhindere die Mühle des Gegners.', 'Помешайте мельнице соперника.', 'Rakibin değirmenini engelle.', 'Hentikan kincir lawan.', 'विरोधी की मिल रोकें।', 'أوقف طاحونة الخصم.'),
      L14('相手の駒が2つ並んでいて、3つ目の点が空いている所はどこ？', 'Where do two enemy pieces stand in a row with the third point empty?', '哪里有对方两个子连成一排、第三个点空着？', '哪裡有對方兩個子連成一排、第三個點空著？', '상대 말 두 개가 나란히 있고 세 번째 점이 빈 곳은 어디?', '¿Dónde hay dos piezas rivales en línea con el tercer punto vacío?', 'Où deux pions adverses sont-ils alignés avec le troisième point vide ?', 'Onde há duas peças rivais em linha com o terceiro ponto vazio?', 'Wo stehen zwei gegnerische Steine in einer Reihe, und der dritte Punkt ist frei?', 'Где две фишки соперника стоят в ряд, а третья точка свободна?', 'İki rakip taşın yan yana olup üçüncü noktanın boş olduğu yer neresi?', 'Di mana dua bidak lawan sebaris dan titik ketiganya kosong?', 'कहाँ विरोधी के दो मोहरे एक पंक्ति में हैं और तीसरा बिंदु खाली है?', 'أين توجد قطعتان للخصم في صف والنقطة الثالثة فارغة؟'),
      L14('正解！ これで相手はミルを作れません。', 'Right! The opponent cannot make that mill now.', '正确！对方成不了三连了。', '正確！對方成不了三連了。', '정답! 이제 상대는 밀을 만들 수 없습니다.', '¡Correcto! El rival ya no puede hacer ese molino.', 'Exact ! L’adversaire ne peut plus faire ce moulin.', 'Certo! O rival não pode mais fazer esse moinho.', 'Richtig! Diese Mühle kann der Gegner nicht mehr schließen.', 'Верно! Теперь соперник не построит эту мельницу.', 'Doğru! Rakip artık o değirmeni kuramaz.', 'Benar! Lawan tak bisa membuat kincir itu lagi.', 'सही! अब विरोधी वह मिल नहीं बना सकता।', 'صحيح! لا يستطيع الخصم الآن صنع تلك الطاحونة.')),
  ],
  fork: [
    ex('100012200000010000200000', [6, 6], [['d7', 'ok']], [['g7', 'ok'], ['d5', 'ok']],
      L14('脅威を2つ同時に', 'Two threats at once', '同时制造两个威胁', '同時製造兩個威脅', '위협 두 개를 동시에', 'Dos amenazas a la vez', 'Deux menaces à la fois', 'Duas ameaças de uma vez', 'Zwei Drohungen auf einmal', 'Две угрозы сразу', 'Aynı anda iki tehdit', 'Dua ancaman sekaligus', 'एक साथ दो ख़तरे', 'تهديدان معًا'),
      L14('d7 に置くと、a7-d7 で g7 が、d7-d6 で d5 が「<b>あと1つでミル</b>」の点になります。\n相手がふさげるのは一度に1つだけ。次の手で、残ったほうに置いてミルが作れます。',
        'A piece on d7 makes two "<b>one more for a mill</b>" points: g7 (with a7-d7) and d5 (with d7-d6).\nThe opponent can block only one at a time, so next turn you close the other.',
        '放在 d7 后，a7-d7 让 g7、d7-d6 让 d5 都成了“<b>再一个就成三连</b>”的点。\n对方一次只能堵一个，下一手你就能在另一个点成三连。',
        '放在 d7 後，a7-d7 讓 g7、d7-d6 讓 d5 都成了「<b>再一個就成三連</b>」的點。\n對方一次只能堵一個，下一手你就能在另一個點成三連。',
        'd7에 놓으면 a7-d7로 g7이, d7-d6으로 d5가 "<b>하나만 더 놓으면 밀</b>"인 점이 됩니다.\n상대는 한 번에 하나만 막을 수 있으니, 다음 수에 남은 쪽에 놓아 밀을 만듭니다.',
        'Una pieza en d7 crea dos puntos de "<b>falta una para molino</b>": g7 (con a7-d7) y d5 (con d7-d6).\nEl rival solo puede tapar uno, y en tu turno cierras el otro.',
        'Un pion en d7 crée deux points « <b>il en manque un pour un moulin</b> » : g7 (avec a7-d7) et d5 (avec d7-d6).\nL’adversaire n’en bouche qu’un ; au coup suivant, vous fermez l’autre.',
        'Uma peça em d7 cria dois pontos de "<b>falta uma para moinho</b>": g7 (com a7-d7) e d5 (com d7-d6).\nO rival só fecha um por vez; no lance seguinte você fecha o outro.',
        'Ein Stein auf d7 schafft zwei Punkte, an denen „<b>noch einer zur Mühle</b>“ fehlt: g7 (mit a7-d7) und d5 (mit d7-d6).\nDer Gegner kann nur einen besetzen – im nächsten Zug schließt du den anderen.',
        'Фишка на d7 создаёт две точки «<b>ещё одна — и мельница</b>»: g7 (с a7-d7) и d5 (с d7-d6).\nСоперник закроет лишь одну, а следующим ходом вы замкнёте другую.',
        'd7’ye konan taş iki tane “<b>bir taş kala değirmen</b>” noktası yaratır: g7 (a7-d7 ile) ve d5 (d7-d6 ile).\nRakip bir seferde yalnızca birini kapatabilir; sonraki hamlede diğerini tamamlarsın.',
        'Bidak di d7 menciptakan dua titik "<b>kurang satu lagi jadi kincir</b>": g7 (dengan a7-d7) dan d5 (dengan d7-d6).\nLawan hanya bisa menutup satu; langkah berikutnya kamu tutup yang lain.',
        'd7 पर मोहरा रखने से दो "<b>बस एक और और मिल</b>" बिंदु बनते हैं: g7 (a7-d7 से) और d5 (d7-d6 से)।\nविरोधी एक बार में एक ही रोक सकता है, अगली चाल में आप दूसरा पूरा करते हैं।',
        'قطعة في d7 تصنع نقطتي "<b>ينقص واحدة للطاحونة</b>": g7 (مع a7-d7) وd5 (مع d7-d6).\nلا يسدّ الخصم إلا واحدة، وفي دورك التالي تُكمل الأخرى.')),
    tr('102000020000210100100020', [5, 5], 'fork', ['b2', 'f4'],
      L14('脅威を2つ同時に作ろう。', 'Make two threats at once.', '同时制造两个威胁。', '同時製造兩個威脅。', '위협 두 개를 동시에 만들자.', 'Crea dos amenazas a la vez.', 'Créez deux menaces à la fois.', 'Crie duas ameaças de uma vez.', 'Schaffe zwei Drohungen auf einmal.', 'Создайте две угрозы сразу.', 'Aynı anda iki tehdit yarat.', 'Buat dua ancaman sekaligus.', 'एक साथ दो ख़तरे बनाएँ।', 'اصنع تهديدين معًا.'),
      L14('光っている2つの駒は、それぞれ別の並びに関わっています。両方の並びに入る点はどこ？', 'The two glowing pieces each belong to a different line. Which point is on both lines?', '两个发光的子各属于不同的一排。哪个点同时在这两排上？', '兩個發光的子各屬於不同的一排。哪個點同時在這兩排上？', '빛나는 두 말은 각각 다른 줄에 있습니다. 두 줄에 모두 들어가는 점은?', 'Las dos piezas que brillan están en líneas distintas. ¿Qué punto está en las dos?', 'Les deux pions qui brillent sont sur deux lignes différentes. Quel point est sur les deux ?', 'As duas peças que brilham estão em linhas diferentes. Que ponto está nas duas?', 'Die beiden leuchtenden Steine stehen auf verschiedenen Linien. Welcher Punkt liegt auf beiden?', 'Две светящиеся фишки стоят на разных линиях. Какая точка лежит на обеих?', 'Parlayan iki taş farklı sıralarda. Her iki sırada da olan nokta hangisi?', 'Dua bidak yang menyala ada di barisan berbeda. Titik mana yang ada di kedua barisan?', 'दोनों चमकते मोहरे अलग-अलग पंक्तियों में हैं। कौन-सा बिंदु दोनों पंक्तियों में है?', 'القطعتان المضيئتان على خطين مختلفين. أي نقطة تقع على الخطين معًا؟'),
      L14('両取り！ 相手はどちらか1つしかふさげません。', 'A double threat! The opponent can block only one.', '双重威胁！对方只能堵住一个。', '雙重威脅！對方只能堵住一個。', '양쪽 위협! 상대는 하나만 막을 수 있습니다.', '¡Doble amenaza! El rival solo puede tapar una.', 'Double menace ! L’adversaire n’en bouche qu’une.', 'Ameaça dupla! O rival só fecha uma.', 'Doppeldrohung! Der Gegner kann nur eine verhindern.', 'Двойная угроза! Соперник закроет только одну.', 'Çifte tehdit! Rakip yalnızca birini kapatabilir.', 'Ancaman ganda! Lawan hanya bisa menutup satu.', 'दोहरा ख़तरा! विरोधी सिर्फ़ एक रोक सकता है।', 'تهديد مزدوج! لا يسدّ الخصم إلا واحدًا.')),
  ],
  remove: [
    ex('201100010200000200020001', [5, 5], [['g4×a4', 'ok']], [['a1', 'ng']],
      L14('脅威の駒を取る', 'Take the threatening piece', '吃掉有威胁的子', '吃掉有威脅的子', '위협하는 말을 잡기', 'Quita la pieza que amenaza', 'Prenez le pion qui menace', 'Tire a peça que ameaça', 'Nimm den drohenden Stein', 'Снимите угрожающую фишку', 'Tehdit eden taşı al', 'Ambil bidak yang mengancam', 'ख़तरे वाला मोहरा हटाएँ', 'خذ القطعة المهدِّدة'),
      L14('g4 に置くと g7-g4-g1 でミル。相手の駒を1つ取れます。\n取るなら、相手が<b>ミルを作りかけている駒</b>（a7 と a4 の並び。次に a1 でミル）がいちばん。a4 を取れば相手の脅威が消えます。',
        'A piece on g4 makes a mill with g7-g4-g1, so you take one enemy piece.\nThe best one is a piece of an <b>almost-made mill</b> — a7 and a4, which would close on a1. Taking a4 removes the threat.',
        '放在 g4，g7-g4-g1 成三连，可以吃对方一个子。\n最好吃对方<b>快要成三连的子</b>——a7 和 a4 那一排（下一手 a1 就成）。吃掉 a4，威胁就消失了。',
        '放在 g4，g7-g4-g1 成三連，可以吃對方一個子。\n最好吃對方<b>快要成三連的子</b>——a7 和 a4 那一排（下一手 a1 就成）。吃掉 a4，威脅就消失了。',
        'g4에 놓으면 g7-g4-g1로 밀이 되어 상대 말 하나를 잡습니다.\n잡는다면 상대가 <b>밀을 만들어 가는 말</b>(a7과 a4. 다음에 a1이면 밀)이 가장 좋습니다. a4를 잡으면 위협이 사라집니다.',
        'Una pieza en g4 hace molino con g7-g4-g1 y quitas una pieza rival.\nLo mejor es quitar una pieza de un <b>molino casi hecho</b>: a7 y a4, que se cerraría en a1. Quitar a4 elimina la amenaza.',
        'Un pion en g4 forme le moulin g7-g4-g1 : vous prenez un pion adverse.\nLe meilleur choix : un pion d’un <b>moulin presque fait</b> — a7 et a4, qui se fermerait en a1. Prendre a4 supprime la menace.',
        'Uma peça em g4 forma moinho com g7-g4-g1 e você tira uma peça rival.\nO melhor é tirar uma peça de um <b>moinho quase pronto</b> — a7 e a4, que fechariam em a1. Tirar a4 acaba com a ameaça.',
        'Ein Stein auf g4 bildet die Mühle g7-g4-g1, du nimmst einen gegnerischen Stein.\nAm besten einen aus einer <b>fast fertigen Mühle</b> – a7 und a4, die sich auf a1 schließen würde. Nimm a4, und die Drohung ist weg.',
        'Фишка на g4 даёт мельницу g7-g4-g1 — вы снимаете фишку соперника.\nЛучше всего снять фишку из <b>почти готовой мельницы</b> — a7 и a4, которая замкнулась бы на a1. Снимите a4, и угрозы нет.',
        'g4’e konan taş g7-g4-g1 değirmenini kurar; rakipten bir taş alırsın.\nEn iyisi <b>neredeyse kurulmuş değirmenin</b> taşını almak: a7 ve a4, a1’de kapanacaktı. a4’ü alırsan tehdit biter.',
        'Bidak di g4 membentuk kincir g7-g4-g1, jadi kamu mengambil satu bidak lawan.\nYang terbaik adalah bidak dari <b>kincir yang hampir jadi</b> — a7 dan a4, yang akan tertutup di a1. Ambil a4, ancamannya hilang.',
        'g4 पर मोहरा रखने से g7-g4-g1 मिल बनती है, आप विरोधी का एक मोहरा हटाते हैं।\nसबसे अच्छा है <b>लगभग बनी मिल</b> का मोहरा — a7 और a4, जो a1 पर पूरी होती। a4 हटाने से ख़तरा मिट जाता है।',
        'قطعة في g4 تصنع الطاحونة g7-g4-g1 فتأخذ قطعة للخصم.\nالأفضل أخذ قطعة من <b>طاحونة شبه مكتملة</b> — a7 وa4 اللتين تكتملان في a1. خذ a4 فيزول التهديد.')),
    tr('110000000000010002122020', [5, 5], 'remove', ['d3'],
      L14('ミルを作って、いちばん良い駒を取ろう。', 'Make a mill and take the best piece.', '成三连，吃掉最该吃的子。', '成三連，吃掉最該吃的子。', '밀을 만들고 가장 좋은 말을 잡자.', 'Haz molino y quita la mejor pieza.', 'Formez un moulin et prenez le meilleur pion.', 'Forme um moinho e tire a melhor peça.', 'Bilde eine Mühle und nimm den besten Stein.', 'Постройте мельницу и снимите лучшую фишку.', 'Değirmen kur ve en iyi taşı al.', 'Buat kincir dan ambil bidak terbaik.', 'मिल बनाएँ और सबसे सही मोहरा हटाएँ।', 'اصنع طاحونة وخذ أفضل قطعة.'),
      L14('光っている点に置かれると相手のミルになります。そこに並んでいる相手の駒はどれ？', 'The opponent makes a mill if a piece lands on the glowing point. Which enemy pieces stand in that line?', '对方在发光的点放子就成三连。那一排上的对方棋子是哪几个？', '對方在發光的點放子就成三連。那一排上的對方棋子是哪幾個？', '빛나는 점에 놓이면 상대의 밀이 됩니다. 그 줄에 있는 상대 말은?', 'El rival hace molino si coloca en el punto que brilla. ¿Qué piezas rivales están en esa línea?', 'L’adversaire fait un moulin si un pion arrive sur le point qui brille. Quels pions adverses sont sur cette ligne ?', 'O rival faz moinho se colocar no ponto que brilha. Que peças rivais estão nessa linha?', 'Der Gegner schließt eine Mühle, wenn ein Stein auf den leuchtenden Punkt kommt. Welche gegnerischen Steine stehen in dieser Linie?', 'Соперник построит мельницу, поставив фишку на светящуюся точку. Какие его фишки стоят на этой линии?', 'Parlayan noktaya taş gelirse rakibin değirmeni olur. O sırada hangi rakip taşlar var?', 'Lawan membuat kincir jika bidak mendarat di titik yang menyala. Bidak lawan mana yang ada di barisan itu?', 'चमकते बिंदु पर मोहरा आया तो विरोधी की मिल बनेगी। उस पंक्ति में विरोधी के कौन-से मोहरे हैं?', 'يصنع الخصم طاحونة إن وضع قطعة في النقطة المضيئة. أي قطع للخصم على ذلك الخط؟'),
      L14('正解！ 相手の脅威が消えました。', 'Right! The opponent’s threat is gone.', '正确！对方的威胁消失了。', '正確！對方的威脅消失了。', '정답! 상대의 위협이 사라졌습니다.', '¡Correcto! La amenaza rival desapareció.', 'Exact ! La menace adverse a disparu.', 'Certo! A ameaça do rival sumiu.', 'Richtig! Die Drohung des Gegners ist weg.', 'Верно! Угроза соперника исчезла.', 'Doğru! Rakibin tehdidi kalktı.', 'Benar! Ancaman lawan hilang.', 'सही! विरोधी का ख़तरा मिट गया।', 'صحيح! زال تهديد الخصم.')),
  ],
};
module.exports = { RAMPS, UI };
