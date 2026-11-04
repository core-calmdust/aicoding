// Warm-up ramps for the Xiangqi lessons: `node tools/ramps.js` writes them into lessons.json (step.ramp + rampUi),
// `node tools/check_lessons.js` verifies them with the engine (WebAssembly search + mate search).
// A ramp runs before a lesson's scored problems and is not scored:
//   {k:'explain', s:fen, seq:['b2e2'], marks:[[sq,cls]], t, body}   read-only; seq = the idea played out (iccs)
//   {k:'try', s:fen, ok:['b2e2'], mate?:n, look:[squares], g, h, y}   any move in ok is right
// mate:n → ok = every move that mates within n (engine mate search); otherwise ok = the engine's best move, ahead of the
// rest by at least 300. Squares are iccs names (a0..i9). Hints go concept (h) → where to look (look) → the answer.
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'lessons.json');
const L = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });

const UI = {
  step: L('準備 {i}/{n}', 'Warm-up {i}/{n}', '热身 {i}/{n}', '준비 {i}/{n}', 'Calentamiento {i}/{n}', 'Échauffement {i}/{n}', 'Aquecimento {i}/{n}', 'Aufwärmen {i}/{n}', 'तैयारी {i}/{n}', 'تمهيد {i}/{n}'),
  next: L('次へ', 'Next', '下一步', '다음', 'Siguiente', 'Suivant', 'Próximo', 'Weiter', 'आगे', 'التالي'),
  main: L('本番の問題へ', 'To the problems', '进入正式题目', '본 문제로', 'A los problemas', 'Aux problèmes', 'Aos problemas', 'Zu den Aufgaben', 'असली सवालों पर', 'إلى المسائل'),
  skip: L('準備をとばす', 'Skip warm-up', '跳过热身', '준비 건너뛰기', 'Saltar calentamiento', 'Passer l’échauffement', 'Pular aquecimento', 'Aufwärmen überspringen', 'तैयारी छोड़ें', 'تخطَّ التمهيد'),
  note: L('準備は点数に入りません。まちがえても何度でもやり直せます。', 'Warm-ups are not scored. Try as often as you like.', '热身不计分，错了可以反复尝试。', '준비 단계는 점수에 들어가지 않습니다. 몇 번이든 다시 할 수 있어요.', 'El calentamiento no puntúa. Inténtalo cuantas veces quieras.', 'L’échauffement n’est pas noté. Réessayez autant que vous voulez.', 'O aquecimento não vale pontos. Tente quantas vezes quiser.', 'Das Aufwärmen zählt nicht. Probiere so oft du willst.', 'तैयारी के अंक नहीं गिने जाते। जितनी बार चाहें कोशिश करें।', 'التمهيد لا يُحتسب. حاول كما تشاء.'),
  ng: L('おしい！もう一度考えてみよう。困ったら「ヒント」を押してね。', 'Not quite! Think again — press Hint if you are stuck.', '差一点！再想想，卡住了就按“提示”。', '아깝다! 다시 생각해 보세요. 막히면 「힌트」를 누르세요.', '¡Casi! Piénsalo otra vez; pulsa Pista si te atascas.', 'Presque ! Réfléchissez encore — touchez Indice si besoin.', 'Quase! Pense de novo — toque em Dica se travar.', 'Fast! Denk noch einmal nach – tippe auf Tipp, wenn du feststeckst.', 'लगभग! फिर सोचिए — अटकें तो संकेत दबाएँ।', 'قريب! فكّر مرة أخرى، واضغط تلميح إن احتجت.'),
  look: L('光っている駒・マスに注目しよう。', 'Look at the highlighted pieces and points.', '注意发光的棋子和位置。', '빛나는 기물과 칸을 살펴보세요.', 'Fíjate en las piezas y puntos resaltados.', 'Regardez les pièces et points en surbrillance.', 'Observe as peças e pontos destacados.', 'Schau dir die markierten Figuren und Punkte an.', 'चमकते मोहरों और बिंदुओं को देखिए।', 'انظر إلى القطع والنقاط المضيئة.'),
  ans: L('答えは {m} です。矢印のとおりに動かしてみよう。', 'The answer is {m}. Play the arrow.', '答案是 {m}，照箭头走吧。', '정답은 {m}입니다. 화살표대로 움직여 보세요.', 'La respuesta es {m}. Juega la flecha.', 'La réponse est {m}. Jouez la flèche.', 'A resposta é {m}. Jogue a seta.', 'Die Lösung ist {m}. Spiele den Pfeil.', 'उत्तर {m} है। तीर के अनुसार चलिए।', 'الجواب {m}. العب حسب السهم.'),
};

