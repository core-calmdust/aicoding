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
`;
function injectCSS() { if (document.getElementById('pbCss')) return; const st = document.createElement('style'); st.id = 'pbCss'; st.textContent = CSS; document.head.appendChild(st); }
if (typeof document !== 'undefined') injectCSS();

window.PZBook = { STAGE, UNLOCK, TIERS, setLang(l) { L = S[l] ? l : 'en'; }, t: tx, stages, stageInfo, isOpen, nextIndex, starsFor, totals, events, card, grid, solved, STAR, MEDAL };
})();
