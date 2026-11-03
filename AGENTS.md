# AGENTS.md — SWA Predict (aturan tetap; ringkas agar hemat token)

Proyek: React + Vite (`src/`), PHP + MySQL (`api/`). Dokumen lengkap ada di `docs/`.
**Jangan membaca semua dokumen.** Baca hanya bagian yang disebut di prompt.

## Aturan kerja
1. **Satu tugas T-xx per percakapan.** Sumber tugas: `docs/09-Backlog-Perbaikan.md` (hanya bagian T-xx yang diminta).
2. **Jangan menebak.** Keputusan OQ-xx ada di `docs/00-README-AGENT.md` §6: pakai default, beri komentar `// OQ-xx`, laporkan.
3. Jangan ubah `docs/assets/` (bobot, dataset, golden test). Jangan hardcode min/max normalisasi, nomor minggu, atau jumlah baris (`docs/06` §12).
4. Tidak ada rahasia di repo; konfigurasi dari `.env`.
5. Teks UI Bahasa Indonesia; kode dan komentar boleh Inggris.
6. UI mengikuti `DESIGN.md` (editorial bersih; baca hanya bagian yang relevan; **§9 daftar larangan wajib**). Tema: `useTheme()` dari `src/context/theme.js`; setiap `dark:bg-*` wajib punya `bg-*` terang yang berbeda.
7. **Hemat token:** jangan buka `node_modules`, `dist`, lockfile; jangan cetak berkas besar (baca per rentang baris); jangan ulang install/build tanpa alasan; jangan menjelajahi seluruh repo.
8. Perubahan di luar berkas yang disebut tugas → tanya dulu.
9. Tidak ada perintah destruktif (`DROP`, `TRUNCATE`, `rm -rf`, `git reset --hard`) tanpa persetujuan saya.

## Selesai tugas
Jalankan `npm run lint`, `npm run build`, dan `npm test` (20 tes harus tetap lulus). Laporkan **maks 8 baris**: berkas diubah · kriteria penerimaan (KP) lulus/gagal · hal yang butuh keputusan saya. **Berhenti**; jangan lanjut ke tugas lain.
