# Spesifikasi Model — LSTM Murni 7 Input (SWA Predict)

Dokumen ini **otoritatif** untuk semua tugas model (T-10…T-16). Sumber angka: Excel `lstm_murni_7input` milik pengguna; seluruh bobot, fitur, dan 64 baris keluaran sudah direplikasi ulang dengan selisih maksimum 5×10⁻⁵ (`assets/build_assets.py`).

## 1. Masalah & data

Memprediksi `td(t)` (tiket terjual minggu t) dari riwayat. **Data dinamis:** data berasal dari database dan terus bertambah/berubah lewat input pengguna; tidak ada jumlah minggu atau rentang tetap (lihat §12). Dataset referensi `assets/dataset_67_minggu.json` — 67 minggu (Rabu–Selasa), mulai 1 Jan 2025, `tickets_sold` 6–10, `ticket_price` 810–950 (ribu Rp), kolom `libur`, hash di `assets/reference_data_hash.txt` — **hanya fixture uji/seed demo**.

## 2. Fitur (7 input) dan normalisasi

| x | Fitur | Definisi | Normalisasi min-max |
|---|---|---|---|
| x₁ | td(t−1) | penjualan 1 minggu lalu | (v−6)/(10−6) |
| x₂ | td(t−2) | 2 minggu lalu | idem |
| x₃ | td(t−3) | 3 minggu lalu | idem |
| x₄ | td(t−4) | 4 minggu lalu | idem |
| x₅ | harga(t−1) | **MA3** harga mentah: rata-rata harga minggu t−3…t−1 (minggu awal memakai jendela parsial) | (v−810)/(950−810) |
| x₆ | Δharga(t−1) | harga(t−1) − harga(t−2) dari harga **mentah**; minggu 1 = 0 | (v−(−85))/(65−(−85)) |
| x₇ | libur(t) | 0/1 dari kalender minggu t (diketahui sebelumnya, tidak bocor) | — |

Target: `y = td(t)` dinormalisasi dengan rentang td yang sama; ŷ(qty) = ŷ(norm)×(max−min)+min.

**Aturan min/max:** dihitung **ulang pada setiap pelatihan** dari data latih dan disimpan sebagai *scaler model*; inferensi memakai scaler model itu, bukan min/max data terbaru. Rentang referensi skripsi (td 6–10, harga 810–950, Δharga −85…65) hanya berlaku pada fixture. Nilai di luar rentang saat inferensi **tidak** dipotong; hitung `oor_ratio` dan beri peringatan (§12.2).

## 3. Pembentukan sampel

- Sampel untuk minggu t membutuhkan td(t−4) → **minggu pertama yang sah adalah Minggu 5**.
- Excel memuat Minggu 4 dengan x₄ = 0,5 (nilai imputasi, tidak ada Minggu 0). Baris ini **hanya** dipakai di mode Replikasi agar identik dengan Excel; mode Latih dimulai Minggu 5.

## 4. Arsitektur & persamaan

1 lapis LSTM, **4 hidden unit**, 1 keluaran linear. Untuk tiap langkah dengan `z = [x₁…x₇, h(t−1)₁…₄, 1]` (12 elemen; kolom bias terakhir):

```
f = σ(W_f · z)         forget gate        W_f, W_i, W_c, W_o : 4×12
i = σ(W_i · z)         input gate
g = tanh(W_c · z)      candidate (c̃)
o = σ(W_o · z)         output gate
c(t) = f ⊙ c(t−1) + i ⊙ g
h(t) = o ⊙ tanh(c(t))
ŷ_norm = W_y · h(t) + b_y        W_y : 4, b_y : skalar
```

Bobot terverifikasi: `assets/weights_lstm_murni_7input.json` (urutan kolom tiap baris gerbang: x₁…x₇, h₁…h₄, bias).

## 5. Penanganan state — **perbedaan penting**

