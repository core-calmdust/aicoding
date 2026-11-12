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

**任意のつなぎ（2026-11-11、将棋・チェスの移行で追加。定義しなければ前と同じコード：先に移した6ゲームの `engine_mt.wasm` はヘッダを変えた後もコード・データの全セクションが同じ）**：

| つなぎ | 中身 | 使うゲーム |
|---|---|---|
| `PL_VAL`（praline.h の前） | 値の型（窓・最善値・根の値）。既定 `int`。`int` 以外は汎用の atomics（`PL_ALPHA_LOAD`／`PL_ALPHA_STORE`） | 将棋（`double`） |
| `PL_NO_VALS` ＋ `PL_ROOT_VAL(s, i, v)`／`PL_ROOT_GET(s, j)` | 分割点に根の値の欄を持たず、ゲームが持つ（既定は `s->vals[i]`） | 将棋（`spRootV`、一度に根は1つ）・チェス（根の値を返さない） |
| `PL_WANT_A` | `spResult` に渡す手を読んだときの alpha を `plA` に（`PL_ROOT_VAL` で「fail-low は値なし」） | 将棋 |
| `PL_ON_RAISE(s, i)` | 手が分割点の alpha を上げたとき（ロックの中）：その手の下の読み筋を写す・カットしたスレッドの印 | 将棋・チェス |
| `PL_ON_OPEN(s)`／`PL_ON_CLOSE(s)` | `spRun` が分割点を開くとき／閉じる直前（`stopFlag` は結果の理由）：読み筋の初期化／節の読み筋を `pvTable` へ・他スレッドのカットの履歴ボーナス | 将棋・チェス |
| `PL_IDLE_HOOK(ms)` | `mt_idle` の入口（状態を戻した後）：別の仕事へ（`return`） | 将棋（`threadId >= ybwMax` は Lazy SMP の `lazyRun`） |
| `PL_NODES()` | `mt_idle` が返す局面数（既定 `(double)nodes`） | 将棋（32ビット）・チェス（結果の欄にも書く） |
| `PL_MT_SPLIT` | ゲームが自分の `mt_split` を出す（分割の深さ `splitD` に加えてゲームの設定） | チェス（予想カット節の手数。busy marks はゲームの `mt_busy`） |
| `now()` | ヘッダが使う時計。名前の違うゲームは `#define now() js_now()` | 将棋・チェス |

分割点を開く場所（`search()` の「最初の手を読み終えたら」の分岐、根の `rootSearch`）は、手の生成と順番・枝刈りがゲームごとに違うので**ゲームの `search()` の中**に残す（手は1スレッドのループを最後まで回した順・合法手だけ・枝刈りで落ちる手は落として分割点に並べる）。

### ③ 計測の道具

| 道具 | 使い方 |
|---|---|
| `tools/mtsim/`（`gen.py`・`sim.c`・`simcore.h`・`g_<game>.h`・`dump.js`・`wasm1.js`） | wasm の αβ（シャンチー・チャンギ・チェス・将棋・タフル、アマゾンズ＝評価数の時計・局面は `amazons/tools/mtsim_pos.js`）の「本当に同時」のシミュレーション：全スレッドが一定の局面数ずつ足並みをそろえ、置換表と busy marks の書き込みはその回の終わりまでほかに見えない。`-DSIM_Q=64`（YBW は細かく）、`SIM_SLOW=k`（k 番以降が 2/5 の速さ＝高効率コア）、`SIM_SLOWSET`・`SIM_MIG`。`wasm1.js` は本物の `engine_mt.wasm` の1スレッドの局面数・手。`gen.py` は Praline のヘッダを取り込んでから書き換える |
| `checkers/tools/mtsim/`・`morris/tools/mtsim/`・`fanorona/tools/mtsim/` | 同じ方式のゲーム別版（3つとも `gen.py` が Praline のヘッダを取り込んでから書き換える） |
| `shared/tools/mtsim.js`・`mtstep.js`・`mtlazy.js`・`nodematch.js` | JavaScript エンジン（mtsplit.js）の見積もり：局面数の時計、歩調合わせ（`--slow K:R`）、Lazy SMP、時間2倍の強さ |
| `<game>/bench.html`・`bench-all.html` | ユーザーの Mac で測るページ（1・2・4・8・10・14スレッド、同じ深さまでの時間・nps・最善手の一致、「結果をコピー」）。`bench-all.html` で全ゲームをまとめて |

---

## 2. 各ゲームの方式（2026-11-11）

