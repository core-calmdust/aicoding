/* =====================================================================
   Senet — rules tour on the 3D table (Tutankhamun's game box, atlas/models/senet.js), told by the guide character
   (Seti, the camel). The same pages and words as the full game's tutorial (senet/tour.js, 10 languages — its texts are
   loaded and reused), the guide's own friendlier voice on top in Japanese and English:
   the game, the board and the track, the throw sticks, moving, not onto your own piece, swapping, pairs, walls, the extra
   throws, the House of Beauty, the House of Water, bearing off, passing, how to win. Every page after the first has a task
   on the 3D board: throw the four sticks (they come up as staged, so the task always works) and move a piece.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Opening the tour sets aicoding-senet-rules-seen (as the full game's rules do).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/camel-2.webp', BASE = '../senet/';
  const loadJS = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const UI = {
    ja: { name: 'セティ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', rollK: '棒をタップして投げてね', pickN: '数を選んでね', pressPass: 'パスを押してね', tapIt: '光るところをタップ', pass: 'パス', wrong: 'ちがうよ〜。もう一回！' },
    en: { name: 'Seti', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', rollK: 'Tap the sticks to throw', pickN: 'Pick the number', pressPass: 'Press Pass', tapIt: 'Tap the glowing spot', pass: 'Pass', wrong: 'Not quite — try again!' },
    zh: { name: '塞提', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', rollK: '点击木棒投掷', pickN: '选出数字', pressPass: '按“跳过”', tapIt: '点击发光的位置', pass: '跳过', wrong: '不对哦，再试一次！' },
    ko: { name: '세티', next: '다음', back: '이전', start: '대국하기', again: '다시', rollK: '막대를 탭해서 던져', pickN: '숫자를 골라', pressPass: '패스를 눌러', tapIt: '빛나는 곳을 탭해', pass: '패스', wrong: '아니야~ 다시 해 봐!' },
    es: { name: 'Seti', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', rollK: 'Toca los palos para lanzar', pickN: 'Elige el número', pressPass: 'Pulsa Pasar', tapIt: 'Toca lo que brilla', pass: 'Pasar', wrong: '¡Casi! Prueba otra vez' },
    fr: { name: 'Seti', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', rollK: 'Touche les bâtonnets pour lancer', pickN: 'Choisis le nombre', pressPass: 'Appuie sur Passer', tapIt: 'Touche ce qui brille', pass: 'Passer', wrong: 'Presque ! Réessaie' },
    pt: { name: 'Seti', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', rollK: 'Toque nos bastões para lançar', pickN: 'Escolha o número', pressPass: 'Toque em Passar', tapIt: 'Toque no que brilha', pass: 'Passar', wrong: 'Quase! Tente de novo' },
    de: { name: 'Seti', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', rollK: 'Tippe auf die Stäbe', pickN: 'Wähle die Zahl', pressPass: 'Drücke Passen', tapIt: 'Tippe auf das Leuchtende', pass: 'Passen', wrong: 'Fast! Versuch es noch einmal' },
    hi: { name: 'सेती', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', rollK: 'डंडियाँ छूकर फेंकें', pickN: 'अंक चुनें', pressPass: 'पास दबाएँ', tapIt: 'चमकती जगह छुएँ', pass: 'पास', wrong: 'लगभग! फिर कोशिश करें' },
    ar: { name: 'سيتي', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', rollK: 'المس العصيّ للرمي', pickN: 'اختر الرقم', pressPass: 'اضغط «تمرير»', tapIt: 'المس ما يضيء', pass: 'تمرير', wrong: 'قريب! حاول مجددًا' },
    ru: { name: 'Сети', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', rollK: 'Нажмите на палочки, чтобы бросить', pickN: 'Выберите число', pressPass: 'Нажмите «Пас»', tapIt: 'Нажмите на светящееся место', pass: 'Пас', wrong: 'Не совсем — попробуйте ещё!' },
    'zh-TW': { name: '塞提', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', rollK: '點擊木棒來投擲', pickN: '選擇數字', pressPass: '按［跳過］', tapIt: '點擊發光的位置', pass: '跳過', wrong: '差一點——再試一次！' },
    id: { name: 'Seti', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', rollK: 'Ketuk tongkat untuk melempar', pickN: 'Pilih angkanya', pressPass: 'Tekan Lewati', tapIt: 'Ketuk tempat yang menyala', pass: 'Lewati', wrong: 'Belum tepat — coba lagi!' },
    tr: { name: 'Seti', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', rollK: 'Atmak için çubuklara dokun', pickN: 'Sayıyı seç', pressPass: 'Pas\'a bas', tapIt: 'Parlayan yere dokun', pass: 'Pas', wrong: 'Tam değil — tekrar dene!' },
  };
  const HELLO = {
    ja: 'やあ！ぼくは<b>セティ</b>。<b>セネト</b>は古代エジプトの盤ゲームで、ツタンカーメンのお墓にも入っていたんだ。名前の意味は「通過」。4本の棒を投げて30マスを進み、<b>全部の駒を先に上げたら勝ち</b>。いっしょにやってみよう！',
    en: 'Hi! I’m <b>Seti</b>. <b>Senet</b> is a board game from ancient Egypt — Tutankhamun took one to his tomb. Its name means “passing”. Throw four sticks, run the 30 squares and <b>bear all your pieces off first</b> to win. Let’s try it!',
    zh: '你好！我是<b>塞提</b>。<b>塞尼特</b>是古埃及的棋盘游戏，图坦卡蒙墓里也有。名字意思是“通过”。投4根木棒走完30格，<b>先把全部棋子移出就赢</b>。一起试试吧！',
    ko: '안녕! 나는 <b>세티</b>. <b>세네트</b>는 고대 이집트의 보드게임으로 투탕카멘의 무덤에도 있었어. 이름의 뜻은 “지나감”. 막대 4개를 던져 30칸을 나아가 <b>먼저 말을 모두 내보내면 승리</b>. 같이 해 보자!',
    es: '¡Hola! Soy <b>Seti</b>. El <b>senet</b> es un juego del antiguo Egipto: Tutankamón se llevó uno a su tumba. Su nombre significa «paso». Lanza cuatro palos, recorre 30 casillas y <b>saca antes todas tus piezas</b>. ¡Vamos!',
    fr: 'Salut ! Je suis <b>Seti</b>. Le <b>senet</b> est un jeu de l’Égypte ancienne : Toutânkhamon en avait un dans sa tombe. Son nom veut dire « passer ». Lance quatre bâtonnets, parcours 30 cases et <b>sors tous tes pions le premier</b>. Essayons !',
    pt: 'Oi! Eu sou o <b>Seti</b>. O <b>senet</b> é um jogo do Egito Antigo — Tutancâmon levou um para o túmulo. O nome significa “passagem”. Lance quatro bastões, percorra 30 casas e <b>tire todas as peças primeiro</b>. Vamos lá!',
    de: 'Hallo! Ich bin <b>Seti</b>. <b>Senet</b> ist ein Brettspiel aus dem alten Ägypten – Tutanchamun nahm eins mit ins Grab. Der Name heißt „Vorübergehen“. Wirf vier Stäbe, lauf die 30 Felder und <b>bring als Erster alle Figuren hinaus</b>. Los geht’s!',
    hi: 'नमस्ते! मैं <b>सेती</b> हूँ। <b>सेनेट</b> प्राचीन मिस्र का खेल है — तूतनख़ामुन की कब्र में भी था। नाम का अर्थ है “पार होना”। चार डंडियाँ फेंककर 30 खाने चलें और <b>सबसे पहले सारी गोटियाँ बाहर निकालें</b>। चलो खेलें!',
    ar: 'مرحبًا! أنا <b>سيتي</b>. <b>سينيت</b> لعبة من مصر القديمة، ودُفنت مع توت عنخ آمون. اسمها يعني «العبور». ارمِ أربع عصيّ واقطع 30 مربعًا و<b>أخرج كل قطعك أولًا</b> لتفوز. هيا نجرب!',
    ru: 'Привет! Я <b>Сети</b>. <b>Сенет</b> — настольная игра Древнего Египта: Тутанхамон даже взял её с собой в гробницу. Название значит «прохождение». Бросайте четыре палочки, пройдите 30 клеток и <b>первым выведите все фишки</b>, чтобы победить. Попробуем!',
    'zh-TW': '嗨！我是<b>塞提</b>。<b>塞尼特</b>是古埃及的桌上遊戲，圖坦卡門還把它帶進了墳墓。名稱的意思是「通過」。投擲四根木棒、跑完 30 格，<b>先讓所有棋子走出棋盤</b>就贏了。來試試吧！',
    id: 'Halo! Aku <b>Seti</b>. <b>Senet</b> adalah permainan papan dari Mesir kuno — Tutankhamun membawanya ke makamnya. Namanya berarti “melintas”. Lempar empat tongkat, lalui 30 petak, dan <b>keluarkan semua bidakmu lebih dulu</b> untuk menang. Ayo coba!',
    tr: 'Merhaba! Ben <b>Seti</b>. <b>Senet</b>, antik Mısır\'dan bir masa oyunu — Tutankamon onu mezarına bile götürdü. Adı “geçiş” demek. Dört çubuk at, 30 kareyi koş ve kazanmak için <b>tüm taşlarını ilk sen çıkar</b>. Hadi deneyelim!',
  };
  // the guide's own (friendlier) words in ja / en; the other languages use senet/tour.js's texts
  const VOICE = {
    ja: { 'board.b': '3段×10マスの盤を、1から<b>逆S字</b>に30まで進むよ。道はふたりで共通なんだ。', 'board.k': '道のいちばん最後のマス（30）をタップしてね！', 'board.ok': 'せいかい！30の先が「上がり」だよ',
      'sticks.b': '片面が白い棒を4本投げて、<b>白の数</b>だけ進むよ。4本とも黒なら<b>5</b>！', 'move.b': 'きみは<b>糸巻き</b>の駒。出た数だけ、1枚を道にそって進めよう。', 'swap.b': 'ひとりでいる相手の駒にちょうど止まると<b>入れ替え</b>！相手はきみが元いたマスに下がるよ。',
      'guard.b': '同じ色が<b>2枚並ぶと守られて</b>、入れ替えできないんだ。', 'wall.b': '<b>3枚並ぶと壁</b>！相手はその先へ跳び越せないよ。', 'again.b': '<b>1・4・5</b>が出たら、動かしたあとにもう一回投げられるよ！',
      'beauty.b': 'どの駒も<b>26の美の家</b>にちょうど止まらないと先へ行けないよ。', 'water.b': '美の家から<b>1</b>で進むと<b>水の家</b>にポチャン…<b>15</b>まで戻されちゃう！', 'exit.b': '上がりの目は<b>26は5・28は3・29は2・30は1</b>。29がいちばん上がりやすいよ。',
      'pass.b': '動かせる駒がなかったら<b>パス</b>。でも1・4・5ならもう一回投げられるよ。', 'win.b': '最後の1枚を上げたら勝ち！いってみよう！' },
    en: { 'board.b': 'Three rows of ten: you run from 1 to 30 in a <b>reverse S</b>. Both players share the track.', 'board.k': 'Tap the very last square (30)!', 'board.ok': 'Right! Past 30, a piece goes off',
      'sticks.b': 'Throw four sticks, white on one side, and move by the <b>number of white sides</b>. All four dark makes <b>5</b>!', 'move.b': 'You play the <b>spools</b>. Move one along the track by your throw.', 'swap.b': 'Land right on a lone rival and you <b>swap</b>: it goes back to where you came from!',
      'guard.b': '<b>Two in a row are protected</b> — no swapping them.', 'wall.b': '<b>Three in a row make a wall</b> your rival can’t jump past!', 'again.b': 'Throw a <b>1, 4 or 5</b> and you throw again after moving!',
      'beauty.b': 'Every piece must stop exactly on <b>26, the House of Beauty</b>, before going on.', 'water.b': 'A <b>1</b> from the House of Beauty — splash! — into the <b>water</b>, and back to <b>15</b>!', 'exit.b': 'Bear off: <b>26 with 5, 28 with 3, 29 with 2, 30 with 1</b>. 29 is the easiest.',
      'pass.b': 'No move? Then <b>pass</b>. But with 1, 4 or 5 you still throw again.', 'win.b': 'Bear off your last piece and you win! Go!' },
  };
  const PAT = n => { const a = [0, 0, 0, 0]; if (n < 5) { const ix = [0, 1, 2, 3].sort(() => Math.random() - .5); for (let i = 0; i < n; i++) a[ix[i]] = 1; } return a; };
  const ST = (a, b) => ({ rule: 'std', pos: [a.slice(), b.slice()], turn: 0, winner: -1 });
  const PAGES = [
    { id: 'intro' },
    { id: 'board', s: ST([], []), kind: 'last' },
    { id: 'sticks', s: ST([1, 3, 5], [2, 4, 6]), rolls: [5], kind: 'count' },
    { id: 'move', s: ST([1, 3, 5], [12, 20]), rolls: [3] },
    { id: 'own', s: ST([4, 6, 8], [15]), rolls: [2] },
    { id: 'swap', s: ST([5, 2], [8, 14]), rolls: [3], check: m => m.capture ? null : 'swap.ng' },
    { id: 'guard', s: ST([3, 9], [6, 7, 20]), rolls: [3], glow: [6, 7], gcol: 0x6ec8ff },
    { id: 'wall', s: ST([4, 11], [6, 7, 8, 25]), rolls: [5], glow: [6, 7, 8], gcol: 0xff9b7a },
    { id: 'again', s: ST([3, 12], [20]), rolls: [4, 2], twice: true },
    { id: 'beauty', s: ST([23, 24], [10]), rolls: [3], glow: [26] },
    { id: 'water', s: ST([26, 20], [12]), rolls: [1], glow: [27, 15], check: m => m.from === 26 ? null : 'water.ng' },
    { id: 'exit', s: ST([29, 28], [18]), rolls: [2], glow: [28, 29, 30], check: m => m.finish ? null : 'exit.ng' },
    { id: 'pass', s: ST([28], [18]), rolls: [2], kind: 'pass' },
    { id: 'win', s: ST([30, 31, 31, 31, 31], [12, 22, 31, 31, 31]), rolls: [1], check: m => m.finish ? null : 'win.ng', last: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, L = Object.assign({}, UI.en, UI[ctx.lang] || {});
    try { localStorage.setItem('aicoding-senet-rules-seen', '1'); } catch (e) {}
    let stopped = false, step = 0, played = false, busy = false, timers = [], E = null, TX = null, kit = null, st = null, n = null, k = 0, phase = '', sel = -1;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const T = (key, v) => { const VO = VOICE[ctx.lang] || {}, D = (TX && (TX[ctx.lang] || TX.en)) || {}; let s = VO[key] != null ? VO[key] : D[key]; if (s == null && TX) s = TX.en[key]; if (s == null) s = ''; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] != null ? v[x] : ''); return s; };
    const SND = (window.Atlas3D && Atlas3D.senet && Atlas3D.senet.SND) || { put() {}, hop() {}, take() {}, roll() {}, dieStop() {}, ros() {}, home() {}, water() {} };
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urq{display:flex;gap:6px}.rgd .urq button{flex:1;min-width:0;max-width:64px;padding:7px 0;border-radius:12px;border:2px solid #eadfc6;background:#fff;font:900 17px var(--round,inherit);color:#2b3044;cursor:pointer;box-shadow:0 3px 0 #e2d6b8}.rgd .urq button:active{transform:translateY(2px);box-shadow:0 1px 0 #e2d6b8}'
      + '.rgd .urp{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:99px;border:0;background:#1f8fa8;color:#fff;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #13647a}'
      + '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urn{font:900 20px var(--round,inherit);color:#c9a13d;margin-inline-start:4px}.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:700}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}.rgd .urq button{padding:5px 0;font-size:16px}}';
    document.head.appendChild(css);
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; });
      let ni = 0, ci = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 3; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, s] = nodes[ni]; nd.textContent = s.slice(0, ++ci); if (ci >= s.length) { ni++; ci = 0; } } }, 22);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, s]) => { nd.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const cnt = html => { $('.cnt').innerHTML = html || ''; msg(''); };
    const tag = (html, bg, col) => `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block${bg ? `;background:${bg};color:${col}` : ''}">${html}</span>`;
    let msgT = 0;
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3200); }
    const P = () => PAGES[step];
    const waiting = () => P().id !== 'intro' && !played;
    function buttons() {
      const pg = P(), wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = pg.last && played ? L.start + ' ▶' : wait ? ({ roll: L.rollK, count: L.pickN, pass: L.pressPass }[phase] || L.tapIt) : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${PAGES.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (pg.last && played && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!(pg.last && played) && ag) ag.remove();
    }
    // the bubble keeps one height on every page (the camera frames the board above the panel)
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), cn = $('.cnt'), w = bub.clientWidth; if (!TX || !w || w === lockW) return; lockW = w;
      const keep = [tx.innerHTML, cn.innerHTML]; bub.style.minHeight = ''; let mx = 0;
      const meas = (t, c) => { tx.innerHTML = t; cn.innerHTML = c; mx = Math.max(mx, bub.offsetHeight); };
      meas(HELLO[ctx.lang] || HELLO.en, `<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div></div>`);
      PAGES.forEach(pg => { if (pg.id === 'intro') return; const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`;
        [tag(`🥢 ${L.rollK}`), tag(`🥢 <span class="urn">= 5</span>　👆 ${T(pg.id + '.k')}`), tag(`✓ ${T(pg.id + '.ok')}`), `<div style="display:grid;gap:6px;width:100%"><b>${T('sticks.k2')}</b><div class="urq"><button>1</button></div></div>`, `<div style="display:grid;gap:6px"><span>${T('pass.k2')}</span><div><button type="button" class="urp">${L.pass}</button></div></div>`].forEach(c => meas(t, c)); });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    const legal = () => n ? E.legalMoves(st, n) : [];
    function marks() {
      if (!kit) return;
      const pg = P(); kit.marks.clear();
      if (pg.kind === 'last') { if (!played) { kit.marks.path(1, 30, 0xffe27a); kit.marks.ring(30, 0xffd65a); } else kit.marks.cell(30, 0x3df59a, .45); }
      if (!played) (pg.glow || []).forEach(i => kit.marks.glow(i, pg.gcol || (i === 27 ? 0x4da3ff : 0xffd65a), .5));
      if (phase === 'roll' && !busy) kit.marks.frame();
      if (phase === 'move') {
        const ms = legal(), show = sel >= 0 ? ms.filter(m => m.from === sel) : [];
        for (const m of ms) kit.marks.ring(m.from, 0xffd65a);
        for (const m of show) { const col = m.capture ? 0xff5d5d : m.water ? 0x4da3ff : 0x3df59a; if (m.finish) kit.marks.tray(0, col, st.pos[0].filter(p => p >= 31).length); else { kit.marks.cell(m.to, col, .42); kit.marks.ring(m.to, col); } }
      }
    }
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; phase = ''; n = null; k = 0; sel = -1;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      if (pg.id === 'intro') {
        say(HELLO[ctx.lang] || HELLO.en);
        cnt(`<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div></div>`);
        if (kit) { st = E.newGame('std', 0); kit.sync(st); kit.restSticks(0, null); kit.marks.clear(); }
        buttons(); return;
      }
      st = E.clone(pg.s); kit.sync(st); kit.restSticks(0, null);
      phase = pg.kind === 'last' ? 'tap' : 'roll';
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      cnt(tag(phase === 'roll' ? `🥢 ${L.rollK}` : `👆 ${T(pg.id + '.k')}`));
      marks(); buttons();
    }
    function ok(textKey, v) {
      played = true; busy = false; phase = 'done'; sel = -1; marks(); cnt(tag(`✓ ${T(textKey, v)}`, '#e8f8ee', '#16784a')); SND.home(); buttons();
      if (!P().last) { const s0 = step; if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), 1400 + Math.min(3400, T(textKey).length * 45), () => step === s0); later(() => { if (step === s0 && played) go(step + 1); }, 1400 + Math.min(3400, T(textKey).length * 45)); }
    }
    function ng(textKey, v, html) { msg(`<span>${html || (textKey ? T(textKey, v) : L.wrong)}</span>`); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    async function roll() {
      const pg = P(); if (phase !== 'roll' || busy) return;
      busy = true; marks();
      const v = pg.rolls[Math.min(k, pg.rolls.length - 1)]; k++;
      await kit.roll(0, PAT(v)); if (stopped) return;
      n = v; busy = false;
      if (pg.kind === 'count') {
        phase = 'count'; marks();
        cnt(`<div style="display:grid;gap:6px;width:100%"><b>${T('sticks.k2')}</b><div class="urq">${[1, 2, 3, 4, 5].map(x => `<button type="button" data-snn="${x}">${x}</button>`).join('')}</div></div>`);
        $('.cnt').onclick = e => { const b = e.target.closest('[data-snn]'); if (!b || phase !== 'count') return; if (+b.dataset.snn === n) { $('.cnt').onclick = null; ok('sticks.ok'); } else ng('sticks.ng'); };
        buttons(); return;
      }
      if (pg.kind === 'pass') {
        phase = 'pass'; marks();
        cnt(`<div style="display:grid;gap:6px"><span>${T('pass.k2')}</span><div><button type="button" class="urp" data-snpass="1">${L.pass}</button></div></div>`);
        $('.cnt').onclick = e => { if (e.target.closest('[data-snpass]') && phase === 'pass') { $('.cnt').onclick = null; ok('pass.ok'); } };
        buttons(); return;
      }
      phase = 'move'; marks();
      cnt(tag(`🥢 <span class="urn">= ${n}</span>　👆 ${pg.twice && k === 2 ? T('again.k2') : T(pg.id + '.k')}`));
      const ms = legal(); if (ms.length === 1) { sel = ms[0].from; const kk = st.pos[0].indexOf(sel); if (kk >= 0) kit.lift(0, kk, true); marks(); }
      buttons();
    }
    function why(from) {
      const to = from + n, b = E.board(st);
      if (from >= 28) return T('exitNeed');
      if (from < 26 && to > 26) return T('over26');
      for (let q = from + 1; q < to; q++) if (b[q] === 1) { let a = q, z = q; while (b[a - 1] === 1) a--; while (b[z + 1] === 1) z++; if (z - a + 1 >= 3) return T('wall'); }
      if (b[to] === 0) return T('own');
      if (b[to] === 1) return T('guard');
      return T('noMove');
    }
    async function play(m) {
      const pg = P();
      if (pg.check) { const bad = pg.check(m, k); if (bad) { ng(bad); return; } }
      busy = true; phase = 'anim'; const kk = st.pos[0].indexOf(m.from); if (kk >= 0) kit.lift(0, kk, false); sel = -1; kit.marks.clear();
      await kit.move(0, m, { onStep: () => SND.hop(), onHit: () => SND.take(), onWater: () => SND.water(), onLand: () => (m.finish ? SND.home : SND.put)() });
      if (stopped) return;
      const r = E.apply(st, m); st = r.state; st.turn = 0; n = null; busy = false; kit.sync(st);
      if (pg.twice && r.again && k < pg.rolls.length) { SND.ros(); phase = 'roll'; marks(); cnt(tag(`🔁 ${T('again')}　🥢 ${L.rollK}`, '#fff6dd', '#8a5a00')); buttons(); return; }
      ok(pg.id + '.ok');
    }
    function onClick(e) {
      if (stopped || busy || T3.wasDrag() || e.target.closest('.rgd') || !kit) return;
      const pg = P(); if (pg.id === 'intro' || played) return;
      const h = kit.hit(e);
      if (phase === 'tap') { if (h && h.sq === 30) { ok('board.ok'); return; } ng('board.ng'); return; }
      if (phase === 'roll') { roll(); return; }
      if (phase !== 'move' || !h) return;
      const ms = legal();
      if (sel >= 0) { const m = ms.find(x => x.from === sel && (h.tray ? x.finish : !x.finish && x.to === h.sq)); if (m) { play(m); return; } }
      let from = -1;
      if (h.sq && st.pos[0].includes(h.sq)) from = h.sq;
      else if (h.sq && st.pos[1].includes(h.sq)) { ng(null, null, T('notMine')); return; }
      if (from < 0 && h.sq) { const c = ms.filter(x => !x.finish && x.to === h.sq); if (c.length === 1) { play(c[0]); return; } }
      if (from < 0 && h.tray) { const c = ms.filter(x => x.finish); if (c.length === 1) { play(c[0]); return; } }
      if (from < 0) return;
      const m = ms.find(x => x.from === from);
      if (!m) { ng(null, null, why(from)); return; }
      if (sel >= 0) { const k0 = st.pos[0].indexOf(sel); if (k0 >= 0) kit.lift(0, k0, false); }
      if (sel === from) { play(m); return; }
      sel = from; const k1 = st.pos[0].indexOf(from); if (k1 >= 0) kit.lift(0, k1, true); marks();
    }
    $('[data-a=next]').onclick = () => { if (P().last && played) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === ' ' && phase === 'roll') { e.preventDefault(); e.stopPropagation(); roll(); return; }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    say('…'); buttons();
    loadJS(BASE + 'engine.js?v=1', () => !!window.SenetEngine).then(() => loadJS(BASE + 'board2d.js?v=1', () => !!window.SenetBoard2D)).then(() => loadJS(BASE + 'tour.js?v=1', () => !!window.SenetTour)).then(() => {
      if (stopped) return; E = window.SenetEngine; TX = window.SenetTour && SenetTour._TX;
      kit = window.SenetKit.make(T3, { sfx: x => SND[x] && SND[x](), top: true, stage: true });
      later(() => go(0), 250);
    }).catch(() => say('⚠'));
    const sess = {
      stop() { stopped = true; if (kit) kit.stop(); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); removeEventListener('resize', lockH); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); },
      panel: el,
      _debug: { step: () => step, phase: () => phase, played: () => played, n: () => n, sel: () => sel, legal: () => E && st ? legal() : [], st: () => st && st.pos.map(a => a.slice()), cell: sq => kit && kit.projCell(sq), sticks: () => kit && kit.projSticks(0), kit: () => kit, go },
    };
    window.__rulesSess = sess;
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.senet = { start };
})();
