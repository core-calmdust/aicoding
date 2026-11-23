// DREADNOUGHTS — the game: title → sortie → fleet draft → deploy → battle → result, on the 3D world (world.js).
// The rules, the AI (Lv.1–20, Lv.19–20 plan ahead in a worker) and the draft model are the 2D 海戦ゲーム's (../seabattle/).
(function () {
'use strict';
const E = window.SeaEngine, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STORE = 'aicoding-dreadnoughts', LANGS = ['ja', 'en'];
const skillOf = s => E.TYPES[s.t].skill;
let saved = null; try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
const S = Object.assign({ rule: 'tactics', level: 8, first: 'you', adj: false, streak: false, sound: true, lang: null }, saved && saved.settings);
if (S.rule === 'streak') { S.rule = 'classic'; S.streak = true; }   // (連続攻撃 is now an option on any rule — 2026-11-23 user)
try { if (localStorage.getItem('atlas-sfx') === '0') S.sound = false; } catch (e) {}
let LANG = LANGS.includes(S.lang) ? S.lang : ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en');

// ---------- texts (DREADNOUGHTS' own; the rules' and ships' texts come from the 2D game's SEA_I18N) ----------
const DN = {
  ja: {
    tagline: '50隻の艦から艦隊を編成し、夕暮れの外洋で敵艦隊と撃ち合う。索敵・煙幕・雷撃・航空攻撃——艦ごとのスキルで読み合う海戦タクティクス。',
    'm.play': '出撃', 'm.archive': '艦艇図鑑', 'm.help': 'ブリーフィング', 'm.back': 'コレクションへ戻る',
    'h.mine': '自軍艦隊', 'h.foe': '敵艦隊', 'h.afloat': 'SHIPS AFLOAT', 'h.bal': '形勢', 'h.you': '自軍', 'h.log': '戦況ログ', 'h.k': '遊び方',
    'v.foe': '敵の海域', 'v.mine': '自軍の海域',
    's.k': '対局の設定', 's.level': '敵の練度', 'df.recruit': '新兵', 'df.recruit.d': '狙いが甘く、よく外す。はじめての出撃に', 'df.regular': '正規兵', 'df.regular.d': '命中したら確実に追ってくる', 'df.elite': '精鋭', 'df.elite.d': '無駄撃ちが少なく、編成も読んでくる', 'df.veteran': '歴戦', 'df.veteran.d': '最善の射撃とスキルの先読み。互角の勝負', 'df.demon': '鬼神', 'df.demon.d': '歴戦より深く読み、艦隊のコスト上限が＋{b}（大艦隊＋{g}）', 's.first': '先攻', 's.adj': '艦の置き方', 's.go': '出撃する', 'rec': 'おすすめ',
    'd.mine': '自軍の編成', 'd.foe': '敵の編成', 'd.budget': '残りコスト', 'd.k': '{n}巡目 ・ 3〜6隻 ・ コスト{b}まで', 'd.you': 'YOUR PICK', 'd.ai': 'ENEMY PICK',
    'd.mineS': '自軍', 'd.foeS': '敵',
    'cp.pick': 'この艦を選ぶ', 'cp.unpick': '選択を外す', 'cp.close': '閉じる',
    'd.ships': '{n}/{m}隻', 'd.ai.pick': '敵が{s}を選んだ', 'd.wait': '敵が艦を選んでいます…',
    'dep.hint': '艦をドラッグで移動、タップで回転。配置が決まったら出撃。', 'dep.hint.pc': '艦をドラッグで移動、クリックで回転。配置が決まったら出撃。',
    'b.you': 'YOUR TURN', 'b.foe': 'ENEMY TURN', 'b.deploy': 'DEPLOYMENT', 'b.over': 'BATTLE OVER',
    'w.hit': 'HIT', 'w.miss': 'MISS', 'w.sunk': 'SUNK', 'w.lost': 'LOST', 'w.skill': 'SKILL', 'w.fog': 'NO SIGNAL', 'w.dent': 'ARMOR',
    'p.resume': '再開', 'p.new': '新しい対局', 'p.resign': '投了する', 'p.title': 'タイトルへ',
    'r.win': 'VICTORY', 'r.lose': 'DEFEAT', 'r.again': 'もう一度出撃', 'r.look': '海域を見る', 'r.sub': '{n}手で決着 ・ AI {l}', 'r.subR': '投了 ・ AI {l}',
    'r.acc': '命中率', 'r.shots': '発射', 'r.sunk': '撃沈', 'r.lost': '損失',
    'rule.grand': '大艦隊', 'rule.grand.d': '12×12の広い海でコスト30・5〜8隻。1ターンに2手（射撃やスキルを2回）動ける、タクティクスの大規模版。', 'st.ap': 'このターンあと{n}手', 's.streak': '連続攻撃', 's.on': 'あり', 's.off': 'なし',
    'a.k': '全50隻', 'a.all': 'すべて', 'd.all': '全艦一覧', 'f.k': '両軍の艦', ok: 'OK', back: '戻る',
    'u.tap2': '狙うマスを2回タップで発射', 'u.use': '使用', 'u.cd': 'クールタイム {n}', 'u.len': '{n}マス', 'u.cost': 'コスト',
    'help': [['艦隊を編成', 'タクティクスでは、毎回ちがう10種の艦から交互に選んで艦隊を組む。コスト20までで3〜6隻。艦ごとにスキル（攻撃・索敵・防御）があり、組み合わせで戦い方が変わる。'],
      ['配置', '自軍の海域に艦を並べる。ドラッグで移動、タップ（クリック）で回転。艦の大きさがそのまま的の大きさになる。'],
      ['撃ち合い', '敵の海域のマスを選んで砲撃。命中すると炎が上がり、艦のマスをすべて当てると撃沈。スキルはクールタイムが明けると使える。先に敵艦隊を全滅させた方の勝ち。']],
  },
  en: {
    tagline: 'Draft a fleet from fifty warships and trade fire across an evening ocean. Sonar, smoke, torpedoes, air strikes — every ship brings a skill to outwit the enemy.',
    'm.play': 'Sortie', 'm.archive': 'Ship archive', 'm.help': 'Briefing', 'm.back': 'Back to the collection',
    'h.mine': 'Our fleet', 'h.foe': 'Enemy fleet', 'h.afloat': 'SHIPS AFLOAT', 'h.bal': 'Balance', 'h.you': 'Us', 'h.log': 'Battle log', 'h.k': 'How to play',
    'v.foe': 'Enemy waters', 'v.mine': 'Our waters',
    's.k': 'Game settings', 's.level': 'Enemy rank', 'df.recruit': 'Recruit', 'df.recruit.d': 'Loose aim, misses often. For a first sortie', 'df.regular': 'Regular', 'df.regular.d': 'Follows up every hit', 'df.elite': 'Elite', 'df.elite.d': 'Few wasted shots, reads your draft', 'df.veteran': 'Veteran', 'df.veteran.d': 'Best-odds fire and skill look-ahead. An even fight', 'df.demon': 'Demon', 'df.demon.d': 'Reads deeper than Veteran and drafts with +{b} budget (+{g} in Grand Fleet)', 's.first': 'First to fire', 's.adj': 'Ship spacing', 's.go': 'Engage', 'rec': 'RECOMMENDED',
    'd.mineS': 'Ours', 'd.foeS': 'Enemy',
    'cp.pick': 'Pick this ship', 'cp.unpick': 'Unpick', 'cp.close': 'Close',
    'd.mine': 'Our picks', 'd.foe': 'Enemy picks', 'd.budget': 'Budget', 'd.k': 'Pick {n} · 3–6 ships · up to {b} cost', 'd.you': 'YOUR PICK', 'd.ai': 'ENEMY PICK',
    'd.ships': '{n}/{m} ships', 'd.ai.pick': 'The enemy took the {s}', 'd.wait': 'The enemy is choosing…',
    'dep.hint': 'Drag a ship to move it, tap to turn it. Engage when ready.', 'dep.hint.pc': 'Drag a ship to move it, click to turn it. Engage when ready.',
    'b.you': 'YOUR TURN', 'b.foe': 'ENEMY TURN', 'b.deploy': 'DEPLOYMENT', 'b.over': 'BATTLE OVER',
    'w.hit': 'HIT', 'w.miss': 'MISS', 'w.sunk': 'SUNK', 'w.lost': 'LOST', 'w.skill': 'SKILL', 'w.fog': 'NO SIGNAL', 'w.dent': 'ARMOR',
    'p.resume': 'Resume', 'p.new': 'New game', 'p.resign': 'Resign', 'p.title': 'Title screen',
    'r.win': 'VICTORY', 'r.lose': 'DEFEAT', 'r.again': 'Sortie again', 'r.look': 'View the sea', 'r.sub': 'Decided in {n} moves · AI {l}', 'r.subR': 'Resigned · AI {l}',
    'r.acc': 'ACCURACY', 'r.shots': 'SHOTS', 'r.sunk': 'SUNK', 'r.lost': 'LOST',
    'rule.grand': 'Grand Fleet', 'rule.grand.d': 'Tactics on a wide 12×12 sea: 5–8 ships on a budget of 30, and two actions (shots or skills) each turn.', 'st.ap': '{n} more this turn', 's.streak': 'Hit again', 's.on': 'On', 's.off': 'Off',
    'a.k': 'All 50 ships', 'a.all': 'All', 'd.all': 'All ships', 'f.k': 'Both fleets', ok: 'OK', back: 'Back',
    'u.tap2': 'Tap a square twice to fire', 'u.use': 'Use', 'u.cd': 'Cooldown {n}', 'u.len': '{n} squares', 'u.cost': 'Cost',
    'help': [['Draft a fleet', 'In Tactics both sides take turns picking from ten ship types, different every game: up to 20 cost, 3 to 6 ships. Each ship has a skill — attack, scouting or defence — and the mix decides how you fight.'],
      ['Deploy', 'Place your ships in our waters. Drag to move, tap (click) to turn. A ship\'s length is the size of the target it makes.'],
      ['Exchange fire', 'Pick a square in the enemy waters to fire. A hit starts a fire; hit every square of a ship to sink it. Skills come back after their cooldown. Sink the whole enemy fleet first to win.']],
  },
};
function t(k, v) { let s = DN[LANG] && DN[LANG][k]; if (s == null) s = SEA_I18N[LANG] && SEA_I18N[LANG][k]; if (s == null) s = DN.en[k]; if (s == null) s = SEA_I18N.en[k]; if (s == null) return k; if (v && typeof s === 'string') for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
const tier = lv => t('tier')[Math.min(4, (lv - 1) / 4 | 0)];
// (2026-11-24 user: Lv.20 が勝てるか勝てないか。弱い側のレベルが多すぎるので5段階のプルダウンに、戦争っぽい呼び名で)
// five ranks on the engine's levels; 鬼神 (Lv.21) thinks longer and drafts with E.HELL_BONUS more budget
const DIFF = [['recruit', 3], ['regular', 9], ['elite', 16], ['veteran', 20], ['demon', 21]];
const diffOf = lv => DIFF.reduce((b, d) => Math.abs(d[1] - lv) < Math.abs(b[1] - lv) ? d : b);
const dName = lv => t('df.' + diffOf(lv)[0]);
const hellBonus = (lv, mode) => lv >= 21 ? E.HELL_BONUS[mode] || 0 : 0;
const PC = matchMedia('(hover: hover) and (pointer: fine)'), WIDE = matchMedia('(min-width:761px) and (min-height:521px)');

// ---------- sound (Web Audio, no files) ----------
let AC = null;
function ac() { if (!S.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return document.hidden ? null : AC; }
function tone(f0, f1, dur, type, vol, when) { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (when || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .2, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .05); }
function noise(dur, freq, q, vol, when, type) { const a = ac(); if (!a) return; const n = a.sampleRate * dur | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + (when || 0); s.buffer = b; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t0); }
const SFX = {
  lock: () => tone(1250, 1180, .16, 'sine', .08),
  fire: () => { noise(.7, 160, .5, .55, 0, 'lowpass'); tone(90, 38, .5, 'triangle', .28); },
  miss: () => { noise(.6, 1700, .7, .22); tone(420, 190, .3, 'sine', .06); },
  hit: () => { noise(.6, 240, .6, .6, 0, 'lowpass'); tone(150, 40, .5, 'triangle', .34); },
  sunk: () => { noise(1.2, 170, .5, .65, 0, 'lowpass'); tone(110, 28, 1.1, 'triangle', .38); tone(660, 330, .5, 'sine', .07, .15); },
  place: () => tone(520, 640, .07, 'triangle', .1),
  select: () => tone(880, 990, .06, 'sine', .07),
  bad: () => tone(200, 150, .14, 'square', .05),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .4, 'triangle', .14, i * .14)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * .97, .5, 'sine', .14, i * .22)),
  ping: () => { tone(1480, 1460, .5, 'sine', .07); tone(1480, 1460, .5, 'sine', .03, .22); },
  horn: () => { tone(110, 108, 1.1, 'sawtooth', .05); tone(165, 162, 1.1, 'sawtooth', .035); },
};
const sfx = k => { try { SFX[k] && SFX[k](); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });

// ---------- ship texts and icons (as the 2D game) ----------
const SK_ICON = {
  armor: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  aa: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 13l5-5 5 5M5 5.5l7-3 7 3"/></svg>',
  decoy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="4.5"/><path d="M12 14.5V20M7 20.5h10M12 5.5V2.5"/></svg>',
  counter: '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 1 1-2.8-5.8M19.5 3.5v4.8h-4.8"/></svg>',
  rally: '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="1"/><path d="M4 12h16M12 8v12M8.5 8L12 4.5 15.5 8"/></svg>',
  hospital: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 7.5v9M7.5 12h9"/></svg>',
  trace: '<svg viewBox="0 0 24 24"><path d="M3 12h3l2.2-6 3.6 12 2.4-8 1.8 4H21"/></svg>',
  pursuit: '<svg viewBox="0 0 24 24"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>',
  haste: '<svg viewBox="0 0 24 24"><circle cx="13.5" cy="13" r="7"/><path d="M13.5 9v4l3 2M2.5 7h5M2 11h3.5"/></svg>',
  net: '<svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20M4 12h16M12 4v16"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  plunder: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 10.5h8M5 14a7 7 0 0 0 14 0"/></svg>',
  calm: '<svg viewBox="0 0 24 24"><path d="M3 9.5c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/></svg>',
  hull: '<svg viewBox="0 0 24 24"><path d="M3 14h18l-3 5H6zM8 14V9.5h8V14M12 9.5V5"/></svg>',
  ring: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8" stroke-dasharray="1.5 1.5"/></svg>',
  allout: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  guided: '<svg viewBox="0 0 24 24"><path d="M4 20l9-9"/><path d="M13 5l6 0 0 6-6-6z"/><circle cx="5" cy="19" r="1.5"/></svg>',
  dtorpedo: '<svg viewBox="0 0 24 24"><path d="M8 21V7M16 21V7"/><path d="M5 10l3-4 3 4M13 10l3-4 3 4"/></svg>',
  listen: '<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="3"/></svg>',
  bracket: '<svg viewBox="0 0 24 24"><rect x="1.5" y="9.5" width="5" height="5" rx=".8"/><rect x="17.5" y="9.5" width="5" height="5" rx=".8"/><path d="M10 12h4M12 10v4"/></svg>',
  depth: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><path d="M12 8.8V7" /></svg>',
  plate: '<svg viewBox="0 0 24 24"><path d="M3 15h18l-2.5 4h-13z"/><path d="M6 15V9h12v6"/><path d="M9 9V6h6v3"/></svg>',
  diag: '<svg viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="5" height="5" rx=".8"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="16.5" y="16.5" width="5" height="5" rx=".8"/><path d="M16 4h4v4"/></svg>',
  echo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/></svg>',
  lance: '<svg viewBox="0 0 24 24"><rect x="9.5" y="2" width="5" height="4.2" rx=".8"/><rect x="9.5" y="7.3" width="5" height="4.2" rx=".8"/><rect x="9.5" y="12.6" width="5" height="4.2" rx=".8"/><rect x="9.5" y="17.9" width="5" height="4.2" rx=".8"/></svg>',
  rapid: '<svg viewBox="0 0 24 24"><path d="M4 8h9M4 12h12M4 16h9"/><path d="M15 6l5 6-5 6"/></svg>',
  intel: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  flare: '<svg viewBox="0 0 24 24"><path d="M12 2v5"/><circle cx="12" cy="11" r="3"/><path d="M5 16l2.5-2M19 16l-2.5-2M12 15v2"/><rect x="6" y="17" width="12" height="4" rx="1"/></svg>',
  ward: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  suppress: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M5 5l14 14"/></svg>',
  sweep: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 6.5v2M12 15.5v2M6.5 12h2M15.5 12h2"/></svg>',
  strafe: '<svg viewBox="0 0 24 24"><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="3" y="3" width="5" height="5" rx=".8"/><rect x="16" y="3" width="5" height="5" rx=".8"/><rect x="3" y="16" width="5" height="5" rx=".8"/><rect x="16" y="16" width="5" height="5" rx=".8"/></svg>',
  rtorpedo: '<svg viewBox="0 0 24 24"><path d="M3 12h15"/><path d="M14 7l5 5-5 5"/><path d="M3 8v8"/></svg>',
  probe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><rect x="9.5" y="2" width="5" height="4.5" rx=".8"/><rect x="9.5" y="17.5" width="5" height="4.5" rx=".8"/><rect x="2" y="9.5" width="4.5" height="5" rx=".8"/><rect x="17.5" y="9.5" width="4.5" height="5" rx=".8"/></svg>',
  barrage: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="5" rx=".8"/><rect x="9.5" y="3" width="5" height="5" rx=".8"/><rect x="16" y="3" width="5" height="5" rx=".8"/><rect x="3" y="9.5" width="5" height="5" rx=".8"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="16" y="9.5" width="5" height="5" rx=".8"/><rect x="3" y="16" width="5" height="5" rx=".8"/><rect x="9.5" y="16" width="5" height="5" rx=".8"/><rect x="16" y="16" width="5" height="5" rx=".8"/></svg>',
  radar: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 6a9 9 0 0 1 14 0M7.5 9a5.5 5.5 0 0 1 9 0"/><circle cx="12" cy="14" r="1.6"/><path d="M8 21h8"/></svg>',
  mine: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="5.5"/><path d="M12 4v3.5M12 18.5V22M3 13h3.5M17.5 13H21M5.6 6.6l2.5 2.5M15.9 16.9l2.5 2.5M18.4 6.6l-2.5 2.5M8.1 16.9l-2.5 2.5"/></svg>',
  rocket: '<svg viewBox="0 0 24 24"><rect x="2.5" y="9" width="5.5" height="6" rx="1"/><rect x="9.25" y="9" width="5.5" height="6" rx="1"/><rect x="16" y="9" width="5.5" height="6" rx="1"/><path d="M5 6l1-2M12 6V3.5M19 6l-1-2"/></svg>',
  repair: '<svg viewBox="0 0 24 24"><path d="M14.5 4a4.5 4.5 0 0 0-4.2 6.1L3.5 16.9a1.8 1.8 0 0 0 2.6 2.6l6.8-6.8A4.5 4.5 0 0 0 19 8.5l-2.7 2.7-2.6-.6-.6-2.6L15.8 5.3A4.5 4.5 0 0 0 14.5 4z"/></svg>',
  smoke: '<svg viewBox="0 0 24 24"><path d="M5 15a4 4 0 0 1 3-6.5A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 19 15.8"/><path d="M4 19h16M7 22h10"/></svg>',
  scout: '<svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M12 8l-7 4 7 1 7-1z"/><path d="M10 16h4"/><path d="M3 5h18M3 19h4M17 19h4"/></svg>',
  twin: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.2"/><circle cx="16.5" cy="12" r="3.2"/><path d="M8 4v3M16.5 4v3M8 17v3M16.5 17v3"/></svg>',
  command: '<svg viewBox="0 0 24 24"><path d="M6 21V3"/><path d="M6 4h11l-2.5 3.5L17 11H6"/><path d="M12 15l2 2 4-4"/></svg>',
  jam: '<svg viewBox="0 0 24 24"><path d="M12 13v8"/><circle cx="12" cy="11" r="2"/><path d="M8 7a5.5 5.5 0 0 0 0 8M16 7a5.5 5.5 0 0 1 0 8"/><path d="M4 4l16 16"/></svg>',
  bomb: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><rect x="2" y="9" width="6" height="6" rx="1"/><rect x="16" y="9" width="6" height="6" rx="1"/></svg>',
  volley: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg>',
  torpedo: '<svg viewBox="0 0 24 24"><path d="M12 21V6"/><path d="M7 10l5-5 5 5"/><path d="M8 21h8"/></svg>',
  sonar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M7.200 7.200a6.800 6.800 0 0 0 0 9.600M16.800 7.200a6.800 6.800 0 0 1 0 9.600M4 4a11.300 11.300 0 0 0 0 16M20 4a11.300 11.300 0 0 1 0 16"/></svg>',
};
const PASS_K = ['armor', 'aa', 'decoy', 'counter', 'calm', 'plunder', 'net', 'pursuit', 'haste', 'trace', 'rally', 'hospital'];
const PASSIVE_T = T => PASS_K.some(k => T[k]);
const abilityKey = T => T.skill || PASS_K.find(k => T[k]) || 'hull';
const ROLE_OF = k => E.ROLE.atk.includes(k) ? 0 : E.ROLE.info.includes(k) ? 1 : E.ROLE.def.includes(k) ? 2 : 3;
function shipSkillName(T) { if (T.skill) return t('sk.' + T.skill); const p = PASS_K.find(k => T[k]); return p ? t('sk.' + p) : T.cost === 0 ? t('sk.free') : t('dr.none'); }
function shipSkillText(T) {
  if (T.skill) return t('sk.' + T.skill + '.d');
  if (T.armor) return t(T.armor > 1 ? 'sk.armor2.d' : 'sk.armor.d');
  const p = PASS_K.find(k => T[k]); if (p) return String(t('sk.' + p + '.d')).replace(/^常時：/, '').replace(/^Always: /, '');
  return T.cost === 0 ? t('sk.free.d') : t('pk.plain');
}
const kindOf = T => T.skill ? t('u.cd', { n: T.cd }) : PASSIVE_T(T) ? t('pk.passive') : t('pk.none');
const lenPips = n => `<span class="len">${'<i></i>'.repeat(n)}</span>`;
const icon = k => SK_ICON[k] || SK_ICON.hull;
// the reach of a skill on a 7×7 window of the sea around the aimed square (attack squares warm, read squares cool) — as the 2D game's cards
const SCAN_K = { sonar: 1, scout: 1, radar: 1, sweep: 1, echo: 1, diag: 1, cross: 1, flare: 1 };
function cardArt(T) {
  const r = reachSvg(T.skill); if (r) return r;
  const ic = (SK_ICON[abilityKey(T)] || SK_ICON.hull).replace('<svg ', '<svg x="27" y="27" width="30" height="30" class="emi" ');
  let ticks = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r1 = i % 4 ? 35.5 : 33.5; ticks += `M${(42 + r1 * Math.cos(a)).toFixed(1)} ${(42 + r1 * Math.sin(a)).toFixed(1)}L${(42 + 38 * Math.cos(a)).toFixed(1)} ${(42 + 38 * Math.sin(a)).toFixed(1)}`; }
  return `<svg class="reach emb" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" class="r1"/><circle cx="42" cy="42" r="26" class="r2"/><circle cx="42" cy="42" r="23.5" class="r3"/><path d="${ticks}" class="tk"/>${ic}</svg>`;
}
function reachSvg(skill) {
  if (!skill || E.NOAIM[skill]) return '';
  const was = E.mode; E.setMode('std'); try { return reachSvg0(skill); } finally { E.setMode(was); }   // (drawn on the 10×10 window whatever the sea's size)
}
function reachSvg0(skill) {
  const at = 44, fp = new Set(E.footprint(skill, at)), atk = new Set(), scan = new Set(), maybe = new Set();
  const path = new Set(), TORP = { torpedo: 1, rtorpedo: 1, dtorpedo: 1 };
  if (SCAN_K[skill]) fp.forEach(c => scan.add(c)); else if (TORP[skill]) fp.forEach(c => path.add(c)); else fp.forEach(c => atk.add(c));
  if (skill === 'probe') E.footprint('bomb', at).filter(c => c !== at).forEach(c => scan.add(c));
  if (skill === 'depth') E.footprint('bomb', at).filter(c => c !== at).forEach(c => maybe.add(c));
  if (skill === 'twin') maybe.add(45);
  if (skill === 'guided') maybe.add(45);
  if (skill === 'bracket') scan.add(at);
  const r0 = 1, c0 = 1, n = 7, z = 12; let h = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const k = (r0 + r) * 10 + c0 + c; const cls = atk.has(k) ? 'a' : scan.has(k) ? 's' : path.has(k) ? 'p' : maybe.has(k) ? 'm' : '';
    h += `<rect x="${c * z + 1}" y="${r * z + 1}" width="${z - 2}" height="${z - 2}" rx="2" class="${cls}"/>`; }
  const ar = (at / 10 | 0) - r0, ac = at % 10 - c0;
  h += `<rect x="${ac * z + .5}" y="${ar * z + .5}" width="${z - 1}" height="${z - 1}" rx="2.4" class="aim"/>`;
  if (skill === 'torpedo' || skill === 'dtorpedo') h += `<path d="M${ac * z + 6} ${n * z - 2}v-10m-3 3l3-3 3 3" class="arw"/>` + (skill === 'dtorpedo' ? `<path d="M${ac * z + 18} ${n * z - 2}v-10m-3 3l3-3 3 3" class="arw"/>` : '');
  if (skill === 'rtorpedo') h += `<path d="M2 ${ar * z + 6}h10m-3-3l3 3-3 3" class="arw"/>`;
  return `<svg class="reach" viewBox="0 0 ${n * z} ${n * z}">${h}</svg>`;
}