| ゲーム | エンジン | 方式 | Praline の部品 |
|---|---|---|---|
| シャンチー（`xiangqi/`） | C（wasm、NNUE） | **YBW**（分割の深さ3）＋busy marks | mtengine・**praline.h／praline_ybw.h（移行済み）**・proset・ponder |
| チャンギ（`janggi/`） | C（wasm） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset・ponder |
| チェッカー（`checkers/`） | C（wasm、NNUE・終盤DB） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset |
| タフル（`tafl/`） | C（wasm、NNUE） | **YBW**（3、busy marks なし） | mtengine・**praline（移行済み）**・proset・ponder |
| モリス（`morris/`） | C（wasm） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset |
| ファノロナ（`fanorona/`、アルケルケは1スレッド） | C（wasm） | **YBW**（3）＋busy marks | mtengine・**praline（移行済み）**・proset |
| リバーシ（`reversi/`） | C（wasm）＋JS | YBW v4.1（中盤は深さ5、完全読みは14マス） | mtengine・proset・ponder（C は元祖の作り：分割点256個・`CHK_Q`） |
| 将棋（`shogi/`） | C（wasm、NNUE） | **YBW**（4）＋busy marks＋10スレッドより先は Lazy SMP（`YBW_MAX`） | mtengine・**praline（移行済み、`PL_VAL` double・読み筋・`PL_IDLE_HOOK`）**・proset・ponder |
| チェス（`chess/`） | C（wasm、NNUE） | **YBW**（6、予想カット節も）＋busy marks＋10スレッドより先は Lazy SMP（2026-11-12、v3。前は YBW 1＋Lazy SMP） | mtengine・**praline（移行済み、読み筋・カットの印・`PL_MT_SPLIT`）**・proset・ponder |
| 五目並べ（`gomoku/`） | **C（wasm、2026-11-12）**：盤の形・禁手・VCF/VCT・αβ・評価ネットごと `core.c`（`core_simd.wasm`／`core.wasm`、スレッドは `core_mt.wasm`）。JS は予備（`?nowasm`） | **YBW**（4、読み筋の節は2）＋busy marks、解析は候補手を分割点に | mtengine・**praline（2026-11-12）**・proset |
| 囲碁（`go/`）・ヘックス（`hex/`） | C（wasm） | 共有木 MCTS（virtual loss） | mtengine・proset |
| アマゾンズ（`amazons/`） | C（wasm、αβ の探索ごと core.c、2026-11-11） | αβ は **YBW**（3）＋busy marks、Lv.19〜23 は共有木 MCTS（同じ `core_mt.wasm`、補助は両方を待つ）。分離できないページは mtsplit の非共有 | mtengine・**praline（2026-11-11）**・proset（mtsplit は非共有だけ） |
| ウゴルキ（`ugolki/`） | C（wasm、ルートのループも 2026-11-11） | **YBW**（3）（`core_mt.wasm`）。分離できないページは mtsplit | mtengine・**praline（2026-11-11）**・proset（mtsplit は非共有・予備） |
| アゴン（`agon/`） | C（wasm、ルートのループも 2026-11-11） | **YBW**（3）（`core_mt.wasm`）。分離できないページは mtsplit | mtengine・**praline（2026-11-11）**・proset（mtsplit は非共有・予備） |
| コナネ（`konane/`） | C（wasm、ルートのループも 2026-11-11） | **YBW**（3）（`core_mt.wasm`）。分離できないページは mtsplit | mtengine・**praline（2026-11-11）**・proset（mtsplit は非共有・予備） |
| マンカラ | **C（wasm、2026-11-11）**：探索・評価・置換表（`engine.c`、SIMD 版となし版） | 各 Worker が自分の置換表でルートの手と本筋を分担（YBW。C では Lazy SMP は使わない） | mtsplit・proset（`claude/mancala-spec.md`） |
| コネクトフォー | JS | 列ごとの完全読み（共有の置換表） | mtsplit＋`connect4/mt.js` |
| ドット＆ボックス | JS＋wasm（5×5） | 手の分担（共有の置換表）・補助 Worker | mtworkers（共有モード）・wasm `dots5mt.wasm` |
| ウル（`ur/`） | **C（wasm、2026-11-11）**：期待値の探索と評価ネット（`engine.c`、SIMD 版となし版） | 独立な仕事の配り分け（手 × 出目、全コア。各 Worker が C） | mtworkers（`claude/ur-spec.md`） |
| セネト（`senet/`） | **C（wasm、2026-11-11）**：期待値の探索と評価ネット（`engine.c`、SIMD 版となし版） | 独立な仕事の配り分け（手 × 投げ、全コア。各 Worker が C） | mtworkers（`claude/senet-spec.md`） |
| ルドー | JS | 独立な仕事の配り分け（全コア） | mtworkers |
| バックギャモン（`backgammon/`） | **C（wasm、2026-11-11）**：評価（速いネット・wildbg・ベアオフ）と期待値の探索（`engine.c`、SIMD 版となし版の2本） | 独立な仕事の配り分け（候補手 × 相手の21の出目、全コア。各 Worker が自分の C エンジン） | mtworkers（`backgammon/MODEL_CARD.md`） |

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
| チェス | Lazy SMP（v2 の前） | — | — | ×2.53 | — | ×2.72 → v3（YBW 10＋busy marks＋Lazy）で計測待ち |
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

**移行**：シャンチー・チャンギ・チェッカーの `engine.c` の、busy marks・分割点・YBW（合流・取り合い・待つ持ち主の手伝いと印・二度読み・`mt_idle`・`mt_split`）を `shared/praline/` に移し、各ゲームにはつなぎだけを残した（`engine.c` は3ゲームで合わせて約 −770 行、共通ヘッダは約340行）。コードは前と同じ式のまま（構造体の欄の並びだけ変わった）。

**一致の確認（作業機）**
- 通常版：3ゲームとも `clang -E` の前処理後のソースが前と同じ（シャンチーは `engine.wasm`・`engine_simd.wasm`・`engine_simd512.wasm` の3設定、チェッカーは2設定）。通常版の wasm は作り直していない（配信中のままとコードの節が一致）。
- `engine_mt.wasm` の1スレッド：シャンチー・チャンギは `tools/mtsim/wasm1.js` の24局面・深さ10、チェッカーは `bench.html` の12局面・深さ14 で、**局面数・手・評価値・深さが、前の配信版・前のソースの作り直し・新しい版の3つで全一致**。
- 宣言するメモリのページ数は前と同じ（シャンチー 1118・チャンギ 1102・チェッカー 830。プールの `initial` 1152／1024 のまま）。

**マルチスレッド（`tools/mtsim` の「本当に同時」のシミュレーション、64局面ごとに同期）**：結果は下の表（前＝前のソース、新＝Praline 版。同じ局面・同じ設定）。

作業機（共用2コア、ほかのエージェントの計算と同時）の `tools/mtsim`（シャンチー・チャンギ：`bench.html` と同じ乱数の対局から24局面、1スレッド100万局面の深さまで。チェッカー：`checkers/tools/mtsim`、`bench.html` の12局面のうち6局面、1スレッド500万局面の深さまで）。同じ深さまでの時間の1スレッド比、全局面の合計。「全部同じ速さ」は2〜3回の平均（カッコは各回）、「遅いコアあり」（`SIM_SLOW=8`：8番以降が 2/5 の速さ）は1回。

