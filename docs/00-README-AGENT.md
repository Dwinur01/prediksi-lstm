# SWA Predict — Paket Dokumen Fondasi (untuk Agent AI / Antigravity)

**Sistem:** Sistem Prediksi Penjualan Tiket Mingguan dengan LSTM — PT Swabina Gatra Travel
**Repo:** `github.com/Dwinur01/prediksi-lstm` (React + Vite + TensorFlow.js, backend PHP, MySQL)
**Keputusan:** repo yang ada **diperbaiki**, bukan dibangun ulang.
**Versi dokumen:** 1.0 — 20 Okt 2026 — Bahasa Indonesia

## 1. Urutan baca (wajib)

| # | File | Isi | Dipakai agent untuk |
|---|---|---|---|
| 1 | `00-README-AGENT.md` | Aturan kerja, asumsi, pertanyaan terbuka | Selalu dibaca pertama |
| 2 | `09-Backlog-Perbaikan.md` | Daftar tugas T-xx + kriteria penerimaan | **Sumber pekerjaan harian** |
| 3 | `06-Spesifikasi-Model-LSTM.md` | Rumus, protokol latih/uji, golden test | Mengerjakan semua tugas model |
| 4 | `02-SRS.md` | Kebutuhan fungsional & non-fungsional (FR/NFR) | Menurunkan fitur & validasi |
| 5 | `03-Arsitektur-SDD.md`, `04-Database.md`, `05-API-Spec.md` | Desain teknis | Menulis kode & migrasi |
| 6 | `01-PRD.md` | Tujuan, persona, metrik sukses | Konteks produk |
| 7 | `07-Test-Plan-UAT.md`, `08-Panduan-Pengguna.md` | Pengujian & manual | Verifikasi & dokumentasi |
| 8 | `10-Audit-Desain-Mode-Terang.md` | Temuan desain tema terang/gelap + perbaikan | Mengerjakan T-47…T-49 |
| 0 | `12-STATUS-IMPLEMENTASI.md` | **Status terkini: apa yang sudah dikerjakan dan apa yang tersisa untuk database/PHP** | Baca setelah README ini |
| 9 | `11-DESIGN.md` (salinan di `DESIGN.md` akar repo) | Arah visual editorial: token, tipografi, komponen, larangan | Mengerjakan T-50…T-56 dan setiap perubahan UI |

Aset di `assets/`: `weights_lstm_murni_7input.json` (bobot terverifikasi), `dataset_67_minggu.json` (data + libur), `golden_forward_pass.csv` (64 baris acuan uji), `build_assets.py` (implementasi acuan Python), `reference_data_hash.txt` (hash kanonik dataset referensi).

## 2. Kondisi sistem saat ini (as-is) — ringkas

- **Frontend:** React 18, Vite, Tailwind 3, React Router 7, axios, TF.js 4.22, recharts, jsPDF, papaparse, framer-motion. Bahasa JavaScript (bukan TS).
- **Rute:** `/`, `/features`, `/login`, `/register`, `/dashboard`, `/dashboard/data-input`, `/dashboard/lstm-process`, `/dashboard/report`, `/dashboard/profile`.
- **Backend:** PHP + PDO di `api/` (`auth/login|register`, `data/tickets|predictions`, `user/profile`). MySQL, dengan **fallback otomatis ke SQLite** bila MySQL gagal.
- **Model:** dua mode di `src/services/lstm.js` — *Excel* (bobot statis 5 input, usang) dan *Kustom* (Bidirectional LSTM 16 unit via TF.js).
- **Sesi:** token + user disimpan di `localStorage`; token tidak diverifikasi server.

## 3. Temuan audit yang mendasari backlog

1. Bobot di `lstm.js` (5 input) **bukan** model Excel 7 input; MAPE-nya 32,8%.
2. "Pelatihan" mode Excel adalah animasi palsu (loss acak).
3. Model Excel 7 input **tidak lebih baik dari tebakan rata-rata** (MAPE uji 11,49% vs 10,80%); prediksi nyaris konstan karena state sel tidak di-reset.
4. Tidak ada autentikasi nyata di API; `profile.php` dapat mengubah akun mana pun.
5. Evaluasi tanpa data uji di mode kustom; konstanta normalisasi di-hardcode.
6. Data dummy dipakai diam-diam saat API gagal; template CSV tidak sesuai dataset.

## 3b. Prinsip data dinamis (wajib)

Data penjualan **bertambah dan berubah** lewat input pengguna (satu data, impor CSV, edit, hapus). Sistem **tidak boleh** mengasumsikan dataset tetap.

