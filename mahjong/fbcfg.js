// 雀華：セーブデータのクラウド連携（Google アカウント）に使う Firebase の設定（2026-11-18、ユーザー「丸々空いている DB を使う」）。
// アゴンをタフルのプロジェクトにまとめた後、まるごと空いた "agon-multiplay" を雀華専用に使う（**削除しないこと**）。
// データは janka/sync/<uid> = { d: セーブの JSON, t: ms }。ルールは mahjong/database.rules.json。
// 使う前に一度だけ：Firebase コンソール → agon-multiplay → Realtime Database → ルール に mahjong/database.rules.json の内容を貼って公開。
// Authentication の Google ログイン・承認済みドメイン core-calmdust.github.io・App Check は、アゴンで設定済みのものをそのまま使う。
// Web の設定値は公開前提のもの。アクセスは Realtime Database のルール（自分の uid のノードだけ読み書き可）で守る。
window.JANKA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBL0sHFK6adNnigp0Tl5fnD0SzcIZ-WEdY",
  authDomain: "agon-multiplay.firebaseapp.com",
  databaseURL: "https://agon-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agon-multiplay",
  storageBucket: "agon-multiplay.firebasestorage.app",
  messagingSenderId: "474281869256",
  appId: "1:474281869256:web:330c0e3a554276913bcafd"
};
window.JANKA_APPCHECK_SITE_KEY = '6LcvcxEuAAAAABxu1SHP-whFX7TxH2-GGe6C5QOC';   // アゴンと同じ reCAPTCHA Enterprise のサイトキー