| ゲーム | 版 | 2 | 4 | 8 | 遅いコアあり 8 | 10 | 14 |
|---|---|---|---|---|---|---|---|
| シャンチー | 前 | ×1.86（1.86・1.85） | ×3.03（3.10・2.93・3.07） | ×4.88（4.84・5.09・4.70） | ×4.64 | ×4.78 | ×5.14 |
| シャンチー | **Praline** | ×1.77（1.84・1.69） | ×2.98（3.00・3.08・2.86） | ×4.58（4.62・4.28・4.85） | ×4.67 | ×5.06 | ×5.14 |
| チャンギ | 前 | ×1.78（1.78・1.78） | ×2.85（2.82・2.88） | ×4.40（4.41・4.38） | ×4.18 | ×4.63 | ×4.09 |
| チャンギ | **Praline** | ×1.74（1.75・1.73） | ×3.04（3.01・3.06） | ×4.58（4.38・4.77） | ×4.41 | ×4.49 | ×3.93 |
| チェッカー | 前 | ×1.77（1.67・1.87） | ×3.22（3.31・3.12） | ×5.08（5.04・5.12） | ×5.34 | ×5.69 | ×6.25 |
| チェッカー | **Praline** | ×1.78（1.57・1.98） | ×3.24（2.64・3.84） | ×5.37（5.01・5.72） | ×5.36 | ×6.10 | ×6.94 |

- 同じ設定の回ごとの揺れ（±10〜20%）の内で、前と同等。シミュレーションは局面数の時計なので、差が出るのは探索の手順が違うときだけで、前処理後のソースを並べ替えて比べると、違いは構造体の欄の並び・つなぎの関数への置き換え（`spCutoff`・`spTop`・`spIdleReset`）だけ（式は同じ）。揺れはスレッドの実際の順番（分割点の取り合い）と、チェッカーは主スレッドが前の仕事の履歴を持ち越すことから来る（1スレッドだけの実行は前後で全一致）。
- シャンチー・チャンギの「前」は MODEL_CARD／spec の YBW 導入時の数字（シャンチー ×1.78／×2.99／×4.76、遅いコアあり ×4.75／×5.03／×4.97）とも揺れの内。

**headless Chrome（Playwright、作業機）**：

作業機のローカルサーバー（このブランチ）で、`xiangqi`・`janggi`・`checkers` の `bench.html`（1秒、1・2スレッド：分離あり・12局面とも最後まで・最善手の一致 9〜10/12）、対局ページ（分離・マルチスレッドオン・2スレッドの組で解析：補助の局面数 22万〜67万）、`pro/`（シャンチー・チャンギ）で、新しい `engine_mt.wasm?v=…` を読み、ページのエラーなし（外部の読み込みが作業機のプロキシで失敗するのは別）。2コアがシミュレーションで埋まっていたため、壁時計の速さは測れない（2スレッドが1スレッドより遅いのはそのため）。

### 第2段（2026-11-11）：タフル・モリス・ファノロナ
- 3ゲームの `engine.c` の分割点・YBW を Praline に移し、つなぎだけを残した（合わせて約 −850 行）。ヘッダは変えていない（シャンチー・チャンギ・チェッカーの wasm はそのまま）。
- **一致**：通常版 wasm は3ゲームとも前処理後のソースが同じ（作り直していない）。`engine_mt.wasm` の1スレッドは前の配信版と全一致（タフル：`tools/mtsim/wasm1.js` に追加、24局面・深さ9。モリス：`morris/tools/check_wasm.js` の30局面の md5、深さ15・13。ファノロナ：`bench.html` の12局面・深さ14 を Node で）。
- タフルは busy marks を使わない（共通ヘッダの表は呼ばれないので最適化で消え、宣言するメモリは同じ）。モリスは手が `int`（`typedef int Move`）、停止の変数が `aborted`（`#define stopFlag aborted`）、busy marks の鍵は `busyK(p)`（表の位置は前と同じ `h2` から）。モリスは分割点に根の値の欄が増え、宣言するメモリが 1036 → 1038 ページ（プールの `initial` 1152 のまま）。
- **マルチスレッド（`tools/mtsim`、64局面ごとに同期、2回の平均）**：同じ深さまでの時間の1スレッド比（全部同じ速さ 2／4／8、遅いコアあり 8／10／14）。

| ゲーム | 版 | 2 | 4 | 8 | 遅いコアあり 8 | 10 | 14 |
|---|---|---|---|---|---|---|---|
| タフル（12局面・150万） | 前 | ×2.17 | ×4.12 | ×7.10 | ×7.34 | ×7.82 | ×9.45 |
| タフル | **Praline** | ×2.36 | ×4.16 | ×7.38 | ×7.61 | ×8.80 | ×8.99 |
| モリス（12局面・300万） | 前 | ×1.70 | ×2.78 | ×5.15 | ×5.18 | ×4.79 | ×5.09 |
| モリス | **Praline** | ×1.75 | ×2.69 | ×4.85 | ×5.32 | ×4.85 | ×5.26 |
| ファノロナ（12局面・300万） | 前 | ×1.75 | ×2.98 | ×5.28 | ×5.44 | ×5.45 | ×6.19 |
| ファノロナ | **Praline** | ×1.76 | ×3.10 | ×5.47 | ×5.31 | ×5.83 | ×6.30 |

  - どれも回ごとの揺れ（同じ版・同じ設定で ±10〜20%：例 モリス前の8スレッド ×5.53 と ×4.77）の内で同等。各回の数字は各 MODEL_CARD／spec。
- headless Chrome（Playwright）：3ゲームの `bench.html`（1秒、1・2スレッド）、対局ページ（2スレッドの組で解析）、タフルの `pro/` がエラーなく新しい `engine_mt.wasm` で動く。