// ---------- portraits: rendered one at a time, between frames ----------
const pq = [];
function portraitImg(k, len, cls) { const id = k + '|' + len, got = World.portraitIf(k, len); return got ? `<img class="${cls || ''}" alt="" src="${got}">` : `<img class="${cls || ''}" data-pk="${id}" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">`; }
function fillPortraits(root) { (root || document).querySelectorAll('img[data-pk]:not([data-ok])').forEach(img => { img.dataset.ok = 1; pq.push(img); }); pump(); }
let pumping = false;
function pump() { if (pumping) return; pumping = true; const step = () => { const t0 = performance.now(); while (pq.length && performance.now() - t0 < 14) { const img = pq.shift(); if (!img.isConnected) continue; const [k, len] = img.dataset.pk.split('|').map(Number); try { img.src = World.portrait(k, len); } catch (e) {} } if (pq.length) requestAnimationFrame(step); else pumping = false; }; requestAnimationFrame(step); }

// ---------- state ----------
let G = null, drag = null, hover = -1, aimTap = -1;
function save() {
  const d = { settings: Object.assign({}, S, { lang: LANG }) };
  if (G && (G.phase === 'deploy' || G.phase === 'battle')) d.game = { phase: G.phase, my: G.my, foe: G.st ? G.st.sides[1].ships : null, acts: G.st ? G.st.acts : [], first: G.first, foePicks: G.foePicks || null, rule: G.rule, streak: !!G.streak, adj: G.adj, level: G.level, evals: G.evals };
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
}
function restore() {
  const g = saved && saved.game; if (!g || !Array.isArray(g.my)) return false;
  const rule = RULE_ORDER.includes(g.rule) ? g.rule : g.rule === 'streak' ? 'classic' : 'tactics', T = rule === 'tactics' || rule === 'grand';
  E.setMode(rule === 'grand' ? 'grand' : 'std'); World.setSize(E.N);
  if (!E.validFleet(g.my, false, T)) return false;
  G = newG({ phase: 'deploy', my: g.my, level: g.level || S.level, rule, streak: !!g.streak || g.rule === 'streak', adj: !!g.adj, first: g.first | 0, foePicks: g.foePicks });
  if (g.phase !== 'battle' || !g.foe || !E.validFleet(g.foe, false, T, hellBonus(g.level || 0, rule === 'grand' ? 'grand' : 'std'))) return true;
  G.st = E.newGame({ rule, streak: G.streak, adj: G.adj, fleets: [g.my, g.foe], first: G.first });
  for (const a of g.acts || []) if (!E.act(G.st, a)) break;
  G.my = G.st.sides[0].ships; G.evals = Array.isArray(g.evals) ? g.evals.slice(0, G.st.log.length + 1) : [];
  G.phase = G.st.winner >= 0 ? 'over' : 'battle'; G.view = 1;
  return true;
}
const newG = o => Object.assign({ phase: 'title', my: [], st: null, level: S.level, rule: S.rule, adj: S.adj, view: 0, hint: null, evals: [], busy: false, resigned: false, first: 0, armed: null, draft: null, foePicks: null }, o);
const tac = () => G && (G.rule === 'tactics' || G.rule === 'grand');

// ---------- the screen's free area for the camera (between the HUD panels) ----------
function safeRect() {
  const w = innerWidth, h = innerHeight;
  if (!G || G.phase === 'title') return { x: 0, y: 0, w, h };
  if (WIDE.matches) { const side = G.phase === 'deploy' ? 344 : 358; return { x: side, y: 70, w: Math.max(200, w - side * 2), h: Math.max(200, h - 70 - (G.phase === 'deploy' ? 104 : 148)) }; }
  // phones: between the bars actually on screen (status band / waters switch above, the fleet strip / skills / deploy bar below)
  const vis = el => el && !el.closest('.hide') && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
  let top = 0, bot = h; for (const id of ['#topbar', '#banner', '#views']) { const el = $(id); if (vis(el)) top = Math.max(top, el.getBoundingClientRect().bottom); }
  for (const id of ['#strip', '#dock', '#deployBar']) { const el = $(id); if (vis(el) && el.offsetHeight) bot = Math.min(bot, el.getBoundingClientRect().top); }
  return { x: 4, y: top + 10, w: w - 8, h: Math.max(160, bot - top - 20) };
}
const PHONE = () => !WIDE.matches;
// phones: stack the bottom bars (skills or deploy bar at the very bottom, the fleet strip above them)
function layoutPhone() {
  if (!PHONE()) return; const st = $('#strip'), dock = $('#dock'), dep = $('#deployBar');
  const under = !dock.closest('.hide') && dock.offsetHeight ? dock.offsetHeight : !dep.classList.contains('hide') ? dep.offsetHeight : 0;
  const b = (under + 6) + 'px'; if (st.style.bottom !== b) { st.style.bottom = b; World.refit(); }
}
// short labels that don't fit (a skill's or a ship's name on a phone tile) shrink to fit instead of ending in "…"; long texts scroll
// (2026-11-23 user: 短縮になる場合はスクロールか小さくするか、良い方を)
function fitText(root, sel, min) { root.querySelectorAll(sel).forEach(el => { el.style.fontSize = ''; el.style.letterSpacing = ''; let f = parseFloat(getComputedStyle(el).fontSize);
  if (el.scrollWidth > el.clientWidth + 1) el.style.letterSpacing = '0';
  while (el.scrollWidth > el.clientWidth + 1 && f > min) { f -= .5; el.style.fontSize = f + 'px'; } }); }
function renderStrip() {
  const el = $('#strip'); if (!PHONE() || !G || !(G.phase === 'deploy' || G.phase === 'battle' || G.phase === 'over')) { el.innerHTML = ''; return; }
  const p = G.st && G.view === 1 ? 1 : 0, sd = G.st ? G.st.sides[p] : null, ships = G.st ? sd.ships : G.my;
  el.innerHTML = ships.map((s, i) => fleetItem(s, i, sd, p === 0)).join(''); el.dataset.p = p; fillPortraits(el); fitText(el, '.fi b', 8.5); spotTip();
}
// (2026-11-23 the user) deployment on phones: a tap on a ship in the strip lights it on the sea and shows its skill in one line above the strip
let spot = -1;
// PC: the chosen ship's full card (reach diagram, skill, what it does) beside the fleet panel while deploying (2026-11-23 user)
function spotCard() {
  const el = $('#spotCard'), s = G && G.phase === 'deploy' && !PHONE() && spot >= 0 ? G.my[spot] : null;
  if (!s) { el.classList.add('hide'); return; }
  el.innerHTML = shipCard(s.t, { tag: 'div' }) + '<button class="x" aria-label="Close">×</button>'; el.classList.remove('hide'); fillPortraits(el);
  const it = $(`#listMine .fi[data-i="${spot}"]`), pr = $('#pMine').getBoundingClientRect(), r = it ? it.getBoundingClientRect() : pr;
  el.style.left = (pr.right + 12) + 'px'; el.style.top = Math.max(76, Math.min(innerHeight - el.offsetHeight - 16, r.top + r.height / 2 - el.offsetHeight / 2)) + 'px';
  el.querySelector('.x').onclick = e => { e.stopPropagation(); spot = -1; render(); };
}
function spotTip() {
  spotCard();
  const el = $('#spotTip'), st = $('#strip'), s = G && G.phase === 'deploy' && PHONE() && spot >= 0 ? G.my[spot] : null;
  if (!s) { el.classList.add('hide'); return; }
  const T = E.TYPES[s.t]; el.innerHTML = `<b>${t('ship.' + s.t)}</b>${T.skill ? `<span class="sn">${icon(abilityKey(T))}${shipSkillName(T)}</span><span class="tx">${shipSkillText(T)}</span>` : ''}`;
  el.classList.remove('hide'); el.style.bottom = (innerHeight - st.getBoundingClientRect().top + 6) + 'px';
}

// ---------- world sync ----------
function lastOn(z) { if (!G.st) return -1; for (let i = G.st.log.length - 1; i >= 0; i--) { const m = G.st.log[i]; if (m.by !== z && !m.skill) return m.cell; if (m.by === z) break; } return -1; }
function zoneOpts(z) {
  if (z === 0) { const sd = G.st ? G.st.sides[0] : null; return { ships: G.my, show: i => (sd && sd.sunk[i]) ? 'sunk' : drag && drag.i === i ? (drag.bad ? 'bad' : 'ghost') : G.phase === 'deploy' && spot === i ? 'pick' : 'own', shots: sd ? sd.shots : null, last: lastOn(0), scans: G.st ? G.st.scans[1] : null, mines: sd ? sd.mines : null }; }
  if (!G.st) return { ships: [] };
  const sd = G.st.sides[1], over = G.phase === 'over';
  return { ships: sd.ships, show: i => sd.sunk[i] ? 'sunk' : over ? 'own' : '', shots: over ? sd.shots : E.view(sd).shots, heat: G.hint ? G.hint.p : null, best: G.hint ? G.hint.best : -1, last: lastOn(1),
    scans: G.st.scans[0], glow: G.armed != null && hover >= 0 && G.view === 1 ? E.footprint(skillOf(G.my[G.armed]), hover) : null, fogged: sd.fog > 0 };
}
function syncWorld() {
  if (!G || G.phase === 'title' || G.phase === 'draft') { World.setZone(0, { ships: [] }); World.setZone(1, { ships: [] }); return; }
  World.setZone(0, zoneOpts(0)); World.setZone(1, zoneOpts(1));
}
function look(z, dur) { if (G) G.view = z; World.focus(z); renderViews(); return World.show(z ? 'z1' : 'z0', dur == null ? 900 : dur); }

