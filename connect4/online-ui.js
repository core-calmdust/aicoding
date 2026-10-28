/* Connect Four — online play UI (lobby dialog, PC dock / phone tab, online games, result & rematch, draw offers, spectating),
   first-visit profile dialog, Google link and cloud sync of local progress. Same as Nine Men's Morris (ported from Dots & Boxes).
   Loaded after the main script and rated.js; uses their globals (settings, moves (string), cur, playMove, update, renderInfo, toast, t, …).
   Backend: online.js (C4Online). */
'use strict';
const ON = window.C4Online;
const olOn = () => !!(ON && ON.available);
const olEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GLOGO = '<svg class="glogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
const olClock = ms => fmtClock(Math.max(0, ms));
const tcText = v => { const c = ON.TC[v] || ON.TC[ON.DEF_V]; return t('ol.tcFmt', { m: c.main / 60000, s: c.inc / 1000 }); };
const varName = v => t('ol.v.' + (ON.VARIANTS.includes(v) ? v : ON.DEF_V));
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
$('.side-in').insertAdjacentHTML('afterbegin', '<div class="card ol-watch hidden" id="olWatch" aria-live="polite"></div>');
$('.controls').insertAdjacentHTML('beforeend', `<button class="btn ol-only" id="btnDraw"><svg viewBox="0 0 24 24"><path d="M7 12h10"/><path d="M5 8h14M5 16h14"/></svg><span data-i18n="ol.draw"></span></button>`);
$('#segMode').insertAdjacentHTML('beforeend', '<button data-v="online" data-i18n="ol.title"></button>');
$('#resultOverlay .modal-actions').insertAdjacentHTML('beforebegin', '<div class="ol-res hidden" id="olRes"></div>');
// the new-game dialog: "online" shows a short description and opens the online dialog
{ const _segSync = segSync; segSync = function () { _segSync(); olSegSync(); }; }
function olSegSync() {
  if (draft.mode !== 'online') return;
  ['#fColor', '#fLevel', '#fLevel2', '#fDisplay', '#fRated'].forEach(s => { const e = $(s); if (e) e.classList.add('hidden'); });
  $('#fInfo').classList.remove('hidden'); $('#fInfoText').textContent = olOn() ? t('ol.ngDesc') : t('ol.setup1') + ' ' + t('ol.setup2');
  $('#btnStart').textContent = t('ol.open');
}
$('#btnStart').addEventListener('click', e => { if (draft.mode !== 'online') return; e.stopImmediatePropagation(); hideOv('#newOverlay'); openOnline(); }, true);
if (!olOn()) { document.body.classList.add('ol-soon'); document.documentElement.classList.add('ol-soon'); }
document.documentElement.classList.add('ol-dock');
applyI18n();

