# Rencana Pengujian & UAT — SWA Predict

## 1. Strategi

| Level | Alat | Cakupan | Waktu |
|---|---|---|---|
| Unit (JS) | Vitest | `preprocessing`, `lstmCell`, `metrics`, `forecast`, golden test | Setiap tugas model |
| API | Skrip `curl`/Postman (`tests/api/*.http`), PHPUnit opsional | Autentikasi, validasi, otorisasi | Setiap tugas backend |
| Integrasi manual | Browser (Chrome/Edge) | Alur data → prediksi → laporan | Akhir tiap rilis |
| Keamanan | Daftar periksa + `curl` | TC-SEC | Sebelum R0 selesai |
| UAT | Staf/penguji | Skenario UAT-01…08 | Akhir R2 dan R3 |

**Lingkungan:** XAMPP (PHP ≥ 8.0, MySQL), Node ≥ 20, dataset fixture `assets/dataset_67_minggu.json` (hash di `assets/reference_data_hash.txt`). Database uji terpisah (`prediksi_lstm_test`).
**Perintah:** `npm run lint && npm run build && npm test`.

## 2. Kasus uji

### 2.1 Autentikasi & profil
| ID | Langkah | Hasil yang diharapkan | FR |
|---|---|---|---|
| TC-AUTH-01 | Login kredensial benar | 200 + token JWT + `role` | FR-AUTH-01/02 |
| TC-AUTH-02 | Login password salah **dan** username tak ada | Dua-duanya 401 dengan pesan **identik** | FR-AUTH-03 |
| TC-AUTH-03 | `GET /data/tickets` tanpa token | 401 | FR-AUTH-02 |
| TC-AUTH-04 | Token dimodifikasi 1 karakter / kedaluwarsa | 401 | FR-AUTH-02 |
| TC-AUTH-05 | `PUT /user/profile` dengan `id` orang lain di body | `id` diabaikan; hanya akun pemilik token berubah | FR-PRF-01 |
| TC-AUTH-06 | Staf memanggil `register` / `DELETE ?all=true` | 403 | FR-AUTH-04 |
| TC-AUTH-07 | 6 login gagal beruntun | Percobaan ke-6 → 429 | FR-AUTH-03 |
| TC-AUTH-08 | Logout lalu buka `/dashboard` | Diarahkan ke `/login` | FR-AUTH-06 |

### 2.2 Data
| ID | Langkah | Hasil | FR |
|---|---|---|---|
| TC-DATA-01 | Tambah data valid | Muncul di daftar; `week`/`year` terisi dari tanggal | FR-DATA-02 |
| TC-DATA-02 | Tambah `tickets_sold=-1`, harga 0, tanggal duplikat | 422 dengan galat per kolom | FR-DATA-03 |
| TC-DATA-03 | Impor `dataset_67_minggu` (CSV 4 kolom) | 67 baris masuk; ulang impor tidak menggandakan | FR-DATA-04 |
| TC-DATA-04 | Impor CSV dengan 1 baris rusak | Pratinjau menandai baris; tidak ada data masuk sebagian | FR-DATA-04 |
| TC-DATA-05 | Matikan MySQL saat impor | Galat aman (tanpa *stack trace*), data tidak setengah-masuk | NFR-REL-01 |
| TC-DATA-06 | Unduh template CSV → impor kembali | Berhasil tanpa ubah | FR-DATA-07 |
| TC-DATA-07 | Putuskan API lalu buka Data/LSTM | Pesan galat jelas; **tidak** ada data dummy | FR-DATA-08 |
| TC-DATA-08 | Admin "Reset semua" tanpa mengetik konfirmasi | Tidak terjadi | FR-DATA-06 |

