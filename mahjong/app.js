// 雀華 (JANKA) — app: home portal, gacha, game screen (3D table + HTML hand), cut-ins, results.
(function () {
'use strict';
const $ = s => document.querySelector(s);
const t = (k, v) => I18N.t(k, v);
const L = o => I18N.L(o);
const T = id => id >> 2;
const FAST = /[?&]fast/.test(location.search) ? 0.12 : 1;
const sleep = ms => new Promise(r => setTimeout(r, ms * FAST));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- save
const KEY = 'janka-v1';
let DB = load();
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d) d = {};
  d.coins = d.coins ?? 3000;
  d.owned = d.owned || { komachi: 1 };
  d.sel = d.sel && d.owned[d.sel] ? d.sel : 'komachi';
  d.set = Object.assign({ len: 'east', skills: true, lv: 2, snd: true }, d.set || {});
  d.stats = Object.assign({ games: 0, rank: [0, 0, 0, 0] }, d.stats || {});
  return d;
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
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a2 2 0 0 1 0 4H9"/></svg>',
  chest: '<svg viewBox="0 0 24 24"><path d="M3 10h18v10H3zM3 10a9 5 0 0 1 18 0"/><path d="M11 13h2v3h-2z"/></svg>',
};
const icon = k => IC[k] || '';

