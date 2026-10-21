// Resign — common "投了しますか？" confirmation for every 世界のボドゲ大全 versus game (common spec).
// The 投了 (resign) button sits right after 対局 and 待った in the menu; pressing it asks
// "投了しますか？" with はい / いいえ, and only はい ends the game as a loss.
//
// Usage:
//   Resign.confirm({ lang: LANG }).then(ok => { if (ok) resignGame(); });
//   Resign.label(LANG)            // button text ("投了" / "Resign" …)
//   Resign.icon                   // white-flag SVG for the button
(function () {
'use strict';
const T = {
  ja: { btn: '投了', q: '投了しますか？', sub: 'この対局はあなたの負けとして終わります。', yes: 'はい', no: 'いいえ' },
  en: { btn: 'Resign', q: 'Resign this game?', sub: 'The game will end as a loss for you.', yes: 'Yes', no: 'No' },
  zh: { btn: '认输', q: '要认输吗？', sub: '本局将以你的失败结束。', yes: '是', no: '否' },
  ko: { btn: '기권', q: '기권하시겠습니까?', sub: '이 대국은 당신의 패배로 끝납니다.', yes: '예', no: '아니요' },
  es: { btn: 'Rendirse', q: '¿Te rindes?', sub: 'La partida terminará como derrota.', yes: 'Sí', no: 'No' },
  fr: { btn: 'Abandonner', q: 'Abandonner la partie ?', sub: 'La partie se terminera par une défaite.', yes: 'Oui', no: 'Non' },
  pt: { btn: 'Desistir', q: 'Desistir da partida?', sub: 'A partida terminará como derrota.', yes: 'Sim', no: 'Não' },
  de: { btn: 'Aufgeben', q: 'Partie aufgeben?', sub: 'Die Partie endet als Niederlage für dich.', yes: 'Ja', no: 'Nein' },
  hi: { btn: 'हार मानें', q: 'क्या आप हार मानना चाहते हैं?', sub: 'यह खेल आपकी हार के रूप में समाप्त होगा।', yes: 'हाँ', no: 'नहीं' },
  ar: { btn: 'استسلام', q: 'هل تريد الاستسلام؟', sub: 'ستنتهي المباراة بخسارتك.', yes: 'نعم', no: 'لا' },
};
const icon = '<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
const CSS = `
.rsg-ov{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;transition:opacity .15s}
.rsg-ov.show{opacity:1}
.rsg-box{width:min(360px,calc(100vw - 40px));padding:22px 22px 18px;border-radius:18px;background:var(--panel,#1a1f26);color:var(--text,#eee);border:1px solid var(--line,rgba(255,255,255,.14));box-shadow:0 24px 60px rgba(0,0,0,.5);text-align:center;transform:scale(.96);transition:transform .15s;font-family:inherit}
.rsg-ov.show .rsg-box{transform:none}
.rsg-flag{width:44px;height:44px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;background:rgba(255,107,91,.14);color:#ff8a7a}
.rsg-flag svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.rsg-q{font-size:19px;font-weight:700;margin:0 0 6px}
.rsg-sub{font-size:13.5px;line-height:1.6;color:var(--muted,#9aa);margin:0 0 18px}
.rsg-btns{display:flex;gap:10px}
.rsg-btns button{flex:1;padding:12px 10px;border-radius:12px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;border:1px solid var(--line,rgba(255,255,255,.16));background:rgba(255,255,255,.06);color:var(--text,#eee)}
.rsg-btns button.yes{border:0;background:linear-gradient(180deg,#ff7a6a,#d9483a);color:#fff}
.rsg-btns button:focus-visible{outline:2px solid var(--accent,#e2c275);outline-offset:2px}
html[lang=ar] .rsg-box{direction:rtl}
`;
function tx(lang) { return T[lang] || T[(document.documentElement.lang || 'en')] || T.en; }
let open = null;
function confirm(o) {
  o = o || {};
  if (open) return open;
  if (!document.getElementById('rsgCss')) { const st = document.createElement('style'); st.id = 'rsgCss'; st.textContent = CSS; document.head.appendChild(st); }
  const L = tx(o.lang);
  const ov = document.createElement('div'); ov.className = 'rsg-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = `<div class="rsg-box"><div class="rsg-flag">${icon}</div><p class="rsg-q"></p><p class="rsg-sub"></p><div class="rsg-btns"><button type="button" class="no"></button><button type="button" class="yes"></button></div></div>`;
  ov.querySelector('.rsg-q').textContent = o.question || L.q;
  ov.querySelector('.rsg-sub').textContent = o.note != null ? o.note : L.sub;
  ov.querySelector('.no').textContent = L.no; ov.querySelector('.yes').textContent = L.yes;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  open = new Promise(res => {
    const done = v => { document.removeEventListener('keydown', key, true); ov.classList.remove('show'); setTimeout(() => ov.remove(), 160); open = null; res(v); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(false); } else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); done(document.activeElement === ov.querySelector('.yes')); } };
    ov.querySelector('.no').onclick = () => done(false);
    ov.querySelector('.yes').onclick = () => done(true);
    ov.addEventListener('click', e => { if (e.target === ov) done(false); });
    document.addEventListener('keydown', key, true);
    setTimeout(() => ov.querySelector('.no').focus(), 30);   // safe default: いいえ
  });
  return open;
}
window.Resign = { confirm, label: l => tx(l).btn, icon, T };
})();
