// Firebase settings for Hnefatafl online play and Google-account sync.
//
// Online play uses its own Firebase project (separate from the other games): "tafl-multiplay". To set one up:
//   1. https://console.firebase.google.com → Add project → name it "tafl-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of tafl/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "tafl-multiplay.firebaseapp.com",
//          databaseURL: "https://tafl-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "tafl-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      then bump the ?v= of firebase-config.js in tafl/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, online play shows "coming soon" and Google sync is hidden (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCs0hGgwG_T5Oxs98RuT_P73-M8FPT53TA",
  authDomain: "tafl-multiplay.firebaseapp.com",
  databaseURL: "https://tafl-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tafl-multiplay",
  storageBucket: "tafl-multiplay.firebasestorage.app",
  messagingSenderId: "740285273122",
  appId: "1:740285273122:web:909d656a1bf72be923e67b"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
window.FIREBASE_APPCHECK_SITE_KEY = '6LeyTgUuAAAAAGTFvTYECmlm-2erCu6nnvf9Fdwc';   // reCAPTCHA Enterprise (Fraud Defense) site key