// ---------------------------------------------------------------- sound (WebAudio synth)
const SND = (() => {
  let ac = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  const on = () => DB.set.snd && !document.hidden;
  function tone(f, d, type = 'sine', g = .15, delay = 0, f2) {
    const a = ctx(); if (!a || !on()) return;
    const o = a.createOscillator(), v = a.createGain(), t0 = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(g, t0 + .01); v.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(v).connect(a.destination); o.start(t0); o.stop(t0 + d + .05);
  }
  function click(g = .35) {
    const a = ctx(); if (!a || !on()) return;
    const n = a.createBuffer(1, a.sampleRate * .05, a.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const s = a.createBufferSource(); s.buffer = n;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.2;
    const v = a.createGain(); v.gain.value = g;
    s.connect(f).connect(v).connect(a.destination); s.start();
    tone(1500, .05, 'triangle', .05);
  }
  document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  return {
    tile: () => click(),
    call: () => { tone(520, .16, 'square', .06); tone(780, .2, 'square', .05, .08); },
    riichi: () => { tone(880, .5, 'sine', .14); tone(1320, .7, 'sine', .1, .08); tone(1760, .9, 'sine', .06, .16); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', .12, i * .09)); tone(1568, 1.2, 'sine', .08, .4); },
    skill: () => { tone(300, .5, 'sawtooth', .05, 0, 1200); tone(1200, .6, 'sine', .1, .3); },
    ok: () => { tone(988, .25, 'sine', .12); tone(1319, .5, 'sine', .1, .12); },
    pick: () => tone(660, .06, 'triangle', .06),
    gacha: r => { const b = r === 'SSR' ? 4 : r === 'SR' ? 3 : 2; for (let i = 0; i < b + 2; i++) tone(500 + i * 180, .3, 'triangle', .1, i * .07); },
    unlock: () => ctx(),
  };
})();

// ---------------------------------------------------------------- character art
const ART = new Map();
function charImg(c, kind) {          // kind: 'full' | 'bust' | 'face'
  if (c.art) return `../images/mahjong/chara/${c.id}${kind === 'full' ? '' : '-' + kind}.webp`;
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

// ---------------------------------------------------------------- tile html
function tileHTML(id, cls = '', extra = '') {
  const red = id === 16 || id === 52 || id === 88;
  return `<span class="tl ${cls}" data-id="${id}" ${extra}><img src="${MJTiles.url(T(id), red)}" alt="" draggable="false"></span>`;
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
  requestAnimationFrame(() => m.classList.add('show'));
  return m.firstElementChild;
}
function closeModal() { const m = $('#modal'); m.classList.remove('show'); m.hidden = true; m.innerHTML = ''; }
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
  $('#langSel').value = I18N.lang;
  document.title = I18N.lang === 'ja' ? '雀華 〜姫たちの麻雀〜' : 'JANKA — Mahjong of the Princesses';
}
function sndIcons() { for (const b of document.querySelectorAll('.snd')) b.innerHTML = DB.set.snd ? IC.snd : IC.mute; }
function renderHome() {
  applyText();
  $('#coinN').textContent = DB.coins.toLocaleString();
  $('#btnGacha').innerHTML = IC.gacha; $('#btnColl').innerHTML = IC.collection; $('#btnPortal').innerHTML = IC.home;
  $('#coinBox .coin').innerHTML = IC.coin;
  sndIcons();
  const c = MJChars.get(DB.sel);
  const sk = MJSkills.get(c.skill);
  $('#partner').innerHTML = `
    <div class="pimg" style="--c:${c.color};--c2:${c.color2}"><img src="${charImg(c, 'full')}" alt=""></div>
    <div class="pinfo">
      <div class="prar r-${c.rarity}">${c.rarity}</div>
      <div class="pname">${esc(L(c.name))}<small>${esc(L(c.title))}</small></div>
      <div class="pskill" style="--sc:${sk.color}"><i>${icon(sk.icon)}</i><div><b>${esc(L(sk.name))}</b><span>${esc(L(sk.desc))}</span></div></div>
      <p class="pprof">${esc(L(c.profile))}</p>
    </div>`;
  const seg = (el, items, cur, cb) => {
    el.innerHTML = items.map(([v, lab]) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${esc(lab)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; SND.pick(); cb(b.dataset.v); save(); renderHome(); };
  };
  seg($('#optLen'), [['east', t('east')], ['south', t('south')]], DB.set.len, v => DB.set.len = v);
  seg($('#optSkill'), [['1', t('skillOn')], ['0', t('skillOff')]], DB.set.skills ? '1' : '0', v => DB.set.skills = v === '1');
  seg($('#optLv'), t('lv').map((x, i) => [String(i), x]), String(DB.set.lv), v => DB.set.lv = +v);
  // roster
  $('#roster').innerHTML = MJChars.list.filter(x => DB.owned[x.id]).map(x =>
    `<button class="rc ${x.id === DB.sel ? 'on' : ''}" data-id="${x.id}" style="--c:${x.color}"><img src="${charImg(x, 'face')}" alt=""><span>${esc(L(x.name))}</span><em class="r-${x.rarity}">${x.rarity}</em></button>`).join('');
}
$('#roster').addEventListener('click', e => { const b = e.target.closest('.rc'); if (!b) return; DB.sel = b.dataset.id; save(); SND.pick(); renderHome(); });
$('#langSel').addEventListener('change', e => { I18N.set(e.target.value); renderHome(); });
$('#btnSnd').addEventListener('click', () => { DB.set.snd = !DB.set.snd; save(); sndIcons(); SND.unlock(); });
$('#gSnd').addEventListener('click', () => { DB.set.snd = !DB.set.snd; save(); sndIcons(); });
// phones always use the landscape layout; held upright, the whole UI is turned 90° (no reliance on the OS rotation)
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
function fitRoot() {
  const w = innerWidth, h = innerHeight, de = document.documentElement;
  const rot = PHONE && h > w;
  de.classList.toggle('lp', PHONE); de.classList.toggle('rot', rot);
  de.style.setProperty('--W', (rot ? h : w) + 'px'); de.style.setProperty('--H', (rot ? w : h) + 'px');
}
fitRoot();
addEventListener('resize', fitRoot);
addEventListener('orientationchange', () => setTimeout(fitRoot, 120));
$('#btnStart').addEventListener('click', () => { SND.unlock(); startGame(); });
$('#btnGacha').addEventListener('click', openGacha);
$('#btnColl').addEventListener('click', openCollection);

// ---------------------------------------------------------------- gacha
const COST1 = 300, COST10 = 2700;
function rollRarity(guarantee) {
  const R = MJChars.RARITY;
  let r = Math.random() * 100, acc = 0, out = 'N';
  for (const k of ['SSR', 'SR', 'R', 'N']) { acc += R[k].w; if (r < acc) { out = k; break; } }
  if (guarantee && (out === 'N' || out === 'R')) out = Math.random() < .2 ? 'SSR' : 'SR';
  return out;
}
function rollChar(guarantee) {
  let r = rollRarity(guarantee);
  let pool = MJChars.list.filter(c => c.rarity === r);
  if (!pool.length) pool = MJChars.list;
  return pool[(Math.random() * pool.length) | 0];
}
const DUPE = { N: 30, R: 80, SR: 250, SSR: 800 };
function openGacha() {
  const b = modal(`
    <div class="gacha">
      <h2>${t('gacha')}</h2>
      <div class="gstage" id="gStage"><div class="gorb"></div><p class="grates">SSR 4% ・ SR 13% ・ R 33% ・ N 50%<br><small>10${I18N.lang === 'ja' ? '回目はSR以上確定' : 'th pull: SR or better'}</small></p></div>
      <div class="gbtns">
        <button class="btn" data-n="1">${t('pull1', { n: COST1 })}</button>
        <button class="btn gold" data-n="10">${t('pull10', { n: COST10.toLocaleString() })}</button>
      </div>
      <div class="gcoins">${icon('coin')}<b id="gCoins">${DB.coins.toLocaleString()}</b></div>
      <button class="x" data-a="close">×</button>
    </div>`, 'wide');
  b.addEventListener('click', async e => {
    if (e.target.closest('[data-a=close]')) { closeModal(); renderHome(); return; }
    const btn = e.target.closest('[data-n]'); if (!btn || b.busy) return;
    const n = +btn.dataset.n, cost = n === 1 ? COST1 : COST10;
    if (DB.coins < cost) { toast(t('notEnough')); return; }
    b.busy = true;
    DB.coins -= cost;
    const got = [];
    for (let i = 0; i < n; i++) {
      const c = rollChar(n === 10 && i === 9);
      const isNew = !DB.owned[c.id];
      DB.owned[c.id] = (DB.owned[c.id] || 0) + 1;
      let refund = 0;
      if (!isNew) { refund = DUPE[c.rarity]; DB.coins += refund; }
      got.push({ c, isNew, refund });
    }
    save();
    await showPulls(got);
    $('#gCoins').textContent = DB.coins.toLocaleString();
    b.busy = false;
  });
}
async function showPulls(got) {
  const st = $('#gStage');
  const best = got.reduce((a, g) => ['N', 'R', 'SR', 'SSR'].indexOf(g.c.rarity) > ['N', 'R', 'SR', 'SSR'].indexOf(a) ? g.c.rarity : a, 'N');
  st.innerHTML = `<div class="gorb spin r-${best}"></div>`;
  SND.gacha(best);
  await sleep(1100);
  st.innerHTML = `<div class="gcards n${got.length}">${got.map((g, i) => `
    <div class="gc r-${g.c.rarity}" style="--d:${i * 110}ms;--c:${g.c.color};--c2:${g.c.color2}">
      <div class="gci"><img src="${charImg(g.c, 'bust')}" alt=""></div>
      <div class="gcn"><em>${g.c.rarity}</em>${esc(L(g.c.name))}</div>
      ${g.isNew ? `<i class="gnew">${t('newChar')}</i>` : `<i class="gdup">${t('dupe', { n: g.refund })}</i>`}
    </div>`).join('')}</div>`;
}
function openCollection() {
  const b = modal(`
    <div class="coll">
      <h2>${t('collection')} <small>${Object.keys(DB.owned).length} / ${MJChars.list.length}</small></h2>
      <div class="cgrid">${MJChars.list.map(c => {
        const own = !!DB.owned[c.id]; const sk = MJSkills.get(c.skill);
        return `<div class="cc ${own ? '' : 'lock'} r-${c.rarity}" style="--c:${c.color};--c2:${c.color2}">
          <div class="cci"><img src="${charImg(c, 'bust')}" alt=""></div>
          <div class="ccb"><em>${c.rarity}</em><b>${own ? esc(L(c.name)) : '？？？'}</b><span style="--sc:${sk.color}">${icon(sk.icon)}${esc(L(sk.name))}</span></div>
          ${own ? `<button class="btn sm ${c.id === DB.sel ? 'on' : ''}" data-id="${c.id}">${c.id === DB.sel ? t('selected') : t('select')}</button>` : ''}
        </div>`; }).join('')}</div>
      <button class="x" data-a="close">×</button>
    </div>`, 'wide');
  b.addEventListener('click', e => {
    if (e.target.closest('[data-a=close]')) { closeModal(); renderHome(); return; }
    const s = e.target.closest('[data-id]'); if (!s) return;
    DB.sel = s.dataset.id; save(); closeModal(); renderHome();
  });
}

// ================================================================ GAME
let G = null;          // MJGame
let TB = null;         // Table3D
let UIS = null;        // ui state for the game screen
const ME = 0;

class Human {
  turn(g, s, o) { return new Promise(res => myTurn(o, res)); }
  react(g, s, o) { return new Promise(res => myCall(o, res)); }
}
class SlowBot {
  constructor(lv) { this.b = new MJBot.Bot(lv); }
  async turn(g, s, o) { await sleep(320 + Math.random() * 380); return this.b.turn(g, s, o); }
  async react(g, s, o) { if (o.canRon) await sleep(250); return this.b.react(g, s, o); }
}

class AutoMe extends SlowBot {     // ?auto: the player's seat plays itself (testing)
  async react(g, s, o) { const a = await super.react(g, s, o); return a; }
}
// auto-advance result screens in ?auto mode
const AUTO = /[?&]auto/.test(location.search);

async function startGame() {
  $('#home').hidden = true; $('#game').hidden = false;
  closeModal();
  if (!TB) TB = new Table3D($('#stage'));
  TB.hideAll();
  const me = MJChars.get(DB.sel);
  const others = MJChars.list.filter(c => c.id !== me.id).sort(() => Math.random() - .5).slice(0, 3);
  const chars = [me, ...others];
  UIS = { chars, abort: false, hand: [], intel: null, picked: null, riichiMode: false, resolve: null, opts: null, kind: null };
  const auto = /[?&]auto/.test(location.search);
  const agents = [auto ? new AutoMe(DB.set.lv) : new Human(), new SlowBot(DB.set.lv), new SlowBot(DB.set.lv), new SlowBot(DB.set.lv)];
  G = new MJGame({ agents, chars, rules: { length: DB.set.len, skills: DB.set.skills }, ui: onEvent });
  UIS.game = G;
  $('#gSnd').innerHTML = DB.set.snd ? IC.snd : IC.mute; $('#gExit').innerHTML = IC.exit;
  sndIcons();
  const g0 = G;
  try { await G.run(); } catch (e) { if (e !== 'abort') { console.error(e); toast('Error: ' + e.message, 5000); } }
  if (g0 !== G) return;
}
$('#gExit').addEventListener('click', async () => {
  if (!(await confirmBox(t('exitQ')))) return;
  quitGame();
});
function quitGame() {
  if (UIS) UIS.abort = true;
  G = null;
  $('#game').hidden = true; $('#home').hidden = false;
  closeModal(); $('#cutin').hidden = true;
  renderHome();
}

// ---------------------------------------------------------------- events from the game
async function onEvent(ev, d) {
  if (!UIS || UIS.abort || UIS.game !== G) throw 'abort';
  const g = G;
  switch (ev) {
    case 'game-start': renderBadges(); break;
    case 'hand-start': {
      TB.hideAll();
      UIS.intel = null; $('#intel').hidden = true;
      refreshTable(); renderBadges(); renderHand(); layoutAll();
      await banner(t('kyoku', { w: t('round')[g.round], n: g.kyoku + 1 }) + (g.honba ? '  ' + t('honba', { n: g.honba }) : ''));
      break;
    }
    case 'draw': {
      TB.setInfo({ left: g.liveLeft(), turn: d.seat });
      const rl = document.querySelector('#rbox .rl'); if (rl) rl.textContent = t('left', { n: g.liveLeft() });
      if (d.seat === ME) renderHand(d.id);
      else TB.layoutHand(d.seat, g.P[d.seat].hand.slice(0, -1), g.P[d.seat].hand[g.P[d.seat].hand.length - 1]);
      break;
    }
    case 'discard': {
      const p = g.P[d.seat];
      if (d.riichi) await cutin(d.seat, 'riichi');
      SND.tile();
      layoutRiver(d.seat, true);
      if (d.seat !== ME) TB.layoutHand(d.seat, p.hand, null);
      else { clearActs(); renderHand(); }
      await sleep(d.seat === ME ? 120 : 160);
      break;
    }
    case 'riichi-stick': TB.setStick(d.seat, true); refreshTable(); renderBadges(); break;
    case 'call': {
      SND.call();
      await callout(d.seat, d.type === 'chi' ? t('chi') : d.type === 'pon' ? t('pon') : t('kan'));
      layoutAll();
      if (d.seat === ME) renderHand();
      renderBadges();
      break;
    }
    case 'dora': refreshTable(); break;
    case 'skill': {
      await cutin(d.seat, 'skill', d);
      refreshTable(); renderBadges();
      if (d.seat === ME) {
        if (d.info.peek || d.info.read) showIntel(d.info);
        if (d.info.to != null) renderHand(d.info.to);
      }
      break;
    }
    case 'agari': {
      clearActs();
      for (const r of d.results) await cutin(r.seat, r.tsumo ? 'tsumo' : 'ron');
      SND.win();
      for (const r of d.results) if (r.seat !== ME) TB.layoutHand(r.seat, r.hand, null, true);
      await sleep(400);
      for (let i = 0; i < d.results.length; i++) await showAgari(d, d.results[i], i === d.results.length - 1);
      break;
    }
    case 'ryuukyoku': {
      clearActs();
      for (let s = 1; s < 4; s++) if (d.tenpai[s]) TB.layoutHand(s, d.hands[s], null, true);
      await showRyuukyoku(d);
      break;
    }
    case 'game-end': await showFinal(d); break;
  }
}

function refreshTable() {
  const g = G;
  TB.setInfo({ round: g.round, kyoku: g.kyoku, honba: g.honba, kyotaku: g.kyotaku, left: g.liveLeft ? g.liveLeft() : 70, scores: g.scores.slice(), dealer: g.kyoku });
  const inds = g.doraInds ? g.doraInds() : [];
  const roundTxt = t('kyoku', { w: t('round')[g.round], n: g.kyoku + 1 });
  $('#rbox').innerHTML = `<div class="rk"><b>${roundTxt}</b><span>${t('honba', { n: g.honba })}</span></div>
    <div class="rd"><small>${t('dora')}</small>${[0, 1, 2, 3, 4].map(i => i < inds.length ? typeHTML(inds[i], 'xs') : backHTML('xs')).join('')}</div>
    <div class="rl">${t('left', { n: g.liveLeft ? g.liveLeft() : 70 })}</div>`;
}
function layoutRiver(s, anim) {
  const p = G.P[s];
  const riv = p.river.map((r, i) => ({ id: r.id, taken: r.taken, sideways: i === p.riichiTurn || (p.riichiTurn >= 0 && i > p.riichiTurn && p.river.slice(p.riichiTurn, i).every(x => x.taken) && i === firstVisibleAfter(p)) }));
  TB.layoutRiver(s, riv, anim);
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
    const wind = t('wind')[(s - g.kyoku + 4) % 4];
    const fx = p ? Object.keys(p.fx).filter(k => p.fx[k] && ['wareme', 'hanup', 'guard', 'shugi', 'pot', 'seal', 'lure'].includes(k)) : [];
    const sk = MJSkills.get(c.skill);
    const chips = fx.map(k => { const s2 = MJSkills.get(k === 'lure' ? 'lure' : k); return s2 ? `<i class="fx" style="--sc:${s2.color}" title="${esc(L(s2.name))}">${icon(s2.icon)}</i>` : ''; }).join('');
    const html = `
      <div class="bf ${(s === g.kyoku) ? 'dealer' : ''} ${p && p.riichi ? 'rii' : ''}" style="--c:${c.color}"><img src="${charImg(c, 'face')}" alt=""><em>${wind}</em></div>
      <div class="bt"><b>${esc(L(c.name))}</b><span class="sc">${g.scores[s].toLocaleString()}</span>
        <span class="bk">${p && p.riichi ? `<i class="rbadge">${t('riichi')}</i>` : ''}${chips}${DB.set.skills && g.rules.skills ? `<i class="sk ${p && p.skillUsed ? 'used' : ''}" style="--sc:${sk.color}" title="${esc(L(sk.name))}">${icon(sk.icon)}</i>` : ''}</span></div>`;
    if (s === ME) renderMe(html);
    else $('#opp' + s).innerHTML = html;
  }
}
function renderMe(badgeHtml) {
  const g = G, c = UIS.chars[ME], sk = MJSkills.get(c.skill);
  const p = g.P ? g.P[ME] : null;
  const cost = g.skillCost ? g.skillCost(ME) : 0;
  const skillsOn = g.rules.skills;
  const can = UIS.opts && UIS.opts.canSkill;
  $('#mePanel').innerHTML = `
    <div class="mb">${badgeHtml}</div>
    ${skillsOn ? `<button class="skb ${can ? 'ready' : ''} ${p && p.skillUsed ? 'used' : ''}" id="skBtn" style="--sc:${sk.color}" ${can ? '' : 'disabled'}>
      <i>${icon(sk.icon)}</i><span><b>${esc(L(sk.name))}</b><small>${p && p.skillUsed ? t('used') : cost ? t('cost', { n: cost.toLocaleString() }) : t('free')} · ${esc(L(sk.short))}</small></span></button>` : ''}`;
  const b = $('#skBtn');
  if (b) b.onclick = async () => {
    if (!UIS.opts || !UIS.opts.canSkill || !UIS.resolve) return;
    if (cost > 0 && !(await confirmBox(t('skillCostQ', { n: cost.toLocaleString() })))) return;
    const r = UIS.resolve; UIS.resolve = null; UIS.opts = null; clearActs();
    r({ act: 'skill' });
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
  $('#hand').innerHTML = `<div class="hrow">${ids.map(id => tileHTML(id, cls(id))).join('')}${dr != null ? `<span class="gap"></span>${tileHTML(dr, cls(dr) + ' drawn')}` : ''}</div><div class="melds">${melds}</div>`;
  $('#hand').classList.toggle('active', !!o);
}
const handEl = $('#hand');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
handEl.addEventListener('pointerover', e => { const el = e.target.closest('.tl[data-id]'); if (el && TB) TB.highlightType(T(+el.dataset.id)); });
handEl.addEventListener('pointerleave', () => { if (TB) TB.highlightType(null); });
handEl.addEventListener('click', e => {
  const el = e.target.closest('.tl[data-id]');
  if (!el || !UIS || UIS.kind !== 'turn' || !UIS.resolve) return;
  if (el.classList.contains('no')) return;
  const id = +el.dataset.id;
  if (!fine.matches && UIS.picked !== id) { UIS.picked = id; SND.pick(); renderHand(); TB.highlightType(T(id)); return; }
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
function clearActs() { $('#acts').innerHTML = ''; $('#chiPick').hidden = true; }
function btn(label, cls, fn) { const b = document.createElement('button'); b.className = 'ab ' + cls; b.innerHTML = label; b.onclick = fn; $('#acts').appendChild(b); return b; }

function myTurn(o, res) {
  UIS.opts = o; UIS.kind = 'turn'; UIS.resolve = res; UIS.riichiMode = false; UIS.picked = null;
  UIS.drawn = o.drawn ?? null;
  renderHand(); renderBadges();
  clearActs();
  const finish = a => { const r = UIS.resolve; if (!r) return; UIS.resolve = null; UIS.opts = null; UIS.kind = null; clearActs(); renderHand(); r(a); };
  if (o.canTsumo) btn(t('tsumo'), 'win', () => finish({ act: 'tsumo' }));
  if (o.riichi && o.riichi.length) btn(t('riichi'), 'rii', e => {
    UIS.riichiMode = !UIS.riichiMode; e.currentTarget.classList.toggle('on', UIS.riichiMode);
    e.currentTarget.innerHTML = UIS.riichiMode ? t('cancel') : t('riichi');
    renderHand();
  });
  const kans = (o.ankans || []).map(x => ['ankan', x]).concat((o.kakans || []).map(x => ['kakan', x]));
  for (const [k, tt] of kans) btn(`${t('kan')}${typeHTML(tt, 'xs')}`, 'call', () => finish({ act: k, t: tt }));
  if (o.canKyuushu) btn(t('kyuushu'), 'call', () => finish({ act: 'kyuushu' }));
  // riichi: auto tsumogiri when there is nothing else to do
  if (o.mustTsumogiri && !o.canTsumo && !(o.ankans && o.ankans.length) && !o.canSkill) {
    setTimeout(() => { if (UIS.resolve === res) doDiscard(o.drawn); }, 420);
  }
}
function myCall(o, res) {
  UIS.kind = 'call'; UIS.opts = o;
  clearActs();
  let done = false;
  const finish = a => { if (done) return; done = true; clearActs(); UIS.kind = null; UIS.opts = null; res(a); };
  if (o.canRon) btn(t('ron'), 'win', () => finish({ act: 'ron' }));
  if (o.pons) btn(t('pon'), 'call', () => finish({ act: 'pon', use: o.pons[0] }));
  if (o.minkan) btn(t('kan'), 'call', () => finish({ act: 'minkan' }));
  if (o.chis) btn(t('chi'), 'call', () => {
    if (o.chis.length === 1) return finish({ act: 'chi', use: o.chis[0] });
    const pk = $('#chiPick');
    pk.innerHTML = o.chis.map((u, i) => `<button data-i="${i}">${[...u, o.tile].sort((a, b) => a - b).map(id => tileHTML(id, 'xs' + (id === o.tile ? ' hl' : ''))).join('')}</button>`).join('');
    pk.hidden = false;
    pk.onclick = e => { const b = e.target.closest('[data-i]'); if (b) finish({ act: 'chi', use: o.chis[+b.dataset.i] }); };
  });
  btn(t('skip'), 'skip', () => finish({ act: 'pass' }));
  TB.highlightType(T(o.tile));
}

// ---------------------------------------------------------------- intel (peek / mind read)
function showIntel(info) {
  const el = $('#intel');
  let h = '';
  if (info.peek) h += `<h4>${t('peekT')}</h4><div class="it">${info.peek.map(id => tileHTML(id, 'xs')).join('')}</div>`;
  if (info.read) h += `<h4>${t('mindT')}</h4>` + info.read.map(r => `<div class="ir"><img src="${charImg(UIS.chars[r.seat], 'face')}" alt=""><span>${r.shanten === 0 ? `<b>${t('tenpai')}</b> ${r.waits.map(w => typeHTML(w, 'xs')).join('')}` : r.shanten < 0 ? t('tenpai') : t('shanten', { n: r.shanten })}</span></div>`).join('');
  el.innerHTML = h + '<button class="x">×</button>';
  el.hidden = false;
  el.querySelector('.x').onclick = () => { el.hidden = true; };
}

// ---------------------------------------------------------------- banners, callouts, cut-ins
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
  const c = UIS.chars[s];
  const el = $('#cutin');
  let word, sub = '';
  if (kind === 'skill') { const sk = MJSkills.get(d.skill); word = L(sk.name); sub = L(sk.short) + (d.cost ? ` ・ ${t('cost', { n: d.cost.toLocaleString() })}` : ''); }
  else word = I18N.lang === 'ja' ? WORD[kind].ja : WORD[kind].en;
  const kana = kind === 'riichi' ? t('riichi') : kind === 'tsumo' ? t('tsumo') : kind === 'ron' ? t('ron') : '';
  const line = c.lines && c.lines[kind] ? L(c.lines[kind]) : '';
  const sk = MJSkills.get(c.skill);
  el.className = `cutin k-${kind} ${s === ME ? 'me' : ''}`;
  el.style.setProperty('--c', c.color); el.style.setProperty('--c2', c.color2); el.style.setProperty('--sc', sk.color);
  el.innerHTML = `
    <div class="ci-dim"></div>
    <div class="ci-band"><div class="ci-lines"></div></div>
    <div class="ci-art"><img src="${charImg(c, 'full')}" alt=""></div>
    <div class="ci-txt">
      <div class="ci-word" data-len="${word.length}">${esc(word)}</div>
      ${kana && I18N.lang === 'ja' ? `<div class="ci-kana">${esc(kana)}</div>` : ''}
      ${sub ? `<div class="ci-sub">${esc(sub)}</div>` : ''}
      <div class="ci-line"><b>${esc(L(c.name))}</b>「${esc(line)}」</div>
    </div>
    <div class="ci-flash"></div>`;
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('show');
  if (kind === 'riichi') SND.riichi(); else if (kind === 'skill') SND.skill(); else SND.ok();
  await sleep(kind === 'skill' ? 1700 : kind === 'riichi' ? 1450 : 1500);
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
function waitClick(box, sel) { return new Promise(res => { const b = box.querySelector(sel); b.onclick = () => { SND.pick(); res(); }; if (AUTO) setTimeout(res, 1600); }); }

async function showAgari(d, r, last) {
  const c = UIS.chars[r.seat], res = r.res;
  const yl = res.list.filter(([k, h]) => !(k === 'ura' && !h && !(G.P[r.seat].riichi))).map(([k, h]) =>
    `<div class="yk"><span>${esc(I18N.yaku(k))}</span><b>${res.yakumanN ? (h >= 26 ? t('dbl_yakuman') : t('yakuman')) : t('han', { n: h })}</b></div>`).join('');
  const hand = r.hand.slice(0, r.tsumo ? -1 : r.hand.length - 1).sort((a, b) => a - b);
  const melds = r.melds.map(m => `<span class="meld">${m.tiles.map((id, i) => m.type === 'ankan' && (i === 0 || i === 3) ? backHTML('sm') : tileHTML(id, 'sm')).join('')}</span>`).join('');
  const pays = r.moves.filter(m => m[2] !== 'shugi').reduce((a, m) => a + m[1], 0);
  const lim = res.limit ? t(res.limit) : '';
  const pts = pays;
  const box = modal(`
    <div class="agari" style="--c:${c.color};--c2:${c.color2}">
      <div class="ag-art"><img src="${charImg(c, 'bust')}" alt=""><div class="ag-who"><b>${esc(L(c.name))}</b><span>${r.tsumo ? t('tsumo') : t('ron')}</span></div></div>
      <div class="ag-main">
        <div class="ag-hand">${hand.map(id => tileHTML(id, 'md')).join('')}${melds}<span class="gap"></span>${tileHTML(r.winId, 'md win')}</div>
        <div class="ag-dora"><span><small>${t('dora')}</small>${d.dora.map(x => typeHTML(x, 'xs')).join('')}</span>${G.P[r.seat].riichi ? `<span><small>${I18N.yaku('ura')}</small>${d.ura.slice(0, d.dora.length).map(x => typeHTML(x, 'xs')).join('')}</span>` : ''}</div>
        <div class="ag-yaku">${yl}</div>
        <div class="ag-total">${res.yakumanN ? '' : `<span>${t('fu', { n: res.fu })} ${t('han', { n: res.han })}</span>`}<b>${pts.toLocaleString()}</b>${lim ? `<em class="stamp">${esc(lim)}</em>` : ''}</div>
        ${res.shugi ? `<div class="ag-note">${esc(I18N.L(MJSkills.get('shugi').name))} ×${res.shugi}</div>` : ''}
        ${scoreRows(d, [r.seat])}
        <button class="btn gold nx">${t('next')}</button>
      </div>
    </div>`, 'wide res');
  await waitClick(box, '.nx');
  if (last) closeModal();
}
async function showRyuukyoku(d) {
  const ab = d.abort ? t('abort')[d.abort] || d.abort : '';
  const box = modal(`
    <div class="ryu">
      <h2>${t('ryuukyoku')}${ab ? ` <small>${esc(ab)}</small>` : ''}</h2>
      <div class="rh">${[0, 1, 2, 3].map(s => `<div class="rhr"><img src="${charImg(UIS.chars[s], 'face')}" alt=""><b class="${d.tenpai[s] ? 'tp' : ''}">${d.tenpai[s] ? t('tenpai') : t('noten')}</b>
        <div class="rht">${d.tenpai[s] ? d.hands[s].slice().sort((a, b) => a - b).map(id => tileHTML(id, 'xs')).join('') : ''}</div></div>`).join('')}</div>
      ${scoreRows(d)}
      <button class="btn gold nx">${t('next')}</button>
    </div>`, 'wide res');
  await waitClick(box, '.nx');
  closeModal();
}
async function showFinal(d) {
  const rank = d.rank;
  const myRank = rank.indexOf(ME);
  const coins = [220, 140, 90, 60][myRank] + (G.rules.length === 'south' ? 60 : 0);
  DB.coins += coins; DB.stats.games++; DB.stats.rank[myRank]++; save();
  const box = modal(`
    <div class="final">
      <h2>${t('final')}</h2>
      <div class="fr">${rank.map((s, i) => { const c = UIS.chars[s]; return `<div class="fi r${i} ${s === ME ? 'me' : ''}" style="--c:${c.color}"><em>${t('rank')[i]}</em><img src="${charImg(c, 'face')}" alt=""><b>${esc(L(c.name))}${s === ME ? ` <small>(${t('you')})</small>` : ''}</b><span>${d.scores[s].toLocaleString()}</span></div>`; }).join('')}</div>
      <div class="earn">${icon('coin')} ${t('earned', { n: coins })}</div>
      <div class="cbtns"><button class="btn" data-a="home">${t('toHome')}</button><button class="btn gold" data-a="again">${t('again')}</button></div>
    </div>`, 'wide res');
  SND.ok();
  await new Promise(res => box.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    closeModal();
    if (a.dataset.a === 'home') quitGame(); else { UIS.abort = true; startGame(); }
    res();
  }));
}

// ---------------------------------------------------------------- keyboard
document.addEventListener('keydown', e => {
  if (!UIS || $('#game').hidden) return;
  if (e.key === 'Escape') { if (UIS.kind === 'call') { const s = $('#acts .skip'); if (s) s.click(); } else if (UIS.riichiMode) { const b = $('#acts .rii'); if (b) b.click(); } }
});

// ---------------------------------------------------------------- boot
I18N.set(I18N.lang);
document.fonts && document.fonts.load('800 40px "Shippori Mincho B1"', '一萬東南西北發中雀華').then(() => { MJTiles.reset(); ART.clear(); renderHome(); });
renderHome();
window.JANKA = { get G() { return G; }, get UIS() { return UIS; }, get TB() { return TB; }, DB, startGame, quitGame };
})();
