/* =====================================================================
   Ludus latrunculorum (8×8) on the portal.
   · The board card (levels, sides, modes, 種目): Lv.1 … Lv.20 with the game's descriptions (latrunculi/i18n-lt*.js),
     ratings = the game's RT_LV (latrunculi/app.js). 種目 = the full game's three reconstructions (the card's "size"
     value: 1 Schädler · 2 Piso · 3 Quintana).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's rules and AI —
     ../latrunculi/engine.js on the page (placing, one step / leaps over one's own counters / rook moves, enclosing:
     blocked and removed next turn or taken at once, the corner rule, no going back and forth, the 30-move rule)
     and the same file as a Worker (levels 1..20), asked as latrunculi/app.js asks it.
     Input as on the page: while placing tap an empty square; then tap a counter and the square it goes to. When
     several blocked counters could be removed, tap the one to remove first (one: removed by itself).
     ctx.mode 'pvp': two players take turns on one device (Black first, at the bottom).
     Board and counters: atlas/models/latrunculi.js (the look and the set chosen in the portal's 盤 / 駒 rows).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../latrunculi/', VER = '?v=7';   // same file / version as latrunculi/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.LatrEngine) return Promise.resolve(window.LatrEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.LatrEngine ? res(window.LatrEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // n: the sides · turn / win (two players) · place / rm: what to do · own / stuck / blk / move / taken: a tap that does nothing ·
  // wLast / wStuck / wQuiet: why the game ended · flip: enclosed · took: captured
  const TX = {
    ja: { n: ['黒', '白'], turn: '{p}の番', win: '{p}の勝ち', place: '空いているマスに駒を置こう', rm: '取り除く相手の駒（裏返った駒）を選ぼう', own: '自分の駒を選んでください', stuck: 'その駒はいま動かせません', blk: '裏返った駒は動かせません', move: 'そこへは動かせません', taken: 'そのマスは空いていません', wLast: '駒が1個だけになった', wStuck: '動かせる駒がなくなり、取った数で決着', wQuiet: '30手ずつ駒が取られず、取った数で決着', wTie: '取った数が同じだったので、後手（白）の勝ちです（本作の決まり）', flip: '挟んだ！ 次の番に取れる', took: '{n}個取った！' },
    en: { n: ['Black', 'White'], turn: '{p} to move', win: '{p} wins', place: 'Place a counter on an empty square', rm: 'Pick the turned-over counter to remove', own: 'Pick one of your counters', stuck: 'That counter cannot move now', blk: 'A turned-over counter cannot move', move: 'It cannot go there', taken: 'That square is not empty', wLast: 'One side is down to a single counter', wStuck: 'No counter could move — decided by captures', wQuiet: '30 moves each without a capture — decided by captures', wTie: 'Captures were equal, so White (the second player) wins — this app’s rule', flip: 'Enclosed! Yours to take next turn', took: '{n} taken!' },
    zh: { n: ['黑方', '白方'], turn: '轮到{p}', win: '{p}胜', place: '在空格里放一枚棋子', rm: '选择要拿掉的对方棋子（翻面的棋子）', own: '请选择自己的棋子', stuck: '这枚棋子现在不能动', blk: '翻面的棋子不能动', move: '不能走到那里', taken: '那一格不是空的', wLast: '一方只剩1枚棋子', wStuck: '无子可动，按吃子数决胜', wQuiet: '双方各30步没有吃子，按吃子数决胜', wTie: '吃子数相同，按本作规则后手（白方）获胜', flip: '夹住了！下一回合可以吃掉', took: '吃掉{n}枚！' },
    ko: { n: ['흑', '백'], turn: '{p} 차례', win: '{p} 승리', place: '빈칸에 말을 놓자', rm: '빼낼 상대 말(뒤집힌 말)을 고르자', own: '내 말을 고르세요', stuck: '그 말은 지금 움직일 수 없습니다', blk: '뒤집힌 말은 움직일 수 없습니다', move: '그곳으로는 갈 수 없습니다', taken: '그 칸은 비어 있지 않습니다', wLast: '한쪽 말이 1개만 남았다', wStuck: '움직일 말이 없어 잡은 수로 결정', wQuiet: '30수씩 잡힌 말이 없어 잡은 수로 결정', wTie: '잡은 수가 같아 이 게임의 규칙에 따라 후수(백)의 승리입니다', flip: '끼웠다! 다음 차례에 잡을 수 있다', took: '{n}개 잡았다!' },
    es: { n: ['Negras', 'Blancas'], turn: 'Turno: {p}', win: 'Ganan {p}', place: 'Coloca una ficha en una casilla vacía', rm: 'Elige la ficha volteada que vas a retirar', own: 'Elige una de tus fichas', stuck: 'Esa ficha no puede moverse ahora', blk: 'Una ficha volteada no puede moverse', move: 'No puede ir ahí', taken: 'Esa casilla no está vacía', wLast: 'A un bando le queda una sola ficha', wStuck: 'Nadie podía mover: deciden las capturas', wQuiet: '30 jugadas por bando sin capturas: deciden las capturas', wTie: 'Capturas igualadas: según la regla de esta app, ganan las blancas', flip: '¡Encerrada! Podrás retirarla en tu próximo turno', took: '¡{n} capturadas!' },
    fr: { n: ['Noirs', 'Blancs'], turn: 'Trait : {p}', win: 'Victoire des {p}', place: 'Posez un pion sur une case vide', rm: 'Choisissez le pion retourné à retirer', own: 'Choisissez un de vos pions', stuck: 'Ce pion ne peut pas bouger maintenant', blk: 'Un pion retourné ne peut pas bouger', move: 'Il ne peut pas aller là', taken: 'Cette case n’est pas vide', wLast: 'Il ne reste qu’un pion à un camp', wStuck: 'Plus aucun coup : les prises décident', wQuiet: '30 coups chacun sans prise : les prises décident', wTie: 'Prises égales : selon la règle de cette appli, les Blancs gagnent', flip: 'Enfermé ! Vous le prendrez au prochain tour', took: '{n} pris !' },
    pt: { n: ['Pretas', 'Brancas'], turn: 'Vez: {p}', win: 'Vitória das {p}', place: 'Coloque uma peça numa casa vazia', rm: 'Escolha a peça virada que será retirada', own: 'Escolha uma de suas peças', stuck: 'Essa peça não pode se mover agora', blk: 'Uma peça virada não pode se mover', move: 'Ela não pode ir para aí', taken: 'Essa casa não está vazia', wLast: 'Um dos lados ficou com uma só peça', wStuck: 'Ninguém podia mover: decidem as capturas', wQuiet: '30 lances de cada lado sem capturas: decidem as capturas', wTie: 'Capturas iguais: pela regra deste app, as brancas vencem', flip: 'Cercada! Você a retira na próxima vez', took: '{n} capturadas!' },
    de: { n: ['Schwarz', 'Weiß'], turn: '{p} am Zug', win: '{p} gewinnt', place: 'Setze einen Stein auf ein leeres Feld', rm: 'Wähle den umgedrehten Stein, der vom Brett kommt', own: 'Wähle einen deiner Steine', stuck: 'Dieser Stein kann gerade nicht ziehen', blk: 'Ein umgedrehter Stein kann nicht ziehen', move: 'Dorthin kann er nicht', taken: 'Dieses Feld ist nicht frei', wLast: 'Eine Seite hat nur noch einen Stein', wStuck: 'Kein Zug mehr möglich – die geschlagenen Steine entscheiden', wQuiet: 'Je 30 Züge ohne Schlag – die geschlagenen Steine entscheiden', wTie: 'Gleich viele Schläge: nach der Regel dieser App gewinnt Weiß', flip: 'Eingeschlossen! Im nächsten Zug gehört er dir', took: '{n} geschlagen!' },
    hi: { n: ['काला', 'सफ़ेद'], turn: '{p} की बारी', win: '{p} की जीत', place: 'खाली खाने में एक गोटी रखो', rm: 'हटाने के लिए विरोधी की पलटी हुई गोटी चुनो', own: 'अपनी एक गोटी चुनो', stuck: 'वह गोटी अभी नहीं चल सकती', blk: 'पलटी हुई गोटी नहीं चल सकती', move: 'वहाँ नहीं जा सकती', taken: 'वह खाना खाली नहीं है', wLast: 'एक पक्ष के पास एक ही गोटी बची', wStuck: 'कोई चाल नहीं बची — ली गई गोटियों से फ़ैसला', wQuiet: 'दोनों की 30-30 चालों में कोई गोटी नहीं ली गई — ली गई गोटियों से फ़ैसला', wTie: 'पकड़ी गई गोटियाँ बराबर — इस ऐप के नियम से सफ़ेद जीतता है', flip: 'घेर लिया! अगली बारी में ले सकते हो', took: '{n} गोटियाँ लीं!' },
    ar: { n: ['الأسود', 'الأبيض'], turn: 'دور {p}', win: 'فوز {p}', place: 'ضع قطعة في مربع فارغ', rm: 'اختر قطعة الخصم المقلوبة التي ستُرفع', own: 'اختر إحدى قطعك', stuck: 'هذه القطعة لا تستطيع الحركة الآن', blk: 'القطعة المقلوبة لا تتحرك', move: 'لا يمكنها الذهاب إلى هناك', taken: 'هذا المربع ليس فارغًا', wLast: 'لم يبقَ لأحد الطرفين سوى قطعة واحدة', wStuck: 'لا حركة ممكنة: الحسم بعدد القطع المأخوذة', wQuiet: '30 نقلة لكل طرف بلا أخذ: الحسم بعدد القطع المأخوذة', wTie: 'تساوت الأسرى، فيفوز الأبيض وفق قاعدة هذا التطبيق', flip: 'حوصرت! تأخذها في دورك القادم', took: 'أُخذت {n}!' },
    ru: { n: ['Чёрные', 'Белые'], turn: 'Ход: {p}', win: '{p} побеждают', place: 'Поставьте шашку на свободную клетку', rm: 'Выберите перевёрнутую шашку, которую снимете', own: 'Выберите свою шашку', stuck: 'Эта шашка сейчас не может ходить', blk: 'Перевёрнутая шашка не ходит', move: 'Туда пойти нельзя', taken: 'Эта клетка занята', wLast: 'У одной из сторон осталась одна шашка', wStuck: 'Ходов нет — решает число взятых шашек', wQuiet: 'По 30 ходов без взятий — решает число взятых шашек', wTie: 'Взятий поровну — по правилу этой игры побеждают белые', flip: 'Зажата! Снимете её следующим ходом', took: 'Взято: {n}!' },
    'zh-TW': { n: ['黑方', '白方'], turn: '輪到{p}', win: '{p}獲勝', place: '在空格裡放一顆棋子', rm: '選擇要拿掉的對方棋子（翻面的棋子）', own: '請選擇自己的棋子', stuck: '這顆棋子現在不能動', blk: '翻面的棋子不能動', move: '不能走到那裡', taken: '那一格不是空的', wLast: '一方只剩1顆棋子', wStuck: '無子可動，依吃子數決勝', wQuiet: '雙方各30步沒有吃子，依吃子數決勝', wTie: '吃子數相同，依本作規則後手（白方）獲勝', flip: '夾住了！下一回合可以吃掉', took: '吃掉{n}顆！' },
    id: { n: ['Hitam', 'Putih'], turn: 'Giliran {p}', win: '{p} menang', place: 'Letakkan satu bidak di petak kosong', rm: 'Pilih bidak terbalik yang akan diangkat', own: 'Pilih salah satu bidakmu', stuck: 'Bidak itu tidak bisa bergerak sekarang', blk: 'Bidak yang terbalik tidak bisa bergerak', move: 'Tidak bisa ke sana', taken: 'Petak itu tidak kosong', wLast: 'Satu pihak tinggal satu bidak', wStuck: 'Tidak ada langkah — ditentukan jumlah tangkapan', wQuiet: '30 langkah masing-masing tanpa tangkapan — ditentukan jumlah tangkapan', wTie: 'Tangkapan sama — menurut aturan aplikasi ini, Putih menang', flip: 'Terapit! Bisa kamu ambil di giliran berikutnya', took: '{n} ditangkap!' },
    tr: { n: ['Siyah', 'Beyaz'], turn: 'Sıra: {p}', win: '{p} kazandı', place: 'Boş bir kareye taş koy', rm: 'Kaldırılacak ters çevrilmiş taşı seç', own: 'Taşlarından birini seç', stuck: 'Bu taş şu an hareket edemez', blk: 'Ters çevrilmiş taş hareket edemez', move: 'Oraya gidemez', taken: 'O kare boş değil', wLast: 'Bir tarafın tek taşı kaldı', wStuck: 'Hamle kalmadı — alınan taş sayısı belirler', wQuiet: '30’ar hamle taş alınmadı — alınan taş sayısı belirler', wTie: 'Alınan taşlar eşit — bu uygulamanın kuralına göre Beyaz kazanır', flip: 'Sıkıştı! Gelecek sıranda alırsın', took: '{n} taş alındı!' },
  };
  // 種目: the three reconstructions (names and descriptions as the full game's rule cards)
  const RIDS = ['seneca', 'piso', 'quintana'], RSZ = [1, 2, 3];
  const RN = {
    ja: { n: ['シェードラー式', 'ピソ式', 'クインタナ式'], d: ['駒を置いてから1歩ずつ。挟んだ駒は裏返り、次の番に取る。味方が助けられる、研究者による復元。', '駒を置いてから1歩ずつ。挟んだ駒はその場で取る、すっきりした復元。', '2列に並べて開始。縦横に好きなだけ進み、挟んだらその場で取る。ドイツの博物館のルール。古代の記録をもとに遊べる形に再構成したルールで、決着がつかないことが多いため、本作では取った数が同じなら後手（白）の勝ちとしています。'] },
    en: { n: ['Schädler', 'Piso', 'Quintana'], d: ['Place the counters, then move one step. An enclosed counter is turned over and taken next turn — unless it is rescued. A scholar’s reconstruction.', 'Place the counters, then move one step. An enclosed counter is taken at once. A simpler reconstruction.', 'Start in two rows. Slide any distance in a straight line; an enclosed counter is taken at once. The rules of a German museum. A playable reconstruction from ancient records. Games rarely produce a winner, so in this app White (the second player) wins when captures are equal.'] },
    zh: { n: ['舍德勒式', '皮索式', '昆塔纳式'], d: ['先摆子，再每次走一步。被夹住的棋子翻面，下一回合才被吃掉，己方可以解救。研究者的复原。', '先摆子，再每次走一步。被夹住的棋子当场吃掉，更简洁的复原。', '先排成两排再开始。横竖任意走，夹住就当场吃掉。德国一家博物馆的规则。这是根据古代记录重构成可玩形式的规则，常常分不出胜负，因此本作规定吃子数相同时后手（白方）获胜。'] },
    ko: { n: ['셰들러식', '피소식', '퀸타나식'], d: ['말을 놓은 뒤 한 칸씩. 끼인 말은 뒤집히고 다음 차례에 잡힌다. 아군이 구해 줄 수 있는, 연구자의 복원.', '말을 놓은 뒤 한 칸씩. 끼운 말은 그 자리에서 잡는 깔끔한 복원.', '두 줄로 늘어놓고 시작. 가로세로로 원하는 만큼 가고, 끼우면 그 자리에서 잡는다. 독일 박물관의 규칙. 고대 기록을 바탕으로 플레이할 수 있게 재구성한 규칙으로, 승부가 잘 나지 않아 이 게임에서는 잡은 수가 같으면 후수(백)의 승리로 합니다.'] },
    es: { n: ['Schädler', 'Pisón', 'Quintana'], d: ['Coloca las fichas y luego mueve un paso. La ficha encerrada se voltea y se retira al turno siguiente, salvo que la rescaten. Reconstrucción de un investigador.', 'Coloca las fichas y luego mueve un paso. La ficha encerrada se retira al instante. Una reconstrucción más sencilla.', 'Se empieza en dos filas. Se avanza en línea recta cuanto se quiera y la ficha encerrada se retira al instante. Las reglas de un museo alemán. Una reconstrucción jugable a partir de registros antiguos. Como rara vez hay ganador, aquí ganan las blancas (el segundo jugador) si las capturas están igualadas.'] },
    fr: { n: ['Schädler', 'Pison', 'Quintana'], d: ['Posez les pions, puis avancez d’un pas. Un pion enfermé est retourné et pris au tour suivant — sauf s’il est délivré. Reconstitution d’un chercheur.', 'Posez les pions, puis avancez d’un pas. Un pion enfermé est pris aussitôt. Une reconstitution plus simple.', 'Départ sur deux rangées. On glisse en ligne droite aussi loin qu’on veut ; un pion enfermé est pris aussitôt. Les règles d’un musée allemand. Une reconstitution jouable d’après des sources antiques. Comme il y a rarement un vainqueur, ici les Blancs (le second joueur) gagnent à prises égales.'] },
    pt: { n: ['Schädler', 'Pisão', 'Quintana'], d: ['Coloque as peças e depois mova um passo. A peça cercada é virada e retirada na vez seguinte — a não ser que seja salva. Reconstrução de um pesquisador.', 'Coloque as peças e depois mova um passo. A peça cercada é retirada na hora. Uma reconstrução mais simples.', 'Começa-se em duas fileiras. Anda-se em linha reta quanto quiser; a peça cercada é retirada na hora. As regras de um museu alemão. Uma reconstrução jogável a partir de registros antigos. Como raramente há vencedor, aqui as brancas (o segundo jogador) vencem com capturas iguais.'] },
    de: { n: ['Schädler', 'Piso', 'Quintana'], d: ['Erst setzen, dann je einen Schritt ziehen. Ein eingeschlossener Stein wird umgedreht und im nächsten Zug geschlagen – wenn er nicht befreit wird. Rekonstruktion eines Forschers.', 'Erst setzen, dann je einen Schritt ziehen. Ein eingeschlossener Stein wird sofort geschlagen. Eine einfachere Rekonstruktion.', 'Start in zwei Reihen. Gerade Züge beliebig weit; ein eingeschlossener Stein wird sofort geschlagen. Die Regeln eines deutschen Museums. Eine spielbare Rekonstruktion nach antiken Quellen. Da es selten einen Sieger gibt, gewinnt hier bei gleich vielen Schlägen Weiß (der Nachziehende).'] },
    hi: { n: ['शेडलर', 'पीसो', 'क्विंटाना'], d: ['पहले गोटियाँ रखो, फिर एक-एक कदम चलो। घिरी हुई गोटी पलट जाती है और अगली बारी में ली जाती है — अगर साथी उसे छुड़ा न लें। एक शोधकर्ता की पुनर्रचना।', 'पहले गोटियाँ रखो, फिर एक-एक कदम चलो। घिरी हुई गोटी तुरंत ले ली जाती है। ज़्यादा सरल पुनर्रचना।', 'दो कतारों से शुरुआत। सीधी रेखा में जितना चाहो चलो; घिरी हुई गोटी तुरंत ले ली जाती है। जर्मनी के एक संग्रहालय के नियम। प्राचीन अभिलेखों से खेलने लायक़ बनाया गया पुनर्निर्माण। विजेता कम ही निकलता है, इसलिए यहाँ पकड़ी गई गोटियाँ बराबर हों तो सफ़ेद (दूसरा खिलाड़ी) जीतता है।'] },
    ar: { n: ['شيدلر', 'بيزو', 'كوينتانا'], d: ['ضع القطع أولًا ثم تحرّك خطوة واحدة. القطعة المحاصَرة تُقلب وتُرفع في الدور التالي ما لم تُنقَذ. إعادة بناء وضعها أحد الباحثين.', 'ضع القطع أولًا ثم تحرّك خطوة واحدة. القطعة المحاصَرة تُرفع فورًا. إعادة بناء أبسط.', 'البداية بصفّين. تتحرك القطعة في خط مستقيم أي مسافة، والمحاصَرة تُرفع فورًا. قواعد متحف ألماني. إعادة بناء قابلة للعب استنادًا إلى سجلات قديمة. ولأن الفائز نادرًا ما يتحدد، يفوز الأبيض (اللاعب الثاني) هنا عند تساوي الأسرى.'] },
    ru: { n: ['Шедлер', 'Пизон', 'Квинтана'], d: ['Сначала выставляем шашки, затем ходим на одну клетку. Зажатая шашка переворачивается и снимается следующим ходом — если её не выручат. Реконструкция исследователя.', 'Сначала выставляем шашки, затем ходим на одну клетку. Зажатая шашка снимается сразу. Более простая реконструкция.', 'Начало в два ряда. Ход по прямой на любое расстояние; зажатая шашка снимается сразу. Правила немецкого музея. Играбельная реконструкция по древним источникам. Победитель выявляется редко, поэтому здесь при равном числе взятий побеждают белые (второй игрок).'] },
    'zh-TW': { n: ['舍德勒式', '皮索式', '昆塔納式'], d: ['先擺子，再每次走一步。被夾住的棋子翻面，下一回合才被吃掉，己方可以解救。研究者的復原。', '先擺子，再每次走一步。被夾住的棋子當場吃掉，更簡潔的復原。', '先排成兩排再開始。橫豎任意走，夾住就當場吃掉。德國一間博物館的規則。這是根據古代記錄重構成可玩形式的規則，常常分不出勝負，因此本作規定吃子數相同時後手（白方）獲勝。'] },
    id: { n: ['Schädler', 'Piso', 'Quintana'], d: ['Letakkan bidak, lalu melangkah satu petak. Bidak yang terapit dibalik dan diambil pada giliran berikutnya — kecuali diselamatkan. Rekonstruksi seorang peneliti.', 'Letakkan bidak, lalu melangkah satu petak. Bidak yang terapit langsung diambil. Rekonstruksi yang lebih sederhana.', 'Mulai dalam dua baris. Meluncur lurus sejauh apa pun; bidak yang terapit langsung diambil. Aturan sebuah museum di Jerman. Rekonstruksi yang bisa dimainkan dari catatan kuno. Karena jarang ada pemenang, di sini Putih (pemain kedua) menang jika jumlah tangkapan sama.'] },
    tr: { n: ['Schädler', 'Piso', 'Quintana'], d: ['Önce taşlar konur, sonra birer adım oynanır. Sıkıştırılan taş ters çevrilir ve bir sonraki sırada alınır — kurtarılmazsa. Bir araştırmacının yeniden kurgusu.', 'Önce taşlar konur, sonra birer adım oynanır. Sıkıştırılan taş hemen alınır. Daha yalın bir yeniden kurgu.', 'İki sıra hâlinde başlanır. Düz çizgide istenen kadar gidilir; sıkıştırılan taş hemen alınır. Bir Alman müzesinin kuralları. Antik kayıtlardan oynanabilir biçimde yeniden kurulmuş bir kural. Kazanan nadiren çıktığı için burada alınan taş sayısı eşitse Beyaz (ikinci oyuncu) kazanır.'] },
  };
  const rn = l => RN[l] || RN.en, rix = z => Math.max(0, RSZ.indexOf(+z));
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): glass on stone ---------- */
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  const SND = {
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1500 * v, 700, .07, .06, 'triangle'); tone(a, t, 260 * v, 130, .09, .13); },
    slide() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 320, 220, .12, .035, 'triangle'); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1400, 1100, .06, .035, 'triangle'); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 620, 1240, .12, .05, 'triangle'); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1200, 0, .05, .03, 'triangle'); },
    flip() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 880, 440, .14, .05, 'triangle'); tone(a, t + .16, 300, 150, .08, .12); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.lttoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#6a2358;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 40% 35%,#5a6070,#1a1e28 60%,#07090d)', 'background:radial-gradient(circle at 40% 35%,#fff,#eef0ea 60%,#bfc4bb)'];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en, L3 = T3.latrunculi;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const N = 8, rule = RIDS[rix(ctx.size)], board = L3.board(); T3.show('latrunculi', board);
    const U = board.userData, Y = U.top - U.sink;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: U.top + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: U.top + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;
    const flip = human === 2;
    const pname = c => X.n[c - 1];
    let E = null;
    const scr = i => { const [r, c] = E.RC[i]; return flip ? [N - 1 - c, N - 1 - r] : [c, r]; };
    const xz = i => U.pt(...scr(i));

    let pos = null, moves = [], legal = [], rmList = [], rmSel = -1;
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0;
    const mover = () => pvp && pos ? pos.side + 1 : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side + 1 === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .34), lastF: basic(0xffc94a, .18), sel: basic(0xffc94a, .95), dest: basic(0x3fe0c4, .92), rm: basic(0xff9a4a, .95), hint: basic(0xff7a1a, .95) };
    const GEO = { cup: new TH.CircleGeometry(.42, 40), ring: new TH.TorusGeometry(.43, .03, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24) };
    GEO.cup.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, U.top + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- counters ---------- */
    let pcs = {};   // square → { g, c, inc }
    function mk(col, i) { const g = U.piece(col), sh = T3.contact(L3.R * .9, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    // a thin red ring round a turned-over counter (the 2D page's mark)
    function badge(g, on) { let r = g.userData.xr; if (on && !r) { r = new TH.Mesh(new TH.TorusGeometry(L3.R * 1.12, .022, 6, 40), new TH.MeshBasicMaterial({ color: 0xd8423a, transparent: true, opacity: .92, toneMapped: false })); r.rotation.x = Math.PI / 2; r.position.y = .016; g.add(r); g.userData.xr = r; } if (r) r.visible = on; kick(); }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.userData.xr) { g.userData.xr.geometry.dispose(); g.userData.xr.material.dispose(); } board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SND.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    // an enclosed counter hops and turns over (and back when it is freed)
    function flipTo(p, on) { if (p.inc === on) return; p.inc = on; SND.flip(); const g = p.g; anim(380, k => { L3.turn(g, on ? io(k) : 1 - io(k)); lift(g, Math.sin(k * Math.PI) * .42); }, () => { L3.turn(g, on ? 1 : 0); lift(g, 0); land(g); badge(g, on); }); if (!on) badge(g, false); }
    function fall(g, done) { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); SND.put(); if (done) done(); }); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = []; for (let i = 0; i < N * N; i++) if (pos.owner(i)) order.push(i);
      order.sort((a, b) => scr(b)[1] - scr(a)[1] || scr(a)[0] - scr(b)[0]);
      for (const i of order) { const c = pos.owner(i), g = mk(c, i); pcs[i] = { g, c, inc: false }; g.visible = false; const d = 60 + (n++) * 22; kick(200);
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); if (n % 2) SND.put(1.1); }); }, d); }
      return n ? 60 + n * 22 + 300 : 120;
    }
    function rebuild() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      for (let i = 0; i < N * N; i++) { const c = pos.owner(i); if (!c) continue; const g = mk(c, i), inc = pos.blocked(i); if (inc) { L3.turn(g, 1); badge(g, true); } pcs[i] = { g, c, inc }; }
      kick(300);
    }
    const HOP = 260;
    function travel(g, path, leap, done) {
      const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1;
      if (!leap) {   // a step, or a rook move: the counter slides
        const [x0, z0] = pts[0], [x1, z1] = pts[legs], dist = Math.hypot(x1 - x0, z1 - z0); SND.slide();
        anim(170 + dist * 60, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, h0 * (1 - q) + Math.sin(q * Math.PI) * .06); }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
        return;
      }
      const hopped = [];
      anim(legs * HOP, k => {   // leaps over its own counters: an arc for every leap
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q = r - i, [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; SND.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * .62 + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { pos = E.replay(null, moves).pos; }
    function hud(msg) {
      const num = c => pos ? (pos.placing ? pos.hand[c - 1] : pos.cap[c - 1]) : 0;
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${num(c)}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'lttoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2400);
    }
    const myMove = () => !!pos && !over && (pvp || pos.side + 1 === human);
    const cur = () => legal.filter(m => E.mRm(m) === rmSel);   // the moves that go with the removal chosen (−1: none to remove)
    function showMarks() {
      clear(hl); hintJ++;
      if (moves.length) {
        const m = moves[moves.length - 1], f = E.mFrom(m), to = E.mTo(m);
        if (f !== to) mark(hl, GEO.cup, MAT.lastF, f); if (pos.owner(to)) mark(hl, GEO.cup, MAT.last, to);
      }
      if (!myMove() || pos.placing) return;
      if (rmList.length > 1 && rmSel < 0) rmList.forEach(i => pulse(mark(hl, GEO.ring, MAT.rm, i, .05), 3));
      else if (rmSel >= 0) mark(hl, GEO.ring, MAT.rm, rmSel, .05);
    }
    const prompt = () => pos.placing ? X.place : rmList.length > 1 && rmSel < 0 ? X.rm : pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn;

    /* ---------- selection ---------- */
    function drawSel() {
      clear(mv); if (!sel) return;
      mark(mv, GEO.ring, MAT.sel, sel.from, .05);
      new Set(sel.cands.map(E.mTo)).forEach(i => mark(mv, GEO.dot, MAT.dest, i, pos.owner(i) ? .3 : .03));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.22 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }

    /* ---------- moves ---------- */
    function play(m, done) {
      const e = E.effect(pos, m), me = pos.side + 1;
      clear(mv); sel = null; rmSel = -1; rmList = [];
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks();
      const n = e.takes.length + (e.rm >= 0 ? 1 : 0);
      hud(e.blocks.length ? X.flip : n ? X.took.replace('{n}', n) : '');
      let d0 = 0;
      if (e.rm >= 0) { const c = pcs[e.rm]; if (c) { delete pcs[e.rm]; vanish(c.g, 0); } d0 = 320; }   // the blocked counter leaves first
      const after = () => {
        e.takes.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c.g, k * 90); } });
        e.blocks.forEach(q => { const c = pcs[q]; if (c) flipTo(c, true); });
        e.frees.forEach(q => { const c = pcs[q]; if (c) flipTo(c, false); });
        later(done, e.takes.length || e.blocks.length || e.frees.length ? 480 : 40);
      };
      if (e.place) { const g = mk(me, e.to); g.visible = false; pcs[e.to] = { g, c: me, inc: false }; fall(g, after); return; }
      if (e.from === e.to) { later(after, d0 + 120); return; }   // a turn that only removes
      const p = pcs[e.from]; delete pcs[e.from];
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[e.to] = p;
      later(() => travel(p.g, e.path || [e.from, e.to], e.leap, after), d0);
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos);
      if (st.over) return end(st);
      legal = pos.moves(); rmList = pos.placing ? [] : pos.removable(); rmSel = rmList.length === 1 ? rmList[0] : -1;
      showMarks();
      onTurn();
      if (pvp || pos.side + 1 === human) {
        const c = cur();
        if (rmSel >= 0 && c.length && c.every(E.isRemoveOnly)) { busy = true; hud(''); later(() => commit(c[0]), 500); return; }   // nothing can move: the removal alone
        hud(prompt());
        if (pos.placing && moves.length < 2) toast(X.place); else if (rmList.length > 1) toast(X.rm);   // (phones show no line in the HUD: what to do now, once)
        return;
      }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw, why = X[{ last: 'wLast', stuck: 'wStuck', quiet: 'wQuiet', tie: 'wTie' }[st.why]] || '';
      if (pvp) { const wt = draw ? L.draw : X.win.replace('{p}', pname(st.winner)); hud(wt); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt }), 700); return; }
      const win = !draw && st.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { E.setRule(rule); m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, U.top); if (!p) return -1;
      let c = Math.floor(p.x + N / 2), r = Math.floor(p.z + N / 2);
      if (c < 0 || c > N - 1 || r < 0 || r > N - 1) return -1;
      if (flip) { c = N - 1 - c; r = N - 1 - r; }
      return E.sqAt(r, c);
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { deselect(); return; }
      const me = pos.side + 1;
      if (pos.placing) { const m = legal.find(x => E.mTo(x) === i); if (m != null) commit(m); else toast(X.taken); return; }
      if (sel) { const m = sel.cands.find(x => E.mTo(x) === i); if (m != null) { commit(m); return; } }
      if (rmList.length > 1 && (rmSel < 0 || (rmList.includes(i) && i !== rmSel))) {   // which blocked counter to remove
        if (!rmList.includes(i)) { toast(X.rm); return; }
        deselect(); rmSel = i; SND.lift(); showMarks();
        const c = cur(); if (c.length && c.every(E.isRemoveOnly)) { commit(c[0]); return; }
        hud(prompt()); return;
      }
      if (pos.owner(i) === me) {
        if (pos.blocked(i)) { toast(X.blk); return; }
        if (sel && sel.from === i) { deselect(); return; }
        const c = cur().filter(m => E.mFrom(m) === i && E.mTo(m) !== i);
        if (!c.length) { toast(X.stuck); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); return; }
      if (!pos.owner(i)) toast(X.move);
      deselect();
    }
    ctx.el.addEventListener('click', onClick);
    // the board view's 駒 row (Table3D.PIECES) during a game: the counters on the board are rebuilt in the new set at once
    const onPcs = e => { if (!stopped && pos && e.detail && e.detail.id === 'latrunculi') { sel = null; clear(mv); rebuild(); } };
    addEventListener('atlas-pieces', onPcs);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++; rmSel = -1; rmList = [];
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule(rule); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, U.top); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, rule, placing: pos && pos.placing, sel: sel ? sel.from : null, pieces: Object.keys(pcs).length, turned: Object.values(pcs).filter(p => p.inc).length, cap: pos && pos.cap.slice(), hand: pos && pos.hand.slice(), rmList: rmList.slice(), rmSel }),
      legal: () => legal.map(m => { const e = E.effect(pos, m); return { m, from: E.mFrom(m), to: E.mTo(m), rm: E.mRm(m), hit: e.blocks.length + e.takes.length, free: e.frees.length }; }),
    };
    window.Atlas3D.latrunculi._dbg = dbg;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side + 1 === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 2 ? 1 : 0)),
      undo() { if (!api.canUndo()) return; timers.forEach(clearTimeout); timers.length = 0; jid++; deselect(); moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++; busy = false; next(); },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || !legal.includes(m)) return res(false);
            const ef = E.effect(pos, m), sq = ef.place || ef.from === ef.to ? [ef.to] : (ef.path || [ef.from, ef.to]);
            if (ef.rm >= 0 && !sq.includes(ef.rm)) pulse(mark(hl, GEO.ring, MAT.rm, ef.rm, .05), 2);
            sq.map((s, k) => mark(hl, k || sq.length === 1 ? GEO.dot : GEO.ring, MAT.hint, s, .06)).forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule });
        });
      },
      canDraw: () => false,   // (a draw only comes from the rules: equal captures when the game stops)
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); removeEventListener('atlas-pieces', onPcs);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.latrunculi._dbg === dbg) delete window.Atlas3D.latrunculi._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 (latrunculi/i18n-lt*.js) ---------- */
  const LVD = {
    ja: ['入門：目先の1手だけを見る', '初級〜中級：挟まれる形に気づく', '上級：数手先の挟み合いを読む', '最上級：深く読んで先に取る'],
    en: ['Beginner: looks one move ahead', 'Novice–intermediate: notices counters about to be enclosed', 'Advanced: reads the fight a few moves ahead', 'Top: reads deep and captures first'],
    zh: ['入门：只看眼前一步', '初级～中级：会注意要被夹住的棋形', '高级：能算几步之后的夹吃', '最高级：深算并抢先吃子'],
    ko: ['입문: 눈앞의 한 수만 본다', '초급~중급: 끼일 모양을 알아챈다', '상급: 몇 수 앞의 끼우기 싸움을 읽는다', '최상급: 깊이 읽고 먼저 잡는다'],
    es: ['Principiante: solo mira una jugada', 'Novato–intermedio: ve las fichas a punto de ser encerradas', 'Avanzado: calcula la lucha unas jugadas más allá', 'Experto: calcula a fondo y captura primero'],
    fr: ['Débutant : ne regarde qu’un coup', 'Novice–intermédiaire : repère les pions bientôt enfermés', 'Avancé : calcule le combat quelques coups plus loin', 'Expert : calcule en profondeur et prend le premier'],
    pt: ['Iniciante: olha só um lance', 'Novato–intermediário: percebe peças prestes a ser cercadas', 'Avançado: calcula a luta alguns lances à frente', 'Especialista: calcula fundo e captura primeiro'],
    de: ['Anfänger: schaut nur einen Zug voraus', 'Einsteiger–Mittel: bemerkt Steine, die eingeschlossen werden', 'Fortgeschritten: rechnet den Kampf ein paar Züge voraus', 'Experte: rechnet tief und schlägt zuerst'],
    hi: ['शुरुआती: सिर्फ़ अगली चाल देखता है', 'नौसिखिया–मध्यम: घिरने वाली गोटियाँ पहचान लेता है', 'उन्नत: कुछ चालें आगे की घेराबंदी पढ़ता है', 'विशेषज्ञ: गहराई से पढ़कर पहले गोटी लेता है'],
    ar: ['مبتدئ: يرى نقلة واحدة فقط', 'مبتدئ–متوسط: ينتبه للقطع المهددة بالحصار', 'متقدم: يحسب الصراع لبضع نقلات', 'خبير: يحسب بعمق ويأخذ أولًا'],
    ru: ['Начальный: видит на один ход', 'Новичок–средний: замечает шашки под угрозой зажима', 'Продвинутый: считает борьбу на несколько ходов', 'Эксперт: считает глубоко и берёт первым'],
    'zh-TW': ['入門：只看眼前一步', '初級～中級：會注意快被夾住的棋形', '高級：能算幾步之後的夾吃', '最高級：深算並搶先吃子'],
    id: ['Pemula: hanya melihat satu langkah', 'Dasar–menengah: menyadari bidak yang akan terapit', 'Mahir: membaca pertarungan beberapa langkah ke depan', 'Ahli: membaca dalam dan menangkap lebih dulu'],
    tr: ['Başlangıç: yalnızca bir hamle ileriye bakar', 'Acemi–orta: sıkışmak üzere olan taşları fark eder', 'İleri: mücadeleyi birkaç hamle ileriye okur', 'Uzman: derin okur ve önce alır'],
  };
  const RATING = [0, 100, 220, 518, 781, 985, 1074, 1173, 1339, 1756, 2011, 2100, 2254, 2312, 2484, 2528, 2632, 2657, 2682, 2802, 2852];   // latrunculi RT_LV (measured 2026-11-19, see the spec)
  const W7 = (a, b, c, d, e, f) => [a, a, a, a, b, b, b, b, b, c, c, c, c, c, c, d, d, d, e, f];
  const WHO = {
    ja: W7('はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '上級者でも手ごわい', '最強レベル'),
    en: W7('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'tough even for experts', 'the very strongest'),
    zh: W7('适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '高手也觉得难缠', '最强等级'),
    ko: W7('처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '고수도 버거운', '최강 레벨'),
    es: W7('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'difícil incluso para expertos', 'el más fuerte'),
    fr: W7('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'coriace même pour les experts', 'le plus fort'),
    pt: W7('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'difícil até para experts', 'o mais forte'),
    de: W7('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'selbst für Profis knifflig', 'die stärkste Stufe'),
    hi: W7('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'विशेषज्ञों के लिए भी कठिन', 'सबसे मज़बूत स्तर'),
    ar: W7('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'صعب حتى على الخبراء', 'أقوى مستوى'),
    ru: W7('для первой игры', 'когда знаете правила', 'когда освоились', 'для сильных игроков', 'трудно даже экспертам', 'самый сильный'),
    'zh-TW': W7('給第一次玩的人', '懂規則之後', '漸漸上手時', '給高手', '連專家都覺得難', '最強'),
    id: W7('untuk pemula', 'setelah tahu aturannya', 'mulai terbiasa', 'untuk pemain kuat', 'sulit bahkan bagi ahli', 'yang terkuat'),
    tr: W7('ilk kez oynayanlar için', 'kuralları bilince', 'alışmaya başlayınca', 'güçlü oyuncular için', 'uzmanlar için bile zor', 'en güçlüsü'),
  };
  function levelInfo(n, lang) {
    const D = LVD[lang] || LVD.en, W = WHO[lang] || WHO.en;
    return { name: '', desc: D[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[Math.min(n, 20) - 1] };
  }
  // the 種目 cards' pictures: a small board — counters placed anywhere (one of them turned over in Schädler's game) or the two rows of Quintana
  function kindArt(sid, v) {
    const k = rix(v), u = 10, w = 8 * u + 8, B = '#1d222c', Wt = '#f3f1ea';
    let o = `<svg viewBox="0 0 ${w} ${w}" aria-hidden="true"><rect width="${w}" height="${w}" rx="5" fill="#7a2d3a"/><rect x="4" y="4" width="${8 * u}" height="${8 * u}" fill="#ece6d8"/><path d="${[1, 2, 3, 4, 5, 6, 7].map(i => `M${4 + i * u} 4v${8 * u}M4 ${4 + i * u}h${8 * u}`).join('')}" stroke="#a79c86" stroke-width=".7" fill="none"/>`;
    const pc = (x, y, c, inc) => { o += `<circle cx="${4 + (x + .5) * u}" cy="${4 + (y + .5) * u}" r="${u * .36}" fill="${c === 1 ? B : Wt}" stroke="${inc ? '#d8423a' : c === 1 ? '#000' : '#8d8a80'}" stroke-width="${inc ? 1.4 : .6}"/>`; };
    if (k === 2) for (let x = 0; x < 8; x++) { pc(x, 0, 2); pc(x, 1, 2); pc(x, 6, 1); pc(x, 7, 1); }
    else { [[2, 3], [4, 3], [3, 5], [5, 5], [1, 6], [6, 2]].forEach(([x, y]) => pc(x, y, 1)); [[3, 3], [4, 4], [2, 2], [5, 1], [6, 5], [1, 4]].forEach(([x, y], j) => { if (k === 1 && j === 0) return; pc(x, y, 2, k === 0 && j === 0); }); }
    return o + '</svg>';
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.latrunculi = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', kindFirst: true, sizes: RSZ, size0: 1, sizeLabel: () => 'Rules',
    sizeName: (z, l) => rn(l).n[rix(z)], optInfo: (sid, v, l) => sid === 'bvSize' ? { sub: rn(l).d[rix(v)] } : null, kindArt, levelInfo, start };
})();
