<?php
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $query = "SELECT * FROM prediction_history ORDER BY run_date DESC LIMIT 10";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
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
        
        $resultsJson = json_encode([
            'dates' => $data['dates'],
            'actuals' => $data['actuals'],
            'predictions' => $data['predictions']
        ]);
        $stmt->bindParam(':json', $resultsJson);
        
        if ($stmt->execute()) {
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
?>
