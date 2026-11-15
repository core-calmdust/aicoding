/* patolli/tour.js — パトリ：ルールのチュートリアル（shared/ruletour.js の枠）
 * 本物の盤（PatolliBoard2D.mount、対局と同じ絵）で実際に豆を投げ、駒をタップして動かす。宝の支払いも対局と同じ動きで見せる。
 * 豆の目はページごとに決めてある（課題が必ず成り立つ）。
 * 入口：PatolliTour.open({ mount, lang, design, pieces, speed, page, onPlay, onLessons, onClose, sound })
 *       PatolliTour.render() / setDesign(d, p) / stop() / visible() / progress() / PAGES
 * 歴史の文は claude/patolli-spec.md §0 の「史料で確か」なことだけ。ルールは後世の復元だと必ず書く。
 * 文言はいまは ja / en（TX に同じキーでほかの言語を足す）。依存：shared/ruletour.js, patolli/engine.js, patolli/board2d.js
 */
(function () {
  'use strict';
  const E = () => window.PatolliEngine, B = () => window.PatolliBoard2D;

  /* ---------------- 文言 ---------------- */
  const TX = {
    ja: {
      'intro.t': 'パトリ', 'intro.origin': 'メキシコ（アステカ）', 'intro.players': '2人', 'intro.time': '約20分',
      'intro.hist': 'アステカの人びとが遊んだ賭けのゲーム。16世紀の記録（デュラン、サアグン）によると、ござに液状のゴムで X 形の盤を描き、赤と青の小石を駒にして、印をつけた豆を投げて進めました。名前も豆（パトリ）から来ています。',
      'intro.win': '2人で各6個。豆を5個投げ、印の出た数だけ駒を進めて盤を一周し、先に6個すべて上げた方の勝ちです。当時のルールは伝わっていないので、ここで遊ぶのは後世の復元です。',
      'intro.cult': '身分を問わず遊ばれ、大きな賭けを伴いました。賽の神マクイルショチトル（「五の花」）の名を呼んで豆を投げたといいます。スペイン人はこのゲームを禁じ、ござや豆を焼きました（デュラン）。',
      roll: '投げる', pass: 'パス', first: 'まず［投げる］を押そう', pick: '動かす駒をタップ', again: 'もう一度投げられます！',
      noMove: 'その駒は動かせません', own: 'その先には自分の駒がいて止まれません', opp: 'その先には相手の駒がいて止まれません', over: '{n}では上がりを越えてしまいます（ちょうどの目だけ）', need1: '盤に自分の駒があるとき、入れるのは「1」の目だけです', notMine: 'あなたの駒は赤（手前）の駒です',
      tWait: '待ち', tHome: '上がり', tPool: '場', tYou: 'あなたの宝', tOpp: '相手の宝',
      'board.t': '盤と道', 'board.b': '盤は X の形。あなたの駒は中央から入り、光る矢印の順に4本の腕を回って、中央へ戻ると上がりです。',
      'board.k': '道の最後のマス（59マス目）をタップしよう', 'board.ok': 'そこが最後のマス。次の一歩で上がりです！', 'board.ng': '矢印の先、いちばん最後のマスです',
      'beans.t': '豆を投げる', 'beans.b': 'さいころの代わりに豆を5個投げます。白い印が出た豆の数だけ進めます。5個とも印なら10、0個なら進めません。',
      'beans.k': '［投げる］を押して、白い印の数を答えよう', 'beans.k2': '白い印が出ている豆はいくつ？', 'beans.ok': '正解！{n}マス進めます', 'beans.ng': '白い点のある豆を数えてみよう',
      'enter.t': '最初の駒を入れる', 'enter.b': '盤に自分の駒が1つもないときは、どの目でも駒を入れられます。出た数だけ道を進んだマスに入ります。',
      'enter.k': '投げてから、待ちの駒をタップして入れよう', 'enter.ok': '入りました！ここから道を進みます',
      'enter1.t': '2個目からは「1」で入る', 'enter1.b': '盤に自分の駒があるとき、待ちの駒を入れられるのは「1」の目だけです。1回に動かせるのは1個です。',
      'enter1.k': '投げてから、待ちの駒を入れよう', 'enter1.ok': '「1」で入りました。1マス目からスタートです', 'enter1.ng': '今回は待ちの駒を入れてみよう',
      'move.t': '進む', 'move.b': '盤上の駒は、出た数だけ道に沿って進みます。どの駒を動かすかは自分で選べます。動かせる駒があれば必ず動かします。',
      'move.k': '投げてから、盤上の駒を進めよう', 'move.ok': '道に沿って進みました',
      'own.t': '駒のいるマスには止まれない', 'own.b': '自分の駒・相手の駒のいるマスには止まれません（通り過ぎるのは自由）。止まれない駒は動かせません。',
      'own.k': '投げてから、動かせる駒を動かそう', 'own.ok': '正解！動かせるのはその駒だけでした',
      'again.t': '腕の先でもう一度', 'again.b': '腕の先の丸いマス（8つ）に止まると、もう一度投げられます。',
      'again.k': '光るマスに止まって、もう一度投げよう', 'again.k2': 'もう一度！投げて、どれか動かそう', 'again.ok': '1回の番で2回動かせました', 'again.ng': '腕の先（光るマス）に止まる駒を選ぼう',
      'pen.t': '印のマスは宝を払う', 'pen.b': '黒い三角の印のマス（8つ）に止まると、相手に宝を2払います。このゲームは宝を賭けて遊びます。',
      'pen.k': '投げてから、駒を動かしてみよう', 'pen.ok': '印のマスに止まったので、相手へ宝を2払いました。ふだんは避けたいマスです',
      'goal.t': 'ちょうどの目で上がる', 'goal.b': '上がりは最後のマスの次。ちょうどの目のときだけ上がれます。1個上がるたびに相手から宝を1もらえます。',
      'goal.k': '投げてから、駒を上がらせよう', 'goal.ok': '上がり！相手から宝を1もらいました', 'goal.ng': 'ちょうど上がりに届く駒を選ぼう',
      'stuck.t': '動かせないとき', 'stuck.b': '出た目で動かせる駒が1つもないときは、場に宝を1払って相手の番になります。0の目は払わずに相手の番です。',
      'stuck.k': '投げてみよう', 'stuck.k2': '動かせる駒がありません。［パス］を押そう', 'stuck.ok': '場へ宝を1払いました。相手の番になります',
      'win.t': '勝ち方', 'win.b': '先に6個すべて上げた方の勝ちで、場の宝をすべてもらえます。あなたはあと1個！',
      'win.k': '投げてから、最後の駒を上がらせよう', 'win.ok': '6個上がり、あなたの勝ち！場の宝もあなたのものです', 'win.ng': '上がりに届くのは最後の駒です',
      'pop1.t': '広く知られたルール①', 'pop1.b': 'ここからは、もう1つの「広く知られたルール」。盤は52マスで、駒を入れられるのはいつも「1」の目だけ。入る場所は中央のマスです。',
      'pop1.k': '投げてから、待ちの駒を入れよう', 'pop1.ok': '中央の出発マスに入りました',
      'pop2.t': '広く知られたルール②', 'pop2.b': '中央の4マスでだけ、相手の駒のいるマスに止まって取れます。取られた駒は待ちに戻り、持ち主が宝を1払います。',
      'pop2.k': '投げてから、中央の相手の駒を取ろう', 'pop2.ok': '取りました！相手の駒は待ちに戻り、宝を1もらいました', 'pop2.ng': '中央の相手の駒にちょうど止まる駒を選ぼう',
      'pop3.t': '広く知られたルール③', 'pop3.b': '0の目は場に宝を1供えます（その回を上がりきった方のもの）。印のマスは相手へ1。相手の宝がなくなれば勝ちです。',
      'pop3.k': '投げてみよう', 'pop3.k2': '0の目でした。［パス］を押そう', 'pop3.ok': '場へ宝を1供えました。相手の番になります',
    },
    en: {
      'intro.t': 'Patolli', 'intro.origin': 'Mexico (Aztec)', 'intro.players': '2', 'intro.time': 'about 20 min',
      'intro.hist': 'A gambling game of the Aztecs. Sixteenth-century accounts (Durán, Sahagún) describe an X-shaped board drawn with liquid rubber on a reed mat, red and blue pebbles for pieces, and marked beans thrown as dice. The game is named after the beans (patolli).',
      'intro.win': 'Two players, six pieces each. Throw five beans, move by the number of marked ones, go once round the board, and be first to bring all six home. The original rules are lost: what you play here is a later reconstruction.',
      'intro.cult': 'People of every rank played it, for high stakes. Players called on Macuilxochitl (“Five Flower”), the god of games, as they threw. The Spanish banned the game and burned the mats and beans (Durán).',
      roll: 'Throw', pass: 'Pass', first: 'Press “Throw” first', pick: 'Tap a piece to move', again: 'Throw again!',
      noMove: 'That piece cannot move', own: 'Your own piece is there — you cannot land on it', opp: 'A rival piece is there — you cannot land on it', over: 'A {n} would go past home (exact throws only)', need1: 'With a piece on the board, only a 1 brings another one on', notMine: 'Your pieces are the red ones (near side)',
      tWait: 'Waiting', tHome: 'Home', tPool: 'Pool', tYou: 'Your stake', tOpp: 'Rival’s stake',
      'board.t': 'The board and your road', 'board.b': 'The board is an X. Your pieces enter from the centre, follow the glowing arrows round all four arms, and go home when they are back at the centre.',
      'board.k': 'Tap the last square of the road (square 59)', 'board.ok': 'That is the last square. One more step and you are home!', 'board.ng': 'Follow the arrows to the very last square',
      'beans.t': 'Throwing the beans', 'beans.b': 'Instead of dice you throw five beans and move as many squares as beans show their white mark. All five marked counts 10; none means no move.',
      'beans.k': 'Press “Throw” and count the white marks', 'beans.k2': 'How many beans show a white mark?', 'beans.ok': 'Correct! You may move {n} squares', 'beans.ng': 'Count the beans with a white dot',
      'enter.t': 'Your first piece', 'enter.b': 'While you have no piece on the board, any throw brings one on: it enters on the square the throw counts to.',
      'enter.k': 'Throw, then tap a waiting piece to bring it on', 'enter.ok': 'It is in! From here it follows the road',
      'enter1.t': 'After that, enter with a 1', 'enter1.b': 'Once you have a piece on the board, a waiting piece enters only with a 1. You move one piece per throw.',
      'enter1.k': 'Throw, then bring a waiting piece on', 'enter1.ok': 'In with a 1 — it starts on square 1', 'enter1.ng': 'This time, bring a waiting piece on',
      'move.t': 'Moving', 'move.b': 'A piece on the board moves along the road by the throw. You choose which piece — but if any piece can move, you must move.',
      'move.k': 'Throw, then move a piece on the board', 'move.ok': 'It moved along the road',
      'own.t': 'No landing on a piece', 'own.b': 'You cannot land on a square that holds a piece, yours or your rival’s (passing over is fine). A piece with nowhere to land cannot move.',
      'own.k': 'Throw, then move a piece that can move', 'own.ok': 'Right! That was the only piece that could move',
      'again.t': 'Arm ends: throw again', 'again.b': 'Land on one of the eight rounded squares at the ends of the arms and you throw again.',
      'again.k': 'Land on the glowing square and throw again', 'again.k2': 'Again! Throw and move any piece', 'again.ok': 'Two moves in one turn', 'again.ng': 'Pick the piece that lands on an arm end (glowing)',
      'pen.t': 'Marked squares cost you', 'pen.b': 'Land on one of the eight squares marked with a black triangle and you pay your rival 2. The game is played for stakes.',
      'pen.k': 'Throw, then move the piece', 'pen.ok': 'It landed on a marked square, so you paid 2. Usually a square to avoid',
      'goal.t': 'Home by exact throw', 'goal.b': 'Home is the step after the last square, reached only with the exact throw. Each piece you bring home earns 1 from your rival.',
      'goal.k': 'Throw, then bring a piece home', 'goal.ok': 'Home! You took 1 from your rival', 'goal.ng': 'Pick the piece that reaches home exactly',
      'stuck.t': 'When you cannot move', 'stuck.b': 'If no piece can use the throw, you pay 1 into the pool and the turn passes. A throw of 0 just passes.',
      'stuck.k': 'Throw the beans', 'stuck.k2': 'No piece can move. Press “Pass”', 'stuck.ok': 'You paid 1 into the pool. Your rival’s turn',
      'win.t': 'How to win', 'win.b': 'The first to bring all six pieces home wins and takes the whole pool. You need just one more!',
      'win.k': 'Throw, then bring your last piece home', 'win.ok': 'All six home — you win, and the pool is yours!', 'win.ng': 'Only your last piece can reach home',
      'pop1.t': 'Popular rules ①', 'pop1.b': 'Now the other rule set, the “popular rules”: 52 squares, and a piece always needs a 1 to enter. It enters on a centre square.',
      'pop1.k': 'Throw, then bring a waiting piece on', 'pop1.ok': 'It is on your entry square in the centre',
      'pop2.t': 'Popular rules ②', 'pop2.b': 'Only on the four centre squares may you land on a rival piece and capture it. It goes back to waiting and its owner pays 1.',
      'pop2.k': 'Throw, then capture the rival piece in the centre', 'pop2.ok': 'Captured! It goes back to waiting and you took 1', 'pop2.ng': 'Pick the piece that lands exactly on the rival in the centre',
      'pop3.t': 'Popular rules ③', 'pop3.b': 'A throw of 0 puts 1 into the pool as an offering (for whoever finishes the round). Marked squares cost 1. Win by taking all your rival’s stakes.',
      'pop3.k': 'Throw the beans', 'pop3.k2': 'A zero. Press “Pass”', 'pop3.ok': 'You offered 1 to the pool. Your rival’s turn',
    },
  };

  const O = { lang: 'ja', design: 'petate', pieces: 'pebble', speed: 1 };
  const lang = () => { const l = typeof O.lang === 'function' ? O.lang() : O.lang; return TX[l] ? l : 'en'; };
  const T = (k, v) => { let s = TX[lang()][k]; if (s == null) s = TX.en[k]; if (s == null) s = k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] != null ? v[x] : ''); return s; };
  const snd = k => { try { O.sound && O.sound(k); } catch (e) {} };
  let tour = null, mountEl = null;
  const PH = {};   // ページごとの段階（課題の文の切り替え）

  // 豆の出方（どの豆に印が出るか）
  const PAT = { 0: [0, 0, 0, 0, 0], 1: [0, 0, 1, 0, 0], 2: [1, 0, 0, 0, 1], 3: [1, 0, 1, 0, 1], 4: [1, 1, 0, 1, 1], 10: [1, 1, 1, 1, 1] };
  // 局面：手前（赤・side 0）が自分。p0 / p1＝盤上・上がりの駒の位置（残りは待ち）
  const ST = (rule, p0, p1) => { const s = E().newGame(rule), n = E().RULES[rule].pieces, full = a => { const r = a.slice(); while (r.length < n) r.push(0); return r; }; s.pos = [full(p0), full(p1)]; s.turn = 0; return s; };
  const rcOf = (s, side, i) => { const q = E().coords(s.rule, side, i, s.dir[side]); return q ? { r: q[0], c: q[1] } : null; };
  const idxAt = (s, side, r, c) => { const L = E().RULES[s.rule].L; for (let i = 1; i <= L; i++) { const q = E().coords(s.rule, side, i, s.dir[side]); if (q[0] === r && q[1] === c) return i; } return -1; };
  const kinds = (s, kd) => { const out = [], L = E().RULES[s.rule].L; for (let i = 1; i <= L; i++) if (E().kind(s.rule, 0, i, 1) === kd) out.push(Object.assign(rcOf(s, 0, i), { type: 'glow' })); return out; };

  /* ---------------- CSS ---------------- */
  const CSS = `
.rt-intro-hero img[src*="patolli"]{width:min(200px,36vw);height:auto;aspect-ratio:1;border-radius:18px}
.ptt{position:relative;width:100%;height:100%;direction:ltr}
.ptt-b{position:absolute;inset:0}
.ptt-b > svg{width:100%;height:100%}
/* 豆を投げる場所：対局と同じ、X の左のすき間 */
.ptt-dock{position:absolute;left:2.2%;top:37.5%;width:21.6%;height:25%;display:flex;align-items:center;justify-content:center}
.ptt-d{position:absolute;inset:0 0 16% 0}
.ptt-n{position:absolute;left:0;right:0;bottom:-3%;text-align:center;direction:ltr;unicode-bidi:isolate;font:800 clamp(13px,3.4cqw,24px)/1 'JetBrains Mono',ui-monospace,monospace;color:#2a1d10;text-shadow:0 0 6px rgba(255,244,214,.95),0 0 2px rgba(255,244,214,.95)}
.ptt-btn{position:relative;z-index:2;min-width:88%;white-space:nowrap;padding:.5em .5em;border-radius:999px;border:2px solid #052e34;background:linear-gradient(180deg,#27c0d0,#0c7f90);color:#fff;font:inherit;font-weight:800;font-size:clamp(13px,3.1cqw,21px);line-height:1.1;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 4px 9px rgba(0,0,0,.45);animation:pttGlow 2.2s ease-in-out infinite}
@keyframes pttGlow{0%,100%{box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 4px 9px rgba(0,0,0,.45),0 0 0 0 rgba(255,236,150,0)}50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 4px 9px rgba(0,0,0,.45),0 0 0 5px rgba(255,236,150,.55)}}
.ptt-btn.ptt-pass{background:linear-gradient(180deg,#f08a6a,#c0432b);border-color:#4a160c}
.ptt{container-type:inline-size}
.ptt-choice{display:flex;gap:8px;justify-content:center;margin:6px 0 0;flex-wrap:wrap}
.rt-row .ptt-choice{justify-content:flex-start}
.ptt-choice button{min-width:44px;padding:6px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.2));background:rgba(255,255,255,.06);color:var(--text,#eee);font:700 16px/1.2 inherit;cursor:pointer}
.ptt-choice button:hover{background:rgba(255,255,255,.12)}
@media (max-width: 520px){
  .rt .rt-intro{gap:6px}.rt .rt-intro-hero{gap:10px}.rt .rt-intro-hero img[src*="patolli"]{width:26vw}
  .rt .rt-intro-facts{gap:4px}.rt .rt-intro-facts span{padding:3px 8px;font-size:12px;border-radius:9px}.rt .rt-intro-facts small{font-size:10px}
  .rt .rt-intro-sec{padding:6px 10px;gap:0 8px;border-radius:11px}.rt .rt-intro-sec i{font-size:16px}.rt .rt-intro-sec b{font-size:12px}.rt .rt-intro-sec p{font-size:12.5px;line-height:1.45}
  .rt .rt-main:has(.rt-intro) h2.rt-title{margin-bottom:4px}
  .ptt-choice button{min-width:40px;padding:5px 10px}
}
`;
  function injectCss() { if (!document.getElementById('pttCss')) { const s = document.createElement('style'); s.id = 'pttCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------------- 本物の盤での小さな一手番 ---------------- */
  // cfg: { s, rolls:[n,…]（順に出る目）, marks(s, ctl) → 印, noDice, check(m, ctl) → だめな理由|null, onRoll, onMove(m, again, ctl, res), onPass(ctl), onCell }
  function game(api, cfg) {
    const host = api.board;
    host.innerHTML = `<div class="ptt" dir="ltr"><div class="ptt-b"></div><div class="ptt-dock"${cfg.noDice ? ' style="visibility:hidden"' : ''}><div class="ptt-d"></div><span class="ptt-n"></span><button type="button" class="ptt-btn" data-noswipe>${T('roll')}</button></div></div>`;
    const lab = k => k === 'start' ? T('tWait') : k === 'goal' ? T('tHome') : k === 'pool' ? T('tPool') : k === 'gold0' ? T('tYou') : T('tOpp');
    const view = B().mount(host.querySelector('.ptt-b'), { design: O.design, pieces: O.pieces, speed: O.speed, trayLabel: lab });
    const dc = B().dice(host.querySelector('.ptt-d'), { speed: O.speed });
    const btn = host.querySelector('.ptt-btn'), nEl = host.querySelector('.ptt-n'), dEl = host.querySelector('.ptt-d');
    const ctl = { s: E().clone(cfg.s), n: null, phase: cfg.noDice ? 'none' : 'roll', k: 0, busy: false, view, extra: [], last: null };
    ctl.s.turn = 0;
    const moves = () => ctl.n ? E().legalMoves(ctl.s, ctl.n) : [];
    const draw = shown => {
      const st = shown || ctl.s, marks = (cfg.marks ? cfg.marks(ctl.s, ctl) : []).concat(ctl.extra);
      const opt = { marks, last: ctl.last || null };
      if (ctl.phase === 'move') { const R = E().RULES[st.rule]; opt.targets = moves().map(m => m.to >= R.goal ? { tray: 'goal', side: 0, slot: st.pos[0].filter(p => p >= R.goal).length } : Object.assign(rcOf(st, 0, m.to), { capture: m.capture })); }
      view.render(st, opt);
      const showBtn = ctl.phase === 'roll' || ctl.phase === 'pass';
      btn.textContent = ctl.phase === 'pass' ? T('pass') : T('roll');
      btn.classList.toggle('ptt-pass', ctl.phase === 'pass');
      btn.style.display = showBtn ? '' : 'none';
      dEl.style.opacity = ctl.phase === 'roll' ? '0' : '1'; nEl.style.visibility = ctl.phase === 'roll' ? 'hidden' : '';
    };
    ctl.draw = draw;
    dc.show([0, 0, 0, 0, 0]);
    async function roll() {
      if (ctl.phase !== 'roll' || ctl.busy || !api.alive()) return;
      ctl.busy = true; btn.style.display = 'none'; dEl.style.opacity = '1'; nEl.textContent = ''; nEl.style.visibility = ''; snd('roll');
      const n = cfg.rolls[Math.min(ctl.k, cfg.rolls.length - 1)]; ctl.k++;
      await dc.roll(PAT[n].slice(), { speed: O.speed });
      if (!api.alive()) return;
      ctl.busy = false; ctl.n = n; if (!cfg.hideN) nEl.textContent = '= ' + n;
      if (cfg.onRoll && cfg.onRoll(n, ctl) === false) { draw(); return; }
      ctl.phase = moves().length ? 'move' : 'pass';
      api.say(ctl.phase === 'move' ? T('pick') : '', '');
      draw();
    }
    ctl.roll = roll;
    // 支払い（エンジンの ev）を対局と同じ動きで見せる。before＝払う前の宝
    async function pays(before, res) {
      const list = res.ev.filter(e => e.t === 'pay' || e.t === 'pot'); if (!list.length) return;
      const sh = Object.assign({}, ctl.s, { gold: before.gold.slice(), pool: before.pool });
      draw(sh);
      for (const e of list) {
        const from = e.t === 'pot' ? 'pool' : e.from;
        snd('coin'); await view.animatePay(from, e.to, e.amt, { speed: O.speed });
        if (!api.alive()) return;
        if (from === 'pool') sh.pool -= e.amt; else sh.gold[from] -= e.amt;
        if (e.to === 'pool') sh.pool += e.amt; else sh.gold[e.to] += e.amt;
        draw(sh);
      }
    }
    btn.onclick = async () => {
      if (ctl.phase === 'pass') {
        if (ctl.busy) return; ctl.busy = true;
        const before = ctl.s, res = E().apply(ctl.s, null, ctl.n); ctl.s = res.state; ctl.s.turn = 0; ctl.phase = 'done';
        await pays(before, res); if (!api.alive()) return;
        ctl.busy = false; draw(); if (cfg.onPass) cfg.onPass(ctl);
      } else roll();
    };
    // その駒が今の目で動かせない理由
    const why = from => {
      const s = ctl.s, R = E().RULES[s.rule];
      if (from === 0) return ctl.n !== 1 ? T('need1') : T('noMove');
      const to = from + ctl.n;
      if (to > R.goal) return T('over', { n: ctl.n });
      if (to <= R.L) { if (s.pos[0].includes(to)) return T('own'); const q = rcOf(s, 0, to); if (s.pos[1].some(p => p >= 1 && p <= R.L && (o => o.r === q.r && o.c === q.c)(rcOf(s, 1, p)))) return T('opp'); }
      return T('noMove');
    };
    async function tryFrom(from) {
      if (ctl.busy || !api.alive()) return;
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (ctl.phase !== 'move') return;
      const m = moves().find(x => x.from === from);
      if (!m) { api.ng(why(from), { reset: false }); return; }
      if (cfg.check) { const bad = cfg.check(m, ctl); if (bad) { api.ng(bad, { reset: false }); return; } }
      ctl.busy = true; api.say(''); ctl.phase = 'anim'; draw();
      snd(m.capture ? 'cap' : 'move');
      await view.animateMove(0, m.from, m.to, { capture: m.capture, speed: O.speed });
      if (!api.alive()) return;
      const before = ctl.s, R = E().RULES[before.rule], r = E().apply(ctl.s, m, ctl.n);
      ctl.s = r.state; ctl.s.turn = 0; ctl.n = null;
      ctl.last = { from: m.enter ? null : rcOf(before, 0, m.from), to: m.finish ? null : rcOf(before, 0, m.to) };
      ctl.phase = r.again && r.state.winner < 0 ? 'roll' : 'done';
      // 勝ちの局面は、上がった駒が見えるように描く（エンジンは勝ったあとも位置を保つ）
      await pays(before, r); if (!api.alive()) return;
      ctl.busy = false; draw();
      cfg.onMove(m, r.again, ctl, r);
    }
    view.on('cell', ({ r, c }) => {
      if (cfg.onCell) { cfg.onCell(r, c, ctl); return; }
      const i = idxAt(ctl.s, 0, r, c);
      if (i > 0 && ctl.s.pos[0].includes(i)) { tryFrom(i); return; }
      if (ctl.phase === 'move') { const m = moves().find(x => { const q = x.finish ? null : rcOf(ctl.s, 0, x.to); return q && q.r === r && q.c === c; }); if (m) { tryFrom(m.from); return; } }
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (ctl.phase === 'move') { const j = idxAt(ctl.s, 1, r, c); if (j > 0 && ctl.s.pos[1].includes(j)) api.ng(T('notMine'), { reset: false }); }
    });
    view.on('tray', ({ side, kind }) => {
      if (cfg.onCell) return;
      if (side !== 0) { if (ctl.phase === 'move') api.ng(T('notMine'), { reset: false }); return; }
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (kind === 'start' && ctl.s.pos[0].includes(0)) tryFrom(0);
      else if (kind === 'goal' && ctl.phase === 'move') { const m = moves().find(x => x.finish); if (m) tryFrom(m.from); }
    });
    // スペース＝投げる／パス（このページが出ている間）
    const key = e => {
      if (e.key !== ' ' || e.repeat || !api.alive() || !host.isConnected) return;
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '') && e.target !== btn) return;
      e.preventDefault(); if (btn.style.display !== 'none') btn.click();
    };
    document.addEventListener('keydown', key);
    ctl.off = () => document.removeEventListener('keydown', key);
    draw();
    return ctl;
  }
  let curCtl = null;
  const run = (api, cfg) => { if (curCtl && curCtl.off) curCtl.off(); curCtl = game(api, cfg); return curCtl; };
  const teardown = () => { if (curCtl && curCtl.off) curCtl.off(); curCtl = null; };

  /* ---------------- ページ ---------------- */
  const PAGES = [
    // 盤と道：最後のマスをタップ
    { id: 'board', setup(api) {
        const s0 = ST('bell', [], []), nums = [1, 10, 20, 30, 40, 50, 59].map(i => Object.assign(rcOf(s0, 0, i), { type: 'text', text: String(i), color: '#fff6cf' }));
        let done = false;
        run(api, { s: s0, noDice: true, rolls: [0],
          marks: () => [{ type: 'path', side: 0, from: 1, to: 59 }].concat(done ? [Object.assign(rcOf(s0, 0, 59), { type: 'glow', color: '#3df59a' })] : []).concat(nums),
          onCell(r, c, ctl) {
            if (done) return;
            if (idxAt(s0, 0, r, c) === 59) { done = true; ctl.draw(); api.ok(T('board.ok')); }
            else api.ng(T('board.ng'), { reset: false });
          } });
      } },
    // 豆：投げて、白い印の数を答える
    { id: 'beans', setup(api) {
        PH.beans = 0;
        const ctl = run(api, { s: ST('bell', [], []), rolls: [3], hideN: true,
          onRoll(n) {
            PH.beans = 1;
            api.setTask(`<div class="ptt-choice" data-noswipe>${[0, 1, 2, 3, 4, 5].map(k => `<button type="button" data-ptt-n="${k}">${k}</button>`).join('')}</div>`);
            const tk = api.board.closest('.rt').querySelector('.rt-task');
            tk.onclick = e => {
              const b = e.target.closest('[data-ptt-n]'); if (!b || !api.alive() || PH.beans === 2) return;
              if (+b.dataset.pttN === n) { PH.beans = 2; api.setTask(''); api.ok(T('beans.ok', { n })); }
              else api.ng(T('beans.ng'), { reset: false });
            };
            ctl.phase = 'shown';
            return false;
          } });
      } },
    { id: 'enter', setup(api) { run(api, { s: ST('bell', [], [20]), rolls: [3], onMove(m) { if (m.enter) api.ok(T('enter.ok')); } }); } },
    { id: 'enter1', setup(api) { run(api, { s: ST('bell', [9], [20]), rolls: [1], check: m => m.enter ? null : T('enter1.ng'), onMove() { api.ok(T('enter1.ok')); } }); } },
    { id: 'move', setup(api) { run(api, { s: ST('bell', [5], [33]), rolls: [4], onMove() { api.ok(T('move.ok')); } }); } },
    // 止まれない：3→6 は自分の駒、6→9 は相手の駒（相手の39マス目＝自分の9マス目）、12→15 だけ動かせる
    { id: 'own', setup(api) { run(api, { s: ST('bell', [3, 6, 12], [39]), rolls: [3], onMove() { api.ok(T('own.ok')); } }); } },
    // 腕の先：5→7 でもう一度
    { id: 'again', setup(api) {
        PH.again = 0;
        const s0 = ST('bell', [5, 10], [40]);
        run(api, { s: s0, rolls: [2, 3],
          marks: (s, ctl) => ctl.k <= 1 && !PH.again ? [Object.assign(rcOf(s0, 0, 7), { type: 'glow' })] : [],
          check: (m, ctl) => ctl.k === 1 && !m.again ? T('again.ng') : null,
          onMove(m, again) { if (again) { PH.again = 1; api.setTask(''); api.say(T('again'), 'ok'); snd('ok'); } else api.ok(T('again.ok')); } });
      } },
    // 印のマス：2→4 で相手へ2
    { id: 'pen', setup(api) { run(api, { s: ST('bell', [2], [44]), rolls: [2], onMove() { api.ok(T('pen.ok')); } }); } },
    // ちょうどの目：58→上がり（57 は届かない）
    { id: 'goal', setup(api) { run(api, { s: ST('bell', [58, 57, 60, 60, 20], [41, 60, 12]), rolls: [2], check: m => m.finish ? null : T('goal.ng'), onMove() { api.ok(T('goal.ok')); } }); } },
    // 動かせない：場へ1
    { id: 'stuck', setup(api) {
        PH.stuck = 0;
        run(api, { s: ST('bell', [59, 58, 60, 60, 60, 60], [35, 60, 60, 12]), rolls: [3],
          onRoll(n, ctl) { PH.stuck = 1; ctl.phase = 'pass'; api.setTask(''); api.say(''); return false; },
          onPass() { api.ok(T('stuck.ok')); } });
      } },
    { id: 'win', setup(api) { run(api, { s: ST('bell', [57, 60, 60, 60, 60, 60], [30, 12, 60, 60]), rolls: [3], check: m => m.finish ? null : T('win.ng'), onMove() { api.ok(T('win.ok')); } }); } },
    // 広く知られたルール
    { id: 'pop1', setup(api) { run(api, { s: ST('popular', [], [30]), rolls: [1], onMove() { api.ok(T('pop1.ok')); } }); } },
    // 中央で取る：自分の14マス目＝中央。相手の40マス目が同じマス
    { id: 'pop2', setup(api) { run(api, { s: ST('popular', [12, 5], [40, 18]), rolls: [2], check: m => m.capture ? null : T('pop2.ng'), onMove() { api.ok(T('pop2.ok')); } }); } },
    { id: 'pop3', setup(api) {
        PH.pop3 = 0;
        run(api, { s: ST('popular', [9, 22], [16, 35]), rolls: [0],
          onRoll(n, ctl) { PH.pop3 = 1; ctl.phase = 'pass'; api.setTask(''); api.say(''); return false; },
          onPass() { api.ok(T('pop3.ok')); } });
      } },
  ];
  const taskOf = id => () => {
    if (id === 'beans') return PH.beans === 1 ? T('beans.k2') : T('beans.k');
    if (id === 'again') return PH.again ? T('again.k2') : T('again.k');
    if (id === 'stuck') return PH.stuck ? T('stuck.k2') : T('stuck.k');
    if (id === 'pop3') return PH.pop3 ? T('pop3.k2') : T('pop3.k');
    return T(id + '.k');
  };
  const ALL = PAGES.map(P => Object.assign({ title: () => T(P.id + '.t'), body: () => `<p>${T(P.id + '.b')}</p>`, task: taskOf(P.id), teardown }, P));
  ALL.unshift({ id: 'intro', title: () => T('intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), img: '../images/patolli.webp', origin: T('intro.origin'), players: T('intro.players'), time: T('intro.time'), history: T('intro.hist'), win: T('intro.win'), culture: T('intro.cult') }) });

  /* ---------------- 入口 ---------------- */
  function ensure(mount) {
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (tour && el === mountEl) return tour;
    injectCss(); mountEl = el;
    tour = RuleTour.create({
      mount: el, store: 'aicoding-patolli-rules', lang, pages: ALL, aspect: 1,
      close: () => { teardown(); O.onClose && O.onClose(); },
      play: O.onPlay ? () => { teardown(); O.onPlay(); } : null,
      lessons: O.onLessons ? () => { teardown(); O.onLessons(); } : null,
      sound: k => snd(k),
    });
    return tour;
  }
  let opened = false;
  const PatolliTour = {
    open(o = {}) {
      Object.assign(O, o);
      if (!o.onPlay && !O.onPlay) O.onPlay = null;
      const t = ensure(o.mount || mountEl || '#rulesBody');
      t.open(o.page != null ? o.page : opened ? t.page : 0); opened = true;
      return t;
    },
    render() { if (tour && tour.visible()) tour.open(tour.page); },
    setDesign(d, p) { if (d) O.design = d; if (p) O.pieces = p; PatolliTour.render(); },
    stop() { teardown(); if (tour) tour.stop(); },
    visible() { return !!(tour && tour.visible()); },
    progress() { return tour ? tour.progress() : { done: 0, total: ALL.length + 1 }; },
    PAGES: ALL.map(p => p.id).concat(['_finish']),
    _T: T, _TX: TX,
  };
  window.PatolliTour = PatolliTour;
})();
