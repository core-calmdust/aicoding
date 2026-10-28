/* すぴーど数独 — speed mode (4×4 time attack). Shared by まいにち数独 (sudoku/) and the stand-alone app (speed-sudoku/).
   app.js calls SudokuSpeed.init(core) at boot; everything the two apps share (profile, coins, character icons,
   modals, sound, sync) comes from `core`. Speed records live in DB.sp of the same store, so progress is shared. */
(function () {
'use strict';
const SE = window.SpeedEngine;
let C = null, DATA = null;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = (k, p) => C.t(k, p);
const DK = [30, 60, 90];                              // bronze / silver / gold slots (real seconds: dsec)
const dsec = (d, ds) => SE.dsec(ds || C.today(), d);
const DT = { 30: 1, 60: 2, 90: 3 };                    // medal tier (bronze / silver / gold)
// course layout comes from speed_puzzles.json (v2: 入門 5×10, 初級 5×10, 中級 3×10, 上級 5×20, 達人 5×20)
const catLen = ci => (DATA ? DATA.cats[ci].st.length : 0);
const nAll = () => (DATA ? DATA.cats.reduce((a, c) => a + c.st.length, 0) : 0);
const cname = ci => t(DATA.cats[ci].nk), cdesc = ci => t(DATA.cats[ci].dk);
const TIERCOL = ['#3fbf7a', '#2fb2d8', '#4f7bea', '#9a62e0', '#ec5f9f', '#f08a24', '#13a39b'];
const TIERBG = [['#dff7e6', '#c3efd2'], ['#d9f3fb', '#bfe8f6'], ['#dfe7ff', '#c7d4ff'], ['#efe2ff', '#dccaff'], ['#ffe2ef', '#ffc9df'], ['#fff0dc', '#ffdfb8'], ['#d9f6f2', '#bdebe5']];
const TORDER = [0, 1, 2, 5, 6, 3, 4];                   // tiers 5 (中級＋) and 6 (チャレンジ) were added later and sit between 中級 and 上級
const GCOL = { bug: '#ff6b6b', mosaic: '#a77be0', spin: '#38b6e8', spot: '#f0a92e', fruit: '#ee5a7a', shuffle: '#3fbf7a', ghost: '#8a93c8', ice: '#5aa8e8', bomb: '#ff8a3d', swap: '#e05aa8', cloud: '#7fa8d8', calc: '#e8a21c', card: '#26a69a', mole: '#a9785a', upside: '#7b61ff',
  balloon: '#ff6f91', dark: '#4b4789', sway: '#2fa6c7', paint: '#c35bd6', order: '#3f8ee0', peep: '#f0a92e', star: '#f2b81c', rev: '#e0566b', dice: '#5c6bc0', sleepy: '#8e7cc3' };
const GORDER = SE.GIMMICKS;
const BONUS = 5000, PENALTY = 2000, FREEZE = 380, LIMIT_TRIES = 3;
const DEBUG = new URLSearchParams(location.search).has('debug');

/* ================= art ================= */
const GICON = {
  bug: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="10" ry="9.5" fill="#ff6b6b"/><path d="M16 9v18" stroke="#7a2a3a" stroke-width="1.6"/><circle cx="11.5" cy="16" r="2.1" fill="#7a2a3a"/><circle cx="20.5" cy="16" r="2.1" fill="#7a2a3a"/><circle cx="12" cy="22.5" r="1.7" fill="#7a2a3a"/><circle cx="20" cy="22.5" r="1.7" fill="#7a2a3a"/><circle cx="16" cy="8.5" r="5" fill="#43385a"/><circle cx="14.2" cy="7.8" r="1.3" fill="#fff"/><circle cx="17.8" cy="7.8" r="1.3" fill="#fff"/><path d="M13 4 11 1.5M19 4l2-2.5" stroke="#43385a" stroke-width="1.4" stroke-linecap="round"/></svg>',
  mosaic: '<svg viewBox="0 0 32 32"><rect x="4" y="4" width="8" height="8" rx="2" fill="#c7a8ff"/><rect x="12" y="4" width="8" height="8" rx="2" fill="#ffd0e3"/><rect x="20" y="4" width="8" height="8" rx="2" fill="#a77be0"/><rect x="4" y="12" width="8" height="8" rx="2" fill="#ffd0e3"/><rect x="12" y="12" width="8" height="8" rx="2" fill="#8a5cd6"/><rect x="20" y="12" width="8" height="8" rx="2" fill="#e6dcff"/><rect x="4" y="20" width="8" height="8" rx="2" fill="#a77be0"/><rect x="12" y="20" width="8" height="8" rx="2" fill="#e6dcff"/><rect x="20" y="20" width="8" height="8" rx="2" fill="#ffb3cf"/></svg>',
  spin: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#d7f1fc"/><path d="M8.5 13a8 8 0 0 1 14-4.2" fill="none" stroke="#38b6e8" stroke-width="3" stroke-linecap="round"/><path d="M23.5 4.5l-.6 5-4.8-.9" fill="none" stroke="#38b6e8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M23.5 19a8 8 0 0 1-14 4.2" fill="none" stroke="#1f8fc0" stroke-width="3" stroke-linecap="round"/><path d="M8.5 27.5l.6-5 4.8.9" fill="none" stroke="#1f8fc0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spot: '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#2a2556"/><circle cx="18" cy="19" r="9" fill="#fff3b8"/><circle cx="18" cy="19" r="5.5" fill="#fff"/><path d="M4 4l9 9" stroke="#ffd36b" stroke-width="3" stroke-linecap="round" opacity=".7"/><circle cx="6" cy="7" r="1.2" fill="#fff"/><circle cx="25" cy="7" r="1" fill="#fff"/></svg>',
  fruit: '<svg viewBox="0 0 32 32"><path d="M16 9c6-3 11 1 10 7-1 7-6 12-10 13-4-1-9-6-10-13-1-6 4-10 10-7z" fill="#ff5a6e"/><path d="M11 6c2 1 3 2 5 3 2-1 3-2 5-3-1 3-3 4-5 4s-4-1-5-4z" fill="#4fbf6a"/><g fill="#ffe08a"><circle cx="12" cy="15" r=".9"/><circle cx="17" cy="14" r=".9"/><circle cx="21" cy="17" r=".9"/><circle cx="14" cy="20" r=".9"/><circle cx="19" cy="22" r=".9"/><circle cx="11" cy="20" r=".9"/></g></svg>',
  shuffle: '<svg viewBox="0 0 32 32"><rect x="3" y="5" width="11" height="10" rx="3" fill="#bfeccd"/><rect x="18" y="17" width="11" height="10" rx="3" fill="#bfeccd"/><text x="8.5" y="13.5" font-family="Fredoka,Arial" font-weight="700" font-size="8" fill="#2f9e5a" text-anchor="middle">1</text><text x="23.5" y="25.5" font-family="Fredoka,Arial" font-weight="700" font-size="8" fill="#2f9e5a" text-anchor="middle">2</text><path d="M16 9h6a3 3 0 0 1 3 3v2" fill="none" stroke="#3fbf7a" stroke-width="2.4" stroke-linecap="round"/><path d="M22.5 12l2.5 3 2.5-3" fill="none" stroke="#3fbf7a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 23h-6a3 3 0 0 1-3-3v-2" fill="none" stroke="#3fbf7a" stroke-width="2.4" stroke-linecap="round"/><path d="M9.5 20l-2.5-3-2.5 3" fill="none" stroke="#3fbf7a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ghost: '<svg viewBox="0 0 32 32"><path d="M6 28V14a10 10 0 0 1 20 0v14l-3.3-2.5L19.3 28 16 25.5 12.7 28l-3.4-2.5z" fill="#eef0ff" stroke="#8a93c8" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12.5" cy="15" r="1.8" fill="#43385a"/><circle cx="19.5" cy="15" r="1.8" fill="#43385a"/><ellipse cx="16" cy="20" rx="2" ry="1.4" fill="#ff9fb8"/></svg>',
  ice: '<svg viewBox="0 0 32 32"><path d="M6 10l10-6 10 6v12l-10 6-10-6z" fill="#cfeaff" stroke="#5aa8e8" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 10l10 6 10-6M16 16v12" fill="none" stroke="#8fc8f2" stroke-width="1.4"/><path d="M10 9l3 2M19 21l3-2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M13 19l2 2-1 3" fill="none" stroke="#5aa8e8" stroke-width="1.1" stroke-linecap="round"/></svg>',
};
GICON.bomb = '<svg viewBox="0 0 32 32"><circle cx="14" cy="19" r="10" fill="#43385a"/><circle cx="10.5" cy="15.5" r="3" fill="#fff" opacity=".35"/><path d="M20 11l3-3" stroke="#43385a" stroke-width="3.2" stroke-linecap="round"/><path d="M23 8q2-3 5-2" fill="none" stroke="#c9a073" stroke-width="1.8" stroke-linecap="round"/><path d="M27.5 3.5l.8 1.9 2-.3-1.4 1.5 1 1.8-1.9-.7-1.3 1.6v-2l-1.9-.7 1.9-.7z" fill="#ffcd3c"/><circle cx="11" cy="20" r="1.4" fill="#fff"/><circle cx="17" cy="20" r="1.4" fill="#fff"/><path d="M12.5 23.5q1.5 1.2 3 0" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>';
GICON.swap = '<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="9" rx="3" fill="#ffd6ec"/><rect x="3" y="18" width="26" height="9" rx="3" fill="#ffe9c9"/><path d="M9 14v4M23 14v4" stroke="#fff" stroke-width="2"/><path d="M8 12.5l-2.5-3M8 12.5l2.5-3M24 19.5l-2.5 3M24 19.5l2.5 3" stroke="#e05aa8" stroke-width="2.2" stroke-linecap="round"/><path d="M8 9.5V12.5M24 19.5V22.5" stroke="#e05aa8" stroke-width="2.2" stroke-linecap="round"/><text x="17" y="12.3" font-family="Fredoka,Arial" font-weight="700" font-size="7" fill="#c0407a" text-anchor="middle">1 2</text><text x="15" y="25.3" font-family="Fredoka,Arial" font-weight="700" font-size="7" fill="#c07a30" text-anchor="middle">3 4</text></svg>';
GICON.cloud = '<svg viewBox="0 0 32 32"><path d="M9 25a6 6 0 0 1-.7-12 8 8 0 0 1 15.5 1.4A5.4 5.4 0 0 1 23.4 25z" fill="#fff" stroke="#7fa8d8" stroke-width="1.7" stroke-linejoin="round"/><circle cx="13" cy="19" r="1.3" fill="#43385a"/><circle cx="19.5" cy="19" r="1.3" fill="#43385a"/><path d="M15.3 21.4q1 .9 2 0" stroke="#43385a" stroke-width="1.1" fill="none" stroke-linecap="round"/><ellipse cx="11" cy="21.3" rx="1.4" ry=".8" fill="#ffc2d4"/><ellipse cx="21.5" cy="21.3" rx="1.4" ry=".8" fill="#ffc2d4"/></svg>';
GICON.calc = '<svg viewBox="0 0 32 32"><rect x="3" y="6" width="26" height="20" rx="5" fill="#fff4cc" stroke="#e8a21c" stroke-width="1.7"/><text x="16" y="20.3" font-family="Fredoka,Arial" font-weight="700" font-size="10.5" fill="#b8740c" text-anchor="middle">1+2</text></svg>';
GICON.card = '<svg viewBox="0 0 32 32"><g transform="rotate(-12 11 17)"><rect x="4" y="7" width="14" height="20" rx="3" fill="#26a69a"/><rect x="6.2" y="9.2" width="9.6" height="15.6" rx="2" fill="none" stroke="#9fe3da" stroke-width="1.2"/><path d="M11 12.5l3 4.5-3 4.5-3-4.5z" fill="#9fe3da"/></g><g transform="rotate(10 21 15)"><rect x="14" y="5" width="14" height="20" rx="3" fill="#fff" stroke="#26a69a" stroke-width="1.7"/><text x="21" y="19.6" font-family="Fredoka,Arial" font-weight="700" font-size="11" fill="#1d7f75" text-anchor="middle">3</text></g></svg>';
GICON.mole = '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="26.5" rx="12.5" ry="3.6" fill="#6a4a32"/><path d="M7 26.5V17a9 9 0 0 1 18 0v9.5z" fill="#a9785a"/><ellipse cx="16" cy="21.5" rx="5.2" ry="3.7" fill="#efcfb2"/><circle cx="12.4" cy="15.6" r="1.4" fill="#2e1e14"/><circle cx="19.6" cy="15.6" r="1.4" fill="#2e1e14"/><ellipse cx="16" cy="19.2" rx="2.1" ry="1.5" fill="#ff8fa8"/><path d="M14.6 22.6q1.4 1 2.8 0" stroke="#2e1e14" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M5 27.5h4M23 27.5h4" stroke="#4a3222" stroke-width="1.3" stroke-linecap="round"/></svg>';
GICON.upside = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" fill="#ece7ff"/><text x="16" y="21.5" font-family="Fredoka,Arial" font-weight="700" font-size="15" fill="#7b61ff" text-anchor="middle" transform="rotate(180 16 16.5)">2</text><path d="M26 9.5a12 12 0 0 0-6-5" fill="none" stroke="#7b61ff" stroke-width="2" stroke-linecap="round"/><path d="M26.8 5.8l-.6 3.9-3.8-.9" fill="none" stroke="#7b61ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
GICON.balloon = '<svg viewBox="0 0 32 32"><path d="M16 25.4q-2.2 2.6 0 5.2" stroke="#a08a96" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="13" rx="9" ry="10.5" fill="#ff6f91"/><path d="M14.4 23.2h3.2L16 25.6z" fill="#e0507a"/><ellipse cx="12.4" cy="9" rx="2.2" ry="3.3" fill="#fff" opacity=".55" transform="rotate(-20 12.4 9)"/></svg>';
GICON.dark = '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="#2b2850"/><path d="M16 6.5a6.8 6.8 0 0 0-4.2 12.1V21h8.4v-2.4A6.8 6.8 0 0 0 16 6.5z" fill="#6b6894"/><rect x="12" y="22" width="8" height="2.6" rx="1.2" fill="#9d9ac0"/><rect x="13" y="25.3" width="6" height="2.2" rx="1.1" fill="#9d9ac0"/><path d="M13.4 12.6l2 2M15.4 12.6l-2 2M16.6 12.6l2 2M18.6 12.6l-2 2" stroke="#2b2850" stroke-width="1.2" stroke-linecap="round"/><circle cx="25" cy="7.5" r="1" fill="#fff"/><circle cx="6.5" cy="11" r=".8" fill="#fff"/></svg>';
GICON.sway = '<svg viewBox="0 0 32 32"><g transform="rotate(-9 16 17)"><path d="M6 17.5h20l-3.2 6H9.2z" fill="#2fa6c7"/><path d="M16 5v12.5" stroke="#7a5a3a" stroke-width="1.6"/><path d="M16.8 6l6.6 9.6h-6.6z" fill="#fff" stroke="#2fa6c7" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M3 27q3.25-3 6.5 0t6.5 0 6.5 0 6.5 0" fill="none" stroke="#7fd0e8" stroke-width="2.2" stroke-linecap="round"/></svg>';
GICON.paint = '<svg viewBox="0 0 32 32"><path d="M16 5c2 0 2.4 3 4 3.5s3.5-2 5-.5-1 3.5 0 5 3.8 1 3.8 3-3 2-3.5 3.6 1.5 4-.5 5.2-3.6-1.2-5-.4-1.6 4.2-3.8 4.2-2.3-3.4-3.8-4.2-3.6 1.5-5 .3 1-3.6-.4-5S3 18 3 16s3.4-1.6 3.8-3.1-1.8-3.6-.4-5 3.4 1 5 .5S14 5 16 5z" fill="#c35bd6"/><circle cx="27" cy="27.5" r="2" fill="#c35bd6"/><circle cx="4.5" cy="26.5" r="1.4" fill="#c35bd6"/><ellipse cx="12.5" cy="12.5" rx="2.6" ry="1.4" fill="#fff" opacity=".45" transform="rotate(-25 12.5 12.5)"/></svg>';
GICON.order = '<svg viewBox="0 0 32 32"><path d="M10 20.5l3.4-5M18.6 15.5l3.4 5" stroke="#9cc4ee" stroke-width="2.2" stroke-linecap="round"/><circle cx="7.5" cy="24" r="5.2" fill="#3f8ee0"/><circle cx="16" cy="11" r="5.2" fill="#5fa3ea"/><circle cx="24.5" cy="24" r="5.2" fill="#86bbf2"/><g font-family="Fredoka,Arial" font-weight="700" font-size="7.5" fill="#fff" text-anchor="middle"><text x="7.5" y="26.7">1</text><text x="16" y="13.7">2</text><text x="24.5" y="26.7">3</text></g></svg>';
GICON.peep = '<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="6" fill="#3a3760"/><rect x="11" y="3" width="10" height="26" fill="#fff4c9"/><rect x="3" y="11" width="26" height="10" fill="#fff4c9"/><rect x="11" y="11" width="10" height="10" rx="2" fill="#fff" stroke="#f0a92e" stroke-width="2"/><circle cx="16" cy="16" r="2.2" fill="#43385a"/></svg>';
GICON.star = '<svg viewBox="0 0 32 32"><path d="M3.5 27l10-8.5" stroke="#ffe08a" stroke-width="3.4" stroke-linecap="round" opacity=".75"/><path d="M8 30l6.5-5.5" stroke="#ffd36b" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M21 3.5l2.5 5.1 5.6.7-4.1 3.8 1.1 5.5-5.1-2.8-4.9 2.8 1-5.5-4.1-3.8 5.6-.7z" fill="#f7c531" stroke="#e09b12" stroke-width="1" stroke-linejoin="round"/></svg>';
GICON.rev = '<svg viewBox="0 0 32 32"><rect x="1.5" y="8.5" width="11" height="15" rx="3" fill="#ffe0e5"/><rect x="19.5" y="8.5" width="11" height="15" rx="3" fill="#ffe0e5"/><g font-family="Fredoka,Arial" font-weight="700" font-size="10" fill="#c0405a" text-anchor="middle"><text x="7" y="19.8">1</text><text x="25" y="19.8">4</text></g><path d="M13.6 13h4.8M16.6 11.2l1.8 1.8-1.8 1.8M18.4 19h-4.8M15.4 17.2 13.6 19l1.8 1.8" stroke="#e0566b" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
GICON.dice = '<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="5.5" fill="#fff" stroke="#5c6bc0" stroke-width="1.8"/><g fill="#5c6bc0"><circle cx="11" cy="11" r="2.2"/><circle cx="21" cy="11" r="2.2"/><circle cx="11" cy="21" r="2.2"/><circle cx="21" cy="21" r="2.2"/></g></svg>';
GICON.sleepy = '<svg viewBox="0 0 32 32"><path d="M19 6a11 11 0 1 0 8.5 17.5A9.5 9.5 0 0 1 19 6z" fill="#b3a5e0"/><path d="M8.5 18.5q1.6 1.6 3.2 0M14.5 18.5q1.6 1.6 3.2 0" stroke="#4a3d7a" stroke-width="1.3" fill="none" stroke-linecap="round"/><g font-family="Fredoka,Arial" font-weight="700" fill="#8e7cc3"><text x="22" y="10" font-size="6.5">z</text><text x="26" y="6" font-size="5">z</text></g></svg>';
const BALLOON = c => `<svg viewBox="0 0 40 56"><path d="M20 41q-3 5 0 10t-1 5" stroke="#a08a96" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="19" rx="15" ry="18" fill="${c}"/><path d="M17.6 36h4.8L20 40z" fill="${c}"/><ellipse cx="13.5" cy="11.5" rx="3.6" ry="5.6" fill="#fff" opacity=".5" transform="rotate(-20 13.5 11.5)"/><circle cx="15" cy="20" r="1.5" fill="#43385a"/><circle cx="25" cy="20" r="1.5" fill="#43385a"/><path d="M18 23.5q2 1.6 4 0" stroke="#43385a" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`;
const DICE = d => `<svg viewBox="0 0 40 40"><rect x="3" y="3" width="34" height="34" rx="9" fill="#fff" stroke="#5c6bc0" stroke-width="2.4"/><g fill="#3d4a9e">${({ 1: [[20, 20]], 2: [[12, 12], [28, 28]], 3: [[11, 11], [20, 20], [29, 29]], 4: [[12, 12], [28, 12], [12, 28], [28, 28]] })[d].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${d === 1 ? 5 : 4}"/>`).join('')}</g></svg>`;
const PCOL = ['#c35bd6', '#ff8a3d', '#3fb4e8', '#5cc46a'];
const CLOUD = '<svg viewBox="0 0 100 62"><g fill="#fff"><circle cx="30" cy="36" r="20"/><circle cx="52" cy="26" r="24"/><circle cx="74" cy="36" r="19"/><rect x="12" y="34" width="78" height="24" rx="12"/></g><circle cx="44" cy="39" r="2.4" fill="#43385a"/><circle cx="60" cy="39" r="2.4" fill="#43385a"/><path d="M49 44q3 2.4 6 0" stroke="#43385a" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="37" cy="45" rx="3.5" ry="2" fill="#ffc2d4"/><ellipse cx="67" cy="45" rx="3.5" ry="2" fill="#ffc2d4"/></svg>';
const gic = (id, cls = 'gi') => `<i class="${cls}" style="--gc:${GCOL[id]}">${GICON[id]}</i>`;
// digits as fruits: strawberry, lemon, grapes, melon
const FRUIT = [
  '<svg viewBox="0 0 40 40"><path d="M20 11c7-4 14 1 13 9-1 8-7 14-13 16-6-2-12-8-13-16-1-8 6-13 13-9z" fill="#ff5a6e"/><path d="M13 7c3 1 4 3 7 4 3-1 4-3 7-4-1 4-4 6-7 6s-6-2-7-6z" fill="#4fbf6a"/><g fill="#ffe08a"><circle cx="15" cy="19" r="1.1"/><circle cx="21" cy="18" r="1.1"/><circle cx="26" cy="21" r="1.1"/><circle cx="17" cy="25" r="1.1"/><circle cx="23" cy="27" r="1.1"/><circle cx="13" cy="25" r="1.1"/></g><circle cx="16.5" cy="22.5" r="1.4" fill="#5a2a3a"/><circle cx="23.5" cy="22.5" r="1.4" fill="#5a2a3a"/><path d="M18.5 25.5q1.5 1.3 3 0" stroke="#5a2a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="21" rx="14" ry="11" fill="#ffd84a" transform="rotate(-20 20 21)"/><path d="M5 26q-1-3 2-4M35 16q1 3-2 4" stroke="#f0b52a" stroke-width="2" stroke-linecap="round"/><path d="M24 9q3-4 7-3-2 3-7 3z" fill="#4fbf6a"/><circle cx="16" cy="21" r="1.4" fill="#6a5020"/><circle cx="23" cy="19" r="1.4" fill="#6a5020"/><path d="M18 24q2 1.3 3.6-.6" stroke="#6a5020" stroke-width="1.1" fill="none" stroke-linecap="round"/><ellipse cx="13" cy="16" rx="3" ry="1.5" fill="#fff" opacity=".6" transform="rotate(-20 13 16)"/></svg>',
  '<svg viewBox="0 0 40 40"><path d="M20 8q1-4 5-4" stroke="#7a5a3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M21 7q6-3 9 1-5 2-9-1z" fill="#4fbf6a"/><g fill="#9a62e0">' + [[14, 13], [21, 12], [27, 14], [17, 19], [24, 19], [12, 20], [20, 25], [27, 21], [16, 26], [23, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6"/>`).join('') + '</g><g fill="#fff" opacity=".45">' + [[13, 12], [20, 11], [16, 18], [23, 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('') + '</g><circle cx="18" cy="21" r="1.3" fill="#2e1a4a"/><circle cx="23" cy="21" r="1.3" fill="#2e1a4a"/></svg>',
  '<svg viewBox="0 0 40 40"><circle cx="20" cy="21" r="14" fill="#8fdc7a"/><path d="M20 7v28M8 15q12 7 24 0M8 27q12-7 24 0M12 10q8 11 0 22M28 10q-8 11 0 22" stroke="#5fb64e" stroke-width="1.3" fill="none" opacity=".75"/><path d="M20 7q2-4 6-3" stroke="#7a5a3a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="16" cy="22" r="1.5" fill="#2e4a2a"/><circle cx="24" cy="22" r="1.5" fill="#2e4a2a"/><path d="M18.3 25.5q1.7 1.4 3.4 0" stroke="#2e4a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/><ellipse cx="13" cy="15" rx="3.5" ry="2" fill="#fff" opacity=".5" transform="rotate(-30 13 15)"/></svg>',
];
const BUG = '<svg viewBox="0 0 60 60"><ellipse cx="30" cy="54" rx="16" ry="3.5" fill="#000" opacity=".12"/><g class="legs" stroke="#43385a" stroke-width="2.6" stroke-linecap="round"><path d="M17 30l-7-3M16 38l-8 1M18 45l-6 5M43 30l7-3M44 38l8 1M42 45l6 5"/></g><ellipse cx="30" cy="37" rx="15" ry="15" fill="#ff6b6b"/><path d="M30 22v30" stroke="#8a2a3a" stroke-width="2"/><circle cx="23" cy="34" r="3.4" fill="#8a2a3a"/><circle cx="37" cy="34" r="3.4" fill="#8a2a3a"/><circle cx="24" cy="44" r="2.6" fill="#8a2a3a"/><circle cx="36" cy="44" r="2.6" fill="#8a2a3a"/><ellipse cx="24" cy="29" rx="4" ry="2" fill="#fff" opacity=".45" transform="rotate(-30 24 29)"/><circle cx="30" cy="20" r="9" fill="#43385a"/><circle cx="26.5" cy="19" r="2.6" fill="#fff"/><circle cx="33.5" cy="19" r="2.6" fill="#fff"/><circle cx="27" cy="19.5" r="1.3" fill="#43385a"/><circle cx="33" cy="19.5" r="1.3" fill="#43385a"/><ellipse cx="23.5" cy="23" rx="2" ry="1.2" fill="#ff9fb8"/><ellipse cx="36.5" cy="23" rx="2" ry="1.2" fill="#ff9fb8"/><path class="mouth" d="M28 24q2 1.6 4 0" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M26 12q-3-6-7-6M34 12q3-6 7-6" stroke="#43385a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="19" cy="6" r="2.2" fill="#ffd36b"/><circle cx="41" cy="6" r="2.2" fill="#ffd36b"/></svg>';
const WATCH = (sec, col) => `<svg viewBox="0 0 48 48"><rect x="20" y="2" width="8" height="5" rx="2" fill="${col}"/><path d="M36 9l3-3 3 3-3 3" fill="${col}"/><circle cx="24" cy="27" r="18" fill="#fff" stroke="${col}" stroke-width="4"/><circle cx="24" cy="27" r="13.5" fill="${col}" opacity=".14"/><path d="M24 27V16" stroke="${col}" stroke-width="3" stroke-linecap="round"/><path d="M24 27L${(24 + Math.sin(sec / 90 * 6.283) * 11).toFixed(1)} ${(27 - Math.cos(sec / 90 * 6.283) * 11).toFixed(1)}" stroke="#43385a" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="27" r="2.6" fill="#43385a"/></svg>`;
const BOLT = '<svg viewBox="0 0 24 24"><path d="M13.5 2 4.5 13.5H11L9.5 22l10-12.5H13z" fill="#ffcd3c" stroke="#e09b12" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const SHOE = '<svg viewBox="0 0 64 64"><path d="M8 44c0-8 4-14 8-18l6 4 6-10c6 2 10 8 14 12 6 2 14 4 14 10v4H8z" fill="#ff8f6b"/><path d="M8 48h48v4a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#fff" stroke="#e9d6cf" stroke-width="2"/><path d="M24 30l6 3M27 26l6 3M30 22l5 3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M2 30h10M0 37h8M4 23h8" stroke="#ffd0bf" stroke-width="3" stroke-linecap="round"/></svg>';

/* ================= storage ================= */
function S() {
  const D = C.DB;
  const s = D.sp = D.sp && typeof D.sp === 'object' ? D.sp : {};
  s.d = s.d || {}; s.cc = s.cc || {};          // course records (v2 layout; the old v1 records in s.c are not used)
  s.ach = s.ach || {}; s.rw = s.rw || {};
  s.sc = Object.assign({ tot: 0, m: {} }, s.sc || {});
  s.st = Object.assign({ solved: 0, runs: 0, combo: 0, flash: 0, gs: {}, time: 0 }, s.st || {});
  return s;
}
const rkey = (ci, pi) => DATA.cats[ci].nk + '.' + pi;   // stable across layout changes
const rec = (ci, pi) => S().cc[rkey(ci, pi)];
const catClears = ci => { let n = 0; for (let p = 0; p < catLen(ci); p++) if (rec(ci, p)) n++; return n; };
const catStars = ci => { let n = 0; for (let p = 0; p < catLen(ci); p++) { const r = rec(ci, p); if (r) n += r.s; } return n; };
const tierCats = tr => DATA ? DATA.cats.map((c, i) => (c.tier === tr ? i : -1)).filter(i => i >= 0).sort((a, b) => (DATA.cats[a].o ?? a) - (DATA.cats[b].o ?? b)) : [];
const tierClears = tr => tierCats(tr).reduce((a, ci) => a + catClears(ci), 0);
const tierLen = tr => tierCats(tr).reduce((a, ci) => a + catLen(ci), 0);
const TIER_NEED = 40;
const tierOpen = tr => true;   // every difficulty is open: stage 1 of each category can be played right away
const stageOpen = (ci, pi) => DEBUG && /unlock/.test(location.search) || tierOpen(DATA.cats[ci].tier) && (pi === 0 || !!rec(ci, pi - 1) || !!rec(ci, pi));
const ccv = () => Object.entries(S().cc).filter(([k]) => k.startsWith('s')).map(([, v]) => v);   // v2 keys start with the course id
const totalClears = () => ccv().length;
const totalStars = () => ccv().reduce((a, r) => a + (r.s || 0), 0);
const dayRec = (ds, d) => (S().d[ds] || {})[d];
function addPts(n) {
  if (n <= 0) return;
  const s = S(), ym = C.thisMonth();
  s.sc.tot += n; s.sc.m[ym] = (s.sc.m[ym] || 0) + n;
  C.DB.pts += n; C.DB.ptsAll += n;                       // coins are shared with まいにち数独
}
const monthPts = ym => S().sc.m[ym || C.thisMonth()] || 0;
function dayTier(ds) { const r = S().d[ds]; if (!r) return 0; let m = 0; for (const d of DK) if (r[d] && r[d].m) m = Math.max(m, DT[d]); return m; }
function streakInfo() {
  const td = C.today(); let cur = 0, d = dayTier(td) ? td : C.addDays(td, -1);
  while (dayTier(d)) { cur++; d = C.addDays(d, -1); }
  const days = Object.keys(S().d).filter(dayTier).sort(); let best = 0, run = 0, prev = null;
  for (const ds of days) { run = prev && C.addDays(prev, 1) === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
  return { cur, best: Math.max(best, cur) };
}

/* ================= points ================= */
const LVP = { 1: 10, 2: 14, 3: 18, 4: 24 };
const puzPts = (lv, g, combo) => Math.round((LVP[lv] + SE.parseG(g).length * 8) * (1 + .1 * Math.min(combo, 10)));
const starMul = { 1: 1, 2: 1.3, 3: 1.6 };
const dScore = (c, tlast) => c * 100000 + (99999 - Math.min(99999, Math.round(tlast || 0)));
/* from 2026-10-22 the daily ranking goes by score (points incl. combos), ties → who finished sooner.
   Stored as SOFF + pts·1000 + time part, so it always beats the old count-based values (Firebase only lets s go up). */
const SCORE_DAY = '2026-10-22', SOFF = 10000000;
const dBest = (ds, r) => (!r || r.c == null ? -1 : ds >= SCORE_DAY ? SOFF + Math.min(19999, r.p || 0) * 1000 + (999 - Math.min(999, Math.round((r.t || 0) / 100))) : dScore(r.c, r.t));
const dval = r => (r.s >= SOFF ? C.fmtN(Math.floor((r.s - SOFF) / 1000)) + ' pt' : t('sp.cnt', { n: r.c }));   // what a ranking row shows

/* ================= rewards (backgrounds & speed-only characters) ================= */
const BGS = ['speedway', 'clocktown', 'skyrail', 'rocketbase', 'cloudtrack', 'beachrun', 'neoncity', 'rainbowrun'];
const SPI = n => 500 + n;                                // speed character icons 500…536 (icons.js)
// achievement id → reward
const REWARD = {
  // every difficulty cleared → its own background
  'tier0': { bg: 'clocktown' }, 'tier1': { bg: 'skyrail' }, 'tier2': { bg: 'rocketbase' }, 'tier5': { bg: 'cloudtrack' }, 'tier6': { bg: 'beachrun' }, 'tier3': { bg: 'neoncity' }, 'tier4': { bg: 'rainbowrun' },
  // every special-rule course cleared → a character
  'gc.bug': { ic: SPI(0) }, 'gc.mosaic': { ic: SPI(1) }, 'gc.spin': { ic: SPI(2) }, 'gc.spot': { ic: SPI(3) }, 'gc.fruit': { ic: SPI(4) }, 'gc.shuffle': { ic: SPI(5) }, 'gc.ghost': { ic: SPI(6) }, 'gc.ice': { ic: SPI(7) },
  ...Object.fromEntries(['bomb', 'swap', 'cloud', 'calc', 'card', 'mole', 'upside', 'balloon', 'dark', 'sway', 'paint', 'order', 'peep', 'star', 'rev', 'dice', 'sleepy'].map((g, k) => ['gc.' + g, { ic: SPI(20 + k) }])),
  'med50': { ic: SPI(8) }, 'sk7': { ic: SPI(9) }, 'cc250': { ic: SPI(10) }, 'cc500': { ic: SPI(11) },
  'first': { ic: SPI(12) }, 'med10': { ic: SPI(13) }, 'gold30': { ic: SPI(14) }, 'sk30': { ic: SPI(15) },
  'sv500': { ic: SPI(16) }, 'sv2000': { ic: SPI(17) }, 'combo30': { ic: SPI(18) }, 'flash': { ic: SPI(19) },
};
const bgOwned = k => k === 'speedway' || !!S().rw['bg:' + k] || DEBUG && /unlock/.test(location.search);
const bgCond = k => { const id = Object.keys(REWARD).find(a => REWARD[a].bg === k); return id ? (catalog().find(a => a.id === id) || {}).name : ''; };

/* ================= achievements ================= */
function catalog() {
  const s = S(), out = [];
  const add = (group, id, ok, tier, icon, name, desc, prog) => out.push({ group, id, got: !!ok, tier, icon, name, desc, prog, rw: REWARD[id] });
  const days = Object.keys(s.d), runs = days.reduce((a, ds) => a + DK.reduce((b, d) => b + ((s.d[ds][d] || {}).a || 0), 0), 0);
  const medals = days.reduce((a, ds) => a + DK.filter(d => (s.d[ds][d] || {}).m).length, 0);
  const golds = days.filter(ds => (s.d[ds][90] || {}).m).length, sk = streakInfo();
  const best = d => days.reduce((a, ds) => Math.max(a, (s.d[ds][d] || {}).c || 0), 0);
  add('daily', 'first', runs >= 1, 1, 'check', t('sa.first'), t('sa.first.d'));
  [[10, 1, 'med10'], [50, 2, 'med50'], [150, 3, 'med150'], [365, 4, 'med365']].forEach(([n, ti, id]) => add('daily', id, medals >= n, ti, 'medals', t('sa.med', { n }), t('sa.med.d', { n }), [medals, n]));
  [[10, 2, 'gold10'], [30, 3, 'gold30'], [100, 4, 'gold100']].forEach(([n, ti, id]) => add('daily', id, golds >= n, ti, 'crown', t('sa.gold', { n }), t('sa.gold.d', { n }), [golds, n]));
  [[3, 1, 'sk3'], [7, 2, 'sk7'], [30, 3, 'sk30'], [100, 4, 'sk100']].forEach(([n, ti, id]) => add('daily', id, sk.best >= n, ti, 'flame', t('sa.sk', { n }), t('sa.sk.d', { n }), [sk.best, n]));
  [[30, 6, 9], [60, 9, 13], [90, 11, 16]].forEach(([d, a, b]) => { const v = best(d); add('daily', 'best' + d + 'a', v >= a, 2, String(a), t('sa.best', { s: dsec(d), n: a }), t('sa.best.d', { s: dsec(d), n: a }), [v, a]); add('daily', 'best' + d + 'b', v >= b, 3, String(b), t('sa.best', { s: dsec(d), n: b }), t('sa.best.d', { s: dsec(d), n: b }), [v, b]); });
  const cc = totalClears(), st = totalStars();
  [[20, 1, 'cc20'], [100, 2, 'cc100'], [200, 3, 'cc250'], [nAll() || 330, 4, 'cc500']].forEach(([n, ti, id]) => add('col', id, cc >= n, ti, String(n), n === nAll() ? t('sa.ccall') : t('sa.cc', { n }), t('sa.cc.d', { n }), [cc, n]));
  [[100, 1, 'st150'], [400, 2, 'st600'], [nAll() * 3 || 990, 4, 'st1500']].forEach(([n, ti, id]) => add('col', id, st >= n, ti, 'star', t('sa.st', { n }), t('sa.st.d', { n }), [st, n]));
  for (const tr of TORDER) { const c = tierClears(tr), L = tierLen(tr) || 1; add('col', 'tier' + tr, c >= L, tr === 5 ? 3 : Math.min(4, tr + 1), 'map', t('sa.tier', { t: t('sp.tier.' + tr) }), t('sa.tier.d', { t: t('sp.tier.' + tr) }), [c, L]); }
  if (DATA) GORDER.forEach(g => { const ci = DATA.cats.findIndex(c => c.g === g); const c = ci >= 0 ? catClears(ci) : 0; add('col', 'gc.' + g, ci >= 0 && c >= catLen(ci), 3, 'puzzle', t('sa.gc', { g: t('g.' + g) }), t('sa.gc.d', { g: t('g.' + g) }), [c, ci >= 0 ? catLen(ci) : 10]); });
  add('col', 'perfcat', DATA && DATA.cats.some((_, ci) => catStars(ci) >= catLen(ci) * 3), 3, 'heart', t('sa.perfcat'), t('sa.perfcat.d'));
  [[50, 1, 'sv50'], [500, 2, 'sv500'], [2000, 3, 'sv2000'], [5000, 4, 'sv5000']].forEach(([n, ti, id]) => add('chal', id, s.st.solved >= n, ti, 'check', t('sa.sv', { n }), t('sa.sv.d', { n }), [s.st.solved, n]));
  [[10, 2, 'combo10'], [30, 3, 'combo30']].forEach(([n, ti, id]) => add('chal', id, s.st.combo >= n, ti, 'flame', t('sa.combo', { n }), t('sa.combo.d', { n }), [s.st.combo, n]));
  add('chal', 'flash', s.st.flash >= 1, 3, 'clock', t('sa.flash'), t('sa.flash.d'));
  const gseen = GORDER.filter(g => s.st.gs[g]).length;
  add('chal', 'gall', gseen >= GORDER.length, 2, 'puzzle', t('sa.gall'), t('sa.gall.d'), [gseen, GORDER.length]);
  [[30, 1, 'runs30'], [300, 3, 'runs300']].forEach(([n, ti, id]) => add('chal', id, runs >= n, ti, 'cal', t('sa.runs', { n }), t('sa.runs.d', { n }), [runs, n]));
  add('chal', 'nomiss', !!s.st.nomiss, 2, 'heart', t('sa.nomiss'), t('sa.nomiss.d'));
  return out;
}
/* award new achievements and their rewards; returns the newly earned ones */
function syncAch(report) {
  const s = S(), fresh = [];
  for (const a of catalog()) {
    if (!a.got) continue;
    const prev = s.ach[a.id];
    if (!prev || prev < a.tier) { s.ach[a.id] = a.tier; if (report) fresh.push(a); }
    if (a.rw) {
      if (a.rw.bg && !s.rw['bg:' + a.rw.bg]) { s.rw['bg:' + a.rw.bg] = 1; if (report) a.newBg = a.rw.bg; }
      if (a.rw.ic != null && !s.rw['ic:' + a.rw.ic]) { s.rw['ic:' + a.rw.ic] = 1; C.DB.icons[a.rw.ic] = (C.DB.icons[a.rw.ic] || 0) + 1; if (report) a.newIc = a.rw.ic; }
    }
  }
  return fresh;
}
function announce(fresh) {
  fresh.forEach((a, k) => setTimeout(() => {
    C.toast(`${C.badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`);
    if (a.newBg) setTimeout(() => C.toast(`<span class="rwt">${bgThumb(a.newBg)}</span><span><b>${esc(t('sp.rw.bg'))}</b><small>${esc(t('sbg.' + a.newBg))}</small></span>`, 'gold'), 900);
    if (a.newIc != null) setTimeout(() => C.toast(`<span class="rwt ic">${C.iconSvg(a.newIc)}</span><span><b>${esc(t('sp.rw.ic'))}</b><small>${esc(C.iconName(a.newIc))}</small></span>`, 'gold'), 900);
  }, k * 500));
  if (fresh.length) { C.SFX.ach(); C.achNew(true); }
}
const bgThumb = k => C.BG.svg(k, 160, 100, '', 'day');

/* ================= home ================= */
let homeTab = null, calMonth = null, dxDiff = 60;
const ensureData = () => !!DATA;
function dGimmickRow(ds) {
  const all = SE.dailyGimmicks(ds, 90);
  return `<div class="sgl">${all.map((g, k) => `<div class="sgline">${gic(g)}<span><b>${esc(t('g.' + g))}</b><small>${esc(t('g.' + g + '.d'))}</small></span><em>${DK.filter(d => SE.dailyGimmicks(ds, d).includes(g)).map(d => dsec(d, ds) + t('sp.sec')).join(' · ')}</em></div>`).join('')}</div>`;
}
function todayCard(compact) {
  const td = C.today(), sk = streakInfo();
  const btn = d => {
    const r = dayRec(td, d), a = r ? r.a || 0 : 0, left = Math.max(0, LIMIT_TRIES - a);
    const st = r && r.c != null ? t('sp.best', { n: r.c }) : t('sp.goal', { n: SE.dgoal(td, d) });
    return `<button class="dbtn sdbtn ${r && r.m ? 'done' : ''}" data-sd="${d}" style="--wc:${['#e0905a', '#7d93b8', '#e0a91c'][DT[d] - 1]}">${WATCH(dsec(d), ['#e0905a', '#7d93b8', '#e0a91c'][DT[d] - 1])}<span class="lb">${esc(t('sp.dn', { s: dsec(d) }))}</span><span class="st">${esc(st)}</span><span class="tries">${[0, 1, 2].map(k => `<i class="${k < a ? 'used' : ''}"></i>`).join('')}</span>${r && r.m ? `<span class="smed">${C.miniMedal(DT[d])}</span>` : ''}${!left ? `<span class="resume">${esc(t('sp.practice'))}</span>` : ''}</button>`;
  };
  return `<h2>${BOLT.replace('<svg', '<svg class="ttl-ico"')}<span>${esc(t('sp.today'))}</span>${compact ? `<a class="sub sopen" href="${C.speedUrl}">${esc(t('sp.openapp'))} ›</a>` : ''}</h2>
    <div class="date"><span>${esc(C.fmtDate(td, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }))}</span><span class="streak ${sk.cur ? '' : 'zero'}">${C.FLAME}${esc(sk.cur ? t('streak', { n: sk.cur }) : t('streak0'))}</span></div>
    <div class="diffs">${DK.map(btn).join('')}</div>
    <div class="sgh">${esc(t('sp.todayg'))}</div>${dGimmickRow(td)}
    <p class="note">${esc(t('sp.daily.note', { n: LIMIT_TRIES }))}</p>`;
}
function wireToday(host) {
  host.querySelectorAll('[data-sd]').forEach(b => b.onclick = () => { C.SFX.tap(); C.go('s/d/' + b.dataset.sd); });
}
async function extraCard(host) {
  if (!host) return;
  const goals = catalog().filter(a => !a.got && a.prog && a.prog[1] > 0).map(a => Object.assign({ r: Math.min(1, a.prog[0] / a.prog[1]) }, a)).sort((x, y) => y.r - x.r || x.prog[1] - y.prog[1]).slice(0, 3);
  const goalsH = `<div class="dx"><h3>${C.badge(1, 'star').replace('<svg', '<svg style="width:22px;height:22px"')}${esc(t('dx.goals'))}</h3>${goals.map(a => `<div class="goal">${C.badge(a.tier, a.icon)}<div class="gt2"><b>${esc(a.name)}${a.rw ? ' <span class="rwchip">🎁</span>' : ''}</b><div class="bar"><i style="width:${(a.r * 100).toFixed(1)}%"></i></div></div><small>${Math.min(a.prog[0], a.prog[1])}/${a.prog[1]}</small></div>`).join('')}</div>`;
  const chips = `<div class="chips">${DK.map(d => `<button data-dd="${d}" class="${d === dxDiff ? 'on' : ''}">${esc(t('sp.dn', { s: dsec(d) }))}</button>`).join('')}</div>`;
  const head = `<h3>${C.badge(3, 'podium').replace('<svg', '<svg style="width:22px;height:22px"')}${esc(t('dx.rank'))}${chips}</h3>`;
  const body = h => { const box = host.querySelector('#sdxRank'); if (!box) return; box.innerHTML = head + h; box.querySelectorAll('[data-dd]').forEach(b => b.onclick = () => { dxDiff = +b.dataset.dd; C.SFX.tap(); extraCard(host); }); };
  host.innerHTML = `<div class="dx" id="sdxRank">${head}<div class="rkmsg" style="padding:10px">${esc(t('rk.loading'))}</div></div>` + goalsH + `<div class="dx sbtnrow"><button class="btn sm ghost" data-a="ach">${esc(t('sp.ach'))}</button><button class="btn sm ghost" data-a="rank">${esc(t('sp.rank'))}</button><button class="btn sm ghost" data-a="tut">${esc(t('sp.howto'))}</button></div>`;
  host.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { C.SFX.tap(); ({ ach: openAch, rank: openRank, tut: () => C.tutorial('speed') })[b.dataset.a](); });
  body(`<div class="rkmsg" style="padding:10px">${esc(t('rk.loading'))}</div>`);
  const ON = C.ON;
  if (!ON || !ON.available) { body(`<p class="note">${esc(t('rk.prep'))}</p>`); return; }
  if (!C.DB.prof.name) { body(`<p class="note">${esc(t('dx.noname'))}</p>`); return; }
  try {
    const td = C.today(), d = dxDiff;
    const [rows, mine] = await Promise.all([ON.topScore(`spd/d/${td}/${d}`, 3), ON.myScore(`spd/d/${td}/${d}`)]);
    if (d !== dxDiff) return;
    rows.sort((a, b) => b.s - a.s);
    let h = rows.length ? '<ol class="mini">' + rows.map((r, k) => `<li class="${r.uid === ON.uid ? 'me' : ''}"><span class="no">${C.miniMedal(3 - k)}</span>${C.avatar(r.i, 30)}<span class="nm">${esc(r.n)}</span><span class="vl">${esc(dval(r))}</span></li>`).join('') + '</ol>' : `<p class="note">${esc(t('rk.empty'))}</p>`;
    h += `<p class="note">${mine ? esc(t('sp.dx.mine', { n: C.fmtN(mine.rank), c: dval(mine.me) })) : esc(t('sp.dx.notyet', { d: t('sp.dn', { s: dsec(d) }) }))} <a href="#" class="sdxMore">${esc(t('dx.more'))}</a></p>`;
    body(h);
    const m = host.querySelector('.sdxMore'); if (m) m.onclick = e => { e.preventDefault(); rkTab = 'daily'; rkDiff = d; rkDate = td; openRank(); };
  } catch (e) { body(`<p class="note">${esc(t('rk.err'))}</p>`); }
}
function calCard() {
  const td = C.today(); calMonth = calMonth || td.slice(0, 7);
  const [y, m] = calMonth.split('-').map(Number), first = new Date(y, m - 1, 1), nd = new Date(y, m, 0).getDate();
  const wd = []; for (let i = 0; i < 7; i++) wd.push(new Date(2026, 9, 4 + i).toLocaleDateString(C.locale(), { weekday: 'narrow' }));
  let h = wd.map((w, i) => `<span class="wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${esc(w)}</span>`).join('');
  for (let i = 0; i < first.getDay(); i++) h += '<span class="day empty"></span>';
  for (let d = 1; d <= nd; d++) {
    const ds = calMonth + '-' + String(d).padStart(2, '0'), r = S().d[ds] || {};
    const ms = DK.filter(x => r[x] && r[x].m).map(x => C.miniMedal(DT[x])).join('');
    h += `<span class="day ${ds === td ? 'today' : ''} ${DK.every(x => r[x] && r[x].m) ? 'all3' : ''} ${ds > td ? 'fut' : ''}"><span class="num">${d}</span><span class="ms">${ms}</span></span>`;
  }
  return `<div class="cal-h"><button class="ib flip" data-cal="-1"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(C.fmtMonth(calMonth))}</b><button class="ib flip" data-cal="1" ${calMonth >= td.slice(0, 7) ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div><div class="cal scal">${h}</div><p class="note">${esc(t('sp.cal.note'))}</p>`;
}
function wireCal(host) { host.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => { calMonth = C.addMonths(calMonth, +b.dataset.cal); host.innerHTML = calCard(); wireCal(host); }); }
function catPic(ci) {
  const c = DATA.cats[ci], tr = c.tier, [b1, b2] = TIERBG[tr];
  let inner;
  if (c.kind === 'g') inner = `<span class="cg one">${GICON[c.g]}</span>`;
  else if (c.kind === 'std') inner = `<span class="cg shoe">${SHOE}</span><b class="cno">${ci + 1}</b>`;
  else { const pool = Array.isArray(c.pool) ? c.pool : GORDER; inner = `<span class="cg many">${pool.slice(0, c.kind === 'dbl' ? 2 : 4).map(g => GICON[g]).join('')}</span>`; }
  return `<div class="pic spic" style="--b1:${b1};--b2:${b2}">${inner}</div>`;
}
// the course book is split in two: single-rule courses (問題集) and the mixed-rule courses (ミックス = 上級・達人)
const MIXT = [3, 4];
const MIXICO = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" fill="#c7a8ff"/><rect x="13" y="3" width="8" height="8" rx="4" fill="#ffb36b"/><rect x="3" y="13" width="8" height="8" rx="2" fill="#8fc4ff" transform="rotate(8 7 17)"/><path d="M13 13h8l-4 8z" fill="#ff8fb6"/></svg>';
function colCard(kind) {
  if (!DATA) return '';
  const tiers = TORDER.filter(tr => (kind === 'mix') === MIXT.includes(tr));
  const cats = tiers.flatMap(tierCats), len = cats.reduce((a, ci) => a + catLen(ci), 0), cc = cats.reduce((a, ci) => a + catClears(ci), 0);
  const ico = kind === 'mix' ? MIXICO.replace('<svg', '<svg class="ttl-ico"') : SHOE.replace('<svg', '<svg class="ttl-ico"');
  let h = `<h2>${ico}<span>${esc(t(kind === 'mix' ? 'sp.mix' : 'sp.col'))}</span><span class="sub">${esc(t('sp.cs', { c: cats.length, s: len }))}</span></h2>${kind === 'mix' ? `<p class="note smixd">${esc(t('sp.mix.d'))}</p>` : ''}<div class="col-total"><div class="bar"><i style="width:${cc / (len || 1) * 100}%"></i></div><b class="num">${cc} / ${len}</b></div>`;
  if (tiers.length > 2) h += `<div class="stjump">${tiers.map(tr => `<button data-tj="${tr}" style="--tc:${TIERCOL[tr]}" class="${tierClears(tr) >= tierLen(tr) ? 'done' : ''}"><b>${esc(t('sp.tier.' + tr))}</b><small class="num">${tierClears(tr)}/${tierLen(tr)}</small></button>`).join('')}</div>`;
  for (const tr of tiers) {
    const open = tierOpen(tr), need = 0;
    h += `<div class="stier" id="stier${tr}" style="--tc:${TIERCOL[tr]}"><div class="sth"><b>${esc(t('sp.tier.' + tr))}</b><small>${esc(t('sp.tier.' + tr + '.d'))}</small>${open ? `<em>${tierClears(tr)}/${tierLen(tr)}</em>` : `<em class="lk">${LOCK}${esc(t('sp.tier.lock', { t: t('sp.tier.' + (tr - 1)), n: need }))}</em>`}</div><div class="themes scats">`;
    for (const ci of tierCats(tr)) {
      const n = catClears(ci), c = DATA.cats[ci];
      h += `<button class="tcard scard ${n === catLen(ci) ? 'full' : ''} ${open ? '' : 'locked'}" data-sc="${ci}">${catPic(ci)}<span class="crown">${C.CROWN}</span><div class="tx"><span class="nm">${esc(cname(ci))}</span><span class="lv">${c.kind === 'g' ? `<span class="gchip" style="--gc:${GCOL[c.g]}">${esc(t('g.' + c.g))}</span>` : `<span class="gchip std">${esc(c.kind === 'std' ? t('sp.std.' + [0, 0, 1, 1, 2][Math.min(4, tierCats(0).indexOf(ci))]) : t('sp.kind.' + (c.kind === 'combo' ? 'mix' : c.kind)))}</span>`}</span><span class="pg"><span class="bar"><i style="width:${n / catLen(ci) * 100}%"></i></span>${n}/${catLen(ci)}</span></div></button>`;
    }
    h += '</div></div>';
  }
  return h;
}
function wireCol(host) {
  const tabs = document.getElementById('htabs');
  const setH = () => document.documentElement.style.setProperty('--htH', (tabs && tabs.offsetParent ? tabs.offsetHeight : 0) + 'px');
  setH(); if (!wireCol.rs) { wireCol.rs = 1; addEventListener('resize', setH); }
  host.querySelectorAll('[data-tj]').forEach(b => b.onclick = () => {
    const el = host.querySelector('#stier' + b.dataset.tj), bar = host.querySelector('.stjump');
    if (!el) return; C.SFX.tap(); setH();
    C.homeJump(el, bar);
  });
  host.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => {
    const ci = +b.dataset.sc;
    if (!tierOpen(DATA.cats[ci].tier)) { C.toast(esc(t('sp.locked')), 'msg'); return; }
    C.SFX.tap(); C.go('s/c/' + (ci + 1));
  });
}
/* fill whichever speed containers the page has */
function renderHome() {
  if (!ensureData()) return;
  syncAch(false);
  const fill = (id, html, wire) => { const el = document.getElementById(id); if (el) { el.innerHTML = html; if (wire) wire(el); } return el; };
  fill('spdToday', todayCard(C.MODE !== 'speed'), wireToday);
  fill('spdToday2', todayCard(false), wireToday);
  fill('spdCal', calCard(), wireCal);
  fill('spdCol', colCard('col'), wireCol);
  fill('spdMix', colCard('mix'), wireCol);
  extraCard(document.getElementById('spdExtra'));
}

