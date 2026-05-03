CREATE DATABASE IF NOT EXISTS prediksi_lstm;
USE prediksi_lstm;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_sales (
    id VARCHAR(50) PRIMARY KEY,
    week INT NOT NULL,
    year INT NOT NULL,
    tickets_sold INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY week_year (week, year)
);

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

-- Indexes for fast ordering
CREATE INDEX idx_year_week ON ticket_sales(year, week);
