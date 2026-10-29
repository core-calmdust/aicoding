'use strict';
// モリス・コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・駒数・段階・序盤の型・陣形), the recommended plan with its
// reason, the candidate directions (分かれ道: each candidate's plan, which piece / which point; moves revealed on demand, marked on
// the board on hover), prioritized "how to think" tips read from the position (ミル・相手のねらい・ダブルミル・動ける手・飛び …),
// and the verdict on the previous move (◎○△✕ with the AI's first choice and a 💡 tip). Glossary terms are dotted.
// The opening (first two placements) is taught from opening knowledge and the site's opening lines (openings.json), not raw values.
// Texts: TX[lang] (en fallback); zh ko es fr pt de hi ar live in coach-i18n.js (MorrisCoach.merge).
// index.html: MorrisCoach.render() after every refresh; MorrisCoach.cands(key, list) when the analysis (all moves with values) arrives;
// MorrisCoach.fx(svg) at the end of renderFx (marks for the hovered / revealed candidates).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこに置く（動かす）か、予想してみよう。相手の「ねらい」が見えると守りが楽になります。', over: '対局が終わりました。棋譜の［解析］で一局を振り返れます。', overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', mat: '駒数', stage: '段階', type: '序盤の型', who: '陣形（{w}）', meC: 'あなた', opC: '相手',
  'st.place': '配置', 'st.move': '移動', 'st.fly': '飛び',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  matV: '{a} 対 {b}', moyo: '{n}模様', fixed: '{n}',
  'ty.junc': '交差点スタート', 'ty.side': '辺スタート', 'ty.corner': '角スタート', 'ty.center': '中段のミル', 'ty.vs': '{a}・{b}の応手', 'rt.junc': '交差点', 'rt.side': '辺', 'rt.corner': '角',
  fmMill: 'ミル{n}', fmThr: 'ねらい{n}', fmMob: '動ける手{n}', fmZw: 'ダブルミル', fmNone: 'まだ形なし', sep: '・',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}。',
  recSharp: '2番目の候補との差が大きく、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'tt.place': '{to}に置く', 'tt.move': '{from}の駒を{to}へ', 'tt.fly': '{from}の駒を{to}へ飛ばす', 'tt.take': '{a}・{r}を取る',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  // plans: tag / badge / explanation
  'c.mill': 'ミル', 'b.mill': 'ミルを作る', 'x.mill': 'ミルを作って{r}を取る方針。取る駒は、相手の2つ並び（ねらい）の駒や、よく動ける駒が候補です。ミルの中の駒は、ほかに取れる駒がない場合しか取れません。',
  'c.double': '二重のねらい', 'b.double': 'ねらいを2つ作る', 'x.double': '「次にミル」のねらいを2か所同時に作る方針。相手は1手で1か所しかふさげないので、どちらかでミルを作れる可能性が高くなります。',
  'c.threat': 'ねらい', 'b.threat': 'ねらいを作る', 'x.threat': '2つ並べて「次にミル」のねらいを作る方針。相手にふさぐ手を使わせれば、自分のペースで進められます。',
  'c.block': 'ふさぐ', 'b.block': 'ふさぐ', 'x.block': '相手のねらいの点（{to}）を先にふさぐ守りの方針。ミルを作られると駒を1つ失うので、毎手まず確かめたい手です。',
  'c.open': 'ミルを開く', 'b.open': 'ミルを開く', 'x.open': 'ミルから駒を1つ出して、次の手で戻して閉じ直すねらい。閉じるたびに相手の駒を取れますが、開いた瞬間はミルの駒が守られなくなる点に注意。',
  'c.trap': '封じ込め', 'b.trap': '動きを止める', 'x.trap': '相手の駒の動ける場所を減らす方針。移動の段階では、全部の駒が動けなくなった側の負けです。',
  'c.junc': '交差点', 'b.junc': '交差点を取る', 'x.junc': '4方向につながる交差点を取る方針。ミルの列が2本通り、移動の段階でも動きやすい良い点です。',
  'c.place': '配置', 'b.place': '形を整える', 'x.place': '駒を置いて陣形を整える方針。1か所に固めず、あとで動ける場所を残しておくのがコツです。',
  'c.move': '整える', 'b.move': '形を整える', 'x.move': '駒を動かして形を整える方針。動ける場所や、次のねらいが増える手を選ぼう。',
  'c.fly': '飛び', 'b.fly': '飛ぶ', 'x.fly': '駒が3つになると、どの空き点へも飛べます。相手のねらいをふさぎつつ、2か所のねらいを作れれば勝負になります。',
  // opening crossroads
  opH: '序盤の分かれ道 — 最初の一手の選び方', opH2: '序盤の分かれ道 — 応手の選び方', opIntro: '最初の数手は評価値の小さな差より、点の性質（交差点・辺・角）で選ぶのが基本です。定番の2つを先に、変わり種をあとに並べています。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.junc.t': '交差点 {p} に置く', 'op.junc.x': 'd6・b4・f4・d2 の4点は、4方向につながる「交差点」。ミルの列が2本通り、移動の段階でも動きやすい点です。このサイトのAIも第1手として最も高く評価し、「交差点を優先し、角は避ける」が定石の基本です。',
  'op.side.t': '辺の中点 {p} に置く', 'op.side.x': '外周・内周の辺の中点（d7・a4 など）は3方向につながる点。交差点とほぼ同じ評価の、しっかりした始め方です。相手に隣の交差点を取られやすい点は覚えておこう。',
  'op.corner.t': '角 {p} に置く', 'op.corner.x': '角（a7・g1 など）は2方向にしかつながらず、移動の段階で動きにくくなりがちです。1手目の角ですぐ負けるわけではありませんが、評価は少し下がります。',
  'op.jj.t': '別の交差点 {p} で応じる', 'op.jj.x': '相手が交差点なら、こちらも別の交差点を取るのが自然な応手（このサイトの定跡「交差点には交差点」）。ふさぐだけでなく、自分のねらいも作っていけます。',
  'op.jl.t': '同じ列の {p} に置く', 'op.jl.x': '相手の交差点と同じ列の隣に置いて、その列を先に止める手。AIの評価は別の交差点とほぼ同じです。',
  'op.jc.t': '角 {p} に置く', 'op.jc.x': '角での応手。動ける場所が少ない点なので、交差点や辺の応手より評価が下がります。',
  'op.sd.t': 'すぐ隣の交差点 {p} を取る', 'op.sd.x': '相手が辺の中点から始めたら、隣の交差点を取るのが有力（定跡「辺への応手」）。相手の列を止めながら、良い点も手に入ります。',
  'op.sl.t': '同じ列の残り {p} に置く', 'op.sl.x': '相手の辺の駒と同じ列の残りの点に置いて、列を止める手。AIの評価もほぼ同じです。',
  'op.sc.t': '角 {p} に置く', 'op.sc.x': '角での応手。列は止められますが、動ける場所が少ないぶん評価は下がります。',
  'op.cs.t': '辺の中点 {p} を取る', 'op.cs.x': '相手が角から始めたら、こちらは良い点を取りやすくなります（定跡「角への応手」）。このサイトのAIは、この局面では辺の中点を高く評価します。',
  'op.cs2.t': '辺の中点 {p} に置く', 'op.cs2.x': 'もう一つの有力な辺の点。AIの評価は上の手とほぼ同じです。',
  'op.cj.t': '交差点 {p} に置く', 'op.cj.x': '交差点を取る手。一般には良い点ですが、角への応手としてはAIの評価が少し下がります。点の良さだけでなく、相手の駒との位置関係も大切です。',
  bkH: '定跡の手順 — このサイトの序盤研究', bkIntro: 'いまの局面は、このサイトの定跡（AIで調べた配置の手順）と同じです。序盤は評価値の小さな差より、手順の意味を覚えることが大切です。', bkWhy: '定跡「{n}」の続きは {m} です。', 'bk.tag': '定跡', 'bk.gap': '定跡手',
  prevBook: '定跡・定番の手です。', prevOpen: '序盤の定番の手です（点の性質で選ぶ段階）。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', 'q.0': '最善', 'q.1': '好手', 'q.2': '疑問手', 'q.3': '悪手',
  prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  // tips
  'tp.mill': '{to}でミルを作れます！ ミルを作ると相手の駒を1つ取れます。',
  'tp.take': '取る駒の選び方：相手の次のミルを防ぐより、自分の次のミルを作りやすくなる駒を取るほうが良いことが多い、と言われます。迷ったら、相手の2つ並び（ねらい）の駒や、よく動ける駒から。',
  'tp.oppThr': '相手は次に {x} でミルを作れます。ふさぐか、それより先に自分がミルを作れないか確かめよう。',
  'tp.oppThr2': '相手のねらいが {n} か所あります（{x}）。1手で全部はふさげません。自分がミルを作って駒を取る手や、ねらいの数が少なくなる手を探そう。',
  'tp.oppZw': '相手がダブルミルを作っています（{x}）。1手ごとにミルを作られてしまう形なので、最優先で崩しにいこう。',
  'tp.myZw': 'あなたはダブルミルを持っています（{x}）。駒を行き来させるたびにミルができ、毎回駒を取れます。',
  'tp.double': '2か所同時の「ねらい」を作れる手があります。相手は1手で1か所しかふさげません。',
  'tp.mob': 'あなたの動ける手は {n} 通りだけです。全部の駒が動けなくなると負けなので、駒の逃げ道を残そう。',
  'tp.oppMob': '相手の動ける手は {n} 通りしかありません。残りの逃げ道をふさげば、動けなくして勝てるかもしれません。',
  'tp.fly': 'あなたの駒は3つ。どの空き点へも飛べます。相手のねらいを毎手ふさぎながら、2か所のねらいを作れれば逆転もあります。',
  'tp.oppFly': '相手の駒は3つで、どこへでも飛べます。ねらいが1か所だけだとすぐふさがれるので、2か所のねらいを同時に作ろう。',
  'tp.last': 'あなたは最後の駒を置く側です。置き終わったあと、どちらが先に動くかまで考えて最後の1手を選べます。',
  'tp.junc': '交差点（d6・b4・f4・d2）は4方向につながる一番働く点です。空いていれば有力候補。逆に角は2方向にしかつながりません。',
  'tp.spread': '序盤はすぐにミルを作ろうとするより、盤のあちこちに置いて動ける形を作るほうが良い、とされます。1か所に固めすぎないように。',
  'tp.multi': '駒を置く・動かすのは1手に1つだけ。だから、ねらいを2つ以上作ると相手は守りきれません。',
  'tp.inMill': 'ミルの中の駒は、ほかに取れる駒がない場合しか取られません。ミルは守りにもなります。',
  'tp.block': '移動の段階では、相手の駒を全部動けなくすれば勝ちです。相手の駒のまわりの空き点を見てみよう。',
  'tp.open': 'ミルを開いて閉じ直す（叩く）と、閉じるたびに駒が取れます。ただし開いた1手の間は、その駒が取られる危険があります。',
  'tp.draw': 'モリスは完全解析されていて、両者が最善を尽くすと引き分けになります（R. Gasser）。勝負は相手のミスをとらえられるかどうかです。',
  'tp.winning': '優勢です。無理をせず、相手のねらいを毎手ふさいで安全に進めよう。',
  'tp.losing': '劣勢です。ふつうの手では差が縮まりません。2か所のねらいを作るなど、相手が間違えやすい手で勝負しよう。',
  'tp.matUp': '駒数はあなたが {n} 個多いです。相手が3つになると飛べるようになるので、そこからは2か所のねらいに注意。',
  'tp.matDown': '駒数はあなたが {n} 個少ないです。ミルを作って取り返すか、相手の駒を動けなくする筋を探そう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻める（ねらいを作る）か、守る（ふさぐ）か、方針を先に決めてから手を選ぼう。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です。ここを正確に指せるかが勝負の分かれ目。',
  gl: {
    mill: { m: ['ミル'], t: 'ミル', d: '同じ線の上に自分の駒が3つ並んだ形。作るたびに、相手の駒を1つ取れます。' },
    zw: { m: ['ダブルミル'], t: 'ダブルミル（ツヴィックミューレ）', d: '1つの駒を行き来させるだけで、2つのミルを交互に作れる形。動かすたびに相手の駒を取れる、とても強い形です。' },
    junc: { m: ['交差点'], t: '交差点', d: '4方向の点とつながる点（d6・b4・f4・d2）。ミルの列が2本通り、もっとも動きやすい点です。' },
    corner: { m: ['角'], t: '角', d: '盤の四すみの点（a7・g7・a1・g1 など）。2方向にしかつながらず、動きにくい点です。' },
    thr: { m: ['ねらい'], t: 'ねらい', d: '自分の駒が2つ並び、残りの1点が空いている列。次の手でミルを作れる状態です（オープンミル）。' },
    block: { m: ['ふさぐ', 'ふさげ', 'ふさい'], t: 'ふさぐ', d: '相手のねらいの空き点に自分の駒を置く（動かす）こと。ミルを防ぐ基本の守りです。' },
    fly: { m: ['飛べ', '飛び', '飛ぶ'], t: '飛び', d: '駒が3つになった側は、隣の点だけでなく、どの空き点へも駒を移せます。' },
    open: { m: ['叩く'], t: '叩く', d: 'ミルの駒を1つ外へ出し、次の手で戻してミルを作り直すこと。作るたびに駒を取れます。' },
    gasser: { m: ['完全解析'], t: '完全解析', d: 'コンピュータで全局面を調べ、最善の結果を確定させること。モリスは1990年代に R. Gasser が解析し、引き分けとわかりました。' },
    center: { m: ['中段のミル'], t: '中段のミル（ツェントルムスミューレ）', d: '先手が早めに中段（真ん中の四角）にミルを作りにいく作戦。後手は最初の2つの駒で交差点を取って対抗するのが定番とされます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  oppTurn: "It's your opponent's turn. Try to guess where they will place (or move) next — once you see their threats, defending gets easy.", over: 'The game is over. Use [Analyze] in the record to review it.', overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', mat: 'Pieces', stage: 'Phase', type: 'Opening', who: 'Setup ({w})', meC: 'you', opC: 'opponent',
  'st.place': 'Placing', 'st.move': 'Moving', 'st.fly': 'Flying',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  matV: '{a} vs {b}', moyo: 'heading for {n}', fixed: '{n}',
  'ty.junc': 'Junction start', 'ty.side': 'Side start', 'ty.corner': 'Corner start', 'ty.center': 'Centre mill', 'ty.vs': '{a}, {b} reply', 'rt.junc': 'junction', 'rt.side': 'side', 'rt.corner': 'corner',
  fmMill: '{n} mill(s)', fmThr: '{n} threat(s)', fmMob: '{n} moves', fmZw: 'double mill', fmNone: 'nothing yet', sep: ', ',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f}.',
  recSharp: 'The gap to the second choice is large — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'tt.place': 'Place on {to}', 'tt.move': 'Move the piece on {from} to {to}', 'tt.fly': 'Fly the piece on {from} to {to}', 'tt.take': '{a}, take {r}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  'c.mill': 'Mill', 'b.mill': 'Close a mill', 'x.mill': 'Close a mill and remove {r}. Good pieces to take: one of the opponent\'s pairs (threats) or a piece that moves freely. Pieces in a mill can only be taken when no other piece is available.',
  'c.double': 'Double threat', 'b.double': 'Make two threats', 'x.double': 'Create two "mill next move" threats at once. The opponent can block only one per move, so one of them is likely to become a mill.',
  'c.threat': 'Threat', 'b.threat': 'Make a threat', 'x.threat': 'Line up two pieces so that a mill is threatened next move. Making the opponent spend moves on blocking lets you set the pace.',
  'c.block': 'Block', 'b.block': 'Block', 'x.block': 'Block the opponent\'s threat point ({to}) first. A mill costs you a piece, so check for this every move.',
  'c.open': 'Open a mill', 'b.open': 'Open a mill', 'x.open': 'Move a piece out of your mill to move it back and close the mill again next move. Each closing removes an enemy piece — but while the mill is open, its pieces are no longer protected.',
  'c.trap': 'Blockade', 'b.trap': 'Hem in', 'x.trap': 'Take away the squares the opponent\'s pieces can move to. In the moving phase, a player who cannot move loses.',
  'c.junc': 'Junction', 'b.junc': 'Take a junction', 'x.junc': 'Take a junction with four neighbours: two mill lines run through it and it stays mobile in the moving phase.',
  'c.place': 'Placement', 'b.place': 'Build up', 'x.place': 'Place a piece to build your setup. Don\'t crowd one area — keep room to move later.',
  'c.move': 'Improve', 'b.move': 'Improve', 'x.move': 'Move a piece to improve your setup. Prefer moves that add mobility or new threats.',
  'c.fly': 'Flying', 'b.fly': 'Fly', 'x.fly': 'With three pieces you may fly to any empty point. Block the opponent\'s threats while building two of your own and you are still in the game.',
  opH: 'Opening crossroads — choosing the first placement', opH2: 'Opening crossroads — choosing a reply', opIntro: 'In the first moves, choose by the kind of point (junction, side, corner) rather than small evaluation differences. The two standard choices come first, the unusual one last.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.junc.t': 'Place on the junction {p}', 'op.junc.x': 'd6, b4, f4 and d2 are the "junctions", each connected to four points: two mill lines run through them and they stay mobile later. This site\'s engine rates them best as a first move, and the basic advice is "take the junctions, avoid the corners".',
  'op.side.t': 'Place on the side point {p}', 'op.side.x': 'The middle points of the sides (d7, a4 …) connect to three points — a solid start rated almost as high as a junction. Remember the opponent can then take the junction next to it.',
  'op.corner.t': 'Place on the corner {p}', 'op.corner.x': 'Corners (a7, g1 …) connect to only two points and tend to get stuck in the moving phase. A corner first move does not lose, but it is rated a little lower.',
  'op.jj.t': 'Answer on another junction, {p}', 'op.jj.x': 'Against a junction, taking another junction is the natural reply (this site\'s line "Junction against junction"). You block and build your own threats at the same time.',
  'op.jl.t': 'Place next to it on {p}', 'op.jl.x': 'Place next to the opponent\'s junction on the same line to stop that line early. The engine rates it about the same as another junction.',
  'op.jc.t': 'Place on the corner {p}', 'op.jc.x': 'A corner reply. Corners offer little mobility, so it is rated below the junction and side replies.',
  'op.sd.t': 'Take the junction next to it, {p}', 'op.sd.x': 'Against a side start, taking the neighbouring junction is strong (this site\'s line "Answering the side start"): it stops the line and gains a good point.',
  'op.sl.t': 'Take the rest of the line, {p}', 'op.sl.x': 'Place on the remaining point of the opponent\'s line to stop it. The engine rates it about the same.',
  'op.sc.t': 'Place on the corner {p}', 'op.sc.x': 'A corner reply: it can stop a line, but its low mobility costs some evaluation.',
  'op.cs.t': 'Take the side point {p}', 'op.cs.x': 'Against a corner start the good points are easier to get (this site\'s line "Answering the corner start"). Here the engine rates the side points highest.',
  'op.cs2.t': 'Place on the side point {p}', 'op.cs2.x': 'Another strong side point, rated about the same by the engine.',
  'op.cj.t': 'Place on the junction {p}', 'op.cj.x': 'Junctions are usually good points, but as a reply to a corner start the engine rates this a little lower: where the opponent\'s pieces stand matters too.',
  bkH: 'Book line — this site\'s opening study', bkIntro: 'This position follows one of this site\'s opening lines (placement sequences researched with the engine). In the opening, learning what the moves mean matters more than small evaluation differences.', bkWhy: 'The line "{n}" continues with {m}.', 'bk.tag': 'Book', 'bk.gap': 'book move',
  prevBook: 'A book move.', prevOpen: 'A standard opening move (at this stage the kind of point decides).',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', 'q.0': 'Best', 'q.1': 'Good', 'q.2': 'Inaccuracy', 'q.3': 'Mistake',
  prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  'tp.mill': 'You can close a mill on {to}! A mill lets you remove one of the opponent\'s pieces.',
  'tp.take': 'Which piece to take: it is often better to open the way to your own next mill than to stop the opponent\'s. When unsure, take a piece of an enemy pair (threat) or one that moves freely.',
  'tp.oppThr': 'The opponent can close a mill on {x} next move. Block it — or check first whether you can close a mill yourself.',
  'tp.oppThr2': 'The opponent has {n} threats ({x}). You cannot block them all in one move: look for a mill of your own that removes a piece, or a move that reduces the threats.',
  'tp.oppZw': 'The opponent has a double mill ({x}): it closes a mill every move. Breaking it up comes first.',
  'tp.myZw': 'You have a double mill ({x}). Each time the piece shuttles you close a mill and remove a piece.',
  'tp.double': 'There is a move that makes two threats at once. The opponent can block only one per move.',
  'tp.mob': 'You have only {n} possible moves. A player who cannot move loses — keep escape squares for your pieces.',
  'tp.oppMob': 'The opponent has only {n} possible moves. Close the remaining escapes and you may win by blockade.',
  'tp.fly': 'You are down to three pieces and may fly to any empty point. Block the opponent\'s threats every move and try to build two threats at once.',
  'tp.oppFly': 'The opponent has three pieces and can fly anywhere. A single threat is blocked at once — make two threats at the same time.',
  'tp.last': 'You place the last piece. Choose it with the moving phase in mind: who moves first, and which pieces will be stuck.',
  'tp.junc': 'The junctions (d6, b4, f4, d2) connect to four points — the busiest points of the board. Take them when free; corners connect to only two.',
  'tp.spread': 'In the opening, spreading your pieces to versatile points is better than rushing for a mill in one corner of the board.',
  'tp.multi': 'You place or move only one piece per turn — so do your opponent. Two or more threats at once can\'t all be blocked.',
  'tp.inMill': 'Pieces in a mill can only be taken when no other piece is available. A mill also protects.',
  'tp.block': 'In the moving phase, blocking all of the opponent\'s pieces wins. Look at the empty points around their pieces.',
  'tp.open': 'Opening a mill and closing it again removes a piece each time — but for one move the opened piece can be taken.',
  'tp.draw': 'Nine Men\'s Morris has been solved: with perfect play from both sides it is a draw (R. Gasser). Games are won by catching the opponent\'s mistakes.',
  'tp.winning': 'You are ahead. No need to force things: block the opponent\'s threats every move and stay safe.',
  'tp.losing': 'You are behind. Normal moves won\'t close the gap — make double threats and play moves where the opponent can go wrong.',
  'tp.matUp': 'You have {n} more piece(s). When the opponent is down to three they can fly — watch for double threats from then on.',
  'tp.matDown': 'You have {n} fewer piece(s). Win them back with a mill, or look for a way to block the opponent in.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack with threats or defend by blocking), then pick the move.',
  'tp.sharp': 'The best move is much better than the second. Finding it may decide the game.',
  gl: {
    mill: { m: ['mill'], t: 'Mill', d: 'Three of your pieces in a row on one line. Each new mill removes one of the opponent\'s pieces.' },
    zw: { m: ['double mill'], t: 'Double mill', d: 'A shape where one piece shuttling back and forth closes a mill on every move — very strong.' },
    junc: { m: ['junction'], t: 'Junction', d: 'A point connected to four others (d6, b4, f4, d2): two mill lines run through it and it is the most mobile.' },
    corner: { m: ['corner'], t: 'Corner', d: 'A corner point (a7, g7, a1, g1 …): only two neighbours, hard to move from.' },
    thr: { m: ['threat'], t: 'Threat', d: 'A line with two of your pieces and the third point empty — a mill can be closed next move (an open mill).' },
    block: { m: ['block'], t: 'Block', d: 'Putting a piece on the empty point of an enemy threat — the basic defence against a mill.' },
    fly: { m: ['fly'], t: 'Flying', d: 'A player with three pieces may move a piece to any empty point, not only to a neighbouring one.' },
    gasser: { m: ['solved'], t: 'Solved', d: 'Every position was checked by computer to find the perfect result: Ralph Gasser showed in the 1990s that the game is a draw.' },
    center: { m: ['Centre mill'], t: 'Centre mill', d: 'The first player aims for an early mill on the middle square; the second player usually answers by taking junctions with the first two pieces.' },
  },
},
};
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  const l = L(); let x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gl = h => window.CoachKit ? CoachKit.gloss(h, (TX[L()] || TX.en).gl || TX.en.gl) : h;
const nm = i => G.names[i];
const bd = s => '<bdi>' + esc(s) + '</bdi>';

