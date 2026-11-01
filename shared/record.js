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
// Games with several variants / board sizes pass  variant: () => ({ k: 'mini', n: '5五将棋' })  (current variant; stored on each
// game), optionally variants: () => ['std', 'mini'] (order), variantName: (k, lang) => name, defVariant: 'std' (older records).
// The dialog then shows a variant row (全ルール / each variant) above the mode tabs.
(function () {
'use strict';
const TX = {
  ja: { allV: '全ルール', form: '最近の調子', title: '戦績', btn: '戦績', btnT: '勝敗の記録を見る', all: 'すべて', ai: 'AI', rated: 'レート戦', online: 'オンライン', pvp: '対人', w: '勝', l: '負', d: '分', games: '{n}局', rate: '勝率', streak: '連勝中', streakL: '連敗中', best: '最高連勝', bySide: '先後別', byOpp: '相手別', recent: '最近の対局', empty: 'まだ記録がありません。対局が終わると自動で記録されます。', moves: '{n}手', reset: '記録を消す', resetQ: 'この記録をすべて消しますか？ 元に戻せません。', yes: '消す', no: 'やめる', close: '閉じる', note: '記録はこのブラウザに保存されます。' },
  en: { allV: 'All variants', form: 'Recent form', title: 'Record', btn: 'Record', btnT: 'See your wins and losses', all: 'All', ai: 'AI', rated: 'Rated', online: 'Online', pvp: 'Local', w: 'W', l: 'L', d: 'D', games: '{n} games', rate: 'Win rate', streak: 'win streak', streakL: 'losing streak', best: 'Best streak', bySide: 'By side', byOpp: 'By opponent', recent: 'Recent games', empty: 'No games yet. Finished games are recorded automatically.', moves: '{n} moves', reset: 'Clear record', resetQ: 'Clear the whole record? This cannot be undone.', yes: 'Clear', no: 'Cancel', close: 'Close', note: 'The record is kept in this browser.' },
  zh: { allV: '全部规则', form: '最近状态', title: '战绩', btn: '战绩', btnT: '查看胜负记录', all: '全部', ai: 'AI', rated: '等级分赛', online: '在线', pvp: '对人', w: '胜', l: '负', d: '和', games: '{n}局', rate: '胜率', streak: '连胜中', streakL: '连败中', best: '最高连胜', bySide: '先后手', byOpp: '按对手', recent: '最近对局', empty: '还没有记录。对局结束后会自动记录。', moves: '{n}手', reset: '清除记录', resetQ: '要清除全部记录吗？无法恢复。', yes: '清除', no: '取消', close: '关闭', note: '记录保存在此浏览器中。' },
  ko: { allV: '모든 규칙', form: '최근 흐름', title: '전적', btn: '전적', btnT: '승패 기록 보기', all: '전체', ai: 'AI', rated: '레이팅전', online: '온라인', pvp: '대인', w: '승', l: '패', d: '무', games: '{n}국', rate: '승률', streak: '연승 중', streakL: '연패 중', best: '최고 연승', bySide: '선후수별', byOpp: '상대별', recent: '최근 대국', empty: '아직 기록이 없습니다. 대국이 끝나면 자동으로 기록됩니다.', moves: '{n}수', reset: '기록 지우기', resetQ: '기록을 모두 지울까요? 되돌릴 수 없습니다.', yes: '지우기', no: '취소', close: '닫기', note: '기록은 이 브라우저에 저장됩니다.' },
  es: { allV: 'Todas las variantes', form: 'Racha reciente', title: 'Historial', btn: 'Historial', btnT: 'Ver victorias y derrotas', all: 'Todas', ai: 'IA', rated: 'Puntuadas', online: 'En línea', pvp: 'Local', w: 'G', l: 'P', d: 'T', games: '{n} partidas', rate: 'Victorias', streak: 'racha ganadora', streakL: 'racha perdedora', best: 'Mejor racha', bySide: 'Por bando', byOpp: 'Por rival', recent: 'Últimas partidas', empty: 'Aún no hay partidas. Se registran solas al terminar.', moves: '{n} jugadas', reset: 'Borrar historial', resetQ: '¿Borrar todo el historial? No se puede deshacer.', yes: 'Borrar', no: 'Cancelar', close: 'Cerrar', note: 'El historial se guarda en este navegador.' },
  fr: { allV: 'Toutes les variantes', form: 'Forme récente', title: 'Bilan', btn: 'Bilan', btnT: 'Voir victoires et défaites', all: 'Toutes', ai: 'IA', rated: 'Classées', online: 'En ligne', pvp: 'Local', w: 'V', l: 'D', d: 'N', games: '{n} parties', rate: 'Victoires', streak: 'victoires de suite', streakL: 'défaites de suite', best: 'Meilleure série', bySide: 'Par camp', byOpp: 'Par adversaire', recent: 'Dernières parties', empty: 'Aucune partie pour l’instant. Elles sont enregistrées automatiquement.', moves: '{n} coups', reset: 'Effacer le bilan', resetQ: 'Effacer tout le bilan ? C’est définitif.', yes: 'Effacer', no: 'Annuler', close: 'Fermer', note: 'Le bilan est gardé dans ce navigateur.' },
  pt: { allV: 'Todas as variantes', form: 'Forma recente', title: 'Histórico', btn: 'Histórico', btnT: 'Ver vitórias e derrotas', all: 'Todas', ai: 'IA', rated: 'Ranqueadas', online: 'Online', pvp: 'Local', w: 'V', l: 'D', d: 'E', games: '{n} partidas', rate: 'Vitórias', streak: 'vitórias seguidas', streakL: 'derrotas seguidas', best: 'Melhor sequência', bySide: 'Por lado', byOpp: 'Por adversário', recent: 'Partidas recentes', empty: 'Ainda não há partidas. Elas são registradas automaticamente.', moves: '{n} lances', reset: 'Apagar histórico', resetQ: 'Apagar todo o histórico? Não dá para desfazer.', yes: 'Apagar', no: 'Cancelar', close: 'Fechar', note: 'O histórico fica salvo neste navegador.' },
  de: { allV: 'Alle Varianten', form: 'Aktuelle Form', title: 'Bilanz', btn: 'Bilanz', btnT: 'Siege und Niederlagen ansehen', all: 'Alle', ai: 'KI', rated: 'Gewertet', online: 'Online', pvp: 'Lokal', w: 'S', l: 'N', d: 'R', games: '{n} Partien', rate: 'Siegquote', streak: 'Siege in Folge', streakL: 'Niederlagen in Folge', best: 'Beste Serie', bySide: 'Nach Seite', byOpp: 'Nach Gegner', recent: 'Letzte Partien', empty: 'Noch keine Partien. Beendete Partien werden automatisch gespeichert.', moves: '{n} Züge', reset: 'Bilanz löschen', resetQ: 'Die ganze Bilanz löschen? Das lässt sich nicht rückgängig machen.', yes: 'Löschen', no: 'Abbrechen', close: 'Schließen', note: 'Die Bilanz wird in diesem Browser gespeichert.' },
  hi: { allV: 'सभी नियम', form: 'हाल का प्रदर्शन', title: 'रिकॉर्ड', btn: 'रिकॉर्ड', btnT: 'जीत-हार देखें', all: 'सभी', ai: 'AI', rated: 'रेटेड', online: 'ऑनलाइन', pvp: 'आमने-सामने', w: 'जी', l: 'हा', d: 'ड्रॉ', games: '{n} खेल', rate: 'जीत दर', streak: 'लगातार जीत', streakL: 'लगातार हार', best: 'सबसे लंबी जीत', bySide: 'पक्ष के अनुसार', byOpp: 'विरोधी के अनुसार', recent: 'हाल के खेल', empty: 'अभी कोई रिकॉर्ड नहीं। खेल खत्म होते ही अपने-आप दर्ज होगा।', moves: '{n} चालें', reset: 'रिकॉर्ड मिटाएँ', resetQ: 'पूरा रिकॉर्ड मिटाएँ? इसे वापस नहीं लाया जा सकता।', yes: 'मिटाएँ', no: 'रद्द करें', close: 'बंद करें', note: 'रिकॉर्ड इसी ब्राउज़र में रखा जाता है।' },
  ar: { allV: 'كل الأنواع', form: 'الأداء الأخير', title: 'السجل', btn: 'السجل', btnT: 'عرض الانتصارات والهزائم', all: 'الكل', ai: 'الذكاء الاصطناعي', rated: 'مصنّفة', online: 'أونلاين', pvp: 'محلي', w: 'ف', l: 'خ', d: 'ت', games: '{n} مباراة', rate: 'نسبة الفوز', streak: 'انتصارات متتالية', streakL: 'هزائم متتالية', best: 'أفضل سلسلة', bySide: 'حسب الجانب', byOpp: 'حسب الخصم', recent: 'آخر المباريات', empty: 'لا يوجد سجل بعد. تُسجَّل المباريات تلقائيًا عند انتهائها.', moves: '{n} نقلة', reset: 'مسح السجل', resetQ: 'مسح السجل كله؟ لا يمكن التراجع.', yes: 'مسح', no: 'إلغاء', close: 'إغلاق', note: 'يُحفظ السجل في هذا المتصفح.' },
};
const ICON = '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let O = null, vpOpen = false, vtab = 'all', tab = 'all', ov = null, confirmOn = false;
const L = () => { const l = (O && O.lang && O.lang()) || 'ja'; return TX[l] ? l : 'en'; };
const tx = (k, v) => { let x = TX[L()][k]; if (x === undefined) x = TX.en[k]; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] != null ? v[y] : ''); return x; };
const KEY = () => 'atlas-rec-' + O.game;
function load() { try { const a = JSON.parse(localStorage.getItem(KEY()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function store(a) { try { localStorage.setItem(KEY(), JSON.stringify(a.slice(-500))); } catch (e) {} }
function add(r) {
  if (!O || !r || !r.res) return;
  const v = O.variant ? O.variant() : null, x = Object.assign({ t: Date.now() }, r);
  if (v && x.v == null) { x.v = typeof v === 'string' ? v : v.k; if (v.n) x.vn = v.n; }
  const a = load(); a.push(x); store(a);
  if (ov && ov.classList.contains('show')) render();
}
const CSS = `
.grc-ov{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.grc-ov.show{display:flex}
.grc{--gw:#4f86c6;--gl:#c4524b;--gd:#6b665e;--gm:var(--muted,#b9b0a2);--gx:var(--text,#f1ead9);--ga:var(--accent,#d8b56a);--gc:rgba(255,255,255,.035);--gb:rgba(255,255,255,.08);
  width:min(720px,100%);height:min(880px,100%);display:flex;flex-direction:column;background:linear-gradient(180deg,color-mix(in srgb,var(--panel,#1d1712) 92%,#fff 8%),var(--panel,#1d1712) 140px);
  color:var(--gx);border:1px solid var(--gb);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden;box-sizing:border-box;font-variant-numeric:tabular-nums}
.grc *{box-sizing:border-box}
.grc > :not(.grc-bd){flex:none}
.grc-hd{display:flex;align-items:center;gap:12px;padding:20px 22px 14px}
.grc-hd .grc-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--ga) 16%,transparent);flex:none}
.grc-hd svg{width:21px;height:21px;fill:none;stroke:var(--ga);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.grc-hd h2{margin:0;font-size:20px;font-weight:700;letter-spacing:.04em;flex:1;min-width:0}
.grc-x{width:36px;height:36px;border-radius:10px;border:1px solid var(--gb);background:transparent;color:var(--gm);font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center}
.grc-x:hover{color:var(--gx);background:var(--gc)}
.grc-tabs{display:flex;flex:none;gap:2px;margin:0 22px 4px;padding:3px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid var(--gb);width:max-content;max-width:calc(100% - 44px);overflow-x:auto;scrollbar-width:none}
.grc-tabs button{font:inherit;font-size:13.5px;font-weight:600;padding:7px 16px;border-radius:9px;border:0;background:transparent;color:var(--gm);cursor:pointer;white-space:nowrap}
.grc-tabs button.sel{background:var(--gc);color:var(--gx);box-shadow:inset 0 0 0 1px var(--gb),0 1px 3px rgba(0,0,0,.3)}
.grc-vs{position:relative;flex:none;min-width:0;max-width:56%}
.grc-vb{display:flex;align-items:center;gap:10px;max-width:100%;font:inherit;font-size:13.5px;font-weight:600;color:var(--gx);background:var(--gc);border:1px solid var(--gb);border-radius:10px;padding:8px 12px;cursor:pointer}
.grc-vb span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grc-vb i{flex:none;width:7px;height:7px;border-right:2px solid var(--gm);border-bottom:2px solid var(--gm);transform:translateY(-2px) rotate(45deg);transition:transform .15s}
.grc-vs.open .grc-vb{border-color:color-mix(in srgb,var(--ga) 50%,transparent)}.grc-vs.open .grc-vb i{transform:translateY(2px) rotate(-135deg)}
.grc-vp{position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:220px;max-width:min(320px,80vw);max-height:min(360px,60vh);overflow-y:auto;padding:6px;border-radius:14px;
  background:color-mix(in srgb,var(--panel,#1d1712) 94%,#fff 6%);border:1px solid var(--gb);box-shadow:0 18px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:2px;animation:grcVp .14s ease-out}
@keyframes grcVp{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.grc-vp button{display:flex;align-items:center;justify-content:space-between;gap:14px;font:inherit;font-size:14px;font-weight:600;color:var(--gx);background:transparent;border:0;border-radius:9px;padding:9px 12px;cursor:pointer;text-align:start}
.grc-vp button:hover{background:var(--gc)}
.grc-vp button small{color:var(--gm);font-size:12px;font-weight:500;white-space:nowrap}
.grc-vp button.sel{background:color-mix(in srgb,var(--ga) 12%,transparent);color:var(--ga)}
html[dir=rtl] .grc-vp,html[lang=ar] .grc-vp{right:auto;left:0}
.grc-vt{display:flex;flex:none;gap:6px;margin:0 22px 10px;overflow-x:auto;scrollbar-width:none}
.grc-vt button{font:inherit;font-size:13px;font-weight:600;padding:6px 13px;border-radius:999px;border:1px solid var(--gb);background:transparent;color:var(--gm);cursor:pointer;white-space:nowrap;flex:none}
.grc-vt button.sel{color:var(--ga);border-color:color-mix(in srgb,var(--ga) 50%,transparent);background:color-mix(in srgb,var(--ga) 10%,transparent)}
.grc-bd{flex:1;min-height:0;overflow-y:auto;padding:16px 22px 20px;display:flex;flex-direction:column;gap:22px;scrollbar-width:thin}
/* hero: the win-rate ring and the counts */
.grc-hero{display:grid;grid-template-columns:auto minmax(0,1fr);gap:22px;align-items:center;padding:18px 20px;border-radius:16px;background:var(--gc);border:1px solid var(--gb)}
.grc-ring{position:relative;width:132px;height:132px}
.grc-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.grc-ring circle{fill:none;stroke-width:11}
.grc-ring .grc-ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.grc-ring .grc-ctr b{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1}
.grc-ring .grc-ctr small{font-size:11.5px;color:var(--gm);margin-top:5px;letter-spacing:.06em}
.grc-cnt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.grc-cnt div{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.18)}
.grc-cnt span{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--gm);font-weight:600}
.grc-cnt span i{width:8px;height:8px;border-radius:50%;display:inline-block}
.grc-cnt b{font-size:28px;font-weight:800;line-height:1.05}
.grc-meta{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--gm);border-top:1px solid var(--gb);padding-top:12px;margin-top:2px}
.grc-meta b{color:var(--gx);font-weight:700;margin-inline-start:5px}
.grc-right{display:flex;flex-direction:column;gap:12px;min-width:0}
.grc-form{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
.grc-form small{font-size:12px;color:var(--gm);margin-inline-end:6px}
.grc-form i{width:14px;height:14px;border-radius:4px;display:inline-block}
.grc-w-bg{background:var(--gw)}.grc-l-bg{background:var(--gl)}.grc-d-bg{background:var(--gd)}
/* sections */
.grc h3{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gm)}
.grc-tb{display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--gb);overflow:hidden}
.grc-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(70px,1fr) auto auto;align-items:center;gap:14px;padding:11px 14px;font-size:14.5px;background:var(--gc)}
.grc-row + .grc-row{border-top:1px solid var(--gb)}
.grc-row .grc-nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.grc-tag{font-style:normal;font-size:11.5px;font-weight:600;color:var(--gm);margin-inline-start:8px;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.06)}
.grc-mini{display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,.07)}
.grc-mini i{display:block;height:100%}
.grc-row .grc-sc{font-size:12.5px;color:var(--gm);white-space:nowrap;min-width:6.6em;text-align:end}
.grc-row .grc-pc{font-weight:800;min-width:3.4em;text-align:end}
.grc-g{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 14px;font-size:14px;background:var(--gc)}
.grc-g + .grc-g{border-top:1px solid var(--gb)}
.grc-g .grc-rs{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:13px;font-weight:800}
.grc-g .grc-rs.grc-w{background:color-mix(in srgb,var(--gw) 18%,transparent);color:var(--gw)}.grc-g .grc-rs.grc-l{background:color-mix(in srgb,var(--gl) 16%,transparent);color:var(--gl)}.grc-g .grc-rs.grc-d{background:rgba(255,255,255,.08);color:var(--gm)}
.grc-g .grc-mid{min-width:0;display:flex;flex-direction:column;gap:1px}
.grc-g .grc-mid b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grc-g .grc-mid small{color:var(--gm);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grc-g .grc-dt{color:var(--gm);font-size:12px;text-align:end;white-space:nowrap}
.grc-empty{font-size:15px;line-height:1.8;color:var(--gm);text-align:center;padding:40px 10px}
.grc-ft{display:flex;align-items:center;gap:12px;padding:12px 22px 16px;border-top:1px solid var(--gb)}
.grc-ft small{flex:1;color:var(--gm);font-size:12px;min-width:0}
.grc-ft button{font:inherit;font-size:13.5px;font-weight:600;padding:9px 16px;border-radius:10px;border:1px solid var(--gb);background:transparent;color:var(--gx);cursor:pointer;white-space:nowrap}
.grc-ft .grc-warn{color:var(--gm);border-color:transparent;padding-inline:6px}
.grc-ft .grc-warn:hover{text-decoration:underline}
.grc-ft .grc-go{background:var(--ga);color:#1b150a;border-color:transparent;min-width:96px}
.grc-cf{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--gl) 50%,transparent);background:color-mix(in srgb,var(--gl) 8%,transparent);font-size:14px}
.grc-cf span{flex:1;min-width:200px}
.grc-cf div{display:flex;gap:8px}
.grc-cf button{font:inherit;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:9px;border:1px solid var(--gb);background:transparent;color:var(--gx);cursor:pointer}
.grc-cf .grc-warn{background:#8a5a4e;border-color:transparent;color:#fff}
@media (max-width:560px){
  .grc{border-radius:18px}.grc-hd{padding:16px 16px 10px}.grc-tabs{margin:0 16px 2px;max-width:calc(100% - 32px)}.grc-vt{margin:0 16px 8px}.grc-bd{padding:14px 16px 16px;gap:18px}.grc-ft{padding:10px 16px 14px}
  .grc-hero{grid-template-columns:1fr;justify-items:center;padding:16px}.grc-right{width:100%}.grc-ring{width:120px;height:120px}
  .grc-row{grid-template-columns:minmax(0,1fr) 60px auto;gap:10px}.grc-row .grc-sc{display:none}
}
html[dir=rtl] .grc,html[lang=ar] .grc{direction:rtl}
.mtabs .grc-tab{display:none}
.grc-ic svg{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media (pointer: coarse) and (max-width: 760px) and (orientation: portrait){
  body.it-on .mtabs .grc-tab{display:flex}
  body.it-on .grc-menu, body.it-on .grc-ic{display:none!important}
}
`;
function stats(list) {
  const s = { w: 0, l: 0, d: 0, n: list.length, cur: 0, curL: 0, best: 0, side: [{ w: 0, l: 0, d: 0 }, { w: 0, l: 0, d: 0 }], opp: {} };
  let run = 0;
  for (const g of list) {
    s[g.res]++;
    if (g.side === 0 || g.side === 1) s.side[g.side][g.res]++;
    const k = (g.key || g.opp || '?') + '|' + vOf(g); const nm = oppOf(g, list) || k; const o = s.opp[k] || (s.opp[k] = { nm, v: vOf(g), w: 0, l: 0, d: 0, last: 0 }); o[g.res]++; o.nm = nm; o.last = g.t;
    if (g.res === 'w') { run = run > 0 ? run + 1 : 1; } else if (g.res === 'l') { run = run < 0 ? run - 1 : -1; } else run = 0;
    if (run > s.best) s.best = run;
  }
  s.cur = run > 0 ? run : 0; s.curL = run < 0 ? -run : 0;
  return s;
}
const pct = (w, l, d) => { const n = w + l + d; return n ? Math.round((w + d / 2) / n * 100) + '%' : '—'; };
function fmtDate(t) { try { return new Date(t).toLocaleDateString(L() === 'zh' ? 'zh-CN' : L(), { month: 'short', day: 'numeric' }) + ' ' + new Date(t).toLocaleTimeString(L() === 'zh' ? 'zh-CN' : L(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
const mini = x => { const n = x.w + x.l + x.d || 1; return `<span class="grc-mini"><i class="grc-w-bg" style="width:${x.w / n * 100}%"></i><i class="grc-d-bg" style="width:${x.d / n * 100}%"></i><i class="grc-l-bg" style="width:${x.l / n * 100}%"></i></span>`; };
const score = x => `${x.w}${tx('w')} ${x.l}${tx('l')}${x.d ? ' ' + x.d + tx('d') : ''}`;
function ring(st) {
  const n = st.w + st.l + st.d || 1, R = 52, C = 2 * Math.PI * R;
  let off = 0; const seg = (v, col) => { const len = v / n * C; const h = len > 0.5 ? `<circle r="${R}" cx="66" cy="66" stroke="${col}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>` : ''; off += len; return h; };
  return `<div class="grc-ring"><svg viewBox="0 0 132 132"><circle r="${R}" cx="66" cy="66" stroke="rgba(255,255,255,.07)"/>${seg(st.w, 'var(--gw)')}${seg(st.d, 'var(--gd)')}${seg(st.l, 'var(--gl)')}</svg><div class="grc-ctr"><b>${pct(st.w, st.l, st.d)}</b><small>${esc(tx('rate'))}</small></div></div>`;
}
// variant of a record: stamped (v), or for older records read from the opponent label ("AI 3級 · 5五将棋"), else the default
function vOf(g) {
  if (g.v != null) return g.v;
  if (g._v != null) return g._v;
  let k = O.defVariant || '';
  if (O.variants && O.variantName && g.opp) for (const x of O.variants()) { const n = O.variantName(x, L()); if (n && x !== O.defVariant && g.opp.indexOf(' · ' + n) >= 0) { k = x; break; } }
  try { Object.defineProperty(g, '_v', { value: k, enumerable: false }); } catch (e) {}
  return k;
}
const oppOf = (g, list) => { const o = g.opp || ''; const n = vName(vOf(g), list); return n && o.indexOf(' · ' + n) >= 0 ? o.replace(' · ' + n, '') : o; };
function vName(k, list) { const n = O.variantName ? O.variantName(k, L()) : null; if (n) return n; const g = list.find(x => vOf(x) === k && x.vn); return g ? g.vn : (k || '—'); }
function render() {
  const every = load(), vs = [...new Set(every.map(vOf))];
  if (O.variants) { const ord = O.variants(); vs.sort((a, b) => (ord.indexOf(a) + 1 || 99) - (ord.indexOf(b) + 1 || 99)); }
  if (vtab !== 'all' && !vs.includes(vtab)) vtab = 'all';
  const all = vtab === 'all' ? every : every.filter(g => vOf(g) === vtab), modes = ['ai', 'rated', 'online', 'pvp'].filter(m => all.some(g => g.mode === m));
  if (tab !== 'all' && !modes.includes(tab)) tab = 'all';
  const list = tab === 'all' ? all : all.filter(g => g.mode === tab);
  const st = stats(list), sides = O.sides ? O.sides(L()) : null;
  let h = `<div class="grc-hd"><span class="grc-ic">${ICON}</span><h2>${esc(tx('title'))}</h2>${vs.length > 1 ? `<div class="grc-vs${vpOpen ? ' open' : ''}"><button type="button" class="grc-vb" data-act="vp" aria-haspopup="listbox" aria-expanded="${vpOpen}"><span>${esc(vtab === 'all' ? tx('allV') : vName(vtab, every))}</span><i></i></button>${vpOpen ? `<div class="grc-vp" role="listbox">${['all'].concat(vs).map(k => { const n = k === 'all' ? every.length : every.filter(g => vOf(g) === k).length; return `<button type="button" role="option" aria-selected="${k === vtab}" data-vt="${esc(k)}" class="${k === vtab ? 'sel' : ''}"><span>${esc(k === 'all' ? tx('allV') : vName(k, every))}</span><small>${esc(tx('games', { n }))}</small></button>`; }).join('')}</div>` : ''}</div>` : ''}<button type="button" class="grc-x" data-act="close" aria-label="${esc(tx('close'))}">×</button></div>`;

  if (modes.length) h += `<div class="grc-tabs" role="tablist">${['all'].concat(modes).map(m => `<button type="button" role="tab" data-tab="${m}" class="${m === tab ? 'sel' : ''}">${esc(tx(m))}</button>`).join('')}</div>`;
  h += '<div class="grc-bd">';
  if (confirmOn) h += `<div class="grc-cf"><span>${esc(tx('resetQ'))}</span><div><button type="button" data-cf="no">${esc(tx('no'))}</button><button type="button" class="grc-warn" data-cf="yes">${esc(tx('yes'))}</button></div></div>`;
  if (!list.length) h += `<p class="grc-empty">${esc(tx('empty'))}</p>`;
  else {
    const n = st.w + st.l + st.d, form = list.slice(-20);
    h += `<div class="grc-hero">${ring(st)}<div class="grc-right"><div class="grc-cnt">` +
      [['w', st.w], ['l', st.l], ['d', st.d]].map(([k, v]) => `<div><span><i class="grc-${k}-bg"></i>${esc(tx(k))}</span><b>${v}</b></div>`).join('') + `</div>` +
      `<div class="grc-form"><small>${esc(tx('form'))}</small>${form.map(g => `<i class="grc-${g.res}-bg" title="${esc(tx(g.res))}"></i>`).join('')}</div></div>` +
      `<div class="grc-meta"><span>${esc(tx('games', { n }))}</span>${st.cur ? `<span>${esc(tx('streak'))}<b>${st.cur}</b></span>` : ''}${st.curL ? `<span>${esc(tx('streakL'))}<b>${st.curL}</b></span>` : ''}<span>${esc(tx('best'))}<b>${st.best}</b></span></div></div>`;
    if (sides && list.some(g => g.side === 0 || g.side === 1)) h += `<section><h3>${esc(tx('bySide'))}</h3><div class="grc-tb">${[0, 1].map(i => { const x = st.side[i]; return `<div class="grc-row"><span class="grc-nm">${esc(sides[i])}</span>${mini(x)}<span class="grc-sc">${esc(score(x))}</span><span class="grc-pc">${pct(x.w, x.l, x.d)}</span></div>`; }).join('')}</div></section>`;
    const opps = Object.values(st.opp).sort((a, b) => b.last - a.last).slice(0, 12);
    if (opps.length) h += `<section><h3>${esc(tx('byOpp'))}</h3><div class="grc-tb">${opps.map(x => `<div class="grc-row"><span class="grc-nm">${esc(x.nm)}${vtab === 'all' && vs.length > 1 ? `<i class="grc-tag">${esc(vName(x.v, every))}</i>` : ''}</span>${mini(x)}<span class="grc-sc">${esc(score(x))}</span><span class="grc-pc">${pct(x.w, x.l, x.d)}</span></div>`).join('')}</div></section>`;
    h += `<section><h3>${esc(tx('recent'))}</h3><div class="grc-tb">${list.slice(-30).reverse().map(g => `<div class="grc-g"><span class="grc-rs grc-${g.res}">${esc(tx(g.res))}</span><span class="grc-mid"><b>${esc(oppOf(g, every) || tx(g.mode))}</b><small>${esc([vtab === 'all' && vs.length > 1 ? vName(vOf(g), every) : '', tx(g.mode), sides && (g.side === 0 || g.side === 1) ? sides[g.side] : '', g.n ? tx('moves', { n: g.n }) : '', g.why || ''].filter(Boolean).join(' · '))}</small></span><span class="grc-dt">${esc(fmtDate(g.t))}</span></div>`).join('')}</div></section>`;
  }
  h += `</div><div class="grc-ft"><small>${esc(tx('note'))}</small>${every.length ? `<button type="button" class="grc-warn" data-act="reset">${esc(tx('reset'))}</button>` : ''}<button type="button" class="grc-go" data-act="close">${esc(tx('close'))}</button></div>`;
  ov.firstChild.innerHTML = h;
}
function open() { if (!ov) return; confirmOn = false; vpOpen = false; if (O.variant) { const v = O.variant(); const k = v == null ? null : typeof v === 'string' ? v : v.k; if (k != null && load().some(g => vOf(g) === k) && new Set(load().map(vOf)).size > 1) vtab = k; } render(); ov.classList.add('show'); }
function close() { if (ov) ov.classList.remove('show'); }
function init(o) {
  O = o;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  ov = document.createElement('div'); ov.className = 'grc-ov'; ov.innerHTML = '<div class="grc" role="dialog" aria-modal="true"></div>'; document.body.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'vp') { vpOpen = !vpOpen; render(); return; }
    if (b.dataset.vt) { vtab = b.dataset.vt; vpOpen = false; render(); }
    else if (b.dataset.tab) { tab = b.dataset.tab; render(); }
    else if (b.dataset.act === 'close') close();
    else if (b.dataset.act === 'reset') { confirmOn = true; render(); ov.querySelector('.grc-bd').scrollTop = 0; }
    else if (b.dataset.cf === 'no') { confirmOn = false; render(); }
    else if (b.dataset.cf === 'yes') { store([]); confirmOn = false; render(); }
  });
  ov.addEventListener('pointerdown', e => { if (vpOpen && !e.target.closest('.grc-vs')) { vpOpen = false; render(); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('show')) { if (vpOpen) { vpOpen = false; render(); } else close(); } });
  // PC (and every layout without the phones' tab bar): a menu button
  const menu = typeof o.menu === 'string' ? document.querySelector(o.menu) : o.menu;
  let mb = null;
  const snd = document.getElementById('btnSound');
  if (snd && snd.parentNode && !o.btnClass) {   // an icon in the icon set: 盤面反転 → 戦績 → sound
    mb = document.createElement('button'); mb.type = 'button'; mb.className = (snd.className || 'snd') + ' grc-ic'; mb.id = 'btnRecord';
    mb.addEventListener('click', open); snd.parentNode.insertBefore(mb, snd);
  } else if (menu) {
    mb = document.createElement('button'); mb.type = 'button'; mb.className = (o.btnClass || 'btn') + ' grc-menu'; mb.id = 'btnRecord';
    mb.addEventListener('click', open); menu.appendChild(mb);
  }
  let tb = null;
  const relabel = () => {
    if (mb) { const h = mb.classList.contains('grc-ic') ? ICON : ICON + `<span>${esc(tx('btn'))}</span>`; if (mb.innerHTML !== h) mb.innerHTML = h; mb.title = tx('btnT'); mb.setAttribute('aria-label', tx('btn')); }
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