### 2.3 Model
| ID | Langkah | Hasil | FR |
|---|---|---|---|
| TC-LSTM-01 | Replikasi pada dataset 67 minggu | 64 ŷ_qty cocok golden (≤ 5×10⁻⁴) | FR-LSTM-02 |
| TC-LSTM-02 | Bandingkan f, i, g, c, o, h baris Minggu 4 & 5 dengan `06 §9` | Cocok (≤ 5×10⁻⁴) | FR-LSTM-02 |
| TC-LSTM-03 | Mode Latih: cek arsitektur | 1 lapis LSTM, 4 unit, tanpa Bidirectional/Dropout | FR-LSTM-03 |
| TC-LSTM-04 | Cek pembagian | Kronologis; tidak ada sampel uji dalam latih/validasi; sampel pertama Minggu 5 | FR-LSTM-04 |
| TC-LSTM-05 | Min/max normalisasi | Dari data latih; tampil di UI | FR-LSTM-05 |
| TC-LSTM-06 | Latih 2× dengan seed sama | Metrik identik (≤ 10⁻⁶) | NFR-REP-01 |
| TC-LSTM-07 | Metrik pada vektor kecil (y=[2,0,4], ŷ=[1,1,5]) | MAE=1; MAPE hanya dari y≠0 (=37,5%) | FR-LSTM-07 |
| TC-LSTM-08 | Hasil menampilkan latih & uji + baseline naif & rata-rata + korelasi | Semua ada | FR-LSTM-08 |
| TC-LSTM-09 | Replikasi Excel (MAE uji 0,8607 > rata-rata 0,8597?) | Peringatan merah "belum melampaui baseline" muncul | FR-LSTM-08 |
| TC-LSTM-10 | Forecast 4 minggu | Lag dari data aktual; libur dari kalender; asumsi harga tertera; tanpa clamp diam-diam | FR-LSTM-09 |
| TC-LSTM-11 | Tekan "Hentikan" saat pelatihan | Berhenti ≤ 2 detik, UI tetap responsif | FR-LSTM-10 |
| TC-LSTM-12 | Dataset < 32 minggu | Mode Latih diblokir dengan pesan | FR-VER-02 |

### 2.4 Laporan & dashboard
| ID | Langkah | Hasil |
|---|---|---|
| TC-RPT-01 | Jalankan prediksi → buka Laporan | Riwayat baru tersimpan dengan konfigurasi & metrik uji |
| TC-RPT-02 | Cetak PDF | Memuat ringkasan, metrik uji + baseline, tabel aktual vs prediksi, forecast |
| TC-RPT-03 | Dashboard tanpa riwayat | Status kosong yang jelas |

### 2.5 Keamanan & kinerja
| ID | Uji | Hasil |
|---|---|---|
| TC-SEC-01 | Semua endpoint non-publik tanpa token | 401 semua |
| TC-SEC-02 | `PUT /user/profile` untuk id lain | Tidak berpengaruh |
| TC-SEC-03 | `DELETE /data/tickets?all=true` oleh staf | 403 |
| TC-SEC-04 | Injeksi `' OR 1=1 --` pada username/ID | Tidak berpengaruh (prepared statement) |
| TC-SEC-05 | Origin tidak terdaftar | Tidak ada header `Access-Control-Allow-Origin` |
| TC-SEC-06 | Cek header respons | `nosniff`, `no-store` |
| TC-SEC-07 | Cari kredensial di repo (`grep -ri "password123\|admin123\|root"`) | Tidak ada |
| TC-SEC-08 | `test_db.php` | Tidak ada di repo |
| TC-PERF-01 | Latih 67 sampel × 100 epoch | ≤ 30 detik |
| TC-PERF-02 | Daftar 500 baris | ≤ 2 detik |

### 2.6 Data dinamis (TC-DYN)

