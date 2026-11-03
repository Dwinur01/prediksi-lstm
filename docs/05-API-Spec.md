# Spesifikasi API — SWA Predict

**Base URL:** `{VITE_API_URL}` (default `http://localhost/prediksi-lstm/api`) | **Format:** JSON UTF-8 | **Auth:** `Authorization: Bearer <token>`

## 1. Konvensi

- Seluruh endpoint selain `POST /auth/login` mewajibkan token valid → tanpa/invalid: **401**.
- Peran tidak cukup → **403**. Validasi gagal → **422**. Tidak ada → **404**. Metode salah → **405**. Galat server → **500** (pesan aman).
- Kompatibilitas: bentuk lama `{status, message, data}` **dipertahankan** agar frontend tidak rusak.

## 2. Format respons

```json
// sukses
{ "status": "success", "message": "…", "data": { } }
// galat
{ "status": "error", "message": "Ringkasan", "errors": { "tickets_sold": "Harus bilangan bulat ≥ 0" } }
```

## 3. Endpoint

### 3.1 Autentikasi
| Metode & path | Auth | Fungsi | Status saat ini → target |
|---|---|---|---|
| `POST /auth/login` | publik | Masuk | Ada → seragamkan galat (T-04), terbitkan JWT (T-01) |
| `POST /auth/register` | admin | Daftarkan pengguna | Ada, publik → admin saja (T-02) |
| `GET /auth/me` | pengguna | Profil dari token | **Baru** (T-01) |

`POST /auth/login`
```json
// request
{ "username": "string", "password": "string" }
// 200
{ "status":"success","token":"<jwt>","expires_in":28800,
  "user":{"id":1,"name":"…","username":"…","role":"admin"} }
// 401 (seragam, tanpa membedakan username/password)
{ "status":"error","message":"Username atau password salah." }
// 429 setelah 5 gagal/15 menit
{ "status":"error","message":"Terlalu banyak percobaan. Coba lagi nanti." }
```
Payload JWT: `{ "sub": 1, "role": "admin", "iat": …, "exp": … }`, ditandatangani HS256 dengan `JWT_SECRET`.

### 3.2 Pengguna
| Metode & path | Auth | Fungsi |
|---|---|---|
| `PUT /user/profile` | pengguna | Ubah `name` dan/atau `password` **milik sendiri** (id dari token). Saat ini `POST` + `id` di body → **berbahaya** (T-01) |

Request: `{ "name": "string", "password": "min 8 karakter (opsional)" }`

### 3.3 Data penjualan — `/data/tickets`
| Metode | Parameter | Auth | Respons |
|---|---|---|---|
| `GET` | `?from=&to=` opsional | pengguna | `data`: array baris urut `week_start_date` |
| `POST` | tunggal: `{week_start_date, tickets_sold, ticket_price, libur?}` | pengguna | Simpan/ubah (upsert pada `week_start_date`) |
| `POST` | `{ "batch": [ … ] }` | pengguna | Impor transaksional; 422 memuat daftar baris gagal |
| `POST` | `{ "delete_batch": ["id", …] }` | pengguna | Hapus banyak |
| `DELETE` | `?id=…` | pengguna | Hapus satu |
| `DELETE` | `?all=true` | **admin** | Hapus semua (transaksi `DELETE`, **bukan** `TRUNCATE`) — T-05 |

Objek baris:
```json
{ "id":"tiket-20260420-001","week_start_date":"2025-01-01","week":1,"year":2025,
  "tickets_sold":6,"ticket_price":850,"libur":1 }
```
Aturan validasi: `week_start_date` tanggal valid; `tickets_sold` integer ≥ 0; `ticket_price` angka > 0; `libur` ∈ {0,1}; tanggal unik. Kompatibilitas lama: `sale_date` diterima sebagai alias `week_start_date` selama masa transisi.

### 3.3b Ringkasan data — `GET /data/summary` *(baru, T-40)*
Pengguna terautentikasi. Respons:
```json
{ "status":"success","data":{ "n":67,"first_week":"2025-01-01","last_week":"2026-04-08",
  "last_updated":"2026-10-21T08:30:00Z",
  "data_hash":"<sha256 kanonik, lihat 03 §5b>",
  "gaps":[ {"after":"2025-06-04","missing_weeks":1} ],
  "active_model": {"id":12,"is_current":false,"reason":"3 minggu baru sejak pelatihan"},
  "retrain": {"job_id":31,"status":"running","phase":"warm","progress":62,
              "last_decision":"ditahan","last_reason":"MAE uji kandidat 0,91 > champion 0,86"} } }
```
`is_current=false` → model usang. Dipakai UI untuk badge status model dan status pelatihan ulang.

