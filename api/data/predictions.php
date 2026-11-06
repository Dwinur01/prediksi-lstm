<?php
require_once '../config/db.php';
require_once '../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
$currentUser = require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Mode active=1: Ambil satu model aktif beserta bobotnya (T-41 / Langkah 8)
    if (isset($_GET['active']) && $_GET['active'] == '1') {
        $query = "SELECT ph.*, lw.weights_json
                  FROM prediction_history ph
                  LEFT JOIN lstm_weights lw ON ph.id = lw.history_id
                  WHERE ph.is_active = 1
                  ORDER BY ph.id DESC LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            if (!empty($row['weights_json'])) {
                $json = json_decode($row['results_json'], true) ?: [];
                $json['manualCalculation'] = json_decode($row['weights_json'], true);
                $row['results_json'] = json_encode($json);
            }
            echo json_encode(["status" => "success", "data" => $row], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            echo json_encode(["status" => "success", "data" => null], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
    $query = "SELECT ph.*, 
              lw.weights_json
              FROM prediction_history ph
              LEFT JOIN lstm_weights lw ON ph.id = lw.history_id
              ORDER BY ph.run_date DESC LIMIT " . $limit;
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($history as &$row) {
        if (!empty($row['weights_json'])) {
            $json = json_decode($row['results_json'], true) ?: [];
            $json['manualCalculation'] = json_decode($row['weights_json'], true);
            $row['results_json'] = json_encode($json);
        }
    }
    
    echo json_encode(["status" => "success", "data" => $history], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

else if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $active = isset($_GET['active']) ? (int)$_GET['active'] : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Parameter id wajib diisi."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $checkStmt = $conn->prepare("SELECT id FROM prediction_history WHERE id = :id LIMIT 1");
    $checkStmt->execute([':id' => $id]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Riwayat prediksi tidak ditemukan."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $conn->beginTransaction();
        if ($active === 1) {
            // Nonaktifkan seluruh model lain
            $conn->exec("UPDATE prediction_history SET is_active = 0");
            $setStmt = $conn->prepare("UPDATE prediction_history SET is_active = 1 WHERE id = :id");
            $setStmt->execute([':id' => $id]);
        } else {
            $setStmt = $conn->prepare("UPDATE prediction_history SET is_active = 0 WHERE id = :id");
            $setStmt->execute([':id' => $id]);
        }
        $conn->commit();

        echo json_encode([
            "status" => "success",
            "message" => $active === 1 ? "Model berhasil diaktifkan." : "Model dinonaktifkan."
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Gagal memperbarui model aktif: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

else if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['epochs']) && isset($data['metrics'])) {
        $userId = $currentUser['id'] ?? $currentUser['sub'] ?? null;
        $epochs = (int)$data['epochs'];
        $lr = isset($data['learningRate']) ? (float)$data['learningRate'] : 0.0;
        $ws = isset($data['windowSize']) ? (int)$data['windowSize'] : 1;
        $mse = isset($data['metrics']['mse']) ? (float)$data['metrics']['mse'] : null;
        $rmse = isset($data['metrics']['rmse']) ? (float)$data['metrics']['rmse'] : null;
        $mape = isset($data['metrics']['mape']) ? (float)$data['metrics']['mape'] : null;
        $mae = isset($data['metrics']['mae']) ? (float)$data['metrics']['mae'] : null;

        $modelMode = $data['model_mode'] ?? $data['mode'] ?? 'latih';
        $variant = $data['variant'] ?? null;
        $decision = $data['decision'] ?? null;
        $isActive = (!empty($data['is_active']) || $decision === 'diaktifkan' || $decision === 'tanpa_champion') ? 1 : 0;

        $dataN = isset($data['snapshot']['n']) ? (int)$data['snapshot']['n'] : (isset($data['data_n']) ? (int)$data['data_n'] : null);
        $firstWeek = $data['snapshot']['first_week'] ?? $data['data_first_week'] ?? null;
        $lastWeek = $data['snapshot']['last_week'] ?? $data['data_last_week'] ?? null;
        $dataHash = $data['snapshot']['data_hash'] ?? $data['data_hash'] ?? null;

        $configJson = isset($data['config']) ? json_encode($data['config']) : null;
        $resultsJson = json_encode($data);

        try {
            $conn->beginTransaction();

            if ($isActive === 1) {
                $conn->exec("UPDATE prediction_history SET is_active = 0");
            }

            $query = "INSERT INTO prediction_history 
                      (user_id, model_mode, epochs, learning_rate, window_size, config_json, data_n, data_first_week, data_last_week, data_hash, is_active, variant, decision, mse, rmse, mape, mae, results_json) 
                      VALUES (:user_id, :mode, :epochs, :lr, :ws, :config_json, :data_n, :first_week, :last_week, :data_hash, :is_active, :variant, :decision, :mse, :rmse, :mape, :mae, :json)";
            
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':mode', $modelMode);
            $stmt->bindParam(':epochs', $epochs);
            $stmt->bindParam(':lr', $lr);
            $stmt->bindParam(':ws', $ws);
            $stmt->bindParam(':config_json', $configJson);
            $stmt->bindParam(':data_n', $dataN);
            $stmt->bindParam(':first_week', $firstWeek);
            $stmt->bindParam(':last_week', $lastWeek);
            $stmt->bindParam(':data_hash', $dataHash);
            $stmt->bindParam(':is_active', $isActive);
            $stmt->bindParam(':variant', $variant);
            $stmt->bindParam(':decision', $decision);
            $stmt->bindParam(':mse', $mse);
            $stmt->bindParam(':rmse', $rmse);
            $stmt->bindParam(':mape', $mape);
            $stmt->bindParam(':mae', $mae);
            $stmt->bindParam(':json', $resultsJson);
            
            $stmt->execute();
            $historyId = $conn->lastInsertId();
            
            // Insert into lstm_weights if available
            $weightsData = $data['manualCalculation'] ?? $data['weights'] ?? ($data['model']['weights'] ?? null);
            if ($weightsData) {
                $wQuery = "INSERT INTO lstm_weights (history_id, weights_json) VALUES (:hid, :wjson)";
                $wStmt = $conn->prepare($wQuery);
                $wJson = json_encode($weightsData);
                $wStmt->bindParam(':hid', $historyId);
                $wStmt->bindParam(':wjson', $wJson);
                $wStmt->execute();
            }

            $conn->commit();

            echo json_encode([
                "status" => "success", 
                "message" => "History saved.",
                "id" => (int)$historyId,
                "is_active" => (bool)$isActive
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to save history: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Incomplete data."], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

else if ($method == 'DELETE') {
    // T-05: Reset massal seluruh riwayat wajib role admin
    if (isset($_GET['all']) && $_GET['all'] == 'true') {
        require_role('admin');
        try {
            $conn->beginTransaction();
            $conn->exec("DELETE FROM lstm_weights");
            $conn->exec("DELETE FROM prediction_history");
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "All history and linked weights cleared."]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to clear history: " . $e->getMessage()]);
        }
    } else if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];

        // Ambil data untuk validasi keberadaan & otorisasi kepemilikan
        $checkStmt = $conn->prepare("SELECT id, user_id FROM prediction_history WHERE id = :id LIMIT 1");
        $checkStmt->execute([':id' => $id]);
        $record = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Record not found."]);
            exit();
        }

        // T-05: Admin boleh hapus riwayat apapun. Staf hanya boleh hapus jika record miliknya sendiri
        $currentUserId = (int)($currentUser['id'] ?? $currentUser['sub'] ?? 0);
        if ($currentUser['role'] !== 'admin' && !empty($record['user_id']) && (int)$record['user_id'] !== $currentUserId) {
            http_response_code(403);
            echo json_encode([
                "status" => "error",
                "message" => "Akses ditolak. Anda hanya dapat menghapus riwayat milik sendiri."
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        try {
            $conn->beginTransaction();
            $wStmt = $conn->prepare("DELETE FROM lstm_weights WHERE history_id = :id");
            $wStmt->bindParam(':id', $id);
            $wStmt->execute();

            $query = "DELETE FROM prediction_history WHERE id = :id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $conn->commit();

            echo json_encode(["status" => "success", "message" => "Record and its weights deleted."]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to delete record: " . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID is required."]);
    }
}
?>
