<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$db_name = 'prediksi_lstm';
$username = 'root';
$password = '';

global $db_type;
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // 2. Create ticket_sales table
    $conn->exec("CREATE TABLE ticket_sales (
        id TEXT PRIMARY KEY,
        sale_date TEXT NULL,
        week INTEGER NOT NULL,
        year INTEGER NOT NULL,
        tickets_sold INTEGER NOT NULL,
        ticket_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (week, year)
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
            $insert_sales = $conn->prepare("INSERT OR IGNORE INTO ticket_sales (id, sale_date, week, year, tickets_sold, ticket_price) VALUES (:id, :sale_date, :week, :year, :tickets_sold, :ticket_price)");
            foreach ($json_data as $row) {
                $id = 'TS_' . $row['year'] . '_' . str_pad($row['week'], 2, '0', STR_PAD_LEFT);
                $insert_sales->execute([
                    ':id' => $id,
                    ':sale_date' => $row['sale_date'],
                    ':week' => $row['week'],
                    ':year' => $row['year'],
                    ':tickets_sold' => $row['tickets_sold'],
                    ':ticket_price' => $row['ticket_price']
                ]);
            }
        }
    }
}

try {
    // Try MySQL first
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db_type = 'mysql';
} catch(PDOException $exception) {
    // Fallback to SQLite
    $sqlite_file = __DIR__ . '/prediksi_lstm.sqlite';
    try {
        $conn = new PDO("sqlite:" . $sqlite_file);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db_type = 'sqlite';
        
        // Enable foreign keys
        $conn->exec("PRAGMA foreign_keys = ON;");
        
        // Initialize tables and seed
        init_sqlite_db($conn);
    } catch(PDOException $sqlite_ex) {
        http_response_code(500);
        echo json_encode([
            "status" => "error", 
            "message" => "Database connection error (MySQL and SQLite fallback failed): " . $sqlite_ex->getMessage()
        ]);
        exit();
    }
}
?>
