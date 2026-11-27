# 麻雀（riichi/）— 世界のボドゲ大百科のリーチ麻雀

2026-11-27 追加（ALPHA）。雀華（mahjong/）のスキルなし版を土台に、大百科のUIに統合した「マジメな麻雀」。

## 構成（コードは雀華と共有）
- riichi/index.html が ../mahjong/*.js をそのまま読み、先頭でフラグを立てる：
  `JANKA_CLASSIC=true`（クラシックモード）、`JANKA_KEY='riichi-v1'`（セーブは雀華と別）、`JANKA_FELT='green'`（緑フェルト・青い牌の背）、`JANKA_NOHANDS=true`（3Dの手なし）。
- mahjong/app.js の `CLASSIC` 分岐：キャラ・スキル・ガチャ・コインなし。席は「あなた / CPU n」、CPU は Lv.1〜10（入門〜最上級）。
- 見た目：riichi/app-classic.css（雀華の app.css を紫→緑に塗り替えた生成物。`python3 riichi/tools/classic-css.py`）＋ classic.css ＋ atlas-skin.css（大百科の色と文字：クリーム色の紙・紺の文字・ベージュの線、Zen Maru Gothic／Fredoka、下に厚みのある丸いボタン。ロン・ツモ＝珊瑚、リーチ＝黄、鳴き＝空色、パス＝白）。
- タイトル画面はない。大百科のゲームカード（atlas/games/riichi-card.js：段位戦・フリー・オンライン、長さ、CPU Lv、ルール/レッスン/戦績/設定）から `riichi/?go=ranked|free|online|rules|lessons|stats|settings` で直接開き、閉じると大百科に戻る。
- 大百科の3D：atlas/models/riichi.js（全自動卓、`solo`＝部屋なしの暗い背景）。場所の選択は出さない。

## オンライン
- スキルなしレート戦は雀華と共通（Firebase Janka-Database、待ち行列 mm0・レート pl0、部屋の meta.sk=false）。雀華のロビーで「スキルなし」を選ぶと同じ相手と当たる。
- database.rules.json に mm0・pl0 を追加済み。**Firebase コンソールでルールの再公開が必要**。

## 戦績
- 雀華と同等（全体・対局履歴、和了役・点数・順位推移など）。スキル関連の行は出さない。GameRecord は game 'riichi'。

## レッスン
- 雀華のルールコース・ドリル40課を移植。案内役は上海のクジャクパイ（アトラモ）。台本は riichi/ls-voice.js（手書きの差し替え169本＋丁寧語→タメ口の変換、口ぐせ「クジャ」約20%）。検査：`node riichi/tools/voice-check.js`。
- ルールコース修了でクジャクパイ（av-peacock-0）を進呈。

## アトラモ（ボス）と報酬
- 4体（Lv.1〜10の帯）。2026-11-28 ユーザー指示「アクセサリではなく、クジャクパイみたいにしっかり麻雀モチーフなキャラに」で体そのものを麻雀に：
  - スズメチュン：翼・尾・とさかが索子の竹（一索の鳥）、一索の牌を持つ
  - バブコニャン：体が五筒の牌そのもの（猫耳・ひげ）、しっぽは千点棒。R はシルクハット、SR は赤五筒、SSR は金の背
  - キクチホー：目が一筒の輪、胸に筒子もよう、ルールブック
  - サンゲンドラ（UR）：頭のひれが三元牌（白・發・中）、角は点棒、中の牌を持つ
- 作り方：atlas/avatars/sp-boss.js（mjT・bamboo・mjNeko など）→ atlas/tools/bosses.html で描画 → images/atlas/av/boss-riichi-<n>-<t>.webp。
- 勝つと対応するボスのアバター（SR）を進呈（最終結果画面に表示）。オンライン・観戦では出さない。

## 言語
- ゲーム画面は日本語・英語のみ（雀華と同じ）。大百科側（カード・説明・ヒストリア）は14言語。
