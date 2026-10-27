'use strict';
// PC review box (common spec): while stepping through an analysed game on a PC, a wide box under the board and the
// right column shows the commentary for the current move (left) and the engine's candidate moves with their lines
// (right), plus a study mode (play freely from the position; "back to game" returns at once).
// The page owns the board, the engine and the move notation; this file draws the box, keeps the layout class
// (html.rvbox-on) and runs the candidate computations (one at a time, cached, the previous one cancelled).
// Same file in shogi/, chess/, xiangqi/.
(function () {
  const S = {
    ja: { final: '最終局面', from: '{n}手目の局面から（+{k}手）', unit: '評価は手番側から見た値', expl: '解説', cands: '候補手', loading: '読み込み中…', study: '検討する', restore: '元に戻す', studying: '検討中', back: '1手戻す', played: '実戦', none: '候補手はありません', tip: 'マウスを乗せると盤に表示・クリックでその手から検討', tipS: 'クリックでその手を指す', help: '盤上で自由に指して、局面がどう変わるか調べられます（両者の手を交互に指します）。候補手をクリックするとその手を指します。◀で1手戻し、［元に戻す］で対局の局面にすぐ戻ります。', pv: '読み筋' },
    en: { final: 'Final position', from: 'From ply {n} (+{k})', unit: 'Scores for the side to move', expl: 'Commentary', cands: 'Candidate moves', loading: 'Loading…', study: 'Explore', restore: 'Back to game', studying: 'Exploring', back: 'Take back one move', played: 'played', none: 'No moves', tip: 'Hover to show on the board · click to explore from it', tipS: 'Click to play the move', help: 'Play any moves on the board (both sides in turn) to see how the position changes. Click a candidate to play it. ◀ takes back one move; “Back to game” returns to the game position at once.', pv: 'Line' },
    zh: { final: '终局局面', from: '从第{n}手的局面（+{k}步）', unit: '评分以行棋方为准', expl: '解说', cands: '候选着法', loading: '加载中…', study: '研究', restore: '返回对局', studying: '研究中', back: '退回一步', played: '实战', none: '没有可走的着法', tip: '鼠标悬停在棋盘上显示 · 点击从该着开始研究', tipS: '点击走这一步', help: '可以在棋盘上自由走子（双方轮流），看看局面如何变化。点击候选着法即可走出该着。◀ 退回一步，“返回对局”立即回到对局局面。', pv: '变化' },
    ko: { final: '최종 국면', from: '{n}수째 국면부터 (+{k}수)', unit: '평가는 둘 차례 쪽 기준', expl: '해설', cands: '후보수', loading: '불러오는 중…', study: '검토하기', restore: '원래대로', studying: '검토 중', back: '한 수 무르기', played: '실전', none: '둘 수 있는 수가 없습니다', tip: '마우스를 올리면 판에 표시 · 클릭하면 그 수부터 검토', tipS: '클릭하면 그 수를 둡니다', help: '판 위에서 자유롭게 두면서(양쪽을 번갈아) 국면이 어떻게 바뀌는지 살펴볼 수 있습니다. 후보수를 클릭하면 그 수를 둡니다. ◀로 한 수 무르고, [원래대로]로 대국 국면에 바로 돌아갑니다.', pv: '수순' },
    es: { final: 'Posición final', from: 'Desde la jugada {n} (+{k})', unit: 'Valoración para el bando que juega', expl: 'Comentario', cands: 'Jugadas candidatas', loading: 'Cargando…', study: 'Analizar', restore: 'Volver a la partida', studying: 'Analizando', back: 'Deshacer una jugada', played: 'jugada', none: 'No hay jugadas', tip: 'Pasa el ratón para verla en el tablero · haz clic para analizar desde ella', tipS: 'Haz clic para jugarla', help: 'Juega libremente en el tablero (los dos bandos por turnos) para ver cómo cambia la posición. Haz clic en una candidata para jugarla. ◀ deshace una jugada; «Volver a la partida» regresa al instante a la posición de la partida.', pv: 'Línea' },
    fr: { final: 'Position finale', from: 'Depuis le coup {n} (+{k})', unit: 'Éval. pour le camp au trait', expl: 'Commentaire', cands: 'Coups candidats', loading: 'Chargement…', study: 'Explorer', restore: 'Revenir à la partie', studying: 'Exploration', back: 'Annuler un coup', played: 'joué', none: 'Aucun coup', tip: 'Survolez pour voir sur l’échiquier · cliquez pour explorer à partir de ce coup', tipS: 'Cliquez pour jouer le coup', help: 'Jouez librement sur le plateau (les deux camps à tour de rôle) pour voir comment la position évolue. Cliquez sur un candidat pour le jouer. ◀ annule un coup ; « Revenir à la partie » ramène aussitôt à la position de la partie.', pv: 'Ligne' },
    pt: { final: 'Posição final', from: 'A partir do lance {n} (+{k})', unit: 'Avaliação para quem joga', expl: 'Comentário', cands: 'Lances candidatos', loading: 'Carregando…', study: 'Explorar', restore: 'Voltar à partida', studying: 'Explorando', back: 'Voltar um lance', played: 'jogado', none: 'Nenhum lance', tip: 'Passe o mouse para ver no tabuleiro · clique para explorar a partir dele', tipS: 'Clique para jogar o lance', help: 'Jogue livremente no tabuleiro (os dois lados alternadamente) para ver como a posição muda. Clique num candidato para jogá-lo. ◀ volta um lance; “Voltar à partida” retorna na hora à posição da partida.', pv: 'Linha' },
    de: { final: 'Schlussstellung', from: 'Ab Halbzug {n} (+{k})', unit: 'Bewertung für die Seite am Zug', expl: 'Kommentar', cands: 'Kandidatenzüge', loading: 'Wird geladen…', study: 'Untersuchen', restore: 'Zurück zur Partie', studying: 'Untersuchung', back: 'Einen Zug zurück', played: 'gespielt', none: 'Keine Züge', tip: 'Darüberfahren zeigt ihn auf dem Brett · Klick untersucht ab diesem Zug', tipS: 'Klick spielt den Zug', help: 'Ziehe frei auf dem Brett (beide Seiten abwechselnd) und sieh, wie sich die Stellung ändert. Ein Klick auf einen Kandidaten spielt ihn. ◀ nimmt einen Zug zurück; „Zurück zur Partie“ kehrt sofort zur Partiestellung zurück.', pv: 'Variante' },
    hi: { final: 'अंतिम स्थिति', from: 'चाल {n} की स्थिति से (+{k})', unit: 'मूल्यांकन चाल वाले पक्ष के लिए', expl: 'टिप्पणी', cands: 'संभावित चालें', loading: 'लोड हो रहा है…', study: 'जाँचें', restore: 'खेल पर लौटें', studying: 'जाँच जारी', back: 'एक चाल वापस', played: 'खेली गई', none: 'कोई चाल नहीं', tip: 'माउस रखें तो बोर्ड पर दिखेगी · क्लिक करें तो उसी चाल से जाँचें', tipS: 'क्लिक करके यह चाल चलें', help: 'बोर्ड पर खुलकर चालें चलें (दोनों पक्ष बारी-बारी से) और देखें कि स्थिति कैसे बदलती है। किसी संभावित चाल पर क्लिक करने से वह चल दी जाती है। ◀ से एक चाल वापस, “खेल पर लौटें” से तुरंत खेल की स्थिति पर लौटें।', pv: 'आगे की चालें' },
    ar: { final: 'الوضع النهائي', from: 'من النقلة {n} (+{k})', unit: 'التقييم لصالح الطرف الذي يلعب', expl: 'التعليق', cands: 'النقلات المرشحة', loading: 'جارٍ التحميل…', study: 'استكشاف', restore: 'العودة إلى المباراة', studying: 'قيد الاستكشاف', back: 'تراجع نقلة', played: 'المُلعوبة', none: 'لا توجد نقلات', tip: 'مرّر الفأرة لعرضها على الرقعة · انقر للاستكشاف منها', tipS: 'انقر للعب النقلة', help: 'العب بحرية على الرقعة (الطرفان بالتناوب) لترى كيف يتغير الوضع. انقر على نقلة مرشحة للعبها. ◀ للتراجع نقلة، و«العودة إلى المباراة» للرجوع فورًا إلى وضع المباراة.', pv: 'التسلسل' },
  };
  const CSS = `
.rvbox{display:none}
html.rvbox-on .rvbox{grid-area:rvbox;contain:inline-size;justify-self:stretch;display:flex;flex-direction:column;height:var(--rvbh);min-height:0;min-width:0;padding:10px 14px 10px;gap:6px;overflow:hidden}
html.rvbox-on .app{grid-template-rows:auto var(--rvbh);grid-template-areas:"board side" "rvbox rvbox";row-gap:var(--rvbgap)}
.rvbox .rvb-top{display:flex;align-items:center;gap:10px;min-height:30px;flex:none}
.rvbox .rvb-head{flex:1;min-width:0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:8px}
.rvbox .rvb-head .tag{font-size:12px;font-weight:700;border-radius:5px;padding:1px 7px;color:#0b1110;flex:none}
.rvbox .rvb-head .tag.best{background:#7fd6a4}.rvbox .rvb-head .tag.good{background:#9cc8f0}.rvbox .rvb-head .tag.dubious{background:#f2c060}.rvbox .rvb-head .tag.bad{background:#ff6b5b}
.rvbox .rvb-flagS{flex:none;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#e8a33c;color:#1a1206;letter-spacing:.04em}
.rvbox .rvb-btn{flex:none;font:inherit;font-size:13px;font-weight:600;padding:6px 14px;border-radius:9px;border:1px solid var(--line,#444);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;white-space:nowrap}
.rvbox .rvb-btn:hover:not(:disabled){border-color:var(--accent,#e2c275)}
.rvbox .rvb-btn:disabled{opacity:.4;cursor:default}
.rvbox .rvb-btn.go{background:var(--accent,#e2c275);border-color:transparent;color:#17120a}
.rvbox .rvb-btn.rs{background:#e8a33c;border-color:transparent;color:#1a1206;padding:6px 18px;font-weight:700}
.rvbox .rvb-btn.ic{padding:6px 11px}
.rvbox .rvb-cols{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.55fr);gap:16px}
.rvbox .rvb-col{min-height:0;display:flex;flex-direction:column;gap:4px}
.rvbox .rvb-lbl{flex:none;font-size:11px;letter-spacing:.08em;color:var(--muted,#999);display:flex;gap:8px;align-items:baseline}
.rvbox .rvb-lbl small{font-size:10.5px;letter-spacing:0;color:var(--dim,var(--muted,#888));margin-inline-start:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rvbox .rvb-ex{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;font-size:13.5px;line-height:1.6;scrollbar-width:thin;padding-inline-end:4px}
.rvbox .rvb-ex p{margin:0 0 4px}
.rvbox .rvb-ex .rv-ex{border:0;background:none;padding:0;margin:0;font-size:inherit}
.rvbox .rvb-ex .tip{color:var(--muted,#999);font-size:12.5px}
.rvbox .rvb-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:3px;scrollbar-width:thin}
.rvbox .rvb-row{display:grid;grid-template-columns:14px minmax(44px,auto) 52px minmax(0,1fr);align-items:baseline;gap:7px;width:100%;text-align:start;padding:3px 8px;border-radius:8px;border:1px solid transparent;background:rgba(0,0,0,.16);color:inherit;font:inherit;font-size:13px;cursor:pointer;line-height:1.45}
.rvbox .rvb-row:hover,.rvbox .rvb-row.rvb-hov{border-color:var(--accent,#e2c275);background:rgba(255,255,255,.07)}
.rvbox .rvb-row .rk{color:var(--muted,#999);font-size:12px;text-align:center}
.rvbox .rvb-row .mv{font-weight:700;white-space:nowrap}
.rvbox .rvb-row .ev{font-variant-numeric:tabular-nums;font-weight:600;text-align:end;white-space:nowrap}
.rvbox .rvb-row .ev.pos{color:#8fe3b8}.rvbox .rvb-row .ev.neg{color:#ff9a8d}
.rvbox .rvb-row .pv{color:var(--muted,#aaa);font-size:12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:keep-all;overflow-wrap:anywhere}
.rvbox .rvb-row .pl{display:inline-block;margin-inline-start:6px;font-size:10.5px;font-weight:700;padding:0 6px;border-radius:4px;background:rgba(127,214,164,.2);color:#8fe3b8;vertical-align:1px}
.rvbox .rvb-row.played{background:rgba(127,214,164,.08)}
.rvbox .rvb-wait{color:var(--muted,#999);font-size:12.5px;padding:6px 2px;display:flex;align-items:center;gap:8px}
.rvbox .rvb-wait::before{content:'';width:12px;height:12px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:rvbspin .8s linear infinite}
.rvbox .rvb-none{color:var(--muted,#999);font-size:12.5px;padding:6px 2px}
.rvbox .rvb-foot{flex:none;font-size:11px;color:var(--dim,var(--muted,#888))}
@keyframes rvbspin{to{transform:rotate(360deg)}}
.rvb-boardflag{display:none}
html.rvb-study .rvb-boardflag{display:block;position:absolute;left:50%;top:2px;transform:translate(-50%,0);z-index:30;font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px;background:#e8a33c;color:#1a1206;letter-spacing:.06em;white-space:nowrap;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.35)}
html.rvb-study .rvb-boardring{outline:3px solid rgba(232,163,60,.75);outline-offset:3px}
`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function create(o) {
    if (!document.getElementById('rvbox-css')) { const st = document.createElement('style'); st.id = 'rvbox-css'; st.textContent = CSS; document.head.appendChild(st); }
    const T = (k, v) => { let x = (S[o.lang()] || S.en)[k] || S.en[k] || k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
    const el = document.createElement('section');
    el.className = 'rvbox ' + (o.cls || 'card'); el.id = 'rvBox';
    el.innerHTML = `<div class="rvb-top"><div class="rvb-head"></div><span class="rvb-flagS" hidden></span><button class="rvb-btn ic" data-a="back" hidden>◀</button><button class="rvb-btn go" data-a="study"></button><button class="rvb-btn rs" data-a="restore" hidden></button></div>
<div class="rvb-cols"><div class="rvb-col"><div class="rvb-lbl"><span class="l1"></span></div><div class="rvb-ex"></div></div>
<div class="rvb-col"><div class="rvb-lbl"><span class="l2"></span><small class="unit"></small></div><div class="rvb-list"></div><div class="rvb-foot"></div></div></div>`;
    const $ = s => el.querySelector(s);
    let flag = null;
    if (o.boardWrap) { flag = document.createElement('div'); flag.className = 'rvb-boardflag'; o.boardWrap.appendChild(flag); if (getComputedStyle(o.boardWrap).position === 'static') o.boardWrap.style.position = 'relative'; }
    if (o.boardRing) o.boardRing.classList.add('rvb-boardring');
    const mq = matchMedia(o.media);
    let st = { show: false }, rows = null, rowsKey = '', loading = false, job = null, hov = -1;
    const cache = new Map();
    // ---- candidates: one computation at a time; moving to another position cancels the previous one
    function want(key, start) {
      if (key === rowsKey && (rows || loading)) return;
      stop();
      rowsKey = key; hov = -1;
      const c = cache.get(key);
      if (c && c.done) { rows = c.rows; loading = false; drawList(); return; }
      rows = null; loading = true; drawList();
      const my = { key, dead: false };
      job = my;
      my.cancel = start(r => { if (my.dead || rowsKey !== key) return; rows = r; drawList(); }, r => {
        if (my.dead || rowsKey !== key) return;
        if (r) rows = r;
        loading = false; job = null;
        if (rows) { cache.set(key, { rows, done: true }); if (cache.size > 300) cache.delete(cache.keys().next().value); }
        drawList();
      });
    }
    function stop() { if (job) { job.dead = true; try { job.cancel && job.cancel(); } catch (e) {} job = null; } loading = false; }
    function drawList() {
      const box = $('.rvb-list');
      if (!st.show) return;
      let h = '';
      if (rows && rows.length) h = rows.map((r, i) => `<button class="rvb-row${r.played ? ' played' : ''}${i === hov ? ' rvb-hov' : ''}" data-k="${i}"><span class="rk">${i + 1}</span><span class="mv">${r.move}</span><span class="ev ${r.cls || ''}">${esc(r.val)}</span><span class="pv">${r.pv || ''}${r.played ? `<span class="pl">${esc(T('played'))}</span>` : ''}</span></button>`).join('');
      else if (!loading) h = `<div class="rvb-none">${esc(T('none'))}</div>`;
      if (loading) h += `<div class="rvb-wait">${esc(T('loading'))}</div>`;
      box.innerHTML = h;
    }
    function render(s) {
      st = s || { show: false };
      const on = !!(st.show && mq.matches);
      document.documentElement.classList.toggle('rvbox-on', on);
      document.documentElement.classList.toggle('rvb-study', on && !!st.study);
      if (on && !el.isConnected) o.app.appendChild(el);
      if (!on) { if (el.isConnected) el.remove(); stop(); rowsKey = ''; rows = null; if (hov >= 0) { hov = -1; o.onHover && o.onHover(null); } return; }
      $('.rvb-head').innerHTML = st.head || '';
      $('.l1').textContent = T('expl'); $('.l2').textContent = T('cands');
      $('.unit').textContent = st.unit || '';
      $('.rvb-ex').innerHTML = st.study ? (st.explain || '') + `<p class="tip">${esc(T('help'))}</p>` : (st.explain || '');
      const fS = $('.rvb-flagS'); fS.hidden = !st.study; fS.textContent = T('studying');
      const bB = $('[data-a=back]'); bB.hidden = !st.study; bB.disabled = !st.canBack; bB.title = T('back'); bB.setAttribute('aria-label', T('back'));
      const bS = $('[data-a=study]'); bS.hidden = !!st.study; bS.textContent = T('study'); bS.disabled = st.canStudy === false;
      const bR = $('[data-a=restore]'); bR.hidden = !st.study; bR.textContent = T('restore');
      $('.rvb-foot').textContent = T(st.study ? 'tipS' : 'tip');
      if (flag) flag.textContent = T('studying');
      if (st.key && st.start) want(st.key, st.start); else drawList();
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (b) { if (b.dataset.a === 'study') o.onStudy(); else if (b.dataset.a === 'restore') o.onRestore(); else if (b.dataset.a === 'back') o.onBack(); return; }
      const r = e.target.closest('.rvb-row'); if (!r || !rows) return;
      const row = rows[+r.dataset.k]; if (!row) return;
      hov = -1; o.onHover && o.onHover(null);
      o.onPick(row.ref);
    });
    el.addEventListener('mouseover', e => {
      const r = e.target.closest('.rvb-row'); const k = r ? +r.dataset.k : -1;
      if (k === hov) return; hov = k;
      el.querySelectorAll('.rvb-row.rvb-hov').forEach(x => x.classList.remove('rvb-hov'));
      if (r) r.classList.add('rvb-hov');
      o.onHover && o.onHover(k >= 0 && rows && rows[k] ? rows[k].ref : null);
    });
    el.addEventListener('mouseleave', () => { if (hov < 0) return; hov = -1; el.querySelectorAll('.rvb-row.rvb-hov').forEach(x => x.classList.remove('rvb-hov')); o.onHover && o.onHover(null); });
    const onMq = () => o.refresh && o.refresh();
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
    return { render, stop, get on() { return el.isConnected; }, pc: () => mq.matches, T, clearCache: () => cache.clear() };
  }
  window.RvBox = { create };
})();
