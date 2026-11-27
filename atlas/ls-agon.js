/* =====================================================================
   Agon — the lessons on the 3D table (atlas/lessons3d.js DATA.agon, 2026-11-27 担当F).
   agon/lessons.json (the same file as the 2D lessons, progress the full game's 'aicoding-agon-lessons' { id: { best, clear } }),
   told by キンダイスン (Goldpup, the guide of atlas/rules/agon.js and the 3D puzzles atlas/games/agon-pz.js).
   Every reason is a fact of the board, read by agon/ls-facts.js (the 2D and tools/lesson-verify-agon-ls.js read the same):
   b_step  — a step along the same ring (not inwards) / a step inwards that the enemy's next move sandwiches (the gold move) /
             the one step inwards after which nothing of yours can be sandwiched;
   b_capture — the move that sandwiches an enemy piece / a move next to an enemy piece with nothing of yours beyond it (an
             empty cell, the board's edge, another enemy piece) / a move next to no enemy piece.
   No coordinates on the 3D board: the answer is the green move, yours the red one, the enemy's capturing move gold.
   Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game until they are.
   AtlasLsAgon.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_step', 'b_capture'];
  // ---------- キンダイスン's words (ja) ----------
  const JA = {
    intro: {
      b_step: 'ワンワン、キンダイスンだよ！ アゴンは<b>女王を王座に座らせて、まわりの6マスを自分のガードでうめたら勝ち</b>のゲーム。駒は<b>同じ輪の上か、1つ内側の輪へ1歩</b>ずつ動いて、外へは戻れないんだ。<br>内側へ進むときは、<b>相手の次の手で一直線にはさまれないマス</b>を選ぼう！',
      b_capture: '動かした駒と自分のもう1枚で、相手の駒を<b>一直線にはさむと捕獲</b>だワン。捕まった駒は盤に残るけど、持ち主は<b>次の手番を置き直しに使う</b>から、1手の得になるんだ。<br>相手の駒のとなりへ行くだけじゃ捕まらない。<b>その向こうに自分の駒がいる一直線</b>を探そう！',
    },
    ask: {
      b_step: ['内側へ進めて、しかも次にはさまれない1歩はどれかな？', '1つ内側の輪へ、安全に進める駒はどれ？', '内側への1歩のうち、相手にはさまれないのはどれだろう？', 'ワン、内側へ進む手を指してね。相手の次の手もちゃんと見て！', '進んだ先のとなりをよく見て。安全に内側へ入れる1歩は？'],
      b_capture: ['一直線のはさみ取りで、相手の駒を捕まえられる手はどれ？', 'ワン、捕獲できる1手を探してね！', '自分の駒と駒のあいだに相手の駒をはさめる手は？', 'どの駒をどこへ動かすと、相手の駒を捕まえられるかな？', 'はさみ取りのチャンスがあるよ。どの手かな？'],
    },
    askLast: {
      b_step: ['これで最後の問題だワン！ 安全に内側へ進む1歩はどれ？', 'ラストの問題。相手の次の手まで読んで、内側への1歩を選ぼう！'],
      b_capture: ['これで最後だワン！ 相手の駒を捕まえる手はどれ？', 'ラストの問題。一直線をよく見て、はさみ取ろう！'],
    },
    hint: {
      b_step: ['光っているのが内側へ進める駒。進んだ先のとなりに相手の駒がいたら、反対側のマスへ相手が来られるか見てみて！', '光る駒ごとに、内側の行き先を見てみよう。反対側のマスへ相手が1歩で来られたら危ないワン。', 'となりに相手の駒がない行き先は安心。いるときは、反対側のマスが空いていて相手が来られるか確かめてね。', '光っている駒の内側への1歩を、1つずつ相手の気持ちで見てみよう！', '内側へ入ったあと、相手の駒と駒のあいだにならないか考えてみて。'],
      b_capture: ['光っているのは、相手の駒のとなりへ動ける駒。その相手の駒の向こうに、きみの駒がいるかな？', '相手の駒をはさむには、向こう側に自分の駒が必要だワン。光る駒の行き先ごとに確かめよう。', '一直線に「行き先・相手の駒・きみの駒」と並ぶ形を探してみて！', '相手の駒のとなりへ行くだけじゃ捕まらないよ。その先のマスを見てね。', '光る駒の行き先を1つずつ、向こう側まで見通してみよう！'],
    },
    cheer: ['正解だワン！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすが！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってるね！', '目が慣れてきたね。次へ！', 'その見方、次でも使えるはず！', 'いい流れ。もう一問いこう！'],
    soft: ['ドンマイ！', 'だいじょうぶ！', 'よくある見落としだよ。', 'いっしょに見てみよう！', '次はきっと見つかる！'],   /* 追66・追68: said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 */
    w: {
      b_step: ['内側の輪へ1歩、しかも相手の次の手でもはさまれないマスだね！', 'ワン、王座に1歩近づいたよ。そこなら相手がどう動いてもはさめないんだ。', '安全な内側の1歩を見つけたね。ほかの内側への手は、相手にはさまれちゃうんだ。', '内側へ進んで、となりの形もばっちり。相手は1手ではさめないワン。', '相手の次の手まで見て選べたね。内側へ入っても捕まらない1歩だよ。'],
      b_capture: ['捕獲成功！ 相手は次の番を置き直しに使うから、1手の得なんだ。', 'ワン、はさみ取りが決まった！ 捕まったガードは外の輪へ置き直しになるよ。', 'きみの駒と駒のあいだに相手の駒が入ったね。お見事な捕獲だワン。', '向こう側の自分の駒まで見えていたね。きれいに決まった！', '一直線の形を見つけて捕獲。相手は置き直しに1手使うんだ。'],
    },
    n: {
      side: ['赤い手は同じ輪の上を横へ動く1歩で、内側へは進んでいないんだ。緑の手なら1つ内側の輪へ入れたよ。', 'ワン、赤は輪が変わらない横への1歩だから、王座に近づかないんだ。緑の手が内側への安全な1歩だったよ。', '赤の手は同じ輪の上だから、王座からの近さは変わらないの。緑の手なら内側へ進めて、はさまれもしないんだ。', '同じ輪の上を横へ動くだけだと、王座に近づかないよね。緑の手は1つ内側の輪へ進む1歩だワン。', '赤は同じ輪の上での1歩だから、内側へは進めていないの。緑の手を見てみて！'],
      trap: ['赤い手で内側へは進めたけど、相手が金色の手で動くと、一直線にはさまれて捕まっちゃう。緑の手なら安全だったワン。', '赤の行き先は、となりに相手の駒がいて、反対側へも相手が来られるマス。金色の手ではさまれるんだ。緑の1歩なら大丈夫！', '内側へ進んだのはいいね。でも金色の手で相手が入ってくると、赤の駒がはさまれちゃう。緑の手を見てみて！', 'ワン、赤は相手の金色の1手で捕まる場所なんだ。緑の手なら内側へ入っても、はさまれないよ。', '赤の駒は、金色の手のあと相手の駒2枚のあいだになるから、捕獲されちゃうの。緑が安全な内側の1歩だったんだ。'],
      none: ['赤い手の行き先のとなりには相手の駒がいないから、何もはさめないんだ。緑の手なら捕獲できたワン。', '赤の手は相手の駒にくっついていないから、はさめないの。はさむには、まず相手の駒のとなりへ行かなきゃ。緑の手を見てみて！', 'ワン、赤の行き先のまわりに相手の駒はいないから、何も捕まらないよ。緑の手が一直線にはさむ手だったんだ。', '赤だと相手の駒に届かないね。緑の手なら、きみの駒と駒で相手をはさめたよ。', '赤の行き先のとなりに相手の駒は1枚もいないから、はさめないんだ。緑の手で捕獲できたよ。'],
      empty: ['赤の手は相手の駒のとなりへ行くけど、その向こうは空きマス。はさむ相棒がいないんだ。緑の手なら捕獲できたワン。', '赤は相手の駒にくっついたね。でも向こう側が空いているから、はさめないの。緑の手を見てみて！', 'ワン、赤のとなりの相手の駒は、向こう側が空きマス。一直線に自分の駒がいないと捕まらないんだ。緑なら捕獲できたよ。', '相手の駒の向こうが空いていると、はさみ取りにならないんだ。緑の手は向こう側にきみの駒がいる形だよ。', '赤の手だと、相手の駒の先は空きマスのまま。緑の手なら一直線にはさめたんだ。'],
      edge: ['赤の手は相手の駒のとなりへ行くけど、その向こうは盤のはし。はさむことはできないんだ。緑の手なら捕獲できたワン。', '赤のとなりの相手の駒は盤のはしにいて、向こう側にマスがないから、はさめないの。緑の手を見てみて！', 'ワン、盤のはしの駒は、向こう側から押さえられないんだ。緑の手なら一直線にはさめたよ。', '相手の駒の先が盤のはしだと、はさみ取りにならないの。緑の手は向こう側にきみの駒がいる形だよ。', '赤の手だと、相手の駒の向こうは盤の外。緑の手で捕獲できたんだ。'],
      enemy: ['赤の手は相手の駒のとなりへ行くけど、その向こうにも相手の駒。一直線にきみの駒がいないから、はさめないワン。緑の手を見てみて！', '赤のとなりは相手の駒が2枚並んだ列。はさめるのは1枚のときだけなんだ。緑の手なら捕獲できたよ。', 'ワン、相手の駒の向こうも相手の駒。向こう側にきみの駒がいないから、捕まらないんだ。緑の手を見てね。', '相手の駒が続いていると、はさみ取りにならないの。緑の手は向こう側にきみの駒がいる形だよ。', '赤の先は相手の駒が2枚。緑の手なら1枚を一直線にはさめたんだ。'],
      mixed: ['赤の手は相手の駒のとなりへ行くけど、どの駒も向こう側にきみの駒がいないから、はさめないんだ。緑の手なら捕獲できたワン。', '赤がくっついた相手の駒は、どれも向こう側にきみの駒がいないから、はさめないの。緑の手を見てみて！', 'ワン、赤のとなりの相手の駒は、どれも一直線の先に自分の駒がいないんだ。緑なら捕獲できたよ。', 'となりの相手の駒は、どの1枚も向こう側にきみの駒がいないから、はさめないね。緑の手は捕獲できる形だよ。', '赤の手だと、どの相手の駒もはさめないの。緑の手で一直線にはさめたんだ。'],
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
  const engine = () => (typeof window !== 'undefined' && window.AgonEngine) || (typeof require === 'function' ? require('../agon/engine.js') : null);
  const facts = () => (typeof window !== 'undefined' && window.AgonLsFacts) || (typeof require === 'function' ? require('../agon/ls-facts.js') : null);
  // the words for move u (lang ja: キンダイスン's; else the 2D words, the moves named by their marks). tx: the 2D text getter, V: the voice
  function words(id, P, u, lang, tx, V, last, fill) {
    const E = engine(), F = facts(); E.setRule('std');
    const f = F.fact(E, id, P.s, u), right = f.k === 'ok';
    if (lang === 'ja') {
      if (right) return { f, html: `${V.v(JA.cheer)} ${V.v(JA.w[id])}${last ? '' : ' ' + V.v(JA.push)}` };
      const n = id === 'b_step' ? JA.n[f.k === 'side' ? 'side' : 'trap'] : f.k === 'touch' ? JA.n[f.end] : JA.n.none;
      return { f, html: `${V.v(JA.soft)} ${V.v(n)}` };
    }
    const key = right ? '.why' : '.' + F.key(E, id, P.s, u);
    return { f, html: tx('ls.' + id + key, lang, { m: SPOT('ok'), x: SPOT('ng'), r: SPOT('hl') }) };
  }
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-agon-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../agon/lessons.json?v=4'), ld('../agon/i18n-ag.js?v=2lv-ls1'), ld('../agon/i18n-ag-more.js?v=2lv-l14n-ls1'),
          loadJs('../agon/engine.js?v=12-nn2-bk1', () => !!window.AgonEngine).then(() => loadJs('../agon/ls-facts.js?v=1', () => !!window.AgonLsFacts))])
          .then(([d, a, b]) => { const w = { I18N: { ja: {}, en: {} } }; for (const src of [a, b]) try { new Function('window', 'I18N', src)(w, w.I18N); } catch (e) { console.warn('[lessons3d] agon texts', e); }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.agon ? AtlasMini.agon(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's pieces: every piece to look at (never the answer's piece alone, 追52)
      hintPts(id, P) { const E = window.AgonEngine, F = window.AgonLsFacts; if (!E || !F) return []; E.setRule('std'); return F.hint(E, id, P.s); },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 7), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v), tx = (k, l, v) => this.tx(k, l, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: P.s.side }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast[id] : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => { o._rp = null; return words(id, P, u == null ? P.best : u, lang, tx, V, last, fill).html; };
          o.ng = u => { const E = window.AgonEngine; E.setRule('std'); if (u == null || P.ok.includes(u)) u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x));   // (asked for the answer itself: the words for a wrong move)
            const w = words(id, P, u, lang, tx, V, last, fill); o._rp = w.f.rp != null ? w.f.rp : null; return w.html; };   // (b_step: the enemy's capturing move, gold)
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= agon/app.js problemPoints: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side, lock: true } } : null; },
    };
    return D;
  }
  // (tools/lesson-verify-agon-ls.js) the words for every move in every language, as the 3D says them (line k of each list)
  let I18N = null;
  function sayText(id, P, u, lang, k) {   // k: every list says its line k (mod its length)
    if (!I18N && typeof require === 'function') { const fs = require('fs'), path = require('path'), w = { I18N: { ja: {}, en: {} } }; for (const f of ['i18n-ag.js', 'i18n-ag-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(__dirname, '../agon', f), 'utf8'))(w, w.I18N); I18N = w.I18N; }
    const tx = (k, l, v) => { let x = I18N[l] && I18N[l][k]; if (x === undefined) x = I18N.en[k]; return fill0(x || '', v || {}); };
    const V = { v: list => list[(k || 0) % list.length] };
    return words(id, P, u, lang, tx, V, false, fill0).html;
  }
  const API = { make, JA, READY, sayText, words };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsAgon = API;
})();