// ---------- HUD ----------
function phaseUI() {
  const ph = G ? G.phase : 'title';
  $('#scrTitle').classList.toggle('hide', ph !== 'title');
  $('#hud').classList.toggle('hide', ph === 'title' || ph === 'draft');
  $('#deployBar').classList.toggle('hide', ph !== 'deploy');
  $('#right').classList.toggle('hide', !(ph === 'battle' || ph === 'over'));
  $('#dock').classList.toggle('hide', !(ph === 'battle' && tac()));
  $('#views').classList.toggle('hide', !(ph === 'battle' || ph === 'over'));
  $('#scrDraft').classList.toggle('hide', ph !== 'draft');
  sheetsUI(); layoutPhone(); World.refit();
  World.grids(ph === 'title' || ph === 'draft' ? 0 : 1, ph === 'title' || ph === 'draft' || ph === 'deploy' ? 0 : 1);
}
function render() { if (!G) return; phaseUI(); syncWorld(); renderBanner(); renderFleets(); spotCard(); renderLog(); renderBal(); renderDock(); renderViews(); const sh = $('#strip').offsetHeight; renderStrip(); layoutPhone(); if ($('#strip').offsetHeight !== sh) World.refit(); $('#bHint').classList.toggle('off', !G.hint); $('#bHint').disabled = !(G.phase === 'battle' && G.st.turn === 0 && !G.busy); }
function renderBanner(msg) {
  let tt = '', s = msg || '', foe = false;
  if (G.phase === 'deploy') { tt = t('b.deploy'); s = s || t('st.deploy'); }
  else if (G.phase === 'over') { tt = t('b.over'); s = s || (G.resigned ? t('st.resign') : t(G.st.winner === 0 ? 'st.win' : 'st.lose')); }
  else if (G.st) { foe = G.st.turn === 1; tt = t(foe ? 'b.foe' : 'b.you');
    if (!s) s = foe ? t('st.ai') : G.armed != null ? t('sk.aim.' + skillOf(G.my[G.armed])) : G.hint ? t('hint.best', { c: E.cellName(G.hint.best), p: Math.round(G.hint.p[G.hint.best] * 100) }) : G.rule === 'salvo' ? t('st.youN', { n: G.st.left }) : t('st.you'); }
  $('#bnBal').style.visibility = G.st ? '' : 'hidden';
  if (G.st && G.st.per > 1 && G.phase === 'battle' && !msg) s = (G.st.turn === 0 ? t('st.ap', { n: G.st.ap }) + ' — ' : '') + s;
  $('#bnT').textContent = tt; $('#bnT').classList.toggle('foe', foe); $('#bnB').classList.toggle('foe', foe); $('#bnS').textContent = s;
}
function fleetItem(s, i, side, mine) {
  const T = E.TYPES[s.t], sunk = side && side.sunk[i], hits = side ? (mine ? side.hitsOn[i] : sunk ? s.len : 0) : 0, known = mine || sunk || G.phase === 'over';
  const sk = !!(G.st && G.st.cd && T.skill), c = sk ? G.st.cd[mine ? 0 : 1][i] : null, live = sk ? E.skillLive(G.st, mine ? 0 : 1, i) : false;
  const tag = sk ? (live ? (c === 0 ? t('sk.ready') : t('sk.wait', { n: c })) : t('sk.lost')) : '';
  return `<div class="fi${mine ? '' : ' foe'}${sunk ? ' dead' : ''}${known ? '' : ' unk'}${G.phase === 'deploy' && spot === i ? ' on' : ''}" data-i="${i}" title="${t('ship.' + s.t)}">${portraitImg(s.t, s.len)}<b>${t('ship.' + s.t)}</b><span class="hp">${Array.from({ length: s.len }, (_, k) => `<i${k < hits ? ' class="x"' : ''}></i>`).join('')}</span>${tag ? `<span class="tg">${tag}</span>` : ''}</div>`;
}
function renderFleets() {
  const sd = G.st ? G.st.sides[0] : null;
  $('#listMine').innerHTML = G.my.map((s, i) => fleetItem(s, i, sd, true)).join('');
  $('#mineLeft').textContent = sd ? t('left', { n: sd.afloat }) : t('d.ships', { n: G.my.length, m: G.my.length });
  if (G.st) { const fs = G.st.sides[1]; $('#listFoe').innerHTML = fs.ships.map((s, i) => fleetItem(s, i, fs, false)).join(''); $('#foeLeft').textContent = fs.afloat; $('#foeLvl').textContent = 'AI ' + dName(G.level); }
  fillPortraits($('#hud'));
}
function renderLog() {
  const ol = $('#logList'); if (!G.st) { ol.innerHTML = ''; return; }
  const L = G.st.log, from = Math.max(0, L.length - 60);
  ol.innerHTML = L.slice(from).map((m, j) => { const i = from + j, foe = m.by === 1;
    let txt;
    if (m.rest) txt = t('log.rest');
    else if (m.skill) txt = `<strong>${t('sk.' + m.skill)}</strong>${m.blk ? ' ' + t('log.blk') : m.cell >= 0 && !E.NOAIM[m.skill] ? ' ' + E.cellName(m.cell) : ''}${m.k != null && !m.blk ? ' → ' + m.k : ''}`;
    else txt = `${m.via === 'counter' ? t('sk.counter') + ' ' : ''}${E.cellName(m.cell)} ${m.sunk >= 0 ? `<em>${t('log.sunk')}</em>` : m.by === 0 && m.fog && G.st.sides[1].fogged[m.cell] ? t('log.fog') : m.mine ? `<em>${t('log.mine')}</em>` : m.dent ? `<em>${t('log.dent')}</em>` : m.hit ? `<em>${t('log.hit')}</em>` : t('log.miss')}`;
    return `<li class="${foe ? 'foe' : ''}"><span class="n">${i + 1}</span><span class="d"></span><span class="t">${txt}</span></li>`; }).join('');
  ol.scrollTop = ol.scrollHeight;
}
function renderBal() {
  const ev = G.evals || [], n = G.st ? G.st.log.length : 0; let p = null;
  for (let i = Math.min(n, ev.length - 1); i >= 0 && p == null; i--) if (ev[i] != null) p = ev[i];
  if (G.phase === 'over') p = G.st.winner === 0 ? 1 : 0;
  $('#balV').textContent = $('#bnBalV').textContent = p == null ? '—' : Math.round(p * 100) + '%'; $('#balF').style.width = $('#bnBalF').style.width = (p == null ? 50 : p * 100) + '%';
}
function renderDock() {
  const el = $('#dock'); if (!tac() || !G.st) { el.innerHTML = ''; return; }
  const live = G.phase === 'battle', mine = G.st.turn === 0 && !G.busy;
  el.innerHTML = G.st.sides[0].ships.map((s, i) => { const k = skillOf(s); if (!k) return ''; const T = E.TYPES[s.t], c = G.st.cd[0][i], dead = !E.skillLive(G.st, 0, i), calm = (k === 'twin' || k === 'rapid') && E.calmOn(G.st, 0), held = !dead && c === 0 && E.skillHeld ? E.skillHeld(G.st, 0, i) : '', ready = !dead && !calm && !held && c === 0;
    const p = dead ? 0 : Math.max(0, 1 - c / Math.max(1, T.cd));
    return `<button class="sk ${dead ? 'lost' : ready ? 'ready' : 'wait'}${G.armed === i ? ' armed' : ''}" data-i="${i}" ${ready && live && mine ? '' : 'disabled'} style="--p:${p.toFixed(3)}" title="${t('ship.' + s.t)} — ${t('sk.' + k + '.d')}"><span class="ring"></span><span class="ic">${icon(k)}</span><b>${t('sk.' + k)}</b><small>${dead ? t('sk.lost') : calm ? t('sk.calmed') : held ? t('sk.held.' + held) : ready ? t('sk.ready') : t('sk.wait', { n: c })}</small></button>`; }).join('');
  if (PHONE()) fitText(el, '.sk b, .sk small', 8.5);
}
function renderViews() { $$('#views .vt').forEach(b => b.classList.toggle('on', G && +b.dataset.z === G.view)); if (G && G.st) { $('#vnFoe').textContent = G.st.sides[1].afloat; $('#vnMine').textContent = G.st.sides[0].afloat; } if (G && PHONE() && $('#strip').dataset.p !== String(G.st && G.view === 1 ? 1 : 0)) renderStrip(); }
let toastT = 0, msgT = 0;
function callout(word, sub, cls) { const el = $('#toast'); el.innerHTML = `<div class="tw ${cls || ''}">${word}</div>${sub ? `<div class="ts">${sub}</div>` : ''}`; clearTimeout(toastT); toastT = setTimeout(() => { el.innerHTML = ''; }, 1150); }
function msg(text) { const el = $('#msg'); el.textContent = text; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), 1700); renderBanner(text); }

// ---------- 形勢 (public-information rollouts) ----------
let evalJob = 0;
function queueEval() { if (!G.st) return; const job = ++evalJob, n = G.st.log.length, st = G.st; setTimeout(() => { if (job !== evalJob || G.st !== st || st.winner >= 0) return; let p = null; try { p = E.winProb(st, 0, Math.random, 8); } catch (e) {} if (p == null) return; G.evals[n] = Math.round(p * 1000) / 1000; renderBal(); save(); }, 80); }

// ---------- screens ----------
function sheet(id, on) { $(id).classList.toggle('hide', !on); sheetsUI(); }
function sheetsUI() { const open = !!document.querySelector('.sheet:not(.hide)'); World.throttle(open); World.pause(open && PHONE() && !!document.querySelector('.sheet:not(.hide):not(#scrMenu):not(#scrResult)')); }   // (phones: the sheets are opaque, so the sea stops)
function toTitle() {
  evalJob++; G = newG({ phase: 'title' }); stopPreviews();
  ['#scrSetup', '#scrMenu', '#scrResult', '#scrArchive', '#scrHelp'].forEach(s => sheet(s, false));
  phaseUI(); syncWorld(); World.sail(true); World.refit(); World.show('title', 1600);
}
const RULE_ORDER = ['tactics', 'grand', 'classic', 'salvo'];
let ND = null;
function openSetup() { ND = { rule: S.rule, level: diffOf(S.level)[1], first: S.first, adj: S.adj, streak: !!S.streak }; renderSetup(); sheet('#scrSetup', true); }
function renderDiff() {
  const cur = diffOf(ND.level), row = ([k, lv]) => `<span class="dn">${t('df.' + k)}</span><span class="de">${DF_EN[k]}</span><span class="dd">${t('df.' + k + '.d', { b: E.HELL_BONUS.std, g: E.HELL_BONUS.grand })}</span>`;
  $('#ddB').innerHTML = row(cur) + '<i class="chev"></i>'; $('#ddB').dataset.k = cur[0];
  $('#ddL').innerHTML = DIFF.map((d, i) => `<button class="${d === cur ? 'on' : ''}" data-lv="${d[1]}" data-k="${d[0]}"><span class="ix">0${i + 1}</span>${row(d)}</button>`).join('');
}
const DF_EN = { recruit: 'RECRUIT', regular: 'REGULAR', elite: 'ELITE', veteran: 'VETERAN', demon: 'DEMON' };
function renderSetup() {
  $('#ruleList').innerHTML = RULE_ORDER.map((r, i) => `<button class="rc${ND.rule === r ? ' on' : ''}" data-r="${r}"><span class="num">0${i + 1}</span>${r === 'tactics' ? `<span class="rec">${t('rec')}</span>` : ''}<b>${t('rule.' + r)}</b><p>${t('rule.' + r + '.d')}</p></button>`).join('');
  renderDiff();
  $('#segFirst').innerHTML = [['you', t('ng.you')], ['random', t('ng.random')], ['ai', t('ng.ai')]].map(([v, l]) => `<button data-v="${v}" class="${ND.first === v ? 'on' : ''}">${l}</button>`).join('');
  $('#segAdj').innerHTML = [[0, t('ng.adj0')], [1, t('ng.adj1')]].map(([v, l]) => `<button data-v="${v}" class="${(!!v) === ND.adj ? 'on' : ''}">${l}</button>`).join('');
  const sv = ND.rule !== 'salvo'; $('#segStreak').innerHTML = [[0, t('s.off')], [1, t('s.on')]].map(([v, l]) => `<button data-v="${v}" class="${(!!v) === (ND.streak && sv) ? 'on' : ''}" ${sv ? '' : 'disabled'}>${l}</button>`).join('');
  $('#optStreak').classList.toggle('dim', !sv);
}
function engage() {
  Object.assign(S, ND); save(); sheet('#scrSetup', false); sheet('#scrResult', false); sheet('#scrMenu', false); World.sail(false); sfx('horn');
  evalJob++;
  E.setMode(S.rule === 'grand' ? 'grand' : 'std'); World.setSize(E.N);
  if (S.rule === 'tactics' || S.rule === 'grand') return startDraft();
  G = newG({ phase: 'deploy', my: E.randomFleet(Math.random, S.adj), rule: S.rule, streak: S.streak && S.rule !== 'salvo', adj: S.adj, level: S.level });
  enterDeploy();
}

