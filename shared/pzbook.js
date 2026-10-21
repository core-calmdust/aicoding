// PZBook — shared puzzle-collection UI for the 世界のボドゲ大全 games (spec v1).
//
// Every game with puzzles uses the same structure so the experience feels the same everywhere:
//  - Puzzles are grouped in themes; each theme is split into stages of 10 (STAGE 1 入門 → … → 名人).
//    Each stage has its own colour, getting warmer as the puzzles get harder.
//  - A puzzle gives 1–3 stars: ★★★ first try without a hint, ★★ after a hint or a wrong try, ★ after seeing the answer.
//  - Stage k+1 unlocks when stage k has UNLOCK puzzles cleared. Clearing all puzzles of a stage earns a medal:
//    bronze (all cleared), silver (all ★★ or better), gold (all ★★★).
//  - Theme cards show progress, stars and a crown when the whole theme is cleared.
//  - The next puzzle to play is highlighted (NEXT) and a "continue" button jumps to it.
// The host game keeps the records (puzzle -> stars) and calls the HTML builders below.
// v3: home() / ghead() build the collection home of every game in the layout of 詰めオセロ (see "collection home" below).
(function () {
'use strict';
const STAGE = 10, UNLOCK = 6;
const TIERS = [   // stage colours, easy -> hard
  { c: '#6fd3a0', c2: '#2f7d5a' }, { c: '#5ec6d8', c2: '#2a6f7f' }, { c: '#7aa2ff', c2: '#38509a' },
  { c: '#b28dff', c2: '#5b3f99' }, { c: '#ff8fa8', c2: '#9a3f57' }, { c: '#f2c060', c2: '#8e6a26' },
];
const S = {
  ja: { tier: ['入門', '初級', '中級', '上級', '達人', '名人'], stage: 'STAGE {n}', next: 'NEXT', cont: '続きから', lock: 'STAGE {p} をあと{n}問クリアで解放', locked: 'まだ解放されていません', unlocked: 'STAGE {n} が解放されました！', stageClear: 'STAGE {n} クリア！', complete: 'コンプリート', medal: ['銅メダル', '銀メダル', '金メダル'], medalHow: '全問★★★で金メダル', stars: '★ {a}/{b}', got: '★{n} 獲得', best: '自己ベスト ★{n}', left: 'このステージ あと{n}問', allDone: 'すべてクリア！' },
  en: { tier: ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'], stage: 'STAGE {n}', next: 'NEXT', cont: 'Continue', lock: 'Clear {n} more in STAGE {p} to unlock', locked: 'Not unlocked yet', unlocked: 'STAGE {n} unlocked!', stageClear: 'STAGE {n} cleared!', complete: 'Complete', medal: ['Bronze medal', 'Silver medal', 'Gold medal'], medalHow: 'All ★★★ for gold', stars: '★ {a}/{b}', got: '★{n} earned', best: 'Best ★{n}', left: '{n} left in this stage', allDone: 'All cleared!' },
  zh: { tier: ['入门', '初级', '中级', '高级', '达人', '名人'], stage: 'STAGE {n}', next: 'NEXT', cont: '继续', lock: '在 STAGE {p} 再通过{n}题即可解锁', locked: '尚未解锁', unlocked: 'STAGE {n} 已解锁！', stageClear: 'STAGE {n} 通关！', complete: '全部完成', medal: ['铜牌', '银牌', '金牌'], medalHow: '全部★★★获得金牌', stars: '★ {a}/{b}', got: '获得 ★{n}', best: '最佳 ★{n}', left: '本关还剩{n}题', allDone: '全部通关！' },
  ko: { tier: ['입문', '초급', '중급', '상급', '달인', '명인'], stage: 'STAGE {n}', next: 'NEXT', cont: '이어서', lock: 'STAGE {p}에서 {n}문제를 더 풀면 해제', locked: '아직 잠겨 있습니다', unlocked: 'STAGE {n} 해제!', stageClear: 'STAGE {n} 클리어!', complete: '컴플리트', medal: ['동메달', '은메달', '금메달'], medalHow: '모두 ★★★면 금메달', stars: '★ {a}/{b}', got: '★{n} 획득', best: '최고 ★{n}', left: '이 스테이지 남은 문제 {n}', allDone: '모두 클리어!' },
  es: { tier: ['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Experto', 'Maestro'], stage: 'FASE {n}', next: 'SIGUIENTE', cont: 'Continuar', lock: 'Resuelve {n} más en la FASE {p} para desbloquear', locked: 'Aún bloqueada', unlocked: '¡FASE {n} desbloqueada!', stageClear: '¡FASE {n} superada!', complete: 'Completo', medal: ['Medalla de bronce', 'Medalla de plata', 'Medalla de oro'], medalHow: 'Todo ★★★ para el oro', stars: '★ {a}/{b}', got: '★{n} conseguidas', best: 'Mejor ★{n}', left: 'Quedan {n} en esta fase', allDone: '¡Todo resuelto!' },
  fr: { tier: ['Novice', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert', 'Maître'], stage: 'ÉTAPE {n}', next: 'SUIVANT', cont: 'Continuer', lock: 'Réussissez-en encore {n} dans l’ÉTAPE {p} pour débloquer', locked: 'Pas encore débloquée', unlocked: 'ÉTAPE {n} débloquée !', stageClear: 'ÉTAPE {n} réussie !', complete: 'Terminé', medal: ['Médaille de bronze', 'Médaille d’argent', 'Médaille d’or'], medalHow: 'Tout en ★★★ pour l’or', stars: '★ {a}/{b}', got: '★{n} gagnées', best: 'Record ★{n}', left: 'Encore {n} dans cette étape', allDone: 'Tout est résolu !' },
  pt: { tier: ['Novato', 'Iniciante', 'Intermediário', 'Avançado', 'Especialista', 'Mestre'], stage: 'FASE {n}', next: 'PRÓXIMO', cont: 'Continuar', lock: 'Resolva mais {n} na FASE {p} para desbloquear', locked: 'Ainda bloqueada', unlocked: 'FASE {n} desbloqueada!', stageClear: 'FASE {n} concluída!', complete: 'Completo', medal: ['Medalha de bronze', 'Medalha de prata', 'Medalha de ouro'], medalHow: 'Tudo ★★★ para o ouro', stars: '★ {a}/{b}', got: '★{n} conquistadas', best: 'Recorde ★{n}', left: 'Faltam {n} nesta fase', allDone: 'Tudo resolvido!' },
  de: { tier: ['Neuling', 'Anfänger', 'Mittelstufe', 'Fortgeschritten', 'Experte', 'Meister'], stage: 'STUFE {n}', next: 'WEITER', cont: 'Weiter', lock: 'Noch {n} in STUFE {p} lösen zum Freischalten', locked: 'Noch gesperrt', unlocked: 'STUFE {n} freigeschaltet!', stageClear: 'STUFE {n} geschafft!', complete: 'Komplett', medal: ['Bronzemedaille', 'Silbermedaille', 'Goldmedaille'], medalHow: 'Alles ★★★ für Gold', stars: '★ {a}/{b}', got: '★{n} erhalten', best: 'Bestwert ★{n}', left: 'Noch {n} in dieser Stufe', allDone: 'Alles gelöst!' },
  hi: { tier: ['नौसिखिया', 'शुरुआती', 'मध्यम', 'उन्नत', 'विशेषज्ञ', 'उस्ताद'], stage: 'स्टेज {n}', next: 'अगला', cont: 'जारी रखें', lock: 'स्टेज {p} में {n} और हल करने पर खुलेगा', locked: 'अभी बंद है', unlocked: 'स्टेज {n} खुल गया!', stageClear: 'स्टेज {n} पूरा!', complete: 'पूरा', medal: ['कांस्य पदक', 'रजत पदक', 'स्वर्ण पदक'], medalHow: 'सभी ★★★ पर स्वर्ण', stars: '★ {a}/{b}', got: '★{n} मिले', best: 'सर्वश्रेष्ठ ★{n}', left: 'इस स्टेज में {n} बाकी', allDone: 'सब हल हो गए!' },
  ar: { tier: ['مبتدئ', 'ناشئ', 'متوسط', 'متقدم', 'خبير', 'أستاذ'], stage: 'المرحلة {n}', next: 'التالي', cont: 'متابعة', lock: 'حُلّ {n} أخرى في المرحلة {p} لفتحها', locked: 'غير مفتوحة بعد', unlocked: 'فُتحت المرحلة {n}!', stageClear: 'اكتملت المرحلة {n}!', complete: 'مكتمل', medal: ['ميدالية برونزية', 'ميدالية فضية', 'ميدالية ذهبية'], medalHow: 'كل الألغاز ★★★ للذهبية', stars: '★ {a}/{b}', got: 'حصلت على ★{n}', best: 'الأفضل ★{n}', left: 'بقي {n} في هذه المرحلة', allDone: 'حُلّت جميعها!' },
};
// v2: keep playing up to the puzzle's move count; obvious blunders are flagged at once
const S2 = {
  ja: { movesLeft: 'あと{n}手', blunder: '明らかなミスです。', outOfMoves: '{n}手以内に達成できませんでした。', retry: 'もう一度挑戦' },
  en: { movesLeft: '{n} moves left', blunder: 'That is a clear mistake.', outOfMoves: 'Not achieved within {n} moves.', retry: 'Try again' },
  zh: { movesLeft: '还剩{n}手', blunder: '这是明显的失误。', outOfMoves: '未能在{n}手内达成。', retry: '再试一次' },
  ko: { movesLeft: '{n}수 남음', blunder: '명백한 실수입니다.', outOfMoves: '{n}수 안에 달성하지 못했습니다.', retry: '다시 도전' },
  es: { movesLeft: 'Quedan {n} jugadas', blunder: 'Es un error claro.', outOfMoves: 'No se logró en {n} jugadas.', retry: 'Reintentar' },
  fr: { movesLeft: 'Encore {n} coups', blunder: 'C’est une erreur nette.', outOfMoves: 'Objectif non atteint en {n} coups.', retry: 'Réessayer' },
  pt: { movesLeft: 'Faltam {n} lances', blunder: 'É um erro claro.', outOfMoves: 'Não alcançado em {n} lances.', retry: 'Tentar de novo' },
  de: { movesLeft: 'Noch {n} Züge', blunder: 'Das ist ein klarer Fehler.', outOfMoves: 'In {n} Zügen nicht geschafft.', retry: 'Nochmal' },
  hi: { movesLeft: '{n} चालें बाकी', blunder: 'यह साफ़ गलती है।', outOfMoves: '{n} चालों में लक्ष्य पूरा नहीं हुआ।', retry: 'फिर कोशिश करें' },
  ar: { movesLeft: 'تبقّى {n} نقلات', blunder: 'هذه نقلة خاطئة بوضوح.', outOfMoves: 'لم يتحقق الهدف خلال {n} نقلات.', retry: 'أعد المحاولة' },
};
for (const k in S2) Object.assign(S[k], S2[k]);
// v3: collection home (hero, daily, category tabs, theme cards with a board)
const S3 = {
  ja: { count: '{n}問', diff: '難易度' }, en: { count: '{n} puzzles', diff: 'Difficulty' }, zh: { count: '{n}题', diff: '难度' }, ko: { count: '{n}문제', diff: '난이도' },
  es: { count: '{n} problemas', diff: 'Dificultad' }, fr: { count: '{n} problèmes', diff: 'Difficulté' }, pt: { count: '{n} problemas', diff: 'Dificuldade' },
  de: { count: '{n} Aufgaben', diff: 'Schwierigkeit' }, hi: { count: '{n} पहेलियाँ', diff: 'कठिनाई' }, ar: { count: '{n} لغزًا', diff: 'الصعوبة' },
};
for (const k in S3) Object.assign(S[k], S3[k]);
let L = 'ja';
const tx = (k, v) => { let x = (S[L] || S.en)[k]; if (typeof x === 'string' && v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAR = on => `<svg class="pb-star${on ? ' on' : ''}" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>`;
const LOCK = '<svg class="pb-lock" viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>';
const CROWN = '<svg class="pb-crown" viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>';
const MEDAL = k => `<svg class="pb-medal m${k}" viewBox="0 0 24 24"><path class="rb" d="M8 2h3l1 6H9zM13 2h3l-1 6h-3z"/><circle cx="12" cy="15" r="6.5"/><path class="st" d="M12 11.2l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3z"/></svg>`;

// ------------------------------------------------------------------ model helpers
// recs: array of stars per puzzle (0 = not cleared)
function stages(n) { const out = []; for (let a = 0; a < n; a += STAGE) out.push({ a, b: Math.min(n, a + STAGE) }); return out; }
function tierOf(k, count) { if (count <= 1) return 0; return Math.round(k * (TIERS.length - 1) / Math.max(count - 1, TIERS.length - 1)); }
function stageInfo(recs) {
  const st = stages(recs.length);
  return st.map((s, k) => {
    const r = recs.slice(s.a, s.b), done = r.filter(x => x > 0).length, prev = k ? st[k - 1] : null;
    const prevDone = prev ? recs.slice(prev.a, prev.b).filter(x => x > 0).length : 0;
    const need = prev ? Math.min(UNLOCK, prev.b - prev.a) : 0;
    const medal = done === r.length ? (r.every(x => x >= 3) ? 3 : r.every(x => x >= 2) ? 2 : 1) : 0;
    return Object.assign({ k, tier: tierOf(k, st.length), done, size: r.length, open: !prev || prevDone >= need, need, prevDone, medal }, s);
  });
}
function isOpen(recs, j) { const si = stageInfo(recs); return si[Math.floor(j / STAGE)].open; }
function nextIndex(recs) {   // first uncleared puzzle in an open stage
  const si = stageInfo(recs);
  for (const s of si) { if (!s.open) break; for (let j = s.a; j < s.b; j++) if (!recs[j]) return j; }
  return -1;
}
function starsFor(o) { return o.answered ? 1 : (o.hinted || o.failed) ? 2 : 3; }
function totals(recs) { return { done: recs.filter(x => x > 0).length, stars: recs.reduce((a, x) => a + (x || 0), 0), total: recs.length }; }
// what changed when puzzle j was solved (before: records before solving, after: records after)
function events(before, after, j) {
  const a = stageInfo(before), b = stageInfo(after), k = Math.floor(j / STAGE), ev = [];
  if (!a[k].medal && b[k].medal) ev.push({ type: 'stageClear', k, medal: b[k].medal });
  else if (b[k].medal > a[k].medal) ev.push({ type: 'medalUp', k, medal: b[k].medal });
  for (let i = 0; i < b.length; i++) if (b[i].open && !a[i].open) ev.push({ type: 'unlock', k: i });
  if (totals(after).done === after.length && totals(before).done < before.length) ev.push({ type: 'complete' });
  return ev;
}

// ------------------------------------------------------------------ HTML builders
// theme card: o = { i, no, name, sub, recs, tier (0-5 colour of the card), icon (optional html) }
function card(o) {
  const tt = totals(o.recs), T = TIERS[Math.min(TIERS.length - 1, o.tier || 0)], full = tt.done === tt.total && tt.total > 0;
  const si = stageInfo(o.recs), medals = si.map(s => s.medal ? MEDAL(s.medal) : `<i class="pb-pip${s.done ? ' part' : ''}"></i>`).join('');
  return `<button class="pb-card${full ? ' full' : ''}" data-i="${o.i}" style="--c:${T.c};--c2:${T.c2}">` +
    `<span class="pb-no">${o.icon || o.no}</span>` +
    `<span class="pb-tx"><b>${esc(o.name)}</b><small>${esc(o.sub || '')}</small>` +
    `<span class="pb-prog"><span class="pb-bar"><i style="width:${tt.total ? tt.done * 100 / tt.total : 0}%"></i></span><span class="pb-cnt">${tt.done}/${tt.total}</span></span>` +
    `<span class="pb-meta"><span class="pb-medals">${medals}</span><span class="pb-st">${STAR(true)}${tt.stars}/${tt.total * 3}</span></span></span>` +
    (full ? `<span class="pb-full">${CROWN}${esc(tx('complete'))}</span>` : '') + `</button>`;
}
// stage grid of one theme: o = { recs, cur (index being played, optional) }
function grid(o) {
  const recs = o.recs, si = stageInfo(recs), nx = nextIndex(recs), tt = totals(recs);
  let h = `<div class="pb-head"><span class="pb-ring" style="--p:${tt.total ? tt.done / tt.total : 0}"><b>${tt.done}</b><small>/${tt.total}</small></span>` +
    `<span class="pb-hs"><span class="pb-st big">${STAR(true)}${tt.stars}<small>/${tt.total * 3}</small></span><small>${esc(tx('medalHow'))}</small></span>` +
    (nx >= 0 ? `<button class="pb-cont" data-j="${nx}">${esc(tx('cont'))} ▶ <b>${nx + 1}</b></button>` : `<span class="pb-alldone">${CROWN}${esc(tx('allDone'))}</span>`) + `</div>`;
  for (const s of si) {
    const T = TIERS[s.tier];
    h += `<section class="pb-stage${s.open ? '' : ' locked'}${s.medal ? ' cleared' : ''}" style="--c:${T.c};--c2:${T.c2}">` +
      `<header><span class="pb-sn">${esc(tx('stage', { n: s.k + 1 }))}</span><span class="pb-tier">${esc(tx('tier')[s.tier])}</span>` +
      `<span class="pb-sp"><span class="pb-bar"><i style="width:${s.done * 100 / s.size}%"></i></span>${s.done}/${s.size}</span>` +
      (s.medal ? `<span class="pb-md" title="${esc(tx('medal')[s.medal - 1])}">${MEDAL(s.medal)}</span>` : '') +
      (!s.open ? `<span class="pb-lk">${LOCK}${esc(tx('lock', { p: s.k, n: s.need - s.prevDone }))}</span>` : '') + `</header><div class="pb-tiles">`;
    for (let j = s.a; j < s.b; j++) {
      const r = recs[j] || 0, cls = ['pb-tile']; if (r) cls.push('done'); if (j === nx) cls.push('next'); if (j === o.cur) cls.push('cur'); if (!s.open) cls.push('lk');
      h += `<button class="${cls.join(' ')}" data-j="${j}" ${s.open ? '' : 'aria-disabled="true"'}><span class="n">${j + 1}</span>` +
        (r ? `<span class="s">${[1, 2, 3].map(k => STAR(k <= r)).join('')}</span>` : j === nx ? `<span class="nx">${esc(tx('next'))}</span>` : '') + `</button>`;
    }
    h += `</div></section>`;
  }
  return h;
}
// small strip shown under the puzzle status after solving: stars earned + stage progress + events
function solved(o) {   // o = { stars, recs (after), j, events }
  const k = Math.floor(o.j / STAGE), s = stageInfo(o.recs)[k], T = TIERS[s.tier];
  let h = `<span class="pb-sv" style="--c:${T.c};--c2:${T.c2}"><span class="pb-sv-st">${[1, 2, 3].map(i => STAR(i <= o.stars)).join('')}</span>` +
    `<span class="pb-sv-tx">${esc(tx('stage', { n: k + 1 }))} · ${esc(tx('tier')[s.tier])}<span class="pb-bar"><i style="width:${s.done * 100 / s.size}%"></i></span>${s.done}/${s.size}</span></span>`;
  for (const e of o.events || []) {
    if (e.type === 'stageClear' || e.type === 'medalUp') h += `<span class="pb-ev">${MEDAL(e.medal)}${esc(tx('stageClear', { n: e.k + 1 }))} ${esc(tx('medal')[e.medal - 1])}</span>`;
    if (e.type === 'unlock') h += `<span class="pb-ev un">${esc(tx('unlocked', { n: e.k + 1 }))}</span>`;
    if (e.type === 'complete') h += `<span class="pb-ev cp">${CROWN}${esc(tx('complete'))}</span>`;
  }
  return h;
}

// ------------------------------------------------------------------ collection home (v3, the layout of 詰めオセロ)
// hero (overall ring, title + count, lead, ★ and medals, continue) → daily card(s) → category tabs + one-line description →
// theme cards (board thumbnail of a representative position with a badge, name, difficulty pips, 2-line description, progress, medals, ★).
// Clicks are reported through bindHome(el, {cat, cont, daily, card}) with the keys given here.
const tierC = o => { if (o.c) return `--c:${o.c[0]};--c2:${o.c[1]}`; const T = TIERS[Math.max(0, Math.min(TIERS.length - 1, o.tier || 0))]; return `--c:${T.c};--c2:${T.c2}`; };
const diffOfTier = k => Math.max(1, Math.min(5, Math.ceil(((k || 0) + 1) * 5 / 6)));
const pips = n => `<span class="pbh-diff" title="${esc(tx('diff'))} ${n}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const tmMark = tm => !tm ? '' : tm === 'b' || tm === 'w' ? `<i class="pbh-tm ${tm}"></i>` : `<i class="pbh-tm x">${tm}</i>`;
function medalCount(all) { const m = [0, 0, 0, 0]; for (const r of all) stageInfo(r).forEach(s => m[s.medal]++); return m; }
function homeCard(o) {
  const recs = o.recs, tt = totals(recs), full = tt.done === tt.total && tt.total > 0;
  const medals = stageInfo(recs).map(x => x.medal ? MEDAL(x.medal) : `<i class="pb-pip${x.done ? ' part' : ''}"></i>`).join('');
  return `<button class="pbh-card${full ? ' full' : ''}" data-pbh-card="${esc(o.key)}" style="${tierC(o)}"><span class="pbh-th"><span class="pbh-bd${o.bdCls ? ' ' + o.bdCls : ''}">${o.board || ''}${tmMark(o.tm)}<span class="pbh-ic">${o.badge || ''}</span></span></span>` +
    `<span class="pbh-tx"><span class="pbh-top"><b class="pbh-nm">${esc(o.name)}</b>${pips(o.diff || diffOfTier(o.tier))}</span><span class="pbh-desc">${esc(o.desc || '')}</span>` +
    `<span class="pbh-prog"><span class="pb-bar"><i style="width:${tt.total ? tt.done * 100 / tt.total : 0}%"></i></span><span>${tt.done}/${tt.total}</span></span>` +
    `<span class="pbh-meta"><span class="pb-medals">${medals}</span><span class="pb-st">${STAR(true)}${tt.stars}/${tt.total * 3}</span></span></span>` +
    (full ? `<span class="pb-full">${CROWN}${esc(tx('complete'))}</span>` : '') + `</button>`;
}
function home(o) {
  const all = (o.all || []).flat(), tt = totals(all), md = medalCount(o.all || []);
  let h = `<div class="pbh"${o.style ? ` style="${o.style}"` : ''}>` + (o.pre || '');
  h += `<div class="pbh-hero"><span class="pb-ring" style="--p:${tt.total ? tt.done / tt.total : 0}"><b>${tt.done}</b><small>/${tt.total}</small></span>` +
    `<span class="pbh-hs"><b class="pbh-title">${esc(o.title)}<small>${esc(tx('count', { n: tt.total }))}</small></b>${o.lead ? `<span class="pbh-lead">${esc(o.lead)}</span>` : ''}` +
    `<span class="pbh-stats"><span class="pb-st">${STAR(true)}${tt.stars}<small>/${tt.total * 3}</small></span>` +
    [3, 2, 1].map(k => `<span class="pbh-md" title="${esc(tx('medal')[k - 1])}">${MEDAL(k)}${md[k]}</span>`).join('') + (o.heroExtra || '') + `</span></span>` +
    (o.cont ? `<button class="pb-cont" data-pbh-cont="${esc(o.cont.key)}">${esc(tx('cont'))} ▶ <b>No.${o.cont.no}</b><small>${esc(o.cont.name || '')}</small></button>` : tt.total ? `<span class="pb-alldone">${CROWN}${esc(tx('allDone'))}</span>` : '') + `</div>`;
  if (o.daily && o.daily.length) h += `<div class="pbh-dailies">` + o.daily.map(d => `<button class="pbh-daily" data-pbh-daily="${esc(d.key)}"><span class="th">${d.board || ''}</span><span class="tx"><b>${esc(d.title)}<span>${esc(d.date || '')}</span></b>` +
    `<small>${esc(d.sub || '')}</small></span><span class="go${d.done ? ' ok' : ''}">${d.done ? '✓' : esc(d.go || '')}</span></button>`).join('') + `</div>`;
  if (o.cats && o.cats.length > 1) h += `<div class="pbh-tabs" role="tablist">${o.cats.map(c => `<button role="tab" data-pbh-cat="${esc(c.key)}" class="${c.key === o.cur ? 'sel' : ''}" aria-selected="${c.key === o.cur}"><span class="ic">${c.icon || ''}</span><span class="nm">${esc(c.name)}</span><span class="ct${c.total && c.done === c.total ? ' ok' : ''}">${c.done}/${c.total}</span></button>`).join('')}</div>`;
  if (o.catDesc) h += `<p class="pbh-cat">${esc(o.catDesc)}</p>`;
  h += `<div class="pbh-cards">${(o.cards || []).map(homeCard).join('')}</div>` + (o.foot || '') + `</div>`;
  return h;
}
function bindHome(el, on) {   // safe to call on every render; works next to other click handlers of the same element
  el.__pbh = on;
  if (!el.__pbhBound) {
    el.__pbhBound = true;
    el.addEventListener('click', e => {
      const on = el.__pbh; if (!on || !e.target.closest('.pbh')) return;
      let b;
      if ((b = e.target.closest('[data-pbh-cat]'))) { if (on.cat) on.cat(b.dataset.pbhCat); return; }
      if ((b = e.target.closest('[data-pbh-cont]'))) { if (on.cont) on.cont(b.dataset.pbhCont); return; }
      if ((b = e.target.closest('[data-pbh-daily]'))) { if (on.daily) on.daily(b.dataset.pbhDaily); return; }
      if ((b = e.target.closest('[data-pbh-card]'))) { if (on.card) on.card(b.dataset.pbhCard); }
    });
  }
  const sb = el.querySelector('.pbh-tabs .sel'); if (sb) { const t = sb.parentNode; if (t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, sb.offsetLeft - (t.clientWidth - sb.offsetWidth) / 2); }
}
// header of a theme's stage grid: o = { badge, name, desc, chips: [text], diff | tier, c }
function ghead(o) {
  return `<div class="pbh-ghead" style="${tierC(o)}"><span class="ic">${o.badge || ''}</span><span class="tx"><h2>${esc(o.name)}</h2>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}` +
    `<span class="chips">${(o.chips || []).filter(Boolean).map(c => `<span class="pbh-chip">${esc(c)}</span>`).join('')}${pips(o.diff || diffOfTier(o.tier))}</span></span></div>`;
}
// "continue": the theme played last (key saved with lastSet), else the first theme with something left, same category first.
// list: [{key, recs, cat}] → {key, j} | null
function lastGet(store) { try { return localStorage.getItem(store); } catch (e) { return null; } }
function lastSet(store, key) { try { localStorage.setItem(store, String(key)); } catch (e) {} }
function resume(list, store) {
  const last = lastGet(store), L = list.find(x => String(x.key) === last);
  if (L && nextIndex(L.recs) >= 0) return { key: L.key, j: nextIndex(L.recs) };
  const cat = L ? L.cat : list.length ? list[0].cat : null;
  const order = list.filter(x => x.cat === cat).concat(list.filter(x => x.cat !== cat));
  for (const x of order) { const j = nextIndex(x.recs); if (j >= 0) return { key: x.key, j }; }
  return null;
}
// small SVG icons for category tabs (stroke icons, 24×24)
const ICONS = {
  level: '<path d="M3 20h5v-5h5v-5h5V5h3"/>', theme: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/>', unique: '<path d="M12 3l2.2 6.3L20.5 11l-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-1.7z"/>',
  real: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>', crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12h.01" stroke-width="3.4"/>', sprout: '<path d="M12 21v-9M12 12C12 7 8 5 4 5c0 5 3 7 8 7zM12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
  four: '<circle cx="4.5" cy="12" r="2.2"/><circle cx="9.5" cy="12" r="2.2"/><circle cx="14.5" cy="12" r="2.2"/><circle cx="19.5" cy="12" r="2.2"/>', three: '<circle cx="5.5" cy="18.5" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="18.5" cy="5.5" r="2.4"/><path d="M3 12h4M17 19h4" stroke-dasharray="1.5 2"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>', grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>', mill: '<path d="M4 12h16"/><circle cx="4.5" cy="12" r="2.6"/><circle cx="12" cy="12" r="2.6"/><circle cx="19.5" cy="12" r="2.6"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.theme}</svg>`;

const CSS = `
.pb-list{display:grid;gap:10px}
.pb-card{position:relative;display:flex;gap:12px;align-items:center;text-align:left;width:100%;padding:12px 14px;border-radius:14px;color:var(--text);
  border:1px solid color-mix(in srgb,var(--c) 35%,var(--line));background:linear-gradient(120deg,color-mix(in srgb,var(--c2) 30%,transparent),rgba(0,0,0,.22) 60%);overflow:hidden;transition:transform .15s,border-color .2s}
.pb-card:hover{transform:translateY(-1px);border-color:var(--c)}
.pb-card.full{border-color:color-mix(in srgb,#f2c060 70%,transparent);box-shadow:0 0 0 1px rgba(242,192,96,.25),0 6px 22px rgba(242,192,96,.12)}
.pb-no{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-family:'Shippori Mincho B1',serif;font-size:19px;font-weight:700;color:#0b0f16;background:linear-gradient(140deg,var(--c),var(--c2));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.pb-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pb-tx b{font-size:14px}.pb-tx small{font-size:11.5px;color:var(--muted)}
.pb-prog{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace}
.pb-bar{flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;display:block;min-width:40px}
.pb-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--c2),var(--c));transition:width .5s}
.pb-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pb-medals{display:flex;gap:3px;align-items:center}
.pb-pip{width:9px;height:9px;border-radius:50%;border:1px solid color-mix(in srgb,var(--c) 45%,transparent);display:inline-block}
.pb-pip.part{background:color-mix(in srgb,var(--c) 35%,transparent)}
.pb-medals .pb-medal{width:15px;height:15px}
.pb-st{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#f2d07a;font-family:'JetBrains Mono',monospace}
.pb-st .pb-star{width:12px;height:12px}
.pb-st.big{font-size:18px;font-weight:700}.pb-st.big small{font-size:12px;color:var(--muted);font-weight:400}.pb-st.big .pb-star{width:18px;height:18px}
.pb-full{position:absolute;top:8px;right:10px;display:flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#f2c060;letter-spacing:.06em}
.pb-crown{width:14px;height:14px;fill:#f2c060}
.pb-star{width:12px;height:12px;fill:rgba(255,255,255,.14)}.pb-star.on{fill:#f2c94c;filter:drop-shadow(0 0 3px rgba(242,201,76,.5))}
.pb-lock{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2}
.pb-medal{width:22px;height:22px}.pb-medal circle{stroke:rgba(0,0,0,.35);stroke-width:1}.pb-medal .rb{fill:#c0504d}.pb-medal .st{fill:rgba(255,255,255,.75)}
.pb-medal.m1 circle{fill:#c8834a}.pb-medal.m2 circle{fill:#c9d2dc}.pb-medal.m3 circle{fill:#f2c060}.pb-medal.m3{filter:drop-shadow(0 0 4px rgba(242,192,96,.6))}
.pb-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.pb-ring{--p:0;flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-content:center;text-align:center;line-height:1;
  background:radial-gradient(closest-side,#101824 78%,transparent 80%),conic-gradient(#f2c060 calc(var(--p)*360deg),rgba(255,255,255,.08) 0)}
.pb-ring b{font-size:17px;font-family:'JetBrains Mono',monospace}.pb-ring small{font-size:10px;color:var(--muted)}
.pb-hs{flex:1;display:flex;flex-direction:column;gap:2px}.pb-hs > small{font-size:11px;color:var(--dim)}
.pb-cont{flex:none;padding:10px 16px;border-radius:12px;font-weight:700;font-size:13px;color:#14100a;background:linear-gradient(180deg,#e9cf8e,#c9a961);box-shadow:0 4px 14px rgba(201,169,97,.25)}
.pb-cont b{font-family:'JetBrains Mono',monospace}
.pb-alldone{display:flex;align-items:center;gap:4px;color:#f2c060;font-weight:700;font-size:13px}
.pb-stage{border:1px solid color-mix(in srgb,var(--c) 28%,var(--line));border-radius:14px;padding:10px 12px 12px;margin-bottom:10px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--c2) 22%,transparent),rgba(0,0,0,.15))}
.pb-stage.cleared{border-color:color-mix(in srgb,var(--c) 60%,transparent)}
.pb-stage header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px}
.pb-sn{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--c)}
.pb-tier{font-size:12px;padding:1px 9px;border-radius:999px;color:#0b0f16;background:var(--c);font-weight:700}
.pb-sp{flex:1;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;min-width:120px;max-width:260px}
.pb-md{display:flex}
.pb-lk{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
.pb-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
@media (min-width:700px){.pb-tiles{grid-template-columns:repeat(10,1fr)}}
.pb-tile{position:relative;aspect-ratio:1/0.82;border-radius:10px;border:1px solid color-mix(in srgb,var(--c) 30%,var(--line));background:rgba(0,0,0,.25);color:var(--text);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:transform .12s,border-color .2s,background .2s}
.pb-tile .n{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:600}
.pb-tile:hover{transform:translateY(-2px);border-color:var(--c)}
.pb-tile.done{background:linear-gradient(160deg,color-mix(in srgb,var(--c) 42%,transparent),color-mix(in srgb,var(--c2) 55%,transparent));border-color:color-mix(in srgb,var(--c) 70%,transparent)}
.pb-tile.done .n{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.pb-tile .s{display:flex;gap:1px}.pb-tile .s .pb-star{width:10px;height:10px}
.pb-tile .nx{font-size:9px;font-weight:700;letter-spacing:.1em;color:var(--c)}
.pb-tile.next{border-color:var(--c);box-shadow:0 0 0 1px var(--c);animation:pbPulse 1.6s ease-in-out infinite}
.pb-tile.cur{outline:2px solid #fff;outline-offset:1px}
.pb-tile.lk{opacity:.38;cursor:not-allowed}.pb-tile.lk:hover{transform:none}
@keyframes pbPulse{0%,100%{box-shadow:0 0 0 1px var(--c),0 0 0 0 color-mix(in srgb,var(--c) 50%,transparent)}50%{box-shadow:0 0 0 1px var(--c),0 0 0 6px transparent}}
.pb-sv{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.pb-sv-st{display:flex;gap:2px}.pb-sv-st .pb-star{width:22px;height:22px;animation:pbPop .45s cubic-bezier(.2,1.6,.4,1) both}
.pb-sv-st .pb-star:nth-child(2){animation-delay:.12s}.pb-sv-st .pb-star:nth-child(3){animation-delay:.24s}
@keyframes pbPop{0%{transform:scale(0) rotate(-90deg)}100%{transform:none}}
.pb-sv-tx{flex:1;display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);min-width:160px}
.pb-ev{display:flex;align-items:center;gap:6px;width:100%;font-weight:700;font-size:13px;color:#f2d07a;animation:pbPop .5s .3s both}
.pb-ev.un{color:#9fe0ff}.pb-ev.cp{color:#f2c060}
.pb-ev .pb-medal{width:26px;height:26px}
/* collection home (v3) */
.pbh{display:flex;flex-direction:column;gap:12px;--pbh-tint:rgba(201,169,97,.32)}
.pbh-hero{position:relative;display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:18px;overflow:hidden;
  border:1px solid rgba(201,169,97,.32);background:radial-gradient(120% 140% at 0% 0%,var(--pbh-tint),transparent 60%),linear-gradient(120deg,rgba(201,169,97,.16),rgba(0,0,0,.25) 70%)}
.pbh-hero::after{content:"";position:absolute;inset:auto -40px -60px auto;width:220px;height:220px;border-radius:50%;opacity:.1;pointer-events:none;
  background:repeating-conic-gradient(from 45deg,#fff 0 25%,transparent 0 50%) 0 0/44px 44px;-webkit-mask:radial-gradient(closest-side,#000 40%,transparent);mask:radial-gradient(closest-side,#000 40%,transparent)}
.pbh-hero .pb-ring{width:84px;height:84px;background:radial-gradient(closest-side,color-mix(in srgb,var(--panel,#101824) 70%,#000) 79%,transparent 81%),conic-gradient(#f2c060 calc(var(--p)*360deg),rgba(255,255,255,.09) 0)}
.pbh-hero .pb-ring b{font-size:22px}.pbh-hero .pb-ring small{font-size:11px}
.pbh-hs{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;z-index:1}
.pbh-title{font-family:'Shippori Mincho B1',serif;font-size:22px;letter-spacing:.1em;color:var(--text)}
.pbh-title small{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.04em;color:var(--brass);margin-inline-start:8px;padding:2px 8px;border-radius:999px;border:1px solid rgba(201,169,97,.4);vertical-align:3px;white-space:nowrap}
.pbh-lead{font-size:12px;color:var(--muted);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pbh-stats{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted)}
.pbh-stats .pb-st{font-size:14px;font-weight:700}.pbh-stats .pb-st .pb-star{width:15px;height:15px}.pbh-stats .pb-st small{color:var(--muted);font-weight:400}
.pbh-md{display:inline-flex;align-items:center;gap:3px}.pbh-md .pb-medal{width:17px;height:17px}
.pbh-hero .pb-cont{z-index:1;max-width:220px;text-align:center;line-height:1.35}
.pbh-hero .pb-cont small{display:block;font-weight:500;font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbh-hero .pb-alldone{z-index:1}
.pbh-dailies{display:grid;gap:10px;grid-template-columns:minmax(0,1fr)}
.pbh-daily{display:flex;align-items:center;gap:14px;width:100%;min-width:0;text-align:start;padding:10px 14px 10px 10px;border-radius:14px;color:var(--text);
  border:1px solid rgba(242,192,96,.45);background:linear-gradient(110deg,rgba(242,192,96,.18),rgba(0,0,0,.2) 55%);transition:transform .15s,border-color .2s}
.pbh-daily:hover{transform:translateY(-1px);border-color:#f2c060}
.pbh-daily .th{flex:none;width:62px;display:grid;place-items:center}.pbh-daily .th > svg{display:block;width:100%;height:auto;max-height:66px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.pbh-daily .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pbh-daily .tx b{font-size:15px}.pbh-daily .tx b span{color:var(--dim);font-weight:400;font-family:'JetBrains Mono',monospace;font-size:12px;margin-inline-start:6px}
.pbh-daily .tx small{font-size:12px;color:var(--muted)}
.pbh-daily .go{flex:none;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;color:#14100a;background:linear-gradient(180deg,#f4d98f,#d4a84a)}
.pbh-daily .go.ok{color:#8fe3b8;background:rgba(111,211,160,.12);border:1px solid rgba(111,211,160,.4)}
.pbh-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin:2px 0 0;overflow-x:auto;scrollbar-width:none}
.pbh-tabs::-webkit-scrollbar{display:none}
.pbh-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 8px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--muted);font-size:13px;min-width:0;transition:border-color .2s,color .2s;-webkit-tap-highlight-color:transparent}
.pbh-tabs button .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbh-tabs button .ic{flex:none;width:26px;height:26px;display:grid;place-items:center;padding:3px;color:var(--brass)}
.pbh-tabs button .ic svg, .pbh-ic svg, .pbh-ghead .ic svg{display:block;width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pbh-tabs button .ct{flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)}.pbh-tabs button .ct.ok{color:#8fe3b8}
.pbh-tabs button:hover{border-color:var(--brass2);color:var(--text)}
.pbh-tabs button.sel{color:var(--text);border-color:var(--brass);background:linear-gradient(180deg,rgba(201,169,97,.2),rgba(201,169,97,.06));box-shadow:inset 0 -2px 0 var(--brass)}
.pbh-cat{font-size:12px;color:var(--muted);line-height:1.6;margin:-2px 2px 0}
.pbh-cards{display:grid;gap:10px;grid-template-columns:minmax(0,1fr);align-content:start}
.pbh-card{position:relative;display:flex;gap:12px;align-items:stretch;text-align:start;width:100%;min-width:0;padding:10px 12px 10px 10px;border-radius:15px;color:var(--text);overflow:hidden;
  border:1px solid color-mix(in srgb,var(--c) 32%,var(--line));background:linear-gradient(125deg,color-mix(in srgb,var(--c2) 34%,transparent),rgba(0,0,0,.24) 62%);transition:transform .15s,border-color .2s,box-shadow .2s}
.pbh-card:hover{transform:translateY(-2px);border-color:var(--c);box-shadow:0 8px 22px rgba(0,0,0,.3)}
.pbh-card.full{border-color:rgba(242,192,96,.7);box-shadow:0 0 0 1px rgba(242,192,96,.25),0 6px 22px rgba(242,192,96,.12)}
.pbh-th{flex:none;width:84px;align-self:center;display:flex;justify-content:center}
.pbh-bd{position:relative;display:block;width:100%}
.pbh-bd > svg{display:block;width:100%;height:auto;max-height:96px;border-radius:7px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
.pbh-ic{position:absolute;inset:auto -6px -6px auto;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;padding:5px;color:#0b0f16;
  background:linear-gradient(140deg,var(--c),var(--c2));box-shadow:0 2px 6px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.35)}
.pbh-ic:empty{display:none}
.pbh-ic .gl, .pbh-ghead .ic .gl{font-family:'Shippori Mincho B1',serif;font-weight:700;font-size:15px;line-height:1;white-space:nowrap}
.pbh-tm{position:absolute;top:-4px;inset-inline-start:-4px;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#0d0d0d 70%);box-shadow:0 0 0 2px rgba(10,14,12,.85),0 2px 4px rgba(0,0,0,.5)}
.pbh-tm.w{background:radial-gradient(circle at 35% 30%,#fff,#d8d4c8 70%)}
.pbh-tm.x{width:auto;height:auto;background:none;box-shadow:none;display:flex}.pbh-tm.x > svg{width:18px;height:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
.pbh-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.pbh-top{display:flex;align-items:center;gap:8px;min-width:0}
.pbh-nm{font-size:15px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbh-diff{margin-inline-start:auto;flex:none;display:inline-flex;align-items:center;gap:2px}
.pbh-diff i{width:6px;height:11px;border-radius:2px;background:rgba(255,255,255,.12)}.pbh-diff i.on{background:var(--c)}
.pbh-desc{font-size:12px;color:var(--muted);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pbh-prog{display:flex;align-items:center;gap:8px;margin-top:auto;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace}
.pbh-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pbh-meta .pb-medals{flex-wrap:wrap}.pbh-meta .pb-medals .pb-medal{width:14px;height:14px}.pbh-meta .pb-pip{width:8px;height:8px}
.pbh-card .pb-full{top:7px;inset-inline-end:10px;right:auto}
.pbh-card.full .pbh-diff{visibility:hidden}
.pbh-ghead{display:flex;align-items:center;gap:14px;margin:0 0 14px}
.pbh-ghead .ic{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;padding:9px;color:#0b0f16;background:linear-gradient(140deg,var(--c),var(--c2));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.pbh-ghead .ic .gl{font-size:22px}
.pbh-ghead .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pbh-ghead h2{margin:0;font-size:20px}
.pbh-ghead small{font-size:12px;color:var(--muted);line-height:1.55}
.pbh-ghead .chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.pbh-ghead .chips .pbh-diff{margin-inline-start:4px}
.pbh-chip{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--c) 50%,transparent);color:var(--c)}
html[lang=ar] .pbh, html[lang=ar] .pbh-ghead{direction:rtl}
html[lang=ar] .pbh :is(.pb-ring, .pbh-prog, .pbh-stats .pb-st, .pbh-tabs .ct, .pbh-bd){direction:ltr;unicode-bidi:isolate}
@media (max-width:560px){
  .pbh-hero{padding:12px;gap:10px 12px;flex-wrap:wrap}.pbh-hero .pb-ring{width:66px;height:66px}.pbh-hero .pb-ring b{font-size:18px}
  .pbh-title{font-size:19px}.pbh-lead{display:none}.pbh-hs{flex:1 1 calc(100% - 82px)}
  .pbh-hero .pb-cont{flex:1 1 100%;max-width:none;padding:9px 12px}
  .pbh-tabs{grid-auto-columns:minmax(64px,1fr)}
  .pbh-tabs button{flex-direction:column;gap:2px;padding:7px 4px;font-size:11.5px}
  .pbh-tabs button .nm{max-width:100%}
  .pbh-th{width:72px}.pbh-nm{font-size:14px}
}
@media (min-width:640px){ .pbh-cards{grid-template-columns:repeat(2,minmax(0,1fr))} .pbh-dailies:has(> :nth-child(2)){grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (min-width:900px) and (min-height:561px) and (pointer:fine){
  .pbh-cards{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pbh-card{flex-direction:column;align-items:stretch;padding:12px}
  .pbh-th{width:100%;padding:6px 0 4px;border-radius:10px;background:radial-gradient(closest-side,rgba(0,0,0,.28),transparent)}
  .pbh-bd{width:132px}
  .pbh-bd.tall{width:116px}
  .pbh-bd > svg{max-height:142px}
  .pbh-ic{width:34px;height:34px}
  .pbh-desc{min-height:3.1em}
}
`;
function injectCSS() { if (document.getElementById('pbCss')) return; const st = document.createElement('style'); st.id = 'pbCss'; st.textContent = CSS; document.head.appendChild(st); }
if (typeof document !== 'undefined') injectCSS();

window.PZBook = { STAGE, UNLOCK, TIERS, setLang(l) { L = S[l] ? l : 'en'; }, t: tx, stages, stageInfo, isOpen, nextIndex, starsFor, totals, events, card, grid, solved, STAR, MEDAL,
  home, bindHome, ghead, pips, diffOfTier, resume, lastGet, lastSet, icon, ICONS };
})();
