<?php
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!empty($data->id) && !empty($data->name)) {
        $id = $data->id;
        $name = htmlspecialchars(strip_tags($data->name));
        
        $query = "UPDATE users SET name = :name";
        
        // If password is provided, update it too
        if (!empty($data->password)) {
            $password = password_hash($data->password, PASSWORD_DEFAULT);
            $query .= ", password = :password";
        }
        
        $query .= " WHERE id = :id";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':name', $name);
        if (!empty($data->password)) {
            $stmt->bindParam(':password', $password);
        }
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Profile updated successfully.", "name" => $name]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Name is required."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>
