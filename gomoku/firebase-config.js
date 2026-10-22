// Firebase settings for Gomoku & Renju online play.
//
// Online play needs its own Firebase project (separate from the other games), e.g. "gomoku-multiplay":
//   1. https://console.firebase.google.com → Add project → name it "gomoku-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable "Anonymous" and "Google"
//      (Authentication → Settings → Authorized domains: add the domain the site is served from, e.g. <user>.github.io).
//   3. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of gomoku/database.rules.json and Publish.
//   4. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows.
//   5. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "gomoku-multiplay.firebaseapp.com",
//          databaseURL: "https://gomoku-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "gomoku-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      (make sure databaseURL is included), then bump the ?v= of firebase-config.js in gomoku/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, choosing online play shows "online play is being prepared" (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDBuCo6QFmRN1qtbmeIJso8ZPvIXSO9afI",
  authDomain: "renju-multiplay.firebaseapp.com",
  databaseURL: "https://renju-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "renju-multiplay",
  storageBucket: "renju-multiplay.firebasestorage.app",
  messagingSenderId: "59779125876",
  appId: "1:59779125876:web:ba0a94b1e0a783746df721"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = '6LccrPotAAAAAGzEMko388SZaTV9VYwX5EeGaOsg';   // reCAPTCHA Enterprise (Fraud Defense) site key
