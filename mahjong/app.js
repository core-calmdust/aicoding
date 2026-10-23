// 雀華 (JANKA) — app: home portal, gacha, game screen (3D table + HTML hand), cut-ins, results.
(function () {
'use strict';
const $ = s => document.querySelector(s);
const t = (k, v) => I18N.t(k, v);
const L = o => I18N.L(o);
const T = id => id >> 2;
const FAST = /[?&]fast/.test(location.search) ? 0.12 : 1;
const sleep = ms => new Promise(r => setTimeout(r, ms * FAST));
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
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  d.set = Object.assign({ len: 'east', skills: true, lv: 2, snd: true, lite: weak }, d.set || {});
  d.stats = Object.assign({ games: 0, rank: [0, 0, 0, 0] }, d.stats || {});
  return d;
}
const owns = id => !!DB.chars[id];
function useKey(id) { const o = DB.chars[id]; return o ? (o.skills.includes(o.use) ? o.use : o.skills[0]) : null; }
function seatChar(c, key) { const k = MJSkills.parse(key); return Object.assign({}, c, { skill: k.id, tier: k.tier }); }
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
function charImg(c, kind) {          // kind: 'full' | 'bust' | 'face' | 'thumb'
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
function skillChip(key, cls = '', attrs = '') {
  const k = MJSkills.parse(key), sk = MJSkills.get(k.id);
  return `<span class="skc st${k.tier} ${cls}" style="--sc:${sk.color}" ${attrs}><i>${icon(sk.icon)}</i><b>${esc(L(sk.name))}</b><em>${MJSkills.TIERS[k.tier]}</em></span>`;
}
function skillBlock(key) {
  const k = MJSkills.parse(key), sk = MJSkills.get(k.id), v = MJSkills.val(sk, k.tier);
  return `<div class="pskill st${k.tier}" style="--sc:${sk.color}"><i>${icon(sk.icon)}</i><div>
    <b>${esc(L(sk.name))} <em class="sr">${MJSkills.TIERS[k.tier]}</em> <em class="tm">${t('timing_' + (sk.timing || 'turn'))}</em></b>
    <span>${esc(L(sk.desc(v)))}</span>
    <small class="cl">${esc(t('costLine', { n: (sk.cost || 1000).toLocaleString() }))}</small></div></div>`;
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
  $('#btnLite').innerHTML = IC.bolt; applyLite();
  const c = MJChars.get(DB.sel);
  const o = DB.chars[c.id], uk = useKey(c.id);
  $('#partner').innerHTML = `
    <button class="pimg frame fr-${c.rarity}" id="pImg" style="--c:${c.color};--c2:${c.color2}"><img src="${charImg(c, 'full')}" alt=""><i class="fx-sh"></i><span class="ptap">${esc(t('tapChange'))}</span></button>
    <div class="pinfo">
      <div class="prar r-${c.rarity}">${c.rarity}</div>
      <div class="pname">${esc(L(c.name))}<small>${esc(L(c.title))}</small></div>
      ${skillBlock(uk)}
      ${o.skills.length > 1 ? `<div class="skpick"><small>${t('useThis')}</small><div class="skl" id="homeSk">${o.skills.map(k => skillChip(k, k === uk ? 'on' : '', `data-k="${k}"`)).join('')}</div></div>` : ''}
      <p class="pprof">${esc(L(c.profile))}</p>
    </div>`;
  const hs = $('#homeSk');
  if (hs) hs.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; DB.chars[c.id].use = b.dataset.k; save(); SND.pick(); renderHome(); };
  const seg = (el, items, cur, cb) => {
    el.innerHTML = items.map(([v, lab]) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${esc(lab)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; SND.pick(); cb(b.dataset.v); save(); renderHome(); };
  };
  seg($('#optLen'), [['east', t('east')], ['south', t('south')]], DB.set.len, v => DB.set.len = v);
  seg($('#optSkill'), [['1', t('skillOn')], ['0', t('skillOff')]], DB.set.skills ? '1' : '0', v => DB.set.skills = v === '1');
  seg($('#optLv'), t('lv').map((x, i) => [String(i), x]), String(DB.set.lv), v => DB.set.lv = +v);
}
$('#partner').addEventListener('click', e => { if (e.target.closest('#pImg')) { SND.pick(); openChara(DB.sel); } });
$('#langSel').addEventListener('change', e => { I18N.set(e.target.value); renderHome(); });
function applyLite() {
  document.documentElement.classList.toggle('lite', !!DB.set.lite);
  const b = $('#btnLite');
  if (b) { b.classList.toggle('on', !!DB.set.lite); b.title = t(DB.set.lite ? 'liteOn' : 'liteOff'); b.setAttribute('aria-label', b.title); }
  if (TB) TB.setQuality(DB.set.lite ? 'lite' : 'high');
}
$('#btnLite').addEventListener('click', () => { DB.set.lite = !DB.set.lite; save(); applyLite(); toast(t(DB.set.lite ? 'liteOn' : 'liteOff')); });
$('#btnSnd').addEventListener('click', () => { DB.set.snd = !DB.set.snd; save(); sndIcons(); SND.unlock(); });
$('#gSnd').addEventListener('click', () => { DB.set.snd = !DB.set.snd; save(); sndIcons(); });
// phones always use the landscape layout; held upright, the whole UI is turned 90° (no reliance on the OS rotation)
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
function fitRoot() {
  const w = innerWidth, h = innerHeight, de = document.documentElement;
  const rot = PHONE && h > w;
  de.classList.toggle('lp', PHONE); de.classList.toggle('rot', rot);
  de.style.setProperty('--W', (rot ? h : w) + 'px'); de.style.setProperty('--H', (rot ? w : h) + 'px');
  // desktop: home and character screens are laid out at a 1280-wide landscape design size and scaled to fit
  de.classList.toggle('ds', !PHONE);
  if (!PHONE) {
    const GW = Math.min(w, h * 2.0), GH = Math.min(h, w / 1.45);
    const Z = Math.max(.5, Math.min(GW / 1280, GH / 760, 1.6));
    // game HUD scale for big windows (icons, panels and tiles grow with the window instead of stopping at fixed px)
    de.style.setProperty('--hz', Math.max(1, Math.min(2, Math.min(h, w / 1.36) / 860)).toFixed(3));
    de.style.setProperty('--SW', GW + 'px'); de.style.setProperty('--SH', GH + 'px'); de.style.setProperty('--Z', Z);
    de.style.setProperty('--SX', ((w - GW) / 2) + 'px'); de.style.setProperty('--SY', ((h - GH) / 2) + 'px');
  }
}
fitRoot();
addEventListener('resize', fitRoot);
addEventListener('orientationchange', () => setTimeout(fitRoot, 120));
$('#btnStart').addEventListener('click', () => { SND.unlock(); startGame(); });
$('#btnGacha').addEventListener('click', openGacha);
$('#btnColl').addEventListener('click', () => openChara(DB.sel));
$('#chBack').addEventListener('click', () => { SND.pick(); closeChara(); });

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
  let pool = MJChars.list.filter(c => c.rarity === r);
  if (!pool.length) pool = MJChars.list;
  return pool[(Math.random() * pool.length) | 0];
}
const DUPE = { N: 30, R: 80, SR: 250, SSR: 800, UR: 2000 };
const RANK_I = r => ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(r);
function openGacha() {
  const b = modal(`
    <div class="gacha">
      <h2>${t('gacha')}</h2>
      <div class="gstage" id="gStage"><div class="gorb"></div><p class="grates">${t('charRates')} UR 1% ・ SSR 4% ・ SR 15% ・ R 35% ・ N 45%<br>${t('skillRates')} SSR 3% ・ SR 12% ・ R 30% ・ N 55%<br><small>${t('tenth')}</small></p></div>
      <div class="gbtns">
        <button class="btn" data-n="1">${t('pull1', { n: COST1 })}</button>
        <button class="btn gold" data-n="10">${t('pull10', { n: COST10.toLocaleString() })}</button>
      </div>
      <div class="gcoins">${icon('coin')}<b id="gCoins">${DB.coins.toLocaleString()}</b></div>
      <button class="x" data-a="close">×</button>
    </div>`, 'wide');
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
      <div class="gcn"><em>${g.c.rarity}</em>${esc(L(g.c.name))}${skillChip(g.key, 'sm')}</div>
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
  renderChara();
}
function closeChara() { $('#chara').hidden = true; $('#home').hidden = false; renderHome(); }
function renderChara() {
  applyText();
  $('#coinN2').textContent = DB.coins.toLocaleString();
  $('#chara .coin').innerHTML = IC.coin;
  const list = MJChars.list.slice().sort((a, b) => (!owns(a.id)) - (!owns(b.id)) || RORD[a.rarity] - RORD[b.rarity] || FORD.indexOf(a.family) - FORD.indexOf(b.family));
  $('#chCount').textContent = `${t('owned')} ${Object.keys(DB.chars).length} / ${MJChars.list.length}`;
  $('#chList').innerHTML = list.map(c => {
    const own = owns(c.id);
    return `<button class="chi ${own ? '' : 'lock'} ${c.id === chView ? 'on' : ''}" data-id="${c.id}" style="--c:${c.color}">
      ${frame(c, 'face')}<em class="r-${c.rarity}">${c.rarity}</em>${own ? '' : `<i class="lk">${IC.lock}</i>`}${c.id === DB.sel ? '<i class="pm">★</i>' : ''}<span>${own ? esc(L(c.name)) : '？？？'}</span></button>`;
  }).join('');
  const c = MJChars.get(chView), own = owns(c.id);
  const art = $('#chArt');
  art.className = `ch-art frame ${own ? 'fr-' + c.rarity : 'fr-lock'}`;
  art.style.setProperty('--c', c.color); art.style.setProperty('--c2', c.color2);
  art.innerHTML = `<img class="${own ? '' : 'lock'}" src="${charImg(c, 'full')}" alt=""><i class="fx-sh"></i>` +
    (own ? '' : `<div class="unlock"><i>${IC.lock}</i><b>${esc(t('lockedT'))}</b><span>${esc(t('lockedS', { r: c.rarity }))}</span><button class="go sm" data-a="gacha">${esc(t('toGacha'))}</button></div>`);
  art.onclick = e => { if (e.target.closest('[data-a=gacha]')) { SND.pick(); openGacha(); } };
  const sisters = MJChars.list.filter(x => x.family === c.family);
  const o = DB.chars[c.id], uk = own ? useKey(c.id) : null;
  $('#chInfo').innerHTML = `
    <div class="prar r-${c.rarity}">${c.rarity}</div>
    <div class="pname">${own ? esc(L(c.name)) : '？？？'}<small>${esc(L(c.title))}</small></div>
    ${own ? `${skillBlock(uk)}
      <div class="skpick"><small>${t('ownedSkills')} ${o.skills.length}${o.skills.length > 1 ? ` ・ ${t('useThis')}` : ''}</small>
      <div class="skl" id="chSk">${o.skills.map(k => skillChip(k, k === uk ? 'on' : '', `data-k="${k}"`)).join('')}</div></div>
      <p class="pprof">${esc(L(c.profile))}</p>` : `<div class="chsel lockline"><i>${IC.lock}</i>${esc(t('notOwned'))}</div>`}
    <div class="sis"><small>${esc(L(MJChars.families[c.family].name))}</small><div>${sisters.map(x => `<button class="sib ${x.id === c.id ? 'on' : ''} ${owns(x.id) ? '' : 'lock'}" data-id="${x.id}">${frame(x, 'face')}</button>`).join('')}</div></div>
    ${own ? (c.id === DB.sel ? `<div class="chsel on">★ ${t('isPartner')}</div>` : `<button class="go sm" id="chSet">${t('setPartner')}</button>`) : ''}`;
  const b = $('#chSet');
  if (b) b.onclick = () => { DB.sel = c.id; save(); SND.ok(); renderChara(); };
  $('#chInfo').onclick = e => {
    const k = e.target.closest('#chSk [data-k]'); if (k) { DB.chars[c.id].use = k.dataset.k; save(); SND.pick(); renderChara(); return; }
    const sb = e.target.closest('.sib'); if (sb) { chView = sb.dataset.id; SND.pick(); renderChara(); }
  };
}
$('#chList').addEventListener('click', e => { const b = e.target.closest('.chi'); if (!b) return; chView = b.dataset.id; SND.pick(); renderChara(); });

// ================================================================ GAME
let G = null;          // MJGame
let TB = null;         // Table3D
let UIS = null;        // ui state for the game screen
const ME = 0;

class Human {
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

async function startGame() {
  $('#home').hidden = true; $('#game').hidden = false;
  closeModal();
  if (!TB) { TB = new Table3D($('#stage')); TB.setQuality(DB.set.lite ? 'lite' : 'high'); }
  TB.resume();
  TB.hideAll();
  const me = seatChar(MJChars.get(DB.sel), useKey(DB.sel));
  const others = MJChars.list.filter(c => c.id !== me.id).sort(() => Math.random() - .5).slice(0, 3).map(c => seatChar(c, rollSkillKey()));
  const chars = [me, ...others];
  chars.forEach(c => { const im = new Image(); im.src = charImg(c, 'full'); });   // cut-in art, loaded in advance
  UIS = { chars, abort: false, hand: [], intel: null, picked: null, riichiMode: false, resolve: null, opts: null, kind: null };
  const auto = /[?&]auto/.test(location.search);
  const agents = [auto ? new AutoMe(DB.set.lv) : new Human(), new SlowBot(DB.set.lv), new SlowBot(DB.set.lv), new SlowBot(DB.set.lv)];
  G = new MJGame({ agents, chars, rules: { length: DB.set.len, skills: DB.set.skills }, ui: onEvent });
  UIS.game = G;
  $('#gSnd').innerHTML = DB.set.snd ? IC.snd : IC.mute; $('#gExit').innerHTML = IC.exit;
  $('#khelp').innerHTML = t('keys');
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
  $('#dealAsk').hidden = true;
  G = null;
  $('#game').hidden = true; $('#home').hidden = false;
  if (TB) TB.pause();
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
      <div class="bf ${(s === g.kyoku) ? 'dealer' : ''} ${p && p.riichi ? 'rii' : ''}" style="--c:${c.color}">${frame(c, 'face')}<em>${wind}</em>${p && p.riichi ? `<i class="riiflag">${esc(t('riichi'))}</i>` : ''}</div>
      <div class="bt"><b>${esc(L(c.name))}</b><span class="sc">${g.scores[s].toLocaleString()}</span>
        <span class="bk">${p && p.riichi ? `<i class="rbadge">${t('riichi')}</i>` : ''}${chips}${DB.set.skills && g.rules.skills ? `<i class="sk ${p && p.skillUsed ? 'used' : ''}" style="--sc:${sk.color}" title="${esc(L(sk.name))} ${MJSkills.TIERS[c.tier | 0]}">${icon(sk.icon)}<b class="tr">${MJSkills.TIERS[c.tier | 0]}</b></i>` : ''}</span></div>`;
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
      <kbd class="skk">S</kbd><i>${icon(sk.icon)}</i><span><b>${esc(L(sk.name))} <em class="sr st${c.tier | 0}">${MJSkills.TIERS[c.tier | 0]}</em></b><small>${p && p.skillUsed ? t('used') : (sk.timing === 'deal' ? t('dealOnly') + ' · ' : '') + (cost ? t('cost', { n: cost.toLocaleString() }) : t('free'))} · ${esc(L(sk.short(MJSkills.val(sk, c.tier))))}</small></span></button>` : ''}`;
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
  const kl = i => `<kbd class="tk">${HAND_LABELS[i] || ''}</kbd>`;
  $('#hand').innerHTML = `<div class="hrow">${ids.map((id, i) => tileHTML(id, cls(id)).replace('</span>', kl(i) + '</span>')).join('')}<span class="gap"></span>${dr != null ? tileHTML(dr, cls(dr) + ' drawn').replace('</span>', '<kbd class="tk">Space</kbd></span>') : '<span class="tl ph"></span>'}</div><div class="melds">${melds}</div>`;
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
    setTimeout(() => { if (UIS.resolve === res) doDiscard(o.drawn); }, 420);
  }
}
function myCall(o, res) {
  UIS.kind = 'call'; UIS.opts = o;
  clearActs();
  let done = false;
  const finish = a => { if (done) return; done = true; clearActs(); UIS.kind = null; UIS.opts = null; res(a); };
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
  TB.highlightType(T(o.tile));
}

// PC: call buttons sit just above the draw-tile slot at the right end of the hand (not in the rotated phone layout)
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
  if (!UIS || UIS.kind !== 'call') return;
  if (e.target.closest('#acts, #chiPick, .tbtns, #skBtn, #dealAsk')) return;
  const s = $('#acts .skip'); if (s) s.click();
});

// ---------------------------------------------------------------- deal-time skill prompt
function askDealSkill(o, res) {
  const sk = MJSkills.get(o.skill);
  const el = $('#dealAsk');
  el.style.setProperty('--sc', sk.color);
  el.innerHTML = `<i>${icon(sk.icon)}</i>
    <div class="da-t"><b>${esc(t('dealQ', { name: L(sk.name) + ' ' + MJSkills.TIERS[o.tier | 0] }))}</b><span>${esc(L(sk.desc(MJSkills.val(sk, o.tier))))}</span><small>${o.cost ? t('cost', { n: o.cost.toLocaleString() }) : t('free')}</small></div>
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
  if (kind === 'skill') { const sk = MJSkills.get(d.skill); word = L(sk.name); sub = MJSkills.TIERS[d.tier | 0] + ' ・ ' + L(sk.short(MJSkills.val(sk, d.tier))) + (d.cost ? ` ・ ${t('cost', { n: d.cost.toLocaleString() })}` : ''); }
  else word = I18N.lang === 'ja' ? WORD[kind].ja : WORD[kind].en;
  const kana = kind === 'riichi' ? t('riichi') : kind === 'tsumo' ? t('tsumo') : kind === 'ron' ? t('ron') : '';
  const line = c.lines && c.lines[kind] ? L(c.lines[kind]) : '';
  const sk = MJSkills.get(c.skill);
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
      ${sub ? `<div class="ci-sub">${esc(sub)}</div>` : ''}
      <div class="ci-line"><b>${esc(L(c.name))}</b>「${esc(line)}」</div>
    </div>
    <div class="ci-flash"></div>`;
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('show');
  if (kind === 'riichi') SND.riichi(); else if (kind === 'skill') SND.skill(); else SND.ok();
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
      <div class="ag-art frame fr-${c.rarity}"><img src="${charImg(c, 'bust')}" alt=""><i class="fx-sh"></i><div class="ag-who"><b>${esc(L(c.name))}</b><span>${r.tsumo ? t('tsumo') : t('ron')}</span></div></div>
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
      <div class="fr">${rank.map((s, i) => { const c = UIS.chars[s]; return `<div class="fi r${i} ${s === ME ? 'me' : ''}" style="--c:${c.color}"><em>${t('rank')[i]}</em>${frame(c, 'face')}<b>${esc(L(c.name))}${s === ME ? ` <small>(${t('you')})</small>` : ''}</b><span>${d.scores[s].toLocaleString()}</span></div>`; }).join('')}</div>
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
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
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
  if (k === 's') { const b = $('#skBtn'); if (b && !b.disabled) { e.preventDefault(); b.click(); } return; }
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
document.fonts && document.fonts.load('800 40px "Shippori Mincho B1"', '一萬東南西北發中雀華').then(() => { MJTiles.reset(); ART.clear(); renderHome(); });
renderHome();
window.JANKA = { get G() { return G; }, get UIS() { return UIS; }, get TB() { return TB; }, DB, startGame, quitGame };
})();
