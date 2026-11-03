# SRS — Software Requirements Specification (SWA Predict)

**Versi:** 1.0 | Mengacu struktur IEEE 830 (diringkas) | Status kebutuhan: `ADA` = sudah ada, `FIX` = ada tapi salah/kurang, `BARU` = belum ada

## 1. Pendahuluan

**Tujuan:** menetapkan kebutuhan perangkat lunak SWA Predict agar dapat diimplementasikan dan diuji secara terukur.
**Lingkup:** aplikasi web peramalan penjualan tiket mingguan dengan LSTM murni (lihat `01-PRD.md`).
**Definisi:** *td* = tiket terjual per minggu; *Δharga* = selisih harga mentah minggu t dan t−1; *libur(t)* = 1 bila minggu t memuat tanggal merah/cuti bersama atau ≥ 4 hari libur sekolah Jawa Timur; *golden test* = uji pembanding terhadap `assets/golden_forward_pass.csv`.
**Referensi:** `06-Spesifikasi-Model-LSTM.md`, `05-API-Spec.md`, `04-Database.md`.

## 2. Deskripsi umum

- **Perspektif produk:** SPA React di browser + API PHP + MySQL; pelatihan/inferensi berjalan di browser (TF.js / JavaScript murni).
- **Pengguna:** Admin, Staf (lihat PRD §4). **Lingkungan:** XAMPP (Apache, PHP ≥ 8.0, MySQL), Node ≥ 20 untuk build.
- **Batasan:** data kecil (±67 minggu); pelatihan di sisi klien; bahasa antarmuka Indonesia; satu perusahaan.
- **Asumsi:** pertanyaan terbuka OQ-xx di `00-README-AGENT.md` memakai nilai default sampai dijawab.

## 3. Kebutuhan fungsional

Kolom **Tugas** merujuk `09-Backlog-Perbaikan.md`.

### 3.1 Autentikasi & pengguna (FR-AUTH)

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-AUTH-01 | Login dengan username + password; password disimpan hash (`password_hash`) | Must | ADA | — |
| FR-AUTH-02 | Server menerbitkan token bertanda tangan (HS256) berumur 8 jam; **setiap** endpoint non-publik memverifikasinya | Must | FIX | T-01 |
| FR-AUTH-03 | Pesan galat login seragam ("Username atau password salah"); maksimum 5 percobaan gagal/15 menit per username+IP | Must | FIX | T-04 |
| FR-AUTH-04 | Peran `admin` dan `staf`; hanya admin yang boleh mendaftarkan pengguna, mereset data, dan menghapus riwayat | Must | BARU | T-02, T-05 |
| FR-AUTH-05 | Tidak ada akun/kata sandi bawaan di kode; admin awal dibuat lewat skrip setup | Must | FIX | T-02 |
| FR-AUTH-06 | Logout menghapus token di klien; token kedaluwarsa memaksa kembali ke `/login` | Must | FIX | T-01 |
| FR-PRF-01 | Pengguna dapat mengubah nama dan kata sandi **miliknya sendiri** (id diambil dari token, bukan body); kata sandi minimal 8 karakter | Must | FIX | T-01 |

### 3.2 Data penjualan (FR-DATA)

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-DATA-01 | Tampilkan daftar data (pencarian, urut, paginasi) | Must | ADA | — |
| FR-DATA-02 | Tambah/ubah data: tanggal mulai minggu, tiket terjual (bilangan bulat ≥ 0), harga tiket mentah (> 0), libur (0/1) | Must | FIX | T-20, T-21 |
| FR-DATA-03 | Validasi sisi server: tipe, rentang, duplikasi `week_start_date`; galat 422 dengan pesan per kolom | Must | FIX | T-20 |
| FR-DATA-04 | Impor CSV `Tanggal;Jumlah;Harga;Libur` dengan pratinjau + laporan baris gagal; transaksi semua-atau-tidak | Must | FIX | T-21 |
| FR-DATA-05 | Ekspor CSV | Should | ADA | — |
| FR-DATA-06 | Hapus satu/banyak data dengan konfirmasi; "Reset semua" hanya admin + ketik konfirmasi | Must | FIX | T-05 |
| FR-DATA-07 | Template CSV yang diunduh sesuai format impor (termasuk Harga & Libur) | Must | FIX | T-21 |
| FR-DATA-08 | Bila API gagal, tampilkan status galat/kosong; **dilarang** memakai data dummy secara diam-diam | Must | FIX | T-17 |
| FR-DATA-09 | Kalender libur: kelola tanggal libur nasional/cuti bersama dan rentang libur sekolah; `libur(t)` diturunkan otomatis (ambang 4 hari) dan dapat ditimpa | Should | BARU | T-22 |

