<?php
/**
 * Konfigurasi Koneksi Database dan Header Keamanan (T-03)
 */

require_once __DIR__ . '/env.php';

// Validasi keberadaan konfigurasi lingkungan (.env)
if (!has_env_file() && !getenv('DB_NAME') && !getenv('DB_HOST')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'Konfigurasi server (.env) belum diatur.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// CORS Whitelist Dinamis (TC-SEC-05)
$allowedOriginsStr = env('ALLOWED_ORIGINS', '');
$allowedOrigins = array_filter(array_map('trim', explode(',', $allowedOriginsStr)));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

header("Vary: Origin");
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Header Keamanan Dasar (TC-SEC-06)
header("X-Content-Type-Options: nosniff");
header("Cache-Control: no-store");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Konfigurasi Database dari .env
$host = env('DB_HOST', 'localhost');
$port = env('DB_PORT', '3306');
$db_name = env('DB_NAME', 'prediksi_lstm');
$username = env('DB_USER', '');
$password = env('DB_PASS', '');
$fallback = strtolower(trim((string)env('DB_FALLBACK', '0')));

global $db_type, $conn;
$db_type = 'mysql';

function init_sqlite_db($conn) {
    // Check if table users exists
    $check = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    $tables = $check->fetchAll(PDO::FETCH_ASSOC);
    if (count($tables) > 0) {
        return; // Already initialized
    }
    
    // 1. Create users table
    $conn->exec("CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staf',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // 2. Create ticket_sales table
    $conn->exec("CREATE TABLE ticket_sales (
        id TEXT PRIMARY KEY,
        week_start_date TEXT NOT NULL,
        sale_date TEXT NULL,
        week INTEGER NOT NULL,
        year INTEGER NOT NULL,
        tickets_sold INTEGER NOT NULL,
        ticket_price REAL DEFAULT 0,
        libur INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (week_start_date)
    )");
    
    // 3. Create prediction_history table
    $conn->exec("CREATE TABLE prediction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        epochs INTEGER,
        learning_rate REAL,
        window_size INTEGER,
        mse REAL,
        rmse REAL,
        mape REAL,
        results_json TEXT
    )");
    
    // 4. Create lstm_weights table
    $conn->exec("CREATE TABLE lstm_weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        history_id INTEGER NOT NULL,
        weights_json TEXT,
        FOREIGN KEY (history_id) REFERENCES prediction_history(id) ON DELETE CASCADE
    )");
    
    // 5. Seed default users
    $admin_pw = password_hash('admin', PASSWORD_DEFAULT);
    $demo_pw = password_hash('password123', PASSWORD_DEFAULT);
    
    $stmt = $conn->prepare("INSERT INTO users (name, username, password) VALUES (:name, :username, :password)");
    $stmt->execute([':name' => 'admin', ':username' => 'admin123', ':password' => $admin_pw]);
    $stmt->execute([':name' => 'Demo Account', ':username' => 'demo@swabina.co.id', ':password' => $demo_pw]);
    
    // 6. Seed excel data if exists
    $data_file = __DIR__ . '/excel_data.json';
    if (file_exists($data_file)) {
        $json_data = json_decode(file_get_contents($data_file), true);
        if (is_array($json_data)) {
            $insert_sales = $conn->prepare("INSERT OR IGNORE INTO ticket_sales (id, week_start_date, sale_date, week, year, tickets_sold, ticket_price, libur) VALUES (:id, :week_start_date, :sale_date, :week, :year, :tickets_sold, :ticket_price, :libur)");
            foreach ($json_data as $row) {
                $id = 'TS_' . $row['year'] . '_' . str_pad($row['week'], 2, '0', STR_PAD_LEFT);
                $wDate = $row['sale_date'] ?? $row['week_start_date'] ?? null;
                $insert_sales->execute([
                    ':id' => $id,
                    ':week_start_date' => $wDate,
                    ':sale_date' => $wDate,
                    ':week' => $row['week'],
                    ':year' => $row['year'],
                    ':tickets_sold' => $row['tickets_sold'],
                    ':ticket_price' => $row['ticket_price'],
                    ':libur' => $row['libur'] ?? 0
                ]);
            }
        }
    }
}

try {
    // Mencoba koneksi MySQL terlebih dahulu
    $dsn = "mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4";
    $conn = new PDO($dsn, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db_type = 'mysql';
} catch (PDOException $exception) {
    // Fallback ke SQLite HANYA jika secara eksplisit disetel di DB_FALLBACK=sqlite
    if ($fallback === 'sqlite') {
        $sqlite_file = __DIR__ . '/prediksi_lstm.sqlite';
        try {
            $conn = new PDO("sqlite:" . $sqlite_file);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db_type = 'sqlite';
            $conn->exec("PRAGMA foreign_keys = ON;");
            init_sqlite_db($conn);
        } catch (PDOException $sqlite_ex) {
            error_log("Database connection error (SQLite): " . $sqlite_ex->getMessage());
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                "status" => "error",
                "message" => "Gagal terhubung ke database."
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    } else {
        error_log("Database connection error (MySQL): " . $exception->getMessage());
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            "status" => "error",
            "message" => "Gagal terhubung ke database server."
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}
?>