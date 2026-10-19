// "First time?" banner at the top of the new-game dialog, offering the illustrated rules (same idea as Dots & Boxes).
// Usage: RulesOffer.init({ game: 'chess', lang: () => LANG, open: () => openRules(), watch: '#rulesOverlay' })
// The banner disappears once the player has opened the rules (remembered per game in localStorage).
(function () {
'use strict';
const T = {
  btn: { ja: 'ルールを見る', en: 'See the rules', zh: '查看规则', ko: '규칙 보기', es: 'Ver las reglas', fr: 'Voir les règles', pt: 'Ver as regras', de: 'Regeln ansehen', hi: 'नियम देखें', ar: 'عرض القواعد' },
  chess: { ja: 'はじめての方へ：駒の動き方からチェックメイトまで、図解のルール説明があります。', en: 'New to chess? Illustrated rules explain how the pieces move, all the way to checkmate.', zh: '初次玩？从棋子走法到将杀，都有图解规则说明。', ko: '처음이신가요? 기물 움직임부터 체크메이트까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: cómo se mueven las piezas, hasta el jaque mate.', fr: 'Première fois ? Des règles illustrées : la marche des pièces jusqu’au mat.', pt: 'Primeira vez? Regras ilustradas: como as peças se movem, até o xeque-mate.', de: 'Zum ersten Mal hier? Bebilderte Regeln: wie die Figuren ziehen, bis zum Schachmatt.', hi: 'पहली बार? मोहरों की चाल से लेकर शह-मात तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: كيف تتحرك القطع حتى كش مات.' },
  shogi: { ja: 'はじめての方へ：駒の動き・成り・持ち駒から勝ち負けまで、図解のルール説明があります。', en: 'New to shogi? Illustrated rules cover how pieces move, promotion, drops and how to win.', zh: '初次玩？从棋子走法、升变、打入到胜负，都有图解规则说明。', ko: '처음이신가요? 말의 움직임·승격·持ち駒(드롭)부터 승패까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: movimientos, promoción, piezas en mano y cómo ganar.', fr: 'Première fois ? Des règles illustrées : déplacements, promotion, parachutages et victoire.', pt: 'Primeira vez? Regras ilustradas: movimentos, promoção, peças na mão e como vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: Züge, Beförderung, Einsetzen und wie man gewinnt.', hi: 'पहली बार? मोहरों की चाल, प्रमोशन, ड्रॉप और जीत तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: حركة القطع والترقية والإسقاط وكيفية الفوز.' },
  gomoku: { ja: 'はじめての方へ：五目の並べ方から連珠の禁じ手まで、図解のルール説明があります。', en: 'New to the game? Illustrated rules explain five in a row and the renju forbidden moves.', zh: '初次玩？从五子连珠到连珠禁手，都有图解规则说明。', ko: '처음이신가요? 다섯 줄 만들기부터 렌주 금수까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: cinco en línea y las jugadas prohibidas del renju.', fr: 'Première fois ? Des règles illustrées : cinq alignés et les coups interdits du renju.', pt: 'Primeira vez? Regras ilustradas: cinco em linha e as jogadas proibidas do renju.', de: 'Zum ersten Mal hier? Bebilderte Regeln: fünf in einer Reihe und die Renju-Verbote.', hi: 'पहली बार? पाँच की कतार से लेकर रेंजू के वर्जित चालों तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: خمسة في صف والنقلات الممنوعة في الرنجو.' },
  mancala: { ja: 'はじめての方へ：種のまき方から勝ち負けまで、図解のルール説明があります。', en: 'New to mancala? Illustrated rules explain how to sow the seeds and how to win.', zh: '初次玩？从播种方法到胜负，都有图解规则说明。', ko: '처음이신가요? 씨앗 뿌리는 법부터 승패까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: cómo sembrar las semillas y cómo ganar.', fr: 'Première fois ? Des règles illustrées : comment semer les graines et gagner.', pt: 'Primeira vez? Regras ilustradas: como semear as sementes e como vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: wie man die Samen sät und gewinnt.', hi: 'पहली बार? बीज बोने से लेकर जीत तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: كيف تزرع البذور وكيف تفوز.' },
  morris: { ja: 'はじめての方へ：駒の置き方・ミルの作り方から勝ち負けまで、図解のルール説明があります。', en: 'New to the game? Illustrated rules explain placing pieces, making mills and how to win.', zh: '初次玩？从落子、成三到胜负，都有图解规则说明。', ko: '처음이신가요? 말 놓기·밀 만들기부터 승패까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: colocar fichas, formar molinos y cómo ganar.', fr: 'Première fois ? Des règles illustrées : poser les pions, former des moulins et gagner.', pt: 'Primeira vez? Regras ilustradas: colocar peças, formar moinhos e como vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: Steine setzen, Mühlen bilden und gewinnen.', hi: 'पहली बार? गोटियाँ रखने, मिल बनाने से लेकर जीत तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: وضع القطع وتكوين الطواحين وكيفية الفوز.' },
  reversi: { ja: 'はじめての方へ：石の置き方・はさんで返す決まりから勝ち負けまで、図解のルール説明があります。', en: 'New to reversi? Illustrated rules explain placing discs, flipping by sandwiching and how to win.', zh: '初次玩？从落子、夹住翻转到胜负，都有图解规则说明。', ko: '처음이신가요? 돌 놓기·끼워서 뒤집기부터 승패까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: colocar fichas, voltear encerrando y cómo ganar.', fr: 'Première fois ? Des règles illustrées : poser les pions, retourner en encadrant et gagner.', pt: 'Primeira vez? Regras ilustradas: colocar peças, virar cercando e como vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: Steine setzen, durch Einschließen umdrehen und gewinnen.', hi: 'पहली बार? गोटी रखने, घेरकर पलटने से लेकर जीत तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: وضع الأقراص وقلبها بالحصر وكيفية الفوز.' },
  connect4: { ja: 'はじめての方へ：コマの落とし方から4つ並べて勝つまで、図解のルール説明があります。', en: 'New to Connect Four? Illustrated rules explain dropping discs and lining up four to win.', zh: '初次玩？从投放棋子到连成四子获胜，都有图解规则说明。', ko: '처음이신가요? 말 떨어뜨리기부터 네 개를 이어 이기기까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: dejar caer fichas y alinear cuatro para ganar.', fr: 'Première fois ? Des règles illustrées : faire tomber les pions et en aligner quatre.', pt: 'Primeira vez? Regras ilustradas: soltar as peças e alinhar quatro para vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: Steine einwerfen und vier in eine Reihe bringen.', hi: 'पहली बार? गोटी गिराने से लेकर चार की कतार बनाकर जीतने तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: إسقاط الأقراص وصفّ أربعة للفوز.' },
  backgammon: { ja: 'はじめての方へ：サイコロでの進め方・ヒット・上がり方から勝ち負けまで、図解のルール説明があります。', en: 'New to backgammon? Illustrated rules explain moving with the dice, hitting, bearing off and winning.', zh: '初次玩？从掷骰移动、打子、移出到胜负，都有图解规则说明。', ko: '처음이신가요? 주사위로 움직이기·히트·베어오프부터 승패까지 그림으로 설명한 규칙이 있습니다.', es: '¿Primera vez? Reglas ilustradas: mover con los dados, golpear, sacar fichas y ganar.', fr: 'Première fois ? Des règles illustrées : avancer aux dés, frapper, sortir les pions et gagner.', pt: 'Primeira vez? Regras ilustradas: mover com os dados, acertar, retirar peças e vencer.', de: 'Zum ersten Mal hier? Bebilderte Regeln: mit den Würfeln ziehen, schlagen, auswürfeln und gewinnen.', hi: 'पहली बार? पासे से चलने, हिट करने, बेयर-ऑफ से लेकर जीत तक, चित्रों वाले नियम देखें।', ar: 'أول مرة؟ قواعد مصوَّرة: التحرك بالنرد والضرب وإخراج القطع والفوز.' },
};
const CSS = `.rules-offer{display:flex;align-items:center;gap:10px;margin:-6px 0 14px;padding:10px 12px;border-radius:12px;border:1px solid rgba(226,194,117,.5);background:linear-gradient(90deg,rgba(201,169,97,.16),rgba(0,0,0,.15));font-size:13px;line-height:1.5;color:var(--text,#eee)}
.rules-offer span{flex:1;min-width:0}
.rules-offer button{flex:none;padding:7px 12px;border-radius:9px;border:0;background:linear-gradient(180deg,#d8bb72,#a98a48);color:#1b150a;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit}
.rules-offer.hidden{display:none}
html[lang=ar] .rules-offer{direction:rtl;text-align:right}
#newOverlay .modal:has(> .rules-offer:not(.hidden)){overflow-y:auto;--ngh:840px}`;
function init(o) {
  const key = 'aicoding-' + o.game + '-rules-seen';
  const seen = () => { try { return !!localStorage.getItem(key); } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(key, '1'); } catch (e) {} sync(); };
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const h2 = document.querySelector('#newOverlay .modal > h2'); if (!h2) return;
  const box = document.createElement('div'); box.className = 'rules-offer hidden'; box.innerHTML = '<span></span><button type="button"></button>';
  h2.after(box);
  const L = () => { const l = o.lang ? o.lang() : 'ja'; return l; };
  function sync() {
    const l = L(), tx = T[o.game] || T.chess;
    box.querySelector('span').textContent = tx[l] || tx.en; box.querySelector('button').textContent = T.btn[l] || T.btn.en;
    box.classList.toggle('hidden', seen());
  }
  box.querySelector('button').onclick = () => { const ov = document.getElementById('newOverlay'); if (ov) ov.classList.remove('show'); mark(); o.open(); };
  // opening the rules any other way also counts
  if (o.watch) { const el = document.querySelector(o.watch); if (el) new MutationObserver(() => { if (el.classList.contains('show') || el.offsetParent) mark(); }).observe(el, { attributes: true, attributeFilter: ['class'] }); }
  const ov = document.getElementById('newOverlay');
  if (ov) new MutationObserver(() => { if (ov.classList.contains('show')) sync(); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  sync();
  return { sync, mark };
}
window.RulesOffer = { init };
})();
