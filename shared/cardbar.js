// CardBar — compact action bar for the lesson / puzzle cards of the 世界のボドゲ大百科 games (common spec).
//
// The cards used to show every action as a big text button in one or two loose rows (ヒント / やり直す / 答えを見る /
// 次の問題 / 問題一覧 / やめる). This module rebuilds them, keeping the original buttons (ids, handlers, i18n) as they are:
//   [ icon tools ……… ]  [ text actions / primary ]
//                               [ ⇠ 詰将棋をやめる ]   ← the quit button: a labelled text button on its own row, named after the mode
//   puzzle: 💡 hint · ↺ retry · 👁 answer · ▦ list (· ‹ prev)   |  次の問題 ›  — gold once solved, the retry icon glows after a failure
//   lesson: ▦ list · ▶ auto                                     |  ヒント (its label changes with the mode) · 次へ (primary)
// Icon buttons carry their (translated) label as title + aria-label, kept in sync with the text the game writes into them.
// Usage: include after the card markup — <script src="../shared/cardbar.js?v=Nn"></script>.
// Text buttons keep their whole label: when they don't fit beside the icon tools, the text buttons move to a second row
// (and wrap among themselves on very narrow cards) instead of being cut off.
// Auto-advance (CardBar.autoNext): once a lesson / opening-drill problem is solved, the game asks for the next problem to come by
// itself after a short success beat (the primary button fills up meanwhile). Any tap / key press before then (another button,
// undo, leaving the lesson, a dialog …) cancels it, and the game's own check (opt.ok) must still hold when it fires.
//   CardBar.autoNext({ ok: () => still-the-same-problem, ms: 1400, btn: 'lsNext', fire: () => …, since: CardBar.now() at the answer })
//   (fire defaults to clicking btn; with since, a tap after that moment means no advance)
//   CardBar.cancelAuto()
// Quit label: 〈name〉をやめる / Quit 〈name〉 …, the name from the game's own i18n (t()): the puzzle collection (pz.title — 詰めチェス,
// 詰め連珠 …), レッスン (tab.lesson), the openings (tab.open — 定跡 / 定石 / 序盤) or 復習 / テスト, chosen from the game's `lesson` state.
// Falls back to パズルをやめる etc. The game's own i18n pass (data-i18n="ls.quit") is overridden on every change.
// Portal skin (?skin=atlas): the same bar; atlas/skin/common.js puts it next to the guide character and skin.css gives it the portal look.
(function () {
'use strict';
const P = d => `<path d="${d}"/>`;
const SVG = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`)}")`;
const ICONS = {
  hint: SVG(P('M9 18h6M10 21h4') + P('M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z')),
  retry: SVG(P('M4 4v6h6') + P('M5.5 15a7 7 0 1 0 1.6-7.3L4 10')),
  answer: SVG(P('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z') + `<circle cx='12' cy='12' r='3'/>`),
  list: SVG(`<rect x='4' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='4' y='13.5' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5'/>`),
  quit: SVG(P('M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4') + P('M9 8l-4 4 4 4') + P('M5 12h10')),
  prev: SVG(P('M15 6l-6 6 6 6')),
  next: SVG(P('M9 6l6 6-6 6')),
};
const CSS = `
:where(.cb-card){position:relative}
.cb-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px;min-width:0}
.cb-tools{display:flex;align-items:center;gap:6px;flex:none}
.cb-main{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px;flex:1 1 auto;min-width:0}
.cb-main:empty{display:none}
.cb-bar .hidden,.cb-card .cb-hide{display:none!important}
.cb-bar button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0;
  transition:color .15s,border-color .15s,background-color .15s,opacity .15s}
.cb-ic{flex:none;display:inline-grid;place-items:center;width:40px;height:40px;padding:0;border-radius:11px;font-size:0;line-height:0;
  border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--muted,#aaa)}
.cb-ic:not(#lsAuto) > *{display:none}
.cb-ic:not(#lsAuto)::before{content:'';width:20px;height:20px;background:currentColor;-webkit-mask:var(--cb-i) center/contain no-repeat;mask:var(--cb-i) center/contain no-repeat}
#lsAuto.cb-ic svg{width:17px;height:17px}
.cb-ic:hover:not(:disabled){color:var(--text,#eee);border-color:color-mix(in srgb,var(--accent,#c9a961) 60%,transparent)}
.cb-ic:focus-visible,.cb-t:focus-visible{outline:2px solid var(--accent,#c9a961);outline-offset:2px}
.cb-ic.cb-go{color:var(--accent,#c9a961);border-color:var(--accent,#c9a961);background:color-mix(in srgb,var(--accent,#c9a961) 16%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#c9a961) 18%,transparent)}
.cb-bar button:disabled{opacity:.3;cursor:default}
.cb-br{flex:1 0 100%;height:0;margin:-8px 0 0}
.cb-br:has(+ .cb-q.hidden){display:none}
.cb-bar .cb-q{flex:none;margin-inline-start:auto;max-width:100%;height:34px;padding:0 12px 0 10px;border-radius:10px;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,rgba(255,255,255,.14));background:transparent;color:var(--muted,#aaa)}
.cb-bar .cb-q::before{content:'';flex:none;width:16px;height:16px;background:currentColor;-webkit-mask:${ICONS.quit} center/contain no-repeat;mask:${ICONS.quit} center/contain no-repeat}
html[dir=rtl] .cb-bar .cb-q::before,html[lang=ar] .cb-bar .cb-q::before{transform:scaleX(-1)}
.cb-bar .cb-q:hover{color:var(--text,#eee);border-color:color-mix(in srgb,var(--text,#eee) 35%,transparent);background:rgba(255,255,255,.05)}
.cb-bar .cb-q:focus-visible{outline:2px solid var(--accent,#c9a961);outline-offset:2px}
html.atlas-skin .cb-bar .cb-q{height:34px!important;background:transparent!important;border:2px solid #ead9b6!important;border-radius:99px!important;color:#4a5068!important;font-weight:900!important;box-shadow:none!important}
html.atlas-skin .cb-bar .cb-q:hover{background:#f6efdd!important;color:#2b3044!important}
html.atlas-skin .cb-card.cb-card > .lh{padding-inline-end:0}
html.atlas-land .cb-bar .cb-q{height:30px!important}
.cb-t{flex:1 0 auto;min-width:0;max-width:100%;height:40px;padding:0 12px;border-radius:11px;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--muted,#aaa)}
.cb-t:hover:not(:disabled){color:var(--text,#eee)}
.cb-t.go{background:var(--cb-go-bg,linear-gradient(180deg,#d8bb72,#a98a48));color:var(--cb-go-fg,#1b150a);border-color:transparent;box-shadow:0 6px 16px -10px var(--accent,#c9a961)}
.cb-t.go:hover:not(:disabled){color:var(--cb-go-fg,#1b150a);filter:brightness(1.06)}
.cb-t.go:disabled{opacity:.4}
.cb-t.cb-auto{position:relative}
.cb-t.cb-auto::before,.lesson-actions .cb-auto::before{content:'';position:absolute;inset-inline-start:0;bottom:0;height:3px;width:100%;background:currentColor;opacity:.45;transform-origin:left;animation:cb-auto var(--cb-auto-ms,1400ms) linear forwards;pointer-events:none}
html[dir=rtl] .cb-auto::before{transform-origin:right}
@keyframes cb-auto{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.cb-nx::after{content:'';flex:none;width:15px;height:15px;margin-inline-end:-4px;background:currentColor;-webkit-mask:${ICONS.next} center/contain no-repeat;mask:${ICONS.next} center/contain no-repeat}
html[dir=rtl] .cb-nx::after,html[lang=ar] .cb-nx::after,html[dir=rtl] .cb-ic[data-cb=prev]::before,html[lang=ar] .cb-ic[data-cb=prev]::before{transform:scaleX(-1)}
.cb-bar .cb-ic{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;width:40px!important;height:40px!important;min-height:0!important;max-height:none!important;min-width:0!important;line-height:0!important;flex:none!important;vertical-align:middle}
.cb-bar .cb-ic::before{display:block;flex:none;margin:0!important}
.cb-bar .cb-t{height:40px!important;min-height:0!important;padding-top:0!important;padding-bottom:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important}
.cb-bar,.cb-tools,.cb-main{align-items:center!important}
@media (pointer:coarse){ .cb-bar .cb-ic,.cb-bar .cb-t{height:42px!important}.cb-bar .cb-ic{width:42px!important}.cb-bar .cb-q{height:38px} }
@media (max-width:360px){ .cb-bar{gap:6px}.cb-tools{gap:4px}.cb-bar .cb-ic{width:38px!important}.cb-bar .cb-t{padding:0 8px!important} }

/* puzzle cards: the compact layout shared with the shogi tsume card (2026-11-10) — the step and a small quit pill on the head
   row, icon buttons with a small caption (ヒント・やり直し・答え・一覧) and a wide 「次の問題」 */
.cb-cmp > .lh{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:10px;padding-inline-end:0!important;margin-inline-end:0!important}
.cb-cmp > .lh .dots{display:none!important}
.cb-cmp > .lh .lt{flex:1 1 auto;min-width:0;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;font-size:11.5px!important;letter-spacing:.01em!important;line-height:1.35}
.cb-cmp > .lh .cb-qp{flex:none;margin-inline-start:auto!important;display:inline-flex!important;align-items:center;gap:4px;height:28px!important;width:auto!important;padding:0 10px 0 8px!important;font-size:0!important;border-radius:99px!important;margin-top:0!important;margin-bottom:0!important;
  background:rgba(0,0,0,.2);border:1px solid var(--line,rgba(255,255,255,.14));color:var(--muted,#aaa);cursor:pointer;font-family:inherit;line-height:1;white-space:nowrap}
.cb-cmp > .lh .cb-qp::after{content:attr(data-cap);font-size:11.5px;font-weight:800;line-height:1}
.cb-cmp > .lh .cb-qp::before{content:'';flex:none;width:15px;height:15px;background:currentColor;-webkit-mask:${ICONS.quit} center/contain no-repeat;mask:${ICONS.quit} center/contain no-repeat}
html[dir=rtl] .cb-cmp .cb-qp::before,html[lang=ar] .cb-cmp .cb-qp::before{transform:scaleX(-1)}
.cb-cmp > .lh .cb-qp:hover{color:var(--text,#eee)}
.cb-cmp > .lh .cb-qp.hidden{display:none!important}
html.atlas-skin .cb-cmp > .lh .cb-qp{background:#fff!important;border:2px solid #ead9b6!important;color:#4a5068!important;box-shadow:0 2px 0 #ead9b6!important}
.cb-cmp .pz-goal{background:none!important;border:0!important;padding:0!important;margin:0 0 4px!important;box-shadow:none!important}   /* the goal as plain text */
.cb-cmp .cb-bar{flex-wrap:nowrap!important}
.cb-cmp .cb-bar .cb-br{display:none!important}
.cb-cmp .cb-bar .cb-ic[data-cap]{display:inline-flex!important;flex-direction:column!important;justify-content:center!important;gap:3px!important;height:52px!important;width:auto!important;min-width:50px!important;padding:0 6px!important;overflow:visible!important}
.cb-cmp .cb-bar .cb-ic[data-cap]::after{content:attr(data-cap);font-size:10px;line-height:1;font-weight:700;letter-spacing:0;white-space:nowrap}
.cb-cmp .cb-bar .cb-t{height:52px!important;flex:1 1 auto!important}
.cb-cmp .cb-tools{gap:6px}
.cb-cmp.cb-5 .cb-bar .cb-ic[data-cap],html.atlas-skin .cb-cmp .cb-bar .cb-ic[data-cap]{min-width:46px!important;padding:0 2px!important}
html.atlas-skin .cb-cmp .cb-tools,.cb-cmp.cb-5 .cb-tools{gap:5px}
html.atlas-skin .cb-cmp .cb-bar .cb-t,.cb-cmp.cb-5 .cb-bar .cb-t{padding:0 8px!important;min-width:72px!important}
html.atlas-skin .cb-cmp .cb-bar .cb-nx::after,.cb-cmp.cb-5 .cb-bar .cb-nx::after{display:none}
@media (max-width:360px){ .cb-cmp .cb-bar .cb-ic[data-cap]{min-width:44px!important;padding:0 2px!important} }
`;
const st = document.createElement('style'); st.id = 'cardbar-css'; st.textContent = CSS; document.head.appendChild(st);

const $ = id => document.getElementById(id);
// ---- the quit button's label: 〈name〉をやめる in the page language, the name taken from the game's i18n
const QT = { ja: '{x}をやめる', en: 'Quit {x}', zh: '退出{x}', ko: '{x} 그만하기', es: 'Salir de {x}', fr: 'Quitter les {x}', pt: 'Encerrar {x}', de: '{x} beenden', hi: '{x} छोड़ें', ar: 'إنهاء {x}', ru: 'Выйти: {x}', 'zh-TW': '退出{x}', id: 'Keluar dari {x}', tr: 'Bitir: {x}' };
const QN = {   // fallback names
  pz: { ja: 'パズル', en: 'puzzles', zh: '谜题', ko: '퍼즐', es: 'problemas', fr: 'problèmes', pt: 'desafios', de: 'Rätsel', hi: 'पहेलियाँ', ar: 'الألغاز', ru: 'задачи', 'zh-TW': '謎題', id: 'teka-teki', tr: 'bulmacalar' },
  ls: { ja: 'レッスン', en: 'lessons', zh: '课程', ko: '레슨', es: 'lecciones', fr: 'leçons', pt: 'lições', de: 'Lektionen', hi: 'पाठ', ar: 'الدروس', ru: 'уроки', 'zh-TW': '課程', id: 'pelajaran', tr: 'dersler' },
  op: { ja: '定跡', en: 'openings', zh: '开局', ko: '정석', es: 'aperturas', fr: 'ouvertures', pt: 'aberturas', de: 'Eröffnungen', hi: 'ओपनिंग', ar: 'الافتتاحيات', ru: 'дебюты', 'zh-TW': '開局', id: 'pembukaan', tr: 'açılışlar' },
};
const QF = {   // whole labels
  rv: { ja: '復習をやめる', en: 'Quit review', zh: '退出复习', ko: '복습 그만하기', es: 'Salir del repaso', fr: 'Quitter la révision', pt: 'Encerrar revisão', de: 'Wiederholung beenden', hi: 'समीक्षा छोड़ें', ar: 'إنهاء المراجعة', ru: 'Выйти из повторения', 'zh-TW': '退出複習', id: 'Keluar dari ulasan', tr: 'Tekrarı bitir' },
  ex: { ja: 'テストをやめる', en: 'Quit test', zh: '退出测试', ko: '테스트 그만하기', es: 'Salir del examen', fr: 'Quitter le test', pt: 'Encerrar teste', de: 'Test beenden', hi: 'टेस्ट छोड़ें', ar: 'إنهاء الاختبار', ru: 'Выйти из теста', 'zh-TW': '退出測驗', id: 'Keluar dari tes', tr: 'Testi bitir' },
};
const GAME_ID = ((window.GAME && window.GAME.id) || (location.pathname.match(/\/([^/]+)\/(?:index\.html)?$/) || [])[1] || '').toLowerCase();
// i18n key of each name, per game (default: pz.title / tab.lesson / tab.open); null = the fallback name
const QK = { shogi: { pz: 'ts.title', ls: 'ls.tabLesson', op: 'ls.tabOpen' }, go: { pz: 'tab.puzzle' }, alquerque: { pz: null },
  // chess: 詰めチェス or 戦術問題, after the collection the current problem is from
  chess: { pz: () => { try { return PUZZLES.levels[puzzle.L].kind === 'line' ? 'pz.tacHead' : 'pz.mateHead'; } catch (e) { return 'pz.mateHead'; } } } };
const pageLang = () => { const l = (s => /^zh-(tw|hk|mo|hant)/i.test(s) ? 'zh-TW' : s.slice(0, 2).toLowerCase())(document.documentElement.lang || 'ja'); return QT[l] ? l : 'en'; };
function gameT(k) { try { if (k && typeof window.t === 'function') { const x = window.t(k); if (typeof x === 'string' && x && x !== k && !/[<{]/.test(x)) return x; } } catch (e) {} return ''; }
function quitMode(card) {
  if (card.id === 'puzzleCard') return 'pz';
  let L = null; try { L = typeof lesson !== 'undefined' ? lesson : null; } catch (e) {}   // the game's global lesson state
  if (!L) return 'ls';
  if (L.endless) return 'pz';                                  // 詰将棋 runs in the lesson card
  if (L.exam) return 'ex';
  if (L.review || (L.virt && L.virt.id === 'mk')) return 'rv';  // review of the game's mistakes
  if (L.study || L.op || L.opening || L.virt || (L.drill && !('step' in L))) return 'op';   // (chess: lesson.drill = a ★ drill of a lesson)
  return 'ls';
}
function quitLabel(card) {
  const m = quitMode(card), lang = pageLang();
  if (QF[m]) return QF[m][lang];
  const ov = QK[GAME_ID] || {}; let key = m in ov ? ov[m] : { pz: 'pz.title', ls: 'tab.lesson', op: 'tab.open' }[m]; if (typeof key === 'function') key = key();
  let x = gameT(key).replace(/\s*[（(][^（()）]*[）)]\s*$/, '').trim() || QN[m][lang];
  if (/^(en|es|fr|pt)$/.test(lang) && !/^(Hex|Fanorona|Tafl|Renju|Tsume|Tsumego|Joseki|Morris|Mancala|Go)\b/.test(x)) x = x.charAt(0).toLowerCase() + x.slice(1);
  if (lang === 'fr' && !/^\S*[sx]\b/.test(x)) return `Quitter « ${x} »`;   // singular names (Tactique, Tsume)
  return QT[lang].replace('{x}', x);
}
// small captions under the puzzle icons and on the quit pill: hint, retry, answer, list, prev, quit
const CAP = { ja: ['ヒント', 'やり直し', '答え', '一覧', '前へ', 'やめる'], en: ['Hint', 'Retry', 'Answer', 'List', 'Back', 'Quit'], zh: ['提示', '重试', '答案', '列表', '上一题', '退出'], 'zh-TW': ['提示', '重試', '答案', '列表', '上一題', '退出'],
  ko: ['힌트', '다시', '정답', '목록', '이전', '그만'], es: ['Pista', 'Otra vez', 'Solución', 'Lista', 'Atrás', 'Salir'], fr: ['Indice', 'Rejouer', 'Solution', 'Liste', 'Retour', 'Quitter'], pt: ['Dica', 'De novo', 'Solução', 'Lista', 'Voltar', 'Sair'],
  de: ['Tipp', 'Nochmal', 'Lösung', 'Liste', 'Zurück', 'Beenden'], hi: ['संकेत', 'फिर से', 'उत्तर', 'सूची', 'पीछे', 'छोड़ें'], ar: ['تلميح', 'أعد', 'الحل', 'القائمة', 'السابق', 'خروج'], ru: ['Подсказка', 'Ещё раз', 'Ответ', 'Список', 'Назад', 'Выйти'],
  id: ['Petunjuk', 'Ulangi', 'Jawaban', 'Daftar', 'Kembali', 'Keluar'], tr: ['İpucu', 'Tekrar', 'Çözüm', 'Liste', 'Geri', 'Çık'] };
const CAPK = { hint: 0, retry: 1, answer: 2, list: 3, prev: 4 };
const label = b => (b.id === 'lsAuto' ? (b.title || (document.querySelector('[data-sn="auto"]') || {}).title || '') : b.textContent.replace(/\s+/g, ' ').trim());
function icon(b, kind) {
  b.classList.add('cb-ic'); b.classList.remove('go'); b.dataset.cb = kind;
  if (ICONS[kind]) b.style.setProperty('--cb-i', ICONS[kind]);
}
function build(card, spec) {
  if (!card || card.querySelector('.cb-bar')) return;
  const rows = [...card.querySelectorAll(':scope > .lesson-actions, :scope > .pz-acts, :scope > .pz-nav')];
  if (!rows.length) return;
  // the game's own primary-button colours (its .lesson-actions .go rule) become the primary colour of the bar
  const goB = card.querySelector('.lesson-actions .go');
  if (goB) { const cs = getComputedStyle(goB); if (cs.backgroundImage && cs.backgroundImage !== 'none') card.style.setProperty('--cb-go-bg', cs.backgroundImage); else if (cs.backgroundColor) card.style.setProperty('--cb-go-bg', cs.backgroundColor); card.style.setProperty('--cb-go-fg', cs.color); }
  card.classList.add('cb-card');
  const bar = document.createElement('div'); bar.className = 'cb-bar';
  const tools = document.createElement('div'); tools.className = 'cb-tools';
  const main = document.createElement('div'); main.className = 'cb-main';
  bar.append(tools, main);
  const used = new Set();
  for (const [id, kind] of spec.tools) { const b = $(id); if (b && card.contains(b)) { icon(b, kind); tools.appendChild(b); used.add(b); } }
  for (const id of spec.hide || []) { const b = $(id); if (b && card.contains(b)) { b.classList.add('cb-hide'); used.add(b); } }
  const rest = [];
  rows.forEach(r => [...r.querySelectorAll('button')].forEach(b => { if (!used.has(b) && b.id !== spec.quit && b.id !== spec.next) rest.push(b); }));
  rest.forEach(b => { b.classList.add('cb-t'); main.appendChild(b); });
  const nx = $(spec.next); if (nx && card.contains(nx)) { nx.classList.add('cb-t'); if (spec.nextChev) nx.classList.add('cb-nx'); main.appendChild(nx); }
  const q = $(spec.quit), lh = spec.puzzle && card.querySelector(':scope > .lh');
  if (lh) card.classList.add('cb-cmp');
  if (q && card.contains(q)) {
    if (lh) { q.classList.add('cb-qp'); q.classList.remove('go'); lh.appendChild(q); }   // puzzle: a small pill at the head row's end
    else { const br = document.createElement('div'); br.className = 'cb-br'; q.classList.add('cb-q'); q.classList.remove('go'); bar.append(br, q); }
  }
  rows[rows.length - 1].after(bar); rows.forEach(r => r.remove());
  // labels of icon buttons → tooltip + accessible name; puzzle state → primary button
  const toolKind = new Map(spec.tools);
  const sync = () => {
    // buttons a game adds later (e.g. next to the quit button) join the bar the same way
    [...bar.children].forEach(b => { if (b.tagName !== 'BUTTON' || b.classList.contains('cb-q')) return;
      if (toolKind.has(b.id)) { icon(b, toolKind.get(b.id)); tools.appendChild(b); } else { b.classList.add('cb-t'); main.insertBefore(b, nx && main.contains(nx) ? nx : null); } });
    if (lh) {
      const C = CAP[pageLang()] || CAP.en; let n = 0;
      bar.querySelectorAll('.cb-tools .cb-ic').forEach(b => { const k = CAPK[b.dataset.cb]; if (k != null && b.dataset.cap !== C[k]) b.dataset.cap = C[k]; if (getComputedStyle(b).display !== 'none') n++; });
      if (q && q.dataset.cap !== C[5]) q.dataset.cap = C[5];
      card.classList.toggle('cb-5', n >= 5);
    }
    if (q && card.contains(q)) { const l = quitLabel(card); if (q.textContent !== l) q.textContent = l; if (q.getAttribute('aria-label') !== l) q.setAttribute('aria-label', l); if (q.title) q.removeAttribute('title'); }
    bar.querySelectorAll('.cb-ic').forEach(b => { const l = label(b); if (l && b.getAttribute('aria-label') !== l) { b.setAttribute('aria-label', l); b.title = l; } });
    if (spec.puzzle) {
      const sv = !!card.querySelector('.pz-status .pb-sv, #pzStatus .pb-sv'), h = $('pzHint'), r = $('pzRetry');
      const failed = !sv && !!(h && h.disabled) && !!card.querySelector('#pzStatus .ng');
      if (nx) { const on = sv && !nx.disabled; if (nx.classList.contains('go') !== on) nx.classList.toggle('go', on); }
      if (r && r.classList.contains('cb-go') !== failed) r.classList.toggle('cb-go', failed);
    }
  };
  new MutationObserver(sync).observe(card, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'title'] });
  sync();
}
function init() {
  build($('puzzleCard'), { puzzle: true, tools: [['pzHint', 'hint'], ['pzRetry', 'retry'], ['pzAnswer', 'answer'], ['pzList', 'list'], ['pzPrev', 'prev']], hide: ['pzToList'], next: 'pzNext', nextChev: true, quit: 'pzQuit' });
  build($('lessonCard'), { tools: [['lsList', 'list'], ['lsToList', 'list'], ['lsAuto', 'auto']], next: 'lsNext', quit: 'lsQuit' });
}
if (document.readyState === 'loading' && !($('puzzleCard') || $('lessonCard'))) document.addEventListener('DOMContentLoaded', init); else init();
// ---- auto-advance after a solved lesson / drill problem
let auto = null, lastAct = 0;
function cancelAuto() { if (!auto) return; clearTimeout(auto.t); if (auto.btn) auto.btn.classList.remove('cb-auto'); auto = null; }
function autoNext(opt) {
  opt = opt || {}; cancelAuto();
  if (opt.since != null && lastAct > opt.since) return;   // the player already acted after the answer (e.g. during its animation)
  const btn = typeof opt.btn === 'string' ? $(opt.btn) : opt.btn || $('lsNext'), ms = opt.ms || 1400;
  const me = { btn, t: 0 };
  me.t = setTimeout(() => {
    if (auto !== me) return;
    cancelAuto();
    try { if (opt.ok && !opt.ok()) return; } catch (e) { return; }
    if (opt.fire) opt.fire();
    else if (btn && !btn.disabled && btn.getClientRects().length) btn.click();
  }, ms);
  auto = me;
  if (btn) { btn.style.setProperty('--cb-auto-ms', ms + 'ms'); btn.classList.remove('cb-auto'); void btn.offsetWidth; btn.classList.add('cb-auto'); }
}
// the player acting in the meantime (any button, the board, a key, leaving the page) cancels a pending advance
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastAct = performance.now(); cancelAuto(); }, true));
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAuto(); });
window.addEventListener('pagehide', cancelAuto);
window.CardBar = { init, autoNext, cancelAuto, autoPending: () => !!auto, now: () => performance.now() };
})();
