'use strict';
// Review "💡 tip" (common spec: analysis / review commentary): for a dubious move or a mistake, one concrete tip
// picked from what can be judged for sure from the position, the move played, the best move and the engine scores;
// otherwise a general tip. 本将棋 and 5五将棋 (same position interface), はさみ将棋 (captures by sandwiching).
// index.html rvExplainHtml() appends ShogiTip.html(...) to the explanation (PC review box and the review card).
(() => {
const TX = {
  ja: { missMate: '王手から順に、相手の玉を詰ませる手がないか探そう。', allowMate: '指す前に、相手の王手で自玉が詰まないか確かめよう。自玉の危険は早めに手当てを。', hang: '動かす前に、その升に相手の利きがないか確かめよう。', big: '飛車・角は狙われやすい駒。取られそうになっていないか毎手確かめよう。', missCap: '取れる駒がないか、毎手まず探そう。', attack: '相手の玉に迫れる手（王手など）がないか、先に考えよう。', guard: '玉の周りの金銀は、むやみに離さないようにしよう。', promo: '成れるときは、成らない理由がなければ成ろう。', genBad: '指す前に、相手の一番強い手（駒取り・王手）を考えよう。', genDub: '候補手を2〜3個くらべてから指そう。', hCap: 'はさめる相手の駒がないか、毎手まず探そう。', hHang: '動かした後に、相手にはさまれる駒ができないか確かめよう。', hGen: '相手が次にどこへ動いてはさめるかを考えよう。' },
  en: { missMate: 'Start with checks: look for a way to mate the enemy king.', allowMate: "Before moving, make sure the opponent's checks can't mate your king — deal with king danger early.", hang: "Before moving, check whether the opponent's pieces cover that square.", big: "Rooks and bishops are prime targets — check every move that they aren't about to be taken.", missCap: 'Every move, first look for pieces you can capture.', attack: 'Look first for moves that close in on the enemy king, such as checks.', guard: "Don't pull the golds and silvers away from your king without a reason.", promo: 'When you can promote, do it unless there is a reason not to.', genBad: "Before moving, think about the opponent's strongest reply (captures and checks).", genDub: 'Compare two or three candidate moves before you play.', hCap: 'Every move, first look for enemy pieces you can sandwich.', hHang: 'After your move, make sure none of your pieces can be sandwiched.', hGen: 'Think about where the opponent can move next to sandwich your pieces.' },
  zh: { missMate: '从将军开始，找找能否将死对方的玉。', allowMate: '走之前确认对方的将军不会将死自己的玉，自玉的危险要尽早处理。', hang: '走之前，先确认那一格有没有对方棋子的控制。', big: '飞车和角行容易成为目标，每步都要确认它们不会被吃。', missCap: '每步先找找有没有能吃的子。', attack: '先考虑能逼近对方玉的手（如将军）。', guard: '不要随意让金将、银将离开玉的身边。', promo: '能升变时，没有特别理由就升变。', genBad: '走之前，想一想对方最强的应手（吃子、将军）。', genDub: '先比较两三个候选手再走。', hCap: '每步先找找有没有能夹住的对方棋子。', hHang: '走完后，确认自己没有会被夹住的棋子。', hGen: '想一想对方下一步走到哪里能夹住你的棋子。' },
  ko: { missMate: '장군부터 차례로, 상대 왕을 외통으로 잡을 수 있는지 찾아보세요.', allowMate: '두기 전에 상대의 장군으로 내 왕이 외통이 되지 않는지 확인하세요. 왕의 위험은 일찍 대비하세요.', hang: '움직이기 전에 그 칸에 상대 말의 길이 닿는지 확인하세요.', big: '비차·각은 노려지기 쉬운 말입니다. 잡힐 것 같지 않은지 매 수 확인하세요.', missCap: '매 수마다 먼저 잡을 수 있는 말이 없는지 찾아보세요.', attack: '상대 왕에게 다가갈 수 있는 수(장군 등)를 먼저 생각하세요.', guard: '왕 주위의 금·은을 함부로 떼어 놓지 마세요.', promo: '승격할 수 있을 때는 특별한 이유가 없으면 승격하세요.', genBad: '두기 전에 상대의 가장 강한 수(말 잡기·장군)를 생각하세요.', genDub: '후보수 2~3개를 비교한 뒤에 두세요.', hCap: '매 수마다 먼저 끼워 잡을 수 있는 상대 말이 없는지 찾아보세요.', hHang: '움직인 뒤에 상대에게 끼워 잡힐 말이 생기지 않는지 확인하세요.', hGen: '상대가 다음에 어디로 움직여 끼워 잡을 수 있는지 생각하세요.' },
  es: { missMate: 'Empieza por los jaques: busca cómo dar mate al rey rival.', allowMate: 'Antes de mover, comprueba que los jaques del rival no den mate a tu rey; atiende pronto el peligro.', hang: 'Antes de mover, comprueba si las piezas rivales controlan esa casilla.', big: 'La torre y el alfil son blancos fáciles: comprueba en cada jugada que no estén a punto de caer.', missCap: 'En cada jugada, busca primero piezas que puedas capturar.', attack: 'Busca primero jugadas que acosen al rey rival, como los jaques.', guard: 'No alejes los generales de oro y plata de tu rey sin motivo.', promo: 'Si puedes promocionar, hazlo salvo que haya un motivo para no hacerlo.', genBad: 'Antes de mover, piensa en la mejor respuesta del rival (capturas y jaques).', genDub: 'Compara dos o tres jugadas candidatas antes de jugar.', hCap: 'En cada jugada, busca primero piezas rivales que puedas encerrar.', hHang: 'Tras mover, comprueba que ninguna de tus piezas pueda quedar encerrada.', hGen: 'Piensa adónde puede moverse el rival para encerrar tus piezas.' },
  fr: { missMate: 'Commencez par les échecs : cherchez à mater le roi adverse.', allowMate: "Avant de jouer, vérifiez que les échecs adverses ne matent pas votre roi ; traitez le danger tôt.", hang: 'Avant de jouer, vérifiez si les pièces adverses contrôlent cette case.', big: "La tour et le fou sont des cibles faciles : vérifiez à chaque coup qu'ils ne vont pas être pris.", missCap: 'À chaque coup, cherchez d’abord les pièces que vous pouvez prendre.', attack: 'Cherchez d’abord les coups qui menacent le roi adverse, comme les échecs.', guard: "N'éloignez pas sans raison les généraux d'or et d'argent de votre roi.", promo: "Quand vous pouvez promouvoir, faites-le sauf s'il y a une raison contraire.", genBad: 'Avant de jouer, pensez à la meilleure réponse adverse (prises et échecs).', genDub: 'Comparez deux ou trois coups candidats avant de jouer.', hCap: 'À chaque coup, cherchez d’abord les pièces adverses que vous pouvez prendre en tenaille.', hHang: 'Après votre coup, vérifiez qu’aucune de vos pièces ne peut être prise en tenaille.', hGen: 'Pensez à l’endroit où l’adversaire peut aller pour prendre vos pièces en tenaille.' },
  pt: { missMate: 'Comece pelos xeques: procure um jeito de dar mate no rei rival.', allowMate: 'Antes de jogar, confira se os xeques do rival não dão mate no seu rei; cuide do perigo cedo.', hang: 'Antes de mover, veja se as peças do rival controlam essa casa.', big: 'Torre e bispo são alvos fáceis: confira a cada lance se não estão para ser capturados.', missCap: 'A cada lance, procure primeiro peças que você pode capturar.', attack: 'Procure primeiro lances que pressionem o rei rival, como xeques.', guard: 'Não afaste sem motivo os generais de ouro e prata do seu rei.', promo: 'Quando puder promover, promova, a menos que haja um motivo para não fazê-lo.', genBad: 'Antes de jogar, pense na resposta mais forte do rival (capturas e xeques).', genDub: 'Compare dois ou três lances candidatos antes de jogar.', hCap: 'A cada lance, procure primeiro peças rivais que você pode cercar.', hHang: 'Depois de mover, confira se nenhuma peça sua pode ser cercada.', hGen: 'Pense para onde o rival pode ir para cercar suas peças.' },
  de: { missMate: 'Beginne mit Schachgeboten: Suche nach einem Matt gegen den gegnerischen König.', allowMate: 'Prüfe vor dem Zug, dass dich die gegnerischen Schachs nicht matt setzen – kümmere dich früh um deinen König.', hang: 'Prüfe vor dem Zug, ob gegnerische Steine dieses Feld beherrschen.', big: 'Turm und Läufer sind beliebte Ziele – prüfe jeden Zug, ob sie gleich geschlagen werden.', missCap: 'Suche in jedem Zug zuerst nach Steinen, die du schlagen kannst.', attack: 'Suche zuerst nach Zügen, die den gegnerischen König bedrängen, etwa Schachgebote.', guard: 'Ziehe Gold- und Silbergeneräle nicht ohne Grund von deinem König weg.', promo: 'Wenn du befördern kannst, tu es, solange nichts dagegen spricht.', genBad: 'Denke vor dem Zug an die stärkste Antwort des Gegners (Schlagen und Schach).', genDub: 'Vergleiche zwei oder drei Kandidatenzüge, bevor du ziehst.', hCap: 'Suche in jedem Zug zuerst nach gegnerischen Steinen, die du einklemmen kannst.', hHang: 'Prüfe nach deinem Zug, dass keiner deiner Steine eingeklemmt werden kann.', hGen: 'Überlege, wohin der Gegner ziehen kann, um deine Steine einzuklemmen.' },
  hi: { missMate: 'शह से शुरू करें: विरोधी राजा को मात देने का रास्ता खोजें।', allowMate: 'चाल से पहले जाँचें कि विरोधी के शह से आपके राजा को मात न हो — राजा का खतरा जल्दी सँभालें।', hang: 'चाल से पहले देखें कि उस खाने पर विरोधी मोहरों का नियंत्रण तो नहीं।', big: 'रूक और बिशप आसान निशाने हैं — हर चाल में देखें कि वे पकड़े जाने वाले तो नहीं।', missCap: 'हर चाल में पहले देखें कि कोई मोहरा पकड़ा जा सकता है या नहीं।', attack: 'पहले ऐसी चालें देखें जो विरोधी राजा पर दबाव डालें, जैसे शह।', guard: 'राजा के पास के सोने और चाँदी के सेनापतियों को बिना कारण दूर न करें।', promo: 'जब प्रमोट कर सकें, तो बिना ठोस कारण के उसे न छोड़ें।', genBad: 'चाल से पहले विरोधी के सबसे मज़बूत जवाब (मोहरा पकड़ना, शह) के बारे में सोचें।', genDub: 'चलने से पहले दो-तीन संभावित चालों की तुलना करें।', hCap: 'हर चाल में पहले देखें कि विरोधी का कोई मोहरा घेरकर पकड़ा जा सकता है या नहीं।', hHang: 'चाल के बाद देखें कि आपका कोई मोहरा घिरकर पकड़ा न जा सके।', hGen: 'सोचें कि विरोधी अगली चाल में कहाँ जाकर आपके मोहरे घेर सकता है।' },
  ar: { missMate: 'ابدأ بالكشّ: ابحث عن طريقة لإماتة ملك الخصم.', allowMate: 'قبل أن تلعب، تأكد أن كشّات الخصم لا تميت ملكك، وعالج الخطر على الملك مبكرًا.', hang: 'قبل التحريك، تحقق مما إذا كانت قطع الخصم تسيطر على ذلك المربع.', big: 'الرخ والفيل هدفان سهلان؛ تحقق في كل نقلة أنهما ليسا على وشك الأسر.', missCap: 'في كل نقلة، ابحث أولًا عن قطع يمكنك أسرها.', attack: 'ابحث أولًا عن نقلات تضيّق على ملك الخصم، مثل الكشّ.', guard: 'لا تُبعد القادة الذهبيين والفضيين عن ملكك بلا سبب.', promo: 'عندما تستطيع الترقية فرقِّ، ما لم يكن هناك سبب يمنع ذلك.', genBad: 'قبل أن تلعب، فكّر في أقوى رد للخصم (الأسر والكشّ).', genDub: 'قارن بين نقلتين أو ثلاث مرشحة قبل أن تلعب.', hCap: 'في كل نقلة، ابحث أولًا عن قطع للخصم يمكنك محاصرتها.', hHang: 'بعد نقلتك، تأكد أنه لا توجد قطعة لك يمكن محاصرتها.', hGen: 'فكّر إلى أين يمكن أن يتحرك الخصم ليحاصر قطعك.' },
};
for (const l in TX) { const o = I18N[l] || (I18N[l] = {}); for (const k in TX[l]) o['tip.' + k] = '💡 ' + TX[l][k]; }
try { const st = document.createElement('style'); st.textContent = '.rv-ex p.rv-tip{color:#e9dcb4;font-size:13px;margin-top:4px}'; document.head.appendChild(st); } catch (e) {}

const WIN = 30000 - 200;
const typeOf = p => p & 15, colorOf = p => p >> 4;
const KI = 7, GI = 4, KA = 5, HI = 6, UM = 13, RY = 14;
const BIG = [KA, HI, UM, RY];
const val = tp => (window.ShogiEngine ? ShogiEngine.VALUE[tp] : 0) || 0;
const from = m => m & 127, to = m => (m >> 7) & 127, drop = m => (m & 127) > 80;
const near = (s, t) => Math.abs(((s / 9) | 0) - ((t / 9) | 0)) <= 1 && Math.abs((s % 9) - (t % 9)) <= 1;
function newPos(v) {
  if (v && window.Variants) return Variants.pos(v);
  return new ShogiEngine.Position();
}
function checks(p, m) { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; }

// 本将棋 / 5五将棋. a, b: analysis before / after the move played ({s, bm, pv}); s = score for the side to move
function kindShogi(p, played, best, a, b, q) {
  const us = p.side, them = us ^ 1;
  if (a.s >= WIN && -b.s < WIN) return 'missMate';
  if (-b.s <= -WIN && a.s > -WIN) return 'allowMate';
  const m = p.fromUsi(played), bm = p.fromUsi(best), t0 = to(m);
  const capP = drop(m) ? 0 : p.board[t0];
  const moved = drop(m) ? (from(m) - 80) : typeOf(p.board[from(m)]);
  const reply = b.bm || (b.pv && b.pv[0]) || null;
  // the opponent's best reply after the move played
  p.doMove(m);
  let rk = '';
  try {
    if (reply) {
      const r = p.fromUsi(reply), rt = to(r);
      const cap = drop(r) ? 0 : p.board[rt];
      if (cap && colorOf(cap) === us) {
        const capT = typeOf(cap), by = typeOf(p.board[from(r)]);
        if (rt === t0) {
          // the piece just moved / dropped is taken for (almost) nothing
          const free = !p.attacked(t0, us);
          const gain = val(capT) - (capP ? val(typeOf(capP)) : 0);
          if (gain > 0 && (free || val(by) + (capP ? val(typeOf(capP)) : 0) < val(capT) * 0.8)) rk = 'hang';
        }
        if (!rk && BIG.includes(capT)) {
          // a rook / bishop is lost, and not after the best move
          let bigAfterBest = false;
          if (a.pv && a.pv[0] === best && a.pv[1]) {
            p.undoMove(); p.doMove(bm);
            try { const r2 = p.fromUsi(a.pv[1]), c2 = drop(r2) ? 0 : p.board[to(r2)]; bigAfterBest = !!(c2 && colorOf(c2) === us && BIG.includes(typeOf(c2))); } catch (e) { bigAfterBest = true; }
            p.undoMove(); p.doMove(m);
          } else bigAfterBest = true;
          if (!bigAfterBest) rk = 'big';
        }
      }
    }
  } finally { p.undoMove(); }
  if (rk) return rk;
  // the best move wins material (a capture that is not simply taken back)
  if (!drop(bm) && p.board[to(bm)]) {
    const v = val(typeOf(p.board[to(bm)])), mover = typeOf(p.board[from(bm)]), vp = capP ? val(typeOf(capP)) : 0;
    p.doMove(bm); const safe = !p.attacked(to(bm), them); p.undoMove();
    if (v > vp + 100 && (safe || v >= val(mover) + 150)) return 'missCap';
  }
  if (best === played + '+') return 'promo';
  const inChk = p.inCheck();
  if (!inChk && checks(p, bm) && !checks(p, m)) return 'attack';
  // a gold / silver next to the king walks away from it
  const k = p.king[us];
  if (!inChk && !drop(m) && !capP && k >= 0 && (moved === KI || moved === GI) && near(from(m), k) && !near(t0, k) && from(bm) !== from(m)) return 'guard';
  return q === 'bad' ? 'genBad' : 'genDub';
}
// はさみ将棋: captures by sandwiching (capCount), win by a 5-capture lead
function kindHasami(p, played, best, a, b, q) {
  if (a.s >= WIN && -b.s < WIN) return 'hCap';
  const cap = u => { const m = p.fromUsi(u); return p.capCount(from(m), to(m)); };
  const cb = cap(best), cp = cap(played);
  const reply = (u, r) => { if (!r) return 0; p.doMove(p.fromUsi(u)); let n = 0; try { n = cap(r); } catch (e) {} p.undoMove(); return n; };
  const hp = reply(played, b.bm || (b.pv && b.pv[0])), hb = a.pv && a.pv[0] === best ? reply(best, a.pv[1]) : 0;
  if (hp > hb && hp > 0) return 'hHang';
  if (-b.s <= -WIN && a.s > -WIN) return 'hHang';
  if (cb > cp) return 'hCap';
  return 'hGen';
}
// '' or '<p class="tip">💡 …</p>' for the move played from sfen (only for dubious moves and mistakes)
function html(sf, played, best, a, b, q) {
  if (q !== 'dubious' && q !== 'bad') return '';
  if (!a || !b || !played || !best || played === best) return '';
  let kind = '', v = '';
  try {
    v = window.Variants ? Variants.sfenVariant(sf) : '';
    const p = newPos(v); if (!p) return '';
    p.setSfen(sf);
    kind = v === 'hasami' ? kindHasami(p, played, best, a, b, q) : kindShogi(p, played, best, a, b, q);
  } catch (e) { kind = v === 'hasami' ? 'hGen' : q === 'bad' ? 'genBad' : 'genDub'; }
  return kind ? `<p class="rv-tip">${t('tip.' + kind)}</p>` : '';
}
window.ShogiTip = { html };
})();
