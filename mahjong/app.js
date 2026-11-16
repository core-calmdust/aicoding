// 雀華 (JANKA) — app: home portal, gacha, game screen (3D table + HTML hand), cut-ins, results.
(function () {
'use strict';
const $ = s => document.querySelector(s);
const t = (k, v) => I18N.t(k, v);
const L = o => I18N.L(o);
const T = id => id >> 2;
const FAST = /[?&]fast/.test(location.search) ? 0.12 : 1;
// waits that stand still while the window is not in front (shared/focusgate.js stops performance.now() then): the game does not
// go on behind another window (common rule; ユーザー 2026-11-14)
const frozen = () => !!(window.__focusGate && window.__focusGate.frozen);
const PACE = .8;   // the game's waits (and with them the cut-ins and result screens) run this much of their written length (ユーザー 2026-11-14: a little quicker)
const sleep = ms => new Promise(r => { const end = performance.now() + ms * FAST * PACE;
  (function tick() { const left = end - performance.now(); if (left <= 0 && !frozen()) return r(); setTimeout(tick, Math.max(16, Math.min(left, 150))); })(); });
const ASSETS = window.JANKA_ASSETS || '../images/mahjong/';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- save
const KEY = 'janka-v1';
let DB = load();
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d) d = {};
  d.coins = d.coins ?? 3000;
  // owned characters: { id: { skills: ['wareme:2', …], use: 'wareme:2' } } (skill id : skill tier)
  if (!d.chars) {
    d.chars = {};
    for (const id in (d.owned || {})) if (MJChars.get(id) && MJChars.LEGACY[id]) { const k = MJSkills.key(MJChars.LEGACY[id], 0); d.chars[id] = { skills: [k], use: k }; }
  }
  for (const id in d.chars) if (!MJChars.get(id)) delete d.chars[id];
  if (!Object.keys(d.chars).length) { const st = MJChars.starter, k = MJSkills.key(st.skill, st.tier); d.chars[st.id] = { skills: [k], use: k }; }
  delete d.owned;
  d.sel = d.sel && d.chars[d.sel] ? d.sel : Object.keys(d.chars)[0];
  // (2026-11-15, ユーザー「ボケて見える」) light mode no longer turns itself on from the core count: iPhones report 4 (or fewer) cores
  // whatever they have, so every iPhone started in light mode — drawn at 1× and blurred. Only a device that says it has 2 GB or
  // less, or 2 cores or less, starts light. Saves from before (liteV < 2) are set again once by the new rule.
  const weak = (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;
  d.set = Object.assign({ len: 'east', skills: true, lv: 2, snd: true, lite: weak, mode: 'ranked' }, d.set || {});
  if ((d.set.liteV | 0) < 2) { d.set.lite = weak; d.set.liteV = 2; }
  if (window.PhoneSnd && PhoneSnd.phone) d.set.snd = true;   // phones: the silent switch decides (shared/phonesnd.js)
  d.stats = Object.assign({ games: 0, rank: [0, 0, 0, 0] }, d.stats || {});
  // スタッツ (pstats.js): raw counters by mode, and games / places by the character played. Games from before the
  // stats existed only know the places: they are kept as `old` and counted in すべて.
  if (!d.pstats) d.pstats = { v: MJStats.V, skill: MJStats.blank(), std: MJStats.blank(), chars: {}, old: d.stats.games ? Object.assign(MJStats.blank(), { games: d.stats.games, rank: d.stats.rank.slice() }) : null };
  MJStats.fix(d.pstats.skill); MJStats.fix(d.pstats.std); d.pstats.chars = d.pstats.chars || {};
  d.rank = Object.assign({ pt: 0, games: 0 }, d.rank || {});   // 段位戦: the points (they only add up)
  return d;
}
const owns = id => !!DB.chars[id];
function useKey(id) { const o = DB.chars[id]; return o ? (o.skills.includes(o.use) ? o.use : o.skills[0]) : null; }
// pc / pkey: the partner (a sister) and the partner's skill — the seat's second skill (game.js slot 1)
function seatChar(c, key, pc, pkey) {
  const k = MJSkills.parse(key), o = Object.assign({}, c, { skill: k.id, tier: k.tier });
  if (pc && pkey) { const k2 = MJSkills.parse(pkey); if (k2.id !== k.id) Object.assign(o, { skill2: k2.id, tier2: k2.tier, partner: pc }); }
  return o;
}
// (ユーザー 2026-11-15) 代表 = the character played; パートナー = one of her sisters (same family, owned), whose skill she can use too.
// Each character remembers her own partner (DB.chars[id].partner) and which of the partner's skills to bring (puse).
function partnerOf(id) { const o = DB.chars[id], c = MJChars.get(id), p = o && o.partner && MJChars.get(o.partner); return p && c && owns(p.id) && p.id !== id && p.family === c.family ? p : null; }
function partnerSkills(id) { const p = partnerOf(id); if (!p) return []; const mine = MJSkills.parse(useKey(id)).id; return DB.chars[p.id].skills.map(k => ({ k, ok: MJSkills.parse(k).id !== mine })); }   // (the same skill as the 代表's cannot be brought)
function partnerKey(id) {
  const p = partnerOf(id); if (!p) return null;
  const ks = partnerSkills(id).filter(x => x.ok).map(x => x.k), o = DB.chars[id];
  return ks.includes(o.puse) ? o.puse : ks.includes(useKey(p.id)) ? useKey(p.id) : ks[0] || null;
}
function mySeat() { const id = DB.sel; return seatChar(MJChars.get(id), useKey(id), partnerOf(id), partnerKey(id)); }
const coarse = () => matchMedia('(pointer: coarse)').matches;
function rollSkillKey() {
  const r = Math.random() * 100; let acc = 0, tier = 0;
  for (let i = MJSkills.TIERS.length - 1; i >= 0; i--) { acc += MJSkills.TIER_W[i]; if (r < acc) { tier = i; break; } }
  const sk = MJSkills.list[(Math.random() * MJSkills.list.length) | 0];
  return MJSkills.key(sk.id, tier);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }

// ---------------------------------------------------------------- icons
const IC = {
  gacha: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="6"/><path d="M6 10h12M9 20h6M12 16v4"/></svg>',
  collection: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="9" rx="1.5"/><rect x="14" y="4" width="7" height="9" rx="1.5"/><rect x="8.5" y="12" width="7" height="9" rx="1.5"/></svg>',
  snd: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>',
  crack: '<svg viewBox="0 0 24 24"><path d="M12 2l-2 6 4 3-3 5 3 6"/><path d="M5 6l4 2M19 8l-5 3M6 17l5-1"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18 3-18"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>',
  magnet: '<svg viewBox="0 0 24 24"><path d="M5 3v8a7 7 0 0 0 14 0V3h-4v8a3 3 0 0 1-6 0V3z"/><path d="M5 7h4M15 7h4"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  scope: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 7v8M7 11h8"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a2 2 0 0 1 0 4H9"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  rank: '<svg viewBox="0 0 24 24"><path d="M4 8l4 3 4-6 4 6 4-3-2 10H6z"/><path d="M6 21h12"/></svg>',
  keys: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.3h.01"/></svg>',   // (？ — ユーザー 2026-11-14)
  fsOn: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  fsOff: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/><circle cx="12" cy="12" r="6.6"/></svg>',
  rated: '<svg viewBox="0 0 24 24"><path d="M4 20V14h4v6M10 20V9h4v11M16 20V4h4v16M3 20h18"/></svg>',
  lesson: '<svg viewBox="0 0 24 24"><path d="M3 6.5 12 3l9 3.5-9 3.5z"/><path d="M7 8.3V13c0 1.6 2.2 3 5 3s5-1.4 5-3V8.3M21 6.5V12"/></svg>',
  rules: '<svg viewBox="0 0 24 24"><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12h7M8.5 15.5h7"/></svg>',
  chest: '<svg viewBox="0 0 24 24"><path d="M3 10h18v10H3zM3 10a9 5 0 0 1 18 0"/><path d="M11 13h2v3h-2z"/></svg>',
};
const icon = k => IC[k] || '';

// ---------------------------------------------------------------- sound (WebAudio synth)
const SND = (() => {
  let ac = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state !== 'running' && ac.state !== 'closed' && !document.hidden) ac.resume(); return ac; };
  const on = () => DB.set.snd && !document.hidden;
  // two buses (ユーザー 2026-11-14: the effects and the music each with their own volume and mute — the gear in the game)
  let seB = null, bgB = null;
  const vol = k => (DB.set[k + 'On'] === false ? 0 : Math.max(0, Math.min(1, DB.set[k + 'Vol'] ?? 1)));
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
  document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } if (window.SND) for (const B of Object.values(SND._trk || {})) if (B.el && B.on) { if (document.hidden) B.el.pause(); else { const p = B.el.play(); if (p && p.catch) p.catch(() => {}); } } });
  // recorded sounds (ユーザー 2026-11-14): tiles laid down (three, picked at random), the point sticks (riichi, paying for a skill),
  // and the calls in a voice (リーチ・ツモ・ロン・ポン・チー・カン・テンパイ・ノーテン). Decoded on first use; until then the synth stands in.
  // Everything is fetched and decoded in the background right after the page loads (ユーザー 2026-11-14: no hitch the first time a
  // sound plays): one file at a time when the browser is idle — the short ones first, then the riichi music — so the load is spread
  // out and nothing waits on the network once the game is running. Decoding needs no click (a suspended context decodes fine).
  const BUF = {}, NAMES = ['tile1', 'tile2', 'tile3', 'stick1', 'stick2', 'stick3', 'v-riichi', 'v-tsumo', 'v-ron', 'v-pon', 'v-chi', 'v-kan', 'v-tenpai', 'v-noten'];
  let loading = false;
  // the music (ユーザー 2026-11-14): 'main' plays through the game, 'riichi' (the tension track) takes over when someone declares
  // riichi and hands back at the end of the hand. Each is an <audio> element into the context, with a gain node for the crossfades;
  // the main track carries on from where it was, the riichi track starts from the top each time.
  // (the music's levels from its loudness, EBU R128: title −14.4 LUFS → ≈ −22, main −19 → ≈ −26 under the voices, riichi −12.3 → ≈ −24)
  // (levels from each file's loudness, EBU R128 — title −14.4 LUFS → ≈ −22; the game's tracks ≈ −26 under the voices: main −19,
  // main2 −13.9, main3 −13.4; riichi ≈ −24: riichi −12.3; the results of a hand ≈ −24: score −14.9)
  const TRK = {
    title: { file: 'bgm-title', vol: .42, restart: true },
    main: { file: 'bgm-main', vol: .45, restart: false },
    main2: { file: 'bgm-main2', vol: .25, restart: false },
    main3: { file: 'bgm-main3', vol: .235, restart: false },
    riichi: { file: 'bgm-riichi', vol: .26, restart: true },
    score: { file: 'score-jingle', vol: .35, restart: true, once: true },   // (ユーザー 2026-11-15: a short piece, once per results screen — no loop)
  };
  for (const k in TRK) Object.assign(TRK[k], { url: null, el: null, g: null, on: false, t: 0 });
  const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 600 }) : setTimeout(f, 60));
  function mkctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ac; }
  function load() { if (loading) return; loading = true; const a = mkctx(); let i = 0; const music = ['title'];   // (2026-11-15: only the title's track up front — a game's tracks are fetched as the game begins: fetchTrk)
    const next = () => {
      if (i < NAMES.length) { const n = NAMES[i++];
        fetch(`${ASSETS}snd/${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => a ? new Promise((ok, ng) => a.decodeAudioData(b, ok, ng)) : null)
          .then(buf => { if (buf) BUF[n] = buf; }).catch(() => {}).finally(() => idle(next));
      } else if (music.length) {      // the music: the whole file into memory, so it starts at once and never stalls mid-play
        const B = TRK[music.shift()]; if (B.url) return idle(next);
        fetch(`${ASSETS}snd/${B.file}.mp3`).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { if (!B.el) B.url = URL.createObjectURL(b); prep(B); })
          .catch(() => {}).finally(() => idle(next));
      } };
    idle(next); }
  // a track fetched whole (in the background) when it is about to be wanted — not all six at once (ユーザー 2026-11-15)
  function fetchTrk(k) { const B = TRK[k]; if (!B || B.url || B.el || B.getting) return; B.getting = true;
    fetch(`${ASSETS}snd/${B.file}.mp3`).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { if (!B.el) { B.url = URL.createObjectURL(b); if (ac) prep(B); } }).catch(() => {}).finally(() => { B.getting = false; }); }
  // the <audio> element and its gain node are made ahead of time, not at the moment the track is wanted
  function prep(B) { const a = ac; if (!a || B.el) return; if (!B.url) B.url = `${ASSETS}snd/${B.file}.mp3`;
    B.el = new Audio(B.url); B.el.loop = !B.once; B.el.preload = 'auto';
    if (B.once) B.el.addEventListener('ended', () => { B.on = false; });   // (played to its end: the next results screen plays it again)
    try { const src = a.createMediaElementSource(B.el); B.g = a.createGain(); B.g.gain.value = 0; src.connect(B.g).connect(bgOut(a)); } catch (e) { B.g = null; } }
  // (2026-11-15, ユーザー「サウンドの問題が治ってない」) a phone's browser (iOS above all) can leave the sound dead after the page has been
  // in the background — the context 'interrupted', the music's element sources silent even once resumed. So on a touch device,
  // back from the background, the first touch builds the sound afresh: a new context, new buses, new music elements (the files are
  // still in memory; the decoded effects carry over), and the music that was wanted starts again where it was.
  let stale = false;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  document.addEventListener('visibilitychange', () => { if (document.hidden && ac && TOUCH) stale = true; });
  function rebuild() { stale = false; const old = ac; if (!old) return false;
    const pos = {};
    for (const k in TRK) { const B = TRK[k]; if (B.el) { pos[k] = B.el.currentTime; try { B.el.pause(); B.el.removeAttribute('src'); B.el.load(); } catch (e) {} }
      clearTimeout(B.t); B.el = null; B.g = null; B.on = false; if (B.url && !B.url.startsWith('blob:')) B.url = null; }
    try { old.close(); } catch (e) {}
    ac = null; seB = bgB = null;
    const a = ctx(); if (!a) return true;
    for (const k in TRK) if (TRK[k].url) prep(TRK[k]);
    for (const k in pos) { const B = TRK[k]; if (B.el && !B.restart) try { B.el.currentTime = pos[k]; } catch (e) {} }
    music(want); return true; }
  function fade(B, to, sec) { const a = ac; if (B.g) { const t = a.currentTime; B.g.gain.cancelScheduledValues(t); B.g.gain.setValueAtTime(B.g.gain.value, t); B.g.gain.linearRampToValueAtTime(to, t + sec); } else if (B.el) B.el.volume = to; }
  let want = 'title';   // the track that should be playing (the title screen's to begin with) (kept while the sound is off, so it comes back when switched on)
  // the game's music (ユーザー 2026-11-14): one of the three tracks, drawn at random for each game ('main' asks for this game's one)
  let mainKey = 'main';
  function music(name) {
    if (name === 'main') name = mainKey;
    want = name; const a = ctx(); if (!a) return;
    for (const k in TRK) { const B = TRK[k];
      if (k === name && on()) {
        if (B.on) continue; prep(B); if (!B.el) continue;
        B.on = true; clearTimeout(B.t); if (B.restart) B.el.currentTime = 0;
        const p = B.el.play(); if (p && p.catch) p.catch(() => {});
        fade(B, B.vol, k === 'main' ? 1.6 : .8);
      } else if (B.on) { B.on = false; fade(B, 0, 1.4); clearTimeout(B.t); B.t = setTimeout(() => { if (!B.on && B.el) B.el.pause(); }, 1500); }
    } }
  // each recording's level, measured (ffmpeg astats RMS peak / EBU R128) and evened out (ユーザー 2026-11-14: the volumes at their best):
  // the tile clacks soft (they come often, ≈ −25 dB), the sticks a little above (≈ −20), the voices clear on top (≈ −12)
  const GAIN = { tile1: .65, tile2: .62, tile3: .6, stick1: .95, stick2: .63, stick3: .67,
    'v-chi': 1.1, 'v-kan': .68, 'v-noten': .92, 'v-pon': .65, 'v-riichi': 1.45, 'v-ron': .61, 'v-tenpai': .78, 'v-tsumo': .66 };
  function play(n, g = 1, rate = 1) { g *= GAIN[n] || 1; const a = ctx(); if (!a || !on()) return false; load(); const b = BUF[n]; if (!b) return false;
    const s = a.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const v = a.createGain(); v.gain.value = g; s.connect(v).connect(seOut(a)); s.start(); return true; }
  const pick3 = k => `${k}${1 + ((Math.random() * 3) | 0)}`;
  // filtered noise with a moving filter: wind, fire, sweeps, thunder (for the skills' effects)
  function noise(d, type, f0, f1, g = .2, delay = 0, Q = 1, atk = .02) {
    const a = ctx(); if (!a || !on()) return;
    const n = a.createBuffer(1, Math.max(1, (a.sampleRate * d) | 0), a.sampleRate), ch = n.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = n; const t0 = a.currentTime + delay;
    const f = a.createBiquadFilter(); f.type = type; f.Q.value = Q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    const v = a.createGain(); v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(g, t0 + atk); v.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(f).connect(v).connect(seOut(a)); s.start(t0); s.stop(t0 + d + .05);
  }
  // one sound per skill effect (ユーザー 2026-11-15: the effects over the table have their own sounds), in step with skillfx.js (1 s)
  const SKFX = {
    wareme: () => { for (const t of [0, .16, .34]) { noise(.09, 'highpass', 5000, 1500, .3, t, .7, .002); noise(.5, 'lowpass', 900, 70, .34, t + .02, .8, .005); } tone(70, .7, 'sine', .2, .34, 34); },
    hanup: () => { noise(.95, 'bandpass', 220, 1500, .3, 0, .7, .22); noise(.8, 'lowpass', 500, 150, .26, .05, .6, .15); for (let i = 0; i < 7; i++) noise(.03, 'highpass', 3000, 2500, .1, .15 + Math.random() * .65, 1, .002); tone(90, .8, 'sawtooth', .05, 0, 150); },
    guard: () => { tone(196, .9, 'sine', .14); tone(294, .9, 'sine', .1); tone(392, .8, 'triangle', .07, .05); for (const [f, t] of [[1568, .1], [2093, .22], [2637, .34]]) tone(f, .35, 'sine', .05, t); noise(.12, 'bandpass', 1200, 900, .12, 0, 6, .002); },
    shugi: () => { [2093, 2637, 3136, 2349, 3520, 2794, 3951, 3136].forEach((f, i) => { tone(f, .22, 'sine', .07, .08 + i * .085); tone(f * 1.5, .12, 'sine', .03, .08 + i * .085); }); tone(523, .9, 'triangle', .06); tone(784, .9, 'triangle', .05, .1); },
    pot: () => { noise(.95, 'bandpass', 300, 2400, .18, 0, 3, .3); tone(110, .9, 'sawtooth', .05, 0, 440); tone(220, .9, 'sine', .08, 0, 880); for (let i = 0; i < 5; i++) tone(1760 + i * 220, .14, 'sine', .05, .45 + i * .08); },
    doraplus: () => { noise(.35, 'lowpass', 2400, 200, .3, 0, .7, .003); tone(120, .5, 'sine', .22, 0, 45); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, .7, 'triangle', .08, .06 + i * .05)); for (let i = 0; i < 5; i++) tone(3136 + i * 370, .2, 'sine', .04, .3 + i * .09); },
    lure: () => { noise(.8, 'bandpass', 2600, 380, .16, 0, 4, .35); tone(1400, .8, 'sine', .08, 0, 330); tone(2100, .8, 'sine', .04, .05, 495); tone(330, .35, 'triangle', .12, .75); tone(495, .35, 'sine', .08, .75); },
    mind: () => { for (const [f, t] of [[440, 0], [554, .18], [659, .36]]) { tone(f, .7, 'sine', .09, t); tone(f * 1.006, .7, 'sine', .07, t); } tone(1760, .5, 'sine', .04, .5, 1720); noise(.6, 'bandpass', 900, 2200, .05, .1, 8, .2); },
    peek: () => { tone(500, .7, 'sine', .08, 0, 2400); noise(.7, 'bandpass', 800, 5000, .1, 0, 5, .1); for (let i = 0; i < 5; i++) tone(2400, .035, 'square', .03, .12 + i * .11); tone(3136, .3, 'sine', .08, .72); },
    swap: () => { noise(.38, 'bandpass', 500, 3000, .2, 0, 3, .12); noise(.38, 'bandpass', 3000, 500, .2, .32, 3, .12); tone(660, .3, 'triangle', .08, 0, 990); tone(990, .3, 'triangle', .08, .32, 660); tone(1319, .3, 'sine', .09, .7); tone(1976, .35, 'sine', .06, .76); },
    seal: () => { tone(98, 1, 'sine', .2); tone(147, .9, 'sine', .1); noise(.9, 'lowpass', 300, 120, .12, 0, .7, .2); for (const t of [.22, .36]) { noise(.06, 'bandpass', 3400, 2600, .22, t, 5, .002); tone(2200, .08, 'square', .03, t); } noise(.3, 'lowpass', 1400, 90, .4, .58, .7, .003); tone(82, .5, 'sine', .26, .58, 40); },
  };
  return {
    skillFx: id => { const f = SKFX[id]; if (f) f(); },
    tile: () => { if (!play(pick3('tile'), 1, .96 + Math.random() * .08)) click(); },
    stick: () => { if (!play(pick3('stick'), 1)) tone(1800, .08, 'triangle', .06); },
    voice: k => play('v-' + k, 1),
    preload: () => load(),
    _trk: TRK, _rebuild: () => rebuild(), _ac: () => ac,
    music,
    resume: () => music(want),
    score() { const B = TRK.score; if (B.el) { B.on = false; B.el.pause(); } music('score'); },   // (once per results screen, from its top)
    newGame() { mainKey = ['main', 'main2', 'main3'][(Math.random() * 3) | 0]; if (on()) { fetchTrk(mainKey); fetchTrk('riichi'); fetchTrk('score'); } },
    // the window behind / in front again: the sound stops and comes back where it was
    gate(off) { const a = ac; if (!a) return;
      if (off) { if (a.state === 'running') a.suspend(); for (const k in TRK) if (TRK[k].el && TRK[k].on) TRK[k].el.pause(); }
      else if (!document.hidden) { a.resume(); for (const k in TRK) if (TRK[k].el && TRK[k].on) { const p = TRK[k].el.play(); if (p && p.catch) p.catch(() => {}); } } },
    // (2026-11-15, ユーザー「画面を切り替えた後に音が出なくなる」) back from another app / tab a phone often refuses to restart the
    // sound until the next touch (iOS leaves the context 'interrupted' and the music paused): every touch and key checks, and
    // brings back the context and the music that should be playing
    revive() { if (stale && !document.hidden && rebuild()) return; const a = ac; if (!a || document.hidden || !on()) return;
      if (a.state !== 'running' && a.state !== 'closed') { const p = a.resume(); if (p && p.catch) p.catch(() => {}); }
      for (const k in TRK) { const B = TRK[k]; if (B.el && B.on && B.el.paused) { const p = B.el.play(); if (p && p.catch) p.catch(() => {}); } } },
    levels,   // after the sound is switched back on
    call: () => { tone(520, .16, 'square', .06); tone(780, .2, 'square', .05, .08); },
    riichi: () => { tone(880, .5, 'sine', .14); tone(1320, .7, 'sine', .1, .08); tone(1760, .9, 'sine', .06, .16); },
    // the fanfare as the 満貫/跳満/… stamp lands: longer and brighter the bigger the hand
    limit: lv => { const base = [523, 659, 784, 1046, 1319, 1568, 2093]; const n = 2 + lv;
      for (let i = 0; i < n; i++) tone(base[Math.min(i, 6)] * (lv >= 5 ? 1.5 : 1), .35 + lv * .08, 'triangle', .1, i * (.09 - lv * .008));
      if (lv >= 3) tone(base[0] / 2, 1.2 + lv * .2, 'sine', .12, 0);
      if (lv >= 4) for (let i = 0; i < 6; i++) tone(2093 + i * 260, .25, 'sine', .04, .5 + i * .06); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', .12, i * .09)); tone(1568, 1.2, 'sine', .08, .4); },
    skill: () => { tone(300, .5, 'sawtooth', .05, 0, 1200); tone(1200, .6, 'sine', .1, .3); },
    ok: () => { tone(988, .25, 'sine', .12); tone(1319, .5, 'sine', .1, .12); },
    pick: () => tone(660, .06, 'triangle', .06),
    // (ユーザー 2026-11-15: the sound when she is touched and speaks was drowned by the music) the same short tone as pick, a little louder
    say: () => tone(660, .07, 'triangle', .11),   // (ユーザー 2026-11-15: the chime stood out too much — the old pick sound, only a little louder)
    gacha: r => { const b = r === 'SSR' ? 4 : r === 'SR' ? 3 : 2; for (let i = 0; i < b + 2; i++) tone(500 + i * 180, .3, 'triangle', .1, i * .07); },
    unlock: () => { ctx(); load(); prep(TRK.title); },
  };
})();
addEventListener("load", () => setTimeout(() => SND.preload(), 400));
// (ユーザー 2026-11-14: the title too — when the window is not in front everything stops: the sound and music pause, the CSS
// animations hold still; shared/focusgate.js already holds the animation frames and the clock)
{ let fz = false;
  setInterval(() => { const f = !!(window.__focusGate && window.__focusGate.frozen); if (f === fz) return; fz = f;
    document.documentElement.classList.toggle('fz', f); SND.gate(f); }, 200); }
// the title music starts with the first touch or key (browsers let sound start only then) (ユーザー 2026-11-14)
{ const go = () => { removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); SND.unlock(); SND.resume(); };
  addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => SND.revive(), true);
  addEventListener('pageshow', () => SND.revive()); }   // sounds load in the background from the start (spread out, idle time)

// ---------------------------------------------------------------- character art
const ART = new Map();
function charImg(c, kind) {          // kind: 'full' | 'bust' | 'face' | 'thumb' | 'sil' / 'silf' (the outline of a locked character, full / face: black on clear — tools/make-sil.py)
  if (c.art) {
    if (kind === 'full') return `${ASSETS}chara/${c.id}.webp`;
    if (kind === 'thumb') return `${ASSETS}chara/${c.id}-t.webp`;
    return `${ASSETS}chara/${c.id}-${kind}.webp`;
  }
  const k = c.id + kind;
  if (ART.has(k)) return ART.get(k);
  const W = kind === 'full' ? 540 : kind === 'bust' ? 400 : 160, H = kind === 'full' ? 960 : W;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W * .3, H);
  bg.addColorStop(0, c.color); bg.addColorStop(1, c.color2);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // pattern
  g.globalAlpha = .12; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, W / 160);
  for (let i = -H; i < W + H; i += W / 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - H * .6, H); g.stroke(); }
  g.globalAlpha = 1;
  // ornamental frame + big name initial
  const cx = W / 2, cy = kind === 'full' ? H * .42 : H / 2;
  const R = Math.min(W, kind === 'full' ? H * .5 : H) * (kind === 'face' ? .4 : .36);
  g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = Math.max(1.5, W / 120);
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(1, W / 260);
  g.beginPath(); g.arc(cx, cy, R * 1.12, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12); g.lineTo(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * 1.3); g.stroke(); }
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  glow.addColorStop(0, 'rgba(255,255,255,.22)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff8e6'; g.shadowColor = c.color; g.shadowBlur = W / 14;
  g.font = `800 ${R * 1.25}px "Shippori Mincho B1", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(c.name.ja[0], cx, cy + R * .06);
  g.shadowBlur = 0;
  if (kind !== 'face') {
    g.fillStyle = 'rgba(255,248,230,.9)';
    g.font = `800 ${W * .09}px "Shippori Mincho B1", serif`;
    g.fillText(c.name.ja, cx, cy + R * 1.62);
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.font = `700 ${Math.max(10, W * .04)}px "Zen Kaku Gothic New", sans-serif`;
    g.fillText(t('noArt'), cx, H - W * .07);
  }
  const u = cv.toDataURL('image/webp', .85);
  ART.set(k, u);
  return u;
}

// rarity frame around a character image (N plain … UR rainbow, animated)
function frame(c, kind, cls = '', extra = '') {
  return `<span class="frame fr-${c.rarity} ${cls}" style="--c:${c.color}" ${extra}><img src="${charImg(c, kind)}" alt="" draggable="false"><i class="fx-sh"></i></span>`;
}
// skill chip: icon + name + skill rarity
// the home screen's name card: wide (the name, then her story and skill) when it fits under the menu — from the menu's left edge to
// 38% of the width, the card scaled down to 76% at most; otherwise the name alone, where it always was
function fitCard() {
  const pl = $('#partner'), nav = document.querySelector('#home nav'), info = pl && pl.querySelector('.pp-info'); if (!pl || !nav || !info) return;
  const home = $('#home'), W = home.clientWidth, navB = nav.offsetTop + nav.offsetHeight + 8;
  pl.classList.remove('wide'); pl.style.left = pl.style.width = '';
  // (ユーザー 2026-11-16) on a phone the card is left-aligned too: its left edge on the menu's left edge, as on a desktop
  // When the menu leaves too little height under it, the card is drawn a little smaller (down to 76%) until it clears the menu;
  // if it still would not, it keeps its old place beside the menu.
  if (document.documentElement.classList.contains('lp')) {
    pl.style.left = nav.offsetLeft + 'px'; pl.classList.add('lpl');   // (lpl: a little lower, closer to the bottom edge)
    const clear = nav.offsetTop + nav.offsetHeight + 4;
    for (const k of [1, .94, .88, .82, .76, .7]) { pl.style.setProperty('--pis', k); if (pl.offsetTop >= clear) return; }
    pl.style.left = ''; pl.classList.remove('lpl'); pl.style.setProperty('--pis', 1); return; }
  if (W < 900) return;
  // (ユーザー 2026-11-15: where the window has width to spare — 16:9 and wider — the card is longer, for STORY and SKILL) it runs
  // to just short of the right-hand column (the pick-up banner / the play panel); never narrower than before
  const w0 = Math.round(Math.min(W * .56, Math.max(W * .38, 660)) - nav.offsetLeft);
  pl.classList.add('wide'); pl.style.left = nav.offsetLeft + 'px'; pl.style.width = w0 + 'px';
  // (ユーザー 2026-11-15, 16:9: the box as long as the words need, plus a margin — not all the way to the right column; and it
  // fades out toward its right end) the room is up to just short of the right-hand column (the pick-up banner / the play panel).
  // The card is measured with its lines unbroken: when they fit in the room, it is that wide plus a quarter of the text side
  // (class `fade`: the dark ground thins out to the right); when they do not (a squarish window), it takes all the room, as before.
  { const offL = e => { let x = 0; while (e && e !== home) { x += e.offsetLeft; e = e.offsetParent; } return x; };   // (layout offsets, not on-screen boxes: the screen's entry animation moves both while it plays)
    const cols = ['#aaBanner', '.aa-play'].map(q => home.querySelector(q)).filter(e => e && e.offsetWidth).map(offL);
    pl.classList.remove('fade');
    if (cols.length) { const room = Math.min(...cols) - (offL(pl) + pl.offsetWidth) - 28;
      if (room > 0) { const max = w0 + room;
        pl.classList.add('meas'); const nat = pl.offsetWidth, text = info.offsetWidth; pl.classList.remove('meas');
        const want = Math.round(nat + text * .25);
        if (nat <= max) { pl.style.width = Math.max(w0, Math.min(max, want)) + 'px'; pl.classList.add('fade'); } else pl.style.width = Math.round(max) + 'px'; } } }
  for (const k of [1, .94, .88, .82, .76]) { pl.style.setProperty('--pis', k); if (pl.offsetTop >= navB && info.scrollWidth <= info.clientWidth + 1 && info.offsetWidth >= 200) return; }   // (the whole card a little smaller until it clears the menu)
  pl.classList.remove('wide'); pl.style.left = pl.style.width = '';
}
// (ユーザー 2026-11-15: after switching to full screen the card's size was off) the card was fitted on `resize` BEFORE the stage
// itself was (fitRoot, below, listens later), so it measured the old stage. It is fitted after the stage now — at once, on the
// next frame and once more a moment later (a full-screen switch settles over several frames) — and whenever the home's own
// box or the right-hand column changes size, on a full-screen change, and when the web fonts arrive.
function refitCard() {
  const go = () => { if (!$('#home').hidden) fitCard(); };
  go(); cancelAnimationFrame(refitCard.f); refitCard.f = requestAnimationFrame(go); clearTimeout(refitCard.t); refitCard.t = setTimeout(go, 350);
}
function skillChip(key, cls = '', attrs = '') {
  const k = MJSkills.parse(key), sk = MJSkills.get(k.id);
  return `<span class="skc st${k.tier} ${cls}" style="--sc:${sk.color}" ${attrs}><i>${icon(sk.icon)}</i><b>${esc(L(sk.name))}</b><em>${MJSkills.TIERS[k.tier]}</em></span>`;
}
function skillBlock(key, lite) {
  const k = MJSkills.parse(key), sk = MJSkills.get(k.id), v = MJSkills.val(sk, k.tier);
  return `<div class="pskill st${k.tier}" style="--sc:${sk.color}"><i>${icon(sk.icon)}</i><div>
    <b>${esc(L(sk.name))} <em class="sr">${MJSkills.TIERS[k.tier]}</em> <em class="tm">${t('timing_' + (sk.timing || 'turn'))}</em></b>
    <span>${esc(L(sk.desc(v)))}</span>
    ${lite ? '' : `<small class="cl">${esc(t(sk.noFree ? 'costLineNF' : 'costLine', { n: (sk.cost || 1000).toLocaleString(), h: ((sk.cost || 1000) / 2).toLocaleString() }))}</small>`}</div></div>`;
}

// ---------------------------------------------------------------- tile html
// a dora (the tiles the indicators point at, and the red fives): it glints, in the hand and on the table (ユーザー 2026-11-14)
function isDora(id) { try { if (id === 16 || id === 52 || id === 88) return true; if (!G || !G.doraInds) return false; const t = T(id); return G.doraInds().some(i => MJ.doraOf(i) === t); } catch (e) { return false; } }
function tileHTML(id, cls = '', extra = '') {
  const red = id === 16 || id === 52 || id === 88;
  const dr = isDora(id); if (dr) cls += ' dora';
  return `<span class="tl ${cls}" data-id="${id}" ${extra}><img src="${MJTiles.url(T(id), red)}" alt="" draggable="false">${dr ? '<i class="dg"><b></b></i>' : ''}</span>`;
}
function typeHTML(type, cls = '') { return `<span class="tl ${cls}"><img src="${MJTiles.url(type, false)}" alt="" draggable="false"></span>`; }
function backHTML(cls = '') { return `<span class="tl back ${cls}"></span>`; }

// ---------------------------------------------------------------- toast / modal
function toast(msg, ms = 1800) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), ms);
}
function modal(html, cls = '') {
  const m = $('#modal');
  m.className = 'modal ' + cls; m.innerHTML = `<div class="mbox">${html}</div>`; m.hidden = false;
  if (TB) TB.quiet = /\bstage\b/.test(cls);   // (a result over the whole table: the table's own animation rests behind it)
  requestAnimationFrame(() => m.classList.add('show'));
  return m.firstElementChild;
}
function closeModal() { const m = $('#modal'); m.classList.remove('show'); m.hidden = true; m.innerHTML = ''; if (TB) TB.quiet = false; }
function confirmBox(q) {
  return new Promise(res => {
    const b = modal(`<p class="cq">${esc(q)}</p><div class="cbtns"><button class="btn" data-a="no">${t('no')}</button><button class="btn gold" data-a="yes">${t('yes')}</button></div>`, 'small');
    b.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; closeModal(); res(a.dataset.a === 'yes'); });
  });
}

