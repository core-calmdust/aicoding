/* =====================================================================
   Carrom on the portal — table play (3D only: carrom has no 2D page).
   · Rules, physics and AI: ../carrom/engine.js (CarromEngine), the AI thinks in ../carrom/worker.js.
   · Board, men, striker: Table3D.MODELS.carrom (atlas/models/carrom.js), the classic or the modern board (the 盤 row).
   · You always strike from the near side (player 0). "First" = you break and play white; "second" = the AI breaks with white.
     Two players on one device: the board turns so the player to strike is always at the bottom.
   · Controls: slide the striker along the base line (drag it sideways, or ← →), then press on the striker and pull back —
     the arrow shows where it goes and how hard — and let go to flick. The dotted guide shows the first man it meets.
   · Game length (the size select): 1 board, or a match to 25 points (8 boards at most, as the ICF laws).
   ===================================================================== */
(function () {
  'use strict';
  const TXT = {
    ja: { len: 'ゲームの長さ', b1: '1ボード', b25: '25点マッチ', w: '白', b: '黒', q: 'クイーン', place: 'ストライカーを左右に動かして、引っぱって離すとはじくよ', brk: 'ブレイク！ 真ん中の駒をめがけて強くはじこう', aim: '離すとはじく（強さ {p}%）', think: '{p}が狙っている…', turn: '{p}の番', own: '入った！ もう一回', opp: '相手の駒が入った… 交代', none: '交代', 'brk.miss': 'ブレイクは駒に当てよう！ もう一回（あと{n}回）', 'brk.pass': '3回外したので、ブレイクは相手へ', 'foul.striker': 'ストライカーが落ちた！ 1枚を中央に戻すよ', 'q.early': 'クイーンは自分の駒を1枚入れてから！ 中央に戻すよ', 'q.due': 'ペナルティが残っているので、クイーンは中央へ', 'q.pend': 'クイーン！ 次に自分の駒を入れてカバーしよう', 'q.cov': 'クイーンをカバー！ +3点のチャンス', 'q.fail': 'カバーできず… クイーンは中央へ', 'q.back': 'クイーンは中央に戻るよ', 'foul.last': 'クイーンが残っているうちは、最後の1枚は入れられない！', 'foul.oppLast': '相手の最後の1枚を入れたので反則', board: '{p}がボードを取った！ +{n}点', next: 'ボード {n}', hint: 'おすすめ：この位置から、強さ {p}% くらい', hintNone: '入る手が見つからないよ。守りの一打を', due: 'ペナルティ {n}', score: '{a} − {b}', skip: 'タップで早送り' },
    en: { len: 'Game length', b1: '1 board', b25: 'Match to 25', w: 'White', b: 'Black', q: 'Queen', place: 'Slide the striker, then pull it back and let go to flick', brk: 'The break! Flick hard at the men in the middle', aim: 'Let go to flick (power {p}%)', think: '{p} is aiming…', turn: "{p}'s turn", own: 'In! Strike again', opp: "The other side's man went in… turn passes", none: 'Turn passes', 'brk.miss': 'The break must hit a man! Again ({n} left)', 'brk.pass': 'Three misses: the break passes over', 'foul.striker': 'The striker went in! One man goes back to the centre', 'q.early': 'Pocket one of your own men before the queen! Back to the centre', 'q.due': 'You still owe a penalty: the queen goes back', 'q.pend': 'The queen! Pocket one of yours next to cover it', 'q.cov': 'Queen covered! Worth 3 points', 'q.fail': 'Not covered… the queen goes back', 'q.back': 'The queen goes back to the centre', 'foul.last': "You can't sink your last man while the queen is on the board!", 'foul.oppLast': "Foul: you sank your opponent's last man", board: '{p} takes the board! +{n}', next: 'Board {n}', hint: 'Try from here, about {p}% power', hintNone: 'No pot on — play it safe', due: 'Penalty {n}', score: '{a} − {b}', skip: 'Tap to speed up' },
    zh: { len: '对局长度', b1: '1局', b25: '先到25分', w: '白', b: '黑', q: '皇后', place: '左右移动击子，向后拉再放开就能弹出', brk: '开球！用力弹向中间的棋子', aim: '放开就弹出（力度 {p}%）', think: '{p}正在瞄准…', turn: '轮到{p}', own: '进了！再来一次', opp: '对方的子进了…换人', none: '换人', 'brk.miss': '开球要碰到棋子！再来（还剩{n}次）', 'brk.pass': '三次没碰到，开球交给对方', 'foul.striker': '击子掉进去了！放回1枚到中央', 'q.early': '先打进1枚自己的子才能打皇后！放回中央', 'q.due': '还有罚子，皇后放回中央', 'q.pend': '皇后！下一杆打进自己的子来掩护', 'q.cov': '皇后掩护成功！值3分', 'q.fail': '没能掩护…皇后回到中央', 'q.back': '皇后回到中央', 'foul.last': '皇后还在盘上，最后1枚不能打进！', 'foul.oppLast': '打进了对方最后1枚，犯规', board: '{p}赢下这一局！+{n}分', next: '第{n}局', hint: '建议：从这里，力度约{p}%', hintNone: '没有能进的球，打个防守吧', due: '罚子 {n}', score: '{a} − {b}', skip: '点击快进' },
    'zh-TW': { len: '對局長度', b1: '1局', b25: '先到25分', w: '白', b: '黑', q: '皇后', place: '左右移動擊子，往後拉再放開就能彈出', brk: '開球！用力彈向中間的棋子', aim: '放開就彈出（力道 {p}%）', think: '{p}正在瞄準…', turn: '輪到{p}', own: '進了！再來一次', opp: '對方的子進了…換人', none: '換人', 'brk.miss': '開球要碰到棋子！再來（還剩{n}次）', 'brk.pass': '三次沒碰到，開球交給對方', 'foul.striker': '擊子掉進去了！放回1枚到中央', 'q.early': '先打進1枚自己的子才能打皇后！放回中央', 'q.due': '還有罰子，皇后放回中央', 'q.pend': '皇后！下一桿打進自己的子來掩護', 'q.cov': '皇后掩護成功！值3分', 'q.fail': '沒能掩護…皇后回到中央', 'q.back': '皇后回到中央', 'foul.last': '皇后還在盤上，最後1枚不能打進！', 'foul.oppLast': '打進了對方最後1枚，犯規', board: '{p}拿下這一局！+{n}分', next: '第{n}局', hint: '建議：從這裡，力道約{p}%', hintNone: '沒有能進的球，打個防守吧', due: '罰子 {n}', score: '{a} − {b}', skip: '點一下快轉' },
    ko: { len: '게임 길이', b1: '1보드', b25: '25점 매치', w: '흰색', b: '검은색', q: '퀸', place: '스트라이커를 좌우로 옮기고, 뒤로 당겼다 놓으면 튕겨', brk: '브레이크! 가운데 말들을 향해 세게 튕겨', aim: '놓으면 튕겨 (세기 {p}%)', think: '{p}이(가) 노리는 중…', turn: '{p}의 차례', own: '들어갔다! 한 번 더', opp: '상대 말이 들어갔어… 교대', none: '교대', 'brk.miss': '브레이크는 말을 맞혀야 해! 다시 (남은 {n}번)', 'brk.pass': '세 번 실패해서 브레이크는 상대에게', 'foul.striker': '스트라이커가 빠졌어! 1개를 가운데로 돌려놓을게', 'q.early': '퀸은 자기 말을 1개 넣은 뒤에! 가운데로 돌려놓을게', 'q.due': '벌칙이 남아 있어서 퀸은 가운데로', 'q.pend': '퀸! 다음에 자기 말을 넣어서 커버하자', 'q.cov': '퀸 커버 성공! 3점짜리야', 'q.fail': '커버 실패… 퀸은 가운데로', 'q.back': '퀸은 가운데로 돌아가', 'foul.last': '퀸이 남아 있으면 마지막 1개는 넣을 수 없어!', 'foul.oppLast': '상대의 마지막 말을 넣어서 반칙', board: '{p}이(가) 보드를 땄다! +{n}점', next: '보드 {n}', hint: '추천: 이 위치에서 세기 {p}% 정도', hintNone: '넣을 수 있는 수가 없어. 수비로 한 번', due: '벌칙 {n}', score: '{a} − {b}', skip: '탭하면 빨리 감기' },
    es: { len: 'Duración', b1: '1 tablero', b25: 'Partida a 25', w: 'Blancas', b: 'Negras', q: 'Reina', place: 'Desliza el striker, tira hacia atrás y suelta para lanzar', brk: '¡El saque! Lanza fuerte hacia las fichas del centro', aim: 'Suelta para lanzar (fuerza {p}%)', think: '{p} está apuntando…', turn: 'Turno de {p}', own: '¡Dentro! Tira otra vez', opp: 'Entró una ficha rival… cambio de turno', none: 'Cambio de turno', 'brk.miss': '¡El saque debe tocar una ficha! Otra vez (quedan {n})', 'brk.pass': 'Tres fallos: el saque pasa al rival', 'foul.striker': '¡Entró el striker! Una ficha vuelve al centro', 'q.early': '¡Primero mete una ficha tuya! La reina vuelve al centro', 'q.due': 'Aún debes una penalización: la reina vuelve', 'q.pend': '¡La reina! Mete una tuya en el siguiente tiro para cubrirla', 'q.cov': '¡Reina cubierta! Vale 3 puntos', 'q.fail': 'Sin cubrir… la reina vuelve al centro', 'q.back': 'La reina vuelve al centro', 'foul.last': '¡No puedes meter tu última ficha con la reina en el tablero!', 'foul.oppLast': 'Falta: metiste la última ficha rival', board: '¡{p} gana el tablero! +{n}', next: 'Tablero {n}', hint: 'Prueba desde aquí, con un {p}% de fuerza', hintNone: 'No hay tiro claro: juega seguro', due: 'Penalización {n}', score: '{a} − {b}', skip: 'Toca para acelerar' },
    fr: { len: 'Durée', b1: '1 plateau', b25: 'Match en 25', w: 'Blancs', b: 'Noirs', q: 'Reine', place: 'Fais glisser le striker, tire-le en arrière et lâche pour tirer', brk: "La casse ! Tire fort vers les pions du centre", aim: 'Lâche pour tirer (puissance {p} %)', think: '{p} vise…', turn: 'À {p}', own: 'Dedans ! Rejoue', opp: "Un pion adverse est entré… au tour de l'autre", none: "Au tour de l'autre", 'brk.miss': 'La casse doit toucher un pion ! Encore ({n} restant)', 'brk.pass': 'Trois ratés : la casse passe à l’adversaire', 'foul.striker': 'Le striker est tombé ! Un pion revient au centre', 'q.early': "Empoche d'abord un de tes pions ! La reine revient au centre", 'q.due': 'Tu dois encore une pénalité : la reine revient', 'q.pend': 'La reine ! Empoche un des tiens ensuite pour la couvrir', 'q.cov': 'Reine couverte ! Elle vaut 3 points', 'q.fail': 'Pas couverte… la reine revient au centre', 'q.back': 'La reine revient au centre', 'foul.last': 'Pas ton dernier pion tant que la reine est sur le plateau !', 'foul.oppLast': "Faute : tu as empoché le dernier pion adverse", board: '{p} remporte le plateau ! +{n}', next: 'Plateau {n}', hint: "Essaie d'ici, environ {p} % de puissance", hintNone: 'Rien à empocher : joue la sécurité', due: 'Pénalité {n}', score: '{a} − {b}', skip: 'Touche pour accélérer' },
    pt: { len: 'Duração', b1: '1 tabuleiro', b25: 'Partida até 25', w: 'Brancas', b: 'Pretas', q: 'Rainha', place: 'Deslize o striker, puxe para trás e solte para tacar', brk: 'A abertura! Taque forte nas peças do centro', aim: 'Solte para tacar (força {p}%)', think: '{p} está mirando…', turn: 'Vez de {p}', own: 'Entrou! Jogue de novo', opp: 'Entrou uma peça do rival… passa a vez', none: 'Passa a vez', 'brk.miss': 'A abertura precisa tocar uma peça! De novo (restam {n})', 'brk.pass': 'Três erros: a abertura passa ao rival', 'foul.striker': 'O striker caiu! Uma peça volta ao centro', 'q.early': 'Primeiro encaçape uma peça sua! A rainha volta ao centro', 'q.due': 'Você ainda deve uma penalidade: a rainha volta', 'q.pend': 'A rainha! Encaçape uma sua em seguida para cobri-la', 'q.cov': 'Rainha coberta! Vale 3 pontos', 'q.fail': 'Não cobriu… a rainha volta ao centro', 'q.back': 'A rainha volta ao centro', 'foul.last': 'Não pode encaçapar sua última peça com a rainha no tabuleiro!', 'foul.oppLast': 'Falta: você encaçapou a última peça do rival', board: '{p} leva o tabuleiro! +{n}', next: 'Tabuleiro {n}', hint: 'Tente daqui, com uns {p}% de força', hintNone: 'Nenhuma jogada clara: jogue seguro', due: 'Penalidade {n}', score: '{a} − {b}', skip: 'Toque para acelerar' },
    de: { len: 'Spiellänge', b1: '1 Board', b25: 'Match bis 25', w: 'Weiß', b: 'Schwarz', q: 'Königin', place: 'Striker verschieben, zurückziehen und loslassen zum Schnippen', brk: 'Der Anstoß! Schnipp kräftig auf die Steine in der Mitte', aim: 'Loslassen zum Schnippen (Kraft {p} %)', think: '{p} zielt…', turn: '{p} ist dran', own: 'Drin! Noch einmal', opp: 'Ein gegnerischer Stein ist drin… Wechsel', none: 'Wechsel', 'brk.miss': 'Der Anstoß muss einen Stein treffen! Nochmal (noch {n})', 'brk.pass': 'Dreimal verfehlt: Anstoß wechselt', 'foul.striker': 'Der Striker ist drin! Ein Stein kommt zurück in die Mitte', 'q.early': 'Erst einen eigenen Stein versenken! Die Königin kommt zurück', 'q.due': 'Noch eine Strafe offen: die Königin kommt zurück', 'q.pend': 'Die Königin! Versenk als Nächstes einen eigenen, um sie zu decken', 'q.cov': 'Königin gedeckt! 3 Punkte wert', 'q.fail': 'Nicht gedeckt… die Königin kommt zurück', 'q.back': 'Die Königin kommt in die Mitte zurück', 'foul.last': 'Deinen letzten Stein nicht, solange die Königin liegt!', 'foul.oppLast': 'Foul: den letzten Stein des Gegners versenkt', board: '{p} gewinnt das Board! +{n}', next: 'Board {n}', hint: 'Versuch es von hier, etwa {p} % Kraft', hintNone: 'Nichts zu versenken: spiel sicher', due: 'Strafe {n}', score: '{a} − {b}', skip: 'Tippen zum Vorspulen' },
    ru: { len: 'Длина игры', b1: '1 доска', b25: 'Матч до 25', w: 'Белые', b: 'Чёрные', q: 'Королева', place: 'Сдвинь страйкер, оттяни назад и отпусти, чтобы щёлкнуть', brk: 'Разбивка! Бей сильно по фишкам в центре', aim: 'Отпусти для удара (сила {p}%)', think: '{p} прицеливается…', turn: 'Ход: {p}', own: 'Есть! Ещё удар', opp: 'Забита фишка соперника… переход хода', none: 'Переход хода', 'brk.miss': 'Разбивка должна задеть фишку! Ещё раз (осталось {n})', 'brk.pass': 'Три промаха: разбивка переходит к сопернику', 'foul.striker': 'Страйкер упал в лузу! Одна фишка возвращается в центр', 'q.early': 'Сначала забей свою фишку! Королева — в центр', 'q.due': 'Ещё есть штраф: королева возвращается', 'q.pend': 'Королева! Следующим ударом забей свою, чтобы прикрыть', 'q.cov': 'Королева прикрыта! Это 3 очка', 'q.fail': 'Не прикрыта… королева — в центр', 'q.back': 'Королева возвращается в центр', 'foul.last': 'Нельзя забить последнюю фишку, пока королева на доске!', 'foul.oppLast': 'Фол: забита последняя фишка соперника', board: '{p} берёт доску! +{n}', next: 'Доска {n}', hint: 'Попробуй отсюда, сила около {p}%', hintNone: 'Забить нечего — сыграй надёжно', due: 'Штраф {n}', score: '{a} − {b}', skip: 'Нажми, чтобы ускорить' },
    tr: { len: 'Oyun uzunluğu', b1: '1 tahta', b25: '25 sayıya maç', w: 'Beyaz', b: 'Siyah', q: 'Kraliçe', place: 'Vurucuyu kaydır, geri çek ve bırakıp fiskele', brk: 'Açılış! Ortadaki taşlara güçlü vur', aim: 'Bırakınca fiskeler (güç %{p})', think: '{p} nişan alıyor…', turn: 'Sıra: {p}', own: 'Girdi! Bir daha', opp: 'Rakibin taşı girdi… sıra geçti', none: 'Sıra geçti', 'brk.miss': 'Açılış bir taşa değmeli! Tekrar ({n} hak)', 'brk.pass': 'Üç ıska: açılış rakibe geçti', 'foul.striker': 'Vurucu düştü! Bir taş ortaya döner', 'q.early': 'Önce kendi taşını sok! Kraliçe ortaya döner', 'q.due': 'Hâlâ ceza borcun var: kraliçe döner', 'q.pend': 'Kraliçe! Sıradaki atışta kendi taşını sokup kapat', 'q.cov': 'Kraliçe kapatıldı! 3 puan değerinde', 'q.fail': 'Kapatılamadı… kraliçe ortaya döner', 'q.back': 'Kraliçe ortaya döner', 'foul.last': 'Kraliçe tahtadayken son taşını sokamazsın!', 'foul.oppLast': 'Faul: rakibin son taşını soktun', board: '{p} tahtayı aldı! +{n}', next: '{n}. tahta', hint: 'Buradan dene, yaklaşık %{p} güç', hintNone: 'Girecek taş yok: güvenli oyna', due: 'Ceza {n}', score: '{a} − {b}', skip: 'Hızlandırmak için dokun' },
    id: { len: 'Panjang permainan', b1: '1 papan', b25: 'Laga sampai 25', w: 'Putih', b: 'Hitam', q: 'Ratu', place: 'Geser striker, tarik ke belakang lalu lepas untuk menyentil', brk: 'Pembukaan! Sentil kuat ke biji di tengah', aim: 'Lepas untuk menyentil (tenaga {p}%)', think: '{p} sedang membidik…', turn: 'Giliran {p}', own: 'Masuk! Sentil lagi', opp: 'Biji lawan masuk… giliran pindah', none: 'Giliran pindah', 'brk.miss': 'Pembukaan harus mengenai biji! Lagi (sisa {n})', 'brk.pass': 'Tiga kali meleset: pembukaan pindah ke lawan', 'foul.striker': 'Striker masuk! Satu biji kembali ke tengah', 'q.early': 'Masukkan dulu satu bijimu! Ratu kembali ke tengah', 'q.due': 'Masih ada denda: ratu kembali', 'q.pend': 'Ratu! Masukkan bijimu berikutnya untuk menutupnya', 'q.cov': 'Ratu tertutup! Bernilai 3 poin', 'q.fail': 'Tidak tertutup… ratu kembali ke tengah', 'q.back': 'Ratu kembali ke tengah', 'foul.last': 'Biji terakhirmu tak boleh masuk selama ratu di papan!', 'foul.oppLast': 'Pelanggaran: kamu memasukkan biji terakhir lawan', board: '{p} memenangkan papan! +{n}', next: 'Papan {n}', hint: 'Coba dari sini, tenaga sekitar {p}%', hintNone: 'Tak ada yang bisa masuk: main aman', due: 'Denda {n}', score: '{a} − {b}', skip: 'Ketuk untuk mempercepat' },
    hi: { len: 'खेल की लंबाई', b1: '1 बोर्ड', b25: '25 अंकों का मैच', w: 'सफ़ेद', b: 'काला', q: 'रानी', place: 'स्ट्राइकर खिसकाओ, पीछे खींचो और छोड़कर मारो', brk: 'ब्रेक! बीच की गोटियों पर ज़ोर से मारो', aim: 'छोड़ते ही वार (ताक़त {p}%)', think: '{p} निशाना लगा रहा है…', turn: '{p} की बारी', own: 'गई! फिर से मारो', opp: 'विरोधी की गोटी गई… बारी बदली', none: 'बारी बदली', 'brk.miss': 'ब्रेक में गोटी छूनी चाहिए! फिर से ({n} बाकी)', 'brk.pass': 'तीन बार चूके: ब्रेक विरोधी को', 'foul.striker': 'स्ट्राइकर गिर गया! एक गोटी बीच में लौटेगी', 'q.early': 'पहले अपनी एक गोटी डालो! रानी बीच में लौटेगी', 'q.due': 'अभी दंड बाकी है: रानी लौटेगी', 'q.pend': 'रानी! अगली बार अपनी गोटी डालकर कवर करो', 'q.cov': 'रानी कवर! 3 अंक की', 'q.fail': 'कवर नहीं हुई… रानी बीच में', 'q.back': 'रानी बीच में लौटती है', 'foul.last': 'रानी बोर्ड पर हो तो आख़िरी गोटी नहीं डाल सकते!', 'foul.oppLast': 'फ़ाउल: विरोधी की आख़िरी गोटी डाल दी', board: '{p} ने बोर्ड जीता! +{n}', next: 'बोर्ड {n}', hint: 'यहाँ से, लगभग {p}% ताक़त से', hintNone: 'कोई गोटी नहीं जा रही: सुरक्षित खेलो', due: 'दंड {n}', score: '{a} − {b}', skip: 'तेज़ करने के लिए छुओ' },
    ar: { len: 'طول اللعبة', b1: 'لوحة واحدة', b25: 'مباراة حتى 25', w: 'الأبيض', b: 'الأسود', q: 'الملكة', place: 'حرّك الضارب، ثم اسحبه للخلف وأفلته لتنقر', brk: 'الكسر! انقر بقوة نحو القطع في الوسط', aim: 'أفلت لتنقر (القوة {p}%)', think: '{p} يصوّب…', turn: 'دور {p}', own: 'دخلت! مرة أخرى', opp: 'دخلت قطعة الخصم… انتقل الدور', none: 'انتقل الدور', 'brk.miss': 'يجب أن يلمس الكسر قطعة! مرة أخرى (بقي {n})', 'brk.pass': 'ثلاث مرات بلا لمس: الكسر للخصم', 'foul.striker': 'سقط الضارب! تعود قطعة إلى الوسط', 'q.early': 'أدخل قطعة من قطعك أولًا! الملكة تعود إلى الوسط', 'q.due': 'عليك غرامة بعد: الملكة تعود', 'q.pend': 'الملكة! أدخل قطعة لك في الضربة التالية لتغطيتها', 'q.cov': 'غُطيت الملكة! تساوي 3 نقاط', 'q.fail': 'لم تُغطَّ… تعود الملكة إلى الوسط', 'q.back': 'تعود الملكة إلى الوسط', 'foul.last': 'لا تُدخل آخر قطعة لك والملكة على اللوحة!', 'foul.oppLast': 'خطأ: أدخلت آخر قطعة للخصم', board: '{p} يأخذ اللوحة! +{n}', next: 'اللوحة {n}', hint: 'جرّب من هنا بقوة نحو {p}%', hintNone: 'لا ضربة واضحة: العب بأمان', due: 'غرامة {n}', score: '{a} − {b}', skip: 'المس للتسريع' },
  };
  const LVD = {
    ja: ['入門：狙いが大きくぶれる', '初級：近くの駒をねらう', '中級：入れ方と次の形を考える', '上級：正確に連続で入れる'],
    en: ['Beginner: a shaky aim', 'Novice: goes for the nearest men', 'Intermediate: plans the pot and the next shot', 'Expert: sinks them one after another'],
    zh: ['入门：瞄得很飘', '初级：打离得近的子', '中级：考虑进球和下一杆', '高级：精准地连续打进'], 'zh-TW': ['入門：瞄得很飄', '初級：打離得近的子', '中級：考慮進球和下一桿', '高級：精準地連續打進'],
    ko: ['입문: 조준이 크게 흔들린다', '초급: 가까운 말을 노린다', '중급: 넣는 법과 다음 모양을 생각한다', '상급: 정확하게 연속으로 넣는다'],
    es: ['Inicial: puntería temblorosa', 'Principiante: va a por las fichas cercanas', 'Intermedio: planea el tiro y el siguiente', 'Experto: las mete una tras otra'],
    fr: ['Débutant : visée hésitante', 'Novice : vise les pions proches', 'Intermédiaire : prépare le coup suivant', 'Expert : les empoche à la chaîne'],
    pt: ['Iniciante: mira trêmula', 'Básico: mira as peças próximas', 'Intermediário: planeja a tacada e a próxima', 'Especialista: encaçapa uma após outra'],
    de: ['Einsteiger: zielt wackelig', 'Anfänger: nimmt die nächsten Steine', 'Mittel: plant den Stoß und den nächsten', 'Experte: versenkt einen nach dem anderen'],
    ru: ['Начальный: дрожащий прицел', 'Новичок: бьёт по ближним фишкам', 'Средний: думает о следующем ударе', 'Эксперт: забивает одну за другой'],
    tr: ['Başlangıç: titrek nişan', 'Acemi: yakındaki taşlara vurur', 'Orta: atışı ve sonrasını planlar', 'Uzman: art arda sokar'],
    id: ['Pemula: bidikan goyah', 'Dasar: mengincar biji terdekat', 'Menengah: merencanakan sentilan berikutnya', 'Ahli: memasukkan satu demi satu'],
    hi: ['शुरुआती: निशाना डगमग', 'नौसिखिया: पास की गोटियाँ', 'मध्यम: अगली चाल सोचता है', 'विशेषज्ञ: एक के बाद एक डालता है'],
    ar: ['مبتدئ: تصويب مرتجف', 'مبتدئ: يستهدف القطع القريبة', 'متوسط: يخطط للضربة التالية', 'خبير: يُدخلها واحدة تلو الأخرى'],
  };
  const WHO = {
    ja: ['はじめて', 'ルールを覚えた人', '慣れた人', '強い人'], en: ['First game', 'Knows the rules', 'Regular player', 'Strong player'], zh: ['第一次玩', '刚学会规则', '熟练玩家', '强手'], 'zh-TW': ['第一次玩', '懂規則', '常玩的人', '高手'],
    ko: ['처음', '규칙을 익힌 사람', '익숙한 사람', '강한 사람'], es: ['Primera partida', 'Conoce las reglas', 'Jugador habitual', 'Jugador fuerte'], fr: ['Première partie', 'Connaît les règles', 'Joueur régulier', 'Joueur fort'],
    pt: ['Primeira partida', 'Conhece as regras', 'Jogador habitual', 'Jogador forte'], de: ['Erste Partie', 'Kennt die Regeln', 'Geübter Spieler', 'Starker Spieler'], ru: ['Первая игра', 'Знает правила', 'Постоянный игрок', 'Сильный игрок'],
    tr: ['İlk oyun', 'Kuralları biliyor', 'Düzenli oyuncu', 'Güçlü oyuncu'], id: ['Permainan pertama', 'Tahu aturannya', 'Pemain rutin', 'Pemain kuat'], hi: ['पहला खेल', 'नियम जानता है', 'नियमित खिलाड़ी', 'मज़बूत खिलाड़ी'], ar: ['أول مباراة', 'يعرف القواعد', 'لاعب معتاد', 'لاعب قوي'],
  };
  function levelInfo(n, lang) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return { name: 'Lv.' + n, desc: (LVD[lang] || LVD.en)[b], who: (WHO[lang] || WHO.en)[b] }; }
  const SIZES = [1, 25];
  const sizeName = (z, l) => (TXT[l] || TXT.en)[z === 25 ? 'b25' : 'b1'];
  const sizeLabel = l => (TXT[l] || TXT.en).len;

  /* ---------- sounds: the click of wood on wood, the thud of the cushion, the drop into the net ---------- */
  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .003); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f, q) => { const n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q || 2; const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    let lastHit = 0;
    return {
      flick: () => at((a, t) => { noise(a, t, .03, .5, 2400, 1.2); tone(a, t, 900, 300, .05, .06); }),
      hit: v => { const now = performance.now(); if (now - lastHit < 22) return; lastHit = now; at((a, t) => { const k = Math.min(1, v / 300); noise(a, t, .018, .12 + k * .4, 3400 + k * 1500, 3); tone(a, t, 1900 + k * 600, 1200, .03, .03 + k * .05, 'triangle'); }); },
      cush: v => at((a, t) => { const k = Math.min(1, v / 300); noise(a, t, .05, .1 + k * .25, 420, 1.4); tone(a, t, 140, 80, .07, .05 + k * .08); }),
      pocket: () => at((a, t) => { noise(a, t, .04, .3, 900, 1.5); tone(a, t + .03, 220, 120, .16, .1); noise(a, t + .08, .12, .12, 600, .8); }),
      place: () => at((a, t) => { noise(a, t, .02, .2, 3000, 2); }),
      good: () => at((a, t) => [659.25, 987.77].forEach((f, i) => tone(a, t + i * .09, f, 0, .4, .07, 'triangle'))),
      bad: () => at((a, t) => tone(a, t, 220, 160, .3, .09, 'triangle')),
      win: () => at((a, t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, t + i * .08, f, 0, .45, .07, 'triangle'))),
    };
  })();

  /* ---------- the hand (the same in the game and the rules tour) ----------
     Mouse: move left / right to place the striker; press and hold, pull down for power, left / right for the angle, let go to
     strike. Coming back round the striker gives up the aim: you are placing again.
     Touch: slide left / right to place; then slide down for power, left / right for the angle; lift the finger to strike.
     Coming back to where the pull began gives up the aim, as with the mouse. */
  const HOW = {
    ja: { m: { pad: "ノートPCのタッチパッドなら：位置を決めて1回クリックすると狙いに入り、もう1回クリックで打てる（ストライカーの近くに戻すとやり直し）", place: 'マウスを左右に動かして', pull: 'クリックしたまま下へ引き', lr: 'マウスを左右に動かす', rel: 'ボタンを離して', how: 'マウスの左右で位置を決め、クリックしたまま下へ引くと力、左右で角度。離して打つ（ストライカーのそばに戻すとやり直し）' },
      t: { place: '指を左右にスライドして', pull: 'そのまま下へスライドし', lr: '指を左右に動かす', rel: '指を離して', how: '左右にスライドで位置、そのまま下へスライドで力、左右で角度。指を離して打つ（ストライカーのそばに戻すとやり直し）' } },
    en: { m: { pad: "On a laptop touchpad: place it, click once to start aiming, click again to strike (back to the striker to cancel)", place: 'move the mouse left and right', pull: 'hold the button and pull down', lr: 'move the mouse left or right', rel: 'let go', how: 'Move the mouse to place, hold and pull down for power, left/right to aim, let go to strike (back to the striker to cancel)' },
      t: { place: 'slide left and right', pull: 'slide down', lr: 'move your finger left or right', rel: 'lift your finger', how: 'Slide sideways to place, then down for power, left/right to aim, lift to strike (back to the striker to cancel)' } },
    zh: { m: { pad: "笔记本触控板：决定位置后点一下进入瞄准，再点一下击出（移回击子旁边即可重来）", place: '左右移动鼠标', pull: '按住鼠标往下拉', lr: '再左右移动鼠标', rel: '松开按键', how: '左右移动鼠标定位置，按住往下拉蓄力，左右调角度，松开就打（移回击子旁可重来）' },
      t: { place: '左右滑动手指', pull: '接着往下滑', lr: '再左右移动手指', rel: '松开手指', how: '左右滑动定位置，往下滑蓄力，左右调角度，松手就打（移回击子旁可重来）' } },
    'zh-TW': { m: { pad: "筆電觸控板：決定位置後點一下進入瞄準，再點一下擊出（移回擊子旁邊即可重來）", place: '左右移動滑鼠', pull: '按住滑鼠往下拉', lr: '再左右移動滑鼠', rel: '放開按鍵', how: '左右移動滑鼠定位置，按住往下拉蓄力，左右調角度，放開就打（移回擊子旁可重來）' },
      t: { place: '左右滑動手指', pull: '接著往下滑', lr: '再左右移動手指', rel: '放開手指', how: '左右滑動定位置，往下滑蓄力，左右調角度，放手就打（移回擊子旁可重來）' } },
    ko: { m: { pad: "노트북 터치패드라면: 위치를 정하고 한 번 클릭하면 조준, 한 번 더 클릭하면 친다 (스트라이커 근처로 돌아가면 취소)", place: '마우스를 좌우로 움직여', pull: '클릭한 채 아래로 당기고', lr: '그대로 마우스를 좌우로 움직여', rel: '버튼을 놓아', how: '마우스 좌우로 위치, 클릭한 채 아래로 당기면 힘, 좌우로 각도. 놓으면 발사 (스트라이커 근처로 되돌리면 다시)' },
      t: { place: '손가락을 좌우로 밀어', pull: '그대로 아래로 밀고', lr: '그대로 손가락을 좌우로 움직여', rel: '손가락을 떼어', how: '좌우로 밀어 위치, 아래로 밀면 힘, 좌우로 각도. 손을 떼면 발사 (스트라이커 근처로 되돌리면 다시)' } },
    es: { m: { pad: "Con el panel táctil del portátil: colócalo, haz clic para apuntar y otro clic para tirar (vuelve al striker para cancelar)", place: 'mueve el ratón a izquierda y derecha', pull: 'mantén pulsado y tira hacia abajo', lr: 'mueve el ratón a los lados', rel: 'suelta', how: 'Mueve el ratón para colocar; mantén pulsado y tira abajo para la fuerza, a los lados para el ángulo; suelta para tirar (vuelve al striker para cancelar)' },
      t: { place: 'desliza a izquierda y derecha', pull: 'desliza hacia abajo', lr: 'mueve el dedo a los lados', rel: 'levanta el dedo', how: 'Desliza a los lados para colocar, abajo para la fuerza, a los lados para el ángulo; levanta para tirar (vuelve al striker para cancelar)' } },
    fr: { m: { pad: "Sur le pavé tactile d’un portable : place-le, clique une fois pour viser, encore une fois pour tirer (reviens au striker pour annuler)", place: 'déplace la souris à gauche et à droite', pull: 'garde le bouton enfoncé et tire vers le bas', lr: 'déplace la souris sur les côtés', rel: 'relâche', how: 'Souris à gauche/droite pour placer ; bouton enfoncé, tire vers le bas pour la force, sur les côtés pour l’angle ; relâche pour tirer (reviens au striker pour annuler)' },
      t: { place: 'glisse à gauche et à droite', pull: 'glisse vers le bas', lr: 'bouge le doigt sur les côtés', rel: 'lève le doigt', how: 'Glisse sur les côtés pour placer, vers le bas pour la force, sur les côtés pour l’angle ; lève le doigt pour tirer (reviens au striker pour annuler)' } },
    pt: { m: { pad: "No touchpad do notebook: posicione, clique uma vez para mirar e outra para lançar (volte ao striker para cancelar)", place: 'mova o mouse para os lados', pull: 'segure o botão e puxe para baixo', lr: 'mova o mouse para os lados', rel: 'solte', how: 'Mouse para os lados para posicionar; segure e puxe para baixo para a força, para os lados para o ângulo; solte para tacar (volte ao striker para cancelar)' },
      t: { place: 'deslize para os lados', pull: 'deslize para baixo', lr: 'mova o dedo para os lados', rel: 'tire o dedo', how: 'Deslize para os lados para posicionar, para baixo para a força, para os lados para o ângulo; tire o dedo para tacar (volte ao striker para cancelar)' } },
    de: { m: { pad: "Mit dem Touchpad am Laptop: platzieren, einmal klicken zum Zielen, noch einmal klicken zum Schnippen (zurück zum Striker bricht ab)", place: 'bewege die Maus nach links und rechts', pull: 'halte die Taste und zieh nach unten', lr: 'bewege die Maus zur Seite', rel: 'lass los', how: 'Maus links/rechts zum Setzen; Taste halten und nach unten ziehen für Kraft, seitlich für den Winkel; loslassen zum Stoßen (zurück zum Striker zum Abbrechen)' },
      t: { place: 'wische nach links und rechts', pull: 'wische nach unten', lr: 'bewege den Finger zur Seite', rel: 'heb den Finger', how: 'Seitlich wischen zum Setzen, nach unten für Kraft, seitlich für den Winkel; Finger heben zum Stoßen (zurück zum Striker zum Abbrechen)' } },
    ru: { m: { pad: "На тачпаде ноутбука: поставь, щёлкни один раз — прицел, ещё раз — удар (вернись к страйкеру для отмены)", place: 'двигай мышь влево-вправо', pull: 'зажми кнопку и тяни вниз', lr: 'двигай мышь в стороны', rel: 'отпусти', how: 'Мышь влево-вправо — место; зажми и тяни вниз — сила, в стороны — угол; отпусти — удар (назад к страйкеру — отмена)' },
      t: { place: 'проведи пальцем влево-вправо', pull: 'проведи вниз', lr: 'двигай палец в стороны', rel: 'отпусти палец', how: 'Влево-вправо — место, вниз — сила, в стороны — угол; отпусти палец — удар (назад к страйкеру — отмена)' } },
    tr: { m: { pad: "Dizüstü dokunmatik yüzeyde: yerleştir, nişan için bir kez tıkla, vurmak için tekrar tıkla (iptal için vurucuya dön)", place: 'fareyi sağa sola oynat', pull: 'tuşa basılı tutup aşağı çek', lr: 'fareyi yanlara oynat', rel: 'bırak', how: 'Fareyle sağa sola yerleştir; basılı tutup aşağı çek: güç, yanlara: açı; bırak: atış (vurucuya dön: iptal)' },
      t: { place: 'parmağını sağa sola kaydır', pull: 'aşağı kaydır', lr: 'parmağını yanlara oynat', rel: 'parmağını kaldır', how: 'Sağa sola kaydırarak yerleştir, aşağı: güç, yanlara: açı; parmağını kaldır: atış (vurucuya dön: iptal)' } },
    id: { m: { pad: "Dengan touchpad laptop: taruh, klik sekali untuk membidik, klik lagi untuk menyentil (kembali ke striker untuk batal)", place: 'gerakkan mouse ke kiri dan kanan', pull: 'tahan tombol dan tarik ke bawah', lr: 'gerakkan mouse ke samping', rel: 'lepas', how: 'Mouse kiri/kanan untuk posisi; tahan dan tarik ke bawah untuk tenaga, ke samping untuk sudut; lepas untuk menyentil (kembali ke striker untuk batal)' },
      t: { place: 'geser ke kiri dan kanan', pull: 'geser ke bawah', lr: 'gerakkan jari ke samping', rel: 'angkat jari', how: 'Geser ke samping untuk posisi, ke bawah untuk tenaga, ke samping untuk sudut; angkat jari untuk menyentil (kembali ke striker untuk batal)' } },
    hi: { m: { pad: "लैपटॉप टचपैड पर: जगह तय करो, निशाने के लिए एक बार क्लिक, मारने के लिए फिर क्लिक (रद्द करने के लिए स्ट्राइकर के पास लौटो)", place: 'माउस को दाएँ-बाएँ घुमाओ', pull: 'बटन दबाए रखकर नीचे खींचो', lr: 'माउस को दाएँ-बाएँ करो', rel: 'छोड़ दो', how: 'माउस दाएँ-बाएँ से जगह; दबाकर नीचे खींचो तो ताक़त, दाएँ-बाएँ से कोण; छोड़ो तो वार (स्ट्राइकर के पास लौटो तो रद्द)' },
      t: { place: 'उँगली दाएँ-बाएँ सरकाओ', pull: 'नीचे सरकाओ', lr: 'उँगली दाएँ-बाएँ करो', rel: 'उँगली उठाओ', how: 'दाएँ-बाएँ सरकाकर जगह, नीचे से ताक़त, दाएँ-बाएँ से कोण; उँगली उठाओ तो वार (स्ट्राइकर के पास लौटो तो रद्द)' } },
    ar: { m: { pad: "على لوحة لمس الحاسوب المحمول: ضعه، وانقر مرة للتصويب ومرة أخرى للنقر (عد إلى الضارب للإلغاء)", place: 'حرّك الفأرة يمينًا ويسارًا', pull: 'اضغط مع الإمساك واسحب للأسفل', lr: 'حرّك الفأرة إلى الجانبين', rel: 'أفلت', how: 'حرّك الفأرة للتموضع؛ اضغط واسحب للأسفل للقوة وللجانبين للزاوية؛ أفلت لتضرب (عُد إلى الضارب للإلغاء)' },
      t: { place: 'اسحب إصبعك يمينًا ويسارًا', pull: 'اسحب للأسفل', lr: 'حرّك إصبعك إلى الجانبين', rel: 'ارفع إصبعك', how: 'اسحب جانبيًا للتموضع، وللأسفل للقوة، وللجانبين للزاوية؛ ارفع إصبعك لتضرب (عُد إلى الضارب للإلغاء)' } },
  };
  // the first-turn how-to card: steps for a mouse (m) or a finger (t), a "don't show again" box and where to find it later
  const HOWTO = {
    ja: { pad: "ノートPCのタッチパッドなら：位置を決めて1回クリックすると狙いに入り、もう1回クリックで発射", title: '操作のしかた', m: ['マウスを左右に動かして位置を決める', 'クリックしたまま下へ引く。引くほど強い', '引いたまま左右で角度を調整', 'ボタンを離して打つ'], t: ['左右にスライドして位置を決める', 'そのまま下へスライド。引くほど強い', '指をつけたまま左右で角度を調整', '指を離して打つ'], undo: 'ストライカーのそばに戻すとやり直し', never: 'もう表示しない', note: '操作のしかたは「{r}」からいつでも見られます', ok: 'わかった' },
    en: { pad: "On a laptop touchpad: place it, click once to start aiming, click again to strike", title: 'How to play', m: ['Move the mouse left/right to place the striker', 'Hold the button and pull down — further is harder', 'Still holding, move left/right to aim', 'Let go to strike'], t: ['Slide left/right to place the striker', 'Keep going and slide down — further is harder', 'Finger still down, move left/right to aim', 'Lift your finger to strike'], undo: 'Back to the striker to cancel', never: "Don't show again", note: 'You can always see the controls in "{r}"', ok: 'Got it' },
    zh: { pad: "笔记本触控板：决定位置后点一下进入瞄准，再点一下击出", title: '操作方法', m: ['左右移动鼠标决定位置', '按住鼠标向下拉，拉得越远越用力', '按住时左右移动调整角度', '松开按键击出'], t: ['左右滑动决定位置', '接着向下滑，拉得越远越用力', '手指不离开，左右移动调整角度', '松开手指击出'], undo: '移回击子旁边即可重来', never: '不再显示', note: '随时可在「{r}」中查看操作方法', ok: '知道了' },
    'zh-TW': { pad: "筆電觸控板：決定位置後點一下進入瞄準，再點一下擊出", title: '操作方法', m: ['左右移動滑鼠決定位置', '按住滑鼠往下拉，拉得越遠越用力', '按住時左右移動調整角度', '放開按鍵擊出'], t: ['左右滑動決定位置', '接著往下滑，拉得越遠越用力', '手指不離開，左右移動調整角度', '放開手指擊出'], undo: '移回擊子旁邊即可重來', never: '不再顯示', note: '隨時可在「{r}」中查看操作方法', ok: '知道了' },
    ko: { pad: "노트북 터치패드라면: 위치를 정하고 한 번 클릭하면 조준, 한 번 더 클릭하면 친다", title: '조작 방법', m: ['마우스를 좌우로 움직여 위치를 정한다', '버튼을 누른 채 아래로 당긴다. 많이 당길수록 세게', '누른 채 좌우로 각도를 조절', '버튼을 놓으면 튕긴다'], t: ['좌우로 밀어서 위치를 정한다', '그대로 아래로 민다. 많이 당길수록 세게', '손가락을 댄 채 좌우로 각도를 조절', '손가락을 떼면 튕긴다'], undo: '스트라이커 옆으로 되돌리면 다시', never: '다시 표시하지 않기', note: '조작 방법은 「{r}」에서 언제든 볼 수 있어요', ok: '알겠어' },
    es: { pad: "Con el panel táctil del portátil: colócalo, haz clic para apuntar y otro clic para tirar", title: 'Cómo jugar', m: ['Mueve el ratón a los lados para colocar el striker', 'Mantén pulsado y tira hacia abajo: cuanto más, más fuerte', 'Sin soltar, mueve a los lados para apuntar', 'Suelta para lanzar'], t: ['Desliza a los lados para colocar el striker', 'Sigue y desliza hacia abajo: cuanto más, más fuerte', 'Con el dedo apoyado, muévelo a los lados para apuntar', 'Levanta el dedo para lanzar'], undo: 'Vuelve junto al striker para cancelar', never: 'No volver a mostrar', note: 'Puedes ver los controles cuando quieras en «{r}»', ok: 'Entendido' },
    fr: { pad: "Sur le pavé tactile d’un portable : place-le, clique une fois pour viser, encore une fois pour tirer", title: 'Comment jouer', m: ['Bouge la souris à gauche/droite pour placer le striker', 'Maintiens le bouton et tire vers le bas : plus loin, plus fort', 'Toujours appuyé, gauche/droite pour viser', 'Lâche pour tirer'], t: ['Glisse à gauche/droite pour placer le striker', 'Continue vers le bas : plus loin, plus fort', 'Doigt posé, gauche/droite pour viser', 'Lève le doigt pour tirer'], undo: 'Reviens près du striker pour annuler', never: 'Ne plus afficher', note: 'Les commandes restent visibles à tout moment dans « {r} »', ok: "C'est parti" },
    pt: { pad: "No touchpad do notebook: posicione, clique uma vez para mirar e outra para lançar", title: 'Como jogar', m: ['Mova o mouse para os lados para posicionar o striker', 'Segure o botão e puxe para baixo: quanto mais, mais forte', 'Ainda segurando, mova para os lados para mirar', 'Solte para tacar'], t: ['Deslize para os lados para posicionar o striker', 'Continue e deslize para baixo: quanto mais, mais forte', 'Com o dedo na tela, mova para os lados para mirar', 'Levante o dedo para tacar'], undo: 'Volte para perto do striker para cancelar', never: 'Não mostrar de novo', note: 'Veja os controles quando quiser em "{r}"', ok: 'Entendi' },
    de: { pad: "Mit dem Touchpad am Laptop: platzieren, einmal klicken zum Zielen, noch einmal klicken zum Schnippen", title: 'So spielst du', m: ['Maus nach links/rechts: Striker platzieren', 'Taste halten und nach unten ziehen – je weiter, desto fester', 'Weiter halten, links/rechts zum Zielen', 'Loslassen zum Schnippen'], t: ['Nach links/rechts wischen: Striker platzieren', 'Weiter nach unten wischen – je weiter, desto fester', 'Finger liegen lassen, links/rechts zum Zielen', 'Finger heben zum Schnippen'], undo: 'Zurück zum Striker bricht ab', never: 'Nicht mehr anzeigen', note: 'Die Steuerung findest du jederzeit unter „{r}“', ok: 'Verstanden' },
    ru: { pad: "На тачпаде ноутбука: поставь, щёлкни один раз — прицел, ещё раз — удар", title: 'Управление', m: ['Двигай мышь влево-вправо, чтобы поставить страйкер', 'Зажми кнопку и тяни вниз — чем дальше, тем сильнее', 'Не отпуская, влево-вправо — прицел', 'Отпусти — удар'], t: ['Проведи влево-вправо, чтобы поставить страйкер', 'Продолжи вниз — чем дальше, тем сильнее', 'Не отрывая палец, влево-вправо — прицел', 'Убери палец — удар'], undo: 'Вернись к страйкеру, чтобы отменить', never: 'Больше не показывать', note: 'Управление всегда можно посмотреть в разделе «{r}»', ok: 'Понятно' },
    tr: { pad: "Dizüstü dokunmatik yüzeyde: yerleştir, nişan için bir kez tıkla, vurmak için tekrar tıkla", title: 'Nasıl oynanır', m: ['Fareyi sağa sola oynatıp vurucuyu yerleştir', 'Tuşa basılı tutup aşağı çek: ne kadar çok, o kadar güçlü', 'Basılı tutarken sağa sola nişan al', 'Bırakınca vurur'], t: ['Sağa sola kaydırıp vurucuyu yerleştir', 'Sonra aşağı kaydır: ne kadar çok, o kadar güçlü', 'Parmağın ekrandayken sağa sola nişan al', 'Parmağını kaldırınca vurur'], undo: 'Vurucunun yanına dönersen iptal olur', never: 'Bir daha gösterme', note: 'Kontrolleri istediğin zaman "{r}" bölümünde görebilirsin', ok: 'Tamam' },
    id: { pad: "Dengan touchpad laptop: taruh, klik sekali untuk membidik, klik lagi untuk menyentil", title: 'Cara bermain', m: ['Gerakkan mouse ke kiri/kanan untuk menaruh striker', 'Tahan tombol dan tarik ke bawah — makin jauh makin kuat', 'Sambil menahan, kiri/kanan untuk membidik', 'Lepas untuk menyentil'], t: ['Geser ke kiri/kanan untuk menaruh striker', 'Lanjut geser ke bawah — makin jauh makin kuat', 'Jari tetap menempel, kiri/kanan untuk membidik', 'Angkat jari untuk menyentil'], undo: 'Kembali ke dekat striker untuk batal', never: 'Jangan tampilkan lagi', note: 'Kontrol bisa dilihat kapan saja di "{r}"', ok: 'Mengerti' },
    hi: { pad: "लैपटॉप टचपैड पर: जगह तय करो, निशाने के लिए एक बार क्लिक, मारने के लिए फिर क्लिक", title: 'कैसे खेलें', m: ['माउस दाएँ-बाएँ करके स्ट्राइकर रखो', 'बटन दबाए रखकर नीचे खींचो — जितना ज़्यादा, उतना ज़ोर', 'दबाए रखते हुए दाएँ-बाएँ से निशाना', 'छोड़ो तो वार'], t: ['दाएँ-बाएँ सरकाकर स्ट्राइकर रखो', 'फिर नीचे सरकाओ — जितना ज़्यादा, उतना ज़ोर', 'उँगली टिकाए दाएँ-बाएँ से निशाना', 'उँगली उठाओ तो वार'], undo: 'स्ट्राइकर के पास लौटाओ तो रद्द', never: 'फिर मत दिखाना', note: 'नियंत्रण कभी भी "{r}" में देख सकते हो', ok: 'समझ गया' },
    ar: { pad: "على لوحة لمس الحاسوب المحمول: ضعه، وانقر مرة للتصويب ومرة أخرى للنقر", title: 'طريقة اللعب', m: ['حرّك الفأرة يمينًا ويسارًا لوضع الضارب', 'اضغط مع الإمساك واسحب للأسفل — كلما زاد السحب زادت القوة', 'وأنت ممسك، حرّك للجانبين للتصويب', 'أفلت لتنقر'], t: ['اسحب يمينًا ويسارًا لوضع الضارب', 'تابع السحب للأسفل — كلما زاد السحب زادت القوة', 'وإصبعك على الشاشة، حرّك للجانبين للتصويب', 'ارفع إصبعك لتنقر'], undo: 'عد إلى جانب الضارب للإلغاء', never: 'لا تعرض مرة أخرى', note: 'يمكنك رؤية طريقة التحكم في أي وقت من «{r}»', ok: 'فهمت' },
  };
  const mousey = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };
  const how = lang => ((HOW[lang] || HOW.en)[mousey() ? 'm' : 't']);
  // Hand(o): o = { el, toCm(e) → {x, y} board cm, sign() → +1 when "down" on screen is +y for the player striking (−1 on the
  //   turned board), canAim() → it is your stroke, place(x) (striker to x), striker() → its x, aim({ ang, pow, e }) (null = no aim),
  //   shoot(ang, pow), tap(e) (a tap when you cannot aim: e.g. to speed up the roll) }
  /* ---------- the board picker (carrom, crokinole) — 2026-11-10 ----------
     At the start of a game: a card per board (its picture, name and its feel), 「はじめる」 and 「もどる」. Each board gives the
     hand's wobble (the small randomness of a human flick) a character of its own; the classic board keeps today's feel.
     FEEL: a = the angle's wobble, v = the strength's, s = soft shots, h = hard shots (multipliers on the engine's wobble). */
  const FEEL = { std: {}, precise: { a: .75, v: .75 }, finest: { a: .6, v: .6 }, aim: { a: 1.35 }, power: { a: .75, v: 1.45 }, hard: { s: .7, h: 1.5 } };
  const FEELTX = {
    std: ['王道の手ごたえ。いつもどおりの、ほどよい揺らぎ', 'The standard feel: the usual, gentle wobble', '经典手感：一贯适度的晃动', '經典手感：一貫適度的晃動', '정석의 손맛. 늘 같은 적당한 흔들림', 'El tacto de siempre: un temblor justo', 'Le toucher classique : un léger tremblé habituel', 'O toque clássico: a leve oscilação de sempre', 'Das klassische Gefühl: das übliche, leichte Zittern', 'Классика: привычная лёгкая дрожь руки', 'Klasik his: alışılmış hafif titreme', 'Rasa klasik: getaran ringan seperti biasa', 'मानक एहसास: वही हल्का कंपन', 'الإحساس الكلاسيكي: الاهتزاز الخفيف المعتاد'],
    precise: ['揺らぎが小さく、ねらいどおりに飛びやすい', 'Less wobble: shots go where you aim', '晃动小，容易照瞄准方向飞出', '晃動小，容易照瞄準方向飛出', '흔들림이 작아 노린 대로 날아가기 쉽다', 'Menos temblor: va adonde apuntas', 'Moins de tremblé : ça part où tu vises', 'Menos oscilação: vai aonde você mira', 'Weniger Zittern: er geht, wohin du zielst', 'Меньше дрожи: летит, куда целишься', 'Az titreme: nişan aldığın yere gider', 'Getaran kecil: meluncur sesuai bidikan', 'कम कंपन: जहाँ निशाना, वहीं जाता है', 'اهتزاز أقل: يذهب حيث تصوّب'],
    finest: ['揺らぎがいちばん小さい、いちばん素直な盤', 'The least wobble of all: the most faithful board', '晃动最小，最听话的盘', '晃動最小，最聽話的盤', '흔들림이 가장 작은, 가장 정직한 보드', 'El que menos tiembla: el más fiel', 'Le moins de tremblé : le plus fidèle', 'A menor oscilação: o mais fiel', 'Das wenigste Zittern: das treueste Brett', 'Меньше всего дрожи: самое послушное поле', 'En az titreme: en sadık masa', 'Getaran paling kecil: papan paling patuh', 'सबसे कम कंपन: सबसे भरोसेमंद बोर्ड', 'أقل اهتزاز: أكثر اللوحات طاعة'],
    aim: ['ねらいの向きが少しぶれやすい', 'The aim drifts a little more', '瞄准方向更容易偏一点', '瞄準方向更容易偏一點', '노리는 방향이 조금 더 흔들린다', 'La puntería se desvía un poco más', 'La visée dévie un peu plus', 'A mira desvia um pouco mais', 'Die Richtung weicht etwas mehr ab', 'Направление чуть больше уходит', 'Nişan biraz daha sapar', 'Arah bidikan sedikit lebih meleset', 'निशाने की दिशा थोड़ी ज़्यादा भटकती है', 'يميل الاتجاه أكثر قليلًا'],
    power: ['向きは正確、強さが少しぶれやすい', 'True aim, but the strength varies a little more', '方向准确，力度更容易有偏差', '方向準確，力度更容易有偏差', '방향은 정확, 세기가 조금 더 흔들린다', 'Puntería fiel, la fuerza varía algo más', 'Visée juste, mais la force varie un peu plus', 'Mira certa, a força varia um pouco mais', 'Richtung genau, die Stärke schwankt etwas mehr', 'Направление точное, сила гуляет чуть больше', 'Yön doğru, güç biraz daha değişir', 'Arah tepat, kekuatan sedikit lebih berubah', 'दिशा सटीक, ताक़त थोड़ी ज़्यादा बदलती है', 'الاتجاه دقيق والقوة تتفاوت أكثر قليلًا'],
    hard: ['弱い打ちは正確、強打ほどぶれる', 'Soft shots are true, hard ones wobble more', '轻打准确，越用力越晃', '輕打準確，越用力越晃', '약하게 치면 정확, 세게 칠수록 흔들린다', 'Los golpes suaves son fieles, los fuertes tiemblan', 'Les coups doux sont justes, les forts tremblent', 'Toques suaves certeiros, os fortes oscilam', 'Sanfte Schüsse genau, harte zittern mehr', 'Мягкие удары точны, сильные дрожат', 'Hafif atış doğru, sert atış titrer', 'Pukulan pelan tepat, yang keras bergetar', 'हल्के शॉट सटीक, तेज़ शॉट ज़्यादा काँपते हैं', 'الضربات الخفيفة دقيقة والقوية تهتز'],
  };
  const PKTX = {
    title: ['盤を選ぶ', 'Choose a board', '选择棋盘', '選擇棋盤', '보드 선택', 'Elige un tablero', 'Choisis un plateau', 'Escolha um tabuleiro', 'Brett wählen', 'Выбери поле', 'Tahta seç', 'Pilih papan', 'बोर्ड चुनें', 'اختر اللوحة'],
    sub: ['盤ごとに、打つときの揺らぎ（手のぶれ）が少しずつちがうよ', 'Each board gives the flick’s wobble a character of its own', '每个棋盘出手时的晃动都略有不同', '每個棋盤出手時的晃動都略有不同', '보드마다 칠 때의 흔들림이 조금씩 달라', 'Cada tablero da su carácter al temblor del golpe', 'Chaque plateau donne son caractère au tremblé du tir', 'Cada tabuleiro dá seu jeito à oscilação do toque', 'Jedes Brett gibt dem Zittern beim Schnippen seinen Charakter', 'У каждого поля своя дрожь при щелчке', 'Her tahtanın vuruştaki titremesi biraz farklı', 'Tiap papan punya getaran pukulan sendiri', 'हर बोर्ड पर शॉट का कंपन थोड़ा अलग है', 'لكل لوحة طابع مختلف لاهتزاز الضربة'],
    go: ['はじめる', 'Start', '开始', '開始', '시작', 'Empezar', 'Commencer', 'Começar', 'Starten', 'Начать', 'Başla', 'Mulai', 'शुरू करें', 'ابدأ'],
    back: ['もどる', 'Back', '返回', '返回', '돌아가기', 'Volver', 'Retour', 'Voltar', 'Zurück', 'Назад', 'Geri', 'Kembali', 'वापस', 'رجوع'],
  };
  const PKL = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const pkT = (a, l) => a[Math.max(0, PKL.indexOf(l))] || a[1];
  // o: { lang, list: [look…], cur, feel: { look: type }, name(look), thumb(look), color, onPick(look), onStart(look), onBack() }
  function BoardPick(o) {
    if (!document.getElementById('bpkCss')) {
      const c = document.createElement('style'); c.id = 'bpkCss';
      c.textContent = `.bpk{position:fixed;inset:0;z-index:96;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.5);padding:14px;-webkit-user-select:none;user-select:none}
.bpk-c{background:#fffdf7;border-radius:26px;box-shadow:0 0 0 4px var(--bpk,#2f6fd0),0 18px 50px rgba(0,0,0,.45);padding:16px 16px 14px;width:min(640px,100%);max-height:100%;overflow:auto;color:#1d2133}
.bpk h2{margin:0;font-size:22px;font-weight:900;text-align:center;color:var(--bpk,#2f6fd0)}.bpk .sub{margin:4px 0 12px;font-size:12.5px;font-weight:700;color:#5b6074;text-align:center}
.bpk-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.bpk-g button{display:flex;align-items:center;gap:10px;text-align:left;border:2px solid #e6dcc6;border-radius:16px;background:#fff;padding:7px 9px;font:inherit;cursor:pointer;color:inherit;box-shadow:0 3px 0 #e6dcc6;transition:transform .12s}
.bpk-g button:hover{transform:translateY(-2px)}.bpk-g button[aria-pressed=true]{border-color:var(--bpk,#2f6fd0);box-shadow:0 3px 0 var(--bpk,#2f6fd0);background:#f4f8ff}
.bpk-g .th{flex:none;width:66px;height:46px;border-radius:10px;overflow:hidden;background:#e9dfca}.bpk-g .th img{width:100%;height:100%;object-fit:cover;transform:scale(1.9);display:block}
.bpk-g b{display:block;font-size:14.5px;font-weight:900}.bpk-g small{display:block;font-size:11.5px;font-weight:700;color:#5b6074;line-height:1.35;margin-top:2px}
.bpk-f{display:flex;gap:10px;margin-top:12px}.bpk-f button{flex:1;padding:12px;border:0;border-radius:99px;font:inherit;font-size:17px;font-weight:900;cursor:pointer}
.bpk-f .bk{flex:0 0 34%;background:#ece6d8;color:#3a3f52;box-shadow:0 3px 0 #d4ccb8}.bpk-f .go{background:#ff5d5d;color:#fff;box-shadow:0 3px 0 #c23b3b}
@media (max-width:560px){.bpk-g small{display:none}.bpk-g .th{width:52px;height:38px}.bpk-g button{padding:6px 7px;gap:7px}}
@media (min-width:900px) and (min-height:600px) and (hover:hover){.bpk-c{width:min(1120px,82vw);padding:24px 30px 22px;border-radius:30px}.bpk h2{font-size:28px}.bpk .sub{font-size:15px;margin-bottom:16px}
.bpk-g{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.bpk-g button{flex-direction:column;align-items:stretch;gap:10px;padding:10px 10px 14px;border-radius:20px}
.bpk-g .th{width:100%;height:auto;aspect-ratio:16/9;border-radius:14px}.bpk-g .th img{transform:scale(1.7) translateY(-3%)}.bpk-g b{font-size:20px;padding:0 6px}.bpk-g small{font-size:14px;padding:0 6px}
.bpk-f{max-width:640px;margin:16px auto 0}.bpk-f button{font-size:21px;padding:15px}}
@media (min-width:900px) and (max-height:820px) and (hover:hover){.bpk-g .th{aspect-ratio:2/1}.bpk-g{gap:12px}}`;
      document.head.appendChild(c);
    }
    let cur = o.cur;
    const el = document.createElement('div'); el.className = 'bpk'; el.dir = o.lang === 'ar' ? 'rtl' : 'ltr'; if (o.color) el.style.setProperty('--bpk', o.color);
    el.innerHTML = `<div class="bpk-c" role="dialog" aria-label="${esc(pkT(PKTX.title, o.lang))}"><h2>${esc(pkT(PKTX.title, o.lang))}</h2><p class="sub">${esc(pkT(PKTX.sub, o.lang))}</p>
      <div class="bpk-g">${o.list.map(k => `<button type="button" data-k="${k}" aria-pressed="${k === cur}"><span class="th"><img src="${o.thumb(k)}" alt="" loading="lazy"></span><span><b>${esc(o.name(k))}</b><small>${esc(pkT(FEELTX[o.feel[k] || 'std'], o.lang))}</small></span></button>`).join('')}</div>
      <div class="bpk-f"><button type="button" class="bk">${esc(pkT(PKTX.back, o.lang))}</button><button type="button" class="go">${esc(pkT(PKTX.go, o.lang))} ▶</button></div></div>`;
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => el.addEventListener(k, e => e.stopPropagation()));
    el.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { if (b.dataset.k === cur) return; cur = b.dataset.k; el.querySelectorAll('[data-k]').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === cur)); try { SND.click && SND.click(); } catch (e) {} o.onPick(cur); }; b.ondblclick = () => { close(); o.onStart(cur); }; });
    const close = () => el.remove();
    el.querySelector('.go').onclick = () => { close(); o.onStart(cur); };
    el.querySelector('.bk').onclick = () => { close(); o.onBack(); };
    document.body.appendChild(el);
    return { close };
  }
  // the wobble of a board: the engine's wobble parameters scaled by its feel
  const feelOf = type => Object.assign({ a: 1, v: 1, s: 1, h: 1 }, FEEL[type] || {});
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function Hand(o) {
    // pull like a slingshot round the striker: the aim points from your pointer back through the striker, and the further you
    // pull, the harder (so pulling down shoots up the board, pulling up shoots down it). Coming back round the striker
    // (within DEAD cm, "the striker's own spot") gives the aim up and you are placing again.
    const AIM_IN = 1.6, AIM_IN_T = 2.4, DEAD_M = 3.2, DEAD_T = 1.6, POWMAX = 20;
    // on a small screen the board is small, so a finger's moves are magnified less: full power wants a pull of about
    // TOUCH_PULL px and the base line spans about TOUCH_SPAN px, however small the board is drawn (gt, gp ≤ 1: never coarser)
    const TOUCH_PULL = 210, TOUCH_SPAN = 320;
    let clickAim = false, down0 = null, mode = '', id = null, ref = null, vref = null, anchor = null, dead = DEAD_M, sx0 = 0, ang = 0, pow = 0, gt = 1, gp = 1;
    const down = (q, a) => (q.y - a.y) * o.sign();
    function gains(e) {   // cm per screen px round the finger
      const a = o.toCm(e), b = o.toCm({ clientX: e.clientX + 40, clientY: e.clientY }), c = o.toCm({ clientX: e.clientX, clientY: e.clientY + 40 });
      if (!a || !b || !c) { gt = gp = 1; return; }
      const k = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - a.x, c.y - a.y)) / 80;
      gt = Math.min(1, (POWMAX + DEAD_T) / (TOUCH_PULL * k)); gp = Math.min(1, 43.8 / (TOUCH_SPAN * k));
    }
    const amp = q => anchor && mode === 'aim-t' ? { x: anchor.x + (q.x - anchor.x) * gt, y: anchor.y + (q.y - anchor.y) * gt } : q;
    function setAim(q, e) {
      q = amp(q); const dx = anchor.x - q.x, dy = anchor.y - q.y, d = Math.hypot(dx, dy);
      if (d < dead) return false;
      pow = Math.max(0, Math.min(1, (d - dead) / POWMAX)); ang = Math.atan2(dy, dx);
      o.aim({ ang, pow, e });
      return true;
    }
    function toPlace(q) { mode = mode === 'aim-m' ? 'held' : 'touch'; ref = vref = q; sx0 = o.striker(); anchor = null; pow = 0; o.aim(null); }
    function pd(e) {
      if (!o.canAim()) { clickAim = false; if (o.tap) o.tap(e); return; }
      const q = o.toCm(e); if (!q) return;
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) { if (clickAim) { clickAim = false; o.aim(null); } return; }
        down0 = { x: e.clientX, y: e.clientY, t: performance.now() };
        if (clickAim) { mode = 'click-shoot'; id = e.pointerId; try { o.el.setPointerCapture(id); } catch (er) {} document.documentElement.classList.add('hand-drag'); e.preventDefault(); return; }
        anchor = o.home(); dead = DEAD_M; pow = 0;
        if (Math.hypot(q.x - anchor.x, q.y - anchor.y) < dead) mode = 'arm-m';   // pressed on the striker: aiming starts once you pull away
        else { mode = 'aim-m'; setAim(q, e); }
      } else { mode = 'touch'; ref = vref = q; sx0 = o.striker(); gains(e); }
      id = e.pointerId; try { o.el.setPointerCapture(id); } catch (er) {}
      document.documentElement.classList.add('hand-drag');   // the talk bubbles let the pointer through while you pull (CSS in index.html)
      e.preventDefault();
    }
    function pm(e) {
      const q = o.toCm(e); if (!q) return;
      if (id === null) {
        if (e.pointerType !== 'mouse' || e.buttons || !o.canAim()) { if (!o.canAim()) clickAim = false; return; }
        // click mode (laptop touchpads): after a click the aim follows the pointer with no button held; back to the striker = placing again
        if (clickAim) { if (!setAim(q, e)) { clickAim = false; o.aim(null); o.place(q.x); } return; }
        o.place(q.x); return;
      }
      if (e.pointerId !== id) return;
      if (!o.canAim()) return cancel();
      if (mode === 'arm-m') { if (Math.hypot(q.x - anchor.x, q.y - anchor.y) >= dead) { mode = 'aim-m'; setAim(q, e); } return; }
      if (mode === 'aim-m' || mode === 'aim-t') { if (!setAim(q, e)) toPlace(q); return; }
      if (mode === 'held') { o.place(q.x); return; }
      if (mode === 'touch') {
        // "down" is measured from vref, which follows the finger while it moves mostly sideways (placing): a slide that drifts a
        // little downwards stays a slide; only a clearly downward pull (≥ AIM_IN_T, steeper than 55°) starts the aim
        const d = down(q, vref), side = Math.abs(q.x - vref.x);
        if (d < 0 || (side > .3 && side > Math.max(0, d) * .7)) vref = q;
        if (d * gt > AIM_IN_T && d > side * 1.45) { mode = 'aim-t'; dead = DEAD_T; anchor = { x: q.x, y: q.y - o.sign() * (AIM_IN_T - .2) / gt }; setAim(q, e); return; }
        o.place(sx0 + (q.x - ref.x) * gp);
      }
    }
    function pu(e) {
      if (id === null || e.pointerId !== id) return;
      const m = mode; try { o.el.releasePointerCapture(id); } catch (er) {}
      id = null; mode = ''; document.documentElement.classList.remove('hand-drag');
      if (m === 'click-shoot') { clickAim = false; if (pow >= .04 && o.canAim()) { o.aim(null); o.shoot(ang, pow); } else o.aim(null); return; }
      // a click (no drag: the pointer barely moved, a short press) starts click mode instead of striking
      if (e.pointerType === 'mouse' && (m === 'aim-m' || m === 'arm-m') && down0 && Math.hypot(e.clientX - down0.x, e.clientY - down0.y) < 5 && performance.now() - down0.t < 450 && o.canAim()) {
        clickAim = true; anchor = o.home(); dead = DEAD_M; pow = 0; const q = o.toCm(e); if (!q || !setAim(q, e)) o.aim(null); return;
      }
      if ((m === 'aim-m' || m === 'aim-t') && pow >= .04 && o.canAim()) { o.aim(null); o.shoot(ang, pow); return; }
      o.aim(null);
    }
    function cancel() { if (id !== null) { try { o.el.releasePointerCapture(id); } catch (er) {} } id = null; mode = ''; clickAim = false; document.documentElement.classList.remove('hand-drag'); o.aim(null); }
    // the drag is followed on the window too: a pointer let go over something laid on the board (a talk bubble, a toast) still
    // ends the pull (pu ignores a pointer it is not following, so the element's own event and this one never both act)
    const wm = e => { if (id !== null && e.pointerId === id && e.target !== o.el && !o.el.contains(e.target)) pm(e); };
    const wu = e => { if (id !== null && e.pointerId === id) pu(e); };
    o.el.addEventListener('pointerdown', pd); o.el.addEventListener('pointermove', pm);
    o.el.addEventListener('pointerup', pu); o.el.addEventListener('pointercancel', pu);
    addEventListener('pointermove', wm, true); addEventListener('pointerup', wu, true); addEventListener('pointercancel', wu, true);
    // (2026-11-10) no magnifier / zoom / text selection while playing: a double click or double tap (and a long press) would
    // bring up the loupe or zoom the page on phones and select text on PCs. Buttons and inputs keep working; a two-finger pinch still zooms.
    const H = document.documentElement; H.classList.add('hand-on');
    const isUI = t => t && t.closest && t.closest('button,a,input,textarea,select,label,[role=button]');
    let lastTap = 0;
    const onBoard = t => t && (o.el.contains(t) || (t.closest && t.closest('#gl')));
    const nz = e => { if (!isUI(e.target)) e.preventDefault(); };
    const te = e => { if (!onBoard(e.target)) return; const now = performance.now(); if (now - lastTap < 350) e.preventDefault(); lastTap = now; };
    const ss = e => { if (!isUI(e.target)) e.preventDefault(); };
    // iOS still showed the loupe, so a one-finger touch has its default cancelled at touchstart (pointer events still
    // arrive; a two-finger pinch is left alone)
    const ts = e => { if (e.touches.length === 1 && onBoard(e.target)) e.preventDefault(); };   // (only on the 3D board: cards, bubbles and backdrops keep their clicks)
    const NZ = [['dblclick', nz], ['selectstart', ss], ['contextmenu', nz], ['touchend', te], ['touchstart', ts]];   // (pinch zoom stays allowed)
    NZ.forEach(([t, f]) => document.addEventListener(t, f, { capture: true, passive: false }));
    const unNZ = () => { NZ.forEach(([t, f]) => document.removeEventListener(t, f, { capture: true })); H.classList.remove('hand-on'); try { getSelection().removeAllRanges(); } catch (er) {} };
    return { stop() { unNZ(); o.el.removeEventListener('pointerdown', pd); o.el.removeEventListener('pointermove', pm); o.el.removeEventListener('pointerup', pu); o.el.removeEventListener('pointercancel', pu);
      removeEventListener('pointermove', wm, true); removeEventListener('pointerup', wu, true); removeEventListener('pointercancel', wu, true); document.documentElement.classList.remove('hand-drag'); }, cancel, active: () => (id !== null && /^aim/.test(mode)) || clickAim };
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, E = window.CarromEngine, D = E.DIM;
    const lang = ctx.lang, L = TXT[lang] || TXT.en;
    const tx = (k, o) => { let s = L[k] != null ? L[k] : (TXT.en[k] != null ? TXT.en[k] : k); if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6)), target = +ctx.size === 25 ? 25 : 0;
    const youFirst = (+ctx.side || 1) === 1;
    const BDL = (T3.BOARDS && T3.BOARDS.carrom) ? T3.BOARDS.carrom.list : ['neon', 'modern', 'classic', 'rajasthan', 'bauhaus', 'tycoon'];
    let look = T3.BOARDS && T3.BOARDS.carrom ? T3.BOARDS.carrom.get() : 'neon';
    const board = T3.MODELS.carrom(true, look); T3.show('carrom', board);
    let U = board.userData; const Y = U.top, K = U.K, W = 2 * (U.S + 7 * K);
    // (2026-11-10) each board's hand: the wobble's character (see FEEL); the classic board keeps the standard feel
    const CFEEL = { classic: 'std', neon: 'power', modern: 'precise', rajasthan: 'aim', bauhaus: 'hard', tycoon: 'finest' };
    let feel = feelOf(CFEEL[look]);
    function setLook(v) {   // (before the game: the board's pieces are swapped inside the group on the table — T3.show() would move the camera)
      if (v === look) return; look = v; feel = feelOf(CFEEL[v]);
      try { if (T3.setBoard) T3.setBoard('carrom', v); } catch (e) {}
      const nb = T3.MODELS.carrom(true, v); while (board.children.length) board.remove(board.children[0]); while (nb.children.length) board.add(nb.children[0]); board.userData = nb.userData; U = board.userData; kick(500);
    }
    // the camera: a 3/4 view with perspective by default; the button beside the flip switches to the near top-down view (remembered)
    const VK = 'atlas-carrom-view';
    let topView = false; try { topView = localStorage.getItem(VK) === 'top'; } catch (e) {}
    const baseFit = () => { const port = innerHeight > innerWidth * 1.1, pitch = topView ? (port ? 1.36 : 1.3) : .82; if (port && D.K > 1) { const w = 2 * (U.S + 4 * K); return { w, d: w, y: Y, pitch }; }   // phone version: frame mostly off screen, the surface fills the width
      return port ? { w: W + .25, d: W + .25, y: Y, pitch } : { w: W + .3, d: W + .35, y: Y, pitch }; };
    if (T3.fit) T3.fit(baseFit());
    const onResize = () => { if (T3.fit) T3.fit(baseFit()); };
    addEventListener('resize', onResize);
    let st = null, phase = 'wait', over = false, stopped = false, busy = false, boardNo = 1, tok = 0, msg = '', hintShot = null, ply = 0;
    let sx = 0, aimAng = -Math.PI / 2, aimPow = 0, drag = null, speedUp = 1, told = false;
    const hist = [], timers = [];
    const later = (f, ms) => { const my = tok; timers.push(setTimeout(() => { if (!stopped && my === tok) f(); }, ms)); };
    const human = p => pvp || p === 0;
    const nameOf = p => pvp ? tx(E.colOf(st, p)) : p === 0 ? t('p.you') : t('p.ai');
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const wx = (x, y) => U.xz(x, y);

    /* ---------- the men and the striker ---------- */
    const pcs = [];   // index = engine id
    let striker = null;
    function mk(c, r) { const g = c === 's' ? U.striker() : U.piece(c), sh = T3.contact(r * 1.15, .42); sh.position.y = .004; g.add(sh); board.add(g); return g; }
    function placeMesh(g, x, y, h) { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); }
    function build() {
      pcs.forEach(g => board.remove(g)); pcs.length = 0;
      st.pcs.forEach(m => { const g = mk(m.c, U.R); g.visible = m.on; placeMesh(g, m.x, m.y); pcs.push(g); });
      if (!striker) striker = mk('s', U.RS);
      kick(300);
    }
    function syncAll() { st.pcs.forEach((m, i) => { const g = pcs[i]; g.visible = m.on; g.scale.setScalar(1); if (m.on) placeMesh(g, m.x, m.y); }); kick(200); }

    /* ---------- the guides: the base line glow, the aim arrow, the dotted path to the first man, the ghost striker ---------- */
    const gd = new TH.Group(); board.add(gd);
    const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { arrow: basic(0xffffff, .95), path: basic(0xffffff, .85), ghost: basic(0xffffff, .9), hint: basic(0xff3d7f, .95), man: basic(0x3df59a, .95), base: basic(0x3df59a, .35), ring: basic(0xffd34d, .95) };
    const GEO = { bar: new TH.BoxGeometry(1, .006, 1), ring: new TH.TorusGeometry(D.RS * K, .012, 6, 40), cone: new TH.ConeGeometry(.08, .2, 3) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cone.rotateX(Math.PI / 2);
    function clearGuides() { while (gd.children.length) gd.remove(gd.children[0]); kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) {   // a flat strip from (x0, y0) to (x1, y1) in cm
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return null;
      const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2);
      m.position.set(a, Y + (lift || .03), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); return m;
    }
    function dots(x0, y0, x1, y1, mat) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 1.6); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .55) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, .32, mat); } }
    function ring(x, y, mat, s) { const m = new TH.Mesh(GEO.ring, mat), [a, b] = wx(x, y); m.position.set(a, Y + .035, b); m.scale.setScalar(s || 1); m.renderOrder = 4; gd.add(m); return m; }
    function showGuides() {
      clearGuides();
      if (phase !== 'place' || !st || !human(st.turn)) return;
      const p = st.turn, by = E.baseY(p);
      bar(-D.BX, by, D.BX, by, COARSE ? 2 * D.RS + 2.6 : D.LINE + .4, MAT.base, .012);   // where the striker may stand (as wide as the striker on touch screens)
      const ang = drag && drag.kind === 'aim' ? aimAng : hintShot ? hintShot.ang : null;
      const mt = hintShot && !(drag && drag.kind === 'aim') ? MAT.hint : MAT.path;
      if (ang != null) {
        const tr = E.aimTrace(st, p, sx, ang);
        dots(sx, by, tr.gx, tr.gy, mt);
        ring(tr.gx, tr.gy, mt);
        if (tr.man >= 0) { const m = st.pcs[tr.man]; bar(m.x, m.y, m.x + tr.ox * 9, m.y + tr.oy * 9, .5, MAT.man); }
        if (drag && drag.kind === 'aim') {   // the power arrow out of the striker
          const L0 = D.RS + 2 + aimPow * 18, ex = sx + Math.cos(ang) * L0, ey = by + Math.sin(ang) * L0;
          const col = new TH.Color().setHSL(.33 - aimPow * .33, .9, .55); MAT.arrow.color.copy(col);
          bar(sx + Math.cos(ang) * D.RS, by + Math.sin(ang) * D.RS, ex, ey, COARSE ? 1.5 : .9, MAT.arrow, .045);
          const c = new TH.Mesh(GEO.cone, MAT.arrow), [a, b] = wx(ex, ey); c.position.set(a, Y + .05, b); c.rotation.y = -ang + Math.PI / 2; c.renderOrder = 5; gd.add(c);
        }
      }
      if (!drag) { const r = ring(sx, by, MAT.ring, 1.18); r.userData.pulse = 1; }
      kick(120);
    }
    let pulseT = 0;
    function pulse() { clearInterval(pulseT); const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || document.hidden || !document.hasFocus()) return;   /* (the ring stands still while the window is not in front: no frames then) */ let any = false; gd.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(1.12 + Math.sin((performance.now() - t0) / 230) * .1); any = true; } }); if (any) kick(80); }, 60); }

    /* ---------- HUD ---------- */
    const css = document.createElement('style');
    css.textContent = '.hud .crp{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-weight:800;font-size:13px;opacity:.62;white-space:nowrap}.hud .crp.on{opacity:1;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hud .crp i{width:15px;height:15px;border-radius:50%;display:inline-block;flex:none;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.3)}.hud .crp b{font-size:14px}.hud .crp .q{width:11px;height:11px;background:#c3271f}.hud .crm{font-weight:800;font-size:13px;max-width:44vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.crtoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:11px 22px;border-radius:22px;background:#fff;color:#1d2133;font-weight:900;font-size:16px;box-shadow:0 0 0 3px #c23a7a,0 10px 26px rgba(0,0,0,.4);pointer-events:none;text-align:center;line-height:1.45;white-space:pre-line}.crtoast.good{background:#fff;color:#12684a;box-shadow:0 0 0 3px #1f7a55,0 10px 26px rgba(0,0,0,.4)}.crtoast.bad{background:#fff;color:#a8323a;box-shadow:0 0 0 3px #a8323a,0 10px 26px rgba(0,0,0,.4)}.crpow{position:fixed;z-index:6;pointer-events:none;padding:4px 10px;border-radius:99px;background:rgba(20,22,34,.82);color:#fff;font-weight:900;font-size:14px;transform:translate(-50%,-150%);white-space:nowrap}.crhow{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.55);padding:16px}.crhow-c{background:#fff;color:#1d2133;border-radius:24px;box-shadow:0 0 0 4px #c23a7a,0 18px 50px rgba(0,0,0,.45);padding:22px 22px 18px;width:min(440px,100%);max-height:100%;overflow:auto}.crhow h2{margin:0 0 14px;font-size:24px;font-weight:900;text-align:center;color:#c23a7a}.crhow ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.crhow li{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:800;line-height:1.35}.crhow li i{flex:none;width:40px;height:40px;border-radius:50%;background:#fbe3ee;color:#c23a7a;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;font-weight:900}.crhow .u{margin:12px 0 0;font-size:14px;font-weight:700;color:#5b6074;text-align:center}.crhow label{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0 6px;font-size:16px;font-weight:800;cursor:pointer}.crhow label input{width:20px;height:20px;accent-color:#c23a7a}.crhow .n{margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7083;text-align:center}.crhow button{display:block;width:100%;padding:13px;border:0;border-radius:99px;background:#c23a7a;color:#fff;font:inherit;font-size:18px;font-weight:900;cursor:pointer}.crflip{position:fixed;left:calc(16px + env(safe-area-inset-left));bottom:calc(22px + env(safe-area-inset-bottom));z-index:40;width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#2b3044;box-shadow:0 4px 14px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.crflip svg{width:28px;height:28px}.crflip.on{background:#c23a7a;color:#fff}.crview{left:calc(80px + env(safe-area-inset-left))}@media (max-width:560px){.crview{left:auto;right:calc(16px + env(safe-area-inset-right))}.hud .crp{padding:3px 7px;font-size:12px}.hud .crp .nm{display:none}.crtoast{font-size:14px;padding:9px 16px;border-radius:18px}}';
    document.head.appendChild(css);
    const HK = 'atlas-carrom-howto';
    const howtoOn = () => { try { return localStorage.getItem(HK) !== 'off'; } catch (e) { return true; } };
    let cardEl = null;
    // the touchpad note on PCs: its heading on a line of its own, then the steps, then how to cancel — no wrapping (2026-11-10)
    function padBlock(H) {
      if (!(mousey() && H.pad)) return `<p class="u">${esc(H.undo)}</p>`;
      const i = H.pad.search(/[：:]/), head = i > 0 ? H.pad.slice(0, i + 1) : '', body = i > 0 ? H.pad.slice(i + 1).trim() : H.pad;
      return `<p class="u pad">💻 <b>${esc(head)}</b>${head ? '<br>' : ''}${esc(body)}<br>${esc(H.undo)}</p>`;
    }
    function howtoCard(done) {   // a big card on the first turn: the steps for this device; "don't show again" turns it off for good
      const H = HOWTO[lang] || HOWTO.en, steps = H[mousey() ? 'm' : 't'], ic = ['↔', '↓', '↔', '☝'];
      const d = document.createElement('div'); d.className = 'crhow'; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
      d.innerHTML = `<div class="crhow-c" role="dialog" aria-modal="true"><h2>${esc(H.title)}</h2><ol>${steps.map((x, i) => `<li><i>${ic[i]}</i><span>${esc(x)}</span></li>`).join('')}</ol>${padBlock(H)}<label><input type="checkbox"> ${esc(H.never)}</label><p class="n">${esc(H.note.replace('{r}', t('bv.rules')))}</p><button type="button">${esc(H.ok)}</button></div>`;
      const close = () => { if (d.querySelector('input').checked) { try { localStorage.setItem(HK, 'off'); } catch (e) {} } d.remove(); cardEl = null; done && done(); };
      d.querySelector('button').onclick = close;
      ['pointerdown', 'pointermove', 'pointerup'].forEach(k => d.addEventListener(k, e => e.stopPropagation()));
      document.body.appendChild(d); cardEl = d;
    }
    let toastEl = null, toastT = 0;
    function toast(m, kind) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'crtoast' + (kind ? ' ' + kind : ''); toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, Math.max(1700, m.length * 70)); }
    const powEl = document.createElement('div'); powEl.className = 'crpow'; powEl.hidden = true; document.body.appendChild(powEl);
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dotCol = c => c === 'w' ? '#f1e6cc' : '#2a2018';
    function hud() {
      if (stopped || !st) return;
      const pill = p => { const c = E.colOf(st, p), dueN = st.due[p];
        return `<span class="crp ${st.turn === p && !over ? 'on' : ''}"><i style="background:${dotCol(c)}"></i><span class="nm">${esc(nameOf(p))}</span><b>${9 - st.pk[c]}</b>${st.queen.st === 'cov' && st.queen.by === p ? '<i class="q"></i>' : ''}${dueN ? `<small>⚠${dueN}</small>` : ''}</span>`; };
      const sc = target ? `<span class="crm">${esc(tx('score', { a: st.score[0], b: st.score[1] }))}</span>` : '';
      ctx.hud(pill(1) + sc + `<span class="crm">${esc(msg)}</span>` + pill(0));
    }
    const say = m => { msg = m || ''; hud(); };

    /* ---------- the AI (a worker; the page thinks itself if workers are unavailable) ---------- */
    let worker = null, wid = 0; const pend = {};
    try { worker = new Worker('../carrom/worker.js?v=6'); worker.onmessage = e => { const d = e.data || {}, f = pend[d.id]; if (f) { delete pend[d.id]; f(d.shot || null); } }; worker.onerror = () => { worker = null; Object.keys(pend).forEach(k => { const f = pend[k]; delete pend[k]; f(null); }); }; } catch (e) { worker = null; }
    function think(s, lv) {
      const seed = (Math.random() * 1e9) | 0;
      return new Promise(res => {
        const local = () => setTimeout(() => res(E.think(s, lv, seed)), 30);
        if (!worker) return local();
        const id = ++wid; pend[id] = r => r ? res(r) : local();
        worker.postMessage({ id, s, level: lv, seed, k: D.K });
        setTimeout(() => { if (pend[id]) { delete pend[id]; local(); } }, 9000);
      });
    }

    /* ---------- the night board: men flash when they are hit; a wave of light runs through the board now and then ---------- */
    const flashing = new Set(); let flashRaf = 0;
    function flash(g, v) {
      if (!g || !g.userData.flash) return;
      g.userData.ft = performance.now(); g.userData.fk = Math.min(.85, .3 + v / 420); flashing.add(g);
      if (!flashRaf) flashRaf = requestAnimationFrame(flashStep);
    }
    function flashStep() {
      flashRaf = 0; if (stopped) return; const now = performance.now();
      flashing.forEach(g => { const k = g.userData.fk * Math.max(0, 1 - (now - g.userData.ft) / 420); g.userData.flash(k * k); if (k <= 0) flashing.delete(g); });
      kick(80); if (flashing.size) flashRaf = requestAnimationFrame(flashStep);
    }
    let waveT = 0;
    function neonTick() {   // the RGB keeps flowing for the whole game (frames all along, but only while the window is in front)
      clearInterval(waveT); if (stopped || !board || board.userData.look !== 'neon') return;
      waveT = setInterval(() => { if (stopped) return clearInterval(waveT); if (!document.hidden && document.hasFocus()) kick(160); }, 100);
    }


    /* ---------- playing a stroke back: the simulated frames at their own pace (a tap speeds it up) ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, N = st.pcs.length, t0 = performance.now(), sinks = {}, pocketOf = {};
        sim.pocketed.forEach(e => { pocketOf[e.id] = e.q; });
        let ev = 0, el = 0, last = t0;
        striker.visible = true;
        (function step(now) {
          if (stopped) return done();
          now = performance.now(); el += Math.max(0, now - last) / 1000 * speedUp; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi];
          for (let i = 0; i <= N; i++) {
            const g = i === N ? striker : pcs[i], on = f[i * 3 + 2];
            if (on) { placeMesh(g, f[i * 3], f[i * 3 + 1]); g.visible = true; continue; }
            if (!g.visible) continue;
            // into the pocket: slide to its middle and drop
            if (!sinks[i]) sinks[i] = { t: el, x: g.position.x, z: g.position.z, q: i === N ? nearestPocket(g.position.x, g.position.z) : pocketOf[i] };
            const s = sinks[i], k = Math.min(1, (el - s.t) / .22), P = D.POCKETS[s.q != null ? s.q : 0], [px, pz] = wx(P[0], P[1]);
            g.position.set(s.x + (px - s.x) * k, Y - k * k * .2, s.z + (pz - s.z) * k);
            if (k >= 1) g.visible = false;
          }
          while (ev < sim.events.length && sim.events[ev].t <= el) {
            const e = sim.events[ev++];
            if (e.k === 'hit' && e.v > 8) SND.hit(e.v); else if (e.k === 'cush' && e.v > 25) SND.cush(e.v); else if (e.k === 'pocket') SND.pocket();
            const pg = i => i == null ? null : i === N ? striker : pcs[i];   // (neon: everything a man touches lights it up)
            if (e.k === 'hit' && e.v > 25) { flash(pg(e.a), e.v); flash(pg(e.b), e.v); }   // (only real knocks: the soft touches stay quiet)
            else if (e.k === 'cush' && e.v > 40) flash(pg(e.i), e.v);
            else if (e.k === 'pocket') flash(pg(e.i), 160);
          }
          kick(120);
          if (fi < F.length - 1 || Object.values(sinks).some(s => el - s.t < .22)) requestAnimationFrame(step);
          else done();
        })(t0);
      });
    }
    function nearestPocket(x, z) { let b = 0, bd = 1e9; D.POCKETS.forEach((P, q) => { const [px, pz] = wx(P[0], P[1]), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; b = q; } }); return b; }
    // men coming back to the board (dues, the queen): they drop in from above
    function dropIn(ids) {
      if (!ids.length) return Promise.resolve();
      return new Promise(done => {
        const t0 = performance.now();
        ids.forEach(i => { pcs[i].visible = true; });
        (function step(now) {
          if (stopped) return done();
          const k = Math.min(1, Math.max(0, now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
          ids.forEach(i => { const m = st.pcs[i]; placeMesh(pcs[i], m.x, m.y, (1 - e) * 1.4 + Math.sin(k * Math.PI) * .05); });
          kick(120);
          if (k < 1) requestAnimationFrame(step); else { SND.place(); done(); }
        })(t0);
      });
    }
    function slideStriker(p, x0, x1, ms) {
      return new Promise(done => {
        const t0 = performance.now(), by = E.baseY(p); striker.visible = true;
        (function step(now) {
          if (stopped) return done();
          const k = Math.min(1, Math.max(0, now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          placeMesh(striker, x0 + (x1 - x0) * e, by, Math.sin(k * Math.PI) * .03); kick(100);
          if (k < 1) requestAnimationFrame(step); else done();
        })(t0);
      });
    }

    /* ---------- the flow ---------- */
    const codeText = (c, r) => c === 'brk.miss' ? tx(c, { n: 3 - r.s.brk.tries }) : tx(c);
    async function stroke(shot) {
      if (over || stopped || busy) return;
      busy = true; phase = 'anim'; clearGuides(); drag = null; hintShot = null; powEl.hidden = true;
      const p = st.turn, s0 = st;
      SND.flick();
      const sim = E.simulate(s0, p, shot, { frames: true });
      speedUp = 1; say('');
      await playback(sim); if (stopped) return;
      const r = E.resolve(s0, sim);
      const back = r.s.pcs.map((m, i) => (m.on && !sim.fin[i].on) || (m.on && (Math.abs(m.x - sim.fin[i].x) > .01 || Math.abs(m.y - sim.fin[i].y) > .01)) ? i : -1).filter(i => i >= 0);
      st = r.s; ply++;
      if (!sim.striker.on) striker.visible = false;
      await dropIn(back); if (stopped) return;
      syncAll(); busy = false;
      const lead = r.msg.find(c => c !== 'own' && c !== 'opp') || r.msg[0];
      const good = r.msg.includes('own') || r.msg.includes('q.cov') || r.msg.includes('q.pend');
      if (lead && !st.over) { toast(codeText(lead, r), r.foul ? 'bad' : good ? 'good' : ''); if (r.foul) SND.bad(); else if (good) SND.good(); }
      else if (!st.over && !r.again) toast(tx('none'));
      if (st.over) return boardEnd();
      later(next, r.again ? 650 : 900);
    }
    function onTurn() { if (ctx.onTurn) ctx.onTurn(st.turn === 0 ? 0 : 1, { human: human(st.turn), ply }); }
    async function next() {
      if (over || stopped) return;
      hintShot = null; clearGuides(); onTurn();
      const p = st.turn;
      if (pvp) viewTo();
      if (human(p)) {
        if (!pvp) hist.push({ st: E.clone(st), boardNo });
        sx = E.nearestFree(st, p, sx || 0);
        striker.visible = true; placeMesh(striker, sx, E.baseY(p));
        phase = 'place';
        // the HUD keeps a short status; the how-to goes up top once (and for every break)
        say(pvp ? tx('turn', { p: nameOf(p) }) : t('p.turn'));
        const brk = () => tx('brk').replace(/([!！¡])\s*/, '$1\n');   // 「ブレイク！」 on a line of its own
        if (!told && howtoOn()) howtoCard(() => { if (!stopped && !st.brk.done) toast(brk()); });
        else if (!st.brk.done) toast(brk());
        told = true;
        showGuides(); pulse();
        return;
      }
      phase = 'ai'; say(tx(matchMedia('(max-width:560px)').matches ? 'turn' : 'think', { p: nameOf(p) }));   // phones: just "AI's turn" (the longer line wraps)
      const x0 = E.nearestFree(st, p, 0); striker.visible = true; placeMesh(striker, x0, E.baseY(p));
      const my = tok;
      const shot = await think(E.clone(st), level);
      if (stopped || my !== tok) return;
      const real = E.perform(shot, level, (Math.random() * 1e9) | 0);   // (no thinking pause: the shot is played as soon as it is found)
      await slideStriker(p, x0, shot.x, 380); if (stopped || my !== tok) return;
      // a short look along the line before the flick
      clearGuides(); const tr = E.aimTrace(st, p, shot.x, shot.ang); dots(shot.x, E.baseY(p), tr.gx, tr.gy, MAT.path); kick(150);
      await sleepUntil(performance.now() + 420); if (stopped || my !== tok) return;
      stroke(real);
    }
    const sleepUntil = at => new Promise(r => later(r, Math.max(0, at - performance.now())));
    function boardEnd() {
      const w = st.winner, txtB = tx('board', { p: nameOf(w), n: st.points });
      hud();
      if (target && !E.matchOver(st, target) && boardNo < 8) {
        toast(txtB, w === 0 || pvp ? 'good' : 'bad'); (w === 0 || pvp ? SND.good : SND.bad)();
        later(() => { boardNo++; st = E.nextBoard(st); build(); syncAll(); toast(tx('next', { n: boardNo })); hist.length = 0; later(next, 900); }, 2200);
        return;
      }
      over = true; phase = 'over'; clearGuides(); if (ctx.onTurn) ctx.onTurn(-1); flipBtn.hidden = viewBtn.hidden = true; if (pvp) viewTo(0);
      SND.win();
      const score = target ? tx('score', { a: st.score[0], b: st.score[1] }) : txtB;
      const won = target ? st.score[0] > st.score[1] : w === 0;
      if (pvp) { say(txtB); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: target ? tx('board', { p: nameOf(st.score[0] > st.score[1] ? 0 : 1), n: Math.max(st.score[0], st.score[1]) }).replace(/ \+.*$/, '') + ' · ' + score : txtB }), 1200); }
      say(won ? t('res.win') : t('res.lose'));
      later(() => ctx.onEnd({ win: won, draw: false, level, score }), 1200);
    }

    /* ---------- your hand (Hand above: the same in the rules tour) ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    function moveStriker(x) { const nx = E.nearestFree(st, st.turn, x); if (Math.abs(nx - sx) > .001) { sx = nx; placeMesh(striker, sx, E.baseY(st.turn)); kick(100); } }
    const canAim = () => !cardEl && !stopped && !over && !busy && phase === 'place' && !!st && human(st.turn);
    const hand = Hand({
      el: ctx.el, toCm, canAim,
      sign: () => st && st.turn === 1 ? -1 : 1,
      striker: () => sx, home: () => ({ x: sx, y: E.baseY(st.turn) }),
      place: x => { hintShot = null; moveStriker(x); showGuides(); },
      aim: a => {
        if (!a) { drag = null; powEl.hidden = true; if (canAim()) { say(pvp ? tx('turn', { p: nameOf(st.turn) }) : t('p.turn')); showGuides(); } return; }
        drag = { kind: 'aim' }; aimAng = a.ang; aimPow = a.pow; hintShot = null;
        powEl.hidden = false; powEl.textContent = Math.round(aimPow * 100) + '%'; powEl.style.left = a.e.clientX + 'px'; powEl.style.top = a.e.clientY + 'px';
        say('💪 ' + Math.round(aimPow * 100) + '%'); showGuides();
      },
      shoot: (ang, pw) => stroke(E.wobble({ x: sx, ang, v: 40 + pw * (E.VMAX - 40) }, (Math.random() * 1e9) | 0, .5 * feel.a * feel.s, .6 * feel.a * feel.h, .03 * feel.v * feel.s, .025 * feel.v * feel.h)),
      tap: () => { if (phase === 'anim' && !stopped) speedUp = 3; },   // a tap while the men roll: fast-forward
    });
    /* ---------- 盤面反転: a round button at the lower left (and the F key) turns the table round 180°, remembered per game.
       Two-player games also turn the table to whoever strikes; the flip goes on top of that. The pull stays "away from the
       target" on the board (flipped, you pull up the screen towards your own edge). ---------- */
    const FK = 'atlas-flip-carrom';
    let flipped = false; try { flipped = localStorage.getItem(FK) === '1'; } catch (e) {}
    let viewA = 0, viewRaf = 0;
    function viewTo(base, now) {   // base: the two-player turn (π for the far side); the flip adds π
      if (base == null) base = pvp && st && st.turn === 1 && !over ? Math.PI : 0;
      let to = base + (flipped ? Math.PI : 0); to = ((to % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (!T3.turn) return;
      cancelAnimationFrame(viewRaf);
      let from = viewA; if (to - from > Math.PI + 1e-6) from += 2 * Math.PI; else if (from - to > Math.PI + 1e-6) from -= 2 * Math.PI;
      const D = now || Math.abs(to - from) < 1e-3 ? 0 : 750, t0 = performance.now(), ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const set = (a, sc) => { viewA = a; const m = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (Math.abs(m) < 1e-4 && sc === 1) T3.turn(null); else T3.turn(a, sc); };
      if (!D) { set(to, 1); return; }
      const step = () => { if (stopped) return; const k = Math.min(1, (performance.now() - t0) / D), e = ease(k); set(from + (to - from) * e, 1 - .16 * Math.sin(Math.PI * e)); if (k < 1) viewRaf = requestAnimationFrame(step); else set(to, 1); };
      viewRaf = requestAnimationFrame(step);
    }
    const FLIPT = { ja: '盤面を反転', en: 'Flip the board', zh: '翻转棋盘', ko: '판 뒤집기', es: 'Girar el tablero', fr: 'Retourner le plateau', pt: 'Girar o tabuleiro', de: 'Brett drehen', hi: 'बोर्ड पलटें', ar: 'قلب اللوحة', ru: 'Перевернуть доску', 'zh-TW': '翻轉棋盤', id: 'Balik papan', tr: 'Tahtayı çevir' };
    const flipBtn = document.createElement('button'); flipBtn.type = 'button'; flipBtn.className = 'crflip';
    flipBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0 1 14.3-3.3"/><path d="M18.6 2.6v3.3h-3.3"/><path d="M20 15a8 8 0 0 1-14.3 3.3"/><path d="M5.4 21.4v-3.3h3.3"/><path d="M9.5 9.5h5v5h-5z"/></svg>';
    flipBtn.title = FLIPT[lang] || FLIPT.en; flipBtn.setAttribute('aria-label', flipBtn.title);
    const flipSync = () => { flipBtn.classList.toggle('on', flipped); flipBtn.setAttribute('aria-pressed', flipped ? 'true' : 'false'); };
    function flip() { if (stopped) return; flipped = !flipped; try { localStorage.setItem(FK, flipped ? '1' : '0'); } catch (e) {} flipSync(); hand.cancel(); viewTo(); }
    flipBtn.addEventListener('click', e => { e.preventDefault(); flip(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => flipBtn.addEventListener(k, e => e.stopPropagation()));
    neonTick(); flipSync(); (document.getElementById('bv') || document.body).appendChild(flipBtn);   // (inside the board view's own layer, over its canvas)
    viewTo(0, true);   // (a flip chosen last time shows at once)
    const VIEWT = { ja: ['上から見る', '斜めから見る'], en: ['View from above', 'View at an angle'], zh: ['从上方看', '斜着看'], 'zh-TW': ['從上方看', '斜著看'], ko: ['위에서 보기', '비스듬히 보기'], es: ['Vista desde arriba', 'Vista en ángulo'], fr: ['Vue de dessus', 'Vue en biais'], pt: ['Ver de cima', 'Ver em ângulo'], de: ['Von oben', 'Schräg von oben'], ru: ['Вид сверху', 'Вид под углом'], tr: ['Üstten bak', 'Açılı bak'], id: ['Lihat dari atas', 'Lihat miring'], hi: ['ऊपर से देखें', 'तिरछा देखें'], ar: ['عرض من الأعلى', 'عرض مائل'] };
    const viewBtn = document.createElement('button'); viewBtn.type = 'button'; viewBtn.className = 'crflip crview';
    const ICO_TOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1.5"/><circle cx="12" cy="12" r="2.2"/></svg>';
    const ICO_ANG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7.5 6h9L21 18H3z"/><ellipse cx="12" cy="12" rx="2.6" ry="1.8"/></svg>';
    const viewSync = () => { const L = VIEWT[lang] || VIEWT.en, lab = topView ? L[1] : L[0]; viewBtn.innerHTML = topView ? ICO_ANG : ICO_TOP; viewBtn.title = lab; viewBtn.setAttribute('aria-label', lab); };
    function toggleView() { if (stopped) return; topView = !topView; try { localStorage.setItem(VK, topView ? 'top' : 'angle'); } catch (e) {} viewSync(); hand.cancel(); if (T3.fit) T3.fit(baseFit()); kick(800); }
    viewBtn.addEventListener('click', e => { e.preventDefault(); toggleView(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => viewBtn.addEventListener(k, e => e.stopPropagation()));
    viewSync(); (document.getElementById('bv') || document.body).appendChild(viewBtn);
    const onFlipKey = e => { if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) flip(); };
    document.addEventListener('keydown', onFlipKey);
    const onKey = e => {
      if (stopped || phase !== 'place' || !st || !human(st.turn) || drag) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d) return;
      e.preventDefault(); moveStriker(sx + d * (e.shiftKey ? .25 : 1) * (st.turn === 1 && pvp ? -1 : 1) * (flipped ? -1 : 1)); showGuides();
    };
    document.addEventListener('keydown', onKey);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';

    /* ---------- go ---------- */
    // (2026-11-10) first the controls (unless turned off), then the board picker, then the game
    const goNow = () => { st = E.newBoard({ first: youFirst ? 0 : 1 }); build(); striker.visible = true; placeMesh(striker, 0, E.baseY(st.turn)); later(next, 650); };
    const pick = () => { if (stopped) return; BoardPick({ lang, list: BDL, cur: look, feel: CFEEL, name: k => T3.boardName ? T3.boardName(k, lang, 'carrom') : k, thumb: k => T3.boardThumb ? T3.boardThumb('carrom', k) : '', color: '#c23a7a', onPick: setLook, onStart: v => { setLook(v); goNow(); }, onBack: () => { const q = document.getElementById('bvQuit'); if (q) q.click(); } }); };
    if (howtoOn()) { told = true; howtoCard(pick); } else { told = true; pick(); }

    const myTurn = () => !stopped && !over && !busy && st && human(st.turn) && phase === 'place';
    function finish(why) {
      if (over || !st) return;
      tok++; over = true; phase = 'over'; busy = false; clearGuides(); if (ctx.onTurn) ctx.onTurn(-1); flipBtn.hidden = viewBtn.hidden = true; if (pvp) viewTo(0);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      say(t('res.lose')); setTimeout(() => { if (!stopped) ctx.onEnd(pvp ? { win: false, draw: false, level, score: r, pvp: true, winnerText: r } : { win: false, draw: false, level, score: r }); }, 200);
    }
    const api = {
      human: 0,
      canUndo: () => !pvp && myTurn() && hist.length > 1,
      undo() {
        if (!api.canUndo()) return;
        tok++; hist.pop(); const h = hist.pop(); st = E.clone(h.st); boardNo = h.boardNo; busy = false; drag = null;
        syncAll(); next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const my = tok;
        say('💡…');
        return think(E.clone(st), 20).then(shot => {
          if (stopped || my !== tok || phase !== 'place') return false;
          if (!shot || shot.kind === 'push') { toast(tx('hintNone')); }
          if (shot) { hintShot = shot; moveStriker(shot.x); sx = E.nearestFree(st, st.turn, shot.x); placeMesh(striker, sx, E.baseY(st.turn)); }
          if (shot) toast(tx('hint', { p: Math.round(Math.max(.05, (shot.v - 40) / (E.VMAX - 40)) * 100) }));
          say(pvp ? tx('turn', { p: nameOf(st.turn) }) : t('p.turn'));
          showGuides(); return true;
        });
      },
      canResign: () => !stopped && !over && !!st,
      resign() { finish('resign'); },
      timeout() { finish('time'); },
      stop() { document.querySelectorAll(".bpk").forEach(e => e.remove());
        stopped = true; tok++; timers.forEach(clearTimeout); clearInterval(pulseT);
        hand.stop();
        document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); ctx.el.style.touchAction = prevTouch;
        css.remove(); powEl.remove(); if (toastEl) toastEl.remove(); if (cardEl) cardEl.remove(); if (worker) worker.terminate();
        cancelAnimationFrame(viewRaf); clearInterval(waveT); cancelAnimationFrame(flashRaf); flipBtn.remove(); viewBtn.remove(); document.removeEventListener('keydown', onFlipKey); if (T3.turn) T3.turn(null);
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
      },
      _debug: { st: () => st, phase: () => phase, shoot: (x, ang, pw) => { if (phase !== 'place') return false; sx = E.nearestFree(st, st.turn, x); stroke({ x: sx, ang, v: 40 + pw * (E.VMAX - 40) }); return true; }, setStriker: x => { moveStriker(x); showGuides(); }, at: (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); }, striker: () => sx, pc: i => i === st.pcs.length ? striker : pcs[i] },
    };
    window.__carromTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.carrom = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 1, sizeLabel, sizeName, levelInfo, start, SND, TXT, Hand, HOW, HOWTO, how, BoardPick, feelOf };
})();
