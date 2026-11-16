/* Ludo & Pachisi — online play UI (lobby dialog, PC dock / phone tab, online games, result & rematch, spectating), first-visit
   profile dialog, Google link and cloud sync of local progress. Ported from ウル王朝のゲーム (ur/online-ui.js).
   Loaded after app.js / review.js / rated.js / app-learn.js; uses their globals (settings, G, step, doRoll, commit, renderPlayers, toast,
   t, …). Backend: online.js (LudoOnline). Two players only (Ludo: seats 0 + 2; Pachisi: one player yellow + black, the other red + green).
   Hooks in app.js (G.mode === 'online'): humanSeat → olHuman, seatName → olSeatName, step → olStep, doRoll → olThrow (my throw from the
   commit–reveal chains), commit → olSend (my move goes out first, then it is played on the board), the clock in the player rows,
   投了 → olResignAsk, save() keeps the local game (window.__olLocal), gameOver → online-ui shows the result.
   On the board the online game's state has its ctrl turned round when I hold side 1 (I am always ctrl 0 = "you", as in an AI game:
   the review, the coach and the places then work unchanged). */
'use strict';
const ON = window.LudoOnline;

// 2026-11-12 (shogi's online look for every game): the two panels' titles, 「ロビーに戻る」 — their own small dictionary
const OLX = {
  paneRated: { ja: 'レート戦', en: 'Rated game', zh: '等级分对局', ko: '레이팅전', es: 'Partida puntuada', fr: 'Partie classée', pt: 'Partida ranqueada', de: 'Gewertete Partie', hi: 'रेटेड खेल', ar: 'مباراة مصنّفة', ru: 'Рейтинговая партия', 'zh-TW': '積分對局', id: 'Permainan berperingkat', tr: 'Puanlı oyun' },
  paneRatedSub: { ja: '近いレートの相手と自動で対局', en: 'Matched automatically with a player near your rating', zh: '自动匹配等级分相近的对手', ko: '비슷한 레이팅의 상대와 자동 매칭', es: 'Emparejamiento automático con un rival de nivel parecido', fr: 'Appariement automatique avec un joueur de niveau proche', pt: 'Pareamento automático com alguém de rating próximo', de: 'Automatisch gegen einen Gegner mit ähnlicher Wertung', hi: 'मिलती-जुलती रेटिंग वाले खिलाड़ी से अपने-आप मुकाबला', ar: 'مطابقة تلقائية مع لاعب قريب من تصنيفك', ru: 'Автоподбор соперника близкого рейтинга', 'zh-TW': '自動配對積分相近的對手', id: 'Dipasangkan otomatis dengan pemain berperingkat mirip', tr: 'Yakın puanlı bir rakiple otomatik eşleşme' },
  paneRoom: { ja: '部屋で対戦', en: 'Play in a room', zh: '房间对局', ko: '방에서 대국', es: 'Jugar en una sala', fr: 'Jouer dans un salon', pt: 'Jogar em uma sala', de: 'In einem Raum spielen', hi: 'कमरे में खेलें', ar: 'اللعب في غرفة', ru: 'Игра в комнате', 'zh-TW': '房間對局', id: 'Main di ruang', tr: 'Odada oyna' },
  paneRoomSub: { ja: '友達と・レート変動なし', en: 'With friends · no rating change', zh: '和朋友 · 不计等级分', ko: '친구와 · 레이팅 변동 없음', es: 'Con amigos · sin cambio de puntuación', fr: 'Entre amis · sans effet sur le classement', pt: 'Com amigos · sem mudar o rating', de: 'Mit Freunden · ohne Wertung', hi: 'दोस्तों के साथ · रेटिंग में बदलाव नहीं', ar: 'مع الأصدقاء · دون تغيير التصنيف', ru: 'С друзьями · без изменения рейтинга', 'zh-TW': '和朋友 · 不計積分', id: 'Dengan teman · peringkat tetap', tr: 'Arkadaşlarla · puan değişmez' },
  rulesMore: { ja: 'マッチングとレートのしくみ', en: 'How matching and rating work', zh: '匹配与等级分说明', ko: '매칭과 레이팅 안내', es: 'Cómo funcionan el emparejamiento y la puntuación', fr: 'Appariement et classement', pt: 'Como funcionam o pareamento e o rating', de: 'So funktionieren Zuordnung und Wertung', hi: 'मिलान और रेटिंग कैसे काम करते हैं', ar: 'كيف تعمل المطابقة والتصنيف', ru: 'Как работают подбор и рейтинг', 'zh-TW': '配對與積分說明', id: 'Cara kerja pencocokan dan peringkat', tr: 'Eşleşme ve puan nasıl işler' },
  toLobby: { ja: 'ロビーに戻る', en: 'Back to lobby', zh: '返回大厅', ko: '로비로 돌아가기', es: 'Volver al vestíbulo', fr: 'Retour au salon', pt: 'Voltar ao saguão', de: 'Zurück zur Lobby', hi: 'लॉबी पर लौटें', ar: 'العودة إلى الردهة', ru: 'В лобби', 'zh-TW': '返回大廳', id: 'Kembali ke lobi', tr: 'Lobiye dön' },
};
const olx = k => { const L = typeof LANG === 'string' ? LANG : (document.documentElement.lang || 'en'); return (OLX[k] && (OLX[k][L] || OLX[k].en)) || k; };
// online play set up here: a Firebase config (or the mock), and the shared project's rules know this game's node. Until the user
// publishes konane/database.rules.json with the ludo/ node, OnlineSec.rehome() reports 'not-configured': the dock shows 準備中.
// A device that has never connected starts in that state (no full bar that turns into 準備中 a moment later); the connection is
// tried on every visit (dockStart) and the full dock comes as soon as it works (remembered: OK_KEY). NOCFG_KEY: the last verdict.
const NOCFG_KEY = 'ludo-online-nocfg', OK_KEY = 'ludo-online-ok';
let olNotCfg = (() => { if (!ON || ON.mock || !ON.available) return false; try { return !localStorage.getItem(OK_KEY) || !!localStorage.getItem(NOCFG_KEY); } catch (e) { return true; } })();
const olOn = () => !!(ON && ON.available) && !olNotCfg;
const olEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GLOGO = '<svg class="glogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
const olClock = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const tcText = () => t('ol.tcFmtD', { s: ON.DELAY / 1000 });
const varName2 = v => t('rule.' + (ON.VARIANTS.includes(v) ? v : ON.DEF_V)) + ' · ' + t('ol.2p');
const showOv = id => $(id).classList.add('show');
const hideOv = id => $(id).classList.remove('show');
const isShown = id => $(id).classList.contains('show');
const olSleep = ms => new Promise(r => setTimeout(r, ms));
function olNotConfigured(e) {   // init failed: the shared database does not know this game yet → 準備中 (remembered for the next visit)
  if (!/not-configured/.test(String((e && (e.message || e.code)) || e || ''))) return false;
  try { localStorage.setItem(NOCFG_KEY, String(Date.now())); localStorage.removeItem(OK_KEY); } catch (x) {}
  if (!olNotCfg) { olNotCfg = true; olSoonMode(); }
  return true;
}
function olSoonMode() { document.body.classList.toggle('ol-soon', !olOn()); document.documentElement.classList.toggle('ol-soon', !olOn()); try { dockRender(); if (isShown('#onlineOverlay')) olRender(olOn() ? 'menu' : 'setup'); if (isShown('#newOverlay')) olSegSync(); } catch (e) {} }

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
<div class="mt-strip" id="mtStrip" role="button"></div>`);
$('#mtabs').insertAdjacentHTML('beforeend', '<button data-t="online" type="button"><span data-i18n="ol.title"></span> <em id="mtCount"></em> <em class="mt-chat" id="mtChat"></em></button>');
// online game info (rated / room, rules, watchers, "stop watching") at the top of the position card
$('#evalCard').insertAdjacentHTML('afterbegin', '<div class="ol-watch hidden" id="olWatch" aria-live="polite"></div>');
$('#segMode').insertAdjacentHTML('beforeend', '<button data-v="online" data-i18n="ol.title"></button>');
$('#fMode').insertAdjacentHTML('afterend', '<div class="field hidden" id="fOlInfo"><p class="ol-note" id="fOlText"></p></div>');
$('#resultOverlay .modal-actions').insertAdjacentHTML('beforebegin', '<div class="ol-res hidden" id="olRes"></div>');
// the new-game dialog: "online" shows a short description and opens the online dialog (nglux shows the room screen inside it)
{ const _rd = renderDialog; renderDialog = function () { _rd(); olSegSync(); }; }
function olSegSync() {
  const on = !!draft && draft.mode === 'online';
  $('#fOlInfo').classList.toggle('hidden', !on);
  if (!on) { $('#btnStart').textContent = t('start'); return; }
  ['#fRules', '#fRatedInfo', '#fPlayers', '#fFirst', '#fLevel', '#fOpts', '#fHouse2', '#fDisplay'].forEach(s => { const el = $(s); if (el) el.classList.add('hidden'); });
  $('#fOlText').textContent = olOn() ? t('ol.ngDesc') : t('ol.setup1') + ' ' + t('ol.setup2');
  $('#btnStart').textContent = t('ol.open');
}
$('#btnStart').addEventListener('click', e => { if (!draft || draft.mode !== 'online') return; e.stopImmediatePropagation(); hideOv('#newOverlay'); openOnline(); }, true);
if (!olOn()) { document.body.classList.add('ol-soon'); document.documentElement.classList.add('ol-soon'); }
document.documentElement.classList.add('ol-dock'); document.body.classList.remove('no-online');
applyI18n();

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
const OL_V_KEY = 'ludo-online-v';
function olV() { try { const v = localStorage.getItem(OL_V_KEY); if (ON.VARIANTS.includes(v)) return v; } catch (e) {} return ON.DEF_V; }
function olSetV(v) { try { localStorage.setItem(OL_V_KEY, String(v)); } catch (e) {} }
// the rule: matchmaking pairs players of the same rule
function olVarSeg(cls) {
  const cur = olV();
  return `<div class="ol-tc ${cls || ''}" role="radiogroup" aria-label="${olEsc(t('ng.rule'))}">` + ON.VARIANTS.map(x => `<button type="button" role="radio" data-ov="${x}" class="${x === cur ? 'sel' : ''}" aria-checked="${x === cur}"><b>${olEsc(t('rule.' + x))}</b><small>${olEsc(t('ol.2p') + ' · ' + tcText())}</small></button>`).join('') + '</div>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('.ol-tc button[data-ov]'); if (!b) return;
  if (ON.VARIANTS.includes(b.dataset.ov)) olSetV(b.dataset.ov);
  const nv = olV();
  document.querySelectorAll('.ol-tc button[data-ov]').forEach(x => { const s = x.dataset.ov === nv; x.classList.toggle('sel', s); x.setAttribute('aria-checked', s); });
});
const OL_ST = { idle: 'ol.st.idle', lobby: 'ol.st.lobby', play: 'ol.st.play', room: 'ol.st.room', watch: 'ol.st.watch' };
function olRoomRows(list) {
  const me = ON.uid;
  if (!list.length) return `<div class="ol-note small">${t('ol.noRooms')}</div>`;
  return list.map(r => `<div class="ol-r2${r.host === me ? ' me' : ''}${r.game ? ' ingame' : ''}"><span><span class="ol-r2a">${olEsc(r.name)}</span><small class="ol-r2b">R${r.rating ?? ''} · ${olEsc(t('rule.' + (ON.VARIANTS.includes(r.v) ? r.v : ON.DEF_V)))}</small>${r.game ? ` <small class="ol-ing">${t('ol.st.play')}</small>` : ''}</span>${r.host === me || r.guest === me ? '' : r.game ? `<button class="dk-watch" data-code="${olEsc(r.id)}">${t('ol.watch')}</button>` : `<button class="dk-join" data-code="${olEsc(r.id)}">${t('ol.join')}</button>`}</div>`).join('');
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
  try { await ON.init(); } catch (e) { console.warn(e); if (olNotConfigured(e)) { olRender('setup'); return; } olErr = e; olRender('error'); return; }
  if (!olRoomsUnsub) olRoomsUnsub = ON.watchRooms(l => { olRoomsList = l; if (isShown('#onlineOverlay') && olView === 'menu') { const el = $('#olRooms'); if (el) el.innerHTML = olRoomRows(l); } });
  dockStart();
  if (joinCode) { olRender('menu'); olJoin(joinCode); return; }
  olRender(ON.room && olView === 'room' ? 'room' : olView === 'search' ? 'search' : 'menu');
}
window.openOnline = openOnline;
let olErr = null;
// rating history: sparkline of the last 30 rated games + the latest 10 results
function olHistHtml() {
  const h = ON.history(); if (!h.length) return '';
  const sp = h.slice(-30), pts = [sp[0].r - (sp[0].d || 0)].concat(sp.map(x => x.r));
  let html = `<div class="ol-sub">${t('ol.hist')}</div><div class="ol-hist">`;
  if (pts.length >= 2) {
    const lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, W = 300, Hh = 34, y = v => (Hh - 3 - (v - lo) / (hi - lo) * (Hh - 6)).toFixed(1);
    html += `<svg class="ol-spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${y(pts[0])}" y2="${y(pts[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${pts.map((v, i) => (i / (pts.length - 1) * W).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  html += '<div class="ol-hrows">' + h.slice(-10).reverse().map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<div class="${c}"><i>${t('ol.res' + c.toUpperCase())}</i><span>${olEsc(x.o || '?')} <small>R${x.or} · ${olEsc(t('rule.' + (ON.VARIANTS.includes(x.v) ? x.v : ON.DEF_V)))}</small></span><b>${x.d >= 0 ? '+' : '−'}${Math.abs(x.d)}</b><small>${x.r}</small></div>`; }).join('') + '</div></div>';
  return html;
}
function olRender(v) {
  if (v) olView = v;
  const B = $('#olBody');
  if (olView === 'setup') { B.innerHTML = `<div class="ol-setup"><div class="ol-setup-ic">⌛</div><p class="ol-note">${t('ol.setup1')}</p><p class="ol-note small">${t('ol.setup2')}</p></div>`; return; }
  if (olView === 'loading') { B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><small>${t('ol.connecting')}</small></div>`; return; }
  if (olView === 'error') { B.innerHTML = `<p class="ol-note">${olEsc(t('ol.error'))}</p><p class="ol-note small">${olEsc(authErrText(olErr))}</p><div class="ol-acts"><button class="mbtn go" id="olRetry">${t('ol.retry')}</button></div>`; $('#olRetry').onclick = () => openOnline(); return; }
  const P = ON.profile; if (!P) { olRender('loading'); return; }
  if (olView === 'menu') {
    const R = ON.room;
    B.innerHTML = `<div class="ol-me"><input id="olName" maxlength="16" value="${olEsc(P.name)}" aria-label="${olEsc(t('pf.name'))}"><div class="ol-r"><small>${t('ol.rating')}</small><b>${P.rating}</b><small>${t('ol.record', { w: P.wins || 0, l: P.losses || 0, d: P.draws || 0 })}</small></div></div><div class="ol-grid ol-lux"><section class="ol-col ol-pane"><h3 class="ol-ph">${olx('paneRated')}<small>${olx('paneRatedSub')}</small></h3>
      <div class="ol-tcbox"><div class="ol-tcl">${t('ng.rule')} · ${t('ol.tc')}</div>${olVarSeg()}</div>
      <details class="ol-rulesd"><summary>${olx('rulesMore')}</summary><p class="ol-note small">${t('ol.findDesc')}</p></details>
      ${olHistHtml()}
      <div class="ol-sub">${t('ol.rank')}</div><div class="ol-list" id="olRank"><div class="ol-note small">…</div></div>
      <div class="ol-acts ol-bot"><button class="mbtn go" id="olFind">${t('ol.find')}</button></div>
    </section><section class="ol-col ol-pane"><h3 class="ol-ph">${olx('paneRoom')}<small>${olx('paneRoomSub')}</small></h3>
      <div class="ol-sub">${t('ol.rooms')}</div><div class="ol-list ol-rooms" id="olRooms">${olRoomRows(olRoomsList)}</div>
      <div class="ol-join"><input id="olCode" maxlength="8" placeholder="${olEsc(t('ol.codePh'))}" autocomplete="off"><button class="mbtn" id="olJoinBtn">${t('ol.join')}</button></div>
      ${R ? `<div class="ol-myroom"><span>${t('ol.myRoom')}</span><span class="ol-mcode">${R.code}</span><small>${R.game ? t('ol.st.play') : t('ol.roomLeft', { t: olClock(R.left) })}</small><button class="dk-btn" id="olShowRoom">${t('ol.showRoom')}</button></div>` : ''}
      <div class="ol-sub">${t('ol.privTitle')}</div><div class="ol-rk" role="radiogroup"><button type="button" data-rk="open" class="${olRk() === 'open' ? 'sel' : ''}"><b>${t('ol.openRoom')}</b><small>${t('ol.openDesc')}</small></button><button type="button" data-rk="key" class="${olRk() === 'key' ? 'sel' : ''}"><b>${t('ol.keyRoom')}</b><small>${t('ol.keyDesc')}</small></button></div>
      <div class="ol-acts ol-bot"><button class="mbtn" id="olMake">${t('ol.makeRoom')}</button></div>
    </section></div>`;
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
    B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><b>${t('ol.searching')}</b><small class="ol-tcinfo">${olEsc(varName2(v))} · ${olEsc(tcText())}</small><small>${t('ol.searchInfo', { w: s.same || 0, r: s.window || 100 })}</small></div><div class="ol-acts"><button class="mbtn" id="olCancel">${t('ol.cancel')}</button></div>`;
    $('#olCancel').onclick = async () => { await ON.leaveLobby(); olRender('menu'); dockRender(); };
    return;
  }
  if (olView === 'room') {
    const R = ON.room; if (!R) { olRender('menu'); return; }
    const url = olRoomUrl(R.code);
    B.innerHTML = `<div class="ol-wait"><span class="ol-lock">${t(R.priv ? 'ol.keyRoom' : 'ol.openRoom')}</span><small>${t('ol.roomCode')}</small><div class="ol-code" id="olRoomCode">${R.code}</div><small class="ol-tcinfo">${olEsc(varName2(R.v))} · ${olEsc(tcText())}</small><small>${t(R.priv ? 'ol.roomInfoKey' : 'ol.roomInfoOpen')}</small><small>${t('ol.roomKeep')} <b class="ol-left">${olLeftText()}</b></small></div>
      <div class="ol-acts ol-racts"><button class="mbtn go" id="olCopy">${t('ol.copyLink')}</button><button class="mbtn warn" id="olCloseRoom">${t('ol.closeRoom')}</button></div>`;
    $('#olCopy').onclick = async () => { try { if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: t('meta.title'), url }); return; } await navigator.clipboard.writeText(url); toast(t('ol.copied'), 1400); } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); } };
    $('#olCloseRoom').onclick = async () => { try { await ON.closeRoom(); } catch (e) { console.warn(e); } olRender('menu'); };
  }
}
const olRoomUrl = code => location.origin + location.pathname + '?room=' + code + (ON.mock ? '&mock=1' : '');
const OL_RK = 'ludo-online-rk';
function olRk() { try { return localStorage.getItem(OL_RK) === 'key' ? 'key' : 'open'; } catch (e) { return 'open'; } }
function olSetRk(v) { try { localStorage.setItem(OL_RK, v); } catch (e) {} }
const rankRows = list => list.length ? list.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}. ${olEsc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="ol-note small">${t('ol.noRank')}</div>`;
function olLeftText() { const r = olOn() && ON.ready && ON.room; return r ? (r.game ? t('ol.st.play') : t('ol.roomLeft', { t: olClock(r.left) })) : ''; }
async function olStartSearch() {
  if (olLive()) { olGate(olStartSearch); return; }
  showOv('#onlineOverlay');
  if (!olOn()) { olRender('setup'); return; }
  try { await ON.init(); } catch (e) { if (olNotConfigured(e)) { olRender('setup'); return; } olErr = e; olRender('error'); return; }
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
if (ON && ON.available) ON.onRoom((ev, r) => {
  if ((ev === 'closed' || ev === 'expired' || ev === 'gone') && isShown('#onlineOverlay') && olView === 'room') olRender('menu');
  if (ev === 'reopen') toast(t('ol.pReopen'), 2600);
  dockRender();
});

// ====================================================================== online game on the board
// net = { gid, game, me (1 / 2; -1 spectator), flip (I hold side 1: the board's ctrl is turned round), spectate, unsub, wUnsub, done,
//   pending (my move is on its way), busy (a remote ply is being played), local (the local game, back when the online game is left) }
let net = null, olRemote = false;
const OL_LIVE_P = 'ludo-online-live:';                 // + uid (one live game per player, also with several tabs)
const olLiveKey = () => OL_LIVE_P + (ON.uid || '');
function olLive() { return !!(net && !net.spectate && !net.done && net.game && net.game.status === 'play'); }
function olClearLive(gid) { try { const s = JSON.parse(localStorage.getItem(olLiveKey()) || 'null'); if (s && s.gid === gid) localStorage.removeItem(olLiveKey()); } catch (e) {} }
const olR = () => (net && net.game ? ON.replay(net.game.v, net.game.moves) : null);
const olSide = () => (net && net.me > 0 ? net.me - 1 : -1);
// the board's ctrl of a record side (0 = "you" when I play side 1) and back
const olCtrlOf = side => (net && net.flip ? 1 - side : side);
const olSideOf = ctrl => (net && net.flip ? 1 - ctrl : ctrl);
function olFlip(st) { if (!net || !net.flip || !st) return st; const s = E.clone(st); s.ctrl = s.ctrl.map(c => (c < 0 ? c : 1 - c)); return s; }
function startOnlineGame(gid, spec) {
  if (net && net.gid === gid && !!net.spectate === !!spec) return;
  if (SP && window.LudoLearn) LudoLearn.exitSpecial(true);
  if (VIEW && window.LudoRv) LudoRv.toLatest();
  const local = net ? net.local : G;
  if (net) olDetach(true);
  ['#onlineOverlay', '#resultOverlay', '#newOverlay', '#lessonOverlay', '#olConfirm', '#profOverlay', '#rulesOverlay', '#rtConfirm'].forEach(s => { const o = $(s); if (o) o.classList.remove('show'); });
  token++; busy = false; moves = [];
  if (window.LudoRv) LudoRv.reset();
  net = { gid, game: null, me: -1, flip: false, spectate: !!spec, done: false, pending: false, busy: false, local };
  window.__olLocal = local;
  document.body.classList.add('in-online'); document.body.classList.remove('ol-over'); document.body.classList.toggle('in-watch', !!spec);
  net.unsub = spec ? ON.spectate(gid, g => onNetGame(gid, g)) : ON.watchGame(gid, g => onNetGame(gid, g));
  net.wUnsub = ON.watchCount(gid, n => { if (net && net.gid === gid) { net.watchers = n; olWatchRender(); } });
  if (!spec) { try { localStorage.setItem(olLiveKey(), JSON.stringify({ uid: ON.uid, gid })); } catch (e) {} }
  mtab('game'); olWatchRender(); dockRender();
}
// stop following the online game; the local game comes back (keepMode: another online game follows)
function olDetach(keepMode) {
  if (!net) return;
  const n = net; net = null;
  n.unsub && n.unsub(); n.wUnsub && n.wUnsub();
  olClearLive(n.gid);
  document.body.classList.remove('in-online', 'in-watch', 'ol-over');
  hideOv('#resultOverlay'); $('#olRes').classList.add('hidden');
  if (olOn() && ON.ready) { const r = ON.room; ON.setPresence(r && !r.game ? 'room' : 'idle', { room: r && !r.game && !r.priv ? r.code : null }).catch(() => {}); }
  if (keepMode) return;
  window.__olLocal = null;
  token++; busy = false; moves = []; VIEW = null; if (window.LudoRv) LudoRv.reset();
  G = n.local;
  if (!G) { olWatchRender(); dockRender(); newGame(); return; }
  drawBoard(); rollLabel(); showThrow(G.thr); renderKifu(); save();
  if (G.state.over) { renderPlayers(); setStatus(''); $('#btnRoll').disabled = true; cupDraw(-1, null); cRender(); } else step();
  olWatchRender(); dockRender();
}
function olResignNow() {
  if (!olLive()) return;
  const gid = net.gid, g = net.game;
  ON.resign(gid).then(() => ON.applyResult(gid, Object.assign({}, g, { status: 'resign', loser: ON.uid }), 0)).catch(e => console.warn(e));
  olDetach();
}
// 投了 (menu): the shared confirmation (shared/resign.js), then the resignation is written
function olResignAsk() {
  if (!olLive()) return;
  const go = () => { if (olLive()) ON.resign(net.gid).catch(e => { console.warn(e); toast(t('ol.error'), 2000); }); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go();
}
// a ply on the board and one of the record are the same: the seat, the throw and the move
const olMoveKey = m => (!m || m.pass ? 'p' + (m && m.forfeit ? 'f' : '') : [m.k, m.to, m.enter ? 1 : 0, m.one ? 1 : 0, m.k2 == null ? '' : m.k2].join(':'));
const samePly = (a, b) => a.seat === b.seat && a.thr.v === b.thr.v && a.thr.face === b.thr.face && olMoveKey(a.m) === olMoveKey(b.m);
const prefixOf = (a, b) => a.length <= b.length && a.every((x, i) => samePly(x, b[i]));
const olThrCopy = th => ({ v: th.v, face: th.face, p: th.p, again: th.again, grace: th.grace, shells: th.shells ? th.shells.slice() : undefined });
const olMoveCopy = m => (m ? { k: m.k, k2: m.k2, from: m.from, to: m.to, enter: m.enter, home: m.home, pass: m.pass, forfeit: m.forfeit, one: m.one, back: m.back, use: m.use, cap: m.cap } : { pass: true });
// the board from the record (first view, a resync): the state, the plies and the move list
function olSetBoard(g, R) {
  token++; busy = false; moves = [];
  const me = olSide();
  net.flip = me === 1;
  const plies = R.plies.map(p => ({ seat: p.seat, s: olFlip(p.s0), thr: olThrCopy(p.thr), m: olMoveCopy(p.m) }));
  G = { opts: { rule: g.v, players: 2 }, mode: 'online', level: 20, pro: null, state: olFlip(R.st), thr: null, log: [], hist: [], plies, id: 'ol-' + net.gid, rated: null, resShown: true, recorded: true };
  G.log = plies.map(p => ({ seat: p.seat, v: p.thr.v, txt: p.m.pass ? (p.m.forfeit ? '6×3' : t('st.pass')) : E.moveText(p.s, p.m, p.thr) + (p.m.one ? '¹' : '') }));
  VIEW = null; if (window.LudoRv) LudoRv.reset();
  drawBoard(); rollLabel(); showThrow(null); renderPlayers(); renderKifu();
  step();
}
function onNetGame(gid, g) {
  if (!net || net.gid !== gid) return;
  if (!g) { toast(t('ol.gone'), 2200); olDetach(); return; }
  const first = !net.game;
  net.game = g;
  if (!net.spectate) net.me = ON.sideNo(g, ON.uid) || -1;
  if (net.me < 0 && !net.spectate) { net.spectate = true; document.body.classList.add('in-watch'); }
  const R = ON.replay(g.v, g.moves);
  if (!R.ok && !net.warned) { net.warned = true; toast(t('ol.illegal'), 2500); console.warn('illegal online record at token', R.bad); }
  if (!net.spectate && !ON.keyOk(g, gid) && !net.kwarn) { net.kwarn = true; toast(t('ol.illegal'), 2500); console.warn('the record does not carry my dice commitment'); }
  if (first || !G || G.mode !== 'online' || G.state.rule !== g.v) olSetBoard(g, R);
  else olCatchUp();
  if (g.status !== 'play') finishOnline(g);
  else if (R.ok && R.over && !net.spectate) ON.markOver(gid).catch(() => {});
  else olAuto();
  if (g.next && net.done) {           // the rematch is ready (room games)
    const nx = g.next; setTimeout(() => { if (net && net.gid === gid) startOnlineGame(nx); }, 400);
  }
  renderPlayers(); olClockRender(); olWatchRender(); olResRender();
}
// my waiting commit / reveal goes out at once (it needs no decision); my throw: the board offers 振る once the throw is known
function olAuto() {
  if (!net || net.spectate || net.done || net.pending || net.autoBusy || !net.game || net.game.status !== 'play') return;
  const R = olR(), me = olSide();
  if (!R || !R.ok || R.over || R.actor !== me) return;
  if (R.need === 'c' || R.need === 'r') {
    const gid = net.gid; net.autoBusy = true;
    ON.act(gid, R.n).then(ok => { if (!ok && net && net.gid === gid) net.autoRetry = Date.now() + 1500; })
      .catch(e => console.warn(e)).finally(() => { if (net && net.gid === gid) net.autoBusy = false; });
    return;
  }
  // my throw is ready (the other side has revealed): wake the board once (振る / auto roll)
  const k = net.gid + ':' + R.n;
  if (net.readyKey !== k && G && G.mode === 'online' && G.plies.length === R.plies.length && !net.busy && !busy && !G.thr) { net.readyKey = k; step(); }
}
// bring the board up to the record: new plies are thrown and played one after another (the opponent's extra throws)
function olCatchUp() {
  if (!net || !net.game || net.busy || !G || G.mode !== 'online') return;
  const R = olR(); if (!R) return;
  const remote = R.plies.map(p => ({ seat: p.seat, thr: p.thr, m: p.m })), mine = G.plies;
  if (prefixOf(mine, remote)) {
    if (remote.length === mine.length) return;
    if (busy || G.thr) return;                                   // my own throw / move is still being played: continue after it
    olPlayRemote(R.plies[mine.length]);
  } else if (net.pending && prefixOf(remote, mine)) { /* my move is on its way */ }
  else if (!busy) olSetBoard(net.game, R);
}
async function olPlayRemote(p) {
  const gid = net.gid; net.busy = true;
  try {
    if (VIEW && window.LudoRv) LudoRv.toLatest();
    const rolled = await new Promise(res => { if (!doRoll(p.thr, () => res(true))) res(false); });
    if (!net || net.gid !== gid) return;
    if (!rolled || !G.thr) { olSetBoard(net.game, olR()); return; }
    const ms = E.legalMoves(G.state, G.thr), m = ms[p.mi];
    if (!m || olMoveKey(m) !== olMoveKey(p.m)) { olSetBoard(net.game, olR()); return; }
    if (m.pass) { const w = m.forfeit ? t('st.three') : t('st.nomove'); setStatus(w); if (!ms.some(x => !x.pass)) toast(w, 900); await olSleep(420 * Math.sqrt(SPD())); }
    else await olSleep(260 * SPD());
    if (!net || net.gid !== gid) return;
    olRemote = true; try { await commit(m); } finally { olRemote = false; }
  } catch (e) { console.warn(e); }
  finally { if (net && net.gid === gid) { net.busy = false; setTimeout(() => { olCatchUp(); if (net && net.done && net.game) olEndBoard(net.game); }, 0); } }
}
setInterval(() => { if (net && !net.busy && !busy) { olCatchUp(); if (net && net.autoRetry && Date.now() > net.autoRetry) { net.autoRetry = 0; olAuto(); } } }, 400);
// ---- hooks used by app.js
function olHuman(seat) { return !!(net && !net.spectate && G && G.state.ctrl[seat] === 0); }
function olCanMove() {
  const g = net && net.game;
  if (!g || net.spectate || net.done || net.pending || net.busy || g.status !== 'play' || SP || !G || G.mode !== 'online') return false;
  const R = olR(); if (!R.ok || R.over || R.need !== 'm' || R.actor !== olSide()) return false;
  return G.plies.length === R.plies.length;
}
// my throw: the throw of this turn from both chains (null: not now — the other side has not revealed yet, or it is not my turn)
function olThrow() { if (!olCanMove()) return null; return ON.myDice(net.game, net.gid) || null; }
// my move: written together with my next reveal before it is played on the board; false = not now
function olSend(m) {
  if (!olCanMove() || !G.thr) return false;
  const ms = E.legalMoves(G.state, G.thr), key = olMoveKey(m);
  let mi = ms.indexOf(m); if (mi < 0) mi = ms.findIndex(x => olMoveKey(x) === key);
  if (mi < 0) return false;
  const gid = net.gid, R = olR();
  net.pending = true;
  ON.act(gid, R.n, mi).then(ok => {
    if (!net || net.gid !== gid) return;
    net.pending = false;
    if (!ok) { toast(t('ol.moveFail'), 1800); const r2 = olR(); if (!busy && r2) olSetBoard(net.game, r2); }
    renderPlayers();
  }).catch(err => { console.warn(err); if (net && net.gid === gid) { net.pending = false; toast(t('ol.error'), 2000); const r2 = olR(); if (r2) olSetBoard(net.game, r2); } });
  return true;
}
const olName = side => { const g = net && net.game; return g ? ((side === 0 ? g.bn : g.wn) || '?') : '…'; };
function olSeatName(seat) {
  const g = net && net.game; if (!g || !G) return '…';
  const side = olSideOf(G.state.ctrl[seat]), r = side === 0 ? g.br : g.wr, mine = !net.spectate && side === olSide();
  return olName(side) + (typeof r === 'number' && !matchMedia('(max-width: 600px)').matches ? ' (' + r + ')' : '') + (mine ? ' · ' + t('p.you') : '');   // (phones: no room for the rating)
}
// a turn on the board (app.js step): my throw is offered once both parts of it are known; the other side's turn is shown
function olStep(my) {
  const s = G.state, seat = s.turn, mine = olHuman(seat);
  zSeat(seat);
  const live = !!(net && !net.done && net.game && net.game.status === 'play');
  const ready = live && mine && !!olThrow();
  $('#btnRoll').disabled = !ready;
  cupDraw(seat, ready ? 'ready' : 'idle');
  if (!live) { setStatus(''); return; }
  if (mine) {
    setStatus(ready ? t('st.yourRoll', { b: t(isPachisi() ? 'st.throwv' : 'st.rollv') }) : t('ol.waitDice'));
    if (ready && settings.autoRoll) setTimeout(() => { if (my === token) doRoll(); }, 350 * SPD());
  } else setStatus(t('st.turn', { p: olName(olSideOf(s.ctrl[seat])) + '（' + colName(seat) + '）' }));
}
// a game that ended off the board (resign / timeout / abandonment): the loser
function olEnd(g) {
  if (!g || g.status === 'play' || g.status === 'over') return null;
  const ls = ON.sideNo(g, g.loser); if (!ls) return null;
  return { winner: 2 - ls, why: g.status };
}
function olEndBoard(g) { if (olEnd(g) && G && G.mode === 'online') { $('#btnRoll').disabled = true; cupDraw(-1, null); setStatus(''); clearMarks(); } }
// the 30 s of the side that must write next, in its player row (the seat to move; the other side's first seat while it reveals)
// + timeout / abandonment claims
function olClockRender() {
  document.querySelectorAll('#players .pclk').forEach(el => { el.textContent = ''; el.classList.remove('low', 'ol-move'); });
  if (!net || !net.game || !G || G.mode !== 'online') return;
  const g = net.game, live = g.status === 'play' && !net.done, R = olR(), tm = live && R.ok && !R.over ? R.actor : -1, now = ON.now();
  if (tm < 0 || (net.pending && tm === olSide())) return;
  const c = olCtrlOf(tm), st = G.state, seat = st.ctrl[st.turn] === c ? st.turn : st.seats.find(x => st.ctrl[x] === c);
  const el = document.getElementById('olClk' + seat); if (!el) return;
  const k = ON.clockOf(g, tm === 0 ? 'b' : 'w', true, now), left = Math.max(0, k.delay + k.main);
  el.textContent = olClock(left); el.classList.add('ol-move'); el.classList.toggle('low', left <= 10000);
  if (!net.spectate && tm === olSide() && window.CountTick) CountTick.feed(left, 'ol' + R.n);   // time signal on my own clock
}
function olClockTick() {
  if (!net || !net.game) return;
  olClockRender();
  const g = net.game, live = g.status === 'play' && !net.done, R = olR(), tm = live && R.ok && !R.over ? R.actor : -1, now = ON.now();
  if (live && !net.spectate && tm >= 0 && tm !== olSide() && !net.claiming) {
    const opp = net.me === 1 ? g.w : g.b, k = ON.clockOf(g, net.me === 1 ? 'w' : 'b', true, now);
    if (k.left < -ON.GRACE) { net.claiming = true; ON.claimTimeout(net.gid, opp).catch(() => {}).finally(() => { if (net) net.claiming = false; }); }
    else if (now - (g.t || now) > ON.ABANDON_MS && (!net.abChk || now - net.abChk > 5000)) {
      net.abChk = now; net.claiming = true;
      ON.claimAbandon(net.gid, opp).catch(() => {}).finally(() => { if (net) net.claiming = false; });
    }
  }
}
setInterval(olClockTick, 250);
function olWatchRender() {
  const el = $('#olWatch');
  if (!net || !net.game) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const g = net.game, w = net.watchers || 0;
  el.classList.remove('hidden'); el.classList.toggle('pl', !net.spectate);
  if (net.spectate) el.innerHTML = `<span class="wl">${t('ol.watching')}</span><span class="wi">${olEsc(g.bn)} vs ${olEsc(g.wn)} · ${olEsc(varName2(g.v))} · ${t('ol.watchers', { n: w })}</span><button id="olWatchStop">${t('ol.watchStop')}</button>`;
  else el.innerHTML = `<span class="wi">${t(g.rated ? 'ol.rated' : 'ol.friendly')} · ${olEsc(varName2(g.v))} · ${olEsc(tcText())}${w ? ' · ' + t('ol.watchers', { n: w }) : ''}</span>${net.done ? `<button id="olWatchStop">${t('ol.leaveGame')}</button>` : ''}`;
  const b = $('#olWatchStop'); if (b) b.onclick = () => olDetach();
}
// ---------------------------------------------------------------- the end of an online game
function olWhy(g, me) {
  const loserNo = g.loser ? ON.sideNo(g, g.loser) : 0, p = loserNo ? olName(loserNo - 1) : '';
  if (g.status === 'resign') return g.loser === ON.uid ? t('ol.youResigned') : me > 0 ? t('ol.oppResigned') : t('ol.wResign', { p });
  if (g.status === 'timeout') return g.loser === ON.uid ? t('ol.youTimeout') : me > 0 ? t('ol.oppTimeout') : t('ol.wTime', { p });
  if (g.status === 'abandon') return g.loser === ON.uid ? t('ol.youAbandon') : me > 0 ? t('ol.oppAbandon') : t('ol.wAbandon', { p });
  return t('ol.home');
}
// a local summary of my rated online games (for the portal's achievements and the sync): { n, w, r, hist: [{ id, t, s, r }] }
const OL_REC = 'aicoding-ludo-online';
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
  net.done = true; net.pending = false; document.body.classList.add('ol-over');
  try { if (!net.spectate) { const r = ON.room; ON.setPresence(r && !r.game ? 'room' : 'idle', { room: r && !r.game && !r.priv ? r.code : null }).catch(() => {}); } } catch (e) {}   // (2026-11-12: the game is over — 分析 opens, and the players list stops showing 対局中)
  olClearLive(net.gid);
  olEndBoard(g);
  const gid = net.gid, winner = ON.winnerOf(g) || 0, me = net.spectate ? -1 : net.me;
  net.result = { winner, why: olWhy(g, me), rating: null };
  if (me > 0) {
    const score = winner === me ? 1 : 0;
    try { net.result.rating = await ON.applyResult(gid, g, score); olRecord(net && net.result.rating, gid, g, score); } catch (e) { console.warn(e); }
    // 勝敗記録 (shared/record.js)
    try { if (window.GameRecord) { const os = 2 - me; GameRecord.add({ mode: g.rated ? 'rated' : 'online', res: score === 1 ? 'w' : 'l', side: me - 1, opp: olName(os), key: 'ol:' + olName(os), n: ON.replay(g.v, g.moves).plies.length, why: [t('rule.' + g.v), net && net.result && net.result.why].filter(Boolean).join(' · ') }); } } catch (e) {}
    syncTouch();
  }
  if (!net || net.gid !== gid) return;
  setTimeout(() => olShowResult(gid), g.status === 'over' ? 900 : 250);
  renderPlayers(); olWatchRender(); dockRender();
}
// the result dialog waits until the last ply has been shown
function olShowResult(gid) {
  if (!net || net.gid !== gid || !net.result) return;
  const g = net.game, Rs = net.result, me = net.spectate ? -1 : net.me, rp = ON.replay(g.v, g.moves);
  if (net.busy || busy || G.plies.length < rp.plies.length) { setTimeout(() => olShowResult(gid), 300); return; }
  const ws = Rs.winner ? Rs.winner - 1 : 0, s = G.state, wc = olCtrlOf(ws), winSeats = s.seats.filter(x => s.ctrl[x] === wc);
  $('#resultDots').innerHTML = winSeats.map(x => `<i style="background:${seatColor(x)}"></i>`).join('');
  $('#resultTitle').textContent = me < 0 ? t('ol.pWin', { p: olName(ws) }) : Rs.winner === me ? t('ol.win') : t('ol.lose');
  let sub = olEsc((Rs.why ? Rs.why + ' · ' : '') + `${olName(0)} vs ${olName(1)} · ${t('rule.' + g.v)}`) + '<br>' + olEsc(t('res.sub', { n: rp.plies.length }));
  if (Rs.rating && Rs.rating.rated) sub += `<div class="ol-rchg">${t('ol.rating')} ${Rs.rating.old} → <b>${Rs.rating.now}</b> <span class="${Rs.rating.now >= Rs.rating.old ? 'up' : 'dn'}">(${Rs.rating.now >= Rs.rating.old ? '+' : ''}${Rs.rating.now - Rs.rating.old})</span></div>`;
  else if (Rs.rating && Rs.rating.note && ON.secMsg) sub += `<div class="ol-rchg">${olEsc(ON.secMsg(Rs.rating.note))}</div>`;
  $('#resultSub').innerHTML = sub;
  // the places: the winner first (an off-board end: the winner whatever the board says), each side with its colours and name
  const rk = RANK[LANG] || RANK.en, P = placesOf(s), wi = P.findIndex(r => r.seats.some(x => s.ctrl[x] === wc));
  if (wi > 0) P.unshift(P.splice(wi, 1)[0]);
  $('#resultRank').innerHTML = P.map((r, i) => `<li class="${me > 0 && r.seats.some(x => s.ctrl[x] === 0) ? 'me' : ''}${i === 0 ? ' first' : ''}"><b class="pl">${rk(i + 1)}</b><span class="dots">${r.seats.map(x => `<i style="background:${seatColor(x)}"></i>`).join('')}</span><span class="nm">${olEsc(olName(olSideOf(s.ctrl[r.seats[0]])))}</span><span class="hm">${t('p.home', { n: r.home, m: r.of })}</span></li>`).join('');
  if (me > 0) finishFx(Rs.winner === me);
  olResRender();
  showOv('#resultOverlay');
}
// rematch area in the result dialog (room games) / "find another" (rated)
function olResRender() {
  const box = $('#olRes'), again = $('#btnAgain');
  { let lb = $('#btnLobby'); if (!lb) { again.insertAdjacentHTML('beforebegin', '<button class="mbtn" id="btnLobby"></button>'); lb = $('#btnLobby'); lb.onclick = () => { hideOv('#resultOverlay'); olDetach(); if (!matchMedia('(pointer: coarse)').matches) dockToggle(true); else mtab('online'); dockRender(); }; } lb.textContent = olx('toLobby'); lb.classList.toggle('hidden', !(net && net.done && !net.spectate)); }   // (2026-11-12)
  const an = $('#btnResAnalyze'); if (an) an.classList.toggle('hidden', !!(net && net.spectate));
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
// the review (振り返り) of an online game: only once it is over
$('#btnResAnalyze').addEventListener('click', e => { if (net && !net.done) { e.stopImmediatePropagation(); hideOv('#resultOverlay'); } }, true);
// leaving a live online game (new game, lessons) = resigning it, after a confirmation
function olGuard(sel) {
  const b = $(sel); if (!b) return;
  b.addEventListener('click', e => {
    if (!net) return;
    if (olLive()) { e.stopImmediatePropagation(); e.preventDefault(); olConfirm(t('ol.leaveQ'), t('ol.resign'), () => { olResignNow(); b.click(); }); return; }
    if (sel !== '#btnNew' || net.spectate || net.done) olDetach();
  }, true);
}
['#btnNew', '#btnLesson', '#btnLessonStart', '#btnStart'].forEach(olGuard);
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
      const w = ON.winnerOf(g), sc = w === me ? 1 : 0, r = await ON.applyResult(s.gid, g, sc);
      olRecord(r, s.gid, g, sc);
      toast(t('ol.endedAway', { r: w === me ? t('ol.win') : t('ol.lose') }) + (r && r.rated && r.now !== r.old ? ` · R ${r.old} → ${r.now}` : ''), 4000);
      return;
    }
    hideOv('#newOverlay');
    startOnlineGame(s.gid);
  } catch (e) { console.warn(e); olNotConfigured(e); }
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
  if (dock.on || !(ON && ON.available)) return;
  try { await ON.init(); } catch (e) { console.warn(e); if (olNotConfigured(e) || !olOn()) return; olErr = e; $('#dkStat').textContent = t('ol.error') + ' — ' + authErrText(e); return; }
  try { localStorage.setItem(OK_KEY, '1'); localStorage.removeItem(NOCFG_KEY); } catch (e) {}
  if (olNotCfg) { olNotCfg = false; olSoonMode(); }   // the rules are live (now): the full dock
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
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false); });
  inp.addEventListener('blur', () => setTimeout(() => { if (dock.editing && document.activeElement !== $('#dkMe .dk-ok')) done(true); }, 150));
});
$('#dkAuto').onclick = () => olStartSearch();
$('#dkSoon').onclick = e => { e.stopPropagation(); openOnline(); };
$('#dkRoom').onclick = async () => { if (olOn() && ON.ready && ON.room) { try { await ON.closeRoom(); } catch (e) { console.warn(e); } dockRender(); return; } await openOnline(); if (ON.ready && olOn()) olMakeRoom(); };
$('#dkMyRoom').onclick = async () => { await openOnline(); if (ON.room) { ON.extendRoom().catch(() => {}); olRender('room'); } };
$('#dock').addEventListener('click', e => { const b = e.target.closest('.dk-join, .dk-watch'); if (b && b.dataset.code) olJoin(b.dataset.code, b); });
$('#dkG').onclick = e => { e.stopPropagation(); if (ON.account()) { dockToggle(true); mtabIfPhone(); } else googleLink(); };
function mtab(v) {
  if (v === 'online' && !olOn()) { openOnline(); return; }
  document.body.classList.toggle('mtab-online', v === 'online'); $('#mtabs').querySelectorAll('button[data-t=game], button[data-t=online]').forEach(b => b.classList.toggle('sel', b.dataset.t === v)); if (v === 'online') dockStart();
}
function mtabIfPhone() { if (matchMedia('(pointer: coarse)').matches) mtab('online'); }
$('#mtabs').addEventListener('click', e => { const b = e.target.closest('button[data-t=game], button[data-t=online]'); if (b && !b.hasAttribute('data-it')) mtab(b.dataset.t); });

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

// ====================================================================== public chat: one room for everyone online in this game
// (latest ON.CHAT_N messages, no private messages). PC: dock (strip when folded, panel when open) / phone: online tab + 2-line strip
const chat = { list: [], seen: -1, unsub: null };
const olCoarse = () => matchMedia('(pointer: coarse)').matches;
function chatVisible() { return document.body.classList.contains('mtab-online') || !olCoarse(); }
function chatShown() { return dock.on && olOn() && !document.body.classList.contains('no-online') && (!olCoarse() || document.body.classList.contains('mtab-online')); }
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
    : `<div class="ol-note small">${olEsc(t('ol.chatEmpty'))} · <br>${olEsc(t('ol.chatNote'))}</div>`;
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
  e.stopPropagation();                        // typing never reaches the board shortcuts (Space / Enter throw)
  if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); return; }
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  if (!e.target.value.trim() && !olCoarse()) { e.target.blur(); dockToggle(false); return; }   // empty: fold the online box away again
  chatSend(); if (!olCoarse()) e.target.blur();   // back to the board
});
$('#dkChatIn').addEventListener('focus', () => { chatStart(); chatKeep(); });
$('#dkChatIn').addEventListener('blur', () => document.body.style.setProperty('--kb', '0px'));
$('#dkChatForm').addEventListener('click', e => e.stopPropagation());
$('#mtStrip').addEventListener('click', () => chatOpen(true));
$('#dkUnread').addEventListener('click', e => { e.stopPropagation(); chatOpen(!olCoarse()); });
setInterval(() => { if (dock.on && olOn()) chatStart(); }, 1000);
if (ON && ON.available) ON.onAuth(() => { if (chat.unsub) { chat.unsub(); chat.unsub = null; } chatStart(); });

// ====================================================================== cloud sync of local progress (sync/<uid> = {d, t, k})
// d = JSON of a snapshot: on rated online record {n, w, r, hist[]}, ls lessons {id: {best, pass}}, rt solo rated games (the one with
// more games), set settings (+ setT), nm name (+ nmT). Merge: progress united (max / or), settings / name: newest.
const LudoSync = (() => {
  const META = 'ludo-sync-meta', LS_KEY = STORE + '-lessons', RT_KEY = STORE + '-rated';
  const SET_KEYS = ['rule', 'players', 'first', 'level', 'speed', 'autoRoll', 'autoPick', 'sound', 'design'];
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function meta() { return get(META, null); }
  function snapshot(now) {
    now = now || Date.now();
    let m = meta(); const fresh = !m; m = m || {};
    const set = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) set[k] = settings[k]; }); set.lang = LANG;
    const nm = (ON && ON.profile && ON.profile.name) || (ON && ON.localName()) || '';
    const stamp = (key, val) => { const h = JSON.stringify(val); if (m[key + 'H'] !== h) { m[key + 'H'] = h; m[key + 'T'] = fresh ? 1 : now; } return m[key + 'T'] || 1; };
    const d = { v: 1, ls: get(LS_KEY, {}), rt: get(RT_KEY, null), on: get(OL_REC, null), set, setT: stamp('set', set), nm, nmT: stamp('nm', nm) };
    put(META, m); return d;
  }
  const num = x => (x === true ? 3 : +x || 0);
  function mergeVal(a, b) {
    if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
    if (typeof a === 'object' && typeof b === 'object') { const o = Object.assign({}, a); for (const k in b) o[k] = k in o ? mergeVal(o[k], b[k]) : b[k]; return o; }
    if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
    return num(b) > num(a) ? b : a;
  }
  function unite(a, b) { const o = Object.assign({}, a || {}); for (const k in (b || {})) o[k] = k in o ? mergeVal(o[k], b[k]) : b[k]; return o; }
  const lastT = x => { const h = x && Array.isArray(x.hist) ? x.hist : []; return h.length ? +h[h.length - 1].t || 0 : 0; };
  function mergeRec(a, b) {
    if (!a) return b || null; if (!b) return a;
    const base = lastT(b) > lastT(a) ? b : a, seen = new Set(), hist = [];
    for (const h of [...(a.hist || []), ...(b.hist || [])]) if (h && !seen.has(h.id)) { seen.add(h.id); hist.push(h); }
    hist.sort((x, y) => (x.t || 0) - (y.t || 0));
    return Object.assign({}, base, { hist: hist.slice(-100) });
  }
  const moreGames = (a, b) => (!a ? b || null : !b ? a : (b.n || 0) > (a.n || 0) ? b : a);
  const newer = (a, b, key) => ((b[key + 'T'] || 0) > (a[key + 'T'] || 0) ? b : a);
  function merge(L, C) {
    if (!C) return L; if (!L) return C;
    const s = newer(L, C, 'set'), n = newer(L, C, 'nm');
    return { v: 1, on: mergeRec(L.on, C.on), ls: unite(L.ls, C.ls), rt: moreGames(L.rt, C.rt), set: Object.assign({}, s.set), setT: s.setT || 0, nm: n.nm || L.nm || C.nm || '', nmT: n.nmT || 0 };
  }
  function apply(d) {
    put(LS_KEY, d.ls || {});
    if (d.rt) put(RT_KEY, d.rt);
    if (d.on) put(OL_REC, d.on);
    const m = meta() || {}, langWas = LANG;
    if (d.set) {
      SET_KEYS.forEach(k => { if (d.set[k] !== undefined) settings[k] = d.set[k]; });
      if (!['ludo', 'pachisi'].includes(settings.rule)) settings.rule = 'ludo';
      settings.design = Object.assign({ ludo: 'classic', pachisi: 'classic' }, settings.design || {});
      if (d.set.lang && SUPPORTED.includes(d.set.lang)) { LANG = d.set.lang; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} }
      const set = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) set[k] = settings[k]; }); set.lang = LANG;
      m.setH = JSON.stringify(set); m.setT = d.setT || 1;
      if (typeof paintSnd === 'function') paintSnd();
    }
    if (d.nm) { m.nmH = JSON.stringify(d.nm); m.nmT = d.nmT || 1; if (ON && ON.ready && ON.profile.name !== d.nm) ON.setName(d.nm).catch(() => {}); else { try { localStorage.setItem('ludo-online-name', d.nm); } catch (e) {} } }
    put(META, m);
    save();
    if (LANG !== langWas) { const s = $('#langSel'); s.value = LANG; s.dispatchEvent(new Event('change')); }
    else if (G && !busy) { drawBoard(); renderPlayers(); }
  }
  return { snapshot, merge, apply };
})();
window.LudoSync = LudoSync;
let syncing = false, lastPushed = '', syncLast = 0;
const signedIn = () => !!(olOn() && ON.ready && ON.account());
const strip = d => JSON.stringify(Object.assign({}, d, { t: undefined }));
function syncLastText() { return syncLast ? t('sync.last', { t: new Date(syncLast).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' }) }) : ''; }
async function syncPush() {
  if (!signedIn()) return;
  const d = LudoSync.snapshot(), s = strip(d);
  try { await ON.push(JSON.stringify(d)); lastPushed = s; syncLast = Date.now(); } catch (e) { console.warn(e); }
}
async function syncNow(quiet) {
  if (!signedIn() || syncing) return;
  syncing = true;
  try {
    const local = LudoSync.snapshot();
    const c = await ON.pull();
    let merged = local;
    if (c && c.d) { try { merged = LudoSync.merge(local, JSON.parse(c.d)); } catch (e) { console.warn(e); } }
    LudoSync.apply(merged);
    syncing = false;
    await syncPush();
    if (!quiet) toast(t('sync.done'), 1400);
  } catch (e) { console.warn(e); if (!quiet) olConfirm(authErrText(e), 'OK', null); }
  syncing = false;
  accRender();
}
// local changes are pushed a few seconds later (polling keeps the main script untouched)
let syncT = 0;
function syncTouch() { clearTimeout(syncT); syncT = setTimeout(() => { if (signedIn() && !syncing && strip(LudoSync.snapshot()) !== lastPushed) syncPush(); }, 3000); }
function syncNameTouched() { syncTouch(); }
setInterval(syncTouch, 20000);
document.addEventListener('visibilitychange', () => { if (document.hidden) syncPush(); else if (signedIn()) syncNow(true); });
if (ON && ON.available) ON.onAuth(() => { dockRender(); });

// ====================================================================== first visit: profile name + optional Google link
const PF_KEY = 'ludo-profile-asked';
const pfAsked = () => { try { return !!(localStorage.getItem(PF_KEY) || localStorage.getItem('atlas-profile-asked')); } catch (e) { return true; } };   // (asked once for all the games of the site)
const pfDone = () => { try { localStorage.setItem(PF_KEY, String(Date.now())); localStorage.setItem('atlas-profile-asked', String(Date.now())); } catch (e) {} };
function pfOpen() {
  $('#pfName').value = ON.localName() || ON.defaultName();
  showOv('#profOverlay');
}
async function pfSaveName() {
  const n = ON.cleanName($('#pfName').value);
  try { localStorage.setItem('ludo-online-name', n); } catch (e) {}
  if (ON.ready) { try { await ON.setName(n); } catch (e) { console.warn(e); } }
  syncNameTouched(); dockRender();
}
$('#pfLater').onclick = () => { pfDone(); pfSaveName(); hideOv('#profOverlay'); };
$('#pfGoogle').onclick = async () => { pfDone(); await pfSaveName(); hideOv('#profOverlay'); await ON.init().catch(e => { olConfirm(authErrText(e), 'OK', null); }); if (ON.ready) googleLink(); };
$('#pfName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('#pfLater').click(); });
// shown once, only while online play is open and nothing else is on screen (no dialog, no lesson)
const pfTimer = setInterval(() => {
  if (!(ON && ON.available) || pfAsked()) { clearInterval(pfTimer); return; }
  if (!olOn() || !dock.on || document.hidden || document.querySelector('.overlay.show') || SP || olLive()) return;
  clearInterval(pfTimer); pfOpen();
}, 1200);

// ====================================================================== misc wiring
function olOutside(o) {
  if (o.id === 'onlineOverlay') { $('#olClose').click(); return; }
  if (o.id === 'profOverlay') { $('#pfLater').click(); return; }
  if (o.id === 'olConfirm') { $('#olcNo').click(); return; }
}
document.querySelectorAll('#onlineOverlay, #profOverlay, #olConfirm').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; olOutside(o); });
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const [id, b] of [['#olConfirm', '#olcNo'], ['#onlineOverlay', '#olClose'], ['#profOverlay', '#pfLater']]) if (isShown(id)) { e.stopImmediatePropagation(); $(b).click(); return; }
}, true);
// the 投了 button: the online game's resignation (app.js only knows the AI game's)
$('#btnResign').addEventListener('click', e => { if (!G || G.mode !== 'online') return; e.stopImmediatePropagation(); olResignAsk(); }, true);
function olLangChanged() {
  chatRender(); if (isShown('#newOverlay')) olSegSync(); dockRender(); olWatchRender(); olResRender();
  if (isShown('#onlineOverlay')) olRender();
  if (net && net.done && net.result && isShown('#resultOverlay')) olShowResult(net.gid);
}
document.addEventListener('change', e => { if (e.target && e.target.id === 'langSel') setTimeout(() => { try { olLangChanged(); } catch (err) {} }, 0); }, true);   // (capture: the portal skin's language list fires a change that does not bubble)
// boot: ?room=CODE joins (or watches) a room; a live game is resumed; the dock connects after a moment
if (ON && ON.available) {
  const q = new URLSearchParams(location.search), code = q.get('room');
  if (code) {
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
    setTimeout(() => { hideOv('#newOverlay'); openOnline(code); }, 0);
  } else olResume();
  accRender();
  setTimeout(() => { dockStart().then(() => { if (signedIn()) syncNow(true); }); }, 800);
}
dockRender();
