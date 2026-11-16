/* =====================================================================
   ヒット＆ブロー on the portal's 3D table (2026-11-16, user: 3Dのゲームとして実装 · 2Dは廃止 · ミッドナイトベース).
   · One shared board, one hidden code: the players take turns guessing it (the rows alternate, every row and its answer is
     seen by both). The first to get all hits wins; when the rows run out, a draw. (As in the popular online Hit & Blow apps.)
   · Modes (the card's tabs): AI戦 · レート戦 (atlas/app.js RTG, own record) · 対人 (two players, one device) · 今日の一問
     (EASY / HARD: a puzzle of the day — clue rows already on the board, crack the code within the limit; ../hitblow/engine.js
     makeDaily). 種目 (adapter sizes 1..5 = HitBlowEngine.RULES): カラー · カラー（重複あり）· ナンバー3 · ナンバー4 · エキスパート.
   · Input: the dock at the bottom (the slots of the row being made + OK, the palette) — tap a gem to put it in the next free
     slot, tap a slot (in the dock or on the board) to take it out; on PCs also the keys (1–8 / 0–9, Backspace, Enter).
   · The answer pins: ヒット = yellow-green, ブロー = white, 2×2 beside each row. The hidden code waits in a jewel case at the
     far end of the board (lid marked ？), shaken and locked at the start, opened at the end.
   · The board: atlas/models/hitblow.js (Table3D.hitblow). Rendering on demand (animations kick Table3D).
   ===================================================================== */
