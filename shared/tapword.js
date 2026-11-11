// TapWord — the rules' "tap" becomes "click" on a PC (user rule 2026-11-11: スマホ＝タップ、PC＝クリック).
// The texts are written for phones (タップ / Tap / Toca …); on a mouse screen (hover + fine pointer) TapWord.fix(html, lang)
// rewrites them, text only (tags and attributes are left alone). Used by shared/ruletour.js (the 2D tours) and the
// 3D rules courses of the portal (atlas/rules/*.js: the guide's bubble and the ▶ button).
(function () {
'use strict';
if (window.TapWord) return;
const PC = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };
// [pattern, replacement] per language, applied in order (longer forms first)
const R = {
  ja: [[/タップ/g, 'クリック']],
  en: [[/\bTapping\b/g, 'Clicking'], [/\btapping\b/g, 'clicking'], [/\bTapped\b/g, 'Clicked'], [/\btapped\b/g, 'clicked'], [/\bTaps\b/g, 'Clicks'], [/\btaps\b/g, 'clicks'], [/\bTap\b/g, 'Click'], [/\btap\b/g, 'click']],
  zh: [[/轻触/g, '点击'], [/轻点/g, '点击']],
  'zh-TW': [[/輕觸/g, '點擊'], [/輕點/g, '點擊']],
  ko: [[/탭/g, '클릭']],
  es: [[/\bTocar\b/g, 'Hacer clic en'], [/\btocar\b/g, 'hacer clic en'], [/\bTócala\b/g, 'Haz clic en ella'], [/\btócala\b/g, 'haz clic en ella'], [/\bTócalo\b/g, 'Haz clic en él'], [/\btócalo\b/g, 'haz clic en él'], [/\bToca\b/g, 'Haz clic en'], [/\btoca\b/g, 'haz clic en'], [/\bToque\b/g, 'Clic'], [/\btoque\b/g, 'clic']],
  fr: [[/\bTouchez\b/g, 'Cliquez sur'], [/\btouchez\b/g, 'cliquez sur'], [/\bTouche\b/g, 'Clique sur'], [/\btouche\b(?! pas)/g, 'clique sur'], [/\bToucher\b/g, 'Cliquer sur'], [/\btoucher\b/g, 'cliquer sur']],
  pt: [[/\bToque\b/g, 'Clique'], [/\btoque\b/g, 'clique'], [/\bTocar\b/g, 'Clicar'], [/\btocar\b/g, 'clicar'], [/\bToca\b/g, 'Clica'], [/\btoca\b/g, 'clica']],
  de: [[/\bantippen\b/g, 'anklicken'], [/\bAntippen\b/g, 'Anklicken'], [/\bTippe\b/g, 'Klicke'], [/\btippe\b/g, 'klicke'], [/\bTippen\b/g, 'Klicken'], [/\btippen\b/g, 'klicken'], [/\bTippt\b/g, 'Klickt'], [/\btippt\b/g, 'klickt']],
  ru: [[/Коснись/g, 'Нажми'], [/коснись/g, 'нажми'], [/Коснитесь/g, 'Нажмите'], [/коснитесь/g, 'нажмите'], [/Тапни/g, 'Кликни'], [/тапни/g, 'кликни']],
  tr: [[/Dokunun/g, 'Tıklayın'], [/dokunun/g, 'tıklayın'], [/Dokun/g, 'Tıkla'], [/dokun/g, 'tıkla']],
  id: [[/\bKetuk\b/g, 'Klik'], [/\bketuk\b/g, 'klik'], [/\bSentuh\b/g, 'Klik'], [/\bsentuh\b/g, 'klik']],
  hi: [[/टैप करें/g, 'क्लिक करें'], [/टैप करो/g, 'क्लिक करो'], [/टैप/g, 'क्लिक'], [/को छुओ/g, 'पर क्लिक करो'], [/को छुएँ/g, 'पर क्लिक करें'], [/छुओ/g, 'क्लिक करो'], [/छुएँ/g, 'क्लिक करें']],
  ar: [[/المسي/g, 'انقري على'], [/المسوا/g, 'انقروا على'], [/المس/g, 'انقر على'], [/اضغط/g, 'انقر']],
};
function fix(s, lang) {
  if (typeof s !== 'string' || !s || !PC()) return s;
  const L = R[lang || document.documentElement.lang] || null; if (!L) return s;
  return s.split(/(<[^>]*>)/).map(p => p[0] === '<' ? p : L.reduce((t, [a, b]) => t.replace(a, b), p)).join('');
}
window.TapWord = { fix, pc: PC };
})();
