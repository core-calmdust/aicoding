// JANKA skills. A character's skill is rolled in the gacha together with a skill rarity (tier 0..3 = N, R, SR, SSR);
// higher tiers make the same effect a little stronger (P[tier]).
// timing 'deal': chosen right after the deal (point-multiplier skills). timing 'turn': used on the owner's own turn.
// Once per hand. First use in a game is free, then `cost`, doubling each time (paid into the pot).
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('./engine.js') : null);
const T = id => id >> 2;
const L = (ja, en) => ({ ja, en });
const pct = v => Math.round(v * 100);

const SKILLS = [
  { id: 'wareme', timing: 'deal', cost: 1000, icon: 'crack', color: '#b06cff', P: [2, 2.1, 2.2, 2.3],
    name: L('割れ目', 'Crack'), short: v => L(`点数×2（もらう×${v}）`, `Points ×2 (win ×${v})`),
    desc: v => L(`この局、あなたが払う点は2倍、もらう点は${v}倍になる（和了・放銃・ツモ払い・テンパイ料）。`, `This hand, points you pay are doubled and points you receive are ×${v} (wins, deal-ins, tsumo payments, tenpai payments).`),
    use(g, s, v) { g.P[s].fx.wareme = v; } },
  { id: 'hanup', timing: 'deal', cost: 500, icon: 'flame', color: '#ff7a3d', P: [0, 10, 20, 30],
    name: L('紅蓮の一翻', 'Crimson Han'), short: v => L(v ? `和了+1翻・+${v}符` : '和了+1翻', v ? `+1 han, +${v} fu` : '+1 han'),
    desc: v => L(`この局、あなたの和了に1翻を加える（役があるとき）${v ? `。さらに符が${v}符増える` : ''}。`, `This hand, your win gets +1 han (when it has a yaku)${v ? ` and +${v} fu` : ''}.`),
    use(g, s, v) { g.P[s].fx.hanup = { fu: v }; } },
  { id: 'doraplus', timing: 'turn', cost: 800, icon: 'gem', color: '#ffc23d', P: [0, 0.2, 0.35, 0.5],
    name: L('ドラ増し', 'Extra Dora'), short: v => L(v ? `新ドラ2枚・自分の牌に${pct(v)}%` : '新ドラ2枚', v ? `2 new dora, ${pct(v)}% yours` : '2 new dora'),
    desc: v => L(`新しいドラ表示牌を2枚めくる（全員に有効）。${v ? `1枚ごとに${pct(v)}%の確率で、あなたの手牌にある牌がドラになる。` : ''}`, `Reveal two more dora indicators (they count for everyone).${v ? ` Each has a ${pct(v)}% chance to make a tile in your hand the dora.` : ''}`),
    can(g) { return g.doraIdx.length < 4; },
    async use(g, s, v) { for (let k = 0; k < 2; k++) { if (v && g.rand() < v) rigDora(g, s); await g.revealDora(); } } },
  { id: 'guard', timing: 'deal', cost: 700, icon: 'shield', color: '#5ab0ff', P: [0.5, 0.45, 0.4, 0.35],
    name: L('鉄壁', 'Iron Wall'), short: v => L(`支払い×${v}`, `Pay ×${v}`),
    desc: v => L(`この局、あなたが払う点が${v}倍になる（放銃・ツモ払い・ノーテン罰符）。`, `This hand, points you pay are ×${v} (deal-ins, tsumo payments, no-ten payments).`),
    use(g, s, v) { g.P[s].fx.guard = v; } },
  { id: 'lure', timing: 'turn', cost: 1400, icon: 'magnet', color: '#3dd68c', P: [1, 6, 12, 99],
    name: L('引き寄せ', 'Lure'), short: v => L(v > 1 ? '有効牌ツモ×2（良形寄り）' : '有効牌ツモ×2', v > 1 ? 'Good draws ×2 (better)' : 'Good draws ×2'),
    desc: v => L(`次の2回のツモが、山に残っていれば向聴数が進む牌になる。${v > 1 ? `候補${v > 50 ? 'すべて' : `${v}枚`}から受け入れが最も広がる牌を選ぶ。` : ''}`, `Your next 2 draws become tiles that improve your hand, if any remain in the wall.${v > 1 ? ` Picks the one that widens your waits most from ${v > 50 ? 'all' : v} candidates.` : ''}`),
    use(g, s, v) { g.P[s].fx.lure = 2; g.P[s].fx.lureW = v; } },
  { id: 'mind', timing: 'turn', cost: 2000, icon: 'eye', color: '#ff6fb5', P: [0, 1, 2, 3],
    name: L('読心', 'Mind Read'), short: v => L(v ? `他家の手を読む＋${v}枚` : '他家の手を読む', v ? `Read hands +${v} tiles` : 'Read hands'),
    desc: v => L(`他家3人の向聴数と、テンパイなら待ち牌を見る。${v ? `さらに各自の手牌を${v}枚ずつ見る。` : ''}`, `See how close each opponent is to ready, and their waits if they are ready.${v ? ` Also see ${v} tile${v > 1 ? 's' : ''} of each hand.` : ''}`),
    use(g, s, v) {
      const out = [];
      for (let k = 1; k <= 3; k++) {
        const q = (s + k) % 4, p = g.P[q];
        const c = MJ.countsIds(p.hand);
        const sh = MJ.shanten(c, p.melds.length);
        const show = p.hand.slice().sort(() => g.rand() - .5).slice(0, v).sort((a, b) => a - b);
        out.push({ seat: q, shanten: sh, waits: sh === 0 ? MJ.waits(c, p.melds.length) : [], show });
      }
      g.P[s].fx.read = out;
      return { read: out };
    } },
  { id: 'peek', timing: 'turn', cost: 1000, icon: 'scope', color: '#7fd3ff', P: [3, 4, 5, 6],
    name: L('先読み', 'Foresight'), short: v => L(`次のツモ${v}回`, `Next ${v} draws`),
    desc: v => L(`鳴きが入らなければ引くことになる、あなたの次の${v}回のツモ牌を見る。`, `See the tiles of your next ${v} draws (if nobody calls).`),
    use(g, s, v) {
      const ids = [];
      for (let k = 0; k < v; k++) { const i = g.livePos + 3 + k * 4; if (i < g.liveEnd) ids.push(g.wall[i]); }
      g.P[s].fx.peek = ids;
      return { peek: ids };
    } },
  { id: 'swap', timing: 'turn', cost: 400, icon: 'swap', color: '#9aa7ff', P: [3, 4, 5, 6],
    name: L('すり替え', 'Switch'), short: v => L(`次の${v}枚から良い牌に`, `Best of next ${v}`),
    desc: v => L(`今ツモった牌を、山の次の${v}枚のうち手がいちばん進む牌と入れ替える。`, `Swap the tile you just drew for the best of the next ${v} tiles in the wall.`),
    can(g, s) { return g.curSeat === s && g.curDrawn != null && g.liveLeft() > 1 && !g.P[s].fx.swapped; },
    use(g, s, v) {
      const p = g.P[s], old = g.curDrawn;
      const base = p.hand.filter(x => x !== old);
      const score = id => {
        const c = MJ.countsIds(base.concat([id]));
        let best = 9;
        for (let d = 0; d < 34; d++) if (c[d]) { c[d]--; best = Math.min(best, MJ.shanten(c, p.melds.length)); c[d]++; }
        return -best * 10 - (MJ.isHonor(id >> 2) ? 1 : 0);
      };
      let bi = -1, bv = score(old);
      const n = Math.min(v, g.liveLeft());
      for (let k = 0; k < n; k++) { const sc = score(g.wall[g.livePos + k]); if (sc > bv) { bv = sc; bi = g.livePos + k; } }
      if (bi < 0) bi = g.livePos;
      const nw = g.wall[bi];
      g.wall[bi] = old;
      p.hand[p.hand.indexOf(old)] = nw;
      p.fx.swapped = nw;
      return { from: old, to: nw };
    } },
  { id: 'seal', timing: 'turn', cost: 500, icon: 'lock', color: '#c6a0ff', P: [0, 0.1, 0.2, 0.3],
    name: L('封じ', 'Seal'), short: v => L(v ? `他家のリーチ封じ・放銃${pct(v)}%引き` : '他家のリーチ封じ', v ? `No riichi for others, deal-in −${pct(v)}%` : 'No riichi for others'),
    desc: v => L(`この局、他家はこれからリーチできない（すでにしたリーチはそのまま）。${v ? `あなたが放銃したときの支払いが${pct(v)}%減る。` : ''}`, `This hand, the others can no longer declare riichi (riichi already declared stays).${v ? ` Your deal-in payments are ${pct(v)}% lower.` : ''}`),
    use(g, s, v) { g.P[s].fx.seal = 1 - v; } },
  { id: 'shugi', timing: 'deal', cost: 700, icon: 'coin', color: '#ffd76a', P: [800, 900, 1000, 1100],
    name: L('祝儀', 'Bounty'), short: v => L(`赤・裏・一発で${v}点`, `Red/ura/ippatsu ${v}`),
    desc: v => L(`この局であなたが和了すると、赤ドラ・裏ドラ・一発1つにつき他家全員から${v}点ずつ。`, `If you win this hand, each red five, ura dora and ippatsu earns ${v} from every opponent.`),
    use(g, s, v) { g.P[s].fx.shugi = v; } },
  { id: 'pot', timing: 'deal', cost: 700, icon: 'chest', color: '#ffab4d', P: [2, 2.2, 2.4, 2.6],
    name: L('総取り', 'Jackpot'), short: v => L(`供託・積み棒×${v}`, `Pot & honba ×${v}`),
    desc: v => L(`この局であなたが和了すると、供託と積み棒の点が${v}倍になる（増えた分は他家3人が払う）。`, `If you win this hand, the pot and honba bonus are ×${v} (the other three pay the extra).`),
    use(g, s, v) { g.P[s].fx.pot = v; } },
];
const BY = {}; for (const s of SKILLS) BY[s.id] = s;

