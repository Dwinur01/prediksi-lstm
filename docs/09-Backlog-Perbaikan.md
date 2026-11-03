# Backlog Perbaikan — SWA Predict (sumber pekerjaan agent)

**Cara pakai:** kerjakan **satu tugas per iterasi**, urut P0 → P3. Tiap tugas memuat berkas terkait, langkah, dan **kriteria penerimaan (KP)** yang harus dicentang. Ukuran: S ≤ 2 jam, M ≤ 1 hari, L > 1 hari. Aturan kerja di `00-README-AGENT.md` §4 berlaku.

> **STATUS TERKINI:** sebagian besar tugas klien/model/desain sudah selesai — lihat `12-STATUS-IMPLEMENTASI.md`. Tugas yang tersisa adalah sisi database/PHP.

## Ringkasan

| ID | Tugas | Prio | Ukuran | Bergantung |
|---|---|---|---|---|
| T-01 | Autentikasi token nyata + otorisasi endpoint | P0 | L | T-03 |
| T-02 | Hapus akun bawaan, admin via skrip, peran | P0 | M | T-01, T-20 |
| T-03 | Konfigurasi `.env`, CORS whitelist, bersihkan repo | P0 | M | — |
| T-04 | Login seragam + pembatasan percobaan | P0 | S | T-01 |
| T-05 | Amankan operasi destruktif | P0 | S | T-01, T-02 |
| T-10 | Pecah `lstm.js` jadi modul; normalisasi dari data latih | P1 | L | — |
| T-11 | Replikasi Excel 7 input + golden test | P1 | M | T-10 |
| T-12 | Hapus animasi pelatihan palsu | P1 | S | T-11 |
| T-13 | Split kronologis, metrik latih/uji, baseline | P1 | M | T-10 |
| T-14 | Mode Latih: LSTM murni, state reset, early stopping | P1 | L | T-10, T-13 |
| T-15 | Perbaiki peramalan multi-langkah | P1 | M | T-11 |
| T-16 | Perbaiki bug kecil metrik/audit/lag | P1 | S | T-10 |
| T-17 | Hapus fallback data dummy diam-diam | P1 | S | — |
| T-20 | Migrasi skema DB | P2 | M | T-03 |
| T-21 | Dataset 67 minggu, template & impor CSV | P2 | M | T-20 |
| T-22 | Kalender libur + turunan `libur(t)` | P2 | L | T-20 |
| T-23 | Riwayat & PDF lengkap (uji + baseline) | P2 | M | T-13 |
| T-24 | `VITE_API_URL` + interceptor axios | P2 | S | T-01 |
| T-30 | Tes otomatis (Vitest + skrip API) | P3 | M | T-10 |
| T-31 | README, `.env.example`, skrip setup | P3 | S | T-03 |
| T-32 | UX: loading/kosong/galat, validasi form | P3 | M | T-17 |
| T-33 | Ekspor bahan Bab III/IV | P3 | S | T-13 |
| T-40 | Jejak data (`data_hash`) & status model terkini/usang | P1 | M | T-20 |
| T-41 | Prediksi cepat + model aktif (inferensi) | P1 | M | T-14, T-40 |
| T-42 | Audit "tanpa data statis" (rasio split, scaler dinamis, minimal data) | P1 | M | T-10, T-13 |
| T-43 | UX input data mingguan (tambah minggu berikutnya, celah, nilai ekstrem) | P2 | M | T-20, T-22 |
| T-44 | Pelatihan ulang otomatis: pemicu, job + kunci, Web Worker, pemulihan | P1 | L | T-14, T-20, T-40 |
| T-45 | Champion–challenger: kandidat dari-nol & lanjutan, jendela uji sama, gerbang MAE | P1 | L | T-13, T-14, T-44 |
| T-46 | UI status pelatihan, log keputusan, peringatan optimis & galat nyata | P2 | M | T-44, T-45 |
| T-47 | Perbaikan desain mode terang (D-01…D-06) + pemeriksa CI — **SELESAI** (`perbaikan-desain.zip`) | P1 | L | — |
| T-48 | Infrastruktur tema: skrip awal, `ThemeProvider`, `color-scheme`, metadata (A-01…A-06) — **SELESAI** | P1 | M | — |
| T-49 | Kontras & ukuran teks (§4 audit) — **SEBAGIAN**: pasangan warna terang/gelap selesai; token semantik & teks ≤ 10 px belum | P2 | L | T-48 |
| T-50 | Fondasi desain editorial: token warna, font hosting sendiri, primitif komponen | P1 | M | T-48 |
| T-51 | Halaman masuk sederhana (ganti Landing) + halaman `/tentang` | P1 | M | T-50, T-02 |
| T-52 | Ringkasan (dashboard) gaya editorial | P2 | L | T-50, T-13, T-41 |
| T-53 | Data Penjualan & modal gaya editorial | P2 | M | T-50 |
| T-54 | Wizard pelatihan & hasil: tabel model-vs-pembanding, tanpa dekorasi | P2 | L | T-50, T-13 |
| T-55 | Laporan & PDF selaras desain | P2 | M | T-50, T-23 |
| T-56 | Sapu bersih pola "AI slop" + audit akhir | P2 | S | T-50…T-55 |

