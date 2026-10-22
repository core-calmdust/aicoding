// Firebase settings for online play (public web config; access is protected by the Realtime Database rules).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFEo9O7FKK1LiYd8S8GJ0_CQ6sS1R6vtU",
  authDomain: "reversi-multiplay.firebaseapp.com",
  databaseURL: "https://reversi-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "reversi-multiplay",
  storageBucket: "reversi-multiplay.firebasestorage.app",
  messagingSenderId: "451727164771",
  appId: "1:451727164771:web:061d3bd5e59cc6053bff56"
};
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = '6LezePotAAAAAG5HD2nM0trjacgb1B4WEo_dIHjv';   // reCAPTCHA Enterprise (Fraud Defense) site key
