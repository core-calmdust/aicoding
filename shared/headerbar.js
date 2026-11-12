// HeaderBar — PC header bar for the 世界のボドゲ大百科 games (common spec).
//
// On a PC browser the title, the menu buttons and the icon set move into one bar at the very top of the page:
//   [ title ]  [ info (analysis, turn, …) ················ ]  [ menu: 対局 待った ヒント ルール レッスン パズル ]  [ icons ]
// On phones / tablets nothing moves (the mobile rule — menu just under the title, above the board — stays).
// The menu order is the same in every game (also on mobile): new > undo > hint > rules > lessons > puzzles > the rest.
//
// Usage (after the DOM is built):
//   const hb = HeaderBar.init({
//     brand: '.brand',                 // element holding .brand-l (title) and .brand-r (icon set)
//     controls: '.controls',           // the menu buttons
//     order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'],
//     rules: () => openRules(),        // only for games without a rules button: a button is added (id btnRules)
//     lang: () => LANG,                // label of the added rules button follows the game language
//   });
//   hb.info.innerHTML = '…';           // the free space: show analysis / turn / score there (PC only, hidden on mobile)
//   hb.on                              // true while the PC bar is active: html.hb-on + body.hb-on (portal: .hb-atlas),
//                                      // --hb-h is the bar height (set on html, so :root sizes can subtract it)
//   hb.onChange(fn)                    // called with true/false when switching between PC bar and mobile layout
//   hb.relabel()                       // re-translate the added rules button after a language change
//   HeaderBar.addOption({…})           // a game's own item in the options (gear) panel — see "the options button" below
(function () {
  // the game boards are not text: no selection box over them (a drag / long press across the board selected the squares' letters,
  // coordinates and piece names — every game, 2026-11-11)
  try { const st = document.createElement('style'); st.id = 'hb-noselect';
    st.textContent = '.board-area,.board-area *,.board-wrap,.board-wrap *,#boardWrap,#boardArea,#board,.board,.frame,.hand,.coords{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none}';
    (document.head || document.documentElement).appendChild(st); } catch (e) {}
'use strict';
// PC layout (common spec): mouse + wide enough for left panel + board + right panel, and not a tall window; otherwise the phone layout
const MQ = '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)';
const H = 56;
const RULES = { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد', ru: 'Правила', 'zh-TW': '規則', id: 'Aturan', tr: 'Kurallar' };
const RULES_T = { ja: '動かしながら覚えるルール', en: 'Learn the rules by playing', zh: '边玩边学规则', ko: '직접 해 보며 배우는 규칙', es: 'Aprende las reglas jugando', fr: 'Apprendre les règles en jouant', pt: 'Aprenda as regras jogando', de: 'Regeln beim Spielen lernen', hi: 'खेलते हुए नियम सीखें', ar: 'تعلّم القواعد باللعب', ru: 'Изучите правила в игре', 'zh-TW': '邊玩邊學規則', id: 'Pelajari aturan sambil bermain', tr: 'Kuralları oynayarak öğren' };
// short names for the menu buttons (PC header bar and the phone menu under the title only — dialogs keep the game's own
// longer wording; 2026-11-07): one natural word where the language has one, as Japanese already says 新規 rather than
// 新しいゲーム. Keyed by language and by the game's full label, so only a known long label is replaced (a cash-out button
// keeps its own meaning); the full label stays in the button's title. A short name already used by another button of the same
// menu is not applied (de casino: «Lernen» is the study button there, so its lessons stay «Lektionen»). Japanese is unchanged.
const SHORT = {
  en: { 'New game': 'New', 'Offer draw': 'Draw?', 'Online play': 'Online' },
  es: { 'Ofrecer tablas': '¿Tablas?', 'Problemas': 'Retos', 'Juego en línea': 'En línea', 'Retirar fichas': 'Cobrar' },
  fr: { 'Abandonner': 'Abandon', 'Proposer nulle': 'Nulle ?', 'Problèmes': 'Défis', 'Jeu en ligne': 'En ligne', 'Statistiques': 'Stats' },
  pt: { 'Propor empate': 'Empate?', 'Jogo online': 'Online' },
  de: { 'Remis anbieten': 'Remis?', 'Lektionen': 'Lernen', 'Aufgaben': 'Rätsel', 'Online spielen': 'Online' },
  ru: { 'Новая игра': 'Новая', 'Отмена хода': 'Отмена', 'Отменить': 'Отмена', 'Подсказка': 'Совет', 'Подсказки': 'Совет', 'Игра онлайн': 'Онлайн', 'Онлайн-игра': 'Онлайн', 'Забрать фишки': 'Выйти' },
  tr: { 'Yeni oyun': 'Yeni', 'Beraberlik': 'Berabere?', 'Bulmacalar': 'Bulmaca', 'İpuçları': 'İpucu', 'Çevrim içi oyun': 'Çevrim içi', 'Fişleri boz': 'Kalk' },
  id: { 'Permainan baru': 'Baru', 'Main baru': 'Baru', 'Urungkan': 'Batal', 'Tawarkan seri': 'Seri?', 'Tawar seri': 'Seri?', 'Tawarkan remis': 'Remis?', 'Teka-teki': 'Soal', 'Pelajaran': 'Belajar', 'Main online': 'Online' },
  hi: { 'ड्रॉ प्रस्ताव': 'ड्रॉ?', 'पहेलियाँ': 'पहेली', 'ऑनलाइन खेल': 'ऑनलाइन' },
  ar: { 'عرض تعادل': 'تعادل؟', 'الألغاز': 'ألغاز', 'الدروس': 'دروس', 'اللعب عبر الإنترنت': 'أونلاين', 'الإحصاءات': 'إحصاءات' },
  ko: { '무승부 제안': '무승부?', '온라인 대국': '온라인' },
  zh: { '在线对战': '在线', '离桌结算': '离桌', '结算离桌': '离桌', '残局题': '残局' },
  'zh-TW': { '提議和棋': '提和', '提議和局': '提和', '線上對戰': '線上', '結算離桌': '離桌', '殘局題': '殘局' },
};
const ICON_RULES = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>';
const CSS = `
/* lesson / puzzle card buttons in the PC info column (common spec): two per row, labels on one line */
html.side-col .side .lesson-actions{display:grid!important;grid-template-columns:repeat(auto-fit, minmax(118px, 1fr));gap:8px}
html.side-col .side .lesson-actions > button{white-space:nowrap;min-width:0;flex:none!important}
html.side-col .side .lesson-actions > button.hidden{display:none!important}
html.side-col .side .lesson-card .lh{flex-wrap:wrap;row-gap:6px}html.side-col .side .lesson-card .lh .lt{white-space:nowrap}
/* player cards (common spec: whenever the info column stands beside the board — html.side-col): the side / count label is information, not a headline — keep it modest */
html.side-col .side .players .count, html.side-col .side .players .count > span:first-child, html.side-col .side .players [id^=pip]{font-size:clamp(20px, 1.6vw, 26px)!important;line-height:1.15!important}
html.side-col .side .players .side-l{font-size:clamp(15px, 1.15vw, 18px)!important;line-height:1.3!important}
/* …and the card itself compact, one line: name on the left, then the status (only while it says something: thinking / check / win …
   — the plain "to move" label is gone, the gold frame shows whose turn it is), then the count / side on the right; the count's
   caption sits small on the left of the number so the number stays at the right edge and nothing wraps
   (not while a game clock is shown — those cards keep their own clock layout) */
html.side-col body:not(.has-clk):not(.in-online) .side .players .player{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;column-gap:0;row-gap:1px;padding:8px 12px!important;min-height:0!important}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .top{grid-column:1;grid-row:1;min-width:0}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .count, html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .side-l, html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .row{grid-column:3;grid-row:1;margin:0!important;margin-inline-start:10px!important;text-align:end}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .status{grid-column:2;grid-row:1;max-width:11em;margin-inline-start:8px;height:auto!important;line-height:1.3;text-align:end}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .status:empty{display:none}
html.side-col body:not(.has-clk):not(.in-online) .side .players .count{display:flex;flex-direction:row-reverse;align-items:baseline;justify-content:flex-start;white-space:nowrap}
html.side-col body:not(.has-clk):not(.in-online) .side .players .count > small{display:inline;margin:0!important;margin-inline-end:6px!important;white-space:nowrap}
html.side-col body:not(.has-clk):not(.in-online) .side .players .count > small:empty{display:none}
html.side-col .side .card.players{padding-top:10px!important;padding-bottom:10px!important}
:root{--hb-h:0px}
html.hb-on,body.hb-on{--hb-h:${H}px}
.hb{position:fixed;z-index:60;top:0;left:0;right:0;height:${H}px;display:none;align-items:center;gap:14px;padding:0 max(18px, env(safe-area-inset-right)) 0 max(18px, env(safe-area-inset-left));
  background:color-mix(in srgb, var(--panel, #141a20) 92%, transparent);border-bottom:1px solid var(--line, rgba(255,255,255,.1));
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 4px 18px rgba(0,0,0,.18);box-sizing:border-box}
body.hb-on .hb{display:flex}
body.hb-on{padding-top:${H}px}
.brand.hb-moved{display:none!important}
.hb .hb-title{flex:none;display:flex;align-items:center;min-width:0}
.hb .hb-title,.hb .hb-icons{order:0;height:auto!important;width:auto!important;position:static!important;margin:0!important;padding:0!important;border:0!important;background:none!important}
.hb .hb-title .brand-l{display:flex!important;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;white-space:nowrap;margin:0!important}
.hb .hb-title .brand-l h1{margin:0!important;font-size:22px!important;line-height:1.05!important}
.hb .hb-title .brand-l .series{font-size:11px!important;line-height:1.2}
.hb .hb-info{flex:1;min-width:0;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted, #9aa);overflow:hidden;white-space:nowrap}
.hb .hb-info:empty{visibility:hidden}
.hb .hb-info b{color:var(--text, #eee);font-weight:700}
.hb .hb-info .hb-chip{flex:none;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);overflow:hidden;text-overflow:ellipsis}
.hb .hb-menu{flex:none;display:flex!important;flex-direction:row!important;align-items:center;gap:6px!important;margin:0!important;padding:0 14px 0 0!important;border:0!important;border-right:1px solid var(--line, rgba(255,255,255,.12))!important;background:none!important;box-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important;max-width:none!important;grid-template-columns:none!important;order:0!important;position:static!important}
.hb .hb-menu > *{flex:none!important;display:inline-flex;flex-direction:row!important;align-items:center;justify-content:center;width:auto!important;min-width:0!important;height:36px!important;margin:0!important;padding:0 11px!important;font-size:13px!important;line-height:1!important;gap:6px!important;border-radius:10px!important;white-space:nowrap}
.hb .hb-menu > * svg{width:16px!important;height:16px!important;margin:0!important;flex:none}
.hb .hb-menu > * span{font-size:13px!important;margin:0!important}
.hb .hb-menu > .hidden,.hb .hb-menu > [hidden]{display:none}
.hb .hb-icons{flex:none;display:flex;align-items:center;gap:6px}
.hb .hb-icons .brand-r{display:flex;align-items:center;gap:6px;margin:0}
/* the icon buttons (record, sound, language, home) as tall as the menu buttons beside them (common rule) */
.hb .hb-icons .brand-r > :is(button,a),.hb .hb-icons > :is(button,a){height:36px!important;min-width:36px!important;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;border-radius:10px}
.hb .hb-icons :is(.lsel-btn,select){height:36px!important;box-sizing:border-box}
/* portal version: the portal's own top bar hosts title, info and menu */
.atlas-top .hb-title h1{margin:0;font-family:'RocknRoll One','Zen Maru Gothic',sans-serif;font-weight:400;font-size:20px;line-height:1.1;color:#111;letter-spacing:.03em;white-space:nowrap;text-shadow:none}
.atlas-top .hb-title h1 small{display:none}
.atlas-top .hb-title{flex:none;display:flex;align-items:center;align-self:center;height:30px;padding-left:12px;margin-left:2px;border-left:2px solid #e3d3ad}
.atlas-top .hb-title.hb-home{cursor:pointer;pointer-events:auto}.atlas-top .hb-title.hb-home:hover h1{color:#d93c3c}.atlas-top .hb-title.hb-home:focus-visible{outline:2px solid #ffc928;outline-offset:3px;border-radius:6px}
.atlas-top .hb-info{flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;white-space:nowrap;font:700 13px 'Zen Maru Gothic',sans-serif;color:#6a7088}
.atlas-top .hb-info b{color:#2b3044}
.atlas-top .hb-info .hb-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;background:#fff;border:2px solid #efe3c8}
html.atlas-skin .atlas-top .hb-menu{flex:none;display:flex!important;align-items:center;gap:6px;margin:0 6px 0 0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;width:auto!important;height:auto!important}
html.atlas-skin .atlas-top .hb-menu::before,html.atlas-skin .atlas-top .hb-menu::after,.hb .hb-menu::before,.hb .hb-menu::after{display:none!important}   /* (the card's inner ring — ur / senet .card::before, inset 3px — drew a short box across the 40px buttons) */
html.atlas-skin .atlas-top .hb-menu > *{flex:none!important;display:inline-flex;flex-direction:row!important;align-items:center;justify-content:center;min-width:0!important;line-height:1!important;width:auto!important;height:40px!important;margin:0!important;padding:0 13px!important;border-radius:99px!important;font-size:15px!important;gap:7px;white-space:nowrap}
/* (2026-11-12) the look of the portal's own tabs (atlas/index.html .tab) — :not(#_) outweighs each game's own button rules (.card.controls .btn …): no box — an icon and a bold label in the muted ink, a white pill on hover, the navy pill while pressed */
html.atlas-skin .atlas-top .hb-menu:not(#_) > *{background:transparent!important;border:0!important;box-shadow:none!important;color:#6a7088!important;font-weight:900!important;transition:background .15s,color .15s}
html.atlas-skin .atlas-top .hb-menu:not(#_) > * *{color:inherit!important}
html.atlas-skin .atlas-top .hb-menu:not(#_) > *:not(:disabled):hover{background:#fff!important;color:#2b3044!important}
html.atlas-skin .atlas-top .hb-menu:not(#_) > *:not(:disabled):active,html.atlas-skin .atlas-top .hb-menu:not(#_) > :is(.on,.sel,[aria-pressed=true],[aria-selected=true]){background:#2b3044!important;color:#fff!important;box-shadow:0 3px 0 #161a28!important}
html.atlas-skin .atlas-top .hb-menu:not(#_) > *:disabled,html.atlas-skin .atlas-top .hb-menu:not(#_) > .disabled{opacity:.4!important;background:transparent!important}
html.atlas-skin .atlas-top .hb-menu > * svg{width:19px!important;height:19px!important;margin:0!important}
html.atlas-skin .atlas-top .hb-menu > * span{margin:0!important}
@media (max-width: 1280px){html.atlas-skin .atlas-top .hb-menu > * span{display:none}html.atlas-skin .atlas-top .hb-menu > *{padding:0 11px!important}}
body.hb-atlas .atlas-top .hb-info{display:none!important}   /* portal: title only, no game info */
body.hb-atlas .atlas-top .sp{display:block!important;flex:1}
html[dir=rtl] .hb, html[lang=ar] .hb{direction:rtl}
html[lang=ar] .hb .hb-menu{padding:0 0 0 14px;border-right:0;border-left:1px solid var(--line, rgba(255,255,255,.12))}
@media (max-width: 1180px){.hb .hb-menu > * span{display:none}.hb .hb-menu > *{padding:0 10px!important}}
@media (max-width: 960px){.hb .hb-title .brand-l .series{display:none}}
/* fitting the bar to the window (2026-11-07, long languages): fit() below adds these step by step, only while something does not
   fit — the bar never runs past the window and the info keeps room for its first chips. hb-t1: tighter spacing; hb-lc: the language
   button shows its code (DE) instead of its name; hb-ico: a menu button shows its icon only (its name stays in title / aria-label,
   lowest priority first: from the end of the menu); in the info, a chip that does not fit is left out whole (hb-cut, from the
   end) instead of being cut, and the first one shrinks with …. The title / logo (World Board Game Atlas and its wide overseas
   variant) is never touched: its design is fixed. */
.hb.hb-t1{gap:10px}
.hb.hb-t1 .hb-menu{gap:4px!important;padding:0 10px 0 0!important}
html[lang=ar] .hb.hb-t1 .hb-menu{padding:0 0 0 10px!important}
.hb.hb-t1 .hb-menu > *{padding:0 8px!important}
.hb.hb-t1 .hb-icons,.hb.hb-t1 .hb-icons .brand-r{gap:4px}
.hb .hb-menu > .hb-ico > span{display:none!important}
.hb .hb-menu > .hb-ico{padding:0 10px!important}
.hb.hb-lc .lsel-btn .lsel-n{display:none}.hb.hb-lc .lsel-btn .lsel-c{display:inline}
.hb .hb-info > .hb-cut{display:none!important}
.hb .hb-info > .hb-shrink{flex:0 1 auto!important;min-width:0!important;max-width:100%}
.hb .hb-info > .hb-shrink > b,.hb .hb-info > .hb-shrink > span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* PC: the game-over dialog is wide enough for its buttons on one line each (all games) */
@media ${MQ}{#resultOverlay .modal{width:min(640px, calc(100vw - 64px))}#resultOverlay .modal-actions .mbtn,#resultOverlay .modal-actions button{white-space:nowrap}}
`;
const $ = s => typeof s === 'string' ? document.querySelector(s) : s;
function init(o) {
  o = o || {};
  if (!document.getElementById('hbCss')) { const st = document.createElement('style'); st.id = 'hbCss'; st.textContent = CSS; document.head.appendChild(st); }
  const brand = $(o.brand || '.brand'), controls = $(o.controls || '.controls');
  const brandL = brand && brand.querySelector('.brand-l'), brandR = brand && brand.querySelector('.brand-r');
  const L = () => (o.lang ? o.lang() : document.documentElement.lang) || 'ja';
  // rules button for games that have none
  let rulesBtn = null;
  if (controls && o.rules && !controls.querySelector('#btnRules')) {
    const ref = controls.querySelector('button');
    rulesBtn = document.createElement('button');
    rulesBtn.id = 'btnRules'; rulesBtn.type = 'button';
    rulesBtn.className = ref ? ref.className.replace(/\bprimary\b/, '').trim() || 'btn' : 'btn';
    rulesBtn.innerHTML = ICON_RULES + '<span></span>';
    rulesBtn.addEventListener('click', () => o.rules());
    controls.appendChild(rulesBtn);
  }
  function relabel() {
    if (!rulesBtn) return; const l = L();
    rulesBtn.querySelector('span').textContent = RULES[l] || RULES.en; rulesBtn.title = RULES_T[l] || RULES_T.en;
  }
  relabel();
  // the game may set its language after init (URL / saved setting): follow <html lang> and re-check once loaded
  new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  setTimeout(relabel, 0); window.addEventListener('load', relabel);
  // common menu order
  if (controls && o.order) {
    const list = o.order.map(x => $(x)).filter(x => x && x.parentNode === controls);
    list.forEach(el => controls.appendChild(el));
    // keep the others (in their own order) after the common ones
    [...controls.children].filter(el => !list.includes(el)).forEach(el => controls.appendChild(el));
  }
  if (controls) shortLabels(controls, L);
  // the bar
  const bar = document.createElement('header'); bar.className = 'hb'; bar.setAttribute('role', 'banner');
  bar.innerHTML = '<div class="hb-title"></div><div class="hb-info" aria-live="polite"></div><nav class="hb-menu-slot"></nav><div class="hb-icons"></div>';
  document.body.prepend(bar);
  const slotT = bar.querySelector('.hb-title'), info = bar.querySelector('.hb-info'), slotM = bar.querySelector('.hb-menu-slot'), slotI = bar.querySelector('.hb-icons');
  slotM.style.display = 'contents';
  // placeholders remember where things live in the mobile layout
  const home = new Map();
  const park = el => { if (!el || home.has(el)) return; const ph = document.createComment('hb'); el.parentNode.insertBefore(ph, el); home.set(el, ph); };
  [brandL, brandR, controls].forEach(park);
  const fns = [];
  const mq = window.matchMedia(o.media || MQ);
  const portal = document.documentElement.classList.contains('atlas-skin');   // portal version: use the portal's top bar
  // (2026-11-12) the full version: the game's name beside the portal's logo takes you back to the game's own home — the page as it
  // opens on (the ordinary game) — out of a lesson, a puzzle, the review … in one click
  if (portal) {
    slotT.classList.add('hb-home'); slotT.setAttribute('role', 'link'); slotT.tabIndex = 0;
    const HL = { ja: 'このゲームのホームへ', en: "This game's home", zh: '回到本游戏首页', 'zh-TW': '回到本遊戲首頁', ko: '이 게임의 홈으로', es: 'Inicio de este juego', fr: 'Accueil de ce jeu', pt: 'Início deste jogo', de: 'Start dieses Spiels', ru: 'Начало этой игры', tr: 'Bu oyunun ana ekranı', id: 'Beranda game ini', hi: 'इस खेल का होम', ar: 'الصفحة الرئيسية لهذه اللعبة' };
    const lg = () => { const l = (document.getElementById('langSel') || {}).value || document.documentElement.lang || 'ja'; return /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : HL[l] ? l : String(l).slice(0, 2); };
    // back to the screen the game opens on (the ordinary game): whatever is open over it — a lesson, a puzzle, the review, the
    // editor, the rules, a dialog — is left by its own exit button (the same as pressing it), a few passes for the layers under
    // it; the game in play and an online game are left as they are (no reload)
    const EXITS = ['#edQuit', '#pzQuitL', '#pzQuit', '#lsQuit', '#btnLessonQuit2', '#lsBackOp', '#btnTsGridBack', '#rvClose', '#btnLessonClose', '#pzClose', '#pzClose2', '#rulesClose', '#btnNewClose', '#btnStatsClose', '#btnSetClose', '#exportClose', '#hintClose', '#tuClose', '#rClose', '#btnResClose', '#btnRoadClose', '.grc-x'];
    const shown = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.disabled);
    const goHome = () => {
      let n = 0;
      const pass = () => { let hit = false; for (const q of EXITS) document.querySelectorAll(q).forEach(el => { if (shown(el)) { try { el.click(); hit = true; } catch (e) {} } });
        if (hit && ++n < 4) setTimeout(pass, 140); else { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} } };
      document.querySelectorAll('.hbo-pop.on').forEach(p => p.classList.remove('on'));
      pass();
    };
    slotT.addEventListener('click', goHome);
    slotT.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } });
    const tip = () => { const t = HL[lg()] || HL.en; slotT.title = t; slotT.setAttribute('aria-label', t); };
    tip(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(tip, 30));
  }
  let on = null, host = null;
  function portalHost() {
    if (host && host.isConnected) return host;
    host = document.querySelector('.atlas-top'); if (!host) return null;
    const sp = host.querySelector('.sp'), ab = host.querySelector('.atlas-brand'), coin = host.querySelector('.atlas-coin') || sp;
    if (ab) ab.after(slotT); else host.prepend(slotT);
    if (sp) sp.before(info); else host.appendChild(info);
    coin.before(slotM);
    return host;
  }
  function apply() {
    let want = mq.matches && !document.body.classList.contains('hb-off');
    if (want && portal && !portalHost()) {   // the portal bar is made a little later: wait for it
      const mo = new MutationObserver(() => { if (document.querySelector('.atlas-top')) { mo.disconnect(); on = null; apply(); } });
      mo.observe(document.body, { childList: true }); want = false;
    }
    if (want === on) return; on = want;
    if (on) {
      if (portal) { const h1 = brandL && brandL.querySelector('h1'); if (h1) { park(h1); slotT.appendChild(h1); } }
      else if (brandL) { slotT.classList.add('brand'); slotT.appendChild(brandL); }
      if (controls) { slotM.appendChild(controls); controls.classList.add('hb-menu'); }
      if (brandR && !portal) { slotI.classList.add('brand'); slotI.appendChild(brandR); }
    } else {
      for (const [el, ph] of home) if (ph.parentNode) ph.parentNode.insertBefore(el, ph.nextSibling);
      if (controls) controls.classList.remove('hb-menu');
    }
    for (const el of [document.documentElement, document.body]) { el.classList.toggle('hb-on', on && !portal); el.classList.toggle('hb-atlas', on && portal); }
    if (brand) brand.classList.toggle('hb-moved', on && !portal);
    api.on = on;
    fns.forEach(f => { try { f(on); } catch (e) { console.error(e); } });
    window.dispatchEvent(new Event('resize'));
  }
  const api = { bar, info, on: false, relabel, rulesBtn, onChange(f) { fns.push(f); }, refresh: apply,
    setInfo(html) { info.innerHTML = html || ''; } };
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  apply();
  if (!portal) fitBar(bar, info, () => controls, () => on);
  if (controls) fitLabels(controls, () => on);
  return api;
}
// the menu buttons' short names (SHORT above): applied whenever the game writes a label (start, language change, the draw
// offer appearing …); the full label is kept in title (when the game set none) and in aria-label
function shortLabels(controls, L) {
  let q = 0;
  const run = () => {
    q = 0;
    const lang = L() || document.documentElement.lang, map = SHORT[lang] || {};
    const btns = [...controls.children].filter(b => b.querySelector(':scope > span'));
    const sp = b => b.querySelector(':scope > span');
    // a language change puts back the game's full label: drop what we added for the old one first
    for (const b of btns) {
      const s = sp(b), t = s.textContent.trim();
      if (b.dataset.hbShort && t !== b.dataset.hbShort) {
        if (b.dataset.hbST && b.title === b.dataset.hbFull) b.removeAttribute('title');
        if (b.dataset.hbSA && b.getAttribute('aria-label') === b.dataset.hbFull) b.removeAttribute('aria-label');
        for (const k of ['hbShort', 'hbFull', 'hbST', 'hbSA']) delete b.dataset[k];
      }
    }
    const used = new Set(btns.map(b => sp(b).textContent.trim()));
    for (const b of btns) {
      const s = sp(b), t = s.textContent.trim(), sh = map[t];
      if (!sh || b.dataset.hbShort || used.has(sh)) continue;
      s.textContent = sh; used.add(sh);
      b.dataset.hbShort = sh; b.dataset.hbFull = t;
      if (!b.title) { b.title = t; b.dataset.hbST = '1'; }
      if (!b.getAttribute('aria-label')) { b.setAttribute('aria-label', t); b.dataset.hbSA = '1'; }
    }
    mo.takeRecords();
  };
  // (a microtask, not a frame: the full label is never painted first)
  const later = () => { if (!q) { q = 1; Promise.resolve().then(run); } };
  const mo = new MutationObserver(later);
  mo.observe(controls, { childList: true, subtree: true, characterData: true });
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.addEventListener('load', later);
  run();
}
// phone / tablet menu (the buttons under the title): a name that does not fit its button (ru «Подсказка», de «Lektionen» …) is
// set a little smaller — only that one, down to 78% of its size; a name of several words that is still too long goes on two
// lines inside the same button; a single long word may go down to 70% — never cut with … (2026-11-07)
// (the bottom tabs — shared/infotabs.js .mtabs: 評価・棋譜・コーチ… — the same way)
function fitLabels(controls, isOn) {
  let q = 0, tabs = null;
  // how much a label needs: its own text width against the room its button leaves it (a label may also spill out of a
  // button that does not clip — morris — so the button's content box is the measure, not the label's own box)
  const need = s => {
    const b = s.parentElement, br = b.getBoundingClientRect(), cs = getComputedStyle(b), sr = s.getBoundingClientRect();
    const inL = br.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0), inR = br.right - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderRightWidth) || 0);
    const row = cs.flexDirection.startsWith('row') && cs.display.includes('flex');
    // room: the label's own box when it is clipped there; otherwise what the button's inside leaves (beside an icon, in a row)
    let room = Math.min(sr.width, inR - inL);
    if (row) { let used = 0; for (const c of b.children) if (c !== s && c.getClientRects().length) used += c.getBoundingClientRect().width + (parseFloat(cs.columnGap) || 0); room = Math.min(room + 0.5, inR - inL - used); }
    return { w: s.scrollWidth, room, spill: Math.max(0, sr.right - inR, inL - sr.left) };
  };
  const run = () => {
    q = 0;
    if (!tabs || !tabs.isConnected) { tabs = document.querySelector('.mtabs'); if (tabs) mo.observe(tabs, { childList: true, subtree: true, characterData: true }); }
    const spans = [...controls.querySelectorAll(':scope > button > span, :scope > a > span')].concat(tabs ? [...tabs.querySelectorAll('button > .it-lb')] : []);
    spans.forEach(s => { if (s.dataset.hbFs) { for (const k of ['fontSize', 'letterSpacing', 'whiteSpace', 'lineHeight', 'textOverflow', 'textAlign', 'overflowWrap']) s.style[k] = ''; delete s.dataset.hbFs; } });
    const bad = s => { const n = need(s); return n.w > n.room + 1 || n.spill > 1; };
    for (const s of spans) {
      if (!s.getClientRects().length || (!tabs || !tabs.contains(s)) && isOn() || !s.textContent.trim()) continue;
      const n = need(s); if (n.room <= 4 || !bad(s)) continue;
      const fs = parseFloat(getComputedStyle(s).fontSize) || 12;
      s.dataset.hbFs = '1';
      // smaller, a step at a time (measured each time: letter spacing and fonts do not scale exactly), down to 78%
      let k = Math.max(0.78, Math.min(1, (n.room - 1) / n.w));
      for (let i = 0; i < 6; i++) { s.style.fontSize = (fs * k).toFixed(2) + 'px'; if (!bad(s) || k <= 0.78) break; k = Math.max(0.78, k - 0.04); }
      if (bad(s)) s.style.letterSpacing = '-0.03em';
      // still too long (de «Remis anbieten», fr «Proposer nulle» …): two lines, split between words — only for the menu
      // buttons (the bottom tabs keep one line) and only when the name has a space
      if (bad(s) && controls.contains(s) && /\s/.test(s.textContent.trim())) {
        Object.assign(s.style, { fontSize: (fs * 0.86).toFixed(2) + 'px', letterSpacing: '-0.02em', whiteSpace: 'normal', lineHeight: '1.02', textOverflow: 'clip', textAlign: 'center', overflowWrap: 'normal' });
        if (bad(s)) s.style.fontSize = (fs * 0.78).toFixed(2) + 'px';
      }
      // one long word (fr «Abandonner» in a narrow button): a little smaller still, down to 70%
      for (let k2 = 0.74; bad(s) && k2 >= 0.70; k2 -= 0.04) s.style.fontSize = (fs * k2).toFixed(2) + 'px';
    }
    mo.takeRecords();
  };
  const later = () => { if (!q) q = requestAnimationFrame(run); };
  const mo = new MutationObserver(later);
  mo.observe(controls, { childList: true, subtree: true, characterData: true });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  setTimeout(later, 600); setTimeout(later, 2000);   // (the bottom tabs are made a little later)
  // a button that appears or changes size without a change inside the menu (the draw offer, shown by a class on body)
  if (window.ResizeObserver) { const ro = new ResizeObserver(later), all = () => { ro.disconnect(); for (const b of controls.children) ro.observe(b); }; all(); new MutationObserver(all).observe(controls, { childList: true }); }
  window.addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  window.addEventListener('load', later);
  later();
}
// the PC bar fitted to the window (2026-11-07): long languages (de / fr / ru / id / tr …) made the menu run off the right edge
// and squeezed the info (turn, move, evaluation) to nothing. Measured on every change, the bar steps down only as far as needed:
// tighter spacing → the language button shows its code → menu buttons show their icon only (from the last one: lessons /
// draw offer / puzzles before new / undo). The title / logo is left as it is (its design is fixed, 2026-11-07). The info keeps
// room for its first two chips; chips that still do not fit are left out whole from the end (never cut in half), the first
// one alone shrinks with … as the very last resort.
function fitBar(bar, info, getMenu, isOn) {
  let q = 0;
  const shown = e => !!(e && e.getClientRects().length);
  const chipW = c => Math.max(c.getBoundingClientRect().width, c.scrollWidth);
  // how far anything in the bar runs past its edges (px)
  const over = () => {
    const br = bar.getBoundingClientRect(); let m = 0;
    for (const el of [bar.querySelector('.hb-title'), getMenu(), bar.querySelector('.hb-icons')]) {
      if (!shown(el) || !bar.contains(el)) continue;
      const r = el.getBoundingClientRect(); m = Math.max(m, r.right - br.right, br.left - r.left);
    }
    return Math.max(m, bar.scrollWidth - bar.clientWidth);
  };
  const run = () => {
    q = 0; if (!isOn()) return;
    const menu = getMenu(), btns = menu ? [...menu.children] : [];
    bar.classList.remove('hb-t1', 'hb-lc');
    btns.forEach(b => { b.classList.remove('hb-ico'); if (b.dataset.hbAl) { b.removeAttribute('aria-label'); delete b.dataset.hbAl; } if (b.dataset.hbT) { b.removeAttribute('title'); delete b.dataset.hbT; } });
    const chips = [...info.children];
    chips.forEach(c => c.classList.remove('hb-cut', 'hb-shrink'));
    // the room the info wants: all its chips (the game's optional ones — .opt — aside), at most 30% of the bar but always its
    // first two (or a short text)
    const vc = chips.filter(shown), gap = parseFloat(getComputedStyle(info).columnGap) || 0;
    let want = 0, least = 0, two = 0;
    if (vc.length) {
      const sum = list => list.reduce((s, c, i) => s + chipW(c) + (i ? gap : 0), 0);
      const main = vc.filter(c => !c.classList.contains('opt'));
      want = Math.max(sum(vc.slice(0, 2)), Math.min(sum(main.length ? main : vc), bar.clientWidth * 0.3));
      least = sum(vc.slice(0, 1)); two = Math.min(want, sum(vc.slice(0, 2)));
    } else if (info.textContent.trim()) want = least = two = Math.min(info.scrollWidth, 200);
    const ok = () => over() <= 1 && info.clientWidth + 1 >= want;
    if (!ok()) {
      // a menu button can show its icon only when it has an icon and its name in a span (the name moves to title / aria-label)
      const ico = btns.filter(b => shown(b) && b.querySelector(':scope > svg, :scope > img, :scope > i') && b.querySelector(':scope > span') && b.querySelector(':scope > span').textContent.trim() && getComputedStyle(b.querySelector(':scope > span')).display !== 'none').reverse();
      // (before a button loses its name, the info settles for its first two chips; before one of the main four — new / undo /
      //  resign / hint — does, for its first chip alone — the turn —; the chips left over are left out whole below)
      const toIco = b => () => { const s = b.querySelector(':scope > span').textContent.trim(); if (!b.title) { b.title = s; b.dataset.hbT = '1'; } if (!b.getAttribute('aria-label')) { b.setAttribute('aria-label', s); b.dataset.hbAl = '1'; } b.classList.add('hb-ico'); };
      const main4 = btns.filter(shown).slice(0, 4);
      // (Japanese: the bar at 1280 px stays as it was designed — the info gives up its extra chips first, before the spacing,
      //  the language button or a menu button changes)
      const ja = (document.documentElement.lang || 'ja') === 'ja';
      const steps = (ja ? [() => { want = least; }] : []).concat([() => bar.classList.add('hb-t1'), () => bar.classList.add('hb-lc'), () => { want = Math.max(ja ? least : 0, Math.min(want, two)); }])
        .concat(ico.filter(b => !main4.includes(b)).map(toIco), [() => { want = least; }], ico.filter(b => main4.includes(b)).map(toIco));
      for (const st of steps) { st(); if (ok()) break; }
    }
    // chips that still do not fit: left out whole, from the end; the first one alone shrinks
    // (measured on the chips' own edges, not scrollWidth: a chip may end a fraction of a pixel past the info and be clipped)
    let left = chips.filter(shown);
    const spill = () => { if (info.scrollWidth > info.clientWidth + 1) return true; const ir = info.getBoundingClientRect(); return left.some(c => { const r = c.getBoundingClientRect(); return r.right > ir.right + 0.5 || r.left < ir.left - 0.5; }); };
    while (left.length > 1 && spill()) left.pop().classList.add('hb-cut');
    if (left.length && spill()) left[0].classList.add('hb-shrink');
    mos.forEach(m => m.takeRecords());   // (our own class changes are not changes to react to)
  };
  const later = () => { if (!q) q = requestAnimationFrame(run); };
  const mos = [];
  const watch = (el, opt) => { if (!el) return; const m = new MutationObserver(later); m.observe(el, opt); mos.push(m); };
  watch(info, { childList: true, subtree: true, characterData: true });
  // (attribute changes only where they change a size: a class toggled with the same value — a clock ticking — is skipped)
  { const m = new MutationObserver(ms => { if (ms.some(x => x.type !== 'attributes' || x.oldValue !== x.target.getAttribute(x.attributeName))) later(); });
    m.observe(bar, { childList: true, subtree: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'hidden', 'style'] }); mos.push(m); }
  watch(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
  window.addEventListener('resize', later);
  // (sizes that change without a mutation in the bar: web fonts, the game's own media queries)
  if (window.ResizeObserver) { let lw = -1; new ResizeObserver(() => { const w = bar.clientWidth; if (w !== lw) { lw = w; later(); } }).observe(bar); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  window.addEventListener('load', later);
  later();
}
// Online dock (common spec): when the dock at the bottom is opened on PC, the page content (.app: board + info) scrolls up
// smoothly so that it sits centred between the header bar and the top of the opened dock; closing scrolls it back.
// If it is taller than that space, the game is laid out smaller first (its --vh, which every game sizes the board and the
// info column from) so nothing hides under the header or the dock. position:relative + top (not transform), so the board's
// pointer maths and fixed dialogs keep working (a translate / scale only for the 260 ms of the move itself, see flip).
function dockCenter() {
  const app = document.querySelector('.app'), dock = document.getElementById('dock') || document.querySelector('.dock');
  if (!app || !dock) { if (!dockCenter.tried) { dockCenter.tried = 1; setTimeout(dockCenter, 1500); } return; }
  const root = document.documentElement, M = 10;   // M: breathing room above / below the content
  // D: how long the board takes to move / resize — together with the dock (its panel's height: .25s ease) (2026-11-01)
  // (common spec: animations are not left out for prefers-reduced-motion)
  const D = 260;
  if (getComputedStyle(app).position === 'static') app.style.position = 'relative';
  app.style.top = '0px';
  let cur = 0, own = 0, fitted = false, rt = 0;
  const isOpen = () => { const ds = getComputedStyle(dock); return document.body.classList.contains('dock-open') && ds.display !== 'none' && ds.position === 'fixed'; };
  const shift = () => -(parseFloat(getComputedStyle(app).top) || 0);   // the shift right now (mid-transition too)
  const bounds = () => {   // the visible content of .app (its children), as if not shifted
    let t = Infinity, b = -Infinity;
    const walk = list => { for (const c of list) { const cs = getComputedStyle(c); if (cs.display === 'contents') { walk(c.children); continue; }   // (mancala PC: .side / .side-in are display:contents — their cards are the info row)
      if (cs.display === 'none' || cs.position === 'fixed' || cs.visibility === 'hidden') continue; const r = c.getBoundingClientRect(); if (r.height < 2) continue; t = Math.min(t, r.top); b = Math.max(b, r.bottom); } };
    walk(app.children);
    if (t === Infinity) return null;
    // a review box fixed right under the board and the info column (connect4 / dots / morris rvbox.js: placed 16px below them)
    const fb = document.querySelector('body > .rbox'); if (fb && fb.getClientRects().length && getComputedStyle(fb).position === 'fixed') b += 16 + fb.offsetHeight;
    const now = shift(); return [t + now, b + now];
  };
  const region = () => {
    const bar = [...document.querySelectorAll('header.hb, .atlas-top')].find(b => b.getClientRects().length), br = bar ? bar.getBoundingClientRect() : null;   // (fixed: no offsetParent; portal: the game's own bar is hidden, use the portal's)
    return [br && br.height ? br.bottom : 0, dock.getBoundingClientRect().top];
  };
  // the dock's opening / closing animation, run to its end for a moment (within one task: nothing is painted), so the space it
  // will leave is known right away and the board can move together with the dock instead of after it; returns the undo
  const ffDock = () => {
    const an = (dock.getAnimations ? dock.getAnimations({ subtree: true }) : []).filter(a => { try { const e = a.effect && a.effect.getComputedTiming().endTime; return a.playState !== 'finished' && isFinite(e) && e > 0; } catch (e) { return false; } });
    const was = an.map(a => a.currentTime);
    an.forEach(a => { try { a.currentTime = a.effect.getComputedTiming().endTime - 0.01; } catch (e) {} });
    return () => an.forEach((a, i) => { try { a.currentTime = was[i]; } catch (e) {} });
  };
  const vhPx = () => { const pr = document.createElement('div'); pr.style.cssText = 'position:absolute;visibility:hidden;height:var(--vh)'; app.appendChild(pr); const h = pr.getBoundingClientRect().height; pr.remove(); return h; };
  // (dockrelayout: listeners that must follow at once, within the probe — the 3D skins' info column fitted to the board)
  // (final: the FLIP's end — the 3D table draws its crisp picture in that same task)
  const relayout = final => { own++; window.dispatchEvent(new Event('resize')); window.dispatchEvent(new CustomEvent('dockrelayout', { detail: { final: final === true } })); setTimeout(() => own--, 0); };
  // the reduction R is applied as --vh (an !important rule on <html> and <body>: some games re-declare --vh on body or rewrite
  // the inline value on resize) and as DockFit.extra for games that size the board in JS
  let R = 0, base = 0, lastStep = 0;
  const css = document.createElement('style'); css.id = 'dockFitCss'; document.head.appendChild(css);
  const cmp = document.createElement('style'); cmp.id = 'dockCompactCss';
  // (the record is never hidden — common spec 2026-11-04: its box gets lower instead; the coach box gets lower too and scrolls)
  cmp.textContent = `html.dock-compact .side .info-line, html.dock-compact .side #graph, html.dock-compact .side .pl-info{display:none!important}
html.dock-compact:not(.side-col) .side, html.dock-compact:not(.side-col) .side .side-in{height:auto!important;max-height:none!important}
html.dock-compact.side-col .side .side-in > .kifu-card{flex:1 1 0!important;min-height:72px!important}
html.dock-compact.side-col .side .side-in > .kifu-card .kifu{min-height:0!important}
html.dock-compact.side-col .side .side-in > #coachCard:not(.hidden):not(.ck-off){flex:2 1 0!important;min-height:96px!important;overflow-y:auto!important}
html.dock-compact.side-col .side .side-in > .review-card.show{flex:1.3 1 0!important;min-height:96px!important}
html.dock-compact .side .card{padding-top:9px!important;padding-bottom:9px!important}
html.dock-compact .side .players .player{padding-top:8px!important;padding-bottom:8px!important}
html.dock-compact .side .players .count, html.dock-compact .side .players .count > span:first-child, html.dock-compact .side .players [id^=pip]{font-size:20px!important;line-height:1.1!important}
html.dock-compact .side .players .status:not(.low){display:none!important}
html.dock-compact .side .players .count{margin-top:2px!important}
html.dock-compact .side #evalCard{min-height:0!important;height:auto!important;flex:none!important}
html.dock-compact .side #evalCard .evalbar{margin-top:6px!important}
html.dock-compact .side #evalCard .navbar{margin-top:8px!important}
html.dock-rvb .app > :is(.side, .side-r){align-self:stretch!important;height:0!important;min-height:100%!important;max-height:none!important;overflow-y:auto!important;scrollbar-width:thin}
html.dock-rvb .app > :is(.side, .side-r) > .side-in{min-height:0!important}`;
  document.head.appendChild(cmp);
  // (with the review box under the board, the box may also get lower: down to 140px instead of the games' 170px)
  const apply = () => { css.textContent = R ? `html.dock-fit:not(#_), html.dock-fit:not(#_) body{--vh:${Math.max(root.classList.contains('dock-rvb') ? 150 : 240, Math.floor(base - R))}px !important}
html.dock-fit.dock-rvb:not(#_), html.dock-fit.dock-rvb:not(#_) body{--rvbh:clamp(140px, calc(var(--vh) * .28), 250px) !important;--rbh:clamp(140px, calc(var(--vh) * .27), 240px) !important;--bxh:clamp(140px, calc(var(--vh) * .28), 250px) !important}` : ''; window.DockFit.extra = R; root.classList.toggle('dock-fit', R > 0); relayout(); };
  // a review box (rvbox.js / rbox.js / the games' own) under the board and the info column
  const boxOn = () => [...document.querySelectorAll('.app > #rvBox, .app > .rvbox, .app > .rbox, body > .rbox')].some(b => b.getClientRects().length);
  window.DockFit = { extra: 0 };
  // back to the full layout at once (only inside a probe, or when nothing is shown in between)
  const reset = () => { root.classList.remove('dock-compact', 'dock-rvb'); fitted = false; R = 0; apply(); };
  // (games may redraw their board a moment after a resize, so each pass of the refine waits before measuring again; the
  // probe does not wait at all — it runs within one task, so none of its passes is ever painted)
  let sync = false;
  const wait = ms => sync ? null : new Promise(r => setTimeout(r, ms));
  // a step can overshoot (the review box gets lower too, the board snaps to whole sizes): give back what is left over
  // (a step that went too far — the board and the review box under it both grow with --vh — is halved, not given up)
  const loosen = async my => {
    let step = 0;
    for (let k = 0; k < 7 && R > 0; k++) {
      const [top, bot] = region(), u = bounds(); if (!u || my !== gen) return;
      const slack = (bot - top - 2 * M) - (u[1] - u[0]); if (slack < 12) return;
      step = step ? Math.min(step, Math.floor(slack) - 4) : Math.floor(slack) - 4; if (step < 6) return;
      const keep = R; R = Math.max(0, R - step); apply(); await wait(180); if (my !== gen) return;
      const [t2, b2] = region(), u2 = bounds(); if (!u2) return;
      if (u2[1] - u2[0] > b2 - t2 - 2 * M + 1) { R = keep; apply(); await wait(180); step = Math.floor(step / 2); }   // too far: back, and try half as much
      else step = 0;
    }
  };
  // too tall for the space between the header and the dock: lay the game out smaller (a few passes: not everything scales with --vh)
  const fit = async my => {
    let prev = Infinity, good = R, stall = 0;
    for (let k = 0; k < 10; k++) {
      const [top, bot] = region(), room = bot - top - 2 * M, u = bounds(); if (!u || my !== gen) return;
      const h = u[1] - u[0], over = h - room; if (over <= 4) { if (k || R > 0) await loosen(my); return; }   // (also at once: a refine finding the layout came out smaller than the probe thought — a JS-sized board redrawn later — gives the room back)   // (a few px into the margin M is fine)
      // a step that did not make it smaller (the board is limited by the width, or the layout is at its minimum): try a
      // larger one; after three in a row, go back to the last size that helped and stop
      if (h < prev - 1) { good = R; stall = 0; prev = h; } else if (++stall >= 3) { R = good; apply(); await wait(120); return; }
      if (!fitted) { base = vhPx(); if (!base) return; }
      if (R > base) { R = good; apply(); await wait(120); return; }   // (--vh itself never goes below 240px (150px with a review box); DockFit.extra may keep growing for JS-sized boards)
      fitted = true; lastStep = Math.ceil(over) + 1 + (stall ? Math.round(base * .08 * stall) : 0); R += lastStep; apply();
      await wait(180);
    }
  };
  // the whole fitting: the review box mode, the size, the compact info column
  const layout = async my => {
    // with the review box, the info column takes the height of the board's row (and scrolls) instead of making the row taller
    if (boxOn() !== root.classList.contains('dock-rvb')) { root.classList.toggle('dock-rvb'); R = 0; apply(); await wait(150); if (my !== gen || !isOpen()) return; }
    await fit(my); if (my !== gen || !isOpen()) return;
    // the info column too short for its cards: compact it (players smaller, graph / record / info line hidden — the
    // evaluation bar and the ◀ ▶ navigation stay), like the phone layout
    const sd = document.querySelector('.app .side');
    const ub = bounds(), rg = region(), still = ub && (ub[1] - ub[0]) > rg[1] - rg[0] - 2 * M + 2;   // still too tall after fitting
    if (sd && !root.classList.contains('dock-compact') && (still || sd.scrollHeight > sd.clientHeight + 4 || [...(sd.querySelector('.side-in') || sd).children].some(c => c.getClientRects().length && c.getBoundingClientRect().bottom > sd.getBoundingClientRect().bottom + 4))) { root.classList.add('dock-compact'); R = 0; apply(); await wait(150); if (my !== gen || !isOpen()) return; await fit(my); }   // compact first, then fit again from the full size
  };
  // the shift that centres the content (as laid out now) between the header and the dock
  const delta = () => {
    const [top, bot] = region(), u = bounds(); if (!u) return null;
    let d = Math.round((u[0] + u[1]) / 2 - (top + bot) / 2);   // (may be negative: a smaller layout is moved down to the middle)
    if (u[1] - u[0] > bot - top - 2 * M) d = Math.round(u[0] - top - M);   // still taller than the space: keep its top under the header
    return d;
  };
  // (the 3D pages that place the board group themselves between the bar and the dock — atlas/skin/common.js pcFit — are not
  // shifted on top of that: two centrings corrected each other once the move was over)
  const selfPlaced = () => { try { return !!(window.__atlasPcFit && window.__atlasPcFit.on()); } catch (e) { return false; } };
  const moveTo = d => { if (d != null && selfPlaced()) d = 0; if (d != null && d !== cur) { cur = d; app.style.top = -d + 'px'; } };
  // the move / resize is shown with FLIP (2026-11-04): the final layout is set at once (one real resize: --vh, the 3D canvas,
  // the info column), then each child of .app is drawn from where it was to where it is now with a compositor animation of
  // translate + scale — no layout, no canvas resize and no 3D redraw per frame (writing --vh every frame made the 3D pages stutter).
  // html.dock-anim is on meanwhile: the 3D table skips its redraws and the skins their re-measuring; one resize at the end.
  // the boxes that move: the children of .app — through display:contents (mancala PC: .side / .side-in are contents, their
  // cards are the boxes; they jumped before, as nothing animated them)
  const shown = c => { if (!c.getClientRects().length) return false; const cs = getComputedStyle(c); return cs.display !== 'none' && cs.position !== 'fixed'; };
  const kids = () => { const out = []; const walk = list => { for (const c of list) { if (getComputedStyle(c).display === 'contents') { walk(c.children); continue; } if (shown(c)) out.push(c); } }; walk(app.children); return out; };
  // each child with the part that has to stay exact: the 3D canvas (#atlasGL) in the board's column — parts beside the board
  // that do not scale with it (labels, komadai) would otherwise put the board itself a little off while it moves
  const keyOf = c => { const g = c.querySelector('#atlasGL'); return g && g.getClientRects().length ? g : c; };
  // where each box is (as seen: a running FLIP included, so a new one starts from there) — and its children and grandchildren
  // too, so a box that becomes one of the moving ones only now (the layout switched: a column becomes display:contents, or
  // the reverse) still has its place before the change
  const snap = () => {
    const m = new Map();
    for (const c of kids()) { const k = keyOf(c); m.set(c, { r: k.getBoundingClientRect(), k });
      for (const d of c.children) { if (shown(d) && !m.has(d)) m.set(d, { r: d.getBoundingClientRect(), k: d }); for (const e of d.children) if (shown(e) && !m.has(e)) m.set(e, { r: e.getBoundingClientRect(), k: e }); } }
    return m;
  };
  let flips = [], flipT = 0, watch = null;
  const dockDone = () => Promise.all((dock.getAnimations ? dock.getAnimations({ subtree: true }) : []).map(a => a.finished.catch(() => 0)));
  const stopFlips = () => { flips.forEach(a => { try { a.cancel(); } catch (e) {} }); flips = []; clearTimeout(flipT); root.classList.remove('dock-anim'); };
  const flip = (before, dur = D, chained = false) => {
    stopFlips();
    // (a box that was not one before — a column that was display:contents and now holds its cards — moves as its cards:
    // each of them from where it was)
    const targets = [];
    for (const c of kids()) {
      if (before.has(c)) { targets.push(c); continue; }
      for (const d of c.children) { if (!shown(d)) continue; if (before.has(d)) { targets.push(d); continue; } for (const e of d.children) if (shown(e) && before.has(e)) targets.push(e); }
    }
    for (const c of targets) {
      const e = before.get(c); if (!e) continue;
      let { r: b, k } = e; if (!k.isConnected || !k.getClientRects().length || !c.contains(k)) k = c;
      const a = k.getBoundingClientRect(), cr = c.getBoundingClientRect(); if (a.width < 2 || b.width < 2) continue;
      // translate + scale about the child's centre, so that its key part lands on where it was
      const s = b.width / a.width, cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      // (the board — keyed on its 3D canvas — by its centre; any other box by its top edge: a column that gets taller or
      // shorter (the compact info column, cards that change from a row to a column) keeps its top cards where they were)
      const dx = (b.left + b.width / 2) - cx - s * (a.left + a.width / 2 - cx), dy = k !== c ? (b.top + b.height / 2) - cy - s * (a.top + a.height / 2 - cy) : b.top - cy - s * (a.top - cy);
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(s - 1) < .002) continue;
      try { flips.push(c.animate([{ translate: `${dx}px ${dy}px`, scale: `${s}` }, { translate: '0px 0px', scale: '1' }], { duration: dur, easing: 'ease' })); } catch (e) {}
    }
    if (!flips.length) return Promise.resolve();
    root.classList.add('dock-anim');
    const mine = flips;
    // the end (all finished, or at the latest 4 s — a busy page may start them late, a hidden tab never runs them): everything measures the final place once
    return new Promise(res => {
      const end = () => { if (flips !== mine) return res(); clearTimeout(flipT); mine.forEach(a => { try { a.cancel(); } catch (e) {} }); flips = []; let last = snap(); root.classList.remove('dock-anim'); relayout(true); res(); after(last, chained); };
      // (and the dock's own animation: whatever measures the space above it then sees its final place)
      Promise.all(mine.map(a => a.finished).concat(dockDone())).then(end, end); flipT = setTimeout(end, 4000);
    });
  };
  // for a moment after the end: the final layout pass (and a game that lays its board out again a little later — go redraws
  // after a resize; the 3D pages re-centre the board group) can still move or resize the board a few px — each such change is
  // shown as a short move too, not as a jump (checked every frame before it is painted, for 1.2 s)
  // (one window per open / close: a move shown from inside the watch does not open a new one — a page whose layout kept
  // changing after every relayout (two fits taking turns) was otherwise moved again and again, forever)
  let afterT0 = 0;
  const after = (last, chained) => {
    if (watch) watch(); const t0 = chained ? afterT0 : (afterT0 = performance.now()); let raf = 0, stop = false;
    const moved = now => kids().some(c => { const o = last.get(c), n = now.get(c); return o && n && (Math.abs(o.r.width - n.r.width) > 1 || Math.abs(o.r.top - n.r.top) > 1 || Math.abs(o.r.left - n.r.left) > 1); });
    const tick = () => {
      if (stop) return;
      if (performance.now() - t0 > 1200) { watch = null; return; }
      if (!flips.length) { const now = snap(); if (moved(now)) { const b = last; last = now; flip(b, 180, true); } }
      raf = requestAnimationFrame(tick);
    };
    watch = () => { stop = true; cancelAnimationFrame(raf); watch = null; };
    tick();   // (at once too: the final layout pass has just run)
  };
  // the place of everything right before the dock is opened / closed: a page that switches its layout with the dock's class
  // (mancala: the info cards from under the board to a column beside it) has already done so when settle runs — so the
  // boxes are measured when the click on the dock arrives, before its own handler changes the class
  let pre = null;
  document.addEventListener('click', e => { if (dock.contains(e.target) && !flips.length) pre = { t: performance.now(), m: snap() }; }, true);
  let gen = 0;
  const settle = async () => {
    const my = ++gen;
    if (watch) watch();
    const before = pre && performance.now() - pre.t < 400 ? pre.m : snap(); pre = null; stopFlips();
    if (!isOpen()) {   // closed: back to the full size while it scrolls back
      // (laid out for the dock's final place, like the probe: the dock animation run to its end for a moment)
      const undo = ffDock(); sync = true;
      try { if (fitted || root.classList.contains('dock-compact') || root.classList.contains('dock-rvb')) { root.classList.remove('dock-compact', 'dock-rvb'); fitted = false; R = 0; apply(); } else relayout(); }
      finally { sync = false; undo(); }
      moveTo(0); flip(before);
      return;
    }
    // probe: the final layout for the dock's final place, worked out without painting (dock animation run to its end,
    // every pass without waiting); it stays, and is shown with the FLIP from what was on screen
    const undo = ffDock(); let d = null, rg = null, hp = 0;
    sync = true;
    try { reset(); await layout(my); d = delta(); rg = region(); const u = bounds(); hp = u ? u[1] - u[0] : 0; } finally { sync = false; undo(); }
    if (my !== gen) return;
    fitted = R > 0;
    moveTo(d); await flip(before);
    // refine (boards a game redraws a moment after a resize): only when the content did not come out as the probe found it —
    // once the dock's own animation is over too (on a slow machine it may still be sliding), so the space is the final one
    await Promise.race([dockDone(), new Promise(r => setTimeout(r, 2000))]);
    await new Promise(r => setTimeout(r, 80)); if (my !== gen || !isOpen()) return;
    const b0 = snap();   // (what the refine changes is shown as a short move too)
    const u = bounds(); if (u && Math.abs(u[1] - u[0] - hp) > 2) { await fit(my); if (my !== gen || !isOpen()) return; }   // (with waits: boards a game sizes in JS after a resize have to be redrawn between the steps — connect4 came out far too small)
    moveTo(delta()); flip(b0, 180);
    // the dock (or the header) ended up elsewhere than expected: settle again
    setTimeout(() => { if (my !== gen || !isOpen()) return; const [t2, b2] = region();
      if (rg && (Math.abs(b2 - rg[1]) > 2 || Math.abs(t2 - rg[0]) > 2)) settle(); else moveTo(delta()); }, 300);
  };
  let wasOpen = isOpen(), wasBox = boxOn();
  // the dock opened / closed, or (while it is open) the review box came or went: settle again
  const mo = () => { if (sync) return; const o = isOpen(), b = o && boxOn(); if (o !== wasOpen) { wasOpen = o; wasBox = b; settle(); } else if (o && b !== wasBox) { wasBox = b; clearTimeout(rt); rt = setTimeout(() => { if (isOpen()) settle(); }, 150); } };
  new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(mo).observe(root, { attributes: true, attributeFilter: ['class'] });
  let ws = innerWidth + 'x' + innerHeight;
  window.addEventListener('resize', () => { const w = innerWidth + 'x' + innerHeight; if (own || w === ws) return; ws = w; clearTimeout(rt);   // only real window resizes (games also dispatch resize themselves)
    rt = setTimeout(() => { if (isOpen()) settle(); }, 150); });
}
// a draw-offer button in the top menu (PC header / phone) leaves no room: the puzzle button is left out of the header then (common spec)
function drawNoPuzzle() {
  const upd = () => {
    const d = document.getElementById('btnDraw'), p = document.querySelector('#btnPuzzle, #btnTsume');
    if (!p) return;
    if (!d || d.parentElement !== p.parentElement) { if (p.classList.contains('hb-skip')) p.classList.remove('hb-skip'); return; }   // same button row (PC header menu or phone top menu)   // (only when set: classList.remove always rewrites the attribute — a mutation — and this observer then ran again every frame)
    const on = !!(d && getComputedStyle(d).display !== 'none' && !d.classList.contains('hidden'));
    p.classList.toggle('hb-skip', on);
  };
  if (!document.getElementById('hbSkipCss')) { const st = document.createElement('style'); st.id = 'hbSkipCss'; st.textContent = '.hb-skip{display:none!important}'; document.head.appendChild(st); }
  let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; upd(); }); };
  // (an attribute written again with the same value — a clock re-setting its class each tick — changes nothing: no frame for it)
  new MutationObserver(ms => { if (ms.some(m => m.oldValue !== m.target.getAttribute(m.attributeName))) later(); }).observe(document.body, { attributes: true, attributeOldValue: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
  window.addEventListener('resize', later); upd();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(drawNoPuzzle, 0)); else setTimeout(drawNoPuzzle, 0);
// html.side-col: the info column (.side) stands beside the board (not stacked under it) — the compact player cards use it
function sideCol() {
  const side = document.querySelector('.app .side'), app = document.querySelector('.app'); if (!side || !app) return;
  const upd = () => {
    const sr = side.getBoundingClientRect(), others = [...app.children].filter(c => c !== side && c.getClientRects().length && getComputedStyle(c).position !== 'fixed');
    const beside = sr.width > 0 && others.some(c => { const r = c.getBoundingClientRect(); return r.width > 40 && (sr.left >= r.right - 4 || sr.right <= r.left + 4) && sr.top < r.bottom && sr.bottom > r.top; });
    document.documentElement.classList.toggle('side-col', beside);
  };
  upd(); setTimeout(upd, 300); setTimeout(upd, 1500);
  let t = 0; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(upd, 80); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(sideCol, 0)); else setTimeout(sideCol, 0);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(dockCenter, 0)); else setTimeout(dockCenter, 0);
