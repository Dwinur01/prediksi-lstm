# ✈️ SkyPredict: Sistem Prediksi Penjualan Tiket Pesawat (LSTM)

Sistem analitik cerdas berbasis web untuk memprediksi tren penjualan tiket pesawat menggunakan algoritma **Long Short-Term Memory (LSTM)**. Dibangun dengan fokus pada akurasi prediksi, visualisasi data yang interaktif, dan kemudahan operasional.

---

## 🌟 Fitur Utama

- **Dashboard Interaktif**: Visualisasi statistik penjualan total, rata-rata, dan tren mingguan menggunakan grafik area yang dinamis.
- **Manajemen Data (CRUD)**: Kelola data historis penjualan tiket dengan fitur input manual, edit, hapus, dan import data dari file CSV.
- **Proses Prediksi LSTM**:
  - Konfigurasi parameter (Epochs, Learning Rate, Window Size).
  - Visualisasi proses pelatihan (*Loss Convergence Curve*) secara real-time.
  - Ekstraksi detail teknis (Weights & Bias) untuk transparansi model.
- **Laporan Resmi**:
  - Generate laporan cetak format A4 dengan Kop Surat resmi perusahaan.
  - Ekspor hasil prediksi ke format **PDF** dan **Excel**.
  - Riwayat prediksi tersimpan secara otomatis di database.
- **Mode Tangguh (Offline Fallback)**: Sistem tetap dapat berjalan menggunakan data simulasi (Dummy Data) jika koneksi database MySQL terputus.

---

## 🛠️ Teknologi yang Digunakan

### Frontend
- **React.js (Vite)**: Framework utama untuk antarmuka yang responsif.
- **Tailwind CSS**: Desain modern dengan tema *Glassmorphism*.
- **TensorFlow.js**: Menjalankan model Machine Learning (LSTM) langsung di browser.
- **Framer Motion**: Animasi transisi yang halus dan premium.
- **Recharts**: Library grafik interaktif untuk visualisasi data.

### Backend & Database
- **PHP 8.x**: API service untuk manajemen data dan autentikasi.
- **MySQL**: Penyimpanan data user, penjualan, dan riwayat prediksi.
- **Axios**: Komunikasi data antara frontend dan backend.

---

## 🚀 Cara Instalasi

### 1. Prasyarat
- **XAMPP** (PHP & MySQL).
- **Node.js** (LTS version).

### 2. Setup Database
1. Buka **phpMyAdmin**.
2. Buat database baru dengan nama `prediksi_lstm`.
3. Import file `database.sql` yang tersedia di folder root project.

### 3. Setup Backend (PHP)
1. Letakkan folder project di dalam direktori `C:\xampp\htdocs\`.
2. Pastikan file `api/config/db.php` sudah sesuai dengan kredensial database Anda.

### 4. Setup Frontend (React)
1. Buka terminal di dalam folder project.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
4. Akses aplikasi melalui browser di `http://localhost:5173`.

---

## 📁 Struktur Folder

```text
prediksi-lstm/
├── api/                # Backend PHP (API & Config)
├── src/
│   ├── components/     # Komponen UI (Layout, Sidebar, dll)
│   ├── pages/          # Halaman Utama (Dashboard, Prediksi, Laporan)
│   ├── services/       # Logika Bisnis (API, LSTM Engine, Dummy Data)
│   └── App.jsx         # Konfigurasi Routing
├── database.sql        # Skema Database MySQL
└── README.md           # Dokumentasi Project
```

---

## 📝 Catatan Penggunaan
- Gunakan **Window Size** yang sesuai dengan pola musiman data Anda (disarankan 4-12 minggu).
- Semakin tinggi **Epochs**, model akan semakin presisi namun membutuhkan waktu pemrosesan lebih lama tergantung spesifikasi perangkat.
- Laporan PDF dirancang untuk ukuran kertas **A4** dengan margin standar dokumen resmi.

---

*Sistem ini dirancang untuk membantu pengambilan keputusan strategis berbasis data.*
