# Prompt Antigravity — hanya yang berhubungan dengan database/PHP (XAMPP)

Frontend dan mesin model **sudah selesai** (lihat `docs/12-STATUS-IMPLEMENTASI.md`). Di Antigravity tinggal sisi server/database agar langsung dibuat di XAMPP.

## Persiapan sekali
1. Ekstrak `prediksi-lstm-siap-antigravity.zip` → `git init && git add -A && git commit -m "baseline"` → `npm install`.
2. Salin folder ke `htdocs` XAMPP bila perlu; nyalakan Apache + MySQL; impor `database.sql`.
3. Buka folder di Antigravity. `AGENTS.md` di akar dibaca agen (bila tidak, tempel lewat *Customizations → Rules*). Review policy: minta persetujuan; terminal: minta persetujuan.
4. **Satu tugas = satu percakapan baru. Planning untuk tugas besar, Fast untuk kecil.**

## Kerangka prompt
```
Kerjakan HANYA T-xx (bagian server/database). Baca docs/12-STATUS-IMPLEMENTASI.md §3 baris T-xx dan <rujukan docs> saja.
Beri rencana singkat (maks 10 baris) dan tunggu persetujuan saya. Setelah disetujui: kerjakan, jalankan uji (curl/MySQL), lalu laporan sesuai AGENTS.md.
Jangan mengubah frontend kecuali bagian yang bertanda TODO(Antigravity) untuk tugas ini.
```

## Urutan (centang satu per satu)
| # | Tugas | Mode | Rujukan (baca ini saja) |
|---|---|---|---|
| 1 | T-03 `.env`, CORS, bersihkan repo | Planning | 12 §3 · 09 T-03 · 03 §6 |
| 2 | T-20 migrasi 001 & 002 + `tickets.php` | Planning | 12 §3 · 04 §3 · 09 T-20 |
| 3 | T-01 token + otorisasi | Planning (model kuat) | 05 §3.1–3.2 · 09 T-01 |
| 4 | T-02 admin via skrip, hapus akun bawaan | Fast | 09 T-02 |
| 5 | T-04 login seragam + batas percobaan | Fast | 09 T-04 |
| 6 | T-05 amankan operasi destruktif | Fast | 09 T-05 |
| 7 | T-40 server: migrasi 004 + `/data/summary` | Planning | 03 §5b · 05 §3.3b · 04 §2.5 |
| 8 | Model aktif ke DB (ganti `modelStore.js`) | Planning | 05 §3.5 · 04 §2.5 · 06 §13 |
| 9 | T-44 server: `training_jobs` + sambung `autoRetrain.js` | Planning (model kuat) | 04 §2.7 · 05 §3.3c · 09 T-44 |
| 10 | T-22 kalender libur di DB | Planning | 04 §2.3–2.4 · 05 §3.4 |
| 11 | T-23 server: `user_id` pada riwayat | Fast | 05 §3.5 |
| 12 | T-30/T-31 skrip uji API + README XAMPP | Planning | 07 · 09 T-30/T-31 |

## Prompt contoh langkah 1 (T-03)
```
Kerjakan HANYA T-03 (bagian server/database). Baca docs/12-STATUS-IMPLEMENTASI.md §3 baris T-03, docs/09-Backlog-Perbaikan.md bagian "T-03", dan docs/03-Arsitektur-SDD.md §6 saja.
Beri rencana singkat (maks 10 baris) dan tunggu persetujuan saya. Setelah disetujui: kerjakan, uji dengan curl, laporan sesuai AGENTS.md.
```

## Tugas UI kecil (opsional, tanpa DB; Fast)
T-43 (tambah minggu berikutnya), T-46 (log keputusan di Laporan), T-55 (isi PDF), T-21 UI (template CSV). Rujukan: `docs/12` §2 dan `DESIGN.md`.

## Bila kuota/konteks habis
`Lanjutkan T-xx. Lihat git diff --stat; baca hanya bagian T-xx; kerjakan sisanya.`
