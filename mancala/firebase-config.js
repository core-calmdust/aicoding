// Firebase settings for Luxe Mancala online play and Google-account sync.
//
// Online play uses its own Firebase project (separate from the other games), suggested id "mancala-multiplay". To set it up:
//   1. https://console.firebase.google.com → Add project → name it "mancala-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of mancala/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "mancala-multiplay.firebaseapp.com",
//          databaseURL: "https://mancala-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "mancala-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      then bump the ?v= of firebase-config.js in mancala/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, online play shows "coming soon" and Google sync is hidden (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAf1kD6miR4yv36VvZ10ksviC_xz0sw1UU",
  authDomain: "mankara-multiplay.firebaseapp.com",
  databaseURL: "https://mankara-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mankara-multiplay",
  storageBucket: "mankara-multiplay.firebasestorage.app",
  messagingSenderId: "1086933680908",
  appId: "1:1086933680908:web:0a373cce110578522dbf29"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = null;
