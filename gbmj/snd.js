// 国標麻将の音：大百科のリーチ麻雀（riichi/ ＝ mahjong/app.js の SND）と同じ録音・同じ鳴らし方・同じ音量の扱い。
// mahjong/app.js の SND の中身を、国標で使う分だけ写したもの（あちらは閉じた関数の中なので読み込めない）。
// 効果音：牌（tile1〜3）・点棒（stick1〜3）・声（チー・ポン・カン・ツモ・ロン）。BGM：大百科のリーチ麻雀と同じ笛の曲（bgm-flute）と得点の短い曲（score-jingle）。
// 音量：効果音 seP・BGM bgQ（0〜100、既定 80）、それぞれのミュート seOn・bgOn、全体 snd（riichi と同じ鍵の名前）。
(function () {
'use strict';
const ASSETS = window.JANKA_ASSETS || '../images/mahjong/';
window.GBSnd = function (S) {        // S()：設定（DB.set）を返す関数
  const VKEY = k => k === 'bg' ? 'bgQ' : k + 'P', VBASE = k => k === 'bg' ? 64 : 80;
  function volP(k) { const c = v => Math.max(0, Math.min(100, Math.round(v))); const p = S()[VKEY(k)]; return p != null ? c(+p) : 80; }
  let ac = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state !== 'running' && ac.state !== 'closed' && !document.hidden) ac.resume(); return ac; };
  const on = () => S().snd !== false && !document.hidden;
  let seB = null, bgB = null;
  const vol = k => (S()[k + 'On'] === false ? 0 : volP(k) / VBASE(k));
  const seOut = a => { if (!seB) { seB = a.createGain(); seB.gain.value = vol('se'); seB.connect(a.destination); } return seB; };
  const bgOut = a => { if (!bgB) { bgB = a.createGain(); bgB.gain.value = vol('bg'); bgB.connect(a.destination); } return bgB; };
  function levels() { const a = ac; if (!a) return; const t = a.currentTime;
    for (const [B, k] of [[seOut(a), 'se'], [bgOut(a), 'bg']]) { B.gain.cancelScheduledValues(t); B.gain.setValueAtTime(B.gain.value, t); B.gain.linearRampToValueAtTime(vol(k), t + .12); } }
  function tone(f, d, type = 'sine', g = .15, delay = 0, f2) {
    const a = ctx(); if (!a || !on()) return;
    const o = a.createOscillator(), v = a.createGain(), t0 = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(g, t0 + .01); v.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(v).connect(seOut(a)); o.start(t0); o.stop(t0 + d + .05);
  }
  function click(g = .35) {
    const a = ctx(); if (!a || !on()) return;
    const n = a.createBuffer(1, a.sampleRate * .05, a.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const s = a.createBufferSource(); s.buffer = n;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.2;
    const v = a.createGain(); v.gain.value = g;
    s.connect(f).connect(v).connect(seOut(a)); s.start();
    tone(1500, .05, 'triangle', .05);
  }
  // 録音：最初に使う前に裏で1つずつ読む（mahjong と同じ）
  const BUF = {}, NAMES = ['tile1', 'tile2', 'tile3', 'stick1', 'stick2', 'stick3', 'v-tsumo', 'v-ron', 'v-pon', 'v-chi', 'v-kan'];
  let loading = false;
  const TRK = {
    flute: { file: 'bgm-flute', vol: .166, restart: false },          // 対局中（大百科のリーチ麻雀と同じ曲・同じ音量）
    score: { file: 'score-jingle', vol: .35, restart: true, once: true },   // 和了の結果
  };
  for (const k in TRK) Object.assign(TRK[k], { url: null, el: null, g: null, on: false, t: 0 });
  const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 600 }) : setTimeout(f, 60));
  function load() { if (loading) return; loading = true; const a = ctx(); let i = 0;
    const next = () => { if (i >= NAMES.length) return; const n = NAMES[i++];
      fetch(`${ASSETS}snd/${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => a ? new Promise((ok, ng) => a.decodeAudioData(b, ok, ng)) : null)
        .then(buf => { if (buf) BUF[n] = buf; }).catch(() => {}).finally(() => idle(next)); };
    idle(next); }
  function fetchTrk(k) { const B = TRK[k]; if (!B || B.url || B.el || B.getting) return; B.getting = true;
    fetch(`${ASSETS}snd/${B.file}.mp3`).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { if (!B.el) { B.url = URL.createObjectURL(b); if (ac) prep(B); } }).catch(() => {}).finally(() => { B.getting = false; }); }
  function prep(B) { const a = ac; if (!a || B.el) return; if (!B.url) B.url = `${ASSETS}snd/${B.file}.mp3`;
    B.el = new Audio(B.url); B.el.loop = !B.once; B.el.preload = 'auto';
    if (B.once) B.el.addEventListener('ended', () => { B.on = false; });
    try { const src = a.createMediaElementSource(B.el); B.g = a.createGain(); B.g.gain.value = 0; src.connect(B.g).connect(bgOut(a)); } catch (e) { B.g = null; } }
  function fade(B, to, sec) { const a = ac; if (B.g) { const t = a.currentTime; B.g.gain.cancelScheduledValues(t); B.g.gain.setValueAtTime(B.g.gain.value, t); B.g.gain.linearRampToValueAtTime(to, t + sec); } else if (B.el) B.el.volume = to; }
  let want = null, handT = 0;
  function music(name) {
    clearTimeout(handT);
    want = name; const a = ctx(); if (!a) return;
    for (const k in TRK) { const B = TRK[k];
      if (k === name && on()) {
        if (B.on) continue; prep(B); if (!B.el) continue;
        B.on = true; clearTimeout(B.t); if (B.restart) B.el.currentTime = 0;
        const p = B.el.play(); if (p && p.catch) p.catch(() => {});
        fade(B, B.vol, .8);
      } else if (B.on) { B.on = false; fade(B, 0, 1.4); clearTimeout(B.t); B.t = setTimeout(() => { B.t = 0; if (!B.on && B.el) B.el.pause(); }, 1500); }
    } }
  document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } for (const B of Object.values(TRK)) if (B.el && B.on) { if (document.hidden) B.el.pause(); else { const p = B.el.play(); if (p && p.catch) p.catch(() => {}); } } });
  const GAIN = { tile1: .65, tile2: .62, tile3: .6, stick1: .95, stick2: .63, stick3: .67, 'v-chi': 1.1, 'v-kan': .68, 'v-pon': .65, 'v-ron': .61, 'v-tsumo': .66 };
  function play(n, g = 1, rate = 1) { g *= GAIN[n] || 1; const a = ctx(); if (!a || !on()) return false; load(); const b = BUF[n]; if (!b) return false;
    const s = a.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const v = a.createGain(); v.gain.value = g; s.connect(v).connect(seOut(a)); s.start(); return true; }
  const pick3 = k => `${k}${1 + ((Math.random() * 3) | 0)}`;
  return {
    tile: () => { if (!play(pick3('tile'), 1, .96 + Math.random() * .08)) click(); },
    stick: () => { if (!play(pick3('stick'), 1)) tone(1800, .08, 'triangle', .06); },
    voice: k => play('v-' + k, .65),
    // 花牌：抜いて脇へ置く音は点棒を置く軽い音（stick）、少し高めに。補充のツモは牌の音
    flower: () => { if (!play(pick3('stick'), .8, 1.12)) tone(1800, .08, 'triangle', .06); tone(1568, .25, 'sine', .035, .04); },
    call: () => { tone(520, .16, 'square', .06); tone(780, .2, 'square', .05, .08); },
    callAsk: () => { tone(784, .09, 'triangle', .07); tone(1046, .14, 'sine', .06, .07); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', .12, i * .09)); tone(1568, 1.2, 'sine', .08, .4); },
    ok: () => { tone(988, .25, 'sine', .12); tone(1319, .5, 'sine', .1, .12); },
    pick: () => tone(660, .06, 'triangle', .06),
    warn: () => { tone(155, .26, 'square', .07); tone(152, .26, 'sawtooth', .05); },
    // 流局：低く下がる2音（リーチ麻雀のノーテンの声の代わり。国標は聴牌料がない）
    exhaust: () => { tone(392, .3, 'triangle', .09); tone(330, .6, 'triangle', .09, .22); },
    // 局の始まり：曲（流れていなければ）
    handStart() { fetchTrk('flute'); fetchTrk('score'); if (want === 'flute') return; music(null); handT = setTimeout(() => music('flute'), 600); },
    newGame() { if (on()) { fetchTrk('flute'); fetchTrk('score'); } },
    score() { const B = TRK.score; if (B.el) { B.on = false; B.el.pause(); } music(null); handT = setTimeout(() => music('score'), 350); },
    stop: () => music(null),
    music, levels, preload: () => load(),
    resume: () => music(want),
    unlock: () => { ctx(); load(); },
    gate(off) { const a = ac; if (!a) return;
      if (off) { if (a.state === 'running') a.suspend(); for (const k in TRK) if (TRK[k].el && TRK[k].on) TRK[k].el.pause(); }
      else if (!document.hidden) { a.resume(); for (const k in TRK) if (TRK[k].el && TRK[k].on) { const p = TRK[k].el.play(); if (p && p.catch) p.catch(() => {}); } } },
    revive() { const a = ac; if (!a || document.hidden || !on()) return;
      if (a.state !== 'running' && a.state !== 'closed') { const p = a.resume(); if (p && p.catch) p.catch(() => {}); }
      for (const k in TRK) { const B = TRK[k]; if (B.el && B.on && B.el.paused) { const p = B.el.play(); if (p && p.catch) p.catch(() => {}); } }
      for (const k in TRK) { const B = TRK[k]; if (B.el && B.g && !B.ul && !B.on) { B.ul = true; const p = B.el.play();
        if (p && p.then) p.then(() => { if (!B.on) B.el.pause(); }, () => { B.ul = false; }); else if (!B.on) B.el.pause(); } } },
    volP,
  };
};
})();
