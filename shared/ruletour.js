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
// Mini boards: size them with the CSS variable --rt-bw (set on .rt: ~320px on phones, up to 600px on PC) so every game
// shows a big, easy-to-click board on PC and the same text sizes.
//   tour.open(i)  tour.render()  tour.stop()  tour.page  tour.visible()
//
// api (inside setup): board, ok(msg), ng(msg, {reset=true, delay=2400}), say(msg, cls), done(), reset(),
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
const CSS = `
.rt{--rt-ok:#8fe3b8;--rt-ng:#ff9b90;--rt-bw:min(320px, 86vw)}
/* PC: big board and big text — size the mini board with var(--rt-bw) */
@media (hover: hover) and (pointer: fine) and (min-width: 820px){
  .rt{--rt-bw:clamp(340px, calc(100vh - 420px), 600px)}
  .rt-steps button{width:36px;height:36px;font-size:14px}
  .rt h2.rt-title{font-size:25px;margin-bottom:10px}
  .rt-body{font-size:16.5px;line-height:1.8}
  .rt-task{font-size:18px;min-height:60px}
  .rt-msg{font-size:16.5px}
  .rt-again{font-size:14px;padding:7px 14px}
  .rt-nav button,.rt-finish button{font-size:16px;padding:12px 14px}
}
.rt-steps{display:flex;gap:6px;justify-content:center;margin:-4px 0 12px;flex-wrap:wrap}
.rt-steps button{width:30px;height:30px;padding:0;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.25);color:var(--muted,#9aa);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;cursor:pointer}
.rt-steps button.ok{border-color:rgba(111,211,160,.6);color:var(--rt-ok)}
.rt-steps button.cur{background:var(--panel2,#1f2a2a);color:var(--accent,#e2c275);box-shadow:0 0 0 2px rgba(201,169,97,.55)}
.rt h2.rt-title{margin:0 0 8px;font-size:19px;text-align:center}
.rt-body{font-size:14px;line-height:1.75;color:var(--text,#eee)}
.rt-body p{margin:0 0 8px}.rt-body b{color:var(--accent,#e2c275)}
.rt-board{display:flex;justify-content:center;margin:10px auto 8px;max-width:100%;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.rt-board > *{max-width:100%}
.rt-task{font-size:14.5px;line-height:1.7;min-height:52px;text-align:center}
.rt-q{color:var(--text,#eee)}
.rt-msg{margin-top:6px;font-size:14px;color:var(--muted,#9aa)}
.rt-msg.ok{color:var(--rt-ok)}.rt-msg.ng{color:var(--rt-ng)}
.rt-msg.ok::before{content:'✓ '}.rt-msg.ng::before{content:'✗ '}
.rt-again{margin-top:8px;font-size:12.5px;padding:5px 12px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.25);color:var(--muted,#9aa);cursor:pointer;font-family:inherit}
.rt-html{margin:10px 0}
.rt-finish{display:flex;flex-direction:column;gap:10px;margin:14px auto 4px;max-width:340px}
.rt-finish .rt-fin-ico{font-size:44px;text-align:center;line-height:1}
.rt-nav{display:flex;gap:8px;justify-content:space-between;margin-top:14px}
.rt-nav button,.rt-finish button{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--text,#eee);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.rt-nav button.go,.rt-finish button.go{border:0;background:linear-gradient(180deg,#e9cf8e,#c9a961);color:#14100a}
.rt-nav button:disabled{opacity:.35;cursor:default}
@keyframes rtPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
.rt-msg.ok{animation:rtPop .3s cubic-bezier(.2,1.6,.4,1)}
html[lang=ar] .rt-body,html[lang=ar] .rt h2.rt-title{direction:rtl;text-align:right}
html[lang=ar] .rt-task{direction:rtl}
`;
function create(o) {
  if (!document.getElementById('rtCss')) { const st = document.createElement('style'); st.id = 'rtCss'; st.textContent = CSS; document.head.appendChild(st); }
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
    let h = `<div class="rt"><div class="rt-steps">${pages.map((x, j) => `<button type="button" data-rt="${j}" class="${j === tour.page ? 'cur' : ''} ${done[x.id] ? 'ok' : ''}" aria-label="${esc(tx('step', { n: j + 1 }))}">${x.finish ? '★' : j + 1}</button>`).join('')}</div>`;
    if (P.finish) {
      h += `<h2 class="rt-title">${esc(tx('finT'))}</h2><div class="rt-body"><p>${esc(tx('finB'))}</p></div><div class="rt-finish"><div class="rt-fin-ico">🎉</div>` +
        (o.play ? `<button type="button" class="go" data-rt-act="play">${esc(tx('play'))}</button>` : '') +
        (o.lessons ? `<button type="button" class="go" data-rt-act="lessons">${esc(tx('lessons'))}</button>` : '') + `</div>`;
    } else {
      h += `<h2 class="rt-title">${val(P.title)}</h2><div class="rt-body">${val(P.body) || ''}</div>`;
      if (P.html) h += `<div class="rt-html">${val(P.html)}</div>`;
      if (P.setup) h += `<div class="rt-board"></div><div class="rt-task"></div>`;
    }
    h += `<div class="rt-nav"><button type="button" data-rt-act="prev" ${tour.page === 0 ? 'disabled' : ''}>${esc(tx('prev'))}</button><button type="button" data-rt-act="close">${esc(tx('close'))}</button><button type="button" class="go" data-rt-act="next" ${tour.page === n - 1 ? 'disabled' : ''}>${esc(tx('next'))}</button></div></div>`;
    m.innerHTML = h;
    if (P.finish || !P.setup) mark(P.id);
    if (P.setup) start();
  }
  function start() {
    const m = mount(), P = pages[tour.page], my = ++gen;
    const board = m.querySelector('.rt-board'), task = m.querySelector('.rt-task');
    const st = { msg: '', cls: '', done: false, extra: '' };
    const alive = () => gen === my && pages[tour.page] === P;
    const drawTask = () => {
      if (!alive()) return;
      const q = val(P.task);
      task.innerHTML = (q ? `<span class="rt-q">👉 ${q}</span>` : '') + (st.msg ? `<div class="rt-msg ${st.cls}">${st.msg}</div>` : '') + st.extra +
        (st.done ? `<button type="button" class="rt-again" data-rt-act="again">↺ ${esc(tx('again'))}</button>` : '');
    };
    board.innerHTML = '';
    const api = {
      board, alive, state: st,
      say(msg, cls) { st.msg = msg || ''; st.cls = cls || ''; drawTask(); },
      setTask(html) { st.extra = html || ''; drawTask(); },
      watch() { st.msg = esc(tx('watch')); st.cls = ''; drawTask(); },
      ok(msg) { if (!alive()) return; st.done = true; st.msg = msg || esc(tx('ok')); st.cls = 'ok'; mark(P.id); drawTask(); if (o.sound) o.sound('ok'); },
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
  }
  function go(i) { if (i < 0 || i >= pages.length) return; tour.page = i; render(); }
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
  function visible() { const m = mount(); return !!(m && m.offsetParent && m.querySelector('.rt')); }
  document.addEventListener('keydown', e => {
    if (!visible() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    const rtl = document.documentElement.lang === 'ar';
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); go(tour.page + (rtl ? -1 : 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(tour.page + (rtl ? 1 : -1)); }
  }, true);
  Object.assign(tour, {
    open(i) { tour.page = Math.max(0, Math.min(pages.length - 1, i | 0)); render(); },
    render() { if (visible()) { const P = pages[tour.page]; if (P && P.setup && P.relabel) { P.relabel(); return; } render(); } },
    stop, visible, pages, mark, t: tx,
    progress() { const d = get(); return { done: pages.filter(p => d[p.id]).length, total: pages.length }; },
  });
  return tour;
}
window.RuleTour = { create, S };
})();
