// Firebase settings for the shared World Board Game Atlas account (one Google sign-in for every game).
// Separate from each game's online-play project. Setup:
//   1. https://console.firebase.google.com → Add project → e.g. "board-game-atlas" (free Spark plan is enough)
//   2. Authentication → Sign-in method → enable "Google"
//   3. Authentication → Settings → Authorized domains → add core-calmdust.github.io
//   4. Realtime Database → Create database → Rules tab → paste shared/atlas-database.rules.json → Publish
//   5. Project settings → Your apps → Web (</>) → copy firebaseConfig (with databaseURL) and replace null below
// While this is null the portal shows "being prepared" (testing: add ?mock=1 to the URL).
window.ATLAS_FIREBASE_CONFIG = null;