/* ================= stage list (category screen) ================= */
let curCat = 0;
function openCat(ci) {
  if (!DATA) return;
  curCat = ci; C.show('theme'); $('#theme').classList.remove('ovw');
  C.setScene(spdBg(), '', 'spd');
  const c = DATA.cats[ci], n = catClears(ci);
  $('#tlName').textContent = cname(ci);
  $('#tlProg').innerHTML = `${n}/${catLen(ci)} · ${C.STAR(true).replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} ${catStars(ci)}/${catLen(ci) * 3}`;
  $('#tlBack').onclick = () => C.goHome(MIXT.includes(c.tier) ? 'mix' : 'col');
  const gl = c.kind === 'g' ? [c.g] : Array.isArray(c.pool) ? c.pool : c.pool ? GORDER : [];
  const next = (() => { for (let p = 0; p < catLen(ci); p++) if (!rec(ci, p) && stageOpen(ci, p)) return p; return -1; })();
  $('#tlIntro').innerHTML = `<div class="rulebox scatbox" style="--tc:${TIERCOL[c.tier]}">${catPic(ci)}<div><b>${esc(t('sp.tier.' + c.tier))} · ${esc(cname(ci))}</b><p>${esc(cdesc(ci))}</p></div>${gl.length ? `<div class="sgl mini ${gl.length > 4 ? 'many' : ''}">${gl.map(g => `<div class="sgline">${gic(g)}<span><b>${esc(t('g.' + g))}</b><small>${esc(t('g.' + g + '.d'))}</small></span></div>`).join('')}</div>` : ''}</div>
    <div class="startrow"><button class="btn xl" id="stGo" ${next < 0 ? 'disabled' : ''}>${PLAY}${esc(next < 0 ? t('tl.allclear') : n ? t('st.cont', { n: next + 1 }) : t('st.start'))}</button></div>`;
  $('#stGo').onclick = () => { if (next >= 0) { C.SFX.tap(); C.go('s/c/' + (ci + 1) + '/' + (next + 1)); } };
  $('#tlBody').innerHTML = `<div class="plist sstages">${c.st.map((s, pi) => {
    const r = rec(ci, pi), open = stageOpen(ci, pi);
    return `<button class="pz sst ${r ? 'cleared' : ''} ${pi === next ? 'next' : ''} ${open ? '' : 'locked'}" data-p="${pi}" style="--tc:${TIERCOL[c.tier]}"><span class="n">${pi + 1}</span><span class="kt">${esc(t('sp.kt', { k: s.k, s: s.t }))}</span><span class="stars">${r ? [1, 2, 3].map(q => C.STAR(q <= r.s)).join('') : open ? '' : LOCK}</span>${s.g.some(Boolean) ? `<span class="sgdot">${[...new Set(s.g.filter(Boolean).flatMap(x => SE.parseG(x).map(o => o.id)))].slice(0, 3).map(g => `<i style="background:${GCOL[g]}"></i>`).join('')}</span>` : ''}</button>`;
  }).join('')}</div><p class="note" style="text-align:center">${esc(t('sp.stars.note'))}</p>`;
  $$('#tlBody .sst').forEach(b => b.onclick = () => {
    const pi = +b.dataset.p;
    if (!stageOpen(ci, pi)) { C.toast(esc(t('sp.stlock')), 'msg'); return; }
    C.SFX.tap(); C.go('s/c/' + (ci + 1) + '/' + (pi + 1));
  });
}
const spdBg = () => { const k = C.DB.set.homeBgS; return k && BGS.includes(k) && bgOwned(k) ? k : 'speedway'; };