### 第3段（2026-11-11）：将棋・チェス（共通ヘッダに任意のつなぎを追加）
- 共通ヘッダに §1② の「任意のつなぎ」を足した。定義しなければ前と同じコードで、先に移した6ゲームの `engine_mt.wasm` はヘッダを変えた後もコード・データの全セクションが同じ（作り直していない）。
- **将棋**：値が `double`、読み筋の受け渡し、根の値は fail-low を値なしに、10スレッドより先の補助は `PL_IDLE_HOOK` で Lazy SMP（`lazyRun`）。継続履歴の共有などは探索側のまま。通常版3つと HalfKP の道具（`-DNUE_KB` の `kptool`・`engine_kp.wasm`・`usimatch`）は前処理後のソースが同じ。`engine_mt.wasm` の1スレッドは12局面・深さ14 で局面数・手・評価値・深さ・読み筋が全一致。
- **チェス**：補助1番だけが YBW（ほかは Lazy SMP）のまま。分割点の手の印を 64ビットの集合から1手1バイトに、読み筋とカットしたスレッドの印は `PL_ON_RAISE`／`PL_ON_CLOSE`、`mt_split` はゲームのもの（`PL_MT_SPLIT`）。NNUE の部分は触っていない。`engine_mt.wasm` の1スレッドは12局面・深さ15 で全一致。
- **マルチスレッド（`tools/mtsim`）**：

| ゲーム | 版 | 2 | 4 | 8 | 遅いコアあり 8 | 10 | 14 |
|---|---|---|---|---|---|---|---|
| 将棋（24局面・100万） | 前 | ×1.41（1.41・1.40） | ×2.29（2.34・2.23） | ×3.16（3.25・3.07） | ×3.38 | ×2.77 | ×3.10 |
| 将棋 | **Praline** | ×1.61（1.63・1.58） | ×2.29（2.25・2.32） | ×3.19（3.16・3.21） | ×3.41 | ×2.85 | ×3.67 |
| チェス（12局面・150万、`SIM_YBWN=1`） | 前 | ×1.57（1.71・1.42） | ×1.77（1.76・1.77） | ×2.65（2.36・2.93） | ×2.52 | ×2.51 | ×2.44 |
| チェス | **Praline** | ×1.46（1.54・1.38） | ×1.78（1.75・1.80） | ×2.77（2.85・2.68） | ×2.44 | ×2.52 | ×2.76 |

  - 揺れの内で同等。各回の数字は各 MODEL_CARD。
- headless Chrome（Playwright）：将棋・チェスの `bench.html`・対局ページ・`pro/`（2スレッド）がエラーなく新しい `engine_mt.wasm` で動く。

### チェス v3（2026-11-12）：将棋と同じ「YBW 10＋Lazy SMP」と busy marks
- 共通ヘッダは変えていない（ほかのゲームの `engine_mt.wasm` はそのまま）。チェスの `engine.c` で：分割の深さ 7 → 6、予想カット節でも分ける、busy marks（Praline の `busyOther`／`busySet`／`busyClear`、残り深さ2、後回しの手は元の番号で枝刈り・LMR）、分割点の停止を見る間隔 256局面。YBW の補助の数はページ側（`mt-helper.js`・`pro/mt-worker.js` の `YBW_HELPERS` 9、計測ページは `?ybw=N`）。1スレッドは12局面・深さ15 で全一致。
- `tools/mtsim`（24局面・100万、`SIM_Q=64`、2回の平均）：

| ゲーム | 版 | 2 | 4 | 8 | 遅いコアあり 8 | 10 | 14 |
|---|---|---|---|---|---|---|---|
| チェス | 前（YBW 1＋Lazy） | ×1.43 | ×1.89 | ×2.60 | ×2.46 | ×2.56 | ×2.68 |
| チェス | **v3** | ×1.49 | ×2.09 | ×2.76 | ×2.94 | ×2.59 | ×2.89 |

  - 全部 YBW の深さ 4・5・7、カット節で分けない形なども試したが、どれも 8スレッド ×2.4〜2.9 で揺れの近く。チェスは余分な局面（8スレッドで 2.2〜2.5倍）が大きく、将棋ほど YBW で伸びない。Mac の `chess/bench.html` と `?ybw=1`・`?ybw=0` で並べて決める（chess/MODEL_CARD.md「マルチスレッド v3」）。

### 移行の判断と次の候補
- **将棋（第3段で移行済み）**：読み筋を分割点経由で戻す（`pvTable` の写し）・継続履歴の共有・`YBW_MAX`（10スレッドより先の補助は Lazy SMP：`lazyRun`・`gRootSeq`・`gRootP`）がある。Praline に「手が alpha を上げたときのつなぎ（読み筋）」と「Lazy の補助の上限 `YBW_MAX`」（`mt_idle` の入口で `threadId >= ybwMax` なら Lazy の根の読みへ、`mtCheck` で主の根の更新を見る）を足してから移す。将棋の移行と同時に、将棋の12局面で全一致を確かめて入れる（使うゲームのない共通コードは先に入れない）。
- **チェス（第3段で移行済み）**：YBW の補助は1つだけで、YBW の補助と主が履歴・カウンター手の表を共有し、分割は予想カット節を除く。上の将棋の足し方の後に。
- **リバーシ**：元祖の作り（分割点256個、`CHK_Q`＝4096局面ごとの確認、完全読みの分割）で、中盤と終盤の2種類の探索に分割点がある。並行して別の作業が `reversi/engine.c` 以外を触っている間は移さない。最後に回す。
- **共通にしなかったもの（理由）**：①分割点を開く場所（手の生成・順番・枝刈りがゲームごとに違い、関数にすると1スレッドの読みを変えずに書くのが難しく、性能も落ちうる）、②`timeUp`（ゲームごとに確認の間隔・局面数の上限・`gHit` の見方が違う）、③各スレッドの結果の共有 `gRes`（手の詰め方がゲームごと）、④共有の置換表（局面の鍵と項目の詰め方がゲームごと。作りは同じなので、次の段で `praline_tt.h` にまとめる候補）、⑤スレッドの起動（`mt_stack`・`mt_thread`：ゲームの初期化を呼ぶ。シミュレーションの `gen.py` がこの節を切り取る）。

