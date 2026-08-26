import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { db, storage } from "./firebase-config.js";
import { APP_CONFIG, showAlert, compressImage } from "./utils.js";
import { observeAuth } from "./auth.js";

let selectedFile = null;
let mediaType = 'text';
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

  if (file.size > APP_CONFIG.MAX_IMAGE_SIZE_BYTES) {
    showAlert("Ukuran gambar melebihi batas 10 MB.", "error");
    imageInput.value = '';
    return;
  }

  clearMediaSelection();
  selectedFile = file;
  mediaType = 'image';

  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = '100%';
  img.style.maxHeight = '300px';
  img.style.borderRadius = '8px';
  previewContainer.innerHTML = '';
  previewContainer.appendChild(img);
});

videoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > APP_CONFIG.MAX_VIDEO_SIZE_BYTES) {
    showAlert("Ukuran video melebihi batas 100 MB.", "error");
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
    showAlert("Tulis status atau pilih media terlebih dahulu.", "info");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengunggah...";

  try {
    const postRef = doc(collection(db, "posts"));
    const postId = postRef.id;
    let mediaURL = "";

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    if (selectedFile) {
      progressContainer.style.display = 'block';
      progressBar.style.width = '30%';

      let fileToUpload = selectedFile;
      if (mediaType === 'image') {
        fileToUpload = await compressImage(selectedFile);
      }

      progressBar.style.width = '60%';
      const fileExt = selectedFile.name.split('.').pop();
      const storagePath = `posts/${postId}/${Date.now()}.${fileExt}`;
      const fileRef = ref(storage, storagePath);

      const uploadResult = await uploadBytes(fileRef, fileToUpload);
      progressBar.style.width = '90%';
      mediaURL = await getDownloadURL(uploadResult.ref);
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(postRef, postPayload);
    progressBar.style.width = '100%';
    showAlert("Status berhasil dipublikasikan!", "success");

    setTimeout(() => {
      window.location.href = `./index.html`;
    }, 800);

  } catch (err) {
    console.error("Create status error:", err);
    showAlert("Gagal mempublikasikan: " + (err.message || "Terjadi kesalahan"), "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Publikasikan";
    progressContainer.style.display = 'none';
  }
});
