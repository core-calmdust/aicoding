// SeqPrac — the opening practice of the 世界のボドゲ大百科 games, in the style of shogi's (2026-11-10):
// from a position of the opening, the player plays SeqPrac.N (3) moves in a row against the book / the engine. After each move
// the coach box rates it (book move and how often it is played, or what it costs by the engine) and explains the best move;
// at the end a review box (振り返り) shows the correct line (the opening's model line → the main book move → the engine past
// the book) with a 「盤で再生」 button. Points: 20 a move (the mean of the three is the problem's score, 0–20).
// The game gives an adapter (moves are the game's own strings, e.g. UCI / USI):
//   book(line) → [{ u, c }] book moves after `line`, most played first, or null (out of book)
//   analyze(line) → Promise<[{ u, wr }]> every legal move with the side to move's win rate (0..1), best first
//   think(line) → Promise<u | null> the engine's move;  over(line) → the game has ended after `line`
//   name(line, u) → the move's notation (with the side mark);  show(line, anim) → the board at `line`
//   mark(u) → the hint mark on the board;  why(line, bestU, playedU) → coach words on the best move (optional, html)
//   model(line) → the opening's model-line move after `line` (optional);  changed() → the game re-renders its card and coach
//   done(total) → the problem is over (total 0..20)
(function () {
'use strict';
const TX = {"ja": {"intro": "この局面から{n}手指してみよう。1手ごとに、指した手の評価といちばん良い手をここで解説します。", "judge": "指し手を評価しています…", "opp": "相手が考えています…", "you": "あなたの番です（{i}/{n}手目）。", "step": "{i}手目 {m}：{q}", "ans": "{i}手目　答え：{m}", "total": "{n}手の合計 {p}点", "hint": "💡 動かす駒を光らせました（この手は−{n}点）。", "rv": ["振り返り：定跡の正しい進行", "盤で再生", "定跡を調べています…", "緑は定跡どおり、黄は定跡と違った手。(AI)は定跡が途切れた先のAIの手。"], "prevBook": "定跡どおりの手です（実戦での採用率{x}）。", "prevOff": "この局面の定跡は {m}（採用率{x}）などです。", "head": "コーチ", "q": ["最善手", "好手", "疑問手", "悪手", "{p}点"], "same": "AIの第一候補と同じ手です。", "alt": "AIの第一候補は {m} でした。"}, "en": {"intro": "Play {n} moves from this position. After each move, the coach rates it and explains the best move here.", "judge": "Rating your move…", "opp": "The opponent is thinking…", "you": "Your move ({i}/{n}).", "step": "Move {i} {m}: {q}", "ans": "Move {i} — answer: {m}", "total": "Total for {n} moves: {p} pts", "hint": "💡 The piece to move is highlighted (−{n} pts on this move).", "rv": ["Review: the book line", "Play on the board", "Looking up the book…", "Green: as in the book. Yellow: off the book. (AI): past the book, the engine’s move."], "prevBook": "A book move (played {x} of the time).", "prevOff": "The book moves here are {m} (played {x}) and others.", "head": "Coach", "q": ["Best", "Good", "Dubious", "Mistake", "{p} pts"], "same": "The same as the engine’s first choice.", "alt": "The engine’s first choice was {m}."}, "zh": {"intro": "从这个局面走{n}步。每走一步，这里都会评价你的着法并讲解最好的一手。", "judge": "正在评价着法…", "opp": "对手在思考…", "you": "轮到你了（第{i}/{n}步）。", "step": "第{i}步 {m}：{q}", "ans": "第{i}步　答案：{m}", "total": "{n}步合计 {p}分", "hint": "💡 已高亮要走的棋子（本步−{n}分）。", "rv": ["复盘：定式的正确进行", "在棋盘上播放", "正在查定式…", "绿色＝符合定式，黄色＝偏离定式。(AI)＝定式之后AI的着法。"], "prevBook": "这是定式着法（实战采用率{x}）。", "prevOff": "此局面的定式有 {m}（采用率{x}）等。", "head": "教练", "q": ["最佳", "好棋", "疑问手", "坏棋", "{p}分"], "same": "与AI的第一候选相同。", "alt": "AI的第一候选是 {m}。"}, "zh-TW": {"intro": "從這個局面走{n}步。每走一步，這裡都會評價你的著法並講解最好的一手。", "judge": "正在評價著法…", "opp": "對手在思考…", "you": "輪到你了（第{i}/{n}步）。", "step": "第{i}步 {m}：{q}", "ans": "第{i}步　答案：{m}", "total": "{n}步合計 {p}分", "hint": "💡 已標示要走的棋子（本步−{n}分）。", "rv": ["復盤：定跡的正確進行", "在棋盤上播放", "正在查定跡…", "綠色＝符合定跡，黃色＝偏離定跡。(AI)＝定跡之後AI的著法。"], "prevBook": "定跡著法（出現率{x}）。", "prevOff": "這裡的定跡著法是 {m}（出現{x}）等。", "head": "教練", "q": ["最佳", "好棋", "疑問手", "壞棋", "{p}分"], "same": "與AI的第一候選相同。", "alt": "AI的第一候選是 {m}。"}, "ko": {"intro": "이 국면에서 {n}수를 둬 보세요. 한 수마다 둔 수의 평가와 가장 좋은 수를 여기서 해설합니다.", "judge": "수를 평가하는 중…", "opp": "상대가 생각하는 중…", "you": "당신 차례입니다({i}/{n}수째).", "step": "{i}수째 {m}: {q}", "ans": "{i}수째 정답: {m}", "total": "{n}수 합계 {p}점", "hint": "💡 움직일 말을 표시했습니다(이 수 −{n}점).", "rv": ["복기: 정석의 올바른 진행", "판에서 재생", "정석을 찾는 중…", "초록은 정석대로, 노랑은 정석과 다른 수. (AI)는 정석 이후 AI의 수."], "prevBook": "정석대로의 수입니다(실전 채택률 {x}).", "prevOff": "이 국면의 정석은 {m}(채택률 {x}) 등입니다.", "head": "코치", "q": ["최선수", "호수", "의문수", "악수", "{p}점"], "same": "AI의 제1후보와 같은 수입니다.", "alt": "AI의 제1후보는 {m}였습니다."}, "es": {"intro": "Juega {n} jugadas desde esta posición. Tras cada una, el entrenador la valora y explica aquí la mejor.", "judge": "Valorando tu jugada…", "opp": "El rival está pensando…", "you": "Te toca ({i}/{n}).", "step": "Jugada {i} {m}: {q}", "ans": "Jugada {i} — solución: {m}", "total": "Total de {n} jugadas: {p} pts", "hint": "💡 Se resalta la pieza que hay que mover (−{n} pts en esta jugada).", "rv": ["Repaso: la línea de libro", "Reproducir en el tablero", "Buscando en el libro…", "Verde: como el libro. Amarillo: fuera del libro. (AI): pasado el libro, la jugada del motor."], "prevBook": "Una jugada de libro (jugada el {x} de las veces).", "prevOff": "Las jugadas de libro aquí son {m} (jugada {x}) y otras.", "head": "Entrenador", "q": ["Mejor", "Buena", "Dudosa", "Error", "{p} pts"], "same": "La misma que la primera opción del motor.", "alt": "La primera opción del motor era {m}."}, "fr": {"intro": "Jouez {n} coups depuis cette position. Après chaque coup, le coach l’évalue et explique ici le meilleur.", "judge": "Évaluation du coup…", "opp": "L’adversaire réfléchit…", "you": "À vous ({i}/{n}).", "step": "Coup {i} {m} : {q}", "ans": "Coup {i} — solution : {m}", "total": "Total sur {n} coups : {p} pts", "hint": "💡 La pièce à jouer est surlignée (−{n} pts sur ce coup).", "rv": ["Révision : la ligne théorique", "Rejouer sur l’échiquier", "Recherche dans la théorie…", "Vert : conforme à la théorie. Jaune : hors théorie. (AI) : après la théorie, le coup du moteur."], "prevBook": "Un coup de théorie (joué {x} du temps).", "prevOff": "Les coups de théorie ici sont {m} (joué {x}) et d’autres.", "head": "Coach", "q": ["Meilleur", "Bon", "Douteux", "Erreur", "{p} pts"], "same": "Le même que le premier choix du moteur.", "alt": "Le premier choix du moteur était {m}."}, "pt": {"intro": "Jogue {n} lances a partir desta posição. Após cada um, o treinador avalia e explica aqui o melhor.", "judge": "Avaliando seu lance…", "opp": "O rival está pensando…", "you": "Sua vez ({i}/{n}).", "step": "Lance {i} {m}: {q}", "ans": "Lance {i} — solução: {m}", "total": "Total de {n} lances: {p} pts", "hint": "💡 A peça a mover está destacada (−{n} pts neste lance).", "rv": ["Revisão: a linha teórica", "Reproduzir no tabuleiro", "Consultando a teoria…", "Verde: como na teoria. Amarelo: fora da teoria. (AI): após a teoria, o lance do motor."], "prevBook": "Um lance de livro (jogado {x} das vezes).", "prevOff": "Os lances de livro aqui são {m} (jogado {x}) e outros.", "head": "Treinador", "q": ["Melhor", "Bom", "Duvidoso", "Erro", "{p} pts"], "same": "O mesmo que a primeira escolha do motor.", "alt": "A primeira escolha do motor era {m}."}, "de": {"intro": "Spiele {n} Züge aus dieser Stellung. Nach jedem Zug bewertet ihn der Coach und erklärt hier den besten.", "judge": "Zug wird bewertet…", "opp": "Der Gegner denkt nach…", "you": "Du bist am Zug ({i}/{n}).", "step": "Zug {i} {m}: {q}", "ans": "Zug {i} – Lösung: {m}", "total": "Summe aus {n} Zügen: {p} P.", "hint": "💡 Der zu ziehende Stein ist markiert (−{n} P. für diesen Zug).", "rv": ["Rückblick: die Theorie-Variante", "Auf dem Brett abspielen", "Theorie wird gesucht…", "Grün: wie in der Theorie. Gelb: abweichend. (AI): nach der Theorie der Zug der Engine."], "prevBook": "Ein Buchzug (in {x} der Partien gespielt).", "prevOff": "Buchzüge hier sind {m} (gespielt {x}) und andere.", "head": "Coach", "q": ["Bester", "Gut", "Fraglich", "Fehler", "{p} P."], "same": "Derselbe Zug wie die erste Wahl der Engine.", "alt": "Die erste Wahl der Engine war {m}."}, "hi": {"intro": "इस स्थिति से {n} चालें चलें। हर चाल के बाद कोच उसका मूल्यांकन और सबसे अच्छी चाल यहाँ समझाएगा।", "judge": "चाल का मूल्यांकन हो रहा है…", "opp": "विरोधी सोच रहा है…", "you": "आपकी बारी ({i}/{n})।", "step": "चाल {i} {m}: {q}", "ans": "चाल {i} — उत्तर: {m}", "total": "{n} चालों का योग: {p} अंक", "hint": "💡 चलाने वाला मोहरा दिखाया गया है (इस चाल पर −{n} अंक)।", "rv": ["समीक्षा: सही ओपनिंग क्रम", "बोर्ड पर चलाएँ", "ओपनिंग खोजी जा रही है…", "हरा: ओपनिंग के अनुसार। पीला: ओपनिंग से अलग। (AI): ओपनिंग के बाद AI की चाल।"], "prevBook": "एक बुक चाल ({x} बार चली गई)।", "prevOff": "यहाँ की बुक चालें {m} ({x} बार) और अन्य हैं।", "head": "कोच", "q": ["सर्वश्रेष्ठ", "अच्छी", "संदिग्ध", "गलती", "{p} अंक"], "same": "यह इंजन की पहली पसंद जैसी ही चाल है।", "alt": "इंजन की पहली पसंद {m} थी।"}, "ar": {"intro": "العب {n} نقلات من هذا الوضع. بعد كل نقلة يقيّمها المدرب ويشرح هنا أفضل نقلة.", "judge": "جارٍ تقييم النقلة…", "opp": "الخصم يفكر…", "you": "دورك ({i}/{n}).", "step": "النقلة {i} {m}: {q}", "ans": "النقلة {i} — الحل: {m}", "total": "مجموع {n} نقلات: {p} نقطة", "hint": "💡 تم تمييز القطعة المطلوب تحريكها (−{n} على هذه النقلة).", "rv": ["مراجعة: المسار الصحيح للافتتاح", "تشغيل على اللوحة", "جارٍ البحث في الافتتاحيات…", "الأخضر: وفق الافتتاح. الأصفر: خارج الافتتاح. (AI): بعد الافتتاح، نقلة المحرك."], "prevBook": "نقلة من الكتاب (لُعبت بنسبة {x}).", "prevOff": "نقلات الكتاب هنا هي {m} (لُعبت {x}) وغيرها.", "head": "المدرّب", "q": ["الأفضل", "جيدة", "مشكوك فيها", "خطأ", "{p} نقطة"], "same": "هي نفس الخيار الأول للمحرك.", "alt": "كان الخيار الأول للمحرك {m}."}, "ru": {"intro": "Сделайте {n} хода из этой позиции. После каждого тренер оценит ход и объяснит здесь лучший.", "judge": "Оцениваем ход…", "opp": "Соперник думает…", "you": "Ваш ход ({i}/{n}).", "step": "Ход {i} {m}: {q}", "ans": "Ход {i} — ответ: {m}", "total": "Итог за {n} хода: {p} очк.", "hint": "💡 Фигура для хода подсвечена (−{n} очк. за этот ход).", "rv": ["Разбор: правильная дебютная линия", "Показать на доске", "Ищем в дебютной книге…", "Зелёный — по теории. Жёлтый — отклонение. (AI) — после теории ход движка."], "prevBook": "Книжный ход (сыгран в {x} случаев).", "prevOff": "Книжные ходы здесь — {m} (сыгран {x}) и другие.", "head": "Тренер", "q": ["Лучший", "Хороший", "Сомнительный", "Ошибка", "{p} очк."], "same": "То же, что первый выбор движка.", "alt": "Первый выбор движка — {m}."}, "id": {"intro": "Mainkan {n} langkah dari posisi ini. Setiap langkah dinilai pelatih dan langkah terbaik dijelaskan di sini.", "judge": "Menilai langkahmu…", "opp": "Lawan sedang berpikir…", "you": "Giliranmu ({i}/{n}).", "step": "Langkah {i} {m}: {q}", "ans": "Langkah {i} — jawaban: {m}", "total": "Total {n} langkah: {p} poin", "hint": "💡 Bidak yang harus digerakkan disorot (−{n} poin di langkah ini).", "rv": ["Ulasan: jalur pembukaan yang benar", "Putar di papan", "Mencari di buku pembukaan…", "Hijau: sesuai buku. Kuning: di luar buku. (AI): setelah buku, langkah mesin."], "prevBook": "Langkah buku (dimainkan {x}).", "prevOff": "Langkah buku di sini adalah {m} (dimainkan {x}) dan lainnya.", "head": "Pelatih", "q": ["Terbaik", "Bagus", "Meragukan", "Kesalahan", "{p} poin"], "same": "Sama dengan pilihan pertama mesin.", "alt": "Pilihan pertama mesin adalah {m}."}, "tr": {"intro": "Bu konumdan {n} hamle oynayın. Her hamleden sonra koç onu değerlendirir ve en iyi hamleyi burada açıklar.", "judge": "Hamle değerlendiriliyor…", "opp": "Rakip düşünüyor…", "you": "Sıra sizde ({i}/{n}).", "step": "{i}. hamle {m}: {q}", "ans": "{i}. hamle — çözüm: {m}", "total": "{n} hamle toplamı: {p} puan", "hint": "💡 Oynanacak taş işaretlendi (bu hamlede −{n} puan).", "rv": ["Değerlendirme: doğru açılış yolu", "Tahtada oynat", "Açılış kitabına bakılıyor…", "Yeşil: kitaba uygun. Sarı: kitap dışı. (AI): kitaptan sonra motorun hamlesi."], "prevBook": "Bir kitap hamlesi ({x} oranında oynandı).", "prevOff": "Buradaki kitap hamleleri {m} ({x} oynandı) ve diğerleri.", "head": "Koç", "q": ["En iyi", "İyi", "Şüpheli", "Hata", "{p} puan"], "same": "Motorun ilk tercihiyle aynı.", "alt": "Motorun ilk tercihi {m} idi."}};
const PTS = 20, HINT_PEN = 4;
let A = null, S = null;
const lang = () => { const l = (A && A.lang && A.lang()) || document.documentElement.lang || 'ja'; return TX[l] ? l : /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : TX[l.slice(0, 2)] ? l.slice(0, 2) : 'en'; };
const T = () => TX[lang()] || TX.en;
const tx = (k, v) => { let s = T()[k] || TX.en[k] || ''; for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = x => Math.round(x * 100) + '%';
const Q = ['best', 'good', 'dubious', 'bad'];
const qOf = p => p >= PTS ? 0 : p >= 16 ? 1 : p >= 8 ? 2 : 3;
const qName = i => T().q[i];
const ptsS = p => T().q[4].replace('{p}', p);
function share(bk) { if (!bk || !bk.length) return null; const tot = bk.reduce((a, x) => a + x.c, 0); if (tot < 20) return null; return bk.map(x => ({ u: x.u, c: x.c, share: x.c / tot })).sort((a, b) => b.c - a.c); }
const book = line => { try { return share(A.book(line)); } catch (e) { return null; } };
const alive = (s, tok) => S === s && A && (tok == null || s.tok === tok);
function changed() { try { A.changed && A.changed(); } catch (e) { console.warn(e); } paint(); }
// the coach box shows the practice (the game's coach.js render() calls paint() too, so its own refresh never covers it)
function paint() {
  const card = document.getElementById('coachCard'); if (!card || !S) return false;
  card.classList.remove('hidden', 'ck-off', 'ck-rest'); card.classList.add('ck-seq'); document.body.classList.add('ck-tab');
  const h = html(); if (card.dataset.h !== h) { card.dataset.h = h; card.innerHTML = h; }
  bind(card); return true;
}
function start(adapter) {
  A = adapter; S = { N: A.N || 3, i: 0, line: [], steps: [], hint: -1, tok: 0, waiting: true, busy: null, done: false };
  try { A.show([], false); } catch (e) {}
  prefetch(); changed(); return S;
}
function stop() { if (S) S.tok++; S = null; A = null; const c = document.getElementById('coachCard'); if (c) { c.classList.remove('ck-seq'); c.dataset.h = ''; } }
function retry() { if (!S || S.done) return; const a = A; start(a); }
function prefetch() {
  if (!S || S.done || !S.line.length) return;
  const key = S.line.join(' '); if (S.ana && S.ana.key === key) return;
  S.ana = { key, p: Promise.resolve(A.analyze(S.line.slice())).catch(() => []) };
}
const anaOf = line => { const key = line.join(' '); return S.ana && S.ana.key === key ? S.ana.p : Promise.resolve(A.analyze(line.slice())).catch(() => []); };
const whyA = (line, b, u) => { try { return (A.why && A.why(line, b, u)) || ''; } catch (e) { return ''; } };
const why = (line, b, u) => { let w = ''; try { w = (A.why && A.why(line, b, u)) || ''; } catch (e) {} if (w) return w; try { return esc(b === u ? tx('same') : tx('alt', { m: A.name(line, b) })); } catch (e) { return ''; } };
async function move(u) {
  if (!S || S.done || !S.waiting) return;
  const s = S, tok = ++s.tok, before = s.line.slice(), i = s.i;
  s.line = [...before, u]; s.waiting = false; s.busy = 'judge'; try { A.show(s.line, true); } catch (e) {} changed();
  const bk = book(before), mine = bk && bk.find(x => x.u === u);
  let pts, bestU, w = '';
  if (bk && mine) {
    bestU = bk[0].u;
    pts = u === bestU ? PTS : mine.share >= .15 ? 18 : mine.share >= .03 ? 16 : 12;
    w = esc(tx('prevBook', { x: pct(mine.share) })) + (u !== bestU ? ' ' + esc(tx('prevOff', { m: A.name(before, bestU), x: pct(bk[0].share) })) : '');
    const y = whyA(before, bestU, u); if (y) w += ' ' + y;
  } else {
    const list = await anaOf(before); if (!alive(s, tok)) return;
    const best = list[0], me = list.find(x => x.u === u), d = best && me ? Math.max(0, best.wr - me.wr) : (bk ? .1 : 0);
    if (bk) { bestU = bk[0].u; pts = Math.max(0, Math.min(12, Math.round(PTS * (1 - d / .3)))); w = esc(tx('prevOff', { m: A.name(before, bestU), x: pct(bk[0].share) })); }
    else { bestU = best ? best.u : u; pts = !best || !me ? PTS : best.u === u ? PTS : Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - d / .3)))); }
    const y0 = bk ? whyA(before, bestU, u) : why(before, bestU, u); if (y0) w += (w ? ' ' : '') + y0;
  }
  if (s.hint === i) pts = Math.max(0, pts - HINT_PEN);
  s.steps.push({ i, u, name: A.name(before, u), q: qOf(pts), pts, why: w });
  s.i = i + 1;
  await next(s, tok);
}
async function next(s, tok) {
  if (s.i >= s.N || A.over(s.line)) return finish(s);
  s.busy = 'opp'; changed();
  const bk = book(s.line);
  let r = bk ? bk[0].u : null; if (!r && A.model) { try { r = A.model(s.line); } catch (e) {} }   // (no book: the opening's model line)
  if (!r) r = await Promise.resolve(A.think(s.line.slice())).catch(() => null);
  if (!alive(s, tok)) return;
  if (!r) return finish(s);
  await new Promise(res => setTimeout(res, 250)); if (!alive(s, tok)) return;
  s.line = [...s.line, r]; try { A.show(s.line, true); } catch (e) {}
  if (A.over(s.line)) return finish(s);
  s.busy = null; s.waiting = true; prefetch(); changed();
}
function finish(s) {
  const end = A.over(s.line), youWon = end && s.line.length % 2 === 1;   // (the game ended on the player's own move)
  const pts = []; for (let i = 0; i < s.N; i++) { const st = s.steps.find(x => x.i === i); pts.push(st ? st.pts : youWon ? PTS : 0); }
  s.total = Math.round(pts.reduce((a, x) => a + x, 0) / s.N); s.done = true; s.busy = null; s.waiting = false;
  changed();
  try { A.done && A.done(s.total); } catch (e) { console.warn(e); }
  ideal(s);
}
// 振り返り: the correct opening line from the problem position — the opening's own model line, else the main book move; past the
// book the engine's move (marked)
async function ideal(s) {
  const line = [], ai = new Set();
  for (let ply = 0; ply < s.N * 2 - 1; ply++) {
    if (A.over(line)) break;
    let u = null; try { u = A.model ? A.model(line) : null; } catch (e) {}
    if (!u) { const bk = book(line); if (bk) u = bk[0].u; }
    if (!u) { u = await Promise.resolve(A.think(line.slice())).catch(() => null); if (!alive(s)) return; if (u) ai.add(line.length); }
    if (!u) break;
    line.push(u);
  }
  if (!alive(s)) return;
  s.ideal = line; s.idealAi = ai; changed();
}
function play() {
  const s = S; if (!s || !s.ideal) return;
  const tok = s.ptok = (s.ptok || 0) + 1;
  try { A.show([], false); } catch (e) {}
  s.ideal.forEach((u, i) => setTimeout(() => { if (S !== s || s.ptok !== tok) return; try { A.show(s.ideal.slice(0, i + 1), true); } catch (e) {} }, 700 * (i + 1)));
}
async function answer() {
  if (!S || S.done || !S.waiting) return;
  const s = S, tok = ++s.tok, before = s.line.slice(), i = s.i;
  s.waiting = false; s.busy = 'judge'; changed();
  const bk = book(before);
  let bestU = bk ? bk[0].u : null;
  if (!bestU) { const list = await anaOf(before); if (!alive(s, tok)) return; bestU = list[0] ? list[0].u : null; }
  if (!bestU) { s.busy = null; s.waiting = true; changed(); return; }
  let w = bk ? esc(tx('prevBook', { x: pct(bk[0].share) })) : ''; const y = bk ? whyA(before, bestU, bestU) : why(before, bestU, bestU); if (y) w += (w ? ' ' : '') + y;
  s.line = [...before, bestU]; try { A.show(s.line, true); } catch (e) {}
  s.steps.push({ i, u: bestU, name: A.name(before, bestU), q: 3, pts: 0, ans: true, why: w });
  s.i = i + 1; s.answered = true;
  await next(s, tok);
}
function hint() {
  const s = S; if (!s || s.done || !s.waiting || s.hint === s.i) return;
  s.hint = s.i; changed();
  const go = u => { if (S !== s || s.hint !== s.i || !u) return; try { A.mark(u); } catch (e) {} };
  const bk = book(s.line);
  if (bk) go(bk[0].u); else anaOf(s.line).then(l => go(l[0] && l[0].u));
}
// the coach box: the head, (finished) the review box, then the verdicts (newest first)
function html() {
  const s = S; if (!s) return '';
  const I = window.CoachKit && CoachKit.ICON ? CoachKit.ICON.coach : '';
  let h = `<h3 class="ck-h">${I}<span>${esc(tx('head'))}</span><small>${Math.min(s.i + (s.done ? 0 : 1), s.N)}/${s.N}</small></h3>`;
  if (!s.steps.length && !s.done) h += `<p class="ck-muted">${esc(tx('intro', { n: s.N }))}</p>`;
  if (s.done) {
    const RV = T().rv || TX.en.rv, tot = `<b class="sq-tot">${esc(tx('total', { n: s.N, p: s.total }))}</b>`;
    if (s.ideal) {
      let names = []; try { names = s.ideal.map((u, i) => A.name(s.ideal.slice(0, i), u)); } catch (e) {}
      h += `<div class="sq-rv"><div class="sq-rvh"><h4>${esc(RV[0])}</h4>${tot}</div><p class="sq-line">${names.map((k, i) => `<span class="${i % 2 ? 'op' : s.line[i] === s.ideal[i] ? 'ok' : 'df'}">${esc(k)}${s.idealAi.has(i) ? '<small>(AI)</small>' : ''}</span>`).join(' ')}</p><p class="sq-note">${esc(RV[3])}</p><button type="button" class="sq-play" data-sq="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${esc(RV[1])}</button></div>`;
    } else h += `<div class="sq-rv"><div class="sq-rvh"><h4>${esc(RV[0])}</h4>${tot}</div><p class="ck-calc" style="margin:0">${esc(RV[2])}</p></div>`;
  } else if (s.busy) h += `<p class="ck-calc">${esc(tx(s.busy))}</p>`;
  for (const st of s.steps.slice().reverse()) {
    const title = st.ans ? tx('ans', { i: st.i + 1, m: st.name }) : tx('step', { i: st.i + 1, m: st.name, q: qName(st.q) }) + '　' + ptsS(st.pts);
    h += window.CoachKit ? CoachKit.verdict(st.ans ? 2 : st.q, esc(title), st.why) : `<div><b>${esc(title)}</b><p>${st.why}</p></div>`;
  }
  return h;
}
function bind(root) { const b = root && root.querySelector('[data-sq=play]'); if (b) b.onclick = play; }
// a short line for the game's own card: the last verdict, then whose turn it is
function status() {
  const s = S; if (!s) return '';
  if (s.done) return `<b>${esc(tx('total', { n: s.N, p: s.total }))}</b>`;
  const last = s.steps[s.steps.length - 1];
  const lv = last ? `<b class="${last.ans ? '' : last.pts >= 16 ? 'ok' : last.pts < 8 ? 'ng' : ''}">${esc(last.ans ? tx('ans', { i: last.i + 1, m: last.name }) : tx('step', { i: last.i + 1, m: last.name, q: qName(last.q) }))}</b><br>` : '';
  if (s.hint === s.i && s.waiting) return lv + esc(tx('hint', { n: HINT_PEN }));
  return lv + `<span class="ts-left">${esc(s.busy ? tx(s.busy) : tx('you', { i: s.i + 1, n: s.N }))}</span>`;
}
const CSS = `html body #coachCard#coachCard.ck-seq{display:block!important}   /* (games hide the coach in lessons: the practice shows it) */
#coachCard .sq-rv{margin:10px 0 12px;padding:12px 14px 14px;border-radius:14px;border:1.5px solid rgba(201,169,97,.45);background:rgba(201,169,97,.08)}
#coachCard .sq-rvh{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}#coachCard .sq-rvh h4{flex:1 1 auto;min-width:0;margin:0!important;font-size:13.5px;color:var(--accent,var(--brass,#d8b56a))}
#coachCard .sq-tot{flex:none;font-size:12.5px;padding:2px 9px;border-radius:99px;background:rgba(201,169,97,.18);color:var(--accent,var(--brass,#d8b56a));white-space:nowrap}
#coachCard .sq-line{margin:0 0 6px;line-height:1.9;font-size:14.5px}#coachCard .sq-line span{white-space:nowrap}#coachCard .sq-line .ok{color:#6fd3a0;font-weight:700}#coachCard .sq-line .df{color:#e8b25a;font-weight:700}#coachCard .sq-line .op{opacity:.75}#coachCard .sq-line small{font-size:.75em;opacity:.8}
#coachCard .sq-note{margin:0 0 10px;font-size:12px;line-height:1.6;color:var(--muted,var(--dim,#aaa))}
#coachCard .sq-play{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;height:40px;border-radius:12px;border:0;background:var(--accent,var(--brass,#d8b56a));color:#1a140c;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit}
#coachCard .sq-play svg{width:15px;height:15px;fill:currentColor}
html.atlas-skin #coachCard .sq-rv{background:#fff7e6;border:2px solid #f0d9a8}
html.atlas-skin #coachCard .sq-rvh h4{color:#c47a12}
html.atlas-skin #coachCard .sq-tot{background:#fff;border:1.5px solid #f0d9a8;color:#2b3044}
html.atlas-skin #coachCard .sq-line .ok{color:#1e8a55}html.atlas-skin #coachCard .sq-line .df{color:#b8771a}
html.atlas-skin #coachCard .sq-note{color:#7a7f90}
html.atlas-skin #coachCard .sq-play{background:#ffb627;color:#fff;box-shadow:0 3px 0 #e09400;text-shadow:0 1px 0 rgba(160,90,0,.35)}
html.atlas-skin #coachCard .sq-play:hover{background:#ffc23f}`;
if (!document.getElementById('seqprac-css')) { const st = document.createElement('style'); st.id = 'seqprac-css'; st.textContent = CSS; document.head.appendChild(st); }
window.SeqPrac = { start, stop, paint, retry, move, hint, answer, play, html, bind, status, tx, active: () => !!S, state: () => S, N: 3, PTS, HINT_PEN };
})();
