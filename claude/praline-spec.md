# 思考エンジン「Praline（プラリネ）」仕様書（2026-11-11〜）

サイトの AI が「たくさんのコアで一緒に考える」ための仕組みを、共通の思考エンジン **Praline（プラリネ）** としてまとめたものです。
各ゲームの探索（手の生成・評価関数・枝刈り）はそれぞれのゲームのもので、Praline は**仕事の分け方・スレッドの組み方・計測のしかた**を受け持ちます。

- 名前の由来：プラリネは、ナッツをキャラメルでひとつに固めたお菓子。**ナッツ＝たくさんのコア**、**キャラメル＝共有メモリ**（SharedArrayBuffer、共有の置換表・分割点）で、ばらばらのコアをひとつの思考にまとめる、という意味。
- 名前の重なり（2026-11-11 に確認）：ゲーム AI・探索エンジン・広く使われるライブラリで同じ名前のものは見つからなかった。いちばん有名な同名はバイオインフォマティクスのタンパク質配列アラインメントの道具「PRALINE」（アムステルダム自由大学）で、分野がまったく違う。ほかは GitHub の小さな個人プロジェクト（Bitcoin のハードウェアウォレット等）程度。
- 原典の優先順位は他の仕様書と同じ（ユーザーの指示 ＞ addendum ＞ game-conventions ＞ 各 spec）。addendum の「本編のマルチスレッド」「最強解析ページ」「対局設定の Pro モード」が Praline の決まりごとの原典で、この文書はその全体像と C の共通部分の説明。

---

## 1. 構成

Praline は3つの部分からなります。

### ① 画面側（JavaScript、`shared/`）— 既存の共通部品を Praline の一部と位置づける

| ファイル | 役割 |
|---|---|
| `shared/mtengine.js` | wasm エンジンのスレッドの組（主＝ゲームの `engine.js?…&mt=1`、補助＝`mt-helper.js`）。分離（Document-Isolation-Policy／COOP モード）、歯車の「マルチスレッド」、スレッド数（`min(論理コア−1, 7)+1`、`perfThreads()`）、`pool(prio)`・`run`・`cancel`、`ctl`（停止フラグと共有の制御領域） |
| `shared/mt-sw.js` | 分離のための Service Worker の部品（各ゲームの `sw.js` が `importScripts`） |
| `shared/mtsplit.js` | JavaScript の αβ エンジンの分割（ふつうの Worker の組で YBW、`ladder.drive`、手の空いたワーカーの手伝い、Lazy SMP の計画） |
| `shared/mttt.js` | JavaScript エンジンの共有の置換表（SharedArrayBuffer、ロックなしの XOR 照合、2項目バケット） |
| `shared/mtworkers.js` | 独立な仕事の配り分け（期待値探索の「手 × 出目」、ロールアウト、振り返りの局面。共有メモリ不要） |
| `shared/proset.js` | 対局設定の PRO モード（思考の制限・スレッド数・先読みなど） |
| `shared/ponder.js` | PRO の「先読み」（人の手番のあいだもスレッドの組で読み続ける） |
| `shared/bench-auto.js` | 計測ページの自動実行（`bench-all.html` から） |

### ② C の共通部分（`shared/praline/`）— 2026-11-11 に新設

wasm の αβ エンジン（`engine_mt.wasm`、`-DMT`）の**仕事を分ける仕組み**を、ゲームごとの写しから1か所にまとめたもの。

| ファイル | 中身 |
|---|---|
| `praline.h`（第1部：共有の状態） | `gStop`・`threadId`、**busy marks**（`busyT`・`busyOther`／`busySet`／`busyClear`：ほかのスレッドが読んでいる手を後回し）、**分割点**の構造体 `SPt`（共通の欄＋ゲームの欄 `PL_SP_FIELDS`）・`SPS`・`spAlloc`／`spRelease`・`splitD`、分割点の数の変数を**専用のキャッシュライン**（`GS`：`gIdle`・`gWaitN`・`gOpenN`・`gSPHi`）、`curSP`／`curIdx`／`dupMode` |
| `praline_ybw.h`（第2部：Young Brothers Wait） | 合流・離脱（`spJoin`／`spLeave`）、1手ずつの取り合い（`spWork`）、結果と停止（`spResult`・`chainStopped`）、**待つ持ち主の手伝い**（`spRun`：自分の分割点の下を手伝う helpful master）、**待つ持ち主の印**（`waiting`・`spWanted`：下のスレッドは手の空いた補助がいなくても分割する）、**二度読み**（`spFindDup`・`spDup`：遅いコアのスレッドが読んでいる手をもう一度読み、先に終わった方を使う）、`mt_idle`（補助の待ち受け）、`mt_split`（分割の深さ）、`-DSIM_STAT` の集計 |

