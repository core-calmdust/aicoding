// Firebase settings for Go online play and Google-account sync.
//
// Online play uses its own Firebase project (separate from the other games): "go-multiplay". To set one up again:
//   1. https://console.firebase.google.com → Add project → name it "go-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of go/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = null;
// App Check (reCAPTCHA v3), optional extra protection: once enforced in the console, only this site's pages can use the database.
// Put the reCAPTCHA v3 *site key* here (public by design). null = App Check is skipped and everything works as before.
// Setup: create the key for core-calmdust.github.io, register it in Firebase console → App Check → this web app, publish the page
// with the key, then turn on enforcement for Realtime Database (local testing: ?appcheckdebug=1 on localhost prints a debug token).
window.FIREBASE_APPCHECK_SITE_KEY = null;   // reCAPTCHA Enterprise (Fraud Defense) site key — set after registering go-multiplay in App Check
