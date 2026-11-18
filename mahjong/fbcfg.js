// 雀華：セーブデータのクラウド連携（Google アカウント）に使う Firebase の設定（2026-11-18、ユーザー「別のゲームで空いている DB を使う」）。
// だつごく！スライド（jailbreak/）の Firebase プロジェクト "jailbreak-slider" を借りる。データは janka/sync/<uid> = { d: セーブの JSON, t: ms }。
// 使う前に一度だけ：Firebase コンソール → jailbreak-slider → Realtime Database → ルール に jailbreak/database.rules.json の内容を貼って公開
// （janka ノードを含む版）。Authentication の Google ログインと承認済みドメイン core-calmdust.github.io は jailbreak で設定済み。
// Web の設定値は公開前提のもの。アクセスは Realtime Database のルール（自分の uid のノードだけ読み書き可）で守る。
window.JANKA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDgHloSiLlcIjCYb6JjohnQT69BaTiQ0T8",
  authDomain: "jailbreak-slider.firebaseapp.com",
  databaseURL: "https://jailbreak-slider-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jailbreak-slider",
  storageBucket: "jailbreak-slider.firebasestorage.app",
  messagingSenderId: "487363897259",
  appId: "1:487363897259:web:b00bfabedd531e955254ee"
};
window.JANKA_APPCHECK_SITE_KEY = '6LceZAUuAAAAAMq1-4wVvHYxWfrj0I5Sn20Ui7fn';   // jailbreak と同じ reCAPTCHA Enterprise のサイトキー
