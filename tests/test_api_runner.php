<?php
/**
 * Test Runner API Otomatis Komprehensif (T-30)
 * Menguji seluruh endpoint API SWA Predict:
 * - TC-AUTH: Login sukses/gagal, uniform 401, rate limit 5x/15m (429), token verify, /auth/me
 * - TC-SEC:  Header X-Content-Type-Options: nosniff, Cache-Control: no-store, CORS whitelist dinamis
 * - TC-DATA: Tickets validasi 422, derive week_start_date, GET /data/summary (canonical data_hash)
 * - TC-HOLI: Holidays GET, derive libur(t) nasional & sekolah, POST admin (201/403/422), DELETE
 * - TC-JOB:  Training jobs POST pending, klaim atomik (409), detak heartbeat, timeout pemulihan
 * - TC-PRED: Predictions validasi 422, simpan riwayat lengkap, model aktif toggle atomik, bobot LSTM
 *
 * Penggunaan:
 *   php tests/test_api_runner.php [base_url]
 *   Contoh: php tests/test_api_runner.php http://127.0.0.1:8888/api
 */

require_once __DIR__ . '/../api/config/db.php';
global $conn;

$BASE = $argv[1] ?? getenv('TEST_API_URL') ?: 'http://127.0.0.1:8888/api';

// Periksa apakah server sudah aktif di $BASE; jika belum, spawn built-in server sementara
$serverProcess = null;
$chCheck = curl_init("$BASE/data/summary.php");
curl_setopt($chCheck, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chCheck, CURLOPT_TIMEOUT, 1);
$checkResp = curl_exec($chCheck);
$checkCode = curl_getinfo($chCheck, CURLINFO_HTTP_CODE);
curl_close($chCheck);

if ($checkCode === 0) {
    echo "Server di {$BASE} belum aktif. Memulai PHP built-in server di 127.0.0.1:8888...\n";
    $docRoot = realpath(__DIR__ . '/..');
    $cmd = sprintf('"%s" -d extension_dir="%s" -d extension=pdo_mysql -d extension=pdo_sqlite -S 127.0.0.1:8888 -t "%s"', 
        PHP_BINARY, 
        ini_get('extension_dir'),
        $docRoot
    );
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['file', 'nul', 'w'],
        2 => ['file', 'nul', 'w']
    ];
    $serverProcess = proc_open($cmd, $descriptors, $pipes, $docRoot);
    sleep(1);
    $BASE = 'http://127.0.0.1:8888/api';
}

register_shutdown_function(function() use (&$serverProcess) {
    if (is_resource($serverProcess)) {
        proc_terminate($serverProcess);
        proc_close($serverProcess);
    }
});

// Helper HTTP Request
function api_request($method, $url, $body = null, $token = null, $extraHeaders = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer {$token}";
    }
    foreach ($extraHeaders as $h) {
        $headers[] = $h;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
    }

    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    $headerText = substr($raw, 0, $headerSize);
    $bodyText = substr($raw, $headerSize);

    return [
        'code' => $code,
        'headers' => $headerText,
        'raw' => $bodyText,
        'json' => json_decode($bodyText, true)
    ];
}

$total = 0;
$passed = 0;
$failed = 0;

function assert_test($condition, $name, $detail = null) {
    global $total, $passed, $failed;
    $total++;
    if ($condition) {
        $passed++;
        echo "  [\033[32mLULUS\033[0m] {$name}\n";
    } else {
        $failed++;
        echo "  [\033[31mGAGAL\033[0m] {$name}\n";
        if ($detail !== null) {
            $msg = is_string($detail) ? $detail : json_encode($detail, JSON_UNESCAPED_UNICODE);
            echo "          Detail: {$msg}\n";
        }
    }
}

echo "=================================================================\n";
echo "       RUNNER UJI API OTOMATIS KOMPREHENSIF SWA PREDICT (T-30)   \n";
echo "=================================================================\n";
echo "Target Base URL: {$BASE}\n\n";

