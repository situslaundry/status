# Social Status Platform (V1)

Platform jejaring sosial publik sederhana dan cepat yang berfokus pada pembaruan status teks, gambar, dan video. Dirancang menggunakan arsitektur *static-first* yang kompatibel dengan **GitHub Pages** serta backend serverless **Google Firebase**.

---

## Panduan Setup Firebase

1. **Buat Firebase Project**:
   - Kunjungi [Firebase Console](https://console.firebase.google.com/).
   - Klik **Add Project**, masukkan nama proyek, dan selesaikan pembuatan.

2. **Aktifkan Authentication**:
   - Buka menu **Build > Authentication**.
   - Klik **Get Started** dan pilih **Email/Password**. Aktifkan opsi pertama (Email/Password) lalu simpan.

3. **Buat Cloud Firestore**:
   - Buka menu **Build > Firestore Database**.
   - Klik **Create Database**, pilih lokasi server terdekat (misal: `asia-southeast2` Jakarta).
   - Buka tab **Rules** dan salin isi file `firestore.rules` ke editor Firebase, lalu klik **Publish**.

4. **Aktifkan Firebase Storage**:
   - Buka menu **Build > Storage**.
   - Klik **Get Started** dan pilih mode standar.
   - Buka tab **Rules** dan salin isi file `storage.rules`, lalu klik **Publish**.

5. **Dapatkan Firebase Config**:
   - Buka **Project Settings** (ikon gerigi di kiri atas).
   - Pada bagian *Your apps*, klik ikon **Web (`</>`)**.
   - Beri nama aplikasi web, lalu salin objek `firebaseConfig`.
   - Buka file `js/firebase-config.js` di project ini dan ganti nilai `placeholder` dengan konfigurasi asli Anda.

---

## Menjalankan Secara Lokal

Karena aplikasi menggunakan JavaScript ES Modules, file tidak boleh dibuka langsung via protokol `file://`. Jalankan local server statis:

```bash
# Menggunakan Python
python3 -m http.server 8080

# Atau menggunakan Node (npx)
npx serve .