| ID | Langkah | Hasil yang diharapkan | FR |
|---|---|---|---|
| TC-DYN-01 | Tambah 1 minggu baru lewat **Tambah minggu berikutnya** | n bertambah di verifikasi/dashboard; **pelatihan ulang otomatis dimulai** (lihat TC-AUTO); tanpa deploy ulang | FR-DYN-01/04/07, FR-AUTO-01 |
| TC-DYN-02 | Jalankan **Prediksi cepat** setelah TC-DYN-01 | Memakai minggu terbaru; label "model dilatih pada {rentang}"; tanpa pelatihan; < 2 detik | FR-DYN-05 |
| TC-DYN-03 | **Latih ulang sekarang** (admin) pada data n=40, 67, 120 | Pratinjau split sesuai rumus (uji ≥ 8, validasi ≥ 4); scaler baru dari data latih; model lama tetap di riwayat | FR-DYN-06, FR-LSTM-04 |
| TC-DYN-04 | Ubah nilai minggu lama | `data_hash` berubah; pelatihan ulang otomatis terpicu (OQ-13); riwayat lama utuh | FR-DYN-10 |
| TC-DYN-05 | Hapus data hingga n < 32, lalu n < 4 | Latih diblokir (< 32); Prediksi cepat diblokir (< 4) dengan pesan | FR-VER-02 |
| TC-DYN-06 | Input tiket = 30 (ekstrem) | Peringatan konfirmasi; setelah dikonfirmasi tersimpan; Prediksi cepat menampilkan peringatan di luar rentang (`oor_ratio`) | FR-DYN-08, 06 §12.2 |
| TC-DYN-07 | Input tanggal melompat 2 minggu | Ditolak/diminta konfirmasi; Latih diblokir sampai celah terisi | FR-DYN-07/09 |
| TC-DYN-08 | Jalankan pipeline pada n=40/67/120 (data sintetis) | Tidak ada galat indeks; angka split mengikuti rumus | FR-DYN-02 |
| TC-DYN-09 | `grep -rnE "TD_MIN\|TD_MAX\|HARGA_MIN\|HARGA_MAX" src/services src/pages` dan cari literal 810/950/−85 | Tidak ada di kode logika (hanya fixture/berkas bobot) | FR-DYN-02 |
| TC-DYN-10 | Ubah kalender libur (admin) | Minggu terdampak dihitung ulang dengan konfirmasi; yang ditimpa manual tidak berubah | FR-DYN-11 |
| TC-DYN-11 | Data melewati pergantian tahun (2026→2027) | Urutan, keunikan, dan audit celah benar | FR-VER-01 |
| TC-DYN-12 | Hash dataset referensi | Sama dengan `assets/reference_data_hash.txt` (klien = server); ubah 1 sel → beda | FR-DYN-03 |
| TC-DYN-13 | Forecast tersimpan lalu input aktual minggu itu | Galat nyata terhitung dan tampil | 06 §12.6 |

### 2.7 Pelatihan ulang otomatis (TC-AUTO)

| ID | Langkah | Hasil yang diharapkan | FR |
|---|---|---|---|
| TC-AUTO-01 | Simpan 1 data baru (n ≥ 32) | Job dibuat otomatis; status *Berjalan* + progres; UI tetap responsif | FR-AUTO-01/04 |
| TC-AUTO-02 | Impor 20 baris | Hanya **satu** job, dimulai setelah impor selesai | FR-AUTO-01 |
| TC-AUTO-03 | Simpan data baru saat job berjalan | Job lama `cancelled`; job baru memakai hash terbaru | FR-AUTO-03 |
| TC-AUTO-04 | Dua pengguna menyimpan bersamaan | Hanya satu `running`; tidak ada hasil ganda (klaim kedua → 409) | FR-AUTO-03 |
| TC-AUTO-05 | Tutup tab saat berjalan, tunggu > 60 dtk, buka lagi | Job basi dilanjutkan otomatis; tanpa duplikasi | FR-AUTO-11 |
| TC-AUTO-06 | Data n < 32 | Tidak ada job; "Data belum cukup (n/32)"; forecast baseline berlabel | FR-AUTO-02 |
| TC-AUTO-07 | Model pertama (tanpa champion) | Langsung aktif, `decision=tanpa_champion`, peringatan baseline bila relevan | FR-AUTO-08 |
| TC-AUTO-08 | Kandidat MAE uji < champion (jendela sama) | Menggantikan; `decision=diaktifkan`; hanya satu `is_active` | FR-AUTO-07 |
| TC-AUTO-09 | Kandidat MAE uji > champion | Champion dipertahankan; kandidat `ditahan` + alasan; badge "Model lama dipertahankan" | FR-AUTO-07/12 |
| TC-AUTO-10 | MAE uji kandidat = champion | Kandidat menggantikan ("tidak lebih buruk") | FR-AUTO-07 |
| TC-AUTO-11 | Champion bernilai MAE lama tersimpan berbeda dari hasil baru | Gerbang memakai MAE champion yang **dihitung ulang** pada W | FR-AUTO-06 |
| TC-AUTO-12 | `oor_ratio` > 10% atau tanpa model aktif | Varian lanjutan dilewati; alasan tercatat | FR-AUTO-05 |
| TC-AUTO-13 | Dua kandidat tersedia | Keduanya tersimpan dengan `job_id` sama; pemenang = MAE uji terkecil; seri → dari nol | FR-AUTO-05/09 |
| TC-AUTO-14 | Ulang job pada `data_hash` + seed sama | Kandidat dari-nol identik (≤ 10⁻⁶) | FR-AUTO-13 |
| TC-AUTO-15 | Paksa galat saat pelatihan | Job `failed`; model aktif tak berubah; pesan jelas + tombol coba lagi | FR-AUTO-10 |
| TC-AUTO-16 | Edit/hapus data lama | Job terpicu (OQ-13) | FR-DYN-10 |
| TC-AUTO-17 | Ukur waktu job lengkap n=67 | ≤ 60 detik; UI tidak membeku | NFR-PERF-03 |
| TC-AUTO-18 | Uji properti untuk N = 28…200 | Awal jendela uji baru ≥ awal jendela uji sebelumnya; tak beririsan dengan latih/validasi model lama | 06 §13.3 |

