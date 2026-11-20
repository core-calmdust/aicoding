/* AtlasVis — "is this element on screen?" without IntersectionObserver (2026-11-21).
   Measured: while any IntersectionObserver is observing, Chrome runs a main-thread frame for every frame of every running
   animation — also the ones the compositor moves by itself (the news ticker, the hero's pieces, a skin's scene) — so the
   portal styled a frame 60 times a second for as long as anything moved. With no observer those animations cost the main
   thread nothing. The portal's few visibility questions (the hero, the rare cards' light, the きせかえ cells, the gacha machine)
   are answered here from the elements' boxes: checked on scroll (any scroller), resize, a change of the page's height, a
   tab change (AtlasVis.check()), after a tap / key / transition, and once a second as a net.
     const o = AtlasVis.observer((el, visible) => { … }, { margin: 80 });  o.observe(el);  o.unobserve(el);  o.disconnect();
   The callback runs once for a new element with its state, then whenever it changes; an element taken out of the page is
   reported not visible and dropped. Clipping by scrolling ancestors counts (a cell scrolled out of its list is not visible). */
(function () {
  'use strict';
  if (window.AtlasVis) return;
  const items = new Map();   // el → { o, v, clips }
  const clipsOf = el => { const a = []; for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX + s.overflowY)) a.push(p); } return a; };
  function seen(el, it) {
    if (!el.getClientRects().length) return false;
    const m = it.o.m, r = el.getBoundingClientRect();
    let t = r.top - m, b = r.bottom + m, l = r.left - m, rt = r.right + m;
    if (b <= 0 || t >= innerHeight || rt <= 0 || l >= innerWidth) return false;
    if (!it.clips) it.clips = clipsOf(el);
    for (const c of it.clips) { const q = c.getBoundingClientRect(); if (b <= q.top || t >= q.bottom || rt <= q.left || l >= q.right) return false; }
    return true;
  }
  let q = 0;
  function run() {
    q = 0;
    items.forEach((it, el) => {
      const on = el.isConnected && seen(el, it);
      if (on !== it.v) { it.v = on; try { it.o.cb(el, on); } catch (e) { /* */ } }
      if (!el.isConnected) items.delete(el);
    });
  }
  const check = () => { if (!q && items.size) q = requestAnimationFrame(run); };
  addEventListener('scroll', check, { passive: true, capture: true });
  addEventListener('resize', check); addEventListener('pageshow', check); addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  // after an action (a sheet, a tab or a drawer opened by a tap, a transition's end): look again now and shortly after
  let late = 0; const acted = () => { check(); clearTimeout(late); late = setTimeout(check, 140); };
  ['click', 'pointerup', 'keyup', 'transitionend', 'animationend'].forEach(k => addEventListener(k, acted, { passive: true, capture: true }));
  let ro = null; const watchBody = () => { if (ro || !document.body || !window.ResizeObserver) return; ro = new ResizeObserver(check); ro.observe(document.body); };
  setInterval(() => { if (!document.hidden && items.size) run(); }, 1000);
  function observer(cb, opt) {
    const o = { cb, m: (opt && opt.margin) || 0 };
    return {
      observe(el) { if (!el) return; watchBody(); items.set(el, { o, v: null, clips: null }); check(); },
      unobserve(el) { const it = items.get(el); if (it && it.o === o) items.delete(el); },
      disconnect() { items.forEach((it, el) => { if (it.o === o) items.delete(el); }); },
    };
  }
  window.AtlasVis = { observer, check, now: run };

  /* Lazy pictures the same way (2026-11-21). A <img loading="lazy"> that has not loaded yet — below the fold, or in a tab that
     is not shown — is watched by the browser's own lazy-load observer, and that has the same cost as an IntersectionObserver
     (measured: one pending lazy picture anywhere keeps the per-frame main-thread work going). So every lazy picture is taken
     over here: its src waits in data-lz and is put back when the picture comes within 800px of the screen (or is already
     there). Pictures in a hidden tab wait as before. A src set by the page meanwhile wins. */
  const LZ = observer((img, on) => { if (!on) return; LZ.unobserve(img); const s = img.getAttribute('data-lz'); img.removeAttribute('data-lz'); if (s != null && !img.getAttribute('src')) img.src = s; }, { margin: 800 });
  function adopt(img) {
    if (img.__lz) return;
    const lz = img.getAttribute('data-lz'), src = img.getAttribute('src');
    if (lz != null && !src) { img.__lz = 1; LZ.observe(img); return; }   // (a copy of a waiting picture)
    if (img.getAttribute('loading') !== 'lazy') return;
    img.__lz = 1;
    if (!src || (img.complete && img.naturalWidth)) { img.loading = 'eager'; return; }
    img.setAttribute('data-lz', src); img.removeAttribute('src'); img.loading = 'eager'; LZ.observe(img);
  }
  const SEL = 'img[loading=lazy],img[data-lz]';
  const scan = n => { if (n.nodeType !== 1) return; if (n.tagName === 'IMG') adopt(n); else if (n.firstElementChild) n.querySelectorAll(SEL).forEach(adopt); };
  const start = () => { scan(document.body); new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) scan(n); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