ゲームが用意する**つなぎ（glue）**（`praline_ybw.h` を読む前に定義）：

| つなぎ | 中身 | 例（シャンチー） |
|---|---|---|
| `SP_MV`・`PL_SP_FIELDS` | 分割点1つの手の上限と、ゲームの欄（節の局面・繰り返しの判定用の履歴・各手の LMR の順番や延長の印など） | 盤・鍵・ビットボード・玉・最後の駒取り以降の履歴、手の順番 `lg`・王手 `gc` |
| `spFillPos(s, …)` | 持ち主が節の局面を分割点に写す（ゲームの `search()` から呼ぶ。引数はゲームの自由） | `memcpy(s->B, B, 90)` … |
| `spLoadPos(s, top, fresh)` | 合流するスレッドが局面を写す（`fresh`：評価の累積を作り直す、`top`：累積の段） | NNUE の累積を `top` の段に作り直す |
| `spTop()` | いまの累積の段（下を手伝って戻るときに自分の累積を壊さない） | `xqTop`（チャンギ・チェッカーは 0） |
| `spSearch(s, i, a)` | 分割点の i 番目の手を、1スレッドのループと同じ延長・LMR・null window → 読み直しで読む | 1スレッドの `search()` のループ本体と同じ式 |
| `spCutoff(s, i)` | カットした手のキラー・履歴（駒取りでない手だけ、1スレッドと同じ） | `killers`・`hist` |
| `waitCheck()` | 待つ持ち主の時間・停止の確認（`SIM_IDLE()` を含む） | `mtCheck()` |
| `spIdleReset(fresh)` | `mt_idle` の始め：局面数・時間・局面数の上限・根の鍵、新しい仕事なら履歴の減衰とキラーの消去 | `beginSearch` と同じ |
| `timeUp()`／`mtCheck()` | ゲームの時計（`stopFlag` 1＝時間・停止、2＝上の分割点が止まった、3＝二度読みをやめて合流） | 1024局面ごと |

分割点を開く場所（`search()` の「最初の手を読み終えたら」の分岐、根の `rootSearch`）は、手の生成と順番・枝刈りがゲームごとに違うので**ゲームの `search()` の中**に残す（手は1スレッドのループを最後まで回した順・合法手だけ・枝刈りで落ちる手は落として分割点に並べる）。

### ③ 計測の道具

| 道具 | 使い方 |
|---|---|
| `tools/mtsim/`（`gen.py`・`sim.c`・`simcore.h`・`g_<game>.h`・`dump.js`・`wasm1.js`） | wasm の αβ（シャンチー・チャンギ・チェス・将棋・タフル）の「本当に同時」のシミュレーション：全スレッドが一定の局面数ずつ足並みをそろえ、置換表と busy marks の書き込みはその回の終わりまでほかに見えない。`-DSIM_Q=64`（YBW は細かく）、`SIM_SLOW=k`（k 番以降が 2/5 の速さ＝高効率コア）、`SIM_SLOWSET`・`SIM_MIG`。`wasm1.js` は本物の `engine_mt.wasm` の1スレッドの局面数・手。`gen.py` は Praline のヘッダを取り込んでから書き換える |
| `checkers/tools/mtsim/`・`morris/tools/mtsim/`・`fanorona/tools/mtsim/` | 同じ方式のゲーム別版（チェッカーの `gen.py` も Praline のヘッダを取り込む） |
| `shared/tools/mtsim.js`・`mtstep.js`・`mtlazy.js`・`nodematch.js` | JavaScript エンジン（mtsplit.js）の見積もり：局面数の時計、歩調合わせ（`--slow K:R`）、Lazy SMP、時間2倍の強さ |
| `<game>/bench.html`・`bench-all.html` | ユーザーの Mac で測るページ（1・2・4・8・10・14スレッド、同じ深さまでの時間・nps・最善手の一致、「結果をコピー」）。`bench-all.html` で全ゲームをまとめて |

---

## 2. 各ゲームの方式（2026-11-11）

