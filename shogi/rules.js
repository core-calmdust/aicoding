'use strict';
// Shogi — "Rules" tab of the lesson dialog: a hands-on step tutorial (shared/ruletour.js, common spec).
// Each step is a short text plus a small board where the player actually moves / captures / promotes / drops / mates,
// using the game's own engine (legal moves) and pieceEl() (follows the chosen piece set). Only what is needed to play;
// tactics, openings and the finer rules (sennichite details, entering king, handicaps) are left to the lessons.
// Texts: RT_TXT (and the piece texts of RU_TXT) in rules-i18n.js, merged into I18N.
(() => {
const DIR = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NW: [-1, -1], NE: [1, -1], SW: [-1, 1], SE: [1, 1] };
let uid = 0;
const TO = 9, NY = 10, NK = 11, NG = 12, UM = 13, RY = 14;
for (const l in RU_TXT) Object.assign(I18N[l] || (I18N[l] = {}), RU_TXT[l]);
for (const l in RT_TXT) Object.assign(I18N[l] || (I18N[l] = {}), RT_TXT[l]);
for (const l in RI_TXT) Object.assign(I18N[l] || (I18N[l] = {}), RI_TXT[l]);

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

// ---------------------------------------------------------------- interactive mini board
const CSS = `
.rt-host{display:flex!important;flex-direction:column}
/* the tutorial fills the dialog: step dots on top, nav at the bottom, one fixed board size (shared/ruletour.js) */
#lessonOverlay .modal:has(#lessonList.rt-host){display:flex;flex-direction:column}
#lessonListView:has(> .rt-host){flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
#lessonListView > #lessonList.rt-host{flex:1 1 auto;min-height:0}
#lessonList.rt-host > .rt{flex:1 1 auto;min-height:0}
#lessonList.rt-host .rt-board{overflow:hidden}
.rtb .rc{cursor:default}
.rtb .rc.can{cursor:pointer}
.rtb .rc.from{background:linear-gradient(170deg,#bcd9ea,#a6c8de);box-shadow:inset 0 0 0 2px #3c7fb0}
.rtb .rc.tg::after{content:"";position:absolute;inset:5%;border:3px solid rgba(29,138,87,.9);border-radius:12%;z-index:3;pointer-events:none}
.rtb .rc.rstar .rl{color:#b8231a;font-size:calc(var(--cw)*.55)}
.rtb .rc > *{pointer-events:none}
.rtb .rc{touch-action:manipulation}
.rtb .rc .pc{pointer-events:none}
.rt-hand{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid var(--line);min-width:calc(var(--cw) + 20px)}
.rt-hand small{font-size:13px;color:var(--muted);white-space:nowrap}
.rt-hand button{position:relative;width:var(--cw);height:var(--ch);border-radius:6px;padding:0}
.rt-hand button.sel{background:rgba(246,220,138,.25);box-shadow:0 0 0 2px rgba(226,194,117,.8)}
.rt-hand button b{position:absolute;right:-4px;bottom:-4px;z-index:3;font:700 11px 'JetBrains Mono',monospace;background:rgba(0,0,0,.75);color:#fff;border-radius:8px;padding:0 4px}
.rt-hand i{font-style:normal;color:var(--dim);font-size:13px}
.rt-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;direction:ltr}
.rt-promo{display:flex;gap:10px;justify-content:center}
.rt-promo button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px;border-radius:10px;border:1px solid rgba(201,169,97,.55);background:rgba(201,169,97,.1);color:var(--text);font:inherit;font-size:13px;cursor:pointer}
.rt-promo button .rh{width:var(--cw);height:var(--ch)}
.rt-pcs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:100%}
.rt-pcs button{position:relative;width:calc(var(--cw)*.9 + 10px);height:calc(var(--cw)*.99 + 10px);border-radius:8px;border:1px solid var(--line);background:rgba(0,0,0,.22);padding:5px;cursor:pointer}
.rt-pcs button .rh{width:100%;height:100%}
.rt-pcs button.seen{border-color:rgba(111,211,160,.6)}
.rt-pcs button.cur{background:rgba(201,169,97,.2);box-shadow:0 0 0 2px rgba(201,169,97,.7)}
.rt-pinfo{font-size:13.5px;line-height:1.65;color:var(--muted);max-width:440px;text-align:left}
.rt-pinfo b{color:var(--accent)}
.rt-pinfo h4{margin:0 0 2px;font-size:14.5px;color:var(--text)}
html[lang=ar] .rt-pinfo{direction:rtl;text-align:right}
.rt-wins{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin:6px 0 12px}
.rt-wins .ru-win{display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:1.5;padding:8px 12px}
.rt-wins .ru-win p{font-size:15px;line-height:1.5}.rt-wins .ru-win p b{font-size:16px}
.rt-wins .ic{flex:none;width:44px;height:44px;display:grid;place-items:center;color:var(--accent)}
.rt-wins .ic svg{width:40px;height:40px}
.rt-draw{font-size:13.5px;line-height:1.7;color:var(--muted)}
html[lang=ar] .rt-wins,html[lang=ar] .rt-draw{direction:rtl}
@media (max-width: 520px){ .rt-wins{grid-template-columns:minmax(0,1fr);gap:6px;margin:2px 0 6px}.rt-wins .ru-win{padding:5px 10px;gap:10px}.rt-wins .ic{width:32px;height:32px}.rt-wins .ic svg{width:28px;height:28px}.rt-wins .ru-win p{font-size:13.5px;line-height:1.4}.rt-wins .ru-win p b{font-size:14.5px}.rt-draw{font-size:13px;line-height:1.55} }
@media (hover: hover) and (pointer: fine) and (min-width: 820px){
  .rt-pinfo{font-size:15.5px}.rt-pinfo h4{font-size:17px}
  .rt-hand small{font-size:15px}
  .rt-promo button{font-size:15px}
}
@media (hover: hover) and (pointer: fine) and (min-width: 820px) and (max-height: 760px){
  .rt h2.rt-title{margin-bottom:4px!important}.rt-steps{margin-bottom:6px!important}.rt-html{margin:4px 0!important}.rt-nav{margin-top:8px!important}.rt-intro{gap:6px;grid-template-columns:repeat(3,minmax(0,1fr))!important}.rt-intro-sec.hist{grid-column:auto!important}.rt-intro-hero img{width:64px!important;height:64px!important}.rt-intro-sec{padding:8px 12px}.rt-intro-sec p{font-size:14px!important;line-height:1.45}.rt-intro-facts span{padding:4px 12px!important}
  .rt-wins{gap:6px 12px;margin:2px 0 8px}.rt-wins .ru-win{padding:4px 10px}.rt-wins .ic{width:36px;height:36px}.rt-wins .ic svg{width:32px;height:32px}
  .rt-wins .ru-win p{font-size:14px}.rt-wins .ru-win p b{font-size:15px}
}
`;
if (!document.getElementById('sgRtCss')) { const st = document.createElement('style'); st.id = 'sgRtCss'; st.textContent = CSS; document.head.appendChild(st); }

const host = () => $('#lessonList');
const wide = () => matchMedia('(hover: hover) and (pointer: fine) and (min-width: 820px)').matches;
// cell size: as large as fits in the board box. The box has one fixed size on every page (shared/ruletour.js), so the
// cells only change with the drawing (board window, hand / promotion buttons / piece text: extraW / extraH)
function cwFit(cols, rows, extraW, extraH, el) {
  if (el && el.clientWidth > 60 && el.clientHeight > 60) {
    const byW = (el.clientWidth - 8 - (extraW || 0)) / cols, byH = (el.clientHeight - 8 - (extraH || 0)) / (rows * 1.1 + .1);
    return Math.max(18, Math.min(84, Math.floor(Math.min(byW, byH) * (el._k || 1)) - 1));
  }
  const L = host(), W = (L && L.clientWidth) || 320;
  return Math.max(24, Math.min(56, Math.floor((W - 8 - (extraW || 0)) / cols) - 1));
}
// if the drawing (board + hand / promotion buttons / piece text) still overflows the box, shrink the cells once or
// twice (el._k) — the box keeps its size, so nothing else on the page moves
function overflowFix(el) {
  if (!el.clientHeight) return false;
  const over = Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth);
  if (over <= 2 || (el._n = (el._n || 0) + 1) > 3) { el._n = 0; return false; }
  el._k = (el._k || 1) * Math.max(.6, Math.min((el.clientHeight - 6) / el.scrollHeight, (el.clientWidth - 6) / el.scrollWidth));
  return true;
}
const sqXY = s => [s % 9, (s / 9) | 0];
const pcHtml = code => { const f0 = flip; flip = false; try { return pieceEl(code).outerHTML; } finally { flip = f0; } };
// o: { sfen, v: [x0, y0, w, h] window of the 9x9 board, star: [squares], zone, bad: {sq: 1}, x: {sq: 1}, hand: true,
//      onMove(m, pos, api) → true if handled, onTap(sq) for taps on non-target squares while a hand piece is selected }
function play(api, o) {
  const pos = new E.Position(); pos.setSfen(o.sfen);
  const [x0, y0, w, h] = o.v;
  let sel = null, promo = null, locked = false;
  const legal = () => pos.legalMoves(true);
  const targets = () => !sel ? [] : legal().filter(m => sel.hand ? E.isDrop(m) && E.dropType(m) === sel.hand : !E.isDrop(m) && E.mFrom(m) === sel.sq);
  function draw() {
    if (!api.alive()) return;
    const cw = cwFit(w, h, o.hand ? 110 : 0, o.zone ? 84 : 0, api.board), ch = Math.round(cw * 1.1), tg = targets(), tset = new Set(tg.map(E.mTo));
    let cells = '';
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const s = y * 9 + x, p = pos.board[s], cls = ['rc'];
      if (o.zone && y < 3) cls.push('zone');
      if ((o.bad && o.bad[s]) || (s === pos.king[0] && pos.side === 0 && pos.inCheck())) cls.push('bad');
      if (sel && sel.sq === s) cls.push('from');
      if (tset.has(s)) cls.push(p ? 'tg' : 'tgd');
      if ((p && E.colorOf(p) === 0) || tset.has(s) || (sel && sel.hand && !p)) cls.push('can');
      if (o.star && o.star.includes(s) && !p) cls.push('rstar');   // not 'star': that is the main board's dot marker (position:absolute)
      let inner = p ? pcHtml(p) : '';
      if (tset.has(s) && !p) inner += '<i class="rd"></i>';
      if (o.star && o.star.includes(s) && !p) inner += '<b class="rl">★</b>';
      if (o.x && o.x[s] && !p) inner += '<i class="rx"></i>';
      cells += `<div class="${cls.join(' ')}" data-s="${s}">${inner}</div>`;
    }
    const bd = `<div class="rb rtb" style="--cw:${cw}px;--ch:${ch}px;--c:${w};--r:${h}">${cells}</div>`;
    let hd = '';
    if (o.hand) {
      const list = [HI, KA, KI, GI, KE, KY, FU].filter(tp => pos.hand[tp]);
      hd = `<div class="rt-hand" style="--cw:${cw}px;--ch:${ch}px"><small>${t('ru.hand')}</small>${list.length ? list.map(tp => `<button type="button" data-h="${tp}" class="${sel && sel.hand === tp ? 'sel' : ''}"><span class="rh" style="--cw:${cw}px;--ch:${ch}px;display:block">${pcHtml(tp)}</span>${pos.hand[tp] > 1 ? `<b>${pos.hand[tp]}</b>` : ''}</button>`).join('') : '<i>—</i>'}</div>`;
    }
    const pr = promo ? `<div class="rt-promo" style="--cw:${cw}px;--ch:${ch}px">${promo.map((m, i) => `<button type="button" data-pr="${i}"><span class="rh" style="display:block">${pcHtml(pos.board[E.mFrom(m)] + (E.mPromo(m) ? 8 : 0))}</span>${t(E.mPromo(m) ? 'promote.yes' : 'promote.no')}</button>`).join('')}</div>` : '';
    api.board.innerHTML = `<div class="rt-wrap"><div class="ru-row">${hd}${bd}</div>${pr}</div>`;
    if (overflowFix(api.board)) draw();
  }
  function doMove(m) {
    sel = null; promo = null;
    if (o.onMove && o.onMove(m, pos, api, ctl) === false) { draw(); return; }
    pos.doMove(m); pos.sp = 0; playPiece(false); draw();
    if (o.after) o.after(m, pos, api, ctl);
  }
  api.board.onclick = e => {
    if (locked || !api.alive()) return;
    const pb = e.target.closest('[data-pr]'); if (pb && promo) { doMove(promo[+pb.dataset.pr]); return; }
    const hb = e.target.closest('[data-h]');
    if (hb) { const tp = +hb.dataset.h; sel = sel && sel.hand === tp ? null : { hand: tp }; promo = null; draw(); return; }
    const c = e.target.closest('[data-s]'); if (!c) return;
    const s = +c.dataset.s, p = pos.board[s];
    if (sel) {
      const ms = targets().filter(m => E.mTo(m) === s);
      if (ms.length === 2) { promo = ms.sort((a, b) => E.mPromo(b) - E.mPromo(a)); draw(); return; }
      if (ms.length === 1) { doMove(ms[0]); return; }
      if (sel.hand && !p && o.onTap) { o.onTap(s, sel.hand, pos, api, ctl); return; }
    }
    promo = null;
    sel = p && E.colorOf(p) === 0 ? (sel && sel.sq === s ? null : { sq: s }) : null; draw();
  };
  const ctl = { pos, draw, lock(v) { locked = v !== false; }, sel(v) { sel = v; draw(); } };
  draw();
  return ctl;
}
const sqAt = (file, rank) => (rank - 1) * 9 + (9 - file);

