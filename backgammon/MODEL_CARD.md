# バックギャモン（backgammon/）— AI とマルチスレッドの記録

仕様書（`claude/<game>-spec.md`）のないゲームなので、AI・マルチスレッドの決定と実測はここに書く。AI の本体は `bg.js`（GNUbg 風の入力の自前ネット＋wildbg のネット、ベアオフのデータベース）、AI の Worker は `engine.js`。**2026-11-11 から評価と探索は C（`engine.c` → `engine_simd.wasm`／`engine.wasm`）**で、`bg.js` は手の生成（画面用）・候補手の絞り込み（`analyzePlays`）・キューブ・UI と、C が使えないときの代わり。

## 評価と探索の C 化（2026-11-11、`engine.c`）

- **移したもの**：手の生成（`genPlays`、同じ手を同じ順に）、速いネット（`weights.json`、GNUbg 風の入力の contact／race）、強いネット（wildbg の contact／race、float16 → float32）、ベアオフのデータベース、相手の返し手の選び方（速いネットの上位2手を強いネットで比べる `hybReply`）と 1-ply・2-ply の期待値の探索（`hyb1`／`hyb2` を n-ply に一般化した `bg_ply`、`plyRoll` の出目ごとの項）。`bg.js` の `BG.setWasm` が `evalPos`／`evalFast`／`evalPly`／`hyb1`／`hyb2`／`plyRoll` を C に回す。`engine.js` が `WebAssembly.validate` で `engine_simd.wasm`（SIMD：全結合層を4つずつ）か `engine.wasm`（SIMD なし：同じ4列・同じ順の足し算＝同じ数値）を読み、読めないとき・`?nowasm` のときは今までの JavaScript。ビルド `tools/build.sh`（clang 18、`-ffast-math` なし）。メモリは 8MB（Worker ごと。重み・ベアオフ表で約5MB）。
- **マルチスレッドの枠組みはそのまま**（`mt.js`＋`shared/mtworkers.js`：候補手 × 相手の21の出目を Worker に配る）。各 Worker が自分の C エンジンを持つ。
- **一致の確認**（`node tools/cmatch.js 60 <exact.wasm>`、作業機）：
  - 手の生成：60局面 × 21の出目＝1260 通りすべてで、同じ手が同じ順。
  - 層を bg.js と同じ順に double で足す確認用のビルド（`-DEXACT`、配信しない）は JavaScript と差 **1.1e-16 以下**（0-ply・速いネット・1-ply・2-ply とも。残りは e^x の実装差だけ）＝同じ探索の再現。
  - 配信する SIMD 版（float の4列の和）：0-ply の確率の差は最大 1.3e-7、速いネット 2.1e-7。1-ply・2-ply では相手の返し手の選び方（速いネットの順位・強いネットの比較）が僅差で入れ替わる出目があり、最大 3e-3〜2.7e-2（その出目の返し手が変わった分）。`engine_simd.wasm` と `engine.wasm` は全局面でビット単位まで同じ。
  - **Lv.10 の手（2-ply、時間の上限なし＝スレッドで読むときと同じ）：16局面すべて同じ手**、選んだ手の評価の差は最大 0.03。
- **速さ**（作業機・共用2コア・ほかの作業と同時なので目安）：Lv.10 の1手 JavaScript 2.9秒 → C 0.48秒（**×6.1**）、1-ply 1回 92 → 16ミリ秒（×5.8）、2-ply 1回 0.86 → 0.21秒（×4.2）。ネイティブで見た内訳（CPU 時間）：wildbg 1回 約17マイクロ秒・速いネット約2マイクロ秒・手の生成約2マイクロ秒、2-ply 1回の約7割が wildbg。Mac で測るページ：`backgammon/bench.html`（「エンジン」で C と前の JavaScript を選べる。結果の2行目に `core wasm-simd`）。
- **強さ（レベルは変えていない）**：Lv.9・10 はもともと 2-ply（`LEVEL_OPTS`）で、マルチスレッドがオンなら全候補を 2-ply で読んでいた。C になって1スレッド（スマホ・マルチスレッドなし）でも 0.9／1.3秒の上限の中で候補を全部 2-ply で読み切れるようになった（前は1スレッドで1〜2手しか 2-ply にならず、実質 1-ply の手だった）。スレッドありの強さは同じ。**3-ply（Lv.10 の上位2〜3手）も試した**が、作業機では1局面 1〜2秒（ネイティブ）かかり、ロールアウト・対局で差を示せる量を回せなかった（数十局面では差は誤差の内）ので入れていない（`bg_ply(o, 3)` と `BG.hybN` は用意済み）。レベルの説明・強さの表記は変えていない。
- headless Chrome（作業機）：対局ページ・計測ページ・スマホ幅・大百科（`atlas/` から `../backgammon/engine.js`）で Worker が `wasm-simd` を読み、Lv.10 の手・解析（2-ply）・形勢（eval）が返る。ページのエラーなし。


