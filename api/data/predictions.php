<?php
require_once '../config/db.php';
require_once '../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
$currentUser = require_auth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $query = "SELECT ph.*, 
              lw.weights_json
              FROM prediction_history ph
              LEFT JOIN lstm_weights lw ON ph.id = lw.history_id
              ORDER BY ph.run_date DESC LIMIT 10";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($history as &$row) {
        if (!empty($row['weights_json'])) {
            $json = json_decode($row['results_json'], true);
            $json['manualCalculation'] = json_decode($row['weights_json'], true);
            $row['results_json'] = json_encode($json);
        }
    }
    
    echo json_encode(["status" => "success", "data" => $history]);
}

else if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['epochs']) && isset($data['metrics'])) {
        $userId = $currentUser['id'] ?? $currentUser['sub'] ?? null;
        $query = "INSERT INTO prediction_history (user_id, epochs, learning_rate, window_size, mse, rmse, mape, results_json) 
                  VALUES (:user_id, :epochs, :lr, :ws, :mse, :rmse, :mape, :json)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':epochs', $data['epochs']);
        $stmt->bindParam(':lr', $data['learningRate']);
        $stmt->bindParam(':ws', $data['windowSize']);
        $stmt->bindParam(':mse', $data['metrics']['mse']);
        $stmt->bindParam(':rmse', $data['metrics']['rmse']);
        $stmt->bindParam(':mape', $data['metrics']['mape']);
        
        $resultsJson = json_encode($data);
        $stmt->bindParam(':json', $resultsJson);
        
        if ($stmt->execute()) {
            $historyId = $conn->lastInsertId();
            
            // Insert into lstm_weights if available
            if (isset($data['manualCalculation'])) {
                $wQuery = "INSERT INTO lstm_weights (history_id, weights_json) VALUES (:hid, :wjson)";
                $wStmt = $conn->prepare($wQuery);
                $wJson = json_encode($data['manualCalculation']);
                $wStmt->bindParam(':hid', $historyId);
                $wStmt->bindParam(':wjson', $wJson);
                $wStmt->execute();
            }

            echo json_encode(["status" => "success", "message" => "History saved."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to save history."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Incomplete data."]);
    }
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