// ================================================================ HOME
function applyText() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-tt]').forEach(el => { el.title = t(el.dataset.tt); el.setAttribute('aria-label', t(el.dataset.tt)); });
  document.title = I18N.lang === 'ja' ? '雀華 〜艶やかなる姫君の雀宴〜' : 'JANKA — The Princesses\' Mahjong Banquet';
}
function sndIcons() { for (const b of document.querySelectorAll('.snd')) b.innerHTML = IC.gear; }
function renderHome() {
  if (typeof fsIcons === 'function') fsIcons();
  applyText();
  $('#coinN').textContent = DB.coins.toLocaleString();
  $('#btnPortal').innerHTML = IC.home; $('#btnSet').innerHTML = IC.gear;
  $('#coinBox .coin').innerHTML = IC.coin;
  // the menu down the left (ユーザー 2026-11-14: only the system's buttons stay at the top right; the rest are here)
  const mi = (ic, lab, sub) => `<i class="lm-i">${ic}</i><span class="lm-t"><b>${esc(lab)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
  $('#btnGacha').innerHTML = mi(IC.gacha, t('gacha'), 'GACHA'); $('#btnColl').innerHTML = mi(IC.collection, t('chars'), 'CHARACTERS');
  $('#btnStats').innerHTML = mi(IC.stats, t('record'), 'RECORD');   // (ユーザー 2026-11-14: 戦績 and スタッツ are one menu, 「戦績」 — the game log opens from inside it)
  $('#btnRated').innerHTML = mi(IC.rank, t('rated'), 'RANKED');
  document.querySelectorAll('#luxMenu [data-soon]').forEach(b => { b.innerHTML = mi(IC[b.dataset.soon] || '', t(b.dataset.soon), t('soon')); });
  sndIcons(); applyLite();
  const c = MJChars.get(DB.sel);
  const o = DB.chars[c.id], uk = useKey(c.id);
  const home = $('#home'); home.style.setProperty('--c', c.color); home.style.setProperty('--c2', c.color2);
  // the partner, large and free of any box (AAA title screen, ユーザー 2026-11-14), and the same art blurred as the room's light
  const full = charImg(c, 'full');
  if (window.MJTouch && I18N.lang === 'ja') MJTouch.load(c.id);
  if ($('#pArt').dataset.id !== c.id) {
    $('#pArt').dataset.id = c.id;
    $('#pArt').innerHTML = `<i class="aa-aura"></i><button class="aa-ch" id="pImg" aria-label="${esc(L(c.name))}"><img src="${full}" alt="" draggable="false"></button>`;
    $('#aaBlur').src = full;
  }
  const P = DB.pstats, all = MJStats.derive(MJStats.sum(P.skill, P.std, P.old));
  $('#aaProf').innerHTML = `<img src="${charImg(c, 'face')}" alt=""><span><b>${esc(t('you'))}</b><small>${esc(t('psGames'))} ${all.games} ・ ${esc(t('psAvgRank'))} ${all.avgRank == null ? '—' : all.avgRank.toFixed(2)}</small></span>${rankBadge(MJRank.at(DB.rank.pt), 'sm')}`;
  const pt = partnerOf(c.id), pk = pt ? partnerKey(c.id) : null, canPick = !pt && MJChars.list.some(x => x.family === c.family && x.id !== c.id && owns(x.id));
  { const k = MJSkills.parse(uk), sk = MJSkills.get(k.id), v = MJSkills.val(sk, k.tier), k2 = pk ? MJSkills.parse(pk) : null, sk2 = k2 ? MJSkills.get(k2.id) : null;   // (ユーザー 2026-11-15: one name card — the name on the left, her story and a short word on her skill on the right)
  $('#partner').innerHTML = `<div class="pp-main">
    <div class="pp-r"><em class="prar r-${c.rarity}">${c.rarity}</em><span class="pp-f">${esc(L(MJChars.families[c.family].name))}</span>${RAR_BONUS[c.rarity] ? `<span class="pp-cb">${icon('coin')}+${Math.round(RAR_BONUS[c.rarity] * 100)}%</span>` : ''}</div>
    <div class="pp-n">${esc(L(c.name))}</div>
    <div class="pp-t">${esc(L(c.title))}</div>
    <div class="pp-sk">${skillChip(uk, 'on')}${o.skills.length > 1 ? `<span class="pp-more" id="ppMore">${esc(t('ownedSkills'))} ${o.skills.length}</span>` : ''}</div>
    ${pt ? `<button class="pp-pt" id="ppChg"><img src="${charImg(pt, 'face')}" alt="" title="${esc(t('partner'))} ${esc(L(pt.name))}">${pk ? skillChip(pk, 'on') : ''}</button>`
      : canPick ? `<button class="pp-pt ask" id="ppChg"><i>＋</i><b>${esc(t('ptnHome'))}</b></button>` : ''}</div>
    <div class="pp-info" style="--sc:${sk.color}">
      <div class="pi-h">STORY</div><p class="pi-st">${esc(L(c.profile))}</p>
      <div class="pi-h">SKILL</div>
      <div class="pi-sk"><i>${icon(sk.icon)}</i><span>${esc(L(sk.desc(v)))}</span></div>
      ${sk2 ? `<div class="pi-sk" style="--sc:${sk2.color}"><i>${icon(sk2.icon)}</i><span>${esc(L(sk2.desc(MJSkills.val(sk2, k2.tier))))}</span></div>` : ''}</div>`; }
  fitCard();
  // pick-up banner: the best character not yet owned (or the best of all)
  const pick = MJChars.list.filter(x => !owns(x.id) && x.reward == null).sort((a, b) => RORD[a.rarity] - RORD[b.rarity])[0] || MJChars.list.find(x => x.rarity === 'UR');
  $('#aaBanner').innerHTML = `<i class="ab-art" style="background-image:url('${charImg(pick, 'bust')}')"></i><span class="ab-rib">PICK UP</span><span class="ab-tx"><em class="r-${pick.rarity}">${pick.rarity}</em><b>${esc(L(pick.name))}</b><small>${esc(L(pick.title))}</small></span><span class="ab-go">${esc(t('gacha'))} ›</span>`;
  $('#aaBanner').style.setProperty('--c', pick.color);
  // (ユーザー 2026-11-14: 段位戦 can be chosen here too) — free play or ranked; ranked fixes the skills and the BOTs' level
  const rankedMode = DB.set.mode !== 'free';
  $('#aaGoSub').textContent = rankedMode ? `${t('rated')} ・ ${t(DB.set.len === 'south' ? 'south' : 'east')} ・ ${L(MJRank.at(DB.rank.pt).name)}`
    : `${t(DB.set.len === 'south' ? 'south' : 'east')} ・ ${t(DB.set.skills ? 'skillOn' : 'skillOff')} ・ BOT ${t('lv')[DB.set.lv]}`;
  $('#optSkill').hidden = $('#optLv').hidden = rankedMode; $('#optRank').hidden = !rankedMode;
  if (rankedMode) { const r = MJRank.at(DB.rank.pt), n = MJRank.next(DB.rank.pt);
    $('#optRank').innerHTML = `${rankBadge(r)}<span><b>${DB.rank.pt} pt</b><small>${n ? esc(t('rkNext', { r: rkName(n), n: n.pt - DB.rank.pt })) : esc(t('rkTop'))}</small></span><button class="ap-rk-more" data-a="ranked">${esc(t('rkLadder'))} ›</button>`;
    $('#optRank').onclick = e => { if (e.target.closest('[data-a=ranked]')) openRanked(); }; }
  const hs = $('#homeSk');
  if (hs) hs.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; DB.chars[c.id].use = b.dataset.k; save(); SND.pick(); renderHome(); };
  const seg = (el, items, cur, cb) => {
    el.innerHTML = items.map(([v, lab]) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${esc(lab)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; SND.pick(); cb(b.dataset.v); save(); renderHome(); };
  };
  seg($('#optMode'), [['ranked', t('rated')], ['free', t('freePlay')]], rankedMode ? 'ranked' : 'free', v => DB.set.mode = v);
  seg($('#optLen'), [['east', t('east')], ['south', t('south')]], DB.set.len, v => DB.set.len = v);
  seg($('#optSkill'), [['1', t('skillOn')], ['0', t('skillOff')]], DB.set.skills ? '1' : '0', v => DB.set.skills = v === '1');
  seg($('#optLv'), t('lv').map((x, i) => [String(i), x]), String(DB.set.lv), v => DB.set.lv = +v);
}
$('#pArt').addEventListener('click', e => { if (e.target.closest('#pImg')) homeSay(e); });
$('#partner').addEventListener('click', e => { if (e.target.closest('#ppChg, #ppMore')) { SND.pick(); openChara(DB.sel); } });
$('#btnStats').addEventListener('click', () => openStats(null));
$('#btnRated').addEventListener('click', openRanked);
// full screen (ユーザー 2026-11-14): a button by the gear, at home and in the game; F also toggles it in the game
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function fsIcons() { const on = !!fsEl(); for (const b of document.querySelectorAll('.fsb')) { b.innerHTML = on ? IC.fsOff : IC.fsOn; b.title = t(on ? 'fsExit' : 'fsEnter'); b.setAttribute('aria-label', b.title); } }
function toggleFs() { SND.pick(); const d = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else { const r = (d.requestFullscreen || d.webkitRequestFullscreen); if (r) { const p = r.call(d); if (p && p.catch) p.catch(() => {}); } } }
document.querySelectorAll('.fsb').forEach(b => b.addEventListener('click', toggleFs));
document.addEventListener('fullscreenchange', fsIcons); document.addEventListener('webkitfullscreenchange', fsIcons);
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) document.querySelectorAll('.fsb').forEach(b => b.hidden = true);   // (iPhone Safari: none)
fsIcons();
$('#aaProf').addEventListener('click', () => openStats(null));
$('#aaBanner').addEventListener('click', () => { SND.pick(); openGacha(); });
// tapping her: a line of hers in a speech bubble
let sayT = 0;
// a screen point in the frame the UI is laid out in (see uiRect: on a phone held upright #root is turned 90°)
function uiPt(x, y) { return document.documentElement.classList.contains('rot') ? [y, innerWidth - x] : [x, y]; }
function homeSay(e) {
  const c = MJChars.get(DB.sel); let txt = null, at = null;
  // (ユーザー 2026-11-15) where she was touched decides what she says (touch.js: about a hundred lines each, Japanese only)
  if (e && window.MJTouch && I18N.lang === 'ja') { const im = e.target.closest('#pImg') && document.querySelector('#pImg img');
    if (im) { const r = uiRect(im), k = Math.max(r.width / 1080, r.height / 1920), w = 1080 * k, h = 1920 * k, [px, py] = uiPt(e.clientX, e.clientY);   // (the picture covers its box, held at the top, centred across)
      const u = (px - r.left - (r.width - w) / 2) / w, v = (py - r.top) / h; txt = MJTouch.line(c.id, MJTouch.zone(c.id, u, v)); at = [px, py]; } }
  if (!txt) { const ks = Object.keys(c.lines || {}); if (!ks.length) return; txt = L(c.lines[ks[(Math.random() * ks.length) | 0]]); }
  SND.say();
  const el = $('#aaSay'); el.textContent = txt; el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  // the bubble comes up beside the place touched, kept inside the picture's column — never over the right-hand column
  // (ユーザー 2026-11-16, phone: it covered the play settings — the touch point was read in the screen's frame, not the turned UI's)
  if (at) { const home = $('#home'), hr = uiRect(home), z = hr.width / home.offsetWidth || 1, x = (at[0] - hr.left) / z, y = (at[1] - hr.top) / z, W = home.offsetWidth, H = home.offsetHeight;
    const offL = n => { let v = 0; while (n && n !== home) { v += n.offsetLeft; n = n.offsetParent; } return v; };
    const colL = Math.min(W * .66, ...['#aaBanner', '.aa-play'].map(q => home.querySelector(q)).filter(n => n && n.offsetWidth).map(n => offL(n) - 12));
    el.style.left = Math.max(W * .2, Math.min(colL - el.offsetWidth, x + 24)) + 'px'; el.style.top = Math.max(70, Math.min(H * .7, y - el.offsetHeight - 14)) + 'px'; }
  else el.style.left = el.style.top = '';
  clearTimeout(sayT); sayT = setTimeout(() => { el.classList.remove('on'); }, Math.max(2600, 1400 + txt.length * 90));
}
// the room: specks of light drifting in the warm air (ユーザー 2026-11-14: not vector dots — real light). Pre-rendered soft sprites
// drawn additively: a few large out-of-focus bokeh discs far in front, fine motes in the light that twinkle (the brightest
// throw a faint star), everything soft-edged and warm. A small 2D canvas, only while the home is on screen; none in light mode.
const HFX = { run: false, parts: [], spr: null };
function hfxSprites() {
  const mk = (n, draw) => { const c = document.createElement('canvas'); c.width = c.height = n; draw(c.getContext('2d'), n / 2); return c; };
  return {
    mote: mk(64, (g, r) => { const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(.08, 'rgba(255,236,190,.95)'); gr.addColorStop(.22, 'rgba(255,208,130,.38)'); gr.addColorStop(.5, 'rgba(255,180,90,.1)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 2 * r, 2 * r); }),
    star: mk(96, (g, r) => { g.translate(r, r); for (const [w, l, a] of [[1.6, r, .55], [1, r * .7, .35]]) for (let k = 0; k < 2; k++) { g.rotate(k ? Math.PI / 2 : 0);
      const gr = g.createLinearGradient(-l, 0, l, 0); gr.addColorStop(0, 'rgba(255,230,180,0)'); gr.addColorStop(.5, `rgba(255,246,220,${a})`); gr.addColorStop(1, 'rgba(255,230,180,0)');
      g.fillStyle = gr; g.fillRect(-l, -w / 2, 2 * l, w); } }),
    bokeh: mk(128, (g, r) => { const gr = g.createRadialGradient(r, r, 0, r, r, r * .96);
      gr.addColorStop(0, 'rgba(255,214,150,.42)'); gr.addColorStop(.72, 'rgba(255,206,140,.5)'); gr.addColorStop(.86, 'rgba(255,224,170,.62)'); gr.addColorStop(.94, 'rgba(255,200,130,.18)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(r, r, r, 0, 7); g.fill(); }),
  };
}
function homeFx() {
  const cv = $('#aaFx'); if (!cv) return;
  const on = !$('#home').hidden && !DB.set.lite;
  if (!on) { HFX.run = false; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); return; }
  if (HFX.run) return; HFX.run = true;
  if (!HFX.spr) HFX.spr = hfxSprites();
  const g = cv.getContext('2d'), S = HFX.spr;
  let last = performance.now();
  const spawn = (W, H, kind, top) => {
    const z = kind === 'bokeh' ? .6 + Math.random() * .4 : kind === 'near' ? .35 + Math.random() * .25 : Math.random() * .3;   // depth: 1 = nearest
    return { kind, z, x: Math.random() * W, y: top ? -40 : Math.random() * H,
      vx: (4 + Math.random() * 10) * (.4 + z), vy: (3 + Math.random() * 8) * (.4 + z) * (Math.random() < .3 ? -.4 : 1),
      size: kind === 'bokeh' ? 34 + Math.random() * 70 : kind === 'near' ? 10 + Math.random() * 12 : 4 + Math.random() * 6,
      a: kind === 'bokeh' ? .06 + Math.random() * .1 : kind === 'near' ? .55 + Math.random() * .4 : .35 + Math.random() * .45,
      ph: Math.random() * 6.3, sp: .6 + Math.random() * 1.6 };
  };
  // (2026-11-16, ユーザー: batteries) drawn 30 times a second (the specks drift slowly: the same to the eye as 60)
  let lastDraw = 0;
  const step = now => {
    if (!HFX.run) return;
    if (now - lastDraw < 31) { requestAnimationFrame(step); return; }
    lastDraw = now;
    if ($('#home').hidden || DB.set.lite) { HFX.run = false; g.clearRect(0, 0, cv.width, cv.height); return; }
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const dt = Math.min(50, now - last) / 1000; last = now;
    const P = HFX.parts;
    if (!P.length) { for (let i = 0; i < 90; i++) P.push(spawn(W, H, 'far')); for (let i = 0; i < 22; i++) P.push(spawn(W, H, 'near')); for (let i = 0; i < 9; i++) P.push(spawn(W, H, 'bokeh')); }
    const mx = HFX.mx || 0, my = HFX.my || 0;   // (2026-11-16: from the pointer handler — no style read each frame)
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.x += (p.vx + Math.sin(now / 1700 + p.ph) * 6) * dt; p.y += (p.vy + Math.cos(now / 2100 + p.ph) * 4) * dt;
      if (p.x > W + 80 || p.y > H + 80 || p.y < -90) { P[i] = spawn(W, H, p.kind, true); P[i].x = Math.random() * W * .9 - W * .15; continue; }
      const px = p.x - mx * 30 * p.z, py = p.y - my * 20 * p.z;   // (nearer specks move more with the pointer)
      // brighter in the shaft of light from the upper left, fainter in the dark corners
      const lit = .45 + .55 * Math.max(0, 1 - Math.hypot(px / W - .35, py / H - .3) * 1.4);
      const tw = p.kind === 'bokeh' ? .75 + .25 * Math.sin(now / 2600 * p.sp + p.ph) : Math.pow(.5 + .5 * Math.sin(now / 700 * p.sp + p.ph), 2.2);
      const al = p.a * lit * (p.kind === 'bokeh' ? tw : .25 + .75 * tw), sz = p.size * (p.kind === 'bokeh' ? 1 : .8 + .35 * tw);
      g.globalAlpha = Math.min(1, al);
      g.drawImage(p.kind === 'bokeh' ? S.bokeh : S.mote, px - sz, py - sz, sz * 2, sz * 2);
      if (p.kind === 'near' && tw > .82) { const k = (tw - .82) / .18, ss = sz * 2.6; g.globalAlpha = Math.min(1, al * k); g.drawImage(S.star, px - ss, py - ss, ss * 2, ss * 2); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// a little depth: the art and the room shift against each other with the pointer
$('#home').addEventListener('pointermove', e => { const r = $('#home').getBoundingClientRect(); HFX.mx = (e.clientX - r.left) / r.width - .5; HFX.my = (e.clientY - r.top) / r.height - .5; $('#home').style.setProperty('--mx', HFX.mx.toFixed(3)); $('#home').style.setProperty('--my', HFX.my.toFixed(3)); });
// entering the home: the pieces come in one after another
function homeEnter() { const h = $('#home'); h.classList.remove('enter'); void h.offsetWidth; h.classList.add('enter'); homeFx(); }
$('#luxMenu').addEventListener('click', e => { if (e.target.closest('[data-soon]')) { SND.pick(); toast(t('soon')); } });
// settings (the gear at the top right): language, sound, light mode
function openSettings() {
  SND.pick();
  const row = (k, items, cur) => `<div class="st-row"><small>${esc(t(k))}</small><div class="seg" data-k="${k}">${items.map(([v, lab]) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${esc(lab)}</button>`).join('')}</div></div>`;
  // a volume row: its name, a slider, a mute button (ユーザー 2026-11-14)
  const vrow = k => { const off = DB.set[k + 'On'] === false, v = Math.round((DB.set[k + 'Vol'] ?? 1) * 100);
    return `<div class="st-row st-vol ${off ? 'off' : ''}"><small>${esc(t(k === 'se' ? 'se' : 'music'))}<b>${off ? esc(t('mute')) : v}</b></small><div class="st-v"><button class="st-m" data-m="${k}" aria-label="${esc(t('mute'))}">${off ? IC.mute : IC.snd}</button><input type="range" min="0" max="100" step="5" value="${v}" data-k="${k}" style="--p:${v}%"></div></div>`; };
  // (2026-11-15, ユーザー: on a phone everything was too big and the light mode fell off the bottom) two columns — the sound on
  // one side, the language and light mode on the other — which on a phone fit the screen in one view; a PC keeps one column
  const draw = () => `<h2>${esc(t('settings'))}</h2>
    <div class="st-grid"><div class="st-col">${vrow('se')}${vrow('bg')}</div>
    <div class="st-col">${row('language', [['ja', '日本語'], ['en', 'English']], I18N.lang)}
    ${row('tapMode', [['1', t('tapSingle')], ['2', t('tapDouble')]], DB.set.tap2 ? '2' : '1')}
    ${row('lite', [['0', t('off')], ['1', t('on')]], DB.set.lite ? '1' : '0')}
    <p class="st-note">${esc(t('liteNote'))}</p></div></div>
    <div class="cbtns"><button class="btn st-reset" data-a="reset">${esc(t('resetData'))}</button><button class="btn gold" data-a="close">${esc(t('close'))}</button></div>`;
  const box = modal(draw(), 'settings');
  box.addEventListener('input', e => {
    const r = e.target.closest('input[type=range]'); if (!r) return;
    const k = r.dataset.k; DB.set[k + 'Vol'] = r.value / 100; DB.set[k + 'On'] = true; DB.set.snd = true; save(); r.style.setProperty('--p', r.value + '%');
    const row = r.closest('.st-vol'); row.classList.remove('off'); row.querySelector('small b').textContent = r.value; row.querySelector('.st-m').innerHTML = IC.snd;
    SND.unlock(); SND.levels(); SND.resume(); });
  box.addEventListener('change', e => { if (e.target.dataset.k === 'se') SND.tile(); });   // a sample of the effects' level
  box.addEventListener('click', e => {
    if (e.target.closest('[data-a=close]')) { closeModal(); return; }
    if (e.target.closest('[data-a=reset]')) { resetData(); return; }
    const m = e.target.closest('.st-m');
    if (m) { const k = m.dataset.m; DB.set[k + 'On'] = DB.set[k + 'On'] === false; DB.set.snd = true; save(); SND.unlock(); SND.levels(); SND.resume(); sndIcons(); box.innerHTML = draw(); if (DB.set[k + 'On']) SND.pick(); return; }
    const b = e.target.closest('.seg button'); if (!b) return;
    const k = b.parentNode.dataset.k, v = b.dataset.v; SND.pick();
    if (k === 'language') { I18N.set(v); renderHome(); if (window.GameRecord) GameRecord.relabel(); }
    else if (k === 'lite') { DB.set.lite = v === '1'; save(); applyLite(); }
    else if (k === 'tapMode') { DB.set.tap2 = v === '2'; save(); }
    box.innerHTML = draw();
  });
}
// (ユーザー 2026-11-16) データのリセット: asked once more in a popup of its own (what goes, that it cannot be undone), then the save
// is cleared and the page starts again as on a first visit — the settings (sound, language, tap, light mode) are kept
function resetData() {
  SND.pick();
  const b = modal(`<h2>${esc(t('resetData'))}</h2><p class="cq rs-q">${esc(t('resetQ'))}</p><p class="rs-warn">${esc(t('resetWarn'))}</p>
    <div class="cbtns"><button class="btn" data-a="no">${esc(t('cancel'))}</button><button class="btn rs-go" data-a="yes">${esc(t('resetGo'))}</button></div>`, 'small reset');
  b.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a !== 'yes') { closeModal(); openSettings(); return; }
    try { localStorage.setItem(KEY, JSON.stringify({ set: DB.set })); } catch (e) {}
    location.reload();
  });
}
$('#btnSet').addEventListener('click', openSettings);
// 戦績: a labelled button in the home header (PC and phones — this game has no bottom tab bar)
if (window.GameRecord) { GameRecord.init({ game: 'mahjong', lang: () => I18N.lang, menu: '#luxMenu', btnClass: 'lm rec' });
  // (2026-11-15) its dialog joins #root, so that on a phone held upright it turns with the rest of the UI (it stood sideways)
  { const ov = document.querySelector('.grc-ov'); if (ov) $('#root').appendChild(ov); } const rb = $('#btnRecord'); if (rb) { $('#luxMenu').insertBefore(rb, $('#btnStats'));
  const fix = () => { const sp = rb.querySelector('span'); if (sp && !rb.querySelector('.lm-t')) { const ic = rb.querySelector('svg'); rb.innerHTML = `<i class="lm-i">${ic ? ic.outerHTML : ''}</i><span class="lm-t"><b>${esc(sp.textContent)}</b><small>RECORD</small></span>`; } };
  fix(); new MutationObserver(fix).observe(rb, { childList: true }); } }
