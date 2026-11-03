<?php
/**
 * Runner Migrasi Database (T-20)
 * Menjalankan berkas migrasi SQL secara berurutan dan idempoten
 */

require_once __DIR__ . '/../config/db.php';

global $conn, $db_type;

echo "=== Menjalankan Migrasi Database ({$db_type}) ===\n";

// 1. Buat tabel schema_migrations jika belum ada
if ($db_type === 'sqlite') {
    $conn->exec("CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} else {
    $conn->exec("CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
}

// 2. Ambil daftar migrasi yang sudah diterapkan
$applied = $conn->query("SELECT version FROM schema_migrations")->fetchAll(PDO::FETCH_COLUMN);

// 3. Scan berkas .sql di direktori migrations
$files = glob(__DIR__ . '/*.sql');
sort($files);

$appliedCount = 0;

foreach ($files as $filePath) {
    $filename = basename($filePath);
    if (in_array($filename, $applied, true)) {
        echo "  [LEWATI] {$filename} (sudah diterapkan)\n";
        continue;
    }

    echo "  [TERAPKAN] {$filename}... ";
    $sql = file_get_contents($filePath);
    
    try {
        // Hapus komentar SQL
        $cleanSql = preg_replace('/--.*$/m', '', $sql);
        $queries = array_filter(array_map('trim', explode(';', $cleanSql)));
        
        foreach ($queries as $q) {
            if ($q !== '') {
                try {
                    $conn->exec($q);
                } catch (PDOException $qe) {
                    $msg = $qe->getMessage();
                    // Toleransi bila kolom/indeks sudah ada atau constraint sudah terhapus demi idempotensi
                    if (stripos($msg, 'Duplicate column name') !== false ||
                        stripos($msg, 'Duplicate key name') !== false ||
                        stripos($msg, 'check that it exists') !== false ||
                        stripos($msg, "Can't DROP") !== false ||
                        stripos($msg, 'already exists') !== false ||
                        stripos($msg, '1060') !== false ||
                        stripos($msg, '1061') !== false ||
                        stripos($msg, '1091') !== false) {
                        // Diabaikan karena sudah diterapkan sebelumnya
                    } else {
                        throw $qe;
                    }
                }
            }
        }
        
        $stmt = $conn->prepare("INSERT INTO schema_migrations (version) VALUES (:v)");
        $stmt->execute([':v' => $filename]);
        
        echo "SUKSES\n";
        $appliedCount++;
    } catch (Exception $e) {
        echo "GAGAL: " . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "Migrasi selesai. {$appliedCount} berkas baru diterapkan.\n";