### 3.3 Verifikasi data (FR-VER)

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-VER-01 | Audit: jumlah baris, rentang tanggal, celah minggu (termasuk pergantian tahun), duplikat, nilai kosong/negatif | Must | FIX | T-16 |
| FR-VER-02 | Minimal data: Latih ≥ **32 minggu** (sampel = n−4 ≥ 28 agar latih ≥ 16, validasi ≥ 4, uji ≥ 8); Prediksi cepat ≥ 4 minggu; peringatan bila < 52 | Must | BARU | T-14, T-42 |
| FR-VER-03 | Tampilkan min/max yang akan dipakai normalisasi (dari **data latih**) dan tandai nilai di luar rentang | Must | BARU | T-10 |

### 3.4 Model & prediksi (FR-LSTM) — rinci di `06`

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-LSTM-01 | **Mode Replikasi Excel:** memuat bobot 7 input dari `weights_lstm_murni_7input.json`, menjalankan forward pass tanpa pelatihan; berlabel jelas "replikasi, bukan pelatihan"; dapat dijalankan pada data apa pun, tetapi pernyataan "cocok dengan Excel" hanya tampil bila `data_hash` = hash dataset referensi | Must | FIX | T-11, T-12 |
| FR-LSTM-02 | Hasil mode Replikasi cocok dengan golden test (selisih ≤ 5×10⁻⁴ qty pada 64 baris) | Must | BARU | T-11 |
| FR-LSTM-03 | **Mode Latih:** LSTM murni 1 layer, 4 hidden unit (dapat diatur 2–16), tanpa Bidirectional/Dropout secara bawaan; fitur sama dengan Excel | Must | FIX | T-14 |
| FR-LSTM-04 | Pembagian kronologis **berbasis rasio** (default 65/15/20; uji ≥ 8, validasi ≥ 4 minggu) dari data yang ada saat itu; *early stopping* pada validasi; data uji tidak disentuh saat pelatihan | Must | FIX | T-13, T-14 |
| FR-LSTM-05 | Normalisasi min-max dihitung **ulang tiap pelatihan** dari data latih dan disimpan bersama model (scaler milik model) | Must | FIX | T-10 |
| FR-LSTM-06 | Pelatihan menampilkan loss nyata per epoch dan dapat dihentikan; tidak ada nilai acak/animasi palsu | Must | FIX | T-12 |
| FR-LSTM-07 | Evaluasi: MAE, MSE, RMSE, MAPE untuk latih dan uji, dihitung dari ŷ **tanpa pembulatan**; MAPE hanya dari y ≠ 0 | Must | FIX | T-13, T-16 |
| FR-LSTM-08 | Pembanding wajib: baseline naif td(t−1) dan baseline rata-rata latih, plus korelasi ŷ–y; peringatan merah bila model tidak lebih baik dari baseline rata-rata | Must | BARU | T-13 |
| FR-LSTM-09 | Peramalan 1–4 minggu: riwayat awal dari **data aktual**, lag benar, `libur` masa depan dari kalender (peringatan bila kosong); hasil di luar rentang latih ditandai, tidak dipotong diam-diam | Must | FIX | T-15 |
| FR-LSTM-10 | Hanya satu proses pelatihan berjalan; antarmuka tidak membeku (pelatihan di Web Worker atau `await tf.nextFrame()`) | Should | BARU | T-14 |
| FR-LSTM-11 | Simpan hasil ke riwayat: konfigurasi, metrik latih/uji, baseline, bobot akhir, hasil forecast | Must | FIX | T-23 |

### 3.5 Laporan & dashboard (FR-RPT, FR-DSH)

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-RPT-01 | Daftar riwayat 10 proses terbaru; lihat detail; hapus satu (admin & pemilik) / semua (admin) | Must | ADA | T-05 |
| FR-RPT-02 | Cetak/ekspor PDF: ringkasan, konfigurasi, metrik uji + baseline, tabel aktual vs prediksi, forecast | Must | FIX | T-23 |
| FR-DSH-01 | Kartu ringkasan: total tiket, rata-rata mingguan, prediksi minggu depan (dari riwayat terakhir) | Should | ADA | — |
| FR-DSH-02 | Grafik tren penjualan + garis prediksi | Should | ADA | — |
| FR-DSH-03 | Tampilkan status kosong/galat yang jelas bila belum ada data/riwayat | Must | FIX | T-17 |

### 3.6 Data dinamis & siklus model (FR-DYN)