/* ================= game ================= */
let R = null, raf = 0;
const cells = [];
let built = false;
function buildScreen() {
  if (built) return; built = true;
  const sec = document.createElement('section');
  sec.className = 'screen'; sec.id = 'spd';
  sec.innerHTML = `<div class="sgbar"><button class="ib flip" id="sBack" title=""><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><div class="gt" id="sTitle"></div><div class="gstat"><span class="pill scount" id="sCount"></span><span class="pill mist z" id="sMist"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg><span class="num" id="sMistN">0</span></span><button class="ib spause" id="sPause"><svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg></button></div></div>
    <div class="stimer" id="sTimer"><div class="sbar"><i id="sBarI"></i></div><b class="sclock num" id="sClock">0.0</b><span class="spen" id="sPen"></span><span class="spen sbon" id="sBon"></span></div>
    <div class="sbw" id="sBw"><div class="sgban" id="sBan"></div><div class="sboard" id="sBoard"></div><div class="scov" id="sCov"></div><div class="scombo" id="sCombo"></div></div>
    <div class="sside"><div class="skeys" id="sKeys"></div><div class="sinfo" id="sInfo"></div><div class="help shelp" id="sKb"></div></div>`;
  $('#main').appendChild(sec);
  const b = $('#sBoard');
  for (let i = 0; i < 16; i++) { const el = document.createElement('div'); el.className = 'scell'; el.dataset.i = i; el.innerHTML = '<span class="v"></span><span class="ice"></span><span class="ml">' + GICON.mole + '</span><span class="pt"></span><span class="ot"></span>'; cells[i] = el; b.appendChild(el); }
  b.insertAdjacentHTML('beforeend', `<div class="sspot" id="sSpot"></div><svg class="sgrid" viewBox="0 0 400 400" preserveAspectRatio="none"><path d="M100 0V400M300 0V400M0 100H400M0 300H400" class="thin"/><path d="M200 0V400M0 200H400" class="thick"/></svg><div class="ssel" id="sSel"></div><div class="sbugs" id="sBugs"></div><div class="sclouds" id="sClouds"></div><div class="sfloat" id="sFloat"></div><div class="sdark" id="sDark"></div><div class="ssleep" id="sSleep"><b>Zzz</b></div>`);
  b.addEventListener('pointerdown', boardDown); b.addEventListener('pointermove', boardMove); b.addEventListener('pointerup', boardUp); b.addEventListener('pointercancel', () => hideFlick());
  b.addEventListener('contextmenu', e => e.preventDefault());
  $('#sBack').onclick = () => quit();
  $('#sPause').onclick = () => setPaused(!R || !R.paused);
  const fl = document.createElement('div'); fl.className = 'flick sflick'; fl.id = 'sFlick'; document.body.appendChild(fl);
}
// key shuffle: only the on-screen keys work (no keyboard digits/arrows, no flick)
const keysOnly = () => !!(R && R.gims && R.gims.some(g => g.id === 'shuffle'));
function nudgeKeys() { const k = $('#sKeys'); k.classList.remove('nudge'); void k.offsetWidth; k.classList.add('nudge'); C.SFX.err(); }
const keyOrder = () => (R && R.keyOrder) || [1, 2, 3, 4];
function drawKeys(animate) {
  const host = $('#sKeys'), order = keyOrder();
  const before = {}; if (animate) host.querySelectorAll('.skey').forEach(k => before[k.dataset.d] = k.getBoundingClientRect());
  const pic = R && (R.fruit || R.dice >= 2), small = R && (R.fruit || R.dice === 2);
  host.innerHTML = order.map(d => `<button class="key skey ${pic ? 'fk' : ''}" data-d="${d}">${small ? `<em class="kd">${d}</em>` : ''}<span class="n">${glyph(d)}</span></button>`).join('');
  host.querySelectorAll('.skey').forEach(k => {
    k.addEventListener('pointerdown', e => { e.preventDefault(); keyPress(+k.dataset.d); });
    k.addEventListener('click', e => { if (e.detail === 0) keyPress(+k.dataset.d); });
    if (animate && before[k.dataset.d]) { const a = before[k.dataset.d], b = k.getBoundingClientRect(); k.style.transform = `translate(${a.left - b.left}px,${a.top - b.top}px)`; k.style.transition = 'none'; requestAnimationFrame(() => { k.style.transition = 'transform .32s cubic-bezier(.3,1.3,.5,1)'; k.style.transform = ''; }); }
  });
}
// how a digit is shown: plain number, a fruit, or a die (dice ★1: only the given numbers)
const glyph = (d, given) => (R && R.fruit ? `<span class="fr">${FRUIT[R.fruit[d - 1]]}</span>` : R && R.dice && (R.dice >= 2 || given) ? `<span class="fr dc">${DICE(d)}</span>` : d);
function stageSpec(ci, pi) { return DATA.cats[ci].st[pi]; }
function title() {
  if (!R) return '';
  if (R.mode === 'd') return C.miniMedal(DT[R.d]) + `<span>${esc(t('sp.dn', { s: dsec(R.d, R.date) }))}${R.ranked ? '' : ' · ' + esc(t('sp.practice'))}</span>`;
  return `<span class="tchip" style="background:${TIERCOL[DATA.cats[R.ci].tier]}">${esc(t('sp.tier.' + DATA.cats[R.ci].tier))}</span><span>${esc(cname(R.ci))} #${R.pi + 1}</span>`;
}
function openGame(o) {
  if (!DATA) return;
  buildScreen();
  stopLoop();
  stopGims();
  C.show('spd');
  const s = S();
  R = Object.assign({ k: 0, solved: 0, mist: 0, combo: 0, maxCombo: 0, pts: 0, elapsed: 0, freeze: 0, state: 'brief', paused: false, done: false, sel: -1, gims: [], tlast: 0, ptimes: [] }, o);
  if (o.mode === 'd') {
    const r = dayRec(R.date, o.d); R.ranked = !r || (r.a || 0) < LIMIT_TRIES;
    R.limit = SE.dsec(R.date, o.d) * 1000; R.goal = SE.dgoal(R.date, o.d);
    R.glist = SE.dailyGimmicks(R.date, o.d);
  } else {
    const st = stageSpec(o.ci, o.pi);
    R.limit = st.t * 1000; R.goal = st.k; R.st = st;
    R.glist = [...new Set(st.g.filter(Boolean).flatMap(x => SE.parseG(x).map(q => q.id)))];
  }
  R.left = R.limit;
  C.setScene(spdBg(), '', 'spd');
  $('#sTitle').innerHTML = title();
  $('#sKb').innerHTML = t('sp.kb');
  layout();
  loadPuzzle(0, true);
  briefing();
  render();
  startLoop();
}
function puzzleAt(k) {
  if (R.mode === 'd') return SE.dailyPuzzle(R.date, R.d, k);
  const st = R.st; if (k >= st.k) return null;
  const p = SE.dec(st.p[k]);
  return { p, s: SE.solve(p), lv: st.lv[k], g: st.g[k] || '' };
}
function loadPuzzle(k, quiet) {
  stopGims();
  const P = puzzleAt(k); if (!P) return false;
  R.k = k; R.P = P; R.grid = P.p.slice(); R.user = new Array(16).fill(0);
  R.ice = new Array(16).fill(0); R.mz = new Array(16).fill(0); R.ghostAt = new Array(16).fill(0);
  R.mole = new Array(16).fill(0); R.card = new Array(16).fill(0); R.peek = new Array(16).fill(0); R.calc = new Array(16).fill(''); R.rot = new Array(16).fill('');
  R.paint = new Array(16).fill(0); R.pcol = new Array(16).fill(0); R.ord = new Array(16).fill(0); R.ordNext = 1;
  R.dice = 0; R.peep = 0; R.revc = new Array(16).fill(0); R.lastPut = R.elapsed;
  R.fruit = null; R.keyOrder = [1, 2, 3, 4];
  R.sel = R.grid.indexOf(0);
  R.pStart = R.elapsed;
  R.gspec = SE.parseG(P.g);
  const b = $('#sBoard');
  b.className = 'sboard'; b.style.transform = '';
  $('#sBugs').innerHTML = ''; $('#sClouds').innerHTML = ''; $('#sFloat').innerHTML = '';
  $('#sDark').classList.remove('on'); const zz = $('#sSleep'); zz.style.opacity = 0; zz.classList.remove('z'); 
  R.rng = SE.mulberry32(SE.hashStr('g:' + (R.date || R.ci + '.' + R.pi) + ':' + k));
  R.gims = R.gspec.map(g => ({ id: g.id, s: g.s, st: {} }));
  if (!quiet) startGims();
  drawKeys(false);
  render();
  return true;
}

