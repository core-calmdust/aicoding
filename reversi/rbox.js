/*
 * Review box (PC only): during a post-game review (after "analyse"), a wide box under the board and the right column shows
 *   left  — the commentary for the move being viewed (from the game's coach), a short summary at the last position;
 *   right — the engine's best few candidate moves of the position on the board, best first, each with its value and the
 *           line that follows (principal variation); hovering a row shows that line on the board;
 * and a study mode (検討モード): from the position on the board both sides' moves can be played freely, the candidates are
 * recomputed after every move, ◀ takes one back and [元に戻す] returns at once to the position the study started from.
 * The study moves never enter the game record, the graph or the evaluation of the game.
 * The same file is used by several games (reversi / go / hex); each passes an adapter to RBox.init (2026-10-28).
 *
 * adapter = {
 *   host: element the box is appended to (the page's grid), badgeHost: element the "studying" badge goes into (the board frame),
 *   lang(): current language code,
 *   active(): bool — show the box now (PC layout, review finished, not playing / lesson / puzzle / online),
 *   key(): string — the position shown (changes when the shown position or the study line changes),
 *   explain(): { head, tag, html } — commentary of the viewed move (html strings),
 *   analyze(done): starts the search of the shown position; calls done(list, final) (list: [{ id, mv, val, sub, cls,
 *            pv: [{ t, s }], played }] best first; s = 1 / 2 side) — may call several times; returns a cancel function,
 *   hover(): called after the hovered candidate changed (the page redraws its board marks, reading RBox.hovered()),
 *   studyStart(), studyPlay(id) → bool, studyBack(), studyEnd(), studyLen() → n, studyInfo() → html (whose turn ...)
 * }
 */
