# Audit Desain — Mode Terang vs Mode Gelap (SWA Predict)

**Tanggal audit:** 23 Okt 2026 | **Cakupan:** seluruh halaman publik dan dashboard, 18 tampilan (termasuk modal, wizard 3 langkah, riwayat, preview A4, tooltip) | **Pelaksana:** Claude

## 1. Cara pemeriksaan (agar dapat diulang)

Aplikasi dibangun (`vite build`), dijalankan, lalu dirender di **Chromium headless** dengan `localStorage.theme = 'light'`. Untuk setiap tampilan saya:
1. mengambil **screenshot** dan memeriksanya satu per satu;
2. membaca *computed style* semua elemen terlihat → mencari **panel berlatar gelap** dan menghitung **rasio kontras WCAG** teks terhadap latar efektif (termasuk latar transparan bertumpuk);
3. memetakan temuan ke **berkas dan baris** kode.

**Batasan:** hanya mode terang, desktop 1366×820. API PHP tidak aktif sehingga aplikasi memakai **data simulasi** (lihat §5). Mode gelap tidak dibandingkan penuh; perbaikan di bawah menjaga tampilan gelap tetap sama. Detektor otomatis melewatkan panel gelap yang transparan (Step 2), sehingga hasil akhirnya dikoreksi dengan tinjauan visual.

## 2. Ringkasan

| Hasil | Jumlah |
|---|---|
| Elemen **gelap di mode terang** yang perlu diperbaiki | **6** (D-01…D-06) |
| Elemen gelap yang diterima karena pola umum (tooltip, scrim) | 2 (D-07, D-08) |
| Teks berkontras < 4,5:1 di mode terang (unik) | **613** (27 di bawah 2:1, 389 di bawah 3:1) |
| Teks berukuran ≤ 10 px | 58 kemunculan di 8 berkas |
| Akar masalah arsitektur tema | 6 (A-01…A-06) |
| Halaman tanpa panel gelap | Landing, Fitur, Login, Register, Profil, Laporan (utama), Data Penjualan (tabel), Dashboard (kartu & grafik) |

**Penyebab utama:** kelas seperti `bg-gray-950/50 dark:bg-black/30` **tidak punya versi terang yang benar** — varian terang ikut memakai warna gelap, hanya dibuat transparan. Pada latar putih hasilnya abu keruh dengan label hampir tak terbaca.

## 3. Temuan "gelap di mode terang" (periksa satu per satu)

Tingkat: **T** = Tinggi (merusak keterbacaan), **S** = Sedang, **R** = Rendah.

### D-01 · Panel "Arsitektur Model LSTM" (Prediksi LSTM, langkah 2) — **T**
- **Lokasi:** `src/pages/dashboard/lstm/Step2_ModelConfig.jsx:100`
- **Kode:** `bg-gray-950/50 dark:bg-black/30 … border-white/5`
- **Gejala:** latar abu keruh `#808388`; judul `text-gray-500` kontras **1,27:1**; label *Input/LSTM/Dropout/Output* **1,0–1,5:1**; lingkaran node berisi `td, l1, l2, h1…` **1,05–1,13:1**. Praktis tak terbaca.
- **Perbaikan:**
  ```diff
  - <div className="relative bg-gray-950/50 dark:bg-black/30 rounded-2xl p-6 border border-white/5 overflow-hidden">
  + <div className="relative bg-slate-50 dark:bg-black/30 rounded-2xl p-6 border border-slate-200 dark:border-white/5 overflow-hidden">
  ```
  Label: `text-gray-500` → `text-gray-600 dark:text-gray-400`; teks tiap lapis → `text-blue-700 dark:text-blue-400`, `text-indigo-700 dark:text-indigo-400`, `text-violet-700 dark:text-violet-400`, `text-emerald-700 dark:text-emerald-400`. Lingkaran node: `bg-white dark:bg-transparent`. Lencana "5 Input x 4 Hidden": `text-blue-700 dark:text-primary`.