function applyLite() {
  document.documentElement.classList.toggle('lite', !!DB.set.lite);
  if (TB) TB.setQuality(DB.set.lite ? 'lite' : 'high');
  if (typeof homeFx === 'function' && $('#aaFx')) homeFx();
}
$('#gSnd').addEventListener('click', openSettings);   // the gear: the same settings as the home screen's (ユーザー 2026-11-14)
// phones always use the landscape layout; held upright, the whole UI is turned 90° (no reliance on the OS rotation)
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
function fitRoot() {
  const w = innerWidth, h = innerHeight, de = document.documentElement;
  const rot = PHONE && h > w;
  de.classList.toggle('lp', PHONE); de.classList.toggle('rot', rot);
  de.style.setProperty('--W', (rot ? h : w) + 'px'); de.style.setProperty('--H', (rot ? w : h) + 'px');
  // desktop: home and character screens are laid out at a 1280-wide landscape design size and scaled to fit
  de.classList.toggle('ds', !PHONE);
  if (PHONE) { const W0 = rot ? h : w, H0 = rot ? w : h; de.style.setProperty('--PZ', Math.min(W0 / 1000, H0 / 560).toFixed(4)); }   // (the home is laid out on a 1000×560 stage and scaled, as on PC)
  if (!PHONE) {
    const GW = Math.min(w, h * 2.4), GH = Math.min(h, w / 1.36);   // (the same landscape box as the game: a squarish window gets a band above and below)
    const Z = Math.max(.5, Math.min(GW / 1280, GH / 760, 1.6));
    // game HUD scale for big windows (icons, panels and tiles grow with the window instead of stopping at fixed px)
    de.style.setProperty('--hz', Math.max(1, Math.min(2, Math.min(h, w / 1.36) / 860)).toFixed(3));
    de.style.setProperty('--SW', GW + 'px'); de.style.setProperty('--SH', GH + 'px'); de.style.setProperty('--Z', Z);
    de.style.setProperty('--MZ', Math.max(1, Math.min((w - 40) / 1100, (h - 40) / 700, 1.6)).toFixed(3));   // (the dialogs' zoom on a big window)
    de.style.setProperty('--SX', ((w - GW) / 2) + 'px'); de.style.setProperty('--SY', ((h - GH) / 2) + 'px');
  }
}
fitRoot();
addEventListener('resize', fitRoot);
addEventListener('resize', refitCard);   // (after fitRoot: the stage first, then the card on it)
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, refitCard);
if (window.ResizeObserver) { const ro = new ResizeObserver(refitCard); for (const q of ['#home', '#home .aa-play', '#aaBanner', '#home nav']) { const e = document.querySelector(q); if (e) ro.observe(e); } }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitCard);
addEventListener('orientationchange', () => setTimeout(fitRoot, 120));
$('#btnStart').addEventListener('click', () => { SND.unlock(); startGame(DB.set.mode !== 'free' ? { ranked: true, len: DB.set.len } : {}); });
$('#btnGacha').addEventListener('click', openGacha);
$('#btnColl').addEventListener('click', () => openChara(DB.sel));
$('#chBack').addEventListener('click', () => { SND.pick(); closeChara(); });

// ---------------------------------------------------------------- 段位戦 (ranked)
// (ユーザー 2026-11-14) the ladder of 麻雀天聖's 段位戦: 見習い → 10級 … 1級 → 初段 … 十段 → titles growing grander up to 雀神.
// Points only add up. Every second rank brings a reward character (the summer series). Skills on; the BOTs get stronger with the rank.
// (ユーザー 2026-11-15) the titles above 十段 stay unknown until reached: a badge of ？？？ (what lies up there…?)
const RK_VEIL = 21;
function rkSeen(r) { return r.i < RK_VEIL || r.i <= MJRank.at(DB.rank.pt).i; }
function rkName(r) { return rkSeen(r) ? L(r.name) : '？？？'; }
function rankBadge(r, sz = '') { return rkSeen(r) ? `<span class="rkb rk-${r.tier} ${sz}"><i></i><b>${esc(L(r.name))}</b></span>` : `<span class="rkb rk-x ${sz}"><i></i><b>？？？</b></span>`; }
function rankBar(pt) {
  const r = MJRank.at(pt), n = MJRank.next(pt);
  const f = n ? (pt - r.pt) / (n.pt - r.pt) : 1;
  return `<div class="rk-bar"><i style="--f:${f.toFixed(3)}"></i></div><small class="rk-nx">${n ? esc(t('rkNext', { r: rkName(n), n: n.pt - pt })) : esc(t('rkTop'))}</small>`;
}
function rankStrip(rk) {
  return `<div class="rk-strip ${rk.ups.length ? 'up' : ''}">${rankBadge(rk.r1)}<span class="rk-g">${esc(t('rkGain', { n: rk.gain }))}</span>
    <span class="rk-pt">${DB.rank.pt} pt</span>${rk.ups.length ? `<em class="rk-up">${esc(t('rkUp'))}</em>` : ''}<div class="rk-sb">${rankBar(DB.rank.pt)}</div></div>`;
}
function openRanked() {
  SND.pick();
  const pt = DB.rank.pt, cur = MJRank.at(pt), nx = MJRank.next(pt);
  const nextGift = MJRank.list.find(x => x.reward && x.i > cur.i);
  const P = MJRank.POINTS, lvName = MJRank.botName(pt, t('lv'));
  const veiled = MJRank.list.some(x => !rkSeen(x));
  const rows = (veiled ? `<div class="rk-row rk-veil">${rankBadge(MJRank.list[MJRank.list.length - 1], 'sm')}<span class="rk-vt">${esc(t('rkVeil'))}</span></div>` : '') +
    MJRank.list.filter(rkSeen).reverse().map(x => {
    const g = x.reward ? MJChars.get(x.reward) : null, got = g && owns(g.id);
    return `<div class="rk-row ${x.i === cur.i ? 'cur' : x.i < cur.i ? 'past' : ''}">${rankBadge(x, 'sm')}<span class="rk-need">${x.pt} pt</span>${g ? `<span class="rk-gift ${got ? 'got' : ''}">${frame(g, got ? 'face' : 'silf', got ? '' : 'fr-lock')}<em class="r-${g.rarity}">${g.rarity}</em>${got ? `<b>${esc(L(g.name))}</b>` : `<b>？？？</b>`}</span>` : '<span class="rk-gift none"></span>'}</div>`;
  }).join('');
  const b = modal(`
    <div class="rkd">
      <header><h2>${esc(t('rated'))}<small>RANKED</small></h2><button class="x" data-a="close">×</button></header>
      <div class="rk-main">
        <div class="rk-me">
          <div class="rk-big">${rankBadge(cur, 'lg')}</div>
          <div class="rk-pts"><b>${pt}</b> pt <small>${esc(t('rkGames', { n: DB.rank.games }))}</small></div>
          ${rankBar(pt)}
          ${nextGift ? `<div class="rk-ng"><span class="rk-gimg rk-sil">${frame(MJChars.get(nextGift.reward), 'silf', 'fr-lock')}</span><span><small>${esc(t('rkNextGift'))}</small><b>？？？</b><em>${esc(t('rkGiftAt', { r: rkName(nextGift), n: Math.max(0, nextGift.pt - pt) }))}</em></span></div>` : ''}
          <p class="rk-rule">${esc(t('rkRule', { lv: lvName }))}</p>
          <div class="rk-go">
            <button class="go rk-b" data-len="east"><b>${esc(t('east'))}</b><small>${[0, 1, 2].map(i => `${esc(t('rank')[i])} +${P.east[i]}`).join(' ・ ')}</small></button>
            <button class="go rk-b" data-len="south"><b>${esc(t('south'))}</b><small>${[0, 1, 2].map(i => `${esc(t('rank')[i])} +${P.south[i]}`).join(' ・ ')}</small></button>
          </div>
        </div>
        <div class="rk-ladder" id="rkLadder">${rows}</div>
      </div>
    </div>`, 'ranked');
  void nx;
  const curRow = b.querySelector('.rk-row.cur'); if (curRow) requestAnimationFrame(() => curRow.scrollIntoView({ block: 'center' }));
  b.addEventListener('click', e => {
    if (e.target.closest('[data-a=close]')) { closeModal(); return; }
    const g = e.target.closest('[data-len]'); if (!g) return;
    SND.unlock(); closeModal(); $('#chara').hidden = true; startGame({ ranked: true, len: g.dataset.len });
  });
}
// a rank gained: the new badge large, then each reward character revealed
async function showPromotion(rk) {
  const top = rk.r1;
  if (rk.ups.length) {
  const b = modal(`<div class="rkp rk-${top.tier}"><i class="rkp-rays"></i><small class="rkp-k">${esc(t('rkUp'))}</small>${rankBadge(top, 'xl')}
    <p class="rkp-from">${esc(L(rk.r0.name))} → ${esc(L(top.name))}</p>${rk.gifts.length ? `<p class="rkp-gn">${esc(t('rkGiftGet'))}</p>` : ''}<button class="btn gold nx" data-a="ok">${t('next')}</button></div>`, 'stage rkps');
  SND.limit(top.tier === 't3' ? 5 : top.tier === 't2' ? 4 : top.tier === 't1' ? 3 : 2);
  await waitClick(b, '[data-a=ok]');
  }
  for (const id of rk.gifts) {
    const c = MJChars.get(id), k = useKey(id);
    const g = modal(`<div class="rkg" style="--c:${c.color};--c2:${c.color2}"><i class="rkp-rays"></i><div class="rkg-ch"><img src="${charImg(c, 'full')}" alt=""></div>
      <div class="rkg-tx"><small>${esc(t('rkGiftGet'))}</small><em class="prar r-${c.rarity}">${c.rarity}</em><b>${esc(L(c.name))}</b><span>${esc(L(c.title))}</span>${skillChip(k, 'on')}</div>
      <button class="btn gold nx" data-a="ok">${t('next')}</button></div>`, 'stage rkps');
    SND.gacha(c.rarity);
    await waitClick(g, '[data-a=ok]');
  }
}

