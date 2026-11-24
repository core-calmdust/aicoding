/* =====================================================================
   Patolli — the lessons on the 3D board (atlas/lessons3d.js DATA.patolli, 2026-11-24 担当C).
   patolli/lessons.json (Bell's rules: rebuilt with the exact win chances of every reachable position — patolli/tools/patolli_exact.c,
   gen_lessons_v2.js — and checked by tools/lesson-verify.js patolli) on the 3D mat, told by ダイスン (Dicepup, the guide of the rules
   tour atlas/rules/patolli.js). Progress = the full game's aicoding-patolli-lessons { id: { best, pass } }.
   Japanese: ダイスン's own words — every reason is a fact of the board (an arm end and the throw again, the exact throw home, the
   ways out of 32); never a win chance. Other languages: the 2D texts. Only the lessons rebuilt and checked (v2) are listed.
   AtlasLsPatolli.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, L, fill).
   ===================================================================== */
(function () {
  'use strict';
  function make(H) {
    const { getJ, J, put, L, fill } = H;
    const tx = (o, lang) => L(o, lang);
    const plain = h => String(h || '').replace(/<[^>]+>/g, '');
    // ---------- ダイスン's words (ja) ----------
    const JA = {
      intro: {
        prob: 'ワン！ ぼくは<b>ダイスン</b>。パトリはアステカのゲームで、ここで習うのはベルの復元ルール。<b>6個を先に全部上げたら勝ち</b>なんだ。<br>サイコロのかわりに<b>豆を5個</b>投げて、印の出た数だけ進むよ。出方は全部で<b>32通り</b>。まずは出やすさから！',
        again: '十字の<b>腕の先の丸いマス</b>は8つ。そこに止まると<b>もう一度投げられる</b>んだ。<br>1回の番で2回動けるのは大きいワン。この目で腕の先に届く駒を探そう！',
        goal: '上がりは道の<b>59マス目の次</b>。<b>ちょうどの目</b>でしか上がれないんだ。<br>残り1・2・3・4・10マスの駒だけが、ぴったりの目で上がれる。上がれるときに上がれないと、また目を待つことになるワン。',
      },
      ramp: {
        prob: { et: '32通りを数えよう！', eb: '5個の豆は、どれも印が出るか出ないかの半々。印が2個の出方は「5個から2個を選ぶ」10通り、3個も10通りなんだ。', tt: 'いちばん出やすい目は？', g: '豆5個で、いちばん出やすい目を選んでみて！', h: '印が2個や3個になる出方は、5個から選ぶ組み合わせだから多いんだ。', y: 'そのとおり！ 2と3は10通りずつでトップだワン。' },
        again: { et: '腕の先に止まろう！', eb: '光っているのが腕の先。この目でぴったり止まる駒を動かすと、番が終わらずに<b>もう一度投げられる</b>んだ。', tt: '腕の先に止まる駒は？', g: 'この目で腕の先にぴったり止まる駒を動かしてみて！', h: '光っているマスに、ちょうど届く駒はどれかな？', y: 'もう一度投げられるね！ ナイスだワン。' },
        goal: { et: 'ぴったりで上がろう！', eb: '残りのマスと出た目がぴったり同じ駒は、そのまま<b>上がり</b>。光っているのは、ちょうどの目で上がれるマスなんだ。', tt: '上がれる駒は？', g: 'ちょうどの目で上がれる駒を動かしてみて！', h: '59マス目は1、58マス目は2…。この目で上がりに届く駒は？', y: 'ぴったり上がり！ その駒はもう目を待たなくていいワン。' },
      },
      ask: ['豆は<b>{n}</b>！ どの駒を動かすのがいちばんかな？', '投げたら<b>{n}</b>が出たワン。きみならどう動かす？', '<b>{n}</b>が出たよ。いちばんいい手を探してみて！', 'さあ、出目は<b>{n}</b>。ここはどの駒でいく？', '今度の目は<b>{n}</b>だね。よく見て選んでみよう！', '<b>{n}</b>が出た！ さて、どの駒を進めようか？', '出目は<b>{n}</b>。盤をじっくり見てから決めようね。'],
      askLast: ['これで最後！ 出目は<b>{n}</b>、いちばんの手はどれ？', 'ラストの問題だワン。<b>{n}</b>が出たよ、どうする？'],
      hint: {
        again: ['光っている腕の先に、ちょうど<b>{n}</b>で届く駒はどれかな？', '駒の場所に<b>{n}</b>を足して、丸いマスになるのは？', '腕の先は道の7・8マス目から15マスごと。<b>{n}</b>マス手前にいる駒は？', 'もう一度投げられる手は、それだけで得なんだワン。', '止まったあとにもう1回投げられるのは、どの駒かな？'],
        goal: ['光っているマスの駒のうち、ちょうど<b>{n}</b>で上がれるのは？', '上がりまでの残りが<b>{n}</b>マスの駒を探そう！', '59マス目は1、58マス目は2、50マス目は10で上がりだよ。', '残りと目がぴったりの駒はどれかな？', '上がりの目を見のがさないでね！'],
      },
      cheer: ['いいね！', 'ナイスだワン！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', 'よく見つけた！', 'すごい！', 'やったね！', '上手！', '完璧！', 'いい目してるワン！'],
      push: ['次もこの調子でいこう！', 'どんどんいこう！', 'つぎも楽しみだワン！', 'その勢いで次へ！', 'まだまだいけるよ！'],
      soft: ['おしい！', 'ドンマイ！', '大丈夫だワン！', 'あと一歩！', 'いい線！', '気にしない、気にしない！', '次はいけるワン！'],
      w: {
        'w.arm': ['<b>{f}→{t}</b>は腕の先！ 止まったから、もう一度投げられるワン。', '腕の先の<b>{t}</b>にぴったり。番が終わらずに、もう1回投げられるよ！', '<b>{t}</b>は丸いマス。2回動けるチャンスをつかんだね！', '<b>{f}</b>の駒で腕の先へ。おかわりの1投げだワン！', 'ぴったり腕の先！ 1回の番で2回動けるのは大きいんだ。'],
        'w.home': ['<b>{f}</b>の駒は残り<b>{n}</b>マス。ちょうど<b>{n}</b>で上がりだワン！ その目は32通り中<b>{k}</b>通りしか来ないんだ。', 'ぴったり<b>{n}</b>で上がり！ 待っていたら、次にまた<b>{n}</b>が出るとは限らないからね。', '<b>{f}</b>からちょうど上がったね。残りのマスと目がぴったり合ったよ！', '上がれる目でしっかり上げたね！ 上がった駒は、もう目を待たなくていいワン。', 'いってらっしゃい！ 残り<b>{n}</b>マスの駒に合う目は<b>{n}</b>だけなんだ。'],
      },
      n: {
        'n.arm': ['<b>{x}→{y}</b>は腕の先じゃないから、番が相手に移っちゃう。緑の<b>{f}→{t}</b>なら腕の先で、もう一度投げられたんだ。', 'その手だと<b>{y}</b>はふつうのマスだから、そこで番はおしまい。緑の<b>{t}</b>は丸いマスなので、もう1回投げられたワン。', '<b>{x}</b>の駒を動かすと、そこで番はおしまい。緑の<b>{f}</b>の駒なら腕の先の<b>{t}</b>に止まるから、おかわりだったよ。', '緑の道の先が腕の先の<b>{t}</b>。<b>{x}→{y}</b>では腕の先に止まらないので、2回目の投げがもらえないんだ。', '<b>{y}</b>に止まっても腕の先じゃないから、もう一度は投げられない。腕の先に届くのは緑の<b>{f}</b>の駒だワン。'],
        'n.home': ['<b>{x}→{y}</b>だと、緑の<b>{f}</b>の駒はまた待ちぼうけ。上がるにはちょうど<b>{n}</b>が要るから、32通り中<b>{k}</b>通りの目を待つことになるんだ。', '緑の<b>{f}</b>の駒は、この<b>{n}</b>でぴったり上がれたワン。見送ると、次にまた<b>{n}</b>が出るまで待たないといけないよ。', 'その手だと上がりのチャンスを見送り。緑の<b>{f}</b>の駒は残り<b>{n}</b>マスなので、合う目は<b>{n}</b>だけなんだ。', '<b>{x}</b>の駒を動かすより、緑の<b>{f}</b>の駒を上げよう。<b>{n}</b>はめったに来ない目だから、来たときに使うんだワン。'],
      },
      cq: { roll1: ['「<b>1</b>」が出る確率は？ 32通りで考えてみて！'], roll10: ['豆が5個とも印（<b>10</b>マス進む）になる確率は？'],
        arm: ['黄色い輪の駒が、次の投げで<b>腕の先</b>に止まる確率は？'], ge3: ['<b>3マス以上</b>進める確率は？ 当てはまる目を全部足してね！'],
        home: ['これで最後！ 次の投げで、きみの駒のどれかが<b>上がれる</b>確率は？'] },
      chint: { roll: ['印の数ごとに、0個から5個まで 1・5・10・10・5・1通りだワン。', '「1」なら印が1個、「10」なら印が5個。その出方は何通りかな？'],
        arm: ['輪の駒から腕の先（道の7・8・22・23…マス目）まで、何マスかな？ その目の通り数を足すんだ。', '届く腕の先が2つあれば、2つの目の通り数を足すんだワン。'],
        ge3: ['3・4・10、それぞれの通り数を足してみて！'],
        home: ['駒ごとに、上がりまでの残り（60−いる場所）を数えて、その目の通り数を足そう！', '残りが1・2・3・4・10マスの駒だけが、ちょうどの目で上がれるよ。'] },
      cw: { 'c.roll': ['印が<b>{b}</b>個の出方は32通り中<b>{m}</b>通り。だから<b>{m}/32</b>なんだ。', '「<b>{n}</b>」が出るのは印が<b>{b}</b>個そろったときだけ。<b>{m}</b>通りしかないから<b>{m}/32</b>だワン！', '32通りのうち、印が<b>{b}</b>個になるのは<b>{m}</b>通り。確率にすると<b>{m}/32</b>だね！', '印<b>{b}</b>個の出方を数えると<b>{m}</b>通り。だから「<b>{n}</b>」は<b>{m}/32</b>なんだワン。', '「<b>{n}</b>」の出方は全部で<b>{m}</b>通り。32で割って<b>{m}/32</b>だよ！'],
        'c.ge3': ['3が10通り、4が5通り、10が1通り。足して<b>{m}/32</b>だワン！', '10＋5＋1＝<b>{m}</b>通り。だから<b>{m}/32</b>、半分くらいはあるんだ。', '3以上になる目を全部拾うと、10＋5＋1で<b>{m}/32</b>だワン！'],
        'c.arm': ['腕の先に止まる目は {list}。足して<b>{m}/32</b>だね！', '届く目を拾うと {list}、合わせて<b>{m}/32</b>なんだ。', '腕の先までの距離の目は {list}。全部で<b>{m}/32</b>だワン！'],
        'c.home': ['残りのマスとぴったり同じ目でしか上がれないから、上がれる目は {list}。足して<b>{m}/32</b>だワン！', '駒ごとに合う目を足すと {list}、全部で<b>{m}/32</b>なんだ。', 'ちょうどの目でしか上がれないので、駒ごとに拾うと {list}。合わせて<b>{m}/32</b>だね！'],
        'c.most': ['2と3は、どちらも32通り中10通り。いちばん出やすいんだ！'] },
      cn: { 'c.rollNg': ['<b>{x}</b>は「<b>{v}</b>」が出る確率だから、ちがうんだ。', '<b>{x}</b>だと、「<b>{v}</b>」の出やすさになっちゃうワン。'],
        'c.noneNg': ['どの目の出方を32通りで数えても、<b>{x}</b>にはならないワン。'],
        'c.lowNg': ['<b>{x}</b>だと少なすぎるから、数え落としがあるね。', '<b>{x}</b>では足りないワン。足しわすれた目があるみたい。', '<b>{x}</b>は小さすぎるよ。まだ数えていない目があるんだ。', '<b>{x}</b>だと、合う目をひとつ見落としているワン。'],
        'c.highNg': ['<b>{x}</b>だと多すぎるから、数えなくていい目まで足しているね。', '<b>{x}</b>は大きすぎるワン。合わない目も足しちゃったみたい。', '<b>{x}</b>では数えすぎだよ。届かない目まで入っているんだ。', '<b>{x}</b>は多いワン。ぴったりじゃない目も足しちゃったね。'] },
    };
    function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
      const used = new Set(), perm = new Map();
      const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
      return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
    }
    const CAT = { basic: '基本（ベルの復元）', vari: '広く知られたルール' };
    function mini(s) {   // a small picture of the cross for the list (the 16 × 16 grid's arms, your pieces red, the rival's blue)
      const E = window.PatolliEngine; if (!s || !E) return '';
      const a = 7, n = 2 * a + 2, u = 100 / (n + 2), cells = [], pc = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const row = r === a || r === a + 1, col = c === a || c === a + 1; if (!row && !col) continue;
        const d = Math.min(row ? Math.min(c, n - 1 - c) : 99, col ? Math.min(r, n - 1 - r) : 99), end = !(row && col) && d === 0;
        cells.push(`<rect x="${(u + c * u).toFixed(2)}" y="${(u + r * u).toFixed(2)}" width="${(u * .92).toFixed(2)}" height="${(u * .92).toFixed(2)}" fill="${row && col ? '#12a4b8' : end ? '#f6ecd2' : '#d8bd7c'}"/>`); }
      for (const side of [0, 1]) for (const p of s.pos[side]) { const q = E.coords('bell', side, p, 1); if (q) pc.push(`<circle cx="${(u + q[1] * u + u * .46).toFixed(2)}" cy="${(u + q[0] * u + u * .46).toFixed(2)}" r="${(u * .42).toFixed(2)}" fill="${side ? '#2f6fb8' : '#c8402c'}" stroke="#000" stroke-width=".5"/>`); }
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(45 50 50) translate(14.6 14.6) scale(.708)">${cells.join('')}${pc.join('')}</g></svg>`;
    }
    const EMPTY = { rule: 'bell', pos: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]] };
    const KO = { 'c.roll': 'roll', 'c.ge3': 'ge3', 'c.arm': 'arm', 'c.home': 'home' };
    const D = {
      LKEY: 'aicoding-patolli-lessons', data: null,
      load() {
        const eng = window.PatolliEngine ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = '../patolli/engine.js?v=2'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
        return this.p || (this.p = Promise.all([getJ('../patolli/lessons.json?v=20261124c'), eng]).then(([d]) => { this.data = d; return this; }).catch(e => { this.p = null; throw e; }));
      },
      list(kind, lang) {
        if (kind === 'open') return [];
        const pr = J(this.LKEY, {}), d = this.data;
        return d.steps.map((s, i) => [s, i]).filter(([s]) => s.v2).map(([s, i]) => { const c = d.cats.find(x => x.steps.includes(s.id)) || {};
          return { key: String(i), cat: c.id || s.cat, catName: lang === 'ja' ? CAT[c.id] || tx(c.name, lang) : tx(c.name, lang), title: tx(s.title, lang), sub: tx(s.tip, lang), svg: mini(s.diagram && s.diagram.s), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '', full: false }; });   // (only the lessons rebuilt and checked — v2 — are listed)
      },
      msg(r, lang) { const t = r && this.data.msg[r[0]]; return t ? fill(tx(t, lang), r[1] || {}) : ''; },
      pos: (s, n, marks, lock) => ({ patolli: { s: s || EMPTY, n: n == null ? null : n, marks: marks || [], lock: !!lock }, me: 1, dice: [n == null ? -1 : n] }),   // (dice: the throw — two problems with another throw are not the same problem)
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s) return null;
        const ja = lang === 'ja', kk = +key, V = voice(kk * 3 + 1), id = s.id;
        const R = ja ? JA.ramp[id] : null;
        const RUI = { step: d.ui.rampStep, main: d.ui.rampMain, next: d.ui.next, note: d.ui.rampNote, look: d.ui.look, ans: d.ui.ans, ng: d.ui.rampRetry, cont: d.ui.next };
        const RU = (k, v) => ja && k === 'ng' ? V.v(['ちがうみたい。もう一回考えてみよう！', 'うーん、もう一度！ 困ったら「ヒント」を押してね。', 'あと少し！ もう一回やってみようワン。']) : ja && k === 'note' ? '準備は点数に入らないから、何回でも試していいよ。' : fill(tx(RUI[k], lang), v || {});
        const ramp = (s.ramp || []).map(r => {
          const o = { k: r.k, s: r.s, n: r.n, seq: r.seq, marks: r.marks || [], look: r.look || [], ok: r.ok, kind: r.kind, opts: r.opts, ans: r.ans };
          if (r.k === 'explain') { o.t = ja ? R.et : tx(r.t, lang); o.b = ja ? R.eb : tx(r.body, lang); }
          else { o.t = ja ? R.tt : tx(r.t, lang); o.g = ja ? R.g : tx(r.t, lang); o.h = ja ? R.h : tx(r.h, lang); o.y = ja ? R.y : tx(r.g, lang) || tx(d.ui.rampGood, lang); }
          if (r.kind === 'choice') { o.choices = r.opts.map(x => tx(x, lang)); o.right = r.ans; }
          return o;
        });
        const intro = ja ? JA.intro[id] : tx(s.body, lang);
        const N = s.problems.length;
        const probs = s.problems.map((q, pi) => {
          const last = pi === N - 1;
          if (q.kind === 'choice') {
            const kind = KO[q.why[0]], ck = kind === 'roll' ? (q.why[1].n === 1 ? 'roll1' : 'roll10') : kind;
            const lab = x => tx(x, lang);
            const bn = kind === 'roll' ? q.why[1].n : kind === 'ge3' ? 3 : null;   // (the beans at rest show the throw asked about)
            const o = { kind: 'choice', P: q, pos: this.pos(q.s || EMPTY, bn, q.marks || [], true), marks: q.marks || [], choices: q.opts.map(lab), right: q.ans, ans: q.ans, dHint: true, hint: [], own: ja,
              ask: ja ? JA.cq[ck][0] : tx(q.q, lang), hintTx: ja ? V.v(JA.chint[kind]) : tx(s.hints[pi % 2], lang) };
            const why0 = this.msg(q.why, lang), why = () => ja ? fill(V.v(JA.cw[q.why[0]]), q.why[1]) : why0;
            o.good = () => ja ? `${V.v(JA.cheer)} ${why()}${last ? ' ' + V.v(JA.push) : ''}` : why0;
            o.ng = u => { const i = typeof u === 'number' && u !== q.ans ? u : q.ans === 0 ? 1 : 0, g = q.ngo && q.ngo[i];
              if (!ja) return (g ? this.msg(g, lang) + ' ' : '') + why0;
              const gx = g ? fill(V.v(JA.cn[g[0]]), Object.assign({}, g[1], { x: plain(lab(q.opts[i])) })) : '';
              return `${V.v(JA.soft)} ${gx} ${fill(V.v(['正解は<b>{a}</b>。', '正解は<b>{a}</b>だよ。', '<b>{a}</b>が正解だワン！', 'ほんとうの正解は<b>{a}</b>なんだ。']), { a: plain(lab(q.opts[q.ans])) })}${why()}`; };
            return o;
          }
          const wv = Object.assign({ n: q.n }, q.why[1]);
          const ask = ja ? fill(V.v(last ? JA.askLast : JA.ask), { n: q.n }) : fill(tx(d.ui.qMove, lang), { n: q.n });
          const o = { kind: 'ptmove', P: q, pos: this.pos(q.s, q.n, [], false), ans: q.best[0], ok: [q.best[0]], dHint: true, hint: (q.look || []).slice(), own: ja, ask,
            hintTx: ja ? fill(V.v(JA.hint[id]), { n: q.n }) : tx(s.hints[pi % 2], lang) };
          o.good = () => ja ? `${V.v(JA.cheer)} ${fill(V.v(JA.w[q.why[0]]), wv)}${pi % 2 || last ? ' ' + V.v(JA.push) : ''}` : this.msg(q.why, lang);
          o.ng = u => { const from = Array.isArray(u) ? u[0] : u, f = q.ng && q.ng[from] ? from : Object.keys(q.ng || {})[0], r = q.ng && q.ng[f];
            if (!ja) return this.msg(r, lang);
            return `${V.v(JA.soft)} ${r ? fill(V.v(JA.n[r[0]]), Object.assign({ n: q.n }, r[1] || {})) : ''}`; };
          return o;
        });
        return { id, title: tx(s.title, lang), intro, ramp, RU, probs, first: +key === 0,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, pass: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), pass: !!o.pass || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u, p) { const from = Array.isArray(u) ? u[0] : u; return from === p.ans ? 20 : 0; },   // (= patolli/app-learn.js: only the best move is right — 追3)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id); if (!s || !s.diagram) return null; return { pos: this.pos(s.diagram.s, null, s.diagram.marks || [], true) }; },
      rampPos(it) { return D.pos(it.s || null, it.k === 'try' && it.kind !== 'choice' ? it.n : it.k === 'explain' ? it.n : null, [], it.k !== 'try' || it.kind === 'choice'); },
      rampBody: (it, lang) => it.b,
      rampSeq: it => (it.seq || []).map(x => x.slice()),
      rampMarks: it => (it.k === 'explain' || it.kind === 'choice' ? it.marks : []).slice(),
      rampLook: it => (it.look || []).slice(),
      rampAns: it => it.ok ? it.ok[0][0] : it.right,
      rampAnsMk: it => it.ok ? [{ m: it.ok[0].slice(), cls: 'ok' }] : [],
      rampOk: (it, u) => { const from = Array.isArray(u) ? u[0] : u; return !!(it.ok && it.ok.some(x => x[0] === from)); },
      rampUndo: P => P.undo(),
    };
    return D;
  }
  window.AtlasLsPatolli = { make };
})();
