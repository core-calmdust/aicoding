// パトリ（patolli/）のオンライン対戦・Googleアカウント同期の Firebase 設定。まだ null（オンラインは「準備中」、動作確認は ?mock=1）。
// 専用プロジェクトは作らず、バックギャモンのプロジェクト（backgammon-multi）に相乗りする（2026-11-16 の統合）：
// window.FIREBASE_ROOT = 'patolli/' と backgammon/firebase-config.js の値を入れ（ur/firebase-config.js と同じ形、_PREV は不要）、
// shared/tools/secrules.py の GAMES に host=('backgammon', 'patolli') で足して backgammon/database.rules.json を作り直して公開する。
// 注意：online.js / online-ui.js は ur/ からの写しで、対局の記録形式（サイコロ4個の鎖など）はまだウルのまま。公開前にパトリ用に直すこと。
window.FIREBASE_CONFIG = null;
// App Check（reCAPTCHA Enterprise のサイトキー）。null＝使わない。
window.FIREBASE_APPCHECK_SITE_KEY = null;
