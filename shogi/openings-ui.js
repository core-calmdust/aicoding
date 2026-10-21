/*
 * Shogi openings list: category tabs (beginner / intermediate / advanced / surprise / trending / castles / handicap),
 * category files loaded on demand (openings-<cat>.json) and appended to OPEN.sets, last tab remembered.
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
(function () {
'use strict';
const CATS = ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'];
const FILES = { beg: 1, mid: 1, adv: 1, sp: 1, new: 1, castle: 1 };   // categories with an extra data file
const VER = '20261021op';
const ICON = { beg: '初', mid: '中', adv: '上', sp: '奇', new: '新', castle: '囲', handi: '駒' };
const TXT = {
  ja: { beg: '初心者向け', mid: '中級者向け', adv: '上級者向け', sp: '特殊な戦法', new: '最近の流行', castle: '囲い', handi: '駒落ち',
    'd.beg': 'まずはここから。狙いがはっきりしていて覚えやすい戦法です。', 'd.mid': '定跡の骨格を学ぶ、プロやソフトでも主流の戦型です。', 'd.adv': '細かい手順と深い研究が必要な、上級者向けの戦法です。', 'd.sp': '奇襲や変わり種の戦法。知っておくと、相手に指されたときの対応にも役立ちます。', 'd.new': 'ソフト研究の影響などで、近年プロの間で増えた形です。', 'd.castle': '玉を守る「囲い」の組み方を1手ずつ確認します。相手の手は一例です。',
    desc: '戦型を選ぶと、代表的な手順の解説と、その戦型の局面での実戦練習（Floodgateの強い対局で指された手の頻度から出題）ができます。', studyOnly: '解説', loading: '読み込み中…', fail: '読み込めませんでした', endNo: 'ここまでが基本の手順です。', back: '解説へ戻る' },
  en: { beg: 'Beginner', mid: 'Intermediate', adv: 'Advanced', sp: 'Surprise', new: 'Trending', castle: 'Castles', handi: 'Handicap',
    'd.beg': 'Start here: openings with a clear plan that are easy to remember.', 'd.mid': 'The backbone of opening theory — mainstream for pros and engines.', 'd.adv': 'Openings that need precise move orders and deep study.', 'd.sp': 'Surprise and offbeat openings. Knowing them also helps when someone plays them against you.', 'd.new': 'Setups that became popular among pros in recent years, often thanks to engine research.', 'd.castle': 'Build each king castle move by move. The opponent’s moves are just one example.',
    desc: 'Pick an opening to step through a typical line with notes, then practise positions from it (problems from move frequencies in strong Floodgate games).', studyOnly: 'Study', loading: 'Loading…', fail: 'Could not load', endNo: 'That is the basic line.', back: 'Back to overview' },
  zh: { beg: '入门', mid: '中级', adv: '高级', sp: '奇袭战法', new: '近期流行', castle: '围', handi: '让子棋',
    'd.beg': '从这里开始。目标明确、容易记住的战法。', 'd.mid': '学习定式骨架的战型，职业棋手和软件中的主流。', 'd.adv': '需要精确手顺和深入研究的高级战法。', 'd.sp': '奇袭和另类战法。了解它们，在对手使用时也能从容应对。', 'd.new': '受软件研究等影响，近年在职业棋手中增多的形。', 'd.castle': '一步一步确认守护玉将的“围”的组法。对方的着法只是一例。',
    desc: '选择战型，可以逐手观看代表性着法的讲解，并在该战型的局面中进行实战练习（根据Floodgate强者对局中的着法频率出题）。', studyOnly: '讲解', loading: '读取中…', fail: '读取失败', endNo: '以上是基本着法。', back: '返回讲解' },
  ko: { beg: '초급', mid: '중급', adv: '고급', sp: '특수 전법', new: '최근 유행', castle: '성(가코이)', handi: '접장기',
    'd.beg': '여기서 시작하세요. 목표가 분명하고 외우기 쉬운 전법입니다.', 'd.mid': '정석의 뼈대를 배우는, 프로와 소프트에서도 주류인 전형입니다.', 'd.adv': '세밀한 수순과 깊은 연구가 필요한 상급자용 전법입니다.', 'd.sp': '기습이나 색다른 전법. 알아 두면 상대가 썼을 때 대응에도 도움이 됩니다.', 'd.new': '소프트 연구의 영향 등으로 최근 프로 사이에서 늘어난 형태입니다.', 'd.castle': '왕을 지키는 ‘성’을 짓는 법을 한 수씩 확인합니다. 상대의 수는 한 예입니다.',
    desc: '전형을 고르면 대표 수순의 해설과, 그 전형 국면에서의 실전 연습(Floodgate 강자 대국에서 둔 수의 빈도로 출제)을 할 수 있습니다.', studyOnly: '해설', loading: '불러오는 중…', fail: '불러오지 못했습니다', endNo: '여기까지가 기본 수순입니다.', back: '해설로 돌아가기' },
  es: { beg: 'Principiante', mid: 'Intermedio', adv: 'Avanzado', sp: 'Sorpresa', new: 'Tendencias', castle: 'Castillos', handi: 'Hándicap',
    'd.beg': 'Empieza aquí: aperturas con un plan claro y fáciles de recordar.', 'd.mid': 'La columna vertebral de la teoría: lo habitual entre profesionales y motores.', 'd.adv': 'Aperturas que exigen órdenes de jugadas precisos y estudio profundo.', 'd.sp': 'Aperturas sorpresa y poco comunes. Conocerlas también ayuda cuando te las juegan.', 'd.new': 'Esquemas que se han vuelto populares entre los profesionales en los últimos años, a menudo gracias a los motores.', 'd.castle': 'Construye cada castillo del rey jugada a jugada. Las jugadas del rival son solo un ejemplo.',
    desc: 'Elige una apertura para recorrer una línea típica con comentarios y luego practicar posiciones de ella (problemas según la frecuencia de jugadas en partidas fuertes de Floodgate).', studyOnly: 'Estudio', loading: 'Cargando…', fail: 'No se pudo cargar', endNo: 'Esta es la línea básica.', back: 'Volver a la explicación' },
  fr: { beg: 'Débutant', mid: 'Intermédiaire', adv: 'Avancé', sp: 'Surprises', new: 'Tendances', castle: 'Châteaux', handi: 'Handicap',
    'd.beg': 'Commencez ici : des ouvertures au plan clair, faciles à retenir.', 'd.mid': 'La colonne vertébrale de la théorie, courante chez les pros et les moteurs.', 'd.adv': 'Des ouvertures qui demandent des ordres de coups précis et une étude poussée.', 'd.sp': 'Ouvertures surprises et originales. Les connaître aide aussi quand on vous les joue.', 'd.new': 'Des dispositifs devenus populaires chez les pros ces dernières années, souvent grâce aux moteurs.', 'd.castle': 'Construisez chaque château du roi coup par coup. Les coups adverses ne sont qu’un exemple.',
    desc: 'Choisissez une ouverture pour suivre une ligne type commentée, puis vous entraîner sur ses positions (problèmes tirés de la fréquence des coups dans les fortes parties Floodgate).', studyOnly: 'Étude', loading: 'Chargement…', fail: 'Chargement impossible', endNo: 'Voilà la ligne de base.', back: 'Retour à la présentation' },
  pt: { beg: 'Iniciante', mid: 'Intermediário', adv: 'Avançado', sp: 'Surpresa', new: 'Tendências', castle: 'Castelos', handi: 'Handicap',
    'd.beg': 'Comece aqui: aberturas com um plano claro e fáceis de lembrar.', 'd.mid': 'A espinha dorsal da teoria — o padrão entre profissionais e engines.', 'd.adv': 'Aberturas que exigem ordens de lances precisas e estudo profundo.', 'd.sp': 'Aberturas surpresa e incomuns. Conhecê-las também ajuda quando alguém as joga contra você.', 'd.new': 'Esquemas que ficaram populares entre os profissionais nos últimos anos, muitas vezes graças às engines.', 'd.castle': 'Monte cada castelo do rei lance a lance. Os lances do adversário são apenas um exemplo.',
    desc: 'Escolha uma abertura para percorrer uma linha típica com comentários e depois praticar posições dela (problemas pela frequência dos lances em partidas fortes do Floodgate).', studyOnly: 'Estudo', loading: 'Carregando…', fail: 'Não foi possível carregar', endNo: 'Esta é a linha básica.', back: 'Voltar à explicação' },
  de: { beg: 'Einsteiger', mid: 'Mittelstufe', adv: 'Experten', sp: 'Überraschung', new: 'Aktuell', castle: 'Burgen', handi: 'Vorgabe',
    'd.beg': 'Hier anfangen: Eröffnungen mit klarem Plan, leicht zu merken.', 'd.mid': 'Das Rückgrat der Eröffnungstheorie – Standard bei Profis und Engines.', 'd.adv': 'Eröffnungen, die genaue Zugfolgen und tiefe Vorbereitung verlangen.', 'd.sp': 'Überraschungs- und Außenseitereröffnungen. Wer sie kennt, weiß auch, wie man ihnen begegnet.', 'd.new': 'Aufstellungen, die in den letzten Jahren bei Profis beliebt wurden – oft dank Engine-Analysen.', 'd.castle': 'Jede Königsburg Zug für Zug aufbauen. Die Züge des Gegners sind nur ein Beispiel.',
    desc: 'Wähle eine Eröffnung, spiele eine typische Variante mit Erklärungen durch und übe dann Stellungen daraus (Aufgaben nach Zughäufigkeiten in starken Floodgate-Partien).', studyOnly: 'Lernen', loading: 'Wird geladen…', fail: 'Konnte nicht geladen werden', endNo: 'Das ist die Grundvariante.', back: 'Zurück zur Übersicht' },
  hi: { beg: 'शुरुआती', mid: 'मध्यम', adv: 'उन्नत', sp: 'अनोखी चालें', new: 'नया चलन', castle: 'किले', handi: 'हैंडीकैप',
    'd.beg': 'यहाँ से शुरू करें: साफ़ योजना वाली, याद रखने में आसान ओपनिंग।', 'd.mid': 'ओपनिंग सिद्धांत की रीढ़ — पेशेवरों और इंजनों में आम।', 'd.adv': 'ऐसी ओपनिंग जिनमें सटीक चाल-क्रम और गहरी तैयारी चाहिए।', 'd.sp': 'चौंकाने वाली और अनोखी ओपनिंग। इन्हें जानना तब भी काम आता है जब कोई आपके ख़िलाफ़ खेले।', 'd.new': 'हाल के वर्षों में पेशेवरों में लोकप्रिय हुई व्यवस्थाएँ, अक्सर इंजन शोध की बदौलत।', 'd.castle': 'राजा का हर किला चाल-दर-चाल बनाएँ। विरोधी की चालें केवल एक उदाहरण हैं।',
    desc: 'कोई ओपनिंग चुनें, टिप्पणियों के साथ एक सामान्य लाइन देखें, फिर उसकी स्थितियों का अभ्यास करें (मज़बूत Floodgate गेम में चालों की आवृत्ति से सवाल)।', studyOnly: 'अध्ययन', loading: 'लोड हो रहा है…', fail: 'लोड नहीं हो सका', endNo: 'यही बुनियादी लाइन है।', back: 'विवरण पर लौटें' },
  ar: { beg: 'للمبتدئين', mid: 'متوسط', adv: 'متقدم', sp: 'مفاجآت', new: 'الرائج', castle: 'القلاع', handi: 'الأفضلية',
    'd.beg': 'ابدأ من هنا: افتتاحات بخطة واضحة يسهل تذكّرها.', 'd.mid': 'العمود الفقري لنظرية الافتتاح، والشائع لدى المحترفين والمحركات.', 'd.adv': 'افتتاحات تتطلب ترتيب نقلات دقيقًا ودراسة عميقة.', 'd.sp': 'افتتاحات مفاجئة وغير مألوفة. معرفتها تفيد أيضًا عندما يلعبها خصمك.', 'd.new': 'ترتيبات انتشرت بين المحترفين في السنوات الأخيرة، غالبًا بفضل أبحاث المحركات.', 'd.castle': 'ابنِ كل قلعة للملك نقلة بنقلة. نقلات الخصم مجرد مثال.',
    desc: 'اختر افتتاحًا لتتابع خطًا نموذجيًا مع الشرح، ثم تدرّب على مواقفه (مسائل مبنية على تكرار النقلات في مباريات Floodgate القوية).', studyOnly: 'دراسة', loading: 'جارٍ التحميل…', fail: 'تعذّر التحميل', endNo: 'هذا هو الخط الأساسي.', back: 'العودة إلى الشرح' },
};
const CSS = `
.opx-tabs{display:flex;gap:6px;margin:0 0 10px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px}
.opx-tabs::-webkit-scrollbar{display:none}
.opx-tabs button{flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 10px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--muted);font-size:14px;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.opx-tabs button .ic{flex:none;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font-family:'Shippori Mincho B1',serif;font-size:15px;background:rgba(201,169,97,.14);color:var(--brass)}
.opx-tabs button .ct{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)}
.opx-tabs button:hover{border-color:var(--brass2)}
.opx-tabs button.sel{color:var(--text);border-color:var(--brass);background:linear-gradient(180deg,rgba(201,169,97,.2),rgba(201,169,97,.06));box-shadow:inset 0 -2px 0 var(--brass)}
.opx-tabs button.sel .ic{background:var(--brass);color:#1b150a}
#lessonList > .opx-tabs, #lessonList > .opx-note{grid-column:1/-1}
.opx-note{font-size:14px;color:var(--dim);margin:0 0 6px;line-height:1.65}
.lesson-item .st.opx-so{color:var(--brass);opacity:.8}
.opx-wait{grid-column:1/-1;color:var(--dim);font-size:14px;padding:18px 4px}
@media (max-width: 759px){
  .opx-tabs{margin-left:-2px;margin-right:-2px}
  .opx-tabs button{flex:0 0 auto;padding:8px 10px;font-size:13px;gap:6px}
  .opx-tabs button .ic{width:22px;height:22px;font-size:13px}
}
html[lang=ar] .opx-note{direction:rtl;text-align:right}
`;
let H = null, cur = null, cache = {}, styled = false;
const KEY = 'shogi-kaya-optab';
try { cur = localStorage.getItem(KEY); } catch (e) {}
if (!CATS.includes(cur)) cur = 'beg';
const tx = k => { const l = H ? H.lang() : 'ja'; return (TXT[l] && TXT[l][k]) || TXT.en[k] || k; };
const catOf = g => g.cat || (g.handi ? 'handi' : 'mid');
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
// load one category's data file and append its sets to OPEN.sets (indices of earlier sets never change)
function ensure(cat) {
  if (!FILES[cat]) return Promise.resolve(true);
  if (cache[cat]) return cache[cat];
  return (cache[cat] = fetch(`openings-${cat}.json?v=${VER}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
    const O = H.open(); if (!O) return false;
    const have = new Set(O.sets.map(g => g.id));
    for (const g of d.sets || []) if (!have.has(g.id)) { g.cat = g.cat || cat; O.sets.push(g); }
    return true;
  }).catch(() => { delete cache[cat]; return false; }));
}
const ensureAll = () => Promise.all(CATS.map(ensure));
// index of a set id in OPEN.sets, loading the category files when needed
async function findId(id) {
  const O = H.open(); if (!O) return -1;
  let i = O.sets.findIndex(g => g.id === id); if (i >= 0) return i;
  await ensureAll();
  return H.open().sets.findIndex(g => g.id === id);
}
const hasPractice = g => !!(g.problems && g.problems.length >= 5);
function item(g, i) {
  const pr = H.prog()[g.id], L = H.L, t = H.t;
  const st = !hasPractice(g) ? `<span class="st opx-so">📖 ${tx('studyOnly')}</span>` : pr ? `<span class="st ${pr.pass ? 'clear' : ''}">${pr.pass ? '✓ ' : ''}${t('ls.bestPts', { p: pr.best })}</span>` : `<span class="st">${t('ls.new')}</span>`;
  return `<button class="lesson-item" data-o="${i}"><span class="no" style="font-size:13px">${L(g.label)}</span><span class="tx"><b>${L(g.title)}</b><small>${L(g.short)}</small></span>${st}</button>`;
}
function tabs() {
  const O = H.open(), cnt = {};
  for (const g of O.sets) { const c = catOf(g); cnt[c] = (cnt[c] || 0) + 1; }
  return `<div class="opx-tabs" role="tablist">${CATS.map(c => `<button role="tab" data-opcat="${c}" class="${c === cur ? 'sel' : ''}" aria-selected="${c === cur}"><span class="ic">${ICON[c]}</span><span class="nm">${tx(c)}</span>${FILES[c] && !cache[c] ? '' : `<span class="ct">${cnt[c] || 0}</span>`}</button>`).join('')}</div>`;
}
let token = 0;
// render the openings list into #lessonList for the current tab
async function render() {
  style();
  const el = document.getElementById('lessonList'), O = H.open(); if (!el || !O) return;
  const my = ++token, c = cur;
  const head = () => tabs() + (c === 'handi' ? `<p class="opx-note">${H.t('op.handiNote')}</p>` : `<p class="opx-note">${tx('d.' + c)}</p>`);
  el.innerHTML = head() + `<p class="opx-wait">${tx('loading')}</p>`;
  const ok = await ensure(c);
  if (my !== token || !document.getElementById('lessonList').querySelector('.opx-tabs')) return;
  const list = H.open().sets.map((g, i) => catOf(g) === c ? item(g, i) : '').join('');
  el.innerHTML = head() + (list || `<p class="opx-wait">${tx(ok ? 'loading' : 'fail')}</p>`) + (c !== 'castle' && c !== 'handi' && H.open().credit ? `<p class="ls-credit">${H.L(H.open().credit)}</p>` : '');
  const sb = el.querySelector('.opx-tabs .sel'); if (sb && sb.scrollIntoView) { const bar = sb.parentNode; bar.scrollLeft = Math.max(0, sb.offsetLeft - (bar.clientWidth - sb.offsetWidth) / 2); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('.opx-tabs button[data-opcat]'); if (!b) return;
  e.stopPropagation();
  cur = b.dataset.opcat; try { localStorage.setItem(KEY, cur); } catch (x) {}
  render();
}, true);
window.ShogiOpenUI = {
  init(h) { H = h; },
  render, ensure, ensureAll, findId, hasPractice, tx,
  get cat() { return cur; },
  set cat(c) { if (CATS.includes(c)) { cur = c; try { localStorage.setItem(KEY, cur); } catch (x) {} } },
  catOf, CATS,
};
})();
