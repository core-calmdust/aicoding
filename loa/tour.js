// ラインズ・オブ・アクション — rules tutorial (shared/ruletour.js). LoaTour.open() / relabel()
(function () {
'use strict';
const E = window.LoaEngine, LB = window.LoaBoard;
const lang = () => window.LoaApp.lang();
const T = (k, v) => { let s = (LOA_I18N[lang()] || LOA_I18N.en)[k]; if (s == null) s = LOA_I18N.en[k]; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
function mk(api) { api.board.innerHTML = ''; return LB.mount(api.board); }
// the positions (rank 8 first; x = black, o = white). tools/test_ui.js clears every task with moves taken from the engine.
const POS = {
  count: ['........', '.o......', '...x....', '........', '......o.', '........', '...x....', '........'],
  jump: ['........', '..o...x.', '........', '........', '........', '.xx...o.', '........', '........'],
  block: ['........', '.....o..', '........', '........', '........', '.xo...x.', '........', '........'],
  cap: ['..x.....', '......o.', '........', '..o.....', '........', '........', '..x..o..', '........'],
  goal: ['.o......', 'o.....o.', '........', '...xx...', '....xx..', '........', '.......o', '...x....'],
  both: ['........', '.....oo.', '........', '.....o..', '...xx...', '........', '.....x..', '........'],
};
const TASKS = {       // from = the piece to move, good(result, state) = cleared?
  count: { from: 'd2', good: r => r.to === E.sqOf('d4') },
  jump: { from: 'b3', good: r => r.to === E.sqOf('e3') },
  block: { from: 'b3', good: r => !!r },
  cap: { from: 'c2', good: r => r.cap },
  goal: { from: 'd1', good: (r, st) => st.winner === 1 },
};
// a hands-on page: tap the glowing piece (its counted lines appear), then tap a destination
function movePage(id) {
  const o = TASKS[id];
  return { id, title: () => T('ru.' + id + '.t'), body: () => T('ru.' + id + '.b'), task: () => T('ru.' + id + '.task'),
    setup(api) {
      const st = E.fromText(POS[id], 1), bd = mk(api), from = E.sqOf(o.from); let sel = -1, info = null, done = false, last = null;
      const draw = anim => bd.draw({ board: st.b, sel, info, glow: sel < 0 && !done ? [from] : null, anim, last, win: st.winner === 1 ? 1 : 0 });
      draw();
      bd.svg.onclick = e => {
        if (done) return; const s = bd.cellAt(e); if (s < 0) return;
        if (sel >= 0) { const x = info.find(i => i.ok && i.to === s); if (x) { const f = sel, res = E.play(st, sel | s << 6); sel = -1; info = null; done = true; last = { from: f, to: s }; draw(last); const good = !!res && o.good(res, st); api.timer(() => { if (good) api.ok(T('ru.' + id + '.ok')); else api.ng(T('ru.' + id + '.ng')); }, 420); return; } }
        if (s === from && sel !== s) { sel = s; info = E.lineInfo(st, s); } else { sel = -1; info = null; }
        draw();
      };
    } };
}
const pages = () => [
  { id: 'intro', title: () => T('ru.intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), origin: T('ru.origin'), players: T('ru.players'), time: T('ru.time'), history: T('ru.hist'), win: T('ru.win'), culture: T('ru.cult') }) },
  movePage('count'), movePage('jump'), movePage('block'), movePage('cap'), movePage('goal'),
  { id: 'both', title: () => T('ru.both.t'), body: () => T('ru.both.b'),
    setup(api) { const st = E.fromText(POS.both, 1); mk(api).draw({ board: st.b, hint: { from: E.sqOf('f2'), to: E.sqOf('f5') } }); } },
];
let tour = null;
const ov = () => document.querySelector('#rulesOverlay');
function close() { ov().classList.remove('show'); if (tour) tour.stop(); }
function build() {
  tour = RuleTour.create({ mount: '#rulesBody', store: 'aicoding-loa-rules', lang, pages: pages(), aspect: 1,
    close, play: () => { close(); window.LoaApp.newGame(); } });
}
function open() { if (!tour) build(); ov().classList.add('show'); tour.open(0); try { localStorage.setItem('aicoding-loa-rules-seen', '1'); } catch (e) {} }
ov().addEventListener('click', e => { if (e.target === ov()) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov().classList.contains('show')) close(); });
window.LoaTour = { open, close, relabel() { if (tour && ov().classList.contains('show')) tour.render(); }, POS, TASKS };
})();
