<?php
require_once 'api/config/db.php';

echo "<h1>Database Connection Test</h1>";
try {
    $stmt = $conn->query("SELECT DATABASE()");
    $dbname = $stmt->fetchColumn();
    echo "<p style='color: green;'>Successfully connected to database: <strong>$dbname</strong></p>";
    
    echo "<h3>Table Check:</h3>";
    $tables = ['users', 'ticket_sales', 'prediction_history', 'lstm_weights'];
    foreach ($tables as $table) {
        $check = $conn->query("SHOW TABLES LIKE '$table'");
        if ($check->rowCount() > 0) {
            echo "<p style='color: green;'>Table '$table': Found</p>";
        } else {
            echo "<p style='color: red;'>Table '$table': NOT FOUND!</p>";
        }
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>
