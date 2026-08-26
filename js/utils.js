export const APP_CONFIG = {
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_STATUS_LENGTH: 2000,
  MAX_COMMENT_LENGTH: 500,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime']
};

export function showAlert(message, type = 'info', duration = 3500) {
  let banner = document.getElementById('app-alert-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'app-alert-banner';
    banner.className = 'alert-banner';
    document.body.appendChild(banner);
  }
  banner.className = `alert-banner ${type}`;
  banner.textContent = message;
  banner.style.display = 'block';

  setTimeout(() => {
    banner.style.display = 'none';
  }, duration);
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Baru saja';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j yang lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h yang lalu`;
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function buildCanonicalUrl(pathWithQuery) {
  const base = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  return new URL(pathWithQuery, base).href;
}

export function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif') return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