// ---------------------------------------------------------------- gacha
const COST1 = 300, COST10 = 2700;
function rollRarity(guarantee) {
  const R = MJChars.RARITY;
  let r = Math.random() * 100, acc = 0, out = 'N';
  for (const k of ['UR', 'SSR', 'SR', 'R', 'N']) { acc += R[k].w; if (r < acc) { out = k; break; } }
  if (guarantee && (out === 'N' || out === 'R')) { const x = Math.random(); out = x < .05 ? 'UR' : x < .25 ? 'SSR' : 'SR'; }
  return out;
}
function rollChar(guarantee) {
  let r = rollRarity(guarantee);
  const gl = MJChars.list.filter(c => c.reward == null);   // (the 段位戦's reward characters never come from the gacha)
  let pool = gl.filter(c => c.rarity === r);
  if (!pool.length) pool = gl;
  return pool[(Math.random() * pool.length) | 0];
}
const DUPE = { N: 30, R: 80, SR: 250, SSR: 800, UR: 2000 };
const RANK_I = r => ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(r);
// (ユーザー 2026-11-16) the pick-up is shown in the gacha, not on the home: the best character not yet owned (or the best of all)
function gPick() { return MJChars.list.filter(x => !owns(x.id) && x.reward == null).sort((a, b) => RORD[a.rarity] - RORD[b.rarity])[0] || MJChars.list.find(x => x.rarity === 'UR'); }
function gPickHTML() { const pk = gPick(); if (!pk) return '';
  return `<div class="gpick" style="--c:${pk.color}"><i class="gp-art" style="background-image:url('${charImg(pk, 'bust')}')"></i><span class="gp-rib">PICK UP</span><span class="gp-tx"><em class="r-${pk.rarity}">${pk.rarity}</em><b>${esc(L(pk.name))}</b><small>${esc(L(pk.title))}</small></span></div>`; }
