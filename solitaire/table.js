/* ソリティア — card table renderer (solitaire/table.js)
   One Table per board (the game, and the small boards of the rules tutorial). Cards are persistent DOM elements keyed
   by card id, so every state change animates by itself (CSS transition on transform).
     const tb = new Table(el, { mini, onMove(mv), onStock(), onTap(pi, ci), onDouble(pi, ci), onPile(pi), canAct() })
     tb.set(st, { anim, deal })   tb.hint(mv)   tb.select(pi, ci | null)   tb.shake(pi, ci)   tb.faces()   tb.relayout() */
(function () {
'use strict';
const S = window.SOL;
const RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PIPS = {
  1: [[.5, .5]], 2: [[.5, 0], [.5, 1]], 3: [[.5, 0], [.5, .5], [.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]], 6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
  7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]], 8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
  9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]],
};
const suitSvg = (s, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24"><use href="#s${s}"/></svg>`;
function faceHtml(c) {
  const s = S.SUIT(c), r = S.RANK(c), rk = RK[r - 1];
  const corner = `<div class="ix"><b>${rk}</b>${suitSvg(s)}</div><div class="ix ix2"><b>${rk}</b>${suitSvg(s)}</div>`;
  let mid;
  if (r > 10) {
    const dir = Table.COURT_DIR[document.documentElement.dataset.court === 'antique' ? 'antique' : 'classic'];   // court art set: classic (img/), antique, flat
    mid = `<div class="fc"><img src="img/${dir}${'JQK'[r - 11]}${'shdc'[s]}.webp" alt="" draggable="false" decoding="async"></div>`;
  } else if (r === 1) mid = `<div class="ace">${suitSvg(s)}</div>`;
  else mid = `<div class="pp">${PIPS[r].map(([x, y]) => `<i style="left:${x * 100}%;top:${y * 100}%"${y > .5 ? ' class="rv"' : ''}>${suitSvg(s)}</i>`).join('')}</div>`;
  // the flat / gangsta decks: every card is a whole-face image (img/flat/<rank><suit>.webp); the drawn face stays underneath for tiny cards
  const deck = document.documentElement.dataset.court, full = Table.FULL_DECKS.includes(deck) ? `<img class="fimg" src="img/${deck}/${'A23456789TJQK'[r - 1]}${'shdc'[s]}.webp?v=2" alt="" draggable="false" decoding="async">` : '';
  return `<div class="fr s${s}${r > 10 ? ' face' : ''}">${corner}${mid}<div class="big">${suitSvg(s)}</div>${full}</div><div class="bk"></div>`;
}
const DOWN = 0.13, UP = 0.30, UPMIN = 0.13, DOWNMIN = 0.045;

class Table {
  constructor(el, o) {
    this.el = el; this.o = o || {}; this.cards = new Map(); this.slots = []; this.st = null; this.pos = new Map(); this.sel = null;
    el.classList.add('tbl'); if (this.o.mini) el.classList.add('mini'); Table.all.add(this); Table.applyFace(el);
    this.layer = document.createElement('div'); this.layer.className = 'tl'; el.appendChild(this.layer);
    this.ro = new ResizeObserver(() => { if (this.st) this.layout(false); }); this.ro.observe(el);
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  destroy() { this.ro.disconnect(); Table.all.delete(this); this.el.innerHTML = ''; }
  set(st, opt) {
    opt = opt || {};
    const relay = !this.st || this.st.L !== st.L;
    this.st = st;
    if (relay) this.buildSlots();
    const ids = new Set(); st.p.forEach(P => P.c.forEach(c => ids.add(c)));
    for (const [id, e] of this.cards) if (!ids.has(id)) { e.remove(); this.cards.delete(id); }
    for (const id of ids) if (!this.cards.has(id)) {
      const e = document.createElement('div'); e.className = 'cd dn'; e.dataset.id = id;
      e.innerHTML = `<div class="in">${faceHtml(id)}</div>`; this.layer.appendChild(e); this.cards.set(id, e); e._new = true;
    }
    this.layout(opt.anim !== false, opt);
  }
  faces() { for (const [id, e] of this.cards) e.querySelector('.in').innerHTML = faceHtml(id); }
  buildSlots() {
    this.slots.forEach(s => s.remove()); this.slots = [];
    this.st.L.forEach((l, i) => {
      const d = document.createElement('div'); d.className = 'slot k-' + l.k + (l.stack ? ' stack' : ''); d.dataset.pi = i;
      if (l.k === 'found' && !l.stack && !l.discard) d.innerHTML = '<span>A</span>';
      if (l.stack && l.n > 0) d.classList.add('ghost');
      if (l.k === 'stock') d.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>';
      this.el.insertBefore(d, this.layer); this.slots.push(d);
    });
  }
  relayout() { if (this.st) this.layout(false); }
  geom() {
    const st = this.st, L = st.L, W = this.el.clientWidth, H = this.el.clientHeight, CH = S.CH;
    let lw = 0, needH = 0;
    L.forEach((l, i) => {
      const n = st.p[i].c.length, d = st.p[i].d;
      lw = Math.max(lw, l.x + 1 + (l.fan === 'h' ? 0.44 : 0));
      const fan = l.fan === 'v' ? Math.max(0, d) * DOWN * 0.6 + Math.max(0, n - d - 1) * UPMIN * 1.2 : 0;
      needH = Math.max(needH, l.y + CH + Math.min(fan, this.o.mini ? 2.4 : 3.4) + (l.fan === 'v' ? (this.o.mini ? 0.5 : 1.1) : 0));
    });
    const pad = this.o.mini ? 0.12 : 0.22;
    let u = Math.min((W - 8) / (lw + 2 * pad), (H - 8) / (needH + 2 * pad));
    u = Math.max(18, Math.min(u, this.o.maxU || 150));
    const minX = Math.min(...L.map(l => l.x - (l.fan === 'hl' ? 0.44 : 0)));
    const ox = (W - (lw - minX) * u) / 2 - minX * u, oy = this.o.mini ? Math.max(pad * u, (H - needH * u) / 2) : pad * u;
    return { u, ox, oy, W, H };
  }
  layout(anim, opt) {
    opt = opt || {};
    const st = this.st, g = this.geom(), u = g.u, ch = u * S.CH, el = this.el;
    this.g = g;
    el.style.setProperty('--cw', u + 'px'); el.style.setProperty('--chh', ch + 'px');
    el.classList.toggle('tiny', u < 54); el.classList.toggle('small', u >= 54 && u < 78);
    if (!anim) el.classList.add('noanim');
    const pos = new Map(); this.rects = [];
    st.L.forEach((l, i) => {
      const P = st.p[i], x0 = g.ox + l.x * u, y0 = g.oy + l.y * u, n = P.c.length;
      const sl = this.slots[i]; sl.style.transform = `translate(${x0}px,${y0}px)`;
      sl.classList.toggle('dead', l.k === 'stock' && !n && !(S.VARIANTS[st.v].canStock && S.VARIANTS[st.v].canStock(st)));
      sl.classList.toggle('filled', n > 0);
      const upMax = !this.o.mini && g.H / u > 8.5 ? 0.40 : UP;
      let dy = upMax * u, dd = DOWN * u, dx = 0;
      if (l.fan === 'v') {
        const avail = g.H - y0 - ch - 6, need = P.d * dd + Math.max(0, n - P.d - 1) * dy;
        if (need > avail && need > 0) {
          const k = Math.max(0, avail) / need;
          dd = Math.max(DOWNMIN * u, dd * k); dy = Math.max(UPMIN * u, (avail - P.d * dd) / Math.max(1, n - P.d - 1));
          dy = Math.min(dy, upMax * u);
        }
      }
      let bottom = y0 + ch;
      P.c.forEach((c, j) => {
        let x = x0, y = y0;
        if (l.fan === 'v') { y = y0 + Math.min(j, P.d) * dd + Math.max(0, j - P.d) * dy; }
        else if (l.fan === 'h' || l.fan === 'hl') { const k = Math.max(0, j - (n - 3)); x = x0 + (l.fan === 'h' ? 1 : -1) * k * 0.22 * u; }
        else if (l.k === 'stock' && l.deal) { const grp = Math.floor(j / 10); x = x0 - grp * 0.16 * u; }
        else if (l.k === 'stock' || l.k === 'found' || l.k === 'cell') { const k = Math.floor(j / (this.o.mini ? 99 : 8)); x = x0 + k * 0.012 * u; y = y0 - k * 0.012 * u; }
        pos.set(c, { x, y, z: j + (l.z != null ? l.z : (l.k === 'tab' ? 100 : 10) + (l.k === 'waste' ? 50 : 0)), up: j >= P.d && l.k !== 'stock', pi: i, ci: j });
        bottom = Math.max(bottom, y + ch);
      });
      this.rects[i] = { x: x0, y: y0, w: u + (l.fan === 'h' ? 0.44 * u : 0), h: (l.fan === 'v' ? Math.max(bottom, y0 + ch) - y0 + ch * 0.6 : ch) };
    });
    const moved = [];
    pos.forEach((p, id) => {
      const e = this.cards.get(id), prev = this.pos.get(id);
      const changed = !prev || prev.x !== p.x || prev.y !== p.y;
      if (opt.deal && anim) {   // deal: every card flies from the stock / the top-left corner
        const sp = st.L.findIndex(l => l.k === 'stock'), from = sp >= 0 ? this.slots[sp] : null;
        const fx = from ? g.ox + st.L[sp].x * u : -u * 2, fy = from ? g.oy + st.L[sp].y * u : -ch;
        e.style.transition = 'none'; e.style.transform = `translate(${fx}px,${fy}px)`; e.classList.add('dn');
      }
      e._p = p;
      if (changed && prev && anim) moved.push(e);
    });
    if (opt.deal && anim) void this.layer.offsetWidth;
    let k = 0;
    pos.forEach((p, id) => {
      const e = this.cards.get(id);
      if (opt.deal && anim) { e.style.transition = ''; e.style.transitionDelay = (k++ * (opt.step || 22)) + 'ms'; e.querySelector('.in').style.transitionDelay = e.style.transitionDelay; }
      else if (e.style.transitionDelay) { e.style.transitionDelay = ''; e.querySelector('.in').style.transitionDelay = ''; }
      e.style.transform = `translate(${p.x}px,${p.y}px)`;
      e.style.zIndex = moved.includes(e) ? 900 + p.z : p.z;
      e.classList.toggle('dn', !p.up);
      e.classList.toggle('sel', !!this.sel && this.sel.pi === p.pi && p.ci >= this.sel.ci);
    });
    if (moved.length) { clearTimeout(this._zt); this._zt = setTimeout(() => moved.forEach(e => { if (e._p) e.style.zIndex = e._p.z; }), 420); }
    if (opt.deal && anim) setTimeout(() => this.cards.forEach(e => { e.style.transitionDelay = ''; e.querySelector('.in').style.transitionDelay = ''; }), (k + 2) * (opt.step || 22) + 500);
    this.pos = pos;
    if (!anim) { void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('noanim')); }
  }
  select(pi, ci) { this.sel = pi == null ? null : { pi, ci }; if (this.st) this.layout(true); }
  shake(pi, ci) {
    const P = this.st.p[pi]; if (!P) return;
    P.c.slice(ci).forEach(c => { const e = this.cards.get(c); if (!e) return; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); setTimeout(() => e.classList.remove('shake'), 450); });
  }
  hint(mv) {   // glow the cards to move and the place they go to
    this.clearHint();
    const mark = [];
    if (mv.s) { const sp = this.st.L.findIndex(l => l.k === 'stock'); mark.push(this.slots[sp]); const t = S.top(this.st.p[sp]); if (t != null) mark.push(this.cards.get(t)); }
    else {
      this.st.p[mv.f].c.slice(mv.i).forEach(c => mark.push(this.cards.get(c)));
      const T = this.st.p[mv.t]; mark.push(T.c.length ? this.cards.get(S.top(T)) : this.slots[mv.t]);
      if (T.c.length) mark[mark.length - 1].classList.add('hint-to');
    }
    mark.forEach(e => e && e.classList.add('hint'));
    this._hint = mark; this._ht = setTimeout(() => this.clearHint(), 2200);
  }
  clearHint() { clearTimeout(this._ht); (this._hint || []).forEach(e => e && e.classList.remove('hint', 'hint-to')); this._hint = null; }
  /* ---------- pointer ---------- */
  hitCard(e) { const c = e.target.closest('.cd'); return c && this.layer.contains(c) ? c : null; }
  down(e) {
    if (e.button > 0 || (this.o.canAct && !this.o.canAct())) return;
    const ce = this.hitCard(e), st = this.st; if (!st) return;
    this.clearHint();
    if (!ce) {
      const sl = e.target.closest('.slot'); if (!sl) { if (this.sel) { this.sel = null; this.layout(true); } return; }
      const pi = +sl.dataset.pi;
      if (st.L[pi].k === 'stock') { this.o.onStock && this.o.onStock(); return; }
      this.o.onPile && this.o.onPile(pi); return;
    }
    const p = ce._p; if (!p) return;
    const V = S.VARIANTS[st.v], L = st.L[p.pi];
    if (L.k === 'stock') { e.preventDefault(); this.o.onStock && this.o.onStock(); return; }
    if (!p.up) return;
    if (!V.canPick(st, p.pi, p.ci)) {
      if (this.sel) { this.o.onPile && this.o.onPile(p.pi); return; }
      this.shake(p.pi, p.ci); this.o.onBad && this.o.onBad(); return;
    }
    e.preventDefault(); if (this.o.onTouch) this.o.onTouch(p.pi);
    const els = st.p[p.pi].c.slice(p.ci).map(c => this.cards.get(c));
    const r = this.el.getBoundingClientRect();
    this.drag = { pi: p.pi, ci: p.ci, els, x0: e.clientX, y0: e.clientY, r, started: false, id: e.pointerId, base: els.map(x => ({ x: x._p.x, y: x._p.y })) };
    const mv = ev => this.move(ev), up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.up(ev); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started) {
      if (Math.hypot(dx, dy) < 6) return;
      d.started = true; this.el.classList.add('dragging');
      d.els.forEach((x, k) => { x.classList.add('lift'); x.style.zIndex = 2000 + k; });
      if (this.sel) { this.sel = null; }
      this.targets = this.st.p.map((_, t) => t !== d.pi && S.VARIANTS[this.st.v].canDrop(this.st, d.pi, d.ci, t));
      if (this.o.hl !== false && (!this.o.hlOn || this.o.hlOn())) this.targets.forEach((ok, t) => { if (ok) this.dropMark(t, true); });
    }
    d.els.forEach((x, k) => { x.style.transform = `translate(${d.base[k].x + dx}px,${d.base[k].y + dy}px)`; });
    d.dx = dx; d.dy = dy;
    const t = this.pickTarget(d); if (t !== d.over) { if (d.over != null) this.overMark(d.over, false); d.over = t; if (t != null) this.overMark(t, true); }
  }
  dropEl(t) { const T = this.st.p[t]; return T.c.length ? this.cards.get(S.top(T)) : this.slots[t]; }
  dropMark(t, on) { const e = this.dropEl(t); if (e) e.classList.toggle('can', on); }
  overMark(t, on) { const e = this.dropEl(t); if (e) e.classList.toggle('over', on); }
  pickTarget(d) {
    const u = this.g.u, ch = u * S.CH, x = d.base[0].x + d.dx, y = d.base[0].y + d.dy;
    let best = null, ba = 0;
    this.targets.forEach((ok, t) => {
      if (!ok) return;
      const R = this.rects[t], T = this.st.p[t];
      let rx = R.x, ry = R.y, rw = u, rh = ch;
      if (T.c.length) { const e = this.cards.get(S.top(T)); rx = e._p.x; ry = e._p.y; }
      const ox = Math.max(0, Math.min(x + u, rx + rw) - Math.max(x, rx)), oy = Math.max(0, Math.min(y + ch, ry + rh + (this.st.L[t].fan === 'v' ? ch * .5 : 0)) - Math.max(y, ry));
      const a = ox * oy; if (a > ba) { ba = a; best = t; }
    });
    return ba > u * ch * 0.08 ? best : null;
  }
  up(e) {
    const d = this.drag; this.drag = null; if (!d) return;
    this.el.classList.remove('dragging');
    d.els.forEach(x => x.classList.remove('lift'));
    const tgt = d.started && this.targets ? this.pickTarget(d) : null;
    if (this.targets) this.targets.forEach((ok, t) => { if (ok) { this.dropMark(t, false); this.overMark(t, false); } });
    this.targets = null;
    if (!d.started) {
      const now = Date.now(), dbl = this.lastTap && this.lastTap.pi === d.pi && this.lastTap.ci === d.ci && now - this.lastTap.t < 330;
      this.lastTap = { pi: d.pi, ci: d.ci, t: now };
      if (dbl && this.o.onDouble) { this.lastTap = null; this.o.onDouble(d.pi, d.ci); }
      else this.o.onTap && this.o.onTap(d.pi, d.ci);
      return;
    }
    const t = tgt;
    if (t != null && this.o.onMove && this.o.onMove({ f: d.pi, i: d.ci, t }, true) !== false) return;
    this.layout(true);   // back to where it was
  }
}
Table.faceHtml = faceHtml; Table.RK = RK; Table.PIPS = PIPS; Table.COURT_DIR = { classic: '', antique: 'antique/', flat: 'flat/', gangsta: 'gangsta/' }; Table.FULL_DECKS = ['flat', 'gangsta'];   // whole-face image decks (all 52 cards)
Table.all = new Set();
Table.applyFace = el => { const f = document.documentElement.dataset.face || 'classic'; (el ? [el] : [...Table.all].map(x => x.el)).forEach(e => { e.classList.toggle('face-large', f === 'large'); e.classList.toggle('face-four', f === 'four'); }); };
window.Table = Table;
})();
