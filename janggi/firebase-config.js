// Firebase settings for Janggi online play and Google-account sync.
// Janggi uses Xiangqi's Firebase project ("xiangqi-multiplay"), in its own subtree: every path is under janggi/
// (online.js prefixes FIREBASE_ROOT), so rooms, players, ratings, chat and sync never mix with Xiangqi's.
// Database rules: janggi/database.rules.json is Xiangqi's rules plus the same rules under "janggi" — publish that file
// (Realtime Database → Rules) in the xiangqi-multiplay project; it keeps Xiangqi's own rules unchanged.
// The web config is public by design; access is protected by the Realtime Database rules.
window.FIREBASE_ROOT = 'janggi/';
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXFTHWt8oLlHjoh2qeI2gaWTgfMxr1lyE",
  authDomain: "xiangqi-multiplay.firebaseapp.com",
  databaseURL: "https://xiangqi-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xiangqi-multiplay",
  storageBucket: "xiangqi-multiplay.firebasestorage.app",
  messagingSenderId: "426921312982",
  appId: "1:426921312982:web:5ab1cb66200367c275ff77"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
window.FIREBASE_APPCHECK_SITE_KEY = '6Lc2SwUuAAAAAJcH1WXv0mjiipTWGlsi66d8CILU';   // reCAPTCHA Enterprise (Fraud Defense) site key