### D-02 · Visualisasi jaringan saat training (langkah 3) — **T**
- **Lokasi:** `Step3_Training.jsx:139` (panel) dan `:194-197` (label)
- **Kode:** `bg-gray-950/60 dark:bg-black/50`; label `text-blue-500/60`, `text-indigo-500/60`, `text-violet-500/60`, `text-emerald-500/60`
- **Gejala:** latar `#676a71`; label *INPUT / BiLSTM / DENSE / OUTPUT* **1,1–1,55:1**.
- **Perbaikan:** panel sama seperti D-01; label → `text-blue-700/90 dark:text-blue-500/60` dan seterusnya (700 untuk terang). Garis SVG `stroke="#3b82f6"` aman di kedua mode.

### D-03 · Konsol log training `.terminal` — **S**
- **Lokasi:** `src/index.css:137` — `bg-gray-950 dark:bg-black/60 text-green-400 border-green-500/20`; dipakai di Step 3.
- **Gejala:** blok hampir hitam (`#030712`) di tengah halaman terang; juga di mode terang sama persis dengan mode gelap (tidak ikut tema).
- **Keputusan desain:** konsol gelap boleh dipertahankan sebagai *gaya sengaja*, tetapi karena permintaanmu ingin tema konsisten, rekomendasi versi terang:
  ```css
  .terminal { @apply bg-slate-50 dark:bg-black/60 border border-emerald-200 dark:border-green-500/20
              rounded-2xl p-4 font-mono text-xs text-emerald-800 dark:text-green-400 overflow-y-auto; }
  .terminal-prompt { @apply text-emerald-700 dark:text-green-600 select-none shrink-0; }
  ```
  Warna baris log (biru `[044]`, kuning `loss`, abu `epoch`) ikut dibuat berpasangan: `text-blue-700 dark:text-blue-400`, `text-amber-700 dark:text-amber-300`, `text-gray-500 dark:text-gray-500`.

### D-04 · Kartu modal berlatar transparan (3 modal Data Penjualan) — **T**
- **Lokasi:** `DataInput.jsx:31` (hapus), `:111` (tambah/ubah), `:266` (Import CSV) — kartu memakai `.glass-panel`
- **Akar:** `.glass-panel` = `bg-white/80` (`index.css:61`) diletakkan di atas scrim `bg-black/60 backdrop-blur-sm`. Hasil: kartu **abu `#d0d0d0`**, bukan putih. Ikon dropzone hilang, "atau klik untuk memilih file" **1,92:1**, "Preview & Konfirmasi" **1,92:1**.
- **Perbaikan:** kartu modal harus **opak**.
  ```css
  /* index.css */
  .modal-panel { @apply bg-white dark:bg-surface border border-gray-200 dark:border-white/10
                 rounded-[2rem] shadow-2xl; }
  ```
  Ganti `glass-panel` → `modal-panel` pada ketiga modal; scrim → `bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm`.

### D-05 · Chip legenda grafik Dashboard — **S**
- **Lokasi:** `Dashboard.jsx:339`
- **Kode:** aktif = `bg-gray-900 dark:bg-white/10 text-white`
- **Gejala:** tiga chip *Aktual / Prediksi / Proyeksi* hitam pekat (`#111827`) di kartu putih, sedangkan *MA3* (nonaktif) terang → tampilan tidak konsisten dan "berat".
- **Perbaikan:**
  ```diff
  - ? 'bg-gray-900 dark:bg-white/10 text-white dark:text-white border-transparent'
  + ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white border-gray-300 dark:border-transparent shadow-sm'
  - : 'bg-transparent text-gray-400 border-gray-200 dark:border-white/10'
  + : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 opacity-70'
  ```
  Penanda aktif sudah ada pada titik berwarna di dalam chip.

