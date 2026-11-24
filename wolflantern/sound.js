/* 狼影灯 — 音（すべて合成。読み込むファイルなし）。鐘・遠吠え・風・糸を張る音・頁をめくる音 */
(function (root) {
  'use strict';
  let ac = null, master = null, wind = null, on = true;
  try { on = localStorage.getItem('wolflantern-snd') !== '0'; } catch (e) {}
  function ctx() {
    if (!on) return null;
    if (!ac) {
      const C = root.AudioContext || root.webkitAudioContext; if (!C) return null;
      ac = new C(); master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
      document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (on) ac.resume(); });
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume();
    return ac;
  }
  function noiseBuf(a, sec) { const b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.2; } return b; }
  // a cracked bronze bell: inharmonic partials, one slightly sour
  function bell(vol, when) {
    const a = ctx(); if (!a) return; const t = a.currentTime + (when || 0);
    [[.56, 1], [.92, .7], [1.19, .55], [1.71, .35], [2.0, .3], [2.74, .2], [3.76, .12]].forEach(([r, g], i) => {
      const o = a.createOscillator(), v = a.createGain(); o.frequency.value = 196 * r * (i === 3 ? 1.013 : 1);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g * (vol || .5) * .4, t + .01); v.gain.exponentialRampToValueAtTime(.0005, t + 4.5 - i * .35);
      o.connect(v); v.connect(master); o.start(t); o.stop(t + 5);
    });
  }
  // a far-off howl: a sine that rises, wavers and falls, through a soft filter
  function howl(when) {
    const a = ctx(); if (!a) return; const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), o2 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), v = a.createGain(), f = a.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'sine'; f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.value = 900;
    o.frequency.setValueAtTime(330, t); o.frequency.linearRampToValueAtTime(520, t + .7); o.frequency.linearRampToValueAtTime(560, t + 1.9); o.frequency.exponentialRampToValueAtTime(300, t + 3);
    o2.frequency.setValueAtTime(330, t); o2.frequency.linearRampToValueAtTime(520, t + .7); o2.frequency.linearRampToValueAtTime(560, t + 1.9); o2.frequency.exponentialRampToValueAtTime(300, t + 3);
    lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.06, t + .5); v.gain.linearRampToValueAtTime(.05, t + 2.4); v.gain.linearRampToValueAtTime(0, t + 3.1);
    const v2 = a.createGain(); v2.gain.value = 2.2;
    o.connect(f); f.connect(v); o2.connect(v2); v2.connect(v); v.connect(master);
    [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + 3.2); });
  }
  function windOn(level) {
    const a = ctx(); if (!a) return; if (wind) { wind.g.gain.linearRampToValueAtTime(level, a.currentTime + 1.5); return; }
    const s = a.createBufferSource(); s.buffer = noiseBuf(a, 4); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .09; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency);
    const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(level, a.currentTime + 2);
    s.connect(f); f.connect(g); g.connect(master); s.start(); lfo.start();
    wind = { s, g, lfo };
  }
  function windOff() { if (!wind || !ac) return; wind.g.gain.linearRampToValueAtTime(0, ac.currentTime + 1); const w = wind; wind = null; setTimeout(() => { try { w.s.stop(); w.lfo.stop(); } catch (e) {} }, 1200); }
  function blip(freq, len, type, vol) {
    const a = ctx(); if (!a) return; const t = a.currentTime;
    const o = a.createOscillator(), v = a.createGain(); o.type = type || 'triangle'; o.frequency.value = freq;
    v.gain.setValueAtTime(vol || .08, t); v.gain.exponentialRampToValueAtTime(.0004, t + (len || .2));
    o.connect(v); v.connect(master); o.start(t); o.stop(t + (len || .2) + .05);
  }
  const pluck = i => blip(220 * Math.pow(2, (i % 7) / 12), .6, 'triangle', .07);   // a thread pulled tight
  const page = () => { const a = ctx(); if (!a) return; const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(); s.buffer = noiseBuf(a, .25); f.type = 'highpass'; f.frequency.value = 1800; v.gain.setValueAtTime(.12, a.currentTime); v.gain.exponentialRampToValueAtTime(.001, a.currentTime + .2); s.connect(f); f.connect(v); v.connect(master); s.start(); };
  const ok = () => { blip(660, .25, 'sine', .06); setTimeout(() => blip(990, .4, 'sine', .05), 120); };
  const thud = () => blip(70, .6, 'sine', .25);
  function set(v) { on = !!v; try { localStorage.setItem('wolflantern-snd', on ? '1' : '0'); } catch (e) {} if (!on) { windOff(); if (ac) ac.suspend(); } else if (ac) ac.resume(); }
  root.WLSound = { bell, howl, windOn, windOff, pluck, page, ok, thud, set, get on() { return on; }, unlock: ctx };
})(window);
