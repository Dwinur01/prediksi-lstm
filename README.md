# 🏢 SWA Predict: Sistem Analitik PT. Swabina Gatra (LSTM)

![Header Image](https://raw.githubusercontent.com/Dwinur01/prediksi-lstm/main/header.png)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

Sistem analitik cerdas berbasis web untuk memprediksi tren bisnis (penjualan/distribusi) di **PT. Swabina Gatra** menggunakan algoritma **Long Short-Term Memory (LSTM)**. Dibangun dengan fokus pada akurasi prediksi, visualisasi data yang interaktif, dan desain antarmuka premium yang adaptif.

---

## 🌟 Fitur Unggulan

### 1. 🧠 Mesin Prediksi LSTM Deep Learning
*   **Multivariate Input**: Analisis mendalam menggunakan 4 fitur input (Actual, MA3, MA4, EMA).
*   **Dynamic Configuration**: Kontrol penuh atas *Epochs*, *Learning Rate*, dan *Window Size*.
*   **Real-time Training**: Visualisasi kurva konvergensi kerugian (*Loss Curve*) saat proses training berlangsung.
*   **Sandbox Mode**: Uji coba prediksi dengan input tanggal kustom untuk skenario "What-If".

### 2. 🌗 Dynamic Theme Engine (Light/Dark Mode)
*   **Seamless Toggling**: Perpindahan tema instan dengan satu klik tanpa membebani performa.
*   **Premium Aesthetics**: Desain modern dengan efek *Glassmorphism*, bayangan dinamis, dan tipografi berkualitas tinggi yang dioptimalkan untuk kedua mode tema.
*   **Responsive UI**: Tampilan yang tetap tajam dan kontras di berbagai perangkat dan kondisi cahaya.

### 3. 📊 Manajemen Data & Resiliensi
*   **Full CRUD & Bulk Operations**: Kelola database tiket dengan fitur pencarian cepat, input manual, dan penghapusan massal.
*   **Batch Import/Export**: Mendukung impor data massal via CSV dan ekspor hasil ke format CSV/Excel.
*   **Offline-First Resilience**: Sistem cerdas yang tetap dapat berfungsi menggunakan data simulasi (Dummy) saat koneksi database terputus.

### 4. 📄 Pelaporan & Dokumentasi Resmi
*   **Official Document Format**: Cetak laporan dalam format surat resmi dengan Kop Surat PT. Swabina Gatra.
*   **Custom Layouting**: Pengaturan margin dokumen secara langsung (WYSIWYG) sebelum proses cetak.
*   **PDF High-Res**: Ekspor dokumen PDF berkualitas tinggi yang siap digunakan untuk kebutuhan audit atau presentasi.

---

## 🛠️ Arsitektur Teknologi

### Frontend (Modern Stack)
*   **Vite + React.js**: Arsitektur pengembangan yang sangat cepat dan ringan.
*   **TensorFlow.js**: Pemrosesan neural network secara lokal di sisi client untuk privasi dan kecepatan.
*   **Recharts**: Visualisasi data statistik dengan grafik interaktif.
*   **Framer Motion**: Animasi antarmuka kelas dunia untuk pengalaman pengguna yang intuitif.

### Backend (Robust API)
*   **PHP 8.x (PDO)**: Integrasi database yang aman dan efisien.
*   **MySQL Relational**: Struktur penyimpanan data yang terstandarisasi untuk integritas data jangka panjang.

---

## 🚀 Panduan Instalasi

### 1. Konfigurasi Database
1.  Aktifkan **MySQL** di XAMPP/WAMP.
2.  Buka `phpMyAdmin` dan buat database `prediksi_lstm`.
3.  Import file `database.sql` yang tersedia di folder root.

### 2. Konfigurasi Backend
1.  Salin seluruh folder project ke direktori web server Anda (misal: `C:\xampp\htdocs\`).
2.  Pastikan konfigurasi kredensial database di `api/config/db.php` sudah sesuai.

### 3. Menjalankan Aplikasi
```bash
# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev
```
Akses aplikasi melalui: `http://localhost:5173`

---

*Dikembangkan untuk memberikan solusi cerdas dalam perencanaan operasional PT. Swabina Gatra. Fokus pada akurasi, performa, dan pengalaman pengguna.*
