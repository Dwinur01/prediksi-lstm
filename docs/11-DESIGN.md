# DESIGN.md — SWA Predict (arah visual: editorial bersih seperti laporan)

> Baca hanya bagian yang disebut prompt. Dokumen ini adalah **aturan**, bukan saran: bila bertentangan dengan kebiasaan bawaan agen, ikuti dokumen ini.

## 1. Prinsip (5 kalimat)
1. Situs ini adalah **laporan yang hidup**: angka, tabel, dan grafik adalah tokoh utama; dekorasi tidak ada.
2. **Kejujuran terlihat**: setiap perkiraan tampil bersama pembanding, rentang, dan tanggal data.
3. **Tipografi membawa hierarki**, bukan warna, kartu, atau bayangan.
4. **Satu warna merek** (biru logo SWA) dipakai hemat; sisanya tinta, kertas, dan garis tipis.
5. Bahasa **biasa dan spesifik**; tidak ada klaim tanpa angka.

Pengguna: staf PT Swabina Gatra (kerja harian), dosen penguji (menilai metode), pembaca portofolio (menilai kualitas).

## 2. Token warna (CSS variables → Tailwind)
| Token | Terang | Gelap ("tinta") | Pakai untuk |
|---|---|---|---|
| `paper` (latar halaman) | `#FBFAF7` | `#0F1218` | latar |
| `surface` | `#FFFFFF` | `#151922` | input, tabel, modal |
| `ink` | `#161A22` | `#ECEAE4` | teks utama |
| `muted` | `#585E6C` | `#A0A6B4` | teks sekunder, label |
| `rule` | `#D9D6CE` | `#2A303C` | garis 1 px |
| `brand` | `#1848A8` | `#8DAEF5` | tautan, tombol utama, seri **Prediksi** |
| `positive` | `#1F6B4A` | `#6FCB9F` | status baik |
| `caution` | `#8A5A00` | `#E0B04C` | peringatan |
| `negative` | `#A3321F` | `#F08A78` | galat |

Kontras terverifikasi: semua teks ≥ 5,68:1 di atas `paper` dan `surface` (terang dan gelap); putih di atas `brand` terang 8,3:1.
**Seri grafik:** Aktual = `ink`; Prediksi = `brand`; Pembanding (rata-rata/naif) = `muted` putus-putus; rentang ketidakpastian = `brand` 12%.
**Dilarang:** warna di luar tabel ini, gradien, ungu, cyan, `bg-primary` bawaan Tailwind.
Penerapan: `--paper/--surface/--ink/--muted/--rule/--brand/...` sebagai `R G B` di `:root` dan `.dark`; `tailwind.config.js` memetakan `paper, surface, ink, muted, rule, brand, positive, caution, negative` ke `rgb(var(--x) / <alpha-value>)`. Alias lama `background`→`paper`, `primary`→`brand` sementara selama migrasi.

## 3. Tipografi
- **Judul / angka besar:** Newsreader (variabel), bobot 500–600. **Isi / UI:** IBM Plex Sans 400/500/600. **Tidak ada font ketiga** (kode/hash boleh `ui-monospace`).
- **Hosting sendiri** (offline saat sidang): `npm i @fontsource-variable/newsreader @fontsource/ibm-plex-sans`, impor di `main.jsx`. **Hapus** `@import` Google Fonts dan Plus Jakarta Sans.
- Skala: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px. **Minimum 12 px** (tidak ada `text-[9px]`/`[10px]`). Isi 16 px, tabel 14 px.
- Angka: `font-variant-numeric: tabular-nums lining-nums`; rata kanan di tabel. Label kecil: 12 px, 600, huruf kapital ber-spasi 0,06em, `muted`.
- Baris isi maks 68 karakter; `line-height` 1,55 (isi) / 1,15 (judul besar).

## 4. Tata letak & bentuk
- Lebar konten maks **1120 px**, rata kiri, margin 24 px (mobile 16). Kelipatan jarak 4/8/16/24/40.
- **Garis, bukan kartu:** pemisah = garis 1 px `rule`; blok berlabel tanpa bayangan. Panel hanya bila perlu (input, modal, tabel).
- Radius: **4 px** (input/tombol), **6 px** (panel/modal). Tidak ada `rounded-2xl/3xl/[2rem]`.
- Bayangan: **tidak ada**, kecuali modal (`0 8px 24px rgb(0 0 0 / .10)`). Fokus: cincin 2 px `brand`, offset 2.
- Navigasi: sidebar teks saja; aktif = `ink` tebal + garis kiri 2 px `brand` (tanpa pil berwarna, tanpa titik berkedip). Mobile: bilah atas + menu.