### D-06 · Preview dokumen A4 (Laporan) — **S**
- **Lokasi:** `Report.jsx:339-343`
- **Kode:** scrim `style={{ background: 'rgba(0,0,0,0.85)' }}` dan bilah alat `bg-gray-950 text-white`
- **Gejala:** bingkai viewer hitam di mode terang. **Kertas A4 harus tetap putih** (untuk cetak) — itu benar.
- **Perbaikan:**
  ```diff
  - className="fixed inset-0 z-[300] flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}
  + className="fixed inset-0 z-[300] flex flex-col bg-slate-700/80 dark:bg-black/85 backdrop-blur-sm"
  - bg-gray-950 border-b border-white/10 …
  + bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-white/10 …
  ```
  Teks bilah `text-white` → `text-gray-900 dark:text-white`. Header tabel di dalam kertas (`#0f172a`) boleh tetap.

### D-07 · Tooltip gelap — **diterima**
`Step2_ModelConfig.jsx:28`, `Dashboard.jsx:476` (`bg-gray-900 text-white`). Pola tooltip gelap lazim di kedua tema; kontras bagus. Tooltip grafik (Recharts) sudah terang di mode terang — **OK**.

### D-08 · Scrim sidebar mobile — **diterima**
`Layout.jsx:66` `bg-black/70`. Saran opsional `bg-slate-900/50`.

### Elemen kecil lain
- **Cincin sorot StepWizard salah ukuran** (`StepWizard.jsx:70-73`): `absolute inset-0 … border-2` menempel pada seluruh sel langkah sehingga tampak oval lebar di belakang stepper, bukan lingkaran di sekitar ikon. Pindahkan ke dalam pembungkus ikon `w-9 h-9`. — **R**
- **Toast ganda** "Menggunakan data simulasi" tampil dua kali dan menutupi tombol tema/profil di pojok kanan atas. Tambahkan `id` pada `toast()` agar tidak ganda. — **R**

## 4. Teks berkontras rendah di mode terang (bukan gelap, tapi sulit dibaca)

Pasangan paling sering (di atas putih; rasio dihitung, jumlah dari pengukuran awal dan bersifat perkiraan):

| Kelas saat ini | Rasio | Jumlah | Pengganti mode terang | Rasio baru |
|---|---|---|---|---|
| `text-gray-400` (`#9ca3af`) | 2,54 | ±279 | `text-gray-500 dark:text-gray-400` | 4,83 |
| `text-primary` (`#3b82f6`) teks kecil | 3,68 | ±182 | `text-blue-700 dark:text-primary` | 6,70 |
| `text-cyan-500` | 2,43 | 20 | `text-cyan-700 dark:text-cyan-400` | 5,36 |
| `text-amber-500` | 2,15 | 10+ | `text-amber-700 dark:text-amber-400` | 5,02 |
| `text-teal-500` | 2,49 | 10+ | `text-teal-700 dark:text-teal-400` | 5,47 |
| `text-emerald-500` | 2,54 | — | `text-emerald-700 dark:text-emerald-400` | 5,48 |
| `text-red-500` | 3,76 | — | `text-red-600 dark:text-red-400` | 4,83 |
| `text-violet-500` | 4,23 | 16 | `text-violet-700 dark:text-violet-400` | 7,10 |
| teks putih di `bg-primary` (menu aktif) | 3,68 | — | latar `bg-blue-600` | 5,17 |

**Terparah:** tabel gerbang Step 3 (`text-[9px] text-amber-500/80` **1,85:1**, `text-teal-500/80` **2,09:1**); angka MAPE `text-amber-500` di Laporan **1,9:1**.

**Ukuran teks:** 58 kemunculan `text-[7–10px]` (Step 3: 15, Dashboard: 9, Report: 8, Step 2: 7). Naikkan minimal ke `text-[11px]` untuk label dan `text-xs` (12 px) untuk angka/isi.

**Cara sistematis:** buat token di `index.css` lalu pakai di seluruh komponen:
```css
:root  { --text-muted: 75 85 99;  --text-accent: 29 78 216; }   /* gray-600, blue-700 */
.dark  { --text-muted: 156 163 175; --text-accent: 96 165 250; } /* gray-400, blue-400 */
```
`tailwind.config.js` → `colors: { muted: 'rgb(var(--text-muted) / <alpha-value>)', accent: 'rgb(var(--text-accent) / <alpha-value>)' }`, lalu `text-muted` dan `text-accent`.

