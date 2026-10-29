/* ポーカー — hand history and the review (poker/review.js)
   The last 60 hands are kept (app.js → D.hist). The review replays a hand action by action; every decision of the
   player carries the coach's verdict made at that moment (equity, the price of a call, the recommended action). */
(function () {
'use strict';
const A = window.PokerApp, P = window.PK, $ = s => document.querySelector(s);
const t = (k, v) => A.t(k, v), esc = s => A.esc(s);
let R = null;   // { i (index in D.hist), k (step) }
const cs = c => `${P.vch(P.V(c))}<i class="s${P.SUIT(c)}">${'♠♥♦♣'[P.SUIT(c)]}</i>`;
const mini = (cards, o) => `<span class="mc-row">${cards.map(c => c == null ? `<span class="mc dn"></span>` : `<span class="mc s${P.SUIT(c)}">${P.vch(P.V(c))}<small>${'♠♥♦♣'[P.SUIT(c)]}</small></span>`).join('')}</span>`;
function steps(h) { return h.log.filter(e => e.a !== 'ante' && e.a !== 'return'); }
function openList() {
  const D = A.D, list = D.hist.map((h, i) => ({ h, i })).reverse();
  let body;
  if (!list.length) body = `<p class="muted center">${esc(t('rv.none'))}</p>`;
  else body = `<div class="rv-list">` + list.map(({ h, i }) => {
    const me = A.HERO, net = h.net ? h.net[me] : 0, bad = (h.notes || []).filter(n => n.grade >= 2).length, good = (h.notes || []).filter(n => n.grade === 0).length;
    return `<button type="button" class="rv-item" data-i="${i}"><span class="ri-n">#${h.hand || ''}</span><span class="ri-v">${esc(A.vName(h.v))}</span>${mini(h.cards ? h.cards[me] : [])}${h.board && h.board.length ? mini(h.board) : '<span class="mc-row"></span>'}<span class="ri-g">${good ? `<em class="g0">◎${good}</em>` : ''}${bad ? `<em class="g3">✕△${bad}</em>` : ''}</span><b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${net}</b></button>`;
  }).join('') + `</div>`;
  $('#reviewModal').innerHTML = `<h2>${esc(t('rv.list'))}</h2><div class="rv-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="rvClose">${esc(t('close'))}</button></div>`;
  $('#rvClose').onclick = () => A.closeOv('#reviewOverlay');
  document.querySelectorAll('#reviewModal [data-i]').forEach(b => b.onclick = () => open(+b.dataset.i));
  A.openOv('#reviewOverlay');
}
function open(i) {
  const h = A.D.hist[i]; if (!h) { A.toast(t('rv.none')); return; }
  R = { i, h, k: steps(h).length };
  draw(); A.openOv('#reviewOverlay');
}
function openHand(h) { if (!h || !h.log) return; R = { i: -1, h, k: steps(h).length }; draw(); A.openOv('#reviewOverlay'); }
function stateAt(h, k) {   // board, pot, stacks, last actions after the first k steps
  const V = P.VARIANTS[h.v], st = steps(h), shown = st.slice(0, k), cur = shown[shown.length - 1];
  const street = cur ? cur.st : 0;
  let nb = 0; if (V.board) for (let s = 0; s < street; s++) nb += V.board[s];
  const all = h.log.filter(e => h.log.indexOf(e) <= (cur ? h.log.indexOf(cur) : -1));
  let pot = 0; const stacks = h.start.slice(), folded = h.names.map(() => false), last = {};
  all.forEach(e => { if (e.amt && e.a !== 'return') { pot += e.amt; stacks[e.s] -= e.amt; } if (e.a === 'return') { pot -= e.amt; stacks[e.s] += e.amt; } if (e.a === 'fold') folded[e.s] = true; last[e.s] = e; });
  return { street, board: h.board.slice(0, nb), pot, stacks, folded, last, cur, end: k >= st.length };
}
function label(e) {
  if (!e) return '';
  const m = { fold: t('act.fold'), check: t('act.check'), sb: t('act.sb'), bb: t('act.bb'), bring: t('act.bring') };
  if (m[e.a]) return m[e.a] + (e.amt && (e.a === 'sb' || e.a === 'bb' || e.a === 'bring') ? ' ' + e.amt : '');
  if (e.a === 'call') return t('act.call') + ' ' + e.amt;
  if (e.a === 'bet') return t('act.bet') + ' ' + e.to;
  if (e.a === 'raise') return t('act.raise') + ' ' + e.to;
  if (e.a === 'draw') return t('act.drawN', { n: e.n });
  return e.a;
}
function draw() {
  const h = R.h, V = P.VARIANTS[h.v], me = A.HERO, st = steps(h), S = stateAt(h, R.k);
  const seats = h.names.map((nm, i) => {
    const cards = h.cards[i] || [], visible = i === me || (S.end && h.showdown && !h.folded[i]);
    let shownCards = cards;
    if (V.stud) shownCards = cards.slice(0, Math.min(cards.length, 3 + S.street));
    const list = shownCards.map((c, k) => (visible || (V.stud && h.up[i][k])) ? c : null);
    const e = S.last[i];
    return `<div class="rv-seat${S.folded[i] ? ' folded' : ''}${i === me ? ' me' : ''}${S.cur && S.cur.s === i ? ' cur' : ''}"><span class="rn">${esc(i === me ? t('you') : nm)}${h.btn === i && !V.stud ? ' <em class="dbt">D</em>' : ''}</span>${mini(list)}<span class="ra">${esc(label(e))}</span><b>${S.stacks[i]}</b></div>`;
  }).join('');
  const acts = [], street = { v: -1 };
  st.forEach((e, k) => {
    if (e.st !== street.v) { street.v = e.st; acts.push(`<div class="lg-st">${esc(t('st.' + V.streets[e.st]))}</div>`); }
    const note = (h.notes || []).find(n => h.log[n.i] === e || (n.i != null && h.log.indexOf(e) === n.i));
    acts.push(`<button type="button" class="rv-a${k < R.k ? ' done' : ''}${k === R.k - 1 ? ' cur' : ''}${e.s === me ? ' me' : ''}" data-k="${k + 1}"><b>${esc(e.s === me ? t('you') : h.names[e.s])}</b><span>${esc(label(e))}</span>${note ? `<em class="g${note.grade}">${['◎', '○', '△', '✕'][note.grade]}</em>` : ''}</button>`);
  });
  // the coach's note for the step shown (a decision of the player)
  let coachBox = '';
  const curE = S.cur, note = curE && (h.notes || []).find(n => n.i === h.log.indexOf(curE));
  if (note && note.a !== 'draw') {
    coachBox = `<div class="verdict g${note.grade}"><b>${esc(t('grade.' + note.grade))}</b><span>${esc(t('verdict', { a: t('rec.' + note.a), rec: t('rec.' + note.rec) }))}</span>` +
      `<span class="rv-nums">${esc(t('rv.nums', { eq: (note.eq * 100).toFixed(1) + '%', need: (note.need * 100).toFixed(1) + '%', ev: (note.ev >= 0 ? '+' : '') + note.ev.toFixed(1) }))}</span>` +
      `<span class="rv-why">${esc(t(note.grade === 0 ? 'rv.good' : 'rv.why.' + note.rec, { eq: (note.eq * 100).toFixed(1) + '%', need: (note.need * 100).toFixed(1) + '%' }))}</span></div>` +
      (note.tips && note.tips.length && window.PokerTips ? `<div class="tips rv-tips"><div class="tips-h">💡 ${esc(PokerTips.ui('head', A.LANG))}</div><ul>${note.tips.map(x => `<li>${esc(PokerTips.text(x, A.LANG))}</li>`).join('')}</ul></div>` : '');
  } else if (note && note.a === 'draw') coachBox = `<div class="verdict g${note.grade}"><b>${esc(t('grade.' + note.grade))}</b><span>${esc(t('rv.draw', { n: note.drew.length, m: note.plan.length }))}</span></div>`;
  else if (S.end) {
    const notes = h.notes || [], bad = notes.filter(n => n.grade >= 2).length, good = notes.filter(n => n.grade === 0).length;
    coachBox = `<div class="rv-sum"><b>${esc(h.net[me] > 0 ? t('res.won', { n: h.net[me] }) : h.net[me] < 0 ? t('res.lost', { n: -h.net[me] }) : t('res.even'))}</b><span>${esc(t('rv.sum', { n: notes.length, g: good, b: bad }))}</span></div>`;
  } else coachBox = `<p class="muted">${esc(t('rv.pick'))}</p>`;
  $('#reviewModal').innerHTML = `<h2>${esc(t('rv.h', { n: h.hand || '' }))} <small>${esc(A.vName(h.v))} · ${esc(t('lim.' + h.limit))} · ${h.sb}/${h.bb}</small></h2>` +
    `<div class="rv-grid"><div class="rv-left"><div class="rv-board">${V.board ? mini(S.board.concat(Array(5 - S.board.length).fill(null)).map((c, k) => k < S.board.length ? c : undefined).filter(c => c !== undefined)) : ''}<span class="rv-pot">${esc(t('pot'))} <b>${S.pot}</b></span></div><div class="rv-seats">${seats}</div>` +
    `<div class="rv-nav"><button class="szb" data-go="0">⏮</button><button class="szb" data-go="-1">◀</button><span>${R.k} / ${st.length}</span><button class="szb" data-go="1">▶</button><button class="szb" data-go="9999">⏭</button></div>${coachBox}</div>` +
    `<div class="rv-right"><div class="rv-acts">${acts.join('')}</div></div></div>` +
    `<div class="modal-actions">${R.i >= 0 ? `<button class="mbtn" id="rvBack">${esc(t('rv.back'))}</button>` : ''}<button class="mbtn go" id="rvClose">${esc(t('close'))}</button></div>`;
  $('#rvClose').onclick = () => { R = null; A.closeOv('#reviewOverlay'); };
  if ($('#rvBack')) $('#rvBack').onclick = () => { R = null; openList(); };
  document.querySelectorAll('#reviewModal [data-go]').forEach(b => b.onclick = () => { const g = +b.dataset.go; R.k = g === 0 ? 0 : g === 9999 ? st.length : Math.max(0, Math.min(st.length, R.k + g)); draw(); });
  document.querySelectorAll('#reviewModal [data-k]').forEach(b => b.onclick = () => { R.k = +b.dataset.k; draw(); });
  const cur = document.querySelector('#reviewModal .rv-a.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
document.addEventListener('keydown', e => {
  if (!R || !$('#reviewOverlay').classList.contains('show')) return;
  const h = R.h, n = steps(h).length;
  if (e.key === 'ArrowRight') R.k = Math.min(n, R.k + 1); else if (e.key === 'ArrowLeft') R.k = Math.max(0, R.k - 1); else if (e.key === 'ArrowDown') R.k = n; else if (e.key === 'ArrowUp') R.k = 0; else return;
  e.preventDefault(); draw();
});
window.PokerReview = { open, openHand, openList, mini };
})();
