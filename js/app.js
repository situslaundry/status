import { observeAuth, logoutUser } from "./auth.js";

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Service Worker registration failed: ', err);
    });
  });
}

// Global Auth UI Sync
document.addEventListener('DOMContentLoaded', () => {
  const navProfile = document.getElementById('nav-profile');
  const logoutBtn = document.getElementById('logout-btn');

  observeAuth((user) => {
    if (user) {
      if (navProfile) navProfile.href = `./profile.html?username=${user.uid}`;
      if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
      if (navProfile) navProfile.href = `./login.html`;
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }
});