// Extra Dora (higher tiers): put an indicator for a tile in the owner's hand at the next indicator spot,
// swapped in from the unseen live wall.
function rigDora(g, s) {
  const idx = 4 + g.doraIdx.length * 2;
  if (idx >= g.dead.length) return;
  const mine = [...new Set(g.P[s].hand.map(T))].sort(() => g.rand() - .5);
  for (const t of mine) {
    for (let ind = 0; ind < 34; ind++) {
      if (MJ.doraOf(ind) !== t) continue;
      for (let j = g.livePos + 4; j < g.liveEnd; j++) {
        if (T(g.wall[j]) === ind) { const x = g.dead[idx]; g.dead[idx] = g.wall[j]; g.wall[j] = x; return; }
      }
    }
  }
}

// gacha weights (%) for skill rarity
const TIERS = ['N', 'R', 'SR', 'SSR'];
const TIER_W = [55, 30, 12, 3];
// Points one use is worth at tier N (paired BOT simulation, tools/skill-value.js, 2026-10-23). The 2nd-use cost is set
// to about this value. Mind Read and Foresight are information a BOT barely uses but a person can (knowing every
// opponent's waits is near-perfect defence), so their costs are set by hand well above the BOT value: 2000 / 1000.
const VALUE = {wareme: 1033, hanup: 547, guard: 658, shugi: 718, pot: 671, doraplus: 807, lure: 1399, mind: 530, peek: 0, swap: 440, seal: 547};
const val = (sk, t) => sk.P[Math.max(0, Math.min(3, t | 0))];
const MJSkills = { list: SKILLS, get: id => BY[id], value: VALUE, TIERS, TIER_W, val,
  key: (id, t) => `${id}:${t | 0}`, parse: k => { const [id, t] = String(k).split(':'); return { id, tier: +t || 0 }; } };
if (typeof module !== 'undefined' && module.exports) module.exports = MJSkills;
else root.MJSkills = MJSkills;
})(typeof window !== 'undefined' ? window : globalThis);
