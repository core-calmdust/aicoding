/* 狼影灯 — 音。効果音（鐘・遠吠え・風・糸・頁・会話音）は合成、音楽は audio/ の2曲（物語・集会）。
   効果音と音楽は別の経路で音量を分け、最後に圧縮器を通して割れないようにする。 */
(function (root) {
  'use strict';
  let ac = null, master = null, sfx = null, bgm = null, wind = null, on = true, musicOn = true, talkOn = true;
  try { on = localStorage.getItem('wolflantern-snd') !== '0'; musicOn = localStorage.getItem('wolflantern-bgm') !== '0'; talkOn = localStorage.getItem('wolflantern-talk') !== '0'; } catch (e) {}
  const SFX = 1.0, BGM = .34;
  let paused = false;
  function ctx() {
    if (!on || paused) return null;
    if (!ac) {
      const C = root.AudioContext || root.webkitAudioContext; if (!C) return null;
      ac = new C(); master = ac.createGain(); master.gain.value = .95;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .25;
      master.connect(comp); comp.connect(ac.destination);
      sfx = ac.createGain(); sfx.gain.value = SFX; sfx.connect(master);
      bgm = ac.createGain(); bgm.gain.value = musicOn ? BGM : 0; bgm.connect(master);
      if (want) { const w = want; want = null; music(w.name, w.level); }
      loadSample('bell'); loadSample('wolf'); loadSample('door');
      document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (on && !paused) ac.resume(); });
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume();
    return ac;
  }
  function noiseBuf(a, sec) { const b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.2; } return b; }
  // a cracked bronze bell: inharmonic partials, one slightly sour
  // the music steps back while a bell rings, and comes back when the last one fades
  let duckUntil = 0;
  function duck(until) {
    if (!bgm || !ac) return;
    const now = ac.currentTime, back = Math.max(duckUntil, until);
    bgm.gain.cancelScheduledValues(now);
    bgm.gain.setTargetAtTime(musicOn ? BGM * .18 : 0, now, .12);
    bgm.gain.setTargetAtTime(musicOn ? BGM : 0, back, .9);
    duckUntil = back;
  }
  // the recorded bell and howl (audio/); the synthesised ones below stand in until they load
  const SAMPLE = { bell: 'audio/bell.mp3?v=1', wolf: 'audio/wolf.mp3?v=1', door: 'audio/door.mp3?v=1' }, smp = {};
  function loadSample(k) { if (!smp[k] && ac) smp[k] = fetch(SAMPLE[k]).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).then(buf => (smp[k + ':buf'] = buf)).catch(() => { delete smp[k]; return null; }); return smp[k]; }
  function playSample(k, gain, t) {
    const buf = smp[k + ':buf']; if (!buf) { loadSample(k); return false; }
    const s = ac.createBufferSource(), v = ac.createGain(); s.buffer = buf; v.gain.value = gain;
    s.connect(v); v.connect(sfx); s.start(t); return buf.duration;
  }
  function bell(vol, when) {
    const a = ctx(); if (!a) return; const t = a.currentTime + (when || 0);
    const d = playSample('bell', (vol || .5) * 1.3, t);   // the recording is loudness-matched (-18 LUFS): a bell sits above the music
    if (d) { duck(t + d * .8); return; }
    duck(t + 4.2);
    [[.56, 1], [.92, .7], [1.19, .55], [1.71, .35], [2.0, .3], [2.74, .2], [3.76, .12]].forEach(([r, g], i) => {
      const o = a.createOscillator(), v = a.createGain(); o.frequency.value = 196 * r * (i === 3 ? 1.013 : 1);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g * (vol || .5) * .62, t + .01); v.gain.exponentialRampToValueAtTime(.0005, t + 4.5 - i * .35);
      o.connect(v); v.connect(sfx); o.start(t); o.stop(t + 5);
    });
  }
  // a far-off howl: a sine that rises, wavers and falls, through a soft filter
  function howl(when) {
    const a = ctx(); if (!a) return; const t = a.currentTime + (when || 0);
    const d = playSample('wolf', .75, t);
    if (d) { duck(t + d * .85); return; }
    const o = a.createOscillator(), o2 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), v = a.createGain(), f = a.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'sine'; f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.value = 900;
    o.frequency.setValueAtTime(330, t); o.frequency.linearRampToValueAtTime(520, t + .7); o.frequency.linearRampToValueAtTime(560, t + 1.9); o.frequency.exponentialRampToValueAtTime(300, t + 3);
    o2.frequency.setValueAtTime(330, t); o2.frequency.linearRampToValueAtTime(520, t + .7); o2.frequency.linearRampToValueAtTime(560, t + 1.9); o2.frequency.exponentialRampToValueAtTime(300, t + 3);
    lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.13, t + .5); v.gain.linearRampToValueAtTime(.11, t + 2.4); v.gain.linearRampToValueAtTime(0, t + 3.1);
    const v2 = a.createGain(); v2.gain.value = 2.2;
    o.connect(f); f.connect(v); o2.connect(v2); v2.connect(v); v.connect(sfx);
    [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + 3.2); });
  }
  // an old wooden door, slowly opening: the wolf is coming (a recording only; silent until it loads)
  function door(when, vol) { const a = ctx(); if (!a) return; playSample('door', (vol || 1) * .45, a.currentTime + (when || 0)); }
  function windOn(level) {
    const a = ctx(); if (!a) return; if (wind) { wind.g.gain.linearRampToValueAtTime(level * 1.8, a.currentTime + 1.5); return; }
    const s = a.createBufferSource(); s.buffer = noiseBuf(a, 4); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .09; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency);
    const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(level * 1.8, a.currentTime + 2);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(); lfo.start();
    wind = { s, g, lfo };
  }
  function windOff() { if (!wind || !ac) return; wind.g.gain.linearRampToValueAtTime(0, ac.currentTime + 1); const w = wind; wind = null; setTimeout(() => { try { w.s.stop(); w.lfo.stop(); } catch (e) {} }, 1200); }
  function blip(freq, len, type, vol) {
    const a = ctx(); if (!a) return; const t = a.currentTime;
    const o = a.createOscillator(), v = a.createGain(); o.type = type || 'triangle'; o.frequency.value = freq;
    v.gain.setValueAtTime(vol || .08, t); v.gain.exponentialRampToValueAtTime(.0004, t + (len || .2));
    o.connect(v); v.connect(sfx); o.start(t); o.stop(t + (len || .2) + .05);
  }
  const pluck = i => blip(220 * Math.pow(2, (i % 7) / 12), .6, 'triangle', .16);   // a thread pulled tight
  const page = () => { const a = ctx(); if (!a) return; const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(); s.buffer = noiseBuf(a, .25); f.type = 'highpass'; f.frequency.value = 1300; v.gain.setValueAtTime(.6, a.currentTime); v.gain.exponentialRampToValueAtTime(.001, a.currentTime + .2); s.connect(f); f.connect(v); v.connect(sfx); s.start(); };
  const ok = () => { blip(660, .25, 'sine', .14); setTimeout(() => blip(990, .4, 'sine', .12), 120); };
  const thud = () => { blip(70, .6, 'sine', .5); blip(140, .25, 'triangle', .12); };
  /* ---------- talk: a short voiced blip per few letters, pitched by who is speaking ---------- */
  const NOISE = {};
  let lastTalk = 0;
  function talk(vo) {
    if (!talkOn || !vo) return; const a = ctx(); if (!a) return;   // narration stays silent
    const t = a.currentTime; if (t - lastTalk < .06) return; lastTalk = t;
    // one plain, soft blip: the speaker's pitch, a hair of variation
    const o = a.createOscillator(), v = a.createGain();
    // pitch: the voice's height squeezed into a narrow band, so no one sounds much louder than another
    const f = 280 + (vo.f - 108) * 1.1;
    o.type = 'sine'; o.frequency.value = f * Math.pow(2, (Math.random() - .5) * (vo.range || 1) / 12);
    const vol = .065 * Math.pow(420 / f, .45);   // ears hear high notes louder: lower ones get a little more
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol, t + .006); v.gain.exponentialRampToValueAtTime(.0005, t + .05);
    o.connect(v); v.connect(sfx); o.start(t); o.stop(t + .06);
  }

  /* ---------- music: two tracks, crossfaded at their ends so they loop without a seam ---------- */
  const TRACK = { story: { src: 'audio/story.mp3?v=1', from: 0, to: 108.2 }, meeting: { src: 'audio/meeting.mp3?v=1', from: .6, to: 92.6 }, gameover: { src: 'audio/gameover.mp3?v=1', from: 0, to: 149.3 } };
  const bufs = {}; let cur = null, want = null;
  function load(name) {
    if (!bufs[name]) bufs[name] = fetch(TRACK[name].src).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).catch(() => { delete bufs[name]; return null; });
    return bufs[name];
  }
  function music(name, level) {
    level = level == null ? 1 : level;
    if (!ac) { want = name ? { name, level } : null; return; }
    const a = ac, now = a.currentTime;
    if (cur && cur.name === name) { cur.g.gain.cancelScheduledValues(now); cur.g.gain.setTargetAtTime(level, now, .7); return; }
    if (cur) { const c = cur; c.stopped = true; clearTimeout(c.timer); c.g.gain.cancelScheduledValues(now); c.g.gain.setTargetAtTime(0, now, .6); setTimeout(() => { c.srcs.forEach(x => { try { x.stop(); } catch (e) {} }); c.g.disconnect(); }, 4000); }
    cur = null;
    if (!name || !TRACK[name]) return;
    const g = a.createGain(); g.gain.value = 0; g.connect(bgm);
    const c = { name, g, srcs: [], stopped: false }; cur = c;
    load(name).then(buf => {
      if (!buf || c.stopped) return;
      c.buf = buf; g.gain.setTargetAtTime(level, a.currentTime, .8);
      play(c, a.currentTime + .05, true);
    });
  }
  function play(c, t, first) {
    const a = ac, T = TRACK[c.name], X = 2.5, from = T.from, to = Math.min(T.to, c.buf.duration), D = to - from;
    t = Math.max(t, a.currentTime + .02);
    const s0 = a.createBufferSource(), v = a.createGain();
    s0.buffer = c.buf; s0.connect(v); v.connect(c.g);
    v.gain.setValueAtTime(first ? 1 : 0, t); if (!first) v.gain.linearRampToValueAtTime(1, t + X);
    v.gain.setValueAtTime(1, t + D - X); v.gain.linearRampToValueAtTime(0, t + D);
    s0.start(t, from, D + .05);
    c.srcs = c.srcs.filter(x => x.end > a.currentTime).concat(Object.assign(s0, { end: t + D }));
    const next = t + D - X;
    c.timer = setTimeout(() => { if (!c.stopped) play(c, next, false); }, Math.max(0, (next - a.currentTime - 1.5) * 1000));
  }
  function setMusic(v) { musicOn = !!v; try { localStorage.setItem('wolflantern-bgm', musicOn ? '1' : '0'); } catch (e) {} if (bgm && ac) { bgm.gain.cancelScheduledValues(ac.currentTime); bgm.gain.setTargetAtTime(musicOn ? BGM : 0, ac.currentTime, .3); duckUntil = 0; } }
  function setTalk(v) { talkOn = !!v; try { localStorage.setItem('wolflantern-talk', talkOn ? '1' : '0'); } catch (e) {} }

  // the window lost focus: everything stops until it comes back
  function pause(p) { paused = !!p; if (!ac) return; if (paused) ac.suspend(); else if (on && !document.hidden) ac.resume(); }
  function set(v) { on = !!v; try { localStorage.setItem('wolflantern-snd', on ? '1' : '0'); } catch (e) {} if (!on) { windOff(); if (ac) ac.suspend(); } else if (ac) ac.resume(); }
  root.WLSound = { pause, bell, howl, door, windOn, windOff, pluck, page, ok, thud, talk, music, set, setMusic, setTalk, get on() { return on; }, get musicOn() { return musicOn; }, get talkOn() { return talkOn; }, get bgmLevel() { return bgm ? bgm.gain.value : null; }, unlock: ctx };
})(window);
