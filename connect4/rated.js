/* レーティング戦 — solo rated games against the AI with a local Elo rating (same scheme as dots/rated.js).
 * Loaded after the main script; it wraps a few of the main script's functions instead of editing them.
 * Ratings of the AI levels and how they were measured: see RATING.md.
 *
 * localStorage 'c4-rated-v1': { r, n, w, l, d, hist: [{ id, t, lv, or, s, d, r, why }] }
 *   r: current rating (start 1000), n: rated games, w/l/d: wins/losses/draws,
 *   hist: last 100 games, oldest first — id: game id, t: time (ms), lv: AI level, or: AI rating,
 *   s: score (1 / 0.5 / 0), d: rating change, r: rating after the game, why: 'end' | 'abandon'
 * localStorage 'c4-rated-cur-v1' (this device only): the rated game on the board { id, human, lv, or, my, tag, done? }
 */
(function () {
'use strict';
const RT_I18N = {
ja: {"ng.rated":"レーティング戦","rt.title":"あなたのレーティング","rt.prov":"暫定","rt.rec":"{n}局　{w}勝 {l}敗 {d}分","rt.none":"まだレーティング戦の記録はありません","rt.recent":"最近の結果","rt.W":"勝","rt.L":"負","rt.D":"分","rt.vs":"今回の相手：AI {lv}（R {r}・{tag}）","rt.up":"格上","rt.even":"互角","rt.down":"格下","rt.opp":"相手：AI {lv}（R {r}）","rt.abandonQ":"レーティング戦の対局中です。ここで移ると中断となり、負けとして記録されます。よろしいですか？","rt.abandonYes":"負けにして進む","rt.abandoned":"レーティング戦を中断しました（負け）　R {o} → {n}（{d}）","rt.desc":"あなたのレーティング（初期値 1000）に近い強さのAIが相手です。ときどき格上・格下も登場します。勝てば上がり、負ければ下がります（Elo方式・最初の10局は大きく動きます）。先手・後手はランダム。対局中は待った・ヒント・形勢表示・分析は使えません（終局後に振り返りできます）。途中でやめると負けになります。","rt.next":"次の相手：","rt.start":"レーティング戦を始める"},
en: {"ng.rated":"Rated game","rt.title":"Your rating","rt.prov":"provisional","rt.rec":"{n} games · {w}W {l}L {d}D","rt.none":"No rated games yet","rt.recent":"Recent results","rt.W":"W","rt.L":"L","rt.D":"D","rt.vs":"Opponent: AI {lv} (R {r} · {tag})","rt.up":"stronger","rt.even":"even","rt.down":"weaker","rt.opp":"Opponent: AI {lv} (R {r})","rt.abandonQ":"A rated game is in progress. Leaving now abandons it and counts as a loss. Continue?","rt.abandonYes":"Leave (loss)","rt.abandoned":"Rated game abandoned (loss)  R {o} → {n} ({d})","rt.desc":"You play an AI close to your rating (start 1000), sometimes a stronger or weaker one. Win to go up, lose to go down (Elo; the first 10 games move more). Random side. No undo, hints, evaluation or analysis during the game (you can review it afterwards). Leaving early counts as a loss.","rt.next":"Next opponent:","rt.start":"Start rated game"},
zh: {"ng.rated":"等级分对局","rt.title":"你的等级分","rt.prov":"暂定","rt.rec":"{n}局　{w}胜 {l}负 {d}平","rt.none":"还没有等级分对局记录","rt.recent":"最近结果","rt.W":"胜","rt.L":"负","rt.D":"平","rt.vs":"本局对手：AI {lv}（R {r}・{tag}）","rt.up":"较强","rt.even":"相当","rt.down":"较弱","rt.opp":"对手：AI {lv}（R {r}）","rt.abandonQ":"等级分对局正在进行。现在离开将视为中断并记为负。确定吗？","rt.abandonYes":"认负并离开","rt.abandoned":"已中断等级分对局（负）　R {o} → {n}（{d}）","rt.desc":"对手是与你的等级分（初始 1000）相近的 AI，偶尔也会遇到更强或更弱的对手。赢了上升、输了下降（Elo 方式，前 10 局变动较大）。先后手随机。对局中不能悔棋、提示、显示形势或分析（终局后可以复盘）。中途离开记为负。","rt.next":"下一位对手：","rt.start":"开始等级分对局"},
ko: {"ng.rated":"레이팅전","rt.title":"나의 레이팅","rt.prov":"잠정","rt.rec":"{n}국　{w}승 {l}패 {d}무","rt.none":"아직 레이팅전 기록이 없습니다","rt.recent":"최근 결과","rt.W":"승","rt.L":"패","rt.D":"무","rt.vs":"이번 상대: AI {lv} (R {r}・{tag})","rt.up":"강함","rt.even":"비슷함","rt.down":"약함","rt.opp":"상대: AI {lv} (R {r})","rt.abandonQ":"레이팅전 대국 중입니다. 지금 나가면 중단되어 패배로 기록됩니다. 계속할까요?","rt.abandonYes":"패배하고 나가기","rt.abandoned":"레이팅전을 중단했습니다 (패)　R {o} → {n} ({d})","rt.desc":"나의 레이팅(초기값 1000)에 가까운 AI와 둡니다. 가끔 더 강하거나 약한 상대도 나옵니다. 이기면 오르고 지면 내려갑니다 (Elo 방식, 처음 10국은 크게 변동). 선후는 랜덤. 대국 중에는 무르기·힌트·형세 표시·분석을 쓸 수 없습니다 (종국 후 복기 가능). 도중에 그만두면 패배입니다.","rt.next":"다음 상대:","rt.start":"레이팅전 시작"},
es: {"ng.rated":"Partida puntuada","rt.title":"Tu puntuación","rt.prov":"provisional","rt.rec":"{n} partidas · {w}G {l}P {d}E","rt.none":"Aún no hay partidas puntuadas","rt.recent":"Resultados recientes","rt.W":"G","rt.L":"P","rt.D":"E","rt.vs":"Rival: IA {lv} (R {r} · {tag})","rt.up":"más fuerte","rt.even":"parejo","rt.down":"más débil","rt.opp":"Rival: IA {lv} (R {r})","rt.abandonQ":"Hay una partida puntuada en curso. Si sales ahora, se abandona y cuenta como derrota. ¿Continuar?","rt.abandonYes":"Salir (derrota)","rt.abandoned":"Partida puntuada abandonada (derrota)  R {o} → {n} ({d})","rt.desc":"Juegas contra una IA cercana a tu puntuación (inicial 1000), a veces una más fuerte o más débil. Si ganas subes, si pierdes bajas (Elo; las 10 primeras partidas cambian más). Lado al azar. Sin deshacer, pistas, evaluación ni análisis durante la partida (puedes revisarla al final). Salir antes cuenta como derrota.","rt.next":"Próximo rival:","rt.start":"Empezar partida puntuada"},
fr: {"ng.rated":"Partie classée","rt.title":"Votre classement","rt.prov":"provisoire","rt.rec":"{n} parties · {w}V {l}D {d}N","rt.none":"Aucune partie classée pour l’instant","rt.recent":"Résultats récents","rt.W":"V","rt.L":"D","rt.D":"N","rt.vs":"Adversaire : IA {lv} (R {r} · {tag})","rt.up":"plus fort","rt.even":"égal","rt.down":"plus faible","rt.opp":"Adversaire : IA {lv} (R {r})","rt.abandonQ":"Une partie classée est en cours. Partir maintenant l’abandonne et compte comme une défaite. Continuer ?","rt.abandonYes":"Partir (défaite)","rt.abandoned":"Partie classée abandonnée (défaite)  R {o} → {n} ({d})","rt.desc":"Vous affrontez une IA proche de votre classement (départ 1000), parfois plus forte ou plus faible. Gagner fait monter, perdre fait descendre (Elo ; les 10 premières parties comptent davantage). Camp au hasard. Pas d’annulation, d’indice, d’évaluation ni d’analyse pendant la partie (revue possible ensuite). Partir avant la fin compte comme une défaite.","rt.next":"Prochain adversaire :","rt.start":"Lancer la partie classée"},
pt: {"ng.rated":"Partida ranqueada","rt.title":"Seu rating","rt.prov":"provisório","rt.rec":"{n} partidas · {w}V {l}D {d}E","rt.none":"Ainda não há partidas ranqueadas","rt.recent":"Resultados recentes","rt.W":"V","rt.L":"D","rt.D":"E","rt.vs":"Adversário: IA {lv} (R {r} · {tag})","rt.up":"mais forte","rt.even":"equilibrado","rt.down":"mais fraco","rt.opp":"Adversário: IA {lv} (R {r})","rt.abandonQ":"Há uma partida ranqueada em andamento. Sair agora a abandona e conta como derrota. Continuar?","rt.abandonYes":"Sair (derrota)","rt.abandoned":"Partida ranqueada abandonada (derrota)  R {o} → {n} ({d})","rt.desc":"Você enfrenta uma IA próxima do seu rating (inicial 1000), às vezes uma mais forte ou mais fraca. Vencer sobe, perder desce (Elo; as 10 primeiras partidas mudam mais). Lado aleatório. Sem desfazer, dicas, avaliação ou análise durante a partida (dá para revisar depois). Sair antes conta como derrota.","rt.next":"Próximo adversário:","rt.start":"Iniciar partida ranqueada"},
de: {"ng.rated":"Wertungspartie","rt.title":"Deine Wertung","rt.prov":"vorläufig","rt.rec":"{n} Partien · {w}S {l}N {d}R","rt.none":"Noch keine Wertungspartien","rt.recent":"Letzte Ergebnisse","rt.W":"S","rt.L":"N","rt.D":"R","rt.vs":"Gegner: KI {lv} (R {r} · {tag})","rt.up":"stärker","rt.even":"ebenbürtig","rt.down":"schwächer","rt.opp":"Gegner: KI {lv} (R {r})","rt.abandonQ":"Eine Wertungspartie läuft. Wer jetzt geht, bricht sie ab – sie zählt als Niederlage. Fortfahren?","rt.abandonYes":"Verlassen (Niederlage)","rt.abandoned":"Wertungspartie abgebrochen (Niederlage)  R {o} → {n} ({d})","rt.desc":"Du spielst gegen eine KI nahe deiner Wertung (Start 1000), manchmal gegen eine stärkere oder schwächere. Sieg: rauf, Niederlage: runter (Elo; die ersten 10 Partien zählen mehr). Seite zufällig. Kein Zurücknehmen, keine Hinweise, Bewertung oder Analyse während der Partie (danach kannst du sie auswerten). Vorzeitiges Verlassen zählt als Niederlage.","rt.next":"Nächster Gegner:","rt.start":"Wertungspartie starten"},
hi: {"ng.rated":"रेटेड खेल","rt.title":"आपकी रेटिंग","rt.prov":"अस्थायी","rt.rec":"{n} खेल · {w} जीत {l} हार {d} ड्रॉ","rt.none":"अभी कोई रेटेड खेल नहीं","rt.recent":"हाल के परिणाम","rt.W":"जी","rt.L":"हा","rt.D":"ड्रॉ","rt.vs":"प्रतिद्वंद्वी: AI {lv} (R {r} · {tag})","rt.up":"मज़बूत","rt.even":"बराबर","rt.down":"कमज़ोर","rt.opp":"प्रतिद्वंद्वी: AI {lv} (R {r})","rt.abandonQ":"रेटेड खेल चल रहा है। अभी जाने पर यह छोड़ा माना जाएगा और हार गिनी जाएगी। जारी रखें?","rt.abandonYes":"छोड़ें (हार)","rt.abandoned":"रेटेड खेल छोड़ा गया (हार)  R {o} → {n} ({d})","rt.desc":"आप अपनी रेटिंग (शुरुआत 1000) के क़रीब वाले AI से खेलते हैं, कभी-कभी मज़बूत या कमज़ोर से भी। जीतने पर बढ़ती है, हारने पर घटती है (Elo; पहले 10 खेलों में ज़्यादा बदलाव)। पक्ष यादृच्छिक। खेल के दौरान वापस लेना, संकेत, आकलन या विश्लेषण नहीं (बाद में समीक्षा कर सकते हैं)। बीच में छोड़ना हार है।","rt.next":"अगला प्रतिद्वंद्वी:","rt.start":"रेटेड खेल शुरू करें"},
ar: {"ng.rated":"مباراة مصنّفة","rt.title":"تصنيفك","rt.prov":"مؤقت","rt.rec":"{n} مباراة · {w} فوز {l} خسارة {d} تعادل","rt.none":"لا توجد مباريات مصنّفة بعد","rt.recent":"آخر النتائج","rt.W":"ف","rt.L":"خ","rt.D":"ت","rt.vs":"الخصم: ذكاء اصطناعي {lv} (R {r} · {tag})","rt.up":"أقوى","rt.even":"متكافئ","rt.down":"أضعف","rt.opp":"الخصم: ذكاء اصطناعي {lv} (R {r})","rt.abandonQ":"هناك مباراة مصنّفة جارية. المغادرة الآن تعني الانسحاب وتُحتسب خسارة. هل تتابع؟","rt.abandonYes":"مغادرة (خسارة)","rt.abandoned":"تم الانسحاب من المباراة المصنّفة (خسارة)  R {o} → {n} ({d})","rt.desc":"تلعب ضد ذكاء اصطناعي قريب من تصنيفك (البداية 1000)، وأحيانًا ضد أقوى أو أضعف. الفوز يرفعك والخسارة تنزلك (نظام Elo؛ أول 10 مباريات تتغير أكثر). الطرف عشوائي. لا تراجع ولا تلميحات ولا تقييم ولا تحليل أثناء المباراة (يمكنك المراجعة بعدها). المغادرة قبل النهاية تُحتسب خسارة.","rt.next":"الخصم التالي:","rt.start":"ابدأ مباراة مصنّفة"},
};
for (const l in RT_I18N) if (I18N[l]) Object.assign(I18N[l], RT_I18N[l]);
const RT_STORE = 'c4-rated-v1', RT_CUR = 'c4-rated-cur-v1', RT_START = 1000;
// index = level 1..8 (measured level against level, Lv8 plays perfectly: see RATING.md)
const RT_LV = [0, 400, 780, 900, 1110, 1150, 1190, 1300, 1480];
const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rtLoad() {
  let s = get(RT_STORE, null);
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
const lvName = lv => `Lv.${lv} ${LV(lv)}`;
let RT = get(RT_CUR, null);
if (RT && !RT.id) RT = null;
// opponent: target = rating + offset (80%: within ±100, 10%: +150..+300 stronger, 10%: −150..−300 weaker) -> nearest level
function rtPick(r) {
  const u = Math.random(), v = Math.random();
  const off = u < 0.1 ? 150 + v * 150 : u < 0.2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = r + off;
  let lv = 1; for (let i = 2; i <= 8; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r;
  return { lv, or: RT_LV[lv], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even' };
}
function rtGame() { return !!(RT && settings.mode === 'ai' && !lesson && !puzzle && humanColor === RT.human); }
function rtLive() { return rtGame() && !RT.done && !gameOver(moves); }
window.rtGame = rtGame; window.rtLive = rtLive;
// apply a result once (the game id is kept in the history, so a reload never counts it twice)
function rtSettle(s, why) {
  if (!RT) return null;
  if (RT.done) return RT.done;
  const st = rtLoad(), prev = st.hist.find(h => h.id === RT.id);
  if (prev) { RT.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; put(RT_CUR, RT); return RT.done; }
  const K = st.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (RT.or - st.r) / 400));
  const old = st.r, now = Math.max(0, Math.round(old + K * (s - Ex)));
  st.r = now; st.n++; if (s === 1) st.w++; else if (s === 0) st.l++; else st.d++;
  st.hist.push({ id: RT.id, t: Date.now(), lv: RT.lv, or: RT.or, s, d: now - old, r: now, why });
  if (st.hist.length > 100) st.hist = st.hist.slice(-100);
  put(RT_STORE, st);
  RT.done = { old, now, d: now - old }; put(RT_CUR, RT);
  return RT.done;
}
function rtSettleBoard() {
  if (!rtGame() || RT.done || !gameOver(moves)) return RT && RT.done;
  const st = statusOf(moves);
  return rtSettle(st.winner === RT.human ? 1 : st.winner ? 0 : 0.5, 'end');
}
function rtForfeit() {
  if (!rtLive()) return null;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0;
  const x = rtSettle(0, 'abandon');
  if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3200);
  return x;
}
let pick = null;   // the opponent shown in the dialog: {lv, or, tag}
function rtStart() {
  const st = rtLoad(), pk = pick || rtPick(st.r);
  pick = null;
  const human = Math.random() < 0.5 ? P1 : P2;   // rated: random colour
  RT = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), human, lv: pk.lv, or: pk.or, my: st.r, tag: pk.tag };
  put(RT_CUR, RT);
  const color = settings.color; settings.mode = 'ai'; settings.color = human;
  _newGame();
  settings.color = color; save();
  toast(t('rt.vs', { lv: lvName(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 4000);
}
function rtStatsHtml() {
  const st = rtLoad(), h = st.hist.slice(-10).reverse();
  let html = `<div class="rt-card"><div class="rt-head"><b class="rt-r">R ${st.r}</b>${st.n < 10 ? `<span class="rt-prov">${esc(t('rt.prov'))}</span>` : ''}</div>`;
  html += `<div class="rt-rec">${esc(st.n ? t('rt.rec', { n: st.n, w: st.w, l: st.l, d: st.d }) : t('rt.none'))}</div>`;
  const sp = st.hist.slice(-30);
  if (sp.length >= 2) {
    const pts = [sp[0].r - sp[0].d].concat(sp.map(x => x.r)), lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, W = 300, H = 40;
    const y = v => (H - 3 - (v - lo) / (hi - lo) * (H - 6)).toFixed(1);
    html += `<svg class="rt-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(pts[0])}" y2="${y(pts[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${pts.map((v, i) => (i / (pts.length - 1) * W).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  if (h.length) html += `<div class="rt-lbl2">${esc(t('rt.recent'))}</div><div class="rt-hist">` + h.map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<span class="rt-chip ${c}" title="${esc(lvName(x.lv) + ' · R' + x.or)}"><i>${esc(t('rt.' + c.toUpperCase()))}</i>Lv${x.lv}<b>${rtD(x.d)}</b></span>`; }).join('') + '</div>';
  if (!pick) pick = rtPick(st.r);
  html += `<div class="rt-opp">${esc(t('rt.next'))} <b>AI ${esc(lvName(pick.lv))}</b> <span class="rt-tag ${pick.tag}">R ${pick.or} · ${esc(t('rt.' + pick.tag))}</span></div>`;
  return html + `</div><p class="rt-desc">${esc(t('rt.desc'))}</p>`;
}

// ---- styles
const css = document.createElement('style');
css.textContent = `
.rt-card{padding:12px 14px 13px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid var(--line)}
.rt-head{display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap}
.rt-r{font-family:'JetBrains Mono',monospace;font-size:23px;color:var(--accent);font-weight:700}
.rt-prov{font-size:11px;color:var(--dim);border:1px solid var(--line);border-radius:5px;padding:0 5px}
.rt-rec{font-size:13.5px;color:var(--muted);margin-top:3px}
.rt-spark{display:block;width:100%;height:40px;margin-top:8px}
.rt-spark polyline{fill:none;stroke:var(--accent);stroke-width:1.6}
.rt-spark line{stroke:var(--line);stroke-dasharray:3 3}
.rt-lbl2{font-size:12px;color:var(--dim);margin:8px 0 5px}
.rt-hist{display:flex;flex-wrap:wrap;gap:4px}
.rt-chip{font-size:11.5px;line-height:1.5;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line);display:inline-flex;gap:4px;font-family:'JetBrains Mono',monospace;color:var(--muted);white-space:nowrap}
.rt-chip i{font-style:normal;font-family:sans-serif}
.rt-chip.w i,.rt-chip.w b{color:#8fe3b8}.rt-chip.l i,.rt-chip.l b{color:#ff9b90}
.rt-chip b{font-weight:600}
.rt-opp{margin-top:10px;padding-top:9px;border-top:1px dashed var(--line);font-size:14px;color:var(--muted);line-height:1.6}
.rt-opp b{color:var(--text)}
.rt-tag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:12px;padding:0 7px;border-radius:999px;border:1px solid var(--line);white-space:nowrap}
.rt-tag.up{color:#ffab9e;border-color:rgba(255,139,125,.5)}.rt-tag.down{color:#8fe3b8;border-color:rgba(111,211,160,.45)}.rt-tag.even{color:#f2d07a;border-color:rgba(242,192,96,.45)}
.rt-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-top:8px}
.rt-res{font-family:'JetBrains Mono',monospace;font-size:16px}
.rt-res .up{color:#8fe3b8}.rt-res .down{color:#ff9b90}
.rt-ressub{color:var(--muted)}
.rt-q{font-size:15.5px;line-height:1.75;margin:4px 0 6px}
body.rated-live #evalCard .evalrow, body.rated-live #evalCard .evalbar, body.rated-live #evalCard .graph{visibility:hidden}
body.rated-live #btnAnalyze{visibility:hidden}
html[lang=ar] :is(.rt-card, .rt-desc, .rt-q){direction:rtl;text-align:right}
`;
document.head.appendChild(css);

// ---- wrap the main script
const _newGame = newGame, _levelFor = levelFor, _playerName = playerName, _canUndo = canUndo, _renderInfo = renderInfo,
  _onGameEnd = onGameEnd, _segSync = segSync, _openNewDialog = openNewDialog, _analyzeCurrent = analyzeCurrent, _renderFx = renderFx, _resumeHere = resumeHere;
newGame = function () { RT = null; put(RT_CUR, null); return _newGame.apply(this, arguments); };
levelFor = function (p) { return rtGame() ? RT.lv : _levelFor(p); };
playerName = function (p) {
  if (!rtGame()) return _playerName(p);
  return p === RT.human ? `${t('you')} · R${RT.my}` : `AI ${lvName(RT.lv)} · R${RT.or}`;
};
canUndo = function () { return rtGame() ? false : _canUndo(); };
resumeHere = function () { if (rtGame()) { viewAt(moves.length); return; } return _resumeHere.apply(this, arguments); };   // no taking back in a rated game
// no analysis (hints, evaluation, threats) while a rated game is going on
analyzeCurrent = function (tok) { if (rtLive()) { hintList = null; return; } return _analyzeCurrent.apply(this, arguments); };
renderFx = function () {
  if (!rtLive()) return _renderFx.apply(this, arguments);
  const th = settings.threat; settings.threat = false; hintList = null;
  try { return _renderFx.apply(this, arguments); } finally { settings.threat = th; }
};
renderInfo = function () {
  _renderInfo.apply(this, arguments);
  const live = rtLive();
  document.body.classList.toggle('rated-live', live);
  if (rtGame()) {
    $('#infoLine').textContent = `${t('info.moves', { n: moves.length })}  ·  ${t('ng.rated')} · AI ${lvName(RT.lv)} (R ${RT.or})`;
    $('#btnUndo').disabled = true;
    $('#btnHint').disabled = live; $('#btnAnalyze').disabled = live;
  } else { $('#btnHint').disabled = false; $('#btnAnalyze').disabled = false; }
};
onGameEnd = function (st) {
  const was = gameOverShown;
  _onGameEnd.apply(this, arguments);
  if (was || !rtGame()) return;
  const x = rtSettleBoard(); if (!x) return;
  $('#resultSub').innerHTML = esc(t('res.vs', { name: LV(RT.lv), lv: RT.lv })) + `<br><span class="rt-res">R ${x.old} → <b>${x.now}</b> <span class="${x.d >= 0 ? 'up' : 'down'}">(${rtD(x.d)})</span></span><br><small class="rt-ressub">${esc(t('rt.opp', { lv: lvName(RT.lv), r: RT.or }))}</small>`;
  renderInfo();
};
segSync = function () {
  _segSync.apply(this, arguments);
  const r = draft.mode === 'rated';
  $('#fRated').classList.toggle('hidden', !r);
  if (!r) return;
  ['#fColor', '#fLevel', '#fLevel2', '#fInfo'].forEach(s => $(s).classList.add('hidden'));
  $('#fDisplay').classList.remove('hidden');
  $('#rtBox').innerHTML = rtStatsHtml();
  $('#btnStart').textContent = t('rt.start');
};
openNewDialog = function () {
  pick = null;
  _openNewDialog.apply(this, arguments);
  if (rtGame() && !lesson && !puzzle) { draft.mode = 'rated'; segSync(); }
};
// mode button and the rating card in the new-game dialog
$('#segMode [data-v=ai]').insertAdjacentHTML('afterend', '<button data-v="rated" data-i18n="ng.rated"></button>');
$('#segMode [data-v=rated]').textContent = t('ng.rated');
$('#fLevel2').insertAdjacentHTML('afterend', '<div class="field hidden" id="fRated"><label data-i18n="rt.title"></label><div id="rtBox"></div></div>');
$('#fRated > label').textContent = t('rt.title');
$('#btnStart').addEventListener('click', e => {
  if (draft.mode !== 'rated') return;
  e.stopImmediatePropagation();
  hideOverlay('#newOverlay');
  exitSpecial();
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked });
  rtStart();
}, true);
// leaving a rated game that is still going asks first (and the game is then lost)
const ov = document.createElement('div');
ov.className = 'overlay'; ov.id = 'rtConfirm';
ov.innerHTML = '<div class="modal" style="width:min(460px,100%)"><p class="rt-q" id="rtConfirmText"></p><div class="modal-actions"><button class="mbtn" id="rtConfirmNo"></button><button class="mbtn go" id="rtConfirmYes"></button></div></div>';
document.body.appendChild(ov);
ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
$('#rtConfirmNo').onclick = () => ov.classList.remove('show');
const GUARD = '#btnStart, #btnLesson, #btnPuzzle, #pasteOk';
let pass = false;
document.addEventListener('click', e => {
  if (pass || !rtLive()) return;
  const b = e.target.closest && e.target.closest(GUARD); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  $('#rtConfirmText').textContent = t('rt.abandonQ'); $('#rtConfirmNo').textContent = t('close'); $('#rtConfirmYes').textContent = t('rt.abandonYes');
  $('#rtConfirmYes').onclick = () => { ov.classList.remove('show'); rtForfeit(); renderInfo(); pass = true; try { b.click(); } finally { pass = false; } };
  ov.classList.add('show');
}, true);
// a shared game opened by link while a rated game was going on counts as leaving it
window.addEventListener('hashchange', () => { if (RT && !RT.done && !rtGame()) { rtSettle(0, 'abandon'); } }, true);
// language change: labels made here
$('#langSel').addEventListener('change', () => {
  $('#segMode [data-v=rated]').textContent = t('ng.rated'); $('#fRated > label').textContent = t('rt.title');
  if ($('#newOverlay').classList.contains('show')) segSync();
  renderInfo();
});
// boot: a finished rated game not counted yet is counted now; one that was left (board replaced) is a loss
if (RT && !RT.done) {
  if (rtGame()) { if (gameOver(moves)) rtSettleBoard(); }
  else if (!lesson && !puzzle) rtSettle(0, 'abandon');
}
if (RT && rtLive()) { hintList = null; renderFx(); }
renderInfo();
window.RT_LV = RT_LV; window.rtStatsHtml = rtStatsHtml;
})();