(function () {
'use strict';
const L = {
  ja: { visits: '{n}回', pass: 'パス', exact: '確定', final: '最終局面', finalNote: '棋譜や悪手一覧の手をクリックすると、その局面の解説と候補手を表示します。', expl: '解説', cands: '候補手', line: '読み筋', val: '評価', loading: '読み込み中…', study: '検討する', studyT: 'この局面から両者の手を自由に指して検討します', restore: '元に戻す', restoreT: '検討を始めた局面にすぐ戻ります（Esc）', back: '1手戻す', backT: '検討の手を1手戻します（←）', badge: '検討中', sHead: '検討中', sFrom: '{n}手目の局面から {k}手', sBody: '盤上で両者の手を自由に指せます。候補手の行をクリックするとその手を指します。［元に戻す］ですぐ元の局面に戻ります（棋譜・グラフは変わりません）。', played: '実戦', none: '候補手はありません（終局）', best: '最善', hov: '行にマウスを乗せると盤上に読み筋を表示' },
  en: { visits: '{n} visits', pass: 'Pass', exact: 'exact', final: 'Final position', finalNote: 'Click a move in the record or the mistake list to see its commentary and the candidate moves.', expl: 'Commentary', cands: 'Candidate moves', line: 'Line', val: 'Eval', loading: 'Loading…', study: 'Explore', studyT: 'Play moves for both sides from this position', restore: 'Restore', restoreT: 'Back to the position where exploring started (Esc)', back: 'Back', backT: 'Take back one explored move (←)', badge: 'Exploring', sHead: 'Exploring', sFrom: '{k} moves from move {n}', sBody: 'Play either side’s moves on the board. Click a candidate row to play that move. [Restore] returns at once (the record and graph do not change).', played: 'Played', none: 'No candidate moves (game over)', best: 'Best', hov: 'Hover a row to see its line on the board' },
  zh: { visits: '{n}次', pass: '跳过', exact: '精确', final: '终局局面', finalNote: '点击棋谱或失误列表中的着法，即显示该局面的解说和候选着法。', expl: '解说', cands: '候选着法', line: '变化', val: '评估', loading: '读取中…', study: '研究', studyT: '从此局面自由下双方的棋进行研究', restore: '还原', restoreT: '立即回到开始研究时的局面（Esc）', back: '退一步', backT: '撤回一步研究的着法（←）', badge: '研究中', sHead: '研究中', sFrom: '从第{n}手的局面起 {k}手', sBody: '可在棋盘上自由下双方的棋。点击候选行即下该着法。［还原］立即回到原局面（棋谱和曲线不变）。', played: '实战', none: '没有候选着法（终局）', best: '最佳', hov: '鼠标移到行上即在棋盘上显示变化' },
  ko: { visits: '{n}회', pass: '패스', exact: '확정', final: '최종 국면', finalNote: '기보나 실수 목록의 수를 클릭하면 그 국면의 해설과 후보수를 표시합니다.', expl: '해설', cands: '후보수', line: '수순', val: '평가', loading: '불러오는 중…', study: '검토하기', studyT: '이 국면에서 양쪽 수를 자유롭게 두며 검토합니다', restore: '원래대로', restoreT: '검토를 시작한 국면으로 바로 돌아갑니다 (Esc)', back: '한 수 무르기', backT: '검토한 수를 한 수 무릅니다 (←)', badge: '검토 중', sHead: '검토 중', sFrom: '{n}수째 국면에서 {k}수', sBody: '판 위에서 양쪽 수를 자유롭게 둘 수 있습니다. 후보수 행을 클릭하면 그 수를 둡니다. [원래대로]로 바로 원래 국면에 돌아갑니다 (기보·그래프는 바뀌지 않습니다).', played: '실전', none: '후보수가 없습니다 (종국)', best: '최선', hov: '행에 마우스를 올리면 판 위에 수순을 표시' },
  es: { visits: '{n} visitas', pass: 'Pasa', exact: 'exacto', final: 'Posición final', finalNote: 'Haz clic en una jugada de la partida o de la lista de errores para ver su comentario y las candidatas.', expl: 'Comentario', cands: 'Jugadas candidatas', line: 'Línea', val: 'Eval.', loading: 'Cargando…', study: 'Explorar', studyT: 'Juega libremente por ambos bandos desde esta posición', restore: 'Restaurar', restoreT: 'Volver al instante a la posición inicial de la exploración (Esc)', back: 'Atrás', backT: 'Deshacer una jugada explorada (←)', badge: 'Explorando', sHead: 'Explorando', sFrom: '{k} jugadas desde la jugada {n}', sBody: 'Juega en el tablero por ambos bandos. Haz clic en una fila candidata para jugarla. [Restaurar] vuelve al instante (la partida y el gráfico no cambian).', played: 'Jugada', none: 'No hay jugadas candidatas (fin)', best: 'Mejor', hov: 'Pasa el ratón por una fila para ver su línea en el tablero' },
  fr: { visits: '{n} visites', pass: 'Passe', exact: 'exact', final: 'Position finale', finalNote: 'Cliquez sur un coup de la partie ou de la liste des erreurs pour voir son commentaire et les coups candidats.', expl: 'Commentaire', cands: 'Coups candidats', line: 'Variante', val: 'Éval.', loading: 'Chargement…', study: 'Explorer', studyT: 'Jouez librement les deux camps depuis cette position', restore: 'Rétablir', restoreT: 'Revenir aussitôt à la position de départ de l’exploration (Échap)', back: 'Reculer', backT: 'Annuler un coup exploré (←)', badge: 'Exploration', sHead: 'Exploration', sFrom: '{k} coups depuis le coup {n}', sBody: 'Jouez les coups des deux camps sur le plateau. Cliquez sur une ligne candidate pour jouer ce coup. [Rétablir] revient aussitôt (la partie et le graphique ne changent pas).', played: 'Joué', none: 'Aucun coup candidat (fin)', best: 'Meilleur', hov: 'Survolez une ligne pour voir sa variante sur le plateau' },
  pt: { visits: '{n} visitas', pass: 'Passa', exact: 'exato', final: 'Posição final', finalNote: 'Clique num lance da partida ou da lista de erros para ver o comentário e os candidatos.', expl: 'Comentário', cands: 'Lances candidatos', line: 'Linha', val: 'Aval.', loading: 'Carregando…', study: 'Explorar', studyT: 'Jogue livremente pelos dois lados a partir desta posição', restore: 'Restaurar', restoreT: 'Voltar já à posição em que a exploração começou (Esc)', back: 'Voltar', backT: 'Desfazer um lance explorado (←)', badge: 'Explorando', sHead: 'Explorando', sFrom: '{k} lances a partir do lance {n}', sBody: 'Jogue pelos dois lados no tabuleiro. Clique numa linha candidata para jogar esse lance. [Restaurar] volta na hora (a partida e o gráfico não mudam).', played: 'Jogado', none: 'Sem lances candidatos (fim)', best: 'Melhor', hov: 'Passe o mouse numa linha para ver a sequência no tabuleiro' },
  de: { visits: '{n} Besuche', pass: 'Passen', exact: 'exakt', final: 'Endstellung', finalNote: 'Klicke auf einen Zug der Partie oder der Fehlerliste, um Kommentar und Kandidatenzüge zu sehen.', expl: 'Kommentar', cands: 'Kandidatenzüge', line: 'Variante', val: 'Bew.', loading: 'Wird geladen…', study: 'Analysieren', studyT: 'Von dieser Stellung aus frei für beide Seiten ziehen', restore: 'Zurücksetzen', restoreT: 'Sofort zur Ausgangsstellung der Analyse zurück (Esc)', back: 'Zurück', backT: 'Einen analysierten Zug zurücknehmen (←)', badge: 'Analyse', sHead: 'Analyse', sFrom: '{k} Züge ab Zug {n}', sBody: 'Ziehe auf dem Brett frei für beide Seiten. Klicke auf eine Kandidatenzeile, um diesen Zug zu spielen. [Zurücksetzen] kehrt sofort zurück (Partie und Grafik bleiben unverändert).', played: 'Gespielt', none: 'Keine Kandidatenzüge (Partieende)', best: 'Bester', hov: 'Mauszeiger auf eine Zeile: Variante auf dem Brett' },
  hi: { visits: '{n} बार', pass: 'पास', exact: 'सटीक', final: 'अंतिम स्थिति', finalNote: 'रिकॉर्ड या गलतियों की सूची में किसी चाल पर क्लिक करें तो उस स्थिति की टिप्पणी और संभावित चालें दिखती हैं।', expl: 'टिप्पणी', cands: 'संभावित चालें', line: 'लाइन', val: 'मूल्यांकन', loading: 'लोड हो रहा है…', study: 'जाँचें', studyT: 'इस स्थिति से दोनों पक्षों की चालें खुलकर खेलें', restore: 'वापस लाएँ', restoreT: 'जाँच शुरू होने वाली स्थिति पर तुरंत लौटें (Esc)', back: 'एक चाल पीछे', backT: 'जाँच की एक चाल वापस लें (←)', badge: 'जाँच जारी', sHead: 'जाँच जारी', sFrom: 'चाल {n} की स्थिति से {k} चालें', sBody: 'बोर्ड पर दोनों पक्षों की चालें खुलकर खेलें। किसी संभावित चाल की पंक्ति पर क्लिक करने से वह चाल खेली जाती है। [वापस लाएँ] से तुरंत मूल स्थिति पर लौटें (रिकॉर्ड और ग्राफ़ नहीं बदलते)।', played: 'खेली गई', none: 'कोई संभावित चाल नहीं (खेल समाप्त)', best: 'सर्वश्रेष्ठ', hov: 'पंक्ति पर माउस ले जाएँ तो बोर्ड पर लाइन दिखती है' },
  ar: { visits: '{n} زيارة', pass: 'تمرير', exact: 'دقيق', final: 'الوضع النهائي', finalNote: 'انقر على نقلة في السجل أو قائمة الأخطاء لرؤية شرحها والنقلات المرشحة.', expl: 'الشرح', cands: 'النقلات المرشحة', line: 'التسلسل', val: 'التقييم', loading: 'جارٍ التحميل…', study: 'استكشاف', studyT: 'العب نقلات الطرفين بحرية من هذا الوضع', restore: 'استعادة', restoreT: 'العودة فورًا إلى الوضع الذي بدأ منه الاستكشاف (Esc)', back: 'تراجع', backT: 'التراجع عن نقلة مستكشفة (←)', badge: 'استكشاف', sHead: 'وضع الاستكشاف', sFrom: '{k} نقلات من النقلة {n}', sBody: 'العب نقلات الطرفين على اللوحة بحرية. انقر على صف مرشح للعب تلك النقلة. [استعادة] تعيدك فورًا (لا يتغير السجل ولا الرسم البياني).', played: 'المُلعوبة', none: 'لا توجد نقلات مرشحة (انتهت المباراة)', best: 'الأفضل', hov: 'مرّر الفأرة على صف لرؤية تسلسله على اللوحة' },
};
const CSS = `
.rbox{display:none;box-sizing:border-box;min-width:0;min-height:0;contain:inline-size;grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr);gap:12px;padding:10px 12px;border-radius:14px;
  background:var(--rb-bg,rgba(20,26,24,.92));border:1px solid var(--rb-line,rgba(255,255,255,.12));color:var(--rb-text,#e8eee9);font-size:13px;line-height:1.55;overflow:hidden}
.rbox *{box-sizing:border-box}
.rb-pane{display:flex;flex-direction:column;min-width:0;min-height:0}
.rb-pane + .rb-pane{border-inline-start:1px solid var(--rb-line,rgba(255,255,255,.12));padding-inline-start:12px}
.rb-h{display:flex;align-items:center;gap:8px;flex:none;min-height:28px;margin-bottom:4px}
.rb-ttl{font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-sub{font-size:11.5px;color:var(--rb-muted,#8fa39a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-tag{flex:none}
.rb-tag .tag{font-size:11.5px;font-weight:700;border-radius:5px;padding:1px 7px;color:#0d1210;background:#8fe3b8}.rb-tag .tag.good{background:#9fc7ff}.rb-tag .tag.dubious{background:#f2c060}.rb-tag .tag.bad{background:#ff6b5b}
.rb-acts{margin-inline-start:auto;display:flex;gap:6px;flex:none}
.rb-acts button{font:inherit;font-size:12px;font-weight:700;padding:4px 10px;border-radius:8px;cursor:pointer;color:var(--rb-text,#e8eee9);background:var(--rb-btn,rgba(255,255,255,.06));border:1px solid var(--rb-line,rgba(255,255,255,.14));white-space:nowrap}
.rb-acts button:hover{border-color:var(--rb-acc,#e2c275)}
.rb-acts .rb-study{border-color:var(--rb-acc,#e2c275);color:var(--rb-acc,#e2c275)}
.rb-acts .rb-restore{background:var(--rb-acc,#e2c275);border-color:var(--rb-acc,#e2c275);color:var(--rb-acc-ink,#1b150a);padding:4px 14px}
.rb-acts .rb-restore:hover{filter:brightness(1.08)}
.rb-acts [hidden]{display:none}
.rb-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line,rgba(255,255,255,.2)) transparent;padding-inline-end:4px}
.rb-body p{margin:0 0 5px}
.rb-body .rb-tip,.rb-body .cr-tip,.rb-body .why{color:var(--rb-tipc,#cfe9da)}
.rb-body .rb-note{color:var(--rb-muted,#8fa39a);font-size:12px}
.rb-list{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--rb-line,rgba(255,255,255,.2)) transparent;display:flex;flex-direction:column;gap:3px}
.rb-head,.rb-row{display:grid;grid-template-columns:20px minmax(52px,auto) 82px minmax(0,1fr);align-items:center;gap:8px;padding:3px 8px}
.rb-head{font-size:11px;color:var(--rb-muted,#8fa39a);padding-top:0;padding-bottom:0}
.rb-row{font:inherit;color:inherit;text-align:start;width:100%;border-radius:8px;border:1px solid transparent;background:var(--rb-row,rgba(255,255,255,.035));cursor:pointer;min-height:30px}
.rb-row:hover,.rb-row.hov{border-color:var(--rb-acc,#e2c275);background:var(--rb-rowh,rgba(226,194,117,.1))}
.rb-row.top .rb-rk{background:var(--rb-acc,#e2c275);color:var(--rb-acc-ink,#1b150a)}
.rb-rk{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;background:rgba(255,255,255,.1)}
.rb-mv{font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:4px}
.rb-pl{font-size:10px;font-weight:700;padding:0 5px;border-radius:5px;border:1px solid var(--rb-muted,#8fa39a);color:var(--rb-muted,#8fa39a)}
.rb-val{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-val small{font-weight:400;color:var(--rb-muted,#8fa39a);margin-inline-start:4px}
.rb-val.good{color:var(--rb-good,#8fe3b8)}.rb-val.bad{color:var(--rb-bad,#ff9b8f)}
.rb-pv{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--rb-pvc,#c9d4ce);font-size:12px}
.rb-pv span{margin-inline-end:7px;display:inline-flex;align-items:center;gap:3px}
.rb-d{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none;border:1px solid rgba(0,0,0,.4)}
.rb-d.s1{background:var(--rb-s1,#111)}.rb-d.s2{background:var(--rb-s2,#f4f1e6)}
.rb-msg{color:var(--rb-muted,#8fa39a);font-size:12.5px;padding:6px 8px}
.rb-msg.ld::after{content:'';display:inline-block;width:10px;height:10px;margin-inline-start:8px;border-radius:50%;border:2px solid var(--rb-acc,#e2c275);border-right-color:transparent;animation:rbspin .8s linear infinite;vertical-align:-1px}
@keyframes rbspin{to{transform:rotate(360deg)}}
.rb-badge{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:30;pointer-events:none;padding:3px 12px;border-radius:999px;font-size:12.5px;font-weight:700;letter-spacing:.04em;
  background:var(--rb-acc,#e2c275);color:var(--rb-acc-ink,#1b150a);box-shadow:0 2px 10px rgba(0,0,0,.35);display:none}
html.rb-study .rb-badge{display:block}/* larger, easier-to-read text (PC, 2026-10-28) */
.rbox{font-size:15px;line-height:1.55;padding:10px 14px}
.rb-ttl{font-size:16px}
.rb-sub{font-size:13px}
.rb-tag .tag{font-size:13px}
.rb-acts button{font-size:13.5px;padding:5px 12px}
.rb-acts .rb-restore{padding:5px 16px}
.rb-body .rb-note{font-size:14px}
.rb-head,.rb-row{grid-template-columns:24px minmax(58px,auto) 92px minmax(0,1fr)}
.rb-head{font-size:12.5px}
.rb-row{min-height:32px;font-size:15px}
.rb-rk{width:22px;height:22px;font-size:12px}
.rb-pl{font-size:11.5px}
.rb-val small{font-size:12px}
.rb-pv{font-size:14px}
.rb-d{width:9px;height:9px}
.rb-msg{font-size:14px}
.rb-badge{font-size:14px}
`;
let A = null, root = null, badge = null, on = false, study = false, curKey = null, cands = null, final = false, cancel = null, timer = 0, hov = null, lastEx = '', lastList = '', baseN = 0;
const $q = s => root.querySelector(s);
function T(k, v) { const d = L[A.lang()] || L.en; let x = d[k] != null ? d[k] : L.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] != null ? v[y] : ''); return x; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function init(adapter) {
  A = adapter;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  root = document.createElement('section'); root.className = 'rbox'; root.id = 'rbox'; root.setAttribute('aria-live', 'polite');
  root.innerHTML = `<div class="rb-pane rb-ex"><div class="rb-h"><span class="rb-ttl" id="rbTtl"></span><span class="rb-tag" id="rbTag"></span></div><div class="rb-body" id="rbBody"></div></div>
    <div class="rb-pane rb-cd"><div class="rb-h"><span class="rb-ttl" id="rbCt"></span><span class="rb-sub" id="rbCs"></span><span class="rb-acts"><button class="rb-back" id="rbBack"></button><button class="rb-restore" id="rbRestore"></button><button class="rb-study" id="rbStudy"></button></span></div>
    <div class="rb-list" id="rbList"></div></div>`;
  A.host.appendChild(root);
  badge = document.createElement('div'); badge.className = 'rb-badge'; if (A.badgeHost) A.badgeHost.appendChild(badge);
  $q('#rbStudy').onclick = () => start();
  $q('#rbRestore').onclick = () => stop();
  $q('#rbBack').onclick = () => back();
  const list = $q('#rbList');
  list.addEventListener('click', e => { const b = e.target.closest('.rb-row'); if (!b || !cands) return; const c = cands[+b.dataset.k]; if (c) play(c.id); });
  list.addEventListener('mouseover', e => { const b = e.target.closest('.rb-row'); setHov(b && cands ? cands[+b.dataset.k] : null); });
  list.addEventListener('mouseleave', () => setHov(null));
  // while exploring: ← takes a move back, Esc restores, the other record keys do nothing (the game record is not browsed)
  window.addEventListener('keydown', e => {
    if (!study || e.metaKey || e.ctrlKey || e.altKey) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    if (document.querySelector('.overlay.show, .ov.show, .modal-bg.show')) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'Home' || k === 'End' || k === ' ' || k === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (k === 'ArrowLeft') back(); else if (k === 'Escape') stop();
    }
  }, true);
  labels();
}
function labels() {
  const rtl = A.lang() === 'ar';
  root.dir = rtl ? 'rtl' : 'ltr';
  $q('#rbCt').textContent = T('cands'); $q('#rbCs').textContent = ''; $q('#rbCs').title = T('hov');
  $q('#rbStudy').textContent = T('study'); $q('#rbStudy').title = T('studyT');
  $q('#rbRestore').textContent = T('restore'); $q('#rbRestore').title = T('restoreT');
  $q('#rbBack').textContent = (rtl ? '▶ ' : '◀ ') + T('back'); $q('#rbBack').title = T('backT');
  badge.textContent = T('badge');
}
function setHov(c) {
  if (c === hov) return;
  hov = c;
  root.querySelectorAll('.rb-row').forEach(b => b.classList.toggle('hov', !!(c && cands && cands[+b.dataset.k] === c)));
  try { A.hover(); } catch (e) {}
}
function sync() {
  if (!A) return;
  const want = !!A.active();
  if (want !== on) {
    on = want;
    document.documentElement.classList.toggle('rb-on', on);
    if (!on) { if (study) { study = false; document.documentElement.classList.remove('rb-study'); try { A.studyEnd(); } catch (e) {} } stopCalc(); curKey = null; cands = null; if (hov) setHov(null); }
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  if (!on) return;
  labels();
  const k = A.key();
  if (k !== curKey) {
    curKey = k; stopCalc(); cands = null; final = false; if (hov) { hov = null; try { A.hover(); } catch (e) {} }
    timer = setTimeout(() => { timer = 0; const my = curKey; cancel = A.analyze((list, fin) => { if (curKey !== my || !on) return; cands = list || []; final = !!fin; if (fin) cancel = null; renderList(); }); }, 140);
  }
  renderEx(); renderList(); renderActs();
}
function stopCalc() { if (timer) { clearTimeout(timer); timer = 0; } if (cancel) { try { cancel(); } catch (e) {} cancel = null; } }
function renderActs() {
  $q('#rbStudy').hidden = study; $q('#rbRestore').hidden = !study; $q('#rbBack').hidden = !study;
  $q('#rbBack').disabled = study && !(A.studyLen() > 0);
}
function renderEx() {
  let head, tag = '', html;
  if (study) {
    const n = A.studyLen();
    head = `${T('sHead')} · ${esc(T('sFrom', { n: baseN, k: n }))}`;
    html = `<p>${A.studyInfo ? A.studyInfo() : ''}</p>`;
    if (cands && cands.length) { const c = cands[0]; html += `<p>${T('best')}: <b>${c.mv}</b> <span class="rb-val ${c.cls || ''}">${c.val}${c.sub ? ` <small>${c.sub}</small>` : ''}</span></p>`; }
    html += `<p class="rb-note">${T('sBody')}</p>`;
  } else { const x = A.explain() || {}; head = x.head || T('expl'); tag = x.tag || ''; html = x.html || ''; }
  const s = head + '\u0001' + tag + '\u0001' + html;
  if (s === lastEx) return; lastEx = s;
  $q('#rbTtl').innerHTML = head; $q('#rbTag').innerHTML = tag; $q('#rbBody').innerHTML = html;
}
function renderList() {
  let h;
  const head = `<div class="rb-head"><span></span><span>${T('cands')}</span><span>${T('val')}</span><span>${T('line')}</span></div>`;
  if (!cands) h = `<div class="rb-msg ld">${T('loading')}</div>`;
  else if (!cands.length) h = `<div class="rb-msg">${final ? T('none') : T('loading')}</div>`;
  else h = head + cands.map((c, k) => `<button class="rb-row${k === 0 ? ' top' : ''}${hov && hov.id === c.id ? ' hov' : ''}" data-k="${k}"><span class="rb-rk">${k + 1}</span><span class="rb-mv"><bdi>${c.mv}</bdi>${c.played ? `<span class="rb-pl">${T('played')}</span>` : ''}</span><span class="rb-val ${c.cls || ''}">${c.val}${c.sub ? `<small>${c.sub}</small>` : ''}</span><span class="rb-pv">${(c.pv || []).length ? c.pv.map(p => `<span><i class="rb-d s${p.s}"></i><bdi>${p.t}</bdi></span>`).join('') : (final ? '' : '…')}</span></button>`).join('') + (final ? '' : `<div class="rb-msg ld"></div>`);
  if (h === lastList) return; lastList = h;
  $q('#rbList').innerHTML = h;
  if (hov && cands) { const c = cands.find(x => x.id === hov.id); if (c && c !== hov) { hov = c; try { A.hover(); } catch (e) {} } }
  if (study) renderEx();
}
function start() { if (!on || study) return; baseN = A.baseMove ? A.baseMove() : 0; study = true; document.documentElement.classList.add('rb-study'); A.studyStart(); sync(); }
function stop() { if (!study) return; study = false; document.documentElement.classList.remove('rb-study'); setHov(null); A.studyEnd(); sync(); }
function back() { if (!study || !(A.studyLen() > 0)) return; setHov(null); A.studyBack(); sync(); }
function play(id) { if (!on) return false; if (!study) start(); if (!study) return false; setHov(null); const ok = A.studyPlay(id); sync(); return ok; }
window.RBox = { t: (k, v) => A ? T(k, v) : k, init, sync, start, stop, back, play, studying: () => study, isOn: () => on, hovered: () => hov, relabel: () => { if (A) { labels(); lastEx = ''; lastList = ''; if (on) { renderEx(); renderList(); } } } };
})();
