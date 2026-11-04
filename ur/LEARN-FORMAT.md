# ウル王朝のゲーム — 「学ぶ」ファイルの形式と入口（担当L → 本体担当A）

担当L が作るファイル：`ur/tour.js`（ルールのチュートリアル）、`ur/lessons.json`（レッスン）、`ur/puzzles.json`（次の一手パズル）。
生成・点検：`ur/tools/gen_lessons.js`・`check_lessons.js`・`gen_puzzles.js`・`audit_puzzles.js`、確認用 `ur/tools/tour-demo.html`。

座標・駒の位置はすべて **エンジンの path index**（0＝盤外, 1〜14＝盤上, 15＝ゴール）。局面 `s` は
`{ rule:'finkel', pos:[[7個],[7個]], turn:0 }`（blitz は5個）。**問題はすべて「手番＝明（side 0、下の列）」に正規化済み**。
手は `[from, to]`（例 `[0,3]`＝入場→3、`[12,15]`＝ゴール）。エンジンの手は `E.legalMoves(s,n).find(m => m.from===from)`
（同じ from の手は1つなので from だけで特定できる）。

---------------------------------------------------------------------
## 1. ルールのチュートリアル `ur/tour.js`

読み込み順：`shared/ruletour.js` → `ur/engine.js` → `ur/board2d.js` → `ur/tour.js`。

```js
UrTour.open({
  mount: '#rulesBody',        // 一覧ダイアログ（ルール｜レッスン｜パズル のタブ付き）の中身の要素
  lang: () => LANG,           // 関数または文字列（ja,en,zh,ko,es,fr,pt,de,hi,ar）
  design: 'museum',           // 盤（museum/restored/wood/clay）
  pieces: 'orig',             // 駒（orig/ivory/wood/gold）
  speed: 1,                   // 駒アニメの速さ（任意）
  page: undefined,            // 開くページ（省略時：前回のページ、初回は 0）
  onPlay: () => {...},        // 最後のページ「対局してみる」（ダイアログを閉じて対局設定を開くなど）
  onLessons: () => {...},     // 最後のページ「レッスンへ進む」
  onClose: () => {...},       // 下端の「閉じる」
  sound: k => {...},          // 'ok' | 'ng' | 'move' | 'cap' | 'roll'（任意。正解音・やさしい誤答音・駒音）
});
UrTour.render();              // 言語を変えたとき（表示中なら描き直す）
UrTour.setDesign(design, pieces);  // デザインを変えたとき
UrTour.stop();                // ダイアログを閉じるとき（タイマー・アニメを止める）。onClose の中で呼ばなくてよい（自動）
UrTour.visible();             // 表示中か
UrTour.progress();            // { done, total }（クリア済みページ数。一覧のバッジ等に）
UrTour.PAGES                  // ページ id の配列
```
- 進み具合は localStorage `aicoding-ur-rules`（RuleTour の store）。
- 盤は `UrBoard2D.mount` の本物の盤（向きは常に横 'h'）＋盤の下にサイコロ4個と［振る］ボタン（スペースキーでも振れる）。
- ページ：①紹介（RuleTour.intro）②盤と道 ③サイコロ ④入場 ⑤進む ⑥自分の駒には止まれない ⑦取る ⑧ロゼットでもう一度
  ⑨中央のロゼットは安全 ⑩ちょうどの目でゴール ⑪0・動けないときはパス ⑫勝ち方 ★これで遊べます（RuleTour の最終ページ）。
- 本体の HTML 側に必要なもの：バックギャモンと同じ `#rulesOverlay .modal > .ls-tabs + #rulesBody`（CSS も同様に
  `#rulesBody{flex:1;min-height:0;display:flex;flex-direction:column}` `#rulesBody > .rt{flex:1;min-height:0}`、PC は
  `#rulesOverlay .modal{width:min(1000px,calc(100vw - 64px));height:min(880px,calc(100vh - 20px))}`）。tour.js は自分の CSS を注入する。

---------------------------------------------------------------------
## 2. レッスン `ur/lessons.json`（12レッスン、各：概念→例題→やさしい練習→採点5問）

```jsonc
{
  "version": 1, "rule": "finkel",
  "score": { "per":20, "pass":75, "hint":[16,12], "retry":10, "answer":0 },  // 1問20点×5＝100点、75点で合格
  "ui":  { "<key>": {"ja":"…", "en":"…", …10言語} },   // 共通の文言（{n} 等は置換）
  "msg": { "<key>": {10言語 ひな形} },                    // 理由文のひな形。why / ng は ["key",{params}]
  "cats": [ { "id":"basic", "name":{10言語}, "steps":["prob","rosette","center","hold","enter"] },
            { "id":"tactics", … ["danger","escape","capture","choose"] }, { "id":"end", … ["goal","race"] }, { "id":"vari", … ["blitz"] } ],
  "steps": [ {
     "id":"prob", "cat":"basic", "rule":"finkel"|"blitz",
     "title":{10言語}, "tip":{10言語}, "body":{10言語 HTML <p><b>},
     "diagram": { "s":局面, "marks":[mark…] },     // カードのサムネイル（UrBoard2D.mini(s,{marks})）
     "ramp": [ explain, try ],                     // 採点しない準備（ui.rampStep / rampSkip / rampNote）
     "problems": [ Problem ×5 ],
     "hints": [ {10言語}, {10言語} ]              // ヒント1段目・2段目の文（2段目では problem.look の印も出す）。3段目＝答え（ui.ans）
  } ]
}
```
採点の目安（`score`）：一発正解20、ヒント1で16、ヒント2で12、誤答の後に正解10、答えを見たら0。合計75以上で合格。