### アマゾンズ（2026-11-11）：JS の αβ を C に移して Praline に
- αβ の探索ループ（`search`・解析の全部の手・最善手の反復深化）を `amazons/core.c` に移し、MCTS と同じ `core_mt.wasm` で Praline の YBW（つなぎ：局面は盤100＋アマゾン8＋手番＋鍵2つ、ルートの候補の値 `sc`、`spCutoff` は空＝キラー・履歴なし）。補助は `mt_help` の中で MCTS の木と分割点の両方を待つ。1スレッドは JS の探索と手・値・局面数・評価数が全一致（`amazons/tools/check_ab.js`、246回の探索）。
- `tools/mtsim`（評価数の時計）深さ6・8局面：2／4／8 ×1.78／3.07／4.76、遅いコアあり 8／10／14 ×4.82／4.79／4.73。前（mtsplit の共有・YBW＋手伝い、`mtstep` を評価数の時計に）×1.43／2.21／3.39。1スレッドも ×1.22（ループを C に）。詳細は claude/amazons-spec.md「αβ を C に」。

### ウゴルキ（2026-11-11）：ルートのループを C に、Praline に
- 探索はすでに C（core.c）で、JS はルートのループと mtsplit。ルートのループを `ab_best`／`ab_values` に移し、`core_mt.wasm` で Praline の YBW（つなぎ：局面・繰り返しの履歴・各手の元の順番 `lg`）。1スレッドは前の版と848回の探索で全一致。`tools/mtsim`（局面数の時計、5局面・深さ8）2／4／8 ×1.97／3.71／6.79、遅いコアあり 8／10／14 ×6.74／7.04／7.62（前の mtsplit ×1.37／2.18／3.30）。詳細は claude/ugolki-spec.md。

### アゴン（2026-11-11）：ウゴルキと同じ手順
- ルートのループを `ab_best`／`ab_values` に、`core_mt.wasm` で Praline の YBW。1スレッドは前の版と424回の探索で全一致。`tools/mtsim`（局面数の時計、5局面・深さ7）2／4／8 ×1.89／3.58／6.14、遅いコアあり 8／10／14 ×6.14／6.41／6.51（前の mtsplit ×1.22／1.64／2.28）。

### コナネ（2026-11-11）：ウゴルキ・アゴンと同じ手順
- ルートのループを `ab_best`／`ab_values` に、`core_mt.wasm` で Praline の YBW。1スレッドは前の版と520回の探索で全一致。`tools/mtsim`（局面数の時計、深さ11）2／4／8 ×1.83／3.10／4.93、遅いコアあり 8／10／14 ×4.48／4.81／4.67（前の mtsplit ×1.39／2.19／3.16）。
- `shared/tools/mtstep.js`：Worker の `location` を用意（アマゾンズ・ウゴルキ・アゴン・コナネの engine.js が `location.search` の `mt=1` を見るので、それまでアマゾンズで止まっていた）。αβ を C に移したアマゾンズは JS が時計をほとんど呼ばないので、mtstep の値は分離できないページの予備の方式の参考だけ。

### 五目並べ（2026-11-12）：JS の探索を丸ごと C に移して Praline に
- 盤の形の差分更新・禁手・VCF/VCT・αβ・評価ネットを `gomoku/core.c` に（`core_simd.wasm`／`core.wasm`／`core_mt.wasm`、表と重みは `engine.js` が写す）。1スレッドは JavaScript と 374回の探索（Lv.10〜16 の `think`・深さ固定の `best`・解析・`resist`）で手・値・深さ・局面数が全一致、`core_mt.wasm` の1スレッドも共有の置換表の JavaScript と全一致（`gomoku/tools/check-core.js`）。CPU 時間で約2〜2.8倍（SIMD 版）。
- つなぎ：分割点に節の `Pos`（約28KB）・各手の順番 `lg`（7手目からの減らし）・相手の脅威 `opp`、`spCutoff` は共有の履歴。各スレッドの状態（勝ち筋の読みの表 4MB）は `mt_thread` の `memory.grow`。分割の深さ4（読み筋の節は2）、busy marks、解析は候補手を深さ2から1つの分割点に。
- `tools/mtsim`（`g_gomoku.h`、時計は打った手の数、遅らせる書き込みは busy marks だけ）：1手の読み 2／4／8 幾何平均 ×1.44／2.17／2.71（前の JS 版 ×1.40／2.12／2.75）、解析 合計 ×2.02／3.89／5.51（前 ×1.74／2.75／3.80）。詳細は gomoku/MODEL_CARD.md。

---

## 7. エンジン本体とサイト側のつなぎの境目（別リポジトリでの公開を前提に、2026-11-11）

Praline は将来、洗練してから Apache-2.0 で別リポジトリに公開する予定（ユーザーの方針、急がない。リポジトリの作成・公開はユーザーが判断する）。そのため、どこが**エンジン本体（ゲームにもこのサイトにも依存しない）**で、どこが**サイト側のつなぎ**かをはっきり分けておく。

