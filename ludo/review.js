/* ludo/review.js — 形勢・手順ナビ・振り返り（共通仕様：形勢カード＋◀▶、棋譜のクリック、［分析］で振り返りカード）
   - 形勢カード（#evalCard）：あなた（二人以上の対戦では手番の色）の勝率のバーとグラフ（engine.js の winProb。マルチスレッドが
     オンなら各局面を Lv.20 同士で最後まで打ったロールアウトの勝率に順に置き換える：ludo/mt.js）、
     手順ナビ（|< < ▶ > >|、← → ↑ ↓ キー）。過去の局面を見ている間はその手の動きを盤に矢印で示す。
   - 振り返り（#reviewCard）：人の指した手を Lv.20 の評価で調べ、勝率の損失で ◎最善／○悪くない／△疑問手／✕悪手。
     正確さ・判定の数・表示中の手の解説（最善手つき）・疑問手と悪手の一覧（押すとその局面へ）。
   Uses the globals of app.js (classic scripts): G, VIEW, placeAll, showThrow, renderKifu, humanSeat, colName, seatColor … */
'use strict';
(function () {
const T = {
  ja: { eval: '形勢', you: 'あなた', btn: '分析', head: '振り返り', acc: '正確さ', best: '最善', good: '悪くない', dubious: '疑問手', bad: '悪手', forced: '一手のみ', running: '分析中… {i}/{n}', none: '疑問手・悪手はありませんでした。見事な一局です。', list: '疑問手・悪手', played: '{s}の手 {m}：この手のあと勝率 {a}%（最善 {bm} なら {b}%）', start: '対局の開始局面です。', cur: '現在の局面', final: '最終局面', pick: '一覧の手を押すと、その局面を盤に表示します。', close: '閉じる', pass: 'パス', rollAt: '目 {v}' },
  en: { eval: 'Position', you: 'You', btn: 'Analyse', head: 'Review', acc: 'Accuracy', best: 'Best', good: 'Fine', dubious: 'Dubious', bad: 'Mistake', forced: 'Only move', running: 'Analysing… {i}/{n}', none: 'No dubious moves or mistakes — a fine game.', list: 'Dubious moves and mistakes', played: '{s} played {m}: win chance after it {a}% (best {bm}: {b}%)', start: 'The start of the game.', cur: 'Current position', final: 'Final position', pick: 'Tap a move in the list to see that position.', close: 'Close', pass: 'Pass', rollAt: 'roll {v}' },
  zh: { eval: '形势', you: '你', btn: '分析', head: '复盘', acc: '准确度', best: '最佳', good: '不错', dubious: '疑问手', bad: '恶手', forced: '唯一着法', running: '分析中… {i}/{n}', none: '没有疑问手或恶手，下得很好。', list: '疑问手与恶手', played: '{s}走了 {m}：之后胜率 {a}%（最佳 {bm}：{b}%）', start: '对局开始的局面。', cur: '当前局面', final: '最终局面', pick: '点击列表中的一手即可在棋盘上查看该局面。', close: '关闭', pass: '跳过', rollAt: '点数 {v}' },
  'zh-TW': { eval: '形勢', you: '你', btn: '分析', head: '覆盤', acc: '準確度', best: '最佳', good: '不錯', dubious: '疑問手', bad: '惡手', forced: '唯一著法', running: '分析中… {i}/{n}', none: '沒有疑問手或惡手，下得很好。', list: '疑問手與惡手', played: '{s}走了 {m}：之後勝率 {a}%（最佳 {bm}：{b}%）', start: '對局開始的局面。', cur: '目前局面', final: '最終局面', pick: '點擊列表中的一手即可在棋盤上查看該局面。', close: '關閉', pass: '跳過', rollAt: '點數 {v}' },
  ko: { eval: '형세', you: '나', btn: '분석', head: '복기', acc: '정확도', best: '최선', good: '나쁘지 않음', dubious: '의문수', bad: '악수', forced: '유일한 수', running: '분석 중… {i}/{n}', none: '의문수·악수가 없었습니다. 훌륭한 한 판이에요.', list: '의문수·악수', played: '{s}의 수 {m}: 이후 승률 {a}% (최선 {bm}: {b}%)', start: '대국 시작 국면입니다.', cur: '현재 국면', final: '최종 국면', pick: '목록의 수를 누르면 그 국면을 판에 보여 줍니다.', close: '닫기', pass: '패스', rollAt: '눈 {v}' },
  es: { eval: 'Posición', you: 'Tú', btn: 'Analizar', head: 'Repaso', acc: 'Precisión', best: 'Mejor', good: 'Bien', dubious: 'Dudosa', bad: 'Error', forced: 'Única', running: 'Analizando… {i}/{n}', none: 'Sin jugadas dudosas ni errores: una gran partida.', list: 'Jugadas dudosas y errores', played: '{s} jugó {m}: probabilidad después {a}% (mejor {bm}: {b}%)', start: 'El inicio de la partida.', cur: 'Posición actual', final: 'Posición final', pick: 'Toca una jugada de la lista para ver esa posición.', close: 'Cerrar', pass: 'Pasar', rollAt: 'tirada {v}' },
  fr: { eval: 'Position', you: 'Vous', btn: 'Analyser', head: 'Analyse', acc: 'Précision', best: 'Meilleur', good: 'Correct', dubious: 'Douteux', bad: 'Erreur', forced: 'Seul coup', running: 'Analyse… {i}/{n}', none: 'Aucun coup douteux ni erreur : belle partie.', list: 'Coups douteux et erreurs', played: '{s} a joué {m} : chances ensuite {a} % (meilleur {bm} : {b} %)', start: 'Le début de la partie.', cur: 'Position actuelle', final: 'Position finale', pick: 'Touchez un coup de la liste pour voir cette position.', close: 'Fermer', pass: 'Passer', rollAt: 'jet {v}' },
  pt: { eval: 'Posição', you: 'Você', btn: 'Analisar', head: 'Revisão', acc: 'Precisão', best: 'Melhor', good: 'Bom', dubious: 'Duvidoso', bad: 'Erro', forced: 'Lance único', running: 'Analisando… {i}/{n}', none: 'Nenhum lance duvidoso ou erro: belo jogo.', list: 'Lances duvidosos e erros', played: '{s} jogou {m}: chance depois {a}% (melhor {bm}: {b}%)', start: 'O início da partida.', cur: 'Posição atual', final: 'Posição final', pick: 'Toque num lance da lista para ver essa posição.', close: 'Fechar', pass: 'Passar', rollAt: 'lance {v}' },
  de: { eval: 'Stellung', you: 'Du', btn: 'Analyse', head: 'Rückblick', acc: 'Genauigkeit', best: 'Bester', good: 'Gut', dubious: 'Fraglich', bad: 'Fehler', forced: 'Einziger Zug', running: 'Analysiere… {i}/{n}', none: 'Keine fraglichen Züge oder Fehler – eine schöne Partie.', list: 'Fragliche Züge und Fehler', played: '{s} zog {m}: Gewinnchance danach {a} % (bester {bm}: {b} %)', start: 'Der Anfang der Partie.', cur: 'Aktuelle Stellung', final: 'Schlussstellung', pick: 'Tippe einen Zug in der Liste an, um die Stellung zu sehen.', close: 'Schließen', pass: 'Passen', rollAt: 'Wurf {v}' },
  ru: { eval: 'Позиция', you: 'Вы', btn: 'Анализ', head: 'Разбор', acc: 'Точность', best: 'Лучший', good: 'Неплохо', dubious: 'Сомнительный', bad: 'Ошибка', forced: 'Единственный', running: 'Анализ… {i}/{n}', none: 'Ни сомнительных ходов, ни ошибок — отличная партия.', list: 'Сомнительные ходы и ошибки', played: '{s}: {m} — шанс после хода {a}% (лучший {bm}: {b}%)', start: 'Начало партии.', cur: 'Текущая позиция', final: 'Итоговая позиция', pick: 'Нажмите на ход в списке, чтобы увидеть позицию.', close: 'Закрыть', pass: 'Пас', rollAt: 'бросок {v}' },
  tr: { eval: 'Durum', you: 'Sen', btn: 'Analiz', head: 'Değerlendirme', acc: 'İsabet', best: 'En iyi', good: 'İyi', dubious: 'Şüpheli', bad: 'Hata', forced: 'Tek hamle', running: 'Analiz ediliyor… {i}/{n}', none: 'Şüpheli hamle ya da hata yok — güzel bir oyun.', list: 'Şüpheli hamleler ve hatalar', played: '{s}: {m} — sonrasında kazanma şansı %{a} (en iyi {bm}: %{b})', start: 'Oyunun başlangıcı.', cur: 'Şimdiki durum', final: 'Son durum', pick: 'Konumu görmek için listedeki bir hamleye dokun.', close: 'Kapat', pass: 'Pas', rollAt: 'zar {v}' },
  id: { eval: 'Posisi', you: 'Kamu', btn: 'Analisis', head: 'Ulasan', acc: 'Akurasi', best: 'Terbaik', good: 'Baik', dubious: 'Meragukan', bad: 'Kesalahan', forced: 'Satu-satunya', running: 'Menganalisis… {i}/{n}', none: 'Tak ada langkah meragukan atau kesalahan — permainan bagus.', list: 'Langkah meragukan dan kesalahan', played: '{s} memainkan {m}: peluang menang setelahnya {a}% (terbaik {bm}: {b}%)', start: 'Awal permainan.', cur: 'Posisi sekarang', final: 'Posisi akhir', pick: 'Ketuk langkah di daftar untuk melihat posisinya.', close: 'Tutup', pass: 'Lewati', rollAt: 'lemparan {v}' },
  hi: { eval: 'स्थिति', you: 'आप', btn: 'विश्लेषण', head: 'समीक्षा', acc: 'सटीकता', best: 'सर्वोत्तम', good: 'ठीक', dubious: 'संदिग्ध', bad: 'ग़लती', forced: 'एकमात्र चाल', running: 'विश्लेषण… {i}/{n}', none: 'कोई संदिग्ध चाल या ग़लती नहीं — बढ़िया खेल।', list: 'संदिग्ध चालें और ग़लतियाँ', played: '{s} ने {m} चली: इसके बाद जीत की संभावना {a}% (सर्वोत्तम {bm}: {b}%)', start: 'खेल की शुरुआत।', cur: 'वर्तमान स्थिति', final: 'अंतिम स्थिति', pick: 'स्थिति देखने के लिए सूची में किसी चाल को छुएँ।', close: 'बंद करें', pass: 'पास', rollAt: 'अंक {v}' },
  ar: { eval: 'الوضع', you: 'أنت', btn: 'تحليل', head: 'المراجعة', acc: 'الدقة', best: 'الأفضل', good: 'جيدة', dubious: 'مشكوك فيها', bad: 'خطأ', forced: 'النقلة الوحيدة', running: 'جارٍ التحليل… {i}/{n}', none: 'لا نقلات مشكوك فيها ولا أخطاء — مباراة رائعة.', list: 'نقلات مشكوك فيها وأخطاء', played: '{s} لعب {m}: فرصة الفوز بعدها {a}% (الأفضل {bm}: {b}%)', start: 'بداية المباراة.', cur: 'الوضع الحالي', final: 'الوضع النهائي', pick: 'المس نقلة في القائمة لترى وضعها.', close: 'إغلاق', pass: 'تمرير', rollAt: 'الرمية {v}' },
};
const tr = (k, v) => { let x = (T[LANG] || T.en)[k]; if (x === undefined) x = T.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const Q = ['best', 'good', 'dubious', 'bad'];
let cur = 0, R = null, ver = 0;   // cur: plies shown (0..n; n = the latest position); R = { id, res: [judge|null], done }
const n = () => G && G.plies ? G.plies.length : 0;
const atLatest = () => cur >= n();
const myTeam = () => { const s = G.state; const h = s.seats.find(x => s.ctrl[x] === 0); return s.team[h == null ? s.turn : h]; };
const fullMove = (p, mv) => E.legalMoves(p.s, p.thr).find(x => mv.pass ? x.pass : !x.pass && x.k === mv.k && x.to === mv.to && x.k2 === mv.k2 && !!x.back === !!mv.back && String(x.use || '') === String(mv.use || '')) || mv;

/* ---------- the position card: win chance bar, graph, navigation ---------- */
function stateAt(i) { return i >= n() ? G.state : G.plies[i].s; }
// threads (ludo/mt.js): every position played out to the end on all cores; those win chances replace the fit as they come in
let RW = { id: null, v: new Map() }, rwBusy = false, rwT = 0;
function wpAt(i, tm) { if (RW.id === (G && G.id)) { const v = RW.v.get(i + ':' + tm); if (v !== undefined) return v; } return E.winProb(stateAt(i), tm); }
function rwKick() {
  if (!G || rwBusy || !window.LudoMT || !LudoMT.on()) return;
  if (RW.id !== G.id) { LudoMT.cancel('review'); RW = { id: G.id, v: new Map() }; }
  const pvp = G.mode === 'pvp', list = [], N = n();
  for (let k = 0; k <= N; k++) {
    const i = k === 0 ? N : k - 1, st = stateAt(i), tm = pvp ? st.team[st.turn] : myTeam();   // (the latest position first)
    if (!RW.v.has(i + ':' + tm) && !st.over) list.push({ i, tm, state: st, team: tm });
  }
  if (!list.length) return;
  list.length = Math.min(list.length, 2 * LudoMT.threads);   // (a few at a time: a new latest position goes first)
  const my = RW; rwBusy = true;
  LudoMT.wpMany(list, (j, wp) => {
    if (RW !== my) return; RW.v.set(list[j].i + ':' + list[j].tm, wp);
    if (!rwT) rwT = setTimeout(() => { rwT = 0; wpCache.k = ''; renderEval(); }, 250);
  }).then(r => { rwBusy = false; if (RW === my && r) setTimeout(rwKick, 0); });
}
function wpSeries() {
  const tm = myTeam(), out = [];
  for (let i = 0; i <= n(); i++) out.push(wpAt(i, G.mode === 'pvp' ? stateAt(i).team[stateAt(i).turn] : tm));
  return out;
}
let wpCache = { k: '', v: [] };
function renderEval() {
  const card = $('#evalCard'); if (!card || !G) return;
  if (!VIEW) cur = n();
  const pvp = G.mode === 'pvp', st = stateAt(cur), tm = pvp ? st.team[st.turn] : myTeam();
  const w = st.over ? E.winProb(st, tm) : wpAt(cur, tm), seat = pvp ? st.turn : st.seats.find(x => st.ctrl[x] === 0);
  rwKick();
  $('#evalText').innerHTML = `<i class="ev-dot" style="background:${seatColor(seat == null ? st.turn : seat)}"></i>${esc(pvp ? colName(st.turn) : tr('you'))} ${Math.round(w * 100)}%`;
  $('#evalFill').style.width = (w * 100).toFixed(1) + '%';
  const key = G.id + ':' + n() + ':' + pvp; if (wpCache.k !== key) wpCache = { k: key, v: pvp ? [] : wpSeries() };
  const S = wpCache.v, g = $('#graph');
  if (S.length > 1) {
    const X = i => (i / (S.length - 1) * 300).toFixed(1), Y = v => (70 - v * 66).toFixed(1);
    g.innerHTML = `<line x1="0" x2="300" y1="37" y2="37" class="mid"/><polyline class="ln" points="${S.map((v, i) => X(i) + ',' + Y(v)).join(' ')}"/><line class="cur" x1="${X(cur)}" x2="${X(cur)}" y1="0" y2="74"/>`;
  } else g.innerHTML = '';
  g.style.display = pvp || S.length < 2 ? 'none' : '';
  $$nav().forEach(b => { const a = b.dataset.n; b.disabled = !G.plies.length || ((a === 'first' || a === 'prev') && cur === 0) || ((a === 'next' || a === 'last') && atLatest()); });
}
const $$nav = () => [...document.querySelectorAll('#navBar button')];
const canNav = () => !!G && !SP && !busy && (G.state.over || (humanSeat(G.state.turn) && (!G.thr || !moves.some(m => !m.pass)) ) || G.mode === 'pvp' || G.state.over);
function go(i) {
  if (!G) return; i = Math.max(0, Math.min(n(), i));
  if (i < n() && !canNav()) { toast(t('hint.wait')); return; }
  cur = i;
  if (atLatest()) { VIEW = null; placeAll(); showThrow(G.thr); clearMarks(); if (typeof previewMove === 'function') previewMove(null); }
  else {
    const p = G.plies[cur]; VIEW = p.s; placeAll(); showThrow(p.thr.dice ? p.thr : Object.assign({}, E.throwsOf(p.s.rule).find(x => x.v === p.thr.v)));
    if (typeof previewMove === 'function') { const keep = G.state; previewOf(p); void keep; }
  }
  document.body.classList.toggle('reviewing', !atLatest());
  renderEval(); renderKifu(); paint();
  if (window.LudoCoach) LudoCoach.render();
}
// the move of ply i on the board: an arrow (green = it was the best, red = a mistake), the best move in green when it differs
function previewOf(p) {
  const g = document.querySelector('#gPrev'); if (!g || !window.LudoLearn) return;
  const st = p.s, seat = p.seat, L = E.lastOf(st), gm = B.geometry(st.rule);
  const at = (q, k) => q < 0 ? gm.yard(seat, k) : q >= L ? gm.home(seat, k) : gm.cellXY(seat, q);
  const mk = [], i = G.plies.indexOf(p), j = R && R.res[i];
  const col = j && j.q >= 2 ? '#ff6b5b' : '#ffd84a';
  if (p.m && !p.m.pass) { mk.push({ type: 'arrow', from: at(p.m.enter ? -1 : p.m.from, p.m.k), to: at(p.m.to, p.m.k), color: col }); }
  if (j && j.q >= 2 && j.best && !j.best.move.pass) { const b = j.best.move; mk.push({ type: 'arrow', from: at(b.enter ? -1 : b.from, b.k), to: at(b.to, b.k), color: '#3df59a' }); }
  g.innerHTML = LudoLearn.marksSVG(mk);
}
function toLatest() { if (!atLatest() || VIEW) { cur = n(); VIEW = null; document.body.classList.remove('reviewing'); placeAll(); if (G) showThrow(G.thr); if (typeof previewMove === 'function') previewMove(null); renderEval(); } }
document.addEventListener('click', e => {
  const b = e.target.closest('#navBar button'); if (b) { const a = b.dataset.n; if (a === 'first') go(0); else if (a === 'prev') go(cur - 1); else if (a === 'next') go(cur + 1); else if (a === 'last') go(n()); else if (a === 'play') autoplay(); return; }
  const k = e.target.closest('#kifu .k[data-i]'); if (k) go(+k.dataset.i);
});
let playT = 0;
function autoplay() { if (playT) { clearInterval(playT); playT = 0; $('#navBar').classList.remove('playing'); return; } if (atLatest()) go(0); $('#navBar').classList.add('playing'); playT = setInterval(() => { if (atLatest()) { clearInterval(playT); playT = 0; $('#navBar').classList.remove('playing'); return; } go(cur + 1); }, 1200); }
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea') || document.querySelector('.overlay.show') || !G || !G.plies.length || SP) return;
  const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return;
  const rtl = document.documentElement.dir === 'rtl';
  e.preventDefault();
  if (k === 'ArrowLeft') go(cur + (rtl ? 1 : -1)); else if (k === 'ArrowRight') go(cur + (rtl ? -1 : 1)); else if (k === 'ArrowUp') go(0); else go(n());
});

/* ---------- the review ---------- */
function humanPly(p) { return G.mode === 'pvp' || G.state.ctrl[p.seat] === 0; }
async function run() {
  if (!G || !G.plies.length) { toast(t('kifu.empty')); return; }
  if (!window.LudoCoach) return;
  const id = G.id + ':' + n();
  $('#reviewCard').classList.add('show');
  if (R && R.id === id) { paint(); return; }
  R = { id, res: [], done: false, i: 0 }; ver++; paint();
  const my = R, list = G.plies;
  for (let i = 0; i < list.length; i++) {
    if (R !== my) return;
    const p = list[i];
    if (humanPly(p) && p.m) { const real = E.legalMoves(p.s, p.thr).filter(x => !x.pass).length; R.res[i] = real >= 2 || (p.s.rule === 'pachisi' && real >= 1) ? LudoCoach.judge(p) : { q: -1 }; }
    R.i = i + 1;
    if (i % 6 === 5) { ver++; paint(); renderKifu(); await new Promise(r => setTimeout(r, 0)); }
  }
  if (R !== my) return; R.done = true; ver++; paint(); renderKifu();
  if (cur >= n() && G.state.over) { const bad = R.res.findIndex(x => x && x.q >= 2); if (bad >= 0) go(bad); }
}
function counts(seatList) {
  const c = [0, 0, 0, 0]; let tot = 0, k = 0;
  G.plies.forEach((p, i) => { if (!seatList.includes(p.seat)) return; const j = R && R.res[i]; if (!j || j.q < 0 || j.forced) return; c[j.q]++; tot += j.loss; k++; });
  return { c, acc: k ? Math.max(0, Math.round(100 - tot / k * 400)) : null };
}
function sideName(seat) { return G.mode === 'pvp' ? colName(seat) : G.state.ctrl[seat] === 0 ? tr('you') + (G.state.rule === 'pachisi' && G.state.players === 2 ? '（' + colName(seat) + '）' : '') : colName(seat); }
function explain(i) {
  if (i >= n()) return esc(tr(G.state.over ? 'final' : 'cur'));
  const p = G.plies[i], j = R && R.res[i];
  const mv = p.m && !p.m.pass ? E.moveText(p.s, fullMove(p, p.m)) : tr('pass');
  if (!j || j.q < 0) return `<b>${esc(sideName(p.seat))}</b> ${esc(tr('rollAt', { v: p.thr.v }))} — ${esc(mv)}`;
  const bm = j.best.move, bt = bm.pass ? tr('pass') : E.moveText(p.s, bm);
  return `<span class="tag ${Q[j.q]}">${esc(tr(j.forced ? 'forced' : Q[j.q]))}</span> ${esc(tr('played', { s: sideName(p.seat), m: mv, a: Math.round((j.played ? j.played.wp : j.best.wp) * 100), b: Math.round(j.best.wp * 100), bm: bt }))}` +
    (j.q >= 2 && window.LudoCoach ? `<br><small>${esc(LudoCoach.tx('c.' + LudoCoach.classify(p.s, bm, p.thr).k))}: ${esc(LudoCoach.tx('x.' + LudoCoach.classify(p.s, bm, p.thr).k, LudoCoach.classify(p.s, bm, p.thr)))}</small>` : '');
}
function paint() {
  const card = $('#reviewCard'); if (!card || !card.classList.contains('show') || !R) return;
  const humans = G.state.seats.filter(x => G.mode === 'pvp' || G.state.ctrl[x] === 0);
  const groups = G.mode === 'pvp' ? humans.map(x => [x]) : [humans];
  let h = '';
  if (!R.done) h += `<div class="rv-note">${esc(tr('running', { i: R.i, n: n() }))}</div><div class="rv-prog"><i style="width:${Math.round(R.i / Math.max(1, n()) * 100)}%"></i></div>`;
  h += `<div class="rv-sum">` + groups.map(gr => { const c = counts(gr); return `<div class="rv-side"><h4>${gr.map(x => `<i class="ev-dot" style="background:${seatColor(x)}"></i>`).join('')}${esc(G.mode === 'pvp' ? colName(gr[0]) : tr('you'))}</h4><div class="acc">${c.acc == null ? '—' : c.acc}<small>${esc(tr('acc'))}</small></div><div class="qc">${Q.map((q, k) => `<span class="${q}">${esc(tr(q))} ${c.c[k]}</span>`).join('')}</div></div>`; }).join('') + `</div>`;
  h += `<div class="rv-cur">${explain(cur)}</div>`;
  const bad = G.plies.map((p, i) => [p, i, R.res[i]]).filter(x => x[2] && x[2].q >= 2);
  if (R.done && !bad.length) h += `<div class="rv-note">${esc(tr('none'))}</div>`;
  if (bad.length) h += `<div class="rv-lh">${esc(tr('list'))}</div><div class="rv-list">` + bad.map(([p, i, j]) => `<button data-i="${i}" class="${i === cur ? 'on' : ''}"><span class="tag ${Q[j.q]}">${esc(tr(Q[j.q]))}</span><span>${i + 1}. ${esc(sideName(p.seat))} ${esc(p.m && !p.m.pass ? E.moveText(p.s, fullMove(p, p.m)) : tr('pass'))}</span></button>`).join('') + `</div><div class="rv-note">${esc(tr('pick'))}</div>`;
  $('#rvBody').innerHTML = h;
}
$('#rvBody') && $('#rvBody').addEventListener('click', e => { const b = e.target.closest('.rv-list button[data-i]'); if (b) go(+b.dataset.i); });
{ const c = document.getElementById('rvClose'); if (c) c.onclick = () => close(); }
function close() { const c = $('#reviewCard'); if (c) c.classList.remove('show'); toLatest(); renderKifu(); if (window.LudoCoach) LudoCoach.render(); }
function quality(i) { const j = R && R.res[i]; return j && j.q >= 2 ? Q[j.q] : ''; }
function reset() { R = null; cur = 0; VIEW = null; wpCache.k = ''; const c = $('#reviewCard'); if (c) c.classList.remove('show'); document.body.classList.remove('reviewing'); }
function invalidate() { if (R && !G.state.over) { R = null; const c = $('#reviewCard'); if (c) c.classList.remove('show'); } cur = n(); VIEW = null; document.body.classList.remove('reviewing'); renderEval(); }
{ const b = document.getElementById('btnAnalyze'); if (b) b.onclick = () => run(); }
function relabel() { document.querySelectorAll('[data-rv]').forEach(el => { el.textContent = tr(el.dataset.rv); }); paint(); renderEval(); }
setTimeout(() => { relabel(); if (G) renderKifu(); }, 0);
window.LudoRv = { run, close, reset, invalidate, quality, go, toLatest, renderEval, relabel, tr, cur: () => (VIEW ? cur : n()), ver: () => ver, get on() { return !!R; } };
})();
