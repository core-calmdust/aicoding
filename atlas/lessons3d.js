/* =====================================================================
   Lessons and openings (定跡) on the 3D table (2026-11-10) — shogi and chess
   The same lessons as the full games (../shogi/lessons.json + openings*.json, ../chess/lessons.json + openings.json),
   played on the portal's 3D board through the puzzle mode of the table adapters (atlas/games/*.js ctx.pz), with the
   puzzles' guide character (atlas/puzzles.js AtlasPuzzles.G) explaining. The progress is the full game's own (same
   localStorage keys and pass rules: 20 points a problem, −4 for a hint, 75 % to pass), so a lesson passed here is passed there.
     lesson:  the intro, then its problems (shogi: 5 of the step's problems, the rules step all of them; chess: the step's 5)
              — one move each ("best" kinds; shogi's 詰将棋 kind: mate within the count, the defender answering)
     opening: the study line move by move with its notes, then 5 practice positions (moves of strong games, scored by
              how often they were played)
   Chess texts live in the chess page's I18N files (loaded here into a sandbox object, not into the page).
   Contract: AtlasLessons.has(id) · list(id, kind, lang) → Promise [{ key, cat, catName, title, sub, st: 'pass'|'try'|'', full }]
             next(id, kind) → Promise key · start(ctx) → { stop(), panel }   ctx = { id, kind, key, Table3D, lang, t, el, panel, adapter, onExit }
   ===================================================================== */
