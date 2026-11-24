/* 掼蛋 — lessons (guandan/lessons.js)
   4 categories · 12 lessons. Each lesson = a short explanation + 5 problems made fresh every time; the answers are worked out
   by the rules engine (engine.js) or follow the basic strategy of the game. 4 of 5 to pass. Progress: 'aicoding-guandan-lessons'.
   The dialog has the common tabs ルール → レッスン. */
(function () {
'use strict';
const A = window.GdApp, GD = window.GD, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const STORE = 'aicoding-guandan-lessons';
let PR = {}; try { PR = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(PR)); } catch (e) {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RKN = r => A.RKN(r);
// a card of natural rank n (2..14) and suit s; d = which deck (0/1)
const cd = (n, s, d) => (d ? 54 : 0) + s * 13 + (n === 14 ? 0 : n - 1);
const POS = p => p === 1 ? 14 : p;
const mini = (ids, L) => `<span class="mc-row">${GD.sortHand(ids, L || 0).map(id => Cards.mini(id, L)).join('')}</span>`;
const box = (lab, ids, L) => `<div><small>${esc(lab)}</small>${mini(ids, L)}</div>`;
const lvTag = L => `<div class="lq-lv"><small>${esc(t('lvl.now'))}</small><b>${esc(RKN(L))}</b></div>`;
const best = (ids, L) => GD.identify(ids, L).sort((a, b) => GD.tier(b) - GD.tier(a))[0];
// suits that are not all the same (so a run is a plain straight)
function mixSuits(n) { let s; do { s = Array.from({ length: n }, () => ri(0, 3)); } while (new Set(s).size === 1); return s; }
// a level whose hearts are not among these ranks (no accidental wilds)
function safeL(ranks) { let L; do { L = ri(2, 14); } while (ranks.includes(L)); return L; }
/* ---- making a combination of a given type ---- */
function make(type, o) {
  o = o || {};
  const used = new Set(), out = [];
  const take = (n, s) => { for (let d = 0; d < 2; d++) { const id = cd(n, s, d); if (!used.has(id)) { used.add(id); out.push(id); return id; } } return null; };
  const takeAny = (n, k, noHeart) => { const ss = shuffle([0, 1, 2, 3, 0, 1, 2, 3]).filter(s => !(noHeart && s === 1)); let got = 0; for (const s of ss) { if (got >= k) break; if (take(n, s) != null) got++; } };
  const r = o.r || ri(2, 14);
  if (type === 'single') takeAny(r, 1, true);
  else if (type === 'pair') takeAny(r, 2, true);
  else if (type === 'triple') takeAny(r, 3, true);
  else if (type === 'full') { let r2; do { r2 = ri(2, 14); } while (r2 === r); takeAny(r, 3, true); takeAny(o.r2 || r2, 2, true); }
  else if (type === 'bomb') takeAny(r, o.n || 4, (o.n || 4) <= 6);
  else if (type === 'straight' || type === 'sflush') { const st = o.st || ri(1, 10), su = type === 'sflush' ? Array(5).fill(o.s != null ? o.s : ri(0, 3)) : mixSuits(5); for (let i = 0; i < 5; i++) take(POS(st + i), su[i]); }
  else if (type === 'tube') { const st = o.st || ri(1, 12); for (let i = 0; i < 3; i++) takeAny(POS(st + i), 2, true); }
  else if (type === 'plate') { const st = o.st || ri(1, 13); for (let i = 0; i < 2; i++) takeAny(POS(st + i), 3, true); }
  else if (type === 'kings') { out.push(52, 106, 53, 107); }
  return out;
}
const ranksOf = ids => ids.map(GD.natOf).filter(n => n <= 14);
const yesNo = () => [t('lq.yes'), t('lq.no')];
/* ---- exact fewest plays for a small hand without wilds / jokers (count DP) ---- */
function fewest(ids) {
  const c = new Array(15).fill(0); ids.forEach(id => c[GD.natOf(id)]++);
  const memo = new Map();
  const go = c => {
    const key = c.join(','); if (memo.has(key)) return memo.get(key);
    let r0 = -1; for (let r = 2; r <= 14; r++) if (c[r]) { r0 = r; break; }
    if (r0 < 0) return { n: 0, p: [] };
    let bestR = null;
    const tryP = (rm, lab) => { const c2 = c.slice(); for (const [r, k] of rm) { if (c2[r] < k) return; c2[r] -= k; } const s = go(c2); if (!bestR || s.n + 1 < bestR.n) bestR = { n: s.n + 1, p: s.p.concat([lab]) }; };
    // every play that uses the lowest rank present (any optimal split has one)
    for (let k = 1; k <= c[r0]; k++) tryP([[r0, k]], [k === 1 ? 'single' : k === 2 ? 'pair' : k === 3 ? 'triple' : 'bomb', r0]);
    if (c[r0] >= 3) for (let b = 2; b <= 14; b++) if (b !== r0 && c[b] >= 2) tryP([[r0, 3], [b, 2]], ['full', r0]);
    if (c[r0] >= 2) for (let a = 2; a <= 14; a++) if (a !== r0 && c[a] >= 3) tryP([[a, 3], [r0, 2]], ['full', a]);
    const runs = (len, per, t2) => { for (let st = 1; st + len - 1 <= 14; st++) { const ps = []; for (let i = 0; i < len; i++) ps.push(POS(st + i)); if (!ps.includes(r0)) continue; tryP(ps.map(r => [r, per]), [t2, POS(st + len - 1)]); } };
    runs(5, 1, 'straight'); runs(3, 2, 'tube'); runs(2, 3, 'plate');
    memo.set(key, bestR); return bestR;
  };
  return go(c);
}

/* ---------------- problem generators ---------------- */
const TY = ['pair', 'triple', 'full', 'straight', 'tube', 'plate', 'bomb', 'sflush'];
const G = {
  combos() {
    if (Math.random() < .2) {   // something that is not a play
      const bad = pick([() => { const st = ri(2, 8); const s = mixSuits(6); return [0, 1, 2, 3, 4, 5].map(i => cd(st + i, s[i], 0)); },
        () => { const a = ri(3, 9); return make('pair', { r: a }).concat(make('pair', { r: a + 1 })); },
        () => { const s = mixSuits(5); return [11, 12, 13, 14, 2].map((n, i) => cd(n, s[i], 0)); }])();
      const opts = shuffle(['none', 'straight', 'tube', 'bomb']);
      return { q: t('q.combos'), vis: `<div class="lq-hands one"><div>${mini(bad)}</div></div>`, opts: opts.map(k => k === 'none' ? t('lq.none') : t('ct.' + k)), ans: opts.indexOf('none'), exp: t('e.none') };
    }
    const ty = pick(TY), ids = make(ty), L = safeL(ranksOf(ids)), real = best(ids, L).t;
    const opts = shuffle([real].concat(shuffle(TY.filter(x => x !== real)).slice(0, 3)));
    return { q: t('q.combos'), vis: `<div class="lq-hands one"><div>${mini(ids, L)}</div></div>`, opts: opts.map(k => t('ct.' + k)), ans: opts.indexOf(real), exp: t('e.ct.' + real) };
  },
  compare() {
    const ty = pick(['single', 'pair', 'triple', 'full', 'straight', 'tube', 'plate']);
    let a, b, L, ca, cb;
    for (let k = 0; k < 200; k++) {
      a = make(ty); b = make(ty);
      if (a.some(x => b.includes(x))) continue;
      L = Math.random() < .45 ? pick(ranksOf(a).concat(ranksOf(b))) : safeL(ranksOf(a).concat(ranksOf(b)));
      if (a.concat(b).some(id => GD.isWild(id, L))) continue;
      ca = best(a, L); cb = best(b, L);
      if (ca && cb && ca.t === cb.t && ca.k !== cb.k) break;
    }
    const win = GD.beats(ca, cb) ? 0 : 1, w = win ? cb : ca;
    const lvl = [a, b].some(x => ranksOf(x).includes(L)) && ['single', 'pair', 'triple', 'full'].includes(ty);
    const exp = t('e.cmp.' + (ty === 'full' ? 'full' : ['straight', 'tube', 'plate'].includes(ty) ? 'seq' : 'set'), { r: RKN(w.k > 14 ? L : w.k) }) + (lvl ? ' ' + t('e.cmp.lvl', { l: RKN(L) }) : '');
    return { q: t('q.compare'), vis: lvTag(L) + `<div class="lq-hands">${box('A', a, L)}${box('B', b, L)}</div>`, opts: ['A', 'B'], ans: win, exp };
  },
  seqA() {
    const k = pick(['ok', 'ok', 'wrap', 'cmp', 'cmp']);
    if (k === 'cmp') {
      const ty = pick(['straight', 'tube', 'plate']), low = make(ty, { st: 1 }), hi = make(ty, { st: 2 });
      if (low.some(x => hi.includes(x))) return G.seqA();
      const flip = Math.random() < .5, L = 9;
      return { q: t('q.compare'), vis: `<div class="lq-hands">${box('A', flip ? hi : low, 0)}${box('B', flip ? low : hi, 0)}</div>`, opts: ['A', 'B'], ans: flip ? 0 : 1, exp: t('e.seqA.low') };
    }
    if (k === 'wrap') { const st = pick([11, 12, 13]), s = mixSuits(5), ids = [0, 1, 2, 3, 4].map(i => { const n = st + i; return cd(n > 14 ? n - 13 : n, s[i], 0); }); return { q: t('q.seqok'), vis: `<div class="lq-hands one"><div>${mini(ids)}</div></div>`, opts: yesNo(), ans: 1, exp: t('e.seqA.wrap') }; }
    const ty = pick(['straight', 'straight', 'tube', 'plate']), top = { straight: 10, tube: 12, plate: 13 }[ty];
    const ids = make(ty, { st: pick([1, 1, top, ri(2, top)]) });
    const c = GD.identify(ids, 9)[0];
    if (!c) return G.seqA();
    return { q: t('q.seqok'), vis: `<div class="lq-hands one"><div>${mini(ids)}</div></div>`, opts: yesNo(), ans: 0, exp: t('e.seqA.ok', { c: A.ctName(c) }) };
  },
  level() {
    if (Math.random() < .45) {   // the wild card fills a run
      const L = ri(2, 13), st = ri(1, 10), run = []; for (let i = 0; i < 5; i++) run.push(POS(st + i));
      if (run.includes(L)) return G.level();
      const gap = pick(run), s = mixSuits(5), ids = run.map((n, i) => n === gap ? cd(L, 1, 0) : cd(n, s[i], 0));
      const opts = shuffle([gap, ...shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter(x => x !== gap)).slice(0, 3)]);
      return { q: t('q.wild', { l: RKN(L) }), vis: lvTag(L) + `<div class="lq-hands one"><div>${mini(ids, L)}</div></div>`, opts: opts.map(RKN), ans: opts.indexOf(gap), exp: t('e.wild', { r: RKN(gap) }) };
    }
    const L = ri(2, 13), pool = [L].concat(shuffle([14, 13, 12, 11, 10].filter(x => x !== L)).slice(0, 3));
    const ids = shuffle(pool.map(n => cd(n, n === L ? pick([0, 2, 3]) : ri(0, 3), 0)));
    if (Math.random() < .3) ids[ids.findIndex(id => GD.natOf(id) !== L)] = 52;   // a small joker
    const vals = ids.map(id => GD.val(id, L)), bi = vals.indexOf(Math.max(...vals));
    return { q: t('q.level', { l: RKN(L) }), vis: lvTag(L) + `<div class="lq-hands one"><div>${ids.map(id => Cards.mini(id, L)).join('')}</div></div>`, opts: ids.map(id => Cards.mini(id, L)), html: true, ans: bi, exp: GD.natOf(ids[bi]) >= 16 ? t('e.level.j') : t('e.level', { l: RKN(L) }) };
  },
  bombs() {
    const kinds = [['bomb', 4], ['bomb', 5], ['sflush', 5], ['bomb', 6], ['bomb', 7], ['bomb', 8], ['kings', 4]];
    let a, b, ka, kb;
    for (let k = 0; k < 200; k++) {
      ka = pick(kinds); kb = pick(kinds); if (ka[0] === 'kings' && kb[0] === 'kings') continue;
      a = make(ka[0], { n: ka[1] }); b = make(kb[0], { n: kb[1] });
      if (a.some(x => b.includes(x))) continue;
      const L = safeL(ranksOf(a).concat(ranksOf(b)));
      if (a.concat(b).some(id => GD.isWild(id, L))) continue;
      const ca = best(a, L), cb = best(b, L);
      if (!ca || !cb || !GD.isBomb(ca) || !GD.isBomb(cb)) continue;
      if (GD.beats(ca, cb) === GD.beats(cb, ca)) continue;
      const win = GD.beats(ca, cb) ? 0 : 1;
      return { q: t('q.compare'), vis: lvTag(L) + `<div class="lq-hands">${box(A.ctName(ca), a, L)}${box(A.ctName(cb), b, L)}</div>`, opts: ['A', 'B'], ans: win, exp: t('e.bombs') };
    }
    return G.bombs();
  },
  legal() {
    const ty = pick(['pair', 'triple', 'full', 'straight', 'tube', 'single']);
    for (let k = 0; k < 300; k++) {
      const tg = make(ty, { r: ri(4, 12), st: ty === 'tube' ? ri(2, 9) : ri(2, 7) }), L = safeL(ranksOf(tg));
      const T = best(tg, L); if (!T) continue;
      const good = Math.random() < .25 ? make('bomb', { n: 4 }) : make(ty);
      const bads = [];
      const altT = { pair: 'triple', triple: 'pair', full: 'straight', straight: 'tube', tube: 'plate', single: 'pair' }[ty];
      for (let j = 0; j < 30 && bads.length < 3; j++) {
        const x = bads.length === 0 ? make(altT) : make(ty);
        const cx = best(x, L); if (!cx || GD.beats(cx, T) || x.some(id => GD.isWild(id, L))) continue;
        if (bads.some(y => best(y, L).k === cx.k && best(y, L).t === cx.t)) continue;
        bads.push(x);
      }
      const cg = best(good, L);
      if (bads.length < 3 || !cg || !GD.beats(cg, T) || good.some(id => GD.isWild(id, L))) continue;
      const opts = shuffle([good].concat(bads));
      return { q: t('q.legal'), vis: lvTag(L) + `<div class="lq-hands one">${box(t('r.ui.table') + ' · ' + A.ctName(T), tg, L)}</div>`, opts: opts.map(x => mini(x, L)), html: true, cards: true, ans: opts.indexOf(good), exp: t(GD.isBomb(cg) ? 'e.legal.bomb' : 'e.legal', { c: A.ctName(T) }) };
    }
    return G.legal();
  },
  turns() {
    for (let k = 0; k < 200; k++) {
      const parts = shuffle(['straight', 'pair', 'triple', 'single', 'single', 'tube', 'pair', 'full']).slice(0, ri(2, 3));
      let ids = []; for (const p of parts) { const x = make(p); if (x.some(id => ids.includes(id))) { ids = null; break; } ids = ids.concat(x); }
      if (!ids || ids.length < 6 || ids.length > 11) continue;
      const F = fewest(ids), ans = F.n;
      const opts = shuffle([...new Set([ans, ans + 1, ans + 2, Math.max(1, ans - 1)])]);
      if (opts.length < 3) continue;
      const how = F.p.map(([ty, r]) => ty === 'bomb' ? t('ct.bomb') + ' ' + RKN(r) : A.ctName({ t: ty }) + ' ' + RKN(r)).join(' + ');
      return { q: t('q.turns'), vis: `<div class="lq-hands one"><div>${mini(ids)}</div></div>`, opts: opts.map(String), ans: opts.indexOf(ans), exp: t('e.turns', { n: ans, h: how }) };
    }
    return G.turns();
  },
  partner() {
    const k = pick(['pass', 'pass', 'feed', 'block']), N = A.NAMES();
    if (k === 'pass') { const r = ri(10, 13); return { q: t('q.p.pass', { m: N[2], r: RKN(r), n: ri(12, 20) }), vis: '', opts: [t('lq.o.pass'), t('lq.o.over')], ans: 0, exp: t('e.p.pass') }; }
    if (k === 'feed') { const opts = shuffle(['low', 'high', 'pair']); return { q: t('q.p.feed', { m: N[2] }), vis: '', opts: opts.map(x => t('lq.o.' + x)), ans: opts.indexOf('low'), exp: t('e.p.feed') }; }
    const opts = shuffle(['low', 'pair', 'high']); return { q: t('q.p.block', { o: N[1] }), vis: '', opts: opts.map(x => t('lq.o.' + x)), ans: opts.indexOf('pair'), exp: t('e.p.block') };
  },
  bombuse() {
    const k = pick(['stop', 'stop', 'wait', 'mate']), N = A.NAMES();
    if (k === 'stop') { const n = ri(2, 4); return { q: t('q.b.stop', { o: N[pick([1, 3])], n, c: t('ct.' + pick(['pair', 'triple', 'straight'])) }), vis: '', opts: [t('lq.o.bomb'), t('lq.o.pass')], ans: 0, exp: t('e.b.stop') }; }
    if (k === 'wait') return { q: t('q.b.wait', { o: N[pick([1, 3])], r: RKN(ri(3, 7)), n: ri(16, 24) }), vis: '', opts: [t('lq.o.bomb'), t('lq.o.small')], ans: 1, exp: t('e.b.wait') };
    return { q: t('q.b.mate', { m: N[2] }), vis: '', opts: [t('lq.o.bomb'), t('lq.o.pass')], ans: 1, exp: t('e.b.mate') };
  },
  trib() {
    if (Math.random() < .5) {
      for (let k = 0; k < 200; k++) {
        const L = ri(2, 13), ns = shuffle([14, 13, 12, 11, 10, 9, 8, 7, L]).slice(0, 5); if (Math.random() < .5) ns.push(L);
        const ids = []; for (const n of ns) { const id = cd(n, n === L ? pick([0, 2, 3]) : ri(0, 3), ids.includes(cd(n, 0, 0)) ? 1 : 0); if (!ids.includes(id)) ids.push(id); }
        if (Math.random() < .5) ids.push(cd(L, 1, 0));   // a wild that must not be given
        const ch = GD.tributeChoices(ids, L); if (ch.length !== 1) continue;
        const others = shuffle(ids.filter(id => id !== ch[0])).slice(0, 3); if (others.length < 3) continue;
        const wildIn = ids.find(id => GD.isWild(id, L)); if (wildIn != null && !others.includes(wildIn)) others[0] = wildIn;
        const opts = shuffle([ch[0]].concat(others));
        return { q: t('q.trib', { l: RKN(L) }), vis: lvTag(L) + `<div class="lq-hands one"><div>${mini(ids, L)}</div></div>`, opts: opts.map(id => Cards.mini(id, L)), html: true, ans: opts.indexOf(ch[0]), exp: t(wildIn != null ? 'e.trib.w' : 'e.trib') };
      }
    }
    const L = ri(2, 9), lo = cd(ri(2, 10), ri(0, 3), 0), hi = shuffle([11, 12, 13, 14]).slice(0, 3).map(n => cd(n, ri(0, 3), 0));
    const opts = shuffle([lo].concat(hi));
    return { q: t('q.ret'), vis: '', opts: opts.map(id => Cards.mini(id, L)), html: true, ans: opts.indexOf(lo), exp: t('e.ret') };
  },
  up() {
    const N = A.NAMES();
    if (Math.random() < .3) {
      const k = pick(['o13', 'o14', 'o12']), ans = k === 'o14' ? 1 : 0;
      return { q: t('q.upA', { r: t('lq.' + k) }), vis: '', opts: [t('lq.o.winM'), t('lq.o.stayA')], ans, exp: t(ans ? 'e.upA.no' : 'e.upA.yes') };
    }
    const order = shuffle([0, 1, 2, 3]);
    const R = GD.handResult({ opts: {}, lv: [2, 2] }, { order, L: 2, lt: -1 });
    const gain = R.win === 0 ? R.up : 0;
    const opts = ['3', '2', '1', '0'];
    return { q: t('q.up', { o: order.map((s, i) => t('place.' + i) + ' ' + N[s]).join('・') }), vis: '', opts: opts.map(x => x === '0' ? t('lq.o.none') : '+' + x), ans: opts.indexOf(String(gain)), exp: R.win === 0 ? t('e.up', { n: gain, p: t('place.' + R.place) }) : t('e.up.them') };
  },
  lead() {
    const N = A.NAMES(), k = pick(['last', 'out', 'out', 'trib', 'anti']), seats = [0, 1, 2, 3];
    if (k === 'last') { const s = ri(1, 3); return { q: t('q.l.last', { n: N[s] }), vis: '', opts: seats.map(x => N[x]), ans: s, exp: t('e.l.last') }; }
    if (k === 'out') { const s = pick([1, 2, 3]); return { q: t('q.l.out', { n: N[s] }), vis: '', opts: seats.map(x => N[x]), ans: (s + 2) % 4, exp: t('e.l.out', { n: N[(s + 2) % 4] }) }; }
    if (k === 'trib') { const g = pick([1, 3]); return { q: t('q.l.trib', { g: N[g] }), vis: '', opts: seats.map(x => N[x]), ans: g, exp: t('e.l.trib') }; }
    const g = pick([1, 3]); return { q: t('q.l.anti', { g: N[g] }), vis: '', opts: seats.map(x => N[x]), ans: 0, exp: t('e.l.anti') };
  },
};
const ICO = {
  basic: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="10" height="14" rx="2"/><rect x="10" y="3" width="10" height="14" rx="2" transform="rotate(12 15 10)"/></svg>',
  power: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><path d="M10.5 10.5l3 3M16 4v4M14 6h4"/></svg>',
  flow: '<svg viewBox="0 0 24 24"><path d="M4 17h12l-3 3M20 7H8l3-3"/></svg>',
};
const CATS_L = [
  { id: 'basic', items: ['combos', 'compare', 'seqA'] },
  { id: 'power', items: ['level', 'bombs', 'legal'] },
  { id: 'tactics', items: ['turns', 'partner', 'bombuse'] },
  { id: 'flow', items: ['trib', 'up', 'lead'] },
];
const ALL = []; CATS_L.forEach(c => c.items.forEach(id => ALL.push({ id, cat: c.id })));
const PIC = { combos: [5, 18, 31, 44, 57], compare: [12, 25], seqA: [0, 14, 28, 42, 4], level: [53, 52, 19], bombs: [8, 21, 34, 47], legal: [9, 22, 36], turns: [2, 16, 30, 44, 7], partner: [], bombuse: [6, 19, 32, 45, 60], trib: [53, 0], up: [], lead: [] };
function picHtml(id) {
  if (PIC[id] && PIC[id].length) return `<span class="mc-row">${PIC[id].map(c => Cards.mini(c, 0)).join('')}</span>`;
  return `<span class="lc-num">${{ partner: '🤝', up: '+3', lead: '→' }[id] || ''}</span>`;
}
let cat = 'basic', cur = null;
const progress = id => PR[id] || { best: 0, pass: false };
function listHtml() {
  const c = CATS_L.find(x => x.id === cat), passed = id => progress(id).pass;
  const tabs = CATS_L.map(x => `<button type="button" class="lc-tab${x.id === cat ? ' sel' : ''}" data-cat="${x.id}"><span class="lc-ico">${ICO[x.id]}</span><b>${esc(t('cat.' + x.id))}</b><small>${x.items.filter(passed).length}/${x.items.length}</small></button>`).join('');
  const done = c.items.filter(passed).length;
  const head = `<div class="lc-head"><span class="lc-ico lg">${ICO[c.id]}</span><div><b>${esc(t('cat.' + c.id))}</b><p>${esc(t('catd.' + c.id))}</p></div><div class="lc-prog"><small>${esc(t('lsn.passed', { n: done, m: c.items.length }))}</small><span class="bar"><i style="width:${done / c.items.length * 100}%"></i></span></div></div>`;
  const cards = c.items.map(id => { const pr = progress(id), n = ALL.findIndex(x => x.id === id) + 1;
    return `<button type="button" class="lc-card${pr.pass ? ' pass' : ''}" data-l="${id}"><span class="lc-pic gd-pic">${picHtml(id)}</span><span class="lc-txt"><span class="lc-top"><em>STEP ${n}</em><small class="${pr.pass ? 'ok' : ''}">${esc(pr.pass ? t('lsn.pass') : pr.best ? t('lsn.best', { n: pr.best }) : t('lsn.new'))}</small></span><b>${esc(t('l.' + id))}</b><span class="lc-d">${esc(t('ld.' + id))}</span><span class="bar"><i style="width:${(pr.best || 0) / 5 * 100}%"></i></span></span></button>`; }).join('');
  const tut = window.GdTut ? `<button type="button" class="lc-tut" id="lcTut"><span>▶</span><span><b>${esc(t('tu.entry'))}</b><small>${esc(t('tu.entry.d'))}</small></span><span class="go">›</span></button>` : '';
  return `<p class="lc-lead">${esc(t('lsn.lead'))}</p>${tut}<div class="lc-tabs gd4">${tabs}</div>${head}<div class="lc-grid">${cards}</div>`;
}
function open(o) { cur = null; if (o && o.cat) cat = o.cat; renderShell(); A.openOv('#lessonOverlay'); }
function renderShell() {
  const M = $('#lessonModal');
  const tabs = `<div class="ng-tabs lt-top"><button type="button" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" class="sel" data-top="lessons">${esc(t('btn.lesson'))}</button></div>`;
  const body = !cur ? `<div class="lc-body">${listHtml()}</div><div class="modal-actions"><button class="mbtn go" id="lcClose">${esc(t('close'))}</button></div>` : playHtml();
  M.innerHTML = tabs + body;
  M.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { if (b.dataset.top === 'rules') window.GdRules && GdRules.open(); });
  if (!cur) {
    M.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; renderShell(); });
    const tb = $('#lcTut'); if (tb) tb.onclick = () => { A.closeOv('#lessonOverlay'); GdTut.start(); };
    M.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l));
    $('#lcClose').onclick = () => A.closeOv('#lessonOverlay');
  } else wirePlay();
}
function start(id) {
  const qs = [], seen = new Set();
  for (let k = 0; qs.length < 5 && k < 80; k++) { let q; try { q = G[id](); } catch (e) { console.error(e); continue; } if (!q) continue; const key = q.q + '|' + q.vis + '|' + q.opts.join(); if (seen.has(key) && k < 60) continue; seen.add(key); qs.push(q); }
  cur = { id, step: -1, qs, i: 0, score: 0, chosen: null };
  renderShell();
}
function playHtml() {
  const id = cur.id, n = ALL.findIndex(x => x.id === id) + 1;
  const dots = `<span class="lq-dots">${cur.qs.map((q, k) => `<i class="${k < cur.i ? (q.ok ? 'ok' : 'ng') : k === cur.i && cur.step >= 0 ? 'cur' : ''}"></i>`).join('')}</span>`;
  let main;
  if (cur.step === -1) main = `<div class="lq-intro"><span class="lc-pic lg gd-pic">${picHtml(id)}</span><div>${String(t('lx.' + id)).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}<p class="lq-tip">💡 ${esc(t('lt.' + id))}</p></div></div>`;
  else if (cur.i >= cur.qs.length) { const pass = cur.score >= 4; main = `<div class="lq-end"><div class="lq-score ${pass ? 'ok' : ''}">${cur.score} / 5</div><b>${esc(t(pass ? 'lsn.endPass' : 'lsn.endFail'))}</b><p>${esc(t(pass ? 'lsn.endPassD' : 'lsn.endFailD'))}</p></div>`; }
  else {
    const q = cur.qs[cur.i], ch = cur.chosen;
    main = `<div class="lq-q"><p class="lq-qt">${esc(q.q)}</p>${q.vis || ''}<div class="lq-opts${q.html ? ' cards' : ''}${q.cards ? ' wide' : ''}">${q.opts.map((o, k) => `<button type="button" class="lq-o${ch != null ? (k === q.ans ? ' right' : k === ch ? ' wrong' : ' off') : ''}" data-o="${k}"${ch != null ? ' disabled' : ''}>${q.html ? o : esc(o)}</button>`).join('')}</div>` +
      (ch != null ? `<div class="lq-exp ${ch === q.ans ? 'ok' : 'ng'}"><b>${esc(t(ch === q.ans ? 'lsn.right' : 'lsn.wrong'))}</b><p>${esc(q.exp)}</p></div>` : '') + `</div>`;
  }
  const foot = cur.step === -1 ? `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo">${esc(t('lsn.startQ'))}</button>`
    : cur.i >= cur.qs.length ? `<button class="mbtn" id="lqList">${esc(t('lsn.backLesson'))}</button><button class="mbtn" id="lqRetry">${esc(t('lsn.retry'))}</button><button class="mbtn go" id="lqNext">${esc(t('lsn.nextLesson'))}</button>`
    : `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo"${cur.chosen == null ? ' disabled' : ''}>${esc(cur.i === cur.qs.length - 1 ? t('lsn.finish') : t('lsn.nextQ'))}</button>`;
  return `<div class="lq"><div class="lq-head"><em>STEP ${n}</em><b>${esc(t('l.' + id))}</b>${cur.step >= 0 ? dots : ''}</div><div class="lq-main">${main}</div><div class="modal-actions">${foot}</div><div class="lq-quit"><button type="button" class="sbtn" id="lqX">${esc(t('lsn.quit'))}</button></div></div>`;
}
function wirePlay() {
  const M = $('#lessonModal');
  const toList = () => { const id = cur.id; cur = null; cat = ALL.find(x => x.id === id).cat; renderShell(); const el = M.querySelector(`[data-l="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
  $('#lqX').onclick = toList; const li = $('#lqList'); if (li) li.onclick = toList;
  M.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (cur.chosen != null) return; const q = cur.qs[cur.i]; cur.chosen = +b.dataset.o; q.ok = cur.chosen === q.ans; if (q.ok) cur.score++;
    A.sfx(q.ok ? 'ok' : 'ng'); renderShell();
  });
  const go = $('#lqGo'); if (go) go.onclick = () => {
    if (cur.step === -1) { cur.step = 0; renderShell(); return; }
    cur.chosen = null; cur.i++;
    if (cur.i >= cur.qs.length) { const pr = progress(cur.id); PR[cur.id] = { best: Math.max(pr.best || 0, cur.score), pass: pr.pass || cur.score >= 4 }; saveP(); if (cur.score >= 4) A.sfx('win'); }
    renderShell();
  };
  const rt = $('#lqRetry'); if (rt) rt.onclick = () => start(cur.id);
  const nx = $('#lqNext'); if (nx) nx.onclick = () => { const i = ALL.findIndex(x => x.id === cur.id); const n = ALL[(i + 1) % ALL.length]; cat = n.cat; start(n.id); };
}
document.addEventListener('keydown', e => {
  if (!$('#lessonOverlay').classList.contains('show') || !cur) return;
  if (cur.step >= 0 && cur.i < cur.qs.length && cur.chosen == null && /^[1-4]$/.test(e.key)) { const b = document.querySelector(`#lessonModal [data-o="${+e.key - 1}"]`); if (b) b.click(); }
  else if ((e.key === 'Enter' || e.key === 'ArrowRight') && $('#lqGo') && !$('#lqGo').disabled) $('#lqGo').click();
});
window.GdLessons = { open, G, fewest, make, count: () => ALL.length, passed: () => ALL.filter(x => progress(x.id).pass).length };
})();