/* ---------------- gimmicks ---------------- */
const GIM = {
  bug: {
    start(g) {
      const n = g.s >= 3 ? 2 : 1; g.st.bugs = [];
      for (let k = 0; k < n; k++) {
        const el = document.createElement('div'); el.className = 'sbug'; el.innerHTML = BUG; $('#sBugs').appendChild(el);
        const at = [0, 15, 3, 12][(R.rng() * 4) | 0];
        const bug = { el, at, to: at, wait: 600 + k * 900, munch: 0, step: [1700, 1300, 1050][g.s - 1] };
        place(bug, at, true); g.st.bugs.push(bug);
        el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); shoo(bug); });
      }
      function place(bug, i, now) { bug.el.style.transition = now ? 'none' : `left ${bug.step * .8}ms ease-in-out, top ${bug.step * .8}ms ease-in-out`; bug.el.style.left = ((i & 3) * 25) + '%'; bug.el.style.top = ((i >> 2) * 25) + '%'; }
      g.st.place = place;
    },
    tick(g, dt) {
      for (const bug of g.st.bugs) {
        if (bug.munch > 0) {
          bug.munch -= dt;
          if (bug.munch <= 0) { bug.el.classList.remove('munch'); const i = bug.at; if (R.user[i] && !R.P.p[i]) { R.grid[i] = 0; R.user[i] = 0; R.ghostAt[i] = 0; crumbs(i); C.SFX.erase(); render(); } bug.wait = 500; }
          continue;
        }
        bug.wait -= dt; if (bug.wait > 0) continue;
        // walk: prefer a neighbour holding one of your numbers
        const nb = []; const r = bug.at >> 2, c = bug.at & 3;
        [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 4 && cc >= 0 && cc < 4) nb.push(rr * 4 + cc); });
        const tasty = nb.filter(i => R.user[i]);
        const to = tasty.length && R.rng() < .45 + g.s * .12 ? tasty[(R.rng() * tasty.length) | 0] : nb[(R.rng() * nb.length) | 0];
        bug.el.classList.toggle('flip', (to & 3) < c);
        bug.at = to; g.st.place(bug, to); bug.wait = bug.step;
        if (R.user[to]) setTimeout(() => { if (R && bug.at === to && R.user[to]) { bug.munch = [1100, 850, 700][g.s - 1]; bug.el.classList.add('munch'); } }, bug.step * .8);
      }
    },
    stop(g) { (g.st.bugs || []).forEach(b => b.el.remove()); },
  },
  mosaic: {
    start(g) { g.st.next = 900; g.st.on = []; },
    tick(g, dt) {
      g.st.next -= dt;
      g.st.on = g.st.on.filter(o => { o.left -= dt; if (o.left <= 0) { R.mz[o.i] = 0; return false; } return true; });
      if (g.st.next <= 0) {
        g.st.next = [3600, 3000, 2500][g.s - 1];
        const givens = [...Array(16).keys()].filter(i => R.P.p[i] && !R.mz[i]);
        SE.shuffle(givens, R.rng).slice(0, [2, 3, 4][g.s - 1]).forEach(i => { R.mz[i] = 1; g.st.on.push({ i, left: [2600, 2800, 3000][g.s - 1] }); });
      }
      renderMz();
    },
    stop() { R.mz.fill(0); renderMz(); },
  },
  spin: {   // the board turns a quarter at a time (full size; it only overlaps its surroundings while turning)
    start(g) { g.st.a = 0; g.st.from = 0; g.st.to = 0; g.st.t = 1; g.st.next = 1400; $('#sBoard').classList.add('spinning'); },
    tick(g, dt) {
      const gap = [5200, 3800, 2800][g.s - 1], dur = [900, 750, 620][g.s - 1];
      if (g.st.t < 1) {
        g.st.t = Math.min(1, g.st.t + dt / dur);
        const e = g.st.t < .5 ? 2 * g.st.t * g.st.t : 1 - Math.pow(-2 * g.st.t + 2, 2) / 2;
        g.st.a = g.st.from + (g.st.to - g.st.from) * e;
        $('#sBoard').style.transform = `rotate(${g.st.a.toFixed(2)}deg)`;
        $('#sBoard').classList.toggle('turning', g.st.t < 1);
        return;
      }
      g.st.next -= dt;
      if (g.st.next <= 0) { g.st.next = gap; g.st.from = g.st.a; g.st.to = g.st.a + (g.s >= 3 && R.rng() < .4 ? -90 : 90) * (g.s >= 2 && R.rng() < .25 ? 2 : 1); g.st.t = 0; C.SFX.note(); }
    },
    stop() { const b = $('#sBoard'); b.style.transform = ''; b.classList.remove('spinning', 'turning'); },
  },
  spot: {
    start(g) { g.st.ph = R.rng() * 6.28; $('#sBoard').classList.add('spot'); g.st.r = [50, 43, 37][g.s - 1]; },
    tick(g, dt) {
      g.st.ph += dt / [2300, 1900, 1600][g.s - 1];
      const x = 50 + Math.sin(g.st.ph * 1.3) * 32, y = 50 + Math.sin(g.st.ph * .9 + 1.2) * 32;
      const sp = $('#sSpot'); sp.style.setProperty('--sx', x.toFixed(1) + '%'); sp.style.setProperty('--sy', y.toFixed(1) + '%'); sp.style.setProperty('--sr', g.st.r + '%');
    },
    stop() { $('#sBoard').classList.remove('spot'); },
  },
  fruit: {
    start(g) { R.fruit = g.s >= 2 ? SE.shuffle([0, 1, 2, 3], R.rng) : [0, 1, 2, 3]; drawKeys(false); render(); },
    tick() {}, stop() {},
  },
  shuffle: {
    start(g) { g.st.next = [3800, 2600, 1700][g.s - 1]; },
    tick(g, dt) {
      g.st.next -= dt;
      if (g.st.next <= 0) { g.st.next = [3800, 2600, 1700][g.s - 1]; let o; do o = SE.shuffle([1, 2, 3, 4], R.rng); while (o.join() === R.keyOrder.join()); R.keyOrder = o; drawKeys(true); C.SFX.note(); }
    },
    stop() {},
  },
  ghost: {
    start() {},
    tick(g) {
      const now = R.elapsed, fade = [3000, 2000, 1200][g.s - 1];
      let ch = false;
      for (let i = 0; i < 16; i++) if (R.user[i] && R.ghostAt[i] > 0 && now - R.ghostAt[i] > fade) { R.ghostAt[i] = -1; cells[i].classList.add('gh'); ch = true; }
      if (ch) C.SFX.note();
    },
    stop() { cells.forEach(c => c.classList.remove('gh')); },
  },
  bomb: {   // a bomb on an empty cell: fill it before the fuse burns down, or lose 3 seconds
    start(g) { g.st.wait = 700; g.st.at = -1; },
    tick(g, dt) {
      const fuse = [6500, 5000, 3800][g.s - 1];
      if (g.st.at >= 0 && R.grid[g.st.at]) { cells[g.st.at].classList.remove('bomb'); g.st.at = -1; g.st.wait = 600; C.SFX.unit(); }
      if (g.st.at < 0) {
        g.st.wait -= dt; if (g.st.wait > 0) return;
        const empties = [...Array(16).keys()].filter(i => !R.grid[i] && !R.ice[i] && !R.mole[i]);
        if (!empties.length) return;
        g.st.at = empties[(R.rng() * empties.length) | 0]; g.st.left = fuse;
        cells[g.st.at].classList.add('bomb'); C.SFX.note();
      }
      g.st.left -= dt;
      cells[g.st.at].style.setProperty('--fuse', Math.max(0, g.st.left / fuse).toFixed(3));
      if (g.st.left <= 0) {
        const el = cells[g.st.at]; el.classList.remove('bomb'); el.classList.remove('boom'); void el.offsetWidth; el.classList.add('boom'); setTimeout(() => el.classList.remove('boom'), 600);
        R.left -= 3000; R.combo = 0; R.missThis = true;
        const pen = $('#sPen'); pen.textContent = '-3'; pen.classList.remove('on'); void pen.offsetWidth; pen.classList.add('on');
        C.SFX.rumble(); C.vib([40, 30, 40]); g.st.at = -1; g.st.wait = 900; render();
        if (R.left <= 0) timeUp();
      }
    },
    stop(g) { cells.forEach(c => c.classList.remove('bomb')); },
  },
  swap: {   // two rows (or, from ★2, columns) of the same band trade places — the puzzle stays valid
    start(g) { g.st.next = [5200, 4000, 3000][g.s - 1] * .7; g.st.busy = false; },
    tick(g, dt) {
      if (g.st.busy) return;
      g.st.next -= dt; if (g.st.next > 0) return;
      g.st.next = [5200, 4000, 3000][g.s - 1];
      const col = g.s >= 2 && R.rng() < .5, band = R.rng() < .5 ? 0 : 2, a = band, b = band + 1;
      const idx = (k, j) => (col ? j * 4 + k : k * 4 + j);           // k = line number, j = position along it
      g.st.busy = true;
      for (let j = 0; j < 4; j++) { cells[idx(a, j)].style.transform = col ? 'translateX(100%)' : 'translateY(100%)'; cells[idx(b, j)].style.transform = col ? 'translateX(-100%)' : 'translateY(-100%)'; cells[idx(a, j)].classList.add('swp'); cells[idx(b, j)].classList.add('swp'); }
      C.SFX.note();
      setTimeout(() => {
        if (!R || R.done) return;
        const arrs = [R.P.p, R.P.s, R.grid, R.user, R.ice, R.mz, R.ghostAt, R.mole, R.card, R.peek, R.calc, R.rot, R.paint, R.pcol, R.ord, R.revc];
        for (let j = 0; j < 4; j++) { const x = idx(a, j), y = idx(b, j); for (const A of arrs) [A[x], A[y]] = [A[y], A[x]]; }
        if (R.sel >= 0) { const r = R.sel >> 2, c = R.sel & 3, k = col ? c : r; if (k === a || k === b) R.sel = col ? r * 4 + (k === a ? b : a) : (k === a ? b : a) * 4 + c; }
        for (let j = 0; j < 4; j++) for (const i of [idx(a, j), idx(b, j)]) { cells[i].classList.remove('swp'); cells[i].style.transform = ''; const gh = R.ghostAt[i] === -1; cells[i].classList.toggle('gh', gh && !!R.user[i]); }
        renderMz(); render(); g.st.busy = false;
      }, 420);
    },
    stop() { cells.forEach(c => { c.style.transform = ''; c.classList.remove('swp'); }); },
  },
  cloud: {   // fluffy clouds drift across and hide what is under them (pointer-events pass through)
    start(g) {
      const n = g.s >= 2 ? 2 : 1, host = $('#sClouds'); g.st.cl = [];
      for (let k = 0; k < n; k++) {
        const el = document.createElement('div'); el.className = 'scloud'; el.innerHTML = CLOUD; host.appendChild(el);
        const c = { el, dir: k % 2 ? -1 : 1, w: [56, 60, 66][g.s - 1] };
        spawn(c, true); g.st.cl.push(c);
      }
      function spawn(c, first) {
        c.y = -6 + R.rng() * (100 - c.w * .62 + 6);
        c.x = first ? (c.dir > 0 ? -c.w * .6 + R.rng() * 45 : 100 - c.w * .4 - R.rng() * 45) : (c.dir > 0 ? -c.w : 100);
        c.v = (100 + c.w) / [9000, 7200, 5800][g.s - 1] * (.85 + R.rng() * .3);
        c.el.style.width = c.w + '%'; c.el.style.top = c.y + '%';
      }
      g.st.spawn = spawn;
    },
    tick(g, dt) {
      for (const c of g.st.cl) {
        c.x += c.dir * c.v * dt;
        if (c.dir > 0 ? c.x > 100 : c.x < -c.w) { c.dir = -c.dir; g.st.spawn(c, false); }
        c.el.style.left = c.x.toFixed(2) + '%';
      }
    },
    stop() { $('#sClouds').innerHTML = ''; },
  },
  calc: {   // given numbers become little sums — the answer is the number
    start(g) {
      const giv = SE.shuffle([...Array(16).keys()].filter(i => R.P.p[i]), R.rng);
      giv.slice(0, Math.ceil(giv.length * [.45, .75, 1][g.s - 1])).forEach(i => (R.calc[i] = expr(R.P.p[i], g.s, R.rng)));
      render();
    },
    tick() {}, stop() { R.calc.fill(''); },
  },
  card: {   // given numbers lie face down; tap a card to peek for a moment
    start(g) {
      const giv = SE.shuffle([...Array(16).keys()].filter(i => R.P.p[i]), R.rng);
      giv.slice(0, Math.ceil(giv.length * [.5, .75, 1][g.s - 1])).forEach(i => (R.card[i] = 1));
      g.st.show = [1700, 1250, 900][g.s - 1];
      render();
    },
    tick(g, dt) {
      let ch = false;
      for (let i = 0; i < 16; i++) if (R.card[i] === 2) { R.peek[i] -= dt; if (R.peek[i] <= 0) { R.card[i] = 1; ch = true; } }
      if (ch) render();
    },
    stop() { R.card.fill(0); },
  },
  mole: {   // moles pop out of empty cells and sit there — tap (or type into) one to bonk it away
    start(g) { g.st.next = 900; },
    tick(g, dt) {
      let ch = false;
      for (let i = 0; i < 16; i++) if (R.mole[i] > 0) { R.mole[i] -= dt; if (R.mole[i] <= 0) { R.mole[i] = 0; ch = true; } }
      g.st.next -= dt;
      if (g.st.next <= 0) {
        g.st.next = [3300, 2600, 2000][g.s - 1];
        const up = R.mole.filter(Boolean).length;
        const free = [...Array(16).keys()].filter(i => !R.grid[i] && !R.ice[i] && !R.mole[i] && !cells[i].classList.contains('bomb'));
        if (up < [1, 2, 2][g.s - 1] && free.length > 1) { const i = free[(R.rng() * free.length) | 0]; R.mole[i] = [2600, 3000, 3400][g.s - 1]; C.SFX.note(); ch = true; }
      }
      if (ch) render();
    },
    stop() { R.mole.fill(0); },
  },
  upside: {   // numbers are drawn turned sideways or upside down (★3: they keep turning)
    start(g) { g.st.next = 2600; turn(g, true); },
    tick(g, dt) { if (g.s < 3) return; g.st.next -= dt; if (g.st.next <= 0) { g.st.next = 2600; turn(g, false); C.SFX.note(); } },
    stop() { R.rot.fill(''); },
  },
  balloon: {   // balloons drift up over the board — tap to pop; one that floats away costs 5 seconds
    start(g) { g.st.next = 500; g.st.b = []; },
    tick(g, dt) {
      g.st.next -= dt;
      if (g.st.next <= 0 && g.st.b.length < [2, 3, 4][g.s - 1]) {
        g.st.next = [1800, 1350, 1000][g.s - 1];
        const el = document.createElement('div'); el.className = 'sballoon';
        el.innerHTML = BALLOON(['#ff6f91', '#ffb340', '#5ec2ff', '#8bd56a', '#b48cff'][(R.rng() * 5) | 0]);
        const b = { el, x: R.rng() * 76, y: 104, v: 140 / [5600, 4600, 3800][g.s - 1] * (.8 + R.rng() * .4), ph: R.rng() * 6 };
        el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!R || R.state !== 'play' || b.pop) return; b.pop = 1; el.classList.add('pop'); C.SFX.pop(); C.vib(8); setTimeout(() => el.remove(), 260); });
        $('#sFloat').appendChild(el); g.st.b.push(b);
      }
      g.st.b = g.st.b.filter(b => {
        if (b.pop) return false;
        b.y -= b.v * dt; b.ph += dt / 700;
        if (b.y < -40) { b.el.remove(); missed(GICON.balloon, b.x, 6); return false; }   // floated away unpopped: −5 seconds
        b.el.style.left = (b.x + Math.sin(b.ph) * 2.5).toFixed(2) + '%'; b.el.style.top = b.y.toFixed(2) + '%';
        return true;
      });
    },
    stop(g) { (g.st.b || []).forEach(b => b.el.remove()); },
  },
  dark: {   // a power cut every few seconds
    start(g) { g.st.wait = [3200, 2700, 2200][g.s - 1]; g.st.on = 0; },
    tick(g, dt) {
      const d = $('#sDark');
      if (g.st.on > 0) { g.st.on -= dt; if (g.st.on <= 0) { d.classList.remove('on'); g.st.wait = [4300, 3500, 2800][g.s - 1] * (.8 + R.rng() * .4); } return; }
      g.st.wait -= dt;
      if (g.st.wait <= 0) { g.st.on = [1000, 1300, 1600][g.s - 1]; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); C.SFX.note(); }
    },
    stop() { $('#sDark').classList.remove('on'); },
  },
  sway: {   // the board rocks like a boat
    start(g) { g.st.ph = 0; },
    tick(g, dt) {
      g.st.ph += dt / [3400, 2700, 2100][g.s - 1] * 6.283;
      const a = Math.sin(g.st.ph) * [5, 8, 11][g.s - 1], x = Math.sin(g.st.ph * .5 + 1) * [2, 3, 4][g.s - 1], y = Math.cos(g.st.ph) * [1, 1.5, 2][g.s - 1];
      $('#sBoard').style.transform = `translate(${x.toFixed(2)}%,${y.toFixed(2)}%) rotate(${a.toFixed(2)}deg)`;
    },
    stop() { $('#sBoard').style.transform = ''; },
  },
  paint: {   // paint splats hide cells — tap to wipe (they also dry up after a while)
    start(g) { g.st.next = 800; },
    tick(g, dt) {
      let ch = false;
      for (let i = 0; i < 16; i++) if (R.paint[i] > 0) { R.paint[i] -= dt; if (R.paint[i] <= 0) { R.paint[i] = 0; ch = true; } }
      g.st.next -= dt;
      if (g.st.next <= 0) {
        g.st.next = [2500, 1900, 1400][g.s - 1];
        const free = [...Array(16).keys()].filter(i => !R.paint[i] && !R.mole[i] && !R.ice[i]);
        if (R.paint.filter(Boolean).length < [2, 3, 4][g.s - 1] && free.length) { const i = free[(R.rng() * free.length) | 0]; R.paint[i] = [7000, 8000, 9000][g.s - 1]; R.pcol[i] = (R.rng() * 4) | 0; C.SFX.erase(); ch = true; }
      }
      if (ch) render();
    },
    stop() { R.paint.fill(0); },
  },
  order: {   // numbered cells must be filled 1, 2, 3 … (the rest are free)
    start(g) {
      const empties = SE.shuffle([...Array(16).keys()].filter(i => !R.grid[i]), R.rng);
      empties.slice(0, Math.min(empties.length, [3, 5, 8][g.s - 1])).forEach((i, k) => (R.ord[i] = k + 1));
      R.ordNext = 1; render();
    },
    tick() {}, stop() { R.ord.fill(0); },
  },
  peep: {   // only the cells around the selection are visible (★1 row+column+box, ★2 row+column, ★3 box)
    start(g) { R.peep = g.s; render(); },
    tick() {}, stop() { R.peep = 0; cells.forEach(c => c.classList.remove('pout')); },
  },
  star: {   // shooting stars — catch one for +2 seconds, let it fly away and lose 5
    start(g) { g.st.next = 1600; g.st.s = []; },
    tick(g, dt) {
      g.st.next -= dt;
      if (g.st.next <= 0) {
        g.st.next = [5600, 4800, 4100][g.s - 1] * (.85 + R.rng() * .3);
        const el = document.createElement('div'); el.className = 'sstar'; el.innerHTML = GICON.star;
        const ltr = R.rng() < .5, st = { el, t: 0, dur: [2300, 1900, 1550][g.s - 1], x0: ltr ? -22 : 100, x1: ltr ? 100 : -22, y0: R.rng() * 35, y1: 35 + R.rng() * 45 };
        if (!ltr) el.classList.add('rtl');
        el.addEventListener('pointerdown', e => {
          e.stopPropagation(); e.preventDefault(); if (!R || R.state !== 'play' || st.got) return;
          st.got = 1; el.classList.add('got'); setTimeout(() => el.remove(), 380);
          R.left += 2000; const bn = $('#sBon'); bn.textContent = '+2'; bn.classList.remove('on'); void bn.offsetWidth; bn.classList.add('on');
          C.SFX.unit(); C.vib(10); renderClock();
        });
        $('#sFloat').appendChild(el); g.st.s.push(st);
      }
      g.st.s = g.st.s.filter(st => {
        if (st.got) return false;
        st.t += dt / st.dur;
        if (st.t >= 1) { st.el.remove(); missed(GICON.star, st.x1 < 0 ? 4 : 66, st.y1); return false; }   // missed it: −5 seconds
        st.el.style.left = (st.x0 + (st.x1 - st.x0) * st.t).toFixed(2) + '%'; st.el.style.top = (st.y0 + (st.y1 - st.y0) * st.t).toFixed(2) + '%';
        return true;
      });
    },
    stop(g) { (g.st.s || []).forEach(x => x.el.remove()); },
  },
  rev: {   // colored cells are contrary: whatever you type there goes in as the opposite number (1↔4, 2↔3); ★3: the cells move
    start(g) { pickRev(g); g.st.next = 6500; },
    tick(g, dt) {
      if (g.s < 3) return;
      g.st.next -= dt;
      if (g.st.next <= 0) { g.st.next = 6500; pickRev(g); C.SFX.note(); }
    },
    stop() { R.revc.fill(0); },
  },
  dice: {   // numbers as dice (★1 the given numbers, ★2 all + keys, ★3 keys without the small digits)
    start(g) { R.dice = g.s; drawKeys(false); render(); },
    tick() {}, stop() { R.dice = 0; },
  },
  sleepy: {   // the board dozes off unless you keep writing
    start() { R.lastPut = R.elapsed; },
    tick(g) {
      const idle = R.elapsed - R.lastPut - [1800, 1400, 1000][g.s - 1];
      const lv = Math.max(0, Math.min(1, idle / 1000)) * [.9, .96, .99][g.s - 1];
      const el = $('#sSleep'); el.style.opacity = lv.toFixed(3); el.classList.toggle('z', lv > .25);
    },
    stop() { const el = $('#sSleep'); el.style.opacity = 0; el.classList.remove('z'); },
  },
  ice: {
    start(g) {
      const empties = [...Array(16).keys()].filter(i => !R.grid[i]);
      SE.shuffle(empties, R.rng).slice(0, [2, 3, 4][g.s - 1]).forEach(i => (R.ice[i] = g.s >= 2 ? 2 : 1));
      render();
    },
    tick() {}, stop() { R.ice.fill(0); },
  },
};
// a little sum (or difference / product) whose answer is d
function expr(d, s, rng) {
  const opts = [];
  for (let a = 0; a <= d; a++) if (a && d - a) opts.push(a + '+' + (d - a));
  for (let b = 1; b <= (s >= 2 ? 5 : 3); b++) opts.push((d + b) + '−' + b);
  if (s >= 3) { if (d === 4) opts.push('2×2'); [2, 3].forEach(b => opts.push((d * b) + '÷' + b)); if (d === 1) opts.push('1×1'); }
  return opts[(rng() * opts.length) | 0];
}
function pickRev(g) {
  R.revc.fill(0);
  const empties = SE.shuffle([...Array(16).keys()].filter(i => !R.grid[i]), R.rng);
  empties.slice(0, Math.min(empties.length, [2, 4, 5][g.s - 1])).forEach(i => (R.revc[i] = 1));
  render();
}
const revd = (i, d) => (R.revc && R.revc[i] ? 5 - d : d);   // あまのじゃく cells flip the number
function turn(g, first) {
  const T = g.s >= 3 ? ['rotate(90deg)', 'rotate(180deg)', 'rotate(270deg)', 'scaleX(-1)', 'rotate(180deg) scaleX(-1)'] : g.s >= 2 ? ['rotate(90deg)', 'rotate(180deg)', 'rotate(270deg)'] : ['rotate(180deg)', 'rotate(90deg)'];
  for (let i = 0; i < 16; i++) {
    const own = !R.P.p[i];
    if (own && g.s < 2) { R.rot[i] = ''; continue; }                    // ★1: only the given numbers are turned
    R.rot[i] = R.rng() < (first && g.s < 2 ? .6 : .85) ? T[(R.rng() * T.length) | 0] : '';
  }
  render();
}
/* let a shooting star / balloon get away: −5 seconds with a big pop-up at (x%, y%) of the board */
function missed(icon, x, y) {
  const fx = document.createElement('div'); fx.className = 'smiss';
  fx.innerHTML = `<i>${icon}</i><b>${esc(t('sp.starmiss'))}</b>`;
  fx.style.left = Math.max(4, Math.min(66, x)) + '%'; fx.style.top = Math.max(6, Math.min(70, y)) + '%';
  $('#sFloat').appendChild(fx); setTimeout(() => fx.remove(), 1300);
  const tm = $('#sTimer'); tm.classList.remove('hurt'); void tm.offsetWidth; tm.classList.add('hurt'); setTimeout(() => tm.classList.remove('hurt'), 600);
  R.left -= 5000; R.combo = 0; R.missThis = true;
  const pen = $('#sPen'); pen.textContent = '-5'; pen.classList.remove('on'); void pen.offsetWidth; pen.classList.add('on');
  C.SFX.err(); C.vib([30, 30, 30]); render();
  if (R.left <= 0) timeUp();
}
function startGims() {
  for (const g of R.gims) { GIM[g.id].start(g); S().st.gs[g.id] = 1; }
  if (R.gims.length) showBan();
  else hideBan();
}
function stopGims() { if (!R) return; for (const g of R.gims || []) try { GIM[g.id].stop(g); } catch (e) {} R.gims = []; }
function tickGims(dt) { for (const g of R.gims) GIM[g.id].tick(g, dt); }
function showBan() {
  const ban = $('#sBan');
  ban.innerHTML = R.gims.map(g => `<div class="sbn" style="--gc:${GCOL[g.id]}">${gic(g.id)}<span><b>${esc(t('g.' + g.id))}${g.s > 1 ? ` <em>${'★'.repeat(g.s)}</em>` : ''}</b><small>${esc(t('g.' + g.id + '.d'))}</small></span></div>`).join('');
  ban.classList.remove('min'); ban.classList.add('on'); ban.classList.toggle('many', R.gims.length > 3);
  clearTimeout(ban._t); ban._t = setTimeout(() => ban.classList.add('min'), 2200);
}
function hideBan() { const ban = $('#sBan'); ban.classList.remove('on', 'min'); }
function renderMz() { for (let i = 0; i < 16; i++) cells[i].classList.toggle('mz', !!R.mz[i]); }
function crumbs(i) { const el = cells[i]; el.classList.remove('eaten'); void el.offsetWidth; el.classList.add('eaten'); setTimeout(() => el.classList.remove('eaten'), 600); }
function shoo(bug) {
  if (!R || R.state !== 'play') return;
  const far = [...Array(16).keys()].filter(i => Math.abs((i >> 2) - (bug.at >> 2)) + Math.abs((i & 3) - (bug.at & 3)) >= 3);
  const to = far[(R.rng() * far.length) | 0];
  bug.munch = 0; bug.el.classList.remove('munch'); bug.el.classList.add('hop');
  setTimeout(() => bug.el.classList.remove('hop'), 500);
  bug.at = to; bug.el.style.transition = 'left .45s cubic-bezier(.3,1.4,.5,1), top .45s cubic-bezier(.3,1.4,.5,1)';
  bug.el.style.left = ((to & 3) * 25) + '%'; bug.el.style.top = ((to >> 2) * 25) + '%';
  bug.wait = 1600; C.SFX.pop(); C.vib(8);
}