---

## P0 — Keamanan

### T-01 Autentikasi token nyata + otorisasi
**Berkas:** `api/config/auth.php` (baru), `api/auth/login.php`, semua `api/**/*.php`, `src/services/api.js`, `src/App.jsx`, `src/components/layout/Layout.jsx`
**Langkah:** (1) Buat `auth.php`: `issue_token($user)`, `verify_token()`, `require_auth()`, `require_role($r)` — JWT HS256 via `hash_hmac`, `hash_equals`, payload `{sub, role, iat, exp=+8 jam}`, secret dari `.env`. (2) Panggil `require_auth()` di semua endpoint kecuali `login`. (3) `profile.php`: ganti ke `PUT`, ambil id dari token, abaikan `id` di body, kata sandi ≥ 8. (4) Tambah `GET /auth/me`. (5) Frontend: interceptor request menambah `Authorization`; interceptor 401 → hapus `token`/`user` dan arahkan ke `/login`.
**KP:** ☐ TC-AUTH-01/03/04/05/08 lulus ☐ semua endpoint non-publik 401 tanpa token ☐ token kedaluwarsa ditolak ☐ tidak ada secret di kode.

### T-02 Hapus akun bawaan, admin via skrip, peran
**Berkas:** `api/config/db.php` (bagian seed SQLite), `api/auth/register.php`, `api/setup/create_admin.php` (baru), `database.sql`
**Langkah:** Hapus seed `admin123/admin` dan `demo@swabina.co.id`; skrip CLI membuat admin dengan kata sandi dari argumen/env; `register` memakai `require_role('admin')`; kolom `role` (migrasi 001).
**KP:** ☐ `grep -ri "password123\|admin123"` kosong ☐ TC-AUTH-06 lulus ☐ register publik ditolak (OQ-05).

### T-03 Konfigurasi `.env`, CORS, bersihkan repo
**Berkas:** `api/config/db.php`, `api/config/env.php` (baru), `api/.env.example`, `.gitignore`, `test_db.php`
**Langkah:** Muat `.env` (parser sederhana); `DB_*`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `DB_FALLBACK`; CORS hanya origin terdaftar + `Vary: Origin`; tambah `nosniff` & `no-store`; user MySQL non-root; `git rm test_db.php`; `.gitignore`: `.env`, `*.sqlite`, `dist/`; fallback SQLite hanya bila `DB_FALLBACK=sqlite`.
**KP:** ☐ TC-SEC-05/06/07/08 lulus ☐ tanpa `.env` API memberi galat konfigurasi jelas ☐ MySQL mati → galat 500 aman (bukan fallback diam-diam).

### T-04 Login seragam + pembatasan percobaan
**Berkas:** `api/auth/login.php`, migrasi `login_attempts` (opsional)
**Langkah:** Satu pesan untuk username/password salah; hitung gagal per `username+IP` 5/15 menit → 429; jangan `htmlspecialchars` pada username (simpan mentah, escape di UI).
**KP:** ☐ TC-AUTH-02/07 lulus.

