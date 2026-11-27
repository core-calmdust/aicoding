/* 麻雀（riichi/、2026-11-27）— the Atlas' adapter for the game (card) (ユーザー「タイトル画面ではなく大百科のUIに統合」):
   the right column of the board card picks what to play — 段位戦 / フリー対局 / オンライン, 東風戦 / 半荘戦, the CPU's Lv.1–10 —
   and the big button opens the game page straight onto the table (riichi/?go=…); ルール・レッスン・戦績 open its lists the same way.
   The choice is the game's own (riichi-v1 .set: mode, len, clv), so the card and the game always agree.
   atlas/app.js: bvCard asks AtlasRiichiCard.html(lang) for the column and calls bind() after drawing it. */
(function () {
  'use strict';
  const KEY = 'riichi-v1';
  const N = (ja, en, zh, ko, es, fr, pt, de, hi, ar, ru, zhTW, id, tr) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar, ru, 'zh-TW': zhTW, id, tr });
  const TX = {
    ranked: N('段位戦', 'Ranked', '段位战', '단위전', 'Clasificatoria', 'Classée', 'Ranqueada', 'Rangliste', 'रैंक मैच', 'مصنّفة', 'Рейтинговая', '段位戰', 'Peringkat', 'Sıralama'),
    free: N('フリー対局', 'Free play', '自由对局', '자유 대국', 'Partida libre', 'Partie libre', 'Partida livre', 'Freies Spiel', 'फ़्री खेल', 'لعب حر', 'Свободная игра', '自由對局', 'Main bebas', 'Serbest oyun'),
    online: N('オンライン', 'Online', '在线', '온라인', 'En línea', 'En ligne', 'Online', 'Online', 'ऑनलाइन', 'عبر الإنترنت', 'Онлайн', '線上', 'Online', 'Çevrim içi'),
    len: N('対局', 'Length', '局数', '대국', 'Duración', 'Durée', 'Duração', 'Länge', 'अवधि', 'المدة', 'Длина', '局數', 'Panjang', 'Süre'),
    east: N('東風戦', 'East round', '东风战', '동풍전', 'Ronda Este', 'Tour de l’Est', 'Rodada Leste', 'Ost-Runde', 'पूर्व राउंड', 'جولة الشرق', 'Восточный круг', '東風戰', 'Ronde Timur', 'Doğu turu'),
    south: N('半荘戦', 'East-South', '半庄战', '반장전', 'Este-Sur', 'Est-Sud', 'Leste-Sul', 'Ost-Süd', 'पूर्व-दक्षिण', 'الشرق-الجنوب', 'Восток-Юг', '半莊戰', 'Timur-Selatan', 'Doğu-Güney'),
    cpu: N('CPUの強さ', 'CPU strength', '电脑强度', 'CPU 강도', 'Nivel de la CPU', 'Niveau du CPU', 'Nível da CPU', 'CPU-Stärke', 'CPU की ताकत', 'قوة الحاسوب', 'Сила компьютера', '電腦強度', 'Kekuatan CPU', 'CPU gücü'),
    rules: N('ルール', 'Rules', '规则', '규칙', 'Reglas', 'Règles', 'Regras', 'Regeln', 'नियम', 'القواعد', 'Правила', '規則', 'Aturan', 'Kurallar'),
    lessons: N('レッスン', 'Lessons', '课程', '레슨', 'Lecciones', 'Leçons', 'Lições', 'Lektionen', 'पाठ', 'الدروس', 'Уроки', '課程', 'Pelajaran', 'Dersler'),
    settings: N('設定', 'Settings', '设置', '설정', 'Ajustes', 'Réglages', 'Ajustes', 'Einstellungen', 'सेटिंग्स', 'الإعدادات', 'Настройки', '設定', 'Pengaturan', 'Ayarlar'),
    stats: N('戦績', 'Record', '战绩', '전적', 'Historial', 'Bilan', 'Histórico', 'Bilanz', 'रिकॉर्ड', 'السجل', 'Статистика', '戰績', 'Rekor', 'Kayıt'),
    start: N('対局開始', 'Start', '开始对局', '대국 시작', 'Empezar', 'Commencer', 'Começar', 'Starten', 'शुरू करें', 'ابدأ', 'Начать', '開始對局', 'Mulai', 'Başla'),
    toOnline: N('オンライン対戦へ', 'Go online', '进入在线对战', '온라인 대전으로', 'Ir en línea', 'Jouer en ligne', 'Jogar online', 'Online spielen', 'ऑनलाइन खेलें', 'العب عبر الإنترنت', 'Играть онлайн', '進入線上對戰', 'Main online', 'Çevrim içi oyna'),
    nRanked: N('見習いから雀神まで、勝つほど段位が上がる。相手も強くなっていきます', 'Climb from Apprentice to the top: the more you win, the higher your rank — and the stronger your opponents.', '从见习一路升到最高段位，赢得越多段位越高，对手也会越来越强', '견습부터 최고 단위까지, 이길수록 단위가 오르고 상대도 강해집니다', 'Sube de Aprendiz a la cima: cuanto más ganas, más alto tu rango y más fuertes tus rivales.', 'Grimpez d’Apprenti au sommet : plus vous gagnez, plus votre rang monte… et vos adversaires aussi.', 'Suba de Aprendiz ao topo: quanto mais vence, mais alto o grau — e mais fortes os rivais.', 'Vom Lehrling nach oben: Je mehr du gewinnst, desto höher dein Rang – und desto stärker die Gegner.', 'शिक्षार्थी से शिखर तक: जितना जीतोगे, रैंक उतना ऊँचा — और प्रतिद्वंद्वी उतने मज़बूत।', 'من مبتدئ إلى القمة: كلما فزت ارتفعت رتبتك وقوي خصومك.', 'От ученика до вершины: чем больше побед, тем выше ранг — и сильнее соперники.', '從見習一路升到最高段位，贏得越多段位越高，對手也會越來越強', 'Dari Magang ke puncak: makin sering menang, makin tinggi peringkat — dan makin kuat lawan.', 'Çıraktan zirveye: kazandıkça rütben yükselir, rakiplerin de güçlenir.'),
    nFree: N('CPUの強さを選んで、気軽に1局', 'Pick the CPU strength and play a relaxed game.', '选择电脑强度，轻松来一局', 'CPU 강도를 골라 가볍게 한 판', 'Elige el nivel de la CPU y juega una partida tranquila.', 'Choisissez le niveau du CPU et jouez tranquillement.', 'Escolha o nível da CPU e jogue com calma.', 'Wähle die CPU-Stärke und spiel ganz entspannt.', 'CPU की ताकत चुनें और आराम से एक बाज़ी खेलें।', 'اختر قوة الحاسوب والعب مباراة هادئة.', 'Выберите силу компьютера и сыграйте спокойную партию.', '選擇電腦強度，輕鬆來一局', 'Pilih kekuatan CPU dan main santai.', 'CPU gücünü seç ve rahat bir oyun oyna.'),
    bossAt: N('相手のボス', 'The boss', '对手首领', '상대 보스', 'El jefe', 'Le boss', 'O chefe', 'Der Boss', 'बॉस', 'الزعيم', 'Босс', '對手首領', 'Bos', 'Patron'),
    win: N('1位で {r} をゲット', 'Win 1st for {r}', '拿到第1名获得 {r}', '1위로 {r} 획득', 'Gana 1.º: {r}', '1er : {r}', '1º lugar: {r}', 'Platz 1: {r}', 'पहला स्थान: {r}', 'المركز الأول: {r}', '1-е место: {r}', '拿到第1名獲得 {r}', 'Juara 1: {r}', '1.lik: {r}'),
    got: N('ゲット済み', 'Got it', '已获得', '획득 완료', 'Conseguido', 'Obtenu', 'Obtido', 'Erhalten', 'मिल गया', 'تم الحصول', 'Получено', '已獲得', 'Didapat', 'Alındı'),
    rank: N('段位', 'Rank', '段位', '단위', 'Rango', 'Rang', 'Nível', 'Rang', 'रैंक', 'الرتبة', 'Ранг', '段位', 'Peringkat', 'Derece'),
    nOnline: N('東風戦・スキルなしのレート戦（雀華と共通）と、友だちとのルーム戦', 'Rated East-round games without skills (shared with Janka), and rooms to play with friends.', '东风战、无技能的积分战（与《雀华》共通），以及和朋友的房间战', '동풍전·스킬 없는 레이팅전(작화와 공통)과 친구와의 룸 대전', 'Partidas con rating a una ronda sin habilidades (compartidas con Janka) y salas para jugar con amigos.', 'Parties classées à un tour sans compétences (partagées avec Janka) et salons entre amis.', 'Partidas com rating de uma rodada sem habilidades (com Janka) e salas com amigos.', 'Ratingpartien (Ost-Runde, ohne Fähigkeiten, gemeinsam mit Janka) und Räume für Freunde.', 'बिना स्किल वाले रेटिंग मैच (जानका के साथ साझा) और दोस्तों के साथ रूम।', 'مباريات تصنيف بجولة واحدة بلا مهارات (مشتركة مع جانكا) وغرف للعب مع الأصدقاء.', 'Рейтинговые партии в один круг без навыков (общие с Janka) и комнаты для игры с друзьями.', '東風戰、無技能的積分戰（與《雀華》共通），以及和朋友的房間戰', 'Permainan rating satu ronde tanpa skill (bersama Janka) dan room bersama teman.', 'Becerisiz tek turluk reyting maçları (Janka ile ortak) ve arkadaşlarla oda oyunları.'),
  };
  const TIER = { ja: ['入門', '初級', '中級', '上級', '最上級'], en: ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'], zh: ['入门', '初级', '中级', '高级', '专家'], 'zh-TW': ['入門', '初級', '中級', '高級', '專家'], ko: ['입문', '초급', '중급', '상급', '전문가'],
    es: ['Iniciación', 'Principiante', 'Intermedio', 'Avanzado', 'Experto'], fr: ['Initiation', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'], pt: ['Iniciação', 'Iniciante', 'Intermediário', 'Avançado', 'Especialista'], de: ['Einstieg', 'Anfänger', 'Mittelstufe', 'Fortgeschritten', 'Experte'],
    hi: ['परिचय', 'शुरुआती', 'मध्यम', 'उन्नत', 'विशेषज्ञ'], ar: ['تمهيدي', 'مبتدئ', 'متوسط', 'متقدم', 'خبير'], ru: ['Начальный', 'Новичок', 'Средний', 'Продвинутый', 'Эксперт'], id: ['Pengenalan', 'Pemula', 'Menengah', 'Mahir', 'Ahli'], tr: ['Giriş', 'Acemi', 'Orta', 'İleri', 'Uzman'] };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tx = (k, l) => (TX[k] && (TX[k][l] || TX[k].en)) || k;
  const LVD = { ja: ['ルールを覚えたての人向け。鳴きもリーチも素直', '役を意識して手を進める', '押し引きを覚えた中級者', '守りも攻めも手ごわい上級者', '牌効率も読みも鋭い最強クラス'],
    en: ['For those who just learned the rules — plain calls and riichi', 'Builds hands with yaku in mind', 'Knows when to push and when to fold', 'Tough in attack and defence', 'Sharp efficiency and reads — the strongest'] };
  function save() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const go = q => { location.href = '../riichi/?go=' + q; };
  const lenQ = z => '&len=' + (+z === 2 ? 'south' : 'east');
  /* the adapter (2026-11-28 ユーザー「ゲームカードの作りが他のゲームと全然違う」): the portal draws the card as for every game — 対戦 · レート戦 ·
     レッスン, 相手 (the Lv list with the Atlamo bosses and their rewards), 対局 (東風戦 / 半荘戦), 📖 ルール, the cup for the record —
     and adapter.ext opens the game page there (atlas/app.js: ext / extLabel / rtNow). The table is the portal's showcase only. */
  /* the rules course's list in the 3D view (2026-11-28 ユーザー「ルールコースの一覧メニューは3Dビューで出したい（少し小さくしても良い）」):
     the portal's own list sheet (.lvsheet, as the 相手 list), each step with its point and ✓ once passed (riichi-v1 .lessons);
     a step opens on the game page (riichi/?go=lesson&id=…). The game's text is ja / en (the game page's languages). */
  const RULES = [['r1', '麻雀ってどんなゲーム？', 'What is mahjong?', '4人で点数を取り合うゲーム', 'Four players, one score race'],
    ['r2', '牌の種類', 'The tiles', '萬子・筒子・索子・字牌、各4枚', 'Characters, dots, bamboo, honours — 4 of each'],
    ['r3', 'アガリの形', 'A winning hand', '4つの面子＋1つの雀頭', 'Four sets and a pair'],
    ['r4', 'ツモと打牌', 'Drawing and discarding', '使いにくい牌から捨てる', 'Throw the least useful tile'],
    ['r5', '役がないとアガれない', 'You need a yaku', 'リーチ・タンヤオ・役牌', 'Riichi, all simples, honour pungs'],
    ['r6', 'リーチしてツモアガリ', 'Riichi and win', '門前でテンパイ→リーチ', 'Tenpai without calls → riichi'],
    ['r7', 'ロンとフリテン', 'Ron and furiten', '人の捨て牌でアガる', 'Win on someone’s discard'],
    ['r8', '鳴き（ポン・チー）', 'Calls: pon and chi', '人の捨て牌で面子を作る', 'Make sets from discards'],
    ['r9', '点数と順位', 'Points and places', '親は1.5倍、流局はテンパイ料', 'Dealer ×1.5; tenpai payments at a draw']];
  const RTX = { ja: ['ルールコース', '全9ステップ・実際の卓で遊びながら覚えます', '合格'], en: ['Rules course', '9 steps, learnt by playing at a real table', 'Passed'] };
  function rulesSheet(l) {
    l = l || document.documentElement.lang || 'ja';
    const ja = /^(ja)$/.test(l), X = RTX[ja ? 'ja' : 'en'], rec = save().lessons || {}, next = RULES.find(r => !(rec[r[0]] && rec[r[0]].pass));
    const old = document.querySelector('.lvsheet.rcrules'); if (old) old.remove();
    const sh = document.createElement('div'); sh.className = 'lvsheet rcrules';
    sh.innerHTML = `<div class="lvs-in" role="listbox"><div class="lvs-h">${esc(X[0])}<small>${esc(X[1])}</small><button type="button" class="lvs-x" aria-label="✕">✕</button></div><div class="lvs-l">${RULES.map((r, i) => { const ok = rec[r[0]] && rec[r[0]].pass;
      return `<button type="button" role="option" data-rid="${r[0]}" class="${r === next ? 'on' : ''}"><b>${i + 1}</b><span class="nm"><span class="nt">${esc(ja ? r[1] : r[2])}</span>${ok ? `<i class="lvck" aria-label="${esc(X[2])}">✓</i>` : ''}</span><small>${esc(ja ? r[3] : r[4])}</small></button>`; }).join('')}</div></div>`;
    document.body.appendChild(sh); requestAnimationFrame(() => sh.classList.add('on'));
    const close = () => { if (sh.classList.contains('out')) return; sh.classList.add('out'); sh.classList.remove('on'); setTimeout(() => sh.remove(), 240); };
    sh.onclick = e => { const b = e.target.closest('[data-rid]'); if (b) { close(); go('lesson&id=' + b.dataset.rid); return; } if (e.target === sh || e.target.closest('.lvs-x')) close(); };
    const on = sh.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  { const st = document.createElement('style'); st.textContent = '.lvsheet.rcrules .lvs-in{max-width:460px}.lvsheet.rcrules .lvs-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.lvsheet.rcrules .lvs-h small{font-size:12px;font-weight:700;color:var(--ink2,#6a7088);flex-basis:100%;order:3}.lvsheet.rcrules .lvs-l button{padding-block:8px}.lvsheet.rcrules .lvs-l button b{font-size:15px}.lvsheet.rcrules .lvs-l small{font-size:12px}'; document.head.appendChild(st); }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.riichi = {
    table: true, mx: true, noPvp: true, levels: 10,   // (noPvp: no 二人で対戦 at the head of 相手 — four seats, no hot-seat game)
    modes: ['ai', 'rated'],
    sizes: [1, 2], size0: (() => { const s = (save().set || {}); return s.len === 'south' ? 2 : 1; })(),
    sizeLabel: l => tx('len', l), sizeName: (z, l) => tx(+z === 2 ? 'south' : 'east', l),
    levelInfo: (n, l) => ({ name: 'Lv.' + n, desc: (LVD[l] || LVD.en)[Math.min(4, Math.floor((n - 1) / 2))], who: '' }),
    ext(m, o) {
      if (m === 'rules') return rulesSheet(o && o.lang);
      if (m === 'stats') return go('stats');
      if (m === 'lesson') return go('lessons');
      if (m === 'rated') return go(o.opp === 'online' ? 'online' : 'ranked' + lenQ(o.size));
      go('free' + lenQ(o.size) + '&lv=' + Math.max(1, Math.min(10, o.lv || 4)));
    },
    extLabel: (m, l, opp) => m === 'lesson' ? tx('lessons', l) : m === 'rated' && opp === 'online' ? tx('toOnline', l) : tx('start', l),
    rtNow(opp, l) {   // レート戦: AI = the 段位 (riichi-v1 .rank, rank.js), オンライン = no local copy of the rating — nothing shown
      if (opp === 'online' || !window.MJRank) return null;
      const d = save(), pt = (d.rank && d.rank.pt) | 0, r = MJRank.at(pt);
      return [tx('rank', l), `${r.name[l] || r.name.en} · ${pt} pt`];
    },
  };
})();
