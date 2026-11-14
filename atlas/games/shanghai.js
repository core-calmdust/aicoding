/* =====================================================================
   Shanghai (mahjong solitaire) on the portal's 3D table (2026-11-13, 3D only — the peg-solitaire format).
   · The card: フリー (a board by size, atlas/games/shanghai-core.js FREE, adapter.sizes 1..10) · ステージ (120 stages on
     12 constellations: each cleared stage lights a star; the stage's mission — clear all, clear in time, N pairs in time,
     the golden tiles, no hints / shuffles). The 星座マップ is a full-screen sheet of this file (stageMap).
   · Play: tap a free tile, then another free tile with the same face (flowers with flowers, seasons with seasons) — the two
     lift and go. A free tile: nothing on it, and its left or its right side open. Blocked tiles are a shade darker.
     The action bar: 待った (any number) and ヒント (a pair that keeps the board clearable when one exists). No pairs left:
     a sheet offers a shuffle (the tiles left dealt again, always clearable).
   · Tiles: atlas/models/shanghai.js (one InstancedMesh — one draw call for the whole layout).
   · Records: 'aicoding-shanghai' { settings: { back }, free: { <layout>: { best, n, date } }, st: { <s>: stars }, bt: { <s>: secs } }
   Rendering is on demand: animations kick Table3D; nothing loops while idle (the clock is a DOM timer).
   ===================================================================== */
