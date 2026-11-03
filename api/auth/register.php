<?php
require_once '../config/db.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->name) && !empty($data->username) && !empty($data->password)) {
    $name = htmlspecialchars(strip_tags($data->name));
    $username = htmlspecialchars(strip_tags($data->username));
    $password = password_hash($data->password, PASSWORD_DEFAULT);

    // Check if username exists
    $check_query = "SELECT id FROM users WHERE username = :username LIMIT 1";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bindParam(":username", $username);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Username already exists."]);
        exit();
    }

    $query = "INSERT INTO users (name, username, password) VALUES (:name, :username, :password)";
    $stmt = $conn->prepare($query);

    $stmt->bindParam(":name", $name);
    $stmt->bindParam(":username", $username);
    $stmt->bindParam(":password", $password);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["status" => "success", "message" => "User registered successfully."]);
    } else {
        http_response_code(503);
        echo json_encode(["status" => "error", "message" => "Unable to register user."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Incomplete data."]);
}
?>
