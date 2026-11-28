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
const FAST = AUTO && !/[?&]slow\b/.test(location.search);   // 自動対局の確認：slow なら普段の速さで

// ---------------------------------------------------------------- スマホはいつも横向きの配置（縦に持つと #root を90°回す。リーチ麻雀と同じ）
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
function fitRoot() {
  const w = innerWidth, h = innerHeight, de = document.documentElement, rot = PHONE && h > w;
  de.classList.toggle('lp', PHONE); de.classList.toggle('rot', rot);
  de.style.setProperty('--W', (rot ? h : w) + 'px'); de.style.setProperty('--H', (rot ? w : h) + 'px');
  // PC：riichi/（mahjong/app.js fitRoot）と同じ目盛り。対局の HUD は大きな窓で --hz 倍に育つ
  de.classList.toggle('ds', !PHONE);
  if (!PHONE) {
    const GW = Math.min(w, h * 2.4), GH = Math.min(h, w / 1.36);
    de.style.setProperty('--hz', Math.max(1, Math.min(2, Math.min(h, w / 1.36) / 860)).toFixed(3));
    de.style.setProperty('--SW', GW + 'px'); de.style.setProperty('--SH', GH + 'px'); de.style.setProperty('--Z', Math.max(.5, Math.min(GW / 1280, GH / 760, 1.6)));
    de.style.setProperty('--MZ', Math.max(1, Math.min((w - 40) / 1100, (h - 40) / 700, 1.6)).toFixed(3));
    de.style.setProperty('--SX', ((w - GW) / 2) + 'px'); de.style.setProperty('--SY', ((h - GH) / 2) + 'px');
  }
}
fitRoot(); addEventListener('resize', fitRoot);
// 画面の長方形を、回した #root の中の座標で（PC はそのまま）
function uiRect(el) { const r = el.getBoundingClientRect(); if (!document.documentElement.classList.contains('rot')) return { l: r.left, t: r.top, r: r.right, b: r.bottom };
  return { l: r.top, t: innerWidth - r.right, r: r.bottom, b: innerWidth - r.left }; }

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

// ---------------------------------------------------------------- 音：大百科のリーチ麻雀と同じ録音・BGM・音量（snd.js、mahjong/app.js の SND を写したもの）
const SND = GBSnd(() => DB.set);
addEventListener('load', () => setTimeout(() => SND.preload(), 400));
// 窓が前にないときは音も止める（shared/focusgate.js が止めた時：リーチ麻雀と同じ）
{ let fz = false; setInterval(() => { const f = !!(window.__focusGate && window.__focusGate.frozen); if (f === fz) return; fz = f; SND.gate(f); }, 200); }
for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => { SND.unlock(); SND.revive(); }, true);
// ボタンの音（リーチ麻雀の pick と同じ短い音）
document.addEventListener('click', e => { if (e.target.closest('.btn, .hm-b, .ib, .ng-tabs button, .seg button, .dx-tabs button, .lg, .sw')) SND.pick(); }, true);

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
  snd: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
};

