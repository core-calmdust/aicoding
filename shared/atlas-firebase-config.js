// Firebase settings for the shared World Board Game Atlas account (one Google sign-in for every game).
// Separate from each game's online-play project. Setup:
//   1. https://console.firebase.google.com → Add project → e.g. "board-game-atlas" (free Spark plan is enough)
//   2. Authentication → Sign-in method → enable "Google"
//   3. Authentication → Settings → Authorized domains → add core-calmdust.github.io
//   4. Realtime Database → Create database → Rules tab → paste shared/atlas-database.rules.json → Publish
//   5. Project settings → Your apps → Web (</>) → copy firebaseConfig (with databaseURL) and replace null below
// While this is null the portal shows "being prepared" (testing: add ?mock=1 to the URL).
window.ATLAS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFtH4fXEyo7ahjrAGbS8tFfLtrzDvnYcA",
  authDomain: "board-game-atlas-a7055.firebaseapp.com",
  databaseURL: "https://board-game-atlas-a7055-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "board-game-atlas-a7055",
  storageBucket: "board-game-atlas-a7055.firebasestorage.app",
  messagingSenderId: "457113450734",
  appId: "1:457113450734:web:4f6a0b1bece3e942191bff",
};
// App Check (reCAPTCHA v3) for the shared account project — null = skipped (see <game>/firebase-config.js for the steps).
window.ATLAS_APPCHECK_SITE_KEY = '6LeBsfotAAAAAC1lR3R3dE9VbO7qvSBNb4mqo9lZ';   // reCAPTCHA Enterprise (Fraud Defense) site key
