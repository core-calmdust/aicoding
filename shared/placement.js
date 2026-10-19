// 予備選（placement）— the first 3 rated games against the AI decide the starting rating.
// Shared by every game with solo rated games (shogi, chess, reversi, gomoku, morris, connect4, dots).
//
// The record object of each game (S = { r, n, w, l, d, hist }) gets one more field, S.pl:
//   undefined  … never decided. A new player (n = 0) is treated as in placement; a player with games asks once.
//   { c, g: [{ or, s }], from }  … placement in progress (c: prior centre, from: rating before it)
//   { done: 1, r, from? }        … placement finished (or skipped with keep: 1)
// Opponents: game 1 is a weak AI (centre − 300); after a win the next one is clearly stronger (+350), after a loss
// weaker (−250), so the player mostly wins while climbing. The rating is the maximum a-posteriori estimate (Elo logistic,
// normal prior around the centre, σ = 500) — it moves during placement and is fixed after game 3.
(function () {
'use strict';
const N = 3, SIGMA = 500;
const T = {
  ja: { badge: '予備選 {k}/{n}', note: '予備選中：あと{m}戦でレートが決まります（弱めの相手から始まり、勝つと相手が強くなります）。',
    askT: 'レートの決め方', askB: 'レーティング戦に「予備選」ができました。最初の3戦で、弱めのAIから始めて勝敗に合わせて相手の強さを変えながら、あなたのレートを算出します。', askQ: '今のレート（R {r}）をそのまま使いますか？それとも予備選で改めて算出しますか？',
    keep: '今のレートで続ける', redo: '予備選で算出し直す（3戦）', askN: 'この確認は最初の1回だけです。',
    res: '予備選 {k}/{n} 終了　仮のレート R {r}', up: '次はもう少し強い相手です', down: '次は少し弱い相手です', same: '次も同じくらいの相手です',
    revT: 'レートが決まりました！', revS: '予備選 {w}勝 {l}敗 {d}分', prev: '以前のレート R {o}', ok: 'OK', revN: 'これからは勝敗でレートが上下します（しばらくは大きめに動きます）。' },
  en: { badge: 'Placement {k}/{n}', note: 'Placement: {m} more game(s) set your rating (you start against a weaker AI; win and the next one is stronger).',
    askT: 'How to set your rating', askB: 'Rated games now have placement games: the first 3 games start against a weaker AI and adjust the opponent to your results to calculate your rating.', askQ: 'Keep your current rating (R {r}), or recalculate it with placement games?',
    keep: 'Keep my current rating', redo: 'Recalculate (3 placement games)', askN: 'You are only asked this once.',
    res: 'Placement {k}/{n} done · provisional R {r}', up: 'Next: a slightly stronger opponent', down: 'Next: a slightly weaker opponent', same: 'Next: a similar opponent',
    revT: 'Your rating is set!', revS: 'Placement: {w}W {l}L {d}D', prev: 'Previous rating R {o}', ok: 'OK', revN: 'From now on wins and losses move your rating (by more at first).' },
  zh: { badge: '定级赛 {k}/{n}', note: '定级赛中：再下{m}局即可确定等级分（从较弱的对手开始，赢了对手会变强）。',
    askT: '等级分的确定方式', askB: '等级分对局新增了“定级赛”：前3局从较弱的AI开始，根据胜负调整对手强度，计算出你的等级分。', askQ: '保留当前等级分（R {r}），还是通过定级赛重新计算？',
    keep: '保留当前等级分', redo: '用定级赛重新计算（3局）', askN: '此确认只出现一次。',
    res: '定级赛 {k}/{n} 结束　暂定 R {r}', up: '下一位对手会稍强一些', down: '下一位对手会稍弱一些', same: '下一位对手实力相近',
    revT: '等级分已确定！', revS: '定级赛 {w}胜 {l}负 {d}平', prev: '之前的等级分 R {o}', ok: '好的', revN: '今后等级分会随胜负升降（开始时变动较大）。' },
  ko: { badge: '배치전 {k}/{n}', note: '배치전 진행 중: {m}국 더 두면 레이팅이 정해집니다 (약한 상대부터 시작하며, 이기면 상대가 강해집니다).',
    askT: '레이팅 정하는 방법', askB: '레이팅전에 "배치전"이 생겼습니다. 처음 3국은 약한 AI부터 시작해 승패에 따라 상대의 강도를 바꾸며 레이팅을 계산합니다.', askQ: '현재 레이팅(R {r})을 그대로 쓸까요, 아니면 배치전으로 다시 계산할까요?',
    keep: '현재 레이팅으로 계속', redo: '배치전으로 다시 계산 (3국)', askN: '이 확인은 처음 한 번만 나옵니다.',
    res: '배치전 {k}/{n} 종료　잠정 R {r}', up: '다음은 조금 더 강한 상대입니다', down: '다음은 조금 약한 상대입니다', same: '다음도 비슷한 상대입니다',
    revT: '레이팅이 정해졌습니다!', revS: '배치전 {w}승 {l}패 {d}무', prev: '이전 레이팅 R {o}', ok: '확인', revN: '이제부터 승패에 따라 레이팅이 오르내립니다 (당분간은 크게 움직입니다).' },
  es: { badge: 'Clasificación {k}/{n}', note: 'Clasificación: {m} partida(s) más fijan tu puntuación (empiezas contra una IA más débil; si ganas, la siguiente es más fuerte).',
    askT: 'Cómo fijar tu puntuación', askB: 'Las partidas puntuadas tienen ahora partidas de clasificación: las 3 primeras empiezan contra una IA más débil y ajustan el rival según tus resultados para calcular tu puntuación.', askQ: '¿Mantener tu puntuación actual (R {r}) o recalcularla con partidas de clasificación?',
    keep: 'Mantener mi puntuación', redo: 'Recalcular (3 partidas)', askN: 'Solo se pregunta una vez.',
    res: 'Clasificación {k}/{n} terminada · provisional R {r}', up: 'Siguiente: un rival algo más fuerte', down: 'Siguiente: un rival algo más débil', same: 'Siguiente: un rival parecido',
    revT: '¡Tu puntuación está fijada!', revS: 'Clasificación: {w}G {l}P {d}E', prev: 'Puntuación anterior R {o}', ok: 'OK', revN: 'A partir de ahora, ganar y perder mueve tu puntuación (más al principio).' },
  fr: { badge: 'Placement {k}/{n}', note: 'Placement : encore {m} partie(s) pour fixer votre classement (vous commencez contre une IA plus faible ; si vous gagnez, la suivante est plus forte).',
    askT: 'Fixer votre classement', askB: 'Les parties classées ont désormais des parties de placement : les 3 premières commencent contre une IA plus faible et ajustent l’adversaire selon vos résultats pour calculer votre classement.', askQ: 'Garder votre classement actuel (R {r}) ou le recalculer avec des parties de placement ?',
    keep: 'Garder mon classement', redo: 'Recalculer (3 parties)', askN: 'Cette question n’est posée qu’une fois.',
    res: 'Placement {k}/{n} terminé · provisoire R {r}', up: 'Ensuite : un adversaire un peu plus fort', down: 'Ensuite : un adversaire un peu plus faible', same: 'Ensuite : un adversaire de même niveau',
    revT: 'Votre classement est fixé !', revS: 'Placement : {w}V {l}D {d}N', prev: 'Classement précédent R {o}', ok: 'OK', revN: 'Désormais, victoires et défaites font varier votre classement (davantage au début).' },
  pt: { badge: 'Classificação {k}/{n}', note: 'Classificação: mais {m} partida(s) definem seu rating (você começa contra uma IA mais fraca; vencendo, a próxima é mais forte).',
    askT: 'Como definir seu rating', askB: 'As partidas ranqueadas agora têm partidas de classificação: as 3 primeiras começam contra uma IA mais fraca e ajustam o adversário aos seus resultados para calcular seu rating.', askQ: 'Manter seu rating atual (R {r}) ou recalculá-lo com partidas de classificação?',
    keep: 'Manter meu rating', redo: 'Recalcular (3 partidas)', askN: 'Isto só é perguntado uma vez.',
    res: 'Classificação {k}/{n} concluída · provisório R {r}', up: 'Próximo: um adversário um pouco mais forte', down: 'Próximo: um adversário um pouco mais fraco', same: 'Próximo: um adversário parecido',
    revT: 'Seu rating foi definido!', revS: 'Classificação: {w}V {l}D {d}E', prev: 'Rating anterior R {o}', ok: 'OK', revN: 'A partir de agora, vitórias e derrotas mudam seu rating (mais no início).' },
  de: { badge: 'Einstufung {k}/{n}', note: 'Einstufung: noch {m} Partie(n), dann steht deine Wertung fest (du beginnst gegen eine schwächere KI; nach einem Sieg wird die nächste stärker).',
    askT: 'Wie deine Wertung entsteht', askB: 'Wertungspartien haben jetzt Einstufungspartien: Die ersten 3 beginnen gegen eine schwächere KI und passen den Gegner an deine Ergebnisse an, um deine Wertung zu berechnen.', askQ: 'Deine aktuelle Wertung (R {r}) behalten oder mit Einstufungspartien neu berechnen?',
    keep: 'Aktuelle Wertung behalten', redo: 'Neu berechnen (3 Partien)', askN: 'Diese Frage kommt nur einmal.',
    res: 'Einstufung {k}/{n} beendet · vorläufig R {r}', up: 'Als Nächstes: ein etwas stärkerer Gegner', down: 'Als Nächstes: ein etwas schwächerer Gegner', same: 'Als Nächstes: ein ähnlich starker Gegner',
    revT: 'Deine Wertung steht fest!', revS: 'Einstufung: {w}S {l}N {d}R', prev: 'Bisherige Wertung R {o}', ok: 'OK', revN: 'Ab jetzt verändern Siege und Niederlagen deine Wertung (anfangs stärker).' },
  hi: { badge: 'प्लेसमेंट {k}/{n}', note: 'प्लेसमेंट: {m} और खेल के बाद आपकी रेटिंग तय होगी (आप कमज़ोर AI से शुरू करते हैं; जीतने पर अगला मज़बूत होगा)।',
    askT: 'रेटिंग कैसे तय करें', askB: 'रेटेड खेलों में अब प्लेसमेंट खेल हैं: पहले 3 खेल कमज़ोर AI से शुरू होते हैं और आपके परिणामों के अनुसार प्रतिद्वंद्वी बदलकर आपकी रेटिंग निकालते हैं।', askQ: 'अपनी मौजूदा रेटिंग (R {r}) रखें, या प्लेसमेंट खेलों से दोबारा निकालें?',
    keep: 'मौजूदा रेटिंग रखें', redo: 'दोबारा निकालें (3 खेल)', askN: 'यह सिर्फ़ एक बार पूछा जाएगा।',
    res: 'प्लेसमेंट {k}/{n} पूरा · अस्थायी R {r}', up: 'अगला: थोड़ा मज़बूत प्रतिद्वंद्वी', down: 'अगला: थोड़ा कमज़ोर प्रतिद्वंद्वी', same: 'अगला: लगभग बराबर प्रतिद्वंद्वी',
    revT: 'आपकी रेटिंग तय हो गई!', revS: 'प्लेसमेंट: {w} जीत {l} हार {d} ड्रॉ', prev: 'पिछली रेटिंग R {o}', ok: 'ठीक है', revN: 'अब जीत-हार से आपकी रेटिंग बदलेगी (शुरुआत में ज़्यादा)।' },
  ar: { badge: 'تحديد المستوى {k}/{n}', note: 'تحديد المستوى: {m} مباراة أخرى ويُحدَّد تصنيفك (تبدأ ضد ذكاء اصطناعي أضعف؛ إن فزت يصبح التالي أقوى).',
    askT: 'كيف يُحدَّد تصنيفك', askB: 'أصبحت للمباريات المصنّفة مباريات لتحديد المستوى: أول 3 مباريات تبدأ ضد ذكاء اصطناعي أضعف وتعدّل الخصم وفق نتائجك لحساب تصنيفك.', askQ: 'هل تحتفظ بتصنيفك الحالي (R {r}) أم تعيد حسابه بمباريات تحديد المستوى؟',
    keep: 'الاحتفاظ بتصنيفي الحالي', redo: 'إعادة الحساب (3 مباريات)', askN: 'يُطرح هذا السؤال مرة واحدة فقط.',
    res: 'انتهت مباراة تحديد المستوى {k}/{n} · مؤقت R {r}', up: 'التالي: خصم أقوى قليلًا', down: 'التالي: خصم أضعف قليلًا', same: 'التالي: خصم مماثل',
    revT: 'تم تحديد تصنيفك!', revS: 'تحديد المستوى: {w} فوز {l} خسارة {d} تعادل', prev: 'التصنيف السابق R {o}', ok: 'حسنًا', revN: 'من الآن يتغير تصنيفك بالفوز والخسارة (أكثر في البداية).' },
};
let langFn = () => (document.documentElement.lang || 'ja').slice(0, 2);
function t(k, v) { const L = T[langFn()] || T.en; let s = L[k] != null ? L[k] : T.en[k]; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- state
const pending = S => !!(S.pl && S.pl.g && !S.pl.done);
function on(S) { return S.pl === undefined ? !(S.n > 0) : pending(S); }
function needAsk(S) { return S.pl === undefined && S.n > 0; }
function begin(S, c, from) { S.pl = { c: Math.round(c), g: [], from }; return S; }
function ensure(S) { if (S.pl === undefined && !(S.n > 0)) begin(S, S.r); return S; }
const played = S => (S.pl && S.pl.g ? S.pl.g.length : 0);

// ---- estimate (MAP on a 5-point grid)
function estimate(c, g) {
  let best = c, bv = -Infinity;
  for (let r = Math.max(0, c - 1600); r <= c + 1600; r += 5) {
    let v = -((r - c) * (r - c)) / (2 * SIGMA * SIGMA);
    for (const x of g) { const E = 1 / (1 + Math.pow(10, (x.or - r) / 400)); v += x.s * Math.log(E) + (1 - x.s) * Math.log(1 - E); }
    if (v > bv) { bv = v; best = r; }
  }
  return Math.max(0, Math.round(best));
}

// ---- opponent: levels = [[lv, rating], …] (any order)
function pick(S, levels) {
  ensure(S);
  const P = S.pl, L = levels.slice().sort((a, b) => a[1] - b[1]), k = P.g.length, est = estimate(P.c, P.g);
  let cand = L, target;
  if (!k) target = P.c - 300;
  else {
    const last = P.g[k - 1];
    if (last.s === 1) { target = Math.max(est, last.or + 350); const up = L.filter(x => x[1] > last.or); cand = up.length ? up : [L[L.length - 1]]; }
    else if (last.s === 0) { target = Math.min(est - 100, last.or - 250); const dn = L.filter(x => x[1] < last.or); cand = dn.length ? dn : [L[0]]; }
    else target = last.or;
  }
  let b = cand[0]; for (const x of cand) if (Math.abs(x[1] - target) < Math.abs(b[1] - target)) b = x;
  const diff = b[1] - est;
  return { lv: b[0], or: b[1], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even', pl: k + 1 };
}

// ---- a finished placement game → { r, k, n, final, next }
function record(S, or, s) {
  ensure(S);
  const P = S.pl; P.g.push({ or, s });
  const r = estimate(P.c, P.g), k = P.g.length, final = k >= N;
  if (final) {
    const w = P.g.filter(x => x.s === 1).length, l = P.g.filter(x => x.s === 0).length;
    S.pl = { done: 1, r, from: P.from, w, l, d: k - w - l };
  }
  return { r, k, n: N, final, next: s === 1 ? 'up' : s === 0 ? 'down' : 'same' };
}

// ---- UI
const CSS = `.pl-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:plFade .2s ease}
@keyframes plFade{from{opacity:0}}
@keyframes plPop{from{transform:scale(.85);opacity:0}}
.pl-box{width:100%;max-width:440px;max-height:calc(100dvh - 32px);overflow-y:auto;padding:22px 20px 18px;border-radius:16px;background:var(--panel,#1d1d24);border:1px solid var(--line,rgba(255,255,255,.14));color:var(--text,#eee);box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:inherit;line-height:1.7}
.pl-box h3{margin:0 0 10px;font-size:18px}
.pl-box p{margin:0 0 10px;font-size:14px;color:var(--muted,#bbb)}
.pl-box p.pl-q{color:var(--text,#eee);font-weight:600}
.pl-box small{display:block;font-size:12px;color:var(--dim,#999);margin-top:4px}
.pl-btns{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.pl-btns button{padding:11px 14px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(255,255,255,.05);color:var(--text,#eee);font:inherit;font-size:14.5px;font-weight:600;cursor:pointer}
.pl-btns button.pri{border:0;background:linear-gradient(180deg,#e6c879,#b08f48);color:#1b150a}
.pl-rev{text-align:center}
.pl-big{font-family:'JetBrains Mono',monospace;font-size:46px;font-weight:700;color:var(--accent,#e6c879);margin:6px 0 2px;animation:plPop .5s cubic-bezier(.2,1.6,.4,1)}
.pl-rank{font-size:15px;font-weight:600;margin-bottom:8px}
.pl-badge{font-size:11px;color:#1b150a;background:linear-gradient(180deg,#e6c879,#b08f48);border-radius:5px;padding:0 6px;font-weight:700;white-space:nowrap}
.pl-note{font-size:12.5px;color:var(--muted,#bbb);margin-top:4px;line-height:1.6}
.pl-dots{display:inline-flex;gap:4px;vertical-align:middle;margin-left:6px}
.pl-dots i{width:9px;height:9px;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.3))}
.pl-dots i.w{background:#6fd3a0;border-color:#6fd3a0}.pl-dots i.l{background:#ff8b7d;border-color:#ff8b7d}.pl-dots i.d{background:#f2c060;border-color:#f2c060}
html[lang=ar] :is(.pl-box,.pl-note){direction:rtl;text-align:right}html[lang=ar] .pl-rev{text-align:center}`;
let cssDone = false;
function css() { if (cssDone) return; cssDone = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
function modal(html, bind) {
  css();
  const ov = document.createElement('div'); ov.className = 'pl-ov'; ov.innerHTML = `<div class="pl-box" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  bind(ov, close);
  return ov;
}
// before a rated game: asks a player who already has rated games once (keep / recalculate); returns true when it asked
// (go() is called after the answer). store(S) saves the record.
function gate(S, store, go) {
  if (!needAsk(S)) { if (S.pl === undefined) { ensure(S); store(S); } return false; }
  modal(`<h3>${esc(t('askT'))}</h3><p>${esc(t('askB'))}</p><p class="pl-q">${esc(t('askQ', { r: S.r }))}</p>
    <div class="pl-btns"><button type="button" class="pri" data-a="keep">${esc(t('keep'))} (R ${S.r})</button><button type="button" data-a="redo">${esc(t('redo'))}</button></div><small>${esc(t('askN'))}</small>`,
  (ov, close) => ov.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.a === 'keep') S.pl = { done: 1, keep: 1, r: S.r };
    else begin(S, S.r, S.r);
    store(S); close(); go();
  }));
  return true;
}
const dots = S => {
  const g = S.pl && S.pl.g ? S.pl.g : [];
  let h = ''; for (let i = 0; i < N; i++) { const x = g[i]; h += `<i class="${x ? (x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd') : ''}"></i>`; }
  return `<span class="pl-dots" aria-hidden="true">${h}</span>`;
};
// for the stats card: a badge next to the rating, and a note line (both '' outside placement)
function badge(S) { css(); return on(S) ? `<span class="pl-badge">${esc(t('badge', { k: played(S), n: N }))}</span>${dots(S)}` : ''; }
function note(S) { return on(S) ? `<div class="pl-note">${esc(t('note', { m: N - played(S) }))}</div>` : ''; }
// result dialog line for a placement game (x = record() result)
function resHtml(x) {
  return x.final ? `<span class="rt-res">R <b>${x.r}</b></span>` : `<span class="rt-res">${esc(t('res', { k: x.k, n: x.n, r: x.r }))}</span><br><small style="color:var(--muted)">${esc(t(x.next))}</small>`;
}
// after the last placement game: the rating reveal (rank: optional text, e.g. "1級")
function reveal(S, rank, delay) {
  const P = S.pl; if (!P || !P.done) return;
  setTimeout(() => modal(`<div class="pl-rev"><h3>${esc(t('revT'))}</h3><div class="pl-big">R ${P.r}</div>${rank ? `<div class="pl-rank">${esc(rank)}</div>` : ''}
    <p>${esc(t('revS', { w: P.w, l: P.l, d: P.d }))}${P.from != null ? '<br>' + esc(t('prev', { o: P.from })) : ''}</p><p>${esc(t('revN'))}</p>
    <div class="pl-btns"><button type="button" class="pri">${esc(t('ok'))}</button></div></div>`,
  (ov, close) => { ov.querySelector('button').onclick = close; ov.onclick = e => { if (e.target === ov) close(); }; }), delay == null ? 1600 : delay);
}

window.Placement = { N, on, needAsk, begin, ensure, estimate, pick, record, gate, badge, note, resHtml, reveal, t, setLang(f) { if (typeof f === 'function') langFn = f; } };
})();
