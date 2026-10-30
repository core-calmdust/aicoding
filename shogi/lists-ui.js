/*
 * Shogi lesson / opening / tsume lists (same layout as Gomoku / Chess / Reversi):
 * category tabs (icon + name + progress) → banner card of the chosen category (description, n/N, bar) →
 * grid of item cards (mini board on the left; number, state, name, gist, 2–3 line description, progress bar on the right).
 * Also: SVG mini boards from an SFEN, and position thumbnails for the tsume tiles.
 * Copyright 2026 core-calmdust
 */
(function () {
'use strict';
const KJ = { p: '歩', l: '香', n: '桂', s: '銀', g: '金', b: '角', r: '飛', k: '玉', '+p': 'と', '+l': '杏', '+n': '圭', '+s': '全', '+b': '馬', '+r': '龍' };
// parse the board part of an SFEN → [{f, r, t, w}] (file 1-9, rank 1-9, type key, white?)
function parse(sfen) {
  const out = []; const bd = String(sfen || '').split(' ')[0].split('/');
  bd.forEach((row, y) => { let x = 0, pro = ''; for (const ch of row) { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { x += +ch; continue; } const lc = ch.toLowerCase(); out.push({ f: 9 - x, r: y + 1, t: pro + lc, w: ch === lc }); x++; pro = ''; } });
  return out;
}
const hand0 = sfen => { const h = String(sfen || '').split(' ')[2] || '-'; const o = [[], []]; if (h === '-') return o; let n = 0; for (const ch of h) { if (/\d/.test(ch)) { n = n * 10 + +ch; continue; } const lc = ch.toLowerCase(); o[ch === lc ? 1 : 0].push([KJ[lc], n || 1]); n = 0; } return o; };
// ---- crop: which part of the board a mini board shows (a 9x9 board shrunk to ~96px squashes the pieces)
// squares are "fr" strings (file 1-9, rank 1-9) like the story marks ("28" = 2八)
const sqOf = p => '' + p.f + p.r;
const usiSq = s => /^[1-9][a-i]$/.test(s || '') ? s[0] + (s.charCodeAt(1) - 96) : null;
const moveSqs = u => { u = String(u || ''); return (u[1] === '*' ? [usiSq(u.slice(2, 4))] : [usiSq(u.slice(0, 2)), usiSq(u.slice(2, 4))]).filter(Boolean); };
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const kingOf = (P, w) => { const k = P.find(p => p.t === 'k' && p.w === w); return k ? sqOf(k) : null; };
const near = (s, d) => { const o = []; for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { const f = +s[0] + i, r = +s[1] + j; if (f >= 1 && f <= 9 && r >= 1 && r <= 9) o.push('' + f + r); } return o; };
// bounding box of the squares → at least 4x4, snapped to an edge one square away, square or one square longer
function shape(S) {
  if (!S.length) return [1, 9, 1, 9];
  const fs = S.map(s => +s[0]), rs = S.map(s => +s[1]);
  let f0 = Math.min(...fs), f1 = Math.max(...fs), r0 = Math.min(...rs), r1 = Math.max(...rs);
  const grow = (a, b, n) => { while (b - a + 1 < n) { if (b < 9 && (a <= 1 || 9 - b <= a - 1)) b++; else a--; } return [a, b]; };
  const snap = () => { if (f0 === 2) f0 = 1; if (f1 === 8) f1 = 9; if (r0 === 2) r0 = 1; if (r1 === 8) r1 = 9; };
  [f0, f1] = grow(f0, f1, 4); [r0, r1] = grow(r0, r1, 4); snap();
  const W = f1 - f0 + 1, H = r1 - r0 + 1;
  if (W < H - 1) [f0, f1] = grow(f0, f1, H - 1); else if (H < W - 1) [r0, r1] = grow(r0, r1, W - 1);
  snap();
  return [f0, f1, r0, r1];
}
// o.crop: [c0, r0, c1, r1] (files / ranks, any order) | 'tsume' ('auto') | 'castle' ('marks') | 'diff' (o.from = start SFEN) | 'lesson' (o.move = USI moves) | falsy = whole board
// o.side: 'b' | 'w' — whose castle / opening; o.mate: lesson problem is a mate (the defender's king is the focus)
function cropOf(P, sfen, o) {
  const c = o.crop;
  if (Array.isArray(c) && c.length === 4) { const [a, b, x, y] = c.map(Number); return [Math.max(1, Math.min(a, x)), Math.min(9, Math.max(a, x)), Math.max(1, Math.min(b, y)), Math.min(9, Math.max(b, y))]; }
  if (!c || !P.length) return [1, 9, 1, 9];
  const gote = (sfen.split(' ')[1] || 'b') === 'w', S = [], add = a => a && S.push(...a);
  if (c === 'tsume' || c === 'auto') {   // the defender's king and every attacking piece on the board, 1 square around
    const k = kingOf(P, !gote); if (k) add(near(k, 1));
    let A = P.filter(p => p.w === gote);
    // a position from a real game (many attackers): only the attackers near the king (never the solution squares — that would hint at the answer)
    if (k && A.length > 10) A = A.filter(p => p.t !== 'k' && dist(sqOf(p), k) <= 3);
    A.forEach(p => add(near(sqOf(p), 1)));
  } else if (c === 'castle' || c === 'marks') {   // the king, the golds and silvers next to it, the castle squares
    const w = o.side === 'w', k = kingOf(P, w);
    if (k) { add(near(k, 1)); P.filter(p => p.w === w && /^\+?[gs]$|^\+[pln]$/.test(p.t) && dist(sqOf(p), k) <= 2).forEach(p => S.push(sqOf(p))); }
    add((o.marks || []).map(String));
  } else if (c === 'diff') {   // squares that changed from the start position, the castle squares and the side's king
    const A = new Map(parse(o.from || 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1').map(p => [sqOf(p), p.t + p.w])), B = new Map(P.map(p => [sqOf(p), p.t + p.w]));
    // only the side's own pieces other than pawns (the opponent's moves and the pawn pushes on both wings would cover the whole board);
    // with o.both (handicap) both sides, so the missing pieces count too
    const w = o.side === 'w' ? 'true' : 'false', own = v => !!v && !/^p/.test(v) && (o.both || v.endsWith(w));
    for (const k of new Set([...A.keys(), ...B.keys()])) if (A.get(k) !== B.get(k) && (own(A.get(k)) || own(B.get(k)))) S.push(k);
    add((o.marks || []).map(String));
    const k = kingOf(P, o.side === 'w'); if (k) add(near(k, 1));
  } else if (c === 'lesson') {   // the answer's squares and the king it is about
    const mv = [].concat(o.move || []).flatMap(moveSqs); if (!mv.length) return [1, 9, 1, 9];
    const to = moveSqs([].concat(o.move)[0]).slice(-1)[0];
    add(mv); add(near(to, 1));
    const ks = [kingOf(P, !gote), kingOf(P, gote)].filter(Boolean), k = o.mate ? ks[0] : ks.sort((a, b) => dist(a, to) - dist(b, to))[0];
    if (k && (o.mate || dist(k, to) <= 3)) add(near(k, 1));
    add((o.marks || []).map(String));
  } else return [1, 9, 1, 9];
  return shape(S);
}
// hand-tuned crops where the automatic one is not right: 'lesson:<grade id>' | 'open:<set id>' | 'tsume:<problem id>' → [c0, r0, c1, r1]
// (a data entry can also carry its own crop: lesson grade / problem .crop, opening set .crop, tsume problem .crop)
const CROP = {};
const cropFor = (key, data, dflt) => CROP[key] || (data && Array.isArray(data.crop) ? data.crop : null) || dflt;
let UID = 0;
// mini board SVG in a square 100x100 frame (the part shown is centred).
// o: {crop (see cropOf), marks:["27",...], last:"27", flip, hands: true | 'b' (only the attacker's: tsume)}
// A side on the board's real edge gets a thick rim; a cut side fades out so the board visibly goes on.
function board(sfen, o) {
  o = o || {};
  sfen = String(sfen || '');
  const P = parse(sfen), [f0, f1, r0, r1] = cropOf(P, sfen, o);
  const W = f1 - f0 + 1, H = r1 - r0 + 1, fl = !!o.flip, id = 'shm' + (++UID);
  const eL = fl ? f0 === 1 : f1 === 9, eR = fl ? f1 === 9 : f0 === 1, eT = fl ? r1 === 9 : r0 === 1, eB = fl ? r0 === 1 : r1 === 9;
  const RIM = .16, FADE = .6, xL = eL ? RIM : FADE, xR = eR ? RIM : FADE, yT = eT ? RIM : FADE, yB = eB ? RIM : FADE;
  const hd = o.hands ? hand0(sfen) : [[], []], txt = c => hd[c].map(([k, n]) => k + (n > 1 ? n : '')).join('');
  const tTop = o.hands && o.hands !== 'b' ? txt(fl ? 0 : 1) : '', tBot = o.hands ? txt(fl ? 1 : 0) : '', HR = .82;
  const C = Math.min(100 / (W + xL + xR), 100 / (H + yT + yB + ((tTop ? 1 : 0) + (tBot ? 1 : 0)) * HR));
  const bw = (W + xL + xR) * C, bh = (H + yT + yB) * C, th = bh + ((tTop ? 1 : 0) + (tBot ? 1 : 0)) * HR * C;
  const ox = (100 - bw) / 2, oy = (100 - th) / 2 + (tTop ? HR * C : 0), gx = ox + xL * C, gy = oy + yT * C;
  const n = v => +v.toFixed(2), X = f => gx + (fl ? f - f0 : f1 - f) * C, Y = r => gy + (fl ? r1 - r : r - r0) * C;
  const mk = new Set((o.marks || []).map(String)), inC = (f, r) => f >= f0 && f <= f1 && r >= r0 && r <= r1;
  const stops = (a, b, len, s0, s1) => `<stop offset="0" stop-color="#fff" stop-opacity="${s0 ? 1 : 0}"/><stop offset="${n(a / len)}" stop-color="#fff"/><stop offset="${n(1 - b / len)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${s1 ? 1 : 0}"/>`;
  let s = `<svg class="sh-mini" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>` +
    `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${n(ox)}" y1="0" x2="${n(ox + bw)}" y2="0">${stops(xL * C * .9, xR * C * .9, bw, eL, eR)}</linearGradient>` +
    `<linearGradient id="${id}v" gradientUnits="userSpaceOnUse" x1="0" y1="${n(oy)}" x2="0" y2="${n(oy + bh)}">${stops(yT * C * .9, yB * C * .9, bh, eT, eB)}</linearGradient>` +
    `<mask id="${id}H"><rect x="0" y="0" width="100" height="100" fill="url(#${id}h)"/></mask><mask id="${id}V"><rect x="0" y="0" width="100" height="100" fill="url(#${id}v)"/></mask></defs>`;
  s += `<g mask="url(#${id}V)"><g mask="url(#${id}H)"><rect x="${n(ox)}" y="${n(oy)}" width="${n(bw)}" height="${n(bh)}" rx="${eL && eR && eT && eB ? n(C * .18) : 0}" fill="#d9b46a"/>`;
  for (const m of mk) { const f = +m[0], r = +m[1]; if (inC(f, r)) s += `<rect x="${n(X(f))}" y="${n(Y(r))}" width="${n(C)}" height="${n(C)}" fill="#d4542a" fill-opacity=".85"/>`; }
  if (o.last) { const f = +o.last[0], r = +o.last[1]; if (inC(f, r)) s += `<rect x="${n(X(f))}" y="${n(Y(r))}" width="${n(C)}" height="${n(C)}" fill="#f2d27a" fill-opacity=".8"/>`; }
  // grid: lines run on into the fade on a cut side and stop at the rim on a real edge
  const ya = eT ? gy : oy, yb = eB ? gy + H * C : oy + bh, xa = eL ? gx : ox, xb = eR ? gx + W * C : ox + bw;
  let ln = '';
  for (let i = eL ? 1 : 0; i <= (eR ? W - 1 : W); i++) ln += `M${n(gx + i * C)} ${n(ya)}V${n(yb)}`;
  for (let j = eT ? 1 : 0; j <= (eB ? H - 1 : H); j++) ln += `M${n(xa)} ${n(gy + j * C)}H${n(xb)}`;
  s += `<path d="${ln}" stroke="#6b4a1c" stroke-width="${n(Math.max(.5, C * .045))}" fill="none"/>`;
  // the board's real edges: a thick frame line
  let ed = '';
  if (eL) ed += `M${n(gx)} ${n(ya)}V${n(yb)}`; if (eR) ed += `M${n(gx + W * C)} ${n(ya)}V${n(yb)}`;
  if (eT) ed += `M${n(xa)} ${n(gy)}H${n(xb)}`; if (eB) ed += `M${n(xa)} ${n(gy + H * C)}H${n(xb)}`;
  if (ed) s += `<path d="${ed}" stroke="#5a3a12" stroke-width="${n(Math.max(1.1, C * .13))}" stroke-linecap="square" fill="none"/>`;
  for (const p of P) {
    if (!inC(p.f, p.r)) continue;
    const cx = X(p.f) + C / 2, cy = Y(p.r) + C / 2, pr = p.t[0] === '+';
    const g = `<path d="M0 -4.6L3.3 -3.1L4 4.4H-4L-3.3 -3.1Z" fill="#f6e3b4" stroke="#7a5524" stroke-width=".35"/><text y="2.55" font-size="6.4" text-anchor="middle" font-family="'Shippori Mincho B1','Noto Serif JP',serif" font-weight="700" fill="${pr ? '#b3261e' : '#2a1a0a'}">${p.t === 'k' && p.w ? '王' : KJ[p.t]}</text>`;
    s += `<g transform="translate(${n(cx)} ${n(cy)})${p.w !== fl ? ' rotate(180)' : ''} scale(${n(C / 10 * (mk.size ? .86 : 1))})">${g}</g>`;
  }
  s += '</g></g>';
  // pieces in hand: one line above (the side at the top) / below (the side at the bottom), as large as the cells allow
  const hrow = (c, t, y, end) => {
    if (!t) return '';
    const w = [...t].reduce((a, ch) => a + (/\d/.test(ch) ? .62 : 1), 1.05), fs = Math.min(C * .66, 10.5, bw / w);
    return `<text x="${n(end ? ox + bw : ox)}" y="${n(y)}" font-size="${n(fs)}" text-anchor="${end ? 'end' : 'start'}" font-family="'Shippori Mincho B1',serif" font-weight="700" fill="#e9d9b5">${c ? '☖' : '☗'}${t}</text>`;
  };
  s += hrow(fl ? 0 : 1, tTop, oy - HR * C * .26, false) + hrow(fl ? 1 : 0, tBot, oy + bh + HR * C * .8, true);
  return s + '</svg>';
}
const plain = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const bar = (p, ok) => `<span class="lx-bar${ok ? ' ok' : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p || 0)) * 100)}%"></i></span>`;
// o = {attr, cls, board, no, st:{text, cls}, title, small, sub, desc, moves, badge, p (0..1), done}
function card(o) {
  return `<button class="lesson-item lx-card${o.cls ? ' ' + o.cls : ''}${o.done ? ' done' : ''}${o.wide ? ' wide' : ''}" ${o.attr}><span class="lx-th">${o.board}</span><span class="lx-tx">` +
    `<span class="lx-top"><span class="lx-no">${o.no || ''}</span>${o.badge || ''}<span class="lx-st ${(o.st && o.st.cls) || ''}">${(o.st && o.st.text) || ''}</span></span>` +
    `<b class="lx-t">${o.title}${o.small ? `<small>${o.small}</small>` : ''}</b>${o.sub ? `<span class="lx-sub">${o.sub}</span>` : ''}` +
    `${o.desc ? `<span class="lx-desc">${o.desc}</span>` : ''}${o.moves ? `<span class="lx-mv"><bdi dir="ltr">${o.moves}</bdi></span>` : ''}${bar(o.p, o.done)}</span></button>`;
}
// icon chip: one shogi piece (kanji on a pentagon)
const icon = k => `<svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0 -5.4L3.9 -3.6L4.7 5.2H-4.7L-3.9 -3.6Z" fill="#f6e3b4" stroke="#7a5524" stroke-width=".4"/><text y="2.9" font-size="6.6" text-anchor="middle" font-family="'Shippori Mincho B1','Noto Serif JP',serif" font-weight="700" fill="#2a1a0a">${k}</text></svg>`;
const STORE = 'shogi-kaya-lxtab';
function tab(kind, v) { try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); if (v === undefined) return o[kind]; o[kind] = v; localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
// cats: [{key, icon, tab, name, desc, n?, m?, items:[{html, done}] | null (still loading)}]; opt: {cur, top, foot, onTab, prog(n,m)}
function render(kind, cats, opt) {
  opt = opt || {};
  style();
  let cur = opt.cur || tab(kind);
  if (!cats.some(c => c.key === cur)) cur = (cats.find(c => c.items && c.items.some(x => !x.done)) || cats[0]).key;
  const list = document.getElementById('lessonList'); list.classList.add('lx-on');
  const c = cats.find(x => x.key === cur), cnt = x => x.items ? [x.items.filter(y => y.done).length, x.items.length] : [x.n || 0, x.m || 0];
  const [n, m] = cnt(c);
  list.innerHTML = `<div class="lx">` + (opt.top || '') +
    (cats.length > 1 ? `<div class="lx-tabs${cats.length > 5 ? ' many' : ''}" role="tablist">${cats.map(x => { const [k, M] = cnt(x); return `<button role="tab" data-lx="${x.key}" class="${x.key === cur ? 'sel' : ''}" aria-selected="${x.key === cur}"><span class="ic">${x.icon}</span><span class="nm"><bdi>${x.tab}</bdi></span><span class="ct${M && k === M ? ' ok' : ''}">${M ? k + '/' + M : ''}</span></button>`; }).join('')}</div>` : '') +
    `<div class="lx-banner"><span class="ic">${c.icon}</span><span class="tx"><b>${c.name}</b><small>${c.desc}</small></span><span class="pg"><small>${opt.prog ? opt.prog(n, m) : n + ' / ' + m}</small>${bar(m ? n / m : 0, true)}</span></div>` +
    `<div class="lx-grid">${c.items ? c.items.map(x => x.html).join('') : `<p class="lx-wait">${opt.wait || '…'}</p>`}</div>${opt.foot || ''}</div>`;
  list.querySelectorAll('[data-lx]').forEach(b => b.onclick = e => { e.stopPropagation(); tab(kind, b.dataset.lx); if (opt.onTab) opt.onTab(b.dataset.lx); else render(kind, cats, opt); list.scrollTop = 0; });
  const sb = list.querySelector('.lx-tabs .sel'); if (sb) { const t = sb.parentNode; if (t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, sb.offsetLeft - (t.clientWidth - sb.offsetWidth) / 2); }
  return cur;
}
// tsume grid: put the problem position on each tile (cropped around the pieces, hands shown)
function tsThumbs(grid, probs) {
  style();
  if (!grid) return;
  grid.querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = probs[+el.dataset.j]; if (!P || !P.sfen || el.querySelector('.th')) return; el.insertAdjacentHTML('afterbegin', `<span class="th">${board(P.sfen, { crop: cropFor('tsume:' + P.id, P, 'tsume'), move: P.sol })}</span>`); el.classList.add('hasth'); });
}
const CSS = `
#lessonList.lx-on{display:block}
.lx-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin:0 0 12px;overflow-x:auto;scrollbar-width:none}
.lx-tabs::-webkit-scrollbar{display:none}
.lx-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 8px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--muted);font-size:13.5px;min-width:0;transition:border-color .2s,color .2s;-webkit-tap-highlight-color:transparent}
.lx-tabs button .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lx-tabs button .ic{flex:none;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:rgba(201,169,97,.14);overflow:hidden;padding:1px}
.lx-tabs button .ic > svg, .lx-banner .ic > svg{display:block;width:100%;height:100%}
.lx-tabs button .ct{flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)}.lx-tabs button .ct.ok{color:#8fe3b8}
.lx-tabs button:hover{border-color:var(--brass2);color:var(--text)}
.lx-tabs button.sel{color:var(--text);border-color:var(--brass);background:linear-gradient(180deg,rgba(201,169,97,.2),rgba(201,169,97,.06));box-shadow:inset 0 -2px 0 var(--brass)}
.lx-banner{display:flex;align-items:center;gap:14px;padding:12px 16px;margin:0 0 12px;border-radius:14px;border:1px solid rgba(201,169,97,.28);background:linear-gradient(120deg,rgba(201,169,97,.14),rgba(0,0,0,.18) 70%)}
.lx-banner .ic{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;padding:4px;background:linear-gradient(140deg,#e9cf8e,#a8873f)}
.lx-banner .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.lx-banner .tx b{font-family:'Shippori Mincho B1',serif;font-size:18px;color:var(--brass)}
.lx-banner .tx small{font-size:13px;color:var(--muted);line-height:1.6}
.lx-banner .pg{flex:none;width:120px;display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--muted);text-align:end}
.lx-bar{display:block;height:5px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.lx-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--brass2),var(--brass))}
.lx-bar.ok i{background:linear-gradient(90deg,#2f7d5a,#6fd3a0)}
.lx-grid{display:grid;gap:10px;grid-template-columns:minmax(0,1fr)}
#lessonOverlay #lessonList .lx-card{min-width:0}
#lessonOverlay #lessonList .lx-card{display:flex;gap:12px;align-items:stretch;text-align:start;width:100%;padding:10px 12px 10px 10px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--text);transition:transform .15s,border-color .2s}
#lessonOverlay #lessonList .lx-card:hover{transform:translateY(-1px);border-color:var(--brass2)}
#lessonOverlay #lessonList .lx-card.done{border-color:rgba(111,211,160,.35);background:linear-gradient(120deg,rgba(47,125,90,.16),rgba(0,0,0,.22) 60%)}
#lessonOverlay #lessonList .lx-card.wide{grid-column:1/-1;border-color:rgba(201,169,97,.5)}
.lx-th{flex:none;width:92px;align-self:center;display:grid;place-items:center}.lx-th > svg{display:block;width:100%;height:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))}
.lx-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.lx-top{display:flex;align-items:center;gap:8px;min-width:0}
.lx-no{font-family:'Shippori Mincho B1',serif;font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--brass);white-space:nowrap}
.lx-st{margin-inline-start:auto;font-size:12px;color:var(--muted);white-space:nowrap}.lx-st.ok{color:#8fe3b8;font-weight:700}.lx-st.new{color:var(--dim)}.lx-st.so{color:var(--brass);opacity:.85}
.lx-t{font-size:16px}.lx-t small{font-size:12px;color:var(--dim);font-weight:400;margin-inline-start:6px}
.lx-sub{font-size:13px;color:var(--brass);opacity:.92;line-height:1.5}
.lx-desc{font-size:12.5px;color:var(--muted);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#lessonList .lx-card .lx-bar{margin-top:auto;height:4px}
.lx-side{flex:0 1 auto;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;padding:1px 7px;border-radius:999px;border:1px solid var(--line)}
.lx-mv{font-size:12px;color:var(--muted);line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Shippori Mincho B1','Noto Serif JP',serif;letter-spacing:.02em}
#lessonOverlay #lessonList .lx-card.op .lx-sub{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lx-ico{display:inline-block;width:1.05em;height:1.05em;vertical-align:-.17em;margin-inline-end:3px}
@media (min-width:561px){
  .lx-tabs.many button{display:grid;grid-template-columns:auto auto;column-gap:7px;row-gap:0;justify-content:center;align-items:center;text-align:start;padding:6px 6px}
  .lx-tabs.many button .ic{grid-row:1/3}
  .lx-tabs.many button .nm{line-height:1.25}
  .lx-tabs.many button .ct{grid-column:2;line-height:1.2}
}
.lx-credit{font-size:12px;color:var(--dim);margin-top:12px;line-height:1.6}
.lx-wait{color:var(--dim);font-size:14px;padding:18px 4px;grid-column:1/-1}
html[lang=ar] .lx{direction:rtl}
html[lang=ar] .lx-mv{direction:ltr;text-align:right}
html[lang=ar] .lx-tabs .ct, html[lang=ar] .lx-banner .pg small{direction:ltr;unicode-bidi:isolate}
@media (max-width:560px){
  .lx-tabs{grid-auto-columns:minmax(64px,1fr)}
  .lx-tabs button{flex-direction:column;gap:2px;padding:7px 4px;font-size:11.5px}.lx-tabs button .ic{width:24px;height:24px}
  .lx-tabs button .nm{max-width:100%}
  .lx-banner{padding:10px 12px;gap:6px 10px;flex-wrap:wrap}.lx-banner .ic{width:36px;height:36px}.lx-banner .tx{flex:1 1 calc(100% - 50px)}.lx-banner .tx small{font-size:12px}.lx-banner .pg{width:100%;flex-direction:row;align-items:center;gap:8px;text-align:start}.lx-banner .pg .lx-bar{flex:1}
  .lx-th{width:76px}.lx-t{font-size:15px}
}
@media (min-width: 760px){
  .lx-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lx-desc{-webkit-line-clamp:3}
  .lx-th{width:100px}
}
#tsGrid .pb-tile.hasth{aspect-ratio:1;padding:0;overflow:hidden;justify-content:flex-end;gap:0}
#tsGrid .pb-tile .th{position:absolute;inset:5px 5px 17px;display:grid;place-items:center;opacity:.9}
#tsGrid .pb-tile .th > svg{width:100%;height:100%;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
#tsGrid .pb-tile.hasth .n{position:absolute;top:3px;left:4px;z-index:1;font-size:10.5px;padding:0 4px;border-radius:5px;background:rgba(10,12,18,.82);color:#fff;line-height:1.45}
#tsGrid .pb-tile.hasth .s, #tsGrid .pb-tile.hasth .nx{position:relative;z-index:1;height:16px;display:flex;align-items:center}
#tsGrid .pb-tile.done .th{opacity:1}
#tsGrid .pb-tile.lk .th{filter:grayscale(1) brightness(.6)}
`;
let styled = false;
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
// ---- lesson list (段級位): grades grouped by rank band
const BANDS = [['intro', '入', ['k20', 'k15', 'k12', 'k10']], ['basic', '初', ['k8', 'k6', 'k5', 'k4']], ['mid', '級', ['k3', 'k2', 'k1']], ['dan', '段', ['d1', 'd2', 'd3']], ['rule', '規', ['rx']]];
const BT = {
  ja: { intro: '入門', basic: '初級', mid: '中級', dan: '有段', rule: 'ルール', 'n.intro': '入門（20級〜10級）', 'n.basic': '初級（8級〜4級）', 'n.mid': '中級（3級〜1級）', 'n.dan': '有段（初段〜三段）', 'n.rule': 'ルールの細かい決まり',
    'd.intro': '駒の動きと価値、タダの駒の取り方、王手のかわし方、1手詰まで。将棋の土台を作ります。', 'd.basic': '1手詰の応用から3手詰、両取りの手筋まで。読みの第一歩です。', 'd.mid': '詰めろの受け、5手詰、中盤の次の一手。先を読む力を鍛えます。', 'd.dan': '7手・9手・11手以上の長い詰みと、深い読みが必要な静かな好手に挑みます。', 'd.rule': '打ち歩詰め・千日手・入玉宣言・駒落ちなど、知っておきたい決まりです。', prog: '{n} / {m} 合格', step: 'STEP {n}' },
  en: { intro: 'Basics', basic: 'Novice', mid: 'Kyu', dan: 'Dan', rule: 'Rules', 'n.intro': 'Basics (20–10 kyu)', 'n.basic': 'Novice (8–4 kyu)', 'n.mid': 'Intermediate (3–1 kyu)', 'n.dan': 'Dan (1–3 dan)', 'n.rule': 'Rule details',
    'd.intro': 'Piece moves and values, free captures, escaping check and mate in 1 — the foundations.', 'd.basic': 'Harder mates in 1, mates in 3 and forks: your first steps in reading ahead.', 'd.mid': 'Stopping mating threats, mates in 5 and middlegame best moves.', 'd.dan': 'Long mates (7, 9, 11+ moves) and quiet moves that need deep reading.', 'd.rule': 'Pawn-drop mate, repetition, entering king, handicap games — the finer rules.', prog: '{n} / {m} passed', step: 'STEP {n}' },
  zh: { intro: '入门', basic: '初级', mid: '中级', dan: '有段', rule: '规则', 'n.intro': '入门（20级〜10级）', 'n.basic': '初级（8级〜4级）', 'n.mid': '中级（3级〜1级）', 'n.dan': '有段（初段〜三段）', 'n.rule': '规则细节',
    'd.intro': '棋子的走法与价值、白吃对方的子、躲避将军、一步杀。打好将棋的基础。', 'd.basic': '从一步杀的应用到三步杀、双吃手筋。迈出计算的第一步。', 'd.mid': '防守“必杀”威胁、五步杀、中盘的下一手，锻炼往后读的能力。', 'd.dan': '挑战7步、9步、11步以上的长杀，以及需要深入计算的冷静好手。', 'd.rule': '打步诘、千日手、入玉宣言、让子棋等需要了解的规定。', prog: '{n} / {m} 合格', step: 'STEP {n}' },
  ko: { intro: '입문', basic: '초급', mid: '중급', dan: '유단', rule: '규칙', 'n.intro': '입문(20급~10급)', 'n.basic': '초급(8급~4급)', 'n.mid': '중급(3급~1급)', 'n.dan': '유단(초단~3단)', 'n.rule': '세부 규칙',
    'd.intro': '말의 움직임과 가치, 공짜 말 잡기, 장군 피하기, 1수 외통까지. 장기의 토대를 만듭니다.', 'd.basic': '1수 외통 응용부터 3수 외통, 양걸이 수법까지. 수읽기의 첫걸음입니다.', 'd.mid': '외통 위협 막기, 5수 외통, 중반의 다음 한 수로 수읽기를 단련합니다.', 'd.dan': '7수·9수·11수 이상의 긴 외통과 깊은 수읽기가 필요한 조용한 묘수에 도전합니다.', 'd.rule': '타보즈메, 천일수, 입옥 선언, 접장기 등 알아 둘 규칙입니다.', prog: '{n} / {m} 합격', step: 'STEP {n}' },
  es: { intro: 'Básico', basic: 'Novato', mid: 'Kyu', dan: 'Dan', rule: 'Reglas', 'n.intro': 'Básico (20–10 kyu)', 'n.basic': 'Novato (8–4 kyu)', 'n.mid': 'Intermedio (3–1 kyu)', 'n.dan': 'Dan (1–3 dan)', 'n.rule': 'Detalles de las reglas',
    'd.intro': 'Movimientos y valor de las piezas, capturas gratis, salir del jaque y mate en 1: los cimientos.', 'd.basic': 'Mates en 1 más difíciles, mates en 3 y dobles ataques: los primeros pasos del cálculo.', 'd.mid': 'Parar amenazas de mate, mates en 5 y mejores jugadas del medio juego.', 'd.dan': 'Mates largos (7, 9, 11+ jugadas) y jugadas tranquilas que exigen cálculo profundo.', 'd.rule': 'Mate por caída de peón, repetición, rey entrante, hándicap: las reglas finas.', prog: '{n} / {m} superadas', step: 'PASO {n}' },
  fr: { intro: 'Bases', basic: 'Novice', mid: 'Kyu', dan: 'Dan', rule: 'Règles', 'n.intro': 'Bases (20–10 kyu)', 'n.basic': 'Novice (8–4 kyu)', 'n.mid': 'Intermédiaire (3–1 kyu)', 'n.dan': 'Dan (1–3 dan)', 'n.rule': 'Détails des règles',
    'd.intro': 'Marche et valeur des pièces, prises gratuites, parer l’échec et mat en 1 : les fondations.', 'd.basic': 'Mats en 1 plus durs, mats en 3 et fourchettes : premiers pas du calcul.', 'd.mid': 'Parer les menaces de mat, mats en 5 et meilleurs coups de milieu de partie.', 'd.dan': 'Mats longs (7, 9, 11+ coups) et coups calmes exigeant un calcul profond.', 'd.rule': 'Mat par parachutage de pion, répétition, roi entrant, handicap : les règles fines.', prog: '{n} / {m} réussies', step: 'ÉTAPE {n}' },
  pt: { intro: 'Básico', basic: 'Novato', mid: 'Kyu', dan: 'Dan', rule: 'Regras', 'n.intro': 'Básico (20–10 kyu)', 'n.basic': 'Novato (8–4 kyu)', 'n.mid': 'Intermediário (3–1 kyu)', 'n.dan': 'Dan (1–3 dan)', 'n.rule': 'Detalhes das regras',
    'd.intro': 'Movimentos e valor das peças, capturas grátis, sair do xeque e mate em 1: a base.', 'd.basic': 'Mates em 1 mais difíceis, mates em 3 e garfos: os primeiros passos do cálculo.', 'd.mid': 'Defender ameaças de mate, mates em 5 e melhores lances do meio-jogo.', 'd.dan': 'Mates longos (7, 9, 11+ lances) e lances calmos que exigem cálculo profundo.', 'd.rule': 'Mate com peão colocado, repetição, rei entrante, handicap: as regras finas.', prog: '{n} / {m} aprovadas', step: 'PASSO {n}' },
  de: { intro: 'Grundlagen', basic: 'Anfänger', mid: 'Kyu', dan: 'Dan', rule: 'Regeln', 'n.intro': 'Grundlagen (20.–10. Kyu)', 'n.basic': 'Anfänger (8.–4. Kyu)', 'n.mid': 'Mittelstufe (3.–1. Kyu)', 'n.dan': 'Dan (1.–3. Dan)', 'n.rule': 'Regeldetails',
    'd.intro': 'Gangart und Wert der Steine, freie Schläge, Schach abwehren und Matt in 1 – das Fundament.', 'd.basic': 'Schwierigere Matts in 1, Matts in 3 und Gabeln: erste Schritte im Vorausrechnen.', 'd.mid': 'Mattdrohungen abwehren, Matts in 5 und beste Mittelspielzüge.', 'd.dan': 'Lange Matts (7, 9, 11+ Züge) und ruhige Züge, die tiefes Rechnen verlangen.', 'd.rule': 'Bauerneinsatzmatt, Zugwiederholung, eindringender König, Vorgabe: die feinen Regeln.', prog: '{n} / {m} bestanden', step: 'SCHRITT {n}' },
  hi: { intro: 'बुनियाद', basic: 'नौसिखिया', mid: 'क्यू', dan: 'दान', rule: 'नियम', 'n.intro': 'बुनियाद (20–10 क्यू)', 'n.basic': 'नौसिखिया (8–4 क्यू)', 'n.mid': 'मध्यम (3–1 क्यू)', 'n.dan': 'दान (1–3 दान)', 'n.rule': 'नियमों का ब्योरा',
    'd.intro': 'मोहरों की चाल और मूल्य, मुफ़्त मोहरा लेना, शह से बचना और 1 चाल में मात — नींव।', 'd.basic': 'कठिन 1-चाल मात, 3-चाल मात और दोहरे हमले: आगे सोचने का पहला क़दम।', 'd.mid': 'मात की धमकी रोकना, 5-चाल मात और मध्य खेल की सबसे अच्छी चालें।', 'd.dan': 'लंबी मातें (7, 9, 11+ चालें) और गहरी गणना वाली शांत चालें।', 'd.rule': 'प्यादा गिराकर मात, दोहराव, घुसता राजा, हैंडीकैप — बारीक नियम।', prog: '{n} / {m} पास', step: 'चरण {n}' },
  ar: { intro: 'الأساسيات', basic: 'مبتدئ', mid: 'كيو', dan: 'دان', rule: 'القواعد', 'n.intro': 'الأساسيات (20–10 كيو)', 'n.basic': 'مبتدئ (8–4 كيو)', 'n.mid': 'متوسط (3–1 كيو)', 'n.dan': 'دان (1–3 دان)', 'n.rule': 'تفاصيل القواعد',
    'd.intro': 'حركة القطع وقيمتها، الأسر المجاني، الخروج من الكش، والمات في نقلة: الأساس.', 'd.basic': 'مات في نقلة أصعب، مات في 3 والشوكات: أولى خطوات الحساب.', 'd.mid': 'صدّ تهديدات المات، مات في 5، وأفضل نقلات وسط اللعب.', 'd.dan': 'ماتات طويلة (7 و9 و11+ نقلة) ونقلات هادئة تتطلب حسابًا عميقًا.', 'd.rule': 'مات بإسقاط بيدق، التكرار، الملك الداخل، الأفضلية: القواعد الدقيقة.', prog: '{n} / {m} نجاح', step: 'الخطوة {n}' },
};
// h = {lang, L, t, grades (with rules, index i: >=0 grades, <0 rules), prog(id), examHtml}
function lessons(h) {
  const T = k => (BT[h.lang()] || BT.en)[k] || BT.en[k];
  const seen = new Set(), cats = BANDS.map(([key, ic, ids]) => ({ key, icon: icon(ic), tab: T(key), name: T('n.' + key), desc: T('d.' + key), ids, items: [] }));
  const add = (c, g, i, k) => {
    const pr = h.prog(g.id), p0 = (g.problems || [])[0];
    const st = pr && pr.pass ? { text: '✓ ' + h.t('ls.clear'), cls: 'ok' } : pr ? { text: h.t('ls.bestPts', { p: pr.best }) } : { text: h.t('ls.new'), cls: 'new' };
    const intro = g.intro ? (g.intro[h.lang()] || g.intro.en || g.intro.ja || []) : [];
    c.items.push({ done: !!(pr && pr.pass), html: card({ attr: `data-i="${i}"`, board: p0 ? board(p0.sfen, { flip: p0.sfen.split(' ')[1] === 'w', hands: (p0.sfen.split(' ')[2] || '-') !== '-', crop: cropFor('lesson:' + g.id, g.crop ? g : p0, 'lesson'), move: (p0.sol || p0.pv || []).slice(0, 1), mate: p0.kind === 'tsume' }) : '', no: `<bdi>${h.L(g.grade)}</bdi>`, st, title: h.L(g.title), sub: h.L(g.short), desc: plain(intro.join(' ')), p: pr ? pr.best / 100 : 0, done: !!(pr && pr.pass) }) });
  };
  h.grades.forEach((g, i) => { const c = cats.find(x => x.ids.includes(g.id)) || cats[cats.length - 2]; add(c, g, i); });
  (h.rules || []).forEach((g, j) => add(cats[cats.length - 1], g, -j - 1));
  return render('lesson', cats.filter(c => c.items.length), { top: h.top || '', foot: h.foot || '', prog: (n, m) => T('prog').replace('{n}', n).replace('{m}', m) });
}
window.ShogiLX = { lessons, board, cropFor, cropOf: (sfen, o) => cropOf(parse(sfen), String(sfen || ""), o || {}), CROP, card, render, plain, bar, icon, tab, tsThumbs, style, parse };
})();
