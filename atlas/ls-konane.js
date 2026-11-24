/* =====================================================================
   Kōnane — the lessons on the 3D board (atlas/lessons3d.js DATA.konane, 2026-11-25 担当C).
   konane/lessons.json (the same file as the 2D lessons, progress the full game's 'aicoding-konane-lessons' { id: { best, clear } }),
   told by チェッカニ (Checkrab, the guide of atlas/rules/konane.js and the 3D puzzles atlas/games/konane-pz.js).
   Every reason is a fact of the board, read by konane/ls-facts.js (the 2D and tools/lesson-verify-konane.js read the same):
   a jump stopped after one stone though it could go on, what follows a landing square (the board's edge, your own stone, an empty
   square, an enemy stone with no empty square behind), the opponent's jumps left after a move.
   No coordinates on the 3D board: the answer is the green move, yours the red one, one of the opponent's jumps still left gold.
   Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game until they are.
   AtlasLsKonane.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_double', 'b_win'];
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // ---------- チェッカニ's words (ja) ----------
  const JA = {
    intro: {
      b_double: 'アロハ〜、チェッカニだカニ！ コナネは<b>相手の石を跳び越えて取るゲーム</b>。跳べる手がなくなったほうが<b>負け</b>、最後に跳べた人の<b>勝ち</b>なんだ。<br>着地した先に<b>相手の石と空きマス</b>が続けば、<b>同じ向きのまま</b>もう1回跳べる（曲がるのはなし）。1手で<b>2つ</b>取る跳び方を探そう！',
      b_win: 'コナネの勝ち方はシンプル。<b>相手の番に、跳べる手が1つもない</b>ようにすれば勝ちだカニ！<br>相手が跳べるのは、<b>となりにきみの石</b>があって、<b>その奥が空いている</b>とき。指したあと、そんな形が1つも残らない手を探そうね。',
    },
    ask: {
      b_double: ['どの石なら、1手で2つ取れるかな？', 'カニカニ、まとめて2つ取れる道が1本だけ隠れてる。見つけられる？', '着地したあとも跳べる石を探そう。2つ取りのチャンスはどこ？', '「相手の石・空き・相手の石・空き」と並んだ列、どこかにあるかな？', 'まっすぐ2回跳べる石はどれだろう？'],
      b_win: ['指したあと、相手が1つも跳べなくなる手はどれ？', 'カニッ、相手の跳び台を全部消せる1手があるんだ。探してみて！', '相手の跳べる手を0にしよう。どの石をどう跳ぶ？', 'この1手で勝負を決めよう！ 相手を跳べなくする手は？', '相手の石のとなりで、奥が空いている所に注目だカニ。全部なくせる手は？'],
    },
    askLast: ['カニッ、これで最後！ いちばんの手はどれ？', 'ラストの問題だね。じっくり数えて決めよう！'],
    hint: {
      b_double: ['光っているのは、いま跳べる石たち。着地した先にまた「相手の石・空き」が続くのはどれかな？', '光る石を1つずつ跳ばせてみて。着地点の向こうに、相手の石と空きマスはある？', '1つ目の着地点で止まらずに、同じ向きの先まで見てみよう！', '光る石の跳ぶ向きを指でなぞって、2回目に跳べる所を探してね。', '着地したマスのとなりに相手の石、その奥が空き。そんな形がカギだカニ。'],
      b_win: ['光っているのは、いま跳べる相手の石。きみの1手で、その跳ぶ手を全部なくせるかな？', 'カニ、光る相手の石の跳び台になっているのは、すぐとなりのきみの石。その形を崩そう！', '光る石が跳べなくなるのは、取られたとき・となりのきみの石がいなくなったとき・着地するマスがふさがったとき。どれが作れる？', '指したあと、光る石のまわりがどうなるか想像してみて！', '手ごとに、相手の跳べる手を数えてみよう。0になるのはどれ？'],
    },
    cheer: ['カニッ、正解！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすがだカニ！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってるね！', '目が慣れてきたね。次へ！', 'その読み、次でも使えるはず！', 'いい流れ。もう1問いこう！'],
    soft: ['ドンマイ！', 'カニ、だいじょうぶ！', 'よくある見落としだよ。', 'いっしょに確かめよう！', '次はきっと見つかる！'],   /* 追66・追68: said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 */
    w: {
      most: ['着地した先にも相手の石と空きが続いていたから、続けて2つ取れたね。', 'カニッ、跳んでまた跳んで2つ！ 1回で止めなかったのが大きいんだ。', '同じ向きにまっすぐ2回。連続ジャンプの形を見のがさなかったね。', '1つ目の着地点の向こうにも獲物がいた。そこまで読めていたのがえらい！', '2つまとめていただき！ 2回続けて跳べたのは、この石のこの向きだけだったんだ。'],
      win: ['相手の跳べる手は{t}通りあったけど、この1手で0になった。相手はもう跳べないから、きみの勝ち！', 'カニッ、相手の跳び台が全部消えたね。跳べなくなった相手の負けなんだ。', '{t}通りあった相手の跳ぶ手が、緑の1手でゼロに。これで勝負ありだカニ！', '相手はどの石からも跳べない形になったね。きみの読みどおり！', '相手の番なのに跳べる手がない。最後に跳んだきみの勝ちだよ！'],
    },
    n: {
      stop: ['赤い手は1つ取ったところで止まっちゃった。着地した点の先に、まだ相手の石と空きが続いていたんだ。緑は最後まで跳んで2つだよ。', 'カニ、赤は1つでストップ。同じ向きにもう1回跳べたから、もったいない！ 緑のように最後まで跳べば2つだね。', '赤の着地点のとなりに、まだ奥の空いた相手の石が残っていたので、続けて跳べたんだ。緑は2つ取り。', '止まる場所が早すぎたね。赤の先にもう1つ取れる形があって、緑はそこまで跳んでいるよ。', '赤は1つ取りで終わり。着地したあとも同じ向きを見ていれば、緑の2つ取りになったんだ。'],
      edge: ['赤い手は着地した先が盤のはしだから、そこで行き止まり。1つしか取れないんだ。緑の跳び方なら2つ取れたね。', 'カニ、赤の跳んだ先はもう盤の外。続けて跳べないから1つどまりだね。緑の道なら2つ！', '赤は盤のはしに着いて終わり。その向こうにマスがないので、2回目は跳べないんだ。緑は2つ取り。'],
      mine: ['赤い手は着地した先に自分の石があって、それは跳び越えられないから1つだけ。緑は2つ取れる道なんだ。', 'カニ、赤の着地点のとなりはきみの石。自分の石は跳べないので、そこで止まるしかないんだ。緑なら2つ！', '赤の先には味方の石が待っていたね。跳べるのは相手の石だけだから1つどまり。緑は続けて2つ。'],
      empty: ['赤い手は着地した先が空きマスで、跳び越える相手の石がいないから1つだけ。緑なら2つ取れる。', 'カニ、赤の着地点の先は空っぽ。跳べる相手の石がないと続けられないんだ。緑なら2つ！', '赤の向こうには相手の石がいないので、2回目のジャンプができない。緑の列には次の石がいたよ。'],
      block: ['赤い手の着地点の先には相手の石があるけど、その奥がふさがっていて跳べない。だから1つだけ。緑の列は奥まで空いていて2つ！', 'カニ、赤の先の相手の石は、奥に空きがないから跳び越せないんだ。緑の列なら奥が空いていて2つ取れる。', '赤の着地点のとなりに相手の石はいる。でもその向こうが空いていないので、続けられないね。緑は2つ取り。'],
      left: ['赤い手のあと、相手にはまだ{j}通りの跳ぶ手が残っちゃう。金の印がその1つ。緑なら0になって勝ちだったんだ。', 'カニ、赤だと相手の跳び台が残るんだ。金の印のように、まだ{j}通り跳べる。緑は全部消せる1手だよ。', '赤の手では、金の印の相手の石がまだ跳べる。残る跳ぶ手は{j}通りで、勝ちにならないんだ。緑なら相手は1つも跳べないね。', '赤のあとも、金の印のように相手が跳び越せるきみの石が残る。それで{j}通り跳べちゃう。緑はその形を全部なくしているよ。'],
      left1: ['赤い手のあと、相手に1通りだけ跳ぶ手が残っちゃう。それが金の印。緑ならそれも消えて0になるんだ。', 'カニ、赤だと金の印の跳び方が1つ残るから、相手はまだ跳べる。緑の手はそれもなくせるよ。', '赤のあと、相手の跳べる手は1通り（金の印）。1つでも残ると勝ちにならないんだ。緑なら0！'],
      leftMore: ['赤は{c}つ取れたけど、相手にはまだ{j}通りの跳ぶ手が残る（金の印）。たくさん取るより、相手を跳べなくするのが大事なんだ。緑なら0！', 'カニ、赤で{c}つ取っても、金の印のように相手はまだ跳べる。残りは{j}通り。緑は1つしか取らないけど、相手の跳ぶ手が0になるよ。'],
    },
  };
  // other languages: the 2D words (konane/i18n-kn-more.js ls.b_double.* / ls.b_win.*), the moves named by their marks
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  // the words' kind for a fact (b_double 'other' by what follows the landing square)
  const kindOf = f => f.k === 'other' ? f.end : f.k === 'left' ? (f.c >= 2 ? 'leftMore' : f.j === 1 ? 'left1' : 'left') : f.k;
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-konane-lessons', data: null, I: null, JA, READY, kindOf,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../konane/lessons.json?v=4'), ld('../konane/i18n-kn.js?v=3'), ld('../konane/i18n-kn-more.js?v=4-l14n'),
          loadJs('../konane/engine.js?v=10-v3nn', () => !!window.KonaneEngine).then(() => loadJs('../konane/ls-facts.js?v=1', () => !!window.KonaneLsFacts))])
          .then(([d, a, b]) => { const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const tx of [a, b]) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) { console.warn('[lessons3d] konane texts', e); } }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.konane ? AtlasMini.konane(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's stones: b_double the stones that can jump now, b_win the opponent's stones that could jump now (never the answer alone, 追52)
      hintPts(id, P) { const E = window.KonaneEngine, F = window.KonaneLsFacts; if (!E || !F) return []; E.setRule('s8'); return F.hint(E, id, P.s); },
      // the words for a move u: { f, html } (ja: チェッカニ's, else the 2D words with the marks for the moves)
      say(id, P, u, lang, V, last) {
        const E = window.KonaneEngine, F = window.KonaneLsFacts; E.setRule('s8');
        const f = F.fact(E, id, P.s, u), right = P.ok.includes(u), k = kindOf(f), fb = right ? f : F.fact(E, id, P.s, P.best);
        const v = { j: f.j, c: f.c, t: fb.t };
        if (lang === 'ja') {
          if (right) return { f, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[k] || JA.w.most), v)}${last ? '' : ' ' + V.v(JA.push)}` };
          return { f, html: `${V.v(JA.soft)} ${fill(V.v(JA.n[k] || JA.n.edge), v)}` };
        }
        const key = right ? '.why' : f.k === 'stop' ? '.ng.stop' : f.k === 'other' ? '.ng.other' : f.j === 1 ? '.ng1' : '.ng';
        return { f, html: this.tx('ls.' + id + key, lang, Object.assign(v, { m: SPOT('ok'), x: SPOT('ng') })) };
      },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 2), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: P.s.side }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => this.say(id, P, u == null ? P.best : u, lang, V, last).html;
          o.ng = u => { if (u == null || P.ok.includes(u)) { const E = window.KonaneEngine; E.setRule('s8'); u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); }   // (asked for the answer itself: the words for a wrong move)
            const r = this.say(id, P, u, lang, V, last); o._rp = r.f.k === 'left' ? r.f.r : null; return r.html; };   // (gold: one of the opponent's jumps still left)
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= konane/app.js problemPoints: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side, lock: true } } : null; },
    };
    return D;
  }
  const API = { make, JA, READY, kindOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsKonane = API;
})();
