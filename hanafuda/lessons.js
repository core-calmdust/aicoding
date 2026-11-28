/* 花札（こいこい）— lessons: 札と月 / 役 / こいこいの判断.
   Each category: a warm-up (準備: the idea shown on real cards, not scored) and three scored problems, easy to harder.
   Answers are checked by tools/lesson-verify.js (unique best by the engine; koi-koi answers by the AI's read, ≥1 point).
   Explanations give the facts on the table (which card makes which yaku, what the opponent needs), never "the AI says". */
(function () {
'use strict';
const A = window.HFApp, HF = window.HF, C = window.HFCards;
const STORE = 'aicoding-hanafuda-lessons';
// rows: [label key, card ids]; kind: month | most | points | pick | koi
const CATS = [
  { id: 'months', prep: { id: 'p1', rows: [['cards', [32, 33, 34, 35]], ['cards', [36, 37, 38, 39]]] }, items: [
    { id: 'm1', kind: 'month', rows: [['hand', [17]], ['field', [12, 16, 24, 36]]], tapRow: 1, ans: 16 },
    { id: 'm2', kind: 'most', rows: [['field', [8, 9, 10, 2]], ['hand', [3, 11, 45]]], tapRow: 1, ans: 11 },
    { id: 'm3', kind: 'pick', played: 26, rows: [['played', [26]], ['field', [24, 27, 5, 33]]], tapRow: 1, ans: 24, only: [24, 27] },
  ] },
  { id: 'yaku', prep: { id: 'p2', rows: [['cards', [1, 5, 9]]] }, items: [
    { id: 'y1', kind: 'points', rows: [['caps', [0, 8, 28]], ['field', [40, 44, 13, 25]], ['hand', [43, 45, 2]]], tapRow: 2, ans: 45 },
    { id: 'y2', kind: 'points', rows: [['caps', [28]], ['field', [32, 29, 20, 6]], ['hand', [34, 30, 22]]], tapRow: 2, ans: 34 },
    { id: 'y3', kind: 'pick', played: 22, rows: [['caps', [24, 36]], ['played', [22]], ['field', [20, 21, 9, 45]]], tapRow: 2, ans: 20, only: [20, 21] },
  ] },
  { id: 'koi', prep: { id: 'p3', rows: [['cards', [8, 32, 28]]] }, items: [
    { id: 'k1', kind: 'koi', rows: [['caps', [1, 5, 9, 0, 3]], ['opp', [24, 36, 7, 11]], ['field', [20, 21, 37, 41]], ['hand', [13, 17, 25, 29, 33]]], oppHand: [14, 18, 22, 26, 30], ans: 'stop' },
    { id: 'k2', kind: 'koi', rows: [['caps', [4, 12, 16, 20, 29, 1, 5]], ['opp', [2, 3, 6]], ['field', [9, 33, 37, 40]], ['hand', [8, 13, 17, 21, 25, 28]]], oppHand: [14, 18, 22, 26, 30, 34], ans: 'koi' },
    { id: 'k3', kind: 'koi', rows: [['caps', [0, 8, 28, 40]], ['opp', [12, 16, 24, 36]], ['field', [20, 21, 33, 45]], ['hand', [13, 17, 25, 37]]], oppHand: [14, 18, 26, 30], ans: 'stop' },
  ] },
];
const PROBLEMS = CATS.flatMap(c => c.items);
// the koi-koi decision as a game state (the player to move is seat 0, phase 'koi')
function koiState(it) {
  const R = Object.fromEntries(it.rows);
  const used = new Set([...R.caps, ...R.opp, ...R.field, ...R.hand, ...it.oppHand]);
  const deck = [...Array(48).keys()].filter(i => !used.has(i));
  return { o: HF.opts({}), oya: 0, turn: 0, deck, hands: [R.hand.slice(), it.oppHand.slice()], field: R.field.slice(), caps: [R.caps.slice(), R.opp.slice()], phase: 'koi',
    koi: [0, 0], lastPts: [0, 0], pending: null, drawn: null, log: [], result: null, turns: 8, seen: [] };
}

const KEYS = ['h', 'lead', 'back', 'quit', 'next', 'ok', 'ng', 'done', 'todo', 'prep', 'got', 'stop', 'go', 'field', 'hand', 'caps', 'opp', 'played', 'cards',
  'c.months', 'c.months.d', 'c.yaku', 'c.yaku.d', 'c.koi', 'c.koi.d',
  'p1.t', 'p1.b', 'p2.t', 'p2.b', 'p3.t', 'p3.b',
  'm1.t', 'm1.q', 'm1.ok', 'm1.ng', 'm2.t', 'm2.q', 'm2.ok', 'm2.ng', 'm3.t', 'm3.q', 'm3.ok', 'm3.ng',
  'y1.t', 'y1.q', 'y1.ok', 'y1.ng', 'y2.t', 'y2.q', 'y2.ok', 'y2.ng', 'y3.t', 'y3.q', 'y3.ok', 'y3.ng',
  'k1.t', 'k1.q', 'k1.ok', 'k1.ng', 'k2.t', 'k2.q', 'k2.ok', 'k2.ng', 'k3.t', 'k3.q', 'k3.ok', 'k3.ng'];
const V = {
ja: ['レッスン', '札の見分け方から、役の作り方、こいこいの判断まで。実際の札で考えます。', '一覧へ戻る', 'レッスンをやめる', '次の問題', '正解！', 'ちがいます', '合格', '未挑戦', '準備', 'わかった', '勝負', 'こいこい', '場', '手札', 'あなたの取り札', '相手の取り札', '出した札', '札',
  '札と月', '同じ月の札を見分け、取れる札を見つける。', '役', 'どの札を取れば役になり、何点になるか。', 'こいこいの判断', '勝負するか、こいこいで続けるか。',
  '同じ草花は同じ月', '上は菊（9月）、下は紅葉（10月）の4枚ずつです。花の形と色を見れば、どの月か分かります。',
  '役は取り札の組み合わせ', '文字入りの赤い短冊3枚（松・梅・桜）がそろうと「赤短」で5点。役は取った札の組み合わせで決まります。',
  '勝負とこいこい', '桜に幕・菊に盃・芒に月。役ができたら「勝負」でその点を確定するか、「こいこい」で続けるかを選びます。続けたあと相手に役を作られると、相手の点が2倍です。',
  '菖蒲と藤', '手札は菖蒲の短冊（5月）。同じ月の札を場から選んでください。', '菖蒲に八橋は5月。上に咲く紫の花と、剣のような葉、橋が目印です。', 'それは別の月の札です。藤（4月）は花房が垂れ下がり、菖蒲は花が上に咲きます。',
  '場に3枚ある月', '場に桜が3枚あります。いちばん多く札を取れる手札はどれ？', '場に同じ月が3枚あるとき、4枚目を出すと3枚まとめて取れます。桜に幕（光）も手に入ります。', '松のカスで取れるのは松1枚、桐のカスは場に桐がなく取れません。桜のカスなら桜3枚を一度に取れます。',
  'どちらを取る？', '萩のカスを出しました。場に萩が2枚あります。どちらを取りますか？', '萩に猪はタネで、猪鹿蝶の1枚です。カスより役につながる札を取りましょう。', '萩のカスはカス1枚分。萩に猪なら猪鹿蝶（5点）に向けた1枚になり、相手にも渡りません。',
  '四光と雨四光', '光を3枚（鶴・幕・月）持っています。点がいちばん高くなる手札は？', '桐のカスで鳳凰を取ると四光で8点。柳のカスで小野道風を取ると雨四光の7点です。', '柳の光を入れた4枚は雨四光で7点、松のカスは場に松がなく取れません。鳳凰なら四光で8点です。',
  '月見で一杯', '芒に月を取っています。すぐに役ができる手札はどれ？', '菊のカスで菊に盃を取ると、芒に月とそろって「月見で一杯」5点です。', '芒に雁や牡丹に蝶を取っても役にはなりません。菊に盃を取れば月見で一杯です。',
  '猪鹿蝶の最後の1枚', '猪と鹿を持っています。牡丹のカスを出すと、場の牡丹は2枚。どちらを取る？', '牡丹に蝶で猪鹿蝶の完成、5点です。', '牡丹の青短は短冊1枚だけ。蝶を取れば猪・鹿とそろって猪鹿蝶の5点です。',
  '相手が迫っているとき', 'あなたは赤短で5点。相手は猪と鹿を取っていて、場に牡丹に蝶があります。', '相手は牡丹の札で蝶を取れば猪鹿蝶。こいこいのあとで作られると相手の点が2倍です。ここは勝負で5点を確保します。', 'こいこいのあと相手が蝶を取れば猪鹿蝶。相手の点が2倍になり、あなたの赤短は0点です。',
  'まだ1点のとき', 'タネ5枚で1点。相手の取り札はカス3枚だけで、手札はまだ6枚あります。', 'いま止めても1点。場に桜の短冊があり、手札の桜に幕で取れば赤短で5点です。相手は役から遠く、続ける価値があります。', '1点で止めるのは早すぎます。手札の桜に幕で場の桜の短冊を取れば赤短（5点）になり、相手はまだ役から遠い状態です。',
  '7点に届いたら', '雨四光で7点。相手は猪と鹿を持ち、場に牡丹に蝶があります。', '7点以上は2倍なので、いま勝負すれば14点です。相手は蝶を取れば猪鹿蝶なので、続けるのは危険です。', 'こいこいのあと相手が蝶を取れば猪鹿蝶で相手の点が2倍。いま勝負すれば確実に14点です。'],
en: ['Lessons', 'From telling the cards apart to building yaku and deciding koi-koi — on real cards.', 'Back to the list', 'Quit the lesson', 'Next', 'Correct!', 'Not that one', 'Passed', 'Not tried', 'Warm-up', 'Got it', 'Stop', 'Koi-koi', 'Field', 'Hand', 'Your captures', 'Opponent’s captures', 'Card played', 'Cards',
  'Cards & months', 'Spot cards of the same month and what you can capture.', 'Yaku', 'Which card makes a yaku, and how many points.', 'Koi-koi decisions', 'Stop, or call koi-koi and play on?',
  'Same plant, same month', 'Top: the four chrysanthemum cards (September). Bottom: the four maple cards (October). The flower’s shape and colour tell you the month.',
  'Yaku are sets of captures', 'The three red ribbons with writing (pine, plum, cherry) make Red Poetry Ribbons, 5 points. A yaku is a set of the cards you captured.',
  'Stop or koi-koi', 'Cherry curtain, sake cup, moon. With a yaku you choose: “Stop” to bank the points, or “Koi-koi” to play on. If the opponent then makes a yaku, their score is doubled.',
  'Iris or wisteria', 'Your hand card is the iris ribbon (May). Pick the field card of the same month.', 'The iris with the eight-plank bridge is May: purple flowers growing upward, sword-like leaves and the bridge.', 'That card is another month. Wisteria (April) hangs down in clusters; iris flowers grow upward.',
  'Three of a month', 'Three cherry cards lie on the field. Which hand card captures the most?', 'With three cards of a month on the field, the fourth takes all three — including the cherry curtain, a Bright.', 'The pine chaff takes just one pine; the paulownia chaff finds no paulownia on the field. The cherry chaff takes all three cherries.',
  'Which one to take?', 'You played the bush clover chaff and two bush clover cards are on the field. Which do you take?', 'The boar is an Animal, one of Boar-Deer-Butterfly. Take the card that leads to a yaku, not the chaff.', 'The chaff is worth one chaff. The boar is a step toward Boar-Deer-Butterfly (5 points) and keeps it from the opponent.',
  'Four Lights or Rainy Four', 'You hold three Brights (crane, curtain, moon). Which hand card scores the most?', 'The paulownia chaff takes the phoenix: Four Lights, 8 points. The willow chaff takes the rain man: Rainy Four Lights, 7.', 'Four with the rain man is Rainy Four Lights, 7; the pine chaff finds no pine on the field. The phoenix makes Four Lights, 8.',
  'Moon Viewing', 'You have the moon. Which hand card makes a yaku at once?', 'The chrysanthemum chaff takes the sake cup: with the moon that is Moon Viewing, 5 points.', 'The geese or the butterfly make no yaku. The sake cup does: Moon Viewing.',
  'The last of Boar-Deer-Butterfly', 'You have the boar and the deer. You played the peony chaff and two peony cards are on the field. Which do you take?', 'The peony butterfly completes Boar-Deer-Butterfly, 5 points.', 'The blue peony ribbon is only one ribbon. The butterfly, with the boar and deer, makes 5 points.',
  'The opponent is close', 'You have Red Ribbons, 5 points. The opponent holds the boar and the deer, and the butterfly is on the field.', 'Taking the butterfly with a peony gives them Boar-Deer-Butterfly — doubled after your koi-koi. Stop and keep your 5 points.', 'After koi-koi, if they take the butterfly they score Boar-Deer-Butterfly doubled, and your Red Ribbons score nothing.',
  'Only 1 point so far', 'Five Animals for 1 point. The opponent has only three chaff, and you still have six cards.', 'Stopping gives just 1 point. The cherry ribbon is on the field: take it with your cherry curtain for Red Ribbons, 5 points. The opponent is far from a yaku.', 'Stopping at 1 point is too early. Your cherry curtain can take the cherry ribbon for Red Ribbons (5), and the opponent is still far from a yaku.',
  'Reaching 7 points', 'Rainy Four Lights, 7 points. The opponent holds the boar and the deer, and the butterfly is on the field.', '7 points or more are doubled, so stopping now gives 14. One butterfly gives the opponent Boar-Deer-Butterfly — playing on is risky.', 'After koi-koi, if they take the butterfly their Boar-Deer-Butterfly is doubled. Stopping now gives a sure 14.'],
};
const L12 = {
zh: ['课程', '从认牌到组成役、判断こいこい，用真实的牌来思考。', '返回列表', '结束课程', '下一题', '正确！', '不对', '合格', '未挑战', '准备', '明白了', '决胜', 'こいこい', '场', '手牌', '你的收牌', '对手的收牌', '打出的牌', '牌',
  '牌与月份', '认出同月的牌，找出能收的牌。', '役', '收哪张牌能成役、得几分。', 'こいこい的判断', '决胜，还是喊こいこい继续？',
  '花草相同就是同一个月', '上排是菊（9月），下排是红叶（10月）各4张。看花的形状和颜色就知道月份。',
  '役是收牌的组合', '三张写字的红短册（松・梅・樱）凑齐就是“赤短”，5分。役由收到的牌的组合决定。',
  '决胜与こいこい', '樱幕・菊上杯・芒上月。成役后可选“决胜”确定分数，或“こいこい”继续。继续后若对手成役，对手得分翻倍。',
  '菖蒲与藤', '手牌是菖蒲短册（5月）。从场上选出同月的牌。', '菖蒲八桥是5月。向上开的紫花、剑一样的叶子和桥是标志。', '那是别的月份。藤（4月）花穗下垂，菖蒲的花向上开。',
  '场上有3张的月份', '场上有3张樱。哪张手牌能收最多的牌？', '场上同月有3张时，打出第4张就能一次收走3张，连樱幕（光）也到手。', '松渣只能收1张松，桐渣场上没有桐收不了。樱渣能一次收走3张樱。',
  '收哪一张？', '你打出了萩渣，场上有2张萩。收哪一张？', '萩上猪是种牌，是猪鹿蝶的一张。比起渣，收能成役的牌。', '萩渣只是1张渣。萩上猪是迈向猪鹿蝶（5分）的一张，也不会留给对手。',
  '四光与雨四光', '你有3张光（鹤・幕・月）。哪张手牌得分最高？', '用桐渣收凤凰是四光8分；用柳渣收小野道风是雨四光7分。', '含柳光的4张是雨四光7分，松渣场上没有松收不了。凤凰就是四光8分。',
  '月见酒', '你已收了芒上月。哪张手牌能马上成役？', '用菊渣收菊上杯，和芒上月凑成“月见酒”5分。', '收芒上雁或牡丹蝶都不成役。收菊上杯才是月见酒。',
  '猪鹿蝶的最后一张', '你有猪和鹿。打出牡丹渣后，场上有2张牡丹。收哪一张？', '牡丹蝶让猪鹿蝶完成，5分。', '牡丹青短只是1张短册。收蝶就和猪、鹿凑成猪鹿蝶5分。',
  '对手逼近时', '你有赤短5分。对手已收猪和鹿，场上有牡丹蝶。', '对手用牡丹收蝶就成猪鹿蝶，在你こいこい之后成役对手得分翻倍。这里决胜确保5分。', 'こいこい后对手收蝶就成猪鹿蝶，得分翻倍，你的赤短为0分。',
  '只有1分时', '5张种牌1分。对手只收了3张渣，你手里还有6张。', '现在停也只有1分。场上有樱短册，用手里的樱幕收下就是赤短5分。对手离役还远，值得继续。', '1分就停太早。用手里的樱幕收场上的樱短册就是赤短（5分），对手还离役很远。',
  '达到7分时', '雨四光7分。对手有猪和鹿，场上有牡丹蝶。', '7分以上翻倍，现在决胜是14分。对手收到蝶就成猪鹿蝶，继续很危险。', 'こいこい后对手收蝶，猪鹿蝶翻倍。现在决胜稳拿14分。'],
'zh-TW': ['課程', '從認牌到組成役、判斷こいこい，用真實的牌來思考。', '返回列表', '結束課程', '下一題', '正確！', '不對', '合格', '未挑戰', '準備', '明白了', '決勝', 'こいこい', '場', '手牌', '你的收牌', '對手的收牌', '打出的牌', '牌',
  '牌與月份', '認出同月的牌，找出能收的牌。', '役', '收哪張牌能成役、得幾分。', 'こいこい的判斷', '決勝，還是喊こいこい繼續？',
  '花草相同就是同一個月', '上排是菊（9月），下排是紅葉（10月）各4張。看花的形狀和顏色就知道月份。',
  '役是收牌的組合', '三張寫字的紅短冊（松・梅・櫻）湊齊就是「赤短」，5分。役由收到的牌的組合決定。',
  '決勝與こいこい', '櫻幕・菊上杯・芒上月。成役後可選「決勝」確定分數，或「こいこい」繼續。繼續後若對手成役，對手得分加倍。',
  '菖蒲與藤', '手牌是菖蒲短冊（5月）。從場上選出同月的牌。', '菖蒲八橋是5月。向上開的紫花、劍一樣的葉子和橋是標誌。', '那是別的月份。藤（4月）花穗下垂，菖蒲的花向上開。',
  '場上有3張的月份', '場上有3張櫻。哪張手牌能收最多的牌？', '場上同月有3張時，打出第4張就能一次收走3張，連櫻幕（光）也到手。', '松渣只能收1張松，桐渣場上沒有桐收不了。櫻渣能一次收走3張櫻。',
  '收哪一張？', '你打出了萩渣，場上有2張萩。收哪一張？', '萩上豬是種牌，是豬鹿蝶的一張。比起渣，收能成役的牌。', '萩渣只是1張渣。萩上豬是邁向豬鹿蝶（5分）的一張，也不會留給對手。',
  '四光與雨四光', '你有3張光（鶴・幕・月）。哪張手牌得分最高？', '用桐渣收鳳凰是四光8分；用柳渣收小野道風是雨四光7分。', '含柳光的4張是雨四光7分，松渣場上沒有松收不了。鳳凰就是四光8分。',
  '月見酒', '你已收了芒上月。哪張手牌能馬上成役？', '用菊渣收菊上杯，和芒上月湊成「月見酒」5分。', '收芒上雁或牡丹蝶都不成役。收菊上杯才是月見酒。',
  '豬鹿蝶的最後一張', '你有豬和鹿。打出牡丹渣後，場上有2張牡丹。收哪一張？', '牡丹蝶讓豬鹿蝶完成，5分。', '牡丹青短只是1張短冊。收蝶就和豬、鹿湊成豬鹿蝶5分。',
  '對手逼近時', '你有赤短5分。對手已收豬和鹿，場上有牡丹蝶。', '對手用牡丹收蝶就成豬鹿蝶，在你こいこい之後成役對手得分加倍。這裡決勝確保5分。', 'こいこい後對手收蝶就成豬鹿蝶，得分加倍，你的赤短為0分。',
  '只有1分時', '5張種牌1分。對手只收了3張渣，你手裡還有6張。', '現在停也只有1分。場上有櫻短冊，用手裡的櫻幕收下就是赤短5分。對手離役還遠，值得繼續。', '1分就停太早。用手裡的櫻幕收場上的櫻短冊就是赤短（5分），對手還離役很遠。',
  '達到7分時', '雨四光7分。對手有豬和鹿，場上有牡丹蝶。', '7分以上加倍，現在決勝是14分。對手收到蝶就成豬鹿蝶，繼續很危險。', 'こいこい後對手收蝶，豬鹿蝶加倍。現在決勝穩拿14分。'],
ko: ['레슨', '패 구별부터 역 만들기, 코이코이 판단까지 실제 패로 생각합니다.', '목록으로', '레슨 그만두기', '다음 문제', '정답!', '아닙니다', '합격', '미도전', '준비', '알겠어요', '승부', '코이코이', '바닥', '손패', '내가 가져온 패', '상대가 가져온 패', '낸 패', '패',
  '패와 달', '같은 달의 패를 알아보고 가져올 패를 찾습니다.', '역', '어떤 패를 가져오면 역이 되고 몇 점인지.', '코이코이 판단', '승부할까, 코이코이로 계속할까?',
  '같은 꽃은 같은 달', '위는 국화(9월), 아래는 단풍(10월) 4장씩. 꽃의 모양과 색으로 달을 알 수 있습니다.',
  '역은 가져온 패의 조합', '글씨가 있는 붉은 띠 3장(소나무·매화·벚꽃)이 모이면 "홍단" 5점. 역은 가져온 패의 조합으로 정해집니다.',
  '승부와 코이코이', '벚꽃 장막·국화 술잔·억새 달. 역이 생기면 "승부"로 점수를 확정하거나 "코이코이"로 계속합니다. 계속한 뒤 상대가 역을 만들면 상대 점수가 2배.',
  '창포와 등나무', '손패는 창포 띠(5월). 같은 달의 패를 바닥에서 고르세요.', '창포의 팔교는 5월. 위로 피는 보라 꽃, 칼 같은 잎, 다리가 표시입니다.', '다른 달의 패입니다. 등나무(4월)는 꽃송이가 늘어지고, 창포는 꽃이 위로 핍니다.',
  '바닥에 3장 있는 달', '바닥에 벚꽃이 3장 있습니다. 가장 많이 가져올 수 있는 손패는?', '같은 달이 바닥에 3장일 때 4장째를 내면 3장을 한꺼번에 가져옵니다. 벚꽃 장막(광)도 손에 들어옵니다.', '소나무 피는 소나무 1장, 오동 피는 바닥에 오동이 없어 못 가져옵니다. 벚꽃 피면 벚꽃 3장을 한 번에.',
  '어느 쪽을 가져올까?', '싸리 피를 냈습니다. 바닥에 싸리가 2장. 어느 쪽을 가져올까요?', '싸리 멧돼지는 열끗으로 저록접의 1장입니다. 피보다 역으로 이어지는 패를 가져오세요.', '싸리 피는 피 1장. 멧돼지면 저록접(5점)으로 가는 1장이 되고 상대에게도 안 넘어갑니다.',
  '사광과 비사광', '광 3장(학·장막·달)을 가지고 있습니다. 점수가 가장 높아지는 손패는?', '오동 피로 봉황을 가져오면 사광 8점. 버드나무 피로 오노노 도후를 가져오면 비사광 7점.', '버드나무 광이 든 4장은 비사광 7점, 소나무 피는 바닥에 소나무가 없어 못 가져옵니다. 봉황이면 사광 8점.',
  '달구경 한잔', '억새 달을 가져왔습니다. 바로 역이 되는 손패는?', '국화 피로 국화 술잔을 가져오면 억새 달과 함께 "달구경 한잔" 5점.', '억새 기러기나 모란 나비로는 역이 되지 않습니다. 국화 술잔이면 달구경 한잔.',
  '저록접의 마지막 1장', '멧돼지와 사슴이 있습니다. 모란 피를 내니 바닥에 모란이 2장. 어느 쪽?', '모란 나비로 저록접 완성, 5점.', '모란 청단은 띠 1장뿐. 나비를 가져오면 멧돼지·사슴과 함께 저록접 5점.',
  '상대가 다가올 때', '당신은 홍단 5점. 상대는 멧돼지와 사슴을 가졌고, 바닥에 모란 나비가 있습니다.', '상대가 모란으로 나비를 가져가면 저록접. 코이코이 뒤라면 상대 점수가 2배. 여기서는 승부로 5점을 지킵니다.', '코이코이 뒤 상대가 나비를 가져가면 저록접 2배, 당신의 홍단은 0점.',
  '아직 1점일 때', '열끗 5장으로 1점. 상대는 피 3장뿐, 손패는 아직 6장.', '지금 멈춰도 1점. 바닥에 벚꽃 띠가 있고 손패의 벚꽃 장막으로 가져오면 홍단 5점. 상대는 역과 멀어 계속할 가치가 있습니다.', '1점에서 멈추기는 이릅니다. 손패의 벚꽃 장막으로 벚꽃 띠를 가져오면 홍단(5점), 상대는 아직 역과 멉니다.',
  '7점에 닿으면', '비사광 7점. 상대는 멧돼지와 사슴, 바닥에 모란 나비가 있습니다.', '7점 이상은 2배라 지금 승부하면 14점. 상대는 나비만 가져가면 저록접이라 계속은 위험합니다.', '코이코이 뒤 상대가 나비를 가져가면 저록접 2배. 지금 승부하면 확실히 14점.'],
es: ['Lecciones', 'Desde distinguir las cartas hasta formar yaku y decidir el koi-koi, con cartas reales.', 'Volver a la lista', 'Salir de la lección', 'Siguiente', '¡Correcto!', 'No es esa', 'Superada', 'Sin intentar', 'Preparación', 'Entendido', 'Parar', 'Koi-koi', 'Campo', 'Mano', 'Tus capturas', 'Capturas del rival', 'Carta jugada', 'Cartas',
  'Cartas y meses', 'Reconoce cartas del mismo mes y qué puedes capturar.', 'Yaku', 'Qué carta forma un yaku y cuántos puntos da.', 'Decidir el koi-koi', '¿Parar o decir koi-koi y seguir?',
  'Misma planta, mismo mes', 'Arriba, las cuatro de crisantemo (septiembre); abajo, las cuatro de arce (octubre). La forma y el color de la flor dicen el mes.',
  'Los yaku son grupos de capturas', 'Las tres cintas rojas escritas (pino, ciruelo, cerezo) forman Cintas rojas, 5 puntos. Un yaku es un grupo de cartas capturadas.',
  'Parar o koi-koi', 'Cortina de cerezo, copa de sake, luna. Con un yaku eliges: «Parar» para asegurar los puntos o «Koi-koi» para seguir. Si luego el rival forma un yaku, cobra el doble.',
  'Iris o glicina', 'Tu carta es la cinta de iris (mayo). Elige la carta del campo del mismo mes.', 'El iris con el puente es mayo: flores moradas hacia arriba, hojas como espadas y el puente.', 'Esa carta es de otro mes. La glicina (abril) cuelga en racimos; el iris florece hacia arriba.',
  'Tres del mismo mes', 'Hay tres cerezos en el campo. ¿Qué carta de tu mano captura más?', 'Con tres cartas de un mes en el campo, la cuarta se lleva las tres, incluida la cortina de cerezo (Brillante).', 'La paja de pino solo toma un pino; la de paulonia no encuentra paulonia. La paja de cerezo toma los tres cerezos.',
  '¿Cuál te llevas?', 'Jugaste la paja de lespedeza y hay dos lespedezas en el campo. ¿Cuál tomas?', 'El jabalí es un Animal, parte de Jabalí-Ciervo-Mariposa. Toma la carta que lleva a un yaku, no la paja.', 'La paja vale una paja. El jabalí acerca Jabalí-Ciervo-Mariposa (5 puntos) y no se lo deja al rival.',
  'Cuatro Luces o con lluvia', 'Tienes tres Brillantes (grulla, cortina, luna). ¿Qué carta suma más?', 'La paja de paulonia toma el fénix: Cuatro Luces, 8 puntos. La paja de sauce toma al hombre de la lluvia: Cuatro con lluvia, 7.', 'Con el hombre de la lluvia son Cuatro con lluvia, 7; la paja de pino no encuentra pino. El fénix da Cuatro Luces, 8.',
  'Ver la luna', 'Tienes la luna. ¿Qué carta forma un yaku enseguida?', 'La paja de crisantemo toma la copa de sake: con la luna es Ver la luna, 5 puntos.', 'Los gansos o la mariposa no forman yaku. La copa de sake sí: Ver la luna.',
  'La última de Jabalí-Ciervo-Mariposa', 'Tienes el jabalí y el ciervo. Jugaste la paja de peonía y hay dos peonías en el campo. ¿Cuál tomas?', 'La mariposa completa Jabalí-Ciervo-Mariposa, 5 puntos.', 'La cinta azul de peonía es solo una cinta. La mariposa, con jabalí y ciervo, da 5 puntos.',
  'El rival está cerca', 'Tienes Cintas rojas, 5 puntos. El rival tiene el jabalí y el ciervo, y la mariposa está en el campo.', 'Si el rival toma la mariposa con una peonía, forma Jabalí-Ciervo-Mariposa, doblado tras tu koi-koi. Para y asegura tus 5 puntos.', 'Tras el koi-koi, si toma la mariposa cobra Jabalí-Ciervo-Mariposa doble y tus Cintas rojas valen 0.',
  'Solo 1 punto', 'Cinco Animales, 1 punto. El rival solo tiene tres pajas y tú aún tienes seis cartas.', 'Parar solo da 1 punto. La cinta de cerezo está en el campo: tómala con tu cortina de cerezo para Cintas rojas, 5 puntos. El rival está lejos de un yaku.', 'Parar con 1 punto es pronto. Tu cortina de cerezo puede tomar la cinta de cerezo (Cintas rojas, 5) y el rival sigue lejos.',
  'Al llegar a 7', 'Cuatro con lluvia, 7 puntos. El rival tiene jabalí y ciervo, y la mariposa está en el campo.', 'Con 7 o más se duplica: parar ahora da 14. Una mariposa le da al rival Jabalí-Ciervo-Mariposa; seguir es arriesgado.', 'Tras el koi-koi, si toma la mariposa su yaku se duplica. Parar ahora da 14 seguros.'],
fr: ['Leçons', 'Reconnaître les cartes, former des yaku, décider du koi-koi — sur de vraies cartes.', 'Retour à la liste', 'Quitter la leçon', 'Suivant', 'Correct !', 'Pas celle-là', 'Réussie', 'Pas tentée', 'Préparation', 'Compris', 'Arrêter', 'Koi-koi', 'Terrain', 'Main', 'Vos prises', 'Prises adverses', 'Carte jouée', 'Cartes',
  'Cartes et mois', 'Repérer les cartes d’un même mois et ce que vous pouvez prendre.', 'Yaku', 'Quelle carte forme un yaku, et combien de points.', 'Décider du koi-koi', 'Arrêter, ou dire koi-koi et continuer ?',
  'Même plante, même mois', 'En haut, les quatre chrysanthèmes (septembre) ; en bas, les quatre érables (octobre). La forme et la couleur de la fleur donnent le mois.',
  'Les yaku sont des ensembles de prises', 'Les trois rubans rouges écrits (pin, prunier, cerisier) font Rubans rouges, 5 points. Un yaku est un ensemble de cartes prises.',
  'Arrêter ou koi-koi', 'Rideau de cerisier, coupe de saké, lune. Avec un yaku : « Arrêter » pour garder les points, ou « Koi-koi » pour continuer. Si l’adversaire forme ensuite un yaku, il marque double.',
  'Iris ou glycine', 'Votre carte est le ruban d’iris (mai). Choisissez sur le terrain la carte du même mois.', 'L’iris au pont est mai : fleurs violettes dressées, feuilles en épée et le pont.', 'Cette carte est d’un autre mois. La glycine (avril) pend en grappes ; l’iris fleurit vers le haut.',
  'Trois d’un même mois', 'Trois cerisiers sont sur le terrain. Quelle carte de votre main prend le plus ?', 'Avec trois cartes d’un mois au terrain, la quatrième prend les trois — dont le rideau de cerisier, une Lumière.', 'Le déchet de pin ne prend qu’un pin ; celui du paulownia ne trouve pas de paulownia. Le déchet de cerisier prend les trois.',
  'Laquelle prendre ?', 'Vous avez joué le déchet de lespédèze et deux lespédèzes sont au terrain. Laquelle prenez-vous ?', 'Le sanglier est un Animal, une pièce de Sanglier-Cerf-Papillon. Prenez la carte qui mène à un yaku, pas le déchet.', 'Le déchet ne vaut qu’un déchet. Le sanglier approche Sanglier-Cerf-Papillon (5 points) et reste hors de portée adverse.',
  'Quatre Lumières ou sous la pluie', 'Vous avez trois Lumières (grue, rideau, lune). Quelle carte rapporte le plus ?', 'Le déchet de paulownia prend le phénix : Quatre Lumières, 8 points. Le déchet de saule prend l’homme à l’ombrelle : sous la pluie, 7.', 'Avec l’homme à l’ombrelle, c’est Quatre sous la pluie, 7 ; le déchet de pin ne trouve pas de pin. Le phénix donne Quatre Lumières, 8.',
  'Contempler la lune', 'Vous avez la lune. Quelle carte forme un yaku tout de suite ?', 'Le déchet de chrysanthème prend la coupe de saké : avec la lune, Contempler la lune, 5 points.', 'Les oies ou le papillon ne font pas de yaku. La coupe de saké, si : Contempler la lune.',
  'Le dernier de Sanglier-Cerf-Papillon', 'Vous avez le sanglier et le cerf. Vous jouez le déchet de pivoine et deux pivoines sont au terrain. Laquelle prendre ?', 'Le papillon de pivoine complète Sanglier-Cerf-Papillon, 5 points.', 'Le ruban bleu de pivoine n’est qu’un ruban. Le papillon, avec sanglier et cerf, fait 5 points.',
  'L’adversaire est proche', 'Vous avez Rubans rouges, 5 points. L’adversaire a le sanglier et le cerf, et le papillon est au terrain.', 'S’il prend le papillon avec une pivoine, il forme Sanglier-Cerf-Papillon, doublé après votre koi-koi. Arrêtez et gardez vos 5 points.', 'Après koi-koi, s’il prend le papillon, son yaku est doublé et vos Rubans rouges ne valent rien.',
  'Seulement 1 point', 'Cinq Animaux, 1 point. L’adversaire n’a que trois déchets et il vous reste six cartes.', 'S’arrêter ne donne qu’1 point. Le ruban de cerisier est au terrain : votre rideau de cerisier le prend pour Rubans rouges, 5 points. L’adversaire est loin d’un yaku.', 'S’arrêter à 1 point est trop tôt. Votre rideau de cerisier peut prendre le ruban de cerisier (Rubans rouges, 5), l’adversaire reste loin.',
  'À 7 points', 'Quatre sous la pluie, 7 points. L’adversaire a le sanglier et le cerf, et le papillon est au terrain.', 'À 7 points ou plus, on double : s’arrêter donne 14. Un papillon donne Sanglier-Cerf-Papillon à l’adversaire ; continuer est risqué.', 'Après koi-koi, s’il prend le papillon, son yaku est doublé. S’arrêter maintenant donne 14 assurés.'],
pt: ['Lições', 'De distinguir as cartas a formar yaku e decidir o koi-koi — com cartas reais.', 'Voltar à lista', 'Sair da lição', 'Próxima', 'Certo!', 'Não é essa', 'Aprovada', 'Não tentada', 'Preparação', 'Entendi', 'Parar', 'Koi-koi', 'Campo', 'Mão', 'Suas capturas', 'Capturas do rival', 'Carta jogada', 'Cartas',
  'Cartas e meses', 'Reconheça cartas do mesmo mês e o que pode capturar.', 'Yaku', 'Que carta forma um yaku e quantos pontos vale.', 'Decidir o koi-koi', 'Parar, ou dizer koi-koi e seguir?',
  'Mesma planta, mesmo mês', 'Em cima, as quatro de crisântemo (setembro); embaixo, as quatro de bordo (outubro). Forma e cor da flor dizem o mês.',
  'Yaku são grupos de capturas', 'As três fitas vermelhas escritas (pinheiro, ameixeira, cerejeira) formam Fitas vermelhas, 5 pontos. Um yaku é um grupo de cartas capturadas.',
  'Parar ou koi-koi', 'Cortina de cerejeira, taça de saquê, lua. Com um yaku: «Parar» garante os pontos, «Koi-koi» continua. Se depois o rival formar um yaku, ele pontua em dobro.',
  'Íris ou glicínia', 'Sua carta é a fita de íris (maio). Escolha no campo a carta do mesmo mês.', 'A íris com a ponte é maio: flores roxas para cima, folhas como espadas e a ponte.', 'Essa é de outro mês. A glicínia (abril) pende em cachos; a íris floresce para cima.',
  'Três do mesmo mês', 'Há três cerejeiras no campo. Qual carta da mão captura mais?', 'Com três cartas de um mês no campo, a quarta leva as três — inclusive a cortina de cerejeira, uma Brilhante.', 'A palha de pinheiro só leva um pinheiro; a de paulównia não acha paulównia. A palha de cerejeira leva as três.',
  'Qual levar?', 'Você jogou a palha de lespedeza e há duas lespedezas no campo. Qual leva?', 'O javali é um Animal, parte de Javali-Cervo-Borboleta. Leve a carta que leva a um yaku, não a palha.', 'A palha vale uma palha. O javali aproxima Javali-Cervo-Borboleta (5 pontos) e fica longe do rival.',
  'Quatro Luzes ou com chuva', 'Você tem três Brilhantes (grou, cortina, lua). Qual carta pontua mais?', 'A palha de paulównia leva a fênix: Quatro Luzes, 8 pontos. A palha de salgueiro leva o homem da chuva: com chuva, 7.', 'Com o homem da chuva são Quatro com chuva, 7; a palha de pinheiro não acha pinheiro. A fênix dá Quatro Luzes, 8.',
  'Ver a lua', 'Você tem a lua. Qual carta forma um yaku já?', 'A palha de crisântemo leva a taça de saquê: com a lua é Ver a lua, 5 pontos.', 'Os gansos ou a borboleta não formam yaku. A taça de saquê sim: Ver a lua.',
  'A última de Javali-Cervo-Borboleta', 'Você tem o javali e o cervo. Jogou a palha de peônia e há duas peônias no campo. Qual leva?', 'A borboleta completa Javali-Cervo-Borboleta, 5 pontos.', 'A fita azul de peônia é só uma fita. A borboleta, com javali e cervo, dá 5 pontos.',
  'O rival está perto', 'Você tem Fitas vermelhas, 5 pontos. O rival tem o javali e o cervo, e a borboleta está no campo.', 'Se o rival levar a borboleta com uma peônia, forma Javali-Cervo-Borboleta, dobrado após seu koi-koi. Pare e garanta seus 5 pontos.', 'Após o koi-koi, se ele levar a borboleta, pontua em dobro e suas Fitas vermelhas valem 0.',
  'Só 1 ponto', 'Cinco Animais, 1 ponto. O rival tem só três palhas e você ainda tem seis cartas.', 'Parar dá só 1 ponto. A fita de cerejeira está no campo: leve-a com sua cortina de cerejeira para Fitas vermelhas, 5 pontos. O rival está longe de um yaku.', 'Parar com 1 ponto é cedo. Sua cortina de cerejeira pode levar a fita de cerejeira (Fitas vermelhas, 5) e o rival ainda está longe.',
  'Ao chegar a 7', 'Quatro com chuva, 7 pontos. O rival tem javali e cervo, e a borboleta está no campo.', 'Com 7 ou mais dobra: parar agora dá 14. Uma borboleta dá ao rival Javali-Cervo-Borboleta; seguir é arriscado.', 'Após o koi-koi, se ele levar a borboleta, o yaku dele dobra. Parar agora dá 14 garantidos.'],
de: ['Lektionen', 'Karten erkennen, Yaku bilden, Koi-koi entscheiden — mit echten Karten.', 'Zur Liste', 'Lektion beenden', 'Weiter', 'Richtig!', 'Nicht diese', 'Bestanden', 'Offen', 'Vorbereitung', 'Verstanden', 'Aufhören', 'Koi-koi', 'Feld', 'Hand', 'Deine Stiche', 'Stiche des Gegners', 'Gespielte Karte', 'Karten',
  'Karten und Monate', 'Karten desselben Monats erkennen und finden, was du nehmen kannst.', 'Yaku', 'Welche Karte ein Yaku bildet und wie viele Punkte.', 'Koi-koi entscheiden', 'Aufhören oder Koi-koi und weiterspielen?',
  'Gleiche Pflanze, gleicher Monat', 'Oben die vier Chrysanthemen (September), unten die vier Ahornkarten (Oktober). Form und Farbe der Blüte zeigen den Monat.',
  'Yaku sind Sätze von Stichen', 'Die drei beschrifteten roten Bänder (Kiefer, Pflaume, Kirsche) ergeben Rote Gedichtbänder, 5 Punkte. Ein Yaku ist ein Satz genommener Karten.',
  'Aufhören oder Koi-koi', 'Kirschvorhang, Sakeschale, Mond. Mit einem Yaku: „Aufhören“ sichert die Punkte, „Koi-koi“ spielt weiter. Bildet der Gegner danach ein Yaku, punktet er doppelt.',
  'Iris oder Glyzinie', 'Deine Karte ist das Irisband (Mai). Wähle die Feldkarte desselben Monats.', 'Die Iris mit der Brücke ist Mai: violette, aufrechte Blüten, schwertförmige Blätter und die Brücke.', 'Das ist ein anderer Monat. Glyzinie (April) hängt in Trauben, Iris blüht nach oben.',
  'Drei eines Monats', 'Drei Kirschkarten liegen auf dem Feld. Welche Handkarte nimmt am meisten?', 'Liegen drei Karten eines Monats aus, nimmt die vierte alle drei – samt Kirschvorhang, einem Licht.', 'Die Kiefernspreu nimmt nur eine Kiefer, die Paulownienspreu findet keine Paulownie. Die Kirschspreu nimmt alle drei.',
  'Welche nehmen?', 'Du hast die Buschklee-Spreu gespielt, zwei Buschklee-Karten liegen aus. Welche nimmst du?', 'Der Eber ist ein Tier und gehört zu Eber-Hirsch-Schmetterling. Nimm die Karte, die zu einem Yaku führt, nicht die Spreu.', 'Spreu ist nur Spreu. Der Eber bringt dich näher an Eber-Hirsch-Schmetterling (5 Punkte) und bleibt dem Gegner verwehrt.',
  'Vier Lichter oder mit Regen', 'Du hast drei Lichter (Kranich, Vorhang, Mond). Welche Handkarte bringt am meisten?', 'Die Paulownienspreu nimmt den Phönix: Vier Lichter, 8 Punkte. Die Weidenspreu nimmt den Mann im Regen: mit Regen, 7.', 'Mit dem Mann im Regen sind es Vier mit Regen, 7; die Kiefernspreu findet keine Kiefer. Der Phönix ergibt Vier Lichter, 8.',
  'Mondschau', 'Du hast den Mond. Welche Handkarte bildet sofort ein Yaku?', 'Die Chrysanthemenspreu nimmt die Sakeschale: mit dem Mond Mondschau, 5 Punkte.', 'Gänse oder Schmetterling bilden kein Yaku. Die Sakeschale schon: Mondschau.',
  'Das letzte von Eber-Hirsch-Schmetterling', 'Du hast Eber und Hirsch. Du spielst die Pfingstrosen-Spreu, zwei Pfingstrosen liegen aus. Welche nimmst du?', 'Der Schmetterling vollendet Eber-Hirsch-Schmetterling, 5 Punkte.', 'Das blaue Pfingstrosenband ist nur ein Band. Der Schmetterling ergibt mit Eber und Hirsch 5 Punkte.',
  'Der Gegner ist nah dran', 'Du hast Rote Gedichtbänder, 5 Punkte. Der Gegner hat Eber und Hirsch, der Schmetterling liegt aus.', 'Nimmt er den Schmetterling mit einer Pfingstrose, hat er Eber-Hirsch-Schmetterling – nach deinem Koi-koi doppelt. Hör auf und sichere 5 Punkte.', 'Nach Koi-koi: Nimmt er den Schmetterling, zählt sein Yaku doppelt und deine Bänder zählen nichts.',
  'Erst 1 Punkt', 'Fünf Tiere, 1 Punkt. Der Gegner hat nur drei Spreu, du hast noch sechs Karten.', 'Aufhören bringt nur 1 Punkt. Das Kirschband liegt aus: Dein Kirschvorhang nimmt es für Rote Gedichtbänder, 5 Punkte. Der Gegner ist weit von einem Yaku.', 'Bei 1 Punkt aufzuhören ist zu früh. Dein Kirschvorhang kann das Kirschband nehmen (Rote Bänder, 5), der Gegner ist noch weit weg.',
  'Bei 7 Punkten', 'Vier mit Regen, 7 Punkte. Der Gegner hat Eber und Hirsch, der Schmetterling liegt aus.', 'Ab 7 Punkten doppelt: jetzt aufhören bringt 14. Ein Schmetterling gibt dem Gegner Eber-Hirsch-Schmetterling – weiterspielen ist riskant.', 'Nach Koi-koi: Nimmt er den Schmetterling, zählt sein Yaku doppelt. Jetzt aufhören bringt sichere 14.'],
ru: ['Уроки', 'Как различать карты, собирать яку и решать «кои-кои» — на настоящих картах.', 'К списку', 'Закончить урок', 'Далее', 'Верно!', 'Не та', 'Пройдено', 'Не начато', 'Подготовка', 'Понятно', 'Стоп', 'Кои-кои', 'Поле', 'Рука', 'Ваши взятки', 'Взятки соперника', 'Сыгранная карта', 'Карты',
  'Карты и месяцы', 'Узнавать карты одного месяца и что можно взять.', 'Яку', 'Какая карта даёт яку и сколько очков.', 'Решение «кои-кои»', 'Остановиться или сказать «кои-кои»?',
  'Одно растение — один месяц', 'Вверху четыре хризантемы (сентябрь), внизу четыре клёна (октябрь). Форма и цвет цветка подскажут месяц.',
  'Яку — наборы взятых карт', 'Три красные ленты с надписью (сосна, слива, сакура) дают «Красные ленты», 5 очков. Яку — это набор взятых карт.',
  'Стоп или кои-кои', 'Занавес сакуры, чаша сакэ, луна. С яку выбирайте: «Стоп» — закрепить очки, «Кои-кои» — играть дальше. Если потом соперник соберёт яку, его очки удвоятся.',
  'Ирис или глициния', 'Ваша карта — лента ириса (май). Выберите на поле карту того же месяца.', 'Ирис с мостом — май: фиолетовые цветы вверх, листья-мечи и мост.', 'Это другой месяц. Глициния (апрель) свисает гроздьями, ирис цветёт вверх.',
  'Три карты месяца', 'На поле три карты сакуры. Какая карта из руки возьмёт больше всего?', 'Если на поле три карты месяца, четвёртая берёт все три — вместе с занавесом сакуры (Светило).', 'Мусор сосны берёт одну сосну, мусор павловнии не найдёт павловнию. Мусор сакуры берёт все три.',
  'Какую взять?', 'Вы сыграли мусор леспедецы, на поле две леспедецы. Какую берёте?', 'Кабан — Животное, часть «Кабан-олень-бабочка». Берите карту, ведущую к яку, а не мусор.', 'Мусор — лишь одна карта мусора. Кабан приближает «Кабан-олень-бабочка» (5 очков) и не достаётся сопернику.',
  'Четыре светила или с дождём', 'У вас три Светила (журавль, занавес, луна). Какая карта даст больше очков?', 'Мусор павловнии берёт феникса: «Четыре светила», 8 очков. Мусор ивы берёт человека с зонтом: «с дождём», 7.', 'С человеком с зонтом — «Четыре с дождём», 7; мусор сосны не найдёт сосну. Феникс даёт «Четыре светила», 8.',
  'Любование луной', 'У вас луна. Какая карта сразу даст яку?', 'Мусор хризантемы берёт чашу сакэ: с луной это «Любование луной», 5 очков.', 'Гуси или бабочка яку не дают. Чаша сакэ — да: «Любование луной».',
  'Последняя карта «Кабан-олень-бабочка»', 'У вас кабан и олень. Вы сыграли мусор пиона, на поле два пиона. Какой берёте?', 'Бабочка пиона завершает «Кабан-олень-бабочка», 5 очков.', 'Синяя лента пиона — лишь одна лента. Бабочка с кабаном и оленем — 5 очков.',
  'Соперник близко', 'У вас «Красные ленты», 5 очков. У соперника кабан и олень, бабочка на поле.', 'Взяв бабочку пионом, соперник соберёт «Кабан-олень-бабочка» — после вашего кои-кои вдвое. Остановитесь и сохраните 5 очков.', 'После кои-кои, если он возьмёт бабочку, его яку удвоится, а ваши ленты дадут 0.',
  'Пока 1 очко', 'Пять Животных — 1 очко. У соперника лишь три мусора, у вас ещё шесть карт.', 'Остановка даст только 1 очко. Лента сакуры на поле: ваш занавес сакуры возьмёт её — «Красные ленты», 5 очков. Соперник далёк от яку.', 'Останавливаться на 1 очке рано. Занавес сакуры возьмёт ленту сакуры («Красные ленты», 5), а соперник ещё далеко.',
  'На 7 очках', '«Четыре с дождём», 7 очков. У соперника кабан и олень, бабочка на поле.', 'С 7 очков — вдвое: стоп сейчас даёт 14. Одна бабочка даст сопернику «Кабан-олень-бабочка» — продолжать рискованно.', 'После кои-кои, если он возьмёт бабочку, его яку удвоится. Стоп сейчас — верные 14.'],
tr: ['Dersler', 'Kartları ayırt etmekten yaku kurmaya ve koi-koi kararına — gerçek kartlarla.', 'Listeye dön', 'Dersi bırak', 'Sonraki', 'Doğru!', 'O değil', 'Geçti', 'Denenmedi', 'Hazırlık', 'Anladım', 'Dur', 'Koi-koi', 'Alan', 'El', 'Aldıkların', 'Rakibin aldıkları', 'Oynanan kart', 'Kartlar',
  'Kartlar ve aylar', 'Aynı ayın kartlarını tanı, neyi alabileceğini bul.', 'Yaku', 'Hangi kart yaku yapar, kaç puan eder.', 'Koi-koi kararı', 'Durmak mı, koi-koi deyip devam mı?',
  'Aynı bitki, aynı ay', 'Üstte dört krizantem (eylül), altta dört akçaağaç (ekim). Çiçeğin şekli ve rengi ayı söyler.',
  'Yakular aldığın kart setleridir', 'Yazılı üç kırmızı şerit (çam, erik, kiraz) Kırmızı şeritler, 5 puan. Yaku, aldığın kartların bir setidir.',
  'Dur ya da koi-koi', 'Kiraz perdesi, sake kâsesi, ay. Yaku yapınca: “Dur” puanı sağlamlaştırır, “Koi-koi” devam eder. Sonra rakip yaku yaparsa puanı ikiye katlanır.',
  'Süsen mi mor salkım mı', 'Elindeki süsen şeridi (mayıs). Alandan aynı ayın kartını seç.', 'Köprülü süsen mayıstır: yukarı açan mor çiçekler, kılıç gibi yapraklar ve köprü.', 'O başka bir ay. Mor salkım (nisan) salkım halinde sarkar; süsen yukarı açar.',
  'Bir ayın üç kartı', 'Alanda üç kiraz var. Elindeki hangi kart en çok kartı alır?', 'Alanda bir ayın üç kartı varken dördüncüsü üçünü birden alır — kiraz perdesi (Işık) dahil.', 'Çam samanı yalnız bir çam alır; pavlonya samanı alanda pavlonya bulamaz. Kiraz samanı üç kirazı alır.',
  'Hangisini alırsın?', 'Çalı yoncası samanını oynadın, alanda iki çalı yoncası var. Hangisini alırsın?', 'Domuz bir Hayvan ve Domuz-Geyik-Kelebek’in parçası. Samanı değil, yakuya götüren kartı al.', 'Saman sadece bir saman. Domuz, Domuz-Geyik-Kelebek’e (5 puan) yaklaştırır ve rakibe kalmaz.',
  'Dört Işık mı yağmurlu mu', 'Üç Işığın var (turna, perde, ay). Hangi kart en çok puan getirir?', 'Pavlonya samanı ankayı alır: Dört Işık, 8 puan. Söğüt samanı yağmur adamını alır: yağmurlu, 7.', 'Yağmur adamıyla Yağmurlu Dört Işık, 7; çam samanı alanda çam bulamaz. Anka Dört Işık verir, 8.',
  'Ay seyri', 'Ay sende. Hangi kart hemen yaku yapar?', 'Krizantem samanı sake kâsesini alır: ayla birlikte Ay seyri, 5 puan.', 'Kazlar ya da kelebek yaku yapmaz. Sake kâsesi yapar: Ay seyri.',
  'Domuz-Geyik-Kelebek’in sonuncusu', 'Domuz ve geyik sende. Şakayık samanını oynadın, alanda iki şakayık var. Hangisi?', 'Şakayık kelebeği Domuz-Geyik-Kelebek’i tamamlar, 5 puan.', 'Mavi şakayık şeridi tek bir şerit. Kelebek, domuz ve geyikle 5 puan eder.',
  'Rakip yaklaştı', 'Kırmızı şeritlerle 5 puanın var. Rakipte domuz ve geyik var, kelebek alanda.', 'Rakip bir şakayıkla kelebeği alırsa Domuz-Geyik-Kelebek; senin koi-koi’nden sonra iki kat. Dur ve 5 puanı sağlama al.', 'Koi-koi’den sonra kelebeği alırsa yakusu iki kat olur, senin şeritlerin 0 eder.',
  'Henüz 1 puan', 'Beş Hayvan, 1 puan. Rakibin yalnız üç samanı var, senin hâlâ altı kartın var.', 'Durmak yalnız 1 puan getirir. Kiraz şeridi alanda: kiraz perdenle al, Kırmızı şeritler 5 puan. Rakip yakudan uzak.', '1 puanda durmak erken. Kiraz perden kiraz şeridini alabilir (Kırmızı şeritler, 5); rakip hâlâ uzak.',
  '7 puana ulaşınca', 'Yağmurlu Dört Işık, 7 puan. Rakipte domuz ve geyik var, kelebek alanda.', '7 ve üzeri ikiye katlanır: şimdi durmak 14 eder. Tek bir kelebek rakibe Domuz-Geyik-Kelebek verir; devam riskli.', 'Koi-koi’den sonra kelebeği alırsa yakusu iki kat olur. Şimdi durmak kesin 14.'],
id: ['Pelajaran', 'Dari mengenali kartu hingga menyusun yaku dan memutuskan koi-koi — dengan kartu sungguhan.', 'Kembali ke daftar', 'Akhiri pelajaran', 'Berikutnya', 'Benar!', 'Bukan itu', 'Lulus', 'Belum dicoba', 'Persiapan', 'Mengerti', 'Berhenti', 'Koi-koi', 'Meja', 'Tangan', 'Ambilanmu', 'Ambilan lawan', 'Kartu dimainkan', 'Kartu',
  'Kartu dan bulan', 'Kenali kartu sebulan dan apa yang bisa diambil.', 'Yaku', 'Kartu mana yang membentuk yaku dan berapa poinnya.', 'Memutuskan koi-koi', 'Berhenti, atau koi-koi dan lanjut?',
  'Tanaman sama, bulan sama', 'Atas: empat krisan (September). Bawah: empat maple (Oktober). Bentuk dan warna bunga menunjukkan bulannya.',
  'Yaku adalah kumpulan ambilan', 'Tiga pita merah bertulisan (pinus, plum, sakura) membentuk Pita merah, 5 poin. Yaku adalah kumpulan kartu yang kamu ambil.',
  'Berhenti atau koi-koi', 'Tirai sakura, cawan sake, bulan. Dengan yaku pilih: “Berhenti” mengamankan poin, “Koi-koi” lanjut. Jika lawan lalu membuat yaku, poinnya dua kali lipat.',
  'Iris atau wisteria', 'Kartumu pita iris (Mei). Pilih kartu meja dari bulan yang sama.', 'Iris dengan jembatan adalah Mei: bunga ungu tegak, daun seperti pedang, dan jembatan.', 'Itu bulan lain. Wisteria (April) menjuntai bergerombol; iris mekar ke atas.',
  'Tiga dari satu bulan', 'Ada tiga sakura di meja. Kartu tangan mana yang mengambil paling banyak?', 'Bila ada tiga kartu sebulan di meja, kartu keempat mengambil ketiganya — termasuk tirai sakura, sebuah Cahaya.', 'Ampas pinus hanya mengambil satu pinus; ampas paulownia tak menemukan paulownia. Ampas sakura mengambil ketiga sakura.',
  'Ambil yang mana?', 'Kamu memainkan ampas semak semanggi, ada dua di meja. Ambil yang mana?', 'Babi hutan adalah Hewan, bagian dari Babi-Rusa-Kupu. Ambil kartu yang menuju yaku, bukan ampas.', 'Ampas hanya satu ampas. Babi hutan mendekatkan Babi-Rusa-Kupu (5 poin) dan tak jatuh ke lawan.',
  'Empat Cahaya atau Hujan', 'Kamu punya tiga Cahaya (bangau, tirai, bulan). Kartu mana yang paling banyak poinnya?', 'Ampas paulownia mengambil foniks: Empat Cahaya, 8 poin. Ampas dedalu mengambil pria hujan: Empat Hujan, 7.', 'Dengan pria hujan menjadi Empat Hujan, 7; ampas pinus tak menemukan pinus. Foniks memberi Empat Cahaya, 8.',
  'Melihat bulan', 'Kamu punya bulan. Kartu mana yang langsung membuat yaku?', 'Ampas krisan mengambil cawan sake: bersama bulan menjadi Melihat bulan, 5 poin.', 'Angsa atau kupu-kupu tidak membuat yaku. Cawan sake membuatnya: Melihat bulan.',
  'Kartu terakhir Babi-Rusa-Kupu', 'Kamu punya babi hutan dan rusa. Kamu memainkan ampas peoni, ada dua peoni di meja. Ambil yang mana?', 'Kupu-kupu peoni melengkapi Babi-Rusa-Kupu, 5 poin.', 'Pita biru peoni hanya satu pita. Kupu-kupu bersama babi dan rusa bernilai 5 poin.',
  'Lawan sudah dekat', 'Kamu punya Pita merah, 5 poin. Lawan memegang babi hutan dan rusa, kupu-kupu ada di meja.', 'Jika lawan mengambil kupu-kupu dengan peoni, ia mendapat Babi-Rusa-Kupu — dua kali lipat setelah koi-koi-mu. Berhenti dan amankan 5 poin.', 'Setelah koi-koi, jika ia mengambil kupu-kupu, yakunya berlipat dua dan Pita merahmu bernilai 0.',
  'Baru 1 poin', 'Lima Hewan, 1 poin. Lawan hanya punya tiga ampas, kamu masih punya enam kartu.', 'Berhenti hanya memberi 1 poin. Pita sakura ada di meja: ambil dengan tirai sakuramu untuk Pita merah, 5 poin. Lawan masih jauh dari yaku.', 'Berhenti di 1 poin terlalu cepat. Tirai sakuramu bisa mengambil pita sakura (Pita merah, 5), dan lawan masih jauh.',
  'Saat mencapai 7', 'Empat Hujan, 7 poin. Lawan memegang babi hutan dan rusa, kupu-kupu di meja.', '7 poin atau lebih berlipat dua: berhenti sekarang memberi 14. Satu kupu-kupu memberi lawan Babi-Rusa-Kupu; lanjut itu berisiko.', 'Setelah koi-koi, jika ia mengambil kupu-kupu, yakunya berlipat dua. Berhenti sekarang memberi 14 pasti.'],
hi: ['पाठ', 'पत्ते पहचानने से याकु बनाने और कोई-कोई के फ़ैसले तक — असली पत्तों पर।', 'सूची पर लौटें', 'पाठ छोड़ें', 'अगला', 'सही!', 'यह नहीं', 'पास', 'बाकी', 'तैयारी', 'समझ गया', 'रुकें', 'कोई-कोई', 'मेज़', 'हाथ', 'आपके उठाए', 'विरोधी के उठाए', 'खेला गया पत्ता', 'पत्ते',
  'पत्ते और महीने', 'एक ही महीने के पत्ते पहचानें और देखें क्या उठा सकते हैं।', 'याकु', 'कौन-सा पत्ता याकु बनाता है और कितने अंक।', 'कोई-कोई का फ़ैसला', 'रुकें या कोई-कोई कहकर आगे खेलें?',
  'एक पौधा, एक महीना', 'ऊपर गुलदाउदी के चार (सितंबर), नीचे मेपल के चार (अक्टूबर)। फूल का आकार और रंग महीना बताते हैं।',
  'याकु उठाए पत्तों का समूह है', 'लिखी हुई तीन लाल पट्टियाँ (चीड़, आलूबुखारा, चेरी) “लाल पट्टियाँ” 5 अंक बनाती हैं। याकु उठाए पत्तों का समूह है।',
  'रुकें या कोई-कोई', 'चेरी परदा, साके प्याला, चाँद। याकु बनने पर: “रुकें” अंक पक्के करता है, “कोई-कोई” आगे खेलता है। फिर विरोधी याकु बना ले तो उसके अंक दोगुने।',
  'आइरिस या विस्टेरिया', 'आपका पत्ता आइरिस की पट्टी (मई) है। मेज़ से उसी महीने का पत्ता चुनें।', 'पुल वाला आइरिस मई है: ऊपर खिलते बैंगनी फूल, तलवार जैसी पत्तियाँ और पुल।', 'वह दूसरे महीने का है। विस्टेरिया (अप्रैल) गुच्छों में लटकता है; आइरिस ऊपर खिलता है।',
  'एक महीने के तीन', 'मेज़ पर तीन चेरी हैं। हाथ का कौन-सा पत्ता सबसे ज़्यादा उठाएगा?', 'मेज़ पर एक महीने के तीन हों तो चौथा तीनों उठा लेता है — चेरी परदा (प्रकाश) भी।', 'चीड़ का भूसा केवल एक चीड़ उठाता है; पाउलोनिया के भूसे को पाउलोनिया नहीं मिलता। चेरी का भूसा तीनों उठाता है।',
  'कौन-सा उठाएँ?', 'आपने हागी का भूसा खेला, मेज़ पर दो हागी हैं। कौन-सा उठाएँगे?', 'जंगली सूअर पशु पत्ता है, सूअर-हिरन-तितली का हिस्सा। भूसे की जगह याकु की ओर ले जाने वाला पत्ता उठाएँ।', 'भूसा बस एक भूसा है। सूअर सूअर-हिरन-तितली (5 अंक) के पास लाता है और विरोधी को नहीं मिलता।',
  'चार प्रकाश या बरसाती', 'आपके पास तीन प्रकाश (सारस, परदा, चाँद) हैं। कौन-सा पत्ता सबसे ज़्यादा अंक देगा?', 'पाउलोनिया का भूसा फ़ीनिक्स उठाता है: चार प्रकाश, 8 अंक। विलो का भूसा बारिश वाले आदमी को: बरसाती, 7।', 'बारिश वाले आदमी के साथ बरसाती चार प्रकाश, 7; चीड़ के भूसे को चीड़ नहीं मिलता। फ़ीनिक्स से चार प्रकाश, 8।',
  'चाँद-दर्शन', 'आपके पास चाँद है। कौन-सा पत्ता तुरंत याकु बनाएगा?', 'गुलदाउदी का भूसा साके प्याला उठाता है: चाँद के साथ चाँद-दर्शन, 5 अंक।', 'हंस या तितली से याकु नहीं बनता। साके प्याले से बनता है: चाँद-दर्शन।',
  'सूअर-हिरन-तितली का आख़िरी', 'आपके पास सूअर और हिरन हैं। पियोनी का भूसा खेला, मेज़ पर दो पियोनी हैं। कौन-सा?', 'पियोनी की तितली सूअर-हिरन-तितली पूरा करती है, 5 अंक।', 'पियोनी की नीली पट्टी बस एक पट्टी है। तितली, सूअर-हिरन के साथ 5 अंक देती है।',
  'विरोधी पास है', 'आपके पास लाल पट्टियाँ, 5 अंक। विरोधी के पास सूअर और हिरन हैं, तितली मेज़ पर है।', 'विरोधी पियोनी से तितली उठा ले तो सूअर-हिरन-तितली — आपके कोई-कोई के बाद दोगुना। रुककर 5 अंक पक्के करें।', 'कोई-कोई के बाद वह तितली उठा ले तो उसका याकु दोगुना और आपकी लाल पट्टियाँ 0।',
  'अभी 1 अंक', 'पाँच पशु पत्ते, 1 अंक। विरोधी के पास बस तीन भूसा, आपके पास अभी छह पत्ते।', 'रुकने से बस 1 अंक। चेरी पट्टी मेज़ पर है: अपने चेरी परदे से उठाएँ तो लाल पट्टियाँ, 5 अंक। विरोधी याकु से दूर है।', '1 अंक पर रुकना जल्दी है। आपका चेरी परदा चेरी पट्टी उठा सकता है (लाल पट्टियाँ, 5), विरोधी अभी दूर है।',
  '7 अंक पर', 'बरसाती चार प्रकाश, 7 अंक। विरोधी के पास सूअर और हिरन हैं, तितली मेज़ पर।', '7 या ज़्यादा दोगुना: अभी रुकें तो 14। एक तितली विरोधी को सूअर-हिरन-तितली देगी — आगे खेलना जोखिम भरा।', 'कोई-कोई के बाद वह तितली उठा ले तो उसका याकु दोगुना। अभी रुकें तो पक्के 14।'],
ar: ['الدروس', 'من تمييز الأوراق إلى تكوين الياكو وقرار كوي-كوي — بأوراق حقيقية.', 'العودة إلى القائمة', 'إنهاء الدرس', 'التالي', 'صحيح!', 'ليست هذه', 'ناجح', 'لم يُجرَّب', 'تمهيد', 'فهمت', 'توقّف', 'كوي-كوي', 'الطاولة', 'اليد', 'ما أخذته', 'ما أخذه الخصم', 'الورقة الملعوبة', 'أوراق',
  'الأوراق والأشهر', 'ميّز أوراق الشهر نفسه وما يمكنك أخذه.', 'الياكو', 'أي ورقة تكوّن ياكو وكم نقطة.', 'قرار كوي-كوي', 'التوقف أم قول كوي-كوي والمواصلة؟',
  'النبتة نفسها، الشهر نفسه', 'في الأعلى أوراق الأقحوان الأربع (سبتمبر)، وفي الأسفل أوراق القيقب الأربع (أكتوبر). شكل الزهرة ولونها يدلان على الشهر.',
  'الياكو مجموعات من المأخوذ', 'الأشرطة الحمراء الثلاثة المكتوبة (الصنوبر والبرقوق والكرز) تكوّن «الأشرطة الحمراء»، 5 نقاط. الياكو مجموعة من الأوراق التي أخذتها.',
  'توقّف أم كوي-كوي', 'ستارة الكرز وكأس الساكي والقمر. مع الياكو تختار: «توقّف» لتثبيت النقاط أو «كوي-كوي» للمواصلة. إن كوّن الخصم بعدها ياكو تتضاعف نقاطه.',
  'السوسن أم الوستارية', 'ورقتك شريط السوسن (مايو). اختر من الطاولة ورقة الشهر نفسه.', 'السوسن ذو الجسر هو مايو: أزهار بنفسجية متجهة لأعلى وأوراق كالسيوف والجسر.', 'هذه من شهر آخر. الوستارية (أبريل) تتدلى عناقيد، والسوسن يزهر لأعلى.',
  'ثلاث من شهر واحد', 'على الطاولة ثلاث أوراق كرز. أي ورقة في يدك تأخذ أكثر؟', 'حين تكون ثلاث أوراق من شهر على الطاولة، تأخذ الرابعة الثلاث معًا — ومنها ستارة الكرز (نور).', 'قش الصنوبر يأخذ صنوبرة واحدة، وقش البولونيا لا يجد بولونيا. قش الكرز يأخذ الثلاث.',
  'أيّهما تأخذ؟', 'لعبت قش البرسيم الشجيري، وعلى الطاولة ورقتان منه. أيهما تأخذ؟', 'الخنزير البري ورقة حيوان، من «الخنزير-الغزال-الفراشة». خذ الورقة التي تقود إلى ياكو لا القش.', 'القش ورقة قش واحدة. الخنزير يقرّبك من «الخنزير-الغزال-الفراشة» (5 نقاط) ولا يذهب للخصم.',
  'الأنوار الأربعة أم الممطرة', 'لديك ثلاثة أنوار (الكركي والستارة والقمر). أي ورقة تعطي أكثر؟', 'قش البولونيا يأخذ العنقاء: الأنوار الأربعة، 8 نقاط. قش الصفصاف يأخذ رجل المطر: الممطرة، 7.', 'مع رجل المطر تكون الأنوار الأربعة الممطرة، 7؛ وقش الصنوبر لا يجد صنوبرًا. العنقاء تعطي الأنوار الأربعة، 8.',
  'مشاهدة القمر', 'لديك القمر. أي ورقة تكوّن ياكو فورًا؟', 'قش الأقحوان يأخذ كأس الساكي: مع القمر «مشاهدة القمر»، 5 نقاط.', 'الإوز أو الفراشة لا تكوّن ياكو. كأس الساكي تكوّنه: مشاهدة القمر.',
  'آخر «الخنزير-الغزال-الفراشة»', 'لديك الخنزير والغزال. لعبت قش الفاوانيا، وعلى الطاولة فاوانيتان. أيهما؟', 'فراشة الفاوانيا تكمل «الخنزير-الغزال-الفراشة»، 5 نقاط.', 'شريط الفاوانيا الأزرق شريط واحد فقط. الفراشة مع الخنزير والغزال تعطي 5 نقاط.',
  'الخصم قريب', 'لديك الأشرطة الحمراء، 5 نقاط. لدى الخصم الخنزير والغزال، والفراشة على الطاولة.', 'إن أخذ الخصم الفراشة بفاوانيا كوّن «الخنزير-الغزال-الفراشة»، مضاعفًا بعد كوي-كوي الخاص بك. توقّف واحفظ نقاطك الخمس.', 'بعد كوي-كوي، إن أخذ الفراشة تضاعف ياكوه وصارت أشرطتك الحمراء صفرًا.',
  'نقطة واحدة فقط', 'خمس أوراق حيوان، نقطة واحدة. لدى الخصم ثلاث أوراق قش فقط، ولديك ست أوراق.', 'التوقف يعطي نقطة واحدة فقط. شريط الكرز على الطاولة: خذه بستارة الكرز في يدك لتكوّن الأشرطة الحمراء، 5 نقاط. الخصم بعيد عن الياكو.', 'التوقف عند نقطة واحدة مبكر. ستارة الكرز تستطيع أخذ شريط الكرز (الأشرطة الحمراء، 5)، والخصم ما زال بعيدًا.',
  'عند بلوغ 7', 'الأنوار الأربعة الممطرة، 7 نقاط. لدى الخصم الخنزير والغزال، والفراشة على الطاولة.', '7 نقاط فأكثر تتضاعف: التوقف الآن يعطي 14. فراشة واحدة تعطي الخصم «الخنزير-الغزال-الفراشة»؛ المواصلة مخاطرة.', 'بعد كوي-كوي، إن أخذ الفراشة تضاعف ياكوه. التوقف الآن يعطي 14 مؤكدة.'],
};
const T = {};
for (const L in V) { T[L] = {}; KEYS.forEach((k, i) => { T[L][k] = V[L][i]; }); }
for (const L in L12) { if (L12[L].length !== KEYS.length) console.warn('lessons', L, L12[L].length, KEYS.length); T[L] = {}; KEYS.forEach((k, i) => { T[L][k] = L12[L][i]; }); }
const t = k => { const L = A.LANG(); return (T[L] && T[L][k]) || T.en[k] || k; };
const E = s => A.esc(s);

let prog = {}; try { prog = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(prog)); } catch (e) {} };
let cat = 'months';
const M = () => document.getElementById('lessonModal');
function list() {
  const c = CATS.find(x => x.id === cat);
  const tabs = CATS.map(x => { const n = x.items.filter(i => prog[i.id]).length; return `<button type="button" data-cat="${x.id}" class="${x.id === cat ? 'on' : ''}">${E(t('c.' + x.id))} <small>${n}/${x.items.length}</small></button>`; }).join('');
  const n = c.items.filter(i => prog[i.id]).length;
  const all = [c.prep, ...c.items];
  M().innerHTML = `<h2>${E(t('h'))}</h2><p class="muted">${E(t('lead'))}</p><div class="ng-tabs">${tabs}</div>
    <div class="ls-head"><b>${E(t('c.' + cat))}</b><span>${E(t('c.' + cat + '.d'))}</span><div class="ls-bar"><i style="width:${100 * n / c.items.length}%"></i></div></div>
    <div class="ls-grid">${all.map((it, i) => `<button type="button" class="ls-item" data-it="${it.id}"><div class="ls-thumb">${C.face(it.rows[it.rows.length - 1][1][0])}</div><div><small>${i ? 'STEP ' + i : E(t('prep'))} ・ ${E(t(prog[it.id] ? 'done' : 'todo'))}</small><b>${E(t(it.id + '.t'))}</b><p>${E(t(it.id + (i ? '.q' : '.b')))}</p></div></button>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="mbtn" data-close>${E(A.t('close'))}</button></div>`;
}
function find(id) { for (const c of CATS) { if (c.prep.id === id) return { c, it: c.prep, prep: true }; const it = c.items.find(i => i.id === id); if (it) return { c, it }; } return null; }
function item(id) {
  const { it, prep } = find(id);
  const tapRow = prep ? -1 : it.tapRow;
  const rows = it.rows.map(([lab, ids], ri) => `<div class="hfr-row"><b>${E(t(lab))}</b><div class="hfr-cards">${ids.map(cid => `<div class="hf ${ri === tapRow && (!it.only || it.only.includes(cid)) ? 'tap' : ''}" data-id="${cid}">${C.face(cid)}</div>`).join('')}</div></div>`).join('');
  const btns = it.kind === 'koi' ? `<div class="hfr-btns"><button type="button" class="mbtn" data-a="koi">${E(t('go'))}</button><button type="button" class="mbtn go" data-a="stop">${E(t('stop'))}</button></div>` : '';
  M().innerHTML = `<h2>${E(t(id + '.t'))}</h2><p class="ls-q">${E(t(id + (prep ? '.b' : '.q')))}</p><div class="hfr ls-board">${rows}${btns}</div><div class="ls-fb" id="lsFb"></div>
    <div class="modal-actions"><button type="button" class="mbtn" data-list>${E(t('back'))}</button><button type="button" class="mbtn go" data-next style="${prep ? '' : 'display:none'}">${E(t(prep ? 'got' : 'next'))}</button></div><button type="button" class="ls-quit" data-close>${E(t('quit'))}</button>`;
  const b = M().querySelector('.ls-board');
  const per = Math.max(...it.rows.map(r => r[1].length)), nr = it.rows.length, extra = it.kind === 'koi' ? 56 : 0;
  const fit = () => { const w = b.clientWidth || 600, h = b.clientHeight || 360;
    b.style.setProperty('--rcw', Math.max(32, Math.min(120, (w - 24 - (per - 1) * 10) / per, (h - extra - nr * 34 - 16) / nr / 1.656)) + 'px'); };
  fit(); requestAnimationFrame(fit);
  if (prep) { prog[id] = 1; saveP(); }
  M().dataset.cur = id;
}
function answer(ok, id) {
  const fb = document.getElementById('lsFb');
  fb.innerHTML = `<b class="${ok ? 'ok' : 'ng'}">${E(t(ok ? 'ok' : 'ng'))}</b> ${E(t(id + (ok ? '.ok' : '.ng')))}`;
  A.sfx(ok ? 'ok' : 'ng');
  if (ok) { prog[id] = 1; saveP(); M().querySelector('[data-next]').style.display = ''; }
}
document.addEventListener('click', e => {
  const m = M(); if (!m || !m.contains(e.target)) return;
  const tab = e.target.closest('[data-cat]'); if (tab) { cat = tab.dataset.cat; list(); return; }
  const li = e.target.closest('[data-it]'); if (li) { item(li.dataset.it); return; }
  if (e.target.closest('[data-list]')) { list(); return; }
  if (e.target.closest('[data-close]')) { A.closeOv('#lessonOverlay'); return; }
  if (e.target.closest('[data-next]')) {
    const all = CATS.flatMap(c => [c.prep.id, ...c.items.map(i => i.id)]), i = all.indexOf(m.dataset.cur);
    if (i + 1 < all.length) { cat = CATS.find(c => c.prep.id === all[i + 1] || c.items.some(x => x.id === all[i + 1])).id; item(all[i + 1]); } else list();
    return;
  }
  const id = m.dataset.cur; if (!id) return;
  const f = find(id); if (!f || f.prep) return;
  const it = f.it;
  if (m.querySelector('[data-next]').style.display === '') return;   // already answered
  const card = e.target.closest('.hf.tap'); if (card && it.kind !== 'koi') { const ok = +card.dataset.id === it.ans; card.classList.add(ok ? 'ok' : 'bad'); answer(ok, id); return; }
  const ch = e.target.closest('[data-a]'); if (ch && it.kind === 'koi') answer(ch.dataset.a === it.ans, id);
});
window.HFLessons = { open() { A.openOv('#lessonOverlay'); M().dataset.cur = ''; list(); }, PROBLEMS, koiState, CATS };
})();
