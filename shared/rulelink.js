// Rules deep link for the 世界のボドゲ大百科 games: <game>/?rules=1 opens the game's own rules (first page) right away.
// Used by the portal's game list (atlas/gamelist.js) for the games without a 3D rules tour.
// Usage: <script src="../shared/rulelink.js?v=1" data-btn="#btnRules"></script>   (data-btn: the game's rules button; default #btnRules)
//   optional data-ready="css selector" — wait until it matches (e.g. a home screen that has to be up first)
// While the link is being followed window.ATLAS_RULELINK is true (window.ATLAS_RULELINK_VISIT for the whole visit), so a game can hold back its first-visit dialogs.
(function () {
  'use strict';
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (!q.has('rules')) return;
  var me = document.currentScript, sel = (me && me.dataset.btn) || '#btnRules', ready = me && me.dataset.ready;
  window.ATLAS_RULELINK = window.ATLAS_RULELINK_VISIT = true;   // _VISIT stays on: tips that would pop over the rules can skip this visit
  // the site-wide first-visit "name / link Google" prompt would cover the rules: hold it back for this visit only
  try { if (!localStorage.getItem('atlas-profile-asked')) { localStorage.setItem('atlas-profile-asked', 'rulelink');
    addEventListener('pagehide', function () { try { if (localStorage.getItem('atlas-profile-asked') === 'rulelink') localStorage.removeItem('atlas-profile-asked'); } catch (e) {} }); } } catch (e) {}
  // a reload or a shared URL should not keep reopening the rules
  try { q.delete('rules'); var s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
  var t0 = Date.now(), done = false;
  var shown = function (b) { if (!b || b.disabled) return false; var r = b.getBoundingClientRect(), cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  function tryOpen() {
    if (done) return;
    if (Date.now() - t0 > 20000) { window.ATLAS_RULELINK = false; return; }
    var ok = !ready || !!document.querySelector(ready);
    var b = document.querySelectorAll(sel), btn = null;
    for (var i = 0; i < b.length; i++) if (shown(b[i])) { btn = b[i]; break; }
    if (!btn && ok && b.length && Date.now() - t0 > 3500) btn = b[0];   // phones may keep the button in a folded bar: a click still opens the rules
    if (!ok || !btn) { setTimeout(tryOpen, 250); return; }
    done = true; btn.click();
    setTimeout(function () { window.ATLAS_RULELINK = false; }, 1500);
  }
  // the game's own scripts have wired their buttons by DOMContentLoaded (this file comes last): no need to wait for every image
  var go = function () { setTimeout(tryOpen, 500); };
  if (document.readyState !== 'loading') go(); else document.addEventListener('DOMContentLoaded', go);
})();
