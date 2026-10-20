'use strict';
// Shogi — "Rules" tab of the lesson dialog: illustrated beginner rules (cards → detail pages, ← → to turn pages).
// Diagrams are small boards drawn with the game's own pieceEl(), so they follow the chosen piece set.
// Texts for all 10 languages live in RU_TXT (rules-i18n.js) and are merged into I18N.
(() => {
const DIR = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NW: [-1, -1], NE: [1, -1], SW: [-1, 1], SE: [1, 1] };
const STORE = 'shogi-kaya-rules-v1';
let seen = {}; try { seen = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) {}
let page = -1;            // -1 = card list
let uid = 0;
const TO = 9, NY = 10, NK = 11, NG = 12, UM = 13, RY = 14;

for (const l in RU_TXT) Object.assign(I18N[l] || (I18N[l] = {}), RU_TXT[l]);

// ---------------------------------------------------------------- drawing helpers
function pc(tp, col) { const f0 = flip; flip = false; try { return pieceEl(tp | (col ? WF : 0)).outerHTML; } finally { flip = f0; } }
// s: {c, r, p:[[x,y,tp,col]], g: ghosts, d: dots [[x,y,cls]], ln: [[x0,y0,x1,y1,cls]], x: crosses, t: {"x,y": cls}, lab: [[x,y,text]], rk: row labels}
function board(s, cw) {
  const cells = {}, key = (x, y) => x + ',' + y, add = (x, y, h) => { cells[key(x, y)] = (cells[key(x, y)] || '') + h; };
  (s.d || []).forEach(([x, y, c]) => add(x, y, `<i class="rd${c ? ' ' + c : ''}"></i>`));
  (s.g || []).forEach(([x, y, tp, col]) => add(x, y, `<span class="rg">${pc(tp, col)}</span>`));
  (s.p || []).forEach(([x, y, tp, col]) => add(x, y, pc(tp, col)));
  (s.x || []).forEach(([x, y]) => add(x, y, '<i class="rx"></i>'));
  (s.lab || []).forEach(([x, y, tx]) => add(x, y, `<b class="rl">${tx}</b>`));
  const ch = Math.round(cw * 1.1);
  let h = '';
  for (let y = 0; y < s.r; y++) for (let x = 0; x < s.c; x++) { const tc = s.t && s.t[key(x, y)]; h += `<div class="rc${tc ? ' ' + tc : ''}">${cells[key(x, y)] || ''}</div>`; }
  if (s.ln && s.ln.length) {
    const mk = Math.max(9, Math.round(cw * .34)), W = s.c * cw + s.c - 1, H = s.r * ch + s.r - 1, cx = x => x * (cw + 1) + cw / 2, cy = y => y * (ch + 1) + ch / 2, id = 'ruA' + (++uid);
    let g = '';
    for (const [x0, y0, x1, y1, c] of s.ln) {
      let ax = cx(x0), ay = cy(y0); const bx = cx(x1), by = cy(y1), L = Math.hypot(bx - ax, by - ay) || 1;
      if (c === 'kn') { const sx = ax + Math.sign(bx - ax) * cw * .42, sy = ay - ch * .1; g += `<path class="rv kn" d="M${sx} ${sy} Q${bx} ${sy} ${bx} ${by + ch * .26}" marker-end="url(#${id})"/>`; continue; }
      const k = c === 'chk' || c === 'sup' ? .32 : .42; ax += (bx - ax) / L * cw * k; ay += (by - ay) / L * ch * k;
      g += `<line class="rv ${c || ''}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"${c === 'sup' ? '' : ` marker-end="url(#${id}${c === 'chk' ? 'r' : ''})"`}/>`;
    }
    h += `<svg class="ra" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>` +
      `<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="${mk}" markerHeight="${mk}" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#167a4e"/></marker>` +
      `<marker id="${id}r" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="${mk}" markerHeight="${mk}" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d2382a"/></marker>` +
      `</defs>${g}</svg>`;
  }
  const b = `<div class="rb" style="--cw:${cw}px;--ch:${ch}px;--c:${s.c};--r:${s.r}">${h}</div>`;
  if (!s.rk) return b;
  return `<div class="rb-wrap">${b}<div class="rk" style="--ch:${ch}px">${s.rk.map(x => `<span>${x}</span>`).join('')}</div></div>`;
}
function hand(list, cw, label, sel) {
  return `<div class="ru-hand"><small>${label}</small>${list.map(tp => `<div class="rh${sel ? ' sel' : ''}" style="--cw:${cw}px;--ch:${Math.round(cw * 1.1)}px">${pc(tp, 0)}</div>`).join('')}</div>`;
}
function moves(tp, n) {
  const c = n >> 1, m = MV[tp] || {}, s = { c: n, r: n, p: [[c, c, tp, 0]], d: [], ln: [], t: { [c + ',' + c]: 'sel' } };
  for (const k of m.s || []) { const [dx, dy] = DIR[k]; s.d.push([c + dx, c + dy]); }
  for (const k of m.l || []) {
    const [dx, dy] = DIR[k]; let x = c + dx, y = c + dy, lx = c, ly = c;
    while (x >= 0 && y >= 0 && x < n && y < n) { s.d.push([x, y, 'ln']); lx = x; ly = y; x += dx; y += dy; }
    s.ln.push([c, c, lx, ly]);
  }
  if (m.kn) { s.d.push([c - 1, c - 2], [c + 1, c - 2]); s.ln.push([c, c, c - 1, c - 2, 'kn'], [c, c, c + 1, c - 2, 'kn']); s.p.push([c, c - 1, FU, 0]); }
  return s;
}
const fig = (inner, cap) => `<figure class="ru-fig">${inner}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const rankLbl = n => Array.from({ length: n }, (_, i) => LANG === 'ja' || LANG === 'zh' ? KAN[i + 1] : String(i + 1));
function sfenRows(sfen) {
  const L = { p: FU, l: KY, n: KE, s: GI, b: KA, r: HI, g: KI, k: OU };
  return sfen.split(' ')[0].split('/').map(row => { const out = []; for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null); else { const lc = ch.toLowerCase(); out.push([L[lc], ch === lc ? 1 : 0]); } } return out; });
}
function strips(cw) {   // pawn / lance / knight: the ranks they may not reach unpromoted
  return board({ c: 3, r: 4, rk: rankLbl(4), p: [[0, 3, FU, 0], [1, 3, KY, 0], [2, 3, KE, 0]], t: { '0,0': 'bad', '1,0': 'bad', '2,0': 'bad', '2,1': 'bad' }, x: [[0, 0], [1, 0], [2, 0], [2, 1]] }, cw);
}
const legend = () => `<div class="ru-leg"><span><i class="rd"></i>${t('ru.legStep')}</span><span><i class="rd ln"></i><i class="lg-ln"></i>${t('ru.legLine')}</span></div>`;
function piecePage(tp, pro) {
  return {
    u: pro ? 13 : 6.5, uN: pro ? 11.3 : 6.5, v: 5.9, vN: pro ? 6.6 : 5.9,
    fig: cw => {
      const a = `<div class="ru-pm"><div class="ru-pc">${board(moves(tp, 5), cw)}</div>`;
      const b = pro ? `<div class="ru-arrow"><span>${t('ru.promote')}</span><svg viewBox="0 0 40 20"><path d="M2 10H32M24 3L34 10L24 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ru-pc pro"><small class="ru-pl">${t('ru.promote')}</small>${board(moves(pro, 5), cw)}</div>`
        : `<div class="ru-nopro">${t('ru.noPromo')}</div>`;
      return fig(a + b + '</div>', legend() + (tp === KE ? `<div class="ru-leg"><span><svg class="lg-kn" viewBox="0 0 24 14"><path d="M2 12Q10 -2 22 6" fill="none" stroke="#3fbf86" stroke-width="2.6" stroke-dasharray="4 3"/></svg>${t('ru.legJump')}</span></div>` : ''));
    },
  };
}

// ---------------------------------------------------------------- pages
const zoneT = (c, rows) => { const o = {}; for (let y = 0; y < rows; y++) for (let x = 0; x < c; x++) o[x + ',' + y] = 'zone'; return o; };
const PAGES = [
  { sec: 'goal', id: 'goal', u: 5, v: 4, fig: cw => fig(board({ c: 5, r: 4, p: [[2, 0, OU, 1], [2, 1, KI, 0], [2, 2, FU, 0]], x: [[1, 0], [3, 0], [1, 1], [3, 1]], t: { '2,1': 'sel', '1,0': 'bad', '3,0': 'bad', '1,1': 'bad', '3,1': 'bad' }, ln: [[2, 2, 2, 1, 'sup']] }, cw), t('ru.goal.cap')), lesson: 3 },
  { sec: 'setup', id: 'setup', u: 9, v: 10.2, fig: cw => {
    const rows = sfenRows(HANDI[0]), p = []; rows.forEach((r, y) => r.forEach((q, x) => { if (q) p.push([x, y, q[0], q[1]]); }));
    return fig(`<div class="ru-side g">△ ${t('white')}</div>` + board({ c: 9, r: 9, p, t: zoneT(9, 3) }, cw) + `<div class="ru-side">▲ ${t('black')}</div>`, t('ru.zone.cap'));
  } },
  { sec: 'moves', id: 'ou', ...piecePage(OU, 0) },
  { sec: 'moves', id: 'hi', ...piecePage(HI, RY) },
  { sec: 'moves', id: 'ka', ...piecePage(KA, UM) },
  { sec: 'moves', id: 'ki', ...piecePage(KI, 0) },
  { sec: 'moves', id: 'gi', ...piecePage(GI, NG) },
  { sec: 'moves', id: 'ke', ...piecePage(KE, NK) },
  { sec: 'moves', id: 'ky', ...piecePage(KY, NY) },
  { sec: 'moves', id: 'fu', ...piecePage(FU, TO), lesson: 0 },
  { sec: 'promo', id: 'zone', u: 9, v: 7.4, fig: cw => {
    const pairs = [[HI, RY], [KA, UM], [GI, NG], [KE, NK], [KY, NY], [FU, TO]], sc = Math.round(cw * .78);
    return fig(board({ c: 9, r: 5, rk: rankLbl(5), t: { ...zoneT(9, 3), '5,3': 'sel', '1,3': 'sel' }, p: [[5, 3, GI, 0], [1, 3, FU, 0], [3, 0, KI, 1], [6, 1, FU, 1]], g: [[5, 2, NG, 0], [1, 2, TO, 0]], ln: [[5, 3, 5, 2], [1, 3, 1, 2]] }, cw), t('ru.zone.cap')) +
      fig(`<div class="ru-pairs">${pairs.map(([a, b]) => `<div class="ru-pair"><div class="rh" style="--cw:${sc}px;--ch:${Math.round(sc * 1.1)}px">${pc(a, 0)}</div><span>›</span><div class="rh pro" style="--cw:${sc}px;--ch:${Math.round(sc * 1.1)}px">${pc(b, 0)}</div></div>`).join('')}</div>`, t('ru.flip.cap'));
  } },
  { sec: 'promo', id: 'forced', u: 4.5, v: 4.6, fig: cw => fig(strips(cw), t('ru.forced.cap')) },
  { sec: 'hand', id: 'cap', u: 7.5, v: 4.2, fig: cw => fig(`<div class="ru-row">${board({ c: 5, r: 4, p: [[2, 3, GI, 0], [1, 2, UM, 1], [3, 0, KI, 1], [0, 3, FU, 0]], t: { '2,3': 'sel', '1,2': 'bad' }, ln: [[2, 3, 1, 2]] }, cw)}${hand([KA], cw, t('ru.hand'), 1)}</div>`, t('ru.cap.cap')), lesson: 1 },
  { sec: 'hand', id: 'drop', u: 7.5, v: 5.2, fig: cw => {
    const occ = { '1,1': [FU, 1], '3,0': [GI, 1], '0,4': [FU, 0], '4,3': [KY, 0], '2,4': [OU, 0] }, p = [], d = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const o = occ[x + ',' + y]; if (o) p.push([x, y, o[0], o[1]]); else if (!(x === 2 && y === 2)) d.push([x, y]); }
    return fig(`<div class="ru-row">${hand([KI], cw, t('ru.hand'), 1)}${board({ c: 5, r: 5, p, d, g: [[2, 2, KI, 0]], t: { '2,2': 'sel' } }, cw)}</div>`, t('ru.drop.cap'));
  } },
  { sec: 'foul', id: 'nifu', u: 7.5, v: 5.2, fig: cw => {
    const p = [[0, 3, FU, 0], [1, 3, FU, 0], [3, 3, FU, 0], [2, 1, TO, 0], [4, 1, FU, 1]], tt = {}, d = [], x = [];
    for (let y = 0; y < 5; y++) for (let c = 0; c < 5; c++) { if (p.some(q => q[0] === c && q[1] === y)) continue; if (c === 0 || c === 1 || c === 3) { tt[c + ',' + y] = 'bad'; if (y === 0) x.push([c, y]); } else if (y > 0 || c === 2) d.push([c, y]); }
    return fig(`<div class="ru-row">${hand([FU], cw, t('ru.hand'), 1)}${board({ c: 5, r: 5, p, d, x, t: tt }, cw)}</div>`, t('ru.nifu.cap'));
  } },
  { sec: 'foul', id: 'uchifu', u: 6.5, v: 4.2, fig: cw => fig(`<div class="ru-row">${hand([FU], cw, t('ru.hand'), 1)}${board({ c: 4, r: 4, p: [[3, 0, OU, 1], [2, 0, KE, 1], [2, 1, GI, 1], [3, 3, KY, 0]], g: [[3, 1, FU, 0]], x: [[3, 1]], t: { '3,1': 'bad' }, ln: [[3, 3, 3, 1, 'sup']] }, cw)}</div>`, t('ru.uchifu.cap')) },
  { sec: 'foul', id: 'dead', u: 6, v: 4.6, fig: cw => fig(`<div class="ru-row">${hand([FU, KY, KE], Math.round(cw * .8), t('ru.hand'))}${strips(cw)}</div>`, t('ru.dead.cap')) },
  { sec: 'foul', id: 'other', u: 5, v: 5.2, fig: cw => fig(board({ c: 5, r: 5, p: [[2, 0, HI, 1], [2, 4, OU, 0], [0, 4, KY, 0], [4, 3, GI, 0]], ln: [[2, 0, 2, 4, 'chk']], x: [[2, 3]], d: [[1, 3], [3, 3], [1, 4], [3, 4]], t: { '2,4': 'bad', '2,3': 'bad' } }, cw), t('ru.other.cap')), lesson: 2 },
  { sec: 'draw', id: 'sen', u: 13, v: 3.6, fig: cw => {
    const s = { c: 3, r: 3, p: [[1, 0, OU, 1], [1, 2, HI, 0], [0, 1, KI, 1]], t: {} }, b = board(s, cw);
    return fig(`<div class="ru-rep">${[1, 2, 3, 4].map(i => `<div><span class="ru-n">${i}</span>${b}</div>`).join('<b>=</b>')}</div>`, t('ru.sen.cap'));
  } },
  { sec: 'draw', id: 'jishogi', u: 9, v: 11, fig: cw => {
    const p = [[4, 1, OU, 0], [3, 1, KI, 0], [5, 2, GI, 0], [2, 2, TO, 0], [6, 1, UM, 0], [4, 7, OU, 1], [5, 7, KI, 1], [3, 6, GI, 1], [6, 6, FU, 1], [2, 7, RY, 1]];
    const tt = { ...zoneT(9, 3) }; for (let y = 6; y < 9; y++) for (let x = 0; x < 9; x++) tt[x + ',' + y] = 'zone2';
    const sc = Math.round(cw * .8);
    const chips = (list, n) => `<div class="ru-chip">${list.map(tp => `<div class="rh" style="--cw:${sc}px;--ch:${Math.round(sc * 1.1)}px">${pc(tp, 0)}</div>`).join('')}<b>${t('ru.pts', { n })}</b></div>`;
    return fig(board({ c: 9, r: 9, p, t: tt }, cw), '') + `<div class="ru-chips">${chips([HI, KA], 5)}${chips([KI, GI, KE, KY, FU], 1)}</div>`;
  }, wide: 1 },
  { sec: 'win', id: 'win', u: 8, v: 6, fig: cw => {
    const sz = Math.max(30, Math.min(56, Math.round(cw * 1.1)));
    const ic = [
      `<div class="rh" style="--cw:${sz}px;--ch:${Math.round(sz * 1.1)}px">${pc(OU, 1)}<i class="rx"></i></div>`,
      `<svg viewBox="0 0 48 48"><path d="M10 40V8" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M12 9c8-4 13 4 24 0v17c-11 4-16-4-24 0z" fill="#efe5d2"/></svg>`,
      `<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="16" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M24 26V16M24 26l7 5" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M19 5h10" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>`,
      `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#ff7a6a" stroke-width="3.6"/><path d="M16 16L32 32M32 16L16 32" stroke="#ff7a6a" stroke-width="3.6" stroke-linecap="round"/></svg>`,
    ];
    return `<div class="ru-wins" style="--sz:${sz}px">${ic.map((s, i) => `<div class="ru-win"><div class="ic">${s}</div><p>${t('ru.win.' + (i + 1)).replace(/<\/b>\s*[:：]\s*/, '</b>')}</p></div>`).join('')}</div>`;
  }, wide: 1, lesson: 3 },
  { sec: 'handi', id: 'handi', u: 13, v: 15, fig: cw => {
    const base = sfenRows(HANDI[0]), names = t('handi');
    const rows = [1, 2, 3, 4, 5, 6].map(i => {
      const r = sfenRows(HANDI[i]), p = [], tt = {};
      for (let y = 0; y < 2; y++) for (let x = 0; x < 9; x++) { if (r[y][x]) p.push([x, y, r[y][x][0], 1]); else if (base[y][x]) tt[x + ',' + y] = 'gone'; }
      return `<div class="ru-hrow"><b>${Array.isArray(names) ? names[i] : ''}</b>${board({ c: 9, r: 2, p, t: tt }, cw)}</div>`;
    }).join('');
    return fig(`<div class="ru-handi">${rows}</div>`, t('ru.handi.cap'));
  } },
];
const SECS = [...new Set(PAGES.map(p => p.sec))];
const THUMB = {
  goal: () => board({ c: 5, r: 4, p: [[2, 0, OU, 1], [2, 1, KI, 0], [2, 2, FU, 0]], x: [[1, 0], [3, 0], [1, 1], [3, 1]], t: { '2,1': 'sel', '1,0': 'bad', '3,0': 'bad', '1,1': 'bad', '3,1': 'bad' } }, 19),
  setup: () => { const p = []; sfenRows(HANDI[0]).forEach((r, y) => r.forEach((q, x) => { if (q) p.push([x, y, q[0], q[1]]); })); return board({ c: 9, r: 9, p, t: zoneT(9, 3) }, 10); },
  moves: () => board(moves(HI, 5), 17),
  promo: () => `<div class="ru-pair big"><div class="rh" style="--cw:34px;--ch:37px">${pc(HI, 0)}</div><span>›</span><div class="rh pro" style="--cw:34px;--ch:37px">${pc(RY, 0)}</div></div>`,
  hand: () => `<div class="ru-row sm">${hand([KI, GI, FU], 24, t('ru.hand'), 1)}</div>`,
  foul: () => board({ c: 4, r: 4, p: [[3, 0, OU, 1], [2, 0, KE, 1], [2, 1, GI, 1], [3, 3, KY, 0]], g: [[3, 1, FU, 0]], x: [[3, 1]], t: { '3,1': 'bad' } }, 19),
  draw: () => `<svg class="ru-ico" viewBox="0 0 64 64"><path d="M50 32a18 18 0 1 1-6-13.4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M46 8l-1 12 12-1" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="39" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" font-family="'JetBrains Mono',monospace">×4</text></svg>`,
  win: () => `<div class="rh" style="--cw:40px;--ch:44px">${pc(OU, 1)}<i class="rx"></i></div>`,
  handi: () => { const r = sfenRows(HANDI[3]), base = sfenRows(HANDI[0]), p = [], tt = {}; for (let y = 0; y < 2; y++) for (let x = 0; x < 9; x++) { if (r[y][x]) p.push([x, y, r[y][x][0], 1]); else if (base[y][x]) tt[x + ',' + y] = 'gone'; } return board({ c: 9, r: 2, p, t: tt }, 10); },
};

