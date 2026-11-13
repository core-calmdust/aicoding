// shared/focusgate.js — games stop while the window is not in front (2026-11-10, common rule).
// When the tab is hidden OR the window loses focus (another window / app in front), every animation loop of the page
// stops: requestAnimationFrame callbacks are held, and performance.now() stands still, so loops that measure time by it
// (physics, timers, shooters, AI animations) see no time pass and carry on exactly where they were when focus returns.
// Date.now() is left alone (network, saves, server clocks); timers built on Date.now() pause themselves (each game).
// Load it first, before the game's own scripts.  ?nofreeze turns it off (tests).
// Quiet DOM (2026-11-10, battery): classList.add of a class already there, classList.remove of one that is absent, and
// setAttribute / .title with the value already set change nothing — but they still make MutationObserver records, and the
// pages' layout observers (headerbar, the 3D skin, the card bar) then woke up and re-measured several times a second while
// nothing happened (a 250 ms clock tick re-adding 'on' …). Those no-op writes are skipped here; real changes go through as before.
(function () {
  try {
    const T = DOMTokenList.prototype, add = T.add, rem = T.remove;
    T.add = function () { const n = []; for (let i = 0; i < arguments.length; i++) { const c = arguments[i]; if (typeof c !== 'string' || !c || /\s/.test(c) || !this.contains(c)) n.push(c); } if (n.length) add.apply(this, n); };
    T.remove = function () { const n = []; for (let i = 0; i < arguments.length; i++) { const c = arguments[i]; if (typeof c !== 'string' || !c || /\s/.test(c) || this.contains(c)) n.push(c); } if (n.length) rem.apply(this, n); };
    const E = Element.prototype, sa = E.setAttribute;
    E.setAttribute = function (k, v) { if (this.getAttribute(k) === String(v)) return; return sa.call(this, k, v); };
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title');
    if (d && d.set) Object.defineProperty(HTMLElement.prototype, 'title', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { if (this.getAttribute('title') === String(v)) return; d.set.call(this, v); } });
  } catch (e) {}
})();
(function () {
  if (window.__focusGate) return;
  window.__focusGate = { frozen: false };
  if (/[?&]nofreeze\b/.test(location.search)) return;
  const raf0 = window.requestAnimationFrame && window.requestAnimationFrame.bind(window), caf0 = window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window);
  const P = window.performance; if (!raf0 || !P || !P.now) return;
  const pn = P.now.bind(P);
  let frozen = false, off = 0, since = 0, nid = 2e9;
  const held = new Map();
  try { P.now = () => (frozen ? since : pn()) - off; } catch (e) { return; }
  window.requestAnimationFrame = cb => { if (!frozen) return raf0(t => cb(t - off)); const id = ++nid; held.set(id, cb); return id; };
  window.cancelAnimationFrame = id => { if (held.delete(id)) return; caf0(id); };
  const flush = () => { const cbs = [...held.values()]; held.clear(); cbs.forEach(cb => raf0(t => cb((frozen ? since : t) - off))); };
  function freeze() { if (frozen) return; frozen = true; since = pn(); window.__focusGate.frozen = true; }
  function thaw() { if (!frozen) return; off += pn() - since; frozen = false; window.__focusGate.frozen = false; flush(); }
  // a live online game (body.in-online, every game's online UI) never freezes: the opponent's moves, the clocks and the 3D board
  // keep up while another window is in front (2026-11-12)
  const live = () => !!(document.body && document.body.classList.contains('in-online'));
  // while the game is starting up (the page still loading, the full version's 「よみこみちゅう」 screen up — also the portal's, opening a
  // game) nothing freezes: the loading finishes in the background (2026-11-13)
  const loading = () => { const h = document.documentElement; return document.readyState !== 'complete' || (h.classList.contains('atlas-skin') && !h.classList.contains('atlas-ready')) || !!document.querySelector('.atlas-load:not(.out)'); };
  const out = () => !live() && !loading() && (document.hidden || (document.hasFocus && !document.hasFocus()));
  const check = () => (out() ? freeze() : thaw());
  addEventListener('blur', () => setTimeout(check, 0)); addEventListener('focus', check); addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', check);
  // a resize while frozen (a side panel opening, the window moved between screens) draws one still frame: time stays frozen
  addEventListener('resize', () => { if (frozen) flush(); });
  setTimeout(check, 0);
  // any click / key on the page means it is in front again
  addEventListener('pointerdown', check, true); addEventListener('keydown', check, true);
  addEventListener('pointermove', () => { if (frozen) check(); }, true);   // (the pointer moving over the page while it is in front)
  setInterval(check, 500);   // a safety net: a missed focus event can never leave the page stuck (and a loading that ended while the window was behind freezes now)
})();
