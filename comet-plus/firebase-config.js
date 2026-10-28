// Firebase settings for COMET OUTBURST+ online rankings (daily / weekly / all-time).
//
// Rankings use their own Firebase project (separate from the other games): "cometob-ranking". To set one up:
//   1. https://console.firebase.google.com → Add project → name it "cometob-ranking" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable "Anonymous" (required: rankings are written per anonymous uid).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of comet-plus/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Put that object below, then bump the ?v= of firebase-config.js in comet-plus/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// With null instead, online rankings are hidden and only the local ranking is used (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAyIdcl0eWQ9xKzpKUaIx9TDmwTpUKEf5U",
  authDomain: "cometob-ranking.firebaseapp.com",
  databaseURL: "https://cometob-ranking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cometob-ranking",
  storageBucket: "cometob-ranking.firebasestorage.app",
  messagingSenderId: "635956286760",
  appId: "1:635956286760:web:50eaee8a2c9565892cec1d"
};
// App Check (reCAPTCHA Enterprise), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the site key here (public by design; 'v3:<key>' = classic reCAPTCHA v3). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = '6Le2TgUuAAAAANFzzewIPwjvsgGHm_qQ4a9Us6df';   // reCAPTCHA Enterprise (Fraud Defense) site key