// ---------------------------------------------------------------- list / detail
function cwFor(P) {
  const L = $('#lessonList'), W = L.clientWidth || 320, wide = W >= 640;
  const m = $('#lessonOverlay .modal'), mh = m ? m.clientHeight : innerHeight;
  const fw = (wide ? W * .58 : W) - 8, fh = wide ? mh - 270 : Math.min(innerHeight * .44, mh - 330);
  const u = wide ? P.u : P.uN || P.u, v = wide ? P.v : P.vN || P.v;
  return Math.max(14, Math.min(60, Math.floor(Math.min(fw / u, Math.max(120, fh) / (v * 1.1)) - 1)));
}
function openList() {
  page = -1;
  $('#lsListTitle').textContent = t('ru.title'); $('#lsListDesc').textContent = t('ru.desc');
  const L = $('#lessonList'); L.className = 'lesson-list ru-cards';
  L.innerHTML = SECS.map((s, i) => {
    const pages = PAGES.filter(p => p.sec === s), done = pages.every(p => seen[p.id]);
    return `<button class="ru-card" data-ru="${PAGES.findIndex(p => p.sec === s)}"><span class="ru-th">${THUMB[s]()}</span><span class="ru-ct"><b><i>${i + 1}</i>${t('ru.s.' + s)}</b><small>${t('ru.s.' + s + '.d')}</small></span>${done ? '<span class="ru-ok">✓</span>' : ''}</button>`;
  }).join('');
  L.scrollTop = 0;
}
function openPage(i) {
  page = Math.max(0, Math.min(PAGES.length - 1, i));
  const P = PAGES[page], si = SECS.indexOf(P.sec), inSec = PAGES.filter(p => p.sec === P.sec), k = inSec.indexOf(P);
  seen[P.id] = 1; try { localStorage.setItem(STORE, JSON.stringify(seen)); } catch (e) {}
  $('#lsListTitle').textContent = t('ru.s.' + P.sec) + (inSec.length > 1 ? ` ${k + 1}/${inSec.length}` : '');
  $('#lsListDesc').textContent = '';
  const L = $('#lessonList'); L.className = 'lesson-list ru-detail';
  L.innerHTML = '<div class="ru-main"><div class="ru-figs"></div><div class="ru-txt"></div></div>';
  let cw = cwFor(P);
  const body = t('ru.' + P.id + '.b').split('<br>').map(x => `<p>${x}</p>`).join('');
  const les = P.lesson !== undefined && LESSONS && LESSONS.grades[P.lesson] ? `<button class="ru-try" data-try="${P.lesson}">✎ ${t('ru.try', { n: L_(LESSONS.grades[P.lesson].title) })}</button>` : '';
  const dots = PAGES.map((p, j) => `<button data-ru="${j}" class="${j === page ? 'cur' : ''}${seen[p.id] ? ' ok' : ''}${j && PAGES[j - 1].sec !== p.sec ? ' gap' : ''}" aria-label="${j + 1}"></button>`).join('');
  L.innerHTML = `<div class="ru-dots">${dots}<span class="ru-keys">${t('ru.keys')}</span></div><div class="ru-main${P.wide ? ' wide' : ''}"><div class="ru-figs">${P.fig(cw)}</div><div class="ru-txt"><h3>${t('ru.' + P.id + '.t')}</h3><div class="ru-body">${body}</div>${les}</div></div>` +
    `<div class="ru-nav"><button class="ru-list">☰ ${t('ls.list')}</button><button class="ru-prev" ${page ? '' : 'disabled'}>${t('ru.prev')}</button>` +
    (page < PAGES.length - 1 ? `<button class="ru-next go">${t('ru.next')}</button>` : `<button class="ru-tolessons go">${t('ru.toLessons')}</button>`) + `</div>` +
    '';
  L.scrollTop = 0; const m = $('#lessonOverlay .modal'); if (m) m.scrollTop = 0;
  // PC: the page should fit the fixed-size dialog without scrolling — shrink the diagram until it does
  const F = L.querySelector('.ru-figs'), T = L.querySelector('.ru-txt');
  if (m && L.clientWidth >= 640) for (let k = 0; k < 16 && m.scrollHeight > m.clientHeight + 1 && cw > 16 && F.offsetHeight >= T.offsetHeight; k++) { cw -= 2; F.innerHTML = P.fig(cw); }
  void si;
}
const L_ = o => (o && (o[LANG] || o.en || o.ja)) || '';
function active() { const o = $('#lessonOverlay'); return o.classList.contains('show') && !$('#lessonListView').classList.contains('hidden') && lsTab === 'rules'; }

