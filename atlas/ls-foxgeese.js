/* =====================================================================
   Fox and Geese — the lessons on the 3D board (atlas/lessons3d.js DATA.foxgeese, 2026-11-24 担当C).
   foxgeese/lessons.json (the 15-geese rule g15; the same file as the 2D lessons, progress the full game's
   'aicoding-foxgeese-lessons' { id: { best, clear } }), told by ドミダック (Dominoduck, the guide of atlas/rules/foxgeese.js).
   Every reason is a fact of the board, read by foxgeese/ls-facts.js (the 2D and tools/lesson-verify-foxgeese.js read the same):
   a step takes nothing, a line of jumps stopped early, the geese's one step that covers, the geese attacked at once.
   No coordinates on the 3D board: the answer is the green move, yours the red one, the geese's covering step gold.
   Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game until they are.
   AtlasLsFoxgeese.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['f_jump', 'f_double', 'f_fork'];
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // ---------- ドミダック's words (ja) ----------
  const JA = {
    intro: {
      f_jump: 'クワッ、ドミダックだよ！ 狐とガチョウは<b>追いかけっこのゲーム</b>。狐はガチョウを減らせば<b>勝ち</b>、ガチョウは狐を囲めば勝ちなんだ。<br>まずは<b>狐</b>の練習。となりのガチョウの<b>真後ろが空いていれば</b>、跳び越えて取れるよ。',
      f_double: '跳んで着地した点から、<b>また跳べる形</b>があれば、同じ手番のまま続けて取れるんだ。<br>途中で止まることもできるけど、それじゃもったいない！ 着地点のまわりもよく見て、<b>いちばん多く取れる跳び方</b>を探そう。',
      f_fork: 'いますぐ取れない？ クワ、大丈夫！ <b>跳べるガチョウが2羽以上できる点</b>へ動けば、ガチョウは1手で全部の後ろをふさげない。<br>ねらいが1羽だけだと、後ろを埋められておしまい。<b>2羽以上を同時にねらう</b>のがコツだね。',
    },
    ask: {
      f_jump: ['狐の番！ 跳び越して取れるガチョウはどれかな？', 'クワッ、取れるガチョウが1羽いる。見つけられる？', '狐の番だね。向こう側が空いているガチョウを探して！', 'となりのガチョウをよく見て。ぱくっといけるのはどれ？', 'クワ、今度はどのガチョウを跳び越す？'],
      f_double: ['狐の番！ 1手でいちばん多く取れる跳び方は？', 'クワッ、何羽まとめて取れるかな？', '続けて跳べる形が隠れているね。いちばん多く取ろう！', '狐の番。どこまで跳び続けられる？', 'クワ、着地したあとも跳べる道を探してみて！'],
      f_fork: ['狐の番！ いまは取れない。次に必ず1羽取れる点はどこ？', 'クワッ、2羽を同時にねらえる点へ動こう！', 'ガチョウが1手では守りきれない場所を探して！', '狐の番だね。1歩動いて、ねらいを2つ作れるかな？', 'クワ、次の手で必ず取れるようにするには？'],
    },
    askLast: ['クワッ、これで最後！ いちばんの手はどれ？', 'ラストの問題だね。じっくり読んで決めよう！'],
    hint: {
      f_jump: ['光っているのは狐に接したガチョウたち。奥の点が空いているのはどれ？', 'クワ、光るガチョウを1羽ずつ見て。その向こう側に空きはある？', '跳べるかどうかは、ガチョウの奥の点しだい。ふさがっていない向きを探そう。', '光るガチョウの先をのぞいてみて。何もいない点があるはずだよ。', 'となりにいても、奥に仲間がいれば跳べない。空いている奥はどこかな？'],
      f_double: ['光っているのが、いま跳べるガチョウ。跳んだ先から、また跳べるのはどれ？', 'クワ、着地した点のまわりを見て。次のガチョウとその奥の空きはある？', '1羽目で止まらずに、その先まで数えてみよう。', '跳び方ごとに、何羽取れるか指で数えてみて！', '着地点から、もう1回跳べる向きがある道を選ぼう。'],
      f_fork: ['光っているガチョウを、1手で同時にねらえる点はどこかな？', 'クワ、動いた先で奥の空いたガチョウが2羽以上となりに来る点を探そう。', 'ガチョウは1手で1か所しか埋められない。ねらいを2つ作ろう！', '光る2羽のどちらにも跳べる場所へ、1歩だけ動いてみて。', 'ねらいが1つだと防がれる。2つ同時なら、ガチョウは困っちゃうんだ。'],
    },
    cheer: ['クワッ、正解！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすが！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'クワッ、どんどんうまくなってる！', '目が慣れてきたね。次へ！', 'その読み、次でも使えるはず！', 'クワ、いい流れ。もう1問いこう！'],
    soft: ['ドンマイ！', 'クワ、だいじょうぶ！', '大丈夫、よくある見落とし！', 'いっしょに確かめよう！', '次はきっと見つかるよ！'],   /* 追68 (2026-11-24 担当C): said with a 0-point move — no 「おしい・あと一歩・いい線・あと少し」 (追66) */
    w: {
      take: ['その1羽は奥が空いていたから、跳び越えて取れたね。', 'クワ、奥が空いた1羽を見のがさなかった！ 着地する点があるから、ぴょんと跳んでいただきだ。', '向こう側に何もいなかったから跳べたんだ。仲間に守られていない1羽だったね。', 'ほかのガチョウは奥がふさがっていた。跳べるのはこの1羽だけだったんだ。', '見分けがついてきたね。奥の点が空いていると、狐はそこへ着地できるんだ。'],
      most: ['{n}羽まとめて取れた！ 着地点からまた跳べる形を見のがさなかったね。', 'クワッ、跳んで、また跳んで{n}羽！ 1回で止めなかったのが大きいんだ。', '最初の着地点にも次の獲物がいたから、続けて{n}羽。いちばん多い道だ。', '道すじを最後まで読めていたので、{n}羽をいっぺんにぱくり！', '着地のたびにまわりを見たから、ほかの跳び方より多い{n}羽。それが正解のカギだね。'],
      fork: ['跳べるガチョウが{t}羽になった。ガチョウは1手で全部はふさげないから、次に必ず1羽取れるよ！', 'クワッ、ねらいは{t}羽。1か所埋められても、残りを跳び越せるから大丈夫なんだ。', 'ここなら{t}羽を同時ににらめる。ガチョウの守りが追いつかないね。', 'ねらいを{t}つ作れたのが大きい。どれを守っても、ほかが空いてしまうから防げないんだ。', '1歩でガチョウを{t}羽まとめて困らせた！ 1手では全部ふさげないので、次に1羽はいただきだ。'],
    },
    n: {
      step: ['赤い手は1歩動くだけだから、ガチョウは取れないんだ。緑の手なら、奥が空いた1羽を跳び越せる。', 'クワ、赤い手では1羽も取れない。緑の手を見て。向こうが空いているから跳べるでしょ？', '赤は歩いただけで終わり。緑のガチョウは奥に何もいないから、跳び越せたんだ。', '赤い手のあとも、ガチョウの数は減らないね。緑の手なら奥の空きへ着地して1羽取れた。', '赤い点へ動いても獲物なし。緑のガチョウは仲間に守られていないので、そこを跳べたんだよ。'],
      stepD: ['赤い手は1歩動くだけで、1羽も取れないんだ。緑の跳び方なら{n}羽取れた。', 'クワ、赤い手では取れずに終わっちゃう。緑のように跳べば{n}羽！', '赤は歩いただけ。緑の道なら着地のたびにまた跳べて、全部で{n}羽になるね。', '赤い手だとガチョウは減らない。跳べる形は緑、続けて{n}羽ぶんあったんだ。', '赤い点へ歩くと何も取れないから、緑の連続ジャンプ！ それで{n}羽いただけたよ。'],
      stop: ['{c}羽取ったところで止まっちゃった。着地した点からまだ跳べたんだ。緑の跳び方なら{n}羽！', 'クワ、赤い手は{c}羽でストップ。その先にも跳べるガチョウがいた。緑なら{n}羽だね。', '赤の着地点のとなりに、まだ奥の空いた1羽が残っていたから、もったいない。緑は続けて{n}羽。', '止まるのが早かったから損しちゃった！ 赤は{c}羽、最後まで跳んだ緑は{n}羽。', '赤い手のあとも跳べる形が残ってる。緑のように跳び続ければ{n}羽取れた。'],
      other: ['赤い向きに跳ぶと{c}羽で行き止まり。緑の向きなら続けて跳べて{n}羽取れる。', 'クワ、赤い跳び方は{c}羽で終わっちゃう。緑は着地点からまた跳べて{n}羽になるんだ。', '最初の向きがちがったので、赤は{c}羽どまり。緑の道なら{n}羽。', '赤い道の先には跳べるガチョウがいないので、そこで終わり。緑の向きは{n}羽ぶん続くんだ。', '跳ぶ向きで数がかわるから要注意！ 赤は{c}羽、緑は{n}羽だね。'],
      t0: ['赤い手のあと、狐が跳び越せるガチョウは1羽もいない。緑の点なら{t}羽を同時にねらえるんだ。', 'クワ、赤い点のまわりは、奥がふさがったガチョウばかり。緑なら{t}羽ねらえる。', '赤い点からは跳べる形がゼロなんだ。緑の点へ動けば、ねらいが{t}つできる。', '赤へ動いても、次に取れるガチョウがいないから空振り。緑の点のとなりには{t}羽の獲物がいたんだ。', '赤い手だと、ガチョウはのんびり守りを固められる。緑なら{t}羽を一度ににらめた。'],
      t1: ['赤い手でねらえるのは1羽だけ。金の1歩でふさがれたら、もう跳べない。緑の点なら{t}羽を同時にねらえる。', 'クワ、赤い点だとねらいは1つ。ガチョウが金のように動けばおしまいなんだ。緑なら{t}羽！', 'ねらいが1羽だと、金の1歩で守られちゃう。緑の点は{t}羽をにらめるから防げないね。', '赤のねらいは1つきりだから、金の手で奥を埋められて終わり。緑は{t}つ同時だよ。', '赤い手のあと、ガチョウは金の1歩で安心できる。緑の点なら{t}羽、守りきれないんだ。'],
      tdef: ['赤い手でも{c}羽ねらえるけど、ガチョウの金の1歩で全部防がれちゃう。緑の点のねらいは1手では防げないんだ。', 'クワ、赤のねらいは{c}羽。でも金の1歩がまとめてふさいでしまう。緑なら防ぎきれない。', '赤い点の{c}つのねらいは、金の1手で両方消える形なんだ。緑のねらいはばらばらだから守れない。', 'ねらいが2つでも、1歩で両方ふさがる場所だとだめなんだ。金の手を見て。緑はそうならないね。', '赤だと金の1歩で守りが間に合う。緑の点なら、どう動いても1羽は残るよ。'],
      trap: ['赤い手のあと、ガチョウが金の1歩で寄ると、狐は1歩も動けなくなって負けちゃう！', 'クワ、赤い点は袋小路。金の1歩で閉じ込められて、狐の負けなんだ。', '赤へ入ると、逃げ道が金の1歩でなくなる。狐は動けずにおしまい。', '危ない！ 赤い点はまわりがガチョウだらけだから、金の手でふたをされちゃうね。', '赤い手だと、金の1歩で囲まれてしまう。緑の点ならねらいも逃げ道もあったんだ。'],
    },
  };
  // other languages: the 2D words (foxgeese/i18n-fg-more.js lf.*), the moves named by their marks
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  const LF_KEY = { take: 'lf.take', step: 'lf.step', most: 'lf.most', stop: 'lf.stop', other: 'lf.other', fork: 'lf.fork', t0: 'lf.t0', t1: 'lf.t1', tdef: 'lf.tdef', trap: 'lf.trap' };
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  function make(H) {
    const { getJ, J, put, fill } = H;
    const D = {
      LKEY: 'aicoding-foxgeese-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../foxgeese/lessons.json?v=5'), ld('../foxgeese/i18n-fg.js?v=10'), ld('../foxgeese/i18n-fg-more.js?v=14'),
          loadJs('../foxgeese/engine.js?v=13', () => !!window.FoxEngine).then(() => loadJs('../foxgeese/ls-facts.js?v=1', () => !!window.FoxLsFacts))])
          .then(([d, a, b]) => { const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const tx of [a, b]) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) { console.warn('[lessons3d] foxgeese texts', e); } }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.foxgeese ? AtlasMini.foxgeese(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      // the hint's geese: f_jump the geese next to the fox, f_double the geese the fox can jump now, f_fork the geese the answer attacks
      hintPts(id, P) { const E = window.FoxEngine, F = window.FoxLsFacts; if (!E || !F) return []; E.setRule(P.s.rule || 'g15'); const pos = E.Pos.from(P.s);
        if (id === 'f_jump') return E.NBR[pos.fox].filter(([x]) => pos.sq[x] === E.P2).map(([x]) => x);
        if (id === 'f_double') return F.aimed(E, pos);
        return F.aimed(E, pos.clone().play(P.best)); },
      // the words for a move u: { k, html } (ja: ドミダック's, else the 2D words with the marks for the moves)
      say(id, P, u, lang, V, last) {
        const E = window.FoxEngine, F = window.FoxLsFacts; E.setRule(P.s.rule || 'g15');
        const f = F.fact(E, id, P.s, u), fb = F.fact(E, id, P.s, P.best), right = P.ok.includes(u);
        const v = { n: f.k === 'most' ? f.n : fb.n != null ? fb.n : f.n, c: f.k === 'tdef' ? f.t : f.c, t: fb.t };
        const k = f.k === 'step' && id === 'f_double' ? 'stepD' : f.k;
        if (lang === 'ja') {
          if (right) return { f, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[k] || JA.w.take), v)}${last ? '' : ' ' + V.v(JA.push)}` };
          return { f, html: `${V.v(JA.soft)} ${fill(V.v(JA.n[k] || JA.n.step), v)}` };
        }
        const key = k === 'stepD' ? 'lf.stepD' : LF_KEY[k];
        return { f, html: this.tx(key, lang, Object.assign(v, { m: SPOT('ok'), x: SPOT('ng'), r: SPOT('hl') })) };
      },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const ja = lang === 'ja', id = s.id, V = voice(+key * 3 + 1), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: 1 }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: this.hintPts(id, P),
            ask: ja ? V.v(last ? JA.askLast : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          o.good = u => this.say(id, P, u == null ? P.best : u, lang, V, last).html;
          o.ng = u => { if (u == null || P.ok.includes(u)) { const E = window.FoxEngine; E.setRule(P.s.rule || 'g15'); u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); }   // (asked for the answer itself: the words for a wrong move)
            const r = this.say(id, P, u, lang, V, last); o._rp = ['t1', 'tdef', 'trap'].includes(r.f.k) ? r.f.r : null; return r.html; };   // (the gold step: only when the words name the geese's covering step)
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= foxgeese/app.js problemPoints: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: 1, lock: true } } : null; },
    };
    return D;
  }
  const API = { make, JA, READY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsFoxgeese = API;
})();
