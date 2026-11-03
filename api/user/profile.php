<?php
/**
 * Endpoint Pembaruan Profil Pengguna (T-01)
 * PUT /user/profile
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'PUT' && $method !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."], JSON_UNESCAPED_UNICODE);
    exit();
}

// Wajib login; ambil id pengguna secara aman dari token JWT (TC-AUTH-05)
$currentUser = require_auth();
$userId = (int)$currentUser['sub'];

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Format JSON tidak valid."], JSON_UNESCAPED_UNICODE);
    exit();
}

$name = trim($data['name'] ?? '');
if ($name === '') {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Nama wajib diisi.",
        "errors" => ["name" => "Nama wajib diisi"]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Validasi kata sandi bila diisi
$hasNewPassword = !empty($data['password']);
if ($hasNewPassword && strlen($data['password']) < 8) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Kata sandi minimal 8 karakter.",
        "errors" => ["password" => "Kata sandi minimal 8 karakter"]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$query = "UPDATE users SET name = :name";
if ($hasNewPassword) {
    $query .= ", password = :password";
}
$query .= " WHERE id = :id";

$stmt = $conn->prepare($query);
$stmt->bindParam(':name', $name);
if ($hasNewPassword) {
    $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt->bindParam(':password', $hashed);
}
$stmt->bindParam(':id', $userId);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "Profil berhasil diperbarui.",
        "user" => [
            "id" => $userId,
            "name" => $name
        ]
    ], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal memperbarui profil."], JSON_UNESCAPED_UNICODE);
}
?>