// ---------- the draft ----------
let pickSel = [], pickTab = -1, focusK = null, pv = null, pv2 = null;
function myRun(d) { let n = d.n, c = 0; for (let g = 0; g < 12; g++) { const p = (((n + 1) >> 1) & 1) ^ d.first; if (p === 0) c++; else if (!d.done[1]) break; n++; } return Math.max(1, Math.min(c, E.MAXSHIPS - d.picks[0].length)); }
function startDraft() {
  const first = S.first === 'ai' ? 1 : S.first === 'random' ? (Math.random() < .5 ? 0 : 1) : 0;
  pkSide = 0; G = newG({ phase: 'draft', rule: S.rule, streak: !!S.streak, adj: S.adj, level: S.level, first, draft: E.draftNew(1 - first, Math.random, S.rule === 'grand' ? 'grand' : 'std', [0, hellBonus(S.level, S.rule === 'grand' ? 'grand' : 'std')]) });   // (the second to shoot picks first)
  pickSel = []; pickTab = -1; focusK = null;
  phaseUI(); syncWorld(); World.show('wide', 1400);
  if (!PHONE()) { if (!pv) pv = World.preview($('#pv')); pv.start(); }
  renderDraft(); draftStep();
}
function draftStep() {
  const d = G.draft, g = G;
  if (d.turn < 0) { G.busy = false; pv && pv.stop(); G.foePicks = d.picks[1].slice(); sfx('ping'); return enterDeploy(); }
  if (d.turn === 0) { G.busy = false; renderDraft(); return; }
  G.busy = true; renderDraft();
  setTimeout(() => { if (G !== g || G.phase !== 'draft') return; const k = E.draftAI(d, Math.random, G.level); E.draftPick(d, k >= 0 ? k : -1); if (k >= 0) { msg(t('d.ai.pick', { s: t('ship.' + k) })); sfx('place'); } draftStep(); }, 900);
}
function addMyShip(k) {
  const g = E.gridOf(G.my); let put = null;
  for (let n = 0; n < 600 && !put; n++) { const s = { r: Math.random() * E.N | 0, c: Math.random() * E.N | 0, len: E.TYPES[k].len, h: Math.random() < .5 ? 1 : 0, t: k }; if (E.fits(g, s, G.adj, -2)) put = s; }
  if (put) G.my.push(put); else G.my = E.randomFleet(Math.random, G.adj, G.my.map(s => s.t).concat(k));
}
// a ship card (draft, archive, fleets): cost · name · length, the reach diagram beside the ship, the ability and what it does
let pkSide = 0;   // the picks row on phones shows our side (0) or theirs (1)
function shipCard(k, o) {
  o = o || {}; const T = E.TYPES[k], cost = o.cost != null ? o.cost : T.cost;
  return `<${o.tag || 'button'} class="card r${ROLE_OF(k)}${o.cls || ''}" data-k="${k}"${o.i != null ? ` data-i="${o.i}"` : ''} ${o.attrs || ''}><span class="role"></span>
    <span class="top"><span class="cost">${cost}</span><b>${t('ship.' + k)}</b>${lenPips(T.len)}${(() => { const one = E.ONE_ONLY && E.ONE_ONLY[T.k], n = o.pool > 1 ? '×' + o.pool : ''; return one || n ? `<em class="pool${one ? ' one' : ''}${n ? '' : ' only'}">${one ? `<span class="oneT">${t('pk.one')}${n ? ' · ' : ''}</span>` : ''}${n}</em>` : ''; })()}</span>
    <span class="art">${cardArt(T)}${portraitImg(k, T.len)}</span><span class="meta"><span class="rl">${t('dr.g' + ROLE_OF(k))}</span><span class="sz">${lenPips(T.len)}<em>${T.len}</em></span>${E.ONE_ONLY && E.ONE_ONLY[T.k] ? `<span class="one1">${t('pk.one')}</span>` : ''}</span>
    <span class="skl">${icon(abilityKey(T))}<span>${shipSkillName(T)}</span><small>${kindOf(T)}</small></span>
    <span class="desc">${shipSkillText(T)}</span>${o.foot || '<span class="foot"></span>'}</${o.tag || 'button'}>`;
}
function draftCard(k, d, mine, run, selCost, costOf) {
  const T = E.TYPES[k], have = d.picks[0].filter(x => x === k).length, taken = have >= (E.maxSame ? E.maxSame(k) : E.MAXSAME), dup = have > 0 && !taken, cost = E.pickCost(d, 0, k), sel = pickSel.includes(k);
  const fits = sel || costOf((pickSel.length < run ? pickSel : pickSel.slice(0, -1)).concat(k)) <= E.draftLeft(d, 0);
  const can = mine && E.draftCan(d, 0, k) && fits;
  const why = taken ? t(E.maxSame && E.maxSame(k) === 1 ? 'pk.one' : 'pk.taken') : !d.pool[k] ? t('pk.gone') : cost > E.draftLeft(d, 0) - (mine && !sel ? selCost : 0) ? t('pk.cost') : d.picks[0].length >= E.MAXSHIPS ? t('pk.full') : mine && !E.canReachMin(d, 0, k) ? t('pk.min') : '';
  const foot = sel ? `<span class="foot badge">${run > 1 ? (pickSel.indexOf(k) + 1) + ' · ' : ''}${t('pk.sel')}</span>` : why ? `<span class="foot why">${why}</span>` : dup ? `<span class="foot why gold">${t('pk.dup', { n: E.DUP_EXTRA })}</span>` : '';
  return shipCard(k, { cost, pool: d.pool[k], cls: (can || sel ? '' : ' off') + (sel ? ' sel' : '') + (dup ? ' dup' : ''), attrs: can ? '' : 'aria-disabled="true"', foot });
}
// (2026-11-23 the user) phones: the ships are small tiles (ship · name · role); a tap opens the whole card here, with the pick button in the draft
let cpK = -1, cpMode = '';
function cardPop(k, mode) {
  cpK = k; cpMode = mode; const d = G && G.phase === 'draft' ? G.draft : null, pop = $('#cardPop');
  let html;
  if (mode === 'draft' && d) { const mine = d.turn === 0 && !G.busy, run = myRun(d), costOf = ks => E.draftCost(d.picks[0].concat(ks)) - E.draftCost(d.picks[0]);
    html = draftCard(k, d, mine, run, costOf(pickSel), costOf).replace(/^<button/, '<div').replace(/<\/button>$/, '</div>');
    const sel = pickSel.includes(k), can = mine && E.draftCan(d, 0, k);
    $('#cpPick').classList.toggle('hide', !(sel || can)); $('#cpPickT').textContent = t(sel ? 'cp.unpick' : 'cp.pick'); $('#cpPick').classList.toggle('prime', !sel);
  } else { html = shipCard(k, { tag: 'div' }); $('#cpPick').classList.add('hide'); }
  $('#cpCard').innerHTML = html; $('#cpCloseT').textContent = t('cp.close'); pop.classList.remove('hide'); fillPortraits(pop);
}
function cardPopClose() { $('#cardPop').classList.add('hide'); cpK = -1; }
// (2026-11-24) a wrapped role row makes one tile taller; every tile in the grid takes the tallest one's height so the rows stay even
function eqCards(g) { const cs = [...g.querySelectorAll('.card')]; cs.forEach(c => c.style.minHeight = ''); const h = Math.max(0, ...cs.map(c => c.offsetHeight)); if (h) cs.forEach(c => c.style.minHeight = h + 'px'); }
function renderDraft() {
  if (!G || G.phase !== 'draft') return;
  const d = G.draft, mine = d.turn === 0 && !G.busy, f = d.f;
  if (!mine) pickSel = []; pickSel = pickSel.filter(k => E.draftCan(d, 0, k));
  const run = myRun(d), costOf = ks => E.draftCost(d.picks[0].concat(ks)) - E.draftCost(d.picks[0]), selCost = costOf(pickSel);
  const all = E.TYPES.map((_, k) => k).filter(k => f[k]).sort((a, b) => ROLE_OF(a) - ROLE_OF(b) || E.TYPES[a].cost - E.TYPES[b].cost || a - b);
  const counts = [0, 1, 2, 3].map(g => all.filter(k => ROLE_OF(k) === g).length);
  $('#drTabs').innerHTML = `<button data-g="-1" class="${pickTab < 0 ? 'on' : ''}">${t('a.all')}<em>${all.length}</em></button>` + [0, 1, 2, 3].map(g => counts[g] ? `<button data-g="${g}" class="${pickTab === g ? 'on' : ''}">${t('dr.g' + g)}<em>${counts[g]}</em></button>` : '').join('');
  $('#drGrid').innerHTML = all.filter(k => pickTab < 0 || ROLE_OF(k) === pickTab).map(k => draftCard(k, d, mine, run, selCost, costOf)).join('');
  eqCards($('#drGrid'));
  $('#drK').textContent = t('d.k', { n: d.n + 1, b: E.BUDGET });
  $('#drTurn').textContent = t(d.turn === 0 ? 'd.you' : 'd.ai'); $('#drTurn').classList.toggle('foe', d.turn !== 0);
  const left = E.draftLeft(d, 0), used = E.BUDGET - left;
  $('#bgV').textContent = left - selCost; $('#bgF').style.width = (used / E.BUDGET * 100) + '%'; $('#bgS').style.left = (used / E.BUDGET * 100) + '%'; $('#bgS').style.width = (selCost / E.BUDGET * 100) + '%';
  $('#bgN').textContent = t('d.ships', { n: d.picks[0].length + pickSel.length, m: E.MAXSHIPS });
  const chips = (p, cls) => d.picks[p].map((k, i) => `<span class="chip r${ROLE_OF(k)} ${cls}${i === d.picks[p].length - 1 && d.last === p ? ' new' : ''}" data-k="${k}">${portraitImg(k, E.TYPES[k].len)}<span class="nm">${t('ship.' + k)}</span><span class="rl">${t('dr.g' + ROLE_OF(k))}</span></span>`).join('') || '<span class="chip" style="opacity:.4;padding-left:8px">—</span>';
  $('#pkMine').innerHTML = chips(0, ''); $('#pkFoe').innerHTML = chips(1, 'foe');
  $('#pkRow').classList.toggle('foe', pkSide === 1); $('#pkSwT').textContent = t(pkSide ? 'd.foeS' : 'd.mineS'); $('#pkSwN').textContent = d.picks[pkSide].length;   // (phones: one row, one side at a time)
  $('#drOk').disabled = !(mine && pickSel.length);
  $('#drOkT').textContent = mine ? (run > 1 ? t('pk.okn', { n: pickSel.length, m: run }) : t('pk.ok')) : t('d.wait');
  if (focusK == null || !f[focusK]) focusK = pickSel[pickSel.length - 1] != null ? pickSel[pickSel.length - 1] : all[0];
  showShip(focusK, pv, '#pvName', '#pvMeta', '#pvSkill');
  fillPortraits($('#scrDraft'));
}
let shown = new WeakMap();
function showShip(k, P, nm, meta, sk) {
  if (k == null) return; const T = E.TYPES[k];
  if (P && shown.get(P) !== k) { P.set(k, T.len); shown.set(P, k); }
  $(nm).textContent = t('ship.' + k);
  $(meta).innerHTML = `<span>${t('u.cost')}<b>${T.cost}</b></span><span>${t('u.len', { n: '' }).trim()}<b>${T.len}</b></span><span>${t('dr.g' + ROLE_OF(k))}</span>`;
  $(sk).innerHTML = `<div class="big">${cardArt(T)}</div><div><b>${icon(abilityKey(T))}${shipSkillName(T)} <small>${kindOf(T)}</small></b><p>${shipSkillText(T)}</p></div>`;
}
function draftPickMine(k) { if (G.phase !== 'draft' || G.busy || G.draft.turn !== 0) return; if (!E.draftPick(G.draft, k)) return; addMyShip(k); sfx('place'); }
function stopPreviews() { if (pv) pv.stop(); if (pv2) pv2.stop(); }

