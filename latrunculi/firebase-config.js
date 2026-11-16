// Ludus latrunculorum: online play is not open yet. While FIREBASE_CONFIG is null the online dock shows 準備中 (online-ui.js, html.ol-soon).
// It will live in the Tafl project (tafl-multiplay, shared by several games — project consolidation 2026-11-16): set
// window.FIREBASE_ROOT = 'latrunculi/' and the config of tafl/firebase-config.js (as agon/firebase-config.js, without the _PREV block), add
// host=('tafl', 'latrunculi') to its entry in shared/tools/secrules.py and publish the regenerated tafl/database.rules.json.
window.FIREBASE_CONFIG = null;
window.FIREBASE_APPCHECK_SITE_KEY = null;
