<?php
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: Fetch all tickets ordered by year and week
if ($method == 'GET') {
    $query = "SELECT * FROM ticket_sales ORDER BY sale_date ASC, week ASC";
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
    $today = date('Ymd');
    $prefix = "tiket-$today-";

    function generateNextId($conn, $prefix) {
        $stmt = $conn->prepare("SELECT id FROM ticket_sales WHERE id LIKE :prefix ORDER BY id DESC LIMIT 1");
        $prefixLike = $prefix . '%';
        $stmt->bindParam(':prefix', $prefixLike);
        $stmt->execute();
        $lastId = $stmt->fetchColumn();
        
        if ($lastId) {
            $parts = explode('-', $lastId);
            $lastNum = (int)end($parts);
            $newNum = $lastNum + 1;
        } else {
            $newNum = 1;
        }
        return $prefix . str_pad($newNum, 3, '0', STR_PAD_LEFT);
    }
    
    // Check if batch insert (array of objects)
    if (isset($data['batch']) && is_array($data['batch'])) {
        $successCount = 0;
        
        $conn->beginTransaction();
        try {
            $query = "INSERT INTO ticket_sales (id, sale_date, week, year, tickets_sold) VALUES (:id, :sdate, :week, :year, :tickets_sold)
                      ON DUPLICATE KEY UPDATE tickets_sold = :tickets_sold, sale_date = :sdate";
            $stmt = $conn->prepare($query);
            
            // Get starting number for batch
            $stmtLast = $conn->prepare("SELECT id FROM ticket_sales WHERE id LIKE :prefix ORDER BY id DESC LIMIT 1");
            $prefixLike = $prefix . '%';
            $stmtLast->bindParam(':prefix', $prefixLike);
            $stmtLast->execute();
            $lastId = $stmtLast->fetchColumn();
            $nextNum = 1;
            if ($lastId) {
                $parts = explode('-', $lastId);
                $nextNum = (int)end($parts) + 1;
            }
            foreach ($data['batch'] as $item) {
                if (isset($item['week']) && isset($item['year']) && isset($item['tickets_sold'])) {
                    $generatedId = $prefix . str_pad($nextNum++, 3, '0', STR_PAD_LEFT);
                    $sale_date = isset($item['sale_date']) ? $item['sale_date'] : null;
                    $stmt->bindParam(':id', $generatedId);
                    $stmt->bindParam(':sdate', $sale_date);
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
        if (isset($data['week']) && isset($data['year']) && isset($data['tickets_sold'])) {
            $newId = generateNextId($conn, $prefix);
            $sale_date = isset($data['sale_date']) ? $data['sale_date'] : null;
            
            $query = "INSERT INTO ticket_sales (id, sale_date, week, year, tickets_sold) VALUES (:id, :sdate, :week, :year, :tickets_sold)
                      ON DUPLICATE KEY UPDATE tickets_sold = :tickets_sold, sale_date = :sdate";
            $stmt = $conn->prepare($query);
            
            $stmt->bindParam(':id', $newId);
            $stmt->bindParam(':sdate', $sale_date);
            $stmt->bindParam(':week', $data['week']);
            $stmt->bindParam(':year', $data['year']);
            $stmt->bindParam(':tickets_sold', $data['tickets_sold']);
            
            if ($stmt->execute()) {
                echo json_encode(["status" => "success", "message" => "Record saved with ID: $newId"]);
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