/* ---------------- render ---------------- */
function peepVis(i) {
  const k = R.sel; if (k < 0) return false;
  const row = (i >> 2) === (k >> 2), col = (i & 3) === (k & 3), box = SE.BOX(i) === SE.BOX(k);
  return R.peep === 1 ? row || col || box : R.peep === 2 ? row || col : box;
}
function render() {
  if (!R || !built) return;
  for (let i = 0; i < 16; i++) {
    const el = cells[i], v = R.grid[i], given = !!R.P.p[i];
    el.classList.toggle('given', given);
    el.classList.toggle('mine', !!R.user[i]);
    el.classList.toggle('frozen', R.ice[i] > 0);
    el.classList.toggle('crack', R.ice[i] === 1 && R.gims.some(g => g.id === 'ice' && g.s >= 2));
    if (!R.user[i] || R.ghostAt[i] !== -1) el.classList.remove('gh');
    el.classList.toggle('mole', R.mole[i] > 0);
    el.classList.toggle('fdown', R.card[i] === 1);
    el.classList.toggle('fpeek', R.card[i] === 2);
    const cx = given && R.calc[i] && !R.fruit ? R.calc[i] : '';
    const want = v ? String(v) + (R.fruit ? 'f' + R.fruit.join('') : '') + (R.dice ? 'd' + R.dice : '') + cx : '';
    if (el.dataset.v !== want) { el.dataset.v = want; el.firstChild.innerHTML = v ? (cx ? `<span class="cx${cx.length > 3 ? ' l' : ''}">${cx}</span>` : glyph(v, given)) : ''; }
    el.classList.toggle('pout', !!R.peep && !peepVis(i));
    el.classList.toggle('revc', !!R.revc[i] && !v);
    el.classList.toggle('paint', R.paint[i] > 0); if (R.paint[i] > 0) el.style.setProperty('--pc', PCOL[R.pcol[i]]);
    const ot = R.ord[i] && !v ? String(R.ord[i]) : '', otEl = el.querySelector('.ot');
    if (otEl.textContent !== ot) otEl.textContent = ot;
    el.classList.toggle('ordn', !!ot && R.ord[i] === R.ordNext); el.classList.toggle('ordw', !!ot && R.ord[i] > R.ordNext);
    const tf = v && !cx ? R.rot[i] : '';
    if (el.firstChild.style.transform !== tf) el.firstChild.style.transform = tf;
    const hidden = k => R.card[k] === 1 || !!R.calc[k] && !!R.P.p[k];   // don't give away face-down cards or sums by highlighting
    el.classList.toggle('hl', !!v && R.sel >= 0 && R.grid[R.sel] === v && i !== R.sel && !hidden(i) && !hidden(R.sel));
  }
  const sl = $('#sSel');
  if (R.sel >= 0 && R.state === 'play') { sl.style.left = ((R.sel & 3) * 25) + '%'; sl.style.top = ((R.sel >> 2) * 25) + '%'; sl.classList.add('on'); } else sl.classList.remove('on');
  const mi = $('#sMist'); mi.classList.toggle('z', !R.mist); $('#sMistN').textContent = R.mist;
  $('#sCount').innerHTML = R.mode === 'd' ? `${C.STAR(true).replace('<svg', '<svg style="width:15px;height:15px"')}<b class="num">${R.solved}</b><small>/${R.goal}</small>` : `<b class="num">${R.solved}</b><small>/${R.goal}</small>`;
  $('#sInfo').innerHTML = `<div><small>${esc(t('sp.combo'))}</small><b class="num">${R.combo}</b></div><div><small>${esc(t('res.score'))}</small><b class="num">${C.fmtN(R.pts)}</b></div><div><small>${esc(R.mode === 'd' ? t('sp.goalL') : t('sp.left'))}</small><b class="num">${R.mode === 'd' ? R.goal : Math.max(0, R.goal - R.solved)}</b></div>`;
  renderClock();
}
function renderClock() {
  const left = Math.max(0, R.left), pct = Math.min(100, left / R.limit * 100);
  $('#sBarI').style.width = pct.toFixed(2) + '%';
  $('#sClock').textContent = (left / 1000).toFixed(1);
  $('#sTimer').classList.toggle('low', left < 5000 && R.state === 'play');
}

