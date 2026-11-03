<?php
/**
 * Endpoint verifikasi sesi dan profil token aktif (T-01)
 * GET /auth/me
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

header('Content-Type: application/json; charset=utf-8');

$currentUser = require_auth();

// Query detail pengguna terbaru dari database
$stmt = $conn->prepare("SELECT id, name, username, role FROM users WHERE id = :id LIMIT 1");
$stmt->execute([':id' => $currentUser['sub']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Pengguna tidak ditemukan.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

echo json_encode([
    'status' => 'success',
    'data' => [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'username' => $user['username'],
        'role' => $user['role'] ?? 'staf'
    ]
], JSON_UNESCAPED_UNICODE);