## 5. Akar masalah arsitektur tema

| ID | Masalah | Bukti | Perbaikan |
|---|---|---|---|
| A-01 | Tema bawaan **gelap** dan baru diterapkan di `useEffect` setelah `PageLoader`; tidak ada skrip awal → kilatan tema salah | `App.jsx:72-78` | Skrip inline di `index.html` (`<head>`): baca `localStorage.theme`, set `class="dark"` sebelum render; bawaan ikuti `prefers-color-scheme` |
| A-02 | Status tema **duplikat** di ±7 komponen (`useState(true)` + `MutationObserver`) → nilai awal `true` (gelap) lalu dikoreksi | Dashboard, LstmProcess, Report, Landing, Features, Layout, Login | Satu `ThemeProvider` + hook `useTheme()` dan peta warna Recharts (`chartColors.light/dark`) |
| A-03 | Pola `bg-X dark:bg-Y` tanpa pasangan terang yang benar | D-01, D-02, D-03, D-05 | Aturan tinjauan: setiap `dark:bg-*` wajib punya `bg-*` terang yang berbeda; tambahkan skrip pemeriksa (§7) |
| A-04 | Warna hardcode di JSX | Dashboard 19 baris, Step 3: 26, Step 2: 7 (Report 61, sebagian untuk kertas cetak = sah) | Pindahkan ke token/peta warna tema |
| A-05 | `color-scheme` tidak dideklarasikan; kontrol bawaan (`input[type=date]`, `select`, scrollbar) tetap `normal` | 12 kontrol terukur `color-scheme: normal` | `:root{color-scheme:light}` dan `.dark{color-scheme:dark}` di `index.css` |
| A-06 | Metadata: `<html lang="en">`, `<title>prediksi-lstm</title>`, tanpa `theme-color` | `index.html:2,7` | `lang="id"`, judul "SWA Predict", `<meta name="theme-color">` terang/gelap |

## 6. Konten antarmuka yang menyesatkan (terlihat saat audit)

| Lokasi | Masalah | Tugas |
|---|---|---|
| Landing hero | Lencana **"MAPE 2.1%"** dan kata "Akurasi tinggi" ditulis mati | Hapus/ganti angka dinamis atau teks netral (T-47) |
| Step 2 | Teks "`lstm_murni_5input.xlsx`", "5 variabel", lencana "5 Input x 4 Hidden" — padahal model 7 input | T-11, T-47 |
| Step 3 | Label "**BiLSTM**"; loss **naik** 137→155 lalu "Training complete! Model saved." (pelatihan palsu) | T-12, T-14 |
| Dashboard/Data/LSTM/Laporan | Data simulasi (49.876 tiket, 200–274 baris, MAPE 5,24%) tampil seperti data nyata; kartu "Data Sehat — Kualitas sangat baik" untuk data dummy | T-17 |
| Modal Import | Contoh `Tanggal, Jumlah, Harga` (koma) vs template `;` | T-21 |
| Login | Kotak "Akun Demo" menampilkan `password123` | T-02 |
| Profil | Lencana "Terverifikasi" dan ikon kamera tanpa fungsi | T-47 |
| Form Data | Label "Harga Tiket (MA3)" padahal harga mentah (OQ-09) | T-21 |

## 7. Daftar periksa per tampilan (satu per satu)

