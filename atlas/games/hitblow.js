/* =====================================================================
   ヒット＆ブロー on the portal's 3D table (2026-11-16, user: 3Dのゲームとして実装 · 2Dは廃止 · ミッドナイトベース).
   · One shared board, one hidden code: the players take turns guessing it (the rows alternate, every row and its answer is
     seen by both). The first to get all hits wins; when the rows run out, a draw. (As in the popular online Hit & Blow apps.)
   · Modes (the card's tabs): AI戦 · レート戦 (atlas/app.js RTG, own record) · 対人 (two players, one device) · 今日の一問
     (EASY / HARD: a puzzle of the day — clue rows already on the board, crack the code within the limit; ../hitblow/engine.js
     makeDaily). 種目 (adapter sizes 1..5 = HitBlowEngine.RULES): カラー · カラー（重複あり）· ナンバー3 · ナンバー4 · エキスパート.
   · Input: the tray joined to the board in 3D (model tray(): the row being made + OK, the palette) — tap a gem to put it in the
     chosen slot, tap a slot to choose it (again: take it out), drag to move / swap / take out; on PCs also the keys.
   · The answer pins: ヒット = yellow-green, ブロー = white, 2×2 beside each row. The hidden code waits in a jewel case at the
     far end of the board (lid marked ？), shaken and locked at the start, opened at the end.
   · The board: atlas/models/hitblow.js (Table3D.hitblow). Rendering on demand (animations kick Table3D).
   ===================================================================== */
