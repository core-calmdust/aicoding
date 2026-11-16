/* --sat: the top safe-area inset to use (2026-11-17). In-app browsers (X, Instagram, LINE, Facebook…) put the page below their own
   bar yet still report the status bar's env(safe-area-inset-top), so everything pinned to the top sat that much too low. When the
   page does not fill the whole screen height (an in-app browser, or Safari with its bars), nothing of it is under the status bar:
   the inset is 0. Full screen (a home-screen app, a landscape notch) keeps the real inset. CSS: var(--sat, env(safe-area-inset-top)) */
(function () {
  var R = document.documentElement, ua = navigator.userAgent || '';
  var inApp = /\bTwitter\b|FBAN|FBAV|Instagram|\bLine\/|LIFF|MicroMessenger|KAKAOTALK|Threads/i.test(ua);
  function f() {
    var vw = innerWidth, vh = innerHeight, sw = screen.width, sh = screen.height, tall = vw < vh ? Math.max(sw, sh) : Math.min(sw, sh);
    var full = !inApp && vh >= tall - 2;
    R.style.setProperty('--sat', full ? 'env(safe-area-inset-top)' : '0px');
  }
  f(); addEventListener('resize', f); addEventListener('orientationchange', function () { setTimeout(f, 300); });
})();
