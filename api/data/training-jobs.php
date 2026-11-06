<?php
/**
 * Endpoint Manajemen Job Pelatihan Ulang (T-44)
 * /data/training-jobs.php
 * Mendukung antrean job, klaim atomik (running_key UNIQUE), detak (heartbeat 5 dtk), timeout 60 dtk.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

$currentUser = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

// Helper untuk membersihkan job running yang sudah basi (> 60 detik tanpa detak)
function cleanupStaleRunningJobs($conn) {
    try {
        $threshold = date('Y-m-d H:i:s', time() - 60);
        $staleStmt = $conn->prepare("UPDATE training_jobs 
                                     SET status = 'failed', running_key = NULL, finished_at = CURRENT_TIMESTAMP, 
                                         error_message = 'Heartbeat timeout (>60 detik)' 
                                     WHERE running_key = 1 AND (heartbeat_at < :th OR (heartbeat_at IS NULL AND started_at < :th))");
        $staleStmt->execute([':th' => $threshold]);
    } catch (Exception $e) {
        // Abaikan
    }
}

// ─── 1. POST: Buat Job Baru atau Klaim Atomik ───
if ($method === 'POST') {
    cleanupStaleRunningJobs($conn);
    $data = json_decode(file_get_contents("php://input"), true) ?: [];

    // Mode KLAIM: POST ?claim=1
    if (isset($_GET['claim']) && $_GET['claim'] == '1') {
        $jobId = isset($data['id']) ? (int)$data['id'] : 0;
        if ($jobId <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "ID job wajib disertakan untuk klaim."], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Cek apakah ada job lain yang masih running dan aktif
        $activeStmt = $conn->query("SELECT id, heartbeat_at, started_at FROM training_jobs WHERE running_key = 1 LIMIT 1");
        $activeJob = $activeStmt->fetch(PDO::FETCH_ASSOC);

        if ($activeJob && (int)$activeJob['id'] !== $jobId) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Job lain sedang berjalan (ID: " . $activeJob['id'] . ")."
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Lakukan klaim atomik (pending -> running dengan running_key = 1)
        try {
            $conn->beginTransaction();
            $claimStmt = $conn->prepare("UPDATE training_jobs 
                                         SET status = 'running', running_key = 1, started_at = CURRENT_TIMESTAMP, heartbeat_at = CURRENT_TIMESTAMP 
                                         WHERE id = :id AND status = 'pending'");
            $claimStmt->execute([':id' => $jobId]);

            if ($claimStmt->rowCount() > 0) {
                $conn->commit();
                echo json_encode([
                    "status" => "success",
                    "message" => "Job berhasil diklaim.",
                    "data" => ["id" => $jobId, "status" => "running"]
                ], JSON_UNESCAPED_UNICODE);
            } else {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode([
                    "status" => "error",
                    "message" => "Job tidak dapat diklaim (bukan berstatus pending atau sudah diklaim)."
                ], JSON_UNESCAPED_UNICODE);
            }
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Gagal klaim job (konflik kunci job aktif): " . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // Mode BUAT JOB BARU
    $triggerType = trim($data['trigger_type'] ?? 'manual');
    $targetHash = trim($data['target_data_hash'] ?? '');

    if (empty($targetHash)) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "target_data_hash wajib diisi."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Idempotensi: Cek apakah ada job pending/running untuk hash yang sama
    $checkStmt = $conn->prepare("SELECT id, status, target_data_hash, phase, progress 
                                 FROM training_jobs 
                                 WHERE target_data_hash = :hash AND status IN ('pending', 'running') 
                                 ORDER BY id DESC LIMIT 1");
    $checkStmt->execute([':hash' => $targetHash]);
    $existingJob = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingJob) {
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Job dengan target data hash ini sudah ada.",
            "data" => $existingJob
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Buat job baru status pending
    try {
        $userId = $currentUser['id'] ?? $currentUser['sub'] ?? null;
        $insertStmt = $conn->prepare("INSERT INTO training_jobs (trigger_type, target_data_hash, status, started_by) 
                                     VALUES (:trigger, :hash, 'pending', :uid)");
        $insertStmt->execute([
            ':trigger' => $triggerType,
            ':hash' => $targetHash,
            ':uid' => $userId
        ]);
        $newId = (int)$conn->lastInsertId();

        http_response_code(201);
        echo json_encode([
            "status" => "success",
            "message" => "Job pending berhasil dibuat.",
            "data" => [
                "id" => $newId,
                "trigger_type" => $triggerType,
                "target_data_hash" => $targetHash,
                "status" => "pending",
                "progress" => 0
            ]
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Gagal membuat job: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ─── 2. PUT: Perbarui Detak, Progres, atau Status Selesai ───
else if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Parameter id wajib diisi."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true) ?: [];

    $checkStmt = $conn->prepare("SELECT id, status, running_key FROM training_jobs WHERE id = :id LIMIT 1");
    $checkStmt->execute([':id' => $id]);
    $job = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$job) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Job tidak ditemukan."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $status = $data['status'] ?? $job['status'];
    $phase = $data['phase'] ?? null;
    $progress = isset($data['progress']) ? max(0, min(100, (int)$data['progress'])) : null;
    $errorMessage = $data['error_message'] ?? null;
    $resultDecision = $data['result_decision'] ?? null;
    $resultHistoryId = isset($data['result_history_id']) ? (int)$data['result_history_id'] : null;

    $isTerminal = in_array($status, ['done', 'failed', 'cancelled'], true);

    try {
        if ($isTerminal) {
            $stmt = $conn->prepare("UPDATE training_jobs 
                                    SET status = :status, phase = :phase, progress = COALESCE(:prog, progress), 
                                        error_message = :err, result_decision = :dec, result_history_id = :hid, 
                                        running_key = NULL, finished_at = CURRENT_TIMESTAMP 
                                    WHERE id = :id");
            $stmt->execute([
                ':status' => $status,
                ':phase' => $phase,
                ':prog' => $progress,
                ':err' => $errorMessage,
                ':dec' => $resultDecision,
                ':hid' => $resultHistoryId,
                ':id' => $id
            ]);
        } else {
            // Heartbeat & update progress
            $stmt = $conn->prepare("UPDATE training_jobs 
                                    SET status = :status, phase = COALESCE(:phase, phase), progress = COALESCE(:prog, progress), 
                                        heartbeat_at = CURRENT_TIMESTAMP 
                                    WHERE id = :id");
            $stmt->execute([
                ':status' => $status,
                ':phase' => $phase,
                ':prog' => $progress,
                ':id' => $id
            ]);
        }

        echo json_encode(["status" => "success", "message" => "Job berhasil diperbarui."], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Gagal memperbarui job: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ─── 3. GET: Daftar Job atau Status Job Tertentu ───
else if ($method === 'GET') {
    cleanupStaleRunningJobs($conn);

    if (isset($_GET['id'])) {
        $stmt = $conn->prepare("SELECT * FROM training_jobs WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => (int)$_GET['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            echo json_encode(["status" => "success", "data" => $row], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Job tidak ditemukan."], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    $where = [];
    $params = [];

    if (!empty($_GET['status'])) {
        $statuses = array_map('trim', explode(',', $_GET['status']));
        $placeholders = str_repeat('?,', count($statuses) - 1) . '?';
        $where[] = "status IN ($placeholders)";
        $params = $statuses;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(' AND ', $where) : "";
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;

    $stmt = $conn->prepare("SELECT * FROM training_jobs {$whereClause} ORDER BY id DESC LIMIT {$limit}");
    $stmt->execute($params);
    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $jobs], JSON_UNESCAPED_UNICODE);
    exit();
}

// ─── 4. DELETE: Batalkan Job (Admin Saja) ───
else if ($method === 'DELETE') {
    require_role('admin');

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Parameter id wajib diisi."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $stmt = $conn->prepare("UPDATE training_jobs 
                            SET status = 'cancelled', running_key = NULL, finished_at = CURRENT_TIMESTAMP, 
                                error_message = 'Dibatalkan oleh administrator' 
                            WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(["status" => "success", "message" => "Job berhasil dibatalkan."], JSON_UNESCAPED_UNICODE);
    exit();
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."], JSON_UNESCAPED_UNICODE);
    exit();
}