function openGacha() {
  const b = modal(`
    <div class="gacha">
      <h2>${t('gacha')}<small>GACHA</small></h2>
      <div class="gcoins">${icon('coin')}<b id="gCoins">${DB.coins.toLocaleString()}</b></div>
      <div class="gstage" id="gStage">${gPickHTML()}<div class="gorb"></div><p class="grates">${t('charRates')} UR 1% ・ SSR 4% ・ SR 15% ・ R 35% ・ N 45%<br>${t('skillRates')} SSR 3% ・ SR 12% ・ R 30% ・ N 55%<br><small>${t('tenth')}</small></p></div>
      <div class="gbtns">
        <button class="btn" data-n="1"><b>${esc(t('pull1', { n: '' }).replace(/[（(]\s*[）)]/, '').trim())}</b><small>${icon('coin')}${COST1}</small></button>
        <button class="btn gold" data-n="10"><b>${esc(t('pull10', { n: '' }).replace(/[（(]\s*[）)]/, '').trim())}</b><small>${icon('coin')}${COST10.toLocaleString()}</small></button>
      </div>
      <button class="x" data-a="close">×</button>
    </div>`, 'wide gacham');
  b.addEventListener('click', async e => {
    if (e.target.closest('[data-a=close]')) { closeModal(); if (!$('#chara').hidden) renderChara(); else renderHome(); return; }
    const btn = e.target.closest('[data-n]'); if (!btn || b.busy) return;
    const n = +btn.dataset.n, cost = n === 1 ? COST1 : COST10;
    if (DB.coins < cost) { toast(t('notEnough')); return; }
    b.busy = true;
    DB.coins -= cost;
    const got = [];
    for (let i = 0; i < n; i++) {
      const c = rollChar(n === 10 && i === 9);
      const key = rollSkillKey();
      let kind = 'newChar', refund = 0;
      if (!DB.chars[c.id]) DB.chars[c.id] = { skills: [key], use: key };
      else if (!DB.chars[c.id].skills.includes(key)) { DB.chars[c.id].skills.push(key); kind = 'newSkill'; }
      else { kind = 'dupe'; refund = DUPE[c.rarity]; DB.coins += refund; }
      got.push({ c, key, kind, refund });
    }
    save();
    await showPulls(got);
    $('#gCoins').textContent = DB.coins.toLocaleString();
    b.busy = false;
  });
}
async function showPulls(got) {
  const st = $('#gStage');
  const best = got.reduce((a, g) => RANK_I(g.c.rarity) > RANK_I(a) ? g.c.rarity : a, 'N');
  st.innerHTML = `<div class="gorb spin r-${best}"></div>`;
  SND.gacha(best);
  await sleep(1100);
  st.innerHTML = `<div class="gcards n${got.length}">${got.map((g, i) => `
    <div class="gc frame fr-${g.c.rarity}" style="--d:${i * 110}ms;--c:${g.c.color};--c2:${g.c.color2}">
      <div class="gci"><img src="${charImg(g.c, 'bust')}" alt=""><i class="fx-sh"></i></div>
      <div class="gcn"><em>${g.c.rarity}</em><span class="gcnm">${esc(L(g.c.name))}</span>${skillChip(g.key, 'sm')}</div>
      ${g.kind === 'newChar' ? `<i class="gnew">${t('newChar')}</i>` : g.kind === 'newSkill' ? `<i class="gnew sk">${t('newSkill')}</i>` : `<i class="gdup">${t('dupe', { n: g.refund })}</i>`}
    </div>`).join('')}</div>`;
}
// ---------------------------------------------------------------- character screen (view + choose partner)
let chView = null;
const RORD = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
const FORD = Object.keys(MJChars.families);
function openChara(id) {
  chView = id || DB.sel;
  closeModal();
  $('#home').hidden = true; $('#chara').hidden = false;
  $('#chBack').innerHTML = IC.exit;
  const chs = $('#chara'); chs.classList.remove('enter'); void chs.offsetWidth; chs.classList.add('enter');
  renderChara();
}
function closeChara() { $('#chara').hidden = true; $('#home').hidden = false; renderHome(); homeEnter(); }
let chTab = 'all';
let chPane = 'lead';   // (phone) the right panel's tab: 'lead' (her skill and story) / 'ptn' (the partner and her sisters)
function renderChara() {
  const keepScroll = renderChara.last === chView ? $('#chInfo').scrollTop : 0; renderChara.last = chView;   // (the panel stays where it was scrolled while the same character is on)
  applyText();
  $('#coinN2').textContent = DB.coins.toLocaleString();
  $('#chara .coin').innerHTML = IC.coin;
  $('#chCount').textContent = `${t('owned')} ${Object.keys(DB.chars).length} / ${MJChars.list.length}`;
  // the list (AAA viewer, ユーザー 2026-11-14): filter tabs, then cards
  const tabs = [['all', t('psAll')], ['own', t('owned')], ['UR', 'UR'], ['SSR', 'SSR'], ['SR', 'SR'], ['R', 'R'], ['N', 'N']];
  // (ユーザー 2026-11-15: picking a partner redrew the list on the left) the tabs and the list are rebuilt only when what they
  // show changes (the tab, who is owned, who is the 許婚, the language); otherwise only the mark of the one on view moves
  const setHTML = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
  setHTML($('#chTabs'), tabs.map(([k, lab]) => `<button class="${k === chTab ? 'on' : ''}" data-tab="${k}">${esc(lab)}</button>`).join(''));
  const list = MJChars.list.filter(c => chTab === 'all' || (chTab === 'own' ? owns(c.id) : c.rarity === chTab))
    .sort((a, b) => (!owns(a.id)) - (!owns(b.id)) || RORD[a.rarity] - RORD[b.rarity] || FORD.indexOf(a.family) - FORD.indexOf(b.family));
  setHTML($('#chList'), list.map(c => {
    const own = owns(c.id);
    return `<button class="chi ${own ? '' : 'lock'}" data-id="${c.id}" style="--c:${c.color}">
      ${frame(c, own ? 'face' : 'silf')}<em class="r-${c.rarity}">${c.rarity}</em>${own ? '' : `<i class="lk">${IC.lock}</i>`}${own ? '<i class="pm">★</i>' : ''}<span>${own ? esc(L(c.name)) : '？？？'}</span></button>`;
  }).join(''));
  for (const el of $('#chList').children) { el.classList.toggle('on', el.dataset.id === chView); el.classList.toggle('sel', el.dataset.id === DB.sel); }
  const c = MJChars.get(chView), own = owns(c.id);
  const ch = $('#chara'); ch.style.setProperty('--c', c.color); ch.style.setProperty('--c2', c.color2);
  const full = charImg(c, 'full');
  if ($('#chArt').dataset.id !== c.id + (own ? '' : 'x')) {
    $('#chArt').dataset.id = c.id + (own ? '' : 'x');
    $('#chArt').innerHTML = `<i class="aa-aura"></i><div class="aa-ch ${own ? '' : 'lock'}"><img src="${own ? full : charImg(c, 'sil')}" alt="" draggable="false"></div>` +
      (own ? '' : c.reward != null ? `<div class="unlock"><i>${IC.lock}</i><b>？？？</b><span>${esc(t('mystery'))}<br>${esc(t('rkLocked', { r: rkName(MJRank.list[c.reward]) }))}</span><button class="go sm" data-a="rated">${esc(t('rated'))}</button></div>`
        : `<div class="unlock"><i>${IC.lock}</i><b>？？？</b><span>${esc(t('mystery'))}<br>${esc(t('lockedS', { r: c.rarity }))}</span><button class="go sm" data-a="gacha">${esc(t('toGacha'))}</button></div>`);
    $('#chBlur').src = own ? full : '';   // (a locked character: nothing of her shows, not even blurred behind)
    $('#chBlur').style.visibility = own ? '' : 'hidden';
    $('#chArt').classList.remove('in'); void $('#chArt').offsetWidth; $('#chArt').classList.add('in');
  }
  const sisters = MJChars.list.filter(x => x.family === c.family && x.id !== c.id);
  const o = DB.chars[c.id], uk = own ? useKey(c.id) : null;
  // (ユーザー 2026-11-15) パートナー: one of her sisters, picked by her icon here — her skill is used as well. Nobody picked yet:
  // a line that says so and the icons that can be picked glow, so that anyone finds it.
  const pt = own ? partnerOf(c.id) : null, pk = pt ? partnerKey(c.id) : null, pks = pt ? partnerSkills(c.id) : [];
  const canPick = own && sisters.some(x => owns(x.id));
  const how = t(coarse() ? 'ptnHowT' : 'ptnHowC');
  const mine = sisters.filter(x => owns(x.id)), rest = sisters.length - mine.length;
  // (ユーザー 2026-11-15: the boxes changed size with every skill and partner — hard to use) every part of the block keeps its
  // place and size whoever is picked: header, her sisters, a line (who the partner is / the call to pick one), the skill box
  // (as tall as the longest description: --dl lines), the row of the partner's skills, the cost line.
  const ptn = !own ? '' : `<div class="ptn ${pt ? 'has' : canPick ? 'ask' : 'none'}">
      <div class="ci-h"><b>PARTNER</b><span>${esc(t('partner'))}</span><small class="ptn-cnt">${esc(t('sisters'))} ${mine.length + 1} / ${sisters.length + 1}</small></div>
      <div class="ptn-row">${mine.concat(sisters.filter(x => !owns(x.id))).map(x => { const ow = owns(x.id); return `<button class="sib ${ow ? 'can' : 'lock'} ${pt && x.id === pt.id ? 'on' : ''}" data-id="${x.id}" title="${ow ? esc(L(x.name)) : '？？？'}">${frame(x, ow ? 'face' : 'silf')}${pt && x.id === pt.id ? '<i class="ck"></i>' : ''}<span class="sn">${ow ? esc(L(x.name)) : '？？？'}</span></button>`; }).join('')}</div>
      <div class="ptn-who">${pt ? `<b class="ptn-n">${esc(L(pt.name))}</b><button class="ptn-x">${esc(t('ptnOff'))}</button>`
        : canPick ? `<span class="ptn-cue"><i></i><b>${esc(t('ptnPick'))}</b></span>` : `<small class="ptn-no">${esc(t('ptnNone'))}</small>`}</div>
      <div class="ptn-box">${pt ? (pk ? skillBlock(pk, true) : `<div class="ptn-dup">${skillBlock(useKey(pt.id), true)}<em>${esc(t('ptnSame'))}</em></div>`) : `<p class="ptn-empty">${canPick ? `<b>${esc(how)}</b>` : ''}<span>${esc(t('ptnNote'))}</span></p>`}</div>
      <div class="skl ptn-skl">${pks.map(x => skillChip(x.k, (x.k === pk ? 'on' : '') + (x.ok ? '' : ' off'), `data-k="${x.k}"`)).join('')}</div>
      <small class="ptn-cost">${esc(t('ptnCost'))}</small>
    </div>`;
  // (ユーザー 2026-11-16, phone: everything was too small to read and to pick) on a phone the right panel has two tabs — 許婚 (her skill,
  // the skill to use, her story) and パートナー (her sisters, big, and the partner's skill) — each shown large on its own
  const lpTabs = document.documentElement.classList.contains('lp');
  $('#chInfo').classList.toggle('tabs', !!(lpTabs && own));
  // (ユーザー 2026-11-16, phone) a compact head: her name, then one line — rarity, her title (which names her family already), the coin
  // bonus; the 許婚 mark at the right of the name
  const lpHead = lpTabs && own ? `<div class="ci-hd"><div class="pp-n">${esc(L(c.name))}</div>${c.id === DB.sel ? `<span class="pp-lead">${esc(t('lead'))}</span>` : ''}</div>
    <div class="ch-sub"><em class="prar r-${c.rarity}">${c.rarity}</em><span class="pp-t">${esc(L(c.title))}</span>${RAR_BONUS[c.rarity] ? `<span class="pp-cb">${icon('coin')}+${Math.round(RAR_BONUS[c.rarity] * 100)}%</span>` : ''}</div>` : '';
  $('#chInfo').innerHTML = lpHead ? `${lpHead}
    ${chSelBody()}` : `
    <div class="pp-r"><em class="prar r-${c.rarity}">${c.rarity}</em><span class="pp-f">${esc(L(MJChars.families[c.family].name))}</span>${RAR_BONUS[c.rarity] ? `<span class="pp-cb">${icon('coin')}+${Math.round(RAR_BONUS[c.rarity] * 100)}%</span>` : ''}${own && c.id === DB.sel ? `<span class="pp-lead">${esc(t('lead'))}</span>` : ''}</div>
    <div class="pp-n">${own ? esc(L(c.name)) : '？？？'}</div>
    <div class="pp-t">${esc(L(c.title))}</div>
    <i class="ci-rule"></i>
    ${chSelBody()}`;
  function chSelBody() { return `${own && lpTabs ? `<div class="ci-tabs"><button class="${chPane === 'lead' ? 'on' : ''}" data-pane="lead">${esc(t('lead'))}</button><button class="${chPane === 'ptn' ? 'on' : ''} glow" data-pane="ptn"><span>${esc(t('partner'))}</span>${!pt && canPick ? '<i class="dot"></i>' : ''}</button></div>
      <div class="ci-pane">${chPane === 'lead' ? `${skillBlock(uk)}
        <div class="skl" id="chSk">${o.skills.map(k => skillChip(k, k === uk ? 'on' : '', `data-k="${k}"`)).join('')}</div>
        <div class="ci-h st"><b>STORY</b></div><p class="pprof">${esc(L(c.profile))}</p>` : `<div class="ptn-inl">${ptn}</div>`}</div>` :
      own ? `${skillBlock(uk)}
      <div class="skl" id="chSk">${o.skills.map(k => skillChip(k, k === uk ? 'on' : '', `data-k="${k}"`)).join('')}</div>
      <div class="ptn-inl">${ptn}</div>
      <div class="ci-h st"><b>STORY</b></div><p class="pprof">${esc(L(c.profile))}</p>` : `<div class="chsel lockline"><i>${IC.lock}</i>${esc(c.reward != null ? t('rkLocked', { r: rkName(MJRank.list[c.reward]) }) : t('notOwned'))}</div>
      <div class="sis"><small>${esc(t('sisters'))}</small><div>${sisters.map(x => `<button class="sib ${owns(x.id) ? '' : 'lock'}" data-id="${x.id}" title="${owns(x.id) ? esc(L(x.name)) : '？？？'}">${frame(x, owns(x.id) ? 'face' : 'silf')}</button>`).join('')}</div></div>`}
`; }
  // (ユーザー 2026-11-15: the middle is for her picture — the partner block and the list of her sisters live in the panel on the right)
  // It does not fit: her story gives way first, then the small labels and the size of her name.
  ch.style.setProperty('--dl', /^(ja|zh|ko)/.test(I18N.lang) ? 3 : 5);   // (lines kept for a skill's description: the longest one in this language)
  { const info = $('#chInfo'); info.classList.remove('tight', 'tight2');
    if (!info.classList.contains('tabs')) {   // (the phone's tabs scroll inside their pane instead)
    // (2026-11-16, ユーザー「STORYを長く、収まらなければその場でスクロール」) her story no longer gives way: it keeps what room is
    // left (at least three lines) and scrolls inside itself; only then do the small labels and the size of her name give way
    const st = info.querySelector('.pprof'); if (st) { st.style.maxHeight = ''; st.classList.remove('scroll'); }
    if (st && info.scrollHeight > info.clientHeight + 2) { const lh = parseFloat(getComputedStyle(st).lineHeight) || 24;
      st.style.maxHeight = Math.max(lh * 3, st.offsetHeight - (info.scrollHeight - info.clientHeight) - 4) + 'px'; st.classList.add('scroll'); }
    if (info.scrollHeight > info.clientHeight + 2) info.classList.add('tight2'); }
    info.scrollTop = keepScroll;
    if (!pt && canPick) { const q = info.querySelector('.ptn'); if (q && q.offsetTop + q.offsetHeight > info.scrollTop + info.clientHeight) info.scrollTop = Math.max(0, q.offsetTop - 60); } }   // (the call to pick a partner is never left below the fold)
  $('#chInfo').onclick = e => {
    const tb = e.target.closest('.ci-tabs [data-pane]'); if (tb) { if (chPane !== tb.dataset.pane) { chPane = tb.dataset.pane; SND.pick(); renderChara(); } return; }
    const k = e.target.closest('#chSk [data-k]'); if (k) { DB.chars[c.id].use = k.dataset.k; save(); SND.pick(); renderChara(); return; }
    const k2 = e.target.closest('.ptn-skl [data-k]'); if (k2) { if (k2.classList.contains('off')) { toast(t('ptnSame')); return; } DB.chars[c.id].puse = k2.dataset.k; save(); SND.pick(); renderChara(); return; }
    if (e.target.closest('.ptn-x')) { delete DB.chars[c.id].partner; save(); SND.pick(); renderChara(); return; }
    const sb = e.target.closest('.sib'); if (!sb) return;
    const id = sb.dataset.id;
    if (sb.closest('.ptn') && owns(id)) { if (o.partner === id) delete o.partner; else { o.partner = id; delete o.puse; } save(); SND.ok(); renderChara(); }   // (her sister's icon: take her as the partner; again: let her go)
    else { chView = id; SND.pick(); renderChara(); }                                                                                        // (a character not yet met: look at her sisters)
  };
}
addEventListener('resize', () => { if (!$('#chara').hidden) renderChara(); });
$('#chArt').addEventListener('click', e => { if (e.target.closest('[data-a=gacha]')) { SND.pick(); openGacha(); } else if (e.target.closest('[data-a=rated]')) { SND.pick(); openRanked(); } });
$('#chTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; chTab = b.dataset.tab; SND.pick(); renderChara(); });
// (ユーザー 2026-11-15: no 「許婚にする」 button) the character picked in the list becomes the 許婚 at once, when she is owned;
// one not owned yet is only looked at (the 許婚 stays who she was)
$('#chList').addEventListener('click', e => { const b = e.target.closest('.chi'); if (!b) return; chView = b.dataset.id;
  if (owns(chView) && DB.sel !== chView) { DB.sel = chView; save(); SND.ok(); } else SND.pick();
  renderChara(); });

// ---------------------------------------------------------------- スタッツ (player stats)
// Tap a character (home: the partner's スタッツ button; in a game: any seat's face; the final places) → that player's stats,
// with the character large on the left. Who a seat is comes from UIS.players[s]: { kind: 'me' } · { kind: 'bot', lv } ·
// later { kind: 'online', uid, name } (read through MJStats.remote — the same raw counters as the player's own).
let PS = null;
const RANKC = ['#ffc94a', '#e6ecf5', '#f0a48a', '#8fd9c0'];
const pct = (x, d = 1) => x == null ? '—' : (x * 100).toFixed(d) + '%';
const num = (x, d = 0) => x == null ? '—' : (+x).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
function inGame() { return !!(UIS && G && !$('#game').hidden); }
async function openStats(s) {             // s: a seat of the game on screen; null = the player (home)
  SND.pick();
  const ig = s != null && inGame();
  const pl = ig ? (UIS.players && UIS.players[s]) || { kind: s === ME ? 'me' : 'bot', lv: DB.set.lv } : { kind: 'me' };
  const c = ig ? UIS.chars[s] : mySeat();
  const tabs = [];
  if (pl.kind === 'me') {
    const P = DB.pstats;
    tabs.push(['all', t('psAll'), MJStats.sum(P.skill, P.std, P.old)], ['skill', t('skillOn'), P.skill], ['std', t('skillOff'), P.std]);
    if (!ig) tabs.push(['log', t('history'), null]);
  } else if (pl.kind === 'online' && MJStats.remote) {
    let r = null; try { r = await MJStats.remote(pl.uid); } catch (e) {}
    if (r && r.raw) tabs.push(['all', t('psAll'), MJStats.sum(r.raw.skill, r.raw.std)], ['skill', t('skillOn'), MJStats.fix(r.raw.skill)], ['std', t('skillOff'), MJStats.fix(r.raw.std)]);
  }
  if (ig && UIS.track) tabs.push(['game', t('psGame'), UIS.track.seat[s]]);
  let tab = tabs[0] ? tabs[0][0] : 'game';
  if (ig && pl.kind === 'me' && !tabs[0][2].games) tab = 'game';      // nothing finished yet: start on this game
  PS = { s, ig, pl, c, tabs, tab };
  renderStats();
  const el = $('#pstats'); el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
}
// 対局履歴: newest first — when, the rules, who was played, the place, the final points, and in ranked play the points gained.
// Games from before this log (kept by the shared record) are shown after, with what they recorded.
function histHTML() {
  const L0 = (DB.hist || []).slice().reverse();
  let old = []; try { if (window.GameRecord) old = GameRecord.load().filter(x => x.t && !(DB.hist || []).some(h => Math.abs(h.t - x.t) < 5000)).reverse(); } catch (e) {}
  if (!L0.length && !old.length) return `<p class="ps-empty">${esc(t('psEmpty'))}</p>`;
  const dt = ms => { const d = new Date(ms), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())}<small>${z(d.getHours())}:${z(d.getMinutes())}</small>`; };
  const pc = ['p1', 'p2', 'p3', 'p4'];
  const rows = L0.map(h => { const c = MJChars.get(h.ch);
    return `<div class="ph-r ${pc[h.pl]}"><span class="ph-d">${dt(h.t)}</span>
      <span class="ph-pl">${t('rank')[h.pl]}</span>
      ${c ? `<span class="ph-c">${frame(c, 'face')}<b>${esc(L(c.name))}</b></span>` : '<span></span>'}
      <span class="ph-m">${esc(h.rk ? t('rated') : t('freePlay'))}<small>${esc(t(h.len === 'south' ? 'south' : 'east'))} · ${esc(t(h.sk ? 'skillOn' : 'skillOff'))}</small></span>
      <span class="ph-s">${num(h.sc)}<small>${esc(t('ptsUnit'))}</small></span>
      <span class="ph-g">${h.g != null ? `<b class="${h.g > 0 ? 'up' : ''}">${h.g > 0 ? '+' : ''}${h.g} pt</b><small>${esc(rkName(MJRank.list[h.rn] || MJRank.list[0]))}</small>` : ''}</span></div>`; }).join('');
  const orows = old.map(x => `<div class="ph-r old ${x.res === 'w' ? 'p1' : x.res === 'l' ? 'p4' : ''}"><span class="ph-d">${dt(x.t)}</span><span class="ph-pl">${esc(x.why ? String(x.why).split('·')[0].trim() : '')}</span><span></span><span class="ph-m">${esc(x.opp || '')}</span><span class="ph-s">${esc(x.why && String(x.why).includes('·') ? String(x.why).split('·')[1].trim() : '')}</span><span></span></div>`).join('');
  return `<div class="ph-list">${rows}${orows}</div>`;
}
// the yaku list's groups (ユーザー 2026-11-15): by han (closed), and the yakuman apart
const YAKU_CAT = [
  ['ycat1', ['riichi', 'ippatsu', 'tsumo', 'pinfu', 'tanyao', 'iipeikou', 'haku', 'hatsu', 'chun', 'seat_wind', 'round_wind', 'haitei', 'houtei', 'rinshan', 'chankan']],
  ['ycat2', ['dbl_riichi', 'chiitoi', 'chanta', 'ittsu', 'sanshoku', 'sanshoku_k', 'toitoi', 'sanankou', 'sankantsu', 'shousangen', 'honroutou']],
  ['ycat3', ['honitsu', 'junchan', 'ryanpeikou', 'chinitsu']],
  ['ycatY', ['kokushi', 'suuankou', 'daisangen', 'shousuushii', 'daisuushii', 'tsuuiisou', 'ryuuiisou', 'chinroutou', 'chuuren', 'suukantsu', 'tenhou', 'chiihou']]];
// a yaku's short note in a bubble over its row: on hover with a mouse, on tap on a touch screen (ユーザー 2026-11-15)
function yakuTip(row) {
  const D = window.YAKU_DESC, k = row.dataset.yk, txt = D && ((D[I18N.lang] || D.en)[k] || D.en[k]);
  let tip = document.querySelector('.yk-tip');
  if (!txt) { if (tip) tip.remove(); return; }
  if (tip && tip.dataset.k === k && tip.classList.contains('show') && !fine.matches) { tip.classList.remove('show'); return; }
  if (!tip) { tip = document.createElement('div'); tip.className = 'yk-tip'; }
  const host = row.closest('.ps-main') || document.body; host.appendChild(tip);
  tip.dataset.k = k; tip.innerHTML = `<b>${esc(I18N.yaku(k))}</b><span>${esc(txt)}</span>`;
  const H = host.getBoundingClientRect(), r = row.getBoundingClientRect(), sx = H.width / host.offsetWidth || 1, sy = H.height / host.offsetHeight || 1;
  const rot = document.documentElement.classList.contains('rot'), R = rot ? uiRect(row) : r, HH = rot ? uiRect(host) : H;
  const x = (R.left - HH.left) / (rot ? 1 : sx), y = (R.top - HH.top) / (rot ? 1 : sy), w = R.width / (rot ? 1 : sx);
  const mw = Math.min(Math.max(320, parseFloat(getComputedStyle(tip).fontSize) * 27), host.clientWidth - 16);   // (the bubble's text grows with the screen, and its width with the text)
  tip.style.left = Math.max(8, Math.min(host.clientWidth - 8 - mw, x)) + 'px';
  tip.style.top = y + 'px'; tip.style.maxWidth = mw + 'px';
  tip.classList.toggle('below', y < 90);
  if (tip.classList.contains('below')) tip.style.top = (y + (R.height / (rot ? 1 : sy))) + 'px';
  void tip.offsetWidth; tip.classList.add('show');
}
document.addEventListener('mouseover', e => { if (!fine.matches) return; const yk = e.target.closest && e.target.closest('#pstats [data-yk]'); if (yk) yakuTip(yk); else if (!e.target.closest || !e.target.closest('.yk-tip')) { const t0 = document.querySelector('.yk-tip.show'); if (t0) t0.classList.remove('show'); } });
function closeStats() { const el = $('#pstats'); if (el.hidden) return; el.classList.remove('show'); el.hidden = true; el.innerHTML = ''; PS = null; }
function renderStats() {
  const P = PS, c = P.c, pl = P.pl;
  const tb = P.tabs.find(x => x[0] === P.tab) || P.tabs[0];
  const raw = (tb && tb[2]) || MJStats.blank(), D = MJStats.derive(raw), isG = !!tb && tb[0] === 'game';
  // (in ranked play the bots' strength is not shown — only the rank, as on the ranked screen)
  const who = pl.kind === 'me' ? t('you') : pl.kind === 'bot' ? (inGame() && UIS.ranked ? 'BOT' : 'BOT · ' + t('lv')[Math.max(0, Math.min(4, pl.lv | 0))]) : esc(pl.name || '');
  const sk = (P.ig ? (c.skill ? MJSkills.key(c.skill, c.tier | 0) : null) : useKey(c.id));
  const empty = tb && tb[0] === 'log' ? false : isG ? !D.hands : !D.games && !D.hands;
  let place = null; if (isG && G) place = G.ranking().indexOf(P.s);
  const big = isG
    ? [[t('psHands'), num(D.hands)], [t('psNow'), place == null ? '—' : t('rank')[place]], [t('psWin'), pct(D.win)], [t('psDealin'), pct(D.dealin)]]
    : [[t('psGames'), num(D.games)], [t('psAvgRank'), num(D.avgRank, 2)], [t('psWin'), pct(D.win)], [t('psDealin'), pct(D.dealin)]];
  const rows = (isG ? [] : [[t('psTop'), pct(D.top)], [t('psRentai'), pct(D.rentai)], [t('psLastAvoid'), pct(D.lastAvoid)], [t('psAvgScore'), num(D.avgScore)], [t('psBust'), pct(D.bust)]])
    .concat([[t('psRiichi'), pct(D.riichi)], [t('psCall'), pct(D.call)], [t('psTsumo'), pct(D.tsumo)], [t('psRiichiWin'), pct(D.riichiWin)],
      [t('psAvgWin'), num(D.avgWin)], [t('psAvgDeal'), num(D.avgDealin)], [t('psDrawTen'), pct(D.drawTenpai)],
      isG ? [t('psSkillN'), num(raw.skillUses)] : [t('psSkill'), num(D.skillPerGame, 2)], [t('psYakuman'), num(D.yakuman)]]);
  const mw = D.maxWin;
  const mwHtml = mw && mw.pts ? `<b class="ps-mwp">${num(mw.pts)}</b><span>${mw.limit ? esc(t(mw.limit)) : esc(t('han', { n: mw.han }) + ' ' + t('fu', { n: mw.fu }))}${mw.yaku ? ` · ${esc(I18N.yaku(mw.yaku))}` : ''}</span>` : `<span class="ps-none">—</span>`;
  // (ユーザー 2026-11-15) every yaku ever made: how many times, and in what share of all the hands played (回数 / 総局数)
  // (ユーザー 2026-11-15: every yaku of the game listed — those never made too, at 0, after the ones made)
  const NOTY = { dora: 1, aka: 1, ura: 1, skill_han: 1 }, made = raw.yaku || {};
  const yAll = (I18N.yakuKeys ? I18N.yakuKeys() : Object.keys(made)).filter(k => !NOTY[k]).map((k, i) => [k, made[k] || 0, i])
    .sort((a, b) => b[1] - a[1] || a[2] - b[2]), ymax = Math.max(1, ...yAll.map(x => x[1]));
  const yHd = `<span>${esc(t('psYakuName'))}</span><span>${esc(t('psYakuN'))}</span><span>${esc(t('psYakuP'))}</span>`;
  // (ユーザー 2026-11-15) the main page keeps to the top five made; the full list is its own page (「全役を見る」)
  const yRow = ([k, n]) => `<div class="ps-yk${n ? '' : ' zero'}" data-yk="${k}"><span>${esc(I18N.yaku(k))}</span><b>${n}</b><em>${pct(raw.hands ? n / raw.hands : 0)}</em><i><u style="width:${(n / ymax * 100).toFixed(1)}%"></u></i></div>`;
  const yTop = yAll.filter(x => x[1]).slice(0, 5);
  const yTopHtml = yTop.length ? `<div class="ps-yh">${yHd}</div>` + yTop.map(yRow).join('') : `<span class="ps-none">—</span>`;
  const yAllPage = `<div class="ps-yall"><div class="ps-yall-h"><h4>${esc(t('psYakuList'))}</h4><small>${esc(t('psYakuOf', { n: num(raw.hands) }))}</small></div>
    ${YAKU_CAT.map(([lab, keys]) => { const rows = yAll.filter(x => keys.includes(x[0])); return rows.length ? `<section class="ps-ycat"><h5>${esc(t(lab))}</h5>
      <div class="ps-yks two"><div class="ps-yh">${yHd}</div><div class="ps-yh ps-yh2">${yHd}</div>${rows.map(yRow).join('')}</div></section>` : ''; }).join('')}</div>`;
  let chHtml = '';
  if (pl.kind === 'me' && tb && tb[0] === 'all') {
    const ch = Object.entries(DB.pstats.chars).filter(([id]) => MJChars.get(id)).sort((a, b) => b[1].g - a[1].g).slice(0, 6);
    if (ch.length) chHtml = `<section class="ps-sec ps-chs"><h4>${t('psChars')}</h4><div>${ch.map(([id, o]) => { const x = MJChars.get(id); const ar = o.g ? (o.r[0] + o.r[1] * 2 + o.r[2] * 3 + o.r[3] * 4) / o.g : null; return `<div class="ps-ch" style="--c:${x.color}"><img src="${charImg(x, 'face')}" alt=""><b>${esc(L(x.name))}</b><small>${esc(t('psGamesN', { n: o.g }))} · ${esc(t('psAvgRank'))} ${num(ar, 2)}</small></div>`; }).join('')}</div></section>`;
  }
  $('#pstats').innerHTML = `
    <div class="ps-box" style="--c:${c.color};--c2:${c.color2}">
      <div class="ps-art ch-art frame fr-${c.rarity}" style="--c:${c.color};--c2:${c.color2}"><span class="ps-pic"><img src="${charImg(c, 'full')}" alt=""></span><i class="fx-sh"></i></div>
      <div class="ps-main">
        <header class="ps-h">
          <div class="ps-id"><em class="prar r-${c.rarity}">${c.rarity}</em><div><b>${esc(L(c.name))}</b><small>${esc(L(c.title))}</small></div></div>
          ${pl.kind === 'me' ? '' : `<span class="ps-who">${who}</span>`}
          ${tb && tb[0] !== 'log' ? `<button class="ps-yt" data-a="${P.yakuAll ? 'yback' : 'yall'}">${esc(t(P.yakuAll ? 'record' : 'psYakuList'))}</button>` : ''}
          <button class="x" data-a="close" aria-label="${esc(t('close'))}">×</button>
        </header>
        ${sk ? `<div class="ps-sk">${skillChip(sk)}${c.skill2 ? skillChip(MJSkills.key(c.skill2, c.tier2 | 0)) : ''}</div>` : ''}
        ${P.tabs.length > 1 && !P.yakuAll ? `<div class="ps-tabs">${P.tabs.map(([k, lab]) => `<button class="${k === (tb && tb[0]) ? 'on' : ''}" data-tab="${k}">${esc(lab)}</button>`).join('')}</div>` : ''}
        <div class="ps-body">
          ${P.yakuAll && tb && tb[0] !== 'log' ? yAllPage : tb && tb[0] === 'log' ? histHTML() : !tb ? `<p class="ps-empty">${esc(t('psNoData'))}</p>` : empty ? `<p class="ps-empty">${esc(t(isG ? 'psEmptyG' : 'psEmpty'))}</p>` : `
          <div class="ps-big">${big.map(([l, v]) => `<div><small>${esc(l)}</small><b>${v}</b></div>`).join('')}</div>
          ${isG ? '' : `<section class="ps-sec"><h4>${t('psRanks')}</h4><div class="ps-rbar">${D.rankP.map((p, i) => p ? `<i style="flex:${p};--rc:${RANKC[i]}"><b>${t('rank')[i]}</b><span>${pct(p)}</span></i>` : '').join('')}</div>
            <div class="ps-rn">${raw.rank.map((n, i) => `<span style="--rc:${RANKC[i]}"><i></i>${t('rank')[i]} <b>${n}</b></span>`).join('')}</div></section>`}
          <div class="ps-grid">${rows.map(([l, v]) => `<div><span>${esc(l)}</span><b>${v}</b></div>`).join('')}</div>
          <div class="ps-cols"><section class="ps-sec ps-mw"><h4>${t('psMaxWin')}</h4><div>${mwHtml}</div></section><section class="ps-sec ps-yaku"><h4>${t('psYaku')}<small>${esc(t('psYakuOf', { n: num(raw.hands) }))}</small></h4><div class="ps-yks">${yTopHtml}</div></section></div>
          ${chHtml}`}
          ${tb && tb[0] === 'log' ? '' : pl.kind === 'bot' ? `<p class="ps-note">${esc(t('psBotNote'))}</p>` : pl.kind === 'me' ? `<p class="ps-note">${esc(t('psNote'))}</p>` : ''}
        </div>
      </div>
    </div>`;
}
$('#pstats').addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]'); if (tb && PS) { PS.tab = tb.dataset.tab; PS.yakuAll = false; SND.pick(); renderStats(); return; }
  const yk = e.target.closest('[data-yk]'); if (yk) { yakuTip(yk); return; }
  if (e.target.closest('[data-a=yall]') && PS) { PS.yakuAll = true; SND.pick(); renderStats(); return; }
  if (e.target.closest('[data-a=yback]') && PS) { PS.yakuAll = false; SND.pick(); renderStats(); return; }
  if (e.target.closest('[data-a=close]') || !e.target.closest('.ps-main, .ps-art')) { SND.pick(); closeStats(); }
});

// ================================================================ GAME
let G = null;          // MJGame
let TB = null;         // Table3D
let UIS = null;        // ui state for the game screen
const ME = 0;

class Human {
  get interactive() { return true; }   // (game.js asks the BOTs first and skips the player's call offer when a BOT rons)
  dealSkill(g, s, o) { return new Promise(res => askDealSkill(o, res)); }
  turn(g, s, o) { return new Promise(res => myTurn(o, res)); }
  react(g, s, o) { return new Promise(res => myCall(o, res)); }
}
class SlowBot {
  constructor(lv) { this.b = new MJBot.Bot(lv); }
  async turn(g, s, o) { await sleep(320 + Math.random() * 380); return this.b.turn(g, s, o); }
  async react(g, s, o) { if (o.canRon) await sleep(250); return this.b.react(g, s, o); }
  async dealSkill(g, s, o) { await sleep(150); return this.b.dealSkill(g, s, o); }
}

class AutoMe extends SlowBot {     // ?auto: the player's seat plays itself (testing)
  async react(g, s, o) { const a = await super.react(g, s, o); return a; }
}
// auto-advance result screens in ?auto mode
const AUTO = /[?&]auto/.test(location.search);

async function startGame(opt = {}) {
  if (window.MJ && MJ.clearCache) MJ.clearCache();   // (a fresh game: the memo tables start empty, so they never pile up across games)
  SND.newGame();   // opt.ranked: a 段位戦 game, opt.len its length
  $('#home').hidden = true; $('#game').hidden = false;
  closeModal();
  if (!TB) { TB = new Table3D($('#stage')); TB.setQuality(DB.set.lite ? 'lite' : 'high'); TB.doraFn = isDora; TB.onTileLand = () => SND.tile(); TB.warm(); }
  TB.resume();
  TB.hideAll();
  const me = mySeat();
  const pool = MJChars.list.filter(c => c.id !== me.id && !(me.partner && c.id === me.partner.id) && (c.reward == null || owns(c.id)));   // (a reward character not yet earned never sits at the table)
  const picked = pool.slice().sort(() => Math.random() - .5).slice(0, 3);
  // (fair play) when the player brings a partner's skill, each BOT brings a sister's too — a second skill of another kind
  const taken = new Set([me.id, ...picked.map(c => c.id)]); if (me.partner) taken.add(me.partner.id);
  // (ユーザー 2026-11-15) in 段位戦 up to 6級 the BOTs bring one skill only, even when the player brings two (an easier start;
  // tools/dual-skill-sim.js: two skills against one is worth about 0.06 of a place)
  const bot1 = !!opt.ranked && DB.rank.pt < MJRank.list.find(r => r.name.ja === '5級').pt;
  const others = picked.map(c => {
    const key = rollSkillKey();
    if (!me.skill2 || bot1) return seatChar(c, key);
    const sis = pool.filter(x => x.family === c.family && !taken.has(x.id)).sort(() => Math.random() - .5)[0];
    if (!sis) return seatChar(c, key);
    taken.add(sis.id);
    let k2 = rollSkillKey(); for (let n = 0; n < 20 && MJSkills.parse(k2).id === MJSkills.parse(key).id; n++) k2 = rollSkillKey();
    return seatChar(c, key, sis, k2);
  });
  const chars = [me, ...others];
  chars.concat(chars.map(c => c.partner).filter(Boolean)).forEach(c => { const im = new Image(); im.src = charImg(c, 'full'); if (im.decode) im.decode().catch(() => {}); });   // cut-in art, loaded and decoded in advance
  const ranked = !!opt.ranked, len = ranked ? opt.len : DB.set.len, lv = ranked ? MJRank.botLv(DB.rank.pt) : DB.set.lv, skills = ranked ? true : DB.set.skills;
  UIS = { ranked: ranked ? { len } : null, lv, chars, players: [{ kind: 'me' }, ...[1, 2, 3].map(() => ({ kind: 'bot', lv }))], track: new MJStats.Tracker(), drawnBy: [null, null, null, null], abort: false, hand: [], intel: null, picked: null, riichiMode: false, resolve: null, opts: null, kind: null };
  const auto = /[?&]auto/.test(location.search);
  const agents = [auto ? new AutoMe(lv) : new Human(), new SlowBot(lv), new SlowBot(lv), new SlowBot(lv)];
  G = new MJGame({ agents, chars, rules: { length: len, skills }, ui: onEvent });
  UIS.game = G;
  TB.setSleeves(chars.map(c => c.color), chars.map(c => c.nail));   // (each seat's sleeve in her sisters' colour)
  $('#gSnd').innerHTML = IC.gear; $('#gExit').innerHTML = IC.exit;
  $('#gKeys').innerHTML = IC.keys; $('#gKeys').title = t('keysT'); $('#gKeys').setAttribute('aria-label', t('keysT')); showKeys(false);
  $('#khelp').innerHTML = t('keys');
  sndIcons();
  const g0 = G;
  try { await G.run(); } catch (e) { if (e !== 'abort') { console.error(e); toast('Error: ' + e.message, 5000); } }
  if (g0 !== G) return;
}
// a seat's face → that player's stats
$('#game .hud').addEventListener('click', e => {
  const o = e.target.closest('.opp, .me .mb'); if (!o || !UIS) return;
  openStats(o.id ? +o.id.slice(3) : ME);
});
// the keyboard help (PC): folded away; the ？ button at the top right opens and closes it (ユーザー 2026-11-14)
function showKeys(on) { $('#khelp').classList.toggle('open', on); $('#gKeys').classList.toggle('on', on); $('#gKeys').setAttribute('aria-expanded', on ? 'true' : 'false'); }
$('#gKeys').addEventListener('click', e => { e.stopPropagation(); SND.pick(); showKeys(!$('#khelp').classList.contains('open')); });
document.addEventListener('pointerdown', e => { if ($('#khelp').classList.contains('open') && !e.target.closest('#khelp, #gKeys')) showKeys(false); }, true);
$('#gExit').addEventListener('click', async () => {
  if (!(await confirmBox(t('exitQ')))) return;
  quitGame();
});
function quitGame() { if (window.MJSkillFx) MJSkillFx.stop();
  if (UIS) UIS.abort = true;
  SND.music('title');
  closeStats();
  $('#dealAsk').hidden = true;
  G = null;
  $('#game').hidden = true; $('#home').hidden = false;
  setTimeout(homeEnter, 0);
  if (TB) TB.pause();
  closeModal(); $('#cutin').hidden = true;
  renderHome();
}

// ---------------------------------------------------------------- events from the game
async function onEvent(ev, d) {
  if (!UIS || UIS.abort || UIS.game !== G) throw 'abort';
  const g = G;
  UIS.track.on(ev, d, g);
  if (ev === 'agari' || ev === 'ryuukyoku' || ev === 'game-end') closeStats();
  switch (ev) {
    case 'game-start': renderBadges(); break;
    case 'hand-start': {
      SND.music('main');
      TB.hideAll();
      UIS.intel = null; $('#intel').hidden = true;
      refreshTable(); renderBadges(); renderHand(); layoutAll();
      await roundBanner(g);
      break;
    }
    case 'draw': {
      TB.setInfo({ left: g.liveLeft(), turn: d.seat });
      UIS.drawnBy[d.seat] = d.id;
      if (d.seat === ME) renderHand(d.id);
      else TB.layoutHand(d.seat, g.P[d.seat].hand.slice(0, -1), g.P[d.seat].hand[g.P[d.seat].hand.length - 1]);
      break;
    }
    case 'discard': {
      const p = g.P[d.seat];
      if (d.riichi) { await cutin(d.seat, 'riichi'); SND.music('riichi'); }
      layoutRiver(d.seat, true);   // (the tile's sound plays when it lands — TB.onTileLand)
      // (others: the hand tidies the row after laying the tile — the drawn tile goes to its place, or the row is pushed together. ユーザー 2026-11-14)
      if (d.seat !== ME) { const dr = UIS.drawnBy[d.seat]; TB.sortAfterDiscard(d.seat, p.hand, dr != null && !d.tsumogiri && p.hand.includes(dr) ? dr : null); }
      else { clearActs(); renderHand(); }
      UIS.drawnBy[d.seat] = null;
      await sleep(d.seat === ME ? 600 : 700);   // (ユーザー 2026-11-14: the next player's draw showed while the hand was still putting the tile out — wait until it is about down)
      break;
    }
    case 'riichi-stick': SND.stick(); TB.setStick(d.seat, true); refreshTable(); renderBadges(); break;
    case 'call': {
      SND.call(); SND.voice(d.type === 'chi' ? 'chi' : d.type === 'pon' ? 'pon' : 'kan');
      await callout(d.seat, d.type === 'chi' ? t('chi') : d.type === 'pon' ? t('pon') : t('kan'));
      // the caller's hand takes the tile (チー・ポン・明槓: from the river where it lies; 暗槓・加槓: from the caller's own hand)
      const cid = d.called != null ? d.called : d.added != null ? d.added : d.tiles[0], was = d.called != null ? TB.tilePose(cid) : null;
      layoutAll();
      if (d.seat === ME && d.called != null) TB.tile(cid).visible = false;   // (my melds are drawn in the page: the tile has no place on the table — carried off toward me)
      TB.carry(d.seat, cid, was && was.seen ? was : null);
      await sleep(d.called != null ? 620 : 380);
      if (d.seat === ME) renderHand();
      renderBadges();
      break;
    }
    case 'dora': refreshTable(); renderHand(); TB.dirty = true; break;
    case 'skill': {
      if (d.cost > 0) SND.stick();   // (the points go into the pot)
      await cutin(d.seat, 'skill', d);
      if (FAST >= 1 && window.MJSkillFx && TB) { SND.skillFx(d.skill); await MJSkillFx.play(d.skill, d.seat, TB, { lite: !!DB.set.lite }); }   // (ユーザー 2026-11-15: after the picture and the words, the skill's own effect over the table — skillfx.js)
      refreshTable(); renderBadges();
      if (d.seat === ME) {
        if (d.info.peek) await peekPop(d.info.peek);   // (ユーザー 2026-11-15: shown once, mid-screen — remembered, not kept in the box)
        if (d.info.read) await mindPop(d.info.read);   // (ユーザー 2026-11-16: like 先読み — shown once, mid-screen, then gone)
        if (d.info.to != null) renderHand(d.info.to);
      }
      break;
    }
    case 'agari': {
      SND.music(null);   // (the game's music stops at the end of a hand; each results screen plays its own short piece once — SND.score) (ユーザー 2026-11-14: the results of a hand have their own music; the game's comes back with the next hand, on the table)
      clearActs();
      for (const r of d.results) await cutin(r.seat, r.tsumo ? 'tsumo' : 'ron');
      SND.win();
      for (const r of d.results) if (r.seat !== ME) TB.layoutHand(r.seat, r.hand, null, true);
      await sleep(400);
      for (let i = 0; i < d.results.length; i++) await showAgari(d, d.results[i], i === d.results.length - 1);
      await showMoves(d, { win: d.results.map(r => r.seat) });
      break;
    }
    case 'ryuukyoku': {
      SND.music(null);
      clearActs();
      for (let s = 1; s < 4; s++) if (d.tenpai[s]) TB.layoutHand(s, d.hands[s], null, true);
      if (!d.abort) SND.voice(d.tenpai[ME] ? 'tenpai' : 'noten');   // (ユーザー 2026-11-14: only the player's own テンパイ / ノーテン)   // (each player declares, from the dealer round)
      await showRyuukyoku(d);
      break;
    }
    case 'game-end': await showFinal(d); break;
  }
}

function refreshTable() {
  const g = G;
  TB.setInfo({ round: g.round, kyoku: g.kyoku, honba: g.honba, kyotaku: g.kyotaku, left: g.liveLeft ? g.liveLeft() : 70, scores: g.scores.slice(), dealer: g.dealer });
  const inds = g.doraInds ? g.doraInds() : [];
  // (ユーザー 2026-11-14: the box shows the dora, and under it the pot and the counters as stick × n — the round and the tiles
  // left are on the score unit in the middle of the table)
  const ky = Math.round(g.kyotaku / 100) / 10;
  // (the dora indicators as the 3D tiles of the table — TB.tileShot; no label)
  const shot = (id, bk) => `<span class="t3"><img src="${TB.tileShot(id, bk)}" alt="" draggable="false"></span>`;
  $('#rbox').innerHTML = `<div class="rd" title="${esc(t('dora'))}">${[0, 1, 2, 3, 4].map(i => i < inds.length ? shot(inds[i] * 4 + (inds[i] === 4 || inds[i] === 13 || inds[i] === 22 ? 1 : 0)) : shot(0, true)).join('')}</div>
    <div class="rs"><span title="${esc(t('kyotakuT'))}">${STICK1000}<b>×${ky}</b></span><span title="${esc(t('honbaT'))}">${STICK100}<b>×${g.honba}</b></span></div>`;
}
const STICK1000 = '<svg class="stk" viewBox="0 0 64 10"><rect x="1" y="1" width="62" height="8" rx="4" fill="#f4f1ea" stroke="#9aa0b0" stroke-width=".8"/><circle cx="32" cy="5" r="2.6" fill="#d8283c"/></svg>';
const STICK100 = '<svg class="stk" viewBox="0 0 64 10"><rect x="1" y="1" width="62" height="8" rx="4" fill="#f4f1ea" stroke="#9aa0b0" stroke-width=".8"/><g fill="#2a2a33"><circle cx="9" cy="3.6" r="1.1"/><circle cx="13" cy="3.6" r="1.1"/><circle cx="9" cy="6.4" r="1.1"/><circle cx="13" cy="6.4" r="1.1"/><circle cx="51" cy="3.6" r="1.1"/><circle cx="55" cy="3.6" r="1.1"/><circle cx="51" cy="6.4" r="1.1"/><circle cx="55" cy="6.4" r="1.1"/></g></svg>';
function layoutRiver(s, anim) {
  const p = G.P[s];
  const riv = p.river.map((r, i) => ({ id: r.id, taken: r.taken, sideways: i === p.riichiTurn || (p.riichiTurn >= 0 && i > p.riichiTurn && p.river.slice(p.riichiTurn, i).every(x => x.taken) && i === firstVisibleAfter(p)) }));
  // my own discard: the hand pinches the very tile of my hand row (the page's tile: its place and size on the screen → a pose
  // in front of the camera that covers it) and takes it out to the river
  let lx = 0;
  // (the tile's place is read from the layout — offsets up to #game — not from the screen: on a phone held upright the whole
  // game is turned 90°, where screen rectangles are turned too. 2026-11-14: with that case left out the hand came from the
  // table's edge instead, which is what a phone or a narrow window showed)
  if (anim && s === ME && riv.length) { try {
    const el = document.querySelector(`#hand .tl[data-id="${riv[riv.length - 1].id}"]`), root = $('#game');
    const off = e => { let x = 0, y = 0; for (let n = e; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };
    if (el && root.contains(el)) { const [ex, ey] = off(el), [sx, sy] = off($('#stage')); lx = TB.screenPose(ex + el.offsetWidth / 2 - sx, ey + el.offsetHeight / 2 - sy, el.offsetWidth);
      // (2026-11-16, ユーザー「スマホで捨てる牌が暗い四角になる」: until the hand has its fingers on it, the tile stays the page's own
      // tile — a copy left where it stood, while the row closes up — and the 3D tile (lit by the table's lights, so greyer than the
      // flat picture) takes over only when it is picked up)
      const hud = el.closest('.hud') || root, [hx, hy] = off(hud), gh = el.cloneNode(true);
      gh.classList.remove('up', 'can', 'no'); gh.classList.add('ghost'); gh.querySelectorAll('kbd,.hit').forEach(n => n.remove());
      gh.style.cssText = `position:absolute;left:${ex - hx}px;top:${ey - hy}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;margin:0;pointer-events:none`;
      hud.appendChild(gh);
      const drop = () => { gh.remove(); if (TB.onPageTake === drop) TB.onPageTake = null; };
      TB.onPageTake = drop; setTimeout(drop, 1200); }
  } catch (e) {} }
  TB.layoutRiver(s, riv, anim, lx);
}
function firstVisibleAfter(p) {   // riichi tile was called: the next visible tile is turned instead
  if (p.riichiTurn < 0 || !p.river[p.riichiTurn].taken) return -1;
  for (let i = p.riichiTurn + 1; i < p.river.length; i++) if (!p.river[i].taken) return i;
  return -1;
}
function layoutAll() {
  for (let s = 0; s < 4; s++) {
    layoutRiver(s, false);
    if (s !== ME) { TB.layoutHand(s, G.P[s].hand, null); TB.layoutMelds(s, G.P[s].melds); }
  }
}

