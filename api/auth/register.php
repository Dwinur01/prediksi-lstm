<?php
/**
 * Endpoint Pendaftaran Pengguna Baru (T-02)
 * POST /auth/register
 * Hanya dapat diakses oleh administrator (TC-AUTH-06, OQ-05)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."], JSON_UNESCAPED_UNICODE);
    exit();
}

// Hanya role admin yang boleh mendaftarkan pengguna baru
$currentUser = require_role('admin');

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Format JSON tidak valid."], JSON_UNESCAPED_UNICODE);
    exit();
}

$name = trim($data['name'] ?? '');
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';
$role = strtolower(trim($data['role'] ?? 'staf'));
if ($role !== 'admin' && $role !== 'staf') {
    $role = 'staf';
}

$errors = [];
if ($name === '') {
    $errors['name'] = 'Nama wajib diisi.';
}
if ($username === '') {
    $errors['username'] = 'Username wajib diisi.';
} elseif (preg_match('/\s/', $username)) {
    $errors['username'] = 'Username tidak boleh mengandung spasi.';
} elseif (strlen($username) < 3 || strlen($username) > 50) {
    $errors['username'] = 'Username harus 3-50 karakter.';
}

if ($password === '') {
    $errors['password'] = 'Password wajib diisi.';
} elseif (strlen($password) < 8) {
    $errors['password'] = 'Password minimal 8 karakter.';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Validasi data gagal.",
        "errors" => $errors
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Periksa apakah username sudah terdaftar
$checkStmt = $conn->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
$checkStmt->execute([':username' => $username]);
if ($checkStmt->fetch()) {
    http_response_code(422);
    echo json_encode([
        "status" => "error",
        "message" => "Username sudah digunakan.",
        "errors" => ["username" => "Username sudah digunakan."]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (name, username, password, role) VALUES (:name, :username, :password, :role)");
$stmt->bindParam(":name", $name);
$stmt->bindParam(":username", $username);
$stmt->bindParam(":password", $password_hash);
$stmt->bindParam(":role", $role);

if ($stmt->execute()) {
    $newId = (int)$conn->lastInsertId();
    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "message" => "Pengguna berhasil didaftarkan.",
        "user" => [
            "id" => $newId,
            "name" => $name,
            "username" => $username,
            "role" => $role
        ]
    ], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal mendaftarkan pengguna."], JSON_UNESCAPED_UNICODE);
}
?>