| 区分 | ファイル | サイト固有のものへの依存 | 公開の扱い |
|---|---|---|---|
| **本体（C）** | `shared/praline/praline.h`・`praline_ybw.h` | なし（ゲームの型と `PL_SP_FIELDS` 等のつなぎは引数として受ける。コメントにもゲーム名・ページ名を書かない） | そのまま公開 |
| **本体（JS）** | `shared/mttt.js`（共有の置換表） | なし | そのまま公開 |
| 本体（JS）＋サイトの UI | `shared/mtsplit.js`・`shared/mtworkers.js` | 歯車の項目（`HeaderBar.addOption`）、`localStorage` の `aicoding-mt`／`aicoding-mt-w`、14言語の文言 | 公開前に「プールと分担（本体）」と「選択の保存・歯車の項目（サイト）」を分ける。本体側は `options: { storageKey, onToggle }` のように外から受け取る形にする |
| 本体（JS）＋サイトの UI | `shared/mtengine.js`・`shared/mt-sw.js` | `HeaderBar`、`Online.available`（オンライン対戦）、`atlas`、`aicoding-*` のキー、Firebase のドメインの扱い（mt-sw.js） | 同上。分離（Document-Isolation-Policy／COOP・COEP の Service Worker）とスレッドの組は本体、オンライン・ログインとの調停と歯車はサイト |
| サイト専用 | `shared/proset.js`（PRO の画面、大百科の配色）・`shared/ponder.js`（PRO の先読み）・`shared/bench-auto.js`・`bench-all.html` | 対局設定の画面・大百科・サイトの計測の流れ | 公開しない（ponder の「人の手番に読み続ける」考え方はサンプルとして README で紹介だけ） |
| **シミュレータ本体** | `tools/mtsim/sim.c`・`simcore.h`、`shared/tools/mtstep.js` の歩調合わせ部分 | なし（`GAME_H` で差し込む） | 公開 |
| シミュレータのつなぎ | `tools/mtsim/gen.py`（ゲームごとの書き換え規則）・`g_<game>.h`・`dump.js`・`wasm1.js`、`checkers/tools/mtsim/` 等 | ゲームの `engine.c`・`bench.html` の局面 | サンプルとして1〜2ゲーム分だけ |
| ゲームのつなぎ | 各 `engine.c` の `PL_SP_FIELDS`・`spFillPos`／`spLoadPos`・`spSearch`・`spCutoff`・`spTop`・`waitCheck`・`spIdleReset`、`mt-helper.js`、`app.js` の `MTEngine.use` | ゲームそのもの | サンプルとして公開（下記） |

今回は移動はせず、境目だけをはっきりさせた（C のヘッダは本体のみ・コメントからもサイトの参照を外した）。切り出すときは `shared/praline/` を `praline/`（c/・js/・sim/・examples/・bench/）の1つのフォルダにまとめる。

## 8. 別リポジトリでの公開の計画（案。実行はユーザーの判断）

### 公開する範囲
1. **本体**：C のヘッダ（`praline.h`・`praline_ybw.h`、次の段で共有の置換表 `praline_tt.h`）、JS の汎用部品（`mttt.js`、UI を外した `mtsplit`・`mtworkers`・`mtengine` のプールと分離の部分、Service Worker の部品）。
2. **サンプルのつなぎ**：小さく自己完結した例を1つ新しく作る（例：コネクトフォー程度の小さな αβ を C で書き、つなぎ一式・`mt-helper.js`・ページ1枚）。サイトのゲームからは、つなぎが短く評価関数の重みを含まないチャンギ（手作りの評価）を「実戦の例」として載せられるか検討（ゲームのルール・評価は公開してよいかユーザーが判断）。
3. **シミュレータ**：`sim.c`・`simcore.h`・サンプルのゲーム用の `g_<game>.h` と `gen.py` の考え方（「本当に同時」：一定の局面数ごとに歩調をそろえ、共有表への書き込みを回の終わりまで見せない／遅いコアのモデル）。
4. **ベンチ**：`bench.html` の汎用版（スレッド数ごとの nps・同じ深さまでの時間・最善手の一致・幾何平均）。

### 公開しない範囲
- 各ゲームの画面・レッスン・パズル・オンライン（Firebase の設定・DB ルール）・大百科（atlas）・キャラクター・PRO の画面・計測の自動化（bench-all）。
- **学習した重み・学習データ**（NNUE の `nnue.bin.gz`・`evalnet.bin.gz` 等）。Praline は探索の並列化だけで、重みは含めない。
- 未発表の企画、ユーザーの Mac の計測の生データ（数字の要約は README に載せてよい）。

### ライセンス
- **サイト全体・各ゲームはライセンス未設定**（2026-11-11 時点。リポジトリ直下にもゲームのフォルダにも LICENSE は置かない。以前 `reversi/`・`shogi/` にあった Apache-2.0 の LICENSE と MODEL_CARD の `license: apache-2.0` は、ユーザーの指示で外した）。
- **Praline は、もっと洗練してから Apache-2.0 で別リポジトリに公開する予定**（急がない）。Praline の C・JS はこのリポジトリで書いたもので外部のコードを含まない。公開するときに公開リポジトリ側に LICENSE と SPDX 表記を付ける（サイトのリポジトリのファイルには付けない）。
- **GPL のエンジン**（Stockfish・Pikafish・Rapfi・GNU Go 等）は、ユーザーの Mac 上で教師役・物差しとして使っただけで、**コードはサイトにも Praline にも含めない**（`handoff-common-rules.md` §2、各 MODEL_CARD）。Praline の公開物に GPL のコードが入っていないことを公開前に確認する（下のチェックリスト）。
- **重み・データの出所**（Praline には含めないが、例やベンチで触れるときの注意）：チェスの NNUE は Lichess の評価済み局面データベース（**CC0**）＋自己対局（Stockfish で付け直し）、シャンチーの NNUE は Pikafish（GPL-3.0）の自己対局の局面と評価で学習（エンジンの出力を学習に使ったもので、コードは含まない）、五目並べは Gomocup の局面と Rapfi（GPL-3.0）の採点、囲碁のネットは sanderland/vibego（**CC BY 4.0**、教師は KataGo）。サンプルやベンチに重みを同梱するなら、それぞれのライセンス・クレジットを付ける（同梱しないのが簡単）。
- 参照した手法の名前（Young Brothers Wait、Kerrigan の simplified ABDADA、Lazy SMP）は README の参考文献に書く（コードの借用はない）。