// ---------------------------------------------------------------- badges
function renderBadges() {
  const g = G;
  for (let s = 0; s < 4; s++) {
    const c = UIS.chars[s];
    const p = g.P ? g.P[s] : null;
    const wind = t('wind')[(s - g.dealer + 4) % 4];
    const fx = p ? Object.keys(p.fx).filter(k => p.fx[k] && ['wareme', 'hanup', 'guard', 'shugi', 'pot', 'seal', 'lure'].includes(k)) : [];
    const chips = fx.map(k => { const s2 = MJSkills.get(k === 'lure' ? 'lure' : k); return s2 ? `<i class="fx" style="--sc:${s2.color}" title="${esc(L(s2.name))}">${icon(s2.icon)}</i>` : ''; }).join('');
    // (ユーザー 2026-11-15: no score here — the four scores are on the unit in the middle of the table; the name and the skill marks only)
    const html = `
      <div class="bf ${(s === g.dealer) ? 'dealer' : ''} ${p && p.riichi ? 'rii' : ''}" style="--c:${c.color}">${frame(c, 'face')}<em>${wind}</em>${p && p.riichi ? `<i class="riiflag">${esc(t('riichi'))}</i>` : ''}</div>
      <div class="bt"><b>${esc(L(c.name))}</b>
        <span class="bk">${s === ME && g.rules.skills ? '' : chips ? `<span class="fxs">${chips}</span>` : ''}${DB.set.skills && g.rules.skills && !(s === ME) ? `<span class="skws">${[0, 1].map(i => oppSkill(g, s, i)).join('')}</span>` : ''}</span></div>`;
    if (s === ME) renderMe(html, chips, fx.map(k => L(MJSkills.get(k).name)));   // (ユーザー 2026-11-15: the player's own skill marks — the effects in force, the seal's lock — sit inside the skill plate, not under the portrait; the plate already shows the skill itself)
    else $('#opp' + s).innerHTML = html;
  }
}
// (ユーザー 2026-11-15) the others' skill chips: what the skill does in a bubble — on hover, or on a tap (a touch screen; it closes by itself)
document.addEventListener('click', e => { const w = e.target.closest('#game .opp .skw'); document.querySelectorAll('#game .opp .skw.tip').forEach(x => { if (x !== w) x.classList.remove('tip'); });
  if (!w) return; e.stopPropagation(); w.classList.toggle('tip'); clearTimeout(w._tt); if (w.classList.contains('tip')) w._tt = setTimeout(() => w.classList.remove('tip'), 4000); }, true);
// one of another seat's skills (slot 0 her own, 1 her partner's): the icon and the name, what it does in a bubble
function oppSkill(g, s, i) {
  const sl = g.slot ? g.slot(s, i) : null; if (!sl) return '';
  const sk = sl.sk, tr = MJSkills.TIERS[sl.tier], p = g.P ? g.P[s] : null, used = p && p.skUsed[i], pt = i ? UIS.chars[s].partner : null;
  return `<span class="skw ${used ? 'used' : ''} ${i ? 'pt' : ''}" style="--sc:${sk.color}" title="${esc(L(sk.name))} ${tr}"><i class="sk" style="--sc:${sk.color}">${icon(sk.icon)}<b class="tr">${tr}</b></i><span>${esc(L(sk.name))}</span><span class="sktip">${pt ? `<small class="who">${esc(t('partner'))} ${esc(L(pt.name))}</small>` : ''}<b>${esc(L(sk.name))} <em class="sr">${tr}</em></b>${used ? `<small>${t('used')}</small>` : ''}<span>${esc(L(sk.desc(MJSkills.val(sk, sl.tier))))}</span></span></span>`;
}
function renderMe(badgeHtml, chips, fxNames) {
  const g = G, c = UIS.chars[ME];
  const p = g.P ? g.P[ME] : null;
  const skillsOn = g.rules.skills;
  // (ユーザー 2026-11-15: the plate is compact and of one width — the icon and the name; what the skill does comes up in a bubble on hover, or on a tap when it cannot be used; the marks of effects in force sit on its corner)
  // With a partner there are two plates, the partner's above her own (S / D keys); the cost shown is what the next use costs.
  const plate = i => {
    const sl = g.slot ? g.slot(ME, i) : null; if (!sl) return '';
    const sk = sl.sk, tr = `<em class="sr st${sl.tier}">${MJSkills.TIERS[sl.tier]}</em>`, used = p && p.skUsed[i];
    const cost = g.skillCost(ME, i), can = !!(UIS.opts && UIS.opts.canSkills && UIS.opts.canSkills[i]), pt = i ? c.partner : null, fxOn = chips && !i;
    return `<button class="skb ${can ? 'ready' : ''} ${used ? 'used' : ''} ${fxOn ? 'hasfx' : ''} ${i ? 'pt' : ''}" id="${i ? 'skBtn2' : 'skBtn'}" data-slot="${i}" data-cost="${cost}" style="--sc:${sk.color}" aria-disabled="${can ? 'false' : 'true'}">
      <kbd class="skk">${i ? 'D' : 'S'}</kbd><i>${icon(sk.icon)}</i><span><b>${esc(L(sk.name))} ${tr}</b></span>${pt ? `<img class="skp" src="${charImg(pt, 'face')}" alt="">` : ''}${fxOn ? `<span class="skfx">${chips}</span>` : ''}
      <span class="sktip">${pt ? `<small class="who">${esc(t('partner'))} ${esc(L(pt.name))}</small>` : ''}<b>${esc(L(sk.name))} ${tr}</b><small>${used ? t('used') : (sk.timing === 'deal' ? t('dealOnly') + ' · ' : '') + (cost ? t('cost', { n: cost.toLocaleString() }) : t('free'))}</small><span>${esc(L(sk.desc(MJSkills.val(sk, sl.tier))))}</span>${fxOn && fxNames && fxNames.length ? `<small class="on">${chips} ${fxNames.map(esc).join(' ・ ')}</small>` : ''}</span></button>`;
  };
  $('#mePanel').innerHTML = `
    <div class="mb">${badgeHtml}</div>
    ${skillsOn ? `<div class="sks">${plate(1)}${plate(0)}</div>` : ''}`;
  const box = $('#mePanel .sks');
  { const me = $('#mePanel'); if (me) me.style.setProperty('--skw', (box ? box.offsetWidth : 0) + 'px'); }   // (the skill plates are drawn enlarged on a desktop, by --hz: the portrait is kept clear of them in CSS, so it stays right when the window changes)
  if (box) box.onclick = async e => {
    const b = e.target.closest('.skb'); if (!b) return;
    const i = +b.dataset.slot, cost = +b.dataset.cost, sk = g.slot(ME, i).sk;
    const ok = () => UIS.opts && UIS.opts.canSkills && UIS.opts.canSkills[i] && UIS.resolve;
    // (ユーザー 2026-11-15) a touch screen has no hover: a tap opens a small sheet — what the skill does, and when it can be used now,
    // "use" / "cancel" (the cost is named there, so it is not asked a second time). A mouse: a click uses it (the bubble is on hover).
    if (coarse()) {
      const tip = b.querySelector('.sktip'), can = ok();
      const use = await new Promise(res => { const m = modal(`<div class="skq" style="--sc:${sk.color}">${tip ? tip.innerHTML : ''}</div>${can && cost > 0 ? `<p class="cq">${esc(t('skillCostQ', { n: cost.toLocaleString() }))}</p>` : ''}
          <div class="cbtns">${can ? `<button class="btn" data-a="no">${t('cancel')}</button><button class="btn gold" data-a="yes">${t('skillUse')}</button>` : `<button class="btn" data-a="no">${t('close')}</button>`}</div>`, 'small');
        m.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; closeModal(); res(a.dataset.a === 'yes'); }); });
      if (!use || !ok()) return;
    } else {
      if (!ok()) { const on = !b.classList.contains('tip'); box.querySelectorAll('.skb.tip').forEach(x => x.classList.remove('tip')); b.classList.toggle('tip', on); clearTimeout(renderMe.tt); if (on) renderMe.tt = setTimeout(() => document.querySelectorAll('#mePanel .skb.tip').forEach(x => x.classList.remove('tip')), 4000); return; }
      if (cost > 0 && !(await confirmBox(t('skillCostQ', { n: cost.toLocaleString() })))) return;
    }
    const r = UIS.resolve; UIS.resolve = null; UIS.opts = null; clearActs();
    r({ act: 'skill', slot: i });
  };
}

// ---------------------------------------------------------------- hand (HTML)
function renderHand(drawn) {
  const g = G, p = g.P[ME];
  if (drawn !== undefined) UIS.drawn = drawn;
  let ids = p.hand.slice();
  let dr = null;
  if (UIS.drawn != null && ids.includes(UIS.drawn) && ids.length % 3 === 2) { dr = UIS.drawn; ids.splice(ids.indexOf(dr), 1); }
  else UIS.drawn = null;
  ids.sort((a, b) => a - b);
  const o = UIS.opts && UIS.kind === 'turn' ? UIS.opts : null;
  const forbid = o ? (o.forbid || []) : [];
  const riichiOk = UIS.riichiMode && o && o.riichi ? new Set(o.riichi.map(T)) : null;
  const cls = id => {
    const c = [];
    if (o) {
      if (forbid.includes(T(id))) c.push('no');
      else if (o.mustTsumogiri && id !== dr) c.push('no');
      else if (riichiOk && !riichiOk.has(T(id))) c.push('no');
      else c.push('can');
    }
    if (UIS.picked === id) c.push('up');
    return c.join(' ');
  };
  const melds = p.melds.map(m => {
    const rel = (m.from - ME + 4) % 4;
    let order = m.tiles.slice();
    if (m.type === 'kakan') order = order.filter(x => x !== m.added);
    if (m.type !== 'ankan' && m.called != null) { order = order.filter(x => x !== m.called); order.splice(rel === 3 ? 0 : rel === 2 ? 1 : order.length, 0, m.called); }
    return `<span class="meld">${order.map((id, i) => m.type === 'ankan' && (i === 0 || i === 3) ? backHTML('sm') : tileHTML(id, 'sm' + (id === m.called ? ' side' : '') + (m.type === 'kakan' && id === m.called ? ' kk' : ''))).join('')}</span>`;
  }).join('');
  const kl = i => `<kbd class="tk">${HAND_LABELS[i] || ''}</kbd>`;
  $('#hand').innerHTML = `<div class="hrow">${ids.map((id, i) => tileHTML(id, cls(id)).replace('</span>', kl(i) + '<s class="hit"></s></span>')).join('')}<span class="gap"></span>${dr != null ? tileHTML(dr, cls(dr) + ' drawn').replace('</span>', '<kbd class="tk">Space</kbd><s class="hit"></s></span>') : '<span class="tl ph"></span>'}</div><div class="melds">${melds}</div>`;
  $('#hand').classList.toggle('active', !!o);
}
// hand tiles are bound to the number row, left to right: 1 … 0 - ^ ¥ ; the drawn tile is Space
const HAND_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'IntlYen'];
const HAND_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '¥'];
const handEl = $('#hand');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
handEl.addEventListener('pointerover', e => { const el = e.target.closest('.tl[data-id]'); if (el && TB) TB.highlightType(T(+el.dataset.id)); });
handEl.addEventListener('pointerleave', () => { if (TB) TB.highlightType(null); });
handEl.addEventListener('click', e => {
  const el = e.target.closest('.tl[data-id]');
  if (!el || !UIS || UIS.kind !== 'turn' || !UIS.resolve) return;
  if (el.classList.contains('no')) return;
  const id = +el.dataset.id;
  // (ユーザー 2026-11-15) one tap discards; 「ダブル」 in the settings: the first tap picks the tile, a second on it discards
  if (DB.set.tap2 && UIS.picked !== id) { UIS.picked = id; SND.pick(); renderHand(); TB.highlightType(T(id)); return; }
  doDiscard(id);
});
function doDiscard(id) {
  const r = UIS.resolve; if (!r) return;
  UIS.resolve = null;
  const act = UIS.riichiMode ? 'riichi' : 'discard';
  UIS.riichiMode = false; UIS.picked = null; UIS.opts = null; UIS.kind = null;
  TB.highlightType(null);
  clearActs();
  r({ act, id });
}

