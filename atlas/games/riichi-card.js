/* 麻雀（riichi/、2026-11-27）— the Atlas' card for the game (ユーザー「タイトル画面ではなく大百科のUIに統合」):
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
    nOnline: N('東風戦・スキルなしのレート戦（雀華と共通）と、友だちとのルーム戦', 'Rated East-round games without skills (shared with Janka), and rooms to play with friends.', '东风战、无技能的积分战（与《雀华》共通），以及和朋友的房间战', '동풍전·스킬 없는 레이팅전(작화와 공통)과 친구와의 룸 대전', 'Partidas con rating a una ronda sin habilidades (compartidas con Janka) y salas para jugar con amigos.', 'Parties classées à un tour sans compétences (partagées avec Janka) et salons entre amis.', 'Partidas com rating de uma rodada sem habilidades (com Janka) e salas com amigos.', 'Ratingpartien (Ost-Runde, ohne Fähigkeiten, gemeinsam mit Janka) und Räume für Freunde.', 'बिना स्किल वाले रेटिंग मैच (जानका के साथ साझा) और दोस्तों के साथ रूम।', 'مباريات تصنيف بجولة واحدة بلا مهارات (مشتركة مع جانكا) وغرف للعب مع الأصدقاء.', 'Рейтинговые партии в один круг без навыков (общие с Janka) и комнаты для игры с друзьями.', '東風戰、無技能的積分戰（與《雀華》共通），以及和朋友的房間戰', 'Permainan rating satu ronde tanpa skill (bersama Janka) dan room bersama teman.', 'Becerisiz tek turluk reyting maçları (Janka ile ortak) ve arkadaşlarla oda oyunları.'),
  };
  const TIER = { ja: ['入門', '初級', '中級', '上級', '最上級'], en: ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'], zh: ['入门', '初级', '中级', '高级', '专家'], 'zh-TW': ['入門', '初級', '中級', '高級', '專家'], ko: ['입문', '초급', '중급', '상급', '전문가'],
    es: ['Iniciación', 'Principiante', 'Intermedio', 'Avanzado', 'Experto'], fr: ['Initiation', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'], pt: ['Iniciação', 'Iniciante', 'Intermediário', 'Avançado', 'Especialista'], de: ['Einstieg', 'Anfänger', 'Mittelstufe', 'Fortgeschritten', 'Experte'],
    hi: ['परिचय', 'शुरुआती', 'मध्यम', 'उन्नत', 'विशेषज्ञ'], ar: ['تمهيدي', 'مبتدئ', 'متوسط', 'متقدم', 'خبير'], ru: ['Начальный', 'Новичок', 'Средний', 'Продвинутый', 'Эксперт'], id: ['Pengenalan', 'Pemula', 'Menengah', 'Mahir', 'Ahli'], tr: ['Giriş', 'Acemi', 'Orta', 'İleri', 'Uzman'] };
  const tx = (k, l) => (TX[k] && (TX[k][l] || TX[k].en)) || k;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // the game's save (its own settings; the signature is the game's business — the card only reads, and writes .set back unsigned
  // would break it, so the choice travels in the address instead: ?go=…&len=…&lv=…, and the game saves it)
  function save() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const st = { mode: null, len: null, lv: null };
  function cur() {
    const d = save(), s = d.set || {};
    if (!st.mode) st.mode = s.mode === 'free' ? 'free' : s.mode === 'online' ? 'online' : 'ranked';
    if (!st.len) st.len = s.len === 'south' ? 'south' : 'east';
    if (!st.lv) st.lv = Math.max(1, Math.min(10, s.clv | 0 || 4));
    return d;
  }
  function rankLine(d, l) {
    const R = window.MJRank; if (!R) return '';
    const pt = (d.rank && d.rank.pt) | 0, r = R.at(pt), nm = r.name[l] || r.name.en;
    return `${esc(nm)} ・ ${pt} pt`;
  }
  function html(l) {
    const d = cur(), M = st.mode;
    const tabs = ['ranked', 'free', 'online'].map(m => `<button type="button" data-rcm="${m}" class="${m === M ? 'on' : ''}">${esc(tx(m, l))}</button>`).join('');
    const lvOpts = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === st.lv ? 'selected' : ''}>Lv.${i + 1} ${esc((TIER[l] || TIER.en)[Math.floor(i / 2)])}</option>`).join('');
    const note = M === 'ranked' ? `${esc(tx('nRanked', l))}${rankLine(d, l) ? `<b class="rcrk">${rankLine(d, l)}</b>` : ''}` : esc(tx(M === 'free' ? 'nFree' : 'nOnline', l));
    return `<div class="mtab3" id="rcMode">${tabs}</div><div class="mbody" id="rcBody"><div class="mnote rcnote">${note}</div>
      ${M === 'online' ? '' : `<div class="opts" id="rcOpts"><label>${esc(tx('len', l))}<select id="rcLen"><option value="east" ${st.len === 'east' ? 'selected' : ''}>${esc(tx('east', l))}</option><option value="south" ${st.len === 'south' ? 'selected' : ''}>${esc(tx('south', l))}</option></select></label></div>${M === 'free' ? `<div class="opts"><label>${esc(tx('cpu', l))}<select id="rcLv">${lvOpts}</select></label></div>${bossRow(st.lv, l)}` : ''}`}
      <div class="opts mxp rclinks">${['rules', 'lessons', 'stats', 'settings'].map(k => `<a class="mxb" href="${url(k)}"><span>${esc(tx(k, l))}</span></a>`).join('')}</div></div>`;
  }
  // the boss of the chosen level (atlas/npc/roster.js BOSSES.riichi) and the avatar a 1st place gives (✓ once owned)
  function bossRow(lv, l) {
    const A = window.AtlasNPC, L = A && A.BOSSES && A.BOSSES.riichi; if (!L) return '';
    const i = A.band('riichi', lv), b = L[i], tr = A.tier('riichi', lv); if (!b) return '';
    let own = false; try { own = !!(window.Atlas && Atlas.load && Atlas.load().owned.includes(`av-boss-riichi-${i + 1}-${tr}`)); } catch (e) {}
    const R = ['N', 'R', 'SR'][tr] || '';
    return `<div class="opts rcboss"><img src="../images/atlas/av/boss-riichi-${i + 1}-${tr < 0 ? 3 : tr}.webp" alt=""><span><small>${esc(tx('bossAt', l))} ・ ${esc(A.range('riichi', i))}</small><b>${esc(b.n[l] || b.n.en)}</b></span><em class="${own ? 'ok' : ''}">${own ? '✓ ' + esc(tx('got', l)) : esc(tx('win', l).replace('{r}', R))}</em></div>`;
  }
  function url(go) { return `../riichi/?go=${go}${go === 'ranked' || go === 'free' ? `&len=${st.len}` : ''}${go === 'free' ? `&lv=${st.lv}` : ''}`; }
  function bind(root, l) {
    const play = root.querySelector('.act a.btn.big');
    const fix = () => { if (play) { play.href = url(st.mode); play.textContent = (st.mode === 'online' ? tx('toOnline', l) : tx('start', l)) + ' ▶'; } };
    const redraw = () => { const col = root.querySelector('#rcMode'); if (!col) return; const host = document.createElement('div'); host.innerHTML = html(l);
      col.replaceWith(host.children[0]); root.querySelector('#rcBody').replaceWith(host.children[0]); wire(); fix(); };
    function wire() {
      root.querySelectorAll('[data-rcm]').forEach(b => b.onclick = () => { st.mode = b.dataset.rcm; redraw(); });
      const ln = root.querySelector('#rcLen'); if (ln) ln.onchange = () => { st.len = ln.value; redraw(); };
      const lv = root.querySelector('#rcLv'); if (lv) lv.onchange = () => { st.lv = +lv.value; redraw(); };
    }
    wire(); fix();
  }
  // its look (the portal's own card style: a small row with the boss's face)
  { const st = document.createElement('style'); st.textContent = '.rcboss{display:flex;align-items:center;gap:10px;margin-top:8px}.rcboss img{width:52px;height:52px;flex:none}.rcboss span{display:flex;flex-direction:column;min-width:0;flex:1}.rcboss small{font-size:11.5px;font-weight:700;color:var(--ink2)}.rcboss b{font-size:16px;font-weight:900;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rcboss em{font-style:normal;font-size:12.5px;font-weight:900;color:var(--coral2);white-space:nowrap}.rcboss em.ok{color:var(--mint2)}.rcrk{display:block;margin-top:4px;color:var(--ink)}'; document.head.appendChild(st); }
  window.AtlasRiichiCard = { html, bind };
})();
