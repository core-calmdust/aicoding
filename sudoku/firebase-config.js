// Firebase settings for まいにち数独 rankings.
//
// Rankings need their own Firebase project (separate from Shogi / Reversi / Chess), e.g. "sudoku-ranking":
//   1. https://console.firebase.google.com → Add project → name it "sudoku-ranking" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable "Anonymous".
//   3. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of sudoku/database.rules.json and Publish.
//   4. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   5. Replace `null` below with that object, then bump the ?v= of firebase-config.js in sudoku/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, rankings show "being prepared" (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDn3zldPKZnPuOx4cb8oAWA6-JuCW6PggI",
  authDomain: "everyday-sudoku-58be0.firebaseapp.com",
  databaseURL: "https://everyday-sudoku-58be0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "everyday-sudoku-58be0",
  storageBucket: "everyday-sudoku-58be0.firebasestorage.app",
  messagingSenderId: "1036699270036",
  appId: "1:1036699270036:web:cfda63b0c5dc6bb7eaed81"
};