// --------------------------------------------------------------------------------------------- position facts
const millsOf = (pos, p) => G.mills.filter(m => m.every(i => pos.b[i] === p));
// one piece shuttling between two mills: a piece in a closed mill that closes another mill on a neighbouring empty point
function zwick(pos, p) {
  const out = [];
  for (const ml of millsOf(pos, p)) for (const x of ml) for (const y of G.adj[x]) if (!pos.b[y] && pos.closes(p, x, y)) out.push([x, y]);
  return out;
}
function mobility(pos, p) {   // distinct (from, to) moves of p if p were to move now (placement: free points)
  if (pos.hand[p] > 0) return 99;
  const fly = pos.flying(p); let n = 0;
  for (let f = 0; f < G.n; f++) if (pos.b[f] === p) { if (fly) { n = 99; break; } for (const t of G.adj[f]) if (!pos.b[t]) n++; }
  return n;
}
const deg = i => G.adj[i].length;
function facts(pos, n) {
  const p = pos.side, o = 3 - p, f = { p, o, n };
  f.phase = pos.hand[p] > 0 ? 'place' : pos.flying(p) ? 'fly' : 'move';
  f.placing = pos.placing();
  f.mills = pos.moves().filter(m => mRm(m) !== NONE);
  f.millTo = [...new Set(f.mills.map(m => mFrom(m) === NONE ? nm(mTo(m)) : nm(mFrom(m)) + '→' + nm(mTo(m))))];
  f.myThr = threatPoints(pos, p); f.oppThr = threatPoints(pos, o);
  f.myZw = zwick(pos, p); f.oppZw = zwick(pos, o);
  f.myMob = mobility(pos, p); f.oppMob = mobility(pos, o);
  f.myN = pos.cnt[p] + pos.hand[p]; f.oppN = pos.cnt[o] + pos.hand[o];
  f.myMills = millsOf(pos, p).length; f.oppMills = millsOf(pos, o).length;
  f.oppFly = !pos.hand[o] && pos.flying(o);
  f.lastPlace = pos.hand[p] === 1 && pos.hand[o] === 0;
  f.freeJunc = G.n === 24 && !G.diag ? [4, 10, 13, 19].filter(i => !pos.b[i]) : [];
  return f;
}
// the plan of a candidate move, with what to say about it
function classify(pos, m, f) {
  const p = pos.side, o = 3 - p, fr = mFrom(m), to = mTo(m), r = mRm(m);
  const fly = fr !== NONE && pos.flying(p);
  const k = { fr, to, r, fly };
  if (r !== NONE) return Object.assign(k, { k: 'mill' });
  if (f.oppThr.includes(to)) return Object.assign(k, { k: 'block' });
  const q = pos.clone(); q.play(m);
  if (fr !== NONE && !fly && pos.inMill(fr) && q.closes(p, to, fr)) return Object.assign(k, { k: 'open' });
  const thr = threatPoints(q, p).filter(x => !f.myThr.includes(x)).length + f.myThr.filter(x => x !== to).length;
  if (thr >= 2 && thr > f.myThr.length) return Object.assign(k, { k: 'double' });
  if (thr > f.myThr.length) return Object.assign(k, { k: 'threat' });
  if (!q.placing() && f.oppMob < 99) { const a = mobility(q, o); if (a <= 2 || a <= f.oppMob - 2) return Object.assign(k, { k: 'trap' }); }
  if (fly) return Object.assign(k, { k: 'fly' });
  if (fr === NONE) return Object.assign(k, { k: deg(to) === 4 && !G.diag ? 'junc' : 'place' });
  return Object.assign(k, { k: 'move' });
}
const CCLS = { mill: 'c-mat', double: 'c-atk', threat: 'c-atk', open: 'c-atk', trap: 'c-atk', block: 'c-def', junc: 'c-dev', place: 'c-calm', move: 'c-calm', fly: 'c-dev' };
const RCLS = { block: 'r-def' };
function ttl(k) {
  const a = tx(k.fr === NONE ? 'tt.place' : k.fly ? 'tt.fly' : 'tt.move', { to: nm(k.to), from: k.fr !== NONE ? nm(k.fr) : '' });
  return k.r !== NONE ? tx('tt.take', { a, r: nm(k.r) }) : a;
}
const xTxt = k => tx('x.' + k.k, { r: k.r !== NONE ? nm(k.r) : '', to: nm(k.to) });
const wrOf = v => (1 + sOfV(v)) / 2;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }

