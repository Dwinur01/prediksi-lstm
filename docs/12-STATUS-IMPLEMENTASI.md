# Status Implementasi & Serah Terima ke Antigravity

**Tanggal:** 27 Okt 2026 | Kode **frontend dan mesin model sudah dikerjakan**. Yang tersisa hanya yang menyangkut **database/PHP/XAMPP** — dikerjakan di Antigravity agar langsung dibuat di XAMPP.

## 1. Sudah dikerjakan (terverifikasi)

| Tugas | Status | Bukti |
|---|---|---|
| T-10 pecah `lstm.js` → `src/services/lstm/*` | ✅ | `lstm.js` lama dihapus |
| T-11 Replikasi Excel 7 input + golden test | ✅ | 64 baris cocok ≤ 5e-4 (`npm test`) |
| T-12 hapus animasi pelatihan palsu | ✅ | loss nyata dari TF.js |
| T-13 split rasio, metrik latih/uji, pembanding | ✅ | tes split, metrik, pembanding |
| T-14 mode Latih (LSTM murni, state reset, early stopping, seed) | ✅ | deterministik pada seed sama |
| T-15 peramalan multi-langkah | ✅ | tes forecast |
| T-16 bug kecil + audit data (celah antar-tahun) | ✅ | tes audit |
| T-17 hapus data simulasi diam-diam | ✅ | `dummy.js` dihapus; galat tampil jelas |
| T-24 `VITE_API_URL` + interceptor token/401 | ✅ | `src/services/api.js`, `.env.example` |
| T-40 (sisi klien) `data_hash`, status usang | ✅ | hash = `reference_data_hash.txt` |
| T-41 prediksi cepat memakai model aktif | ✅ | Dashboard |
| T-42 audit "tanpa data statis" | ✅ | tanpa min/max/jumlah minggu tertanam |
| T-44 (sisi klien) pelatihan otomatis, jeda 3 dtk, batalkan job lama | ✅ | `autoRetrain.js` |
| T-45 champion–challenger (dari nol + lanjutan, jendela uji sama, gerbang MAE) | ✅ | tes keputusan & properti jendela uji |
| T-47/T-48 desain mode terang, tema, `ThemeProvider` | ✅ | audit strict lulus |
| T-50 token, font hosting sendiri, primitif | ✅ | `index.css`, `tailwind.config.js` |
| T-51 halaman masuk + `/tentang` (Landing, Features, Register dihapus) | ✅ | |
| T-52 Ringkasan editorial (peta panas dihapus) | ✅ | |
| T-53 Data penjualan & modal (disapu ke token) | ✅ | |
| T-54 wizard Prediksi: tabel model-vs-pembanding, kurva loss nyata | ✅ | |
| T-56 sapu bersih (maskot, nano_logo, partikel, kursor kustom dihapus) | ✅ | |

**Pemeriksaan akhir:** `npm test` 20/20 lulus · `vite build` lulus · lint 50 → 5 (semua sudah ada sebelumnya) · audit tema **strict lulus pada 22 tampilan mode terang**, kontras teks 0 pelanggaran di mode terang dan gelap.

**Temuan model (data referensi, satu proses di browser, seed 42):** model terlatih mengalahkan kedua pembanding pada bagian uji (13 minggu): MAE 0,75 vs 0,87 (rata-rata) vs 0,92 (minggu lalu); RMSE 0,91 vs 1,07 vs 1,18; korelasi 0,55. Replikasi bobot Excel justru setara tebakan rata-rata (MAE uji 0,8607 vs 0,8597) — sesuai audit sebelumnya. **Catatan:** 13 titik uji, satu seed, dan seleksi berulang pada data uji membuat angka cenderung optimis; ukuran yang jujur adalah *galat nyata* pada minggu baru (sudah ditampilkan di Ringkasan).

## 2. Belum dikerjakan — UI kecil (tanpa database)
| Tugas | Isi |
|---|---|
| T-43 | Tombol "Tambah minggu berikutnya", deteksi tanggal tak selaras, peringatan nilai ekstrem |
| T-46 | Log keputusan retrain di Laporan (data ada di `localStorage` kunci `swa.retrainLog.v1`) |
| T-49 sisa | Token `text-muted`/`text-accent` bila diinginkan (kontras sudah lulus) |
| T-55 | Isi PDF/A4: metrik uji + pembanding + asumsi |
| T-21 (UI) | Template CSV `Tanggal;Jumlah;Harga;Libur` + pratinjau impor |

