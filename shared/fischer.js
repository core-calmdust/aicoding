// Fischer — the "Fischer" time control shared by every game with a clock (世界のボドゲ大百科 common spec,
// 持ち時間のフィッシャー, claude/game-conventions-addendum.md).
// A main time per player; after every move (the first one included) the mover's remaining time grows by the increment.
// No byoyomi: running out of main time loses.
//
//   Fischer.PRESETS                    ['1+1', '3+2', '5+3', '10+5', '15+10', '30+20'] (minutes + seconds)
//   Fischer.parse('5+3')               { main: 300, inc: 3 } (seconds) — null for anything else
//   Fischer.norm(id, list)             a valid preset id (default '5+3')
//   Fischer.name(lang)                 'フィッシャー' / 'Fischer' …
//   Fischer.label(id, lang)            '5分＋1手3秒' / '5 min + 3 s/move' …
//   Fischer.short(id, lang)            '5分+3秒' / '5+3' (buttons)
//   Fischer.desc(id, lang)             one sentence for the note under the picker
//   Fischer.picker(el, { lang: () => code, get: () => id, set: id => {}, presets })   → { sync() }
//     renders the presets as a 3-column seg (the game's .seg styles) + the note into el; sync() repaints (language / value)
//   Fischer.budget(leftMs, incMs, o)   think time (ms) for an AI on a Fischer clock: remain/30 + inc·0.8, kept clear of the flag
(function () {
'use strict';
const PRESETS = ['1+1', '3+2', '5+3', '10+5', '15+10', '30+20'], DEF = '5+3';
const T = {
  ja: ['フィッシャー', '{m}分＋1手{s}秒', '{m}分+{s}秒', '持ち時間{m}分。1手ごとに{s}秒ずつ増えます（使い切ると負け）'],
  en: ['Fischer', '{m} min + {s} s/move', '{m}+{s}', '{m} minutes; {s} seconds are added after each of your moves (running out loses)'],
  zh: ['加秒制', '{m}分+每步{s}秒', '{m}分+{s}秒', '共{m}分钟，每走一步加{s}秒（用完判负）'],
  'zh-TW': ['加秒制', '{m}分+每步{s}秒', '{m}分+{s}秒', '共{m}分鐘，每走一步加{s}秒（用完判負）'],
  ko: ['피셔', '{m}분+수당 {s}초', '{m}분+{s}초', '총 {m}분, 한 수 둘 때마다 {s}초 추가 (다 쓰면 패배)'],
  es: ['Fischer', '{m} min + {s} s/jugada', '{m}+{s}', '{m} minutos; se suman {s} s tras cada jugada (si se agota, pierdes)'],
  fr: ['Fischer', '{m} min + {s} s/coup', '{m}+{s}', '{m} minutes ; {s} s ajoutées après chaque coup (temps écoulé = perdu)'],
  pt: ['Fischer', '{m} min + {s} s/lance', '{m}+{s}', '{m} minutos; +{s} s após cada lance (se acabar, perde)'],
  de: ['Fischer', '{m} Min. + {s} s/Zug', '{m}+{s}', '{m} Minuten; nach jedem Zug kommen {s} s dazu (Zeit abgelaufen = verloren)'],
  ru: ['Фишер', '{m} мин + {s} с/ход', '{m}+{s}', '{m} мин; после каждого хода +{s} с (время вышло — поражение)'],
  tr: ['Fischer', '{m} dk + hamle başı {s} sn', '{m}+{s}', '{m} dakika; her hamleden sonra +{s} sn (süre biterse kaybedersin)'],
  id: ['Fischer', '{m} mnt + {s} dtk/langkah', '{m}+{s}', '{m} menit; +{s} detik setiap selesai melangkah (waktu habis = kalah)'],
  hi: ['फ़िशर', '{m} मि. + {s} से./चाल', '{m}+{s}', '{m} मिनट; हर चाल के बाद {s} सेकंड जुड़ते हैं (समय खत्म = हार)'],
  ar: ['فيشر', '{m} د + {s} ث لكل نقلة', '{m}+{s}', '{m} دقائق؛ تُضاف {s} ثوانٍ بعد كل نقلة (نفاد الوقت = خسارة)'],
};
const L = lang => T[lang] || T[String(lang || '').split('-')[0]] || T.en;
function parse(id) {
  const m = /^(\d{1,3})\+(\d{1,3})$/.exec(String(id || ''));
  return m && +m[1] > 0 ? { main: +m[1] * 60, inc: +m[2] } : null;
}
const norm = (id, list) => (list || PRESETS).indexOf(id) >= 0 ? id : (list || PRESETS).indexOf(DEF) >= 0 ? DEF : (list || PRESETS)[0];
const fill = (s, id) => { const c = parse(id) || parse(DEF); return s.replace('{m}', c.main / 60).replace('{s}', c.inc); };
const name = lang => L(lang)[0];
const label = (id, lang) => fill(L(lang)[1], id);
const short = (id, lang) => fill(L(lang)[2], id);
const desc = (id, lang) => fill(L(lang)[3], id);
let css = false;
function picker(el, o) {
  if (!css) {
    css = true;
    const st = document.createElement('style');
    st.textContent = '.fis-pick{margin-top:6px}.fis-pick .seg.fis-seg:not(.pd-on){display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}' +
      '.fis-pick .seg.fis-seg button{min-width:0;white-space:nowrap;grid-column:auto!important}.fis-pick .fis-note{display:block;margin-top:5px;font-size:11px;line-height:1.45;opacity:.75}';
    document.head.appendChild(st);
  }
  const list = o.presets || PRESETS;
  el.classList.add('fis-pick');
  el.innerHTML = '<div class="seg fis-seg">' + list.map(id => `<button type="button" data-fis="${id}"></button>`).join('') + '</div><small class="fis-note"></small>';
  el.addEventListener('click', e => { const b = e.target.closest('button[data-fis]'); if (!b) return; e.stopPropagation(); o.set(b.dataset.fis); sync(); });
  function sync() {
    const lang = o.lang(), cur = norm(o.get(), list);
    el.querySelectorAll('button[data-fis]').forEach(b => { b.textContent = short(b.dataset.fis, lang); b.title = label(b.dataset.fis, lang); b.classList.toggle('sel', b.dataset.fis === cur); });
    el.querySelector('.fis-note').textContent = desc(cur, lang);
  }
  sync();
  return { sync };
}
// AI think time on a Fischer clock (ms): about remain/30 plus most of the increment, never more than a fifth of what is left
// (so it cannot flag), never below min (default 100 ms)
function budget(leftMs, incMs, o) {
  o = o || {};
  const min = o.min == null ? 100 : o.min, left = Math.max(0, leftMs), inc = Math.max(0, incMs || 0);
  let t = left / (o.moves || 30) + inc * 0.8;
  t = Math.min(t, left / 5 + inc * 0.5, o.max || Infinity);
  return Math.max(Math.min(min, left / 5), t);
}
window.Fischer = { PRESETS, DEF, parse, norm, name, label, short, desc, picker, budget };
})();
