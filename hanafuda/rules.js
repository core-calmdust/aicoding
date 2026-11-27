/* 花札（こいこい）— rules tutorial (shared/ruletour.js). Each page: a short explanation and a small task on real cards. */
(function () {
'use strict';
const A = window.HFApp, HF = window.HF, C = window.HFCards;
const R = {
ja: {
  origin: '日本（江戸時代〜）', players: '2人', time: '1か月 約3分・12か月で約30分',
  hist: '16世紀にポルトガルから伝わったカルタをもとに、江戸時代に12か月の草花を描く花札が生まれました。1889年に創業した任天堂も、花札作りから始まった会社です。',
  win: '場の札と同じ月の札を合わせて取り、取り札で「役」を作ります。12か月の合計点が多い方の勝ち。',
  cult: '札には月ごとの草花と、花見・月見などの季節の行事が描かれています。こいこいは2人で遊ぶ花札の定番です。',
  'months.t': '12か月×4枚', 'months.b': '48枚の札は12か月に分かれ、同じ草花の札は同じ月です。松は1月、桜は3月、菊は9月…', 'months.task': '手札の「松」と同じ月の札を、場から選んでください', 'months.ok': '正解！ どちらも松、1月の札です。', 'months.ng': 'それは別の月の札です。草花の絵を見比べてみましょう。',
  'match.t': '合わせて取る', 'match.b': '手札から1枚出し、場に同じ月の札があれば2枚とも取れます。なければその札を場に置きます。', 'match.task': '場の札を取れる手札を1枚出してください', 'match.ok': '取れました！ 同じ月の札が2枚、あなたの取り札になります。', 'match.ng': 'その月の札は場にありません。場に置くだけになってしまいます。',
  'draw.t': '山札をめくる', 'draw.b': '手札を出したあと、山札を1枚めくります。めくった札も、場に同じ月があれば取れます。', 'draw.task': '山札をタップしてめくってください', 'draw.ok': '桜がめくれて、場の桜と合わせて取れました！',
  'kinds.t': '札の種類', 'kinds.b': '札は「光」「タネ」「短冊」「カス」の4種類。光は5枚しかない特別な札で、点の高い役になります。', 'kinds.task': '4枚の中から「光」の札を選んでください', 'kinds.ok': '正解！ 桐に鳳凰は光の札です。', 'kinds.ng': 'それは光ではありません。いちばん豪華な絵の札を探しましょう。',
  'yaku.t': '役を作る', 'yaku.b': '取り札がそろうと「役」になります。たとえば赤短は、松・梅・桜の文字入りの赤い短冊3枚。', 'yaku.task': '赤短を完成させる札を場から取ってください（手札は桜）', 'yaku.ok': '赤短の完成、5点です！', 'yaku.ng': 'それでは赤短はそろいません。文字の書かれた赤い短冊を探しましょう。',
  'koi.t': '勝負か、こいこいか', 'koi.b': '役ができたら「勝負」で点を取って終えるか、「こいこい」で続けるか選びます。続けたあと相手に役を作られると、相手の点が2倍になります。', 'koi.task': 'あなたは5点。相手はあと1枚で猪鹿蝶です。どうしますか？', 'koi.ok': 'その通り！ 相手の役が近いときは、勝負して点を確保するのが安全です。', 'koi.ng': '危険です。相手に猪鹿蝶を作られると、相手の点が2倍になってしまいます。',
  stop: '勝負', go: 'こいこい', you: '手札', field: '場', caps: 'あなたの取り札', opp: '相手の取り札',
},
en: {
  origin: 'Japan (Edo period on)', players: '2', time: 'About 3 min a month, 30 min for 12',
  hist: 'Hanafuda grew out of the playing cards Portuguese traders brought in the 16th century; in the Edo period came the deck of twelve months of flowers. Nintendo, founded in 1889, began as a hanafuda maker.',
  win: 'Match cards of the same month to capture them and build “yaku” from your captures. The higher total over the months wins.',
  cult: 'Each month shows its plant and seasonal customs such as cherry-blossom and moon viewing. Koi-Koi is the classic two-player hanafuda game.',
  'months.t': '12 months × 4 cards', 'months.b': 'The 48 cards are split into 12 months; cards with the same plant are the same month. Pine is January, cherry March, chrysanthemum September…', 'months.task': 'Pick the field card of the same month as the pine in your hand', 'months.ok': 'Right! Both are pine, January cards.', 'months.ng': 'That card is another month. Compare the plants.',
  'match.t': 'Match and capture', 'match.b': 'Play a card from your hand: if the field has a card of the same month, you take both. If not, your card stays on the field.', 'match.task': 'Play a hand card that can capture', 'match.ok': 'Captured! Both cards of that month are yours.', 'match.ng': 'No card of that month is on the field, so it would just be laid down.',
  'draw.t': 'Draw from the deck', 'draw.b': 'After playing, turn over the top card of the deck. If the field has a card of its month, you capture them too.', 'draw.task': 'Tap the deck to turn a card', 'draw.ok': 'A cherry card! It captures the cherry on the field.',
  'kinds.t': 'Kinds of cards', 'kinds.b': 'There are Brights, Animals, Ribbons and Chaff. Only five cards are Brights; they make the high-scoring yaku.', 'kinds.task': 'Pick the Bright among the four cards', 'kinds.ok': 'Right! The paulownia phoenix is a Bright.', 'kinds.ng': 'That is not a Bright. Look for the grandest picture.',
  'yaku.t': 'Making yaku', 'yaku.b': 'Captured sets score as “yaku”. Red Poetry Ribbons, for example, is the three red ribbons with writing: pine, plum and cherry.', 'yaku.task': 'Capture the card that completes Red Poetry Ribbons (your hand card is cherry)', 'yaku.ok': 'Red Poetry Ribbons, 5 points!', 'yaku.ng': 'That does not complete it. Find the red ribbon with writing.',
  'koi.t': 'Stop or koi-koi?', 'koi.b': 'With a yaku you choose: “Stop” and score, or “Koi-koi” and play on. If the opponent then makes a yaku, their score is doubled.', 'koi.task': 'You have 5 points. The opponent needs one card for Boar-Deer-Butterfly. What do you do?', 'koi.ok': 'Exactly. When the opponent is close, stopping to keep your points is the safe choice.', 'koi.ng': 'Risky: if they complete Boar-Deer-Butterfly, their score is doubled.',
  stop: 'Stop', go: 'Koi-koi', you: 'Hand', field: 'Field', caps: 'Your captures', opp: 'Opponent’s captures',
},
};
const OTHER = {
  zh: ['日本（江户时代起）', '2人', '每月约3分钟，12个月约30分钟', '花札源自16世纪葡萄牙人带来的纸牌，江户时代出现了描绘十二个月花草的花札。1889年创立的任天堂最初也是做花札的。', '把同一个月的牌配对收走，用收到的牌组成“役”。十二个月合计得分高者获胜。', '每个月描绘当月的花草与赏樱、赏月等节令习俗。“こいこい”是两人玩花札的经典玩法。',
    '12个月×4张', '48张牌分为12个月，画同一种花草的牌属于同一个月。松是1月，樱是3月，菊是9月……', '从场上选出与手中“松”同月的牌', '正确！两张都是松，1月的牌。', '那是别的月份。比较一下花草的图案吧。',
    '配对收牌', '从手牌出1张，场上有同月的牌就两张都收走；没有就把牌留在场上。', '出一张能收走场上牌的手牌', '收到了！两张同月的牌归你。', '场上没有那个月的牌，只能放在场上。',
    '翻牌堆', '出牌后翻开牌堆最上面一张。场上有同月的牌也能收走。', '点一下牌堆翻牌', '翻出樱，和场上的樱配对收走！',
    '牌的种类', '牌分“光”“种”“短册”“渣”四类。光只有5张，能组成高分的役。', '从4张牌中选出“光”', '正确！桐与凤凰是光牌。', '那不是光。找画面最华丽的那张。',
    '组成役', '收到的牌凑齐就成“役”。例如赤短：松、梅、樱三张写字的红短册。', '从场上收走能凑成赤短的牌（手牌是樱）', '赤短完成，5分！', '那样凑不成赤短。找写着字的红短册。',
    '决胜还是こいこい', '成役后选择“决胜”拿分结束，或“こいこい”继续。继续后若对手先成役，对手得分翻倍。', '你有5分，对手差1张就成猪鹿蝶。怎么办？', '没错！对手接近成役时，决胜保住得分最安全。', '危险：对手凑成猪鹿蝶的话，得分会翻倍。',
    '决胜', 'こいこい', '手牌', '场', '你的收牌', '对手的收牌'],
  'zh-TW': ['日本（江戶時代起）', '2人', '每月約3分鐘，12個月約30分鐘', '花札源自16世紀葡萄牙人帶來的紙牌，江戶時代出現了描繪十二個月花草的花札。1889年創立的任天堂最初也是做花札的。', '把同一個月的牌配對收走，用收到的牌組成「役」。十二個月合計得分高者獲勝。', '每個月描繪當月的花草與賞櫻、賞月等節令習俗。「こいこい」是兩人玩花札的經典玩法。',
    '12個月×4張', '48張牌分為12個月，畫同一種花草的牌屬於同一個月。松是1月，櫻是3月，菊是9月……', '從場上選出與手中「松」同月的牌', '正確！兩張都是松，1月的牌。', '那是別的月份。比較一下花草的圖案吧。',
    '配對收牌', '從手牌出1張，場上有同月的牌就兩張都收走；沒有就把牌留在場上。', '出一張能收走場上牌的手牌', '收到了！兩張同月的牌歸你。', '場上沒有那個月的牌，只能放在場上。',
    '翻牌堆', '出牌後翻開牌堆最上面一張。場上有同月的牌也能收走。', '點一下牌堆翻牌', '翻出櫻，和場上的櫻配對收走！',
    '牌的種類', '牌分「光」「種」「短冊」「渣」四類。光只有5張，能組成高分的役。', '從4張牌中選出「光」', '正確！桐與鳳凰是光牌。', '那不是光。找畫面最華麗的那張。',
    '組成役', '收到的牌湊齊就成「役」。例如赤短：松、梅、櫻三張寫字的紅短冊。', '從場上收走能湊成赤短的牌（手牌是櫻）', '赤短完成，5分！', '那樣湊不成赤短。找寫著字的紅短冊。',
    '決勝還是こいこい', '成役後選擇「決勝」拿分結束，或「こいこい」繼續。繼續後若對手先成役，對手得分加倍。', '你有5分，對手差1張就成豬鹿蝶。怎麼辦？', '沒錯！對手接近成役時，決勝保住得分最安全。', '危險：對手湊成豬鹿蝶的話，得分會加倍。',
    '決勝', 'こいこい', '手牌', '場', '你的收牌', '對手的收牌'],
  ko: ['일본(에도 시대부터)', '2명', '한 달 약 3분, 12개월 약 30분', '16세기 포르투갈 상인이 들여온 카드에서 출발해, 에도 시대에 열두 달의 꽃과 풀을 그린 하나후다가 생겼습니다. 1889년 창업한 닌텐도도 하나후다 제조로 시작했습니다.', '바닥의 같은 달 패를 맞춰 가져오고, 가져온 패로 "역"을 만듭니다. 열두 달 합계 점수가 높은 쪽이 승리.', '달마다 그 달의 꽃과 꽃구경·달구경 같은 계절 행사가 그려져 있습니다. 코이코이는 2인용 하나후다의 대표 놀이입니다.',
    '12개월×4장', '48장은 12개월로 나뉘고, 같은 꽃이 그려진 패는 같은 달입니다. 소나무는 1월, 벚꽃은 3월, 국화는 9월…', '손패의 "소나무"와 같은 달의 패를 바닥에서 고르세요', '정답! 둘 다 소나무, 1월 패입니다.', '다른 달의 패입니다. 꽃 그림을 비교해 보세요.',
    '맞춰서 가져오기', '손패에서 1장을 내고, 바닥에 같은 달 패가 있으면 2장 모두 가져옵니다. 없으면 그 패를 바닥에 둡니다.', '바닥의 패를 가져올 수 있는 손패를 내세요', '가져왔습니다! 같은 달 패 2장이 내 것이 됩니다.', '그 달의 패는 바닥에 없습니다. 바닥에 놓기만 하게 됩니다.',
    '더미 뒤집기', '손패를 낸 뒤 더미에서 1장을 뒤집습니다. 뒤집은 패도 바닥에 같은 달이 있으면 가져옵니다.', '더미를 눌러 뒤집으세요', '벚꽃이 나와서 바닥의 벚꽃과 맞춰 가져왔습니다!',
    '패의 종류', '패는 "광" "열끗" "띠" "피" 네 종류. 광은 5장뿐인 특별한 패로, 점수 높은 역이 됩니다.', '4장 중에서 "광"을 고르세요', '정답! 오동의 봉황은 광입니다.', '광이 아닙니다. 가장 화려한 그림을 찾아보세요.',
    '역 만들기', '가져온 패가 갖춰지면 "역"이 됩니다. 예: 홍단은 소나무·매화·벚꽃의 글씨가 있는 붉은 띠 3장.', '홍단을 완성하는 패를 바닥에서 가져오세요(손패는 벚꽃)', '홍단 완성, 5점!', '그걸로는 홍단이 되지 않습니다. 글씨가 있는 붉은 띠를 찾으세요.',
    '승부냐 코이코이냐', '역이 생기면 "승부"로 점수를 받고 끝낼지, "코이코이"로 계속할지 고릅니다. 계속한 뒤 상대가 역을 만들면 상대 점수가 2배.', '당신은 5점, 상대는 1장만 더 있으면 저록접(멧돼지·사슴·나비)입니다. 어떻게 할까요?', '맞습니다! 상대의 역이 가까울 때는 승부로 점수를 지키는 것이 안전합니다.', '위험합니다. 상대가 역을 완성하면 점수가 2배가 됩니다.',
    '승부', '코이코이', '손패', '바닥', '내가 가져온 패', '상대가 가져온 패'],
  es: ['Japón (desde el periodo Edo)', '2', 'Unos 3 min por mes; 30 min los 12', 'El hanafuda nace de los naipes que trajeron los portugueses en el siglo XVI; en el periodo Edo surgió la baraja de doce meses de flores. Nintendo, fundada en 1889, empezó fabricando hanafuda.', 'Empareja cartas del mismo mes para capturarlas y forma «yaku» con ellas. Gana quien sume más puntos en los meses.', 'Cada mes muestra su planta y fiestas como mirar los cerezos o la luna. Koi-Koi es el juego clásico de hanafuda para dos.',
    '12 meses × 4 cartas', 'Las 48 cartas forman 12 meses; las de la misma planta son del mismo mes. Pino es enero, cerezo marzo, crisantemo septiembre…', 'Elige la carta del campo del mismo mes que el pino de tu mano', '¡Bien! Ambas son de pino, de enero.', 'Esa es de otro mes. Compara las plantas.',
    'Emparejar y capturar', 'Juega una carta: si en el campo hay una del mismo mes, te llevas las dos. Si no, tu carta se queda en el campo.', 'Juega una carta que pueda capturar', '¡Capturadas! Las dos cartas de ese mes son tuyas.', 'No hay cartas de ese mes en el campo; solo la dejarías allí.',
    'Robar del mazo', 'Tras jugar, das la vuelta a la carta superior del mazo. Si el campo tiene una de su mes, también capturas.', 'Toca el mazo para girar una carta', '¡Un cerezo! Captura el cerezo del campo.',
    'Tipos de cartas', 'Hay Brillantes, Animales, Cintas y Paja. Solo cinco son Brillantes y forman los yaku de más puntos.', 'Elige la Brillante de las cuatro', '¡Bien! El fénix de la paulonia es Brillante.', 'Esa no es Brillante. Busca el dibujo más espléndido.',
    'Formar yaku', 'Los conjuntos capturados puntúan como «yaku». Cintas rojas con poema: las tres cintas rojas escritas de pino, ciruelo y cerezo.', 'Captura la carta que completa las Cintas rojas (tu mano: cerezo)', '¡Cintas rojas, 5 puntos!', 'Así no se completa. Busca la cinta roja con escritura.',
    '¿Parar o koi-koi?', 'Con un yaku eliges: «Parar» y cobrar, o «Koi-koi» y seguir. Si después el rival forma un yaku, sus puntos se duplican.', 'Tienes 5 puntos. Al rival le falta una carta para Jabalí-Ciervo-Mariposa. ¿Qué haces?', 'Exacto. Si el rival está cerca, parar y asegurar puntos es lo prudente.', 'Arriesgado: si lo completa, sus puntos se duplican.',
    'Parar', 'Koi-koi', 'Mano', 'Campo', 'Tus capturas', 'Capturas del rival'],
  fr: ['Japon (depuis l’époque d’Edo)', '2', 'Environ 3 min par mois ; 30 min pour 12', 'Le hanafuda dérive des cartes apportées par les Portugais au XVIe siècle ; l’époque d’Edo vit naître le jeu des douze mois de fleurs. Nintendo, fondé en 1889, a commencé en fabriquant des hanafuda.', 'Associez des cartes du même mois pour les capturer et formez des « yaku ». Le plus haut total sur les mois l’emporte.', 'Chaque mois montre sa plante et des fêtes comme la contemplation des cerisiers ou de la lune. Le Koi-Koi est le jeu classique à deux.',
    '12 mois × 4 cartes', 'Les 48 cartes forment 12 mois ; même plante, même mois. Le pin est janvier, le cerisier mars, le chrysanthème septembre…', 'Choisissez sur le terrain la carte du même mois que le pin de votre main', 'Bravo ! Ce sont deux pins, de janvier.', 'Cette carte est d’un autre mois. Comparez les plantes.',
    'Associer et capturer', 'Jouez une carte : si le terrain en a une du même mois, vous prenez les deux. Sinon, votre carte reste sur le terrain.', 'Jouez une carte qui peut capturer', 'Capturé ! Les deux cartes de ce mois sont à vous.', 'Aucune carte de ce mois sur le terrain : elle serait simplement posée.',
    'Piocher', 'Après avoir joué, retournez la carte du dessus de la pioche. Si le terrain a une carte de son mois, vous capturez aussi.', 'Touchez la pioche pour retourner une carte', 'Un cerisier ! Il capture le cerisier du terrain.',
    'Sortes de cartes', 'Il y a Lumières, Animaux, Rubans et Déchets. Seules cinq cartes sont des Lumières : elles font les yaku les plus forts.', 'Choisissez la Lumière parmi les quatre', 'Bravo ! Le phénix du paulownia est une Lumière.', 'Ce n’est pas une Lumière. Cherchez l’image la plus somptueuse.',
    'Former des yaku', 'Les ensembles capturés comptent comme « yaku ». Rubans rouges poèmes : les trois rubans rouges écrits du pin, du prunier et du cerisier.', 'Capturez la carte qui complète les Rubans rouges (votre main : cerisier)', 'Rubans rouges, 5 points !', 'Cela ne le complète pas. Cherchez le ruban rouge écrit.',
    'Arrêter ou koi-koi ?', 'Avec un yaku, choisissez : « Arrêter » et marquer, ou « Koi-koi » et continuer. Si l’adversaire forme ensuite un yaku, ses points sont doublés.', 'Vous avez 5 points. Il manque une carte à l’adversaire pour Sanglier-Cerf-Papillon. Que faites-vous ?', 'Exactement. Quand l’adversaire est proche, s’arrêter pour garder ses points est prudent.', 'Risqué : s’il complète son yaku, ses points sont doublés.',
    'Arrêter', 'Koi-koi', 'Main', 'Terrain', 'Vos captures', 'Captures adverses'],
  pt: ['Japão (desde o período Edo)', '2', 'Cerca de 3 min por mês; 30 min os 12', 'O hanafuda veio das cartas trazidas pelos portugueses no século XVI; no período Edo surgiu o baralho dos doze meses de flores. A Nintendo, fundada em 1889, começou fabricando hanafuda.', 'Combine cartas do mesmo mês para capturá-las e forme «yaku» com elas. Vence o maior total nos meses.', 'Cada mês mostra sua planta e festas como ver as cerejeiras ou a lua. Koi-Koi é o jogo clássico de hanafuda para dois.',
    '12 meses × 4 cartas', 'As 48 cartas formam 12 meses; mesma planta, mesmo mês. Pinheiro é janeiro, cerejeira março, crisântemo setembro…', 'Escolha no campo a carta do mesmo mês que o pinheiro da sua mão', 'Certo! As duas são de pinheiro, de janeiro.', 'Essa é de outro mês. Compare as plantas.',
    'Combinar e capturar', 'Jogue uma carta: se o campo tiver uma do mesmo mês, você leva as duas. Se não, sua carta fica no campo.', 'Jogue uma carta que possa capturar', 'Capturado! As duas cartas desse mês são suas.', 'Não há carta desse mês no campo; ela só seria deixada lá.',
    'Virar o monte', 'Depois de jogar, vire a carta de cima do monte. Se o campo tiver uma do mesmo mês, você captura também.', 'Toque no monte para virar uma carta', 'Uma cerejeira! Ela captura a cerejeira do campo.',
    'Tipos de cartas', 'Há Brilhantes, Animais, Fitas e Palha. Só cinco são Brilhantes e formam os yaku de mais pontos.', 'Escolha a Brilhante entre as quatro', 'Certo! A fênix da paulównia é Brilhante.', 'Essa não é Brilhante. Procure o desenho mais esplêndido.',
    'Formar yaku', 'Conjuntos capturados pontuam como «yaku». Fitas vermelhas com poema: as três fitas vermelhas escritas de pinheiro, ameixeira e cerejeira.', 'Capture a carta que completa as Fitas vermelhas (sua mão: cerejeira)', 'Fitas vermelhas, 5 pontos!', 'Assim não completa. Procure a fita vermelha com escrita.',
    'Parar ou koi-koi?', 'Com um yaku você escolhe: «Parar» e pontuar, ou «Koi-koi» e seguir. Se depois o rival formar um yaku, os pontos dele dobram.', 'Você tem 5 pontos. Falta uma carta ao rival para Javali-Cervo-Borboleta. O que fazer?', 'Isso. Com o rival perto, parar e garantir os pontos é o seguro.', 'Arriscado: se ele completar, os pontos dele dobram.',
    'Parar', 'Koi-koi', 'Mão', 'Campo', 'Suas capturas', 'Capturas do rival'],
  de: ['Japan (seit der Edo-Zeit)', '2', 'Etwa 3 Min. pro Monat, 30 Min. für 12', 'Hanafuda geht auf Spielkarten zurück, die Portugiesen im 16. Jh. brachten; in der Edo-Zeit entstand das Blatt der zwölf Blumenmonate. Nintendo, gegründet 1889, begann als Hanafuda-Hersteller.', 'Kombiniere Karten desselben Monats, um sie zu nehmen, und bilde daraus „Yaku“. Die höhere Gesamtpunktzahl gewinnt.', 'Jeder Monat zeigt seine Pflanze und Bräuche wie Kirschblüten- und Mondschau. Koi-Koi ist das klassische Hanafuda-Spiel zu zweit.',
    '12 Monate × 4 Karten', 'Die 48 Karten bilden 12 Monate; gleiche Pflanze heißt gleicher Monat. Kiefer ist Januar, Kirsche März, Chrysantheme September…', 'Wähle auf dem Feld die Karte desselben Monats wie die Kiefer auf deiner Hand', 'Richtig! Beide sind Kiefer, Januar.', 'Das ist ein anderer Monat. Vergleiche die Pflanzen.',
    'Kombinieren und nehmen', 'Spiele eine Karte: Liegt eine desselben Monats auf dem Feld, nimmst du beide. Sonst bleibt deine Karte liegen.', 'Spiele eine Karte, die etwas nehmen kann', 'Genommen! Beide Karten des Monats gehören dir.', 'Von diesem Monat liegt nichts auf dem Feld; sie würde nur abgelegt.',
    'Vom Stapel ziehen', 'Nach dem Ausspielen deckst du die oberste Stapelkarte auf. Passt ein Monat auf dem Feld, nimmst du auch diese.', 'Tippe auf den Stapel', 'Eine Kirsche! Sie nimmt die Kirsche vom Feld.',
    'Kartenarten', 'Es gibt Lichter, Tiere, Bänder und Spreu. Nur fünf Karten sind Lichter; sie bilden die wertvollsten Yaku.', 'Wähle das Licht unter den vier Karten', 'Richtig! Der Phönix der Paulownie ist ein Licht.', 'Das ist kein Licht. Suche das prächtigste Bild.',
    'Yaku bilden', 'Gesammelte Sätze zählen als „Yaku“. Rote Gedichtbänder: die drei beschrifteten roten Bänder von Kiefer, Pflaume und Kirsche.', 'Nimm die Karte, die die roten Bänder vollendet (Hand: Kirsche)', 'Rote Gedichtbänder, 5 Punkte!', 'So nicht vollständig. Suche das beschriftete rote Band.',
    'Aufhören oder Koi-koi?', 'Mit einem Yaku wählst du: „Aufhören“ und punkten oder „Koi-koi“ und weiterspielen. Bildet der Gegner danach ein Yaku, verdoppeln sich seine Punkte.', 'Du hast 5 Punkte. Dem Gegner fehlt eine Karte für Eber-Hirsch-Schmetterling. Was tust du?', 'Genau. Ist der Gegner nah dran, sichert Aufhören deine Punkte.', 'Riskant: vollendet er sein Yaku, verdoppeln sich seine Punkte.',
    'Aufhören', 'Koi-koi', 'Hand', 'Feld', 'Deine Stiche', 'Stiche des Gegners'],
  ru: ['Япония (с эпохи Эдо)', '2', 'Около 3 мин на месяц, 30 мин на 12', 'Ханафуда выросла из игральных карт, привезённых португальцами в XVI веке; в эпоху Эдо появилась колода двенадцати месяцев цветов. Nintendo, основанная в 1889 году, начинала с изготовления ханафуда.', 'Собирайте карты одного месяца и составляйте из взятых карт «яку». Побеждает больший итог за месяцы.', 'Каждый месяц показывает своё растение и обычаи сезона, например любование сакурой и луной. Кои-кои — классическая игра в ханафуда на двоих.',
    '12 месяцев × 4 карты', '48 карт делятся на 12 месяцев; одинаковое растение — один месяц. Сосна — январь, сакура — март, хризантема — сентябрь…', 'Выберите на поле карту того же месяца, что и сосна в руке', 'Верно! Обе — сосна, январь.', 'Это другой месяц. Сравните растения.',
    'Совпадение и взятие', 'Сыграйте карту: если на поле есть карта того же месяца, берёте обе. Если нет — карта остаётся на поле.', 'Сыграйте карту, которая может взять', 'Взято! Обе карты месяца ваши.', 'Карт этого месяца на поле нет — её просто положат.',
    'Карта из колоды', 'После хода откройте верхнюю карту колоды. Если на поле есть её месяц, вы берёте и её.', 'Нажмите на колоду', 'Сакура! Она берёт сакуру с поля.',
    'Виды карт', 'Есть Светила, Животные, Ленты и Мусор. Светил всего пять; они дают самые дорогие яку.', 'Выберите Светило среди четырёх', 'Верно! Феникс павловнии — Светило.', 'Это не Светило. Ищите самую пышную картинку.',
    'Яку', 'Собранные наборы приносят «яку». Красные ленты со стихами: три красные ленты с надписью — сосна, слива и сакура.', 'Возьмите карту, завершающую красные ленты (в руке сакура)', 'Красные ленты, 5 очков!', 'Так не завершить. Ищите красную ленту с надписью.',
    'Стоп или кои-кои?', 'С яку выбирайте: «Стоп» и очки или «Кои-кои» и продолжить. Если затем соперник соберёт яку, его очки удвоятся.', 'У вас 5 очков. Сопернику не хватает одной карты до «Кабан-олень-бабочка». Что делать?', 'Именно. Когда соперник близок, лучше остановиться и сохранить очки.', 'Рискованно: если он соберёт яку, его очки удвоятся.',
    'Стоп', 'Кои-кои', 'Рука', 'Поле', 'Ваши взятки', 'Взятки соперника'],
  tr: ['Japonya (Edo döneminden)', '2', 'Ay başına ~3 dk, 12 ay ~30 dk', 'Hanafuda, 16. yüzyılda Portekizlilerin getirdiği oyun kartlarından doğdu; Edo döneminde on iki ayın çiçeklerini gösteren deste ortaya çıktı. 1889’da kurulan Nintendo da hanafuda üreterek başladı.', 'Aynı aydan kartları eşleyip al, aldığın kartlarla “yaku” yap. Aylar sonunda toplamı yüksek olan kazanır.', 'Her ay kendi bitkisini ve kiraz çiçeği, ay seyri gibi mevsim geleneklerini gösterir. Koi-Koi iki kişilik klasik hanafuda oyunudur.',
    '12 ay × 4 kart', '48 kart 12 aya ayrılır; aynı bitki aynı ay demektir. Çam ocak, kiraz mart, krizantem eylül…', 'Elindeki çamla aynı aydan olan kartı alandan seç', 'Doğru! İkisi de çam, ocak kartı.', 'O başka bir ay. Bitkileri karşılaştır.',
    'Eşle ve al', 'Elinden bir kart oyna: alanda aynı aydan kart varsa ikisini de alırsın. Yoksa kartın alanda kalır.', 'Bir şey alabilecek kartı oyna', 'Aldın! O ayın iki kartı senin.', 'Alanda o aydan kart yok; sadece bırakılır.',
    'Desteden çek', 'Oynadıktan sonra destenin üstündeki kartı aç. Alanda aynı ay varsa onu da alırsın.', 'Desteye dokun', 'Kiraz çıktı! Alandaki kirazı alıyor.',
    'Kart türleri', 'Işık, Hayvan, Şerit ve Saman türleri var. Sadece beş kart Işık; en değerli yakuları yaparlar.', 'Dört kart arasından Işık’ı seç', 'Doğru! Pavlonya’nın ankası bir Işık.', 'O Işık değil. En gösterişli resmi ara.',
    'Yaku yap', 'Topladığın setler “yaku” olur. Kırmızı şiir şeritleri: çam, erik ve kirazın yazılı üç kırmızı şeridi.', 'Kırmızı şeritleri tamamlayan kartı al (elinde kiraz)', 'Kırmızı şeritler, 5 puan!', 'Böyle tamamlanmaz. Yazılı kırmızı şeridi ara.',
    'Dur mu, koi-koi mi?', 'Yaku yapınca seç: “Dur” ve puanı al, ya da “Koi-koi” de ve devam et. Sonra rakip yaku yaparsa puanı ikiye katlanır.', '5 puanın var. Rakibin Domuz-Geyik-Kelebek için bir kartı eksik. Ne yaparsın?', 'Aynen. Rakip yakınsa durup puanı korumak güvenlidir.', 'Riskli: tamamlarsa puanı ikiye katlanır.',
    'Dur', 'Koi-koi', 'El', 'Alan', 'Aldıkların', 'Rakibin aldıkları'],
  id: ['Jepang (sejak zaman Edo)', '2', 'Sekitar 3 menit per bulan; 30 menit untuk 12', 'Hanafuda berasal dari kartu yang dibawa orang Portugis pada abad ke-16; pada zaman Edo lahirlah dek dua belas bulan bunga. Nintendo, didirikan 1889, bermula sebagai pembuat hanafuda.', 'Pasangkan kartu dari bulan yang sama untuk mengambilnya, lalu susun “yaku”. Total poin tertinggi setelah beberapa bulan menang.', 'Setiap bulan menampilkan tanamannya dan tradisi musiman seperti melihat sakura dan bulan. Koi-Koi adalah permainan hanafuda klasik untuk dua orang.',
    '12 bulan × 4 kartu', '48 kartu terbagi 12 bulan; tanaman sama berarti bulan sama. Pinus Januari, sakura Maret, krisan September…', 'Pilih kartu di meja yang sebulan dengan pinus di tanganmu', 'Benar! Keduanya pinus, kartu Januari.', 'Itu bulan lain. Bandingkan tanamannya.',
    'Pasangkan dan ambil', 'Mainkan satu kartu: jika di meja ada kartu sebulan, ambil keduanya. Jika tidak, kartumu tetap di meja.', 'Mainkan kartu yang bisa mengambil', 'Berhasil! Dua kartu bulan itu milikmu.', 'Tidak ada kartu bulan itu di meja; kartumu hanya diletakkan.',
    'Buka tumpukan', 'Setelah bermain, buka kartu teratas tumpukan. Jika ada kartu sebulan di meja, ambil juga.', 'Ketuk tumpukan', 'Sakura! Ia mengambil sakura di meja.',
    'Jenis kartu', 'Ada Cahaya, Hewan, Pita, dan Ampas. Hanya lima kartu Cahaya; mereka membentuk yaku bernilai tinggi.', 'Pilih kartu Cahaya di antara empat', 'Benar! Burung foniks paulownia adalah Cahaya.', 'Itu bukan Cahaya. Cari gambar yang paling megah.',
    'Membuat yaku', 'Kumpulan kartu yang diambil menjadi “yaku”. Pita merah puisi: tiga pita merah bertulisan dari pinus, plum, dan sakura.', 'Ambil kartu yang melengkapi Pita merah (di tanganmu: sakura)', 'Pita merah, 5 poin!', 'Itu tidak melengkapi. Cari pita merah bertulisan.',
    'Berhenti atau koi-koi?', 'Dengan yaku kamu memilih: “Berhenti” dan ambil poin, atau “Koi-koi” dan lanjut. Jika lawan lalu membuat yaku, poinnya berlipat dua.', 'Kamu punya 5 poin. Lawan kurang satu kartu untuk Babi-Rusa-Kupu. Apa yang kamu lakukan?', 'Tepat. Saat lawan sudah dekat, berhenti untuk mengamankan poin itu aman.', 'Berisiko: jika ia melengkapinya, poinnya berlipat dua.',
    'Berhenti', 'Koi-koi', 'Tangan', 'Meja', 'Ambilanmu', 'Ambilan lawan'],
  hi: ['जापान (एदो काल से)', '2', 'हर महीना ~3 मिनट; 12 महीने ~30 मिनट', 'हानाफ़ुदा 16वीं सदी में पुर्तगालियों द्वारा लाए ताशों से निकला; एदो काल में बारह महीनों के फूलों वाली गड्डी बनी। 1889 में स्थापित निन्टेंडो ने भी हानाफ़ुदा बनाने से शुरुआत की।', 'एक ही महीने के पत्ते मिलाकर उठाइए और उनसे “याकु” बनाइए। महीनों के अंत में ज़्यादा अंक वाला जीतता है।', 'हर महीने में उसका पौधा और चेरी-फूल या चाँद देखने जैसी ऋतु परंपराएँ दिखती हैं। कोई-कोई दो लोगों का प्रसिद्ध हानाफ़ुदा खेल है।',
    '12 महीने × 4 पत्ते', '48 पत्ते 12 महीनों में बँटे हैं; एक जैसा पौधा यानी एक ही महीना। चीड़ जनवरी, चेरी मार्च, गुलदाउदी सितंबर…', 'हाथ के चीड़ वाले महीने का पत्ता मेज़ से चुनिए', 'सही! दोनों चीड़ हैं, जनवरी के पत्ते।', 'वह दूसरे महीने का है। पौधों की तुलना करें।',
    'मिलाकर उठाना', 'हाथ से एक पत्ता खेलें: मेज़ पर उसी महीने का पत्ता हो तो दोनों उठा लें। न हो तो आपका पत्ता मेज़ पर रहता है।', 'ऐसा पत्ता खेलें जो कुछ उठा सके', 'उठा लिया! उस महीने के दोनों पत्ते आपके।', 'मेज़ पर उस महीने का पत्ता नहीं है; वह बस रख दिया जाएगा।',
    'गड्डी से पलटना', 'खेलने के बाद गड्डी का ऊपरी पत्ता पलटें। मेज़ पर उसका महीना हो तो उसे भी उठाएँ।', 'गड्डी पर टैप करें', 'चेरी निकली! वह मेज़ की चेरी उठा लेती है।',
    'पत्तों के प्रकार', 'प्रकाश, पशु, पट्टी और भूसा — चार प्रकार। प्रकाश केवल पाँच हैं और सबसे ऊँचे याकु बनाते हैं।', 'चार में से प्रकाश वाला पत्ता चुनें', 'सही! पाउलोनिया का फ़ीनिक्स प्रकाश है।', 'वह प्रकाश नहीं है। सबसे भव्य चित्र खोजें।',
    'याकु बनाना', 'उठाए पत्तों के सेट “याकु” बनते हैं। लाल कविता-पट्टियाँ: चीड़, आलूबुखारा और चेरी की लिखी हुई तीन लाल पट्टियाँ।', 'लाल पट्टियाँ पूरी करने वाला पत्ता उठाएँ (हाथ में चेरी)', 'लाल पट्टियाँ, 5 अंक!', 'इससे पूरा नहीं होगा। लिखी हुई लाल पट्टी खोजें।',
    'रुकें या कोई-कोई?', 'याकु बनने पर चुनें: “रुकें” और अंक लें, या “कोई-कोई” कहकर आगे खेलें। फिर विरोधी याकु बना ले तो उसके अंक दोगुने।', 'आपके 5 अंक हैं। विरोधी को सूअर-हिरन-तितली के लिए एक पत्ता चाहिए। क्या करेंगे?', 'बिल्कुल। विरोधी पास हो तो रुककर अंक बचाना सुरक्षित है।', 'जोखिम भरा: वह पूरा कर ले तो उसके अंक दोगुने।',
    'रुकें', 'कोई-कोई', 'हाथ', 'मेज़', 'आपके उठाए', 'विरोधी के उठाए'],
  ar: ['اليابان (منذ عصر إيدو)', '2', 'نحو 3 دقائق للشهر و30 دقيقة لـ12 شهرًا', 'نشأت الهانافودا من أوراق اللعب التي جلبها البرتغاليون في القرن السادس عشر، وفي عصر إيدو ظهرت مجموعة الأشهر الاثني عشر من الأزهار. وبدأت نينتندو التي تأسست عام 1889 بصنع الهانافودا.', 'طابِق أوراق الشهر نفسه لتأخذها، وكوّن منها «ياكو». يفوز صاحب المجموع الأعلى بعد الأشهر.', 'يصوّر كل شهر نبتته وعادات موسمية مثل مشاهدة الكرز والقمر. كوي-كوي هي لعبة الهانافودا الكلاسيكية لشخصين.',
    '12 شهرًا × 4 أوراق', 'تنقسم الأوراق الـ48 إلى 12 شهرًا؛ النبتة نفسها تعني الشهر نفسه. الصنوبر يناير والكرز مارس والأقحوان سبتمبر…', 'اختر من الطاولة ورقة الشهر نفسه للصنوبر في يدك', 'صحيح! كلتاهما صنوبر، ورقتا يناير.', 'هذه من شهر آخر. قارن النباتات.',
    'المطابقة والأخذ', 'العب ورقة: إن كان على الطاولة ورقة من شهرها تأخذ الاثنتين، وإلا تبقى ورقتك على الطاولة.', 'العب ورقة تستطيع الأخذ', 'أخذتها! ورقتا ذلك الشهر لك.', 'لا ورقة من ذلك الشهر على الطاولة؛ ستوضع فقط.',
    'السحب من الكومة', 'بعد اللعب اقلب الورقة العليا من الكومة. إن طابقت شهرًا على الطاولة تأخذها أيضًا.', 'انقر على الكومة', 'كرز! يأخذ الكرز من الطاولة.',
    'أنواع الأوراق', 'هناك أنوار وحيوانات وأشرطة وقش. خمس أوراق فقط أنوار، وتصنع أعلى الياكو.', 'اختر ورقة النور من بين الأربع', 'صحيح! عنقاء البولونيا ورقة نور.', 'ليست نورًا. ابحث عن أفخم صورة.',
    'تكوين الياكو', 'تُحسب المجموعات المأخوذة «ياكو». الأشرطة الحمراء الشعرية: ثلاثة أشرطة حمراء مكتوبة للصنوبر والبرقوق والكرز.', 'خذ الورقة التي تكمل الأشرطة الحمراء (في يدك كرز)', 'الأشرطة الحمراء، 5 نقاط!', 'هذا لا يكملها. ابحث عن الشريط الأحمر المكتوب.',
    'توقّف أم كوي-كوي؟', 'عند تكوين ياكو تختار: «توقّف» وتأخذ النقاط، أو «كوي-كوي» وتواصل. إن كوّن الخصم بعدها ياكو تتضاعف نقاطه.', 'لديك 5 نقاط، وينقص الخصم ورقة واحدة لـ«الخنزير-الغزال-الفراشة». ماذا تفعل؟', 'بالضبط. حين يقترب الخصم، التوقف لحفظ نقاطك هو الأسلم.', 'مخاطرة: إن أكملها تتضاعف نقاطه.',
    'توقّف', 'كوي-كوي', 'اليد', 'الطاولة', 'ما أخذته', 'ما أخذه الخصم'],
};
const KEYS = ['origin', 'players', 'time', 'hist', 'win', 'cult', 'months.t', 'months.b', 'months.task', 'months.ok', 'months.ng', 'match.t', 'match.b', 'match.task', 'match.ok', 'match.ng', 'draw.t', 'draw.b', 'draw.task', 'draw.ok', 'kinds.t', 'kinds.b', 'kinds.task', 'kinds.ok', 'kinds.ng', 'yaku.t', 'yaku.b', 'yaku.task', 'yaku.ok', 'yaku.ng', 'koi.t', 'koi.b', 'koi.task', 'koi.ok', 'koi.ng', 'stop', 'go', 'you', 'field', 'caps', 'opp'];
for (const L in OTHER) { R[L] = {}; KEYS.forEach((k, i) => { R[L][k] = OTHER[L][i]; }); }
const r = k => { const L = A.LANG(); return (R[L] && R[L][k]) || R.en[k] || k; };
const E = s => A.esc(s);

function row(label, ids, cls) {
  return `<div class="rt-row"><b>${E(label)}</b><div class="rt-cards">${ids.map(id => `<div class="hf ${cls || ''}" data-id="${id}">${C.face(id)}</div>`).join('')}</div></div>`;
}
function board(api, html) {
  const b = api.board;
  b.innerHTML = `<div class="rt-hf">${html}</div>`;
  const w = b.clientWidth || 400, h = b.clientHeight || 300;
  const rows = b.querySelectorAll('.rt-row').length || 1;
  const maxPer = Math.max(...[...b.querySelectorAll('.rt-cards')].map(x => x.children.length), 1);
  const lab = Math.min(90, w * 0.2);
  const cw = Math.max(30, Math.min((w - lab - 24 - maxPer * 8) / maxPer, (h - rows * 14 - 10) / rows / 1.66, 110));
  b.style.setProperty('--rcw', cw + 'px');
}
const PAGES = [
  { id: 'months', setup(api) {
    board(api, row(r('field'), [21, 2, 33, 29]) + row(r('you'), [3]));
    api.board.onclick = e => { const c = e.target.closest('.rt-row:first-child .hf'); if (!c) return; if (HF.month(+c.dataset.id) === 0) { c.classList.add('ok'); api.ok(E(r('months.ok'))); } else api.ng(E(r('months.ng'))); };
  } },
  { id: 'match', setup(api) {
    board(api, row(r('field'), [12, 25, 38, 6]) + row(r('you'), [44, 15, 30]));
    api.board.onclick = e => { const c = e.target.closest('.rt-row:last-child .hf'); if (!c) return; if (+c.dataset.id === 15) { c.classList.add('ok'); [...api.board.querySelectorAll('.hf')].filter(x => +x.dataset.id === 12).forEach(x => x.classList.add('ok')); api.ok(E(r('match.ok'))); } else api.ng(E(r('match.ng'))); };
  } },
  { id: 'draw', setup(api) {
    board(api, row(r('field'), [10, 22, 31]) + `<div class="rt-row"><b></b><div class="rt-cards"><div class="hf back rt-deck"></div></div></div>`);
    api.board.onclick = e => { const d = e.target.closest('.rt-deck'); if (!d || d.dataset.done) return; d.dataset.done = 1; d.classList.remove('back'); d.innerHTML = C.face(9); d.classList.add('ok'); [...api.board.querySelectorAll('.hf')].filter(x => +x.dataset.id === 10).forEach(x => x.classList.add('ok')); api.ok(E(r('draw.ok'))); };
  } },
  { id: 'kinds', setup(api) {
    board(api, row('', [45, 41, 26, 44]));
    api.board.onclick = e => { const c = e.target.closest('.hf'); if (!c) return; if (+c.dataset.id === 44) { c.classList.add('ok'); api.ok(E(r('kinds.ok'))); } else api.ng(E(r('kinds.ng'))); };
  } },
  { id: 'yaku', setup(api) {
    board(api, row(r('caps'), [1, 5]) + row(r('field'), [10, 9, 37, 13]) + row(r('you'), [11]));
    api.board.onclick = e => { const c = e.target.closest('.rt-row:nth-child(2) .hf'); if (!c) return; if (+c.dataset.id === 9) { c.classList.add('ok'); api.ok(E(r('yaku.ok'))); } else api.ng(E(r('yaku.ng'))); };
  } },
  { id: 'koi', setup(api) {
    board(api, row(r('opp'), [24, 36]) + row(r('caps'), [1, 5, 9]) + `<div class="rt-btns"><button type="button" class="mbtn" data-a="go">${E(r('go'))}</button><button type="button" class="mbtn go" data-a="stop">${E(r('stop'))}</button></div>`);
    api.board.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'stop') api.ok(E(r('koi.ok'))); else api.ng(E(r('koi.ng'))); };
  } },
];
let tour = null;
function build() {
  const pages = [{ id: 'intro', title: () => E(A.t('title')) + ` <small>${E(A.t('sub'))}</small>`, body: () => '', html: () => RuleTour.intro({ img: C.artSrc(44), origin: E(r('origin')), players: E(r('players')), time: E(r('time')), history: E(r('hist')), win: E(r('win')), culture: E(r('cult')), lang: A.LANG() }) }];
  PAGES.forEach(P => pages.push({ id: P.id, title: () => E(r(P.id + '.t')), body: () => E(r(P.id + '.b')), task: () => E(r(P.id + '.task')), setup: P.setup }));
  tour = RuleTour.create({ mount: '#rulesBody', store: 'aicoding-hanafuda-rules', lang: () => A.LANG(), aspect: 1.25, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'), play: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.HFLessons && HFLessons.open(); }, pages });
}
window.HFRules = {
  open() { A.openOv('#rulesOverlay'); if (!tour) build(); tour.open(0); },
  relang() { if (tour && tour.visible && tour.visible()) tour.render(); },
};
})();
