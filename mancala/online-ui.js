/* Luxe Mancala — online play UI (lobby dialog, PC dock / phone tab, online games, result & rematch, spectating),
   first-visit profile dialog, Google link and cloud sync of local progress. Ported from the Nine Men's Morris page.
   Loaded after app.js; uses its globals (settings, game, P, cur, playMove, update, renderInfo, toast, t, …). Backend: online.js (MancalaOnline).
   Extra turns: the opponent may send several moves in a row; they are animated one after another (olCatchUp). */
'use strict';
const ON = window.MancalaOnline;
const olOn = () => !!(ON && ON.available);
const olEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GLOGO = '<svg class="glogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
const olClock = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const tcText = v => { const c = ON.TC[v] || ON.TC[ON.DEF_V]; return t('ol.tcFmtD', { m: c.main / 60000, s: ON.DELAY / 1000 }); };
const varName = v => { v = ON.VARIANTS.includes(v) ? v : ON.DEF_V; return t('rule.' + ON.ruleOf(v)) + ' · ' + t('ng.seedsN', { n: ON.seedsOf(v) }); };
const showOv = id => $(id).classList.add('show');
const hideOv = id => $(id).classList.remove('show');
const isShown = id => $(id).classList.contains('show');

// ====================================================================== markup (injected so index.html stays small)
document.body.insertAdjacentHTML('beforeend', `
<div class="overlay" id="onlineOverlay"><div class="modal"><h2 data-i18n="ol.title"></h2><div id="olBody"></div>
  <div class="modal-actions"><button class="mbtn" id="olClose" data-i18n="close"></button></div></div></div>
<div class="overlay" id="profOverlay"><div class="modal" style="width:min(460px,100%)">
  <h2 data-i18n="pf.title"></h2>
  <p class="ol-note" data-i18n="pf.desc"></p>
  <label class="pf-lbl" for="pfName" data-i18n="pf.name"></label>
  <input id="pfName" class="pf-input" maxlength="16" autocomplete="nickname" spellcheck="false">
  <div class="syncbox" id="pfG"><b data-i18n="sync.title"></b><p data-i18n="pf.gdesc"></p></div>
  <div class="modal-actions"><button class="mbtn" id="pfLater" data-i18n="pf.later"></button><button class="mbtn go gbtn" id="pfGoogle">${GLOGO}<span data-i18n="sync.google"></span></button></div>
</div></div>
<div class="overlay" id="olConfirm"><div class="modal" style="width:min(420px,100%)"><p id="olcText" class="ol-note" style="font-size:15px;color:var(--text)"></p>
  <div class="modal-actions"><button class="mbtn" id="olcNo" data-i18n="close"></button><button class="mbtn go" id="olcYes"></button></div></div></div>
<div class="dock" id="dock">
  <div class="dock-bar">
    <span class="dk-dot"></span><span class="dk-title" data-i18n="ol.title"></span><button id="dkUnread" class="dk-unread hidden" type="button">💬<b>0</b></button><span class="dk-stat" id="dkStat"></span><span class="dk-sp"></span>
    <button class="dk-btn dk-soon" id="dkSoon" data-i18n="ol.soonMore"></button>
    <span class="dk-me" id="dkMe"></span>
    <button class="dk-btn dk-g" id="dkG"></button>
    <button class="dk-btn dk-myroom hidden" id="dkMyRoom"></button>
    <button class="dk-btn" id="dkRoom" data-i18n="ol.makeRoom"></button>
    <button class="dk-btn go" id="dkAuto" data-i18n="ol.find"></button>
    <button class="dk-btn tg" id="dkToggle" aria-label="toggle">▲</button>
  </div>
  <div class="dock-panel">
    <section class="dk-pl"><h4 data-i18n="ol.online"></h4><div class="ol-list" id="dkPlayers"></div></section>
    <section class="dk-ro"><h4 data-i18n="ol.rooms"></h4><div class="ol-list ol-rooms" id="dkRooms"></div></section>
    <section class="dk-rk"><h4 data-i18n="ol.rank"></h4><div class="ol-list" id="dkRank"></div></section>
    <section class="dk-acc"><h4 data-i18n="sync.title"></h4><div id="dkAcc"></div></section>
    <section class="dk-chat"><h4 id="dkChatHead"><span data-i18n="ol.chat"></span></h4><div class="chat-list" id="dkChat" role="log" aria-live="polite"></div><form class="chat-form" id="dkChatForm" autocomplete="off"><input id="dkChatIn" maxlength="100" enterkeyhint="send" autocomplete="off"><button type="submit" class="dk-btn go" id="dkChatSend"></button></form></section>
  </div>
</div>
<nav class="mtabs" id="mtabs"><button data-t="game" class="sel" data-i18n="ol.tabGame"></button><button data-t="online"><span data-i18n="ol.title"></span> <em id="mtCount"></em> <em class="mt-chat" id="mtChat"></em></button></nav>
<div class="mt-strip" id="mtStrip" role="button"></div>`);
// online game info (rated / room, rules, watchers, "stop watching") at the top of the evaluation card; clocks in the player plates
$('#evalCard').insertAdjacentHTML('afterbegin', '<div class="ol-watch hidden" id="olWatch" aria-live="polite"></div>');
['Top', 'Bot'].forEach(w => $('#score' + w).insertAdjacentHTML('beforebegin', `<span class="pclk" id="clk${w}"></span>`));
$('#segMode').insertAdjacentHTML('beforeend', '<button data-v="online" data-i18n="ol.title"></button>');
$('#resultOverlay .modal-actions').insertAdjacentHTML('beforebegin', '<div class="ol-res hidden" id="olRes"></div>');
// the new-game dialog: "online" shows a short description and opens the online dialog
{ const _segSync = segSync; segSync = function () { _segSync(); olSegSync(); }; }
function olSegSync() {
  if (draft.mode !== 'online') return;
  ['#fRules', '#fSeeds', '#fColor', '#fLevel', '#fLevel2', '#fDisplay'].forEach(s => $(s).classList.add('hidden'));
  $('#fInfo').classList.remove('hidden'); $('#fInfoText').textContent = olOn() ? t('ol.ngDesc') : t('ol.setup1') + ' ' + t('ol.setup2');
  $('#btnStart').textContent = t('ol.open');
}
$('#btnStart').addEventListener('click', e => { if (draft.mode !== 'online') return; e.stopImmediatePropagation(); hideOv('#newOverlay'); openOnline(); }, true);
if (!olOn()) { document.body.classList.add('ol-soon'); document.documentElement.classList.add('ol-soon'); }
document.documentElement.classList.add('ol-dock');
applyI18n();
if (typeof fixSize === 'function') { fixW = 0; fixSize(); }   // the phone board leaves room for the tab bar

// ====================================================================== confirm dialog
let olcFn = null;
function olConfirm(text, yes, fn) { $('#olcText').textContent = text; $('#olcYes').textContent = yes; $('#olcYes').classList.toggle('hidden', !fn); olcFn = fn; showOv('#olConfirm'); }
$('#olcNo').onclick = () => { olcFn = null; hideOv('#olConfirm'); };
$('#olcYes').onclick = () => { const f = olcFn; olcFn = null; hideOv('#olConfirm'); f && f(); };
// leaving a live game first: an online game is resigned (after a confirmation)
function olGate(fn) {
  if (olLive()) { olConfirm(t('ol.leaveQ'), t('ol.resign'), () => { olResignNow(); fn(); }); return false; }
  fn(); return true;
}

// Google sign-in errors in words the user can act on
function authErrText(e) {
  const c = (e && (e.code || e.message)) || '';
  if (/unauthorized-domain/.test(c)) return t('err.domain', { d: location.hostname });
  if (/operation-not-allowed|admin-restricted-operation/.test(c)) return t('err.provider');
  if (/referer|referrer|API_KEY_HTTP_REFERRER_BLOCKED|requests-from-referer/i.test(c)) return t('err.referrer', { d: location.origin });
  if (/api-key-not-valid|invalid-api-key/.test(c)) return t('err.apikey');
  if (/network-request-failed|load https/.test(c)) return t('err.network');
  if (/popup-blocked/.test(c)) return t('err.popup');
  if (/not-configured/.test(c)) return t('ol.setup1');
  if (/configuration-not-found/.test(c)) return t('err.config');
  return t('sync.err') + (c ? ' (' + c + ')' : '');
}
const authCancelled = e => e && /popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(e.code || '');

