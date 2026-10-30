/* ResumeNG — 「ここから再開」 opens the game's own new-game dialog (#newOverlay) in a "resume" mode:
   the title and the start button say the game goes on from the current position, a short note explains it, and only the
   settings that make sense for going on are left (the mode buttons named in `modes`, e.g. AIと対戦 / 二人で対戦 / AI同士,
   plus whatever the game does not hide: side, AI strength, clock, display, design). Things that would change the position
   itself (variant, handicap, board size, opening…) are hidden with `hide`.
   The game keeps its own flow: open the dialog as usual, then ResumeNG.open({...}); a normal open calls ResumeNG.close().
   On 開始 the game reads its own draft (draft.resume) and continues from the position instead of starting a new game.
     <script src="../shared/resumeng.js?v=1"></script>
     ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], seg: '#segMode', hide: '#fVariant, #fHandicap' })
     ResumeNG.close();  ResumeNG.active() */
(function () {
'use strict';
const TX = {
  title: { ja: 'この局面から再開', en: 'Resume from this position', zh: '从此局面继续', ko: '이 국면에서 재개', es: 'Reanudar desde esta posición', fr: 'Reprendre depuis cette position', pt: 'Retomar desta posição', de: 'Ab dieser Stellung fortsetzen', hi: 'इस स्थिति से फिर शुरू करें', ar: 'الاستئناف من هذا الوضع' },
  start: { ja: 'この局面から再開', en: 'Resume', zh: '从此局面继续', ko: '이 국면에서 재개', es: 'Reanudar', fr: 'Reprendre', pt: 'Retomar', de: 'Fortsetzen', hi: 'फिर शुरू करें', ar: 'استئناف' },
  side: { ja: 'あなたが持つ側', en: 'Your side', zh: '你执的一方', ko: '내가 맡을 쪽', es: 'Tu bando', fr: 'Votre camp', pt: 'Seu lado', de: 'Deine Seite', hi: 'आपका पक्ष', ar: 'جانبك' },
  note: {
    ja: '盤面と棋譜はそのままで続けます。対戦形式（AIと対戦・二人で対戦・AI同士）や手番、AIの強さを変えられます。',
    en: 'The position and the move record are kept. You can change the mode (vs AI, two players, AI vs AI), your side and the AI strength.',
    zh: '保留当前局面和棋谱继续。可以更改对战形式（对战AI・双人对战・AI对战）、执子方和AI强度。',
    ko: '국면과 기보는 그대로 이어집니다. 대전 형식(AI 대전・2인 대전・AI끼리), 차례, AI 강도를 바꿀 수 있습니다.',
    es: 'Se conservan la posición y el registro de jugadas. Puedes cambiar el modo (contra la IA, dos jugadores, IA contra IA), tu bando y la fuerza de la IA.',
    fr: 'La position et la notation sont conservées. Vous pouvez changer le mode (contre l’IA, à deux, IA contre IA), votre camp et la force de l’IA.',
    pt: 'A posição e o registro de lances são mantidos. Você pode mudar o modo (contra a IA, dois jogadores, IA contra IA), seu lado e a força da IA.',
    de: 'Stellung und Notation bleiben erhalten. Modus (gegen die KI, zu zweit, KI gegen KI), deine Seite und die KI-Stärke lassen sich ändern.',
    hi: 'स्थिति और चालों का रिकॉर्ड वैसा ही रहता है। मोड (AI से, दो खिलाड़ी, AI बनाम AI), अपना पक्ष और AI की ताकत बदल सकते हैं।',
    ar: 'يبقى الوضع وسجل النقلات كما هما. يمكنك تغيير النمط (ضد الذكاء الاصطناعي، لاعبان، ذكاء ضد ذكاء) وجانبك وقوة الذكاء الاصطناعي.',
  },
};
const lang = () => { const l = (document.documentElement.lang || 'ja').slice(0, 2); return TX.title[l] ? l : 'en'; };
const tx = k => TX[k][lang()] || TX[k].en;
const CSS = `
#newOverlay .rsng-h,#newOverlay .rsng-note{display:none}
#newOverlay.rsng .rsng-h{display:block}
#newOverlay.rsng .rsng-note{display:block;margin:0 0 10px;font-size:13px;line-height:1.6;color:var(--muted,#aaa)}
#newOverlay.rsng h2:not(.rsng-h){display:none!important}
#newOverlay.rsng .rsng-x,#newOverlay.rsng .rules-offer{display:none!important}
`;
let ov = null, modal = null, h = null, note = null, on = false, opts = {};
function setup() {
  if (ov) return !!modal;
  ov = document.getElementById('newOverlay'); modal = ov && ov.querySelector('.modal');
  if (!modal) return false;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const h0 = modal.querySelector('h2');
  h = document.createElement('h2'); h.className = 'rsng-h';
  note = document.createElement('p'); note.className = 'rsng-note';
  if (h0) { h0.after(h); h.after(note); } else { modal.prepend(note); modal.prepend(h); }
  // the start button: the game's segSync() writes its label; in resume mode it says 再開
  const btn = () => modal.querySelector(opts.start || '#btnStart');
  new MutationObserver(() => { if (on) label(); }).observe(modal, { childList: true, subtree: true, characterData: true });
  new MutationObserver(() => { if (on) label(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // closing the dialog ends the resume mode
  new MutationObserver(() => { if (on && !ov.classList.contains('show')) setTimeout(() => { if (!ov.classList.contains('show')) close(); }, 0); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  function label() {
    const b = btn(), s = tx('start'), t = tx('title'), n = tx('note');
    if (b && b.textContent !== s) b.textContent = s;
    if (h.textContent !== t) h.textContent = t;
    if (note.textContent !== n) note.textContent = n;
  }
  setup.label = label;
  return true;
}
function open(o) {
  if (!setup()) return;
  close();
  opts = o || {}; on = true; ov.classList.add('rsng');
  const modes = opts.modes || ['ai', 'pvp', 'watch'];
  modal.querySelectorAll((opts.seg || '#segMode') + ' [data-v]').forEach(b => { if (!modes.includes(b.dataset.v)) b.classList.add('rsng-x'); });
  if (opts.hide) modal.querySelectorAll(opts.hide).forEach(e => e.classList.add('rsng-x'));
  // a hidden variant block (ngtabs.js ゲーム tab, data-ng="game") leaves no empty tab behind
  modal.querySelectorAll('.rsng-x[data-ng=game], .rsng-x [data-ng=game]').forEach(e => e.setAttribute('data-ng', 'rsng-game'));
  setup.label();
}
function close() {
  if (!ov) return;
  on = false; ov.classList.remove('rsng');
  ov.querySelectorAll('.rsng-x').forEach(e => e.classList.remove('rsng-x'));
  ov.querySelectorAll('[data-ng=rsng-game]').forEach(e => e.setAttribute('data-ng', 'game'));
}
window.ResumeNG = { open, close, active: () => on, t: tx };
})();