## 5. Komponen
- **Angka utama ("figure")**: label kecil → angka serif 36–48 px → keterangan `muted` ("rata-rata 7,8 · data hingga 14 Apr 2026"). Tanpa ikon, tanpa gradien, tanpa kotak warna.
- **Grafik**: garis 1,5 px, tanpa isi gradien, tanpa legenda berbentuk chip → **label langsung di ujung garis**; sumbu `muted` 12 px; satu anotasi (mis. "Libur Idul Fitri"); pita rentang untuk prediksi; pembanding putus-putus. Tooltip: panel `surface` 1 px `rule`.
- **Tabel**: kop 12 px kapital, garis horizontal tipis, **tanpa zebra**, angka rata kanan, baris hover `ink` 3%, kolom status berupa teks + warna (bukan pil).
- **Formulir**: label di atas (14 px, 600), input `surface` 1 px `rule`, tinggi 40 px; galat = teks `negative` di bawah input.
- **Tombol**: utama = isi `brand`, teks putih (terang) / ink (gelap); sekunder = garis 1 px; tersier = tautan bergaris bawah. Tanpa bayangan, tanpa angkat saat hover.
- **Catatan (banner)**: garis kiri 3 px berwarna semantik + teks; tanpa ikon emoji. Dipakai untuk status model, peringatan baseline, data simulasi.
- **Modal**: **opak** `surface`, 1 px `rule`, radius 6, scrim `ink` 40%. Tanpa blur kaca.
- **Stepper (wizard)**: angka berurutan + garis tipis; langkah aktif = `ink` tebal + garis bawah `brand`. Tanpa cincin berdenyut.
- **Ikon**: lucide 16–18 px, stroke 1,5, **hanya fungsional** (tombol, sortir). Tidak ada ikon di judul, di kartu angka, atau di "kotak ikon berwarna".

## 6. Gerak
Hanya transisi opasitas/geser ≤ 150 ms. **Dilarang:** pegas, angkat saat hover, kilau, gradien animasi, partikel, kursor kustom. Hormati `prefers-reduced-motion`.

## 7. Bahasa (pengganti kata)
| Hindari | Pakai |
|---|---|
| Neural Engine, Next-Gen, AI-powered | Perkiraan penjualan |
| Training | Pelatihan model |
| Akurasi tinggi, 2.1% | (hapus; tampilkan angka uji + pembanding) |
| Hasil sama persis | (hapus kecuali golden test lulus) |
| Dashboard | Ringkasan |
| Sukses! 🎉 / emoji | Tersimpan. / Selesai. |
Aturan: kalimat aktif pendek; angka selalu dengan satuan dan tanggal data; tidak ada tanda seru.

## 8. Halaman
**8.1 Halaman masuk (menggantikan Landing).** Satu layar, dua kolom (mobile: bertumpuk).
- Kiri: wordmark "SWA Predict" (serif) + logo kecil → judul serif **"Perkiraan penjualan tiket mingguan"** → 2–3 kalimat tentang apa yang dilakukan sistem → tiga fakta bergaris pemisah: *Data* (mingguan, sejak 2025), *Model* (LSTM, 7 variabel), *Evaluasi* (diuji dan dibandingkan dengan tebakan sederhana) → tautan **"Metode dan batasan"**.
- Kanan: formulir masuk (username, password, tombol **Masuk**). **Tanpa akun demo, tanpa tautan daftar** (OQ-05: akun dibuat admin).
- Kaki: "PT Swabina Gatra · Divisi Perencanaan & Pengembangan Bisnis" dan "Disusun sebagai bagian skripsi Informatika, Universitas Muhammadiyah Gresik" *(teks final, sudah dikonfirmasi)*.
- **Dihapus (sudah diputuskan):** hero besar, **maskot** (`src/assets/mascot.png`, `public/mascot.png`), **`public/nano_logo.png`**, kartu fitur, lencana "MAPE …", latar partikel.

**8.2 `/tentang` — Metode dan batasan (publik, opsional OQ-D1 default: ada).** Bagian bernomor ala laporan: 1 Data · 2 Model (fitur, normalisasi, arsitektur) · 3 Evaluasi (uji, pembanding, galat nyata) · 4 Batasan (data kecil, MAPE menyesatkan untuk angka kecil) · 5 Versi. Untuk dosen penguji dan portofolio; isi diambil dari `docs/06`.

**8.3 Ringkasan (dashboard).** Urutan atas→bawah: judul + tanggal data + status model (catatan) → **perkiraan minggu depan** (figure + rentang + pembanding) → grafik lebar penuh → dua kolom: *Evaluasi model* (tabel Model/Rata-rata/Naif × MAE/RMSE uji) dan *Catatan* → 5 data terbaru. Tanpa kartu gradien. **Peta panas "Heatmap Intensitas Penjualan" dihapus** (sudah diputuskan).

**8.4 Data, Pelatihan, Laporan.** Ikut komponen §5. Hasil pelatihan **selalu** menampilkan tabel model-vs-pembanding dan galat nyata (`docs/06` §7, §12.6). Laporan A4 tetap putih bergaya surat resmi (sudah sesuai).

## 9. Daftar larangan (centang sebelum menyatakan selesai)
☐ gradien · ☐ panel kaca/blur · ☐ bayangan dekoratif · ☐ ungu/cyan · ☐ emoji · ☐ ikon dalam kotak berwarna · ☐ `rounded-2xl` ke atas · ☐ hover mengangkat kartu · ☐ latar animasi/partikel/kursor kustom · ☐ maskot · ☐ hero tengah + tiga kartu fitur · ☐ teks < 12 px · ☐ lebih dari 2 font · ☐ klaim tanpa angka · ☐ legenda chip · ☐ dua `dark:bg-*` tanpa pasangan terang.

## 10. Pemeriksaan
`npm run lint && npm run build`, lalu `node tools/audit-tema/audit-tema.mjs --theme light --strict` dan `--theme dark`; tinjau screenshot. Kontras ≥ 4,5:1 (teks), tidak ada panel gelap di mode terang.
