'use strict';
// Review "💡 tip" (common spec: analysis / review commentary): for a dubious move or a mistake, one concrete tip
// picked from what can be judged for sure (engine values of every move, legal moves, attacked squares); otherwise
// a general tip. app.js rvExplainHtml() appends ChessTip.html(...) (PC review box and the review card).
(() => {
const TX = {
  ja: { missMate: 'メイトにできる局面でした。相手キングの逃げ道をなくす手を探そう。', allowMate: '指す前に、相手のチェックで自分のキングがメイトされないか確かめよう。', hang: '動かす前に、その駒が取られないか（守りがあるか）確かめよう。', loose: '守りのない駒や、狙われている駒がないか毎手確かめよう。', fork: '2つの駒を同時に狙われる「フォーク（両取り）」に注意しよう。', missCap: '相手の守られていない駒がないか、毎手まず探そう。', castle: '序盤は早めにキャスリングして、キングを安全な場所へ。', shield: 'キャスリングしたキングの前のポーンは、むやみに動かさないようにしよう。', endKing: '終盤はキングも大切な戦力。中央へ出して働かせよう。', genBad: '指す前に、相手のチェック・駒取り・狙いを確かめよう。', genDub: '候補手を2〜3個くらべてから指そう。' },
  en: { missMate: "There was a forced mate — look for moves that take away the enemy king's escape squares.", allowMate: "Before moving, make sure the opponent's checks can't mate your king.", hang: 'Before moving, check whether the piece can be taken (is it defended?).', loose: 'Every move, look for undefended or attacked pieces of yours.', fork: 'Watch out for forks — one piece attacking two of yours at once.', missCap: "Every move, first look for the opponent's undefended pieces.", castle: 'Castle early in the opening to get your king to safety.', shield: "Don't push the pawns in front of your castled king without a reason.", endKing: 'In the endgame the king is a strong piece — bring it to the centre.', genBad: "Before moving, check the opponent's checks, captures and threats.", genDub: 'Compare two or three candidate moves before you play.' },
  zh: { missMate: '这里可以将杀。找找封住对方王退路的着法。', allowMate: '走之前，确认对方的将军不会将杀自己的王。', hang: '走之前，确认这个子会不会被吃（有没有保护）。', loose: '每步都要检查自己有没有无保护或被攻击的子。', fork: '小心“双重攻击（捉双）”——一个子同时攻击你的两个子。', missCap: '每步先找找对方有没有无保护的子。', castle: '开局尽早易位，让王到安全的地方。', shield: '不要随意挺进已易位的王前面的兵。', endKing: '残局中王也是重要的战力，把它走到中心去。', genBad: '走之前，先确认对方的将军、吃子和威胁。', genDub: '先比较两三个候选着法再走。' },
  ko: { missMate: '메이트할 수 있는 국면이었습니다. 상대 킹의 도망칠 칸을 없애는 수를 찾아보세요.', allowMate: '두기 전에 상대의 체크로 내 킹이 메이트되지 않는지 확인하세요.', hang: '움직이기 전에 그 기물이 잡히지 않는지(보호받는지) 확인하세요.', loose: '보호받지 못하거나 공격받는 내 기물이 없는지 매 수 확인하세요.', fork: '한 기물이 두 기물을 동시에 노리는 "포크(양걸이)"에 주의하세요.', missCap: '매 수마다 먼저 보호받지 못하는 상대 기물을 찾아보세요.', castle: '오프닝에서는 일찍 캐슬링해서 킹을 안전한 곳으로 옮기세요.', shield: '캐슬링한 킹 앞의 폰은 함부로 움직이지 마세요.', endKing: '엔드게임에서는 킹도 중요한 전력입니다. 중앙으로 내보내 활용하세요.', genBad: '두기 전에 상대의 체크·기물 잡기·위협을 확인하세요.', genDub: '후보수 2~3개를 비교한 뒤에 두세요.' },
  es: { missMate: 'Había un mate forzado: busca jugadas que quiten las casillas de escape al rey rival.', allowMate: 'Antes de mover, comprueba que los jaques del rival no den mate a tu rey.', hang: 'Antes de mover, comprueba si la pieza puede ser capturada (¿está defendida?).', loose: 'En cada jugada, busca piezas tuyas sin defensa o atacadas.', fork: 'Cuidado con las horquillas: una pieza que ataca a dos tuyas a la vez.', missCap: 'En cada jugada, busca primero piezas rivales sin defensa.', castle: 'Enroca pronto en la apertura para poner tu rey a salvo.', shield: 'No adelantes sin motivo los peones delante de tu rey enrocado.', endKing: 'En el final el rey es una pieza fuerte: llévalo al centro.', genBad: 'Antes de mover, revisa los jaques, capturas y amenazas del rival.', genDub: 'Compara dos o tres jugadas candidatas antes de jugar.' },
  fr: { missMate: 'Il y avait un mat forcé : cherchez les coups qui ôtent ses cases de fuite au roi adverse.', allowMate: 'Avant de jouer, vérifiez que les échecs adverses ne matent pas votre roi.', hang: 'Avant de jouer, vérifiez si la pièce peut être prise (est-elle défendue ?).', loose: 'À chaque coup, cherchez vos pièces non défendues ou attaquées.', fork: 'Attention aux fourchettes : une pièce qui en attaque deux des vôtres à la fois.', missCap: 'À chaque coup, cherchez d’abord les pièces adverses non défendues.', castle: 'Roquez tôt dans l’ouverture pour mettre votre roi à l’abri.', shield: 'N’avancez pas sans raison les pions devant votre roi roqué.', endKing: 'En finale, le roi est une pièce forte : amenez-le au centre.', genBad: 'Avant de jouer, vérifiez les échecs, prises et menaces adverses.', genDub: 'Comparez deux ou trois coups candidats avant de jouer.' },
  pt: { missMate: 'Havia um mate forçado: procure lances que tirem as casas de fuga do rei rival.', allowMate: 'Antes de jogar, confira se os xeques do rival não dão mate no seu rei.', hang: 'Antes de mover, veja se a peça pode ser capturada (está defendida?).', loose: 'A cada lance, procure peças suas sem defesa ou atacadas.', fork: 'Cuidado com garfos: uma peça atacando duas das suas ao mesmo tempo.', missCap: 'A cada lance, procure primeiro peças do rival sem defesa.', castle: 'Roque cedo na abertura para deixar seu rei em segurança.', shield: 'Não avance sem motivo os peões na frente do seu rei rocado.', endKing: 'No final, o rei é uma peça forte: leve-o para o centro.', genBad: 'Antes de jogar, confira os xeques, capturas e ameaças do rival.', genDub: 'Compare dois ou três lances candidatos antes de jogar.' },
  de: { missMate: 'Hier gab es ein forciertes Matt – suche Züge, die dem gegnerischen König die Fluchtfelder nehmen.', allowMate: 'Prüfe vor dem Zug, dass dich die gegnerischen Schachs nicht matt setzen.', hang: 'Prüfe vor dem Zug, ob die Figur geschlagen werden kann (ist sie gedeckt?).', loose: 'Suche in jedem Zug nach ungedeckten oder angegriffenen eigenen Figuren.', fork: 'Achte auf Gabeln – eine Figur greift zwei deiner Figuren zugleich an.', missCap: 'Suche in jedem Zug zuerst nach ungedeckten gegnerischen Figuren.', castle: 'Rochiere in der Eröffnung früh, um deinen König in Sicherheit zu bringen.', shield: 'Ziehe die Bauern vor deinem rochierten König nicht ohne Grund.', endKing: 'Im Endspiel ist der König eine starke Figur – bring ihn ins Zentrum.', genBad: 'Prüfe vor dem Zug die Schachs, Schlagzüge und Drohungen des Gegners.', genDub: 'Vergleiche zwei oder drei Kandidatenzüge, bevor du ziehst.' },
  hi: { missMate: 'यहाँ ज़बरदस्ती मात थी — ऐसी चालें खोजें जो विरोधी राजा के भागने के खाने छीन लें।', allowMate: 'चाल से पहले जाँचें कि विरोधी के शह से आपके राजा को मात न हो।', hang: 'चाल से पहले देखें कि मोहरा पकड़ा तो नहीं जा सकता (क्या वह सुरक्षित है?)।', loose: 'हर चाल में देखें कि आपका कोई मोहरा असुरक्षित या हमले में तो नहीं।', fork: 'फ़ोर्क से सावधान — एक मोहरा एक साथ आपके दो मोहरों पर हमला करे।', missCap: 'हर चाल में पहले विरोधी के असुरक्षित मोहरे खोजें।', castle: 'ओपनिंग में जल्दी कैसलिंग करके राजा को सुरक्षित करें।', shield: 'कैसल किए राजा के सामने के प्यादों को बिना कारण आगे न बढ़ाएँ।', endKing: 'एंडगेम में राजा भी ताकतवर मोहरा है — उसे केंद्र में लाएँ।', genBad: 'चाल से पहले विरोधी के शह, मोहरा पकड़ने और खतरों को जाँचें।', genDub: 'चलने से पहले दो-तीन संभावित चालों की तुलना करें।' },
  ar: { missMate: 'كان هناك مات إجباري؛ ابحث عن نقلات تسدّ مربعات هروب ملك الخصم.', allowMate: 'قبل أن تلعب، تأكد أن كشّات الخصم لا تميت ملكك.', hang: 'قبل التحريك، تحقق مما إذا كان يمكن أسر القطعة (هل هي محمية؟).', loose: 'في كل نقلة، ابحث عن قطعك غير المحمية أو المهدَّدة.', fork: 'احذر الشوكة: قطعة واحدة تهاجم قطعتين لك في وقت واحد.', missCap: 'في كل نقلة، ابحث أولًا عن قطع الخصم غير المحمية.', castle: 'بيّت مبكرًا في الافتتاح لتضع ملكك في أمان.', shield: 'لا تدفع البيادق أمام ملكك المبيَّت بلا سبب.', endKing: 'في النهاية الملك قطعة قوية، فأحضره إلى المركز.', genBad: 'قبل أن تلعب، تحقق من كشّات الخصم وأسره وتهديداته.', genDub: 'قارن بين نقلتين أو ثلاث مرشحة قبل أن تلعب.' },
};
for (const l in TX) { const o = I18N[l] || (I18N[l] = {}); for (const k in TX[l]) o['tip.' + k] = '💡 ' + TX[l][k]; }
try { const st = document.createElement('style'); st.textContent = '.rv-ex p.rv-tip{color:#e9dcb4;font-size:13px;margin-top:4px}'; document.head.appendChild(st); } catch (e) {}

const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, MATET = 29000;
const VAL = [0, 100, 320, 330, 500, 900, 20000];
const KN = [33, 31, 18, 14, -14, -18, -31, -33], KG = [1, -1, 16, -16, 17, 15, -15, -17], DB = [17, 15, -15, -17], DR = [16, -16, 1, -1];
const fr = m => m & 127, to = m => (m >> 7) & 127;
const colOf = p => (p & 8) ? 1 : 0, typ = p => p & 7;
const top = L => { let b = null; for (const e of L || []) if (!b || e.v > b.v) b = e; return b; };
// squares attacked by the piece on s
function attacksFrom(pos, s) {
  const b = pos.b, p = b[s], t = typ(p), c = colOf(p), out = [];
  const add = x => { if ((x & 0x88) === 0) out.push(x); };
  if (t === P) { const d = c ? -16 : 16; add(s + d - 1); add(s + d + 1); }
  else if (t === N) KN.forEach(d => add(s + d));
  else if (t === K) KG.forEach(d => add(s + d));
  else {
    const dirs = t === B ? DB : t === R ? DR : DB.concat(DR);
    for (const d of dirs) { let x = s + d; while ((x & 0x88) === 0) { out.push(x); if (b[x]) break; x += d; } }
  }
  return out;
}
// value lost when the opponent captures on sq (by piece `by`), with what we keep in mind: undefended or cheaper attacker
const wins = (pos, sq, byT, us) => { const v = VAL[typ(pos.b[sq])]; return !pos.attacked(sq, us) ? v : v - VAL[byT]; };

function kind(pos0, m, L, L2, q) {
  const best = top(L), mine = (L || []).find(e => e.m === m); if (!best || !mine) return '';
  if (best.v > MATET && mine.v <= MATET) return 'missMate';
  if (mine.v < -MATET && best.v >= -MATET) return 'allowMate';
  const pos = pos0.clone(), us = pos.side, them = us ^ 1, bm = best.m;
  const f = fr(m), t0 = to(m), mt = typ(pos.b[f]), capT = pos.b[t0] ? typ(pos.b[t0]) : 0;
  const inChk = pos.inCheck();
  const rep = top(L2);   // opponent's best reply after the move played
  if (rep && pos.make(m)) {
    let k = '';
    const rf = fr(rep.m), rt = to(rep.m), rp = pos.b[rf], cap = pos.b[rt];
    if (rp && colOf(rp) === them) {
      if (cap && colOf(cap) === us && typ(cap) !== K) {
        const g = wins(pos, rt, typ(rp), us);
        if (rt === t0 && VAL[mt] > VAL[capT] && g - VAL[capT] >= 150) k = 'hang';
        else if (rt !== t0 && g >= 200 && typ(cap) !== P) k = 'loose';
      }
      if (!k && !cap && pos.make(rep.m)) {
        // fork: after the reply, the moved piece attacks two of ours that it wins (king, more valuable, or undefended)
        const ft = typ(pos.b[rt]); let n = 0;
        for (const s of attacksFrom(pos, rt)) {
          const x = pos.b[s]; if (!x || colOf(x) !== us) continue;
          const xt = typ(x);
          if (xt === K) n++; else if (xt !== P && (VAL[xt] > VAL[ft] + 50 || !pos.attacked(s, us))) n++;
        }
        const safe = !pos.attacked(rt, us) || ft === P || (ft !== Q && pos.attacked(rt, them));   // we cannot just take the forker
        if (n >= 2 && safe) k = 'fork';
        pos.unmake(rep.m);
      }
    }
    pos.unmake(m);
    if (k) return k;
  }
  // the best move wins material
  const bc = pos.b[to(bm)];
  if (bc && colOf(bc) === them) {
    const v = VAL[typ(bc)], bmt = typ(pos.b[fr(bm)]);
    if (pos.make(bm)) { const safe = !pos.attacked(to(bm), them); pos.unmake(bm); if (v - VAL[capT] >= 200 && (safe || v >= VAL[bmt] + 150)) return 'missCap'; }
  }
  // king safety / activity
  let np = 0, queens = 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const x = pos.b[s]; if (!x) continue; const xt = typ(x); if (xt === Q) queens++; if (xt !== P && xt !== K) np += VAL[xt]; }
  const isCastle = mt === K && Math.abs(t0 - f) === 2;
  if (!inChk && mt === K && !isCastle && (pos.castle & (us ? 12 : 3)) && pos.full <= 20 && np >= 4000 && typ(pos.b[fr(bm)]) !== K) return 'castle';
  const ks = pos.ksq[us], home = us ? 7 : 0, kf = ks & 7, kr = ks >> 4;
  if (!inChk && mt === P && !capT && kr === home && (kf >= 6 || kf <= 2) && (pos.castle & (us ? 12 : 3)) === 0) {
    const pf = f & 7, pr = f >> 4, side = kf >= 6 ? pf >= 5 : pf <= 2;
    if (side && pr === (us ? 6 : 1) && fr(bm) !== f && np >= 2500) return 'shield';
  }
  if (!inChk && !queens && np <= 2600 && typ(pos.b[fr(bm)]) === K && mt !== K) return 'endKing';
  return q === 'bad' ? 'genBad' : 'genDub';
}
// '' or '<p class="tip">💡 …</p>'. pos: position before the move m; L / L2: engine values of every move here / after m
function html(pos, m, L, L2, q) {
  if (q !== 'dubious' && q !== 'bad') return '';
  let k = '';
  try { k = kind(pos, m, L, L2, q); } catch (e) { k = q === 'bad' ? 'genBad' : 'genDub'; }
  return k ? `<p class="rv-tip">${t('tip.' + k)}</p>` : '';
}
window.ChessTip = { html };
})();