// ---------- deploy ----------
function enterDeploy() {
  G.phase = 'deploy'; drag = null; G.view = 0; spot = -1;
  $('#deployBar p').textContent = t(PC.matches ? 'dep.hint.pc' : 'dep.hint');
  render(); save(); World.refit(); look(0, 1300);
}
const shipAtCell = cell => E.gridOf(G.my)[cell];
const gridWithout = i => E.gridOf(G.my.map((s, k) => k === i ? null : s));
function clampShip(s) { const N = E.N, maxR = s.h ? N - 1 : N - s.len, maxC = s.h ? N - s.len : N - 1; s.r = Math.max(0, Math.min(maxR, s.r)); s.c = Math.max(0, Math.min(maxC, s.c)); return s; }
function tryTurn(i, pivot) {
  const s = G.my[i], g = gridWithout(i), pr = pivot / E.N | 0, pc = pivot % E.N, k0 = s.h ? pc - s.c : pr - s.r;
  const order = [k0]; for (let d = 1; d < s.len; d++) { if (k0 - d >= 0) order.push(k0 - d); if (k0 + d < s.len) order.push(k0 + d); }
  for (const k of order) { const n = clampShip({ len: s.len, h: s.h ? 0 : 1, r: s.h ? pr - k : pr, c: s.h ? pc : pc - k, t: s.t }); if (E.fits(g, n, G.adj, -2)) { G.my[i] = n; return true; } }
  for (let d = 1; d < 4; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) { const n = { len: s.len, h: s.h ? 0 : 1, r: s.r + dr, c: s.c + dc, t: s.t }; if (E.inside(n) && E.fits(g, n, G.adj, -2)) { G.my[i] = n; return true; } }
  return false;
}
function startBattle() {
  if (G.phase !== 'deploy' || !E.validFleet(G.my, G.adj, tac())) { sfx('bad'); World.shake(.6); return; }
  if (!tac()) G.first = S.first === 'ai' ? 1 : S.first === 'random' ? (Math.random() < .5 ? 0 : 1) : 0;
  G.st = E.newGame({ rule: G.rule, streak: G.streak, adj: G.adj, fleets: [G.my, E.randomFleet(Math.random, G.adj, tac() ? (G.foePicks || E.PRESETS[0]) : null)], first: G.first });
  G.my = G.st.sides[0].ships; G.armed = null; G.phase = 'battle'; G.evals = [.5]; sfx('horn');
  render(); save(); World.refit();
  look(1, 1500).then(() => { if (G.st && G.st.turn === 1 && G.phase === 'battle') aiTurn(); });
}

// ---------- battle ----------
async function doShot(cell) {
  const st = G.st, by = st.turn, z = by === 0 ? 1 : 0, T = st.sides[1 - by], hit = by === 0 && T.fog > 0 ? 'fog' : T.grid[cell] >= 0;
  if (G.view !== z) await look(z, 750); if (G.st !== st) return null;
  sfx('fire'); World.kind(null);
  await World.fx(z, cell, hit); if (G.st !== st) return null;
  const res = E.fire(st, cell); if (!res) return null;
  const ship = res.sunk >= 0 ? t('ship.' + T.ships[res.sunk].t) : '';
  if (res.sunk < 0 && by === 0 && res.fog) { sfx('miss'); callout(t('w.fog'), t('fx.fog'), 'miss'); }
  else if (res.dent) { sfx('hit'); callout(t('w.dent'), t('fx.dent')); }
  else if (res.mine) { sfx('sunk'); World.shake(1); callout(t('log.mine'), t(by === 0 ? 'fx.mine' : 'fx.foe.mine'), 'sunk'); }
  else if (res.counter) { sfx(res.counter.hit ? 'hit' : 'miss'); callout(t('sk.counter'), t(by === 0 ? 'fx.counter' : 'fx.foe.counter', { c: E.cellName(res.counter.cell), r: t(res.counter.hit ? 'log.hit' : 'log.miss') })); }
  else if (res.sunk >= 0) { sfx('sunk'); World.shake(1.2); callout(t(by === 0 ? 'w.sunk' : 'w.lost'), t(by === 0 ? 'fx.sunk' : 'fx.lost', { s: ship }) + (res.pursuit ? ' — ' + t(by === 0 ? 'fx.pursuit' : 'fx.foe.pursuit') : ''), 'sunk'); }
  else if (res.hit) { sfx('hit'); callout(t('w.hit'), E.cellName(cell)); }
  else { sfx('miss'); callout(t('w.miss'), E.cellName(cell), 'miss'); }
  render(); save(); queueEval();
  return res;
}
const SCANS = { sonar: 1, scout: 1, radar: 1, sweep: 1, flare: 1, echo: 1, diag: 1, cross: 1 };
async function doSkill(a) {
  const st = G.st, by = st.turn, z = by === 0 ? 1 : 0, pv = E.preview(st, a.ship, a.cell); if (!pv) return null;
  const noAim = E.NOAIM[pv.skill], blocked = st.sides[1 - by].ward && !E.SELF[pv.skill];
  if (!noAim && G.view !== z) { await look(z, 750); if (G.st !== st) return null; }
  callout(t('sk.' + pv.skill), by === 1 ? t('fx.foe', { s: t('sk.' + pv.skill) }) : t('ship.' + st.sides[by].ships[a.ship].t)); sfx('ping');
  await sleep(by === 1 ? 700 : 300); if (G.st !== st) return null;
  if (noAim || blocked) await sleep(300);
  else if (SCANS[pv.skill]) await World.sweep(z, pv.area);
  else { World.kind(pv.skill); sfx('fire'); const ts = []; for (const x of pv.shots) { ts.push(World.fx(z, x.cell, by === 0 && st.sides[1].fog > 0 ? 'fog' : x.hit, true).then(() => sfx(x.hit ? 'hit' : 'miss'))); await sleep(/torpedo/.test(pv.skill) ? 140 : 180); } await Promise.all(ts); if (pv.ic >= 0) World.fx(z, pv.ic, 'fog', true); await sleep(350); World.kind(null); }
  if (G.st !== st) return null;
  const res = E.useSkill(st, a.ship, a.cell); if (!res) return null;
  G.armed = null; hover = -1; aimTap = -1; skillTip(null);
  const sunk = res.shots.filter(x => x.sunk >= 0), hits = res.shots.filter(x => x.hit).length, W = t('sk.' + res.skill);
  let sub = '', cls = '';
  if (res.skill === 'listen') sub = t(by === 0 ? 'fx.listen' : 'fx.foe.listen', { r: res.row + 1, k: res.k });
  else if (res.blocked) { sfx('bad'); sub = t(by === 0 ? 'fx.blk' : 'fx.foe.blk', { s: W }); }
  else if (res.skill === 'flare') sub = t('fx.flare', { k: res.k });
  else if (SCANS[res.skill]) sub = t('fx.' + res.skill, { k: res.k, n: res.swept || 0 });
  else if (noAim) sub = t((by === 0 ? 'fx.' : 'fx.foe.') + res.skill, { c: res.fix != null ? E.cellName(res.fix) : res.lit != null ? E.cellName(res.lit) : '', s: res.pi != null ? t('ship.' + st.sides[by].ships[res.pi].t) : '' });
  else if (by === 0 && res.shots.some(x => x.fog)) { sub = t('fx.fog'); cls = 'miss'; }
  else if (res.skill === 'bracket' && res.k != null) sub = t('fx.bracket', { r: t(res.k ? 'fx.bracket.s' : 'fx.bracket.w') });
  else if (res.skill === 'probe') sub = t('fx.probe', { r: t(res.shots[0] && res.shots[0].hit && !res.shots[0].fog ? 'log.hit' : res.shots[0] && res.shots[0].fog ? 'log.fog' : 'log.miss'), k: res.k != null ? res.k : '?' });
  else if (res.shots.some(x => x.mine)) { sfx('sunk'); World.shake(1); sub = t(by === 0 ? 'fx.mine' : 'fx.foe.mine'); cls = 'sunk'; }
  else if (res.ic >= 0) sub = t(by === 0 ? 'fx.aa' : 'fx.foe.aa', { c: E.cellName(res.ic) });
  else if (res.shots.some(x => x.dent)) sub = t('fx.dent');
  else if (sunk.length) { sfx('sunk'); World.shake(1.2); sub = t(by === 0 ? 'fx.sunk' : 'fx.lost', { s: t('ship.' + st.sides[1 - by].ships[sunk[0].sunk].t) }); cls = 'sunk'; }
  else if (hits) sub = hits > 1 ? t('fx.hits', { n: hits }) : t('fx.hit'); else { sub = t('fx.miss'); cls = 'miss'; }
  callout(sunk.length ? t(by === 0 ? 'w.sunk' : 'w.lost') : W, sub, cls); renderBanner(sub);
  const cn = res.shots.find(x => x.counter); if (cn) { await sleep(800); callout(t('sk.counter'), t(by === 0 ? 'fx.counter' : 'fx.foe.counter', { c: E.cellName(cn.counter.cell), r: t(cn.counter.hit ? 'log.hit' : 'log.miss') })); }
  if (res.traced != null) { await sleep(700); callout(t('sk.trace'), t(by === 0 ? 'fx.foe.trace' : 'fx.trace', { c: E.cellName(res.traced) })); }
  render(); save(); queueEval();
  return res;
}
const doAction = a => a.skill ? doSkill(a) : doShot(a.cell);
async function playerShot(cell) {
  if (!G || !G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0 || G.view !== 1) return;
  const a = G.armed != null ? { skill: skillOf(G.my[G.armed]), ship: G.armed, cell } : { cell };
  if (a.skill ? !E.preview(G.st, a.ship, cell) : (G.st.sides[1].shots[cell] && G.st.sides[1].shots[cell] !== 3)) { sfx('bad'); return; }   // (a dented square, 3, takes another shell — 2026-11-24)
  const st = G.st; G.busy = true; G.hint = null; World.aim(1, -1); renderDock(); render();
  const res = await doAction(a); if (!res || G.st !== st) return;
  after(st);
}
async function playerNoAim(i) {
  if (!G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0) return;
  if (!E.preview(G.st, i, -1)) { sfx('bad'); msg(t('sk.none')); return; }
  const st = G.st; G.busy = true; G.hint = null; render();
  const res = await doSkill({ skill: skillOf(G.my[i]), ship: i, cell: -1 }); if (!res || G.st !== st) return;
  after(st);
}
function after(st) { if (st.winner >= 0) return finish(); if (st.turn === 1) return aiTurn(); G.busy = false; render(); }
let aiW = null, aiWid = 0;
function planMove(st, level) {
  const plain = () => E.chooseAction(st, level, Math.random);
  if (!E.PLAN || !E.PLAN[level]) return Promise.resolve(plain());
  if (aiW === null) { try { aiW = new Worker('../seabattle/ai-worker.js?v=1'); } catch (e) { aiW = false; } }
  if (!aiW) return Promise.resolve(E.planAction(st, level, Math.random));
  const id = ++aiWid, engine = new URL($('script[src*="engine.js"]').getAttribute('src'), location.href).href;
  return new Promise(res => {
    let done = false; const fin = a => { if (done) return; done = true; aiW.removeEventListener('message', on); clearTimeout(tm); res(a || plain()); };
    const on = e => { if (e.data && e.data.id === id) fin(e.data.a); }, tm = setTimeout(() => fin(null), 6000);
    aiW.addEventListener('message', on); aiW.onerror = () => fin(null);
    try { aiW.postMessage({ engine, st, level, id }); } catch (e) { fin(null); }
  });
}
async function aiTurn() {
  const st = G.st; G.busy = true; render();
  await sleep(450); if (G.st !== st) return;
  await look(0, 950); if (G.st !== st) return;
  while (G.st === st && st.winner < 0 && st.turn === 1) {
    const [a] = await Promise.all([planMove(st, G.level), sleep(420)]); if (G.st !== st) return;
    const res = await doAction(a); if (!res) return;
    await sleep(res.again ? 300 : 700);
  }
  if (G.st !== st) return;
  if (st.winner >= 0) return finish();
  await look(1, 950); if (G.st !== st) return;
  G.busy = false; render();
}
function finish() {
  const st = G.st; G.phase = 'over'; G.busy = false; G.hint = null; G.armed = null; evalJob++;
  const won = st.winner === 0; render(); save();
  try { localStorage.setItem(STORE, JSON.stringify({ settings: Object.assign({}, S, { lang: LANG }) })); } catch (e) {}
  setTimeout(() => { if (G.st !== st) return; sfx(won ? 'win' : 'lose'); World.refit(); World.show('result', 2200); setTimeout(() => { if (G.st === st) showResult(); }, 1300); }, G.resigned ? 200 : 1000);
}
function showResult() {
  const st = G.st, won = st.winner === 0, me = st.sides[1], foe = st.sides[0];   // (side[1] holds the shots we fired)
  $('#rsBig').textContent = t(won ? 'r.win' : 'r.lose'); $('#rsBig').className = 'big' + (won ? '' : ' lose');
  $('#rsSub').textContent = G.resigned ? t('r.subR', { l: dName(G.level) }) : t('r.sub', { n: st.log.length, l: dName(G.level) });
  const acc = me.nshots ? Math.round(me.hits / me.nshots * 100) : 0;
  $('#rsStats').innerHTML = [[acc + '%', t('r.acc')], [me.nshots, t('r.shots')], [st.sides[1].sunk.filter(Boolean).length, t('r.sunk')], [foe.sunk.filter(Boolean).length, t('r.lost')]].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  sheet('#scrResult', true);
}
function hint() {
  if (!G.st || G.phase !== 'battle' || G.st.turn !== 0 || G.busy) return;
  if (G.hint) G.hint = null; else { G.hint = E.advise(G.st.sides[1], G.adj, Math.random, 6000, G.st.scans[0]); sfx('ping'); if (G.view !== 1) look(1); }
  render();
}
function resign() { if (!G || G.phase !== 'battle') return; sheet('#scrMenu', false); G.resigned = true; G.st.winner = 1; evalJob++; finish(); }

