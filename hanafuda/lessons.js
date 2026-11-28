/* 花札（こいこい）— lessons: 札と月の覚え方 / 役 / こいこいの判断.
   Each item: a real card position, one question, an explanation after answering.
   The koi-koi items were checked with the AI (Lv.20, playouts): see claude/hanafuda-spec.md. */
(function () {
'use strict';
const A = window.HFApp, HF = window.HF, C = window.HFCards;
const STORE = 'aicoding-hanafuda-lessons';
const T = {
ja: {
  h: 'レッスン', lead: '札の見分け方から、役の作り方、こいこいの判断まで。実際の札で考えます。', back: '一覧へ戻る', quit: 'レッスンをやめる', next: '次の問題', again: 'もう一度',
  ok: '正解！', ng: '惜しい！', done: '合格', todo: '未挑戦',
  'c.months': '札と月', 'c.months.d': '同じ月の札を素早く見分け、取れる札を見つける。', 'c.yaku': '役', 'c.yaku.d': 'どの札を取れば役になり、何点になるか。', 'c.koi': 'こいこいの判断', 'c.koi.d': '勝負するか、こいこいで続けるか。',
  'm1.t': '菖蒲と藤', 'm1.q': '手札は菖蒲（5月）。同じ月の札を場から選んでください。', 'm1.e': '菖蒲に八橋は5月。藤（4月）と色が似ていますが、菖蒲は剣のような葉と、橋が目印です。',
  'm2.t': '場に3枚ある月', 'm2.q': '場に桜が3枚あります。いちばん多く取れる手札はどれ？', 'm2.e': '場に同じ月が3枚あるとき、4枚目を出すと3枚まとめて取れます。桜の幕（光）も一緒に手に入ります。',
  'y1.t': '四光と雨四光', 'y1.q': '光を3枚持っています。点が高くなる札を取ってください。', 'y1.e': '桐に鳳凰なら四光で8点。柳に小野道風（雨）を入れた4枚は雨四光で7点です。',
  'y2.t': '月見で一杯', 'y2.q': '芒に月を取っています。すぐに5点の役になる札は？', 'y2.e': '芒に月と菊に盃で「月見で一杯」5点。菊に盃は桜に幕と組むと「花見で一杯」にもなる大事な札です。',
  'k1.t': '相手が迫っているとき', 'k1.q': 'あなたは赤短で5点。相手は猪と鹿を取っていて、場に牡丹に蝶があります。', 'k1.e': '相手は次の番に蝶を取れば猪鹿蝶。こいこいしてから作られると相手の点が2倍です。AI（Lv.20）の読みでも、勝負の5点に対しこいこいは平均でマイナス。ここは勝負です。',
  'k2.t': 'まだ序盤で1点のとき', 'k2.q': 'タネ5枚で1点。相手の取り札はカス3枚だけ、手札はまだ6枚あります。', 'k2.e': 'いま止めても1点。相手は役から遠く、自分は赤短があと1枚（場に桜の短冊）。AI（Lv.20）の読みでは、こいこいの期待値は約6点で、勝負の1点を大きく上回ります。',
  stop: '勝負', go: 'こいこい', field: '場', hand: '手札', caps: 'あなたの取り札', opp: '相手の取り札',
},
en: {
  h: 'Lessons', lead: 'From telling the cards apart to building yaku and deciding koi-koi — on real cards.', back: 'Back to the list', quit: 'Quit the lesson', next: 'Next', again: 'Try again',
  ok: 'Correct!', ng: 'Not quite!', done: 'Passed', todo: 'Not tried',
  'c.months': 'Cards & months', 'c.months.d': 'Spot cards of the same month and what you can capture.', 'c.yaku': 'Yaku', 'c.yaku.d': 'Which card makes a yaku, and how many points.', 'c.koi': 'Koi-koi decisions', 'c.koi.d': 'Stop, or call koi-koi and play on?',
  'm1.t': 'Iris or wisteria', 'm1.q': 'Your hand card is iris (May). Pick the field card of the same month.', 'm1.e': 'The iris with the eight-plank bridge is May. Wisteria (April) has similar colours, but iris has sword-like leaves and the bridge.',
  'm2.t': 'Three of a month', 'm2.q': 'Three cherry cards lie on the field. Which hand card captures the most?', 'm2.e': 'With three cards of a month on the field, the fourth takes all three — including the cherry curtain, a Bright.',
  'y1.t': 'Four Lights or Rainy Four', 'y1.q': 'You hold three Brights. Capture the card that scores more.', 'y1.e': 'The phoenix makes Four Lights, 8 points. Four including the rain man is Rainy Four Lights, 7 points.',
  'y2.t': 'Moon Viewing', 'y2.q': 'You have the moon. Which card makes a 5-point yaku at once?', 'y2.e': 'Moon and sake cup make Moon Viewing, 5 points. The sake cup also makes Flower Viewing with the cherry curtain.',
  'k1.t': 'The opponent is close', 'k1.q': 'You have Red Ribbons, 5 points. The opponent holds the boar and the deer, and the peony butterfly is on the field.', 'k1.e': 'One more turn and they may complete Boar-Deer-Butterfly; after your koi-koi their score is doubled. The AI (Lv.20) rates koi-koi below zero on average against 5 for stopping. Stop.',
  'k2.t': 'Early, only 1 point', 'k2.q': 'Five Animals for 1 point. The opponent has only three chaff, and you still have six cards.', 'k2.e': 'Stopping gives just 1 point. The opponent is far from a yaku and you are one card from Red Ribbons (the cherry ribbon is on the field). The AI (Lv.20) puts koi-koi at about 6 points on average.',
  stop: 'Stop', go: 'Koi-koi', field: 'Field', hand: 'Hand', caps: 'Your captures', opp: 'Opponent’s captures',
},
};
const t = k => { const L = A.LANG(); return (T[L] && T[L][k]) || T.en[k] || k; };
const E = s => A.esc(s);
const CATS = [
  { id: 'months', items: [
    { id: 'm1', rows: [['hand', [17]], ['field', [12, 16, 24, 36]]], tap: 1, ans: 16 },
    { id: 'm2', rows: [['field', [8, 9, 10, 2]], ['hand', [3, 11, 45]]], tap: 1, ans: 11 },
  ] },
  { id: 'yaku', items: [
    { id: 'y1', rows: [['caps', [0, 8, 28]], ['field', [40, 44, 41, 33]]], tap: 1, ans: 44 },
    { id: 'y2', rows: [['caps', [28]], ['field', [33, 32, 41, 20]]], tap: 1, ans: 32 },
  ] },
  { id: 'koi', items: [
    { id: 'k1', rows: [['caps', [1, 5, 9, 0, 3]], ['opp', [24, 36, 7, 11]], ['field', [20, 21, 37, 41]]], choose: 'stop' },
    { id: 'k2', rows: [['caps', [4, 12, 16, 20, 29, 1, 5]], ['opp', [2, 3, 6]], ['field', [9, 33, 37, 40]]], choose: 'koi' },
  ] },
];
let prog = {}; try { prog = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(prog)); } catch (e) {} };
let cat = 'months';
const M = () => document.getElementById('lessonModal');
function list() {
  const c = CATS.find(x => x.id === cat);
  const tabs = CATS.map(x => { const n = x.items.filter(i => prog[i.id]).length; return `<button type="button" data-cat="${x.id}" class="${x.id === cat ? 'on' : ''}">${E(t('c.' + x.id))} <small>${n}/${x.items.length}</small></button>`; }).join('');
  const n = c.items.filter(i => prog[i.id]).length;
  M().innerHTML = `<h2>${E(t('h'))}</h2><p class="muted">${E(t('lead'))}</p><div class="ng-tabs">${tabs}</div>
    <div class="ls-head"><b>${E(t('c.' + cat))}</b><span>${E(t('c.' + cat + '.d'))}</span><div class="ls-bar"><i style="width:${100 * n / c.items.length}%"></i></div></div>
    <div class="ls-grid">${c.items.map((it, i) => `<button type="button" class="ls-item" data-it="${it.id}"><div class="ls-thumb">${C.face(it.rows[it.rows.length - 1][1][0])}</div><div><small>STEP ${i + 1} ・ ${E(t(prog[it.id] ? 'done' : 'todo'))}</small><b>${E(t(it.id + '.t'))}</b><p>${E(t(it.id + '.q'))}</p></div></button>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="mbtn" data-close>${E(A.t('close'))}</button></div>`;
}
function item(id) {
  const c = CATS.find(x => x.items.some(i => i.id === id)), it = c.items.find(i => i.id === id);
  const rows = it.rows.map(([lab, ids], ri) => `<div class="rt-row"><b>${E(t(lab))}</b><div class="rt-cards">${ids.map(cid => `<div class="hf ${it.tap && ri === it.rows.length - 1 ? 'tap' : ''}" data-id="${cid}">${C.face(cid)}</div>`).join('')}</div></div>`).join('');
  const btns = it.choose ? `<div class="rt-btns"><button type="button" class="mbtn" data-a="koi">${E(t('go'))}</button><button type="button" class="mbtn go" data-a="stop">${E(t('stop'))}</button></div>` : '';
  M().innerHTML = `<h2>${E(t(id + '.t'))}</h2><p class="ls-q">${E(t(id + '.q'))}</p><div class="rt-hf ls-board">${rows}${btns}</div><div class="ls-fb" id="lsFb"></div>
    <div class="modal-actions"><button type="button" class="mbtn" data-list>${E(t('back'))}</button><button type="button" class="mbtn go" data-next style="display:none">${E(t('next'))}</button></div><button type="button" class="ls-quit" data-close>${E(t('quit'))}</button>`;
  const b = M().querySelector('.ls-board'), w = b.clientWidth || 600;
  const per = Math.max(...it.rows.map(r => r[1].length));
  b.style.setProperty('--rcw', Math.max(44, Math.min(96, (w - 120) / (per + .5))) + 'px');
  M().dataset.cur = id;
}
function answer(ok, id) {
  const fb = document.getElementById('lsFb');
  fb.innerHTML = `<b class="${ok ? 'ok' : 'ng'}">${E(t(ok ? 'ok' : 'ng'))}</b> ${ok ? E(t(id + '.e')) : ''}`;
  A.sfx(ok ? 'ok' : 'ng');
  if (ok) { prog[id] = 1; saveP(); M().querySelector('[data-next]').style.display = ''; }
}
document.addEventListener('click', e => {
  const m = M(); if (!m || !m.contains(e.target)) return;
  const tab = e.target.closest('[data-cat]'); if (tab) { cat = tab.dataset.cat; list(); return; }
  const li = e.target.closest('[data-it]'); if (li) { item(li.dataset.it); return; }
  if (e.target.closest('[data-list]')) { list(); return; }
  if (e.target.closest('[data-close]')) { A.closeOv('#lessonOverlay'); return; }
  if (e.target.closest('[data-next]')) {
    const all = CATS.flatMap(c => c.items.map(i => i.id)), i = all.indexOf(m.dataset.cur);
    if (i + 1 < all.length) { cat = CATS.find(c => c.items.some(x => x.id === all[i + 1])).id; item(all[i + 1]); } else list();
    return;
  }
  const id = m.dataset.cur; if (!id) return;
  const it = CATS.flatMap(c => c.items).find(x => x.id === id);
  const card = e.target.closest('.hf.tap'); if (card && it.tap) { const ok = +card.dataset.id === it.ans; card.classList.add(ok ? 'ok' : 'bad'); answer(ok, id); return; }
  const ch = e.target.closest('[data-a]'); if (ch && it.choose) answer(ch.dataset.a === it.choose, id);
});
window.HFLessons = { open() { A.openOv('#lessonOverlay'); M().dataset.cur = ''; list(); } };
})();
