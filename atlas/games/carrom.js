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

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, E = window.CarromEngine, D = E.DIM;
    const lang = ctx.lang, L = TXT[lang] || TXT.en;
    const tx = (k, o) => { let s = L[k] != null ? L[k] : (TXT.en[k] != null ? TXT.en[k] : k); if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6)), target = +ctx.size === 25 ? 25 : 0;
    const youFirst = (+ctx.side || 1) === 1;
    const board = T3.MODELS.carrom(true); T3.show('carrom', board);
    const U = board.userData, Y = U.top, K = U.K, W = 2 * (U.S + 7 * K);
    const baseFit = () => innerHeight > innerWidth * 1.1 ? { w: W + .25, d: W + .25, y: Y, pitch: 1.36 } : { w: W + .3, d: W + .35, y: Y, pitch: 1.3 };
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
      bar(-D.BX, by, D.BX, by, D.LINE + .4, MAT.base, .012);   // where the striker may stand
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
          bar(sx + Math.cos(ang) * D.RS, by + Math.sin(ang) * D.RS, ex, ey, .9, MAT.arrow, .045);
          const c = new TH.Mesh(GEO.cone, MAT.arrow), [a, b] = wx(ex, ey); c.position.set(a, Y + .05, b); c.rotation.y = -ang + Math.PI / 2; c.renderOrder = 5; gd.add(c);
        }
      }
      if (!drag) { const r = ring(sx, by, MAT.ring, 1.18); r.userData.pulse = 1; }
      kick(120);
    }
    let pulseT = 0;
    function pulse() { clearInterval(pulseT); const t0 = performance.now(); pulseT = setInterval(() => { if (stopped) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(1.12 + Math.sin((performance.now() - t0) / 230) * .1); any = true; } }); if (any) kick(80); }, 60); }

    /* ---------- HUD ---------- */
    const css = document.createElement('style');
    css.textContent = '.hud .crp{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-weight:800;font-size:13px;opacity:.62;white-space:nowrap}.hud .crp.on{opacity:1;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hud .crp i{width:15px;height:15px;border-radius:50%;display:inline-block;flex:none;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.3)}.hud .crp b{font-size:14px}.hud .crp .q{width:11px;height:11px;background:#c3271f}.hud .crm{font-weight:800;font-size:13px;max-width:44vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.crtoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:10px 20px;border-radius:99px;background:#2b3044;color:#fff;font-weight:900;font-size:15px;box-shadow:0 8px 22px rgba(0,0,0,.3);pointer-events:none;text-align:center;line-height:1.35}.crtoast.good{background:#1f7a55}.crtoast.bad{background:#a8323a}.crpow{position:fixed;z-index:6;pointer-events:none;padding:4px 10px;border-radius:99px;background:rgba(20,22,34,.82);color:#fff;font-weight:900;font-size:14px;transform:translate(-50%,-150%);white-space:nowrap}@media (max-width:560px){.hud .crp{padding:3px 7px;font-size:12px}.hud .crp .nm{display:none}.crtoast{font-size:14px;padding:9px 16px;border-radius:18px}}';
    document.head.appendChild(css);
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
    try { worker = new Worker('../carrom/worker.js?v=1'); worker.onmessage = e => { const d = e.data || {}, f = pend[d.id]; if (f) { delete pend[d.id]; f(d.shot || null); } }; worker.onerror = () => { worker = null; Object.keys(pend).forEach(k => { const f = pend[k]; delete pend[k]; f(null); }); }; } catch (e) { worker = null; }
    function think(s, lv) {
      const seed = (Math.random() * 1e9) | 0;
      return new Promise(res => {
        const local = () => setTimeout(() => res(E.think(s, lv, seed)), 30);
        if (!worker) return local();
        const id = ++wid; pend[id] = r => r ? res(r) : local();
        worker.postMessage({ id, s, level: lv, seed });
        setTimeout(() => { if (pend[id]) { delete pend[id]; local(); } }, 9000);
      });
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
      if (pvp) { if (T3.turn) T3.turn(p === 1 ? Math.PI : null); }
      if (human(p)) {
        if (!pvp) hist.push({ st: E.clone(st), boardNo });
        sx = E.nearestFree(st, p, sx || 0);
        striker.visible = true; placeMesh(striker, sx, E.baseY(p));
        phase = 'place';
        // the HUD keeps a short status; the how-to goes up top once (and for every break)
        say(pvp ? tx('turn', { p: nameOf(p) }) : t('p.turn'));
        if (!st.brk.done) toast(tx('brk')); else if (!told) { told = true; toast(tx('place')); }
        showGuides(); pulse();
        return;
      }
      phase = 'ai'; say(tx('think', { p: nameOf(p) }));
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
      over = true; phase = 'over'; clearGuides(); if (ctx.onTurn) ctx.onTurn(-1); if (T3.turn && pvp) T3.turn(null);
      SND.win();
      const score = target ? tx('score', { a: st.score[0], b: st.score[1] }) : txtB;
      const won = target ? st.score[0] > st.score[1] : w === 0;
      if (pvp) { say(txtB); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: target ? tx('board', { p: nameOf(st.score[0] > st.score[1] ? 0 : 1), n: Math.max(st.score[0], st.score[1]) }).replace(/ \+.*$/, '') + ' · ' + score : txtB }), 1200); }
      say(won ? t('res.win') : t('res.lose'));
      later(() => ctx.onEnd({ win: won, draw: false, level, score }), 1200);
    }

    /* ---------- your hand: slide the striker on the base line, then pull back from it and let go ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    function down(e) {
      if (stopped || over || busy || phase !== 'place' || !st || !human(st.turn)) {
        if (phase === 'anim' && !stopped) speedUp = 3;   // a tap while the men roll: fast-forward
        return;
      }
      const q = toCm(e); if (!q) return;
      const p = st.turn, by = E.baseY(p), dS = Math.hypot(q.x - sx, q.y - by);
      if (dS < D.RS + 2.6) drag = { kind: 'aim', id: e.pointerId, x0: q.x, y0: q.y };
      else if (Math.abs(q.y - by) < 6 && Math.abs(q.x) < D.BX + 4) { drag = { kind: 'slide', id: e.pointerId }; moveStriker(q.x); }
      else return;
      hintShot = drag.kind === 'slide' ? null : hintShot;
      try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault(); showGuides();
    }
    function moveStriker(x) { const nx = E.nearestFree(st, st.turn, x); if (Math.abs(nx - sx) > .001) { sx = nx; placeMesh(striker, sx, E.baseY(st.turn)); kick(100); } }
    function move(e) {
      if (!drag || e.pointerId !== drag.id || stopped) return;
      const q = toCm(e); if (!q) return;
      if (drag.kind === 'slide') { moveStriker(q.x); showGuides(); return; }
      const by = E.baseY(st.turn), dx = sx - q.x, dy = by - q.y, d = Math.hypot(dx, dy);
      if (d < 1.2) { aimPow = 0; powEl.hidden = true; showGuides(); return; }
      aimAng = Math.atan2(dy, dx); aimPow = Math.min(1, Math.max(0, (d - 1.2) / 22));
      powEl.hidden = false; powEl.textContent = Math.round(aimPow * 100) + '%'; powEl.style.left = e.clientX + 'px'; powEl.style.top = e.clientY + 'px';
      say('💪 ' + Math.round(aimPow * 100) + '%');
      showGuides();
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const k = drag.kind; drag = null; powEl.hidden = true;
      try { ctx.el.releasePointerCapture(e.pointerId); } catch (er) {}
      if (k === 'aim' && aimPow >= .04 && phase === 'place') { stroke({ x: sx, ang: aimAng, v: 40 + aimPow * (E.VMAX - 40) }); return; }
      say(pvp ? tx('turn', { p: nameOf(st.turn) }) : t('p.turn')); showGuides();
    }
    const onKey = e => {
      if (stopped || phase !== 'place' || !st || !human(st.turn) || drag) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d) return;
      e.preventDefault(); moveStriker(sx + d * (e.shiftKey ? .25 : 1) * (st.turn === 1 && pvp ? -1 : 1)); showGuides();
    };
    ctx.el.addEventListener('pointerdown', down);
    ctx.el.addEventListener('pointermove', move);
    ctx.el.addEventListener('pointerup', up); ctx.el.addEventListener('pointercancel', up);
    document.addEventListener('keydown', onKey);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';

    /* ---------- go ---------- */
    st = E.newBoard({ first: youFirst ? 0 : 1 });
    build(); striker.visible = true; placeMesh(striker, 0, E.baseY(st.turn));
    later(next, 650);

    const myTurn = () => !stopped && !over && !busy && st && human(st.turn) && phase === 'place';
    function finish(why) {
      if (over || !st) return;
      tok++; over = true; phase = 'over'; busy = false; clearGuides(); if (ctx.onTurn) ctx.onTurn(-1); if (T3.turn && pvp) T3.turn(null);
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
      stop() {
        stopped = true; tok++; timers.forEach(clearTimeout); clearInterval(pulseT);
        ctx.el.removeEventListener('pointerdown', down); ctx.el.removeEventListener('pointermove', move); ctx.el.removeEventListener('pointerup', up); ctx.el.removeEventListener('pointercancel', up);
        document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); ctx.el.style.touchAction = prevTouch;
        css.remove(); powEl.remove(); if (toastEl) toastEl.remove(); if (worker) worker.terminate();
        if (T3.turn) T3.turn(null);
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
      },
      _debug: { st: () => st, phase: () => phase, shoot: (x, ang, pw) => { if (phase !== 'place') return false; sx = E.nearestFree(st, st.turn, x); stroke({ x: sx, ang, v: 40 + pw * (E.VMAX - 40) }); return true; }, setStriker: x => { moveStriker(x); showGuides(); }, at: (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); }, striker: () => sx },
    };
    window.__carromTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.carrom = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 1, sizeLabel, sizeName, levelInfo, start, SND, TXT };
})();