### T-05 Amankan operasi destruktif
**Berkas:** `api/data/tickets.php`, `api/data/predictions.php`, `DataInput.jsx`, `Report.jsx`
**Langkah:** `DELETE ?all=true` → `require_role('admin')`; ganti `TRUNCATE` dengan `DELETE` dalam transaksi; UI meminta ketik kata "HAPUS"; hapus riwayat satu: pemilik/admin.
**KP:** ☐ TC-AUTH-06, TC-SEC-03, TC-DATA-08 lulus.

---

## P1 — Kebenaran model (baca `06` lebih dulu)

### T-10 Pecah `lstm.js` & normalisasi dari data latih
**Berkas:** `src/services/lstm.js` → `src/services/lstm/{preprocessing,lstmCell,trainer,metrics,forecast,index}.js`
**Langkah:** Pindahkan fungsi tanpa mengubah perilaku dulu; hapus konstanta `TD_MIN/TD_MAX/HARGA_MIN/HARGA_MAX`; `fitScaler(trainRows)` mengembalikan `{td:[min,max], harga:[…], dharga:[…]}`; semua fungsi murni (tanpa DOM/TF.js) kecuali `trainer.js`; perbarui impor di `LstmProcess.jsx`, `Step*.jsx`.
**KP:** ☐ `npm run build` & lint lulus ☐ tidak ada konstanta normalisasi di kode logika ☐ fungsi murni dapat diuji di Node.

### T-11 Replikasi Excel 7 input + golden test
**Berkas:** `src/models/weights_lstm_murni_7input.json` (salin dari `assets/`), `lstmCell.js`, `preprocessing.js`, `src/__tests__/golden.test.js`
**Langkah:** Implementasi `lstmStep` (`06 §10`); `buildFeatures7(rows)` (MA3 harga, Δharga mentah, libur); state dibawa antarbaris, h=c=0 di baris ke-4 data (x₄ = 0,5 imputasi, hanya mode ini); ganti `EXCEL_WEIGHTS` lama 5 input.
**KP:** ☐ golden test: 64 baris cocok `golden_forward_pass.csv` ≤ 5×10⁻⁴ (ŷ, gerbang, state) ☐ TC-LSTM-01/02.

### T-12 Hapus animasi pelatihan palsu
**Berkas:** `src/pages/dashboard/LstmProcess.jsx`, `lstm/Step3_Training.jsx`
**Langkah:** Di mode Replikasi buang loss acak dan toast "Hasil sama persis"; ganti dengan label "Replikasi perhitungan Excel (tanpa pelatihan)" + hasil golden test ("Cocok dengan Excel: ya/tidak, selisih maks"). Mode Latih menampilkan loss nyata.
**KP:** ☐ tidak ada `Math.random()` pada jalur loss/progress ☐ label mode jelas.

### T-13 Split kronologis, metrik latih/uji, baseline
**Berkas:** `preprocessing.js`, `metrics.js`, `Step2_ModelConfig.jsx`, `Step3_Training.jsx`
**Langkah:** `chronologicalSplit(samples,{ratioTrain:0.65, ratioVal:0.15, ratioTest:0.20, minTest:8, minVal:4})` (rumus `06 §6`, **bukan nomor minggu tetap**); `calculateMetrics` mengembalikan angka (bukan string) MAE/MSE/RMSE/MAPE(y≠0)/korelasi; `baselines(trainY, testY, naiveSeries)`; UI: tabel latih/uji + dua baseline; peringatan merah sesuai `06 §7`; hapus label "Akurat" otomatis.
**KP:** ☐ TC-LSTM-04/07/08/09 lulus ☐ angka acuan `06 §7` terhitung benar pada **fixture** (Replikasi uji MAE 0,8607; baseline rata-rata 0,8724 pada split rasio default).