// ---------- archive ----------
let arTab = -1, arK = 0;
function openArchive() { sheet('#scrArchive', true); if (!PHONE()) { if (!pv2) pv2 = World.preview($('#pv2')); pv2.start(); } renderArchive(); }
let arSort = 'role';
function renderArchive() {
  const f = G && G.phase === 'draft' && G.draft ? G.draft.f : null, byCost = (a, b) => E.TYPES[a].cost - E.TYPES[b].cost || a - b;
  const all = E.TYPES.map((_, k) => k).sort(arSort === 'role' ? (a, b) => ROLE_OF(a) - ROLE_OF(b) || byCost(a, b) : byCost);
  const counts = [0, 1, 2, 3].map(g => all.filter(k => ROLE_OF(k) === g).length);
  $('#arTabs').innerHTML = `<button data-g="-1" class="${arTab < 0 ? 'on' : ''}">${t('a.all')}<em>${all.length}</em></button>` + [0, 1, 2, 3].map(g => `<button data-g="${g}" class="${arTab === g ? 'on' : ''}">${t('dr.g' + g)}<em>${counts[g]}</em></button>`).join('')
    + `<span class="sp"></span>` + [['role', t('sl.s.role')], ['cost', t('sl.s.cost')]].map(([v, l]) => `<button data-s="${v}" class="sort${arSort === v ? ' on' : ''}">${l}</button>`).join('');
  $('#arGrid').innerHTML = all.filter(k => arTab < 0 || ROLE_OF(k) === arTab).map(k => shipCard(k, { cls: (k === arK ? ' sel' : '') + (f && f[k] ? ' onf' : ''), foot: f && f[k] ? `<span class="foot badge">${t('sl.onf')}</span>` : '' })).join('');
  eqCards($('#arGrid'));
  showShip(arK, pv2, '#pv2Name', '#pv2Meta', '#pv2Skill'); fillPortraits($('#scrArchive'));
}
// the fleets sheet: both sides as cards, with each ship's state (cooldown, damage, sunk) — from the panels or the draft's picks
function openFleets(p) { renderFleets2(); sheet('#scrFleet', true); const el = $('#fsec' + p); if (el) $('#flBody').scrollTop = el.offsetTop - $('#flBody').offsetTop - 6; }
function renderFleets2() {
  const inB = !!(G && G.st);
  const sec = p => { const list = inB ? G.st.sides[p].ships.map((s, i) => ({ k: s.t, i })) : (G.draft ? G.draft.picks[p] : []).map(k => ({ k, i: -1 }));
    const cards = list.map(({ k, i }) => { const T = E.TYPES[k], sd = inB ? G.st.sides[p] : null, sunk = sd && sd.sunk[i]; let st = '', cls = '';
      if (inB) { if (T.skill && E.skillLive(G.st, p, i)) { const c = G.st.cd[p][i]; st = `<span class="foot ${c === 0 ? 'badge' : 'why gold'}">${sunk ? t('fv.sunk') + ' · ' : ''}${c === 0 ? t('sk.ready') : t('sk.wait', { n: c })}</span>`; }
        else if (sunk) { st = `<span class="foot why">${t('fv.sunk')}</span>`; cls = ' dead'; }
        else st = `<span class="foot why gold">${p === 0 ? t('fv.hits', { n: sd.hitsOn[i], m: T.len }) : t('fv.afloat')}</span>`; }
      return shipCard(k, { tag: 'div', cls, foot: st }); }).join('');
    const left = inB ? t('left', { n: G.st.sides[p].afloat }) : G.draft ? t('dr.left', { c: E.draftLeft(G.draft, p) }) : '';
    return `<section class="fsec" id="fsec${p}"><h3><span>${p ? t('fv.foe', { n: 'AI ' + dName(G.level) }) : t('fv.me')}</span><small>${left}</small></h3>${cards ? `<div class="grid flat">${cards}</div>` : `<p class="none">${t('fv.none')}</p>`}</section>`; };
  $('#flBody').innerHTML = sec(1) + sec(0); fillPortraits($('#scrFleet'));
}
// a skill's card above the dock (hover on PC, the armed skill on phones)
function skillTip(i) {
  const el = $('#skTip'); el.className = ''; $('#strip').style.visibility = ''; if (i == null || !G || !G.st) { el.classList.add('hide'); return; }
  const s = G.st.sides[0].ships[i]; el.innerHTML = shipCard(s.t, { tag: 'div', foot: PHONE() ? `<span class="foot why gold">${t('u.tap2')}</span>` : '' }) + (PHONE() ? '<button id="tipX" aria-label="Close">×</button>' : ''); el.classList.remove('hide'); fillPortraits(el);
  if (PHONE()) {   // phones: a compact bar in the fleet strip's place (same size), so the sea stays clear to aim
    const T = E.TYPES[s.t], st = $('#strip'), now = E.NOAIM[T.skill]; el.className = 'arm' + (now ? ' now' : ''); el.innerHTML = `${cardArt(T)}<div class="tx"><b>${icon(abilityKey(T))}${shipSkillName(T)}<small>${t('ship.' + s.t)}</small></b><p>${shipSkillText(T)}</p></div>${now ? `<button id="tipGo">${t('u.use')}</button>` : ''}<button id="tipX" aria-label="Close">×</button>`;
    if (now) el.querySelector('#tipGo').onclick = e => { e.stopPropagation(); const k = G.armed; if (k == null || G.busy) return; G.armed = null; skillTip(null); playerNoAim(k); };
    el.style.bottom = st.style.bottom; el.style.height = st.offsetHeight + 'px'; st.style.visibility = 'hidden';
    el.querySelector('#tipX').onclick = e => { e.stopPropagation(); G.armed = null; hover = aimTap = -1; skillTip(null); render(); }; return; }
  const b = $(`#dock .sk[data-i="${i}"]`); if (b) { const r = b.getBoundingClientRect(), w = el.offsetWidth; el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; el.style.bottom = (innerHeight - r.top + 10) + 'px'; }
}
// ---------- input on the sea ----------
const cv = $('#world');
// (2026-11-23 the user) phones: two fingers pinch-zoom the board, a slide moves it (a slide is never a shot or a rotation)
const touches = new Map(); let gest = null;
const tdist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
const tmid = () => { const v = [...touches.values()]; return { x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length }; };
const aimSlide = () => G && G.phase === 'battle' && G.st && G.st.turn === 0 && !G.busy && G.view === 1 && G.armed != null && !E.NOAIM[skillOf(G.my[G.armed])];
const canView = () => G && (G.phase === 'deploy' || G.phase === 'battle' || G.phase === 'over') && !PC.matches;
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' && canView()) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (touches.size === 2) { if (drag) { G.my[drag.i] = drag.from; drag = null; syncWorld(); } gest = { kind: 'pinch', d: tdist(), m: tmid() }; return; }
    if (touches.size === 1) gest = { kind: 'maybe' }; }
}, true);
cv.addEventListener('pointermove', e => {
  const tp = touches.get(e.pointerId); if (!tp || !gest) return; tp.x = e.clientX; tp.y = e.clientY;
  if (gest.kind === 'pinch' && touches.size >= 2) { const d = tdist(), m = tmid(); World.zoomBy(d / gest.d); World.panBy(m.x - gest.m.x, m.y - gest.m.y); gest.d = d; gest.m = m; e.stopImmediatePropagation(); return; }
  if (drag) return;   // (a ship being dragged in the deployment)
  // an aimed skill is armed: a slide moves its reach over the enemy sea instead of the board (2026-11-23 user: ソナーの範囲をスライドで動かす);
  // letting go leaves it there, and a tap on that square fires
  if (gest.kind === 'maybe' && Math.hypot(tp.x - tp.x0, tp.y - tp.y0) > 10) gest = aimSlide() ? { kind: 'aim' } : { kind: 'pan', x: tp.x, y: tp.y }, gest.kind === 'pan' && World.aim(1, -1);
  if (gest.kind === 'aim') { const c = World.cellAt(1, e); if (c >= 0 && c !== hover) { hover = aimTap = c; syncWorld(); sfx('lock'); } e.stopImmediatePropagation(); return; }
  if (gest.kind === 'pan') { World.panBy(tp.x - gest.x, tp.y - gest.y); gest.x = tp.x; gest.y = tp.y; e.stopImmediatePropagation(); }
}, true);
const touchEnd = e => { if (!touches.has(e.pointerId)) return; touches.delete(e.pointerId); const g = gest;
  if (touches.size === 0) gest = null; else if (g && g.kind === 'pinch') gest = { kind: 'done' };
  if (g && (g.kind === 'pinch' || g.kind === 'pan' || g.kind === 'done' || g.kind === 'aim')) { e.stopImmediatePropagation(); if (touches.size === 0 && g.kind !== 'maybe') gest = null; } };
cv.addEventListener('pointerup', touchEnd, true); cv.addEventListener('pointercancel', touchEnd, true);
cv.addEventListener('pointerdown', e => {
  if (!G || G.phase !== 'deploy') return; if (touches.size > 1) return;
  const cell = World.cellAt(0, e); if (cell < 0) return; const i = shipAtCell(cell); if (i < 0) return;
  e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  const s = G.my[i], N = E.N; drag = { i, from: Object.assign({}, s), k: s.h ? cell % N - s.c : (cell / N | 0) - s.r, cell, x0: e.clientX, y0: e.clientY, moved: false, bad: false, grid: gridWithout(i) };   // (the board may be 12×12: 大艦隊 — a hard 10 here made a click off the ship's middle move it instead of turning it)
});
cv.addEventListener('pointermove', e => {
  if (drag) { if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;   // (a click, not a drag, until the pointer really travels)
    const p = World.pointIn(0, e), s = G.my[drag.i]; let r = Math.floor(p.y), c = Math.floor(p.x); if (s.h) c -= drag.k; else r -= drag.k;
    const n = clampShip({ len: s.len, h: s.h, r, c, t: s.t }); if (n.r === s.r && n.c === s.c) return; drag.moved = true; G.my[drag.i] = n; drag.bad = !E.fits(drag.grid, n, G.adj, -2); syncWorld(); return; }
  if (!G || !G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0 || G.view !== 1 || !PC.matches) return;
  const c = World.cellAt(1, e);
  if (G.armed != null) { if (c !== hover) { hover = c; World.aim(1, -1); syncWorld(); } return; }
  World.aim(1, c >= 0 && (!G.st.sides[1].shots[c] || G.st.sides[1].shots[c] === 3) ? c : -1); cv.style.cursor = c >= 0 ? 'crosshair' : '';
});
cv.addEventListener('pointerup', e => {
  if (drag) { const d = drag; drag = null; if (!d.moved) { if (tryTurn(d.i, d.cell)) sfx('place'); else { sfx('bad'); World.shake(.5); } } else if (d.bad) { G.my[d.i] = d.from; sfx('bad'); } else sfx('place'); syncWorld(); renderFleets(); save(); return; }
  if (!G || G.phase !== 'battle') return;
  const c = World.cellAt(1, e); if (c < 0) return;
  if (G.armed != null && E.NOAIM[skillOf(G.my[G.armed])]) return;   // (a no-aim skill waits for its 使用 button)
  // touch: an armed skill shows its reach on the first tap and fires on a second tap of the same square
  if (!PC.matches && G.armed != null && c !== aimTap) { aimTap = c; hover = c; syncWorld(); sfx('lock'); return; }
  aimTap = -1; playerShot(c);
});
cv.addEventListener('pointercancel', () => { if (drag) { G.my[drag.i] = drag.from; drag = null; syncWorld(); } });
cv.addEventListener('pointerleave', () => { World.aim(1, -1); if (G && G.armed != null && hover >= 0 && PC.matches) { hover = -1; syncWorld(); } });

