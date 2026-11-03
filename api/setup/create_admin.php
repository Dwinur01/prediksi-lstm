<?php
/**
 * Skrip CLI Pembuatan Akun Administrator (T-02)
 * Penggunaan: php api/setup/create_admin.php [username] [password] [nama]
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Skrip ini hanya dapat dijalankan melalui antarmuka baris perintah (CLI).\n";
    exit(1);
}

require_once __DIR__ . '/../config/db.php';

global $conn, $db_type;

echo "=== Setup Akun Administrator SWA Predict ({$db_type}) ===\n";

$username = $argv[1] ?? getenv('ADMIN_USERNAME') ?: 'admin';
$password = $argv[2] ?? getenv('ADMIN_PASSWORD') ?: '';
$name = $argv[3] ?? getenv('ADMIN_NAME') ?: 'Administrator';

// Jika kata sandi tidak diberikan lewat argumen atau env, minta input interaktif
if (empty($password)) {
    echo "Masukkan kata sandi untuk admin '{$username}' (min 8 karakter): ";
    $handle = fopen("php://stdin", "r");
    $password = trim(fgets($handle));
    fclose($handle);
}

if (strlen($password) < 8) {
    echo "GAGAL: Kata sandi harus minimal 8 karakter.\n";
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

// Periksa apakah user sudah ada
$stmt = $conn->prepare("SELECT id FROM users WHERE username = :u LIMIT 1");
$stmt->execute([':u' => $username]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    $updateStmt = $conn->prepare("UPDATE users SET name = :n, password = :p, role = 'admin' WHERE id = :id");
    $updateStmt->execute([
        ':n' => $name,
        ':p' => $hash,
        ':id' => $existing['id']
    ]);
    echo "SUKSES: Akun admin '{$username}' berhasil diperbarui.\n";
} else {
    $insertStmt = $conn->prepare("INSERT INTO users (name, username, password, role) VALUES (:n, :u, :p, 'admin')");
    $insertStmt->execute([
        ':n' => $name,
        ':u' => $username,
        ':p' => $hash
    ]);
    echo "SUKSES: Akun admin baru '{$username}' berhasil dibuat.\n";
}