/* ---------------- input ---------------- */
const canWrite = i => !R.ord[i] || R.ord[i] <= R.ordNext;     // じゅんばん: numbered cells only in order
function nextEmpty(from) { for (let k = 1; k <= 16; k++) { const i = (from + k) % 16; if (!R.grid[i] && canWrite(i)) return i; } for (let k = 1; k <= 16; k++) { const i = (from + k) % 16; if (!R.grid[i]) return i; } return -1; }
function select(i) { if (!R || R.state !== 'play') return; R.sel = i; render(); }
function keyPress(d) {
  if (!R || R.state !== 'play' || R.paused) return;
  const k = $(`#sKeys .skey[data-d="${d}"]`); if (k) { k.classList.add('press'); setTimeout(() => k.classList.remove('press'), 110); }
  if (R.sel < 0 || R.grid[R.sel]) { const n = nextEmpty(R.sel < 0 ? -1 : R.sel); if (n < 0) return; R.sel = n; }
  put(R.sel, revd(R.sel, d));
}
function bonk(i) {
  if (!R.mole[i]) return false;
  R.mole[i] = 0; const el = cells[i];
  el.classList.remove('bonk'); void el.offsetWidth; el.classList.add('bonk'); setTimeout(() => el.classList.remove('bonk'), 450);
  C.SFX.pop(); C.vib(10); render();
  return true;
}
function peekCard(i) {
  if (R.card[i] !== 1) return false;
  const g = R.gims.find(x => x.id === 'card');
  R.card[i] = 2; R.peek[i] = g ? g.st.show : 1200; C.SFX.tap(); render();
  return true;
}
function hitIce(i) {
  if (R.ice[i] <= 0) return false;
  R.ice[i]--; const el = cells[i];
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  if (!R.ice[i]) { el.classList.add('shatter'); setTimeout(() => el.classList.remove('shatter'), 500); C.SFX.unit(); } else C.SFX.erase();
  C.vib(10); render();
  return true;
}
function put(i, d) {
  if (R.grid[i] || R.P.p[i]) return;
  if (hitIce(i) || bonk(i)) return;
  if (!canWrite(i)) { const el = cells[i]; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); C.SFX.err(); C.vib(15); return; }
  if (d === R.P.s[i]) {
    R.grid[i] = d; R.user[i] = d; R.ghostAt[i] = R.elapsed || 1; R.lastPut = R.elapsed;
    if (R.ord[i] && R.ord[i] === R.ordNext) { R.ordNext++; const mx = Math.max(...R.ord); while (R.ordNext <= mx && R.grid[R.ord.indexOf(R.ordNext)]) R.ordNext++; }
    const el = cells[i]; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    C.SFX.place(); C.vib(6);
    if (R.grid.every(Boolean)) { solved(); return; }
    const n = nextEmpty(i); R.sel = n;
    render();
  } else {
    R.mist++; R.combo = 0; R.missThis = true;
    R.left -= PENALTY;
    const el = cells[i]; el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); el.dataset.bad = d;
    el.querySelector('.v').innerHTML = glyph(d); setTimeout(() => { if (R && !R.grid[i]) { el.querySelector('.v').innerHTML = ''; el.dataset.v = ''; } el.classList.remove('bad'); }, 360);
    const pen = $('#sPen'); pen.textContent = '-' + PENALTY / 1000; pen.classList.remove('on'); void pen.offsetWidth; pen.classList.add('on');
    C.SFX.err(); C.vib([25, 30, 25]);
    render();
    if (R.left <= 0) timeUp();
  }
}
/* flick: ↖1 ↗2 ↙3 ↘4 */
let fl = null;
function boardDown(e) {
  if (!R || R.state !== 'play' || R.paused) return;
  const c = e.target.closest('.scell'); if (!c) return;
  e.preventDefault();
  const i = +c.dataset.i;
  if (R.ice[i] > 0) { R.sel = i; hitIce(i); return; }
  if (R.mole[i]) { R.sel = i; bonk(i); return; }
  if (R.card[i] === 1) { R.sel = i; peekCard(i); return; }
  if (R.paint[i]) { R.paint[i] = 0; R.sel = i; const el = cells[i]; el.classList.remove('wipe'); void el.offsetWidth; el.classList.add('wipe'); C.SFX.erase(); C.vib(8); render(); return; }
  R.sel = i; render(); C.SFX.tap();
  fl = { i, x: e.clientX, y: e.clientY, shown: false, d: 0, id: e.pointerId, can: !R.grid[i] && C.DB.set.flick && !keysOnly() };
  try { $('#sBoard').setPointerCapture(e.pointerId); } catch (_) {}
  if (fl.can) fl.timer = setTimeout(() => { if (fl && !fl.shown) showFlick(); }, 300);
}
function showFlick() {
  if (!fl || fl.shown) return;
  const r = cells[fl.i].getBoundingClientRect(); let cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  cx = Math.max(80, Math.min(innerWidth - 80, cx)); cy = Math.max(80, Math.min(innerHeight - 80, cy));
  const F = $('#sFlick'), pos = { 1: [-1, -1], 2: [1, -1], 3: [-1, 1], 4: [1, 1] };
  F.innerHTML = [1, 2, 3, 4].map(d => `<i data-d="${d}" style="left:${90 + pos[d][0] * 46}px;top:${90 + pos[d][1] * 46}px">${glyph(d)}</i>`).join('');
  F.style.left = cx + 'px'; F.style.top = cy + 'px'; F.classList.add('on'); fl.shown = true; C.vib(5);
}
function hideFlick() { const F = $('#sFlick'); if (F) F.classList.remove('on'); if (fl) clearTimeout(fl.timer); fl = null; }
function boardMove(e) {
  if (!fl || e.pointerId !== fl.id) return;
  const dx = e.clientX - fl.x, dy = e.clientY - fl.y;
  if (!fl.shown && fl.can && Math.hypot(dx, dy) > 12) { clearTimeout(fl.timer); showFlick(); }
  if (fl.shown) { const d = Math.hypot(dx, dy) < 14 ? 0 : dy < 0 ? (dx < 0 ? 1 : 2) : (dx < 0 ? 3 : 4); if (d !== fl.d) { fl.d = d; if (d) C.vib(4); $$('#sFlick i').forEach(x => x.classList.toggle('on', +x.dataset.d === d)); } }
}
function boardUp(e) {
  if (!fl || e.pointerId !== fl.id) return;
  const f = fl; hideFlick();
  if (f.shown && f.d) put(f.i, revd(f.i, f.d));
}

