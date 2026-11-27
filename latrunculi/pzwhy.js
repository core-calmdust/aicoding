/* Ludus latrunculorum puzzles ("take a counter within N moves", Seneca rules): what happened on the board after a move off the
   solution (2026-11-27 担当D). The 2D (latrunculi/app.js puzzleMove, the neutral words below in 14 languages); checked by
   tools/lesson-verify-latrunculi.js (⑦⑧⑨ — every wrong move at every stage of the main line × the defender's reply).
   The 詰め rule (claude/game-conventions-addendum.md): a move off the solution is not taken back and the right move is not shown;
   the defender answers with its most stubborn reply (engine.js goalReply — the 2D and the 3D ask the same engine) and the result
   says what is on the board:
     wEnd     — the game ended with that move (a side down to one counter / no move left) without the goal
     wLastPen — the last move: the lead grew, but one of your counters stands face down and is removed on the opponent's turn
     wLastBlk — the last move enclosed a counter, but it is removed only at the start of your next turn: too late
     wLast    — the last move: the difference in captures did not grow
     wFree    — the reply enclosed one of your enclosing counters: the counter you held is free again
     wTook    — the reply removed your face-down counter (the red mark)
     wHit     — the reply enclosed one of your counters (it is face down, and goes at the start of the opponent's next turn)
     wRun     — any other reply (the counter under threat stepped away, or a gap was closed)
   After a reply the words end with "the moves left ({n}) are not enough": the checker proves it (no first move reaches the goal
   within n against every defence).
   facts(o) with o = { E, me, G (engine goalOf), pre (before the move), mid (after it), after (after the reply, or null), reply,
   left (own moves left after the reply), last } → { k, v, mark } (mark: the square of the red mark, or -1).
   window.LatrPzWhy = { facts, text, T, KEYS } · module.exports the same. */