- **Tidak ada angka tetap di kode logika:** jumlah minggu, rentang tanggal, min/max normalisasi, indeks pembagian data, dan baseline selalu dihitung dari data di database saat dijalankan. Dataset 67 minggu (`assets/`) hanya **fixture uji** dan seed demo opsional.
- **Pembagian data berbasis rasio** (default 65/15/20 kronologis), bukan nomor minggu tetap (`06 §6`).
- **Scaler dan bobot milik model.** Tiap pelatihan menghitung ulang min/max dari data latih dan menyimpannya bersama bobot; inferensi memakai scaler model itu.
- **Model ↔ data:** setiap hasil menyimpan *jejak data* (jumlah baris, minggu pertama/terakhir, `data_hash`, salinan seri). Bila data berubah, model ditandai **usang** — tidak dihapus.
- **Pelatihan ulang otomatis (keputusan pengguna):** setiap data baru/ubahan yang disimpan memicu pelatihan ulang bobot **langsung** (debounce 3 dtk). Dua kandidat dilatih — *dari nol* dan *lanjutan* — lalu bersaing dengan model aktif pada **jendela uji yang sama**; model baru menggantikan hanya bila **MAE uji tidak lebih buruk**. *Prediksi cepat* tetap tersedia memakai model aktif. Lihat `06 §13`.
- **Uji dinamis wajib** (`07 §2.6`, TC-DYN): menambah/mengubah/menghapus data tidak boleh menuntut perubahan kode.

## 3c. Keputusan pengguna yang sudah final

1. Data penjualan **dinamis** (diinput terus), bukan statis.
2. Bobot **dilatih ulang otomatis** setiap ada data terbaru, **langsung setelah data disimpan**.
3. Model baru **menggantikan** model aktif **hanya bila MAE uji tidak lebih buruk** daripada model lama.
4. Pelatihan ulang **dari nol dan lanjutan**, keduanya dilatih lalu dibandingkan.
5. Format dokumen: `.md` ringkas dan terstruktur untuk agent AI; repo yang ada diperbaiki (React + PHP/MySQL).

> Catatan jujur: pelatihan ulang tidak menjamin akurasi naik. Gerbang MAE mencegah kemunduran pada jendela uji, tetapi seleksi berulang pada data uji membuat nilai uji cenderung optimis. Karena itu *galat nyata* pada minggu baru (`06 §12.6`) wajib ditampilkan.

## 4. Aturan kerja agent

1. **Kerjakan satu tugas T-xx per iterasi**, urut prioritas P0 → P3. Satu tugas = satu commit/PR kecil dengan pesan `T-xx: ringkasan`.
2. **Jangan mengubah angka hasil skripsi** (bobot, dataset, metrik) tanpa instruksi eksplisit. Perubahan model harus lolos *golden test* dulu (`06`, bagian 9).
3. **Jangan menebak.** Jika sebuah keputusan ada di daftar Pertanyaan Terbuka (bagian 6), pakai opsi default yang tertulis, tandai kode dengan komentar `// OQ-xx`, dan laporkan ke pengguna.
4. **Tidak ada rahasia di repo:** kredensial, secret token, dan URL berasal dari `.env` (lihat `.env.example` di T-03).
5. **Jangan hapus fitur yang berfungsi** (CRUD data, impor/ekspor CSV, riwayat, cetak PDF) kecuali dinyatakan di backlog.
6. **Semua teks UI dalam Bahasa Indonesia.** Kode, nama variabel, dan komentar boleh Inggris.
7. Setelah setiap tugas: jalankan `npm run lint`, `npm run build`, dan tes terkait (`07`). Laporkan hasilnya.
8. Setiap perubahan skema DB harus lewat file migrasi bernomor di `api/migrations/` (lihat `04`).
9. Jujur pada metrik: laporkan metrik **data uji** beserta **baseline**; jangan memberi label "akurat" tanpa pembanding.
10. **Dilarang hardcode data:** tidak ada konstanta min/max, nomor minggu, atau jumlah baris di kode logika. Gunakan data database + scaler model; fixture hanya di `assets/` dan `src/__tests__/`.
11. **Pelatihan ulang otomatis wajib mengikuti `06 §13`** (champion–challenger, jendela uji yang sama, gerbang MAE). Dilarang mengganti model aktif tanpa lolos gerbang.

## 5. Perintah dasar

```bash
npm install
npm run dev        # frontend (Vite), default http://localhost:5173
npm run build
npm run lint
# Backend: salin repo ke htdocs XAMPP, aktifkan Apache + MySQL, impor database.sql
# API default: http://localhost/prediksi-lstm/api   (set lewat VITE_API_URL, lihat T-24)
```

