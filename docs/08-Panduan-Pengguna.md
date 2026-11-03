# Panduan Pengguna — SWA Predict

Untuk staf penjualan dan admin PT Swabina Gatra Travel. Bagian bertanda **(setelah T-xx)** tersedia setelah tugas perbaikan terkait selesai (`09-Backlog-Perbaikan.md`).

## 1. Gambaran singkat

SWA Predict membantu memperkirakan **jumlah tiket terjual minggu depan** dari data penjualan mingguan. Alurnya: **input data → verifikasi → pilih mode → baca hasil → cetak laporan**.

> **Penting:** prediksi hanyalah perkiraan. Pada data kecil (6–10 tiket/minggu), hasil model sering tidak jauh berbeda dari "rata-rata penjualan". Aplikasi akan memperingatkan Anda bila model belum lebih baik dari tebakan rata-rata.

## 2. Masuk dan keluar

1. Buka alamat aplikasi, klik **Masuk**.
2. Isi **username** dan **password**, klik **Masuk**. Gagal 5 kali → tunggu 15 menit. **(setelah T-04)**
3. Keluar lewat tombol **Keluar** di menu. Sesi berakhir otomatis setelah 8 jam. **(setelah T-01)**

## 3. Dashboard

Menampilkan **Total Tiket Terjual**, **Rata-rata Mingguan**, **Prediksi Minggu Depan**, dan grafik **Tren Penjualan Tiket**. Bila belum ada data/prediksi, muncul petunjuk untuk mulai dari menu **Data Penjualan**.

## 3b. Rutinitas mingguan (data bertambah terus)

Data Anda tidak statis: setiap minggu ada data baru. Pola yang disarankan:

1. **Data Penjualan → Tambah minggu berikutnya.** Tanggal terisi otomatis (minggu terakhir + 7 hari). Isi tiket terjual dan harga (harga terakhir sudah disarankan), cek **Libur**, lalu **Simpan**. **(setelah T-43)**
2. **Pelatihan ulang berjalan otomatis** begitu data tersimpan. Anda akan melihat status *Menunggu/Berjalan* dan boleh lanjut bekerja; sebaiknya jangan menutup tab hingga selesai (bila tertutup, pelatihan dilanjutkan saat aplikasi dibuka lagi). **(setelah T-44)**
3. **Baca keputusan:** *Model diganti* (kandidat baru tidak lebih buruk dari model lama) atau *Model lama dipertahankan*. Aplikasi melatih dua kandidat — dari nol dan lanjutan — lalu memilih yang terbaik. **(setelah T-45/T-46)**
4. **Proses LSTM → Prediksi cepat** untuk perkiraan minggu depan memakai model aktif. Pada minggu-minggu berikutnya lihat **galat nyata** — ukuran paling jujur karena memakai data yang belum pernah dilihat model.
5. **Laporan → Cetak PDF** bila perlu.

Catatan: mengubah/menghapus data lama diperbolehkan, tetapi model ditandai **Usang** dan riwayat tidak berubah. Angka di aplikasi akan berbeda dari Excel skripsi seiring data bertambah — itu wajar; kecocokan dengan Excel hanya berlaku untuk dataset referensi.
Catatan penting: pelatihan ulang **tidak menjamin** hasil lebih akurat. Model lama dipertahankan bila kandidat lebih buruk, dan angka uji bisa tampak lebih bagus dari kenyataan karena model dipilih berulang — pantau **galat nyata**.

## 4. Mengelola data penjualan (menu *Data Penjualan*)

**Isi satu data:**
1. Klik **Tambah Data**.
2. Isi **Tanggal mulai minggu**, **Jumlah Tiket Terjual**, **Harga Tiket** (harga biasa dalam ribu Rupiah, bukan rata-rata), dan **Libur** (0/1; otomatis dari kalender, bisa diubah). **(Harga & Libur setelah T-20/T-21)**
3. Klik **Simpan** → konfirmasi.

**Impor dari CSV:**
1. Klik **Unduh Template**; isi kolom `Tanggal;Jumlah;Harga;Libur`.
2. Klik **Import CSV**, pilih berkas, periksa pratinjau, lalu **Impor**. Baris bermasalah ditandai; tidak ada data yang masuk sebagian. **(setelah T-21)**

**Lain-lain:** cari lewat kotak **Cari data**; **ekspor CSV**; hapus satu/banyak data dengan konfirmasi. **Reset Semua Data** hanya untuk admin dan meminta Anda mengetik kata konfirmasi. **(setelah T-05)**

## 5. Menjalankan prediksi (menu *Proses LSTM*)

Alurnya tiga langkah.