// ---------------------------------------------------------------- my turn / my call
function clearActs() { const a = $('#acts'); a.innerHTML = ''; a.classList.remove('atptr'); a.style.left = a.style.top = ''; $('#chiPick').hidden = true; }
function btn(label, cls, fn, role) {
  const b = document.createElement('button'); b.className = 'ab ' + cls; b.onclick = fn;
  if (role) b.dataset.role = role;
  b.innerHTML = label;
  $('#acts').appendChild(b); return b;
}

// action buttons are bound to the bottom-left letter row in on-screen order: Z X C V B N M
// keys follow SEGA MJ: Enter = win (tsumo/ron), X riichi, C chi, V pon, B kan, Space tsumogiri, Esc cancel/skip
const KEY_OF = { win: 'Enter', rii: 'x', chi: 'c', pon: 'v', kan: 'b', kyuushu: 'n', skip: 'Escape' };
const KEY_LABEL = { Enter: 'Enter', Escape: 'Esc' };
function bindActKeys() {
  [...document.querySelectorAll('#acts .ab')].forEach(b => {
    const k = KEY_OF[b.dataset.role]; if (!k) return;
    if (b.dataset.role === 'kan' && b.previousElementSibling && b.previousElementSibling.dataset.role === 'kan') return;
    b.dataset.key = k;
    const lab = KEY_LABEL[k] || k.toUpperCase();
    const kb = b.querySelector('kbd'); if (kb) kb.textContent = lab; else b.insertAdjacentHTML('beforeend', `<kbd>${lab}</kbd>`);
  });
}
function myTurn(o, res) {
  UIS.opts = o; UIS.kind = 'turn'; UIS.resolve = res; UIS.riichiMode = false; UIS.picked = null;
  UIS.drawn = o.drawn ?? null;
  renderHand(); renderBadges();
  clearActs();
  const finish = a => { const r = UIS.resolve; if (!r) return; UIS.resolve = null; UIS.opts = null; UIS.kind = null; clearActs(); renderHand(); r(a); };
  if (o.canTsumo) btn(t('tsumo'), 'win', () => finish({ act: 'tsumo' }), 'win');
  if (o.riichi && o.riichi.length) btn(t('riichi'), 'rii', e => {
    UIS.riichiMode = !UIS.riichiMode; e.currentTarget.classList.toggle('on', UIS.riichiMode);
    e.currentTarget.innerHTML = (UIS.riichiMode ? t('cancel') : t('riichi')) + '<kbd>X</kbd>';
    if (UIS.riichiMode && UIS.picked != null && !o.riichi.some(x => T(x) === T(UIS.picked))) UIS.picked = null;
    renderHand();
  }, 'rii');
  if (o.riichiBlocked) { const b = btn(t('riichiNo'), 'rii', () => toast(t('riichiWhy_' + o.riichiBlocked)), 'rii'); b.classList.add('sealed'); }
  const kans = (o.ankans || []).map(x => ['ankan', x]).concat((o.kakans || []).map(x => ['kakan', x]));
  kans.forEach(([k, tt]) => btn(`${t('kan')}${typeHTML(tt, 'xs')}`, 'call', () => finish({ act: k, t: tt }), 'kan'));
  if (o.canKyuushu) btn(t('kyuushu'), 'call', () => finish({ act: 'kyuushu' }), 'kyuushu');
  bindActKeys();
  // riichi: auto tsumogiri when there is nothing else to do
  if (o.mustTsumogiri && !o.canTsumo && !(o.ankans && o.ankans.length)) {
    sleep(420).then(() => { if (UIS.resolve === res) doDiscard(o.drawn); });
  }
}
function myCall(o, res) {
  UIS.kind = 'call'; UIS.opts = o;
  clearActs();
  let done = false;
  const finish = a => { if (done) return; done = true; clearActs(); TB.markCall(null); UIS.kind = null; UIS.opts = null; res(a); };
  if (o.canRon) btn(t('ron'), 'win', () => finish({ act: 'ron' }), 'win');
  if (o.pons) btn(t('pon'), 'call', () => finish({ act: 'pon', use: o.pons[0] }), 'pon');
  if (o.minkan) btn(t('kan'), 'call', () => finish({ act: 'minkan' }), 'kan');
  if (o.chis) btn(t('chi'), 'call', () => {
    if (o.chis.length === 1) return finish({ act: 'chi', use: o.chis[0] });
    const pk = $('#chiPick');
    pk.innerHTML = o.chis.map((u, i) => `<button data-i="${i}">${[...u, o.tile].sort((a, b) => a - b).map(id => tileHTML(id, 'xs' + (id === o.tile ? ' hl' : ''))).join('')}<kbd>${i + 1}</kbd></button>`).join('');
    pk.hidden = false;
    pk.onclick = e => { const b = e.target.closest('[data-i]'); if (b) finish({ act: 'chi', use: o.chis[+b.dataset.i] }); };
  }, 'chi');
  btn(t('skip'), 'skip', () => finish({ act: 'pass' }), 'skip');
  bindActKeys();
  placeActsAtPointer();
  TB.markCall(o.tile);   // (ユーザー 2026-11-15: the tile on offer glows like a dora, in yellow — not every tile of its kind lit up)
}

// PC: call buttons sit just above the draw-tile slot at the right end of the hand (not in the rotated phone layout)
// a screen rectangle in the frame the UI is laid out in: the same on a PC; on a phone held upright #root is turned 90°
// (translateX(innerWidth) rotate(90deg)), so the screen's y is the UI's x and the UI's y runs from the screen's right edge
function uiRect(el) { const r = el.getBoundingClientRect();
  if (!document.documentElement.classList.contains('rot')) return r;
  return { left: r.top, top: innerWidth - r.right, width: r.height, height: r.width, right: r.bottom, bottom: innerWidth - r.left }; }
function hudLocal(p) {
  const hud = $('#acts').offsetParent; if (!hud || !p) return null;
  const r = hud.getBoundingClientRect(); if (!r.width) return null;
  return { x: (p.x - r.left) * hud.offsetWidth / r.width, y: (p.y - r.top) * hud.offsetHeight / r.height, W: hud.offsetWidth, H: hud.offsetHeight };
}
if (window.ResizeObserver) { const ro = new ResizeObserver(() => { const r = $('#rbox'), k = $('#khelp'), g = $('#game');
  if (r.offsetHeight) g.style.setProperty('--rbh', r.offsetHeight + 'px'); if (k.offsetHeight) g.style.setProperty('--khh', k.offsetHeight + 'px'); });
  ro.observe($('#rbox')); ro.observe($('#khelp')); }
function placeActsAtPointer() {
  const a = $('#acts'), pk = $('#chiPick');
  a.classList.remove('atptr'); a.style.left = a.style.top = ''; pk.classList.remove('atptr'); pk.style.left = pk.style.top = '';
  if (!document.documentElement.classList.contains('ds')) return;
  const tiles = [...document.querySelectorAll('#hand .hrow > .tl')]; if (!tiles.length) return;
  const last = tiles[tiles.length - 1].getBoundingClientRect();
  const p = hudLocal({ x: last.right, y: last.top }); if (!p) return;
  a.classList.add('atptr');
  const w = a.offsetWidth, h = a.offsetHeight;
  const x = Math.max(8, Math.min(p.W - w - 8, p.x - w));
  const y = Math.max(8, p.y - h - 14);
  a.style.left = x + 'px'; a.style.top = y + 'px';
  pk.classList.add('atptr'); pk.style.left = x + 'px'; pk.style.top = Math.max(8, y - 64 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hz')) || 1)) + 'px';
}

// while a call (chi/pon/kan/ron) is offered, clicking anywhere except the buttons skips it
$('#game').addEventListener('click', e => {
  // (ユーザー 2026-11-15) a click on the table on my turn discards the tile just drawn (ツモ切り), as a click there passes a call
  // (a tap that picked a hand tile re-drew the hand: its target is no longer in the page, and must not count as a tap on the table —
  // that let go of the tile at once, so on a phone nothing could be discarded, 2026-11-15)
  if (!e.target.isConnected) return;
  if (UIS && UIS.kind === 'turn' && UIS.resolve && !e.target.closest('#hand, #acts, #chiPick, .tbtns, #skBtn, #dealAsk, .opp, #mePanel, #meBadge, .me, #khelp, #rbox, .modal')) {
    // (2026-11-15, ユーザー「スマホ、どこをタップしても牌を捨ててしまう」) only with a mouse: on a touch screen a tap on the table
    // just lets go of the picked tile
    if (!fine.matches) { if (UIS.picked != null) { UIS.picked = null; renderHand(); TB.highlightType(null); } return; }
    const dr = document.querySelector('#hand .tl.drawn');
    if (dr && !dr.classList.contains('no')) { SND.pick(); doDiscard(+dr.dataset.id); }
    return;
  }
  if (!UIS || UIS.kind !== 'call') return;
  if (e.target.closest('#acts, #chiPick, .tbtns, #mePanel .sks, #dealAsk')) return;
  const s = $('#acts .skip'); if (s) s.click();
});

// ---------------------------------------------------------------- deal-time skill prompt
function askDealSkill(o, res) {
  const sk = MJSkills.get(o.skill);
  const el = $('#dealAsk');
  el.style.setProperty('--sc', sk.color);
  const who = o.slot && UIS.chars[ME].partner ? UIS.chars[ME].partner : null;
  el.innerHTML = `<i>${icon(sk.icon)}</i>
    <div class="da-t">${who ? `<em class="da-pt"><img src="${charImg(who, 'face')}" alt="">${esc(t('partner'))} ${esc(L(who.name))}</em>` : ''}<b>${esc(t('dealQ', { name: L(sk.name) + ' ' + MJSkills.TIERS[o.tier | 0] }))}</b><span>${esc(L(sk.desc(MJSkills.val(sk, o.tier))))}</span><small>${o.cost ? t('cost', { n: o.cost.toLocaleString() }) : t('free')}</small></div>
    <div class="da-b"><button class="ab skip" data-a="no">${t('notUse')}<kbd>Esc</kbd></button><button class="ab call" data-a="yes">${t('use')}<kbd>Enter</kbd></button></div>`;
  el.hidden = false;
  renderHand();
  el.onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const yes = b.dataset.a === 'yes';
    el.hidden = true; el.onclick = null;
    SND.pick();
    res(yes);
  };
}

// ---------------------------------------------------------------- intel (peek / mind read)
// 先読み: the next three draws shown once in the middle of the screen; a click / tap or a key closes it and they are gone
function peekPop(ids) {
  return new Promise(done => {
    const w = document.createElement('div'); w.className = 'peekpop';
    w.innerHTML = `<div class="pk-box"><small>${esc(t('peekT'))}</small><div class="pk-t">${ids.map((id, i) => `<span style="--i:${i}">${tileHTML(id)}</span>`).join('')}</div><em>${esc(t('peekClose'))}</em></div>`;
    $('#game').appendChild(w); void w.offsetWidth; w.classList.add('show');
    let shut = false;
    const close = e => { if (shut) return; if (e) { e.preventDefault(); e.stopPropagation(); } shut = true; removeEventListener('keydown', key, true);
      w.classList.remove('show'); setTimeout(() => w.remove(), 260); done(); };
    const key = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) close(e); };
    setTimeout(() => { w.addEventListener('pointerdown', close); addEventListener('keydown', key, true); }, 450);   // (not closed by the click that used the skill)
  });
}
// 読心 (ユーザー 2026-11-16): the others' hands, shown the same way as 先読み — one plate in the middle of the screen, a row per
// player (face, テンパイ with the waits / n向聴, and any tiles the skill shows), closed by a tap or a key
function mindPop(read) {
  // (ユーザー 2026-11-16) a small table: the headings 待ち | 手の内 along the top, and each player's tiles under the heading they belong
  // to (待ち: the tiles that would win; 手の内: tiles of the hand the skill shows) — an empty cell is a faint dash
  const cell = (cls, tiles) => `<span class="mr-c ${cls}">${tiles || '<i class="mr-no">—</i>'}</span>`;
  const row = (r, i) => {
    const tp = r.shanten <= 0;
    const ch = UIS.chars[r.seat];
    return `<div class="mr-r" style="--i:${i}"><img src="${charImg(ch, 'face')}" alt=""><span class="mr-n">${esc(L(ch.name))}</span>`
      + `<span class="mr-s"><b class="${tp ? 'tp' : ''}">${esc(tp ? t('tenpai') : t('shanten', { n: r.shanten }))}</b></span>`
      + cell('w', r.shanten === 0 && r.waits && r.waits.length ? r.waits.map(w => typeHTML(w)).join('') : '')
      + cell('h', r.show && r.show.length ? r.show.map(id => tileHTML(id)).join('') : '') + '</div>';
  };
  const head = `<div class="mr-hd"><span></span><span></span><span></span><span class="w">${esc(t('waitsOn'))}</span><span class="h">${esc(t('handPart'))}</span></div>`;
  return new Promise(done => {
    const w = document.createElement('div'); w.className = 'peekpop mindpop';
    w.innerHTML = `<div class="pk-box"><small>${esc(t('mindT'))}</small><div class="mr-rows">${head}${read.map(row).join('')}</div><em>${esc(t('peekClose'))}</em></div>`;
    $('#game').appendChild(w); void w.offsetWidth; w.classList.add('show');
    let shut = false;
    const close = e => { if (shut) return; if (e) { e.preventDefault(); e.stopPropagation(); } shut = true; removeEventListener('keydown', key, true);
      w.classList.remove('show'); setTimeout(() => w.remove(), 260); done(); };
    const key = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) close(e); };
    setTimeout(() => { w.addEventListener('pointerdown', close); addEventListener('keydown', key, true); }, 450);
  });
}
function showIntel(info) {
  const el = $('#intel');
  let h = '';
  if (info.peek) h += `<h4>${t('peekT')}</h4><div class="it">${info.peek.map(id => tileHTML(id, 'xs')).join('')}</div>`;
  if (info.read) h += `<h4>${t('mindT')}</h4>` + info.read.map(r => `<div class="ir"><img src="${charImg(UIS.chars[r.seat], 'face')}" alt=""><span>${r.shanten === 0 ? `<b>${t('tenpai')}</b> ${r.waits.map(w => typeHTML(w, 'xs')).join('')}` : r.shanten < 0 ? t('tenpai') : t('shanten', { n: r.shanten })}${r.show && r.show.length ? ` <i class="ish">${r.show.map(id => tileHTML(id, 'xs')).join('')}</i>` : ''}</span></div>`).join('');
  el.innerHTML = h + '<button class="x">×</button>';
  el.hidden = false;
  el.querySelector('.x').onclick = () => { el.hidden = true; };
}

// ---------------------------------------------------------------- banners, callouts, cut-ins
// (ユーザー 2026-11-15) a new hand is announced big, across the middle of the screen: 「東 三局」 in large Mincho on a lacquer band
// between gold lines, the honba and the dealer under it
async function roundBanner(g) {
  const el = $('#callout'), ja = I18N.lang === 'ja' || I18N.lang === 'zh' || I18N.lang === 'zh-TW';
  const KN = ['一', '二', '三', '四'];
  const big = ja ? `<i>${esc(t('round')[g.round])}</i><span>${KN[g.kyoku]}局</span>` : `<span>${esc(t('kyoku', { w: t('round')[g.round], n: g.kyoku + 1 }))}</span>`;
  const dealer = UIS && UIS.chars ? UIS.chars[g.dealer] : null;
  const sub = [g.honba ? t('honba', { n: g.honba }) : '', dealer ? `${t('dealerOf', { n: L(dealer.name) })}` : ''].filter(Boolean).join('　·　');
  el.className = 'callout rbn'; el.innerHTML = `<div class="rbn-band"><div class="rbn-big">${big}</div>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  void el.offsetWidth; el.classList.add('show');
  await sleep(1700);
  el.classList.remove('show');
}
async function banner(text) {
  const el = $('#callout');
  el.className = 'callout banner'; el.innerHTML = `<b>${esc(text)}</b>`;
  void el.offsetWidth; el.classList.add('show');
  await sleep(1100);
  el.classList.remove('show');
}
function seatXY(s) {
  const st = $('#stage');
  if (s === ME) return { x: st.clientWidth / 2, y: st.clientHeight * .72 };
  const p = TB.project(s, 0, 6);
  return p;
}
async function callout(s, text) {
  const el = $('#callout');
  const p = seatXY(s);
  el.className = 'callout pop'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  el.innerHTML = `<b>${esc(text)}</b>`;
  void el.offsetWidth; el.classList.add('show');
  await sleep(650);
  el.classList.remove('show');
}
const WORD = { riichi: { ja: '立直', en: 'RIICHI' }, tsumo: { ja: '自摸', en: 'TSUMO' }, ron: { ja: '栄和', en: 'RON' } };
async function cutin(s, kind, d) {
  const c = (kind === 'skill' && d && d.by) || UIS.chars[s];   // (a partner's skill: the partner comes on)
  const el = $('#cutin');
  let word, sub = '';
  if (kind === 'skill') { const sk = MJSkills.get(d.skill); word = L(sk.name); sub = MJSkills.TIERS[d.tier | 0] + ' ・ ' + L(sk.short(MJSkills.val(sk, d.tier))) + (d.cost ? ` ・ ${t('cost', { n: d.cost.toLocaleString() })}` : ''); }
  else word = I18N.lang === 'ja' ? WORD[kind].ja : WORD[kind].en;
  const kana = kind === 'riichi' ? t('riichi') : kind === 'tsumo' ? t('tsumo') : kind === 'ron' ? t('ron') : '';
  const line = c.lines && c.lines[kind] ? L(c.lines[kind]) : '';
  const sk = MJSkills.get(kind === 'skill' ? d.skill : UIS.chars[s].skill);
  const rk = RANK_I(c.rarity);
  el.className = `cutin k-${kind} cr-${c.rarity} ${s === ME ? 'me' : ''}`;
  el.style.setProperty('--c', c.color); el.style.setProperty('--c2', c.color2); el.style.setProperty('--sc', sk.color);
  el.innerHTML = `
    <div class="ci-dim"></div>
    ${rk >= 2 ? '<div class="ci-rays"></div>' : ''}
    ${rk >= 3 ? `<div class="ci-spark">${Array.from({ length: rk >= 4 ? 28 : 16 }, () => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--y:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * .9).toFixed(2)}s;--s:${(.5 + Math.random()).toFixed(2)}"></i>`).join('')}</div>` : ''}
    <div class="ci-band"><div class="ci-lines"></div></div>
    <div class="ci-art"><img src="${charImg(c, 'full')}" alt=""></div>
    <div class="ci-txt">
      <div class="ci-word" data-len="${word.length}">${esc(word)}</div>
      ${kana && I18N.lang === 'ja' ? `<div class="ci-kana">${esc(kana)}</div>` : ''}
      ${sub ? `<div class="ch-sub">${esc(sub)}</div>` : ''}
      <div class="ci-line">${kind === 'skill' && d.slot ? `<em class="ci-pt">${esc(t('partner'))}</em>` : ''}<b>${esc(L(c.name))}</b>「${esc(line)}」</div>
    </div>
    <div class="ci-flash"></div>`;
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('show');
  if (kind === 'riichi') SND.riichi(); else if (kind === 'skill') SND.skill(); else SND.ok();
  if (kind === 'riichi' || kind === 'tsumo' || kind === 'ron') SND.voice(kind);
  await sleep((kind === 'skill' ? 1700 : kind === 'riichi' ? 1450 : 1500) + [0, 0, 150, 350, 650][rk]);
  el.classList.add('out');
  await sleep(260);
  el.hidden = true; el.className = 'cutin';
}

// ---------------------------------------------------------------- results
function scoreRows(d, winners) {
  const g = G;
  return `<div class="srows">${[0, 1, 2, 3].map(s => {
    const c = UIS.chars[s], dl = d.delta[s];
    return `<div class="sr ${winners && winners.includes(s) ? 'win' : ''}"><img src="${charImg(c, 'face')}" alt=""><b>${esc(L(c.name))}${s === ME ? ` <small>(${t('you')})</small>` : ''}</b>
      <span class="sv">${d.scores[s].toLocaleString()}</span><span class="sd ${dl > 0 ? 'p' : dl < 0 ? 'm' : ''}">${dl > 0 ? '+' : ''}${dl ? dl.toLocaleString() : ''}</span></div>`;
  }).join('')}</div>`;
  void g;
}
function waitClick(box, sel) { return new Promise(res => { const b = box.querySelector(sel); b.onclick = () => { SND.pick(); res(); }; if (AUTO) sleep(1600).then(res); }); }

