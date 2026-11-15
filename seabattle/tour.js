// 海戦ゲーム — rules tutorial (shared/ruletour.js). SeaTour.open() / relabel()
(function () {
'use strict';
const E = window.SeaEngine, SB = window.SeaBoard, NS = 'http://www.w3.org/2000/svg';
const lang = () => window.SeaApp.lang();
const T = (k, v) => { let s = (SEA_I18N[lang()] || SEA_I18N.en)[k]; if (s == null) s = SEA_I18N.en[k]; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
const FLEET = [{ r: 1, c: 1, len: 5, h: 1 }, { r: 3, c: 7, len: 4, h: 0 }, { r: 4, c: 2, len: 3, h: 1 }, { r: 7, c: 1, len: 3, h: 0 }, { r: 8, c: 5, len: 2, h: 1 }];
function mk(api) { api.board.innerHTML = ''; const svg = document.createElementNS(NS, 'svg'); api.board.appendChild(svg); return svg; }
const shotsOf = o => { const a = new Uint8Array(100); for (const k in o) a[k] = o[k]; return a; };
const SHIP = [{ r: 4, c: 4, len: 3, h: 1 }];      // the cruiser of the firing pages: E5–G5

const pages = () => [
  { id: 'intro', title: () => T('ru.intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), origin: T('ru.origin'), players: T('ru.players'), time: T('ru.time'), history: T('ru.hist'), win: T('ru.win'), culture: T('ru.cult') }) },
  { id: 'fleet', title: () => T('ru.fleet.t'), body: () => T('ru.fleet.b'),
    setup(api) { SB.draw(mk(api), { ships: FLEET, show: () => 'own' }); } },
  { id: 'place', title: () => T('ru.place.t'), body: () => T('ru.place.b'), task: () => T('ru.place.task'),
    setup(api) {
      const ships = FLEET.map(s => Object.assign({}, s)), svg = mk(api); let done = false;
      const draw = () => SB.draw(svg, { ships, show: i => i === 2 && !done ? 'own pick' : 'own', glow: done ? null : E.shipCells(ships[2]) });
      draw();
      svg.onclick = e => { if (done) return; const c = SB.cellAt(svg, e); if (c < 0 || !E.shipCells(ships[2]).includes(c)) return; done = true; ships[2] = { r: 3, c: 3, len: 3, h: 0 }; draw(); api.ok(T('ru.place.ok')); };
    } },
  { id: 'fire', title: () => T('ru.fire.t'), body: () => T('ru.fire.b'), task: () => T('ru.fire.task'),
    setup(api) {
      const svg = mk(api), shots = shotsOf({ 12: 1, 67: 1 }); let done = false;
      SB.draw(svg, { shots, glow: [45] });
      svg.onclick = e => { if (done || SB.cellAt(svg, e) !== 45) return; done = true; SB.fx(svg, 45, true).then(() => { if (!api.alive()) return; shots[45] = 2; SB.draw(svg, { shots }); api.ok(T('ru.fire.ok')); }); };
    } },
  { id: 'chase', title: () => T('ru.chase.t'), body: () => T('ru.chase.b'), task: () => T('ru.chase.task'),
    setup(api) {
      const svg = mk(api), shots = shotsOf({ 12: 1, 67: 1, 45: 2 }); let done = false;
      SB.draw(svg, { shots, last: 45 });
      svg.onclick = e => { const c = SB.cellAt(svg, e); if (done || c < 0 || shots[c]) return; const hit = c === 44 || c === 46; done = true;
        SB.fx(svg, c, hit).then(() => { if (!api.alive()) return; shots[c] = hit ? 2 : 1; SB.draw(svg, { shots }); if (hit) api.ok(T('ru.chase.ok')); else api.ng(T('ru.chase.ng')); }); };
    } },
  { id: 'sink', title: () => T('ru.sink.t'), body: () => T('ru.sink.b'), task: () => T('ru.sink.task'),
    setup(api) {
      const svg = mk(api), shots = shotsOf({ 12: 1, 67: 1, 43: 1, 44: 2, 45: 2 }); let done = false;
      SB.draw(svg, { shots });
      svg.onclick = e => { const c = SB.cellAt(svg, e); if (done || c < 0 || shots[c]) return; const hit = c === 46; done = true;
        SB.fx(svg, c, hit).then(() => { if (!api.alive()) return; shots[c] = hit ? 2 : 1; SB.draw(svg, { shots, ships: hit ? SHIP.map(s => Object.assign({}, s)) : null, show: () => 'sunk' }); if (hit) api.ok(T('ru.sink.ok')); else api.ng(T('ru.sink.ng')); }); };
    } },
  { id: 'modes', title: () => T('ru.modes.t'), body: () => T('ru.modes.b'),
    setup(api) { SB.draw(mk(api), { ships: FLEET, show: i => i === 4 ? 'sunk' : 'own', shots: shotsOf({ 85: 2, 86: 2, 23: 1, 58: 1, 11: 2, 60: 1 }) }); } },
];
let tour = null;
const ov = () => document.querySelector('#rulesOverlay');
function close() { ov().classList.remove('show'); if (tour) tour.stop(); }
function build() {
  tour = RuleTour.create({ mount: '#rulesBody', store: 'aicoding-seabattle-rules', lang, pages: pages(), aspect: 1,
    close, play: () => { close(); window.SeaApp.newGame(); } });
}
function open() { if (!tour) build(); ov().classList.add('show'); tour.open(0); try { localStorage.setItem('aicoding-seabattle-rules-seen', '1'); } catch (e) {} }
ov().addEventListener('click', e => { if (e.target === ov()) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov().classList.contains('show')) close(); });
window.SeaTour = { open, close, relabel() { if (tour && ov().classList.contains('show')) tour.render(); } };
})();