### T-14 Mode Latih: LSTM murni, state reset, early stopping
**Berkas:** `trainer.js`, `Step2_ModelConfig.jsx`
**Langkah:** `tf.sequential` + `tf.layers.lstm({units:4})` input `[1,7]` (OQ-01) → `dense(1)`; tanpa Bidirectional/Dropout; Adam lr 0,01, L2 0,001, batch 8, epoch maks 200, early stopping patience 15 pada validasi (pulihkan bobot terbaik); seed tetap (`tf.randomUniform`/`tf.util`); tombol Hentikan; jalankan tanpa memblokir UI (`await tf.nextFrame()` atau Worker); minimal data **32 minggu** (`06 §6`); simpan bobot + scaler + konfigurasi + jejak data ke hasil.
**KP:** ☐ TC-LSTM-03/05/06/11/12 lulus ☐ NFR-PERF-01 (≤ 30 dtk) ☐ data uji tidak dipakai saat latih.

### T-15 Peramalan multi-langkah
**Berkas:** `forecast.js`, `LstmProcess.jsx`
**Langkah:** Implementasi `06 §8`: lag dari data aktual lalu rekursif; harga dibawa maju (Δ=0) untuk k ≥ 2 dengan catatan; `libur` dari kalender (peringatan jika kosong); tandai di luar rentang tanpa memotong; pembulatan hanya di tampilan.
**KP:** ☐ TC-LSTM-10 lulus ☐ langkah-1 forecast = `lstmStep` pada fitur data aktual terakhir (uji unit).

### T-16 Perbaiki bug kecil
**Berkas:** `lstm.js` (lama) / modul baru
**Langkah:** `steps.append || steps.push(...)` → `steps.push(...)`; MAPE bagi dengan n′ (y≠0); lag awal tidak diisi 0 (buang sampel tanpa riwayat lengkap); `auditDataQuality` mendeteksi celah antar-tahun (urut `week_start_date`); hindari `toFixed` yang mengubah angka jadi string di hitungan.
**KP:** ☐ TC-LSTM-07 lulus ☐ unit test audit untuk celah di pergantian tahun.

### T-17 Hapus fallback data dummy
**Berkas:** `src/services/dummy.js`, `LstmProcess.jsx` (≈ baris 119), `DataInput.jsx`, `Dashboard.jsx`
**Langkah:** Hapus pemakaian `getDummyTickets/getDummyHistory`; tampilkan komponen galat/kosong dengan tombol "Coba lagi"; `dummy.js` boleh dipindah ke `__tests__/fixtures`.
**KP:** ☐ TC-DATA-07, TC-RPT-03 lulus ☐ `grep -r "getDummy" src` hanya di fixtures.

---

## P2 — Data & fitur

### T-20 Migrasi skema DB
**Berkas:** `api/migrations/001…004`, `database.sql`, `api/data/tickets.php`
**Langkah:** Sesuai `04 §3`; `tickets.php` memakai `week_start_date` (terima `sale_date` sebagai alias), validasi 422 per kolom, `week/year` diturunkan di server.
**KP:** ☐ migrasi jalan dua kali tanpa galat ☐ TC-DATA-01/02 lulus ☐ data lama termigrasi.

### T-21 Dataset 67 minggu, template & impor CSV
**Berkas:** `api/config/excel_data.json` → `assets/dataset_67_minggu.json`, `public/template_data.csv`, `DataInput.jsx`
**Langkah:** Dataset 67 minggu = seed demo **opsional** dan fixture uji (OQ-07); data produksi dari input pengguna; template: `Tanggal;Jumlah;Harga;Libur` (contoh dari dataset); impor dengan pratinjau, validasi, laporan baris gagal, transaksi atomik; perjelas label "Harga Tiket" = harga mentah (OQ-09).
**KP:** ☐ TC-DATA-03/04/05/06 lulus.

### T-22 Kalender libur + turunan `libur(t)`
**Berkas:** `api/data/holidays.php` (baru), migrasi 003, halaman admin kecil (di `Profile` atau menu baru)
**Langkah:** CRUD libur; `derive`: `libur=1` bila ada tanggal merah/cuti bersama di minggu itu **atau** ≥ 4 hari libur sekolah (ambang dapat diatur); seed 2025–2026 dari Excel; penimpaan manual dipertahankan.
**KP:** ☐ hasil turunan 67 minggu = kolom `libur` di dataset ☐ forecast memakai kalender ☐ peringatan saat kalender kosong.