// ---- the end of a hand (2026-11-14, ユーザー: the basic plan) ----
//  1  the win: the winner's character large, the hand, the yaku one by one, the points large        (showAgari, one per winner)
//  2  the points move: four panels where the players sit, arrows from who pays to who is paid, the
//     scores counting to their new values, each player's place                                      (showMoves, once)
//  A drawn hand: the tenpai hands are laid open where they stand on the table (no list of hands), then 2 with テンパイ / ノーテン.
async function showAgari(d, r, last) {
  SND.score();
  const c = UIS.chars[r.seat], res = r.res;
  const ys = res.list.filter(([k, h]) => !(k === 'ura' && !h));   // (ユーザー 2026-11-15: no ura-dora → no line, not 「0翻」)
  const yl = ys.map(([k, h], i) =>
    `<div class="yk" style="--i:${i}"><span>${esc(I18N.yaku(k))}</span><b>${res.yakumanN ? (h >= 26 ? t('dbl_yakuman') : t('yakuman')) : t('han', { n: h })}</b></div>`).join('');
  const hand = r.hand.slice(0, r.tsumo ? -1 : r.hand.length - 1).sort((a, b) => a - b);
  const melds = r.melds.map(m => `<span class="meld">${m.tiles.map((id, i) => m.type === 'ankan' && (i === 0 || i === 3) ? backHTML('sm') : tileHTML(id, 'sm')).join('')}</span>`).join('');
  const pts = r.moves.filter(m => m[2] !== 'shugi').reduce((a, m) => a + m[1], 0);
  const lim = res.limit ? t(res.limit) : '';
  // the better the hand, the louder its points (ユーザー 2026-11-14): 0 plain · 1 満貫 · 2 跳満 · 3 倍満 · 4 三倍満/数え · 5 役満
  const lv = { mangan: 1, haneman: 2, baiman: 3, sanbaiman: 4, kazoe: 4, yakuman: 5, dbl_yakuman: 5 }[res.limit] || 0;
  const spark = lv >= 3 ? `<div class="ag-spark">${Array.from({ length: lv >= 5 ? 26 : lv >= 4 ? 18 : 10 }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--y:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--s:${(.5 + Math.random() * .9).toFixed(2)}"></i>`).join('')}</div>` : '';
  const box = modal(`
    <div class="agst lv${lv}" style="--c:${c.color};--c2:${c.color2};--n:${ys.length}">${lv >= 2 ? '<div class="ag-flash"></div>' : ''}
      <div class="agst-bg"></div>
      <div class="agst-ch"><img src="${charImg(c, 'full')}" alt=""></div>
      <div class="agst-who"><b>${esc(L(c.name))}</b><span>${r.tsumo ? t('tsumo') : t('ron')}</span></div>
      <div class="agst-main">
        <div class="ag-hand">${hand.map(id => tileHTML(id, 'md')).join('')}${melds}<span class="gap"></span>${tileHTML(r.winId, 'md win')}</div>
        <div class="ag-dora"><span><small>${t('dora')}</small>${d.dora.map(x => typeHTML(x, 'xs')).join('')}</span>${G.P[r.seat].riichi ? `<span><small>${I18N.yaku('ura')}</small>${d.ura.slice(0, d.dora.length).map(x => typeHTML(x, 'xs')).join('')}</span>` : ''}</div>
        <div class="agst-mid"><div class="ag-yaku">${yl}</div>${res.yakumanN ? '' : `<div class="agst-han"><b>${res.han}</b><span>${t('han', { n: '' }).trim() || '翻'}</span><small>${t('fu', { n: res.fu })}</small></div>`}</div>
        ${res.shugi ? `<div class="ag-note">${esc(I18N.L(MJSkills.get('shugi').name))} ×${res.shugi}</div>` : ''}
        <div class="agst-total">${lim ? `<em class="stamp">${esc(lim)}</em>` : ''}<span class="ag-pw">${lv >= 3 ? '<span class="ag-rays"></span>' : ''}<b data-v="${pts.toLocaleString()}">${pts.toLocaleString()}</b>${spark}</span></div>
      </div>
      <button class="btn gold nx">${t('next')}</button>
    </div>`, 'stage');
  if (lim) sleep(1000 + ys.length * 160).then(() => SND.limit(lv));
  await waitClick(box, '.nx');
  void last;
}
// the points move. o.title: a heading (流局 …) · o.tags[seat]: a word on the panel (テンパイ / ノーテン) · o.win: the winners' seats
async function showMoves(d, o = {}) {
  const before = d.scores.map((v, s) => v - d.delta[s]);
  const order = [0, 1, 2, 3].sort((a, b) => d.scores[b] - d.scores[a] || a - b), rank = []; order.forEach((s, i) => { rank[s] = i; });
  const box = modal(`
    <div class="mvst">
      ${o.title ? `<h2 class="mv-t">${o.title}</h2>` : ''}
      <svg class="mv-ar"></svg>
      ${[0, 1, 2, 3].map(s => { const c = UIS.chars[s], dl = d.delta[s], rel = (s - ME + 4) % 4;
        return `<div class="mv-p p${rel} ${dl > 0 ? 'up' : dl < 0 ? 'dn' : ''} ${o.win && o.win.includes(s) ? 'win' : ''}" data-s="${s}" style="--c:${c.color}">
          <div class="mv-n"><b>${esc(L(c.name))}${s === ME ? ` <small>(${t('you')})</small>` : ''}</b>${o.tags && o.tags[s] ? `<i class="${o.tags[s][1] ? 'tp' : ''}">${esc(o.tags[s][0])}</i>` : ''}</div>
          <img class="mv-f" src="${charImg(c, 'face')}" alt="">
          <em class="mv-r r${rank[s]}">${t('rank')[rank[s]]}</em>
          <span class="mv-v">${before[s].toLocaleString()}</span>
          <span class="mv-d">${dl > 0 ? '+' : ''}${dl ? dl.toLocaleString() : ''}</span>
        </div>`; }).join('')}
      <button class="btn gold nx">${t('next')}</button>
    </div>`, 'stage clear');
  // arrows: from every player who pays to every player who is paid (drawn between the panels as they are laid out). (2026-11-14: the glow
  // filter's region is the whole stage — sized by the path's own box, a straight arrow through the centre had no height and was not drawn)
  // (2026-11-15, ユーザー「矢印がおかしい（スマホ）」) on a phone held upright the whole UI is turned 90° (html.rot): a rectangle
  // measured on the screen is turned back into the UI's own frame before use
  // (2026-11-16, ユーザー「矢印が相変わらずおかしい」) measured in the stage's own layout, not on the screen: a screen rectangle turned back by
  // hand (uiRect) is off whenever the browser's innerWidth is not the width the UI was turned with (iOS Safari's bars, zoom) — layout
  // offsets know nothing of the turn, the zoom or the panels' entry animation. A panel is centred on its left/top (translate -50%).
  // (the svg fills .mvst, inset 0, and the panels are laid out in .mvst: an svg element has no offsetLeft of its own)
  const svg = box.querySelector('.mv-ar'), st = svg.parentNode, R = { width: st.clientWidth, height: st.clientHeight },
    mid = el => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
  const P = {}; box.querySelectorAll('.mv-p').forEach(el => { P[el.dataset.s] = mid(el); });
  const cx = R.width / 2, cy = R.height / 2, u = Math.min(R.width, R.height) / 100;
  svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
  let h = `<defs><marker id="mvh" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="3.3" markerHeight="3.3" orient="auto-start-reverse"><path d="M0 0 10 5 0 10 2.6 5z" fill="#eaffff"/></marker>
    <filter id="mvg" filterUnits="userSpaceOnUse" x="0" y="0" width="${R.width.toFixed(0)}" height="${R.height.toFixed(0)}"><feGaussianBlur stdDeviation="${(u * .9).toFixed(1)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="mvd" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${(u * .9).toFixed(1)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  let k = 0;
  for (let a = 0; a < 4; a++) if (d.delta[a] < 0) for (let b = 0; b < 4; b++) if (d.delta[b] > 0) {
    const A = P[a], B = P[b], opp = (a - b + 4) % 4 === 2, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const qx = opp ? mx : mx + (mx - cx) * .55, qy = opp ? my : my + (my - cy) * .55;       // neighbours: the arrow bows outward round the centre
    const at = tt => [(1 - tt) * (1 - tt) * A[0] + 2 * (1 - tt) * tt * qx + tt * tt * B[0], (1 - tt) * (1 - tt) * A[1] + 2 * (1 - tt) * tt * qy + tt * tt * B[1]];
    // (ユーザー 2026-11-16「矢印が相変わらずおかしい」, phone: the panels are big against the screen, so the middle part of the curve ran
    // over the panels and its head sat on the numbers) the arrow is kept off both panels: it starts where the curve leaves the payer's
    // panel and ends where it reaches the receiver's, with a margin — and no longer than the middle part it always was
    const pad = u * 2.2, out = (pt, r) => Math.abs(pt[0] - r[0]) > r[2] / 2 + pad || Math.abs(pt[1] - r[1]) > r[3] / 2 + pad;
    let ta = opp ? .34 : .3, tb = opp ? .66 : .7;
    for (let tt = 0; tt < .5; tt += .01) if (out(at(tt), A)) { ta = Math.max(ta, tt); break; }
    for (let tt = 1; tt > .5; tt -= .01) if (out(at(tt), B)) { tb = Math.min(tb, tt); break; }
    if (tb - ta < .08) { const c = (ta + tb) / 2; ta = c - .04; tb = c + .04; }
    const t0 = ta, t1 = tb, p0 = at(t0), p1 = at(t1), pm = at((t0 + t1) / 2), q2 = [2 * pm[0] - (p0[0] + p1[0]) / 2, 2 * pm[1] - (p0[1] + p1[1]) / 2];
    const dp = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q${q2[0].toFixed(1)} ${q2[1].toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    h += `<path class="mv-a" id="mvp${k}" style="--k:${k}" pathLength="1" d="${dp}" fill="none" stroke="#eaffff" stroke-width="${(u * 1.5).toFixed(1)}" stroke-linecap="round" marker-end="url(#mvh)" filter="url(#mvg)"/>`;
    // (ユーザー 2026-11-14: something is sent along the arrow — quietly: a soft glint slides down it to the receiver, over and over)
    { const b0 = (.62 + k * .08).toFixed(2);
      h += `<path d="${dp}" pathLength="1" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="${(u * 1).toFixed(1)}" stroke-linecap="round" stroke-dasharray=".1 .9" stroke-dashoffset="1" opacity="0"><animate attributeName="stroke-dashoffset" from="1.1" to="0" dur="1.3s" begin="${b0}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.15;.75;1" dur="1.3s" begin="${b0}s" repeatCount="indefinite"/></path>`; }
    k++;
  }
  svg.innerHTML = h;
  // the scores count to their new values once the arrows are out
  const T0 = performance.now() + (AUTO ? 150 : 650) * (FAST < 1 ? .3 : 1), DUR = 800 * (FAST < 1 ? .3 : 1);
  await new Promise(done => { (function step(now) {
    if (!box.isConnected) return done();
    const kk = Math.min(1, Math.max(0, (now - T0) / DUR)), e = 1 - Math.pow(1 - kk, 3);
    box.querySelectorAll('.mv-p').forEach(el => { const s = +el.dataset.s; el.querySelector('.mv-v').textContent = (Math.round((before[s] + d.delta[s] * e) / 100) * 100).toLocaleString(); });
    if (kk < 1) requestAnimationFrame(step); else { box.classList.add('done'); done(); }
  })(performance.now()); });
  await waitClick(box, '.nx');
  closeModal();
}
async function showRyuukyoku(d) {
  SND.score();
  const ab = d.abort ? t('abort')[d.abort] || d.abort : '';
  await showMoves(d, { title: `${t('ryuukyoku')}${ab ? ` <small>${esc(ab)}</small>` : ''}`, tags: d.abort ? null : [0, 1, 2, 3].map(s => [d.tenpai[s] ? t('tenpai') : t('noten'), d.tenpai[s]]) });
}
// 勝敗記録 (shared/record.js): one entry per finished game vs the BOTs — 1st = win, 4th = loss, 2nd / 3rd = draw
const PTS = { ja: '{n}点', en: '{n} pts', zh: '{n}点', ko: '{n}점', es: '{n} pts', fr: '{n} pts', pt: '{n} pts', de: '{n} Pkt.', hi: '{n} अंक', ar: '{n} نقطة', ru: '{n} очк.', 'zh-TW': '{n}點', id: '{n} poin', tr: '{n} puan' };
function recordGame(d, myRank) {
  if (!window.GameRecord || /[?&]auto/.test(location.search) || !G || !G.rules) return;
  const r = G.rules, lv = Math.floor(UIS.lv ?? DB.set.lv);
  try { GameRecord.add({ mode: 'ai', res: myRank === 0 ? 'w' : myRank === 3 ? 'l' : 'd', opp: t(r.length === 'south' ? 'south' : 'east') + ' · ' + t(r.skills ? 'skillOn' : 'skillOff') + ' · BOT ' + t('lv')[lv], key: r.length + ':' + (r.skills ? 1 : 0) + ':' + lv, why: t('rank')[myRank] + ' · ' + (PTS[I18N.lang] || PTS.en).replace('{n}', d.scores[ME].toLocaleString()) }); } catch (e) {}
}
const RAR_BONUS = { N: 0, R: .05, SR: .1, SSR: .2, UR: .3 };
async function showFinal(d) {
  const rank = d.rank;
  const myRank = rank.indexOf(ME);
  // 1st = two single pulls, 2nd = one pull (COST1 each); hanchan pays double
  const base = [COST1 * 2, COST1, 120, 60][myRank] * (G.rules.length === 'south' ? 2 : 1);
  // (ユーザー 2026-11-15) playing a rarer character brings a little more: R +5%, SR +10%, SSR +20%, UR +30%
  const myR = UIS.chars[ME] && UIS.chars[ME].rarity, bonusP = RAR_BONUS[myR] || 0, bonus = Math.round(base * bonusP / 10) * 10;
  // (ユーザー 2026-11-15) a big win pays more: 10 coins for every full 1,000 points over the starting 25,000
  const over = Math.max(0, Math.floor((d.scores[ME] - 25000) / 1000)), sbonus = over * 10, coins = base + bonus + sbonus;
  DB.coins += coins; DB.stats.games++; DB.stats.rank[myRank]++;
  if (!AUTO) {   // スタッツ: this game's counters into the mode's total, and the place under the character played
    MJStats.add(DB.pstats[G.rules.skills ? 'skill' : 'std'], UIS.track.seat[ME]);
    const pc = DB.pstats.chars[UIS.chars[ME].id] = DB.pstats.chars[UIS.chars[ME].id] || { g: 0, r: [0, 0, 0, 0] };
    pc.g++; pc.r[myRank]++;
  }
  // 段位戦: the points, promotions and their rewards
  let rk = null;
  if (UIS.ranked && !AUTO) {
    const gain = MJRank.POINTS[UIS.ranked.len][myRank], before = DB.rank.pt, r0 = MJRank.at(before);
    DB.rank.pt += gain; DB.rank.games++;
    const r1 = MJRank.at(DB.rank.pt), ups = MJRank.list.slice(r0.i + 1, r1.i + 1), gifts = [];
    for (const u of MJRank.list.slice(1, r1.i + 1)) if (u.reward && !owns(u.reward))   // (any reward of a rank reached and not yet held)
      { const k = rollSkillKey(); DB.chars[u.reward] = { skills: [k], use: k }; gifts.push(u.reward); }
    rk = { gain, before, r0, r1, ups, gifts };
  }
  // 対局履歴 (ユーザー 2026-11-15: the log is part of 戦績, not the shared dialog): the last 200 finished games
  if (!AUTO) { const L0 = DB.hist = DB.hist || [];
    L0.push({ t: Date.now(), len: G.rules.length, sk: G.rules.skills ? 1 : 0, rk: UIS.ranked ? 1 : 0, ch: UIS.chars[ME].id, pl: myRank, sc: G.scores[ME],
      g: rk ? rk.gain : null, rn: rk ? rk.r1.i : null, h: UIS.track.seat[ME].hands, w: UIS.track.seat[ME].wins });
    if (L0.length > 200) L0.splice(0, L0.length - 200); }
  save();
  recordGame(d, myRank);
  const w = UIS.chars[rank[0]];
  const box = modal(`
    <div class="agst fnst" style="--c:${w.color};--c2:${w.color2}">
      <div class="agst-bg"></div>
      <div class="agst-ch"><img src="${charImg(w, 'full')}" alt=""></div>
      <div class="agst-who"><b>${esc(L(w.name))}</b><span>${t('rank')[0]}</span></div>
      <div class="agst-main">
        <h2 class="fn-t">${t('final')}</h2>
        <div class="fn-rows">${rank.map((s, i) => { const c = UIS.chars[s]; return `<div class="fn-r r${i} ${s === ME ? 'mine' : ''}" data-ps="${s}" style="--c:${c.color};--i:${i}"><em class="mv-r r${i}">${t('rank')[i]}</em><img src="${charImg(c, 'face')}" alt=""><b>${esc(L(c.name))}${s === ME ? ` <small>(${t('you')})</small>` : ''}</b><span>${d.scores[s].toLocaleString()}</span></div>`; }).join('')}</div>
        <div class="fn-foot">${rk ? rankStrip(rk) : '<span></span>'}<div class="earn">${icon('coin')} ${t('earned', { n: coins })}${bonus ? `<small class="rbonus">${esc(t('rarBonus', { r: myR, p: Math.round(bonusP * 100), n: bonus }))}</small>` : ''}${sbonus ? `<small class="rbonus">${esc(t('scoreBonus', { n: sbonus, k: (over * 1000).toLocaleString() }))}</small>` : ''}</div>
          <div class="cbtns"><button class="btn" data-a="home">${t('toHome')}</button><button class="btn gold" data-a="again">${t('again')}</button></div></div>
      </div>
    </div>`, 'stage');
  SND.ok();
  await new Promise(res => box.addEventListener('click', e => {
    const ps = e.target.closest('[data-ps]'); if (ps) { openStats(+ps.dataset.ps); return; }
    const a = e.target.closest('[data-a]'); if (!a || box.busy) return;
    box.busy = true;
    (async () => {
      if (rk && (rk.ups.length || rk.gifts.length)) await showPromotion(rk);   // (a rank gained: its own screen, and the reward characters)
      closeModal();
      const again = UIS.ranked;
      if (a.dataset.a === 'home') quitGame(); else { UIS.abort = true; startGame(again ? { ranked: true, len: again.len } : {}); }
      res();
    })();
  }));
}

// ---------------------------------------------------------------- keyboard
// PC keys: number row 1…0 - ^ ¥ = hand tiles left to right, Space = drawn tile (tsumogiri), ←/→ + Enter also work;
// action buttons Z X C V B … in on-screen order (Esc = skip), 1-3 chi choice, S skill; deal-time skill Z/X (Y/N);
// result screens Enter/Space; home Enter = start.
function handTiles() { return [...document.querySelectorAll('#hand .hrow .tl.can')]; }
function moveCursor(d) {
  const ts = handTiles(); if (!ts.length) return;
  const ids = ts.map(x => +x.dataset.id);
  let i = ids.indexOf(UIS.picked);
  if (i < 0) i = d > 0 ? -1 : ids.length;
  i = Math.max(0, Math.min(ids.length - 1, i + d));
  UIS.picked = ids[i]; SND.pick(); renderHand(); TB.highlightType(T(UIS.picked));
}
document.addEventListener('keydown', e => {
  // I: the 3D table's debug readout (polygons, draw calls, textures)
  if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.closest && e.target.closest('input,textarea,select')) && TB && TB.toggleDebug) { TB.toggleDebug(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'f') { e.preventDefault(); toggleFs(); return; }   // F: full screen
  if (k === 'Escape' && $('#khelp').classList.contains('open')) { e.preventDefault(); showKeys(false); return; }
  if (!$('#pstats').hidden) { if (k === 'Escape' || k === 'Enter') { e.preventDefault(); closeStats(); } return; }
  const m = $('#modal');
  // modal screens
  if (!m.hidden) {
    if (k === 'Enter' || k === ' ') {
      const b = m.querySelector('.nx, [data-a=yes], [data-a=again]');
      if (b) { e.preventDefault(); b.click(); }
    } else if (k === 'Escape') {
      const b = m.querySelector('[data-a=no], [data-a=close], [data-a=home]');
      if (b) { e.preventDefault(); b.click(); }
    }
    return;
  }
  // home
  if (!$('#home').hidden) { if (k === 'Enter') { e.preventDefault(); $('#btnStart').click(); } return; }
  if (!$('#chara').hidden) { if (k === 'Escape') { e.preventDefault(); $('#chBack').click(); } return; }
  if (!UIS || $('#game').hidden) return;
  // deal-time skill prompt
  const da = $('#dealAsk');
  if (!da.hidden) {
    if (k === 'y' || k === 'Enter') { e.preventDefault(); da.querySelector('[data-a=yes]').click(); }
    else if (k === 'n' || k === 'Escape' || k === ' ') { e.preventDefault(); da.querySelector('[data-a=no]').click(); }
    return;
  }
  // chi choice
  const pk = $('#chiPick');
  if (!pk.hidden && /^[1-3]$/.test(k)) { const b = pk.querySelector(`[data-i="${+k - 1}"]`); if (b) { e.preventDefault(); b.click(); } return; }
  // action buttons (Enter win, X riichi, C chi, V pon, B kan, N nine terminals); Esc / Space = skip
  if (k === ' ' && UIS.kind === 'call') { const sk = $('#acts .skip'); if (sk) { e.preventDefault(); sk.click(); return; } }
  if (k === 'Escape') { const sk = $('#acts .skip'); if (sk) { e.preventDefault(); sk.click(); return; } if (UIS.riichiMode) { const r = $('#acts .rii'); if (r) r.click(); return; } }
  const ab = $(`#acts [data-key="${k}"]`);
  if (ab) { e.preventDefault(); ab.click(); return; }
  // hand tiles by number row
  const hi = HAND_CODES.indexOf(e.code === 'Backslash' ? 'IntlYen' : e.code);
  if (hi >= 0 && UIS.kind === 'turn' && UIS.resolve) {
    const el = document.querySelectorAll('#hand .hrow .tl:not(.drawn)')[hi];
    e.preventDefault();
    if (el && el.classList.contains('can')) doDiscard(+el.dataset.id);
    return;
  }
  if (k === 's' || k === 'd') { const b = $(k === 's' ? '#skBtn' : '#skBtn2'); if (b && b.classList.contains('ready')) { e.preventDefault(); b.click(); } return; }
  // hand
  if (UIS.kind === 'turn' && UIS.resolve) {
    if (k === 'ArrowLeft') { e.preventDefault(); moveCursor(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); moveCursor(1); }
    else if (k === ' ' || k === 'Enter') {
      e.preventDefault();
      const ts = handTiles().map(x => +x.dataset.id);
      let id = (k === 'Enter' && ts.includes(UIS.picked)) ? UIS.picked : (ts.includes(UIS.drawn) ? UIS.drawn : ts.includes(UIS.picked) ? UIS.picked : ts[ts.length - 1]);
      if (id != null) doDiscard(id);
    }
  }
});

// ---------------------------------------------------------------- boot
// animated frame effects follow whatever large frames are on screen
let ffxT = 0;
new MutationObserver(() => { clearTimeout(ffxT); ffxT = setTimeout(() => FrameFX.scan(), 60); }).observe(document.body, { childList: true, subtree: true });
I18N.set(I18N.lang);
MJTiles.ready().then(() => { MJTiles.reset(); ART.clear(); renderHome(); });   // (the tile faces from the 上海 sheets, 2026-11-14)
document.fonts && document.fonts.load('800 40px "Shippori Mincho B1"', '一萬東南西北發中雀華').then(() => { MJTiles.reset(); ART.clear(); renderHome(); });
renderHome(); homeEnter();
window.JANKA = { get G() { return G; }, get UIS() { return UIS; }, get TB() { return TB; }, SND, DB, startGame, quitGame, cutin, showMoves, showFinal, showAgari, openRanked, showPromotion, peekPop, mindPop, showMoves, askDealSkill, roundBanner };
})();
