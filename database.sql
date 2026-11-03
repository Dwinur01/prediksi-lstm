CREATE DATABASE IF NOT EXISTS prediksi_lstm;
USE prediksi_lstm;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Penjualan Tiket (dengan kolom ticket_price tambahan)
CREATE TABLE IF NOT EXISTS ticket_sales (
    id VARCHAR(50) PRIMARY KEY,
    sale_date DATE NULL,
    week INT NOT NULL,
    year INT NOT NULL,
    tickets_sold INT NOT NULL,
    ticket_price FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY week_year (week, year)
);

-- 3. Tabel Riwayat Prediksi
CREATE TABLE IF NOT EXISTS prediction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    epochs INT,
    learning_rate FLOAT,
    window_size INT,
    mse FLOAT,
    rmse FLOAT,
    mape FLOAT,
    results_json LONGTEXT
);

-- 4. Tabel Bobot Model LSTM
CREATE TABLE IF NOT EXISTS lstm_weights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    history_id INT NOT NULL,
    weights_json LONGTEXT,
    FOREIGN KEY (history_id) REFERENCES prediction_history(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_year_week ON ticket_sales(year, week);
CREATE INDEX idx_sale_date ON ticket_sales(sale_date);