### ramp
```jsonc
{ "k":"explain", "s":局面, "n":出目|null, "seq":[[from,to],…],  // 実演：seq の手を順に動かして見せる（空なら図だけ）
  "marks":[mark…], "t":{10言語 見出し}, "body":{10言語 HTML} }
{ "k":"try", "s":局面, "n":出目, "ok":[[from,to]], "marks":[], "look":[mark…],   // 手を指す練習（ok を指せば正解、何度でも）
  "t":{10言語 課題}, "h":{10言語 ヒント}, "g":{10言語 正解時}, "y":{10言語 誤答時} }
{ "k":"try", "kind":"choice", "s"?:局面, "marks"?:[…], "opts":["0","1",…], "ans":番号, "t","h","g","y" }   // 選ぶ練習
```

### Problem（採点問題）
```jsonc
{ "kind":"move", "s":局面, "n":出目, "ok":[[from,to]], "best":[from,to],
  "ev":[[from,to,wp],…],               // 全候補の勝率（良い順、深さ3）。誤答時「この手は x%」の表示に
  "why":["msgKey",{params}],           // 正解の理由（msg のひな形に params を入れる）
  "ng":{ "<from>":["msgKey",{params}] },   // 誤答ごとの理由（指した手の from で引く）
  "look":[mark…] }                     // ヒント2段目で出す印（危険な駒・ロゼット・取れる相手）
{ "kind":"choice", "s"?:局面, "marks"?:[…], "q":{10言語 問い}, "opts":["4/16",…] | [{10言語},…], "ans":番号, "why":["msgKey",{params}] }
```
問いの文：move は `ui.qMove`（{n}＝出目）。choice は `q`。正解・誤答の見出しは `ui.correct` / `ui.wrong`。
手の表記（答えの表示など）は `from→to`、from=0 は `ui.enter`、to=goal は `ui.home`。

### mark（UrBoard2D の marks にそのまま渡せる）
`{r,c,type:'danger'|'safe'|'ring'|'glow'|'dot'|'text',text?,color?,size?}`、`{type:'arrow',from:{r,c}|{tray,side},to:…,color}`。
問題の盤は `UrBoard2D.mount`（手番＝明、手前の列）で表示し、明の駒をタップ→行き先（または盤外の列・ゴールの列）で答える。
**blitz のレッスン（id 'blitz'）は s.rule='blitz'（各5枚、goal=17）**。

---------------------------------------------------------------------
## 3. パズル `ur/puzzles.json`（PZBook 形式、201問・8テーマ）

```jsonc
{
  "version": 1, "rule": "finkel", "ui":{…}, "msg":{…},       // lessons.json と同じ ui / msg
  "cats": [ { "id":"basic", "name":{10言語} }, { "id":"tactics", … }, { "id":"end", … } ],   // カテゴリのタブ
  "daily": ["rosette", …],                                      // 日替わりに使うテーマ id
  "themes": [ {
     "id":"capture", "cat":"tactics", "name":{10言語}, "desc":{10言語 2行説明}, "hint":{10言語 ヒント1段目},
     "puzzles":[ { "id":"capture-1", "s":局面, "n":出目, "ok":[[from,to]], "best":[from,to],
                   "ev":[[from,to,wp],…], "gap":0.37,          // 最善と次善の勝率差（大きい＝易しい。易しい順に並ぶ）
                   "why":["msgKey",{params}], "ng":{…}, "look":[mark…] } ]   // 10問ずつ PZBook の STAGE
  } ]
}
```
テーマ（表示順）：rosette 28・center 30・enter 24（basic）／capture 32・escape 22・safe 24（tactics）／goal 22・race 19（end）。
星は `PZBook.starsFor`（★★★一発・★★ヒント/誤答後・★答えを見た）。ヒント：1段目 theme.hint、2段目 puzzle.look の印、3段目 答え。
記録は本体の `aicoding-ur-puzzles`。サムネイル：`UrBoard2D.mini(s, { design, pieces, crop:'board' })`。

---------------------------------------------------------------------
## 4. 作り直し・点検
```
node ur/tools/gen_puzzles.js  [--cache DIR]   // 先に（レッスンはパズルと同じ局面を避ける）
node ur/tools/gen_lessons.js  [--cache DIR]
node ur/tools/audit_puzzles.js [--deep]       // 合法性・深さ3での最善一致・重複・10言語・易しい順
node ur/tools/check_lessons.js                // 同上＋choice の答えを hitRisk / raceCount で再計算・理由文と手の性質の一致
```
文言は `ur/tools/learn_text.js`、局面プール・手の分類は `ur/tools/learn_common.js`。