Data penjualan terus diinput pengguna; sistem harus tetap benar tanpa mengubah kode.

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-DYN-01 | Penambahan/perubahan/penghapusan data (satu data atau impor) langsung tercermin di verifikasi, dashboard, dan proses berikutnya | Must | BARU | T-40, T-42 |
| FR-DYN-02 | Tidak ada nilai tetap di kode logika (min/max, nomor minggu, jumlah baris); semuanya dihitung dari data/ scaler model | Must | BARU | T-42 |
| FR-DYN-03 | Setiap hasil menyimpan jejak data: `data_n`, `data_first_week`, `data_last_week`, `data_hash` (SHA-256 kanonik) dan salinan seri yang dipakai | Must | BARU | T-40 |
| FR-DYN-04 | Status model aktif + jejak data; status pelatihan ulang: **Data belum cukup (n/32) / Menunggu / Berjalan (varian, epoch) / Model diganti / Model lama dipertahankan / Gagal–tertunda**, lengkap dengan alasan | Must | BARU | T-40, T-46 |
| FR-DYN-05 | **Prediksi cepat:** inferensi tanpa pelatihan memakai bobot + scaler model aktif pada data terbaru; berlabel "model dilatih pada {rentang}" | Must | BARU | T-41 |
| FR-DYN-06 | **Pelatihan ulang otomatis** langsung setelah data disimpan (FR-AUTO); tombol **Latih ulang sekarang** (admin) tetap ada sebagai pemicu manual dengan pratinjau pembagian (jumlah dan rentang latih/validasi/uji) | Must | BARU | T-44 |
| FR-DYN-07 | Tombol **Tambah minggu berikutnya**: `week_start_date` = minggu terakhir + 7 hari, harga awal = harga terakhir (saran), `libur` dari kalender; celah atau tanggal tidak selaras minggu ditolak/diminta konfirmasi | Must | BARU | T-43 |
| FR-DYN-08 | Peringatan konfirmasi untuk nilai ekstrem (> 3 simpangan baku atau di luar rentang scaler model); tidak diblokir | Should | BARU | T-43 |
| FR-DYN-09 | Data dengan celah minggu memblokir Replikasi/Latih sampai celah diisi; tidak ada interpolasi otomatis | Must | BARU | T-16, T-42 |
| FR-DYN-10 | Mengubah/menghapus data lama juga memicu pelatihan ulang (OQ-13); riwayat tidak berubah dan tetap terbaca | Must | BARU | T-40, T-44 |
| FR-DYN-11 | `libur` minggu baru terisi dari kalender; saat kalender diperbarui, minggu terdampak dihitung ulang dengan konfirmasi kecuali yang ditimpa manual | Should | BARU | T-22, T-43 |
| FR-DYN-12 | *(Digantikan FR-AUTO.)* Saran latih ulang manual hanya muncul bila pelatihan **gagal** atau **tertunda** | Should | BARU | T-46 |

### 3.7 Pelatihan ulang otomatis (FR-AUTO) — rinci di `06 §13`

| ID | Kebutuhan | Prio | Status | Tugas |
|---|---|---|---|---|
| FR-AUTO-01 | Setiap simpan/impor/ubah/hapus data yang **berhasil** memicu job pelatihan; debounce 3 detik; impor massal = **satu** job setelah impor selesai | Must | BARU | T-44 |
| FR-AUTO-02 | Prasyarat n ≥ 32; bila kurang tidak ada job, UI "Data belum cukup (n/32)" dan forecast sementara berupa baseline berlabel | Must | BARU | T-44 |
| FR-AUTO-03 | Satu job `running` global (`training_jobs`, detak 5 dtk, basi 60 dtk boleh diambil alih); job baru saat ada job berjalan membatalkan yang lama dan memakai `data_hash` terbaru | Must | BARU | T-44 |
| FR-AUTO-04 | Pelatihan di Web Worker, UI tetap responsif, progres (varian, epoch, loss) tampil, dapat dibatalkan admin | Must | BARU | T-44 |
| FR-AUTO-05 | Dua kandidat: **dari nol** (bobot acak, seed tetap, scaler baru) dan **lanjutan** (bobot model aktif, scaler aktif dibekukan, lr 0,003, ≤ 50 epoch); lanjutan dilewati bila tak ada model aktif, arsitektur beda, atau `oor_ratio` > 10% | Must | BARU | T-45 |
| FR-AUTO-06 | Model aktif (champion) dan kedua kandidat dievaluasi pada **jendela uji yang sama**; champion lewat inferensi dengan bobot + scaler-nya sendiri (bukan MAE lama yang tersimpan) | Must | BARU | T-45 |
| FR-AUTO-07 | Kandidat terbaik = MAE uji terkecil (seri → dari nol). Promosi **hanya bila** MAE uji kandidat ≤ MAE uji champion pada jendela yang sama; bila tidak, champion dipertahankan | Must | BARU | T-45 |
| FR-AUTO-08 | Model pertama (tanpa champion) langsung aktif dengan peringatan baseline (FR-LSTM-08); Replikasi Excel tidak pernah menjadi model aktif otomatis | Must | BARU | T-45 |
| FR-AUTO-09 | Semua kandidat tersimpan di riwayat dengan `job_id`, `variant`, `decision` (`diaktifkan`/`ditahan`/`tanpa_champion`) dan MAE champion pada jendela sama | Must | BARU | T-45 |
| FR-AUTO-10 | Pelatihan gagal → job `gagal`, model aktif tidak berubah, pesan jelas dan tombol coba lagi | Must | BARU | T-44, T-46 |
| FR-AUTO-11 | Job `pending`/basi dilanjutkan otomatis saat aplikasi dibuka kembali (OQ-14) | Must | BARU | T-44 |
| FR-AUTO-12 | UI menampilkan keputusan ("Model diganti: MAE uji 0,82 vs 0,86" / "Model lama dipertahankan: 0,91 vs 0,86"), peringatan seleksi berulang bersifat optimis, dan *galat nyata* | Must | BARU | T-46 |
| FR-AUTO-13 | Reproduksibel: `data_hash` + seed sama → kandidat dari-nol identik (≤ 10⁻⁶) | Should | BARU | T-45 |