// the info line (盤の大きさ・ルール・AI・←→ の案内…) sits at the bottom inside the kifu box, and never breaks inside a part:
// its parts (split at ·) wrap as whole pieces onto a second row when the line is too long (common spec, 2026-11-06)
// the info column (PC, beside the board) must never run past its bottom (= the board's bottom): when its cards do not fit
// (the review card and the record sharing a column made short by the review box under the board, the online panel…),
// html.side-tight lets the review card / record / coach give way (they scroll inside) and lowers the graph; html.side-tighter
// also hides the graph and the players' extra line; html.side-tightest (still too tall) lets the column scroll. Measured on every layout change, so it only steps in where needed (2026-11-06)
// the review box under the board / in the info column must always be closable the same way: where the review card (with its
// 閉じる) is not shown (fanorona's wide layout, backgammon), the box gets the same 閉じる at its top right (2026-11-06)
function rvCloseInBox() {
  if (!document.getElementById('rvcbCss')) { const st = document.createElement('style'); st.id = 'rvcbCss';
    st.textContent = '.rvcb{position:absolute;top:8px;inset-inline-end:12px;z-index:5;border:0;background:none;padding:2px 4px;font:inherit;font-size:13px;letter-spacing:.04em;color:var(--muted,#9a9184);cursor:pointer}.rvcb:hover{color:var(--text,#eee)}.rvcb[hidden]{display:none}.rvb-rh .rvb-t{white-space:normal!important;min-width:0;line-height:1.35}.rvcb.inrow{position:static;flex:none;align-self:stretch;display:inline-flex;align-items:center;padding:0 12px;border:1px solid var(--line,rgba(128,128,128,.35));border-radius:8px;font-size:12.5px;font-weight:700;background:rgba(127,127,127,.06)}.rvcb.inrow[hidden]{display:none}';
    document.head.appendChild(st); }
  let q = 0;
  const run = () => { q = 0;
    const close = document.getElementById('rvClose'); if (!close) return;
    const shown = e => !!(e && e.getClientRects().length && e.getBoundingClientRect().height > 2);
    const own = shown(close);
    document.querySelectorAll('.app .rvbox, .app .rbox, body > .rbox').forEach(box => {
      let b = box.querySelector(':scope > .rvcb, :scope > .rvb-top > .rvcb, :scope > .rb-top > .rvcb');
      const want = !own && shown(box);
      if (!want) { if (b && !b.hidden) b.hidden = true; box.querySelectorAll('[data-rvcb-pad]').forEach(e => { e.style.marginInlineEnd = ''; e.removeAttribute('data-rvcb-pad'); }); return; }
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'rvcb'; b.onclick = e => { e.stopPropagation(); const c = document.getElementById('rvClose'); if (c) c.click(); }; const top = box.querySelector(':scope > .rvb-top, :scope > .rb-top');
        if (top) { b.classList.add('inrow'); top.appendChild(b); } else { if (getComputedStyle(box).position === 'static') box.style.position = 'relative'; box.prepend(b); } }
      const tx = close.textContent.trim(); if (b.textContent !== tx) b.textContent = tx; if (b.title !== (close.title || tx)) b.title = close.title || tx; if (b.hidden) b.hidden = false;   // (only real changes: this runs from a MutationObserver)
      // the box's own top-right buttons (検討する…) must not sit under the 閉じる: their row moves left by its width (2026-11-07)
      const r = b.getBoundingClientRect();
      if (r.width && !b.classList.contains('inrow')) box.querySelectorAll('button').forEach(x => { if (x === b || x.closest('[data-rvcb-pad]')) return; const q = x.getBoundingClientRect();
        if (q.width && q.top < r.bottom && q.bottom > r.top && q.left < r.right && q.right > r.left) { const row = x.parentElement === box ? x : x.parentElement; row.setAttribute('data-rvcb-pad', ''); row.style.marginInlineEnd = (r.width + 10) + 'px'; } });
    });
  };
  const later = () => { if (!q) q = requestAnimationFrame(run); };
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', later); later();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(rvCloseInBox, 0)); else setTimeout(rvCloseInBox, 0);
function sideTight() {
  const root = document.documentElement;
  if (!document.getElementById('sideTightCss')) {
    const st = document.createElement('style'); st.id = 'sideTightCss';
    const F = 'html.side-tight .app > .side .side-in > ';
    st.textContent = F + ':is(.review-card.show, .kifu-card, #coachCard:not(.hidden)){flex:1 1 0!important;min-height:64px!important;max-height:none!important;height:auto!important;overflow-y:auto!important}'
      + F + '.kifu-card{display:flex!important;flex-direction:column!important;overflow:hidden!important}' + F + '.kifu-card > .kifu{flex:1 1 0!important;min-height:0!important;max-height:none!important;height:auto!important;overflow-y:auto!important}'
      + 'html.side-tight .app > .side :is(#evalCard, #progCard) .graph, html.side-tight .app > .side #graph{height:28px!important;min-height:0!important;max-height:28px!important}'
      + 'html.side-tighter .app > .side :is(#evalCard, #progCard) .graph, html.side-tighter .app > .side #graph, html.side-tighter .app > .side .pl-info{display:none!important}'
      + 'html.side-tight .app > .side .side-in{min-height:0!important}'
      + 'html.side-tightest .app > .side{overflow-y:auto!important;overscroll-behavior:contain;scrollbar-width:thin}';   // (a very short column: it scrolls, nothing is drawn past its edge)
    document.head.appendChild(st);
  }
  const over = () => {
    const sd = document.querySelector('.app > .side'); if (!sd || !root.classList.contains('side-col') || !sd.getClientRects().length) return 0;
    const si = sd.querySelector('.side-in') || sd, sb = sd.getBoundingClientRect().bottom; let m = 0;
    for (const c of si.children) { if (!c.getClientRects().length) continue; const r = c.getBoundingClientRect(); if (r.height >= 2) m = Math.max(m, r.bottom - sb); }
    return m;
  };
  let q = 0, busy = false;
  const run = () => {
    q = 0; busy = true;
    try { root.classList.remove('side-tight', 'side-tighter', 'side-tightest'); if (over() > 1) { root.classList.add('side-tight'); if (over() > 1) { root.classList.add('side-tighter'); if (over() > 1) root.classList.add('side-tightest'); } } }
    finally { setTimeout(() => { busy = false; }, 0); }
  };
  const later = () => { if (!busy && !q) q = requestAnimationFrame(run); };
  const mo = new MutationObserver(ms => { if (ms.some(m => m.attributeName !== 'class' || !/\bside-tight/.test((m.oldValue || '') + ' ' + m.target.className))) later(); });
  mo.observe(root, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const sd = document.querySelector('.app > .side .side-in, .app > .side');
  if (sd) new MutationObserver(later).observe(sd, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  // (and any card that changes its height on its own — text filled in later, a graph drawn: watched with a ResizeObserver)
  if (sd && window.ResizeObserver) { const ro = new ResizeObserver(later), watchAll = () => { ro.disconnect(); ro.observe(sd); for (const c of sd.children) ro.observe(c); }; watchAll(); new MutationObserver(watchAll).observe(sd, { childList: true }); }
  window.addEventListener('resize', later);
  later();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(sideTight, 0)); else setTimeout(sideTight, 0);
function infoInKifu() {
  const el = document.getElementById('infoLine'); if (!el) return;
  const kc = el.closest('.kifu-card') || (el.previousElementSibling && el.previousElementSibling.classList.contains('kifu-card') ? el.previousElementSibling : document.querySelector('.kifu-card'));
  if (kc && el.parentElement !== kc) kc.appendChild(el);
  if (!document.getElementById('ilCss')) {
    const st = document.createElement('style'); st.id = 'ilCss';
    st.textContent = '.kifu-card > #infoLine{margin-top:auto;padding-top:8px;border-top:1px solid var(--line,rgba(127,127,127,.22));flex:none;min-width:0}'
      + '#infoLine .il-wrap{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;column-gap:.45em;row-gap:0}'
      + '#infoLine .il-seg{white-space:nowrap}#infoLine .il-dot{opacity:.55}'
      // the record box (PC, the info column beside the board): the same size in every game, clamp(110px, 44vh − 200px, 240px) — larger
      // than before but below the coach, the main box (2026-11-06). It may give way (down to 110px) when the column is short, and
      // the coach box gives way too (down to 120px, it scrolls), so nothing ever runs past the column. Only while playing: not with
      // the review card, the review box under the board (rb-on / rvb-on / rvbox-on / rv-on), lessons / puzzles or the online
      // panel's fitted layouts — there the games' own sizes apply. With the coach off, the record takes the rest of the column.
      + 'html.side-col:not(.dock-compact):not(.dock-rvb):not(:is(.rb-on,.rvb-on,.rvbox-on,.rv-on)):not(:has(body:is(.rb-on,.rvb-on,.rvbox-on,.rv-on,.in-lesson,.in-puzzle))) .side .side-in:not(:has(> .review-card.show)) > .kifu-card{flex:0 1 clamp(110px,calc(44vh - 200px),240px)!important;height:auto!important;min-height:min(110px,12vh)!important;max-height:none!important;display:flex!important;flex-direction:column!important;box-sizing:border-box}'
      + 'html.side-col:not(.dock-compact):not(.dock-rvb):not(:is(.rb-on,.rvb-on,.rvbox-on,.rv-on)):not(:has(body:is(.rb-on,.rvb-on,.rvbox-on,.rv-on,.in-lesson,.in-puzzle))) .side .side-in:not(:has(> .review-card.show)) > .kifu-card > .kifu{flex:1 1 0!important;min-height:0!important;max-height:none!important;height:auto!important;overflow-y:auto!important}'
      + 'html.side-col:not(.dock-compact):not(.dock-rvb):not(:is(.rb-on,.rvb-on,.rvbox-on,.rv-on)):not(:has(body:is(.rb-on,.rvb-on,.rvbox-on,.rv-on,.in-lesson,.in-puzzle))) .side .side-in:not(:has(> .review-card.show)):has(> #coachCard:not(.hidden):not(.ck-off)) > #coachCard{flex:1 1 0!important;min-height:min(120px,11vh)!important;max-height:none!important;height:auto!important;overflow-y:auto!important}'
      + 'html.side-col:not(.dock-compact):not(.dock-rvb):not(:is(.rb-on,.rvb-on,.rvbox-on,.rv-on)):not(:has(body:is(.rb-on,.rvb-on,.rvbox-on,.rv-on,.in-lesson,.in-puzzle))) .side .side-in:not(:has(> .review-card.show)):not(:has(> #coachCard:not(.hidden):not(.ck-off))) > .kifu-card{flex-grow:1!important}';
    document.head.appendChild(st);
  }
  const esc = x => x.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const seg = () => {
    const txt = el.textContent; if (el.dataset.ilt === txt) return;
    const parts = txt.split(/\s*[·・]\s+|\s+[·・]\s*/).map(x => x.trim()).filter(Boolean);
    el.innerHTML = parts.length ? '<span class="il-wrap">' + parts.map((x, i) => (i ? '<span class="il-dot">·</span>' : '') + '<span class="il-seg">' + esc(x) + '</span>').join('') + '</span>' : '';
    el.dataset.ilt = el.textContent; dots();
  };
  // a · where the line breaks is left out (no dot at the end of the first row)
  const dots = () => el.querySelectorAll('.il-dot').forEach(d => { d.style.display = ''; const a = d.previousElementSibling, b = d.nextElementSibling; if (a && b && b.offsetTop > a.offsetTop + 2) d.style.display = 'none'; });
  new MutationObserver(seg).observe(el, { childList: true, characterData: true, subtree: true });
  if (window.ResizeObserver) new ResizeObserver(() => dots()).observe(el);
  seg();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(infoInKifu, 0)); else setTimeout(infoInKifu, 0);
// ---------- the options button (common rule, 2026-11-07) ----------
// Inside the games, every option of the header's icon set — record (戦績), sound, language, the game's own extras (settings,
// move numbers, …) — sits in ONE options button (a gear) that opens a small panel; only 盤面反転 (#btnFlip), 縦横 / 横画面
// (#btnLand, #btnRot, .land) and the home link stay as their own buttons. The existing elements are moved into the panel
// (their handlers and state are kept); each gets a label (14 languages) and toggles show their on / off. Done automatically for
// the 2D pages (.brand-r) and, through HeaderBar.options(), for the portal bar of the 3D full version (atlas/skin/common.js).
// The home pages (index.html, atlas/index.html) keep their language picker in the open.
// A game adds its own items with
//   const h = HeaderBar.addOption({ id: 'mt', icon: '<svg…>', label: { ja: 'マルチスレッド', en: 'Multi-thread', … },
//     type: 'toggle', get: () => on, set: v => { on = v; } });      // or type: 'button', onClick: () => …
//     or type: 'select', options: [{ v, label: {…} }, …] (or a function), get: () => v, set: v => …  — a pulldown at the row's end
//     (the language row's look; the list opens under it, upward when there is no room)
//   h.sync() (redraw its state), h.remove();   optional: hidden: () => true to leave it out for now, title: {…} (tooltip)
const OT = {
  opts: { ja: 'オプション', en: 'Options', zh: '选项', 'zh-TW': '選項', ko: '옵션', es: 'Opciones', fr: 'Options', pt: 'Opções', de: 'Optionen', ru: 'Параметры', tr: 'Seçenekler', id: 'Opsi', hi: 'विकल्प', ar: 'خيارات' },
  sound: { ja: 'サウンド', en: 'Sound', zh: '声音', 'zh-TW': '聲音', ko: '사운드', es: 'Sonido', fr: 'Son', pt: 'Som', de: 'Ton', ru: 'Звук', tr: 'Ses', id: 'Suara', hi: 'ध्वनि', ar: 'الصوت' },
  lang: { ja: '言語', en: 'Language', zh: '语言', 'zh-TW': '語言', ko: '언어', es: 'Idioma', fr: 'Langue', pt: 'Idioma', de: 'Sprache', ru: 'Язык', tr: 'Dil', id: 'Bahasa', hi: 'भाषा', ar: 'اللغة' },
  rec: { ja: '戦績', en: 'Record', zh: '战绩', 'zh-TW': '戰績', ko: '전적', es: 'Historial', fr: 'Bilan', pt: 'Histórico', de: 'Bilanz', ru: 'Статистика', tr: 'Kayıt', id: 'Rekor', hi: 'रिकॉर्ड', ar: 'السجل' },
  set: { ja: '設定', en: 'Settings', zh: '设置', 'zh-TW': '設定', ko: '설정', es: 'Ajustes', fr: 'Réglages', pt: 'Configurações', de: 'Einstellungen', ru: 'Настройки', tr: 'Ayarlar', id: 'Pengaturan', hi: 'सेटिंग्स', ar: 'الإعدادات' },
  on: { ja: 'オン', en: 'On', zh: '开', 'zh-TW': '開', ko: '켬', es: 'Sí', fr: 'Activé', pt: 'Ligado', de: 'An', ru: 'Вкл', tr: 'Açık', id: 'Aktif', hi: 'चालू', ar: 'تشغيل' },
  off: { ja: 'オフ', en: 'Off', zh: '关', 'zh-TW': '關', ko: '끔', es: 'No', fr: 'Désactivé', pt: 'Desligado', de: 'Aus', ru: 'Выкл', tr: 'Kapalı', id: 'Nonaktif', hi: 'बंद', ar: 'إيقاف' },
};
const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>';
const OCSS = `
.hbo-gear{cursor:pointer}
.hbo-gear svg{fill:none;stroke:currentColor}
.hbo-gear[aria-expanded=true]{color:var(--accent,#d8b56a)!important}
.hbo-gear[hidden]{display:none!important}
.hbo-pop{position:fixed;z-index:999;display:none;box-sizing:border-box;width:max-content;min-width:230px;max-width:calc(100vw - 16px);overflow-y:auto;overscroll-behavior:contain;padding:6px;border-radius:14px;
  background:var(--panel2,var(--panel,#1b1d22));color:var(--text,#eee);border:1px solid var(--line,rgba(255,255,255,.14));box-shadow:0 18px 44px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.25);
  font-family:inherit;font-size:14px;line-height:1.25;text-align:start;scrollbar-width:thin}
.hbo-pop.on{display:block;animation:hboIn .14s ease}
@keyframes hboIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.hbo-row{display:flex;align-items:center;gap:10px;min-height:44px;box-sizing:border-box;padding:4px 10px 4px 4px;border-radius:10px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:start}
.hbo-row + .hbo-row{margin-top:2px}
.hbo-row:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
.hbo-row[hidden]{display:none!important}
.hbo-ic{flex:none;width:36px;height:36px;display:grid;place-items:center}
.hbo-ic > span[aria-hidden]{display:grid;place-items:center}
.hbo-pop .hbo-ic > :is(button,a){display:inline-flex}   /* (not !important: a game's own display:none!important — the record on phones — still wins) */
.hbo-pop .hbo-ic > :is(button,a,span){width:36px!important;height:36px!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;color:inherit!important;align-items:center!important;justify-content:center!important;border-radius:9px!important;position:static!important;cursor:pointer;font:inherit}
.hbo-pop .hbo-ic svg{width:20px!important;height:20px!important;margin:0!important}
.hbo-pop .hbo-ic svg:not([fill]){fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.hbo-lb{flex:1;min-width:0;white-space:nowrap;font-weight:600}
.hbo-sw{flex:none;position:relative;width:36px;height:20px;border-radius:10px;background:color-mix(in srgb,currentColor 22%,transparent);transition:background .2s}
.hbo-sw::after{content:'';position:absolute;top:2px;inset-inline-start:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .2s}
.hbo-row.on .hbo-sw{background:var(--accent,#d8b56a)}
.hbo-row.on .hbo-sw::after{transform:translateX(16px)}
html[dir=rtl] .hbo-row.on .hbo-sw::after,html[lang=ar] .hbo-row.on .hbo-sw::after{transform:translateX(-16px)}
.hbo-row:not(.tg) .hbo-sw{display:none}
.hbo-end{flex:none;display:flex;align-items:center}
.hbo-pop .hbo-end .lsel-btn{height:34px!important;min-height:0!important;max-width:none!important;padding:0 10px!important;border:1px solid var(--line,rgba(127,127,127,.35))!important;border-radius:9px!important;background:none!important;box-shadow:none!important;color:inherit!important;font:inherit!important;font-size:13.5px!important;gap:6px!important}
.hbo-pop .hbo-end .lsel-btn > svg:first-child{display:none}
.hbo-pop .hbo-end .lsel-btn .lsel-n{display:inline!important}.hbo-pop .hbo-end .lsel-btn .lsel-c{display:none!important}
.hbo-pop .hbo-end select{height:34px;max-width:none}
.hbo-x.sel{cursor:default}
.hbo-sbtn{display:inline-flex;align-items:center;gap:6px;height:34px;box-sizing:border-box;padding:0 10px;border:1px solid var(--line,rgba(127,127,127,.35));border-radius:9px;background:none;color:inherit;font:inherit;font-size:13.5px;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hbo-sbtn svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.6;transition:transform .15s}
.hbo-sbtn[aria-expanded=true] svg{transform:rotate(180deg)}
.hbo-spop{position:fixed;z-index:1001;min-width:150px;box-sizing:border-box;padding:6px;border-radius:14px;background:var(--panel2,var(--panel,#1b1d22));color:var(--text,#eee);border:1px solid var(--line,rgba(255,255,255,.14));box-shadow:0 18px 44px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3);animation:hboIn .14s ease}
.hbo-spop button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:9px 12px;border:0;border-radius:9px;background:none;color:inherit;font:inherit;font-size:14px;text-align:start;cursor:pointer}
.hbo-spop button:hover,.hbo-spop button:focus-visible{background:color-mix(in srgb,currentColor 8%,transparent);outline:none}
.hbo-spop button.on{background:color-mix(in srgb,currentColor 12%,transparent);font-weight:700}
.hbo-spop button.on::after{content:'✓';opacity:.8}
.hbo-atlas .hbo-sbtn{height:36px;padding:0 12px;border:2px solid #efe3c8;border-radius:12px;background:#fff;box-shadow:0 2px 0 #efe3c8;font-weight:900}
.hbo-atlas .hbo-spop{background:#fffdf7;color:#2b3044;border:2px solid #efe3c8;border-radius:16px;box-shadow:0 6px 0 #efe3c8,0 24px 40px -18px rgba(80,40,0,.5)}
.hbo-atlas .hbo-spop button{font-weight:800;border-radius:12px}
.hbo-atlas .hbo-spop button.on{background:#f6efdd}
html[dir=rtl] .hbo-pop,html[lang=ar] .hbo-pop{direction:rtl}
/* the portal look (3D full version) */
.hbo-pop.hbo-atlas{padding:8px;border-radius:22px;background:#fffdf7;color:#2b3044;border:2px solid #efe3c8;box-shadow:0 6px 0 #efe3c8,0 24px 40px -18px rgba(80,40,0,.5);font-family:'Zen Maru Gothic',sans-serif;font-size:15px}
.hbo-atlas .hbo-row{border-radius:16px;background:#f6efdd;padding:4px 12px 4px 6px;min-height:46px}
.hbo-atlas .hbo-row + .hbo-row{margin-top:6px}
.hbo-atlas .hbo-row:hover{background:#f1e4c6}
.hbo-atlas .hbo-lb{font-weight:900}
.hbo-atlas .hbo-row.on .hbo-sw{background:#ffc928;box-shadow:inset 0 -2px 0 #e09a00}
.hbo-atlas .hbo-sw{background:#e3d7bd}
.hbo-pop.hbo-atlas .hbo-ic svg:not([fill]){stroke-width:2.2}
.hbo-pop.hbo-atlas .hbo-end .atlas-lbtn{height:36px!important;width:auto!important;min-width:0!important;padding:0 12px!important;box-shadow:0 2px 0 #efe3c8!important}
.hbo-pop.hbo-atlas .hbo-end .atlas-lbtn svg{display:none}
.hbo-pop.hbo-atlas .hbo-end .atlas-lbtn b{display:inline!important}
`;
const optL = () => { const s = document.getElementById('langSel'); let l = (s && s.value) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!OT.opts[l]) l = String(l).slice(0, 2); return OT.opts[l] ? l : 'en'; };
const ot = (k, l) => (OT[k][l || optL()] || OT[k].en);
const pickL = m => { if (!m) return ''; if (typeof m === 'function') return m(optL()); if (typeof m === 'string') return m; const l = optL(); return m[l] || m.en || m.ja || ''; };
const EXTRA = [], INST = [];
function optCss() { if (!document.getElementById('hboCss')) { const st = document.createElement('style'); st.id = 'hboCss'; st.textContent = OCSS; document.head.appendChild(st); } }
// options({ host, theme: '2d' | 'atlas', gearClass, keep(el) → stays outside, take(el) → moves in (default: everything not kept),
//           at: element the gear goes before (default: before the first kept element after the options, else at the end) })
function options(o) {
  optCss();
  const host = o.host; if (!host || host.querySelector(':scope > .hbo-gear')) return null;
  const REC = '#btnRecord, #atlasRec';   // 戦績 stays outside, right before the gear (common rule 2026-11-08)
  const keep0 = o.keep || (() => false), keep = el => el.matches(REC) || keep0(el), take = o.take ? (el => !el.matches(REC) && o.take(el)) : (el => !keep(el));
  const gear = document.createElement('button'); gear.type = 'button'; gear.className = (o.gearClass || 'snd') + ' hbo-gear'; gear.id = o.id || 'btnOpts';
  gear.innerHTML = GEAR; gear.setAttribute('aria-haspopup', 'true'); gear.setAttribute('aria-expanded', 'false');
  const pop = document.createElement('div'); pop.className = 'hbo-pop' + (o.theme === 'atlas' ? ' hbo-atlas' : ''); pop.setAttribute('role', 'menu');
  const list = document.createElement('div'); list.className = 'hbo-list'; pop.appendChild(list); document.body.appendChild(pop);
  // the gear: right before the orientation button / home (o.after), so 盤面反転 stays on its left
  const after = o.after || '#btnLand, #btnRot, .land, a';
  const seat = () => {
    const a = [...host.children].find(c => c !== gear && c.matches(after)) || null; if (gear.parentNode !== host || gear.nextElementSibling !== a) host.insertBefore(gear, a);
    const rec = host.querySelector(':scope > #btnRecord, :scope > #atlasRec'); if (rec && rec.nextElementSibling !== gear) host.insertBefore(rec, gear);
  };
  seat();
  const rows = new Map();   // unit (the moved element) → row
  const kind = u => u.matches('.lsel, #langSel, #atlasLang') ? 'lang' : /^(btnSound|atlasSnd)$/.test(u.id) ? 'sound' : /^(btnRecord|atlasRec)$/.test(u.id) ? 'rec' : u.id === 'btnSettings' ? 'set' : 'other';
  const isTg = u => kind(u) === 'sound' || u.id === 'btnNum' || u.classList.contains('ck-sw') || u.hasAttribute('aria-pressed');
  const isOn = u => u.getAttribute('aria-pressed') === 'true' || (u.classList.contains('on') && !u.classList.contains('off') && !u.classList.contains('muted'));
  const strip = s => String(s || '').replace(/\s*[（(][^（）()]*[）)]\s*$/, '').trim();
  const label = u => { const k = kind(u); if (k === 'sound' || k === 'lang' || k === 'set') return ot(k);
    if (k === 'rec') return strip(u.getAttribute('aria-label')) || ot('rec');
    if (u.classList.contains('ck-sw')) { const s = u.querySelector('span'); return s ? s.textContent.trim() : strip(u.title); }
    return strip(u.title) || strip(u.getAttribute('aria-label')) || u.textContent.trim(); };
  const shownU = u => { if (!u.isConnected || u.hidden) return false; const cs = getComputedStyle(u); return cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const target = u => u.matches('.lsel') ? (u.querySelector('.lsel-btn') || u.querySelector('select')) : u;
  let synth = false;
  function mkRow(u) {
    const r = document.createElement('div'); r.className = 'hbo-row'; r.setAttribute('role', 'menuitem');
    const lg = kind(u) === 'lang';
    r.innerHTML = `<span class="hbo-ic">${lg ? '<span aria-hidden="true">' + GLOBE + '</span>' : ''}</span><span class="hbo-lb"></span><span class="hbo-sw" aria-hidden="true"></span>` + (lg ? '<span class="hbo-end"></span>' : '');
    (lg ? r.querySelector('.hbo-end') : r.querySelector('.hbo-ic')).appendChild(u);
    r.addEventListener('click', e => {
      if (synth) return;
      const t = target(u);
      if (kind(u) === 'lang' && o.onLang) { e.stopPropagation(); e.preventDefault(); const g = gear.getBoundingClientRect(); close(); synth = true; try { o.onLang(t, g); } finally { synth = false; } return; }   // (portal: its own language list, under the gear)
      if (!u.contains(e.target)) { e.stopPropagation(); e.preventDefault(); synth = true; try { t.click(); } finally { synth = false; } }
      if (kind(u) === 'lang') return;   // the language list opens beside the panel; picking closes both
      if (isTg(u)) setTimeout(paint, 0); else close();
    }, true);
    rows.set(u, r); return r;
  }
  // a 'select' item (2026-11-09, ludo's 速さ): the row with a pulldown button at the end (the language row's look) and its list
  let spop = null;
  const spClose = () => { if (!spop) return; const b = spop._btn; spop.remove(); spop = null; if (b) b.setAttribute('aria-expanded', 'false'); };
  function spOpen(x, btn) {
    if (spop && spop._btn === btn) { spClose(); return; }
    spClose();
    const cur = safe(x.get), l = document.createElement('div'); l.className = 'hbo-spop'; l.setAttribute('role', 'listbox'); l._btn = btn;
    (typeof x.options === 'function' ? x.options() : x.options).forEach(o => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'option');
      b.className = String(o.v) === String(cur) ? 'on' : ''; b.textContent = pickL(o.label);
      b.addEventListener('click', e => { e.stopPropagation(); try { x.set(o.v); } catch (err) { console.error(err); } spClose(); syncAll(); }); l.appendChild(b); });
    pop.appendChild(l); spop = l; btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect(), w = l.offsetWidth, h = l.offsetHeight, M = 8, rtl = getComputedStyle(pop).direction === 'rtl';
    let left = rtl ? r.left : r.right - w; left = Math.max(M, Math.min(left, innerWidth - w - M));
    const top = r.bottom + 6 + h <= innerHeight - M ? r.bottom + 6 : Math.max(M, r.top - 6 - h);   // (no room below: it opens upward)
    l.style.left = left + 'px'; l.style.top = top + 'px';
  }
  document.addEventListener('pointerdown', e => { if (spop && !spop.contains(e.target) && !spop._btn.contains(e.target)) spClose(); }, true);
  function xRow(x) {
    if (x.type === 'select') {
      const r = document.createElement('div'); r.className = 'hbo-row hbo-x sel'; r.setAttribute('role', 'menuitem'); r.dataset.x = x.id;
      r.innerHTML = `<span class="hbo-ic"><span aria-hidden="true">${x.icon || ''}</span></span><span class="hbo-lb"></span><span class="hbo-end"><button type="button" class="hbo-sbtn" aria-haspopup="listbox" aria-expanded="false"><span></span><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button></span>`;
      const btn = r.querySelector('.hbo-sbtn');
      r.addEventListener('click', e => { e.stopPropagation(); spOpen(x, btn); });
      return r;
    }
    const r = document.createElement('button'); r.type = 'button'; r.className = 'hbo-row hbo-x' + (x.type === 'toggle' ? ' tg' : ''); r.setAttribute('role', x.type === 'toggle' ? 'menuitemcheckbox' : 'menuitem'); r.dataset.x = x.id;
    r.innerHTML = `<span class="hbo-ic"><span aria-hidden="true">${x.icon || ''}</span></span><span class="hbo-lb"></span><span class="hbo-sw" aria-hidden="true"></span>`;
    r.addEventListener('click', e => { e.stopPropagation();
      try { if (x.type === 'toggle') { x.set(!x.get()); syncAll(); } else { close(); if (x.onClick) x.onClick(); } } catch (err) { console.error(err); } });
    return r;
  }
  // the rows, in the order of the elements: new ones may arrive any time (record.js / flipbtn.js insert next to #btnSound —
  // which may already be in the panel), a kept one (盤面反転) found in the panel goes back out, before the gear
  let q = 0;
  function sort() {
    q = 0;
    const units = [];
    for (const r of list.querySelectorAll(':scope > .hbo-row:not(.hbo-x)')) for (const c of r.querySelectorAll(':scope > .hbo-ic > *, :scope > .hbo-end > *')) if (!c.matches('.hbo-ic > span[aria-hidden]')) units.push(c);
    for (const c of [...host.children]) if (c !== gear && c.nodeType === 1 && !/^(STYLE|SCRIPT|TEMPLATE)$/.test(c.tagName) && !keep(c) && take(c)) units.push(c);
    const out = units.filter(u => keep(u)), ins = units.filter(u => !keep(u));
    out.forEach(u => host.insertBefore(u, gear)); seat();
    const want = [];
    for (const u of ins) { let r = rows.get(u); if (!r || !r.contains(u)) { if (r) r.remove(); r = mkRow(u); } want.push(r); }
    for (const [u, r] of rows) if (!ins.includes(u)) { r.remove(); rows.delete(u); }
    // the game's own items (HeaderBar.addOption): before the language row (the language stays last)
    const xs = EXTRA.filter(x => x.alive);
    list.querySelectorAll(':scope > .hbo-x').forEach(r => { if (!xs.some(x => x.id === r.dataset.x)) r.remove(); });
    const xr = xs.map(x => [...list.querySelectorAll(':scope > .hbo-x')].find(e => e.dataset.x === x.id) || xRow(x));   // (no CSS.escape: CSS here is this file's style text)
    const li = want.findIndex(r => r.querySelector(':scope > .hbo-end'));
    want.splice(li < 0 ? want.length : li, 0, ...xr);
    want.forEach((r, k) => { if (list.children[k] !== r) list.insertBefore(r, list.children[k] || null); });   // (only what is out of place: no endless re-sorting)
    paint();
  }
  // labels, on / off, which rows are shown (an element the game hides — the sound on phones, the record while the phones' tab
  // bar has it — leaves its row out); no row left: no gear
  function paint() {
    const l = optL(), onT = ot('on', l), offT = ot('off', l);
    for (const [u, r] of rows) {
      const lb = label(u), tg = isTg(u), on = tg && isOn(u), sh = shownU(u);
      const lbe = r.querySelector('.hbo-lb'); if (lbe.textContent !== lb) lbe.textContent = lb;
      r.classList.toggle('tg', tg); r.classList.toggle('on', on);
      if (tg) { r.setAttribute('role', 'menuitemcheckbox'); r.setAttribute('aria-checked', on ? 'true' : 'false'); r.title = lb + ': ' + (on ? onT : offT); } else r.removeAttribute('title');
      if (r.hidden === sh) r.hidden = !sh;
    }
    for (const r of list.querySelectorAll(':scope > .hbo-x')) {
      const x = EXTRA.find(e => e.id === r.dataset.x); if (!x) continue;
      const lb = pickL(x.label), on = x.type === 'toggle' && !!safe(x.get);
      const lbe = r.querySelector('.hbo-lb'); if (lbe.textContent !== lb) lbe.textContent = lb;
      r.classList.toggle('on', on); if (x.type === 'toggle') r.setAttribute('aria-checked', on ? 'true' : 'false');
      const t = pickL(x.title) || (x.type === 'toggle' ? lb + ': ' + (on ? onT : offT) : ''); if (t) r.title = t; else r.removeAttribute('title');
      if (x.type === 'select') { const cur = safe(x.get), o = (typeof x.options === 'function' ? x.options() : x.options).find(e => String(e.v) === String(cur)), sp = r.querySelector('.hbo-sbtn > span'), tx = o ? pickL(o.label) : ''; if (sp && sp.textContent !== tx) sp.textContent = tx; }
      const hid = !!(x.hidden && safe(x.hidden)); if (r.hidden !== hid) r.hidden = hid;
    }
    const any = [...list.children].some(r => !r.hidden), gt = ot('opts', l);
    if (gear.hidden === any) gear.hidden = !any;
    if (gear.title !== gt) { gear.title = gt; gear.setAttribute('aria-label', gt); }
    if (!any && open) close();
    mo.takeRecords();
  }
  const safe = f => { try { return f(); } catch (e) { return false; } };
  let open = false;
  function place() {
    const g = gear.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, M = 8;
    const tabs = [...document.querySelectorAll('#mtabs, .mtabs')].find(t => t.getClientRects().length && getComputedStyle(t).position === 'fixed');
    const floor = tabs ? Math.min(vh, tabs.getBoundingClientRect().top) : vh;   // (phones: above the bottom tab bar)
    const top = g.bottom + 8;
    pop.style.maxHeight = Math.max(160, floor - top - M) + 'px';
    const w = pop.offsetWidth, rtl = getComputedStyle(pop).direction === 'rtl';
    let left = rtl ? g.left : g.right - w; left = Math.max(M, Math.min(left, vw - w - M));
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function show() { sort(); open = true; pop.classList.add('on'); gear.setAttribute('aria-expanded', 'true'); place();
    const f = pop.querySelector('.hbo-row:not([hidden])'); if (f && matchMedia('(hover: hover)').matches) { const t = f.querySelector('button, a') || f; try { t.focus({ preventScroll: true }); } catch (e) {} } }
  function close(focus) { spClose(); if (!open) return; open = false; pop.classList.remove('on'); gear.setAttribute('aria-expanded', 'false'); if (focus) try { gear.focus({ preventScroll: true }); } catch (e) {} }
  gear.addEventListener('click', e => { e.stopPropagation(); open ? close() : show(); });
  // (the language lists — shared/langsel.js .lsel-pop, the portal's .atlas-lpop — count as inside)
  document.addEventListener('pointerdown', e => { if (open && !pop.contains(e.target) && !gear.contains(e.target) && !(e.target.closest && e.target.closest('.lsel-pop, .atlas-lpop'))) close(); }, true);
  document.addEventListener('keydown', e => { if (open && e.key === 'Escape') { e.preventDefault(); close(true); } });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'langSel') { close(); setTimeout(paint, 60); } });
  addEventListener('resize', () => { if (open) place(); });
  addEventListener('scroll', e => { if (open && !pop.contains(e.target)) place(); }, true);
  const later = () => { if (!q) q = requestAnimationFrame(sort); };
  const mo = new MutationObserver(later);
  mo.observe(host, { childList: true });
  mo.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'aria-pressed', 'aria-label', 'title'] });
  new MutationObserver(() => setTimeout(paint, 0)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'class'] });
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });   // (body.it-on … hides the record)
  addEventListener('resize', later); setTimeout(later, 700); setTimeout(later, 2500);
  sort();
  const inst = { gear, pop, sort, paint, close, open: show, isOpen: () => open };
  INST.push(inst); return inst;
}
function syncAll() { INST.forEach(i => { try { i.sort(); } catch (e) {} }); }
function addOption(x) {
  if (!x || !x.id) return null;
  const old = EXTRA.findIndex(e => e.id === x.id); if (old >= 0) EXTRA.splice(old, 1);
  x.alive = true; x.type = x.type === 'toggle' || x.type === 'select' ? x.type : 'button'; EXTRA.push(x); syncAll();
  return { sync: syncAll, remove() { x.alive = false; const i = EXTRA.indexOf(x); if (i >= 0) EXTRA.splice(i, 1); syncAll(); } };
}
// the 2D pages: the icon set .brand-r (moved into the PC header bar or not) — 盤面反転, 縦横 / 横画面 and home stay outside
const KEEP2D = el => el.classList.contains('hbo-gear') || /^(btnFlip|btnLand|btnRot)$/.test(el.id) || el.classList.contains('land') || el.classList.contains('flip-btn') || el.tagName === 'A' || el.matches('.home, .homebtn, #homeLink');
function auto2d() {
  if (document.documentElement.classList.contains('atlas-skin')) return;   // (the 3D full version: the portal bar has its own — atlas/skin/common.js)
  const br = document.querySelector('.brand .brand-r, .brand-r'); if (!br) return;
  const snd = document.getElementById('btnSound');
  const ref = snd && snd.parentNode === br ? snd : [...br.children].find(c => c.tagName === 'BUTTON' && !KEEP2D(c)) || br.querySelector('button');
  options({ host: br, theme: '2d', keep: KEEP2D, gearClass: (ref && ref.className ? ref.className.replace(/\b(on|off|muted|hidden|grc-ic|numbtn|flip-btn|land)\b/g, '').trim() : '') || 'snd' });
}
// (after the deferred scripts — langsel.js turns #langSel into its button first)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(auto2d, 0)); else setTimeout(auto2d, 0);
window.HeaderBar = { init, MEDIA: MQ, HEIGHT: H, ICON_RULES, options, addOption, syncOptions: syncAll, OPTIONS_T: OT };
})();
