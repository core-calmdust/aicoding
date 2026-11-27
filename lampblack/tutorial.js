/* 狼影灯 — 稽古の幕「はじめての夜」：人狼がはじめての人のためのチュートリアル
   決まった筋書きの短い物語（あなたは村人）。案内役「すすけ」が場面ごとに解説し、本番と同じ画面（名札・場所の札・推理手帳）を
   実際に操作させながら、手帳を見比べて判断させる。最後の投票は二者択一（マルコ／ルーカス）。外したら巻きもどして選び直せる。
   解説の決まり（2026-11-26 ユーザー：唐突な話でフローがつかみにくい、手帳を見比べて状況判断させるべき）：
   一つの解説は「いま起きたこと → それが何を意味するか → 次に何をするか」でつなぐ。場面と関係のない冗談は入れない。 */
(function () {
  const STORY = {
    id: 'tutorial', no: '稽古の幕', title: '樅ノ木村', kana: 'もみのきむら',
    pal: { paper: '#efe3c8', lamp: '#ffcf86', ink: '#1b120c', night: '#16233a', moon: '#b9c8e6', acc: '#c2412d' },
    scene: 'alps',
    hero: { name: 'あなた', title: '行商人' },
    lex: { village: '村', jail: '穀物蔵' },
    locs: [
      { id: 'tower', name: '礼拝堂' }, { id: 'inn', name: '樅亭' }, { id: 'forge', name: '鍛冶場' }, { id: 'mill', name: '水車小屋' }, { id: 'grave', name: '墓地' },
    ],
    traits: {
      height: { name: '背丈', v: { tall: '背が高い', mid: '中背', short: '小柄' }, tr: { tall: '雪に残る足跡は歩幅が広い。背の高い者の足だ。' }, ntr: {}, fig: { tall: '背の高い人影' } },
      hand: { name: '利き手', v: { L: '左利き', R: '右利き' }, tr: {}, ntr: {}, fig: {} },
      foot: { name: '足もと', v: { hob: '鋲打ちの長靴', shoe: '革の短靴', clog: '木靴' }, tr: { hob: '足跡の底に、鋲が並んだ跡がある。鋲打ちの長靴だ。' }, ntr: {}, fig: { hob: '鋲の音を立てて歩く大きな影' } },
      mark: { name: '匂い', v: { soot: '煤の匂い', herb: '薬草の匂い', wax: '封蝋の匂い', pine: '松脂の匂い' }, tr: { soot: '閂に、黒い煤がべったりついている。炭と焼けた鉄の匂いがする。' }, ntr: {}, fig: {} },
    },
    items: [],
    roles: { villager: { name: '村人' }, seer: { name: '占い師' }, medium: { name: '霊媒師' }, guard: { name: '狩人' }, madman: { name: '狂人' } },
    chars: [
      { id: 'berta', name: 'ベルタ', job: '宿の女将', voice: 'polite', color: '#b0607e', look: { body: 'dress', h: .9, hair: 'bun', hat: 'bonnet', nose: 'straight', prop: 'lantern', cut: 'flower' }, traits: { height: 'mid', hand: 'R', foot: 'shoe', mark: 'herb' } },
      { id: 'marco', name: 'マルコ', job: '鍛冶屋', voice: 'rough', color: '#8a5a3a', look: { body: 'stout', h: 1.08, hat: 'cap', beard: 'full', nose: 'hook', prop: 'hammer', cut: 'stripe' }, traits: { height: 'tall', hand: 'R', foot: 'hob', mark: 'soot' } },
      { id: 'nora', name: 'ノーラ', job: '薬師の娘', voice: 'cheer', color: '#7fb56a', look: { body: 'dress', h: .84, hair: 'pony', hat: 'none', nose: 'button', prop: 'basket', cut: 'star' }, traits: { height: 'short', hand: 'L', foot: 'clog', mark: 'herb' } },
      { id: 'oscar', name: 'オスカー', job: '村長', voice: 'elder', color: '#c9a24a', look: { body: 'coat', h: .96, hat: 'top', beard: 'goatee', nose: 'hook', prop: 'cane', cut: 'moon' }, traits: { height: 'mid', hand: 'R', foot: 'hob', mark: 'wax' } },
      { id: 'ida', name: 'イーダ', job: '猟師', voice: 'sister', color: '#6f8a9a', look: { body: 'cloak', h: .97, hat: 'hood', nose: 'straight', prop: 'rifle', cut: 'wave' }, traits: { height: 'mid', hand: 'L', foot: 'shoe', mark: 'pine' } },
      { id: 'lucas', name: 'ルーカス', job: '郵便配達', voice: 'timid', color: '#8f86c8', look: { body: 'thin', h: 1.04, hat: 'flat', nose: 'button', prop: 'bag', cut: 'none' }, traits: { height: 'tall', hand: 'L', foot: 'hob', mark: 'wax' }, belong: '封蝋の手紙',
        secret: { confess: 'ハンナとは幼なじみでした。春にほかの人へ嫁ぐと聞いて、おめでとうと手紙に書いたんです。ほんとうは、行かないでと書きたかったのに。……あの晩、手紙を届けに水車小屋へ行きました。戸を叩いても返事がなくて、こわくなって逃げたんです。' } },
      { id: 'hannah', name: 'ハンナ', job: '粉ひき', voice: 'polite', color: '#d9a066', look: { body: 'apron', h: .9, hair: 'braid', hat: 'kerchief', nose: 'button', prop: 'sack', cut: 'flower' }, traits: { height: 'short', hand: 'R', foot: 'clog', mark: 'herb' } },
    ],
  };
  const SIX = ['berta', 'marco', 'nora', 'oscar', 'ida', 'lucas'];
  const ch = id => STORY.chars.find(c => c.id === id);
  const QUIT = {};

  window.WLTutorial = async function (T) {
    const $ = T.$;
    const live = () => T.S.people.filter(p => p.alive && !p.isPlayer).map(p => p.id);
    const ok = () => { if (!T.G.tut) throw QUIT; };
    const say = async items => { ok(); await T.say(items); ok(); };
    const g = (text, task) => ({ guide: true, text, task });
    const n = text => ({ text });
    const w = (who, text) => ({ who, text });
    // 操作をうながす一行：読み終えるのを待たずに、その操作（手帳をひらく等）が済むまで待つ
    const show = item => { ok(); T.say([item]); };
    const sheet = async (h, on) => { ok(); const v = await T.sheet(h, on); ok(); return v; };
    const pickP = async (title, sub, ids, o) => { ok(); const v = await T.pickPerson(title, sub, ids, o); ok(); return v; };
    const pickO = async (title, sub, opts) => { ok(); const v = await T.pickOpt(title, sub, opts); ok(); return v; };
    const scene = (loc, night, crowd) => { ok(); T.setScene(loc, night, crowd); };
    const cast = (ids, o) => { ok(); T.setCast(ids, o); };
    const head = (day, ph) => { $('hbWhere').innerHTML = `${day ? ['', '一', '二', '三'][day] + '日目 ' : ''}${ph}<small>稽古の幕・村人</small>`; $('hbAp').innerHTML = ''; };
    const phase = ph => { T.S.phase = ph; T.renderRoster(); T.renderNb(); };
    const claim = (by, role, target, res) => { let c = T.S.claims.find(c => c.by === by); if (!c) T.S.claims.push(c = { by, role, day: T.S.day, res: [] }); if (target) c.res.push({ target, res, day: T.S.day }); T.renderRoster(); T.renderNb(); };
    const out = (id, cause) => { const p = T.S.people.find(p => p.id === id); p.alive = false; p.death = { cause, day: T.S.day }; T.renderRoster(); T.renderNb(); };
    // 目印：光らせる画面の部品（名札・場所の札・手帳のボタン・手帳のタブ）
    let hlSel = null;
    const hl = sel => { hlSel = sel; document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); if (sel) document.querySelectorAll(sel).forEach(e => e.classList.add('tut-hl')); };
    // 手帳の中の案内（スマホでは手帳が画面をおおうので、すすけの言葉は手帳の中に出す）
    const note = (text, task) => {
      let b = $('nbTut');
      if (!b) { b = document.createElement('div'); b.id = 'nbTut'; $('nbTabs').after(b); }
      const h = text ? `${T.GUIDE_SVG}<div><b>すすけ</b>${task ? `<span class="task">${T.esc(task)}</span>` : ''}<p>${T.esc(text)}</p></div>` : '';
      if (b.__h !== h) { b.innerHTML = h; b.__h = h; b.__t = [text, task]; }
      b.classList.toggle('hide', !text);
      mirror();
    };
    // PCでは手帳が横に開き、下の文字の帯も見えたまま：帯にも手帳の案内と同じ言葉を出す（古い指示を残さない）
    const PCQ = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)');
    let mirrored = null;
    const mirror = () => { const b = $('nbTut'); if (!b || !PCQ.matches || !nbOpen() || !b.__t || !b.__t[0] || mirrored === b.__h) return; mirrored = b.__h; T.say([g(b.__t[0], b.__t[1])]); };
    const nbOpen = () => document.body.classList.contains('nb-open');
    // 操作を待つ：check() が真になるまで（hint() が文を返したら、手帳の案内をその文に替える）。手帳は描きなおされるので目印もつけなおす
    const until = (check, hint) => new Promise((res, rej) => { const t = setInterval(() => { if (!T.G.tut) { clearInterval(t); rej(QUIT); return; } const h = hint && hint(); if (h) note(h[0], h[1]); if (hlSel && !document.querySelector('.tut-hl')) hl(hlSel); mirror(); if (check()) { clearInterval(t); res(); } }, 180); });
    const marks = () => T.S.pl.notes;
    const tab = t => T.G.nbTab === t && nbOpen();

    try {
      T.st = STORY;
      T.S = {
        tut: true, phase: 'prologue', day: 0, diff: 0, size: 8, claims: [], nights: [], heat: {}, votes: [], reports: [], figs: [],
        people: [{ id: 'you', name: 'あなた', isPlayer: true, alive: true }].concat(SIX.concat('hannah').map(id => ({ id, name: ch(id).name, alive: true, traits: ch(id).traits, secret: ch(id).secret ? { open: false } : null }))),
        pl: { role: 'villager', notes: {}, res: [], found: [], told: [], clues: [], items: [], used: {}, log: [], strike: {} },
      };
      T.G.nbTab = 'ppl'; $('nbTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.t === 'ppl'));
      T.scr('play'); T.setNb(false); $('btnNb').classList.add('hide'); T.palette(STORY); T.SND.music('story', 1);
      document.body.classList.remove('ghost');
      head(0, '稽古の幕'); T.setCast([]); note('');

      /* ---------- 幕前 ---------- */
      scene('inn', true); T.SND.windOn(.05);
      await say([
        g('はじめまして、ぼくはすすけ。この影絵芝居の灯りの番をしているよ。これから短いお芝居を一本、いっしょに見ながら、人狼のあそび方を案内するね。'),
        g('人狼は、村人のふりをした狼を探すあそび。昼はみんなで話し合って、怪しい人をひとり追放する。夜は、狼がひとりを襲う。それをくり返すんだ。'),
        g('狼を全部追放できたら、村の勝ち。狼の数が人間と同じになったら、狼の勝ち。あなたは村人の側だよ。お芝居が始まるね。'),
      ]);

      /* ---------- 序幕 ---------- */
      scene('inn', false);
      await say([
        n('峠の雪崩が、村に通じるただ一本の道をふさいだ。行商の荷を背負ったあなたは、樅ノ木村の宿「樅亭」で足止めになった。'),
        n('食堂には、暖炉の火と、湿った羊毛の匂いと、六人の村人がいた。誰もが話の合間に、窓の外の黒い森を盗み見ている。'),
      ]);
      const intro = {
        berta: 'ようこそ、樅亭へ。雪がやむまで、部屋はいくらでもありますよ。……ただ、夜の戸締まりだけは、忘れないでくださいね。',
        marco: '行商か。鍋の穴なら、おれが塞いでやる。……手が煤けてるのは気にすんな。炉の前に三十年もいりゃ、こうなる。',
        nora: 'ねえ、行商さん！ 都の薬草、持ってる？ あたしね、夢で見たことが、ときどき本当になるの。ほんとよ。',
        oscar: 'わしが村長のオスカーじゃ。死んだ者の声は、昔からよう聞こえる。……聞きたくない声も、な。',
        ida: '森で狼の足跡を見たよ。人の足跡と、並んでね。……あんた、夜は出歩かないことだ。',
        lucas: 'ぼ、ぼくは、手紙を運ぶだけです。峠が閉じたので、ぼくもこの宿に泊まっています。……届けられない手紙が、鞄の中にたまっていくんです。',
      };
      const shown = [];
      for (const id of SIX) {
        shown.push(id); cast(shown.slice(), { from: shown.length % 2 ? 'left' : 'right' });
        await say([w(id, intro[id])]);
      }
      await say([g('いまの六人のなかに、狼が一匹まぎれている。見た目も話し方も、みんなふつうの人。だから、残された痕跡と、みんなの言葉から見抜くんだ。')]);

      /* ---------- 役 ---------- */
      await say([g('お芝居が始まる前に、役が配られる。役は自分にだけ知らされて、ほかの人の役はわからない。あなたの札を見てみよう。')]);
      await sheet(`<div class="rolecard tut"><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">あなたの役</p><h3>村人</h3><p>特別な力はない。けれど、昼に調べられる回数がいちばん多い。</p>
        <div class="tut-roles"><div><b class="v">村人の側</b><dl><dt>占い師</dt><dd>毎晩ひとりを占い、人狼かどうかを知る</dd><dt>霊媒師</dt><dd>追放された人が人狼だったかを知る</dd><dt>狩人</dt><dd>毎晩ひとりを、狼から守る</dd><dt>村人</dt><dd>力はない。調べて、話して、投票する</dd></dl></div>
        <div><b class="w">狼の側</b><dl><dt>人狼</dt><dd>夜にひとりを襲う。昼は人間のふり</dd><dt>狂人</dt><dd>人間なのに狼の味方。平気で嘘をつく</dd></dl></div></div>
        <p style="font-size:15px;color:var(--mute)">この村には人狼が1匹、狂人がひとり、占い師・霊媒師・狩人がひとりずつ、あなたを入れて村人がふたり。全部で7人。</p></div>
        <div class="foot" style="justify-content:center"><button class="btn pri" data-ok>わかった</button></div>`, box => box.querySelector('[data-ok]').onclick = () => T.closeSheet(true));
      await say([g('占い師や霊媒師が誰なのかも、まだわからない。役のある人は、自分から名乗り出ることがある。それは、あとの集会で見られるよ。')]);

      /* ---------- 最初の夜 ---------- */
      cast([]); scene('inn', true);
      T.SND.bell(.5, 1.5);
      await say([
        n('宿の灯りがひとつずつ消えていった。最後の灯りが消えたとき、森のほうで、長い遠吠えがひとつ上がった。'),
        g('夜になると、狼はひとりを選んで襲う。村人のあなたは、朝まで眠るしかない。何が起きたかは、朝になってからわかるんだ。'),
      ]);
      ok(); await T.wolfRun(null); ok();
      T.SND.windOff();

      /* ---------- 一日目の朝 ---------- */
      T.S.day = 1; head(1, '朝');
      out('hannah', 'wolf');
      T.S.nights.push({ n: 0, killer: 'marco', target: 'hannah', loc: 'mill', died: true, pos: { you: 'inn' }, traces: [{ cat: 'foot', val: 'hob' }], sights: [], ev: { owner: 'lucas', seen: [] } });
      phase('morning');
      scene('mill', false); T.SND.thud();
      cast(['hannah'], { fallen: 'hannah', x: 58 });
      await say([
        n('朝、水車小屋の前の雪が、赤く染まっていた。粉ひきのハンナが、挽き臼にもたれるようにして、冷たくなっていた。'),
        n('凍った水車の氷柱から、しずくがひとつ、ハンナの頬に落ちた。誰も、それを拭ってやれなかった。'),
      ]);
      cast(['oscar', 'hannah'], { fallen: 'hannah', span: [36, 64] });
      await say([w('oscar', 'ハンナ……。春には嫁ぐと、昨日まで笑っておったのに。……誰の仕業じゃ。この村の、誰の。')]);
      hl('#roster .ro[data-id="hannah"], #rmap .rc:nth-of-type(4)');
      await say([g('画面の上を見て。名札に×がついたハンナが、ゆうべ襲われた人。その下の場所の札で「現場」とあるのが、襲われた場所だよ。', '👀 名札の×と、場所の札の「現場」')]);
      hl(null);

      /* ---------- 昼：現場を調べる ---------- */
      head(1, '昼'); phase('invest'); cast([]);
      await say([g('ここからは昼。場所を調べたり、話を聞いたりできる。まずは「現場」の水車小屋を調べよう。狼は、そこに何か残していったはずだよ。', '👆 現場を調べよう')]);
      for (;;) {
        const v = await pickO('どこを調べる？', '本番では、昼に調べたり話を聞いたりできる回数が決まっている（村人は1日4回）。', STORY.locs.map(l => ({ t: l.name + 'を調べる' + (l.id === 'mill' ? '（現場）' : ''), v: l.id })));
        if (v === 'mill') break;
        if (v) { scene(v, false); await say([n('しんと静まりかえっている。ここには何も残っていない。'), g('ここには何もなかったね。痕跡が残っているのは、場所の札に「現場」とある水車小屋だよ。', '👆 現場を調べよう')]); }
      }
      scene('mill', false);
      T.S.pl.found.push('0|0'); T.S.nights[0].ev.seen = ['you'];
      await say([
        n('小屋の戸口まで、雪に足跡が続いている。底に鋲が並んだ跡。鋲打ちの長靴だ。足跡は戸口で乱れ、森のほうへ消えていた。'),
        g('これが「痕跡」。足跡や匂いは、ゆうべ襲った狼が残したもの。痕跡は、ぜったいに嘘をつかない。これがこのあそびの、ひとつめの約束だよ。'),
        n('挽き臼の下に、手紙が一通落ちていた。赤い封蝋に、郵便の印。宛名は、ハンナ。'),
        g('落ちていた物は、痕跡とはちがう。本当に落としたのかもしれないし、狼が罪をかぶせるために置いたのかもしれない。物は、嘘をつくことがあるんだ。'),
      ]);

      /* ---------- 推理手帳：痕跡と人物を見くらべる ---------- */
      $('btnNb').classList.remove('hide'); hl('#btnNb');
      note('手帳がひらいたね。上のタブで中身を切りかえられる。まずは「痕跡」タブを押してみよう。', '👆「痕跡」タブ');
      show(g('見つけたものは、右上の「推理手帳」に書きとめられる。手帳をひらいてみよう。', '👆 右上の手帳のボタンを押そう'));
      await until(nbOpen); hl('#nbTabs [data-t="ev"]');
      await until(() => tab('ev'));
      hl('#nbTabs [data-t="ppl"]');
      note('「序幕の夜」の欄に、鋲打ちの長靴の足跡と、ルーカスの手紙が書いてあるね。では、この足跡に合うのは誰だろう。「人物」タブで見くらべよう。', '👆「人物」タブ');
      await until(() => tab('ppl'));
      hl('#nbBody .marks .g');
      const FIT0 = ['marco', 'oscar', 'lucas'];
      note('人物ごとに、背丈・利き手・足もと・匂いが並んでいる。見つけた痕跡に合う特徴は赤く、合わない特徴は線で消える。足もとが赤い三人に「灰」の印をつけよう。', '👆 足跡に合う三人に「灰」');
      await until(() => FIT0.every(id => marks()[id] === 'g'), () => {
        const bad = SIX.find(id => !FIT0.includes(id) && marks()[id] === 'g');
        if (bad) return [`${ch(bad).name}の足もとは${STORY.traits.foot.v[ch(bad).traits.foot]}。線で消えているから、足跡には合わないね。印をもう一度押すと外せるよ。`, '👆 足もとが赤い三人に「灰」'];
        const k = FIT0.filter(id => marks()[id] === 'g').length;
        return [`人物ごとに、背丈・利き手・足もと・匂いが並んでいる。見つけた痕跡に合う特徴は赤く、合わない特徴は線で消える。足もとが赤い三人に「灰」の印をつけよう。（いま ${k}/3 人）`, '👆 足跡に合う三人に「灰」'];
      });
      hl(null);
      note('できたね。マルコ、オスカー、ルーカスの三人が、ゆうべの狼かもしれない人。印は自分用のメモで、上の名札にも同じ色が出るよ。手帳を閉じて、話を聞きに行こう。', '👆 手帳を閉じよう');
      await until(() => !nbOpen());
      note('');

      /* ---------- 昼：話を聞く ---------- */
      await say([g('手紙は、ルーカスの持ち物だと手帳に書いてあったね。本人に、ゆうべどこにいたのか聞いてみよう。', '👆 ルーカスに話を聞こう')]);
      for (;;) {
        const v = await pickP('誰に話を聞く？', '手帳の「痕跡」には、ルーカスの封蝋の手紙が落ちていたと書いてある。', live(), { cap: Object.fromEntries(live().map(id => [id, ch(id).job])) });
        if (v === 'lucas') break;
        if (v) { scene('inn', false); cast([v], { x: 50 }); await say([w(v, { berta: '手紙ですか？ 郵便なら、ルーカスさんが運んでいますけれど……。', marco: '郵便の印なら、ルーカスのだろうが。おれに聞くな。', nora: '封蝋の手紙？ ルーカスの鞄に、いっぱい入ってるやつよ。', oscar: '郵便の印なら、ルーカスじゃろう。……あの子は、ハンナと幼なじみでな。', ida: '手紙なら郵便屋の坊やに聞きな。あたしは字が苦手でね。' }[v]), g('手紙のことなら、持ち主のルーカスに聞くのがいちばんだね。', '👆 ルーカスに話を聞こう')]); }
      }
      scene('inn', false); cast(['lucas'], { x: 50 });
      T.S.pl.log.push({ k: 'night', who: 'lucas', day: 1, T: { loc: 'inn', saw: [] } });
      await say([
        n('ルーカスは郵便の鞄を胸に抱えて、暖炉のそばの隅に座っていた。あなたが近づくと、指先が鞄の留め金をせわしなく撫でた。'),
        w('lucas', 'ゆ、ゆうべですか。ずっと、この宿の部屋にいました。……一歩も、外には出ていません。本当です。'),
        g('話した内容は、手帳の「証言」タブに残る。ここで三つめの約束。人間は、ほかの人のことでは嘘をつかない。でも、秘密を隠すために自分の居場所はごまかすことがある。'),
        g('狼と狂人は、なんでも嘘をつく。だから証言は、痕跡と見くらべて確かめるんだ。いまのルーカスの話、痕跡と合っているかな？ 集会で確かめよう。'),
      ]);

      /* ---------- 集会 ---------- */
      head(1, '集会'); phase('meeting'); T.S.mtg = { day: 1 };
      scene('inn', false, true); cast(live());
      await say([
        n('日暮れ前、村人たちは樅亭の食堂に集まった。暖炉の薪が爆ぜるたびに、誰かの肩が小さく跳ねる。'),
        g('夕方は集会。役を名乗り出たり、怪しい人を名指ししたりして、みんなで話し合う。話し合いのあとに、投票があるよ。'),
        { who: 'berta', text: '申し上げます。わたしは占い師です。ゆうべ、祖母の銀の手鏡に、イーダさんを映しました。……人間でした。', fx: () => { claim('berta', 'seer', 'ida', 'human'); hl('#roster .ro[data-id="berta"], #roster .ro[data-id="ida"]'); } },
        g('ベルタが占い師だと名乗り出た。名札に「占1」の札がつき、占われたイーダの名札には「占1 白」。白は人間、黒は人狼のしるしだよ。', '👀 名札の「占1」と「白」'),
        { who: 'nora', text: '待って！ 本物の占い師は、あたしよ。ゆうべ、ベルタさんを占ったの。……影が、狼の形をしてた！', fx: () => { claim('nora', 'seer', 'berta', 'wolf'); hl('#roster .ro[data-id="nora"], #roster .ro[data-id="berta"]'); } },
        g('占い師が、ふたり名乗り出た。本物はひとりだけだから、どちらかは偽物。偽物は狼か、狼の味方をする「狂人」だ。まだ、どちらが本物かはわからない。', '👀「占1」と「占2」'),
        w('marco', '占いの言い合いなんざ、どうでもいい。現場に手紙を落としたやつがいるだろうが。……ルーカス、てめえだ。'),
        w('lucas', 'ぼ、ぼくは……ゆうべは、宿の部屋に、いました。'),
      ]);
      hl('#btnNb');
      note('「証言」タブを押そう。ルーカスの話が残っているよ。', '👆「証言」タブ');
      show(g('ルーカスの話を、手帳で確かめよう。「証言」と「痕跡」を見くらべて、食い違うところを探すんだ。', '👆 手帳をひらこう'));
      await until(nbOpen); hl('#nbTabs [data-t="say"]');
      await until(() => tab('say'));
      hl('#nbTabs [data-t="ev"]');
      note('ルーカスは「夜は樅亭にいた」と言っている。では「痕跡」タブで、ルーカスの手紙がどこに落ちていたか見てみよう。', '👆「痕跡」タブ');
      await until(() => tab('ev'));
      hl(null);
      note('手紙が落ちていたのは、水車小屋。樅亭にいたなら、ルーカスの手紙が水車小屋にあるのはおかしいね。手帳を閉じて、このことをつきつけよう。', '👆 手帳を閉じよう');
      await until(() => !nbOpen());
      note('');
      for (;;) {
        const v = await pickO('ルーカスに、何をつきつける？', '本番の集会では「矛盾を突く」。外すと、あなたの言葉が軽くなる。', [{ t: '水車小屋に落ちていた手紙', s: '宛名はハンナ。赤い封蝋に、郵便の印。', v: 'letter' }, { t: '鋲打ちの長靴の足跡', s: '水車小屋の戸口まで続いていた。', v: 'boots' }]);
        if (v === 'letter') break;
        if (v === 'boots') await say([g('鋲打ちの長靴は三人に当てはまるから、ルーカスが水車小屋にいた証拠にはならないね。ルーカスの物で、水車小屋にあったのは何だった？', '👆 何をつきつける？')]);
      }
      await say([
        w('you', 'ゆうべは宿の部屋にいたと言ったね。なら、この手紙が、どうして水車小屋の挽き臼の下にあったのかな。'),
        w('lucas', '……行きました。ハンナに、手紙を届けに。でも、戸を叩いても返事がなくて……こわくなって、逃げたんです。殺してなんか、いない！'),
        g('嘘がひとつ暴けた。でも、嘘をついたからといって狼とはかぎらない。人間も、自分の居場所なら隠すことがあるからね。ルーカスは、まだ灰色のままだよ。'),
      ]);

      /* ---------- 投票 ---------- */
      head(1, '投票'); phase('vote');
      await say([g('話し合いのあとは投票。いちばん票の多い人が、ひとり追放される。誰がいちばん怪しいと思うか、あなたも一票入れてみよう。', '👆 誰に投票する？')]);
      let vote = null;
      while (!vote) vote = await pickP('誰に投票する？', 'ひとりを選ぶ。名札の札と、手帳の印を思い出して。', live());
      await say([
        w('oscar', '名乗りがふたつ。どちらかは嘘じゃ。……あとから名乗り出た娘のほうを、まず確かめようではないか。'),
        w('ida', 'あたしもノーラに入れる。占い師を名乗るなら、名乗った晩の顔を見せてほしかったね。'),
        n(vote === 'nora' ? 'あなたの一票も加わり、票はノーラに集まった。' : `あなたは${ch(vote).name}に一票を入れた。けれど、票の多くはノーラに集まった。`),
        w('nora', '……いいわよ。でも、覚えておいて。あたしは狼じゃない。それだけは、本当だから。'),
        n('ノーラは、村はずれの古い穀物蔵へ閉じこめられた。重い閂が下りる音が、雪の中に長く残った。'),
      ]);
      T.S.votes.push({ day: 1, out: 'nora', ballots: { you: vote, berta: 'nora', marco: 'lucas', nora: 'berta', oscar: 'nora', ida: 'nora', lucas: 'marco' } });
      out('nora', 'vote'); cast(live());
      await say([g('誰が誰に入れたかは、手帳の「投票」タブに残る。追放された人の正体は、ふつうはわからない。でも、それを知る役がひとりだけいる。今夜、のぞいてみよう。')]);

      /* ---------- 二日目の夜 ---------- */
      head(1, '夜'); phase('night'); cast([]); scene('inn', true); T.SND.windOn(.09);
      await say([
        g('夜は役の時間。本番の村人は眠るだけだけど、今夜は特別に、役のある人たちの夜をのぞいてみよう。'),
        { fx: () => cast(['berta'], { x: 50 }), text: 'ベルタは、蝋燭の明かりを銀の手鏡に映した。鏡の奥に、オスカーの名を沈める。' },
        g('占い師は、毎晩ひとりを占う。結果は朝の集会で、名乗り出た占い師が話してくれるよ。'),
        { fx: () => cast(['oscar'], { x: 50 }), text: 'オスカーは蝋燭を一本だけ灯し、穀物蔵へ連れていかれた娘の影が立つのを、目を閉じて待った。' },
        g('霊媒師は、その日に追放された人が人狼だったかどうかを知る。ノーラの正体は、オスカーにだけ見えているんだ。'),
        { fx: () => cast(['ida'], { x: 50 }), text: 'イーダは銃を抱いて、宿の裏口の暗がりに立った。白い息を、襟巻きの中へ押しこめる。' },
        g('狩人は、毎晩ひとりを選んで守る。イーダは、占い師だと名乗ったベルタの部屋の戸口に立ったよ。'),
      ]);
      cast([]);
      ok(); await T.wolfRun(null); ok();
      await say([
        n('重い足音が、雪を踏んで裏口へ近づいてきた。足音は戸口の手前で止まり……戸口に立つ人影に気づいたように、森のほうへ引き返していった。'),
        g('狩人が守った人は、狼に襲われても死なない。だから狼は引き返した。ただし狩人は、同じ人を二晩続けては守れないんだ。'),
      ]);
      T.SND.windOff();

      /* ---------- 二日目の朝 ---------- */
      T.S.day = 2;
      T.S.nights.push({ n: 1, killer: 'marco', target: 'berta', loc: 'inn', died: false, saved: 'guard', pos: { you: 'inn' }, traces: [{ cat: 'height', val: 'tall' }, { cat: 'mark', val: 'soot' }], sights: [] });
      head(2, '朝'); phase('morning'); scene('inn', false); cast([]);
      hl('#rmap .rc:nth-of-type(2)');
      await say([
        n('朝が来た。食堂に、ひとり、またひとりと村人が降りてくる。誰も欠けていなかった。ベルタが、震える手で湯気の立つ鍋をかき混ぜていた。'),
        g('誰も死ななかったのは、狩人の守りが当たったから。場所の札を見ると、ゆうべの「現場」は樅亭。狼はベルタの部屋に来て、引き返したんだ。', '👆 狼が来た場所を調べよう'),
      ]);
      hl(null);
      head(2, '昼'); phase('invest');
      for (;;) {
        const v = await pickO('どこを調べる？', '場所の札の「現場」は樅亭。', STORY.locs.map(l => ({ t: l.name + (l.id === 'inn' ? '（裏口・現場）' : '') + 'を調べる', v: l.id })));
        if (v === 'inn') break;
        if (v) { scene(v, false); await say([n('雪は、ゆうべ降ったまま平らにならされている。誰も通っていない。'), g('ここには誰も来ていないね。ゆうべの「現場」は樅亭の裏口だよ。', '👆 狼が来た場所を調べよう')]); }
      }
      scene('inn', false);
      T.S.pl.found.push('1|0', '1|1');
      await say([
        n('裏口の閂に、黒い煤がべったりとついていた。指でこすると、炭と、焼けた鉄の匂いがした。'),
        n('雪には、また鋲の跡。今度ははっきり残っている。歩幅が広い。背の高い者の足だ。'),
        g('新しい痕跡がふたつ。「背が高い」と「煤の匂い」。どちらも手帳に書きとめられたよ。誰に合うのかは、あとで手帳で見くらべよう。'),
      ]);
      // ルーカスの秘密
      cast(['lucas'], { x: 50 });
      T.S.people.find(p => p.id === 'lucas').secret.open = true;
      T.S.pl.log.push({ k: 'secret', who: 'lucas', day: 2 });
      T.S.pl.told.push({ night: 0, kind: 'fig', by: 'lucas', cat: 'foot', val: 'hob' });
      await say([
        n('ルーカスは、宿の裏の薪小屋にいた。郵便の鞄から、封を切らない手紙を一通ずつ取り出しては、また戻していた。'),
        w('lucas', '……ハンナとは、幼なじみでした。春に、ほかの人へ嫁ぐって聞いて。おめでとうって、手紙に書いたんです。……ほんとうは、行かないでって書きたかったのに。'),
        w('lucas', 'あの晩、水車小屋の裏で、大きな影を見ました。鋲の音が、雪の上でじゃりじゃり鳴っていた。……顔は、見えなかった。'),
        g('ルーカスは、居場所の嘘のわけを打ち明けた。もしルーカスが人間なら、この目撃の話は本当だ。人間は、ほかの人のことでは嘘をつかないからね。'),
      ]);

      /* ---------- 二日目の集会 ---------- */
      head(2, '集会'); phase('meeting'); T.S.mtg = { day: 2 };
      scene('inn', false, true); cast(live());
      await say([
        { who: 'oscar', text: 'わしは霊媒師じゃ。ゆうべ、蝋燭の向こうに、ノーラの影が立った。……あれは、人の形をしておった。', fx: () => { claim('oscar', 'medium', 'nora', 'human'); hl('#roster .ro[data-id="oscar"], #roster .ro[data-id="nora"]'); } },
        g('オスカーが霊媒師だと名乗った。ノーラは人間。なのに、占い師だと嘘をついた。人間なのに狼をかばう嘘をつくのは、狂人だね。', '👀 ノーラの名札の「霊 白」'),
        { who: 'berta', text: 'ゆうべは、オスカーさんを映しました。人間です。……ノーラさんは、わたしを狼だと言いましたけれど。', fx: () => { claim('berta', 'seer', 'oscar', 'human'); hl('#roster .ro[data-id="oscar"]'); } },
        g('偽物の占い師が狂人だったなら、本物はベルタ。ベルタの占いでは、イーダもオスカーも人間だ。', '👀 オスカーの名札の「占1 白」'),
        { who: 'ida', text: 'あたしは狩人だよ。ゆうべはベルタの戸口に立った。……足音が来て、引き返していった。', fx: () => { claim('ida', 'guard', 'berta', 'guard'); hl('#roster .ro[data-id="ida"]'); } },
        w('marco', 'なら、狼はまだここにいる。……残ってるのは、ルーカス、てめえだけだろうが。'),
        w('lucas', 'ち、違います……！ ぼくは、ハンナを……ハンナを……。'),
      ]);
      hl('#btnNb');
      const HUM = ['berta', 'oscar', 'ida'];
      show(g('わかったことを手帳に整理しよう。人間だとわかった人に「白」、狼だと思う人に「黒」の印をつけるんだ。', '👆 手帳をひらこう'));
      note('「人物」タブで、人間だとわかった三人（本物の占い師ベルタ、占いで白のオスカーとイーダ）に「白」の印をつけよう。', '👆 三人に「白」');
      await until(nbOpen); hl('#nbTabs [data-t="ppl"]');
      await until(() => HUM.every(id => marks()[id] === 'h'), () => {
        if (!tab('ppl')) return ['「人物」タブを押そう。人間だとわかった三人に「白」の印をつけるよ。', '👆「人物」タブ'];
        if (hlSel !== '#nbBody .marks .h') hl('#nbBody .marks .h');
        const k = HUM.filter(id => marks()[id] === 'h').length;
        return [`本物の占い師ベルタと、占いで白のオスカーとイーダ。三人に「白」の印をつけよう。灰の印は、白を押すと替わるよ。（いま ${k}/3 人）`, '👆 三人に「白」'];
      });
      hl('#nbBody .marks .w');
      note('白でない人で、まだ生きているのはマルコとルーカス。狼は、このどちらかだ。ゆうべの痕跡「背が高い」「煤の匂い」に、両方とも合うのは誰かな。赤い特徴を見くらべて、狼に「黒」をつけよう。', '👆 狼だと思う人に「黒」');
      await until(() => marks().marco === 'w', () => {
        if (marks().lucas === 'w') return ['ルーカスの匂いを見て。「封蝋の匂い」は線で消えている。煤の匂いの痕跡に合わないね。印をもう一度押すと外せるよ。', '👆 痕跡にぜんぶ合う人に「黒」'];
        return null;
      });
      hl(null);
      note('マルコは、足もと・背丈・匂いが、ぜんぶ赤くなっている。三つの痕跡に全部合うのは、マルコだけだね。手帳を閉じて、最後の投票をしよう。', '👆 手帳を閉じよう');
      await until(() => !nbOpen());
      note('');

      /* ---------- 最後の投票 ---------- */
      head(2, '投票'); phase('vote');
      const FINAL = [
        { t: 'マルコ', s: '鍛冶屋。背が高い・鋲打ちの長靴・煤の匂い。', v: 'marco' },
        { t: 'ルーカス', s: '郵便配達。背が高い・鋲打ちの長靴・封蝋の匂い。現場に手紙。居場所の嘘を認めた。', v: 'lucas' },
      ];
      await say([g('さあ、最後の投票。痕跡は嘘をつかない。手帳でつけた印を思い出して、人狼だと思うほうに投票しよう。', '👆 人狼だと思うほうに投票しよう')]);
      for (;;) {
        const v = await pickO('人狼は、どちら？', '痕跡：鋲打ちの長靴（一日目）、背が高い・煤の匂い（二日目）', FINAL);
        if (!v) continue;
        if (v === 'marco') break;
        cast(['lucas'], { x: 50 });
        await say([
          n('票はルーカスに集まった。ルーカスは郵便の鞄をあなたに差し出し、いちばん上の一通を指でたたいた。'),
          w('lucas', 'この手紙、ハンナのお墓に置いてください。……おめでとう、って書いてあります。それだけです。'),
          n('その夜、森のほうで、また遠吠えが上がった。'),
          g('ルーカスは人間だった。本番なら、狼がまたひとりを襲って、村は追いつめられていく。いまのは、もしもの話。時間を巻きもどすから、手帳の匂いの欄を見なおしてみよう。', '👆 もう一度えらんでみよう'),
        ]);
        cast(live());
      }

      /* ---------- 解決 ---------- */
      cast(['marco'], { x: 50 });
      await say([
        w('you', '裏口の閂の煤。あれは炉の煤だ。鋲打ちの長靴で、背が高く、手を煤で汚している者は、この村にひとりしかいない。……マルコ、あなただ。'),
        w('marco', '……煤は、洗っても落ちねえんだよ。言ったろう、三十年も炉の前にいりゃ、こうなるってな。'),
        w('marco', '去年の冬、森で炭を焼いてたら、狼に噛まれた。それから炉の火を見てると、腹が減るようになった。……ハンナは、ただ、いちばん近くにいただけだ。'),
        n('マルコは自分で立ち上がり、穀物蔵への雪道を歩いていった。鋲の音が、じゃり、じゃりと遠ざかり、やがて聞こえなくなった。'),
      ]);
      T.S.votes.push({ day: 2, out: 'marco', ballots: { you: 'marco', berta: 'marco', oscar: 'marco', ida: 'marco', lucas: 'marco', marco: 'lucas' } });
      out('marco', 'vote'); cast(live());
      await say([g('正解！ 三つの痕跡に全部合うのはマルコだけ。手紙と居場所の嘘でルーカスが怪しく見えても、痕跡は嘘をつかなかったね。狼がいなくなって、村の勝ちだよ。')]);
      head(3, '終幕'); phase('end'); scene('mill', false); cast(['lucas'], { x: 50 });
      await say([
        n('その夜、遠吠えは聞こえなかった。三日後、峠の雪が割れ、あなたは荷を背負いなおした。'),
        n('ルーカスは峠の上まで見送ってくれた。郵便の鞄はずいぶん軽くなっていた。一通だけ、ハンナの墓に置いてきたのだという。'),
      ]);
      cast([]);
      const v = await sheet(`<div class="rolecard tut"><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">稽古の幕　おしまい</p><h3>人狼を見つけた</h3>
        <div class="tut-sum"><p><b>一日の流れ</b>夜（狼が襲う・役が力を使う）→ 朝（犠牲者と「現場」がわかる）→ 昼（調べる・話を聞く）→ 集会（名乗る・名指し・呼びかけ・矛盾を突く）→ 投票（ひとり追放）</p>
        <p><b>三つの約束</b>痕跡は嘘をつかない。物は嘘をつくことがある。人間は他人のことで嘘をつかない（自分の居場所はごまかすことがある）。</p>
        <p><b>推理手帳</b>痕跡に合う特徴は赤く、合わない特徴は線で消える。白・灰・黒の印で、わかったことを整理する。</p>
        <p><b>勝ち負け</b>狼を全部追放すれば村の勝ち。狼の数が人間と同じになれば狼の勝ち。</p></div>
        <p style="font-size:15px;color:var(--mute)">本番の物語では、狼は毎回ちがう人。入門では、手帳の赤い特徴の手助けがある。中級までは配役がはじめに明かされるが、上級と悪夢で明かされるのは狼の数（と物語の役）だけ。上級は占い師が必ずいて狂人は0〜1人、悪夢は占い師もいないことがあり狂人は0〜2人。</p></div>
        <div class="foot" style="justify-content:center;gap:10px"><button class="btn" data-v="title">タイトルへ</button><button class="btn pri" data-v="select">物語をえらぶ</button></div>`, box => box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => T.closeSheet(b.dataset.v)));
      try { localStorage.setItem('wolflantern-tut-done', '1'); } catch (e) {}
      if (v === 'select') T.select(); else T.title();
    } catch (e) {
      if (e !== QUIT) throw e;
    }
  };
})();
