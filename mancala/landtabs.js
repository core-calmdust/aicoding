'use strict';
// Phone landscape (also the turned page of the "landscape on a phone held upright" option): a tab rail at the right edge
// (コーチ / 形勢・棋譜 / レッスン / 戦績 / オンライン). A tab slides a drawer in from the right over the board with the chosen
// box; the same tab again, a tap on the board or a swipe to the right closes it; a swipe to the left from the right edge
// opens it (the drawer follows the finger). 形勢 and 棋譜 share one page (thin graph, long move list). The レッスン tab holds
// ルール / レッスン / パズル (the top menu keeps only ルール in this layout). 戦績 opens the record dialog, オンライン the online
// dock in the drawer's place. Lessons / puzzles keep their card open beside the board. The boxes are moved into the drawer
// while this layout is on and put back when it is left (PC / portrait keep their layouts).
(() => {
const MQ = matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px)');
const KEY = 'mancala-landtab';
const ICON = {
  coach: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
  ek: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/></svg>',
  learn: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/></svg>',
  rec: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  online: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
  rules: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24"><path d="M4 7h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z"/></svg>',
};
const ONL = { ja: 'オンライン', en: 'Online', zh: '在线', ko: '온라인', es: 'En línea', fr: 'En ligne', pt: 'Online', de: 'Online', hi: 'ऑनलाइन', ar: 'أونلاين' };
const REC = { ja: '戦績', en: 'Record', zh: '战绩', ko: '전적', es: 'Historial', fr: 'Bilan', pt: 'Histórico', de: 'Bilanz', hi: 'रिकॉर्ड', ar: 'السجل' };
const LTAB = {ja: 'ルール\nレッスン', en: 'Rules\nLessons', zh: '规则\n课程', ko: '규칙\n레슨', es: 'Reglas\nLecciones', fr: 'Règles\nLeçons', pt: 'Regras\nLições', de: 'Regeln\nLektionen', hi: 'नियम\nपाठ', ar: 'القواعد\nالدروس' };
// the コーチ tab is always there: when the coach can't work (AI vs AI, online, rated…) its box says so (the same words as
// shared/infotabs.js on portrait phones)
const CKL = { ja: 'コーチ', en: 'Coach', zh: '教练', ko: '코치', es: 'Entrenador', fr: 'Coach', pt: 'Treinador', de: 'Coach', hi: 'कोच', ar: 'المدرّب' };
const REST = {
  ja: 'コーチはAIとの対局・二人対戦の間に使えます。AI同士・オンライン・レッスンなどの間はお休みです。終局後の振り返りは、このタブで見られます。',
  en: 'The coach works while you play the AI or a friend on this device. It rests during AI vs AI, online games, lessons and the like. After a game, the review appears in this tab.',
  zh: '教练在与AI对局或双人对战时可用。AI对AI、在线对局、课程等期间暂停。终局后可在此标签查看复盘。',
  ko: '코치는 AI 대국과 2인 대국 중에 사용할 수 있습니다. AI끼리 대국·온라인·레슨 등에서는 쉽니다. 대국이 끝나면 이 탭에서 복기를 볼 수 있습니다.',
  es: 'El entrenador funciona cuando juegas contra la IA o contra un amigo en este dispositivo. Descansa en IA contra IA, partidas en línea, lecciones, etc. Al terminar, el repaso aparece en esta pestaña.',
  fr: 'Le coach est disponible quand vous jouez contre l’IA ou à deux sur cet appareil. Il se repose pendant IA contre IA, les parties en ligne, les leçons, etc. Après la partie, l’analyse s’affiche dans cet onglet.',
  pt: 'O treinador funciona quando você joga contra a IA ou contra um amigo neste aparelho. Ele descansa em IA contra IA, partidas online, lições etc. Depois da partida, a revisão aparece nesta aba.',
  de: 'Der Coach hilft, wenn du gegen die KI oder zu zweit an diesem Gerät spielst. Bei KI gegen KI, Online-Partien, Lektionen usw. pausiert er. Nach der Partie erscheint die Analyse in diesem Tab.',
  hi: 'कोच तब काम करता है जब आप AI से या इसी डिवाइस पर किसी दोस्त से खेलते हैं। AI बनाम AI, ऑनलाइन खेल, पाठ आदि में यह आराम करता है। खेल के बाद समीक्षा इसी टैब में दिखती है।',
  ar: 'يعمل المدرّب عندما تلعب ضد الذكاء الاصطناعي أو مع صديق على هذا الجهاز. ويتوقف أثناء مباريات الذكاء الاصطناعي ضد نفسه، واللعب عبر الإنترنت، والدروس ونحوها. بعد انتهاء المباراة تظهر المراجعة في هذا التبويب.'
};
const LEARN = { ja: '学ぶ', en: 'Learn', zh: '学习', ko: '배우기', es: 'Aprender', fr: 'Apprendre', pt: 'Aprender', de: 'Lernen', hi: 'सीखें', ar: 'تعلّم' };
const $ = s => document.querySelector(s);
let rail = null, panel = null, learn = null, nbox = null, rest = null, on = false, open = false, cur = 'coach', saved = false, homes = [];
try { const v = localStorage.getItem(KEY); if (v === 'coach' || v === 'ek' || v === 'learn') { cur = v; saved = true; } } catch (e) {}
const lang = () => (typeof LANG !== 'undefined' ? LANG : (document.documentElement.lang || 'ja').slice(0, 2));
const tt = (k, d) => (typeof t === 'function' ? t(k) : d);
const boxes = () => [['coach', $('#coachCard')], ['coach', $('#reviewCard')], ['coach', rest], ['ek', $('#evalCard')], ['ek', $('.kifu-card')], ['learn', learn], ['ls', $('.lesson-card')], ['ls', $('.puzzle-card')]].filter(x => x[1]);
const coachOk = () => document.body.classList.contains('ck-tab');   // the coach (or its review) can work now
const pinned = () => document.body.classList.contains('in-lesson') || document.body.classList.contains('in-puzzle');
const onlineOn = () => document.body.classList.contains('mtab-online');
const recOn = () => document.body.classList.contains('lt-rec');
function label(k) {
  const l = lang();
  if (k === 'coach') return (window.MancalaCoach && MancalaCoach.tx('head')) || CKL[l] || CKL.en;
  if (k === 'ek') return tt('eval', 'Eval');
  if (k === 'learn') return LTAB[l] || LTAB.en;
  if (k === 'rec') return REC[l] || REC.en;
  return ONL[l] || ONL.en;
}
function build() {
  rail = document.createElement('nav'); rail.id = 'ltRail'; rail.setAttribute('role', 'tablist');
  rail.innerHTML = ['coach', 'ek', 'learn', 'rec', 'online'].map(k => `<button type="button" data-lt="${k}">${ICON[k]}<span></span></button>`).join('');
  panel = document.createElement('div'); panel.id = 'ltPanel';
  learn = document.createElement('div'); learn.id = 'ltLearn';
  rest = document.createElement('div'); rest.id = 'ltCoachRest'; rest.className = 'card ck-card lt-rest';
  rest.innerHTML = `<h3 class="ck-h">${ICON.coach}<span></span></h3><p class="ck-muted"></p>`;
  learn.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    close();
    const id = { rules: '#btnRules', lesson: '#btnLesson', puzzle: '#btnPuzzle' }[b.dataset.go], el = $(id); if (el) el.click();
  });
  rail.addEventListener('click', e => {
    const b = e.target.closest('[data-lt]'); if (!b) return;
    const k = b.dataset.lt;
    if (k === 'rec') {   // 戦績 slides in at the drawer's place (the same tab again closes it)
      const was = recOn(); close(); if (onlineOn() && typeof mtab === 'function') mtab('game');
      if (window.GameRecord) { if (was) { GameRecord.close(); document.body.classList.remove('lt-rec'); } else { document.body.classList.add('lt-rec'); GameRecord.open(); } }
      sync(); return;
    }
    if (recOn() && window.GameRecord) { GameRecord.close(); document.body.classList.remove('lt-rec'); }
    if (k === 'online') { const was = onlineOn(); close(); if (recOn() && window.GameRecord) { GameRecord.close(); document.body.classList.remove('lt-rec'); } if (typeof mtab === 'function') mtab(was ? 'game' : 'online'); sync(); return; }   // the same tab again closes it
    if (onlineOn() && typeof mtab === 'function') mtab('game');
    if (open && cur === k) { close(); return; }
    cur = k; saved = true; try { localStorage.setItem(KEY, k); } catch (er) {}
    setOpen(true); panel.scrollTop = 0;
  });
  // move navigation (|< < ▶ > >|): a compact box at the bottom centre of the screen that mirrors the game's own #navBar
  nbox = document.createElement('div'); nbox.id = 'ltNav'; nbox.className = 'navbar';
  const nav = $('#navBar'); if (nav) nbox.innerHTML = nav.innerHTML;
  nbox.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  nbox.addEventListener('click', e => {
    const b = e.target.closest('button[data-n]'), nv = $('#navBar'); if (!b || !nv) return;
    const r = nv.querySelector(`button[data-n="${b.dataset.n}"]`); if (r && !r.disabled) r.click();
  });
  relabel();
}
// shown while there are moves to step through (as the phone strip of infotabs.js: a filled move list, not on the online screen)
function navSync() {
  if (!nbox) return;
  const nav = $('#navBar'), k = $('#kifu');
  const has = !!k && k.children.length > 0 && !k.querySelector(':scope > .empty');
  const show = on && !!nav && has && !onlineOn();
  if (document.body.classList.contains('lt-nav') !== show) document.body.classList.toggle('lt-nav', show);
  if (!nav) return;
  nav.querySelectorAll('button[data-n]').forEach(b => {
    const c = nbox.querySelector(`button[data-n="${b.dataset.n}"]`); if (!c) return;
    if (c.disabled !== b.disabled) c.disabled = b.disabled;
    const pl = b.classList.contains('playing'); if (c.classList.contains('playing') !== pl) c.classList.toggle('playing', pl);
    if (b.title && c.title !== b.title) c.title = b.title;
  });
}
function relabel() {
  if (!rail) return;
  rail.querySelectorAll('[data-lt]').forEach(b => {
    const s = b.querySelector('span'), l = label(b.dataset.lt);
    if (s.textContent !== l) s.textContent = l;
    b.setAttribute('aria-label', l); b.title = l;
  });
  const row = (k, ic, desc) => `<button type="button" data-go="${k}">${ICON[ic]}<span>${tt('btn.' + k, k)}${desc ? `<small>${desc}</small>` : ''}</span></button>`;
  const h = `<h3>${label('learn').replace('\n', ' / ')}</h3>` + row('rules', 'rules', tt('btn.rules.title', '')) + row('lesson', 'learn', tt('btn.lesson.title', '')) + row('puzzle', 'puzzle', tt('btn.puzzle.title', ''));
  if (learn.dataset.h !== h) { learn.dataset.h = h; learn.innerHTML = h; }
  const l = lang(), rh = rest.querySelector('span'), rp = rest.querySelector('p'), rt = REST[l] || REST.en;
  if (rh.textContent !== label('coach')) rh.textContent = label('coach');
  if (rp.textContent !== rt) rp.textContent = rt;
  fit();
}
// a label that does not fit the rail is hidden (never cut off)
function fit() {
  if (!rail || !on) return;
  rail.querySelectorAll('[data-lt] span').forEach(s => {
    if (s.parentNode.hidden || !s.parentNode.clientWidth) return;   // (a hidden button has no width: never judge it then)
    s.style.display = ''; if (s.scrollWidth > s.parentNode.clientWidth - 2) s.style.display = 'none';
  });
}
function setOpen(v) {
  open = !!v && on && !pinned();
  document.body.classList.toggle('lt-open', open);
  panel.style.transform = '';
  sync();
}
function close() { if (open) setOpen(false); }
function sync() {
  if (!on) return;
  const ol = onlineOn();
  rail.querySelectorAll('[data-lt]').forEach(b => {
    const k = b.dataset.lt, sel = recOn() ? k === 'rec' : ol ? k === 'online' : open && k === cur;
    b.classList.toggle('sel', sel); b.setAttribute('aria-selected', sel ? 'true' : 'false');
    if (k === 'online' && b.hidden !== document.body.classList.contains('no-online')) { b.hidden = !b.hidden; fit(); }
  });
  if (document.body.dataset.lt !== cur) document.body.dataset.lt = cur;
  const rs = !coachOk() && !document.querySelector('#reviewCard.show');
  if (document.body.classList.contains('lt-ckrest') !== rs) document.body.classList.toggle('lt-ckrest', rs);
  navSync();
}
function enter() {
  if (on) return; on = true;
  if (!rail) build();
  homes = boxes().map(([k, el]) => ({ el, parent: el.parentNode, next: el.nextSibling, k }));
  const app = $('.app');
  app.appendChild(rail); app.appendChild(panel); app.appendChild(nbox);
  for (const h of homes) { h.el.dataset.ltc = h.k; panel.appendChild(h.el); }
  document.body.classList.add('lt-on');
  if (!saved && coachOk()) cur = 'coach';
  setOpen(false); refit();
}
function leave() {
  if (!on) return; on = false; open = false;
  for (const h of homes.slice().reverse()) { delete h.el.dataset.ltc; if (h.parent) h.parent.insertBefore(h.el, h.next && h.next.parentNode === h.parent ? h.next : null); else h.el.remove(); }
  homes = [];
  rail.remove(); panel.remove(); nbox.remove();
  document.body.classList.remove('lt-on', 'lt-open', 'lt-nav', 'lt-ckrest'); delete document.body.dataset.lt;
  refit();
}
function refit() {
  try { fixW = 0; fixSize(); } catch (e) {}
  setTimeout(() => { try { layout(); } catch (e) {} fit(); }, 30);
}
function check() { if (MQ.matches && !document.documentElement.classList.contains('atlas-skin')) enter(); else leave(); }
// a tap on the board closes the drawer (and does not play a pit)
document.addEventListener('click', e => {
  if (on && recOn() && e.target.closest && e.target.closest('.frame') && window.GameRecord) { e.stopPropagation(); e.preventDefault(); GameRecord.close(); document.body.classList.remove('lt-rec'); sync(); return; }
  if (!on || !open || pinned()) return;
  if (e.target.closest && (e.target.closest('#ltPanel') || e.target.closest('#ltRail') || e.target.closest('.overlay') || e.target.closest('.ck-pop'))) return;
  if (e.target.closest && e.target.closest('.frame')) { e.stopPropagation(); e.preventDefault(); close(); }
}, true);
document.addEventListener('pointerdown', e => {
  if (on && open && !pinned() && e.target.closest && e.target.closest('.frame') && !e.target.closest('#ltPanel')) { e.stopPropagation(); }
}, true);
// swipes: left from the right edge opens, right on the open drawer (or the 戦績 / オンライン box in its place) closes it;
// the box follows the finger
let sw = null;
const W = el => el.getBoundingClientRect().width + 80;
// the 戦績 / オンライン box (it is not the drawer): closed as its tab would
function closeSide() {
  if (recOn() && window.GameRecord) { GameRecord.close(); document.body.classList.remove('lt-rec'); }
  if (onlineOn() && typeof mtab === 'function') mtab('game');
  sync();
}
document.addEventListener('touchstart', e => {
  sw = null;
  if (!on || pinned() || e.touches.length !== 1) return;
  const x = e.touches[0].clientX, y = e.touches[0].clientY, tg = e.target.closest ? e.target : null;
  const side = tg && (recOn() ? tg.closest('.grc-ov') : onlineOn() ? tg.closest('.dock') : null);
  if (side) { sw = { x, y, mode: 'close', dx: 0, el: side, side: true }; return; }
  if (document.querySelector('.overlay.show')) return;
  if (open && tg && tg.closest('#ltPanel')) sw = { x, y, mode: 'close', dx: 0, el: panel };
  else if (!open && !onlineOn() && !recOn() && x > innerWidth - 90) sw = { x, y, mode: 'open', dx: 0, el: panel };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
  if (!sw.go) {   // decide once: a mostly-vertical move is the box's own scrolling (never taken over)
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay >= 6 && ay >= ax * .8) { sw = null; return; }
    if (ax < 12 || ax < ay * 1.6) return;
    sw.go = true; panel.classList.add('drag');
    if (sw.side) { sw.el.style.animation = 'none'; sw.el.style.transition = 'none'; }
  }
  sw.dx = dx;
  const w = W(sw.el), off = sw.mode === 'open' ? Math.max(0, Math.min(w, w + dx)) : Math.max(0, Math.min(w, dx));
  sw.el.style.transform = `translateX(${off}px)`;
  if (e.cancelable) e.preventDefault();   // the page must not pan sideways under the finger
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!sw) return;
  const s = sw; sw = null;
  if (!s.go) return;
  if (s.side) {   // 戦績 / オンライン: slides out to the right (or back), then closes
    const el = s.el, out = s.dx > 50;
    el.style.transition = 'transform .2s ease-out'; el.style.transform = out ? `translateX(${W(el)}px)` : '';
    setTimeout(() => { if (out) closeSide(); el.style.transition = ''; el.style.transform = ''; el.style.animation = ''; }, out ? 200 : 220);
    panel.classList.remove('drag'); return;
  }
  panel.classList.remove('drag'); panel.style.transform = '';
  if (s.mode === 'open' && s.dx < -50) setOpen(true);
  else if (s.mode === 'close' && s.dx > 50) setOpen(false);
  else setOpen(open);
}, { passive: true });
// the coach tab appears / the review opens: the coach tab is chosen (the drawer stays as it is)
let ckWas = coachOk(), rvWas = false;
new MutationObserver(() => {
  const a = coachOk();
  if (a && !ckWas && !saved) cur = 'coach';
  const pin = pinned(); if (on && pin !== !!document.body.dataset.ltpin) { if (pin) document.body.dataset.ltpin = '1'; else delete document.body.dataset.ltpin; close(); refit(); }
  ckWas = a; sync();
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
{ const rc = $('#reviewCard'); if (rc) new MutationObserver(() => { const rv = rc.classList.contains('show'); if (rv && !rvWas) cur = 'coach'; rvWas = rv; sync(); }).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
new MutationObserver(() => { const ov = $('.grc-ov'); if (recOn() && (!ov || !ov.classList.contains('show'))) { document.body.classList.remove('lt-rec'); sync(); } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
{ const k = $('#kifu'), nv = $('#navBar');
  if (k) new MutationObserver(navSync).observe(k, { childList: true });
  if (nv) new MutationObserver(navSync).observe(nv, { subtree: true, attributes: true, attributeFilter: ['disabled', 'class', 'title'] }); }
new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
if (MQ.addEventListener) MQ.addEventListener('change', check); else MQ.addListener(check);
addEventListener('resize', () => fit());
check();
window.LandTabs = { on: () => on, open: k => { if (k) cur = k; setOpen(true); }, close, sync, relabel };
})();
