# Panduan Instalasi, Setup XAMPP, dan Eksekusi SWA Predict (LSTM 7-Input)

Dokumen ini merupakan panduan resmi instalasi, setup basis data, konfigurasi lingkungan, dan pengujian untuk sistem **SWA Predict** — aplikasi prediksi penjualan tiket mingguan berbasis jaringan syaraf tiruan **Long Short-Term Memory (LSTM)** murni dengan 7 fitur input.

---

## 1. Arsitektur Model LSTM (7 Input)

Sistem menggunakan model LSTM dengan 7 fitur input mingguan:

| No | Fitur | Simbol | Keterangan |
|---|---|---|---|
| 1 | Lag 1 Tiket Terjual | $y(t-1)$ | Jumlah penjualan tiket 1 minggu sebelumnya |
| 2 | Lag 2 Tiket Terjual | $y(t-2)$ | Jumlah penjualan tiket 2 minggu sebelumnya |
| 3 | Lag 3 Tiket Terjual | $y(t-3)$ | Jumlah penjualan tiket 3 minggu sebelumnya |
| 4 | Lag 4 Tiket Terjual | $y(t-4)$ | Jumlah penjualan tiket 4 minggu sebelumnya |
| 5 | Harga Tiket | $p(t)$ | Harga tiket mentah pada minggu berjalan $t$ |
| 6 | Perubahan Harga | $\Delta p(t)$ | Selisih harga $p(t) - p(t-1)$ |
| 7 | Indikator Libur | $\text{libur}(t)$ | Bernilai `1` jika memuat hari libur nasional/cuti bersama atau $\ge 4$ hari libur sekolah; `0` lainnya |

- **Normalisasi**: Min-Max Scaling dinamis berdasarkan rentang data latih.
- **Ukuran Jendela (*Window Size*)**: $1$ (karena memori temporal historis 4 minggu telah diwakili langsung oleh fitur lag $y(t-1) \dots y(t-4)$).
- **Struktur Sel**: Sel LSTM murni (Forget Gate $f_t$, Input Gate $i_t$, Candidate $\tilde{C}_t$, Output Gate $o_t$, State Sel $C_t$, dan Hidden State $h_t$).

---

## 2. Struktur Basis Data (MariaDB / MySQL)

1. **`users`**: Data pengguna, hak akses (`admin` atau `staf`), kata sandi di-hash dengan `password_hash()` BCRYPT.
2. **`ticket_sales`**: Data penjualan mingguan berbasis `week_start_date` unik, jumlah tiket, harga, dan indikator libur.
3. **`prediction_history`**: Jejak lengkap riwayat pelatihan & inferensi, metrik uji (MSE, RMSE, MAPE, MAE), metrik latih, baseline (naif, mean), snapshot data deret berkala, konfigurasi split, dan penanda model aktif (`is_active = 1`).
4. **`lstm_weights`**: Matriks bobot dan bias sel LSTM ($W_f, W_i, W_c, W_o, b_f, b_i, b_c, b_o$) yang terhubung ke riwayat prediksi (`ON DELETE CASCADE`).
5. **`training_jobs`**: Antrean dan koordinasi pelatihan ulang otomatis dengan klaim atomik (`running_key = 1`), detak *heartbeat* (interval 5 detik), dan pemulihan otomatis jika detak terhenti $>60$ detik.
6. **`holidays`**: Kalender hari libur nasional dan cuti bersama.
7. **`school_holidays`**: Kalender rentang libur sekolah.
8. **`login_attempts`**: Pencatatan percobaan login gagal untuk mitigasi *brute-force* (maksimal 5 kali percobaan gagal per 15 menit $\rightarrow$ HTTP 429).
9. **`schema_migrations`**: Pelacak versi migrasi SQL yang telah diterapkan.

---

## 3. Prasyarat Sistem