/* ---------------- flow ---------------- */
function briefing() {
  R.state = 'brief';
  const cov = $('#sCov'), s = S();
  const gl = R.glist.map(g => `<div class="sgline ${s.st.gs[g] ? '' : 'new'}">${gic(g)}<span><b>${esc(t('g.' + g))}${s.st.gs[g] ? '' : ` <em class="newt">NEW</em>`}</b><small>${esc(t('g.' + g + '.d'))}</small></span></div>`).join('');
  const goal = R.mode === 'd' ? t('sp.brief.d', { s: dsec(R.d, R.date), n: R.goal }) : t('sp.brief.c', { k: R.goal, s: R.limit / 1000 });
  const r = R.mode === 'd' ? dayRec(R.date, R.d) : rec(R.ci, R.pi);
  const sub = R.mode === 'd' ? (R.ranked ? t('sp.tries', { n: LIMIT_TRIES - ((r && r.a) || 0), m: LIMIT_TRIES }) : t('sp.practice.d')) : (r ? t('sp.brief.best', { s: [1, 2, 3].map(q => (q <= r.s ? '★' : '☆')).join('') }) : '');
  cov.innerHTML = `<div class="sbrief"><div class="sbig">${R.mode === 'd' ? WATCH(dsec(R.d, R.date), ['#e0905a', '#7d93b8', '#e0a91c'][DT[R.d] - 1]) : SHOE}</div><b>${esc(goal)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${gl ? `<div class="sgl">${gl}</div>` : `<p class="sstd">${esc(t('sp.brief.std'))}</p>`}<p class="srule">${esc(t('sp.brief.rule', { n: PENALTY / 1000 }))}${R.mode === 'd' ? ' ' + esc(t('sp.bonus', { n: BONUS / 1000 })) : ''}</p><button class="btn xl" id="sGo">${PLAY}${esc(t('sp.start'))}</button></div>`;
  cov.className = 'scov on';
  stretchCov(true);
  $('#sGo').onclick = () => countdown();
  $('#sBoard').classList.add('hide');
  hideBan();
}
/* phones: the board is small, so let the briefing / pause card also cover the (unused) key area below it */
function stretchCov(on) {
  const cov = $('#sCov'), bw = $('#sBw'), side = document.querySelector('#spd .sside');
  cov.style.bottom = '';
  if (!on || !bw || !side) return;
  const a = bw.getBoundingClientRect(), b = side.getBoundingClientRect();
  if (b.top >= a.bottom - 4) cov.style.bottom = -(b.bottom - a.bottom) + 'px';   // keys sit below the board
}
addEventListener('resize', () => { if (R && (R.state === 'brief' || R.paused)) stretchCov(true); });
function countdown() {
  if (!R || R.state !== 'brief') return;
  R.state = 'count';
  stretchCov(false);
  const cov = $('#sCov');
  let n = 3;
  const step = () => {
    if (!R || R.state !== 'count') return;
    if (n > 0) { cov.innerHTML = `<div class="scd" key="${n}">${n}</div>`; C.SFX.tap(); n--; setTimeout(step, 650); }
    else {
      cov.innerHTML = `<div class="scd go">GO!</div>`; C.SFX.unit();
      setTimeout(() => { if (!R || R.state !== 'count') return; cov.className = 'scov'; cov.innerHTML = ''; begin(); }, 380);
    }
  };
  cov.className = 'scov on count';
  step();
}
function begin() {
  R.state = 'play'; R.last = performance.now();
  $('#sBoard').classList.remove('hide');
  if (R.mode === 'd' && R.ranked) {           // the attempt counts as soon as it starts
    const s = S(), day = s.d[R.date] = s.d[R.date] || {}, r = day[R.d] = day[R.d] || {};
    r.a = (r.a || 0) + 1; R.tryNo = r.a; C.persist(true);
  }
  S().st.runs++;
  startGims();
  render();
}
function solved() {
  const s = S(), dtm = R.elapsed - R.pStart;
  R.solved++; s.st.solved++;
  if (!R.missThis) { R.combo++; R.maxCombo = Math.max(R.maxCombo, R.combo); s.st.combo = Math.max(s.st.combo, R.combo); }
  R.missThis = false;
  const pp = puzPts(R.P.lv, R.P.g, R.combo); R.pts += pp;
  if (dtm <= 2500 && R.P.lv >= 2) s.st.flash = (s.st.flash || 0) + 1;
  R.tlast = R.elapsed; R.ptimes.push(Math.round(dtm));
  if (R.mode === 'd') { R.left += BONUS; const bn = $('#sBon'); bn.textContent = '+' + BONUS / 1000; bn.classList.remove('on'); void bn.offsetWidth; bn.classList.add('on'); }   // daily: every solve adds time
  stopGims(); hideBan();
  R.freeze = FREEZE; R.state = 'clear';
  const b = $('#sBoard'); b.classList.remove('cleared'); void b.offsetWidth; b.classList.add('cleared');
  C.SFX.unit(); C.vib(12);
  comboPop(pp);
  render();
  const doneAll = R.mode === 'c' && R.solved >= R.goal;
  setTimeout(() => {
    if (!R || R.done) return;
    b.classList.remove('cleared');
    if (doneAll) return finish(true);
    loadPuzzle(R.k + 1, true);
    R.state = 'play'; startGims(); render();
  }, FREEZE);
}
function comboPop(pp) {
  const el = $('#sCombo');
  el.innerHTML = `<b>+${pp}</b>${R.combo >= 2 ? `<span>${esc(t('sp.combo'))} ×${R.combo}</span>` : ''}`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function timeUp() {
  if (!R || R.done) return;
  R.left = 0; renderClock();
  if (R.mode === 'd') finish(R.solved >= R.goal);
  else finish(false);
}
function setPaused(p) {
  if (!R || R.done || (R.state !== 'play' && R.state !== 'clear')) return;
  R.paused = p;
  const cov = $('#sCov');
  if (p) { cov.innerHTML = `<div class="sbrief"><b>${esc(t('g.paused'))}</b><button class="btn" id="sRes">${PLAY}${esc(t('g.resume'))}</button><button class="btn ghost sm" id="sQuit">${esc(t('sp.quit'))}</button></div>`; cov.className = 'scov on'; stretchCov(true); $('#sBoard').classList.add('hide'); $('#sRes').onclick = () => setPaused(false); $('#sQuit').onclick = () => quit(); }
  else { cov.className = 'scov'; cov.innerHTML = ''; stretchCov(false); $('#sBoard').classList.remove('hide'); R.last = performance.now(); }
}
function quit() {
  if (R && !R.done && (R.state === 'play' || R.state === 'clear' || R.paused)) {
    if (!confirm(t('sp.quit.q'))) return;
    R.left = 0; finish(R.mode === 'd' && R.solved >= R.goal, true);
    return;
  }
  stopLoop(); stopGims();
  backTo();
}
function backTo() {
  if (R && R.mode === 'c') C.go('s/c/' + (R.ci + 1)); else C.goHome('daily');
}
function startLoop() { stopLoop(); const f = now => { loop(now); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); }
function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
function loop(now) {
  if (!R || R.done) return;
  const dt = Math.min(100, now - (R.last || now)); R.last = now;
  if ((R.state === 'play' || R.state === 'clear') && !R.paused && !document.hidden && !$('.modal.on')) {
    if (R.state === 'clear') return;
    R.left -= dt; R.elapsed += dt; S().st.time += dt;
    tickGims(dt);
    if (R.left <= 0) { timeUp(); return; }
    renderClock();
    // last 5 seconds: a short "pi" every second (higher on the final one)
    const sec = Math.ceil(R.left / 1000);
    if (sec > 5) R.beepSec = 0;
    else if (sec >= 1 && sec !== R.beepSec) { R.beepSec = sec; C.SFX.beep && C.SFX.beep(sec === 1); }
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && R && R.state === 'play' && !R.done) setPaused(true); });

/* ---------------- results ---------------- */
function finish(win, quitted, silent) {
  if (!R || R.done) return;
  R.done = true; stopGims(); hideBan(); hideFlick(); R.state = 'end';
  $('#sSel').classList.remove('on');
  const s = S(); let earned = 0, stars = 0, newBest = false, medal = false;
  // daily, time up: numbers already placed in the unfinished puzzle earn part of its points (half, in proportion)
  R.partial = 0;
  if (R.mode === 'd' && !quitted && R.P && !R.grid.every(Boolean)) {
    const emp = R.P.p.filter(v => !v).length, got = R.user.filter(Boolean).length;
    if (emp && got) { R.partial = Math.max(1, Math.round(puzPts(R.P.lv, R.P.g, R.combo) * got / emp * .5)); R.pts += R.partial; R.partCells = got; }
  }
  if (R.mode === 'd') {
    if (R.ranked) {
      const day = s.d[R.date] = s.d[R.date] || {}, r = day[R.d] = day[R.d] || { a: 1 };
      const sc = dBest(R.date, { c: R.solved, t: R.tlast, p: R.pts }), prev = dBest(R.date, r);
      if (sc > prev) { newBest = r.c != null; r.c = R.solved; r.t = Math.round(R.tlast); r.p = R.pts; }
      if (R.solved >= R.goal && !r.m) { r.m = 1; medal = true; }
      earned = R.pts; addPts(earned);
      if (R.solved >= R.goal && !R.mist) s.st.nomiss = 1;
    }
  } else {
    if (win) {
      const left = Math.max(0, R.left), share = left / R.limit;
      stars = 1 + (share >= .25 ? 1 : 0) + (share >= .25 && !R.mist ? 1 : 0);
      const base = R.st.p.reduce((a, _, j) => a + LVP[R.st.lv[j]] + SE.parseG(R.st.g[j]).length * 8, 0);
      const sc = Math.round(base * starMul[stars]);
      const k = rkey(R.ci, R.pi), prev = s.cc[k];
      const used = Math.round(R.limit - left);
      if (!prev) { s.cc[k] = { s: stars, t: used, sc }; earned = sc; }
      else { earned = Math.max(0, sc - (prev.sc || 0)); prev.sc = Math.max(prev.sc || 0, sc); prev.s = Math.max(prev.s, stars); if (used < prev.t) { prev.t = used; newBest = true; } }
      addPts(earned);
    }
  }
  const fresh = syncAch(true);
  C.persist(true);
  submit();
  if (win || medal) setTimeout(() => { C.SFX.win(); C.confetti(); C.vib([20, 60, 20, 60, 40]); }, 150);
  else C.SFX.err();
  const cov = $('#sCov');
  cov.innerHTML = `<div class="scd ${win ? 'go' : 'up'}">${esc(R.mode === 'c' && win ? t('sp.clear') : t('sp.timeup'))}</div>`; cov.className = 'scov on count';
  if (silent) { announce(fresh); return; }
  setTimeout(() => showResult({ win, stars, earned, newBest, medal, fresh, quitted }), quitted ? 50 : 1000);
}
let lastRank = null;
async function submit() {
  lastRank = null;
  const ON = C.ON; if (!ON || !ON.available || !C.DB.prof.name) return;
  const me = { n: C.DB.prof.name, i: Math.max(0, C.DB.prof.icon) }, g = R;
  try {
    const jobs = [ON.putScore('spd/m/' + C.thisMonth(), Object.assign({ s: monthPts() }, me)), ON.putScore('spd/t', Object.assign({ s: S().sc.tot }, me))];
    if (g.mode === 'c') jobs.push(ON.putScore('spd/c', Object.assign({ s: totalStars(), c: totalClears() }, me)));
    if (g.mode === 'd' && g.ranked && ON.putSpeedDaily) {
      const r = dayRec(g.date, g.d);
      jobs.push(ON.putSpeedDaily(g.date, g.d, Object.assign({ s: dBest(g.date, r), c: r.c, t: r.t, a: r.a }, me)));
    }
    await Promise.all(jobs);
    if (g.mode === 'd' && g.ranked) { const m = await ON.myScore(`spd/d/${g.date}/${g.d}`); lastRank = m && m.rank; const el = $('#sResRank'); if (el && m) el.innerHTML = t('res.rank', { n: `<b>${C.fmtN(m.rank)}</b>` }); }
  } catch (e) { if (DEBUG) console.warn(e); }
}
function showResult(o) {
  const g = R; let h = '';
  if (g.mode === 'd') {
    const r = dayRec(g.date, g.d) || {};
    h += o.medal || (g.ranked && r.m) && g.solved >= g.goal ? C.medal(DT[g.d], 'rm') : `<div class="sresbig">${WATCH(dsec(g.d, g.date), '#9a8fb8')}</div>`;
    h += `<h3>${esc(o.medal ? t('sp.res.medal') : g.solved >= g.goal ? t('sp.res.goal') : t('sp.res.d', { n: g.solved }))}</h3><div class="rs">${esc(C.fmtDate(g.date, { month: 'long', day: 'numeric' }))} · ${esc(t('sp.dn', { s: dsec(g.d, g.date) }))}${g.ranked ? '' : ' · ' + esc(t('sp.practice'))}</div>`;
    h += `<div class="rgrid"><div><small>${esc(t('sp.solved'))}</small><b>${g.solved}</b>${o.newBest ? `<span class="best">${esc(t('res.best'))}</span>` : ''}</div><div><small>${esc(t('res.mist'))}</small><b>${g.mist}</b></div><div><small>${esc(t('sp.maxcombo'))}</small><b>${g.maxCombo}</b></div></div>`;
    if (g.partial) h += `<p class="spart">${esc(t('sp.partial', { n: g.partial, k: g.partCells }))}</p>`;
    if (!g.ranked) h += `<p class="note" style="text-align:center">${esc(t('sp.practice.d'))}</p>`;
  } else {
    const st = g.st;
    h += o.win ? `<div class="rstars">${[1, 2, 3].map(k => C.STAR(k <= o.stars)).join('')}</div>` : `<div class="sresbig">${SHOE}</div>`;
    h += `<h3>${esc(o.win ? t('res.clear') : t('sp.res.fail', { n: g.goal - g.solved }))}</h3><div class="rs">${esc(cname(g.ci))} #${g.pi + 1} · ${esc(t('sp.kt', { k: st.k, s: st.t }))}</div>`;
    h += `<div class="rgrid"><div><small>${esc(t('sp.leftT'))}</small><b>${(Math.max(0, g.left) / 1000).toFixed(1)}</b>${o.newBest ? `<span class="best">${esc(t('res.best'))}</span>` : ''}</div><div><small>${esc(t('res.mist'))}</small><b>${g.mist}</b></div><div><small>${esc(t('sp.maxcombo'))}</small><b>${g.maxCombo}</b></div></div>`;
    if (o.win && o.stars < 3) h += `<p class="note" style="text-align:center">${esc(t('sp.stars.note'))}</p>`;
  }
  if (o.earned) h += `<div class="rscore"><small>${esc(t('res.score'))}</small><span class="sc">+${C.fmtN(o.earned)}</span><span class="pt">${C.COIN}+${C.fmtN(o.earned)}</span></div>`;
  if (g.mode === 'd' && g.ranked && C.ON && C.ON.available && C.DB.prof.name) h += `<div class="rrank" id="sResRank">${lastRank ? t('res.rank', { n: `<b>${C.fmtN(lastRank)}</b>` }) : esc(t('res.ranking'))}</div>`;
  if (o.fresh.length) h += `<div class="rnew">${o.fresh.slice(0, 5).map((a, k) => `<div class="na" style="animation-delay:${.3 + k * .12}s">${C.badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}${a.rw ? ' 🎁 ' + esc(a.rw.bg ? t('sbg.' + a.rw.bg) : C.iconName(a.rw.ic)) : ''}</small></span></div>`).join('')}</div>`;
  let main = '';
  if (g.mode === 'd') {
    const r = dayRec(g.date, g.d) || {}, left = LIMIT_TRIES - (r.a || 0);
    main = `<button class="btn" data-a="retry">${esc(left > 0 ? t('sp.retry.n', { n: left }) : t('sp.retry.p'))}</button>`;
  } else {
    const np = g.pi + 1 < catLen(g.ci) && stageOpen(g.ci, g.pi + 1) ? g.pi + 1 : -1;
    main = o.win && np >= 0 ? `<button class="btn" data-a="next">${esc(t('res.nextc', { n: np + 1 }))}</button>` : `<button class="btn" data-a="retry">${esc(t('sp.retry'))}</button>`;
  }
  // big main button, then [back home / list] [share] (+ retry after a clear, gacha) below it
  h += `<div class="ract smain">${main}</div>`;
  h += `<div class="ract ssub"><button class="btn ghost" data-a="back">${g.mode === 'd' ? '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>'}${esc(g.mode === 'd' ? t('sp.home') : t('res.list'))}</button><button class="btn ghost" data-a="share"><svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>${esc(t('share'))}</button></div>`;
  $('#resBody').innerHTML = h;
  $('#resBody').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; C.SFX.tap();
    if (a === 'share') share(o);
    else if (a === 'retry') { C.closeModals(); setTimeout(() => openGame(g.mode === 'd' ? { mode: 'd', d: g.d, date: C.today() } : { mode: 'c', ci: g.ci, pi: g.pi }), 60); }
    else if (a === 'next') C.go('s/c/' + (g.ci + 1) + '/' + (g.pi + 2));
    else if (a === 'back') { C.closeModals(); setTimeout(backTo, 30); }
    else if (a === 'gacha') { C.closeModals(); setTimeout(C.openGacha, 60); }
  });
  C.openModal('mRes');
  announce(o.fresh.filter(a => a.newBg || a.newIc != null).map(a => Object.assign({}, a)));
}
async function share(o) {
  const g = R;
  const s = g.mode === 'd' ? `${t('sp.title')} ${C.fmtDate(g.date, { month: 'numeric', day: 'numeric' })} ⚡${t('sp.dn', { s: dsec(g.d, g.date) })} ${t('sp.cnt', { n: g.solved })} ${C.fmtN(g.pts)}pt${g.solved >= g.goal ? ' ' + { 1: '🥉', 2: '🥈', 3: '🥇' }[DT[g.d]] : ''}${lastRank ? ' 🏆#' + lastRank : ''}`
    : `${t('sp.title')} ${cname(g.ci)} #${g.pi + 1} ${o.win ? '⭐'.repeat(o.stars) : '💨'}`;
  const text = s + '\n' + C.speedUrlAbs;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); C.toast(esc(t('copied')), 'msg'); } catch (e) { prompt('', text); }
}

