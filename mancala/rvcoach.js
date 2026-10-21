/* Luxe Mancala — 振り返り解説 (coach commentary for the post-game review).
   Uses the review's search results (rv.list: the value of every pit for the side to move, exact when solved) and
   features computed from the position with the engine: extra turns (last seed in your own store), captures and their
   size (Normal keeps the capturing seed in the pit, Kalah / Sunka take it too), relay sowing (Sunka), seeds left open
   to a capture and captures defended, extra turns handed to the opponent, seeds given away, hoarding in the pit next
   to the store, a nearly empty side and the end-of-game sweep (the seeds left on each side go to that side's owner),
   endgame counting toward the winning total, and the best alternative with the reason it is better.
   Every sentence is a template filled from these criteria (10 languages). Loaded before app.js; mcCoach() is called
   from renderReview(). */
const MC_TEXT = {
ja: {
  title: '振り返り解説', move: '{n}手目（{who}）穴{m}', same: '最善手です。', eq: '最善と同じ結果になる手です。',
  res: '読み：この手の前は「{a}」、この手の後は「{b}」。', oWin: '{n}粒差で勝ち', oLoss: '{n}粒差で負け', oDraw: '引き分け', oAdv: '約{n}粒有利', oDis: '約{n}粒不利', oEven: '互角',
  extra: '最後の1粒が自分のストアに入り、もう一回指せました。', extraTurn: 'この手番の連続手で合計 +{n} をストアに入れました。',
  cap: '最後の1粒が自分の空の穴に止まり、向かいの{n}粒を横取りしました（+{g}）。', capKeep: 'ノーマルルールでは、止まった1粒は穴に残ります。',
  relay: 'リレーまきが{n}回続き、最後は穴{x}で止まりました。',
  end: 'この手で片側が空になり対局終了。盤に残った種はそれぞれの側の持ち主へ：{p0} +{a}、{p1} +{b}。',
  oppExtra: '相手の穴{x}がストアにぴったりの数になり、相手に「もう一回」を与えました。',
  give: 'まいた種のうち{n}粒が相手の側に入りました。相手の種が増えると、終盤の残り種も相手のものになります。',
  threat: '相手は次に穴{x}から、{me}の穴{y}の{n}粒を横取りできます。', still: '狙われていた穴{y}の{n}粒は、まだ守れていません。',
  defend: '相手が狙っていた穴{y}の{n}粒の横取りを防ぎました。', capThreat: '次は穴{x}で、相手の{n}粒を横取りする狙いがあります。',
  hoard: '右端の穴（ストアの隣）に{n}粒をためています。最後まで持てば自分の得点になりますが、大きな山は横取りの的にもなります。',
  starve: '相手の側は残り{n}粒です。相手の種が尽きると対局が終わり、自分の側の{m}粒はすべて自分のものになります。',
  low: '自分の側は残り{n}粒です。自分の側が空になると対局が終わり、相手の側の{m}粒は相手のものになります。',
  count: '盤上の残りは{n}粒。勝つにはストアに{w}粒必要で、{who}はあと{x}粒です。', clinch: '{who}はすでに{w}粒以上で、勝ちが確定しています。',
  best: '最善は穴{b}（{o}）でした。', bExtra: '穴{b}はぴったりでストアに入り、もう一回指せる手です。', bChain: '穴{b}から始めると、連続手でこの手番に +{n} をストアに入れられました。',
  bCap: '穴{b}なら{n}粒を横取りできました。', bDef: '穴{b}なら相手の横取り（{n}粒）を防げました。', bSafe: '穴{b}なら相手に大きな横取り（{n}粒）を許しません。',
  bEnd: '穴{b}で対局を終わらせれば、そのまま勝ちでした。', bKeep: '穴{b}は相手の側に種を渡さない手です。', bNoExtra: '穴{b}なら相手に「もう一回」を与えません。',
  oppGain: 'この手の後、相手は次の手番で最大 +{n} をストアに入れられます（{how}）。', hExtra: 'もう一回', hCap: '横取り', bOpp: '穴{b}なら、相手の次の手番の得は最大 +{n} に抑えられました。', bSide: '穴{b}は自分の側に種を多く残す手です（{a}粒 → {b2}粒）。', bDeep: '穴{b}の良さは数手先まで読むと分かります。盤の数字で比べてみましょう。', only: 'ほかに指せる手のない一手です。', tOpp: '自分の手の後に、相手が次の手番でどれだけ得をするかも確かめましょう。',
  reply: '相手には穴{x}からの応手があります（{how}、この手番で +{n}）。',
  hWin: '{who}の勝ち（{a}–{b}）', hDraw: '引き分け（{a}–{b}）', hNow: '{a}–{b}（対局途中）', head: '{res}。分かれ目は{n}手目 穴{m}（{who}）。', headClean: '{res}。勝敗を変える悪手はありませんでした。', chip: '{n}手目 穴{m}（{who}）−{l}',
  tExtra: '手を選ぶ前に、ストアにぴったり届く穴（もう一回）を探しましょう。ストアに近い穴から使うと連続しやすくなります。',
  tCap: '自分の側の空の穴に最後の1粒を止められる手を探しましょう。向かいの山がまるごと取れます。',
  tDef: '指す前に、相手が次に横取りできる山がないか確認しましょう。山を動かす・空の穴を埋める・相手の止まる位置をずらす、の3つで守れます。',
  tGive: '相手に種を渡しすぎると、相手の選択肢と終盤の残り種が増えます。種を自分の側にとどめる手も考えましょう。',
  tCount: '終盤は残りの種を数えましょう。片側が空になると、残りの種はそれぞれの側の持ち主のものです。',
  tRelay: 'スンカはリレーまきで結果が大きく変わります。最後に止まる穴まで、まき直しを一つずつ追いかけましょう。',
  tEasy: 'かんたんルールには横取りがありません。もう一回と、終局時に自分の側に残る種が勝負を決めます。',
  tGen: '盤の数字（各穴を選んだときの最終差の読み）を比べてみましょう。',
  sumTurn: '分かれ目：{n}手目 穴{m}（{who}）で「{a}」→「{b}」。', show: '盤で見る', clean: '勝敗を変える悪手はありませんでした。',
  sumStats: '{who}：もう一回 {e}回、横取り {c}回（{s}粒）。', sumEnd: '終局時に盤に残った種：{p0} +{a}、{p1} +{b}。', sumBig: '一番大きな横取り：{n}手目 穴{m}（{who}）で +{g}。',
  pick: '手を選ぶと、その手の解説がここに出ます。', coord: '穴の番号は、それぞれの側で左から（ストアから遠い順に）1〜6。'
},
en: {
  title: 'Coach review', move: 'Move {n} ({who}) pit {m}', same: 'The best move.', eq: 'Gives the same result as the best move.',
  res: 'Search: before this move "{a}", after it "{b}".', oWin: 'win by {n}', oLoss: 'loss by {n}', oDraw: 'draw', oAdv: 'about +{n}', oDis: 'about −{n}', oEven: 'even',
  extra: 'The last seed landed in your own store: an extra turn.', extraTurn: 'The chain of extra turns put +{n} in the store this turn.',
  cap: 'The last seed stopped in an empty pit on your side and captured the {n} seeds opposite (+{g}).', capKeep: 'Under Normal rules the capturing seed stays in its pit.',
  relay: 'Relay sowing restarted {n}× and finally stopped in pit {x}.',
  end: 'One side is now empty, so the game is over. The seeds left on each side go to that side\'s owner: {p0} +{a}, {p1} +{b}.',
  oppExtra: 'Opponent\'s pit {x} now holds exactly enough to reach their store: you handed them an extra turn.',
  give: '{n} of the sown seeds went to the opponent\'s side. More seeds there also means more seeds for them at the end.',
  threat: 'Next move the opponent can capture the {n} seeds in {me}\'s pit {y} by playing pit {x}.', still: 'The {n} seeds in pit {y} are still under attack.',
  defend: 'Stops the opponent\'s threatened capture of the {n} seeds in pit {y}.', capThreat: 'It sets up a capture of {n} seeds with pit {x} next.',
  hoard: '{n} seeds are piled in the rightmost pit (next to the store). Kept to the end they count for you, but a big pile is also a capture target.',
  starve: 'Only {n} seeds are left on the opponent\'s side. When they run out the game ends and the {m} seeds on your side are all yours.',
  low: 'Only {n} seeds are left on your side. If it empties the game ends and the {m} seeds on the opponent\'s side go to them.',
  count: '{n} seeds are left on the board. Winning needs {w} in the store; {who} needs {x} more.', clinch: '{who} already has {w} or more: the win is certain.',
  best: 'Best was pit {b} ({o}).', bExtra: 'Pit {b} reaches the store exactly for an extra turn.', bChain: 'Starting with pit {b}, a chain of extra turns would have stored +{n} this turn.',
  bCap: 'Pit {b} would have captured {n} seeds.', bDef: 'Pit {b} would have stopped the opponent\'s capture ({n} seeds).', bSafe: 'Pit {b} does not allow a big capture ({n} seeds).',
  bEnd: 'Ending the game with pit {b} would have won on the spot.', bKeep: 'Pit {b} gives no seeds to the opponent.', bNoExtra: 'Pit {b} does not hand the opponent an extra turn.',
  oppGain: 'After this move the opponent can store up to +{n} on their next turn ({how}).', hExtra: 'extra turn', hCap: 'capture', bOpp: 'With pit {b} the opponent\'s next turn would gain at most +{n}.', bSide: 'Pit {b} keeps more seeds on your side ({a} → {b2}).', bDeep: 'Why pit {b} is better shows a few moves deeper. Compare the numbers on the board.', only: 'The only legal move.', tOpp: 'After choosing your move, check how much the opponent can gain on their next turn.',
  reply: 'The opponent can answer with pit {x} ({how}, +{n} that turn).',
  hWin: '{who} won ({a}–{b})', hDraw: 'Draw ({a}–{b})', hNow: '{a}–{b} (game in progress)', head: '{res}. The turning point: move {n}, pit {m} ({who}).', headClean: '{res}. No mistake changed the result.', chip: 'Move {n} pit {m} ({who}) −{l}',
  tExtra: 'Before choosing, look for a pit that reaches your store exactly (extra turn). Use the pits closest to the store first to chain them.',
  tCap: 'Look for a move whose last seed stops in an empty pit on your side: the whole pile opposite is yours.',
  tDef: 'Before moving, check which of your piles the opponent could capture next. Move the pile, fill the empty pit, or change where their seeds stop.',
  tGive: 'Giving away many seeds gives the opponent more options and more seeds at the end. Consider moves that keep seeds on your side.',
  tCount: 'In the endgame, count the seeds. When one side empties, the remaining seeds belong to the owner of each side.',
  tRelay: 'In Sunka relay sowing changes everything. Follow each re-sowing until the last seed stops.',
  tEasy: 'Easy rules have no captures: extra turns and the seeds left on your side at the end decide the game.',
  tGen: 'Compare the numbers on the board: each is the predicted final margin for that pit.',
  sumTurn: 'Turning point: move {n} pit {m} ({who}) went from "{a}" to "{b}".', show: 'Show', clean: 'No mistake changed the result.',
  sumStats: '{who}: {e} extra turns, {c} captures ({s} seeds).', sumEnd: 'Seeds left on the board at the end: {p0} +{a}, {p1} +{b}.', sumBig: 'Biggest capture: move {n} pit {m} ({who}) +{g}.',
  pick: 'Select a move to see its explanation here.', coord: 'Pits are numbered 1–6 on each side from the left (farthest from that side\'s store).'
},
zh: {
  title: '复盘讲解', move: '第{n}手（{who}）{m}号坑', same: '最佳着法。', eq: '与最佳着法结果相同。',
  res: '计算：这一手之前「{a}」，之后「{b}」。', oWin: '赢{n}颗', oLoss: '输{n}颗', oDraw: '和棋', oAdv: '约优{n}颗', oDis: '约劣{n}颗', oEven: '均势',
  extra: '最后一颗落入自己的仓，再走一次。', extraTurn: '这一回合连续再走，共收入仓 +{n}。',
  cap: '最后一颗停在己方空坑，吃掉对面的{n}颗（+{g}）。', capKeep: '普通规则下，停下的那一颗留在坑里。',
  relay: '接力播种连续{n}次，最后停在{x}号坑。',
  end: '一侧已空，对局结束。盘上剩余的种子归各自一侧的主人：{p0} +{a}，{p1} +{b}。',
  oppExtra: '对方的{x}号坑正好能落入其仓，等于送给对方「再走一次」。',
  give: '播出的种子有{n}颗进了对方一侧。对方种子越多，终局时归他的也越多。',
  threat: '对方下一手走{x}号坑，就能吃掉{me}{y}号坑的{n}颗。', still: '{y}号坑的{n}颗仍处在被吃的威胁下。',
  defend: '化解了对方对{y}号坑{n}颗的吃子威胁。', capThreat: '下一手可用{x}号坑吃掉对方{n}颗。',
  hoard: '最右边的坑（仓旁边）积了{n}颗。保持到终局就是自己的分，但大堆也是被吃的目标。',
  starve: '对方一侧只剩{n}颗。对方没子可走时对局结束，己方一侧的{m}颗全归自己。',
  low: '己方一侧只剩{n}颗。一旦走空对局结束，对方一侧的{m}颗归对方。',
  count: '盘上还剩{n}颗。获胜需要仓里有{w}颗，{who}还差{x}颗。', clinch: '{who}已有{w}颗以上，胜利已定。',
  best: '最佳是{b}号坑（{o}）。', bExtra: '{b}号坑正好落入仓，可再走一次。', bChain: '从{b}号坑开始连续再走，这一回合可入仓 +{n}。',
  bCap: '{b}号坑可以吃掉{n}颗。', bDef: '{b}号坑可以化解对方的吃子（{n}颗）。', bSafe: '{b}号坑不给对方大吃（{n}颗）的机会。',
  bEnd: '用{b}号坑结束对局即可直接获胜。', bKeep: '{b}号坑不把种子送给对方。', bNoExtra: '{b}号坑不给对方「再走一次」。',
  oppGain: '这一手之后，对方下一回合最多可入仓 +{n}（{how}）。', hExtra: '再走一次', hCap: '吃子', bOpp: '走{b}号坑的话，对方下一回合最多只能得 +{n}。', bSide: '{b}号坑能在己方保留更多种子（{a}颗 → {b2}颗）。', bDeep: '{b}号坑的好处要多读几步才看得出，请比较盘上的数字。', only: '唯一可走的一手。', tOpp: '选好自己的着法后，也要看看对方下一回合能得多少。',
  reply: '对方可以用{x}号坑应对（{how}，该回合 +{n}）。',
  hWin: '{who}获胜（{a}–{b}）', hDraw: '和棋（{a}–{b}）', hNow: '{a}–{b}（对局中）', head: '{res}。转折点：第{n}手{m}号坑（{who}）。', headClean: '{res}。没有改变胜负的坏棋。', chip: '第{n}手 {m}号坑（{who}）−{l}',
  tExtra: '选棋前先找正好落入仓的坑（再走一次）。从靠近仓的坑开始用，更容易连续。',
  tCap: '寻找最后一颗停在己方空坑的着法，对面整堆都归你。',
  tDef: '走之前先看对方下一手能吃你哪一堆。移走这堆、填上空坑、或改变对方停下的位置，都能防守。',
  tGive: '送给对方太多种子，会增加对方的选择和终局时的剩余种子。也考虑把种子留在己方的着法。',
  tCount: '残局要数清剩余种子。一侧走空时，剩下的种子归各自一侧的主人。',
  tRelay: 'Sunka 的接力播种会彻底改变结果。要一步步跟到最后一颗停下的位置。',
  tEasy: '简单规则没有吃子：再走一次和终局时留在己方的种子决定胜负。',
  tGen: '比较盘上的数字：那是选择每个坑时预测的最终差距。',
  sumTurn: '转折点：第{n}手{m}号坑（{who}）从「{a}」变为「{b}」。', show: '在棋盘上看', clean: '没有改变胜负的坏棋。',
  sumStats: '{who}：再走一次 {e}次，吃子 {c}次（{s}颗）。', sumEnd: '终局时盘上剩余：{p0} +{a}，{p1} +{b}。', sumBig: '最大的一次吃子：第{n}手{m}号坑（{who}）+{g}。',
  pick: '选择一手，这里会显示该手的讲解。', coord: '坑的编号：各自一侧从左起（离自己的仓最远处）为1〜6。'
},
ko: {
  title: '복기 해설', move: '{n}수째（{who}）{m}번 구멍', same: '최선수입니다.', eq: '최선수와 같은 결과가 되는 수입니다.',
  res: '수읽기: 이 수 전에는 「{a}」, 이 수 후에는 「{b}」.', oWin: '{n}개 차 승리', oLoss: '{n}개 차 패배', oDraw: '무승부', oAdv: '약 {n}개 유리', oDis: '약 {n}개 불리', oEven: '호각',
  extra: '마지막 한 알이 자기 창고에 들어가 한 번 더 둘 수 있었습니다.', extraTurn: '이번 차례의 연속 수로 창고에 모두 +{n}을 넣었습니다.',
  cap: '마지막 한 알이 자기 쪽 빈 구멍에 멈춰 맞은편의 {n}개를 가로챘습니다（+{g}）.', capKeep: '노멀 규칙에서는 멈춘 한 알이 구멍에 남습니다.',
  relay: '릴레이 뿌리기가 {n}번 이어지고 마지막에 {x}번 구멍에서 멈췄습니다.',
  end: '한쪽이 비어 대국이 끝났습니다. 판에 남은 씨앗은 각 쪽의 주인에게: {p0} +{a}, {p1} +{b}.',
  oppExtra: '상대의 {x}번 구멍이 창고에 딱 맞는 수가 되어 상대에게 「한 번 더」를 주었습니다.',
  give: '뿌린 씨앗 중 {n}개가 상대 쪽으로 들어갔습니다. 상대 쪽 씨앗이 많을수록 끝날 때 상대 몫도 늘어납니다.',
  threat: '상대는 다음에 {x}번 구멍으로 {me}의 {y}번 구멍 {n}개를 가로챌 수 있습니다.', still: '노려지던 {y}번 구멍의 {n}개가 아직 지켜지지 않았습니다.',
  defend: '상대가 노리던 {y}번 구멍 {n}개의 가로채기를 막았습니다.', capThreat: '다음에 {x}번 구멍으로 상대의 {n}개를 가로채는 노림이 있습니다.',
  hoard: '오른쪽 끝 구멍（창고 옆）에 {n}개를 모아 두었습니다. 끝까지 지키면 내 점수지만 큰 더미는 가로채기의 표적도 됩니다.',
  starve: '상대 쪽에는 {n}개만 남았습니다. 상대의 씨앗이 떨어지면 대국이 끝나고 내 쪽의 {m}개는 모두 내 것이 됩니다.',
  low: '내 쪽에는 {n}개만 남았습니다. 내 쪽이 비면 대국이 끝나고 상대 쪽의 {m}개는 상대 것이 됩니다.',
  count: '판에 남은 씨앗은 {n}개. 이기려면 창고에 {w}개가 필요하고 {who}는 {x}개 남았습니다.', clinch: '{who}는 이미 {w}개 이상으로 승리가 확정입니다.',
  best: '최선은 {b}번 구멍（{o}）이었습니다.', bExtra: '{b}번 구멍은 창고에 딱 맞게 들어가 한 번 더 둘 수 있는 수입니다.', bChain: '{b}번 구멍부터 시작하면 연속 수로 이번 차례에 +{n}을 넣을 수 있었습니다.',
  bCap: '{b}번 구멍이면 {n}개를 가로챌 수 있었습니다.', bDef: '{b}번 구멍이면 상대의 가로채기（{n}개）를 막을 수 있었습니다.', bSafe: '{b}번 구멍이면 상대에게 큰 가로채기（{n}개）를 허용하지 않습니다.',
  bEnd: '{b}번 구멍으로 대국을 끝내면 그대로 승리였습니다.', bKeep: '{b}번 구멍은 상대 쪽에 씨앗을 넘기지 않는 수입니다.', bNoExtra: '{b}번 구멍이면 상대에게 「한 번 더」를 주지 않습니다.',
  oppGain: '이 수 다음 상대는 다음 차례에 최대 +{n}을 창고에 넣을 수 있습니다（{how}）.', hExtra: '한 번 더', hCap: '가로채기', bOpp: '{b}번 구멍이면 상대의 다음 차례 이득은 최대 +{n}로 막을 수 있었습니다.', bSide: '{b}번 구멍은 내 쪽에 씨앗을 더 많이 남기는 수입니다（{a}개 → {b2}개）.', bDeep: '{b}번 구멍의 장점은 몇 수 앞까지 읽으면 보입니다. 판의 숫자로 비교해 보세요.', only: '둘 수 있는 수가 이것뿐입니다.', tOpp: '내 수를 고른 뒤에는 상대가 다음 차례에 얼마나 이득을 보는지도 확인하세요.',
  reply: '상대에게는 {x}번 구멍으로 받는 수가 있습니다（{how}, 그 차례에 +{n}）.',
  hWin: '{who} 승리（{a}–{b}）', hDraw: '무승부（{a}–{b}）', hNow: '{a}–{b}（대국 중）', head: '{res}. 갈림길은 {n}수째 {m}번 구멍（{who}）.', headClean: '{res}. 승패를 바꾼 악수는 없었습니다.', chip: '{n}수째 {m}번（{who}）−{l}',
  tExtra: '수를 고르기 전에 창고에 딱 닿는 구멍（한 번 더）을 찾으세요. 창고에 가까운 구멍부터 쓰면 연속하기 쉽습니다.',
  tCap: '마지막 한 알을 내 쪽 빈 구멍에 멈추게 하는 수를 찾으세요. 맞은편 더미를 통째로 가져옵니다.',
  tDef: '두기 전에 상대가 다음에 가로챌 수 있는 더미가 있는지 확인하세요. 더미를 옮기기·빈 구멍 채우기·상대가 멈출 위치 바꾸기로 막을 수 있습니다.',
  tGive: '상대에게 씨앗을 너무 많이 주면 상대의 선택지와 끝날 때 남는 씨앗이 늘어납니다. 씨앗을 내 쪽에 머물게 하는 수도 생각하세요.',
  tCount: '종반에는 남은 씨앗을 세어 보세요. 한쪽이 비면 남은 씨앗은 각 쪽 주인의 것입니다.',
  tRelay: '숭카는 릴레이 뿌리기로 결과가 크게 달라집니다. 마지막에 멈추는 구멍까지 하나씩 따라가 보세요.',
  tEasy: '쉬운 규칙에는 가로채기가 없습니다. 한 번 더와 끝날 때 내 쪽에 남는 씨앗이 승부를 가릅니다.',
  tGen: '판의 숫자（각 구멍을 골랐을 때의 최종 차 예측）를 비교해 보세요.',
  sumTurn: '갈림길: {n}수째 {m}번 구멍（{who}）에서 「{a}」→「{b}」.', show: '판에서 보기', clean: '승패를 바꾼 악수는 없었습니다.',
  sumStats: '{who}: 한 번 더 {e}회, 가로채기 {c}회（{s}개）.', sumEnd: '대국 종료 때 판에 남은 씨앗: {p0} +{a}, {p1} +{b}.', sumBig: '가장 큰 가로채기: {n}수째 {m}번 구멍（{who}）+{g}.',
  pick: '수를 고르면 그 수의 해설이 여기에 나옵니다.', coord: '구멍 번호는 각자 쪽에서 왼쪽부터（자기 창고에서 먼 순서로）1〜6.'
},
es: {
  title: 'Análisis comentado', move: 'Jugada {n} ({who}) hoyo {m}', same: 'La mejor jugada.', eq: 'Da el mismo resultado que la mejor jugada.',
  res: 'Cálculo: antes de esta jugada «{a}», después «{b}».', oWin: 'gana por {n}', oLoss: 'pierde por {n}', oDraw: 'tablas', oAdv: 'aprox. +{n}', oDis: 'aprox. −{n}', oEven: 'igualado',
  extra: 'La última semilla cayó en tu propio almacén: turno extra.', extraTurn: 'La cadena de turnos extra metió +{n} en el almacén este turno.',
  cap: 'La última semilla se detuvo en un hoyo vacío de tu lado y capturó las {n} semillas de enfrente (+{g}).', capKeep: 'Con las reglas Normal la semilla que captura se queda en su hoyo.',
  relay: 'La siembra en relevo siguió {n} veces y se detuvo en el hoyo {x}.',
  end: 'Un lado quedó vacío: fin de la partida. Las semillas de cada lado van a su dueño: {p0} +{a}, {p1} +{b}.',
  oppExtra: 'El hoyo {x} del rival tiene justo las semillas para llegar a su almacén: le diste un turno extra.',
  give: '{n} de las semillas sembradas pasaron al lado rival. Más semillas allí también son más semillas para él al final.',
  threat: 'En su próxima jugada el rival puede capturar las {n} semillas del hoyo {y} de {me} jugando el hoyo {x}.', still: 'Las {n} semillas del hoyo {y} siguen amenazadas.',
  defend: 'Evita la captura amenazada de las {n} semillas del hoyo {y}.', capThreat: 'Prepara capturar {n} semillas con el hoyo {x}.',
  hoard: 'Hay {n} semillas acumuladas en el hoyo de la derecha (junto al almacén). Si las guardas hasta el final cuentan para ti, pero un montón grande también es un blanco.',
  starve: 'Al rival solo le quedan {n} semillas. Cuando se le acaben, termina la partida y las {m} semillas de tu lado son tuyas.',
  low: 'Solo te quedan {n} semillas en tu lado. Si se vacía, termina la partida y las {m} del lado rival son para él.',
  count: 'Quedan {n} semillas en el tablero. Para ganar hacen falta {w} en el almacén; a {who} le faltan {x}.', clinch: '{who} ya tiene {w} o más: la victoria es segura.',
  best: 'Lo mejor era el hoyo {b} ({o}).', bExtra: 'El hoyo {b} llega justo al almacén: turno extra.', bChain: 'Empezando por el hoyo {b}, una cadena de turnos extra habría guardado +{n} este turno.',
  bCap: 'El hoyo {b} habría capturado {n} semillas.', bDef: 'El hoyo {b} habría evitado la captura rival ({n} semillas).', bSafe: 'El hoyo {b} no permite una gran captura ({n} semillas).',
  bEnd: 'Terminar la partida con el hoyo {b} ganaba en el acto.', bKeep: 'El hoyo {b} no le da semillas al rival.', bNoExtra: 'El hoyo {b} no le da un turno extra al rival.',
  oppGain: 'Tras esta jugada el rival puede guardar hasta +{n} en su próximo turno ({how}).', hExtra: 'turno extra', hCap: 'captura', bOpp: 'Con el hoyo {b} el próximo turno del rival ganaría como mucho +{n}.', bSide: 'El hoyo {b} deja más semillas en tu lado ({a} → {b2}).', bDeep: 'La ventaja del hoyo {b} se ve unas jugadas más adelante. Compara los números del tablero.', only: 'La única jugada legal.', tOpp: 'Después de elegir tu jugada, mira cuánto puede ganar el rival en su próximo turno.',
  reply: 'El rival puede responder con el hoyo {x} ({how}, +{n} en ese turno).',
  hWin: 'Gana {who} ({a}–{b})', hDraw: 'Tablas ({a}–{b})', hNow: '{a}–{b} (partida en curso)', head: '{res}. Momento clave: jugada {n}, hoyo {m} ({who}).', headClean: '{res}. Ningún error cambió el resultado.', chip: 'Jugada {n} hoyo {m} ({who}) −{l}',
  tExtra: 'Antes de elegir, busca un hoyo que llegue justo a tu almacén (turno extra). Usa primero los más cercanos al almacén para encadenarlos.',
  tCap: 'Busca una jugada cuya última semilla se detenga en un hoyo vacío de tu lado: el montón de enfrente es tuyo.',
  tDef: 'Antes de jugar, mira qué montón tuyo puede capturar el rival. Mueve el montón, llena el hoyo vacío o cambia dónde se detienen sus semillas.',
  tGive: 'Regalar muchas semillas da al rival más opciones y más semillas al final. Considera jugadas que las mantengan en tu lado.',
  tCount: 'En el final, cuenta las semillas. Cuando un lado se vacía, las semillas restantes son del dueño de cada lado.',
  tRelay: 'En Sunka la siembra en relevo lo cambia todo. Sigue cada resiembra hasta que la última semilla se detenga.',
  tEasy: 'Las reglas Fácil no tienen capturas: los turnos extra y las semillas que quedan en tu lado al final deciden.',
  tGen: 'Compara los números del tablero: cada uno es el margen final previsto para ese hoyo.',
  sumTurn: 'Momento clave: la jugada {n}, hoyo {m} ({who}), pasó de «{a}» a «{b}».', show: 'Ver', clean: 'Ningún error cambió el resultado.',
  sumStats: '{who}: {e} turnos extra, {c} capturas ({s} semillas).', sumEnd: 'Semillas en el tablero al final: {p0} +{a}, {p1} +{b}.', sumBig: 'Mayor captura: jugada {n}, hoyo {m} ({who}) +{g}.',
  pick: 'Elige una jugada para ver aquí su explicación.', coord: 'Los hoyos se numeran del 1 al 6 en cada lado desde la izquierda (el más lejano de su almacén).'
},
fr: {
  title: 'Analyse commentée', move: 'Coup {n} ({who}) trou {m}', same: 'Le meilleur coup.', eq: 'Même résultat que le meilleur coup.',
  res: 'Calcul : avant ce coup « {a} », après « {b} ».', oWin: 'gain de {n}', oLoss: 'perte de {n}', oDraw: 'nulle', oAdv: 'environ +{n}', oDis: 'environ −{n}', oEven: 'égalité',
  extra: 'La dernière graine est tombée dans votre grenier : vous rejouez.', extraTurn: 'La série de coups rejoués a rapporté +{n} au grenier ce tour-ci.',
  cap: 'La dernière graine s\'est arrêtée dans un trou vide de votre côté et a pris les {n} graines d\'en face (+{g}).', capKeep: 'En règle Normale, la graine qui capture reste dans son trou.',
  relay: 'Le semis en relais a continué {n} fois et s\'est arrêté au trou {x}.',
  end: 'Un côté est vide : la partie est finie. Les graines restantes vont au propriétaire de chaque côté : {p0} +{a}, {p1} +{b}.',
  oppExtra: 'Le trou {x} adverse contient juste de quoi atteindre son grenier : vous lui donnez un coup de plus.',
  give: '{n} des graines semées sont passées chez l\'adversaire. Plus de graines chez lui, c\'est aussi plus de graines pour lui à la fin.',
  threat: 'Au prochain coup, l\'adversaire peut prendre les {n} graines du trou {y} de {me} en jouant le trou {x}.', still: 'Les {n} graines du trou {y} sont toujours menacées.',
  defend: 'Pare la prise menacée des {n} graines du trou {y}.', capThreat: 'Prépare la prise de {n} graines avec le trou {x}.',
  hoard: '{n} graines sont accumulées dans le trou de droite (à côté du grenier). Gardées jusqu\'au bout elles comptent pour vous, mais un gros tas est aussi une cible.',
  starve: 'Il ne reste que {n} graines chez l\'adversaire. Quand il n\'en a plus, la partie s\'arrête et les {m} graines de votre côté sont à vous.',
  low: 'Il ne vous reste que {n} graines. Si votre côté se vide, la partie s\'arrête et les {m} graines adverses vont à l\'adversaire.',
  count: 'Il reste {n} graines sur le plateau. Pour gagner il en faut {w} au grenier ; il en manque {x} à {who}.', clinch: '{who} a déjà {w} graines ou plus : la victoire est acquise.',
  best: 'Le meilleur était le trou {b} ({o}).', bExtra: 'Le trou {b} atteint juste le grenier : on rejoue.', bChain: 'En commençant par le trou {b}, une série de coups rejoués aurait rapporté +{n} ce tour-ci.',
  bCap: 'Le trou {b} aurait pris {n} graines.', bDef: 'Le trou {b} aurait paré la prise adverse ({n} graines).', bSafe: 'Le trou {b} n\'autorise pas de grosse prise ({n} graines).',
  bEnd: 'Finir la partie avec le trou {b} gagnait aussitôt.', bKeep: 'Le trou {b} ne donne aucune graine à l\'adversaire.', bNoExtra: 'Le trou {b} ne donne pas de coup supplémentaire à l\'adversaire.',
  oppGain: 'Après ce coup, l\'adversaire peut engranger jusqu\'à +{n} à son prochain tour ({how}).', hExtra: 'coup rejoué', hCap: 'prise', bOpp: 'Avec le trou {b}, le prochain tour adverse rapporterait au plus +{n}.', bSide: 'Le trou {b} garde plus de graines de votre côté ({a} → {b2}).', bDeep: 'L\'avantage du trou {b} apparaît quelques coups plus loin. Comparez les nombres du plateau.', only: 'Le seul coup possible.', tOpp: 'Après avoir choisi votre coup, regardez combien l\'adversaire peut gagner à son prochain tour.',
  reply: 'L\'adversaire peut répondre par le trou {x} ({how}, +{n} sur ce tour).',
  hWin: 'Victoire de {who} ({a}–{b})', hDraw: 'Nulle ({a}–{b})', hNow: '{a}–{b} (partie en cours)', head: '{res}. Tournant : coup {n}, trou {m} ({who}).', headClean: '{res}. Aucune erreur n\'a changé le résultat.', chip: 'Coup {n} trou {m} ({who}) −{l}',
  tExtra: 'Avant de choisir, cherchez un trou qui atteint juste votre grenier (on rejoue). Jouez d\'abord les trous les plus proches du grenier pour enchaîner.',
  tCap: 'Cherchez un coup dont la dernière graine s\'arrête dans un trou vide de votre côté : le tas d\'en face est pour vous.',
  tDef: 'Avant de jouer, regardez quel tas l\'adversaire peut prendre. Déplacez-le, remplissez le trou vide ou changez l\'endroit où ses graines s\'arrêtent.',
  tGive: 'Donner beaucoup de graines offre à l\'adversaire plus de choix et plus de graines à la fin. Pensez aux coups qui les gardent chez vous.',
  tCount: 'En fin de partie, comptez les graines. Quand un côté se vide, les graines restantes reviennent au propriétaire de chaque côté.',
  tRelay: 'Au Sunka, le semis en relais change tout. Suivez chaque reprise jusqu\'à ce que la dernière graine s\'arrête.',
  tEasy: 'La règle Facile n\'a pas de prises : les coups rejoués et les graines restées de votre côté à la fin décident.',
  tGen: 'Comparez les nombres sur le plateau : chacun est l\'écart final prévu pour ce trou.',
  sumTurn: 'Tournant : le coup {n}, trou {m} ({who}), est passé de « {a} » à « {b} ».', show: 'Voir', clean: 'Aucune erreur n\'a changé le résultat.',
  sumStats: '{who} : {e} coups rejoués, {c} prises ({s} graines).', sumEnd: 'Graines restées sur le plateau à la fin : {p0} +{a}, {p1} +{b}.', sumBig: 'Plus grosse prise : coup {n}, trou {m} ({who}) +{g}.',
  pick: 'Choisissez un coup pour voir son explication ici.', coord: 'Les trous sont numérotés de 1 à 6 de chaque côté depuis la gauche (le plus loin de son grenier).'
},
pt: {
  title: 'Análise comentada', move: 'Lance {n} ({who}) cova {m}', same: 'O melhor lance.', eq: 'Dá o mesmo resultado que o melhor lance.',
  res: 'Cálculo: antes deste lance «{a}», depois «{b}».', oWin: 'vence por {n}', oLoss: 'perde por {n}', oDraw: 'empate', oAdv: 'cerca de +{n}', oDis: 'cerca de −{n}', oEven: 'equilibrado',
  extra: 'A última semente caiu no seu próprio depósito: jogada extra.', extraTurn: 'A sequência de jogadas extras guardou +{n} neste turno.',
  cap: 'A última semente parou numa cova vazia do seu lado e capturou as {n} sementes em frente (+{g}).', capKeep: 'Nas regras Normal a semente que captura fica na cova.',
  relay: 'A semeadura em revezamento continuou {n} vezes e parou na cova {x}.',
  end: 'Um lado ficou vazio: fim de jogo. As sementes de cada lado vão para o dono: {p0} +{a}, {p1} +{b}.',
  oppExtra: 'A cova {x} do adversário ficou com o número exato para o depósito: você lhe deu uma jogada extra.',
  give: '{n} das sementes semeadas foram para o lado do adversário. Mais sementes lá também são mais sementes para ele no fim.',
  threat: 'No próximo lance o adversário pode capturar as {n} sementes da cova {y} de {me} jogando a cova {x}.', still: 'As {n} sementes da cova {y} continuam ameaçadas.',
  defend: 'Impede a captura ameaçada das {n} sementes da cova {y}.', capThreat: 'Prepara a captura de {n} sementes com a cova {x}.',
  hoard: 'Há {n} sementes acumuladas na cova da direita (junto ao depósito). Guardadas até o fim contam para você, mas um monte grande também é alvo.',
  starve: 'Restam só {n} sementes ao adversário. Quando acabarem, o jogo termina e as {m} sementes do seu lado são suas.',
  low: 'Restam só {n} sementes do seu lado. Se esvaziar, o jogo termina e as {m} do adversário vão para ele.',
  count: 'Restam {n} sementes no tabuleiro. Para vencer são precisas {w} no depósito; faltam {x} a {who}.', clinch: '{who} já tem {w} ou mais: a vitória é certa.',
  best: 'O melhor era a cova {b} ({o}).', bExtra: 'A cova {b} chega exata ao depósito: jogada extra.', bChain: 'Começando pela cova {b}, uma sequência de jogadas extras guardaria +{n} neste turno.',
  bCap: 'A cova {b} capturaria {n} sementes.', bDef: 'A cova {b} impediria a captura do adversário ({n} sementes).', bSafe: 'A cova {b} não permite uma grande captura ({n} sementes).',
  bEnd: 'Terminar o jogo com a cova {b} vencia na hora.', bKeep: 'A cova {b} não dá sementes ao adversário.', bNoExtra: 'A cova {b} não dá jogada extra ao adversário.',
  oppGain: 'Depois deste lance o adversário pode guardar até +{n} no próximo turno ({how}).', hExtra: 'jogada extra', hCap: 'captura', bOpp: 'Com a cova {b} o próximo turno do adversário renderia no máximo +{n}.', bSide: 'A cova {b} mantém mais sementes do seu lado ({a} → {b2}).', bDeep: 'A vantagem da cova {b} aparece alguns lances adiante. Compare os números do tabuleiro.', only: 'O único lance possível.', tOpp: 'Depois de escolher seu lance, veja quanto o adversário pode ganhar no próximo turno.',
  reply: 'O adversário pode responder com a cova {x} ({how}, +{n} nesse turno).',
  hWin: '{who} venceu ({a}–{b})', hDraw: 'Empate ({a}–{b})', hNow: '{a}–{b} (jogo em andamento)', head: '{res}. Ponto de virada: lance {n}, cova {m} ({who}).', headClean: '{res}. Nenhum erro mudou o resultado.', chip: 'Lance {n} cova {m} ({who}) −{l}',
  tExtra: 'Antes de escolher, procure uma cova que chegue exata ao seu depósito (jogada extra). Use primeiro as mais próximas do depósito para encadear.',
  tCap: 'Procure um lance cuja última semente pare numa cova vazia do seu lado: o monte em frente é seu.',
  tDef: 'Antes de jogar, veja que monte seu o adversário pode capturar. Mova o monte, preencha a cova vazia ou mude onde as sementes dele param.',
  tGive: 'Dar muitas sementes dá ao adversário mais opções e mais sementes no fim. Considere lances que as mantêm do seu lado.',
  tCount: 'No final, conte as sementes. Quando um lado esvazia, as restantes ficam com o dono de cada lado.',
  tRelay: 'No Sunka a semeadura em revezamento muda tudo. Acompanhe cada nova semeadura até a última semente parar.',
  tEasy: 'As regras Fácil não têm capturas: as jogadas extras e as sementes que ficam do seu lado no fim decidem.',
  tGen: 'Compare os números do tabuleiro: cada um é a margem final prevista para essa cova.',
  sumTurn: 'Ponto de virada: o lance {n}, cova {m} ({who}), passou de «{a}» para «{b}».', show: 'Ver', clean: 'Nenhum erro mudou o resultado.',
  sumStats: '{who}: {e} jogadas extras, {c} capturas ({s} sementes).', sumEnd: 'Sementes no tabuleiro no fim: {p0} +{a}, {p1} +{b}.', sumBig: 'Maior captura: lance {n}, cova {m} ({who}) +{g}.',
  pick: 'Escolha um lance para ver aqui a explicação.', coord: 'As covas são numeradas de 1 a 6 em cada lado a partir da esquerda (a mais longe do seu depósito).'
},
de: {
  title: 'Kommentierte Analyse', move: 'Zug {n} ({who}) Mulde {m}', same: 'Der beste Zug.', eq: 'Gleiches Ergebnis wie der beste Zug.',
  res: 'Berechnung: vor diesem Zug „{a}“, danach „{b}“.', oWin: 'Sieg mit {n}', oLoss: 'Niederlage mit {n}', oDraw: 'Remis', oAdv: 'etwa +{n}', oDis: 'etwa −{n}', oEven: 'ausgeglichen',
  extra: 'Der letzte Stein landete im eigenen Speicher: Extrazug.', extraTurn: 'Die Kette von Extrazügen brachte in diesem Zug +{n} in den Speicher.',
  cap: 'Der letzte Stein blieb in einer leeren Mulde auf deiner Seite liegen und schlug die {n} Steine gegenüber (+{g}).', capKeep: 'Bei den Normal-Regeln bleibt der schlagende Stein in seiner Mulde.',
  relay: 'Das Staffelsäen ging {n}-mal weiter und endete in Mulde {x}.',
  end: 'Eine Seite ist leer, die Partie ist zu Ende. Die Steine jeder Seite gehen an deren Besitzer: {p0} +{a}, {p1} +{b}.',
  oppExtra: 'Die gegnerische Mulde {x} reicht jetzt genau bis zu seinem Speicher: Du schenkst ihm einen Extrazug.',
  give: '{n} der gesäten Steine gingen auf die gegnerische Seite. Mehr Steine dort bedeuten auch mehr Steine für ihn am Ende.',
  threat: 'Im nächsten Zug kann der Gegner mit Mulde {x} die {n} Steine in Mulde {y} von {me} schlagen.', still: 'Die {n} Steine in Mulde {y} sind weiter bedroht.',
  defend: 'Verhindert das drohende Schlagen der {n} Steine in Mulde {y}.', capThreat: 'Bereitet das Schlagen von {n} Steinen mit Mulde {x} vor.',
  hoard: 'In der rechten Mulde (neben dem Speicher) liegen {n} Steine. Bis zum Ende behalten zählen sie für dich, aber ein großer Haufen ist auch ein Ziel.',
  starve: 'Der Gegner hat nur noch {n} Steine. Wenn sie ausgehen, endet die Partie und die {m} Steine auf deiner Seite gehören dir.',
  low: 'Auf deiner Seite liegen nur noch {n} Steine. Wird sie leer, endet die Partie und die {m} Steine des Gegners gehören ihm.',
  count: 'Noch {n} Steine auf dem Brett. Zum Sieg braucht man {w} im Speicher; {who} fehlen noch {x}.', clinch: '{who} hat schon {w} oder mehr: Der Sieg steht fest.',
  best: 'Am besten war Mulde {b} ({o}).', bExtra: 'Mulde {b} erreicht genau den Speicher: Extrazug.', bChain: 'Mit Mulde {b} beginnend hätte eine Kette von Extrazügen in diesem Zug +{n} gebracht.',
  bCap: 'Mulde {b} hätte {n} Steine geschlagen.', bDef: 'Mulde {b} hätte das gegnerische Schlagen ({n} Steine) verhindert.', bSafe: 'Mulde {b} erlaubt kein großes Schlagen ({n} Steine).',
  bEnd: 'Mit Mulde {b} die Partie zu beenden, hätte sofort gewonnen.', bKeep: 'Mulde {b} gibt dem Gegner keine Steine.', bNoExtra: 'Mulde {b} schenkt dem Gegner keinen Extrazug.',
  oppGain: 'Nach diesem Zug kann der Gegner im nächsten Zug bis zu +{n} speichern ({how}).', hExtra: 'Extrazug', hCap: 'Schlagen', bOpp: 'Mit Mulde {b} brächte der nächste gegnerische Zug höchstens +{n}.', bSide: 'Mulde {b} hält mehr Steine auf deiner Seite ({a} → {b2}).', bDeep: 'Der Vorteil von Mulde {b} zeigt sich einige Züge später. Vergleiche die Zahlen auf dem Brett.', only: 'Der einzig mögliche Zug.', tOpp: 'Prüfe nach der Wahl deines Zuges, wie viel der Gegner im nächsten Zug gewinnen kann.',
  reply: 'Der Gegner kann mit Mulde {x} antworten ({how}, +{n} in diesem Zug).',
  hWin: '{who} gewinnt ({a}–{b})', hDraw: 'Remis ({a}–{b})', hNow: '{a}–{b} (Partie läuft)', head: '{res}. Wendepunkt: Zug {n}, Mulde {m} ({who}).', headClean: '{res}. Kein Fehler hat das Ergebnis verändert.', chip: 'Zug {n} Mulde {m} ({who}) −{l}',
  tExtra: 'Suche vor jedem Zug eine Mulde, die genau deinen Speicher erreicht (Extrazug). Nimm zuerst die Mulden nahe am Speicher, um sie zu verketten.',
  tCap: 'Suche einen Zug, dessen letzter Stein in einer leeren Mulde auf deiner Seite liegen bleibt: Der Haufen gegenüber gehört dir.',
  tDef: 'Prüfe vor dem Zug, welchen Haufen der Gegner schlagen kann. Bewege den Haufen, fülle die leere Mulde oder ändere, wo seine Steine enden.',
  tGive: 'Viele verschenkte Steine geben dem Gegner mehr Möglichkeiten und mehr Steine am Ende. Denke an Züge, die Steine bei dir halten.',
  tCount: 'Zähle im Endspiel die Steine. Wird eine Seite leer, gehören die übrigen Steine dem Besitzer der jeweiligen Seite.',
  tRelay: 'Beim Sunka verändert das Staffelsäen alles. Verfolge jedes Weitersäen, bis der letzte Stein liegen bleibt.',
  tEasy: 'Die Einfach-Regeln kennen kein Schlagen: Extrazüge und die Steine, die am Ende auf deiner Seite liegen, entscheiden.',
  tGen: 'Vergleiche die Zahlen auf dem Brett: Jede ist der erwartete Endabstand für diese Mulde.',
  sumTurn: 'Wendepunkt: Zug {n}, Mulde {m} ({who}), ging von „{a}“ zu „{b}“.', show: 'Zeigen', clean: 'Kein Fehler hat das Ergebnis verändert.',
  sumStats: '{who}: {e} Extrazüge, {c}-mal geschlagen ({s} Steine).', sumEnd: 'Steine am Ende auf dem Brett: {p0} +{a}, {p1} +{b}.', sumBig: 'Größtes Schlagen: Zug {n}, Mulde {m} ({who}) +{g}.',
  pick: 'Wähle einen Zug, um hier seine Erklärung zu sehen.', coord: 'Die Mulden jeder Seite sind von links (am weitesten vom eigenen Speicher) mit 1–6 nummeriert.'
},
hi: {
  title: 'समीक्षा टिप्पणी', move: 'चाल {n} ({who}) गड्ढा {m}', same: 'सबसे अच्छी चाल।', eq: 'सबसे अच्छी चाल जैसा ही नतीजा।',
  res: 'गणना: इस चाल से पहले "{a}", बाद में "{b}"।', oWin: '{n} से जीत', oLoss: '{n} से हार', oDraw: 'ड्रॉ', oAdv: 'लगभग +{n}', oDis: 'लगभग −{n}', oEven: 'बराबरी',
  extra: 'आख़िरी बीज आपके अपने भंडार में गया: एक और चाल।', extraTurn: 'एक और चाल की कड़ी से इस बारी में भंडार में +{n} गए।',
  cap: 'आख़िरी बीज आपकी तरफ़ के खाली गड्ढे में रुका और सामने के {n} बीज ले लिए (+{g})।', capKeep: 'सामान्य नियम में पकड़ने वाला बीज अपने गड्ढे में ही रहता है।',
  relay: 'रिले बुआई {n} बार चली और आख़िर में गड्ढा {x} पर रुकी।',
  end: 'एक तरफ़ खाली हो गई, खेल ख़त्म। हर तरफ़ बचे बीज उसी तरफ़ के मालिक को: {p0} +{a}, {p1} +{b}।',
  oppExtra: 'विरोधी के गड्ढे {x} में ठीक उतने बीज हो गए कि भंडार तक पहुँचें: आपने उसे एक और चाल दे दी।',
  give: 'बोए गए बीजों में से {n} विरोधी की तरफ़ गए। वहाँ ज़्यादा बीज मतलब अंत में उसके ज़्यादा बीज।',
  threat: 'अगली चाल में विरोधी गड्ढा {x} से {me} के गड्ढे {y} के {n} बीज ले सकता है।', still: 'गड्ढे {y} के {n} बीज अब भी ख़तरे में हैं।',
  defend: 'गड्ढे {y} के {n} बीजों को पकड़ने का ख़तरा रोक दिया।', capThreat: 'अगली बार गड्ढे {x} से विरोधी के {n} बीज लेने की तैयारी है।',
  hoard: 'सबसे दाएँ गड्ढे (भंडार के पास) में {n} बीज जमा हैं। अंत तक रखें तो आपके हैं, पर बड़ा ढेर निशाना भी बनता है।',
  starve: 'विरोधी की तरफ़ सिर्फ़ {n} बीज बचे हैं। उनके ख़त्म होते ही खेल ख़त्म और आपकी तरफ़ के {m} बीज आपके।',
  low: 'आपकी तरफ़ सिर्फ़ {n} बीज बचे हैं। वह खाली हुई तो खेल ख़त्म और विरोधी की तरफ़ के {m} बीज उसके।',
  count: 'बोर्ड पर {n} बीज बचे हैं। जीत के लिए भंडार में {w} चाहिए; {who} को {x} और चाहिए।', clinch: '{who} के पास {w} या ज़्यादा हैं: जीत पक्की है।',
  best: 'सबसे अच्छा गड्ढा {b} था ({o})।', bExtra: 'गड्ढा {b} ठीक भंडार तक पहुँचता है: एक और चाल।', bChain: 'गड्ढा {b} से शुरू करके एक और चाल की कड़ी से इस बारी में +{n} मिलते।',
  bCap: 'गड्ढा {b} से {n} बीज पकड़े जा सकते थे।', bDef: 'गड्ढा {b} विरोधी की पकड़ ({n} बीज) रोक देता।', bSafe: 'गड्ढा {b} बड़ी पकड़ ({n} बीज) का मौक़ा नहीं देता।',
  bEnd: 'गड्ढा {b} से खेल ख़त्म करते तो तुरंत जीत थी।', bKeep: 'गड्ढा {b} विरोधी को कोई बीज नहीं देता।', bNoExtra: 'गड्ढा {b} विरोधी को एक और चाल नहीं देता।',
  oppGain: 'इस चाल के बाद विरोधी अपनी अगली बारी में अधिकतम +{n} भंडार में डाल सकता है ({how})।', hExtra: 'एक और चाल', hCap: 'पकड़', bOpp: 'गड्ढा {b} से विरोधी की अगली बारी का फ़ायदा अधिकतम +{n} रहता।', bSide: 'गड्ढा {b} आपकी तरफ़ ज़्यादा बीज रखता है ({a} → {b2})।', bDeep: 'गड्ढा {b} की अच्छाई कुछ चालें आगे दिखती है। बोर्ड के अंक मिलाएँ।', only: 'यही एकमात्र चाल है।', tOpp: 'अपनी चाल चुनने के बाद देखें कि विरोधी अगली बारी में कितना ले सकता है।',
  reply: 'विरोधी गड्ढा {x} से जवाब दे सकता है ({how}, उस बारी में +{n})।',
  hWin: '{who} जीते ({a}–{b})', hDraw: 'ड्रॉ ({a}–{b})', hNow: '{a}–{b} (खेल जारी)', head: '{res}। मोड़: चाल {n}, गड्ढा {m} ({who})।', headClean: '{res}। किसी गलती ने नतीजा नहीं बदला।', chip: 'चाल {n} गड्ढा {m} ({who}) −{l}',
  tExtra: 'चुनने से पहले ऐसा गड्ढा खोजें जो ठीक आपके भंडार तक पहुँचे (एक और चाल)। कड़ी बनाने के लिए भंडार के पास वाले गड्ढे पहले चलें।',
  tCap: 'ऐसी चाल खोजें जिसका आख़िरी बीज आपकी तरफ़ के खाली गड्ढे में रुके: सामने का पूरा ढेर आपका।',
  tDef: 'चलने से पहले देखें कि विरोधी आपका कौन-सा ढेर पकड़ सकता है। ढेर हटाएँ, खाली गड्ढा भरें या उसके बीज रुकने की जगह बदलें।',
  tGive: 'बहुत बीज देने से विरोधी के विकल्प और अंत के बीज बढ़ते हैं। बीज अपनी तरफ़ रखने वाली चालें भी सोचें।',
  tCount: 'अंत में बीज गिनें। एक तरफ़ खाली होने पर बचे बीज हर तरफ़ के मालिक के होते हैं।',
  tRelay: 'सुंका में रिले बुआई सब बदल देती है। हर दोबारा बुआई को आख़िरी बीज रुकने तक देखें।',
  tEasy: 'आसान नियम में पकड़ नहीं है: एक और चाल और अंत में आपकी तरफ़ बचे बीज फ़ैसला करते हैं।',
  tGen: 'बोर्ड के अंक मिलाएँ: हर अंक उस गड्ढे के लिए अनुमानित अंतिम अंतर है।',
  sumTurn: 'मोड़: चाल {n}, गड्ढा {m} ({who}) से "{a}" → "{b}"।', show: 'बोर्ड पर देखें', clean: 'किसी गलती ने नतीजा नहीं बदला।',
  sumStats: '{who}: एक और चाल {e} बार, पकड़ {c} बार ({s} बीज)।', sumEnd: 'अंत में बोर्ड पर बचे बीज: {p0} +{a}, {p1} +{b}।', sumBig: 'सबसे बड़ी पकड़: चाल {n}, गड्ढा {m} ({who}) +{g}।',
  pick: 'कोई चाल चुनें, उसकी व्याख्या यहाँ दिखेगी।', coord: 'हर तरफ़ गड्ढे बाएँ से (अपने भंडार से सबसे दूर) 1–6 क्रमांकित हैं।'
},
ar: {
  title: 'شرح المراجعة', move: 'النقلة {n} ({who}) الحفرة {m}', same: 'أفضل نقلة.', eq: 'تعطي نتيجة أفضل نقلة نفسها.',
  res: 'الحساب: قبل هذه النقلة «{a}»، وبعدها «{b}».', oWin: 'فوز بفارق {n}', oLoss: 'خسارة بفارق {n}', oDraw: 'تعادل', oAdv: 'نحو +{n}', oDis: 'نحو −{n}', oEven: 'متكافئ',
  extra: 'سقطت البذرة الأخيرة في مخزنك: دور إضافي.', extraTurn: 'سلسلة الأدوار الإضافية أدخلت +{n} إلى المخزن في هذا الدور.',
  cap: 'توقفت البذرة الأخيرة في حفرة فارغة في جهتك فأخذت البذور المقابلة وعددها {n} (+{g}).', capKeep: 'في القواعد العادية تبقى البذرة الآسرة في حفرتها.',
  relay: 'استمر البذر المتتابع {n} مرات وتوقف أخيراً في الحفرة {x}.',
  end: 'فرغت إحدى الجهتين فانتهت المباراة. البذور الباقية في كل جهة لصاحبها: {p0} +{a}، {p1} +{b}.',
  oppExtra: 'صار في حفرة الخصم {x} العدد المناسب تماماً لبلوغ مخزنه: منحته دوراً إضافياً.',
  give: 'ذهبت {n} من البذور المزروعة إلى جهة الخصم. بذور أكثر هناك تعني بذوراً أكثر له في النهاية.',
  threat: 'في النقلة التالية يستطيع الخصم أخذ البذور الـ{n} في الحفرة {y} لـ{me} بلعب الحفرة {x}.', still: 'البذور الـ{n} في الحفرة {y} ما زالت مهددة.',
  defend: 'تمنع الأسر المهدِّد للبذور الـ{n} في الحفرة {y}.', capThreat: 'تجهّز لأسر {n} بذور بالحفرة {x}.',
  hoard: 'تجمّعت {n} بذرة في الحفرة اليمنى (بجوار المخزن). إن احتفظت بها حتى النهاية فهي لك، لكن الكومة الكبيرة هدف للأسر أيضاً.',
  starve: 'لم يبقَ في جهة الخصم سوى {n} بذور. حين تنفد تنتهي المباراة وتصبح البذور الـ{m} في جهتك كلها لك.',
  low: 'لم يبقَ في جهتك سوى {n} بذور. إن فرغت انتهت المباراة وذهبت البذور الـ{m} في جهة الخصم إليه.',
  count: 'بقيت {n} بذرة على اللوحة. الفوز يتطلب {w} في المخزن؛ ينقص {who} {x}.', clinch: 'لدى {who} الآن {w} أو أكثر: الفوز مضمون.',
  best: 'الأفضل كانت الحفرة {b} ({o}).', bExtra: 'الحفرة {b} تبلغ المخزن تماماً: دور إضافي.', bChain: 'بالبدء من الحفرة {b} كانت سلسلة أدوار إضافية ستُدخل +{n} في هذا الدور.',
  bCap: 'الحفرة {b} كانت ستأسر {n} بذور.', bDef: 'الحفرة {b} كانت ستمنع أسر الخصم ({n} بذور).', bSafe: 'الحفرة {b} لا تسمح بأسر كبير ({n} بذور).',
  bEnd: 'إنهاء المباراة بالحفرة {b} كان فوزاً فورياً.', bKeep: 'الحفرة {b} لا تعطي الخصم أي بذرة.', bNoExtra: 'الحفرة {b} لا تمنح الخصم دوراً إضافياً.',
  oppGain: 'بعد هذه النقلة يستطيع الخصم إدخال حتى +{n} في دوره التالي ({how}).', hExtra: 'دور إضافي', hCap: 'أسر', bOpp: 'مع الحفرة {b} كان مكسب الخصم في دوره التالي +{n} على الأكثر.', bSide: 'الحفرة {b} تُبقي بذوراً أكثر في جهتك ({a} → {b2}).', bDeep: 'تظهر أفضلية الحفرة {b} بعد بضع نقلات. قارن الأرقام على اللوحة.', only: 'النقلة الوحيدة الممكنة.', tOpp: 'بعد اختيار نقلتك تحقّق كم يستطيع الخصم أن يكسب في دوره التالي.',
  reply: 'يستطيع الخصم الرد بالحفرة {x} ({how}، +{n} في ذلك الدور).',
  hWin: 'فاز {who} ({a}–{b})', hDraw: 'تعادل ({a}–{b})', hNow: '{a}–{b} (المباراة جارية)', head: '{res}. نقطة التحوّل: النقلة {n}، الحفرة {m} ({who}).', headClean: '{res}. لم يغيّر أي خطأ النتيجة.', chip: 'النقلة {n} الحفرة {m} ({who}) −{l}',
  tExtra: 'قبل الاختيار ابحث عن حفرة تبلغ مخزنك تماماً (دور إضافي). العب الحفر القريبة من المخزن أولاً لتسلسلها.',
  tCap: 'ابحث عن نقلة تتوقف بذرتها الأخيرة في حفرة فارغة في جهتك: الكومة المقابلة لك.',
  tDef: 'قبل اللعب انظر أي كومة لك يستطيع الخصم أسرها. حرّك الكومة أو املأ الحفرة الفارغة أو غيّر موضع توقف بذوره.',
  tGive: 'إعطاء بذور كثيرة يمنح الخصم خيارات أكثر وبذوراً أكثر في النهاية. فكّر في نقلات تُبقي البذور في جهتك.',
  tCount: 'في النهاية عُدّ البذور. حين تفرغ جهة، تذهب البذور الباقية لصاحب كل جهة.',
  tRelay: 'في السونكا يغيّر البذر المتتابع كل شيء. تتبّع كل إعادة بذر حتى تتوقف البذرة الأخيرة.',
  tEasy: 'القواعد السهلة بلا أسر: الأدوار الإضافية والبذور الباقية في جهتك في النهاية هي التي تحسم.',
  tGen: 'قارن الأرقام على اللوحة: كل رقم هو الفارق النهائي المتوقع لتلك الحفرة.',
  sumTurn: 'نقطة التحوّل: النقلة {n} الحفرة {m} ({who}) من «{a}» إلى «{b}».', show: 'اعرض', clean: 'لم يغيّر أي خطأ النتيجة.',
  sumStats: '{who}: أدوار إضافية {e}، أسر {c} مرات ({s} بذرة).', sumEnd: 'البذور الباقية على اللوحة في النهاية: {p0} +{a}، {p1} +{b}.', sumBig: 'أكبر أسر: النقلة {n} الحفرة {m} ({who}) +{g}.',
  pick: 'اختر نقلة لترى شرحها هنا.', coord: 'تُرقَّم الحفر من 1 إلى 6 في كل جهة من اليسار (الأبعد عن مخزن تلك الجهة).'
},
};
function mcT(k, v) {
  let s = (MC_TEXT[typeof LANG !== 'undefined' ? LANG : 'ja'] || MC_TEXT.en)[k]; if (s === undefined) s = MC_TEXT.en[k];
  return v ? s.replace(/\{(\w+)\}/g, (_, x) => v[x] !== undefined ? v[x] : '') : s;
}
const mcEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mcPit = k => `<bdi class="cr-c">${k + 1}</bdi>`;
// verdict text for the side to move from a value in seeds (mover's view)
function mcOutcome(v, exact) {
  if (exact) { const r = Math.round(v); return r > 0 ? mcT('oWin', { n: r }) : r < 0 ? mcT('oLoss', { n: -r }) : mcT('oDraw'); }
  const a = Math.round(Math.abs(v) * 10) / 10;
  return a < 0.5 ? mcT('oEven') : mcT(v > 0 ? 'oAdv' : 'oDis', { n: a.toFixed(1) });
}
// the biggest single-move capture `side` could make on board b (the gain includes the capturing seed under Kalah / Sunka)
function mcBestCap(b, side, rules) {
  let best = { n: 0, by: -1, from: -1, g: 0 };
  for (const k of E.legal(b, side)) {
    const tr = E.trace(b, side, k, rules);
    if (tr.cap > best.n) best = { n: tr.cap, by: k, from: tr.capFrom, g: tr.cap + (E.RULES[rules].cap === 2 ? 1 : 0) };
  }
  return best;
}
// pits of `side` that reach the store exactly (extra turn) — not counted under Sunka, where relays decide
function mcExtras(b, side, rules) {
  const out = [];
  for (const k of E.legal(b, side)) { const tr = E.trace(b, side, k, rules); if (tr.extra && !tr.over) out.push(k); }
  return out;
}
// everything the commentary needs about move k of `side` on board b
function mcFeatures(b, side, k, rules) {
  const tr = E.trace(b, side, k, rules), opp = 1 - side, base = side ? 7 : 0, obase = side ? 0 : 7;
  let give = 0; for (const ev of tr.events) if (ev.t === 'drop' && ev.at >= obase && ev.at <= obase + 5) give++;
  const sweep = tr.events.find(ev => ev.t === 'sweep');
  const F = { tr, extra: tr.extra && !tr.over, cap: tr.cap, capG: tr.cap ? tr.cap + (E.RULES[rules].cap === 2 ? 1 : 0) : 0, relays: tr.relays, land: tr.land,
    over: tr.over, sweep: sweep ? [sweep.n0, sweep.n1] : null, give, gain: tr.board[E.storeOf(side)] - b[E.storeOf(side)] };
  F.mySide = E.sideSum(tr.board, side); F.oppSide = E.sideSum(tr.board, opp);
  F.hoard = tr.board[base + 5];
  if (!tr.over && !F.extra) {
    F.threatBefore = mcBestCap(b, opp, rules);
    F.threatAfter = mcBestCap(tr.board, opp, rules);
    const ex0 = mcExtras(b, opp, rules), ex1 = mcExtras(tr.board, opp, rules);
    F.oppExtraNew = rules === 'sunka' ? [] : ex1.filter(x => !ex0.includes(x));
    F.myCapNext = mcBestCap(tr.board, side, rules);
    const tm = E.turnMax(tr.board, opp, rules), ln = tm.lines[0] || [];
    let how = ln.length > 1 ? 'hExtra' : '';
    if (ln.length) { let bb = Int8Array.from(tr.board); for (const m of ln) { const x = E.trace(bb, opp, m, rules); if (x.cap) how = how ? how + '+' : 'hCap'; bb = x.board; } }
    F.oppTurn = { g: tm.gain, how: how === 'hExtra+' ? 'hExtra+hCap' : how };
  }
  return F;
}
function mcMove(i) {
  const L = rv.list[i]; if (!L || !L.length) return '';
  const pos = P[i], side = pos.side, k = game.moves[i], rules = game.rules;
  const j = rvJudge(i) || { q: null, loss: 0, best: k, k, side, only: L.length === 1 };
  const mine = L.find(x => x.m === k), bestE = L.reduce((a, x) => x.v > a.v ? x : a, L[0]);
  const F = mcFeatures(pos.b, side, k, rules), who = mcEsc(shortName(side)), them = mcEsc(shortName(1 - side));
  const tag = j.q ? ` <span class="tag ${j.q}">${mcEsc(t('q.' + j.q))}</span>` : '';
  let h = `<p class="cr-mv"><b>${mcT('move', { n: i + 1, who, m: mcPit(k) })}</b>${tag}</p>`;
  const out = [], why = []; let tip = '';
  const okMove = !(j.best !== k && j.loss >= 0.3);
  if (mine && bestE) out.push(mcT('res', { a: mcOutcome(bestE.v, bestE.exact), b: mcOutcome(mine.v, mine.exact) }));
  if (j.only) out.unshift(mcT('only')); else if (okMove) out.unshift(mcT(j.best === k ? 'same' : 'eq'));
  // what the move did
  if (F.relays) why.push(mcT('relay', { n: F.relays, x: mcPit(F.land % 7) }));
  if (F.extra) {
    why.push(mcT('extra'));
    // total stored in this whole turn (until the turn passes)
    let e = i; const N = game.moves.length;
    while (e + 1 < N && P[e + 1].side === side && !P[e + 1].over) e++;
    const tot = P[e + 1].b[E.storeOf(side)] - pos.b[E.storeOf(side)];
    if (e > i && tot > 1) why.push(mcT('extraTurn', { n: tot }));
  }
  if (F.cap) { why.push(mcT('cap', { n: F.cap, g: F.capG })); if (rules === 'basic') why.push(mcT('capKeep')); }
  if (F.over && F.sweep) why.push(mcT('end', { p0: mcEsc(shortName(0)), p1: mcEsc(shortName(1)), a: F.sweep[0], b: F.sweep[1] }));
  if (!F.over && !F.extra) {
    const T0 = F.threatBefore, T1 = F.threatAfter;
    if (T0.n >= 2 && T1.n < T0.n && !(T1.from === T0.from && T1.n >= T0.n)) why.push(mcT('defend', { y: mcPit(T0.from % 7), n: T0.n }));
    if (T1.n >= 2) {
      if (T0.n >= 2 && T1.from === T0.from && T1.n >= T0.n) why.push(mcT('still', { y: mcPit(T1.from % 7), n: T1.n }));
      else { why.push(mcT('threat', { x: mcPit(T1.by), y: mcPit(T1.from % 7), n: T1.n, me: who })); F.threatIdx = why.length - 1; }
      if (j.q === 'bad' || j.q === 'dubious') tip = tip || 'tDef';
    }
    if (F.oppExtraNew.length) why.push(mcT('oppExtra', { x: F.oppExtraNew.map(mcPit).join('·') }));
    if (F.give >= 4 && (j.q === 'bad' || j.q === 'dubious')) { why.push(mcT('give', { n: F.give })); }
    const RL = rv.list[i + 1], q2 = P[i + 1];
    let replied = false;
    if (RL && RL.length && q2 && !q2.over && q2.side === 1 - side && (j.q === 'bad' || j.q === 'dubious')) {
      const r = RL.reduce((a, x) => x.v > a.v ? x : a, RL[0]), R1 = E.trace(q2.b, q2.side, r.m, rules);
      let tot = R1.board[E.storeOf(q2.side)] - q2.b[E.storeOf(q2.side)];
      if (R1.extra && !R1.over) tot = E.turnMaxFirst(q2.b, q2.side, rules)[r.m];
      const how = [R1.extra && !R1.over ? mcT('hExtra') : '', R1.cap ? mcT('hCap') : ''].filter(Boolean).join('・');
      if (how && tot >= 3) {
        if (R1.cap && F.threatIdx !== undefined && r.m === F.threatAfter.by) why.splice(F.threatIdx, 1);
        why.push(mcT('reply', { x: mcPit(r.m), how, n: tot })); replied = true; tip = tip || (R1.cap ? 'tDef' : 'tOpp');
      }
    }
    if (!replied && F.oppTurn.g >= 5 && (j.q === 'bad' || j.q === 'dubious') && !(T1.n >= 2 && F.oppTurn.how === 'hCap')) why.push(mcT('oppGain', { n: F.oppTurn.g, how: F.oppTurn.how.split('+').map(x => mcT(x)).join('・') || '—' }));
    if (F.myCapNext.n >= 3 && T1.n < F.myCapNext.n) why.push(mcT('capThreat', { x: mcPit(F.myCapNext.by), n: F.myCapNext.n }));
    if (rules !== 'sunka' && F.hoard >= 10) why.push(mcT('hoard', { n: F.hoard }));
    if (F.oppSide <= 3 && F.mySide >= 6) why.push(mcT('starve', { n: F.oppSide, m: F.mySide }));
    else if (F.mySide <= 3 && F.oppSide >= 6) why.push(mcT('low', { n: F.mySide, m: F.oppSide }));
  }
  if (!F.over) {
    const nb = F.tr.board, total = nb.reduce((a, x) => a + x, 0), onBoard = F.mySide + F.oppSide, w = Math.floor(total / 2) + 1, my = nb[E.storeOf(side)];
    if (onBoard <= 16) why.push(my >= w ? mcT('clinch', { who, w }) : mcT('count', { n: onBoard, w, who, x: w - my }));
    if (onBoard <= 16 && (j.q === 'bad' || j.q === 'dubious')) tip = tip || 'tCount';
  }
  // the best move and why it is better
  if (!okMove) {
    why.push(mcT('best', { b: mcPit(j.best), o: bestE ? mcOutcome(bestE.v, bestE.exact) : '—' }));
    const B = mcFeatures(pos.b, side, j.best, rules);
    const chain = E.turnMaxFirst(pos.b, side, rules)[j.best];
    if (B.over && bestE && bestE.exact && bestE.v > 0) why.push(mcT('bEnd', { b: mcPit(j.best) }));
    else if (B.extra && !F.extra) { why.push(chain >= 3 ? mcT('bChain', { b: mcPit(j.best), n: chain }) : mcT('bExtra', { b: mcPit(j.best) })); tip = tip || (rules === 'sunka' ? 'tRelay' : 'tExtra'); }
    else if (B.cap >= 2 && B.capG > F.capG) { why.push(mcT('bCap', { b: mcPit(j.best), n: B.cap })); tip = tip || (rules === 'sunka' ? 'tRelay' : 'tCap'); }
    else if (B.threatAfter && F.threatAfter && F.threatAfter.n >= 2 && B.threatAfter.n + 2 <= F.threatAfter.n) {
      why.push(mcT(F.threatBefore && F.threatBefore.n >= 2 ? 'bDef' : 'bSafe', { b: mcPit(j.best), n: F.threatAfter.n })); tip = tip || 'tDef';
    }
    else if (B.oppExtraNew && F.oppExtraNew && F.oppExtraNew.length && !B.oppExtraNew.length) why.push(mcT('bNoExtra', { b: mcPit(j.best) }));
    else if (F.give >= 3 && B.give === 0) { why.push(mcT('bKeep', { b: mcPit(j.best) })); tip = tip || 'tGive'; }
    else if (B.extra && chain > F.gain + 1) { why.push(mcT('bChain', { b: mcPit(j.best), n: chain })); tip = tip || 'tExtra'; }
    else if (B.oppTurn && F.oppTurn && B.oppTurn.g + 3 <= F.oppTurn.g) { why.push(mcT('bOpp', { b: mcPit(j.best), n: B.oppTurn.g })); tip = tip || 'tOpp'; }
    else if (!B.extra && !F.extra && B.mySide - F.mySide >= 3 && B.give < F.give) why.push(mcT('bSide', { b: mcPit(j.best), a: F.mySide, b2: B.mySide }));
    else why.push(mcT('bDeep', { b: mcPit(j.best) }));
  }
  if (!okMove && !tip) tip = rules === 'sunka' ? 'tRelay' : rules === 'easy' ? 'tEasy' : 'tGen';
  h += out.map(x => `<p>${x}</p>`).join('');
  if (why.length) h += `<ul class="cr-list">${why.map(x => `<li>${x}</li>`).join('')}</ul>`;
  if (tip) h += `<p class="cr-tip">💡 ${mcT(tip)}</p>`;
  return h;
}
// end of the game: one headline (result + the decisive moment) and at most three one-line turning-point chips
function mcSummary() {
  const N = game.moves.length, last = P[N], a = last.b[6], b = last.b[13];
  const res = !last.over ? mcT('hNow', { a, b }) : a === b ? mcT('hDraw', { a, b }) : mcT('hWin', { who: mcEsc(shortName(a > b ? 0 : 1)), a, b });
  let picks = [];
  for (let i = 0; i < N; i++) {
    const j = rvJudge(i); if (!j || j.q !== 'bad') continue;
    if (settings.mode === 'ai' && j.side !== game.human) continue;
    picks.push({ i, j });
  }
  picks = picks.sort((x, y) => y.j.loss - x.j.loss).slice(0, 3);
  const top = picks[0];
  let h = `<p class="cr-head">${top ? mcT('head', { res, n: top.i + 1, m: mcPit(top.j.k), who: mcEsc(shortName(top.j.side)) }) : mcT('headClean', { res })}</p>`;
  if (picks.length) h += `<div class="cr-chips">${picks.sort((x, y) => x.i - y.i).map(({ i, j }) => `<button class="cr-chip" data-i="${i}"><span>${mcT('chip', { n: i + 1, m: mcPit(j.k), who: mcEsc(shortName(j.side)), l: Math.round(j.loss * 10) / 10 })}</span><b>${mcEsc(mcT('show'))}</b></button>`).join('')}</div>`;
  return h;
}
function mcCoach() {
  if (typeof rv === 'undefined' || !rv || rv.running || rv.key !== rvKey()) return '';
  let body = '';
  try { body = cur < game.moves.length ? mcMove(cur) : mcSummary(); } catch (e) { console.warn(e); return ''; }
  const coord = cur < game.moves.length ? `<p class="cr-coord">${mcEsc(mcT('coord'))}</p>` : '';
  return body ? `<div class="cr-box"><div class="cr-h">${mcEsc(mcT('title'))}</div>${body}${coord}</div>` : '';
}
