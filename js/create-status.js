import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { db, storage, auth } from "./firebase-config.js";
import { APP_CONFIG, showAlert, compressImage } from "./utils.js";
import { observeAuth } from "./auth.js";

let selectedFile = null;
let mediaType = 'text'; // 'text', 'image', 'video'
let currentUser = null;

const form = document.getElementById('create-status-form');
const statusTextInput = document.getElementById('status-text');
const imageInput = document.getElementById('image-input');
const videoInput = document.getElementById('video-input');
const previewContainer = document.getElementById('media-preview-container');
const submitBtn = document.getElementById('submit-btn');
const progressContainer = document.getElementById('upload-progress-container');
const progressBar = document.getElementById('upload-progress-bar');

observeAuth((user) => {
  if (!user) {
    window.location.href = `./login.html?redirect=${encodeURIComponent(window.location.href)}`;
  } else {
    currentUser = user;
  }
});

// Reset input media
function clearMediaSelection() {
  selectedFile = null;
  mediaType = 'text';
  previewContainer.innerHTML = '';
  imageInput.value = '';
  videoInput.value = '';
}

imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    showAlert("Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.", "error");
    imageInput.value = '';
    return;
  }

  if (file.size > APP_CONFIG.MAX_IMAGE_SIZE_BYTES) {
    showAlert("Ukuran gambar melebihi batas maksimal 10 MB.", "error");
    imageInput.value = '';
    return;
  }

  clearMediaSelection();
  selectedFile = file;
  mediaType = 'image';

  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = '100%';
  img.style.borderRadius = '8px';
  previewContainer.innerHTML = '';
  previewContainer.appendChild(img);
});

videoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!APP_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type)) {
    showAlert("Format video tidak didukung. Gunakan MP4 atau WebM.", "error");
    videoInput.value = '';
    return;
  }

  if (file.size > APP_CONFIG.MAX_VIDEO_SIZE_BYTES) {
    showAlert("Ukuran video melebihi batas maksimal 100 MB.", "error");
    videoInput.value = '';
    return;
  }

  clearMediaSelection();
  selectedFile = file;
  mediaType = 'video';

  const video = document.createElement('video');
  video.src = URL.createObjectURL(file);
  video.controls = true;
  video.style.maxWidth = '100%';
  video.style.borderRadius = '8px';
  previewContainer.innerHTML = '';
  previewContainer.appendChild(video);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const text = statusTextInput.value.trim();
  if (!text && !selectedFile) {
    showAlert("Status tidak boleh kosong.", "info");
    return;
  }

  if (text.length > APP_CONFIG.MAX_STATUS_LENGTH) {
    showAlert(`Status maksimal ${APP_CONFIG.MAX_STATUS_LENGTH} karakter.`, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mempublikasikan...";

  try {
    const postRef = doc(collection(db, "posts"));
    const postId = postRef.id;
    let mediaURL = "";

    // Dapatkan data profil user
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.data() || {};

    if (selectedFile) {
      let fileToUpload = selectedFile;
      if (mediaType === 'image') {
        fileToUpload = await compressImage(selectedFile);
      }

      const storagePath = `posts/${postId}/${mediaType === 'image' ? 'images' : 'videos'}/${Date.now()}_${fileToUpload.name}`;
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);

      progressContainer.style.display = 'block';

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
          },
          (error) => reject(error),
          async () => {
            mediaURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    }

    const postPayload = {
      postId: postId,
      uid: currentUser.uid,
      username: userData.username || currentUser.email.split('@')[0],
      displayName: userData.displayName || currentUser.displayName || "Pengguna",
      photoURL: userData.photoURL || "",
      text: text,
      mediaType: mediaType,
      mediaURL: mediaURL,
      thumbnailURL: "",
      visibility: "public",
      likeCount: 0,
      commentCount: 0,
      script: "latin", // Dapat dikembangkan ke "shawibet", "javanese", dll.
      language: "id",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(postRef, postPayload);
    showAlert("Status berhasil dipublikasikan!", "success");
    setTimeout(() => {
      window.location.href = `./status.html?id=${postId}`;
    }, 1000);

  } catch (err) {
    console.error("Create status error: ", err);
    showAlert("Gagal membuat status. Coba lagi.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Publikasikan";
    progressContainer.style.display = 'none';
  }
});