### Langkah 1 — Verifikasi Data
Aplikasi memeriksa jumlah data, rentang tanggal, celah minggu, duplikat, dan nilai tidak wajar. Perbaiki bila ada tanda merah. Mode **Latih** butuh minimal 32 minggu (disarankan ≥ 52); **Prediksi cepat** butuh minimal 4 minggu.

### Langkah 2 — Konfigurasi Model
Pilih salah satu mode:

| Mode | Kapan dipakai |
|---|---|
| **Replikasi Excel** | Mencocokkan hasil dengan perhitungan skripsi. **Tidak ada pelatihan**; bobot sudah tetap. |
| **Latih** | Berjalan **otomatis** setiap data disimpan. Admin dapat memicu manual (**Latih ulang sekarang**) dan mengatur *epoch*, *learning rate*, serta jumlah minggu yang diprediksi (1–4). |
| **Prediksi cepat** | Memakai model aktif pada data terbaru **tanpa pelatihan** — cara tercepat untuk rutinitas mingguan. **(setelah T-41)** |

Pilih berapa minggu ke depan yang ingin diramal, lalu klik **Mulai**.

### Langkah 3 — Hasil
- **Grafik aktual vs prediksi** dan tabel per minggu.
- **Metrik** (MAE, RMSE, MAPE) untuk data **latih** dan **uji**, berdampingan dengan **tebakan rata-rata** dan **tebakan naif** (minggu ini = minggu lalu). **(setelah T-13)**
- **Prediksi minggu depan** dan seterusnya, dengan catatan asumsi harga dan libur. **(setelah T-15)**

**Cara membaca metrik:**
- **MAE** = rata-rata selisih dalam jumlah tiket. MAE 0,9 berarti rata-rata meleset sekitar 1 tiket.
- **RMSE** = seperti MAE tetapi lebih menghukum selisih besar.
- **MAPE** = selisih dalam persen. Waspada: untuk angka kecil, MAPE ±11% bisa dicapai hanya dengan menebak rata-rata.
- Model **baik** bila MAE/RMSE data uji **lebih kecil** daripada tebakan rata-rata. Jika muncul peringatan merah, jangan jadikan prediksi sebagai satu-satunya dasar keputusan.

## 6. Laporan (menu *Laporan*)

Menyimpan 10 proses terbaru. Buka **Detail** untuk melihat konfigurasi dan hasil; **Cetak / Simpan PDF** untuk dokumen. Hapus satu riwayat bila perlu; hapus semua hanya untuk admin.

## 7. Profil

Menu **Profil**: ubah **Nama Lengkap** atau **Password Baru** (minimal 8 karakter, ketik ulang untuk konfirmasi). Anda hanya dapat mengubah akun sendiri. **(setelah T-01)**

## 8. Khusus admin

- **Kalender libur:** tambah tanggal merah/cuti bersama dan rentang libur sekolah agar kolom *Libur* terisi otomatis. **(setelah T-22)**
- **Pengguna:** pendaftaran hanya oleh admin. **(setelah T-02)**
- **Setup awal:** ikuti `03-Arsitektur-SDD.md` §8.

## 9. Pemecahan masalah

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| "Server tidak terjangkau" | Apache/MySQL belum menyala | Jalankan XAMPP; cek alamat API |
| Diarahkan ke halaman masuk | Sesi habis | Masuk kembali |
| Impor gagal | Format CSV | Gunakan template terbaru; pisahkan kolom dengan `;` |
| Muncul peringatan "belum melampaui rata-rata" | Data kecil/fluktuatif | Tambah data; gunakan hasil sebagai pembanding, bukan satu-satunya dasar |
| Prediksi di luar 6–10 ditandai | Di luar rentang data latih | Periksa data; tafsirkan hati-hati |
| Prediksi minggu depan bertanda "libur belum diisi" | Kalender kosong | Minta admin mengisi kalender libur |
| Model berstatus **Usang** | Ada data baru atau data lama diubah | Gunakan Prediksi cepat sementara, lalu Latih ulang bila disarankan |
| Status "Gagal/tertunda" | Pelatihan terputus atau terjadi galat | Klik **Coba lagi**; model aktif tetap dipakai sementara |
| Berkali-kali "Model lama dipertahankan" | Data baru belum membuat kandidat lebih baik | Wajar; periksa kualitas data dan galat nyata |
| "Nilai di luar rentang model" | Data baru jauh di atas/bawah data latih | Periksa input; Latih ulang agar model mengenali rentang baru |

## 10. Istilah

- **Minggu:** periode 7 hari Rabu–Selasa, dimulai 1 Januari 2025 (minggu ke-1).
- **Data latih/uji:** data lama dipakai untuk belajar; data terbaru disimpan untuk menguji secara jujur.
- **Baseline:** tebakan sederhana sebagai pembanding.