// (data: one entry per lesson; texts per language)
const RAMPS = {
  "t_fork": [
    {
      "k": "explain",
      "s": "3akab2/9/4b4/1r3r3/9/9/4N4/9/4A4/2BAK1B2 w",
      "seq": [
        "e3d5"
      ],
      "marks": [
        [
          "b6",
          "ng"
        ],
        [
          "f6",
          "ng"
        ]
      ],
      "t": {
        "ja": "両取り＝1手で2つをねらう",
        "en": "A fork: attack two at once",
        "zh": "捉双＝一步攻击两子",
        "ko": "양걸이 = 한 수로 둘을 노리기",
        "es": "Ataque doble: dos objetivos a la vez",
        "fr": "Fourchette : attaquer deux pièces",
        "pt": "Garfo: atacar duas de uma vez",
        "de": "Gabel: zwei Ziele auf einmal",
        "hi": "फ़ोर्क: एक चाल से दो पर हमला",
        "ar": "الشوكة: مهاجمة قطعتين معًا"
      },
      "body": {
        "ja": "<p>馬が矢印の点へ跳ぶと、<b>2つの車</b>（×印）を同時にねらいます。</p><p>相手は1手に1つしか逃げられないので、どちらかの車が取れます。馬は「日」の字に動き、行き先から最大8か所をにらめるので、両取りが生まれやすい駒です。</p><p class=\"note\">探し方：相手の大きい駒2つから、どちらも馬1回分の位置にある点を探し、そこへ自分の馬が跳べるかを見る。</p>",
        "en": "<p>The horse jumps to the arrow’s point and attacks <b>both chariots</b> (the ×) at once.</p><p>The opponent can save only one per move, so you win the other. The horse reaches up to eight points from wherever it lands, which makes it the classic forking piece.</p><p class=\"note\">How to find it: look for a point one horse-move from two big enemy pieces, then see whether your horse can land there.</p>",
        "zh": "<p>马跳到箭头所指的点，同时攻击<b>两只车</b>（×处）。</p><p>对手一步只能逃一只，另一只就能吃到。马走“日”字，落点最多能照顾八处，是最容易捉双的棋子。</p><p class=\"note\">找法：找一个和对方两个大子都隔一个“日”字的点，看自己的马能否跳过去。</p>",
        "ko": "<p>마가 화살표 지점으로 뛰면 <b>차 두 개</b>(× 표시)를 동시에 노립니다.</p><p>상대는 한 수에 하나만 피할 수 있으니 다른 하나를 잡습니다. 마는 “日”자로 움직여 착지점에서 최대 8곳을 노리므로 양걸이가 잘 나오는 기물입니다.</p><p class=\"note\">찾는 법: 상대 큰 기물 둘 모두에서 마 한 번 거리인 점을 찾고, 내 마가 거기로 갈 수 있는지 보세요.</p>",
        "es": "<p>El caballo salta al punto de la flecha y ataca a la vez <b>los dos carros</b> (las ×).</p><p>El rival solo salva uno por jugada, así que ganas el otro. El caballo alcanza hasta ocho puntos desde donde cae: es la pieza típica del ataque doble.</p><p class=\"note\">Cómo verlo: busca un punto a un salto de caballo de dos piezas grandes rivales y mira si tu caballo llega.</p>",
        "fr": "<p>Le cheval saute au point de la flèche et attaque à la fois <b>les deux chars</b> (les ×).</p><p>L’adversaire n’en sauve qu’un par coup : vous gagnez l’autre. Le cheval atteint jusqu’à huit points depuis sa case d’arrivée, c’est la pièce de fourchette par excellence.</p><p class=\"note\">Pour la trouver : cherchez un point à un saut de cheval de deux grosses pièces adverses, puis voyez si votre cheval peut s’y poser.</p>",
        "pt": "<p>O cavalo salta para o ponto da seta e ataca ao mesmo tempo <b>as duas carruagens</b> (os ×).</p><p>O adversário só salva uma por lance, então você ganha a outra. O cavalo alcança até oito pontos de onde cai: é a peça típica do garfo.</p><p class=\"note\">Como achar: procure um ponto a um salto de cavalo de duas peças grandes adversárias e veja se seu cavalo chega lá.</p>",
        "de": "<p>Das Pferd springt auf den Pfeilpunkt und greift <b>beide Wagen</b> (die ×) gleichzeitig an.</p><p>Der Gegner rettet pro Zug nur einen – du gewinnst den anderen. Das Pferd erreicht vom Landepunkt bis zu acht Punkte, darum ist es die typische Gabelfigur.</p><p class=\"note\">So findest du sie: Suche einen Punkt, der von zwei großen gegnerischen Figuren je einen Pferdesprung entfernt ist, und prüfe, ob dein Pferd dort landen kann.</p>",
        "hi": "<p>घोड़ा तीर वाले बिंदु पर कूदकर <b>दोनों रथों</b> (× वाले) पर एक साथ हमला करता है।</p><p>विरोधी एक चाल में एक ही बचा सकता है, तो दूसरा आपका। घोड़ा उतरने की जगह से आठ बिंदुओं तक पहुँचता है, इसलिए फ़ोर्क का ख़ास मोहरा है।</p><p class=\"note\">पहचान: ऐसा बिंदु खोजिए जो विरोधी के दो बड़े मोहरों से घोड़े की एक छलाँग पर हो, फिर देखिए आपका घोड़ा वहाँ पहुँचता है या नहीं।</p>",
        "ar": "<p>يقفز الحصان إلى نقطة السهم فيهاجم <b>العربتين</b> (علامات ×) معًا.</p><p>لا ينقذ الخصم إلا واحدة في كل نقلة، فتكسب الأخرى. يصل الحصان إلى ثماني نقاط من موضع هبوطه، لذا هو قطعة الشوكة النموذجية.</p><p class=\"note\">كيف تجدها: ابحث عن نقطة على بُعد قفزة حصان من قطعتين كبيرتين للخصم، ثم انظر هل يصلها حصانك.</p>"
      }
    },
    {
      "k": "try",
      "s": "4kab2/4a4/4b4/1r3r3/9/9/4N4/9/4A4/2BAK1B2 w",
      "ok": [
        "e3d5"
      ],
      "look": [
        "e3",
        "b6",
        "f6",
        "d5"
      ],
      "g": {
        "ja": "図と同じ形。2つの車を同時にねらおう。",
        "en": "The same shape: attack both chariots at once.",
        "zh": "同样的形：同时攻击两只车。",
        "ko": "그림과 같은 모양. 차 두 개를 동시에 노리세요.",
        "es": "La misma forma: ataca los dos carros a la vez.",
        "fr": "La même forme : attaquez les deux chars à la fois.",
        "pt": "A mesma forma: ataque as duas carruagens.",
        "de": "Dieselbe Form: greif beide Wagen an.",
        "hi": "वही आकार: दोनों रथों पर एक साथ हमला।",
        "ar": "الشكل نفسه: هاجم العربتين معًا."
      },
      "h": {
        "ja": "2つの車のどちらからも「日」の字1つ分の点はどこ？そこへ馬が跳べるか見よう。",
        "en": "Which point is one horse-move from both chariots? Can your horse jump there?",
        "zh": "哪个点和两只车都隔一个“日”字？马能跳过去吗？",
        "ko": "두 차 모두에서 “日”자 한 번 거리인 점은? 마가 거기로 뛸 수 있나요?",
        "es": "¿Qué punto está a un salto de caballo de ambos carros? ¿Llega tu caballo?",
        "fr": "Quel point est à un saut de cheval des deux chars ? Votre cheval peut-il y aller ?",
        "pt": "Que ponto está a um salto de cavalo das duas carruagens? Seu cavalo chega lá?",
        "de": "Welcher Punkt ist von beiden Wagen einen Pferdesprung entfernt? Kommt dein Pferd hin?",
        "hi": "कौन-सा बिंदु दोनों रथों से घोड़े की एक छलाँग पर है? क्या घोड़ा वहाँ जा सकता है?",
        "ar": "أي نقطة على بُعد قفزة حصان من العربتين معًا؟ هل يصلها حصانك؟"
      },
      "y": {
        "ja": "正解！馬が2つの車を同時にねらい、どちらかの車が取れます。",
        "en": "Right! The horse hits both chariots, and one of them falls.",
        "zh": "正确！马同时攻击两只车，必得一车。",
        "ko": "정답! 마가 차 두 개를 동시에 노려 하나를 잡습니다.",
        "es": "¡Bien! El caballo ataca los dos carros y cae uno.",
        "fr": "Bien ! Le cheval vise les deux chars : l’un tombe.",
        "pt": "Certo! O cavalo ataca as duas carruagens e uma cai.",
        "de": "Richtig! Das Pferd trifft beide Wagen – einer fällt.",
        "hi": "सही! घोड़ा दोनों रथों पर हमला करता है, एक जाएगा।",
        "ar": "صحيح! الحصان يهاجم العربتين فتسقط إحداهما."
      }
    }
  ],
  "m_hc": [
    {
      "k": "explain",
      "s": "4k4/9/4N4/9/9/p8/9/1C7/9/3K5 w",
      "seq": [
        "b2e2"
      ],
      "marks": [
        [
          "e7",
          "ok"
        ],
        [
          "d9",
          "ng"
        ],
        [
          "f9",
          "ng"
        ],
        [
          "e8",
          "ng"
        ]
      ],
      "t": {
        "ja": "馬後炮＝馬を台にして炮で王手",
        "en": "Horse-and-cannon: the horse is the cannon’s screen",
        "zh": "马后炮＝以马为炮架将军",
        "ko": "마후포 = 마를 포대로 삼아 포로 장군",
        "es": "Caballo y cañón: el caballo hace de pantalla",
        "fr": "Cheval-canon : le cheval sert d’écran",
        "pt": "Cavalo e canhão: o cavalo é a tela",
        "de": "Pferd und Kanone: das Pferd ist der Schirm",
        "hi": "घोड़ा-तोप: घोड़ा तोप की आड़",
        "ar": "الحصان والمدفع: الحصان ستار المدفع"
      },
      "body": {
        "ja": "<p>炮は<b>間にちょうど1つ駒をはさんで</b>王手をかけます。炮が矢印のとおり將と同じ筋へ来ると、光っている馬を台にして王手。</p><p>將の逃げ道（×印）は、左右の2か所を馬がにらみ、前の1か所は炮の筋のまま。どこへも逃げられず、詰みです。</p><p class=\"note\">形：將・馬・炮が<b>同じ筋</b>に縦に並ぶ。馬は「台」と「逃げ道ふさぎ」の二役。</p>",
        "en": "<p>A cannon gives check with <b>exactly one piece in between</b>. When the cannon slides onto the general’s file (arrow), it checks over the glowing horse.</p><p>The escape points (the ×): the two at the sides are covered by the horse, and the one in front is still on the cannon’s file. Nowhere to go — mate.</p><p class=\"note\">Shape: general, horse and cannon <b>on one file</b>. The horse is both the screen and the guard.</p>",
        "zh": "<p>炮要<b>隔一个子</b>才能将军。炮照箭头走到和将同一条线，就以发光的马为炮架将军。</p><p>将的退路（×处）：左右两处被马控制，前方一处仍在炮线上。无处可逃，将死。</p><p class=\"note\">形：将、马、炮<b>同在一条直线</b>。马既是炮架，又封住退路。</p>",
        "ko": "<p>포는 <b>사이에 기물을 딱 하나 두고</b> 장군을 겁니다. 포가 화살표대로 장과 같은 줄로 오면 빛나는 마를 포대로 장군.</p><p>장의 퇴로(× 표시): 좌우 두 곳은 마가 노리고, 앞의 한 곳은 포의 줄. 갈 곳이 없어 외통입니다.</p><p class=\"note\">모양: 장・마・포가 <b>같은 줄</b>에 세로로. 마는 포대와 퇴로 봉쇄를 겸합니다.</p>",
        "es": "<p>El cañón da jaque con <b>exactamente una pieza en medio</b>. Al pasar a la columna del general (flecha), da jaque por encima del caballo iluminado.</p><p>Las salidas (las ×): las dos laterales las cubre el caballo y la de delante sigue en la columna del cañón. No hay escape: mate.</p><p class=\"note\">Forma: general, caballo y cañón <b>en la misma columna</b>. El caballo es pantalla y guardián.</p>",
        "fr": "<p>Le canon fait échec avec <b>exactement une pièce entre les deux</b>. En venant sur la colonne du général (flèche), il fait échec par-dessus le cheval en surbrillance.</p><p>Les fuites (les ×) : les deux latérales sont couvertes par le cheval, celle de devant reste sur la colonne du canon. Aucune issue : mat.</p><p class=\"note\">Forme : général, cheval et canon <b>sur une même colonne</b>. Le cheval est écran et gardien.</p>",
        "pt": "<p>O canhão dá xeque com <b>exatamente uma peça no meio</b>. Ao ir para a coluna do general (seta), dá xeque por cima do cavalo destacado.</p><p>As fugas (os ×): as duas laterais o cavalo cobre e a da frente segue na coluna do canhão. Sem saída: mate.</p><p class=\"note\">Forma: general, cavalo e canhão <b>na mesma coluna</b>. O cavalo é tela e guarda.</p>",
        "de": "<p>Die Kanone gibt Schach mit <b>genau einer Figur dazwischen</b>. Zieht sie auf die Linie des Generals (Pfeil), gibt sie über das leuchtende Pferd Schach.</p><p>Die Fluchtpunkte (die ×): die beiden seitlichen deckt das Pferd, der vordere liegt noch auf der Kanonenlinie. Kein Ausweg – matt.</p><p class=\"note\">Form: General, Pferd und Kanone <b>auf einer Linie</b>. Das Pferd ist Schirm und Wächter zugleich.</p>",
        "hi": "<p>तोप <b>बीच में ठीक एक मोहरा</b> रखकर शह देती है। तीर के अनुसार जनरल की रेखा पर आते ही वह चमकते घोड़े के ऊपर से शह देती है।</p><p>भागने के बिंदु (× वाले): दोनों बगल वाले घोड़ा रोकता है, सामने वाला अब भी तोप की रेखा पर है। कोई रास्ता नहीं: मात।</p><p class=\"note\">आकार: जनरल, घोड़ा और तोप <b>एक ही रेखा</b> पर। घोड़ा आड़ भी है और पहरेदार भी।</p>",
        "ar": "<p>المدفع يكشّ <b>بقطعة واحدة بالضبط في الوسط</b>. حين ينتقل إلى عمود القائد (السهم) يكشّ من فوق الحصان المضيء.</p><p>المهارب (علامات ×): الجانبيتان يحميهما الحصان، والأمامية ما زالت على خط المدفع. لا مفرّ: مات.</p><p class=\"note\">الشكل: القائد والحصان والمدفع <b>على خط واحد</b>. الحصان ستار وحارس معًا.</p>"
      }
    },
    {
      "k": "try",
      "s": "5k3/9/5N3/9/9/p8/9/C8/9/3K5 w",
      "ok": [
        "a2f2"
      ],
      "mate": 1,
      "look": [
        "f9",
        "f7",
        "a2"
      ],
      "g": {
        "ja": "馬後炮で1手詰め。",
        "en": "Mate in one with horse-and-cannon.",
        "zh": "用马后炮一步将死。",
        "ko": "마후포로 한 수 외통.",
        "es": "Mate en uno con caballo y cañón.",
        "fr": "Mat en un avec cheval-canon.",
        "pt": "Mate em um com cavalo e canhão.",
        "de": "Matt in eins mit Pferd und Kanone.",
        "hi": "घोड़ा-तोप से एक चाल में मात।",
        "ar": "كش مات في نقلة بالحصان والمدفع."
      },
      "h": {
        "ja": "將と馬は同じ筋に縦に並んでいます。炮をその筋へ回すと？",
        "en": "The general and the horse stand on one file. What if the cannon swings onto that file?",
        "zh": "将和马在同一条直线上。把炮移到这条线会怎样？",
        "ko": "장과 마가 같은 줄에 세로로 있습니다. 포를 그 줄로 옮기면?",
        "es": "El general y el caballo están en la misma columna. ¿Y si el cañón pasa a esa columna?",
        "fr": "Le général et le cheval sont sur la même colonne. Et si le canon y vient ?",
        "pt": "O general e o cavalo estão na mesma coluna. E se o canhão for para ela?",
        "de": "General und Pferd stehen auf einer Linie. Was, wenn die Kanone auf diese Linie zieht?",
        "hi": "जनरल और घोड़ा एक ही रेखा पर हैं। तोप उस रेखा पर आए तो?",
        "ar": "القائد والحصان على عمود واحد. ماذا لو انتقل المدفع إليه؟"
      },
      "y": {
        "ja": "正解！炮が馬を台に王手。逃げ道は馬が押さえています。",
        "en": "Right! The cannon checks over the horse, and the horse covers the escape points.",
        "zh": "正确！炮以马为架将军，退路被马封住。",
        "ko": "정답! 포가 마를 포대로 장군, 퇴로는 마가 막습니다.",
        "es": "¡Bien! El cañón da jaque sobre el caballo, que cubre las salidas.",
        "fr": "Bien ! Le canon fait échec par-dessus le cheval, qui couvre les fuites.",
        "pt": "Certo! O canhão dá xeque sobre o cavalo, que cobre as fugas.",
        "de": "Richtig! Die Kanone gibt über das Pferd Schach, das die Fluchtpunkte deckt.",
        "hi": "सही! तोप घोड़े के ऊपर से शह देती है, और भागने के बिंदु घोड़ा रोकता है।",
        "ar": "صحيح! المدفع يكشّ من فوق الحصان الذي يسدّ المهارب."
      }
    }
  ],
  "m_dc": [
    {
      "k": "explain",
      "s": "3aka3/9/9/4C4/9/p8/9/1C7/9/3K5 w",
      "seq": [
        "b2e2"
      ],
      "marks": [
        [
          "e6",
          "ok"
        ],
        [
          "d9",
          "ng"
        ],
        [
          "f9",
          "ng"
        ],
        [
          "e8",
          "ng"
        ]
      ],
      "t": {
        "ja": "重炮＝炮を縦に2つ重ねる",
        "en": "Double cannons: two cannons on one file",
        "zh": "重炮＝两炮叠在一条线上",
        "ko": "중포 = 포 두 개를 세로로 겹치기",
        "es": "Cañones dobles: dos en la misma columna",
        "fr": "Canons doublés : deux sur une colonne",
        "pt": "Canhões dobrados: dois na mesma coluna",
        "de": "Doppelkanone: zwei auf einer Linie",
        "hi": "दोहरी तोप: एक रेखा पर दो तोपें",
        "ar": "المدفعان المزدوجان: مدفعان على خط واحد"
      },
      "body": {
        "ja": "<p>光っている炮の後ろへ、もう1つの炮が矢印のとおり来ると、前の炮が台になって將に王手。</p><p>將の左右は自分の士でふさがり、前は炮の筋（×印）。台の炮を取れる駒も、間に入れる駒もないので詰みです。</p><p class=\"note\">士が將の両わきにいる形は、重炮にとても弱い。</p>",
        "en": "<p>A second cannon comes in behind the glowing cannon (arrow). The front cannon becomes the screen and the general is in check.</p><p>The general’s sides are blocked by its own advisors, and the point in front is on the cannon file (the ×). Nothing can take the front cannon or block: mate.</p><p class=\"note\">A general flanked by its own advisors is very weak against double cannons.</p>",
        "zh": "<p>另一只炮照箭头来到发光的炮后面，前炮当炮架将军。</p><p>将的左右被自己的士堵住，前方在炮线上（×处）。没有子能吃掉炮架或垫子，将死。</p><p class=\"note\">士守在将两侧的形，非常怕重炮。</p>",
        "ko": "<p>빛나는 포 뒤로 또 하나의 포가 화살표대로 오면, 앞 포가 포대가 되어 장군.</p><p>장의 좌우는 자기 사가 막고, 앞은 포의 줄(× 표시). 포대를 잡거나 사이를 막을 기물이 없어 외통입니다.</p><p class=\"note\">사가 장 양옆에 있는 모양은 중포에 매우 약합니다.</p>",
        "es": "<p>Un segundo cañón llega detrás del cañón iluminado (flecha). El delantero hace de pantalla y el general queda en jaque.</p><p>Los lados del general están tapados por sus consejeros y el punto de delante está en la columna del cañón (la ×). Nada captura la pantalla ni se interpone: mate.</p><p class=\"note\">Un general flanqueado por sus consejeros es muy débil ante los cañones dobles.</p>",
        "fr": "<p>Un second canon vient derrière le canon en surbrillance (flèche). Le canon avant sert d’écran : le général est en échec.</p><p>Ses côtés sont bouchés par ses conseillers et le point devant est sur la colonne du canon (la ×). Rien ne prend l’écran ni ne s’interpose : mat.</p><p class=\"note\">Un général encadré de ses conseillers est très faible face aux canons doublés.</p>",
        "pt": "<p>Um segundo canhão vem para trás do canhão destacado (seta). O da frente vira tela e o general fica em xeque.</p><p>Os lados do general estão tapados pelos conselheiros e o ponto à frente está na coluna do canhão (o ×). Nada captura a tela nem se interpõe: mate.</p><p class=\"note\">Um general cercado pelos conselheiros é muito fraco contra canhões dobrados.</p>",
        "de": "<p>Eine zweite Kanone zieht hinter die leuchtende Kanone (Pfeil). Die vordere wird zum Schirm, der General steht im Schach.</p><p>Seine Seiten blockieren die eigenen Berater, der Punkt davor liegt auf der Kanonenlinie (das ×). Niemand schlägt den Schirm oder stellt sich dazwischen: Matt.</p><p class=\"note\">Ein General zwischen seinen Beratern ist gegen die Doppelkanone sehr schwach.</p>",
        "hi": "<p>दूसरी तोप तीर के अनुसार चमकती तोप के पीछे आती है। आगे वाली तोप आड़ बनती है और जनरल शह में।</p><p>जनरल के दोनों बगल उसके अपने सलाहकारों से बंद हैं और सामने वाला बिंदु तोप की रेखा पर है (×)। आड़ को कोई नहीं मार सकता, बीच में कोई नहीं आ सकता: मात।</p><p class=\"note\">अपने सलाहकारों से घिरा जनरल दोहरी तोप के आगे बहुत कमज़ोर है।</p>",
        "ar": "<p>يأتي مدفع ثانٍ خلف المدفع المضيء (السهم). يصبح الأمامي ستارًا فيُكشّ القائد.</p><p>جانبا القائد مسدودان بمستشاريه، والنقطة الأمامية على خط المدفع (علامة ×). لا شيء يأخذ الستار أو يعترض: مات.</p><p class=\"note\">القائد المحاط بمستشاريه ضعيف جدًا أمام المدفعين المزدوجين.</p>"
      }
    },
    {
      "k": "try",
      "s": "3akab2/9/9/9/2C6/p8/9/4C4/9/3K5 w",
      "ok": [
        "c5e5"
      ],
      "mate": 1,
      "look": [
        "e9",
        "e2",
        "c5"
      ],
      "g": {
        "ja": "重炮で1手詰め。",
        "en": "Mate in one with double cannons.",
        "zh": "用重炮一步将死。",
        "ko": "중포로 한 수 외통.",
        "es": "Mate en uno con cañones dobles.",
        "fr": "Mat en un avec les canons doublés.",
        "pt": "Mate em um com canhões dobrados.",
        "de": "Matt in eins mit der Doppelkanone.",
        "hi": "दोहरी तोप से एक चाल में मात।",
        "ar": "كش مات في نقلة بالمدفعين المزدوجين."
      },
      "h": {
        "ja": "炮が1つ、將と同じ筋にいます。もう1つの炮をその前（同じ筋）に置くと？",
        "en": "One cannon is already on the general’s file. What if the other cannon goes in front of it on that file?",
        "zh": "一只炮已在将的线上。把另一只炮放到它前面（同一条线）会怎样？",
        "ko": "포 하나가 이미 장과 같은 줄에 있습니다. 다른 포를 그 앞(같은 줄)에 두면?",
        "es": "Un cañón ya está en la columna del general. ¿Y si el otro se pone delante, en esa columna?",
        "fr": "Un canon est déjà sur la colonne du général. Et si l’autre se place devant lui ?",
        "pt": "Um canhão já está na coluna do general. E se o outro ficar na frente dele?",
        "de": "Eine Kanone steht schon auf der Linie des Generals. Was, wenn die andere davor zieht?",
        "hi": "एक तोप पहले से जनरल की रेखा पर है। दूसरी तोप उसके आगे उसी रेखा पर रखें तो?",
        "ar": "أحد المدفعين على عمود القائد بالفعل. ماذا لو وُضع الآخر أمامه على العمود نفسه؟"
      },
      "y": {
        "ja": "正解！前の炮が台になり、後ろの炮が王手。將は士にはさまれて動けません。",
        "en": "Right! The front cannon is the screen and the rear one gives check; the general is boxed in by its advisors.",
        "zh": "正确！前炮当炮架，后炮将军。将被士夹住动不了。",
        "ko": "정답! 앞 포가 포대, 뒤 포가 장군. 장은 사에 끼어 움직일 수 없습니다.",
        "es": "¡Bien! El cañón delantero es la pantalla y el trasero da jaque; los consejeros encierran al general.",
        "fr": "Bien ! Le canon avant sert d’écran et l’arrière fait échec ; le général est coincé par ses conseillers.",
        "pt": "Certo! O canhão da frente é a tela e o de trás dá xeque; os conselheiros prendem o general.",
        "de": "Richtig! Die vordere Kanone ist der Schirm, die hintere gibt Schach – die Berater sperren den General ein.",
        "hi": "सही! आगे की तोप आड़ है और पीछे की तोप शह देती है; सलाहकार जनरल को घेर लेते हैं।",
        "ar": "صحيح! المدفع الأمامي ستار والخلفي يكشّ، والمستشاران يحاصران القائد."
      }
    }
  ],
  "m_face": [
    {
      "k": "explain",
      "s": "5k3/9/9/9/9/p8/9/9/9/4K1R2 w",
      "seq": [
        "g0f0"
      ],
      "marks": [
        [
          "e0",
          "ok"
        ],
        [
          "e9",
          "ng"
        ],
        [
          "f8",
          "ng"
        ]
      ],
      "t": {
        "ja": "帥と將は向かい合えない",
        "en": "The two generals may not face each other",
        "zh": "帅将不能照面",
        "ko": "수와 장은 마주 볼 수 없다",
        "es": "Los generales no pueden mirarse",
        "fr": "Les généraux ne peuvent pas se faire face",
        "pt": "Os generais não podem se encarar",
        "de": "Die Generäle dürfen sich nicht ansehen",
        "hi": "दोनों जनरल आमने-सामने नहीं हो सकते",
        "ar": "لا يتواجه القائدان"
      },
      "body": {
        "ja": "<p>帥と將が同じ筋で、間に駒なく向かい合う手は指せません。だから光っている帥は、<b>自分のいる筋全体</b>を將に使わせません。</p><p>車が矢印のとおり將の筋へ回って王手。將は横へ逃げると帥と向かい合うので行けず、前は車の筋（×印）。詰みです。</p><p class=\"note\">帥は攻めにも使える。同じ筋をふさぐ「見えない壁」になる。</p>",
        "en": "<p>The generals may never stand on the same file with nothing between them. So the glowing red general takes away <b>its whole file</b> from the black general.</p><p>The chariot swings onto the general’s file (arrow) and gives check. Stepping sideways would face the red general, and the point in front is on the chariot’s file (the ×). Mate.</p><p class=\"note\">Your general can attack too: it is an invisible wall along its file.</p>",
        "zh": "<p>帅和将不能在同一条线上没有隔子地照面。所以发光的帅让将<b>整条所在线</b>都不能用。</p><p>车照箭头移到将的线上将军。将横走会和帅照面，前方又在车线上（×处）。将死。</p><p class=\"note\">帅也能参与进攻，是一堵看不见的墙。</p>",
        "ko": "<p>수와 장은 같은 줄에서 사이에 기물 없이 마주 볼 수 없습니다. 그래서 빛나는 수는 장이 <b>그 줄 전체</b>를 쓰지 못하게 합니다.</p><p>차가 화살표대로 장의 줄로 돌아 장군. 장은 옆으로 가면 수와 마주 보고, 앞은 차의 줄(× 표시). 외통입니다.</p><p class=\"note\">수도 공격에 쓸 수 있습니다. 같은 줄을 막는 “보이지 않는 벽”.</p>",
        "es": "<p>Los generales nunca pueden quedar en la misma columna sin nada entre ellos. Así, el general rojo iluminado le quita <b>toda su columna</b> al negro.</p><p>El carro pasa a la columna del general (flecha) y da jaque. Ir de lado lo enfrentaría al general rojo, y el punto de delante está en la columna del carro (las ×). Mate.</p><p class=\"note\">Tu general también ataca: es un muro invisible en su columna.</p>",
        "fr": "<p>Les généraux ne peuvent jamais être sur la même colonne sans rien entre eux. Le général rouge en surbrillance interdit donc <b>toute sa colonne</b> au noir.</p><p>Le char vient sur la colonne du général (flèche) et fait échec. S’écarter le mettrait face au général rouge, et le point devant est sur la colonne du char (les ×). Mat.</p><p class=\"note\">Votre général attaque aussi : c’est un mur invisible sur sa colonne.</p>",
        "pt": "<p>Os generais nunca podem ficar na mesma coluna sem nada entre eles. Assim o general vermelho destacado tira do preto <b>toda a coluna dele</b>.</p><p>A carruagem vai à coluna do general (seta) e dá xeque. Ir para o lado o poria de frente ao general vermelho, e o ponto à frente está na coluna da carruagem (os ×). Mate.</p><p class=\"note\">Seu general também ataca: é um muro invisível na coluna dele.</p>",
        "de": "<p>Die Generäle dürfen nie ohne Figur dazwischen auf derselben Linie stehen. Der leuchtende rote General nimmt dem schwarzen also <b>seine ganze Linie</b>.</p><p>Der Wagen schwenkt auf die Linie des Generals (Pfeil) und gibt Schach. Seitwärts stünde er dem roten General gegenüber, und der Punkt davor liegt auf der Wagenlinie (die ×). Matt.</p><p class=\"note\">Auch dein General greift an: er ist eine unsichtbare Mauer auf seiner Linie.</p>",
        "hi": "<p>दोनों जनरल बीच में कोई मोहरा न हो तो एक ही रेखा पर कभी नहीं रह सकते। इसलिए चमकता लाल जनरल काले से <b>अपनी पूरी रेखा</b> छीन लेता है।</p><p>रथ तीर के अनुसार जनरल की रेखा पर आकर शह देता है। बगल में जाए तो लाल जनरल के सामने आएगा, और सामने वाला बिंदु रथ की रेखा पर है (× वाले)। मात।</p><p class=\"note\">आपका जनरल भी हमला करता है: अपनी रेखा पर एक अदृश्य दीवार।</p>",
        "ar": "<p>لا يجوز أن يقف القائدان على عمود واحد بلا قطعة بينهما. لذا يحرم القائد الأحمر المضيء خصمه من <b>عموده كله</b>.</p><p>تنتقل العربة إلى عمود القائد (السهم) وتكشّه. التنحّي جانبًا يجعله مواجهًا للقائد الأحمر، والنقطة الأمامية على خط العربة (علامات ×). مات.</p><p class=\"note\">قائدك يهاجم أيضًا: إنه جدار خفيّ على عموده.</p>"
      }
    },
    {
      "k": "try",
      "s": "3k5/9/9/9/9/p8/9/9/9/2R1K4 w",
      "ok": [
        "c0d0"
      ],
      "mate": 1,
      "look": [
        "e0",
        "d9",
        "e9"
      ],
      "g": {
        "ja": "帥の力を使って1手詰め。",
        "en": "Mate in one using your general.",
        "zh": "借帅的力量一步将死。",
        "ko": "수의 힘을 써서 한 수 외통.",
        "es": "Mate en uno usando tu general.",
        "fr": "Mat en un en utilisant votre général.",
        "pt": "Mate em um usando seu general.",
        "de": "Matt in eins mit Hilfe deines Generals.",
        "hi": "अपने जनरल की मदद से एक चाल में मात।",
        "ar": "كش مات في نقلة بمساعدة قائدك."
      },
      "h": {
        "ja": "將が横へ逃げようとすると、帥と同じ筋に入ってしまいます。車で將と同じ筋から王手すると？",
        "en": "If the general steps sideways it lands on your general’s file. What if the chariot checks along the general’s file?",
        "zh": "将往横走就会进到帅的线上。用车在将的线上将军会怎样？",
        "ko": "장이 옆으로 가면 수와 같은 줄에 들어갑니다. 차로 장과 같은 줄에서 장군하면?",
        "es": "Si el general se aparta, cae en la columna de tu general. ¿Y si el carro da jaque por la columna del general?",
        "fr": "S’il s’écarte, le général tombe sur la colonne du vôtre. Et si le char fait échec sur la colonne du général ?",
        "pt": "Se o general sair de lado, cai na coluna do seu. E se a carruagem der xeque pela coluna do general?",
        "de": "Weicht der General seitlich aus, steht er auf der Linie deines Generals. Was, wenn der Wagen auf seiner Linie Schach gibt?",
        "hi": "जनरल बगल में जाए तो आपके जनरल की रेखा पर आ जाएगा। रथ जनरल की रेखा से शह दे तो?",
        "ar": "إن تنحّى القائد جانبًا دخل عمود قائدك. ماذا لو كشّت العربة على عمود القائد؟"
      },
      "y": {
        "ja": "正解！車で王手。横は帥とにらみ合い、前は車の筋で、將は動けません。",
        "en": "Right! The chariot checks; sideways faces your general and forward is on the chariot’s file.",
        "zh": "正确！车将军。横走会和帅照面，前进在车线上，将无路可走。",
        "ko": "정답! 차로 장군. 옆은 수와 마주 보고 앞은 차의 줄이라 장은 움직일 수 없습니다.",
        "es": "¡Bien! El carro da jaque; de lado enfrenta a tu general y delante está en la columna del carro.",
        "fr": "Bien ! Le char fait échec ; de côté il fait face à votre général, devant il est sur la colonne du char.",
        "pt": "Certo! A carruagem dá xeque; de lado encara seu general e à frente está na coluna da carruagem.",
        "de": "Richtig! Der Wagen gibt Schach; seitwärts steht er deinem General gegenüber, nach vorn auf der Wagenlinie.",
        "hi": "सही! रथ की शह; बगल में आपका जनरल सामने है और आगे रथ की रेखा।",
        "ar": "صحيح! العربة تكشّ؛ جانبًا يواجه قائدك وأمامًا على خط العربة."
      }
    }
  ]
};

if (require.main === module) {
  const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  D.rampUi = UI;
  for (const s of D.steps) delete s.ramp;
  for (const id in RAMPS) { const s = D.steps.find(x => x.id === id); if (!s) throw new Error('no lesson ' + id); s.ramp = RAMPS[id]; }
  fs.writeFileSync(FILE, JSON.stringify(D));
  console.log('ramps written:', Object.entries(RAMPS).map(([k, v]) => k + ' ' + v.length).join(', '));
}
module.exports = { UI, RAMPS };
