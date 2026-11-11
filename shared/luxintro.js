/* shared/luxintro.js — the lesson / opening page of every game in one format (2026-11-11, from shogi's "luxury" page)
   The games keep their own #lessonOverlay › #lessonIntroView (#liStep, #liTitle, #liBody, .modal-actions) and fill it through:
     LuxIntro.lesson({ step, title, fig, cap, chips: [[label, value]…], secs: [{ h, html }…] })
     LuxIntro.opening({ step, title, lead: [html…], choices: [{ ic, b, small, attrs }…], fig, cap, secs: [{ h, html }…] })
     LuxIntro.pick(obj, lang) — a value from { ja, en, … } (en, then ja as fallbacks); arrays and strings pass through
     LuxIntro.load(url) → Promise of a game's lux.json (the extra texts: tips, trivia, history …), cached
   Layout: a centred step line and title over a gold hairline; phones — the sample board on a soft plate, the facts in one row, the
   sections as open text under small spaced gold heads; wide screens (≥900px) — the board on the left, everything else beside it.
   Colours follow the game: --lux-acc (default the game's --brass / --accent, else gold), text in the page's own colour. */
(function () {
  'use strict';
  if (window.LuxIntro) return;
  const A = 'var(--lux-acc,var(--brass,var(--accent,#c9a961)))', mix = (p) => `color-mix(in srgb,${A} ${p}%,transparent)`;
  const V = '#lessonIntroView.lux';
  const CSS = `
${V} #liStep,${V} .lt,${V} .li-step{text-align:center;font-size:12px;letter-spacing:.34em;margin:6px 0 0;color:${A};opacity:.9;font-weight:600}
${V} #liTitle{text-align:center;margin:10px 0 22px!important;font-size:30px;letter-spacing:.1em;line-height:1.3}
${V} #liTitle::after{content:'';display:block;width:56px;height:1px;margin:16px auto 0;background:linear-gradient(90deg,transparent,${A},transparent)}
${V} #liBody{max-width:1000px;margin:0 auto}
${V} #liBody > *{box-sizing:border-box}
${V} .lx-fig{margin:0 auto 22px;width:min-content;max-width:100%;padding:16px 16px 10px;border-radius:20px;background:radial-gradient(120% 90% at 50% 0%,${mix(14)},transparent 70%);direction:ltr}
${V} .lx-fig > :first-child{display:block;margin:0 auto}
${V} .lx-fig svg,${V} .lx-fig canvas,${V} .lx-fig img{display:block;max-width:100%;height:auto}
${V} .lx-fig > svg,${V} .lx-fig > div:has(> svg:only-child),${V} .lx-fig > div:has(> canvas:only-child){width:var(--lux-fig,min(300px,76vw))!important;max-width:none!important;margin:0 auto!important}
${V} .lx-fig > div:has(> svg:only-child) > svg,${V} .lx-fig > div:has(> canvas:only-child) > canvas{width:100%!important;height:auto!important}
${V} .lx-fig figcaption{font-size:11.5px;letter-spacing:.14em;text-align:center;opacity:.72;margin-top:8px;min-width:12em}
${V} .lx-chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));border-top:1px solid ${mix(35)};border-bottom:1px solid ${mix(35)};margin:0 0 24px}
${V} .lx-chip{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:12px 6px;min-width:0}
${V} .lx-chip + .lx-chip{border-inline-start:1px solid ${mix(25)}}
${V} .lx-chip small{font-size:10.5px;letter-spacing:.2em;opacity:.75;white-space:nowrap}
${V} .lx-chip b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
${V} .lx-sec{margin:0 0 20px}
${V} .lx-sec h4{font-size:12px;letter-spacing:.28em;margin:0 0 8px;display:flex;align-items:center;gap:14px;color:${A};font-weight:700}
${V} .lx-sec h4::after{content:'';flex:1;height:1px;background:${mix(30)}}
${V} .lx-sec p{font-size:15px;line-height:1.9;margin:0 0 10px}
${V} .lx-sec p:last-child{margin-bottom:0}
${V} .lx-sec ul{margin:0;padding-inline-start:1.2em}${V} .lx-sec li{font-size:15px;line-height:1.85;margin:0 0 4px}
${V} .lx-sec.lx-trivia h4::after{display:none}
${V} .lx-sec.lx-trivia{padding:14px 16px;border-radius:14px;background:${mix(8)};border:1px solid ${mix(22)}}
${V} .lx-lead p{font-size:15.5px;line-height:1.95;margin:0 0 10px}
${V} .lx-lead{margin:0 0 22px}
${V} .lx-choice{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 28px}
${V} .lx-choice > button{display:flex;align-items:center;gap:14px;width:100%;border:1px solid ${mix(45)};border-radius:14px;padding:16px 18px;background:linear-gradient(180deg,${mix(10)},transparent);color:inherit;font:inherit;text-align:start;cursor:pointer;box-shadow:none}
${V} .lx-choice > button:hover{border-color:${mix(80)};background:linear-gradient(180deg,${mix(18)},transparent)}
${V} .lx-choice .lx-ic{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid ${mix(55)};font-size:17px;color:${A}}
${V} .lx-choice b{display:block;font-size:15.5px;letter-spacing:.06em}
${V} .lx-choice small{display:block;font-size:12.5px;line-height:1.6;opacity:.75;margin-top:2px}
@media (max-width:560px){
  ${V} #liStep,${V} .lt,${V} .li-step{font-size:11px;letter-spacing:.28em}
  ${V} #liTitle{font-size:24px;margin:8px 0 14px!important;letter-spacing:.06em}
  ${V} #liTitle::after{width:44px;margin-top:12px}
  ${V} .lx-fig{padding:12px 12px 8px;border-radius:18px;margin-bottom:16px}
  ${V} .lx-chips{margin-bottom:18px}
  ${V} .lx-chip{padding:9px 3px}${V} .lx-chip small{font-size:9.5px;letter-spacing:.1em}${V} .lx-chip b{font-size:13.5px}
  ${V} .lx-sec p,${V} .lx-sec li{font-size:14.5px;line-height:1.85}
  ${V} .lx-lead p{font-size:14.5px;line-height:1.85}
  ${V} .lx-choice{grid-template-columns:1fr;gap:8px;margin-bottom:22px}
  ${V} .lx-choice > button{padding:12px 14px}
}
@media (min-width:900px){
  #lessonOverlay .modal:has(> ${V}:not(.hidden)){width:min(1080px,94vw)!important;max-width:none!important}
  ${V} #liBody{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:44px;align-items:start}
  ${V} #liBody > *{grid-column:2}
  ${V} #liBody > .lx-fig{grid-column:1;grid-row:1 / span 12;margin:0;position:sticky;top:0}
  ${V} #liBody:not(:has(> .lx-fig)){display:block;max-width:760px}
  ${V} .lx-chips{margin-top:2px}
}
html[dir=rtl] ${V} .lx-fig figcaption,html[lang=ar] ${V} .lx-sec{direction:rtl}
`;
  function css() { if (document.getElementById('luxintro-css')) return; const s = document.createElement('style'); s.id = 'luxintro-css'; s.textContent = CSS; document.head.appendChild(s); }
  const lang = () => (document.documentElement.lang || 'ja');
  function pick(o, l = lang()) {
    if (o == null) return '';
    if (typeof o === 'string' || Array.isArray(o)) return o;
    return o[l] != null ? o[l] : o[l.split('-')[0]] != null ? o[l.split('-')[0]] : o.en != null ? o.en : o.ja != null ? o.ja : '';
  }
  const paras = x => (Array.isArray(x) ? x : [x]).filter(Boolean).map(p => /^\s*<(p|ul|ol|div)\b/i.test(p) ? p : `<p>${p}</p>`).join('');
  const $ = id => document.getElementById(id);
  function shell(step, title, open) {
    css();
    const v = $('lessonIntroView'); if (!v) return null;
    v.classList.add('lux'); v.classList.toggle('lux-open', !!open);
    const st = $('liStep'); if (st) st.textContent = step || '';
    const ti = $('liTitle'); if (ti) ti.textContent = title || '';
    return $('liBody');
  }
  const figH = (fig, cap) => fig ? `<figure class="lx-fig">${fig}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>` : '';
  const secH = s => s && s.html ? `<div class="lx-sec${s.cls ? ' ' + s.cls : ''}"><h4>${s.h}</h4>${paras(s.html)}</div>` : '';
  function lesson(o) {
    const b = shell(o.step, o.title, false); if (!b) return;
    const chips = (o.chips || []).filter(c => c && c[1] != null && c[1] !== '');
    b.innerHTML = figH(o.fig, o.cap) + (chips.length ? `<div class="lx-chips">${chips.map(([k, v]) => `<div class="lx-chip"><small>${k}</small><b>${v}</b></div>`).join('')}</div>` : '') + (o.secs || []).map(secH).join('');
  }
  function opening(o) {
    const b = shell(o.step, o.title, true); if (!b) return;
    const ch = (o.choices || []).filter(Boolean);
    b.innerHTML = figH(o.fig, o.cap) + (o.lead ? `<div class="lx-lead">${paras(o.lead)}</div>` : '') +
      (ch.length ? `<div class="lx-choice">${ch.map(c => `<button type="button" class="lesson-item" ${c.attrs || ''}><span class="lx-ic">${c.ic || '▶'}</span><span class="lx-tx"><b>${c.b}</b>${c.small ? `<small>${c.small}</small>` : ''}</span></button>`).join('')}</div>` : '') +
      (o.secs || []).map(secH).join('');
  }
  function off() { const v = $('lessonIntroView'); if (v) v.classList.remove('lux', 'lux-open'); }
  const cache = {};
  function load(url) { return cache[url] || (cache[url] = fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({}))); }
  // the section heads in every language (a game can pass its own)
  const H = {
    goal: { ja: 'このレッスンの目標', en: 'Goal of this lesson', zh: '本课目标', 'zh-TW': '本課目標', ko: '이번 레슨의 목표', es: 'Objetivo de la lección', fr: 'Objectif de la leçon', pt: 'Objetivo da lição', de: 'Ziel der Lektion', hi: 'इस पाठ का लक्ष्य', ar: 'هدف الدرس', ru: 'Цель урока', id: 'Tujuan pelajaran', tr: 'Dersin hedefi' },
    think: { ja: '考え方', en: 'How to think', zh: '思路', 'zh-TW': '思路', ko: '생각하는 법', es: 'Cómo pensar', fr: 'Comment réfléchir', pt: 'Como pensar', de: 'So denkt man', hi: 'कैसे सोचें', ar: 'طريقة التفكير', ru: 'Как думать', id: 'Cara berpikir', tr: 'Nasıl düşünmeli' },
    tips: { ja: 'コツ', en: 'Tips', zh: '诀窍', 'zh-TW': '訣竅', ko: '요령', es: 'Consejos', fr: 'Astuces', pt: 'Dicas', de: 'Tipps', hi: 'सुझाव', ar: 'نصائح', ru: 'Советы', id: 'Kiat', tr: 'İpuçları' },
    trivia: { ja: 'ちょっと雑学', en: 'Did you know?', zh: '小知识', 'zh-TW': '小知識', ko: '알고 있나요?', es: '¿Sabías que…?', fr: 'Le saviez-vous ?', pt: 'Você sabia?', de: 'Schon gewusst?', hi: 'क्या आप जानते हैं?', ar: 'هل تعلم؟', ru: 'А вы знали?', id: 'Tahukah kamu?', tr: 'Biliyor muydunuz?' },
    how: { ja: '進め方', en: 'How it works', zh: '进行方式', 'zh-TW': '進行方式', ko: '진행 방법', es: 'Cómo funciona', fr: 'Déroulement', pt: 'Como funciona', de: 'Ablauf', hi: 'कैसे चलता है', ar: 'طريقة السير', ru: 'Как проходит', id: 'Cara kerja', tr: 'Nasıl ilerler' },
    hist: { ja: '歴史・エピソード', en: 'History', zh: '历史与轶事', 'zh-TW': '歷史與軼事', ko: '역사와 에피소드', es: 'Historia', fr: 'Histoire', pt: 'História', de: 'Geschichte', hi: 'इतिहास', ar: 'التاريخ', ru: 'История', id: 'Sejarah', tr: 'Tarihçe' },
    who: { ja: 'この定跡を好む名手', en: 'Who plays it', zh: '擅长的名家', 'zh-TW': '擅長的名家', ko: '즐겨 둔 명수', es: 'Quién la juega', fr: 'Qui la joue', pt: 'Quem a joga', de: 'Wer sie spielt', hi: 'कौन खेलता है', ar: 'من يلعبها', ru: 'Кто играет', id: 'Siapa yang memainkannya', tr: 'Kimler oynar' },
    plan: { ja: 'ねらいと構想', en: 'Ideas and plans', zh: '思路与构想', 'zh-TW': '思路與構想', ko: '노림수와 구상', es: 'Ideas y planes', fr: 'Idées et plans', pt: 'Ideias e planos', de: 'Ideen und Pläne', hi: 'विचार और योजना', ar: 'الأفكار والخطط', ru: 'Идеи и планы', id: 'Ide dan rencana', tr: 'Fikirler ve planlar' },
  };
  const head = (k, l) => pick(H[k], l) || k;
  window.LuxIntro = { lesson, opening, off, pick, load, head, paras, css };
})();