## 3. SERAH TERIMA — dikerjakan di Antigravity (database / PHP / XAMPP)
Urut. Satu tugas per percakapan; baca bagian `docs/09` yang disebut.

| # | Tugas | Isi singkat | Rujukan |
|---|---|---|---|
| 1 | **T-03** | `.env` + `env.php`, CORS whitelist, user MySQL non-root, hapus `test_db.php`, `.gitignore` | 09 T-03 · 03 §6 |
| 2 | **T-20** (migrasi 001, 002) | kolom `role`; `week_start_date` unik + `libur`; `tickets.php` validasi 422. **Klien mengirim `sale_date, week, year, tickets_sold, ticket_price`** — jaga kompatibel (`sale_date` = alias `week_start_date`) | 09 T-20 · 04 §3 |
| 3 | **T-01** | token HS256 bertanda tangan + `require_auth()`; `profile.php` ambil id dari token. **Klien sudah mengirim `Authorization: Bearer` dan menangani 401** (`api.js`); login ada di `Entry.jsx` → `POST /auth/login.php` | 09 T-01 · 05 §3.1–3.2 |
| 4 | **T-02** | hapus akun bawaan; admin via skrip CLI; register ditutup (rute `/register` sudah dialihkan ke `/login`) | 09 T-02 |
| 5 | **T-04, T-05** | login seragam + batas percobaan; `DELETE ?all=true` hanya admin, tanpa `TRUNCATE` | 09 T-04, T-05 |
| 6 | **T-40 (server)** | migrasi 004 + `GET /data/summary` (n, rentang, `data_hash` kanonik, celah). **Hash harus identik dengan klien** (`src/services/lstm/dataTrace.js`; nilai uji = `docs/assets/reference_data_hash.txt`) | 09 T-40 · 03 §5b · 05 §3.3b |
| 7 | **Model aktif ke DB** | ganti `src/services/lstm/modelStore.js` (localStorage) dengan `/data/predictions.php?active=1` + `PUT ?id=&active=1`; kolom `is_active`, `data_*`, `variant`, `decision`. **Penanda `TODO(Antigravity)` di kode** | 04 §2.5 · 05 §3.5 |
| 8 | **T-44 (server)** | migrasi 005 `training_jobs` + `/data/training-jobs.php` (klaim atomik, detak 5 dtk, basi 60 dtk); sambungkan di `autoRetrain.js` | 09 T-44 · 04 §2.7 · 05 §3.3c |
| 9 | **T-22** | migrasi 003 `holidays`, `school_holidays` + endpoint; klien kini memakai `src/models/holidays.json` (ganti sumbernya, aturan turunan sama, ambang 4 hari) | 09 T-22 · 05 §3.4 |
| 10 | **T-23 (server)** | riwayat menyimpan `user_id`; payload sudah memuat metrik uji, pembanding, `snapshot`, `forecast` di `results_json` | 05 §3.5 |
| 11 | **T-30/T-31 (API)** | skrip uji `curl`/PHPUnit (TC-AUTH, TC-SEC), README setup XAMPP | 07 · 09 T-30, T-31 |

**Kontrak yang dipakai klien saat ini** (jangan diubah tanpa menyesuaikan klien): `GET /data/tickets.php → {status, data:[{id,sale_date,week,year,tickets_sold,ticket_price}]}`; `POST/PUT/DELETE` seperti semula; `GET /data/predictions.php → {status, data:[{id, run_date, epochs, learning_rate, mse, rmse, mape, results_json}]}`; `POST /data/predictions.php` wajib memuat `epochs` dan `metrics`; seluruh badan disimpan ke `results_json`.

## 4. Menjalankan
```bash
npm install
cp .env.example .env     # sesuaikan VITE_API_URL
npm run dev              # atau: npm run build && npx vite preview
npm test                 # 20 tes (golden Excel, split, metrik, champion, pelatihan)
node tools/audit-tema/audit-tema.mjs --theme light --strict   # tanpa XAMPP: memakai API tiruan
```
