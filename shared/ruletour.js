// RuleTour — step-by-step, hands-on rules tutorial for the 世界のボドゲ大全 games (common spec).
// Same look and flow as the Dots & Boxes rules: numbered steps on top, a heading and a short explanation,
// a small board where the player actually places / moves pieces to clear a task ("👉 …"), a ✓ / ✗ message,
// "try again", Prev / Close / Next, and a last page with "Play a game" / "Go to lessons".
// Only the basics needed to play belong here; tactics and openings are left to the lessons.
//
// Usage:
//   const tour = RuleTour.create({
//     mount: '#rulesBody',                  // container (inside the game's own dialog)
//     store: 'mygame-rules-v2',             // localStorage key for cleared steps
//     lang: () => LANG,
//     close: () => closeDialog(),
//     play: () => { closeDialog(); newGame(); },        // last page buttons (either may be omitted)
//     lessons: () => openLessons(),
//     pages: [
//       { id: 'place', title: () => t('ru.place.t'), body: () => t('ru.place.b'), task: () => t('ru.place.task'),
//         setup(api) {            // draw the mini board into api.board, wire clicks; called on every (re)start
//           draw(api.board, …); api.board.onclick = e => { … if (good) api.ok(t('…')); else api.ng(t('…')); };
//         } },
//       { id: 'info', title: …, body: …, html: () => '<figure>…</figure>' },   // a page without a task (read only)
//     ],
//   });
// title / body / task / html are inserted as HTML (not escaped): escape any user-supplied text yourself.
// Mini boards (common spec): the board has ONE fixed size per window size — the same on every page and before / after
// answering. RuleTour computes the board box (--rt-bw × --rt-bh on .rt) from the dialog only; pass aspect: w / h of the
// board (default 1). An svg put directly into api.board is stretched to the box (keep a viewBox; use
// RuleTour.svgPoint(svg, e) for click coordinates). Other boards size themselves from api.board.clientWidth / Height.
// The FIRST page of every tour is an intro page built with RuleTour.intro(...) (history / how to win / culture).
//   tour.open(i)  tour.render()  tour.stop()  tour.page  tour.visible()
//
// api (inside setup): board, ok(msg, {next, delay}) — ✓ then auto-advance to the next page after ~1.8 s, next(delay), ng(msg, {reset=true, delay=2400}), say(msg, cls), done(), reset(),
//   alive() (false once the page changed), sleep(ms) (resolves only while alive), timer(fn, ms), watch() (shows "watch…"),
//   setTask(html)
(function () {
'use strict';
const S = {
  ja: { prev: '前へ', next: '次へ', close: '閉じる', again: 'もう一度', watch: 'まず見てみましょう…', play: '対局してみる', lessons: 'レッスンへ進む', finT: 'これで遊べます！', finB: 'ルールはここまでです。まずはやさしいAIと対局してみましょう。上達のコツや作戦はレッスンで学べます。', step: 'ステップ {n}', ok: '正解！', ng: 'ちがいます' },
  en: { prev: 'Back', next: 'Next', close: 'Close', again: 'Try again', watch: 'Watch first…', play: 'Play a game', lessons: 'Go to the lessons', finT: 'You are ready to play!', finB: 'That is all the rules. Try a game against an easy AI first. Tips and strategy are in the lessons.', step: 'Step {n}', ok: 'Correct!', ng: 'Not quite' },
  zh: { prev: '上一步', next: '下一步', close: '关闭', again: '再试一次', watch: '先看一遍…', play: '开始对局', lessons: '进入课程', finT: '可以开始玩了！', finB: '规则就是这些。先和简单的AI下一局吧。技巧和战术可以在课程中学习。', step: '第{n}步', ok: '正确！', ng: '不对哦' },
  ko: { prev: '이전', next: '다음', close: '닫기', again: '다시 하기', watch: '먼저 보세요…', play: '대국해 보기', lessons: '레슨으로', finT: '이제 플레이할 수 있어요!', finB: '규칙은 여기까지입니다. 먼저 쉬운 AI와 대국해 보세요. 요령과 작전은 레슨에서 배울 수 있습니다.', step: '단계 {n}', ok: '정답!', ng: '아니에요' },
  es: { prev: 'Atrás', next: 'Siguiente', close: 'Cerrar', again: 'Otra vez', watch: 'Primero observa…', play: 'Jugar una partida', lessons: 'Ir a las lecciones', finT: '¡Ya puedes jugar!', finB: 'Esas son todas las reglas. Prueba primero contra una IA fácil. Los consejos y la estrategia están en las lecciones.', step: 'Paso {n}', ok: '¡Correcto!', ng: 'No exactamente' },
  fr: { prev: 'Retour', next: 'Suivant', close: 'Fermer', again: 'Réessayer', watch: 'Regardez d’abord…', play: 'Jouer une partie', lessons: 'Aller aux leçons', finT: 'Vous pouvez jouer !', finB: 'Ce sont toutes les règles. Essayez d’abord contre une IA facile. Conseils et stratégie se trouvent dans les leçons.', step: 'Étape {n}', ok: 'Correct !', ng: 'Pas tout à fait' },
  pt: { prev: 'Voltar', next: 'Próximo', close: 'Fechar', again: 'De novo', watch: 'Primeiro observe…', play: 'Jogar uma partida', lessons: 'Ir para as lições', finT: 'Você já pode jogar!', finB: 'Essas são todas as regras. Experimente primeiro contra uma IA fácil. Dicas e estratégia estão nas lições.', step: 'Passo {n}', ok: 'Correto!', ng: 'Não exatamente' },
  de: { prev: 'Zurück', next: 'Weiter', close: 'Schließen', again: 'Nochmal', watch: 'Erst zuschauen…', play: 'Eine Partie spielen', lessons: 'Zu den Lektionen', finT: 'Jetzt kannst du spielen!', finB: 'Das sind alle Regeln. Probiere zuerst eine Partie gegen eine leichte KI. Tipps und Strategie gibt es in den Lektionen.', step: 'Schritt {n}', ok: 'Richtig!', ng: 'Nicht ganz' },
  hi: { prev: 'पीछे', next: 'आगे', close: 'बंद करें', again: 'फिर से', watch: 'पहले देखिए…', play: 'एक खेल खेलें', lessons: 'पाठों पर जाएँ', finT: 'अब आप खेल सकते हैं!', finB: 'नियम बस इतने ही हैं। पहले आसान AI के साथ खेलकर देखें। तरकीबें और रणनीति पाठों में हैं।', step: 'चरण {n}', ok: 'सही!', ng: 'सही नहीं' },
  ar: { prev: 'السابق', next: 'التالي', close: 'إغلاق', again: 'أعد المحاولة', watch: 'شاهد أولاً…', play: 'العب مباراة', lessons: 'إلى الدروس', finT: 'أنت جاهز للعب!', finB: 'هذه كل القواعد. جرّب أولاً مباراة ضد ذكاء اصطناعي سهل. النصائح والاستراتيجية في الدروس.', step: 'الخطوة {n}', ok: 'صحيح!', ng: 'ليس تماماً' },
};
const IL = {
  ja: { hist: '歴史', win: '勝ち方', cult: '文化', origin: '発祥', players: '人数', time: '1局の目安' },
  en: { hist: 'History', win: 'How to win', cult: 'Culture', origin: 'Origin', players: 'Players', time: 'Game length' },
  zh: { hist: '历史', win: '胜利条件', cult: '文化', origin: '起源', players: '人数', time: '一局时长' },
  ko: { hist: '역사', win: '승리 조건', cult: '문화', origin: '기원', players: '인원', time: '한 판 시간' },
  es: { hist: 'Historia', win: 'Cómo ganar', cult: 'Cultura', origin: 'Origen', players: 'Jugadores', time: 'Duración' },
  fr: { hist: 'Histoire', win: 'Comment gagner', cult: 'Culture', origin: 'Origine', players: 'Joueurs', time: 'Durée' },
  pt: { hist: 'História', win: 'Como vencer', cult: 'Cultura', origin: 'Origem', players: 'Jogadores', time: 'Duração' },
  de: { hist: 'Geschichte', win: 'So gewinnt man', cult: 'Kultur', origin: 'Herkunft', players: 'Spieler', time: 'Spieldauer' },
  hi: { hist: 'इतिहास', win: 'जीत कैसे', cult: 'संस्कृति', origin: 'उद्गम', players: 'खिलाड़ी', time: 'खेल की अवधि' },
  ar: { hist: 'التاريخ', win: 'طريقة الفوز', cult: 'الثقافة', origin: 'الأصل', players: 'اللاعبون', time: 'مدة اللعب' },
};
const CSS = `
/* layout (common spec): step numbers on top, the page in the middle, Back / Close / Next fixed at the bottom of the dialog.
   The dialog holding the tour becomes a fixed-height flex column; only the middle part scrolls when a page is long. */
.modal:has(.rt){display:flex;flex-direction:column;overflow:hidden;height:min(900px, calc(100vh - 32px));height:min(900px, calc(100dvh - 32px));max-height:none}
@media (max-width: 520px), (max-height: 560px){.modal:has(.rt){height:calc(100vh - 20px);height:calc(100dvh - 20px)}}
.modal:has(.rt) > :has(.rt), .modal:has(.rt) > :has(.rt) > :has(.rt){flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.modal:has(.rt) > :not(:has(.rt)){flex:none}
.rt{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.rt{position:relative}.rt.rt-sliding{overflow:hidden}
.rt-steps{flex:none}
.rt-main{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;justify-content:safe center;padding:0 2px}
.rt-main > *{flex:none}
.rt > .rt-nav{flex:none;margin-top:0;padding-top:12px;border-top:1px solid var(--line,rgba(255,255,255,.1))}
.rt{--rt-ok:#8fe3b8;--rt-ng:#ff9b90;--rt-bw:min(320px, 86vw)}
.rt-steps{display:flex;gap:6px;justify-content:center;margin:-4px 0 12px;flex-wrap:wrap}
.rt-steps button{width:30px;height:30px;padding:0;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.25);color:var(--muted,#9aa);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;cursor:pointer}
@media (max-height: 560px){.rt-steps{gap:4px;margin-bottom:6px}.rt-steps button{width:26px;height:26px;font-size:11px}.rt > .rt-nav{padding-top:6px}.rt-nav button{padding:7px 10px}}
@media (max-width: 420px){.rt-steps{gap:3px;flex-wrap:nowrap}.rt-steps button{flex:0 1 26px;width:auto;height:auto;aspect-ratio:1;min-width:0;font-size:11px}}
.rt-steps button.ok{border-color:rgba(111,211,160,.6);color:var(--rt-ok)}
.rt-steps button.cur{background:var(--panel2,#1f2a2a);color:var(--accent,#e2c275);box-shadow:0 0 0 2px rgba(201,169,97,.55)}
.rt h2.rt-title{margin:0 0 8px;font-size:19px;line-height:1.3;text-align:center}
.rt-body{font-size:14px;line-height:1.75;color:var(--text,#eee)}
.rt-body p{margin:0 0 8px}.rt-body b{color:var(--accent,#e2c275)}
.rt-board{display:flex;justify-content:center;margin:10px auto 8px;max-width:100%;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.rt-board > *{max-width:100%}
.rt-task{font-size:14.5px;line-height:1.7;text-align:center}
.rt-q{color:var(--text,#eee)}
/* the ✓/✗ line and the 「もう一度」 button share one row that always keeps its space */
.rt-fb{display:flex;align-items:flex-start;justify-content:center;gap:10px;margin-top:6px}
.rt-msg{font-size:14px;line-height:1.5;min-height:3em;color:var(--muted,#9aa)}
.rt-fb > .rt-msg{flex:0 1 auto;min-width:0}
.rt-msg.is-empty{visibility:hidden}
.rt-again.is-idle{display:none}
.rt-msg.ok{color:var(--rt-ok)}.rt-msg.ng{color:var(--rt-ng)}
.rt-msg.ok::before{content:'✓ '}.rt-msg.ng::before{content:'✗ '}
.rt-again{flex:none;white-space:nowrap;font-size:12.5px;padding:5px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.25);color:var(--muted,#9aa);cursor:pointer;font-family:inherit}
/* phones: compact type so the page text fits without scrolling (common spec) */
@media (max-width: 520px){.rt h2.rt-title{font-size:17.5px;margin:0 0 4px}.rt-body{font-size:14px;line-height:1.62}.rt-body p{margin:0 0 5px}.rt-task{font-size:14px;line-height:1.55}.rt-fb{margin-top:3px}.rt-msg{font-size:13.5px;line-height:1.45;min-height:2.9em}.rt-steps{margin-bottom:8px}}
/* board pages (common spec): the mini board has ONE fixed size for a given window size — the same on every page and
   before / after answering. layout() computes it from the space of .rt-main only (never from the page's text):
   --rt-bw × --rt-bh is the board box; the game draws its board to fill it (an svg is stretched to the box, its viewBox
   keeps the proportions). Long texts scroll inside .rt-text instead of shrinking the board.
   .rt-col (phones upright): text (fixed height, scrolls) / board / task (fixed height) — the board never moves.
   .rt-row (PC, phones sideways): text + task (.rt-side) on one side, the board on the other, as big as the height allows. */
.rt-main.has-board{display:grid;overflow:hidden;justify-content:stretch;align-content:stretch;gap:var(--rt-gap,8px)}
.rt-main.has-board .rt-text{min-height:0;overflow-y:auto;overscroll-behavior:contain}
.rt-main.has-board .rt-text > :last-child{margin-bottom:0}
.rt-main.has-board .rt-text.rt-more{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 26px),transparent)}
.rt-main.has-board > .rt-board{width:var(--rt-bw);height:var(--rt-bh);max-width:none;margin:0;justify-self:center;align-self:center;align-items:center;overflow:visible}
.rt-main.has-board > .rt-board > svg{width:100%;height:100%;max-width:none;max-height:none;display:block}
.rt-main.has-board .rt-task{min-height:0}
.rt-col .rt-main.has-board{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) var(--rt-bh) var(--rt-th)}
.rt-col .rt-main.has-board > .rt-side{display:contents}
.rt-col .rt-main.has-board .rt-text{grid-row:1}
.rt-col .rt-main.has-board > .rt-board{grid-row:2}
.rt-wide .rt-main.has-board{overflow:visible}.rt-wide .rt-main.has-board > .rt-board{margin-inline:calc(-1 * var(--rt-bx,0px))}
.rt-col .rt-main.has-board .rt-task{grid-row:3;overflow-y:auto;overscroll-behavior:contain}
.rt-row .rt-main.has-board{grid-template-columns:minmax(0,1fr) var(--rt-bw);grid-template-rows:minmax(0,1fr);column-gap:var(--rt-cgap,24px)}
.rt-row .rt-main.has-board > .rt-side{display:flex;flex-direction:column;min-height:0;min-width:0;overflow-y:auto;overscroll-behavior:contain}
.rt-row .rt-main.has-board .rt-text{flex:0 1 auto;min-height:min(84px, 40%)}
.rt-row .rt-main.has-board .rt-task{flex:none;text-align:start;margin-top:8px}
.rt-row .rt-main.has-board .rt-task .rt-fb{justify-content:flex-start}
.rt-row .rt-main.has-board .rt-text > h2.rt-title{text-align:start}
.rt-html{margin:10px 0}
.rt-finish{display:flex;flex-direction:column;gap:10px;margin:14px auto 4px;max-width:340px}
.rt-finish .rt-fin-ico{font-size:44px;text-align:center;line-height:1}
.rt-nav{display:flex;gap:8px;justify-content:space-between;margin-top:14px}
.rt-nav button,.rt-finish button{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--text,#eee);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.rt-nav button.go,.rt-finish button.go{border:0;background:linear-gradient(180deg,#e9cf8e,#c9a961);color:#14100a}
.rt-nav button:disabled{opacity:.35;cursor:default}
@keyframes rtPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
.rt-msg.ok{animation:rtPop .3s cubic-bezier(.2,1.6,.4,1)}
/* PC: big board and big text — size the mini board with var(--rt-bw) */
@media (hover: hover) and (pointer: fine) and (min-width: 820px){
  .rt{--rt-bw:clamp(340px, calc(100vh - 420px), 600px)}
  .rt-steps button{width:36px;height:36px;font-size:14px}
  .rt h2.rt-title{font-size:25px;margin-bottom:10px}
  .rt-body{font-size:16.5px;line-height:1.8}
  .rt-task{font-size:18px}
  .rt-msg{font-size:16.5px}
  .rt-again{font-size:14px;padding:7px 14px}
  .rt-nav button,.rt-finish button{font-size:16px;padding:12px 14px}
  .rt .rt-nav{justify-content:center}
  .rt .rt-nav button{flex:0 1 220px;min-width:0}
  .rt .rt-finish button{flex:none;width:220px;max-width:100%}
}
.rt-intro{display:grid;gap:12px;text-align:start}
.rt-intro-hero{display:flex;align-items:center;gap:16px}
.rt-intro-hero img{flex:none;width:112px;height:112px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
.rt-intro-facts{display:flex;flex-wrap:wrap;gap:8px}
.rt-intro-facts span{display:inline-flex;flex-direction:column;gap:1px;padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.12));font-size:14px;color:var(--text,#eee)}
.rt-intro-facts small{font-size:11px;color:var(--muted,#9aa);letter-spacing:.04em}
.rt-intro-sec{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:start;align-content:start;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid var(--line,rgba(255,255,255,.1))}
.rt-intro-sec i{font-style:normal;font-size:22px;line-height:1.3;grid-row:span 2}
.rt-intro-sec b{font-size:14px;color:var(--accent,#e2c275);letter-spacing:.04em}
.rt-intro-sec p{margin:0;font-size:14px;line-height:1.75;color:var(--text,#eee)}
@media (hover: hover) and (pointer: fine) and (min-width: 820px){
  /* PC: use the width — a compact hero row, then history / how to win / culture side by side */
  .rt-intro{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
  .rt-intro-hero{grid-column:1 / -1;justify-content:center;gap:22px}
  .rt-intro-hero img{width:132px;height:132px}
  .rt-intro-facts span{font-size:16.5px;padding:9px 16px}.rt-intro-facts small{font-size:12.5px}
  .rt-intro-sec{grid-template-columns:1fr;gap:6px;padding:16px 18px}
  .rt-intro-sec i{grid-row:auto;font-size:28px;line-height:1}
  .rt-intro-sec b{font-size:17px}.rt-intro-sec p{font-size:16px;line-height:1.8}
}
@media (hover: hover) and (pointer: fine) and (min-width: 820px) and (max-height: 820px){
  .rt-intro{gap:12px}.rt-intro-hero img{width:92px;height:92px}
  .rt-intro-sec{padding:12px 16px;gap:4px}.rt-intro-sec i{font-size:24px}.rt-intro-sec p{font-size:15.5px;line-height:1.7}
}
html[lang=ar] .rt-intro{direction:rtl}
html[lang=ar] .rt-body,html[lang=ar] .rt h2.rt-title{direction:rtl;text-align:right}
html[lang=ar] .rt-task{direction:rtl}
html[lang=ar] .rt-row .rt-main.has-board .rt-task, html[lang=ar] .rt-row .rt-main.has-board .rt-text > h2.rt-title{text-align:right}
`;
function injectCss() { if (!document.getElementById('rtCss')) { const st = document.createElement('style'); st.id = 'rtCss'; st.textContent = CSS; document.head.appendChild(st); } }
function create(o) {
  injectCss();
  const mount = () => typeof o.mount === 'string' ? document.querySelector(o.mount) : o.mount;
  const L = () => { const l = o.lang ? o.lang() : 'ja'; return S[l] ? l : 'en'; };
  const tx = (k, v) => { let s = S[L()][k]; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x]); return s; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const val = x => typeof x === 'function' ? x() : x;
  const pages = o.pages.concat([{ id: '_finish', finish: true }]);
  const get = () => { try { return JSON.parse(localStorage.getItem(o.store) || '{}'); } catch (e) { return {}; } };
  const mark = id => { const d = get(); if (d[id]) return; d[id] = 1; try { localStorage.setItem(o.store, JSON.stringify(d)); } catch (e) {} const m = mount(); const b = m && m.querySelector(`.rt-steps button[data-rt="${tour.page}"]`); if (b) b.classList.add('ok'); if (o.onMark) o.onMark(id); };
  let gen = 0, timers = [];
  const tour = { page: 0 };
  function stop() { gen++; timers.forEach(clearTimeout); timers = []; const P = pages[tour.page]; if (P && P.teardown) try { P.teardown(); } catch (e) {} }
  function render() {
    stop();
    const m = mount(); if (!m) return;
    const P = pages[tour.page], n = pages.length, done = get();
    let h = `<div class="rt"><div class="rt-steps">${pages.map((x, j) => `<button type="button" data-rt="${j}" class="${j === tour.page ? 'cur' : ''} ${done[x.id] ? 'ok' : ''}" aria-label="${esc(tx('step', { n: j + 1 }))}">${x.finish ? '★' : j + 1}</button>`).join('')}</div><div class="rt-main${P.setup ? ' has-board' : ''}">`;
    if (P.finish) {
      h += `<h2 class="rt-title">${esc(tx('finT'))}</h2><div class="rt-body"><p>${esc(tx('finB'))}</p></div><div class="rt-finish"><div class="rt-fin-ico">🎉</div>` +
        (o.play ? `<button type="button" class="go" data-rt-act="play">${esc(tx('play'))}</button>` : '') +
        (o.lessons ? `<button type="button" class="go" data-rt-act="lessons">${esc(tx('lessons'))}</button>` : '') + `</div>`;
    } else {
      const tx0 = `<h2 class="rt-title">${val(P.title)}</h2><div class="rt-body">${val(P.body) || ''}</div>` + (P.html ? `<div class="rt-html">${val(P.html)}</div>` : '');
      // board pages: title / text in .rt-text (scrolls by itself), then the fixed-size board and the task (see layout())
      h += P.setup ? `<div class="rt-side"><div class="rt-text">${tx0}</div><div class="rt-task"></div></div><div class="rt-board"></div>` : tx0;
    }
    h += `</div><div class="rt-nav"><button type="button" data-rt-act="prev" ${tour.page === 0 ? 'disabled' : ''}>${esc(tx('prev'))}</button><button type="button" data-rt-act="close">${esc(tx('close'))}</button><button type="button" class="go" data-rt-act="next" ${tour.page === n - 1 ? 'disabled' : ''}>${esc(tx('next'))}</button></div></div>`;
    m.innerHTML = h;
    if (!layout() && P.setup) {   // the dialog is not laid out yet (still hidden): draw again once it has its size
      const my = gen; let k = 0;
      const again = () => { if (gen !== my + 1 && gen !== my) return; const mm = mount(), mn = mm && mm.querySelector('.rt-main'); if (mn && mn.clientWidth > 40 && mn.clientHeight > 40) render(); else if (++k < 60) requestAnimationFrame(again); };
      requestAnimationFrame(again);
    }
    if (P.finish || !P.setup) mark(P.id);
    if (P.setup) start(); else { fit(); requestAnimationFrame(fit); }   // read-only pictures are fitted too
  }
  function start() {
    const m = mount(), P = pages[tour.page], my = ++gen;
    const board = m.querySelector('.rt-board'), task = m.querySelector('.rt-task');
    const st = { msg: '', cls: '', done: false, extra: '' };
    const alive = () => gen === my && pages[tour.page] === P;
    const drawTask = () => {
      if (!alive()) return;
      const q = val(P.task);
      // the ✓/✗ line and the 「もう一度」 button always keep their space (empty / hidden until used),
      // so a message never pushes the board around or makes it shrink
      task.innerHTML = (q ? `<span class="rt-q">👉 ${q}</span>` : '') + st.extra + `<div class="rt-fb"><div class="rt-msg ${st.msg ? st.cls : 'is-empty'}" aria-live="polite">${st.msg || '&nbsp;'}</div>` +
        `<button type="button" class="rt-again${st.done ? '' : ' is-idle'}" data-rt-act="again"${st.done ? '' : ' tabindex="-1" aria-hidden="true" disabled'}>↺ ${esc(tx('again'))}</button></div>`;
    };
    board.innerHTML = '';
    const api = {
      board, alive, state: st,
      say(msg, cls) { st.msg = msg || ''; st.cls = cls || ''; drawTask(); },
      setTask(html) { st.extra = html || ''; drawTask(); },
      watch() { st.msg = esc(tx('watch')); st.cls = ''; drawTask(); },
      // correct: mark, show ✓, then move on to the next page automatically (common spec).
      // opt.next === false keeps the page (e.g. an animation still has to play: call api.next() when it is done);
      // opt.delay changes the wait (default 1800 ms, or o.nextDelay).
      ok(msg, opt) {
        if (!alive()) return; opt = opt || {};
        st.done = true; st.msg = msg || esc(tx('ok')); st.cls = 'ok'; mark(P.id); drawTask(); if (o.sound) o.sound('ok');
        if (opt.next !== false && o.autoNext !== false) api.next(opt.delay);
      },
      next(delay) { api.timer(() => go(tour.page + 1), delay == null ? (o.nextDelay || 1800) : delay); },
      done() { if (!alive()) return; st.done = true; mark(P.id); drawTask(); },
      ng(msg, opt) {
        if (!alive()) return; opt = opt || {};
        st.msg = msg || esc(tx('ng')); st.cls = 'ng'; drawTask(); if (o.sound) o.sound('ng');
        if (opt.reset !== false) api.timer(() => render(), opt.delay || 2400);
      },
      reset() { render(); },
      timer(fn, ms) { const id = setTimeout(() => { if (alive()) fn(); }, ms); timers.push(id); return id; },
      sleep(ms) { return new Promise(res => { const id = setTimeout(() => { if (alive()) res(); }, ms); timers.push(id); }); },
    };
    drawTask();
    try { P.setup(api); } catch (e) { console.error(e); }
    const tt = m.querySelector('.rt-text'); requestAnimationFrame(() => more(tt));
  }
  // fixed board size (common spec): computed from the size of .rt-main only, so it is the same on every page and does not
  // change when a ✓/✗ message appears; only a window resize / rotation changes it
  // the tallest title + text of all board pages at a given width (column layout): the board is sized so that the text of
  // every page fits without scrolling when there is room (the board stays one fixed size on every page)
  const tnCache = {};
  // web fonts arriving later change the text size: measure again and re-lay out
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { for (const k in tnCache) delete tnCache[k]; if (visible()) fit(); });
  function textNeed(w) {
    const m = mount(), main = m && m.querySelector('.rt-main'); if (!main) return 0;
    const key = Math.round(w) + '|' + document.documentElement.lang + '|' + innerWidth; if (tnCache[key] != null) return tnCache[key];
    const pr = document.createElement('div'); pr.className = 'rt-text';
    pr.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${w}px;height:auto;max-height:none;overflow:visible;-webkit-mask-image:none;mask-image:none`;
    main.appendChild(pr); let mx = 0;
    for (const P of pages) {
      if (!P.setup || P.finish) continue;
      // P.measure: other texts the page may show in its body (e.g. after a tap) — room is kept for them too
      for (const bd of [val(P.body) || ''].concat(P.measure ? val(P.measure) || [] : [])) {
        try { pr.innerHTML = `<h2 class="rt-title">${val(P.title)}</h2><div class="rt-body">${bd}</div>` + (P.html ? `<div class="rt-html">${val(P.html)}</div>` : ''); mx = Math.max(mx, pr.scrollHeight); } catch (e) {}
      }
    }
    pr.remove();
    return (tnCache[key] = Math.ceil(mx) + 4);
  }
  function layout() {
    const m = mount(), rt = m && m.querySelector('.rt'), main = rt && rt.querySelector('.rt-main');
    if (!main) return false;
    const b = box(main, val(o.aspect), textNeed);
    if (!b) return false;
    rt.classList.toggle('rt-row', b.row); rt.classList.toggle('rt-col', !b.row); rt.classList.toggle('rt-wide', !!b.wide);
    for (const k in b.vars) rt.style.setProperty(k, b.vars[k]);
    more(main.querySelector('.rt-text'));
    return true;
  }
  // read-only pages with a picture (no task): if the page overflows, shrink the picture (--rt-bw) so it fits without scrolling
  function fit() {
    const m = mount(), rt = m && m.querySelector('.rt'), main = rt && rt.querySelector('.rt-main');
    if (!main || main.classList.contains('has-board')) { layout(); return; }
    const bd = main.querySelector('.rt-html .tour-pic');
    layout();
    if (!bd || !main.clientHeight) return;
    for (let k = 0; k < 3; k++) {
      const over = main.scrollHeight - main.clientHeight; if (over <= 1) break;
      const el = bd.firstElementChild || bd, w = el.getBoundingClientRect().width, h = el.getBoundingClientRect().height || w;
      if (!w) break;
      rt.style.setProperty('--rt-bw', Math.max(220, Math.floor(w - (over + 2) * w / h)) + 'px');
    }
  }
  let lyT = 0; window.addEventListener('resize', () => { clearTimeout(lyT); lyT = setTimeout(fit, 60); });
  // page change with a slide: the old page slides out, the new one slides in from the side it is heading to (mirrored in ar).
  // from = the finger's current offset (px) when the change comes from a swipe, so the motion continues from there.
  function go(i, from) {
    if (i < 0 || i >= pages.length) return;
    const d = Math.sign(i - tour.page), m = mount(), old = d && m && visible() ? m.querySelector('.rt-main') : null;
    let ghost = null, W = 0;
    if (old) { W = old.clientWidth; ghost = old.cloneNode(true); ghost.style.cssText += `;position:absolute;left:${old.offsetLeft}px;top:${old.offsetTop}px;width:${old.offsetWidth}px;height:${old.offsetHeight}px;margin:0;pointer-events:none`; }
    tour.page = i; render();
    if (!ghost) return;
    const rt = m.querySelector('.rt'), main = m.querySelector('.rt-main'); if (!rt || !main) return;
    const sx = d * (document.documentElement.lang === 'ar' ? -1 : 1), f = from || 0, gap = W + 24;
    rt.classList.add('rt-sliding'); rt.appendChild(ghost);
    const opt = { duration: f ? 220 : 280, easing: 'cubic-bezier(.22,.7,.25,1)' };
    const a = ghost.animate([{ transform: `translateX(${f}px)`, opacity: 1 }, { transform: `translateX(${-sx * gap}px)`, opacity: .4 }], opt);
    main.animate([{ transform: `translateX(${sx * gap + f}px)` }, { transform: 'none' }], opt);
    const end = () => { ghost.remove(); rt.classList.remove('rt-sliding'); };
    a.onfinish = end; a.oncancel = end;
  }
  function onClick(e) {
    const m = mount(); if (!m || !m.contains(e.target)) return;
    const b = e.target.closest('[data-rt],[data-rt-act]'); if (!b || !m.contains(b)) return;
    if (b.dataset.rt !== undefined) return go(+b.dataset.rt);
    const a = b.dataset.rtAct;
    if (a === 'prev') go(tour.page - 1);
    else if (a === 'next') go(tour.page + 1);
    else if (a === 'again') render();
    else if (a === 'close') { stop(); o.close && o.close(); }
    else if (a === 'play') { stop(); o.play && o.play(); }
    else if (a === 'lessons') { stop(); o.lessons && o.lessons(); }
  }
  document.addEventListener('click', onClick);
  function visible() {   // really on screen: games hide their dialogs with opacity 0 (still laid out), so check that too
    const m = mount(); if (!(m && m.offsetParent && m.querySelector('.rt'))) return false;
    for (let x = m; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.opacity === '0' || cs.visibility === 'hidden') return false; if (x.classList.contains('overlay') && !x.classList.contains('show')) return false; }
    return true;
  }
  document.addEventListener('keydown', e => {
    if (!visible() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    const rtl = document.documentElement.lang === 'ar';
    if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (document.activeElement) document.activeElement.blur(); go(tour.page + 1); return; }   // Enter = next (not a re-press of the button that opened the rules)
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); go(tour.page + (rtl ? -1 : 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(tour.page + (rtl ? 1 : -1)); }
  }, true);
  // phones: swipe left = next, right = prev (reversed in ar). The page follows the finger and slides on (go) or springs back.
  // Swipes starting on the board / buttons are ignored so moves still work.
  let sw = null;
  const swMain = () => { const m = mount(); return m && m.querySelector('.rt-main'); };
  const swTarget = dx => tour.page + ((dx < 0) !== (document.documentElement.lang === 'ar') ? 1 : -1);
  document.addEventListener('touchstart', e => {
    sw = null; const m = mount();
    if (e.touches.length > 1 || !m || !m.contains(e.target) || !visible()) return;
    if (e.target.closest('.rt-board, input, textarea, select, [data-noswipe]')) return;
    const t = e.touches[0]; sw = { x: t.clientX, y: t.clientY, t: Date.now(), on: false, dx: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sw || e.touches.length > 1) return;
    const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.6) return; sw.on = true; }
    const ok = swTarget(dx) >= 0 && swTarget(dx) < pages.length, mn = swMain(); if (!mn) return;
    sw.dx = ok ? dx : dx * .25;   // no page that way: rubber band
    mn.style.transform = `translateX(${sw.dx}px)`;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!sw) return; const s0 = sw; sw = null;
    const t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y, dt = Date.now() - s0.t, mn = swMain();
    if (mn) mn.style.transform = '';
    const W = mn ? mn.clientWidth : 360, j = swTarget(dx), can = j >= 0 && j < pages.length;
    const flick = dt < 900 && Math.abs(dx) >= 56 && Math.abs(dx) >= Math.abs(dy) * 1.6;
    if (can && (flick || (s0.on && Math.abs(dx) > W * .3))) { go(j, s0.on ? s0.dx : 0); return; }
    if (s0.on && mn && s0.dx) mn.animate([{ transform: `translateX(${s0.dx}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.22,.7,.25,1)' });
  }, { passive: true });
  document.addEventListener('touchcancel', () => { const mn = sw && sw.on && swMain(); if (mn) mn.style.transform = ''; sw = null; }, { passive: true });
  Object.assign(tour, {
    open(i) { tour.page = Math.max(0, Math.min(pages.length - 1, i | 0)); render(); },
    render() { if (visible()) { const P = pages[tour.page]; if (P && P.setup && P.relabel) { P.relabel(); return; } render(); } },
    stop, visible, pages, mark, t: tx, fit, layout,
    progress() { const d = get(); return { done: pages.filter(p => d[p.id]).length, total: pages.length }; },
  });
  return tour;
}
// The fixed board box for a rules page: main = the element between the step dots and the nav bar (its size must not
// depend on the page's content), aspect = board width / height (default 1). Returns { row, bw, bh, vars } or null.
const PCQ = '(hover: hover) and (pointer: fine) and (min-width: 820px)';
function box(main, aspect, need) {
  const cs = getComputedStyle(main);
  const W = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (W < 40 || H < 40) return null;
  const ar = +aspect > 0 ? +aspect : 1, pc = matchMedia(PCQ).matches, short = innerHeight < 700;
  const fit = (w, h) => { w = Math.max(60, w); h = Math.max(60, h); return w / h > ar ? [h * ar, h] : [w, w / ar]; };
  const tk = main.querySelector('.rt-task, .ru-task'), fs = tk ? parseFloat(getComputedStyle(tk).fontSize) || 14.5 : 14.5;   // same on every board page
  const gap = pc ? 12 : 8, th = pc ? Math.max(126, Math.round(fs * 6.7)) : Math.max(84, Math.round(fs * 6)), tmin = pc ? 150 : short ? 84 : 104;   // task area (2 lines + ✓/✗ 2 lines) / smallest text area (column)
  const cgap = pc ? 40 : 20, tw = pc ? 360 : 230;                                        // side by side: gap / smallest text column
  // column: leave room for the tallest page text (need(width)), but keep the board at least ~68% of the width (still easy to tap)
  let tcol = tmin;
  if (need && !pc) { const nd = need(W); if (nd > tmin) { const minB = Math.min(W, Math.max(230, W * .68)), cap0 = fit(W, H - th - tmin - 2 * gap); tcol = Math.min(nd, Math.max(tmin, H - th - 2 * gap - Math.min(cap0[1], minB / ar))); } }
  const col = fit(W, H - th - tcol - 2 * gap);
  const row = fit(Math.min(W - tw - cgap, W * .66), H);
  const isRow = W - row[0] - cgap >= tw * .9 && row[0] * row[1] > col[0] * col[1] * 1.05;   // room for the text column
  let [bw, bh] = isRow ? row : col;
  // phones, wide boards (backgammon …): use the full width so the points are easy to tap, even if the page text then scrolls a little
  // (out to the dialog's edges: --rt-bx is how far the board reaches past the text column on each side)
  let bx = 0;
  if (!pc && !isRow && ar >= 1.2) {
    const dlg = main.closest('.modal') || main.parentElement;   // widths only (positions move while a page slides)
    bx = Math.max(0, Math.min(24, Math.floor((dlg.clientWidth - main.clientWidth) / 2 - 6)));
    const fh = H - th - tcol - 2 * gap; [bw, bh] = fit(W + 2 * bx, Math.max(bh, fh));   // still leaves room for the page text
  }
  const cap = pc ? 640 : 560; if (Math.max(bw, bh) > cap) { const k = cap / Math.max(bw, bh); bw *= k; bh *= k; }
  bw = Math.floor(bw); bh = Math.floor(bh);
  return { row: isRow, bw, bh, wide: bx > 0, vars: { '--rt-bx': bx + 'px', '--rt-bw': bw + 'px', '--rt-bh': bh + 'px', '--rt-th': th + 'px', '--rt-gap': gap + 'px', '--rt-cgap': cgap + 'px' } };
}
// a text area that scrolls fades out at the bottom while there is more to read
function more(el) {
  if (!el) return;
  const upd = () => el.classList.toggle('rt-more', el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  upd(); el.onscroll = upd;
}
// a pointer event on a mini-board svg → viewBox coordinates (correct even when the svg is letterboxed in the board box)
function svgPoint(svg, e) {
  const ctm = svg.getScreenCTM(); if (!ctm) return [0, 0];
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return [p.x, p.y];
}
// Intro page (common spec: the first page of every rules tutorial introduces the game — history, how to win, culture).
// RuleTour.intro({ img: '../images/atlas/chess.webp', origin, players, time, history, win, culture, lang }) -> HTML for a page's html.
// Texts are HTML (escape user text yourself); pass already-translated strings.
function intro(o) {
  injectCss();
  const l = IL[o.lang] ? o.lang : 'en', T = IL[l];
  const fact = (k, v) => v ? `<span><small>${T[k]}</small>${v}</span>` : '';
  const sec = (cls, ico, k, v) => v ? `<div class="rt-intro-sec ${cls}"><i>${ico}</i><b>${T[k]}</b><p>${v}</p></div>` : '';
  return `<div class="rt-intro"><div class="rt-intro-hero">${o.img ? `<img src="${o.img}" alt="">` : ''}<div class="rt-intro-facts">${fact('origin', o.origin)}${fact('players', o.players)}${fact('time', o.time)}</div></div>` +
    sec('hist', '📜', 'hist', o.history) + sec('win', '🏆', 'win', o.win) + sec('cult', '🌏', 'cult', o.culture) + '</div>';
}
window.RuleTour = { create, intro, box, more, svgPoint, PCQ, S, IL };
})();
