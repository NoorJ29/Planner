// Firebase web app settings (loaded from .env by build.py or configured below)
window.PLANNER_FIREBASE_CONFIG = window.PLANNER_FIREBASE_CONFIG || {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_AUTH_DOMAIN_HERE",
  projectId: "PASTE_PROJECT_ID_HERE",
  storageBucket: "PASTE_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_APP_ID_HERE"
};

// Optional: Google Calendar Client ID
window.PLANNER_GOOGLE_CLIENT_ID = window.PLANNER_GOOGLE_CLIENT_ID || "";
