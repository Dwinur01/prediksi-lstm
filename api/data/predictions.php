<?php
require_once '../config/db.php';

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
        $query = "INSERT INTO prediction_history (epochs, learning_rate, window_size, mse, rmse, mape, results_json) 
                  VALUES (:epochs, :lr, :ws, :mse, :rmse, :mape, :json)";
        
        $stmt = $conn->prepare($query);
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
    if (isset($_GET['all']) && $_GET['all'] == 'true') {
        $query = "TRUNCATE TABLE prediction_history";
        $stmt = $conn->prepare($query);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "All history cleared."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to clear history."]);
        }
    } else if (isset($_GET['id'])) {
        $query = "DELETE FROM prediction_history WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_GET['id']);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Record deleted."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to delete record."]);
        }
    }
}
?>