// ---------------------------------------------------------------- the steps
let pcSeen = new Set();
const PIECES = [[OU, 'ou'], [HI, 'hi'], [KA, 'ka'], [KI, 'ki'], [GI, 'gi'], [KE, 'ke'], [KY, 'ky'], [FU, 'fu']];
const winIcons = () => {
  const sz = 40;
  const ic = [
    `<div class="rh" style="--cw:${sz}px;--ch:${Math.round(sz * 1.1)}px">${pc(OU, 1)}<i class="rx"></i></div>`,
    `<svg viewBox="0 0 48 48"><path d="M10 40V8" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M12 9c8-4 13 4 24 0v17c-11 4-16-4-24 0z" fill="#efe5d2"/></svg>`,
    `<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="16" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M24 26V16M24 26l7 5" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M19 5h10" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>`,
    `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="#ff7a6a" stroke-width="3.6"/><path d="M16 16L32 32M32 16L16 32" stroke="#ff7a6a" stroke-width="3.6" stroke-linecap="round"/></svg>`,
  ];
  return `<div class="rt-wins">${ic.map((s, i) => `<div class="ru-win"><div class="ic">${s}</div><p>${t('ru.win.' + (i + 1)).replace(/<\/b>\s*[:：]\s*/, '</b>')}</p></div>`).join('')}</div><p class="rt-draw">${t('rt.end.draw')}</p>`;
};
const PAGES = [
  { id: 'intro', title: () => t('ri.t'), body: () => '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/shogi.webp', origin: t('ri.origin'), players: t('ri.players'), time: t('ri.time'), history: t('ri.hist'), win: t('ri.win'), culture: t('ri.cult') }) },
  { id: 'move', title: () => t('rt.move.t'), body: () => `<p>${t('rt.move.b')}</p>`, task: () => t('rt.move.task'),
    setup(api) {
      const star = sqAt(5, 4);
      play(api, { sfen: '9/9/9/9/9/9/9/4R4/9 b - 1', v: [2, 3, 5, 5], star: [star],
        onMove(m) { if (E.mTo(m) !== star) { api.ng(t('rt.move.ng'), { delay: 1600 }); return true; } },
        after(m, pos, a, c) { if (E.mTo(m) === star) { c.lock(); api.ok(t('rt.move.ok')); } } });
    } },
  { id: 'pieces', title: () => t('rt.pc.t'), body: () => `<p>${t('rt.pc.b')}</p>`, task: () => t('rt.pc.task', { k: pcSeen.size }),
    setup(api) {
      const seen = pcSeen = new Set(); let cur = -1;
      const draw = () => {
        if (!api.alive()) return;
        const cw = cwFit(5, 5, 0, 290, api.board), Wd = (host() && host().clientWidth) || 320, sc = Math.max(22, Math.min(40, Math.floor((Wd - 8) / 8 - 18)));
        const P0 = cur >= 0 ? PIECES[cur] : null;
        const bd = P0 ? board(moves(P0[0], 5), cw) : board({ c: 5, r: 5, p: [] }, cw);
        const info = P0 ? `<div class="rt-pinfo"><h4>${t('ru.' + P0[1] + '.t')}</h4>${t('ru.' + P0[1] + '.b')}</div>` : '';
        api.board.innerHTML = `<div class="rt-wrap"><div class="rt-pcs" style="--cw:${sc}px">${PIECES.map(([tp], i) => `<button type="button" data-pi="${i}" class="${seen.has(i) ? 'seen' : ''} ${i === cur ? 'cur' : ''}"><span class="rh" style="--cw:${sc}px;--ch:${Math.round(sc * 1.1)}px;display:block">${pc(tp, 0)}</span></button>`).join('')}</div>${bd}${info}</div>`;
        if (overflowFix(api.board)) draw();
      };
      api.board.onclick = e => {
        const b = e.target.closest('[data-pi]'); if (!b || !api.alive()) return;
        cur = +b.dataset.pi; seen.add(cur); playPiece(false); draw();
        if (!api.state.done) { if (seen.size >= PIECES.length) api.ok(t('rt.pc.ok')); else api.say(''); }
      };
      draw();
    } },
  { id: 'capture', title: () => t('rt.cap.t'), body: () => `<p>${t('rt.cap.b')}</p>`, task: () => t('rt.cap.task'),
    setup(api) {
      const tgt = sqAt(4, 6);
      play(api, { sfen: '9/9/9/3g5/9/5b3/4S4/9/9 b - 1', v: [2, 3, 5, 5], hand: true,
        onMove(m) { if (E.mTo(m) !== tgt) { api.ng(t('rt.cap.ng'), { delay: 1600 }); return true; } },
        after(m, pos, a, c) { if (E.mTo(m) === tgt) { c.lock(); api.ok(t('rt.cap.ok')); } } });
    } },
  { id: 'promote', title: () => t('rt.pro.t'), body: () => `<p>${t('rt.pro.b')}</p>`, task: () => t('rt.pro.task'),
    setup(api) {
      play(api, { sfen: '5k3/9/9/4P4/9/9/9/9/9 b - 1', v: [2, 0, 5, 5], zone: true,
        onMove(m) { if (!E.mPromo(m)) { api.ng(t('rt.pro.ng'), { delay: 1800 }); return true; } },
        after(m, pos, a, c) { if (E.mPromo(m)) { c.lock(); api.ok(t('rt.pro.ok')); } } });
    } },
  { id: 'drop', title: () => t('rt.drop.t'), body: () => `<p>${t('rt.drop.b')}</p>`, task: () => t('rt.drop.task'),
    setup(api) {
      const star = sqAt(6, 5);
      play(api, { sfen: '9/9/9/2p1s4/9/4P4/9/9/9 b G 1', v: [2, 2, 5, 5], hand: true, star: [star],
        onMove(m) { if (!E.isDrop(m) || E.mTo(m) !== star) { api.ng(t('rt.drop.ng'), { delay: 1600 }); return true; } },
        after(m, pos, a, c) { if (E.isDrop(m) && E.mTo(m) === star) { c.lock(); api.ok(t('rt.drop.ok')); } } });
    } },
  { id: 'mate', title: () => t('rt.mate.t'), body: () => `<p>${t('rt.mate.b')}</p>`, task: () => t('rt.mate.task'),
    setup(api) {
      play(api, { sfen: '4k4/9/4P4/9/9/9/9/9/9 b G 1', v: [2, 0, 5, 4], hand: true,
        after(m, pos, a, c) {
          const chk = pos.inCheck(), mate = chk && !pos.legalMoves(false).length;
          c.lock();
          if (mate) api.ok(t('rt.mate.ok')); else api.ng(t(chk ? 'rt.mate.ng' : 'rt.mate.nochk'), { delay: 2000 });
        } });
    } },
  { id: 'evade', title: () => t('rt.evade.t'), body: () => `<p>${t('rt.evade.b')}</p>`, task: () => t('rt.evade.task'),
    setup(api) {
      play(api, { sfen: '9/9/9/9/4r4/5S3/9/3GK4/9 b P 1', v: [2, 3, 5, 6], hand: true,
        onMove(m, pos) {
          const how = E.isDrop(m) ? 'block' : E.typeOf(pos.board[E.mFrom(m)]) === OU ? 'flee' : pos.board[E.mTo(m)] ? 'cap' : 'block';
          api._how = how;
        },
        after(m, pos, a, c) { c.lock(); api.ok(t('rt.evade.ok', { how: t('rt.how.' + api._how) })); } });
    } },
  { id: 'foul', title: () => t('rt.foul.t'), body: () => `<p>${t('rt.foul.b')}</p>`, task: () => t('rt.foul.task'),
    setup(api) {
      const bad = {}, x = {};
      for (let y = 0; y < 5; y++) { bad[y * 9 + 2] = 1; bad[y * 9 + 4] = 1; }
      for (let c = 2; c < 7; c++) x[c] = 1;
      const ctl = play(api, { sfen: '9/5p3/9/9/2P1P4/9/9/9/9 b P 1', v: [2, 0, 5, 5], hand: true, bad, x,
        onMove(m) { if (!E.isDrop(m)) { api.say(esc(t('rt.foul.task')), ''); return true; } },
        onTap(s) { const col = s % 9, row = (s / 9) | 0; api.ng(t(col === 2 || col === 4 ? 'rt.foul.nifu' : row === 0 ? 'rt.foul.dead' : 'rt.foul.nifu'), { reset: false }); },
        after(m, pos, a, c) { if (E.isDrop(m)) { c.lock(); api.ok(t('rt.foul.ok')); } } });
      ctl.sel({ hand: FU });
    } },
  { id: 'end', title: () => t('rt.end.t'), body: () => `<p>${t('rt.end.b')}</p>`, html: () => winIcons() },
];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let tour = null;
function ensure() {
  if (tour || !window.RuleTour) return tour;
  tour = RuleTour.create({
    mount: '#lessonList', store: 'shogi-rules-tour-v1', lang: () => LANG,
    close: () => hideOverlay('#lessonOverlay'),
    play: () => { hideOverlay('#lessonOverlay'); if (lesson) exitLesson(true); openNewDialog(); },
    lessons: () => { lsTab = 'lesson'; openLessons(); },
    sound: k => { if (k === 'ok') playChime(true); },
    pages: PAGES,
  });
  return tour;
}
function openTour(i) {
  $('#lsListTitle').textContent = ''; $('#lsListDesc').textContent = '';
  const L = host(); L.className = 'rt-host';
  const T = ensure(); if (!T) return;
  T.open(typeof i === 'number' ? i : T.page || 0);
}
const active = () => $('#lessonOverlay').classList.contains('show') && !$('#lessonListView').classList.contains('hidden') && lsTab === 'rules' && tour && tour.visible();
let rzT = 0;
addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (active()) tour.render(); }, 150); });
$('#langSel').addEventListener('change', () => { if (active()) setTimeout(() => tour.render(), 0); });

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
window.ShogiRules = { diagram: opDiagram, open: openTour, list: openTour, page: openTour, get count() { return PAGES.length; }, pages: PAGES.map(p => p.id), tour: () => ensure(), stop() { if (tour) tour.stop(); } };
})();