(function () {
  'use strict';
  const PTS = 20, HINT_PEN = 4, PASS = .75;
  const TX = {
    ja: { start: 'はじめる', next: '次へ', practice: '練習へ', hint: 'ヒント', again: 'もう一度', nextL: '次のレッスン', result: '結果を見る', loading: '準備中…',
      good: ['正解！', 'いいね！', 'おみごと！'], partial: 'いい手だね。でも一番は光っている手だよ。', wrong: 'おしい！ 正解は光っている手だよ。', pts: '{n}点',
      pass: '合格！ {p} / {m}点', fail: '{p} / {m}点。合格は{q}点。もう一度挑戦しよう！', step: '{i} / {n}手目', end: '手順はここまで。つぎは練習問題に挑戦しよう！', endOnly: '基本の手順はここまで。おつかれさま！',
      tsume: '<b>{n}手詰め</b>。王手を続けて玉を詰ませよう！', escaped: '玉に逃げられちゃった…', hintSay: '光っているところに注目してみて。', opGoal: 'この局面、強い人が一番よく指した手はどれかな？', drill: 'このレッスンはフル機能版で遊べます。', full: 'フル機能で開く' },
    en: { start: 'Start', next: 'Next', practice: 'Practice', hint: 'Hint', again: 'Retry', nextL: 'Next lesson', result: 'See result', loading: 'Setting up…',
      good: ['Correct!', 'Nice!', 'Well done!'], partial: 'A decent move — but the glowing one is best.', wrong: 'Close! The glowing move is the answer.', pts: '{n} pts',
      pass: 'Passed! {p} / {m} pts', fail: '{p} / {m} pts. {q} to pass — try again!', step: 'Move {i} / {n}', end: 'That is the line. Now try the practice positions!', endOnly: 'That is the basic line. Well done!',
      tsume: '<b>Mate in {n}</b>. Keep checking and catch the king!', escaped: 'The king got away…', hintSay: 'Look at the glowing squares.', opGoal: 'Which move did strong players choose most often here?', drill: 'This lesson is played in the full version.', full: 'Open the full version' },
    zh: { start: '开始', next: '下一步', practice: '去练习', hint: '提示', again: '再来一次', nextL: '下一课', result: '查看结果', loading: '准备中…',
      good: ['正确！', '不错！', '漂亮！'], partial: '不错的一步，但最好的是发光的那步。', wrong: '可惜！正解是发光的那步。', pts: '{n}分',
      pass: '合格！{p} / {m}分', fail: '{p} / {m}分。合格需{q}分，再挑战一次吧！', step: '第{i} / {n}手', end: '手顺到此为止。接下来挑战练习题吧！', endOnly: '基本手顺到此为止，辛苦了！',
      tsume: '<b>{n}手诘</b>。连续将军，把玉将死吧！', escaped: '玉逃掉了……', hintSay: '注意发光的地方。', opGoal: '这个局面，高手最常下的是哪一步？', drill: '这一课请在完整版中进行。', full: '打开完整版' },
    ko: { start: '시작', next: '다음', practice: '연습하기', hint: '힌트', again: '다시 하기', nextL: '다음 레슨', result: '결과 보기', loading: '준비 중…',
      good: ['정답!', '좋아!', '훌륭해!'], partial: '좋은 수야. 하지만 최선은 빛나는 수야.', wrong: '아깝다! 정답은 빛나는 수야.', pts: '{n}점',
      pass: '합격! {p} / {m}점', fail: '{p} / {m}점. 합격은 {q}점. 다시 도전해 보자!', step: '{i} / {n}수째', end: '수순은 여기까지. 이제 연습 문제에 도전해 보자!', endOnly: '기본 수순은 여기까지. 수고했어!',
      tsume: '<b>{n}수 외통</b>이야. 장을 계속 걸어 왕을 잡자!', escaped: '왕이 도망쳤어…', hintSay: '빛나는 곳을 잘 봐.', opGoal: '이 국면에서 강자들이 가장 많이 둔 수는 무엇일까?', drill: '이 레슨은 풀 버전에서 할 수 있어요.', full: '풀 버전 열기' },
    es: { start: 'Empezar', next: 'Siguiente', practice: 'A practicar', hint: 'Pista', again: 'Reintentar', nextL: 'Siguiente lección', result: 'Ver resultado', loading: 'Preparando…',
      good: ['¡Correcto!', '¡Bien!', '¡Muy bien!'], partial: 'Buena jugada, pero la mejor es la que brilla.', wrong: '¡Casi! La jugada que brilla es la respuesta.', pts: '{n} pts',
      pass: '¡Aprobado! {p} / {m} pts', fail: '{p} / {m} pts. Se aprueba con {q}: ¡inténtalo otra vez!', step: 'Jugada {i} / {n}', end: 'Hasta aquí la línea. ¡Ahora las posiciones de práctica!', endOnly: 'Hasta aquí la línea básica. ¡Bien hecho!',
      tsume: '<b>Mate en {n}</b>. ¡Da jaque tras jaque y atrapa al rey!', escaped: 'El rey se escapó…', hintSay: 'Fíjate en las casillas que brillan.', opGoal: '¿Qué jugada eligieron más los jugadores fuertes aquí?', drill: 'Esta lección se juega en la versión completa.', full: 'Abrir la versión completa' },
    fr: { start: 'Commencer', next: 'Suivant', practice: 'S’entraîner', hint: 'Indice', again: 'Réessayer', nextL: 'Leçon suivante', result: 'Voir le résultat', loading: 'Préparation…',
      good: ['Exact !', 'Bien !', 'Bravo !'], partial: 'Bon coup, mais le meilleur est celui qui brille.', wrong: 'Presque ! Le coup qui brille est la réponse.', pts: '{n} pts',
      pass: 'Réussi ! {p} / {m} pts', fail: '{p} / {m} pts. Il faut {q} pour réussir : réessaie !', step: 'Coup {i} / {n}', end: 'Voilà la ligne. Place aux positions d’entraînement !', endOnly: 'Voilà la ligne de base. Bravo !',
      tsume: '<b>Mat en {n}</b>. Enchaîne les échecs et attrape le roi !', escaped: 'Le roi s’est échappé…', hintSay: 'Regarde les cases qui brillent.', opGoal: 'Quel coup les joueurs forts ont-ils le plus joué ici ?', drill: 'Cette leçon se joue dans la version complète.', full: 'Ouvrir la version complète' },
    pt: { start: 'Começar', next: 'Próximo', practice: 'Praticar', hint: 'Dica', again: 'Tentar de novo', nextL: 'Próxima lição', result: 'Ver resultado', loading: 'Preparando…',
      good: ['Correto!', 'Boa!', 'Muito bem!'], partial: 'Bom lance, mas o melhor é o que brilha.', wrong: 'Quase! O lance que brilha é a resposta.', pts: '{n} pts',
      pass: 'Aprovado! {p} / {m} pts', fail: '{p} / {m} pts. Aprova com {q}: tente de novo!', step: 'Lance {i} / {n}', end: 'Essa é a linha. Agora as posições de prática!', endOnly: 'Essa é a linha básica. Muito bem!',
      tsume: '<b>Mate em {n}</b>. Dê xeque atrás de xeque e pegue o rei!', escaped: 'O rei escapou…', hintSay: 'Olhe as casas que brilham.', opGoal: 'Qual lance os jogadores fortes mais escolheram aqui?', drill: 'Esta lição é jogada na versão completa.', full: 'Abrir a versão completa' },
    de: { start: 'Los', next: 'Weiter', practice: 'Üben', hint: 'Tipp', again: 'Nochmal', nextL: 'Nächste Lektion', result: 'Ergebnis', loading: 'Wird vorbereitet…',
      good: ['Richtig!', 'Gut!', 'Stark!'], partial: 'Ein guter Zug – der beste ist aber der leuchtende.', wrong: 'Knapp! Der leuchtende Zug ist die Lösung.', pts: '{n} P.',
      pass: 'Bestanden! {p} / {m} P.', fail: '{p} / {m} P. Bestanden ab {q} – versuch es nochmal!', step: 'Zug {i} / {n}', end: 'Das ist die Variante. Jetzt die Übungsstellungen!', endOnly: 'Das ist die Grundvariante. Gut gemacht!',
      tsume: '<b>Matt in {n}</b>. Schach um Schach – fang den König!', escaped: 'Der König ist entwischt…', hintSay: 'Schau auf die leuchtenden Felder.', opGoal: 'Welchen Zug haben starke Spieler hier am häufigsten gewählt?', drill: 'Diese Lektion gibt es in der Vollversion.', full: 'Vollversion öffnen' },
    hi: { start: 'शुरू करें', next: 'आगे', practice: 'अभ्यास', hint: 'संकेत', again: 'फिर से', nextL: 'अगला पाठ', result: 'परिणाम', loading: 'तैयार हो रहा है…',
      good: ['सही!', 'बढ़िया!', 'शानदार!'], partial: 'अच्छी चाल — पर सबसे अच्छी चमकती चाल है।', wrong: 'करीब थे! चमकती चाल सही जवाब है।', pts: '{n} अंक',
      pass: 'पास! {p} / {m} अंक', fail: '{p} / {m} अंक। पास के लिए {q} — फिर कोशिश करें!', step: 'चाल {i} / {n}', end: 'लाइन यहीं तक। अब अभ्यास की स्थितियाँ!', endOnly: 'मूल लाइन यहीं तक। बहुत अच्छे!',
      tsume: '<b>{n} में मात</b>। शह पर शह देकर राजा को पकड़ो!', escaped: 'राजा बच निकला…', hintSay: 'चमकती जगहों को देखो।', opGoal: 'यहाँ मज़बूत खिलाड़ियों ने सबसे ज़्यादा कौन-सी चाल चुनी?', drill: 'यह पाठ पूरे संस्करण में है।', full: 'पूरा संस्करण खोलें' },
    ar: { start: 'ابدأ', next: 'التالي', practice: 'تدرّب', hint: 'تلميح', again: 'أعد المحاولة', nextL: 'الدرس التالي', result: 'النتيجة', loading: 'جارٍ التحضير…',
      good: ['صحيح!', 'أحسنت!', 'رائع!'], partial: 'نقلة جيدة، لكن الأفضل هي المضيئة.', wrong: 'قريب! النقلة المضيئة هي الجواب.', pts: '{n} نقطة',
      pass: 'نجحت! {p} / {m}', fail: '{p} / {m}. النجاح عند {q} — حاول مجددًا!', step: 'النقلة {i} / {n}', end: 'هذا هو الخط. والآن مواقف التدريب!', endOnly: 'هذا هو الخط الأساسي. أحسنت!',
      tsume: '<b>مات في {n}</b>. كِش بعد كِش وأمسك الملك!', escaped: 'هرب الملك…', hintSay: 'انظر إلى المربعات المضيئة.', opGoal: 'ما النقلة التي اختارها الأقوياء أكثر هنا؟', drill: 'هذا الدرس في النسخة الكاملة.', full: 'افتح النسخة الكاملة' },
    ru: { start: 'Начать', next: 'Далее', practice: 'К практике', hint: 'Подсказка', again: 'Ещё раз', nextL: 'Следующий урок', result: 'Итог', loading: 'Подготовка…',
      good: ['Верно!', 'Отлично!', 'Здорово!'], partial: 'Неплохой ход, но лучший — светящийся.', wrong: 'Почти! Светящийся ход — ответ.', pts: '{n} очк.',
      pass: 'Зачёт! {p} / {m}', fail: '{p} / {m}. Для зачёта {q} — попробуй ещё!', step: 'Ход {i} / {n}', end: 'Вот и вся линия. Теперь практика!', endOnly: 'Вот и базовая линия. Молодец!',
      tsume: '<b>Мат в {n}</b>. Шах за шахом — поймай короля!', escaped: 'Король ускользнул…', hintSay: 'Посмотри на светящиеся поля.', opGoal: 'Какой ход сильные игроки выбирали здесь чаще всего?', drill: 'Этот урок — в полной версии.', full: 'Открыть полную версию' },
    'zh-TW': { start: '開始', next: '下一步', practice: '去練習', hint: '提示', again: '再來一次', nextL: '下一課', result: '查看結果', loading: '準備中…',
      good: ['正確！', '不錯！', '漂亮！'], partial: '不錯的一步，但最好的是發光的那步。', wrong: '可惜！正解是發光的那步。', pts: '{n}分',
      pass: '合格！{p} / {m}分', fail: '{p} / {m}分。合格需{q}分，再挑戰一次吧！', step: '第{i} / {n}手', end: '手順到此為止。接下來挑戰練習題吧！', endOnly: '基本手順到此為止，辛苦了！',
      tsume: '<b>{n}手詰</b>。連續將軍，把玉將死吧！', escaped: '玉逃走了……', hintSay: '注意發光的地方。', opGoal: '這個局面，高手最常下的是哪一步？', drill: '這一課請在完整版中進行。', full: '開啟完整版' },
    id: { start: 'Mulai', next: 'Lanjut', practice: 'Latihan', hint: 'Petunjuk', again: 'Ulangi', nextL: 'Pelajaran berikutnya', result: 'Lihat hasil', loading: 'Menyiapkan…',
      good: ['Benar!', 'Bagus!', 'Hebat!'], partial: 'Langkah bagus, tapi yang terbaik yang menyala.', wrong: 'Hampir! Langkah yang menyala adalah jawabannya.', pts: '{n} poin',
      pass: 'Lulus! {p} / {m}', fail: '{p} / {m}. Lulus di {q} — coba lagi!', step: 'Langkah {i} / {n}', end: 'Itulah variasinya. Sekarang posisi latihan!', endOnly: 'Itulah variasi dasarnya. Bagus!',
      tsume: '<b>Mat dalam {n}</b>. Skak terus dan tangkap rajanya!', escaped: 'Rajanya lolos…', hintSay: 'Lihat kotak yang menyala.', opGoal: 'Langkah mana yang paling sering dipilih pemain kuat di sini?', drill: 'Pelajaran ini ada di versi lengkap.', full: 'Buka versi lengkap' },
    tr: { start: 'Başla', next: 'İleri', practice: 'Alıştırma', hint: 'İpucu', again: 'Tekrar', nextL: 'Sonraki ders', result: 'Sonuç', loading: 'Hazırlanıyor…',
      good: ['Doğru!', 'Güzel!', 'Harika!'], partial: 'İyi hamle, ama en iyisi parlayan.', wrong: 'Az kaldı! Parlayan hamle cevap.', pts: '{n} puan',
      pass: 'Geçtin! {p} / {m}', fail: '{p} / {m}. Geçmek için {q} — tekrar dene!', step: 'Hamle {i} / {n}', end: 'Varyant bu kadar. Şimdi alıştırma pozisyonları!', endOnly: 'Temel varyant bu kadar. Aferin!',
      tsume: '<b>{n} hamlede mat</b>. Şah üstüne şah çek, şahı yakala!', escaped: 'Şah kaçtı…', hintSay: 'Parlayan karelere bak.', opGoal: 'Güçlü oyuncular burada en çok hangi hamleyi seçti?', drill: 'Bu ders tam sürümde.', full: 'Tam sürümü aç' },
  };
  // shogi opening categories (= shogi/openings-ui.js tabs)
  const OPCAT = {"ja":{"beg":"初級","mid":"中級","adv":"上級","sp":"特殊","new":"流行","castle":"囲い","handi":"駒落ち"},"en":{"beg":"Beginner","mid":"Standard","adv":"Advanced","sp":"Surprise","new":"Trending","castle":"Castles","handi":"Handicap"},"zh":{"beg":"入门","mid":"中级","adv":"高级","sp":"奇袭","new":"流行","castle":"围","handi":"让子"},"ko":{"beg":"초급","mid":"중급","adv":"고급","sp":"특수","new":"유행","castle":"성","handi":"접장기"},"es":{"beg":"Inicial","mid":"Medio","adv":"Avanzado","sp":"Sorpresa","new":"Moda","castle":"Castillos","handi":"Hándicap"},"fr":{"beg":"Débutant","mid":"Moyen","adv":"Avancé","sp":"Surprise","new":"Tendance","castle":"Châteaux","handi":"Handicap"},"pt":{"beg":"Inicial","mid":"Médio","adv":"Avançado","sp":"Surpresa","new":"Moda","castle":"Castelos","handi":"Handicap"},"de":{"beg":"Einstieg","mid":"Mittel","adv":"Profi","sp":"Exoten","new":"Trend","castle":"Burgen","handi":"Vorgabe"},"hi":{"beg":"शुरुआती","mid":"मध्यम","adv":"उन्नत","sp":"अनोखे","new":"ट्रेंड","castle":"किले","handi":"हैंडीकैप"},"ar":{"beg":"مبتدئ","mid":"متوسط","adv":"متقدم","sp":"مفاجآت","new":"رائج","castle":"القلاع","handi":"الإعاقة"},"ru":{"beg":"Начальный","mid":"Стандарт","adv":"Продвинутый","sp":"Сюрпризы","new":"Тренды","castle":"Крепости","handi":"Фора"},"zh-TW":{"beg":"入門","mid":"標準","adv":"進階","sp":"奇襲","new":"流行","castle":"圍","handi":"讓子"},"id":{"beg":"Pemula","mid":"Standar","adv":"Mahir","sp":"Kejutan","new":"Tren","castle":"Benteng","handi":"Handikap"},"tr":{"beg":"Başlangıç","mid":"Standart","adv":"İleri","sp":"Sürpriz","new":"Popüler","castle":"Kaleler","handi":"Handikap"}};
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  const pick = a => Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const L = (o, lang) => !o ? '' : typeof o === 'string' ? o : o[lang] != null ? o[lang] : o.en != null ? o.en : o.ja || '';
  const getJ = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const winP = (v, k) => 1 / (1 + Math.pow(10, -v / k));

  /* ---------- the two games' data ---------- */
  const SHOGI = {
    LKEY: 'shogi-kaya-lessons-v1', OKEY: 'shogi-kaya-open-v1', CATS: ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'], data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../shogi/lessons.json?v=20261107l14'), getJ('../shogi/openings.json?v=20261107l14'),
        ...['beg', 'mid', 'adv', 'sp', 'new', 'castle'].map(c => getJ(`../shogi/openings-${c}.json?v=20261107l14`).catch(() => ({ sets: [] })))])
        .then(([ls, op, ...more]) => {
          const sets = op.sets.slice(); more.forEach((m, i) => (m.sets || []).forEach(s => { s.cat = s.cat || ['beg', 'mid', 'adv', 'sp', 'new', 'castle'][i]; if (!sets.some(x => x.id === s.id)) sets.push(s); }));
          sets.forEach(s => { if (!s.cat) s.cat = s.handi ? 'handi' : 'mid'; });
          const ord = {}; Object.entries(op.index || {}).forEach(([c, L2]) => L2.forEach(([id], i) => { ord[id] = i; }));
          sets.sort((a, b) => (this.CATS.indexOf(a.cat) - this.CATS.indexOf(b.cat)) || ((ord[a.id] ?? 99) - (ord[b.id] ?? 99)));
          this.data = { ls, sets }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.sets.map(s => ({ key: s.id, cat: s.cat, catName: (OPCAT[lang] || OPCAT.en)[s.cat] || s.cat, title: L(s.title, lang), sub: L(s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.grades.map((g, i) => ({ key: String(i), cat: g.rules ? 'rules' : 'lesson', catName: '', title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, sub: L(g.short, lang), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang, X) {
      const g = this.data.ls.grades[+key]; if (!g) return null;
      const pool = g.problems.filter(p => !p.variant && (p.kind === 'best' || p.kind === 'tsume'));
      const probs = g.rules ? pool : shuffle(pool).slice(0, 5);
      return { id: g.id, title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, intro: (L(g.intro, lang) || []).join('<br>'),
        probs: probs.map(p => ({ pos: p.sfen, kind: p.kind === 'tsume' ? 'tsume' : 'best', n: p.n, sol: p.sol, P: p,
          ask: L(p.q, lang) || (p.kind === 'tsume' ? fill(X.tsume, { n: p.n }) : L(g.prompt, lang)), why: L(p.expl, lang), ans: p.sol ? p.sol[0] : (p.accept || p.pv || [])[0] })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.sets.find(x => x.id === key); if (!s) return null;
      const probs = (s.problems || []).length ? (s.handi ? s.problems.map((p, i) => i) : shuffle(s.problems.map((p, i) => i))).slice(0, 5).sort((a, b) => s.handi ? a - b : 0).map(i => s.problems[i]) : [];
      return { id: s.id, title: L(s.title, lang), intro: L(s.short, lang), start: s.study && s.study.start, steps: (s.study && s.study.steps || []).map(x => x[0]), notes: s.study && s.study.notes || {},
        probs: probs.map(p => ({ pos: p.sfen, kind: 'best', P: p, ans: (p.accept || p.pv || (p.cand && [p.cand[0][0]]) || [])[0] })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[s.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = shogi/index.html movePoints (without the engine's runtime score)
      if (P.mode === 'material' || P.mode === 'freq') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(PTS * c[1] / best) : 0; }
      if ((P.accept || []).includes(u)) return PTS;
      if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }
      if (P.cand) { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : Math.min(P.floor !== undefined ? P.floor : best - 2000, best); return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (winP(best, 600) - winP(s, 600)) / .3)))); }
      return 0;
    },
  };
  const CHESS = {
    LKEY: 'aicoding-chess-lessons', OKEY: 'aicoding-chess-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const txt = u => fetch(u).then(r => r.text());
      return (this.p = Promise.all([getJ('../chess/lessons.json?v=20261107i14'), getJ('../chess/openings.json?v=20261107i14'), txt('../chess/i18n.js?v=20261107pro2-i14'), txt('../chess/i18n_basics.js?v=20261019ol-i14')])
        .then(([ls, op, a, b]) => {
          const w = {}; try { new Function('window', a)(w); new Function('window', b)(w); } catch (e) { console.warn('[lessons3d] chess texts', e); }   // (a sandbox: the page's own I18N stays untouched)
          this.I = w.I18N || {}; this.data = { ls, op }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang) { const I = this.I || {}; return (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(s => ({ key: s.id, cat: 'open', catName: '', title: L(s.title, lang), sub: L(s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course || 'tactics', catName: this.tx('course.' + (s.course || 'tactics'), lang), title: this.tx('ls.' + s.id + '.title', lang) || s.id, sub: this.tx('ls.' + s.id + '.sub', lang),
        st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: s.kind === 'drill' }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s || s.kind === 'drill') return null;
      const T = k => this.tx('ls.' + s.id + '.' + k, lang);
      return { id: s.id, title: T('title'), intro: T('intro'),
        probs: (s.problems || []).map(p => ({ pos: p.fen, kind: 'best', P: p, ask: T('goal'), why: T('why'), ans: p.best || (p.ok || [])[0] })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.op.sets.find(x => x.id === key); if (!s) return null;
      const probs = shuffle(s.problems || []).slice(0, 5);
      return { id: s.id, title: L(s.title, lang), intro: (L(s.intro, lang) || []).join ? L(s.intro, lang).join('<br>') : L(s.intro, lang), start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        steps: (s.study && s.study.steps || []).map(x => x[0]), notes: s.study && s.study.notes || {},
        probs: probs.map(p => ({ pos: p.fen, kind: 'best', P: p, ans: p.cand && p.cand[0][0] })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = chess/app.js problemPoints (the stored scores)
      if (P.cand) { const c = (P.cand.find(x => x[0] === u) || [0, 0])[1], top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }
      if (P.ok) return P.ok.includes(u) ? 20 : 0;
      if (!P.sc) return u === P.best ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), MT = 20000, mine = val.has(u) ? val.get(u) : -30000;
      if (best > MT && mine > MT) return mine >= best ? 20 : 16;
      if (mine >= best - 10) return 20;
      if (best > MT) return mine > 150 ? 8 : mine > -60 ? 4 : 0;
      if (mine < -MT) return 0;
      return Math.max(0, Math.round(20 * (1 - (winP(best, 400) - winP(mine, 400)) / .45)));
    },
  };
  const DATA = { shogi: SHOGI, chess: CHESS };

  function list(id, kind, lang) { const D = DATA[id]; return D.load().then(() => D.list(kind, lang)); }
  function next(id, kind, lang) { return list(id, kind, lang).then(L2 => { const x = L2.find(i => !i.full && i.st !== 'pass') || L2.find(i => !i.full); return x ? x.key : null; }); }

  function start(ctx) {
    const id = ctx.id, D = DATA[id], X = TX[ctx.lang] || TX.en, ad = ctx.adapter, GD = (window.AtlasPuzzles && AtlasPuzzles.G || {})[id] || {};
    let stopped = false, sess = null, cur = null, phase = 'load', typeT = 0, onReady = null, onMoved = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const el = document.createElement('div'); el.className = 'rgd pzg lsg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide || ''}" alt=""></div><div class="bub"><div class="nm">${(GD.name && (GD.name[ctx.lang] || GD.name.en)) || ''}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="hint">💡 ${X.hint}</button><button type="button" class="btn ghost sm" data-a="again">↻ ${X.again}</button><span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 3; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); if (ci >= s.length) { ni++; ci = 0; } } }, 22);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const head = txt => { $('.pg').textContent = txt ? ' · ' + txt : ''; };
    function act(nextLabel, { hint = false, again = false, nextOn = true } = {}) {
      $('[data-a=next]').innerHTML = nextLabel + ' ▶'; $('[data-a=next]').disabled = !nextOn;
      $('[data-a=hint]').disabled = !hint; $('[data-a=again]').disabled = !again;
    }
    function dots() { if (!cur || !cur.probs.length || phase === 'study' || phase === 'intro') { $('.cnt').innerHTML = ''; return; } $('.cnt').innerHTML = cur.probs.map((_, i) => { const r = cur.res[i]; return `<i class="lsd ${r === undefined ? '' : r >= 16 ? 'ok' : r > 0 ? 'mid' : 'ng'}${i === cur.k && phase === 'prob' ? ' on' : ''}"></i>`; }).join(''); }
    const pz = () => sess && sess.pz;
    function board(pos, sol) {   // a position on the table (the first one starts the adapter)
      return new Promise(res => {
        onReady = res;
        if (!sess) {
          sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
            pz: { fen: pos, sfen: pos, sol: sol || [], ready: () => { const f = onReady; onReady = null; if (f) f(); }, moved: (u, i) => onMoved && onMoved(u, i) } });
          ctx.Table3D.play(true);
        } else pz().load(pos, sol || []);
      });
    }

    /* ---------- a lesson / an opening ---------- */
    function open(key) {
      const L2 = ctx.kind === 'open' ? D.opening(key, ctx.lang) : D.lesson(key, ctx.lang, X);
      if (!L2) { say(X.drill); act(X.full, {}); $('[data-a=next]').onclick = () => ctx.onFull && ctx.onFull(ctx.kind, key); return; }
      cur = Object.assign(L2, { key, k: 0, res: [], si: 0 }); head(cur.title);
      phase = 'intro'; dots();
      say(`<b>${cur.title}</b><br>${cur.intro || ''}`);
      act(X.start); $('[data-a=next]').onclick = () => (ctx.kind === 'open' && cur.steps.length ? study() : prob());
      if (ctx.kind === 'open' && cur.start) board(cur.start);   // (the opening's start position is on the table while reading)
      else if (cur.probs[0]) board(cur.probs[0].pos, cur.probs[0].sol);
    }
    // the study line: one move at a time, its note when there is one
    async function study() {
      phase = 'study'; dots();
      if (cur.si === 0) await board(cur.start);
      onMoved = () => { pz().undo(1); };   // (the line is played for you: a move of your own is taken back)
      const stepOn = async () => {
        if (cur.si >= cur.steps.length) {
          const more = cur.probs.length; say(more ? X.end : X.endOnly);
          if (more) { act(X.practice); $('[data-a=next]').onclick = () => { cur.k = 0; prob(); }; }
          else { cur.save(PTS, PTS); act(X.nextL); $('[data-a=next]').onclick = nextItem; }
          return;
        }
        act(X.next, { nextOn: false });
        await pz().play(cur.steps[cur.si]); if (stopped) return;
        const note = cur.notes[String(cur.si)]; cur.si++;
        head(cur.title + ' · ' + fill(X.step, { i: cur.si, n: cur.steps.length }));
        say(note ? L(note, ctx.lang) : '　'); act(X.next);
      };
      $('[data-a=next]').onclick = stepOn; stepOn();
    }
    // one problem
    async function prob() {
      phase = 'prob'; const p = cur.probs[cur.k]; if (!p) return finish();
      p.hinted = false; p.used = 0; dots(); act(X.next, { nextOn: false });
      say(p.ask || X.opGoal);
      await board(p.pos, p.sol); if (stopped || cur.probs[cur.k] !== p) return;
      onMoved = (u, info) => moved(p, u, info);
      pz().wait(); act(X.next, { hint: true, nextOn: false });
      $('[data-a=next]').onclick = () => { cur.k++; if (cur.k < cur.probs.length) prob(); else finish(); };
      $('[data-a=hint]').onclick = () => { if (!p.ans || p.done) return; p.hinted = true; pz().mark(p.ans); say(X.hintSay); };
    }
    async function moved(p, u, info) {
      if (stopped || p.done) return;
      if (p.kind === 'tsume') {   // mate within the count; the defender answers from the stored line, else the engine's defence
        const mv = pz().moves();
        if (info.mate) return scored(p, PTS);
        const remain = p.n - mv.length; if (remain <= 0) return scored(p, 0, X.escaped);
        const sol = p.sol || [], onLine = mv.every((x, i) => x === sol[i]);
        let reply = onLine && sol[mv.length] ? sol[mv.length] : null;
        if (!reply && pz().defend) { const r = await pz().defend(remain); if (stopped) return; reply = r && r.reply; }
        if (!reply) return scored(p, 0, X.escaped);
        await sleep(120); await pz().play(reply); if (stopped) return;
        pz().wait(); return;
      }
      scored(p, D.points(p.P, u));
    }
    function scored(p, pts, msg) {
      p.done = true; const n = Math.max(0, pts - (p.hinted && pts > 0 ? HINT_PEN : 0)); cur.res[cur.k] = n; dots();
      if (pts >= 16) say(`${pick(X.good)} <b>${fill(X.pts, { n })}</b>${p.why ? '<br>' + p.why : ''}`);
      else { if (p.ans) pz().mark(p.ans); say(`${msg || (pts > 0 ? X.partial : X.wrong)} <b>${fill(X.pts, { n })}</b>${p.why ? '<br>' + p.why : ''}`); }
      try { chime(pts >= 16); } catch (e) {}
      act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
    }
    function finish() {
      phase = 'done'; dots();
      const max = cur.probs.length * PTS, pts = cur.res.reduce((a, b) => a + (b || 0), 0), q = Math.ceil(max * PASS), pass = cur.save(pts, max);
      say(pass ? fill(X.pass, { p: pts, m: max }) : fill(X.fail, { p: pts, m: max, q }));
      if (pass && window.AtlasConfetti) try { AtlasConfetti(70); } catch (e) {}
      act(pass ? X.nextL : X.again, { again: true });
      $('[data-a=again]').onclick = () => open(cur.key);
      $('[data-a=next]').onclick = pass ? nextItem : () => open(cur.key);
      if (ctx.onDone) try { ctx.onDone(); } catch (e) {}
    }
    function nextItem() {
      const L2 = D.list(ctx.kind, ctx.lang), i = L2.findIndex(x => x.key === cur.key);
      const nx = L2.slice(i + 1).find(x => !x.full && x.st !== 'pass') || L2.slice(i + 1).find(x => !x.full);
      if (nx) open(nx.key); else say(X.endOnly);
    }
    let ac0 = null;
    function chime(ok) {
      try { if (localStorage.getItem('atlas-sfx') === '0') return; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); ac0 = C;
        const t0 = C.currentTime, F = ok ? [523, 659, 784] : [392, 330];
        F.forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + i * .09); g.gain.linearRampToValueAtTime(.08, t0 + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + i * .09 + .3); o.connect(g).connect(C.destination); o.start(t0 + i * .09); o.stop(t0 + i * .09 + .32); });
      } catch (e) {}
    }
    $('[data-a=again]').onclick = () => cur && open(cur.key);
    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); act(X.next, { nextOn: false });
    D.load().then(() => { if (stopped) return; const go = k => k != null ? open(String(k)) : say(X.endOnly); if (ctx.key != null) go(ctx.key); else next(id, ctx.kind, ctx.lang).then(go); }).catch(() => { if (!stopped) say('⚠'); });
    const dbg = { state: () => cur && { key: cur.key, phase, k: cur.k, si: cur.si, res: cur.res.slice(), ans: cur.probs[cur.k] && cur.probs[cur.k].ans, say: $('.tx').textContent },
      answer: async u => { const p = cur && cur.probs[cur.k]; if (!p || !pz()) return; u = u || p.ans; await pz().play(u); moved(p, u, { mate: false }); } };   // (test hook)
    window.__atlasLs = dbg;
    return {
      stop() { stopped = true; if (window.__atlasLs === dbg) delete window.__atlasLs; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el, _debug: dbg,
    };
  }
  window.AtlasLessons = { has: id => !!DATA[id], list, next, start };
})();