/* ================= achievements modal ================= */
let achTab = 'daily';
function openAch() {
  if (C.MODE === 'speed') C.achNew(false);
  syncAch(false);
  const tabs = [['daily', 'ach.t.daily'], ['col', 'sp.col'], ['chal', 'ach.t.chal'], ['rw', 'sp.rw'], ['stats', 'ach.t.stats']];
  $('#achTabs').innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === achTab ? 'on' : ''}" data-k="${k}">${esc(t(l))}</button>`).join('');
  $$('#achTabs .tab').forEach(x => x.onclick = () => { achTab = x.dataset.k; C.SFX.tap(); openAch(); });
  const A = catalog(), by = g => A.filter(a => a.group === g);
  const cell = a => `<div class="ach ${a.got ? '' : 'lock'}">${C.badge(a.tier, a.icon)}<b>${esc(a.name)}</b><small>${esc(a.prog && !a.got ? `${Math.min(a.prog[0], a.prog[1])}/${a.prog[1]}` : a.desc)}</small>${a.rw ? `<span class="rwb">${a.rw.bg ? bgThumb(a.rw.bg) : C.iconSvg(a.rw.ic, { still: true })}</span>` : ''}</div>`;
  let h = `<div class="big sbig2">${BOLT}<div><b>${esc(t('sp.ach.title'))}</b><small>${esc(t('sp.ach.note'))}</small></div></div>`;
  if (achTab === 'daily') { const sk = streakInfo(); h += `<div class="big">${C.badge(sk.cur >= 7 ? 3 : sk.cur >= 3 ? 2 : 1, 'flame', sk.cur ? '' : 'lock')}<div><b>${esc(t('streak', { n: sk.cur }))}</b><small>${esc(t('ach.streak.best', { n: sk.best }))}</small></div></div><div class="agrp"><div class="agrid">${by('daily').map(cell).join('')}</div></div>`; }
  else if (achTab === 'col') h += `<div class="agrp"><div class="agrid">${by('col').map(cell).join('')}</div></div>`;
  else if (achTab === 'chal') h += `<div class="agrp"><div class="agrid">${by('chal').map(cell).join('')}</div></div>`;
  else if (achTab === 'rw') {
    const rws = A.filter(a => a.rw);
    h += `<div class="agrp"><h4>${esc(t('sp.rw.bgs'))}</h4><div class="srw">${BGS.map(k => { const a = rws.find(x => x.rw.bg === k), own = bgOwned(k); return `<div class="srwi ${own ? '' : 'lock'}"><div class="th">${bgThumb(k)}${own ? '' : `<i>${LOCK}</i>`}</div><b>${esc(t('sbg.' + k))}</b><small>${esc(own ? t('sp.rw.got') : a ? a.name : '')}</small></div>`; }).join('')}</div><p class="note">${esc(t('sp.rw.bgnote'))}</p></div>`;
    h += `<div class="agrp"><h4>${esc(t('sp.rw.ics'))}</h4><div class="srw ic">${rws.filter(a => a.rw.ic != null).map(a => { const own = !!C.DB.icons[a.rw.ic]; return `<div class="srwi ${own ? '' : 'lock'}"><div class="th">${own ? C.iconSvg(a.rw.ic, { still: true }) : (C.IC && C.IC.silhouette ? C.IC.silhouette(a.rw.ic) : '')}</div><b>${esc(own ? C.iconName(a.rw.ic) : '？？？')}</b><small>${esc(a.name)}</small></div>`; }).join('')}</div></div>`;
  } else {
    const s = S(), days = Object.keys(s.d);
    const runs = days.reduce((a, ds) => a + DK.reduce((b, d) => b + ((s.d[ds][d] || {}).a || 0), 0), 0);
    h += `<div class="stats"><div class="stat"><small>${esc(t('sp.st.solved'))}</small><b>${C.fmtN(s.st.solved)}</b></div><div class="stat"><small>${esc(t('sp.st.runs'))}</small><b>${runs}</b></div><div class="stat"><small>${esc(t('sp.col'))}</small><b>${totalClears()}</b><em>/${nAll()}</em></div><div class="stat"><small>★</small><b>${totalStars()}</b><em>/${nAll() * 3}</em></div><div class="stat"><small>${esc(t('sp.maxcombo'))}</small><b>${s.st.combo}</b></div><div class="stat"><small>${esc(t('prof.total'))}</small><b>${C.fmtN(s.sc.tot)}</b></div><div class="stat"><small>${esc(t('st.time'))}</small><b>${C.fmtTime(s.st.time)}</b></div></div>`;
    h += `<table class="tbl"><tr><th></th><th>${esc(t('sp.st.days'))}</th><th>${esc(t('sp.st.bestc'))}</th><th>${esc(t('sp.st.avgc'))}</th><th>${esc(t('sp.st.medals'))}</th></tr>${DK.map(d => { const rs = days.map(ds => s.d[ds][d]).filter(r => r && r.c != null); const n = rs.length; return `<tr><td>${C.miniMedal(DT[d]).replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-inline-end:4px"')}${esc(t('sp.dn', { s: dsec(d) }))}</td><td>${n}</td><td>${n ? Math.max(...rs.map(r => r.c)) : '—'}</td><td>${n ? (rs.reduce((a, r) => a + r.c, 0) / n).toFixed(1) : '—'}</td><td>${rs.filter(r => r.m).length}</td></tr>`; }).join('')}</table>`;
  }
  $('#achBody').innerHTML = h;
  C.openModal('mAch');
}

/* ================= ranking modal ================= */
let rkTab = 'daily', rkDate = null, rkDiff = 60, rkMonth = null;
function openRank() {
  if (!C.DB.prof.name) { C.openName(true); return; }
  rkDate = rkDate || C.today(); rkMonth = rkMonth || C.thisMonth();
  const tabs = [['daily', 'rk.daily'], ['month', 'rk.month'], ['total', 'rk.total'], ['col', 'sp.col']];
  $('#rkTabs').innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === rkTab ? 'on' : ''}" data-k="${k}">${esc(t(l))}</button>`).join('');
  $$('#rkTabs .tab').forEach(b => b.onclick = () => { rkTab = b.dataset.k; C.SFX.tap(); openRank(); });
  C.openModal('mRank');
  renderRank();
}
async function renderRank() {
  const body = $('#rkBody'); let ctl = '';
  const FD = C.FIRST_SPEED;
  if (rkTab === 'daily') ctl = `<div class="rkctl"><button class="ib flip" data-nav="-1" ${rkDate <= FD ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(C.fmtDate(rkDate, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }))}</b><button class="ib flip" data-nav="1" ${rkDate >= C.today() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div><div class="chips">${DK.map(d => `<button data-d="${d}" class="${d === rkDiff ? 'on' : ''}">${esc(t('sp.dn', { s: dsec(d, rkDate) }))}</button>`).join('')}</div>`;
  if (rkTab === 'month') ctl = `<div class="rkctl"><button class="ib flip" data-nav="-1" ${rkMonth <= FD.slice(0, 7) ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(C.fmtMonth(rkMonth))}</b><button class="ib flip" data-nav="1" ${rkMonth >= C.thisMonth() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
  body.innerHTML = `<div class="big sbig2" style="margin-bottom:10px">${BOLT}<div><b>${esc(t('sp.rank.title'))}</b><small>${esc(t('sp.rank.note'))}</small></div></div>` + ctl + `<div id="rkList"><div class="rkmsg">${esc(t('rk.loading'))}</div></div>`;
  body.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    const n = +b.dataset.nav;
    if (rkTab === 'daily') { const nd = C.addDays(rkDate, n); if (nd <= C.today() && nd >= FD) rkDate = nd; }
    else { const nm = C.addMonths(rkMonth, n); if (nm <= C.thisMonth() && nm >= FD.slice(0, 7)) rkMonth = nm; }
    C.SFX.tap(); renderRank();
  });
  body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { rkDiff = +b.dataset.d; C.SFX.tap(); renderRank(); });
  const list = $('#rkList'), ON = C.ON;
  if (!ON || !ON.available) { list.innerHTML = `<div class="rkmsg">${C.badge(1, 'podium')}${esc(t('rk.prep'))}</div>`; return; }
  const key = rkTab + rkDate + rkDiff + rkMonth;
  try {
    const path = rkTab === 'daily' ? `spd/d/${rkDate}/${rkDiff}` : rkTab === 'month' ? 'spd/m/' + rkMonth : rkTab === 'total' ? 'spd/t' : 'spd/c';
    const [rows, mine] = await Promise.all([ON.topScore(path, 50), ON.myScore(path)]);
    if (key !== rkTab + rkDate + rkDiff + rkMonth || !$('#mRank').classList.contains('on')) return;
    rows.sort((a, b) => b.s - a.s);
    if (!rows.length) { list.innerHTML = `<div class="rkmsg">${C.badge(1, 'podium')}${esc(t('rk.empty'))}</div>`; return; }
    const fmt = r => rkTab === 'daily' ? esc(dval(r)) : rkTab === 'col' ? '★' + C.fmtN(r.s) : C.fmtN(r.s);
    const sub = r => rkTab === 'daily' ? esc(t('sp.rk.sub', { a: r.a || 1 })) : rkTab === 'col' && r.c != null ? esc(t('sp.rk.subc', { n: r.c })) : '';
    const no = k => (k < 3 ? C.miniMedal(3 - k) : k + 1);
    let h = '<ol class="rk">' + rows.map((r, k) => `<li class="${r.uid === ON.uid ? 'me' : ''}"><span class="no">${no(k)}</span>${C.avatar(r.i, 36)}<span class="nm">${esc(r.n)}<small>${sub(r)}</small></span><span class="vl">${fmt(r)}</span></li>`).join('');
    if (mine && !rows.some(r => r.uid === ON.uid)) h += `<li class="gap">⋮</li><li class="me"><span class="no">${C.fmtN(mine.rank)}</span>${C.avatar(mine.me.i, 36)}<span class="nm">${esc(mine.me.n)}<small>${sub(mine.me)}</small></span><span class="vl">${fmt(mine.me)}</span></li>`;
    list.innerHTML = h + '</ol>' + (mine ? '' : `<p class="note" style="text-align:center">${esc(t('rk.notyet'))}</p>`);
  } catch (e) { list.innerHTML = `<div class="rkmsg">${esc(t('rk.err'))}</div>`; if (DEBUG) console.warn(e); }
}

/* ================= keyboard & layout ================= */
function key(e) {
  if (!R) return false;
  const k = e.key;
  if (R.state === 'brief' && (k === 'Enter' || k === ' ')) { e.preventDefault(); countdown(); return true; }
  if (R.state !== 'play') return false;
  if (k === 'Escape' || k === 'p' || k === 'P') { setPaused(!R.paused); return true; }
  if (R.paused) return false;
  const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
  if (m) { e.preventDefault(); if (keysOnly()) nudgeKeys(); else keyPress(+m[1]); return true; }
  const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
  if (mv && keysOnly()) { e.preventDefault(); nudgeKeys(); return true; }
  if (mv) { e.preventDefault(); const s = R.sel < 0 ? 0 : R.sel, r = ((s >> 2) + mv[0] + 4) % 4, c = ((s & 3) + mv[1] + 4) % 4; select(r * 4 + c); return true; }
  return false;
}
function layout() {
  const vw = innerWidth, vh = innerHeight, hh = ($('.top') || {}).offsetHeight || 54;
  const compact = vw < 760 || vh < 560;
  document.body.classList.toggle('scompact', compact);
  let bs;
  if (compact) bs = Math.min(vw - 28, vh - hh - 300, 520);
  else bs = Math.min(vh - hh - 150, vw - 420, 600);
  bs = Math.max(220, Math.floor(bs / 4) * 4);
  document.documentElement.style.setProperty('--sbs', bs + 'px');
}
addEventListener('resize', () => { if (C && built) layout(); });

/* ================= routing ================= */
function route(p) {
  if (!DATA) return false;
  if (p[0] === 's' && p[1] === 'd' && DK.includes(+p[2])) { openGame({ mode: 'd', d: +p[2], date: C.today() }); return true; }
  if (p[0] === 's' && p[1] === 'c' && +p[2] >= 1 && +p[2] <= DATA.cats.length) {
    const ci = +p[2] - 1;
    if (p[3] && +p[3] >= 1 && +p[3] <= catLen(ci)) { if (stageOpen(ci, +p[3] - 1)) { openGame({ mode: 'c', ci, pi: +p[3] - 1 }); return true; } }
    openCat(ci); return true;
  }
  return false;
}
function leave() { if (R && !R.done && (R.state === 'play' || R.state === 'clear')) { R.left = 0; finish(R.mode === 'd' && R.solved >= R.goal, true, true); } stopLoop(); stopGims(); hideFlick(); }

/* ================= sync merge & ranking paths ================= */
function merge(out, o) {
  const a = out.sp = out.sp || {}, b = o.sp || {};
  a.d = a.d || {}; for (const ds in (b.d || {})) for (const d in b.d[ds]) {
    const x = (a.d[ds] = a.d[ds] || {})[d], y = b.d[ds][d];
    if (!x) a.d[ds][d] = y;
    else { const bx = dBest(ds, x), by = dBest(ds, y); a.d[ds][d] = Object.assign({}, by > bx ? y : x, { a: Math.max(x.a || 0, y.a || 0), m: x.m || y.m }); }
  }
  a.cc = a.cc || {}; for (const k in (b.cc || {})) { const x = a.cc[k], y = b.cc[k]; a.cc[k] = !x ? y : { s: Math.max(x.s, y.s), sc: Math.max(x.sc || 0, y.sc || 0), t: Math.min(x.t, y.t) }; }
  a.ach = a.ach || {}; for (const k in (b.ach || {})) a.ach[k] = Math.max(a.ach[k] || 0, b.ach[k]);
  a.rw = Object.assign({}, b.rw || {}, a.rw || {});
  const as = a.sc = a.sc || { tot: 0, m: {} }, bs = b.sc || { tot: 0, m: {} };
  as.tot = Math.max(as.tot || 0, bs.tot || 0); as.m = as.m || {}; for (const ym in (bs.m || {})) as.m[ym] = Math.max(as.m[ym] || 0, bs.m[ym]);
  const ast = a.st = a.st || {}, bst = b.st || {};
  for (const k of ['solved', 'runs', 'combo', 'flash', 'time', 'nomiss']) ast[k] = Math.max(ast[k] || 0, bst[k] || 0);
  ast.gs = Object.assign({}, bst.gs || {}, ast.gs || {});
}
function rankPaths() {
  const s = S(), p = ['spd/t', 'spd/c', ...Object.keys(s.sc.m).map(ym => 'spd/m/' + ym)];
  for (const ds in s.d) for (const d of DK) if (s.d[ds][d] && s.d[ds][d].a) p.push(`spd/d/${ds}/${d}`);
  return p;
}
/* for the stand-alone app's profile card */
async function myRanks() {
  const ON = C.ON; if (!ON || !ON.available || !C.DB.prof.name) return {};
  try { const [m, tot] = await Promise.all([ON.myScore('spd/m/' + C.thisMonth()), ON.myScore('spd/t')]); return { m: m && m.rank, tot: tot && tot.rank }; } catch (e) { return {}; }
}

/* ================= init ================= */
if (DEBUG) window.__spd = { get R() { return R; }, put: (i, d) => put(i, d), S: () => S(), syncAch };
window.SudokuSpeed = {
  init(core) {
    C = core; S();
    const url = (core.BASE || '') + 'speed_puzzles.json?v=9';
    return fetch(url).then(r => r.json()).then(j => { DATA = j; syncAch(false); return true; }).catch(e => { console.warn('speed data', e); return false; });
  },
  get ready() { return !!DATA; },
  route, leave, key, layout, renderHome, openAch, openRank, merge, rankPaths, myRanks, catalog,
  monthPts, totalPts: () => S().sc.tot, bgs: BGS, bgOwned, bgCond, bgDefault: 'speedway', spdBg, gic, GICON, FRUIT, BUG, WATCH, GCOL, BOLT, SHOE,
  get playing() { return !!(R && !R.done && (R.state === 'play' || R.state === 'clear')); },
};
})();
