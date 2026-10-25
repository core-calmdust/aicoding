// Firebase settings for だつごく！スライド rankings.
//
// Rankings need their own Firebase project (separate from the board games and the sudoku apps), e.g. "jailbreak-slide":
//   1. https://console.firebase.google.com → Add project → name it "jailbreak-slide" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable "Anonymous".
//   3. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of jailbreak/database.rules.json and Publish.
//   4. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   5. Replace `null` below with that object, then bump the ?v= of firebase-config.js in jailbreak/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, rankings show "coming soon" (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = null;
// App Check (reCAPTCHA v3 / Enterprise), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA *site key* here (public by design). null = App Check is skipped and everything works as before.
window.FIREBASE_APPCHECK_SITE_KEY = null;
