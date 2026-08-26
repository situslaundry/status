import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Ganti konfigurasi di bawah ini dengan credential Firebase Project milik Anda.
const firebaseConfig = {
  apiKey: "AIzaSyBWGQDhBunROGQpJfTyh0V5zLzfvfz5PpA",
  authDomain: "statusapp-ba73d.firebaseapp.com",
  projectId: "statusapp-ba73d",
  storageBucket: "statusapp-ba73d.firebasestorage.app",
  messagingSenderId: "453181233876",
  appId: "1:453181233876:web:5ac571185ee490da26b941"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