- **XAMPP** dengan PHP $\ge 8.1$ dan MariaDB $\ge 10.4$.
- **Node.js** $\ge 18$ dan **npm** $\ge 9$.
- Ekstensi PHP aktif di `php.ini`:
  - `pdo_mysql`
  - `pdo_sqlite` (opsional untuk mode fallback)
  - `curl`
  - `openssl`
  - `mbstring`

---

## 4. Langkah Instalasi & Konfigurasi

### Langkah 1: Klon dan Tempatkan Proyek
Tempatkan folder repositori di direktori web server XAMPP:
```
C:\xampp\htdocs\prediksi-lstm
```

### Langkah 2: Buat Basis Data di MariaDB
Buka terminal / phpMyAdmin (`http://localhost/phpmyadmin`), lalu buat basis data:
```sql
CREATE DATABASE prediksi_lstm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Langkah 3: Konfigurasi Berkas Lingkungan (`.env`)

1. **Backend (`api/.env`)**:
   Salin dari `api/.env.example` ke `api/.env`:
   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=prediksi_lstm
   DB_USER=root
   DB_PASS=
   JWT_SECRET=rahasia_kunci_jwt_super_aman_minimal_32_karakter_12345
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   DB_FALLBACK=0
   ```

2. **Frontend (`.env`)**:
   Salin dari `.env.example` ke `.env`:
   ```ini
   VITE_API_URL=http://localhost/prediksi-lstm/api
   ```

### Langkah 4: Jalankan Migrasi Basis Data
Jalankan runner migrasi otomatis dari terminal:
```bash
php api/migrations/migrate.php
```
*Runner akan menerapkan seluruh berkas migrasi `001` hingga `005` secara berurutan dan idempoten.*

### Langkah 5: Buat Akun Administrator Awal
Jalankan skrip CLI khusus pembuat admin (tidak ada akun default hardcoded):
```bash
php api/setup/create_admin.php admin passwordAdmin123 "Administrator Sistem"
```

### Langkah 6: Jalankan Frontend
Buka terminal di root proyek:
```bash
npm install
npm run dev
```
Aplikasi frontend akan aktif di `http://localhost:5173`. Masuk menggunakan akun admin yang telah dibuat pada Langkah 5.

---

## 5. Menjalankan Suite Pengujian Otomatis

### A. Pengujian Unit Frontend & Model LSTM (Vitest)
Menguji praproses data 7-input, golden test sel LSTM, evaluasi metrik (MSE, RMSE, MAPE, MAE), dan algoritma peramalan rekursif:
```bash
npm test
```
*Seluruh 20 tes unit harus lulus (100% pass).*

### B. Pengujian API Backend Otomatis Komprehensif
Menguji seluruh endpoint autentikasi, keamanan (CORS/nosniff), rate limiting, tickets, holidays derive, training jobs klaim atomik, serta jejak riwayat prediksi:
```bash
php tests/test_api_runner.php
```
*Seluruh 31 pengujian API terverifikasi lulus secara otomatis.*

### C. Build Produksi Frontend
Untuk memverifikasi kompilasi aset frontend untuk lingkungan produksi:
```bash
npm run build
```

---

## 6. Pemecahan Masalah (Troubleshooting)

1. **Error HTTP 429 (Terlalu Banyak Percobaan Login)**:
   Jika akun terkunci karena percobaan login gagal $>5$ kali dalam 15 menit, reset dengan perintah:
   ```sql
   DELETE FROM login_attempts WHERE username = 'admin';
   ```

2. **CORS Ditolak (*Cross-Origin Request Blocked*)**:
   Pastikan port frontend (misal `http://localhost:5173`) telah terdaftar pada variabel `ALLOWED_ORIGINS` di berkas `api/.env`.

3. **Job Pelatihan Menggantung (*Stale Job*)**:
   Tabel `training_jobs` dilengkapi mekanisme *heartbeat* otomatis. Jika sebuah tab ditutup secara paksa saat melatih, job akan otomatis pulih (*timeout*) setelah 60 detik tanpa detak. Admin juga dapat membatalkan job melalui tombol batal di antarmuka atau `DELETE /data/training-jobs.php?id={id}`.