## 本編のマルチスレッド（2026-11-08、`shared/mtworkers.js` ＋ `backgammon/mt.js`）

- `analyzePlays` の候補手を、0-ply の並び（1スレッド）→ 選んだ候補を 1-ply → 2-ply（`BG.planPly` が `analyzePlays` と同じ手を選ぶ）の順に Worker の組で読み、値を `pre` としてふだんの Worker に渡す（順位・指した手・解説はいつもどおり）。
- 使う所：時間の上限のある Lv.9・10（0.9／1.3 秒。1スレッドでは 2-ply 1手 約0.5〜1.5 秒のため上限で1〜2手しか 2-ply にならない）は候補を全部 2-ply で読む（レート戦も）、ヒント（1-ply）・コーチ（2-ply）も。振り返りはスレッド数の Worker で局面ごと。Lv.1〜8 は1スレッド。最上位の追加はしない（3-ply は JS で1手数十秒）。
- 計測ページ：`backgammon/bench.html`（どこからもリンクしない）。

### ユーザーの Mac での実測と見直し（2026-11-09）

- ユーザーの Mac（M4 Pro 14コア＝高性能10＋高効率4、Chrome）：2-ply・候補8手で 2・4・8・14スレッド ×1.89／×3.45／×5.75／×5.73。**8 で頭打ち**。
- 原因：仕事が「候補手1つ」単位だったので、ベンチでは8つ、本編の 2-ply では 2〜4 つ（Lv.9 は2、Lv.10 は4、コーチは3）しかなく、それ以上のスレッドは遊んでいた。また Worker の数は `min(コア数 − 1, 7) + 1`＝8 が上限だった。
- 改善：2-ply の値を相手の 21 通りの出目に分ける（`BG.plyRoll(q, o, ply, i)` が出目 i の項、`BG.plySum` が `hyb2`／`eval2` と同じ順・同じ式で足す＝同じ数値。ゲームが終わった局面・ベアオフの局面は `BG.plyWhole` で丸ごと1つの値）。1-ply も候補がスレッド数の2倍より少ないときは同じく出目で分ける（`mt.js` の `plyVals`）。Worker は PC の全論理コア（`MTWorkers.use({ all: true })`、最大16、スマホは 3 + 1）。
- 確認：Node で 112 候補（wildbg あり／なし、1-ply・2-ply）の値が `evalPly` とビット単位で一致。1スレッドの経路（`analyzePlays`・`hyb2` など）は変えていない。
- 見積もり（作業機で出目ごとの時間を測ったシミュレーション、候補8手、1仕事 0.2 ミリ秒の通信込み）：8スレッド ×5.5 → ×7.6、14スレッド ×5.5 → ×12.7（同じ速さのコアの場合。高効率コアの分だけ実際は下がる）。本編の Lv.10（2-ply 4手）は 4スレッドまでしか使えなかったのが全スレッドに。
- Mac で測り直すページ：`backgammon/bench.html`（2-ply・候補8手）。

## 対局設定の Pro モード（2026-11-15）
- `shared/proset.js`。項目：読みの深さ（0〜2 ply：0-ply＝評価だけ〔弱いレベルのまま変えなければ速いネット〕、1-ply＝Lv.8 の探索、2-ply＝Lv.10 の探索・スレッドも Lv.10 と同じ）、手のばらつき（equity の揺らぎ：なし 0／小 0.06≈Lv.5／大 0.25≈Lv.3）。ダブルの判断はレベルのまま。`bg.js` の `aiChoosePlay(…, cfg)`、`mt.js` は cfg の 2-ply を Lv.10 として先読み。保存は `settings.pro`／`pro2`、戦績は `ai:pro`。