| Mode | State h, c | Keterangan |
|---|---|---|
| **Replikasi Excel** | **Dibawa** antarbaris (mulai nol di Minggu 4; **tidak** direset) | Wajib agar cocok dengan Excel; konsekuensinya c₄ melorot dari −0,26 ke ≈ −4,0 sehingga prediksi nyaris konstan (±8,2) |
| **Latih** (default) | **Direset ke nol** untuk setiap sampel | Menghindari saturasi dan kebergantungan antarsampel; berlaku OQ-01 |

> **OQ-01:** dengan 1 timestep dan state nol, `c(t−1)=0` sehingga forget gate tidak memengaruhi keluaran. Ini mengurangi LSTM menjadi jaringan bergerbang berlapis tunggal. Alternatif yang lebih "LSTM sejati": sequence 4 timestep, tiap langkah berisi `[td(t−k), harga(t−k), Δharga(t−k)]` + `libur(t)`. Keputusan **harus dikonfirmasi dosen pembimbing**; implementasi memakai default di atas dan menandai `// OQ-01`.

## 6. Protokol Mode Latih

| Item | Default | Catatan |
|---|---|---|
| Split kronologis (berbasis **rasio**) | N = n − 4 sampel (mulai minggu ke-5 data). Uji = max(8, round(0,20·N)); validasi = max(4, round(0,15·N)); latih = N − validasi − uji (≥ 16). Urut waktu: latih → validasi → uji | OQ-03; **tidak diacak**; minimal data **32 minggu** |
| Inisialisasi | Glorot uniform; bias forget gate = 1 | Mengurangi saturasi |
| Loss | MSE pada nilai ternormalisasi | Bukan pada qty |
| Optimizer | Adam, lr 0,01 | Dapat diatur 0,001–0,1 |
| Regularisasi | L2 = 0,001; tanpa Dropout/Bidirectional | Sesuai catatan bobot skripsi |
| Epoch maks / batch | 200 / 8 | Pengacakan sampel di dalam data latih boleh |
| Early stopping | patience 15 pada loss validasi, pulihkan bobot terbaik | Data uji tak boleh dipakai |
| Seed | tetap, tercatat di `config_json` | NFR-REP-01 |
| Metrik loss | tampilkan loss latih & validasi **nyata** per epoch | Dilarang nilai acak/animasi (T-12) |

Contoh pada fixture (n = 67 → N = 63): latih 41 (M5–45), validasi 9 (M46–54), uji 13 (M55–67). Pada data lain, angka dihitung ulang oleh rumus di atas — **bukan** nomor minggu tetap.

## 7. Evaluasi

Rumus pada nilai qty **tanpa pembulatan**, n = jumlah sampel:

- MAE = (1/n)·Σ|y−ŷ| · MSE = (1/n)·Σ(y−ŷ)² · RMSE = √MSE
- MAPE = (100/n′)·Σ|y−ŷ|/y, hanya y ≠ 0 dan n′ = jumlah y ≠ 0
- Korelasi Pearson ŷ–y

**Wajib dilaporkan untuk latih dan uji**, berdampingan dengan baseline:
- *Naif:* ŷ = td(t−1)
- *Rata-rata:* ŷ = rata-rata td data latih

**Peringatan otomatis (merah):** bila MAE **atau** RMSE uji model > baseline rata-rata → tampilkan "Model belum melampaui tebakan rata-rata." Label "Akurat" dilarang kecuali model mengalahkan kedua baseline.

Catatan interpretasi: karena y hanya bilangan bulat 6–10, MAPE ≈ 11% dapat dicapai tebakan konstan; **MAE/RMSE lebih informatif** dan menjadi ukuran utama.

### Angka acuan pada fixture (pembagian skripsi: latih M4–54, uji M55–67) — hanya untuk golden test, bukan target data produksi

| Model | MAE uji | RMSE uji | MAPE uji | Korelasi uji |
|---|---|---|---|---|
| Excel 7 input (Replikasi) | 0,8607 | 1,0683 | 11,49% | 0,151 |
| Baseline rata-rata (7,7647) | 0,8597 | 1,0641 | 10,80% | — |
| Baseline naif | 0,9231 | 1,1767 | 11,65% | — |
| Excel — data latih (M4–54) | 0,9375 | 1,1273 | 12,85% | — |

