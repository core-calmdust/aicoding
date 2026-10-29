// GameRecord — 勝敗記録（戦績） for the 世界のボドゲ大全 games (common spec, template for every board game).
//
// Each finished game the player took part in is kept in this browser (localStorage `atlas-rec-<game>`, last 500 games).
// The record dialog shows big, easy-to-read numbers: wins / losses / draws, win rate, streaks, by side, by opponent,
// and the recent games. Tabs: すべて / AI / レート戦 / オンライン (tabs without games are hidden).
// Access: phones — a tab in the bottom bar left of the online tab (shared/infotabs.js bar); PC — a menu button in the top bar.
//
// Usage:
//   GameRecord.init({ game: 'shogi', lang: () => LANG, sides: l => ['先手', '後手'] , menu: '.controls' })
//   GameRecord.add({ mode: 'ai' | 'rated' | 'online' | 'pvp', res: 'w' | 'l' | 'd', side: 0 | 1, opp: 'AI 10級', key: 'ai:3', n: 87, why: '詰み' })
//   GameRecord.open()
(function () {
'use strict';
const TX = {
  ja: { title: '戦績', btn: '戦績', btnT: '勝敗の記録を見る', all: 'すべて', ai: 'AI', rated: 'レート戦', online: 'オンライン', pvp: '対人', w: '勝', l: '負', d: '分', games: '{n}局', rate: '勝率', streak: '連勝中', streakL: '連敗中', best: '最高連勝', bySide: '先後別', byOpp: '相手別', recent: '最近の対局', empty: 'まだ記録がありません。対局が終わると自動で記録されます。', moves: '{n}手', reset: '記録を消す', resetQ: 'この記録をすべて消しますか？ 元に戻せません。', yes: '消す', no: 'やめる', close: '閉じる', note: '記録はこのブラウザに保存されます。' },
  en: { title: 'Record', btn: 'Record', btnT: 'See your wins and losses', all: 'All', ai: 'AI', rated: 'Rated', online: 'Online', pvp: 'Local', w: 'W', l: 'L', d: 'D', games: '{n} games', rate: 'Win rate', streak: 'win streak', streakL: 'losing streak', best: 'Best streak', bySide: 'By side', byOpp: 'By opponent', recent: 'Recent games', empty: 'No games yet. Finished games are recorded automatically.', moves: '{n} moves', reset: 'Clear record', resetQ: 'Clear the whole record? This cannot be undone.', yes: 'Clear', no: 'Cancel', close: 'Close', note: 'The record is kept in this browser.' },
  zh: { title: '战绩', btn: '战绩', btnT: '查看胜负记录', all: '全部', ai: 'AI', rated: '等级分赛', online: '在线', pvp: '对人', w: '胜', l: '负', d: '和', games: '{n}局', rate: '胜率', streak: '连胜中', streakL: '连败中', best: '最高连胜', bySide: '先后手', byOpp: '按对手', recent: '最近对局', empty: '还没有记录。对局结束后会自动记录。', moves: '{n}手', reset: '清除记录', resetQ: '要清除全部记录吗？无法恢复。', yes: '清除', no: '取消', close: '关闭', note: '记录保存在此浏览器中。' },
  ko: { title: '전적', btn: '전적', btnT: '승패 기록 보기', all: '전체', ai: 'AI', rated: '레이팅전', online: '온라인', pvp: '대인', w: '승', l: '패', d: '무', games: '{n}국', rate: '승률', streak: '연승 중', streakL: '연패 중', best: '최고 연승', bySide: '선후수별', byOpp: '상대별', recent: '최근 대국', empty: '아직 기록이 없습니다. 대국이 끝나면 자동으로 기록됩니다.', moves: '{n}수', reset: '기록 지우기', resetQ: '기록을 모두 지울까요? 되돌릴 수 없습니다.', yes: '지우기', no: '취소', close: '닫기', note: '기록은 이 브라우저에 저장됩니다.' },
  es: { title: 'Historial', btn: 'Historial', btnT: 'Ver victorias y derrotas', all: 'Todas', ai: 'IA', rated: 'Puntuadas', online: 'En línea', pvp: 'Local', w: 'G', l: 'P', d: 'T', games: '{n} partidas', rate: 'Victorias', streak: 'racha ganadora', streakL: 'racha perdedora', best: 'Mejor racha', bySide: 'Por bando', byOpp: 'Por rival', recent: 'Últimas partidas', empty: 'Aún no hay partidas. Se registran solas al terminar.', moves: '{n} jugadas', reset: 'Borrar historial', resetQ: '¿Borrar todo el historial? No se puede deshacer.', yes: 'Borrar', no: 'Cancelar', close: 'Cerrar', note: 'El historial se guarda en este navegador.' },
  fr: { title: 'Bilan', btn: 'Bilan', btnT: 'Voir victoires et défaites', all: 'Toutes', ai: 'IA', rated: 'Classées', online: 'En ligne', pvp: 'Local', w: 'V', l: 'D', d: 'N', games: '{n} parties', rate: 'Victoires', streak: 'victoires de suite', streakL: 'défaites de suite', best: 'Meilleure série', bySide: 'Par camp', byOpp: 'Par adversaire', recent: 'Dernières parties', empty: 'Aucune partie pour l’instant. Elles sont enregistrées automatiquement.', moves: '{n} coups', reset: 'Effacer le bilan', resetQ: 'Effacer tout le bilan ? C’est définitif.', yes: 'Effacer', no: 'Annuler', close: 'Fermer', note: 'Le bilan est gardé dans ce navigateur.' },
  pt: { title: 'Histórico', btn: 'Histórico', btnT: 'Ver vitórias e derrotas', all: 'Todas', ai: 'IA', rated: 'Ranqueadas', online: 'Online', pvp: 'Local', w: 'V', l: 'D', d: 'E', games: '{n} partidas', rate: 'Vitórias', streak: 'vitórias seguidas', streakL: 'derrotas seguidas', best: 'Melhor sequência', bySide: 'Por lado', byOpp: 'Por adversário', recent: 'Partidas recentes', empty: 'Ainda não há partidas. Elas são registradas automaticamente.', moves: '{n} lances', reset: 'Apagar histórico', resetQ: 'Apagar todo o histórico? Não dá para desfazer.', yes: 'Apagar', no: 'Cancelar', close: 'Fechar', note: 'O histórico fica salvo neste navegador.' },
  de: { title: 'Bilanz', btn: 'Bilanz', btnT: 'Siege und Niederlagen ansehen', all: 'Alle', ai: 'KI', rated: 'Gewertet', online: 'Online', pvp: 'Lokal', w: 'S', l: 'N', d: 'R', games: '{n} Partien', rate: 'Siegquote', streak: 'Siege in Folge', streakL: 'Niederlagen in Folge', best: 'Beste Serie', bySide: 'Nach Seite', byOpp: 'Nach Gegner', recent: 'Letzte Partien', empty: 'Noch keine Partien. Beendete Partien werden automatisch gespeichert.', moves: '{n} Züge', reset: 'Bilanz löschen', resetQ: 'Die ganze Bilanz löschen? Das lässt sich nicht rückgängig machen.', yes: 'Löschen', no: 'Abbrechen', close: 'Schließen', note: 'Die Bilanz wird in diesem Browser gespeichert.' },
  hi: { title: 'रिकॉर्ड', btn: 'रिकॉर्ड', btnT: 'जीत-हार देखें', all: 'सभी', ai: 'AI', rated: 'रेटेड', online: 'ऑनलाइन', pvp: 'आमने-सामने', w: 'जी', l: 'हा', d: 'ड्रॉ', games: '{n} खेल', rate: 'जीत दर', streak: 'लगातार जीत', streakL: 'लगातार हार', best: 'सबसे लंबी जीत', bySide: 'पक्ष के अनुसार', byOpp: 'विरोधी के अनुसार', recent: 'हाल के खेल', empty: 'अभी कोई रिकॉर्ड नहीं। खेल खत्म होते ही अपने-आप दर्ज होगा।', moves: '{n} चालें', reset: 'रिकॉर्ड मिटाएँ', resetQ: 'पूरा रिकॉर्ड मिटाएँ? इसे वापस नहीं लाया जा सकता।', yes: 'मिटाएँ', no: 'रद्द करें', close: 'बंद करें', note: 'रिकॉर्ड इसी ब्राउज़र में रखा जाता है।' },
  ar: { title: 'السجل', btn: 'السجل', btnT: 'عرض الانتصارات والهزائم', all: 'الكل', ai: 'الذكاء الاصطناعي', rated: 'مصنّفة', online: 'أونلاين', pvp: 'محلي', w: 'ف', l: 'خ', d: 'ت', games: '{n} مباراة', rate: 'نسبة الفوز', streak: 'انتصارات متتالية', streakL: 'هزائم متتالية', best: 'أفضل سلسلة', bySide: 'حسب الجانب', byOpp: 'حسب الخصم', recent: 'آخر المباريات', empty: 'لا يوجد سجل بعد. تُسجَّل المباريات تلقائيًا عند انتهائها.', moves: '{n} نقلة', reset: 'مسح السجل', resetQ: 'مسح السجل كله؟ لا يمكن التراجع.', yes: 'مسح', no: 'إلغاء', close: 'إغلاق', note: 'يُحفظ السجل في هذا المتصفح.' },
};
const ICON = '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let O = null, tab = 'all', ov = null, confirmOn = false;
const L = () => { const l = (O && O.lang && O.lang()) || 'ja'; return TX[l] ? l : 'en'; };
const tx = (k, v) => { let x = TX[L()][k]; if (x === undefined) x = TX.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] != null ? v[y] : ''); return x; };
const KEY = () => 'atlas-rec-' + O.game;
function load() { try { const a = JSON.parse(localStorage.getItem(KEY()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function store(a) { try { localStorage.setItem(KEY(), JSON.stringify(a.slice(-500))); } catch (e) {} }
function add(r) {
  if (!O || !r || !r.res) return;
  const a = load(); a.push(Object.assign({ t: Date.now() }, r)); store(a);
  if (ov && ov.classList.contains('show')) render();
}
const CSS = `
.grc-ov{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.grc-ov.show{display:flex}
.grc{width:min(760px,100%);max-height:min(900px,100%);display:flex;flex-direction:column;background:var(--panel,#1d1712);color:var(--text,#f1ead9);border:1px solid var(--line,rgba(255,255,255,.14));border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;box-sizing:border-box}
.grc-hd{display:flex;align-items:center;gap:10px;padding:18px 20px 10px}
.grc-hd svg{width:26px;height:26px;fill:none;stroke:var(--accent,#d8b56a);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.grc-hd h2{margin:0;font-size:24px;letter-spacing:.06em}
.grc-tabs{display:flex;gap:6px;padding:0 20px 12px;flex-wrap:wrap}
.grc-tabs button{font:inherit;font-size:15px;font-weight:700;padding:8px 16px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.18);color:var(--muted,#bbb);cursor:pointer}
.grc-tabs button.sel{background:var(--accent,#d8b56a);border-color:transparent;color:#1b150a}
.grc-bd{flex:1;min-height:0;overflow-y:auto;padding:4px 20px 16px;display:flex;flex-direction:column;gap:18px}
.grc-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.grc-sum div{display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 6px;border-radius:14px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06)}
.grc-sum b{font-size:44px;line-height:1.05;font-variant-numeric:tabular-nums;font-family:'JetBrains Mono',ui-monospace,monospace}
.grc-sum span{font-size:16px;color:var(--muted,#bbb);font-weight:700}
.grc-sum .grc-w b{color:#8fe3b8}.grc-sum .grc-l b{color:#ff9b90}
.grc-rate{display:flex;flex-direction:column;gap:8px}
.grc-rate .grc-rl{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:17px;font-weight:700}
.grc-rate .grc-rl b{font-size:30px;font-variant-numeric:tabular-nums}
.grc-bar{position:relative;height:14px;border-radius:7px;overflow:hidden;background:rgba(255,139,125,.35);display:flex}
.grc-bar i{display:block;height:100%}.grc-bar .grc-w{background:#5fcf9a}.grc-bar .grc-d{background:rgba(255,255,255,.35)}
.grc-chips{display:flex;flex-wrap:wrap;gap:8px}
.grc-chips span{font-size:15px;padding:6px 12px;border-radius:10px;background:rgba(255,255,255,.06);color:var(--muted,#bbb)}
.grc-chips b{color:var(--text,#eee);font-size:17px;margin-inline-start:6px}
.grc h3{margin:0 0 8px;font-size:15px;letter-spacing:.08em;color:var(--accent,#d8b56a)}
.grc-tb{display:flex;flex-direction:column;gap:6px}
.grc-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.16);font-size:16px}
.grc-row .grc-nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
.grc-row .grc-sc{font-variant-numeric:tabular-nums;white-space:nowrap}
.grc-row .grc-pc{font-variant-numeric:tabular-nums;font-weight:800;min-width:3.6em;text-align:end}
.grc-g{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.16);font-size:15.5px}
.grc-g .grc-rs{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900}
.grc-g .grc-rs.grc-w{background:rgba(95,207,154,.2);color:#8fe3b8}.grc-g .grc-rs.grc-l{background:rgba(255,139,125,.18);color:#ff9b90}.grc-g .grc-rs.grc-d{background:rgba(255,255,255,.1);color:#ddd}
.grc-g .grc-mid{min-width:0;display:flex;flex-direction:column;gap:2px}
.grc-g .grc-mid b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grc-g .grc-mid small{color:var(--muted,#bbb);font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grc-g .grc-dt{color:var(--muted,#bbb);font-size:13.5px;text-align:end;white-space:nowrap}
.grc-empty{font-size:17px;line-height:1.8;color:var(--muted,#bbb);text-align:center;padding:30px 10px}
.grc-ft{display:flex;align-items:center;gap:10px;padding:12px 20px 18px;border-top:1px solid var(--line,rgba(255,255,255,.1));flex-wrap:wrap}
.grc-ft small{flex:1 1 100%;color:var(--muted,#bbb);font-size:13px}
.grc-ft button{font:inherit;font-size:15px;font-weight:700;padding:11px 20px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.2);color:var(--text,#eee);cursor:pointer}
.grc-ft .grc-go{margin-inline-start:auto;background:var(--accent,#d8b56a);color:#1b150a;border-color:transparent;min-width:120px}
.grc-ft .grc-warn{color:#ffb0a6}
.grc-cf{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:12px;border:1px solid rgba(255,139,125,.5);background:rgba(255,139,125,.08);font-size:16px}
.grc-cf div{display:flex;gap:8px;justify-content:flex-end}
.grc-cf button{font:inherit;font-size:15px;font-weight:700;padding:9px 18px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.2);color:var(--text,#eee);cursor:pointer}
.grc-cf .grc-warn{background:#d0574a;border-color:transparent;color:#fff}
@media (min-width:900px){.grc{width:min(860px,100%)}.grc-hd h2{font-size:28px}.grc-tabs button{font-size:17px;padding:9px 20px}.grc-sum b{font-size:56px}.grc-sum span{font-size:18px}.grc-rate .grc-rl{font-size:19px}.grc-rate .grc-rl b{font-size:36px}.grc-chips span{font-size:17px}.grc-chips b{font-size:19px}.grc h3{font-size:17px}.grc-row,.grc-g{font-size:18px;padding:12px 16px}.grc-g small,.grc-g .grc-dt{font-size:15px}.grc-ft small{font-size:14px}.grc-ft button{font-size:17px}}
@media (max-width:560px){.grc{border-radius:16px}.grc-sum b{font-size:38px}.grc-hd h2{font-size:22px}}
html[dir=rtl] .grc,html[lang=ar] .grc{direction:rtl}
.mtabs .grc-tab{display:none}
@media (pointer: coarse) and (max-width: 760px) and (orientation: portrait){
  body.it-on .mtabs .grc-tab{display:flex}
  body.it-on .grc-menu{display:none!important}
}
`;
function stats(list) {
  const s = { w: 0, l: 0, d: 0, n: list.length, cur: 0, curL: 0, best: 0, side: [{ w: 0, l: 0, d: 0 }, { w: 0, l: 0, d: 0 }], opp: {} };
  let run = 0;
  for (const g of list) {
    s[g.res]++;
    if (g.side === 0 || g.side === 1) s.side[g.side][g.res]++;
    const k = g.key || g.opp || '?'; const o = s.opp[k] || (s.opp[k] = { nm: g.opp || k, w: 0, l: 0, d: 0, last: 0 }); o[g.res]++; o.nm = g.opp || o.nm; o.last = g.t;
    if (g.res === 'w') { run = run > 0 ? run + 1 : 1; } else if (g.res === 'l') { run = run < 0 ? run - 1 : -1; } else run = 0;
    if (run > s.best) s.best = run;
  }
  s.cur = run > 0 ? run : 0; s.curL = run < 0 ? -run : 0;
  return s;
}
const pct = (w, l, d) => { const n = w + l + d; return n ? Math.round((w + d / 2) / n * 100) + '%' : '—'; };
function fmtDate(t) { try { return new Date(t).toLocaleDateString(L() === 'zh' ? 'zh-CN' : L(), { month: 'short', day: 'numeric' }) + ' ' + new Date(t).toLocaleTimeString(L() === 'zh' ? 'zh-CN' : L(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function render() {
  const all = load(), modes = ['ai', 'rated', 'online', 'pvp'].filter(m => all.some(g => g.mode === m));
  if (tab !== 'all' && !modes.includes(tab)) tab = 'all';
  const list = tab === 'all' ? all : all.filter(g => g.mode === tab);
  const st = stats(list), sides = O.sides ? O.sides(L()) : null;
  let h = `<div class="grc-hd">${ICON}<h2>${esc(tx('title'))}</h2></div>`;
  h += `<div class="grc-tabs">${['all'].concat(modes).map(m => `<button type="button" data-tab="${m}" class="${m === tab ? 'sel' : ''}">${esc(tx(m))}</button>`).join('')}</div><div class="grc-bd">`;
  if (confirmOn) h += `<div class="grc-cf">${esc(tx('resetQ'))}<div><button type="button" data-cf="no">${esc(tx('no'))}</button><button type="button" class="grc-warn" data-cf="yes">${esc(tx('yes'))}</button></div></div>`;
  if (!list.length) h += `<p class="grc-empty">${esc(tx('empty'))}</p>`;
  else {
    const n = st.w + st.l + st.d;
    h += `<div class="grc-sum"><div class="grc-w"><b>${st.w}</b><span>${esc(tx('w'))}</span></div><div class="grc-l"><b>${st.l}</b><span>${esc(tx('l'))}</span></div><div class="grc-d"><b>${st.d}</b><span>${esc(tx('d'))}</span></div></div>`;
    h += `<div class="grc-rate"><div class="grc-rl"><span>${esc(tx('rate'))} · ${esc(tx('games', { n }))}</span><b>${pct(st.w, st.l, st.d)}</b></div><div class="grc-bar"><i class="grc-w" style="width:${st.w / n * 100}%"></i><i class="grc-d" style="width:${st.d / n * 100}%"></i></div></div>`;
    h += `<div class="grc-chips">${st.cur ? `<span>${esc(tx('streak'))}<b>${st.cur}</b></span>` : ''}${st.curL ? `<span>${esc(tx('streakL'))}<b>${st.curL}</b></span>` : ''}<span>${esc(tx('best'))}<b>${st.best}</b></span></div>`;
    if (sides && list.some(g => g.side === 0 || g.side === 1)) h += `<div><h3>${esc(tx('bySide'))}</h3><div class="grc-tb">${[0, 1].map(i => { const x = st.side[i]; return `<div class="grc-row"><span class="grc-nm">${esc(sides[i])}</span><span class="grc-sc">${x.w}${esc(tx('w'))} ${x.l}${esc(tx('l'))}${x.d ? ' ' + x.d + esc(tx('d')) : ''}</span><span class="grc-pc">${pct(x.w, x.l, x.d)}</span></div>`; }).join('')}</div></div>`;
    const opps = Object.values(st.opp).sort((a, b) => b.last - a.last).slice(0, 12);
    if (opps.length) h += `<div><h3>${esc(tx('byOpp'))}</h3><div class="grc-tb">${opps.map(x => `<div class="grc-row"><span class="grc-nm">${esc(x.nm)}</span><span class="grc-sc">${x.w}${esc(tx('w'))} ${x.l}${esc(tx('l'))}${x.d ? ' ' + x.d + esc(tx('d')) : ''}</span><span class="grc-pc">${pct(x.w, x.l, x.d)}</span></div>`).join('')}</div></div>`;
    h += `<div><h3>${esc(tx('recent'))}</h3><div class="grc-tb">${list.slice(-30).reverse().map(g => `<div class="grc-g"><span class="grc-rs grc-${g.res}">${esc(tx(g.res))}</span><span class="grc-mid"><b>${esc(g.opp || tx(g.mode))}</b><small>${esc([tx(g.mode), sides && (g.side === 0 || g.side === 1) ? sides[g.side] : '', g.n ? tx('moves', { n: g.n }) : '', g.why || ''].filter(Boolean).join(' · '))}</small></span><span class="grc-dt">${esc(fmtDate(g.t))}</span></div>`).join('')}</div></div>`;
  }
  h += `</div><div class="grc-ft"><small>${esc(tx('note'))}</small>${all.length ? `<button type="button" class="grc-warn" data-act="reset">${esc(tx('reset'))}</button>` : ''}<button type="button" class="grc-go" data-act="close">${esc(tx('close'))}</button></div>`;
  ov.firstChild.innerHTML = h;
}
function open() { if (!ov) return; confirmOn = false; render(); ov.classList.add('show'); }
function close() { if (ov) ov.classList.remove('show'); }
function init(o) {
  O = o;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  ov = document.createElement('div'); ov.className = 'grc-ov'; ov.innerHTML = '<div class="grc" role="dialog" aria-modal="true"></div>'; document.body.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; render(); }
    else if (b.dataset.act === 'close') close();
    else if (b.dataset.act === 'reset') { confirmOn = true; render(); ov.querySelector('.grc-bd').scrollTop = 0; }
    else if (b.dataset.cf === 'no') { confirmOn = false; render(); }
    else if (b.dataset.cf === 'yes') { store([]); confirmOn = false; render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('show')) close(); });
  // PC (and every layout without the phones' tab bar): a menu button
  const menu = typeof o.menu === 'string' ? document.querySelector(o.menu) : o.menu;
  let mb = null;
  if (menu) {
    mb = document.createElement('button'); mb.type = 'button'; mb.className = (o.btnClass || 'btn') + ' grc-menu'; mb.id = 'btnRecord';
    mb.addEventListener('click', open); menu.appendChild(mb);
  }
  let tb = null;
  const relabel = () => {
    if (mb) { const h = ICON + `<span>${esc(tx('btn'))}</span>`; if (mb.innerHTML !== h) mb.innerHTML = h; mb.title = tx('btnT'); }
    if (tb) { const h = ICON.replace('<svg', '<svg class="it-ic"') + `<span class="it-lb">${esc(tx('btn'))}</span>`; if (tb.innerHTML !== h) tb.innerHTML = h; }
    if (ov && ov.classList.contains('show')) render();
  };
  // phones: a tab in the bottom bar, left of the online tab
  const placeTab = tries => {
    const bar = document.getElementById('mtabs');
    if (!bar) { if (tries < 40) setTimeout(() => placeTab(tries + 1), 200); return; }
    tb = document.createElement('button'); tb.type = 'button'; tb.className = 'grc-tab';
    tb.addEventListener('click', e => { e.stopPropagation(); open(); });
    const ol = bar.querySelector('[data-t=online]'); if (ol) bar.insertBefore(tb, ol); else bar.appendChild(tb);
    relabel();
  };
  placeTab(0);
  GameRecord.relabel = relabel;
  new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  relabel();
}
window.GameRecord = { init, add, open, close, load, relabel() {} };
})();
