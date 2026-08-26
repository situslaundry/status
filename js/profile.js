import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { createPostCard } from "./feed.js";
import { showAlert } from "./utils.js";
import { observeAuth } from "./auth.js";

let profileUid = null;
let currentLoggedInUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  let requestedUser = params.get('username');

  const nameEl = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  const bioEl = document.getElementById('profile-bio');
  const avatarEl = document.getElementById('profile-avatar');
  const postCountEl = document.getElementById('profile-post-count');
  const postsContainer = document.getElementById('profile-posts');
  const editToggleBtn = document.getElementById('edit-profile-toggle-btn');
  const editForm = document.getElementById('edit-profile-form');
  const editNameInput = document.getElementById('edit-display-name');
  const editBioInput = document.getElementById('edit-bio');

  observeAuth(async (user) => {
    currentLoggedInUser = user;

    // Jika tidak ada parameter di URL, arahkan ke profil user yang sedang login
    if (!requestedUser) {
      if (user) {
        requestedUser = user.uid;
      } else {
        window.location.href = './login.html';
        return;
      }
    }

    // Bersihkan karakter @ jika dimasukkan dari URL
    requestedUser = requestedUser.replace(/^@/, '');

    try {
      let userData = null;

      // Cek apakah parameter berupa UID
      const directUserDoc = await getDoc(doc(db, "users", requestedUser));
      if (directUserDoc.exists()) {
        userData = directUserDoc.data();
        profileUid = requestedUser;
      } else {
        // Cari via usernames registry
        const usernameDoc = await getDoc(doc(db, "usernames", requestedUser.toLowerCase()));
        if (usernameDoc.exists()) {
          profileUid = usernameDoc.data().uid;
          const userDoc = await getDoc(doc(db, "users", profileUid));
          if (userDoc.exists()) userData = userDoc.data();
        }
      }

      if (!userData) {
        postsContainer.innerHTML = `<div class="empty-state"><h2>Profil @${requestedUser} Tidak Ditemukan</h2></div>`;
        return;
      }

      // Render Profil
      nameEl.textContent = userData.displayName || "Pengguna";
      handleEl.textContent = `@${userData.username}`;
      bioEl.textContent = userData.bio || "Belum ada bio.";
      if (userData.photoURL) avatarEl.src = userData.photoURL;

      // Izinkan edit jika yang membuka adalah pemilik profil
      if (currentLoggedInUser && currentLoggedInUser.uid === profileUid) {
        editToggleBtn.style.display = 'block';
        editNameInput.value = userData.displayName || '';
        editBioInput.value = userData.bio || '';

        editToggleBtn.addEventListener('click', () => {
          editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
        });

        editForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const newName = editNameInput.value.trim();
          const newBio = editBioInput.value.trim();

          try {
            await updateDoc(doc(db, "users", profileUid), {
              displayName: newName,
              bio: newBio
            });
            nameEl.textContent = newName;
            bioEl.textContent = newBio || "Belum ada bio.";
            editForm.style.display = 'none';
            showAlert("Profil berhasil diperbarui!", "success");
          } catch (err) {
            showAlert("Gagal menyimpan profil.", "error");
          }
        });
      }

      // Muat status atas nama pengguna tersebut
      const postsQuery = query(
        collection(db, "posts"),
        where("uid", "==", profileUid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(postsQuery);
      postCountEl.textContent = snapshot.docs.length;
      postsContainer.innerHTML = '';

      if (snapshot.empty) {
        postsContainer.innerHTML = `<div class="empty-state"><p>Belum ada status yang dipublikasikan.</p></div>`;
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
});