// ---------- wiring ----------
$('#mPlay').onclick = () => { sfx('select'); openSetup(); };
$('#mArchive').onclick = () => { sfx('select'); openArchive(); };
$('#mHelp').onclick = () => { sfx('select'); sheet('#scrHelp', true); };
$$('[data-close]').forEach(b => b.addEventListener('click', () => { const s = b.closest('.sheet'); s.classList.add('hide'); sheetsUI(); if (s.id === 'scrArchive' && pv2) pv2.stop(); }));
$('#ruleList').addEventListener('click', e => { const b = e.target.closest('.rc'); if (b) { ND.rule = b.dataset.r; sfx('select'); renderSetup(); } });
// (the list floats over the sheet, fixed to the window, so the sheet's scrolling box never cuts it off; it opens upward when there is more room above)
function placeDD() { const l = $('#ddL'), r = $('#ddB').getBoundingClientRect(), H = innerHeight, below = H - r.bottom - 8, above = r.top - 8, up = below < 300 && above > below;
  Object.assign(l.style, { left: r.left + 'px', width: r.width + 'px', top: up ? '' : (r.bottom + 4) + 'px', bottom: up ? (H - r.top + 4) + 'px' : '', maxHeight: Math.max(160, up ? above : below) + 'px' }); }
$('#ddB').addEventListener('click', e => { e.stopPropagation(); const l = $('#ddL'), o = l.classList.toggle('hide'); $('#ddB').classList.toggle('open', !o); if (!o) placeDD(); sfx('select'); });
addEventListener('resize', () => { if (!$('#ddL').classList.contains('hide')) placeDD(); });
$('#scrSetup').addEventListener('scroll', () => { if (!$('#ddL').classList.contains('hide')) placeDD(); }, true);
$('#ddL').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); ND.level = +b.dataset.lv; $('#ddL').classList.add('hide'); $('#ddB').classList.remove('open'); sfx('select'); renderDiff(); });
document.addEventListener('click', () => { const l = $('#ddL'); if (l && !l.classList.contains('hide')) { l.classList.add('hide'); $('#ddB').classList.remove('open'); } });
$('#segFirst').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.first = b.dataset.v; renderSetup(); } });
$('#segStreak').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) { ND.streak = b.dataset.v === '1'; renderSetup(); } });
$('#segAdj').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.adj = b.dataset.v === '1'; renderSetup(); } });
$('#sGo').onclick = engage;
$('#drTabs').addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (!b) return; pickTab = +b.dataset.g; renderDraft(); $('#drGrid').scrollTop = 0; });
$('#drGrid').addEventListener('click', e => {
  if (PHONE()) { const c = e.target.closest('.card'); if (c) { sfx('select'); cardPop(+c.dataset.k, 'draft'); } return; }
  const c = e.target.closest('.card'); if (c) pickToggle(c);
});
function pickToggle(c) { const k = +c.dataset.k; focusK = k;
  if (c.getAttribute('aria-disabled') && !pickSel.includes(k)) { renderDraft(); return; }
  const run = myRun(G.draft); if (pickSel.includes(k)) pickSel = pickSel.filter(x => x !== k); else if (pickSel.length < run) pickSel.push(k); else pickSel = pickSel.slice(0, -1).concat(k);
  sfx('select'); renderDraft();
}
$('#drGrid').addEventListener('pointerover', e => { if (!PC.matches) return; const c = e.target.closest('.card'); if (!c) return; const k = +c.dataset.k; if (k !== focusK) { focusK = k; showShip(k, pv, '#pvName', '#pvMeta', '#pvSkill'); } });
$('#drOk').onclick = () => { if (!pickSel.length) return; const ks = pickSel; pickSel = []; for (const k of ks) { if (G.phase !== 'draft' || G.draft.turn !== 0) break; draftPickMine(k); } draftStep(); };
$('#arTabs').addEventListener('click', e => { const b = e.target.closest('button[data-g], button[data-s]'); if (!b) return; if (b.dataset.s) arSort = b.dataset.s; else arTab = +b.dataset.g; renderArchive(); $('#arGrid').scrollTop = 0; });
$('#drAll').onclick = () => { sfx('select'); openArchive(); };
$('#pMine').addEventListener('click', e => { if (G && G.phase === 'deploy') { const f = e.target.closest('.fi[data-i]'); if (!f) return; const i = +f.dataset.i; spot = spot === i ? -1 : i; sfx('select'); render(); return; } if (G && G.st) { sfx('select'); openFleets(0); } });
$('#pFoe').addEventListener('click', () => { if (G && G.st) { sfx('select'); openFleets(1); } });
$('#drShow').addEventListener('click', e => { const c = e.target.closest('.picks h5'); if (c) { sfx('select'); openFleets(c.classList.contains('foe') ? 1 : 0); } });
$('#cardPop').addEventListener('click', e => { if (e.target === $('#cardPop') || e.target.closest('#cpClose')) { sfx('select'); cardPopClose(); } });
$('#cpPick').addEventListener('click', () => { const k = cpK; if (k < 0 || !G || !G.draft) return; cardPopClose(); const c = document.querySelector(`#drGrid .card[data-k="${k}"]`); if (c) pickToggle(c); });
$('#pkSw').addEventListener('click', () => { pkSide = 1 - pkSide; sfx('select'); if (G && G.draft) renderDraft(); });
$('#pkRow').addEventListener('click', e => { const c = e.target.closest('.chip[data-k]'); if (c) { sfx('select'); cardPop(+c.dataset.k, 'view'); } });
$('#dock').addEventListener('pointerover', e => { if (!PC.matches) return; const b = e.target.closest('.sk'); skillTip(b ? +b.dataset.i : null); });
$('#dock').addEventListener('pointerleave', () => { if (PC.matches) skillTip(G && G.armed != null && !PC.matches ? G.armed : null); });
$('#arGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (!c) return; if (PHONE()) { sfx('select'); return cardPop(+c.dataset.k, 'view'); } arK = +c.dataset.k; sfx('select'); renderArchive(); });
$('#arGrid').addEventListener('pointerover', e => { if (!PC.matches) return; const c = e.target.closest('.card'); if (c && +c.dataset.k !== arK) { arK = +c.dataset.k; $$('#arGrid .card').forEach(x => x.classList.toggle('sel', +x.dataset.k === arK)); showShip(arK, pv2, '#pv2Name', '#pv2Meta', '#pv2Skill'); } });
$('#dShuffle').onclick = () => { if (G.phase !== 'deploy') return; G.my = E.randomFleet(Math.random, G.adj, G.my.map(s => s.t)); sfx('place'); syncWorld(); renderFleets(); save(); };
$('#dGo').onclick = startBattle;
$('#dock').addEventListener('click', e => { const b = e.target.closest('.sk'); if (!b || b.disabled || !G.st || G.busy || G.phase !== 'battle' || G.st.turn !== 0) return; const i = +b.dataset.i;
  if (E.NOAIM[skillOf(G.my[i])]) {
    if (!PHONE() || G.armed === i) { G.armed = null; skillTip(null); return playerNoAim(i); }   // (phones: the second tap — 2026-11-23 user: 機雷がタップした瞬間に使われた)
    G.armed = i; hover = aimTap = -1; G.hint = null; sfx('select'); render(); skillTip(i); return; }
  G.armed = G.armed === i ? null : i; hover = aimTap = -1; G.hint = null; sfx('select'); if (G.view !== 1) look(1); render(); if (!PC.matches) skillTip(G.armed); });
$('#views').addEventListener('click', e => { const b = e.target.closest('.vt'); if (!b || !G || G.busy || !(G.phase === 'battle' || G.phase === 'over')) return; look(+b.dataset.z, 800); });
$('#bHint').onclick = hint;
$('#strip').addEventListener('click', e => { if (G && G.phase === 'deploy') { const f = e.target.closest('.fi[data-i]'); if (!f) return; const i = +f.dataset.i; spot = spot === i ? -1 : i; sfx('select'); render(); return; } if (G && G.st) { sfx('select'); openFleets(+$('#strip').dataset.p || 0); } });
$('#bMenu').onclick = () => { $('#pResign').disabled = !(G && G.phase === 'battle'); sheet('#scrMenu', true); };
$('#pNew').onclick = () => { sheet('#scrMenu', false); openSetup(); };
$('#pResign').onclick = resign;
$('#pTitle').onclick = toTitle; $('#rsTitle').onclick = toTitle;
$('#rsAgain').onclick = () => { sheet('#scrResult', false); openSetup(); };
$('#rsSea').onclick = () => { sheet('#scrResult', false); look(1, 1200); };
function soundUI() { $$('#bSound, #tSound').forEach(b => { b.classList.toggle('off', !S.sound); b.querySelector('.w').style.display = S.sound ? '' : 'none'; }); }
$$('#bSound, #tSound').forEach(b => b.onclick = () => { S.sound = !S.sound; try { localStorage.setItem('atlas-sfx', S.sound ? '1' : '0'); } catch (e) {} save(); soundUI(); if (S.sound) sfx('select'); });
$('#tLang').onclick = () => { LANG = LANG === 'ja' ? 'en' : 'ja'; applyLang(); save(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const open = $$('.sheet:not(.hide)').filter(s => s.id !== 'scrDraft'); if (open.length) { open[open.length - 1].classList.add('hide'); return; } if (G && G.armed != null) { G.armed = null; render(); return; } if (G && (G.phase === 'battle' || G.phase === 'deploy')) $('#bMenu').click(); }
  if (e.key === 'Tab' && G && (G.phase === 'battle' || G.phase === 'over') && !G.busy) { e.preventDefault(); look(G.view ? 0 : 1, 800); }
  if (G && G.phase === 'battle' && !G.busy && G.st.turn === 0 && /^[1-6]$/.test(e.key)) { const b = $$('#dock .sk')[+e.key - 1]; if (b) b.click(); }
});
addEventListener('resize', () => { layoutPhone(); World.refit(); if (G && G.phase !== 'title') World.show(G.phase === 'draft' ? 'wide' : G.phase === 'over' && !$('#scrResult').classList.contains('hide') ? 'result' : G.view ? 'z1' : 'z0'); else World.show('title'); });
function applyLang() {
  document.documentElement.lang = LANG; $('#tLang').textContent = LANG === 'ja' ? 'EN' : 'JA';
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $('#helpBody').innerHTML = t('help').map(([h, p]) => `<div><b>${h}</b><p>${p}</p></div>`).join('');
  if (ND) renderSetup(); if (G && G.phase === 'draft') renderDraft(); else if (G && G.phase !== 'title') render();
  if (!$('#scrArchive').classList.contains('hide')) renderArchive();
  soundUI();
}

// ---------- boot ----------
function boot() {
  const T = window.THREE, test = document.createElement('canvas');
  if (!T || !(test.getContext('webgl2') || test.getContext('webgl'))) { $('#load').remove(); const n = $('#nogl'); n.classList.remove('hide'); n.innerHTML = `<div><div class="logo" style="font-size:44px">DREADNOUGHTS</div><p style="margin-top:18px;color:var(--mute)">${LANG === 'ja' ? 'このゲームには WebGL が必要です。' : 'This game needs WebGL.'}</p><p><a style="color:var(--gold)" href="../seabattle/">${LANG === 'ja' ? '2D版の海戦ゲームで遊ぶ' : 'Play the 2D Sea Battle'}</a></p></div>`; return; }
  World.init(cv, { safe: safeRect });
  applyLang();
  if (restore()) { phaseUI(); render(); World.refit(); World.sail(false); World.show(G.view ? 'z1' : 'z0'); if (G.phase === 'deploy') enterDeploy(); else if (G.phase === 'battle' && G.st.turn === 1) aiTurn(); else if (G.phase === 'over') showResult(); }
  else { G = newG({ phase: 'title' }); phaseUI(); syncWorld(); World.sail(true); World.show('title'); }
  setTimeout(() => { $('#load').classList.add('out'); setTimeout(() => $('#load').remove(), 900); }, 400);
  window.DN = { G: () => G, S, t, World, engage, startBattle, toTitle, render };
}
boot();
})();
