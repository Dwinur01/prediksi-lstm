<?php
/**
 * Endpoint Login Pengguna (T-01, T-04)
 * POST /auth/login
 * Pesan kesalahan seragam (TC-AUTH-02) dan pembatasan percobaan gagal 5/15 menit (TC-AUTH-07)
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
if (!is_array($data) || empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Username dan password wajib diisi."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Simpan username mentah (tanpa htmlspecialchars) sesuai T-04; aman lewat PDO prepared statement
$username = trim((string)$data['username']);
$password = (string)$data['password'];

// Ambil IP address pengguna
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
if (strpos($ip, ',') !== false) {
    $ip = trim(explode(',', $ip)[0]);
}

global $db_type;

// Pastikan tabel login_attempts ada
$conn->exec("CREATE TABLE IF NOT EXISTS login_attempts (
    id " . ($db_type === 'sqlite' ? "INTEGER PRIMARY KEY AUTOINCREMENT" : "INT AUTO_INCREMENT PRIMARY KEY") . ",
    ip_address " . ($db_type === 'sqlite' ? "TEXT" : "VARCHAR(45)") . " NOT NULL,
    username " . ($db_type === 'sqlite' ? "TEXT" : "VARCHAR(50)") . " NOT NULL,
    attempted_at " . ($db_type === 'sqlite' ? "DATETIME DEFAULT CURRENT_TIMESTAMP" : "TIMESTAMP DEFAULT CURRENT_TIMESTAMP") . "
)");

// Threshold waktu 15 menit yang lalu (900 detik)
$threshold = date('Y-m-d H:i:s', time() - 900);
$now = date('Y-m-d H:i:s');

// Bersihkan catatan lama (> 15 menit)
$cleanupStmt = $conn->prepare("DELETE FROM login_attempts WHERE attempted_at < :threshold");
$cleanupStmt->execute([':threshold' => $threshold]);

// Hitung percobaan gagal untuk pasangan IP + username dalam 15 menit terakhir
$countStmt = $conn->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = :ip AND username = :username AND attempted_at >= :threshold");
$countStmt->execute([
    ':ip' => $ip,
    ':username' => $username,
    ':threshold' => $threshold
]);
$failedAttempts = (int)$countStmt->fetchColumn();

// Batasi jika sudah 5 kali gagal -> 429 Too Many Requests (TC-AUTH-07)
if ($failedAttempts >= 5) {
    http_response_code(429);
    echo json_encode([
        "status" => "error",
        "message" => "Terlalu banyak percobaan. Coba lagi nanti."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Cari pengguna di basis data
$query = "SELECT id, name, username, password, role FROM users WHERE username = :username LIMIT 1";
$stmt = $conn->prepare($query);
$stmt->bindParam(":username", $username);
$stmt->execute();

$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Verifikasi password
if ($user && password_verify($password, $user['password'])) {
    // Bersihkan catatan percobaan gagal untuk IP + username ini jika berhasil login
    $resetStmt = $conn->prepare("DELETE FROM login_attempts WHERE ip_address = :ip AND username = :username");
    $resetStmt->execute([':ip' => $ip, ':username' => $username]);

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
    // Catat percobaan gagal
    $logStmt = $conn->prepare("INSERT INTO login_attempts (ip_address, username, attempted_at) VALUES (:ip, :username, :attempted_at)");
    $logStmt->execute([
        ':ip' => $ip,
        ':username' => $username,
        ':attempted_at' => $now
    ]);

    // Pesan galat seragam tanpa membedakan username tidak ditemukan atau password salah (TC-AUTH-02)
    http_response_code(401);
    echo json_encode([
        "status" => "error", 
        "message" => "Username atau password salah."
    ], JSON_UNESCAPED_UNICODE);
}
?>