// 雀華：練習問題の解説（小町のことば）。lessons.js の explain を、レッスンの種類ごとの「わけを話す」解説に置き換える。
// （ユーザー 2026-11-20「解説がワンパターンで面白くない問題、全レッスンでしっかり見直して」）
//   ・枚数だけを言わない：待ちの形（両面・嵌張・辺張・シャンポン・単騎・多面）、引いたらテンパイになる牌、河に見えている牌、
//     役がつくわけ（三色なら「3・4・5が3色にそろう」）、安全なわけ（「4萬が通っているので1萬・7萬の両面待ちはフリテン」）を、その局面の牌で話す。
//   ・比べる相手は、いちばん迷いやすい別の打牌。
//   ・どの文にも3〜5通りの言い方があり、局面（手牌）で選ぶ（同じ問題はいつも同じ、隣の問題とは変わる）。
//   ・英語はこれまでの説明（lessons.js）のまま。
(function (root) {
  'use strict';
  const LS = root.MJLessons, MJ = root.MJ;
  if (!LS || !MJ) return;
  const base = LS.explain;
  let VS = 0;
  const pk = (a, k = 0) => a[(VS + k * 7) % a.length];
  const T = id => id >> 2, nm = t => LS.tName(t, true), list = ts => ts.map(nm).join('・');
  const num = t => t % 9 + 1, suit = t => (t / 9) | 0;
  const SUIT = ['萬子', '筒子', '索子'];
  const cn = ts => ts[0] >= 27 ? list(ts) : ts.map(num).join('') + '萬筒索'[suit(ts[0])];   // 13萬, 56筒 …
  const OPEN = () => pk(['正解！', 'そのとおりです！', 'ばっちり♪', 'お見事です！', 'さすがです！', 'いいですね！'], 1);

  // ---------------------------------------------------------------- the table as this player sees it
  function ctx(g, s) {
    const p = g.P[s], c = MJ.countsIds(p.hand), m = p.melds.length;
    const unseen = x => Math.max(0, 4 - g.visibleCount(x, s));
    const seen = x => 4 - unseen(x) - c[x];   // copies out on the table (not in my hand)
    const after = d => { const cc = c.slice(); cc[d]--; return cc; };
    const K = d => { const cc = after(d), s0 = MJ.shanten(cc, m), out = []; for (let x = 0; x < 34; x++) if (cc[x] < 4) { cc[x]++; if (MJ.shanten(cc, m) < s0) out.push(x); cc[x]--; } return out; };
    const sh = d => MJ.shanten(after(d), m);
    const types = [...new Set(p.hand.map(T))].sort((a, b) => a - b);
    return { g, s, p, c, m, unseen, seen, after, K, sh, types };
  }
  // the wait of a 13-tile hand, in words
  function waitOf(X, d) {
    const c13 = X.after(d), W = [];
    for (let w = 0; w < 34; w++) if (c13[w] < 4) { c13[w]++; if (MJ.shanten(c13, X.m) === -1) W.push(w); c13[w]--; }
    if (!W.length) return null;
    const rem = W.reduce((a, w) => a + Math.max(0, X.unseen(w) - (w === d ? 0 : 0)), 0);
    const one = w => { const cc = c13.slice(); cc[w]++; const ty = [];
      for (const dc of MJ.decompose(cc)) {
        if (dc.pair === w && c13[w] === 1) ty.push({ k: 'tanki', sh: [w] });
        for (const gr of dc.groups) {
          if (gr.k === 'k' && gr.t === w && c13[w] === 2) ty.push({ k: 'shanpon', sh: [w, w] });
          if (gr.k === 's' && w >= gr.t && w <= gr.t + 2) { const a = gr.t;
            if (w === a + 1) ty.push({ k: 'kanchan', sh: [a, a + 2] });
            else if (w === a + 2 && num(a) === 1) ty.push({ k: 'penchan', sh: [a, a + 1] });
            else if (w === a && num(a) === 7) ty.push({ k: 'penchan', sh: [a + 1, a + 2] });
            else ty.push({ k: 'ryanmen', sh: w === a ? [a + 1, a + 2] : [a, a + 1] }); }
        }
      }
      const pref = ['ryanmen', 'shanpon', 'kanchan', 'penchan', 'tanki'];
      ty.sort((x, y) => pref.indexOf(x.k) - pref.indexOf(y.k)); return ty[0] || { k: 'tanki', sh: [w] }; };
    const ts = W.map(one);
    let kind, txt;
    if (W.length === 1) {
      const t0 = ts[0]; kind = t0.k;
      txt = kind === 'kanchan' ? pk([`${cn(t0.sh)}の嵌張で${nm(W[0])}待ち`, `${cn(t0.sh)}の間に${nm(W[0])}が入るのを待つ嵌張`, `カン${nm(W[0])}待ち（${cn(t0.sh)}の嵌張）`], 2)
        : kind === 'penchan' ? pk([`${cn(t0.sh)}の辺張で${nm(W[0])}待ち`, `端の${cn(t0.sh)}が${nm(W[0])}を待つ辺張`, `ペン${nm(W[0])}待ち（${cn(t0.sh)}の辺張）`], 2)
        : pk([`${nm(W[0])}の単騎待ち`, `${nm(W[0])}を1枚で待つ単騎`, `${nm(W[0])}単騎`], 2);
    } else if (W.length === 2 && ts.every(x => x.k === 'ryanmen') && W[1] - W[0] === 3) { kind = 'ryanmen';
      txt = pk([`${cn(ts[0].sh)}の両面で${list(W)}待ち`, `${list(W)}を待つ${cn(ts[0].sh)}の両面`, `${cn(ts[0].sh)}の両面（${list(W)}待ち）`], 2);
    } else if (W.length === 2 && ts.every(x => x.k === 'shanpon')) { kind = 'shanpon';
      txt = pk([`${nm(W[0])}と${nm(W[1])}のシャンポン待ち`, `対子2つ（${list(W)}）のシャンポン`, `${list(W)}のシャンポン`], 2);
    } else { kind = W.length >= 3 ? 'multi' : 'two';
      txt = W.length >= 3 ? pk([`${list(W)}の${W.length}面待ち`, `${list(W)}と${W.length}種類も待てる多面張`, `${W.length}種類（${list(W)}）待ちの広い形`], 2) : `${list(W)}待ち`;
    }
    return { W, kind, txt, rem, furi: W.filter(w => X.p.discards.has(w) || w === d) };
  }

  // ---------------------------------------------------------------- 一向聴（e5 一向聴の広い形・w6 残り枚数を数える）
  function iishanten(X, t, ok, th) {
    const tb = LS.discardTable(X.g, X.s), sh = Math.min(...tb.map(r => r[1])), at = tb.filter(r => r[1] === sh), best = Math.max(...at.map(r => r[2]));
    const row = tb.find(r => r[0] === t);
    const Kt = X.K(t);
    if (ok) {
      const o = at.filter(r => r[0] !== t && r[2] < best && !X.right(r[0])).sort((a, b) => b[2] - a[2])[0];
      let txt = `${OPEN()} ` + pk([`${nm(t)}を切っておけば、${list(Kt)}のどれを引いてもテンパイ。`, `${nm(t)}を外すと、テンパイになれる牌は${list(Kt)}の${Kt.length}種類。`, `${nm(t)}を切った形なら、${list(Kt)}が来ればテンパイです。`], 3);
      if (o) { const Ko = X.K(o[0]), lose = Kt.filter(x => !Ko.includes(x));
        if (th === 'w6') {   // the shape the right discard breaks: what it waited on is already out on the table
          const shp = shapeAround(X, t), dead = shp ? shp.w.map(w => [w, X.seen(w)]) : [];
          if (shp && dead.some(([, k]) => k)) txt += pk([` 崩した${cn(shp.sh)}の形が待つ${list(shp.w)}は、河やドラ表示牌にもう${dead.reduce((a, [, k]) => a + k, 0)}枚出ていて、残りは${shp.w.reduce((a, w) => a + X.unseen(w), 0)}枚だけ。`, ` 崩した${cn(shp.sh)}が欲しい${list(shp.w)}は、場にもう${dead.reduce((a, [, k]) => a + k, 0)}枚見えています。形は良くても、ほとんど残っていないんです。`, ` 河を見ると${list(shp.w)}がもう${dead.reduce((a, [, k]) => a + k, 0)}枚。${cn(shp.sh)}の形は見た目ほど強くありません。`], 4);
          txt += pk([` ${nm(o[0])}のほうを崩すと、${lose.length ? list(lose) + 'を引いても' : 'テンパイの道が'}${lose.length ? 'テンパイになれなくなっちゃいます。' : '狭くなっちゃいます。'}`, ` まだ残り枚数のある形を残すのが正解です♪`, ` 生きている形を残すと、テンパイしやすくなりますよ♪`], 5);
        } else {
          txt += lose.length ? pk([` ${nm(o[0])}を切ると、${list(lose)}ではテンパイになれないんです。`, ` ${nm(o[0])}のほうを切ってしまうと、${list(lose)}を引いてもテンパイしません。`, ` もし${nm(o[0])}を切ったら、${list(lose)}が来てもムダヅモになっちゃいます。`], 5)
            : pk([` ${nm(o[0])}を切っても似た形だけど、テンパイになれる牌の残りが少ないんです。`, ` ${nm(o[0])}を切るより、残っている牌の数がちょっとだけ多いんです。`], 5);
          txt += pk(['', `（${best}枚 対 ${o[2]}枚）`, ''], 6);
        }
      }
      return txt;
    }
    if (row[1] > sh) return pk([`${nm(t)}を切ると、テンパイから1歩遠くなっちゃいます…！ 形を崩さずに1枚選んで！`, `${nm(t)}は手の中で大事な役目をしてるんです…！ もう一回！`, `あっ、${nm(t)}を切ると一向聴から後戻り…！ ほかの牌を探してみて。`], 7);
    const bestT = at.find(r => r[2] === best)[0], lose = X.K(bestT).filter(x => !Kt.includes(x));
    return lose.length ? pk([`${nm(t)}を切ると、${list(lose)}を引いてもテンパイになれなくなっちゃいます…。もっと広く待てる切り方がありますよ！`, `惜しい…！ ${nm(t)}を切った形だと、${list(lose)}ではテンパイしないんです。`, `${nm(t)}でも一向聴だけど、${list(lose)}が来たときに困っちゃいます。ほかの牌は？`], 7)
      : pk([`${nm(t)}を切っても一向聴だけど、テンパイしやすさで少し負けてます…！ ほかの牌は？`, `うーん、${nm(t)}だと残り枚数が少なめ…。もっと広い形があるはず！`], 7);
  }
  // the two-tile shape a tile belongs to (two-sided / gap / edge) and what it waits on
  function shapeAround(X, t) {
    if (t >= 27) return null; const c = X.c, n = num(t), b = t - n + 1, has = k => k >= 1 && k <= 9 && c[b + k - 1] > 0, at = k => b + k - 1;
    for (const d of [1, -1]) if (has(n + d)) { const lo = Math.min(n, n + d); const w = [lo - 1, lo + 2].filter(k => k >= 1 && k <= 9).map(at); return { sh: [at(lo), at(lo + 1)], w }; }
    for (const d of [2, -2]) if (has(n + d)) { const lo = Math.min(n, n + d); return { sh: [at(lo), at(lo + 2)], w: [at(lo + 1)] }; }
    return null;
  }

  // ---------------------------------------------------------------- テンパイを取る（e6）
  function takeTenpai(X, t, ok) {
    if (ok) { const W = waitOf(X, t);
      const others = X.types.filter(x => x !== t && X.sh(x) > 0);
      const lone = others.find(x => !shapeAround(X, x) && X.c[x] === 1);
      let txt = `${OPEN()} ` + pk([`${nm(t)}を切れば、${W.txt}のテンパイ（残り${W.rem}枚）。`, `${nm(t)}を外すと${W.txt}でテンパイです。残りは${W.rem}枚。`, `${nm(t)}を切って、${W.txt}。テンパイ完成♪`], 3);
      if (lone) txt += pk([` ${nm(lone)}もひとりぼっちに見えるけど、ちゃんと面子の一部なんです。`, ` ${nm(lone)}を切りたくなるけど、それだと一向聴のまま…。`, ` 実は${nm(lone)}は手の中で役目があって、切るとテンパイしません。`], 4);
      else txt += pk([` ほかの牌はどれも面子や雀頭の一部。いらないのは${nm(t)}だけでした♪`, ` 残りの牌は、面子と雀頭の候補にきれいに収まっています。`, ''], 4);
      return txt; }
    return pk([`${nm(t)}を切ると、まだ一向聴…。13枚が4つの面子と雀頭に分かれる形を探してみて！`, `うーん、${nm(t)}は手の中で必要な牌みたい。どの牌がどこにも入らないかな？`, `${nm(t)}だとテンパイしないんです…。面子に入っていない牌を探して！`], 7);
  }

  // ---------------------------------------------------------------- 待ちの選び方（w1〜w5）
  function waitChoice(X, t, ok, th) {
    const opts = X.types.filter(d => X.sh(d) === 0).map(d => Object.assign({ d }, waitOf(X, d)));
    const me = opts.find(o => o.d === t);
    if (ok && me) {
      let txt = `${OPEN()} ` + pk([`${nm(t)}を切れば${me.txt}。`, `${nm(t)}を外して、${me.txt}に！`, `${nm(t)}を切ると${me.txt}の形になります。`], 3) + pk([`残りは${me.rem}枚。`, `まだ${me.rem}枚残っています。`, ''], 4);
      const wrongs = opts.filter(o => o.d !== t && !X.right(o.d));
      const alt = th === 'w5' ? (wrongs.filter(o => o.furi.length).sort((a, b) => b.rem - a.rem)[0] || wrongs.sort((a, b) => b.rem - a.rem)[0]) : wrongs.sort((a, b) => (a.furi.length - b.furi.length) || (b.rem - a.rem))[0];
      if (!alt) return txt;
      if (alt.furi.length) return txt + pk([` ${nm(alt.d)}を切ると${alt.txt}だけど、${list(alt.furi)}が自分の河にあるのでフリテン。ロンできません。`, ` ${nm(alt.d)}を切る形は、待ちの${list(alt.furi)}を自分で捨てているのでフリテン…。ツモでしかアガれないんです。`, ` 待ちが広く見える${nm(alt.d)}切りは、${list(alt.furi)}が自分の河にあってフリテン。ロンできる待ちを選ぶのが大事です♪`], 5);
      if (th === 'w2') { const dw = alt.W.filter(w => X.seen(w));
        return txt + (dw.length ? pk([` ${nm(alt.d)}を切ると${alt.txt}だけど、${list(dw)}は河やドラ表示牌にもう${dw.reduce((a, w) => a + X.seen(w), 0)}枚見えていて、残り${alt.rem}枚しかありません。`, ` ${nm(alt.d)}切りの${alt.txt}は、場に${list(dw)}がもう${dw.reduce((a, w) => a + X.seen(w), 0)}枚。形は同じでも、残りが少ないんです。`, ` 河をよく見ると、${list(dw)}は${dw.reduce((a, w) => a + X.seen(w), 0)}枚出ています。${nm(alt.d)}を切る待ちは残り${alt.rem}枚だけ。`], 5)
          : ` ${nm(alt.d)}を切ると${alt.txt}で、残りは${alt.rem}枚です。`); }
      if (th === 'w3' && alt.kind === 'shanpon') return txt + pk([` ${nm(alt.d)}を切ると${alt.txt}。2種類待てるように見えるけど、それぞれ手の中で2枚使っているので、残りは合わせて${alt.rem}枚なんです。`, ` シャンポン（${nm(alt.d)}切り）は待ちが2種類でも、${list(alt.W)}はもう2枚ずつ手にあるので、残りは${alt.rem}枚だけ。`, ` ${nm(alt.d)}切りのシャンポンは残り${alt.rem}枚。両面のほうが、同じ2種類でも残りが多いんです♪`], 5);
      if (th === 'w4') return txt + pk([` ${nm(alt.d)}を切ると${alt.txt}で、待ちは${alt.W.length}種類どまり。`, ` ${nm(alt.d)}切りだと${alt.txt}。${me.W.length}種類待てる形のほうがずっと有利です♪`, ` つながった形はうまく切ると待ちが増えます。${nm(alt.d)}を切ると${alt.W.length}種類だけなんです。`], 5);
      return txt + pk([` ${nm(alt.d)}を切ると${alt.txt}。${alt.W.length < me.W.length ? '待ちが1種類だけなので、両面にはかないません。' : `残りは${alt.rem}枚です。`}`, ` もし${nm(alt.d)}を切ったら${alt.txt}（残り${alt.rem}枚）。${alt.kind === 'kanchan' || alt.kind === 'penchan' || alt.kind === 'tanki' ? '1種類待ちは、アガれる牌が少ないんです。' : ''}`, ` ${nm(alt.d)}切りの${alt.txt}より、こっちのほうがアガりやすい形です♪`], 5);
    }
    const x = opts.find(o => o.d === t);
    if (!x) return pk([`${nm(t)}を切ると、テンパイがくずれちゃいます…！ テンパイのまま待ちを選んで！`, `あっ、${nm(t)}は必要な牌…！ テンパイになる切り方から選びましょう。`, `${nm(t)}を切るとテンパイしないんです。もう一回！`], 7);
    if (x.furi.length) return pk([`${nm(t)}を切ると${x.txt}だけど、${list(x.furi)}が自分の河にあってフリテン…ロンできないんです！`, `待ちの${list(x.furi)}、自分で捨てていませんか？ ${nm(t)}切りはフリテンになっちゃいます。`, `フリテン注意！ ${nm(t)}を切ると、${list(x.furi)}待ちでロンできません。`], 7);
    const hint = { w1: '両面待ちになる切り方がありますよ！', w2: '河に見えている牌も数えてみて！', w3: 'シャンポンと両面、残り枚数はどっちが多い？', w4: 'もっと待ちが増える切り方がありますよ！' }[th] || 'もっとアガりやすい待ちがありますよ！';
    return pk([`${nm(t)}を切ると${x.txt}（残り${x.rem}枚）。${hint}`, `惜しい！ ${nm(t)}切りだと${x.txt}。${hint}`, `${x.txt}もテンパイだけど、${hint}`], 7);
  }

  // ---------------------------------------------------------------- 役作り・点数（y1〜y7・s1・s2）
  function valued(X, d) {
    const W = waitOf(X, d); if (!W) return null;
    const g = X.g, s = X.s, p = X.p;
    let best = null;
    for (const w of W.W) {
      const closed = []; X.after(d).forEach((n, t) => { for (let k = 0; k < n; k++) closed.push(t); }); closed.push(w);
      const r = MJ.evaluate({ closed, melds: p.melds.map(m => ({ type: m.type, t: m.t, tiles: m.tiles })), win: w, tsumo: false, seatWind: g.seatWind(s), roundWind: g.roundWind(), dealer: g.dealer === s, doraInd: g.doraInds(), uraInd: [], aka: 0 });
      const pts = r ? MJ.roundUp100 ? MJ.roundUp100(r.base * (g.dealer === s ? 6 : 4)) : Math.ceil(r.base * (g.dealer === s ? 6 : 4) / 100) * 100 : 0;
      if (!best || pts > best.pts) best = { pts, yaku: r ? r.list.map(z => z[0]) : [], w };
    }
    return Object.assign({ d }, W, best);
  }
  const YJ = { riichi: '立直', pinfu: '平和', tanyao: 'タンヤオ', iipeikou: '一盃口', haku: '白', hatsu: '發', chun: '中', seat_wind: '自風', round_wind: '場風', chiitoi: '七対子', chanta: 'チャンタ', ittsu: '一気通貫', sanshoku: '三色同順', sanshoku_k: '三色同刻', toitoi: '対々和', sanankou: '三暗刻', shousangen: '小三元', honroutou: '混老頭', honitsu: '混一色', junchan: '純チャン', ryanpeikou: '二盃口', chinitsu: '清一色' };
  const yname = ys => ys.filter(k => k !== 'dora' && k !== 'aka').map(k => YJ[k] || k).join('・');
  const TGT = { y1: 'pinfu', y2: 'iipeikou', y3: 'sanshoku', y4: 'ittsu', y5: 'honitsu', y6: 'chiitoi', y7: 'toitoi', s1: 'tanyao', s2: 'dora' };
  // why the yaku is there, with this hand's tiles
  function flavor(X, v, k) {
    const cc = X.after(v.d); cc[v.w]++;
    const dc = MJ.decompose(cc)[0], runs = dc ? dc.groups.filter(gr => gr.k === 's').map(gr => gr.t) : [];
    if (k === 'pinfu') return pk(['面子が全部順子で、待ちは両面。平和の条件がぴったりそろいます', '順子だけの手に両面待ち、これが平和の形です', '刻子も役牌の雀頭もなく、両面で待てるから平和がつきます'], 8);
    if (k === 'iipeikou') { const dup = runs.find((r, i) => runs.indexOf(r) !== i); return dup != null ? pk([`${list([dup, dup + 1, dup + 2])}の順子が2つ並んで一盃口`, `同じ${list([dup, dup + 1, dup + 2])}が2組、これが一盃口`, `${nm(dup)}からの順子が2つそろう一盃口`], 8) : '同じ順子が2つそろって一盃口'; }
    if (k === 'sanshoku') { const n = [0, 1, 2, 3, 4, 5, 6].find(n => [0, 9, 18].every(b => runs.includes(b + n))); return n != null ? pk([`${n + 1}・${n + 2}・${n + 3}の順子が萬子・筒子・索子の3色にそろって三色同順`, `${n + 1}${n + 2}${n + 3}が3色そろう三色同順`, `萬子も筒子も索子も${n + 1}${n + 2}${n + 3}、きれいな三色です`], 8) : '同じ並びの順子が3色そろって三色同順'; }
    if (k === 'ittsu') { const b = [0, 9, 18].find(b => [0, 3, 6].every(o => runs.includes(b + o))); return b != null ? pk([`${SUIT[b / 9]}の123・456・789がつながって一気通貫`, `${SUIT[b / 9]}で1から9までひと続きの一気通貫`, `${SUIT[b / 9]}の123・456・789、一通の完成です`], 8) : '1から9までつながって一気通貫'; }
    if (k === 'honitsu') { const b = [0, 1, 2].find(i => cc.slice(i * 9, i * 9 + 9).some(x => x)); return pk([`${SUIT[b]}と字牌だけになって混一色`, `ほかの色を外して、${SUIT[b]}と字牌だけの混一色`, `${SUIT[b]}＋字牌で染まって混一色`], 8); }
    if (k === 'chiitoi') return v.yaku.includes('honitsu') ? pk([`対子が6つの七対子に、${SUIT[[0, 1, 2].find(i => cc.slice(i * 9, i * 9 + 9).some(x => x))]}と字牌だけの混一色まで重なります`, '七対子と混一色が両方つく、ぜいたくな形です'], 8) : pk(['対子が6つそろった七対子、待ちは単騎', '七対子の待ちは単騎。どの牌で待つかを選べます', '対子6つで七対子のテンパイ'], 8);
    if (k === 'toitoi') return pk(['面子が全部刻子の対々和', '刻子だけでそろえる対々和', 'ポンした2つと手の中の刻子で、全部刻子の対々和'], 8);
    if (k === 'tanyao') return pk(['1・9・字牌がひとつもなくてタンヤオ', '2〜8の牌だけでそろうタンヤオ', '端の牌と字牌を外して、タンヤオがつきます'], 8);
    if (k === 'dora') { const dr = X.g.doraInds().map(i => MJ.doraOf ? MJ.doraOf(i) : i); return pk([`ドラの${list(dr)}を使えるので、そのぶん点数アップ`, `ドラ（${list(dr)}）が手に残って点数が上がります`, `ドラ${list(dr)}を活かせる形です`], 8); }
    return '';
  }
  function yakuChoice(X, t, ok, th) {
    const opts = X.types.filter(d => X.sh(d) === 0).map(d => valued(X, d)).filter(Boolean).map(v => Object.assign(v, { V: v.pts * v.rem }));
    const me = opts.find(o => o.d === t), k = TGT[th];
    if (ok && me) {
      const fl = flavor(X, me, k);
      let txt = `${OPEN()} ` + pk([`${nm(t)}を切れば${me.txt}。${fl}。${yname(me.yaku)}${me.yaku.includes('dora') ? '＋ドラ' : ''}で${me.pts}点です！`, `${nm(t)}を外して${me.txt}に。${fl}。${yname(me.yaku)}でロンなら${me.pts}点♪`, `${nm(t)}を切ると、${fl}！ ${me.txt}で${me.pts}点のテンパイです。`], 3);
      const alt = opts.filter(o => o.d !== t && !X.right(o.d)).sort((a, b) => b.V - a.V)[0];
      if (alt && alt.pts === me.pts) txt += pk([` ${nm(alt.d)}を切っても${alt.pts}点だけど、待ちの${list(alt.W)}は${alt.W.reduce((a, w) => a + X.seen(w), 0)}枚見えていて残り${alt.rem}枚。${list(me.W)}なら残り${me.rem}枚です。`, ` 点数は${nm(alt.d)}切りでも同じ。でも${list(alt.W)}は残り${alt.rem}枚、${list(me.W)}は${me.rem}枚。アガりやすさで選びます♪`, ` ${nm(alt.d)}を切る待ち（${list(alt.W)}）は、場に出ていて残り${alt.rem}枚だけなんです。`], 5);
      else if (alt) txt += alt.pts === 0 ? pk([` ${nm(alt.d)}を切ると${alt.txt}${alt.rem > me.rem ? 'で待ちは広い' : 'だ'}けど、役がなくてロンできないんです。`, ` ${nm(alt.d)}切りの${alt.txt}は${alt.rem > me.rem ? '、枚数は多くても' : ''}役なし…ロンではアガれません。`, ` もし${nm(alt.d)}を切ったら${alt.txt}。でも役がないので、ロンできないんです。`], 5)
        : pk([` ${nm(alt.d)}を切ると${alt.txt}で、${yname(alt.yaku) || 'ドラだけ'}の${alt.pts}点。${alt.rem > me.rem ? '待ちは広いけど、点数で大きく負けちゃいます。' : ''}`, ` ${nm(alt.d)}切りだと${yname(alt.yaku) || '役が少なく'}${alt.pts}点どまり。`, ` ${nm(alt.d)}を切る形は${alt.pts}点。${k === 'chiitoi' ? `${list(alt.W)}は残り${alt.rem}枚しかないんです。` : `${me.pts - alt.pts}点も違います！`}`], 5);
      return txt;
    }
    if (!me) return pk([`${nm(t)}を切るとテンパイがくずれちゃいます…！ テンパイのまま、点数が高くなる1枚を！`, `${nm(t)}は手に必要な牌です。テンパイを保ったまま選んでみて！`, `あっ、テンパイが崩れちゃう…！ もう一回！`], 7);
    const tj = { pinfu: '平和', iipeikou: '一盃口', sanshoku: '三色', ittsu: '一気通貫', honitsu: '混一色', chiitoi: '七対子', toitoi: '対々和', tanyao: 'タンヤオ', dora: 'ドラ' }[k];
    return me.pts === 0 ? pk([`${nm(t)}を切ると${me.txt}だけど、役がなくてロンできないんです…。${tj}がつく形を探して！`, `${me.txt}…でも役なし！ ${tj}になる切り方がありますよ。`, `惜しい！ ${nm(t)}切りだと役がつきません。${tj}を意識してみて！`], 7)
      : pk([`${nm(t)}を切ると${me.txt}で${me.pts}点。${tj}がつく、もっと高い形がありますよ！`, `${me.pts}点もいいけど…${tj}をつけると、もっと上がります！`, `${nm(t)}切りは${yname(me.yaku) || 'ドラ'}の${me.pts}点。${tj}を狙える切り方を探して！`], 7);
  }

  // ---------------------------------------------------------------- 守備・押し引き（d1〜d5・p1・p2）：右の人（リーチ）の河から
  function riichiSeat(X) { for (let q = 1; q < 4; q++) if (X.g.P[q].riichi) return q; return 1; }
  function safety(X, t) {
    const q = riichiSeat(X), rr = new Set(X.g.P[q].river.map(r => T(r.id)));
    const out = x => 4 - X.unseen(x) - X.c[x] + X.c[x];   // copies visible anywhere (my hand included)
    if (rr.has(t)) return { k: 0, why: 'gen' };
    if (t >= 27) { const sn = 4 - X.unseen(t); return sn >= 3 ? { k: 1, why: 'hon3', n: sn } : sn === 2 ? { k: 3, why: 'hon2', n: sn } : { k: 4, why: 'hon', n: sn }; }
    const n = num(t), at = k => t - n + k;
    const shapes = []; if (n <= 7) shapes.push([at(n + 1), at(n + 2)]); if (n >= 3) shapes.push([at(n - 2), at(n - 1)]);
    const walls = shapes.map(sh => sh.filter(x => out(x) >= 4)).flat();
    if (shapes.every(sh => sh.some(x => out(x) >= 4))) return { k: 1, why: 'kabe', wall: [...new Set(walls)], shapes };
    const src = [n - 3, n + 3].filter(k => k >= 1 && k <= 9 && rr.has(at(k))).map(at);
    const suji = n <= 3 ? rr.has(at(n + 3)) : n >= 7 ? rr.has(at(n - 3)) : rr.has(at(n - 3)) && rr.has(at(n + 3));
    if (suji) return { k: n === 1 || n === 9 ? 2 : 3, why: 'suji', src, both: n >= 4 && n <= 6 };
    if (src.length) return { k: 4.5, why: 'half', src };
    return n === 1 || n === 9 ? { k: 4, why: 'term' } : { k: 5, why: 'mid' };
  }
  function whyTxt(X, t, z, good) {
    const T0 = nm(t);
    switch (z.why) {
      case 'gen': return pk([`${T0}はリーチした人が自分で捨てている「現物」。この牌でロンされることはありません`, `${T0}はリーチの人の河にあります。自分で捨てた牌ではロンできないので、100%安全`, `現物の${T0}なら、ぜったい当たりません`], 9);
      case 'hon3': return pk([`${T0}は場に${z.n}枚見えていて、残りは${4 - z.n}枚。単騎待ちでしか当たらないので、ほぼ安全`, `${T0}はもう${z.n}枚出ている字牌。当たるとしたら単騎だけです`, `${z.n}枚見えの${T0}は、シャンポンにもならない安全な字牌`], 9);
      case 'kabe': return pk([`${list(z.wall)}が4枚とも見えているので、${T0}を両面で待つ形が作れません。これが「壁」です`, `${list(z.wall)}が全部見えている＝${T0}の両面待ちはありえない「ノーチャンス」`, `壁の${list(z.wall)}のおかげで、${T0}は両面待ちに当たりません`], 9);
      case 'suji': return z.both ? pk([`リーチの人が${list(z.src)}を両方切っているので、${T0}の両面待ちはどちらもフリテン。両スジで安全度が高め`, `${list(z.src)}が両方通っているので、${T0}は「両スジ」。両面には当たりません`], 9)
        : pk([`リーチの人が${list(z.src)}を切っているので、${T0}を両面で待つとフリテン。スジの牌です`, `${list(z.src)}が通っているから、${T0}はスジ。両面待ちには当たりにくいんです`, `${T0}は${list(z.src)}のスジ。両面待ちならリーチの人はフリテンになります`], 9);
      case 'half': return pk([`${T0}は片側（${list(z.src)}）しか通っていない「片スジ」。反対側の両面には当たります`, `${list(z.src)}は切られているけど、${T0}の反対側の両面待ちはまだあり得るんです`], 9);
      case 'hon2': return pk([`${T0}は2枚見えている字牌。シャンポンにはならないけど、単騎ならあり得ます`, `${T0}は2枚出ていて、比較的安全な字牌`], 9);
      case 'hon': return pk([`${T0}はまだ見えていない字牌…単騎やシャンポンで当たるかも`, `${T0}は場に出ていない字牌。重なっていたら当たっちゃいます`], 9);
      case 'term': return pk([`${T0}はスジじゃない端の牌…ちょっと危ないです`, `${T0}は端の牌だけど、通っている牌がないので安全とは言えません`], 9);
      default: return [2, 3, 7, 8].includes(num(t)) ? pk([`${T0}はスジでも現物でもない無スジの牌。両面にも嵌張にも当たります`, `無スジの${T0}は、両面待ちに当たりやすい危ない牌`, `${T0}は通っている牌がない無スジ。リーチには危ないんです`], 9)
        : pk([`${T0}はスジでも現物でもない真ん中の牌、いちばん危ないんです`, `真ん中の${T0}は、両面待ちに一番当たりやすい牌`, `${T0}は無スジの真ん中。リーチに一番危ない牌です`], 9);
    }
  }
  function defend(X, t, ok, th) {
    const S = X.types.map(x => Object.assign({ t: x }, safety(X, x)));
    const z = S.find(x => x.t === t);
    if (ok) {
      let txt = `${OPEN()} ` + whyTxt(X, t, z, true) + '♪';
      const tempt = S.filter(x => x.t !== t && x.k > z.k && !X.right(x.t)).sort((a, b) => a.k - b.k)[0];
      if (th === 'p2') { const tb = LS.discardTable(X.g, X.s), sh = Math.min(...tb.map(r => r[1])), eff = tb.filter(r => r[1] === sh).sort((a, b) => b[2] - a[2])[0];
        if (!eff || eff[0] === t) txt += pk([' 降りるときは、まず現物から切っていきましょう。', ' 遠い手は無理せず、安全な牌を切っていくのが一番です。'], 5);
        else txt += pk([` 手を進めるなら${nm(eff[0])}だけど、手が遠いときは無理せず降りるのが一番です。`, ` ${nm(eff[0])}を切れば手は進むけど、テンパイまでまだ遠い…。ここは守りましょう。`, ` 遠い手で${nm(eff[0])}を押すのは危険。アガれそうにないときは降りが正解です。`], 5); }
      else if (tempt && tempt.why === 'suji' && z.why === 'suji') txt += pk([` ${nm(tempt.t)}もスジだけど、真ん中寄りの牌は嵌張やシャンポンにも当たります。端の${nm(t)}のほうが安全度は上です。`, ` 同じスジでも、${nm(tempt.t)}は嵌張待ちに当たることがあるんです。`], 5);
      else if (tempt) txt += ' ' + pk([`いっぽう、`, `それに比べて、`, `ちなみに、`], 5) + whyTxt(X, tempt.t, tempt, false) + '。';
      return txt;
    }
    if (z.k <= 3) return whyTxt(X, t, z, false) + '。' + pk(['悪くない選択だけど、もっと安全な牌がありますよ！', 'それもアリだけど、さらに安全な牌があるんです…！', '惜しい！ それより確実な牌を探して！'], 7);
    return whyTxt(X, t, z, false) + '…。' + pk(['もっと安全な牌がありますよ！', 'ほかに、もっと安心して切れる牌があるはず…！', 'うーん、それより安全な牌を探してみて！', 'リーチの人の河を、もう一度見てみて！'], 7);
  }
  function push(X, t, ok, act) {
    const opts = X.types.filter(d => X.sh(d) === 0).map(d => Object.assign({ d }, waitOf(X, d)));
    const me = opts.find(o => o.d === t);
    const gen = X.types.filter(x => safety(X, x).k === 0);
    if (ok && act !== 'riichi') return 'その牌で合ってます！ でも、ここは「リーチ」ボタンで宣言して勝負しましょう♪';
    if (ok && me) return `${pk(['勝負っ！', '押しましょう！', 'ここは攻めます！'], 1)} ` + pk([`${nm(t)}を切ってリーチ、${me.txt}。残りは${me.rem}枚。`, `${nm(t)}でリーチ！ ${me.txt}で残り${me.rem}枚あります。`, `${nm(t)}を切って${me.txt}のリーチです。`], 3)
      + (gen.length ? pk([` 現物の${list(gen)}を切って降りることもできるけど、せっかくの良い待ち。押す価値ありです♪`, ` ${list(gen)}を切ればオリられるけど、両面以上のテンパイなら勝負したほうが得なんです。`, ` 危ない牌でも、待ちが良ければアガりの見込みは十分。降りるのはもったいない！`], 5) : pk([' 良い待ちのテンパイは、リーチで押す価値ありです♪', ' アガれる見込みが高い手は、怖がらずに勝負！'], 5));
    if (me) return pk([`${nm(t)}でもテンパイだけど、${me.txt}（残り${me.rem}枚）…。もっと良い待ちで勝負しましょう！`, `${me.txt}だと押すには弱いかも。待ちの良いテンパイを探して！`], 7);
    return pk([`${nm(t)}${gen.includes(t) ? 'は現物で安全だけど、' : 'を切ると、'}せっかくのテンパイがくずれちゃいます。両面以上のテンパイなら、リーチで押すのがおすすめです！`, `テンパイを崩して降りるのは、もったいない手なんです。良い待ちならリーチ！`], 7);
  }

  // ---------------------------------------------------------------- dispatch
  LS.explain = function (beat, t, g, s, ja, act) {
    const th = beat.th;
    if (!ja || !th || !/^(e[56]|w[1-6]|y[1-7]|s[12]|d[1-5]|p[12])$/.test(th)) return base.apply(this, arguments);
    VS = g.P[s].hand.reduce((a, id) => (a * 31 + (id >> 2)) % 9973, 7) + th.charCodeAt(0);
    const X = ctx(g, s); X.right = d => LS.check(beat, { act: beat.ok && beat.ok.riichi ? 'riichi' : 'discard', id: d * 4 }, g, s);
    const right = LS.check(beat, { act: act || 'discard', id: t * 4 }, g, s) || (th === 'p1' && LS.check(beat, { act: 'riichi', id: t * 4 }, g, s));
    try {
      if (th === 'e5' || th === 'w6') return iishanten(X, t, right, th);
      if (th === 'e6') return takeTenpai(X, t, right);
      if (/^w[1-5]$/.test(th)) return waitChoice(X, t, right, th);
      if (/^[ys]/.test(th)) return yakuChoice(X, t, right, th);
      if (th === 'p1') return push(X, t, right, act);
      return defend(X, t, right, th);
    } catch (e) { console.warn('lesson talk', e); return base.apply(this, arguments); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
