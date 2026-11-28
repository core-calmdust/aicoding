// 国標麻将（gbmj/）の画面：ホーム・対局（3D全自動卓＋手牌）・和了の内訳・対局設定・レート戦・戦績・番種図鑑。
// ルールと進行は game.js（GBRound / GBMatch）、番は fan.js、思考は ai.js、卓は ../mahjong/table3d.js（144枚・花牌・赤なし）。
(function () {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = GB.T;
const ME = 0;
const AUTO = /[?&]auto\b/.test(location.search);

// ---------------------------------------------------------------- 保存
const KEY = 'gbmj-v1';
const DB = (() => { let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {} return d; })();
DB.set = Object.assign({ lv: 6, len: 16, coach: true, tianjin: false, snd: true, lang: null }, DB.set || {});
DB.rate = Object.assign({ r: 1000, n: 0, w: 0, l: 0, d: 0, hist: [] }, DB.rate || {});
DB.tut = DB.tut || {}; DB.ls = DB.ls || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };

// ---------------------------------------------------------------- 言語
I18N.init(DB.set.lang);
const t = I18N.t, L = () => I18N.lang;
const fanName = id => I18N.fan(id);
const fanZh = id => GBFan.FANS[id][2];

// ---------------------------------------------------------------- レベルとレート（目盛り：Lv.1 300 → Lv.20 2100、運の要素が大きいゲームの幅）
const RT = lv => Math.round(300 + (lv - 1) * 1800 / 19);
const LEVELS = Array.from({ length: 20 }, (_, i) => [i + 1, RT(i + 1)]);

// ---------------------------------------------------------------- 音（小さな合成音だけ）
let AC = null;
function beep(f, d, v, type) {
  if (!DB.set.snd || document.hidden) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'triangle'; o.frequency.value = f; g.gain.value = v || .05; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {}
}
const SND = { tile: () => beep(1900, .05, .035, 'square'), call: () => { beep(660, .12, .06); setTimeout(() => beep(880, .14, .06), 90); }, win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .35, .07), i * 110)), warn: () => beep(220, .25, .07, 'sine') };
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });

// ---------------------------------------------------------------- アイコン
const IC = {
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  cup: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h7"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  tut: '<svg viewBox="0 0 24 24"><path d="M12 3L2 8l10 5 10-5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/></svg>',
  ls: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  net: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>',
};

// ---------------------------------------------------------------- 牌の絵（HTML）
const tileImg = (id, cls) => `<img class="tl ${cls || ''}" src="${MJTiles.urlId(id)}" alt="${GB.NAMES[T(id)]}" draggable="false">`;
const backImg = cls => `<span class="tl tlb ${cls || ''}"></span>`;
const typeImg = (t, cls) => /\bback\b/.test(cls || '') ? backImg(cls) : tileImg(t >= 34 ? 136 + t - 34 : t * 4 + 1, cls);
const parseTiles = s => { const out = []; let buf = []; for (const ch of String(s).replace(/\s+/g, '')) { if (/\d/.test(ch)) buf.push(+ch); else if ('mps'.includes(ch)) { const b = { m: 0, p: 9, s: 18 }[ch]; for (const n of buf) out.push(b + n - 1); buf = []; } else { const h = { E: 27, S: 28, W: 29, N: 30, P: 31, F: 32, C: 33 }[ch]; if (h != null) out.push(h); } } return out; };

// ---------------------------------------------------------------- モーダル
function modal(html, cls, bind) {
  const m = $('#modal'); m.className = 'modal show ' + (cls || ''); m.hidden = false;
  m.innerHTML = `<div class="mbox">${html}</div>`;
  if (TB) TB.quiet = true;
  if (bind) bind(m.firstChild);
  return m.firstChild;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.className = 'modal'; m.innerHTML = ''; if (TB) TB.quiet = false; }
function toast(s, ms) { const el = $('#toast'); el.textContent = s; el.classList.add('show'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.remove('show'), ms || 1600); }
function confirmBox(title, body, yes, no) {
  return new Promise(res => modal(`<h3>${esc(title)}</h3><p class="mb-p">${body}</p><div class="btns"><button class="btn" data-a="0">${esc(no || t('no'))}</button><button class="btn pri" data-a="1">${esc(yes || t('yes'))}</button></div>`, 'small', box => {
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { closeModal(); res(b.dataset.a === '1'); });
  }));
}