// --------------------------------------------------------------------------------------------- symmetry (the 16 symmetries of the board)
// square symmetries (8) × swapping the inner and outer squares (2), as maps on point indices
let SYM = null, SYMG = null;
function syms() {
  if (SYM && SYMG === G) return SYM;
  SYMG = G; SYM = [];
  const c = (G.size - 1) / 2, at = {}; G.pts.forEach(([x, y], i) => (at[x + ',' + y] = i));
  const R = Math.round(c);
  for (let s = 0; s < 16; s++) {
    const map = [];
    for (let i = 0; i < G.n; i++) {
      let dx = G.pts[i][0] - c, dy = G.pts[i][1] - c;
      if (s & 8) { const r = Math.max(Math.abs(dx), Math.abs(dy)); if (G.size === 7 && r) { dx = dx / r * (4 - r); dy = dy / r * (4 - r); } }
      if (s & 1) dx = -dx; if (s & 2) dy = -dy; if (s & 4) [dx, dy] = [dy, dx];
      const j = at[(dx + c) + ',' + (dy + c)]; map.push(j === undefined ? -1 : j);
    }
    if (map.every(j => j >= 0)) SYM.push(map);
  }
  return SYM;
}
const mapMove = (T, m) => { const f = mFrom(m), t = mTo(m), r = mRm(m); return (f === NONE ? NONE : T[f]) | (T[t] << 5) | ((r === NONE ? NONE : T[r]) << 10); };
const inv = T => { const a = []; T.forEach((j, i) => (a[j] = i)); return a; };
const plainStart = () => gv === 'nine' && !startSpec;
const IDX = n => G.index[n];
// first placement / reply: the main plans (canonical points; mapped onto the actual game by symmetry)
function openingOf() {
  if (!plainStart() || cur > 1) return null;
  const pl = n => NONE | (IDX(n) << 5) | (NONE << 10);
  let list, head;
  if (cur === 0) { head = 'opH'; list = [['main', 'junc', 'd6'], ['main', 'side', 'd7'], ['alt', 'corner', 'a7']].map(([kind, key, n]) => ({ kind, key, m: pl(n) })); }
  else {
    const first = moves[0], T = syms().find(T => ['d6', 'd7', 'a7'].includes(nm(T[mTo(first)])));
    if (!T) return null;
    const c = nm(T[mTo(first)]), Ti = inv(T);
    const R = { d6: [['main', 'jj', 'b4'], ['main', 'jl', 'd7'], ['alt', 'jc', 'a7']], d7: [['main', 'sd', 'd6'], ['main', 'sl', 'd5'], ['alt', 'sc', 'a7']], a7: [['main', 'cs', 'g4'], ['main', 'cs2', 'd1'], ['alt', 'cj', 'd6']] }[c];
    head = 'opH2';
    list = R.map(([kind, key, n]) => ({ kind, key, m: mapMove(Ti, pl(n)) }));
  }
  return { head, list: list.map(d => Object.assign(d, { u: d.m, p: nm(mTo(d.m)) })) };
}
// this site's opening lines (openings.json): the game so far follows a line (under a symmetry) → its next move
function bookOf(upto) {
  if (!plainStart() || typeof OPEN === 'undefined' || !OPEN || !OPEN.sets || upto < 1) return null;
  const out = [];
  for (const g of OPEN.sets) {
    const line = g.study && g.study.line; if (!line || line.length <= upto) continue;
    for (const T of syms()) {
      let ok = true; for (let i = 0; i < upto && ok; i++) ok = mapMove(T, moves[i]) === line[i];
      if (!ok) continue;
      const m = mapMove(inv(T), line[upto]);
      if (!out.some(x => x.m === m)) out.push({ m, g, id: T.every((j, i) => j === i), note: g.study.notes && g.study.notes[upto] });
      break;
    }
  }
  return out.length ? out : null;
}
// the opening moves the coach teaches at ply i (book or the first two placements): never graded as mistakes
function bookMovesAt(i) {
  if (!plainStart()) return [];
  if (i <= 1) {
    if (i === 0) return null;   // first placement: every junction / side point is standard
    const T = syms().find(T => ['d6', 'd7', 'a7'].includes(nm(T[mTo(moves[0])])));
    if (!T) return [];
    const pl = n => NONE | (IDX(n) << 5) | (NONE << 10), c = nm(T[mTo(moves[0])]);
    return ({ d6: ['b4', 'd7'], d7: ['d6', 'd5'], a7: ['g4', 'd1'] }[c] || []).map(n => mapMove(inv(T), pl(n))).concat((bookOf(1) || []).map(b => b.m));
  }
  return (bookOf(i) || []).map(b => b.m);
}

