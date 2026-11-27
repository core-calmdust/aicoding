/* =====================================================================
   Fanorona — the lessons on the 3D table (atlas/lessons3d.js DATA.fanorona, 2026-11-27 担当E).
   fanorona/lessons.json (the same file as the 2D lessons, progress the full game's 'aicoding-fanorona-lessons' { id: { best, clear } }),
   told by チェッカニ (Checkrab, the guide of atlas/rules/fanorona.js and the 3D puzzles atlas/games/fanorona-pz.js).
   Every reason is a fact of the board, read by fanorona/ls-facts.js (the 2D and tools/lesson-verify-fanorona-ls.js read the same):
   how many pieces a move's line takes, what ends a shorter line (the board's edge, your own piece, an empty point), the same step's
   other line (approach / withdrawal); for b_chain the total of a capture chain, whether a move stopped while its piece could go on,
   or went to its end (no capture left), and whether it is the answer's piece.
   No coordinates on the 3D board: the answer is the green move, yours the red one.
   Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game until they are.
   AtlasLsFanorona.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_approach', 'b_withdraw', 'b_choose', 'b_chain'];
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const KN = { A: '接近', W: '離脱' };
  // ---------- チェッカニ's words (ja) ----------
  const JA = {
    intro: {
      b_approach: 'やっほー、チェッカニだカニ！ ファノロナは<b>相手の玉を全部取ったら勝ち</b>のゲーム。1歩動いた<b>すぐ先の相手の玉</b>と、その後ろに<b>続けて並ぶ玉</b>を一列まとめて取れる。これが<b>接近</b>だよ。<br>列は<b>空いた点・きみの玉・盤のはし</b>で切れるんだ。いちばん長い列を探そう！',
      b_withdraw: 'こんどは<b>離脱</b>だカニ。となりの相手の玉から<b>まっすぐ離れる</b>ように1歩動くと、その玉と、<b>向こうに続けて並ぶ相手の玉</b>を一列まとめて取れる。<br>列は<b>空いた点・きみの玉・盤のはし</b>で切れるよ。そこまで数えて、いちばん多く取れる手を探そう！',
      b_chain: 'カニカニ、取った玉は<b>同じ番のうちに続けて取れる</b>んだ！ ただし<b>毎回向きを変えて</b>、<b>一度いた点には戻れない</b>よ。<br>途中で止めることもできるけど、止めると取れる数がへっちゃう。どの道を通るかでも数が変わるから、<b>最後までたどって合計を数えよう</b>！',
      b_choose: '1歩で<b>接近と離脱の両方</b>の取りができることがあるカニ。でも取れるのは<b>どちらか一方の列だけ</b>。<br>そんなときは前の列（接近）と後ろの列（離脱）を数えて、<b>多いほうを選ぶ</b>んだ。ほかの玉の取りともくらべて、いちばん多く取れる手を探そう！',
    },
    ask: {
      b_approach: ['近づいて取る手のうち、いちばん多く取れるのはどれ？', 'カニカニ、列がいちばん長いのはどの接近かな？', 'どの玉を動かすと、相手の玉をたくさん一列で取れる？', '前に並ぶ相手の玉を数えてみよう。いちばん多いのは？', '接近で取れる数がいちばん多い手を指してね。'],
      b_withdraw: ['離れて取る手のうち、いちばん多く取れるのはどれ？', 'カニッ、後ろに長い列があるのはどの玉？', 'まっすぐ離れたとき、いちばん多く取れる手は？', '離脱で取れる列を数えくらべてみよう。いちばんは？', 'どの玉を離れさせると、たくさん取れるかな？'],
      b_chain: ['続けて取って、合計がいちばん多くなる手はどれ？', 'カニカニ、どの玉でどの道を通ると、いちばん多く取れる？', '止めずに進む道を探そう。合計のいちばん多い連続取りは？', '取ったあと、まだ取れるかな？ いちばん多く取れる手を指してね。', '道の分かれ目に気をつけて。合計がいちばん多いのはどれ？'],
      b_choose: ['接近か離脱か。いちばん多く取れる取り方はどれ？', 'カニカニ、両方で取れる1歩があるよ。どっちの列を選ぶ？', '前の列と後ろの列、多いのはどっち？ いちばんの手を指してね。', 'ほかの玉の取りともくらべて、いちばん多く取れるのは？', '列を数えてから選ぼう。いちばん多く取れる手は？'],
    },
    askLast: ['カニッ、これで最後！ いちばん多く取れる手はどれ？', 'ラストの問題だね。列をじっくり数えて決めよう！'],
    hint: {
      b_approach: ['光っているのは、いま取れる玉。それぞれ、動いた先のすぐ前の列を数えてみて！', '光る玉ごとに、1歩先の向こうへ相手の玉がいくつ続くか数えよう。', '列は空いた点・きみの玉・盤のはしで切れるよ。どこで切れるか見てね。', 'カニ、前に続く相手の玉がいちばん多い向きを探そう！', '光る玉の進む先を指でなぞって、列の長さをくらべてみて。'],
      b_withdraw: ['光っているのは、いま取れる玉。動く向きと反対側の列を数えてみて！', '光る玉のすぐ後ろから、相手の玉がいくつ続くか数えよう。', '後ろの列が、空いた点・きみの玉・盤のはしのどこで切れるか見てみよう。', 'カニ、離れる玉の背中側に長い列があるのはどれかな？', '光る玉ごとに、後ろに並ぶ相手の玉をくらべてみよう。'],
      b_chain: ['光っているのは、いま取れる玉。それぞれ、取ったあとまだ続けて取れるか、最後までたどってみて！', '1回取ったら、その先でまた取れる向きがないか探そう。向きは毎回変えるんだよ。', 'カニ、道が分かれるところでは、どっちへ進むと合計が多くなるか数えくらべてね。', '光る玉ごとに、連続取りの道を指でなぞって合計を数えよう。', '一度いた点には戻れないよ。それも気にしながら道をたどってみて。'],
      b_choose: ['光っているのは、いま取れる玉。両方で取れる1歩は、前と後ろの列を両方数えよう！', '同じ1歩でも、接近と離脱で取れる数がちがうよ。多いほうはどっち？', 'カニ、前の列と後ろの列、長いほうを選ぶのがコツだよ。', '光る玉ごとに、取れる列の長さをくらべてみて。', '選べる1歩では、短いほうの列を選ばないように気をつけてね。'],
    },
    cheer: ['正解だカニ！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすが！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってるね！', '目が慣れてきたね。次へ！', 'その数え方、次でも使えるはず！', 'いい流れ。もう一問いこう！'],
    soft: ['ドンマイ！', 'だいじょうぶ！', 'よくある見落としだよ。', 'いっしょに数えてみよう！', '次はきっと見つかる！'],   /* 追66・追68: said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 */
    w: {
      b_approach: ['近づいた先に相手の玉が{a}つ並んでいたね。一列まとめて{a}つ取り！', 'カニッ、いちばん長い列を見つけたね。接近で{a}つ取れたよ。', '前に続く相手の玉は{a}つ。ほかのどの手よりも多いんだ。', '列の切れ目まできっちり数えられたね。{a}つまとめていただき！', '{a}つ並んだ列にまっすぐ近づけたね。お見事な接近だカニ。'],
      b_withdraw: ['離れた背中側に相手の玉が{a}つ並んでいたね。一列まとめて{a}つ取り！', 'カニッ、いちばん長い後ろの列を見つけたね。離脱で{a}つ！', '後ろに続く相手の玉は{a}つ。ほかのどの手よりも多いんだ。', '列の切れ目まで後ろ向きに数えられたね。{a}つまとめていただき！', 'まっすぐ離れて{a}つ取り。向きの選び方もばっちりだカニ。'],
      b_chain: ['{sa}回続けて、合計{a}つ取り！ 最後まで止めずに進めたね。', 'カニッ、{sa}回の連続取りで{a}つ！ ほかのどの道よりも多いんだ。', '道の分かれ目でも正しい向きを選べたね。{sa}回続けて合計{a}つだよ。', '止めずに{sa}回取りきって、合計{a}つまとめていただき！', '最後までたどれたね。{sa}回続けて{a}つ、いちばん多い連続取りだカニ。'],
      b_choose: ['この一歩は接近と離脱の両方で取れたけど、{ka}の列なら{a}つ。多いほうを選べたね！', 'カニッ、{ka}を選んで{a}つ取り！ もう一方の列より多いんだ。', '前と後ろをくらべて、{ka}の{a}つを選んだね。ほかのどの手よりも多いよ。', '{a}つ取れる{ka}を選べたね。数えてから選ぶのがコツだカニ。', '両方で取れる一歩で、長いほうの{ka}を選んだね！ {a}つまとめていただき。'],
    },
    n: {
      edge: ['赤い手の列は{c}つで、その先は盤のはし。緑の手なら{a}つまとめて取れたんだ。', 'カニ、赤は{c}つ取ったところで盤のはしに着くから、列が終わっちゃう。緑の列なら{a}つだよ。', '赤の列は盤のはしまでで{c}つ。緑の手なら{a}つ並んだ列を取れたんだ。', '盤のはしで列が切れるから、赤は{c}つだけ。緑なら{a}つまとめて取れたよ。', 'カニッ、赤の列は盤のはしで終わりだから{c}つ。緑の手を選んでいたら{a}つまとめて取れたんだ。'],
      mine: ['赤い手の列は{c}つで、その先にきみの玉がいて切れちゃう。緑の手なら{a}つ取れたんだ。', 'カニ、赤の列はきみの玉のところで止まるから{c}つどまり。緑なら{a}つ！', '赤の列は、きみの玉にぶつかるから{c}つで止まるんだ。緑の手なら{a}つ取れたよ。', '自分の玉の向こうは取れないから、赤は{c}つだけ。緑なら{a}つ取れたんだ。', 'カニッ、赤の列のすぐ先にきみの玉がいるから{c}つで終わり。緑なら{a}つの列を丸ごと取れたよ。'],
      empty: ['赤い手の列は{c}つで、その先は空いた点。そこで列が切れるんだ。緑の手なら{a}つ取れたよ。', 'カニ、赤は{c}つ目の先が空いた点だから、そこまでで{c}つ。緑の列は{a}つ！', '赤の列は空いた点で途切れて{c}つ。緑の手なら{a}つ続く列を取れたんだ。', '空いた点のところで列が切れるから、赤は{c}つだけ。緑なら{a}つ取れたよ。', 'カニッ、赤の列は{c}つ目のあとが空いた点だから、そこで終わり。緑の列なら{a}つ続いていたんだ。'],
      stop: ['赤は{c}つ取ったところで止めちゃったけど、まだ続けて取れたんだ。緑のように最後まで進むと合計{a}つ！', 'カニ、赤は{c}つで止まっちゃった。その先もまだ続けて取れたよ。緑の道なら最後まで行って{a}つ！', '赤は緑と同じ道の途中で止めたんだ。まだ続けて取れたから、最後まで進むと合計{a}つ。赤だと{c}つだよ。', '止めるのが早かったね。赤は{c}つだけど、まだ続けて取れたから、緑のように進めば{a}つ取れたんだ。', 'カニッ、赤のところで止めると{c}つ。そこからまだ続けて取れて、緑の終わりまで行けば合計{a}つだよ。'],
      stopx: ['赤は{c}つで止めたけど、その玉はまだ続けて取れたよ。それに緑の道なら合計{a}つ取れたんだ。', 'カニ、赤は{c}つで止まったけど、まだ続けて取れたんだ。緑の道なら最後まで行って合計{a}つだよ。', '赤のところからもまだ続けて取れたね。でも合計がいちばん多いのは緑の{a}つ。赤は{c}つだよ。', '赤は{c}つで止めちゃったけど、その先もまだ続けて取れた。緑の道を選べば{a}つ取れたんだ。', 'カニッ、赤は{c}つ。止めずに続けられたし、道を緑のほうへ選べば合計{a}つだったよ。'],
      deadSame: ['赤の道は{c}つ取ったところで、もう取れる玉がない行き止まり。同じ玉でも緑の道を通れば合計{a}つ！', 'カニ、赤の道だと{c}つ取ったら、もう取れる玉がないんだ。分かれ目で緑のほうへ進めば{a}つ取れたよ。', '同じ玉でも、通る道で数が変わるんだ。赤の道は{c}つで行き止まり、緑の道なら合計{a}つ。', '赤の道は{c}つ目のあと、もう取れる玉がないから止まっちゃう。緑の道を選んでいたら{a}つ取れたんだ。', 'カニッ、赤は{c}つで行き止まり。同じ玉の緑の道なら、合計{a}つまで続いたよ。'],
      deadOther: ['赤の玉は{c}つ取ったら、もう取れる玉がないんだ。緑の玉の連続取りなら合計{a}つ取れたよ。', 'カニ、赤の玉の取りは{c}つで行き止まり。緑の玉なら続けて取って合計{a}つ！', '赤の玉だと{c}つ取ったところで、もう取れる玉がない。緑の玉で連続取りすれば{a}つだよ。', '赤は{c}つで行き止まりになる玉なんだ。緑の玉なら合計{a}つの連続取りができたよ。', 'カニッ、赤の玉は{c}つ取ったら行き止まり。緑の玉で道をたどれば合計{a}つ取れたんだ。'],
      same: ['赤は同じ一歩でも{kx}の列を選んで{c}つ。緑の{ka}を選んでいたなら{a}つ取れたんだ。', 'カニ、その一歩は両方で取れたけど、赤の{kx}だと{c}つだけ。緑の{ka}なら{a}つ！', '同じ動きでも、{kx}だと{c}つ・緑の{ka}なら{a}つ。多いほうを選びたかったね。', '両方で取れる一歩だから、列は選べたんだ。赤の{kx}は{c}つ、緑の{ka}なら{a}つだよ。', 'カニッ、選んだ{kx}の列は{c}つだけ。もう一方の緑の{ka}なら{a}つ取れたんだ。'],
    },
  };
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const fill0 = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m);
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  const engine = () => (typeof window !== 'undefined' && window.FanoronaEngine) || (typeof require === 'function' ? require('../fanorona/engine.js') : null);
  const facts = () => (typeof window !== 'undefined' && window.FanoronaLsFacts) || (typeof require === 'function' ? require('../fanorona/ls-facts.js') : null);
  // the words for move u (lang ja: チェッカニ's; else the 2D words, the moves named by their marks). tx: the 2D text getter, V: the voice
  function words(id, P, u, lang, tx, V, last, fill) {
    const E = engine(), F = facts(); E.setRule('sivy');
    const f = F.fact(E, id, P.s, u), right = f.k === 'most', v = { c: f.c, a: f.a, ka: KN[f.akind], kx: KN[f.kind], sa: f.sa, sc: f.sc };
    const CH = id === 'b_chain', stop = CH && (f.k === 'stop' || f.k === 'stopx');   // (b_chain: stopped while the piece could go on / went to its end)
    if (lang === 'ja') {
      if (right) return { f, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[id]), v)}${last ? '' : ' ' + V.v(JA.push)}`.replace(/(カニ！) カニッ?、/, '$1 ') };   // (the tic once)
      const n = CH ? JA.n[stop ? f.k : f.same ? 'deadSame' : 'deadOther'] : f.k === 'same' ? JA.n.same : JA.n[f.end] || JA.n.empty;
      return { f, html: `${V.v(JA.soft)} ${fill(V.v(n), v)}` };
    }
    const key = right ? '.why' : stop ? '.ngStop' : f.k === 'same' ? '.ngSame' : '.ng';
    return { f, html: tx('ls.' + id + key, lang, Object.assign(v, { m: SPOT('ok'), x: SPOT('ng') })) };
  }
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-fanorona-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../fanorona/lessons.json?v=7'), ld('../fanorona/i18n.js?v=7'),
          loadJs('../fanorona/engine.js?v=fb5s-pro1-mt1-aq4', () => !!window.FanoronaEngine).then(() => loadJs('../fanorona/ls-facts.js?v=2', () => !!window.FanoronaLsFacts))])
          .then(([d, a]) => { const w = { I18N: {} }; try { new Function('window', 'I18N', a)(w, w.I18N); } catch (e) { console.warn('[lessons3d] fanorona texts', e); }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.fanorona ? AtlasMini.fanorona(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's pieces: every piece that can capture now (never the answer's piece alone, 追52)
      hintPts(id, P) { const E = window.FanoronaEngine, F = window.FanoronaLsFacts; if (!E || !F) return []; E.setRule('sivy'); return F.hint(E, id, P.s); },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 5), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v), tx = (k, l, v) => this.tx(k, l, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: P.s.side }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => words(id, P, u == null ? P.best : u, lang, tx, V, last, fill).html;
          o.ng = u => { if (u == null || P.ok.includes(u)) { const E = window.FanoronaEngine; E.setRule('sivy'); u = E.Pos.from(P.s).moves(true).find(x => !P.ok.includes(x)); }   // (asked for the answer itself: the words for a wrong move)
            return words(id, P, u, lang, tx, V, last, fill).html; };
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= fanorona/app.js problemPoints: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side, lock: true } } : null; },
    };
    return D;
  }
  // (tools/lesson-verify-fanorona-ls.js) the words for every move in every language, as the 3D says them (line k of each list)
  let I18N = null;
  function sayText(id, P, u, lang, k) {   // k: every list says its line k (mod its length)
    if (!I18N && typeof require === 'function') { const fs = require('fs'), path = require('path'), w = { I18N: {} }; new Function('window', 'I18N', fs.readFileSync(path.join(__dirname, '../fanorona/i18n.js'), 'utf8'))(w, w.I18N); I18N = w.I18N; }
    const tx = (k, l, v) => { let x = I18N[l] && I18N[l][k]; if (x === undefined) x = I18N.en[k]; return fill0(x || '', v || {}); };
    const V = { v: list => list[(k || 0) % list.length] };
    return words(id, P, u, lang, tx, V, false, fill0).html;
  }
  const API = { make, JA, READY, KN, sayText, words };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsFanorona = API;
})();
