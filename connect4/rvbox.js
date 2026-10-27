/* 振り返りボックス (PC only, common spec 2026-10-28): while a finished analysis is being reviewed, a wide box under the
   board and the right column shows the commentary of the move (left) and the engine's top candidate moves with their
   lines (right). [検討する] lets the user play freely from the shown position (both sides, legal moves only); every
   position is analysed again; ◀ takes one move back and [元に戻す] returns at once to the position the study started
   from. The game record, the graph and the evaluation stay those of the real game.
   Game-independent: the page passes an adapter to RvBox.init():
     active()          true while the review box may be shown (analysis done, reviewing, no lesson / puzzle / live game)
     lang()            current UI language
     key()             key of the shown position (study positions included); a new key restarts the candidates
     head()            heading HTML ("n手目 ○○" + grade)
     coach()           commentary HTML (study: may return '')
     cands(onUpdate)   computes the candidates of the shown position; onUpdate(rows, done) with rows sorted best first:
                       { mv, move (html), score (html), cls ('win'|'loss'|'draw'|''), pv: [html], played: bool }
     cancel()          stops the running candidate computation
     hover(mv|null)    shows / clears a candidate (and its line) on the board
     consStart() consPlay(mv) consBack() consEnd() consDepth()   study mode on the page's own sandbox
     boardEl()         element whose rect is the board (left edge of the box, the 検討中 flag)
     relayout()        optional: called after the box changes the page height
   The page calls RvBox.refresh() after it renders, and checks RvBox.cons (study on) for its input and keys. */
