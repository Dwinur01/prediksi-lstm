# audit-tema — pemeriksa tema terang/gelap SWA Predict

Merender aplikasi di browser sungguhan dan melaporkan **panel gelap tak sengaja** (mode terang) serta **kontras teks** (WCAG 4,5:1 / 3:1), lalu menyimpan screenshot tiap tampilan.

```bash
npm run build && npx vite preview --port 4173            # terminal 1
node tools/audit-tema/audit-tema.mjs --theme light --strict   # terminal 2 (bawaan: --url http://127.0.0.1:4173)
node tools/audit-tema/audit-tema.mjs --theme dark --only dashboard,entry --out hasil-gelap
```
- **Tanpa XAMPP:** bawaan `--mock` memakai API tiruan dari `src/__tests__/fixtures/dataset_67_minggu.json` (matikan dengan `--no-mock` untuk API sungguhan).
- Browser: `CHROME_PATH=...` (Chrome yang ada), atau paket `@sparticuz/chromium` (sudah di devDependencies), atau `puppeteer`.
- Skenario: `entry, tentang, dashboard, data-input, lstm, report, profile`. Dashboard dan `lstm` ikut melatih model di browser (±1 menit).
- `--strict` (mode terang): exit code 1 bila ada panel gelap tak sengaja atau teks < 3:1. Pengecualian disengaja: scrim modal, isi warna merek (`btn-primary`), header tabel di kertas A4 (`ALLOW` di skrip).
- `cek-tema.sh`: pemeriksa cepat tanpa browser (latar gelap tanpa pasangan `dark:`).
