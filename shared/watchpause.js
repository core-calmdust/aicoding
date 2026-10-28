// WatchPause — the 待った button becomes 停止 / 再開 while two AIs play each other (common spec, AI同士 / 観戦 mode).
//
// The game keeps its own #btnUndo (same place in the PC header bar and the phone top menu); this helper only swaps
// what it shows. The game decides the state and stops / restarts its own AI loop.
//   WatchPause.set(btn, mode, lang)   mode: null = normal 待った, 'pause' = AI is playing (shows 停止), 'resume' = paused (shows 再開)
//   WatchPause.label(mode, lang)      the label text (for toasts etc.)
//   WatchPause.ask({ lang, n, latest, here })   再開 pressed while an earlier position is shown: a small dialog in the
//       game's own overlay / modal style — [閉じる][最新の局面から][この局面から]. n = number of later moves that
//       「この局面から」 discards; latest = callback (null when the latest position is already over: only 「この局面から」);
//       here = callback. Esc / backdrop close it. Returns false when a dialog is already open.
(function () {
'use strict';
const L = {
  pause:  { ja: '停止', en: 'Pause', zh: '暂停', ko: '정지', es: 'Pausa', fr: 'Pause', pt: 'Pausar', de: 'Pause', hi: 'रोकें', ar: 'إيقاف' },
  resume: { ja: '再開', en: 'Resume', zh: '继续', ko: '재개', es: 'Reanudar', fr: 'Reprendre', pt: 'Retomar', de: 'Weiter', hi: 'जारी रखें', ar: 'استئناف' },
};
const T = {
  pause:  { ja: 'AI同士の対局を一時停止', en: 'Pause the AI vs AI game', zh: '暂停 AI 对局', ko: 'AI 대국 일시정지', es: 'Pausar la partida entre IA', fr: 'Mettre en pause la partie IA contre IA', pt: 'Pausar a partida entre IAs', de: 'KI-gegen-KI-Partie anhalten', hi: 'AI बनाम AI खेल रोकें', ar: 'إيقاف مباراة الذكاء الاصطناعي مؤقتًا' },
  resume: { ja: 'AI同士の対局を再開', en: 'Resume the AI vs AI game', zh: '继续 AI 对局', ko: 'AI 대국 재개', es: 'Reanudar la partida entre IA', fr: 'Reprendre la partie IA contre IA', pt: 'Retomar a partida entre IAs', de: 'KI-gegen-KI-Partie fortsetzen', hi: 'AI बनाम AI खेल फिर शुरू करें', ar: 'استئناف مباراة الذكاء الاصطناعي' },
};
const A = {
  title:  { ja: '対局を再開', en: 'Resume the game', zh: '继续对局', ko: '대국 재개', es: 'Reanudar la partida', fr: 'Reprendre la partie', pt: 'Retomar a partida', de: 'Partie fortsetzen', hi: 'खेल फिर शुरू करें', ar: 'استئناف المباراة' },
  ask:    { ja: '表示中の局面は最新ではありません。どちらから再開しますか？', en: 'The position shown is not the latest one. Where should the game resume from?', zh: '当前显示的不是最新局面。要从哪里继续？', ko: '표시 중인 국면은 최신이 아닙니다. 어디서부터 재개할까요?', es: 'La posición mostrada no es la última. ¿Desde dónde quieres reanudar?', fr: 'La position affichée n’est pas la dernière. D’où reprendre ?', pt: 'A posição exibida não é a mais recente. De onde deseja retomar?', de: 'Die angezeigte Stellung ist nicht die aktuelle. Ab wo soll es weitergehen?', hi: 'दिखाई गई स्थिति नवीनतम नहीं है। कहाँ से फिर शुरू करें?', ar: 'الوضع المعروض ليس الأحدث. من أين تريد الاستئناف؟' },
  askOver:{ ja: 'この局面からAI同士の対局を続けます。', en: 'The two AIs will play on from this position.', zh: '两个 AI 将从此局面继续对局。', ko: '이 국면부터 AI끼리 대국을 이어갑니다.', es: 'Las dos IA seguirán jugando desde esta posición.', fr: 'Les deux IA reprendront depuis cette position.', pt: 'As duas IAs continuarão a partir desta posição.', de: 'Die beiden KIs spielen ab dieser Stellung weiter.', hi: 'दोनों AI इस स्थिति से खेल जारी रखेंगे।', ar: 'سيواصل الذكاءان الاصطناعيان اللعب من هذا الوضع.' },
  drop:   { ja: '「この局面から」を選ぶと、以降の{n}手は消えます。', en: '“From this position” discards the {n} later moves.', zh: '选择“从此局面”会删除之后的 {n} 步。', ko: '‘이 국면부터’를 고르면 이후 {n}수는 지워집니다.', es: '«Desde esta posición» borra las {n} jugadas posteriores.', fr: '« Depuis cette position » efface les {n} coups suivants.', pt: '“Desta posição” apaga os {n} lances seguintes.', de: '„Ab dieser Stellung“ löscht die {n} späteren Züge.', hi: '“इस स्थिति से” चुनने पर बाद की {n} चालें मिट जाएँगी।', ar: 'اختيار «من هذا الوضع» يحذف النقلات اللاحقة ({n}).' },
  dropOver:{ ja: '以降の{n}手と対局の結果は消えます。', en: 'The {n} later moves and the result are discarded.', zh: '之后的 {n} 步和对局结果将被删除。', ko: '이후 {n}수와 대국 결과는 지워집니다.', es: 'Se borran las {n} jugadas posteriores y el resultado.', fr: 'Les {n} coups suivants et le résultat sont effacés.', pt: 'Os {n} lances seguintes e o resultado são apagados.', de: 'Die {n} späteren Züge und das Ergebnis werden gelöscht.', hi: 'बाद की {n} चालें और परिणाम मिट जाएँगे।', ar: 'تُحذف النقلات اللاحقة ({n}) والنتيجة.' },
  latest: { ja: '最新の局面から', en: 'From the latest', zh: '从最新局面', ko: '최신 국면부터', es: 'Desde la última', fr: 'Depuis la dernière', pt: 'Da mais recente', de: 'Ab der aktuellen', hi: 'नवीनतम स्थिति से', ar: 'من آخر وضع' },
  here:   { ja: 'この局面から', en: 'From this position', zh: '从此局面', ko: '이 국면부터', es: 'Desde esta posición', fr: 'Depuis cette position', pt: 'Desta posição', de: 'Ab dieser Stellung', hi: 'इस स्थिति से', ar: 'من هذا الوضع' },
  close:  { ja: '閉じる', en: 'Close', zh: '关闭', ko: '닫기', es: 'Cerrar', fr: 'Fermer', pt: 'Fechar', de: 'Schließen', hi: 'बंद करें', ar: 'إغلاق' },
};
const ICON = {
  pause: '<svg viewBox="0 0 24 24" class="wp"><path d="M9 5v14M15 5v14"/></svg>',
  resume: '<svg viewBox="0 0 24 24" class="wp"><path d="M7.5 4.8v14.4L19 12z" stroke-linejoin="round"/></svg>',
};
const CSS = '.wp-on > :not(.wp){display:none!important}:not(.wp-on) > .wp{display:none!important}';
const pick = (m, lang) => m[lang] || m.en;
function label(mode, lang) { return mode ? pick(L[mode], lang) : ''; }
function set(btn, mode, lang) {
  if (!btn) return;
  if (!document.getElementById('wpCss')) { const st = document.createElement('style'); st.id = 'wpCss'; st.textContent = CSS; document.head.appendChild(st); }
  const on = mode === 'pause' || mode === 'resume';
  if (!on) {
    if (!btn.classList.contains('wp-on')) return;
    btn.classList.remove('wp-on', 'wp-resume');
    btn.querySelectorAll(':scope > .wp').forEach(e => e.remove());
    if (btn.dataset.wpT !== undefined) { if (btn.dataset.wpT) btn.setAttribute('data-i18n-title', btn.dataset.wpT); delete btn.dataset.wpT; }
    if (btn.dataset.wpTitle !== undefined) { btn.title = btn.dataset.wpTitle; delete btn.dataset.wpTitle; }
    btn.removeAttribute('aria-pressed');
    return;
  }
  if (!btn.classList.contains('wp-on')) {
    btn.dataset.wpT = btn.getAttribute('data-i18n-title') || ''; btn.removeAttribute('data-i18n-title');   // the game's language refresh must not put the 待った tooltip back
    btn.dataset.wpTitle = btn.title || '';
    btn.classList.add('wp-on');
  }
  const key = mode + '|' + lang;
  if (btn.dataset.wpKey !== key || !btn.querySelector(':scope > .wp')) {
    btn.querySelectorAll(':scope > .wp').forEach(e => e.remove());
    btn.insertAdjacentHTML('beforeend', ICON[mode] + '<span class="wp"></span>');
    btn.querySelector(':scope > span.wp').textContent = label(mode, lang);
    btn.dataset.wpKey = key;
  }
  btn.classList.toggle('wp-resume', mode === 'resume');
  btn.title = pick(T[mode], lang);
  btn.setAttribute('aria-pressed', mode === 'resume' ? 'true' : 'false');
}
const ASK_CSS = '.wp-ask .modal-actions .mbtn{flex:1 1 0;min-width:0;letter-spacing:.02em;line-height:1.3;padding:11px 8px}'
  + '.wp-ask .modal-actions .mbtn[data-k=close]{flex:0 0 auto;padding-left:14px;padding-right:14px}'
  + '.wp-cjk .modal-actions .mbtn{white-space:nowrap}'
  + '@media (max-width:520px){.wp-ask .modal-actions{gap:8px}.wp-ask .modal-actions .mbtn{font-size:13.5px;padding-left:6px;padding-right:6px}.wp-ask .modal-actions .mbtn[data-k=close]{padding-left:12px;padding-right:12px}}';
let askEl = null, askKey = null;
function askClose() {
  if (askKey) { window.removeEventListener('keydown', askKey, true); askKey = null; }
  const el = askEl; askEl = null;
  if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }
}
function ask(o) {
  if (askEl && askEl.classList.contains('show')) return false;
  askClose();
  const lang = o.lang, n = o.n > 0 ? o.n : 0;
  const ov = document.createElement('div');
  if (!document.getElementById('wpAskCss')) { const st = document.createElement('style'); st.id = 'wpAskCss'; st.textContent = ASK_CSS; document.head.appendChild(st); }
  ov.className = 'overlay wp-ask' + (/^(ja|zh|ko)$/.test(lang) ? ' wp-cjk' : ''); ov.id = 'wpAsk';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'wpAskHead');
  ov.innerHTML = '<div class="modal" style="width:min(480px,100%)"><h2 id="wpAskHead"></h2>'
    + '<p class="wp-ask-q" style="font-size:13.5px;color:var(--muted);line-height:1.7;margin:-6px 0 4px"></p>'
    + '<p class="wp-ask-d" style="font-size:13px;color:var(--muted);line-height:1.6;margin:6px 0 0;opacity:.85"></p>'
    + '<div class="modal-actions"><button class="mbtn" data-k="close"></button>' + (o.latest ? '<button class="mbtn" data-k="latest"></button>' : '') + '<button class="mbtn go" data-k="here"></button></div></div>';
  ov.querySelector('h2').textContent = pick(A.title, lang);
  ov.querySelector('.wp-ask-q').textContent = pick(o.latest ? A.ask : A.askOver, lang);
  ov.querySelector('.wp-ask-d').textContent = pick(o.latest ? A.drop : A.dropOver, lang).replace('{n}', n);
  ov.querySelectorAll('.mbtn').forEach(b => {
    const k = b.dataset.k; b.textContent = pick(A[k], lang); b.type = 'button';
    b.onclick = e => { e.stopPropagation(); askClose(); if (k === 'latest') o.latest(); else if (k === 'here') o.here(); };
  });
  ov.addEventListener('click', e => { if (e.target === ov) askClose(); });
  askKey = e => {   // while open: Esc closes; the game's own shortcuts (kifu arrows, Ctrl+Z…) must not reach the board
    if (!askEl || !askEl.classList.contains('show')) { askClose(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); askClose(); return; }
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') { e.stopImmediatePropagation(); return; }
    e.preventDefault(); e.stopImmediatePropagation();
  };
  window.addEventListener('keydown', askKey, true);
  document.body.appendChild(ov); askEl = ov;
  void ov.offsetWidth; ov.classList.add('show');
  try { ov.querySelector('[data-k="close"]').focus({ preventScroll: true, focusVisible: false }); } catch (e) {}
  return true;
}
window.WatchPause = { set, label, ask };
})();
