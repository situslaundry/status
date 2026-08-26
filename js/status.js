import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { showAlert, buildCanonicalUrl } from "./utils.js";
import { createPostCard } from "./feed.js";
import { initComments } from "./comments.js";

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  const container = document.getElementById('status-detail-container');

  if (!postId) {
    showNotFound(container);
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      showNotFound(container);
      return;
    }

    const post = postSnap.data();
    container.innerHTML = '';
    const postCard = createPostCard(post);
    container.appendChild(postCard);

    // Update SEO Meta Tags Dinamis di Browser
    updateClientMetadata(post);

    // Muat Komentar
    initComments(postId);

  } catch (err) {
    console.error("Error loading status:", err);
    showAlert("Gagal memuat status.", "error");
  }
});

function showNotFound(container) {
  container.innerHTML = `
    <div class="empty-state">
      <h2>404 / Status Tidak Ditemukan</h2>
      <p style="margin-top: 8px;">Status yang Anda cari mungkin sudah dihapus atau tidak tersedia.</p>
      <a href="./index.html" class="btn" style="margin-top: 16px; max-width: 200px;">Kembali ke Beranda</a>
    </div>
  `;
}

function updateClientMetadata(post) {
  // TODO: Dynamic SSR/Open Graph rendering can be added when migrating from GitHub Pages to Firebase Hosting/App Hosting/SSR.
  const title = `${post.displayName || post.username}: "${post.text ? post.text.substring(0, 40) : 'Media status'}..."`;
  const description = post.text ? post.text.substring(0, 160) : "Lihat status di Social Status Platform.";
  const canonicalUrl = buildCanonicalUrl(`status.html?id=${post.postId}`);

  document.title = title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && post.mediaURL && post.mediaType === 'image') {
    ogImage.setAttribute('content', post.mediaURL);
  }

  // Structured Data (Schema.org)
  const scriptTag = document.createElement('script');
  scriptTag.type = 'application/ld+json';
  scriptTag.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": title,
    "articleBody": post.text || "",
    "datePublished": post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": post.displayName || post.username,
      "url": buildCanonicalUrl(`profile.html?username=${post.username}`)
    },
    "image": post.mediaURL || "",
    "url": canonicalUrl
  });
  document.head.appendChild(scriptTag);
}