## 6. Asumsi & pertanyaan terbuka (agent memakai default sampai dijawab)

| ID | Pertanyaan | Default yang dipakai | Dampak |
|---|---|---|---|
| OQ-01 | Bentuk input LSTM: **1 timestep × 7 fitur** (seperti Excel) atau **sequence 4 timestep**? Bila state di-reset per sampel, *forget gate* tidak berfungsi (c(t−1)=0). | 1 timestep × 7 fitur, state di-reset per sampel | Inti metodologi skripsi — **konsultasikan ke dosen pembimbing** |
| OQ-02 | Dari mana bobot Excel dihasilkan (skrip Python/Excel)? Perlu skrip latih sumber agar bisa dilatih ulang identik. | Bobot dipakai apa adanya (`assets/`) | Reproduksibilitas |
| OQ-03 | Pembagian data: rasio kronologis (bukan nomor minggu tetap) karena data bertambah. Berapa rasio, dan validasi untuk *early stopping* diambil dari mana? | **65% latih / 15% validasi / 20% uji** dari sampel (uji ≥ 8, validasi ≥ 4 minggu); validasi = bagian tengah-akhir data latih | Validitas uji |
| OQ-04 | `libur(t)` diisi manual atau diturunkan otomatis dari kalender (aturan ≥4 hari libur sekolah)? | Otomatis dari tabel kalender, bisa ditimpa manual | Fitur & forecast masa depan |
| OQ-05 | Peran pengguna: satu peran, atau `admin` + `staf`? Pendaftaran publik dibuka? | `admin` + `staf`; pendaftaran hanya oleh admin | Keamanan |
| OQ-06 | Deployment: lokal (XAMPP) untuk sidang atau hosting? SQLite fallback dipertahankan? | Lokal XAMPP; SQLite fallback hanya untuk demo | Konfigurasi |
| OQ-07 | Peran dataset 67 minggu (1 Jan 2025–14 Apr 2026): seed demo/fixture uji, atau data produksi? | **Seed demo opsional + fixture uji**; data produksi berasal dari input pengguna (dinamis) | Seed & uji |
| OQ-08 | Definisi "berhasil": model harus lebih baik dari baseline rata-rata, atau cukup MAPE ≤ 20%? | Harus ≤ baseline rata-rata pada MAE & RMSE uji; bila tidak, dilaporkan apa adanya | Kriteria penerimaan |
| OQ-09 | Kolom `ticket_price` berisi harga mentah atau MA3? (Label UI: "Harga Tiket (MA3)") | Harga **mentah**; MA3 dihitung aplikasi | Fitur model |
| OQ-10 | Kunci data: `UNIQUE(week, year)` atau `week_start_date`? "Minggu" di Excel Rabu–Selasa, bukan minggu ISO. | `week_start_date` unik; `week`/`year` diturunkan | Skema DB |
| OQ-11 | Kapan dan bagaimana model dilatih ulang? **DIJAWAB pengguna** | Otomatis langsung setelah data disimpan; champion–challenger (diganti hanya bila MAE uji tidak lebih buruk); varian dari-nol **dan** lanjutan, dibandingkan | `06 §13` |
| OQ-12 | Boleh mengubah/menghapus data lama setelah model dilatih? | Boleh; model ditandai **usang** (hash data berbeda), riwayat tetap utuh | Integritas riwayat |
| OQ-13 | Edit/hapus data lama (bukan hanya data baru) juga memicu pelatihan ulang? | Ya (hash data berubah) | Frekuensi job |
| OQ-14 | Pelatihan di browser pengguna atau di server? | **Browser (Web Worker)**; tab ditutup → job dilanjutkan saat aplikasi dibuka lagi | Arsitektur `03 §5c` |
| OQ-15 | Gerbang promosi hanya MAE uji dengan toleransi ε = 0? RMSE ikut jadi syarat? | Hanya **MAE uji** (sesuai keputusan pengguna); RMSE & baseline dilaporkan | Aturan promosi |

## 7. Definition of Done (per tugas)

- [ ] Kriteria penerimaan tugas di `09` terpenuhi dan dicentang.
- [ ] `npm run lint` dan `npm run build` lulus; tes otomatis terkait lulus.
- [ ] Tidak ada rahasia/kredensial baru di repo.
- [ ] Dokumen terkait (SRS/API/DB) diperbarui bila perilaku berubah.
- [ ] Ringkasan perubahan + hasil uji dilaporkan ke pengguna.