### T-23 Riwayat & PDF lengkap
**Berkas:** `api/data/predictions.php`, `Report.jsx`, `LstmProcess.jsx`
**Langkah:** Simpan payload `05 §3.5` (konfigurasi, metrik latih & uji, baseline, korelasi, bobot, scaler, forecast, `user_id`, jejak data `data_n/first/last/hash` + salinan seri, `is_active`); PDF memuat metrik uji + baseline + asumsi forecast; riwayat lama tetap terbaca.
**KP:** ☐ TC-RPT-01/02 lulus ☐ riwayat lama tidak crash.

### T-24 `VITE_API_URL` + interceptor
**Berkas:** `src/services/api.js`, `.env.example`
**Langkah:** `baseURL = import.meta.env.VITE_API_URL`; hapus path ganda `prediksi-lstm/prediksi-lstm`; pesan galat Indonesia dari `message/errors`.
**KP:** ☐ ganti URL tanpa ubah kode ☐ 401/403/422/500 ditangani.

---

## P3 — Kualitas

### T-30 Tes otomatis
Vitest untuk `preprocessing`, `lstmCell` (golden), `metrics` (TC-LSTM-07), `forecast`; skrip `tests/api/*.http` atau `curl` untuk TC-AUTH/TC-SEC; `npm test` di CI lokal.
**KP:** ☐ `npm test` hijau ☐ cakupan modul `lstm/` ≥ 80%.

### T-31 README, `.env.example`, setup
Perbarui README (7 input, bukan "4 fitur Actual/MA3/MA4/EMA"; hapus klaim usang), langkah XAMPP, `.env.example` frontend & API, `api/setup/create_admin.php`.
**KP:** ☐ UAT-08 (setup ≤ 15 menit) lulus.

### T-32 UX
State loading/kosong/galat konsisten; validasi form sisi klien; pesan galat spesifik; aksesibilitas dasar (label, fokus, kontras).
**KP:** ☐ tidak ada layar kosong tanpa penjelasan ☐ NFR-USA-01.

### T-33 Bahan Bab III/IV
Ekspor dari aplikasi: tabel fitur & normalisasi, rumus gerbang, tabel metrik latih/uji + baseline, grafik aktual vs prediksi (PNG/CSV).
**KP:** ☐ angka identik dengan `06 §7` pada Replikasi.

---

## Data dinamis (lintas tugas — baca `00 §3b` dan `06 §12`)

### T-40 Jejak data & status model (terkini/usang)
**Berkas:** `api/data/tickets.php` (`GET /data/summary`), migrasi 002/004, `src/services/lstm/dataTrace.js`, `LstmProcess.jsx`, `Dashboard.jsx`
**Langkah:** Implementasi hash kanonik (`03 §5b`) sebagai satu fungsi murni di klien + padanannya di server (uji kesamaan lewat fixture); `GET /data/summary` mengembalikan `n`, `first_week`, `last_week`, `last_updated`, `data_hash`, `gaps`; simpan jejak data + salinan seri di setiap hasil; tampilkan badge **Terkini/Usang** beserta alasan.
**KP:** ☐ TC-DYN-01/04/12 lulus ☐ hash fixture = `assets/reference_data_hash.txt` ☐ riwayat lama tetap terbaca.

### T-41 Prediksi cepat + model aktif (inferensi)
**Berkas:** `forecast.js`, `trainer.js` (muat model dari bobot+scaler), `api/data/predictions.php` (`is_active`, `?active=1`), `Dashboard.jsx`, `Step*.jsx`
**Langkah:** `quickPredict(modelAktif, dataTerbaru, K)` (`06 §12.3`); Dashboard menghitung "Prediksi Minggu Depan" dari model aktif pada data terbaru; label "model dilatih pada {rentang}"; `oor_ratio`; simpan forecast untuk pemantauan galat nyata (`06 §12.6`). Penggantian model aktif **hanya** lewat gerbang `06 §13` (T-45).
**KP:** ☐ TC-DYN-02/06/13 lulus ☐ tidak memicu pelatihan ☐ < 2 detik.

