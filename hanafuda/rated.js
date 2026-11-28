/* 花札 — solo rated games (with placement, shared/placement.js) and the review of a month (振り返り解説).
   Strings for 14 languages are here (RT). Loaded after app.js; app.js calls window.HFRated / window.HFReview. */
(function () {
'use strict';
const A = window.HFApp, HF = window.HF;
const RT_STORE = 'aicoding-hanafuda-rated', RT_START = 900;
// Lv.1..20 on the common scale (luck-heavy game: 400 → 1900; spacing follows the paired self-play measurements)
const RT_LV = [0, 400, 470, 540, 610, 680, 750, 820, 890, 960, 1030, 1100, 1180, 1260, 1340, 1420, 1500, 1580, 1660, 1780, 1900];
const RT = {
ja: { ai: 'AI戦', rated: 'レート戦', title: 'レーティング', rec: '{n}局 {w}勝 {l}敗 {d}分', none: 'まだ対局していません', prov: '暫定', vs: '相手：AI Lv.{lv}（R {r}）', res: 'R {o} → {n}（{d}）', note: 'レート戦は標準ルール・6か月で戦います。ヒントとコーチはお休みです。', rest: 'レート戦の間、コーチはお休みです。',
  rv: '振り返る', rvH: '振り返り', best: '最善', good: '悪くない', dub: '疑問手', bad: '悪手', rvBetter: 'より良い手：{c}', rvTake: '{c}を取る', rvDrop: '場に出す', rvSum: 'この月の判断：最善 {a}・悪くない {b}・疑問手 {c}・悪手 {d}', rvWait: '読んでいます…', rvKoi: 'こいこい', rvStop: '勝負', rvClose: '振り返りを閉じる', rvLoss: '見込み {x}点 差' },
en: { ai: 'vs AI', rated: 'Rated', title: 'Rating', rec: '{n} games: {w}W {l}L {d}D', none: 'No games yet', prov: 'provisional', vs: 'Opponent: AI Lv.{lv} (R {r})', res: 'R {o} → {n} ({d})', note: 'Rated games use the standard rules over 6 months. Hints and the coach are off.', rest: 'The coach rests during rated games.',
  rv: 'Review', rvH: 'Review', best: 'Best', good: 'Fine', dub: 'Dubious', bad: 'Mistake', rvBetter: 'Better: {c}', rvTake: 'take {c}', rvDrop: 'lay it on the field', rvSum: 'This month: best {a} · fine {b} · dubious {c} · mistakes {d}', rvWait: 'Reading…', rvKoi: 'koi-koi', rvStop: 'stop', rvClose: 'Close the review', rvLoss: 'about {x} pts behind' },
};
const K = Object.keys(RT.ja);
const MORE = {
zh: ['AI对局', '等级分对局', '等级分', '{n}局 {w}胜 {l}负 {d}平', '还没有对局', '暂定', '对手：AI Lv.{lv}（R {r}）', 'R {o} → {n}（{d}）', '等级分对局使用标准规则，共6个月。提示和教练暂停。', '等级分对局期间教练休息。', '复盘', '复盘', '最佳', '不错', '疑问手', '坏棋', '更好的着法：{c}', '收走{c}', '放到场上', '本月判断：最佳 {a}・不错 {b}・疑问手 {c}・坏棋 {d}', '计算中…', 'こいこい', '决胜', '关闭复盘', '预期差约 {x} 分'],
'zh-TW': ['AI對局', '積分對局', '積分', '{n}局 {w}勝 {l}負 {d}和', '還沒有對局', '暫定', '對手：AI Lv.{lv}（R {r}）', 'R {o} → {n}（{d}）', '積分對局使用標準規則，共6個月。提示和教練暫停。', '積分對局期間教練休息。', '覆盤', '覆盤', '最佳', '不錯', '疑問手', '壞棋', '更好的著法：{c}', '收走{c}', '放到場上', '本月判斷：最佳 {a}・不錯 {b}・疑問手 {c}・壞棋 {d}', '計算中…', 'こいこい', '決勝', '關閉覆盤', '預期差約 {x} 分'],
ko: ['AI 대국', '레이팅전', '레이팅', '{n}국 {w}승 {l}패 {d}무', '아직 대국이 없습니다', '잠정', '상대: AI Lv.{lv} (R {r})', 'R {o} → {n} ({d})', '레이팅전은 표준 규칙·6개월로 겨룹니다. 힌트와 코치는 쉽니다.', '레이팅전 동안 코치는 쉽니다.', '복기', '복기', '최선', '나쁘지 않음', '의문수', '악수', '더 좋은 수: {c}', '{c} 가져오기', '바닥에 내기', '이번 달 판단: 최선 {a}・나쁘지 않음 {b}・의문수 {c}・악수 {d}', '읽는 중…', '코이코이', '승부', '복기 닫기', '기대 약 {x}점 차'],
es: ['Contra la IA', 'Puntuada', 'Puntuación', '{n} partidas: {w}G {l}P {d}E', 'Aún no hay partidas', 'provisional', 'Rival: IA Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Las puntuadas usan las reglas estándar en 6 meses. Sin pistas ni entrenador.', 'El entrenador descansa en las partidas puntuadas.', 'Repasar', 'Repaso', 'Mejor', 'Bien', 'Dudosa', 'Error', 'Mejor: {c}', 'llevarse {c}', 'dejarla en el campo', 'Este mes: mejores {a} · bien {b} · dudosas {c} · errores {d}', 'Calculando…', 'koi-koi', 'parar', 'Cerrar el repaso', 'unos {x} pts menos'],
fr: ['Contre l’IA', 'Classée', 'Classement', '{n} parties : {w}V {l}D {d}N', 'Aucune partie', 'provisoire', 'Adversaire : IA Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Les parties classées se jouent en règles standard sur 6 mois. Ni indices ni coach.', 'Le coach se repose pendant les parties classées.', 'Revoir', 'Revue', 'Meilleur', 'Correct', 'Douteux', 'Erreur', 'Mieux : {c}', 'prendre {c}', 'la poser sur le terrain', 'Ce mois : meilleurs {a} · corrects {b} · douteux {c} · erreurs {d}', 'Calcul…', 'koi-koi', 'arrêter', 'Fermer la revue', 'environ {x} pts de moins'],
pt: ['Contra a IA', 'Ranqueada', 'Rating', '{n} partidas: {w}V {l}D {d}E', 'Nenhuma partida ainda', 'provisório', 'Adversário: IA Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Ranqueadas usam as regras padrão em 6 meses. Sem dicas nem treinador.', 'O treinador descansa nas partidas ranqueadas.', 'Revisar', 'Revisão', 'Melhor', 'Boa', 'Duvidosa', 'Erro', 'Melhor: {c}', 'capturar {c}', 'deixar no campo', 'Este mês: melhores {a} · boas {b} · duvidosas {c} · erros {d}', 'Calculando…', 'koi-koi', 'parar', 'Fechar a revisão', 'cerca de {x} pts a menos'],
de: ['Gegen KI', 'Wertung', 'Wertung', '{n} Partien: {w}S {l}N {d}R', 'Noch keine Partien', 'vorläufig', 'Gegner: KI Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Wertungspartien: Standardregeln über 6 Monate. Ohne Tipps und Coach.', 'Der Coach pausiert in Wertungspartien.', 'Analyse', 'Analyse', 'Bester', 'Gut', 'Fraglich', 'Fehler', 'Besser: {c}', '{c} nehmen', 'aufs Feld legen', 'Dieser Monat: beste {a} · gut {b} · fraglich {c} · Fehler {d}', 'Rechne…', 'Koi-koi', 'aufhören', 'Analyse schließen', 'etwa {x} Pkt. weniger'],
ru: ['С ИИ', 'Рейтинговая', 'Рейтинг', '{n} партий: {w}В {l}П {d}Н', 'Партий пока нет', 'предварительный', 'Соперник: ИИ Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Рейтинговые партии: стандартные правила, 6 месяцев. Без подсказок и тренера.', 'Во время рейтинговой партии тренер отдыхает.', 'Разбор', 'Разбор', 'Лучший', 'Неплохо', 'Сомнительно', 'Ошибка', 'Лучше: {c}', 'взять {c}', 'положить на поле', 'За месяц: лучших {a} · неплохих {b} · сомнительных {c} · ошибок {d}', 'Считаю…', 'кои-кои', 'стоп', 'Закрыть разбор', 'примерно на {x} очк. хуже'],
tr: ['YZ’ye karşı', 'Puanlı', 'Puan', '{n} oyun: {w}G {l}M {d}B', 'Henüz oyun yok', 'geçici', 'Rakip: YZ Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Puanlı oyunlar standart kurallarla 6 ay oynanır. İpucu ve koç kapalı.', 'Puanlı oyunda koç dinleniyor.', 'Analiz', 'Analiz', 'En iyi', 'İyi', 'Şüpheli', 'Hata', 'Daha iyi: {c}', '{c} al', 'alana bırak', 'Bu ay: en iyi {a} · iyi {b} · şüpheli {c} · hata {d}', 'Hesaplanıyor…', 'koi-koi', 'dur', 'Analizi kapat', 'yaklaşık {x} puan geride'],
id: ['Lawan AI', 'Berperingkat', 'Rating', '{n} permainan: {w}M {l}K {d}S', 'Belum ada permainan', 'sementara', 'Lawan: AI Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'Permainan berperingkat memakai aturan standar selama 6 bulan. Tanpa petunjuk dan pelatih.', 'Pelatih istirahat selama permainan berperingkat.', 'Tinjau', 'Tinjauan', 'Terbaik', 'Baik', 'Meragukan', 'Kesalahan', 'Lebih baik: {c}', 'ambil {c}', 'taruh di meja', 'Bulan ini: terbaik {a} · baik {b} · meragukan {c} · kesalahan {d}', 'Menghitung…', 'koi-koi', 'berhenti', 'Tutup tinjauan', 'sekitar {x} poin lebih rendah'],
hi: ['AI से', 'रेटेड', 'रेटिंग', '{n} खेल: {w} जीत {l} हार {d} ड्रॉ', 'अभी कोई खेल नहीं', 'अस्थायी', 'विरोधी: AI Lv.{lv} (R {r})', 'R {o} → {n} ({d})', 'रेटेड खेल मानक नियमों से 6 महीने खेले जाते हैं। संकेत और कोच बंद।', 'रेटेड खेल में कोच आराम कर रहा है।', 'समीक्षा', 'समीक्षा', 'सर्वश्रेष्ठ', 'ठीक', 'संदिग्ध', 'गलती', 'बेहतर: {c}', '{c} उठाएँ', 'मेज़ पर रखें', 'इस महीने: सर्वश्रेष्ठ {a} · ठीक {b} · संदिग्ध {c} · गलती {d}', 'गणना…', 'कोई-कोई', 'रुकें', 'समीक्षा बंद करें', 'लगभग {x} अंक कम'],
ar: ['ضد الذكاء', 'مصنّفة', 'التصنيف', '{n} مباراة: {w} فوز {l} خسارة {d} تعادل', 'لا مباريات بعد', 'مؤقت', 'الخصم: ذكاء Lv.{lv} (R {r})', 'R {o} ← {n} ({d})', 'المباريات المصنّفة بالقواعد القياسية لستة أشهر. بلا تلميحات ولا مدرّب.', 'المدرّب يستريح أثناء المباريات المصنّفة.', 'مراجعة', 'المراجعة', 'الأفضل', 'جيدة', 'مشكوك فيها', 'خطأ', 'الأفضل: {c}', 'أخذ {c}', 'وضعها على الطاولة', 'هذا الشهر: الأفضل {a} · جيدة {b} · مشكوك {c} · أخطاء {d}', 'جارٍ الحساب…', 'كوي-كوي', 'توقّف', 'إغلاق المراجعة', 'أقل بنحو {x} نقطة'],
};
for (const L in MORE) { if (MORE[L].length !== K.length) console.warn('rated i18n', L); RT[L] = {}; K.forEach((k, i) => { RT[L][k] = MORE[L][i]; }); }
const r = (k, v) => { const L = A.LANG(); let x = (RT[L] && RT[L][k]) || RT.en[k] || k; if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
const E = s => A.esc(s);

function load() {
  let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {}
  if (!s || typeof s.r !== 'number') s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
function store(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function pick(R0) {
  const S0 = load();
  if (window.Placement && Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1));
  const u = Math.random(), v = Math.random();
  const off = u < 0.1 ? 150 + v * 150 : u < 0.2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = S0.r + off;
  let lv = 1; for (let i = 1; i <= 20; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  return { lv, or: RT_LV[lv] };
}
const sign = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function settle(m, sc) {
  const R = m.rated; if (!R || R.done) return R && R.done;
  const S = load();
  const old = S.r, pl = window.Placement && Placement.on(S) ? Placement.record(S, R.or, sc) : null;
  const Kf = S.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (R.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + Kf * (sc - Ex)));
  S.r = now; S.n++; if (sc === 1) S.w++; else if (sc === 0) S.l++; else S.d++;
  S.hist.push({ id: R.id, t: Date.now(), lv: R.lv, or: R.or, s: sc, d: now - old, r: now, pl: pl ? pl.k : undefined });
  if (S.hist.length > 100) S.hist = S.hist.slice(-100);
  store(S); R.done = { old, now, d: now - old, pl };
  if (pl && pl.final) Placement.reveal(S, 'Lv.' + nearestLv(now));
  return R.done;
}
function nearestLv(x) { let k = 1; for (let i = 1; i <= 20; i++) if (Math.abs(RT_LV[i] - x) < Math.abs(RT_LV[k] - x)) k = i; return k; }
function card() {
  const S = load();
  const badge = window.Placement && Placement.on(S) ? Placement.badge(S) : S.n < 10 ? `<span class="rt-prov">${E(r('prov'))}</span>` : '';
  return `<div class="rt-card"><div class="rt-head"><span>${E(r('title'))}</span><b>R ${S.r}</b>${badge}</div><div class="rt-rec">${E(S.n ? r('rec', S) : r('none'))}</div>${window.Placement ? Placement.note(S) : ''}<p class="muted">${E(r('note'))}</p></div>`;
}
window.HFRated = { load, store, pick, settle, card, r, RT_LV, sign,
  gate(go) { return window.Placement ? Placement.gate(load(), store, go) : false; },
  resHtml(x) { return x.pl ? Placement.resHtml(x.pl) : `<span class="rt-res">${E(r('res', { o: x.old, n: x.now, d: sign(x.d) }))}</span>`; } };
if (window.Placement) Placement.setLang(() => A.LANG());

/* ---------------- review of a month ---------------- */
// app.js keeps m.dec = [{ s: state before the decision, a: the action taken }] for the player's decisions of the month
function verdict(loss) { return loss <= 0.35 ? 'best' : loss <= 1.2 ? 'good' : loss <= 3 ? 'dub' : 'bad'; }
function actName(s, a) {
  if (a === 'koi') return r('rvKoi'); if (a === 'stop') return r('rvStop');
  if (s.phase === 'pickPlay' || s.phase === 'pickDraw') return r('rvTake', { c: A.cardName(a) });
  const ms = HF.matches(s.field, a);
  return A.cardName(a) + ' — ' + (ms.length ? r('rvTake', { c: ms.length === 3 ? ms.map(A.cardName).join('・') : ms.map(A.cardName).join(' / ') }) : r('rvDrop'));
}
async function review(m, think, box) {
  const dec = m.dec || [];
  box.innerHTML = `<h3><span>${E(r('rvH'))}</span></h3><p class="muted">${E(r('rvWait'))}</p>`;
  const rows = []; const cnt = { best: 0, good: 0, dub: 0, bad: 0 };
  for (let i = 0; i < dec.length; i++) {
    const { s, a } = dec[i];
    if (HF.actions(s).length < 2) continue;
    const res = await think(s, 17);
    const sc = Object.fromEntries(res.scores.map(x => [String(x.a), x.v]));
    const bestA = res.scores[0].a, myName = actName(s, a);
    // equivalent actions (two chaff of the same month…) count as the same move
    const mine = Math.max(...res.scores.filter(x => x.a === a || actName(s, x.a) === myName).map(x => x.v));
    const loss = actName(s, bestA) === myName ? 0 : Math.max(0, (sc[String(bestA)] || 0) - mine);
    const v = verdict(loss); cnt[v]++;
    rows.push(`<li class="rv-${v}"><b>${E(r(v))}</b> ${E(actName(s, a))}${v === 'dub' || v === 'bad' ? `<br><small>${E(r('rvBetter', { c: actName(s, bestA) }))}（${E(r('rvLoss', { x: loss.toFixed(1) }))}）</small>` : ''}</li>`);
    box.innerHTML = `<h3><span>${E(r('rvH'))}</span></h3><ol class="rv-list">${rows.join('')}</ol><p class="muted">${E(r('rvWait'))}</p>`;
  }
  box.innerHTML = `<h3><span>${E(r('rvH'))}</span></h3><p class="rv-sum">${E(r('rvSum', { a: cnt.best, b: cnt.good, c: cnt.dub, d: cnt.bad }))}</p><ol class="rv-list">${rows.join('')}</ol>`;
}
window.HFReview = { review };
})();
