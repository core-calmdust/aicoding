/* =====================================================================
   Ugolki — the lessons on the 3D board (atlas/lessons3d.js DATA.ugolki, 2026-11-24 担当D).
   ugolki/lessons.json (the classic 3×3 rule c33; the same file as the 2D lessons, progress the full game's
   'aicoding-ugolki-lessons' { id: { best, clear } }), told by モリフク (Millowl, the guide of atlas/rules/ugolki.js).
   Every reason is a fact of the board (fact(): squares gained or lost towards the far corner, hops, pieces home, holes left),
   checked for every legal move by tools/lesson-verify-ugolki-ls.js. No coordinates on the 3D board: the answer is the green
   move, yours the red one. Only the lessons checked and rebuilt for the 3D are listed (READY); the others stay in the full game.
   AtlasLsUgolki.make(H) → the DATA object (H: the helpers of lessons3d.js — getJ, J, put, fill).
   ===================================================================== */
(function () {
  'use strict';
  const READY = ['b_step', 'b_jump', 'b_enter', 'b_finish'];
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const ENG = '../ugolki/engine.js?v=13-v3nn-b3';   // (= atlas/games/ugolki.js: one cache)
  // ---------- モリフク's words (ja) ----------
  const JA = {
    intro: {
      b_step: 'ホー、モリフクだよ！ ウゴルキは、9こを全部<b>向かいの隅（陣地）</b>へ先に運んだほうが<b>勝ち</b>のレースゲーム。白は右上をめざすんだ。<br>駒は<b>縦か横に1マス</b>。右か上なら陣地に近づき、左か下だと遠ざかる。<b>近づける1歩</b>を探してね。',
      b_jump: 'となりの駒（自分のでも相手のでも）を<b>跳び越える</b>と、一気に2マス進めるんだ。<br>跳んだ先でまた跳べれば、同じ手で<b>何回でも続けて</b>跳べる。向きを変えてもいい。最初の2問は1回のジャンプ、残りは連続ジャンプ。<b>いちばん遠くまで行く道</b>を探そう！',
      b_enter: '点線で囲まれた右上の9マスが<b>白の陣地</b>。駒を全部ここに入れたら勝ちなんだ。<br>前へ進む手はたくさんあっても、陣地の中まで届く手は少ない。<b>外の駒を陣地へ入れる手</b>を探そう。1歩で入ることも、跳んで入ることもあるよ。',
      b_finish: '陣地に8こ入って、あと<b>1マスだけ空いている</b>。最後の1こを入れれば完成だ！<br>完成したら黒に<b>最後の1手</b>があって、黒もそこで完成すれば引き分け。この問題の黒は次の1手では完成できないから、完成させれば勝ちだよ。',
    },
    ask: {
      b_step: ['白の番！ 陣地に近づく1歩はどれかな？', 'ホー、前がふさがった駒が多いね。近づける1歩を探して！', '右か上へ1マス、空いている所に動ける駒はどれ？', '白の番だよ。陣地に1マス近づく手を見つけよう！', '跳べる駒はあるけど、近づくジャンプはない。近づく1歩はどれ？'],
      b_jump: ['白の番！ いちばん遠くまで進む手はどれ？', 'ホー、跳び越せる駒がいるね。いちばん前へ行ける跳び方は？', '跳んだ先でまた跳べないかも見て、いちばん遠い道を選ぼう！', '白の番だよ。1手でいちばん陣地に近づくのはどの跳び方？', 'ジャンプの道すじ、全部くらべてみよう。いちばん遠いのは？'],
      b_enter: ['白の番！ 駒を陣地に入れる手はどれかな？', 'ホー、陣地の中まで届く駒はどれ？', '点線の中へ入れる手を探して！ 前へ進むだけじゃだめだよ。', '白の番だよ。外の駒を1こ、陣地に入れよう！', '陣地の空きマスに届くのは、どの駒のどの道？'],
      b_finish: ['白の番！ 陣地を完成させる手はどれ？', 'ホー、空きはあと1マス。最後の1こを入れよう！', '外に残った1こ、どの道なら空きマスに届く？', '白の番だよ。1手で陣地を完成させて！', '最後の1こを入れて勝ち切ろう。どう動く？'],
    },
    askLast: ['ホー、これで最後の問題！ じっくり見て決めよう。', 'ラストだよ。ここまでのコツを全部使ってね！'],
    hint: {
      b_step: ['光っているのが、右か上が空いている駒。そのどれかを1マス動かそう。', 'ホー、金の輪の駒をよく見て。右か上のマスが空いているかな？', '左や下へ動くと遠ざかっちゃう。光る駒の右か上を確かめよう。', '金の輪がついた駒なら、陣地に近づく1歩が指せるんだ。', 'ふさがっていない向きを探そう。光る駒がヒントだよ！', 'ホー、輪のついた駒のとなり、右側と上側に注目！'],
      b_jump: ['光っている駒から跳ぶ道を数えてみて。跳んだ先でまた跳べないかな？', 'ホー、金の輪の駒がスタート。着地したマスのとなりにも駒はいる？', '1回で止めずに、続けて跳べる道を全部たどろう。', '輪のついた駒の跳び方をくらべて、いちばん右上まで行くのを選ぼう。', 'となりの駒の向こうが空いていれば跳べる。光る駒から試してみて！', 'ホー、着地点ごとに、次に跳べる駒を数えていこう。'],
      b_enter: ['光っているのが陣地の空きマス。そこへ届く駒を探そう。', 'ホー、金色のマスに1歩で届く駒、跳んで届く駒はいる？', '金色の空きマスのとなりと、2マス先を見てみて。', '陣地の空きマス（金色）に着地できる道を探そう！', '点線のすぐ外にいる駒から、光るマスまでの道を数えてみて。', 'ホー、跳び越せば一気に中まで届くこともあるよ。'],
      b_finish: ['光っているのが最後の空きマス。外の1こはそこへ届くかな？', 'ホー、金色のマスへの道を探そう。跳んで届くこともあるよ。', '外の駒から金色の空きマスまで、1歩か跳び越しで行ける道はどれ？', '金色のマスのとなりや、跳び越した先を見てみて。', '陣地の中の駒は動かさなくていい。外の1こに注目！', 'ホー、空きマスの手前に跳び台になる駒はいる？'],
    },
    cheer: ['ホー、お見事！', 'ばっちり！', 'さすが！', 'いいね、その手！', 'すごい！ 正解！', 'やったね！'],
    push: ['この調子で次もいこう！', '次も見つけられるかな？', 'ホー、目が慣れてきたね。次へ！', 'いい流れ。もう1問いこう！', 'その見方、次でも使えるはず！', 'どんどんうまくなってる！'],
    soft: ['大丈夫、次は見つかる！', 'ドンマイ！', 'ホー、今度は見つけよう！', '平気平気、ここで覚えよう！', 'よくある見落としだね！', '次はきっと気づけるはず！'],
    w: {
      step: ['緑の1歩で陣地に1マス近づいた。この形で寄れる1歩は{n}通りしかないんだ。', '右か上へ1マス、ちゃんと詰めたね。ほかの駒は前がふさがっていて、正解は{n}つだけ。', '前のマスが空いた駒を見つけたね！ 陣地までの道のりが1つ縮む手は、ここでは{n}通り。', 'ホー、ふさがった駒にまどわされなかった。距離が縮む1歩は全部で{n}通りあったよ。', '空いている向きを見のがさなかったね。この局面で正しい1歩は{n}通りなんだ。'],
      jump1: ['駒を1こ跳び越えて、一気に{G}マス前進！ 1歩の2倍進めたね。', 'となりの駒の向こうが空いていたから跳べた。{G}マス近づいたよ。', 'ホー、跳び越しで{G}マス！ 1歩ずつより速いのがジャンプなんだ。', '向こう側の空きマスを見つけたね。これで{G}マスの前進だ。'],
      chain: ['{h}回続けて跳んで、{G}マスも前進！ 着地のたびに次の跳び先を見つけたね。', 'ホー、{h}連続ジャンプで{G}マス！ 途中で止まらなかったのが大きいんだ。', '跳んで、また跳んで、全部で{h}回。陣地に{G}マス近づいたよ。', '着地点の先にも跳び台があったから、{h}回つなげて{G}マス。最長の道だね。'],
      in: ['駒が陣地に入って、陣地の駒は{a}こになった！', '点線の中に入れたね。これで陣地に{a}こだ。', '陣地の空きマスにちゃんと届いた。中の駒は{a}こになったよ。', 'ホー、ゴールの隅に1こ追加！ 陣地は{a}こになったね。'],
      inJ: ['跳び越して陣地に入った！ 陣地の駒は{a}こになったよ。', 'ジャンプで点線の中へ。これで陣地に{a}こだ。', '跳んで届く空きマスを見つけたね。陣地の駒は{a}こになった。', 'ホー、ひと跳びで中まで！ 陣地に{a}こそろったね。'],
      done: ['陣地の9マスが全部うまった！ 黒は次の1手で完成できないから、白の勝ちだよ。', 'ホー、9マス完成！ 黒の最後の1手でも追いつけないから、これで勝ちだ。', '最後の1こが入って9マス完成！ 黒はまだ完成できないから、白の勝ちだね。'],
      doneJ: ['跳び越して最後の空きマスへ！ 9マス完成で、黒は次の1手で追いつけないから白の勝ちだよ。', 'ホー、ジャンプで9マス完成！ 黒の最後の1手では完成できないから、これで勝ちだ。', '跳んで届く道を見つけたね。9マス全部うまって、黒はまだそろわないから白の勝ち！'],
    },
    n: {
      back: ['赤い手は左か下へ動くから、陣地から{k}マス遠ざかっちゃう。緑の1歩なら1マス近づくよ。', '赤だと陣地から{k}マス離れてしまうんだ。緑は右か上へ寄る手だね。', '赤い手のあと、陣地までの道のりが{k}マス長くなる。緑なら距離が1つ縮むんだ。', '赤は下がる向きだから{k}マス遠回り。緑の手で右上へ寄ろう。', '左か下へ動くと、陣地から{k}マス遠のくんだ。緑のように右か上へ1マス進もう！'],
      backJ: ['赤いジャンプは左か下へ跳ぶから、陣地から{k}マス遠ざかっちゃう。緑の1歩なら1マス近づくよ。', '赤は跳べるけど後ろ向きだから、陣地から{k}マス離れるんだ。緑なら前へ1マス。', '跳んでも向きが逆だと、陣地まで{k}マス遠くなる。緑の1歩が正解だね。'],
      jump0: ['赤いジャンプは行って戻っただけだから、陣地までの道のりは変わらないんだ。緑の1歩なら1マス近づく。', '赤い道は回り道で、陣地への距離は同じまま。緑なら1つ縮められるよ。', '跳んでも前へ進まないと、陣地までの距離はそのまま。緑の1歩で寄ろう。'],
      stepS: ['赤い手は1歩だけだから1マスしか近づかない。緑のジャンプなら{G}マス進めるよ。', '赤の1歩では1マス。駒を跳び越せば、緑のように{G}マス進めるんだ。', '1歩ずつだと1マスどまり。跳び越せる駒がいるなら、緑のように{G}マスいける！'],
      stepB: ['赤い1歩は左か下へ動くから、陣地から1マス遠ざかる。緑のジャンプなら{G}マス前進だよ。', '赤だと1マス後ろへ下がってしまう。緑の跳び方なら{G}マス進めるんだ。', '後ろ向きの1歩だと、陣地が1マス遠くなる。緑なら跳んで{G}マス！', '赤い手は下がる向きなので、陣地から1マス離れる。緑のジャンプで{G}マス進もう。', '左か下への1歩だと遠ざかるだけ。緑の道なら{G}マス近づけるよ。'],
      stop: ['赤は途中で止まったから{g}マス。そこからまだ跳べたんだ。緑の道なら{G}マス進めるよ。', '赤い手は着地したマスで止まるので{g}マスどまり。続けて跳べば、緑のように{G}マス。', '途中で止めたから{g}マスだけ。着地点からもう一度跳べて、緑なら{G}マスなんだ。'],
      short: ['赤いジャンプは{g}マスで終わるから届かない。緑の跳び方なら{G}マス進めるよ。', '赤の道は{g}マスで行き止まりなんだ。緑は着地のたびにまた跳べて{G}マス。', '赤い手でも{g}マス進むけど、緑なら{G}マス。もっと遠い道があったね。', '赤だと{g}マスどまり。緑の道なら跳び台が続いて{G}マスいける！'],
      shortN: ['赤いジャンプは陣地に近づかない向きだから、距離が縮まらないんだ。緑の跳び方なら{G}マス進めるよ。', '赤は跳んでも横向きなので、陣地への距離が同じ。緑の道で{G}マス進もう。', '向きがちがうと、跳んでも陣地に寄れない。緑なら{G}マス前進だね。'],
      shortB: ['赤いジャンプは後ろ向きだから、陣地から{k}マス遠ざかる。緑なら{G}マス前進だよ。', '赤だと{k}マス下がってしまうんだ。緑の跳び方で{G}マス進もう。', '後ろへ跳ぶと陣地が{k}マス遠くなる。緑の道なら{G}マス近づけるね。', '赤い手は左か下へ跳ぶので{k}マス離れる。緑なら{G}マス前へ！', '跳ぶ向きが逆だと{k}マス遠回り。緑のジャンプで{G}マス進もう。'],
      near: ['赤い手は{g}マス近づくけど、陣地の手前で止まっちゃう。緑の手なら陣地の中まで届くよ。', '赤だと{g}マス進んでも点線の外だから、入った駒は増えない。緑は陣地の空きマスに入れるんだ。', '前へ{g}マス進んでも、点線の外で止まると陣地の駒は増えない。緑なら中まで入れる。', '赤い手は{g}マス進んでも点線の外なので、陣地はそのまま。緑の手なら1こ入るね。', '{g}マス寄るだけだと陣地には届かないんだ。緑は空きマスまで行ける手だよ。'],
      none: ['赤い手は陣地の外のままで、近づきもしないんだ。緑なら陣地に入れるよ。', '赤だと駒は点線の外から出られず、陣地にも近づかない。緑の手を見て。', '外で横や後ろへ動くと、陣地は1マスも近くならない。緑なら中まで届くね。'],
      inside: ['赤い手は陣地の中で動いただけだから、入っている駒は{a}このまま増えないんだ。緑なら外の駒を入れられるよ。', '赤は陣地の中の駒を動かすだけなので、陣地の駒は{a}このまま。緑の手で1こ増やそう。', '中の駒を動かしても、陣地は{a}こから増えない。緑なら外の1こが入るね。', '陣地の中で場所を変えるだけだと、駒は{a}このまま。緑のように外から入れよう！', '赤い手では外の駒が残ったままだから、陣地は{a}こ。緑なら1こ増えるよ。'],
      leave: ['赤い手だと駒が陣地から出るから、陣地の駒が{a}こに減っちゃう。緑なら1こ入るよ。', '赤は陣地の駒を外へ出す手なので、中は{a}こに減るんだ。緑の手を見て。', '陣地から出てしまうと、中の駒は{a}こに減る。緑なら逆に1こ増やせるね。', '赤だと陣地の駒が外へ出て{a}こになる。緑の手で入れる側に回ろう！', '入った駒を出してしまうと{a}こに減っちゃう。緑なら外から1こ入るよ。'],
      fNear: ['赤い手は{g}マス近づくけど、空きマスには届かない。陣地の空きは1マスのままなんだ。緑なら完成！', '赤だと外の1こは{g}マス進むだけなので、陣地はまだ1マス空いている。緑の道なら届くよ。', '{g}マス寄っても空きマスに入らなければ未完成。緑なら最後の1マスまで届くね。'],
      fNone: ['赤い手のあとも外の1こは陣地に届かず、近づきもしない。空きは1マスのままだから未完成。緑なら完成！', '赤だと外の駒が空きマスへ近づかないんだ。陣地は1マス空いたまま。緑の道を見て。', '外の駒が横や後ろへ動くと、空きマスは埋まらない。緑なら完成だね。'],
      fInside: ['赤い手は陣地の中の駒を動かしただけだから、空きは1マスのままで完成しないんだ。緑なら外の1こが入るよ。', '赤は中の駒の手なので、陣地はまだ1マス空いている。外の1こを入れる緑の手で完成だ。', '中の駒を動かしても、外の1こが入らなければ完成しない。緑の手を見て！', '陣地の中で場所を変えるだけだと、空きは1マス残る。緑なら外の1こで埋まるね。', '赤い手では外の駒がそのままだから未完成。緑なら9マスそろうよ。'],
      fLeave: ['赤い手だと陣地から駒が出るから、空きが{holes}マスに増えちゃう。緑なら外の1こが入って完成！', '赤は陣地の駒を外へ出す手なので、空きが{holes}マスになるんだ。緑の道で完成させよう。', '陣地から出ると空きは{holes}マス。完成から遠のくから、緑の手で埋めよう！', '入った駒を外へ出すと、空きが{holes}マスに増える。緑なら1手で完成だね。', '赤だと陣地の空きが{holes}マスになってしまう。緑のように外の1こを入れよう。'],
    },
  };
  // other languages: the 2D words (ls.<id>.why / ng), the moves named by their marks
  const SPOT = k => `<i class="ls-spot ${k}"></i>`;
  function voice(seed) {   // each list in its own order per lesson (a seeded shuffle), a line never twice in a lesson while unused ones are left
    const used = new Set(), perm = new Map();
    const order = list => { let o = perm.get(list); if (o) return o; let h = seed * 2654435761 % 4294967296 + list.length * 97; o = list.slice(); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) % 2147483648; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } perm.set(list, o); return o; };
    return { v(list) { const o = order(list), x = o.find(t => !used.has(t)) || o[0]; used.add(x); return x; } };
  }
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  // ---------- the board facts of one move (White = 1 to move; DIST = steps to the far corner) ----------
  function fact(E, id, spec, m) {
    E.setRule('c33');
    const p = E.Pos.from(spec), me = p.turn, T = E.target(me), D = E.DIST()[me], f = E.mFrom(m), t = E.mTo(m);
    if (!p.moves().includes(m)) return null;
    const g = D[f] - D[t], h = E.isJump(p, m) ? E.path(p, m).length - 1 : 0, q = p.clone().play(m);
    const o = { g, h, inF: !!T[f], inT: !!T[t], home: q.inTarget(me), holes: 9 - q.inTarget(me), home0: p.inTarget(me) };
    if (id === 'b_step') o.k = g > 0 ? 'step' : g < 0 ? 'back' : h ? 'jump0' : 'side';
    else if (id === 'b_jump') o.k = !h ? 'step' : 'jump';
    else if (id === 'b_enter') o.k = !o.inF && o.inT ? 'in' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
    else o.k = q.done(me) ? 'done' : o.inF && o.inT ? 'inside' : o.inF ? 'leave' : g > 0 ? 'near' : 'none';
    return o;
  }
  // the words for a move u of a problem P: { k, html }
  function say(E, id, P, u, lang, V, last, tx) {
    const f = fact(E, id, P.s, u), fb = fact(E, id, P.s, P.best), right = P.ok.includes(u);
    if (lang !== 'ja') return { f, html: tx(right ? 'why' : 'ng', { m: SPOT('ok'), x: SPOT('ng') }) };
    const v = { n: P.ok.length, G: fb.g, g: f.g, k: -f.g, h: f.h, a: id === 'b_enter' && (f.k === 'inside') ? f.home0 : f.home, holes: f.holes };
    if (right) {
      const k = id === 'b_step' ? 'step' : id === 'b_jump' ? (f.h > 1 ? 'chain' : 'jump1') : id === 'b_enter' ? (f.h ? 'inJ' : 'in') : (f.h ? 'doneJ' : 'done');
      if (id === 'b_jump') v.G = f.g;
      return { f, k, html: `${V.v(JA.cheer)} ${fill(V.v(JA.w[k]), v)}${last ? '' : ' ' + V.v(JA.push)}` };
    }
    let k;
    if (id === 'b_step') k = f.k === 'back' ? (f.h ? 'backJ' : 'back') : 'jump0';
    else if (id === 'b_jump') {
      if (!f.h) k = f.g > 0 ? 'stepS' : 'stepB';
      else { E.setRule('c33'); const p = E.Pos.from(P.s), path = E.path(p, P.best); k = E.mFrom(u) === E.mFrom(P.best) && path.slice(1, -1).includes(E.mTo(u)) ? 'stop' : f.g > 0 ? 'short' : f.g < 0 ? 'shortB' : 'shortN'; }
    } else if (id === 'b_enter') k = f.k;
    else k = { near: 'fNear', none: 'fNone', inside: 'fInside', leave: 'fLeave' }[f.k];
    return { f, k, html: `${V.v(JA.soft)} ${fill(V.v(JA.n[k]), v)}` };
  }
  // the hint's marks: b_step the pieces with a free square right / above, b_jump the answer's piece, b_enter / b_finish the empty squares of the corner
  function hintPts(E, id, P) {
    E.setRule('c33'); const p = E.Pos.from(P.s), T = E.target(p.turn);
    if (id === 'b_step') return [...new Set(P.ok.map(E.mFrom))];
    if (id === 'b_jump') return [E.mFrom(P.best)];
    const o = []; for (let i = 0; i < 64; i++) if (T[i] && p.sq[i] === 0) o.push(i); return o;
  }
  const loadJs = (u, ok) => ok() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = u; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
  function make(H) {
    const { getJ, J, put } = H;
    const D = {
      LKEY: 'aicoding-ugolki-lessons', data: null, I: null, JA, READY,
      load() {
        const ld = u => fetch(u).then(r => r.text()).catch(() => '');
        return this.p || (this.p = Promise.all([getJ('../ugolki/lessons.json?v=4'), ld('../ugolki/i18n-ug.js?v=4lv'), ld('../ugolki/i18n-ug-more.js?v=4lv'), ld('../ugolki/i18n-ug-eu.js?v=4lvn'), ld('../ugolki/i18n-ug-hiar.js?v=4lv-l14'),
          loadJs(ENG, () => !!window.UgolkiEngine)])
          .then(([d, ...src]) => { const w = { I18N: {} }; LANGS.forEach(l => { w.I18N[l] = {}; }); for (const tx of src.slice(0, 4)) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) { console.warn('[lessons3d] ugolki texts', e); } }
            this.I = w.I18N; this.data = d; return this; })
          .catch(e => { this.p = null; throw e; }));
      },
      tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
      mini: sp => window.AtlasMini && AtlasMini.ugolki ? AtlasMini.ugolki(sp) : '',
      list(kind, lang) {
        if (kind === 'open') return [];
        const d = this.data, pr = J(this.LKEY, {});
        return d.steps.map((s, i) => [s, i]).filter(([s]) => READY.includes(s.id)).map(([s, i]) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
      },
      lesson(key, lang) {
        const d = this.data, s = d.steps[+key]; if (!s || !READY.includes(s.id)) return null;
        const E = window.UgolkiEngine, ja = lang === 'ja', id = s.id, V = voice([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 100003), N = s.problems.length;
        const T = (k, v) => this.tx('ls.' + id + '.' + k, lang, v);
        const probs = s.problems.map((P, pi) => {
          const last = pi === N - 1;
          const o = { pos: { spec: P.s, me: 1 }, kind: 'best', P, ans: P.best, ok: P.ok.slice(), own: ja, ckls: true, dHint: true, hint: E ? hintPts(E, id, P) : [],
            ask: ja ? V.v(last ? JA.askLast : JA.ask[id]) : T('goal'), hintTx: ja ? V.v(JA.hint[id]) : T('hint') };
          const sayU = u => say(E, id, P, u, lang, V, last, (k, v) => T(k, v)).html;
          o.good = u => sayU(u == null ? P.best : u);
          o.ng = u => { if (u == null || P.ok.includes(u)) { E.setRule('c33'); u = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); } return sayU(u); };
          return o;
        });
        return { id, title: T('title'), intro: ja ? JA.intro[id] : T('intro'), ramp: null, RU: () => '', probs,
          save: pts => { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false }, pass = pts >= 75; pr[id] = { best: Math.max(o.best || 0, pts), clear: !!o.clear || pass }; put(this.LKEY, pr); return pass; } };
      },
      points(P, u) { return P.ok.includes(u) ? 20 : 0; },   // (= ugolki/app.js okAnswer: a move in ok is right)
      introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: 1, lock: true } } : null; },
    };
    return D;
  }
  const API = { make, JA, READY, fact, say, hintPts, voice };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AtlasLsUgolki = API;
})();