(function () {
  'use strict';
  const L14 = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // texts (14 languages; {n} etc. are filled in)
  const TX = {
    ja: { r1: 'カラー', r1d: '6色から4つ。同じ色は使わない。', r2: 'カラー（重複あり）', r2d: '6色から4つ。同じ色を何度でも使える。', r3: 'ナンバー3', r3d: '0〜9の数字を3つ。同じ数字は使わない。', r4: 'ナンバー4', r4d: '0〜9の数字を4つ。同じ数字は使わない。', r5: 'エキスパート', r5d: '8色から5つ。同じ色を何度でも使える。',
      daily: '今日の一問', dailyNote: '手がかりの行がすでに盤に。決められた回数以内に答えを当てよう。毎日かわる2問。', easy: 'カラー・{n}回以内', hard: 'ナンバー4・{n}回以内',
      you: 'あなた', ai: 'AI', p1: 'プレイヤー1', p2: 'プレイヤー2', clue: '手がかり',
      yourTurn: 'あなたの番：{n}つ並べてOK', aiTurn: 'AIが考えています…', pTurn: '{p}の番', left: 'あと{n}回',
      need: '{n}つ並べてね', noDup: '同じ{k}は使えません', color: '色', digit: '数字', tried: 'その組み合わせはもう出ています',
      allHit: 'ぜんぶヒット！', hint: 'これが有力', solvedRow: '{n}行目で正解', none: '時間切れ：だれも当てられず', ans: '答え',
      pWin: '{p}の勝ち', dWin: 'クリア！', dLose: '回数切れ…', dRes: '{n}回で正解（目安 {p}回）', dFail: '{n}回以内に当てられませんでした',
      lv: ['うっかり屋：前の答えをよく忘れる', '見習い：ときどき手がかりを見落とす', '推理好き：手がかりどおりに当てる', '名探偵：相手に手がかりを渡さない当て方'], who: ['はじめての人に', 'ルールに慣れたら', '推理に自信があれば', '腕試しに'] },
    en: { r1: 'Colour', r1d: '4 of 6 colours, all different.', r2: 'Colour (repeats)', r2d: '4 of 6 colours; a colour may repeat.', r3: 'Number 3', r3d: '3 different digits, 0–9.', r4: 'Number 4', r4d: '4 different digits, 0–9.', r5: 'Expert', r5d: '5 of 8 colours; colours may repeat.',
      daily: 'Daily puzzle', dailyNote: 'Clue rows are already on the board. Crack the code within the limit. Two new puzzles every day.', easy: 'Colour · within {n}', hard: 'Number 4 · within {n}',
      you: 'You', ai: 'AI', p1: 'Player 1', p2: 'Player 2', clue: 'Clue',
      yourTurn: 'Your turn: place {n}, then OK', aiTurn: 'The AI is thinking…', pTurn: "{p}'s turn", left: '{n} left',
      need: 'Place {n} first', noDup: 'No repeated {k}s', color: 'colour', digit: 'digit', tried: 'That guess is already on the board',
      allHit: 'All hits!', hint: 'A strong guess', solvedRow: 'Cracked on row {n}', none: 'Out of rows: nobody cracked it', ans: 'Answer',
      pWin: '{p} wins', dWin: 'Solved!', dLose: 'Out of guesses…', dRes: 'Solved in {n} (par {p})', dFail: 'Not solved within {n}',
      lv: ['Forgetful: often forgets earlier answers', 'Apprentice: sometimes misses a clue', 'Sleuth: guesses by the clues', 'Master: guesses that give the rival little'], who: ['For first games', 'Once you know the rules', 'If you trust your logic', 'For a real test'] },
    zh: { r1: '颜色', r1d: '6色中选4个，颜色不重复。', r2: '颜色（可重复）', r2d: '6色中选4个，颜色可重复。', r3: '数字3', r3d: '0〜9中3个不同数字。', r4: '数字4', r4d: '0〜9中4个不同数字。', r5: '专家', r5d: '8色中选5个，颜色可重复。',
      daily: '每日一题', dailyNote: '盘上已有提示行。在限定次数内猜出答案。每天两题。', easy: '颜色・{n}次以内', hard: '数字4・{n}次以内',
      you: '你', ai: 'AI', p1: '玩家1', p2: '玩家2', clue: '提示',
      yourTurn: '你的回合：放好{n}个后按OK', aiTurn: 'AI思考中…', pTurn: '{p}的回合', left: '还剩{n}次',
      need: '请先放{n}个', noDup: '{k}不能重复', color: '颜色', digit: '数字', tried: '这个组合已经出现过',
      allHit: '全部命中！', hint: '推荐这一手', solvedRow: '第{n}行猜中', none: '行数用完：无人猜中', ans: '答案',
      pWin: '{p}获胜', dWin: '解开了！', dLose: '次数用完…', dRes: '{n}次猜中（标准{p}次）', dFail: '{n}次内未能猜中',
      lv: ['粗心：常忘记之前的结果', '学徒：偶尔漏看提示', '推理家：按提示来猜', '名侦探：少给对手线索'], who: ['适合初次', '熟悉规则后', '对推理有自信', '实力挑战'] },
    'zh-TW': { r1: '顏色', r1d: '6色中選4個，顏色不重複。', r2: '顏色（可重複）', r2d: '6色中選4個，顏色可重複。', r3: '數字3', r3d: '0〜9中3個不同數字。', r4: '數字4', r4d: '0〜9中4個不同數字。', r5: '專家', r5d: '8色中選5個，顏色可重複。',
      daily: '每日一題', dailyNote: '盤上已有提示列。在限定次數內猜出答案。每天兩題。', easy: '顏色・{n}次以內', hard: '數字4・{n}次以內',
      you: '你', ai: 'AI', p1: '玩家1', p2: '玩家2', clue: '提示',
      yourTurn: '你的回合：放好{n}個後按OK', aiTurn: 'AI思考中…', pTurn: '{p}的回合', left: '還剩{n}次',
      need: '請先放{n}個', noDup: '{k}不能重複', color: '顏色', digit: '數字', tried: '這個組合已經出現過',
      allHit: '全部命中！', hint: '推薦這一手', solvedRow: '第{n}列猜中', none: '列數用完：無人猜中', ans: '答案',
      pWin: '{p}獲勝', dWin: '解開了！', dLose: '次數用完…', dRes: '{n}次猜中（標準{p}次）', dFail: '{n}次內未能猜中',
      lv: ['粗心：常忘記之前的結果', '學徒：偶爾漏看提示', '推理家：照提示來猜', '名偵探：少給對手線索'], who: ['適合初次', '熟悉規則後', '對推理有自信', '實力挑戰'] },
    ko: { r1: '컬러', r1d: '6색 중 4개, 같은 색은 쓰지 않음.', r2: '컬러(중복)', r2d: '6색 중 4개, 같은 색을 여러 번.', r3: '넘버3', r3d: '0〜9 중 서로 다른 숫자 3개.', r4: '넘버4', r4d: '0〜9 중 서로 다른 숫자 4개.', r5: '엑스퍼트', r5d: '8색 중 5개, 색 중복 가능.',
      daily: '오늘의 문제', dailyNote: '단서 줄이 이미 판에 있어요. 정해진 횟수 안에 맞혀 보세요. 매일 2문제.', easy: '컬러 · {n}회 이내', hard: '넘버4 · {n}회 이내',
      you: '나', ai: 'AI', p1: '플레이어1', p2: '플레이어2', clue: '단서',
      yourTurn: '내 차례: {n}개 놓고 OK', aiTurn: 'AI가 생각 중…', pTurn: '{p} 차례', left: '{n}회 남음',
      need: '먼저 {n}개를 놓으세요', noDup: '같은 {k}은(는) 쓸 수 없어요', color: '색', digit: '숫자', tried: '이미 나온 조합이에요',
      allHit: '전부 히트!', hint: '유력한 수', solvedRow: '{n}번째 줄에서 정답', none: '줄이 다 찼어요: 아무도 못 맞힘', ans: '정답',
      pWin: '{p} 승리', dWin: '클리어!', dLose: '횟수 초과…', dRes: '{n}회에 정답 (기준 {p}회)', dFail: '{n}회 안에 맞히지 못했어요',
      lv: ['덜렁이: 앞의 결과를 자주 잊음', '견습생: 가끔 단서를 놓침', '추리가: 단서대로 맞힘', '명탐정: 상대에게 단서를 덜 줌'], who: ['처음이라면', '규칙에 익숙해지면', '추리에 자신 있다면', '실력 시험'] },
    es: { r1: 'Color', r1d: '4 de 6 colores, todos distintos.', r2: 'Color (con repetición)', r2d: '4 de 6 colores; se pueden repetir.', r3: 'Número 3', r3d: '3 cifras distintas, 0–9.', r4: 'Número 4', r4d: '4 cifras distintas, 0–9.', r5: 'Experto', r5d: '5 de 8 colores; se pueden repetir.',
      daily: 'Reto del día', dailyNote: 'Ya hay filas de pistas en el tablero. Descifra el código dentro del límite. Dos retos nuevos cada día.', easy: 'Color · en {n}', hard: 'Número 4 · en {n}',
      you: 'Tú', ai: 'IA', p1: 'Jugador 1', p2: 'Jugador 2', clue: 'Pista',
      yourTurn: 'Tu turno: coloca {n} y pulsa OK', aiTurn: 'La IA está pensando…', pTurn: 'Turno de {p}', left: 'Quedan {n}',
      need: 'Coloca {n} primero', noDup: 'Sin {k} repetidos', color: 'colores', digit: 'dígitos', tried: 'Esa jugada ya está en el tablero',
      allHit: '¡Todo aciertos!', hint: 'Una buena jugada', solvedRow: 'Descifrado en la fila {n}', none: 'Sin filas: nadie lo descifró', ans: 'Respuesta',
      pWin: 'Gana {p}', dWin: '¡Resuelto!', dLose: 'Sin intentos…', dRes: 'Resuelto en {n} (par {p})', dFail: 'No resuelto en {n}',
      lv: ['Despistado: olvida respuestas', 'Aprendiz: a veces pasa por alto una pista', 'Detective: juega según las pistas', 'Maestro: da pocas pistas al rival'], who: ['Para empezar', 'Si ya sabes las reglas', 'Si confías en tu lógica', 'Para ponerte a prueba'] },
    fr: { r1: 'Couleur', r1d: '4 couleurs sur 6, toutes différentes.', r2: 'Couleur (répétitions)', r2d: '4 couleurs sur 6 ; une couleur peut revenir.', r3: 'Nombre 3', r3d: '3 chiffres différents, 0–9.', r4: 'Nombre 4', r4d: '4 chiffres différents, 0–9.', r5: 'Expert', r5d: '5 couleurs sur 8 ; répétitions permises.',
      daily: 'Défi du jour', dailyNote: 'Des lignes d’indices sont déjà sur le plateau. Trouvez le code dans la limite. Deux défis par jour.', easy: 'Couleur · en {n}', hard: 'Nombre 4 · en {n}',
      you: 'Vous', ai: 'IA', p1: 'Joueur 1', p2: 'Joueur 2', clue: 'Indice',
      yourTurn: 'À vous : placez {n}, puis OK', aiTurn: 'L’IA réfléchit…', pTurn: 'Au tour de {p}', left: 'Encore {n}',
      need: 'Placez-en {n} d’abord', noDup: 'Pas de {k} répétés', color: 'couleurs', digit: 'chiffres', tried: 'Cet essai est déjà sur le plateau',
      allHit: 'Tout juste !', hint: 'Un bon essai', solvedRow: 'Trouvé à la ligne {n}', none: 'Plus de lignes : personne n’a trouvé', ans: 'Réponse',
      pWin: '{p} gagne', dWin: 'Résolu !', dLose: 'Plus d’essais…', dRes: 'Résolu en {n} (par {p})', dFail: 'Non résolu en {n}',
      lv: ['Étourdi : oublie souvent', 'Apprenti : rate parfois un indice', 'Détective : suit les indices', 'Maître : donne peu d’indices'], who: ['Pour débuter', 'Une fois les règles connues', 'Si vous aimez déduire', 'Pour un vrai test'] },
    pt: { r1: 'Cor', r1d: '4 de 6 cores, todas diferentes.', r2: 'Cor (com repetição)', r2d: '4 de 6 cores; podem repetir.', r3: 'Número 3', r3d: '3 dígitos diferentes, 0–9.', r4: 'Número 4', r4d: '4 dígitos diferentes, 0–9.', r5: 'Especialista', r5d: '5 de 8 cores; podem repetir.',
      daily: 'Desafio do dia', dailyNote: 'Já há linhas de pistas no tabuleiro. Decifre o código dentro do limite. Dois desafios por dia.', easy: 'Cor · em {n}', hard: 'Número 4 · em {n}',
      you: 'Você', ai: 'IA', p1: 'Jogador 1', p2: 'Jogador 2', clue: 'Pista',
      yourTurn: 'Sua vez: coloque {n} e OK', aiTurn: 'A IA está pensando…', pTurn: 'Vez de {p}', left: 'Faltam {n}',
      need: 'Coloque {n} primeiro', noDup: 'Sem {k} repetidos', color: 'cores', digit: 'dígitos', tried: 'Esse palpite já está no tabuleiro',
      allHit: 'Tudo certo!', hint: 'Um bom palpite', solvedRow: 'Decifrado na linha {n}', none: 'Sem linhas: ninguém decifrou', ans: 'Resposta',
      pWin: '{p} vence', dWin: 'Resolvido!', dLose: 'Sem tentativas…', dRes: 'Resolvido em {n} (par {p})', dFail: 'Não resolvido em {n}',
      lv: ['Distraído: esquece respostas', 'Aprendiz: às vezes perde uma pista', 'Detetive: segue as pistas', 'Mestre: dá poucas pistas ao rival'], who: ['Para começar', 'Depois de saber as regras', 'Se confia na lógica', 'Para um teste real'] },
    de: { r1: 'Farbe', r1d: '4 von 6 Farben, alle verschieden.', r2: 'Farbe (Wiederholung)', r2d: '4 von 6 Farben; Farben dürfen sich wiederholen.', r3: 'Zahl 3', r3d: '3 verschiedene Ziffern, 0–9.', r4: 'Zahl 4', r4d: '4 verschiedene Ziffern, 0–9.', r5: 'Experte', r5d: '5 von 8 Farben; Wiederholung erlaubt.',
      daily: 'Tagesrätsel', dailyNote: 'Hinweisreihen liegen schon auf dem Brett. Knacke den Code im Limit. Jeden Tag zwei neue.', easy: 'Farbe · in {n}', hard: 'Zahl 4 · in {n}',
      you: 'Du', ai: 'KI', p1: 'Spieler 1', p2: 'Spieler 2', clue: 'Hinweis',
      yourTurn: 'Du bist dran: {n} setzen, dann OK', aiTurn: 'Die KI denkt…', pTurn: '{p} ist dran', left: 'Noch {n}',
      need: 'Erst {n} setzen', noDup: 'Keine {k} doppelt', color: 'Farben', digit: 'Ziffern', tried: 'Dieser Tipp liegt schon auf dem Brett',
      allHit: 'Alles Treffer!', hint: 'Ein starker Tipp', solvedRow: 'Geknackt in Reihe {n}', none: 'Keine Reihen mehr: niemand hat es geknackt', ans: 'Lösung',
      pWin: '{p} gewinnt', dWin: 'Gelöst!', dLose: 'Keine Versuche mehr…', dRes: 'Gelöst in {n} (Par {p})', dFail: 'Nicht in {n} gelöst',
      lv: ['Vergesslich: vergisst oft Antworten', 'Lehrling: übersieht mal einen Hinweis', 'Spürnase: rät nach den Hinweisen', 'Meister: verrät dem Gegner wenig'], who: ['Für den Einstieg', 'Wenn du die Regeln kennst', 'Wenn du gern kombinierst', 'Als echte Probe'] },
    ru: { r1: 'Цвета', r1d: '4 из 6 цветов, все разные.', r2: 'Цвета (с повтором)', r2d: '4 из 6 цветов; цвета могут повторяться.', r3: 'Числа 3', r3d: '3 разные цифры, 0–9.', r4: 'Числа 4', r4d: '4 разные цифры, 0–9.', r5: 'Эксперт', r5d: '5 из 8 цветов; повторы можно.',
      daily: 'Задача дня', dailyNote: 'На доске уже есть ряды-подсказки. Разгадайте код за отведённое число ходов. Две задачи каждый день.', easy: 'Цвета · за {n}', hard: 'Числа 4 · за {n}',
      you: 'Вы', ai: 'ИИ', p1: 'Игрок 1', p2: 'Игрок 2', clue: 'Подсказка',
      yourTurn: 'Ваш ход: поставьте {n} и OK', aiTurn: 'ИИ думает…', pTurn: 'Ход: {p}', left: 'Осталось {n}',
      need: 'Сначала поставьте {n}', noDup: 'Нельзя повторять {k}', color: 'цвета', digit: 'цифры', tried: 'Такой вариант уже был',
      allHit: 'Все в точку!', hint: 'Сильный вариант', solvedRow: 'Разгадано в ряду {n}', none: 'Ряды кончились: никто не разгадал', ans: 'Ответ',
      pWin: 'Победа: {p}', dWin: 'Решено!', dLose: 'Попытки кончились…', dRes: 'Решено за {n} (норма {p})', dFail: 'Не решено за {n}',
      lv: ['Рассеянный: часто забывает ответы', 'Ученик: иногда упускает подсказку', 'Сыщик: следует подсказкам', 'Мастер: почти не помогает сопернику'], who: ['Для первых партий', 'Когда освоите правила', 'Если любите логику', 'Для серьёзной проверки'] },
    tr: { r1: 'Renk', r1d: '6 renkten 4, hepsi farklı.', r2: 'Renk (tekrarlı)', r2d: '6 renkten 4; renk tekrar edebilir.', r3: 'Sayı 3', r3d: '0–9 arası 3 farklı rakam.', r4: 'Sayı 4', r4d: '0–9 arası 4 farklı rakam.', r5: 'Uzman', r5d: '8 renkten 5; tekrar olabilir.',
      daily: 'Günün bulmacası', dailyNote: 'Tahtada ipucu satırları var. Kodu sınır içinde çöz. Her gün iki yeni bulmaca.', easy: 'Renk · {n} içinde', hard: 'Sayı 4 · {n} içinde',
      you: 'Sen', ai: 'YZ', p1: 'Oyuncu 1', p2: 'Oyuncu 2', clue: 'İpucu',
      yourTurn: 'Sıra sende: {n} koy, sonra OK', aiTurn: 'YZ düşünüyor…', pTurn: 'Sıra: {p}', left: '{n} kaldı',
      need: 'Önce {n} koy', noDup: '{k} tekrar edemez', color: 'Renkler', digit: 'Rakamlar', tried: 'Bu tahmin zaten tahtada',
      allHit: 'Hepsi isabet!', hint: 'Güçlü bir tahmin', solvedRow: '{n}. satırda çözüldü', none: 'Satır bitti: kimse çözemedi', ans: 'Cevap',
      pWin: '{p} kazandı', dWin: 'Çözüldü!', dLose: 'Hak bitti…', dRes: '{n} tahminde çözüldü (hedef {p})', dFail: '{n} içinde çözülemedi',
      lv: ['Dalgın: cevapları sık unutur', 'Çırak: bazen ipucunu kaçırır', 'Dedektif: ipuçlarına göre tahmin eder', 'Usta: rakibe az ipucu verir'], who: ['İlk oyunlar için', 'Kuralları öğrenince', 'Mantığına güveniyorsan', 'Gerçek bir sınav'] },
    id: { r1: 'Warna', r1d: '4 dari 6 warna, semua berbeda.', r2: 'Warna (boleh ulang)', r2d: '4 dari 6 warna; warna boleh berulang.', r3: 'Angka 3', r3d: '3 angka berbeda, 0–9.', r4: 'Angka 4', r4d: '4 angka berbeda, 0–9.', r5: 'Ahli', r5d: '5 dari 8 warna; boleh berulang.',
      daily: 'Teka-teki harian', dailyNote: 'Baris petunjuk sudah ada di papan. Tebak kodenya dalam batas. Dua teka-teki baru tiap hari.', easy: 'Warna · dalam {n}', hard: 'Angka 4 · dalam {n}',
      you: 'Kamu', ai: 'AI', p1: 'Pemain 1', p2: 'Pemain 2', clue: 'Petunjuk',
      yourTurn: 'Giliranmu: pasang {n}, lalu OK', aiTurn: 'AI sedang berpikir…', pTurn: 'Giliran {p}', left: 'Sisa {n}',
      need: 'Pasang {n} dulu', noDup: '{k} tidak boleh sama', color: 'Warna', digit: 'Angka', tried: 'Tebakan itu sudah ada di papan',
      allHit: 'Semua hit!', hint: 'Tebakan yang kuat', solvedRow: 'Terpecahkan di baris {n}', none: 'Baris habis: tak ada yang menebak', ans: 'Jawaban',
      pWin: '{p} menang', dWin: 'Terpecahkan!', dLose: 'Kesempatan habis…', dRes: 'Terpecahkan dalam {n} (par {p})', dFail: 'Tidak terpecahkan dalam {n}',
      lv: ['Pelupa: sering lupa jawaban', 'Murid: kadang melewatkan petunjuk', 'Detektif: menebak sesuai petunjuk', 'Ahli: sedikit memberi petunjuk ke lawan'], who: ['Untuk pemula', 'Setelah paham aturan', 'Kalau yakin dengan logikamu', 'Untuk ujian sungguhan'] },
    hi: { r1: 'रंग', r1d: '6 में से 4 रंग, सब अलग।', r2: 'रंग (दोहराव)', r2d: '6 में से 4 रंग; रंग दोहरा सकते हैं।', r3: 'संख्या 3', r3d: '0–9 के 3 अलग अंक।', r4: 'संख्या 4', r4d: '0–9 के 4 अलग अंक।', r5: 'विशेषज्ञ', r5d: '8 में से 5 रंग; दोहराव संभव।',
      daily: 'आज की पहेली', dailyNote: 'बोर्ड पर संकेत की पंक्तियाँ पहले से हैं। सीमा के भीतर कोड खोलें। रोज़ दो नई पहेलियाँ।', easy: 'रंग · {n} में', hard: 'संख्या 4 · {n} में',
      you: 'आप', ai: 'AI', p1: 'खिलाड़ी 1', p2: 'खिलाड़ी 2', clue: 'संकेत',
      yourTurn: 'आपकी बारी: {n} रखें, फिर OK', aiTurn: 'AI सोच रहा है…', pTurn: '{p} की बारी', left: '{n} बाकी',
      need: 'पहले {n} रखें', noDup: '{k} दोहरा नहीं सकते', color: 'रंग', digit: 'अंक', tried: 'यह अनुमान पहले से बोर्ड पर है',
      allHit: 'सब हिट!', hint: 'एक मज़बूत अनुमान', solvedRow: 'पंक्ति {n} में हल', none: 'पंक्तियाँ खत्म: कोई नहीं खोल पाया', ans: 'उत्तर',
      pWin: '{p} जीते', dWin: 'हल हो गया!', dLose: 'प्रयास खत्म…', dRes: '{n} में हल (मानक {p})', dFail: '{n} में हल नहीं हुआ',
      lv: ['भुलक्कड़: पिछले उत्तर भूल जाता है', 'नौसिखिया: कभी-कभी संकेत छोड़ देता है', 'जासूस: संकेतों के अनुसार', 'उस्ताद: विरोधी को कम संकेत देता है'], who: ['शुरुआत के लिए', 'नियम सीखने के बाद', 'तर्क पर भरोसा हो तो', 'असली परीक्षा'] },
    ar: { r1: 'ألوان', r1d: '4 من 6 ألوان، كلها مختلفة.', r2: 'ألوان (مع تكرار)', r2d: '4 من 6 ألوان؛ يجوز التكرار.', r3: 'أرقام 3', r3d: '3 أرقام مختلفة من 0 إلى 9.', r4: 'أرقام 4', r4d: '4 أرقام مختلفة من 0 إلى 9.', r5: 'خبير', r5d: '5 من 8 ألوان؛ يجوز التكرار.',
      daily: 'لغز اليوم', dailyNote: 'صفوف التلميحات على اللوحة بالفعل. اكسر الرمز ضمن الحد. لغزان جديدان كل يوم.', easy: 'ألوان · في {n}', hard: 'أرقام 4 · في {n}',
      you: 'أنت', ai: 'الذكاء', p1: 'اللاعب 1', p2: 'اللاعب 2', clue: 'تلميح',
      yourTurn: 'دورك: ضع {n} ثم OK', aiTurn: 'الذكاء يفكر…', pTurn: 'دور {p}', left: 'باقٍ {n}',
      need: 'ضع {n} أولًا', noDup: 'لا تكرار في {k}', color: 'الألوان', digit: 'الأرقام', tried: 'هذا التخمين موجود بالفعل',
      allHit: 'إصابة كاملة!', hint: 'تخمين قوي', solvedRow: 'كُسر في الصف {n}', none: 'انتهت الصفوف: لم يكسره أحد', ans: 'الحل',
      pWin: 'فاز {p}', dWin: 'تم الحل!', dLose: 'نفدت المحاولات…', dRes: 'حُل في {n} (المعيار {p})', dFail: 'لم يُحل في {n}',
      lv: ['كثير النسيان', 'متدرب: يفوته تلميح أحيانًا', 'محقق: يتبع التلميحات', 'أستاذ: يعطي الخصم القليل'], who: ['للبداية', 'بعد تعلم القواعد', 'إن كنت تثق بمنطقك', 'لاختبار حقيقي'] },
  };
  const tx = (lang, k, v) => { let s = (TX[lang] || TX.en)[k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v && typeof s === 'string') for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const RN = z => 'r' + z;
  const today = () => window.HitBlowEngine ? HitBlowEngine.localDate() : new Date().toISOString().slice(0, 10);
  const DKEY = 'aicoding-hitblow-daily3d';
  const dread = () => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}') || {}; } catch (e) { return {}; } };
  const dailyDone = k => { const o = dread(); return !!(o[k] && o[k][today()] && o[k][today()].win); };

  /* ---------- sounds (the portal's sound switch): glass on lacquer, a tick per pin, a rattle in the case ---------- */
  const SFX = (() => {
    const on = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return document.hidden ? null : C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on() && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      clink: (d = 0) => { tone(2900, 2300, .07, .07, 'sine', d); tone(4100, 3600, .05, .03, 'sine', d + .005); },
      lift: () => tone(1200, 1700, .06, .04, 'triangle'),
      hit: d => { tone(1320, 1320, .09, .06, 'triangle', d); tone(1980, 1980, .07, .025, 'sine', d); },
      blow: d => tone(880, 880, .08, .05, 'sine', d),
      ok: () => { tone(660, 990, .1, .06, 'triangle'); },
      rattle: () => { for (let k = 0; k < 9; k++) tone(2200 + (k % 3) * 400, 1800, .03, .035, 'triangle', k * .045); tone(420, 300, .08, .08, 'square', .46); },
      open: () => { tone(300, 620, .25, .06, 'triangle'); [880, 1175, 1568].forEach((f, i) => tone(f, f, .3, .05, 'sine', .2 + i * .09)); },
      nope: () => tone(300, 220, .09, .05, 'triangle'),
    };
  })();

  /* ---------- the dock (input) and toasts ---------- */
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.hbtoast{position:fixed;left:50%;bottom:calc(var(--hbdock,180px) + 10px);transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#1b2257;border:1px solid rgba(140,170,255,.5);color:#eef2ff;font-weight:800;font-size:14.5px;text-align:center;box-shadow:0 10px 30px -12px rgba(30,40,120,.8);pointer-events:none;animation:hbt .25s ease-out}
@keyframes hbt{from{opacity:0;transform:translate(-50%,8px)}}
.hbdock{position:absolute;z-index:4;left:50%;transform:translateX(-50%);bottom:calc(var(--tbh,70px) + 4px + env(safe-area-inset-bottom));width:min(560px,calc(100vw - 16px));padding:10px 12px 12px;border-radius:22px;background:linear-gradient(180deg,rgba(26,34,92,.94),rgba(10,14,44,.96));border:1px solid rgba(140,170,255,.4);box-shadow:0 0 0 1px rgba(0,0,0,.3),0 18px 40px -16px rgba(10,14,60,.9),inset 0 1px 0 rgba(255,255,255,.08);color:#eef2ff;font-family:inherit;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none}
.hbdock.on{opacity:1;pointer-events:auto}
.hbdock.off .hbpal,.hbdock.off .hbok{opacity:.38;pointer-events:none}
.hbrow{display:flex;align-items:center;gap:8px}
.hbslots{flex:1;display:flex;justify-content:center;gap:var(--hbg,8px);min-width:0;padding:6px 8px;border-radius:16px;background:rgba(4,7,26,.55);box-shadow:inset 0 2px 6px rgba(0,0,0,.6),inset 0 0 0 1px rgba(140,170,255,.18)}
.hbslot{width:var(--hbs,54px);height:var(--hbs,54px);touch-action:none;flex:none;border-radius:50%;border:0;padding:0;background:radial-gradient(circle at 50% 38%,#02030c 0 55%,#1a2560 86%,rgba(140,170,255,.25) 100%);box-shadow:inset 0 0 0 1.5px rgba(150,180,255,.35);cursor:pointer;display:grid;place-items:center}
.hbslot.cur{box-shadow:inset 0 0 0 2px #7df3d2,0 0 12px -2px #7df3d2}
.hbslot svg{width:var(--hbs,54px);height:var(--hbs,54px);display:block;pointer-events:none}.hbslot.lift svg{opacity:.3}.hbslot.drop{box-shadow:inset 0 0 0 2px #fff,0 0 14px -2px #a6e81f}.hbpal button{touch-action:none}.hbghost{position:fixed;left:0;top:0;z-index:200;width:56px;height:56px;pointer-events:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))}.hbghost svg{width:56px;height:56px;display:block}
.hbok{flex:none;width:84px;height:56px;border-radius:16px;border:1px solid #c9fff0;background:linear-gradient(180deg,#a4ffe6,#3fd3ac);color:#05302a;font:900 20px/1 "Outfit",system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 0 #1f8c72,0 0 18px -4px #7df3d2;white-space:nowrap}
.hbok:disabled{background:linear-gradient(180deg,#3a4478,#262d5c);border-color:rgba(140,170,255,.35);color:rgba(220,228,255,.55);box-shadow:0 4px 0 #161b3e;cursor:default}
.hbpal{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 10px;margin-top:10px}
.hbpal button{width:48px;height:48px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;transition:transform .12s,opacity .2s;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
.hbpal button svg{width:48px;height:48px;display:block}
.hbpal button:active{transform:scale(.9)}
.hbpal button.used{opacity:.28}
.hbpal.ten button{width:44px;height:44px}.hbpal.ten button svg{width:44px;height:44px}
.hbpal .kb{position:absolute;opacity:0}
#bvPz.hbdy{display:flex!important;flex-direction:column;gap:10px;align-items:stretch}#bvPz.hbdy[hidden]{display:none!important}.hbdy .hbd{width:100%;display:flex;align-items:center;gap:10px;justify-content:flex-start;white-space:nowrap}.hbdy .hbd small{margin-left:auto;font-size:13px;opacity:.8}
@media (max-width:420px){.hbpal button,.hbpal button svg{width:42px;height:42px}.hbpal.ten button,.hbpal.ten button svg{width:40px;height:40px}.hbok{width:72px;height:52px;font-size:18px}.hbdock{padding:8px 10px 10px}}`;
    document.head.appendChild(s);
  }
  // a gem as an SVG (the dock): the same picture as on the 3D gem
  function gemSvg(kind, v, id) {
    const H = window.Table3D && Table3D.hitblow, col = kind === 'num' ? H.DIGIT[v] : H.COLORS[v], mix = H.mix;
    const g = `<defs><radialGradient id="${id}" cx=".42" cy=".36" r=".62"><stop offset="0" stop-color="${mix(col, '#ffffff', .55)}"/><stop offset=".4" stop-color="${col}"/><stop offset=".88" stop-color="${mix(col, '#050817', .55)}"/><stop offset="1" stop-color="${mix(col, '#050817', .75)}"/></radialGradient></defs>`;
    const inner = kind === 'num' ? `<text x="24" y="25" text-anchor="middle" dominant-baseline="central" font-family="Outfit,system-ui,sans-serif" font-weight="800" font-size="30" fill="#fff" style="filter:drop-shadow(0 0 2px rgba(255,255,255,.8))">${v}</text>`
      : `<g transform="translate(8.6 8.4) scale(1.28)">${H.STROKE[v] ? `<path d="${H.ICONS[v]}" fill="rgba(255,255,255,.3)" stroke="#fff" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>` : `<path d="${H.ICONS[v]}" fill="#fff"/>`}</g>`;
    return `<svg viewBox="0 0 48 48">${g}<circle cx="24" cy="24" r="21" fill="url(#${id})"/><circle cx="24" cy="24" r="19.5" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1"/>${inner}<ellipse cx="14" cy="11" rx="5" ry="2.4" fill="rgba(255,255,255,.5)" transform="rotate(-25 14 11)"/></svg>`;
  }

  function levelInfo(n, lang) { const b = n <= 5 ? 0 : n <= 11 ? 1 : n <= 17 ? 2 : 3; return { name: 'Lv.' + n, desc: tx(lang, 'lv')[b], who: tx(lang, 'who')[b] }; }
  const sizeName = (z, l) => tx(l, RN(z));
  const optInfo = (sid, v, l) => sid === 'bvSize' ? { sub: tx(l, RN(+v || 1) + 'd') } : null;

  /* ---------- a game on the table ---------- */
  function start(ctx) {
    css();
    const E = window.HitBlowEngine, T3 = ctx.Table3D, H = T3.hitblow, TH = window.THREE, lang = ctx.lang, t = (k, v) => tx(lang, k, v);
    const mode = ctx.mode === 'daily' || ctx.mode === 'puzzle' ? 'daily' : ctx.mode === 'pvp' ? 'pvp' : ctx.mode === 'rated' ? 'rated' : 'ai';
    const AD = window.Atlas3D.hitblow, which = mode === 'daily' ? (AD.pending === 'hard' ? 'hard' : 'easy') : null; AD.pending = null;
    const P = which ? E.makeDaily(today(), which) : null;
    const z = P ? P.z : E.RULE_IDS.includes(+ctx.size) ? +ctx.size : 1;
    const cfg = Object.assign({}, E.rule(z)); if (P) cfg.rows = P.clues.length + P.limit;
    const kind = cfg.kind, level = Math.max(1, Math.min(20, ctx.level || 1));
    const pvp = mode === 'pvp', vsAI = mode === 'ai' || mode === 'rated';
    // seats: 0 = the left pill (you / player 1), 1 = the right pill (the AI / player 2); who guesses first
    let turn = P ? 0 : pvp ? 0 : (ctx.side === 2 ? 1 : 0);
    const first = turn;
    const secret = P ? P.secret.slice() : E.randomCode(cfg, Math.random);
    const board = H.board(cfg), U = board.userData, TOP = U.top, R = H.R;
    const hist = [];          // { g, h, b, by } — by: 0 / 1 (the seats), 2 = a clue of the daily puzzle
    const rowObjs = [];       // per row: { gems: [], pins: [] }
    let input = [], cur = 0, over = false, busy = true, stopped = false, hintT = 0, ply = 0, hinted = false;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const ease = k => 1 - Math.pow(1 - k, 3), back = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
    const name = s => pvp ? t(s ? 'p2' : 'p1') : s === 0 ? t('you') : t('ai') + ' Lv.' + level;
    const row = () => hist.length;
    const left = () => cfg.rows - hist.length;

    /* the board on the table, framed whole from the player's side */
    T3.show('hitblow', board);
    // straight down, without perspective (2026-11-16 user: パースをつけない — adapter.ortho, atlas/app.js Table3D.play(true, { ortho }))
    const frame = () => { if (!T3.fit) return; T3.fit({ w: U.W + .2, d: U.L - .1, y: TOP + .25, pitch: 1.5703 }); };
    frame();
    // the hidden code waits in the case (under the lid)
    const caseGems = secret.map((v, k) => { const m = H.gem(kind, v), [x, y, zz] = U.caseSlot(k); m.position.set(x, y, zz); board.add(m); return m; });

    /* ---------- the dock ---------- */
    const bv = document.getElementById('bv') || document.body;
    const dock = document.createElement('div'); dock.className = 'hbdock';
    const C = cfg.c, uid = 'hbg' + Math.random().toString(36).slice(2, 7);
    dock.innerHTML = `<div class="hbrow"><div class="hbslots">${Array.from({ length: cfg.n }, (_, k) => `<button type="button" class="hbslot" data-k="${k}" aria-label="${k + 1}"></button>`).join('')}</div><button type="button" class="hbok" disabled>OK</button></div>`
      + `<div class="hbpal${C > 8 ? ' ten' : ''}">${Array.from({ length: C }, (_, v) => `<button type="button" data-v="${v}" aria-label="${kind === 'num' ? v : v + 1}">${gemSvg(kind, v, uid + v)}</button>`).join('')}</div>`;
    if (C > 8) dock.querySelector('.hbpal').style.cssText = 'max-width:300px;margin-left:auto;margin-right:auto';
    bv.appendChild(dock);
    const slotEls = [...dock.querySelectorAll('.hbslot')], okEl = dock.querySelector('.hbok'), palEls = [...dock.querySelectorAll('.hbpal button')];
    let dockH = 0;
    // the slots of the dock are the size of the board's holes on the screen (2026-11-16 user), spaced like them
    function sizeSlots() {
      try {
        const P = k => { const [x, zz] = U.slot(Math.max(0, row()), k), v = T3.project(x, zz, TOP); return [v.x, v.y]; };
        const a = P(0), b = P(1), pitch = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(pitch > 4)) return;
        const room = Math.min(560, innerWidth - 16) - 24 - 96 - 16;   // (the dock's width less its padding, OK and the slot tray's padding)
        let hole = pitch * U.sock * 2, gap = pitch - hole;
        const k = Math.min(1, room / (cfg.n * hole + (cfg.n - 1) * gap)); hole *= k; gap *= k;
        hole = Math.max(34, Math.min(84, hole)); gap = Math.max(4, Math.min(24, gap));
        dock.style.setProperty('--hbs', hole.toFixed(1) + 'px'); dock.style.setProperty('--hbg', gap.toFixed(1) + 'px');
      } catch (e) {}
    }
    function placeDock() {
      if (stopped) return;
      sizeSlots();
      const r = dock.getBoundingClientRect(), h = r.height ? Math.round(innerHeight - r.top + 6) : 0;
      document.documentElement.style.setProperty('--hbdock', Math.round(innerHeight - r.top) + 'px');
      if (h !== dockH) { dockH = h; try { dispatchEvent(new Event('resize')); } catch (e) {} }
    }
    const onResize = () => { frame(); requestAnimationFrame(placeDock); };
    addEventListener('resize', onResize);
    const myTurn = () => !over && !busy && (pvp || mode === 'daily' || turn === 0);
    // the row being made: a slot per gem (null = empty) and the cursor (2026-11-16 user: tap a slot to put there · drag to move / swap)
    const blank = () => Array(cfg.n).fill(null), count = () => input.filter(v => v != null).length, full = () => count() === cfg.n;
    input = blank();
    const nextFree = k => { for (let i = 0; i < cfg.n; i++) { const j = (k + i) % cfg.n; if (input[j] == null) return j; } return k; };
    function paintDock() {
      const can = myTurn();
      dock.classList.toggle('off', !can);
      slotEls.forEach((el, k) => { const v = input[k]; el.innerHTML = v == null ? '' : gemSvg(kind, v, uid + 's' + k); el.classList.toggle('cur', can && k === cur); el.classList.toggle('has', v != null); });
      okEl.disabled = !can || !full();
      palEls.forEach((b, v) => b.classList.toggle('used', !cfg.rep && input.includes(v)));
    }

    /* ---------- the row being made, on the board ---------- */
    const pending = [];   // the gems of the input on the board (row = row())
    function dropGem(r, k, v, quiet) {
      const m = H.gem(kind, v), [x, zz] = U.slot(r, k), y1 = TOP - R * .12; m.position.set(x, y1 + 1.4, zz); board.add(m);
      anim(260, q => { const e = q < .75 ? Math.pow(q / .75, 2) : 1; m.position.y = y1 + 1.4 * (1 - e) + (q > .75 ? Math.sin((q - .75) / .25 * Math.PI) * .07 : 0); });
      if (!quiet) later(() => SFX.clink(), 190);
      return m;
    }
    function liftGem(m) { anim(180, q => { m.position.y += .05; m.scale.setScalar(1 - q * .8); }, () => board.remove(m)); }
    function syncPending() {
      for (let k = 0; k < cfg.n; k++) {
        const v = input[k], m = pending[k];
        if (m && (v == null || m.userData.v !== v)) { liftGem(m); pending[k] = null; }
        if (v != null && !pending[k]) pending[k] = dropGem(row(), k, v);
      }
      kick(200);
    }
    // put a gem at slot k (the cursor by default); in カラー a gem already in the row moves there instead of being refused
    function put(v, at) {
      if (!myTurn()) return;
      let k = at == null ? cur : at;
      if (at == null && input[k] != null && full() && !picked) { SFX.nope(); return; }
      if (!cfg.rep) { const j = input.indexOf(v); if (j >= 0 && j !== k) { if (at == null) { SFX.nope(); toast(t('noDup', { k: t(kind === 'num' ? 'digit' : 'color') })); return; } input[j] = null; } }
      input[k] = v; cur = nextFree(k + 1); picked = false; syncPending(); paintDock(); hintClear();
    }
    function take(k) { if (!myTurn() || input[k] == null) return; input[k] = null; cur = k; syncPending(); SFX.lift(); paintDock(); }
    function move(a, b) {   // drag a gem from slot a to b: swap (or move into an empty one)
      if (!myTurn() || a === b || input[a] == null) return;
      const t0 = input[b]; input[b] = input[a]; input[a] = t0; cur = nextFree(cur); if (input[cur] != null) cur = b;
      syncPending(); SFX.lift(); paintDock(); hintClear();
    }
    function tapSlot(k) { if (!myTurn()) return; if (k === cur && input[k] != null) return take(k); cur = k; picked = true; try { SFX.tap && SFX.tap(); } catch (e) {} paintDock(); }
    // drag: a gem of a slot (move / swap · dropped off the slots = out) or of the palette (onto a slot)
    let drag = null, skipClick = false, picked = false;
    const slotAt = (x, y) => { for (let k = 0; k < cfg.n; k++) { const r = slotEls[k].getBoundingClientRect(), m = 6; if (x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m) return k; } return -1; };
    dock.addEventListener('pointerdown', e => {
      const b = e.target.closest('.hbslot, .hbpal button'); if (!b || !myTurn() || e.button > 0) return;
      const from = b.classList.contains('hbslot') ? { k: +b.dataset.k } : { v: +b.dataset.v };
      if (from.k != null && input[from.k] == null) return;
      drag = { from, x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null, over: -1 };
    });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.ghost) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
        const v = drag.from.k != null ? input[drag.from.k] : drag.from.v; if (v == null) { drag = null; return; }
        const gh = document.createElement('div'); gh.className = 'hbghost'; gh.innerHTML = gemSvg(kind, v, uid + 'gh'); document.body.appendChild(gh); drag.ghost = gh;
        if (drag.from.k != null) slotEls[drag.from.k].classList.add('lift');
      }
      e.preventDefault();
      drag.ghost.style.transform = `translate(${e.clientX - 28}px,${e.clientY - 28}px)`;
      const o = slotAt(e.clientX, e.clientY); if (o !== drag.over) { slotEls.forEach((el, k) => el.classList.toggle('drop', k === o)); drag.over = o; }
    }, { passive: false });
    const endDrag = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null; if (!d.ghost) return;
      d.ghost.remove(); slotEls.forEach(el => el.classList.remove('drop', 'lift')); skipClick = true; setTimeout(() => { skipClick = false; }, 0);
      const o = e ? slotAt(e.clientX, e.clientY) : -1;
      if (d.from.k != null) { if (o >= 0) move(d.from.k, o); else take(d.from.k); }
      else if (o >= 0) put(d.from.v, o);
    };
    addEventListener('pointerup', endDrag); addEventListener('pointercancel', () => endDrag(null));
    dock.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (skipClick) return;
      if (b.classList.contains('hbok')) return submit();
      if (b.classList.contains('hbslot')) return tapSlot(+b.dataset.k);
      if (b.dataset.v != null) return put(+b.dataset.v);
    });
    function onKey(e) {
      if (stopped || e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.key === 'Enter') { if (!okEl.disabled) { e.preventDefault(); submit(); } return; }
      if (e.key === 'Backspace') { const k = input[cur] != null ? cur : input.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop(); if (k != null && k >= 0) { e.preventDefault(); take(k); } return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); cur = (cur + (e.key === 'ArrowLeft' ? cfg.n - 1 : 1)) % cfg.n; paintDock(); return; }
      if (/^[0-9]$/.test(e.key)) { const d = +e.key, v = kind === 'num' ? d : d - 1; if (v >= 0 && v < C) { e.preventDefault(); put(v); } }
    }
    addEventListener('keydown', onKey);
    // a tap on a gem of the row being made (on the board) takes it out
    function onClick(e) {
      if (!myTurn() || (T3.wasDrag && T3.wasDrag())) return;
      // (on the screen: the flat top view blends the projection, which Table3D.pick's ray does not follow — Table3D.project does)
      const P = k => { const [x, zz] = U.slot(row(), k), v = T3.project(x, zz, TOP + .1); return [v.x, v.y]; };
      const a = P(0), b = P(Math.min(1, cfg.n - 1)), rad = Math.max(12, Math.hypot(b[0] - a[0], b[1] - a[1]) * .48);
      for (let k = 0; k < cfg.n; k++) { const q = P(k); if (Math.hypot(e.clientX - q[0], e.clientY - q[1]) < rad) { take(k); return; } }
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- answering a row ---------- */
    function pinsFor(r, h, b, d0) {
      const out = []; let k = 0;
      const add = (hit, i) => { const m = H.pin(hit), [x, zz] = U.pinPos(r, k++); m.position.set(x, TOP + .03, zz); m.scale.setScalar(.001); board.add(m); out.push(m);
        later(() => { (hit ? SFX.hit : SFX.blow)(0); anim(220, q => m.scale.setScalar(Math.max(.001, back(q)))); }, d0 + i * 150); };
      for (let i = 0; i < h; i++) add(true, i);
      for (let i = 0; i < b; i++) add(false, h + i);
      return out;
    }
    function commit(g, by, done, fast) {
      const r = row(), f = E.feedback(secret, g);
      hist.push({ g: g.slice(), h: f.h, b: f.b, by }); ply++;
      U.rowMark(r, by);
      const gems = pending.slice(0, cfg.n); pending.length = 0; input = blank(); cur = 0;
      const pins = pinsFor(r, f.h, f.b, fast ? 60 : 260);
      rowObjs[r] = { gems, pins };
      const wait = (fast ? 60 : 260) + (f.h + f.b) * 150 + (fast ? 80 : 320);
      later(() => done(f), wait);
    }
    // the AI (or a clue) puts a whole row in, one gem after another
    function placeRow(g, gap, done) {
      g.forEach((v, k) => later(() => { input[k] = v; pending[k] = dropGem(row(), k, v); }, k * gap));
      later(done, g.length * gap + 120);
    }

    /* ---------- the flow ---------- */
    function hud(msg) {
      if (mode === 'daily') { ctx.hud(`<span class="hs on"><i class="dk" style="background:#7df3d2"></i>${which.toUpperCase()}</span><span class="hm">${msg || ''}</span><span class="hs"><i class="dk" style="background:#8f98c8"></i>${t('left', { n: Math.max(0, cfg.rows - hist.length) })}</span>`); return; }
      const pill = s => `<span class="hs ${turn === s && !over ? 'on' : ''}"><i class="dk" style="background:${s ? '#ff7ac8' : '#7df3d2'}"></i>${esc(name(s))}</span>`;
      ctx.hud(`${pill(0)}<span class="hm">${msg || ''}</span>${pill(1)}`);
    }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const status = () => over ? '' : mode === 'daily' ? t('yourTurn', { n: cfg.n }) : pvp ? t('pTurn', { p: name(turn) }) : turn === 0 ? t('yourTurn', { n: cfg.n }) : t('aiTurn');
    const onTurn = () => { if (ctx.onTurn) ctx.onTurn(over ? -1 : mode === 'daily' ? 0 : turn, { human: pvp || mode === 'daily' || turn === 0, ply }); };
    function next() {
      if (stopped || over) return;
      U.active(row()); hud(status()); onTurn(); kick(200);
      if (vsAI && turn === 1) { busy = true; paintDock(); later(aiMove, 650); return; }
      busy = false; paintDock();
    }
    function aiMove() {
      let g = E.aiRace(cfg, hist.map(x => ({ g: x.g, h: x.h, b: x.b })), level, Math.random);
      // never the same row twice (a forgetful level could repeat an earlier guess)
      if (hist.some(x => x.g.join() === g.join())) { const cs = E.candsOf(cfg, hist); g = E.codeOf(cfg, cs[Math.floor(Math.random() * cs.length)]); }
      placeRow(g, 230, () => commit(g, 1, after));
    }
    function submit() {
      if (!myTurn() || !full()) { if (myTurn()) toast(t('need', { n: cfg.n })); return; }
      if (hist.some(x => x.g.join() === input.join())) { SFX.nope(); toast(t('tried')); return; }
      busy = true; paintDock(); SFX.ok(); hintClear();
      commit(input.slice(), mode === 'daily' ? 0 : turn, after);
    }
    function after(f) {
      if (stopped) return;
      if (f.h === cfg.n) return finish(mode === 'daily' ? 0 : turn);
      if (hist.length >= cfg.rows) return finish(-1);
      if (mode !== 'daily') turn ^= 1;
      next();
    }

    /* the case: shaken and locked at the start, opened at the end */
    function shakeCase(done) {
      SFX.rattle();
      const lid = U.lid, x0 = lid.position.x;
      anim(560, q => { const s = Math.sin(q * Math.PI * 9) * (1 - q) * .05; lid.position.x = x0 + s; lid.rotation.x = -Math.max(0, Math.sin(q * Math.PI)) * .18 * (1 - q); caseGems.forEach((m, k) => { m.position.y = U.caseSlot(k)[1] + Math.abs(Math.sin(q * Math.PI * 7 + k)) * .05 * (1 - q); }); },
        () => { lid.position.x = x0; lid.rotation.x = 0; if (done) done(); });
    }
    function openCase() {
      SFX.open();
      anim(900, q => { U.lid.rotation.x = -1.95 * ease(q); });
      caseGems.forEach((m, k) => later(() => anim(380, q => { m.position.y = U.caseSlot(k)[1] + Math.sin(q * Math.PI) * .45; m.rotation.y = q * Math.PI * 2; }), 500 + k * 120));
    }

    function finish(w, why) {   // w: the winning seat, -1 = nobody
      if (over) return; over = true; busy = true; U.active(null); paintDock(); hintClear();
      if (ctx.onTurn) ctx.onTurn(-1);
      if (w >= 0 && why !== 'resign') toast(t('allHit'));
      later(openCase, why === 'resign' ? 100 : 700);
      const rows = hist.filter(x => x.by !== 2).length;
      hud(w >= 0 && why !== 'resign' ? t('solvedRow', { n: hist.length }) : why === 'resign' ? '' : t('none'));
      later(() => {
        if (mode === 'daily') {
          const win = w === 0 && why !== 'resign', o = dread(), d = today();
          o[which] = o[which] || {}; if (win || !o[which][d]) o[which][d] = { n: rows, win, limit: P.limit };
          { const ks = Object.keys(o[which]).sort(); while (ks.length > 90) delete o[which][ks.shift()]; }   // (the recent days only)
          try { localStorage.setItem(DKEY, JSON.stringify(o)); } catch (e) {}
          if (win) {   // the portal's daily record (shared/atlas.js READ: days · streak · best — the same shape as the other games')
            let D = {}; try { D = JSON.parse(localStorage.getItem('aicoding-hitblow-daily') || '{}') || {}; } catch (e) {}
            D.days = D.days || {};
            if (!D.days[d]) { D.streak = D.last === E.dayBefore(d) ? (D.streak || 0) + 1 : D.last === d ? D.streak || 1 : 1; D.days[d] = 1; D.last = d; D.best = Math.max(D.best || 0, D.streak); }
            try { localStorage.setItem('aicoding-hitblow-daily', JSON.stringify(D)); } catch (e) {}
          }
          ctx.onEnd({ solo: true, win, draw: false, level: 0, title: (which === 'hard' ? 'HARD ' : 'EASY ') + t(win ? 'dWin' : 'dLose'), score: win ? t('dRes', { n: rows, p: P.par }) : t('dFail', { n: P.limit }), best: kind === 'num' ? t('ans') + ' ' + secret.join('') : '', opp: t('daily') + ' ' + which.toUpperCase(), key: 'daily-' + which, why: win ? 'win' : why || 'out' });
          return;
        }
        const draw = w < 0, win = !pvp && w === 0;
        ctx.onEnd({ win, draw, level, pvp, score: draw ? t('none') : why === 'resign' ? '' : t('solvedRow', { n: hist.length }), winnerText: pvp && !draw ? t('pWin', { p: name(w) }) : '', why });
      }, why === 'resign' ? 1300 : 2300);
    }

    /* the hint: the race search (the daily puzzle: the solver's guess) fills the row */
    let hintGems = [];
    function hintClear() { clearTimeout(hintT); hintGems = []; }
    function hint() {
      if (!myTurn()) return Promise.resolve(false);
      const cands = E.candsOf(cfg, hist); if (!cands.length) return Promise.resolve(false);
      const g = mode === 'daily' ? E.bestGuess(cfg, cands, { rand: Math.random, full: false }).guess : E.raceBest(cfg, cands, Math.random);
      hinted = true;
      input = blank(); cur = 0; pending.forEach(m => { if (m) liftGem(m); }); pending.length = 0;
      g.forEach((v, k) => later(() => { if (over) return; input[k] = v; syncPending(); paintDock(); }, k * 140));
      toast(t('hint'));
      return Promise.resolve(true);
    }

    let toastEl = null, toastTm = 0;
    function toast(msg) { if (toastEl) toastEl.remove(); clearTimeout(toastTm); toastEl = document.createElement('div'); toastEl.className = 'hbtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl); const el = toastEl; toastTm = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 1900); }

    /* the start: the case is shaken and locked; a daily puzzle lays its clue rows down first */
    hud(''); paintDock();
    requestAnimationFrame(() => { dock.classList.add('on'); placeDock(); later(placeDock, 400); later(placeDock, 1200); });
    later(() => shakeCase(() => {
      if (P) {
        let i = 0;
        const clue = () => { if (stopped) return; if (i >= P.clues.length) { next(); return; } const c = P.clues[i++]; placeRow(c.g, 120, () => commit(c.g, 2, () => clue(), true)); };
        clue();
      } else next();
    }), 450);

    const dbg = { secret: () => secret.slice(), hist: () => hist.map(x => Object.assign({}, x)), cfg: () => Object.assign({}, cfg), turn: () => turn, busy: () => busy, over: () => over, input: () => input.filter(v => v != null), slots: () => input.slice(), cur: () => cur, put, take, submit, puzzle: () => P, U };
    window.Atlas3D.hitblow._dbg = dbg;
    return {
      get human() { return 0; },
      inset: () => dockH,
      undo() {}, canUndo: () => false,
      hint, canHint: () => myTurn() && mode !== 'rated',
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? turn ^ 1 : mode === 'daily' ? -1 : 1, 'resign'); },
      timeout(s) { if (!over) finish(s ^ 1, 'time'); },
      stop() {
        stopped = true; timers.forEach(clearTimeout); clearTimeout(toastTm); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); removeEventListener('keydown', onKey); removeEventListener('pointerup', endDrag); if (drag && drag.ghost) drag.ghost.remove(); removeEventListener('resize', onResize);
        dock.remove(); document.documentElement.style.removeProperty('--hbdock');
        if (window.Atlas3D.hitblow._dbg === dbg) delete window.Atlas3D.hitblow._dbg;
      },
      _debug: dbg,
    };
  }

  /* ---------- the card: 今日の一問 (EASY / HARD) on its own tab ---------- */
  const modeName = (m, lang) => m === 'daily' ? tx(lang, 'daily') : null;
  const dailyNext = () => !dailyDone('easy') ? 'easy' : !dailyDone('hard') ? 'hard' : 'easy';   // (あそぶ in the パズル tab: today's first unsolved one)
  const modeNote = (m, lang) => m === 'daily' ? tx(lang, 'dailyNote') : null;
  // the daily tab's two buttons (atlas/app.js: #bvDaily; a click sets pending and starts)
  function dailyHtml(lang) {
    const E = window.HitBlowEngine; const lim = k => { try { const P = E && E.makeDaily(today(), k); return P ? P.limit : '?'; } catch (e) { return '?'; } };
    return ['easy', 'hard'].map(k => `<button type="button" class="mxb pzd hbd${dailyDone(k) ? ' pzok' : ''}" data-daily="${k}"><span>${tx(lang, 'daily')}</span><em class="ez">${k.toUpperCase()}</em><small>${tx(lang, k, { n: lim(k) })}</small></button>`).join('');
  }
  css();   // (the card's 今日の一問 buttons are styled before a game starts)
  window.Atlas3D = window.Atlas3D || {};
  // the card (2026-11-16 user: 将棋と同じカード): 対戦 (二人で対戦 = the top of 相手) · レート戦 · パズル (今日の一問 EASY / HARD) — adapter.mx
  window.Atlas3D.hitblow = { ortho: true, mx: true, levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], kindFirst: true,
    sizes: [1, 2, 3, 4, 5], size0: 1, sizeLabel: () => '', sizeName, optInfo, levelInfo, modeName, modeNote, dailyHtml, dailyDone, dailyNext, pending: null, start, TX, L14 };
})();