### T-42 Audit "tanpa data statis"
**Langkah:** Cari dan hapus semua asumsi tetap: konstanta min/max, nomor minggu tetap (mis. 55–67), jumlah baris, `slice(` berindeks tetap, `windowSize` tersembunyi, rentang tanggal; pakai `chronologicalSplit` berbasis rasio; blokir sesuai minimal data (`06 §12.1`); uji parametrik n ∈ {40, 67, 120}.
**KP:** ☐ TC-DYN-03/05/08/09 lulus ☐ `grep` bersih di `src/services`, `src/pages`.

### T-43 UX input data mingguan
**Berkas:** `DataInput.jsx`, `api/data/tickets.php`
**Langkah:** Tombol **Tambah minggu berikutnya** (tanggal = terakhir + 7, harga awal = harga terakhir, libur dari kalender); deteksi celah dan tanggal tak selaras; peringatan nilai ekstrem (> 3 SD atau di luar rentang scaler model) dengan konfirmasi; setelah simpan, pelatihan ulang otomatis dipicu (T-44) dan statusnya ditampilkan.
**KP:** ☐ TC-DYN-01/06/07/10/11 lulus.

### T-44 Pelatihan ulang otomatis (pemicu, job, Worker, pemulihan)
**Berkas:** `src/services/lstm/retrainOrchestrator.js`, `trainer.worker.js`, `api/data/training-jobs.php`, migrasi 005, `DataInput.jsx` (pemicu), `App.jsx` (pemulihan saat dibuka)
**Langkah:** (1) Migrasi `training_jobs` (`04 §2.7`) + endpoint `05 §3.3c` dengan klaim atomik (`running_key` UNIQUE), detak 5 dtk, basi 60 dtk. (2) Orkestrator: setelah simpan/impor/ubah/hapus **berhasil** → debounce 3 dtk → `POST /training-jobs` → klaim → jalankan di Worker → kirim progres dan detak; job baru membatalkan yang lama (flag abort). (3) Prasyarat n ≥ 32; kurang → tanpa job. (4) Pemulihan saat aplikasi dibuka: cari job `pending`/basi dan lanjutkan. (5) Kegagalan → `failed`, model aktif tak berubah.
**KP:** ☐ TC-AUTO-01/02/03/04/05/06/15/16/17 lulus ☐ UI tidak membeku selama pelatihan.

### T-45 Champion–challenger (dari nol + lanjutan, gerbang MAE)
**Berkas:** `retrainOrchestrator.js`, `trainer.js`, `metrics.js`, `api/data/predictions.php`
**Langkah:** `trainScratch(seed)`; `trainWarm(modelAktif)` (scaler beku, lr 0,003, ≤ 50 epoch, patience 8; dilewati sesuai `06 §13.2`); `evaluateOnWindow(model, W)` untuk champion (inferensi, bukan MAE tersimpan); pilih pemenang (seri → dari nol); gerbang `MAE_kandidat ≤ MAE_champion`; simpan semua kandidat dengan `job_id/variant/decision`; satu `is_active`; Replikasi tak pernah auto-aktif.
**KP:** ☐ TC-AUTO-07…14 dan TC-AUTO-18 lulus ☐ tidak ada penggantian model aktif tanpa lolos gerbang.

### T-46 UI status, log keputusan, peringatan optimis & galat nyata
**Berkas:** `Dashboard.jsx`, `LstmProcess.jsx`, `Report.jsx`
**Langkah:** Badge status (`06 §13.6`); ringkasan keputusan (MAE kandidat vs champion, varian pemenang); peringatan "seleksi berulang pada data uji cenderung optimis" + tampilkan *galat nyata* (`06 §12.6`); log keputusan di Laporan; tombol **Coba lagi** bila gagal/tertunda; tombol **Latih ulang sekarang** (admin).
**KP:** ☐ TC-AUTO-09 dan UAT-09/10 lulus ☐ tidak ada klaim "akurat" tanpa pembanding.

