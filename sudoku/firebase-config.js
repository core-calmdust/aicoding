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
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = '6LdRh_otAAAAAOsCgjVVmDz5CnEltCo0ZwFovHbP';   // reCAPTCHA Enterprise (Fraud Defense) site key
