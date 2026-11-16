// ヒット＆ブロー — rules tutorial (shared/ruletour.js). HitBlowTour.open() / relabel()
(function () {
'use strict';
const A = window.HitBlowApp, E = window.HitBlowEngine;
const lang = () => A.lang();
const T = (k, v) => { let s = (HB_I18N[lang()] || HB_I18N.en)[k]; if (s == null) s = HB_I18N.en[k]; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
// the mini puzzles use 3 pegs and 4 colours: 0 red, 1 yellow, 2 green, 3 blue
const N = 3, C = 4, CODE = [0, 1, 2];
const hole = (c, cls, i) => `<i class="hole${cls ? ' ' + cls : ''}"${i != null ? ` data-i="${i}"` : ''}>${c >= 0 ? A.pegH(c) : ''}</i>`;
function row(ix, code, fb, o) {
  o = o || {};
  return `<div class="hb-row${o.cls ? ' ' + o.cls : ''}"><span class="hb-ix">${ix}</span><span class="hb-holes${o.sec ? ' sec' : ''}">${code.map((c, i) => hole(c, o.hole ? o.hole(i) : '', i)).join('')}${o.lid ? `<span class="hb-lid">${'<span>?</span>'.repeat(code.length)}</span>` : ''}</span>` +
    `<span class="hb-fb">${fb ? A.fbH(N, fb.h, fb.b) + `<b class="fbt">${A.fbText(fb.h, fb.b)}</b>` : o.cap ? `<b class="hb-cnt">${o.cap}</b>` : ''}</span></div>`;
}
function mount(api, html) { const w = api.board.clientWidth || 320; api.board.innerHTML = `<div class="hbt" style="font-size:${Math.max(13, Math.min(26, w / 15))}px">${html}</div>`; return api.board.firstChild; }
// an input row + palette + 判定 inside the mini board; onSubmit(code) is called with a full row
function input(api, head, ix, onSubmit) {
  let cur = Array(N).fill(-1), locked = false;
  const draw = () => {
    const el = mount(api, head + row(ix, cur, null, { cls: 'cur' }) +
      `<div class="hb-dock"><div class="hb-pal">${[0, 1, 2, 3].map(c => `<button type="button" data-c="${c}"${cur.includes(c) ? ' disabled' : ''}><span>${A.pegH(c)}</span></button>`).join('')}</div><div class="hb-in"><button type="button" class="hb-go"${cur.includes(-1) ? ' disabled' : ''}>${T('submit')}</button></div></div>`);
    el.onclick = e => {
      if (locked) return;
      const p = e.target.closest('.hb-pal button'), h = e.target.closest('.hb-row.cur .hole'), go = e.target.closest('.hb-go');
      if (p && !p.disabled) { const i = cur.indexOf(-1); if (i >= 0) { cur[i] = +p.dataset.c; draw(); } }
      else if (h && cur[+h.dataset.i] >= 0) { cur[+h.dataset.i] = -1; draw(); }
      else if (go && !go.disabled) { locked = true; onSubmit(cur.slice()); }
    };
  };
  draw();
}
// tap the right peg of a guess shown under the open code
function pick(api, guess, want, okMsg, ngMsg) {
  let done = false;
  const draw = (sel, good) => mount(api, row(A.LOCK, CODE, null, { sec: true }) + row(1, guess, E.feedback(CODE, guess), { hole: i => 'tap' + (i === sel ? (good ? ' mark' : ' miss') : '') }));
  const wire = el => { el.onclick = e => { const h = e.target.closest('.hole.tap'); if (!h || done) return; const i = +h.dataset.i; done = true; draw(i, i === want); if (i === want) api.ok(okMsg); else api.ng(ngMsg); }; };
  wire(draw(-1));
}

const pages = () => [
  { id: 'intro', title: () => T('ru.intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), origin: T('ru.origin'), players: T('ru.players'), time: T('ru.time'), history: T('ru.hist'), win: T('ru.win'), culture: T('ru.cult') }) },
  { id: 'place', title: () => T('ru.place.t'), body: () => T('ru.place.b'), task: () => T('ru.place.task'),
    setup(api) {
      const head = row(A.LOCK, [-1, -1, -1], null, { sec: true, lid: true });
      input(api, head, 1, code => { mount(api, head + row(1, code, E.feedback(CODE, code))); api.ok(T('ru.place.ok')); });
    } },
  { id: 'hit', title: () => T('ru.hit.t'), body: () => T('ru.hit.b'), task: () => T('ru.hit.task'),
    setup(api) { pick(api, [0, 3, 3], 0, T('ru.hit.ok'), T('ru.hit.ng')); } },
  { id: 'blow', title: () => T('ru.blow.t'), body: () => T('ru.blow.b'), task: () => T('ru.blow.task'),
    setup(api) { pick(api, [3, 3, 1], 2, T('ru.blow.ok'), T('ru.blow.ng')); } },
  { id: 'solve', title: () => T('ru.solve.t'), body: () => T('ru.solve.b'), task: () => T('ru.solve.task'),
    setup(api) {
      // code 012 (red yellow green): 013 → 2H 0B, 132 → 1H 1B; among codes without repeats only 012 fits both
      const g1 = [0, 1, 3], g2 = [1, 3, 2];
      const head = row(A.LOCK, [-1, -1, -1], null, { sec: true, lid: true }) + row(1, g1, E.feedback(CODE, g1)) + row(2, g2, E.feedback(CODE, g2));
      input(api, head, 3, code => {
        const f = E.feedback(CODE, code);
        mount(api, (f.h === N ? row(A.LOCK, CODE, null, { sec: true }) : row(A.LOCK, [-1, -1, -1], null, { sec: true, lid: true })) + row(1, g1, E.feedback(CODE, g1)) + row(2, g2, E.feedback(CODE, g2)) + row(3, code, f));
        if (f.h === N) api.ok(T('ru.solve.ok')); else api.ng(T('ru.solve.ng'));
      });
    } },
  { id: 'modes', title: () => T('ru.modes.t'), body: () => T('ru.modes.b'),
    setup(api) { mount(api, row(A.LOCK, [2, 2, 0], null, { sec: true }) + row(1, [0, 1, 3], { h: 0, b: 1 }) + row(2, [2, 0, 2], { h: 1, b: 2 }) + row(3, [2, 2, 0], { h: 3, b: 0 })); } },
];
let tour = null;
const ov = () => document.querySelector('#rulesOverlay');
function close() { ov().classList.remove('show'); if (tour) tour.stop(); }
function build() {
  tour = RuleTour.create({ mount: '#rulesBody', store: 'aicoding-hitblow-rules', lang, pages: pages(), aspect: 1.25,
    close, play: () => { close(); A.newGame(); } });
}
function open() { if (!tour) build(); ov().classList.add('show'); tour.open(0); try { localStorage.setItem('aicoding-hitblow-rules-seen', '1'); } catch (e) {} }
ov().addEventListener('click', e => { if (e.target === ov()) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov().classList.contains('show')) close(); });
window.HitBlowTour = { open, close, relabel() { if (tour && ov().classList.contains('show')) tour.render(); } };
})();
