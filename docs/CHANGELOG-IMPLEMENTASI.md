# CHANGELOG IMPLEMENTASI — SWA Predict (27 Okt 2026)

Dasar: repo `prediksi-lstm` yang kamu unggah. Perubahan: **24 berkas baru, 13 dihapus, 12 diubah** di `src/` (+ `index.html`, `tailwind.config.js`, `package.json`, `vite.config.js`, `.env.example`, `tools/audit-tema/`). Tidak ada perubahan pada `api/` dan `database.sql` (itu bagian Antigravity).

## Hasil verifikasi
- `npm test`: **20/20 lulus** — termasuk golden test (bobot Excel 7 input cocok dengan Excel ≤ 5e-4 pada 64 baris), hash data = hash referensi, pembagian data, metrik, champion–challenger, pelatihan TF.js deterministik.
- `vite build` lulus · lint **50 → 5** (semua sisa sudah ada sebelumnya).
- Audit tema di browser sungguhan: **22 tampilan mode terang lulus strict** (0 panel gelap tak sengaja, 0 teks < 3:1); kontras mode gelap 0 pelanggaran.

## Berkas baru
- `src/__tests__/fixtures/dataset_67_minggu.json`
- `src/__tests__/fixtures/golden_forward_pass.csv`
- `src/__tests__/fixtures/reference_data_hash.txt`
- `src/__tests__/lstm.test.js`
- `src/context/ThemeContext.jsx`
- `src/context/theme.js`
- `src/hooks/useTickets.js`
- `src/models/holidays.json`
- `src/models/reference_data_hash.txt`
- `src/models/weights_lstm_murni_7input.json`
- `src/pages/public/About.jsx`
- `src/pages/public/Entry.jsx`
- `src/services/lstm/autoRetrain.js`
- `src/services/lstm/champion.js`
- `src/services/lstm/dataTrace.js`
- `src/services/lstm/forecast.js`
- `src/services/lstm/index.js`
- `src/services/lstm/lstmCell.js`
- `src/services/lstm/metrics.js`
- `src/services/lstm/modelStore.js`
- `src/services/lstm/preprocessing.js`
- `src/services/lstm/retrain.js`
- `src/services/lstm/trainer.js`
- `src/utils/format.js`

## Berkas dihapus
- `src/assets/mascot.png`
- `src/components/ui/AnimatedBackground.jsx`
- `src/components/ui/CustomCursor.jsx`
- `src/components/ui/StepWizard.jsx`
- `src/pages/Features.jsx`
- `src/pages/Landing.jsx`
- `src/pages/auth/Login.jsx`
- `src/pages/auth/Register.jsx`
- `src/pages/dashboard/lstm/Step1_DataVerification.jsx`
- `src/pages/dashboard/lstm/Step2_ModelConfig.jsx`
- `src/pages/dashboard/lstm/Step3_Training.jsx`
- `src/services/dummy.js`
- `src/services/lstm.js`
- `public/mascot.png`, `public/nano_logo.png`

## Berkas diubah
- `src/App.jsx`
- `src/components/common/PageLoader.jsx`
- `src/components/common/Skeleton.jsx`
- `src/components/layout/Layout.jsx`
- `src/index.css`
- `src/main.jsx`
- `src/pages/dashboard/Dashboard.jsx`
- `src/pages/dashboard/DataInput.jsx`
- `src/pages/dashboard/LstmProcess.jsx`
- `src/pages/dashboard/Profile.jsx`
- `src/pages/dashboard/Report.jsx`
- `src/services/api.js`
- `index.html` (skrip tema awal, `lang="id"`, judul), `tailwind.config.js` (token), `package.json` (skrip `test`, dependensi font & pengujian), `vite.config.js` (konfigurasi tes)

## Perilaku baru yang perlu diketahui
- **Setiap data disimpan/diimpor/dihapus memicu pelatihan ulang otomatis** (jeda 3 detik; job baru membatalkan yang lama; minimal 32 minggu). Model baru memakai dua kandidat (dari nol dan lanjutan) dan **menggantikan model aktif hanya bila MAE uji tidak lebih buruk pada jendela uji yang sama**.
- **Model aktif sementara disimpan di `localStorage`** (satu peramban) — penanda `TODO(Antigravity)` di `modelStore.js`/`autoRetrain.js`; dipindah ke database oleh Antigravity.
- **Tidak ada lagi data simulasi.** Bila API gagal, halaman menampilkan galat dan tombol coba lagi.
- Tema bawaan tetap **gelap**; ubah `DEFAULT_THEME` di `index.html` dan `src/context/theme.js` (harus sama).
- `libur(t)` kini memakai kalender statis `src/models/holidays.json` (2025–2026). **Perbarui tiap tahun**, atau tunggu T-22 (kalender di database).
- Alamat API lewat `.env` (`VITE_API_URL`); nilai bawaan tetap path XAMPP lama.
