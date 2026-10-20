// Chess — hands-on rules tutorial (shared/ruletour.js). Loaded after app.js and uses its globals
// (E, t, LANG, drillPos, drillPseudo, mFrom/mTo/mPromo/mFlag, sounds, openLessons, openNewDialog, hideOverlay).
// Every page has a small board where the player actually moves the white pieces to clear a task.
// Only what is needed to play is taught here; tactics and openings are left to the lessons.
(function () {
'use strict';
const SQ = 40, W = SQ * 8;
const FILES = 'abcdefgh';
const sq = n => E.sqOf(n), nm = s => E.sqName(s);
const xy = s => [(s & 7) * SQ, (7 - (s >> 4)) * SQ];
const STAR = (x, y) => `<path transform="translate(${x + SQ / 2 - 12},${y + SQ / 2 - 12})" d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#ffd65a" stroke="#9a6a12" stroke-width="1.2"/>`;
function svgOf(B) {
  const { pos, sel, dots, stars, last, check, hl } = B;
  let s = `<svg class="rt-chess" viewBox="-2 -2 ${W + 4} ${W + 4}" width="${W}" height="${W}" role="img" aria-label="board"><rect x="-2" y="-2" width="${W + 4}" height="${W + 4}" rx="4" fill="#120d09" stroke="rgba(201,169,97,.55)"/>`;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const x = f * SQ, y = (7 - r) * SQ, light = (r + f) & 1;
    s += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" fill="${light ? '#e3cfa8' : '#9c7349'}"/>`;
    if (f === 0) s += `<text x="${x + 2.5}" y="${y + 10}" class="rtc-co" fill="${light ? '#8a6440' : '#ecdcbc'}">${r + 1}</text>`;
    if (r === 0) s += `<text x="${x + SQ - 8}" y="${y + SQ - 3}" class="rtc-co" fill="${light ? '#8a6440' : '#ecdcbc'}">${FILES[f]}</text>`;
  }
  for (const q of last || []) { const [x, y] = xy(q); s += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" fill="rgba(226,194,117,.42)"/>`; }
  for (const q of hl || []) { const [x, y] = xy(q); s += `<rect x="${x + 2}" y="${y + 2}" width="${SQ - 4}" height="${SQ - 4}" fill="none" stroke="rgba(226,194,117,.95)" stroke-width="3"/>`; }
  if (check >= 0) { const [x, y] = xy(check); s += `<circle cx="${x + SQ / 2}" cy="${y + SQ / 2}" r="${SQ * .5}" fill="url(#rtcCheck)"/>`; }
  if (sel >= 0) { const [x, y] = xy(sel); s += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" fill="rgba(255,236,170,.5)" stroke="rgba(255,236,170,.95)" stroke-width="2.5"/>`; }
  for (const q of stars || []) { const [x, y] = xy(q); s += STAR(x, y); }
  for (let q = 0; q < 128; q++) {
    if (q & 0x88) { q += 7; continue; }
    const p = pos.b[q]; if (!p) continue;
    const [x, y] = xy(q);
    s += `<svg x="${x}" y="${y}" width="${SQ}" height="${SQ}" viewBox="0 0 100 100" class="${p & 8 ? 'pb' : 'pw'}"><use href="#s${' PNBRQK'[p & 7]}"/></svg>`;
  }
  for (const d of dots || []) {
    const [x, y] = xy(d.to);
    s += d.cap ? `<circle cx="${x + SQ / 2}" cy="${y + SQ / 2}" r="${SQ * .43}" fill="none" stroke="rgba(20,14,8,.45)" stroke-width="3.5"/>` : `<circle cx="${x + SQ / 2}" cy="${y + SQ / 2}" r="${SQ * .15}" fill="rgba(20,14,8,.42)"/>`;
  }
  s += `<defs><radialGradient id="rtcCheck"><stop offset="0" stop-color="rgba(255,70,50,.9)"/><stop offset=".45" stop-color="rgba(255,70,50,.5)"/><stop offset="1" stop-color="rgba(255,70,50,0)"/></radialGradient></defs>`;
  return s + '</svg>';
}
// an interactive mini board.
//  o.fen       start position (white to move)
//  o.drill     true: no kings needed, black pieces stand still and white keeps moving (star hunts)
//  o.stars     squares to visit (drill pages)
//  o.onMove(m, B) -> called after each white move; return nothing (the page decides ok / ng)
//  o.onIllegal(from, to, B) -> a pseudo-legal move that leaves the king in check
function board(api, o) {
  const B = { pos: o.drill ? drillPos(o.fen) : E.Pos.fromFEN(o.fen), sel: -1, dots: [], stars: (o.stars || []).map(sq), last: [], check: -1, hl: (o.hl || []).map(sq), lock: false };
  const legal = () => o.drill ? drillPseudo(B.pos) : B.pos.legal();
  const pseudo = () => { const buf = new Int32Array(256), n = B.pos.gen(buf, false); return Array.from(buf.slice(0, n)); };
  B.draw = () => {
    B.check = !o.drill && B.pos.inCheck() ? B.pos.ksq[B.pos.side] : -1;
    api.board.innerHTML = svgOf(B);
  };
  B.play = (m, quiet) => {
    const before = B.pos, cap = before.b[mTo(m)] || (mFlag(m) & 2);
    B.pos.make(m); B.pos.sp = 0;
    if (o.drill) { B.pos.side = 0; B.pos.ep = -1; }
    B.last = [mFrom(m), mTo(m)]; B.sel = -1; B.dots = [];
    B.stars = B.stars.filter(q => q !== mTo(m));
    B.draw();
    if (!quiet) { if (!o.drill && B.pos.inCheck()) sCheck(); else if (cap) sCapture(); else sMove(); }
  };
  B.legal = legal;
  api.board.onclick = e => {
    if (B.lock || !api.alive() || api.state.done) return;
    const svg = api.board.querySelector('svg'); if (!svg) return;
    const r = svg.getBoundingClientRect(), k = r.width / (W + 4);
    const f = Math.floor((e.clientX - r.left) / k / SQ - 2 / SQ), y = Math.floor((e.clientY - r.top) / k / SQ - 2 / SQ);
    if (f < 0 || f > 7 || y < 0 || y > 7) return;
    const s = (7 - y) * 16 + f, p = B.pos.b[s];
    if (p && !(p & 8)) {    // own piece: select it
      if (B.sel === s) { B.sel = -1; B.dots = []; B.draw(); return; }
      B.sel = s; const seen = new Set();
      B.dots = legal().filter(m => mFrom(m) === s && !seen.has(mTo(m)) && seen.add(mTo(m))).map(m => ({ to: mTo(m), cap: !!(B.pos.b[mTo(m)] || (mFlag(m) & 2)) }));
      B.draw(); return;
    }
    if (B.sel < 0) return;
    const cand = legal().filter(m => mFrom(m) === B.sel && mTo(m) === s);
    if (!cand.length) {
      const from = B.sel;
      if (!o.drill && o.onIllegal && pseudo().some(m => mFrom(m) === from && mTo(m) === s)) { B.sel = -1; B.dots = []; B.draw(); o.onIllegal(from, s, B); return; }
      B.sel = -1; B.dots = []; B.draw(); return;
    }
    const m = cand.find(x => mPromo(x) === 5) || cand[0];   // promotion: always a queen here
    B.play(m);
    if (o.onMove) o.onMove(m, B);
  };
  B.draw();
  return B;
}
const T = (k, v) => t(k, v);
const page = (id, extra) => Object.assign({ id, title: () => T('ru.' + id + '.t'), body: () => `<p>${T('ru.' + id + '.b')}</p>`, task: () => T('ru.' + id + '.task') }, extra);
// a "visit every star" page
const starPage = (id, fen, stars) => page(id, {
  setup(api) {
    board(api, { fen, drill: true, stars, onMove(m, B) { if (!B.stars.length) { B.lock = true; api.ok(T('ru.' + id + '.ok')); } else api.say(T('ru.starsLeft', { n: B.stars.length })); } });
  },
});
const PAGES = [
  starPage('rook', '8/8/8/8/8/8/3R4/8 w - - 0 1', ['d7', 'h7']),
  page('bishop', {
    setup(api) {
      board(api, { fen: '8/8/8/6n1/2p5/8/8/2B5 w - - 0 1', drill: true, onMove(m, B) {
        if (E.sqName(mTo(m)) === 'g5') { B.lock = true; api.ok(T('ru.bishop.ok')); } else api.ng(T('ru.bishop.ng'));
      } });
    },
  }),
  starPage('queen', '8/8/8/8/8/8/8/3Q4 w - - 0 1', ['h5', 'a5']),
  starPage('king', '8/8/8/8/8/8/8/4K3 w - - 0 1', ['d2', 'e3']),
  starPage('knight', '8/8/8/8/8/8/PPPP4/1N6 w - - 0 1', ['c3', 'e4']),
  page('pawn', {
    setup(api) {
      board(api, { fen: '8/8/8/3np3/4P3/8/1P6/8 w - - 0 1', drill: true, onMove(m, B) {
        if (E.sqName(mTo(m)) === 'd5') { B.lock = true; api.ok(T('ru.pawn.ok')); } else api.ng(T('ru.pawn.ng'));
      } });
    },
  }),
  page('promo', {
    setup(api) {
      board(api, { fen: '8/8/2P5/8/8/8/8/8 w - - 0 1', drill: true, onMove(m, B) {
        if (mPromo(m)) { B.lock = true; api.ok(T('ru.promo.ok')); } else api.say(T('ru.promo.more'));
      } });
    },
  }),
  page('check', {
    setup(api) {
      board(api, { fen: '7k/8/8/8/4r3/8/2B5/4K1N1 w - - 0 1', onMove(m, B) {
        B.lock = true;
        const from = mFrom(m), to = mTo(m), how = E.sqName(to) === 'e4' ? 'cap' : from === E.sqOf('e1') ? 'king' : 'block';
        api.ok(T('ru.check.' + how));
      }, onIllegal() { api.ng(T('ru.check.ng'), { reset: false }); } });
    },
  }),
  page('mate', {
    setup(api) {
      board(api, { fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', onMove(m, B) {
        B.lock = true;
        if (!B.pos.legal().length && B.pos.inCheck()) api.ok(T('ru.mate.ok'));
        else api.ng(T(B.pos.inCheck() ? 'ru.mate.ngCheck' : 'ru.mate.ng'));
      } });
    },
  }),
  page('castle', {
    setup(api) {
      board(api, { fen: '4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1', hl: ['e1', 'g1'], onMove(m, B) {
        B.lock = true;
        if (mFlag(m) & 4) api.ok(T('ru.castle.ok')); else api.ng(T('ru.castle.ng'));
      } });
    },
  }),
  page('ep', {
    setup(api) {
      const B = board(api, { fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', onMove(m, B) {
        B.lock = true;
        if (mFlag(m) & 2) api.ok(T('ru.ep.ok')); else api.ng(T('ru.ep.ng'));
      } });
      B.lock = true; api.watch();
      api.sleep(900).then(() => { B.play(B.pos.fromUci('d7d5')); B.hl = [E.sqOf('d6')]; B.draw(); B.lock = false; api.say(T('ru.ep.now')); });
    },
  }),
  page('stale', {
    setup(api) {
      board(api, { fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', onMove(m, B) {
        B.lock = true;
        const n = B.pos.legal().length, chk = B.pos.inCheck();
        if (!n && chk) api.ok(T('ru.stale.ok'));
        else if (!n) api.ng(T('ru.stale.ngStale'));
        else api.ng(T('ru.stale.ng'));
      } });
    },
  }),
];
// the board is sized with --rt-bw (shared/ruletour.js; the chess page adjusts it for short phones and the wide PC layout)
const CSS = `.rt-chess{display:block;width:var(--rt-bw, 320px);height:auto;max-width:100%;cursor:pointer;touch-action:manipulation;border-radius:6px;box-shadow:0 10px 26px rgba(0,0,0,.45)}
.rt-chess .rtc-co{font:700 9px 'JetBrains Mono',monospace;pointer-events:none}`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
let tour = null;
function make() {
  tour = RuleTour.create({
    mount: '#rulesBody', store: 'aicoding-chess-rules-v2', lang: () => LANG,
    close: () => hideOverlay('#rulesOverlay'),
    play: () => { hideOverlay('#rulesOverlay'); openNewDialog(); },
    lessons: () => { hideOverlay('#rulesOverlay'); openLessons(); },
    sound: k => { if (k === 'ok') playTick(); },
    pages: PAGES,
  });
  return tour;
}
window.ChessRules = {
  open(i) { (tour || make()).open(i || 0); },
  render() { if (tour) tour.render(); },
  stop() { if (tour) tour.stop(); },
  get tour() { return tour; },
};
})();
