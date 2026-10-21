// Firebase settings for Shogi online play (dedicated Firebase project "shogi-multiplay", separate from Reversi).
// Public web config; access is protected by the Realtime Database rules (database.rules.json).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC04osY-pBPWfKiZvTd_RRQcg4m0l9liSw",
  authDomain: "shogi-multiplay.firebaseapp.com",
  databaseURL: "https://shogi-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shogi-multiplay",
  storageBucket: "shogi-multiplay.firebasestorage.app",
  messagingSenderId: "143916450635",
  appId: "1:143916450635:web:c6de3d5128eafefd63dece"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = null;
