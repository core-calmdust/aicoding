// WatchPause — the 待った button becomes 停止 / 再開 while two AIs play each other (common spec, AI同士 / 観戦 mode).
//
// The game keeps its own #btnUndo (same place in the PC header bar and the phone top menu); this helper only swaps
// what it shows. The game decides the state and stops / restarts its own AI loop.
//   WatchPause.set(btn, mode, lang)   mode: null = normal 待った, 'pause' = AI is playing (shows 停止), 'resume' = paused (shows 再開)
//   WatchPause.label(mode, lang)      the label text (for toasts etc.)
(function () {
'use strict';
const L = {
  pause:  { ja: '停止', en: 'Pause', zh: '暂停', ko: '정지', es: 'Pausa', fr: 'Pause', pt: 'Pausar', de: 'Pause', hi: 'रोकें', ar: 'إيقاف' },
  resume: { ja: '再開', en: 'Resume', zh: '继续', ko: '재개', es: 'Reanudar', fr: 'Reprendre', pt: 'Retomar', de: 'Weiter', hi: 'जारी रखें', ar: 'استئناف' },
};
const T = {
  pause:  { ja: 'AI同士の対局を一時停止', en: 'Pause the AI vs AI game', zh: '暂停 AI 对局', ko: 'AI 대국 일시정지', es: 'Pausar la partida entre IA', fr: 'Mettre en pause la partie IA contre IA', pt: 'Pausar a partida entre IAs', de: 'KI-gegen-KI-Partie anhalten', hi: 'AI बनाम AI खेल रोकें', ar: 'إيقاف مباراة الذكاء الاصطناعي مؤقتًا' },
  resume: { ja: 'AI同士の対局を再開（最新の局面から）', en: 'Resume the AI vs AI game (from the latest position)', zh: '继续 AI 对局（从最新局面）', ko: 'AI 대국 재개 (최신 국면부터)', es: 'Reanudar la partida entre IA (desde la última posición)', fr: 'Reprendre la partie IA contre IA (depuis la dernière position)', pt: 'Retomar a partida entre IAs (da última posição)', de: 'KI-gegen-KI-Partie fortsetzen (ab der aktuellen Stellung)', hi: 'AI बनाम AI खेल फिर शुरू करें (नवीनतम स्थिति से)', ar: 'استئناف مباراة الذكاء الاصطناعي (من آخر وضع)' },
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
window.WatchPause = { set, label };
})();