// --------------------------------------------------------------------------------------------- state
const S = { open: false, reveal: false, hov: null, lists: new Map(), key: '', f: null, cls: null, marks: null };
let card = null;
function usable() {
  return !!(card && !lesson && !puzzle && !rgame && (settings.mode === 'ai' || settings.mode === 'pvp') && !(typeof rbCons === 'function' && rbCons()));
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !statusAt(cur).over && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(key) { return S.lists.get(key) || (typeof anaCache !== 'undefined' ? anaCache.get(key) : null) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.cls = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = null; }
  return S.f;
}
function candInfo(list, f) {
  if (!list || !list.length || !f) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const pos = posAt(cur).pos.clone();
  const sorted = list.slice().sort((a, b) => b.v - a.v), best = sorted[0].v, wb = wrOf(best);
  const items = [];
  for (const e of sorted.slice(0, 12)) {
    let k; try { k = classify(pos, e.m, f); } catch (er) { continue; }
    items.push({ m: e.m, v: e.v, k, drop: Math.max(0, wb - wrOf(e.v)) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k)) continue; if (it.drop > 0.3 && dirs.length >= 2) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const d2 = items.length > 1 ? items[1].drop : null;
  const r = { list, items, dirs, best: items[0], branch: dirs.filter(d => d.drop <= 0.05).length >= 2 && best < WINT, sharp: d2 != null && d2 >= 0.12 && best < WINT, only: d2 != null && d2 >= 0.25 };
  S.cls = r; return r;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const pts = a => a.map(nm).join(tx('sep'));
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.mills.length) { add('tp.mill', 100, { to: f.millTo.slice(0, 3).join(tx('sep')) }, 1); add('tp.take', 60); }
  if (f.oppZw.length) add('tp.oppZw', 97, { x: pts([...new Set(f.oppZw.map(z => z[0]))]) }, 1);
  if (f.oppThr.length >= 2) add('tp.oppThr2', 95, { n: f.oppThr.length, x: pts(f.oppThr) }, 1);
  else if (f.oppThr.length) add('tp.oppThr', 94, { x: pts(f.oppThr) }, 1);
  if (f.myZw.length) add('tp.myZw', 90, { x: pts([...new Set(f.myZw.map(z => z[0]))]) });
  if (cl && cl.dirs.some(d => d.k.k === 'double')) add('tp.double', 82);
  if (f.phase === 'move' && f.myMob <= 3) add('tp.mob', 86, { n: f.myMob }, f.myMob <= 1);
  if (!f.placing && f.oppMob <= 3 && !f.oppFly) add('tp.oppMob', 80, { n: f.oppMob });
  if (f.phase === 'fly') add('tp.fly', 78);
  if (f.oppFly) add('tp.oppFly', 76);
  if (f.lastPlace) add('tp.last', 66);
  if (f.phase === 'place' && f.n < 8 && f.freeJunc.length) add('tp.junc', 58);
  if (f.phase === 'place' && f.n < 10) add('tp.spread', 50);
  if (f.phase === 'place') add('tp.multi', 30);
  if (f.myMills) add('tp.inMill', 26);
  if (!f.placing) { add('tp.block', 34); if (f.myMills) add('tp.open', 32); }
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  const dm = f.myN - f.oppN; if (Math.abs(dm) >= 1 && !f.placing) add(dm > 0 ? 'tp.matUp' : 'tp.matDown', 40, { n: Math.abs(dm) });
  if (cl && cl.branch) add('tp.branch', 56);
  if (cl && cl.sharp) add('tp.sharp', 55);
  if (plainStart() && f.n < 4) add('tp.draw', 20);
  return out.sort((a, b) => b.pr - a.pr);
}
// opening type (nine men's morris from the normal start): by the first placement (+ the reply); 中段のミル while gold builds on the middle square
const MID = ['b6-d6-f6', 'b2-d2-f2', 'b6-b4-b2', 'f6-f4-f2'];
function typeOf() {
  if (!plainStart() || moves.length < 1 || cur < 1) return null;
  const pos = posAt(cur).pos, placing = pos.placing();
  const kindOf = i => deg(i) === 4 ? 'junc' : deg(i) === 3 ? 'side' : 'corner';
  let n = tx('ty.' + kindOf(mTo(moves[0])));
  if (placing && MID.some(s => { const l = s.split('-').map(IDX); return l.filter(i => pos.b[i] === P1).length === 2 && l.some(i => !pos.b[i]); })) n = tx('ty.center');
  else if (cur >= 2) n = tx('ty.vs', { a: n, b: tx('rt.' + kindOf(mTo(moves[1]))) });
  return { n, settled: !placing };
}
function fmTxt(f, me) {
  const a = [];
  const ml = me ? f.myMills : f.oppMills, th = me ? f.myThr.length : f.oppThr.length, zw = me ? f.myZw.length : f.oppZw.length, mob = me ? f.myMob : f.oppMob;
  if (zw) a.push(tx('fmZw')); else if (ml) a.push(tx('fmMill', { n: ml }));
  if (th) a.push(tx('fmThr', { n: th }));
  if (!f.placing && mob < 99) a.push(tx('fmMob', { n: mob }));
  return a.length ? a.join(tx('sep')) : tx('fmNone');
}