// ====================================================================== confirm dialog
let olcFn = null;
function olConfirm(text, yes, fn) { $('#olcText').textContent = text; $('#olcYes').textContent = yes; $('#olcYes').classList.toggle('hidden', !fn); olcFn = fn; showOv('#olConfirm'); }
$('#olcNo').onclick = () => { olcFn = null; hideOv('#olConfirm'); };
$('#olcYes').onclick = () => { const f = olcFn; olcFn = null; hideOv('#olConfirm'); f && f(); };
// leaving a live game first: an online game is resigned, a rated game vs the AI is forfeited (after a confirmation)
function olGate(fn) {
  if (olLive()) { olConfirm(t('ol.leaveQ'), t('ol.resign'), () => { olResignNow(); fn(); }); return false; }
  if (typeof rtLive === 'function' && rtLive()) { olConfirm(t('rt.abandonQ'), t('rt.abandonYes'), () => { rtForfeit(); renderInfo(); fn(); }); return false; }
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
const OL_V_KEY = 'connect4-online-v';
function olV() { try { const v = localStorage.getItem(OL_V_KEY); if (ON.VARIANTS.includes(v)) return v; } catch (e) {} return ON.DEF_V; }
function olSetV(v) { try { localStorage.setItem(OL_V_KEY, String(v)); } catch (e) {} }
function olVarSeg(cls) {
  const cur = olV();
  return `<div class="ol-tc ${cls || ''}" role="radiogroup" aria-label="${olEsc(t('ol.game'))}">` + ON.VARIANTS.map(v => `<button type="button" role="radio" data-ov="${v}" class="${v === cur ? 'sel' : ''}" aria-checked="${v === cur}"><b>${olEsc(varName(v))}</b><small>${olEsc(tcText(v))}</small></button>`).join('') + '</div>';
}
document.addEventListener('click', e => { const b = e.target.closest('.ol-tc button[data-ov]'); if (!b) return; olSetV(b.dataset.ov); document.querySelectorAll('.ol-tc button[data-ov]').forEach(x => { const s = x.dataset.ov === olV(); x.classList.toggle('sel', s); x.setAttribute('aria-checked', s); }); });
const OL_ST = { idle: 'ol.st.idle', lobby: 'ol.st.lobby', play: 'ol.st.play', room: 'ol.st.room', watch: 'ol.st.watch' };
function olRoomRows(list) {
  const me = ON.uid;
  if (!list.length) return `<div class="ol-note small">${t('ol.noRooms')}</div>`;
  return list.map(r => `<div class="${r.host === me ? 'me' : ''}${r.game ? ' ingame' : ''}"><span>${olEsc(r.name)} <small>R${r.rating ?? ''} · ${olEsc(varName(r.v))}</small>${r.game ? ` <small class="ol-ing">${t('ol.st.play')}</small>` : ''}</span>${r.host === me || r.guest === me ? '' : r.game ? `<button class="dk-watch" data-code="${olEsc(r.id)}">${t('ol.watch')}</button>` : `<button class="dk-join" data-code="${olEsc(r.id)}">${t('ol.join')}</button>`}</div>`).join('');
}
async function olJoin(code, btn) {
  if (olLive() || (typeof rtLive === 'function' && rtLive())) { olGate(() => olJoin(code)); return; }
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
      <div class="ol-tcbox"><div class="ol-tcl">${t('ol.game')} · ${t('ol.tc')}</div>${olVarSeg()}</div>
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
const olRoomUrl = code => location.origin + location.pathname + '?room=' + code + (ON.mock ? '&mock=1' : '');
const OL_RK = 'connect4-online-rk';
function olRk() { try { return localStorage.getItem(OL_RK) === 'key' ? 'key' : 'open'; } catch (e) { return 'open'; } }
function olSetRk(v) { try { localStorage.setItem(OL_RK, v); } catch (e) {} }
const rankRows = list => list.length ? list.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}. ${olEsc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="ol-note small">${t('ol.noRank')}</div>`;
function olLeftText() { const r = olOn() && ON.room; return r ? (r.game ? t('ol.st.play') : t('ol.roomLeft', { t: olClock(r.left) })) : ''; }
async function olStartSearch() {
  if (olLive() || (typeof rtLive === 'function' && rtLive())) { olGate(olStartSearch); return; }
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
  const go = () => { hideOv('#onlineOverlay'); startOnlineGame(gid); };
  if (typeof rtLive === 'function' && rtLive()) { rtForfeit(); toast(t('ol.rtLeft'), 2600); }
  go();
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
// net = { gid, game, me (1 / 2; -1 spectator), spectate, unsub, wUnsub, done, pending, saved, result, watchers }
let net = null;
const OL_LIVE_P = 'connect4-online-live:';           // + uid (one live game per player, also with several tabs)
const olLiveKey = () => OL_LIVE_P + (ON.uid || '');
function olLive() { return !!(net && !net.spectate && !net.done && net.game && net.game.status === 'play'); }
function olClearLive(gid) { try { const s = JSON.parse(localStorage.getItem(olLiveKey()) || 'null'); if (s && s.gid === gid) localStorage.removeItem(olLiveKey()); } catch (e) {} }
function startOnlineGame(gid, spec) {
  if (net && net.gid === gid && !!net.spectate === !!spec) return;
  const saved = net ? net.saved : { moves, cur, evals: evals.slice(), humanColor, mode: settings.mode, resigned };
  if (net) olDetach(true);
  if (lesson || puzzle) exitSpecial();
  ['#onlineOverlay', '#resultOverlay', '#newOverlay', '#resumeOverlay', '#lessonOverlay', '#puzzleOverlay', '#olConfirm', '#profOverlay', '#rtConfirm', '#rulesOverlay'].forEach(hideOv);
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0;
  if (typeof rvCancel === 'function') { rvCancel(); rv = null; rvOpen = false; }
  net = { gid, game: null, me: -1, spectate: !!spec, done: false, pending: false, saved };
  settings.mode = 'online'; resigned = null;
  moves = ''; cur = 0; evals = []; hintList = null; reviewing = false; gameOverShown = true;
  document.body.classList.add('in-online'); document.body.classList.toggle('in-watch', !!spec);
  net.unsub = spec ? ON.spectate(gid, g => onNetGame(gid, g)) : ON.watchGame(gid, g => onNetGame(gid, g));
  net.wUnsub = ON.watchCount(gid, n => { if (net && net.gid === gid) { net.watchers = n; olWatchRender(); } });
  if (!spec) { try { localStorage.setItem(olLiveKey(), JSON.stringify({ uid: ON.uid, gid })); } catch (e) {} }
  mtab('game'); update(false); olWatchRender(); dockRender();
}
// stop following the online game; the local game comes back (keepMode: another online game follows)
function olDetach(keepMode) {
  if (!net) return;
  const n = net; net = null;
  n.unsub && n.unsub(); n.wUnsub && n.wUnsub();
  olClearLive(n.gid);
  document.body.classList.remove('in-online', 'in-watch');
  hideOv('#resultOverlay'); $('#olRes').classList.add('hidden');
  if (olOn() && ON.ready) { const r = ON.room; ON.setPresence(r && !r.game ? 'room' : 'idle', { room: r && !r.game && !r.priv ? r.code : null }).catch(() => {}); }
  if (keepMode) return;
  const s = n.saved;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; hintList = null;
  if (typeof rvCancel === 'function') { rvCancel(); rv = null; rvOpen = false; }
  settings.mode = s.mode === 'online' ? 'pvp' : s.mode;
  moves = s.moves; cur = s.cur; evals = s.evals; humanColor = s.humanColor; resigned = s.resigned; reviewing = cur !== moves.length;
  gameOverShown = gameOver(moves);
  update(false); olWatchRender(); dockRender(); afterPosition();
}
function olResignNow() {
  if (!olLive()) return;
  const gid = net.gid, g = net.game, me = net.me;
  ON.resign(gid).then(() => ON.applyResult(gid, Object.assign({}, g, { status: 'resign', loser: ON.uid }), 0)).catch(e => console.warn(e));
  olDetach();
}
const prefixOf = (a, b) => a.length <= b.length && b.startsWith(a);
function onNetGame(gid, g) {
  if (!net || net.gid !== gid) return;
  if (!g) { toast(t('ol.gone'), 2200); olDetach(); return; }
  const first = !net.game;
  net.game = g;
  if (!net.spectate) net.me = ON.sideNo(g, ON.uid) || -1;
  if (net.me < 0 && !net.spectate) { net.spectate = true; document.body.classList.add('in-watch'); }
  const st = ON.replay(g.v, g.moves);
  if (!st.ok && !net.warned) { net.warned = true; toast(t('ol.illegal'), 2500); console.warn('illegal online move at', st.bad); }
  const remote = st.moves;
  if (first) {
    moves = remote; cur = moves.length; reviewing = false; evals = []; humanColor = net.me > 0 ? net.me : P1;
    update(false);
  } else if (prefixOf(moves, remote)) {
    const extra = remote.slice(moves.length);
    if (extra.length === 1 && cur === moves.length) playMove(+extra - 1);
    else if (extra.length) { const atEnd = cur === moves.length; moves = remote; if (atEnd) { cur = moves.length; reviewing = false; } update(false); }
  } else if (net.pending && prefixOf(remote, moves)) { /* my move is on its way */ }
  else { moves = remote; cur = moves.length; reviewing = false; update(false); }
  if (g.status !== 'play') finishOnline(g);
  else if (st.ok && st.over && !net.spectate) ON.markOver(gid).catch(() => {});
  if (g.next && net.done) {           // the rematch is ready (room games)
    const nx = g.next; setTimeout(() => { if (net && net.gid === gid) startOnlineGame(nx); }, 400);
  }
  renderInfo(); olWatchRender(); olResRender();
}
// hooks used by the main script
// the result of an online game that did not end on the board (resign / timeout / abandonment / agreed draw); null = the board decides
function olOver() {
  const g = net && net.game; if (!g || g.status === 'play' || g.status === 'over' || String(g.moves || '') !== moves) return null;
  const w = ON.winnerOf(g);
  return w ? { winner: w, resign: true, loser: 3 - w, online: g.status } : { winner: 0, draw: true, online: g.status };
}
function olCanMove() {
  const g = net && net.game;
  return !!(g && !net.spectate && !net.done && !net.pending && g.status === 'play' && cur === moves.length && moves === String(g.moves || '') && toMoveOf(moves) === net.me);
}
function olHumanMove(m) {
  if (!olCanMove()) return;
  const gid = net.gid, len = moves.length;
  net.pending = true;
  playMove(m);
  ON.sendMove(gid, len, m).then(ok => {
    if (!net || net.gid !== gid) return;
    net.pending = false;
    if (!ok) { toast(t('ol.moveFail'), 1800); onNetGame(gid, net.game); }
    renderInfo();
  }).catch(err => { console.warn(err); if (net && net.gid === gid) { net.pending = false; toast(t('ol.error'), 2000); onNetGame(gid, net.game); } });
}
function olPlayerName(p) {
  const g = net && net.game; if (!g) return '…';
  const nm = p === P1 ? g.bn : g.wn, r = p === P1 ? g.br : g.wr;
  return (nm || '?') + (typeof r === 'number' ? ' (' + r + ')' : '') + (!net.spectate && p === net.me ? ' · ' + t('you') : '');
}
function olShortName(p) { const g = net && net.game; return g ? ((p === P1 ? g.bn : g.wn) || '?') : '?'; }
// clocks in the player cards + timeout / abandonment claims
function olClockTick() {
  if (!net || !net.game || settings.mode !== 'online') return;
  const g = net.game, live = g.status === 'play' && !net.done, tm = live ? toMoveOf(moves) : 0, now = ON.now();
  for (const p of [P1, P2]) {
    const side = p === P1 ? 'b' : 'w', moving = live && tm === p && !net.pending;
    const k = ON.clockOf(g, side, moving, now), el = $('#clk' + p);
    el.textContent = olClock(k.left); el.classList.toggle('low', moving && k.left < 10000); el.classList.toggle('ol-move', moving);
    if (moving && !net.spectate && p === net.me && window.CountTick) CountTick.feed(k.left, 'ol' + moves.length);   // time signal on my own clock
  }
  if (live && !net.spectate && tm && tm !== net.me && !net.claiming) {
    const opp = net.me === P1 ? g.w : g.b, k = ON.clockOf(g, net.me === P1 ? 'w' : 'b', true, now);
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
  $('#infoLine').textContent = g ? `${varName(g.v)}  ·  ${t(g.rated ? 'ol.rated' : 'ol.friendly')}  ·  ${tcText(g.v)}  ·  ${t('info.moves', { n: moves.length })}` : '';
  $('#btnResign').disabled = !olLive();
  $('#btnDraw').disabled = !olLive() || !!(g && g.offer && g.offer.by);
  olDrawRender();
}
// draw offers: shown in the game card above the players
function olDrawRender() {
  const g = net && net.game, box = $('#olWatch');
  const old = box.querySelector('.ol-offer'); if (old) old.remove();
  if (!g || g.status !== 'play' || !g.offer || !g.offer.by || net.done) return;
  const mine = g.offer.by === ON.uid;
  const d = document.createElement('div'); d.className = 'ol-offer';
  d.innerHTML = net.spectate ? `<span>${t('ol.drawW')}</span>` : mine ? `<span>${t('ol.drawSent')}</span>` : `<span>${t('ol.drawGot')}</span><button id="olDrawNo">${t('ol.decline')}</button><button class="go" id="olDrawYes">${t('ol.accept')}</button>`;
  box.appendChild(d); box.classList.remove('hidden');
  const y = $('#olDrawYes'); if (y) y.onclick = () => ON.answerDraw(net.gid, true).catch(e => console.warn(e));
  const n = $('#olDrawNo'); if (n) n.onclick = () => ON.answerDraw(net.gid, false).catch(e => console.warn(e));
}
function olWatchRender() {
  const el = $('#olWatch');
  if (!net || !net.game) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const g = net.game, w = net.watchers || 0;
  el.classList.remove('hidden'); el.classList.toggle('pl', !net.spectate);
  if (net.spectate) el.innerHTML = `<span class="wl">${t('ol.watching')}</span><span class="wi">${olEsc(g.bn)} vs ${olEsc(g.wn)} · ${olEsc(varName(g.v))} · ${t('ol.watchers', { n: w })}</span><button id="olWatchStop">${t('ol.watchStop')}</button>`;
  else el.innerHTML = `<span class="wi">${t(g.rated ? 'ol.rated' : 'ol.friendly')} · ${olEsc(varName(g.v))} · ${olEsc(tcText(g.v))}${w ? ' · ' + t('ol.watchers', { n: w }) : ''}</span>${net.done ? `<button id="olWatchStop">${t('ol.leaveGame')}</button>` : ''}`;
  const b = $('#olWatchStop'); if (b) b.onclick = () => olDetach();
  olDrawRender();
}
// ---------------------------------------------------------------- the end of an online game
function olWhy(g, me) {
  const loserNo = g.loser ? ON.sideNo(g, g.loser) : 0, p = loserNo ? olShortName(loserNo) : '';
  if (g.status === 'resign') return g.loser === ON.uid ? t('ol.youResigned') : me > 0 ? t('ol.oppResigned') : t('ol.wResign', { p });
  if (g.status === 'timeout') return g.loser === ON.uid ? t('ol.youTimeout') : me > 0 ? t('ol.oppTimeout') : t('ol.wTime', { p });
  if (g.status === 'abandon') return g.loser === ON.uid ? t('ol.youAbandon') : me > 0 ? t('ol.oppAbandon') : t('ol.wAbandon', { p });
  if (g.status === 'draw') return t('ol.drawAgreed');
  return g.why === 'full' ? t('ol.why.full') : '';
}
async function finishOnline(g) {
  if (!net || net.done) return;
  net.done = true; net.pending = false;
  olClearLive(net.gid);
  const gid = net.gid, winner = ON.winnerOf(g) || 0, me = net.spectate ? -1 : net.me;
  net.result = { winner, why: olWhy(g, me), rating: null };
  if (me > 0) {
    const score = !winner ? 0.5 : winner === me ? 1 : 0;
    try { net.result.rating = await ON.applyResult(gid, g, score); } catch (e) { console.warn(e); }
    syncTouch();
  }
  if (!net || net.gid !== gid) return;
  setTimeout(() => { if (net && net.gid === gid) olShowResult(); }, g.status === 'over' ? 900 : 250);
  renderInfo(); olWatchRender(); dockRender();
}
function olShowResult() {
  const g = net.game, R = net.result, me = net.spectate ? -1 : net.me;
  $('#resultDisc').innerHTML = R.winner ? `<div class="pdisc p${R.winner}"></div>` : '';
  $('#resultTitle').textContent = !R.winner ? t('res.draw') : me < 0 ? t('ol.pWin', { p: olShortName(R.winner) }) : R.winner === me ? t('ol.win') : t('ol.lose');
  let sub = olEsc((R.why ? R.why + ' · ' : '') + `${olShortName(P1)} vs ${olShortName(P2)} · ${varName(g.v)}`) + '<br>' + olEsc(t('res.sub', { n: moves.length }));
  if (R.rating && R.rating.rated) sub += `<div class="ol-rchg">${t('ol.rating')} ${R.rating.old} → <b>${R.rating.now}</b> <span class="${R.rating.now >= R.rating.old ? 'up' : 'dn'}">(${R.rating.now >= R.rating.old ? '+' : ''}${R.rating.now - R.rating.old})</span></div>`;
  else if (R.rating && R.rating.note && ON.secMsg) sub += `<div class="ol-rchg">${olEsc(ON.secMsg(R.rating.note))}</div>`;
  $('#resultSub').innerHTML = sub;
  if (me > 0) { playChime(R.winner === me || !R.winner); if (R.winner === me) confetti(); }
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
// #btnResign (投了) is in the main menu (common spec): its confirmation is shared/resign.js, then this sends the resignation
window.olResignGame = () => { if (olLive()) ON.resign(net.gid).catch(e => { console.warn(e); toast(t('ol.error'), 2000); }); };
$('#btnDraw').onclick = () => { if (olLive()) olConfirm(t('ol.drawQ'), t('ol.draw'), () => { if (olLive()) ON.offerDraw(net.gid).then(r => { if (r && r.committed) toast(t('ol.drawSent'), 1600); }).catch(e => console.warn(e)); }); };
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
      const w = ON.winnerOf(g), r = await ON.applyResult(s.gid, g, !w ? 0.5 : w === me ? 1 : 0);
      toast(t('ol.endedAway', { r: !w ? t('res.draw') : w === me ? t('ol.win') : t('ol.lose') }) + (r && r.rated && r.now !== r.old ? ` · R ${r.old} → ${r.now}` : ''), 4000);
      return;
    }
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
// d = JSON of a snapshot: ls lessons {key: {best, clear}}, pz puzzles {key: stars}, po puzzles kept in their old version {keys[]},
// dy daily {last, streak, best, days}, rd rated games vs the AI {r, n, w, l, d, hist[]}, set settings (+ setT), nm name (+ nmT), rt online rating (+ rtT).
// Merge: progress keys are united (best / stars max, clear / pass or), daily days united and the streak recomputed,
// rated: the record with the newest game, its history united by game id; settings / name: newest wins.
const C4Sync = (() => {
  const META = 'connect4-sync-meta';
  const SET_KEYS = ['sound', 'eval', 'anim', 'last', 'threat', 'hint', 'level', 'level2', 'color', 'lang'];
  const RT_STORE = 'c4-rated-v1';   // rated.js
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
    const d = {
      v: 1, ls: get(LS_STORE, {}), pz: get(PZ_STORE, {}), po: get(PZ_OLDK, null),
      dy: get(DAILY_STORE, { last: '', streak: 0, best: 0, days: {} }), rd: get(RT_STORE, null),
      set, setT: stamp('set', set), nm, nmT: stamp('nm', nm), rt, rtT: stamp('rt', rt),
    };
    put(META, m);
    return d;
  }
  // values: numbers → max, true / 1 → kept, objects → merged key by key (best max, clear / pass or)
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
  const lastT = x => { const h = x && Array.isArray(x.hist) ? x.hist : []; return h.length ? +h[h.length - 1].t || 0 : 0; };
  function mergeRated(a, b) {
    if (!a) return b || null; if (!b) return a;
    const base = lastT(b) > lastT(a) ? b : a, seen = new Set(), hist = [];
    for (const h of [...(a.hist || []), ...(b.hist || [])]) if (h && !seen.has(h.id)) { seen.add(h.id); hist.push(h); }
    hist.sort((x, y) => (x.t || 0) - (y.t || 0));
    return Object.assign({}, base, { hist: hist.slice(-100) });
  }
  // puzzle slots that keep their old version: united (no list on either side = not decided yet on that device)
  function mergeOld(a, b) {
    const ka = a && Array.isArray(a.keys) ? a.keys : null, kb = b && Array.isArray(b.keys) ? b.keys : null;
    if (!ka && !kb) return null;
    return { keys: [...new Set([...(ka || []), ...(kb || [])])] };
  }
  const newer = (a, b, key) => ((b[key + 'T'] || 0) > (a[key + 'T'] || 0) ? b : a);
  function merge(L, C) {
    if (!C) return L; if (!L) return C;
    const s = newer(L, C, 'set'), n = newer(L, C, 'nm'), r = newer(L, C, 'rt');
    return {
      v: 1, ls: unite(L.ls, C.ls), pz: unite(L.pz, C.pz), po: mergeOld(L.po, C.po), dy: mergeDaily(L.dy, C.dy), rd: mergeRated(L.rd, C.rd),
      set: Object.assign({}, s.set), setT: s.setT || 0,
      nm: n.nm || L.nm || C.nm || '', nmT: n.nmT || 0,
      rt: r.rt != null ? r.rt : (L.rt != null ? L.rt : C.rt), rtT: r.rtT || 0,
    };
  }
  // write a merged snapshot back to this device
  function apply(d) {
    put(LS_STORE, d.ls || {}); put(PZ_STORE, d.pz || {});
    if (d.po && Array.isArray(d.po.keys)) { put(PZ_OLDK, d.po); pzOldSet = null; }
    if (d.dy) { put(DAILY_STORE, d.dy); Object.assign(daily, { last: '', streak: 0, best: 0, days: {} }, d.dy); }
    if (d.rd) put(RT_STORE, d.rd);
    const m = meta() || {};
    const langWas = LANG;
    if (d.set) {
      SET_KEYS.forEach(k => { if (k !== 'lang' && d.set[k] !== undefined) settings[k] = d.set[k]; });
      if (d.set.lang && SUPPORTED.includes(d.set.lang)) { LANG = d.set.lang; settings.lang = LANG; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} }
      const set = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) set[k] = settings[k]; }); set.lang = LANG;
      m.setH = JSON.stringify(set); m.setT = d.setT || 1;
    }
    if (d.nm) { m.nmH = JSON.stringify(d.nm); m.nmT = d.nmT || 1; if (ON && ON.ready && ON.profile.name !== d.nm) ON.setName(d.nm).catch(() => {}); else { try { localStorage.setItem('connect4-online-name', d.nm); } catch (e) {} } }
    m.rtH = JSON.stringify(d.rt); m.rtT = d.rtT || 1;
    put(META, m);
    save();
    if (LANG !== langWas) olLangChanged(true);
    renderInfo();
  }
  return { snapshot, merge, apply, mergeDaily, mergeRated };
})();
window.C4Sync = C4Sync;
let syncing = false, lastPushed = '', syncLast = 0;
const signedIn = () => !!(olOn() && ON.ready && ON.account());
const strip = d => JSON.stringify(Object.assign({}, d, { t: undefined }));
function syncLastText() { return syncLast ? t('sync.last', { t: new Date(syncLast).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' }) }) : ''; }
async function syncPush() {
  if (!signedIn()) return;
  const d = C4Sync.snapshot(), s = strip(d);
  try { await ON.push(JSON.stringify(d)); lastPushed = s; syncLast = Date.now(); } catch (e) { console.warn(e); }
}
async function syncNow(quiet) {
  if (!signedIn() || syncing) return;
  syncing = true;
  try {
    const local = C4Sync.snapshot();
    const c = await ON.pull();
    let merged = local;
    if (c && c.d) { try { merged = C4Sync.merge(local, JSON.parse(c.d)); } catch (e) { console.warn(e); } }
    C4Sync.apply(merged);
    syncing = false;
    await syncPush();
    if (!quiet) toast(t('sync.done'), 1400);
  } catch (e) { console.warn(e); if (!quiet) olConfirm(authErrText(e), 'OK', null); }
  syncing = false;
  accRender();
}
// local changes are pushed a few seconds later (polling keeps the main script untouched)
let syncT = 0;
function syncTouch() { clearTimeout(syncT); syncT = setTimeout(() => { if (signedIn() && !syncing && strip(C4Sync.snapshot()) !== lastPushed) syncPush(); }, 3000); }
function syncNameTouched() { syncTouch(); }
setInterval(syncTouch, 20000);
document.addEventListener('visibilitychange', () => { if (document.hidden) syncPush(); else if (signedIn()) syncNow(true); });
if (olOn()) ON.onAuth(() => { dockRender(); });

// ====================================================================== first visit: profile name + optional Google link
const PF_KEY = 'connect4-profile-asked';
const pfAsked = () => { try { return !!localStorage.getItem(PF_KEY); } catch (e) { return true; } };
const pfDone = () => { try { localStorage.setItem(PF_KEY, String(Date.now())); } catch (e) {} };
function pfOpen() {
  $('#pfName').value = ON.localName() || ON.defaultName();
  showOv('#profOverlay');
}
async function pfSaveName() {
  const n = ON.cleanName($('#pfName').value);
  try { localStorage.setItem('connect4-online-name', n); } catch (e) {}
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
const _dismiss = dismissOverlay;
dismissOverlay = function (o) {
  if (o.id === 'onlineOverlay') { $('#olClose').click(); return; }
  if (o.id === 'profOverlay') { $('#pfLater').click(); return; }
  if (o.id === 'olConfirm') { $('#olcNo').click(); return; }
  _dismiss(o);
};
document.querySelectorAll('#onlineOverlay, #profOverlay, #olConfirm').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); });
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const [id, b] of [['#olConfirm', '#olcNo'], ['#onlineOverlay', '#olClose'], ['#profOverlay', '#pfLater']]) if (isShown(id)) { e.stopImmediatePropagation(); $(b).click(); return; }
}, true);
function olLangChanged(full) {
  if (full) { applyI18n(); renderFx(); if (isShown('#newOverlay')) segSync(); }
  applyI18n(); chatRender(); if (isShown('#newOverlay')) olSegSync(); dockRender(); olWatchRender(); olResRender();
  if (isShown('#onlineOverlay')) olRender();
  if (net && net.done && isShown('#resultOverlay')) olShowResult();
  renderInfo();
}
$('#langSel').addEventListener('change', () => olLangChanged());
// boot: ?room=CODE joins (or watches) a room; a live game is resumed; the dock connects after a moment
if (olOn()) {
  const q = new URLSearchParams(location.search), code = q.get('room');
  if (code) {
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
    hideOv('#newOverlay'); openOnline(code);
  } else olResume();
  accRender();
  setTimeout(() => { dockStart().then(() => { if (signedIn()) syncNow(true); }); }, 800);
} else dockRender();
renderInfo();