## Desain & tema (lihat `10-Audit-Desain-Mode-Terang.md`)

### T-47 Perbaikan elemen gelap di mode terang
**Status: SELESAI** — lihat `perbaikan-desain/CHANGELOG-DESAIN.md`.
**Berkas:** `Step2_ModelConfig.jsx:100`, `Step3_Training.jsx:139,194-197`, `index.css` (`.terminal`, `.modal-panel`), `DataInput.jsx:31,111,266`, `Dashboard.jsx:339`, `Report.jsx:339-343`, `StepWizard.jsx:70-73`
**Langkah:** terapkan perbaikan D-01…D-06 persis seperti di audit; buat `.modal-panel`; buat toast ber-`id`; perbaiki cincin sorot StepWizard; hapus klaim "MAPE 2.1%" di Landing dan lencana "Terverifikasi" tanpa fungsi.
**KP:** ☐ tidak ada panel gelap tak sengaja di mode terang (uji render Chromium) ☐ mode gelap tidak berubah ☐ pemeriksa `grep` di CI lulus.

### T-48 Infrastruktur tema
**Status: SELESAI.**
**Berkas:** `index.html`, `src/main.jsx`, `src/App.jsx`, `src/context/ThemeContext.jsx` (baru), semua komponen yang memakai `isDarkMode`
**Langkah:** skrip inline di `<head>` (hindari kilatan, ikuti `prefers-color-scheme` bila belum ada pilihan); `ThemeProvider` + `useTheme()`; hapus `useState(true)` dan `MutationObserver` ganda; peta warna Recharts; `:root{color-scheme:light}` `.dark{color-scheme:dark}`; `lang="id"`, judul "SWA Predict", `theme-color`.
**KP:** ☐ muat ulang di mode terang tanpa kilatan gelap ☐ kontrol native (date, select, scrollbar) mengikuti tema.

### T-49 Kontras & ukuran teks
**Status: SEBAGIAN** — sisa: token `text-muted`/`text-accent`, menaikkan teks ≤ 10 px (58 kemunculan), warna menu aktif.
**Langkah:** token `text-muted`/`text-accent` (`10 §4`); ganti pasangan warna berkontras rendah; naikkan teks ≤ 10 px; menu aktif `bg-blue-600`.
**KP:** ☐ semua teks ≥ 4,5:1 (≥ 3:1 untuk teks besar) pada render mode terang dan gelap.

## Desain editorial (lihat `11-DESIGN.md`; arah: editorial bersih seperti laporan)

> Urutan saran: **T-50 dan T-51 setelah Fase 1 (keamanan)**; T-52…T-55 setelah tugas logika terkait (T-13, T-41, T-23); **T-56 paling akhir**. Setiap tugas: baca `DESIGN.md` hanya bagian yang disebut.

### T-50 Fondasi desain editorial
**Berkas:** `src/index.css`, `tailwind.config.js`, `index.html`, `src/main.jsx`, `package.json`
**Langkah:** `npm i @fontsource-variable/newsreader @fontsource/ibm-plex-sans` dan impor di `main.jsx`; hapus `@import` Google Fonts dan Plus Jakarta Sans; definisikan variabel warna terang/gelap (`DESIGN.md §2`) dan petakan di Tailwind (`paper, surface, ink, muted, rule, brand, positive, caution, negative`; alias lama `background`, `primary` sementara); skala font (§3, minimum 12 px); primitif `.figure`, `.rule`, `.note`, `.table-editorial`, tombol utama/sekunder/tautan, `.modal-panel` (opak, radius 6); atur radius 4/6 dan hapus bayangan global; `prefers-reduced-motion`.
**KP:** ☐ tidak ada impor font eksternal ☐ `lint` dan `build` lulus ☐ `audit-tema --strict` lulus terang dan gelap ☐ semua halaman tetap tampil.