## 4. Antarmuka eksternal

- **UI:** rute pada `README-AGENT §2`; tema gelap/terang disimpan di `localStorage`; responsif ≥ 360 px.
- **API:** REST JSON (`05-API-Spec.md`); header `Authorization: Bearer <token>`.
- **Basis data:** MySQL 8 / MariaDB 10.4 (XAMPP); SQLite hanya fallback demo.
- **Berkas:** impor CSV (`;` atau `,`), ekspor CSV, ekspor PDF (jsPDF).

## 5. Kebutuhan non-fungsional

| ID | Kategori | Kebutuhan | Verifikasi |
|---|---|---|---|
| NFR-SEC-01 | Keamanan | Semua query memakai prepared statement (sudah); input divalidasi server; output di-escape di UI | Tinjau kode, `07` TC-SEC |
| NFR-SEC-02 | Keamanan | Secret, kredensial DB, origin CORS dari `.env`; MySQL memakai user non-root | Tinjau konfigurasi |
| NFR-SEC-03 | Keamanan | CORS hanya untuk origin yang diizinkan; tanpa `*` | TC-SEC-05 |
| NFR-SEC-04 | Keamanan | Header: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` pada respons API | TC-SEC-06 |
| NFR-PERF-01 | Kinerja | Pelatihan 67 sampel × 100 epoch selesai ≤ 30 detik di laptop standar | TC-PERF-01 |
| NFR-PERF-03 | Kinerja | Satu job pelatihan ulang lengkap (kandidat dari-nol + lanjutan + evaluasi champion) selesai ≤ 60 detik untuk n = 67; UI tetap responsif (Web Worker) | TC-AUTO-17 |
| NFR-PERF-02 | Kinerja | Halaman data memuat ≤ 2 detik untuk 500 baris | TC-PERF-02 |
| NFR-REL-01 | Keandalan | Impor bersifat transaksional; galat server tidak menampilkan *stack trace* ke klien | TC-DATA-05 |
| NFR-REP-01 | Reproduksibilitas | Mode Latih menerima *seed*; seed sama → hasil sama (toleransi 1×10⁻⁶) | TC-LSTM-06 |
| NFR-USA-01 | Kegunaan | Semua galat berbahasa Indonesia, spesifik, dan memberi langkah perbaikan | UAT |
| NFR-MNT-01 | Pemeliharaan | `lstm.js` dipecah per tanggung jawab; fungsi murni dapat diuji tanpa TF.js/DOM | T-10 |
| NFR-PRT-01 | Portabilitas | Setup dari nol ≤ 15 menit memakai README + `.env.example` | UAT-08 |

## 6. Matriks keterlacakan (ringkas)

| Kebutuhan | Tugas | Uji |
|---|---|---|
| FR-AUTH-02, FR-PRF-01 | T-01 | TC-AUTH-03…06, TC-SEC-01…03 |
| FR-LSTM-01/02 | T-11 | TC-LSTM-01…02 |
| FR-LSTM-03/04/05 | T-10, T-14 | TC-LSTM-03…06 |
| FR-LSTM-07/08 | T-13, T-16 | TC-LSTM-07…09 |
| FR-LSTM-09 | T-15 | TC-LSTM-10 |
| FR-DATA-04/07 | T-21 | TC-DATA-03…05 |
| FR-DYN-01…12 | T-40…T-43 | TC-DYN-01…13 |
| FR-AUTO-01…13 | T-44…T-46 | TC-AUTO-01…18 |
