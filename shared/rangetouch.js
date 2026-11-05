// RangeTouch — sliders (<input type=range>) that follow a finger on phones.
// The level sliders carry touch-action:pan-y so a vertical swipe still scrolls the dialog, but iOS Safari then
// refuses to drag the thumb sideways. Here a horizontal swipe on a slider moves it (value from the finger's x,
// 'input' while dragging, 'change' at the end); a vertical swipe is left to the page, and a tap jumps there.
(function () {
'use strict';
if (window.__rangeTouch) return; window.__rangeTouch = 1;
let el = null, x0 = 0, y0 = 0, mode = '', moved = false;
const isRange = t => t && t.tagName === 'INPUT' && t.type === 'range' && !t.disabled;
function setFrom(x) {
  const r = el.getBoundingClientRect(), min = +el.min || 0, max = el.max === '' ? 100 : +el.max, step = el.step === 'any' ? 0 : (+el.step || 1);
  const th = Math.min(28, r.height);   // the thumb's travel is inset by about half its width at each end
  let k = (x - r.left - th / 2) / Math.max(1, r.width - th);
  k = Math.max(0, Math.min(1, k)); if (getComputedStyle(el).direction === 'rtl') k = 1 - k;
  let v = min + k * (max - min); if (step) v = min + Math.round((v - min) / step) * step;
  v = Math.max(min, Math.min(max, v));
  if (String(v) !== el.value) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); moved = true; }
}
document.addEventListener('touchstart', e => {
  const t = e.target; if (!isRange(t) || e.touches.length !== 1) { el = null; return; }
  el = t; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; mode = ''; moved = false;
}, { passive: true, capture: true });
document.addEventListener('touchmove', e => {
  if (!el || e.touches.length !== 1) return;
  const p = e.touches[0], dx = p.clientX - x0, dy = p.clientY - y0;
  if (!mode) { if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; mode = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; }
  if (mode !== 'x') return;
  if (e.cancelable) e.preventDefault();
  setFrom(p.clientX);
}, { passive: false, capture: true });
document.addEventListener('touchend', e => {
  if (!el) return;
  if (!mode && e.changedTouches[0]) { setFrom(e.changedTouches[0].clientX); if (e.cancelable) e.preventDefault(); }   // a tap jumps there
  if (moved) el.dispatchEvent(new Event('change', { bubbles: true }));
  el = null;
}, { passive: false, capture: true });
document.addEventListener('touchcancel', () => { el = null; }, { capture: true });
})();
