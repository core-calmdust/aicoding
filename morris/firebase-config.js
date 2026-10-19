// Firebase settings for Nine Men's Morris online play and Google-account sync.
//
// Online play uses its own Firebase project (separate from the other games): "ninemens-multiplay". To set one up again:
//   1. https://console.firebase.google.com → Add project → name it "morris-multiplay" (Google Analytics not needed; the free Spark plan is enough).
//   2. Build → Authentication → Get started → Sign-in method → enable BOTH "Anonymous" and "Google"
//      (Google: choose a project support e-mail and Save).
//   3. Authentication → Settings → Authorized domains → Add domain → core-calmdust.github.io
//      (localhost is already listed, which is enough for local testing).
//   4. Build → Realtime Database → Create database (any location) → start in locked mode,
//      then open the "Rules" tab, paste the contents of morris/database.rules.json and Publish.
//   5. Project settings (gear) → General → Your apps → Web (</>) → register an app (no Hosting needed)
//      and copy the firebaseConfig object it shows (make sure databaseURL is included).
//   6. Replace `null` below with that object, e.g.
//        window.FIREBASE_CONFIG = {
//          apiKey: "…", authDomain: "morris-multiplay.firebaseapp.com",
//          databaseURL: "https://morris-multiplay-default-rtdb.<region>.firebasedatabase.app",
//          projectId: "morris-multiplay", storageBucket: "…", messagingSenderId: "…", appId: "…"
//        };
//      then bump the ?v= of firebase-config.js in morris/index.html.
// The web config is public by design; access is protected by the Realtime Database rules.
// While this is null, online play shows "coming soon" and Google sync is hidden (testing: add ?mock=1 to the URL).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB3kP320_LBn1qPbeAxIB3EzHG88aDmXRU",
  authDomain: "ninemens-multiplay.firebaseapp.com",
  databaseURL: "https://ninemens-multiplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ninemens-multiplay",
  storageBucket: "ninemens-multiplay.firebasestorage.app",
  messagingSenderId: "710955569268",
  appId: "1:710955569268:web:ac9f8f2ce0637c31ebc121"
};
