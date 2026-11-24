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
      f_jump: 'クワッ、ドミダックだよ！ ここからは<b>狐</b>になって練習しよう。<br>狐は、となりのガチョウの<b>真後ろの点が空いていれば</b>、跳び越えて取れるんだ。となりにいても、後ろがふさがっていたら跳べない。まずは取れる形を見つけよう！',
      f_double: '跳んで着地した点から、<b>また跳べる形</b>があれば、同じ手番のまま続けて取れるよ。<br>途中で止まることもできるけど、それじゃもったいない！ 着地点のまわりもよく見て、<b>いちばん多く取れる跳び方</b>を探そう。',
      f_fork: 'いますぐ取れない？ 大丈夫！ <b>跳べるガチョウが2羽以上できる点</b>へ動けば、ガチョウは1手で全部の後ろをふさげない。<br>ねらいが1羽だけだと、後ろを埋められておしまい。<b>2羽以上を同時にねらう</b>のがコツだよ。',
    },
    ask: {
      f_jump: ['狐の番！ 跳び越して取れるガチョウはどれかな？', '狐の番だよ。真後ろが空いているガチョウを探して！', 'クワッ、取れるガチョウが1羽いる。見つけられる？', 'となりのガチョウをよく見て。取れるのはどれ？', '狐の番。今度はどのガチョウを跳び越す？'],
      f_double: ['狐の番！ 1手でいちばん多く取れる跳び方は？', '狐の番だよ。何羽まとめて取れるかな？', 'クワッ、続けて跳べる形がある。いちばん多く取ろう！', '着地点の先まで読んで、いちばん多く取ってみて！', '狐の番。どこまで跳び続けられる？'],
      f_fork: ['狐の番！ いまは取れない。次に必ず1羽取れる点はどこ？', '狐の番だよ。2羽を同時にねらえる点へ動こう！', 'クワッ、ガチョウが1手では守りきれない点を探して！', 'ガチョウが全部は防げない場所へ、1歩動いてみて！', '狐の番。次の手で必ず取れるようにするには？'],
    },
    askLast: ['これで最後！ 狐の番、いちばんの手はどれ？', 'ラストの問題だよ。じっくり読んで決めよう！'],
    hint: {
      f_jump: ['光っているのは狐のとなりのガチョウ。真後ろの点が空いているのはどれ？', 'となりのガチョウを1羽ずつ見て。向こう側が空いていれば跳べるよ。', '光るガチョウの後ろをのぞいてみて。空いた点はある？'],
      f_double: ['光っているのが、いま跳べるガチョウ。跳んだ先から、また跳べるのはどれ？', '着地した点のまわりを見て。となりにガチョウ、その後ろが空いている向きはある？', '1羽目で止まらずに、その先まで数えてみよう。'],
      f_fork: ['光っているガチョウを、1手で同時にねらえる点はどこかな？', '動いた先で、真後ろが空いたガチョウが2羽以上となりにいる点を探そう。', 'ガチョウは1手で1か所しかふさげない。ねらいを2つ作ろう！'],
    },
    cheer: ['クワッ、正解！', 'ばっちり！', 'お見事！', 'いいね、その手！', 'さすが！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'どんどんうまくなってるよ！'],
    soft: ['おしい！', 'クワ、惜しい！', '大丈夫、よくある見落とし！', 'あと少し！', 'いい線いってたよ！'],
    w: {
      take: ['となりのガチョウの真後ろが空いていたから、跳び越えて取れたね。', '後ろの空いたガチョウを見のがさなかった。跳び越して1羽！'],
      most: ['{n}羽まとめて取れた！ 着地点からまた跳べる形を見のがさなかったね。', '跳んで、また跳んで{n}羽！ 着地点の先まで読めていたよ。'],
      fork: ['狐のとなりに、後ろの空いたガチョウが{t}羽。ガチョウは1手で全部はふさげないから、次に必ず1羽取れるよ！', 'これでねらいは{t}羽。ガチョウが1か所ふさいでも、残りを跳び越せるんだ。'],
    },
    n: {
      step: ['赤い手は1歩動くだけで、ガチョウは取れないんだ。緑の手なら、となりのガチョウの真後ろが空いているから跳び越せるよ。', '赤い手では1羽も取れない。緑の手を見て。となりのガチョウの向こうが空いているでしょ？'],
      stepD: ['赤い手は1歩動くだけで、1羽も取れないんだ。緑の跳び方なら{n}羽取れたよ。', '赤い手では取れずに終わっちゃう。緑のように跳べば{n}羽！'],
      stop: ['{c}羽取ったところで止まっちゃった。着地した点からまだ跳べたんだ。緑の跳び方なら{n}羽！', '赤い手は{c}羽で止まり。その着地点の先にも、跳べるガチョウがいたんだよ。緑なら{n}羽。'],
      other: ['赤い向きに跳ぶと{c}羽で行き止まり。緑の向きなら続けて跳べて{n}羽取れるよ。', '赤い跳び方は{c}羽で終わっちゃう。緑の向きは着地点からまた跳べて、{n}羽になるんだ。'],
      t0: ['赤い手のあと、狐が跳び越せるガチョウは1羽もいない。緑の点なら{t}羽を同時にねらえるんだ。', '赤い点からは、真後ろの空いたガチョウがとなりにいないよ。緑の点なら{t}羽をねらえる。'],
      t1: ['赤い手でねらえるのは1羽だけ。ガチョウが金の1歩で防いだら、もう跳べないよ。緑の点なら{t}羽を同時にねらえる。', '赤い点だと、ねらいは1羽。金の1歩でふさがれておしまいなんだ。緑の点なら{t}羽！'],
      tdef: ['赤い手でも{c}羽ねらえるけど、ガチョウの金の1歩で全部防がれちゃう。緑の点のねらいは1手では防げないんだ。', '赤い点のねらいは{c}羽。でも金の1歩がまとめてふさいでしまう。緑の点なら防ぎきれないよ。'],
      trap: ['赤い手のあと、ガチョウが金の1歩で寄ると、狐は1歩も動けなくなって負けちゃう！', '赤い点は袋小路。金の1歩で閉じ込められて、狐の負けなんだ。'],
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
