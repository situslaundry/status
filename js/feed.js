import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { formatTimeAgo, showAlert, buildCanonicalUrl } from "./utils.js";
import { observeAuth } from "./auth.js";

let lastVisibleDoc = null;
let isLoading = false;
let hasMore = true;
let currentUser = null;

const feedContainer = document.getElementById('feed-container');
const loadMoreBtn = document.getElementById('load-more-btn');

observeAuth((user) => {
  currentUser = user;
});

export async function fetchFeed(isInitial = false) {
  if (isLoading || (!hasMore && !isInitial)) return;
  isLoading = true;

  if (isInitial) {
    feedContainer.innerHTML = `
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
    `;
    lastVisibleDoc = null;
    hasMore = true;
  }

  try {
    let postsQuery;
    if (lastVisibleDoc) {
      postsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(10)
      );
    } else {
      postsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(10)
      );
    }

    const snapshot = await getDocs(postsQuery);

    if (isInitial) {
      feedContainer.innerHTML = '';
    }

    if (snapshot.empty) {
      hasMore = false;
      if (isInitial) {
        feedContainer.innerHTML = `
          <div class="empty-state">
            <p>Belum ada status.</p>
            <p style="margin-top: 8px;">Jadilah yang pertama membuat status!</p>
          </div>
        `;
      }
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

    for (const postDoc of snapshot.docs) {
      const post = postDoc.data();
      const card = createPostCard(post);
      feedContainer.appendChild(card);
    }

    if (snapshot.docs.length < 10) {
      hasMore = false;
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    }

  } catch (err) {
    console.error("Feed error: ", err);
    showAlert("Gagal memuat feed status.", "error");
  } finally {
    isLoading = false;
  }
}

export function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `post-${post.postId}`;

  const header = document.createElement('div');
  header.className = 'card-header';

  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.src = post.photoURL || './assets/default-avatar.svg';
  avatar.alt = post.displayName || post.username;

  const userMeta = document.createElement('div');
  userMeta.className = 'user-meta';

  const userName = document.createElement('a');
  userName.className = 'user-name';
  userName.href = `./profile.html?username=${encodeURIComponent(post.username)}`;
  userName.textContent = post.displayName || `@${post.username}`;

  const postTime = document.createElement('a');
  postTime.className = 'post-time';
  postTime.href = `./status.html?id=${encodeURIComponent(post.postId)}`;
  postTime.textContent = formatTimeAgo(post.createdAt);

  userMeta.appendChild(userName);
  userMeta.appendChild(postTime);
  header.appendChild(avatar);
  header.appendChild(userMeta);
  card.appendChild(header);

  if (post.text) {
    const textP = document.createElement('p');
    textP.className = 'post-text';
    textP.textContent = post.text; // Aman dari XSS
    card.appendChild(textP);
  }

  if (post.mediaURL) {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'post-media';

    if (post.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = post.mediaURL;
      img.alt = 'Status media';
      img.loading = 'lazy';
      mediaContainer.appendChild(img);
    } else if (post.mediaType === 'video') {
      const video = document.createElement('video');
      video.src = post.mediaURL;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (post.thumbnailURL) video.poster = post.thumbnailURL;
      mediaContainer.appendChild(video);
    }
    card.appendChild(mediaContainer);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const likeBtn = document.createElement('button');
  likeBtn.className = 'action-btn';
  likeBtn.innerHTML = `<span>❤️</span> <span class="count">${post.likeCount || 0}</span> Suka`;
  likeBtn.addEventListener('click', () => handleLike(post.postId, likeBtn));

  const commentBtn = document.createElement('a');
  commentBtn.className = 'action-btn';
  commentBtn.href = `./status.html?id=${encodeURIComponent(post.postId)}`;
  commentBtn.innerHTML = `<span>💬</span> <span class="count">${post.commentCount || 0}</span> Komentar`;

  const shareBtn = document.createElement('button');
  shareBtn.className = 'action-btn';
  shareBtn.innerHTML = `<span>🔗</span> Bagikan`;
  shareBtn.addEventListener('click', () => handleShare(post.postId, post.text));

  actions.appendChild(likeBtn);
  actions.appendChild(commentBtn);
  actions.appendChild(shareBtn);
  card.appendChild(actions);

  return card;
}

async function handleLike(postId, buttonEl) {
  if (!currentUser) {
    showAlert("Silakan login untuk menyukai status ini.", "info");
    return;
  }

  const likeRef = doc(db, "likes", `${postId}_${currentUser.uid}`);
  const postRef = doc(db, "posts", postId);

  try {
    await runTransaction(db, async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) throw new Error("Status tidak ditemukan.");

      const currentLikes = postDoc.data().likeCount || 0;

      if (likeDoc.exists()) {
        transaction.delete(likeRef);
        transaction.update(postRef, { likeCount: Math.max(0, currentLikes - 1) });
        buttonEl.classList.remove('liked');
        buttonEl.querySelector('.count').textContent = Math.max(0, currentLikes - 1);
      } else {
        transaction.set(likeRef, {
          postId: postId,
          uid: currentUser.uid,
          createdAt: serverTimestamp()
        });
        transaction.update(postRef, { likeCount: currentLikes + 1 });
        buttonEl.classList.add('liked');
        buttonEl.querySelector('.count').textContent = currentLikes + 1;
      }
    });
  } catch (err) {
    console.error("Like error: ", err);
    showAlert("Gagal memproses aksi like.", "error");
  }
}

async function handleShare(postId, text) {
  const url = buildCanonicalUrl(`status.html?id=${encodeURIComponent(postId)}`);
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Status Baru',
        text: text ? text.substring(0, 80) : 'Lihat status ini di Social Status Platform',
        url: url
      });
    } catch (e) {
      if (e.name !== 'AbortError') copyToClipboard(url);
    }
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showAlert("Link status berhasil disalin!", "success");
  }).catch(() => {
    showAlert("Gagal menyalin link.", "error");
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (feedContainer) {
    fetchFeed(true);
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => fetchFeed(false));
    }
  }
});