| ゲーム | エンジン | 方式 | Praline の部品 |
|---|---|---|---|
| シャンチー（`xiangqi/`） | C（wasm、NNUE） | **YBW**（分割の深さ3）＋busy marks | mtengine・**praline.h／praline_ybw.h（移行済み）**・proset・ponder |
| チャンギ（`janggi/`） | C（wasm） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset・ponder |
| チェッカー（`checkers/`） | C（wasm、NNUE・終盤DB） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset |
| タフル（`tafl/`） | C（wasm） | YBW（3）＋busy marks | mtengine・proset・ponder（C は自前の写し） |
| モリス（`morris/`） | C（wasm） | YBW（3）＋busy marks | mtengine・proset（C は自前の写し） |
| ファノロナ（`fanorona/`、アルケルケは1スレッド） | C（wasm） | YBW（3）＋busy marks | mtengine・proset（C は自前の写し） |
| リバーシ（`reversi/`） | C（wasm）＋JS | YBW v4.1（中盤は深さ5、完全読みは14マス） | mtengine・proset・ponder（C は元祖の作り：分割点256個・`CHK_Q`） |
| 将棋（`shogi/`） | C（wasm、NNUE） | YBW（4）＋10スレッドより先は Lazy SMP（`YBW_MAX`） | mtengine・proset・ponder（C は自前：読み筋の受け渡し・継続履歴の共有） |
| チェス（`chess/`） | C（wasm、NNUE） | YBW 1（補助1番、深さ7・予想カット節は分けない）＋Lazy SMP | mtengine・proset・ponder（C は自前：履歴の共有） |
| 五目並べ（`gomoku/`） | JS 探索＋wasm の共有の置換表・分割点（`mt.c`） | YBW v2（どの節も） | mtengine・proset |
| 囲碁（`go/`）・ヘックス（`hex/`） | C（wasm） | 共有木 MCTS（virtual loss） | mtengine・proset |
| アマゾンズ（`amazons/`） | JS＋wasm コア | αβ は YBW＋共有の置換表（JS 分割）、Lv.19〜23 は共有木 MCTS | mtsplit・mttt・mtengine・proset |
| ウゴルキ・アゴン・コナネ | JS＋wasm コア | YBW＋共有の置換表＋手伝い（JS 分割） | mtsplit・mttt・proset |
| マンカラ | JS | Lazy SMP（共有の置換表） | mtsplit・mttt・proset |
| コネクトフォー | JS | 列ごとの完全読み（共有の置換表） | mtsplit＋`connect4/mt.js` |
| ドット＆ボックス | JS＋wasm（5×5） | 手の分担（共有の置換表）・補助 Worker | mtworkers（共有モード）・wasm `dots5mt.wasm` |
| ウル・セネト・バックギャモン・ルドー | JS | 独立な仕事の配り分け（全コア） | mtworkers |

---

## 3. Mac での実測のまとめ（M4 Pro＝高性能10＋高効率4、Chrome。各 MODEL_CARD／spec から）

同じ深さまでの時間の1スレッド比（2／4／8／10／14スレッド）。「—」は未計測。

| ゲーム | 方式（計測時） | 2 | 4 | 8 | 10 | 14 |
|---|---|---|---|---|---|---|
| 囲碁 | 共有木 MCTS（visits/s） | — | — | ×6.8〜7.7 | — | ×8.1〜9.8 |
| シャンチー | YBW | — | — | — | — | ×5.99 |
| チャンギ | YBW | — | — | — | — | ×5.42 |
| 将棋 | YBW（その4の前） | ×2.16 | ×3.59 | ×4.78 | ×4.48 | ×3.31 → その4（YBW 10＋Lazy）で再計測待ち |
| チェッカー | Lazy＋busy marks（YBW の前） | — | — | ×5.06 | ×5.19 | ×5.81 |
| ファノロナ | Lazy＋busy marks（YBW の前） | — | — | ×4.39 | ×4.86 | ×4.37 |
| リバーシ中盤 | YBW v4（v4.1 の前） | ×1.58 | ×2.52 | ×3.45 | ×3.07 | ×2.87 |
| リバーシ終盤 | YBW v4 | ×1.75 | ×3.81 | ×6.14 | ×6.81 | ×7.35 |
| チェス | Lazy SMP（v2 の前） | — | — | ×2.53 | — | ×2.72 |
| ウゴルキ／アゴン／コナネ | YBW＋共有（JS） | — | — | ×3.88／×3.32／×2.38 | — | （14 は 8 より遅い） |
| コナネ | 同上（手伝いの前） | ×1.37 | ×2.23 | ×2.14 | — | ×2.24 |
| コネクトフォー | 列の完全読み | — | — | ×2.40 | — | ×2.10 |