### 英語の README の骨子
```
# Praline — multi-core search glue for WebAssembly game engines
Many cores (nuts) held together by shared memory (caramel).
## What it is   — YBW split points + busy marks for alpha-beta engines compiled to wasm with threads (SharedArrayBuffer),
                   plus the browser side: a worker pool, cross-origin isolation via a service worker, a lockless shared TT.
## Why          — Lazy SMP plateaus around 8 threads in the browser; YBW with helpful masters, second searches of stragglers
                   and waiting-owner marks keeps scaling on big.LITTLE CPUs (numbers from a 14-core M-series machine).
## Quick start  — the glue a game provides (PL_SP_FIELDS, spFillPos/spLoadPos, spSearch, spCutoff, spTop, waitCheck,
                   spIdleReset), where to open a split point in search(), the helper worker loop (mt_idle), building with
                   clang --target=wasm32 -matomics -mbulk-memory -DMT, the page side.
## Guarantees   — one thread searches exactly as without Praline (how to check: node counts per position).
## Simulator    — the lockstep "truly concurrent" simulator, slow-core model; how to reproduce the tables.
## Benchmarks   — the bench page; results table.
## Browser notes — Document-Isolation-Policy vs COOP/COEP, Safari/Firefox, memory `initial` pages.
## License / credits / references
```

### サイトのリポジトリからの取り込み方（比較とおすすめ）
| 方法 | 良いところ | 困るところ |
|---|---|---|
| git submodule | 版がはっきり（コミットで固定） | GitHub Pages で submodule の中身を配るには公開リポジトリ・Actions の設定が要る。GitHub Desktop でのクローン・複数アカウントの作業で「中身が空」の事故が起きやすい |
| git subtree | 中身が普通のファイルとしてサイトのリポジトリに入る（Pages・クローンはそのまま）。`git subtree pull/push` で行き来できる | コマンドが長く、履歴が混ざる。複数のエージェント・アカウントが同時に触ると push の順番の調整が要る |
| コピー＋同期スクリプト | いちばん単純（`tools/praline-sync.sh` が公開リポジトリの決まったタグからファイルを写し、版と差分を表示） | 逆向き（サイトで直した分を公開側へ）を手で行う必要 |

- **おすすめ：最初は「コピー＋同期スクリプト」、慣れたら subtree**。今の作業の流れ（PR → main、GitHub Pages がそのまま配る、複数アカウント）を崩さず、公開リポジトリを正本にして、サイトは `shared/praline/` にタグの版を写す（写したファイルの先頭に `Praline vX.Y` を入れる）。サイトで先に直したときは、同じ PR の中で公開リポジトリ側への反映メモを残す。
- どの方法でも、ヘッダを更新したら読む全ゲームの `engine_mt.wasm` を作り直し、§5 の確認をする。

### 公開前のチェックリスト
- [ ] 本体のファイルにサイト固有の名前（ゲーム名・`aicoding-*` のキー・`HeaderBar`・`Online`・`atlas`・Firebase）が残っていない（`grep`）。
- [ ] GPL のコード・他者のコードが入っていない（Stockfish・Pikafish・Rapfi 等は使っていないことを確認、参考にした手法は README の参考文献へ）。
- [ ] 重み・学習データを同梱しない（同梱するならライセンスとクレジット）。
- [ ] 公開リポジトリの LICENSE（Apache-2.0）と各ファイルの先頭の SPDX 表記、著作権者の表記（ユーザーの希望の名義）。
- [ ] サンプルのゲームが単体で build・実行できる（clang のコマンド、Node での1スレッドの一致テスト、2スレッドのブラウザのテスト）。
- [ ] シミュレータの手順が README のとおりに再現できる。
- [ ] 秘密の企画・個人情報・内部の計測ログ・ユーザーの端末の情報が入っていない。
- [ ] 英語の README・コメント（日本語のコメントは英語に）。
- [ ] サイト側が公開版を取り込んでも全ゲームの1スレッドの一致・ベンチが前と同じ。

---

## 9. ロゴとトップページの掲載（2026-11-11）

**ロゴ（ユーザーが決めたデザイン、白ベース＝明るい背景用の横組み）**：`praline/`
| ファイル | 中身 |
|---|---|
| `icon.svg` | アイコン（案A Cluster）：キャラメル #C9823F の角丸正方形に、クリーム #F5EADB とココア #2A1E17 の丸4つ（縁取りはキャラメル） |
| `icon-16.svg` | 16px 用の簡略版（丸3つ、縁取りなし） |
| `logo.svg` | 横組み：白い背景＋アイコン＋「Praline」（Outfit 600、letter-spacing −0.03em、ココア #2A1E17。i の点はキャラメルの丸＝点なしの ı ＋直径0.2em の丸を Outfit の i の点の高さに）＋下に「THINKING ENGINE」（Outfit 500、letter-spacing 0.32em、#7A5A44） |
| `card.svg` | トップページのパネル用（2026-11-11 改：**3:2・1500×1000 の暗い版**。ココア〜黒の地 #1A130F〜#241A14、ロゴは暗い背景用＝文字クリーム #F5EADB・i の点キャラメル・THINKING ENGINE #C8B29C、幅の約56%。ロゴの帯の上下にキャラメル／ココアの光を feGaussianBlur（半径90）で敷き、画像の上下各22%は mask でパネルの地 #100C0A へ溶ける。白地は使わない＝トップは暗いテーマで、白は周りより明るすぎるため） |
| `tools/build.py`・`tools/outline.py` | 上の4つを作るスクリプト（`python3 praline/tools/build.py praline`、fontTools） |

- 文字は**アウトライン化済み**（`<img>` で使ってもフォントを読まない）。作業機に Outfit の可変フォントがなかったため、Outfit の Regular（400）と Bold（700）の輪郭（同じ点の構成）を補間して 600・500 相当を作り、カーニング（GPOS kern）も同じく補間。可変フォントで作り直すときは `outline.py` を差し替える。
- Outfit は SIL Open Font License 1.1（Copyright 2021 The Outfit Project Authors）。ロゴのような図案（アウトライン化した文字）は自由に使え、フォントのファイル自体は同梱しないので OFL の文書の同梱は不要。