(function () {
  'use strict';
  const KEYS = ['wEnd', 'wLastPen', 'wLastBlk', 'wLast', 'wFree', 'wTook', 'wHit', 'wRun', 'answer'];
  const lead = (pos, me) => pos.cap[me - 1] - pos.cap[2 - me];
  const faceDown = (pos, p) => { for (let i = 0; i < pos.sq.length; i++) if (pos.sq[i] === p && pos.inc[i]) return i; return -1; };
  function facts(o) {
    const E = o.E, me = o.me, opp = 3 - me, mid = o.mid, pre = o.pre;
    if (E.judge(mid).over) return { k: 'wEnd', v: {}, mark: -1 };
    if (o.last || !o.after) {
      if (lead(mid, me) >= o.G.base + (o.G.gain || 1)) return { k: 'wLastPen', v: {}, mark: faceDown(mid, me) };
      const fx = pre && o.move != null ? E.effect(pre, o.move) : null;
      if (fx && fx.blocks.length) return { k: 'wLastBlk', v: {}, mark: fx.blocks[0] };
      return { k: 'wLast', v: {}, mark: -1 };
    }
    const r = o.reply, n = o.left, fx = E.effect(mid, r), to = E.mTo(r);
    if (fx.frees.some(i => mid.sq[i] === opp)) return { k: 'wFree', v: { n }, mark: to };
    if (fx.rm >= 0) return { k: 'wTook', v: { n }, mark: fx.rm };
    if (fx.blocks.length) return { k: 'wHit', v: { n }, mark: fx.blocks[0] };
    return { k: 'wRun', v: { n }, mark: to };
  }
  const T = {
    ja: { answer: '「答えを見る」で正解の手順を見られます。',
      wEnd: 'その手で対局が終わってしまい、相手の駒を取れませんでした。',
      wLastPen: '相手の駒は取れましたが、赤い印のあなたの駒が裏返ったままです。相手の番のはじめに取り除かれるので、差は広がりません。',
      wLastBlk: '赤い印の駒をはさんで裏返しましたが、取り除けるのは次のあなたの番のはじめです。もう手が残っていないので、間に合いません。',
      wLast: 'その手では、取った数の差が広がっていません。',
      wFree: '相手は赤い印の手で、はさんでいたあなたの駒をはさみ返しました。裏返っていた相手の駒は表に戻り、残り{n}手では取れません。',
      wTook: '相手は、裏返っていたあなたの駒（赤い印）を取り除きました。残り{n}手では、取った数の差を広げられません。',
      wHit: '相手は、赤い印のあなたの駒をはさんで裏返しました。このままだと相手の番のはじめに取り除かれ、残り{n}手では差を広げられません。',
      wRun: '相手は赤い印のマスへ動きました。相手にしっかり守られると、残り{n}手では駒を取れません。' },
    en: { answer: 'Press “Show answer” to see the solution.',
      wEnd: 'That move ended the game before you took a counter.',
      wLastPen: 'You took a counter, but your counter at the red mark is still face down — it is removed at the start of the opponent’s turn, so you are not ahead.',
      wLastBlk: 'You turned the counter at the red mark face down, but it is removed only at the start of your next turn — and you have no moves left.',
      wLast: 'That move did not put you further ahead in captures.',
      wFree: 'The opponent answered at the red mark and enclosed one of your enclosing counters. Its face-down counter is free again, and the moves left ({n}) are not enough to take one.',
      wTook: 'The opponent removed your face-down counter (the red mark). The moves left ({n}) are not enough to get ahead in captures.',
      wHit: 'The opponent enclosed your counter at the red mark and turned it face down. Left as it is, it goes at the start of the opponent’s turn, and the moves left ({n}) are not enough to get ahead.',
      wRun: 'The opponent moved to the red mark. Against that defence the moves left ({n}) are not enough to take a counter.' },
    zh: { answer: '按“看答案”可以看到正解。',
      wEnd: '这一步让对局结束了，没能吃掉对方的棋子。',
      wLastPen: '虽然吃掉了对方的棋子，但红色标记处你的棋子仍是翻面状态，会在对方回合开始时被移除，所以没有领先。',
      wLastBlk: '你把红色标记处的棋子夹住翻面了，但要到你下一回合开始才能移除——已经没有步数了，来不及。',
      wLast: '这一步没有拉开吃子数的差距。',
      wFree: '对手在红色标记处反夹了你用来夹击的棋子。被翻面的对方棋子恢复正面，剩下{n}步吃不到子。',
      wTook: '对手移除了你翻面的棋子（红色标记）。剩下{n}步无法拉开吃子数的差距。',
      wHit: '对手夹住了红色标记处你的棋子并把它翻面。它会在对手下一回合被移除，剩下{n}步无法拉开差距。',
      wRun: '对手走到了红色标记处。在这样的防守下，剩下{n}步吃不到子。' },
    'zh-TW': { answer: '按「看答案」可以看到正解。',
      wEnd: '這一步讓對局結束了，沒能吃掉對方的棋子。',
      wLastPen: '雖然吃掉了對方的棋子，但紅色標記處你的棋子仍是翻面狀態，會在對方回合開始時被移除，所以沒有領先。',
      wLastBlk: '你把紅色標記處的棋子夾住翻面了，但要到你下一回合開始才能移除——已經沒有步數了，來不及。',
      wLast: '這一步沒有拉開吃子數的差距。',
      wFree: '對手在紅色標記處反夾了你用來夾擊的棋子。被翻面的對方棋子恢復正面，剩下{n}步吃不到子。',
      wTook: '對手移除了你翻面的棋子（紅色標記）。剩下{n}步無法拉開吃子數的差距。',
      wHit: '對手夾住了紅色標記處你的棋子並把它翻面。它會在對手下一回合被移除，剩下{n}步無法拉開差距。',
      wRun: '對手走到了紅色標記處。在這樣的防守下，剩下{n}步吃不到子。' },
    ko: { answer: '“정답 보기”로 정답 수순을 볼 수 있습니다.',
      wEnd: '그 수로 대국이 끝나 버려 상대 말을 잡지 못했습니다.',
      wLastPen: '상대 말은 잡았지만, 빨간 표시의 내 말이 뒤집힌 채입니다. 상대 차례가 시작될 때 제거되므로 차이가 벌어지지 않습니다.',
      wLastBlk: '빨간 표시의 말을 끼워 뒤집었지만, 제거는 다음 내 차례의 처음입니다. 남은 수가 없어 늦었습니다.',
      wLast: '그 수로는 잡은 수의 차이가 벌어지지 않았습니다.',
      wFree: '상대가 빨간 표시의 수로, 끼우고 있던 내 말을 되끼웠습니다. 뒤집혔던 상대 말이 다시 앞면이 되어, 남은 {n}수로는 잡을 수 없습니다.',
      wTook: '상대가 뒤집혀 있던 내 말(빨간 표시)을 제거했습니다. 남은 {n}수로는 잡은 수의 차이를 벌릴 수 없습니다.',
      wHit: '상대가 빨간 표시의 내 말을 끼워 뒤집었습니다. 다음 상대 차례에 제거되므로, 남은 {n}수로는 차이를 벌릴 수 없습니다.',
      wRun: '상대가 빨간 표시의 칸으로 움직였습니다. 이렇게 막으면 남은 {n}수로는 말을 잡을 수 없습니다.' },
    es: { answer: 'Pulsa «Solución» para ver la solución completa.',
      wEnd: 'Esa jugada terminó la partida antes de que capturaras una ficha.',
      wLastPen: 'Capturaste una ficha, pero tu ficha de la marca roja sigue boca abajo: se retira al empezar el turno del rival, así que no quedas por delante.',
      wLastBlk: 'Pusiste boca abajo la ficha de la marca roja, pero solo se retira al empezar tu próximo turno, y ya no te quedan jugadas.',
      wLast: 'Esa jugada no aumentó tu ventaja en capturas.',
      wFree: 'El rival respondió en la marca roja y encerró una de tus fichas atacantes. Su ficha boca abajo queda libre otra vez, y las jugadas que quedan ({n}) no alcanzan para capturar.',
      wTook: 'El rival retiró tu ficha boca abajo (la marca roja). Las jugadas que quedan ({n}) no alcanzan para sacar ventaja en capturas.',
      wHit: 'El rival encerró tu ficha de la marca roja y la puso boca abajo. Se retira en su próximo turno, así que las jugadas que quedan ({n}) no alcanzan para sacar ventaja.',
      wRun: 'El rival se movió a la marca roja. Con esa defensa, las jugadas que quedan ({n}) no alcanzan para capturar una ficha.' },
    fr: { answer: 'Appuie sur « Solution » pour voir la suite gagnante.',
      wEnd: 'Ce coup a terminé la partie avant que tu prennes un pion.',
      wLastPen: 'Tu as pris un pion, mais ton pion sur la marque rouge est toujours retourné : il est retiré au début du tour adverse, donc tu ne passes pas devant.',
      wLastBlk: 'Tu as retourné le pion sur la marque rouge, mais il n’est retiré qu’au début de ton prochain tour — et il ne te reste plus de coup.',
      wLast: 'Ce coup n’a pas augmenté ton avance en prises.',
      wFree: 'L’adversaire a répondu sur la marque rouge et a encadré un de tes pions qui encadraient. Son pion retourné est de nouveau libre, et les coups restants ({n}) ne suffisent plus pour prendre.',
      wTook: 'L’adversaire a retiré ton pion retourné (la marque rouge). Les coups restants ({n}) ne suffisent plus pour passer devant en prises.',
      wHit: 'L’adversaire a encadré ton pion sur la marque rouge et l’a retourné. Il sera retiré à son prochain tour, donc les coups restants ({n}) ne suffisent plus pour passer devant.',
      wRun: 'L’adversaire s’est déplacé sur la marque rouge. Face à cette défense, les coups restants ({n}) ne suffisent plus pour prendre un pion.' },
    pt: { answer: 'Toque em “Solução” para ver a sequência certa.',
      wEnd: 'Esse lance terminou a partida antes de você capturar uma peça.',
      wLastPen: 'Você capturou uma peça, mas a sua peça na marca vermelha continua virada: ela sai no começo do turno do rival, então você não fica à frente.',
      wLastBlk: 'Você virou a peça da marca vermelha, mas ela só sai no começo do seu próximo turno — e não restam lances.',
      wLast: 'Esse lance não aumentou a sua vantagem em capturas.',
      wFree: 'O rival respondeu na marca vermelha e cercou uma das suas peças que cercavam. A peça virada dele ficou livre de novo, e os lances restantes ({n}) não bastam para capturar.',
      wTook: 'O rival retirou a sua peça virada (a marca vermelha). Os lances restantes ({n}) não bastam para ficar à frente em capturas.',
      wHit: 'O rival cercou a sua peça na marca vermelha e a virou. Ela sai no próximo turno dele, então os lances restantes ({n}) não bastam para ficar à frente.',
      wRun: 'O rival foi para a marca vermelha. Contra essa defesa, os lances restantes ({n}) não bastam para capturar uma peça.' },
    de: { answer: 'Mit „Lösung“ siehst du die richtige Zugfolge.',
      wEnd: 'Dieser Zug hat die Partie beendet, bevor du einen Stein geschlagen hast.',
      wLastPen: 'Du hast einen Stein geschlagen, aber dein Stein auf der roten Markierung liegt noch umgedreht — er wird zu Beginn des gegnerischen Zugs entfernt, also liegst du nicht vorn.',
      wLastBlk: 'Du hast den Stein auf der roten Markierung umgedreht, aber er wird erst zu Beginn deines nächsten Zugs entfernt — und du hast keinen Zug mehr.',
      wLast: 'Dieser Zug hat deinen Vorsprung beim Schlagen nicht vergrößert.',
      wFree: 'Der Gegner antwortete auf der roten Markierung und schloss einen deiner einschließenden Steine ein. Sein umgedrehter Stein ist wieder frei, und die übrigen Züge ({n}) reichen nicht mehr zum Schlagen.',
      wTook: 'Der Gegner entfernte deinen umgedrehten Stein (die rote Markierung). Die übrigen Züge ({n}) reichen nicht, um beim Schlagen vorn zu liegen.',
      wHit: 'Der Gegner schloss deinen Stein auf der roten Markierung ein und drehte ihn um. Er wird in seinem nächsten Zug entfernt, also reichen die übrigen Züge ({n}) nicht für einen Vorsprung.',
      wRun: 'Der Gegner zog auf die rote Markierung. Gegen diese Abwehr reichen die übrigen Züge ({n}) nicht, um einen Stein zu schlagen.' },
    ru: { answer: 'Нажмите «Показать ответ», чтобы увидеть решение.',
      wEnd: 'Этот ход закончил партию раньше, чем вы взяли фишку.',
      wLastPen: 'Вы взяли фишку, но ваша фишка на красной отметке всё ещё перевёрнута — её снимут в начале хода соперника, так что вы не впереди.',
      wLastBlk: 'Вы перевернули фишку на красной отметке, но снять её можно только в начале вашего следующего хода — а ходов больше нет.',
      wLast: 'Этот ход не увеличил ваш перевес во взятиях.',
      wFree: 'Соперник ответил на красную отметку и окружил одну из ваших окружающих фишек. Его перевёрнутая фишка снова свободна, и оставшихся ходов ({n}) не хватает, чтобы взять фишку.',
      wTook: 'Соперник снял вашу перевёрнутую фишку (красная отметка). Оставшихся ходов ({n}) не хватает, чтобы выйти вперёд по взятиям.',
      wHit: 'Соперник окружил вашу фишку на красной отметке и перевернул её. Её снимут в его следующий ход, так что оставшихся ходов ({n}) не хватает, чтобы выйти вперёд.',
      wRun: 'Соперник пошёл на красную отметку. При такой защите оставшихся ходов ({n}) не хватает, чтобы взять фишку.' },
    tr: { answer: 'Çözümü görmek için “Cevabı göster”e dokun.',
      wEnd: 'Bu hamle, sen bir taş almadan oyunu bitirdi.',
      wLastPen: 'Bir taş aldın ama kırmızı işaretteki taşın hâlâ ters duruyor; rakibin sırasının başında alınacağı için öne geçemiyorsun.',
      wLastBlk: 'Kırmızı işaretteki taşı sıkıştırıp ters çevirdin ama o ancak bir sonraki sıranın başında alınır — ve hiç hamlen kalmadı.',
      wLast: 'Bu hamle aldığın taş farkını artırmadı.',
      wFree: 'Rakip kırmızı işarete oynayıp sıkıştıran taşlarından birini sıkıştırdı. Ters duran taşı yeniden serbest; kalan hamleler ({n}) taş almaya yetmez.',
      wTook: 'Rakip ters duran taşını (kırmızı işaret) aldı. Kalan hamleler ({n}) alınan taşlarda öne geçmeye yetmez.',
      wHit: 'Rakip kırmızı işaretteki taşını sıkıştırıp ters çevirdi. Onun bir sonraki sırasında alınacağı için kalan hamleler ({n}) öne geçmeye yetmez.',
      wRun: 'Rakip kırmızı işarete gitti. Bu savunmaya karşı kalan hamleler ({n}) taş almaya yetmez.' },
    id: { answer: 'Tekan “Lihat jawaban” untuk melihat solusinya.',
      wEnd: 'Langkah itu mengakhiri permainan sebelum kamu menangkap bidak.',
      wLastPen: 'Kamu menangkap bidak, tetapi bidakmu di tanda merah masih terbalik — bidak itu diambil di awal giliran lawan, jadi kamu tidak unggul.',
      wLastBlk: 'Kamu membalik bidak di tanda merah, tetapi bidak itu baru diambil di awal giliranmu berikutnya — dan langkahmu sudah habis.',
      wLast: 'Langkah itu tidak menambah keunggulanmu dalam tangkapan.',
      wFree: 'Lawan menjawab di tanda merah dan menjepit salah satu bidak penjepitmu. Bidaknya yang terbalik bebas lagi, dan sisa langkah ({n}) tidak cukup untuk menangkap.',
      wTook: 'Lawan mengambil bidakmu yang terbalik (tanda merah). Sisa langkah ({n}) tidak cukup untuk unggul dalam tangkapan.',
      wHit: 'Lawan menjepit bidakmu di tanda merah dan membaliknya. Bidak itu diambil pada giliran lawan berikutnya, jadi sisa langkah ({n}) tidak cukup untuk unggul.',
      wRun: 'Lawan pindah ke tanda merah. Dengan pertahanan itu, sisa langkah ({n}) tidak cukup untuk menangkap bidak.' },
    hi: { answer: 'हल देखने के लिए “हल” दबाएँ।',
      wEnd: 'उस चाल से खेल खत्म हो गया, और आप कोई मोहरा नहीं ले पाए।',
      wLastPen: 'आपने मोहरा ले लिया, पर लाल निशान पर आपका मोहरा अभी उलटा है — विरोधी की बारी की शुरुआत में वह हटेगा, इसलिए आप आगे नहीं हुए।',
      wLastBlk: 'आपने लाल निशान वाले मोहरे को घेरकर उलट दिया, पर वह आपकी अगली बारी की शुरुआत में ही हटता है — और अब आपकी कोई चाल नहीं बची।',
      wLast: 'उस चाल से लिए गए मोहरों का अंतर नहीं बढ़ा।',
      wFree: 'विरोधी ने लाल निशान पर चलकर आपके घेरने वाले मोहरों में से एक को घेर लिया। उसका उलटा मोहरा फिर से आज़ाद है, और बची चालों ({n}) में मोहरा नहीं लिया जा सकता।',
      wTook: 'विरोधी ने आपका उलटा मोहरा (लाल निशान) हटा दिया। बची चालों ({n}) में लिए गए मोहरों में आगे नहीं निकल सकते।',
      wHit: 'विरोधी ने लाल निशान पर आपके मोहरे को घेरकर उलट दिया। वह विरोधी की अगली बारी में हटेगा, इसलिए बची चालों ({n}) में आगे नहीं निकल सकते।',
      wRun: 'विरोधी लाल निशान पर चला गया। इस बचाव के सामने बची चालों ({n}) में मोहरा नहीं लिया जा सकता।' },
    ar: { answer: 'اضغط «الحل» لترى خطوات الحل.',
      wEnd: 'أنهت تلك النقلة المباراة قبل أن تأسر قطعة.',
      wLastPen: 'أسرتَ قطعة، لكن قطعتك عند العلامة الحمراء ما زالت مقلوبة — تُزال في بداية دور الخصم، فلا تتقدّم.',
      wLastBlk: 'قلبتَ القطعة عند العلامة الحمراء، لكنها لا تُزال إلا في بداية دورك التالي — ولم تبقَ لك نقلات.',
      wLast: 'لم تزد تلك النقلة تقدّمك في عدد الأسرى.',
      wFree: 'ردّ الخصم عند العلامة الحمراء وحاصر إحدى قطعك المحاصِرة. عادت قطعته المقلوبة حرّة، ولا تكفي النقلات الباقية ({n}) لأسر قطعة.',
      wTook: 'أزال الخصم قطعتك المقلوبة (العلامة الحمراء). لا تكفي النقلات الباقية ({n}) للتقدّم في عدد الأسرى.',
      wHit: 'حاصر الخصم قطعتك عند العلامة الحمراء وقلبها. ستُزال في دوره التالي، فلا تكفي النقلات الباقية ({n}) للتقدّم.',
      wRun: 'انتقل الخصم إلى العلامة الحمراء. أمام هذا الدفاع لا تكفي النقلات الباقية ({n}) لأسر قطعة.' },
  };
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));
  function text(lang, k, v) { const L = T[lang] || T.en; const s = L[k] != null ? L[k] : T.en[k]; return s == null ? '' : fill(s, v); }
  const API = { facts, text, T, KEYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.LatrPzWhy = API;
})();