- 分かったこと：①Lazy SMP は 8スレッドあたりで頭打ち（全スレッドが同じ根を読み、置換表だけで助け合う）→ YBW で伸びた。②高効率コアは約0.3〜0.4倍の速さで、YBW では遅いスレッドの持つ手を持ち主が待つ → 二度読みと待つ持ち主の印で緩和。③14スレッドが10より遅いゲームは PRO の既定を性能コアまで（`MTEngine.perfThreads()`）。④共有の置換表はロックなしの XOR 照合・バケット・年齢が必須（addendum「共有メモリの探索で守ること」）。
- 作業機（共用2コア）では壁時計の速さは測れない。判断は Mac の bench と「本当に同時」のシミュレーション（遅いコアのモデルあり・なし）で行う。

---

## 4. 新しいゲームに入れる手順（wasm の αβ エンジン）

1. **1スレッドの探索を先に固める**（通常版 `engine.wasm`）。`-DMT` のときだけ `TLS` を `_Thread_local` にし、通常版は前処理後のソースが変わらない形にする。
2. **共有の置換表**：ロックなしの `{ key ^ w, w }`、4項目バケット、深さと年齢で置換、通常版より大きめ（addendum「wasm の Lazy SMP の置換表」）。
3. **Praline を読む**：`-DMT` の節で `SP_MV`・`PL_SP_FIELDS`（と必要なら `SPLIT_D`・`BUSY_D`）を定義して `#include "../shared/praline/praline.h"`。`timeUp()`（停止の理由 1・2・3）と `spFillPos`／`spLoadPos` を書く。
4. **search() に分割を入れる**：最初の手を読み終え、残り深さ `splitD` 以上で `gIdle > 0 || (gWaitN > 0 && spWanted())` なら、残りの手を1スレッドのループと同じ順・同じ枝刈りで分割点に並べ、`spRun(s, &best, &bestM, 0)`。busy marks（`busyOther`／`busySet`／`busyClear`）も同じ所に。根は `rootSearch` の2手目以降を分割点に（各手の値は `vals`）。
5. **つなぎを書いて第2部を読む**：`spSearch`・`spCutoff`・`spTop`・`waitCheck`・`spIdleReset` の後に `#include "../shared/praline/praline_ybw.h"`。
6. **ページ側**：`sw.js`（`mt-sw.js`）、`mt-helper.js`（`setup()` の後 `mt_idle(250, fresh)` を繰り返す）、`engine.js` の `mt=1`、`MTEngine.use({...})`（`initial` は wasm の宣言するページ数以上）、PRO の `threads`、計測ページ `bench.html`（`bench-all.html` の `GAMES` にも）。
7. **確かめる**（下の約束）。

JavaScript エンジンは `shared/mtsplit.js`（＋`mttt.js`）、独立な仕事は `shared/mtworkers.js`、MCTS は囲碁・ヘックスの共有木を手本にする。

---

## 5. 守るべき約束

- **1スレッドの探索結果を変えない**：通常版 wasm はバイト一致（`clang -E` の前処理後のソースが同じこと、またはコードの節が同じこと）。`engine_mt.wasm` の1スレッドは、固定の局面集（`bench.html` と同じ乱数の局面）で深さ固定の**局面数・手・評価値・深さが前と全一致**（`tools/mtsim/wasm1.js`、チェッカーは同じ形の Node のスクリプト）。手の空いた補助がいなければ分割しないので、1スレッドは前と同じ木を読む。
- **遅いコアのモデルでも確かめる**：シミュレーションは全部同じ速さ（2・4・8）と、8番以降が 2/5 の速さ（8・10・14）の両方。Mac の 10・14 スレッドで 8 より遅くならないことを見る。同じ設定でも ±10% ほど揺れるので、比べるときは2回以上か、局面を増やす（`NPOS=24`）。
- **headless Chrome（Playwright）で確認**：`bench.html` と対局ページを2スレッドで（分離・スレッドの起動・最後まで読む・エラーなし）。
- **版番号**：変えた `engine_mt.wasm` を読む全部の所の `?v=`（`app.js` の `MTEngine.use` の `wasm`、`bench.html`、`pro/pro.js` の `VER`）と、変えた JS を読むページの `?v=`（`index.html` の `app.js?v=`、`pro/index.html` の `pro.js?v=`）。大百科が読むファイルなら `atlas/lazy.js` など（CLAUDE.md）。通常版 wasm を変えていなければ `engine.js?v=` は上げない。
- 共有のヘッダを変えたら、**それを読む全ゲームの `engine_mt.wasm` を作り直し**、各ゲームで上の確認をする（ヘッダはゲームごとの wasm に焼き込まれるので、作り直さないゲームは前のまま動く）。
- 秘密の企画は書かない（リポジトリは公開）。