// ---------------------------------------------------------------- ホーム
function renderHome() {
  document.documentElement.lang = L(); document.documentElement.dir = L() === 'ar' ? 'rtl' : 'ltr';
  document.title = t('title') + '｜CALMDUST COLLECTION';
  $('#hmH1').textContent = t('title'); $('#hmSub').textContent = t('sub');
  $('#hmTiles').innerHTML = ['C', 'F', 'P'].map(x => typeImg(parseTiles(x)[0])).join('') + typeImg(34) + typeImg(38);
  $('#hmLang').innerHTML = IC.globe; $('#hmStats').innerHTML = IC.cup; $('#hmSet').innerHTML = IC.gear;
  const B = (id, ic, k, sub, dis) => `<button class="hm-b${dis ? ' dis' : ''}" id="${id}"${dis ? ' aria-disabled="true"' : ''}><i>${ic}</i><b>${esc(t(k))}</b><small>${esc(sub)}</small></button>`;
  const R = DB.rate, pl = window.Placement && Placement.on(R);
  $('#hmMenu').innerHTML = B('hbFree', IC.play, 'mFree', t('mFreeS', { lv: DB.set.lv })) + B('hbRated', IC.star, 'mRated', pl ? t('mRatedPl') : 'R ' + R.r)
    + B('hbTut', IC.tut, 'mTut', DB.tut.done ? t('done') : t('mTutS')) + B('hbDex', IC.book, 'mDex', t('mDexS'))
    + B('hbLs', IC.ls, 'mLs', window.GBLessons ? t('mLsS') : t('soon'), !window.GBLessons) + B('hbOn', IC.net, 'mOnline', t('soon'), true);
  $('#hmNote').textContent = t('homeNote');
  $('#hbFree').onclick = () => newGameDialog(false);
  $('#hbRated').onclick = () => newGameDialog(true);
  $('#hbTut').onclick = () => window.GBTutorial ? GBTutorial.open() : toast(t('soon'));
  $('#hbDex').onclick = () => openDex();
  $('#hbLs').onclick = () => window.GBLessons ? GBLessons.open() : toast(t('soon'));
  $('#hbOn').onclick = () => toast(t('onlineSoon'), 2400);
  $('#hmStats').onclick = () => GameRecord.open();
  $('#hmSet').onclick = () => settingsDialog();
  $('#hmLang').onclick = () => langDialog();
}
function langDialog() {
  modal(`<h3>${esc(t('lang'))}</h3><div class="langs">${I18N.LANGS.map(([k, n]) => `<button class="lg${k === L() ? ' on' : ''}" data-l="${k}">${esc(n)}</button>`).join('')}</div><div class="btns"><button class="btn" data-x>${esc(t('close'))}</button></div>`, 'small', box => {
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { DB.set.lang = b.dataset.l; save(); I18N.set(b.dataset.l); closeModal(); renderHome(); if (G) renderAll(); });
    box.querySelector('[data-x]').onclick = closeModal;
  });
}
function settingsDialog() {
  const sw = (k, on) => `<label class="row"><span>${esc(t(k))}</span><button class="sw${on ? ' on' : ''}" data-k="${k}" role="switch" aria-checked="${on}"><i></i></button></label>`;
  modal(`<h3>${esc(t('settings'))}</h3>${sw('sSound', DB.set.snd)}${sw('sCoach', DB.set.coach)}<label class="row"><span>${esc(t('lang'))}</span><button class="btn sm" data-lang>${esc(I18N.LANGS.find(x => x[0] === L())[1])}</button></label><div class="btns"><button class="btn" data-x>${esc(t('close'))}</button></div>`, 'small', box => {
    box.querySelectorAll('.sw').forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); if (b.dataset.k === 'sSound') DB.set.snd = on; else { DB.set.coach = on; renderCoach(); } save(); });
    box.querySelector('[data-lang]').onclick = langDialog;
    box.querySelector('[data-x]').onclick = closeModal;
  });
}

