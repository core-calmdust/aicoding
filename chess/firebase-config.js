// Firebase settings for Chess online play.
//
// Online play needs its own Firebase project (separate from Shogi / Reversi), e.g. "chess-multiplay":
//   1. https://console.firebase.google.com → Add project → name it "chess-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable "Anonymous".
//   3. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of chess/database.rules.json and Publish.
//   4. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows.
//   5. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "chess-multiplay.firebaseapp.com",
//          databaseURL: "https://chess-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "chess-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      (make sure databaseURL is included), then bump the ?v= of firebase-config.js in chess/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, choosing online play shows "online play is being prepared" (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBglAVwkB0nDuH9oI3NLiTDz_lincMdSW8",
  authDomain: "chess-multiplay.firebaseapp.com",
  databaseURL: "https://chess-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chess-multiplay",
  storageBucket: "chess-multiplay.firebasestorage.app",
  messagingSenderId: "945966561006",
  appId: "1:945966561006:web:7cd53243844c4a180665ff"
};