// ---------------------------------------------------------------- 牌の絵（HTML）
const tileImg = (id, cls) => `<img class="gt ${cls || ''}" src="${MJTiles.urlId(id)}" alt="${GB.NAMES[T(id)]}" draggable="false">`;
const backImg = cls => `<span class="gt gtb ${cls || ''}"></span>`;
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
  return new Promise(res => modal(`<h3>${esc(title)}</h3><p class="mb-p">${body}</p><div class="btns"><button class="btn" data-a="0">${esc(no || t('no'))}</button><button class="btn pri gold" data-a="1">${esc(yes || t('yes'))}</button></div>`, 'small', box => {
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
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = async () => { const l = b.dataset.l; await I18N.load(l); DB.set.lang = l; save(); I18N.set(l); closeModal(); renderHome(); if (G) renderAll(); if (window.GBTutorial && GBTutorial.relang) GBTutorial.relang(); });
    box.querySelector('[data-x]').onclick = closeModal;
  });
}
function settingsDialog() {
  // 音：効果音と BGM それぞれの音量（0〜100、既定 80）とミュート（リーチ麻雀と同じ扱い・同じ保存の名前）
  const sw = (k, on) => `<label class="row"><span>${esc(t(k))}</span><button class="sw${on ? ' on' : ''}" data-k="${k}" role="switch" aria-checked="${on}"><i></i></button></label>`;
  const vrow = k => { const off = DB.set[k + 'On'] === false || DB.set.snd === false, v = SND.volP(k);
    return `<div class="row st-vol${off ? ' off' : ''}"><span>${esc(t(k === 'se' ? 'sSound' : 'sMusic'))}</span><div class="st-v"><button class="st-m" data-m="${k}" aria-label="${esc(t('sMute'))}" title="${esc(t('sMute'))}">${off ? IC.mute : IC.snd}</button><input type="range" min="0" max="100" step="5" value="${v}" data-k="${k}" style="--p:${v}%"><b>${off ? esc(t('sMute')) : v}</b></div></div>`; };
  const draw = () => `<h3>${esc(t('settings'))}</h3>${vrow('se')}${vrow('bg')}${sw('sCoach', DB.set.coach)}<label class="row"><span>${esc(t('lang'))}</span><button class="btn sm" data-lang>${esc(I18N.LANGS.find(x => x[0] === L())[1])}</button></label><div class="btns"><button class="btn" data-x>${esc(t('close'))}</button></div>`;
  modal(draw(), 'small', box => {
    const bind = () => {
      box.querySelectorAll('.sw').forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); DB.set.coach = on; renderCoach(); save(); });
      box.querySelector('[data-lang]').onclick = langDialog;
      box.querySelector('[data-x]').onclick = closeModal;
      box.querySelectorAll('.st-m').forEach(m => m.onclick = () => { const k = m.dataset.m, off = DB.set[k + 'On'] === false || DB.set.snd === false; DB.set[k + 'On'] = off; DB.set.snd = true; save(); SND.unlock(); SND.levels(); SND.resume(); box.innerHTML = draw(); bind(); if (off && k === 'se') SND.tile(); });
      box.querySelectorAll('input[type=range]').forEach(r => {
        r.oninput = () => { const k = r.dataset.k; DB.set[k === 'bg' ? 'bgQ' : k + 'P'] = +r.value; DB.set[k + 'On'] = true; DB.set.snd = true; save(); r.style.setProperty('--p', r.value + '%');
          const row = r.closest('.st-vol'); row.classList.remove('off'); row.querySelector('.st-v b').textContent = r.value; row.querySelector('.st-m').innerHTML = IC.snd; SND.unlock(); SND.levels(); SND.resume(); };
        r.onchange = () => { if (r.dataset.k === 'se') SND.tile(); };
      });
    };
    bind();
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
    <div class="btns"><button class="btn" data-x>${esc(t('close'))}</button><button class="btn pri gold" data-go>${esc(t('start'))}</button></div></div>`, 'ngm');
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
  TB.conLabel = I => [t('roundName', { w: t('wind' + I.round), n: I.kyoku + 1 }), t('leftShort')];
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
  UI = { rated, lv, plPick, bots: [null, 1, 2, 3].map((x, i) => i ? GBAI.create({ level: lv }) : null), coachBot: GBAI.create({ level: 16 }), autoBot: GBAI.create({ level: 10 }), stop: false, wait: null, sel: null, chars: seatChars() };
  G = M;
  SND.newGame();
  renderAll();
  while (!M.over && !UI.stop) {
    const r = M.nextRound(); R0 = r;
    TB.hideAll();
    dealFlowersHidden(r);
    await evHook({ ev: 'round' }, 'pre');
    renderAll(true);
    SND.handStart();
    await sleep(500);
    await evHook({ ev: 'round' }, 'post');
    await playRound(r);
    if (UI.stop) return;
    M.finishRound(r);
    renderAll();
    await showResult(r);
    if (UI.stop) return;
  }
  if (!UI.stop) await showFinal();
}
// 確認用（tools の検査スクリプトが GBApp.evHook を置いたときだけ）：出来事の前後で止めて撮る
async function evHook(e, when) { const h = window.GBApp && GBApp.evHook; if (h) await h(e, when); }
async function until(f) { while (!f()) await sleep(120); }
async function botWait(ms) { await sleep(FAST ? 30 : ms); await until(() => !document.hidden); }

async function playRound(r) {
  let seen = 0;
  for (;;) {
    // 起きた出来事を画面へ
    while (seen < r.events.length) { const e = r.events[seen++]; UI.ahead = r.events.slice(seen); await evHook(e, 'pre'); await showEvent(r, e); await evHook(e, 'post'); if (UI.stop) return; }
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
    case 'deal': renderAll(true); await flyDealFlowers(r); break;
    case 'draw': renderAll(); break;
    // 花牌：抜いた花が席の顔（自分はツモの位置）から名札の横の列へ飛んで収まる。補充のツモは次の draw で
    case 'flower': if (e.deal) break; SND.flower(); await flyFlower(r, e.p, e.id); break;
    case 'discard': renderAll(false, e.p); await sleep(UI.tut ? 1000 : FAST ? 10 : 260); break;
    case 'chi': case 'pon': case 'kan': case 'kong': case 'kakan': SND.call(); SND.voice(e.ev === 'chi' ? 'chi' : e.ev === 'pon' ? 'pon' : 'kan'); shout(e.p, t('call_' + (e.ev === 'kong' ? 'kan' : e.ev === 'kakan' ? 'kan' : e.ev))); renderAll(); await sleep(FAST ? 10 : 420); break;
    case 'falsehu': SND.warn(); shout(e.p, t('falseHu')); toast(t('falseHuToast', { who: name(e.p), n: e.pts }), 2600); renderAll(); await sleep(900); break;
    case 'win': SND.stop(); SND.ok(); SND.voice(e.how === 'tsumo' ? 'tsumo' : 'ron'); shout(e.p, e.how === 'tsumo' ? t('tsumo') : t('ron')); renderAll(); setTimeout(() => SND.win(), 350); await sleep(FAST ? 50 : 1100); break;
    case 'exhaust': SND.stop(); SND.exhaust(); shout(-1, t('exhaust')); await sleep(FAST ? 50 : 900); break;
  }
}
// ---------------------------------------------------------------- 花牌の動き
// 局の状態は画面より先に進んでいる（出来事を順に見せる）。まだ見せていない花牌は名札の列に出さず、まだ見せていないツモ牌は手牌の行に出さない
const pendFlower = id => !!(UI && UI.ahead && UI.ahead.some(e => e.ev === 'flower' && !e.deal && e.id === id));
const pendDraw = id => !!(UI && UI.ahead && UI.ahead.some(e => e.ev === 'draw' && e.p === ME && e.id === id));
// 配牌の花は、局の始まりに名札の横へ（親から順に）飛ばす。それまで名札の列では隠しておく（UI.flyIds）
function dealFlowersHidden(r) { UI.flyIds = new Set(); for (const e of r.events) if (e.ev === 'flower' && e.deal) UI.flyIds.add(e.id); }
async function flyDealFlowers(r) {
  const list = r.events.filter(e => e.ev === 'flower' && e.deal);
  if (!list.length) return;
  if (FAST || UI.tut) { for (const e of list) UI.flyIds.delete(e.id); renderSeats(); return; }
  await sleep(350);
  for (let i = 0; i < list.length; i++) { if (UI.stop) return; if (i % 2 === 0) SND.flower(); const pr = flyFlower(r, list[i].p, list[i].id, true); await (i === list.length - 1 ? pr : sleep(170)); }
}
function seatFace(p) { return (p === ME ? $('#mePanel') : $('#opp' + p)).querySelector('.bf'); }
// 1枚：席の顔（自分は手牌の行のツモの位置）の上に大きく現れ、名札の横の花牌の列のその位置へ縮みながら移る（0.6秒）。列の牌は着いてから見せる
function flyFlower(r, p, id, quick) {
  UI.flyIds = UI.flyIds || new Set(); UI.flyIds.add(id); (UI.flying = UI.flying || new Set()).add(id);   // 飛んでいる1枚は場所だけ取って見せない（fly）、まだの花は場所も取らない（pend）
  renderSeats(); if (p === ME) renderHand();
  const dst = document.querySelector(`${p === ME ? '#mePanel' : '#opp' + p} .gb-fl img[data-id="${id}"]`);
  const land = () => { UI.flyIds.delete(id); UI.flying.delete(id); const el = document.querySelector(`.gb-fl img[data-id="${id}"]`); if (el) { el.classList.remove('fly', 'pend'); el.classList.add('nw'); } UI.flNew = { id, t: performance.now() }; };
  if (FAST || !dst || document.hidden) { land(); return Promise.resolve(); }
  const g = $('#game');
  const ph = p === ME ? document.querySelector('#hand .hrow .tl.ph, #hand .hrow .tl.drawn') : null;
  // 回した画面（スマホ縦持ち）でも #root の中の座標で（uiRect）
  const loc = el => { const q = uiRect(el); return { x: q.l, y: q.t, w: q.r - q.l, h: q.b - q.t }; };
  const S = loc(ph || seatFace(p)), D = loc(dst);
  const fly = document.createElement('div'); fly.className = 'gb-flfly';
  fly.innerHTML = `<img src="${MJTiles.urlId(id)}" alt="" draggable="false">`;
  const h0 = Math.min(S.h * .9, 96 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hz')) || 1)), w0 = h0 * D.w / D.h;
  Object.assign(fly.style, { left: D.x + 'px', top: D.y + 'px', width: D.w + 'px', height: D.h + 'px' });
  g.appendChild(fly);
  const k = h0 / D.h, sx = S.x + S.w / 2 - (D.x + D.w / 2), sy = S.y + S.h / 2 - (D.y + D.h / 2);
  const dur = quick ? 480 : 640;
  const an = fly.animate([
    { transform: `translate(${sx}px,${sy}px) scale(${k * .6})`, opacity: 0 },
    { transform: `translate(${sx}px,${sy - 18}px) scale(${k})`, opacity: 1, offset: .28 },
    { transform: `translate(${sx}px,${sy - 18}px) scale(${k})`, opacity: 1, offset: .5 },
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
  ], { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  return new Promise(res => { const end = () => { fly.remove(); land(); res(); }; an.onfinish = end; an.oncancel = end; setTimeout(() => { if (fly.isConnected) end(); }, dur + 400); });
}
function shout(p, s) {
  const el = document.createElement('div'); el.className = 'shout s' + (p < 0 ? 'c' : p); el.textContent = s;
  $('#game').appendChild(el); setTimeout(() => el.remove(), 1200);
}

// ---------------------------------------------------------------- 描画
function tbMeld(m) {
  return { type: m.k === 'minkan' ? 'minkan' : m.k, tiles: m.ids.slice(), from: m.from, called: m.k === 'ankan' ? null : (m.got != null ? m.got : null), added: m.k === 'kakan' ? m.ids[m.ids.length - 1] : null };
}
// 席の顔：自分は大百科で選んだアバター（atlas-v1 の av.icon）、CPU は大百科のアトラモから毎回ちがう3体（riichi/atlamo.js。リーチ麻雀と同じ）
const AV_DIR = '../images/atlas/av/';
const SEAT_C = ['#a3283a', '#1f7a60', '#2f6fb0', '#8a5a2b'];
function myAv() { try { const d = window.Atlas && Atlas.load ? Atlas.load() : JSON.parse(localStorage.getItem('atlas-v1') || 'null') || { av: { icon: 'av-dice-0' } }, m = /^av-([a-z0-9-]+)-(\d)$/.exec((d && d.av && d.av.icon) || 'av-dice-0'); return m ? AV_DIR + m[1] + '-' + m[2] + '.webp' : AV_DIR + 'dice-0.webp'; } catch (e) { return AV_DIR + 'dice-0.webp'; } }
function seatChars() {
  const L0 = window.RIICHI_ATLAMO || [], used = new Set(), out = [{ img: myAv(), name: null }];
  for (let i = 1; i < 4; i++) {
    if (!L0.length) { out.push({ img: AV_DIR + 'dice-' + (i % 3) + '.webp', name: null }); continue; }
    let k = Math.floor(Math.random() * L0.length); for (let n = 0; used.has(k) && n < L0.length; n++) k = (k + 1) % L0.length; used.add(k);
    const [sp, ja, en] = L0[k]; out.push({ img: AV_DIR + sp + '-' + Math.floor(Math.random() * 3) + '.webp', name: { ja, en } });
  }
  return out;
}
// 名前：自分は「あなた」、CPU はアトラモの名前（日本語以外は英語名）
const name = p => p === ME ? t('you') : UI && UI.chars && UI.chars[p] && UI.chars[p].name ? (L() === 'ja' ? UI.chars[p].name.ja : UI.chars[p].name.en) : t('cpu', { n: p });

// ---------------------------------------------------------------- 描画
// 牌（手牌の行・副露・鳴きの候補）：riichi/ と同じ span.tl（大きさは CSS の --tw / --th）
const lpNow = () => document.documentElement.classList.contains('lp');
const hTile = (id, cls, extra) => `<span class="tl ${cls || ''}" data-id="${id}" ${extra || ''}><img src="${MJTiles.urlId(id)}" alt="" draggable="false"></span>`;
const hBack = cls => `<span class="tl back ${cls || ''}"></span>`;
const hType = (tt, cls) => `<span class="tl ${cls || ''}"><img src="${MJTiles.urlId(tt >= 34 ? 136 + tt - 34 : tt * 4 + 1)}" alt="" draggable="false"></span>`;
function renderAll(fresh, discarder) {
  if (!R0 || !TB) { renderHand(); return; }
  const r = R0;
  for (let s = 0; s < 4; s++) {
    const P = r.P[s];
    const end = r.phase === 'end';
    if (s !== ME) TB.layoutHand(s, P.hand.slice().sort((a, b) => a - b), null, end && r.result && r.result.type === 'win' && r.result.p === s);
    TB.layoutRiver(s, P.discards.map(d => ({ id: d.id, taken: d.claimed })), discarder === s, null);
    // 卓の上は手牌・河・副露・山だけ。自分の副露は手牌の行の右（riichi/ と同じ）、花牌は名札の横に（卓には置かない）
    if (s !== ME) TB.layoutMelds(s, P.melds.map(tbMeld));
  }
  if (r.robTile != null && r.phase === 'rob') { const g = TB.tile(r.robTile); TB.place(g, r.robber, 0, 6.2, 'flat'); g.visible = true; }
  TB.setInfo({ round: r.wind, kyoku: r.no % 4, honba: 0, kyotaku: 0, left: r.left(), scores: M.scores.slice(), dealer: r.dealer, turn: r.phase === 'end' ? -1 : r.cur });
  TB.dirty = true;
  renderSeats(); renderHand(); renderCoach(); renderInfo(); layoutHud();
}
// 左上の箱：局・何局目・8点縛り（レート戦・天津裁定の印）
function renderInfo() {
  const r = R0; if (!r) return;
  $('#rbox').innerHTML = `<div class="rk"><b>${esc(t('roundName', { w: t('wind' + r.wind), n: r.no % 4 + 1 }))}</b><span>${esc(t('handNo', { n: r.no + 1, of: M.hands }))}</span></div>
    <div class="gb-rule"><span class="gb-min">${esc(t('minRule'))}</span>${UI.rated ? `<em class="gb-tag">${esc(t('mRated'))}</em>` : ''}${GBFan.OPTS.tianjin ? `<em class="gb-tag">${esc(t('tjShort'))}</em>` : ''}</div>`
    // スマホ：コーチの要点は左上の箱の中に1行（触れると下に開く）。名札と重ならないように
    + (lpNow() && UI.ckSum != null && !$('#coach').hidden ? `<button class="gb-ckb" type="button"><b>${esc(t('coach'))}</b><span>${UI.ckSum}</span><i>${$('#coach').classList.contains('open') ? '▴' : '▾'}</i></button>` : '');
  const ckb = $('#rbox .gb-ckb'); if (ckb) ckb.onclick = () => { const c = $('#coach'); c.classList.toggle('open'); UI.ckOpen = c.classList.contains('open'); renderInfo(); };
  $('#gFan').innerHTML = IC.book; $('#gStats').innerHTML = IC.cup; $('#gSet').innerHTML = IC.gear; $('#gExit').innerHTML = IC.exit;
  for (const [k, id] of [['mDex', 'gFan'], ['stats', 'gStats'], ['settings', 'gSet'], ['exitTitle', 'gExit']]) { const b = $('#' + id); b.title = t(k); b.setAttribute('aria-label', t(k)); }
}
// 名札：顔・席の風（親は珊瑚色）。その下に名前・点数・Lv・和了不可を1枚のプレートに。花牌（どの花か分かる小さな絵を枚数ぶん）はプレートの横に並べる
function badge(s) {
  const r = R0, P = r.P[s], w = r.seatWind(s), c = UI.chars[s];
  const fl = P.flowers.length ? `<span class="gb-fl${P.flowers.length > 4 ? ' r2' : ''}" title="${esc(t('flowersN', { n: P.flowers.length }))}">${P.flowers.slice().sort((a, b) => a - b).map(id => `<img src="${MJTiles.urlId(id)}" alt="" draggable="false" data-id="${id}" class="${UI.flying && UI.flying.has(id) ? 'fly' : (UI.flyIds && UI.flyIds.has(id)) || pendFlower(id) ? 'pend' : UI.flNew && UI.flNew.id === id && performance.now() - UI.flNew.t < 900 ? 'nw' : ''}"${UI.flNew && UI.flNew.id === id ? ` style="animation-delay:${-Math.round(performance.now() - UI.flNew.t)}ms"` : ''}>`).join('')}</span>` : '';
  return `<div class="bf ${w === 0 ? 'dealer' : ''}" style="--c:${SEAT_C[s]}"><span class="frame fr-N" style="--c:${SEAT_C[s]}"><img src="${c.img}" alt="" draggable="false"></span><em>${esc(t('windS' + w))}</em></div>
    <div class="bt"><span class="gb-np"><b>${esc(name(s))}</b><span class="gb-pl"><span class="gb-sc">${M.scores[s]}</span>${s !== ME ? `<small class="gb-lv">Lv.${UI.lv}</small>` : ''}${P.dead ? `<span class="gb-dead">${esc(t('dead'))}</span>` : ''}</span>${fl}</span></div>`;
}
function renderSeats() {
  const r = R0; if (!r) return;
  for (let s = 1; s < 4; s++) { const el = $('#opp' + s); el.innerHTML = badge(s); el.classList.toggle('gb-turn', r.cur === s && r.phase !== 'end'); }
  const me = $('#mePanel'); me.innerHTML = `<div class="mb${r.cur === ME && r.phase !== 'end' ? ' gb-turn' : ''}">${badge(ME)}</div>`;
}
// 自分の手牌（riichi/ と同じ行：キー 1〜0 - ^ ¥、ツモ牌は Space。副露は行の右に小さく）
const HAND_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '¥'];
const HAND_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'IntlYen'];
function renderHand() {
  const el = $('#hand'), acts = $('#acts');
  if (!R0) { el.innerHTML = ''; acts.innerHTML = ''; return; }
  const r = R0, P = r.P[ME];
  const drawn0 = r.phase === 'turn' && r.cur === ME && r.drawn != null && P.hand.includes(r.drawn) ? r.drawn : null;
  const drawn = drawn0 != null && pendDraw(drawn0) ? null : drawn0;   // （花の補充を見せている間は、補充のツモ牌をまだ出さない）
  const ids = P.hand.filter(id => id !== drawn0).sort((a, b) => a - b);
  const myTurn = r.phase === 'turn' && r.cur === ME && UI.wait;
  const rec = myTurn && DB.set.coach && !UI.rated && !UI.tut && UI.coach && UI.coach.discards[0] ? UI.coach.discards[0].t : null;
  const cls = id => (myTurn ? 'can' : '') + (T(id) === rec ? ' rec' : '');
  const melds = P.melds.map(m => {
    const rel = (m.from - ME + 4) % 4;
    let order = m.ids.slice(); const got = m.k === 'ankan' ? null : m.got;
    if (got != null && m.k !== 'kakan') { order = order.filter(x => x !== got); order.splice(rel === 3 ? 0 : rel === 2 ? 1 : order.length, 0, got); }
    return `<span class="meld">${order.map((id, i) => m.k === 'ankan' ? hBack('sm') : hTile(id, 'sm' + (id === got ? ' side' : ''))).join('')}</span>`;
  }).join('');
  el.innerHTML = `<div class="hrow">${ids.map((id, i) => hTile(id, cls(id)).replace('</span>', `<kbd class="tk">${HAND_LABELS[i] || ''}</kbd></span>`)).join('')}<span class="gap"></span>${drawn != null ? hTile(drawn, cls(drawn) + ' drawn').replace('</span>', '<kbd class="tk">Space</kbd></span>') : '<span class="tl ph"></span>'}</div>${melds ? `<div class="melds">${melds}</div>` : ''}`;
  el.classList.toggle('active', !!myTurn);
  el.querySelectorAll('.tl[data-id]').forEach(b => {
    b.onclick = () => { if (!UI.wait || UI.wait.kind !== 'turn' || !b.closest('.hrow')) return; UI.wait.done({ type: 'discard', id: +b.dataset.id }); };
    b.onmouseenter = () => { if (TB) TB.highlightType(T(+b.dataset.id)); };
    b.onmouseleave = () => { if (TB) TB.highlightType(null); };
  });
  renderActs();
}
// 鳴き・和了のボタン（riichi/ と同じ丸いボタン：和了は珊瑚色、8点未満の和了は橙、鳴きは空色、パスは白。キー：Enter・C・V・B・Space）
function renderActs() {
  const acts = $('#acts'), pk = $('#chiPick'); const w = UI && UI.wait;
  pk.hidden = true;
  if (!w) { acts.innerHTML = ''; return; }
  const B = (role, label, cls, sub, key) => `<button class="ab ${cls}" data-role="${role}"${key ? ` data-key="${key}"` : ''}><span class="gb-ab"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>${key ? `<kbd>${key === 'Escape' ? 'Space' : key === 'Enter' ? 'Enter' : key.toUpperCase()}</kbd>` : ''}</button>`;
  let h = '';
  const chis = w.opts.filter(o => o.type === 'chi');
  w.opts.forEach((o, i) => {
    if (o.type === 'hu') h += B('hu', esc(w.kind === 'turn' ? t('tsumo') : t('ron')), o.low ? 'win gb-low' : 'win', esc(o.low ? t('lowShort', { n: o.pts }) : t('ptsN', { n: o.pts })), 'Enter');
    else if (o.type === 'pon') h += B('pon', esc(t('call_pon')), 'call', '', 'v');
    else if (o.type === 'kan') h += B('kan', esc(t('call_kan')), 'call', '', 'b');
    else if (o.type === 'ankan' || o.type === 'kakan') h += B(o.type + ':' + o.t, esc(t(o.type === 'ankan' ? 'ankan' : 'kakan')) + hType(o.t, 'xs'), 'call', '', null);
  });
  if (chis.length) h += B('chi', esc(t('call_chi')) + (chis.length === 1 ? ' ' + [0, 1, 2].map(k => hType(chis[0].t + k, 'xs')).join('') : ''), 'call', '', 'c');
  if (w.kind === 'claim') h += B('pass', esc(t('pass')), 'skip', '', 'Escape');
  acts.innerHTML = h;
  const pick = role => {
    if (role === 'pass') return w.done({ type: 'pass' });
    if (role === 'chi') {
      if (chis.length === 1) return w.done(chis[0]);
      pk.innerHTML = chis.map((o, i) => `<button data-i="${i}">${[0, 1, 2].map(k => hType(o.t + k, 'xs' + (o.t + k === T(R0.discard) ? ' hl' : ''))).join('')}<kbd>${i + 1}</kbd></button>`).join('');
      pk.hidden = false; pk.onclick = e => { const b = e.target.closest('[data-i]'); if (b) w.done(chis[+b.dataset.i]); }; return;
    }
    if (role.includes(':')) { const [k, tt] = role.split(':'); return w.done(w.opts.find(o => o.type === k && o.t === +tt)); }
    const o = w.opts.find(x => x.type === role); if (o) w.done(o);
  };
  acts.querySelectorAll('.ab').forEach(b => b.onclick = () => pick(b.dataset.role));
  acts._pick = pick;
}
// キーボード：手牌 1〜0 - ^ ¥・ツモ牌 Space、和了 Enter・チー C・ポン V・カン B・パス Space（Esc）、チーの選び 1〜3
addEventListener('keydown', e => {
  if (!UI || !UI.wait || $('#game').hidden || !$('#modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  const w = UI.wait, acts = $('#acts');
  const pk = $('#chiPick');
  if (!pk.hidden && /^Digit[1-3]$/.test(e.code)) { const b = pk.querySelector(`[data-i="${+e.code.slice(5) - 1}"]`); if (b) { b.click(); e.preventDefault(); } return; }
  const k = e.key === 'Enter' ? 'Enter' : e.key === 'Escape' ? 'Escape' : e.key.toLowerCase();
  const b = acts.querySelector(`.ab[data-key="${k}"]`) || (e.code === 'Space' && w.kind === 'claim' ? acts.querySelector('.ab[data-key="Escape"]') : null);
  if (b) { b.click(); e.preventDefault(); return; }
  if (w.kind !== 'turn') return;
  const row = [...document.querySelectorAll('#hand .hrow .tl[data-id]')];
  let el = null;
  if (e.code === 'Space') el = row.find(x => x.classList.contains('drawn')) || row[row.length - 1];
  else { const i = HAND_CODES.indexOf(e.code); if (i >= 0) el = row.filter(x => !x.classList.contains('drawn'))[i]; }
  if (el) { el.click(); e.preventDefault(); }
});
function humanAct(r) {
  return new Promise(res => {
    const opts = r.options(ME);
    const kind = r.phase === 'turn' ? 'turn' : 'claim';
    UI.wait = { kind, opts: opts.filter(o => o.type !== 'discard'), done: a => { UI.wait = null; renderHand(); res(a); } };
    if (kind === 'claim' && UI.wait.opts.length) SND.callAsk();
    if (kind === 'claim') { const tl = TB.tile(r.phase === 'rob' ? r.robTile : r.discard); TB.setTileLook(tl, 'hi'); TB.dirty = true; }
    UI.coach = DB.set.coach && !UI.rated ? UI.coachBot.analyze(r, ME) : null;
    renderHand(); renderCoach(); renderSeats();
    if (UI.tut) UI.tut.waiting(r);
  });
}

// ---------------------------------------------------------------- コーチ（目標の番・向聴数・聴牌の待ちと点）：riichi/ の情報の箱（.intel）の場所に
function renderCoach() {
  const el = $('#coach');
  if (!R0 || !UI || !DB.set.coach || UI.rated) { el.hidden = true; return; }
  const r = R0, P = r.P[ME];
  el.hidden = false;
  const melds = r.meldsOf(ME);
  const types = P.hand.map(T);
  let sum = '', sumW = '';
  let h = `<h4>${esc(t('coach'))}<small data-sum></small></h4>`;
  const calcW = (w, fl) => GBFan.calc({ melds, hand: types, win: w, tsumo: false, flowers: fl, seat: r.seatWind(ME), round: r.wind });
  if (P.hand.length % 3 === 1) {
    const sh = GB.shanten(GB.counts(types), melds.length);
    if (sh === 0) {
      const ws = GBFan.waits(types, melds.length);
      const xs = ws.map(w => [w, calcW(w, P.flowers.length), calcW(w, 0)]);
      h += `<p class="ck-l"><b>${esc(t('tenpai'))}</b></p><div class="ck-w">` + xs.map(([w, res, r0]) => `<span class="wt${r0.ok && r0.pts >= 8 ? '' : ' low'}">${typeImg(w, 'mini')}<b>${res.ok ? res.pts : 0}</b></span>`).join('') + `</div>`
        + (xs.some(([, , r0]) => !r0.ok || r0.pts < 8) ? `<p class="ck-warn">${esc(t('lowWaitWarn'))}</p>` : '');
      sumW = xs.map(([w, res, r0]) => `<span class="sw-w${r0.ok && r0.pts >= 8 ? '' : ' low'}">${typeImg(w, 'mini')}${res.ok ? res.pts : 0}</span>`).join('');
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
  el.querySelector('[data-sum]').innerHTML = UI.ckSum = esc(sum) + (sumW ? ' ' + sumW : '');
  if (lpNow()) renderInfo();
  el.querySelector('h4').onclick = () => { el.classList.toggle('open'); UI.ckOpen = el.classList.contains('open'); layoutHud(); };
  if (UI.ckOpen) el.classList.add('open');
  layoutHud();
}

// ---------------------------------------------------------------- コーチ欄の置き場（PC）：卓の右の枠より右に入れる。入らないときは要点だけの1行（触れると開く）
function scr(v3) { const h = TB.host, v = v3.clone().project(TB.camera); return [(v.x + 1) / 2 * h.clientWidth, (1 - v.y) / 2 * h.clientHeight]; }
function layoutHud() {
  const ck = $('#coach');
  if (!TB || !TB.camera || !R0 || $('#game').hidden) return;
  const lp = document.documentElement.classList.contains('lp');
  if (lp || ck.hidden) { ck.classList.toggle('cmp', lp); ck.style.width = ''; return; }
  const W = TB.host.clientWidth, H = TB.host.clientHeight, V = THREE.Vector3, top = ck.offsetTop || 72;
  const freeAt = b => { let mx = 0; for (let z = -12.3; z <= 12.31; z += .3) { const [x, y] = scr(new V(12.3, .92, z)); if (y >= top - 10 && y <= b + 10) mx = Math.max(mx, x); } return W - mx - 14 - 12; };
  const free = freeAt(Math.min(H, top + Math.max(ck.classList.contains('cmp') ? 0 : ck.offsetHeight, 220)));
  const fit = free >= 250 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hz')) || 1);
  ck.classList.toggle('cmp', !fit);
  const f1 = fit ? free : freeAt(top + 48);
  const hz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hz')) || 1;   // 文字は --hz 倍なので幅も
  ck.style.width = fit ? Math.min(320 * hz, free) + 'px' : ck.classList.contains('open') ? 300 * hz + 'px' : Math.max(170 * hz, Math.min(300 * hz, f1)) + 'px';
}
addEventListener('resize', () => requestAnimationFrame(layoutHud));
if (window.ResizeObserver) new ResizeObserver(() => { const r = $('#rbox'); if (r.offsetHeight) $('#game').style.setProperty('--rbh', r.offsetHeight + 'px'); }).observe($('#rbox'));

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
  if (!UI.tut) SND.score();
  return new Promise(res => {
    const x = r.result;
    const pay = `<div class="pays">${[0, 1, 2, 3].map(s => `<div class="pay${x.pay[s] > 0 ? ' up' : x.pay[s] < 0 ? ' dn' : ''}"><span>${esc(name(s))}</span><b>${x.pay[s] > 0 ? '+' : ''}${x.pay[s]}</b><small>${M.scores[s]}</small></div>`).join('')}</div>`;
    let h;
    if (x.type === 'win') {
      const how = x.how === 'tsumo' ? t('byTsumo') : x.how === 'rob' ? t('byRob', { from: name(x.from) }) : t('byRon', { from: name(x.from) });
      h = `<div class="res"><h3>${esc(t('winTitle', { who: name(x.p) }))}</h3><p class="how">${esc(how)}</p>${handRowHtml(r, x.p, x.winId)}${fanTable(x.fan)}<p class="dim">${esc(x.how === 'tsumo' ? t('payTsumo', { n: x.fan.total }) : t('payRon', { n: x.fan.total }))}</p>${pay}`;
    } else h = `<div class="res"><h3>${esc(t('exhaust'))}</h3><p class="how">${esc(t('exhaustNote'))}</p>${pay}`;
    h += UI.tut ? `<div class="btns"><button class="btn pri gold" data-ok>${esc(t('next'))}</button></div></div>` : `<div class="btns"><button class="btn pri gold" data-ok>${esc(M.over ? t('seeFinal') : t('nextHand'))}</button></div></div>`;
    modal(h, 'resm', box => { box.querySelector('[data-ok]').onclick = () => { if (UI.tut) { UI.tut.next(); return; } closeModal(); res(); }; if (AUTO && !/[?&]hold/.test(location.search)) setTimeout(() => { if (!$('#modal').hidden) { closeModal(); res(); } }, 400); });
  });
}
function showFinal() {
  SND.ok();
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
      <div class="btns"><button class="btn" data-home>${esc(t('toHome'))}</button><button class="btn pri gold" data-again>${esc(t('again'))}</button></div></div>`;
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
  UI = { rated: false, lv: 6, tut: T, bots: [null, 1, 2, 3].map((x, i) => i ? GBAI.create({ level: 6, seed: i }) : null), coachBot: GBAI.create({ level: 16 }), autoBot: GBAI.create({ level: 10 }), stop: false, wait: null, chars: seatChars() };
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
  R0 = null; G = null; SND.stop();
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
window.GBApp = { SND, uiRect, startTutorial, exitGame, get R() { return R0; }, get UI() { return UI; }, renderAll, openDex, modal, closeModal, toast, tileImg, typeImg, parseTiles, t: (...a) => t(...a), esc, save, DB, ensureTable, get TB() { return TB; }, renderHome };

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