// ---------------------------------------------------------------- 対局設定（ゲーム｜ルール）
function newGameDialog(rated) {
  let tab = 'game', lv = DB.set.lv, len = DB.set.len, tj = DB.set.tianjin;
  const R = DB.rate;
  const box = modal(`<div class="ng"><h3>${esc(t(rated ? 'mRated' : 'mFree'))}</h3>
    <div class="ng-tabs"><button data-tab="game">${esc(t('tGame'))}</button><button data-tab="rule">${esc(t('tRule'))}</button></div>
    <div class="ng-body">
      <div class="ng-pane" data-pane="game"></div>
      <div class="ng-pane" data-pane="rule"></div>
    </div>
    <div class="btns"><button class="btn" data-x>${esc(t('close'))}</button><button class="btn pri" data-go>${esc(t('start'))}</button></div></div>`, 'ngm');
  const paint = () => {
    box.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    box.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== tab);
    const G1 = box.querySelector('[data-pane=game]');
    if (rated) {
      const pl = window.Placement && Placement.on(R);
      G1.innerHTML = `<div class="ng-card"><b class="big">R ${R.r}</b>${pl ? Placement.badge(R) + Placement.note(R) : ''}<p>${esc(t('ratedNote'))}</p></div>
        <div class="ng-card"><span class="lab">${esc(t('length'))}</span><div class="seg"><button class="on">${esc(t('hands', { n: 8 }))}</button></div><p class="dim">${esc(t('ratedFixed'))}</p></div>`;
    } else {
      G1.innerHTML = `<div class="ng-card"><span class="lab">${esc(t('opp'))}</span>
        <div class="lv"><button class="btn sm" data-d="-1">−</button><input type="range" min="1" max="20" value="${lv}" id="ngLv"><button class="btn sm" data-d="1">＋</button></div>
        <div class="lv-n"><b id="ngLvN">Lv.${lv}</b><small id="ngLvR">${esc(t('rating'))} ${RT(lv)}</small><span id="ngLvD">${esc(t('lvDesc' + Math.min(5, Math.ceil(lv / 4))))}</span></div></div>
        <div class="ng-card"><span class="lab">${esc(t('length'))}</span><div class="seg">${[4, 8, 16].map(n => `<button data-len="${n}" class="${n === len ? 'on' : ''}">${esc(t('hands', { n }))}</button>`).join('')}</div><p class="dim">${esc(t('lenNote'))}</p></div>
        <div class="ng-card wide"><span class="lab">${esc(t('tiersT'))}</span><ul class="tiers">${[1, 2, 3, 4, 5].map(k => `<li data-tier="${k}"><b>Lv.${(k - 1) * 4 + 1}〜${k * 4}</b>${esc(t('lvDesc' + k))}</li>`).join('')}<li><b>${esc(t('rating'))}</b>${esc(t('rateScale'))}</li></ul></div>`;
      const inp = G1.querySelector('#ngLv');
      const upd = () => { G1.querySelector('#ngLvN').textContent = 'Lv.' + lv; G1.querySelector('#ngLvR').textContent = t('rating') + ' ' + RT(lv); G1.querySelector('#ngLvD').textContent = t('lvDesc' + Math.min(5, Math.ceil(lv / 4))); inp.value = lv; G1.querySelectorAll('[data-tier]').forEach(li => li.classList.toggle('on', +li.dataset.tier === Math.min(5, Math.ceil(lv / 4)))); };
      inp.oninput = () => { lv = +inp.value; upd(); };
      upd();
      G1.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { lv = Math.max(1, Math.min(20, lv + +b.dataset.d)); upd(); });
      G1.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { len = +b.dataset.len; G1.querySelectorAll('[data-len]').forEach(x => x.classList.toggle('on', x === b)); });
    }
    const R1 = box.querySelector('[data-pane=rule]');
    R1.innerHTML = `<div class="ng-card"><label class="row"><span><b>${esc(t('tjName'))}</b></span><button class="sw${tj && !rated ? ' on' : ''}${rated ? ' dis' : ''}" id="ngTj" role="switch"><i></i></button></label><p>${esc(t('tjDesc'))}</p>${rated ? `<p class="dim">${esc(t('tjRated'))}</p>` : ''}</div>
      <div class="ng-card"><b>${esc(t('ruleBase'))}</b><p>${esc(t('ruleBaseDesc'))}</p></div>`;
    const sw = R1.querySelector('#ngTj'); if (!rated) sw.onclick = () => { tj = !tj; sw.classList.toggle('on', tj); };
  };
  box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; paint(); });
  box.querySelector('[data-x]').onclick = closeModal;
  box.querySelector('[data-go]').onclick = () => {
    if (!rated) { DB.set.lv = lv; DB.set.len = len; DB.set.tianjin = tj; save(); }
    closeModal();
    if (rated && window.Placement && Placement.needAsk(R)) Placement.gate(R, save, () => startMatch({ rated: true }));
    else startMatch({ rated });
  };
  paint();
}

// ---------------------------------------------------------------- 対局
let TB = null, G = null, M = null, R0 = null, UI = null;
function ensureTable() {
  if (TB) { TB.resume && TB.resume(); return; }
  TB = new Table3D($('#stage'), { tiles: 144, red: false, ankanDown: 4 });
  TB.doraFn = () => false;
  TB.onTileLand = () => SND.tile();
  TB.setQuality && TB.setQuality('high');
  TB.warm && TB.warm();
  MJTiles.ready().then(() => { MJTiles.reset(); if (TB.shots) TB.shots.clear(); TB.refaces && TB.refaces(); TB.dirty = true; renderHand(); });
}
async function startMatch(o) {
  const rated = !!o.rated;
  let lv = DB.set.lv, len = DB.set.len, plPick = null;
  if (rated) {
    len = 8;
    if (window.Placement && Placement.on(DB.rate)) { plPick = Placement.pick(DB.rate, LEVELS); lv = plPick.lv; }
    else { let b = LEVELS[0]; for (const x of LEVELS) if (Math.abs(x[1] - DB.rate.r) < Math.abs(b[1] - DB.rate.r)) b = x; lv = b[0]; }
  }
  $('#home').hidden = true; $('#game').hidden = false;
  ensureTable();
  requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  TB.hideAll();
  GBFan.OPTS.tianjin = rated ? false : !!DB.set.tianjin;
  M = new GBMatch({ hands: len, dealer0: Math.floor(Math.random() * 4) });
  UI = { rated, lv, plPick, bots: [null, 1, 2, 3].map((x, i) => i ? GBAI.create({ level: lv }) : null), coachBot: GBAI.create({ level: 16 }), autoBot: GBAI.create({ level: 10 }), stop: false, wait: null, sel: null };
  G = M;
  renderAll();
  while (!M.over && !UI.stop) {
    const r = M.nextRound(); R0 = r;
    TB.hideAll();
    renderAll(true);
    await sleep(500);
    await playRound(r);
    if (UI.stop) return;
    M.finishRound(r);
    renderAll();
    await showResult(r);
    if (UI.stop) return;
  }
  if (!UI.stop) await showFinal();
}
const name = p => p === ME ? t('you') : t('cpu', { n: p }) + ' Lv.' + UI.lv;
async function until(f) { while (!f()) await sleep(120); }
async function botWait(ms) { await sleep(AUTO ? 30 : ms); await until(() => !document.hidden); }