### 3.3c Job pelatihan ulang — `/data/training-jobs` *(baru, T-44)*
| Metode | Isi | Auth | Keterangan |
|---|---|---|---|
| `POST` | `{trigger_type, target_data_hash}` | pengguna | Buat job `pending`. Hash sama dengan job aktif → kembalikan job itu. Ada job `running` dengan hash lain → tandai `cancelled`, buat job baru |
| `POST ?claim=1` | `{id}` | pengguna | Klaim atomik `pending→running` (set `running_key=1`); **409** bila job lain masih berdetak |
| `PUT ?id=` | `{status?, phase?, progress?, error_message?, result_decision?, result_history_id?}` | pemegang klaim | Detak tiap 5 dtk; job tanpa detak > 60 dtk dapat diklaim ulang |
| `GET ?status=pending,running` | — | pengguna | Untuk UI dan pemulihan saat aplikasi dibuka |
| `DELETE ?id=` | — | admin | Batalkan job |

### 3.4 Kalender libur — `/data/holidays` *(baru, T-22)*
| Metode | Fungsi | Auth |
|---|---|---|
| `GET` | `{holidays:[…], school_holidays:[…]}` | pengguna |
| `POST` | Tambah/ubah entri libur (`kind: "holiday" \| "school"`) | admin |
| `DELETE ?id=&kind=` | Hapus entri | admin |
| `GET ?derive=week_start_date` | Hitung `libur` untuk satu minggu (aturan ≥ 4 hari libur sekolah atau ada tanggal merah) | pengguna |

### 3.5 Riwayat prediksi — `/data/predictions`
| Metode | Parameter | Auth | Keterangan |
|---|---|---|---|
| `GET` | `?limit=10` atau `?active=1` | pengguna | Riwayat terbaru + bobot; `active=1` mengembalikan model aktif |
| `PUT` | `?id=…&active=1` | pengguna | Jadikan model aktif (menonaktifkan yang lain) — T-41 |
| `POST` | lihat bawah | pengguna | Simpan hasil; `user_id` dari token |
| `DELETE` | `?id=` | pemilik/admin | Hapus satu (+ bobot) |
| `DELETE` | `?all=true` | **admin** | Hapus semua |

`POST` body (target):
```json
{
  "model_mode": "replikasi|latih",
  "jobId": 31, "variant": "scratch|warm|manual|replikasi", "decision": "diaktifkan|ditahan|tanpa_champion",
  "champion": { "id": 12, "mae_test_same_window": 0.86 },
  "epochs": 100, "learningRate": 0.01, "windowSize": 1,
  "config": { "hidden": 4, "seed": 42, "split": {"ratio":[0.65,0.15,0.20],"train":["2025-01-29","2025-11-05"],"val":["2025-11-12","2026-01-07"],"test":["2026-01-14","2026-04-08"]},
              "normalization": {"td":[6,10],"harga":[810,950],"dharga":[-85,65]} },
  "metrics": { "mse": 1.14, "rmse": 1.07, "mape": 11.49, "mae": 0.86 },
  "metricsTrain": { "mse":0, "rmse":0, "mape":0, "mae":0 },
  "baselines": { "naive": {"mae":0,"rmse":0,"mape":0}, "mean": {"mae":0,"rmse":0,"mape":0} },
  "correlation": 0.15,
  "predictions": [ {"week_no":55,"actual":9,"predicted":8.36} ],
  "forecast": [ {"week_start_date":"2026-04-15","value":7.9,"libur":0} ],
  "manualCalculation": { }
}
```
Tambahan wajib: `dataSnapshot` = `{n, first_week, last_week, data_hash, series:[{week_start_date,tickets_sold,ticket_price,libur}]}` dan `scaler` = `{td:[min,max], harga:[min,max], dharga:[min,max]}`.
Wajib ada: `epochs` (atau `0` untuk replikasi), `metrics`, `dataSnapshot`, `scaler`; selain itu 422.

## 4. Header keamanan & CORS

- `Access-Control-Allow-Origin`: hanya origin di `ALLOWED_ORIGINS`; `Vary: Origin`.
- `Access-Control-Allow-Headers: Content-Type, Authorization`; `OPTIONS` → 204.
- Tambahkan `X-Content-Type-Options: nosniff` dan `Cache-Control: no-store`.

## 5. Klien (frontend)

`src/services/api.js`: `baseURL = import.meta.env.VITE_API_URL`; interceptor request menambah `Authorization`; interceptor respons: 401 → hapus `token`/`user` + navigasi `/login`; 403/422/500 → pesan Indonesia dari `message`/`errors`.