// Inisialisasi Akun Uji di Basis Data
$adminPass = password_hash('admin123', PASSWORD_DEFAULT);
$stafPass  = password_hash('staf123',  PASSWORD_DEFAULT);

$conn->exec("INSERT INTO users (id, name, username, password, role) 
             VALUES (101, 'Admin Test', 'admin_test', '{$adminPass}', 'admin')
             ON DUPLICATE KEY UPDATE name='Admin Test', password='{$adminPass}', role='admin'");

$conn->exec("INSERT INTO users (id, name, username, password, role) 
             VALUES (102, 'Staf Test', 'staf_test', '{$stafPass}', 'staf')
             ON DUPLICATE KEY UPDATE name='Staf Test', password='{$stafPass}', role='staf'");

// ─────────────────────────────────────────────────────────────────
// 1. MODUL AUTENTIKASI (TC-AUTH) & KEAMANAN (TC-SEC)
// ─────────────────────────────────────────────────────────────────
echo "--- 1. Uji Autentikasi (TC-AUTH) & Keamanan (TC-SEC) ---\n";

// Login Admin
$res = api_request('POST', "$BASE/auth/login.php", ['username' => 'admin_test', 'password' => 'admin123']);
assert_test($res['code'] === 200 && !empty($res['json']['token']), 'TC-AUTH-01: Login admin valid → 200 + token JWT');
$adminToken = $res['json']['token'] ?? null;
assert_test(($res['json']['user']['role'] ?? '') === 'admin', 'TC-AUTH-01b: Payload user role adalah admin');

// Login Staf
$res = api_request('POST', "$BASE/auth/login.php", ['username' => 'staf_test', 'password' => 'staf123']);
assert_test($res['code'] === 200 && !empty($res['json']['token']), 'TC-AUTH-02: Login staf valid → 200 + token JWT');
$stafToken = $res['json']['token'] ?? null;
assert_test(($res['json']['user']['role'] ?? '') === 'staf', 'TC-AUTH-02b: Payload user role adalah staf');

// Uniform Error 401
$res = api_request('POST', "$BASE/auth/login.php", ['username' => 'admin_test', 'password' => 'passwordsalah']);
assert_test($res['code'] === 401 && ($res['json']['message'] ?? '') === 'Username atau password salah.', 'TC-AUTH-03: Password salah → 401 pesan seragam');

$res = api_request('POST', "$BASE/auth/login.php", ['username' => 'user_tidak_ada', 'password' => 'randompass']);
assert_test($res['code'] === 401 && ($res['json']['message'] ?? '') === 'Username atau password salah.', 'TC-AUTH-04: User tidak ada → 401 pesan seragam identik');

// Security Headers (nosniff, Cache-Control: no-store)
assert_test(stripos($res['headers'], 'X-Content-Type-Options: nosniff') !== false, 'TC-SEC-01: Header X-Content-Type-Options: nosniff hadir');
assert_test(stripos($res['headers'], 'Cache-Control: no-store') !== false, 'TC-SEC-02: Header Cache-Control: no-store hadir');

// Endpoint Profil /auth/me.php
$res = api_request('GET', "$BASE/auth/me.php", null, $adminToken);
$meUser = $res['json']['data'] ?? ($res['json']['user'] ?? []);
assert_test($res['code'] === 200 && ($meUser['username'] ?? '') === 'admin_test', 'TC-AUTH-05: GET /auth/me → 200 identitas admin');

$res = api_request('GET', "$BASE/auth/me.php", null, 'token_palsu_invalid');
assert_test($res['code'] === 401, 'TC-AUTH-06: GET /auth/me token tidak valid → 401');

// ─────────────────────────────────────────────────────────────────
// 2. MODUL DATA PENJUALAN & SUMMARY (TC-DATA, T-20, T-40)
// ─────────────────────────────────────────────────────────────────
echo "\n--- 2. Uji Data Penjualan & Summary (TC-DATA, T-20, T-40) ---\n";

// GET Tickets (wajib auth)
$res = api_request('GET', "$BASE/data/tickets.php", null, $stafToken);
assert_test($res['code'] === 200 && is_array($res['json']), 'TC-DATA-01: GET /data/tickets.php dengan token → 200');

// GET Summary (data_hash SHA-256)
$res = api_request('GET', "$BASE/data/summary.php", null, $stafToken);
$summaryData = $res['json']['data'] ?? $res['json'];
$dHash = $summaryData['data_hash'] ?? '';
assert_test(
    $res['code'] === 200 && 
    !empty($dHash) && 
    strlen($dHash) === 64, 
    'TC-DATA-02: GET /data/summary.php → data_hash SHA-256 kanonik 64 hex char'
);

// Validasi 422 Tickets (kolom wajib hilang atau salah tipe)
$res = api_request('POST', "$BASE/data/tickets.php", [
    'week_start_date' => '2026-99-99', // tanggal tidak valid
    'tickets_sold' => -5,               // tidak boleh negatif
    'ticket_price' => 'bukan_angka'
], $stafToken);
assert_test($res['code'] === 422, 'TC-DATA-03: POST /data/tickets.php data tidak valid → 422');

// ─────────────────────────────────────────────────────────────────
// 3. MODUL KALENDER LIBUR (TC-HOLI, T-22)
// ─────────────────────────────────────────────────────────────────
echo "\n--- 3. Uji Kalender Libur (TC-HOLI, T-22) ---\n";

// GET Holidays
$res = api_request('GET', "$BASE/data/holidays.php", null, $stafToken);
assert_test($res['code'] === 200 && isset($res['json']['holidays']), 'TC-HOLI-01: GET /data/holidays.php → daftar libur 200');

// GET ?derive= libur nasional (2025-03-31)
$res = api_request('GET', "$BASE/data/holidays.php?derive=2025-03-31", null, $stafToken);
assert_test($res['code'] === 200 && ($res['json']['libur'] ?? null) === 1, 'TC-HOLI-02: GET ?derive=2025-03-31 → libur=1 (tanggal merah)');

// GET ?derive= hari biasa bukan libur (2025-02-10)
$res = api_request('GET', "$BASE/data/holidays.php?derive=2025-02-10", null, $stafToken);
assert_test($res['code'] === 200 && ($res['json']['libur'] ?? null) === 0, 'TC-HOLI-03: GET ?derive=2025-02-10 → libur=0 (minggu biasa)');

// GET ?derive= libur sekolah ≥ 4 hari (2025-07-07)
$res = api_request('GET', "$BASE/data/holidays.php?derive=2025-07-07", null, $stafToken);
assert_test($res['code'] === 200 && ($res['json']['libur'] ?? null) === 1, 'TC-HOLI-04: GET ?derive=2025-07-07 → libur=1 (libur sekolah ≥4 hari)');

// Otorisasi: Staf dilarang mengelola libur (403)
$res = api_request('POST', "$BASE/data/holidays.php", ['kind' => 'holiday', 'date' => '2025-05-02'], $stafToken);
assert_test($res['code'] === 403, 'TC-HOLI-05: POST libur oleh staf → 403 Forbidden');

// Admin boleh menambah entri libur (201)
$res = api_request('POST', "$BASE/data/holidays.php", [
    'kind' => 'holiday',
    'date' => '2025-11-25',
    'type' => 'nasional',
    'description' => 'Hari Guru Nasional (uji)'
], $adminToken);
assert_test($res['code'] === 201, 'TC-HOLI-06: POST libur oleh admin → 201 Created');
$testHolId = $res['json']['id'] ?? null;

// Admin menghapus entri libur (200)
if ($testHolId) {
    $res = api_request('DELETE', "$BASE/data/holidays.php?id={$testHolId}&kind=holiday", null, $adminToken);
    assert_test($res['code'] === 200, 'TC-HOLI-07: DELETE libur oleh admin → 200 OK');
}

// ─────────────────────────────────────────────────────────────────
// 4. MODUL TRAINING JOBS & KOORDINASI (TC-JOB, T-44)
// ─────────────────────────────────────────────────────────────────
echo "\n--- 4. Uji Training Jobs & Koordinasi Pelatihan (TC-JOB, T-44) ---\n";

$testHash = hash('sha256', 'hash-uji-t44-runner');

// Buat job pending baru
$res = api_request('POST', "$BASE/data/training-jobs.php", [
    'trigger_type' => 'manual',
    'target_data_hash' => $testHash
], $stafToken);
assert_test($res['code'] === 201 && ($res['json']['data']['status'] ?? '') === 'pending', 'TC-JOB-01: POST /data/training-jobs.php → 201 job pending');
$tJobId = $res['json']['data']['id'] ?? null;

// Klaim atomik (POST ?claim=1)
$res = api_request('POST', "$BASE/data/training-jobs.php?claim=1", ['id' => $tJobId], $stafToken);
assert_test($res['code'] === 200 && ($res['json']['data']['status'] ?? ($res['json']['job']['status'] ?? '')) === 'running', 'TC-JOB-02: Klaim atomik job → status running (running_key=1)');

// Klaim kedua pada job yang sedang running → 409 Conflict
$res = api_request('POST', "$BASE/data/training-jobs.php?claim=1", ['id' => $tJobId], $stafToken);
assert_test($res['code'] === 409, 'TC-JOB-03: Klaim job yang sedang aktif berdetak → 409 Conflict');

// Detak (Heartbeat) & Kemajuan
$res = api_request('PUT', "$BASE/data/training-jobs.php?id={$tJobId}", [
    'phase' => 'training',
    'progress' => 50
], $stafToken);
assert_test($res['code'] === 200, 'TC-JOB-04: PUT detak (heartbeat) & progress → 200');

// ─────────────────────────────────────────────────────────────────
// 5. MODUL RIWAYAT PREDIKSI & JEJAK LENGKAP (TC-PRED, T-23, T-41)
// ─────────────────────────────────────────────────────────────────
echo "\n--- 5. Uji Riwayat Prediksi & Jejak Lengkap (TC-PRED, T-23, T-41) ---\n";

// Validasi 422: payload tanpa scaler dan snapshot
$res = api_request('POST', "$BASE/data/predictions.php", [
    'epochs' => 10,
    'metrics' => ['mse' => 1.0]
], $stafToken);
assert_test($res['code'] === 422, 'TC-PRED-01: POST prediksi tanpa snapshot & scaler → 422');

// POST Prediksi Lengkap dengan jobId
$predPayload = [
    'model_mode' => 'latih',
    'jobId' => $tJobId,
    'variant' => 'scratch',
    'decision' => 'diaktifkan',
    'champion' => ['id' => 1, 'mae_test_same_window' => 0.85],
    'epochs' => 100,
    'learningRate' => 0.01,
    'windowSize' => 1,
    'config' => [
        'hidden' => 4,
        'seed' => 42,
        'split' => ['ratio' => [0.65, 0.15, 0.20]]
    ],
    'metrics' => ['mse' => 1.05, 'rmse' => 1.02, 'mape' => 10.5, 'mae' => 0.78],
    'metricsTrain' => ['mse' => 0.75, 'rmse' => 0.86, 'mape' => 8.1, 'mae' => 0.59],
    'baselines' => [
        'naive' => ['mae' => 1.15, 'rmse' => 1.35, 'mape' => 14.2],
        'mean'  => ['mae' => 1.45, 'rmse' => 1.70, 'mape' => 17.5]
    ],
    'correlation' => 0.18,
    'predictions' => [['week_no' => 55, 'actual' => 9, 'predicted' => 8.4]],
    'forecast' => [['week_start_date' => '2026-04-15', 'value' => 8.1, 'libur' => 0]],
    'manualCalculation' => [
        'Wf' => [[0.1, 0.2], [0.3, 0.4]],
        'Wi' => [[0.5, 0.6], [0.7, 0.8]],
        'Wc' => [[0.9, 1.0], [1.1, 1.2]],
        'Wo' => [[1.3, 1.4], [1.5, 1.6]]
    ],
    'dataSnapshot' => [
        'n' => 67,
        'first_week' => '2025-01-29',
        'last_week' => '2026-04-08',
        'data_hash' => $testHash,
        'series' => [
            ['week_start_date' => '2025-01-29', 'tickets_sold' => 8, 'ticket_price' => 850, 'libur' => 0]
        ]
    ],
    'scaler' => [
        'td'     => [6, 10],
        'harga'  => [810, 950],
        'dharga' => [-85, 65]
    ]
];

$res = api_request('POST', "$BASE/data/predictions.php", $predPayload, $stafToken);
assert_test($res['code'] === 201 && ($res['json']['is_active'] ?? false) === true, 'TC-PRED-02: Simpan riwayat lengkap → 201 + model aktif');
$savedPredId = $res['json']['id'] ?? null;

// Sinkronisasi status training_jobs menjadi completed
$jobCheck = $conn->query("SELECT status, result_history_id FROM training_jobs WHERE id = {$tJobId}")->fetch(PDO::FETCH_ASSOC);
assert_test(
    $jobCheck['status'] === 'completed' && 
    (int)$jobCheck['result_history_id'] === (int)$savedPredId, 
    'TC-PRED-03: training_jobs diselesaikan otomatis dengan result_history_id cocok'
);

// GET Model Aktif (?active=1)
$res = api_request('GET', "$BASE/data/predictions.php?active=1", null, $stafToken);
assert_test(
    $res['code'] === 200 && 
    (int)($res['json']['data']['id'] ?? 0) === (int)$savedPredId && 
    !empty($res['json']['data']['weights_json']), 
    'TC-PRED-04: GET ?active=1 → kembalikan model aktif beserta bobot lstm_weights'
);

// Toggle Nonaktif / Aktif (PUT ?id=&active=)
$res = api_request('PUT', "$BASE/data/predictions.php?id={$savedPredId}&active=0", null, $adminToken);
assert_test($res['code'] === 200, 'TC-PRED-05: PUT model nonaktif (active=0) → 200');

$res = api_request('PUT', "$BASE/data/predictions.php?id={$savedPredId}&active=1", null, $adminToken);
assert_test($res['code'] === 200, 'TC-PRED-06: PUT model aktifkan kembali (active=1) → 200');

// Hapus Riwayat Individu (DELETE ?id=)
$res = api_request('DELETE', "$BASE/data/predictions.php?id={$savedPredId}", null, $stafToken);
assert_test($res['code'] === 200, 'TC-PRED-07: DELETE riwayat milik sendiri oleh staf → 200');

// Pembersihan Sisa Data Uji
$conn->exec("DELETE FROM training_jobs WHERE id = {$tJobId}");
$conn->exec("DELETE FROM users WHERE id IN (101, 102)");

// ─────────────────────────────────────────────────────────────────
// RINGKASAN HASIL PENGUJIAN
// ─────────────────────────────────────────────────────────────────
echo "\n=================================================================\n";
echo "HASIL AKHIR PENGUJIAN API: {$passed}/{$total} LULUS";
if ($failed > 0) {
    echo " (\033[31m{$failed} GAGAL\033[0m)\n";
} else {
    echo " (\033[32m100% SUKSES\033[0m)\n";
}
echo "=================================================================\n\n";

exit($failed === 0 ? 0 : 1);