Aplikasi harus menghitung ulang baseline dari split yang aktif. Pada fixture dengan split rasio default (latih M5–45, validasi M46–54, uji M55–67; rata-rata latih 7,7317), baseline rata-rata uji: MAE 0,8724, RMSE 1,0719, MAPE 10,92%. Metrik Replikasi pada uji M55–67 tetap sama dengan tabel di atas. *Angka-angka ini khusus fixture; data produksi akan berbeda.*

## 8. Peramalan multi-langkah

Untuk langkah k = 1…K (K ≤ 4), minggu target t = T+k (T = minggu terakhir data):

1. x₁…x₄ = td(t−1…t−4): diambil dari **data aktual**, dan dari ŷ(qty) langkah sebelumnya bila t−j > T (rekursif).
2. x₅, x₆ memakai harga hingga t−1. Untuk k = 1 semuanya data aktual. Untuk k ≥ 2 harga belum diketahui → **asumsi: harga terakhir dibawa maju** (Δ = 0); tampilkan asumsi ini di UI/PDF.
3. x₇ = libur(t) dari kalender; bila kalender kosong → tampilkan peringatan dan pakai 0.
4. Mode Replikasi melanjutkan state (h, c) dari baris terakhir (konsisten dengan §5); mode Latih memakai state nol.
5. Hasil dalam qty tanpa dipotong ke [6,10]; tandai bila di luar rentang latih. Jangan dibulatkan di perhitungan; pembulatan hanya untuk tampilan.

## 9. Golden test (wajib lulus sebelum model dianggap benar)

Golden test berjalan sebagai **unit test pada fixture** (`assets/`), bukan terhadap data database.

**Berkas:** `assets/golden_forward_pass.csv` (64 baris: x₁…x₇, f, i, g, c, o, h, ŷ_norm, ŷ_qty, aktual). **Toleransi:** |selisih| ≤ 5×10⁻⁴ pada ŷ_qty dan semua nilai gerbang/state.

Contoh pegangan (Mode Replikasi, mulai h=c=0):

| | Minggu 4 | Minggu 5 |
|---|---|---|
| x | 0,5; 0,25; 0; 0,5; 0,4048; 0,6333; 1 | 0,25; 0,5; 0,25; 0; 0,4286; 0,4333; 1 |
| f | 0,3963; 0,5850; 0,4791; 0,8708 | 0,3805; 0,5865; 0,5249; 0,8347 |
| i | 0,4588; 0,3308; 0,4137; 0,6534 | 0,3930; 0,2957; 0,3853; 0,6572 |
| g (c̃) | 0,0500; 0,0254; −0,5021; −0,3980 | 0,0486; 0,0973; −0,5041; −0,4348 |
| c | 0,0229; 0,0084; −0,2077; −0,2600 | 0,0278; 0,0337; −0,3033; −0,5028 |
| o | 0,4623; 0,5106; 0,2997; 0,6997 | 0,4287; 0,5037; 0,3507; 0,7464 |
| h | 0,0106; 0,0043; −0,0614; −0,1780 | 0,0119; 0,0170; −0,1032; −0,3466 |
| ŷ_norm → ŷ_qty | 0,2203 → 6,8812 | 0,3004 → 7,2016 |

Uji tambahan: ringkasan Excel — MAE 0,9219, MSE 1,2446, RMSE 1,1156, MAPE 12,5746% (64 baris gabungan).

## 10. Acuan implementasi `lstmCell.js` (fungsi murni)

