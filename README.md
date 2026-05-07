# 🏢 SWA Predict: Sistem Analitik PT. Swabina Gatra (LSTM)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

Sistem analitik cerdas berbasis web untuk memprediksi tren bisnis (penjualan/distribusi) di **PT. Swabina Gatra** menggunakan algoritma **Long Short-Term Memory (LSTM)**. Dibangun dengan fokus pada akurasi prediksi, visualisasi data yang interaktif, dan transparansi model (Explainable AI).

---

## 🌟 Fitur Unggulan

### 1. 🧠 Mesin Prediksi LSTM Deep Learning
*   **Multivariate Input**: Menggunakan 4 fitur input untuk setiap baris data (Actual, MA3, MA4, EMA).
*   **Dynamic Configuration**: Atur *Epochs*, *Learning Rate*, dan *Window Size* secara fleksibel.
*   **Real-time Training**: Lihat kurva konvergensi kerugian (*Loss Curve*) saat model belajar.

### 2. 🔍 Transparansi Model (Explainable AI)
*   **Weight Slicing 2x5**: Visualisasi sampel bobot dari 5 komponen internal LSTM (Input, Forget, Candidate, Output, Bias).
*   **Persistent Weights**: Bobot model setiap sesi latihan disimpan secara permanen di database MySQL.

### 3. 📄 Pelaporan Resmi PT. Swabina Gatra
*   **Official Document Format**: Cetak laporan dalam format surat resmi dengan Kop Surat PT. Swabina Gatra (Gresik).
*   **Custom Print Margins**: Atur margin (Atas, Bawah, Kiri, Kanan) secara kustom sebelum mencetak.
*   **PDF Export**: Dukungan ekspor dokumen PDF berkualitas tinggi yang siap audit.

---

## 🛠️ Arsitektur Teknologi

### Frontend (Modern Stack)
*   **Vite + React.js**: Performa pengembangan yang sangat cepat.
*   **TensorFlow.js**: Pemrosesan neural network di sisi client.
*   **Recharts**: Visualisasi grafik line dan area yang interaktif.
*   **Framer Motion**: Animasi UI premium.

### Backend (Robust API)
*   **PHP 8.x (PDO)**: Keamanan database dengan prepared statements.
*   **MySQL Relational**: Struktur database yang dioptimalkan.

---

## 🚀 Panduan Instalasi

### 1. Konfigurasi Database
1.  Aktifkan **MySQL** di XAMPP/WAMP.
2.  Buka `phpMyAdmin` dan buat database `prediksi_lstm`.
3.  Import file `database.sql` ke database tersebut.

### 2. Konfigurasi Backend
1.  Salin folder project ke direktori web server (misal: `htdocs`).
2.  Cek file `api/config/db.php` untuk memastikan kredensial database sudah benar.

### 3. Jalankan Aplikasi
```bash
npm install
npm run dev
```
Akses di: `http://localhost:5173`

---

*Dikembangkan untuk memberikan solusi cerdas dalam perencanaan operasional PT. Swabina Gatra.*

