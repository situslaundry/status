import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { createPostCard } from "./feed.js";
import { showAlert } from "./utils.js";

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const requestedUser = params.get('username');

  if (!requestedUser) {
    showAlert("User tidak ditentukan.", "error");
    return;
  }

  const nameEl = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  const bioEl = document.getElementById('profile-bio');
  const postCountEl = document.getElementById('profile-post-count');
  const postsContainer = document.getElementById('profile-posts');

  try {
    let userData = null;
    let uid = null;

    // Cek apakah parameter berupa UID atau Username
    const userDocDirect = await getDoc(doc(db, "users", requestedUser));
    if (userDocDirect.exists()) {
      userData = userDocDirect.data();
      uid = requestedUser;
    } else {
      const usernameDoc = await getDoc(doc(db, "usernames", requestedUser.toLowerCase()));
      if (usernameDoc.exists()) {
        uid = usernameDoc.data().uid;
        const userDoc = await getDoc(doc(db, "users", uid));
        userData = userDoc.data();
      }
    }

    if (!userData) {
      document.getElementById('profile-header').innerHTML = `
        <div class="empty-state">
          <h2>Profil Tidak Ditemukan</h2>
        </div>
      `;
      return;
    }

    // Tampilkan data profil
    nameEl.textContent = userData.displayName || "Pengguna";
    handleEl.textContent = `@${userData.username}`;
    bioEl.textContent = userData.bio || "Tidak ada bio.";

    // Muat postingan user
    const postsQuery = query(
      collection(db, "posts"),
      where("uid", "==", uid),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(postsQuery);
    postCountEl.textContent = snapshot.docs.length;
    postsContainer.innerHTML = '';

    if (snapshot.empty) {
      postsContainer.innerHTML = `<div class="empty-state"><p>Pengguna ini belum membuat status.</p></div>`;
      return;
    }

    snapshot.forEach((postDoc) => {
      postsContainer.appendChild(createPostCard(postDoc.data()));
    });

  } catch (err) {
    console.error("Profile load error:", err);
    showAlert("Gagal memuat profil pengguna.", "error");
  }
});
