/* わからせ将棋オーバーキル！ — piece names, labels, descriptions and UI text (ja / en; the other languages to follow) */
(function (G) {
  'use strict';
  // labels on the pieces (two characters stack vertically)
  const LABEL = {
    ja: { FU: '歩', KY: '香', KE: '桂', GI: '銀', KI: '金', KA: '角', HI: '飛', OU: '玉', OU1: '王', TO: 'と', NY: '杏', NK: '圭', NG: '全', UM: '馬', RY: '龍',
      PAWN: '卒', KNIGHT: '騎士', BISHOP: '僧正', ROOK: '城塔', QUEEN: '女王', AMAZON: '女傑', CANNON: '大砲', LION: '獅子', ARCHER: '弓兵', MUSKET: '鉄砲', MERC: '傭兵', BARRIER: '結界', BOMBER: '爆弾', ALCH: '錬金', SAGE: '賢者', CHRONO: '時術', KAGE: '影武', GENERAL: '将軍' },
    en: { FU: 'P', KY: 'L', KE: 'N', GI: 'S', KI: 'G', KA: 'B', HI: 'R', OU: 'K', OU1: 'K', TO: '+P', NY: '+L', NK: '+N', NG: '+S', UM: '+B', RY: '+R',
      PAWN: 'p', KNIGHT: 'Kn', BISHOP: 'Bi', ROOK: 'Ro', QUEEN: 'Q', AMAZON: 'Am', CANNON: 'Ca', LION: 'Li', ARCHER: 'Ar', MUSKET: 'Mu', MERC: 'Me', BARRIER: 'Wa', BOMBER: 'Bo', ALCH: 'Al', SAGE: 'Sa', CHRONO: 'Ch', KAGE: 'Do', GENERAL: 'Ge' },
  };
  const NAME = {
    ja: { FU: '歩兵', KY: '香車', KE: '桂馬', GI: '銀将', KI: '金将', KA: '角行', HI: '飛車', OU: '玉将',
      PAWN: 'ポーン', KNIGHT: 'ナイト', BISHOP: 'ビショップ', ROOK: 'ルーク', QUEEN: 'クイーン', AMAZON: 'アマゾン', CANNON: '大砲', LION: '獅子', ARCHER: '弓兵', MUSKET: '鉄砲足軽', MERC: '傭兵', BARRIER: '結界師', BOMBER: '爆弾兵', ALCH: '錬金術師', SAGE: '賢者', CHRONO: '時の術師', KAGE: '影武者', GENERAL: '将軍' },
    en: { FU: 'Pawn', KY: 'Lance', KE: 'Knight', GI: 'Silver', KI: 'Gold', KA: 'Bishop', HI: 'Rook', OU: 'King',
      PAWN: 'Chess pawn', KNIGHT: 'Chess knight', BISHOP: 'Chess bishop', ROOK: 'Chess rook', QUEEN: 'Queen', AMAZON: 'Amazon', CANNON: 'Cannon', LION: 'Lion', ARCHER: 'Archer', MUSKET: 'Musketeer', MERC: 'Mercenary', BARRIER: 'Warder', BOMBER: 'Bomber', ALCH: 'Alchemist', SAGE: 'Sage', CHRONO: 'Chronomancer', KAGE: 'Body double', GENERAL: 'General' },
  };
  const DESC = {
    ja: {
      PAWN: '前に1マス（最初だけ2マス）。取るのは斜め前だけ。敵陣に入るとクイーンになる。', KNIGHT: '八方に桂馬跳び（チェスのナイト）。', BISHOP: '角と同じ動き。成らない。', ROOK: '飛車と同じ動き。成らない。',
      QUEEN: '縦横斜めにどこまでも。', AMAZON: 'クイーン＋ナイト。最強クラス。', CANNON: '飛車のように動く。取るときは駒をちょうど1枚跳び越えて取る。', LION: '2マス以内ならどこへでも跳べる。隣の敵は動かずに取れる（居食い）。',
      ARCHER: '銀の動き。2マス前の敵を動かずに射抜ける（間が空いているとき）。', MUSKET: '歩の動き。1回だけ、前方まっすぐの最初の敵を撃ち抜く。撃つとふつうの歩になる。', MERC: '金の動き。取られても相手の持ち駒にならない。',
      BARRIER: '銀の動き。周り8マスには相手が駒を打てない。', BOMBER: '歩の動き。取られると爆発し、取った駒と周り8マスの駒（玉以外）を消す。', ALCH: '銀の動き。6手に1回、隣の自分の歩を金に変える。',
      SAGE: '金の動き。5手に1回、相手の持ち駒にある自分の駒を1枚取り戻し、周りに置く（蘇生）。', CHRONO: '玉の動き（玉ではない）。1局に1回、2手戻せる。', KAGE: '玉の動き。玉の代わりにもなる：本物の玉と影武者の両方を取られないと負けない。',
      GENERAL: '玉の動き（玉ではない）。1局に1回、核スイッチで即引き分け。勝ちにはならない保険。',
      std: 'ふつうの将棋の駒。取られると相手の持ち駒になる。',
    },
    en: {
      PAWN: 'One step forward (two on its first move), captures diagonally forward. Becomes a queen in the enemy camp.', KNIGHT: 'Leaps like a chess knight in all eight directions.', BISHOP: 'Moves as the bishop. Never promotes.', ROOK: 'Moves as the rook. Never promotes.',
      QUEEN: 'Any distance in all eight directions.', AMAZON: 'Queen plus knight.', CANNON: 'Moves as a rook; captures by leaping exactly one piece.', LION: 'Leaps to any square within two steps; can take a neighbour without moving.',
      ARCHER: 'Moves as a silver. Shoots an enemy two squares ahead without moving (if the square between is empty).', MUSKET: 'Moves as a pawn. Once, shoots the first enemy straight ahead; then becomes a normal pawn.', MERC: 'Moves as a gold. Never goes to the opponent’s hand.',
      BARRIER: 'Moves as a silver. The opponent cannot drop on the eight squares around it.', BOMBER: 'Moves as a pawn. When captured it explodes: the capturer and every piece around (kings excepted) are gone.', ALCH: 'Moves as a silver. Every 6 moves turns a neighbouring pawn of yours into a gold.',
      SAGE: 'Moves as a gold. Every 5 moves takes one of your pieces back from the opponent’s hand and places it beside itself.', CHRONO: 'Moves as a king (not royal). Once per game, takes back two moves.', KAGE: 'Moves as a king and is royal too: you lose only when both kings are taken.',
      GENERAL: 'Moves as a king (not royal). Once per game, the nuclear switch ends the game as a draw at once.',
      std: 'A normal shogi piece. Goes to the opponent’s hand when captured.',
    },
  };
  const T = {
    ja: {
      title: 'わからせ将棋オーバーキル！', sub: 'チート駒でデッキを組んで、強いAIをわからせろ', alpha: 'アルファ版',
      modeW: 'わからせ', modeWd: '低いデッキコストで強いAIに勝つ。レベルごとの最小コストが記録になる。', modeO: 'オーバーキル', modeOd: 'コスト無制限。好きなだけ盛ってAIを粉砕しよう。',
      lv: 'AIの強さ', best: '最小', none: '—', build: 'デッキを組む', start: '対局開始', back: '戻る', reset: '初期配置', clear: '全部外す', presets: 'プリセット', save: '保存', load: '読込', slot: '枠',
      std: '通常駒', spec: '特殊駒', cost: 'デッキコスト', remove: '外す', placeHint: '駒を選んで、自陣3段（光っているマス）をクリック。置いてある駒をクリックすると外せます。',
      p_king: '玉はちょうど1枚', p_nifu: '二歩になっている', p_dead: '動けない場所に駒がある', p_check: '最初から相手の玉に王手がかかっている', ok: 'このデッキで対局できます',
      you: 'あなた', ai: 'AI', thinking: '考え中…', yourTurn: 'あなたの番', check: '王手', ability: '能力', fire: '撃つ', nuke: '核スイッチ', undo2: '2手戻す', resign: '投了',
      promote: '成りますか？', yes: '成る', no: '成らない', win: 'わからせ成功！', lose: '負け…', draw: '引き分け', nukeDraw: '核スイッチで引き分け', rep: '千日手で引き分け', again: 'もう一局', toDeck: 'デッキを直す', home: 'タイトルへ',
      record: '新記録', rec: 'Lv.{lv} 最小コスト {c}', costOf: 'コスト', ready: '使用可', cool: 'あと{n}手', used: '使用済み', boom: 'ドカーン！',
      over: 'オーバーキル！', crush: '{n}手で粉砕', kills: '取った駒 {n}', hand: '持ち駒', log: '棋譜', rules: 'ルール',
      rulesBody: '<p>ふつうの将棋のルールで、相手の玉を詰ませるか取れば勝ち。</p><p><b>デッキ</b>：自陣3段（27マス）の中で、空きマスに駒を足したり、元の駒を外して別の駒にしたりできます。初期配置がコスト0。足した駒のコストを足し、外した駒の価値（歩1・香3・桂4・銀5・金6・角8・飛10）を引きます。マイナスで勝てば最高のわからせ。</p><p><b>特殊駒</b>は取られると消えます（相手の持ち駒にならない）。チートはあなただけ。</p><p>能力のある駒を選ぶと、能力の的が赤い照準で出ます。能力を使うとその手番は終わりです。</p>',
      tier: ['入門', '初級', '中級', '上級', '最上級'],
    },
    en: {
      title: 'Shogi Overkill!', sub: 'Build a deck of cheat pieces and teach the strong AI a lesson', alpha: 'Alpha',
      modeW: 'Lesson', modeWd: 'Beat a strong AI with the cheapest deck you can. Your lowest winning cost per level is your record.', modeO: 'Overkill', modeOd: 'No cost limit. Pile it on and crush the AI.',
      lv: 'AI strength', best: 'Best', none: '—', build: 'Build a deck', start: 'Start', back: 'Back', reset: 'Standard setup', clear: 'Remove all', presets: 'Presets', save: 'Save', load: 'Load', slot: 'Slot',
      std: 'Shogi pieces', spec: 'Special pieces', cost: 'Deck cost', remove: 'Remove', placeHint: 'Pick a piece, then click a glowing square in your three ranks. Click a placed piece to remove it.',
      p_king: 'Exactly one king', p_nifu: 'Two pawns on a file', p_dead: 'A piece that can never move', p_check: 'The AI’s king is in check from the start', ok: 'This deck is ready',
      you: 'You', ai: 'AI', thinking: 'Thinking…', yourTurn: 'Your move', check: 'Check', ability: 'Ability', fire: 'Fire', nuke: 'Nuclear switch', undo2: 'Take back 2', resign: 'Resign',
      promote: 'Promote?', yes: 'Promote', no: 'Stay', win: 'Lesson taught!', lose: 'You lost…', draw: 'Draw', nukeDraw: 'Nuclear switch: draw', rep: 'Draw by repetition', again: 'Play again', toDeck: 'Edit deck', home: 'Title',
      record: 'New record', rec: 'Lv.{lv} best cost {c}', costOf: 'Cost', ready: 'Ready', cool: '{n} more', used: 'Used', boom: 'BOOM!',
      over: 'OVERKILL!', crush: 'Crushed in {n} moves', kills: 'Captured {n}', hand: 'Hand', log: 'Moves', rules: 'Rules',
      rulesBody: '<p>Shogi rules: mate or capture the opponent’s king to win.</p><p><b>Deck</b>: in your three ranks you may add pieces on empty squares or swap the standard pieces for others. The standard setup costs 0; added pieces add their cost, removed ones subtract their value (pawn 1, lance 3, knight 4, silver 5, gold 6, bishop 8, rook 10). Winning below zero is the ultimate lesson.</p><p><b>Special pieces</b> vanish when captured — the cheats are yours alone.</p><p>Select a piece with an ability to see its targets (red crosshairs). Using an ability ends your turn.</p>',
      tier: ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'],
    },
  };
  // presets (rows 6..8 as 27 strings, '' = empty)
  const PRESETS = [
    { ja: '女王さま', en: 'The Queen', rows: ['FU FU FU FU FU FU FU FU FU', '. KA . . . . . QUEEN .', 'KY KE GI KI OU KI GI KE KY'] },
    { ja: '爆弾の壁', en: 'Bomb wall', rows: ['BOMBER BOMBER BOMBER FU FU FU BOMBER BOMBER BOMBER', '. KA . . . . . HI .', 'KY KE GI KI OU KI GI KE KY'] },
    { ja: '影武者と将軍', en: 'Double & General', rows: ['FU FU FU FU FU FU FU FU FU', '. KA . . GENERAL . . HI .', 'KY KE GI KI OU KAGE GI KE KY'] },
    { ja: '玉と飛車だけ', en: 'King and rook', rows: ['. . . . . . . . .', '. . . . . . . HI .', '. . . . OU . . . .'] },
  ];
  G.OverkillData = { LABEL, NAME, DESC, T, PRESETS };
})(typeof self !== 'undefined' ? self : this);
