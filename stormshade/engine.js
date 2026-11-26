/* 嵐影館 STORMSHADE — 事件の生成と推理の判定（DOMなし。node でも読める）
   毎回くじで決めるもの：犯人・動機・凶器・現場・時刻、謎（答えの人物）、展開、人物の秘密と夜の足取り、目撃、手がかりの置き場所。
   三つの約束（狼影灯と同じ）：
     一、痕跡は嘘をつかない（現場の足跡・匂い・手の跡は、犯人のもの）
     二、物は嘘をつくことがある（落ちていた持ち物は、罪をなすりつけるために置かれたものかもしれない）
     三、人は他人のことでは嘘をつかない（ただし自分の居場所は偽ることがある）。犯人だけは何でも偽る。
   生成のあとで「全部の手がかりを集めれば、答えがひとつに決まる」ことを確かめ、決まらなければ手がかりを足す。 */
(function (root) {
  'use strict';

  // むずかしさ：入門・標準・中級・上級・悪夢
  const DIFF = [
    { id: 0, pool: 1, name: '入門', ap: 5, talk: 4, traits: 3, see: .5, secretP: .35, plant: 0, cunning: 0, fakeWatch: 0, twists: 0, mysteries: 2, share: .55, misses: 99, assist: true, belongTrue: .5, hideFind: .15, fig: 0 },
    { id: 1, pool: 2, name: '標準', ap: 4, talk: 4, traits: 2, see: .45, secretP: .55, plant: .3, cunning: 0, fakeWatch: 0, twists: 1, mysteries: 2, share: .4, misses: 4, assist: false, belongTrue: .25, hideFind: .25, fig: .2 },
    { id: 2, pool: 3, name: '中級', ap: 4, talk: 3, traits: 2, see: .4, secretP: .65, plant: .5, cunning: .35, fakeWatch: .2, twists: 1, mysteries: 3, share: .3, misses: 3, assist: false, belongTrue: .15, hideFind: .3, fig: .35 },
    { id: 3, pool: 4, name: '上級', ap: 4, talk: 3, traits: 2, see: .35, secretP: .8, plant: .7, cunning: .7, fakeWatch: .35, twists: 2, mysteries: 3, share: .22, misses: 3, assist: false, belongTrue: .1, hideFind: .35, fig: .5, neg: .4 },
    { id: 4, pool: 4, name: '悪夢', ap: 3, talk: 3, traits: 1, see: .3, secretP: .95, plant: .9, cunning: 1, fakeWatch: .5, twists: 2, mysteries: 3, share: .15, misses: 2, assist: false, belongTrue: 0, hideFind: .45, fig: .65, neg: .6 },
  ];
  const CATS = ['height', 'hand', 'foot', 'mark'];

  /* ---------- 乱数 ---------- */
  function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function shuffle(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const fill = (t, o) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m);

  /* ---------- 地図 ---------- */
  const near = (K, a, b) => a === b || K.adj.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const locName = (K, id) => (K.locs.find(l => l.id === id) || {}).name || id;
  const ch = (K, id) => K.chars.find(c => c.id === id);
  const HOME = 'rooms';

  /* ---------- 事件をつくる ---------- */
  // opts: { pc: 役の人物id, diff, seed }
  function newCase(K, opts) {
    for (let tries = 0; tries < 60; tries++) {
      const seed = ((opts.seed >>> 0) || ((Math.random() * 2 ** 31) | 0)) + tries * 977;
      const W = build(K, opts, seed);
      if (W && solvable(K, W)) return W;
    }
    throw new Error('case generation failed');
  }

  function build(K, opts, seed) {
    const r = rng(seed), D = DIFF[opts.diff];
    const pc = opts.pc;
    const npcs = K.chars.map(c => c.id).filter(id => id !== pc);
    const W = { v: 1, case: K.id, diff: D.id, pc, seed, day: 1, phase: 'prologue', clues: [], pl: { found: [], items: [], talked: {}, notes: {}, log: [], misses: 0, exposed: [], ap: 0, talk: 0, shown: {} }, said: {}, people: {} };
    for (const id of K.chars.map(c => c.id)) W.people[id] = { alive: true };

    // 犯人・動機・凶器・現場・時刻
    const c = pick(r, npcs);
    const weapon = pick(r, K.weapons);
    const L = pick(r, weapon.scenes);
    const T = Math.floor(r() * K.slots.length);
    W.truth = { c, motive: pick(r, ch(K, c).motives).id, weapon: weapon.id, L, F: L, T };

    // 展開
    const tw = shuffle(r, ['moved', 'second', 'poison', 'accomplice']).filter(t => !(t === 'poison' && weapon.id === 'poison') && !(t === 'moved' && weapon.id === 'push'));
    W.twists = tw.slice(0, D.twists);
    if (W.twists.includes('moved')) { const opt = K.locs.map(l => l.id).filter(l => l !== L && l !== HOME && near(K, l, L)); W.truth.F = opt.length ? pick(r, opt) : L; if (W.truth.F === L) W.twists = W.twists.filter(t => t !== 'moved'); }

    // 夜の足取り：まず全員を客室にいるとし、ときどき出歩かせる
    const pos = {}; for (const id of npcs) pos[id] = K.slots.map(() => HOME);
    W.lie = {}; for (const id of npcs) W.lie[id] = {};   // lie[id][slot] = 本当の居場所（自分は客室にいたと言う）
    const busy = {}; for (const id of npcs) busy[id] = {};
    const place = (id, s, loc, why) => { pos[id][s] = loc; busy[id][s] = why || 'walk'; };
    const free = (id, s) => !busy[id][s];
    const walk = shuffle(r, K.locs.map(l => l.id).filter(l => l !== HOME));
    // 犯人は現場に
    place(c, T, L, 'crime');
    // 謎：答えの人物と、その出来事の時刻
    const mpool = shuffle(r, K.mysteries.map(m => m.id));
    W.mysteries = [];
    for (const mid of mpool) {
      if (W.mysteries.length >= D.mysteries) break;
      const M = K.mysteries.find(m => m.id === mid);
      const cand = (M.who || npcs).filter(id => id !== pc && npcs.includes(id));
      if (!cand.length) continue;
      const x = pick(r, cand);
      const slots = shuffle(r, K.slots.map((_, i) => i)).filter(s => free(x, s));
      if (!slots.length) continue;
      const s = slots[0];
      const loc = M.id === 'child' ? null : M.loc;
      if (loc) { place(x, s, loc, 'm:' + M.id); W.lie[x][s] = loc; }
      W.mysteries.push({ id: M.id, x, s, loc });
    }
    // もうひとつの殺意：別の誰かが、配膳室で寝酒に毒を入れた
    if (W.twists.includes('poison')) {
      const cand = shuffle(r, npcs.filter(id => id !== c)).filter(id => K.slots.some((_, s) => s < Math.max(1, T) && free(id, s)));
      if (cand.length) { const p2 = cand[0]; const s2 = K.slots.map((_, s) => s).filter(s => s < Math.max(1, T) && free(p2, s))[0]; place(p2, s2, 'dining', 'poison'); W.lie[p2][s2] = 'dining'; W.truth.p2 = { who: p2, s: s2 }; }
      else W.twists = W.twists.filter(t => t !== 'poison');
    }
    // 秘密：夜に出歩いた理由。その時刻の居場所を偽る
    for (const id of npcs) {
      if (id === c || r() > D.secretP) continue;
      const sc = pick(r, ch(K, id).secrets);
      const slots = shuffle(r, K.slots.map((_, i) => i)).filter(s => free(id, s));
      if (!slots.length) continue;
      const s = slots[0]; place(id, s, sc.loc, 'secret'); W.lie[id][s] = sc.loc; W.people[id].secret = { id: sc.id, s, loc: sc.loc, open: false };
    }
    // ほかの者も、ときどき出歩く（嘘はつかない。見張りや、眠れない夜の散歩）
    for (const id of npcs) for (let s = 0; s < K.slots.length; s++) if (free(id, s) && r() < .28) place(id, s, pick(r, walk), 'walk');
    // 犯人は、犯行の前後に現場のとなりを通っている
    for (const s of [T - 1, T + 1]) if (s >= 0 && s < K.slots.length && free(c, s) && r() < .5) { const nb = K.locs.map(l => l.id).filter(l => l !== HOME && l !== L && near(K, l, L)); if (nb.length) place(c, s, pick(r, nb), 'walk'); }
    W.pos = pos;

    // 偽りのアリバイ：犯人は「Aといっしょに Y にいた」と言い、A はその時刻の居場所を Y と偽る（Aは犯人のことでは嘘をつかない。聞かれると口ごもる）
    if (W.twists.includes('accomplice')) {
      const cand = shuffle(r, npcs.filter(id => id !== c && free(id, T)));
      if (cand.length) { const a = cand[0]; const Y = pick(r, walk.filter(l => l !== L && l !== pos[a][T])); W.truth.acc = { a, Y }; W.lie[a][T] = pos[a][T] === HOME ? HOME : pos[a][T]; busy[a][T] = 'acc'; }
      else W.twists = W.twists.filter(t => t !== 'accomplice');
    }

    // 言い分（自分の居場所）。嘘をつく時刻は「客室で寝ていた」（偽りのアリバイは Y）
    W.claims = {};
    for (const id of npcs) {
      W.claims[id] = pos[id].map((loc, s) => {
        if (id === c && s === T) return W.truth.acc ? W.truth.acc.Y : HOME;
        if (W.truth.acc && id === W.truth.acc.a && s === T) return W.truth.acc.Y;
        if (W.lie[id][s] != null) return HOME;
        return loc;
      });
      // 犯人は、前後の時刻も念のため客室にいたと言う（手ごわい犯人は本当のことを言う）
      if (id === c) for (const s of [T - 1, T + 1]) if (s >= 0 && s < K.slots.length && pos[c][s] !== HOME && r() > D.cunning) W.claims[c][s] = HOME;
    }

    // 物音を聞いた者：犯行の時刻に現場のとなりにいた誰か（いなければ、誰かを通りかからせる）
    { const nearT = npcs.filter(id => id !== c && near(K, pos[id][T], L) && pos[id][T] !== HOME && W.lie[id][T] == null && id !== (W.truth.acc || {}).a);
      let heard = nearT.length ? pick(r, nearT) : null;
      if (!heard) { const cand = npcs.filter(id => id !== c && free(id, T)); if (cand.length) { heard = pick(r, cand); const nb = K.locs.map(l => l.id).filter(l => l !== HOME && l !== L && near(K, l, L)); const where = pick(r, nb); pos[heard][T] = where; busy[heard][T] = 'walk'; W.claims[heard][T] = where; } }
      W.heard = heard; }
    // 目撃：同じ場所か、となりにいた者を見る（客室棟の廊下でも見る）
    W.sights = {}; for (const id of npcs) W.sights[id] = [];
    for (let s = 0; s < K.slots.length; s++) for (const a of npcs) for (const b of npcs) {
      if (a === b) continue;
      const la = pos[a][s], lb = pos[b][s];
      if (!near(K, la, lb)) continue;
      if (la === HOME && lb === HOME) { if (r() < .06) W.sights[a].push({ s, who: b, loc: HOME }); continue; }   // 寝静まった廊下：たまに見かける程度
      if (r() < D.see) W.sights[a].push({ s, who: b, loc: lb, fig: b === c && s === T && r() < D.fig });
    }
    // 宗一郎が最後に見られた時刻
    W.vpos = K.slots.map((_, s) => s < T ? pick(r, ['study', 'library', 'hall']) : s === T ? L : null);

    // 手がかり
    const clues = W.clues; let n = 0;
    const add = (o) => { o.id = 'k' + (n++); clues.push(o); return o; };
    const belong = id => ch(K, id).belong;
    const placeLoc = (avoid) => pick(r, K.locs.map(l => l.id).filter(l => !(avoid || []).includes(l)));
    // 現場の痕跡（犯人の特徴）
    // 痕跡の組み合わせは、合う者がちょうど D.pool 人になるものを選ぶ（残りは足取りで絞る）
    const cats0 = shuffle(r, CATS), sus = K.chars.map(x => x.id).filter(id => id !== W.pc);
    const fit = cs => sus.filter(id => cs.every(cat => ch(K, id).traits[cat] === ch(K, c).traits[cat])).length;
    const subsets = [];
    for (let m = 1; m < 16; m++) { const cs = cats0.filter((_, i) => m >> i & 1); if (cs.length <= 3) subsets.push(cs); }
    const score = cs => Math.abs(fit(cs) - D.pool) * 10 + (fit(cs) < D.pool ? 5 : 0) + cs.length * .1 + r() * .05;
    const best = subsets.sort((a, b) => score(a) - score(b))[0];
    const cats = best.concat(cats0.filter(x => !best.includes(x)));
    const k = best.length;
    W.truth.traceCats = cats.slice(0, k);
    for (const cat of W.truth.traceCats) add({ kind: 'trace', at: L, cat, val: ch(K, c).traits[cat], for: 'murder', imp: 3 });
    if (D.neg && r() < D.neg) {   // 「…ではない」の痕跡
      const cat = cats[k] || cats[0]; const pool = sus.filter(id => W.truth.traceCats.every(ct => ch(K, id).traits[ct] === ch(K, c).traits[ct]));
      let vals = Object.keys(K.traits[cat].v).filter(v => v !== ch(K, c).traits[cat] && !pool.some(id => ch(K, id).traits[cat] === v));
      if (vals.length) add({ kind: 'trace', at: L, cat, val: pick(r, vals), neg: true, for: 'murder', imp: 2 });
    }
    // 凶器：遺体の検分（朝にわかる）・凶器そのもの（犯人が隠した）・もとの場所の欠け
    W.truth.WH = weapon.id === 'push' ? L : pick(r, K.locs.map(l => l.id).filter(l => l !== HOME));
    add({ kind: 'weapon', at: W.truth.WH, imp: 2 });
    if (weapon.origin) add({ kind: 'missing', at: weapon.origin, imp: 1 });
    // 時刻：懐中時計（偽装のことがある）・医師の見立て（朝）・物音・最後に見た姿
    const fake = r() < D.fakeWatch;
    W.truth.watch = fake ? Math.max(0, Math.min(K.slots.length - 1, T + (T === K.slots.length - 1 ? -1 : 1))) : T;
    if (weapon.id !== 'poison') add({ kind: 'watch', at: W.truth.F, slot: W.truth.watch, fake, imp: 1 });
    W.truth.range = T === 0 ? [0, 1] : T === K.slots.length - 1 ? [T - 1, T] : (r() < .5 ? [T - 1, T] : [T, T + 1]);
    const heard = W.heard;
    if (heard) add({ kind: 'sound', by: heard, slot: T, loc: L, imp: 2 });
    if (T > 0) { const cand = npcs.filter(id => id !== c); const by = pick(r, cand); add({ kind: 'lastSeen', by, slot: T - 1, loc: W.vpos[T - 1], imp: 1 }); }
    // 持ち物：犯人のものが本当に落ちていることも、無実の者のものが置かれていることも
    if (r() < D.belongTrue) add({ kind: 'belong', at: L, who: c, planted: false, for: 'murder', imp: 1 });
    if (r() < D.plant) { const inn = npcs.filter(id => id !== c); const f = pick(r, inn); add({ kind: 'belong', at: r() < .6 ? L : W.truth.F, who: f, planted: true, for: 'murder', imp: 1 }); W.truth.framed = f; }
    // 遺体が動かされた
    if (W.truth.F !== L) { add({ kind: 'moved', at: W.truth.F, part: 'hint', imp: 2 }); add({ kind: 'moved', at: L, part: 'true', imp: 3 }); }
    // 動機の書きつけ：ひとりにひとつ（犯人のものが本物の動機）
    for (const id of npcs) { const mo = id === c ? W.truth.motive : pick(r, ch(K, id).motives).id; add({ kind: 'motive', at: placeLoc([L]), who: id, motive: mo, imp: id === c ? 2 : 0 }); }
    // 謎の手がかり
    for (const m of W.mysteries) {
      const M = K.mysteries.find(x => x.id === m.id);
      if (m.id === 'child') {
        const others = (M.who || []).filter(id => id !== m.x);
        const cat = CATS.find(ct => others.every(o => ch(K, o).traits[ct] !== ch(K, m.x).traits[ct])) || 'hand';
        m.cat = cat;
        add({ kind: 'm', m: m.id, part: 'diary', at: placeLoc([HOME]), cat, val: ch(K, m.x).traits[cat], imp: 2 });
        add({ kind: 'm', m: m.id, part: 'receipt', at: placeLoc(), from: ch(K, m.x).from, imp: 2 });
        continue;
      }
      const cat = pick(r, CATS); m.cat = cat;
      add({ kind: 'm', m: m.id, part: 'trace', at: m.loc, cat, val: ch(K, m.x).traits[cat], imp: 2 });
      add({ kind: 'm', m: m.id, part: 'item', at: placeLoc([m.loc]), who: m.x, imp: 2 });
      if (m.id === 'bell') add({ kind: 'm', m: m.id, part: 'glove', at: 'tower', val: ch(K, m.x).traits.hand, imp: 1 });
    }
    if (W.truth.p2) { const p2 = W.truth.p2.who; add({ kind: 'poison', part: 'item', at: placeLoc([HOME]), who: p2, imp: 2 }); }
    // 役の物（探す・先に回収する）
    W.goals = pickGoals(K, W, r, pc);
    for (const g of W.goals) if (g.t === 'find' || g.t === 'hide') {
      if (g.item === 'will') continue;   // 遺言状そのもの（謎の物）
      add({ kind: 'role', item: g.item, at: g.t === 'hide' && pc === 'ayano' ? 'study' : placeLoc([HOME]), imp: 0 });
    }
    W.truth.c = c;

    // 目撃を足して、答えがひとつに決まるようにする（無実で痕跡に合う者には、現場の外にいた証人を）
    ensureAlibis(K, W, r, npcs, busy);
    // 犯人の作り話：無実の誰かを、犯行の時刻に現場のそばで見たと言う（手ごわい犯人ほど、ほかに見た者のいない相手を選ぶ）
    if (r() < D.cunning || D.id >= 1 && r() < .35) {
      const inn = npcs.filter(id => id !== c);
      const lonely = inn.filter(id => !npcs.some(o => o !== id && o !== c && W.sights[o].some(x => x.s === T && x.who === id)));
      const pool = r() < D.cunning && lonely.length ? lonely : inn;
      const f = pick(r, pool); W.sights[c].push({ s: T, who: f, loc: L, lie: true }); W.truth.cframe = f;
    }
    // 犯人以外の目撃は、犯人を見たとき「人影」になることがある（顔は見えなかった）
    return W;
  }

  // 役の目的：役ごとの候補から、この事件で成り立つものを2つ
  function pickGoals(K, W, r, pc) {
    const R = K.roles[pc]; if (!R) return [];
    const has = m => W.mysteries.some(x => x.id === m) || (m === 'poison' && W.truth.p2);
    const ok = R.goals.filter(g => g.t !== 'solve' || has(g.m)).filter(g => !(g.t === 'spare' && g.who === pc));
    return shuffle(r, ok).slice(0, 2).map(g => Object.assign({}, g));
  }

  // 痕跡と時刻だけでは決まらないとき、無実の者に現場の外のアリバイ（誰かの目撃）を足す
  function ensureAlibis(K, W, r, npcs, busy) {
    const T = W.truth.T, L = W.truth.L, c = W.truth.c;
    for (const id of npcs) {
      if (id === c) continue;
      if (!fitsTraces(K, W, id)) continue;
      const seen = npcs.some(o => o !== id && W.sights[o].some(x => x.s === T && x.who === id && x.loc !== L));
      if (seen) continue;
      // 誰かを、その人のいた場所（かとなり）に置く
      const where = W.pos[id][T];
      const cand = shuffle(r, npcs.filter(o => o !== id && o !== c && (!busy[o][T] || near(K, W.pos[o][T], where))));
      const w = cand[0]; if (!w) continue;
      if (!near(K, W.pos[w][T], where)) {
        if (busy[w][T]) continue;
        W.pos[w][T] = where; busy[w][T] = 'witness'; W.claims[w][T] = where;
        for (const o of npcs) W.sights[o] = W.sights[o].filter(x => !(x.s === T && (x.who === w || o === w)));   // where they were before is no longer true
      }
      W.sights[w].push({ s: T, who: id, loc: where, forced: true });
    }
  }

  /* ---------- 推理 ---------- */
  function traceList(W, filter) { return W.clues.filter(k => k.kind === 'trace' && k.for === 'murder' && (!filter || filter(k))); }
  function fitsTraces(K, W, id, known) {
    const tr = traceList(W, known ? k => known.includes(k.id) : null);
    return tr.every(t => t.neg ? ch(K, id).traits[t.cat] !== t.val : ch(K, id).traits[t.cat] === t.val);
  }
  // 犯人の候補：痕跡に合い、犯行の時刻に「ほかの誰かに」現場の外で見られていない者（その人自身を犯人と仮定すれば、ほかの者の目撃は本当）
  function candidates(K, W, know) {
    const T = W.truth.T, L = W.truth.L;
    const ids = K.chars.map(c => c.id).filter(id => id !== W.pc);
    return ids.filter(id => {
      if (!fitsTraces(K, W, id, know && know.clues)) return false;
      for (const o of ids) {
        if (o === id) continue;
        const ss = know ? (know.sights[o] || []) : W.sights[o];
        if (ss.some(x => x.s === T && x.who === id && x.loc !== L && !x.loc2)) return false;
      }
      return true;
    });
  }
  function solvable(K, W) {
    const cs = candidates(K, W);
    return cs.length === 1 && cs[0] === W.truth.c;
  }

  /* ---------- 遊びの操作 ---------- */
  const D_ = W => DIFF[W.diff];
  // 場所を調べる：まだ見つけていない手がかりを、大事なものから2つまで
  function search(K, W, loc) {
    if (W.pl.ap <= 0) return { k: 'noap' };
    W.pl.ap--;
    const got = W.clues.filter(k => k.at === loc && !W.pl.found.includes(k.id) && avail(W, k)).sort((a, b) => b.imp - a.imp).slice(0, 2);
    for (const k of got) { W.pl.found.push(k.id); if (k.kind === 'role' || k.kind === 'weapon' || k.kind === 'belong' || k.kind === 'motive' || (k.kind === 'm' && (k.part === 'item' || k.part === 'diary' || k.part === 'receipt' || k.part === 'glove')) || k.kind === 'poison') W.pl.items.push(k.id); }
    return { k: got.length ? 'found' : 'none', got };
  }
  function avail(W, k) { return !k.day || k.day <= W.day; }
  // 話を聞く：その人の夜の足取り（言い分）と、見たもの
  function talk(K, W, id) {
    if (W.pl.talk <= 0) return { k: 'notalk' };
    W.pl.talk--;
    W.pl.talked[id] = W.day;
    learn(W, id);
    return { k: 'ok' };
  }
  function learn(W, id) {
    if (!W.said[id]) W.said[id] = { claims: true, sights: [] };
    for (const x of W.sights[id] || []) if (!W.said[id].sights.some(y => y.s === x.s && y.who === x.who)) W.said[id].sights.push(x);
  }
  // 聞いた目撃と言い分の食い違い（矛盾）。liar：嘘をついている側
  function contradictions(K, W) {
    const out = [];
    for (const q in W.said) for (const x of W.said[q].sights) {
      if (x.fig) continue;   // a figure in the dark: nobody can say who it was
      if (!W.said[x.who] && !W.pl.heardClaims) continue;
      const claim = (W.claims[x.who] || [])[x.s];
      if (claim == null || claim === x.loc) continue;
      if (W.pl.exposed.includes(x.who + '@' + x.s) || W.pl.exposed.includes('lie:' + q + '@' + x.s + x.who)) continue;
      out.push({ id: x.who + '@' + x.s + '<' + q, who: x.who, s: x.s, claim, seen: x.loc, by: q, fig: x.fig });
    }
    return out;
  }
  // 矛盾を突く：どちらが嘘をついていたかが明らかになる
  function confront(K, W, cid, pub) {
    const c = contradictions(K, W).find(o => o.id === cid);
    if (!c) { W.pl.misses++; return { k: 'miss' }; }
    const T = W.truth, x = W.said[c.by].sights.find(y => y.s === c.s && y.who === c.who);
    if (x && x.lie) {   // 目撃のほうが作り話（話した者は犯人）：問いつめられた者は、きっぱり否む
      W.pl.denied = (W.pl.denied || []).concat(cid);
      return { k: 'deny', who: c.who, s: c.s, by: c.by, pub };
    }
    // 中級から：嘘をついていた者も、一度は言い張ることがある（否むことは、無実の証にならない）
    const D = D_(W);
    if (D.id >= 2 && !(W.pl.denied || []).includes(cid) && rnd01(W, cid) < (D.id >= 4 ? .45 : D.id >= 3 ? .35 : .25)) { W.pl.denied = (W.pl.denied || []).concat(cid); return { k: 'deny', who: c.who, s: c.s, by: c.by, pub, again: true }; }
    W.pl.exposed.push(c.who + '@' + c.s);
    W.claims[c.who][c.s] = W.pos[c.who][c.s];   // 本当の居場所を認める
    const why = whyHidden(W, c.who, c.s);
    if (why === 'secret') W.people[c.who].secret.open = true;
    if (why.startsWith('m:')) { const m = W.mysteries.find(mm => 'm:' + mm.id === why); if (m) m.confessed = true; }
    if (pub) W.pl.public = (W.pl.public || []).concat(c.who);
    return { k: 'crack', who: c.who, s: c.s, why, loc: W.pos[c.who][c.s], pub };
  }
  function rnd01(W, key) { let h = W.seed | 0; for (const ch0 of key) h = Math.imul(h ^ ch0.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; }
  function whyHidden(W, id, s) {
    const T = W.truth;
    if (id === T.c && s === T.T) return 'crime';
    if (T.acc && id === T.acc.a && s === T.T) return 'acc';
    if (T.p2 && id === T.p2.who && s === T.p2.s) return 'poison';
    const m = W.mysteries.find(mm => mm.x === id && mm.s === s && mm.loc);
    if (m) return 'm:' + m.id;
    const sc = W.people[id].secret; if (sc && sc.s === s) return 'secret';
    if (id === T.c) return 'crime';
    return 'walk';
  }
  // 会議：皆が言い分を述べる。ほかの者が見つけた手がかりを、いくつか話す
  function meeting(K, W, r) {
    W.pl.heardClaims = true;
    for (const id in W.claims) if (W.people[id].alive) { if (!W.said[id]) W.said[id] = { claims: true, sights: [] }; }
    const D = D_(W), out = [];
    const rand = r || Math.random;
    // 目撃もひとりひとつずつ
    for (const id in W.claims) {
      if (!W.people[id].alive) continue;
      const left = (W.sights[id] || []).filter(x => !W.said[id].sights.some(y => y.s === x.s && y.who === x.who) && x.loc !== HOME);
      if (left.length && rand() < .7) { const x = left[Math.floor(rand() * left.length)]; W.said[id].sights.push(x); out.push({ t: 'sight', by: id, x }); }
    }
    // ほかの者が見つけた手がかり
    const pool = W.clues.filter(k => !W.pl.found.includes(k.id) && avail(W, k) && k.kind !== 'role' && k.kind !== 'motive');
    for (const k of pool) if (rand() < D.share * (k.imp >= 2 ? 1 : .6)) { W.pl.found.push(k.id); out.push({ t: 'share', k, by: pickAlive(W, rand, k) }); }
    // あなたの隠したい物を、誰かが見つけてしまう
    for (const g of W.goals || []) if (g.t === 'hide' && !g.lost) {
      const k = W.clues.find(x => x.kind === 'role' && x.item === g.item);
      if (k && !W.pl.found.includes(k.id) && rand() < D.hideFind) { g.lost = true; W.pl.found.push(k.id); out.push({ t: 'exposed', k, by: pickAlive(W, rand, k) }); }
    }
    return out;
  }
  function pickAlive(W, rand, k) { const ids = Object.keys(W.claims).filter(id => W.people[id].alive && id !== (k && k.who)); return ids[Math.floor(rand() * ids.length)]; }

  // 第二の事件：二日目の夜、犯人は自分を見たかもしれない者を襲う
  function secondNight(K, W, r) {
    if (!W.twists.includes('second')) return null;
    const c = W.truth.c, T = W.truth.T, L = W.truth.L;
    const ids = Object.keys(W.claims).filter(id => id !== c && W.people[id].alive);
    const saw = ids.filter(id => (W.sights[id] || []).some(x => x.who === c && x.s === T) || near(K, W.pos[id][T], L));
    let wp = saw.length ? saw : ids;
    if (W.diff >= 3) { const off = wp.filter(id => !fitsTraces(K, W, id)); if (off.length) wp = off; }
    const w = wp[Math.floor(r() * wp.length)];
    const loc = pick(r, K.locs.map(l => l.id).filter(l => l !== HOME && l !== L));
    const dead = W.diff >= 3;
    W.truth.second = { w, loc, dead };
    if (dead) W.people[w].alive = false;
    // 新しい痕跡：まだ使っていない特徴
    const used = W.clues.filter(k => k.kind === 'trace' && k.for === 'murder').map(k => k.cat);
    // 上級から：第二の痕跡で候補が一人に決まってしまわないようにする（足取りで詰める余地を残す）
    const pool = Object.keys(W.claims).filter(id => W.people[id].alive && fitsTraces(K, W, id));
    const left = ct => pool.filter(id => ch(K, id).traits[ct] === ch(K, c).traits[ct]).length;
    const unused = CATS.filter(ct => !used.includes(ct));
    let cat = unused[0] || pick(r, CATS);
    if (W.diff >= 2 && unused.length) cat = unused.slice().sort((a, b) => (left(b) >= 2 ? 1 : 0) - (left(a) >= 2 ? 1 : 0) || left(b) - left(a))[0];
    W.clues.push({ id: 'k' + W.clues.length + 's', kind: 'trace', at: loc, cat, val: ch(K, c).traits[cat], for: 'murder', imp: 3, day: 2, second: true });
    if (!dead) W.clues.push({ id: 'k' + W.clues.length + 'w', kind: 'figWit', by: w, cat: pick(r, used.length ? used : CATS), day: 2, imp: 2 });
    return W.truth.second;
  }

  /* ---------- 解答と採点 ---------- */
  // ans: { c, motive, weapon, T, L, m: {id: who}, poison, acc }
  function score(K, W, ans) {
    const T = W.truth, rows = [];
    const row = (name, ok, pts) => rows.push({ name, ok: !!ok, pts: ok ? pts : 0, max: pts });
    row('犯人', ans.c === T.c, 30);
    row('動機', ans.c === T.c && ans.motive === T.motive, 10);
    row('凶器', ans.weapon === T.weapon, 10);
    row('時刻', ans.T === T.T, 10);
    if (W.twists.includes('moved')) row('本当の現場', ans.L === T.L, 10);
    for (const m of W.mysteries) row(K.mysteries.find(x => x.id === m.id).q, (ans.m || {})[m.id] === m.x, 10);
    if (T.p2) row(K.twists.poison.q, ans.poison === T.p2.who, 10);
    if (T.acc) row(K.twists.accomplice.q, ans.acc === T.acc.a, 10);
    for (const g of W.goals || []) row(g.name, goalDone(K, W, g, ans), 15);
    const pts = rows.reduce((a, b) => a + b.pts, 0), max = rows.reduce((a, b) => a + b.max, 0);
    const pct = pts / max;
    const rank = pct >= .92 ? 'S' : pct >= .78 ? 'A' : pct >= .6 ? 'B' : pct >= .4 ? 'C' : 'D';
    return { rows, pts, max, rank };
  }
  function goalDone(K, W, g, ans) {
    if (g.t === 'solve') { if (g.m === 'poison') return W.truth.p2 && ans.poison === W.truth.p2.who; const m = W.mysteries.find(x => x.id === g.m); return m && (ans.m || {})[m.id] === m.x; }
    if (g.t === 'find') { if (g.item === 'will') { const k = W.clues.find(x => x.kind === 'm' && x.m === 'will' && x.part === 'item'); return k && W.pl.items.includes(k.id); } const k = W.clues.find(x => x.kind === 'role' && x.item === g.item); return k && W.pl.items.includes(k.id); }
    if (g.t === 'hide') { const k = W.clues.find(x => x.kind === 'role' && x.item === g.item); return !g.lost && k && W.pl.items.includes(k.id); }
    if (g.t === 'spare') return !(W.pl.public || []).includes(g.who);
    return false;
  }

  root.SSEngine = { DIFF, CATS, newCase, search, talk, learn, contradictions, confront, meeting, secondNight, score, goalDone, candidates, fitsTraces, near, locName, fill, rng, ch, HOME, whyHidden };
})(typeof window !== 'undefined' ? window : globalThis);