$('#lessonList').addEventListener('click', e => {
  if (lsTab !== 'rules') return;
  const b = e.target.closest('button'); if (!b) return;
  e.stopImmediatePropagation();
  if (b.dataset.ru !== undefined) openPage(+b.dataset.ru);
  else if (b.classList.contains('ru-list')) openList();
  else if (b.classList.contains('ru-prev')) openPage(page - 1);
  else if (b.classList.contains('ru-next')) openPage(page + 1);
  else if (b.classList.contains('ru-tolessons')) { lsTab = 'lesson'; openLessons(); }
  else if (b.dataset.try !== undefined) openIntro(+b.dataset.try);
}, true);
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || !active() || page < 0) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT')) return;
  if (e.key === 'ArrowLeft' && page > 0) { e.preventDefault(); openPage(page - 1); }
  else if (e.key === 'ArrowRight' && page < PAGES.length - 1) { e.preventDefault(); openPage(page + 1); }
});
let rzT = 0;
addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (active() && page >= 0) openPage(page); }, 150); });


// ---------------------------------------------------------------- opening-story diagram: full 9x9 board from an SFEN, marked squares ("47" = file 4, rank 7), pieces in hand
function opDiagram(sfen, marks, cw) {
  const [bd, , hd] = sfen.split(' '), M = { p: FU, l: KY, n: KE, s: GI, b: KA, r: HI, g: KI, k: OU }, ps = [];
  bd.split('/').forEach((row, y) => { let x = 0, pro = 0; for (const ch of row) { if (ch === '+') { pro = 8; continue; } if (/\d/.test(ch)) { x += +ch; continue; } const lc = ch.toLowerCase(); ps.push([x, y, M[lc] + (M[lc] === KI || M[lc] === OU ? 0 : pro), ch === lc ? 1 : 0]); x++; pro = 0; } });
  const tt = {}; (marks || []).forEach(m => { tt[(9 - +m[0]) + ',' + (+m[1] - 1)] = 'sel'; });
  const hands = [[], []];
  if (hd && hd !== '-') { let n = 0; for (const ch of hd) { if (/\d/.test(ch)) { n = n * 10 + +ch; continue; } const lc = ch.toLowerCase(); for (let i = 0; i < (n || 1); i++) hands[ch === lc ? 1 : 0].push(M[lc]); n = 0; } }
  const hw = Math.round(cw * .8), hrow = (c, sym) => `<div class="op-hand"><b>${sym}</b>${hands[c].length ? hands[c].map(tp => `<span class="rh" style="--cw:${hw}px;--ch:${Math.round(hw * 1.1)}px">${pc(tp, c)}</span>`).join('') : '<i>—</i>'}</div>`;
  const files = `<div class="op-files" style="--cw:${cw}px">${[9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => `<span>${n}</span>`).join('')}</div>`;
  return `<div class="op-diag">${hrow(1, '☖')}${files}${board({ c: 9, r: 9, p: ps, t: tt, rk: rankLbl(9) }, cw)}${hrow(0, '☗')}</div>`;
}
window.ShogiRules = { diagram: opDiagram, open: openList, list: openList, page: openPage, count: PAGES.length, pages: PAGES.map(p => p.id) };
})();