async function playRound(r) {
  let seen = 0;
  for (;;) {
    // 起きた出来事を画面へ
    while (seen < r.events.length) { await showEvent(r, r.events[seen++]); if (UI.stop) return; }
    if (r.phase === 'end') return;
    const ws = r.waiting();
    // CPU を先に（ロンがあれば人の鳴きは不要になることがある）
    for (const p of ws.filter(x => x !== ME)) {
      if (r.phase === 'end' || !r.waiting().includes(p)) continue;
      if (UI.tut) { await UI.tut.gate(r, p); if (UI.stop) return; }
      if (r.phase === 'turn') await botWait(UI.tut ? 700 : 420 + Math.random() * 380);
      const a = (UI.tut && UI.tut.botAct(r, p)) || UI.bots[p].decide(r, p, r.options(p));
      r.act(p, a);
    }
    if (r.phase !== 'end' && r.waiting().includes(ME)) {
      if (UI.tut) { await UI.tut.gate(r, ME); if (UI.stop) return; }
      const a = AUTO && !UI.tut ? UI.autoBot.decide(r, ME, r.options(ME)) : await humanAct(r);
      if (UI.stop) return;
      if (UI.tut && !UI.tut.allow(r, a)) continue;
      if (a.type === 'hu' && a.low) { const ok = AUTO ? false : await confirmBox(t('lowTitle'), esc(t('lowBody', { n: a.pts })), t('lowYes'), t('cancel')); if (!ok) continue; }
      r.act(ME, a);
    }
  }
}
async function showEvent(r, e) {
  switch (e.ev) {
    case 'deal': renderAll(true); break;
    case 'draw': renderAll(); break;
    case 'flower': if (!e.deal) { toast(t('flowerToast', { who: name(e.p) }), 900); SND.call(); } renderAll(); if (!e.deal) await sleep(250); break;
    case 'discard': renderAll(false, e.p); await sleep(UI.tut ? 1000 : AUTO ? 10 : 260); break;
    case 'chi': case 'pon': case 'kan': case 'kong': case 'kakan': SND.call(); shout(e.p, t('call_' + (e.ev === 'kong' ? 'kan' : e.ev === 'kakan' ? 'kan' : e.ev))); renderAll(); await sleep(AUTO ? 10 : 420); break;
    case 'falsehu': SND.warn(); shout(e.p, t('falseHu')); toast(t('falseHuToast', { who: name(e.p), n: e.pts }), 2600); renderAll(); await sleep(900); break;
    case 'win': SND.win(); shout(e.p, e.how === 'tsumo' ? t('tsumo') : t('ron')); renderAll(); await sleep(AUTO ? 50 : 900); break;
    case 'exhaust': shout(-1, t('exhaust')); await sleep(AUTO ? 50 : 900); break;
  }
}
function shout(p, s) {
  const el = document.createElement('div'); el.className = 'shout s' + (p < 0 ? 'c' : p); el.textContent = s;
  $('#game').appendChild(el); setTimeout(() => el.remove(), 1200);
}

