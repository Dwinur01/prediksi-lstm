# PRD — SWA Predict (Product Requirements Document)

**Versi:** 1.0 | **Pemilik produk:** Dwi (peneliti/pengembang) | **Mitra:** PT Swabina Gatra Travel | **Status:** Draf untuk diperbaiki dari repo yang ada

## 1. Ringkasan

SWA Predict adalah aplikasi web untuk meramalkan **jumlah tiket yang terjual per minggu** memakai **LSTM murni (7 input, 4 hidden unit)**. Pengguna mengelola data penjualan, menjalankan alur prediksi bertahap (verifikasi data → konfigurasi → pelatihan/replikasi → hasil), lalu mencetak laporan. Aplikasi sekaligus menjadi **bukti implementasi skripsi** sehingga hasilnya harus dapat diverifikasi terhadap perhitungan Excel.

## 2. Latar belakang & masalah

| Masalah | Bukti |
|---|---|
| Perencanaan stok tiket mingguan dilakukan manual tanpa model | Data penjualan 6–10 tiket/minggu, fluktuatif |
| Hasil di aplikasi tidak konsisten dengan Excel skripsi | Bobot aplikasi 5 input vs Excel 7 input |
| Klaim akurasi tidak berdasar | Model setara tebakan rata-rata (MAPE uji 11,49% vs 10,80%) |
| Sistem tidak aman untuk dipakai bersama | API tanpa autentikasi |

## 3. Tujuan & metrik keberhasilan

| ID | Tujuan | Metrik | Target |
|---|---|---|---|
| G-1 | Aplikasi mereproduksi Excel | Selisih ŷ aplikasi vs `golden_forward_pass.csv` (dataset referensi/fixture) | ≤ 5×10⁻⁴ (qty) di 64 baris |
| G-2 | Evaluasi jujur | Laporan memuat metrik latih & uji + baseline naif + baseline rata-rata | 100% laporan |
| G-3 | Model bernilai | MAE & RMSE **uji** ≤ baseline rata-rata (pada pembagian skripsi latih M4–54 / uji M55–67: 0,8597 / 1,0641) | Tercapai, atau dilaporkan tidak tercapai |
| G-4 | Aman | Endpoint non-publik menolak permintaan tanpa token valid | 100% endpoint |
| G-5 | Mudah dipakai | Staf menyelesaikan alur "impor data → prediksi minggu depan" tanpa bantuan | ≤ 5 menit, ≥ 80% lulus UAT |
| G-6 | Data dinamis | Data baru/ubahan tercermin pada verifikasi, dashboard, dan prediksi tanpa mengubah kode; model usang terdeteksi | Lulus seluruh TC-DYN |
| G-7 | Model selalu mengikuti data | Pelatihan ulang otomatis setiap data disimpan; model aktif baru **tidak pernah** memiliki MAE uji lebih buruk dari pendahulunya pada jendela uji yang sama | Lulus seluruh TC-AUTO |

## 4. Persona

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Staf penjualan** | Karyawan PT Swabina Gatra, bukan ahli ML | Input data mingguan, lihat prediksi minggu depan, cetak laporan |
| **Admin** | Pengelola sistem/peneliti | Kelola pengguna, atur kalender libur, jalankan & bandingkan model, reset data |
| **Penguji/dosen** | Menilai skripsi | Melihat rumus, bobot, metrik uji, dan baseline secara transparan |

## 5. Ruang lingkup

**Dalam lingkup (v1.0):** autentikasi & peran; CRUD data penjualan + impor/ekspor CSV; kalender libur; verifikasi kualitas data; mode *Replikasi Excel* (tanpa pelatihan) dan mode *Latih* (LSTM murni di TF.js); evaluasi latih/uji + baseline; prediksi 1–4 minggu ke depan; riwayat & cetak PDF; profil pengguna; **siklus mingguan data dinamis** (tambah/ubah data → prediksi cepat atau latih ulang, deteksi model usang).

**Di luar lingkup:** multi-perusahaan/tenant, integrasi sistem tiket eksternal, notifikasi email, aplikasi mobile native, model selain LSTM murni (hybrid/MA dihapus dari skripsi).

## 6. Epik & prioritas (MoSCoW)

| Epik | Fitur | Prioritas | Status |
|---|---|---|---|
| E1 Autentikasi & peran | Login aman, token terverifikasi, peran admin/staf, ubah profil | Must | Perlu perbaikan |
| E2 Data penjualan | CRUD, impor/ekspor CSV, validasi, template benar | Must | Ada, perlu perbaikan |
| E3 Kalender libur | Tabel libur nasional & sekolah, turunan `libur(t)` | Should | Baru |
| E4 Model LSTM murni | Replikasi Excel 7 input, mode latih, golden test | Must | Perlu perbaikan besar |
| E5 Evaluasi jujur | Metrik latih/uji, baseline, korelasi, peringatan bila ≤ baseline | Must | Baru |
| E6 Prediksi & laporan | Forecast 1–4 minggu, riwayat, PDF | Must | Ada, perlu perbaikan |
| E7 Dashboard | Ringkasan, tren, prediksi minggu depan | Should | Ada |
| E8 Kualitas | Tes otomatis, dokumentasi, `.env` | Should | Baru |
| E9 Data dinamis & pelatihan ulang otomatis | Tambah minggu berikutnya, jejak data, pelatihan ulang otomatis (dari nol + lanjutan), champion–challenger dengan gerbang MAE uji, prediksi cepat, status & log keputusan | Must | Baru |

## 7. Asumsi, ketergantungan, risiko

| Item | Penjelasan | Mitigasi |
|---|---|---|
| Data kecil (67 minggu, nilai 6–10) | Model sulit mengalahkan baseline; MAPE menyesatkan untuk bilangan bulat kecil | Utamakan MAE/RMSE; sajikan baseline; jelaskan di Bab IV |
| Metodologi LSTM (OQ-01) | Input 1 timestep membuat memori LSTM tidak terpakai | Konsultasi dosen; dokumentasikan keputusan |
| Kalender libur masa depan | Prediksi butuh `libur(t)` minggu depan | Isi kalender sebelum prediksi; peringatan bila kosong |
| Data terus bertambah/berubah | Model lama menjadi tidak mewakili data; angka tetap di kode menjadi salah | Jejak data + status usang; scaler per model; rasio split; pelatihan ulang otomatis (champion–challenger) & prediksi cepat |
| Pelatihan otomatis di browser | Tab ditutup saat melatih; beban perangkat; data kecil membuat hasil berfluktuasi; seleksi berulang pada data uji → MAE optimis | Tabel `training_jobs` + pemulihan otomatis; Web Worker; seed tetap; wajib tampilkan *galat nyata* (`06 §12.6`) dan peringatan optimis |
| Ketergantungan XAMPP/PHP versi lokal | Pengujian dan sidang di mesin berbeda | Panduan setup + `.env.example` |

## 8. Rilis

| Rilis | Isi | Tugas (`09`) |
|---|---|---|
| **R0 — Aman & jujur** | Autentikasi nyata, konfigurasi `.env`, hapus animasi palsu & data dummy | T-01…T-05, T-12, T-17 |
| **R1 — Model benar** | Modul LSTM terpisah, bobot 7 input, golden test, evaluasi latih/uji + baseline | T-10, T-11, T-13…T-16, T-40…T-46 |
| **R2 — Data & kalender** | Migrasi DB, dataset 67 minggu, template CSV, kalender libur, riwayat lengkap | T-20…T-24 |
| **R3 — Kualitas** | Tes otomatis, README, UX | T-30…T-33 |
