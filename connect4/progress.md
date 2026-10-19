# Connect4 Lv8 完全プレイ化 進捗 (再開用)

## 目的
Lv8 を1手目から完全プレイにする。オフラインで「AIが直面しうる全局面」(相手の全応手 × AIの選んだ手) の木を
深さ D まで C ソルバで解いてブックに格納し、それ以降は engine.js のソルバで解く。

## 構成
- src/c4.h : engine.js と同一意味の C ソルバ (Pons式, 64bit bitboard)
- src/solvecli.c → /home/claude/work/c4solve (stdin の手順列 → 強解スコア, 引数 w で弱解)
- src/xcheck.js : C と engine.js の突き合わせ
- 生成物/チェックポイントはこのフォルダ (/home/claude/work/ckpt/connect4/)
- wip ブランチ: /home/claude/work/wip-ai-data/connect4/ にコピーして push (main には commit しない)

## 注意
- `pkill -f パターン` は自分のシェルも殺す (コマンド行に同じ文字列が入るため)。pkill -x を使う。
- dots/ には触らない (別エージェント)。CPU 2コア共有。

## 状況ログ
- 2026-10-19 11:50 C ソルバ作成、突き合わせ中
- 2026-10-19 12:15 ply0 弱解=中央(3) 勝ち, C で ply0..2 弱解に 391秒。cache_s0.bin に保存
- 16:40 C と engine.js の突き合わせ 2,300局面×8値 全一致 (src/xcheck.js)
- side0(AI先手) D=8: 718ノード 165秒。ply10フロンティアで JS 判定時間 (node) med16ms p99 727ms max733ms; ply12 max136ms; ply14 max45ms
- engine.js に tree.bin デコーダ(decodeTree/treeLookup/treeList)と Lv8 perfect モード追加済み (未コミット, main作業ツリー)。index.html に tree.bin 読込追加
- 生成ジョブ: `src/run_gen.sh <side> <D> 8` (再開可能, cache_s<side>.bin, 出力 t/s<side>_d<D>.txt)。実行中: side1 D=9 → side0 D=12
- エンコード: node src/encode.js t/s0_dX.txt X t/s1_dY.txt Y /home/claude/aicoding/connect4/tree.bin
- 検証: src/verify.js (対局ログ) → /home/claude/work/c4vcheck (src/vcheck.c, 弱解で手の最適性確認)
- wip push: src/wip_commit.sh (1時間毎)
- 17:20 side1(AI後手) D=9: 2679ノード 751秒。ply11フロンティア JS: p99 1035ms max1169ms; ply13 max184ms
- 方針決定: side0 D=12, side1 D=11。Lv8同士のランダム序盤(1〜2手)にも対応するため根を「ply≤3の全局面」に拡張
  (gen 第7引数 R: side, side+2..≤R の全局面を根にする)。src/run_gen2.sh <side> <D> 8 <R>
  出力 t/s0_d12_r2.txt, t/s1_d11_r3.txt
- バグ修正: 弱解モード(ply<8)で負け局面のとき movege(-1) が全手 false → 降順しきい値で最遅負けを厳密に求めるよう変更
- 検証: src/verify.js でログ → src/vrun.sh results.txt logs... (C 弱解・再開可能; 勝ち手なら局面解は省略)
- 17:35 計画変更: side0 D=10 R=2 → side1 D=11 R=3 → (余裕あれば) side0 D=12 R=2 の順に実行 (チェーンは src/run_gen2.sh を順に)。gen は SIGTERM で保存して終了するよう修正
- 18:10 side0 D=10 R=2 完了: 16,634ノード (2156秒)。暫定 tree.bin (side0 d10 r2 + side1 d9 r1, 21.7KB) を配置済み
  エンコード: node src/encode.js t/s0_d10_r2.txt 10 t/s1_d11_r3.txt 11 /home/claude/aicoding/connect4/tree.bin 2 3  (末尾2引数=各sideの根の最大ply)
- 暫定木で rand 100局: Lv8 全勝 (先手50/後手50), 探索手の最大 572ms
- ブラウザ: /home/claude/work/pw/c4lv8.js PORT (python3 -m http.server 8793 を aicoding で起動) → エラー0。
  index.html: Worker 作成時に book/tree を同期 post するよう修正 (従来は最初のジョブより後に届いていた)
- 18:13 side1 D=11 R=3 実行中 (CPU は dots エージェントと共有で遅い)
- 21:42 サーバ再起動後に再開。side1 D=11 R=3 を cache_s1.bin (41k件) から再開
- 22:25 side1 D=11 R=3 完了 72,800ノード。最終 tree.bin = s0_d10_r2 + s1_d11_r3 を配置
- 検証ログ: ver/rand.txt (500局), ver/self.txt (300局) → src/vrun.sh ver/results.txt ver/rand.txt ver/self.txt
- 22:50 rand500: Lv8全勝, 全3072手中 book2277/search295/win500, search最大337ms。self300: 探索手 ply12 で証明時間 max1.7s (1/300>1.4s) → side0 を D=12 R=2 に延長開始。engine.js: Lv8 木外は thinkPerfect (局面弱解1回+null window で手を選ぶ, 負けは最遅負けを予算内で)
- 22:57 side0 D=12 R=2 完了 63,244ノード(522秒)。最終 tree.bin = s0_d12_r2 + s1_d11_r3 (encode 引数 12 / 11, R 2 3)。次: 最終検証 ver2/
- 23:10 最終検証ログ ver2/rand.txt (500局 Lv8全勝), ver2/self.txt (300局) 完了。C 検証: src/vrun.sh ver2/results.txt ver2/rand.txt ver2/self.txt (中断しても再実行で続きから)
- 23:25 ブラウザ確認 (1440 AI先手 / 390 AI後手, ヒント・振り返り) エラー0。i18n Lv8 説明10言語, トップ index.html に c4v2.str 10言語, README 行 更新済み (未コミット)
- C 検証 ver2: 8899/約8970 件 OK (残りは ply≤4 の重い局面)。終わらなければ src/vrun.sh を再実行
- 00:13 検証完了: rand 500局 (Lv8 先手250全勝/後手250全勝) 2,970手、self 300局 (ランダム序盤1〜2手) 11,946手、計14,916手すべて C 弱解で最善 (BAD 0)。
  木外の証明時間 (node, 共有CPU): ply13〜16 で max 671ms。思考時間全体の最大 1.8s (負け局面の最遅負け精緻化に予算を使う仕様)
- 作業完了。main 作業ツリーに未コミット: connect4/engine.js, index.html, i18n.js, tree.bin, README.md, トップ index.html (c4v2.str)