| # | Tampilan | Gelap di terang? | Kontras teks | Catatan |
|---|---|---|---|---|
| 1 | Landing | tidak | 9 butir rendah | Hero terang baik; ganti klaim MAPE |
| 2 | Fitur | tidak | 1 | Dipindai otomatis |
| 3 | Login (+fokus) | tidak | 3 | Kartu terang baik; hapus kotak akun demo |
| 4 | Register | tidak | 1 | Dipindai otomatis |
| 5 | Dashboard | **D-05** | ±49 | Kartu & grafik terang; tooltip grafik terang baik |
| 6 | Data Penjualan | tidak | ±46 | Tabel terang baik |
| 7 | Modal Tambah/Ubah | **D-04** | — | Kartu abu transparan |
| 8 | Modal Import CSV | **D-04** | 51 | Ikon dropzone hilang |
| 9 | LSTM langkah 1 | tidak | 19 | Toast ganda; "Data Sehat" pada data simulasi |
| 10 | LSTM riwayat | tidak | 23 | Dipindai otomatis |
| 11 | LSTM langkah 2 | **D-01** | 40 | Panel arsitektur abu keruh |
| 12 | LSTM langkah 3 | **D-02, D-03** | ±917 butir | Terbanyak: tabel gerbang 9 px & log |
| 13 | Laporan | tidak | ±32 | MAPE amber 1,9:1 |
| 14 | Detail laporan | tidak | ±32 | Sama |
| 15 | Preview A4 | **D-06** | — | Kertas putih benar |
| 16 | Profil | tidak | 13 | Terang baik |
| 17 | Sidebar & header | tidak | — | Menu aktif putih di biru 3,68:1 |
| 18 | Tooltip & toast | diterima | — | Terang di mode terang |

**Pemeriksa otomatis untuk CI (kandidat T-47):** gagalkan build bila ada `bg-(gray|slate)-(800|900|950)` atau `bg-black` tanpa pasangan `dark:` pada baris yang sama, kecuali ditandai `/* tema:sengaja */`; lalu uji render Chromium untuk mode terang & gelap dengan ambang kontras 4,5:1.
```bash
grep -rnE "(^|[^:\w-])bg-(gray|slate|zinc)-(800|900|950)|bg-black" src --include=*.jsx | grep -v "dark:" | grep -v "tema:sengaja"
```

## 8. Rencana perbaikan (urut)

1. **A-01, A-05, A-06** — skrip tema awal, `color-scheme`, metadata (S).
2. **D-04** — `.modal-panel` dan ganti tiga modal (S).
3. **D-01, D-02, D-03, D-05, D-06** — ganti kelas sesuai §3 (M).
4. **A-02** — `ThemeProvider` + `useTheme()`, buang `MutationObserver` ganda (M).
5. **§4** — token `text-muted`/`text-accent`, ganti pasangan warna, naikkan ukuran teks ≤ 10 px (L).
6. **§6** — selaraskan konten dengan kenyataan model (bagian dari T-11/12/17/21/02).
7. Verifikasi ulang: render ulang mode terang **dan** gelap; tidak ada panel gelap tak sengaja; seluruh teks ≥ 4,5:1 (≥ 3:1 untuk teks besar).

**Kriteria penerimaan:** ☐ tidak ada panel `lum < 0,12` di mode terang selain yang ditandai `tema:sengaja` ☐ modal berkartu opak ☐ tidak ada kilatan tema saat muat ulang ☐ rasio kontras teks ≥ 4,5:1 ☐ mode gelap tidak berubah secara visual.

## 9. Status penerapan (kode)

**Sudah diterapkan** pada repo dan diverifikasi ulang dengan render nyata — lihat `perbaikan-desain/CHANGELOG-DESAIN.md`, `perbaikan-desain/PATCH.diff`, dan `prediksi-lstm-patched.zip`.

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Panel gelap tak sengaja di mode terang (deteksi otomatis) | 7 | 0 |
| Teks kontras < 4,5:1 (unik) | 613 | 20 |
| Teks kontras < 3:1 | 389 | 0 |
| Kilatan tema saat muat ulang | ada | hilang |
| Lint | 50 | 43 |

D-01…D-06, A-01, A-02, A-05, A-06 dan §4 telah diterapkan; D-07/D-08 sengaja dipertahankan. **Belum:** konten model/data di §6 (T-11, T-12, T-14, T-17, T-02) dan warna menu aktif (3,68:1, karena mengubah mode gelap juga). Pemeriksa otomatis: `perbaikan-desain/tools/audit-tema/`.

