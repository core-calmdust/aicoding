// PhoneSnd — on phones / tablets the device's silent switch decides whether the site makes sound.
//
// Every page that makes sound includes this early in <head> (before any AudioContext / <audio> starts):
//     <script src="../shared/phonesnd.js?v=1"></script>
// It does four things:
//   1. navigator.audioSession.type = 'ambient' (iOS 17+): Web Audio and media elements follow the silent switch
//      and mix with other apps' audio — on every device, PC included (no effect where unsupported).
//   2. On touch devices — matchMedia('(hover: none) and (pointer: coarse)') — the sound / BGM toggle buttons of
//      menu bars, header bars and the rules-tour panel are hidden (display:none; they stay in the DOM so the
//      game code that refers to them keeps working). html gets the class .phone-snd.
//   3. There, sound is always on: a "sound off" saved earlier ('atlas-sfx' = '0', 'wyrm-mute' = '1',
//      'atlas-hist-bgm' = '0') is ignored — localStorage.getItem returns the "on" value for those keys — so nobody
//      is left muted without a button to turn it back on. Games keeping their own flag check PhoneSnd.phone.
//   PC keeps its buttons and its saved setting unchanged.
(function () {
'use strict';
if (window.PhoneSnd) return;
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
// 4. Sound comes back after an interruption (every device). Phones put Web Audio into 'suspended' /
//    'interrupted' (iOS) after the screen locks, the tab goes to the background, a call or another app's
//    audio — and after that only a resume() from a user gesture brings it back. Every AudioContext the page
//    makes is tracked; on each tap / key (and when the page comes back) any that is not running is resumed.
//    iOS can also leave a context 'running' but silent after an interruption: the first gesture after the page
//    was hidden does suspend() → resume() to restart its output.
(function () {
  const Base = window.AudioContext || window.webkitAudioContext;
  if (!Base || Base.__keep) return;
  const all = [];
  let stale = false;
  function Keep(...a) { const c = new Base(...a); all.push(c); return c; }
  Keep.prototype = Base.prototype; Keep.__keep = true;
  try { Object.setPrototypeOf(Keep, Base); } catch (e) {}
  window.AudioContext = Keep; if (window.webkitAudioContext) window.webkitAudioContext = Keep;
  const fix = gesture => {
    const restart = stale && gesture; if (gesture) stale = false;
    for (const c of all) {
      try {
        if (c.state === 'closed') continue;
        if (c.state !== 'running') c.resume().catch(() => {});
        else if (restart) c.suspend().then(() => c.resume()).catch(() => {});
      } catch (e) {}
    }
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => addEventListener(t, () => fix(true), { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stale = true; else fix(false); });
  addEventListener('pagehide', () => { stale = true; });
  addEventListener('pageshow', () => fix(false));
  addEventListener('focus', () => fix(false));
})();
let phone = false;
try { phone = matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) {}
window.PhoneSnd = { phone };
if (!phone) return;
// saved "off" values are read as "on"
const ON = { 'atlas-sfx': '1', 'wyrm-mute': '0', 'atlas-hist-bgm': '1' };
try {
  const ls = window.localStorage, get = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (this === ls && Object.prototype.hasOwnProperty.call(ON, k)) return ON[k];
    return get.apply(this, arguments);
  };
} catch (e) {}
// the toggles (menu bars / header bars of the portal and the games, the rules-tour speaker, Historia's BGM,
// and the sound rows of the settings dialogs: puzzle games, and the card games whose sound button lives there)
const HIDE = [
  '#sndBtn', '#sfxBtn', '#atlasSnd', '#btnSound', '#btnSnd', '#gSnd', 'button#snd',
  '.rgd-act .sfx', '.hs-mute',
  '#sound-toggle-button', '#sound-toggle', '#mobile-mute-btn', '#pc-mute-btn',
  '#setBody .set[data-k=sound]', 'label.sw:has(> input[data-k=snd])', '#setBody .rl:has(input[data-k=sound])',
];
const de = document.documentElement;
de.classList.add('phone-snd');
const st = document.createElement('style'); st.id = 'phonesnd-css';
// one rule per selector: a selector the browser does not know (:has on old Safari) drops only its own rule
st.textContent = HIDE.map(s => 'html.phone-snd ' + s + '{display:none!important}').join('\n');
(document.head || de).appendChild(st);
})();
