# Dots & Boxes 4×4 完全解析 — 進捗ログ（再開用）

## 目的
dots/ の Lv9/Lv10 を 4×4 マス（5×5 点、40 辺）で初手から完全プレイにする。
オフライン厳密ソルバ（C）→ 定石表（AI 手番の全局面、相手の全応手を網羅）→ engine.js から利用。

## 場所
- ソース: /home/claude/work/dots4src/ （dots.c = ソルバ本体。native と wasm 両対応。verify.c = 総当たり照合、bench.c = 計測）
- チェックポイント: /home/claude/work/ckpt/dots4/
- git: ブランチ wip-ai-data（worktree /home/claude/work/wip-ai-data/dots4/）。main には絶対コミットしない。

## ソルバ仕様（dots.c）
- 値 = 手番側の「今後の獲得箱数の差」。局面＝描かれた辺の 40bit マスク（スコアと無関係）。
- Berlekamp の取得規則（全部取る / 2個・4個残して渡す）、単純ルーニー終盤（鎖と輪のみ）は DP で厳密値。
- 置換表: 正規形 = 8 対称 + 角の外周2辺の同値化、下限/上限を保存（64bit エントリ: key42|lo|hi|move）。
- 枝刈り: 孤立した鎖/輪の開け方の重複、角の外周2辺の重複。
- 辺番号は engine.js と同じ（横辺 (R+1)*C が先、次に縦辺）。

## 検証ログ
- 2×2: 総当たりと 20 万局面一致（根の値 +2）
- 2×3: 20 万局面一致（根の値 -2）
- 3×3: 30 万局面一致（根の値 -3 = 文献通り後手 6-3）

## ソルバ改良履歴
- v1: 基本形。v2: PVS（効果小）、history（悪化→無効）。
- 強制取得をループ処理、MS[8] 増分対称マスク、ETC（und>=24 で 5% 減）、killer（悪化→無効）。
- 鎖の枝刈り一般化（chain_skip）: 2辺の箱の鎖は接合箱につながっていても開け方は同値（長さ2のみ中央/端の2通り）。
  総当たり照合（3×3, 2×4 各10万局面）で不一致 0。ノード数約 40% 減。

## 定石生成（bookgen.c / run_book.sh）
- AI 手番局面のみ登録（正規形キー → 正規座標の最善手, 厳密値）。AI 先手は ply<PF(=8)、AI 後手は ply<PS(=9) の AI 手番を全網羅。
- 相手の手は対称で重複除去した全応手。ply<=5 では「同値で対称局面を残す手」を優先（相手応手が半減）。
- Phase 1（1プロセス, PF=4 PS=3）で上位を確定 → Phase 2（2プロセス, ハッシュで分割: AI先手は相手 ply3、後手は ply2 で分割）。
- 結果は ckpt/dots4/book/book_<id>.txt に追記（"key move value ply side ms"）。再起動時に全ファイルを読み、解いた局面はスキップ。
- TT: root の TT ダンプを種に使用（TTSEED）、各プロセスは 10 分毎に und>=26 のエントリを tt_book_<id>.bin へ原子的保存。
- 【変更 05:00】PF=10（AI先手は ply 0..8 の AI 手番を全網羅）、PS=9（AI後手は ply 1..7）、ply<=5 で対称誘導（ply6 の誘導は割に合わず 06:10 に停止）。
  オーケストレータは run2.sh（2スロット: s0 share0 → s1 share0 / phase1 → s0 share1 → s1 share1）。
  ファイル: book_0（phase1）, book_1/2（先手 share0/1）, book_3/4（後手 share0/1）。完了印: phase1.done, p2_s{side}_{id}.done, all.done
- 再開方法: `cd /home/claude/work/dots4src && setsid nohup ./run2.sh &`（完了印のあるジョブは飛ばす。途中は結果ファイルから再開）。
- コミット: commit_ckpt.sh（wip-ai-data/dots4/ へコピーして push）。commit_loop.sh が約55分毎に実行。

## エンジン組込み（dots/engine.js）
- dots4.wasm（= solver4.c = dots.c）、dots4book.bin（mkbook.js で生成、build4.sh）。
- Lv9/10 の 4×4: 定石 → なければ wasm 厳密探索。前回の自分の手の「保証値」（最終差の下限）を記憶し、
  次の探索はまずそれを守る手を null window で確保してから改善（時間切れでも勝敗を落とさない）。
  記憶が無い場合も履歴から直前の定石局面の値で保証値を復元。
- 解析/ヒント/レビュー（4×4）も wasm で厳密値を試み、時間切れなら従来処理。
- テスト: games.js（対局ログ jsonl）→ oracle.c で各手の最適性を検証。

## 進捗
- [x] ソルバ作成・小盤面検証
- [x] 4×4 初期局面の値 = 0（引き分け 8-8）。1.14e9 ノード、9.6 分（旧版ソルバ、窓 (-1,1)）。TT ダンプ: ckpt/dots4/root/tt_root.bin（und>=25 の 22M エントリ、179MB、git には入れない）
  - 改良版ソルバ（chain_skip 等）で再計算: 同じく 0、9.2e8 ノード 4.3 分（root2/）。
- [ ] 定石表生成
- [ ] engine.js 組込み（wasm）
- [ ] 検証（Lv10 vs ランダム/Lv8、ブラウザ）
