// 2006年版の裁定にあわせて照合データ（PyMahjongGB の結果）を直す。各項目の根拠は claude/gbmj-spec.md「番種判定の裁定」。
'use strict';
function adapt(o, lib, mine) {
  const hits = [];
  const hit = r => hits.push(r);
  const has = id => !!lib[id];
  const all = o.hand.concat([o.win]);
  for (const m of o.melds) { if (m.k === 'chi') all.push(m.t, m.t + 1, m.t + 2); else all.push(m.t, m.t, m.t); }
  // R1 緑一色は混一色と複合する（2006年版 Fan 3「Combines with Full Flush and Half Flush」、例1・例2）
  if (has(3) && !has(22) && all.includes(32)) { lib[50] = 1; hit('R1'); }
  // R2 不求人：副露がなくツモなら不求人（暗槓は門前のまま＝3.6.8。七対・十三么・全不靠・七星不靠・九蓮・連七対も各 Fan の説明で「Fully Concealed may be combined」）
  // R3 九蓮宝灯は么九刻と複合しない（2006年版 Fan 4「Does not combine with … Pung of Terminals or Honors」。正誤表：峨眉山2007でも「一つ目も二つ目も不可」）
  if (has(4) && has(73)) { delete lib[73]; hit('R3'); }
  // R4 清么九は双同刻・三同刻と複合する（2006年版 Fan 8「Can combine with Double Pung or Triple Pung」、例「Double Pung (times two)」）。
  //    個数は自作の組み合わせ判定（套算一次）のもの。例の形は固定テスト（fan-test.js）でも確かめる
  if (has(8) && mine.ok) { for (const id of [65, 32]) { const f = mine.fans.find(x => x.id === id); if (f && lib[id] !== f.n) { lib[id] = f.n; hit('R4'); } } }
  // R5 独聴（辺張・嵌張・単釣）の判定で、自分が4枚とも持っている牌は待ちに数えない（5枚目は来ない）。
  //    PyMahjongGB は数えるので、その牌のせいで独聴でなくなったときだけ自作の待ちの番を写す
  if (mine.ok && mine.waits.length === 1 && !has(77) && !has(78) && !has(79) &&
      mine.alts.every(r => r.fans.some(f => f.id >= 77 && f.id <= 79))) {
    const c = new Array(34).fill(0); for (const t of all) c[t]++;
    const held4 = new Set(); for (let t = 0; t < 34; t++) if (c[t] - (t === o.win ? 1 : 0) >= 4) held4.add(t);
    if (held4.size) for (const id of [77, 78, 79]) { const f = mine.fans.find(x => x.id === id); if (f) { lib[id] = 1; hit('R5'); } }
  }
  const open = o.melds.some(m => m.k !== 'ankan');
  if (!open && o.tsumo && !has(56)) { lib[56] = 1; delete lib[80]; delete lib[62]; hit('R2'); }
  return hits;
}
module.exports = { adapt };
