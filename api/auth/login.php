<?php
/**
 * Endpoint Login Pengguna (T-01, T-04)
 * POST /auth/login
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."], JSON_UNESCAPED_UNICODE);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['username']) && !empty($data['password'])) {
    $username = trim($data['username']);
    
    $query = "SELECT id, name, username, password, role FROM users WHERE username = :username LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":username", $username);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($data['password'], $user['password'])) {
        $userPayload = [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'role' => $user['role'] ?? 'staf'
        ];
        
        $token = issue_token($userPayload);
        
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Login berhasil.",
            "token" => $token,
            "expires_in" => 28800,
            "user" => $userPayload
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode([
            "status" => "error", 
            "message" => "Username atau password salah."
        ], JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Username dan password wajib diisi."
    ], JSON_UNESCAPED_UNICODE);
}
?>