```js
const sigmoid = z => 1 / (1 + Math.exp(-z));

// W = {forget, input, candidate, output}: 4×12 ; Wy: 4 ; by: number
export function lstmStep(x /*7*/, hPrev /*4*/, cPrev /*4*/, W, Wy, by) {
  const z = [...x, ...hPrev, 1];
  const dot = (row) => row.reduce((s, w, k) => s + w * z[k], 0);
  const f = W.forget.map(r => sigmoid(dot(r)));
  const i = W.input.map(r => sigmoid(dot(r)));
  const g = W.candidate.map(r => Math.tanh(dot(r)));
  const o = W.output.map(r => sigmoid(dot(r)));
  const c = cPrev.map((cp, k) => f[k] * cp + i[k] * g[k]);
  const h = c.map((ck, k) => o[k] * Math.tanh(ck));
  const yNorm = h.reduce((s, hk, k) => s + Wy[k] * hk, by);
  return { f, i, g, o, c, h, yNorm };
}
```

## 11. Larangan

- Dilarang menampilkan animasi/loss acak, atau pesan "hasil sama persis" tanpa lulus golden test.
- Dilarang memakai Bidirectional/Dropout di model "LSTM murni".
- Dilarang menghitung metrik dari prediksi yang sudah dibulatkan, atau melaporkan hanya MAPE gabungan latih+uji.
- Dilarang men-hardcode min/max normalisasi di kode logika (hanya di berkas bobot/konfigurasi).
- Dilarang mengasumsikan dataset tetap: tidak ada min/max, nomor minggu, atau jumlah baris tertanam di kode logika (§12).
- Dilarang memakai data uji untuk *early stopping*, pemilihan hiperparameter, atau penentuan min/max.

## 12. Data dinamis — aturan model

### 12.1 Pembagian & minimal data
Pembagian dihitung dari n saat itu (§6). Latih ≥ 32 minggu; Prediksi cepat ≥ 4 minggu. Antarmuka menampilkan jumlah dan rentang tiap bagian sebelum pelatihan.

### 12.2 Scaler & nilai di luar rentang
Scaler milik model (§2). Untuk data baru, `oor_ratio` = persentase nilai fitur (x₁…x₆) di luar [min,max] scaler model. Tampilkan peringatan bila `oor_ratio` > 10% atau ŷ(qty) di luar rentang td latih; sarankan **Latih ulang**. Jangan memotong nilai.

### 12.3 Prediksi cepat (tanpa pelatihan)
`quickPredict(modelAktif, dataTerbaru, K)` memuat bobot + scaler + konfigurasi model aktif lalu menjalankan §8 pada data terbaru. Model *Latih* memakai state nol per sampel. Model *Replikasi* membawa state dari **baris pertama data saat itu** — hasil Replikasi bergantung pada titik awal data, sehingga bukan jalur utama untuk data yang bertambah. Label hasil: "model dilatih pada {data_first_week}–{data_last_week}".

### 12.4 Jejak data & status model
Hash kanonik: SHA-256 atas baris `week_start_date|tickets_sold|ticket_price|libur` terurut, dipisah `\n` (`03 §5b`). Status: **terkini** (hash sama), **usang** (hash berbeda). Alasan usang dihitung dari selisih: jumlah minggu baru di akhir data, atau perubahan pada baris lama. Hash fixture: `assets/reference_data_hash.txt`.

### 12.5 Saran latih ulang *(digantikan §13)*
Digantikan oleh pelatihan ulang otomatis (§13). Saran manual hanya muncul bila pelatihan **gagal** atau **tertunda** (OQ-11).

### 12.6 Galat nyata (pemantauan)
Forecast yang tersimpan dibandingkan dengan aktual begitu data minggu itu diinput; tampilkan MAE galat nyata berjalan di Dashboard/Laporan. Ini bukti terhadap data baru yang tidak dilihat model.

### 12.7 Celah & kualitas data
Celah minggu memblokir Replikasi/Latih (FR-DYN-09). Perubahan data lama diperbolehkan; model ditandai usang. Nilai ekstrem meminta konfirmasi saat input (FR-DYN-08).

### 12.8 Reproduksibilitas
Hasil menyimpan `seed`, scaler, `data_hash`, dan salinan seri sehingga dapat diulang walau data di database berubah. Klaim "cocok dengan Excel" hanya bila `data_hash` = hash fixture.

## 13. Pelatihan ulang otomatis (champion–challenger)

