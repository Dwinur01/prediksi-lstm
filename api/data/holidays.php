<?php
/**
 * Endpoint Kalender Libur Nasional & Sekolah (T-22)
 * /data/holidays.php
 *
 * GET                              → {holidays:[…], school_holidays:[…]}
 * GET ?derive=YYYY-MM-DD          → {week_start_date, libur (0|1), reason}
 * POST                            → Tambah/ubah entri (admin)
 *   body: {kind:"holiday"|"school", date|start_date, end_date, type, description}
 * DELETE ?id=&kind=holiday|school → Hapus entri (admin)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

// ─── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    // GET ?derive=YYYY-MM-DD  → hitung libur(t) untuk satu minggu
    if (isset($_GET['derive'])) {
        $user = require_auth();
        $weekStart = trim($_GET['derive']);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStart)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'Parameter derive harus berformat YYYY-MM-DD.'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));

        // 1. Cek tanggal merah / cuti bersama
        $stmtH = $conn->prepare("SELECT holiday_date, description FROM holidays WHERE holiday_date BETWEEN :ws AND :we ORDER BY holiday_date LIMIT 1");
        $stmtH->execute([':ws' => $weekStart, ':we' => $weekEnd]);
        $hit = $stmtH->fetch(PDO::FETCH_ASSOC);
        if ($hit) {
            echo json_encode([
                'week_start_date' => $weekStart,
                'libur'  => 1,
                'reason' => 'tanggal_merah',
                'detail' => $hit['description'] . ' (' . $hit['holiday_date'] . ')'
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // 2. Hitung hari libur sekolah dalam rentang [weekStart, weekEnd]
        $stmtS = $conn->prepare("
            SELECT start_date, end_date FROM school_holidays
            WHERE start_date <= :we AND end_date >= :ws
        ");
        $stmtS->execute([':ws' => $weekStart, ':we' => $weekEnd]);
        $ranges = $stmtS->fetchAll(PDO::FETCH_ASSOC);

        $wStartTs = strtotime($weekStart);
        $wEndTs   = strtotime($weekEnd);
        $schoolDays = 0;
        foreach ($ranges as $r) {
            $a = max($wStartTs, strtotime($r['start_date']));
            $b = min($wEndTs,   strtotime($r['end_date']));
            if ($b >= $a) {
                $schoolDays += (int)(($b - $a) / 86400) + 1;
            }
        }
        $threshold = 4;
        $libur = $schoolDays >= $threshold ? 1 : 0;
        echo json_encode([
            'week_start_date' => $weekStart,
            'libur'           => $libur,
            'reason'          => $libur ? 'libur_sekolah' : 'tidak_libur',
            'school_days_in_week' => $schoolDays,
            'threshold'       => $threshold
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // GET biasa → daftar semua libur
    $user = require_auth();
    $hRows  = $conn->query("SELECT id, holiday_date, type, description FROM holidays ORDER BY holiday_date")->fetchAll(PDO::FETCH_ASSOC);
    $shRows = $conn->query("SELECT id, start_date, end_date, description FROM school_holidays ORDER BY start_date")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status'          => 'success',
        'holidays'        => $hRows,
        'school_holidays' => $shRows
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// ─── POST: Tambah / Ubah Entri Libur ─────────────────────────────────────────
if ($method === 'POST') {
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Hanya admin yang dapat mengelola kalender libur.'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $kind = trim($data['kind'] ?? '');

    // ── kind: holiday (tanggal merah / cuti bersama) ──
    if ($kind === 'holiday') {
        $date = trim($data['date'] ?? '');
        $type = trim($data['type'] ?? 'nasional');
        $desc = trim($data['description'] ?? '');

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'Kolom date wajib berformat YYYY-MM-DD.'], JSON_UNESCAPED_UNICODE);
            exit();
        }
        if (!in_array($type, ['nasional', 'cuti_bersama'], true)) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => "Kolom type harus 'nasional' atau 'cuti_bersama'."], JSON_UNESCAPED_UNICODE);
            exit();
        }

        global $db_type;
        if ($db_type === 'mysql') {
            $stmt = $conn->prepare("INSERT INTO holidays (holiday_date, type, description)
                                    VALUES (:d, :t, :desc)
                                    ON DUPLICATE KEY UPDATE type=:t, description=:desc");
        } else {
            $stmt = $conn->prepare("INSERT OR REPLACE INTO holidays (holiday_date, type, description)
                                    VALUES (:d, :t, :desc)");
        }
        $stmt->execute([':d' => $date, ':t' => $type, ':desc' => $desc]);
        $id = (int)$conn->lastInsertId();

        http_response_code(201);
        echo json_encode(['status' => 'success', 'message' => 'Entri libur nasional disimpan.', 'id' => $id], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // ── kind: school (libur sekolah) ──
    if ($kind === 'school') {
        $startDate = trim($data['start_date'] ?? '');
        $endDate   = trim($data['end_date'] ?? '');
        $desc      = trim($data['description'] ?? '');

        $valid = preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)
              && preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)
              && $endDate >= $startDate;
        if (!$valid) {
            http_response_code(422);
            echo json_encode(['status' => 'error', 'message' => 'start_date dan end_date wajib berformat YYYY-MM-DD dan end_date ≥ start_date.'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $stmt = $conn->prepare("INSERT INTO school_holidays (start_date, end_date, description) VALUES (:s, :e, :desc)");
        $stmt->execute([':s' => $startDate, ':e' => $endDate, ':desc' => $desc]);
        $id = (int)$conn->lastInsertId();

        http_response_code(201);
        echo json_encode(['status' => 'success', 'message' => 'Rentang libur sekolah disimpan.', 'id' => $id], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => "Kolom kind wajib diisi: 'holiday' atau 'school'."], JSON_UNESCAPED_UNICODE);
    exit();
}

// ─── DELETE: Hapus Entri Libur ────────────────────────────────────────────────
if ($method === 'DELETE') {
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Hanya admin yang dapat menghapus entri libur.'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $id   = isset($_GET['id'])   ? (int)$_GET['id']       : 0;
    $kind = trim($_GET['kind'] ?? '');

    if ($id <= 0 || !in_array($kind, ['holiday', 'school'], true)) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => "Parameter ?id= dan ?kind= (holiday|school) wajib disertakan."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $table = $kind === 'holiday' ? 'holidays' : 'school_holidays';
    $stmt  = $conn->prepare("DELETE FROM {$table} WHERE id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => "Entri {$kind} dengan id={$id} tidak ditemukan."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    echo json_encode(['status' => 'success', 'message' => "Entri {$kind} id={$id} berhasil dihapus."], JSON_UNESCAPED_UNICODE);
    exit();
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Metode tidak diizinkan.'], JSON_UNESCAPED_UNICODE);