## 3. UAT (dijalankan staf/penguji)

| ID | Skenario | Kriteria lulus |
|---|---|---|
| UAT-01 | Masuk dengan akun staf, lihat Dashboard | Masuk tanpa bantuan; ringkasan terbaca |
| UAT-02 | Tambah 1 data minggu baru | Tersimpan; pesan konfirmasi jelas |
| UAT-03 | Unduh template, isi, impor | Berhasil; galat (jika ada) dapat dipahami |
| UAT-04 | Jalankan **Replikasi Excel** → baca hasil | Paham bahwa ini replikasi; angka sesuai Excel |
| UAT-05 | Jalankan **Latih** → baca metrik uji & baseline | Dapat menjelaskan apakah model lebih baik dari baseline |
| UAT-06 | Lihat prediksi 1–4 minggu ke depan | Paham asumsi harga & libur |
| UAT-07 | Cetak PDF dan buka | Isi lengkap, rapi, Bahasa Indonesia |
| UAT-08 | Setup dari nol di komputer lain (README + `.env.example`) | Berjalan ≤ 15 menit |
| UAT-09 | **Siklus mingguan:** tambah data minggu terbaru → pelatihan ulang otomatis berjalan → baca keputusan (model diganti/dipertahankan) → Prediksi cepat → cetak PDF | Selesai ≤ 5 menit aktif; paham arti keputusan dan peringatan "uji bisa optimis" |
| UAT-10 | Tutup tab saat pelatihan berjalan, buka lagi | Pelatihan dilanjutkan; tidak ada hasil ganda |

**Lembar persetujuan:** tabel di bawah diisi penguji.

| UAT | Lulus (Y/T) | Catatan | Penguji / tanggal |
|---|---|---|---|
| 01 | | | |
| … | | | |

## 4. Kriteria keluar rilis

- Seluruh TC prioritas Must lulus; tidak ada cacat Kritis/Tinggi terbuka.
- Golden test (TC-LSTM-01/02) lulus pada setiap rilis yang menyentuh `src/services/lstm/`.
- UAT ≥ 80% lulus (G-5).

## 5. Tingkat keparahan cacat

| Tingkat | Contoh |
|---|---|
| Kritis | Bypass autentikasi, kehilangan data, hasil model salah tanpa peringatan |
| Tinggi | Fitur utama gagal, metrik salah hitung |
| Sedang | Validasi kurang, UI membingungkan |
| Rendah | Tampilan/ejaan |
