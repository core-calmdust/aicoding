// CountTick — time-signal beeps for byoyomi / clocks (世界のボドゲ大全 common spec).
// When a clock reaches its last 5 seconds it beeps once per second: 5, 4, 3, 2, 1 ("ピッ、ピッ").
//
// Usage (call from the game's clock update, as often as you like — each second beeps only once):
//   CountTick.feed(msLeft, key)      // key: anything identifying this countdown (e.g. 'me', 'opp')
//   CountTick.reset(key)             // a new countdown starts for that key (new move, new period)
//   CountTick.setMuted(() => !settings.sound)   // optional: follow the game's sound setting
//   CountTick.only(() => boolean)    // optional: extra condition (e.g. only while it is my turn)
(function () {
'use strict';
let ctx = null, muted = () => false, cond = () => true;
const last = new Map();
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// unlock audio on the first user gesture (mobile browsers)
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { const c = ac(); if (c) { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } }, { once: true, passive: true }));
function beep(sec) {
  if (muted()) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + .01, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.value = sec === 1 ? 1320 : 1000;   // same "ピッ", a touch higher on the last second
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .008);
  g.gain.setValueAtTime(.22, t + .085); g.gain.exponentialRampToValueAtTime(.0005, t + .14);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .16);
}
function feed(ms, key) {
  key = key === undefined ? '_' : key;
  if (!(ms > 0)) { last.delete(key); return; }
  const s = Math.ceil(ms / 1000 - 1e-6);
  if (s > 5) { last.set(key, 6); return; }   // armed: the next seconds will beep
  const prev = last.get(key);
  if (prev === s) return;
  last.set(key, s);
  // first sample of a countdown already below 5s (page just opened, resumed game): wait for the next second
  if (prev === undefined && ms % 1000 > 0 && ms % 1000 < 850) return;
  if (cond()) beep(s);
}
window.CountTick = {
  feed, beep,
  reset(key) { if (key === undefined) last.clear(); else last.delete(key); },
  setMuted(fn) { muted = typeof fn === 'function' ? fn : () => !!fn; },
  only(fn) { cond = typeof fn === 'function' ? fn : () => true; },
};
})();
