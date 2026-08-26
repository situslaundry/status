import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  runTransaction,
  serverTimestamp,
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { formatTimeAgo, showAlert, APP_CONFIG } from "./utils.js";
import { observeAuth } from "./auth.js";

let currentPostId = null;
let currentUser = null;

export function initComments(postId) {
  currentPostId = postId;
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-text');

  observeAuth((user) => {
    currentUser = user;
    if (!user && commentForm) {
      commentForm.innerHTML = `<p class="empty-state" style="padding: 10px 0;"><a href="./login.html">Login</a> untuk menulis komentar.</p>`;
    }
  });

  loadComments(postId);

  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const text = commentInput.value.trim();
      if (!text) return;
      if (text.length > APP_CONFIG.MAX_COMMENT_LENGTH) {
        showAlert(`Komentar maksimal ${APP_CONFIG.MAX_COMMENT_LENGTH} karakter.`, "error");
        return;
      }

      const submitBtn = commentForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const commentRef = doc(collection(db, "comments"));
        const postRef = doc(db, "posts", currentPostId);

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.data() || {};

        await runTransaction(db, async (transaction) => {
          const postSnap = await transaction.get(postRef);
          if (!postSnap.exists()) throw new Error("Status tidak ditemukan.");

          transaction.set(commentRef, {
            commentId: commentRef.id,
            postId: currentPostId,
            uid: currentUser.uid,
            username: userData.username || currentUser.email.split('@')[0],
            displayName: userData.displayName || "Pengguna",
            text: text,
            createdAt: serverTimestamp()
          });

          const currentCount = postSnap.data().commentCount || 0;
          transaction.update(postRef, { commentCount: currentCount + 1 });
        });

        commentInput.value = '';
        showAlert("Komentar ditambahkan!", "success");
        loadComments(currentPostId);

      } catch (err) {
        console.error("Comment submit error:", err);
        showAlert("Gagal mengirim komentar.", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}

async function loadComments(postId) {
  const container = document.getElementById('comments-list');
  if (!container) return;

  try {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      orderBy("createdAt", "asc")
    );

    const snapshot = await getDocs(q);
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">Belum ada komentar.</p>`;
      return;
    }

    snapshot.forEach((snap) => {
      const comment = snap.data();
      const div = document.createElement('div');
      div.style.padding = '8px 0';
      div.style.borderBottom = '1px solid var(--border)';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.fontSize = '0.8rem';
      header.style.marginBottom = '2px';

      const userLink = document.createElement('a');
      userLink.href = `./profile.html?username=${encodeURIComponent(comment.username)}`;
      userLink.style.fontWeight = '600';
      userLink.style.textDecoration = 'none';
      userLink.style.color = 'var(--text-main)';
      userLink.textContent = comment.displayName || `@${comment.username}`;

      const timeSpan = document.createElement('span');
      timeSpan.style.color = 'var(--text-muted)';
      timeSpan.textContent = formatTimeAgo(comment.createdAt);

      header.appendChild(userLink);
      header.appendChild(timeSpan);

      const textP = document.createElement('p');
      textP.style.fontSize = '0.9rem';
      textP.style.wordBreak = 'break-word';
      textP.textContent = comment.text; // Aman dari XSS

      div.appendChild(header);
      div.appendChild(textP);
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Load comments error:", err);
  }
}
