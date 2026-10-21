// Firebase settings for Dots & Boxes online play and Google-account sync.
//
// Online play needs its own Firebase project (separate from Shogi / Reversi / Chess / Sudoku), e.g. "dots-multiplay":
//   1. https://console.firebase.google.com → Add project → name it "dots-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of dots/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "dots-multiplay.firebaseapp.com",
//          databaseURL: "https://dots-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "dots-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      then bump the ?v= of firebase-config.js in dots/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, online play shows "being prepared" and Google sync is hidden (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCSDfRB3RfN3cgx4zX0H8O89pptMMXhVkk",
  authDomain: "dot-and-box-multiplay.firebaseapp.com",
  databaseURL: "https://dot-and-box-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dot-and-box-multiplay",
  storageBucket: "dot-and-box-multiplay.firebasestorage.app",
  messagingSenderId: "700661753367",
  appId: "1:700661753367:web:554bfc4aa97034e8439e52"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = null;
