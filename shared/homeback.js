// Home button of a game page opened from the World Board Game Atlas: back to the Atlas (opened from the top page: back to the top page as before).
// The Atlas stores where to come back to in sessionStorage ('aicoding-home'); the top page clears it.
// Usage: <script src="../shared/homeback.js?v=1"></script> before </body> (home links: a.home, a.homebtn, #homeLink)
(function () {
  let h = null; try { h = sessionStorage.getItem('aicoding-home'); } catch (e) {}
  if (!h || !/^\/[^\s"'<>]*$/.test(h)) return;
  const fix = () => document.querySelectorAll('a.home, a.homebtn, #homeLink').forEach(a => { a.href = h; });
  fix(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix);
})();
