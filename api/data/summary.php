<?php
/**
 * Endpoint Ringkasan Data Penjualan (T-40)
 * GET /data/summary
 * Menghasilkan n, first_week, last_week, last_updated, data_hash kanonik, deteksi celah (gaps),
 * active_model (status usang/terkini), dan status retrain job.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$currentUser = require_auth();

try {
    // 1. Ambil seluruh data tiket terurut berdasarkan week_start_date ASC
    $stmt = $conn->prepare("SELECT week_start_date, tickets_sold, ticket_price, libur, updated_at, created_at 
                            FROM ticket_sales 
                            ORDER BY week_start_date ASC");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $n = count($rows);
    $firstWeek = null;
    $lastWeek = null;
    $lastUpdated = null;
    $dataHash = hash('sha256', '');
    $gaps = [];

    if ($n > 0) {
        $firstWeek = $rows[0]['week_start_date'];
        $lastWeek = $rows[$n - 1]['week_start_date'];

        // Cari cap waktu pembaruan terakhir
        $maxTime = 0;
        $hashLines = [];

        for ($i = 0; $i < $n; $i++) {
            $r = $rows[$i];
            
            // Catat waktu pembaruan
            $timeUpdated = !empty($r['updated_at']) ? strtotime($r['updated_at']) : 0;
            $timeCreated = !empty($r['created_at']) ? strtotime($r['created_at']) : 0;
            $rowTime = max($timeUpdated, $timeCreated);
            if ($rowTime > $maxTime) {
                $maxTime = $rowTime;
            }

            // Bangun baris kanonik: date|td|price|libur
            $hashLines[] = $r['week_start_date'] . '|' . (int)$r['tickets_sold'] . '|' . (float)$r['ticket_price'] . '|' . (int)$r['libur'];

            // Deteksi celah (gaps > 7 hari) antar-minggu
            if ($i < $n - 1) {
                $currTime = strtotime($r['week_start_date']);
                $nextTime = strtotime($rows[$i + 1]['week_start_date']);
                $diffDays = (int)round(($nextTime - $currTime) / 86400);
                if ($diffDays > 7) {
                    $missingWeeks = (int)round(($diffDays - 7) / 7);
                    if ($missingWeeks > 0) {
                        $gaps[] = [
                            'after' => $r['week_start_date'],
                            'missing_weeks' => $missingWeeks
                        ];
                    }
                }
            }
        }

        if ($maxTime > 0) {
            $lastUpdated = gmdate('Y-m-d\TH:i:s\Z', $maxTime);
        }

        // Hitung SHA-256 kanonik identik dengan dataTrace.js (docs/03 §5b)
        $dataHash = hash('sha256', implode("\n", $hashLines));
    }

    // 2. Ambil informasi model aktif (is_active = 1)
    $activeModel = null;
    $activeStmt = $conn->prepare("SELECT id, data_hash, data_n 
                                  FROM prediction_history 
                                  WHERE is_active = 1 
                                  ORDER BY id DESC LIMIT 1");
    $activeStmt->execute();
    $activeRow = $activeStmt->fetch(PDO::FETCH_ASSOC);

    if ($activeRow) {
        $isCurrent = ($activeRow['data_hash'] === $dataHash);
        $reason = null;

        if (!$isCurrent) {
            $modelN = isset($activeRow['data_n']) ? (int)$activeRow['data_n'] : 0;
            if ($modelN > 0 && $n > $modelN) {
                $reason = ($n - $modelN) . " minggu baru sejak pelatihan";
            } else {
                $reason = "data lama diubah";
            }
        }

        $activeModel = [
            'id' => (int)$activeRow['id'],
            'is_current' => $isCurrent,
            'reason' => $reason
        ];
    }

    // 3. Ambil status retrain dari tabel training_jobs (bila tabel sudah ada)
    $retrain = null;
    try {
        $jobStmt = $conn->query("SELECT id, status, phase, progress, result_decision, error_message 
                                 FROM training_jobs 
                                 ORDER BY id DESC LIMIT 1");
        $job = $jobStmt->fetch(PDO::FETCH_ASSOC);
        if ($job) {
            $retrain = [
                'job_id' => (int)$job['id'],
                'status' => $job['status'],
                'phase' => $job['phase'],
                'progress' => (int)$job['progress'],
                'last_decision' => $job['result_decision'],
                'last_reason' => $job['error_message']
            ];
        }
    } catch (Exception $e) {
        // Tabel training_jobs belum dibuat sebelum T-44
        $retrain = null;
    }

    // 4. Balas dengan format ringkasan sesuai docs/05 §3.3b
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'n' => $n,
            'first_week' => $firstWeek,
            'last_week' => $lastWeek,
            'last_updated' => $lastUpdated,
            'data_hash' => $dataHash,
            'gaps' => $gaps,
            'active_model' => $activeModel,
            'retrain' => $retrain
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal mengambil ringkasan data: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
