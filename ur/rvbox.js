/* ur/rvbox.js — 振り返り（分析）：全手を engine の evaluate（期待値探索 depth 2、worker.js）で調べ、各手の勝率損失で
   最善（◎）／悪くない（○）／疑問手（△）／悪手（✕）に分ける。
   - 振り返りカード（#reviewCard、全レイアウト。スマホはコーチタブ）：両者の正確さ・各判定の数、表示中の手の解説、疑問手・悪手の一覧
   - PC の振り返りボックス（.rvbox、盤の下の情報行の中央）：左＝表示中の手の解説、右＝その局面・その出目の候補手（勝率つき）と
     ［検討する］（盤で自由に指して試す。◀＝1手戻す、元に戻す）。候補手の行にマウスを乗せると盤に矢印、クリックで検討で指す。
   Uses the globals of app.js. */
'use strict';
(function () {
const T = {
  ja: { acc: '正確さ', best: '最善', good: '悪くない', dubious: '疑問手', bad: '悪手', forced: '一手のみ', running: '分析中… {i}/{n}', none: '疑問手・悪手はありませんでした。見事な一局です。', list: '疑問手・悪手', start: '開始局面です。←→で1手ずつ進めると、その手の評価と解説が出ます。', played: '{m}：勝率 {a}% → 最善 {b}%（{s}）', bestWas: '最善手は {m}（{c}）。', isBest: 'AIの第一候補と同じ手です。', pass: 'パス（動かせる手なし）', why: '理由：', cands: '候補手（出目 {n}）', candsNo: 'この局面は出目が決まる前（または動かせる手なし）です。', ken: '検討する', kenOn: '検討中', back: '1手戻す', reset: '元に戻す', kenHelp: '盤で自由に振って指せます。［元に戻す］で実戦に戻ります。', hover: '行にマウスを乗せると盤に矢印、クリックでその手を検討で指します。', loss: '損失 {x}', mv: '手', val: '勝率', title: '振り返り' },
  en: { acc: 'Accuracy', best: 'Best', good: 'Fine', dubious: 'Dubious', bad: 'Mistake', forced: 'Only move', running: 'Analysing… {i}/{n}', none: 'No dubious moves or mistakes — a fine game.', list: 'Dubious moves and mistakes', start: 'The starting position. Step through with ← → to see each move judged and explained.', played: '{m}: win {a}% → best {b}% ({s})', bestWas: 'Best was {m} ({c}).', isBest: 'Same as the AI’s first choice.', pass: 'Pass (no legal move)', why: 'Why: ', cands: 'Candidates (roll {n})', candsNo: 'No roll here yet (or no legal move).', ken: 'Explore', kenOn: 'Exploring', back: 'Back one', reset: 'Restore', kenHelp: 'Roll and move freely on the board. “Restore” goes back to the game.', hover: 'Hover a row for the arrow on the board, click to play it in explore mode.', loss: 'loss {x}', mv: 'Move', val: 'Win', title: 'Review' },
};
const tr = (k, v) => { let x = (T[LANG] || (window.UrRvI18N && UrRvI18N[LANG]) || T.en)[k]; if (x === undefined) x = T.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
let R = null, ver = 0, open = false;   // R = { id, n, res: [ {ev, wp0} ], done }
const Q = ['best', 'good', 'dubious', 'bad'];
function judge(i) {
  if (!R || !R.res[i]) return null;
  const p = game.plies[i], r = R.res[i]; if (!p.m || !r.ev.length) return { q: -1 };
  const pl = r.ev.find(e => e.from === p.m.from), b = r.ev[0], loss = Math.max(0, b.wp - (pl ? pl.wp : b.wp));
  if (r.ev.length === 1) return { q: 0, loss: 0, forced: true, b, pl };
  return { q: loss < .005 ? 0 : loss < .03 ? 1 : loss < .08 ? 2 : 3, loss, b, pl };
}
function quality(i) { const j = judge(i); return j && j.q >= 2 ? Q[j.q] : ''; }
async function run() {
  if (!game || !game.plies.length) { toast(t('kifu.empty')); return; }
  const id = game.id + ':' + game.plies.length;
  open = true; $('#reviewCard').classList.add('show');
  if (R && R.id === id) { paint(); return; }
  R = { id, n: game.plies.length, res: [], done: false }; ver++; paint();
  const list = game.plies.map((p, i) => ({ state: E.clone(posAt(i)), n: p.n }));
  const my = R;
  await reviewJob(list, (i, res) => { if (R !== my) return; R.res[i] = res; ver++; if (i % 4 === 0 || i === list.length - 1) { paint(); renderKifu(); } });
  if (R !== my) return; R.done = true; ver++; paint(); renderKifu(); update();
}
function counts(side) { const c = [0, 0, 0, 0]; let tot = 0, n = 0; game.plies.forEach((p, i) => { if (p.s !== side) return; const j = judge(i); if (!j || j.q < 0 || j.forced) return; c[j.q]++; tot += j.loss; n++; }); return { c, acc: n ? Math.max(0, Math.round(100 - tot / n * 400)) : null }; }
function explain(i) {
  const j = judge(i), p = game.plies[i], st = posAt(i); if (!j) return '';
  if (j.q < 0) return `<b>${esc(plyText(st, p, false))}</b> — ${esc(tr('pass'))}`;
  const bm = { from: j.b.from, to: j.b.to }, fm = fullMove(st, bm);
  let h = `<span class="tag ${Q[j.q]}">${esc(tr(j.forced ? 'forced' : Q[j.q]))}</span> <b>${esc(tr('played', { m: plyText(st, p, false), a: Math.round((j.pl ? j.pl.wp : j.b.wp) * 100), b: Math.round(j.b.wp * 100), s: sideName(p.s) }))}</b><br>`;
  if (j.q === 0) h += esc(tr('isBest'));
  else h += esc(tr('bestWas', { m: plyText(st, { s: p.s, n: p.n, m: bm }, false), c: window.UrCoach ? UrCoach.tx('c.' + UrCoach.classify(st, fm).k) : '' }));
  if (window.UrCoach && fm) { const c = UrCoach.classify(st, fm); h += ' ' + esc(UrCoach.tx('x.' + c.k, c)); }
  return h;
}
function paint() {
  const el = $('#rvBody'); if (!el || !R || !game) return;
  const N = game.plies.length, got = R.res.filter(Boolean).length;
  let h = '';
  if (!R.done) h += `<div class="rv-note">${esc(tr('running', { i: got, n: N }))}</div><div class="rv-prog"><i style="width:${N ? got / N * 100 : 0}%"></i></div>`;
  h += `<div class="rv-sum">` + [0, 1].map(s => { const c = counts(s); return `<div class="rv-side"><h4><span class="pdisc p${s}" style="width:14px;height:14px"></span>${esc(playerName(s))}</h4><div class="acc">${c.acc == null ? '—' : c.acc}<small>${esc(tr('acc'))}</small></div><div class="qc"><span class="qb">◎${c.c[0]}</span><span class="qg">○${c.c[1]}</span><span class="qd">△${c.c[2]}</span><span class="qx">✕${c.c[3]}</span></div></div>`; }).join('') + `</div>`;
  const i = cur - 1;
  h += `<div class="rv-cur">${i >= 0 ? explain(i) || esc(tr('running', { i: got, n: N })) : esc(tr('start'))}</div>`;
  const bad = game.plies.map((p, k) => ({ k, j: judge(k) })).filter(x => x.j && x.j.q >= 2);
  h += `<div class="label" style="font-size:13px;margin:4px 0">${esc(tr('list'))}</div><div class="rv-list">` + (bad.length ? bad.map(x => `<button data-i="${x.k + 1}"><span class="tag ${Q[x.j.q]}">${esc(tr(Q[x.j.q]))}</span><span>${x.k + 1}. ${esc(plyText(posAt(x.k), game.plies[x.k], false))}</span><small style="margin-inline-start:auto;color:var(--dim)">−${Math.round(x.j.loss * 100)}%</small></button>`).join('') : R.done ? `<div class="rv-note">${esc(tr('none'))}</div>` : '') + `</div>`;
  el.innerHTML = h;
  paintBox();
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { open = false; $('#reviewCard').classList.remove('show'); kenStop(); paintBox(); renderInfo(); };
$('#btnAnalyze').onclick = () => run();

// ---------------------------------------------------------------- PC review box
const box = document.createElement('section'); box.className = 'card rvbox';
box.innerHTML = '<div class="rvb-top"><span class="rvb-h"></span><span class="rvb-ctl"></span></div><div class="rvb-body"><div class="rvb-l"></div><div class="rvb-r"><div class="rvb-rh"><span class="rvb-t"></span></div><div class="rvb-list"></div><div class="rvb-foot"></div></div></div>';   // (the box's own header row: 振り返り, 検討する and 閉じる side by side — shared/headerbar.js puts the 閉じる at its end)
$('.app').appendChild(box);
const css = document.createElement('style'); css.textContent = `
.rvbox{display:none}
html.rvb-on .app > .rvbox{display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:12px 16px}
.rvb-top{flex:none;display:flex;align-items:center;gap:8px;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid var(--line)}
.rvb-h{flex:1;min-width:0;font-family:var(--serif);font-weight:700;letter-spacing:.08em;color:var(--accent);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rvb-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:16px}
.rvb-l{min-height:0;overflow-y:auto;font-size:14px;line-height:1.7;scrollbar-width:thin}
.rvb-l .rv-sum{margin-bottom:6px}
.rvb-r{display:flex;flex-direction:column;min-height:0;border-inline-start:1px solid var(--line);padding-inline-start:14px}
.rvb-rh{display:flex;align-items:center;gap:8px;margin-bottom:6px;min-height:30px}
.rvb-t{font-family:var(--serif);font-weight:700;letter-spacing:.08em;color:var(--accent);font-size:15px;white-space:nowrap}
.rvb-ctl{margin-inline-start:auto;display:flex;gap:6px}
.rvb-ctl button{font-size:12.5px;font-weight:700;padding:5px 12px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.05);white-space:nowrap}
.rvb-ctl button.go{border-color:rgba(217,180,90,.6);color:var(--accent)}
.rvb-ctl button.reset{background:linear-gradient(180deg,#f1d68e,#c9a24f);color:#1b1408;border-color:transparent}
.rvb-ctl button:disabled{opacity:.4}
.rvb-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin}
.rvb-row{display:grid;grid-template-columns:22px minmax(0,1fr) 64px;align-items:center;gap:8px;min-height:30px;padding:0 8px;border-radius:7px;border:1px solid transparent;cursor:pointer;font-size:14px}
.rvb-row:hover{background:rgba(217,180,90,.12);border-color:rgba(217,180,90,.4)}
.rvb-row .rk{color:var(--dim);font-weight:700;text-align:center;font-size:12px}
.rvb-row .va{font-family:'JetBrains Mono',monospace;font-weight:700;text-align:end}
.rvb-row .pl{font-size:11px;background:#9fc7ff;color:#0b1110;border-radius:4px;padding:0 5px;margin-inline-start:6px;font-weight:700}
.rvb-foot{font-size:12px;color:var(--dim);padding-top:4px}
.rvb-badge{display:none;position:absolute;top:1.5%;left:50%;transform:translateX(-50%);z-index:9;background:linear-gradient(180deg,#f1d68e,#c9a24f);color:#1b1408;font-weight:800;font-size:13px;letter-spacing:.04em;padding:3px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.45);pointer-events:none;white-space:nowrap}
body.in-ken .rvb-badge{display:block}
body.in-ken .review-bar{display:none!important}`;
document.head.appendChild(css);
const badge = document.createElement('div'); badge.className = 'rvb-badge'; $('#frame').appendChild(badge);
const RH = box.querySelector('.rvb-h'), L = box.querySelector('.rvb-l'), RT = box.querySelector('.rvb-t'), CTL = box.querySelector('.rvb-ctl'), LIST = box.querySelector('.rvb-list'), FOOT = box.querySelector('.rvb-foot');
let rows = [], boxCtx = { st: null, src: -1 };
const boxWanted = () => open && !!R && mqPC.matches && !special && !rtLive();
function paintBox() {
  const on = boxWanted();
  document.documentElement.classList.toggle('rvb-on', on);
  document.body.classList.toggle('in-ken', !!ken);
  if (!on) { if (ken) kenStop(); return; }
  badge.textContent = ken ? tr('kenOn') : '';
  const i = cur - 1;
  L.innerHTML = ken ? `<p>${esc(tr('kenHelp'))}</p>` : (i >= 0 ? explain(i) : esc(tr('start')));
  // candidates: the move being explained (ply cur−1: its position, its side, its roll) — or the explore position and roll
  let st = null, n = null, played = null, src = -1;
  if (ken) { st = curState(); n = ken.roll ? ken.roll.n : null; }
  else if (i >= 0 && game.plies[i].m) { src = i; st = posAt(i); n = game.plies[i].n; played = game.plies[i].m; }
  boxCtx = { st, src };
  RH.textContent = ken ? tr('kenOn') : tr('title');
  RT.textContent = n != null ? tr('cands', { n }) + (st ? ' · ' + sideName(st.turn) : '') : tr('title');
  CTL.innerHTML = ken ? `<button data-a="back"${ken.plies.length ? '' : ' disabled'}>◀ ${esc(tr('back'))}</button><button class="reset" data-a="reset">${esc(tr('reset'))}</button>` : `<button class="go" data-a="ken">${esc(tr('ken'))}</button>`;
  rows = [];
  if (st && n && st.winner < 0) {
    const ev = (!ken && R.res[src]) ? R.res[src].ev.map(e => ({ move: fullMove(st, e), wp: e.wp })).filter(e => e.move) : E.evaluate(st, n);
    rows = ev.slice(0, 6);
    LIST.innerHTML = rows.map((e, k) => `<div class="rvb-row" data-k="${k}"><span class="rk">${k + 1}</span><span>${esc(plyText(st, { s: st.turn, n, m: e.move }, false))}${played && e.move.from === played.from ? `<span class="pl">✓</span>` : ''}</span><span class="va">${Math.round(e.wp * 100)}%</span></div>`).join('');
  } else LIST.innerHTML = `<div class="rv-note">${esc(tr('candsNo'))}</div>`;
  FOOT.textContent = rows.length ? tr('hover') : '';
}
LIST.addEventListener('mouseover', e => { const r = e.target.closest('.rvb-row'); const x = r ? rows[+r.dataset.k] : null; const m = x ? x.move : null; if ((m && m.from) !== (coachHover && coachHover.from)) { coachHover = m; hintFrom(); } });
LIST.addEventListener('mouseleave', () => { coachHover = null; renderBoard(); });
function hintFrom() {   // hovering a candidate: the position it was played from, with the candidate as an arrow
  if (!coachHover || !boxCtx.st) { renderBoard(); return; }
  const st = boxCtx.st, mm = moveMarks(st, st.turn, coachHover);
  view.render(st, { hint: { from: mm.from, to: mm.to } }); placeDice();
}
LIST.addEventListener('click', e => {
  const r = e.target.closest('.rvb-row'); if (!r) return; const x = rows[+r.dataset.k]; if (!x) return;
  if (!ken) { if (boxCtx.src < 0) return; kenStart(boxCtx.src); }
  coachHover = null; commit(x.move).then(() => paintBox());
});
CTL.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a; if (a === 'ken') kenStart(); else if (a === 'back') kenBack(); else kenReset(); });
function kenStart(at) {   // explore from the position before the explained move (with its roll), or from the shown position
  if (!boxWanted()) return;
  const base = at != null ? at : Math.max(0, cur - 1), p = game.plies[base];
  ken = { base, plies: [], roll: p ? { d: p.d, n: p.n } : null };
  cur = base; update(); paintBox();
}
function kenStop() { if (!ken) return; const b = ken.base; ken = null; cur = b; reviewing = cur !== game.plies.length; document.body.classList.remove('in-ken'); }
function kenBack() { if (!ken || !ken.plies.length) return; const p = ken.plies.pop(); ken.roll = { d: p.d, n: p.n }; cur = lineLen(); update(); paintBox(); }
function kenReset() { kenStop(); update(); paintBox(); }
window.UrRv = {
  run, quality, judge, ver: () => ver, kenStop, kenBack,
  reset() { R = null; open = false; ver++; $('#reviewCard').classList.remove('show'); kenStop(); paintBox(); },
  invalidate() { if (R) { R = null; ver++; } if (open) { open = false; $('#reviewCard').classList.remove('show'); } kenStop(); paintBox(); },
  update() { if (open && R) { paint(); } else paintBox(); },
};
})();