---

## 6. C の共通化（2026-11-11）：移行したゲームと確認

**移行**：シャンチー・チャンギ・チェッカーの `engine.c` の、busy marks・分割点・YBW（合流・取り合い・待つ持ち主の手伝いと印・二度読み・`mt_idle`・`mt_split`）を `shared/praline/` に移し、各ゲームにはつなぎだけを残した（`engine.c` の差分：3ゲームで約 −880 行）。コードは前と同じ式のまま（構造体の欄の並びだけ変わった）。

**一致の確認（作業機）**
- 通常版：3ゲームとも `clang -E` の前処理後のソースが前と同じ（シャンチーは `engine.wasm`・`engine_simd.wasm`・`engine_simd512.wasm` の3設定、チェッカーは2設定）。通常版の wasm は作り直していない（配信中のままとコードの節が一致）。
- `engine_mt.wasm` の1スレッド：シャンチー・チャンギは `tools/mtsim/wasm1.js` の24局面・深さ10、チェッカーは `bench.html` の12局面・深さ14 で、**局面数・手・評価値・深さが、前の配信版・前のソースの作り直し・新しい版の3つで全一致**。
- 宣言するメモリのページ数は前と同じ（シャンチー 1118・チャンギ 1102・チェッカー 830。プールの `initial` 1152／1024 のまま）。

**マルチスレッド（`tools/mtsim` の「本当に同時」のシミュレーション、64局面ごとに同期）**：結果は下の表（前＝前のソース、新＝Praline 版。同じ局面・同じ設定）。

<!-- PRALINE-SIM-TABLE -->

**headless Chrome（Playwright、作業機）**：

<!-- PRALINE-PW -->

### 移行の判断と次の候補
- **次に広げる候補：タフル・モリス・ファノロナ**。分割点の作りはチェッカーと同じ形（つなぎの差だけ）で、同じ手順でそのまま乗る見込み。各ゲームの `tools/mtsim`（モリス・ファノロナは自前の `gen.py`）にもヘッダの取り込みを足す。
- **将棋**：読み筋を分割点経由で戻す（`pvTable` の写し）・継続履歴の共有・`YBW_MAX`（10スレッドより先の補助は Lazy SMP：`lazyRun`・`gRootSeq`・`gRootP`）がある。Praline に「手が alpha を上げたときのつなぎ（読み筋）」と「Lazy の補助の上限 `YBW_MAX`」（`mt_idle` の入口で `threadId >= ybwMax` なら Lazy の根の読みへ、`mtCheck` で主の根の更新を見る）を足してから移す。将棋の移行と同時に、将棋の12局面で全一致を確かめて入れる（使うゲームのない共通コードは先に入れない）。
- **チェス**：YBW の補助は1つだけで、YBW の補助と主が履歴・カウンター手の表を共有し、分割は予想カット節を除く。上の将棋の足し方の後に。
- **リバーシ**：元祖の作り（分割点256個、`CHK_Q`＝4096局面ごとの確認、完全読みの分割）で、中盤と終盤の2種類の探索に分割点がある。並行して別の作業が `reversi/engine.c` 以外を触っている間は移さない。最後に回す。
- **共通にしなかったもの（理由）**：①分割点を開く場所（手の生成・順番・枝刈りがゲームごとに違い、関数にすると1スレッドの読みを変えずに書くのが難しく、性能も落ちうる）、②`timeUp`（ゲームごとに確認の間隔・局面数の上限・`gHit` の見方が違う）、③各スレッドの結果の共有 `gRes`（手の詰め方がゲームごと）、④共有の置換表（局面の鍵と項目の詰め方がゲームごと。作りは同じなので、次の段で `praline_tt.h` にまとめる候補）、⑤スレッドの起動（`mt_stack`・`mt_thread`：ゲームの初期化を呼ぶ。シミュレーションの `gen.py` がこの節を切り取る）。
