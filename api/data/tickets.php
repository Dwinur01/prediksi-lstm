<?php
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: Fetch all tickets ordered by year and week
if ($method == 'GET') {
    $query = "SELECT * FROM ticket_sales ORDER BY year ASC, week ASC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $tickets = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $tickets[] = $row;
    }
    
    echo json_encode(["status" => "success", "data" => $tickets]);
}

// Handle POST: Add new ticket or batch insert
else if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Check if batch insert (array of objects)
    if (isset($data['batch']) && is_array($data['batch'])) {
        $successCount = 0;
        $errorCount = 0;
        
        $conn->beginTransaction();
        try {
            $query = "INSERT INTO ticket_sales (id, week, year, tickets_sold) VALUES (:id, :week, :year, :tickets_sold)
                      ON DUPLICATE KEY UPDATE tickets_sold = :tickets_sold";
            $stmt = $conn->prepare($query);
            
            foreach ($data['batch'] as $item) {
                if (isset($item['id']) && isset($item['week']) && isset($item['year']) && isset($item['tickets_sold'])) {
                    $stmt->bindParam(':id', $item['id']);
                    $stmt->bindParam(':week', $item['week']);
                    $stmt->bindParam(':year', $item['year']);
                    $stmt->bindParam(':tickets_sold', $item['tickets_sold']);
                    $stmt->execute();
                    $successCount++;
                }
            }
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "$successCount records imported successfully."]);
        } catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Import failed: " . $e->getMessage()]);
        }
    } else {
        // Single insert
        if (isset($data['id']) && isset($data['week']) && isset($data['year']) && isset($data['tickets_sold'])) {
            $query = "INSERT INTO ticket_sales (id, week, year, tickets_sold) VALUES (:id, :week, :year, :tickets_sold)
                      ON DUPLICATE KEY UPDATE tickets_sold = :tickets_sold";
            $stmt = $conn->prepare($query);
            
            $stmt->bindParam(':id', $data['id']);
            $stmt->bindParam(':week', $data['week']);
            $stmt->bindParam(':year', $data['year']);
            $stmt->bindParam(':tickets_sold', $data['tickets_sold']);
            
            if ($stmt->execute()) {
                echo json_encode(["status" => "success", "message" => "Record saved successfully."]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to save record."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Incomplete data."]);
        }
    }
}

// Handle DELETE: Delete a ticket by ID
else if ($method == 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    
    if ($id) {
        $query = "DELETE FROM ticket_sales WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Record deleted successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to delete record."]);
        }
    } else {
        // Truncate table if no id is provided and 'all' flag is set (for reset purposes)
        if(isset($_GET['all']) && $_GET['all'] == 'true') {
            $query = "TRUNCATE TABLE ticket_sales";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            echo json_encode(["status" => "success", "message" => "All records deleted successfully."]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "ID is required."]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>
