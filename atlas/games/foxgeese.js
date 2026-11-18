/* =====================================================================
   Fox and Geese (the cross of 33 points) on the portal.
   · The board card (levels, sides, modes, 種目): Lv.1 … Lv.20 with the game's descriptions (foxgeese/i18n-fg*.js),
     ratings = the game's RT_LV (foxgeese/app.js). 種目 = the full game's four rules (the card's "size" value:
     15 = 15 geese that never step back (the default) · 17 = 17 geese that move only forward or sideways · 13 = the
     traditional 13 geese (they may step back) · 113 = 13 geese that never step back). 先手 = the fox (it moves first).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's rules and AI —
     ../foxgeese/engine.js on the page (steps along the lines, the fox's jumps — several in one move, it may stop,
     capturing is never compulsory — the fox shut in, five geese or fewer, no draws: the third repetition or 60 quiet moves each is the fox's win) and the same file as
     a Worker (levels 1..20), asked as foxgeese/app.js asks it.
     Input as on the page: tap a piece and the point it goes to. The fox's jumps are tapped one landing at a time;
     to stop where it could jump on, tap that landing point (or the fox) once more.
     ctx.mode 'pvp': two players take turns on one device. The board is never turned: the geese are always near.
     Board and pieces: atlas/models/foxgeese.js (the look and the set chosen in the portal's 盤 / 駒 rows).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../foxgeese/', VER = '?v=10';   // same file / version as foxgeese/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.FoxEngine) return Promise.resolve(window.FoxEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.FoxEngine ? res(window.FoxEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // n: the sides · turn / win (two players) · own / stuck / move: a tap that does nothing · more: the fox could jump on ·
  // wFew / wTrap / wStuck / wQuiet: why the game ended · took: geese taken in one move
  const TX = {
    ja: { q: "あと{n}手", qt: "取り合いのないまま、あと何手ずつ進むと狐の勝ちになるか", n: ['狐', 'ガチョウ'], turn: '{p}の番', win: '{p}の勝ち', own: '自分の駒を選んでください', stuck: 'その駒はいま動かせません', move: 'そこへは動かせません', more: 'まだ跳べるよ。ここで止まるなら同じ点をもう一度タップ', wFew: 'ガチョウが5羽以下になった（もう狐を囲めない）', wTrap: '狐が動けなくなった', wStuck: 'ガチョウが動けなくなった', wQuiet: '取り合いのないまま30手ずつ進んだ', wRep: '同じ局面が3回現れた（千日手は狐の勝ち）', took: '{n}羽続けて取った！' },
    en: { q: "{n} left", qt: "Moves each left without a capture before the fox wins", n: ['Fox', 'Geese'], turn: '{p} to move', win: '{p} wins', own: 'Pick one of your pieces', stuck: 'That piece cannot move now', move: 'It cannot go there', more: 'It can jump on. To stop here, tap this point once more', wFew: 'Five geese or fewer are left — they can no longer shut the fox in', wTrap: 'The fox cannot move', wStuck: 'The geese cannot move', wQuiet: '30 moves each without a capture', wRep: 'The same position three times — repetition is the fox’s win', took: '{n} geese in one move!' },
    zh: { q: "剩{n}步", qt: "不吃子再走几步（双方各计）狐狸就获胜", n: ['狐狸', '鹅'], turn: '轮到{p}', win: '{p}胜', own: '请选择自己的棋子', stuck: '这枚棋子现在不能动', move: '不能走到那里', more: '还可以继续跳。想停在这里，就再点一次这个点', wFew: '鹅只剩5只或更少（已围不住狐狸）', wTrap: '狐狸动不了了', wStuck: '鹅动不了了', wQuiet: '双方各30步没有吃子', wRep: '同一局面出现了三次——重复局面判狐狸获胜', took: '连吃{n}只！' },
    ko: { q: "{n}수 남음", qt: "잡지 않고 각자 몇 수 더 두면 여우가 이기는지", n: ['여우', '거위'], turn: '{p} 차례', win: '{p} 승리', own: '내 말을 고르세요', stuck: '그 말은 지금 움직일 수 없습니다', move: '그곳으로는 갈 수 없습니다', more: '더 뛸 수 있어요. 여기서 멈추려면 같은 점을 한 번 더 탭', wFew: '거위가 5마리 이하가 되었다(더는 여우를 가둘 수 없다)', wTrap: '여우가 움직일 수 없게 되었다', wStuck: '거위가 움직일 수 없게 되었다', wQuiet: '잡기 없이 30수씩 진행되었다', wRep: '같은 국면이 세 번 나왔다 — 반복은 여우의 승리', took: '{n}마리 연속으로 잡았다!' },
    es: { q: "quedan {n}", qt: "Jugadas de cada uno sin captura antes de que gane el zorro", n: ['Zorro', 'Ocas'], turn: 'Turno: {p}', win: 'Gana: {p}', own: 'Elige una de tus piezas', stuck: 'Esa pieza no puede moverse ahora', move: 'No puede ir ahí', more: 'Puede seguir saltando. Para parar aquí, toca este punto otra vez', wFew: 'Quedan cinco ocas o menos: ya no pueden encerrar al zorro', wTrap: 'El zorro no puede moverse', wStuck: 'Las ocas no pueden moverse', wQuiet: '30 jugadas por bando sin capturas', wRep: 'La misma posición tres veces: la repetición es victoria del zorro', took: '¡{n} ocas de una vez!' },
    fr: { q: "reste {n}", qt: "Coups de chacun sans prise avant la victoire du renard", n: ['Renard', 'Oies'], turn: 'Trait : {p}', win: 'Victoire : {p}', own: 'Choisissez une de vos pièces', stuck: 'Cette pièce ne peut pas bouger maintenant', move: 'Elle ne peut pas aller là', more: 'Il peut encore sauter. Pour s’arrêter ici, touchez ce point une fois de plus', wFew: 'Il reste cinq oies ou moins : elles ne peuvent plus enfermer le renard', wTrap: 'Le renard ne peut plus bouger', wStuck: 'Les oies ne peuvent plus bouger', wQuiet: '30 coups chacun sans prise', wRep: 'La même position trois fois : la répétition donne la victoire au renard', took: '{n} oies d’un coup !' },
    pt: { q: "faltam {n}", qt: "Jogadas de cada um sem captura antes de a raposa vencer", n: ['Raposa', 'Gansos'], turn: 'Vez: {p}', win: 'Vitória: {p}', own: 'Escolha uma de suas peças', stuck: 'Essa peça não pode se mover agora', move: 'Ela não pode ir para aí', more: 'Ela pode continuar saltando. Para parar aqui, toque neste ponto mais uma vez', wFew: 'Restam cinco gansos ou menos: já não conseguem cercar a raposa', wTrap: 'A raposa não pode se mover', wStuck: 'Os gansos não podem se mover', wQuiet: '30 lances de cada lado sem capturas', wRep: 'A mesma posição três vezes: a repetição dá a vitória à raposa', took: '{n} gansos de uma vez!' },
    de: { q: "noch {n}", qt: "Züge je Seite ohne Schlagen, bis der Fuchs gewinnt", n: ['Fuchs', 'Gänse'], turn: 'Am Zug: {p}', win: 'Sieg: {p}', own: 'Wähle eine deiner Figuren', stuck: 'Diese Figur kann gerade nicht ziehen', move: 'Dorthin kann sie nicht', more: 'Er kann weiterspringen. Zum Anhalten tippe diesen Punkt noch einmal an', wFew: 'Nur noch fünf Gänse oder weniger – sie können den Fuchs nicht mehr einsperren', wTrap: 'Der Fuchs kann nicht mehr ziehen', wStuck: 'Die Gänse können nicht mehr ziehen', wQuiet: 'Je 30 Züge ohne Schlag', wRep: 'Dieselbe Stellung zum dritten Mal – Wiederholung ist ein Sieg des Fuchses', took: '{n} Gänse in einem Zug!' },
    hi: { q: "{n} बाकी", qt: "बिना पकड़े हर पक्ष की कितनी चालें बाकी हैं, फिर लोमड़ी जीतेगी", n: ['लोमड़ी', 'कलहंस'], turn: '{p} की बारी', win: '{p} की जीत', own: 'अपना एक मोहरा चुनो', stuck: 'वह मोहरा अभी नहीं चल सकता', move: 'वहाँ नहीं जा सकता', more: 'लोमड़ी और कूद सकती है। यहीं रुकना हो तो इसी बिंदु को एक बार और टैप करो', wFew: 'पाँच या कम कलहंस बचे — अब वे लोमड़ी को घेर नहीं सकते', wTrap: 'लोमड़ी हिल नहीं सकती', wStuck: 'कलहंस हिल नहीं सकते', wQuiet: 'दोनों की 30-30 चालें बिना किसी कब्ज़े के', wRep: 'वही स्थिति तीन बार आई — दोहराव पर लोमड़ी की जीत', took: 'एक चाल में {n} कलहंस!' },
    ar: { q: "باقٍ {n}", qt: "عدد نقلات كل طرف المتبقية بلا أسر قبل فوز الثعلب", n: ['الثعلب', 'الإوز'], turn: 'دور {p}', win: 'فوز {p}', own: 'اختر إحدى قطعك', stuck: 'هذه القطعة لا تستطيع الحركة الآن', move: 'لا يمكنها الذهاب إلى هناك', more: 'يستطيع الثعلب متابعة القفز. للتوقف هنا المس هذه النقطة مرة أخرى', wFew: 'بقيت خمس إوزات أو أقل: لم تعد تستطيع حصار الثعلب', wTrap: 'الثعلب لا يستطيع الحركة', wStuck: 'الإوز لا يستطيع الحركة', wQuiet: '30 نقلة لكل طرف بلا أخذ', wRep: 'تكرر الوضع نفسه ثلاث مرات — التكرار فوز للثعلب', took: '{n} إوزات في نقلة واحدة!' },
    ru: { q: "осталось {n}", qt: "Сколько ходов каждого без взятия осталось до победы лисы", n: ['Лиса', 'Гуси'], turn: 'Ход: {p}', win: 'Победа: {p}', own: 'Выберите свою фигуру', stuck: 'Эта фигура сейчас не может ходить', move: 'Туда пойти нельзя', more: 'Можно прыгать дальше. Чтобы остановиться здесь, нажмите эту точку ещё раз', wFew: 'Гусей осталось пять или меньше — лису уже не запереть', wTrap: 'Лиса не может ходить', wStuck: 'Гуси не могут ходить', wQuiet: 'По 30 ходов без взятий', wRep: 'Позиция повторилась трижды — повторение означает победу лисы', took: '{n} гусей за один ход!' },
    'zh-TW': { q: "剩{n}步", qt: "不吃子再走幾步（雙方各計）狐狸就獲勝", n: ['狐狸', '鵝'], turn: '輪到{p}', win: '{p}獲勝', own: '請選擇自己的棋子', stuck: '這顆棋子現在不能動', move: '不能走到那裡', more: '還可以繼續跳。想停在這裡，就再點一次這個點', wFew: '鵝只剩5隻或更少（已圍不住狐狸）', wTrap: '狐狸動不了了', wStuck: '鵝動不了了', wQuiet: '雙方各30步沒有吃子', wRep: '同一局面出現了三次——重複局面判狐狸獲勝', took: '連吃{n}隻！' },
    id: { q: "sisa {n}", qt: "Sisa langkah masing-masing tanpa tangkapan sebelum rubah menang", n: ['Rubah', 'Angsa'], turn: 'Giliran {p}', win: '{p} menang', own: 'Pilih salah satu bidakmu', stuck: 'Bidak itu tidak bisa bergerak sekarang', move: 'Tidak bisa ke sana', more: 'Masih bisa melompat lagi. Untuk berhenti di sini, ketuk titik ini sekali lagi', wFew: 'Angsa tinggal lima atau kurang — rubah tidak bisa dikurung lagi', wTrap: 'Rubah tidak bisa bergerak', wStuck: 'Angsa tidak bisa bergerak', wQuiet: '30 langkah masing-masing tanpa tangkapan', wRep: 'Posisi yang sama tiga kali — pengulangan berarti kemenangan rubah', took: '{n} angsa sekaligus!' },
    tr: { q: "{n} kaldı", qt: "Tilki kazanmadan önce yakalamasız kalan hamle sayısı (her biri)", n: ['Tilki', 'Kazlar'], turn: 'Sıra: {p}', win: 'Kazanan: {p}', own: 'Taşlarından birini seç', stuck: 'Bu taş şu an hareket edemez', move: 'Oraya gidemez', more: 'Atlamaya devam edebilir. Burada durmak için bu noktaya bir kez daha dokun', wFew: 'Beş ya da daha az kaz kaldı — artık tilkiyi kapatamazlar', wTrap: 'Tilki hareket edemiyor', wStuck: 'Kazlar hareket edemiyor', wQuiet: '30’er hamle taş alınmadı', wRep: 'Aynı konum üç kez oluştu — tekrar tilkinin galibiyetidir', took: 'Tek hamlede {n} kaz!' },
  };
  // 種目: the four rules, in the full game's order (names and descriptions as its rule cards; g15 = the default)
  const RIDS = ['g15', 'g17', 'g13', 'g13n'], RSZ = [15, 17, 13, 113];   // (113 = 13 geese that never step back; the old 13 / 17 keep their meaning)
  const RN = {
    ja: { n: ["15羽（後退なし）","17羽","13羽（伝統）","13羽（改変）"], d: ["おすすめの形。ガチョウは前・横・斜め前へ1歩。後ろと斜め後ろには下がれません。狐とガチョウの釣り合いがよいとされます。","ガチョウは17羽。前か横にしか進めません（斜め・後ろは不可）。ガチョウ有利。","原典を知りたい方向けの、いちばん古い形。ガチョウは後ろにも下がれるので対局が長引きやすく、このアプリでは同じ局面の3回目か、取り合いなしの30手ずつで狐の勝ちにします。","このアプリの改変ルール。13羽の並びのまま、ガチョウは15羽と同じく後ろに下がれません。"] },
    en: { n: ["15 geese (no retreat)","17 geese","13 geese (traditional)","13 geese (no retreat)"], d: ["The recommended game. A goose steps forward, sideways or diagonally forward — never backwards or diagonally backwards. Said to be well balanced between fox and geese.","17 geese that move only forward or sideways (never diagonally or backwards). Better for the geese.","The oldest form, for those who want to know the original. The geese may step back too, so games can drag on; this app gives the game to the fox at the third repetition or after 30 moves each without a capture.","This app’s own variant: the 13-goose layout, but the geese never step back, as in the 15-goose game."] },
    zh: { n: ["15只鹅（不后退）","17只鹅","13只鹅（传统）","13只鹅（不后退）"], d: ["推荐玩法。鹅可向前、向两侧或斜前方走一步，不能后退，也不能斜着后退。据说狐狸和鹅的实力比较均衡。","17只鹅，只能向前或向两侧走（不能斜走、不能后退）。鹅占优。","最古老的形式，适合想了解原版的人。鹅也能后退，对局容易拖长；本应用规定同一局面出现第三次，或双方各30步没有吃子时，判狐狸获胜。","本应用的改编规则：保留13只鹅的摆法，但鹅和15只鹅时一样不能后退。"] },
    'zh-TW': { n: ["15隻鵝（不後退）","17隻鵝","13隻鵝（傳統）","13隻鵝（不後退）"], d: ["推薦玩法。鵝可向前、向兩側或斜前方走一步，不能後退，也不能斜著後退。據說狐狸和鵝的實力比較均衡。","17隻鵝，只能向前或向兩側走（不能斜走、不能後退）。鵝占優。","最古老的形式，適合想了解原版的人。鵝也能後退，對局容易拖長；本應用規定同一局面出現第三次，或雙方各30步沒有吃子時，判狐狸獲勝。","本應用的改編規則：保留13隻鵝的擺法，但鵝和15隻鵝時一樣不能後退。"] },
    ko: { n: ["거위 15마리(후퇴 없음)","거위 17마리","거위 13마리(전통)","거위 13마리(후퇴 없음)"], d: ["추천 규칙. 거위는 앞·옆·대각선 앞으로 한 칸. 뒤나 대각선 뒤로는 물러날 수 없습니다. 여우와 거위의 균형이 좋다고 합니다.","거위 17마리. 앞이나 옆으로만 갈 수 있습니다(대각선·뒤는 불가). 거위가 유리.","원래 형태를 알고 싶은 분을 위한 가장 오래된 규칙. 거위가 뒤로도 물러날 수 있어 대국이 길어지기 쉬우므로, 이 앱에서는 같은 국면이 세 번째 나오거나 잡기 없이 30수씩 진행되면 여우의 승리로 합니다.","이 앱의 변형 규칙. 13마리 배치 그대로, 거위는 15마리 규칙처럼 뒤로 물러날 수 없습니다."] },
    es: { n: ["15 ocas (sin retroceso)","17 ocas","13 ocas (tradicional)","13 ocas (sin retroceso)"], d: ["La forma recomendada. Una oca da un paso hacia delante, de lado o en diagonal hacia delante; nunca hacia atrás ni en diagonal hacia atrás. Se considera equilibrada entre zorro y ocas.","17 ocas que solo avanzan hacia delante o de lado (nunca en diagonal ni hacia atrás). Ventaja de las ocas.","La forma más antigua, para quien quiera conocer el original. Las ocas también pueden retroceder, así que las partidas se alargan; esta app da la victoria al zorro a la tercera repetición o tras 30 jugadas por bando sin capturas.","Variante propia de esta app: la colocación de 13 ocas, pero sin retroceder, como en el juego de 15."] },
    fr: { n: ["15 oies (sans recul)","17 oies","13 oies (tradition)","13 oies (sans recul)"], d: ["La forme conseillée. Une oie avance d’un pas vers l’avant, sur le côté ou en diagonale vers l’avant — jamais en arrière ni en diagonale arrière. Réputée équilibrée entre le renard et les oies.","17 oies qui ne vont que vers l’avant ou sur le côté (jamais en diagonale ni en arrière). Avantage aux oies.","La forme la plus ancienne, pour qui veut connaître l’original. Les oies peuvent aussi reculer, si bien que la partie peut traîner ; cette app donne alors la victoire au renard à la troisième répétition ou après 30 coups chacun sans prise.","Variante propre à cette app : la disposition à 13 oies, mais sans jamais reculer, comme à 15."] },
    pt: { n: ["15 gansos (sem recuo)","17 gansos","13 gansos (tradicional)","13 gansos (sem recuo)"], d: ["A forma recomendada. Um ganso anda um passo para a frente, para o lado ou na diagonal para a frente — nunca para trás nem na diagonal para trás. Considerada equilibrada entre raposa e gansos.","17 gansos que só andam para a frente ou para o lado (nunca na diagonal nem para trás). Vantagem dos gansos.","A forma mais antiga, para quem quer conhecer o original. Os gansos também podem recuar, então a partida pode se arrastar; este app dá a vitória à raposa na terceira repetição ou após 30 lances de cada lado sem capturas.","Variante própria deste app: a disposição de 13 gansos, mas sem recuar, como no jogo de 15."] },
    de: { n: ["15 Gänse (kein Rückzug)","17 Gänse","13 Gänse (traditionell)","13 Gänse (kein Rückzug)"], d: ["Die empfohlene Form. Eine Gans zieht einen Schritt vorwärts, seitwärts oder schräg vorwärts – nie rückwärts oder schräg rückwärts. Gilt als ausgeglichen zwischen Fuchs und Gänsen.","17 Gänse, die nur vorwärts oder seitwärts ziehen (nie diagonal oder rückwärts). Vorteil für die Gänse.","Die älteste Form, für alle, die das Original kennenlernen wollen. Die Gänse dürfen auch zurück, deshalb ziehen sich Partien leicht hin; diese App wertet sie bei der dritten Wiederholung oder nach je 30 Zügen ohne Schlag als Sieg des Fuchses.","Eine eigene Variante dieser App: die Aufstellung mit 13 Gänsen, aber wie bei 15 Gänsen ohne Rückwärtszüge."] },
    ru: { n: ["15 гусей (без отступления)","17 гусей","13 гусей (традиционные)","13 гусей (без отступления)"], d: ["Рекомендуемый вариант. Гусь ходит на шаг вперёд, вбок или по диагонали вперёд — никогда назад и не по диагонали назад. Считается равным для лисы и гусей.","17 гусей, которые ходят только вперёд или вбок (по диагонали и назад нельзя). Перевес у гусей.","Самый старый вариант — для тех, кто хочет узнать оригинал. Гуси могут ходить и назад, поэтому партия легко затягивается; здесь она достаётся лисе при третьем повторении позиции или после 30 ходов каждого без взятий.","Собственный вариант этого приложения: расстановка 13 гусей, но, как в игре с 15, без ходов назад."] },
    tr: { n: ["15 kaz (geri adım yok)","17 kaz","13 kaz (geleneksel)","13 kaz (geri adım yok)"], d: ["Önerilen biçim. Kaz ileri, yana ya da çapraz ileri bir adım gider; asla geri ya da çapraz geri gidemez. Tilki ile kazlar arasında dengeli olduğu söylenir.","Yalnızca ileri ya da yana giden 17 kaz (çapraz ve geri yok). Kazlar avantajlı.","Aslını merak edenler için en eski biçim. Kazlar geriye de gidebildiği için oyun uzayabilir; bu uygulama aynı konumun üçüncü kez oluşmasında ya da taş alınmadan 30’ar hamlede tilkiyi kazanmış sayar.","Bu uygulamanın kendi çeşitlemesi: 13 kazlık diziliş, ama kazlar 15 kazlı oyundaki gibi geri gidemez."] },
    id: { n: ["15 angsa (tanpa mundur)","17 angsa","13 angsa (tradisional)","13 angsa (tanpa mundur)"], d: ["Bentuk yang disarankan. Angsa melangkah maju, ke samping, atau diagonal maju — tidak pernah mundur atau diagonal mundur. Dikenal seimbang antara rubah dan angsa.","17 angsa yang hanya bisa maju atau ke samping (tidak diagonal, tidak mundur). Angsa diuntungkan.","Bentuk tertua, untuk yang ingin mengenal aslinya. Angsa juga boleh mundur sehingga permainan mudah berlarut; aplikasi ini memberi kemenangan pada rubah saat posisi sama muncul ketiga kalinya atau setelah 30 langkah masing-masing tanpa tangkapan.","Varian buatan aplikasi ini: susunan 13 angsa, tetapi angsa tidak boleh mundur, seperti pada 15 angsa."] },
    hi: { n: ["15 कलहंस (पीछे नहीं)","17 कलहंस","13 कलहंस (पारंपरिक)","13 कलहंस (पीछे नहीं)"], d: ["सुझाया गया रूप। कलहंस आगे, बगल में या तिरछे आगे एक कदम चलता है — पीछे या तिरछे पीछे कभी नहीं। लोमड़ी और कलहंसों के बीच संतुलित माना जाता है।","17 कलहंस, जो सिर्फ़ आगे या बगल में चलते हैं (तिरछे या पीछे कभी नहीं)। कलहंसों को बढ़त।","सबसे पुराना रूप, मूल खेल जानने वालों के लिए। कलहंस पीछे भी हट सकते हैं, इसलिए खेल लंबा खिंच सकता है; यह ऐप ऐसे में तीसरी बार वही स्थिति आने पर या बिना पकड़ के 30-30 चालों के बाद लोमड़ी को जीत देता है।","इस ऐप का अपना रूप: 13 कलहंसों की जमावट, पर 15 वाले खेल की तरह कलहंस पीछे नहीं हट सकते।"] },
    ar: { n: ["15 إوزة (بلا تراجع)","17 إوزة","13 إوزة (تقليدية)","13 إوزة (بلا تراجع)"], d: ["الشكل الموصى به. تخطو الإوزة إلى الأمام أو إلى الجانب أو قُطريًّا إلى الأمام، ولا تتراجع أبدًا إلى الخلف ولا قُطريًّا إلى الخلف. يُعدّ متوازنًا بين الثعلب والإوز.","17 إوزة لا تتحرك إلا إلى الأمام أو إلى الجانب (لا قطريًا ولا إلى الخلف). الأفضلية للإوز.","أقدم الأشكال، لمن يريد التعرّف على الأصل. يستطيع الإوز التراجع أيضًا، لذا قد تطول المباراة؛ ويمنح هذا التطبيق الفوز للثعلب عند تكرار الوضع للمرة الثالثة أو بعد 30 نقلة لكل طرف دون أخذ.","تعديل خاص بهذا التطبيق: ترتيب الـ13 إوزة نفسه، لكن الإوز لا يتراجع كما في لعبة الـ15."] },
  };
  const rn = l => RN[l] || RN.en, rix = z => Math.max(0, RSZ.indexOf(+z));
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): wood on wood ---------- */
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
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 700 * v, 320, .08, .07, 'triangle'); tone(a, t, 190 * v, 100, .1, .16); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1200, 900, .06, .035, 'triangle'); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 620, 1240, .12, .05, 'triangle'); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1000, 0, .05, .03, 'triangle'); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.hud .hs.fgq{gap:3px;font-size:12px;padding:4px 9px;color:#6a6578;background:rgba(60,50,30,.07)}.hud .hs.fgq b{font-weight:900}.hud .hs.fgq.lo{color:#d83a3a;background:rgba(216,58,58,.1)}@media (max-width:420px){.bv.playing .hud .hs.fgq{padding:3px 6px!important;font-size:11px!important}}.fgtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#5d6a1f;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  // the sides' icons (../foxgeese/img/ic-fox.svg · ic-goose.svg: the full game's turn icons) in the HUD and the side pulldown
  const ICON = c => `../foxgeese/img/ic-${c === 1 ? 'fox' : 'goose'}.svg`;
  const DK = [1, 2].map(c => `background:url(${ICON(c)}) center/contain no-repeat;border-radius:0;box-shadow:none`);
  // the card's side choice (atlas/app.js: adapter.sideOpts / optInfo icon): your side and who moves first — 1 狐・先手 (the default) ·
  // 3 狐・後手 · 2 ガチョウ・後手 · 4 ガチョウ・先手 (1 / 2 keep their old meaning: the fox moves first)
  const SIDES = [[1, 1, 1], [3, 1, 2], [4, 2, 2], [2, 2, 1]];   // [value, your side, who moves first]
  const ORD = {
    ja: ['先手', '後手'], en: ['first', 'second'], zh: ['先手', '后手'], 'zh-TW': ['先手', '後手'], ko: ['선수', '후수'], es: ['primer turno', 'segundo turno'], fr: ['en premier', 'en second'],
    pt: ['primeiro', 'segundo'], de: ['zuerst', 'als Zweites'], ru: ['ход первый', 'ход второй'], tr: ['ilk', 'ikinci'], id: ['jalan dulu', 'jalan kedua'], hi: ['पहले', 'बाद में'], ar: ['أولًا', 'ثانيًا'],
  };
  const sideOpts = l => { const X = TX[l] || TX.en, O = ORD[l] || ORD.en, dot = l === 'ja' || l === 'zh' || l === 'zh-TW' ? '・' : ' · '; return SIDES.map(([v, c, f]) => [v, X.n[c - 1] + dot + O[c === f ? 0 : 1]]); };
  const sideOf = v => { const e = SIDES.find(x => x[0] === +v) || SIDES[0]; return { human: e[1], first: e[2] }; };

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en, F3 = T3.foxgeese;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const N = 7, rule = RIDS[rix(ctx.size)] || RIDS[0], board = F3.board(); T3.show('foxgeese', board);
    const U = board.userData, Y = U.top - U.sink;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: U.top + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: U.top + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp', SD = sideOf(ctx.side);
    const human = pvp ? 1 : SD.human, first = SD.first;   // human: 1 the fox · 2 the geese; first: who moves first (two players too)
    const pname = c => X.n[c - 1];
    let E = null;
    const xz = i => { const [r, c] = E.RC[i]; return U.pt(c, r); };   // (never turned: the geese are always on the near side)

    let pos = null, moves = [], legal = [];
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
    const MAT = { last: basic(0xffc94a, .4), lastF: basic(0xffc94a, .2), sel: basic(0xffc94a, .95), dest: basic(0x3fe0c4, .92), stop: basic(0xff9a4a, .95), hint: basic(0xff7a1a, .95) };
    const GEO = { cup: new TH.CircleGeometry(.36, 40), ring: new TH.TorusGeometry(.4, .03, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24) };
    GEO.cup.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, U.top + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- pieces ---------- */
    let pcs = {};   // point → { g, c }
    function mk(col, i) { const g = U.piece(col), sh = T3.contact(F3.R * (col === 1 ? 1.2 : .95), .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SND.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = E.POINTS.filter(i => pos.owner(i));
      order.sort((a, b) => E.RC[b][0] - E.RC[a][0] || E.RC[a][1] - E.RC[b][1]);
      for (const i of order) { const c = pos.owner(i), g = mk(c, i); pcs[i] = { g, c }; g.visible = false; const d = 60 + (n++) * 34; kick(200);
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); SND.put(c === 1 ? .8 : 1.1); }); }, d); }
      return 60 + n * 34 + 300;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (const i of E.POINTS) { const c = pos.owner(i); if (c) pcs[i] = { g: mk(c, i), c }; } kick(300); }
    const HOP = 280;
    // along the points of the move: a step slides, a jump (two points apart) flies in an arc over the goose
    function travel(g, path, done) {
      const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1, far = k => { const a = E.RC[path[k]], b = E.RC[path[k + 1]]; return Math.abs(a[0] - b[0]) === 2 || Math.abs(a[1] - b[1]) === 2; }, hopped = [];
      anim(legs * (far(0) ? HOP : 210), k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q0 = r - i, jump = far(i), q = jump ? q0 : io(q0), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; if (jump) SND.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * (jump ? .7 : .07) + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { E.setFirst(first); pos = E.replay(null, moves).pos; }
    function hud(msg) {
      const num = c => pos ? (c === 1 ? pos.cap : pos.geese) : 0;   // the fox: geese taken · the geese: how many are left
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${num(c)}</b></span>`;
      css();
      // the quiet-move clock (2026-11-17 user: この残り手数をUIに出した方がいい): moves each left without a capture before the fox
      // wins (engine QUIET_MAX plies); red in the last 10
      const ql = pos && !over ? Math.max(0, Math.ceil(((E.QUIET_MAX || 120) - pos.quiet) / 2)) : -1;
      const qc = ql >= 0 ? `<span class="hs fgq${ql <= 10 ? ' lo' : ''}" title="${X.qt}">⏳<b>${X.q.replace('{n}', ql)}</b></span>` : '';
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${qc}${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'fgtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }
    function showMarks() {
      clear(hl); hintJ++;
      if (moves.length) { const p = E.path(moves[moves.length - 1]); mark(hl, GEO.cup, MAT.lastF, p[0]); mark(hl, GEO.cup, MAT.last, p[p.length - 1]); }
    }

    /* ---------- selection: sel = { from, pre: the points tapped so far (pre[0] = from), cands: the moves that start with pre } ---------- */
    const startsWith = (m, pre) => { const p = E.path(m); return p.length >= pre.length && pre.every((x, k) => p[k] === x); };
    function drawSel() {
      clear(mv); if (!sel) return;
      const at = sel.pre[sel.pre.length - 1], k = sel.pre.length;
      mark(mv, GEO.ring, sel.pre.length > 1 ? MAT.stop : MAT.sel, at, .05);
      sel.pre.slice(1, -1).forEach(i => mark(mv, GEO.dot, MAT.sel, i, .03));
      new Set(sel.cands.filter(m => E.path(m).length > k).map(m => E.path(m)[k])).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .03));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, pre: [i], cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.2 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }

    /* ---------- moves ---------- */
    function play(m, done) {
      const path = E.path(m), f = path[0], to = path[path.length - 1], fox = pos.owner(f) === 1, caps = fox ? E.jumped(m) : [];
      clear(mv); sel = null;
      const p = pcs[f]; delete pcs[f];
      caps.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c.g, k * HOP + HOP * .45); } });
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud(caps.length > 1 ? X.took.replace('{n}', caps.length) : '');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      travel(p.g, path, done);
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      E.setFirst(first); const st = E.judge(pos, E.replay(null, moves).hashes);   // 同じ局面の3回目・取りのない60手ずつは狐の勝ち（引き分けなし）
      if (st.over) return end(st);
      legal = pos.moves();
      showMarks();
      onTurn();
      if (pvp || pos.side + 1 === human) { hud(pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw, why = X[{ few: 'wFew', trap: 'wTrap', stuck: 'wStuck', quiet: 'wQuiet', rep: 'wRep' }[st.why]] || '';
      if (pvp) { const wt = draw ? L.draw : X.win.replace('{p}', pname(st.winner)); hud(wt); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt }), 700); return; }
      const win = !draw && st.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule, first }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { E.setRule(rule); E.setFirst(first); m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule, first });
    }

    /* ---------- input ---------- */
    function pointOf(e) {
      const p = T3.pick(e, U.top); if (!p) return -1;
      const c = Math.round(p.x + (N - 1) / 2), r = Math.round(p.z + (N - 1) / 2);
      if (c < 0 || c > N - 1 || r < 0 || r > N - 1) return -1;
      const i = E.sqAt(r, c); return E.ON[i] ? i : -1;
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = pointOf(e); if (i < 0) { deselect(); return; }
      const me = pos.side + 1;
      if (sel) {
        const k = sel.pre.length, at = sel.pre[k - 1];
        const go = sel.cands.filter(x => E.path(x).length > k && E.path(x)[k] === i);   // 続きの手を先に見る（出発点へ戻る連続跳びもある）
        if (k > 1 && !go.length && i === at) { const m = sel.cands.find(x => E.path(x).length === k); if (m != null) { commit(m); return; } }   // stop here: 今いる点をもう一度
        if (go.length) {
          if (go.length === 1 && E.path(go[0]).length === k + 1) { commit(go[0]); return; }   // nothing beyond: the move is complete
          sel.pre.push(i); sel.cands = go; drawSel(); SND.lift(); toast(X.more); return;   // the fox could jump on from there
        }
        if (k > 1) { toast(X.more); return; }
      }
      if (pos.owner(i) === me) {
        if (sel && sel.from === i) { deselect(); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { toast(X.stuck); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); return; }
      if (!pos.owner(i)) toast(X.move);
      deselect();
    }
    ctx.el.addEventListener('click', onClick);
    // the board view's 駒 row (Table3D.PIECES) during a game: the pieces on the board are rebuilt in the new set at once
    const onPcs = e => { if (!stopped && pos && e.detail && e.detail.id === 'foxgeese') { sel = null; clear(mv); rebuild(); } };
    addEventListener('atlas-pieces', onPcs);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule(rule); E.setFirst(first); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, U.top); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, rule, sel: sel ? sel.pre.slice() : null, pieces: Object.keys(pcs).length, geese: pos && pos.geese, cap: pos && pos.cap }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m), path: E.path(m) })),
    };
    window.Atlas3D.foxgeese._dbg = dbg;
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
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human !== first ? 1 : 0)),
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
            E.path(m).map((s, k) => mark(hl, k ? GEO.dot : GEO.ring, MAT.hint, s, .06)).forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule, first });
        });
      },
      canDraw: () => false,   // (there is no draw)
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); removeEventListener('atlas-pieces', onPcs);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.foxgeese._dbg === dbg) delete window.Atlas3D.foxgeese._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 (foxgeese/i18n-fg*.js) ---------- */
  const LVD = {
    ja: ['入門：目先の1手だけを見る', '初級〜中級：跳ばれる形に気づく', '上級：数手先の囲みを読む', '最上級：深く読んで追いつめる'],
    en: ['Beginner: looks one move ahead', 'Novice–intermediate: notices geese that can be jumped', 'Advanced: reads the net a few moves ahead', 'Top: reads deep and closes in'],
    zh: ['入门：只看眼前一步', '初级～中级：会注意会被跳吃的棋形', '高级：能算几步之后的包围', '最高级：深算并步步紧逼'],
    ko: ['입문: 눈앞의 한 수만 본다', '초급~중급: 뛰어넘길 모양을 알아챈다', '상급: 몇 수 앞의 포위를 읽는다', '최상급: 깊이 읽고 몰아넣는다'],
    es: ['Principiante: solo mira una jugada', 'Novato–intermedio: ve las ocas que pueden ser saltadas', 'Avanzado: calcula el cerco unas jugadas más allá', 'Experto: calcula a fondo y va cerrando'],
    fr: ['Débutant : ne regarde qu’un coup', 'Novice–intermédiaire : repère les oies qu’on peut sauter', 'Avancé : calcule l’encerclement quelques coups plus loin', 'Expert : calcule en profondeur et resserre l’étau'],
    pt: ['Iniciante: olha só um lance', 'Novato–intermediário: percebe gansos que podem ser saltados', 'Avançado: calcula o cerco alguns lances à frente', 'Especialista: calcula fundo e vai fechando'],
    de: ['Anfänger: schaut nur einen Zug voraus', 'Einsteiger–Mittel: bemerkt Gänse, die übersprungen werden können', 'Fortgeschritten: rechnet das Netz ein paar Züge voraus', 'Experte: rechnet tief und zieht die Schlinge zu'],
    hi: ['शुरुआती: सिर्फ़ अगली चाल देखता है', 'नौसिखिया–मध्यम: कूदे जा सकने वाले कलहंस पहचान लेता है', 'उन्नत: कुछ चालें आगे का घेरा पढ़ता है', 'विशेषज्ञ: गहराई से पढ़कर घेरा कसता है'],
    ar: ['مبتدئ: يرى نقلة واحدة فقط', 'مبتدئ–متوسط: ينتبه للإوز المعرّض للقفز', 'متقدم: يحسب الحصار لبضع نقلات', 'خبير: يحسب بعمق ويضيّق الخناق'],
    ru: ['Начальный: видит на один ход', 'Новичок–средний: замечает гусей, через которых можно прыгнуть', 'Продвинутый: считает окружение на несколько ходов', 'Эксперт: считает глубоко и затягивает кольцо'],
    'zh-TW': ['入門：只看眼前一步', '初級～中級：會注意會被跳吃的棋形', '高級：能算幾步之後的包圍', '最高級：深算並步步進逼'],
    id: ['Pemula: hanya melihat satu langkah', 'Dasar–menengah: menyadari angsa yang bisa dilompati', 'Mahir: membaca kepungan beberapa langkah ke depan', 'Ahli: membaca dalam dan terus mempersempit'],
    tr: ['Başlangıç: yalnızca bir hamle ileriye bakar', 'Acemi–orta: üzerinden atlanabilecek kazları fark eder', 'İleri: kuşatmayı birkaç hamle ileriye okur', 'Uzman: derin okur ve çemberi daraltır'],
  };
  const RATING = [0, 100, 245, 395, 540, 685, 830, 980, 1125, 1270, 1415, 1565, 1710, 1855, 1950, 2020, 2090, 2150, 2205, 2440, 2500];   // foxgeese RT_LV (rated games; not measured yet — see the spec)
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
  // the 種目 cards' pictures: the cross with its lines, the fox in the middle and the 15 / 17 / 13 geese
  function kindArt(sid, v) {
    const k = rix(v), u = 12, pd = 8, w = 6 * u + pd * 2, on = (x, y) => (x >= 2 && x <= 4) || (y >= 2 && y <= 4), P = (x, y) => `${pd + x * u} ${pd + y * u}`;
    let o = `<svg viewBox="0 0 ${w} ${w}" aria-hidden="true"><rect width="${w}" height="${w}" rx="6" fill="#6b4a2a"/><path d="M${pd + 2 * u - 6} ${pd - 6}h${2 * u + 12}v${2 * u}h${2 * u}v${2 * u + 12}h${-2 * u}v${2 * u}h${-2 * u - 12}v${-2 * u}h${-2 * u}v${-2 * u - 12}h${2 * u}z" fill="#c9a26a"/><g stroke="#5a3a1c" stroke-width=".8" fill="none">`;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { if (!on(x, y)) continue;
      if (x < 6 && on(x + 1, y)) o += `<path d="M${P(x, y)}L${P(x + 1, y)}"/>`; if (y < 6 && on(x, y + 1)) o += `<path d="M${P(x, y)}L${P(x, y + 1)}"/>`;
      if ((x + y) % 2 === 0) { if (x < 6 && y < 6 && on(x + 1, y + 1)) o += `<path d="M${P(x, y)}L${P(x + 1, y + 1)}"/>`; if (x > 0 && y < 6 && on(x - 1, y + 1)) o += `<path d="M${P(x, y)}L${P(x - 1, y + 1)}"/>`; } }
    o += '</g>';
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (on(x, y) && (y >= 4 || (y === 3 && (RSZ[k] === 17 ? x < 2 || x > 4 : RSZ[k] === 15 && (x === 0 || x === 6))))) o += `<circle cx="${pd + x * u}" cy="${pd + y * u}" r="3.6" fill="#f4ead6" stroke="#8a7550" stroke-width=".5"/>`;
    return o + `<circle cx="${pd + 3 * u}" cy="${pd + 3 * u}" r="4.6" fill="#c8501e" stroke="#6a2a12" stroke-width=".6"/></svg>`;
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.foxgeese = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', kindFirst: true, sizes: RSZ, size0: 15, sizeLabel: () => 'Rules',
    sideOpts, sizeName: (z, l) => rn(l).n[rix(z)], optInfo: (sid, v, l) => sid === 'bvSize' ? { sub: rn(l).d[rix(v)] } : sid === 'bvSide' ? { icon: `<img src="${ICON(sideOf(v).human)}" alt="" style="width:20px;height:20px;vertical-align:-4px;margin-right:6px">` } : null, kindArt, levelInfo, start };
})();