**トップページ（`index.html`）**：「開発室」の下に新しい見出し「ソフトウェア」（`#software`、14言語 `sw.h2`・`sw.sub`・`sw.desc`）を作り、開発室と同じギャラリー（`makeGallery`、`p: 'sw'`、台帳 `SOFTWARE`）で Praline を1項目置く。
- 箱は開発室と同じ形（`.lab.sw`、キャラメル色の破線・方眼）、カードはパネル＋アイコンの並び。パネルの絵は `card.svg`（台帳の `soft: true` → `.gx-media.sf`：地を #100C0A、ぼかした背景の複製と下の影を出さない、スマホは枠を 3:2）。
- **準備中**：台帳の `soon: true` で、アイコンの左上に「SOON」（バッジは英語表記の規則どおり）、タグと再生ボタンの位置に「準備中」（`tag.soon`、14言語）。ボタンは破線の押せない形（`aria-disabled`）、パネルの絵・アイコンをクリックしても遷移しない（Enter も選ぶだけ）。公開したら `soon` を外して `href` を入れる。
- 説明は `pl.desc`（14言語、PC 幅392px・6行に収まることを計測済み）。公開タイトル数（`stat-titles`）には数えない。
- **メニュー**（2026-11-11 ユーザー指示）：上のナビ（開発室の次）と下のタブ（4列に）に「ソフトウェア」（`#software`、`nav.sw`＝`sw.h2`、インドネシア語だけタブに収まる「Software」）。5項目でも1行に収まるよう 901〜1120px はナビの間隔と文字を詰める（901〜1000px はさらに詰める）。
- **ゲームの中の表示**（2026-11-11）：§2 の表のゲームの単体ページに「Powered by Praline」（`shared/praline-badge.js`。PC は右下に固定、スマホは歯車のパネルの下。押すとトップの `#software`）。決まりは addendum「Powered by Praline の表示」。
- **フル機能・大百科**（2026-11-11）：フル機能（`?skin=atlas`）にも同じ表示、大百科（`atlas/index.html`）はいちばん下の「トップへ · CALMDUST COLLECTION」の横と、ちゃぶ台で Praline のゲームを遊んでいる間（PC 右下・スマホ右上の小さなアイコン、別タブで開く）。

---

## 10. 今後の課題（2026-11-13、リバーシの強化から持ち込む候補）

2026-11-12〜13 のリバーシの強化（`reversi/MODEL_CARD.md`）は、ほとんどがリバーシの中身（評価・読み切り・置換表）の話で、Praline の共通部分（`shared/praline/`）は変えていない。ただ、ほかのゲームにも使える学びが3つあったので、課題として残す。どれも未着手。

### ① 強さで測る道具を共通に
- いまの計測（§1 ③）は「同じ深さまでの時間・nps・最善手の一致」が中心で、**速さ**は分かるが**強さ**は分からない。リバーシで効いたのは「読みの深さ（1手で +66〜83 Elo）」「終盤を読み切る範囲（1マスで約 +19 Elo）」など時間の使い方で、同じ深さの計測には出てこない。
- リバーシには `reversi/tools/train/rvmatch.c`（設定 A 対 B を、同じ初期局面の組で先後を入れ替えて対戦し、Elo と誤差を出す。ネイティブで数百局）がある。JavaScript エンジン用の `shared/tools/nodematch.js` と合わせて、**「設定 A 対 B の両番対戦 → Elo ± 誤差」をどのゲームでも同じ形で回せる道具**にする。
- 決めること：初期局面の作り方（ゲームごと）、1局の時間か局面数か（端末の速さに左右されない局面数が基本）、結果の書式（MODEL_CARD にそのまま貼れる形）。
- 外部の強いソフトを物差しにするとき（リバーシは Edax、将棋は Gikou、シャンチーは Pikafish）は、作業機で使うだけでサイトには入れない（ライセンス）。

### ② 「黙って無効になる」事故の検出
- リバーシで、初期化の順番の間違い（定数を使う場所より後ろで宣言）が `catch` に飲まれ、**wasm が黙って無効になり JavaScript の探索に落ちていた**。画面は普通に動くので気づきにくい（気づいたのは「終局まで読む」が発動しないテスト）。
- 同じ形（`try { wasm の用意 } catch { 使わない }`）は各ゲームの `engine.js`・`shared/mtengine.js` にある。**「wasm が有効か」「マルチスレッドが有効か（分離・スレッド数）」を1か所で確かめられる**ようにする。
  - 案：各エンジンが状態（wasm の有無・スレッド数・落ちた理由）を返す共通の口を持ち、`bench.html`／`bench-all.html` と headless Chrome の確認（§5）でそれを見る。落ちた理由は `console.warn` に出す（握りつぶさない）。
  - §5 の「headless Chrome で確認」に「wasm とスレッドが有効なこと」を加える。

### ③ 時間を区切った追加の読み切り（共通の型）
- リバーシの `tryMs`：通常の読みが終わった後、**決めた時間の中だけ**一段深い読み切りを試し、間に合わなければ結果を捨てて通常の手を使う。端末ごとの上限（遅い端末では試さない）つき。考える時間の上限は変えない（「強化で思考時間を増やさない」の約束を守る形）。
- 同じ型が使えそうな所：将棋・チェスの詰み探索、チェッカー・モリス・ファノロナの終盤の読み切り。
- 共通にするなら `shared/proset.js`（思考の制限）か `shared/mtengine.js` の `run` のまわりに「時間つきの試し読み（中止できる・結果は捨てられる）」を置く。マルチスレッドでは、試し読みを補助スレッドに回して主スレッドの結果を待たせない形も考えられる。

### 流用しなかったもの（記録）
- 置換表のバケット化（4項目）、読み切りの手の並べ方、評価の先後の偏りの調査は、リバーシの中身なので共通化の対象外。
- マルチスレッド版の置換表を大きくしても局面数は減らなかった（リバーシ、`TT_LOG_MAX` 22 は不採用）。ほかのゲームで置換表を大きくするときも、先に局面数で確かめる。