// --------------------------------------------------------------------------------------------- verdict on the player's previous move
function verdictHtml() {
  const n = moves.length; if (!n) return '';
  let i = n - 1;
  if (settings.mode === 'ai') { while (i >= 0 && toMoveAt(i) !== humanColor) i--; if (i < 0 || n - 1 - i > 1) return ''; }
  const L = listAt(keyOf(i)); if (!L || !L.length) return '';
  const m = moves[i], mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let g = (best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT) || loss >= 0.3 ? 3 : loss >= 0.12 ? 2 : mine.v >= best.v - 10 ? 0 : 1;
  const title = esc(tx('prev', { m: mvName(m), q: tx('q.' + g) }));
  const bk = bookMovesAt(i);
  if (bk === null || (bk.length && bk.includes(m))) { if (g >= 2 || bk === null) return CoachKit.verdict(g >= 1 ? 1 : 0, esc(tx('prev', { m: mvName(m), q: tx('q.' + (g >= 1 ? 1 : 0)) })), esc(tx(bk === null ? 'prevOpen' : 'prevBook'))); }
  let body = '';
  try {
    const pos = posAt(i).pos.clone(), f = facts(pos, i);
    if (best.m !== m) { const k = classify(pos, best.m, f); body = esc(tx(g <= 1 ? 'prevAltOk' : 'prevAlt', { m: mvName(best.m), c: tx('c.' + k.k) })); }
    else { const k = classify(pos, m, f); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
    if (g >= 2 && typeof crExplain === 'function') {
      const x = crExplain(i, { q: g === 3 ? 'bad' : 'dubious', ok: false, desc: '', best: best.m, m, loss });
      if (x && x.kind && x.kind !== 'gen') body += '<br>' + x.txt + '<br>' + t('cr.tip.' + x.kind);
    }
  } catch (e) {}
  return CoachKit.verdict(g, title, gl(body));
}

// --------------------------------------------------------------------------------------------- render
function render() {
  if (!card) return;
  if (MorrisCoach.sw) MorrisCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach tab
  // shows the review instead (#reviewCard, data-itc="coach"); before the review exists, a short note with a button to start it
  const rvc = document.getElementById('reviewCard'), rv = !!(rvc && rvc.classList.contains('show')) && usable();
  const over = statusAt(moves.length).over, playing = !over && cur === moves.length && !reviewing;
  const can = usable() && (playing || (over && !rv)), on = can && !!settings.coach;
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  S.marks = null;
  if (!can) return;
  if (over) {
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`);
  const st = statusAt(cur), f0 = !st.over ? factsNow() : null;
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${f0 ? `<small>${esc(tx('st.' + f0.phase))}</small>` : ''}</h3>`;
  S.marks = null;
  if (st.over) { h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (cur !== moves.length || reviewing) { h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const f = f0; if (!f) return put(h);
  const list = listAt(keyOf(cur)), cl = candInfo(list, f);
  const bestV = cl ? cl.best.v : null, wr = bestV != null ? wrOf(bestV) : null;
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr))), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  chips.push({ k: tx('mat'), v: esc(tx('matV', { a: f.myN, b: f.oppN })), cls: f.myN > f.oppN ? 'pos' : f.myN < f.oppN ? 'neg' : '' });
  const ty = typeOf(); if (ty) chips.push({ k: tx('type'), v: esc(tx(ty.settled ? 'fixed' : 'moyo', { n: ty.n })) });
  if (cur >= 2) {
    chips.push({ k: tx('who', { w: tx('meC') }), v: esc(fmTxt(f, true)), cls: f.myZw.length || f.myMills ? 'pos' : '' });
    chips.push({ k: tx('who', { w: tx('opC') }), v: esc(fmTxt(f, false)), cls: f.oppZw.length || f.oppThr.length ? 'neg' : '' });
  }
  h += CoachKit.summary(chips);
  const op = openingOf();
  if (op) {
    S.marks = op.list.map(d => d.u);
    h += CoachKit.branches({
      head: tx(op.head), intro: esc(tx('opIntro')), reveal: true,
      items: op.list.map(d => { return { tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + d.key + '.t', { p: d.p })), text: gl(esc(tx('op.' + d.key + '.x'))), move: String(d.u), mvName: mvName(d.u) }; }),
    });
  }
  const bk = !op && f.placing ? bookOf(cur) : null;
  if (bk) {
    S.marks = bk.map(b => b.m);
    const pos = posAt(cur).pos.clone(), b0 = bk[0];
    let k0 = { k: 'place' }; try { k0 = classify(pos, b0.m, f); } catch (e) {}
    h += CoachKit.rec(tx('b.' + k0.k), gl(esc(tx('bkWhy', { n: (b0.g.title && (b0.g.title[LANG] || b0.g.title.en)) || '', m: mvName(b0.m) })) + (b0.id && b0.note ? ' ' + esc(b0.note[LANG] || b0.note.en || '') : '')), RCLS[k0.k] || '');
    h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
      items: bk.map(b => { let k = { k: 'place', fr: mFrom(b.m), to: mTo(b.m), r: mRm(b.m) }; try { k = classify(pos, b.m, f); } catch (e) {} return { tag: tx('bk.tag'), cls: CCLS[k.k] || 'c-mat', title: esc(ttl(k)), text: gl(esc(xTxt(k))), gap: tx('bk.gap'), gcls: 'g0', move: String(b.m), mvName: mvName(b.m) }; }) });
  }
  if (!op && !bk && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wrOf(b.v))) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp')); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    if (S.reveal) S.marks = cl.dirs.map(d => d.m);
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(xTxt(d.k))), gap: tx(g[0]), gcls: g[1], move: String(d.m), mvName: mvName(d.m) }; }),
    });
  } else if (!op && !bk) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, op || bk ? null : cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  if (S.hov != null && !card.querySelector(`.ck-bi[data-mv="${S.hov}"]`)) { S.hov = null; redraw(); }
  if (S.hov != null) { const b = card.querySelector(`.ck-bi[data-mv="${S.hov}"]`); if (b) b.classList.add('hov'); }
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} render(); redraw(); },
    onHover: u => { S.hov = u == null ? null : +u; redraw(); },
  });
}
function redraw() { try { renderFx(); } catch (e) {} }
// board marks: the hovered candidate (arrow / ring + the piece it takes)
function fx(svg) {
  if (S.hov == null || !active() || !myTurn() || sel) return;
  if (!posAt(cur).pos.moves().includes(S.hov)) return;
  const m = S.hov, f = mFrom(m), to = mTo(m), r = mRm(m);
  if (f !== NONE) svgArrow(svg, f, to, 'ck'); else fxDiv('mark ck', to);
  if (r !== NONE) fxDiv('mark ng', r);
}
function cands(key, list) {
  if (!list || !list.length) return;
  S.lists.set(key, list);
  if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value);
  if (key === keyOf(cur)) render();
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  if (settings.coach === undefined) settings.coach = true;
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  MorrisCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hov = null; redraw();
  render();
  if (v && !listAt(keyOf(cur)) && typeof analyzeCurrent === 'function' && typeof busyToken !== 'undefined') analyzeCurrent(busyToken);
}
function relabel() { if (MorrisCoach.sw) MorrisCoach.sw.sync(); S.key = ''; if (card) card.dataset.h = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.MorrisCoach = { init, render, relabel, merge, tx, TX, active, cands, fx, usable };
})();
