/* Enter or → = the lesson's next step (2026-11-14, a common rule for every game's lessons; → 2026-11-15).
   In order: the intro / result dialog's button (はじめる #btnLessonStart, 次のレッスン #btnLessonNextStep), then the lesson card's 次へ (#lsNext).
   Only a visible, enabled button. Not while typing in a field, not with a modifier, and not when a button has keyboard
   focus (Enter then presses that button itself). */
(function () {
  if (window.__lessonKeys) return; window.__lessonKeys = true;
  const IDS = ['btnLessonStart', 'btnLessonNextStep', 'lsNext'];
  const shown = b => {
    if (!b || b.disabled || b.classList.contains('hidden') || !b.getClientRects().length) return false;
    const cs = getComputedStyle(b); return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && +cs.opacity > .5;
  };
  document.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== 'ArrowRight') || e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return;
    const a = document.activeElement;
    if (a && a !== document.body && a.closest && a.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'Enter' && a && a.matches && a.matches('button:focus-visible,a:focus-visible,[role=button]:focus-visible')) return;
    for (const id of IDS) { const b = document.getElementById(id); if (shown(b)) { e.preventDefault(); e.stopImmediatePropagation(); b.click(); return; } }
  }, true);
})();