**Keputusan pengguna:** setiap data baru disimpan → bobot dilatih ulang **langsung**; kandidat dilatih **dari nol dan lanjutan** lalu dibandingkan; model baru **menggantikan hanya bila MAE uji tidak lebih buruk**.

### 13.1 Pemicu & antrean
- Pemicu: simpan, impor (satu job setelah impor selesai), ubah, hapus data (OQ-13), atau tombol *Latih ulang sekarang* (admin).
- Debounce 3 detik sejak simpan terakhir. Job baru saat ada job berjalan → batalkan yang lama dan pakai `data_hash` terbaru.
- Satu job `running` global (`training_jobs`; detak 5 dtk; basi 60 dtk → boleh diambil alih).
- Prasyarat n ≥ 32. Bila kurang: tanpa job; UI "Data belum cukup (n/32)"; forecast sementara = baseline rata-rata berlabel.
- Pelatihan di Web Worker; UI tetap responsif; progres per varian dan epoch.

### 13.2 Langkah satu job
1. Ambil data → `data_hash` → bagi data (§6) → tetapkan **jendela uji W**.
2. **Kandidat A — dari nol:** Glorot (seed tetap), scaler baru dari data latih, hiperparameter §6.
3. **Kandidat B — lanjutan:** muat bobot model aktif; **scaler model aktif dibekukan** (bobot lama hanya bermakna pada skalanya); lr 0,003; epoch maks 50; patience 8; early stopping pada validasi. Dilewati bila: tak ada model aktif, arsitektur berbeda, atau `oor_ratio` > 10% (alasan dicatat).
4. **Champion:** model aktif dievaluasi ulang pada **W yang sama** lewat inferensi (bobot + scaler miliknya; state sesuai modenya). Jangan memakai MAE lama yang tersimpan.
5. **Pemenang kandidat:** MAE uji terkecil antara A dan B (seri → A).
6. **Gerbang:** promosi bila `MAE_uji(kandidat) ≤ MAE_uji(champion)` pada W (toleransi ε = 0, OQ-15). Tanpa champion → kandidat langsung aktif (peringatan baseline §7 tetap berlaku).
7. Simpan semua kandidat (A, B) ke riwayat dengan `job_id`, `variant`, `decision` (`diaktifkan` | `ditahan` | `tanpa_champion`) dan MAE champion pada W. Hanya satu `is_active`.
8. Replikasi Excel **tidak pernah** menjadi champion otomatis; ia hanya model referensi.

### 13.3 Mengapa "jendela uji yang sama" adil
Uji = max(8, round(0,20·N)); N naik 1 per minggu baru dan ukuran uji naik paling banyak 1, sehingga **awal jendela uji tidak pernah mundur**. W selalu berada setelah data latih dan validasi model lama, jadi model lama tidak pernah "melihat" W. Properti ini sudah diverifikasi numerik untuk N = 28…400 (tanpa pelanggaran) dan wajib diuji otomatis (TC-AUTO-18).

### 13.4 Peringatan ilmiah (tampilkan di UI/laporan)
- Pelatihan ulang **tidak menjamin** akurasi naik; gerbang hanya mencegah kemunduran pada W.
- Memilih model berulang dengan MAE uji yang sama membuat nilai uji cenderung **optimis**. Ukuran jujur: *galat nyata* (§12.6) pada minggu baru yang belum pernah dilihat model mana pun.
- Data kecil (±13 sampel uji): MAE berfluktuasi; selisih kecil bukan bukti.
- Bila MAE/RMSE model aktif > baseline rata-rata, peringatan merah (§7) tetap tampil.

### 13.5 Anggaran waktu & reproduksibilitas
Job lengkap (A + B + evaluasi) ≤ 60 dtk untuk n = 67. Seed tetap → A identik pada `data_hash` yang sama (≤ 10⁻⁶); B deterministik (pengacakan batch memakai seed).

### 13.6 Status di UI
`Data belum cukup` · `Menunggu` · `Berjalan (varian, epoch)` · `Model diganti` · `Model lama dipertahankan` · `Gagal / tertunda` (dengan tombol coba lagi).
