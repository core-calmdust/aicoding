/* =====================================================================
   Crokinole on the portal — table play (3D only, like carrom: no 2D page).
   · Rules, physics and AI: ../crokinole/engine.js (CrokinoleEngine), the AI thinks in ../crokinole/worker.js.
   · Board and discs: Table3D.MODELS.crokinole (atlas/models/crokinole.js), the boards of the 盤 row.
   · You always shoot from the near quadrant (player 0). "First" = you shoot first in round 1 (the AI has the hammer).
     Two players on one device: the board turns so the player to shoot is always at the bottom.
   · Controls: the carrom hand (Atlas3D.carrom.Hand): slide the disc along your stretch of the shooting line, then pull back
     and let go. The dotted guide shows the first thing it meets.
   · Game length (the size select): 4 rounds as at the World Championship (a round won 2, tied 1), or 100 points (the
     difference of each round goes to its winner).
   ===================================================================== */
(function () {
  'use strict';
  const TXT = {
    ja: { len: 'ゲームの長さ', r4: '4ラウンド', h100: '100点先取', place: '駒を左右に動かして、引っぱって離すとはじくよ', must: '相手の駒に当てよう', open: '15の円まで届かせよう', think: '{p}が狙っている…', turn: '{p}の番', hit: 'ヒット！', tw: '20！ ど真ん中', 'foul.miss': '相手の駒に当たらなかった… 反則で取り除くよ', 'foul.open': '15の円に届かなかった… 反則で取り除くよ', out: '溝へ', round: 'ラウンド{n}：{a} − {b}', roundWin: '{p}がラウンドを取った！', tie: 'ラウンドは引き分け', next: 'ラウンド {n}', hint: 'おすすめ：この位置から、強さ {p}% くらい', score: '{a} − {b}', pts: '{n}点', left: '残り{n}', skip: 'タップで早送り' },
    en: { len: 'Game length', r4: '4 rounds', h100: 'First to 100', place: 'Slide your disc, then pull it back and let go to flick', must: "Hit one of your opponent's discs", open: 'Reach the 15 circle', think: '{p} is aiming…', turn: "{p}'s turn", hit: 'Hit!', tw: 'A 20! Dead centre', 'foul.miss': "No contact with an opponent's disc — it comes off", 'foul.open': "Short of the 15 circle — it comes off", out: 'Into the ditch', round: 'Round {n}: {a} − {b}', roundWin: '{p} takes the round!', tie: 'The round is tied', next: 'Round {n}', hint: 'Try from here, about {p}% power', score: '{a} − {b}', pts: '{n} pts', left: '{n} left', skip: 'Tap to speed up' },
    zh: { len: '对局长度', r4: '4回合', h100: '先到100分', place: '左右移动棋子，向后拉再放开就能弹出', must: '要碰到对方的棋子', open: '要弹进15分圈', think: '{p}正在瞄准…', turn: '轮到{p}', hit: '命中！', tw: '20分！正中心', 'foul.miss': '没碰到对方的棋子…犯规，移出棋盘', 'foul.open': '没到15分圈…犯规，移出棋盘', out: '掉进沟里', round: '第{n}回合：{a} − {b}', roundWin: '{p}赢下这一回合！', tie: '这一回合打平', next: '第{n}回合', hint: '建议：从这里，力度约{p}%', score: '{a} − {b}', pts: '{n}分', left: '剩{n}', skip: '点击快进' },
    'zh-TW': { len: '對局長度', r4: '4回合', h100: '先到100分', place: '左右移動棋子，往後拉再放開就能彈出', must: '要碰到對方的棋子', open: '要彈進15分圈', think: '{p}正在瞄準…', turn: '輪到{p}', hit: '命中！', tw: '20分！正中心', 'foul.miss': '沒碰到對方的棋子…犯規，移出棋盤', 'foul.open': '沒到15分圈…犯規，移出棋盤', out: '掉進溝裡', round: '第{n}回合：{a} − {b}', roundWin: '{p}拿下這一回合！', tie: '這一回合打平', next: '第{n}回合', hint: '建議：從這裡，力道約{p}%', score: '{a} − {b}', pts: '{n}分', left: '剩{n}', skip: '點一下快轉' },
    ko: { len: '게임 길이', r4: '4라운드', h100: '100점 선취', place: '말을 좌우로 옮기고, 뒤로 당겼다 놓으면 튕겨', must: '상대 말을 맞혀야 해', open: '15점 원까지 보내자', think: '{p}이(가) 노리는 중…', turn: '{p}의 차례', hit: '명중!', tw: '20점! 한가운데', 'foul.miss': '상대 말을 못 맞혔어… 반칙이라 치울게', 'foul.open': '15점 원에 못 미쳤어… 반칙이라 치울게', out: '도랑으로', round: '{n}라운드: {a} − {b}', roundWin: '{p}이(가) 라운드를 땄다!', tie: '라운드 무승부', next: '{n}라운드', hint: '추천: 이 위치에서 세기 {p}% 정도', score: '{a} − {b}', pts: '{n}점', left: '남은 {n}', skip: '탭하면 빨리 감기' },
    es: { len: 'Duración', r4: '4 rondas', h100: 'A 100 puntos', place: 'Desliza tu disco, tira hacia atrás y suelta para lanzar', must: 'Toca un disco rival', open: 'Llega al círculo del 15', think: '{p} está apuntando…', turn: 'Turno de {p}', hit: '¡Tocado!', tw: '¡Un 20! En el centro', 'foul.miss': 'No tocaste ningún disco rival: se retira', 'foul.open': 'No llegó al círculo del 15: se retira', out: 'A la zanja', round: 'Ronda {n}: {a} − {b}', roundWin: '¡{p} gana la ronda!', tie: 'Ronda empatada', next: 'Ronda {n}', hint: 'Prueba desde aquí, con un {p}% de fuerza', score: '{a} − {b}', pts: '{n} pts', left: 'Quedan {n}', skip: 'Toca para acelerar' },
    fr: { len: 'Durée', r4: '4 manches', h100: 'En 100 points', place: 'Fais glisser ton palet, tire-le en arrière et lâche pour tirer', must: 'Touche un palet adverse', open: 'Atteins le cercle des 15', think: '{p} vise…', turn: 'À {p}', hit: 'Touché !', tw: 'Un 20 ! Plein centre', 'foul.miss': 'Aucun palet adverse touché : il est retiré', 'foul.open': "N'atteint pas le cercle des 15 : il est retiré", out: 'Dans la rigole', round: 'Manche {n} : {a} − {b}', roundWin: '{p} remporte la manche !', tie: 'Manche nulle', next: 'Manche {n}', hint: "Essaie d'ici, environ {p} % de puissance", score: '{a} − {b}', pts: '{n} pts', left: 'Reste {n}', skip: 'Touche pour accélérer' },
    pt: { len: 'Duração', r4: '4 rodadas', h100: 'Até 100 pontos', place: 'Deslize seu disco, puxe para trás e solte para lançar', must: 'Acerte um disco do rival', open: 'Alcance o círculo do 15', think: '{p} está mirando…', turn: 'Vez de {p}', hit: 'Acertou!', tw: 'Um 20! Bem no centro', 'foul.miss': 'Não tocou em nenhum disco do rival: sai do tabuleiro', 'foul.open': 'Não chegou ao círculo do 15: sai do tabuleiro', out: 'Para a canaleta', round: 'Rodada {n}: {a} − {b}', roundWin: '{p} vence a rodada!', tie: 'Rodada empatada', next: 'Rodada {n}', hint: 'Tente daqui, com uns {p}% de força', score: '{a} − {b}', pts: '{n} pts', left: 'Restam {n}', skip: 'Toque para acelerar' },
    de: { len: 'Spiellänge', r4: '4 Runden', h100: 'Bis 100 Punkte', place: 'Scheibe verschieben, zurückziehen und loslassen zum Schnippen', must: 'Triff eine Scheibe des Gegners', open: 'Erreiche den 15er-Kreis', think: '{p} zielt…', turn: '{p} ist dran', hit: 'Treffer!', tw: 'Eine 20! Mitten rein', 'foul.miss': 'Keine gegnerische Scheibe getroffen – sie kommt vom Brett', 'foul.open': 'Den 15er-Kreis nicht erreicht – sie kommt vom Brett', out: 'In den Graben', round: 'Runde {n}: {a} − {b}', roundWin: '{p} gewinnt die Runde!', tie: 'Runde unentschieden', next: 'Runde {n}', hint: 'Versuch es von hier, etwa {p} % Kraft', score: '{a} − {b}', pts: '{n} P.', left: 'Noch {n}', skip: 'Tippen zum Vorspulen' },
    ru: { len: 'Длина игры', r4: '4 раунда', h100: 'До 100 очков', place: 'Сдвинь шайбу, оттяни назад и отпусти, чтобы щёлкнуть', must: 'Задень шайбу соперника', open: 'Доведи до круга «15»', think: '{p} прицеливается…', turn: 'Ход: {p}', hit: 'Попадание!', tw: '20! В самый центр', 'foul.miss': 'Шайба соперника не задета — снимается', 'foul.open': 'Не дошла до круга «15» — снимается', out: 'В канавку', round: 'Раунд {n}: {a} − {b}', roundWin: '{p} берёт раунд!', tie: 'Раунд вничью', next: 'Раунд {n}', hint: 'Попробуй отсюда, сила около {p}%', score: '{a} − {b}', pts: '{n} оч.', left: 'Осталось {n}', skip: 'Нажми, чтобы ускорить' },
    tr: { len: 'Oyun uzunluğu', r4: '4 tur', h100: '100 sayıya', place: 'Pulunu kaydır, geri çek ve bırakıp fiskele', must: 'Rakibin pullarından birine değ', open: '15 dairesine ulaştır', think: '{p} nişan alıyor…', turn: 'Sıra: {p}', hit: 'İsabet!', tw: '20! Tam ortası', 'foul.miss': 'Rakip pula değmedi — tahtadan alınır', 'foul.open': '15 dairesine ulaşmadı — tahtadan alınır', out: 'Oluğa', round: '{n}. tur: {a} − {b}', roundWin: '{p} turu aldı!', tie: 'Tur berabere', next: '{n}. tur', hint: 'Buradan dene, yaklaşık %{p} güç', score: '{a} − {b}', pts: '{n} sayı', left: '{n} kaldı', skip: 'Hızlandırmak için dokun' },
    id: { len: 'Panjang permainan', r4: '4 ronde', h100: 'Sampai 100', place: 'Geser kepingmu, tarik ke belakang lalu lepas untuk menyentil', must: 'Kenai keping lawan', open: 'Capai lingkaran 15', think: '{p} sedang membidik…', turn: 'Giliran {p}', hit: 'Kena!', tw: 'Angka 20! Tepat di tengah', 'foul.miss': 'Tak mengenai keping lawan — keping diangkat', 'foul.open': 'Tak sampai lingkaran 15 — keping diangkat', out: 'Ke parit', round: 'Ronde {n}: {a} − {b}', roundWin: '{p} memenangkan ronde!', tie: 'Ronde seri', next: 'Ronde {n}', hint: 'Coba dari sini, tenaga sekitar {p}%', score: '{a} − {b}', pts: '{n} poin', left: 'Sisa {n}', skip: 'Ketuk untuk mempercepat' },
    hi: { len: 'खेल की लंबाई', r4: '4 राउंड', h100: '100 अंक तक', place: 'अपनी डिस्क खिसकाओ, पीछे खींचो और छोड़कर मारो', must: 'विरोधी की डिस्क को छुओ', open: '15 वाले घेरे तक पहुँचाओ', think: '{p} निशाना लगा रहा है…', turn: '{p} की बारी', hit: 'निशाना!', tw: '20! ठीक बीच में', 'foul.miss': 'विरोधी की डिस्क नहीं छुई — हटा दी जाएगी', 'foul.open': '15 के घेरे तक नहीं पहुँची — हटा दी जाएगी', out: 'खाई में', round: 'राउंड {n}: {a} − {b}', roundWin: '{p} ने राउंड जीता!', tie: 'राउंड बराबर', next: 'राउंड {n}', hint: 'यहाँ से, लगभग {p}% ताक़त से', score: '{a} − {b}', pts: '{n} अंक', left: '{n} बाकी', skip: 'तेज़ करने के लिए छुओ' },
    ar: { len: 'طول اللعبة', r4: '4 جولات', h100: 'حتى 100 نقطة', place: 'حرّك قرصك، ثم اسحبه للخلف وأفلته لتنقر', must: 'المس أحد أقراص الخصم', open: 'أوصله إلى دائرة الـ15', think: '{p} يصوّب…', turn: 'دور {p}', hit: 'إصابة!', tw: '20! في المنتصف تمامًا', 'foul.miss': 'لم يلمس قرصًا للخصم — يُرفع', 'foul.open': 'لم يبلغ دائرة الـ15 — يُرفع', out: 'إلى الخندق', round: 'الجولة {n}: {a} − {b}', roundWin: '{p} يفوز بالجولة!', tie: 'الجولة تعادل', next: 'الجولة {n}', hint: 'جرّب من هنا بقوة نحو {p}%', score: '{a} − {b}', pts: '{n} نقطة', left: 'بقي {n}', skip: 'المس للتسريع' },
  };
  const LVD = {
    ja: ['入門：狙いが大きくぶれる', '初級：真ん中をねらう', '中級：当てて残す・守りも考える', '上級：20を狙い、正確にはじき出す'],
    en: ['Beginner: a shaky aim', 'Novice: aims for the middle', 'Intermediate: hits and stays, thinks of defence', 'Expert: goes for 20s, takes out precisely'],
    zh: ['入门：瞄得很飘', '初级：瞄准中间', '中级：打中后留在场上，也会防守', '高级：瞄准20分，精准击出'], 'zh-TW': ['入門：瞄得很飄', '初級：瞄準中間', '中級：打中後留在場上，也會防守', '高級：瞄準20分，精準擊出'],
    ko: ['입문: 조준이 크게 흔들린다', '초급: 가운데를 노린다', '중급: 맞히고 남기며 수비도 생각한다', '상급: 20점을 노리고 정확히 쳐낸다'],
    es: ['Inicial: puntería temblorosa', 'Principiante: apunta al centro', 'Intermedio: golpea y se queda, piensa en defender', 'Experto: busca el 20 y saca con precisión'],
    fr: ['Débutant : visée hésitante', 'Novice : vise le centre', 'Intermédiaire : touche et reste, pense à défendre', 'Expert : vise les 20, sort avec précision'],
    pt: ['Iniciante: mira trêmula', 'Básico: mira o centro', 'Intermediário: acerta e fica, pensa na defesa', 'Especialista: busca o 20 e tira com precisão'],
    de: ['Einsteiger: zielt wackelig', 'Anfänger: zielt auf die Mitte', 'Mittel: trifft und bleibt liegen, denkt an Deckung', 'Experte: spielt auf 20, schießt präzise raus'],
    ru: ['Начальный: дрожащий прицел', 'Новичок: целится в центр', 'Средний: бьёт и остаётся, думает о защите', 'Эксперт: идёт на 20, точно выбивает'],
    tr: ['Başlangıç: titrek nişan', 'Acemi: ortayı hedefler', 'Orta: vurur ve kalır, savunmayı düşünür', 'Uzman: 20 arar, isabetle dışarı atar'],
    id: ['Pemula: bidikan goyah', 'Dasar: membidik tengah', 'Menengah: mengenai lalu bertahan, memikirkan pertahanan', 'Ahli: mengincar 20, menyingkirkan dengan tepat'],
    hi: ['शुरुआती: निशाना डगमग', 'नौसिखिया: बीच को निशाना', 'मध्यम: टकराकर टिकता है, बचाव भी सोचता है', 'विशेषज्ञ: 20 पर नज़र, सटीक बाहर करता है'],
    ar: ['مبتدئ: تصويب مرتجف', 'مبتدئ: يصوّب نحو الوسط', 'متوسط: يصيب ويبقى ويفكر في الدفاع', 'خبير: يطلب الـ20 ويُخرج بدقة'],
  };
  const WHO = {
    ja: ['はじめて', 'ルールを覚えた人', '慣れた人', '強い人'], en: ['First game', 'Knows the rules', 'Regular player', 'Strong player'], zh: ['第一次玩', '刚学会规则', '熟练玩家', '强手'], 'zh-TW': ['第一次玩', '懂規則', '常玩的人', '高手'],
    ko: ['처음', '규칙을 익힌 사람', '익숙한 사람', '강한 사람'], es: ['Primera partida', 'Conoce las reglas', 'Jugador habitual', 'Jugador fuerte'], fr: ['Première partie', 'Connaît les règles', 'Joueur régulier', 'Joueur fort'],
    pt: ['Primeira partida', 'Conhece as regras', 'Jogador habitual', 'Jogador forte'], de: ['Erste Partie', 'Kennt die Regeln', 'Geübter Spieler', 'Starker Spieler'], ru: ['Первая игра', 'Знает правила', 'Постоянный игрок', 'Сильный игрок'],
    tr: ['İlk oyun', 'Kuralları biliyor', 'Düzenli oyuncu', 'Güçlü oyuncu'], id: ['Permainan pertama', 'Tahu aturannya', 'Pemain rutin', 'Pemain kuat'], hi: ['पहला खेल', 'नियम जानता है', 'नियमित खिलाड़ी', 'मज़बूत खिलाड़ी'], ar: ['أول مباراة', 'يعرف القواعد', 'لاعب معتاد', 'لاعب قوي'],
  };
  function levelInfo(n, lang) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return { name: 'Lv.' + n, desc: (LVD[lang] || LVD.en)[b], who: (WHO[lang] || WHO.en)[b] }; }
  const SIZES = [4, 100];
  const sizeName = (z, l) => (TXT[l] || TXT.en)[z === 100 ? 'h100' : 'r4'];
  const sizeLabel = l => (TXT[l] || TXT.en).len;

  /* ---------- the carrom hand and its words, with the disc in place of the striker ---------- */
  const SWAP = {
    ja: [['ストライカー', '駒']], en: [['striker', 'disc']], zh: [['击子', '棋子']], 'zh-TW': [['擊子', '棋子']], ko: [['스트라이커', '말']],
    es: [['el striker', 'el disco'], ['striker', 'disco']], fr: [['du striker', 'du palet'], ['au striker', 'au palet'], ['le striker', 'le palet'], ['striker', 'palet']],
    pt: [['do striker', 'do disco'], ['ao striker', 'ao disco'], ['o striker', 'o disco'], ['striker', 'disco']], de: [['zum Striker', 'zur Scheibe'], ['Striker', 'Scheibe']],
    ru: [['страйкеру', 'шайбе'], ['страйкер', 'шайбу']], tr: [['Vurucunun', 'Pulun'], ['vurucuya', 'pula'], ['vurucuyu', 'pulu'], ['Vurucu', 'Pul'], ['vurucu', 'pul']],
    id: [['striker', 'keping']], hi: [['स्ट्राइकर', 'डिस्क']], ar: [['الضارب', 'القرص']],
  };
  const swapIn = (o, lang) => { let s = JSON.stringify(o); (SWAP[lang] || []).forEach(([a, b]) => { s = s.split(a).join(b); }); return JSON.parse(s); };
  const AC = () => window.Atlas3D.carrom;
  const mousey = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };
  const howFor = lang => swapIn((AC().HOW[lang] || AC().HOW.en), lang)[mousey() ? 'm' : 't'];
  const howtoFor = lang => swapIn((AC().HOWTO[lang] || AC().HOWTO.en), lang);

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, E = window.CrokinoleEngine, D = E.DIM, SND = AC().SND;
    const lang = ctx.lang, L = TXT[lang] || TXT.en;
    const tx = (k, o) => { let s = L[k] != null ? L[k] : (TXT.en[k] != null ? TXT.en[k] : k); if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6)), mode = +ctx.size === 100 ? '100' : 'r4';
    const youFirst = (+ctx.side || 1) === 1;
    const board = T3.MODELS.crokinole(true); T3.show('crokinole', board);
    const U = board.userData, Y = U.top, K = U.K, W = 2 * U.RO;
    const VK = 'atlas-crokinole-view';
    let topView = false; try { topView = localStorage.getItem(VK) === 'top'; } catch (e) {}
    const baseFit = () => { const port = innerHeight > innerWidth * 1.1, pitch = topView ? (port ? 1.36 : 1.3) : .82; return port ? { w: W * .8, d: W * .8, y: Y, pitch } :   // phones: the board a touch wider than the screen (the rail's sides run off it)
       { w: W + .25, d: W + .3, y: Y, pitch }; };
    if (T3.fit) T3.fit(baseFit());
    const onResize = () => { if (T3.fit) T3.fit(baseFit()); };
    addEventListener('resize', onResize);
    let st = null, phase = 'wait', over = false, stopped = false, busy = false, tok = 0, msg = '', hintShot = null, ply = 0;
    let sx = 0, aimAng = -Math.PI / 2, aimPow = 0, drag = null, speedUp = 1, told = false;
    const hist = [], timers = [];
    const later = (f, ms) => { const my = tok; timers.push(setTimeout(() => { if (!stopped && my === tok) f(); }, ms)); };
    const human = p => pvp || p === 0;
    const COLN = { ja: ['赤', '黒'], en: ['Red', 'Black'], zh: ['红', '黑'], 'zh-TW': ['紅', '黑'], ko: ['빨강', '검정'], es: ['Rojo', 'Negro'], fr: ['Rouge', 'Noir'], pt: ['Vermelho', 'Preto'], de: ['Rot', 'Schwarz'], ru: ['Красные', 'Чёрные'], tr: ['Kırmızı', 'Siyah'], id: ['Merah', 'Hitam'], hi: ['लाल', 'काला'], ar: ['الأحمر', 'الأسود'] };
    const nameOf = p => pvp ? (COLN[lang] || COLN.en)[p] : p === 0 ? t('p.you') : t('p.ai');
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const wx = (x, y) => U.xz(x, y);
    const by = (p, x) => E.baseY(p, x);
    // the pull → the speed: a square, so the soft draws to the middle (a third of the pull) can be judged finely
    const vOf = pw => 20 + (E.VMAX - 20) * pw * pw, powOf = v => Math.sqrt(Math.max(0, Math.min(1, (v - 20) / (E.VMAX - 20))));

    /* ---------- the discs: one mesh per disc shot this round (index = engine id), the one in hand, the ones in the ditch ---------- */
    const pcs = [];
    let hand1 = null;   // the disc about to be shot
    function mk(c) { const g = U.piece(c), sh = T3.contact(D.RD * K * 1.15, .42); sh.position.y = .004; g.add(sh); board.add(g); return g; }
    function placeMesh(g, x, y, h) { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); }
    function ditchAt(g, x, y) { const d = Math.hypot(x, y) || 1, r = U.RDITCH, [a, b] = wx(x / d * r, y / d * r); g.position.set(a, U.DITCHY, b); g.visible = true; g.userData.ditch = true; }
    function clearDiscs() { pcs.forEach(g => board.remove(g)); pcs.length = 0; if (hand1) { board.remove(hand1); hand1 = null; } kick(200); }
    function syncAll() {
      st.pcs.forEach((m, i) => {
        let g = pcs[i]; if (!g) g = pcs[i] = mk(m.c);
        g.scale.setScalar(1);
        if (m.on) { g.userData.ditch = false; g.visible = true; placeMesh(g, m.x, m.y); }
        else if (!g.userData.ditch && !g.userData.sunk) g.visible = false;
      });
      kick(200);
    }
    function newHand(p) { if (hand1) board.remove(hand1); hand1 = mk(p); hand1.visible = true; return hand1; }

    /* ---------- the guides ---------- */
    const gd = new TH.Group(); board.add(gd);
    const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { arrow: basic(0xffffff, .95), path: basic(0xffffff, .85), hint: basic(0xff3d7f, .95), man: basic(0x3df59a, .95), base: basic(0x3df59a, .35), ring: basic(0xffd34d, .95) };
    const GEO = { bar: new TH.BoxGeometry(1, .006, 1), ring: new TH.TorusGeometry(D.RD * K, .012, 6, 40), cone: new TH.ConeGeometry(.08, .2, 3) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cone.rotateX(Math.PI / 2);
    function clearGuides() { while (gd.children.length) { const c = gd.children[0]; gd.remove(c); if (c.userData.own) c.geometry.dispose(); } kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return null;
      const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2);
      m.position.set(a, Y + (lift || .03), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); return m;
    }
    function dots(x0, y0, x1, y1, mat) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 1.6); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .55) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, .32, mat); } }
    function ring(x, y, mat, s) { const m = new TH.Mesh(GEO.ring, mat), [a, b] = wx(x, y); m.position.set(a, Y + .035, b); m.scale.setScalar(s || 1); m.renderOrder = 4; gd.add(m); return m; }
    function arcBand(p, wid) {   // your stretch of the shooting line, lit
      const a0 = Math.PI / 4, n = 40, r0 = (D.R5 - wid / 2) * K, r1 = (D.R5 + wid / 2) * K;
      const g = new TH.RingGeometry(r0, r1, n, 1, (p === 0 ? Math.PI / 2 : -Math.PI / 2) - a0, 2 * a0); g.rotateX(Math.PI / 2);
      const m = new TH.Mesh(g, MAT.base); m.userData.own = true; const [a, b] = wx(0, 0); m.position.set(a, Y + .012, b); m.renderOrder = 4; gd.add(m);
    }
    function showGuides() {
      clearGuides();
      if (phase !== 'place' || !st || !human(st.turn)) return;
      const p = st.turn, y0 = by(p, sx);
      arcBand(p, COARSE ? 2 * D.RD + 2.6 : 2 * D.RD + .4);
      const ang = drag && drag.kind === 'aim' ? aimAng : hintShot ? hintShot.ang : null;
      const mt = hintShot && !(drag && drag.kind === 'aim') ? MAT.hint : MAT.path;
      if (ang != null) {
        const tr = E.aimTrace(st, p, sx, ang);
        dots(sx, y0, tr.gx, tr.gy, mt);
        ring(tr.gx, tr.gy, mt);
        if (tr.man >= 0) { const m = st.pcs[tr.man]; bar(m.x, m.y, m.x + tr.ox * 9, m.y + tr.oy * 9, .5, MAT.man); }
        if (drag && drag.kind === 'aim') {
          const L0 = D.RD + 2 + aimPow * 18, ex = sx + Math.cos(ang) * L0, ey = y0 + Math.sin(ang) * L0;
          MAT.arrow.color.copy(new TH.Color().setHSL(.33 - aimPow * .33, .9, .55));
          bar(sx + Math.cos(ang) * D.RD, y0 + Math.sin(ang) * D.RD, ex, ey, COARSE ? 1.5 : .9, MAT.arrow, .045);
          const c = new TH.Mesh(GEO.cone, MAT.arrow), [a, b] = wx(ex, ey); c.position.set(a, Y + .05, b); c.rotation.y = -ang + Math.PI / 2; c.renderOrder = 5; gd.add(c);
        }
      }
      if (!drag) { const r = ring(sx, y0, MAT.ring, 1.25); r.userData.pulse = 1; }
      kick(120);
    }
    let pulseT = 0;
    function pulse() { clearInterval(pulseT); const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || document.hidden || !document.hasFocus()) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(1.12 + Math.sin((performance.now() - t0) / 230) * .1); any = true; } }); if (any) kick(80); }, 60); }

    /* ---------- HUD (the carrom look: .crp pills, .crtoast, the how-to card) ---------- */
    const css = document.createElement('style');
    css.textContent = '.hud .ckp{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-weight:800;font-size:13px;opacity:.62;white-space:nowrap}.hud .ckp.on{opacity:1;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hud .ckp i{width:15px;height:15px;border-radius:50%;display:inline-block;flex:none;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.3)}.hud .ckp b{font-size:14px}.hud .ckp small{font-weight:700;opacity:.75}.hud .ckm{display:flex;flex-direction:column;align-items:center;min-width:0;font-weight:800;font-size:13px;line-height:1.25;max-width:44vw;text-align:center}.hud .ckm small{font-size:11px;font-weight:700;opacity:.7;white-space:nowrap}.hud .ckm span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.cktask{position:fixed;left:50%;top:calc(80px + env(safe-area-inset-top));transform:translateX(-50%);z-index:85;max-width:min(92vw,480px);padding:8px 18px;border-radius:99px;background:rgba(255,255,255,.96);color:#1d2133;font-weight:900;font-size:15px;pointer-events:none;text-align:center;white-space:nowrap;box-shadow:0 0 0 2.5px #b8742a,0 6px 18px rgba(0,0,0,.25)}.cktask[hidden]{display:none}.cktoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:11px 22px;border-radius:22px;background:#fff;color:#1d2133;font-weight:900;font-size:16px;box-shadow:0 0 0 3px #b8742a,0 10px 26px rgba(0,0,0,.4);pointer-events:none;text-align:center;line-height:1.45;white-space:pre-line}.cktoast.good{color:#12684a;box-shadow:0 0 0 3px #1f7a55,0 10px 26px rgba(0,0,0,.4)}.cktoast.bad{color:#a8323a;box-shadow:0 0 0 3px #a8323a,0 10px 26px rgba(0,0,0,.4)}.ckpow{position:fixed;z-index:6;pointer-events:none;padding:4px 10px;border-radius:99px;background:rgba(20,22,34,.82);color:#fff;font-weight:900;font-size:14px;transform:translate(-50%,-150%);white-space:nowrap}.ckhow{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.55);padding:16px}.ckhow-c{background:#fff;color:#1d2133;border-radius:24px;box-shadow:0 0 0 4px #b8742a,0 18px 50px rgba(0,0,0,.45);padding:22px 22px 18px;width:min(440px,100%);max-height:100%;overflow:auto}.ckhow h2{margin:0 0 14px;font-size:24px;font-weight:900;text-align:center;color:#b8742a}.ckhow ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.ckhow li{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:800;line-height:1.35}.ckhow li i{flex:none;width:40px;height:40px;border-radius:50%;background:#f8ead8;color:#b8742a;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;font-weight:900}.ckhow .u{margin:12px 0 0;font-size:14px;font-weight:700;color:#5b6074;text-align:center}.ckhow label{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0 6px;font-size:16px;font-weight:800;cursor:pointer}.ckhow label input{width:20px;height:20px;accent-color:#b8742a}.ckhow .n{margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7083;text-align:center}.ckhow button{display:block;width:100%;padding:13px;border:0;border-radius:99px;background:#b8742a;color:#fff;font:inherit;font-size:18px;font-weight:900;cursor:pointer}.ckflip{position:fixed;left:calc(16px + env(safe-area-inset-left));bottom:calc(22px + env(safe-area-inset-bottom));z-index:40;width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#2b3044;box-shadow:0 4px 14px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.ckflip svg{width:28px;height:28px}.ckflip.on{background:#b8742a;color:#fff}.ckview{left:calc(80px + env(safe-area-inset-left))}@media (max-width:560px){.ckview{left:auto;right:calc(16px + env(safe-area-inset-right))}.hud .ckp{padding:3px 7px;font-size:12px}.hud .ckp .nm{display:none}.hud .ckm{font-size:12px}.cktoast{font-size:14px;padding:9px 16px;border-radius:18px}}';
    document.head.appendChild(css);
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const HK = 'atlas-crokinole-howto';
    const howtoOn = () => { try { return localStorage.getItem(HK) !== 'off'; } catch (e) { return true; } };
    let cardEl = null;
    function howtoCard(done) {
      const H = howtoFor(lang), steps = H[mousey() ? 'm' : 't'], ic = ['↔', '↓', '↔', '☝'];
      const d = document.createElement('div'); d.className = 'ckhow'; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
      d.innerHTML = `<div class="ckhow-c" role="dialog" aria-modal="true"><h2>${esc(H.title)}</h2><ol>${steps.map((x, i) => `<li><i>${ic[i]}</i><span>${esc(x)}</span></li>`).join('')}</ol>${mousey() && H.pad ? `<p class="u" style="margin-top:10px">💻 ${esc(H.pad)}</p>` : ''}<p class="u">${esc(H.undo)}</p><label><input type="checkbox"> ${esc(H.never)}</label><p class="n">${esc(H.note.replace('{r}', t('bv.rules')))}</p><button type="button">${esc(H.ok)}</button></div>`;
      const close = () => { if (d.querySelector('input').checked) { try { localStorage.setItem(HK, 'off'); } catch (e) {} } d.remove(); cardEl = null; done && done(); };
      d.querySelector('button').onclick = close;
      ['pointerdown', 'pointermove', 'pointerup'].forEach(k => d.addEventListener(k, e => e.stopPropagation()));
      document.body.appendChild(d); cardEl = d;
    }
    let toastEl = null, toastT = 0;
    function toast(m, kind) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'cktoast' + (kind ? ' ' + kind : ''); toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, Math.max(1700, m.length * 70)); }
    const powEl = document.createElement('div'); powEl.className = 'ckpow'; powEl.hidden = true; document.body.appendChild(powEl);
    const dotCol = p => U.dot ? U.dot(p) : (p === 0 ? '#b3312a' : '#1e1a17');
    function hud() {
      if (stopped || !st) return;
      const tl = E.tally(st);
      const pill = p => `<span class="ckp ${st.turn === p && !over && !st.roundOver ? 'on' : ''}"><i style="background:${dotCol(p)}"></i><span class="nm">${esc(nameOf(p))}</span><b>${tl[p]}</b><small>${esc(tx('left', { n: st.left[p] }))}</small></span>`;
      const sc = `<small>${esc(tx('next', { n: st.round }))} · ${esc(tx('score', { a: st.score[1], b: st.score[0] }))}</small>`;
      ctx.hud(pill(1) + `<span class="ckm">${sc}<span>${esc(msg)}</span></span>` + pill(0));
    }
    // what to do this shot ("hit an opponent's disc" / "reach the 15 circle"): a pill above the board, not in the HUD
    const taskEl = document.createElement('div'); taskEl.className = 'cktask'; taskEl.hidden = true; document.body.appendChild(taskEl);
    const task = m => { if (stopped) return; taskEl.textContent = m || ''; taskEl.hidden = !m; };
    const say = m => { msg = m || ''; hud(); task(''); };

    /* ---------- the AI ---------- */
    let worker = null, wid = 0; const pend = {};
    try { worker = new Worker('../crokinole/worker.js?v=2'); worker.onmessage = e => { const d = e.data || {}, f = pend[d.id]; if (f) { delete pend[d.id]; f(d.shot || null); } }; worker.onerror = () => { worker = null; Object.keys(pend).forEach(k => { const f = pend[k]; delete pend[k]; f(null); }); }; } catch (e) { worker = null; }
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

    /* ---------- the night board: discs flash when they knock; the RGB keeps flowing through the game ---------- */
    const flashing = new Set(); let flashRaf = 0;
    function flash(g, v) { if (!g || !g.userData.flash) return; g.userData.ft = performance.now(); g.userData.fk = Math.min(.85, .3 + v / 420); flashing.add(g); if (!flashRaf) flashRaf = requestAnimationFrame(flashStep); }
    function flashStep() { flashRaf = 0; if (stopped) return; const now = performance.now(); flashing.forEach(g => { const k = g.userData.fk * Math.max(0, 1 - (now - g.userData.ft) / 420); g.userData.flash(k * k); if (k <= 0) flashing.delete(g); }); kick(80); if (flashing.size) flashRaf = requestAnimationFrame(flashStep); }
    let waveT = 0;
    function neonTick() { clearInterval(waveT); if (stopped || U.look !== 'neon') return; waveT = setInterval(() => { if (stopped) return clearInterval(waveT); if (!document.hidden && document.hasFocus()) kick(160); }, 100); }

    /* ---------- playing a shot back ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, N = sim.shooter, t0 = performance.now(), gone = {};
        const sunk = new Set(sim.sunk.map(e => e.i));
        let ev = 0, el = 0, last = t0;
        (function step(now) {
          if (stopped) return done();
          now = performance.now(); el += Math.max(0, now - last) / 1000 * speedUp; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi];
          for (let i = 0; i <= N; i++) {
            const g = i === N ? hand1 : pcs[i]; if (!g) continue;
            const on = f[i * 3 + 2];
            if (on) { placeMesh(g, f[i * 3], f[i * 3 + 1]); g.visible = true; continue; }
            if (!g.visible || g.userData.ditch) continue;
            // into the hole (drops) or over the edge into the ditch
            if (!gone[i]) gone[i] = { t: el, x: f[i * 3], y: f[i * 3 + 1], hole: sunk.has(i) };
            const s = gone[i], k = Math.min(1, (el - s.t) / .25);
            if (s.hole) { placeMesh(g, s.x * (1 - k), s.y * (1 - k), -k * k * .25); if (k >= 1) { g.visible = false; g.userData.sunk = true; } }
            else { const d = Math.hypot(s.x, s.y) || 1, r = D.RB + (U.RDITCH / K - D.RB) * k; placeMesh(g, s.x / d * r, s.y / d * r, -k * (Y - U.DITCHY)); if (k >= 1) ditchAt(g, s.x, s.y); }
          }
          while (ev < sim.events.length && sim.events[ev].t <= el) {
            const e = sim.events[ev++], pg = i => i == null ? null : i === N ? hand1 : pcs[i];
            if (e.k === 'hit' && e.v > 8) SND.hit(e.v); else if (e.k === 'peg' && e.v > 15) SND.cush(e.v * .6); else if (e.k === 'hole') SND.pocket(); else if (e.k === 'ditch') SND.cush(60);
            if (e.k === 'hit' && e.v > 25) { flash(pg(e.a), e.v); flash(pg(e.b), e.v); }
            else if (e.k === 'peg' && e.v > 40) flash(pg(e.i), e.v);
            else if (e.k === 'hole') flash(pg(e.i), 200);
          }
          kick(120);
          if (fi < F.length - 1 || Object.values(gone).some(s => el - s.t < .25)) requestAnimationFrame(step);
          else done();
        })(t0);
      });
    }
    // discs removed by the rules (a foul, at rest on the outer line): slide off into the ditch
    function toDitch(ids) {
      if (!ids.length) return Promise.resolve();
      return new Promise(done => {
        const t0 = performance.now(), from = ids.map(i => ({ i, x: (pcs[i].position.x) / K, y: (pcs[i].position.z) / K }));
        (function step(now) {
          if (stopped) return done();
          const k = Math.min(1, Math.max(0, now - t0) / 380), e = k * k;
          from.forEach(o => { const g = pcs[o.i]; if (!g) return; const d = Math.hypot(o.x, o.y) || 1, r = d + (U.RDITCH / K - d) * e; placeMesh(g, o.x / d * r, o.y / d * r, Math.sin(k * Math.PI) * .25 - e * (Y - U.DITCHY)); });
          kick(120);
          if (k < 1) requestAnimationFrame(step); else { from.forEach(o => pcs[o.i] && ditchAt(pcs[o.i], o.x, o.y)); SND.place(); done(); }
        })(t0);
      });
    }
    function slideDisc(p, x0, x1, ms) {
      return new Promise(done => {
        const t0 = performance.now(); hand1.visible = true;
        (function step(now) {
          if (stopped) return done();
          const k = Math.min(1, Math.max(0, now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, x = x0 + (x1 - x0) * e;
          placeMesh(hand1, x, by(p, x), Math.sin(k * Math.PI) * .03); kick(100);
          if (k < 1) requestAnimationFrame(step); else done();
        })(t0);
      });
    }

    /* ---------- the flow ---------- */
    async function shoot(shot) {
      if (over || stopped || busy) return;
      busy = true; phase = 'anim'; clearGuides(); drag = null; hintShot = null; powEl.hidden = true;
      const p = st.turn, s0 = st;
      SND.flick();
      const sim = E.simulate(s0, p, shot, { frames: true });
      speedUp = 1; say('');
      await playback(sim); if (stopped) return;
      const r = E.resolve(s0, sim);
      pcs[sim.shooter] = hand1; hand1 = null;
      st = r.s; ply++;
      const off = r.s.pcs.map((m, i) => !m.on && sim.fin[i] && sim.fin[i].on ? i : -1).filter(i => i >= 0);
      await toDitch(off); if (stopped) return;
      syncAll(); busy = false;
      const lead = r.foul ? r.msg[0] : r.tw[p] ? 'tw' : r.msg.includes('hit') ? 'hit' : '';
      if (lead && lead !== 'round') { toast(tx(lead), r.foul ? 'bad' : 'good'); if (r.foul) SND.bad(); else if (r.tw[p]) SND.good(); }
      if (st.roundOver) return later(roundEnd, 700);
      later(next, 800);
    }
    function onTurn() { if (ctx.onTurn) ctx.onTurn(st.turn === 0 ? 0 : 1, { human: human(st.turn), ply }); }
    const turnSay = () => { const p = st.turn, need = st.pcs.some(m => m.on && m.c !== p) ? tx('must') : tx('open'); say(pvp ? tx('turn', { p: nameOf(p) }) : t('p.turn')); task(need); };
    async function next() {
      if (over || stopped) return;
      hintShot = null; clearGuides(); onTurn();
      const p = st.turn;
      if (pvp) viewTo();
      newHand(p);
      if (human(p)) {
        if (!pvp) hist.push({ st: E.clone(st) });
        sx = E.nearestFree(st, p, sx || 0);
        placeMesh(hand1, sx, by(p, sx));
        phase = 'place'; turnSay();
        if (!told && howtoOn()) howtoCard(() => {}); told = true;
        showGuides(); pulse();
        return;
      }
      phase = 'ai'; say(tx(matchMedia('(max-width:560px)').matches ? 'turn' : 'think', { p: nameOf(p) }));   // phones: just "AI's turn" (the longer line wraps)
      const x0 = E.nearestFree(st, p, 0); placeMesh(hand1, x0, by(p, x0));
      const my = tok;
      const shot = await think(E.clone(st), level);
      if (stopped || my !== tok) return;
      const real = E.perform(shot, level, (Math.random() * 1e9) | 0);
      await slideDisc(p, x0, shot.x, 380); if (stopped || my !== tok) return;
      clearGuides(); const tr = E.aimTrace(st, p, shot.x, shot.ang); dots(shot.x, by(p, shot.x), tr.gx, tr.gy, MAT.path); kick(150);
      await new Promise(r => later(r, 420)); if (stopped || my !== tok) return;
      shoot(real);
    }
    function roundEnd() {
      const t2 = st.roundPts, w = t2[0] > t2[1] ? 0 : t2[1] > t2[0] ? 1 : -1;
      hud();
      const line = tx('round', { n: st.round, a: t2[1], b: t2[0] }) + '\n' + (w < 0 ? tx('tie') : tx('roundWin', { p: nameOf(w) }));
      if (!st.over) {
        toast(line, w === 0 || (pvp && w >= 0) ? 'good' : w < 0 ? '' : 'bad'); (w === 1 && !pvp ? SND.bad : SND.good)();
        later(() => { st = E.nextRound(st); clearDiscs(); syncAll(); toast(tx('next', { n: st.round })); hist.length = 0; later(next, 900); }, 2600);
        return;
      }
      over = true; phase = 'over'; clearGuides(); if (ctx.onTurn) ctx.onTurn(-1); flipBtn.hidden = viewBtn.hidden = true; if (pvp) viewTo(0);
      SND.win();
      const score = tx('score', { a: st.score[0], b: st.score[1] }), mw = st.winner;
      if (pvp) { say(line); return later(() => ctx.onEnd({ win: false, draw: mw < 0, level, score, pvp: true, winnerText: (mw < 0 ? tx('tie') : tx('roundWin', { p: nameOf(mw) }).replace(/ラウンドを取った|takes the round/, '')) + ' · ' + score }), 1400); }
      say(mw === 0 ? t('res.win') : mw < 0 ? t('res.draw') : t('res.lose'));
      toast(line, mw === 0 ? 'good' : 'bad');
      later(() => ctx.onEnd({ win: mw === 0, draw: mw < 0, level, score }), 1400);
    }

    /* ---------- your hand (the carrom hand, along the arc) ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    function moveDisc(x) { const nx = E.nearestFree(st, st.turn, x); if (Math.abs(nx - sx) > .001) { sx = nx; placeMesh(hand1, sx, by(st.turn, sx)); kick(100); } }
    const canAim = () => !cardEl && !stopped && !over && !busy && phase === 'place' && !!st && human(st.turn);
    const hand = AC().Hand({
      el: ctx.el, toCm, canAim,
      sign: () => st && st.turn === 1 ? -1 : 1,
      striker: () => sx, home: () => ({ x: sx, y: by(st.turn, sx) }),
      place: x => { hintShot = null; moveDisc(x); showGuides(); },
      aim: a => {
        if (!a) { drag = null; powEl.hidden = true; if (canAim()) { turnSay(); showGuides(); } return; }
        drag = { kind: 'aim' }; aimAng = a.ang; aimPow = a.pow; hintShot = null;
        powEl.hidden = false; powEl.textContent = Math.round(aimPow * 100) + '%'; powEl.style.left = a.e.clientX + 'px'; powEl.style.top = a.e.clientY + 'px';
        say('💪 ' + Math.round(aimPow * 100) + '%'); showGuides();
      },
      shoot: (ang, pw) => shoot(E.wobble({ x: sx, ang, v: vOf(pw) }, (Math.random() * 1e9) | 0)),   // the hand wobbles a little (engine wobble)
      tap: () => { if (phase === 'anim' && !stopped) speedUp = 3; },
    });

    /* ---------- 盤面反転 and the view switch (as carrom) ---------- */
    const FK = 'atlas-flip-crokinole';
    let flipped = false; try { flipped = localStorage.getItem(FK) === '1'; } catch (e) {}
    let viewA = 0, viewRaf = 0;
    function viewTo(base, now) {
      if (base == null) base = pvp && st && st.turn === 1 && !over ? Math.PI : 0;
      let to = base + (flipped ? Math.PI : 0); to = ((to % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (!T3.turn) return;
      cancelAnimationFrame(viewRaf);
      let from = viewA; if (to - from > Math.PI + 1e-6) from += 2 * Math.PI; else if (from - to > Math.PI + 1e-6) from -= 2 * Math.PI;
      const Dm = now || Math.abs(to - from) < 1e-3 ? 0 : 750, t0 = performance.now(), ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const set = (a, sc) => { viewA = a; const m = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (Math.abs(m) < 1e-4 && sc === 1) T3.turn(null); else T3.turn(a, sc); };
      if (!Dm) { set(to, 1); return; }
      const step = () => { if (stopped) return; const k = Math.min(1, (performance.now() - t0) / Dm), e = ease(k); set(from + (to - from) * e, 1 - .16 * Math.sin(Math.PI * e)); if (k < 1) viewRaf = requestAnimationFrame(step); else set(to, 1); };
      viewRaf = requestAnimationFrame(step);
    }
    const FLIPT = { ja: '盤面を反転', en: 'Flip the board', zh: '翻转棋盘', ko: '판 뒤집기', es: 'Girar el tablero', fr: 'Retourner le plateau', pt: 'Girar o tabuleiro', de: 'Brett drehen', hi: 'बोर्ड पलटें', ar: 'قلب اللوحة', ru: 'Перевернуть доску', 'zh-TW': '翻轉棋盤', id: 'Balik papan', tr: 'Tahtayı çevir' };
    const flipBtn = document.createElement('button'); flipBtn.type = 'button'; flipBtn.className = 'ckflip';
    flipBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0 1 14.3-3.3"/><path d="M18.6 2.6v3.3h-3.3"/><path d="M20 15a8 8 0 0 1-14.3 3.3"/><path d="M5.4 21.4v-3.3h3.3"/><circle cx="12" cy="12" r="3"/></svg>';
    flipBtn.title = FLIPT[lang] || FLIPT.en; flipBtn.setAttribute('aria-label', flipBtn.title);
    const flipSync = () => { flipBtn.classList.toggle('on', flipped); flipBtn.setAttribute('aria-pressed', flipped ? 'true' : 'false'); };
    function flip() { if (stopped) return; flipped = !flipped; try { localStorage.setItem(FK, flipped ? '1' : '0'); } catch (e) {} flipSync(); hand.cancel(); viewTo(); }
    flipBtn.addEventListener('click', e => { e.preventDefault(); flip(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => flipBtn.addEventListener(k, e => e.stopPropagation()));
    const layer = document.getElementById('bv') || document.body;
    neonTick(); flipSync(); layer.appendChild(flipBtn);
    viewTo(0, true);
    const VIEWT = { ja: ['上から見る', '斜めから見る'], en: ['View from above', 'View at an angle'], zh: ['从上方看', '斜着看'], 'zh-TW': ['從上方看', '斜著看'], ko: ['위에서 보기', '비스듬히 보기'], es: ['Vista desde arriba', 'Vista en ángulo'], fr: ['Vue de dessus', 'Vue en biais'], pt: ['Ver de cima', 'Ver em ângulo'], de: ['Von oben', 'Schräg von oben'], ru: ['Вид сверху', 'Вид под углом'], tr: ['Üstten bak', 'Açılı bak'], id: ['Lihat dari atas', 'Lihat miring'], hi: ['ऊपर से देखें', 'तिरछा देखें'], ar: ['عرض من الأعلى', 'عرض مائل'] };
    const viewBtn = document.createElement('button'); viewBtn.type = 'button'; viewBtn.className = 'ckflip ckview';
    const ICO_TOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/></svg>';
    const ICO_ANG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="9" ry="5.5"/><ellipse cx="12" cy="13" rx="2.6" ry="1.5"/></svg>';
    const viewSync = () => { const Lv = VIEWT[lang] || VIEWT.en, lab = topView ? Lv[1] : Lv[0]; viewBtn.innerHTML = topView ? ICO_ANG : ICO_TOP; viewBtn.title = lab; viewBtn.setAttribute('aria-label', lab); };
    function toggleView() { if (stopped) return; topView = !topView; try { localStorage.setItem(VK, topView ? 'top' : 'angle'); } catch (e) {} viewSync(); hand.cancel(); if (T3.fit) T3.fit(baseFit()); kick(800); }
    viewBtn.addEventListener('click', e => { e.preventDefault(); toggleView(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => viewBtn.addEventListener(k, e => e.stopPropagation()));
    viewSync(); layer.appendChild(viewBtn);
    const onFlipKey = e => { if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) flip(); };
    document.addEventListener('keydown', onFlipKey);
    const onKey = e => {
      if (stopped || phase !== 'place' || !st || !human(st.turn) || drag) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d) return;
      e.preventDefault(); moveDisc(sx + d * (e.shiftKey ? .25 : 1) * (st.turn === 1 && pvp ? -1 : 1) * (flipped ? -1 : 1)); showGuides();
    };
    document.addEventListener('keydown', onKey);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';

    /* ---------- go ---------- */
    st = E.newRound({ first: youFirst ? 0 : 1, mode });
    syncAll(); hud();
    later(next, 650);

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
        tok++; hist.pop(); const h = hist.pop(); st = E.clone(h.st); busy = false; drag = null;
        pcs.slice(st.pcs.length).forEach(g => board.remove(g)); pcs.length = st.pcs.length;
        pcs.forEach(g => { g.userData.ditch = false; g.userData.sunk = false; });
        syncAll(); st.pcs.forEach((m, i) => { if (!m.on) pcs[i].visible = false; });
        next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const my = tok; say('💡…');
        return think(E.clone(st), 20).then(shot => {
          if (stopped || my !== tok || phase !== 'place') return false;
          if (shot) { hintShot = shot; sx = E.nearestFree(st, st.turn, shot.x); placeMesh(hand1, sx, by(st.turn, sx)); toast(tx('hint', { p: Math.round(powOf(shot.v) * 100) })); }
          turnSay(); showGuides(); return true;
        });
      },
      canResign: () => !stopped && !over && !!st,
      resign() { finish('resign'); },
      timeout() { finish('time'); },
      stop() {
        stopped = true; tok++; timers.forEach(clearTimeout); clearInterval(pulseT);
        hand.stop();
        document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); ctx.el.style.touchAction = prevTouch;
        css.remove(); powEl.remove(); taskEl.remove(); if (toastEl) toastEl.remove(); if (cardEl) cardEl.remove(); if (worker) worker.terminate();
        cancelAnimationFrame(viewRaf); clearInterval(waveT); cancelAnimationFrame(flashRaf); flipBtn.remove(); viewBtn.remove(); document.removeEventListener('keydown', onFlipKey); if (T3.turn) T3.turn(null);
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
      },
      _debug: { st: () => st, phase: () => phase, shoot: (x, ang, pw) => { if (phase !== 'place') return false; sx = E.nearestFree(st, st.turn, x); shoot({ x: sx, ang, v: vOf(pw) }); return true; }, shootRaw: sh => { if (phase !== 'place') return false; sx = sh.x; shoot(sh); return true; }, at: (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); }, disc: () => sx },
    };
    window.__crokinoleTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.crokinole = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 4, sizeLabel, sizeName, levelInfo, start, TXT, howFor, howtoFor };
})();