(function () {
  'use strict';
  const KEY = 'aicoding-shanghai';
  const C = () => window.ShanghaiCore;
  const TX = (k, lang, v) => { const D = window.SHANGHAI_I18N && SHANGHAI_I18N[k]; let s = D ? D[lang] || D.en || '' : k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const SHUF_MAX = 3;   // shuffles a stage allows (a free game: any number)

  /* ---------- sounds (the portal's switch): a soft click of ivory, a pair going, a shuffle ---------- */
  const SFX = (() => {
    const on = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
    const ac = () => { try { const A = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume(); return A; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const A = on() && ac(); if (!A) return; const t = A.currentTime + d, o = A.createOscillator(), g = A.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      tap: () => { tone(2600, 2100, .035, .07, 'triangle'); tone(1400, 1100, .05, .04, 'sine', .005); },
      pair: () => { tone(880, 1320, .12, .05, 'sine'); tone(1320, 1760, .14, .04, 'sine', .07); },
      nope: () => tone(260, 200, .1, .05, 'triangle'),
      shuf: () => { for (let k = 0; k < 8; k++) tone(1800 + (k % 3) * 300, 1400, .03, .03, 'triangle', k * .04); },
    };
  })();

  /* ---------- styles: toasts, the stuck sheet, the card's stage panel, the star map ---------- */
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `
/* 縦横切り替え (phones): the button sits left of やめる; turned = the camera is rolled 90° and the page's UI turns with it (#bv.land.shl, html.sh-land) */
.shlb{position:absolute;z-index:3;top:calc(12px + env(safe-area-inset-top));inset-inline-end:calc(22px + var(--shq,96px));display:none;width:var(--hudh,45px);height:var(--hudh,45px);padding:0;align-items:center;justify-content:center;border-radius:50%;border:0;cursor:pointer;background:#fffdf7;color:#2b3044;box-shadow:0 4px 0 #eadfc6,0 10px 18px -10px rgba(0,0,0,.5)}
.shlb svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.bv.playing .shlb.can{display:inline-flex}
.bv.playing.shb:not(.land) .hud{max-width:calc(100% - 50px - var(--shq,96px) - var(--hudh,45px) - env(safe-area-inset-left) - env(safe-area-inset-right))!important}   /* (the HUD stops short of the 縦横 button: a long one is scaled down by the portal) */.shlb.on{background:#ffcc33;box-shadow:0 4px 0 #e0a416,0 10px 18px -10px rgba(0,0,0,.5)}
.shlb.pulse::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:3px solid #ffcc33;animation:shlp 1.1s ease-out infinite;pointer-events:none}
@keyframes shlp{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.6)}}
.bv.land.shl .hud{left:calc(100% - 10px - env(safe-area-inset-right))!important;right:auto!important;top:calc(12px + env(safe-area-inset-top))!important;bottom:auto!important;transform-origin:0 0!important;transform:rotate(90deg)!important;max-width:calc(100vh - 230px)!important;zoom:1!important;white-space:nowrap}
.bv.land.shl .quit{inset-inline:auto!important;left:calc(100% - 10px - env(safe-area-inset-right))!important;top:calc(100% - 12px - env(safe-area-inset-bottom))!important;transform-origin:0 0;transform:rotate(90deg) translateX(-100%)}
.bv.land.shl .shlb{inset-inline:auto;left:calc(100% - 10px - env(safe-area-inset-right));top:calc(100% - 12px - env(safe-area-inset-bottom));transform-origin:0 0;transform:rotate(90deg) translateX(calc(-100% - var(--shq,96px) - 8px))}
.bv.land.shl .endc{transform:translate(-50%,-50%) rotate(90deg);max-width:calc(100vh - 150px)}
.bv.land.shl .endc.on{animation:shpopl .4s cubic-bezier(.3,1.5,.5,1)}
@keyframes shpopl{from{transform:translate(-50%,-50%) rotate(90deg) scale(.85);opacity:0}}
html.sh-land .shtoast{left:calc(16px + env(safe-area-inset-left));bottom:auto;top:50%;transform-origin:0 0;transform:rotate(90deg) translate(-50%,-100%);max-width:min(70vh,560px);white-space:nowrap}
html.sh-land .shask>div{transform:rotate(90deg);width:min(64vh,420px)}
.shrot{position:fixed;inset:0;z-index:96;display:grid;place-items:center;pointer-events:none;opacity:1;transition:opacity .4s}.shrot.off{opacity:0}
.shrot>div{display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 26px;border-radius:24px;background:rgba(16,22,40,.86);color:#fff;font-weight:800;font-size:18px;text-align:center;transform:rotate(90deg);white-space:nowrap}
.shrot svg{width:92px;height:92px;fill:none;stroke:#ffd76a;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.shrot .ph{transform-origin:50% 50%;animation:shrotp 1.3s ease-in-out infinite alternate}
@keyframes shrotp{0%,20%{transform:rotate(90deg)}80%,100%{transform:rotate(0)}}
.shgift{position:fixed;left:50%;top:calc(18px + env(safe-area-inset-top));z-index:130;display:flex;align-items:center;gap:12px;padding:10px 18px 10px 10px;border-radius:22px;background:#fffdf7;color:#1d2433;box-shadow:0 14px 34px -12px rgba(0,0,0,.55);transform:translate(-50%,-140%);opacity:0;transition:transform .45s cubic-bezier(.3,1.4,.5,1),opacity .3s;max-width:min(94vw,520px);cursor:pointer}
.shgift.on{transform:translate(-50%,0);opacity:1}.shgift img{width:68px;height:68px;flex:none}.shgift b{display:block;font-size:17px;line-height:1.35}.shgift small{display:flex;align-items:center;gap:8px;font-size:14.5px;opacity:.85;margin-top:3px}
.shgift .sr{font-style:normal;font-weight:900;font-size:12px;padding:2px 7px;border-radius:7px;color:#fff;background:#8a94a8}.shgift .sr.r1{background:#3f8ae0}.shgift .sr.r2{background:#a35ad8}.shgift .sr.r3{background:linear-gradient(135deg,#f2b63a,#e0567a)}
.shtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:11px 20px;border-radius:99px;background:#163a2e;color:#fff;font-weight:700;font-size:16px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}
.shask{position:fixed;inset:0;z-index:95;display:grid;place-items:center;background:rgba(10,14,24,.35)}
.shask>div{background:#fffdf7;color:#1d2433;border-radius:20px;padding:22px 24px 18px;width:min(88vw,420px);box-shadow:0 24px 60px -20px rgba(0,0,0,.6);text-align:center}
.shask b{display:block;font-size:22px;margin-bottom:8px}.shask p{margin:0 0 16px;font-size:17px;line-height:1.5}
.shask .r{display:flex;gap:10px}.shask button{flex:1;font:inherit;font-weight:800;font-size:17px;padding:12px 8px;border-radius:14px;border:0;cursor:pointer;white-space:nowrap}
.shask .y{background:#1f6a4c;color:#fff}.shask .n{background:#ece6d8;color:#3a3f4c}
.shstg{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.shstg .pg{font-size:16px;font-weight:700;color:var(--ink,#2a2f3a)}
.shstg .nx{font-size:15px;opacity:.8}
.shstg .mapb{display:flex;align-items:center;justify-content:center;gap:10px;font:inherit;font-weight:800;font-size:18px;padding:14px;border-radius:16px;border:0;cursor:pointer;color:#fff;background:linear-gradient(135deg,#1b2350,#3a2a6e 60%,#5a3a8a);box-shadow:0 8px 20px -10px rgba(30,20,80,.8);white-space:nowrap}
.shstg .mapb i{font-style:normal;font-size:22px}
.shstg .stbox{display:flex;flex-direction:column;gap:10px}
/* phones: the card's boxes are the size of the other games' (ユーザー 2026-11-14) — one 38px line (next stage · progress) and a 44px map button */
@media (max-width:819px){.shstg{gap:14px;align-items:stretch!important;flex-wrap:nowrap!important}.shstg > *{align-self:stretch;width:100%;box-sizing:border-box;flex:none!important}.shstg .stbox{flex-direction:row-reverse;align-items:center;justify-content:space-between;gap:8px;min-height:38px;box-sizing:border-box;padding:0 12px;border:2px solid var(--line,#eadfc6);border-radius:12px;background:#fffdf7}
.shstg .stbox .nx{flex:1 1 auto;min-width:0;font-size:12.5px;font-weight:800;opacity:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shstg .stbox .pg{flex:none;font-size:11.5px;font-weight:800;color:#9a8762;white-space:nowrap}
.shstg .mapb{min-height:44px;padding:4px 14px;font-size:16px;border-radius:14px;gap:8px}.shstg .mapb i{font-size:18px}}
.shbest{display:flex;align-items:baseline;gap:10px;margin-top:6px;font-size:16px}.shbest b{font-size:22px;color:#b3222c}.shbest small{opacity:.7}
.shmap{position:fixed;inset:0;z-index:120;color:#eef0ff;display:flex;flex-direction:column;font-family:inherit;opacity:0;transition:opacity .25s;background:#070a1c}
.shmap.on{opacity:1}
.shmap .sky{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 50% at 70% 30%,rgba(110,60,180,.35),transparent 70%),radial-gradient(50% 45% at 20% 75%,rgba(40,90,190,.35),transparent 70%),radial-gradient(40% 35% at 45% 50%,rgba(200,80,160,.16),transparent 70%),linear-gradient(#070a1c,#0d1238 60%,#151040)}
.shmap .sky canvas{position:absolute;inset:0;width:100%;height:100%}
.shmap .hd{position:relative;display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 16px 8px}
.shmap .hd h2{margin:0;font-size:22px;letter-spacing:.04em;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shmap .hd .tot{font-size:17px;font-weight:800;color:#ffd76a;white-space:nowrap}
.shmap .x{flex:none;width:46px;height:46px;padding:0;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.shmap .x svg{width:56%;height:56%;display:block;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round}
.shmap .gift{position:relative;align-self:center;display:flex;align-items:center;gap:8px;margin:0 16px 2px;padding:4px 14px 4px 4px;border-radius:99px;background:rgba(255,215,106,.14);border:1px solid rgba(255,215,106,.35);font-size:15px;font-weight:800;color:#ffe7a0;white-space:nowrap;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis}.shmap .gift img{width:38px;height:38px;flex:none}
.shmap .gf{position:absolute;z-index:2;width:calc(var(--nd) * 1.3);height:auto;margin-top:calc(var(--nd) * -1.8 + 10px);transform:translateX(-50%);pointer-events:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));animation:shgfb 2.4s ease-in-out infinite}
.shmap .gf.got{opacity:.55;animation:none;filter:grayscale(.2) drop-shadow(0 3px 6px rgba(0,0,0,.5))}
.shmap .nd .gft{position:absolute;right:-8px;top:-6px;font-style:normal;font-size:15px;line-height:1;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#ffd76a;color:#241a05;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,.5)}
@keyframes shgfb{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}
.shmap .ar .agf{width:26px;height:26px;margin:-6px -6px -6px 6px;vertical-align:middle}
.shmap .sh .gfl{display:flex;align-items:center;gap:8px;margin-top:8px;padding:4px 12px 4px 4px;border-radius:14px;background:rgba(255,215,106,.14);border:1px solid rgba(255,215,106,.35);font-weight:800;color:#ffe7a0;font-size:15.5px}.shmap .sh .gfl img{width:44px;height:44px;flex:none}.shmap .sh .gfl.got{opacity:.7}
.shmap .sh .rw{display:inline-block;margin-top:2px;font-weight:800;color:#ffd76a}
.shmap .ars{position:relative;display:flex;gap:8px;overflow-x:auto;padding:4px 16px 10px;scrollbar-width:none}.shmap .ars::-webkit-scrollbar{display:none}
.shmap .ar{flex:none;font:inherit;font-size:15px;font-weight:700;padding:9px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#dfe3ff;cursor:pointer;white-space:nowrap}
.shmap .ar.on{background:#ffd76a;color:#241a05;border-color:#ffd76a}.shmap .ar.lk{opacity:.45}
.shmap .ar em{font-style:normal;font-size:13px;margin-left:6px;opacity:.85}
.shmap .fld{position:relative;flex:1;min-height:0}
.shmap .vp{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none}
.shmap .vp.drag{cursor:grabbing}
.shmap .wld{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.shmap .wld > svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.shmap .wld .pn{font-size:6.4px;font-weight:900;letter-spacing:.3px;fill:rgba(255,255,255,.13);stroke:none}
.shmap .wld .pn.on{fill:rgba(255,226,150,.22)}
.shmap .zoom{position:absolute;right:10px;bottom:10px;display:flex;flex-direction:column;gap:6px;z-index:3}
.shmap .zoom button{font:inherit;font-size:22px;font-weight:900;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(16,20,52,.7);color:#fff;cursor:pointer;line-height:1}
.shmap .nd{position:absolute;transform:translate(-50%,-50%);width:var(--nd);height:var(--nd);border-radius:50%;border:2px solid rgba(255,255,255,.35);background:radial-gradient(circle at 40% 35%,#3a4580,#141a40);color:#fff;font:inherit;font-weight:900;font-size:calc(var(--nd) * .36);cursor:pointer;display:grid;place-items:center;padding:0}
.shmap .nd.ok{background:radial-gradient(circle at 40% 35%,#fff6c8,#f2c24a 55%,#b9851a);color:#3a2604;border-color:#fff3b0;box-shadow:0 0 18px 4px rgba(255,214,106,.55)}
.shmap .nd.cur{border-color:#9fe8ff;box-shadow:0 0 0 0 rgba(159,232,255,.7);animation:shpulse 1.6s infinite}
.shmap .nd.lk{opacity:.4;cursor:default}
.shmap .nd .sr{position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:13px;letter-spacing:-1px;color:#ffd76a;white-space:nowrap;margin-top:3px;text-shadow:0 1px 3px #000}
@keyframes shpulse{0%{box-shadow:0 0 0 0 rgba(159,232,255,.7)}70%{box-shadow:0 0 0 16px rgba(159,232,255,0)}100%{box-shadow:0 0 0 0 rgba(159,232,255,0)}}
.shmap .sh{position:relative;margin:0 auto calc(14px + env(safe-area-inset-bottom));width:min(94vw,640px);background:rgba(16,20,52,.92);border:1px solid rgba(255,255,255,.18);border-radius:22px;padding:16px 18px;display:flex;gap:14px;align-items:center;backdrop-filter:blur(6px)}
.shmap .sh .tx{flex:1;min-width:0}
.shmap .sh h3{margin:0 0 4px;font-size:20px}.shmap .sh .mi{font-size:18px;font-weight:800;color:#ffe7a0;line-height:1.35}
.shmap .sh .sub{font-size:15px;opacity:.8;margin-top:4px;line-height:1.45}
.shmap .sh .go{flex:none;font:inherit;font-weight:900;font-size:19px;padding:16px 22px;border-radius:16px;border:0;background:#ffd76a;color:#241a05;cursor:pointer;white-space:nowrap}
.shmap .sh .go:disabled{opacity:.4;cursor:default}
.shmap .nav{position:absolute;z-index:3;top:50%;transform:translateY(-50%);font:inherit;font-size:26px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.shmap .nav.l{left:8px}.shmap .nav.r{right:8px}.shmap .nav:disabled{opacity:.2}
@media (max-width:600px){.shmap .hd{padding:calc(8px + env(safe-area-inset-top)) 12px 6px}.shmap .hd h2{font-size:19px}.shmap .hd .tot{font-size:15px}.shmap .x{width:40px;height:40px;font-size:19px}.shmap .ars{padding:2px 12px 8px;gap:6px}.shmap .ar{font-size:14px;padding:7px 12px}.shmap .gift{margin:0 12px 2px;padding:2px 12px 2px 2px}.shmap .nd .sr{font-size:11px;margin-top:1px}
.shmap .sh{width:calc(100vw - 20px);margin-bottom:calc(10px + env(safe-area-inset-bottom));padding:12px 14px;gap:8px;border-radius:18px}.shmap .sh h3{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shmap .sh .mi{font-size:16px}.shmap .sh .sub{font-size:13.5px;margin-top:2px;line-height:1.4}.shmap .sh .go{padding:12px 16px;font-size:17px}.shmap .gift{font-size:14px}.shmap .gift img{width:30px;height:30px}.shmap .sh .gfl{margin-top:6px;font-size:14.5px}.shmap .sh .gfl img{width:36px;height:36px}.shmap .sh{flex-direction:column;align-items:stretch}.shmap .sh .go{width:100%}.shmap .nav{display:none}.shmap .cst{width:100%}}
`;
    document.head.appendChild(s);
  }

  /* ---------- the constellations: 10 stars each (x 0..100, y 0..64) and their lines ---------- */
  const CON = {
    aries: { p: [[8, 40], [18, 33], [28, 28], [39, 26], [50, 28], [60, 33], [68, 40], [77, 45], [86, 43], [93, 35]] },
    taurus: { p: [[8, 10], [18, 18], [30, 26], [42, 32], [52, 36], [60, 30], [66, 20], [72, 10], [70, 44], [88, 54]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [4, 8], [8, 9]] },
    gemini: { p: [[22, 58], [26, 46], [30, 34], [34, 22], [38, 10], [56, 8], [60, 20], [64, 32], [68, 44], [72, 56]] },
    cancer: { p: [[50, 6], [50, 18], [48, 30], [38, 40], [28, 50], [18, 58], [58, 40], [68, 48], [78, 54], [88, 58]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 9]] },
    leo: { p: [[24, 10], [14, 18], [14, 30], [24, 36], [34, 30], [32, 20], [50, 38], [70, 34], [88, 42], [70, 52]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [6, 7], [7, 8], [8, 9], [9, 6]] },
    virgo: { p: [[10, 18], [20, 24], [32, 28], [44, 27], [54, 33], [64, 41], [76, 47], [56, 48], [44, 57], [90, 52]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [7, 8], [6, 9]] },
    libra: { p: [[50, 6], [34, 22], [66, 22], [50, 22], [28, 38], [72, 38], [22, 54], [78, 54], [40, 38], [60, 38]], e: [[0, 3], [1, 3], [3, 2], [1, 4], [2, 5], [4, 6], [5, 7], [4, 8], [5, 9]] },
    scorpius: { p: [[86, 8], [80, 17], [72, 24], [62, 29], [52, 35], [44, 43], [38, 51], [30, 57], [19, 58], [11, 51]] },
    sagittarius: { p: [[20, 26], [32, 18], [44, 22], [54, 14], [64, 22], [60, 36], [48, 42], [34, 42], [24, 36], [80, 30]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [2, 6], [4, 9]] },
    capricornus: { p: [[10, 14], [22, 21], [34, 29], [46, 37], [58, 43], [72, 47], [88, 40], [80, 29], [62, 23], [38, 16]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]] },
    aquarius: { p: [[10, 20], [22, 12], [34, 20], [46, 12], [58, 20], [50, 32], [62, 40], [54, 52], [68, 58], [84, 50]] },
    pisces: { p: [[8, 12], [17, 21], [27, 30], [38, 39], [50, 47], [62, 40], [73, 32], [84, 24], [92, 13], [80, 10]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 7]] },
  };
  const edges = a => CON[a].e || CON[a].p.slice(1).map((_, i) => [i, i + 1]);
  // (2026-11-14) evenly spaced stars: springs pull each line of the figure to the same length, every pair is kept at least
  // ~0.85 of it apart, and a weak pull to the original place keeps the constellation's shape. Done in screen-like units
  // (sx, sy = pixels per unit) so a stretched phone box spaces them evenly too; then refit into the same margins.
  function even(P, E, VW, VH, sx, sy) {
    const n = P.length, O = P.map(([x, y]) => [x * sx, y * sy]), Q = O.map(p => p.slice());
    const len = (a, b) => Math.hypot(Q[a][0] - Q[b][0], Q[a][1] - Q[b][1]) || 1e-6;
    const L = E.reduce((t, [i, j]) => t + Math.hypot(O[i][0] - O[j][0], O[i][1] - O[j][1]), 0) / E.length;
    for (let it = 0; it < 260; it++) {
      const F = Q.map(() => [0, 0]);
      E.forEach(([i, j]) => { const d = len(i, j), k = (d - L) / d * .25, dx = (Q[j][0] - Q[i][0]) * k, dy = (Q[j][1] - Q[i][1]) * k; F[i][0] += dx; F[i][1] += dy; F[j][0] -= dx; F[j][1] -= dy; });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = len(i, j), m = L * .85; if (d >= m) continue; const k = (m - d) / d * .3, dx = (Q[j][0] - Q[i][0]) * k, dy = (Q[j][1] - Q[i][1]) * k; F[i][0] -= dx; F[i][1] -= dy; F[j][0] += dx; F[j][1] += dy; }
      for (let i = 0; i < n; i++) { Q[i][0] += F[i][0] + (O[i][0] - Q[i][0]) * .02; Q[i][1] += F[i][1] + (O[i][1] - Q[i][1]) * .02; }
    }
    const R = Q.map(([x, y]) => [x / sx, y / sy]);
    const box = a => [Math.min(...a), Math.max(...a)], [ox0, ox1] = box(P.map(p => p[0])), [oy0, oy1] = box(P.map(p => p[1])), [rx0, rx1] = box(R.map(p => p[0])), [ry0, ry1] = box(R.map(p => p[1]));
    const kx = (ox1 - ox0 || 1) / (rx1 - rx0 || 1), ky = (oy1 - oy0 || 1) / (ry1 - ry0 || 1);
    const cx = (ox0 + ox1) / 2, cy = (oy0 + oy1) / 2, rcx = (rx0 + rx1) / 2, rcy = (ry0 + ry1) / 2;
    return R.map(([x, y]) => [Math.max(4, Math.min(VW - 4, cx + (x - rcx) * kx)), Math.max(4, Math.min(VH - 4, cy + (y - rcy) * ky))]);
  }

  /* ---------- progress ---------- */
  const prog = () => { const d = load(); return { st: d.st || {}, bt: d.bt || {} }; };
  const cleared = (P, s) => (P.st[s] || 0) > 0;
  const unlocked = (P, s) => s === 0 || cleared(P, s - 1);
  const nextStage = P => { for (let s = 0; s < 120; s++) if (!cleared(P, s)) return s; return 119; };
  const stageName = (s, lang) => TX('st.stage', lang, { a: Math.floor(s / 10) + 1, b: s % 10 + 1 });
  function missionText(st, lang) {
    const n = st.type === 'gold' ? st.gold : st.goal;
    return TX('mi.' + st.type, lang, { n, t: st.limit ? mmss(st.limit) : '' });
  }
  const parOf = st => st.limit ? Math.round(st.limit * .75) : st.par;
  function starsText(st, lang) { return TX('star2', lang, { t: mmss(parOf(st)) }) + ' · ' + TX('star3', lang); }

  /* ---------- rewards (2026-11-14, ユーザー: ルールコース・ヒストリア・ステージの報酬をほかのゲームとそろえ、新しいアトラモを報酬に) ----------
     · Coins: every ★ won on a stage pays ¢10 (a cleared stage ¢10–30). The portal's purse is derived (shared/atlas.js coins():
       achievements + bonus + Shanghai's stars × COIN_STAR − spent), so nothing is paid twice and it follows the synced record.
     · クジャクパイ (av-peacock-0..3, not in the gacha or the shop): N the rules course (atlas/rules/shanghai.js), R the first
       constellation (10 stages), SR 60 stages, SSR all 120. Granted once each into the portal's wallet (Atlas.load / save). */
  const COIN_STAR = 10, GIFT_AT = [0, 10, 60, 120], GIFT_S = [-1, 9, 59, 119];   // (2026-11-14) the gift sits on a stage of the map: the last of the 1st, 6th and 12th constellation
  const Reward = {
    COIN_STAR, GIFT_AT,
    has(t) { try { return !!(window.Atlas && Atlas.load && Atlas.load().owned.includes('av-peacock-' + t)); } catch (e) { return false; } },
    // give tier t (once): true when it is new
    grant(t, lang, wait) {
      try {
        if (!window.Atlas || !Atlas.load) return false;
        const W = Atlas.load(), id = 'av-peacock-' + t; if (!W || W.owned.includes(id)) return false;
        W.owned.push(id); Atlas.save(W); if (wait) setTimeout(() => giftToast(t, lang), wait); else giftToast(t, lang); return true;
      } catch (e) { return false; }
    },
    // after a stage: the tiers the number of cleared stages has reached
    // (2026-11-14 fix) given at once when the stage is won (the toast follows ~2 s later, even if the player moves on at once):
    // before, the whole check waited 1.9 s on a game timer, and leaving at once put the gift off to the next stage won
    check(lang, wait) { const S = prog().st; let got = -1; for (let t = 1; t < 4; t++) if (S[GIFT_S[t]] > 0 && Reward.grant(t, lang, wait)) got = t; return got; },
    // the tier waiting on stage s (0 = none)
    at(s) { const t = GIFT_S.indexOf(s); return t > 0 ? t : 0; },
    // the next tier still to win by stages: { t, left } or null
    next() { const S = prog().st; for (let t = 1; t < 4; t++) if (!Reward.has(t) && !(S[GIFT_S[t]] > 0)) { let left = 0; for (let k = 0; k <= GIFT_S[t]; k++) if (!(S[k] > 0)) left++; return { t, left }; } return null; },
  };
  window.ShanghaiReward = Reward;
  function giftToast(t, lang) {
    css(); const R = ['N', 'R', 'SR', 'SSR'][t], it = window.AtlasArt && AtlasArt.byId && AtlasArt.byId('av-peacock-' + t), nm = it ? (it.name[lang] || it.name.en) : 'Peacotile';
    const el = document.createElement('div'); el.className = 'shgift'; el.setAttribute('role', 'status');
    el.innerHTML = `<img src="../images/atlas/av/peacock-${t}.webp" alt=""><div><b>🎁 ${esc(TX('rw.got', lang, { name: nm }))}</b><small><span class="sr r${t}">${R}</span>${esc(TX('rw.dress', lang))}</small></div>`;
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 500); };
    el.onclick = close; document.body.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    setTimeout(close, 6500);
    try { if (window.SFX && SFX.win) SFX.win(); } catch (e) {}
  }

  /* ---------- the game on the table ---------- */
  function start(ctx) {
    const T3 = ctx.Table3D, TH3 = window.THREE, M3 = T3.shanghai, lang = ctx.lang, tx = (k, v) => TX(k, lang, v), K = C();
    const AD = window.Atlas3D.shanghai;
    // the stage: one picked on the map / 次のステージ (adapter.pending), else the one played last, else the next to clear
    let ST = null;
    if (ctx.mode === 'stage') { const s = AD.pending != null ? AD.pending : AD.last != null ? AD.last : nextStage(prog()); AD.pending = null; AD.last = s; ST = K.stage(s); }
    const lay = ST ? ST.lay : K.FREE[(ctx.size || 1) - 1] || 'petit';
    const P = K.LAYOUTS[lay], n = P.length;
    const dl = K.deal(P, ST ? ST.seed : 0), G = dl.G;
    let face = dl.face.slice(), alive = new Array(n).fill(1), plan = dl.order.map(p => p.slice());
    const gold = new Set(ST && ST.type === 'gold' ? K.goldTiles(dl, ST.gold) : []);
    let sel = -1, busy = true, over = false, stopped = false, ply = 0, hist = [], hints = 0, shufs = 0, got = 0, goldGot = 0, hintPair = null;
    let t0 = 0, tEnd = 0, pen = 0, clockT = 0, toastEl = null, toastT = 0, askEl = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const a0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, (now - a0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(a0); };
    const left = () => alive.reduce((s, v) => s + v, 0);
    const UNDO_PEN = 3;   // an undo costs time too: +3 s (a time-limit stage: 3 s less left — the same pen) (ユーザー 2026-11-14)
    const SHUF_PEN = 10;   // a shuffle costs time: +10 s on the clock each (ユーザー 2026-11-14). It stays even if the shuffle is undone.
    const elapsed = () => t0 ? ((tEnd || performance.now()) - t0) / 1000 + pen : 0;

    /* the board: the mat and the tiles (one InstancedMesh) */
    const TW = M3.TW, TD = M3.TD, THh = M3.TH;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), zMax = Math.max(...P.map(p => p[2]));
    const W = (Math.max(...xs) / 2 + 1) * TW, D = (Math.max(...ys) / 2 + 1) * TD;
    const g = new TH3.Group(), mat = M3.mat(W, D), base = mat.userData.top; g.add(mat);
    const im = M3.tiles(n); g.add(im);
    const shI = P.map((p, i) => p[2] > 0 ? i : -1).filter(i => i >= 0), shOf = {}; shI.forEach((i, k) => { shOf[i] = k; });
    const shm = M3.shades(Math.max(1, shI.length)); if (!shI.length) shm.count = 0; g.add(shm);   // (the soft shade each upper tile throws on the ones below)
    const pos = P.map(([x, y, z]) => [(x / 2 + .5) * TW - W / 2, base + z * THh, (y / 2 + .5) * TD - D / 2]);

    /* ---------- the golden tiles shine (ユーザー 2026-11-14「きんきらきんに光ってる感じ」): a warm halo round the tile, a sheen that
       sweeps across its face now and then, and little stars that twinkle at its corners. Only while gold tiles remain: a light
       ~30 fps loop that kicks the renderer, stopped when the last one is taken or the game ends. ---------- */
    const goldFx = (() => {
      if (!gold.size) return null;
      if (im.userData.setGold) gold.forEach(i => im.userData.setGold(i, 1));   // (the tile itself in polished gold: models/shanghai.js aGold)
      im.geometry.computeBoundingBox(); const top = im.geometry.boundingBox.max.y;
      const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new TH3.CanvasTexture(c); t.colorSpace = TH3.SRGBColorSpace; return t; };
      const haloT = ctex(128, 160, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .62); gr.addColorStop(0, 'rgba(255,214,90,.95)'); gr.addColorStop(.45, 'rgba(255,190,50,.55)'); gr.addColorStop(1, 'rgba(255,170,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const sheenT = ctex(256, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.3, 'rgba(255,240,200,0)'); gr.addColorStop(.42, 'rgba(255,244,214,.18)'); gr.addColorStop(.5, 'rgba(255,250,232,.42)'); gr.addColorStop(.58, 'rgba(255,244,214,.18)'); gr.addColorStop(.7, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      sheenT.wrapS = TH3.ClampToEdgeWrapping; sheenT.repeat.set(.34, 1);
      const starT = ctex(64, 64, (c, w, h) => { c.translate(w / 2, h / 2); const gr = c.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,236,150,.8)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = gr;
        c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 5 : 31; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); });
      const add = { transparent: true, depthWrite: false, blending: TH3.AdditiveBlending, toneMapped: false };
      const haloM = new TH3.MeshBasicMaterial({ map: haloT, ...add, opacity: .7 }), starM = new TH3.SpriteMaterial({ map: starT, ...add });
      const planeH = new TH3.PlaneGeometry(TW * 1.75, TD * 1.6), planeS = new TH3.PlaneGeometry(TW * .9, TD * .9);
      const grp = new TH3.Group(); g.add(grp);
      const items = [...gold].map((i, k) => {
        const halo = new TH3.Mesh(planeH, haloM); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 2;
        const sm = new TH3.MeshBasicMaterial({ map: sheenT.clone(), ...add, opacity: .8 }); sm.map.needsUpdate = true; sm.map.repeat.set(.5, 1);
        sm.map.center.set(.5, .5); sm.map.rotation = .55;
        const sheen = new TH3.Mesh(planeS, sm); sheen.rotation.x = -Math.PI / 2; sheen.renderOrder = 3;
        const stars = [];   // (no twinkling stars: ユーザー 2026-11-14「キラキラ星は出さずに」)
        grp.add(halo, sheen);
        return { i, halo, sheen, stars, ph: k * 1.37, sp: [0, 1, 2].map(j => ({ ph: Math.random() * 6, x: (Math.random() - .5) * TW * .9, z: (Math.random() - .5) * TD * .9 })) };
      });
      let raf = 0, last = 0;
      function frame(now) {
        raf = 0; if (stopped) return;
        if (now - last >= 15) {
          last = now; const t = now / 1000; let any = false;
          items.forEach(o => {
            const S = st8[o.i], on = alive[o.i] || S.fly, sc = on ? S.s : 0, [x, y, z] = pos[o.i];
            const vis = sc > .05; o.halo.visible = false; o.sheen.visible = vis; o.stars.forEach(sp => { sp.visible = false; });
            if (alive[o.i] || S.fly) any = true; if (!vis) return;
            const X = x + S.dx, Y = y + S.lift + S.dy, Z = z + S.dz;
            o.halo.position.set(X, Y + .012, Z); o.halo.scale.setScalar(sc * (1 + .06 * Math.sin(t * 2.4 + o.ph))); o.halo.material.opacity = .55 + .2 * Math.sin(t * 2.4 + o.ph);
            o.sheen.position.set(X, Y + top * sc + .004, Z); o.sheen.scale.setScalar(sc);
            const cyc = ((t + o.ph) % 4.2) / 1.8, e = cyc < 1 ? cyc * cyc * (3 - 2 * cyc) : 1;   // a slow eased sweep (~1.8 s), then a rest
            o.sheen.material.map.offset.x = .9 - e * 1.4; o.sheen.material.opacity = cyc < 1 ? Math.sin(cyc * Math.PI) * .9 : 0; o.sheen.visible = cyc < 1;
          });
          kick(80); if (!any) return;
        }
        raf = requestAnimationFrame(frame);
      }
      const go = () => { if (!raf && !stopped) raf = requestAnimationFrame(frame); };
      go();
      return { go, dispose() { cancelAnimationFrame(raf); raf = 0; items.forEach(o => { o.sheen.material.map.dispose(); o.sheen.material.dispose(); o.stars.forEach(sp => sp.material.dispose()); }); haloT.dispose(); sheenT.dispose(); starT.dispose(); haloM.dispose(); starM.dispose(); planeH.dispose(); planeS.dispose(); g.remove(grp); } };
    })();
    const st8 = P.map(() => ({ lift: 0, s: 1, dx: 0, dz: 0, dy: 0, rz: 0 }));
    const o3 = new TH3.Object3D(), col = new TH3.Color();
    const o4 = new TH3.Object3D();
    function place(i) { const S = st8[i], [x, y, z] = pos[i]; o3.position.set(x + S.dx, y + S.lift + S.dy, z + S.dz); o3.rotation.set(0, 0, S.rz); o3.scale.setScalar(S.s); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
      const k = shOf[i]; if (k === undefined) return;
      // the shade stays on the tile below while the tile sits; it spreads and goes as the tile rises
      const on = alive[i] && S.s > .5 && S.dy < .05, sp = 1 + Math.min(.6, S.lift * 1.2);
      o4.position.set(x + .05, y + .003, z + .07); o4.scale.setScalar(on && S.lift < .45 ? sp : .0001); o4.updateMatrix(); shm.setMatrixAt(k, o4.matrix); shm.instanceMatrix.needsUpdate = true; }
    function tint(i) {
      const fr = st8[i].fly || (alive[i] && K.isFree(G, alive, i));   // (a tile in the air keeps its bright face until it is gone)
      let r = 1, gg = 1, b = 1;
      if (i === sel) { r *= 1.04; gg *= .93; b *= .66; }
      if (hintPair && hintPair.includes(i)) { r *= 1.05; gg *= .78; b *= .52; }
      const k = fr ? 1 : gold.has(i) && alive[i] ? .82 : .6;   // (a blocked gold tile still gleams)
      col.setRGB(r * k, gg * k, b * k); im.setColorAt(i, col);
    }
    function paintAll() { for (let i = 0; i < n; i++) { place(i); tint(i); } im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; kick(200); }
    function faces() { for (let i = 0; i < n; i++) im.userData.setFace(i, face[i]); }
    faces();
    g.userData = { top: base + THh * (zMax + 1), _rb: Math.max(W, D) / 2 };
    /* a stage is played on its constellation's night sky (ユーザー 2026-11-14: the background follows the theme): a cloth on the
       table under the mat — a deep sky in the constellation's own hue, a field of stars, and the constellation itself drawn
       above, below and beside the mat (so it shows in portrait, in landscape and on a wide screen). Free play keeps the table. */
    let sky = null;
    if (ST) {
      const ai = Math.floor(ST.s / 10), con = CON[K.AREAS[ai]], S = Math.max(W, D) * 3 + 16, CS = innerWidth < 700 ? 1024 : 2048, cv = document.createElement('canvas'); cv.width = cv.height = CS;
      const c = cv.getContext('2d'), R = K.rng ? K.rng(977 + ST.s * 13) : Math.random, u = CS / S, hue = (205 + ai * 30) % 360;
      const bg = c.createRadialGradient(CS / 2, CS / 2, 0, CS / 2, CS / 2, CS * .62); bg.addColorStop(0, `hsl(${hue},52%,27%)`); bg.addColorStop(.45, `hsl(${(hue + 14) % 360},56%,17%)`); bg.addColorStop(1, `hsl(${(hue + 30) % 360},60%,8%)`);
      c.fillStyle = bg; c.fillRect(0, 0, CS, CS);
      for (let i = 0; i < 9; i++) { const x = R() * CS, y = R() * CS, r = CS * (.1 + R() * .16), ng = c.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, `hsla(${(hue + 40 + R() * 80) % 360},70%,60%,.13)`); ng.addColorStop(1, 'hsla(0,0%,0%,0)'); c.fillStyle = ng; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let i = 0; i < (CS > 1024 ? 1500 : 800); i++) { const x = R() * CS, y = R() * CS, r = (.5 + R() * R() * 1.5) * CS / 1024; c.fillStyle = `rgba(255,${235 + R() * 20 | 0},${200 + R() * 55 | 0},${.3 + R() * .6})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      const fw = Math.max(3.2, Math.min(W * .95, 6.5)), fs = fw / 100, fh = 64 * fs, ed = edges(K.AREAS[ai]);
      const fig = (cx, cz) => {
        const X = q => (cx + (q[0] - 50) * fs + S / 2) * u, Y = q => (cz + (q[1] - 32) * fs + S / 2) * u;
        c.strokeStyle = 'rgba(255,224,150,.6)'; c.lineWidth = Math.max(1.5, .035 * u); c.lineCap = 'round'; c.beginPath(); ed.forEach(e => { c.moveTo(X(con.p[e[0]]), Y(con.p[e[0]])); c.lineTo(X(con.p[e[1]]), Y(con.p[e[1]])); }); c.stroke();
        con.p.forEach(q => { const x = X(q), y = Y(q), r = .2 * u, gl = c.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, 'rgba(255,244,200,.95)'); gl.addColorStop(.25, 'rgba(255,220,130,.55)'); gl.addColorStop(1, 'rgba(255,220,130,0)'); c.fillStyle = gl; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(x, y, .055 * u, 0, 7); c.fill(); });
      };
      const gz = D / 2 + .9 + fh / 2, gx = W / 2 + .9 + fw / 2;
      fig(0, -gz); fig(0, gz); fig(-gx, 0); fig(gx, 0);
      const tex = new TH3.CanvasTexture(cv); if ('colorSpace' in tex) tex.colorSpace = 'srgb'; else if (TH3.sRGBEncoding) tex.encoding = TH3.sRGBEncoding; tex.anisotropy = 4;
      const pg = new TH3.PlaneGeometry(S, S); pg.rotateX(-Math.PI / 2);
      sky = new TH3.Mesh(pg, new TH3.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 })); sky.position.y = .006; sky.receiveShadow = true; g.add(sky);
    }
    T3.show('shanghai', g);
    /* 縦横切り替え (phones, ユーザー 2026-11-14): with the phone's rotation locked the game can still be played sideways — the camera
       rolls 90° (the layout gets the long side of the screen) and the page's UI turns with it; a short guide says to hold the
       phone sideways. The choice is remembered (atlas-shanghai-land). Only where it means something: a touch screen held upright. */
    const bvEl = ctx.el.parentNode, mqC = matchMedia('(pointer: coarse)'), mqP = matchMedia('(orientation: portrait)');
    let landOn = false, turnedNow = false, topOn = false; try { topOn = localStorage.getItem('atlas-shanghai-top') === '1'; } catch (e) {}   // (真上から見る: remembered)
    try { landOn = localStorage.getItem('atlas-shanghai-land') === '1'; } catch (e) {}
    css();
    const lb = document.createElement('button'); lb.type = 'button'; lb.className = 'shlb'; lb.title = tx('b.land'); lb.setAttribute('aria-label', tx('b.land'));
    lb.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3.5" y="2.5" width="8" height="13" rx="1.8"/><rect x="8.5" y="13.5" width="13" height="8" rx="1.8" stroke-dasharray="2.4 2.2"/><path d="M15 4.5a5.5 5.5 0 0 1 5.5 5.5"/><path d="M22.4 8 20.5 10.2 18.3 8.4"/></svg>';
    if (bvEl) bvEl.appendChild(lb);
    function guide() {
      const el = document.createElement('div'); el.className = 'shrot';
      el.innerHTML = `<div><svg viewBox="0 0 48 48"><g class="ph"><rect x="15" y="6" width="18" height="36" rx="3.5"/><path d="M21.5 37.5h5"/></g></svg><span>${esc(tx('msg.hold'))}</span></div>`;
      document.body.appendChild(el); setTimeout(() => el.classList.add('off'), 2300); setTimeout(() => el.remove(), 2750);
    }
    let framed = false;
    function frame() {
      const can = mqC.matches && mqP.matches, tn = landOn && can;
      lb.classList.toggle('can', can); lb.classList.toggle('on', tn); if (bvEl) bvEl.classList.toggle('shb', can);
      if (bvEl) { bvEl.classList.toggle('land', tn); bvEl.classList.toggle('shl', tn); const q = document.getElementById('bvQuit'); if (q && q.offsetWidth) bvEl.style.setProperty('--shq', q.offsetWidth + 'px'); }
      document.documentElement.classList.toggle('sh-land', tn);
      const tall = innerHeight > innerWidth * 1.15;
      // 真上から見る (the bar's button right of 待った, ユーザー 2026-11-14): the camera looks straight down — every layer's faces are square on
      const F = tn ? { w: W + 1.2, d: D + 1.6, y: base + THh, pitch: 1.12, roll: 1 }
        : tall ? { w: W + 1.1, d: D + 1.6, y: base + THh, pitch: 1.28 } : { w: W + 1.0, d: D + 1.1, y: base + THh, pitch: 1.12 };   // (a little room round the mat: never touching the edges)
      if (topOn) F.pitch = 1.56;
      if (framed) F.ease = true;   // (a switch glides; the first framing is set at once)
      if (T3.fit) T3.fit(F); framed = true;
      try { if (window.__tbar) window.__tbar.place(); } catch (e) {}
      if (tn && !turnedNow) guide();
      turnedNow = tn; kick(400);
    }
    lb.onclick = e => { e.stopPropagation(); landOn = !landOn; try { localStorage.setItem('atlas-shanghai-land', landOn ? '1' : '0'); } catch (x) {} lb.classList.remove('pulse'); frame(); };
    const onRs = () => { if (!stopped) frame(); };
    addEventListener('resize', onRs); (mqP.addEventListener ? mqP.addEventListener('change', onRs) : mqP.addListener(onRs));
    frame(); setTimeout(() => { if (!stopped) { frame(); hud(); } }, 300);
    if (!landOn && mqC.matches && mqP.matches) { lb.classList.add('pulse'); setTimeout(() => lb.classList.remove('pulse'), 4500); }   // (it is there: a few rings on the first look)

    /* the HUD: tiles left · the mission / pairs open · the clock */
    function hud() {
      const nl = left(), tt = elapsed();
      let mid = '';   // (free play: no "pairs open" count — ユーザー 2026-11-14; the HUD is 残り · タイム)
      if (ST) { mid = ST.type === 'pairs' ? tx('h.got', { a: got, b: ST.goal }) : ST.type === 'gold' ? tx('h.gold', { a: goldGot, b: ST.gold }) : missionText(ST, lang); }
      const clk = ST && ST.limit ? `<span class="hs${ST.limit - tt <= 10 ? ' on' : ''}">${esc(tx('h.limit'))} <b>${mmss(ST.limit - tt)}</b></span>` : `<span class="hs">${esc(tx('h.time'))} <b>${mmss(tt)}</b></span>`;
      ctx.hud(`<span class="hs on"><b>${nl}</b>${esc(tx('h.left'))}</span>${mid ? `<span class="hm">${esc(mid)}</span>` : ''}${clk}`);
    }
    function clock() { clearInterval(clockT); clockT = setInterval(() => { if (stopped || over) { clearInterval(clockT); return; } hud(); if (ST && ST.limit && elapsed() >= ST.limit) fail('timeup'); }, 500); }
    function toast(msg, ms) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'shtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, ms || 2600);
    }
    const turn = () => { if (ctx.onTurn) ctx.onTurn(over ? -1 : 0, { human: true, ply }); };

    /* the deal comes down: the layers one after another, each tile dropping into place */
    function intro() {
      const order = P.map((p, i) => i).sort((a, b) => P[a][2] - P[b][2] || P[a][1] - P[b][1] || P[a][0] - P[b][0]);
      const gap = Math.min(9, 700 / n), T0 = performance.now(), dur = 300, total = gap * n + dur;
      order.forEach((i, k) => { st8[i].dy = 3; st8[i].s = .001; st8[i].k0 = k * gap; });
      paintAll();
      (function step(now) {
        if (stopped) return; const tt = now - T0;
        order.forEach(i => { const q = Math.min(1, Math.max(0, (tt - st8[i].k0) / dur)); const e = 1 - Math.pow(1 - q, 3); st8[i].dy = (1 - e) * 2.4; st8[i].s = q > 0 ? 1 : .001; place(i); });
        im.instanceMatrix.needsUpdate = true; kick(120);
        if (tt < total) requestAnimationFrame(step); else { order.forEach(i => { st8[i].dy = 0; st8[i].s = 1; }); paintAll(); begin(); }
      })(T0);
      let tick = 0; const iv = setInterval(() => { if (stopped || ++tick > 10) { clearInterval(iv); return; } SFX.tap(); }, 70);
    }
    function begin() { busy = false; t0 = performance.now(); hud(); clock(); turn(); checkStuck(); }

    /* ---------- input ---------- */
    function tileAt(e) {
      for (let z = zMax; z >= 0; z--) {
        const p = T3.pick(e, base + (z + 1) * THh); if (!p) continue;
        let best = -1, bd = 9;
        for (let i = 0; i < n; i++) { if (!alive[i] || P[i][2] !== z) continue; const [x, , zz] = pos[i], dx = Math.abs(p.x - x), dz = Math.abs(p.z - zz); if (dx < TW * .5 && dz < TD * .5 && dx + dz < bd) { bd = dx + dz; best = i; } }
        if (best >= 0) return best;
      }
      return -1;
    }
    function lift(i, h, ms) { const S = st8[i], h0 = S.lift; anim(ms || 120, k => { if (!alive[i]) return; S.lift = h0 + (h - h0) * io(k); place(i); im.instanceMatrix.needsUpdate = true; }); }
    function wiggle(i) { const S = st8[i]; anim(260, k => { S.rz = Math.sin(k * Math.PI * 4) * .06 * (1 - k); place(i); im.instanceMatrix.needsUpdate = true; }, () => { S.rz = 0; place(i); im.instanceMatrix.needsUpdate = true; }); }
    function onClick(e) {
      if (busy || over || (T3.wasDrag && T3.wasDrag())) return;
      const i = tileAt(e);
      if (i < 0) { if (sel >= 0) { const s0 = sel; sel = -1; lift(s0, 0); tint(s0); im.instanceColor.needsUpdate = true; kick(); } return; }
      if (!K.isFree(G, alive, i)) { SFX.nope(); wiggle(i); toast(tx('msg.blocked'), 2200); return; }
      if (sel === i) { sel = -1; lift(i, 0); tint(i); im.instanceColor.needsUpdate = true; kick(); return; }
      if (sel >= 0 && K.cls(face[sel]) === K.cls(face[i])) { take(sel, i, true); return; }
      if (sel >= 0) { const s0 = sel; lift(s0, 0); sel = -1; tint(s0); }
      sel = i; SFX.tap(); lift(i, .14); tint(i); im.instanceColor.needsUpdate = true; kick();
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- taking a pair: both lift, glide together and vanish ----------
       The game is a race against the clock (ユーザー 2026-11-14), so the board never waits for the flourish: the pair is out of the
       game the moment it is tapped (the tiles under it are free at once, the next pair can be tapped while this one is still in
       the air) and the flight itself is short (TAKE_MS). Each flying tile carries a ticket (st8.fly); an undo that puts the tile
       back tears the ticket up, so a flight still in the air leaves the restored tile alone. */
    const TAKE_MS = 200;
    let flyN = 0;
    function take(a, b, own) {
      sel = -1; hintPair = null; ply++;
      alive[a] = alive[b] = 0; hist.push({ t: 'p', a, b });
      if (plan) plan = K.patch(plan, a, b);
      got++; if (gold.has(a)) goldGot++; if (gold.has(b)) goldGot++;
      SFX.pair();
      const A = st8[a], B = st8[b], ax = pos[a], bx = pos[b], mx = (ax[0] + bx[0]) / 2, mz = (ax[2] + bx[2]) / 2, my = Math.max(ax[1], bx[1]) + 1.1;
      const la = A.lift, lb = B.lift, tk = ++flyN; A.fly = B.fly = tk;
      const end = (S, i) => { if (S.fly !== tk) return; S.fly = 0; S.lift = 0; S.dx = S.dz = 0; S.rz = 0; S.s = .001; place(i); };
      anim(TAKE_MS, k => {
        const q = io(k), m = Math.max(0, (k - .25) / .75), s = Math.max(.001, 1 - Math.max(0, (k - .5) / .5));
        if (A.fly === tk) { A.lift = la + (my - ax[1] - la) * Math.min(1, k * 1.8); A.dx = (mx - ax[0]) * io(m) * .7; A.dz = (mz - ax[2]) * io(m) * .7; A.s = s; A.rz = q * .4; place(a); }
        if (B.fly === tk) { B.lift = lb + (my - bx[1] - lb) * Math.min(1, k * 1.8); B.dx = (mx - bx[0]) * io(m) * .7; B.dz = (mz - bx[2]) * io(m) * .7; B.s = s; B.rz = -q * .4; place(b); }
        im.instanceMatrix.needsUpdate = true;
      }, () => { end(A, a); end(B, b); im.instanceMatrix.needsUpdate = true; kick(); });
      for (let i = 0; i < n; i++) tint(i); im.instanceColor.needsUpdate = true;
      after();
    }
    function after() {
      busy = false; hud(); turn();
      if (!left()) { win(); return; }
      if (ST && ST.type === 'pairs' && got >= ST.goal) { win(); return; }
      if (ST && ST.type === 'gold' && goldGot >= ST.gold) { win(); return; }
      checkStuck();
    }
    function checkStuck() {
      if (over || K.moves(G, alive, face).length) return;
      if (ST && (ST.type === 'pure' || shufs >= SHUF_MAX)) { later(() => fail('stuck'), 500); return; }
      later(ask, 420);
    }
    function ask() {
      css(); if (askEl) askEl.remove();
      const el = askEl = document.createElement('div'); el.className = 'shask';
      const lbl = ST ? tx('msg.shufLeft', { n: SHUF_MAX - shufs }) : tx('b.shuffle');
      el.innerHTML = `<div><b>${esc(tx('r.stuck'))}</b><p>${esc(tx('msg.stuck'))}<br><small style="opacity:.8">${esc(tx('msg.shufPen', { n: SHUF_PEN }))}</small></p><div class="r"><button class="n">${esc(tx('b.later'))}</button><button class="y">${esc(lbl)}</button></div></div>`;
      document.body.appendChild(el);
      el.querySelector('.n').onclick = () => { el.remove(); askEl = null; };
      el.querySelector('.y').onclick = () => { el.remove(); askEl = null; shuffle(); };
    }
    function shuffle() {
      if (busy || over) return;
      if (ST && (ST.type === 'pure' || shufs >= SHUF_MAX)) { toast(tx('msg.noshuf')); return; }
      const r = K.reshuffle(G, alive, face); if (!r) return;
      busy = true; shufs++; pen += SHUF_PEN; ply++; hist.push({ t: 's', face: face.slice() }); SFX.shuf(); toast(tx('msg.shufPen', { n: SHUF_PEN }), 2200); hud();
      if (sel >= 0) { st8[sel].lift = 0; sel = -1; } hintPair = null;
      const idx = []; alive.forEach((v, i) => { if (v) idx.push(i); });
      anim(520, k => { const h = Math.sin(k * Math.PI) * .45; idx.forEach((i, j) => { st8[i].lift = h; st8[i].rz = Math.sin(k * Math.PI * 2 + j) * .08 * Math.sin(k * Math.PI); place(i); }); im.instanceMatrix.needsUpdate = true;
        if (k > .5 && face !== r.face) { face = r.face; plan = r.order; faces(); } },
      () => { idx.forEach(i => { st8[i].lift = 0; st8[i].rz = 0; }); face = r.face; plan = r.order; faces(); paintAll(); busy = false; hud(); turn(); checkStuck(); });
    }

    /* ---------- the end ---------- */
    function win() {
      if (over) return; over = true; tEnd = performance.now(); clearInterval(clockT); turn();
      const tt = Math.round(elapsed()), d = load();
      // the rest of the tiles (a pairs / gold mission ends early) rise and fade as a flourish
      const idx = []; alive.forEach((v, i) => { if (v) idx.push(i); });
      if (idx.length) anim(700, k => { idx.forEach(i => { st8[i].lift = Math.sin(k * Math.PI) * .5; place(i); }); im.instanceMatrix.needsUpdate = true; });
      if (!ST) {
        const F = d.free = d.free || {}, r = F[lay] || {}, nb = r.best === undefined || tt < r.best;
        F[lay] = { best: nb ? tt : r.best, n: (r.n || 0) + 1, date: nb ? today() : r.date }; save(d);
        later(() => ctx.onEnd({ win: true, draw: false, solo: true, level: 0, title: tx('r.clear'), score: tx('r.time', { t: mmss(tt) }), best: (nb ? '🏅 ' + tx('r.newBest') + ' · ' : '') + tx('r.best', { t: mmss(F[lay].best) }), opp: tx('lay.' + lay), key: lay, why: tx('r.clear') + ' · ' + mmss(tt) }), 800);
        return;
      }
      let stars = 1; if (tt <= parOf(ST)) { stars = 2; if (!hints && !shufs) stars = 3; }
      const S = d.st = d.st || {}, B = d.bt = d.bt || {}, s = ST.s, nb = B[s] === undefined || tt < B[s];
      const was = S[s] || 0;
      S[s] = Math.max(was, stars); if (nb) B[s] = tt; save(d);
      const coin = (S[s] - was) * COIN_STAR;   // (the ★ won for the first time pay ¢10 each — the purse itself is derived from the stars)
      Reward.check(lang, 1900);
      const nx = s + 1 < 120 ? s + 1 : null;
      later(() => ctx.onEnd({ win: true, draw: false, solo: true, level: 0,
        title: tx('r.stage') + ' ' + '★'.repeat(stars) + '☆'.repeat(3 - stars), score: stageName(s, lang) + ' · ' + tx('r.time', { t: mmss(tt) }),
        best: tx('r.best', { t: mmss(B[s]) }) + ' · ' + '★'.repeat(S[s]) + (coin ? ' · ' + tx('rw.coin', { n: coin }) : ''),
        opp: stageName(s, lang), key: 'st' + s, why: tx('r.stage') + ' ' + stars + '★',
        again: { label: tx('b.toMap'), cls: 'sun', go: restart => stageMap({ lang, play: p => restart(() => { AD.pending = p; AD.last = p; }) }) },   // (a cleared stage: マップへ instead of もう一局 — back to the course, ユーザー 2026-11-14)
        next: nx != null ? { label: tx('b.next'), go: () => { AD.pending = nx; AD.last = nx; } } : null }), 800);
    }
    function fail(why) {
      if (over) return; over = true; tEnd = performance.now(); clearInterval(clockT); turn();
      if (askEl) { askEl.remove(); askEl = null; }
      later(() => ctx.onEnd({ win: false, draw: false, solo: true, level: 0, title: tx('r.fail'), score: (why === 'timeup' ? tx('r.timeup') : tx('r.stuck')) + ' · ' + tx('r.left', { n: left() }),
        best: ST ? stageName(ST.s, lang) + ' · ' + missionText(ST, lang) : '', opp: ST ? stageName(ST.s, lang) : tx('lay.' + lay), key: ST ? 'st' + ST.s : lay, why: tx('r.fail') }), 600);
    }

    /* ---------- set up ---------- */
    hud();
    M3.ready().then(() => { if (!stopped) intro(); });

    const api = {
      human: 0, noResign: true,
      canUndo: () => !busy && !over && !!hist.length,
      undo() {
        if (!api.canUndo()) return; const h = hist.pop(); ply++; hintPair = null;
        if (sel >= 0) { st8[sel].lift = 0; sel = -1; }
        if (h.t === 'p') { alive[h.a] = alive[h.b] = 1; [h.a, h.b].forEach(i => { const S = st8[i]; S.fly = 0; S.lift = 0; S.dx = S.dz = 0; S.rz = 0; S.s = 1; }); got--; if (gold.has(h.a)) goldGot--; if (gold.has(h.b)) goldGot--; if (goldFx) goldFx.go(); }
        else { face = h.face; faces(); }
        pen += UNDO_PEN; toast(tx(ST && ST.limit ? 'msg.undoPenL' : 'msg.undoPen', { n: UNDO_PEN }), 1400);
        plan = null; paintAll(); hud(); turn(); SFX.tap();
      },
      canHint: () => !busy && !over && !(ST && ST.type === 'pure'),
      hint() {
        if (ST && ST.type === 'pure') { toast(tx('msg.pure')); return Promise.resolve(false); }
        if (!api.canHint()) return Promise.resolve(false);
        const h = K.hint(G, alive, face, plan, 400);
        if (!h) { ask(); return Promise.resolve(true); }
        hints++; plan = h.plan; hintPair = h.pair;
        if (sel >= 0 && !h.pair.includes(sel)) { st8[sel].lift = 0; place(sel); sel = -1; }
        for (let i = 0; i < n; i++) tint(i); im.instanceColor.needsUpdate = true; im.instanceMatrix.needsUpdate = true;
        h.pair.forEach(i => { const S = st8[i]; anim(900, k => { if (!alive[i]) return; S.lift = Math.sin(k * Math.PI * 3) * .1 * (1 - k * .6); place(i); im.instanceMatrix.needsUpdate = true; }, () => { if (!alive[i]) return; S.lift = i === sel ? .14 : 0; place(i); im.instanceMatrix.needsUpdate = true; }); });
        if (!h.safe) toast(tx('msg.unsafe'), 3600);
        return Promise.resolve(true);
      },
      canDraw: () => false, canResign: () => false, resign() {}, timeout() {},
      view: { icon: '<svg viewBox="0 0 24 24"><rect x="5" y="13.5" width="14" height="7.5" rx="1.6"/><path d="M12 3v7"/><path d="M8.6 6.8 12 10.2l3.4-3.4"/></svg>', label: () => tx('b.top'), on: () => topOn,
        toggle() { topOn = !topOn; try { localStorage.setItem('atlas-shanghai-top', topOn ? '1' : '0'); } catch (e) {} frame(); } },
      stop() {
        stopped = true; clearInterval(clockT); timers.forEach(clearTimeout); clearTimeout(toastT);
        if (toastEl) toastEl.remove(); if (askEl) askEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (im.userData.dispose) im.userData.dispose(); if (shm.userData.dispose) shm.userData.dispose();
        if (goldFx) goldFx.dispose();
        if (sky) { sky.geometry.dispose(); sky.material.map.dispose(); sky.material.dispose(); }
        removeEventListener('resize', onRs); (mqP.removeEventListener ? mqP.removeEventListener('change', onRs) : mqP.removeListener(onRs));
        lb.remove(); if (bvEl) { bvEl.classList.remove('land', 'shl', 'shb'); } document.documentElement.classList.remove('sh-land');
        document.querySelectorAll('.shrot').forEach(e => e.remove());
        try { if (window.__tbar) window.__tbar.place(); } catch (e) {}
        if (window.__shPlay === dbg) delete window.__shPlay;
      },
    };
    const dbg = { state: () => ({ left: left(), over, busy, sel, hints, shufs, got, goldGot, t: elapsed(), lay, stage: ST }), moves: () => K.moves(G, alive, face), take: (a, b) => take(a, b), shuffle, at: i => T3.project ? T3.project(pos[i][0], pos[i][2], pos[i][1] + THh) : null, solveAll() { let h; while (!over && (h = K.hint(G, alive, face, plan, 400)) && h.safe) { const [a, b] = h.pair; alive[a] = alive[b] = 0; st8[a].s = st8[b].s = .001; if (plan) plan = K.patch(plan, a, b); got++; } paintAll(); after(); } };
    window.__shPlay = dbg; api._debug = dbg;
    return api;
  }

  /* ---------- the card: the free tab's best time, the stage tab's panel ---------- */
  function freeBind(host, lang) {
    css(); const el = document.createElement('div'); el.className = 'pgbest'; host.appendChild(el);
    const paint = () => { const z = document.getElementById('bvSize') ? +document.getElementById('bvSize').value : 1, lay = C().FREE[z - 1] || 'petit', r = (load().free || {})[lay];
      el.innerHTML = `<span>${esc(TX('best', lang))}</span><b>${r ? mmss(r.best) : '—'}</b>${r && r.date ? `<small class="pgd">${esc(new Date(r.date + 'T12:00:00').toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' }))}</small>` : ''}`; };
    paint(); const s = document.getElementById('bvSize'); if (s) s.addEventListener('change', paint);
  }
  function stagePanel(lang) {
    css(); const P = prog(), c = Object.keys(P.st).filter(s => P.st[s] > 0).length, s = Object.values(P.st).reduce((a, v) => a + v, 0), nx = nextStage(P);
    return `<div class="stbox"><div class="pg">${esc(TX('st.progress', lang, { c, n: 120, s, t: 360 }))}</div><div class="nx">${esc(TX('st.next', lang, { s: stageName(nx, lang) + ' ' + TX('ar.' + C().AREAS[Math.floor(nx / 10)], lang) }))}</div></div><button type="button" class="mapb" data-shmap><i>✦</i>${esc(TX('b.map', lang))}</button>`;
  }
  function stageBind(host, lang, play) {
    host.addEventListener('click', e => { if (e.target.closest('[data-shmap]')) stageMap({ lang, play }); });
  }

  /* ---------- the star map ---------- */
  /* ---------- the night sky behind the map: a field of stars that twinkle, a few brighter ones with soft flares, now and then a
     shooting star, drifting slowly with the map (parallax). Its own light loop (~30 fps) only while the map is open and shown. ---------- */
  function skyLoop(cv, getPan) {
    const c = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, raf = 0, last = 0, stopped = false, shoot = null, nextShoot = performance.now() + 2500;
    let s = 99; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const S = Array.from({ length: 340 }, () => ({ x: R(), y: R(), a: R(), ph: R() * 6.3, sp: .6 + R() * 1.8, d: .15 + R() * .5 }));
    const B = Array.from({ length: 16 }, () => ({ x: R(), y: R(), ph: R() * 6.3, sp: .4 + R() * .8, hue: R() }));
    function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = Math.max(1, r.width * dpr); H = cv.height = Math.max(1, r.height * dpr); }
    size();
    function frame(now) {
      raf = 0; if (stopped) return;
      if (!document.hidden && now - last >= 32) {
        last = now; const t = now / 1000, px = getPan() * dpr; c.clearRect(0, 0, W, H);
        S.forEach(o => { const tw = .55 + .45 * Math.sin(t * o.sp + o.ph), x = ((o.x * W - px * o.d) % W + W) % W, y = o.y * H, rr = (.35 + o.a * o.a * 1.3) * dpr;
          c.fillStyle = `rgba(255,255,255,${(.12 + o.a * .7) * tw})`; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); });
        B.forEach(o => { const tw = Math.max(0, Math.sin(t * o.sp + o.ph)), x = ((o.x * W - px * .35) % W + W) % W, y = o.y * H, k = (2 + tw * 9) * dpr;
          const col = o.hue < .3 ? '200,220,255' : o.hue < .6 ? '255,236,190' : '230,210,255';
          const g = c.createRadialGradient(x, y, 0, x, y, k); g.addColorStop(0, `rgba(${col},${.25 + .6 * tw})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, k, 0, 7); c.fill();
          c.strokeStyle = `rgba(${col},${.35 * tw})`; c.lineWidth = .8 * dpr; c.beginPath(); c.moveTo(x - k * 1.6, y); c.lineTo(x + k * 1.6, y); c.moveTo(x, y - k * 1.6); c.lineTo(x, y + k * 1.6); c.stroke(); });
        if (!shoot && now > nextShoot) shoot = { x: (.2 + R() * .7) * W, y: R() * H * .45, t0: now, vx: -(.6 + R() * .5) * W, vy: .35 * H };
        if (shoot) { const k = (now - shoot.t0) / 900; if (k >= 1) { shoot = null; nextShoot = now + 4000 + R() * 7000; } else {
          const x = shoot.x + shoot.vx * k, y = shoot.y + shoot.vy * k, a = Math.sin(k * Math.PI), g = c.createLinearGradient(x, y, x - shoot.vx * .12, y - shoot.vy * .12);
          g.addColorStop(0, `rgba(255,255,255,${.85 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.6 * dpr; c.beginPath(); c.moveTo(x, y); c.lineTo(x - shoot.vx * .12, y - shoot.vy * .12); c.stroke(); } }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return { size, stop() { stopped = true; cancelAnimationFrame(raf); } };
  }

  /* ---------- 星座マップ (2026-11-14 改): the twelve constellations side by side as one long night sky, linked star to star. Drag (or swipe)
     to travel left and right, the wheel / pinch / ± to zoom; the tabs fly to a constellation. Each constellation has its zodiac
     figure drawn behind its stars (shanghai-zodiac.js: blinking, slowly changing faces, a swaying part). ---------- */
  const PW = 116, PH = 64;   // one constellation's box in the long sky (x 0..100 of CON plus a gap), the sky's height
  function stageMap(o) {
    css(); const lang = o.lang, K = C(), AR = K.AREAS;
    if (window.ShanghaiZodiac && !document.getElementById('shzod-css')) { const st = document.createElement('style'); st.id = 'shzod-css'; st.textContent = ShanghaiZodiac.css; document.head.appendChild(st); }
    let P = prog(), area = Math.floor(nextStage(P) / 10), pick = nextStage(P);
    const el = document.createElement('div'); el.className = 'shmap';
    el.innerHTML = `<div class="sky"><canvas></canvas></div><div class="hd"><h2></h2><span class="tot"></span><button type="button" class="x" aria-label="${esc(TX('b.close', lang))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="ars"></div><div class="gift"></div><div class="fld"><div class="vp"><div class="wld"></div></div><button type="button" class="nav l">‹</button><button type="button" class="nav r">›</button><div class="zoom"><button type="button" data-z="1">＋</button><button type="button" data-z="-1">－</button></div></div><div class="sh"></div>`;
    document.body.appendChild(el);
    const $ = q => el.querySelector(q), vp = $('.vp'), wld = $('.wld');
    // the pan / zoom: the long sky drawn at u px per unit, then scaled by z and moved by (tx, ty)
    let u = 6, z = 1, tx = 0, ty = 0, raf = 0, anim = null;
    const WW = PW * 12;
    const sky = skyLoop($('canvas'), () => tx);
    requestAnimationFrame(() => el.classList.add('on'));
    const ZMIN = () => Math.min(1, (vp.clientWidth - 20) / (WW * u)) * .9, ZMAX = 3;
    function clamp() {
      const vw = vp.clientWidth, vh = vp.clientHeight, w = WW * u * z, h = PH * u * z, m = Math.min(120, vw * .3);
      tx = w + 2 * m <= vw ? (vw - w) / 2 : Math.min(m, Math.max(vw - w - m, tx));
      ty = h <= vh ? (vh - h) / 2 : Math.min(20, Math.max(vh - h - 20, ty));
    }
    function apply() { clamp(); wld.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${z})`; track(); }
    const centerOf = a => (a * PW + 8 + 50) * u;   // the middle of constellation a, in sky px at z = 1
    function aim(a, smooth) {
      const ttx = vp.clientWidth / 2 - centerOf(a) * z;
      if (!smooth) { tx = ttx; apply(); return; }
      const f0 = tx, t0 = performance.now(); anim = { stop: false };
      const A = anim; (function st(now) { if (A.stop) return; const k = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - k, 3); tx = f0 + (ttx - f0) * e; apply(); if (k < 1) requestAnimationFrame(st); })(t0);
    }
    // which constellation is in the middle of the view: its tab lights up
    function track() {
      const a = Math.max(0, Math.min(11, Math.floor(((vp.clientWidth / 2 - tx) / z / u) / PW)));
      if (a === area) return; area = a; tabs();
    }
    function layout() {
      const vh = vp.clientHeight, vw = vp.clientWidth;
      u = Math.max(3, Math.min(vh / (PH + 6), vw / 72));   // the sky's height fits the view; a constellation is not wider than ~1.4 views
      wld.style.width = WW * u + 'px'; wld.style.height = PH * u + 'px';
      wld.style.setProperty('--nd', Math.round(Math.max(34, Math.min(60, u * 6.2))) + 'px');
      sky.size(); z = Math.max(ZMIN(), Math.min(ZMAX, z));
    }
    function onFit() { const c = (vp.clientWidth / 2 - tx) / z; layout(); tx = vp.clientWidth / 2 - c * z; apply(); }
    const close = () => { el.classList.remove('on'); sky.stop(); setTimeout(() => el.remove(), 260); removeEventListener('keydown', key); removeEventListener('resize', onFit); if (window.visualViewport) visualViewport.removeEventListener('resize', onFit); };
    const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(area - 1); if (e.key === 'ArrowRight') go(area + 1); if (e.key === '+' || e.key === '=') zoomAt(1.25); if (e.key === '-') zoomAt(.8); };
    addEventListener('keydown', key);
    addEventListener('resize', onFit); if (window.visualViewport) visualViewport.addEventListener('resize', onFit);
    $('.x').onclick = close;
    const areaOpen = a => unlocked(P, a * 10);
    function go(a) { if (a < 0 || a > 11) return; const fs = a * 10; let pk = Array.from({ length: 10 }, (_, k) => fs + k).find(s => unlocked(P, s) && !cleared(P, s)); if (pk == null) pk = fs; pick = pk; area = a; tabs(); nodes(); sheet(); aim(a, true); }
    function zoomAt(f, cx, cy) {
      const vw = vp.clientWidth, vh = vp.clientHeight; cx = cx == null ? vw / 2 : cx; cy = cy == null ? vh / 2 : cy;
      const z2 = Math.max(ZMIN(), Math.min(ZMAX, z * f)); tx = cx - (cx - tx) * z2 / z; ty = cy - (cy - ty) * z2 / z; z = z2; apply();
    }
    function tabs() {
      $('.ars').innerHTML = AR.map((a, i) => { const st = Array.from({ length: 10 }, (_, k) => P.st[i * 10 + k] || 0).reduce((x, v) => x + v, 0); return `<button type="button" class="ar${i === area ? ' on' : ''}${areaOpen(i) ? '' : ' lk'}" data-a="${i}">${esc(TX('ar.' + a, lang))}<em>★${st}</em>${[1, 2, 3].filter(t => Math.floor(GIFT_S[t] / 10) === i && !Reward.has(t)).map(t => `<img class="agf" src="../images/atlas/av/peacock-${t}.webp" alt="">`).join('')}</button>`; }).join('');
      const on = $('.ar.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      wld.querySelectorAll('.pn').forEach((t, i) => t.classList.toggle('on', i === area));
    }
    // every constellation's stars, evenly spaced inside its box, in the long sky's units
    const PTS = AR.map((a, i) => even(CON[a].p.map(p => p.slice()), edges(a), 100, 64, 1, 1).map(([x, y]) => [i * PW + 8 + x, y]));
    function art() {
      const lit = ([i, j], fs) => cleared(P, fs + i) && cleared(P, fs + j);
      let svg = `<svg viewBox="0 0 ${WW} ${PH}" preserveAspectRatio="none">`;
      AR.forEach((a, i) => {
        const fs = i * 10, done = Array.from({ length: 10 }, (_, k) => cleared(P, fs + k)).filter(Boolean).length;
        svg += `<text class="pn${i === area ? ' on' : ''}" x="${i * PW + 8}" y="7">${esc(TX('ar.' + a, lang))}</text>`;
        svg += `<g class="fig${done === 10 ? ' lit' : ''}" transform="translate(${i * PW + 8} 0)" style="--dl:${-i * .6}s;opacity:${(.55 + .45 * done / 10).toFixed(2)}">${window.ShanghaiZodiac ? ShanghaiZodiac(a, i) : ''}</g>`;
        edges(a).forEach(e => { const [x1, y1] = PTS[i][e[0]], [x2, y2] = PTS[i][e[1]], L = lit(e, fs);
          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${L ? '#ffd76a' : 'rgba(180,200,255,.3)'}" stroke-width="${L ? .7 : .35}" stroke-linecap="round" ${L ? 'filter="drop-shadow(0 0 1.2px #ffd76a)"' : 'stroke-dasharray="1 1.2"'}/>`; });
        if (i < 11) { const [x1, y1] = PTS[i][9], [x2, y2] = PTS[i + 1][0], L = cleared(P, fs + 9);   // the road on to the next constellation
          svg += `<path d="M${x1} ${y1} C${x1 + 14} ${y1} ${x2 - 14} ${y2} ${x2} ${y2}" fill="none" stroke="${L ? 'rgba(255,215,106,.7)' : 'rgba(180,200,255,.22)'}" stroke-width="${L ? .55 : .35}" stroke-dasharray="${L ? '2 1.4' : '1 1.6'}" stroke-linecap="round"/>`; }
      });
      return svg + '</svg>';
    }
    function nodes() {
      let h = '';
      AR.forEach((a, i) => PTS[i].forEach(([x, y], k) => {
        const s = i * 10 + k, ok = cleared(P, s), ul = unlocked(P, s), sr = P.st[s] || 0, t = Reward.at(s);
        h += `<button type="button" class="nd${ok ? ' ok' : ''}${ul && !ok ? ' cur' : ''}${ul ? '' : ' lk'}" style="left:${x / WW * 100}%;top:${y / PH * 100}%${s === pick ? ';outline:3px solid #fff;outline-offset:3px' : ''}" data-s="${s}">${k + 1}${sr ? `<span class="sr">${'★'.repeat(sr)}${'☆'.repeat(3 - sr)}</span>` : ''}${t ? `<i class="gft">${Reward.has(t) ? '✓' : '🎁'}</i>` : ''}</button>` +
          (t ? `<img class="gf${Reward.has(t) ? ' got' : ''}" style="left:${x / WW * 100}%;top:${y / PH * 100}%" src="../images/atlas/av/peacock-${t}.webp" alt="">` : '');
      }));
      wld.querySelectorAll('.nd,.gf').forEach(n => n.remove());
      wld.insertAdjacentHTML('beforeend', h);
    }
    function head() {
      const tot = Object.values(P.st).reduce((a, v) => a + v, 0);
      $('h2').textContent = TX('st.title', lang); $('.tot').textContent = '★ ' + tot + ' / 360';
      const nx = Reward.next(), it = nx && window.AtlasArt && AtlasArt.byId && AtlasArt.byId('av-peacock-' + nx.t);
      $('.gift').innerHTML = nx ? `<img src="../images/atlas/av/peacock-${nx.t}.webp" alt=""><span>${esc(TX('rw.next', lang, { n: nx.left, name: it ? it.name[lang] || it.name.en : 'Peacotile' }))}</span>` : '';
      $('.gift').style.display = nx ? '' : 'none';
    }
    // the stage that hands over a クジャクパイ: its picture and name in the sheet
    function giftLine(s) {
      const t = Reward.at(s); if (!t) return '';
      const it = window.AtlasArt && AtlasArt.byId && AtlasArt.byId('av-peacock-' + t), nm = it ? it.name[lang] || it.name.en : 'Peacotile', got = Reward.has(t);
      return `<div class="gfl${got ? ' got' : ''}"><img src="../images/atlas/av/peacock-${t}.webp" alt=""><span>${got ? '✓ ' : '🎁 '}${esc(TX(got ? 'rw.have' : 'rw.here', lang, { name: nm }))}</span></div>`;
    }
    function sheet() {
      const s = pick, st = K.stage(s), ul = unlocked(P, s), sr = P.st[s] || 0, bt = P.bt[s];
      $('.sh').innerHTML = `<div class="tx"><h3>${esc(stageName(s, lang))} · ${esc(TX('lay.' + st.lay, lang))} <small style="opacity:.7;font-size:15px">${esc(TX('tiles', lang, { n: st.n }))}</small></h3><div class="mi">${esc(missionText(st, lang))}</div><div class="sub">${ul ? esc(starsText(st, lang)) + (sr ? '<br>' + '★'.repeat(sr) + '☆'.repeat(3 - sr) + (bt != null ? ' · ' + esc(TX('r.best', lang, { t: mmss(bt) })) : '') : '') : esc(TX('st.lock', lang))}<br><span class="rw">${esc(TX('rw.star', lang, { n: COIN_STAR }))}</span>${giftLine(s)}</div></div><button type="button" class="go"${ul ? '' : ' disabled'}>${esc(TX('b.start', lang))} ▶</button>`;
      $('.go').onclick = () => { if (!ul) return; close(); o.play(s); };
      requestAnimationFrame(onFit);
    }
    /* ---------- drag to travel, flick to glide, pinch / wheel to zoom; a tap (no drag) picks a stage ---------- */
    const pts = new Map(); let moved = 0, lastX = 0, lastY = 0, vx = 0, lt = 0, pinch = null, glide = 0;
    vp.addEventListener('pointerdown', e => {
      if (anim) anim.stop = true; cancelAnimationFrame(glide);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) { moved = 0; lastX = e.clientX; lastY = e.clientY; vx = 0; lt = performance.now(); }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z }; }
    });
    vp.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = vp.getBoundingClientRect();
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.z * d / pinch.d / z, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); moved = 99; return; }
      const dx = e.clientX - lastX, dy = e.clientY - lastY, now = performance.now();
      moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { vp.classList.add('drag'); if (!vp.hasPointerCapture(e.pointerId)) try { vp.setPointerCapture(e.pointerId); } catch (_) {} }
      if (moved > 6) { tx += dx; ty += dy; apply(); vx = dx / Math.max(1, now - lt) * 16; }
      lastX = e.clientX; lastY = e.clientY; lt = now;
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size) return;
      vp.classList.remove('drag');
      if (moved > 6 && Math.abs(vx) > 1.5) { let v = vx; (function gl() { v *= .93; tx += v; apply(); if (Math.abs(v) > .3) glide = requestAnimationFrame(gl); })(); }
    };
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
    vp.addEventListener('wheel', e => {
      e.preventDefault(); const r = vp.getBoundingClientRect();
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top);
      else { tx -= e.deltaX; apply(); }
    }, { passive: false });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (a) { go(+a.dataset.a); return; }
      const zb = e.target.closest('[data-z]'); if (zb) { zoomAt(+zb.dataset.z > 0 ? 1.3 : 1 / 1.3); return; }
      const n = e.target.closest('.nd'); if (n) { if (moved > 6) return; pick = +n.dataset.s; nodes(); sheet(); return; }
      if (e.target.closest('.nav.l')) go(area - 1); else if (e.target.closest('.nav.r')) go(area + 1);
    });
    head(); wld.innerHTML = art(); tabs(); nodes(); sheet();
    // open on the stage to play next (its star a little left of the middle, so the road ahead shows)
    function aimPick() { const [x] = PTS[Math.floor(pick / 10)][pick % 10]; tx = vp.clientWidth * .42 - x * u * z; apply(); }
    layout(); z = Math.max(ZMIN(), 1); aimPick();
    requestAnimationFrame(() => { layout(); aimPick(); });
    return { close, _dbg: { pan: () => ({ tx, ty, z, u, area }), zoomAt, go } };
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.shanghai = {
    levels: 0, solo: true, table: false, sizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], size0: 1,
    sizeLabel: () => '',
    sizeName: (z, lang) => { const k = C() && C().FREE[z - 1]; return k ? TX('lay.' + k, lang) + ' · ' + TX('tiles', lang, { n: C().LAYOUTS[k].length }) : String(z); },
    stages: true, modeName: (m, lang) => TX(m === 'stage' ? 'm.stage' : 'm.free', lang),
    stagePanel, stageBind, freeBind, stageMap, pending: null, last: null, nextStage: () => nextStage(prog()),
    start,
  };
})();
