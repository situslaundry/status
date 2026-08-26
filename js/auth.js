import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { showAlert } from "./utils.js";

export function validateUsername(username) {
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username);
}

export async function registerUser(email, password, username, displayName) {
  if (!validateUsername(username)) {
    throw new Error("Username harus 3-30 karakter, hanya huruf, angka, dan underscore.");
  }

  // Verifikasi keunikan username
  const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
  if (usernameDoc.exists()) {
    throw new Error("Username sudah digunakan. Silakan pilih username lain.");
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  const userData = {
    uid: user.uid,
    username: username.toLowerCase(),
    displayName: displayName,
    email: email,
    photoURL: "",
    bio: "",
    createdAt: serverTimestamp()
  };

  // Simpan data user dan lock username
  await setDoc(doc(db, "users", user.uid), userData);
  await setDoc(doc(db, "usernames", username.toLowerCase()), { uid: user.uid });

  return user;
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return await signOut(auth);
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function requireAuth() {
  observeAuth((user) => {
    if (!user) {
      window.location.href = `./login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
  });
}
