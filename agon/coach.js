'use strict';
// アゴンのコーチ (common spec: shared/COACH.md, model: ugolki/coach.js) — shown while the player is to move against the AI (and in
// two-player games on one device): the position at a glance (形勢・歩数差・王座とガード・危ない駒・序盤の作戦), the recommended plan
// with its reason, the candidate directions (分かれ道: each candidate's plan explained, moves shown on hover / tap with arrows on the
// board), prioritized "how to think" tips read from the position (はさまれる駒・捕獲・王座・相手の完成・空の王座・置き直し…), and the
// verdict on the previous move (◎○△✕). In the first moves the coach shows the site's opening plans (openings.json) — the 1842 rules
// and the 19th-century rule books record no opening theory (checked 2026-11: Wikipedia, Ludii, boardandpieces).
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (AgonCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手がどの駒をはさみに来るか、王座をねらうか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', race: '歩数', stage: '局面', ring: '王座', danger: '危ない駒',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'race.even': '五分', 'race.up': '約{x}歩リード', 'race.down': '約{x}歩遅れ', 'ring.v': '{t}・ガード{n}/6', 'ring.on': '女王が着座', 'ring.off': '空き', 'ring.opp': '相手が着座', 'danger.v': '{n}枚',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.step': '{p}を{sq}から{to}へ', 'tt.reloc': '{p}を{to}へ置き直す', 'tt.place': 'ガードを{to}へ置く',
  'pc.q': '女王', 'pc.g': 'ガード',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから王座の完成まで読み切れています。相手の受けにも注意して最後まで正確に。',
  'c.qcap': '女王を捕獲', 'b.qcap': '王座の女王を捕まえる', 'x.qcap': '{to}へ動いて相手の女王をはさみます。女王は王座を離れて置き直しになり、相手の完成は大きく遠のきます。',
  'c.cap': '捕獲', 'b.cap': '相手の駒をはさむ', 'x.cap': '{to}へ動いて{n}枚をはさみます。捕まったガードは外周まで戻され、相手は置き直しに手番を使います。',
  'c.throne': '王座へ', 'b.throne': '女王を王座へ', 'x.throne': '女王を王座へ。王座は早い者勝ちで、相手の女王の行き場がなくなります。あとはガードで周りを囲みます。',
  'c.ring': '輪に入る', 'b.ring': 'ガードを王座のとなりへ', 'x.ring': '{p}を王座のとなり（1の輪）の{to}へ。完成に向けて1枚ずつ埋めます。はさまれない位置か確かめよう。',
  'c.block': '相手をふさぐ', 'b.block': '相手の完成をふさぐ', 'x.block': '{to}へ入って、相手の王座のまわりのマスを先にうめます。相手の完成を遅らせる守りの手です。',
  'c.save': '守る', 'b.save': '危ない駒を守る', 'x.save': '{p}（{sq}）をはさまれる前に{to}へ逃がします（またはふさぎます）。捕まると外周まで戻され、1手を失います。',
  'c.reloc': '置き直し', 'b.reloc': '良い場所へ置き直す', 'x.reloc': '捕まった{p}を{to}へ。すぐにまた捕まらず、早く内側へ戻れる場所です。',
  'c.place': '配置', 'b.place': 'ガードを配置する', 'x.place': 'ガードを{to}へ置きます。王座に近く、相手にはさまれにくい場所が基本です。',
  'c.in': '内側へ', 'b.in': '内側へ進む', 'x.in': '{p}を{sq}から{to}へ、1つ内側の輪へ進めます。一度入った駒は外へ戻らないので、安全な所から進めよう。',
  'c.side': '輪の上を回る', 'b.side': '同じ輪の上で動く', 'x.side': '{p}を同じ輪の{to}へ。内側へ入る前に、はさまれない入口へ回り込む手です。',
  opH: '序盤の分かれ道 — 作戦の選び方', opIntro: 'アゴンには名前のついた定跡がほとんど残っていません。序盤は「女王から進める」「ガードで壁を作る」「内周を先に取る」などの作戦から選びます。',
  'op.book': '作戦', 'op.next.t': '{p}を{sq}から{to}へ', 'op.next.x': '作戦「{n}」の手順です。', 'op.done.x': 'この手で作戦「{n}」の形になります。',
  bkWhy: 'この局面はサイトの序盤作戦の範囲です。作戦の手順から選んでみよう。', prevBook: '序盤作戦どおりの手です。', prevOff: 'この局面の作戦の手は {m} などでした。',
  senkei: '作戦', moyo: '{n}模様', fixed: '{n}',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）とほぼ同じ価値の手です。',
  'lp.cap': '💡コツ：指す前に「一直線にはさめる相手の駒」がないか確かめよう。', 'lp.hang': '💡コツ：動かした先と、そのとなりの駒が相手にはさまれないか確かめよう。',
  'tp.hang': '{sq}の駒が、相手の次の1手ではさまれる形です。逃がすか、相手が入るマスをふさごう。', 'tp.capNow': '相手の駒をはさめる手があります（{n}通り）。捕獲は相手に1手を使わせます。',
  'tp.oppThrone': '相手の女王が王座にいます。王座をはさんで向かい合う2マスを自分の駒でうめれば、女王を捕まえられます。', 'tp.throneOpen': '女王が王座のとなりにいて、王座は空いています。先に座ってしまおう。',
  'tp.oppNear': '相手は完成まであと約{n}手。王座のまわりの空きマスと、入ってくるガードに注意。', 'tp.five': 'ガード5枚が王座を囲んでいます。女王が王座に入るまで、6枚目は入れないこと（空の王座を囲むと負け）。',
  'tp.reloc': '置き直しの手番です。ガードは外周、女王は王座以外のどこへでも。すぐ捕まらず、早く戻れる場所を選ぼう。',
  'tp.place': '配置の手番です。王座の近くは強い場所ですが、相手の駒2枚の間には置けません。女王の通り道も考えよう。',
  'tp.ahead': '歩数で約{x}歩リード。無理な攻めより、捕まらないことを優先しよう。', 'tp.behind': '歩数で約{x}歩遅れています。捕獲で相手の駒を外へ戻して手数を取り戻そう。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.open1': '序盤は駒をばらばらに進めず、2枚1組で進むと、相手にはさまれにくくなります。', 'tp.open2': '女王だけ先に走らせると捕まりやすい。ガードを近くに連れていこう。',
  'tp.mid1': '内側の輪ほどマスが少なく、取り合いになります。1の輪に入ったガードは出られないので、入る前に安全か確認。', 'tp.mid2': '相手の駒が並んでいる所は、こちらの捕獲のチャンスでもあります。',
  'tp.winning': '有利です。相手の捕獲の手を1つずつ消しながら、王座の完成へ。', 'tp.losing': '苦しい局面。相手の女王やガードをはさむ手を探し、完成を遅らせよう。',
  sep: '、',
  gl: {
    throne: { m: ['王座'], t: '王座', d: '盤の中央のマス。女王だけが入れる。女王が座り、まわりの6マスを自分のガードでうめたら勝ち。' },
    sandwich: { m: ['はさむ', 'はさめる', 'はさまれる', 'はさみ'], t: 'はさむ（捕獲）', d: '動かした駒と自分のもう1枚で、相手の駒を一直線にはさむこと。はさまれた駒は捕まり、次の手番で置き直しになる。' },
    reloc: { m: ['置き直し'], t: '置き直し', d: '捕まった駒を持ち主が次の手番で動かすこと。ガードは外周の空きマス、女王は王座以外の空きマスへ。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Guess which piece they will try to sandwich, or whether they go for the throne.',
  calc: 'Looking at the candidates…', form: 'Position', race: 'Steps', stage: 'Phase', ring: 'Throne', danger: 'In danger',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'race.even': 'Level', 'race.up': '~{x} steps ahead', 'race.down': '~{x} steps behind', 'ring.v': '{t} · guards {n}/6', 'ring.on': 'queen seated', 'ring.off': 'empty', 'ring.opp': 'enemy queen', 'danger.v': '{n}',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move loses a lot. Play this one.', recForced: 'This is the only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan.',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.step': '{p} {sq} to {to}', 'tt.reloc': 'Relocate the {p} to {to}', 'tt.place': 'Place a guard on {to}',
  'pc.q': 'queen', 'pc.g': 'guard',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees the ring completed from here. Watch the replies and play it out precisely.',
  'c.qcap': 'Capture the queen', 'b.qcap': 'Capture the queen on the throne', 'x.qcap': 'Moving to {to} sandwiches the enemy queen: she must leave the throne to be relocated, and their ring is far away again.',
  'c.cap': 'Capture', 'b.cap': 'Sandwich an enemy piece', 'x.cap': 'Moving to {to} sandwiches {n} piece(s). A captured guard goes back to the edge and the opponent spends a turn relocating it.',
  'c.throne': 'To the throne', 'b.throne': 'The queen to the throne', 'x.throne': 'The queen takes the throne. It goes to whoever gets there first, and the enemy queen has nowhere to sit. Then the guards close in.',
  'c.ring': 'Into the ring', 'b.ring': 'A guard next to the throne', 'x.ring': 'The {p} goes to {to} on ring 1, next to the throne — one more cell of the ring. Check it cannot be sandwiched there.',
  'c.block': 'Block', 'b.block': 'Block their ring', 'x.block': 'Moving into {to} takes a cell round their throne first — a defensive move that delays their ring.',
  'c.save': 'Defend', 'b.save': 'Save a piece in danger', 'x.save': 'The {p} on {sq} escapes to {to} (or the gap is filled) before it is sandwiched. A capture would send it back to the edge and cost a turn.',
  'c.reloc': 'Relocation', 'b.reloc': 'Relocate well', 'x.reloc': 'The captured {p} goes to {to}: safe from an immediate capture and quick to come back in.',
  'c.place': 'Placement', 'b.place': 'Place a guard', 'x.place': 'Place a guard on {to}. Cells near the throne that cannot be sandwiched are the usual choice.',
  'c.in': 'Inwards', 'b.in': 'Move inwards', 'x.in': 'The {p} steps from {sq} to {to}, one ring inwards. Pieces never come back out, so move in where it is safe.',
  'c.side': 'Along the ring', 'b.side': 'Move along the ring', 'x.side': 'The {p} goes to {to} on the same ring — circling to a safe entrance before moving in.',
  opH: 'Opening crossroads — choosing a plan', opIntro: 'Almost no named openings survive for Agon. In the opening choose a plan: the queen first, a wall of guards, or the race for the inner ring.',
  'op.book': 'Plan', 'op.next.t': '{p} {sq} to {to}', 'op.next.x': 'A move of the “{n}” plan.', 'op.done.x': 'With this move the “{n}” plan is set up.',
  bkWhy: 'This position is still covered by the site’s opening plans. Try one of them.', prevBook: 'A move of the opening plans.', prevOff: 'The plan moves here were {m} and others.',
  senkei: 'Plan', moyo: '{n} (likely)', fixed: '{n}',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.cap': '💡Tip: before moving, look for an enemy piece you can sandwich in a line.', 'lp.hang': '💡Tip: check that the cell you move to, and your pieces next to it, cannot be sandwiched.',
  'tp.hang': 'Your piece on {sq} can be sandwiched by the opponent’s next move. Move it, or fill the cell they would use.', 'tp.capNow': 'You can sandwich an enemy piece ({n} way(s)). A capture costs the opponent a turn.',
  'tp.oppThrone': 'The enemy queen is on the throne. Fill two opposite cells across the throne with your pieces and she is captured.', 'tp.throneOpen': 'Your queen stands next to the empty throne. Take it first.',
  'tp.oppNear': 'The opponent is about {n} move(s) from completing. Watch the empty cells round their throne and the guards coming in.', 'tp.five': 'Five of your guards surround the throne. Keep the sixth out until your queen is on it (six round an empty throne lose).',
  'tp.reloc': 'A relocation turn: a guard goes to the edge, the queen anywhere but the throne. Pick a cell that is safe and quick to come back from.',
  'tp.place': 'A placement turn. Cells near the throne are strong, but you may not place between two enemy pieces. Think of your queen’s way in.',
  'tp.ahead': 'About {x} steps ahead. Avoid being captured rather than forcing attacks.', 'tp.behind': 'About {x} steps behind. Win tempo back by capturing — it sends their pieces out.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.open1': 'Advance in pairs rather than one by one: paired pieces are harder to sandwich.', 'tp.open2': 'A queen that runs ahead alone is easily captured. Bring guards along.',
  'tp.mid1': 'The inner rings have few cells and are fought over. A guard on ring 1 can never leave it, so check it is safe before going in.', 'tp.mid2': 'Where enemy pieces stand in a row, you may have a capture.',
  'tp.winning': 'You are better. Remove their captures one by one and close the ring.', 'tp.losing': 'A hard position. Look for moves that sandwich their queen or guards to delay the ring.',
  sep: ', ',
  gl: {
    throne: { m: ['throne'], t: 'Throne', d: 'The centre cell. Only a queen may enter it. Your queen there with your six guards round her wins.' },
    sandwich: { m: ['sandwiched', 'sandwiches', 'sandwich'], t: 'Sandwich (capture)', d: 'An enemy piece between the piece you move and another of yours, in a line, is captured and must be relocated by its owner.' },
    reloc: { m: ['relocating', 'relocated', 'relocation', 'relocate'], t: 'Relocation', d: 'The owner moves a captured piece on the next turn: a guard to an empty edge cell, the queen to any empty cell but the throne.' },
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
const pctS = x => Math.round(x * 100) + '%';
const wr = v => (1 + sOfV(v)) / 2;
const SQN = i => E.sqName(i);
// --------------------------------------------------------------------------------------------- position facts
const pcN = (pos, i) => tx(pos.isQueen(i) ? 'pc.q' : 'pc.g');
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.dist = [Math.max(0, pos.dist(us)), Math.max(0, pos.dist(them))];
  f.ring = [pos.ringCount(us), pos.ringCount(them)]; f.th = [pos.onThrone(us), pos.onThrone(them)];
  f.phase = pos.phase();
  const hm = f.phase === 'move' ? E.hanging(pos, us) : { n: 0, list: [] };
  f.hang = hm.list;
  f.caps = f.phase === 'move' ? f.legal.filter(m => m !== E.PASS && pos.capsOf(m).length).length : 0;
  f.need = [E.need(pos, us), E.need(pos, them)];
  const q = pos.queen(us); f.qNext = q >= 0 && !pos.captured(q) && E.NB[q].includes(E.CENTER) && !pos.at(E.CENTER);
  f.stage = n < 16 && !f.ring[0] && !f.ring[1] ? 'open' : (Math.min(f.need[0], f.need[1]) <= 5 ? 'end' : 'mid');
  return f;
}
function classify(pos, m, f, v) {
  const us = pos.turn, k0 = E.kindOfMove(pos, m), fr = E.mFrom(m), to = E.mTo(m);
  const base = { sq: fr >= 0 && fr < E.N ? SQN(fr) : '', to: to >= 0 ? SQN(to) : '', m, p: fr >= 0 && fr < E.N ? pcN(pos, fr) : tx('pc.g'), n: 0 };
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  if (k0 === 'reloc') return Object.assign(base, { k: 'reloc' });
  if (k0 === 'place') return Object.assign(base, { k: 'place' });
  if (k0 === 'pass') return Object.assign(base, { k: 'side' });
  const caps = pos.capsOf(m);
  if (caps.some(c => pos.isQueen(c))) return Object.assign(base, { k: 'qcap', n: caps.length });
  if (caps.length) return Object.assign(base, { k: 'cap', n: caps.length });
  if (to === E.CENTER) return Object.assign(base, { k: 'throne' });
  if (f.hang.length) { const after = pos.clone().play(m); if (E.hanging(after, us).n < f.hang.length) return Object.assign(base, { k: 'save', sq: SQN(f.hang[0]), p: pcN(pos, f.hang[0]) }); }
  if (E.RING[to] === 1 && f.th[1]) return Object.assign(base, { k: 'block' });
  if (E.RING[to] === 1 && !pos.isQueen(fr)) return Object.assign(base, { k: 'ring' });
  if (E.RING[to] < E.RING[fr]) return Object.assign(base, { k: 'in' });
  return Object.assign(base, { k: 'side' });
}
const RCLS = { win: 'c-win', qcap: 'c-win', cap: 'c-mat', throne: 'c-win', ring: 'c-mat', block: 'c-def', save: 'c-def', reloc: 'c-dev', place: 'c-dev', in: 'c-dev', side: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return k.k === 'reloc' ? tx('tt.reloc', k) : k.k === 'place' ? tx('tt.place', k) : tx('tt.step', k); }
const catTxt = k => tx('x.' + k.k, k);
// --------------------------------------------------------------------------------------------- openings (the site's plans: openings.json)
const SETS = () => (typeof OPEN !== 'undefined' && OPEN && OPEN.sets) ? OPEN.sets : [];
const opName = s => (typeof LL === 'function' ? LL(s.title) : s.id);
function gameNames(i) { const p = E.Pos.from(null), out = []; for (let j = 0; j < i; j++) { out.push(E.name(p, moves[j])); p.play(moves[j]); } return out; }
function openingType(names) {
  if (gv !== 'std' || startSpec) return null;
  const live = SETS().filter(s => { const L = s.moves.split(' '); return names.every((x, j) => j >= L.length || x === L[j]); });
  const done = SETS().find(s => { const L = s.moves.split(' '); return names.length >= L.length && L.every((x, j) => names[j] === x); });
  if (!names.length) return null;
  if (done) return { name: opName(done), fixed: true };
  if (live.length === 1) return { name: opName(live[0]), fixed: false };
  return null;
}
// plan moves for the position after ply i: [{ u, kind, sets, done? }]
function bookAt(i) {
  if (startSpec || gv !== 'std' || i > 12) return null;
  const names = gameNames(i);
  const nx = new Map();
  for (const s of SETS()) {
    const L = s.moves.split(' ');
    if (L.length > i && names.every((x, j) => x === L[j])) { const u = L[i], e = nx.get(u) || { u, kind: 'book', sets: [] }; e.sets.push(s); if (L.length === i + 1) e.done = s; nx.set(u, e); }
  }
  return nx.size ? [...nx.values()] : null;
}
const isBook = (i, nm) => { const b = bookAt(i); return !!(b && b.some(x => x.u === nm)); };
// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, key: '', f: null, lists: new Map(), hov: null, items: null };
let card = null;
function usable() { return !!(!lesson && !puzzle && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online')); }
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || S.lists.get(k) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], dist: [0, 0], ring: [0, 0], th: [false, false], phase: 'move', hang: [], caps: 0, need: [9, 9], stage: 'mid' }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const L = list.slice().sort((a, b) => b.v - a.v), best = L[0].v, wb = wr(best);
  const items = [];
  for (const c of L.slice(0, 5)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const raceMoves = f => f.dist[1] - f.dist[0];
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.phase === 'queen' || f.phase === 'guard') add('tp.reloc', 100, {}, 1);
  if (f.phase === 'place') add('tp.place', 100, {}, 1);
  if (f.hang.length) add('tp.hang', 96, { sq: f.hang.map(SQN).join(tx('sep')) }, 1);
  if (f.caps) add('tp.capNow', 88, { n: f.caps }, 1);
  if (f.qNext) add('tp.throneOpen', 86, {}, 1);
  if (f.th[1]) add('tp.oppThrone', 80, {});
  if (f.need[1] <= 3) add('tp.oppNear', 84, { n: f.need[1] }, 1);
  if (f.ring[0] >= 5 && !f.th[0]) add('tp.five', 92, {}, 1);
  const r = raceMoves(f);
  if (r >= 3) add('tp.ahead', 50, { x: r }); else if (r <= -3) add('tp.behind', 50, { x: -r });
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage === 'open') { add('tp.open1', 24); add('tp.open2', 20); }
  else { add('tp.mid1', 26); add('tp.mid2', 18); }
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  if (isBook(i, nm)) return CoachKit.verdict(0, esc(tx('prev', { m: mv, q: tx('q.best') })), esc(tx('prevBook')));
  const L = listAt(i); if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT - 1000 && mine.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && mine.v < -(WINT - 1000)) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (mine.v >= best.v - 10) q = 'best';
  if (L.length === 1) q = 'best';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') {
        const bk = bookAt(i); if (bk) body = esc(tx('prevOff', { m: bk.map(x => x.u).slice(0, 2).join(tx('sep')) })) + ' ' + body;
        body += '<br>' + esc(tx(pos.capsOf(best.m).length > pos.capsOf(m).length ? 'lp.cap' : 'lp.hang'));
      }
    } else { const k = classify(pos.clone(), m, ff, mine.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function restNow(rv, can) {
  if (can || !card) return false;
  const b = document.body.classList, st = typeof settings !== 'undefined' ? settings : {};
  if (b.contains('in-online') || st.mode === 'online') return false;
  const ls = (typeof lesson !== 'undefined' && !!lesson) || (typeof puzzle !== 'undefined' && !!puzzle && typeof puzzle !== 'function') || b.contains('in-lesson') || b.contains('in-puzzle');
  if (rv && !ls) return false;
  if (ls || b.contains('in-edit') || b.contains('in-study') || b.contains('rated-live') || st.mode === 'watch') return true;
  return !usable();
}
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (AgonCoach.sw) AgonCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  const resting = restNow(rv, can);
  card.classList.toggle('ck-rest', resting);
  if (resting) {
    card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.rvWas = rv;
    S.items = null; S.hov = null;
    return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`);
  }
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { S.items = null; return; }
  if (over) {
    S.items = null;
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { S.items = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f = factsNow();
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!gameOver(cur) ? `<small>${esc(tx('st.' + (f.stage || 'mid')))}</small>` : ''}</h3>`;
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null ? wr(bv) : null;
  const cl = candInfo(list, f, pos);
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  const r = raceMoves(f);
  chips.push({ k: tx('race'), v: esc(r === 0 ? tx('race.even') : tx(r > 0 ? 'race.up' : 'race.down', { x: Math.abs(r) })), cls: r > 0 ? 'pos' : r < 0 ? 'neg' : '' });
  chips.push({ k: tx('ring'), v: esc(tx('ring.v', { t: tx(f.th[0] ? 'ring.on' : f.th[1] ? 'ring.opp' : 'ring.off'), n: f.ring[0] })), cls: f.th[0] ? 'pos' : f.th[1] ? 'neg' : '' });
  if (f.hang.length) chips.push({ k: tx('danger'), v: esc(tx('danger.v', { n: f.hang.length })), cls: 'neg' });
  const ot = openingType(gameNames(cur));
  if (ot && cur < 24) chips.push({ k: tx('senkei'), v: esc(tx(ot.fixed ? 'fixed' : 'moyo', { n: ot.name })) });
  h += CoachKit.summary(chips);
  const bk = f.legal.length > 1 ? bookAt(cur) : null;
  let opItems = null;
  if (bk) {
    opItems = [];
    for (const b of bk) {
      const m = E.parse(pos, b.u); if (m == null) continue;
      const fr = E.mFrom(m), sq = SQN(fr), to = SQN(E.mTo(m));
      const nm = b.done ? opName(b.done) : b.sets.map(opName).slice(0, 3).join(tx('sep'));
      opItems.push({ tag: tx('op.book'), cls: 'c-mat', title: esc(tx('op.next.t', { sq, to, p: pcN(pos, fr) })), text: gl(esc(tx(b.done ? 'op.done.x' : 'op.next.x', { n: nm }))), move: String(m), mvName: b.u, m });
    }
    if (!opItems.length) opItems = null;
  }
  if (opItems) {
    S.items = opItems.map(x => x.m);
    const intro = esc(tx('opIntro'));
    h += CoachKit.rec(tx('op.book'), gl(esc(tx('bkWhy'))), '');
    h += CoachKit.branches({ head: tx('opH'), intro: gl(intro), reveal: true, items: opItems });
  } else if (cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
    if (cl.forced) why = esc(tx('recForced'));
    else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
    });
  } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
  const tl = tipsOf(f, w, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => { const v = u == null ? null : +u; if (S.hov !== v) { S.hov = v; renderFx(); } },
    onPlay: u => { try { if (!active() || !myTurn() || !canHumanPlay()) return; const m = +u; if (!posAt(cur).pos.moves().includes(m)) return; S.hov = null; commit(m); } catch (e) {} },
  });
}
function fx(svg, pos) {
  if (!active() || !myTurn() || sel) return;
  const L = S.hov != null ? [S.hov] : [];
  const legal = pos.moves();
  for (const m of L) if (legal.includes(m)) svgArrow(svg, E.path(pos, m), 'ck');
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  AgonCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (AgonCoach.sw) AgonCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.AgonCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx, isBook, openingType };
})();