// ====================================================================== online dialog
let olView = 'menu', olRoomsList = [], olRoomsUnsub = null, olStatus = null;
const OL_V_KEY = 'mancala-online-v';
function olV() { try { const v = localStorage.getItem(OL_V_KEY); if (ON.VARIANTS.includes(v)) return v; } catch (e) {} return ON.DEF_V; }
function olSetV(v) { try { localStorage.setItem(OL_V_KEY, String(v)); } catch (e) {} }
// rules (4) + seeds per pit (2): the variant is their combination; matchmaking pairs players of the same variant
const OL_RULES = ['kalah', 'basic', 'easy', 'sunka'];
function olVarSeg(cls) {
  const cur = olV(), r = ON.ruleOf(cur), n = ON.seedsOf(cur);
  return `<div class="ol-tc ${cls || ''}" role="radiogroup" aria-label="${olEsc(t('ng.rules'))}">` + OL_RULES.map(x => `<button type="button" role="radio" data-or="${x}" class="${x === r ? 'sel' : ''}" aria-checked="${x === r}"><b>${olEsc(t('rule.' + x))}</b></button>`).join('') + '</div>'
    + `<div class="ol-tc ol-seeds ${cls || ''}" role="radiogroup" aria-label="${olEsc(t('ng.seeds'))}">` + ON.SEEDS.map(x => `<button type="button" role="radio" data-os="${x}" class="${x === n ? 'sel' : ''}" aria-checked="${x === n}"><b>${olEsc(t('ng.seedsN', { n: x }))}</b><small>${olEsc(tcText(r + x))}</small></button>`).join('') + '</div>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('.ol-tc button[data-or], .ol-tc button[data-os]'); if (!b) return;
  const cur = olV(), v = b.dataset.or ? b.dataset.or + ON.seedsOf(cur) : ON.ruleOf(cur) + b.dataset.os;
  if (ON.VARIANTS.includes(v)) olSetV(v);
  const nv = olV();
  document.querySelectorAll('.ol-tc button[data-or]').forEach(x => { const s = x.dataset.or === ON.ruleOf(nv); x.classList.toggle('sel', s); x.setAttribute('aria-checked', s); });
  document.querySelectorAll('.ol-tc button[data-os]').forEach(x => { const s = +x.dataset.os === ON.seedsOf(nv); x.classList.toggle('sel', s); x.setAttribute('aria-checked', s); });
});
const OL_ST = { idle: 'ol.st.idle', lobby: 'ol.st.lobby', play: 'ol.st.play', room: 'ol.st.room', watch: 'ol.st.watch' };
function olRoomRows(list) {
  const me = ON.uid;
  if (!list.length) return `<div class="ol-note small">${t('ol.noRooms')}</div>`;
  return list.map(r => `<div class="${r.host === me ? 'me' : ''}${r.game ? ' ingame' : ''}"><span>${olEsc(r.name)} <small>R${r.rating ?? ''} · ${olEsc(varName(r.v))}</small>${r.game ? ` <small class="ol-ing">${t('ol.st.play')}</small>` : ''}</span>${r.host === me || r.guest === me ? '' : r.game ? `<button class="dk-watch" data-code="${olEsc(r.id)}">${t('ol.watch')}</button>` : `<button class="dk-join" data-code="${olEsc(r.id)}">${t('ol.join')}</button>`}</div>`).join('');
}
async function olJoin(code, btn) {
  if (olLive()) { olGate(() => olJoin(code)); return; }
  if (btn) btn.disabled = true;
  let gid = null; try { gid = await ON.joinRoom(code); } catch (e) { console.warn(e); }
  if (btn) btn.disabled = false;
  if (gid) { hideOv('#onlineOverlay'); startOnlineGame(gid); return; }
  // a room with a game in progress: watch it
  let wg = null; try { wg = await ON.roomGameOf(code); } catch (e) { console.warn(e); }
  if (wg) { hideOv('#onlineOverlay'); startOnlineGame(wg, true); return; }
  toast(t('ol.noRoom'), 2200);
}
async function openOnline(joinCode) {
  showOv('#onlineOverlay');
  if (!olOn()) { olRender('setup'); return; }
  if (!ON.ready) olRender('loading');
  try { await ON.init(); } catch (e) { console.warn(e); olErr = e; olRender('error'); return; }
  if (!olRoomsUnsub) olRoomsUnsub = ON.watchRooms(l => { olRoomsList = l; if (isShown('#onlineOverlay') && olView === 'menu') { const el = $('#olRooms'); if (el) el.innerHTML = olRoomRows(l); } });
  dockStart();
  if (joinCode) { olRender('menu'); olJoin(joinCode); return; }
  olRender(ON.room && olView === 'room' ? 'room' : olView === 'search' ? 'search' : 'menu');
}
let olErr = null;
// rating history: sparkline of the last 30 rated games + the latest 10 results
function olHistHtml() {
  const h = ON.history(); if (!h.length) return '';
  const sp = h.slice(-30), pts = [sp[0].r - (sp[0].d || 0)].concat(sp.map(x => x.r));
  let html = `<div class="ol-sub">${t('ol.hist')}</div><div class="ol-hist">`;
  if (pts.length >= 2) {
    const lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, W = 300, H = 34, y = v => (H - 3 - (v - lo) / (hi - lo) * (H - 6)).toFixed(1);
    html += `<svg class="ol-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${y(pts[0])}" y2="${y(pts[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${pts.map((v, i) => (i / (pts.length - 1) * W).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  html += '<div class="ol-hrows">' + h.slice(-10).reverse().map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<div class="${c}"><i>${t('ol.res' + c.toUpperCase())}</i><span>${olEsc(x.o || '?')} <small>R${x.or} · ${olEsc(varName(x.v))}</small></span><b>${x.d >= 0 ? '+' : '−'}${Math.abs(x.d)}</b><small>${x.r}</small></div>`; }).join('') + '</div></div>';
  return html;
}
function olRender(v) {
  if (v) olView = v;
  const B = $('#olBody');
  if (olView === 'setup') { B.innerHTML = `<div class="ol-setup"><div class="ol-setup-ic">⌛</div><p class="ol-note">${t('ol.setup1')}</p><p class="ol-note small">${t('ol.setup2')}</p></div>`; return; }
  if (olView === 'loading') { B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><small>${t('ol.connecting')}</small></div>`; return; }
  if (olView === 'error') { B.innerHTML = `<p class="ol-note">${olEsc(t('ol.error'))}</p><p class="ol-note small">${olEsc(authErrText(olErr))}</p><div class="ol-acts"><button class="mbtn go" id="olRetry">${t('ol.retry')}</button></div>`; $('#olRetry').onclick = () => openOnline(); return; }
  const P = ON.profile;
  if (olView === 'menu') {
    const R = ON.room;
    B.innerHTML = `<div class="ol-grid"><div class="ol-col">
      <div class="ol-me"><input id="olName" maxlength="16" value="${olEsc(P.name)}" aria-label="${olEsc(t('pf.name'))}"><div class="ol-r"><small>${t('ol.rating')}</small><b>${P.rating}</b><small>${t('ol.record', { w: P.wins || 0, l: P.losses || 0, d: P.draws || 0 })}</small></div></div>
      <div class="ol-tcbox"><div class="ol-tcl">${t('ng.rules')} · ${t('ng.seeds')} · ${t('ol.tc')}</div>${olVarSeg()}</div>
      <div class="ol-acts"><button class="mbtn go" id="olFind">${t('ol.find')}</button></div>
      <p class="ol-note small" style="margin-top:6px">${t('ol.findDesc')}</p>
      <div class="ol-sub">${t('ol.privTitle')}</div>
      ${R ? `<div class="ol-myroom"><span>${t('ol.myRoom')}</span><span class="ol-mcode">${R.code}</span><small>${R.game ? t('ol.st.play') : t('ol.roomLeft', { t: olClock(R.left) })}</small><button class="dk-btn" id="olShowRoom">${t('ol.showRoom')}</button></div>` : ''}
      <div class="ol-rk" role="radiogroup"><button type="button" data-rk="open" class="${olRk() === 'open' ? 'sel' : ''}"><b>${t('ol.openRoom')}</b><small>${t('ol.openDesc')}</small></button><button type="button" data-rk="key" class="${olRk() === 'key' ? 'sel' : ''}"><b>${t('ol.keyRoom')}</b><small>${t('ol.keyDesc')}</small></button></div>
      <div class="ol-acts"><button class="mbtn" id="olMake">${t('ol.makeRoom')}</button></div>
      <div class="ol-join"><input id="olCode" maxlength="8" placeholder="${olEsc(t('ol.codePh'))}" autocomplete="off"><button class="mbtn" id="olJoinBtn">${t('ol.join')}</button></div>
    </div><div class="ol-col">
      <div class="ol-sub">${t('ol.rooms')}</div><div class="ol-list ol-rooms" id="olRooms">${olRoomRows(olRoomsList)}</div>
      ${olHistHtml()}
      <div class="ol-sub">${t('ol.rank')}</div><div class="ol-list" id="olRank"><div class="ol-note small">…</div></div>
    </div></div>`;
    $('#olName').onchange = async e => { try { e.target.value = await ON.setName(e.target.value); syncNameTouched(); dockRender(); } catch (_) {} };
    $('#olFind').onclick = olStartSearch;
    $('#olMake').onclick = olMakeRoom;
    B.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { olSetRk(b.dataset.rk); B.querySelectorAll('[data-rk]').forEach(x => x.classList.toggle('sel', x === b)); });
    const sr = $('#olShowRoom'); if (sr) sr.onclick = () => { ON.extendRoom().catch(() => {}); olRender('room'); };
    $('#olJoinBtn').onclick = () => { const c = $('#olCode').value.trim(); if (c) olJoin(c, $('#olJoinBtn')); };
    $('#olCode').onkeydown = e => { if (e.key === 'Enter') $('#olJoinBtn').click(); };
    $('#olRooms').onclick = e => { const b = e.target.closest('[data-code]'); if (b) olJoin(b.dataset.code, b); };
    ON.topPlayers(10).then(list => { const el = $('#olRank'); if (el) el.innerHTML = rankRows(list); }).catch(() => {});
    return;
  }
  if (olView === 'search') {
    const s = olStatus || {}, v = s.v || olV();
    B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><b>${t('ol.searching')}</b><small class="ol-tcinfo">${olEsc(varName(v))} · ${olEsc(tcText(v))}</small><small>${t('ol.searchInfo', { w: s.same || 0, r: s.window || 100 })}</small></div><div class="ol-acts"><button class="mbtn" id="olCancel">${t('ol.cancel')}</button></div>`;
    $('#olCancel').onclick = async () => { await ON.leaveLobby(); olRender('menu'); dockRender(); };
    return;
  }
  if (olView === 'room') {
    const R = ON.room; if (!R) { olRender('menu'); return; }
    const url = olRoomUrl(R.code);
    B.innerHTML = `<div class="ol-wait"><span class="ol-lock">${t(R.priv ? 'ol.keyRoom' : 'ol.openRoom')}</span><small>${t('ol.roomCode')}</small><div class="ol-code" id="olRoomCode">${R.code}</div><small class="ol-tcinfo">${olEsc(varName(R.v))} · ${olEsc(tcText(R.v))}</small><small>${t(R.priv ? 'ol.roomInfoKey' : 'ol.roomInfoOpen')}</small><small>${t('ol.roomKeep')} <b class="ol-left">${olLeftText()}</b></small></div>
      <div class="ol-acts ol-racts"><button class="mbtn go" id="olCopy">${t('ol.copyLink')}</button><button class="mbtn warn" id="olCloseRoom">${t('ol.closeRoom')}</button></div>`;
    $('#olCopy').onclick = async () => { try { if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: t('meta.title'), url }); return; } await navigator.clipboard.writeText(url); toast(t('ol.copied'), 1400); } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); } };
    $('#olCloseRoom').onclick = async () => { try { await ON.closeRoom(); } catch (e) { console.warn(e); } olRender('menu'); };
  }
}
const olRoomUrl = code => (window.__EMBED && window.top !== window ? (() => { try { return top.location.origin + top.location.pathname; } catch (e) { return location.origin + location.pathname; } })() : location.origin + location.pathname) + '?room=' + code + (ON.mock ? '&mock=1' : '');
const OL_RK = 'mancala-online-rk';
function olRk() { try { return localStorage.getItem(OL_RK) === 'key' ? 'key' : 'open'; } catch (e) { return 'open'; } }
function olSetRk(v) { try { localStorage.setItem(OL_RK, v); } catch (e) {} }
const rankRows = list => list.length ? list.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}. ${olEsc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="ol-note small">${t('ol.noRank')}</div>`;
function olLeftText() { const r = olOn() && ON.room; return r ? (r.game ? t('ol.st.play') : t('ol.roomLeft', { t: olClock(r.left) })) : ''; }
async function olStartSearch() {
  if (olLive()) { olGate(olStartSearch); return; }
  showOv('#onlineOverlay');
  if (!olOn()) { olRender('setup'); return; }
  try { await ON.init(); } catch (e) { olErr = e; olRender('error'); return; }
  olStatus = { v: olV() }; olRender('search'); dockRender();
  try {
    await ON.enterLobby({ v: olV(), onMatched: gid => { hideOv('#onlineOverlay'); olView = 'menu'; startOnlineGame(gid); }, onStatus: s => { olStatus = s; if (olView === 'search' && isShown('#onlineOverlay')) olRender(); } });
  } catch (e) { console.warn(e); olErr = e; olRender('error'); }
}
async function olMakeRoom() {
  try { await ON.createRoom({ onMatched: olRoomMatched, onExpired: () => toast(t('ol.roomExpired'), 2600), priv: olRk() === 'key', v: olV() }); olRender('room'); dockRender(); }
  catch (e) { console.warn(e); toast(t('ol.error'), 2000); }
}
function olRoomMatched(gid) {
  if (net && net.gid === gid) return;
  hideOv('#onlineOverlay'); startOnlineGame(gid);
}
$('#olClose').onclick = async () => { hideOv('#onlineOverlay'); if (olOn() && ON.ready) { try { await ON.leaveLobby(); } catch (e) {} if (olView === 'search') olView = 'menu'; dockRender(); } };
setInterval(() => {
  if (!olOn() || !ON.ready) return;
  const el = document.querySelector('#olBody .ol-left'); if (el) el.textContent = olLeftText();
  const r = ON.room, chip = $('#dkMyRoom');
  chip.classList.toggle('hidden', !r); if (r) chip.textContent = t('ol.myRoom') + ' ' + r.code + ' · ' + (r.game ? t('ol.st.play') : olClock(r.left));
  $('#dkRoom').textContent = r ? t('ol.closeRoom') : t('ol.makeRoom'); $('#dkRoom').classList.toggle('warn', !!r);
}, 1000);
if (olOn()) ON.onRoom((ev, r) => {
  if ((ev === 'closed' || ev === 'expired' || ev === 'gone') && isShown('#onlineOverlay') && olView === 'room') olRender('menu');
  if (ev === 'reopen') toast(t('ol.pReopen'), 2600);
  dockRender();
});

// ====================================================================== online game on the board
// net = { gid, game, me (1 / 2; -1 spectator), spectate, unsub, wUnsub, done, pending, busy, saved, result, watchers }
// The board shows the moves of the game record: game.moves = the record's moves, game.human = my side (0 / 1).
let net = null;
const OL_LIVE_P = 'mancala-online-live:';           // + uid (one live game per player, also with several tabs)
const olLiveKey = () => OL_LIVE_P + (ON.uid || '');
function olLive() { return !!(net && !net.spectate && !net.done && net.game && net.game.status === 'play'); }
function olNoAna() { return !!(net && !net.done); }     // no engine analysis / hints while an online game is running (also not for spectators)
function olClearLive(gid) { try { const s = JSON.parse(localStorage.getItem(olLiveKey()) || 'null'); if (s && s.gid === gid) localStorage.removeItem(olLiveKey()); } catch (e) {} }
const olStop = () => { busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; stopAnim(); stopPlay(); };
function startOnlineGame(gid, spec) {
  if (net && net.gid === gid && !!net.spectate === !!spec) return;
  if (lesson || puzzle) exitSpecial();
  const saved = net ? net.saved : { game: JSON.parse(JSON.stringify(game)), cur, evals: evals.slice(), mode: settings.mode };
  if (net) olDetach(true);
  ['#onlineOverlay', '#resultOverlay', '#newOverlay', '#resumeOverlay', '#lessonOverlay', '#puzzleOverlay', '#olConfirm', '#profOverlay', '#rulesOverlay', '#pasteOverlay'].forEach(hideOv);
  olStop();
  if (typeof rvCancel === 'function') rvCancel(); rv = null; rvOpen = false;
  net = { gid, game: null, me: -1, spectate: !!spec, done: false, pending: false, busy: false, saved };
  settings.mode = 'online';
  game = { rules: game.rules, seeds: game.seeds, moves: [], human: 0, setup: null, resigned: null };
  recompute(); cur = 0; reviewing = false; evals = []; anaLists = []; fxMarks = []; gameOverShown = true;
  document.body.classList.add('in-online'); document.body.classList.toggle('in-watch', !!spec);
  net.unsub = spec ? ON.spectate(gid, g => onNetGame(gid, g)) : ON.watchGame(gid, g => onNetGame(gid, g));
  net.wUnsub = ON.watchCount(gid, n => { if (net && net.gid === gid) { net.watchers = n; olWatchRender(); } });
  if (!spec) { try { localStorage.setItem(olLiveKey(), JSON.stringify({ uid: ON.uid, gid })); } catch (e) {} }
  mtab('game'); update(); olWatchRender(); dockRender();
}
// stop following the online game; the local game comes back (keepMode: another online game follows)
function olDetach(keepMode) {
  if (!net) return;
  const n = net; net = null;
  n.unsub && n.unsub(); n.wUnsub && n.wUnsub();
  olClearLive(n.gid);
  document.body.classList.remove('in-online', 'in-watch');
  hideOv('#resultOverlay'); $('#olRes').classList.add('hidden');
  ['Top', 'Bot'].forEach(w => { const c = $('#clk' + w); c.textContent = ''; c.className = 'pclk'; });
  if (olOn() && ON.ready) { const r = ON.room; ON.setPresence(r && !r.game ? 'room' : 'idle', { room: r && !r.game && !r.priv ? r.code : null }).catch(() => {}); }
  if (keepMode) return;
  const s = n.saved;
  olStop(); if (typeof rvCancel === 'function') rvCancel(); rv = null; rvOpen = false;
  settings.mode = s.mode === 'online' ? 'pvp' : s.mode;
  game = s.game; recompute(); cur = Math.min(s.cur, game.moves.length); evals = s.evals; anaLists = []; fxMarks = [];
  reviewing = cur !== game.moves.length; gameOverShown = isOver(game.moves.length) || game.resigned != null;
  resetSeeds(); layout(); update(); olWatchRender(); dockRender(); afterPosition();
}
function olResignNow() {
  if (!olLive()) return;
  const gid = net.gid, g = net.game;
  ON.resign(gid).then(() => ON.applyResult(gid, Object.assign({}, g, { status: 'resign', loser: ON.uid }), 0)).catch(e => console.warn(e));
  olDetach();
}
const prefixOf = (a, b) => a.length <= b.length && a.every((x, i) => x === b[i]);
function olSetBoard(g, moves) {
  const R = ON.ruleOf(g.v), S = ON.seedsOf(g.v);
  stopAnim();
  game = { rules: R, seeds: S, moves: moves.slice(), human: net.me > 0 ? net.me - 1 : 0, setup: null, resigned: null };
  recompute(); cur = game.moves.length; reviewing = false; evals = []; anaLists = []; fxMarks = []; gameOverShown = true;
  resetSeeds(); layout(); update();
}
function onNetGame(gid, g) {
  if (!net || net.gid !== gid) return;
  if (!g) { toast(t('ol.gone'), 2200); olDetach(); return; }
  const first = !net.game;
  net.game = g;
  if (!net.spectate) net.me = ON.sideNo(g, ON.uid) || -1;
  if (net.me < 0 && !net.spectate) { net.spectate = true; document.body.classList.add('in-watch'); }
  const st = ON.replay(g.v, g.moves);
  if (!st.ok && !net.warned) { net.warned = true; toast(t('ol.illegal'), 2500); console.warn('illegal online move at', st.bad); }
  if (first || game.rules !== ON.ruleOf(g.v) || game.seeds !== ON.seedsOf(g.v)) olSetBoard(g, st.moves);
  else olCatchUp();
  if (g.status !== 'play') finishOnline(g);
  else if (st.ok && st.over && !net.spectate) ON.markOver(gid).catch(() => {});
  if (g.next && net.done) {           // the rematch is ready (room games)
    const nx = g.next; setTimeout(() => { if (net && net.gid === gid) startOnlineGame(nx); }, 400);
  }
  renderInfo(); olWatchRender(); olResRender();
}
// bring the board up to the record: new moves are sown one after another (the opponent's extra turns), a review stays where it is
function olCatchUp() {
  if (!net || !net.game || net.busy) return;
  const remote = ON.replay(net.game.v, net.game.moves).moves, mine = game.moves;
  if (prefixOf(mine, remote)) {
    if (!reviewing && !animating && cur < mine.length) { cur = mine.length; update(); }   // an interrupted sowing
    const extra = remote.slice(mine.length); if (!extra.length) return;
    if (cur === mine.length && !reviewing) {
      if (animating) return;                                                  // my own sowing is still running: continue after it
      const gid = net.gid; net.busy = true;
      playMove(extra[0]).catch(e => console.warn(e)).finally(() => { if (!net || net.gid !== gid) return; net.busy = false; olCatchUp(); renderInfo(); if (net.done && net.game) olEndBoard(net.game); });
    } else { game.moves = remote.slice(); recompute(); renderInfo(); }
  } else if (net.pending && prefixOf(remote, mine)) { /* my move is on its way */ }
  else olSetBoard(net.game, remote);
}
// hooks used by app.js
function olCanMove() {
  const g = net && net.game;
  if (!g || net.spectate || net.done || net.pending || net.busy || g.status !== 'play' || reviewing) return false;
  if (cur !== game.moves.length || game.moves.length !== String(g.moves || '').length) return false;
  const p = shownPos(); return !!p && !p.over && p.side === net.me - 1;
}
function olHumanMove(k) {
  if (!olCanMove()) return;
  const gid = net.gid, len = game.moves.length;
  net.pending = true;
  playMove(k).then(() => { if (net && net.gid === gid) olCatchUp(); });
  ON.sendMove(gid, len, k).then(ok => {
    if (!net || net.gid !== gid) return;
    net.pending = false;
    if (!ok) { toast(t('ol.moveFail'), 1800); if (!animating) olSetBoard(net.game, ON.replay(net.game.v, net.game.moves).moves); }
    renderInfo();
  }).catch(err => { console.warn(err); if (net && net.gid === gid) { net.pending = false; toast(t('ol.error'), 2000); olSetBoard(net.game, ON.replay(net.game.v, net.game.moves).moves); } });
}
function olShortName(s) { const g = net && net.game; return g ? ((s === 0 ? g.bn : g.wn) || '?') : '…'; }
function olPlayerName(s) {
  const g = net && net.game; if (!g) return '…';
  const r = s === 0 ? g.br : g.wr;
  return olShortName(s) + (typeof r === 'number' ? ' (' + r + ')' : '') + (!net.spectate && s === net.me - 1 ? ' · ' + t('you') : '');
}
const olMine = s => !!(net && !net.spectate && s === net.me - 1);
// the big label on the board: whose turn / who won
function olTurnText(p) {
  if (!net || !net.game) return null;
  const g = net.game;
  if (net.done && cur === game.moves.length && g.status !== 'play') {
    const w = ON.winnerOf(g); if (!w) return t('res.draw');
    return olMine(w - 1) ? t('ol.win') : net.spectate ? t('ol.pWin', { p: olShortName(w - 1) }) : t('ol.lose');
  }
  if (p.over) { const a = p.b[6], o = p.b[13]; if (a === o) return t('res.draw'); const w = a > o ? 0 : 1; return olMine(w) ? t('ol.win') : t('res.pWin', { c: olShortName(w) }); }
  return olMine(p.side) ? t('turn.you') : t('turn.p', { c: olShortName(p.side) });
}
// a game that ended off the board (resign / timeout / abandonment): the loser's plate says why
function olLoserLabel() { const g = net && net.game; if (!g) return ''; return t(g.status === 'timeout' ? 'ol.lTime' : g.status === 'abandon' ? 'ol.lLeft' : 'ol.resign'); }
function olEndBoard(g) {
  if (g.status === 'resign' || g.status === 'timeout' || g.status === 'abandon') {
    const ls = ON.sideNo(g, g.loser);
    if (ls && game.moves.length === String(g.moves || '').length) game.resigned = ls - 1;
  }
}
// which side sits in which plate (see renderPlates in app.js)
const plateSide = w => { const B = bottomSide(); return vert ? (w === 'Top' ? B : 1 - B) : (w === 'Bot' ? B : 1 - B); };
// clocks in the player plates + timeout / abandonment claims
function olClockTick() {
  if (!net || !net.game || settings.mode !== 'online') return;
  const g = net.game, live = g.status === 'play' && !net.done, st = ON.replay(g.v, g.moves), tm = live && st.ok && !st.over ? st.turn - 1 : -1, now = ON.now();
  for (const w of ['Top', 'Bot']) {
    const s = plateSide(w), side = s === 0 ? 'b' : 'w', moving = tm === s && !net.pending;
    const k = ON.clockOf(g, side, moving, now), el = $('#clk' + w);
    const txt = olClock(k.main); if (el.textContent !== txt) el.textContent = txt;
    el.className = 'pclk' + (moving ? ' ol-move' : '') + (moving && k.left < 10000 ? ' low' : '') + (moving && k.delay > 0 ? ' dly' : '');
    if (moving && !net.spectate && s === net.me - 1 && window.CountTick) CountTick.feed(k.left, 'ol' + game.moves.length);   // time signal on my own clock
  }
  if (live && !net.spectate && tm >= 0 && tm !== net.me - 1 && !net.claiming) {
    const opp = net.me === 1 ? g.w : g.b, k = ON.clockOf(g, net.me === 1 ? 'w' : 'b', true, now);
    if (k.left < -ON.GRACE) { net.claiming = true; ON.claimTimeout(net.gid, opp).catch(() => {}).finally(() => { if (net) net.claiming = false; }); }
    else if (now - (g.t || now) > ON.ABANDON_MS && (!net.abChk || now - net.abChk > 5000)) {
      net.abChk = now; net.claiming = true;
      ON.claimAbandon(net.gid, opp).catch(() => {}).finally(() => { if (net) net.claiming = false; });
    }
  }
}
setInterval(olClockTick, 250);
function olAfterInfo() {
  if (settings.mode !== 'online' || !net) return;
  olClockTick();
  const g = net.game;
  $('#infoLine').textContent = g ? `${varName(g.v)}  ·  ${t(g.rated ? 'ol.rated' : 'ol.friendly')}  ·  ${tcText(g.v)}  ·  ${t('info.moves', { n: game.moves.length })}` : '';
  $('#btnResign').disabled = !olLive();
  $('#btnHint').disabled = true;
}
function olWatchRender() {
  const el = $('#olWatch');
  if (!net || !net.game) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const g = net.game, w = net.watchers || 0;
  el.classList.remove('hidden'); el.classList.toggle('pl', !net.spectate);
  if (net.spectate) el.innerHTML = `<span class="wl">${t('ol.watching')}</span><span class="wi">${olEsc(g.bn)} vs ${olEsc(g.wn)} · ${olEsc(varName(g.v))} · ${t('ol.watchers', { n: w })}</span><button id="olWatchStop">${t('ol.watchStop')}</button>`;
  else el.innerHTML = `<span class="wi">${t(g.rated ? 'ol.rated' : 'ol.friendly')} · ${olEsc(varName(g.v))} · ${olEsc(tcText(g.v))}${w ? ' · ' + t('ol.watchers', { n: w }) : ''}</span>${net.done ? `<button id="olWatchStop">${t('ol.leaveGame')}</button>` : ''}`;
  const b = $('#olWatchStop'); if (b) b.onclick = () => olDetach();
}
// ---------------------------------------------------------------- the end of an online game
function olWhy(g, me) {
  const loserNo = g.loser ? ON.sideNo(g, g.loser) : 0, p = loserNo ? olShortName(loserNo - 1) : '';
  if (g.status === 'resign') return g.loser === ON.uid ? t('ol.youResigned') : me > 0 ? t('ol.oppResigned') : t('ol.wResign', { p });
  if (g.status === 'timeout') return g.loser === ON.uid ? t('ol.youTimeout') : me > 0 ? t('ol.oppTimeout') : t('ol.wTime', { p });
  if (g.status === 'abandon') return g.loser === ON.uid ? t('ol.youAbandon') : me > 0 ? t('ol.oppAbandon') : t('ol.wAbandon', { p });
  return '';
}
// a local summary of my rated online games (for the portal's achievements): { n, w, r, hist: [{ id, t, s, r }] }
const OL_REC = 'aicoding-mancala-v1-online';
function olRecord(rt, gid, g, score) {
  if (!rt || !rt.rated || !g || !g.rated) return;
  try {
    const d = JSON.parse(localStorage.getItem(OL_REC) || 'null') || { n: 0, w: 0, r: ON.INITIAL, hist: [] };
    if ((d.hist || []).some(h => h.id === gid)) return;
    d.n = (d.n || 0) + 1; d.w = (d.w || 0) + (score === 1 ? 1 : 0); d.r = rt.now;
    d.hist = (d.hist || []).concat([{ id: gid, t: Date.now(), s: score, r: rt.now }]).slice(-100);
    localStorage.setItem(OL_REC, JSON.stringify(d));
  } catch (e) {}
}
async function finishOnline(g) {
  if (!net || net.done) return;
  net.done = true; net.pending = false;
  olClearLive(net.gid);
  olEndBoard(g);
  const gid = net.gid, winner = ON.winnerOf(g) || 0, me = net.spectate ? -1 : net.me;
  net.result = { winner, why: olWhy(g, me), rating: null };
  if (me > 0) {
    const score = !winner ? 0.5 : winner === me ? 1 : 0;
    try { net.result.rating = await ON.applyResult(gid, g, score); olRecord(net && net.result.rating, gid, g, score); } catch (e) { console.warn(e); }
    syncTouch();
  }
  if (!net || net.gid !== gid) return;
  setTimeout(() => olShowResult(gid), g.status === 'over' ? 900 : 250);
  renderInfo(); olWatchRender(); dockRender();
}
// the result dialog waits until the last sowing has been shown
function olShowResult(gid) {
  if (!net || net.gid !== gid || !net.result) return;
  if (animating || net.busy || (!reviewing && cur < game.moves.length)) { setTimeout(() => olShowResult(gid), 300); return; }
  const g = net.game, R = net.result, me = net.spectate ? -1 : net.me, st = ON.replay(g.v, g.moves);
  $('#resultTitle').textContent = !R.winner ? t('res.draw') : me < 0 ? t('ol.pWin', { p: olShortName(R.winner - 1) }) : R.winner === me ? t('ol.win') : t('ol.lose');
  $('#res0').textContent = st.score[0]; $('#res1').textContent = st.score[1];
  let sub = olEsc((R.why ? R.why + ' · ' : '') + `${olShortName(0)} vs ${olShortName(1)} · ${varName(g.v)}`) + '<br>' + olEsc(t('info.moves', { n: st.moves.length }));
  if (R.rating && R.rating.rated) sub += `<div class="ol-rchg">${t('ol.rating')} ${R.rating.old} → <b>${R.rating.now}</b> <span class="${R.rating.now >= R.rating.old ? 'up' : 'dn'}">(${R.rating.now >= R.rating.old ? '+' : ''}${R.rating.now - R.rating.old})</span></div>`;
  else if (R.rating && R.rating.note && ON.secMsg) sub += `<div class="ol-rchg">${olEsc(ON.secMsg(R.rating.note))}</div>`;
  $('#resultSub').innerHTML = sub;
  if (me > 0) { sChime(!R.winner ? 0 : R.winner === me ? 1 : -1); if (R.winner === me) confetti(); }
  olResRender();
  showOv('#resultOverlay');
}
// rematch area in the result dialog (room games) / "find another" (rated)
function olResRender() {
  const box = $('#olRes'), again = $('#btnAgain');
  if (!net || !net.done || !net.game) { box.classList.add('hidden'); again.textContent = t('res.again'); again.disabled = false; return; }
  const g = net.game, me = ON.uid;
  box.classList.remove('hidden');
  if (net.spectate) { box.innerHTML = ''; box.dataset.h = ''; box.classList.add('hidden'); again.textContent = t('ol.leaveGame'); return; }
  if (!g.room || g.rated) { box.innerHTML = ''; box.dataset.h = ''; box.classList.add('hidden'); again.textContent = t('ol.findAgain'); again.disabled = false; return; }
  let h = '';
  again.disabled = false; again.textContent = t('ol.rematch');
  if (g.next || g.post === 'again') h = `<span>${t('ol.pAgain')}</span>`, again.disabled = true;
  else if (g.post) h = `<span>${t(g.post === 'no' ? 'ol.pNo' : g.post === 'timeout' ? 'ol.pTimeout' : g.post === 'host' ? 'ol.pHost' : 'ol.pLeft')}</span>`, again.disabled = true;
  else if (g.again && g.again.by === me) { h = `<span>${t('ol.reqSent')} <b class="cd">${Math.max(0, Math.ceil((ON.REMATCH_MS - (ON.now() - g.again.t)) / 1000))}</b></span>`; again.disabled = true; }
  else if (g.again) { h = `<span>${t('ol.reqGot')}</span><button class="mbtn" id="olDecline">${t('ol.decline')}</button><button class="mbtn go" id="olAccept">${t('ol.accept')}</button>`; again.textContent = t('ol.accept'); }
  box.className = 'ol-res ol-again' + (g.post && g.post !== 'again' ? ' muted' : '');
  if (!h) box.classList.add('hidden');
  if (box.dataset.h === h) return;          // unchanged (the 1-second refresh): keep the buttons
  box.dataset.h = h; box.innerHTML = h;
  const a = $('#olAccept'); if (a) a.onclick = () => ON.answerRematch(net.gid, true).catch(e => console.warn(e));
  const d = $('#olDecline'); if (d) d.onclick = () => ON.answerRematch(net.gid, false).catch(e => console.warn(e));
}
setInterval(() => { if (net && net.done && net.game && net.game.again && !net.game.post && isShown('#resultOverlay')) { olResRender(); if (ON.now() - net.game.again.t > ON.REMATCH_MS + 1500) ON.expireRematch(net.gid).catch(() => {}); } }, 1000);
$('#btnAgain').addEventListener('click', e => {
  if (!net) return;
  e.stopImmediatePropagation();
  const g = net.game;
  if (net.spectate) { hideOv('#resultOverlay'); olDetach(); return; }
  if (g && g.room && !g.rated) { if (g.again && g.again.by !== ON.uid) ON.answerRematch(net.gid, true).catch(err => console.warn(err)); else ON.requestRematch(net.gid).catch(err => console.warn(err)); return; }
  hideOv('#resultOverlay'); olDetach(); olStartSearch();
}, true);
// the review (振り返り) of a finished online game works on the board as usual; while it runs the game is still shown
$('#btnResAnalyze').addEventListener('click', e => { if (net && !net.done) { e.stopImmediatePropagation(); hideOv('#resultOverlay'); } }, true);
// #btnResign (投了) is in the main menu (common spec): its confirmation is shared/resign.js, then this sends the resignation
window.olResignGame = () => { if (olLive()) ON.resign(net.gid).catch(e => { console.warn(e); toast(t('ol.error'), 2000); }); };
// leaving a live online game (new game, lessons, puzzles, loading a record) = resigning it, after a confirmation
function olGuard(sel) {
  const b = $(sel); if (!b) return;
  b.addEventListener('click', e => {
    if (!net) return;
    if (olLive()) { e.stopImmediatePropagation(); e.preventDefault(); olConfirm(t('ol.leaveQ'), t('ol.resign'), () => { olResignNow(); b.click(); }); return; }
    if (sel !== '#btnNew' || net.spectate || net.done) olDetach();
  }, true);
}
['#btnNew', '#btnLesson', '#btnPuzzle', '#btnPaste', '#btnStart'].forEach(olGuard);
// a lesson or puzzle started from the lessons / puzzles dialog (rules tab, lists) leaves the online game the same way
['startLesson', 'startPuzzle'].forEach(fn => {
  const orig = window[fn]; if (typeof orig !== 'function') return;
  window[fn] = function (...a) {
    if (net && olLive()) { olConfirm(t('ol.leaveQ'), t('ol.resign'), () => { olResignNow(); orig.apply(this, a); }); return; }
    if (net) olDetach();
    return orig.apply(this, a);
  };
});
// a reload during an online game rejoins it; a game that ended while this page was away (timeout, abandonment) still gets its result
async function olResume() {
  let s = null;
  try {
    if (!Object.keys(localStorage).some(k => k.startsWith(OL_LIVE_P))) return;      // no live game on this device: do not connect yet
    await ON.init();
    try { s = JSON.parse(localStorage.getItem(olLiveKey()) || 'null'); } catch (e) {}
    if (!s || !s.gid) return;
    if (s.uid !== ON.uid) return;
    const g = await ON.getGame(s.gid), me = g ? ON.sideNo(g, ON.uid) : 0;
    if (!g || !me) { localStorage.removeItem(olLiveKey()); return; }
    if (g.status !== 'play') {
      localStorage.removeItem(olLiveKey());
      const w = ON.winnerOf(g), sc = !w ? 0.5 : w === me ? 1 : 0, r = await ON.applyResult(s.gid, g, sc);
      olRecord(r, s.gid, g, sc);
      toast(t('ol.endedAway', { r: !w ? t('res.draw') : w === me ? t('ol.win') : t('ol.lose') }) + (r && r.rated && r.now !== r.old ? ` · R ${r.old} → ${r.now}` : ''), 4000);
      return;
    }
    hideOv('#newOverlay');
    startOnlineGame(s.gid);
  } catch (e) { console.warn(e); }
}

// ====================================================================== dock (PC: bar at the bottom) / phone: "online" tab
const dock = { on: false, open: false, players: [], rooms: [], lobby: [], rank: [], editing: false };
function dockRender() {
  if (!olOn()) { $('#dkStat').textContent = t('ol.soon'); return; }
  accRender();
  if (!dock.on) return;
  const me = ON.profile;
  $('#dkStat').textContent = t('ol.dockStat', { n: dock.players.length, w: dock.lobby.length, r: dock.rooms.length });
  $('#mtCount').textContent = dock.players.length ? String(dock.players.length) : '';
  if (!dock.editing) $('#dkMe').innerHTML = me ? `<button class="dk-name" title="${olEsc(t('ol.rename'))}">${olEsc(me.name)} <span>✎ ${t('ol.rename')}</span></button> <b>R ${me.rating}</b>` + (net && net.spectate ? ` · ${t('ol.st.watch')}` : olLive() ? ` · ${t('ol.st.play')}` : olView === 'search' && isShown('#onlineOverlay') ? ` · ${t('ol.st.lobby')}` : '') : '';
  $('#dkPlayers').innerHTML = dock.players.length ? dock.players.map(p => `<div class="${p.me ? 'me' : ''}"><span>${olEsc(p.name)} <small class="st st-${olEsc(p.st || 'idle')}">${t(OL_ST[p.st] || 'ol.st.idle')}</small></span><b>${p.rating ?? ''}</b></div>`).join('') : `<div class="ol-note small">${t('ol.nobody')}</div>`;
  $('#dkRooms').innerHTML = olRoomRows(dock.rooms);
  $('#dkRank').innerHTML = rankRows(dock.rank);
}
async function dockStart() {
  if (dock.on || !olOn()) return;
  try { await ON.init(); } catch (e) { console.warn(e); olErr = e; $('#dkStat').textContent = t('ol.error') + ' — ' + authErrText(e); return; }
  if (dock.on) return;
  dock.on = true;
  ON.setPresence(net && net.spectate ? 'watch' : olLive() ? 'play' : 'idle').catch(() => {});
  ON.watchPresence(l => { dock.players = l; dockRender(); });
  ON.watchRooms(l => { dock.rooms = l; dockRender(); });
  ON.watchLobby(l => { dock.lobby = l; dockRender(); });
  const rk = () => ON.topPlayers(10).then(l => { dock.rank = l; dockRender(); }).catch(() => {});
  rk(); setInterval(rk, 60000);
  dockRender();
}
function dockToggle(open) { dock.open = open ?? !dock.open; document.body.classList.toggle('dock-open', dock.open); $('#dkToggle').textContent = dock.open ? '▼' : '▲'; }
$('#dkToggle').onclick = () => dockToggle();
$('#dock .dock-bar').addEventListener('click', e => { if (!olOn()) { openOnline(); return; } if (!e.target.closest('button') && !e.target.closest('input')) dockToggle(); });
$('#dkMe').addEventListener('click', e => {
  const b = e.target.closest('.dk-name'); if (!b || !ON.profile) return;
  e.stopPropagation(); dock.editing = true;
  $('#dkMe').innerHTML = `<input class="dk-input" maxlength="16" value="${olEsc(ON.profile.name)}" aria-label="${olEsc(t('pf.name'))}"><button class="dk-btn dk-ok">${t('ol.save')}</button>`;
  const inp = $('#dkMe .dk-input'); inp.focus(); inp.select();
  const done = async ok => {
    if (!dock.editing) return; dock.editing = false;
    if (ok) { try { const n = await ON.setName(inp.value); syncNameTouched(); toast(t('ol.renamed', { n }), 1400); const f = $('#olName'); if (f) f.value = n; } catch (_) {} }
    dockRender();
  };
  $('#dkMe .dk-ok').onclick = ev => { ev.stopPropagation(); done(true); };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false); });
  inp.addEventListener('blur', () => setTimeout(() => { if (dock.editing && document.activeElement !== $('#dkMe .dk-ok')) done(true); }, 150));
});
$('#dkAuto').onclick = () => olStartSearch();
$('#dkSoon').onclick = e => { e.stopPropagation(); openOnline(); };
$('#dkRoom').onclick = async () => { if (olOn() && ON.room) { try { await ON.closeRoom(); } catch (e) { console.warn(e); } dockRender(); return; } await openOnline(); if (ON.ready) olMakeRoom(); };
$('#dkMyRoom').onclick = async () => { await openOnline(); if (ON.room) { ON.extendRoom().catch(() => {}); olRender('room'); } };
$('#dock').addEventListener('click', e => { const b = e.target.closest('.dk-join, .dk-watch'); if (b && b.dataset.code) olJoin(b.dataset.code, b); });
$('#dkG').onclick = e => { e.stopPropagation(); if (ON.account()) { dockToggle(true); mtabIfPhone(); } else googleLink(); };
function mtab(v) {
  if (v === 'online' && !olOn()) { openOnline(); return; } document.body.classList.toggle('mtab-online', v === 'online'); $('#mtabs').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.t === v)); if (v === 'online') dockStart(); }
function mtabIfPhone() { if (matchMedia('(pointer: coarse)').matches) mtab('online'); }
$('#mtabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) mtab(b.dataset.t); });

// ====================================================================== Google link (account box in the dock / online tab)
function accRender() {
  if (!olOn()) return;
  const acc = ON.account(), box = $('#dkAcc'), g = $('#dkG');
  g.innerHTML = acc ? `${GLOGO}<span>✓ ${olEsc(acc.email || acc.name)}</span>` : `${GLOGO}<span>${t('sync.link')}</span>`;
  g.classList.toggle('on', !!acc); g.title = acc ? t('sync.on', { e: acc.email || acc.name }) : t('sync.desc');
  box.innerHTML = acc
    ? `<p class="ol-note">${olEsc(t('sync.on', { e: acc.email || acc.name }))}${acc.name && acc.email ? '<br><small>' + olEsc(acc.name) + '</small>' : ''}</p><p class="ol-note small" id="accLast">${olEsc(syncLastText())}</p><div class="ol-acts"><button class="dk-btn" id="accNow">${t('sync.now')}</button><button class="dk-btn warn" id="accOut">${t('sync.logout')}</button></div>`
    : `<p class="ol-note">${olEsc(t('sync.desc'))}</p><div class="ol-acts"><button class="dk-btn gbtn" id="accIn">${GLOGO}${t('sync.google')}</button></div>`;
  const a = $('#accIn'); if (a) a.onclick = () => googleLink();
  const n = $('#accNow'); if (n) n.onclick = () => syncNow(false);
  const o = $('#accOut'); if (o) o.onclick = () => olConfirm(t('sync.logoutQ'), t('sync.logout'), async () => {
    if (olLive()) olResignNow();
    await syncPush(); try { await ON.logout(); } catch (e) { console.warn(e); }
    toast(t('sync.out'), 1800); dockRender();
  });
}
let gBusy = false;
async function googleLink() {
  if (!olOn() || gBusy) return false;
  if (olLive()) { toast(t('sync.notNow'), 2000); return false; }
  gBusy = true;
  try {
    const r = await ON.google();
    await syncNow(true);
    toast(r.switched ? t('sync.switched') : t('sync.linked'), 2200);
    dockStart(); dockRender();
    return true;
  } catch (e) {
    if (!authCancelled(e)) { console.warn(e); olConfirm(authErrText(e), 'OK', null); }
    return false;
  } finally { gBusy = false; dockRender(); }
}

// ====================================================================== public chat (ported from the Chess page): one room for everyone online
// in this game (latest ON.CHAT_N messages, no private messages). PC: dock (strip when folded, panel when open) / phone: online tab + 2-line strip
const chat = { list: [], seen: -1, unsub: null };
const olCoarse = () => matchMedia('(pointer: coarse)').matches;
function chatVisible() { return document.body.classList.contains('mtab-online') || !olCoarse(); }
function chatShown() { return dock.on && !document.body.classList.contains('no-online') && (!olCoarse() || document.body.classList.contains('mtab-online')); }
function chatStart() {
  if (chat.unsub || !olOn() || !ON.ready) return;
  chat.unsub = ON.watchChat(l => {
    const top = l.length ? l[l.length - 1].n : 0;
    chat.list = l;
    if (chat.seen < 0 || chatVisible()) chat.seen = top;      // history present on arrival is not "unread"
    chatRender();
  });
}
function chatTime(ts) { if (typeof ts !== 'number') return ''; const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
function chatRender() {
  const el = $('#dkChat'), inp = $('#dkChatIn'); if (!el || !olOn()) return;
  if (inp && inp.dataset.l !== LANG) { inp.dataset.l = LANG; inp.placeholder = matchMedia('(hover: hover) and (pointer: fine)').matches ? t('ol.chatPh') : t('ol.chatPh').split(' · ')[0]; inp.setAttribute('aria-label', t('ol.chat')); $('#dkChatSend').textContent = t('ol.chatSend'); $('#dkChatHead').title = t('ol.chatNote'); }
  const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  const h = chat.list.length ? chat.list.map(m => `<div class="cm${m.me ? ' me' : ''}"><b>${olEsc(m.name)}</b><span>${olEsc(m.text)}</span><time>${chatTime(m.t)}</time></div>`).join('')
    : `<div class="ol-note small">${olEsc(t('ol.chatEmpty'))}<br>${olEsc(t('ol.chatNote'))}</div>`;
  if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; if (bottom || chat.toBottom) el.scrollTop = el.scrollHeight; chat.toBottom = false; }
  const n = chat.list.filter(m => m.n > chat.seen && !m.me).length, badge = $('#dkUnread'), mt = $('#mtChat');
  badge.classList.toggle('hidden', !n); badge.querySelector('b').textContent = n > 9 ? '9+' : String(n);
  const last = chat.list[chat.list.length - 1]; badge.title = last ? last.name + ': ' + last.text : '';
  if (mt) mt.textContent = n ? '💬' + (n > 9 ? '9+' : n) : '';
  const st = $('#mtStrip');
  if (st) { const hs = chat.list.length ? chat.list.slice(-2).map(m => `<div class="${m.me ? 'me' : ''}"><b>${olEsc(m.name)}</b> ${olEsc(m.text)}</div>`).join('') : `<div class="empty">💬 ${olEsc(t('ol.chat'))} · ${olEsc(t('ol.chatEmpty'))}</div>`; if (st.dataset.h !== hs) { st.dataset.h = hs; st.innerHTML = hs; } }
}
function chatSeen() { if (chatVisible() && chat.list.length) { const top = chat.list[chat.list.length - 1].n; if (top !== chat.seen) { chat.seen = top; chatRender(); } } }
new MutationObserver(chatSeen).observe(document.body, { attributes: true, attributeFilter: ['class'] });
// open the chat (PC: unfold the dock, phone: online tab) and put the cursor in the input
function chatOpen(focus) {
  if (olCoarse()) { if (!document.body.classList.contains('mtab-online')) mtab('online'); }
  else if (!dock.open) dockToggle(true);
  chatStart();
  const el = $('#dkChat'); chat.toBottom = true; el.scrollTop = el.scrollHeight;
  if (focus) { const inp = $('#dkChatIn'); inp.focus({ preventScroll: true }); chatKeep(); }
  else if (olCoarse()) $('#dkChatForm').scrollIntoView({ block: 'end', behavior: 'smooth' });
}
// phones: keep the input above the on-screen keyboard
function chatKeep() {
  if (!olCoarse()) return;
  const vv = window.visualViewport;
  document.body.style.setProperty('--kb', vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px' : '0px');
  setTimeout(() => { if (document.activeElement === $('#dkChatIn')) $('#dkChatForm').scrollIntoView({ block: 'end' }); }, 250);
}
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (document.activeElement === $('#dkChatIn')) chatKeep(); else document.body.style.setProperty('--kb', '0px'); });
async function chatSend() {
  const inp = $('#dkChatIn'), v = inp.value;
  if (!v.trim()) return false;
  if (!ON.ready) { try { await ON.init(); } catch (e) { toast(t('ol.error'), 1600); return false; } }
  const r = await ON.sendChat(v);
  if (r.ok) { inp.value = ''; chat.toBottom = true; return true; }
  toast(t(r.why === 'rate' ? 'ol.chatWait' : 'ol.error'), 1600);
  return false;
}
// Enter on an empty chat field closes the online box (PC) / leaves the field (phone)
$('#dkChatForm').addEventListener('submit', e => { e.preventDefault(); const inp = $('#dkChatIn'); if (!inp.value.trim()) { inp.value = ''; inp.blur(); if (!olCoarse()) dockToggle(false); return; } chatSend(); if (olCoarse()) inp.focus({ preventScroll: true }); });
$('#dkChatIn').addEventListener('keydown', e => {
  e.stopPropagation();                        // typing never reaches the board / record shortcuts
  if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); return; }
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  if (!e.target.value.trim() && !olCoarse()) { e.target.blur(); dockToggle(false); return; }   // empty: fold the online box away again
  chatSend(); if (!olCoarse()) e.target.blur();   // back to the board: record keys work again
});
$('#dkChatIn').addEventListener('focus', () => { chatStart(); chatKeep(); });
$('#dkChatIn').addEventListener('blur', () => document.body.style.setProperty('--kb', '0px'));
$('#dkChatForm').addEventListener('click', e => e.stopPropagation());
$('#mtStrip').addEventListener('click', () => chatOpen(true));
$('#dkUnread').addEventListener('click', e => { e.stopPropagation(); chatOpen(!olCoarse()); });
// Enter anywhere (not in a field, no dialog open) = type in the chat
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  const tg = e.target; if (tg && tg.closest && tg.closest('input,textarea,select,button,[contenteditable="true"]')) return;
  if (document.querySelector('.overlay.show') || !chatShown() || lesson || puzzle) return;
  e.preventDefault(); chatOpen(true);
});
if (olOn()) { setInterval(() => { if (dock.on) chatStart(); }, 1000); chatRender(); }
// a different account (Google switch / sign-out) is a different "me"
if (olOn()) ON.onAuth(() => { if (chat.unsub) { chat.unsub(); chat.unsub = null; } chatStart(); });

// ====================================================================== cloud sync of local progress (sync/<uid> = {d, t})
// d = JSON of a snapshot: on rated online record {n, w, r, hist[]}, ls lessons {key: {best, clear}}, pz puzzles {key: stars}, po puzzles solved before the 500-problem update,
// dy daily {last, streak, best, days}, set settings (+ setT), nm name (+ nmT), rt online rating (+ rtT).
// Merge: progress keys are united (best / stars max, clear or), daily days united and the streak recomputed; settings / name: newest wins.
const MancalaSync = (() => {
  const META = 'mancala-sync-meta';
  const SET_KEYS = ['rules', 'seeds', 'color', 'level', 'level2', 'eval', 'anim', 'speed', 'skin', 'coach', 'preview', 'sound', 'hint', 'lang'];
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const prevDay = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - 1); return ymdOf(d); };
  function meta() { return get(META, null); }
  function snapshot(now) {
    now = now || Date.now();
    let m = meta();
    const fresh = !m; m = m || {};
    const set = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) set[k] = settings[k]; });
    set.lang = LANG;
    const nm = (ON && ON.profile && ON.profile.name) || (ON && ON.localName()) || '';
    const rt = ON && ON.profile ? ON.profile.rating : null;
    const stamp = (key, val) => { const h = JSON.stringify(val); if (m[key + 'H'] !== h) { m[key + 'H'] = h; m[key + 'T'] = fresh ? 1 : now; } return m[key + 'T'] || 1; };
    const po = get(PZ_OLDK, null);
    const d = {
      v: 1, ls: get(LS_STORE, {}), pz: get(PZ_STORE, {}), po: po && Array.isArray(po.keys) ? po.keys : [],
      dy: get(DAILY_STORE, { last: '', streak: 0, best: 0, days: {} }), on: get(OL_REC, null),
      set, setT: stamp('set', set), nm, nmT: stamp('nm', nm), rt, rtT: stamp('rt', rt),
    };
    put(META, m);
    return d;
  }
  // values: numbers → max, true / 1 → kept, objects → merged key by key (best max, clear or)
  const num = x => (x === true ? 3 : +x || 0);
  function mergeVal(a, b) {
    if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
    if (typeof a === 'object' && typeof b === 'object') { const o = Object.assign({}, a); for (const k in b) o[k] = k in o ? mergeVal(o[k], b[k]) : b[k]; return o; }
    if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
    return num(b) > num(a) ? b : a;
  }
  function unite(a, b) { const o = Object.assign({}, a || {}); for (const k in (b || {})) o[k] = k in o ? mergeVal(o[k], b[k]) : b[k]; return o; }
  function mergeDaily(a, b) {
    a = a || {}; b = b || {};
    const days = Object.assign({}, a.days || {});
    for (const k in (b.days || {})) days[k] = days[k] === 1 || b.days[k] === 1 ? 1 : (days[k] || b.days[k]);
    const last = [a.last || '', b.last || '', ...Object.keys(days)].sort().pop() || '';
    let streak = 0;
    if (last) { for (let d = last; days[d]; d = prevDay(d)) streak++; }
    if (a.last === last) streak = Math.max(streak, a.streak || 0);
    if (b.last === last) streak = Math.max(streak, b.streak || 0);
    return { last, streak, best: Math.max(a.best || 0, b.best || 0, streak), days };
  }
  // online record: the one with the newest game, its history united by game id
  const lastT = x => { const h = x && Array.isArray(x.hist) ? x.hist : []; return h.length ? +h[h.length - 1].t || 0 : 0; };
  function mergeRec(a, b) {
    if (!a) return b || null; if (!b) return a;
    const base = lastT(b) > lastT(a) ? b : a, seen = new Set(), hist = [];
    for (const h of [...(a.hist || []), ...(b.hist || [])]) if (h && !seen.has(h.id)) { seen.add(h.id); hist.push(h); }
    hist.sort((x, y) => (x.t || 0) - (y.t || 0));
    return Object.assign({}, base, { hist: hist.slice(-100) });
  }
  const newer = (a, b, key) => ((b[key + 'T'] || 0) > (a[key + 'T'] || 0) ? b : a);
  function merge(L, C) {
    if (!C) return L; if (!L) return C;
    const s = newer(L, C, 'set'), n = newer(L, C, 'nm'), r = newer(L, C, 'rt');
    return {
      v: 1, on: mergeRec(L.on, C.on), ls: unite(L.ls, C.ls), pz: unite(L.pz, C.pz), po: [...new Set([...(L.po || []), ...(C.po || [])])], dy: mergeDaily(L.dy, C.dy),
      set: Object.assign({}, s.set), setT: s.setT || 0,
      nm: n.nm || L.nm || C.nm || '', nmT: n.nmT || 0,
      rt: r.rt != null ? r.rt : (L.rt != null ? L.rt : C.rt), rtT: r.rtT || 0,
    };
  }
  // write a merged snapshot back to this device
  function apply(d) {
    put(LS_STORE, d.ls || {}); put(PZ_STORE, d.pz || {});
    if (Array.isArray(d.po) && d.po.length) put(PZ_OLDK, { keys: d.po });
    if (d.on) put(OL_REC, d.on);
    if (d.dy) { put(DAILY_STORE, d.dy); Object.assign(daily, { last: '', streak: 0, best: 0, days: {} }, d.dy); }
    const m = meta() || {};
    const langWas = LANG;
    if (d.set) {
      SET_KEYS.forEach(k => { if (k !== 'lang' && d.set[k] !== undefined) settings[k] = d.set[k]; });
      if (!E.RULES[settings.rules]) settings.rules = 'kalah';
      if (![4, 6].includes(settings.seeds)) settings.seeds = 4;
      if (settings.speed !== 'fast') settings.speed = 'normal';
      if (typeof skinApply === 'function') skinApply(settings.skin);
      if (d.set.lang && SUPPORTED.includes(d.set.lang)) { LANG = d.set.lang; settings.lang = LANG; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} }
      const set = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) set[k] = settings[k]; }); set.lang = LANG;
      m.setH = JSON.stringify(set); m.setT = d.setT || 1;
      try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {}
    }
    if (d.nm) { m.nmH = JSON.stringify(d.nm); m.nmT = d.nmT || 1; if (ON && ON.ready && ON.profile.name !== d.nm) ON.setName(d.nm).catch(() => {}); else { try { localStorage.setItem('mancala-online-name', d.nm); } catch (e) {} } }
    m.rtH = JSON.stringify(d.rt); m.rtT = d.rtT || 1;
    put(META, m);
    save(); applyBg();
    if (LANG !== langWas) { const s = $('#langSel'); s.value = LANG; s.dispatchEvent(new Event('change')); }
    renderInfo();
  }
  return { snapshot, merge, apply, mergeDaily };
})();
window.MancalaSync = MancalaSync;
let syncing = false, lastPushed = '', syncLast = 0;
const signedIn = () => !!(olOn() && ON.ready && ON.account());
const strip = d => JSON.stringify(Object.assign({}, d, { t: undefined }));
function syncLastText() { return syncLast ? t('sync.last', { t: new Date(syncLast).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' }) }) : ''; }
async function syncPush() {
  if (!signedIn()) return;
  const d = MancalaSync.snapshot(), s = strip(d);
  try { await ON.push(JSON.stringify(d)); lastPushed = s; syncLast = Date.now(); } catch (e) { console.warn(e); }
}
async function syncNow(quiet) {
  if (!signedIn() || syncing) return;
  syncing = true;
  try {
    const local = MancalaSync.snapshot();
    const c = await ON.pull();
    let merged = local;
    if (c && c.d) { try { merged = MancalaSync.merge(local, JSON.parse(c.d)); } catch (e) { console.warn(e); } }
    MancalaSync.apply(merged);
    syncing = false;
    await syncPush();
    if (!quiet) toast(t('sync.done'), 1400);
  } catch (e) { console.warn(e); if (!quiet) olConfirm(authErrText(e), 'OK', null); }
  syncing = false;
  accRender();
}
// local changes are pushed a few seconds later (polling keeps the main script untouched)
let syncT = 0;
function syncTouch() { clearTimeout(syncT); syncT = setTimeout(() => { if (signedIn() && !syncing && strip(MancalaSync.snapshot()) !== lastPushed) syncPush(); }, 3000); }
function syncNameTouched() { syncTouch(); }
setInterval(syncTouch, 20000);
document.addEventListener('visibilitychange', () => { if (document.hidden) syncPush(); else if (signedIn()) syncNow(true); });
if (olOn()) ON.onAuth(() => { dockRender(); });

// ====================================================================== first visit: profile name + optional Google link
const PF_KEY = 'mancala-profile-asked';
const pfAsked = () => { try { return !!localStorage.getItem(PF_KEY); } catch (e) { return true; } };
const pfDone = () => { try { localStorage.setItem(PF_KEY, String(Date.now())); } catch (e) {} };
function pfOpen() {
  $('#pfName').value = ON.localName() || ON.defaultName();
  showOv('#profOverlay');
}
async function pfSaveName() {
  const n = ON.cleanName($('#pfName').value);
  try { localStorage.setItem('mancala-online-name', n); } catch (e) {}
  if (ON.ready) { try { await ON.setName(n); } catch (e) { console.warn(e); } }
  syncNameTouched(); dockRender();
}
$('#pfLater').onclick = () => { pfDone(); pfSaveName(); hideOv('#profOverlay'); };
$('#pfGoogle').onclick = async () => { pfDone(); await pfSaveName(); hideOv('#profOverlay'); await ON.init().catch(e => { olConfirm(authErrText(e), 'OK', null); }); if (ON.ready) googleLink(); };
$('#pfName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pfLater').click(); });
// shown once, only while nothing else is on screen (no dialog, no lesson / puzzle)
const pfTimer = setInterval(() => {
  if (!olOn() || pfAsked()) { clearInterval(pfTimer); return; }
  if (document.hidden || document.querySelector('.overlay.show') || lesson || puzzle || olLive()) return;
  clearInterval(pfTimer); pfOpen();
}, 1200);

// ====================================================================== misc wiring
const _outsideClose = outsideClose;
outsideClose = function (o) {
  if (o.id === 'onlineOverlay') { $('#olClose').click(); return; }
  if (o.id === 'profOverlay') { $('#pfLater').click(); return; }
  if (o.id === 'olConfirm') { $('#olcNo').click(); return; }
  _outsideClose(o);
};
document.querySelectorAll('#onlineOverlay, #profOverlay, #olConfirm').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; outsideClose(o); });
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const [id, b] of [['#olConfirm', '#olcNo'], ['#onlineOverlay', '#olClose'], ['#profOverlay', '#pfLater']]) if (isShown(id)) { e.stopImmediatePropagation(); $(b).click(); return; }
}, true);
function olLangChanged() {
  applyI18n(); chatRender(); if (isShown('#newOverlay')) olSegSync(); dockRender(); olWatchRender(); olResRender();
  if (isShown('#onlineOverlay')) olRender();
  if (net && net.done && net.result && isShown('#resultOverlay')) olShowResult(net.gid);
  renderInfo();
}
$('#langSel').addEventListener('change', () => olLangChanged());
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
// boot: ?room=CODE joins (or watches) a room; a live game is resumed; the dock connects after a moment
if (olOn()) {
  const q = new URLSearchParams(location.search), code = q.get('room');
  if (code) {
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
    setTimeout(() => { hideOv('#newOverlay'); openOnline(code); }, 0);
  } else olResume();
  accRender();
  setTimeout(() => { dockStart().then(() => { if (signedIn()) syncNow(true); }); }, 800);
} else dockRender();
renderInfo();
