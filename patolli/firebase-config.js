// パトリ（patolli/）のオンライン対戦・Googleアカウント同期の Firebase 設定。
// まだ専用プロジェクト（patolli-multiplay）を作っていないので null。null の間、オンラインは「準備中」と表示され、Google同期は出ない
// （動作確認は URL に ?mock=1）。プロジェクトを作ったら ur/firebase-config.js と同じ形で値を入れ、DBルールは
// shared/tools/secrules.py の GAMES に patolli を足して生成する（手で書かない）。
// 注意：online.js / online-ui.js は ur/ からの写しで、対局の記録形式（サイコロ4個の鎖など）はまだウルのまま。公開前にパトリ用に直すこと。
window.FIREBASE_CONFIG = null;
// App Check（reCAPTCHA Enterprise のサイトキー）。null＝使わない。
window.FIREBASE_APPCHECK_SITE_KEY = null;