(function () {
  const MQ = (window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)';
  const TX = {
    ja: { final: '最終局面', cands: '候補手', pv: '読み筋', loading: '読み込み中…', study: '検討する', studying: '検討中', revert: '元に戻す', back: '1手戻す', played: '実戦', none: '候補手はありません（終局）', studyNote: '盤上で自由に手を指せます。候補手をクリックしてもその手を指せます。', studyN: '検討 {n}手', rowTip: 'クリックでこの手を指して検討' },
    en: { final: 'Final position', cands: 'Candidate moves', pv: 'Line', loading: 'Loading…', study: 'Explore', studying: 'Exploring', revert: 'Revert', back: 'One move back', played: 'Played', none: 'No candidates (game over)', studyNote: 'Play any moves on the board, or click a candidate to play it.', studyN: 'Explore: {n} moves', rowTip: 'Click to play this move and explore' },
    zh: { final: '最终局面', cands: '候选着法', pv: '变化', loading: '读取中…', study: '研究', studying: '研究中', revert: '还原', back: '退回一步', played: '实战', none: '没有候选着法（已终局）', studyNote: '可以在棋盘上自由落子，点击候选着法也可以走出该着。', studyN: '研究 {n}步', rowTip: '点击走这一步进行研究' },
    ko: { final: '최종 국면', cands: '후보수', pv: '수순', loading: '불러오는 중…', study: '검토하기', studying: '검토 중', revert: '되돌리기', back: '한 수 무르기', played: '실전', none: '후보수가 없습니다(종국)', studyNote: '판 위에서 자유롭게 둘 수 있습니다. 후보수를 클릭해도 그 수를 둡니다.', studyN: '검토 {n}수', rowTip: '클릭하면 이 수를 두고 검토' },
    es: { final: 'Posición final', cands: 'Jugadas candidatas', pv: 'Línea', loading: 'Cargando…', study: 'Analizar', studying: 'Analizando', revert: 'Restaurar', back: 'Una jugada atrás', played: 'Jugada', none: 'Sin candidatas (partida terminada)', studyNote: 'Juega libremente en el tablero o haz clic en una candidata para jugarla.', studyN: 'Análisis: {n} jugadas', rowTip: 'Clic para jugar esta jugada y analizar' },
    fr: { final: 'Position finale', cands: 'Coups candidats', pv: 'Variante', loading: 'Chargement…', study: 'Explorer', studying: 'Exploration', revert: 'Rétablir', back: 'Un coup en arrière', played: 'Joué', none: 'Aucun candidat (partie finie)', studyNote: 'Jouez librement sur le plateau, ou cliquez sur un candidat pour le jouer.', studyN: 'Exploration : {n} coups', rowTip: 'Cliquez pour jouer ce coup et explorer' },
    pt: { final: 'Posição final', cands: 'Lances candidatos', pv: 'Linha', loading: 'Carregando…', study: 'Explorar', studying: 'Explorando', revert: 'Restaurar', back: 'Voltar um lance', played: 'Jogado', none: 'Sem candidatos (fim de jogo)', studyNote: 'Jogue livremente no tabuleiro ou clique num candidato para jogá-lo.', studyN: 'Exploração: {n} lances', rowTip: 'Clique para jogar este lance e explorar' },
    de: { final: 'Endstellung', cands: 'Kandidatenzüge', pv: 'Variante', loading: 'Wird geladen…', study: 'Untersuchen', studying: 'Untersuchung', revert: 'Zurücksetzen', back: 'Einen Zug zurück', played: 'Gespielt', none: 'Keine Kandidaten (Partie beendet)', studyNote: 'Ziehe frei auf dem Brett oder klicke einen Kandidaten, um ihn zu spielen.', studyN: 'Untersuchung: {n} Züge', rowTip: 'Klicken, um diesen Zug zu spielen und zu untersuchen' },
    hi: { final: 'अंतिम स्थिति', cands: 'संभावित चालें', pv: 'आगे की चालें', loading: 'लोड हो रहा है…', study: 'जाँचें', studying: 'जाँच जारी', revert: 'वापस लौटें', back: 'एक चाल पीछे', played: 'खेली गई', none: 'कोई संभावित चाल नहीं (खेल ख़त्म)', studyNote: 'बोर्ड पर कोई भी चाल चलें, या संभावित चाल पर क्लिक करके उसे चलें।', studyN: 'जाँच: {n} चालें', rowTip: 'यह चाल चलकर जाँचने के लिए क्लिक करें' },
    ar: { final: 'الوضع النهائي', cands: 'النقلات المرشحة', pv: 'التسلسل', loading: 'جارٍ التحميل…', study: 'استكشاف', studying: 'استكشاف جارٍ', revert: 'استعادة', back: 'نقلة إلى الوراء', played: 'المُلعوبة', none: 'لا نقلات مرشحة (انتهت المباراة)', studyNote: 'العب أي نقلة على اللوحة، أو انقر نقلة مرشحة لتلعبها.', studyN: 'استكشاف: {n} نقلات', rowTip: 'انقر لتلعب هذه النقلة وتستكشف' },
  };
  let A = null, box = null, flag = null, mq = null, shown = false;
  let key = null, rows = null, done = false, job = 0, hov = null;
  const R = { cons: false, refresh, init, endCons, get shown() { return shown; }, pc: () => !!(mq && mq.matches), tx: (k, v) => tx(k, v) };
  const tx = (k, v) => { const L = TX[(A && A.lang()) || 'en'] || TX.en; let s = L[k] || TX.en[k] || k; if (v) for (const n in v) s = s.split('{' + n + '}').join(v[n]); return s; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CSS = `
@media ${MQ}{
  :root{--rbh:clamp(170px, 27vh, 250px)}
  html.rb-on{--vh:calc(100vh - var(--hb-h, 0px) - var(--rbh)) !important}
  html.rb-on.ol-dock{--vh:calc(100vh - 108px - var(--hb-h, 0px) - var(--rbh)) !important}
  html.rb-on.ol-dock.ol-soon{--vh:calc(100vh - 46px - var(--hb-h, 0px) - var(--rbh)) !important}
  html.rb-on body{--vh:inherit}
}
.rbox{position:fixed;z-index:30;bottom:12px;height:calc(var(--rbh, 230px) - 16px);display:none;flex-direction:column;gap:6px;padding:10px 14px 10px;border-radius:14px;
  background:linear-gradient(180deg, var(--panel2, #1a2724), var(--panel, #141f1c));border:1px solid var(--line, #26372f);box-shadow:0 10px 30px rgba(0,0,0,.35);color:var(--text, #e8eee9);font-size:13.5px}
html.rb-on .rbox{display:flex}
.rbox.cons{border-color:var(--accent, #e2c275);box-shadow:0 0 0 1px rgba(226,194,117,.35), 0 10px 30px rgba(0,0,0,.35)}
.rb-top{display:flex;align-items:center;gap:10px;min-height:30px}
.rb-head{flex:1;min-width:0;font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-head .tag{font-size:12.5px;font-weight:700;margin-inline-start:8px}
.rb-head .tag.bad{color:#ff8b7d}.rb-head .tag.dubious{color:#f2c060}.rb-head .tag.good{color:#9fd9b8}.rb-head .tag.best{color:#7fd6a4}
.rb-badge{display:none;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#1a1408;background:var(--accent, #e2c275);border-radius:999px;padding:3px 10px;white-space:nowrap}
.rbox.cons .rb-badge{display:inline-flex}
.rb-btn{padding:5px 12px;border-radius:9px;border:1px solid var(--line, #26372f);background:rgba(0,0,0,.22);color:var(--text, #e8eee9);font-size:13px;white-space:nowrap;cursor:pointer}
.rb-btn:hover:not(:disabled){border-color:var(--brass2, #8e7440)}
.rb-btn:disabled{opacity:.4;cursor:default}
.rb-btn.main{border-color:var(--brass2, #8e7440);color:var(--accent, #e2c275)}
.rb-btn.revert{background:var(--accent, #e2c275);border-color:var(--accent, #e2c275);color:#1a1408;font-weight:700;padding:5px 16px}
.rb-btn.revert:hover{filter:brightness(1.08)}
.rbox:not(.cons) .rb-c{display:none}.rbox.cons .rb-n{display:none}
.rb-cols{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1.15fr);gap:14px}
.rb-coach,.rb-cands{min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line, #26372f) transparent}
.rb-coach{padding-inline-end:4px}
.rb-coach .cr-box{margin:0;padding:0;border:none;background:none}
.rb-coach .cr-h,.rb-coach .cr-mv,.rb-coach .cr-coord{display:none}
.rb-coach p,.rb-coach li{font-size:13.5px!important;line-height:1.65!important}
.rb-coach .cr-list{margin-bottom:4px}
.rb-note{color:var(--muted, #8fa39a);font-size:13px;line-height:1.6}
.rb-ch{display:flex;align-items:baseline;gap:8px;font-size:12px;color:var(--muted, #8fa39a);margin-bottom:4px;position:sticky;top:0;background:var(--panel, #141f1c);z-index:1;padding-bottom:2px}
.rb-ch b{color:var(--brass, #c9a961);font-size:13px}
.rb-list{display:grid;gap:3px}
.rb-row{display:grid;grid-template-columns:22px minmax(52px, auto) minmax(64px, auto) minmax(0, 1fr);align-items:center;gap:8px;padding:4px 8px;border-radius:8px;border:1px solid transparent;background:rgba(0,0,0,.16);cursor:pointer;text-align:start;color:inherit;font:inherit;width:100%}
.rb-row:hover{border-color:var(--brass2, #8e7440);background:rgba(201,169,97,.10)}
.rb-row .rk{font-weight:700;color:var(--dim, #5d7068);text-align:center}
.rb-row:first-child .rk{color:var(--accent, #e2c275)}
.rb-row .mv{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;white-space:nowrap;direction:ltr;unicode-bidi:isolate}
.rb-row .sc{font-weight:700;white-space:nowrap;font-size:12.5px;unicode-bidi:isolate}
html[lang=ar] .rb-row .sc{direction:ltr;text-align:right}
.rb-row .sc.win{color:#7fd6a4}.rb-row .sc.loss{color:#ff8b7d}.rb-row .sc.draw{color:#cfd8d3}
.rb-row .pv{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:var(--muted, #8fa39a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;unicode-bidi:isolate;text-align:left}
.rb-row .pl{font-family:inherit;font-size:10.5px;font-weight:700;color:#1a1408;background:var(--brass, #c9a961);border-radius:5px;padding:0 5px;margin-inline-start:6px;vertical-align:1px}
.rb-wait{color:var(--dim, #5d7068);font-size:12px;padding:4px 2px}
.rb-flag{position:fixed;z-index:31;display:none;transform:translate(-50%, 0);padding:4px 14px;border-radius:999px;background:rgba(10,12,10,.88);border:1px solid var(--accent, #e2c275);color:var(--accent, #e2c275);font-weight:700;font-size:13.5px;letter-spacing:.06em;pointer-events:none;white-space:nowrap}
html.rb-on .rb-flag.on{display:block}
html[lang=ar] .rbox{direction:rtl}
html[lang=ar] .rb-coach{text-align:right}
`;
  function init(adapter) {
    A = adapter;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('section'); box.className = 'rbox'; box.id = 'rvBox';
    box.innerHTML = `<div class="rb-top"><div class="rb-head" id="rbHead"></div><span class="rb-badge" id="rbBadge"></span>
      <button class="rb-btn main rb-n" id="rbStudy"></button>
      <button class="rb-btn rb-c" id="rbBack">◀</button><button class="rb-btn revert rb-c" id="rbRevert"></button></div>
      <div class="rb-cols"><div class="rb-coach" id="rbCoach"></div><div class="rb-cands" id="rbCands"></div></div>`;
    document.body.appendChild(box);
    flag = document.createElement('div'); flag.className = 'rb-flag'; document.body.appendChild(flag);
    mq = matchMedia(MQ);
    const re = () => refresh();
    mq.addEventListener ? mq.addEventListener('change', re) : mq.addListener(re);
    addEventListener('resize', () => { if (shown) place(); });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (shown) place(); }); const watch = () => { const d = document.getElementById('dock'); if (d) ro.observe(d); else setTimeout(watch, 1000); }; watch(); }
    box.querySelector('#rbStudy').onclick = () => startCons();
    box.querySelector('#rbBack').onclick = () => { if (R.cons && A.consDepth() > 0) { setHover(null); A.consBack(); } };
    box.querySelector('#rbRevert').onclick = () => endCons();
    const list = box.querySelector('#rbCands');
    list.addEventListener('mouseover', e => { const b = e.target.closest('.rb-row'); setHover(b ? rows && rows[+b.dataset.k] && rows[+b.dataset.k].mv : null); });
    list.addEventListener('mouseleave', () => setHover(null));
    list.addEventListener('click', e => {
      const b = e.target.closest('.rb-row'); if (!b || !rows) return;
      const r = rows[+b.dataset.k]; if (!r) return;
      setHover(null);
      if (!R.cons) startCons();
      if (R.cons) A.consPlay(r.mv);
    });
    box.querySelector('#rbCoach').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && A.goto) A.goto(+b.dataset.i); });
  }
  function setHover(mv) {
    if (mv === undefined) mv = null;
    if (mv === hov) return;
    hov = mv; A.hover(mv);
  }
  function startCons() {
    if (R.cons || !shown) return;
    setHover(null);
    R.cons = true; A.consStart(); refresh();
  }
  // back to the position the study started from (silent: the page leaves the review / changes the position itself)
  function endCons(silent) {
    if (!R.cons) return;
    setHover(null);
    R.cons = false; A.consEnd(!!silent);
    if (!silent) refresh();
  }
  function place() {
    const b = A.boardEl(), r = document.querySelector('.app > .side-r') || document.querySelector('.app > .side');
    if (!b) return;
    const bb = b.getBoundingClientRect(), rr = r && r.offsetParent ? r.getBoundingClientRect() : bb;
    const L = Math.round(Math.min(bb.left, rr.left)), Rr = Math.round(Math.max(bb.right, rr.right));
    box.style.left = L + 'px'; box.style.width = (Rr - L) + 'px';
    flag.style.left = Math.round(bb.left + bb.width / 2) + 'px'; flag.style.top = Math.round(bb.top + 6) + 'px';
    // above the online dock (fixed at the bottom of the window on PC)
    const d = document.getElementById('dock'), dr = d && getComputedStyle(d).position === 'fixed' && d.offsetHeight ? d.getBoundingClientRect() : null;
    const lim = (dr && dr.top < innerHeight ? dr.top - 8 : innerHeight - 12), h = box.offsetHeight || 220;
    box.style.bottom = 'auto';
    box.style.top = Math.round(Math.min(Math.max(bb.bottom, rr.bottom) + 16, lim - h)) + 'px';   // right under the board (tall windows), above the dock
  }
  function refresh() {
    if (!A) return;
    const want = !!(mq.matches && A.active());
    if (!want && R.cons) endCons(true);
    if (want !== shown) {
      shown = want;
      document.documentElement.classList.toggle('rb-on', want);
      if (!want) { job++; A.cancel(); key = null; rows = null; setHover(null); }
      requestAnimationFrame(() => { A.relayout && A.relayout(); if (shown) place(); });
    }
    if (!want) return;
    place();
    box.classList.toggle('cons', R.cons);
    flag.classList.toggle('on', R.cons);
    flag.textContent = tx('studying');
    box.querySelector('#rbStudy').textContent = tx('study');
    box.querySelector('#rbRevert').textContent = tx('revert');
    const bk = box.querySelector('#rbBack'); bk.title = tx('back'); bk.disabled = !R.cons || A.consDepth() <= 0;
    box.querySelector('#rbBadge').textContent = R.cons ? tx('studyN', { n: A.consDepth() }) : '';
    box.querySelector('#rbHead').innerHTML = A.head() || '';
    const co = R.cons ? '' : A.coach();
    box.querySelector('#rbCoach').innerHTML = co || `<div class="rb-note">${esc(R.cons ? tx('studyNote') : '')}</div>`;
    const k = A.key();
    if (k !== key) {
      key = k; rows = null; done = false; setHover(null);
      const my = ++job; A.cancel();
      A.cands((rs, fin) => { if (my !== job) return; rows = rs; done = !!fin; renderCands(); });
    }
    renderCands();
  }
  function renderCands() {
    const el = box.querySelector('#rbCands');
    const top = el.scrollTop;
    let h = `<div class="rb-ch"><b>${esc(tx('cands'))}</b><span>${esc(tx('pv'))}</span></div>`;
    if (!rows) h += `<div class="rb-wait">${esc(tx('loading'))}</div>`;
    else if (!rows.length) h += `<div class="rb-wait">${esc(done ? tx('none') : tx('loading'))}</div>`;
    else {
      h += `<div class="rb-list">${rows.map((r, k) => `<button class="rb-row" data-k="${k}" title="${esc(tx('rowTip'))}"><span class="rk">${k + 1}</span><span class="mv">${r.move}${r.played && !R.cons ? `<span class="pl">${esc(tx('played'))}</span>` : ''}</span><span class="sc ${r.cls || ''}">${r.score}</span><span class="pv">${r.pv && r.pv.length ? r.pv.join(' ') : (done ? '' : '…')}</span></button>`).join('')}</div>`;
      if (!done) h += `<div class="rb-wait">${esc(tx('loading'))}</div>`;
    }
    el.innerHTML = h; el.scrollTop = top;
  }
  window.RvBox = R;
})();
