// Firebase settings for Backgammon online play and Google-account sync.
//
// Online play uses its own Firebase project (separate from the other games): "backgammon-multi". To set one up again:
//   1. https://console.firebase.google.com → Add project (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of backgammon/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Put that object below (window.FIREBASE_CONFIG = { … }), then bump the ?v= of firebase-config.js in backgammon/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, online play shows "coming soon" and Google sync is hidden (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDLQ4A4R-pkd_f8qE6MfKNukaaHt14biAQ",
  authDomain: "backgammon-multi.firebaseapp.com",
  databaseURL: "https://backgammon-multi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "backgammon-multi",
  storageBucket: "backgammon-multi.firebasestorage.app",
  messagingSenderId: "652033341767",
  appId: "1:652033341767:web:cabbb6ad4f00a86a57b462"
};
