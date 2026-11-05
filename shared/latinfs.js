// LatinFS — one step larger UI text for Latin-script languages (ar a little less, hi lightly).
//
// The font sizes of the site were tuned on Japanese: CJK glyphs fill the whole em box, Latin glyphs don't,
// so at the same px size en/es/fr/pt/de text looks a size smaller. Instead of editing thousands of
// `font-size:NNpx` declarations, this script rewrites every px/rem font-size of the page's own style sheets
// (also <style> injected later by shared/*.js and inline style="font-size:…" on inserted elements) into
//     calc(NNpx * var(--lfs, 1))
// and the scale comes from one rule keyed on <html lang> — ja / zh / ko keep factor 1, so nothing changes there,
// and a language switch (the pages set document.documentElement.lang) takes effect at once.
//   ≤ 17.5px    → --lfs  (body text, buttons, tabs, pills)
//   18 – 19.5px → --lfh  (half the bump)
//   ≥ 20px      → unchanged (titles, headings and display text are big enough already)
// Selectors of the logo / wordmark (.brand .wm, .atlas-logo, …) are skipped. em / % sizes follow their parent.
// Include it early in <head>:  <script src="../shared/latinfs.js?v=1"></script>
(function () {
'use strict';
if (window.LatinFS) return;
const DEF = ':root:is(:lang(en),:lang(es),:lang(fr),:lang(pt),:lang(de)){--lfs:1.1;--lfh:1.05}'
  + ':root:lang(ar){--lfs:1.08;--lfh:1.04}'     // Noto Sans Arabic sits small in the em box as well
  + ':root:lang(hi){--lfs:1.05;--lfh:1.02}'     // Devanagari (headline + matras) is closer to CJK: a light bump
  + '.hb{--lfs:var(--lfh,1)}'                     // PC header bar (shared/headerbar.js): the menu row is full at 1440, half the bump
  + '@media (max-width:760px){.app>.controls{--lfs:1;--lfh:1}}';   // --lfs:1 on a container keeps its subtree as is (poker's phone menu row)
const SKIP = /logo|brand|wordmark|\.wm\b|\.wk\b/i;          // the logo / wordmark sizes are tuned by hand
// tight spots where the bigger text would clip or wrap (measured at 320 / 390 / 1440 in en and de):
const KEEP = /\.sidetg button|\.pt em\b|\.evalrow|\.ev-[hr]\b|\.kifu\b/;   // portal side toggle / profile tiles, eval line, fixed-column tables, move list
const KEEP_PHONE = /\.controls \.btn|\.today \.hsb|\.gcard b\b|\.gx-cat|\.gx-icon \.nm/;   // only inside @media (max-width …)
const done = new WeakSet();

function fix(v) {
  if (!v || v.indexOf('--lf') >= 0) return null;
  if (/(^|[^r])em\b|%|^[a-z-]+$/.test(v) && !/var\(/.test(v)) return null;   // relative / keyword: follows the parent
  if (/(^|[\d.])em\b/.test(v.replace(/rem\b/g, ''))) return null;           // calc(1em + …): already relative
  let mx = 0; const re = /(-?[\d.]+)(px|rem)\b/g; let m;
  while ((m = re.exec(v))) mx = Math.max(mx, parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1));
  if (!mx && !/var\(/.test(v)) return null;
  if (mx >= 20) return null;
  return 'calc(' + v + ' * var(' + (mx > 17.5 ? '--lfh' : '--lfs') + ', 1))';
}
function fixStyle(st) {
  const v = st.getPropertyValue('font-size'), n = fix(v);
  if (n) st.setProperty('font-size', n, st.getPropertyPriority('font-size'));
}
function walk(rules, phone) {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i], sel = r.selectorText;
    if (sel != null && (SKIP.test(sel) || KEEP.test(sel) || (phone && KEEP_PHONE.test(sel)))) continue;
    if (r.style && sel != null) fixStyle(r.style);
    if (r.cssRules) walk(r.cssRules, phone || (r.conditionText != null && /max-width/.test(r.conditionText)));   // @media / @supports / nesting
  }
}
function sheet(s) {
  if (!s || done.has(s)) return; done.add(s);
  let rules; try { rules = s.cssRules; } catch (e) { return; }   // cross-origin (Google Fonts)
  if (!rules) return;
  walk(rules);
  for (let i = 0; i < rules.length; i++) if (rules[i].styleSheet) sheet(rules[i].styleSheet);   // @import
}
function scan() { const ss = document.styleSheets; for (let i = 0; i < ss.length; i++) sheet(ss[i]); }
function inline(root) {
  if (root.nodeType !== 1) return;
  const one = el => { if (!el.closest('svg,.brand .wm,.atlas-logo')) fixStyle(el.style); };
  if (root.hasAttribute('style') && /font-size/.test(root.getAttribute('style'))) one(root);
  if (root.firstElementChild) root.querySelectorAll('[style*="font-size"]').forEach(one);
}

const def = document.createElement('style'); def.id = 'latinfs'; def.textContent = DEF;
(document.head || document.documentElement).appendChild(def);

let queued = false;
const later = () => { if (queued) return; queued = true; Promise.resolve().then(() => { queued = false; scan(); }); };
new MutationObserver(ms => {
  for (const m of ms) {
    const t = m.target;
    if (t.nodeName === 'STYLE') later();
    for (const n of m.addedNodes) {
      if (n.nodeName === 'STYLE') later();
      else if (n.nodeName === 'LINK') { n.addEventListener('load', scan); later(); }
      else if (n.nodeType === 1) { if (n.querySelector && n.querySelector('style,link')) later(); inline(n); }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
scan();
document.addEventListener('DOMContentLoaded', () => { scan(); if (document.body) inline(document.body); });
addEventListener('load', scan);
window.LatinFS = { scan, fix };
})();