### T-51 Halaman masuk sederhana + `/tentang`
**Berkas:** `src/pages/Landing.jsx` (jadi halaman masuk), `src/pages/auth/Login.jsx`, `src/pages/Features.jsx` (hapus), `src/App.jsx`, `src/pages/About.jsx` (baru)
**Langkah:** ikuti `DESIGN.md §8.1–8.2`: dua kolom, judul serif, tiga fakta, formulir masuk; **tanpa akun demo, maskot, partikel, lencana MAPE, tautan daftar** (OQ-05); `/login` mengarah ke halaman yang sama; `/features` dihapus (arahkan ke `/tentang`); `/tentang` berisi Data, Model, Evaluasi, Batasan, Versi (ambil dari `docs/06`).
**KP:** ☐ satu layar di desktop, bertumpuk di mobile ☐ tidak ada elemen di daftar larangan §9 ☐ teks kaki halaman persis seperti `DESIGN.md §8.1` (sudah dikonfirmasi) ☐ impor `mascot` dihapus dari `Landing.jsx`.

### T-52 Ringkasan (dashboard)
**Berkas:** `src/pages/dashboard/Dashboard.jsx`
**Langkah:** `DESIGN.md §8.3` dan §5 (figure, grafik, tabel, catatan): perkiraan minggu depan dengan rentang dan pembanding; grafik tanpa gradien, label langsung, pembanding putus-putus; tabel Evaluasi model; hapus kartu gradien, legenda chip, dan **seluruh bagian "Heatmap Intensitas Penjualan"** (blok `── Heatmap ──` di `Dashboard.jsx`; sudah diputuskan) beserta state/fungsi yang hanya dipakainya.
**KP:** ☐ tidak ada gradien/kaca ☐ perkiraan selalu bersama pembanding dan tanggal data ☐ audit tema lulus.

### T-53 Data Penjualan & modal
**Berkas:** `DataInput.jsx`
**Langkah:** tabel editorial (§5), modal opak, formulir; tombol sesuai §5; pesan galat inline.
**KP:** ☐ tidak ada pil/ikon berwarna ☐ audit tema lulus.

### T-54 Wizard pelatihan & hasil
**Berkas:** `LstmProcess.jsx`, `lstm/Step*.jsx`, `StepWizard.jsx`
**Langkah:** stepper bernomor bergaris tipis; **hapus visualisasi jaringan animasi dan konsol bergaya terminal** (ganti dengan kurva loss nyata + ringkasan teks); hasil = tabel Model vs Rata-rata vs Naif (MAE/RMSE uji) + catatan peringatan + galat nyata (`docs/06 §7, §12.6, §13.6`).
**KP:** ☐ tidak ada animasi dekoratif ☐ tabel pembanding selalu tampil ☐ audit tema lulus.

### T-55 Laporan & PDF
**Berkas:** `Report.jsx`
**Langkah:** daftar riwayat dan detail mengikuti §5; PDF/A4 memuat metrik uji + pembanding + asumsi (`docs/06 §8`); pertahankan kertas putih bergaya surat.
**KP:** ☐ konsisten dengan komponen baru ☐ audit tema lulus.

### T-56 Sapu bersih & audit akhir
**Langkah:** hapus `AnimatedBackground`, `CustomCursor`, **`src/assets/mascot.png`, `public/mascot.png`, `public/nano_logo.png`** (sudah diputuskan; pastikan `grep -rn "mascot\|nano_logo" src index.html` kosong), kelas `.glass-*`/gradien/animasi di `index.css`; tambahkan ke `cek-tema.sh` pemeriksaan `gradient`, `backdrop-blur`, `rounded-3xl`; jalankan daftar larangan `DESIGN.md §9`; audit tema terang dan gelap; tinjau screenshot.
**KP:** ☐ seluruh daftar §9 tercentang ☐ audit strict lulus ☐ ukuran bundel tidak bertambah.

## Catatan untuk agent

- Bila tugas menyentuh keputusan OQ-xx, pakai default di README §6, beri komentar `// OQ-xx`, dan laporkan.
- Jangan menggabungkan tugas dalam satu commit; jangan mengubah bobot/dataset di `assets/`.
- Setelah tugas selesai, centang KP dan perbarui kolom *Status* kebutuhan di `02-SRS.md` (`FIX/BARU` → `ADA`).
