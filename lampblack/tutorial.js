/* 狼影灯 — 稽古の幕「はじめての夜」：人狼がはじめての人のためのチュートリアル
   決まった筋書きの短い物語（あなたは村人）。場面ごとに、ランプの煤から生まれた案内役「すすけ」が解説をはさむ。
   最後の投票は二者択一（マルコ／ルーカス）。外したら、もう一度考えなおせる。 */
(function () {
  const STORY = {
    id: 'tutorial', no: '稽古の幕', title: '樅ノ木村', kana: 'もみのきむら',
    pal: { paper: '#efe3c8', lamp: '#ffcf86', ink: '#1b120c', night: '#16233a', moon: '#b9c8e6', acc: '#c2412d' },
    scene: 'alps',
    hero: { name: 'あなた', title: '行商人' },
    lex: { village: '村' },
    locs: [
      { id: 'tower', name: '礼拝堂' }, { id: 'inn', name: '樅亭' }, { id: 'forge', name: '鍛冶場' }, { id: 'mill', name: '水車小屋' }, { id: 'grave', name: '墓地' },
    ],
    chars: [
      { id: 'berta', name: 'ベルタ', job: '宿の女将', voice: 'polite', color: '#b0607e', look: { body: 'dress', h: .9, hair: 'bun', hat: 'bonnet', nose: 'straight', prop: 'lantern', cut: 'flower' } },
      { id: 'marco', name: 'マルコ', job: '鍛冶屋', voice: 'rough', color: '#8a5a3a', look: { body: 'stout', h: 1.08, hat: 'cap', beard: 'full', nose: 'hook', prop: 'hammer', cut: 'stripe' } },
      { id: 'nora', name: 'ノーラ', job: '薬師の娘', voice: 'cheer', color: '#7fb56a', look: { body: 'dress', h: .84, hair: 'pony', hat: 'none', nose: 'button', prop: 'basket', cut: 'star' } },
      { id: 'oscar', name: 'オスカー', job: '村長', voice: 'elder', color: '#c9a24a', look: { body: 'coat', h: .96, hat: 'top', beard: 'goatee', nose: 'hook', prop: 'cane', cut: 'moon' } },
      { id: 'ida', name: 'イーダ', job: '猟師', voice: 'sister', color: '#6f8a9a', look: { body: 'cloak', h: .97, hat: 'hood', nose: 'straight', prop: 'rifle', cut: 'wave' } },
      { id: 'lucas', name: 'ルーカス', job: '郵便配達', voice: 'timid', color: '#8f86c8', look: { body: 'thin', h: 1.04, hat: 'flat', nose: 'button', prop: 'bag', cut: 'none' } },
      { id: 'hannah', name: 'ハンナ', job: '粉ひき', voice: 'polite', color: '#d9a066', look: { body: 'apron', h: .9, hair: 'braid', hat: 'kerchief', nose: 'button', prop: 'sack', cut: 'flower' } },
    ],
  };
  const SIX = ['berta', 'marco', 'nora', 'oscar', 'ida', 'lucas'];
  const BOOTS = { berta: '革の短靴', marco: '鋲打ちの長靴', nora: '木靴', oscar: '鋲打ちの長靴', ida: '革の短靴', lucas: '鋲打ちの長靴' };
  const QUIT = {};

  window.WLTutorial = async function (T) {
    const $ = T.$;
    const live = () => T.S.people.filter(p => p.alive && !p.isPlayer).map(p => p.id);
    const ok = () => { if (!T.G.tut) throw QUIT; };
    const say = async items => { ok(); await T.say(items); ok(); };
    const g = (text, task) => ({ guide: true, text, task });
    const n = text => ({ text });
    const w = (who, text) => ({ who, text });
    const sheet = async (h, on) => { ok(); const v = await T.sheet(h, on); ok(); return v; };
    const pickP = async (title, sub, ids, o) => { ok(); const v = await T.pickPerson(title, sub, ids, o); ok(); return v; };
    const pickO = async (title, sub, opts) => { ok(); const v = await T.pickOpt(title, sub, opts); ok(); return v; };
    const scene = (loc, night, crowd) => { ok(); T.setScene(loc, night, crowd); };
    const cast = (ids, o) => { ok(); T.setCast(ids, o); };
    const pause = async ms => { ok(); await T.wait(ms); ok(); };
    const head = (day, ph) => { $('hbWhere').innerHTML = `${day ? ['', '一', '二', '三'][day] + '日目 ' : ''}${ph}<small>稽古の幕・村人</small>`; $('hbAp').innerHTML = ''; };
    const phase = ph => { T.S.phase = ph; T.renderRoster(); };
    const claim = (by, role, target, res) => { let c = T.S.claims.find(c => c.by === by); if (!c) T.S.claims.push(c = { by, role, day: T.S.day, res: [] }); if (target) c.res.push({ target, res, day: T.S.day }); T.renderRoster(); };
    const out = (id, cause) => { const p = T.S.people.find(p => p.id === id); p.alive = false; p.death = { cause }; T.renderRoster(); };

    try {
      T.st = STORY;
      T.S = {
        tut: true, phase: 'prologue', day: 0, diff: 0, claims: [], nights: [], heat: {},
        people: [{ id: 'you', name: 'あなた', isPlayer: true, alive: true }].concat(SIX.concat('hannah').map(id => ({ id, name: STORY.chars.find(c => c.id === id).name, alive: true }))),
        pl: { role: 'villager', notes: {}, res: [] },
      };
      T.scr('play'); $('btnNb').classList.add('hide'); T.palette(STORY); T.SND.music('story', 1);
      document.body.classList.remove('ghost');
      head(0, '稽古の幕'); T.setCast([]);

      /* ---------- 幕前：すすけの挨拶 ---------- */
      scene('inn', true); T.SND.windOn(.05);
      await say([
        g('やあ、ぼくはすすけ。この灯りの煤から生まれたんだ。これから短いお芝居で、人狼のあそび方を案内するね。くしゃみしたら、ごめんね。'),
        g('人狼は、村人のふりをした狼を探すあそび。昼はみんなで話し合って怪しい人をひとり追放し、夜は狼がひとりを襲う。それをくり返すんだ。'),
        g('狼を全部追放したら、村の勝ち。狼の数が人間と同じになったら、狼の勝ち。ぼくは煤だから、どっちにも数えられないよ。'),
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
        lucas: 'ぼ、ぼくは、手紙を運ぶだけです。……峠が閉じると、届けられない手紙が、鞄の中にたまっていくんです。',
      };
      const shown = [];
      for (const id of SIX) {
        shown.push(id); cast(shown.slice(), { from: shown.length % 2 ? 'left' : 'right' });
        await say([w(id, intro[id])]);
      }
      await say([g('いまの六人のなかに、狼がまぎれてる。見た目も話し方も、みんなふつうの人。だから、言葉と痕跡で見抜くんだ。')]);

      /* ---------- 役 ---------- */
      await sheet(`<div class="rolecard tut"><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">あなたの役</p><h3>村人</h3><p>特別な力はない。けれど、昼に調べられる回数がいちばん多い。</p>
        <div class="tut-roles"><div><b class="v">村人の側</b><dl><dt>占い師</dt><dd>毎晩ひとりを占い、人狼かどうかを知る</dd><dt>霊媒師</dt><dd>追放された人が人狼だったかを知る</dd><dt>狩人</dt><dd>毎晩ひとりを、狼から守る</dd><dt>村人</dt><dd>力はない。調べて、話して、投票する</dd></dl></div>
        <div><b class="w">狼の側</b><dl><dt>人狼</dt><dd>夜にひとりを襲う。昼は人間のふり</dd><dt>狂人</dt><dd>人間なのに狼の味方。平気で嘘をつく</dd></dl></div></div>
        <p style="font-size:15px;color:var(--mute)">この村には人狼が1匹、狂人がひとり、占い師・霊媒師・狩人がひとりずつ、あなたを入れて村人がふたり。全部で7人。</p></div>
        <div class="foot" style="justify-content:center"><button class="btn pri" data-ok>わかった</button></div>`, box => box.querySelector('[data-ok]').onclick = () => T.closeSheet(true));
      await say([g('役は、自分にだけこっそり配られる。ほかの人の役は、わからない。……ぼくの役？ 灯りの番だよ。けっこう忙しいんだ。')]);

      /* ---------- 最初の夜 ---------- */
      cast([]); scene('inn', true);
      T.SND.bell(.5, 1.5);
      await say([n('宿の灯りがひとつずつ消えていった。最後の灯りが消えたとき、森のほうで、長い遠吠えがひとつ上がった。')]);
      await say([g('夜になると、狼はひとりを選んで襲う。そのあいだ、村人は眠っているだけ。……ぼくも、夜は火といっしょに縮こまってるよ。')]);
      ok(); await T.wolfRun(null); ok();
      T.SND.windOff();

      /* ---------- 一日目の朝 ---------- */
      T.S.day = 1; head(1, '朝'); phase('morning');
      out('hannah', 'wolf');
      scene('mill', false);
      ok(); T.SND.thud && T.SND.thud();
      cast(['hannah'], { fallen: 'hannah', x: 58 });
      await say([
        n('朝、水車小屋の前の雪が、赤く染まっていた。粉ひきのハンナが、挽き臼にもたれるようにして、冷たくなっていた。'),
        n('凍った水車の氷柱から、しずくがひとつ、ハンナの頬に落ちた。誰も、それを拭ってやれなかった。'),
      ]);
      cast(['oscar', 'hannah'], { fallen: 'hannah', span: [36, 64] });
      await say([w('oscar', 'ハンナ……。春には嫁ぐと、昨日まで笑っておったのに。……誰の仕業じゃ。この村の、誰の。')]);
      await say([g('朝、夜に襲われた人がわかる。名札の×が、いなくなった人のしるし。ここからは昼の時間。まずは調べてみよう。')]);

      /* ---------- 昼：現場を調べる ---------- */
      head(1, '昼'); phase('invest'); cast([]);
      for (;;) {
        const v = await pickO('どこを調べる？', '本番では、昼に調べたり話を聞いたりできる回数が決まっている（村人は4回）。', STORY.locs.map(l => ({ t: l.name + 'を調べる', v: l.id })));
        if (v === 'mill') break;
        if (v) { scene(v, false); await say([n('しんと静まりかえっている。ここには何も残っていない。'), g('ここは静かだね。狼が通ったのは、ゆうべ人が倒れていた場所。そっちを調べよう。', '👆 現場を調べよう')]); }
      }
      scene('mill', false);
      await say([
        n('小屋の戸口まで、雪に足跡が続いている。底に鋲が並んだ跡。鋲打ちの長靴だ。足跡は戸口で乱れ、森のほうへ消えていた。'),
        g('これが痕跡。足跡や匂いは、ゆうべ襲った狼が残したもの。痕跡は、ぜったいに嘘をつかないよ。これがこのあそびの、ひとつめの約束。'),
        n('挽き臼の下に、手紙が一通落ちていた。赤い封蝋に、郵便の印。宛名は、ハンナ。'),
        g('でも、落ちていた物は別。本当に落としたのかもしれないし、狼が罪をかぶせるために置いたのかもしれない。物は、嘘をつくことがあるんだ。'),
      ]);
      // 足跡に合う人
      await say([g('さて、鋲打ちの長靴をはいているのは誰かな？ ひとり選んでみて。', '👆 鋲打ちの長靴の人を選ぼう')]);
      for (;;) {
        const v = await pickP('鋲打ちの長靴をはいているのは？', '人物の足もとを見くらべてみよう。', SIX, { cap: BOOTS });
        if (v && BOOTS[v] === '鋲打ちの長靴') break;
        if (v) await say([g(`${STORY.chars.find(c => c.id === v).name}は${BOOTS[v]}だね。鋲の跡は残らないよ。もう一度えらんでみて。`, '👆 鋲打ちの長靴の人を選ぼう')]);
      }
      await say([g('そのとおり！ 鋲打ちの長靴は、マルコ、オスカー、ルーカスの三人。狼は、この三人のなかにいる。……ぼくの足？ 煤だから、ないよ。')]);

      /* ---------- 昼：話を聞く ---------- */
      await say([g('次は話を聞こう。手紙の持ち主に心あたりがあるよね。', '👆 手紙の持ち主に話を聞こう')]);
      for (;;) {
        const v = await pickP('誰に話を聞く？', '赤い封蝋に、郵便の印の手紙。', SIX);
        if (v === 'lucas') break;
        if (v) { scene('inn', false); cast([v], { x: 50 }); await say([w(v, { berta: '手紙ですか？ 郵便なら、ルーカスさんが運んでいますけれど……。', marco: '郵便の印なら、ルーカスのだろうが。おれに聞くな。', nora: '封蝋の手紙？ ルーカスの鞄に、いっぱい入ってるやつよ。', oscar: '郵便の印なら、ルーカスじゃろう。……あの子は、ハンナと幼なじみでな。', ida: '手紙なら郵便屋の坊やに聞きな。あたしは字が苦手でね。' }[v])]); }
      }
      scene('inn', false); cast(['lucas'], { x: 50 });
      await say([
        n('ルーカスは郵便の鞄を胸に抱えて、暖炉のそばの隅に座っていた。あなたが近づくと、指先が鞄の留め金をせわしなく撫でた。'),
        w('lucas', 'ゆ、ゆうべですか。ずっと家にいました。……一歩も、外には出ていません。本当です。'),
        g('人間は、ほかの人のことで嘘はつかない。でも秘密を隠すために、自分の居場所はごまかすことがある。狼と狂人は、なんでも嘘をつくよ。'),
        g('この三つが、このあそびの約束。痕跡は嘘をつかない、物は嘘をつくことがある、人間は他人のことで嘘をつかない。煤より大事だから、覚えておいてね。'),
      ]);

      /* ---------- 集会 ---------- */
      head(1, '集会'); phase('meeting'); T.S.mtg = { day: 1 };
      scene('inn', false, true); cast(SIX);
      await say([
        n('日暮れ前、村人たちは樅亭の食堂に集まった。暖炉の薪が爆ぜるたびに、誰かの肩が小さく跳ねる。'),
        g('夕方は集会。役を名乗り出たり、怪しい人を名指ししたり、みんなの前で話し合う時間だよ。'),
        { who: 'berta', text: '申し上げます。わたしは占い師です。ゆうべ、祖母の銀の手鏡に、イーダさんを映しました。……人間でした。', fx: () => claim('berta', 'seer', 'ida', 'human') },
        { guide: true, text: '占い師は、毎晩ひとりが人狼かどうかを知る。名乗ると、名札に「占」の札がつくよ。白は人間、黒は人狼のしるし。' },
        { who: 'nora', text: '待って！ 本物の占い師は、あたしよ。ゆうべ、ベルタさんを占ったの。……影が、狼の形をしてた！', fx: () => claim('nora', 'seer', 'berta', 'wolf') },
        { guide: true, text: '占い師がふたり！ 本物はひとりだけ。偽物は、狼か狂人。狂人は人間なのに狼の味方をする、こまったひとなんだ。' },
        w('marco', '占いの言い合いなんざ、どうでもいい。現場に手紙を落としたやつがいるだろうが。……ルーカス、てめえだ。'),
        w('lucas', 'ぼ、ぼくは……家に、いました。'),
        g('ルーカスの話、おかしくない？ 「家にいた」と言ったのに、手紙は水車小屋にあった。矛盾をつきつけてみよう。', '👆 何をつきつける？'),
      ]);
      for (;;) {
        const v = await pickO('ルーカスに、何をつきつける？', '本番の集会では「矛盾を突く」。外すと、あなたの言葉が軽くなる。', [{ t: '水車小屋に落ちていた手紙', s: '宛名はハンナ。赤い封蝋に、郵便の印。', v: 'letter' }, { t: '鋲打ちの長靴の足跡', s: '水車小屋の戸口まで続いていた。', v: 'boots' }]);
        if (v === 'letter') break;
        if (v === 'boots') await say([g('足跡は三人に当てはまるから、「家にいた」の嘘の証拠にはならないね。家にいたなら、ないはずの物は？', '👆 何をつきつける？')]);
      }
      await say([
        w('you', 'ゆうべは家にいたと言ったね。なら、この手紙が、どうして水車小屋の挽き臼の下にあったのかな。'),
        w('lucas', '……行きました。ハンナに、手紙を届けに。でも、戸を叩いても返事がなくて……こわくなって、逃げたんです。殺してなんか、いない！'),
        g('嘘がひとつ暴けた。でも、嘘をついた人が狼とはかぎらない。人間は、自分の居場所なら隠すこともあるからね。'),
      ]);

      /* ---------- 投票 ---------- */
      head(1, '投票'); phase('vote');
      await say([g('話し合いのあとは投票。いちばん票の多い人が、ひとり追放される。あなたも一票、入れてみて。', '👆 誰に投票する？')]);
      let vote = null;
      while (!vote) vote = await pickP('誰に投票する？', 'ひとりを選ぶ。本番では、票の数で追放される人が決まる。', live(), { mark: false });
      const vn = STORY.chars.find(c => c.id === vote).name;
      await say([
        w('oscar', '名乗りがふたつ。どちらかは嘘じゃ。……あとから名乗り出た娘のほうを、まず確かめようではないか。'),
        w('ida', 'あたしもノーラに入れる。占い師を名乗るなら、名乗った晩の顔を見せてほしかったね。'),
        n(vote === 'nora' ? 'あなたの一票も加わり、票はノーラに集まった。' : `あなたは${vn}に一票を入れた。けれど、票の多くはノーラに集まった。`),
        w('nora', '……いいわよ。でも、覚えておいて。あたしは狼じゃない。それだけは、本当だから。'),
        n('ノーラは、村はずれの古い穀物蔵へ閉じこめられた。重い閂が下りる音が、雪の中に長く残った。'),
      ]);
      out('nora', 'vote'); cast(live());
      await say([g('追放された人の正体は、ふつうはわからない。でも、それを知ることができる役があるんだ。……次の夜をお楽しみに。')]);

      /* ---------- 二日目の夜 ---------- */
      head(1, '夜'); phase('night'); cast([]); scene('inn', true); T.SND.windOn(.09);
      await say([
        g('夜は役の時間。占い師はひとりを占い、霊媒師は追放された人の正体を見て、狩人はひとりを狼から守る。本番ならあなたは眠るだけ。今夜は、特別にのぞいてみよう。'),
        { fx: () => cast(['berta'], { x: 50 }), text: 'ベルタは、蝋燭の明かりを銀の手鏡に映した。鏡の奥に、オスカーの名を沈める。' },
        { fx: () => cast(['oscar'], { x: 50 }), text: 'オスカーは蝋燭を一本だけ灯し、穀物蔵へ連れていかれた娘の影が立つのを、目を閉じて待った。' },
        { fx: () => cast(['ida'], { x: 50 }), text: 'イーダは銃を抱いて、宿の裏口の暗がりに立った。白い息を、襟巻きの中へ押しこめる。' },
      ]);
      cast([]);
      ok(); await T.wolfRun(null); ok();
      await say([
        n('重い足音が、雪を踏んで裏口へ近づいてきた。足音は戸口の手前で止まり……戸口に立つ人影に気づいたように、森のほうへ引き返していった。'),
        g('狩人が守った人は、狼に襲われても死なない。ただし、同じ人を二晩続けては守れない。……ぼくも二晩続けて燃えるのは、ちょっとつらいよ。'),
      ]);
      T.SND.windOff();

      /* ---------- 二日目の朝 ---------- */
      T.S.day = 2; head(2, '朝'); phase('morning'); scene('inn', false); cast([]);
      await say([
        n('朝が来た。食堂に、ひとり、またひとりと村人が降りてくる。誰も欠けていなかった。ベルタが、震える手で湯気の立つ鍋をかき混ぜていた。'),
        g('誰も死なない朝は、狩人の守りが当たったしるし。狼が狙ったのは、たぶん……名乗り出た占い師だね。', '👆 狼が来た場所を調べよう'),
      ]);
      head(2, '昼'); phase('invest');
      for (;;) {
        const v = await pickO('どこを調べる？', '狼は、ベルタを狙ったのかもしれない。', STORY.locs.map(l => ({ t: l.name + (l.id === 'inn' ? '（裏口）' : '') + 'を調べる', v: l.id })));
        if (v === 'inn') break;
        if (v) { scene(v, false); await say([n('雪は、ゆうべ降ったまま平らにならされている。誰も通っていない。'), g('ここは誰も通ってないみたい。ベルタの部屋があるのは、どこだっけ？', '👆 狼が来た場所を調べよう')]); }
      }
      scene('inn', false);
      await say([
        n('裏口の閂に、黒い煤がべったりとついていた。指でこすると、炭と、焼けた鉄の匂いがした。'),
        n('雪には、また鋲の跡。今度ははっきり残っている。歩幅が広い。背の高い者の足だ。'),
        g('閂に煤！ 炭と鉄の匂いは、炉のそばで働く人の匂いだよ。……ぼくの煤じゃないからね。ほんとだよ。'),
      ]);
      // ルーカスの秘密
      cast(['lucas'], { x: 50 });
      await say([
        n('ルーカスは、宿の裏の薪小屋にいた。郵便の鞄から、封を切らない手紙を一通ずつ取り出しては、また戻していた。'),
        w('lucas', '……ハンナとは、幼なじみでした。春に、ほかの人へ嫁ぐって聞いて。おめでとうって、手紙に書いたんです。……ほんとうは、行かないでって書きたかったのに。'),
        w('lucas', 'あの晩、水車小屋の裏で、大きな影を見ました。鋲の音が、雪の上でじゃりじゃり鳴っていた。……顔は、見えなかった。'),
        g('ルーカスの秘密がわかったね。人間の目撃談は本当のことだから、「大きな影と鋲の音」は信じていいよ。……もちろん、ルーカスが人間なら、だけど。'),
      ]);

      /* ---------- 二日目の集会 ---------- */
      head(2, '集会'); phase('meeting'); T.S.mtg = { day: 2 };
      scene('inn', false, true); cast(live());
      await say([
        { who: 'oscar', text: 'わしは霊媒師じゃ。ゆうべ、蝋燭の向こうに、ノーラの影が立った。……あれは、人の形をしておった。', fx: () => claim('oscar', 'medium', 'nora', 'human') },
        { guide: true, text: '霊媒師は、追放された人が人狼だったかを知る。ノーラは人間……なのに占い師を名乗った。つまり、狂人だったんだ。' },
        { who: 'berta', text: 'ゆうべは、オスカーさんを映しました。人間です。……ノーラさんは、わたしを狼だと言いましたけれど。', fx: () => claim('berta', 'seer', 'oscar', 'human') },
        { guide: true, text: '偽物が狂人なら、ベルタが本物の占い師。ベルタの白はイーダとオスカー。名乗った人は、みんな人間とわかったね。' },
        { who: 'ida', text: 'あたしは狩人だよ。ゆうべはベルタの戸口に立った。……足音が来て、引き返していった。', fx: () => claim('ida', 'guard', 'berta', 'guard') },
        w('marco', 'なら、狼はまだここにいる。……残ってるのは、ルーカス、てめえだけだろうが。'),
        w('lucas', 'ち、違います……！ ぼくは、ハンナを……ハンナを……。'),
        g('白も黒もついていない人を「灰色」と呼ぶよ。残る灰色は、マルコとルーカス。狼は、このどちらかだ。'),
        g('本番の集会では「呼びかけ」もできる。占い先を頼んだり、狩人に守ってほしい人を頼んだり。……狼も、こっそり聞いてるけどね。'),
        g('本番では、右上の推理手帳に特徴・痕跡・証言・投票が自動で書きとめられる。煤まみれのぼくより、ずっと物知りなんだ。'),
      ]);

      /* ---------- 最後の投票 ---------- */
      head(2, '投票'); phase('vote');
      const FINAL = [
        { t: 'マルコ', s: '鍛冶屋。鋲打ちの長靴、背が高い。名乗りはない。', v: 'marco' },
        { t: 'ルーカス', s: '郵便配達。鋲打ちの長靴、背が高い。現場に手紙。居場所の嘘を認めた。', v: 'lucas' },
      ];
      await say([g('さあ、最後の投票。痕跡は嘘をつかない。人間は他人のことで嘘をつかない。……人狼は、どっち？', '👆 人狼だと思うほうに投票しよう')]);
      for (;;) {
        const v = await pickO('人狼は、どちら？', '痕跡：鋲打ちの長靴・背の高い足跡・裏口の閂の煤（炭と焼けた鉄の匂い）', FINAL);
        if (!v) continue;
        if (v === 'marco') break;
        cast(['lucas'], { x: 50 });
        await say([
          n('票はルーカスに集まった。ルーカスは郵便の鞄をあなたに差し出し、いちばん上の一通を指でたたいた。'),
          w('lucas', 'この手紙、ハンナのお墓に置いてください。……おめでとう、って書いてあります。それだけです。'),
          n('その夜、森のほうで、また遠吠えが上がった。'),
          g('ああっ、ルーカスは人間だったんだ。本番なら、狼の勝ちが近づいちゃう。……いまのは、もしもの話。時間を巻きもどすね。裏口の閂の煤、あれは誰の匂いだったかな？', '👆 もう一度えらんでみよう'),
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
      out('marco', 'vote'); cast(live());
      await say([g('大正解！ 鋲打ちの長靴、背の高い足跡、裏口の閂の煤。痕跡はぜんぶ、マルコを指していたんだ。ぼくの煤まで疑われなくて、ほっとしたよ。')]);
      head(3, '終幕'); phase('end'); scene('mill', false); cast(['lucas'], { x: 50 });
      await say([
        n('その夜、遠吠えは聞こえなかった。三日後、峠の雪が割れ、あなたは荷を背負いなおした。'),
        n('ルーカスは峠の上まで見送ってくれた。郵便の鞄はずいぶん軽くなっていた。一通だけ、ハンナの墓に置いてきたのだという。'),
      ]);
      cast([]);
      const v = await sheet(`<div class="rolecard tut"><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">稽古の幕　おしまい</p><h3>人狼を見つけた</h3>
        <div class="tut-sum"><p><b>一日の流れ</b>夜（狼が襲う・役が力を使う）→ 朝（犠牲者がわかる）→ 昼（調べる・話を聞く）→ 集会（名乗る・名指し・呼びかけ・矛盾を突く）→ 投票（ひとり追放）</p>
        <p><b>三つの約束</b>痕跡は嘘をつかない。物は嘘をつくことがある。人間は他人のことで嘘をつかない（自分の居場所はごまかすことがある）。</p>
        <p><b>勝ち負け</b>狼を全部追放すれば村の勝ち。狼の数が人間と同じになれば狼の勝ち。</p></div>
        <p style="font-size:15px;color:var(--mute)">本番の物語では、狼は毎回ちがう人。役も、選ぶか物語にまかせられる。</p></div>
        <div class="foot" style="justify-content:center;gap:10px"><button class="btn" data-v="title">タイトルへ</button><button class="btn pri" data-v="select">物語をえらぶ</button></div>`, box => box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => T.closeSheet(b.dataset.v)));
      try { localStorage.setItem('wolflantern-tut-done', '1'); } catch (e) {}
      if (v === 'select') T.select(); else T.title();
    } catch (e) {
      if (e !== QUIT) throw e;
    }
  };
})();
