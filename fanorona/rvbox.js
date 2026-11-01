// RvBox — PC review box (振り返りボックス): below the board and the info column (the PC page sets --rbx aside for it) while a game is being reviewed
// after the analysis. Left: the explanation of the move being viewed (from the game). Right: the engine's best candidate
// moves with their values and lines (読み筋), computed by a worker of the game's engine ({ type: 'cands' }), and the
// 検討 (explore) mode controls: [検討する] / ◀ (one move back) / [元に戻す] (back to where the exploring started).
// The same file is used by several games; each game supplies the explanation, the move names / values and the board marks.
(function () {
  'use strict';
  const T = {
    ja: { cands: '候補手', pv: '読み筋', val: '評価', mv: '手', loading: '読み込み中…', ken: '検討する', kenOn: '検討中', back: '1手戻す', reset: '元に戻す', played: '実戦', over: '終局した局面です（候補手はありません）', kenFrom: '{n}手目の局面から検討中', kenHelp: '盤上で両者の手を自由に指せます。候補手をクリックするとその手を指します。検討の手は棋譜に入りません。', kenLine: '検討手順', kenNone: 'まだ手を指していません', hoverHelp: '行にマウスを乗せると盤に表示、クリックでその手から検討します。', analyzing: '分析中… {a}/{b}', sumWho: '{who}：最善一致 {p}% · 悪手 {b} · 疑問手 {d}', turn: '分かれ目', see: '見る', clean: '大きなミスはありませんでした。', kenEval: '形勢', start: '開始局面' },
    en: { cands: 'Candidate moves', pv: 'Line', val: 'Eval', mv: 'Move', loading: 'Loading…', ken: 'Explore', kenOn: 'Exploring', back: 'Back one move', reset: 'Restore', played: 'played', over: 'The game is over here (no candidate moves).', kenFrom: 'Exploring from move {n}', kenHelp: 'Play moves for both sides on the board, or click a candidate to play it. Explored moves are not added to the record.', kenLine: 'Explored line', kenNone: 'No moves played yet', hoverHelp: 'Hover a row to show it on the board; click it to explore from that move.', analyzing: 'Analysing… {a}/{b}', sumWho: '{who}: best-move match {p}% · blunders {b} · dubious {d}', turn: 'Turning point', see: 'Show', clean: 'No big mistakes.', kenEval: 'Evaluation', start: 'Start' },
    zh: { cands: '候选着法', pv: '变化', val: '评估', mv: '着法', loading: '读取中…', ken: '研究', kenOn: '研究中', back: '后退一步', reset: '复原', played: '实战', over: '此局面已终局（无候选着法）。', kenFrom: '从第{n}手的局面研究中', kenHelp: '可在棋盘上为双方自由落子，或点击候选着法直接走出。研究的着法不会记入棋谱。', kenLine: '研究手顺', kenNone: '尚未走棋', hoverHelp: '鼠标移到行上即在棋盘上显示，点击则从该着法开始研究。', analyzing: '分析中… {a}/{b}', sumWho: '{who}：最佳一致率 {p}% · 恶手 {b} · 疑问手 {d}', turn: '转折点', see: '查看', clean: '没有大的失误。', kenEval: '形势', start: '开局' },
    ko: { cands: '후보수', pv: '수순', val: '평가', mv: '수', loading: '불러오는 중…', ken: '검토하기', kenOn: '검토 중', back: '한 수 되돌리기', reset: '원래대로', played: '실전', over: '종국된 국면입니다 (후보수 없음).', kenFrom: '{n}수째 국면에서 검토 중', kenHelp: '판 위에서 양쪽 수를 자유롭게 둘 수 있습니다. 후보수를 클릭하면 그 수를 둡니다. 검토한 수는 기보에 들어가지 않습니다.', kenLine: '검토 수순', kenNone: '아직 둔 수가 없습니다', hoverHelp: '행에 마우스를 올리면 판에 표시되고, 클릭하면 그 수부터 검토합니다.', analyzing: '분석 중… {a}/{b}', sumWho: '{who}: 최선 일치 {p}% · 악수 {b} · 의문수 {d}', turn: '분기점', see: '보기', clean: '큰 실수는 없었습니다.', kenEval: '형세', start: '시작 국면' },
    es: { cands: 'Jugadas candidatas', pv: 'Línea', val: 'Eval.', mv: 'Jugada', loading: 'Cargando…', ken: 'Analizar', kenOn: 'Analizando', back: 'Retroceder una', reset: 'Restaurar', played: 'jugada', over: 'La partida ha terminado aquí (sin jugadas candidatas).', kenFrom: 'Analizando desde la jugada {n}', kenHelp: 'Juega libremente por ambos bandos en el tablero, o haz clic en una candidata para jugarla. Estas jugadas no se añaden a la partida.', kenLine: 'Línea analizada', kenNone: 'Aún no hay jugadas', hoverHelp: 'Pasa el ratón por una fila para verla en el tablero; haz clic para analizar desde esa jugada.', analyzing: 'Analizando… {a}/{b}', sumWho: '{who}: coincidencia con la mejor {p}% · errores graves {b} · dudosas {d}', turn: 'Punto clave', see: 'Ver', clean: 'Sin errores graves.', kenEval: 'Valoración', start: 'Inicio' },
    fr: { cands: 'Coups candidats', pv: 'Variante', val: 'Éval.', mv: 'Coup', loading: 'Chargement…', ken: 'Explorer', kenOn: 'Exploration', back: 'Reculer d’un coup', reset: 'Rétablir', played: 'joué', over: 'La partie est terminée ici (aucun coup candidat).', kenFrom: 'Exploration depuis le coup {n}', kenHelp: 'Jouez librement pour les deux camps sur le plateau, ou cliquez sur un candidat pour le jouer. Ces coups ne sont pas ajoutés à la partie.', kenLine: 'Variante explorée', kenNone: 'Aucun coup joué', hoverHelp: 'Survolez une ligne pour la voir sur le plateau ; cliquez pour explorer depuis ce coup.', analyzing: 'Analyse… {a}/{b}', sumWho: '{who} : coups optimaux {p} % · gaffes {b} · douteux {d}', turn: 'Tournant', see: 'Voir', clean: 'Aucune grosse erreur.', kenEval: 'Évaluation', start: 'Départ' },
    pt: { cands: 'Lances candidatos', pv: 'Linha', val: 'Aval.', mv: 'Lance', loading: 'Carregando…', ken: 'Explorar', kenOn: 'Explorando', back: 'Voltar um lance', reset: 'Restaurar', played: 'jogado', over: 'A partida terminou aqui (sem lances candidatos).', kenFrom: 'Explorando a partir do lance {n}', kenHelp: 'Jogue livremente pelos dois lados no tabuleiro, ou clique num candidato para jogá-lo. Estes lances não entram na partida.', kenLine: 'Linha explorada', kenNone: 'Nenhum lance ainda', hoverHelp: 'Passe o mouse numa linha para vê-la no tabuleiro; clique para explorar a partir desse lance.', analyzing: 'Analisando… {a}/{b}', sumWho: '{who}: acerto do melhor lance {p}% · erros graves {b} · duvidosos {d}', turn: 'Ponto de virada', see: 'Ver', clean: 'Nenhum erro grave.', kenEval: 'Avaliação', start: 'Início' },
    de: { cands: 'Kandidatenzüge', pv: 'Variante', val: 'Bew.', mv: 'Zug', loading: 'Wird geladen…', ken: 'Untersuchen', kenOn: 'Untersuchung', back: 'Einen Zug zurück', reset: 'Zurücksetzen', played: 'gespielt', over: 'Die Partie ist hier beendet (keine Kandidatenzüge).', kenFrom: 'Untersuchung ab Zug {n}', kenHelp: 'Ziehe auf dem Brett frei für beide Seiten oder klicke einen Kandidaten an, um ihn zu spielen. Diese Züge kommen nicht in die Partie.', kenLine: 'Untersuchte Variante', kenNone: 'Noch kein Zug', hoverHelp: 'Zeige eine Zeile mit der Maus auf dem Brett an; ein Klick untersucht ab diesem Zug.', analyzing: 'Analyse… {a}/{b}', sumWho: '{who}: Bestzug-Quote {p} % · Fehler {b} · fragwürdig {d}', turn: 'Wendepunkt', see: 'Zeigen', clean: 'Keine groben Fehler.', kenEval: 'Bewertung', start: 'Start' },
    hi: { cands: 'संभावित चालें', pv: 'क्रम', val: 'मूल्यांकन', mv: 'चाल', loading: 'लोड हो रहा है…', ken: 'जाँचें', kenOn: 'जाँच जारी', back: 'एक चाल पीछे', reset: 'वापस लौटें', played: 'खेली गई', over: 'यहाँ खेल समाप्त है (कोई संभावित चाल नहीं)।', kenFrom: 'चाल {n} की स्थिति से जाँच', kenHelp: 'बोर्ड पर दोनों ओर से खुलकर चालें चलें, या किसी संभावित चाल पर क्लिक करके उसे चलें। ये चालें खेल के रिकॉर्ड में नहीं जुड़तीं।', kenLine: 'जाँचा गया क्रम', kenNone: 'अभी कोई चाल नहीं', hoverHelp: 'पंक्ति पर माउस ले जाएँ तो बोर्ड पर दिखेगी; क्लिक करें तो उस चाल से जाँच शुरू होगी।', analyzing: 'विश्लेषण… {a}/{b}', sumWho: '{who}: सर्वश्रेष्ठ चाल मेल {p}% · भूलें {b} · संदिग्ध {d}', turn: 'निर्णायक मोड़', see: 'देखें', clean: 'कोई बड़ी गलती नहीं।', kenEval: 'स्थिति', start: 'शुरुआत' },
    ar: { cands: 'النقلات المرشحة', pv: 'التسلسل', val: 'التقييم', mv: 'النقلة', loading: 'جارٍ التحميل…', ken: 'استكشاف', kenOn: 'وضع الاستكشاف', back: 'تراجع نقلة', reset: 'استعادة', played: 'المُلعوبة', over: 'انتهت المباراة في هذا الوضع (لا نقلات مرشحة).', kenFrom: 'استكشاف من النقلة {n}', kenHelp: 'العب بحرية للطرفين على اللوح، أو انقر نقلة مرشحة للعبها. لا تُضاف هذه النقلات إلى سجل المباراة.', kenLine: 'التسلسل المستكشف', kenNone: 'لم تُلعب أي نقلة بعد', hoverHelp: 'مرّر الفأرة على صف لعرضه على اللوح، وانقر للاستكشاف من تلك النقلة.', analyzing: 'جارٍ التحليل… {a}/{b}', sumWho: '{who}: مطابقة أفضل نقلة {p}% · أخطاء فادحة {b} · مشكوك فيها {d}', turn: 'نقطة التحول', see: 'عرض', clean: 'لا أخطاء كبيرة.', kenEval: 'التقييم', start: 'البداية' }
  };
  const CSS = `
.rvbox{display:none}
.rvb-badge{display:none}
html.rvb-on body{--rbh:clamp(180px, calc(var(--vh) * .31), 265px);--rbg:12px;--rbx:calc(var(--rbh) + var(--rbg))}
html.rvb-on .app{grid-template-rows:var(--fh) var(--rbh)!important;grid-template-areas:"board side" "box box"!important;row-gap:var(--rbg)!important}
html.rvb-on .app > .rvbox{display:grid;grid-area:box;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);height:var(--rbh);min-height:0;min-width:0;box-sizing:border-box;align-self:stretch;
  background:linear-gradient(180deg,var(--panel2,#222),var(--panel,#181818));border:1px solid var(--line,#444);border-radius:14px;overflow:hidden;color:var(--text,#eee);text-align:start}
html[lang=ar] .rvbox{direction:rtl}
.rvb-l{min-height:0;overflow-y:auto;padding:10px 16px 12px;border-inline-end:1px solid var(--line,#444);scrollbar-width:thin;scrollbar-color:var(--line,#444) transparent}
.rvb-l .rvb-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:700;font-size:14px;margin-bottom:4px;color:var(--text,#eee)}
.rvb-l .tag{font-size:12px;font-weight:700;border-radius:5px;padding:1px 7px;color:#0b1110!important;margin-inline-start:4px}
.rvb-l .tag.bad{background:#ff6b5b}.rvb-l .tag.dubious{background:#f2c060}.rvb-l .tag.best{background:#6fd3a0}.rvb-l .tag.good{background:#9fc7ff}
.rvb-l p{margin:2px 0 4px;font-size:13.5px;line-height:1.65}
.rvb-l .rvb-tip{color:#e9dcb4}
.rvb-l .rvb-dim{color:var(--muted,#aaa);font-size:12.5px}
.rvb-l .rvb-kl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;color:var(--text,#eee);word-break:break-word}
.rvb-l button.rvb-see{font:inherit;font-size:12px;padding:1px 8px;border-radius:6px;border:1px solid var(--line,#444);background:rgba(255,255,255,.05);color:var(--text,#eee);cursor:pointer;margin-inline-start:6px}
.rvb-r{display:flex;flex-direction:column;min-height:0;min-width:0;padding:8px 12px 8px 14px}
.rvb-rh{display:flex;align-items:center;gap:8px;margin-bottom:4px;min-height:30px}
.rvb-t{font-size:12.5px;letter-spacing:.06em;color:var(--brass,#c9a961);font-weight:700;white-space:nowrap}
.rvb-st{font-size:11.5px;color:var(--muted,#aaa);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.rvb-ctl{margin-inline-start:auto;display:flex;gap:6px;flex:none}
.rvb-btn{font:inherit;font-size:12.5px;font-weight:700;line-height:1.2;padding:5px 12px;border-radius:8px;border:1px solid var(--line,#444);background:rgba(255,255,255,.05);color:var(--text,#eee);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}
.rvb-btn:hover{background:rgba(255,255,255,.1)}
.rvb-btn:disabled{opacity:.4;cursor:default}
.rvb-btn svg{width:14px;height:14px;fill:currentColor}
.rvb-btn.go{border-color:rgba(201,169,97,.6);color:var(--accent,#e2c275)}
.rvb-btn.reset{background:linear-gradient(180deg,#f1d68e,#c9a24f);border-color:#c9a24f;color:#1b1408;box-shadow:0 0 0 2px rgba(226,194,117,.25)}
.rvb-btn.reset:hover{filter:brightness(1.08)}
.rvb-cols,.rvb-row{display:grid;grid-template-columns:20px 5.2em 66px minmax(0,1fr);align-items:center;column-gap:10px;padding:0 8px}
.rvb-cols{font-size:10.5px;color:var(--dim,#888);letter-spacing:.04em;padding-bottom:2px}
.rvb-cols span:nth-child(3){text-align:end}
.rvb-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;scrollbar-color:var(--line,#444) transparent}
.rvb-row{min-height:27px;border-radius:7px;cursor:pointer;font-size:13.5px;border:1px solid transparent}
.rvb-row:hover,.rvb-row.rvb-hv{background:rgba(201,169,97,.13);border-color:rgba(201,169,97,.4)}
.rvb-row .rk{color:var(--dim,#888);font-weight:700;text-align:center;font-size:12px}
.rvb-row .mv{font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:5px}
.rvb-row .mv i{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}
.rvb-row .pl{font-size:10.5px;color:#0b1110;background:#9fc7ff;border-radius:4px;padding:0 5px;font-weight:700}
.rvb-row .va{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;text-align:end;white-space:nowrap;font-size:13px;direction:ltr;unicode-bidi:isolate}
.rvb-row .va small{font-weight:400;font-size:10.5px;color:var(--muted,#aaa);margin-inline-start:3px}
.rvb-row .va.win{color:#8fe3b8}.rvb-row .va.loss,.rvb-row .va.neg{color:#ff9b8f}
.rvb-row .pv{color:var(--muted,#aaa);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'JetBrains Mono',ui-monospace,monospace;direction:ltr;text-align:start}
html[lang=ar] .rvb-row .pv{text-align:end}
.rvb-msg{color:var(--muted,#aaa);font-size:12.5px;padding:6px 8px}
.rvb-msg.ld::after{content:'';display:inline-block;width:10px;height:10px;margin-inline-start:8px;border:2px solid var(--muted,#aaa);border-top-color:transparent;border-radius:50%;vertical-align:-1px;animation:rvbspin .8s linear infinite}
@keyframes rvbspin{to{transform:rotate(360deg)}}
.rvb-foot{font-size:11px;color:var(--dim,#888);padding:3px 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html.rvb-on .rvb-badge.on{display:block;position:absolute;top:4px;left:50%;transform:translateX(-50%);z-index:40;pointer-events:none;
  background:linear-gradient(180deg,#f1d68e,#c9a24f);color:#1b1408;font-weight:800;font-size:12.5px;letter-spacing:.04em;padding:3px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.45);white-space:nowrap}
html.rvb-on .frame.rvb-ken{box-shadow:0 40px 80px -30px rgba(0,0,0,.85),0 0 0 2px rgba(226,194,117,.85),0 0 22px rgba(226,194,117,.25)!important}/* larger, easier-to-read text (PC, 2026-10-28) */
.rvb-l .rvb-h{font-size:16.5px}
.rvb-l .tag{font-size:13.5px}
.rvb-l p{font-size:15.5px;line-height:1.65}
.rvb-l .rvb-dim,.rvb-l .rvb-kl{font-size:14px}
.rvb-l button.rvb-see{font-size:13px}
.rvb-t{font-size:14px}
.rvb-st{font-size:12.5px}
.rvb-btn{font-size:14px;padding:6px 13px}
.rvb-btn svg{width:15px;height:15px}
.rvb-cols,.rvb-row{grid-template-columns:22px 5.2em 74px minmax(0,1fr)}
.rvb-cols{font-size:12px}
.rvb-row{min-height:31px;font-size:15px}
.rvb-row .rk{font-size:13px}
.rvb-row .pl{font-size:12px}
.rvb-row .va{font-size:14.5px}
.rvb-row .va small{font-size:12px}
.rvb-row .pv{font-size:14px}
.rvb-msg{font-size:14px}
.rvb-foot{font-size:12px}
html.rvb-on .rvb-badge.on{font-size:13.5px}
`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BACK = '<svg viewBox="0 0 24 24"><path d="M15 6 8 12l7 6z"/></svg>';

  function create(o) {
    let st = document.getElementById('rvbox-css');
    if (!st) { st = document.createElement('style'); st.id = 'rvbox-css'; st.textContent = CSS; document.head.appendChild(st); }
    const app = typeof o.app === 'string' ? document.querySelector(o.app) : o.app;
    const frame = typeof o.frame === 'string' ? document.querySelector(o.frame) : o.frame;
    const el = document.createElement('section'); el.className = 'rvbox'; el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="rvb-l"></div><div class="rvb-r"><div class="rvb-rh"><span class="rvb-t"></span><span class="rvb-st"></span><span class="rvb-ctl"></span></div><div class="rvb-cols"><span>#</span><span></span><span></span><span></span></div><div class="rvb-list"></div><div class="rvb-foot"></div></div>';
    app.appendChild(el);
    const badge = document.createElement('div'); badge.className = 'rvb-badge'; if (frame) frame.appendChild(badge);
    const L = el.querySelector('.rvb-l'), RT = el.querySelector('.rvb-t'), RS = el.querySelector('.rvb-st'), CTL = el.querySelector('.rvb-ctl'), COLS = el.querySelector('.rvb-cols'), LIST = el.querySelector('.rvb-list'), FOOT = el.querySelector('.rvb-foot');
    const mq = matchMedia(o.media || (window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
    const tr = (k, v) => { const lg = (o.lang && o.lang()) || 'en'; let x = (T[lg] || T.en)[k]; if (x === undefined) x = T.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
    let shown = false, state = null, rows = [], hov = -1, hovE = null, lastL = '', lastR = '', lastC = '';
    const hover = e => { if (e === hovE) return; hovE = e; if (o.onHover) o.onHover(e); };
    // ---- the candidate worker: one job at a time; a new position stops the old job (the worker is restarted)
    let W = null, busy = false, jobKey = '', timer = 0, seq = 0, wantKey = '';
    const cache = new Map();
    function kill() { if (W && busy) { W.terminate(); W = null; } busy = false; jobKey = ''; }
    function want(key, msg) {
      wantKey = key || '';
      if (!key || !msg) { clearTimeout(timer); kill(); return; }
      const c = cache.get(key); if (c && c.done) { clearTimeout(timer); if (busy && jobKey !== key) kill(); return; }
      if (busy && jobKey === key) return;
      clearTimeout(timer); if (busy) kill();
      timer = setTimeout(() => start(key, msg), c ? 0 : 160);
    }
    function start(key, msg) {
      if (wantKey !== key) return;
      if (!W) W = new Worker(o.worker());
      const id = ++seq; busy = true; jobKey = key;
      W.onmessage = e => {
        const d = e.data; if (!d || d.id !== id) return;
        if (d.type === 'progress') { if (d.list && d.list.length) { const c = cache.get(key); if (!c || !c.done) cache.set(key, { list: d.list, done: false }); if (key === wantKey) paint(); } return; }
        busy = false; jobKey = '';
        cache.set(key, { list: d.error ? ((cache.get(key) || {}).list || []) : (d.list || []), done: true });
        if (cache.size > 400) cache.delete(cache.keys().next().value);
        if (key === wantKey) paint();
      };
      W.postMessage(Object.assign({}, msg, { type: 'cands', id }));
    }
    function setHtml(node, html, k) { if (k === html) return html; node.innerHTML = html; return html; }
    // ---- painting
    function paint() {
      if (!shown || !state) return;
      const s = state;
      lastL = setHtml(L, (typeof s.left === 'function' ? s.left() : s.left) || '', lastL);
      RT.textContent = tr('cands');
      RS.textContent = s.sub || '';
      let ctl;
      if (s.ken) ctl = `<button class="rvb-btn" data-a="back" title="${esc(tr('back'))}"${s.ken.canBack ? '' : ' disabled'}>${BACK}<span>${esc(tr('back'))}</span></button><button class="rvb-btn reset" data-a="reset">${esc(tr('reset'))}</button>`;
      else ctl = s.canKen === false || s.over ? '' : `<button class="rvb-btn go" data-a="ken">${esc(tr('ken'))}</button>`;
      lastC = setHtml(CTL, ctl, lastC);
      const cs = COLS.children; cs[1].textContent = tr('mv'); cs[2].textContent = tr('val'); cs[3].textContent = tr('pv');
      // rows: the worker's result, else its progress, else the seed list (the review's analysis of this position)
      const c = s.key ? cache.get(s.key) : null;
      let list = c ? c.list : s.seed || null, loading = !c || !c.done;
      let html;
      rows = [];
      if (s.over) { html = `<div class="rvb-msg">${esc(tr('over'))}</div>`; loading = false; }
      else if (!list || !list.length) html = `<div class="rvb-msg ld">${esc(tr('loading'))}</div>`;
      else {
        rows = list.slice().sort((a, b) => b.v - a.v).slice(0, s.k || 5);
        html = rows.map((e, i) => { const f = s.fmt(e, i); return `<div class="rvb-row${i === hov ? ' rvb-hv' : ''}" data-i="${i}"><span class="rk">${i + 1}</span><span class="mv">${f.mv}${f.played ? `<span class="pl">${esc(tr('played'))}</span>` : ''}</span><span class="va ${f.cls || ''}">${f.val}${f.small ? `<small>${f.small}</small>` : ''}</span><span class="pv">${f.pv || (c && c.done ? '' : '…')}</span></div>`; }).join('');
      }
      COLS.style.visibility = rows.length ? '' : 'hidden';
      lastR = setHtml(LIST, html, lastR);
      FOOT.textContent = s.over ? '' : rows.length && loading ? tr('loading') : s.ken ? '' : tr('hoverHelp');
      if (hov >= 0) hover(rows[hov] || null);
    }
    LIST.addEventListener('mouseover', e => { const r = e.target.closest('.rvb-row'); const i = r ? +r.dataset.i : -1; if (i === hov) return; hov = i; LIST.querySelectorAll('.rvb-row').forEach(x => x.classList.toggle('rvb-hv', +x.dataset.i === i)); lastR = LIST.innerHTML; hover(rows[i] || null); });
    LIST.addEventListener('mouseleave', () => { if (hov < 0) return; hov = -1; LIST.querySelectorAll('.rvb-row.rvb-hv').forEach(x => x.classList.remove('rvb-hv')); lastR = LIST.innerHTML; hover(null); });
    LIST.addEventListener('click', e => { const r = e.target.closest('.rvb-row'); if (!r) return; const x = rows[+r.dataset.i]; if (x && o.onPick) o.onPick(x); });
    CTL.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a; if (a === 'ken' && o.onKen) o.onKen(); else if (a === 'back' && o.onBack) o.onBack(); else if (a === 'reset' && o.onReset) o.onReset(); });
    L.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b && o.onGoto) o.onGoto(+b.dataset.goto); });
    const onMq = () => { if (o.onLayout) o.onLayout(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
    return {
      t: tr,
      pc: () => mq.matches,
      get shown() { return shown; },
      // s: null (hide) or { left, key, req, seed, fmt, k, over, sub, ken: null | { from, canBack }, canKen }
      update(s) {
        const on = !!s && mq.matches;
        if (on !== shown) {
          shown = on; document.documentElement.classList.toggle('rvb-on', on);
          if (!on) { hov = -1; hovE = null; lastL = lastR = lastC = ''; }
          setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
        }
        const kenOn = on && s.ken;
        badge.classList.toggle('on', !!kenOn); badge.textContent = kenOn ? tr('kenOn') + ' · ' + tr('kenFrom', { n: s.ken.from }) : '';
        if (frame) frame.classList.toggle('rvb-ken', !!kenOn);
        if (!on) { state = null; want('', null); return; }
        if (!state || state.key !== s.key) { hov = -1; hover(null); }
        state = s; want(s.key, s.over ? null : s.req);
        paint();
      },
      cached: key => { const c = cache.get(key); return c && c.done ? c.list : null; },
      clearHover() { hov = -1; hovE = null; }
    };
  }
  window.RvBox = { create, T };
})();
