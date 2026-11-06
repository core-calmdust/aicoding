// DrawOffer — 引き分けの提案（メニューの #btnDraw）を、オンラインだけでなく AI 対局・同じ端末の2人対局でも使えるようにする
// 共通部品（2026-11-06、引き分けの多いゲーム：チェス・チェッカー・シャンチー・ウゴルキ・タフル・ファノロナ／アルケルケ・アゴン・モリス）。
//   AI 対局：ゲームの判定（AI が不利でなければ同意）に渡す。2人対局：「引き分けにしますか？」いいえ／はい（はい＝合意の引き分け）。
//   オンライン中は何もしない（ゲームの online-ui.js が提案を送る）。
// Usage:
//   DrawOffer.init({ btn: '#btnDraw', lang: () => LANG, live: () => 'ai' | 'pvp' | '', online: () => olLive(),
//                    ai: () => playerDraw(), agree: () => endManually({ over: true, winner: 0, draw: true, why: 'agree' }) });
//   DrawOffer.sync()   // the game's update(): shows the button (body.draw-live) while a game can be drawn
//   DrawOffer.tx(key, lang)   // 'btn' / 'q' / 'sub' / 'agreed' / 'aiYes' / 'aiNo' / 'wait' (games without their own texts: morris)
(function () {
'use strict';
const T = {
  ja: { aiYes: 'AIが引き分けに同意しました', aiNo: 'AIは引き分けを断りました（まだ勝負を続けたいようです）', wait: '引き分けの提案は、数手進めてからもう一度どうぞ', btn: '引き分け', q: '引き分けにしますか？', sub: '二人で合意して、この対局を引き分けで終えます。', agreed: '合意により引き分けになりました' },
  en: { aiYes: 'The AI agreed to a draw', aiNo: 'The AI declined the draw (it wants to play on)', wait: 'Play a few more moves before offering again', btn: 'Draw', q: 'Agree to a draw?', sub: 'Both players agree to end this game as a draw.', agreed: 'Drawn by agreement' },
  zh: { aiYes: 'AI 同意和棋', aiNo: 'AI 拒绝和棋（它还想继续下）', wait: '请再走几步后再提和', btn: '和棋', q: '同意和棋吗？', sub: '双方同意，本局以和棋结束。', agreed: '双方同意和棋' },
  ko: { aiYes: 'AI가 무승부에 동의했습니다', aiNo: 'AI가 무승부를 거절했습니다 (계속 두고 싶어 합니다)', wait: '몇 수 더 둔 뒤에 다시 제안하세요', btn: '무승부', q: '무승부로 하시겠습니까?', sub: '두 사람이 합의하여 이 대국을 무승부로 끝냅니다.', agreed: '합의에 의한 무승부' },
  es: { aiYes: 'La IA aceptó las tablas', aiNo: 'La IA rechazó las tablas (quiere seguir jugando)', wait: 'Juega unas jugadas más antes de volver a ofrecer', btn: 'Tablas', q: '¿Acordar tablas?', sub: 'Ambos jugadores acuerdan terminar la partida en tablas.', agreed: 'Tablas por acuerdo' },
  fr: { aiYes: "L'IA a accepté la nulle", aiNo: "L'IA a refusé la nulle (elle veut continuer)", wait: 'Jouez encore quelques coups avant de reproposer', btn: 'Nulle', q: 'Accepter la nulle ?', sub: 'Les deux joueurs conviennent de terminer la partie par une nulle.', agreed: 'Nulle par accord mutuel' },
  pt: { aiYes: 'A IA aceitou o empate', aiNo: 'A IA recusou o empate (quer continuar)', wait: 'Jogue mais alguns lances antes de oferecer de novo', btn: 'Empate', q: 'Combinar empate?', sub: 'Os dois jogadores concordam em terminar a partida empatada.', agreed: 'Empate por acordo' },
  de: { aiYes: 'Die KI hat das Remis angenommen', aiNo: 'Die KI hat das Remis abgelehnt (sie will weiterspielen)', wait: 'Spiele noch ein paar Züge, bevor du erneut anbietest', btn: 'Remis', q: 'Remis vereinbaren?', sub: 'Beide Spieler beenden die Partie einvernehmlich mit Remis.', agreed: 'Remis durch Vereinbarung' },
  hi: { aiYes: 'AI ड्रॉ के लिए सहमत हुआ', aiNo: 'AI ने ड्रॉ अस्वीकार किया (वह खेलना जारी रखना चाहता है)', wait: 'फिर से प्रस्ताव देने से पहले कुछ चालें और खेलें', btn: 'ड्रॉ', q: 'क्या ड्रॉ पर सहमत हैं?', sub: 'दोनों खिलाड़ी सहमति से यह खेल ड्रॉ पर समाप्त करते हैं।', agreed: 'सहमति से ड्रॉ' },
  ar: { aiYes: 'وافق الذكاء الاصطناعي على التعادل', aiNo: 'رفض الذكاء الاصطناعي التعادل (يريد مواصلة اللعب)', wait: 'العب بضع نقلات أخرى قبل أن تعرض التعادل مجددًا', btn: 'تعادل', q: 'هل تتفقان على التعادل؟', sub: 'يتفق اللاعبان على إنهاء المباراة بالتعادل.', agreed: 'تعادل بالاتفاق' },
  ru: { aiYes: 'ИИ согласился на ничью', aiNo: 'ИИ отказался от ничьей (хочет играть дальше)', wait: 'Сделайте ещё несколько ходов, прежде чем предлагать снова', btn: 'Ничья', q: 'Согласиться на ничью?', sub: 'Оба игрока соглашаются завершить партию вничью.', agreed: 'Ничья по соглашению' },
  'zh-TW': { aiYes: 'AI 同意和棋', aiNo: 'AI 拒絕和棋（還想繼續下）', wait: '請再下幾步後再提和', btn: '和棋', q: '同意和棋嗎？', sub: '雙方同意，本局以和棋結束。', agreed: '雙方同意和棋' },
  id: { aiYes: 'AI setuju seri', aiNo: 'AI menolak seri (masih ingin bermain)', wait: 'Mainkan beberapa langkah lagi sebelum menawarkan lagi', btn: 'Seri', q: 'Setuju seri?', sub: 'Kedua pemain sepakat mengakhiri permainan ini dengan seri.', agreed: 'Seri atas kesepakatan' },
  tr: { aiYes: 'Yapay zekâ beraberliği kabul etti', aiNo: 'Yapay zekâ beraberliği reddetti (oynamaya devam etmek istiyor)', wait: 'Tekrar teklif etmeden önce birkaç hamle daha oyna', btn: 'Beraberlik', q: 'Beraberliği kabul ediyor musunuz?', sub: 'İki oyuncu da oyunu berabere bitirmeyi kabul eder.', agreed: 'Anlaşmayla berabere' },
};
const icon = '<svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg>';
function tx(k, lang) { const L = T[lang] || T[document.documentElement.lang] || T.en; return L[k] != null ? L[k] : T.en[k]; }
let O = null;
const btn = () => O && (typeof O.btn === 'string' ? document.querySelector(O.btn) : O.btn);
const lang = () => (O && O.lang && O.lang()) || document.documentElement.lang || 'en';
function liveKind() { if (!O) return ''; try { if (O.online && O.online()) return ''; return (O.live && O.live()) || ''; } catch (e) { return ''; } }
function sync() {
  if (!O) return;
  const k = liveKind();
  document.body.classList.toggle('draw-live', !!k);
  document.body.classList.toggle('draw-pvp', k === 'pvp');
  const b = btn(); if (b && k) b.disabled = false;
}
function init(o) {
  O = o;
  if (!document.getElementById('drawOfferCss')) {
    const st = document.createElement('style'); st.id = 'drawOfferCss';
    st.textContent = 'body.draw-live #btnDraw{display:flex!important}';
    document.head.appendChild(st);
  }
  const b = btn(); if (!b) return;
  // capture phase: runs before the game's own (online) handler; only for a local game
  b.addEventListener('click', e => {
    const k = liveKind(); if (!k) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (k === 'ai') { if (O.ai) O.ai(); return; }
    const conf = window.Resign ? Resign.confirm({ lang: lang(), kind: 'draw', icon, question: tx('q', lang()), note: tx('sub', lang()) }) : Promise.resolve(window.confirm(tx('q', lang())));
    conf.then(ok => { if (ok && liveKind() === 'pvp' && O.agree) O.agree(); });
  }, true);
  sync();
}
window.DrawOffer = { init, sync, tx, icon };
})();