// ---------------------------------------------------------------- 描画
function tbMeld(m) {
  return { type: m.k === 'minkan' ? 'minkan' : m.k, tiles: m.ids.slice(), from: m.from, called: m.k === 'ankan' ? null : (m.got != null ? m.got : null), added: m.k === 'kakan' ? m.ids[m.ids.length - 1] : null };
}
function renderAll(fresh, discarder) {
  if (!R0 || !TB) { renderHand(); return; }
  const r = R0;
  for (let s = 0; s < 4; s++) {
    const P = r.P[s];
    const end = r.phase === 'end';
    if (s !== ME) TB.layoutHand(s, P.hand.slice().sort((a, b) => a - b), null, end && r.result && r.result.type === 'win' && r.result.p === s);
    TB.layoutRiver(s, P.discards.map(d => ({ id: d.id, taken: d.claimed })), discarder === s, null);
    TB.layoutMelds(s, P.melds.map(tbMeld));
    TB.layoutFlowers(s, P.flowers);
  }
  if (r.robTile != null && r.phase === 'rob') { const g = TB.tile(r.robTile); TB.place(g, r.robber, 0, 6.2, 'flat'); g.visible = true; }
  TB.setInfo({ round: r.wind, kyoku: r.no % 4, honba: 0, kyotaku: 0, left: r.left(), scores: M.scores.slice(), dealer: r.dealer, turn: r.phase === 'end' ? -1 : r.cur });
  TB.dirty = true;
  renderSeats(); renderHand(); renderCoach(); renderInfo();
}
function renderInfo() {
  const r = R0; if (!r) return;
  $('#gInfo').innerHTML = `<b>${esc(t('roundName', { w: t('wind' + r.wind), n: r.no % 4 + 1 }))}</b><span>${esc(t('handNo', { n: r.no + 1, of: M.hands }))}</span>${UI.rated ? `<em class="tag">${esc(t('mRated'))}</em>` : ''}${GBFan.OPTS.tianjin ? `<em class="tag">${esc(t('tjShort'))}</em>` : ''}`;
  $('#gFan').innerHTML = IC.book; $('#gStats').innerHTML = IC.cup; $('#gSet').innerHTML = IC.gear; $('#gExit').innerHTML = IC.exit;
}
function renderSeats() {
  const r = R0; if (!r) return;
  $('#seats').innerHTML = [0, 1, 2, 3].map(s => {
    const P = r.P[s], w = r.seatWind(s);
    return `<div class="seat st${s}${r.cur === s && r.phase !== 'end' ? ' on' : ''}"><i class="wd${w === 0 ? ' e' : ''}">${esc(t('windS' + w))}</i><span class="nm">${esc(name(s))}</span><b class="sc">${M.scores[s]}</b>${P.flowers.length ? `<span class="fl">${esc(t('flowersN', { n: P.flowers.length }))}</span>` : ''}${P.dead ? `<span class="dead">${esc(t('dead'))}</span>` : ''}</div>`;
  }).join('');
}
// 自分の手牌（HTML）
function renderHand() {
  const el = $('#hand'), acts = $('#acts');
  if (!R0) { el.innerHTML = ''; acts.innerHTML = ''; return; }
  const r = R0, P = r.P[ME];
  const drawn = r.phase === 'turn' && r.cur === ME && r.drawn != null && P.hand.includes(r.drawn) ? r.drawn : null;
  const ids = P.hand.filter(id => id !== drawn).sort((a, b) => a - b);
  const myTurn = r.phase === 'turn' && r.cur === ME && UI.wait;
  const rec = myTurn && DB.set.coach && !UI.rated && !UI.tut && UI.coach && UI.coach.discards[0] ? UI.coach.discards[0].t : null;
  const showAll = r.phase === 'end' && r.result && r.result.type === 'win' && r.result.p === ME;
  el.innerHTML = ids.map(id => `<button class="ht${myTurn ? ' can' : ''}${T(id) === rec ? ' rec' : ''}" data-id="${id}">${tileImg(id)}</button>`).join('') + (drawn != null ? `<span class="gap"></span><button class="ht dr${myTurn ? ' can' : ''}${T(drawn) === rec ? ' rec' : ''}" data-id="${drawn}">${tileImg(drawn)}</button>` : '');
  el.classList.toggle('my', !!myTurn); el.classList.toggle('done', !!showAll);
  el.querySelectorAll('.ht').forEach(b => {
    b.onclick = () => { if (!UI.wait || UI.wait.kind !== 'turn') return; const id = +b.dataset.id; UI.wait.done({ type: 'discard', id }); };
    b.onmouseenter = () => { if (TB) TB.highlightType(T(+b.dataset.id)); };
    b.onmouseleave = () => { if (TB) TB.highlightType(null); };
  });
  renderActs();
}
function renderActs() {
  const acts = $('#acts'); const w = UI && UI.wait;
  if (!w) { acts.innerHTML = ''; return; }
  const B = (a, label, cls, sub) => `<button class="act ${cls}" data-a='${JSON.stringify(a)}'><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  let h = '';
  for (const o of w.opts) {
    if (o.type === 'hu') h += B({ type: 'hu' }, w.kind === 'turn' ? t('tsumo') : t('ron'), o.low ? 'warn' : 'win', o.low ? t('lowShort', { n: o.pts }) : t('ptsN', { n: o.pts }));
    else if (o.type === 'pon') h += B(o, t('call_pon'), 'call');
    else if (o.type === 'kan') h += B(o, t('call_kan'), 'call');
    else if (o.type === 'chi') h += B(o, t('call_chi'), 'call', GB.NAMES[o.t] + GB.NAMES[o.t + 1] + GB.NAMES[o.t + 2]);
    else if (o.type === 'ankan' || o.type === 'kakan') h += B(o, t(o.type === 'ankan' ? 'ankan' : 'kakan'), 'call', GB.NAMES[o.t]);
  }
  if (w.kind === 'claim') h += B({ type: 'pass' }, t('pass'), 'pass');
  acts.innerHTML = h;
  acts.querySelectorAll('.act').forEach(b => b.onclick = () => { const a = JSON.parse(b.dataset.a); const o = w.opts.find(x => x.type === a.type && (a.t === undefined || x.t === a.t)) || a; w.done(o); });
}
function humanAct(r) {
  return new Promise(res => {
    const opts = r.options(ME);
    const kind = r.phase === 'turn' ? 'turn' : 'claim';
    UI.wait = { kind, opts: opts.filter(o => o.type !== 'discard'), done: a => { UI.wait = null; renderHand(); res(a); } };
    if (kind === 'claim') { const tl = TB.tile(r.phase === 'rob' ? r.robTile : r.discard); TB.setTileLook(tl, 'hi'); TB.dirty = true; }
    UI.coach = DB.set.coach && !UI.rated ? UI.coachBot.analyze(r, ME) : null;
    renderHand(); renderCoach();
    if (UI.tut) UI.tut.waiting(r);
  });
}

// ---------------------------------------------------------------- コーチ（目標の番・向聴数・聴牌の待ちと点）
function renderCoach() {
  const el = $('#coach');
  if (!R0 || !UI || !DB.set.coach || UI.rated) { el.hidden = true; return; }
  const r = R0, P = r.P[ME];
  el.hidden = false;
  const melds = r.meldsOf(ME);
  const types = P.hand.map(T);
  let sum = '';
  let h = `<h4>${esc(t('coach'))}<small data-sum></small></h4>`;
  if (P.hand.length % 3 === 1) {
    const sh = GB.shanten(GB.counts(types), melds.length);
    if (sh === 0) {
      const ws = GBFan.waits(types, melds.length);
      h += `<p class="ck-l"><b>${esc(t('tenpai'))}</b></p><div class="ck-w">` + ws.map(w => {
        const res = GBFan.calc({ melds, hand: types, win: w, tsumo: false, flowers: P.flowers.length, seat: r.seatWind(ME), round: r.wind });
        const ok = res.ok && res.pts >= 8;
        return `<span class="wt${ok ? '' : ' low'}">${typeImg(w, 'mini')}<b>${res.ok ? res.pts : 0}</b></span>`;
      }).join('') + `</div>` + (ws.some(w => { const x = GBFan.calc({ melds, hand: types, win: w, tsumo: false, flowers: 0, seat: r.seatWind(ME), round: r.wind }); return !x.ok || x.pts < 8; }) ? `<p class="ck-warn">${esc(t('lowWaitWarn'))}</p>` : '');
    } else h += `<p class="ck-l">${esc(t('shantenN', { n: sh }))}</p>`;
    sum = sh === 0 ? t('ready') : t('shantenN', { n: sh });
  } else if (UI.coach) {
    const c = UI.coach;
    h += `<p class="ck-l">${esc(t('shantenN', { n: Math.max(0, c.shanten) }))}</p>`;
    sum = t('shantenN', { n: Math.max(0, c.shanten) });
    if (c.discards[0] && !UI.tut) h += `<p class="ck-rec">${esc(t('recDiscard'))} ${typeImg(c.discards[0].t, 'mini')}</p>`;
  }
  const key = P.hand.join() + '|' + P.melds.length;
  if (!UI.coach && UI.ckKey !== key) { UI.ckKey = key; UI.ckPlans = UI.coachBot.analyze(r, ME); }
  const a = UI.coach || UI.ckPlans;
  if (a && a.plans.length) h += `<p class="ck-h">${esc(t('targets'))}</p><ul class="ck-p">${a.plans.map(p => `<li><b>${esc(fanName(p.fan))}</b><span>${p.pts}${esc(t('ptsUnit'))}</span><em>${esc(p.d <= 0 ? t('ready') : t('awayN', { n: p.d }))}</em></li>`).join('')}</ul>`;
  el.innerHTML = h;
  el.querySelector('[data-sum]').textContent = sum;
  el.querySelector('h4').onclick = () => el.classList.toggle('open');
}

// ---------------------------------------------------------------- 和了・流局の結果
function fanTable(fr) {
  const rows = fr.fans.filter(f => f.id !== 81).map(f => `<tr><td class="fn">${esc(fanName(f.id))}${L() !== 'zh' && L() !== 'zh-TW' && L() !== 'ja' ? `<small>${esc(fanZh(f.id))}</small>` : ''}</td><td class="fx">${f.n > 1 ? '×' + f.n : ''}</td><td class="fp">${f.p * f.n}</td></tr>`).join('');
  const fl = fr.flowers ? `<tr class="flw"><td class="fn">${esc(fanName(81))}</td><td class="fx">×${fr.flowers}</td><td class="fp">${fr.flowers}</td></tr>` : '';
  return `<table class="fans"><tbody>${rows}${fl}</tbody><tfoot><tr><td>${esc(t('total'))}</td><td></td><td class="fp">${fr.total}</td></tr></tfoot></table>`;
}
function handRowHtml(r, p, winId) {
  const P = r.P[p];
  const hand = P.hand.filter(id => id !== winId).sort((a, b) => a - b);
  const melds = P.melds.map(m => `<span class="ml">${m.ids.map(id => m.k === 'ankan' ? backImg() : tileImg(id)).join('')}</span>`).join('');
  return `<div class="rhand">${hand.map(id => tileImg(id)).join('')}<span class="gap"></span>${tileImg(winId, 'win')}${melds}${P.flowers.length ? `<span class="ml fl">${P.flowers.map(id => tileImg(id)).join('')}</span>` : ''}</div>`;
}
function showResult(r) {
  return new Promise(res => {
    const x = r.result;
    const pay = `<div class="pays">${[0, 1, 2, 3].map(s => `<div class="pay${x.pay[s] > 0 ? ' up' : x.pay[s] < 0 ? ' dn' : ''}"><span>${esc(name(s))}</span><b>${x.pay[s] > 0 ? '+' : ''}${x.pay[s]}</b><small>${M.scores[s]}</small></div>`).join('')}</div>`;
    let h;
    if (x.type === 'win') {
      const how = x.how === 'tsumo' ? t('byTsumo') : x.how === 'rob' ? t('byRob', { from: name(x.from) }) : t('byRon', { from: name(x.from) });
      h = `<div class="res"><h3>${esc(t('winTitle', { who: name(x.p) }))}</h3><p class="how">${esc(how)}</p>${handRowHtml(r, x.p, x.winId)}${fanTable(x.fan)}<p class="dim">${esc(x.how === 'tsumo' ? t('payTsumo', { n: x.fan.total }) : t('payRon', { n: x.fan.total }))}</p>${pay}`;
    } else h = `<div class="res"><h3>${esc(t('exhaust'))}</h3><p class="how">${esc(t('exhaustNote'))}</p>${pay}`;
    h += UI.tut ? `<div class="btns"><button class="btn pri" data-ok>${esc(t('next'))}</button></div></div>` : `<div class="btns"><button class="btn pri" data-ok>${esc(M.over ? t('seeFinal') : t('nextHand'))}</button></div></div>`;
    modal(h, 'resm', box => { box.querySelector('[data-ok]').onclick = () => { if (UI.tut) { UI.tut.next(); return; } closeModal(); res(); }; if (AUTO && !/[?&]hold/.test(location.search)) setTimeout(() => { if (!$('#modal').hidden) { closeModal(); res(); } }, 400); });
  });
}
function showFinal() {
  return new Promise(res => {
    const ranks = M.ranks(), tp = M.tablePoints();
    const order = [0, 1, 2, 3].sort((a, b) => ranks[a] - ranks[b]);
    const myRank = ranks[ME];
    let rateHtml = '';
    const resCode = myRank === 1 ? 'w' : myRank === 4 ? 'l' : 'd';
    if (UI.rated) {
      const S = DB.rate, or = RT(UI.lv), s = [1, .67, .33, 0][myRank - 1];
      if (UI.plPick) { const x = Placement.record(S, or, s >= .5 ? 1 : 0); S.r = x.r; rateHtml = Placement.resHtml(x); if (x.final) Placement.reveal(S, null, 1200); }
      else { const E = 1 / (1 + Math.pow(10, (or - S.r) / 400)); const d = Math.round(32 * (s - E)); S.r += d; rateHtml = `<span class="rt-res">R <b>${S.r}</b> (${d >= 0 ? '+' : ''}${d})</span>`; }
      S.n++; if (resCode === 'w') S.w++; else if (resCode === 'l') S.l++; else S.d++;
      S.hist.push(S.r); if (S.hist.length > 100) S.hist.shift();
      save();
    }
    try { GameRecord.add({ mode: UI.rated ? 'rated' : 'ai', res: resCode, side: 0, opp: 'AI Lv.' + UI.lv, key: 'ai:' + UI.lv, n: M.hands, why: t('rankN', { n: myRank }) }); } catch (e) {}
    const h = `<div class="res"><h3>${esc(t('finalTitle'))}</h3><div class="final">${order.map(s => `<div class="fr${s === ME ? ' me' : ''}"><b class="rk">${ranks[s]}</b><span>${esc(name(s))}</span><em>${M.scores[s]}</em><small>${esc(t('tableP', { n: tp[s] }))}</small></div>`).join('')}</div>${rateHtml ? `<p class="rate">${rateHtml}</p>` : ''}
      <div class="btns"><button class="btn" data-home>${esc(t('toHome'))}</button><button class="btn pri" data-again>${esc(t('again'))}</button></div></div>`;
    modal(h, 'resm', box => {
      box.querySelector('[data-home]').onclick = () => { closeModal(); exitGame(); res(); };
      box.querySelector('[data-again]').onclick = () => { closeModal(); res(); startMatch({ rated: UI.rated }); };
    });
  });
}
// チュートリアル（tutorial.js）：決まった配牌の1局を、台本どおりの CPU と打つ
async function startTutorial(T) {
  if (UI) UI.stop = true;
  $('#home').hidden = true; $('#game').hidden = false;
  ensureTable();
  requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  TB.hideAll();
  GBFan.OPTS.tianjin = false;
  M = new GBMatch({ hands: 1, dealer0: 0 });
  UI = { rated: false, lv: 6, tut: T, bots: [null, 1, 2, 3].map((x, i) => i ? GBAI.create({ level: 6, seed: i }) : null), coachBot: GBAI.create({ level: 16 }), autoBot: GBAI.create({ level: 10 }), stop: false, wait: null };
  G = M;
  const r = T.makeRound(); R0 = r; M.round = r;
  const coach0 = DB.set.coach; DB.set.coach = true;
  renderAll(true);
  await sleep(600);
  T.begin();
  await playRound(r);
  DB.set.coach = coach0;
  if (UI.stop) return;
  M.finishRound(r); renderAll();
  await new Promise(res => { showResult(r).then(res); T.result(); });
}
function exitGame() {
  if (UI && UI.tut) UI.tut.stop();
  if (UI) { UI.stop = true; if (UI.wait) { const w = UI.wait; UI.wait = null; w.done({ type: 'pass' }); } }
  R0 = null; G = null;
  if (TB) { TB.hideAll(); TB.pause && TB.pause(); }
  $('#game').hidden = true; $('#home').hidden = false; renderHome();
}

// ---------------------------------------------------------------- 番種図鑑（81番、例の手牌つき）
function dexHand(e) {
  const melds = (e.melds || []).map(([k, s]) => { const tt = parseTiles(s)[0]; const ts = k === 'chi' ? [tt, tt + 1, tt + 2] : k === 'pon' ? [tt, tt, tt] : [tt, tt, tt, tt]; return `<span class="ml">${ts.map(x => typeImg(x, 'mini' + (k === 'ankan' ? ' back' : ''))).join('')}</span>`; }).join('');
  return `<div class="dx-hand">${parseTiles(e.hand).map(x => typeImg(x, 'mini')).join('')}<span class="gap"></span>${typeImg(parseTiles(e.win)[0], 'mini win')}${melds}${e.flowers ? `<span class="ml">${[34, 35].slice(0, e.flowers).map(x => typeImg(x, 'mini')).join('')}</span>` : ''}</div>`;
}
const DEX_TABS = [[88, 64], [48, 32, 24], [16, 12, 8], [6, 4, 2], [1]];
function openDex(sel) {
  let tab = 0;
  if (sel) tab = DEX_TABS.findIndex(g => g.includes(GBFan.FANS[sel][1]));
  const box = modal(`<div class="dex"><h3>${esc(t('mDex'))}</h3><p class="dim">${esc(t('dexNote'))}</p><div class="dx-tabs">${DEX_TABS.map((g, i) => `<button data-i="${i}">${g.map(x => x + t('ptsUnit')).join(' · ')}</button>`).join('')}</div><div class="dx-list"></div><div class="btns"><button class="btn" data-x>${esc(t('close'))}</button></div></div>`, 'dexm');
  const paint = () => {
    box.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === tab));
    const ids = []; for (let id = 1; id <= 81; id++) if (DEX_TABS[tab].includes(GBFan.FANS[id][1])) ids.push(id);
    const list = box.querySelector('.dx-list');
    list.innerHTML = ids.map(id => { const e = GBFandex[id]; return `<div class="dx-c" id="dx${id}"><div class="dx-h"><b class="no">${id}</b><b class="nm">${esc(fanName(id))}</b><small class="zh">${esc(fanZh(id))}</small><span class="pt">${GBFan.FANS[id][1]}${esc(t('ptsUnit'))}</span></div><p>${esc(I18N.fanDesc(id))}</p>${dexHand(e)}</div>`; }).join('');
    list.scrollTop = 0;
    if (sel) { const c = box.querySelector('#dx' + sel); if (c) { c.classList.add('hi'); c.scrollIntoView({ block: 'center' }); } sel = null; }
  };
  box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { tab = +b.dataset.i; paint(); });
  box.querySelector('[data-x]').onclick = closeModal;
  paint();
}
window.GBDBG = () => R0 ? `${R0.phase} cur=${R0.cur} left=${R0.left()} ev=${R0.events.length} wait=${R0.waiting()} uiwait=${UI && UI.wait ? UI.wait.kind : ''}` : 'none';
window.GBApp = { startTutorial, exitGame, get R() { return R0; }, get UI() { return UI; }, renderAll, openDex, modal, closeModal, toast, tileImg, typeImg, parseTiles, t: (...a) => t(...a), esc, save, DB, ensureTable, get TB() { return TB; }, renderHome };

// ---------------------------------------------------------------- ボタン・起動
$('#gExit').onclick = async () => { if (await confirmBox(t('exitTitle'), esc(t('exitBody')), t('exitYes'), t('cancel'))) exitGame(); };
$('#gFan').onclick = () => openDex();
$('#gStats').onclick = () => GameRecord.open();
$('#gSet').onclick = () => settingsDialog();
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden && $('#modal .btns [data-x]')) closeModal(); });
GameRecord.init({ game: 'gbmj', lang: () => L() });
if (window.Placement) Placement.setLang(() => L());
renderHome();
MJTiles.ready().then(() => { MJTiles.reset(); if ($('#home').hidden === false) renderHome(); });
const q = new URLSearchParams(location.search);
if (q.get('len')) DB.set.len = +q.get('len');
if (q.get('lv')) DB.set.lv = +q.get('lv');
if (q.get('go') === 'free') startMatch({ rated: false });
else if (q.get('go') === 'rated') startMatch({ rated: true });
else if (q.get('go') === 'dex') openDex();
else if (q.get('go') === 'tut') addEventListener('load', () => window.GBTutorial && GBTutorial.open());
})();