(function () {
  'use strict';
  const L14 = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // texts (14 languages; {n} etc. are filled in)
  const TX = {
    ja: { chs: ["探偵事務所", "郵便局", "図書館", "時計台", "宝石の市場", "暗号の館", "計算機室", "灯台の港", "天文台", "星の金庫"], map: "ステージマップ", stg: "ステージ {s}", lock: "前の章を{n}ステージクリアで解放", nextGift: "次のアトラモまで あと{n}ステージ", got: "アトラモ「{name}」をゲット！", allGot: "ステージのアトラモをぜんぶ集めた！", clr: "{a}/{b} クリア", dress: "きせかえで使えるよ", book: "問題集", list: "問題一覧", tgf: "はじめての推理", tg1: "入門", tgx: "ぴったり", c1: "答えはもう1つに決まる", cn: "答えの候補 {a}〜{b}通り", nx: "次の問題", again: "もう一度", within: "{n}回以内", prog: "{a}/{b}問クリア", stars: "★ {a}/{b}", cont: "続きから", bkNote: "手がかりの行から答えを推理する問題が10コース・500問。", rate: '勝率', r1: 'カラー', r1d: '6色から4つ。同じ色は使わない。', r2: 'カラー（重複あり）', r2d: '6色から4つ。同じ色を何度でも使える。', r3: 'ナンバー3', r3d: '0〜9の数字を3つ。同じ数字は使わない。', r4: 'ナンバー4', r4d: '0〜9の数字を4つ。同じ数字は使わない。', r5: 'エキスパート', r5d: '8色から5つ。同じ色を何度でも使える。',
      daily: '今日の一問', dailyNote: '手がかりの行がすでに盤に。決められた回数以内に答えを当てよう。毎日かわる2問。', easy: 'カラー・{n}回以内', hard: 'ナンバー4・{n}回以内',
      you: 'あなた', ai: 'AI', p1: 'プレイヤー1', p2: 'プレイヤー2', clue: '手がかり',
      yourTurn: 'あなたの番：{n}つ並べてOK', aiTurn: 'AIが考えています…', pTurn: '{p}の番', left: 'あと{n}回',
      need: '{n}つ並べてね', noDup: '同じ{k}は使えません', color: '色', digit: '数字', tried: 'その組み合わせはもう出ています',
      allHit: 'ぜんぶヒット！', hint: 'これが有力', solvedRow: '{n}行目で正解', none: '時間切れ：だれも当てられず', ans: '答え',
      pWin: '{p}の勝ち', dWin: 'クリア！', dLose: '回数切れ…', dRes: '{n}回で正解（目安 {p}回）', dFail: '{n}回以内に当てられませんでした',
      lv: ['うっかり屋：前の答えをよく忘れる', '見習い：ときどき手がかりを見落とす', '推理好き：手がかりどおりに当てる', '名探偵：相手に手がかりを渡さない当て方'], who: ['はじめての人に', 'ルールに慣れたら', '推理に自信があれば', '腕試しに'] },
    en: { chs: ["Detective Office", "Post Office", "Library", "Clock Tower", "Gem Bazaar", "Cipher Manor", "Computer Room", "Lighthouse Harbour", "Observatory", "Star Vault"], map: "Stage map", stg: "Stage {s}", lock: "Clear {n} stages of the previous chapter to open", nextGift: "{n} more stages to the next Atlamo", got: "You got “{name}”!", allGot: "All the stage Atlamo collected!", clr: "{a}/{b} cleared", dress: "Wear it in Dress-up", book: "Puzzle book", list: "All puzzles", tgf: "First steps", tg1: "Intro", tgx: "Exact", c1: "Only one answer fits", cn: "{a}–{b} possible answers", nx: "Next puzzle", again: "Retry", within: "within {n}", prog: "{a}/{b} solved", stars: "★ {a}/{b}", cont: "Continue", bkNote: "500 puzzles in 10 courses: work out the code from the clue rows.", rate: 'Win rate', r1: 'Colour', r1d: '4 of 6 colours, all different.', r2: 'Colour (repeats)', r2d: '4 of 6 colours; a colour may repeat.', r3: 'Number 3', r3d: '3 different digits, 0–9.', r4: 'Number 4', r4d: '4 different digits, 0–9.', r5: 'Expert', r5d: '5 of 8 colours; colours may repeat.',
      daily: 'Daily puzzle', dailyNote: 'Clue rows are already on the board. Crack the code within the limit. Two new puzzles every day.', easy: 'Colour · within {n}', hard: 'Number 4 · within {n}',
      you: 'You', ai: 'AI', p1: 'Player 1', p2: 'Player 2', clue: 'Clue',
      yourTurn: 'Your turn: place {n}, then OK', aiTurn: 'The AI is thinking…', pTurn: "{p}'s turn", left: '{n} left',
      need: 'Place {n} first', noDup: 'No repeated {k}s', color: 'colour', digit: 'digit', tried: 'That guess is already on the board',
      allHit: 'All hits!', hint: 'A strong guess', solvedRow: 'Cracked on row {n}', none: 'Out of rows: nobody cracked it', ans: 'Answer',
      pWin: '{p} wins', dWin: 'Solved!', dLose: 'Out of guesses…', dRes: 'Solved in {n} (par {p})', dFail: 'Not solved within {n}',
      lv: ['Forgetful: often forgets earlier answers', 'Apprentice: sometimes misses a clue', 'Sleuth: guesses by the clues', 'Master: guesses that give the rival little'], who: ['For first games', 'Once you know the rules', 'If you trust your logic', 'For a real test'] },
    zh: { chs: ["侦探事务所", "邮局", "图书馆", "钟楼", "宝石市集", "密码公馆", "计算机室", "灯塔港", "天文台", "星之金库"], map: "关卡地图", stg: "第 {s} 关", lock: "上一章通关{n}关后开放", nextGift: "距离下个 Atlamo 还有{n}关", got: "获得了「{name}」！", allGot: "关卡的 Atlamo 全部收集完毕！", clr: "{a}/{b} 通关", dress: "可在换装中使用", book: "题库", list: "题目一览", tgf: "初次推理", tg1: "入门", tgx: "刚好", c1: "答案已只剩1种", cn: "答案候选 {a}〜{b} 种", nx: "下一题", again: "再来一次", within: "{n}次以内", prog: "已解 {a}/{b}", stars: "★ {a}/{b}", cont: "继续", bkNote: "根据提示行推理答案，10个课程共500题。", rate: '胜率', r1: '颜色', r1d: '6色中选4个，颜色不重复。', r2: '颜色（可重复）', r2d: '6色中选4个，颜色可重复。', r3: '数字3', r3d: '0〜9中3个不同数字。', r4: '数字4', r4d: '0〜9中4个不同数字。', r5: '专家', r5d: '8色中选5个，颜色可重复。',
      daily: '每日一题', dailyNote: '盘上已有提示行。在限定次数内猜出答案。每天两题。', easy: '颜色・{n}次以内', hard: '数字4・{n}次以内',
      you: '你', ai: 'AI', p1: '玩家1', p2: '玩家2', clue: '提示',
      yourTurn: '你的回合：放好{n}个后按OK', aiTurn: 'AI思考中…', pTurn: '{p}的回合', left: '还剩{n}次',
      need: '请先放{n}个', noDup: '{k}不能重复', color: '颜色', digit: '数字', tried: '这个组合已经出现过',
      allHit: '全部命中！', hint: '推荐这一手', solvedRow: '第{n}行猜中', none: '行数用完：无人猜中', ans: '答案',
      pWin: '{p}获胜', dWin: '解开了！', dLose: '次数用完…', dRes: '{n}次猜中（标准{p}次）', dFail: '{n}次内未能猜中',
      lv: ['粗心：常忘记之前的结果', '学徒：偶尔漏看提示', '推理家：按提示来猜', '名侦探：少给对手线索'], who: ['适合初次', '熟悉规则后', '对推理有自信', '实力挑战'] },
    'zh-TW': { chs: ["偵探事務所", "郵局", "圖書館", "鐘樓", "寶石市集", "密碼公館", "計算機室", "燈塔港", "天文台", "星之金庫"], map: "關卡地圖", stg: "第 {s} 關", lock: "上一章通關{n}關後開放", nextGift: "距離下個 Atlamo 還有{n}關", got: "獲得了「{name}」！", allGot: "關卡的 Atlamo 全部收集完畢！", clr: "{a}/{b} 通關", dress: "可在換裝中使用", book: "題庫", list: "題目一覽", tgf: "初次推理", tg1: "入門", tgx: "剛好", c1: "答案已只剩1種", cn: "答案候選 {a}〜{b} 種", nx: "下一題", again: "再來一次", within: "{n}次以內", prog: "已解 {a}/{b}", stars: "★ {a}/{b}", cont: "繼續", bkNote: "根據提示行推理答案，10個課程共500題。", rate: '勝率', r1: '顏色', r1d: '6色中選4個，顏色不重複。', r2: '顏色（可重複）', r2d: '6色中選4個，顏色可重複。', r3: '數字3', r3d: '0〜9中3個不同數字。', r4: '數字4', r4d: '0〜9中4個不同數字。', r5: '專家', r5d: '8色中選5個，顏色可重複。',
      daily: '每日一題', dailyNote: '盤上已有提示列。在限定次數內猜出答案。每天兩題。', easy: '顏色・{n}次以內', hard: '數字4・{n}次以內',
      you: '你', ai: 'AI', p1: '玩家1', p2: '玩家2', clue: '提示',
      yourTurn: '你的回合：放好{n}個後按OK', aiTurn: 'AI思考中…', pTurn: '{p}的回合', left: '還剩{n}次',
      need: '請先放{n}個', noDup: '{k}不能重複', color: '顏色', digit: '數字', tried: '這個組合已經出現過',
      allHit: '全部命中！', hint: '推薦這一手', solvedRow: '第{n}列猜中', none: '列數用完：無人猜中', ans: '答案',
      pWin: '{p}獲勝', dWin: '解開了！', dLose: '次數用完…', dRes: '{n}次猜中（標準{p}次）', dFail: '{n}次內未能猜中',
      lv: ['粗心：常忘記之前的結果', '學徒：偶爾漏看提示', '推理家：照提示來猜', '名偵探：少給對手線索'], who: ['適合初次', '熟悉規則後', '對推理有自信', '實力挑戰'] },
    ko: { chs: ["탐정 사무소", "우체국", "도서관", "시계탑", "보석 시장", "암호의 저택", "계산기실", "등대 항구", "천문대", "별의 금고"], map: "스테이지 맵", stg: "스테이지 {s}", lock: "이전 장을 {n}스테이지 클리어하면 열려요", nextGift: "다음 아트라모까지 {n}스테이지", got: "「{name}」 획득!", allGot: "스테이지 아트라모를 모두 모았어요!", clr: "{a}/{b} 클리어", dress: "꾸미기에서 쓸 수 있어요", book: "문제집", list: "문제 목록", tgf: "첫 추리", tg1: "입문", tgx: "딱 맞게", c1: "답이 하나로 정해져 있어", cn: "답 후보 {a}~{b}가지", nx: "다음 문제", again: "다시 하기", within: "{n}회 이내", prog: "{a}/{b}문제 클리어", stars: "★ {a}/{b}", cont: "이어서", bkNote: "단서 줄로 답을 추리하는 문제가 10코스·500문제.", rate: '승률', r1: '컬러', r1d: '6색 중 4개, 같은 색은 쓰지 않음.', r2: '컬러(중복)', r2d: '6색 중 4개, 같은 색을 여러 번.', r3: '넘버3', r3d: '0〜9 중 서로 다른 숫자 3개.', r4: '넘버4', r4d: '0〜9 중 서로 다른 숫자 4개.', r5: '엑스퍼트', r5d: '8색 중 5개, 색 중복 가능.',
      daily: '오늘의 문제', dailyNote: '단서 줄이 이미 판에 있어요. 정해진 횟수 안에 맞혀 보세요. 매일 2문제.', easy: '컬러 · {n}회 이내', hard: '넘버4 · {n}회 이내',
      you: '나', ai: 'AI', p1: '플레이어1', p2: '플레이어2', clue: '단서',
      yourTurn: '내 차례: {n}개 놓고 OK', aiTurn: 'AI가 생각 중…', pTurn: '{p} 차례', left: '{n}회 남음',
      need: '먼저 {n}개를 놓으세요', noDup: '같은 {k}은(는) 쓸 수 없어요', color: '색', digit: '숫자', tried: '이미 나온 조합이에요',
      allHit: '전부 히트!', hint: '유력한 수', solvedRow: '{n}번째 줄에서 정답', none: '줄이 다 찼어요: 아무도 못 맞힘', ans: '정답',
      pWin: '{p} 승리', dWin: '클리어!', dLose: '횟수 초과…', dRes: '{n}회에 정답 (기준 {p}회)', dFail: '{n}회 안에 맞히지 못했어요',
      lv: ['덜렁이: 앞의 결과를 자주 잊음', '견습생: 가끔 단서를 놓침', '추리가: 단서대로 맞힘', '명탐정: 상대에게 단서를 덜 줌'], who: ['처음이라면', '규칙에 익숙해지면', '추리에 자신 있다면', '실력 시험'] },
    es: { chs: ["Agencia de detectives", "Oficina de correos", "Biblioteca", "Torre del reloj", "Bazar de gemas", "Mansión del cifrado", "Sala de ordenadores", "Puerto del faro", "Observatorio", "Cámara estelar"], map: "Mapa de etapas", stg: "Etapa {s}", lock: "Supera {n} etapas del capítulo anterior para abrirlo", nextGift: "Faltan {n} etapas para el próximo Atlamo", got: "¡Conseguiste «{name}»!", allGot: "¡Todos los Atlamo de las etapas reunidos!", clr: "{a}/{b} superadas", dress: "Úsalo en Vestir", book: "Libro de retos", list: "Todos los retos", tgf: "Primeros pasos", tg1: "Inicio", tgx: "Justo", c1: "Solo encaja una respuesta", cn: "{a}–{b} respuestas posibles", nx: "Siguiente", again: "Reintentar", within: "en {n}", prog: "{a}/{b} resueltos", stars: "★ {a}/{b}", cont: "Continuar", bkNote: "500 retos en 10 cursos: deduce el código con las filas de pistas.", rate: '% victorias', r1: 'Color', r1d: '4 de 6 colores, todos distintos.', r2: 'Color (con repetición)', r2d: '4 de 6 colores; se pueden repetir.', r3: 'Número 3', r3d: '3 cifras distintas, 0–9.', r4: 'Número 4', r4d: '4 cifras distintas, 0–9.', r5: 'Experto', r5d: '5 de 8 colores; se pueden repetir.',
      daily: 'Reto del día', dailyNote: 'Ya hay filas de pistas en el tablero. Descifra el código dentro del límite. Dos retos nuevos cada día.', easy: 'Color · en {n}', hard: 'Número 4 · en {n}',
      you: 'Tú', ai: 'IA', p1: 'Jugador 1', p2: 'Jugador 2', clue: 'Pista',
      yourTurn: 'Tu turno: coloca {n} y pulsa OK', aiTurn: 'La IA está pensando…', pTurn: 'Turno de {p}', left: 'Quedan {n}',
      need: 'Coloca {n} primero', noDup: 'Sin {k} repetidos', color: 'colores', digit: 'dígitos', tried: 'Esa jugada ya está en el tablero',
      allHit: '¡Todo aciertos!', hint: 'Una buena jugada', solvedRow: 'Descifrado en la fila {n}', none: 'Sin filas: nadie lo descifró', ans: 'Respuesta',
      pWin: 'Gana {p}', dWin: '¡Resuelto!', dLose: 'Sin intentos…', dRes: 'Resuelto en {n} (par {p})', dFail: 'No resuelto en {n}',
      lv: ['Despistado: olvida respuestas', 'Aprendiz: a veces pasa por alto una pista', 'Detective: juega según las pistas', 'Maestro: da pocas pistas al rival'], who: ['Para empezar', 'Si ya sabes las reglas', 'Si confías en tu lógica', 'Para ponerte a prueba'] },
    fr: { chs: ["Agence de détectives", "Bureau de poste", "Bibliothèque", "Tour de l’horloge", "Bazar des gemmes", "Manoir du chiffre", "Salle des ordinateurs", "Port du phare", "Observatoire", "Coffre des étoiles"], map: "Carte des étapes", stg: "Étape {s}", lock: "Réussissez {n} étapes du chapitre précédent pour l’ouvrir", nextGift: "Encore {n} étapes avant le prochain Atlamo", got: "Vous avez obtenu « {name} » !", allGot: "Tous les Atlamo des étapes réunis !", clr: "{a}/{b} réussies", dress: "À porter dans Habillage", book: "Recueil", list: "Tous les défis", tgf: "Premiers pas", tg1: "Initiation", tgx: "Pile", c1: "Une seule réponse possible", cn: "{a} à {b} réponses possibles", nx: "Défi suivant", again: "Rejouer", within: "en {n}", prog: "{a}/{b} résolus", stars: "★ {a}/{b}", cont: "Continuer", bkNote: "500 défis en 10 parcours : trouvez le code grâce aux lignes d’indices.", rate: '% victoires', r1: 'Couleur', r1d: '4 couleurs sur 6, toutes différentes.', r2: 'Couleur (répétitions)', r2d: '4 couleurs sur 6 ; une couleur peut revenir.', r3: 'Nombre 3', r3d: '3 chiffres différents, 0–9.', r4: 'Nombre 4', r4d: '4 chiffres différents, 0–9.', r5: 'Expert', r5d: '5 couleurs sur 8 ; répétitions permises.',
      daily: 'Défi du jour', dailyNote: 'Des lignes d’indices sont déjà sur le plateau. Trouvez le code dans la limite. Deux défis par jour.', easy: 'Couleur · en {n}', hard: 'Nombre 4 · en {n}',
      you: 'Vous', ai: 'IA', p1: 'Joueur 1', p2: 'Joueur 2', clue: 'Indice',
      yourTurn: 'À vous : placez {n}, puis OK', aiTurn: 'L’IA réfléchit…', pTurn: 'Au tour de {p}', left: 'Encore {n}',
      need: 'Placez-en {n} d’abord', noDup: 'Pas de {k} répétés', color: 'couleurs', digit: 'chiffres', tried: 'Cet essai est déjà sur le plateau',
      allHit: 'Tout juste !', hint: 'Un bon essai', solvedRow: 'Trouvé à la ligne {n}', none: 'Plus de lignes : personne n’a trouvé', ans: 'Réponse',
      pWin: '{p} gagne', dWin: 'Résolu !', dLose: 'Plus d’essais…', dRes: 'Résolu en {n} (par {p})', dFail: 'Non résolu en {n}',
      lv: ['Étourdi : oublie souvent', 'Apprenti : rate parfois un indice', 'Détective : suit les indices', 'Maître : donne peu d’indices'], who: ['Pour débuter', 'Une fois les règles connues', 'Si vous aimez déduire', 'Pour un vrai test'] },
    pt: { chs: ["Agência de detetives", "Correios", "Biblioteca", "Torre do relógio", "Bazar de gemas", "Mansão da cifra", "Sala dos computadores", "Porto do farol", "Observatório", "Cofre das estrelas"], map: "Mapa de fases", stg: "Fase {s}", lock: "Conclua {n} fases do capítulo anterior para abrir", nextGift: "Faltam {n} fases para o próximo Atlamo", got: "Você ganhou “{name}”!", allGot: "Todos os Atlamo das fases reunidos!", clr: "{a}/{b} concluídas", dress: "Use no Visual", book: "Livro de desafios", list: "Todos os desafios", tgf: "Primeiros passos", tg1: "Início", tgx: "Exato", c1: "Só uma resposta serve", cn: "{a}–{b} respostas possíveis", nx: "Próximo", again: "Repetir", within: "em {n}", prog: "{a}/{b} resolvidos", stars: "★ {a}/{b}", cont: "Continuar", bkNote: "500 desafios em 10 cursos: descubra o código pelas linhas de pistas.", rate: '% vitórias', r1: 'Cor', r1d: '4 de 6 cores, todas diferentes.', r2: 'Cor (com repetição)', r2d: '4 de 6 cores; podem repetir.', r3: 'Número 3', r3d: '3 dígitos diferentes, 0–9.', r4: 'Número 4', r4d: '4 dígitos diferentes, 0–9.', r5: 'Especialista', r5d: '5 de 8 cores; podem repetir.',
      daily: 'Desafio do dia', dailyNote: 'Já há linhas de pistas no tabuleiro. Decifre o código dentro do limite. Dois desafios por dia.', easy: 'Cor · em {n}', hard: 'Número 4 · em {n}',
      you: 'Você', ai: 'IA', p1: 'Jogador 1', p2: 'Jogador 2', clue: 'Pista',
      yourTurn: 'Sua vez: coloque {n} e OK', aiTurn: 'A IA está pensando…', pTurn: 'Vez de {p}', left: 'Faltam {n}',
      need: 'Coloque {n} primeiro', noDup: 'Sem {k} repetidos', color: 'cores', digit: 'dígitos', tried: 'Esse palpite já está no tabuleiro',
      allHit: 'Tudo certo!', hint: 'Um bom palpite', solvedRow: 'Decifrado na linha {n}', none: 'Sem linhas: ninguém decifrou', ans: 'Resposta',
      pWin: '{p} vence', dWin: 'Resolvido!', dLose: 'Sem tentativas…', dRes: 'Resolvido em {n} (par {p})', dFail: 'Não resolvido em {n}',
      lv: ['Distraído: esquece respostas', 'Aprendiz: às vezes perde uma pista', 'Detetive: segue as pistas', 'Mestre: dá poucas pistas ao rival'], who: ['Para começar', 'Depois de saber as regras', 'Se confia na lógica', 'Para um teste real'] },
    de: { chs: ["Detektivbüro", "Postamt", "Bibliothek", "Uhrturm", "Edelsteinbasar", "Chiffrenvilla", "Rechnerraum", "Leuchtturmhafen", "Sternwarte", "Sternentresor"], map: "Stufenkarte", stg: "Stufe {s}", lock: "Schaffe {n} Stufen des vorigen Kapitels, um es zu öffnen", nextGift: "Noch {n} Stufen bis zum nächsten Atlamo", got: "Du hast „{name}“ bekommen!", allGot: "Alle Stufen-Atlamo gesammelt!", clr: "{a}/{b} geschafft", dress: "Im Ankleiden nutzbar", book: "Rätselbuch", list: "Alle Rätsel", tgf: "Erste Schritte", tg1: "Einstieg", tgx: "Genau", c1: "Nur eine Lösung passt", cn: "{a}–{b} mögliche Lösungen", nx: "Nächstes Rätsel", again: "Nochmal", within: "in {n}", prog: "{a}/{b} gelöst", stars: "★ {a}/{b}", cont: "Weiter", bkNote: "500 Rätsel in 10 Kursen: Knacke den Code anhand der Hinweisreihen.", rate: 'Siegquote', r1: 'Farbe', r1d: '4 von 6 Farben, alle verschieden.', r2: 'Farbe (Wiederholung)', r2d: '4 von 6 Farben; Farben dürfen sich wiederholen.', r3: 'Zahl 3', r3d: '3 verschiedene Ziffern, 0–9.', r4: 'Zahl 4', r4d: '4 verschiedene Ziffern, 0–9.', r5: 'Experte', r5d: '5 von 8 Farben; Wiederholung erlaubt.',
      daily: 'Tagesrätsel', dailyNote: 'Hinweisreihen liegen schon auf dem Brett. Knacke den Code im Limit. Jeden Tag zwei neue.', easy: 'Farbe · in {n}', hard: 'Zahl 4 · in {n}',
      you: 'Du', ai: 'KI', p1: 'Spieler 1', p2: 'Spieler 2', clue: 'Hinweis',
      yourTurn: 'Du bist dran: {n} setzen, dann OK', aiTurn: 'Die KI denkt…', pTurn: '{p} ist dran', left: 'Noch {n}',
      need: 'Erst {n} setzen', noDup: 'Keine {k} doppelt', color: 'Farben', digit: 'Ziffern', tried: 'Dieser Tipp liegt schon auf dem Brett',
      allHit: 'Alles Treffer!', hint: 'Ein starker Tipp', solvedRow: 'Geknackt in Reihe {n}', none: 'Keine Reihen mehr: niemand hat es geknackt', ans: 'Lösung',
      pWin: '{p} gewinnt', dWin: 'Gelöst!', dLose: 'Keine Versuche mehr…', dRes: 'Gelöst in {n} (Par {p})', dFail: 'Nicht in {n} gelöst',
      lv: ['Vergesslich: vergisst oft Antworten', 'Lehrling: übersieht mal einen Hinweis', 'Spürnase: rät nach den Hinweisen', 'Meister: verrät dem Gegner wenig'], who: ['Für den Einstieg', 'Wenn du die Regeln kennst', 'Wenn du gern kombinierst', 'Als echte Probe'] },
    ru: { chs: ["Сыскное бюро", "Почта", "Библиотека", "Часовая башня", "Базар самоцветов", "Особняк шифров", "Вычислительный зал", "Гавань маяка", "Обсерватория", "Звёздный сейф"], map: "Карта этапов", stg: "Этап {s}", lock: "Пройдите {n} этапов прошлой главы, чтобы открыть", nextGift: "До следующего Атламо: {n} этапов", got: "Вы получили «{name}»!", allGot: "Все Атламо этапов собраны!", clr: "Пройдено {a}/{b}", dress: "Можно надеть в образах", book: "Сборник задач", list: "Все задачи", tgf: "Первые шаги", tg1: "Начало", tgx: "Впритык", c1: "Подходит лишь один ответ", cn: "Возможных ответов: {a}–{b}", nx: "Следующая", again: "Ещё раз", within: "за {n}", prog: "Решено {a}/{b}", stars: "★ {a}/{b}", cont: "Продолжить", bkNote: "500 задач в 10 курсах: разгадайте код по строкам-подсказкам.", rate: 'Процент побед', r1: 'Цвета', r1d: '4 из 6 цветов, все разные.', r2: 'Цвета (с повтором)', r2d: '4 из 6 цветов; цвета могут повторяться.', r3: 'Числа 3', r3d: '3 разные цифры, 0–9.', r4: 'Числа 4', r4d: '4 разные цифры, 0–9.', r5: 'Эксперт', r5d: '5 из 8 цветов; повторы можно.',
      daily: 'Задача дня', dailyNote: 'На доске уже есть ряды-подсказки. Разгадайте код за отведённое число ходов. Две задачи каждый день.', easy: 'Цвета · за {n}', hard: 'Числа 4 · за {n}',
      you: 'Вы', ai: 'ИИ', p1: 'Игрок 1', p2: 'Игрок 2', clue: 'Подсказка',
      yourTurn: 'Ваш ход: поставьте {n} и OK', aiTurn: 'ИИ думает…', pTurn: 'Ход: {p}', left: 'Осталось {n}',
      need: 'Сначала поставьте {n}', noDup: 'Нельзя повторять {k}', color: 'цвета', digit: 'цифры', tried: 'Такой вариант уже был',
      allHit: 'Все в точку!', hint: 'Сильный вариант', solvedRow: 'Разгадано в ряду {n}', none: 'Ряды кончились: никто не разгадал', ans: 'Ответ',
      pWin: 'Победа: {p}', dWin: 'Решено!', dLose: 'Попытки кончились…', dRes: 'Решено за {n} (норма {p})', dFail: 'Не решено за {n}',
      lv: ['Рассеянный: часто забывает ответы', 'Ученик: иногда упускает подсказку', 'Сыщик: следует подсказкам', 'Мастер: почти не помогает сопернику'], who: ['Для первых партий', 'Когда освоите правила', 'Если любите логику', 'Для серьёзной проверки'] },
    tr: { chs: ["Dedektif Bürosu", "Postane", "Kütüphane", "Saat Kulesi", "Mücevher Pazarı", "Şifre Konağı", "Bilgisayar Odası", "Fener Limanı", "Gözlemevi", "Yıldız Kasası"], map: "Aşama haritası", stg: "Aşama {s}", lock: "Açmak için önceki bölümden {n} aşama geç", nextGift: "Sonraki Atlamo’ya {n} aşama kaldı", got: "“{name}” kazandın!", allGot: "Tüm aşama Atlamo’ları toplandı!", clr: "{a}/{b} geçildi", dress: "Giydirme’de kullanabilirsin", book: "Bulmaca kitabı", list: "Tüm bulmacalar", tgf: "İlk adımlar", tg1: "Giriş", tgx: "Tam", c1: "Tek bir cevap uyuyor", cn: "{a}–{b} olası cevap", nx: "Sonraki", again: "Tekrar", within: "{n} içinde", prog: "{a}/{b} çözüldü", stars: "★ {a}/{b}", cont: "Devam et", bkNote: "10 kursta 500 bulmaca: ipucu satırlarından şifreyi bul.", rate: 'Kazanma oranı', r1: 'Renk', r1d: '6 renkten 4, hepsi farklı.', r2: 'Renk (tekrarlı)', r2d: '6 renkten 4; renk tekrar edebilir.', r3: 'Sayı 3', r3d: '0–9 arası 3 farklı rakam.', r4: 'Sayı 4', r4d: '0–9 arası 4 farklı rakam.', r5: 'Uzman', r5d: '8 renkten 5; tekrar olabilir.',
      daily: 'Günün bulmacası', dailyNote: 'Tahtada ipucu satırları var. Kodu sınır içinde çöz. Her gün iki yeni bulmaca.', easy: 'Renk · {n} içinde', hard: 'Sayı 4 · {n} içinde',
      you: 'Sen', ai: 'YZ', p1: 'Oyuncu 1', p2: 'Oyuncu 2', clue: 'İpucu',
      yourTurn: 'Sıra sende: {n} koy, sonra OK', aiTurn: 'YZ düşünüyor…', pTurn: 'Sıra: {p}', left: '{n} kaldı',
      need: 'Önce {n} koy', noDup: '{k} tekrar edemez', color: 'Renkler', digit: 'Rakamlar', tried: 'Bu tahmin zaten tahtada',
      allHit: 'Hepsi isabet!', hint: 'Güçlü bir tahmin', solvedRow: '{n}. satırda çözüldü', none: 'Satır bitti: kimse çözemedi', ans: 'Cevap',
      pWin: '{p} kazandı', dWin: 'Çözüldü!', dLose: 'Hak bitti…', dRes: '{n} tahminde çözüldü (hedef {p})', dFail: '{n} içinde çözülemedi',
      lv: ['Dalgın: cevapları sık unutur', 'Çırak: bazen ipucunu kaçırır', 'Dedektif: ipuçlarına göre tahmin eder', 'Usta: rakibe az ipucu verir'], who: ['İlk oyunlar için', 'Kuralları öğrenince', 'Mantığına güveniyorsan', 'Gerçek bir sınav'] },
    id: { chs: ["Kantor Detektif", "Kantor Pos", "Perpustakaan", "Menara Jam", "Pasar Permata", "Rumah Sandi", "Ruang Komputer", "Pelabuhan Mercusuar", "Observatorium", "Brankas Bintang"], map: "Peta tahap", stg: "Tahap {s}", lock: "Selesaikan {n} tahap bab sebelumnya untuk membuka", nextGift: "{n} tahap lagi menuju Atlamo berikutnya", got: "Kamu dapat “{name}”!", allGot: "Semua Atlamo tahap terkumpul!", clr: "{a}/{b} selesai", dress: "Bisa dipakai di Dandan", book: "Buku teka-teki", list: "Semua teka-teki", tgf: "Langkah pertama", tg1: "Pengenalan", tgx: "Pas", c1: "Hanya satu jawaban cocok", cn: "{a}–{b} jawaban mungkin", nx: "Berikutnya", again: "Ulangi", within: "dalam {n}", prog: "{a}/{b} selesai", stars: "★ {a}/{b}", cont: "Lanjutkan", bkNote: "500 teka-teki dalam 10 kursus: temukan kodenya dari baris petunjuk.", rate: 'Rasio menang', r1: 'Warna', r1d: '4 dari 6 warna, semua berbeda.', r2: 'Warna (boleh ulang)', r2d: '4 dari 6 warna; warna boleh berulang.', r3: 'Angka 3', r3d: '3 angka berbeda, 0–9.', r4: 'Angka 4', r4d: '4 angka berbeda, 0–9.', r5: 'Ahli', r5d: '5 dari 8 warna; boleh berulang.',
      daily: 'Teka-teki harian', dailyNote: 'Baris petunjuk sudah ada di papan. Tebak kodenya dalam batas. Dua teka-teki baru tiap hari.', easy: 'Warna · dalam {n}', hard: 'Angka 4 · dalam {n}',
      you: 'Kamu', ai: 'AI', p1: 'Pemain 1', p2: 'Pemain 2', clue: 'Petunjuk',
      yourTurn: 'Giliranmu: pasang {n}, lalu OK', aiTurn: 'AI sedang berpikir…', pTurn: 'Giliran {p}', left: 'Sisa {n}',
      need: 'Pasang {n} dulu', noDup: '{k} tidak boleh sama', color: 'Warna', digit: 'Angka', tried: 'Tebakan itu sudah ada di papan',
      allHit: 'Semua hit!', hint: 'Tebakan yang kuat', solvedRow: 'Terpecahkan di baris {n}', none: 'Baris habis: tak ada yang menebak', ans: 'Jawaban',
      pWin: '{p} menang', dWin: 'Terpecahkan!', dLose: 'Kesempatan habis…', dRes: 'Terpecahkan dalam {n} (par {p})', dFail: 'Tidak terpecahkan dalam {n}',
      lv: ['Pelupa: sering lupa jawaban', 'Murid: kadang melewatkan petunjuk', 'Detektif: menebak sesuai petunjuk', 'Ahli: sedikit memberi petunjuk ke lawan'], who: ['Untuk pemula', 'Setelah paham aturan', 'Kalau yakin dengan logikamu', 'Untuk ujian sungguhan'] },
    hi: { chs: ["जासूसी दफ़्तर", "डाकघर", "पुस्तकालय", "घंटाघर", "रत्न बाज़ार", "कूट हवेली", "कंप्यूटर कक्ष", "प्रकाशस्तंभ बंदरगाह", "वेधशाला", "तारों की तिजोरी"], map: "स्टेज नक्शा", stg: "स्टेज {s}", lock: "खोलने के लिए पिछले अध्याय की {n} स्टेज पूरी करें", nextGift: "अगले एटलामो तक {n} स्टेज", got: "आपको “{name}” मिला!", allGot: "स्टेज के सारे एटलामो मिल गए!", clr: "{a}/{b} पूरे", dress: "सजावट में पहनें", book: "पहेली पुस्तक", list: "सभी पहेलियाँ", tgf: "पहले क़दम", tg1: "परिचय", tgx: "ठीक-ठीक", c1: "सिर्फ़ एक उत्तर बचा है", cn: "{a}–{b} संभावित उत्तर", nx: "अगली पहेली", again: "फिर से", within: "{n} में", prog: "{a}/{b} हल", stars: "★ {a}/{b}", cont: "जारी रखें", bkNote: "10 कोर्स में 500 पहेलियाँ: संकेत पंक्तियों से कोड निकालें।", rate: 'जीत दर', r1: 'रंग', r1d: '6 में से 4 रंग, सब अलग।', r2: 'रंग (दोहराव)', r2d: '6 में से 4 रंग; रंग दोहरा सकते हैं।', r3: 'संख्या 3', r3d: '0–9 के 3 अलग अंक।', r4: 'संख्या 4', r4d: '0–9 के 4 अलग अंक।', r5: 'विशेषज्ञ', r5d: '8 में से 5 रंग; दोहराव संभव।',
      daily: 'आज की पहेली', dailyNote: 'बोर्ड पर संकेत की पंक्तियाँ पहले से हैं। सीमा के भीतर कोड खोलें। रोज़ दो नई पहेलियाँ।', easy: 'रंग · {n} में', hard: 'संख्या 4 · {n} में',
      you: 'आप', ai: 'AI', p1: 'खिलाड़ी 1', p2: 'खिलाड़ी 2', clue: 'संकेत',
      yourTurn: 'आपकी बारी: {n} रखें, फिर OK', aiTurn: 'AI सोच रहा है…', pTurn: '{p} की बारी', left: '{n} बाकी',
      need: 'पहले {n} रखें', noDup: '{k} दोहरा नहीं सकते', color: 'रंग', digit: 'अंक', tried: 'यह अनुमान पहले से बोर्ड पर है',
      allHit: 'सब हिट!', hint: 'एक मज़बूत अनुमान', solvedRow: 'पंक्ति {n} में हल', none: 'पंक्तियाँ खत्म: कोई नहीं खोल पाया', ans: 'उत्तर',
      pWin: '{p} जीते', dWin: 'हल हो गया!', dLose: 'प्रयास खत्म…', dRes: '{n} में हल (मानक {p})', dFail: '{n} में हल नहीं हुआ',
      lv: ['भुलक्कड़: पिछले उत्तर भूल जाता है', 'नौसिखिया: कभी-कभी संकेत छोड़ देता है', 'जासूस: संकेतों के अनुसार', 'उस्ताद: विरोधी को कम संकेत देता है'], who: ['शुरुआत के लिए', 'नियम सीखने के बाद', 'तर्क पर भरोसा हो तो', 'असली परीक्षा'] },
    ar: { chs: ["مكتب المحقق", "مكتب البريد", "المكتبة", "برج الساعة", "سوق الجواهر", "قصر الشفرات", "غرفة الحاسوب", "ميناء المنارة", "المرصد", "خزنة النجوم"], map: "خريطة المراحل", stg: "المرحلة {s}", lock: "أكمل {n} مراحل من الفصل السابق لفتحه", nextGift: "بقيت {n} مراحل حتى أتلامو التالي", got: "حصلت على «{name}»!", allGot: "جمعت كل أتلامو المراحل!", clr: "{a}/{b} مكتملة", dress: "استخدمه في التزيين", book: "كتاب الألغاز", list: "كل الألغاز", tgf: "الخطوات الأولى", tg1: "مدخل", tgx: "بالضبط", c1: "تبقى إجابة واحدة فقط", cn: "{a}–{b} إجابات محتملة", nx: "اللغز التالي", again: "أعد", within: "خلال {n}", prog: "حُلّ {a}/{b}", stars: "★ {a}/{b}", cont: "تابع", bkNote: "500 لغز في 10 مسارات: استنتج الشفرة من صفوف التلميحات.", rate: 'نسبة الفوز', r1: 'ألوان', r1d: '4 من 6 ألوان، كلها مختلفة.', r2: 'ألوان (مع تكرار)', r2d: '4 من 6 ألوان؛ يجوز التكرار.', r3: 'أرقام 3', r3d: '3 أرقام مختلفة من 0 إلى 9.', r4: 'أرقام 4', r4d: '4 أرقام مختلفة من 0 إلى 9.', r5: 'خبير', r5d: '5 من 8 ألوان؛ يجوز التكرار.',
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
  // 問題集 (engine BOOK: 10 sets × 50): best ★ per puzzle in 'aicoding-hitblow-pz3d' { set: { i: 1..3 } }
  const BKEY = 'aicoding-hitblow-pz3d';
  const bread = () => { try { return JSON.parse(localStorage.getItem(BKEY) || '{}') || {}; } catch (e) { return {}; } };
  // ステージ (2026-11-16 user: 500問ひとまとめでなくステージ制、クリアでアトラモ): the engine's 10 courses are 10 chapters of 50
  // stages, played in order; a chapter opens when NEED stages of the one before are cleared. GIFTS: the stage Atlamo
  // (atlas/avatars/sp-hb.js, atlas/art.js EARN 'hitblow' — the same stages there), each rank on its own stage.
  const CH = ['first', 'c2', 'c3', 'n1', 'd1', 'c4', 'n2', 'd2', 'n4', 'x'], NEED = 20, SN = 50;
  const GIFTS = { '1-10': ['hbgem', 0], '2-25': ['hbpin', 0], '3-50': ['hbgem', 1], '4-50': ['hbsleuth', 0], '5-25': ['hbvault', 0], '5-50': ['hbpin', 1],
    '6-50': ['hbgem', 2], '7-25': ['hbsleuth', 1], '7-50': ['hbvault', 1], '8-50': ['hbpin', 2], '9-25': ['hbsleuth', 2], '9-50': ['hbvault', 2],
    '10-10': ['hbgem', 3], '10-25': ['hbpin', 3], '10-40': ['hbsleuth', 3], '10-50': ['hbvault', 3] };
  const cOf = set => CH.indexOf(set), sKey = (set, i) => (cOf(set) + 1) + '-' + (i + 1);
  const nClr = (B, c) => { const o = B[CH[c]] || {}; let n = 0; for (let j = 0; j < SN; j++) if (o[j]) n++; return n; };
  const chOpen = (B, c) => c === 0 || nClr(B, c - 1) >= NEED;
  const stOpen = (B, c, i) => chOpen(B, c) && (i === 0 || !!(B[CH[c]] && B[CH[c]][i - 1]));
  const setName = (set, lang) => tx(lang, 'stg', { s: sKey(set, 0).split('-')[0] + '-' });   // (kept for old callers)
  const stName = (set, i, lang) => tx(lang, 'stg', { s: sKey(set, i) });
  const chName = (c, lang) => (tx(lang, 'chs') || [])[c] || '';
  const nextOf = (set, i) => { const B = bread(), c = cOf(set);
    if (i + 1 < SN) return { set, i: i + 1 };
    return c + 1 < CH.length && chOpen(B, c + 1) ? { set: CH[c + 1], i: 0 } : null; };
  const firstOpen = () => { const B = bread(), L = B._last;
    if (L && L.set && CH.includes(L.set)) { const c = cOf(L.set); for (let j = L.i; j < SN; j++) if (!(B[L.set] && B[L.set][j]) && stOpen(B, c, j)) return { set: L.set, i: j }; }
    for (let c = CH.length - 1; c >= 0; c--) if (chOpen(B, c)) for (let j = 0; j < SN; j++) if (!(B[CH[c]] && B[CH[c]][j])) return { set: CH[c], i: j };
    return { set: 'first', i: 0 }; };
  const owned = () => { try { return (window.Atlas && Atlas.load && Atlas.load().owned) || []; } catch (e) { return []; } };
  const nextGift = () => { const B = bread(), have = owned();
    for (let c = 0; c < CH.length; c++) for (let j = 0; j < SN; j++) { const g = GIFTS[(c + 1) + '-' + (j + 1)]; if (g && !have.includes('av-' + g[0] + '-' + g[1]) && !(B[CH[c]] && B[CH[c]][j])) {
      let left = 0; for (let q = 0; q <= c; q++) for (let r = 0; r < (q === c ? j + 1 : SN); r++) if (!(B[CH[q]] && B[CH[q]][r])) left++;
      return { sp: g[0], t: g[1], key: (c + 1) + '-' + (j + 1), left }; } }
    return null; };
  const avName = (sp, t, lang) => { const it = window.AtlasArt && AtlasArt.byId && AtlasArt.byId('av-' + sp + '-' + t); return it ? (it.name[lang] || it.name.en) : sp; };
  const RK = ['N', 'R', 'SR', 'SSR'];
  // the chapters' pictures (vector, drawn here): [sky top, sky bottom, ground, accent]
  const PAL = [['#2a2d5e', '#5a4a7a', '#3a2a28', '#ffd27a'], ['#7ab8e8', '#f4e0c0', '#c8a878', '#d83a3a'], ['#4a3a6a', '#a8785a', '#5a3a28', '#ffd27a'],
    ['#ff9a6a', '#ffe0a0', '#7a6a5a', '#2b3683'], ['#ffb04a', '#ffe8b0', '#d8a060', '#c83a8a'], ['#1a2a4a', '#4a5a7a', '#2a3a2a', '#7df3d2'],
    ['#1a1a2a', '#2a3a4a', '#20242c', '#a6e81f'], ['#ff8a6a', '#7ab8e8', '#2a5a8a', '#ffe060'], ['#0a1030', '#2a2a6a', '#1a1a3a', '#c8d8ff'], ['#140a2a', '#3a1a5a', '#1a1030', '#ffd65a']];
  function scene(c, W, H, uid) {
    const [a, b, g, x] = PAL[c], id = 'hbsc' + uid + c, R = (n => () => { n = (n * 9301 + 49297) % 233280; return n / 233280; })(c * 97 + 13);
    let o = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
    const night = [0, 2, 5, 6, 8, 9].includes(c);
    if (night) for (let i = 0; i < 26; i++) o += `<circle cx="${(R() * W).toFixed(1)}" cy="${(R() * H * .6).toFixed(1)}" r="${(R() * 1.4 + .4).toFixed(1)}" fill="#fff" opacity="${(.4 + R() * .6).toFixed(2)}"/>`;
    else o += `<circle cx="${W * .82}" cy="${H * .24}" r="${H * .11}" fill="#fff6d0" opacity=".9"/>`;
    const gy = H * .78; o += `<rect y="${gy}" width="${W}" height="${H - gy}" fill="${g}"/>`;
    const bld = (x0, w, h, col) => `<rect x="${x0}" y="${gy - h}" width="${w}" height="${h}" fill="${col}"/>`;
    const win = (x0, y0, w, h, col) => `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="1.5" fill="${col}"/>`;
    const dk = 'rgba(0,0,0,.35)', lt = x;
    switch (c) {
      case 0: o += bld(W * .06, W * .2, H * .5, '#1c1a3a') + bld(W * .3, W * .16, H * .36, '#24204a') + bld(W * .72, W * .22, H * .56, '#1c1a3a');
        for (let i = 0; i < 6; i++) o += win(W * .09 + (i % 3) * W * .05, gy - H * .44 + Math.floor(i / 3) * H * .12, W * .03, H * .07, i === 4 ? lt : '#3a3060');
        o += `<circle cx="${W * .52}" cy="${gy - H * .2}" r="${H * .11}" fill="none" stroke="${lt}" stroke-width="${H * .035}"/><line x1="${W * .52 + H * .08}" y1="${gy - H * .12}" x2="${W * .52 + H * .2}" y2="${gy}" stroke="${lt}" stroke-width="${H * .05}" stroke-linecap="round"/>`; break;
      case 1: o += bld(W * .26, W * .48, H * .42, '#f4ead8') + `<polygon points="${W * .22},${gy - H * .42} ${W * .5},${gy - H * .62} ${W * .78},${gy - H * .42}" fill="#b8483a"/>` + win(W * .44, gy - H * .26, W * .12, H * .26, '#6a4a3a');
        o += `<circle cx="${W * .5}" cy="${gy - H * .5}" r="${H * .06}" fill="#fff" stroke="#6a4a3a" stroke-width="2"/>` + `<rect x="${W * .84}" y="${gy - H * .3}" width="${W * .06}" height="${H * .3}" rx="4" fill="${lt}"/>`;
        for (let i = 0; i < 4; i++) o += `<rect x="${W * (.06 + i * .04)}" y="${gy - H * (.08 + i * .07)}" width="${W * .07}" height="${H * .06}" fill="#fff" stroke="#c8a878" transform="rotate(${-12 + i * 9} ${W * (.09 + i * .04)} ${gy - H * (.05 + i * .07)})"/>`; break;
      case 2: for (let i = 0; i < 5; i++) { const x0 = W * (.04 + i * .19); o += `<rect x="${x0}" y="${H * .2}" width="${W * .16}" height="${gy - H * .2}" fill="#3a2418"/>`; for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) o += `<rect x="${x0 + W * .01 + k * W * .024}" y="${H * .24 + r * H * .13}" width="${W * .018}" height="${H * .1}" fill="${['#c83a3a', '#2b6ad8', '#e8b048', '#3a9a5a', '#8a5ad8'][(k + r + i) % 5]}"/>`; } break;
      case 3: o += bld(W * .4, W * .2, H * .62, '#e8d8c0') + `<polygon points="${W * .38},${gy - H * .62} ${W * .5},${gy - H * .8} ${W * .62},${gy - H * .62}" fill="${lt}"/>` + `<circle cx="${W * .5}" cy="${gy - H * .44}" r="${H * .1}" fill="#fff" stroke="${lt}" stroke-width="3"/><line x1="${W * .5}" y1="${gy - H * .44}" x2="${W * .5}" y2="${gy - H * .51}" stroke="#222" stroke-width="2"/><line x1="${W * .5}" y1="${gy - H * .44}" x2="${W * .54}" y2="${gy - H * .44}" stroke="#222" stroke-width="2"/>`;
        o += bld(W * .08, W * .2, H * .3, '#d8c0a0') + bld(W * .72, W * .22, H * .34, '#d0b898'); break;
      case 4: for (let i = 0; i < 4; i++) { const x0 = W * (.04 + i * .24), col = ['#c83a8a', '#2b6ad8', '#3a9a5a', '#e8732a'][i]; o += `<polygon points="${x0},${gy - H * .3} ${x0 + W * .1},${gy - H * .46} ${x0 + W * .2},${gy - H * .3}" fill="${col}"/><rect x="${x0 + W * .01}" y="${gy - H * .3}" width="${W * .18}" height="${H * .3}" fill="#f4e6d0"/>`;
        for (let k = 0; k < 3; k++) o += `<circle cx="${x0 + W * (.05 + k * .05)}" cy="${gy - H * .12}" r="${H * .04}" fill="${['#ff4a6a', '#4ad8ff', '#a6e81f', '#c38bff'][(i + k) % 4]}" stroke="#fff" stroke-width="1"/>`; } break;
      case 5: o += bld(W * .14, W * .6, H * .4, '#3a3a4a') + `<polygon points="${W * .1},${gy - H * .4} ${W * .44},${gy - H * .62} ${W * .78},${gy - H * .4}" fill="#2a2a38"/>`;
        for (let i = 0; i < 8; i++) o += win(W * (.18 + (i % 4) * .13), gy - H * (.34 - Math.floor(i / 4) * .16), W * .06, H * .1, i % 3 ? '#ffd27a' : '#4a4a5a');
        o += `<line x1="${W * .86}" y1="${gy}" x2="${W * .86}" y2="${gy - H * .7}" stroke="#8a8a9a" stroke-width="3"/>`; for (let i = 1; i < 4; i++) o += `<path d="M${W * .86 - i * 7} ${gy - H * .7 + i * 4} q${i * 7} ${-i * 7} ${i * 14} 0" fill="none" stroke="${lt}" stroke-width="2" opacity="${1 - i * .25}"/>`; break;
      case 6: for (let i = 0; i < 4; i++) { const x0 = W * (.06 + i * .23); o += `<rect x="${x0}" y="${H * .18}" width="${W * .19}" height="${gy - H * .18}" rx="4" fill="#3a4250"/>`; for (let k = 0; k < 18; k++) o += `<circle cx="${x0 + W * .025 + (k % 6) * W * .028}" cy="${H * .26 + Math.floor(k / 6) * H * .1}" r="2.6" fill="${R() > .5 ? lt : '#ff6a5a'}" opacity="${(.5 + R() * .5).toFixed(2)}"/>`;
        o += `<circle cx="${x0 + W * .06}" cy="${gy - H * .16}" r="${H * .07}" fill="#20242c" stroke="#8a9aaa" stroke-width="2"/><circle cx="${x0 + W * .13}" cy="${gy - H * .16}" r="${H * .07}" fill="#20242c" stroke="#8a9aaa" stroke-width="2"/>`; } break;
      case 7: o += `<rect y="${gy}" width="${W}" height="${H - gy}" fill="#2a6aa8"/>`; for (let i = 0; i < 6; i++) o += `<path d="M${i * W / 6} ${gy + 8} q${W / 24} -6 ${W / 12} 0 t${W / 12} 0" fill="none" stroke="#fff" opacity=".5" stroke-width="2"/>`;
        o += `<polygon points="${W * .7},${gy} ${W * .74},${gy - H * .6} ${W * .8},${gy - H * .6} ${W * .84},${gy}" fill="#f4f0e8"/><rect x="${W * .715}" y="${gy - H * .45}" width="${W * .11}" height="${H * .08}" fill="#d83a3a"/><rect x="${W * .73}" y="${gy - H * .7}" width="${W * .08}" height="${H * .1}" fill="${lt}"/><polygon points="${W * .77},${gy - H * .65} ${W * .2},${gy - H * .8} ${W * .2},${gy - H * .55}" fill="${lt}" opacity=".35"/>`;
        o += `<path d="M${W * .1} ${gy - 2} l${W * .14} 0 l-${W * .02} ${H * .06} l-${W * .1} 0z" fill="#8a4a2a"/><line x1="${W * .17}" y1="${gy - 2}" x2="${W * .17}" y2="${gy - H * .28}" stroke="#5a3a20" stroke-width="2"/><polygon points="${W * .17},${gy - H * .27} ${W * .26},${gy - H * .06} ${W * .17},${gy - H * .06}" fill="#fff"/>`; break;
      case 8: o += `<path d="M${W * .3} ${gy} a${W * .2} ${H * .3} 0 0 1 ${W * .4} 0z" fill="#c8ccd8"/><rect x="${W * .48}" y="${gy - H * .32}" width="${W * .04}" height="${H * .12}" fill="#2a2a38"/>`;
        o += `<line x1="${W * .5}" y1="${gy - H * .2}" x2="${W * .68}" y2="${gy - H * .5}" stroke="#5a5a6a" stroke-width="${H * .05}" stroke-linecap="round"/><circle cx="${W * .74}" cy="${H * .18}" r="${H * .08}" fill="#fff6d0"/><circle cx="${W * .76}" cy="${H * .16}" r="${H * .07}" fill="${a}"/>`; break;
      case 9: o += `<circle cx="${W * .5}" cy="${gy - H * .3}" r="${H * .34}" fill="#4a3a6a" stroke="${lt}" stroke-width="5"/><circle cx="${W * .5}" cy="${gy - H * .3}" r="${H * .14}" fill="#2a1a4a" stroke="${lt}" stroke-width="3"/>`;
        for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; o += `<line x1="${W * .5 + Math.cos(an) * H * .16}" y1="${gy - H * .3 + Math.sin(an) * H * .16}" x2="${W * .5 + Math.cos(an) * H * .22}" y2="${gy - H * .3 + Math.sin(an) * H * .22}" stroke="${lt}" stroke-width="2"/>`; }
        o += `<rect x="${W * .5 - 3}" y="${gy - H * .38}" width="6" height="${H * .16}" fill="${lt}"/>`; break;
    }
    // the Hit & Blow touch: a row of four gems along the bottom
    ['#e23a3a', '#f0c020', '#2aa84a', '#2b7ad8'].forEach((col, i) => { o += `<circle cx="${W * .08 + i * H * .1}" cy="${H - H * .1}" r="${H * .04}" fill="${col}" stroke="rgba(255,255,255,.7)" stroke-width="1"/>`; });
    return o + '</svg>';
  }
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
    s.textContent = `.hbtoast{position:fixed;left:50%;bottom:calc(var(--tbh,70px) + 24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#1b2257;border:1px solid rgba(140,170,255,.5);color:#eef2ff;font-weight:800;font-size:14.5px;text-align:center;box-shadow:0 10px 30px -12px rgba(30,40,120,.8);pointer-events:none;animation:hbt .25s ease-out}
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
.hbgift{position:fixed;left:50%;top:50%;transform:translate(-50%,-46%) scale(.94);opacity:0;transition:opacity .35s,transform .35s;z-index:130;width:min(88vw,380px);padding:14px 16px;border-radius:18px;background:#fffaf2;color:#2a2238;box-shadow:0 18px 50px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center}.hbgift.on{opacity:1;transform:translate(-50%,-50%) scale(1)}.hbgift img{width:84px;height:84px;flex:none;border-radius:16px;background:radial-gradient(circle at 50% 40%,#fff,#e8eaf8)}.hbgift b{display:block;font-size:15px;line-height:1.4}.hbgift small{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.75;margin-top:4px}.rk,.gr{display:inline-block;padding:0 7px;border-radius:99px;font:800 10px/1.6 system-ui;color:#fff;background:#8a8f9a}.rk.r1,.gr.r1{background:#3a8be0}.rk.r2,.gr.r2{background:linear-gradient(90deg,#b06ae8,#f0a030)}.rk.r3,.gr.r3{background:linear-gradient(90deg,#ff5a8a,#ffb02a,#5ad8ff)}.hbstg{display:flex!important;align-items:center;gap:12px;padding:8px 10px!important;text-align:left}.hbstg .pic{flex:none;width:76px;height:46px;border-radius:10px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}.hbstg .pic svg{width:100%;height:100%;display:block}.hbstg .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.hbstg .tx b{font-size:15px}.hbstg .tx small{font-size:12px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hbstg .hbbar{height:6px}.hbstg .gift{flex:none;position:relative;width:44px;height:44px}.hbstg .gift img{width:44px;height:44px;border-radius:12px;background:#f3eedf}.hbstg .gift em{position:absolute;right:-4px;bottom:-4px;font:800 10px/1 system-ui;font-style:normal;background:#ff5a5a;color:#fff;padding:3px 5px;border-radius:99px}.hbmap{position:fixed;inset:0;z-index:120;background:rgba(20,16,10,.45);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}.hbmap.on{opacity:1}.hbmap-in{width:min(640px,100vw);height:min(94vh,940px);display:flex;flex-direction:column;background:#fbf7ee;border-radius:24px 24px 0 0;overflow:hidden;color:#2b2a35;transform:translateY(30px);transition:transform .22s}.hbmap.on .hbmap-in{transform:none}@media (min-width:820px){.hbmap{align-items:center}.hbmap-in{border-radius:24px}}.hbmap-h{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px;font-size:19px}.hbmap-x{border:0;background:#efe8d6;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer}.hbtabs{display:flex;gap:8px;overflow-x:auto;padding:4px 14px 10px;scrollbar-width:none}.hbtabs::-webkit-scrollbar{display:none}.hbtab{flex:none;position:relative;width:62px;height:46px;border:0;padding:0;border-radius:12px;overflow:hidden;cursor:pointer;box-shadow:0 2px 0 #e0d6bc;background:#222}.hbtab .pic,.hbtab .pic svg{position:absolute;inset:0;width:100%;height:100%;display:block}.hbtab b{position:absolute;left:5px;top:3px;font:900 14px/1 system-ui;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7)}.hbtab i{position:absolute;left:0;bottom:0;height:4px;background:#7df3d2}.hbtab em{position:absolute;right:4px;bottom:3px;font-style:normal;font-size:12px}.hbtab.lk .pic{filter:grayscale(.85) brightness(.55)}.hbtab.on{box-shadow:0 0 0 3px #ff5a5a,0 2px 0 #e0d6bc}.hbmap-b{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}.hbban{position:relative;margin:0 14px;border-radius:18px;overflow:hidden;color:#fff}.hbban .pic{height:150px}.hbban .pic svg{width:100%;height:100%;display:block}.hbban .cap{position:absolute;left:14px;top:10px;display:flex;flex-direction:column;text-shadow:0 2px 6px rgba(0,0,0,.55)}.hbban .cap small{font-size:12px;opacity:.9;font-weight:800}.hbban .cap b{font-size:22px}.hbban .cap span{font-size:12px;font-weight:700;opacity:.95}.hbban .prog{position:absolute;left:0;right:0;bottom:0;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:8px 14px;background:linear-gradient(transparent,rgba(0,0,0,.55));font-size:12px;font-weight:800}.hbban .prog .st{color:#ffd65a}.hbban .prog .hbbar{flex-basis:100%;height:6px;background:rgba(255,255,255,.3)}.hblock{margin:10px 14px 0;padding:10px 12px;border-radius:12px;background:#efe8d6;font-size:13px;font-weight:700;text-align:center}.hbpath{position:relative;margin:12px 14px 16px;border-radius:18px;background:linear-gradient(180deg,var(--c1),var(--c2))}.hbpath>svg{position:absolute;inset:0;width:100%;height:100%}.hbn{position:absolute;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#fff;color:#2b2a35;box-shadow:0 4px 0 rgba(0,0,0,.25),inset 0 0 0 3px var(--ac);display:flex;flex-direction:column;align-items:center;justify-content:center;font:inherit}.hbn b{font-size:18px;line-height:1}.hbn i{font-style:normal;font-size:9px;letter-spacing:.5px;color:#c9bf9e}.hbn.ok{background:#fff8dc}.hbn.ok i{color:#e0a800}.hbn.lk{background:#8a8aa0;color:#d8d8e8;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:default}.hbn.nx{background:#ff5a5a;color:#fff;animation:hbpulse 1.4s ease-in-out infinite}.hbn.nx i{color:#ffe0a0}@keyframes hbpulse{50%{transform:translate(-50%,-50%) scale(1.1)}}.hbn .gf{position:absolute;left:44px;top:-14px;width:54px;height:54px;border-radius:14px;background:rgba(255,255,255,.92);box-shadow:0 3px 8px rgba(0,0,0,.3);filter:grayscale(.2)}.hbn .gf.got{opacity:.55}.hbn .gr{position:absolute;left:56px;top:36px}.hbfoot{display:flex;align-items:center;gap:10px;padding:10px 14px calc(12px + env(safe-area-inset-bottom));background:#fff;box-shadow:0 -2px 10px rgba(0,0,0,.08)}.hbfoot img{width:48px;height:48px;border-radius:12px;background:#f3eedf;flex:none}.hbfoot>div{flex:1;min-width:0}.hbfoot b{display:block;font-size:14px}.hbfoot small{display:block;font-size:12px;opacity:.7}.hbgo{flex:none;border:0;border-radius:16px;padding:9px 16px;background:#ff5a5a;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 4px 0 #c43c3c;display:flex;flex-direction:column;align-items:center}.hbgo small{font-size:11px;opacity:.9}.hbbkb i{font-style:normal;font-size:18px;opacity:.7}.hbbk{position:fixed;inset:0;z-index:120;background:rgba(20,16,10,.38);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}.hbbk.on{opacity:1}.hbbk-in{width:min(620px,100vw);max-height:min(88vh,860px);display:flex;flex-direction:column;background:#fbf7ee;border-radius:24px 24px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.25);transform:translateY(30px);transition:transform .22s;overflow:hidden;color:#2b2a35}.hbbk.on .hbbk-in{transform:none}@media (min-width:820px){.hbbk{align-items:center}.hbbk-in{border-radius:24px}}.hbbk-h{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px;font-size:19px}.hbbk-x{border:0;background:#efe8d6;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer}.hbbk-top{display:flex;gap:12px;align-items:center;padding:6px 18px 12px}.hbbk-top>div{flex:1;min-width:0}.hbbk-top small{display:block;font-size:12px;opacity:.65;margin-top:6px;line-height:1.35}.hbbk-p{display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-bottom:6px}.hbbk-p span{color:#c99a12}.hbbar{display:block;height:8px;border-radius:9px;background:#eae2cd;overflow:hidden}.hbbar i{display:block;height:100%;background:linear-gradient(90deg,#7df3d2,#2b3683)}.hbbk-go{flex:none;border:0;border-radius:16px;padding:10px 16px;background:#ff5a5a;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 4px 0 #c43c3c;display:flex;flex-direction:column;align-items:center;gap:2px}.hbbk-go small{font-size:11px;opacity:.9;font-weight:700}.hbbk-l{overflow:auto;padding:0 14px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px}.hbset{background:#fff;border-radius:16px;box-shadow:0 2px 0 #e8dfc8,inset 0 0 0 1.5px #efe6d0}.hbset.open{box-shadow:0 2px 0 #e8dfc8,inset 0 0 0 2px #2b3683}.hbset-h{width:100%;display:flex;align-items:center;gap:10px;border:0;background:none;padding:10px 12px;font:inherit;color:inherit;cursor:pointer;text-align:left}.hbic{flex:none;display:flex;width:62px;height:28px;position:relative}.hbic svg{width:28px;height:28px;margin-right:-11px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}.hbset-t{flex:1;min-width:0;display:flex;flex-direction:column}.hbset-t b{font-size:15px}.hbset-t small{font-size:12px;opacity:.65}.hbset-n{flex:none;width:74px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:12px}.hbset-n .hbbar{width:100%;height:6px}.hbset-v{font-style:normal;opacity:.45;transition:transform .2s}.hbset.open .hbset-v{transform:rotate(180deg)}.hbgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:0 12px 12px}.hbgrid[hidden]{display:none}.hbgrid button{border:0;border-radius:12px;background:#f3eedf;padding:7px 0 5px;font:inherit;color:#2b2a35;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px}.hbgrid button b{font-size:15px}.hbgrid button i{font-style:normal;font-size:10px;letter-spacing:1px;color:#cfc4a6}.hbgrid button.ok{background:#e5f6ee}.hbgrid button.ok i{color:#e0a800}.hbgrid button.nx{box-shadow:inset 0 0 0 2px #ff5a5a}@media (min-width:560px){.hbgrid{grid-template-columns:repeat(10,1fr)}}#bvPz.hbdy{display:flex!important;flex-direction:column;gap:10px;align-items:stretch}#bvPz.hbdy[hidden]{display:none!important}.hbdy .hbd{width:100%;display:flex;align-items:center;gap:10px;justify-content:flex-start;white-space:nowrap}.hbdy .hbd small{margin-left:auto;font-size:13px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;line-height:1.2}.hbdy .hbd small>span{opacity:.8}.hbdy .hbr{font-size:12px;color:#2b3683}.hbdy .hbr i{font-style:normal;font-weight:600;opacity:.6;margin-left:2px}
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
    const AD = window.Atlas3D.hitblow, pend = AD.pending || AD.lastPend; AD.pending = null;
    const bk = mode === 'daily' && pend && typeof pend === 'object' ? pend : null;   // 問題集 { set, i }
    const which = mode === 'daily' ? (bk ? 'book' : pend === 'hard' ? 'hard' : 'easy') : null;
    if (mode === 'daily') AD.lastPend = bk ? { set: bk.set, i: bk.i } : which;   // (もう一度 replays the same puzzle)
    const P = bk ? E.makePuzzle(bk.set, bk.i) : which ? E.makeDaily(today(), which) : null;
    const z = P ? P.z : E.RULE_IDS.includes(+ctx.size) ? +ctx.size : 1;
    const cfg = Object.assign({}, E.rule(z)); if (P) cfg.rows = P.clues.length + P.limit;
    const kind = cfg.kind, level = Math.max(1, Math.min(20, ctx.level || 1));
    const pvp = mode === 'pvp', vsAI = mode === 'ai' || mode === 'rated';
    // seats: 0 = the left pill (you / player 1), 1 = the right pill (the AI / player 2); who guesses first
    let turn = P ? 0 : pvp ? 0 : (ctx.side === 2 ? 1 : 0);
    const first = turn;
    const secret = P ? P.secret.slice() : E.randomCode(cfg, Math.random);
    const board = H.board(cfg), U = board.userData, TOP = U.top, R = H.R;
    const TR = H.tray(cfg), TU = TR.userData; board.add(TR);   // (2026-11-16 user: the input on the same 3D as the board)
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
    const frame = () => { if (!T3.fit) return; T3.fit({ w: U.W + .2, d: U.L + .14 + TU.D - .1, y: TOP + .25, pitch: 1.5703, cz: (TU.D + .14) / 2 }); };
    frame();
    // the hidden code waits in the case (under the lid)
    const caseGems = secret.map((v, k) => { const m = H.gem(kind, v), [x, y, zz] = U.caseSlot(k); m.position.set(x, y, zz); board.add(m); return m; });

    /* ---------- the input tray (3D, joined to the board: model tray()) ---------- */
    const C = cfg.c, uid = 'hbg' + Math.random().toString(36).slice(2, 7);
    const onResize = () => frame();
    addEventListener('resize', onResize);
    // where the Atlamo talks (atlas/npc/npc.js reads window.__npcPlace): beside the board when a side has room, else over the top
    function npcTop() { try { const r = Table3D.modelRect && Table3D.modelRect(); if (!r) return innerWidth < 760; return Math.max(r.left, innerWidth - r.right) < 300; } catch (e) { return true; } }
    const npcPlace = el => { if (!vsAI || stopped) return null;
      let r = null; try { r = Table3D.modelRect && Table3D.modelRect(); } catch (e) {} if (!r) return null;
      const bv = document.getElementById('bv'), H = bv ? bv.clientHeight : innerHeight, gl = r.left, gr = innerWidth - r.right;
      if (Math.max(gl, gr) >= 300) { const left = gl >= gr, g = left ? gl : gr, w = Math.min(460, g - 32); return { cx: left ? g / 2 : r.right + g / 2, w, bot: Math.max(16, H - r.bottom) }; }
      return { cx: innerWidth / 2, w: Math.min(420, innerWidth - 24), bot: H - r.top + 4 }; };
    if (vsAI) window.__npcPlace = npcPlace;
    const myTurn = () => !over && !busy && (pvp || mode === 'daily' || turn === 0);
    // the row being made: a slot per gem (null = empty) and the cursor (2026-11-16 user: tap a slot to put there · drag to move / swap)
    const blank = () => Array(cfg.n).fill(null), count = () => input.filter(v => v != null).length, full = () => count() === cfg.n;
    input = blank();
    const nextFree = k => { for (let i = 0; i < cfg.n; i++) { const j = (k + i) % cfg.n; if (input[j] == null) return j; } return k; };
    const shown = [];
    function paintDock() {
      const can = myTurn();
      for (let k = 0; k < cfg.n; k++) { const v = drag && drag.ghost && drag.from.k === k ? null : input[k]; if (shown[k] !== v) { TU.put(k, v); shown[k] = v; } }
      TU.cursor(can ? cur : -1); TU.okOn(can && full()); TU.off(!can);
      TU.usedAll(cfg.rep ? [] : input.filter(v => v != null)); kick(160);
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
    // the tray on the screen (the flat top view: Table3D.project): what a point hits — a palette gem, a socket, OK
    let drag = null, picked = false;
    const scr = (x, z, y) => { const v = T3.project(x, z, y == null ? TOP + .1 : y); return [v.x, v.y]; };
    const ppu = () => { const a = scr(0, TU.zc), b = scr(1, TU.zc); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
    function hitAt(x, y) {
      const u = ppu();
      for (let k = 0; k < cfg.n; k++) { const [sx, sy] = scr(...TU.sock(k)); if (Math.hypot(x - sx, y - sy) < (R + .12) * u) return { k }; }
      for (let v = 0; v < C; v++) { const [sx, sy] = scr(...TU.pal(v)); if (Math.hypot(x - sx, y - sy) < Math.min(TU.pp * .5, R * TU.gemS * 1.2) * u) return { v }; }
      const [ox, oy] = scr(TU.ok[0], TU.ok[1], TOP + .2); if (Math.abs(x - ox) < TU.ok[2] / 2 * u + 4 && Math.abs(y - oy) < TU.ok[3] / 2 * u + 4) return { ok: 1 };
      return null;
    }
    const slotAt = (x, y) => { const h = hitAt(x, y); return h && h.k != null ? h.k : -1; };
    function onDown(e) {
      if (stopped || e.button > 0) return;
      const h = hitAt(e.clientX, e.clientY); if (!h) return;
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (!myTurn()) return;
      drag = { from: h, x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null, over: -1 };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const f = drag.from;
      if (!drag.ghost) {
        if (f.ok || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
        const v = f.k != null ? input[f.k] : f.v; if (v == null || (f.v != null && !cfg.rep && input.includes(v) && false)) return;
        const sz = Math.round(R * 2 * (f.v != null ? TU.gemS : 1) * ppu() * 1.05);
        const gh = document.createElement('div'); gh.className = 'hbghost'; gh.style.width = gh.style.height = sz + 'px'; gh.innerHTML = gemSvg(kind, v, uid + 'gh'); document.body.appendChild(gh); drag.ghost = gh; drag.sz = sz;
        paintDock();
      }
      e.preventDefault();
      drag.ghost.style.transform = `translate(${e.clientX - drag.sz / 2}px,${e.clientY - drag.sz / 2}px)`;
      const o = slotAt(e.clientX, e.clientY); if (o !== drag.over) { drag.over = o; if (o >= 0) TU.cursor(o); else TU.cursor(myTurn() ? cur : -1); kick(120); }
    }
    function onUp(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null;
      if (!d.ghost) {   // a tap
        const h = e && hitAt(e.clientX, e.clientY); if (!h) return;
        if (d.from.ok && h.ok) return submit();
        if (d.from.k != null && h.k === d.from.k) return tapSlot(h.k);
        if (d.from.v != null && h.v === d.from.v) return put(h.v);
        return;
      }
      d.ghost.remove();
      const o = e ? slotAt(e.clientX, e.clientY) : -1;
      if (d.from.k != null) { if (o >= 0) move(d.from.k, o); else take(d.from.k); }
      else if (o >= 0) put(d.from.v, o);
      paintDock();
    }
    const onCancel = () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; paintDock(); };
    ctx.el.addEventListener('pointerdown', onDown, true); addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel);
    function onKey(e) {
      if (stopped || e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.key === 'Enter') { if (myTurn() && full()) { e.preventDefault(); submit(); } return; }
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
      if (mode === 'daily') { ctx.hud(`<span class="hs on"><i class="dk" style="background:#7df3d2"></i>${bk ? esc(stName(bk.set, bk.i, lang)) : which.toUpperCase()}</span><span class="hm">${msg || ''}</span><span class="hs"><i class="dk" style="background:#8f98c8"></i>${t('left', { n: Math.max(0, cfg.rows - hist.length) })}</span>`); return; }
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
        if (mode === 'daily' && bk) {   // 問題集: ★ = solved · ★★ no hint · ★★★ no hint and within par; the best kept
          const win = w === 0 && why !== 'resign', st = win ? 1 + (hinted ? 0 : 1) + (!hinted && rows <= P.par ? 1 : 0) : 0, B = bread();
          B[bk.set] = B[bk.set] || {}; if (st > (B[bk.set][bk.i] || 0)) B[bk.set][bk.i] = st; B._last = { set: bk.set, i: bk.i };
          try { localStorage.setItem(BKEY, JSON.stringify(B)); } catch (e) {}
          // a stage's Atlamo (GIFTS): added to the wallet by the portal after its save (res.grant); the card shows it
          const gf = win && GIFTS[sKey(bk.set, bk.i)], gid = gf && 'av-' + gf[0] + '-' + gf[1], grant = gid && !owned().includes(gid) ? [gid] : [];
          if (grant.length) later(() => giftCard(gf[0], gf[1], lang), 900);
          const nx = (win || (B[bk.set] && B[bk.set][bk.i])) ? nextOf(bk.set, bk.i) : null;
          ctx.onEnd({ grant, goal: grant.length ? '🎁 ' + t('got', { name: avName(gf[0], gf[1], lang) }) : '', solo: true, win, draw: false, level: 0, title: stName(bk.set, bk.i, lang) + ' ' + t(win ? 'dWin' : 'dLose'), score: win ? t('dRes', { n: rows, p: P.par }) + '  ' + '★'.repeat(st) + '☆'.repeat(3 - st) : t('dFail', { n: P.limit }), best: kind === 'num' && !win ? t('ans') + ' ' + secret.join('') : '', opp: chName(cOf(bk.set), lang) + ' ' + sKey(bk.set, bk.i), key: 'stage-' + bk.set, why: win ? 'win' : why || 'out',
            again: { label: t('again'), go: restart => restart(() => { AD.pending = { set: bk.set, i: bk.i }; }) },
            next: nx ? { label: t('nx'), go: () => { AD.pending = nx; } } : null });
          return;
        }
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
          ctx.onEnd({ solo: true, win, draw: false, level: 0, title: (which === 'hard' ? 'HARD ' : 'EASY ') + t(win ? 'dWin' : 'dLose'), score: win ? t('dRes', { n: rows, p: P.par }) : t('dFail', { n: P.limit }), best: kind === 'num' ? t('ans') + ' ' + secret.join('') : '', opp: t('daily') + ' ' + which.toUpperCase(), key: 'daily-' + which, why: win ? 'win' : why || 'out',
            again: { label: t('again'), go: restart => restart(() => { AD.pending = which; }) } });
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
    later(() => shakeCase(() => {
      if (P) {
        let i = 0;
        const clue = () => { if (stopped) return; if (i >= P.clues.length) { next(); return; } const c = P.clues[i++]; placeRow(c.g, 120, () => commit(c.g, 2, () => clue(), true)); };
        clue();
      } else next();
    }), 450);

    const dbg = { secret: () => secret.slice(), hist: () => hist.map(x => Object.assign({}, x)), cfg: () => Object.assign({}, cfg), turn: () => turn, busy: () => busy, over: () => over, input: () => input.filter(v => v != null), slots: () => input.slice(), cur: () => cur, TU, U, put, take, submit, puzzle: () => P, U };
    window.Atlas3D.hitblow._dbg = dbg;
    return {
      get human() { return 0; },
      // room under the board for the Atlamo's speech bubble (2026-11-16 user: the talk must not cover the tray) — AI games only;
      // npc.js puts it over the action bar on phones (just above it on PCs), so the board + tray is framed above where it reaches
      // no action bar (2026-11-17 user: 画面下の投了とか不要、その分盤を大きく): やめる at the top ends the game; the board takes the room
      noBar: true, noUndo: true, noHint: true, noResign: true,
      inset: () => innerWidth <= 600 ? 12 : 18,
      // the Atlamo's talk (AI games) goes beside the board where there is room (PC); on phones, where the board fills the width, at
      // the top over the HUD: a strip is kept free above the board so the talk never covers the case or the rows
      insetTop: () => { if (!vsAI || !npcTop()) return 0; const h = window.__hudTop ? __hudTop() : 0; return h ? h + 46 : 0; },
      undo() {}, canUndo: () => false,
      hint, canHint: () => myTurn() && mode !== 'rated',
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? turn ^ 1 : mode === 'daily' ? -1 : 1, 'resign'); },
      timeout(s) { if (!over) finish(s ^ 1, 'time'); },
      stop() {
        stopped = true; timers.forEach(clearTimeout); clearTimeout(toastTm); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); removeEventListener('keydown', onKey); if (window.__npcPlace === npcPlace) window.__npcPlace = null; ctx.el.removeEventListener('pointerdown', onDown, true); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); if (drag && drag.ghost) drag.ghost.remove(); removeEventListener('resize', onResize);
        if (window.Atlas3D.hitblow._dbg === dbg) delete window.Atlas3D.hitblow._dbg;
      },
      _debug: dbg,
    };
  }

  /* ---------- the card: 今日の一問 (EASY / HARD) on its own tab ---------- */
  const modeName = (m, lang) => m === 'daily' ? tx(lang, 'daily') : null;
  const dailyNext = () => !dailyDone('easy') ? 'easy' : !dailyDone('hard') ? 'hard' : firstOpen();   // (あそぶ in the パズル tab: today's first unsolved one)
  const modeNote = (m, lang) => m === 'daily' ? tx(lang, 'dailyNote') : null;
  // the gift card (an Atlamo won on a stage): the picture, the name and its rank; a tap closes it
  function giftCard(sp, t, lang) {
    const el = document.createElement('div'); el.className = 'hbgift'; el.setAttribute('role', 'status');
    el.innerHTML = `<img src="../images/atlas/av/${sp}-${t}.webp" alt=""><div><b>🎁 ${tx(lang, 'got', { name: avName(sp, t, lang) })}</b><small><span class="rk r${t}">${RK[t]}</span>${tx(lang, 'dress')}</small></div>`;
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
    el.onclick = close; document.body.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); setTimeout(close, 6500);
  }
  // the stage map: the chapters along the top (their pictures; locked ones dim), the chapter's picture, then its 50 stages on a
  // winding path (★, the gifts' Atlamo, the next stage pulsing); go({ set, i }) starts one on the table
  let mapCh = -1;
  function stageMap(lang, go) {
    const E = window.HitBlowEngine; if (!E) return;
    const old = document.getElementById('hbMap'); if (old) old.remove();
    const T = (k, v) => tx(lang, k, v), esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const fo = firstOpen(); let B = bread(); const have = owned();
    const sh = document.createElement('div'); sh.id = 'hbMap'; sh.className = 'hbmap';
    const tabs = () => CH.map((set, c) => { const op = chOpen(B, c), n = nClr(B, c); return `<button type="button" class="hbtab${op ? '' : ' lk'}${c === mapCh ? ' on' : ''}" data-ch="${c}" aria-label="${esc(chName(c, lang))}"><span class="pic">${scene(c, 120, 80, 't')}</span><b>${c + 1}</b>${op ? `<i style="width:${n / SN * 100}%"></i>` : '<em>🔒</em>'}</button>`; }).join('');
    const body = c => {
      const set = CH[c], op = chOpen(B, c), n = nClr(B, c), o = B[set] || {}, S = E.BOOK.find(x => x.id === set), rl = E.rule(S.z);
      let st = 0; for (let j = 0; j < SN; j++) st += o[j] || 0;
      const rowH = 84, H = SN * rowH + 60, xs = j => 50 + Math.sin(j * .62) * 30;
      let path = ''; for (let j = 0; j < SN; j++) path += (j ? ' L' : 'M') + xs(j).toFixed(1) + ' ' + (40 + j * rowH);
      const nodes = Array.from({ length: SN }, (_, j) => { const k = (c + 1) + '-' + (j + 1), g = GIFTS[k], so = op && stOpen(B, c, j), sv = o[j] || 0, nx = set === fo.set && j === fo.i;
        const gi = g ? `<img class="gf${have.includes('av-' + g[0] + '-' + g[1]) ? ' got' : ''}" src="../images/atlas/av/${g[0]}-${g[1]}.webp" alt=""><span class="gr r${g[1]}">${RK[g[1]]}</span>` : '';
        return `<button type="button" class="hbn${sv ? ' ok' : ''}${so ? '' : ' lk'}${nx ? ' nx' : ''}${g ? ' g' : ''}" style="left:${xs(j)}%;top:${40 + j * rowH}px" ${so ? `data-go="${set}:${j}"` : 'disabled'}><b>${j + 1}</b><i>${sv ? '★'.repeat(sv) + '☆'.repeat(3 - sv) : so ? '☆☆☆' : '🔒'}</i>${gi}</button>`; }).join('');
      const ng = nextGift();
      return `<div class="hbban"><div class="pic">${scene(c, 640, 220, 'b')}</div><div class="cap"><small>${c + 1} / ${CH.length}</small><b>${esc(chName(c, lang))}</b><span>${esc(T('r' + S.z))}${S.hi <= 1 ? ' · ' + esc(T('c1')) : ''}</span></div>
        <div class="prog"><span>${esc(T('clr', { a: n, b: SN }))}</span><span class="st">★ ${st}/${SN * 3}</span><span class="hbbar"><i style="width:${n / SN * 100}%"></i></span></div></div>
        ${op ? '' : `<div class="hblock">🔒 ${esc(T('lock', { n: NEED }))}</div>`}
        <div class="hbpath" style="height:${H}px;--c1:${PAL[c][0]};--c2:${PAL[c][1]};--ac:${PAL[c][3]}"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${path}" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-dasharray="6 8" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${nodes}</div>`;
    };
    const ng = nextGift();
    const foot = () => { const g = nextGift(); return `<div class="hbfoot">${g ? `<img src="../images/atlas/av/${g.sp}-${g.t}.webp" alt=""><div><b>${esc(avName(g.sp, g.t, lang))} <span class="gr r${g.t}">${RK[g.t]}</span></b><small>${esc(T('stg', { s: g.key }))} · ${esc(T('nextGift', { n: g.left }))}</small></div>` : `<div><b>🎉 ${esc(T('allGot'))}</b></div>`}<button type="button" class="hbgo" data-go="${fo.set}:${fo.i}">${esc(T('cont'))} ▶<small>${esc(T('stg', { s: sKey(fo.set, fo.i) }))}</small></button></div>`; };
    if (mapCh < 0 || !chOpen(B, mapCh)) mapCh = cOf(fo.set);
    sh.innerHTML = `<div class="hbmap-in" role="dialog" aria-label="${esc(T('map'))}"><div class="hbmap-h"><b>${esc(T('map'))}</b><button type="button" class="hbmap-x" aria-label="✕">✕</button></div><div class="hbtabs">${tabs()}</div><div class="hbmap-b">${body(mapCh)}</div>${foot()}</div>`;
    document.body.appendChild(sh); requestAnimationFrame(() => sh.classList.add('on'));
    const scrollNx = () => { const n = sh.querySelector('.hbn.nx') || sh.querySelector('.hbn.lk') || null, b = sh.querySelector('.hbmap-b'); if (n && b) b.scrollTop = Math.max(0, n.offsetTop + sh.querySelector('.hbpath').offsetTop - b.clientHeight / 2); };
    requestAnimationFrame(scrollNx);
    const close = () => { sh.classList.remove('on'); setTimeout(() => sh.remove(), 220); };
    sh.addEventListener('click', e => {
      const g = e.target.closest('[data-go]'); if (g) { const [set, i] = g.dataset.go.split(':'); close(); go({ set, i: +i }); return; }
      const tb = e.target.closest('.hbtab'); if (tb) { const c = +tb.dataset.ch; mapCh = c; sh.querySelectorAll('.hbtab').forEach(x => x.classList.toggle('on', +x.dataset.ch === c)); sh.querySelector('.hbmap-b').innerHTML = body(c); requestAnimationFrame(() => { if (chOpen(B, c)) scrollNx(); else sh.querySelector('.hbmap-b').scrollTop = 0; }); tb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); return; }
      if (e.target === sh || e.target.closest('.hbmap-x')) close();
    });
  }
  const bookSheet = stageMap;   // (the card's hook name)
  function bookBtn(lang) {   // the パズル tab's stage box: the chapter's picture, the next stage, the progress, the next Atlamo
    const E = window.HitBlowEngine; if (!E) return '';
    const B = bread(), fo = firstOpen(), c = cOf(fo.set), g = nextGift(); let a = 0; CH.forEach((x, q) => { a += nClr(B, q); });
    return `<button type="button" class="mxb hbd hbstg" data-hbbook="1"><span class="pic">${scene(c, 160, 96, 'k')}</span><span class="tx"><b>${tx(lang, 'map')}</b><small>${tx(lang, 'stg', { s: sKey(fo.set, fo.i) })} · ${chName(c, lang)}</small><span class="hbbar"><i style="width:${a / (CH.length * SN) * 100}%"></i></span></span>${g ? `<span class="gift"><img src="../images/atlas/av/${g.sp}-${g.t}.webp" alt=""><em>${g.left}</em></span>` : ''}</button>`;
  }
  // the daily tab's two buttons (atlas/app.js: #bvDaily; a click sets pending and starts)
  function dailyHtml(lang) {
    const E = window.HitBlowEngine; const lim = k => { try { const P = E && E.makeDaily(today(), k); return P ? P.limit : '?'; } catch (e) { return '?'; } };
    // 勝率 (2026-11-16 user): the days solved / the days played, per EASY · HARD (each day's first try counts; a later solve of the day counts too)
    const o = dread(), rate = k => { const d = Object.values(o[k] || {}), w = d.filter(x => x && x.win).length; return d.length ? `<b class="hbr">${tx(lang, 'rate')} ${Math.round(w / d.length * 100)}%<i>（${w}/${d.length}）</i></b>` : `<b class="hbr">${tx(lang, 'rate')} —</b>`; };
    return bookBtn(lang) + ['easy', 'hard'].map(k => `<button type="button" class="mxb pzd hbd${dailyDone(k) ? ' pzok' : ''}" data-daily="${k}"><span>${tx(lang, 'daily')}</span><em class="ez">${k.toUpperCase()}</em><small><span>${tx(lang, k, { n: lim(k) })}</span>${rate(k)}</small></button>`).join('');
  }
  css();   // (the card's 今日の一問 buttons are styled before a game starts)
  window.Atlas3D = window.Atlas3D || {};
  // the card (2026-11-16 user: 将棋と同じカード): 対戦 (二人で対戦 = the top of 相手) · レート戦 · パズル (今日の一問 EASY / HARD) — adapter.mx
  window.Atlas3D.hitblow = { ortho: true, mx: true, levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], kindFirst: true,
    sizes: [1, 2, 3, 4, 5], size0: 1, sizeLabel: () => '', sizeName, optInfo, levelInfo, modeName, modeNote, dailyHtml, dailyDone, dailyNext, bookSheet, pending: null, start, TX, L14 };
})();
